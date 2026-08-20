import { z } from 'zod';
import { join } from 'path';
import { existsSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { isValidAppName, buildCreateArgs } from '../lifecycle-args.mjs';
import { diagnoseBuildLog } from '../build-log.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'create_extend_app',
    'Create a new Extend app: scaffolds it under EXTEND_WORK_DIR and registers it with Workday (triggering a first build). CAUTION: apps are PERMANENT — WDCLI has no delete — and the app is named <name>_<orgShortId> (see get_extend_whoami). Name throwaways obviously, e.g. "zzTest ...".',
    {
      app_name: z.string().describe('New app name, e.g. "Vendor Onboarding". Becomes the permanent referenceId prefix.'),
      description: z.string().optional().describe('Optional app description'),
      app_type: z.enum(['EXTEND', 'AGENT', 'INTEGRATION']).default('EXTEND'),
      wait_for_build: z.boolean().default(true).describe('Wait for the first build to complete (default true)'),
    },
    async ({ app_name, description, app_type, wait_for_build }) => {
      if (!isValidAppName(app_name)) {
        return err('INVALID_APP_NAME', `'${app_name}' is not a valid app name.`, 'Use 3-80 chars: letters, digits, spaces, - or _, starting with a letter or digit.');
      }

      const args = buildCreateArgs({
        appName: app_name,
        directory: config.workDir,
        description,
        appType: app_type,
        waitForBuild: wait_for_build,
      });

      const result = await wdcliRaw(args, { timeout: 300_000 });
      const outputText = result.data ?? result.error ?? '';
      const diagnosis = result.ok ? null : diagnoseBuildLog(outputText);

      return ok({
        success: result.ok,
        app_name,
        app_type,
        work_dir: config.workDir,
        output: outputText,
        ...(diagnosis ? { build_diagnosis: diagnosis } : {}),
        ...(result.auth ? { auth_failure: result.auth } : {}),
        next_step: result.ok
          ? 'App created (permanently). Use list_extend_apps to find its referenceId, then list_extend_app_files to explore the scaffold.'
          : 'Create failed. Check the output for errors.',
      });
    }
  );
}
