// Public API re-exports

// Types
export type {
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ImageBlock,
  ToolUseBlock,
  ToolResultBlock,
  MessageData,
  LogEntry,
  SessionData,
  MessageTuple,
  Conversation,
  ConversationStats,
  RenderContext,
  SessionInfo,
  SessionDetail,
  ProjectInfo,
  BatchStats,
  FailedSession,
  ApiSession,
  TodoItem,
  SessionDisplayData,
  ProjectDisplayData,
} from "./types.js";

// Constants
export {
  PROMPTS_PER_PAGE,
  LONG_TEXT_THRESHOLD,
  COMMIT_PATTERN,
  GITHUB_REPO_PATTERN,
  CSS,
  JS,
  GIST_PREVIEW_JS,
} from "./constants.js";

// Parse
export { parseSessionFile, parseJsonlContent, extractTextFromContent } from "./parse.js";

// Render
export {
  escapeHtml,
  renderMarkdownText,
  formatJson,
  isJsonLike,
  renderTodoWrite,
  renderWriteTool,
  renderEditTool,
  renderBashTool,
  renderContentBlock,
  renderUserMessageContent,
  renderAssistantMessage,
  renderMessage,
  makeMsgId,
  isToolResultMessage,
  imageBlock,
  thinkingBlock,
  assistantText,
  userContent,
  todoList,
  writeTool,
  editTool,
  bashTool,
  toolUse,
  toolResult,
  commitCard,
  message,
  continuation,
  indexItem,
  indexCommit,
  indexStats,
  indexLongText,
} from "./render.js";

// Analyze
export {
  analyzeConversation,
  formatToolStats,
  isToolResultMessage as isToolResultMsg,
} from "./analyze.js";

// GitHub
export {
  detectGithubRepo,
  extractRepoFromSession,
  enrichSessionsWithRepos,
  filterSessionsByRepo,
  formatSessionForDisplay,
} from "./github.js";

// Sessions
export {
  getSessionSummary,
  getProjectDisplayName,
  findLocalSessions,
  findAllSessions,
} from "./sessions.js";

// Templates
export {
  pagination,
  indexPagination,
  pageTemplate,
  indexTemplate,
  projectIndexTemplate,
  masterIndexTemplate,
} from "./templates.js";

// Generate
export {
  generateHtml,
  generateProjectIndex,
  generateMasterIndex,
} from "./generate.js";

// Batch
export { generateBatchHtml } from "./batch.js";

// Gist
export { injectGistPreviewJs, createGist } from "./gist.js";

// API
export {
  getAccessTokenFromKeychain,
  getOrgUuidFromConfig,
  fetchSessions,
  fetchSession,
} from "./api.js";
