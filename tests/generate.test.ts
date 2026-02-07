import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateHtml } from "../src/generate.js";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

describe("generateHtml", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "generate-test-"));
  });

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  test("generates index.html", async () => {
    const fixturePath = join(FIXTURES_DIR, "sample_session.json");
    await generateHtml(fixturePath, outputDir, "example/project");

    const indexHtml = await Bun.file(join(outputDir, "index.html")).text();
    expect(indexHtml).toContain("Claude Code transcript");
    expect(indexHtml).toContain("prompts");
    expect(indexHtml).toContain("messages");
  });

  test("generates page-001.html", async () => {
    const fixturePath = join(FIXTURES_DIR, "sample_session.json");
    await generateHtml(fixturePath, outputDir, "example/project");

    const pageHtml = await Bun.file(join(outputDir, "page-001.html")).text();
    expect(pageHtml).toContain("Claude Code transcript");
    expect(pageHtml).toContain("page 1");
  });

  test("generates page-002.html for multi-page sessions", async () => {
    const fixturePath = join(FIXTURES_DIR, "sample_session.json");
    await generateHtml(fixturePath, outputDir, "example/project");

    const page2 = Bun.file(join(outputDir, "page-002.html"));
    const exists = await page2.exists();
    expect(exists).toBe(true);
    if (exists) {
      const pageHtml = await page2.text();
      expect(pageHtml).toContain("page 2");
    }
  });

  test("auto-detects GitHub repo", async () => {
    const fixturePath = join(FIXTURES_DIR, "sample_session.json");
    await generateHtml(fixturePath, outputDir);

    const indexHtml = await Bun.file(join(outputDir, "index.html")).text();
    // Should auto-detect example/project from the git push output
    expect(indexHtml).toContain("example/project");
  });

  test("handles array content format (JSONL)", async () => {
    const jsonlFile = join(outputDir, "session.jsonl");
    await writeFile(
      jsonlFile,
      '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello from array format"}]}}\n' +
        '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi there!"}]}}\n',
    );

    const htmlOutput = join(outputDir, "html_output");
    await generateHtml(jsonlFile, htmlOutput);

    const indexHtml = await Bun.file(join(htmlOutput, "index.html")).text();
    // Should have 1 prompt
    expect(indexHtml).toContain("1 prompts");
    expect(indexHtml).not.toContain("0 prompts");

    // Page file should exist
    const page1 = Bun.file(join(htmlOutput, "page-001.html"));
    expect(await page1.exists()).toBe(true);
  });

  test("continuation long texts appear in index", async () => {
    const sessionData = {
      loglines: [
        {
          type: "user",
          timestamp: "2025-01-01T10:00:00.000Z",
          message: { content: "Build a Redis JavaScript module", role: "user" },
        },
        {
          type: "assistant",
          timestamp: "2025-01-01T10:00:05.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "I'll start working on this." }],
          },
        },
        {
          type: "user",
          timestamp: "2025-01-01T11:00:00.000Z",
          isCompactSummary: true,
          message: {
            content: "This session is being continued from a previous conversation...",
            role: "user",
          },
        },
        {
          type: "assistant",
          timestamp: "2025-01-01T11:00:05.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Continuing the work..." }],
          },
        },
        {
          type: "assistant",
          timestamp: "2025-01-01T12:00:00.000Z",
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text:
                  "All tasks completed successfully. Here's a summary of what was built:\n\n" +
                  "## Redis JavaScript Module\n\n" +
                  "A loadable Redis module providing JavaScript scripting via the mquickjs engine.\n\n" +
                  "### Commands Implemented\n" +
                  "- JS.EVAL - Execute JavaScript with KEYS/ARGV arrays\n" +
                  "- JS.LOAD / JS.CALL - Cache and call scripts by SHA1\n" +
                  "- JS.EXISTS / JS.FLUSH - Manage script cache\n\n" +
                  "All 41 tests pass. Changes pushed to branch.",
              },
            ],
          },
        },
      ],
    };

    const sessionFile = join(outputDir, "test_session.json");
    await writeFile(sessionFile, JSON.stringify(sessionData));

    await generateHtml(sessionFile, outputDir);

    const indexHtml = await Bun.file(join(outputDir, "index.html")).text();
    expect(indexHtml).toContain("All tasks completed successfully");
    expect(indexHtml).toContain("Redis JavaScript Module");
  });
});
