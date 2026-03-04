---
default_sandbox_parent: ~/Sandboxes/aaronbassett
default_base_image: ubuntu:24.04
github_token_env: GITHUB_TOKEN
shell_theme: red_container

always_install_tools:
  - ripgrep
  - fd
  - eza
  - jq
  - just
  - repomix
  - scc
  - sg
  - bfs
  - xan
  - rga
  - pdfgrep
  - fq
  - shellcheck
  - zizmor
  - git-cliff
  - has

cargo_tools:
  - cargo-dist
  - cargo-deny
  - cargo-release
  - cocogitto

default_marketplaces:
  - anthropics/claude-plugins-official
  - aaronbassett/agent-foundry

default_plugins:
  - devs@agent-foundry
  - git-lovely@agent-foundry
  - settings-presets@agent-foundry

default_languages:
  rust: stable
  python: current
  nodejs: current
---

# Sandbox Preferences

Personal preferences for sandbox creation. These are defaults that can be overridden during sandbox creation.

## Configuration Fields

- `default_sandbox_parent`: Base directory where sandboxes will be created
- `default_base_image`: Default Docker base image (ubuntu:24.04, debian:bookworm, etc.)
- `github_token_env`: Environment variable name for GitHub token
- `shell_theme`: Starship theme preset (red_container for obvious visual indicator)
- `always_install_tools`: CLI tools to install in every sandbox
- `cargo_tools`: Rust tools to install via cargo
- `default_marketplaces`: Claude Code marketplaces to add
- `default_plugins`: Claude Code plugins to pre-install
- `default_languages`: Default version preferences for languages

## Usage

Copy this file to `.claude/sandbox.local.md` in your project directory to customize defaults.

The command will ask if you want to save preferences after first sandbox creation.
