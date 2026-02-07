import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type {
  Conversation,
  RenderContext,
  SessionData,
  SessionDisplayData,
  ProjectDisplayData,
  ProjectInfo,
} from "./types.js";
import { PROMPTS_PER_PAGE } from "./constants.js";
import { parseSessionFile, extractTextFromContent } from "./parse.js";
import { detectGithubRepo } from "./github.js";
import {
  renderMessage,
  renderMarkdownText,
  makeMsgId,
  indexItem,
  indexCommit,
  indexStats,
  indexLongText,
} from "./render.js";
import { analyzeConversation, formatToolStats } from "./analyze.js";
import {
  pagination,
  indexPagination,
  pageTemplate,
  indexTemplate,
  projectIndexTemplate,
  masterIndexTemplate,
} from "./templates.js";

/** Build conversations from loglines */
function buildConversations(
  data: SessionData,
): Conversation[] {
  const conversations: Conversation[] = [];
  let currentConv: Conversation | null = null;

  for (const entry of data.loglines) {
    const logType = entry.type;
    const timestamp = entry.timestamp || "";
    const isCompactSummary = entry.isCompactSummary || false;
    const messageData = entry.message;
    if (!messageData) continue;

    const messageJson = JSON.stringify(messageData);
    let isUserPrompt = false;
    let userText: string | null = null;

    if (logType === "user") {
      const text = extractTextFromContent(messageData.content);
      if (text) {
        isUserPrompt = true;
        userText = text;
      }
    }

    if (isUserPrompt) {
      if (currentConv) {
        conversations.push(currentConv);
      }
      currentConv = {
        user_text: userText!,
        timestamp,
        messages: [[logType, messageJson, timestamp]],
        is_continuation: Boolean(isCompactSummary),
      };
    } else if (currentConv) {
      currentConv.messages.push([logType, messageJson, timestamp]);
    }
  }

  if (currentConv) {
    conversations.push(currentConv);
  }

  return conversations;
}

/** Main function: generate HTML from a session file */
export async function generateHtml(
  jsonPath: string,
  outputDir: string,
  githubRepo: string | null = null,
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  const data = await parseSessionFile(jsonPath);
  const loglines = data.loglines;

  // Auto-detect GitHub repo if not provided
  if (githubRepo === null) {
    githubRepo = detectGithubRepo(loglines);
  }

  const ctx: RenderContext = { githubRepo };
  const conversations = buildConversations(data);
  const totalConvs = conversations.length;
  const totalPages = Math.ceil(totalConvs / PROMPTS_PER_PAGE) || 1;

  // Generate page files
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIdx = (pageNum - 1) * PROMPTS_PER_PAGE;
    const endIdx = Math.min(startIdx + PROMPTS_PER_PAGE, totalConvs);
    const pageConvs = conversations.slice(startIdx, endIdx);

    const messagesHtml: string[] = [];
    for (const conv of pageConvs) {
      let isFirst = true;
      for (const [logType, messageJson, timestamp] of conv.messages) {
        let msgHtml = renderMessage(logType, messageJson, timestamp, ctx);
        if (msgHtml) {
          if (isFirst && conv.is_continuation) {
            msgHtml = `<details class="continuation"><summary>Session continuation summary</summary>${msgHtml}</details>`;
          }
          messagesHtml.push(msgHtml);
        }
        isFirst = false;
      }
    }

    const paginationHtml = pagination(pageNum, totalPages);
    const pageContent = pageTemplate(
      pageNum,
      totalPages,
      paginationHtml,
      messagesHtml.join(""),
    );

    await Bun.write(
      join(outputDir, `page-${String(pageNum).padStart(3, "0")}.html`),
      pageContent,
    );
  }

  // Calculate overall stats and collect commits for timeline
  const totalToolCounts: Record<string, number> = {};
  let totalMessages = 0;
  const allCommits: Array<[string, string, string, number, number]> = [];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    totalMessages += conv.messages.length;
    const stats = analyzeConversation(conv.messages);
    for (const [tool, count] of Object.entries(stats.tool_counts)) {
      totalToolCounts[tool] = (totalToolCounts[tool] || 0) + count;
    }
    const pageNum = Math.floor(i / PROMPTS_PER_PAGE) + 1;
    for (const [commitHash, commitMsg, commitTs] of stats.commits) {
      allCommits.push([commitTs, commitHash, commitMsg, pageNum, i]);
    }
  }

  const totalToolCalls = Object.values(totalToolCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const totalCommitCount = allCommits.length;

  // Build timeline items
  const timelineItems: Array<[string, string, string]> = [];

  // Add prompts
  let promptNum = 0;
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    if (conv.is_continuation) continue;
    if (conv.user_text.startsWith("Stop hook feedback:")) continue;

    promptNum++;
    const pageNum = Math.floor(i / PROMPTS_PER_PAGE) + 1;
    const msgId = makeMsgId(conv.timestamp);
    const link = `page-${String(pageNum).padStart(3, "0")}.html#${msgId}`;
    const renderedContent = renderMarkdownText(conv.user_text);

    // Collect all messages including from subsequent continuation conversations
    const allMessages = [...conv.messages];
    for (let j = i + 1; j < conversations.length; j++) {
      if (!conversations[j].is_continuation) break;
      allMessages.push(...conversations[j].messages);
    }

    const stats = analyzeConversation(allMessages);
    const toolStatsStr = formatToolStats(stats.tool_counts);

    let longTextsHtml = "";
    for (const lt of stats.long_texts) {
      longTextsHtml += indexLongText(renderMarkdownText(lt));
    }

    const statsHtml = indexStats(toolStatsStr, longTextsHtml);
    const itemHtml = indexItem(
      promptNum,
      link,
      conv.timestamp,
      renderedContent,
      statsHtml,
    );
    timelineItems.push([conv.timestamp, "prompt", itemHtml]);
  }

  // Add commits
  for (const [commitTs, commitHash, commitMsg] of allCommits) {
    const itemHtml = indexCommit(commitHash, commitMsg, commitTs, githubRepo);
    timelineItems.push([commitTs, "commit", itemHtml]);
  }

  // Sort by timestamp
  timelineItems.sort((a, b) => a[0].localeCompare(b[0]));
  const indexItemsHtml = timelineItems.map((item) => item[2]).join("");

  const indexPaginationHtml = indexPagination(totalPages);
  const indexContent = indexTemplate(
    indexPaginationHtml,
    promptNum,
    totalMessages,
    totalToolCalls,
    totalCommitCount,
    totalPages,
    indexItemsHtml,
  );

  await Bun.write(join(outputDir, "index.html"), indexContent);
}

/** Generate project index page */
export async function generateProjectIndex(
  project: ProjectInfo,
  outputDir: string,
): Promise<void> {
  const sessionsData: SessionDisplayData[] = project.sessions.map((session) => {
    const modDate = new Date(session.mtime * 1000);
    const dateStr = `${modDate.getFullYear()}-${String(modDate.getMonth() + 1).padStart(2, "0")}-${String(modDate.getDate()).padStart(2, "0")} ${String(modDate.getHours()).padStart(2, "0")}:${String(modDate.getMinutes()).padStart(2, "0")}`;
    return {
      name: basename(session.path, ".jsonl"),
      summary: session.summary,
      date: dateStr,
      size_kb: session.size / 1024,
    };
  });

  const htmlContent = projectIndexTemplate(project.name, sessionsData);
  await Bun.write(join(outputDir, "index.html"), htmlContent);
}

/** Generate master index page */
export async function generateMasterIndex(
  projects: ProjectInfo[],
  outputDir: string,
): Promise<void> {
  let totalSessions = 0;
  const projectsData: ProjectDisplayData[] = projects.map((project) => {
    const sessionCount = project.sessions.length;
    totalSessions += sessionCount;

    let recentDate = "N/A";
    if (project.sessions.length) {
      const mostRecent = new Date(project.sessions[0].mtime * 1000);
      recentDate = `${mostRecent.getFullYear()}-${String(mostRecent.getMonth() + 1).padStart(2, "0")}-${String(mostRecent.getDate()).padStart(2, "0")}`;
    }

    return {
      name: project.name,
      session_count: sessionCount,
      recent_date: recentDate,
    };
  });

  const htmlContent = masterIndexTemplate(
    projectsData,
    projects.length,
    totalSessions,
  );
  await Bun.write(join(outputDir, "index.html"), htmlContent);
}
