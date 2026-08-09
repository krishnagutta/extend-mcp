import { z } from 'zod';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { appDirFor } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

// Backups now live outside the app dir, but earlier versions of
// write_extend_app_file left .bak files beside the source — those would be
// uploaded into the app build. Refuse until they are cleaned up.
function findBakFiles(dir, base = dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findBakFiles(full, base));
    else if (entry.name.endsWith('.bak')) found.push(full.slice(base.length + 1));
  }
  return found;
}

export function register(server) {
  server.tool(
    'upload_extend_app',
    'Upload a locally edited Extend app back to Workday. This triggers a build. Wait for build completion before deploying. Run download_extend_app and make edits first.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      wait_for_build: z.boolean().default(true).describe('Wait for build to complete before returning (default: true). Set false for large apps.'),
    },
    async ({ reference_id, wait_for_build }) => {
      const appDir = appDirFor(config.workDir, reference_id);
      if (!appDir) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app and edit files first.');
      }

      const bakFiles = findBakFiles(appDir);
      if (bakFiles.length > 0) {
        return err(
          'BAK_FILES_PRESENT',
          `Refusing to upload: ${bakFiles.length} .bak file(s) inside the app directory would be shipped into the app build: ${bakFiles.join(', ')}`,
          'Delete them (they are stale backups from an older version of write_extend_app_file) and retry.'
        );
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
