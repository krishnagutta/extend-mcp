import { z } from 'zod';
import { join, resolve, normalize, dirname } from 'path';
import { existsSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { config } from '../config.mjs';

export function register(server) {
  server.tool(
    'write_extend_app_file',
    'Write or update a file in a downloaded Extend app. Creates a .bak backup before overwriting. Run upload_extend_app after editing to push changes to Workday.',
    {
      reference_id: z.string().describe('App referenceId (e.g. spotBonus_gvptzl)'),
      file_path: z.string().describe('File path relative to app root (e.g. "presentation/home.pmd")'),
      content: z.string().describe('Full file content to write'),
    },
    async ({ reference_id, file_path, content }) => {
      const appDir = join(config.workDir, reference_id);

      if (!existsSync(appDir)) {
        return err('NOT_DOWNLOADED', `App '${reference_id}' is not downloaded.`, 'Run download_extend_app first.');
      }

      const absolute = resolve(join(appDir, normalize(file_path)));
      if (!absolute.startsWith(appDir)) {
        return err('PATH_TRAVERSAL', 'File path must be within the app directory.', null);
      }

      mkdirSync(dirname(absolute), { recursive: true });

      if (existsSync(absolute)) {
        copyFileSync(absolute, absolute + '.bak');
      }

      writeFileSync(absolute, content, 'utf8');
      const size = statSync(absolute).size;

      return ok({
        message: `Written ${file_path} (${size} bytes). Run upload_extend_app to push to Workday.`,
        file_path,
        size_bytes: size,
        backup_created: existsSync(absolute + '.bak'),
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
