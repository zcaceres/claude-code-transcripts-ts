import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { GIST_PREVIEW_JS } from "./constants.js";

/** Inject gist preview JavaScript into all HTML files in the output directory */
export async function injectGistPreviewJs(outputDir: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(outputDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".html")) continue;
    const filePath = join(outputDir, entry);
    const content = await Bun.file(filePath).text();
    if (content.includes("</body>")) {
      const newContent = content.replace(
        "</body>",
        `<script>${GIST_PREVIEW_JS}</script>\n</body>`,
      );
      await Bun.write(filePath, newContent);
    }
  }
}

/** Create a GitHub gist from the HTML files in outputDir.
 *  Returns [gistId, gistUrl] on success.
 *  Throws on failure.
 */
export async function createGist(
  outputDir: string,
  isPublic = false,
): Promise<[string, string]> {
  let entries;
  try {
    entries = await readdir(outputDir);
  } catch {
    throw new Error("No HTML files found to upload to gist.");
  }

  const htmlFiles = entries
    .filter((e) => e.endsWith(".html"))
    .sort()
    .map((e) => join(outputDir, e));

  if (!htmlFiles.length) {
    throw new Error("No HTML files found to upload to gist.");
  }

  const cmd = ["gh", "gist", "create", ...htmlFiles];
  if (isPublic) cmd.push("--public");

  try {
    const proc = Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Failed to create gist: ${stderr.trim() || "Unknown error"}`);
    }

    const gistUrl = stdout.trim();
    const gistId = gistUrl.replace(/\/$/, "").split("/").pop()!;
    return [gistId, gistUrl];
  } catch (e) {
    if (e instanceof Error && e.message.includes("Failed to create gist")) {
      throw e;
    }
    // Check if it's a "not found" type error (gh CLI not installed)
    if (
      e instanceof Error &&
      (e.message.includes("ENOENT") || e.message.includes("not found"))
    ) {
      throw new Error(
        "gh CLI not found. Install it from https://cli.github.com/ and run 'gh auth login'.",
      );
    }
    throw new Error(
      `Failed to create gist: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export { GIST_PREVIEW_JS };
