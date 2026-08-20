import { z } from 'zod';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchLearnings } from '../learnings.mjs';
import { ok } from '../respond.mjs';

const LEARNINGS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'knowledge', 'learnings');
const MAX_FULL_BODIES = 10;

export function register(server) {
  server.tool(
    'get_extend_learnings',
    'Query the learnings base (full-text query, tag filter, verification filter — AND-ed). Check here BEFORE debugging a build failure or writing an unfamiliar component: past failures with their prevention rules live here. No filters lists every learning.',
    {
      query: z.string().optional().describe('Full-text, case-insensitive (searches title, tags, body)'),
      tag: z.string().optional().describe('Exact tag (e.g. "build", "pmd", "rest-api")'),
      verification: z.enum(['unverified', 'build-verified', 'runtime-verified']).optional(),
    },
    async ({ query, tag, verification }) => {
      const entries = searchLearnings(LEARNINGS_DIR, { query, tag, verification });
      const full = entries.length <= MAX_FULL_BODIES;

      return ok({
        total: entries.length,
        learnings: entries.map((e) =>
          full
            ? e
            : { slug: e.slug, title: e.title, date: e.date, tags: e.tags, verification: e.verification }
        ),
        ...(full ? {} : { note: `Over ${MAX_FULL_BODIES} matches — summaries only. Narrow with query/tag to get full bodies.` }),
      });
    }
  );
}
