import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGlobalsCss() {
  return readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");
}

function getCssBlock(
  css: string,
  selector: string,
  options?: { matches?: (block: string) => boolean },
) {
  const rulePattern = /(^|\n)\s*([^{}]+?)\s*\{\s*([^{}]*?)\s*\}/gms;

  for (const match of css.matchAll(rulePattern)) {
    const selectors = match[2]
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!selectors.includes(selector)) {
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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getDeclarationValue(block: string, property: string) {
  const declarationPattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i");
  const match = block.match(declarationPattern);

  return match?.[1] ? normalizeWhitespace(match[1]) : undefined;
}

function expectDeclaration(
  block: string,
  property: string,
  expectedValue: string,
) {
  expect(getDeclarationValue(block, property)).toBe(
    normalizeWhitespace(expectedValue),
  );
}

const globalsCss = readGlobalsCss();
const rootBlock = getCssBlock(globalsCss, ":root");

describe("globals.css warm theme contract", () => {
  test("defines warm theme tokens in :root", () => {
    expect(rootBlock).toContain("--bg-soft:");
    expect(rootBlock).toContain("--surface-soft:");
    expect(rootBlock).toContain("--text-strong:");
    expect(rootBlock).toContain("--accent-strong:");
    expect(rootBlock).toContain("--nav-surface:");
  });

  test("uses tokens in body/card/primary button styles", () => {
    expectDeclaration(
      getCssBlock(globalsCss, "body"),
      "background",
      "linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".card"),
      "background",
      "var(--surface-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".today-screen__primary-button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-strong)",
    );
  });

  test("declares nav token and applies it in nav block", () => {
    const navBlock = getCssBlock(globalsCss, ".bottom-nav");

    expectDeclaration(navBlock, "background", "var(--nav-surface)");
  });
});
