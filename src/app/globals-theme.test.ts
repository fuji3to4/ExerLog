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
  const declarationPattern = new RegExp(
    `(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`,
    "ig",
  );
  const matches = [...block.matchAll(declarationPattern)];
  const match = matches.at(-1);

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

function getGlobalsCss() {
  return readGlobalsCss();
}

function getRootBlock() {
  return getCssBlock(getGlobalsCss(), ":root");
}

describe("globals.css warm theme contract", () => {
  test("defines warm theme token values in :root", () => {
    const rootBlock = getRootBlock();

    expectDeclaration(rootBlock, "--bg-top", "#fff8f4");
    expectDeclaration(rootBlock, "--bg-soft", "#f8efe8");
    expectDeclaration(rootBlock, "--surface-soft", "#fffaf6");
    expectDeclaration(rootBlock, "--text-strong", "#3b2f2a");
    expectDeclaration(rootBlock, "--accent-strong", "#9a5c49");
    expectDeclaration(rootBlock, "--nav-surface", "#fdf4ee");
    expectDeclaration(rootBlock, "--nav-text", "#5e4137");
    expectDeclaration(rootBlock, "--accent-soft", "#edd9ce");
  });

  test("uses theme tokens in body/card/primary button styles", () => {
    const globalsCss = getGlobalsCss();

    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("background:"),
      }),
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

  test("covers bottom nav colors and active state readability", () => {
    const globalsCss = getGlobalsCss();

    const navBlock = getCssBlock(globalsCss, ".bottom-nav");
    const navLinkBlock = getCssBlock(globalsCss, ".bottom-nav__link");
    const activeNavLinkBlock = getCssBlock(
      globalsCss,
      '.bottom-nav__link[aria-current="page"]',
    );

    expectDeclaration(navBlock, "background", "var(--nav-surface)");
    expectDeclaration(navLinkBlock, "color", "var(--nav-text)");
    expectDeclaration(activeNavLinkBlock, "background", "var(--accent-soft)");
    expectDeclaration(activeNavLinkBlock, "color", "var(--text-strong)");
  });
});
