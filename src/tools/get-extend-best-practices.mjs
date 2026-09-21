import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { ensureCorpus, CORPUS_WEB } from '../examples-corpus.mjs';
import { parseSections, findSections } from '../knowledge.mjs';
import { corpusDir } from './search-extend-examples.mjs';
import { ok, err } from '../respond.mjs';

const execFileAsync = promisify(execFile);
const DOC_REL = 'docs/EXAMPLE_BEST_PRACTICES.md';
const RULES_REL = '.arcane-auditor/config.json';

export function register(server) {
  server.tool(
    'get_extend_best_practices',
    "Workday DevRel's own best-practices guide for Extend apps, served live from the official repo (Apache-2.0). It explains, rule by rule, the Arcane Auditor lint rules Workday runs on every example PR: portability (hardcoded ids/WIDs/API hosts), robustness (failOnStatusCodes, isCollection, session variables, security domains, grid paging with sortable/filterable), orchestration error handling, and PMD script hygiene. No arguments lists the rules and their configured severity; rule returns one explanation verbatim; keyword searches all of them. Cite these in design reviews instead of opinion.",
    {
      rule: z.string().optional().describe('Exact rule heading, e.g. "GridPagingWithSortableFilterableRule"'),
      keyword: z.string().optional().describe('Case-insensitive search across rule explanations, e.g. "grid", "endpoint", "security"'),
      refresh: z.boolean().default(false).describe('git pull the corpus first'),
    },
    async ({ rule, keyword, refresh }) => {
      const dir = corpusDir();
      try {
        await ensureCorpus(execFileAsync, dir, { refresh });
      } catch (e) {
        return err('CORPUS_UNAVAILABLE', `Could not clone/update the example corpus: ${e.message}`, 'Check network access and that git is installed.');
      }
      const docPath = join(dir, DOC_REL);
      if (!existsSync(docPath)) return err('DOC_MISSING', `${DOC_REL} is not in the corpus.`, 'Upstream may have moved it; search_extend_examples with extension "md".');

      const sections = parseSections(readFileSync(docPath, 'utf8'), { level: 3 }).filter((s) => s.title !== '_intro');
      let configured = {};
      try {
        configured = JSON.parse(readFileSync(join(dir, RULES_REL), 'utf8')).rules ?? {};
      } catch {
        /* rule config is optional context */
      }

      if (!rule && !keyword) {
        const explained = new Set(sections.map((s) => s.title));
        return ok({
          rules_explained: sections.map((s) => s.title),
          rules_configured_without_explanation: Object.keys(configured).filter((r) => !explained.has(r)),
          severity_overrides: Object.fromEntries(Object.entries(configured).filter(([, v]) => v?.severity_override).map(([k, v]) => [k, v.severity_override])),
          source: `${CORPUS_WEB}/${DOC_REL}`,
          hint: 'Pass rule for the full explanation, or keyword to search.',
        });
      }
      const found = findSections(sections, { section: rule, keyword });
      if (found.length === 0) {
        return err('NO_MATCH', rule ? `No rule titled '${rule}'.` : `No rule mentions '${keyword}'.`, `Rules: ${sections.map((s) => s.title).join(', ')}`);
      }
      return ok({ rules: found, source: `${CORPUS_WEB}/${DOC_REL}`, attribution: 'Source: Workday/WorkdayDeveloperProgram (Apache-2.0)' });
    }
  );
}
