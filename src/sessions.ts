import { readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import type { SessionInfo, SessionDetail, ProjectInfo } from "./types.js";
import { extractTextFromContent } from "./parse.js";

/** Extract a human-readable summary from a session file */
export async function getSessionSummary(
  filepath: string,
  maxLength = 200,
): Promise<string> {
  try {
    if (filepath.endsWith(".jsonl")) {
      return await getJsonlSummary(filepath, maxLength);
    }

    // JSON format
    const content = await Bun.file(filepath).text();
    const data = JSON.parse(content);
    const loglines = data.loglines || [];

    for (const entry of loglines) {
      if (entry.type === "user") {
        const msg = entry.message || {};
        const text = extractTextFromContent(msg.content || "");
        if (text) {
          if (text.length > maxLength) {
            return text.slice(0, maxLength - 3) + "...";
          }
          return text;
        }
      }
    }
    return "(no summary)";
  } catch {
    return "(no summary)";
  }
}

async function getJsonlSummary(
  filepath: string,
  maxLength: number,
): Promise<string> {
  try {
    const content = await Bun.file(filepath).text();
    const lines = content.split("\n");

    // First pass: look for summary entry
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === "summary" && obj.summary) {
          const summary = obj.summary;
          if (summary.length > maxLength) {
            return summary.slice(0, maxLength - 3) + "...";
          }
          return summary;
        }
      } catch {
        continue;
      }
    }

    // Second pass: find first non-meta user message
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (
          obj.type === "user" &&
          !obj.isMeta &&
          obj.message?.content
        ) {
          const text = extractTextFromContent(obj.message.content);
          if (text && !text.startsWith("<")) {
            if (text.length > maxLength) {
              return text.slice(0, maxLength - 3) + "...";
            }
            return text;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Fall through to no summary
  }

  return "(no summary)";
}

/** Convert encoded folder name to readable project name */
export function getProjectDisplayName(folderName: string): string {
  const prefixesToStrip = ["-home-", "-mnt-c-Users-", "-mnt-c-users-", "-Users-"];

  let name = folderName;
  for (const prefix of prefixesToStrip) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      name = name.slice(prefix.length);
      break;
    }
  }

  const parts = name.split("-");
  const skipDirs = new Set([
    "projects",
    "code",
    "repos",
    "src",
    "dev",
    "work",
    "documents",
  ]);

  const meaningfulParts: string[] = [];
  let foundProject = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (i === 0 && !foundProject) {
      const remaining = parts.slice(i + 1).map((p) => p.toLowerCase());
      if (remaining.some((d) => skipDirs.has(d))) {
        continue;
      }
    }

    if (skipDirs.has(part.toLowerCase())) {
      foundProject = true;
      continue;
    }

    meaningfulParts.push(part);
    foundProject = true;
  }

  if (meaningfulParts.length) {
    return meaningfulParts.join("-");
  }

  // Fallback
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i]) return parts[i];
  }
  return folderName;
}

/** Find recent JSONL session files in the given folder */
export async function findLocalSessions(
  folder: string,
  limit = 10,
): Promise<SessionInfo[]> {
  try {
    await stat(folder);
  } catch {
    return [];
  }

  const results: Array<{ path: string; summary: string; mtime: number }> = [];
  await collectJsonlFiles(folder, results);

  // Sort by mtime descending
  results.sort((a, b) => b.mtime - a.mtime);
  return results.slice(0, limit).map(({ path, summary }) => ({ path, summary }));
}

async function collectJsonlFiles(
  dir: string,
  results: Array<{ path: string; summary: string; mtime: number }>,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonlFiles(fullPath, results);
    } else if (entry.name.endsWith(".jsonl")) {
      // Skip agent files
      if (entry.name.startsWith("agent-")) continue;

      const summary = await getSessionSummary(fullPath);
      // Skip boring/empty sessions
      if (summary.toLowerCase() === "warmup" || summary === "(no summary)") {
        continue;
      }

      const fileStat = await stat(fullPath);
      results.push({ path: fullPath, summary, mtime: fileStat.mtimeMs / 1000 });
    }
  }
}

/** Find all sessions in a Claude projects folder, grouped by project */
export async function findAllSessions(
  folder: string,
  includeAgents = false,
): Promise<ProjectInfo[]> {
  try {
    await stat(folder);
  } catch {
    return [];
  }

  const projects: Record<string, ProjectInfo> = {};

  await collectAllSessions(folder, folder, projects, includeAgents);

  // Sort sessions within each project by mtime descending
  for (const project of Object.values(projects)) {
    project.sessions.sort((a, b) => b.mtime - a.mtime);
  }

  // Sort projects by most recent session
  const result = Object.values(projects);
  result.sort((a, b) => {
    const aMtime = a.sessions.length ? a.sessions[0].mtime : 0;
    const bMtime = b.sessions.length ? b.sessions[0].mtime : 0;
    return bMtime - aMtime;
  });

  return result;
}

async function collectAllSessions(
  rootFolder: string,
  currentDir: string,
  projects: Record<string, ProjectInfo>,
  includeAgents: boolean,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectAllSessions(rootFolder, fullPath, projects, includeAgents);
    } else if (entry.name.endsWith(".jsonl")) {
      // Skip agent files unless requested
      if (!includeAgents && entry.name.startsWith("agent-")) continue;

      const summary = await getSessionSummary(fullPath);
      if (summary.toLowerCase() === "warmup" || summary === "(no summary)") {
        continue;
      }

      // Get project folder (parent dir)
      const projectDir = join(fullPath, "..");
      const projectKey = basename(projectDir);

      if (!projects[projectKey]) {
        projects[projectKey] = {
          name: getProjectDisplayName(projectKey),
          path: projectDir,
          sessions: [],
        };
      }

      const fileStat = await stat(fullPath);
      projects[projectKey].sessions.push({
        path: fullPath,
        summary,
        mtime: fileStat.mtimeMs / 1000,
        size: fileStat.size,
      });
    }
  }
}
