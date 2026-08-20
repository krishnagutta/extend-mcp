import { z } from 'zod';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { config } from '../config.mjs';
import { slugify, checkLearningSafety, formatLearning, VERIFICATIONS } from '../learnings.mjs';
import { ok, err } from '../respond.mjs';

const LEARNINGS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'knowledge', 'learnings');

export function register(server) {
  server.tool(
    'log_extend_learning',
    'Record a development learning as one file in the repo-tracked learnings base (docs/knowledge/learnings/). Use after any failure that cost a build, or when a rule turns out to be wrong (corrections are themselves learnings — pass corrects). Content is scrubbed: credentials, bearer tokens, and configured tenant values are refused because this repo is public. Tag verification honestly: a green build proves parsing, not runtime behavior.',
    {
      title: z.string().min(5).describe('Short imperative summary (e.g. "Explicit limit required on collection reads")'),
      what_happened: z.string().describe('The observed failure or surprise, concretely'),
      root_cause: z.string().describe('Why it happened'),
      rule: z.string().describe('The rule that prevents a repeat'),
      tags: z.array(z.string()).default([]).describe('Lowercase topic tags (e.g. ["pmd", "build", "rest-api"])'),
      verification: z.enum(['unverified', 'build-verified', 'runtime-verified']).default('unverified').describe('build-verified = a build proved it; runtime-verified = observed in a running tenant'),
      evidence: z.string().optional().describe('Build ids, file paths, or links that back this up (no tenant values)'),
      corrects: z.string().optional().describe('Slug of an earlier learning this one corrects'),
    },
    async ({ title, what_happened, root_cause, rule, tags, verification, evidence, corrects }) => {
      const sensitiveValues = [config.prodTenant, ...config.safeTenants, config.clientId, config.clientSecret];
      const combined = [title, what_happened, root_cause, rule, evidence, ...tags].filter(Boolean).join('\n');
      const safety = checkLearningSafety(combined, { sensitiveValues });
      if (!safety.ok) {
        return err(
          'SENSITIVE_CONTENT',
          `Learning refused by scrub: ${safety.violations.join(', ')}. This repo is public.`,
          'Rewrite with placeholders (<TENANT>, <SECRET>) — never real tenant aliases or credential material.'
        );
      }

      const date = new Date().toISOString().slice(0, 10);
      const slug = `${date}-${slugify(title)}`;
      const path = join(LEARNINGS_DIR, `${slug}.md`);
      if (existsSync(path)) {
        return err('DUPLICATE_SLUG', `A learning '${slug}' already exists.`, 'Pick a more specific title, or pass corrects to amend it.');
      }

      mkdirSync(LEARNINGS_DIR, { recursive: true });
      writeFileSync(path, formatLearning({ title, date, tags, verification, corrects, what_happened, root_cause, rule, evidence }), 'utf8');

      return ok({
        slug,
        path,
        verification,
        note: 'One file per learning; commit it so teammates get it. Promote stable rules into extend-patterns.md after verification.',
      });
    }
  );
}
