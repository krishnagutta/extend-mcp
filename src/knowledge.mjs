// Markdown knowledge base: parse a doc into ## sections and serve them by
// exact title or keyword. Pure functions — the tool layer reads the file.

/**
 * Split markdown into sections at `## ` headings. Content before the first
 * `## ` (the doc title/preamble) becomes the section titled '_intro'.
 * @returns {Array<{ title: string, body: string }>}
 */
export function parseSections(markdown) {
  const lines = String(markdown ?? '').split('\n');
  const sections = [];
  let current = { title: '_intro', body: [] };

  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  return sections
    .map((s) => ({ title: s.title, body: s.body.join('\n').trim() }))
    .filter((s) => s.title !== '_intro' || s.body.length > 0);
}

/**
 * Select sections. Precedence: exact (case-insensitive) title match wins;
 * otherwise keyword is matched case-insensitively against title AND body.
 * No query → all sections (caller typically lists titles only).
 */
export function findSections(sections, { section, keyword } = {}) {
  if (section) {
    const want = section.trim().toLowerCase();
    return sections.filter((s) => s.title.toLowerCase() === want);
  }
  if (keyword) {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [];
    return sections.filter(
      (s) => s.title.toLowerCase().includes(kw) || s.body.toLowerCase().includes(kw)
    );
  }
  return sections;
}
