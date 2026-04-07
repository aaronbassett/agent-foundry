#!/usr/bin/env node
// Generate popular-packages.json from Socket.dev's curated popular packages list.
// Source: https://socket.dev/npm/category/popular
// Run: node scripts/data/generate-popular-packages.js

const https = require("https");
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "popular-packages.json");
const TOTAL_PAGES = 5;
const DELAY_MS = 1000; // polite delay between requests
const USER_AGENT = "supply-chain-defence/0.1.0 (popular-packages generator)";

// Regex to extract package names from links like /npm/package/PACKAGE_NAME
const PACKAGE_LINK_RE = /\/npm\/package\/([a-zA-Z0-9@._-][a-zA-Z0-9@._/-]*)/g;

function fetchPage(pageNum) {
  return new Promise((resolve, reject) => {
    const url = `https://socket.dev/npm/category/popular?page=${pageNum}`;

    const doRequest = (requestUrl, redirectCount) => {
      if (redirectCount > 5) {
        return reject(new Error(`Too many redirects for page ${pageNum}`));
      }

      const parsedUrl = new URL(requestUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
      };

      https
        .request(options, (res) => {
          if (
            res.statusCode >= 301 &&
            res.statusCode <= 308 &&
            res.headers.location
          ) {
            // Follow redirect
            const redirectUrl = res.headers.location.startsWith("http")
              ? res.headers.location
              : `https://${parsedUrl.hostname}${res.headers.location}`;
            res.resume(); // discard response body
            return doRequest(redirectUrl, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(
              new Error(
                `HTTP ${res.statusCode} for page ${pageNum} (${requestUrl})`
              )
            );
          }

          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        })
        .on("error", reject)
        .end();
    };

    doRequest(url, 0);
  });
}

function extractPackageNames(html) {
  const names = new Set();
  let match;
  // Reset lastIndex before each use since we reuse the regex
  PACKAGE_LINK_RE.lastIndex = 0;
  while ((match = PACKAGE_LINK_RE.exec(html)) !== null) {
    const name = match[1];
    // Exclude any path segments that look like sub-pages (e.g. /npm/package/foo/versions)
    const baseName = name.split("/")[0];
    if (baseName) {
      names.add(baseName);
    }
  }
  return names;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    `Fetching Socket.dev curated popular packages (${TOTAL_PAGES} pages)...\n`
  );

  const allNames = new Set();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    process.stdout.write(`  Fetching page ${page}/${TOTAL_PAGES}...`);

    try {
      const html = await fetchPage(page);
      const names = extractPackageNames(html);
      names.forEach((name) => allNames.add(name));
      console.log(` found ${names.size} packages (${allNames.size} unique so far)`);
    } catch (err) {
      console.error(`\n  Error fetching page ${page}: ${err.message}`);
      console.log("  Skipping page and continuing...");
    }

    if (page < TOTAL_PAGES) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nUnique package names before filtering: ${allNames.size}`);

  // Filter out very short names (<= 2 chars) to avoid false Levenshtein matches
  const filtered = [...allNames].filter((name) => name.length > 2);
  const filteredOut = allNames.size - filtered.length;
  console.log(`Filtered out ${filteredOut} packages with names <= 2 characters`);

  // Sort alphabetically (plain lexicographic, consistent with Array.prototype.sort default)
  filtered.sort();

  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(filtered, null, 2) + "\n");

  console.log(`\nSummary:`);
  console.log(`  Pages fetched:   ${TOTAL_PAGES}`);
  console.log(`  Unique names:    ${allNames.size}`);
  console.log(`  Filtered out:    ${filteredOut} (length <= 2)`);
  console.log(`  Final count:     ${filtered.length}`);
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
