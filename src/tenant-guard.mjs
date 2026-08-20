// Production-deploy guard. Pure and side-effect-free so it can be unit-tested
// against an independent oracle. The server ALSO refuses to start when
// EXTEND_PROD_TENANT is unset (see config.mjs) — this function is the second,
// in-process line of defence and must itself fail closed.

/**
 * Decide whether a deploy to `tenantAlias` is allowed.
 *
 * Fail-closed contract:
 *   - If no production tenant is configured, block EVERYTHING. An unset prod
 *     alias must never make production deployable.
 *   - Deploys to the configured production tenant are always blocked — even if
 *     someone mistakenly puts it on the allowlist.
 *   - When EXTEND_SAFE_TENANTS is configured (non-empty), it is an ENFORCED
 *     allowlist: any tenant not on it is refused. Sandbox tenants refresh
 *     weekly with production data and hold real employee records, so "not
 *     production" is not the same as "safe" — list only development tenants.
 *   - With no allowlist configured, only the production block applies
 *     (`allowlist_enforced: false` tells the caller the weaker mode is active).
 *
 * @param {string} tenantAlias
 * @param {{ prodTenant?: string, safeTenants?: Set<string> }} opts
 * @returns {{ blocked: boolean, reason?: string, safe: boolean, allowlist_enforced: boolean }}
 */
export function evaluateDeploy(tenantAlias, { prodTenant, safeTenants } = {}) {
  const allowlist = safeTenants instanceof Set ? safeTenants : new Set();
  const enforced = allowlist.size > 0;
  const safe = allowlist.has(tenantAlias);

  if (!prodTenant) {
    return {
      blocked: true,
      reason:
        'Deploy blocked: no production tenant is configured (EXTEND_PROD_TENANT is unset), ' +
        'so the production-safety guard cannot run. Set EXTEND_PROD_TENANT and restart.',
      safe,
      allowlist_enforced: enforced,
    };
  }

  if (tenantAlias === prodTenant) {
    return {
      blocked: true,
      reason:
        'Direct production deployment via MCP is disabled for safety. Deploy to a development ' +
        'tenant first, then promote through the Workday Developer Site.',
      safe,
      allowlist_enforced: enforced,
    };
  }

  if (enforced && !safe) {
    return {
      blocked: true,
      reason:
        `Deploy blocked: '${tenantAlias}' is not on the EXTEND_SAFE_TENANTS allowlist. ` +
        'Only listed development tenants are deployable. Note: sandbox tenants refresh weekly ' +
        'with PRODUCTION data and hold real employee records — do not add them casually. ' +
        'To allow this tenant, add it to EXTEND_SAFE_TENANTS and restart.',
      safe,
      allowlist_enforced: enforced,
    };
  }

  return { blocked: false, safe, allowlist_enforced: enforced };
}
