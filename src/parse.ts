import type { SessionData, LogEntry } from "./types.js";

/** Extract plain text from message content (handles both string and array formats) */
export function extractTextFromContent(
  content: unknown,
): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        (block as Record<string, unknown>).type === "text"
      ) {
        const text = (block as Record<string, unknown>).text as string;
        if (text) texts.push(text);
      }
    }
    return texts.join(" ").trim();
  }
  return "";
}

/** Parse a JSONL file and convert to standard format */
export function parseJsonlContent(content: string): SessionData {
  const loglines: LogEntry[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const entryType = obj.type;

      // Skip non-message entries
      if (entryType !== "user" && entryType !== "assistant") continue;

      const entry: LogEntry = {
        type: entryType,
        timestamp: obj.timestamp || "",
        message: obj.message || {},
      };

      if (obj.isCompactSummary) {
        entry.isCompactSummary = true;
      }

      loglines.push(entry);
    } catch {
      continue;
    }
  }

  return { loglines };
}

/** Parse a session file (JSON or JSONL) and return normalized data */
export async function parseSessionFile(filepath: string): Promise<SessionData> {
  const content = await Bun.file(filepath).text();

  if (filepath.endsWith(".jsonl")) {
    return parseJsonlContent(content);
  }

  // Standard JSON format
  return JSON.parse(content) as SessionData;
}
