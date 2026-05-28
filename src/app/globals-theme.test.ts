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

function expectBlockToContainAll(block: string, values: string[]) {
  for (const value of values) {
    expect(block).toContain(value);
  }
}

const globalsCss = readGlobalsCss();
const rootBlock = getCssBlock(globalsCss, ":root");

describe("globals.css warm theme contract", () => {
  test("defines warm theme tokens in :root", () => {
    expectBlockToContainAll(rootBlock, [
      "--bg-soft",
      "--surface-soft",
      "--text-strong",
      "--accent-strong",
      "--nav-surface",
    ]);
  });

  test("uses theme tokens in body/card/primary button styles", () => {
    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--bg-soft)",
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
    const navBlock = getCssBlock(globalsCss, ".bottom-nav");
    const navLinkBlock = getCssBlock(globalsCss, ".bottom-nav__link");
    const activeNavLinkBlock = getCssBlock(
      globalsCss,
      '.bottom-nav__link[aria-current="page"]',
    );

    expectDeclaration(navBlock, "background", "var(--nav-surface)");
    expectDeclaration(navLinkBlock, "color", "#dbe5f5");
    expectDeclaration(activeNavLinkBlock, "background", "#ffffff");
    expectDeclaration(activeNavLinkBlock, "color", "#14213d");
  });
});
