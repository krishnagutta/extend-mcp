// Runtime-cached copy of Workday/WorkdayDeveloperProgram (Apache-2.0, official
// Workday DevRel): ~30 complete Extend apps used as a searchable example
// corpus. The repo is shallow-cloned on first use into
// <workDir>/.knowledge/wdp rather than vendored — it is 10+ MB and upstream
// keeps it current.

import { join, sep } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

export const CORPUS_REPO = 'https://github.com/Workday/WorkdayDeveloperProgram.git';
export const CORPUS_WEB = 'https://github.com/Workday/WorkdayDeveloperProgram/blob/main';

// Text formats found in the corpus; everything else (images, archives) is skipped.
const TEXT_EXTENSIONS = new Set([
  'pmd', 'amd', 'smd', 'pod', 'script', 'orchestration', 'suborchestration',
  'businessobject', 'task', 'securitydomain', 'attachment', 'carddefinition',
  'json', 'md', 'wql', 'csv', 'xml', 'xsl', 'yaml', 'yml', 'txt',
]);

const MAX_FILE_BYTES = 500 * 1024;

export function isTextFile(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Ensure the corpus clone exists (and optionally refresh it).
 * @param {Function} execFileImpl promisified execFile
 * @param {string} corpusDir      target directory for the clone
 * @returns {Promise<{ state: 'cloned'|'updated'|'cached' }>}
 */
export async function ensureCorpus(execFileImpl, corpusDir, { refresh = false } = {}) {
  if (!existsSync(join(corpusDir, '.git'))) {
    await execFileImpl('git', ['clone', '--depth', '1', CORPUS_REPO, corpusDir], {
      timeout: 120_000,
    });
    return { state: 'cloned' };
  }
  if (refresh) {
    await execFileImpl('git', ['-C', corpusDir, 'pull', '--ff-only', '--depth', '1'], {
      timeout: 120_000,
    });
    return { state: 'updated' };
  }
  return { state: 'cached' };
}

/** List app directories under a corpus collection ('catalog' or 'examples'). */
export function listApps(corpusDir, collection) {
  const dir = join(corpusDir, collection);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function* walkTextFiles(dir, base = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTextFiles(full, base);
    } else if (isTextFile(entry.name) && statSync(full).size <= MAX_FILE_BYTES) {
      yield { full, rel: full.slice(base.length + 1) };
    }
  }
}

/**
 * Case-insensitive literal search across a collection's text files.
 * @returns {{ matches: Array<{app,file,line,snippet,url}>, truncated: boolean, files_scanned: number }}
 */
export function searchCorpus(corpusDir, { query, collection = 'catalog', app, extension, limit = 20 }) {
  const root = join(corpusDir, collection);
  if (!existsSync(root)) return { matches: [], truncated: false, files_scanned: 0 };

  const needle = query.toLowerCase();
  const apps = app ? [app] : listApps(corpusDir, collection);
  const matches = [];
  let filesScanned = 0;
  let truncated = false;

  outer: for (const appName of apps) {
    const appDir = join(root, appName);
    if (!existsSync(appDir)) continue;

    for (const { full, rel } of walkTextFiles(appDir)) {
      if (extension && rel.split('.').pop()?.toLowerCase() !== extension.toLowerCase()) continue;
      filesScanned++;
      const lines = readFileSync(full, 'utf8').split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].toLowerCase().includes(needle)) continue;
        const from = Math.max(0, i - 2);
        const to = Math.min(lines.length, i + 3);
        matches.push({
          app: appName,
          file: rel,
          line: i + 1,
          snippet: lines.slice(from, to).join('\n'),
          url: `${CORPUS_WEB}/${collection}/${appName}/${rel.split(sep).join('/')}`,
        });
        if (matches.length >= limit) {
          truncated = true;
          break outer;
        }
        i = to - 1; // don't emit overlapping snippets from the same cluster
      }
    }
  }

  return { matches, truncated, files_scanned: filesScanned };
}
