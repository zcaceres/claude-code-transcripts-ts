import { CSS, JS, SEARCH_JS } from "./constants.js";
import { escapeHtml } from "./render.js";

function basePage(title: string, contentHtml: string, extraScript = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="container">
${contentHtml}
    </div>
    <script>${JS}</script>${extraScript}
</body>
</html>`;
}

/** Generate pagination HTML for regular pages */
export function pagination(currentPage: number, totalPages: number): string {
  if (totalPages <= 1) {
    return `<div class="pagination"><a href="index.html" class="index-link">Index</a></div>`;
  }

  const parts: string[] = [];
  parts.push(`<div class="pagination">`);
  parts.push(`<a href="index.html" class="index-link">Index</a>`);

  if (currentPage > 1) {
    parts.push(
      `<a href="page-${String(currentPage - 1).padStart(3, "0")}.html">&larr; Prev</a>`,
    );
  } else {
    parts.push(`<span class="disabled">&larr; Prev</span>`);
  }

  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) {
      parts.push(`<span class="current">${page}</span>`);
    } else {
      parts.push(
        `<a href="page-${String(page).padStart(3, "0")}.html">${page}</a>`,
      );
    }
  }

  if (currentPage < totalPages) {
    parts.push(
      `<a href="page-${String(currentPage + 1).padStart(3, "0")}.html">Next &rarr;</a>`,
    );
  } else {
    parts.push(`<span class="disabled">Next &rarr;</span>`);
  }

  parts.push(`</div>`);
  return parts.join("\n");
}

/** Generate pagination for index page */
export function indexPagination(totalPages: number): string {
  if (totalPages < 1) {
    return `<div class="pagination"><span class="current">Index</span></div>`;
  }

  const parts: string[] = [];
  parts.push(`<div class="pagination">`);
  parts.push(`<span class="current">Index</span>`);
  parts.push(`<span class="disabled">&larr; Prev</span>`);

  for (let page = 1; page <= totalPages; page++) {
    parts.push(
      `<a href="page-${String(page).padStart(3, "0")}.html">${page}</a>`,
    );
  }

  if (totalPages >= 1) {
    parts.push(`<a href="page-001.html">Next &rarr;</a>`);
  } else {
    parts.push(`<span class="disabled">Next &rarr;</span>`);
  }

  parts.push(`</div>`);
  return parts.join("\n");
}

/** Generate a page template (page-NNN.html) */
export function pageTemplate(
  pageNum: number,
  totalPages: number,
  paginationHtml: string,
  messagesHtml: string,
): string {
  const content = `        <h1><a href="index.html" style="color: inherit; text-decoration: none;">Claude Code transcript</a> - page ${pageNum}/${totalPages}</h1>
        ${paginationHtml}
        ${messagesHtml}
        ${paginationHtml}`;
  return basePage(`Claude Code transcript - page ${pageNum}`, content);
}

const SEARCH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;
const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;

/** Generate the index template */
export function indexTemplate(
  paginationHtml: string,
  promptNum: number,
  totalMessages: number,
  totalToolCalls: number,
  totalCommits: number,
  totalPages: number,
  indexItemsHtml: string,
): string {
  const searchJs = SEARCH_JS(totalPages);
  const content = `        <div class="header-row">
            <h1>Claude Code transcript</h1>
            <div id="search-box">
                <input type="text" id="search-input" placeholder="Search..." aria-label="Search transcripts">
                <button id="search-btn" type="button" aria-label="Search">
                    ${SEARCH_ICON_SVG}
                </button>
            </div>
        </div>
        ${paginationHtml}
        <p style="color: var(--text-muted); margin-bottom: 24px;">${promptNum} prompts \u00B7 ${totalMessages} messages \u00B7 ${totalToolCalls} tool calls \u00B7 ${totalCommits} commits \u00B7 ${totalPages} pages</p>
        ${indexItemsHtml}
        ${paginationHtml}

        <dialog id="search-modal">
            <div class="search-modal-header">
                <input type="text" id="modal-search-input" placeholder="Search..." aria-label="Search transcripts">
                <button id="modal-search-btn" type="button" aria-label="Search">
                    ${SEARCH_ICON_SVG}
                </button>
                <button id="modal-close-btn" type="button" aria-label="Close">
                    ${CLOSE_ICON_SVG}
                </button>
            </div>
            <div id="search-status"></div>
            <div id="search-results"></div>
        </dialog>`;

  const extraScript = `\n    <script>\n${searchJs}\n        </script>`;
  return basePage("Claude Code transcript - Index", content, extraScript);
}

/** Generate project index template */
export function projectIndexTemplate(
  projectName: string,
  sessions: Array<{ name: string; summary: string; date: string; size_kb: number }>,
): string {
  const sessionCount = sessions.length;
  const pluralS = sessionCount !== 1 ? "s" : "";

  const sessionItems = sessions
    .map((s) => {
      const truncatedSummary =
        s.summary.length > 100 ? s.summary.slice(0, 100) + "..." : s.summary;
      return `        <div class="index-item">
            <a href="${escapeHtml(s.name)}/index.html">
                <div class="index-item-header">
                    <span class="index-item-number">${escapeHtml(s.date)}</span>
                    <span style="color: var(--text-muted);">${Math.floor(s.size_kb)} KB</span>
                </div>
                <div class="index-item-content">
                    <p style="margin: 0;">${escapeHtml(truncatedSummary)}</p>
                </div>
            </a>
        </div>`;
    })
    .join("\n");

  const content = `        <h1><a href="../index.html" style="color: inherit; text-decoration: none;">Claude Code Archive</a> / ${escapeHtml(projectName)}</h1>
        <p style="color: var(--text-muted); margin-bottom: 24px;">${sessionCount} session${pluralS}</p>

${sessionItems}

        <div style="margin-top: 24px;">
            <a href="../index.html" class="pagination" style="display: inline-block; padding: 8px 16px; background: var(--user-border); color: white; text-decoration: none; border-radius: 6px;">Back to Archive</a>
        </div>`;

  return basePage(`${projectName} - Claude Code Archive`, content);
}

/** Generate master index template */
export function masterIndexTemplate(
  projects: Array<{ name: string; session_count: number; recent_date: string }>,
  totalProjects: number,
  totalSessions: number,
): string {
  const projectItems = projects
    .map((p) => {
      const pluralS = p.session_count !== 1 ? "s" : "";
      return `        <div class="index-item">
            <a href="${escapeHtml(p.name)}/index.html">
                <div class="index-item-header">
                    <span class="index-item-number">${escapeHtml(p.name)}</span>
                    <time>${escapeHtml(p.recent_date)}</time>
                </div>
                <div class="index-item-content">
                    <p style="margin: 0;">${p.session_count} session${pluralS}</p>
                </div>
            </a>
        </div>`;
    })
    .join("\n");

  const content = `        <h1>Claude Code Archive</h1>
        <p style="color: var(--text-muted); margin-bottom: 24px;">${totalProjects} projects \u00B7 ${totalSessions} sessions</p>

${projectItems}`;

  return basePage("Claude Code Archive", content);
}
