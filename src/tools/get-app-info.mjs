import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';

export function register(server) {
  server.tool(
    'get_extend_app_info',
    'Get detailed information about a specific Workday Extend app including all versions and their promotion status.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl). Use list_extend_apps to find it.'),
    },
    async ({ reference_id }) => {
      const result = await wdcli(['app', 'info', reference_id]);
      if (!result.ok) return err('INFO_FAILED', result.error, 'Check the referenceId is correct.');

      return ok(result.data);
    }
  );
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
