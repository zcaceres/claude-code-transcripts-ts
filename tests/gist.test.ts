import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { injectGistPreviewJs } from "../src/gist.js";
import { GIST_PREVIEW_JS } from "../src/constants.js";

describe("injectGistPreviewJs", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "gist-test-"));
  });

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  test("injects JS into HTML files", async () => {
    await writeFile(
      join(outputDir, "index.html"),
      "<html><body><h1>Test</h1></body></html>",
    );
    await writeFile(
      join(outputDir, "page-001.html"),
      "<html><body><p>Page 1</p></body></html>",
    );

    await injectGistPreviewJs(outputDir);

    const indexContent = await Bun.file(join(outputDir, "index.html")).text();
    const pageContent = await Bun.file(join(outputDir, "page-001.html")).text();

    expect(indexContent).toContain(GIST_PREVIEW_JS);
    expect(pageContent).toContain(GIST_PREVIEW_JS);
    expect(indexContent).toContain("<script>");
    expect(indexContent.endsWith("</body></html>")).toBe(true);
  });

  test("skips files without </body>", async () => {
    const originalContent = "<html><head><title>Test</title></head></html>";
    await writeFile(join(outputDir, "fragment.html"), originalContent);

    await injectGistPreviewJs(outputDir);

    const content = await Bun.file(join(outputDir, "fragment.html")).text();
    expect(content).toBe(originalContent);
  });

  test("handles empty directory", async () => {
    // Should complete without error
    await injectGistPreviewJs(outputDir);
  });
});

describe("GIST_PREVIEW_JS content", () => {
  test("handles fragment navigation", () => {
    expect(
      GIST_PREVIEW_JS.includes("location.hash") ||
        GIST_PREVIEW_JS.includes("window.location.hash"),
    ).toBe(true);
    expect(GIST_PREVIEW_JS).toContain("scrollIntoView");
  });

  test("skips already rewritten links", () => {
    expect(GIST_PREVIEW_JS).toContain("href.startsWith('?')");
  });

  test("uses MutationObserver", () => {
    expect(GIST_PREVIEW_JS).toContain("MutationObserver");
  });

  test("runs on DOMContentLoaded", () => {
    expect(GIST_PREVIEW_JS).toContain("DOMContentLoaded");
  });
});
