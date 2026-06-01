import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGlobalsCss() {
  return readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");
}

function readLayoutTsx() {
  return readFileSync(resolve(import.meta.dirname, "layout.tsx"), "utf8");
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
      .map((entry) => entry.split(";").at(-1)?.trim() ?? "")
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
  test("defines shadcn-compatible warm tokens in :root", () => {
    const rootBlock = getRootBlock();

    expectDeclaration(rootBlock, "--background", "26 14% 95%");
    expectDeclaration(rootBlock, "--foreground", "22 17% 20%");
    expectDeclaration(rootBlock, "--card", "24 33% 97%");
    expectDeclaration(rootBlock, "--card-foreground", "22 17% 20%");
    expectDeclaration(rootBlock, "--primary", "16 36% 44%");
    expectDeclaration(rootBlock, "--primary-foreground", "0 0% 100%");
    expectDeclaration(rootBlock, "--secondary", "18 44% 89%");
    expectDeclaration(rootBlock, "--secondary-foreground", "16 36% 44%");
    expectDeclaration(rootBlock, "--muted", "23 35% 92%");
    expectDeclaration(rootBlock, "--muted-foreground", "20 12% 39%");
    expectDeclaration(rootBlock, "--border", "30 39% 86%");
    expectDeclaration(rootBlock, "--ring", "16 38% 55%");
    expectDeclaration(rootBlock, "--font-sans", "\"Sofia Sans\", \"Noto Sans JP\", sans-serif");
  });

  test("keeps compatibility aliases mapped from shadcn tokens", () => {
    const rootBlock = getRootBlock();

    expectDeclaration(rootBlock, "--bg-top", "hsl(var(--background))");
    expectDeclaration(rootBlock, "--bg-soft", "hsl(var(--muted))");
    expectDeclaration(rootBlock, "--surface-soft", "hsl(var(--card))");
    expectDeclaration(rootBlock, "--text-strong", "hsl(var(--foreground))");
    expectDeclaration(rootBlock, "--accent-strong", "hsl(var(--primary))");
    expectDeclaration(rootBlock, "--accent-soft", "hsl(var(--secondary))");
    expectDeclaration(rootBlock, "--border-soft", "hsl(var(--border))");
    expectDeclaration(rootBlock, "--focus-ring", "hsl(var(--ring))");
  });

  test("does not include legacy dark nav hard-coded colors", () => {
    const globalsCss = getGlobalsCss();

    expect(globalsCss).not.toContain("background: rgba(20, 33, 61, 0.96)");
    expect(globalsCss).not.toContain("color: #dbe5f5");
  });

  test("uses tokenized warm styles for base surfaces and key controls", () => {
    const globalsCss = getGlobalsCss();

    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--text-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, "body", {
        matches: (block) => block.includes("font-family:"),
      }),
      "font-family",
      "var(--font-sans)",
    );
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
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--nav-surface)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav", {
        matches: (block) => block.includes("box-shadow:"),
      }),
      "box-shadow",
      "0 18px 36px rgba(149, 92, 73, 0.22)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav", {
        matches: (block) => block.includes("border:"),
      }),
      "border",
      "1px solid var(--border-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav__link", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--nav-text)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav__link[aria-current=\"page\"]", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--accent-soft)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".bottom-nav__link[aria-current=\"page\"]", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--text-strong)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".data-management__status", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--success-bg)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".data-management__status", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--success-text)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".data-management__status--error", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "var(--danger-bg)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".data-management__status--error", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--danger-text)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".modal__field input:focus", {
        matches: (block) => block.includes("outline:"),
      }),
      "outline",
      "2px solid var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, "#metric-selector:focus", {
        matches: (block) => block.includes("outline:"),
      }),
      "outline",
      "2px solid var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".self-care-log-card__field select:focus", {
        matches: (block) => block.includes("outline:"),
      }),
      "outline",
      "2px solid var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".library-filters__field input:focus", {
        matches: (block) => block.includes("outline:"),
      }),
      "outline",
      "2px solid var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".library-filters__field input:focus", {
        matches: (block) => block.includes("outline-offset:"),
      }),
      "outline-offset",
      "2px",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".library-filters__field select:focus", {
        matches: (block) => block.includes("outline:"),
      }),
      "outline",
      "2px solid var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".library-filters__field select:focus", {
        matches: (block) => block.includes("outline-offset:"),
      }),
      "outline-offset",
      "2px",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".self-care-screen__metric-input:focus-within", {
        matches: (block) => block.includes("box-shadow:"),
      }),
      "box-shadow",
      "0 0 0 2px var(--focus-ring)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".self-care-screen__metric-input:focus-within", {
        matches: (block) => block.includes("border-color:"),
      }),
      "border-color",
      "var(--focus-ring)",
    );
    expect(
      getCssBlock(globalsCss, ".self-care-screen__metric-input input:focus").includes(
        "outline: none",
      ),
    ).toBe(true);
  });

  test("wires Sofia Sans and warm theme color in layout", () => {
    const layoutTsx = readLayoutTsx();

    expect(layoutTsx).toContain("Sofia_Sans");
    expect(layoutTsx).toContain("variable: \"--font-sans\"");
    expect(layoutTsx).toContain("themeColor: \"#f3f0ee\"");
  });

});
