import type { ApiSession, LogEntry } from "./types.js";
import { GITHUB_REPO_PATTERN } from "./constants.js";

/** Detect GitHub repo from git push output in tool results */
export function detectGithubRepo(loglines: LogEntry[]): string | null {
  for (const entry of loglines) {
    const message = entry.message;
    if (!message) continue;
    const content = message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
      const b = block as Record<string, unknown>;
      if (b.type === "tool_result") {
        const resultContent = b.content;
        if (typeof resultContent === "string") {
          const match = GITHUB_REPO_PATTERN.exec(resultContent);
          if (match) return match[1];
        }
      }
    }
  }
  return null;
}

/** Extract GitHub repo from session metadata (API sessions) */
export function extractRepoFromSession(session: ApiSession): string | null {
  const context = session.session_context;
  if (!context) return null;

  // Try outcomes first
  const outcomes = context.outcomes || [];
  for (const outcome of outcomes) {
    if (outcome.type === "git_repository") {
      const repo = outcome.git_info?.repo;
      if (repo) return repo;
    }
  }

  // Fall back to sources URL
  const sources = context.sources || [];
  for (const source of sources) {
    if (source.type === "git_repository") {
      const url = source.url || "";
      if (url.includes("github.com/")) {
        const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
        if (match) return match[1];
      }
    }
  }

  return null;
}

/** Enrich sessions with repo information from session metadata */
export function enrichSessionsWithRepos(sessions: ApiSession[]): ApiSession[] {
  return sessions.map((session) => ({
    ...session,
    repo: extractRepoFromSession(session),
  }));
}

/** Filter sessions by repo */
export function filterSessionsByRepo(
  sessions: ApiSession[],
  repo: string | null,
): ApiSession[] {
  if (repo === null) return sessions;
  return sessions.filter((s) => s.repo === repo);
}

/** Format a session for display in the list or picker */
export function formatSessionForDisplay(sessionData: ApiSession): string {
  const title = sessionData.title || "Untitled";
  const createdAt = sessionData.created_at || "";
  const repo = sessionData.repo;

  const truncatedTitle =
    title.length > 50 ? title.slice(0, 47) + "..." : title;
  const repoDisplay = repo || "(no repo)";
  const dateDisplay = createdAt ? createdAt.slice(0, 19) : "N/A";

  return `${repoDisplay.padEnd(30)}  ${dateDisplay.padEnd(19)}  ${truncatedTitle}`;
}
