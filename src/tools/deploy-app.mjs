import { z } from 'zod';
import { wdcliRaw } from '../wdcli.mjs';

const SAFE_TENANTS = new Set(['lyft-sb', 'lyft_preview', 'lyft_wcpdev1', 'lyft1', 'lyft2', 'lyft3', 'lyft6']);
const PROD_TENANT = 'lyft';

export function register(server) {
  server.tool(
    'deploy_extend_app',
    'Deploy a specific version of an Extend app to a Workday tenant. CAUTION: deploying to "lyft" deploys to PRODUCTION. Use "lyft-sb" or "lyft1" for testing. Use list_extend_tenants to see all available tenants.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
      tenant_alias: z.string().describe('Tenant to deploy to (e.g. "lyft-sb" for sandbox, "lyft1" for impl, "lyft" for PROD). Use list_extend_tenants to see all.'),
      version: z.string().optional().describe('Version number to deploy (e.g. "428"). Omit for latest.'),
    },
    async ({ reference_id, tenant_alias, version }) => {
      const isProd = tenant_alias === PROD_TENANT;
      const isSafe = SAFE_TENANTS.has(tenant_alias);

      if (isProd) {
        return ok({
          blocked: true,
          reason: 'Direct production deployment via MCP is disabled for safety. Deploy to sandbox (lyft-sb) or impl (lyft1) first, then promote through the Workday Developer Site.',
          tenant: tenant_alias,
        });
      }

      const args = ['app', 'deploy', reference_id, '-t', tenant_alias];
      if (version) args.push('-v', version);
      else args.push('--latest-version');

      const result = await wdcliRaw(args, { timeout: 120_000 });

      return ok({
        success: result.ok,
        referenceId: reference_id,
        tenant: tenant_alias,
        version: version ?? 'latest',
        output: result.data ?? result.error,
      });
    }
  );
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
