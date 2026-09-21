// Schema-by-example: an attribute inventory computed from REAL Extend app files
// (the Workday DevRel corpus, optionally plus a local app directory). It exists
// so nobody — human or model — writes component syntax from memory: look up
// which attributes actually occur, how often, with which values, and where.
//
// Pure functions over a directory tree; the tool layer decides which dirs.

import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

// Component kinds keyed by file extension.
export const KIND_BY_EXT = {
  businessobject: 'businessobject', securitydomain: 'securitydomain', task: 'task',
  attachment: 'attachment', businessprocess: 'businessprocess', report: 'report',
  card: 'card', carddefinition: 'carddefinition', wqlquery: 'wqlquery',
  graphquery: 'graphquery', amd: 'amd', smd: 'smd',
  pmd: 'pmd', pod: 'pmd',
  orchestration: 'orchestration', suborchestration: 'orchestration',
};
export const KINDS = [...new Set(Object.values(KIND_BY_EXT)), 'pmd-widget', 'pmd-endpoint', 'orchestration-node', 'businessobject-field'];

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_DISTINCT_VALUES = 12;
const MAX_EXAMPLES = 3;
const SCRIPT_PLACEHOLDER = '<%script%>';

/**
 * Parse Extend component text. PMD/POD/WQL files are JSON whose "<% ... %>"
 * script strings may span lines (invalid JSON); those are collapsed to a
 * placeholder before a second attempt. Returns undefined when unparseable.
 */
export function tolerantParse(text) {
  const src = String(text ?? '');
  try {
    return JSON.parse(src);
  } catch {
    /* fall through */
  }
  try {
    return JSON.parse(src.replace(/"<%[\s\S]*?%>"/g, JSON.stringify(SCRIPT_PLACEHOLDER)));
  } catch {
    return undefined;
  }
}

function* walkFiles(dir, base = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full, base);
    else yield { full, rel: full.slice(base.length + 1) };
  }
}

function bucket(map, key) {
  let b = map.get(key);
  if (!b) {
    b = { count: 0, attrs: new Map(), examples: [] };
    map.set(key, b);
  }
  return b;
}

function noteAttr(b, attr, value) {
  let a = b.attrs.get(attr);
  if (!a) {
    a = { count: 0, values: new Map(), overflow: false, types: new Set() };
    b.attrs.set(attr, a);
  }
  a.count += 1;
  const t = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  a.types.add(t);
  if (t === 'string' || t === 'boolean' || t === 'number') {
    const v = t === 'string' && (value.includes('<%') || value.length > 60) ? undefined : value;
    if (v !== undefined && !a.overflow) {
      a.values.set(v, (a.values.get(v) ?? 0) + 1);
      if (a.values.size > MAX_DISTINCT_VALUES) {
        a.overflow = true;
        a.values.clear();
      }
    }
  }
}

function noteExample(b, rel) {
  if (b.examples.length < MAX_EXAMPLES && !b.examples.includes(rel)) b.examples.push(rel);
}

function noteObject(map, key, obj, rel) {
  const b = bucket(map, key);
  b.count += 1;
  noteExample(b, rel);
  for (const [k, v] of Object.entries(obj)) noteAttr(b, k, v);
}

function visit(node, fn) {
  if (Array.isArray(node)) node.forEach((n) => visit(n, fn));
  else if (node && typeof node === 'object') {
    fn(node);
    Object.values(node).forEach((n) => visit(n, fn));
  }
}

/**
 * Build the index over one or more roots.
 * @param {Array<{ dir: string, label: string }>} roots
 * @returns {{ kinds: Map<string, Map<string, object>>, files: number, unparsed: string[] }}
 */
export function buildSchemaIndex(roots) {
  const kinds = new Map(KINDS.map((k) => [k, new Map()]));
  let files = 0;
  const unparsed = [];

  for (const { dir, label } of roots) {
    if (!existsSync(dir)) continue;
    for (const { full, rel } of walkFiles(dir)) {
      const ext = rel.split('.').pop()?.toLowerCase();
      const kind = KIND_BY_EXT[ext];
      if (!kind || statSync(full).size > MAX_FILE_BYTES) continue;
      const where = `${label}/${rel}`;
      const doc = tolerantParse(readFileSync(full, 'utf8'));
      if (doc === undefined || typeof doc !== 'object') {
        unparsed.push(where);
        continue;
      }
      files += 1;

      if (kind === 'orchestration') {
        visit(doc, (o) => {
          if (typeof o._type === 'string' && o._value && typeof o._value === 'object' && !Array.isArray(o._value)) {
            noteObject(kinds.get('orchestration-node'), o._type, o._value, where);
          }
        });
        continue;
      }

      noteObject(kinds.get(kind), '(top level)', doc, where);

      if (kind === 'businessobject') {
        for (const f of Array.isArray(doc.fields) ? doc.fields : []) {
          if (f && typeof f === 'object') noteObject(kinds.get('businessobject-field'), String(f.type ?? '(no type)'), f, where);
        }
      }
      if (kind === 'pmd') {
        for (const key of ['endPoints', 'inboundEndpoints', 'outboundEndpoints', 'outboundData']) {
          const list = Array.isArray(doc[key]) ? doc[key] : Array.isArray(doc[key]?.outboundEndPoints) ? doc[key].outboundEndPoints : [];
          for (const e of list) if (e && typeof e === 'object') noteObject(kinds.get('pmd-endpoint'), key, e, where);
        }
        visit(doc.presentation ?? doc.seed ?? {}, (o) => {
          if (typeof o.type === 'string' && !o.type.includes('<%')) noteObject(kinds.get('pmd-widget'), o.type, o, where);
        });
      }
    }
  }
  return { kinds, files, unparsed };
}

/** Names available under a kind, most frequent first. */
export function listNames(index, kind) {
  const m = index.kinds.get(kind);
  if (!m) return [];
  return [...m.entries()].sort((a, b) => b[1].count - a[1].count).map(([name, b]) => ({ name, count: b.count }));
}

/** Attribute table for one name under a kind; undefined when unknown. */
export function describe(index, kind, name) {
  const b = index.kinds.get(kind)?.get(name);
  if (!b) return undefined;
  const attributes = [...b.attrs.entries()]
    .sort((x, y) => y[1].count - x[1].count)
    .map(([attr, a]) => ({
      attr,
      seen_in: a.count,
      of: b.count,
      types: [...a.types].sort(),
      ...(a.values.size > 0
        ? { values: [...a.values.entries()].sort((x, y) => y[1] - x[1]).map(([v, c]) => `${JSON.stringify(v)}×${c}`) }
        : {}),
    }));
  return { kind, name, occurrences: b.count, attributes, examples: b.examples };
}
