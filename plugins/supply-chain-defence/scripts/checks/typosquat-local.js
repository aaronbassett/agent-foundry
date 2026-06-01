"use strict";

const path = require("path");
const {
  extractPackageNames,
  findTyposquatSuspects,
  fetchPackageMetadata,
} = require("../utils");

function loadPopularPackages() {
  try {
    return require(path.join(__dirname, "..", "data", "popular-packages.json"));
  } catch {
    return null;
  }
}

/**
 * Layer 2 — classify a flagged suspect by npm maturity signals. An established
 * package that merely resembles a popular one (lots of downloads, published a
 * long time ago, many releases) is probably legitimate and only warned about; a
 * freshly-published lookalike has the profile of a malicious typosquat and is
 * blocked. A suspect whose metadata cannot be fetched is treated as unverifiable
 * (fail-closed → block), preserving the offline-safe behaviour of the check.
 */
function classifyMaturity(meta, thresholds = {}) {
  const minDownloads = thresholds.typosquatMinDownloads ?? 1000;
  const minAgeDays = thresholds.typosquatMinAgeDays ?? 180;
  const minReleases = thresholds.typosquatMinReleases ?? 5;
  const limits = { minDownloads, minAgeDays, minReleases };

  if (!meta || !meta.ok) {
    return {
      verifiable: false,
      mature: false,
      error: (meta && meta.error) || "metadata-unavailable",
      checks: [],
      limits,
    };
  }

  // Scoped packages report downloads as unknown (the npm downloads API does not
  // support them); don't penalise them for it.
  const downloadsOk = meta.downloadsAvailable ? meta.downloads > minDownloads : null;
  const ageOk = meta.ageDays != null && meta.ageDays >= minAgeDays;
  const releasesOk = meta.releases != null && meta.releases >= minReleases;

  const checks = [
    {
      label: "downloads (last month)",
      value: meta.downloadsAvailable ? meta.downloads : null,
      threshold: minDownloads,
      op: ">",
      ok: downloadsOk,
    },
    {
      label: "age (days since first publish)",
      value: meta.ageDays,
      threshold: minAgeDays,
      op: ">=",
      ok: ageOk,
    },
    {
      label: "published releases",
      value: meta.releases,
      threshold: minReleases,
      op: ">=",
      ok: releasesOk,
    },
  ];

  // Established = old enough AND enough releases AND downloads not a clear fail.
  const mature = ageOk && releasesOk && downloadsOk !== false;
  return { verifiable: true, mature, checks, firstPublish: meta.firstPublish, limits };
}

function fmtNum(n) {
  return typeof n === "number" ? n.toLocaleString("en-US") : "unknown";
}

function describeSuspect(s) {
  const headline = s.reason
    ? `"${s.pkg}" looks like "${s.similarTo}" (${s.reason})`
    : `"${s.pkg}" is suspiciously similar to "${s.similarTo}" (edit distance: ${s.distance})`;

  const m = s.maturity;
  if (!m.verifiable) {
    return [
      headline,
      `  Maturity check: could not fetch npm metadata (${m.error}).`,
      `  → BLOCK (fail-closed): "${s.pkg}" resembles "${s.similarTo}" and its legitimacy could not be verified, so it is treated as suspicious until you confirm it.`,
    ].join("\n");
  }

  const rows = m.checks.map((c) => {
    const mark = c.ok === true ? "✓" : c.ok === false ? "✗" : "?";
    const val = c.value == null ? "unknown" : fmtNum(c.value);
    return `    ${mark} ${c.label}: ${val} (need ${c.op} ${fmtNum(c.threshold)})`;
  });

  const verdict = m.mature
    ? `  → WARN (not blocking): "${s.pkg}" resembles "${s.similarTo}", but it looks like an established, widely-used package (passed the maturity checks above), so it is most likely legitimate.`
    : `  → BLOCK: "${s.pkg}" resembles "${s.similarTo}" AND shows the profile of a freshly-published package (one or more maturity checks above failed) — the typical shape of a malicious typosquat.`;

  return [headline, "  Maturity check (established package vs fresh typosquat):", ...rows, verdict].join("\n");
}

const VERIFY_GUIDANCE = [
  "",
  "How to verify you have the intended package before proceeding:",
  "  • Confirm the name character-by-character against the package's official docs/repository.",
  "  • Run `npm view <pkg> homepage repository maintainers dist-tags` to inspect who publishes it.",
  "  • If you actually meant the popular package it resembles, install that exact name instead.",
  "  • Cross-check the package at https://socket.dev/npm/package/<pkg>.",
].join("\n");

module.exports = async function typosquatLocal(input, state, config, cwd, deps = {}) {
  const fetchMeta = deps.fetchMetadata || fetchPackageMetadata;
  const command = input.tool_input?.command || "";
  const names = extractPackageNames(command).map((p) => p.name);

  if (names.length === 0) {
    return { status: "pass", message: "No package names to check", details: {} };
  }

  const popularPackages = loadPopularPackages();
  if (!popularPackages) {
    return {
      status: "info",
      message: "Could not load popular packages list for typosquat check",
      details: {},
    };
  }

  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  const raw = findTyposquatSuspects(names, popularPackages, maxDist);

  if (raw.length === 0) {
    return { status: "pass", message: "No typosquatting suspects found", details: {} };
  }

  // Layer 2: fetch maturity signals for each flagged suspect.
  const suspects = raw.map((r) => ({
    pkg: r.name,
    similarTo: r.similarTo,
    distance: r.distance,
    reason: r.reason,
  }));
  for (const s of suspects) {
    const meta = await fetchMeta(s.pkg);
    s.maturity = classifyMaturity(meta, config.thresholds);
  }

  // Block if any suspect is immature or unverifiable; warn only if all mature.
  const blockWorthy = suspects.filter((s) => !s.maturity.verifiable || !s.maturity.mature);
  const body = suspects.map(describeSuspect).join("\n\n");

  if (blockWorthy.length > 0) {
    return {
      status: "block",
      message: "Possible typosquatting detected:\n\n" + body + "\n" + VERIFY_GUIDANCE,
      details: { key: blockWorthy[0].pkg, suspects },
    };
  }

  return {
    status: "warn",
    message:
      "A package name resembles a popular package but appears to be established (allowing, with caution):\n\n" +
      body +
      "\n" +
      VERIFY_GUIDANCE,
    details: { suspects },
  };
};

// Exported for unit testing.
module.exports.classifyMaturity = classifyMaturity;
