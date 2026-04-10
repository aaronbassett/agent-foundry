import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Parse a JSONL file into an array of entry objects, skipping malformed lines.
 * @param {string} filePath
 * @returns {object[]}
 */
function parseJsonlFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const entries = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

/**
 * Extract session metadata from a JSONL file's parsed entries.
 * @param {object[]} entries
 * @param {string} filePath
 * @param {string} projectDir  - name of the project subdirectory
 * @returns {object}
 */
function extractMetadata(entries, filePath, projectDir) {
  let sessionId = null;
  let sessionName = null;
  let startTime = null;
  let lastActivity = null;
  let firstUserMessage = null;
  let gitBranch = null;
  let cwd = null;

  for (const entry of entries) {
    // session ID — grab from any entry
    if (!sessionId && entry.sessionId) {
      sessionId = entry.sessionId;
    }

    // session name from custom-title entry
    if (entry.type === 'custom-title' && entry.customTitle) {
      sessionName = entry.customTitle;
    }

    // timestamps
    if (entry.timestamp) {
      if (!startTime || entry.timestamp < startTime) startTime = entry.timestamp;
      if (!lastActivity || entry.timestamp > lastActivity) lastActivity = entry.timestamp;
    }

    // first user message (string content only)
    if (!firstUserMessage && entry.type === 'user') {
      const content = entry.message?.content;
      if (typeof content === 'string') {
        firstUserMessage = content.slice(0, 100);
      }
    }

    // git branch and cwd from first entry that has them
    if (!gitBranch && entry.gitBranch) {
      gitBranch = entry.gitBranch;
    }
    if (!cwd && entry.cwd) {
      cwd = entry.cwd;
    }
  }

  return {
    sessionId,
    sessionName,
    startTime,
    lastActivity,
    firstUserMessage,
    gitBranch,
    cwd,
    projectDir,
    filePath,
  };
}

/**
 * Enumerate all JSONL session files across all project subdirectories.
 * Skips subdirectories within project dirs.
 * @param {string} claudeProjectsDir
 * @param {string|null} projectDirFilter  - optional filter by project dir name
 * @returns {{ filePath: string, projectDir: string }[]}
 */
function enumerateJsonlFiles(claudeProjectsDir, projectDirFilter = null) {
  if (!existsSync(claudeProjectsDir)) return [];

  const result = [];
  const projectDirs = readdirSync(claudeProjectsDir);

  for (const dirName of projectDirs) {
    if (projectDirFilter && dirName !== projectDirFilter) continue;

    const dirPath = join(claudeProjectsDir, dirName);
    let stat;
    try {
      stat = statSync(dirPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;

      const entryPath = join(dirPath, entry);
      let entryStat;
      try {
        entryStat = statSync(entryPath);
      } catch {
        continue;
      }
      // Only include regular files, not subdirectories
      if (!entryStat.isFile()) continue;

      result.push({ filePath: entryPath, projectDir: dirName });
    }
  }

  return result;
}

/**
 * List sessions across all project directories, sorted by lastActivity descending.
 *
 * @param {object} [options]
 * @param {string} [options.claudeProjectsDir]  - defaults to ~/.claude/projects
 * @param {string} [options.projectDir]         - filter by project directory name
 * @param {number} [options.limit]              - max results to return
 * @param {number} [options.offset]             - skip first N results
 * @returns {object[]}
 */
export function listSessions(options = {}) {
  const {
    claudeProjectsDir = DEFAULT_PROJECTS_DIR,
    projectDir: projectDirFilter = null,
    limit,
    offset = 0,
  } = options;

  const files = enumerateJsonlFiles(claudeProjectsDir, projectDirFilter);

  const sessions = [];
  for (const { filePath, projectDir } of files) {
    try {
      const entries = parseJsonlFile(filePath);
      const metadata = extractMetadata(entries, filePath, projectDir);
      sessions.push(metadata);
    } catch {
      // skip unreadable files
    }
  }

  // Sort by lastActivity descending (most recent first)
  sessions.sort((a, b) => {
    const ta = a.lastActivity || '';
    const tb = b.lastActivity || '';
    return tb.localeCompare(ta);
  });

  // Apply offset and limit
  const sliced = sessions.slice(offset);
  return limit !== undefined ? sliced.slice(0, limit) : sliced;
}

/**
 * Resolve a session by ID or name.
 *
 * @param {string} idOrName
 * @param {object} [options]
 * @param {string} [options.claudeProjectsDir]
 * @returns {{ sessionId: string, sessionName: string|null, filePath: string }|null}
 */
export function resolveSession(idOrName, options = {}) {
  const { claudeProjectsDir = DEFAULT_PROJECTS_DIR } = options;

  // First: try matching as a session ID — look for <idOrName>.jsonl in any project dir
  if (existsSync(claudeProjectsDir)) {
    const projectDirs = readdirSync(claudeProjectsDir);
    for (const dirName of projectDirs) {
      const dirPath = join(claudeProjectsDir, dirName);
      let stat;
      try {
        stat = statSync(dirPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;

      const candidate = join(dirPath, `${idOrName}.jsonl`);
      if (existsSync(candidate)) {
        try {
          const entries = parseJsonlFile(candidate);
          const metadata = extractMetadata(entries, candidate, dirName);
          return {
            sessionId: metadata.sessionId ?? idOrName,
            sessionName: metadata.sessionName,
            filePath: candidate,
          };
        } catch {
          // fall through
        }
      }
    }
  }

  // Second: scan all sessions and match by sessionName
  const all = listSessions({ claudeProjectsDir });
  const match = all.find(s => s.sessionName === idOrName);
  if (match) {
    return {
      sessionId: match.sessionId,
      sessionName: match.sessionName,
      filePath: match.filePath,
    };
  }

  return null;
}

/**
 * Search for a term across all JSONL session files.
 *
 * @param {string} term
 * @param {object} [options]
 * @param {string} [options.claudeProjectsDir]
 * @param {string[]} [options.excludeSessionIds]
 * @returns {{ sessionId: string, sessionName: string|null, filePath: string, matchedContext: string[] }[]}
 */
export function grepSessions(term, options = {}) {
  const {
    claudeProjectsDir = DEFAULT_PROJECTS_DIR,
    excludeSessionIds = [],
  } = options;

  const lowerTerm = term.toLowerCase();
  const files = enumerateJsonlFiles(claudeProjectsDir);
  const results = [];

  for (const { filePath, projectDir } of files) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const lines = raw.split('\n').filter(l => l.trim());

      // Check if any line matches
      const matchedLines = lines.filter(l => l.toLowerCase().includes(lowerTerm));
      if (matchedLines.length === 0) continue;

      // Parse for metadata
      const entries = [];
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip
        }
      }
      const metadata = extractMetadata(entries, filePath, projectDir);

      // Skip excluded session IDs
      if (metadata.sessionId && excludeSessionIds.includes(metadata.sessionId)) continue;

      // Extract up to 3 matched line snippets
      const matchedContext = matchedLines.slice(0, 3).map(l => {
        // Try to extract a meaningful snippet from the JSON line
        let snippet = l.trim();
        // Try to find the matching region and trim to 200 chars
        const idx = snippet.toLowerCase().indexOf(lowerTerm);
        if (idx !== -1 && snippet.length > 200) {
          const start = Math.max(0, idx - 50);
          const end = Math.min(snippet.length, idx + 150);
          snippet = snippet.slice(start, end);
        } else {
          snippet = snippet.slice(0, 200);
        }
        return snippet;
      });

      results.push({
        sessionId: metadata.sessionId,
        sessionName: metadata.sessionName,
        filePath,
        matchedContext,
      });
    } catch {
      // skip unreadable files
    }
  }

  return results;
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    mode: null,
    query: null,
    claudeProjectsDir: DEFAULT_PROJECTS_DIR,
    projectDir: null,
    limit: undefined,
    offset: 0,
    exclude: [],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--list':
        opts.mode = 'list';
        break;
      case '--resolve':
        opts.mode = 'resolve';
        opts.query = args[++i];
        break;
      case '--grep':
        opts.mode = 'grep';
        opts.query = args[++i];
        break;
      case '--claude-projects-dir':
        opts.claudeProjectsDir = args[++i];
        break;
      case '--project-dir':
        opts.projectDir = args[++i];
        break;
      case '--limit':
        opts.limit = parseInt(args[++i], 10);
        break;
      case '--offset':
        opts.offset = parseInt(args[++i], 10);
        break;
      case '--exclude':
        opts.exclude = args[++i].split(',').filter(Boolean);
        break;
    }
  }

  return opts;
}

if (process.argv[1] === import.meta.filename ||
    process.argv[1]?.endsWith('session-finder.js')) {
  const opts = parseArgs(process.argv);
  let output;

  if (opts.mode === 'list') {
    output = listSessions({
      claudeProjectsDir: opts.claudeProjectsDir,
      projectDir: opts.projectDir,
      limit: opts.limit,
      offset: opts.offset,
    });
  } else if (opts.mode === 'resolve') {
    output = resolveSession(opts.query, {
      claudeProjectsDir: opts.claudeProjectsDir,
    });
  } else if (opts.mode === 'grep') {
    output = grepSessions(opts.query, {
      claudeProjectsDir: opts.claudeProjectsDir,
      excludeSessionIds: opts.exclude,
    });
  } else {
    process.stderr.write('Usage: session-finder.js --list | --resolve <id> | --grep <term>\n');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
