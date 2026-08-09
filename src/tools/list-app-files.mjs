import { z } from 'zod';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { config } from '../config.mjs';
import { appDirFor } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'list_extend_app_files',
    'List all local files for a downloaded Extend app. Run download_extend_app first. Shows file paths and sizes.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
    },
    async ({ reference_id }) => {
      const appDir = appDirFor(config.workDir, reference_id);
      if (!appDir) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      if (!existsSync(appDir)) {
        return err(
          'NOT_DOWNLOADED',
          `App '${reference_id}' has not been downloaded yet.`,
          'Run download_extend_app first.'
        );
      }

      const files = collectFiles(appDir, appDir);
      return ok({ referenceId: reference_id, local_dir: appDir, files });
    }
  );
}

function collectFiles(dir, base) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      const rel = full.slice(base.length + 1);
      const stat = statSync(full);
      files.push({ path: rel, size_bytes: stat.size, extension: entry.name.split('.').pop() });
    }
  }
  return files;
}
