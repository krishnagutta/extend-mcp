import { z } from 'zod';
import { join, dirname, relative } from 'path';
import { existsSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { config } from '../config.mjs';
import { appDirFor, resolveWithin } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

// Backups live OUTSIDE the app directory: wdcli uploads the whole app dir, so
// a .bak beside the source would ship to Workday inside the app build.
function backupPathFor(referenceId, absoluteFile, appDir) {
  const rel = relative(appDir, absoluteFile);
  return join(config.workDir, '.backups', referenceId, rel + '.bak');
}

export function register(server) {
  server.tool(
    'write_extend_app_file',
    'Write or update a file in a downloaded Extend app. Backs up the previous version under EXTEND_WORK_DIR/.backups/ before overwriting. Run upload_extend_app after editing to push changes to Workday.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      file_path: z.string().describe('File path relative to app root (e.g. "presentation/home.pmd")'),
      content: z.string().describe('Full file content to write'),
    },
    async ({ reference_id, file_path, content }) => {
      const appDir = appDirFor(config.workDir, reference_id);
      if (!appDir) {
        return err('INVALID_REFERENCE_ID', `'${reference_id}' is not a valid referenceId.`, 'Use list_extend_apps to find the exact referenceId.');
      }

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app first.');
      }

      const absolute = resolveWithin(appDir, file_path);
      if (!absolute) {
        return err('PATH_TRAVERSAL', 'File path must be within the app directory.', null);
      }

      let backupPath = null;
      if (existsSync(absolute)) {
        backupPath = backupPathFor(reference_id, absolute, appDir);
        mkdirSync(dirname(backupPath), { recursive: true });
        copyFileSync(absolute, backupPath);
      }

      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, 'utf8');
      const size = statSync(absolute).size;

      return ok({
        message: `Written ${file_path} (${size} bytes). Run upload_extend_app to push to Workday.`,
        file_path,
        size_bytes: size,
        backup: backupPath,
      });
    }
  );
}
