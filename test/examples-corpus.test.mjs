import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { isTextFile, listApps, searchCorpus, ensureCorpus } from '../src/examples-corpus.mjs';

// Fixture corpus on real disk — the independent oracle is the literal files we
// planted, not the search implementation.
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'corpus-'));
  const app1 = join(root, 'catalog', 'demoApp');
  const app2 = join(root, 'catalog', 'otherApp');
  mkdirSync(join(app1, 'presentation'), { recursive: true });
  mkdirSync(app2, { recursive: true });
  writeFileSync(join(app1, 'presentation', 'home.pmd'), '{\n  "type": "fileUploader",\n  "label": "Upload"\n}\n');
  writeFileSync(join(app1, 'presentation', 'grid.pmd'), '{\n  "type": "grid"\n}\n');
  writeFileSync(join(app2, 'notes.md'), 'mentions FILEUPLOADER in caps\n');
  writeFileSync(join(app2, 'logo.png'), 'binary-ish');
  return root;
}

test('isTextFile: corpus formats in, binaries out', () => {
  for (const good of ['a.pmd', 'b.script', 'c.orchestration', 'd.businessobject', 'e.md']) {
    assert.equal(isTextFile(good), true, good);
  }
  for (const bad of ['x.png', 'y.jpeg', 'z.zip', 'noext']) {
    assert.equal(isTextFile(bad), false, bad);
  }
});

test('listApps returns sorted app dirs, empty for missing collection', () => {
  const root = makeFixture();
  try {
    assert.deepEqual(listApps(root, 'catalog'), ['demoApp', 'otherApp']);
    assert.deepEqual(listApps(root, 'examples'), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('search finds a literal match case-insensitively across apps', () => {
  const root = makeFixture();
  try {
    const r = searchCorpus(root, { query: 'fileuploader' });
    assert.equal(r.matches.length, 2);
    const apps = r.matches.map((m) => m.app).sort();
    assert.deepEqual(apps, ['demoApp', 'otherApp']);
    const hit = r.matches.find((m) => m.app === 'demoApp');
    assert.equal(hit.file, join('presentation', 'home.pmd'));
    assert.equal(hit.line, 2);
    assert.match(hit.snippet, /fileUploader/);
    assert.match(hit.url, /^https:\/\/github\.com\/Workday\/WorkdayDeveloperProgram\/blob\/main\/catalog\/demoApp\/presentation\/home\.pmd$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fires on bad: no match returns empty, binary files are never scanned', () => {
  const root = makeFixture();
  try {
    const r = searchCorpus(root, { query: 'binary-ish' });
    assert.deepEqual(r.matches, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('app and extension filters restrict the scan', () => {
  const root = makeFixture();
  try {
    const byApp = searchCorpus(root, { query: 'fileuploader', app: 'demoApp' });
    assert.deepEqual(byApp.matches.map((m) => m.app), ['demoApp']);
    const byExt = searchCorpus(root, { query: 'fileuploader', extension: 'md' });
    assert.deepEqual(byExt.matches.map((m) => m.app), ['otherApp']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('limit truncates and reports it', () => {
  const root = makeFixture();
  try {
    const r = searchCorpus(root, { query: 'fileuploader', limit: 1 });
    assert.equal(r.matches.length, 1);
    assert.equal(r.truncated, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ensureCorpus: clones when absent, cached when present, pulls on refresh', async () => {
  const calls = [];
  const fakeExec = async (bin, args) => { calls.push([bin, ...args]); return { stdout: '', stderr: '' }; };
  const root = mkdtempSync(join(tmpdir(), 'corpus-git-'));
  try {
    const missing = join(root, 'clone-target');
    assert.equal((await ensureCorpus(fakeExec, missing)).state, 'cloned');
    assert.equal(calls[0][1], 'clone');

    mkdirSync(join(root, 'existing', '.git'), { recursive: true });
    calls.length = 0;
    assert.equal((await ensureCorpus(fakeExec, join(root, 'existing'))).state, 'cached');
    assert.equal(calls.length, 0, 'cached path must not shell out');

    assert.equal((await ensureCorpus(fakeExec, join(root, 'existing'), { refresh: true })).state, 'updated');
    assert.ok(calls[0].includes('pull'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
