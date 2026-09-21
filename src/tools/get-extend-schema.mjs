import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { ensureCorpus, CORPUS_WEB } from '../examples-corpus.mjs';
import { buildSchemaIndex, listNames, describe, KINDS } from '../schema-index.mjs';
import { appDirFor, isValidReferenceId } from '../workspace.mjs';
import { config } from '../config.mjs';
import { corpusDir } from './search-extend-examples.mjs';
import { ok, err } from '../respond.mjs';

const execFileAsync = promisify(execFile);
let cache = { key: '', index: null };

function getIndex(dir, localApp) {
  const head = join(dir, '.git', 'HEAD');
  const stamp = existsSync(head) ? statSync(head).mtimeMs : 0;
  const key = `${dir}|${stamp}|${localApp ?? ''}`;
  if (cache.key !== key) {
    const roots = [
      { dir: join(dir, 'catalog'), label: 'catalog' },
      { dir: join(dir, 'examples'), label: 'examples' },
    ];
    if (localApp) roots.push({ dir: localApp, label: 'local' });
    cache = { key, index: buildSchemaIndex(roots) };
  }
  return cache.index;
}

export function register(server) {
  server.tool(
    'get_extend_schema',
    'Schema-by-example for Extend components: which attributes ACTUALLY occur in real app files (official Workday DevRel corpus, Apache-2.0), how often, with which values, and in which files. Use BEFORE writing or reviewing any component so syntax is looked up, never recalled. kind alone lists the names found (widget types, orchestration node types, business-object field types); kind + name returns the attribute table with example files. Kinds: ' + KINDS.join(', ') + '. Top-level file shape is under name "(top level)".',
    {
      kind: z.enum(KINDS).describe('Component kind, e.g. "pmd-widget", "businessobject-field", "orchestration-node", "pmd-endpoint", "securitydomain"'),
      name: z.string().optional().describe('e.g. "grid" (pmd-widget), "SINGLE_INSTANCE" (businessobject-field), "BatchLoop" (orchestration-node), "(top level)"'),
      include_app: z.string().optional().describe('Reference id of a locally downloaded app to fold into the index (label "local") so you can compare it with the corpus'),
      refresh: z.boolean().default(false).describe('git pull the corpus first'),
    },
    async ({ kind, name, include_app, refresh }) => {
      const dir = corpusDir();
      try {
        await ensureCorpus(execFileAsync, dir, { refresh });
      } catch (e) {
        return err('CORPUS_UNAVAILABLE', `Could not clone/update the example corpus: ${e.message}`, 'Check network access and that git is installed.');
      }
      let localDir;
      if (include_app) {
        if (!isValidReferenceId(include_app)) {
          return err('BAD_APP', `'${include_app}' is not a valid app reference id.`, 'Pass the reference id of an app you downloaded with download_extend_app.');
        }
        localDir = appDirFor(config.workDir, include_app);
        if (!existsSync(localDir)) return err('APP_NOT_DOWNLOADED', `No local copy of '${include_app}'.`, 'Run download_extend_app first.');
      }

      const index = getIndex(dir, localDir);
      if (!name) {
        return ok({ kind, files_indexed: index.files, names: listNames(index, kind), hint: 'Pass name for the attribute table.' });
      }
      const d = describe(index, kind, name);
      if (!d) {
        const names = listNames(index, kind).slice(0, 40).map((n) => n.name);
        return err('NO_SUCH_NAME', `'${name}' does not occur under ${kind} in the indexed files.`, `It may not exist — do not invent it. Names that do occur: ${names.join(', ')}`);
      }
      return ok({
        ...d,
        example_urls: d.examples.filter((e) => !e.startsWith('local/')).map((e) => `${CORPUS_WEB}/${e}`),
        reading: 'seen_in/of = how many occurrences carry the attribute. Absent attributes are not proof they are invalid, only that no indexed app uses them.',
        attribution: 'Source: Workday/WorkdayDeveloperProgram (Apache-2.0)',
      });
    }
  );
}
