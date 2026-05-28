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
  let lastBlock: string | undefined;

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
      lastBlock = block;
    }
  }

  if (lastBlock !== undefined) {
    return lastBlock;
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
    expectDeclaration(rootBlock, "--surface-elevated", "#ffffff");
    expectDeclaration(rootBlock, "--text-strong", "#3b2f2a");
    expectDeclaration(rootBlock, "--text-muted", "#6f5f57");
    expectDeclaration(rootBlock, "--border-soft", "#ecdccf");
    expectDeclaration(rootBlock, "--accent-strong", "#9a5c49");
    expectDeclaration(rootBlock, "--accent-soft", "#f2ddd3");
    expectDeclaration(rootBlock, "--focus-ring", "#b87560");
    expectDeclaration(rootBlock, "--nav-surface", "#fdf4ee");
    expectDeclaration(rootBlock, "--nav-text", "#6d5a50");
    expectDeclaration(rootBlock, "--success-bg", "#dff3e6");
    expectDeclaration(rootBlock, "--success-text", "#166534");
    expectDeclaration(rootBlock, "--danger-bg", "#fdecea");
    expectDeclaration(rootBlock, "--danger-text", "#b91c1c");
  });

  test("uses theme tokens in body/card/button styles", () => {
    const globalsCss = getGlobalsCss();

    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%)",
    );
    expectDeclaration(getCssBlock(globalsCss, "body"), "color", "var(--text-strong)");
    expectDeclaration(
      getCssBlock(globalsCss, ".card", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--surface-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".card", {
        matches: (block) => block.includes("background:"),
      }),
      "border",
      "1px solid var(--border-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".today-screen__primary-button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".button-row a", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".button-row a", {
        matches: (block) => block.includes("background:"),
      }),
      "color",
      "var(--surface-elevated)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".button-row .button-secondary", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".button-row .button-secondary", {
        matches: (block) => block.includes("background:"),
      }),
      "color",
      "var(--accent-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".recommendation-card__watch-link", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".exercise-log-actions__button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".exercise-log-actions__button", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--accent-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".exercise-log-actions__button.is-selected", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-strong)",
    );
  });

});
