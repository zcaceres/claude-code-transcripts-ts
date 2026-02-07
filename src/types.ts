/** Content block types that appear in messages */
export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ImageSource {
  type: "base64";
  media_type: string;
  data: string;
}

export interface ImageBlock {
  type: "image";
  source: ImageSource;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id?: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ImageBlock
  | ToolUseBlock
  | ToolResultBlock;

/** Message as stored in session files */
export interface MessageData {
  role?: string;
  content: string | ContentBlock[];
}

/** A log entry in a session file */
export interface LogEntry {
  type: "user" | "assistant" | "summary";
  timestamp?: string;
  message?: MessageData;
  isCompactSummary?: boolean;
  isMeta?: boolean;
  summary?: string;
}

/** Parsed session data */
export interface SessionData {
  loglines: LogEntry[];
}

/** Tuple format used by analyzeConversation: [logType, messageJson, timestamp] */
export type MessageTuple = [string, string, string];

/** A conversation (user prompt + all following messages until next prompt) */
export interface Conversation {
  user_text: string;
  timestamp: string;
  messages: MessageTuple[];
  is_continuation: boolean;
}

/** Result of analyzeConversation */
export interface ConversationStats {
  tool_counts: Record<string, number>;
  long_texts: string[];
  commits: [string, string, string][]; // [hash, message, timestamp]
}

/** Context passed through render functions (replaces Python's global _github_repo) */
export interface RenderContext {
  githubRepo: string | null;
}

/** Session info returned by findLocalSessions */
export interface SessionInfo {
  path: string;
  summary: string;
}

/** Session info with metadata from findAllSessions */
export interface SessionDetail {
  path: string;
  summary: string;
  mtime: number;
  size: number;
}

/** Project info from findAllSessions */
export interface ProjectInfo {
  name: string;
  path: string;
  sessions: SessionDetail[];
}

/** Statistics returned by generateBatchHtml */
export interface BatchStats {
  total_projects: number;
  total_sessions: number;
  failed_sessions: FailedSession[];
  output_dir: string;
}

export interface FailedSession {
  project: string;
  session: string;
  error: string;
}

/** Session from API (web command) */
export interface ApiSession {
  id: string;
  title?: string;
  created_at?: string;
  session_context?: {
    outcomes?: Array<{
      type: string;
      git_info?: { repo?: string; type?: string };
    }>;
    sources?: Array<{
      type: string;
      url?: string;
    }>;
  };
  repo?: string | null;
  [key: string]: unknown;
}

/** Todo item in TodoWrite tool */
export interface TodoItem {
  content: string;
  status: "completed" | "in_progress" | "pending";
  activeForm?: string;
}

/** Format for session display in project index */
export interface SessionDisplayData {
  name: string;
  summary: string;
  date: string;
  size_kb: number;
}

/** Format for project display in master index */
export interface ProjectDisplayData {
  name: string;
  session_count: number;
  recent_date: string;
}
