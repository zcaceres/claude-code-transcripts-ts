import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateBatchHtml } from "../src/batch.js";

describe("generateBatchHtml", () => {
  let projectsDir: string;
  let outputDir: string;

  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), "batch-projects-"));
    outputDir = await mkdtemp(join(tmpdir(), "batch-output-"));

    // Create project-a with 2 sessions
    const projectA = join(projectsDir, "-home-user-projects-project-a");
    await mkdir(projectA, { recursive: true });

    await writeFile(
      join(projectA, "abc123.jsonl"),
      '{"type": "user", "timestamp": "2025-01-01T10:00:00.000Z", "message": {"role": "user", "content": "Hello from project A"}}\n' +
        '{"type": "assistant", "timestamp": "2025-01-01T10:00:05.000Z", "message": {"role": "assistant", "content": [{"type": "text", "text": "Hi there!"}]}}\n',
    );

    await writeFile(
      join(projectA, "def456.jsonl"),
      '{"type": "user", "timestamp": "2025-01-02T10:00:00.000Z", "message": {"role": "user", "content": "Second session in project A"}}\n' +
        '{"type": "assistant", "timestamp": "2025-01-02T10:00:05.000Z", "message": {"role": "assistant", "content": [{"type": "text", "text": "Got it!"}]}}\n',
    );

    // Agent file (skipped by default)
    await writeFile(
      join(projectA, "agent-xyz789.jsonl"),
      '{"type": "user", "timestamp": "2025-01-03T10:00:00.000Z", "message": {"role": "user", "content": "Agent session"}}\n',
    );

    // Create project-b with 1 session + warmup
    const projectB = join(projectsDir, "-home-user-projects-project-b");
    await mkdir(projectB, { recursive: true });

    await writeFile(
      join(projectB, "ghi789.jsonl"),
      '{"type": "user", "timestamp": "2025-01-04T10:00:00.000Z", "message": {"role": "user", "content": "Hello from project B"}}\n' +
        '{"type": "assistant", "timestamp": "2025-01-04T10:00:05.000Z", "message": {"role": "assistant", "content": [{"type": "text", "text": "Welcome!"}]}}\n',
    );

    await writeFile(
      join(projectB, "warmup123.jsonl"),
      '{"type": "user", "timestamp": "2025-01-05T10:00:00.000Z", "message": {"role": "user", "content": "warmup"}}\n',
    );
  });

  afterEach(async () => {
    await rm(projectsDir, { recursive: true, force: true });
    await rm(outputDir, { recursive: true, force: true });
  });

  test("creates output directory", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const s = await stat(outputDir);
    expect(s.isDirectory()).toBe(true);
  });

  test("creates master index", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const masterIndex = Bun.file(join(outputDir, "index.html"));
    expect(await masterIndex.exists()).toBe(true);
  });

  test("creates project directories", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const projectAExists = await stat(join(outputDir, "project-a"))
      .then((s) => s.isDirectory())
      .catch(() => false);
    const projectBExists = await stat(join(outputDir, "project-b"))
      .then((s) => s.isDirectory())
      .catch(() => false);
    expect(projectAExists).toBe(true);
    expect(projectBExists).toBe(true);
  });

  test("creates project indexes", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    expect(
      await Bun.file(join(outputDir, "project-a", "index.html")).exists(),
    ).toBe(true);
    expect(
      await Bun.file(join(outputDir, "project-b", "index.html")).exists(),
    ).toBe(true);
  });

  test("creates session directories with transcripts", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const projectADir = join(outputDir, "project-a");
    const entries = await readdir(projectADir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    expect(dirs.length).toBe(2);

    for (const dir of dirs) {
      expect(
        await Bun.file(join(projectADir, dir.name, "index.html")).exists(),
      ).toBe(true);
    }
  });

  test("master index lists all projects", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const indexHtml = await Bun.file(join(outputDir, "index.html")).text();
    expect(indexHtml).toContain("project-a");
    expect(indexHtml).toContain("project-b");
  });

  test("master index shows session counts", async () => {
    await generateBatchHtml(projectsDir, outputDir);
    const indexHtml = await Bun.file(join(outputDir, "index.html")).text();
    expect(indexHtml.includes("2 sessions") || indexHtml.includes("2 session")).toBe(
      true,
    );
    expect(indexHtml).toContain("1 session");
  });

  test("returns statistics", async () => {
    const stats = await generateBatchHtml(projectsDir, outputDir);
    expect(stats.total_projects).toBe(2);
    expect(stats.total_sessions).toBe(3);
    expect(stats.failed_sessions).toEqual([]);
    expect(stats.output_dir).toBe(outputDir);
  });

  test("progress callback called", async () => {
    const progressCalls: Array<[string, string, number, number]> = [];

    await generateBatchHtml(projectsDir, outputDir, {
      progressCallback: (projectName, sessionName, current, total) => {
        progressCalls.push([projectName, sessionName, current, total]);
      },
    });

    expect(progressCalls.length).toBe(3);
    // Last call should have current == total
    const last = progressCalls[progressCalls.length - 1];
    expect(last[2]).toBe(last[3]);
  });
});
