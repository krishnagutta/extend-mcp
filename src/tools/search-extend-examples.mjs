import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { config } from '../config.mjs';
import { ensureCorpus, searchCorpus, listApps } from '../examples-corpus.mjs';
import { ok, err } from '../respond.mjs';

const execFileAsync = promisify(execFile);

export function corpusDir() {
  return join(config.workDir, '.knowledge', 'wdp');
}

export function register(server) {
  server.tool(
    'search_extend_examples',
    'Search ~30 complete, working Extend apps from the official Workday DevRel repo (Apache-2.0) for real code: widgets, PMD scripts, orchestrations, business objects. Case-insensitive literal search; returns snippets with file locations and upstream GitHub links. First call shallow-clones the corpus (network + git required); pass refresh: true to pull updates.',
    {
      query: z.string().min(2).describe('Literal text to find (e.g. "fileUploader", "invoke({", "validResponseCodes")'),
      collection: z.enum(['catalog', 'examples']).default('catalog').describe('catalog = Workday-built apps (default); examples = community contributions'),
      app: z.string().optional().describe('Restrict to one app directory (e.g. "pmdWidgetDictionary"). Omit to search all.'),
      extension: z.string().optional().describe('Restrict to a file extension (e.g. "pmd", "script", "orchestration")'),
      limit: z.number().int().min(1).max(100).default(20).describe('Max matches (default 20)'),
      refresh: z.boolean().default(false).describe('git pull the corpus before searching'),
    },
    async ({ query, collection, app, extension, limit, refresh }) => {
      const dir = corpusDir();
      let corpusState;
      try {
        corpusState = (await ensureCorpus(execFileAsync, dir, { refresh })).state;
      } catch (e) {
        return err('CORPUS_UNAVAILABLE', `Could not clone/update the example corpus: ${e.message}`, 'Check network access and that git is installed.');
      }

      const result = searchCorpus(dir, { query, collection, app, extension, limit });

      if (result.files_scanned === 0 && app) {
        return err('APP_NOT_FOUND', `No app directory '${app}' in ${collection}/.`, `Known apps: ${listApps(dir, collection).join(', ')}`);
      }

      return ok({
        corpus: corpusState,
        query,
        total: result.matches.length,
        truncated: result.truncated,
        matches: result.matches,
        attribution: 'Source: Workday/WorkdayDeveloperProgram (Apache-2.0)',
      });
    }
  );
}
