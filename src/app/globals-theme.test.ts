import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGlobalsCss() {
  return readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
}

describe("globals.css warm theme contract", () => {
  test("defines warm theme tokens in :root", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--bg-soft:");
    expect(css).toContain("--surface-soft:");
    expect(css).toContain("--text-strong:");
    expect(css).toContain("--accent-strong:");
    expect(css).toContain("--nav-surface:");
  });

  test("uses tokens in body/card/primary button styles", () => {
    const css = readGlobalsCss();
    expect(css).toContain("body {");
    expect(css).toContain("background: var(--bg-soft)");
    expect(css).toContain(".card {");
    expect(css).toContain("background: var(--surface-soft)");
    expect(css).toContain(".today-screen__primary-button");
    expect(css).toContain("background: var(--accent-strong)");
  });

  test("declares nav token and applies it in nav block", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--nav-surface:");
    expect(css).toContain(".bottom-nav {");
    expect(css).toContain("background: var(--nav-surface)");
  });
});
