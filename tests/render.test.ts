import { describe, expect, test } from "bun:test";
import {
  renderMarkdownText,
  formatJson,
  isJsonLike,
  renderTodoWrite,
  renderWriteTool,
  renderEditTool,
  renderBashTool,
  escapeHtml,
} from "../src/render.js";

describe("renderMarkdownText", () => {
  test("renders bold, code, and list", () => {
    const result = renderMarkdownText("**bold** and `code`\n\n- item 1\n- item 2");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<code>code</code>");
    expect(result).toContain("<li>item 1</li>");
    expect(result).toContain("<li>item 2</li>");
  });

  test("returns empty string for empty input", () => {
    expect(renderMarkdownText("")).toBe("");
    expect(renderMarkdownText(null)).toBe("");
    expect(renderMarkdownText(undefined)).toBe("");
  });
});

describe("formatJson", () => {
  test("formats object as pretty JSON in pre block", () => {
    const result = formatJson({ key: "value", number: 42, nested: { a: 1 } });
    expect(result).toContain('<pre class="json">');
    expect(result).toContain("&quot;key&quot;");
    expect(result).toContain("&quot;value&quot;");
    expect(result).toContain("42");
  });
});

describe("isJsonLike", () => {
  test("detects JSON objects and arrays", () => {
    expect(isJsonLike('{"key": "value"}')).toBe(true);
    expect(isJsonLike("[1, 2, 3]")).toBe(true);
  });

  test("rejects plain text and empty/null", () => {
    expect(isJsonLike("plain text")).toBe(false);
    expect(isJsonLike("")).toBe(false);
    expect(isJsonLike(null)).toBe(false);
  });
});

describe("renderTodoWrite", () => {
  test("renders todos with correct status icons", () => {
    const toolInput = {
      todos: [
        { content: "First task", status: "completed", activeForm: "First" },
        { content: "Second task", status: "in_progress", activeForm: "Second" },
        { content: "Third task", status: "pending", activeForm: "Third" },
      ],
    };
    const result = renderTodoWrite(toolInput, "tool-123");
    expect(result).toContain("todo-completed");
    expect(result).toContain("todo-in-progress");
    expect(result).toContain("todo-pending");
    expect(result).toContain("First task");
    expect(result).toContain("Second task");
    expect(result).toContain("Third task");
    expect(result).toContain("Task List");
    expect(result).toContain('data-tool-id="tool-123"');
  });

  test("returns empty string for no todos", () => {
    expect(renderTodoWrite({ todos: [] }, "tool-123")).toBe("");
  });
});

describe("renderWriteTool", () => {
  test("renders write tool with file path and content", () => {
    const toolInput = {
      file_path: "/project/src/main.py",
      content: "def hello():\n    print('hello world')\n",
    };
    const result = renderWriteTool(toolInput, "tool-123");
    expect(result).toContain("write-tool");
    expect(result).toContain("main.py");
    expect(result).toContain("/project/src/main.py");
    expect(result).toContain("def hello():");
    expect(result).toContain('data-tool-id="tool-123"');
  });
});

describe("renderEditTool", () => {
  test("renders edit tool with old and new strings", () => {
    const toolInput = {
      file_path: "/project/file.py",
      old_string: "old code here",
      new_string: "new code here",
    };
    const result = renderEditTool(toolInput, "tool-123");
    expect(result).toContain("edit-tool");
    expect(result).toContain("file.py");
    expect(result).toContain("old code here");
    expect(result).toContain("new code here");
    expect(result).toContain("edit-old");
    expect(result).toContain("edit-new");
  });

  test("renders replace_all flag", () => {
    const toolInput = {
      file_path: "/project/file.py",
      old_string: "old",
      new_string: "new",
      replace_all: true,
    };
    const result = renderEditTool(toolInput, "tool-123");
    expect(result).toContain("(replace all)");
  });
});

describe("renderBashTool", () => {
  test("renders bash tool with command and description", () => {
    const toolInput = {
      command: "pytest tests/ -v",
      description: "Run tests with verbose output",
    };
    const result = renderBashTool(toolInput, "tool-123");
    expect(result).toContain("bash-tool");
    expect(result).toContain("pytest tests/ -v");
    expect(result).toContain("Run tests with verbose output");
    expect(result).toContain('data-tool-id="tool-123"');
  });
});

describe("escapeHtml", () => {
  test("escapes all special characters", () => {
    expect(escapeHtml('&<>"')).toBe("&amp;&lt;&gt;&quot;");
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });
});
