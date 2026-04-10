import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format an ISO timestamp for display in markdown.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Escape special characters for safe embedding in a JSON context
 * that is already inside a <script> tag's string literal.
 * We use JSON.stringify which handles all necessary escaping.
 */
function safeJsonEmbed(data) {
  return JSON.stringify(data);
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

/**
 * Render the IR as a self-contained HTML document.
 *
 * @param {object} ir - Intermediate Representation from parseJSONL
 * @param {object} options
 * @param {string} options.templatesDir - Directory containing base.html and themes/
 * @param {string} [options.theme='minimal'] - Theme name to use
 * @param {string} [options.customThemesDir] - Directory for custom theme CSS files
 * @param {string} [options.outputPath] - If set, write the HTML to this file path
 * @returns {string} Complete HTML document
 */
export function renderHTML(ir, options = {}) {
  const {
    templatesDir,
    theme = 'minimal',
    customThemesDir,
    outputPath,
  } = options;

  // Read base template
  const baseTemplatePath = join(templatesDir, 'base.html');
  let html = readFileSync(baseTemplatePath, 'utf8');

  // Resolve theme CSS: custom theme dir first, then built-in themes dir
  let themeCss = '';
  if (customThemesDir) {
    const customPath = join(customThemesDir, `${theme}.css`);
    try {
      themeCss = readFileSync(customPath, 'utf8');
    } catch {
      // fall through to built-in
    }
  }

  if (!themeCss) {
    const builtinPath = join(templatesDir, 'themes', `${theme}.css`);
    try {
      themeCss = readFileSync(builtinPath, 'utf8');
    } catch {
      themeCss = '';
    }
  }

  // Derive session name for <title>
  const sessionName = ir.metadata?.sessionName ?? ir.metadata?.sessionId ?? 'Transcript';

  // Replace placeholders
  html = html.replace(/\{\{SESSION_NAME\}\}/g, sessionName);
  html = html.replace('{{THEME_CSS}}', themeCss);
  html = html.replace('{{TRANSCRIPT_DATA}}', safeJsonEmbed(ir));

  // Optionally write to file
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html, 'utf8');
  }

  return html;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

/**
 * Render a single section's content to Markdown.
 *
 * @param {object} section
 * @param {number} sectionIndex - 0-based index for turn numbering
 * @param {object} ir - Full IR (for subagent lookup)
 * @returns {string}
 */
function renderSection(section, sectionIndex, ir) {
  const lines = [];
  const turnNumber = sectionIndex + 1;
  lines.push(`## Turn ${turnNumber}`);
  lines.push('');

  for (const msg of section.messages ?? []) {
    if (msg.type === 'user') {
      const ts = msg.timestamp ? ` (${formatTimestamp(msg.timestamp)})` : '';
      lines.push(`**User**${ts}:`);
      lines.push('');
      lines.push(msg.content ?? '');
      lines.push('');
    } else if (msg.type === 'assistant') {
      const ts = msg.timestamp ? ` (${formatTimestamp(msg.timestamp)})` : '';
      lines.push(`**Claude**${ts}:`);
      lines.push('');

      // Text content
      const textContent = msg.content ?? '';
      if (textContent.trim()) {
        lines.push(textContent);
        lines.push('');
      }

      // Tool calls
      if (Array.isArray(msg.toolCalls)) {
        for (const call of msg.toolCalls) {
          if (call.name === 'Agent') {
            lines.push(...renderSubagentCall(call, ir));
          } else {
            lines.push(...renderToolCall(call));
          }
          lines.push('');
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Render a regular tool call as a <details> block.
 *
 * @param {object} call
 * @returns {string[]}
 */
function renderToolCall(call) {
  const summary = call.name + (call.input ? ` — ${buildToolSummary(call.name, call.input)}` : '');
  const lines = [];
  lines.push('<details>');
  lines.push(`<summary>Tool: ${summary}</summary>`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(call.input ?? {}, null, 2));
  lines.push('```');
  if (call.result !== null && call.result !== undefined) {
    lines.push('');
    lines.push('```');
    lines.push(String(call.result));
    lines.push('```');
  }
  lines.push('</details>');
  return lines;
}

/**
 * Extract a short summary from a tool call's input for display in details summary.
 *
 * @param {string} toolName
 * @param {object} input
 * @returns {string}
 */
function buildToolSummary(toolName, input) {
  if (!input || typeof input !== 'object') return '';
  if (toolName === 'Read' && input.file_path) {
    return String(input.file_path).slice(0, 80);
  }
  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.trim()) {
      return val.slice(0, 80);
    }
  }
  return '';
}

/**
 * Render an Agent (subagent) tool call as Markdown, respecting the handling mode.
 *
 * @param {object} call
 * @param {object} ir
 * @returns {string[]}
 */
function renderSubagentCall(call, ir) {
  // Find subagent record to determine handling
  const subagent = (ir.subagents ?? []).find(s => s.id === call.subagentId);
  const handling = subagent?.handling ?? null;
  const description = call.input?.description ?? call.input?.prompt ?? 'Subagent';
  const lines = [];

  if (handling === 'include') {
    // Inline the subagent conversation
    lines.push('<details>');
    lines.push(`<summary>Agent: ${description}</summary>`);
    lines.push('');
    if (call.result) {
      const resultText = String(call.result).replace(/agentId:\s*\S+[\s.,;)]*(\s|$)/g, '').trim();
      if (resultText) {
        lines.push('```');
        lines.push(resultText);
        lines.push('```');
      }
    }
    lines.push('</details>');
  } else if (handling === 'separate') {
    // Reference to a separate file
    const filename = subagent?.filename ?? `subagent-${call.subagentId ?? 'unknown'}.md`;
    lines.push(`> Dispatched agent: ${description}`);
    lines.push('');
    lines.push(`See: [[${filename}]]`);
  } else {
    // 'exclude' or null/undefined — blockquote + result
    lines.push(`> Dispatched agent: ${description}`);
    if (call.result) {
      const resultText = String(call.result).replace(/agentId:\s*\S+[\s.,;)]*(\s|$)/g, '').trim();
      if (resultText) {
        lines.push('');
        lines.push('```');
        lines.push(resultText);
        lines.push('```');
      }
    }
  }

  return lines;
}

/**
 * Render the IR as a Markdown document with YAML frontmatter.
 *
 * @param {object} ir - Intermediate Representation from parseJSONL
 * @param {object} options
 * @param {string} options.templatesDir - Directory containing markdown.md template
 * @param {string} [options.outputPath] - If set, write the Markdown to this file path
 * @returns {string} Complete Markdown document
 */
export function renderMarkdown(ir, options = {}) {
  const { templatesDir, outputPath } = options;

  // Read template
  const templatePath = join(templatesDir, 'markdown.md');
  let md = readFileSync(templatePath, 'utf8');

  const meta = ir.metadata ?? {};
  const sessionId = meta.sessionId ?? '';
  const sessionName = meta.sessionName ?? meta.sessionId ?? '';
  const project = meta.project ?? '';
  const gitBranch = meta.gitBranch ?? '';
  const model = meta.model ?? '';
  const startTime = meta.startTime ?? '';
  const endTime = meta.endTime ?? '';
  const claudeVersion = meta.claudeVersion ?? '';
  const redactionPreset = ir.redactionConfig?.preset ?? 'none';
  const generatedAt = new Date().toISOString();

  // Replace YAML frontmatter placeholders
  md = md.replace(/\{\{SESSION_ID\}\}/g, sessionId);
  md = md.replace(/\{\{SESSION_NAME\}\}/g, sessionName);
  md = md.replace(/\{\{PROJECT\}\}/g, project);
  md = md.replace(/\{\{GIT_BRANCH\}\}/g, gitBranch);
  md = md.replace(/\{\{MODEL\}\}/g, model);
  md = md.replace(/\{\{START_TIME\}\}/g, startTime);
  md = md.replace(/\{\{END_TIME\}\}/g, endTime);
  md = md.replace(/\{\{CLAUDE_VERSION\}\}/g, claudeVersion);
  md = md.replace(/\{\{REDACTION_PRESET\}\}/g, redactionPreset);
  md = md.replace(/\{\{GENERATED_AT\}\}/g, generatedAt);

  // Build sections content
  const includedSections = (ir.sections ?? []).filter(s => s.included === true);
  const sectionsContent = includedSections
    .map((section, idx) => renderSection(section, idx, ir))
    .join('\n---\n\n');

  md = md.replace('{{SECTIONS}}', sectionsContent);

  // Optionally write to file
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, md, 'utf8');
  }

  return md;
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('renderer.js')) {
  const args = process.argv.slice(2);

  const getFlag = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const format = getFlag('--format') ?? 'html';
  const theme = getFlag('--theme') ?? 'minimal';
  const templatesDir = getFlag('--templates-dir');
  const customThemesDir = getFlag('--custom-themes-dir');
  const outputPath = getFlag('--output');

  if (!templatesDir) {
    process.stderr.write('Error: --templates-dir is required\n');
    process.exit(1);
  }

  let inputData = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { inputData += chunk; });
  process.stdin.on('end', () => {
    let ir;
    try {
      ir = JSON.parse(inputData);
    } catch (e) {
      process.stderr.write(`Error: failed to parse IR JSON from stdin: ${e.message}\n`);
      process.exit(1);
    }

    try {
      if (format === 'markdown') {
        renderMarkdown(ir, { templatesDir, outputPath });
      } else {
        renderHTML(ir, { templatesDir, theme, customThemesDir, outputPath });
      }

      if (outputPath) {
        process.stdout.write(outputPath + '\n');
      }
    } catch (e) {
      process.stderr.write(`Error: render failed: ${e.message}\n`);
      process.exit(1);
    }
  });
}
