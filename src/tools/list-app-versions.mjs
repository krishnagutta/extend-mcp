import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'list_extend_app_versions',
    'List all versions for a Workday Extend app. Versions have statuses: DEVELOPMENT, SANDBOX_RELEASE, IMPLEMENTATION_RELEASE, PRODUCTION_RELEASE.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
    },
    async ({ reference_id }) => {
      const result = await wdcli(['app', 'versions', reference_id]);
      if (!result.ok) return err('VERSIONS_FAILED', result.error);

      return ok({ referenceId: reference_id, versions: result.data });
    }
  );
}
