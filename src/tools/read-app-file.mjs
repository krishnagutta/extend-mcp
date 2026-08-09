import { z } from 'zod';
import { existsSync, readFileSync, statSync } from 'fs';
import { config } from '../config.mjs';
import { appDirFor, resolveWithin } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

const MAX_SIZE_BYTES = 500 * 1024;

export function register(server) {
  server.tool(
    'read_extend_app_file',
    'Read the content of a file from a downloaded Extend app. Supports .pmd, .amd, .smd, .json, .js files. Run download_extend_app first.',
    {
      reference_id: z.string().describe('App referenceId (e.g. myApp_gvptzl)'),
      file_path: z.string().describe('File path relative to app root (e.g. "presentation/home.pmd" or "appManifest.json")'),
    },
    async ({ reference_id, file_path }) => {
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

      if (!existsSync(absolute)) {
        return err('FILE_NOT_FOUND', `File '${file_path}' not found.`, 'Use list_extend_app_files to see available files.');
      }

      const stat = statSync(absolute);
      if (stat.size > MAX_SIZE_BYTES) {
        return err('FILE_TOO_LARGE', `File is ${Math.round(stat.size / 1024)}KB, max is 500KB.`, null);
      }

      const content = readFileSync(absolute, 'utf8');
      const ext = file_path.split('.').pop()?.toLowerCase();

      return ok({ file_path, extension: ext, size_bytes: stat.size, content });
    }
  );
}
