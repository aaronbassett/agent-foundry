---
name: sandbox:create
description: Create a new isolated Docker-based development sandbox for running Claude Code safely
argument-hint: ""
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Sandbox Creation Command

Create a complete Docker-based development sandbox with interactive configuration.

## Overview

Guide the user through creating a new sandbox via conversational workflow. This command orchestrates all three sandbox skills (docker-sandbox-setup, language-environment-config, sandbox-config-management) to build a complete, working sandbox.

## Execution Flow

Follow this workflow strictly - it matches the user's expected experience from the requirements:

### 1. Check for User Preferences

Check if `.claude/sandbox.local.md` exists in the current working directory.

If it exists:
- Read the file
- Parse YAML frontmatter for default preferences
- Use these as defaults throughout the workflow

If it doesn't exist:
- Use plugin defaults
- At the end, ask if user wants to save preferences

### 2. Existing Project or New Project

Ask: **"Do you have an existing project you want to work on in the sandbox?"**

Options:
- **Yes** → Go to step 3a (Existing Project Flow)
- **No** → Go to step 3b (New Project Flow)

---

### 3a. Existing Project Flow

#### 3a.1 Get Repository Information

Ask: **"What's the repository? (e.g., aaronbassett/ollooma or full GitHub URL)"**

Parse the answer:
- `aaronbassett/ollooma` → owner/repo format
- `https://github.com/aaronbassett/ollooma` → extract owner/repo
- Local path → use local mode

#### 3a.2 Detect Languages

Use the language-environment-config skill's scripts. First, dynamically locate the `detect_languages.py` script within the `sandbox` plugin's `skills/language-environment-config/scripts/` directory.

```bash
# Clone repo to temp location first
gh repo clone {owner/repo} /tmp/sandbox-detect-{random}

# Dynamically find and execute the script to detect languages
# For example:
# path_to_script=$(find . -path '*/plugins/sandbox/skills/language-environment-config/scripts/detect_languages.py')
# python3 $path_to_script /tmp/sandbox-detect-{random}
path_to_detect_script=$(find plugins/sandbox/skills -name "detect_languages.py")
python3 ${path_to_detect_script} /tmp/sandbox-detect-{random}


# Then, find and execute the script to parse versions
path_to_parse_script=$(find plugins/sandbox/skills -name "parse_versions.py")
python3 ${path_to_parse_script} /tmp/sandbox-detect-{random}

# Clean up
rm -rf /tmp/sandbox-detect-{random}
```

#### 3a.3 Present Detected Configuration

Based on detection results, present findings:

**Example for monorepo:**

Ask: **"The ollooma project looks like a monorepo with Rust, Python, and Node.js apps. Would you like me to configure the sandbox for each language?"**

Then for each detected language with version:

**"Detected versions:**
- **Rust 1.93.0** (from rust-toolchain.toml)
- **Python 3.14.2** (from pyproject.toml)
- **Node.js version not specified**

**For Node.js, which version should I install?"**

Options:
- current (latest stable - recommended)
- lts (long-term support)
- nightly (bleeding edge)
- specific version

If user overrides a detected version, note it for a warning later.

#### 3a.4 LSP Servers

Ask: **"Should I install LSP servers for development?"**

If yes: **"Which LSP servers?"**

Options based on detected languages:
- rust-analyzer (for Rust)
- pyright (for Python)
- typescript-language-server (for TypeScript/JavaScript)

---

### 3b. New Project Flow

#### 3b.1 Get Project Name

Ask: **"What is the project's name?"**

Store the name.

#### 3b.2 Determine Project Type

Ask: **"What kind of project is it going to be?"**

Examples:
- A React/Next.js webapp
- Rust CLI
- Python ML project
- Multi-language monorepo

Based on answer, infer languages.

#### 3b.3 Language Versions

For each inferred language:

Ask: **"Do you need any specific language versions, or should I just use the latest stable release?"**

Options:
- stable/current (recommended)
- lts (if applicable)
- nightly/bleeding edge
- specific version

#### 3b.4 Repository Creation

Ask: **"Should I create a new repository for {project_name} on GitHub?"**

If yes:
- Ask: **"Public or private?"**
- Offer to run the `gh repo create` command for the user.
- Example: `gh repo create aaronbassett/{project_name} --private --source=. --remote=origin`

---

### 4. Sandbox Location

Ask: **"Where should I create the sandbox?"**

Suggest: `{default_sandbox_parent}/{user_github}/{project_name}`

Example: `~/Sandboxes/aaronbassett/ollooma/`

User can accept or provide custom path.

Verify:
- Check if directory exists
- If exists, ask: **"Directory already exists. Overwrite, merge, or cancel?"**

---

### 5. Claude Code Configuration

#### 5.1 Marketplaces

Ask: **"Should we add any initial marketplaces to Claude Code?"**

Suggest defaults from user preferences or plugin defaults.

Examples:
- anthropics/claude-plugins-official
- aaronbassett/agent-foundry

#### 5.2 Plugins

Ask: **"Would you like any plugins pre-installed?"**

Suggest based on detected languages:
- LSP plugins (if LSP servers chosen)
- Other plugins from user preferences

Example: **"How about:"**
- typescript-lsp@claude-plugins-official
- pyright-lsp@claude-plugins-official
- rust-analyzer-lsp@claude-plugins-official
- devs@agent-foundry
- git-lovely@agent-foundry
- settings-presets@agent-foundry

User can add/remove from suggestions.

#### 5.3 Final Confirmation

Ask: **"Got it - {list of plugins}. Anything else?"**

Allow user to add more or proceed.

---

### 6. Port Forwarding

Detect ports from project files (if existing project):

```bash
# Check package.json for scripts
grep -E '"(dev|start|serve)".*--port' package.json

# Common framework defaults
# Next.js: 3000, Vite: 5173, etc.
```

Ask: **"Should I forward ports {detected ports}? Will you need any others?"**

Or if no detection:

Ask: **"Should I forward all ports in the range 3000-3999? Or do you have specific ports I should forward?"**

---

### 7. Base Image (Optional Advanced)

Ask: **"Do you want to use a custom base image, or save this configuration as a reusable base image for future sandboxes?"**

Options:
- Use default (ubuntu:24.04)
- Use custom base image (provide image name)
- Save as base image after creation

If save as base image:
- Note it for post-creation step
- Provide instructions on how to use it later

---

### 8. Generate Configuration Files

Now create all sandbox files:

#### 8.1 Create Sandbox.toml

Use sandbox-config-management skill to create configuration:

```python
config = {
    "sandbox": {
        "name": project_name,
        "location": sandbox_location,
        "created": datetime.now(timezone.utc).isoformat(),
        "base_image": base_image,
    },
    "source": {
        "type": source_type,
        ...
    },
    "languages": languages_config,
    "claude": claude_config,
    "network": network_config,
    "shell": shell_config,
}

# Write to {sandbox_location}/Sandbox.toml
```

#### 8.2 Generate Dockerfile

Use docker-sandbox-setup skill knowledge to create Dockerfile:

- Start from base image
- Install languages (use version keywords like `stable`, `current`, not numbers for latest)
- Install tools
- Configure shell
- Set up volumes, ports, etc.

Write to `{sandbox_location}/Dockerfile`

#### 8.3 Generate Scripts

Create bash scripts in `{sandbox_location}/sandbox/`:

- `up.sh` - Build and start container
- `shell.sh` - Interactive shell
- `run.sh` - Execute command
- `stop.sh` - Stop and remove container

Use docker-sandbox-setup examples as templates.

#### 8.4 Create .env Template

```bash
# Environment variables for sandbox
GITHUB_TOKEN=${GITHUB_TOKEN}

# Add your own variables below:
```

#### 8.5 Create SANDBOX.md

Use sandbox-config-management skill to generate documentation.

Include:
- Configuration summary
- Setup instructions
- First-run authentication steps
- Usage examples
- Any warnings (e.g., version mismatches)

#### 8.6 Create .gitignore

```
.docker-cache/
.env
```

---

### 9. Clone Repository (if applicable)

If existing GitHub project:

```bash
cd {sandbox_location}
mkdir workspace
gh repo clone {owner/repo} workspace/
```

If new project:

```bash
cd {sandbox_location}
mkdir workspace
cd workspace
# Create basic README
echo "# {project_name}" > README.md
```

---

### 10. Completion

Show summary:

```
✅ Your new sandbox is now ready in {sandbox_location}

Configuration:
- Languages: {languages with versions}
- Tools: {tool count} CLI tools installed
- Claude Code: {marketplace count} marketplaces, {plugin count} plugins
- Ports: {ports or range}

Get started by running:
  cd {sandbox_location}
  ./sandbox/up.sh

The sandbox will report in the terminal once it's ready.

You can edit files in {sandbox_location}/workspace/
and run commands with `./sandbox/run.sh <command>`
or launch an interactive shell with `./sandbox/shell.sh`

Environment variables can be added to {sandbox_location}/.env (requires `./sandbox/stop.sh && ./sandbox/up.sh`)
I've already added your GITHUB_TOKEN for `gh` CLI usage.

Whenever you're done: `./sandbox/stop.sh`
```

Then ask: **"Would you like to start the sandbox now?"**

If yes:
- Run `./sandbox/up.sh &` to run the script in the background.
- Monitor the build progress and show the output to the user.
- When ready, indicate completion

If no:
- Just show the instructions again

---

### 11. Save Preferences (if new user)

If `.claude/sandbox.local.md` didn't exist at start:

Ask: **"Would you like to save these preferences as your defaults for future sandboxes?"**

If yes:
- Create `.claude/sandbox.local.md`
- Save defaults: tools, marketplaces, plugins, base image, etc.
- Confirm saved

---

## Error Handling

### Directory Already Exists

If target directory exists:

Ask: **"The directory {sandbox_location} already exists. What would you like to do?"**

Options:
- **Overwrite** - Delete existing and create new (warn about data loss!)
- **Merge** - Keep existing files, add new sandbox files
- **Cancel** - Stop and let user choose different location

### GitHub Clone Fails

If `gh repo clone` fails:

Show error and ask: **"Failed to clone repository. This might be a private repo or network issue."**

Options:
- **Retry** - Try again
- **Skip** - Create sandbox without cloning (manual clone later)
- **Cancel** - Stop creation

### Docker Build Fails

If sandbox up fails during first run:

- Show build logs
- Suggest checking:
  - Docker is running
  - Network connectivity
  - Disk space
- Provide troubleshooting link to docker-sandbox-setup references/troubleshooting.md

## Important Notes

### Use Skills

This command MUST use all three skills:

- **docker-sandbox-setup**: For Docker knowledge, Dockerfile structure
- **language-environment-config**: For language detection, version parsing, tool installation
- **sandbox-config-management**: For Sandbox.toml creation and management

Reference skills explicitly when generating files.

### Version Keywords

When installing "current" or "latest" versions, NEVER use specific version numbers in Dockerfile. Use keywords:

✅ Good:
```dockerfile
RUN rustup install stable
RUN nvm install node
RUN uv python install
```

❌ Bad:
```dockerfile
RUN rustup install 1.93.0
RUN nvm install 18.20.0
RUN uv python install 3.14.2
```

### User Experience

This is a conversational workflow - ask ONE question at a time, wait for response, then continue. Don't overwhelm with multiple questions.

Use friendly, helpful tone. Provide context for why you're asking each question.

Show progress as you generate files: "Creating Dockerfile...", "Generating management scripts...", etc.

### Filesystem Operations

- Create directories before writing files
- Check if files/directories exist before overwriting
- Use absolute paths when possible
- Validate paths are writable

### Tool Usage

Allowed tools are sufficient for all operations:
- `AskUserQuestion` - All user interaction
- `Read` - Check existing configs, detect files
- `Write` - Create all sandbox files
- `Bash` - Clone repos, run detection scripts, start sandbox
- `Glob/Grep` - Detect files, parse configs

Do NOT use other tools.

## Example Interaction

```
Assistant: Do you have an existing project you want to work on in the sandbox?

User: Yes, it's on GitHub aaronbassett/ollooma