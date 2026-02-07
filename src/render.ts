import { marked } from "marked";
import type { ContentBlock, RenderContext, TodoItem } from "./types.js";
import { COMMIT_PATTERN } from "./constants.js";

/** Tailwind class helpers for common patterns */
const tw = {
  card: "rounded-lg p-3 my-3 border",
  expandBtn: "expand-btn w-full py-2 mt-1 bg-slate-100 border border-slate-200 rounded-md cursor-pointer text-sm text-slate-500 font-mono hover:bg-slate-200",
  codePre: "bg-slate-900 text-slate-300 p-3 rounded-md overflow-x-auto text-sm leading-relaxed my-2 whitespace-pre-wrap break-words font-mono",
  fileHeader: "font-semibold mb-1 flex items-center gap-2 text-sm",
  filePath: "font-mono bg-slate-100 px-2 py-0.5 rounded text-sm text-slate-600",
  fullPath: "font-mono text-xs text-slate-400 mb-2 break-all",
};

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
    return `<pre class="json ${tw.codePre}">${escapeHtml(formatted)}</pre>`;
  } catch {
    return `<pre class="${tw.codePre}">${escapeHtml(String(obj))}</pre>`;
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
  return `<div class="image-block my-2"><img src="data:${mediaType};base64,${data}" style="max-width: 100%" class="rounded-md"></div>`;
}

export function thinkingBlock(contentHtml: string): string {
  return `<div class="thinking bg-slate-50 border border-slate-200 rounded-lg p-3 my-3 text-sm text-slate-500 prose-content"><div class="thinking-label text-xs font-semibold uppercase text-slate-400 mb-2 tracking-widest font-mono">Thinking</div>${contentHtml}</div>`;
}

export function assistantText(contentHtml: string): string {
  return `<div class="assistant-text my-2 prose-content">${contentHtml}</div>`;
}

export function userContent(contentHtml: string): string {
  return `<div class="user-content m-0 prose-content">${contentHtml}</div>`;
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
      const iconColors: Record<string, string> = {
        "todo-completed": "text-emerald-700 bg-emerald-100",
        "todo-in-progress": "text-cyan-700 bg-cyan-100",
        "todo-pending": "text-slate-400 bg-slate-100",
      };
      const textColors: Record<string, string> = {
        "todo-completed": "text-slate-500 line-through",
        "todo-in-progress": "text-slate-800 font-medium",
        "todo-pending": "text-slate-600",
      };
      return `<li class="todo-item ${statusClass} flex items-start gap-2.5 py-1.5 border-b border-black/5 last:border-b-0 text-sm"><span class="todo-icon shrink-0 w-5 h-5 flex items-center justify-center font-bold rounded-full ${iconColors[statusClass] || ""}">${icon}</span><span class="todo-content ${textColors[statusClass] || ""}">${escapeHtml(content)}</span></li>`;
    })
    .join("");

  return `<div class="todo-list bg-white border border-slate-200 rounded-lg p-3 my-3" data-tool-id="${escapeHtml(toolId)}"><div class="todo-header font-semibold text-slate-700 mb-2.5 flex items-center gap-2 text-sm font-mono"><span class="todo-header-icon">\u2630</span> Task List</div><ul class="todo-items list-none m-0 p-0">${items}</ul></div>`;
}

export function writeTool(
  filePath: string,
  content: string,
  toolId: string,
): string {
  const filename = filePath.includes("/")
    ? filePath.split("/").pop()!
    : filePath;
  return `<div class="file-tool write-tool bg-slate-50 border border-slate-200 ${tw.card}" data-tool-id="${escapeHtml(toolId)}">
<div class="file-tool-header write-header ${tw.fileHeader} text-slate-700"><span class="file-tool-icon font-mono text-cyan-600">W</span> Write <span class="file-tool-path ${tw.filePath}">${escapeHtml(filename)}</span></div>
<div class="file-tool-fullpath ${tw.fullPath}">${escapeHtml(filePath)}</div>
<div class="truncatable"><div class="truncatable-content"><pre class="file-content ${tw.codePre} !m-0">${escapeHtml(content)}</pre></div><button class="${tw.expandBtn}">Show more</button></div>
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
    ? ' <span class="edit-replace-all text-xs font-normal text-slate-400 font-mono">(replace all)</span>'
    : "";
  return `<div class="file-tool edit-tool bg-slate-50 border border-slate-200 ${tw.card}" data-tool-id="${escapeHtml(toolId)}">
<div class="file-tool-header edit-header ${tw.fileHeader} text-slate-700"><span class="file-tool-icon font-mono text-cyan-600">E</span> Edit <span class="file-tool-path ${tw.filePath}">${escapeHtml(filename)}</span>${replaceAllHtml}</div>
<div class="file-tool-fullpath ${tw.fullPath}">${escapeHtml(filePath)}</div>
<div class="truncatable"><div class="truncatable-content">
<div class="edit-section edit-old flex my-1 rounded overflow-hidden bg-red-50/60"><div class="edit-label px-3 py-2 font-bold font-mono flex items-start text-red-800 bg-red-100">\u2212</div><pre class="edit-content m-0 flex-1 bg-transparent text-sm text-red-900 p-2 whitespace-pre-wrap break-words font-mono">${escapeHtml(oldString)}</pre></div>
<div class="edit-section edit-new flex my-1 rounded overflow-hidden bg-green-50/60"><div class="edit-label px-3 py-2 font-bold font-mono flex items-start text-green-800 bg-green-100">+</div><pre class="edit-content m-0 flex-1 bg-transparent text-sm text-green-900 p-2 whitespace-pre-wrap break-words font-mono">${escapeHtml(newString)}</pre></div>
</div><button class="${tw.expandBtn}">Show more</button></div>
</div>`;
}

export function bashTool(
  command: string,
  description: string,
  toolId: string,
): string {
  const descHtml = description
    ? `\n<div class="tool-description text-sm text-slate-500 mb-2 italic">${escapeHtml(description)}</div>`
    : "";
  return `<div class="tool-use bash-tool bg-slate-50 border border-slate-200 ${tw.card}" data-tool-id="${escapeHtml(toolId)}">
<div class="tool-header font-semibold text-slate-700 mb-2 flex items-center gap-2"><span class="tool-icon text-cyan-600 font-mono">$</span> Bash</div>${descHtml}
<div class="truncatable"><div class="truncatable-content"><pre class="bash-command ${tw.codePre}">${escapeHtml(command)}</pre></div><button class="${tw.expandBtn}">Show more</button></div>
</div>`;
}

export function toolUse(
  toolName: string,
  description: string,
  inputJson: string,
  toolId: string,
): string {
  const descHtml = description
    ? `<div class="tool-description text-sm text-slate-500 mb-2 italic">${escapeHtml(description)}</div>`
    : "";
  return `<div class="tool-use bg-slate-50 border border-slate-200 ${tw.card}" data-tool-id="${escapeHtml(toolId)}"><div class="tool-header font-semibold text-slate-700 mb-2 flex items-center gap-2"><span class="tool-icon text-cyan-600 font-mono">\u2699</span> ${escapeHtml(toolName)}</div>${descHtml}<div class="truncatable"><div class="truncatable-content"><pre class="json ${tw.codePre}">${escapeHtml(inputJson)}</pre></div><button class="${tw.expandBtn}">Show more</button></div></div>`;
}

export function toolResult(
  contentHtml: string,
  isError: boolean,
  hasImages = false,
): string {
  const errorClass = isError ? " tool-error" : "";
  const bgClass = isError ? "bg-red-50" : "bg-white";
  if (hasImages) {
    return `<div class="tool-result${errorClass} ${bgClass} rounded-lg p-3 my-3">${contentHtml}</div>`;
  }
  return `<div class="tool-result${errorClass} ${bgClass} rounded-lg p-3 my-3"><div class="truncatable"><div class="truncatable-content">${contentHtml}</div><button class="${tw.expandBtn}">Show more</button></div></div>`;
}

export function commitCard(
  commitHash: string,
  commitMsg: string,
  githubRepo: string | null,
): string {
  if (githubRepo) {
    const githubLink = `https://github.com/${githubRepo}/commit/${commitHash}`;
    return `<div class="commit-card my-2 px-3.5 py-2.5 bg-cyan-50 border-l-4 border-cyan-600 rounded-md"><a href="${githubLink}" class="no-underline text-slate-800 block hover:text-cyan-600"><span class="commit-card-hash font-mono text-cyan-600 font-semibold mr-2">${escapeHtml(commitHash.slice(0, 7))}</span> ${escapeHtml(commitMsg)}</a></div>`;
  }
  return `<div class="commit-card my-2 px-3.5 py-2.5 bg-cyan-50 border-l-4 border-cyan-600 rounded-md"><span class="commit-card-hash font-mono text-cyan-600 font-semibold mr-2">${escapeHtml(commitHash.slice(0, 7))}</span> ${escapeHtml(commitMsg)}</div>`;
}

const messageStyles: Record<string, { bg: string; border: string; roleColor: string }> = {
  user: { bg: "bg-cyan-50/50", border: "border-cyan-600", roleColor: "text-cyan-700" },
  assistant: { bg: "bg-white", border: "border-slate-200", roleColor: "text-slate-500" },
  "tool-reply": { bg: "bg-slate-50", border: "border-slate-300", roleColor: "text-slate-500" },
};

export function message(
  roleClass: string,
  roleLabel: string,
  msgId: string,
  timestamp: string,
  contentHtml: string,
): string {
  const style = messageStyles[roleClass] || messageStyles.assistant;
  return `<div class="message ${roleClass} mb-4 rounded-lg overflow-hidden shadow-sm ${style.bg} border-l-4 ${style.border}" id="${msgId}"><div class="message-header flex justify-between items-center px-4 py-2 bg-black/[0.02] text-sm"><span class="role-label font-semibold uppercase tracking-widest text-xs font-mono ${style.roleColor}">${escapeHtml(roleLabel)}</span><a href="#${msgId}" class="timestamp-link text-inherit no-underline hover:underline"><time class="text-slate-400 text-xs font-mono" datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></a></div><div class="message-content p-4 prose-content">${contentHtml}</div></div>`;
}

export function continuation(contentHtml: string): string {
  return `<details class="continuation mb-4"><summary class="cursor-pointer px-4 py-3 bg-slate-50 border-l-4 border-slate-300 rounded-lg font-medium text-slate-500 hover:bg-slate-100 font-mono text-sm">Session continuation summary</summary><div class="p-4 prose-content">${contentHtml}</div></details>`;
}

export function indexItem(
  promptNum: number,
  link: string,
  timestamp: string,
  renderedContent: string,
  statsHtml: string,
): string {
  return `<div class="index-item mb-4 rounded-lg overflow-hidden shadow-sm bg-white border border-slate-200 border-l-4 border-l-cyan-600"><a href="${link}" class="block no-underline text-inherit hover:bg-slate-50"><div class="index-item-header flex justify-between items-center px-4 py-2 bg-slate-50 text-sm"><span class="index-item-number font-semibold text-cyan-600 font-mono">#${promptNum}</span><time class="text-slate-400 text-xs font-mono" datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-item-content p-4 prose-content">${renderedContent}</div></a>${statsHtml}</div>`;
}

export function indexCommit(
  commitHash: string,
  commitMsg: string,
  timestamp: string,
  githubRepo: string | null,
): string {
  if (githubRepo) {
    const githubLink = `https://github.com/${githubRepo}/commit/${commitHash}`;
    return `<div class="index-commit mb-3 px-4 py-2.5 bg-cyan-50 border-l-4 border-cyan-600 rounded-lg shadow-sm"><a href="${githubLink}" class="block no-underline text-inherit hover:bg-cyan-100/50 -m-2.5 p-2.5 rounded-lg"><div class="index-commit-header flex justify-between items-center text-sm mb-1"><span class="index-commit-hash font-mono text-cyan-600 font-semibold">${escapeHtml(commitHash.slice(0, 7))}</span><time class="text-slate-400 text-xs font-mono" datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-commit-msg text-slate-800">${escapeHtml(commitMsg)}</div></a></div>`;
  }
  return `<div class="index-commit mb-3 px-4 py-2.5 bg-cyan-50 border-l-4 border-cyan-600 rounded-lg shadow-sm"><div class="index-commit-header flex justify-between items-center text-sm mb-1"><span class="index-commit-hash font-mono text-cyan-600 font-semibold">${escapeHtml(commitHash.slice(0, 7))}</span><time class="text-slate-400 text-xs font-mono" datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></div><div class="index-commit-msg text-slate-800">${escapeHtml(commitMsg)}</div></div>`;
}

export function indexStats(
  toolStatsStr: string,
  longTextsHtml: string,
): string {
  if (!toolStatsStr && !longTextsHtml) return "";
  const statsSpan = toolStatsStr ? `<span>${escapeHtml(toolStatsStr)}</span>` : "";
  return `<div class="index-item-stats px-4 py-2 pb-3 pl-8 text-sm text-slate-400 font-mono border-t border-slate-100">${statsSpan}${longTextsHtml}</div>`;
}

export function indexLongText(renderedContent: string): string {
  return `<div class="index-item-long-text mt-2 p-3 bg-white rounded-lg border-l-[3px] border-slate-200"><div class="truncatable"><div class="truncatable-content"><div class="index-item-long-text-content text-slate-800 prose-content">${renderedContent}</div></div><button class="${tw.expandBtn}">Show more</button></div></div>`;
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
          if (before) parts.push(`<pre class="${tw.codePre}">${escapeHtml(before)}</pre>`);
          parts.push(commitCard(match[1], match[2], ctx.githubRepo));
          lastEnd = match.index! + match[0].length;
        }
        const after = content.slice(lastEnd).trim();
        if (after) parts.push(`<pre class="${tw.codePre}">${escapeHtml(after)}</pre>`);
        return toolResult(parts.join(""), isError, false);
      }
      return toolResult(`<pre class="${tw.codePre}">${escapeHtml(content)}</pre>`, isError, false);
    }

    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          const itemType = itemObj.type as string;
          if (itemType === "text") {
            const text = (itemObj.text as string) || "";
            if (text) parts.push(`<pre class="${tw.codePre}">${escapeHtml(text)}</pre>`);
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
          parts.push(`<pre class="${tw.codePre}">${escapeHtml(String(item))}</pre>`);
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
