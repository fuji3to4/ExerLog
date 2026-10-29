import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const srcDir = resolve(import.meta.dirname, "..");

function readGlobalsCss() {
  return readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");
}

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const SOLID_FILLS = [
  "var(--accent-strong)",
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#3aa76d",
];

const EXCLUDED_SELECTORS = [".exercise-detail__play-button", ".history-calendar__day"];

describe("button fills audit", () => {
  test("no button selector keeps a solid primary/destructive fill", () => {
    const css = readGlobalsCss().replace(/\/\*[\s\S]*?\*\//g, "");
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    const offenders: string[] = [];

    for (const match of css.matchAll(rulePattern)) {
      const selector = match[1].trim();
      if (!/button|btn|-btn|-action|__actions|__back|__close|-toggle/.test(selector)) continue;
      if (EXCLUDED_SELECTORS.some((excluded) => selector.includes(excluded))) continue;

      const background = [...match[2].matchAll(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/g)]
        .map((m) => m[1])
        .join(" ");
      if (SOLID_FILLS.some((fill) => background.includes(fill))) {
        offenders.push(selector);
      }
    }

    expect(offenders).toEqual([]);
  });

  test("tsx buttons and tabs do not use solid bg-primary", () => {
    const excluded = [
      "bottom-nav.tsx",
      "app-sidebar.tsx",
      "badge.tsx",
      "switch.tsx",
      "tooltip.tsx",
      "skeleton.tsx",
    ];
    const files = [...walk(join(srcDir, "features")), ...walk(join(srcDir, "components"))].filter(
      (file) => !file.endsWith(".test.tsx") && !excluded.some((name) => file.endsWith(name)),
    );
    const offenders = files
      .filter((file) => {
        const src = readFileSync(file, "utf8");
        return (
          /bg-primary(?![\w/-])/.test(src) && /(?<![\w-])text-primary-foreground/.test(src)
        ) || /(?<![\w:-])bg-destructive(?![\w/-])/.test(src);
      })
      .map((file) => relative(srcDir, file));

    expect(offenders).toEqual([]);
  });
});
