import { describe, expect, test } from "bun:test";
import { join } from "path";
import { parseSessionFile, parseJsonlContent, extractTextFromContent } from "../src/parse.js";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

describe("extractTextFromContent", () => {
  test("extracts from string content", () => {
    expect(extractTextFromContent("Hello world")).toBe("Hello world");
  });

  test("extracts from array content", () => {
    const content = [
      { type: "text", text: "Hello" },
      { type: "image", source: {} },
      { type: "text", text: "World" },
    ];
    expect(extractTextFromContent(content)).toBe("Hello World");
  });

  test("returns empty for non-text", () => {
    expect(extractTextFromContent(null)).toBe("");
    expect(extractTextFromContent(42)).toBe("");
  });
});

describe("parseSessionFile", () => {
  test("parses JSON file", async () => {
    const data = await parseSessionFile(join(FIXTURES_DIR, "sample_session.json"));
    expect(data.loglines).toBeDefined();
    expect(data.loglines.length).toBeGreaterThan(0);
    expect(data.loglines[0].type).toBe("user");
  });

  test("parses JSONL file", async () => {
    const data = await parseSessionFile(join(FIXTURES_DIR, "sample_session.jsonl"));
    expect(data.loglines).toBeDefined();
    expect(data.loglines.length).toBeGreaterThan(0);
    // JSONL should skip summary lines and only include user/assistant
    expect(
      data.loglines.every((e) => e.type === "user" || e.type === "assistant"),
    ).toBe(true);
  });
});

describe("parseJsonlContent", () => {
  test("handles array content format", () => {
    const content =
      '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello from array format"}]}}\n' +
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi there!"}]}}\n';

    const data = parseJsonlContent(content);
    expect(data.loglines.length).toBe(2);
    expect(data.loglines[0].type).toBe("user");
    expect(data.loglines[1].type).toBe("assistant");
  });

  test("skips non-message entries", () => {
    const content =
      '{"type":"summary","summary":"Test"}\n' +
      '{"type":"user","message":{"role":"user","content":"Hello"}}\n';

    const data = parseJsonlContent(content);
    expect(data.loglines.length).toBe(1);
    expect(data.loglines[0].type).toBe("user");
  });

  test("preserves isCompactSummary", () => {
    const content =
      '{"type":"user","isCompactSummary":true,"message":{"role":"user","content":"Continuation summary"}}\n';

    const data = parseJsonlContent(content);
    expect(data.loglines[0].isCompactSummary).toBe(true);
  });
});
