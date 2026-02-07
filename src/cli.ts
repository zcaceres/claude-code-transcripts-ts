#!/usr/bin/env bun
import { Command } from "commander";
import { select } from "@inquirer/prompts";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { mkdtemp, copyFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { generateHtml } from "./generate.js";
import { generateBatchHtml } from "./batch.js";
import { findLocalSessions, findAllSessions } from "./sessions.js";
import { injectGistPreviewJs, createGist } from "./gist.js";
import {
  getAccessTokenFromKeychain,
  getOrgUuidFromConfig,
  fetchSessions,
  fetchSession,
} from "./api.js";
import {
  enrichSessionsWithRepos,
  filterSessionsByRepo,
  formatSessionForDisplay,
} from "./github.js";
import type { ApiSession } from "./types.js";

const program = new Command();

program
  .name("claude-code-transcripts")
  .description("Convert Claude Code session JSON to mobile-friendly HTML pages")
  .version("0.1.0");

// --- local command (default) ---
program
  .command("local", { isDefault: true })
  .description("Select and convert a local Claude Code session to HTML")
  .option("-o, --output <dir>", "Output directory")
  .option(
    "-a, --output-auto",
    "Auto-name output subdirectory based on session filename",
  )
  .option("--repo <repo>", "GitHub repo (owner/name) for commit links")
  .option("--gist", "Upload to GitHub Gist")
  .option("--json", "Include the original JSONL session file in output")
  .option("--open", "Open in browser")
  .option("--limit <n>", "Max sessions to show", "10")
  .action(async (opts) => {
    const projectsFolder = join(homedir(), ".claude", "projects");

    try {
      await stat(projectsFolder);
    } catch {
      console.log(`Projects folder not found: ${projectsFolder}`);
      console.log("No local Claude Code sessions available.");
      return;
    }

    console.log("Loading local sessions...");
    const results = await findLocalSessions(
      projectsFolder,
      parseInt(opts.limit, 10),
    );

    if (!results.length) {
      console.log("No local sessions found.");
      return;
    }

    const choices = await Promise.all(
      results.map(async ({ path, summary }) => {
        const fileStat = await stat(path);
        const modTime = new Date(fileStat.mtimeMs);
        const sizeKb = fileStat.size / 1024;
        const dateStr = `${modTime.getFullYear()}-${String(modTime.getMonth() + 1).padStart(2, "0")}-${String(modTime.getDate()).padStart(2, "0")} ${String(modTime.getHours()).padStart(2, "0")}:${String(modTime.getMinutes()).padStart(2, "0")}`;
        const truncSummary =
          summary.length > 50 ? summary.slice(0, 47) + "..." : summary;
        return {
          name: `${dateStr}  ${String(Math.floor(sizeKb)).padStart(5)} KB  ${truncSummary}`,
          value: path,
        };
      }),
    );

    const selected = await select({
      message: "Select a session to convert:",
      choices,
    });

    const sessionFile = selected;
    const sessionStem = basename(sessionFile, ".jsonl");

    let output: string;
    const autoOpen = !opts.output && !opts.gist && !opts.outputAuto;

    if (opts.outputAuto) {
      const parentDir = opts.output || ".";
      output = join(parentDir, sessionStem);
    } else if (!opts.output) {
      output = join(tmpdir(), `claude-session-${sessionStem}`);
    } else {
      output = opts.output;
    }

    await generateHtml(sessionFile, output, opts.repo || null);
    console.log(`Output: ${output}`);

    if (opts.json) {
      await copyFile(sessionFile, join(output, basename(sessionFile)));
      const jsonStat = await stat(join(output, basename(sessionFile)));
      console.log(
        `JSONL: ${join(output, basename(sessionFile))} (${(jsonStat.size / 1024).toFixed(1)} KB)`,
      );
    }

    if (opts.gist) {
      await injectGistPreviewJs(output);
      console.log("Creating GitHub gist...");
      const [gistId, gistUrl] = await createGist(output);
      console.log(`Gist: ${gistUrl}`);
      console.log(`Preview: https://gisthost.github.io/?${gistId}/index.html`);
    }

    if (opts.open || autoOpen) {
      const { exec } = await import("node:child_process");
      const indexPath = join(output, "index.html");
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${openCmd} "${indexPath}"`);
    }
  });

// --- json command ---
program
  .command("json <file>")
  .description("Convert a Claude Code session JSON/JSONL file or URL to HTML")
  .option("-o, --output <dir>", "Output directory")
  .option("-a, --output-auto", "Auto-name output subdirectory")
  .option("--repo <repo>", "GitHub repo (owner/name) for commit links")
  .option("--gist", "Upload to GitHub Gist")
  .option("--json", "Include original JSON in output")
  .option("--open", "Open in browser")
  .action(async (file, opts) => {
    let jsonFilePath: string;
    let urlName: string | null = null;

    if (file.startsWith("http://") || file.startsWith("https://")) {
      console.log(`Fetching ${file}...`);
      const response = await fetch(file, {
        signal: AbortSignal.timeout(60000),
        redirect: "follow",
      });
      if (!response.ok) {
        console.error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        );
        process.exit(1);
      }
      const text = await response.text();

      const urlPath = file.split("?")[0];
      const suffix = urlPath.endsWith(".jsonl")
        ? ".jsonl"
        : urlPath.endsWith(".json")
          ? ".json"
          : ".jsonl";
      urlName = basename(urlPath, suffix) || "session";

      const tempFile = join(tmpdir(), `claude-url-${urlName}${suffix}`);
      await writeFile(tempFile, text);
      jsonFilePath = tempFile;
    } else {
      try {
        await stat(file);
      } catch {
        console.error(`File not found: ${file}`);
        process.exit(1);
      }
      jsonFilePath = file;
    }

    const fileStem =
      urlName || basename(jsonFilePath).replace(/\.(json|jsonl)$/, "");

    let output: string;
    const autoOpen = !opts.output && !opts.gist && !opts.outputAuto;

    if (opts.outputAuto) {
      const parentDir = opts.output || ".";
      output = join(parentDir, fileStem);
    } else if (!opts.output) {
      output = join(tmpdir(), `claude-session-${fileStem}`);
    } else {
      output = opts.output;
    }

    await generateHtml(jsonFilePath, output, opts.repo || null);
    console.log(`Output: ${output}`);

    if (opts.json) {
      const dest = join(output, basename(jsonFilePath));
      await copyFile(jsonFilePath, dest);
      const jsonStat = await stat(dest);
      console.log(`JSON: ${dest} (${(jsonStat.size / 1024).toFixed(1)} KB)`);
    }

    if (opts.gist) {
      await injectGistPreviewJs(output);
      console.log("Creating GitHub gist...");
      const [gistId, gistUrl] = await createGist(output);
      console.log(`Gist: ${gistUrl}`);
      console.log(`Preview: https://gisthost.github.io/?${gistId}/index.html`);
    }

    if (opts.open || autoOpen) {
      const { exec } = await import("node:child_process");
      const indexPath = join(output, "index.html");
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${openCmd} "${indexPath}"`);
    }
  });

// --- web command ---
program
  .command("web [session-id]")
  .description("Import and convert a web session from the Claude API to HTML")
  .option("-o, --output <dir>", "Output directory")
  .option("-a, --output-auto", "Auto-name output subdirectory")
  .option("--token <token>", "API access token")
  .option("--org-uuid <uuid>", "Organization UUID")
  .option("--repo <repo>", "GitHub repo for filtering and commit links")
  .option("--gist", "Upload to GitHub Gist")
  .option("--json", "Include JSON session data in output")
  .option("--open", "Open in browser")
  .action(async (sessionId, opts) => {
    let token = opts.token || null;
    let orgUuid = opts.orgUuid || null;

    if (!token) {
      token = await getAccessTokenFromKeychain();
      if (!token) {
        console.error(
          process.platform === "darwin"
            ? "Could not retrieve access token from macOS keychain. Provide --token."
            : "On non-macOS platforms, you must provide --token.",
        );
        process.exit(1);
      }
    }

    if (!orgUuid) {
      orgUuid = await getOrgUuidFromConfig();
      if (!orgUuid) {
        console.error(
          "Could not find organization UUID in ~/.claude.json. Provide --org-uuid.",
        );
        process.exit(1);
      }
    }

    if (!sessionId) {
      const sessionsData = await fetchSessions(token, orgUuid);
      let sessions = ((sessionsData.data || []) as ApiSession[]);
      if (!sessions.length) {
        console.error("No sessions found.");
        process.exit(1);
      }

      sessions = enrichSessionsWithRepos(sessions);
      if (opts.repo) {
        sessions = filterSessionsByRepo(sessions, opts.repo);
        if (!sessions.length) {
          console.error(`No sessions found for repo: ${opts.repo}`);
          process.exit(1);
        }
      }

      const choices = sessions.map((s) => ({
        name: formatSessionForDisplay(s),
        value: s.id,
      }));

      sessionId = await select({
        message: "Select a session to import:",
        choices,
      });
    }

    console.log(`Fetching session ${sessionId}...`);
    const sessionData = await fetchSession(token, orgUuid, sessionId);

    let output: string;
    const autoOpen = !opts.output && !opts.gist && !opts.outputAuto;

    if (opts.outputAuto) {
      const parentDir = opts.output || ".";
      output = join(parentDir, sessionId);
    } else if (!opts.output) {
      output = join(tmpdir(), `claude-session-${sessionId}`);
    } else {
      output = opts.output;
    }

    console.log(`Generating HTML in ${output}/...`);

    // Write session data as temp JSON for generateHtml
    const tempJson = join(tmpdir(), `claude-web-${sessionId}.json`);
    await writeFile(tempJson, JSON.stringify(sessionData));
    await generateHtml(tempJson, output, opts.repo || null);

    console.log(`Output: ${output}`);

    if (opts.json) {
      const dest = join(output, `${sessionId}.json`);
      await writeFile(dest, JSON.stringify(sessionData, null, 2));
      const jsonStat = await stat(dest);
      console.log(`JSON: ${dest} (${(jsonStat.size / 1024).toFixed(1)} KB)`);
    }

    if (opts.gist) {
      await injectGistPreviewJs(output);
      console.log("Creating GitHub gist...");
      const [gistId, gistUrl] = await createGist(output);
      console.log(`Gist: ${gistUrl}`);
      console.log(`Preview: https://gisthost.github.io/?${gistId}/index.html`);
    }

    if (opts.open || autoOpen) {
      const { exec } = await import("node:child_process");
      const indexPath = join(output, "index.html");
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${openCmd} "${indexPath}"`);
    }
  });

// --- all command ---
program
  .command("all")
  .description(
    "Convert all local Claude Code sessions to a browsable HTML archive",
  )
  .option(
    "-s, --source <dir>",
    "Source directory (default: ~/.claude/projects)",
  )
  .option("-o, --output <dir>", "Output directory", "./claude-archive")
  .option("--include-agents", "Include agent-* session files")
  .option("--dry-run", "Show what would be converted")
  .option("--open", "Open in browser")
  .option("-q, --quiet", "Suppress non-error output")
  .action(async (opts) => {
    const source = opts.source || join(homedir(), ".claude", "projects");

    try {
      await stat(source);
    } catch {
      console.error(`Source directory not found: ${source}`);
      process.exit(1);
    }

    const output = opts.output;

    if (!opts.quiet) {
      console.log(`Scanning ${source}...`);
    }

    const projects = await findAllSessions(source, opts.includeAgents);

    if (!projects.length) {
      if (!opts.quiet) console.log("No sessions found.");
      return;
    }

    const totalSessions = projects.reduce(
      (sum, p) => sum + p.sessions.length,
      0,
    );

    if (!opts.quiet) {
      console.log(
        `Found ${projects.length} projects with ${totalSessions} sessions`,
      );
    }

    if (opts.dryRun) {
      if (!opts.quiet) {
        console.log("\nDry run - would convert:");
        for (const project of projects) {
          console.log(
            `\n  ${project.name} (${project.sessions.length} sessions)`,
          );
          for (const session of project.sessions.slice(0, 3)) {
            const modTime = new Date(session.mtime * 1000);
            const dateStr = `${modTime.getFullYear()}-${String(modTime.getMonth() + 1).padStart(2, "0")}-${String(modTime.getDate()).padStart(2, "0")}`;
            console.log(
              `    - ${basename(session.path, ".jsonl")} (${dateStr})`,
            );
          }
          if (project.sessions.length > 3) {
            console.log(`    ... and ${project.sessions.length - 3} more`);
          }
        }
      }
      return;
    }

    if (!opts.quiet) {
      console.log(`\nGenerating archive in ${output}...`);
    }

    const stats = await generateBatchHtml(source, output, {
      includeAgents: opts.includeAgents,
      progressCallback: opts.quiet
        ? undefined
        : (projectName, sessionName, current, total) => {
            if (current % 10 === 0) {
              console.log(`  Processed ${current}/${total} sessions...`);
            }
          },
    });

    if (stats.failed_sessions.length) {
      console.log(
        `\nWarning: ${stats.failed_sessions.length} session(s) failed:`,
      );
      for (const failure of stats.failed_sessions) {
        console.log(
          `  ${failure.project}/${failure.session}: ${failure.error}`,
        );
      }
    }

    if (!opts.quiet) {
      console.log(
        `\nGenerated archive with ${stats.total_projects} projects, ${stats.total_sessions} sessions`,
      );
      console.log(`Output: ${output}`);
    }

    if (opts.open) {
      const { exec } = await import("node:child_process");
      const indexPath = join(output, "index.html");
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      exec(`${openCmd} "${indexPath}"`);
    }
  });

program.parse();
