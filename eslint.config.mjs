import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // The app is a static export with `images.unoptimized: true` (next.config.ts), so
      // next/image cannot optimize anything; plain <img> for thumbnails is intended.
      "@next/next/no-img-element": "off",
    },
  },
];
