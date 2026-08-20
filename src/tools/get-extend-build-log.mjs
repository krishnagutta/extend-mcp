import { z } from 'zod';
import { wdcli } from '../wdcli.mjs';
import { diagnoseBuildLog } from '../build-log.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'get_extend_build_log',
    'Fetch the build log for a specific build (get build ids from list_extend_app_builds). Automatically flags the empty-log parse-error signature: a log stopping after "Downloading source code" means the grammar never parsed — unknown property, non-ASCII character, or id collision, not a logic error.',
    {
      build_id: z.string().describe('Build ID from list_extend_app_builds'),
    },
    async ({ build_id }) => {
      const result = await wdcli(['app', 'builds', 'logs', build_id]);
      if (!result.ok) {
        return err('BUILD_LOG_FAILED', result.error, result.auth?.fix ?? 'Check the build id (list_extend_app_builds).');
      }

      const logText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
      const diagnosis = diagnoseBuildLog(logText);

      return ok({
        build_id,
        log: result.data,
        ...(diagnosis ? { build_diagnosis: diagnosis } : {}),
      });
    }
  );
}
