import { CSS, JS, SEARCH_JS, TAILWIND_CONFIG } from "./constants.js";
import { escapeHtml } from "./render.js";

function basePage(title: string, contentHtml: string, extraScript = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300..700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>${TAILWIND_CONFIG}</script>
    <style>${CSS}</style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">
    <div class="max-w-3xl mx-auto px-4 py-6">
${contentHtml}
    </div>
    <script>${JS}</script>${extraScript}
</body>
</html>`;
}

/** Generate pagination HTML for regular pages */
export function pagination(currentPage: number, totalPages: number): string {
  if (totalPages <= 1) {
    return `<div class="pagination flex justify-center gap-2 my-6 flex-wrap"><a href="index.html" class="index-link px-3 py-1 rounded-full text-sm no-underline bg-cyan-600 text-white">Index</a></div>`;
  }

  const parts: string[] = [];
  parts.push(`<div class="pagination flex justify-center gap-2 my-6 flex-wrap">`);
  parts.push(`<a href="index.html" class="index-link px-3 py-1 rounded-full text-sm no-underline bg-cyan-600 text-white">Index</a>`);

  if (currentPage > 1) {
    parts.push(
      `<a href="page-${String(currentPage - 1).padStart(3, "0")}.html" class="px-3 py-1 rounded-full text-sm no-underline bg-white text-cyan-600 border border-slate-300 hover:border-cyan-600 hover:bg-cyan-50">&larr; Prev</a>`,
    );
  } else {
    parts.push(`<span class="disabled px-3 py-1 rounded-full text-sm text-slate-400 border border-slate-200">&larr; Prev</span>`);
  }

  for (let page = 1; page <= totalPages; page++) {
    if (page === currentPage) {
      parts.push(`<span class="current px-3 py-1 rounded-full text-sm bg-cyan-600 text-white">${page}</span>`);
    } else {
      parts.push(
        `<a href="page-${String(page).padStart(3, "0")}.html" class="px-3 py-1 rounded-full text-sm no-underline bg-white text-cyan-600 border border-slate-300 hover:border-cyan-600 hover:bg-cyan-50">${page}</a>`,
      );
    }
  }

  if (currentPage < totalPages) {
    parts.push(
      `<a href="page-${String(currentPage + 1).padStart(3, "0")}.html" class="px-3 py-1 rounded-full text-sm no-underline bg-white text-cyan-600 border border-slate-300 hover:border-cyan-600 hover:bg-cyan-50">Next &rarr;</a>`,
    );
  } else {
    parts.push(`<span class="disabled px-3 py-1 rounded-full text-sm text-slate-400 border border-slate-200">Next &rarr;</span>`);
  }

  parts.push(`</div>`);
  return parts.join("\n");
}

/** Generate pagination for index page */
export function indexPagination(totalPages: number): string {
  if (totalPages < 1) {
    return `<div class="pagination flex justify-center gap-2 my-6 flex-wrap"><span class="current px-3 py-1 rounded-full text-sm bg-cyan-600 text-white">Index</span></div>`;
  }

  const parts: string[] = [];
  parts.push(`<div class="pagination flex justify-center gap-2 my-6 flex-wrap">`);
  parts.push(`<span class="current px-3 py-1 rounded-full text-sm bg-cyan-600 text-white">Index</span>`);
  parts.push(`<span class="disabled px-3 py-1 rounded-full text-sm text-slate-400 border border-slate-200">&larr; Prev</span>`);

  for (let page = 1; page <= totalPages; page++) {
    parts.push(
      `<a href="page-${String(page).padStart(3, "0")}.html" class="px-3 py-1 rounded-full text-sm no-underline bg-white text-cyan-600 border border-slate-300 hover:border-cyan-600 hover:bg-cyan-50">${page}</a>`,
    );
  }

  if (totalPages >= 1) {
    parts.push(`<a href="page-001.html" class="px-3 py-1 rounded-full text-sm no-underline bg-white text-cyan-600 border border-slate-300 hover:border-cyan-600 hover:bg-cyan-50">Next &rarr;</a>`);
  } else {
    parts.push(`<span class="disabled px-3 py-1 rounded-full text-sm text-slate-400 border border-slate-200">Next &rarr;</span>`);
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
  const content = `        <h1 class="text-xl font-semibold mb-6 pb-2 border-b border-slate-200"><a href="index.html" class="text-inherit no-underline">Claude Code transcript</a> <span class="text-slate-400 font-normal font-mono text-sm">page ${pageNum}/${totalPages}</span></h1>
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
  const content = `        <div class="header-row flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-2 mb-6">
            <h1 class="text-xl font-semibold m-0 flex-1 min-w-[200px]">Claude Code transcript</h1>
            <div id="search-box" class="items-center gap-2">
                <input type="text" id="search-input" placeholder="Search..." aria-label="Search transcripts" class="px-3 py-1.5 border border-slate-300 rounded-lg text-base w-44 font-mono text-sm">
                <button id="search-btn" type="button" aria-label="Search" class="bg-cyan-600 text-white border-none rounded-lg px-2.5 py-1.5 cursor-pointer flex items-center justify-center hover:bg-cyan-700">
                    ${SEARCH_ICON_SVG}
                </button>
            </div>
        </div>
        ${paginationHtml}
        <p class="text-slate-500 mb-6 text-sm font-mono">${promptNum} prompts \u00B7 ${totalMessages} messages \u00B7 ${totalToolCalls} tool calls \u00B7 ${totalCommits} commits \u00B7 ${totalPages} pages</p>
        ${indexItemsHtml}
        ${paginationHtml}

        <dialog id="search-modal">
            <div class="search-modal-header flex items-center gap-2 p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <input type="text" id="modal-search-input" placeholder="Search..." aria-label="Search transcripts" class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-base font-mono text-sm">
                <button id="modal-search-btn" type="button" aria-label="Search" class="bg-cyan-600 text-white border-none rounded-lg px-2.5 py-1.5 cursor-pointer flex items-center justify-center hover:bg-cyan-700">
                    ${SEARCH_ICON_SVG}
                </button>
                <button id="modal-close-btn" type="button" aria-label="Close" class="bg-slate-500 text-white border-none rounded-lg px-2.5 py-1.5 cursor-pointer flex items-center justify-center ml-2 hover:bg-slate-600">
                    ${CLOSE_ICON_SVG}
                </button>
            </div>
            <div id="search-status" class="px-4 py-2 text-sm text-slate-500 border-b border-slate-100"></div>
            <div id="search-results" class="flex-1 overflow-y-auto p-4"></div>
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
      return `        <div class="index-item mb-4 rounded-lg overflow-hidden shadow-sm bg-white border border-slate-200 border-l-4 border-l-cyan-600">
            <a href="${escapeHtml(s.name)}/index.html" class="block no-underline text-inherit hover:bg-slate-50">
                <div class="index-item-header flex justify-between items-center px-4 py-2 bg-slate-50 text-sm">
                    <span class="index-item-number font-semibold text-cyan-600 font-mono text-xs">${escapeHtml(s.date)}</span>
                    <span class="text-slate-400 font-mono text-xs">${Math.floor(s.size_kb)} KB</span>
                </div>
                <div class="index-item-content p-4">
                    <p class="m-0">${escapeHtml(truncatedSummary)}</p>
                </div>
            </a>
        </div>`;
    })
    .join("\n");

  const content = `        <h1 class="text-xl font-semibold mb-6 pb-2 border-b border-slate-200"><a href="../index.html" class="text-inherit no-underline">Claude Code Archive</a> <span class="text-slate-400 font-normal font-mono text-sm">/ ${escapeHtml(projectName)}</span></h1>
        <p class="text-slate-500 mb-6 text-sm font-mono">${sessionCount} session${pluralS}</p>

${sessionItems}

        <div class="mt-6">
            <a href="../index.html" class="inline-block px-4 py-2 bg-cyan-600 text-white no-underline rounded-lg hover:bg-cyan-700">Back to Archive</a>
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
      return `        <div class="index-item mb-4 rounded-lg overflow-hidden shadow-sm bg-white border border-slate-200 border-l-4 border-l-cyan-600">
            <a href="${escapeHtml(p.name)}/index.html" class="block no-underline text-inherit hover:bg-slate-50">
                <div class="index-item-header flex justify-between items-center px-4 py-2 bg-slate-50 text-sm">
                    <span class="index-item-number font-semibold text-cyan-600 font-mono">${escapeHtml(p.name)}</span>
                    <time class="text-slate-400 text-xs font-mono">${escapeHtml(p.recent_date)}</time>
                </div>
                <div class="index-item-content p-4">
                    <p class="m-0">${p.session_count} session${pluralS}</p>
                </div>
            </a>
        </div>`;
    })
    .join("\n");

  const content = `        <h1 class="text-xl font-semibold mb-6 pb-2 border-b border-slate-200">Claude Code Archive</h1>
        <p class="text-slate-500 mb-6 text-sm font-mono">${totalProjects} projects \u00B7 ${totalSessions} sessions</p>

${projectItems}`;

  return basePage("Claude Code Archive", content);
}
