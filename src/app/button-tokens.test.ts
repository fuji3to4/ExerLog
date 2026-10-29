import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("}", start);
  const vars: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const root = block(":root");
const themes: Record<string, Record<string, string>> = {
  warm: root,
  cool: { ...root, ...block('[data-theme="cool"]') },
  dark: { ...root, ...block('[data-theme="dark"]') },
};

type RGB = [number, number, number];

function hslTriplet(v: string): RGB {
  const [h, s, l] = v.match(/[\d.]+/g)!.map(Number);
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function parseColor(v: string): RGB {
  if (v.startsWith("#")) {
    const n = parseInt(v.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = v.match(/^hsl\(([^)]+)\)$/);
  return hslTriplet(m ? m[1] : v);
}

// Resolve `hsl(var(--x))` style references against a theme.
function resolve(v: string, vars: Record<string, string>): string {
  const m = v.match(/^hsl\(var\((--[\w-]+)\)\)$/);
  return m ? vars[m[1]] : v;
}

function lum([r, g, b]: RGB): number {
  const c = [r, g, b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function over(fg: RGB, bg: RGB, alpha: number): RGB {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
}

describe("button tokens", () => {
  test.each(Object.keys(themes))("tonal text is readable on the tonal background in every theme (%s)", (name) => {
    const vars = themes[name];
    const primary = hslTriplet(vars["--primary"]);
    const bg = over(primary, hslTriplet(vars["--card"]), 0.12);
    const text = parseColor(resolve(vars["--tonal-text"] ?? root["--tonal-text"], vars));
    expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(Object.keys(themes))("danger and success text are readable on their backgrounds in every theme (%s)", (name) => {
    const vars = themes[name];
    for (const kind of ["danger", "success"]) {
      expect(contrast(parseColor(vars[`--${kind}-text`]), parseColor(vars[`--${kind}-bg`]))).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("tonal tokens are defined in :root", () => {
    for (const k of ["--tonal-bg", "--tonal-bg-hover", "--tonal-border", "--tonal-text"]) {
      expect(root[k]).toBeTruthy();
    }
  });
});
