import { describe, expect, test } from "bun:test";
import {
  detectGithubRepo,
  extractRepoFromSession,
  enrichSessionsWithRepos,
  filterSessionsByRepo,
  formatSessionForDisplay,
} from "../src/github.js";
import type { LogEntry, ApiSession } from "../src/types.js";

describe("detectGithubRepo", () => {
  test("extracts repo from git push output", () => {
    const loglines: LogEntry[] = [
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_result",
              content:
                "remote: Create a pull request for 'my-branch' on GitHub by visiting:\nremote:      https://github.com/simonw/datasette/pull/new/my-branch",
            },
          ],
        } as any,
      },
    ];
    expect(detectGithubRepo(loglines)).toBe("simonw/datasette");
  });

  test("returns null when no repo found", () => {
    const loglines: LogEntry[] = [
      {
        type: "user",
        message: { role: "user", content: "Hello" },
      },
    ];
    expect(detectGithubRepo(loglines)).toBeNull();
  });
});

describe("extractRepoFromSession", () => {
  test("extracts from outcomes", () => {
    const session: ApiSession = {
      id: "sess1",
      session_context: {
        outcomes: [
          {
            type: "git_repository",
            git_info: { repo: "simonw/llm", type: "github" },
          },
        ],
      },
    };
    expect(extractRepoFromSession(session)).toBe("simonw/llm");
  });

  test("extracts from sources URL", () => {
    const session: ApiSession = {
      id: "sess1",
      session_context: {
        sources: [
          {
            type: "git_repository",
            url: "https://github.com/simonw/datasette",
          },
        ],
      },
    };
    expect(extractRepoFromSession(session)).toBe("simonw/datasette");
  });

  test("returns null with no context", () => {
    const session: ApiSession = { id: "sess1", title: "No context" };
    expect(extractRepoFromSession(session)).toBeNull();
  });
});

describe("enrichSessionsWithRepos", () => {
  test("adds repo info to sessions", () => {
    const sessions: ApiSession[] = [
      {
        id: "sess1",
        title: "Session 1",
        created_at: "2025-01-01T10:00:00Z",
        session_context: {
          outcomes: [
            {
              type: "git_repository",
              git_info: { repo: "simonw/datasette", type: "github" },
            },
          ],
        },
      },
      {
        id: "sess2",
        title: "Session 2",
        created_at: "2025-01-02T10:00:00Z",
        session_context: {},
      },
    ];

    const enriched = enrichSessionsWithRepos(sessions);
    expect(enriched[0].repo).toBe("simonw/datasette");
    expect(enriched[1].repo).toBeNull();
  });
});

describe("filterSessionsByRepo", () => {
  test("filters by repo", () => {
    const sessions: ApiSession[] = [
      { id: "sess1", title: "Session 1", repo: "simonw/datasette" },
      { id: "sess2", title: "Session 2", repo: "simonw/llm" },
      { id: "sess3", title: "Session 3", repo: null },
    ];
    const filtered = filterSessionsByRepo(sessions, "simonw/datasette");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("sess1");
  });

  test("returns all when repo is null", () => {
    const sessions: ApiSession[] = [
      { id: "sess1", title: "Session 1", repo: "simonw/datasette" },
      { id: "sess2", title: "Session 2", repo: null },
    ];
    const filtered = filterSessionsByRepo(sessions, null);
    expect(filtered.length).toBe(2);
  });
});

describe("formatSessionForDisplay", () => {
  test("formats with repo", () => {
    const session: ApiSession = {
      id: "sess1",
      title: "Fix the bug",
      created_at: "2025-01-15T10:30:00.000Z",
      repo: "simonw/datasette",
    };
    const display = formatSessionForDisplay(session);
    expect(display.startsWith("simonw/datasette")).toBe(true);
    expect(display).toContain("2025-01-15T10:30:00");
    expect(display).toContain("Fix the bug");
  });

  test("formats without repo", () => {
    const session: ApiSession = {
      id: "sess1",
      title: "Fix the bug",
      created_at: "2025-01-15T10:30:00.000Z",
      repo: null,
    };
    const display = formatSessionForDisplay(session);
    expect(display).toContain("(no repo)");
    expect(display).toContain("Fix the bug");
  });
});
