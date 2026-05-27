"use strict";

/**
 * installer-block
 *
 * Hard-blocks (always-block severity) supply-chain-risky shell commands at
 * the PreToolUse:Bash boundary, regardless of which package manager the
 * project uses. Distinct from `ci-over-install` / `before-flag` /
 * `typosquat-local`, which are advisory (block-then-warn). This check exists
 * because `npx`, `npm install`, pipe-to-shell installers, and similar
 * bypass even the project's lockfile and release-age gates — they pull
 * arbitrary code straight from a network registry and execute it.
 *
 * Blocks:
 *   - npx <anything>                       (always — bypasses install guards)
 *   - npm install / npm i / npm add        (i.e. mutating npm operations
 *                                           that aren't `npm ci`)
 *   - pnpm install / pnpm i / pnpm add / pnpm dlx
 *   - yarn install / yarn add / yarn dlx
 *   - pip install / pip3 install / python -m pip install
 *   - pipx <anything>                      (pipx is always network-install)
 *   - brew install / brew reinstall
 *   - curl ... | sh|bash|zsh|fish          (pipe-to-shell)
 *   - wget ... | sh|bash|zsh|fish          (pipe-to-shell)
 *
 * Does NOT block:
 *   - shell keywords (`in`, `do`, `if`, `head`, `kill`, etc.) — these are
 *     not commands at the start of a subcommand of the above shape.
 *   - cargo install ...                    (Rust toolchain, out of scope)
 *   - npm ci / pnpm install --frozen-lockfile / yarn install --immutable
 *     (clean installs respect the lockfile — those are handled by other
 *     checks if a project policy needs to enforce them).
 *   - npm run <script> / pnpm run <script> / yarn <script>
 *   - npx invocations where the user has explicitly pre-approved (no such
 *     escape hatch is provided here — that's intentional; route through
 *     `pnpm dlx` after vetting, or install the tool first).
 *
 * Severity is `always-block` (configured in scripts/config.json). There is
 * no TTL; every invocation is refused. The user must take a different
 * approach (cargo, native package, vetted install) to proceed.
 */

/**
 * Split a shell command line into subcommands at top-level boundaries.
 * Splits on `;`, `&&`, `||`, `|`, and newlines. Does NOT recurse into
 * `$(...)` or backticks — those are scanned as opaque text, which is
 * conservative (the inner command is treated as part of its containing
 * subcommand and will be matched against the first-token rules separately
 * via the substring scan in `containsPipeToShell`).
 *
 * @param {string} command
 * @returns {string[]}
 */
function splitSubcommands(command) {
  // Replace `&&`, `||`, `;`, and newlines with a single delimiter, then
  // split. We treat `|` as a delimiter for subcommand purposes when looking
  // for non-pipe-to-shell installer commands (e.g. `echo x | npx foo` —
  // the `npx foo` part is still a subcommand we want to refuse).
  const normalized = command
    .replace(/&&|\|\||\n|;/g, "\x00")
    .replace(/\|/g, "\x00");
  return normalized.split("\x00").map((s) => s.trim()).filter(Boolean);
}

/**
 * Strip leading harmless prefixes (`sudo`, `env VAR=val`, `time`, `nohup`,
 * `command`, `builtin`, `exec`) so the next call to `tokens[0]` is the real
 * command name.
 *
 * @param {string[]} tokens
 * @returns {string[]} tokens with leading prefixes removed
 */
function stripPrefixes(tokens) {
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "sudo" || t === "time" || t === "nohup" || t === "command" || t === "builtin" || t === "exec") {
      i++;
      continue;
    }
    // `env VAR=val ... cmd` — skip env and any VAR=value tokens
    if (t === "env") {
      i++;
      while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) {
        i++;
      }
      continue;
    }
    // Bare `VAR=value` prefix to a command
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      i++;
      continue;
    }
    break;
  }
  return tokens.slice(i);
}

/**
 * Detect pipe-to-shell patterns: `curl ... | sh` or `wget ... | bash`,
 * including `| sudo sh`, `| sudo bash`. We use a substring scan over the
 * original command (not the subcommand split) because the `|` is itself a
 * delimiter.
 *
 * @param {string} command
 * @returns {string | null} reason if pipe-to-shell detected, else null
 */
function containsPipeToShell(command) {
  // Match: (curl|wget) ... | [sudo ]? (sh|bash|zsh|fish|ksh)
  // Anchored on `curl`/`wget` as the first token of a subcommand and on the
  // shell as the first token after the pipe. We use a moderately permissive
  // regex over the whole command rather than per-subcommand because the `|`
  // is structurally meaningful here.
  //
  // Word-boundary on the curl/wget side: `(?:^|[\s;&(])` so we don't match
  // `mycurl`. On the shell side, similar: `(?:sudo\s+)?(?:sh|bash|zsh|fish|ksh)\b`.
  const re = /(?:^|[\s;&(`])(?:curl|wget)\b[^\n|;]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|fish|ksh|dash)\b/i;
  if (re.test(command)) {
    return "pipe-to-shell: a network-fetched script is being piped directly into a shell interpreter";
  }
  return null;
}

/**
 * Classify a single subcommand's tokens. Returns a block reason or null.
 *
 * @param {string[]} tokens — tokenised subcommand with leading prefixes
 *                            already stripped via stripPrefixes
 * @returns {string | null}
 */
function classifySubcommand(tokens) {
  if (tokens.length === 0) return null;
  const cmd = tokens[0];
  const arg1 = tokens[1] || "";
  const arg2 = tokens[2] || "";

  // --- npx ---
  // Refuse all npx invocations. The whole point of npx is to fetch and
  // execute arbitrary code from the registry without a lockfile or
  // release-age gate. Even `npx -y`, `npx --package=foo bar` are refused.
  if (cmd === "npx") {
    // `npx --version` / `npx -v` / `npx --help` / `npx -h` are
    // introspective and safe — allow them so users can check tooling.
    if (arg1 === "--version" || arg1 === "-v" || arg1 === "--help" || arg1 === "-h") {
      return null;
    }
    return "`npx` fetches and executes packages from the npm registry without using your lockfile or release-age gate. This bypasses every supply-chain control. Install the tool with your project's package manager (or pin it as a devDependency) instead.";
  }

  // --- npm install variants ---
  if (cmd === "npm") {
    // Allow `npm ci` (clean install from lockfile).
    if (arg1 === "ci") return null;
    // Allow read-only / introspective subcommands.
    if (["run", "test", "start", "version", "--version", "-v", "--help", "-h", "ls", "list", "outdated", "audit", "view", "show", "info", "config", "whoami", "ping", "publish", "pack", "doctor", "explain", "fund", "search", "edit", "exec"].includes(arg1)) {
      // `npm exec` is npx under the hood — refuse.
      if (arg1 === "exec") {
        return "`npm exec` is `npx` under the hood — it fetches and runs packages directly from the registry, bypassing lockfile and release-age controls.";
      }
      return null;
    }
    if (["install", "i", "add", "in", "ins", "inst", "instal", "isnt", "isntall"].includes(arg1)) {
      return "`npm install` / `npm i` / `npm add` mutate the project's dependency graph and pull arbitrary code from the registry. Use `npm ci` for reproducible installs, or stage the dependency change through `package.json` plus a vetted lockfile update.";
    }
    if (arg1 === "update" || arg1 === "up" || arg1 === "upgrade") {
      return "`npm update` upgrades dependencies to whatever the registry currently advertises, bypassing release-age gates. Update via lockfile review instead.";
    }
    // Other npm subcommands fall through as allowed.
    return null;
  }

  // --- pnpm ---
  if (cmd === "pnpm") {
    if (arg1 === "dlx") {
      return "`pnpm dlx` is the pnpm equivalent of `npx`: it fetches and runs packages from the registry without a lockfile or release-age gate.";
    }
    if (arg1 === "install" || arg1 === "i" || arg1 === "add") {
      // Allow `pnpm install --frozen-lockfile` (and equivalent) — that's a
      // reproducible install.
      const rest = tokens.slice(2);
      if (rest.some((t) => t === "--frozen-lockfile")) {
        return null;
      }
      return "`pnpm " + arg1 + "` mutates the dependency graph and resolves against the live registry. Use `pnpm install --frozen-lockfile` for reproducible installs.";
    }
    if (arg1 === "update" || arg1 === "up" || arg1 === "upgrade") {
      return "`pnpm update` upgrades against the live registry, bypassing release-age gates.";
    }
    return null;
  }

  // --- yarn ---
  if (cmd === "yarn") {
    if (arg1 === "dlx") {
      return "`yarn dlx` is the yarn equivalent of `npx`: it fetches and runs packages from the registry without a lockfile or release-age gate.";
    }
    if (arg1 === "add") {
      return "`yarn add` mutates the dependency graph. Stage the change through `package.json` plus a lockfile update.";
    }
    if (arg1 === "install") {
      const rest = tokens.slice(2);
      if (rest.some((t) => t === "--immutable" || t === "--frozen-lockfile")) {
        return null;
      }
      return "`yarn install` resolves against the live registry. Use `yarn install --immutable` for reproducible installs.";
    }
    if (arg1 === "upgrade" || arg1 === "up") {
      return "`yarn upgrade` upgrades against the live registry, bypassing release-age gates.";
    }
    // Bare `yarn` (with no subcommand) is equivalent to `yarn install`.
    if (tokens.length === 1) {
      return "Bare `yarn` is equivalent to `yarn install` and resolves against the live registry. Use `yarn install --immutable` for reproducible installs.";
    }
    return null;
  }

  // --- pip / pip3 / pipx ---
  if (cmd === "pip" || cmd === "pip3") {
    if (arg1 === "install") {
      return "`pip install` fetches arbitrary Python packages from PyPI and runs their setup hooks. Use a vetted requirements file with hashes (`pip install --require-hashes -r requirements.txt`) inside a virtual environment, and prefer locked deployments.";
    }
    return null;
  }
  if (cmd === "pipx") {
    return "`pipx` fetches Python applications from PyPI and runs them. This bypasses any project-level vetting. Install via a vetted system or container image instead.";
  }
  // `python -m pip install ...` / `python3 -m pip install ...`
  if ((cmd === "python" || cmd === "python3") && arg1 === "-m" && (arg2 === "pip" || arg2 === "pipx")) {
    const sub = tokens[3] || "";
    if (arg2 === "pipx") {
      return "`python -m pipx` fetches and runs Python applications from PyPI without vetting.";
    }
    if (sub === "install") {
      return "`python -m pip install` fetches arbitrary Python packages from PyPI. Use a vetted requirements file with hashes inside a virtual environment.";
    }
    return null;
  }

  // --- uv / uvx (the new pip/pipx replacement) ---
  if (cmd === "uvx") {
    return "`uvx` is the uv equivalent of `pipx`: it fetches and runs Python applications from PyPI without project-level vetting.";
  }
  if (cmd === "uv") {
    if (arg1 === "pip" && tokens[2] === "install") {
      return "`uv pip install` fetches arbitrary Python packages from PyPI. Use a vetted lockfile (`uv.lock`) and `uv sync` instead.";
    }
    if (arg1 === "tool" && tokens[2] === "install") {
      return "`uv tool install` is equivalent to `pipx install` — it fetches and runs Python tools from PyPI without project-level vetting.";
    }
    if (arg1 === "add") {
      return "`uv add` mutates the dependency graph and resolves against the live registry. Stage the change through `pyproject.toml` plus a vetted `uv.lock` update.";
    }
    return null;
  }

  // --- brew ---
  if (cmd === "brew") {
    if (arg1 === "install" || arg1 === "reinstall" || arg1 === "upgrade") {
      return "`brew " + arg1 + "` fetches and runs Homebrew formulae, which can execute arbitrary install scripts. Vet the formula manually first, or use a managed system image.";
    }
    return null;
  }

  // --- bun ---
  if (cmd === "bun") {
    if (arg1 === "add" || arg1 === "install" || arg1 === "i") {
      // Allow `bun install --frozen-lockfile`.
      const rest = tokens.slice(2);
      if (rest.some((t) => t === "--frozen-lockfile")) {
        return null;
      }
      return "`bun " + arg1 + "` resolves against the live registry. Use `bun install --frozen-lockfile` for reproducible installs.";
    }
    if (arg1 === "x" || arg1 === "create") {
      return "`bun " + arg1 + "` fetches and runs packages from the registry without a lockfile gate (equivalent to `npx`).";
    }
    return null;
  }

  // --- gem ---
  if (cmd === "gem" && (arg1 === "install" || arg1 === "i")) {
    return "`gem install` fetches arbitrary Ruby gems from rubygems.org and runs their install hooks. Use Bundler with a vetted `Gemfile.lock` instead.";
  }

  // --- go install ---
  if (cmd === "go" && arg1 === "install") {
    return "`go install` fetches arbitrary modules from the network and installs binaries to GOBIN. Vet the module manually first or pin it via the project's `go.mod`.";
  }

  return null;
}

/**
 * Tokenise a single subcommand (whitespace-split). Doesn't try to be a
 * full shell parser — quoted strings are split alongside everything else,
 * but for our purposes (matching the first 1-3 tokens), that's fine: a
 * dangerous installer command is always invoked with its name as the first
 * unquoted token.
 *
 * @param {string} subcommand
 * @returns {string[]}
 */
function tokenize(subcommand) {
  return subcommand.split(/\s+/).filter(Boolean);
}

module.exports = async function installerBlock(input /*, state, config, cwd */) {
  const command = (input?.tool_input?.command || "").trim();
  if (!command) {
    return { status: "pass", message: "No command to inspect", details: {} };
  }

  // 1. Pipe-to-shell scan over the whole command first.
  const pipeReason = containsPipeToShell(command);
  if (pipeReason) {
    return {
      status: "block",
      message:
        pipeReason +
        ". Download the script to a file, inspect it, then run it explicitly — or use a package manager that pins the artifact.",
      details: { key: "pipe-to-shell", pattern: "curl|wget | sh|bash" },
    };
  }

  // 2. Subcommand classification.
  const subs = splitSubcommands(command);
  for (const sub of subs) {
    const rawTokens = tokenize(sub);
    const tokens = stripPrefixes(rawTokens);
    const reason = classifySubcommand(tokens);
    if (reason) {
      return {
        status: "block",
        message: reason,
        details: { key: tokens[0] || "_", subcommand: sub },
      };
    }
  }

  return {
    status: "pass",
    message: "No blocked installer or pipe-to-shell pattern detected",
    details: {},
  };
};

// Export internals for testing
module.exports.splitSubcommands = splitSubcommands;
module.exports.stripPrefixes = stripPrefixes;
module.exports.tokenize = tokenize;
module.exports.classifySubcommand = classifySubcommand;
module.exports.containsPipeToShell = containsPipeToShell;
