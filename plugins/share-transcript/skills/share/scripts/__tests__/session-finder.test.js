import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { listSessions, resolveSession, grepSessions } = await import(
  join(__dirname, '..', 'session-finder.js')
);

const TEST_ROOT = join(tmpdir(), `session-finder-test-${Date.now()}`);
const PROJECT_A = join(TEST_ROOT, '-Users-testuser-Projects-projectA');
const PROJECT_B = join(TEST_ROOT, '-Users-testuser-Projects-projectB');

before(() => {
  mkdirSync(PROJECT_A, { recursive: true });
  mkdirSync(PROJECT_B, { recursive: true });

  // Project A: two sessions, one named
  writeFileSync(join(PROJECT_A, 'session-aaa.jsonl'), [
    '{"type":"user","uuid":"u1","parentUuid":null,"isSidechain":false,"message":{"role":"user","content":"First message in session A1"},"timestamp":"2026-04-10T08:00:00.000Z","sessionId":"session-aaa","cwd":"/Users/testuser/Projects/projectA","version":"2.1.100","gitBranch":"main","userType":"external","entrypoint":"cli"}',
    '{"type":"custom-title","customTitle":"auth-refactor","sessionId":"session-aaa"}',
    '{"type":"assistant","uuid":"a1","parentUuid":"u1","isSidechain":false,"message":{"model":"claude-sonnet-4-20250514","id":"m1","type":"message","role":"assistant","content":[{"type":"text","text":"Working on auth refactor"}],"stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":5}},"timestamp":"2026-04-10T08:05:00.000Z","sessionId":"session-aaa","cwd":"/Users/testuser/Projects/projectA","version":"2.1.100","gitBranch":"main","userType":"external","entrypoint":"cli"}'
  ].join('\n'));

  writeFileSync(join(PROJECT_A, 'session-bbb.jsonl'), [
    '{"type":"user","uuid":"u2","parentUuid":null,"isSidechain":false,"message":{"role":"user","content":"Help me write unit tests for the payment module"},"timestamp":"2026-04-10T10:00:00.000Z","sessionId":"session-bbb","cwd":"/Users/testuser/Projects/projectA","version":"2.1.100","gitBranch":"feat/payments","userType":"external","entrypoint":"cli"}',
    '{"type":"assistant","uuid":"a2","parentUuid":"u2","isSidechain":false,"message":{"model":"claude-sonnet-4-20250514","id":"m2","type":"message","role":"assistant","content":[{"type":"text","text":"Let me look at the payment module"}],"stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":5}},"timestamp":"2026-04-10T10:10:00.000Z","sessionId":"session-bbb","cwd":"/Users/testuser/Projects/projectA","version":"2.1.100","gitBranch":"feat/payments","userType":"external","entrypoint":"cli"}'
  ].join('\n'));

  // Project B: one session
  writeFileSync(join(PROJECT_B, 'session-ccc.jsonl'), [
    '{"type":"user","uuid":"u3","parentUuid":null,"isSidechain":false,"message":{"role":"user","content":"Deploy the API to production"},"timestamp":"2026-04-09T14:00:00.000Z","sessionId":"session-ccc","cwd":"/Users/testuser/Projects/projectB","version":"2.1.100","gitBranch":"main","userType":"external","entrypoint":"cli"}',
    '{"type":"assistant","uuid":"a3","parentUuid":"u3","isSidechain":false,"message":{"model":"claude-sonnet-4-20250514","id":"m3","type":"message","role":"assistant","content":[{"type":"text","text":"Starting deployment"}],"stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":5}},"timestamp":"2026-04-09T14:30:00.000Z","sessionId":"session-ccc","cwd":"/Users/testuser/Projects/projectB","version":"2.1.100","gitBranch":"main","userType":"external","entrypoint":"cli"}'
  ].join('\n'));
});

after(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('session-finder', () => {
  describe('listSessions', () => {
    it('lists all sessions across projects sorted by most recent', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      assert.equal(sessions.length, 3);
      assert.equal(sessions[0].sessionId, 'session-bbb');
      assert.equal(sessions[1].sessionId, 'session-aaa');
      assert.equal(sessions[2].sessionId, 'session-ccc');
    });

    it('extracts session name when available', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      const named = sessions.find(s => s.sessionId === 'session-aaa');
      assert.equal(named.sessionName, 'auth-refactor');
    });

    it('returns null for session name when not set', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      const unnamed = sessions.find(s => s.sessionId === 'session-bbb');
      assert.equal(unnamed.sessionName, null);
    });

    it('extracts first user message preview', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      const s = sessions.find(s => s.sessionId === 'session-bbb');
      assert.ok(s.firstUserMessage.includes('unit tests'));
    });

    it('extracts timestamps', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      const s = sessions.find(s => s.sessionId === 'session-aaa');
      assert.equal(s.startTime, '2026-04-10T08:00:00.000Z');
      assert.equal(s.lastActivity, '2026-04-10T08:05:00.000Z');
    });

    it('extracts project path and git branch', () => {
      const sessions = listSessions({ claudeProjectsDir: TEST_ROOT });
      const s = sessions.find(s => s.sessionId === 'session-ccc');
      assert.equal(s.projectDir, '-Users-testuser-Projects-projectB');
      assert.equal(s.gitBranch, 'main');
    });

    it('respects limit and offset', () => {
      const page1 = listSessions({ claudeProjectsDir: TEST_ROOT, limit: 2, offset: 0 });
      assert.equal(page1.length, 2);
      const page2 = listSessions({ claudeProjectsDir: TEST_ROOT, limit: 2, offset: 2 });
      assert.equal(page2.length, 1);
    });

    it('filters by project directory', () => {
      const sessions = listSessions({
        claudeProjectsDir: TEST_ROOT,
        projectDir: '-Users-testuser-Projects-projectA'
      });
      assert.equal(sessions.length, 2);
      assert.ok(sessions.every(s => s.projectDir === '-Users-testuser-Projects-projectA'));
    });
  });

  describe('resolveSession', () => {
    it('resolves by session ID', () => {
      const result = resolveSession('session-aaa', { claudeProjectsDir: TEST_ROOT });
      assert.ok(result);
      assert.equal(result.sessionId, 'session-aaa');
      assert.ok(result.filePath.endsWith('session-aaa.jsonl'));
    });

    it('resolves by session name', () => {
      const result = resolveSession('auth-refactor', { claudeProjectsDir: TEST_ROOT });
      assert.ok(result);
      assert.equal(result.sessionId, 'session-aaa');
    });

    it('returns null for unknown session', () => {
      const result = resolveSession('nonexistent', { claudeProjectsDir: TEST_ROOT });
      assert.equal(result, null);
    });
  });

  describe('grepSessions', () => {
    it('finds sessions containing a search term', () => {
      const results = grepSessions('payment', { claudeProjectsDir: TEST_ROOT });
      assert.equal(results.length, 1);
      assert.equal(results[0].sessionId, 'session-bbb');
    });

    it('returns matched context', () => {
      const results = grepSessions('deploy', { claudeProjectsDir: TEST_ROOT });
      assert.equal(results.length, 1);
      assert.ok(results[0].matchedContext.some(c => c.toLowerCase().includes('deploy')));
    });

    it('returns empty array for no matches', () => {
      const results = grepSessions('zzzznonexistent', { claudeProjectsDir: TEST_ROOT });
      assert.equal(results.length, 0);
    });

    it('excludes specified session IDs', () => {
      const results = grepSessions('Projects', {
        claudeProjectsDir: TEST_ROOT,
        excludeSessionIds: ['session-aaa', 'session-ccc']
      });
      assert.equal(results.length, 1);
      assert.equal(results[0].sessionId, 'session-bbb');
    });
  });
});
