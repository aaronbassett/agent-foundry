# Cross-Ecosystem Dependency Health

The orchestration layer for repos spanning JavaScript, Rust, and Python: one scanner across all lockfiles, registry queries that need nothing installed, and the rules for folding per-ecosystem findings into a single report. Per-ecosystem command surfaces live in typescript.md, rust.md, and python.md.

## osv-scanner: one scanner for every lockfile

osv-scanner matches lockfiles against the OSV database, covering all three ecosystems in one pass:

```bash
osv-scanner scan -r .                # source scan (the default subcommand), recursive
osv-scanner scan -L uv.lock          # one specific lockfile
osv-scanner scan -r . --format json --output-file results.json
```

Lockfile coverage: JavaScript `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`; Rust `Cargo.lock`; Python `uv.lock`, `poetry.lock`, `requirements.txt`, `Pipfile.lock`, `pdm.lock`, `pylock.toml`.

It is not installed in this environment, and installing it is itself hook-blocked (`brew install` included). If `command -v osv-scanner` comes up empty, run the per-ecosystem auditors instead and report the missing scanner as a gap — never install around the block.

## Registry queries — nothing to install

Version, publish-date, and deprecation checks straight from the registries. These are the commands-over-memory backbone: a version you did not just query is a version you do not know.

```bash
# npm: version, last publish, deprecation notice in one call
npm view <pkg> version time.modified deprecated

# crates.io: a descriptive User-Agent header is required (403 without one)
curl -s -H "User-Agent: deps-maintenance-agent (your-contact)" \
  "https://crates.io/api/v1/crates/<crate>" \
  | jq '{version: .crate.max_stable_version, updated: .crate.updated_at}'

# PyPI: latest version, its upload time, and yanked status
curl -s "https://pypi.org/pypi/<pkg>/json" \
  | jq '{version: .info.version, uploaded: .urls[0].upload_time_iso_8601, yanked: .info.yanked}'
```

## Severity normalization

The auditors speak different scales. Normalize into the report's tiers:

| Auditor | Native scale | Tier mapping |
|---|---|---|
| npm audit / pnpm audit | `critical` `high` `moderate` `low` `info` | critical → Critical; high → High; moderate → Medium; low/info → Low |
| cargo-audit (RUSTSEC) | `vulnerability` (CVSS optional) plus informational kinds `unsound`, `unmaintained`, `notice` | vulnerabilities by CVSS (next row); informational → Hygiene section |
| pip-audit / uv audit / osv-scanner (OSV data) | CVSS scores | 9.0+ → Critical; 7.0–8.9 → High; 4.0–6.9 → Medium; below 4.0 → Low |

When scales disagree — the same advisory rated differently by two auditors — report each source's rating verbatim and rank the finding by the worst of the mappings.

## One report, three ecosystems

Merge order, worst first:

1. **Vulnerabilities** — per finding: normalized severity (with the source scale verbatim), package, path (direct, or via which parent), fixed version, and whether the fix crosses a breaking boundary (major bump, or any minor bump pre-1.0).
2. **Outdated** — grouped by semver impact: major (pre-1.0 minors count as major), minor, patch; current → latest per package.
3. **Hygiene** — missing or conflicting lockfiles, deprecated or unmaintained packages, RUSTSEC informational advisories, duplicate versions.

Clean-result form: "N lockfiles scanned (name them); no known vulnerabilities; M outdated (x major / y minor / z patch); hygiene: none." Name every auditor that actually ran — a check that did not run is a gap in the report, not a silent pass.
