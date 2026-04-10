import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');
const FIXTURE_PATH = join(__dirname, 'fixtures', 'sample-session.jsonl');

const { parseJSONL } = await import(join(__dirname, '..', 'parser.js'));
const { renderHTML, renderMarkdown } = await import(join(__dirname, '..', 'renderer.js'));

const ir = parseJSONL(FIXTURE_PATH);

describe('renderer', () => {
  describe('renderHTML', () => {
    it('produces a self-contained HTML document', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      assert.ok(html.startsWith('<!DOCTYPE html>'));
      assert.ok(html.includes('</html>'));
    });

    it('replaces the theme CSS placeholder', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      assert.ok(!html.includes('{{THEME_CSS}}'));
    });

    it('replaces the transcript data placeholder', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      assert.ok(!html.includes('{{TRANSCRIPT_DATA}}'));
      assert.ok(html.includes('test-session-001'));
    });

    it('populates session name in title', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      assert.ok(html.includes('fix-auth-and-rate-limit'));
    });

    it('has no external dependencies except Google Fonts', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      const httpLinks = html.match(/https?:\/\/[^\s"')]+/g) || [];
      const nonGoogleLinks = httpLinks.filter(l => !l.includes('fonts.googleapis.com'));
      assert.equal(nonGoogleLinks.length, 0, `Found external links: ${nonGoogleLinks.join(', ')}`);
    });

    it('includes prefers-color-scheme', () => {
      const html = renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal' });
      assert.ok(html.includes('prefers-color-scheme'));
    });
  });

  describe('renderMarkdown', () => {
    it('produces markdown with YAML frontmatter', () => {
      const md = renderMarkdown(ir, { templatesDir: TEMPLATES_DIR });
      assert.ok(md.startsWith('---\n'));
      assert.ok(md.includes('session_id:'));
      assert.ok(md.includes('test-session-001'));
    });

    it('includes user messages', () => {
      const md = renderMarkdown(ir, { templatesDir: TEMPLATES_DIR });
      assert.ok(md.includes('authentication bug'));
    });

    it('includes assistant text', () => {
      const md = renderMarkdown(ir, { templatesDir: TEMPLATES_DIR });
      assert.ok(md.includes('timing attacks'));
    });

    it('wraps tool calls in details tags', () => {
      const md = renderMarkdown(ir, { templatesDir: TEMPLATES_DIR });
      assert.ok(md.includes('<details>'));
      assert.ok(md.includes('</details>'));
    });

    it('includes only included sections', () => {
      const filtered = JSON.parse(JSON.stringify(ir));
      filtered.sections[1].included = false;
      const md = renderMarkdown(filtered, { templatesDir: TEMPLATES_DIR });
      assert.ok(md.includes('authentication bug'));
      assert.ok(!md.includes('rate limiting'));
    });
  });

  describe('file writing', () => {
    it('writes HTML to output path', () => {
      const outDir = join(tmpdir(), `renderer-test-${Date.now()}`);
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, 'test-output.html');

      renderHTML(ir, { templatesDir: TEMPLATES_DIR, theme: 'minimal', outputPath: outPath });
      assert.ok(existsSync(outPath));
      const content = readFileSync(outPath, 'utf8');
      assert.ok(content.includes('<!DOCTYPE html>'));

      rmSync(outDir, { recursive: true, force: true });
    });
  });
});
