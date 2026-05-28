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
    expectDeclaration(rootBlock, "--bg-top", "#f7f9fc");
    expectDeclaration(rootBlock, "--bg-soft", "#eef3f9");
    expectDeclaration(rootBlock, "--surface-soft", "rgba(255, 255, 255, 0.92)");
    expectDeclaration(rootBlock, "--text-strong", "#14213d");
    expectDeclaration(rootBlock, "--accent-strong", "#14213d");
    expectDeclaration(rootBlock, "--nav-surface", "rgba(20, 33, 61, 0.96)");
  });

  test("uses theme colors in body/card/primary button styles", () => {
    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".card"),
      "background",
      "rgba(255, 255, 255, 0.92)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".today-screen__primary-button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "#14213d",
    );
  });

  test("covers bottom nav colors and active state readability", () => {
    const navBlock = getCssBlock(globalsCss, ".bottom-nav");
    const navLinkBlock = getCssBlock(globalsCss, ".bottom-nav__link");
    const activeNavLinkBlock = getCssBlock(
      globalsCss,
      '.bottom-nav__link[aria-current="page"]',
    );

    expectDeclaration(navBlock, "background", "rgba(20, 33, 61, 0.96)");
    expectDeclaration(navLinkBlock, "color", "#dbe5f5");
    expectDeclaration(activeNavLinkBlock, "background", "#ffffff");
    expectDeclaration(activeNavLinkBlock, "color", "#14213d");
  });
});
