import { z } from 'zod';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { wdcliRaw } from '../wdcli.mjs';
import { config } from '../config.mjs';
import { appDirFor } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

export function register(server) {
  server.tool(
    'download_extend_app',
    'Download a Workday Extend app source files to the local workspace. Required before reading or editing app files. Files are stored in EXTEND_WORK_DIR/<referenceId>/. If the app is already downloaded, pass overwrite: true to replace it (local edits are lost).',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      version: z.string().optional().describe('Version number to download (e.g. "427"). Omit for latest.'),
      overwrite: z.boolean().default(false).describe('Replace an existing local copy. Defaults to false so uncommitted local edits are not silently destroyed.'),
    },
    async ({ reference_id, version, overwrite }) => {
      const appDir = appDirFor(config.workDir, reference_id);
      if (!appDir) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      if (existsSync(appDir) && !overwrite) {
        return err(
          'ALREADY_DOWNLOADED',
          `App '${reference_id}' already exists locally at ${appDir}. Downloading would overwrite any local edits.`,
          'If you are sure, retry with overwrite: true. Unpushed edits are lost on overwrite (backups of files changed via write_extend_app_file are under EXTEND_WORK_DIR/.backups/).'
        );
      }

      const args = ['app', 'download', reference_id, '-d', appDir, '--overwrite'];

      if (version) {
        args.push('-v', version);
      } else {
        args.push('--latest-version');
      }

      const result = await wdcliRaw(args, { timeout: 60_000 });
      if (!result.ok) return err('DOWNLOAD_FAILED', result.error, 'Check the referenceId and version are correct.');

      const files = collectFiles(appDir);
      return ok({
        message: `Downloaded ${reference_id} to ${appDir}`,
        local_dir: appDir,
        files,
        wdcli_output: result.data,
      });
    }
  );
}

function collectFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      const rel = full.slice(base.length + 1);
      const stat = statSync(full);
      files.push({ path: rel, size_bytes: stat.size });
    }
  }
  return files;
}
