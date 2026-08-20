import { z } from 'zod';
import { join } from 'path';
import { existsSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { appDirFor } from '../workspace.mjs';
import { isValidAppName, buildCopyArgs } from '../lifecycle-args.mjs';
import { slugify } from '../learnings.mjs';
import { diagnoseBuildLog } from '../build-log.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'copy_extend_app',
    'Copy a DOWNLOADED Extend app into a new app with a new name and referenceId (then uploads and builds the copy). The source app must be downloaded first (download_extend_app) — wdcli\'s copy-by-reference-id path silently uploads nothing, so this tool always copies from the local directory. CAUTION: the new app is permanent.',
    {
      source_reference_id: z.string().describe('referenceId of the DOWNLOADED source app'),
      new_name: z.string().describe('Name for the new app, e.g. "Vendor Onboarding V2"'),
      description: z.string().optional().describe('Optional description for the new app'),
      wait_for_build: z.boolean().default(true).describe('Wait for the copy\'s first build (default true)'),
    },
    async ({ source_reference_id, new_name, description, wait_for_build }) => {
      const sourceDir = appDirFor(config.workDir, source_reference_id);
      if (!sourceDir) {
        return err('INVALID_REFERENCE_ID', `'${source_reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }
      if (!existsSync(sourceDir)) {
        return err(
          'NOT_DOWNLOADED',
          `Source app '${source_reference_id}' is not downloaded. Copy must run from a LOCAL directory — the copy-by-reference-id path silently uploads nothing.`,
          'Run download_extend_app first, then retry.'
        );
      }
      if (!isValidAppName(new_name)) {
        return err('INVALID_APP_NAME', `'${new_name}' is not a valid app name.`, 'Use 3-80 chars: letters, digits, spaces, - or _, starting with a letter or digit.');
      }

      const destinationDir = join(config.workDir, slugify(new_name) || 'copied-app');
      if (existsSync(destinationDir)) {
        return err('DESTINATION_EXISTS', `Destination '${destinationDir}' already exists.`, 'Pick a different new_name or remove the directory.');
      }

      const args = buildCopyArgs({ sourceDir, destinationDir, newName: new_name, description, waitForBuild: wait_for_build });
      const result = await wdcliRaw(args, { timeout: 300_000 });
      const outputText = result.data ?? result.error ?? '';
      const diagnosis = result.ok ? null : diagnoseBuildLog(outputText);

      return ok({
        success: result.ok,
        source_reference_id,
        new_name,
        destination_dir: destinationDir,
        output: outputText,
        ...(diagnosis ? { build_diagnosis: diagnosis } : {}),
        ...(result.auth ? { auth_failure: result.auth } : {}),
        next_step: result.ok
          ? 'Copy created (permanently). Use list_extend_apps to find the new referenceId.'
          : 'Copy failed. Check the output for errors.',
      });
    }
  );
}
