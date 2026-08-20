import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWdcliClient } from '../src/wdcli-core.mjs';

// Fake execFile: scripted per-call behaviour, records every invocation.
function makeExec(script) {
  const calls = [];
  const impl = async (bin, args, opts) => {
    calls.push({ bin, args, opts });
    const step = script.shift() ?? { stdout: '{}', stderr: '' };
    if (step.fail) {
      const e = new Error(step.message ?? 'exec failed');
      e.stdout = step.stdout ?? '';
      e.stderr = step.stderr ?? '';
      e.code = step.code ?? 1;
      throw e;
    }
    return { stdout: step.stdout ?? '', stderr: step.stderr ?? '' };
  };
  return { impl, calls };
}

const isAuthCall = (c) => c.args[0] === 'auth';

test('auth race: N concurrent first calls trigger exactly one auth login', async () => {
  const { impl, calls } = makeExec([
    {}, // auth login
    { stdout: '[]' },
    { stdout: '[]' },
    { stdout: '[]' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  await Promise.all([
    client.wdcli(['app', 'list']),
    client.wdcli(['tenant', 'list']),
    client.wdcli(['app', 'info', 'x']),
  ]);

  assert.equal(calls.filter(isAuthCall).length, 1, 'exactly one auth call expected');
});

test('credentials are passed to auth via env, never as argv', async () => {
  const { impl, calls } = makeExec([{}, { stdout: '[]' }]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'my-id', clientSecret: 'my-secret' });
  await client.wdcli(['app', 'list']);

  const auth = calls.find(isAuthCall);
  assert.equal(auth.opts.env.WDCLI_CLIENT_ID, 'my-id');
  assert.equal(auth.opts.env.WDCLI_CLIENT_SECRET, 'my-secret');
  for (const c of calls) {
    assert.ok(!c.args.includes('my-secret'), 'secret must never appear in argv');
  }
});

test('expired token: 401 failure re-auths and retries the SAME call once', async () => {
  const { impl, calls } = makeExec([
    {}, // initial auth
    { fail: true, stderr: 'HTTP 401 Unauthorized' }, // command fails: expired
    {}, // re-auth
    { stdout: '{"apps":[]}' }, // retried command succeeds
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  const result = await client.wdcli(['app', 'list']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { apps: [] });
  assert.equal(calls.filter(isAuthCall).length, 2, 'one initial auth + one re-auth');
  assert.equal(calls.filter((c) => !isAuthCall(c)).length, 2, 'command attempted twice');
});

test('no infinite retry: persistent 401 fails after exactly one retry', async () => {
  const { impl, calls } = makeExec([
    {},
    { fail: true, stderr: 'Authentication required' },
    {},
    { fail: true, stderr: 'Authentication required' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  const result = await client.wdcli(['app', 'list']);
  assert.equal(result.ok, false);
  assert.match(result.error, /Authentication required/);
  assert.equal(calls.length, 4, 'auth, attempt, re-auth, retry — then stop');
});

test('non-auth failure is NOT retried', async () => {
  const { impl, calls } = makeExec([
    {},
    { fail: true, stderr: 'unknown app referenceId' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  const result = await client.wdcli(['app', 'info', 'nope']);
  assert.equal(result.ok, false);
  assert.equal(calls.length, 2, 'no retry for a non-auth error');
});

test('failed auth does not poison the next attempt', async () => {
  const { impl, calls } = makeExec([
    { fail: true, stderr: 'network down' }, // auth fails
    {}, // next call: auth retried
    { stdout: '[]' },
  ]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  await assert.rejects(() => client.wdcli(['app', 'list']));
  const second = await client.wdcli(['app', 'list']);
  assert.equal(second.ok, true);
  assert.equal(calls.filter(isAuthCall).length, 2);
});

test('wdcli appends -f json; wdcliRaw does not', async () => {
  const { impl, calls } = makeExec([{}, { stdout: '[]' }, { stdout: 'progress text' }]);
  const client = createWdcliClient({ execFileImpl: impl, clientId: 'id', clientSecret: 'sec' });

  await client.wdcli(['app', 'list']);
  await client.wdcliRaw(['app', 'upload', '/dir']);

  const cmds = calls.filter((c) => !isAuthCall(c));
  assert.deepEqual(cmds[0].args, ['app', 'list', '-f', 'json', '--ci']);
  assert.deepEqual(cmds[1].args, ['app', 'upload', '/dir', '--ci']);
});
