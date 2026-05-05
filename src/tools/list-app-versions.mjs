import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';

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

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
