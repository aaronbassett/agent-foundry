import { readFileSync } from 'node:fs';

/**
 * Extract the commit message from a git commit command string.
 * Handles both double-quoted and single-quoted -m arguments, including
 * heredoc-style $(cat <<'EOF' ... EOF) patterns.
 *
 * @param {string} command
 * @returns {string|null}
 */
function extractCommitMessage(command) {
  // Heredoc pattern: -m "$(cat <<'EOF'\n   ...\n   EOF\n   )"
  const heredocMatch = command.match(/-m\s+"?\$\(cat\s+<<['"]*\w+['"]*\s*([\s\S]*?)\s*\w+\s*\)"/);
  if (heredocMatch) return heredocMatch[1].trim();

  // Double-quoted: -m "..."
  const dqMatch = command.match(/-m\s+"((?:[^"\\]|\\.)*)"/);
  if (dqMatch) return dqMatch[1].trim();

  // Single-quoted: -m '...'
  const sqMatch = command.match(/-m\s+'((?:[^'\\]|\\.)*)'/);
  if (sqMatch) return sqMatch[1].trim();

  return null;
}

/**
 * Extract the PR title from a gh pr create command string.
 *
 * @param {string} command
 * @returns {string|null}
 */
function extractPrTitle(command) {
  const dqMatch = command.match(/--title\s+"((?:[^"\\]|\\.)*)"/);
  if (dqMatch) return dqMatch[1].trim();

  const sqMatch = command.match(/--title\s+'((?:[^'\\]|\\.)*)'/);
  if (sqMatch) return sqMatch[1].trim();

  return null;
}

/**
 * Extract remote/branch arguments from a git push command.
 *
 * @param {string} command
 * @returns {string}
 */
function extractPushDetail(command) {
  // Strip "git push" and any flags (starting with -), return remaining args
  const args = command
    .replace(/^git\s+push/, '')
    .trim()
    .split(/\s+/)
    .filter(a => a && !a.startsWith('-'));
  return args.join(' ') || 'origin';
}

/**
 * Extract flags from a git reset command.
 *
 * @param {string} command
 * @returns {string}
 */
function extractResetDetail(command) {
  const flags = command.match(/--\S+/g);
  return flags ? flags.join(' ') : '';
}

/**
 * Given an assistant message content array, extract any Bash tool_use items
 * that match git/gh patterns, and return structured git-action events.
 *
 * @param {Array} contentArray
 * @param {string} timestamp
 * @param {string} messageId
 * @returns {Array}
 */
function extractGitActions(contentArray, timestamp, messageId) {
  const events = [];
  if (!Array.isArray(contentArray)) return events;

  for (const item of contentArray) {
    if (item.type !== 'tool_use' || item.name !== 'Bash') continue;
    const command = item.input?.command ?? '';
    if (!command) continue;

    // Normalize: collapse newlines for multi-line commands
    const normalized = command.replace(/\\\n/g, ' ').replace(/\n/g, ' ');

    if (/\bgit\s+commit\b/.test(normalized)) {
      const detail = extractCommitMessage(normalized) ?? normalized.trim();
      events.push({ type: 'git-action', action: 'commit', detail, timestamp, messageId });
    } else if (/\bgh\s+pr\s+create\b/.test(normalized)) {
      const detail = extractPrTitle(normalized) ?? normalized.trim();
      events.push({ type: 'git-action', action: 'pr-create', detail, timestamp, messageId });
    } else if (/\bgit\s+push\b/.test(normalized)) {
      const detail = extractPushDetail(normalized);
      events.push({ type: 'git-action', action: 'push', detail, timestamp, messageId });
    } else if (/\bgit\s+reset\b/.test(normalized)) {
      const detail = extractResetDetail(normalized);
      events.push({ type: 'git-action', action: 'reset', detail, timestamp, messageId });
    }
  }

  return events;
}

/**
 * Given an assistant message content array, extract Agent tool_use items
 * and return subagent-dispatch events.
 *
 * @param {Array} contentArray
 * @param {string} timestamp
 * @param {string} messageId
 * @returns {Array}
 */
function extractSubagentDispatches(contentArray, timestamp, messageId) {
  const events = [];
  if (!Array.isArray(contentArray)) return events;

  for (const item of contentArray) {
    if (item.type !== 'tool_use' || item.name !== 'Agent') continue;
    const description = item.input?.description ?? null;
    // subagentId is not available at dispatch time (only in tool result); leave null
    events.push({ type: 'subagent-dispatch', description, subagentId: null, timestamp, messageId });
  }

  return events;
}

/**
 * Analyze a JSONL transcript file and extract a chronological timeline of events.
 *
 * @param {string} filePath - Absolute path to the .jsonl file
 * @returns {{ events: Array, branches: Array }}
 */
export function analyzeTimeline(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  const entries = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }

  const events = [];
  const branchSet = new Set();
  let lastBranch = null;
  let promptIndex = 0;

  for (const entry of entries) {
    // Track distinct branches
    if (entry.gitBranch) {
      branchSet.add(entry.gitBranch);
    }

    const timestamp = entry.timestamp;
    const messageId = entry.uuid ?? null;

    // Detect branch changes (only for entries with timestamps and gitBranch)
    if (timestamp && entry.gitBranch) {
      if (lastBranch !== null && entry.gitBranch !== lastBranch) {
        events.push({
          type: 'branch-change',
          from: lastBranch,
          to: entry.gitBranch,
          timestamp,
          messageId,
        });
      }
      lastBranch = entry.gitBranch;
    }

    // user entries with string content → user-prompt events
    if (entry.type === 'user' && typeof entry.message?.content === 'string') {
      const content = entry.message.content;
      events.push({
        type: 'user-prompt',
        promptIndex: promptIndex++,
        preview: content.slice(0, 100),
        timestamp,
        messageId,
      });
    }

    // assistant entries → scan for git actions and subagent dispatches
    if (entry.type === 'assistant') {
      const contentArray = entry.message?.content;

      const gitEvents = extractGitActions(contentArray, timestamp, messageId);
      events.push(...gitEvents);

      const subagentEvents = extractSubagentDispatches(contentArray, timestamp, messageId);
      events.push(...subagentEvents);
    }
  }

  // Sort events chronologically
  events.sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return 0;
  });

  const branches = Array.from(branchSet);

  return { events, branches };
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('section-analyzer.js') && process.argv[2]) {
  const result = analyzeTimeline(process.argv[2]);
  process.stdout.write(JSON.stringify(result));
}
