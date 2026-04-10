import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures', 'sample-session.jsonl');

const { analyzeTimeline } = await import(join(__dirname, '..', 'section-analyzer.js'));

describe('section-analyzer', () => {
  const timeline = analyzeTimeline(FIXTURE_PATH);

  it('returns an object with events array', () => {
    assert.ok(Array.isArray(timeline.events));
    assert.ok(timeline.events.length > 0);
  });

  it('extracts user prompts', () => {
    const prompts = timeline.events.filter(e => e.type === 'user-prompt');
    assert.equal(prompts.length, 2);
    assert.ok(prompts[0].preview.includes('authentication bug'));
    assert.ok(prompts[1].preview.includes('rate limiting'));
  });

  it('assigns indices to user prompts', () => {
    const prompts = timeline.events.filter(e => e.type === 'user-prompt');
    assert.equal(prompts[0].promptIndex, 0);
    assert.equal(prompts[1].promptIndex, 1);
  });

  it('extracts git commits from Bash tool calls', () => {
    const commits = timeline.events.filter(e => e.type === 'git-action' && e.action === 'commit');
    assert.equal(commits.length, 1);
    assert.ok(commits[0].detail.includes('secure comparison'));
  });

  it('detects branch transitions', () => {
    const transitions = timeline.events.filter(e => e.type === 'branch-change');
    assert.equal(transitions.length, 1);
    assert.equal(transitions[0].from, 'main');
    assert.equal(transitions[0].to, 'feat/rate-limit');
  });

  it('detects subagent dispatches', () => {
    const agents = timeline.events.filter(e => e.type === 'subagent-dispatch');
    assert.equal(agents.length, 1);
    assert.ok(agents[0].description.includes('rate limiting'));
  });

  it('all events have timestamps', () => {
    assert.ok(timeline.events.every(e => e.timestamp));
  });

  it('events are in chronological order', () => {
    for (let i = 1; i < timeline.events.length; i++) {
      assert.ok(timeline.events[i].timestamp >= timeline.events[i - 1].timestamp);
    }
  });

  it('extracts distinct branch names', () => {
    assert.deepEqual(timeline.branches.sort(), ['feat/rate-limit', 'main']);
  });
});
