import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeploy } from '../src/tenant-guard.mjs';

// Independent oracle: rather than recompute the guard's own boolean, each case
// asserts a hand-specified expected outcome for a concrete, named scenario.

const SAFE = new Set(['acme-sb', 'acme1', 'acme_preview']);

test('fires on bad: deploy to the configured production tenant is blocked', () => {
  const d = evaluateDeploy('acme', { prodTenant: 'acme', safeTenants: SAFE });
  assert.equal(d.blocked, true);
  assert.match(d.reason, /production/i);
});

test('silent on good: deploy to a non-production tenant is allowed', () => {
  const d = evaluateDeploy('acme-sb', { prodTenant: 'acme', safeTenants: SAFE });
  assert.equal(d.blocked, false);
  assert.equal(d.reason, undefined);
});

test('fires on bad: with an allowlist configured, an unlisted non-prod tenant is REFUSED', () => {
  const d = evaluateDeploy('acme9', { prodTenant: 'acme', safeTenants: SAFE });
  assert.equal(d.blocked, true);
  assert.match(d.reason, /EXTEND_SAFE_TENANTS/);
  assert.equal(d.allowlist_enforced, true);
});

test('silent on good: with NO allowlist, a non-prod tenant is allowed (weaker mode, flagged)', () => {
  const d = evaluateDeploy('acme9', { prodTenant: 'acme', safeTenants: new Set() });
  assert.equal(d.blocked, false);
  assert.equal(d.allowlist_enforced, false);
});

test('fires on bad: prod tenant is refused even when mistakenly allowlisted', () => {
  const withProd = new Set([...SAFE, 'acme']);
  const d = evaluateDeploy('acme', { prodTenant: 'acme', safeTenants: withProd });
  assert.equal(d.blocked, true);
  assert.match(d.reason, /production/i);
});

test('fail closed: unset prod tenant blocks a would-be-safe tenant', () => {
  const d = evaluateDeploy('acme-sb', { prodTenant: undefined, safeTenants: SAFE });
  assert.equal(d.blocked, true, 'must not fail open when prod tenant is unset');
  assert.match(d.reason, /EXTEND_PROD_TENANT/);
});

test('fail closed: empty-string prod tenant blocks everything', () => {
  for (const alias of ['acme', 'acme-sb', 'anything']) {
    const d = evaluateDeploy(alias, { prodTenant: '', safeTenants: SAFE });
    assert.equal(d.blocked, true, `expected block for ${alias} when prod unset`);
  }
});

test('fail closed: an empty tenant_alias does not slip past an unset prod tenant', () => {
  const d = evaluateDeploy('', { prodTenant: '', safeTenants: SAFE });
  assert.equal(d.blocked, true);
});

test('safe flag reflects allowlist membership on an allowed deploy', () => {
  assert.equal(evaluateDeploy('acme1', { prodTenant: 'acme', safeTenants: SAFE }).safe, true);
  assert.equal(evaluateDeploy('acme9', { prodTenant: 'acme', safeTenants: SAFE }).safe, false);
});

test('safe flag is present even when the deploy is blocked', () => {
  const d = evaluateDeploy('acme1', { prodTenant: 'acme', safeTenants: SAFE });
  // acme1 is on the allowlist AND non-prod, so it is allowed; check a blocked+safe combo instead
  assert.equal(d.blocked, false);
  const blockedSafe = evaluateDeploy('acme-sb', { prodTenant: '', safeTenants: SAFE });
  assert.equal(blockedSafe.blocked, true);
  assert.equal(blockedSafe.safe, true);
});

test('missing opts object defaults to fail closed', () => {
  const d = evaluateDeploy('acme');
  assert.equal(d.blocked, true);
  assert.equal(d.safe, false);
});
