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
  let selectorStart = 0;

  for (let i = 0; i < css.length; i += 1) {
    if (css[i] !== "{") {
      continue;
    }

    const selectorText = css.slice(selectorStart, i).trim();

    let end = i + 1;
    let depth = 1;

    while (end < css.length && depth > 0) {
      if (css[end] === "{") {
        depth += 1;
      } else if (css[end] === "}") {
        depth -= 1;
      }

      end += 1;
    }

    if (depth !== 0) {
      break;
    }

    const selectors = selectorText.split(",").map((part) => part.trim());

    if (!selectors.includes(selector)) {
      selectorStart = end;
      i = end - 1;
      continue;
    }

    const block = css.slice(i + 1, end - 1);

    if (!options?.matches || options.matches(block)) {
      return block;
    }

    selectorStart = end;
    i = end - 1;
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
