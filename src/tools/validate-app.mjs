import { z } from 'zod';
import { existsSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { appDirFor } from '../workspace.mjs';
import { assessValidation } from '../validation-verdict.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'validate_extend_app',
    'Validate a downloaded Extend app without uploading. Catches schema and structural errors before upload. Run download_extend_app first.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
    },
    async ({ reference_id }) => {
      const appDir = appDirFor(config.workDir, reference_id);
      if (!appDir) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app first.');
      }

      const result = await wdcliRaw(['app', 'validate', '-d', appDir], { timeout: 60_000 });
      const verdict = assessValidation(result.ok, result.data ?? result.error);

      return ok({
        valid: verdict.valid,
        error_lines: verdict.error_lines,
        referenceId: reference_id,
        output: result.data ?? result.error,
      });
    }
  );
}
