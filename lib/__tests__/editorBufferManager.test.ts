import { describe, it, expect, beforeEach } from "vitest";
import { EditorBufferManager, type TextBuffer } from "../editorBufferManager";

/** Simple mutable string buffer for testing. */
function createBuffer(initial = ""): TextBuffer {
  let content = initial;
  return {
    get: () => content,
    set: (c: string) => {
      content = c;
    },
  };
}

describe("EditorBufferManager", () => {
  let buffer: TextBuffer;
  let mgr: EditorBufferManager;

  beforeEach(() => {
    buffer = createBuffer("initial content of A");
    mgr = new EditorBufferManager(buffer, "/projects/1/a.tex");
  });

  // ─── Basic switching ───────────────────────────────────────────────

  it("saves active content to cache when switching files", () => {
    mgr.switchTo("/projects/1/b.tex", "content of B");

    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe(
      "initial content of A"
    );
    expect(mgr.getActivePath()).toBe("/projects/1/b.tex");
    expect(mgr.getBufferContent()).toBe("content of B");
  });

  it("restores content when switching back", () => {
    mgr.switchTo("/projects/1/b.tex", "content of B");
    // Now switch back to A using cached content
    const cachedA = mgr.getCachedContent("/projects/1/a.tex")!;
    mgr.switchTo("/projects/1/a.tex", cachedA);

    expect(mgr.getBufferContent()).toBe("initial content of A");
    expect(mgr.getCachedContent("/projects/1/b.tex")).toBe("content of B");
  });

  // ─── The overwrite bug ────────────────────────────────────────────

  it("does NOT overwrite file A with file B's content when switching A→B→A", () => {
    // A is active with "initial content of A"
    mgr.switchTo("/projects/1/b.tex", "content of B");

    // B is now active. Cache should have A's original content.
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe(
      "initial content of A"
    );

    // Switch back to A
    const cachedA = mgr.getCachedContent("/projects/1/a.tex")!;
    mgr.switchTo("/projects/1/a.tex", cachedA);

    // A should have its own content, not B's
    expect(mgr.getBufferContent()).toBe("initial content of A");
    // B should still have its content in cache
    expect(mgr.getCachedContent("/projects/1/b.tex")).toBe("content of B");
  });

  it("does NOT overwrite file A when rapidly switching A→B→C", () => {
    // A is active
    mgr.switchTo("/projects/1/b.tex", "content of B");
    // B is active
    mgr.switchTo("/projects/1/c.tex", "content of C");

    // All three should be intact
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe(
      "initial content of A"
    );
    expect(mgr.getCachedContent("/projects/1/b.tex")).toBe("content of B");
    expect(mgr.getBufferContent()).toBe("content of C");
    expect(mgr.getActivePath()).toBe("/projects/1/c.tex");
  });

  it("preserves all files when cycling through A→B→C→A", () => {
    mgr.switchTo("/projects/1/b.tex", "content of B");
    mgr.switchTo("/projects/1/c.tex", "content of C");

    const cachedA = mgr.getCachedContent("/projects/1/a.tex")!;
    mgr.switchTo("/projects/1/a.tex", cachedA);

    expect(mgr.getBufferContent()).toBe("initial content of A");
    expect(mgr.getCachedContent("/projects/1/b.tex")).toBe("content of B");
    expect(mgr.getCachedContent("/projects/1/c.tex")).toBe("content of C");
  });

  // ─── Editing between switches ─────────────────────────────────────

  it("saves edits made to a file before switching away", () => {
    // Edit A
    buffer.set("edited content of A");
    mgr.switchTo("/projects/1/b.tex", "content of B");

    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe(
      "edited content of A"
    );
  });

  it("does not lose edits when switching back and forth", () => {
    // Edit A, switch to B
    buffer.set("A v2");
    mgr.switchTo("/projects/1/b.tex", "B v1");

    // Edit B, switch back to A
    buffer.set("B v2");
    const cachedA = mgr.getCachedContent("/projects/1/a.tex")!;
    mgr.switchTo("/projects/1/a.tex", cachedA);

    expect(mgr.getBufferContent()).toBe("A v2");
    expect(mgr.getCachedContent("/projects/1/b.tex")).toBe("B v2");

    // Switch to B again
    const cachedB = mgr.getCachedContent("/projects/1/b.tex")!;
    mgr.switchTo("/projects/1/b.tex", cachedB);

    expect(mgr.getBufferContent()).toBe("B v2");
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("A v2");
  });

  // ─── Switching to same file (no-op) ──────────────────────────────

  it("switching to the already-active file preserves content", () => {
    buffer.set("modified A");
    // "Re-select" the same file
    mgr.switchTo("/projects/1/a.tex", "modified A");

    expect(mgr.getBufferContent()).toBe("modified A");
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("modified A");
  });

  // ─── Image tabs ───────────────────────────────────────────────────

  it("saves text content when switching to an image tab", () => {
    buffer.set("text content");
    mgr.switchToImage("/projects/1/photo.png");

    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("text content");
    expect(mgr.getActivePath()).toBe("/projects/1/photo.png");
  });

  it("does not cache image paths", () => {
    mgr.switchToImage("/projects/1/photo.png");
    mgr.saveActiveToCache();

    // Image path should not be in cache
    expect(mgr.getCachedContent("/projects/1/photo.png")).toBeUndefined();
  });

  // ─── PDF / binary files ───────────────────────────────────────────

  it("does not cache PDF paths (treated as binary)", () => {
    mgr.switchToImage("/projects/1/output.pdf");
    mgr.saveActiveToCache();

    expect(mgr.getCachedContent("/projects/1/output.pdf")).toBeUndefined();
  });

  it("preserves text content when switching to a PDF then back", () => {
    buffer.set("my latex source");
    mgr.switchToImage("/projects/1/output.pdf");

    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("my latex source");

    const cachedA = mgr.getCachedContent("/projects/1/a.tex")!;
    mgr.switchTo("/projects/1/a.tex", cachedA);

    expect(mgr.getBufferContent()).toBe("my latex source");
  });

  it("does not cache font or archive files", () => {
    mgr.switchToImage("/projects/1/font.woff2");
    mgr.saveActiveToCache();
    expect(mgr.getCachedContent("/projects/1/font.woff2")).toBeUndefined();

    mgr.switchToImage("/projects/1/archive.zip");
    mgr.saveActiveToCache();
    expect(mgr.getCachedContent("/projects/1/archive.zip")).toBeUndefined();
  });

  it("preserves text content after image→text switch", () => {
    buffer.set("my tex");
    mgr.switchToImage("/projects/1/photo.png");
    mgr.switchTo("/projects/1/b.tex", "content of B");

    // A's content should still be intact (saved when switching to image)
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("my tex");
  });

  // ─── saveActiveToCache idempotency ────────────────────────────────

  it("saveActiveToCache can be called multiple times safely", () => {
    buffer.set("v1");
    mgr.saveActiveToCache();
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("v1");

    buffer.set("v2");
    mgr.saveActiveToCache();
    expect(mgr.getCachedContent("/projects/1/a.tex")).toBe("v2");
  });

  // ─── Many files stress test ───────────────────────────────────────

  it("handles 10 files without data corruption", () => {
    const paths = Array.from({ length: 10 }, (_, i) => `/projects/1/file${i}.tex`);
    const contents = paths.map((_, i) => `content of file ${i}`);

    // Start with file0 content in buffer
    buffer.set(contents[0]);
    mgr = new EditorBufferManager(buffer, paths[0]);

    // Open all files sequentially
    for (let i = 1; i < 10; i++) {
      mgr.switchTo(paths[i], contents[i]);
    }

    // Verify all cached contents
    for (let i = 0; i < 9; i++) {
      expect(mgr.getCachedContent(paths[i])).toBe(contents[i]);
    }
    // Active file (last one) should be in buffer
    expect(mgr.getBufferContent()).toBe(contents[9]);

    // Switch back to file 0
    mgr.switchTo(paths[0], mgr.getCachedContent(paths[0])!);
    expect(mgr.getBufferContent()).toBe(contents[0]);

    // file 9 should now be cached
    expect(mgr.getCachedContent(paths[9])).toBe(contents[9]);
  });
});
