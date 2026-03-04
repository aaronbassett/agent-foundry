# Sandbox Plugin

Create isolated Docker-based development environments for running Claude Code safely.

## Overview

The sandbox plugin provides a complete workflow for creating containerized development environments that isolate Claude Code from your host system. Each sandbox is a fully-configured Docker container with:

- Multi-language support (Rust, Python, Node.js)
- Development tooling and LSP servers
- Customized shell environment (oh-my-zsh, starship)
- Claude Code with pre-configured marketplaces and plugins
- Port forwarding for web development
- Persistent workspace and package caches

## Features

- **Interactive setup**: Conversational workflow guides you through sandbox creation
- **Language detection**: Automatically detects languages and versions from project files
- **Tool installation**: Installs standard development tools (ripgrep, fd, eza, jq, etc.)
- **Shell customization**: Configures oh-my-zsh with starship prompt
- **Claude Code integration**: Pre-installs marketplaces and plugins
- **Configuration management**: Save and reuse sandbox configurations
- **Simple management**: Bash scripts for start, stop, shell, and run operations

## Prerequisites

- Docker installed and running
- GitHub CLI (`gh`) for repository operations
- Python 3 (for utility scripts)

## Installation

Install via Claude Code marketplace:

```bash
cc marketplace add aaronbassett/agent-foundry
cc plugin install sandbox@agent-foundry
```

## Usage

### Creating a Sandbox

Use the `/sandbox:create` command to start the interactive setup:

```
/sandbox:create
```

Claude will guide you through:
1. Choosing an existing project or creating a new one
2. Selecting the sandbox location
3. Configuring languages and versions
4. Installing LSP servers and plugins
5. Setting up marketplaces
6. Configuring port forwarding

### Managing Sandboxes

After creation, use the generated bash scripts:

```bash
# Start the sandbox
cd ~/Sandboxes/aaronbassett/myproject
./sandbox/up.sh

# Open an interactive shell
./sandbox/shell.sh

# Run a command in the sandbox
./sandbox/run.sh "cargo test"

# Stop the sandbox
./sandbox/stop.sh
```

### Configuration

Create `.claude/sandbox.local.md` to set default preferences:

```markdown
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

default_marketplaces:
  - anthropics/claude-plugins-official
  - aaronbassett/agent-foundry

default_plugins:
  - devs@agent-foundry
  - git-lovely@agent-foundry
---

# Sandbox Preferences

Personal preferences for sandbox creation.
```

### Reusing Configurations

Clone an existing sandbox configuration:

```
/sandbox:create

> Do you have an existing project you want to work on in the sandbox?
No

> I can create that for you. Would you like to base this on an existing sandbox configuration?
Yes, use ~/Sandboxes/aaronbassett/myproject1
```

Claude will read the `Sandbox.toml` from the existing sandbox and offer to customize it for the new project.

## Environment Variables

The following environment variables are automatically configured:

- `GITHUB_TOKEN`: Passed through from host for `gh` CLI operations
- Additional variables can be added to `<sandbox-dir>/.env`

## Skills Included

- **docker-sandbox-setup**: Docker configuration knowledge for Claude Code sandboxing
- **language-environment-config**: Language detection and environment setup
- **sandbox-config-management**: Sandbox.toml reading and writing

## Supported Languages

- **Rust**: rustup, cargo, clippy, rustfmt
- **Python**: uv, ruff
- **Node.js**: nvm, pnpm

## Common Tools Installed

CLI utilities:
- GitHub CLI (`gh`)
- `jq`, `just`, `eza`, `repomix`, `scc`
- `ripgrep`, `sg`, `fd`, `bfs`, `xan`
- `rga`, `pdfgrep`, `fq`
- `shellcheck`, `zizmor`, `git-cliff`, `has`

Cargo tools:
- `cargo-dist`, `cargo-deny`, `cargo-release`, `cocogitto`

## Troubleshooting

### Docker Issues

If Docker build fails:
1. Check Docker is running: `docker ps`
2. Verify Docker has sufficient resources (memory, disk)
3. Review build logs in sandbox directory

### Container Won't Start

If `./sandbox/up.sh` fails:
1. Check port conflicts: `docker ps` to see what ports are in use
2. Verify volume mount paths exist
3. Check Docker daemon logs

### Claude Code Authentication

On first run in the container:
1. Run `./sandbox/shell.sh` to enter the container
2. Run `cc auth` to authenticate Claude Code
3. Follow the authentication flow

## License

MIT

## Contributing

Issues and pull requests welcome at https://github.com/aaronbassett/agent-foundry
