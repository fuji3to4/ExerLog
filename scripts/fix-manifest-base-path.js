"use strict";

const fs = require("fs");
const path = require("path");

const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const basePath = isGitHubActions ? "/ExerLog" : "/ExerLog";

const MANIFEST_PATH = path.join(__dirname, "..", "out", "manifest.webmanifest");

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn(`[fix-manifest-base-path] ${MANIFEST_PATH} not found, skipping`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  manifest.start_url = `${basePath}/`;
  manifest.scope = `${basePath}/`;
  manifest.icons = manifest.icons.map((icon) => ({
    ...icon,
    src: `${basePath}/${icon.src.replace(/^\//, "")}`,
  }));

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[fix-manifest-base-path] patched ${MANIFEST_PATH} with basePath=${basePath}`);
}

main();
