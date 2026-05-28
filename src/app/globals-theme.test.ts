import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGlobalsCss() {
  return readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
}

function getCssBlock(
  css: string,
  selector: string,
  options?: { matches?: (block: string) => boolean },
) {
  const rulePattern = /(^|\n)\s*([^{}]+?)\s*\{\s*([^{}]*?)\s*\}/gms;

  for (const match of css.matchAll(rulePattern)) {
    const selectorText = match[2].trim();

    if (selectorText !== selector) {
      continue;
    }

    const block = match[3].trim();

    if (!options?.matches || options.matches(block)) {
      return block;
    }
  }

  throw new Error(
    `Expected to find a CSS block for "${selector}"${options?.matches ? " matching the provided condition" : ""}.`,
  );
}

describe("globals.css warm theme contract", () => {
  test("defines warm theme tokens in :root", () => {
    const rootBlock = getCssBlock(readGlobalsCss(), ":root");

    expect(rootBlock).toContain("--bg-soft:");
    expect(rootBlock).toContain("--surface-soft:");
    expect(rootBlock).toContain("--text-strong:");
    expect(rootBlock).toContain("--accent-strong:");
    expect(rootBlock).toContain("--nav-surface:");
  });

  test("uses tokens in body/card/primary button styles", () => {
    const css = readGlobalsCss();

    expect(getCssBlock(css, "body")).toContain(
      "background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%)",
    );
    expect(getCssBlock(css, ".card")).toContain(
      "background: var(--surface-soft)",
    );
    expect(
      getCssBlock(css, ".today-screen__primary-button", {
        matches: (block) => block.includes("background:"),
      }),
    ).toContain(
      "background: var(--accent-strong)",
    );
  });

  test("declares nav token and applies it in nav block", () => {
    const rootBlock = getCssBlock(readGlobalsCss(), ":root");
    const navBlock = getCssBlock(readGlobalsCss(), ".bottom-nav");

    expect(rootBlock).toContain("--nav-surface:");
    expect(navBlock).toContain("background: var(--nav-surface)");
  });
});
