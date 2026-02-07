import type { ConversationStats, MessageTuple } from "./types.js";
import { COMMIT_PATTERN, LONG_TEXT_THRESHOLD, TOOL_ABBREVIATIONS } from "./constants.js";

/** Analyze messages in a conversation to extract stats and long texts */
export function analyzeConversation(messages: MessageTuple[]): ConversationStats {
  const toolCounts: Record<string, number> = {};
  const longTexts: string[] = [];
  const commits: [string, string, string][] = [];

  for (const [, messageJson, timestamp] of messages) {
    if (!messageJson) continue;
    let messageData: Record<string, unknown>;
    try {
      messageData = JSON.parse(messageJson);
    } catch {
      continue;
    }

    const content = messageData.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
      const b = block as Record<string, unknown>;
      const blockType = b.type as string;

      if (blockType === "tool_use") {
        const toolName = (b.name as string) || "Unknown";
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      } else if (blockType === "tool_result") {
        const resultContent = b.content;
        if (typeof resultContent === "string") {
          const commitPattern = new RegExp(COMMIT_PATTERN.source, "g");
          for (const match of resultContent.matchAll(commitPattern)) {
            commits.push([match[1], match[2], timestamp]);
          }
        }
      } else if (blockType === "text") {
        const text = (b.text as string) || "";
        if (text.length >= LONG_TEXT_THRESHOLD) {
          longTexts.push(text);
        }
      }
    }
  }

  return { tool_counts: toolCounts, long_texts: longTexts, commits };
}

/** Format tool counts into a concise summary string */
export function formatToolStats(toolCounts: Record<string, number>): string {
  if (!Object.keys(toolCounts).length) return "";

  const parts: string[] = [];
  const sorted = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

  for (const [name, count] of sorted) {
    const shortName = TOOL_ABBREVIATIONS[name] || name.toLowerCase();
    parts.push(`${count} ${shortName}`);
  }

  return parts.join(" \u00B7 ");
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
