import { z } from 'zod';
import { join } from 'path';
import { existsSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';

export function register(server) {
  server.tool(
    'validate_extend_app',
    'Validate a downloaded Extend app without uploading. Catches schema and structural errors before upload. Run download_extend_app first.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
    },
    async ({ reference_id }) => {
      const appDir = join(config.workDir, reference_id);

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app first.');
      }

      const result = await wdcliRaw(['app', 'validate', '-d', appDir], { timeout: 60_000 });
      const passed = result.ok && !result.data?.toLowerCase().includes('error');

      return ok({
        valid: passed,
        referenceId: reference_id,
        output: result.data ?? result.error,
      });
    }
  );
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(code, message, suggestion) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: true, code, message, suggestion }) }] };
}
