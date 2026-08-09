import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'list_extend_app_builds',
    'List build history for a specific version of a Workday Extend app. Useful for checking build status after an upload.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
      version: z.string().describe('Version number (e.g. "427" or "3.2"). Use list_extend_app_versions to find it.'),
    },
    async ({ reference_id, version }) => {
      const result = await wdcli(['app', 'builds', reference_id, '-v', version]);
      if (!result.ok) return err('BUILDS_FAILED', result.error);

      return ok({ referenceId: reference_id, version, builds: result.data });
    }
  );
}
