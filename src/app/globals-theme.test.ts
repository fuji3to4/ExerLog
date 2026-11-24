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
  // Comments sit above rules; drop them so they are not read as part of a selector.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");

  for (const match of source.matchAll(rulePattern)) {
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

describe("globals.css Bloom theme contract", () => {
  test("defines shadcn-compatible warm tokens in :root", () => {
    const rootBlock = getRootBlock();

    expectDeclaration(rootBlock, "--background", "32 51% 96%");
    expectDeclaration(rootBlock, "--foreground", "15 36% 10%");
    expectDeclaration(rootBlock, "--card", "36 71% 98%");
    expectDeclaration(rootBlock, "--card-foreground", "15 36% 10%");
    expectDeclaration(rootBlock, "--primary", "13 62% 42%");
    expectDeclaration(rootBlock, "--primary-foreground", "36 71% 98%");
    expectDeclaration(rootBlock, "--secondary", "31 38% 92%");
    expectDeclaration(rootBlock, "--secondary-foreground", "19 20% 19%");
    expectDeclaration(rootBlock, "--muted", "31 38% 92%");
    expectDeclaration(rootBlock, "--muted-foreground", "24 10% 38%");
    expectDeclaration(rootBlock, "--border", "28 20% 84%");
    expectDeclaration(rootBlock, "--ring", "13 62% 42%");
    expectDeclaration(rootBlock, "--font-sans", "var(--font-body)");
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

  test("defines the sidebar tokens the shadcn sidebar reads", () => {
    const rootBlock = getRootBlock();

    for (const name of ["background", "foreground", "accent", "accent-foreground", "border", "ring"]) {
      expect(getDeclarationValue(rootBlock, `--sidebar-${name}`)).toBeTruthy();
    }
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
      "var(--bg-top)",
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
    for (const selector of [".today-screen__primary-button"]) {
      const block = getCssBlock(globalsCss, selector, {
        matches: (b) => b.includes("background:"),
      });
      expectDeclaration(block, "background", "var(--tonal-bg)");
      expectDeclaration(block, "color", "var(--tonal-text)");
    }
    expectDeclaration(
      getCssBlock(globalsCss, ".today-screen__recommendations"),
      "grid-template-columns",
      "minmax(0, 1fr)",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".exercise-log-actions__button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "transparent",
    );
    expectDeclaration(
      getCssBlock(globalsCss, ".exercise-log-actions__button", {
        matches: (block) => block.includes("color:"),
      }),
      "color",
      "var(--text-strong)",
    );
    const selectedLogAction = getCssBlock(globalsCss, ".exercise-log-actions__button.is-selected", {
      matches: (block) => block.includes("background:"),
    });
    expectDeclaration(selectedLogAction, "background", "var(--tonal-bg)");
    expectDeclaration(selectedLogAction, "color", "var(--tonal-text)");
    expectDeclaration(selectedLogAction, "border-color", "var(--tonal-border)");
    expectDeclaration(
      getCssBlock(globalsCss, ".set-switcher__button", {
        matches: (block) => block.includes("background:"),
      }),
      "background",
      "transparent",
    );
    const pressedSwitcher = getCssBlock(globalsCss, '.set-switcher__button[aria-pressed="true"]');
    expectDeclaration(pressedSwitcher, "background", "var(--tonal-bg)");
    expectDeclaration(pressedSwitcher, "color", "var(--tonal-text)");
    const saved = getCssBlock(globalsCss, ".save-button--saved", {
      matches: (block) => block.includes("background:"),
    });
    expectDeclaration(saved, "background", "var(--success-bg)");
    expectDeclaration(saved, "color", "var(--success-text)");
    const uncommentedCss = globalsCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const settingsPrimary = getCssBlock(uncommentedCss, ".settings-action-button", {
      matches: (block) => block.includes("background:"),
    });
    expectDeclaration(settingsPrimary, "background", "var(--tonal-bg)");
    expectDeclaration(settingsPrimary, "color", "var(--tonal-text)");
    const settingsDanger = getCssBlock(uncommentedCss, ".settings-action-button--danger", {
      matches: (block) => block.includes("background:"),
    });
    expectDeclaration(settingsDanger, "background", "var(--danger-bg)");
    expectDeclaration(settingsDanger, "color", "var(--danger-text)");
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
      getCssBlock(globalsCss, ".metric-selector:focus", {
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
  });

  test("wires self-hosted Ranade, Geist Mono and the warm theme color in layout", () => {
    const layoutTsx = readLayoutTsx();

    expect(layoutTsx).toContain("./fonts/ranade-400.woff2");
    expect(layoutTsx).toContain("variable: \"--font-ranade\"");
    expect(layoutTsx).toContain("variable: \"--font-geist-mono\"");
    expect(layoutTsx).toContain("themeColor: \"#f9f4ee\"");
  });

  test("drops the unused bottom-nav class rules (the nav is styled in bottom-nav.tsx)", () => {
    expect(getGlobalsCss()).not.toMatch(/^\.bottom-nav/m);
  });

  test("defines a cool theme override block", () => {
    const globalsCss = getGlobalsCss();
    const coolBlock = getCssBlock(globalsCss, "[data-theme=\"cool\"]");

    expectDeclaration(coolBlock, "--background", "210 28% 96%");
    expectDeclaration(coolBlock, "--primary", "200 52% 36%");
    expectDeclaration(coolBlock, "color-scheme", "light");
  });

  test("defines a dark theme override block", () => {
    const globalsCss = getGlobalsCss();
    const darkBlock = getCssBlock(globalsCss, "[data-theme=\"dark\"]");

    expectDeclaration(darkBlock, "--background", "20 14% 9%");
    expectDeclaration(darkBlock, "--foreground", "30 25% 92%");
    expectDeclaration(darkBlock, "color-scheme", "dark");
  });

  test("initializes data-theme from localStorage in layout", () => {
    const layoutTsx = readLayoutTsx();

    expect(layoutTsx).toContain("exerlog-theme");
    expect(layoutTsx).toContain("dataset.theme");
    expect(layoutTsx).toContain("ThemeProvider");
  });

});
