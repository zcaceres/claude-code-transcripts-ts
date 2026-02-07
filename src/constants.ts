export const PROMPTS_PER_PAGE = 5;
export const LONG_TEXT_THRESHOLD = 300;

/** Regex to match git commit output: [branch hash] message */
export const COMMIT_PATTERN = /\[[\w\-/]+ ([a-f0-9]{7,})\] (.+?)(?:\n|$)/g;

/** Regex to detect GitHub repo from git push output */
export const GITHUB_REPO_PATTERN =
  /github\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)\/pull\/new\//;

/** API constants */
export const API_BASE_URL = "https://api.anthropic.com/v1";
export const ANTHROPIC_VERSION = "2023-06-01";

/** Tool name abbreviations for stats display */
export const TOOL_ABBREVIATIONS: Record<string, string> = {
  Bash: "bash",
  Read: "read",
  Write: "write",
  Edit: "edit",
  Glob: "glob",
  Grep: "grep",
  Task: "task",
  TodoWrite: "todo",
  WebFetch: "fetch",
  WebSearch: "search",
};

/** Residual CSS for behaviors Tailwind can't handle (keyframes, truncatable, search modal, prose) */
export const CSS = `@keyframes highlight { 0% { background-color: rgba(8, 145, 178, 0.12); } 100% { background-color: transparent; } }
.message:target { animation: highlight 2s ease-out; }
.truncatable { position: relative; }
.truncatable.truncated .truncatable-content { max-height: 200px; overflow: hidden; }
.truncatable.truncated::after { content: ''; position: absolute; bottom: 32px; left: 0; right: 0; height: 60px; background: linear-gradient(to bottom, transparent, white); pointer-events: none; }
.message.user .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, #f8fafc); }
.message.tool-reply .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, #f8fafc); }
.tool-use .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, #f8fafc); }
.tool-result .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, white); }
.write-tool .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, #f8fafc); }
.edit-tool .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, #f8fafc); }
.index-item-long-text .truncatable.truncated::after { background: linear-gradient(to bottom, transparent, white); }
.expand-btn { display: none; }
.truncatable.truncated .expand-btn, .truncatable.expanded .expand-btn { display: block; }
#search-box { display: none; }
#search-modal::backdrop { background: rgba(0,0,0,0.5); }
#search-modal[open] { border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.2); padding: 0; width: 90vw; max-width: 900px; height: 80vh; max-height: 80vh; display: flex; flex-direction: column; }
.search-result mark { background: #a5f3fc; padding: 1px 2px; border-radius: 2px; }
.prose-content p { margin: 0 0 0.75rem 0; }
.prose-content p:last-child { margin-bottom: 0; }
.prose-content pre { margin: 0.5rem 0; }
.prose-content code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
.prose-content pre code { background: none; padding: 0; }
@media (max-width: 640px) { #search-modal[open] { width: 95vw; height: 90vh; } }`;

/** Tailwind CDN configuration */
export const TAILWIND_CONFIG = `tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
}`;

export const JS = `document.querySelectorAll('time[data-timestamp]').forEach(function(el) {
    const timestamp = el.getAttribute('data-timestamp');
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (isToday) { el.textContent = timeStr; }
    else { el.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + timeStr; }
});
document.querySelectorAll('pre.json').forEach(function(el) {
    let text = el.textContent;
    text = text.replace(/"([^"]+)":/g, '<span style="color: #ce93d8">"$1"</span>:');
    text = text.replace(/: "([^"]*)"/g, ': <span style="color: #81d4fa">"$1"</span>');
    text = text.replace(/: (\\\\d+)/g, ': <span style="color: #ffcc80">$1</span>');
    text = text.replace(/: (true|false|null)/g, ': <span style="color: #f48fb1">$1</span>');
    el.innerHTML = text;
});
document.querySelectorAll('.truncatable').forEach(function(wrapper) {
    const content = wrapper.querySelector('.truncatable-content');
    const btn = wrapper.querySelector('.expand-btn');
    if (content.scrollHeight > 250) {
        wrapper.classList.add('truncated');
        btn.addEventListener('click', function() {
            if (wrapper.classList.contains('truncated')) { wrapper.classList.remove('truncated'); wrapper.classList.add('expanded'); btn.textContent = 'Show less'; }
            else { wrapper.classList.remove('expanded'); wrapper.classList.add('truncated'); btn.textContent = 'Show more'; }
        });
    }
});`;

export const GIST_PREVIEW_JS = `(function() {
    var hostname = window.location.hostname;
    if (hostname !== 'gisthost.github.io' && hostname !== 'gistpreview.github.io') return;
    // URL format: https://gisthost.github.io/?GIST_ID/filename.html
    var match = window.location.search.match(/^\\?([^/]+)/);
    if (!match) return;
    var gistId = match[1];

    function rewriteLinks(root) {
        (root || document).querySelectorAll('a[href]').forEach(function(link) {
            var href = link.getAttribute('href');
            // Skip already-rewritten links (issue #26 fix)
            if (href.startsWith('?')) return;
            // Skip external links and anchors
            if (href.startsWith('http') || href.startsWith('#') || href.startsWith('//')) return;
            // Handle anchor in relative URL (e.g., page-001.html#msg-123)
            var parts = href.split('#');
            var filename = parts[0];
            var anchor = parts.length > 1 ? '#' + parts[1] : '';
            link.setAttribute('href', '?' + gistId + '/' + filename + anchor);
        });
    }

    // Run immediately
    rewriteLinks();

    // Also run on DOMContentLoaded in case DOM isn't ready yet
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { rewriteLinks(); });
    }

    // Use MutationObserver to catch dynamically added content
    // gistpreview.github.io may add content after initial load
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    rewriteLinks(node);
                    // Also check if the node itself is a link
                    if (node.tagName === 'A' && node.getAttribute('href')) {
                        var href = node.getAttribute('href');
                        if (!href.startsWith('?') && !href.startsWith('http') &&
                            !href.startsWith('#') && !href.startsWith('//')) {
                            var parts = href.split('#');
                            var filename = parts[0];
                            var anchor = parts.length > 1 ? '#' + parts[1] : '';
                            node.setAttribute('href', '?' + gistId + '/' + filename + anchor);
                        }
                    }
                }
            });
        });
    });

    // Start observing once body exists
    function startObserving() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(startObserving, 10);
        }
    }
    startObserving();

    // Handle fragment navigation after dynamic content loads
    // gisthost.github.io/gistpreview.github.io loads content dynamically, so the browser's
    // native fragment navigation fails because the element doesn't exist yet
    function scrollToFragment() {
        var hash = window.location.hash;
        if (!hash) return false;
        var targetId = hash.substring(1);
        var target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
        }
        return false;
    }

    // Try immediately in case content is already loaded
    if (!scrollToFragment()) {
        // Retry with increasing delays to handle dynamic content loading
        var delays = [100, 300, 500, 1000, 2000];
        delays.forEach(function(delay) {
            setTimeout(scrollToFragment, delay);
        });
    }
})();`;

export const SEARCH_JS = (totalPages: number) => `(function() {
    var totalPages = ${totalPages};
    var searchBox = document.getElementById('search-box');
    var searchInput = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var modal = document.getElementById('search-modal');
    var modalInput = document.getElementById('modal-search-input');
    var modalSearchBtn = document.getElementById('modal-search-btn');
    var modalCloseBtn = document.getElementById('modal-close-btn');
    var searchStatus = document.getElementById('search-status');
    var searchResults = document.getElementById('search-results');

    if (!searchBox || !modal) return;

    // Hide search on file:// protocol (doesn't work due to CORS restrictions)
    if (window.location.protocol === 'file:') return;

    // Show search box (progressive enhancement)
    searchBox.style.display = 'flex';

    // Gist preview support - detect if we're on gisthost.github.io or gistpreview.github.io
    var hostname = window.location.hostname;
    var isGistPreview = hostname === 'gisthost.github.io' || hostname === 'gistpreview.github.io';
    var gistId = null;
    var gistOwner = null;
    var gistInfoLoaded = false;

    if (isGistPreview) {
        var queryMatch = window.location.search.match(/^\\?([a-f0-9]+)/i);
        if (queryMatch) {
            gistId = queryMatch[1];
        }
    }

    async function loadGistInfo() {
        if (!isGistPreview || !gistId || gistInfoLoaded) return;
        try {
            var response = await fetch('https://api.github.com/gists/' + gistId);
            if (response.ok) {
                var info = await response.json();
                gistOwner = info.owner.login;
                gistInfoLoaded = true;
            }
        } catch (e) {
            console.error('Failed to load gist info:', e);
        }
    }

    function getPageFetchUrl(pageFile) {
        if (isGistPreview && gistOwner && gistId) {
            return 'https://gist.githubusercontent.com/' + gistOwner + '/' + gistId + '/raw/' + pageFile;
        }
        return pageFile;
    }

    function getPageLinkUrl(pageFile) {
        if (isGistPreview && gistId) {
            return '?' + gistId + '/' + pageFile;
        }
        return pageFile;
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    }

    function openModal(query) {
        modalInput.value = query || '';
        searchResults.innerHTML = '';
        searchStatus.textContent = '';
        modal.showModal();
        modalInput.focus();
        if (query) {
            performSearch(query);
        }
    }

    function closeModal() {
        modal.close();
        if (window.location.hash.startsWith('#search=')) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    function updateUrlHash(query) {
        if (query) {
            history.replaceState(null, '', window.location.pathname + window.location.search + '#search=' + encodeURIComponent(query));
        }
    }

    function highlightTextNodes(element, searchTerm) {
        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        var nodesToReplace = [];

        while (walker.nextNode()) {
            var node = walker.currentNode;
            if (node.nodeValue.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
                nodesToReplace.push(node);
            }
        }

        nodesToReplace.forEach(function(node) {
            var text = node.nodeValue;
            var regex = new RegExp('(' + escapeRegex(searchTerm) + ')', 'gi');
            var parts = text.split(regex);
            if (parts.length > 1) {
                var span = document.createElement('span');
                parts.forEach(function(part) {
                    if (part.toLowerCase() === searchTerm.toLowerCase()) {
                        var mark = document.createElement('mark');
                        mark.textContent = part;
                        span.appendChild(mark);
                    } else {
                        span.appendChild(document.createTextNode(part));
                    }
                });
                node.parentNode.replaceChild(span, node);
            }
        });
    }

    function fixInternalLinks(element, pageFile) {
        var links = element.querySelectorAll('a[href^="#"]');
        links.forEach(function(link) {
            var href = link.getAttribute('href');
            link.setAttribute('href', pageFile + href);
        });
    }

    function processPage(pageFile, html, query) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var resultsFromPage = 0;

        var messages = doc.querySelectorAll('.message');
        messages.forEach(function(msg) {
            var text = msg.textContent || '';
            if (text.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                resultsFromPage++;

                var msgId = msg.id || '';
                var pageLinkUrl = getPageLinkUrl(pageFile);
                var link = pageLinkUrl + (msgId ? '#' + msgId : '');

                var clone = msg.cloneNode(true);
                fixInternalLinks(clone, pageLinkUrl);
                highlightTextNodes(clone, query);

                var resultDiv = document.createElement('div');
                resultDiv.className = 'search-result rounded-lg overflow-hidden shadow-sm mb-4 border border-slate-200';
                resultDiv.innerHTML = '<a href="' + link + '" class="block no-underline text-inherit hover:bg-slate-50">' +
                    '<div class="search-result-page px-3 py-1.5 bg-slate-50 text-xs text-slate-500 font-mono border-b border-slate-200">' + escapeHtml(pageFile) + '</div>' +
                    '<div class="search-result-content p-3">' + clone.innerHTML + '</div>' +
                    '</a>';
                searchResults.appendChild(resultDiv);
            }
        });

        return resultsFromPage;
    }

    async function performSearch(query) {
        if (!query.trim()) {
            searchStatus.textContent = 'Enter a search term';
            return;
        }

        updateUrlHash(query);
        searchResults.innerHTML = '';
        searchStatus.textContent = 'Searching...';

        if (isGistPreview && !gistInfoLoaded) {
            searchStatus.textContent = 'Loading gist info...';
            await loadGistInfo();
            if (!gistOwner) {
                searchStatus.textContent = 'Failed to load gist info. Search unavailable.';
                return;
            }
        }

        var resultsFound = 0;
        var pagesSearched = 0;

        var pagesToFetch = [];
        for (var i = 1; i <= totalPages; i++) {
            pagesToFetch.push('page-' + String(i).padStart(3, '0') + '.html');
        }

        searchStatus.textContent = 'Searching...';

        var batchSize = 3;
        for (var i = 0; i < pagesToFetch.length; i += batchSize) {
            var batch = pagesToFetch.slice(i, i + batchSize);

            var promises = batch.map(function(pageFile) {
                return fetch(getPageFetchUrl(pageFile))
                    .then(function(response) {
                        if (!response.ok) throw new Error('Failed to fetch');
                        return response.text();
                    })
                    .then(function(html) {
                        var count = processPage(pageFile, html, query);
                        resultsFound += count;
                        pagesSearched++;
                        searchStatus.textContent = 'Found ' + resultsFound + ' result(s) in ' + pagesSearched + '/' + totalPages + ' pages...';
                    })
                    .catch(function() {
                        pagesSearched++;
                        searchStatus.textContent = 'Found ' + resultsFound + ' result(s) in ' + pagesSearched + '/' + totalPages + ' pages...';
                    });
            });

            await Promise.all(promises);
        }

        searchStatus.textContent = 'Found ' + resultsFound + ' result(s) in ' + totalPages + ' pages';
    }

    searchBtn.addEventListener('click', function() {
        openModal(searchInput.value);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            openModal(searchInput.value);
        }
    });

    modalSearchBtn.addEventListener('click', function() {
        performSearch(modalInput.value);
    });

    modalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            performSearch(modalInput.value);
        }
    });

    modalCloseBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    if (window.location.hash.startsWith('#search=')) {
        var query = decodeURIComponent(window.location.hash.substring(8));
        if (query) {
            searchInput.value = query;
            openModal(query);
        }
    }
})();`;
