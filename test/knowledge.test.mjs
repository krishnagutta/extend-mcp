import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { parseSections, findSections } from '../src/knowledge.mjs';

const DOC = `# Title

Preamble text.

## Alpha Section

Alpha body about buttons.

## Beta Section

Beta body about grids.
More beta.

## Gamma

Gamma body.
`;

test('parseSections splits on ## and keeps preamble as _intro', () => {
  const s = parseSections(DOC);
  assert.deepEqual(
    s.map((x) => x.title),
    ['_intro', 'Alpha Section', 'Beta Section', 'Gamma']
  );
  assert.match(s[0].body, /Preamble/);
  assert.equal(s[2].body, 'Beta body about grids.\nMore beta.');
});

test('exact section lookup is case-insensitive and wins over keyword', () => {
  const s = parseSections(DOC);
  const found = findSections(s, { section: 'beta section', keyword: 'buttons' });
  assert.equal(found.length, 1);
  assert.equal(found[0].title, 'Beta Section');
});

test('fires on bad: unknown section returns empty', () => {
  const found = findSections(parseSections(DOC), { section: 'Delta' });
  assert.deepEqual(found, []);
});

test('keyword matches in title OR body', () => {
  const s = parseSections(DOC);
  assert.deepEqual(findSections(s, { keyword: 'grids' }).map((x) => x.title), ['Beta Section']);
  assert.deepEqual(findSections(s, { keyword: 'gamma' }).map((x) => x.title), ['Gamma']);
});

test('silent on good: no query returns all sections', () => {
  assert.equal(findSections(parseSections(DOC), {}).length, 4);
});

test('empty and whitespace inputs do not throw', () => {
  assert.deepEqual(parseSections(''), []);
  assert.deepEqual(parseSections(undefined), []);
  assert.deepEqual(findSections(parseSections(DOC), { keyword: '   ' }), []);
});

// The shipped doc itself must stay parseable and complete.
test('shipped extend-patterns.md parses with the expected core sections', () => {
  const docPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'knowledge', 'extend-patterns.md');
  const sections = parseSections(readFileSync(docPath, 'utf8'));
  const titles = sections.map((s) => s.title);
  for (const required of [
    'App anatomy',
    'PMD page structure',
    'PMD scripting essentials',
    'Widget quick reference',
    'Orchestration patterns',
    'Prism + Extend patterns',
    'Working with this MCP',
  ]) {
    assert.ok(titles.includes(required), `missing section: ${required}`);
  }
  for (const s of sections) {
    assert.ok(s.body.length > 50, `section '${s.title}' is suspiciously thin`);
  }
});
