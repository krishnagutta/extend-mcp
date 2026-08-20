import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import {
  slugify, checkLearningSafety, formatLearning, parseLearning, searchLearnings,
} from '../src/learnings.mjs';

// ── scrub ───────────────────────────────────────────────────────────

test('fires on bad: credential material is refused', () => {
  for (const bad of [
    'set WDCLI_CLIENT_SECRET=abc123 in the env',
    'the header was Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6',
    'api_key: 12345',
  ]) {
    const r = checkLearningSafety(bad);
    assert.equal(r.ok, false, bad);
  }
});

test('fires on bad: configured tenant values are refused', () => {
  const r = checkLearningSafety('deploying to acme_dev1 failed', { sensitiveValues: ['acme_dev1'] });
  assert.equal(r.ok, false);
  assert.ok(r.violations.includes('tenant-value'));
});

test('silent on good: an ordinary learning with placeholders passes', () => {
  const r = checkLearningSafety(
    'Deploying to <TENANT> failed because the tenanted token expired. Rule: classify auth failures.',
    { sensitiveValues: ['acme_dev1', 'acme'] }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

// ── format / parse round-trip ───────────────────────────────────────

test('formatLearning round-trips through parseLearning', () => {
  const md = formatLearning({
    title: 'Explicit limit on collection reads',
    date: '2026-08-20',
    tags: ['rest-api', 'pagination'],
    verification: 'build-verified',
    what_happened: 'Read 20 of 47 apps.',
    root_cause: 'Silent pagination at 20.',
    rule: 'Always pass an explicit limit.',
    evidence: 'build 4821',
  });
  const parsed = parseLearning(md);
  assert.equal(parsed.title, 'Explicit limit on collection reads');
  assert.deepEqual(parsed.tags, ['rest-api', 'pagination']);
  assert.equal(parsed.verification, 'build-verified');
  assert.match(parsed.body, /Silent pagination/);
});

test('slugify produces filesystem-safe slugs', () => {
  assert.equal(slugify('Explicit limit — on "collection" reads!'), 'explicit-limit-on-collection-reads');
  assert.equal(slugify(''), '');
});

// ── search over a real directory ────────────────────────────────────

function seed(dir) {
  writeFileSync(join(dir, 'a-pagination.md'), formatLearning({
    title: 'Pagination limit', date: '2026-08-01', tags: ['rest-api'],
    verification: 'runtime-verified', what_happened: 'x', root_cause: 'y', rule: 'limit reads',
  }));
  writeFileSync(join(dir, 'b-parse.md'), formatLearning({
    title: 'Empty log parse', date: '2026-08-02', tags: ['build'],
    verification: 'unverified', what_happened: 'empty log', root_cause: 'unknown property', rule: 'bisect',
  }));
}

test('search filters by query, tag, and verification (AND-ed)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'learnings-'));
  try {
    seed(dir);
    assert.equal(searchLearnings(dir).length, 2);
    assert.deepEqual(searchLearnings(dir, { tag: 'build' }).map((e) => e.title), ['Empty log parse']);
    assert.deepEqual(searchLearnings(dir, { query: 'unknown property' }).map((e) => e.title), ['Empty log parse']);
    assert.deepEqual(searchLearnings(dir, { verification: 'runtime-verified' }).map((e) => e.title), ['Pagination limit']);
    assert.equal(searchLearnings(dir, { query: 'pagination', tag: 'build' }).length, 0, 'filters AND together');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing directory returns empty, not a throw', () => {
  assert.deepEqual(searchLearnings('/nonexistent-learnings-dir'), []);
});

// ── the shipped seed learnings stay parseable and scrub-clean ───────

test('shipped learnings parse and contain no sensitive content', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'knowledge', 'learnings');
  const entries = searchLearnings(dir);
  assert.ok(entries.length >= 3, 'seed learnings expected');
  for (const e of entries) {
    assert.ok(e.title && e.date && e.verification, `frontmatter incomplete in ${e.slug}`);
    const safety = checkLearningSafety(`${e.title}\n${e.body}`);
    assert.equal(safety.ok, true, `${e.slug}: ${safety.violations}`);
  }
});
