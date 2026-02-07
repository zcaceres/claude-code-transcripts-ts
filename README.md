# claude-code-transcripts-ts

A TypeScript/Bun port of Simon Willison's [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) — convert Claude Code session files (JSON or JSONL) to clean, mobile-friendly HTML pages with pagination.

Read Simon's original blog post for background: [A new way to extract detailed transcripts from Claude Code](https://simonwillison.net/2025/Dec/25/claude-code-transcripts/).

## Installation

Requires [Bun](https://bun.sh/).

```bash
git clone https://github.com/zcaceres/claude-code-transcripts-ts.git
cd claude-code-transcripts-ts
bun install
```

## Usage

Four commands are available:

- **`local`** (default) — interactive picker for sessions in `~/.claude/projects`
- **`json`** — convert a specific JSON/JSONL file or URL
- **`web`** — import sessions from the Claude API
- **`all`** — batch-convert all local sessions to a browsable HTML archive

### Quick start

```bash
# Interactive picker — select a session, generates HTML, opens in browser
bun run src/cli.ts

# Convert a specific file
bun run src/cli.ts json session.jsonl -o ./output

# Convert a URL
bun run src/cli.ts json https://example.com/session.jsonl
```

### Output options

All commands support:

| Flag | Description |
|------|-------------|
| `-o, --output <dir>` | Output directory (default: temp dir, opens browser) |
| `-a, --output-auto` | Auto-name output subdirectory based on session ID |
| `--repo <owner/name>` | GitHub repo for commit links (auto-detected if not specified) |
| `--open` | Open generated HTML in default browser |
| `--gist` | Upload to GitHub Gist with preview URL |
| `--json` | Include original session file in output |

### Local sessions

```bash
bun run src/cli.ts local
bun run src/cli.ts local --limit 20
```

### Web sessions

Import from the Claude API (macOS auto-retrieves credentials from keychain):

```bash
bun run src/cli.ts web
bun run src/cli.ts web SESSION_ID
bun run src/cli.ts web --repo owner/repo
```

On non-macOS platforms, provide `--token` and `--org-uuid` manually.

### Batch archive

Convert all local sessions to a browsable HTML archive:

```bash
# Preview what would be converted
bun run src/cli.ts all --dry-run

# Convert everything
bun run src/cli.ts all -o ./claude-archive --open

# Include agent sessions (excluded by default)
bun run src/cli.ts all --include-agents
```

Creates a three-level directory structure: master index, per-project indexes, and individual session transcripts.

### Publishing to GitHub Gist

```bash
bun run src/cli.ts json session.json --gist
```

Outputs a shareable preview URL via [gisthost.github.io](https://gisthost.github.io/). Requires the [GitHub CLI](https://cli.github.com/) (`gh auth login`).

## Generated output

Each session produces:

- **`index.html`** — timeline of prompts and commits with stats and full-text search
- **`page-001.html`**, **`page-002.html`**, ... — paginated transcript pages (5 prompts per page)

Content blocks rendered: user messages, assistant text, thinking blocks, tool calls (Write, Edit, Bash, TodoWrite), tool results, images, commits with GitHub links.

## Development

```bash
bun test        # 84 tests
bun run start   # run the CLI
```

### Project structure

```
src/
  types.ts        Interfaces and type definitions
  constants.ts    CSS, JS, regex patterns, configuration
  parse.ts        Session file parsing (JSON and JSONL)
  render.ts       HTML rendering functions (replaces Jinja2 macros)
  analyze.ts      Conversation analysis and tool stats
  github.ts       GitHub repo detection and session filtering
  sessions.ts     Local session discovery and project naming
  templates.ts    Page-level HTML composition and search
  generate.ts     Main HTML generation pipeline
  batch.ts        Batch processing for all sessions
  gist.ts         GitHub Gist publishing
  api.ts          Claude API integration
  cli.ts          CLI entry point (commander)
  index.ts        Public API re-exports
```

## Credits

This is a TypeScript port of [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) by [Simon Willison](https://simonwillison.net/). The original Python tool was built with Click, Jinja2, and Python-Markdown. This port uses Bun, commander, and marked.

## License

Apache 2.0, following the original project.
