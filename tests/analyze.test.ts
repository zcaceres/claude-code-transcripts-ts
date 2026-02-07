import { describe, expect, test } from "bun:test";
import { analyzeConversation, formatToolStats, isToolResultMessage } from "../src/analyze.js";
import type { MessageTuple } from "../src/types.js";

describe("analyzeConversation", () => {
  test("counts tools", () => {
    const messages: MessageTuple[] = [
      [
        "assistant",
        JSON.stringify({
          content: [
            { type: "tool_use", name: "Bash", id: "1", input: {} },
            { type: "tool_use", name: "Bash", id: "2", input: {} },
            { type: "tool_use", name: "Write", id: "3", input: {} },
          ],
        }),
        "2025-01-01T00:00:00Z",
      ],
    ];
    const result = analyzeConversation(messages);
    expect(result.tool_counts.Bash).toBe(2);
    expect(result.tool_counts.Write).toBe(1);
  });

  test("extracts commits", () => {
    const messages: MessageTuple[] = [
      [
        "user",
        JSON.stringify({
          content: [
            {
              type: "tool_result",
              content:
                "[main abc1234] Add new feature\n 1 file changed",
            },
          ],
        }),
        "2025-01-01T00:00:00Z",
      ],
    ];
    const result = analyzeConversation(messages);
    expect(result.commits.length).toBe(1);
    expect(result.commits[0][0]).toBe("abc1234");
    expect(result.commits[0][1]).toContain("Add new feature");
  });
});

describe("formatToolStats", () => {
  test("formats counts", () => {
    const counts = { Bash: 5, Read: 3, Write: 1 };
    const result = formatToolStats(counts);
    expect(result).toContain("5 bash");
    expect(result).toContain("3 read");
    expect(result).toContain("1 write");
  });

  test("returns empty for no counts", () => {
    expect(formatToolStats({})).toBe("");
  });
});

describe("isToolResultMessage", () => {
  test("detects tool-result-only messages", () => {
    const message = { content: [{ type: "tool_result", content: "result" }] };
    expect(isToolResultMessage(message)).toBe(true);
  });

  test("rejects mixed content", () => {
    const message = {
      content: [
        { type: "text", text: "hello" },
        { type: "tool_result", content: "result" },
      ],
    };
    expect(isToolResultMessage(message)).toBe(false);
  });

  test("rejects empty content", () => {
    expect(isToolResultMessage({ content: [] })).toBe(false);
    expect(isToolResultMessage({ content: "string" })).toBe(false);
  });
});
