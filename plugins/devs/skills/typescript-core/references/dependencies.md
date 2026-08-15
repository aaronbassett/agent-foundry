# Dependencies

Every dependency is code we now maintain.

## Adding a dependency

Ask in order; any "no" is usually a rejection:

1. **Needed?** Can stdlib, existing deps, or ~50 lines of our own code do it? (Node's stdlib now covers `fetch`, test runner, `glob`, `parseArgs`, `styleText` — check before adding a package.)
2. **Maintained?** Releases/commits within the last year, issues getting responses. A finished, stable micro-library can pass with less; a lone-maintainer package on your critical path is a risk either way.
3. **Typed?** Written in TS or ships official `.d.ts`. Incomplete `@types/*` is a red flag.
4. **Right size?** Tree-shakeable, no kitchen-sink framework for one function, no legacy-JS polyfills.
5. **Licensed & clean?** MIT/Apache/BSD; no unresolved advisories or a history of them.

Before merging: spike it on a branch, note the evaluation in the PR (alternatives, downloads, last release, size), and record the choice in [packages-always-use.md](packages-always-use.md) so the next dev doesn't add a competitor.

## Version policy

**Caret ranges + committed lockfile + automated update PRs.** (Supersedes older guidance to pin exact versions or to "always use latest" — both were wrong: exact pins without automation rot silently; chasing latest without a lockfile makes builds unreproducible.)

- `package.json`: default `^x.y.z` ranges. Exact-pin only tools where minor drift breaks output determinism (e.g. formatters in CI).
- Lockfile (`pnpm-lock.yaml`) is always committed; CI installs with `pnpm install --frozen-lockfile`. The lockfile — not the ranges — is what makes builds reproducible.
- Renovate or Dependabot opens update PRs so upgrades arrive as small, tested diffs. Majors get a human read of the changelog first.
- No alpha/beta in production code without an explicit decision.

## Tooling

| Task | Tool |
|---|---|
| Find outdated deps, plan majors | `npm-check-updates` (`ncu`, `ncu -i` interactive) |
| Unused deps, exports, and files | `knip` |
| Published-package correctness (`exports`, files, ESM/CJS) | `publint` |
| Type-resolution correctness of published packages | `@arethetypeswrong/cli` (`attw --pack`) |
| Vulnerability scan | `pnpm audit --prod` (or `npm audit --omit=dev`) | built-in |

- Run `knip` in CI: it catches both unused dependencies and dead exports, so removal is continuous rather than an annual purge.
- If we publish a package, `publint` + `attw --pack .` run in CI before release; they catch broken `exports` maps and mispackaged types that only surface in consumers.
- Audit findings in production deps block release; dev-dep findings are triaged.

## Supply-chain hygiene

- **Install scripts**: pnpm 10+ blocks dependency lifecycle scripts by default — keep that, and allowlist only packages that genuinely need builds (`onlyBuiltDependencies`). With npm, use `--ignore-scripts` in CI.
- **Provenance**: publish our packages with `npm publish --provenance` (from CI/OIDC); prefer dependencies that ship provenance attestations.
- Never install from a gist/tarball URL; git deps only pinned to a commit SHA, and only as a stopgap.
- New-package risk: a just-published package or brand-new maintainer on a popular name warrants a day's cooldown and a closer look (typosquats, hijacks).

## Upgrading and removing

- Majors: read the changelog/migration guide, upgrade in an isolated PR, run the full test suite.
- A dep that's deprecated, unmaintained, or superseded by the platform gets a migration plan now, not when it breaks.
- `knip` output trends to zero: if nothing imports it, it ships out of `package.json` the same week.
