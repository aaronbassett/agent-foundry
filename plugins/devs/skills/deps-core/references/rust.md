# Rust Dependency Mechanics

Verified cargo command surface for inspecting, auditing, and mutating dependencies. Policy — commit `Cargo.lock` for everything, caret ranges, workspace dependencies, feature discipline, `deny.toml` — lives in the rust-core skill's dependencies reference; never contradict it.

## Install policy (this environment)

The supply-chain hooks that gate JavaScript package managers exempt the Rust toolchain: `cargo install <tool>` is permitted, as are cargo's own network commands (`cargo add`, `cargo update`, `cargo generate-lockfile`).

## Built-in surface

| Task | Command |
|---|---|
| Full dependency tree | `cargo tree` |
| Direct deps only | `cargo tree --depth 1` |
| Reverse deps (who pulls in X) | `cargo tree -i <crate>` |
| Duplicate versions | `cargo tree --duplicates` |
| Feature resolution | `cargo tree -e features` |
| Machine-readable graph | `cargo metadata --format-version 1` (JSON; pipe to `jq`) |
| Update all within ranges | `cargo update` |
| Update one crate | `cargo update -p <crate>` |
| Pin lockfile to an exact version | `cargo update -p <crate> --precise <version>` |
| Preview without writing | `cargo update --dry-run` (alias `-n`) |
| Add a dependency | `cargo add <crate>` (`--dev`, `--build`, `--features a,b`, `--no-default-features`, `<crate>@<version>`) |
| Remove a dependency | `cargo remove <crate>` (`--dev`) |
| Crate metadata from the registry | `cargo info <crate>` |
| Search the registry | `cargo search <query> --limit <n>` |
| Future-incompatibility report | `cargo report future-incompat` |

`cargo update --breaking` (cross-major updates) is nightly-only: stable cargo rejects it as unstable and points at tracking issue rust-lang/cargo#12425. On stable, cross a major with `cargo add <crate>@<new-version>`.

Read resolved versions through `cargo tree` or `cargo metadata` rather than parsing `Cargo.lock` directly.

## Plugins (each requires `cargo install` first)

| Tool | Commands | Notes |
|---|---|---|
| cargo-audit | `cargo audit`; `cargo audit bin <paths>`; `-D warnings` (`--deny`) for CI gating; `--ignore RUSTSEC-...` | `cargo audit fix` exists only when installed with `cargo install cargo-audit --features=fix`; a default install rejects the subcommand. `fix` rewrites `Cargo.toml`; `--dry-run` previews. `bin` scans compiled binaries, fully accurate for `cargo auditable` builds. |
| cargo-deny | `cargo deny check [advisories\|bans\|licenses\|sources\|all]` | Runs with built-in defaults and a warning when no `deny.toml` is present; start from rust-core's `deny.toml` asset rather than writing the schema from memory. |
| cargo-outdated | `cargo outdated` | Not installed here. Fallback without it: `cargo update --dry-run` shows what would change within semver; `cargo info <crate>` gives the registry latest. |
| cargo-machete | `cargo machete` | Unused-dependency scan (fast, syntactic). Live on crates.io. |
| cargo-semver-checks | `cargo semver-checks` | Catches accidental API breaks before publishing a library. Live on crates.io. |
| cargo-cache | `cargo cache`; `cargo cache --autoclean` | Dormant — last crates.io release is 0.8.3 (2022). It still works; the no-install alternative is removing `~/.cargo/registry/cache/` and `~/.cargo/registry/src/` directly. |

`cargo clean` (built in) removes the project's `target/` directory; it does not touch the shared registry cache.

## Registry recipes

The crates.io API rejects anonymous requests: send a User-Agent identifying the caller (its data-access policy requires one).

```bash
curl -s -H "User-Agent: my-tool (contact@example.com)" \
  https://crates.io/api/v1/crates/<crate>
```

The response carries `crate.max_stable_version`, `crate.newest_version`, `crate.updated_at`, and a `versions[]` array with `num`, `created_at`, and `yanked` per version — enough for version-currency and release-date checks (release-age gating, dormancy checks) without HTML scraping. For a single current version, `cargo info <crate>` answers from the terminal.
