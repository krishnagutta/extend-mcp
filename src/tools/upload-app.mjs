import { z } from 'zod';
import { join } from 'path';
import { existsSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';

export function register(server) {
  server.tool(
    'upload_extend_app',
    'Upload a locally edited Extend app back to Workday. This triggers a build. Wait for build completion before deploying. Run download_extend_app and make edits first.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
      wait_for_build: z.boolean().default(true).describe('Wait for build to complete before returning (default: true). Set false for large apps.'),
    },
    async ({ reference_id, wait_for_build }) => {
      const appDir = join(config.workDir, reference_id);

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app and edit files first.');
      }

      const args = ['app', 'upload', appDir];
      if (!wait_for_build) args.push('--no-build-wait');

      const result = await wdcliRaw(args, { timeout: 300_000 });

      return ok({
        success: result.ok,
        referenceId: reference_id,
        output: result.data ?? result.error,
        next_step: result.ok
          ? 'Upload complete. Use list_extend_app_versions to find the new version, then deploy_extend_app to deploy it.'
          : 'Upload failed. Check the output for errors.',
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
