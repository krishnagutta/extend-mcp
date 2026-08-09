import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sep } from 'path';
import { isValidReferenceId, appDirFor, resolveWithin } from '../src/workspace.mjs';

const WORK = sep === '/' ? '/work' : 'C:\\work';

// ── referenceId validation ──────────────────────────────────────────

test('fires on bad: traversal-shaped referenceIds are rejected', () => {
  for (const bad of ['../../etc', '..', 'a/b', 'a\\b', '.hidden', 'x..y/z', '', ' ', 'app id']) {
    assert.equal(isValidReferenceId(bad), false, `expected reject: ${JSON.stringify(bad)}`);
    assert.equal(appDirFor(WORK, bad), null, `appDirFor must be null for: ${JSON.stringify(bad)}`);
  }
});

test('silent on good: realistic referenceIds pass', () => {
  for (const good of ['myApp_gvptzl', 'headcount-management', 'a', 'App2_x']) {
    assert.equal(isValidReferenceId(good), true, `expected accept: ${good}`);
    assert.equal(appDirFor(WORK, good), `${WORK}${sep}${good}`);
  }
});

test('non-string referenceIds are rejected, not thrown on', () => {
  for (const bad of [null, undefined, 42, {}]) {
    assert.equal(isValidReferenceId(bad), false);
  }
});

// ── path containment ────────────────────────────────────────────────

const APP = `${WORK}${sep}app1`;

test('silent on good: normal relative paths resolve inside the app dir', () => {
  assert.equal(resolveWithin(APP, 'appManifest.json'), `${APP}${sep}appManifest.json`);
  assert.equal(
    resolveWithin(APP, `presentation${sep}home.pmd`),
    `${APP}${sep}presentation${sep}home.pmd`
  );
});

test('fires on bad: parent traversal is rejected', () => {
  assert.equal(resolveWithin(APP, `..${sep}other${sep}f.pmd`), null);
  assert.equal(resolveWithin(APP, `..${sep}..${sep}etc${sep}passwd`), null);
  assert.equal(resolveWithin(APP, `a${sep}..${sep}..${sep}..${sep}x`), null);
});

test('fires on bad: sibling directory sharing the prefix is rejected (startsWith bug)', () => {
  // /work/app1evil starts with the string '/work/app1' — the old check passed it.
  assert.equal(resolveWithin(APP, `..${sep}app1evil${sep}x.pmd`), null);
});

test('absolute input paths cannot escape: they are re-rooted inside the app dir', () => {
  // path.join treats a leading separator as a plain segment, so '/etc/passwd'
  // resolves to <appDir>/etc/passwd (contained), never to the real /etc/passwd.
  const outside = sep === '/' ? '/etc/passwd' : 'C:\\Windows\\system32';
  const resolved = resolveWithin(APP, outside);
  assert.ok(resolved === null || resolved.startsWith(APP + sep), 'must stay inside the app dir');
});

test('the app dir itself is within bounds', () => {
  assert.equal(resolveWithin(APP, '.'), APP);
});
