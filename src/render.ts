import { marked } from "marked";
import type { ContentBlock, RenderContext, TodoItem } from "./types.js";
import { COMMIT_PATTERN } from "./constants.js";

/** Escape HTML special characters (matches Python's html.escape) */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Render markdown text to HTML using marked */
export function renderMarkdownText(text: string | null | undefined): string {
  if (!text) return "";
  return marked.parse(text, { async: false }) as string;
}

/** Format an object/string as pretty-printed JSON in a <pre> block */
export function formatJson(obj: unknown): string {
  try {
    let parsed = obj;
    if (typeof obj === "string") {
      parsed = JSON.parse(obj);
    }
    const formatted = JSON.stringify(parsed, null, 2);
    return `<pre class="json">${escapeHtml(formatted)}</pre>`;
  } catch {
    return `<pre>${escapeHtml(String(obj))}</pre>`;
  }
}

/** Check if a string looks like JSON (starts/ends with {} or []) */
export function isJsonLike(text: unknown): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

// --- Macro equivalents (replacing Jinja2 macros with TS functions) ---

export function imageBlock(mediaType: string, data: string): string {
  return `<div class="image-block"><img src="data:${mediaType};base64,${data}" style="max-width: 100%"></div>`;
}

export function thinkingBlock(contentHtml: string): string {
  return `<div class="thinking"><div class="thinking-label">Thinking</div>${contentHtml}</div>`;
}

export function assistantText(contentHtml: string): string {
  return `<div class="assistant-text">${contentHtml}</div>`;
}

export function userContent(contentHtml: string): string {
  return `<div class="user-content">${contentHtml}</div>`;
}

export function todoList(
  todos: TodoItem[],
  toolId: string,
): string {
  const items = todos
    .map((todo) => {
      const status = todo.status || "pending";
      const content = todo.content || "";
      let icon: string;
      let statusClass: string;
      if (status === "completed") {
        icon = "\u2713";
        statusClass = "todo-completed";
      } else if (status === "in_progress") {
        icon = "\u2192";
        statusClass = "todo-in-progress";
      } else {
        icon = "\u25CB";
        statusClass = "todo-pending";
      }
      return `<li class="todo-item ${statusClass}"><span class="todo-icon">${icon}</span><span class="todo-content">${escapeHtml(content)}</span></li>`;
    })
    .join("");

  return `<div class="todo-list" data-tool-id="${escapeHtml(toolId)}"><div class="todo-header"><span class="todo-header-icon">\u2630</span> Task List</div><ul class="todo-items">${items}</ul></div>`;
}

export function writeTool(
  filePath: string,
  content: string,
  toolId: string,
): string {
  const filename = filePath.includes("/")
    ? filePath.split("/").pop()!
    : filePath;
  return `<div class="file-tool write-tool" data-tool-id="${escapeHtml(toolId)}">
<div class="file-tool-header write-header"><span class="file-tool-icon">\uD83D\uDCDD</span> Write <span class="file-tool-path">${escapeHtml(filename)}</span></div>
<div class="file-tool-fullpath">${escapeHtml(filePath)}</div>
<div class="truncatable"><div class="truncatable-content"><pre class="file-content">${escapeHtml(content)}</pre></div><button class="expand-btn">Show more</button></div>
</div>`;
}

export function editTool(
  filePath: string,
  oldString: string,
  newString: string,
  replaceAll: boolean,
  toolId: string,
): string {
  const filename = filePath.includes("/")
    ? filePath.split("/").pop()!
    : filePath;
  const replaceAllHtml = replaceAll
    ? ' <span class="edit-replace-all">(replace all)</span>'
    : "";
  return `<div class="file-tool edit-tool" data-tool-id="${escapeHtml(toolId)}">
<div class="file-tool-header edit-header"><span class="file-tool-icon">\u270F\uFE0F</span> Edit <span class="file-tool-path">${escapeHtml(filename)}</span>${replaceAllHtml}</div>
<div class="file-tool-fullpath">${escapeHtml(filePath)}</div>
<div class="truncatable"><div class="truncatable-content">
<div class="edit-section edit-old"><div class="edit-label">\u2212</div><pre class="edit-content">${escapeHtml(oldString)}</pre></div>
<div class="edit-section edit-new"><div class="edit-label">+</div><pre class="edit-content">${escapeHtml(newString)}</pre></div>
</div><button class="expand-btn">Show more</button></div>
</div>`;
}

export function bashTool(
  command: string,
  description: string,
  toolId: string,
): string {
  const descHtml = description
    ? `\n<div class="tool-description">${escapeHtml(description)}</div>`
    : "";
  return `<div class="tool-use bash-tool" data-tool-id="${escapeHtml(toolId)}">
<div class="tool-header"><span class="tool-icon">$</span> Bash</div>${descHtml}
<div class="truncatable"><div class="truncatable-content"><pre class="bash-command">${escapeHtml(command)}</pre></div><button class="expand-btn">Show more</button></div>
</div>`;
}

export function toolUse(
  toolName: string,
  description: string,
  inputJson: string,
  toolId: string,
): string {
  const descHtml = description
    ? `<div class="tool-description">${escapeHtml(description)}</div>`
    : "";
  return `<div class="tool-use" data-tool-id="${escapeHtml(toolId)}"><div class="tool-header"><span class="tool-icon">\u2699</span> ${escapeHtml(toolName)}</div>${descHtml}<div class="truncatable"><div class="truncatable-content"><pre class="json">${escapeHtml(inputJson)}</pre></div><button class="expand-btn">Show more</button></div></div>`;
}

export function toolResult(
  contentHtml: string,
  isError: boolean,
  hasImages = false,
): string {
  const errorClass = isError ? " tool-error" : "";
  if (hasImages) {
    return `<div class="tool-result${errorClass}">${contentHtml}</div>`;
  }
  return `<div class="tool-result${errorClass}"><div class="truncatable"><div class="truncatable-content">${contentHtml}</div><button class="expand-btn">Show more</button></div></div>`;
}

export function commitCard(
  commitHash: string,
  commitMsg: string,
  githubRepo: string | null,
): string {
  if (githubRepo) {
    const githubLink = `https://github.com/${githubRepo}/commit/${commitHash}`;
    return `<div class="commit-card"><a href="${githubLink}"><span class="commit-card-hash">${escapeHtml(commitHash.slice(0, 7))}</span> ${escapeHtml(commitMsg)}</a></div>`;
  }
  return `<div class="commit-card"><span class="commit-card-hash">${escapeHtml(commitHash.slice(0, 7))}</span> ${escapeHtml(commitMsg)}</div>`;
}

export function message(
  roleClass: string,
  roleLabel: string,
  msgId: string,
  timestamp: string,
  contentHtml: string,
): string {
  return `<div class="message ${roleClass}" id="${msgId}"><div class="message-header"><span class="role-label">${escapeHtml(roleLabel)}</span><a href="#${msgId}" class="timestamp-link"><time datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></a></div><div class="message-content">${contentHtml}</div></div>`;
}

export function continuation(contentHtml: string): string {
  return `<details class="continuation"><summary>Session continuation summary</summary>${contentHtml}</details>`;
}

export function indexItem(
  promptNum: number,
  link: string,
  timestamp: string,
  renderedContent: string,
  statsHtml: string,
): string {
  return `<div class="index-item"><a href="${link}"><div class="index-item-header"><span class="index-item-number">#${promptNum}</span><time datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-item-content">${renderedContent}</div></a>${statsHtml}</div>`;
}

export function indexCommit(
  commitHash: string,
  commitMsg: string,
  timestamp: string,
  githubRepo: string | null,
): string {
  if (githubRepo) {
    const githubLink = `https://github.com/${githubRepo}/commit/${commitHash}`;
    return `<div class="index-commit"><a href="${githubLink}"><div class="index-commit-header"><span class="index-commit-hash">${escapeHtml(commitHash.slice(0, 7))}</span><time datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-commit-msg">${escapeHtml(commitMsg)}</div></a></div>`;
  }
  return `<div class="index-commit"><div class="index-commit-header"><span class="index-commit-hash">${escapeHtml(commitHash.slice(0, 7))}</span><time datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-commit-msg">${escapeHtml(commitMsg)}</div></div>`;
}

export function indexStats(
  toolStatsStr: string,
  longTextsHtml: string,
): string {
  if (!toolStatsStr && !longTextsHtml) return "";
  const statsSpan = toolStatsStr ? `<span>${escapeHtml(toolStatsStr)}</span>` : "";
  return `<div class="index-item-stats">${statsSpan}${longTextsHtml}</div>`;
}

export function indexLongText(renderedContent: string): string {
  return `<div class="index-item-long-text"><div class="truncatable"><div class="truncatable-content"><div class="index-item-long-text-content">${renderedContent}</div></div><button class="expand-btn">Show more</button></div></div>`;
}

// --- High-level render functions ---

/** Render a TodoWrite tool call */
export function renderTodoWrite(
  toolInput: Record<string, unknown>,
  toolId: string,
): string {
  const todos = (toolInput.todos || []) as TodoItem[];
  if (!todos.length) return "";
  return todoList(todos, toolId);
}

/** Render a Write tool call */
export function renderWriteTool(
  toolInput: Record<string, unknown>,
  toolId: string,
): string {
  const filePath = (toolInput.file_path as string) || "Unknown file";
  const content = (toolInput.content as string) || "";
  return writeTool(filePath, content, toolId);
}

/** Render an Edit tool call */
export function renderEditTool(
  toolInput: Record<string, unknown>,
  toolId: string,
): string {
  const filePath = (toolInput.file_path as string) || "Unknown file";
  const oldString = (toolInput.old_string as string) || "";
  const newString = (toolInput.new_string as string) || "";
  const replaceAll = (toolInput.replace_all as boolean) || false;
  return editTool(filePath, oldString, newString, replaceAll, toolId);
}

/** Render a Bash tool call */
export function renderBashTool(
  toolInput: Record<string, unknown>,
  toolId: string,
): string {
  const command = (toolInput.command as string) || "";
  const description = (toolInput.description as string) || "";
  return bashTool(command, description, toolId);
}

/** Render a single content block */
export function renderContentBlock(
  block: unknown,
  ctx: RenderContext = { githubRepo: null },
): string {
  if (!block || typeof block !== "object") {
    return `<p>${escapeHtml(String(block))}</p>`;
  }

  const b = block as Record<string, unknown>;
  const blockType = (b.type as string) || "";

  if (blockType === "image") {
    const source = (b.source || {}) as Record<string, unknown>;
    const mediaType = (source.media_type as string) || "image/png";
    const data = (source.data as string) || "";
    return imageBlock(mediaType, data);
  }

  if (blockType === "thinking") {
    const contentHtml = renderMarkdownText(b.thinking as string);
    return thinkingBlock(contentHtml);
  }

  if (blockType === "text") {
    const contentHtml = renderMarkdownText(b.text as string);
    return assistantText(contentHtml);
  }

  if (blockType === "tool_use") {
    const toolName = (b.name as string) || "Unknown tool";
    const toolInput = (b.input || {}) as Record<string, unknown>;
    const toolId = (b.id as string) || "";

    if (toolName === "TodoWrite") return renderTodoWrite(toolInput, toolId);
    if (toolName === "Write") return renderWriteTool(toolInput, toolId);
    if (toolName === "Edit") return renderEditTool(toolInput, toolId);
    if (toolName === "Bash") return renderBashTool(toolInput, toolId);

    const description = (toolInput.description as string) || "";
    const displayInput: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(toolInput)) {
      if (k !== "description") displayInput[k] = v;
    }
    const inputJson = JSON.stringify(displayInput, null, 2);
    return toolUse(toolName, description, inputJson, toolId);
  }

  if (blockType === "tool_result") {
    const content = b.content;
    const isError = (b.is_error as boolean) || false;
    let hasImages = false;

    if (typeof content === "string") {
      // Check for git commits
      const commitPattern = new RegExp(COMMIT_PATTERN.source, "g");
      const commitsFound = [...content.matchAll(commitPattern)];
      if (commitsFound.length > 0) {
        const parts: string[] = [];
        let lastEnd = 0;
        for (const match of commitsFound) {
          const before = content.slice(lastEnd, match.index).trim();
          if (before) parts.push(`<pre>${escapeHtml(before)}</pre>`);
          parts.push(commitCard(match[1], match[2], ctx.githubRepo));
          lastEnd = match.index! + match[0].length;
        }
        const after = content.slice(lastEnd).trim();
        if (after) parts.push(`<pre>${escapeHtml(after)}</pre>`);
        return toolResult(parts.join(""), isError, false);
      }
      return toolResult(`<pre>${escapeHtml(content)}</pre>`, isError, false);
    }

    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          const itemType = itemObj.type as string;
          if (itemType === "text") {
            const text = (itemObj.text as string) || "";
            if (text) parts.push(`<pre>${escapeHtml(text)}</pre>`);
          } else if (itemType === "image") {
            const source = (itemObj.source || {}) as Record<string, unknown>;
            const mediaType = (source.media_type as string) || "image/png";
            const data = (source.data as string) || "";
            if (data) {
              parts.push(imageBlock(mediaType, data));
              hasImages = true;
            }
          } else {
            parts.push(formatJson(item));
          }
        } else {
          parts.push(`<pre>${escapeHtml(String(item))}</pre>`);
        }
      }
      const contentHtml = parts.length ? parts.join("") : formatJson(content);
      return toolResult(contentHtml, isError, hasImages);
    }

    return toolResult(formatJson(content), isError, false);
  }

  return formatJson(block);
}

/** Render user message content */
export function renderUserMessageContent(
  messageData: Record<string, unknown>,
  ctx: RenderContext = { githubRepo: null },
): string {
  const content = messageData.content;
  if (typeof content === "string") {
    if (isJsonLike(content)) {
      return userContent(formatJson(content));
    }
    return userContent(renderMarkdownText(content));
  }
  if (Array.isArray(content)) {
    return content
      .map((block) => renderContentBlock(block as ContentBlock, ctx))
      .join("");
  }
  return `<p>${escapeHtml(String(content))}</p>`;
}

/** Render assistant message content */
export function renderAssistantMessage(
  messageData: Record<string, unknown>,
  ctx: RenderContext = { githubRepo: null },
): string {
  const content = messageData.content;
  if (!Array.isArray(content)) {
    return `<p>${escapeHtml(String(content))}</p>`;
  }
  return content
    .map((block) => renderContentBlock(block as ContentBlock, ctx))
    .join("");
}

/** Create a message DOM ID from a timestamp */
export function makeMsgId(timestamp: string): string {
  return `msg-${timestamp.replace(/:/g, "-").replace(/\./g, "-")}`;
}

/** Check if a message contains only tool_result blocks */
export function isToolResultMessage(
  messageData: Record<string, unknown>,
): boolean {
  const content = messageData.content;
  if (!Array.isArray(content)) return false;
  if (content.length === 0) return false;
  return content.every(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      (block as Record<string, unknown>).type === "tool_result",
  );
}

/** Render a full message (user or assistant) */
export function renderMessage(
  logType: string,
  messageJson: string,
  timestamp: string,
  ctx: RenderContext = { githubRepo: null },
): string {
  if (!messageJson) return "";
  let messageData: Record<string, unknown>;
  try {
    messageData = JSON.parse(messageJson);
  } catch {
    return "";
  }

  let contentHtml: string;
  let roleClass: string;
  let roleLabel: string;

  if (logType === "user") {
    contentHtml = renderUserMessageContent(messageData, ctx);
    if (isToolResultMessage(messageData)) {
      roleClass = "tool-reply";
      roleLabel = "Tool reply";
    } else {
      roleClass = "user";
      roleLabel = "User";
    }
  } else if (logType === "assistant") {
    contentHtml = renderAssistantMessage(messageData, ctx);
    roleClass = "assistant";
    roleLabel = "Assistant";
  } else {
    return "";
  }

  if (!contentHtml.trim()) return "";

  const msgId = makeMsgId(timestamp);
  return message(roleClass, roleLabel, msgId, timestamp, contentHtml);
}
