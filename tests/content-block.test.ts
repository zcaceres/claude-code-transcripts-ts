import { describe, expect, test } from "bun:test";
import { renderContentBlock } from "../src/render.js";
import type { RenderContext } from "../src/types.js";

describe("renderContentBlock", () => {
  test("image block renders data URL img tag", () => {
    // Minimal GIF
    const gifBase64 = Buffer.from(
      "GIF89a" +
        "\xc8\x00\xc8\x00" +
        "\x80\x00\x00" +
        "\x00\x00\x00" +
        "\x00\x00\x00" +
        "," +
        "\x00\x00\x00\x00" +
        "\xc8\x00\xc8\x00" +
        "\x00\x08\x02\x04\x01\x00;",
      "binary",
    ).toString("base64");

    const block = {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/gif",
        data: gifBase64,
      },
    };
    const result = renderContentBlock(block);
    expect(result).toContain('src="data:image/gif;base64,');
    expect(result).toContain("max-width: 100%");
  });

  test("thinking block renders with label", () => {
    const block = {
      type: "thinking",
      thinking: "Let me think about this...\n\n1. First consideration\n2. Second point",
    };
    const result = renderContentBlock(block);
    expect(result).toContain("Thinking");
    expect(result).toContain("First consideration");
    expect(result).toContain("thinking");
  });

  test("text block renders markdown", () => {
    const block = { type: "text", text: "Here is my response with **markdown**." };
    const result = renderContentBlock(block);
    expect(result).toContain("<strong>markdown</strong>");
    expect(result).toContain("assistant-text");
  });

  test("tool result renders content", () => {
    const block = {
      type: "tool_result",
      content: "Command completed successfully\nOutput line 1\nOutput line 2",
      is_error: false,
    };
    const result = renderContentBlock(block);
    expect(result).toContain("tool-result");
    expect(result).toContain("Command completed successfully");
    expect(result).not.toContain("tool-error");
  });

  test("tool result error renders with error class", () => {
    const block = {
      type: "tool_result",
      content: "Error: file not found\nTraceback follows...",
      is_error: true,
    };
    const result = renderContentBlock(block);
    expect(result).toContain("tool-error");
    expect(result).toContain("Error: file not found");
  });

  test("tool result with commit renders commit card", () => {
    const ctx: RenderContext = { githubRepo: "example/repo" };
    const block = {
      type: "tool_result",
      content:
        "[main abc1234] Add new feature\n 2 files changed, 10 insertions(+)",
      is_error: false,
    };
    const result = renderContentBlock(block, ctx);
    expect(result).toContain("commit-card");
    expect(result).toContain("abc1234");
    expect(result).toContain("Add new feature");
    expect(result).toContain("https://github.com/example/repo/commit/abc1234");
  });

  test("tool result with image does not have truncatable", () => {
    const gifBase64 = Buffer.from(
      "GIF89a" +
        "\xc8\x00\xc8\x00" +
        "\x80\x00\x00" +
        "\x00\x00\x00" +
        "\x00\x00\x00" +
        "," +
        "\x00\x00\x00\x00" +
        "\xc8\x00\xc8\x00" +
        "\x00\x08\x02\x04\x01\x00;",
      "binary",
    ).toString("base64");

    const block = {
      type: "tool_result",
      content: [
        {
          type: "text",
          text: "Successfully captured screenshot (807x782, jpeg) - ID: ss_123",
        },
        {
          type: "text",
          text: "\n\nTab Context:\n- Executed on tabId: 12345",
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/gif",
            data: gifBase64,
          },
        },
      ],
      is_error: false,
    };
    const result = renderContentBlock(block);
    expect(result).toContain("Successfully captured screenshot");
    expect(result).toContain("Tab Context");
    expect(result).toContain('src="data:image/gif;base64,');
    expect(result).toContain("max-width: 100%");
    // Tool results with images should NOT be truncatable
    expect(result).not.toContain("truncatable");
  });
});
