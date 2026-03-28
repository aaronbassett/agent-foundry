# Rust Dependency Management

## Package Manager

Rust uses **cargo** as its package manager and build system. There are no alternative package managers to detect — if the project has a `Cargo.toml`, it uses cargo.

Check version: `cargo --version`

## Command Reference

### List Dependencies

| Task | Command |
|---|---|
| List direct dependencies | `cargo tree --depth 1` |
| List full dependency tree | `cargo tree` |
| List in inverted form (who depends on X) | `cargo tree -i <crate>` |
| List with features | `cargo tree -f '{p} {f}'` |
| List duplicates (multiple versions of same crate) | `cargo tree --duplicates` |
| Machine-readable metadata | `cargo metadata --format-version 1` |

### Check for Outdated Packages

| Task | Command | Notes |
|---|---|---|
| Check outdated | `cargo outdated` | Requires `cargo-outdated`: `cargo install cargo-outdated` |
| Check outdated (root only) | `cargo outdated --root-deps-only` | Skip transient dependencies |

If `cargo-outdated` is not installed, you can manually compare:
1. Read versions from `Cargo.toml`
2. Check latest on crates.io: `cargo search <crate> --limit 1`

### Security Audit

| Task | Command | Notes |
|---|---|---|
| Audit for vulnerabilities | `cargo audit` | Requires `cargo-audit`: `cargo install cargo-audit` |
| Audit with fix suggestions | `cargo audit fix` | Attempts automatic fixes |
| Comprehensive policy check | `cargo deny check` | Requires `cargo-deny`: `cargo install cargo-deny` |
| Check licenses | `cargo deny check licenses` | Check dependency licenses |
| Check advisories | `cargo deny check advisories` | Check security advisories |
| Check bans | `cargo deny check bans` | Check banned crates |

### Install a Dependency

| Task | Command |
|---|---|
| Add a dependency | `cargo add <crate>` |
| Add with specific version | `cargo add <crate>@<version>` |
| Add as dev dependency | `cargo add --dev <crate>` |
| Add as build dependency | `cargo add --build <crate>` |
| Add with features | `cargo add <crate> --features feat1,feat2` |
| Add with no default features | `cargo add <crate> --no-default-features` |

### Remove a Dependency

| Task | Command |
|---|---|
| Remove a dependency | `cargo remove <crate>` |
| Remove a dev dependency | `cargo remove --dev <crate>` |

### View Crate Information

| Task | Command |
|---|---|
| Search for crates | `cargo search <query>` |
| View crate info | `cargo info <crate>` |
| View on crates.io | Open `https://crates.io/crates/<crate>` |
| View docs | Open `https://docs.rs/<crate>` |

### Clear Cache

| Task | Command | Notes |
|---|---|---|
| Clean build artifacts | `cargo clean` | Removes `target/` directory |
| Prune cache | `cargo cache --autoclean` | Requires `cargo-cache`: `cargo install cargo-cache` |
| Manual cache clean | `rm -rf ~/.cargo/registry/cache/` | Removes downloaded crate archives |
| Manual source clean | `rm -rf ~/.cargo/registry/src/` | Removes extracted crate sources |
| View cache size | `cargo cache` | Requires `cargo-cache` |

## Lock File

| File | Format | Commit? |
|---|---|---|
| `Cargo.lock` | TOML | **Applications:** yes. **Libraries:** no (add to `.gitignore`) |

**Why the difference:** Applications need reproducible builds (commit the lock). Libraries should be tested against the latest compatible versions (don't commit).

**Reading the lock file:** Use `cargo tree` rather than parsing `Cargo.lock` directly. The tree command shows the resolved dependency graph with versions.

**Updating the lock file:**
- `cargo update` — update all dependencies to latest compatible versions
- `cargo update -p <crate>` — update a specific crate
- `cargo update -p <crate> --precise <version>` — pin to an exact version

## Workspace Commands

**Detection:** `Cargo.toml` with a `[workspace]` section containing `members`.

| Task | Command |
|---|---|
| List workspace members | `cargo metadata --format-version 1 \| jq '.workspace_members'` |
| Build all members | `cargo build --workspace` |
| Test all members | `cargo test --workspace` |
| Run command for specific member | `cargo <cmd> -p <package>` |
| Tree for specific member | `cargo tree -p <package>` |
| Add dep to specific member | `cd <member-dir> && cargo add <crate>` |

## Finding Release Notes

1. Find the repository: check `[package.repository]` in `Cargo.toml` or visit `https://crates.io/crates/<crate>`
2. Check GitHub releases: `https://github.com/<owner>/<repo>/releases`
3. Check CHANGELOG.md in the repo
4. Check crates.io for version history: `https://crates.io/crates/<crate>/versions`

## Upgrade Report

To prepare an upgrade report for a crate:

1. Check current version: `cargo tree -i <crate> --depth 0`
2. Check available versions: `cargo search <crate> --limit 1` or check crates.io
3. Check for breaking changes:
   - Find the repository and read CHANGELOG.md or GitHub releases
   - Major version bumps (e.g., 0.x → 1.0 or 1.x → 2.x) have breaking changes
   - In Rust, 0.x.y → 0.x+1.0 is also a breaking change (pre-1.0 semver)
4. Check who depends on it: `cargo tree -i <crate>` shows reverse dependencies
5. For workspace projects, check if all members use compatible versions

## Useful Cargo Plugins

These extend cargo with additional capabilities. Install with `cargo install <plugin>`:

| Plugin | Purpose |
|---|---|
| `cargo-outdated` | Check for outdated dependencies |
| `cargo-audit` | Security vulnerability scanning |
| `cargo-deny` | Comprehensive dependency policy (licenses, bans, advisories) |
| `cargo-cache` | Cache management and cleanup |
| `cargo-edit` | `cargo add`, `cargo rm` (included in cargo since 1.62) |
| `cargo-udeps` | Find unused dependencies |
