# Knowledge intake log

Append-only. Raw observations land here with a date and source; they are
promoted into `extend-patterns.md` only after being verified against current
code or a live tenant (validator passing is not verification). Promoted or
disproven entries get struck through with a note, never deleted.

---

- **2026-08-09** (source: WorkdayDeveloperProgram corpus read) — `taskReference.parameterBindings` silently overrides `taskReference.parameters` when both are set; the widget dictionary's own `buttons.pmd` carries a `_comment` warning about it. → promoted to extend-patterns.md §PMD page structure.
- **2026-08-09** (source: corpus read) — PMD Script lambdas that return object literals require a nested `{ { ... } }` brace block; a single brace is parsed as a statement block and returns nothing. → promoted to §PMD scripting essentials.
- **2026-08-09** (source: upstream repo docs) — upstream `catalog/` rejects external PRs (CODEOWNERS + DevRel review); `examples/` accepts community contributions, approved types include "Agent Skill". → promoted to §Contributing upstream.
