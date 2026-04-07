#!/usr/bin/env node
// Generate popular-packages.json from Socket.dev's curated popular packages list.
// Source: https://socket.dev/npm/category/popular (pages 1-5)
//
// Socket.dev blocks automated requests, so this script parses saved HTML files.
//
// Usage:
//   1. Open each page in a browser and save as HTML:
//      https://socket.dev/npm/category/popular?page=1  → 1.html
//      https://socket.dev/npm/category/popular?page=2  → 2.html
//      ...
//      https://socket.dev/npm/category/popular?page=5  → 5.html
//
//   2. Run: node scripts/data/generate-popular-packages.js /path/to/1.html /path/to/2.html ... /path/to/5.html
//
// The script extracts package names from /npm/package/NAME links and writes
// popular-packages.json in this directory.

"use strict";

const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "popular-packages.json");

function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.error(
      "Usage: generate-popular-packages.js <page1.html> <page2.html> ... <page5.html>\n\n" +
        "Save each page from https://socket.dev/npm/category/popular?page=N as HTML,\n" +
        "then pass the file paths as arguments."
    );
    process.exit(1);
  }

  const allPackages = new Set();

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }

    const html = fs.readFileSync(file, "utf8");

    // Match /npm/package/NAME where NAME can be scoped (@scope/pkg) or unscoped
    const regex = /\/npm\/package\/((?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      allPackages.add(decodeURIComponent(match[1]));
    }

    console.error(`${file}: ${allPackages.size} unique packages so far`);
  }

  // Filter out very short names (high false-positive rate for Levenshtein)
  const sorted = [...allPackages].filter((n) => n.length > 2).sort();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
  console.error(`\nWrote ${sorted.length} packages to ${OUTPUT_FILE}`);
}

main();
