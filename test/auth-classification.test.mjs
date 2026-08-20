import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAuthFailure, createWdcliClient } from '../src/wdcli-core.mjs';

// ── pure classification ─────────────────────────────────────────────

test('non-auth failures classify as null', () => {
  for (const text of ['unknown app referenceId', 'network timeout', '', undefined]) {
    assert.equal(classifyAuthFailure(text), null, String(text));
  }
});

test('account-session failures name the account fix', () => {
  const c = classifyAuthFailure('HTTP 401 Unauthorized');
  assert.equal(c.kind, 'account');
  assert.match(c.fix, /WDCLI_CLIENT_ID/);
});

test('tenant-token failures name wdcli tenant login, not account re-auth', () => {
  const c = classifyAuthFailure('401: tenant token expired for this tenant');
  assert.equal(c.kind, 'tenant');
  assert.match(c.fix, /wdcli tenant login/);
});

// ── retry policy through the client ─────────────────────────────────

function makeExec(script) {
  const calls = [];
  const impl = async (bin, args, opts) => {
    calls.push({ bin, args, opts });
    const step = script.shift() ?? { stdout: '{}', stderr: '' };
    if (step.fail) {
      const e = new Error(step.message ?? 'exec failed');
      e.stdout = step.stdout ?? '';
      e.stderr = step.stderr ?? '';
      throw e;
    }
    return { stdout: step.stdout ?? '', stderr: step.stderr ?? '' };
  };
  return { impl, calls };
}

test('tenant-token failure is NOT retried (account re-login cannot fix it) and carries the fix', async () => {
  const { impl, calls } = makeExec([
    {}, // initial account auth
    { fail: true, stderr: 'Unauthorized: no tenant session for alias' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  const result = await client.wdcliRaw(['app', 'deploy', 'x', '-t', 'dev1']);
  assert.equal(result.ok, false);
  assert.equal(calls.length, 2, 'auth + single attempt — no retry for tenant-token failures');
  assert.equal(result.auth.kind, 'tenant');
  assert.match(result.auth.fix, /wdcli tenant login/);
});

test('account failure still retries once and, if it persists, carries the account fix', async () => {
  const { impl, calls } = makeExec([
    {},
    { fail: true, stderr: 'Authentication required' },
    {}, // re-auth
    { fail: true, stderr: 'Authentication required' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  const result = await client.wdcli(['app', 'list']);
  assert.equal(result.ok, false);
  assert.equal(calls.length, 4);
  assert.equal(result.auth.kind, 'account');
});

test('successful retry after account re-auth carries no auth field', async () => {
  const { impl } = makeExec([
    {},
    { fail: true, stderr: 'HTTP 401 Unauthorized' },
    {},
    { stdout: '[]' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });
  const result = await client.wdcli(['app', 'list']);
  assert.equal(result.ok, true);
  assert.equal(result.auth, undefined);
});
