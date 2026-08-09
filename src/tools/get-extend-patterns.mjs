import { z } from 'zod';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { parseSections, findSections } from '../knowledge.mjs';
import { ok, err } from '../respond.mjs';

// The doc ships with the server and is read on every call, so edits to it are
// served without a restart — knowledge reaches every workspace running this
// MCP, not just checkouts of this repo.
const DOC_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'knowledge', 'extend-patterns.md');

export function register(server) {
  server.tool(
    'get_extend_patterns',
    'Curated Workday Extend reference: app anatomy, PMD structure and scripting, widget quick reference, orchestration and Prism patterns (distilled from the official Workday DevRel catalog, Apache-2.0). Call with no arguments to list sections; pass section for one section verbatim, or keyword to search across all of them.',
    {
      section: z.string().optional().describe('Exact section title (e.g. "PMD scripting essentials"). Takes precedence over keyword.'),
      keyword: z.string().optional().describe('Case-insensitive keyword matched against section titles and bodies (e.g. "button", "error handler", "prism").'),
    },
    async ({ section, keyword }) => {
      let markdown;
      try {
        markdown = readFileSync(DOC_PATH, 'utf8');
      } catch (e) {
        return err('DOC_MISSING', `Knowledge doc not found at ${DOC_PATH}: ${e.message}`, 'Reinstall or git pull the extend-mcp repo.');
      }

      const sections = parseSections(markdown);

      if (!section && !keyword) {
        return ok({
          sections: sections.map((s) => s.title),
          hint: 'Pass section for full content, or keyword to search.',
        });
      }

      const found = findSections(sections, { section, keyword });
      if (found.length === 0) {
        return err(
          'NO_MATCH',
          section ? `No section titled '${section}'.` : `No section mentions '${keyword}'.`,
          `Available sections: ${sections.map((s) => s.title).join(' | ')}`
        );
      }

      return ok({ sections: found });
    }
  );
}
