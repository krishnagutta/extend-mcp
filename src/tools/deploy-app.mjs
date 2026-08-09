import { z } from 'zod';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { evaluateDeploy } from '../tenant-guard.mjs';
import { ok } from '../respond.mjs';

export function register(server) {
  server.tool(
    'deploy_extend_app',
    'Deploy a specific version of an Extend app to a Workday tenant. CAUTION: deploying to your production tenant deploys to PRODUCTION — that is blocked by default. Use a sandbox (e.g. "<tenant>-sb") or impl tenant for testing. Use list_extend_tenants to see all available tenants.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      tenant_alias: z.string().describe('Tenant to deploy to (e.g. "<tenant>-sb" for sandbox, "<tenant>1" for impl). Deploys to the configured production tenant are refused. Use list_extend_tenants to see all.'),
      version: z.string().optional().describe('Version number to deploy (e.g. "428"). Omit for latest.'),
    },
    async ({ reference_id, tenant_alias, version }) => {
      const decision = evaluateDeploy(tenant_alias, {
        prodTenant: config.prodTenant,
        safeTenants: config.safeTenants,
      });

      if (decision.blocked) {
        return ok({
          blocked: true,
          reason: decision.reason,
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
        safe: decision.safe,
        version: version ?? 'latest',
        output: result.data ?? result.error,
      });
    }
  );
}
