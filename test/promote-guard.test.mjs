import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedConfirmation, checkPromotion, buildPromoteArgs } from '../src/promote-guard.mjs';

test('the confirmation string names app, version, and level exactly', () => {
  assert.equal(
    expectedConfirmation('myApp_abcdef', '17', 'production'),
    'PROMOTE myApp_abcdef v17 TO PRODUCTION'
  );
});

test('fires on bad: missing or wrong confirmation is refused', () => {
  const base = { referenceId: 'myApp_abcdef', version: '17', level: 'production' };
  for (const confirm of [
    undefined,
    '',
    'yes',
    'promote myApp_abcdef v17 to production', // case matters — a human typed it or they didn't
    'PROMOTE myApp_abcdef v17 TO PRODUCTION ', // trailing space
    'PROMOTE myApp_abcdef v18 TO PRODUCTION', // wrong version
    'PROMOTE otherApp_x v17 TO PRODUCTION', // wrong app
    'PROMOTE myApp_abcdef v17 TO SANDBOX', // wrong level
  ]) {
    const r = checkPromotion({ ...base, confirm });
    assert.equal(r.ok, false, `should refuse: ${JSON.stringify(confirm)}`);
    assert.equal(r.expected, 'PROMOTE myApp_abcdef v17 TO PRODUCTION');
  }
});

test('silent on good: the exact string authorises', () => {
  const r = checkPromotion({
    referenceId: 'myApp_abcdef',
    version: '17',
    level: 'sandbox',
    confirm: 'PROMOTE myApp_abcdef v17 TO SANDBOX',
  });
  assert.equal(r.ok, true);
});

test('promote argv matches the verified manifest surface', () => {
  assert.deepEqual(
    buildPromoteArgs({ referenceId: 'myApp_abcdef', version: '17', level: 'production', releaseNotes: 'GA' }),
    ['app', 'promote', 'myApp_abcdef', '-v', '17', '-l', 'production', '-n', 'GA']
  );
  assert.deepEqual(
    buildPromoteArgs({ referenceId: 'myApp_abcdef', version: '3', level: 'implementation' }),
    ['app', 'promote', 'myApp_abcdef', '-v', '3', '-l', 'implementation']
  );
});

test('no latest-version shortcut exists in promote argv', () => {
  const args = buildPromoteArgs({ referenceId: 'a_b', version: '1', level: 'sandbox' });
  assert.ok(!args.includes('--latest-version'), 'promote must always pin an explicit version');
});
