// Learnings loop: one FILE per learning (a single append-to file guarantees
// merge conflicts the moment the repo is shared), queryable by full text and
// tag, with a hard scrub: learnings must never contain credentials, bearer
// tokens, or tenant values — they live in a public repo.

import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

export const VERIFICATIONS = ['unverified', 'build-verified', 'runtime-verified'];

export function slugify(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Scrub check. `sensitiveValues` carries deploy-config values (prod tenant,
 * allowlisted tenants) that must never appear in a learning.
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function checkLearningSafety(text, { sensitiveValues = [] } = {}) {
  const t = String(text ?? '');
  const lower = t.toLowerCase();
  const violations = [];

  if (/client[_-]?secret|wdcli_client|api[_-]?key|password\s*[:=]/i.test(t)) {
    violations.push('credential-pattern');
  }
  if (/bearer\s+[A-Za-z0-9._~+/=-]{12,}/i.test(t)) {
    violations.push('bearer-token');
  }
  if (/\b[A-Za-z0-9+/_-]{48,}\b/.test(t)) {
    violations.push('long-token-run');
  }
  for (const value of sensitiveValues) {
    if (typeof value === 'string' && value.length >= 3 && lower.includes(value.toLowerCase())) {
      violations.push('tenant-value');
      break;
    }
  }

  return { ok: violations.length === 0, violations };
}

export function formatLearning({ title, date, tags, verification, corrects, what_happened, root_cause, rule, evidence }) {
  const front = [
    '---',
    `title: ${title}`,
    `date: ${date}`,
    `tags: [${(tags ?? []).join(', ')}]`,
    `verification: ${verification}`,
    ...(corrects ? [`corrects: ${corrects}`] : []),
    '---',
  ].join('\n');
  const body = [
    `**What happened:** ${what_happened}`,
    `**Root cause:** ${root_cause}`,
    `**Rule:** ${rule}`,
    ...(evidence ? [`**Evidence:** ${evidence}`] : []),
  ].join('\n\n');
  return `${front}\n\n${body}\n`;
}

/** Parse the minimal frontmatter format written by formatLearning. */
export function parseLearning(markdown) {
  const m = String(markdown ?? '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    meta[kv[1]] = kv[1] === 'tags'
      ? kv[2].replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      : kv[2].trim();
  }
  return { ...meta, body: m[2].trim() };
}

/**
 * Query learnings on disk. All filters are AND-ed; no filters returns all.
 * @returns {Array<{ slug, title, date, tags, verification, corrects?, body }>}
 */
export function searchLearnings(dir, { query, tag, verification } = {}) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
    const parsed = parseLearning(readFileSync(join(dir, name), 'utf8'));
    if (!parsed) continue;
    const entry = { slug: name.replace(/\.md$/, ''), ...parsed };
    if (tag && !(entry.tags ?? []).includes(tag)) continue;
    if (verification && entry.verification !== verification) continue;
    if (query) {
      const haystack = `${entry.title}\n${(entry.tags ?? []).join(' ')}\n${entry.body}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) continue;
    }
    results.push(entry);
  }
  return results;
}
