import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getProjectDisplayName,
  getSessionSummary,
  findLocalSessions,
  findAllSessions,
} from "../src/sessions.js";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

describe("getProjectDisplayName", () => {
  test("extracts project name from path", () => {
    expect(getProjectDisplayName("-home-user-projects-myproject")).toBe("myproject");
  });

  test("handles nested paths", () => {
    expect(getProjectDisplayName("-home-user-code-apps-webapp")).toBe("apps-webapp");
  });

  test("handles Windows-style paths", () => {
    expect(getProjectDisplayName("-mnt-c-Users-name-Projects-app")).toBe("app");
  });

  test("handles simple name", () => {
    expect(getProjectDisplayName("simple-project")).toBe("simple-project");
  });
});

describe("getSessionSummary", () => {
  test("extracts summary from JSON file", async () => {
    const summary = await getSessionSummary(join(FIXTURES_DIR, "sample_session.json"));
    expect(summary).toContain("Create a simple Python function");
  });

  test("extracts summary from JSONL file", async () => {
    const summary = await getSessionSummary(join(FIXTURES_DIR, "sample_session.jsonl"));
    // First priority: summary type entry
    expect(summary).toBe("Test session for JSONL parsing");
  });

  test("returns (no summary) for nonexistent file", async () => {
    const summary = await getSessionSummary("/nonexistent/path.json");
    expect(summary).toBe("(no summary)");
  });
});

describe("findLocalSessions", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "sessions-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("finds JSONL sessions", async () => {
    const projectDir = join(tempDir, "project-a");
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, "session1.jsonl"),
      '{"type": "user", "message": {"role": "user", "content": "Hello from session"}}\n',
    );

    const results = await findLocalSessions(tempDir);
    expect(results.length).toBe(1);
    expect(results[0].summary).toContain("Hello from session");
  });

  test("skips agent files", async () => {
    const projectDir = join(tempDir, "project-a");
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, "session1.jsonl"),
      '{"type": "user", "message": {"role": "user", "content": "Normal session"}}\n',
    );
    await writeFile(
      join(projectDir, "agent-xyz789.jsonl"),
      '{"type": "user", "message": {"role": "user", "content": "Agent session"}}\n',
    );

    const results = await findLocalSessions(tempDir);
    expect(results.length).toBe(1);
    expect(results[0].summary).toContain("Normal session");
  });

  test("skips warmup sessions", async () => {
    const projectDir = join(tempDir, "project-a");
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, "warmup123.jsonl"),
      '{"type": "user", "message": {"role": "user", "content": "warmup"}}\n',
    );

    const results = await findLocalSessions(tempDir);
    expect(results.length).toBe(0);
  });

  test("returns empty for nonexistent folder", async () => {
    const results = await findLocalSessions("/nonexistent/path");
    expect(results).toEqual([]);
  });
});

describe("findAllSessions", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "allsessions-test-"));

    // Create project-a with 2 sessions
    const projectA = join(tempDir, "-home-user-projects-project-a");
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
    // Agent file
    await writeFile(
      join(projectA, "agent-xyz789.jsonl"),
      '{"type": "user", "timestamp": "2025-01-03T10:00:00.000Z", "message": {"role": "user", "content": "Agent session"}}\n',
    );

    // Create project-b with 1 session + warmup
    const projectB = join(tempDir, "-home-user-projects-project-b");
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
    await rm(tempDir, { recursive: true, force: true });
  });

  test("finds sessions grouped by project", async () => {
    const result = await findAllSessions(tempDir);
    expect(result.length).toBe(2);
    const names = result.map((p) => p.name);
    expect(names).toContain("project-a");
    expect(names).toContain("project-b");
  });

  test("excludes agent files by default", async () => {
    const result = await findAllSessions(tempDir);
    const projectA = result.find((p) => p.name === "project-a")!;
    expect(projectA.sessions.length).toBe(2);
    for (const session of projectA.sessions) {
      const filename = session.path.split("/").pop()!;
      expect(filename.startsWith("agent-")).toBe(false);
    }
  });

  test("includes agent files when requested", async () => {
    const result = await findAllSessions(tempDir, true);
    const projectA = result.find((p) => p.name === "project-a")!;
    expect(projectA.sessions.length).toBe(3);
  });

  test("excludes warmup sessions", async () => {
    const result = await findAllSessions(tempDir);
    const projectB = result.find((p) => p.name === "project-b")!;
    expect(projectB.sessions.length).toBe(1);
  });

  test("sessions sorted by date", async () => {
    const result = await findAllSessions(tempDir);
    for (const project of result) {
      const sessions = project.sessions;
      if (sessions.length > 1) {
        for (let i = 0; i < sessions.length - 1; i++) {
          expect(sessions[i].mtime).toBeGreaterThanOrEqual(sessions[i + 1].mtime);
        }
      }
    }
  });

  test("returns empty for nonexistent folder", async () => {
    const result = await findAllSessions("/nonexistent/path");
    expect(result).toEqual([]);
  });

  test("sessions include summary", async () => {
    const result = await findAllSessions(tempDir);
    const projectA = result.find((p) => p.name === "project-a")!;
    for (const session of projectA.sessions) {
      expect(session.summary).toBeDefined();
      expect(session.summary).not.toBe("(no summary)");
    }
  });
});
