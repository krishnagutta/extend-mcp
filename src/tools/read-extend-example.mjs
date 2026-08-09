import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { config } from '../config.mjs';
import { ensureCorpus, listApps, CORPUS_WEB } from '../examples-corpus.mjs';
import { isValidReferenceId, resolveWithin } from '../workspace.mjs';
import { ok, err } from '../respond.mjs';

const execFileAsync = promisify(execFile);
const MAX_SIZE_BYTES = 500 * 1024;

export function register(server) {
  server.tool(
    'read_extend_example',
    'Read a full file from the Workday DevRel example corpus (use search_extend_examples to find files, or pass app with no file_path to list an app\'s files). These are complete working apps — ideal as templates when writing PMDs, scripts, or orchestrations.',
    {
      app: z.string().describe('App directory name (e.g. "pmdScripting", "orchestrationToolkit")'),
      file_path: z.string().optional().describe('File path within the app (e.g. "presentation/scripts/dataManipulation.script"). Omit to list the app\'s files.'),
      collection: z.enum(['catalog', 'examples']).default('catalog'),
    },
    async ({ app, file_path, collection }) => {
      if (!isValidReferenceId(app)) {
        return err('INVALID_APP', `'${app}' is not a valid app directory name.`, null);
      }

      const dir = join(config.workDir, '.knowledge', 'wdp');
      try {
        await ensureCorpus(execFileAsync, dir, {});
      } catch (e) {
        return err('CORPUS_UNAVAILABLE', `Could not clone the example corpus: ${e.message}`, 'Check network access and that git is installed.');
      }

      const appDir = join(dir, collection, app);
      if (!existsSync(appDir)) {
        return err('APP_NOT_FOUND', `No app '${app}' in ${collection}/.`, `Known apps: ${listApps(dir, collection).join(', ')}`);
      }

      if (!file_path) {
        const result = await execFileAsync('git', ['-C', appDir, 'ls-files'], { timeout: 10_000 });
        return ok({ app, files: result.stdout.trim().split('\n') });
      }

      const absolute = resolveWithin(appDir, file_path);
      if (!absolute) {
        return err('PATH_TRAVERSAL', 'File path must be within the app directory.', null);
      }
      if (!existsSync(absolute)) {
        return err('FILE_NOT_FOUND', `'${file_path}' not found in ${app}.`, 'Call read_extend_example without file_path to list files.');
      }
      const stat = statSync(absolute);
      if (stat.size > MAX_SIZE_BYTES) {
        return err('FILE_TOO_LARGE', `File is ${Math.round(stat.size / 1024)}KB, max is 500KB.`, null);
      }

      return ok({
        app,
        file_path,
        size_bytes: stat.size,
        content: readFileSync(absolute, 'utf8'),
        url: `${CORPUS_WEB}/${collection}/${app}/${file_path}`,
        attribution: 'Source: Workday/WorkdayDeveloperProgram (Apache-2.0)',
      });
    }
  );
}
