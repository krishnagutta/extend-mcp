import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidAppName, buildCreateArgs, buildCopyArgs } from '../src/lifecycle-args.mjs';

test('fires on bad: path-shaped or degenerate app names are rejected', () => {
  for (const bad of ['', 'ab', '../etc', 'a/b', 'name\nwith newline', ' leading space', undefined]) {
    assert.equal(isValidAppName(bad), false, JSON.stringify(bad));
  }
});

test('silent on good: realistic app names pass', () => {
  for (const good of ['Vendor Onboarding', 'zzTest throwaway 1', 'My_App-2']) {
    assert.equal(isValidAppName(good), true, good);
  }
});

test('create argv matches the verified manifest surface', () => {
  assert.deepEqual(
    buildCreateArgs({ appName: 'Vendor Onboarding', directory: '/work', description: 'demo', appType: 'EXTEND', waitForBuild: false }),
    ['app', 'create', 'Vendor Onboarding', '/work', '--app-type', 'EXTEND', '-d', 'demo', '--no-build-wait']
  );
  assert.deepEqual(
    buildCreateArgs({ appName: 'X App', directory: '/work' }),
    ['app', 'create', 'X App', '/work', '--app-type', 'EXTEND']
  );
});

test('copy argv passes a DIRECTORY as source — never a bare reference id', () => {
  const args = buildCopyArgs({
    sourceDir: '/work/myApp_abcdef',
    destinationDir: '/work/my-copy',
    newName: 'My Copy',
  });
  assert.deepEqual(args, ['app', 'copy', '/work/myApp_abcdef', '/work/my-copy', '-n', 'My Copy']);
  // the copy-by-reference-id path silently uploads nothing (bootstrap finding):
  // source position must hold the resolved local path, not the reference id alone
  assert.equal(args[2], '/work/myApp_abcdef');
  assert.notEqual(args[2], 'myApp_abcdef');
});

test('copy honours wait_for_build=false', () => {
  const args = buildCopyArgs({ sourceDir: '/s', destinationDir: '/d', newName: 'N', waitForBuild: false });
  assert.ok(args.includes('--no-build-wait'));
});
