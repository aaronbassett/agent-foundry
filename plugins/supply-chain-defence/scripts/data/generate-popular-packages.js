#!/usr/bin/env node

// Generate popular-packages.json from live npm registry data.
// Run: node scripts/data/generate-popular-packages.js
// This fetches the top ~3000 npm packages by popularity and writes
// their names to popular-packages.json for typosquat detection.

const https = require("https");
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "popular-packages.json");
const PAGE_SIZE = 250;
const DELAY_MS = 500; // polite delay between requests (increase if hitting rate limits)

// Broad search terms to get wide coverage of popular packages.
// The npm search API requires a non-empty text param, so we use common
// keywords/terms that cover a large swath of the ecosystem. Each query
// returns results sorted by popularity (popularity=1.0 boost).
const SEARCH_TERMS = [
  "keywords:javascript",
  "keywords:node",
  "keywords:typescript",
  "keywords:react",
  "keywords:cli",
  "keywords:util",
  "keywords:test",
  "keywords:build",
  "keywords:css",
  "keywords:http",
  "keywords:webpack",
  "keywords:babel",
  "keywords:eslint",
  "keywords:express",
  "keywords:api",
];

// Pages per search term — 4 pages * 250 = 1000 per term
// With 15 terms and heavy overlap, expect ~2500-3500 unique packages
const PAGES_PER_TERM = 4;

function fetchPage(text, from) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodedText}&size=${PAGE_SIZE}&from=${from}&popularity=1.0&quality=0.0&maintenance=0.0`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(
              new Error(
                `Failed to parse response for "${text}" at offset ${from}: ${e.message}`
              )
            );
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const totalRequests = SEARCH_TERMS.length * PAGES_PER_TERM;
  console.log(
    `Fetching top npm packages via ${SEARCH_TERMS.length} search terms × ${PAGES_PER_TERM} pages each (${totalRequests} total requests)...\n`
  );

  const allNames = new Set();
  let totalFetched = 0;
  let requestCount = 0;

  for (const term of SEARCH_TERMS) {
    console.log(`  Term: ${term}`);
    for (let page = 0; page < PAGES_PER_TERM; page++) {
      const from = page * PAGE_SIZE;
      requestCount++;
      process.stdout.write(
        `    Page ${page + 1}/${PAGES_PER_TERM} (offset ${from}) [${requestCount}/${totalRequests}]...`
      );

      try {
        const result = await fetchPage(term, from);
        const objects = result.objects || [];
        const names = objects
          .map((obj) => obj.package && obj.package.name)
          .filter(Boolean);
        names.forEach((name) => allNames.add(name));
        totalFetched += names.length;
        console.log(
          ` got ${names.length} (${allNames.size} unique so far)`
        );

        if (names.length < PAGE_SIZE) {
          console.log(`    (end of results for "${term}")`);
          break;
        }
      } catch (err) {
        console.error(`\n    Error: ${err.message}`);
        console.log("    Skipping to next term...");
        break;
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(`\nTotal fetched (with duplicates across terms): ${totalFetched}`);
  console.log(`Unique package names before filtering: ${allNames.size}`);

  // Filter out very short names (1-2 chars) to avoid false Levenshtein matches
  const filtered = [...allNames].filter((name) => name.length > 2);

  const filteredOut = allNames.size - filtered.length;
  console.log(
    `Filtered out ${filteredOut} packages with names <= 2 characters`
  );

  // Sort alphabetically
  filtered.sort((a, b) => a.localeCompare(b));

  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 2) + "\n");

  console.log(`\nSummary:`);
  console.log(`  Total fetched:   ${totalFetched}`);
  console.log(`  Unique names:    ${allNames.size}`);
  console.log(`  Filtered out:    ${filteredOut} (length <= 2)`);
  console.log(`  Final count:     ${filtered.length}`);
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
