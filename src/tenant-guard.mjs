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
 *   - Deploys to the configured production tenant are always blocked.
 *   - Any other tenant is allowed; `safe` reports whether it is on the
 *     optional advisory allowlist.
 *
 * @param {string} tenantAlias
 * @param {{ prodTenant?: string, safeTenants?: Set<string> }} opts
 * @returns {{ blocked: boolean, reason?: string, safe: boolean }}
 */
export function evaluateDeploy(tenantAlias, { prodTenant, safeTenants } = {}) {
  const safe = safeTenants instanceof Set ? safeTenants.has(tenantAlias) : false;

  if (!prodTenant) {
    return {
      blocked: true,
      reason:
        'Deploy blocked: no production tenant is configured (EXTEND_PROD_TENANT is unset), ' +
        'so the production-safety guard cannot run. Set EXTEND_PROD_TENANT and restart.',
      safe,
    };
  }

  if (tenantAlias === prodTenant) {
    return {
      blocked: true,
      reason:
        'Direct production deployment via MCP is disabled for safety. Deploy to a sandbox ' +
        '(e.g. <tenant>-sb) or impl tenant first, then promote through the Workday Developer Site.',
      safe,
    };
  }

  return { blocked: false, safe };
}
