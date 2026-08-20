# Knowledge intake log

> **Superseded for new entries (2026-08-20):** new raw observations go into
> `learnings/` as ONE FILE PER LEARNING via the `log_extend_learning` tool —
> a shared append-to-one-file log guarantees merge conflicts. This file stays
> as the historical record of pre-tool entries. The promotion rule is
> unchanged: verify against current code or a live tenant before promoting
> into `extend-patterns.md`; promoted or disproven entries get struck through
> with a note, never deleted.

---

- **2026-08-09** (source: WorkdayDeveloperProgram corpus read) — `taskReference.parameterBindings` silently overrides `taskReference.parameters` when both are set; the widget dictionary's own `buttons.pmd` carries a `_comment` warning about it. → promoted to extend-patterns.md §PMD page structure.
- **2026-08-09** (source: corpus read) — PMD Script lambdas that return object literals require a nested `{ { ... } }` brace block; a single brace is parsed as a statement block and returns nothing. → promoted to §PMD scripting essentials.
- **2026-08-09** (source: upstream repo docs) — upstream `catalog/` rejects external PRs (CODEOWNERS + DevRel review); `examples/` accepts community contributions, approved types include "Agent Skill". → promoted to §Contributing upstream.
- **2026-08-20** (source: workday-developer-mcp bootstrap prompt, from a session that ran live WDCLI; not independently re-verified here) — three-credential model (account session / per-tenant token via browser SSO / ~1h API Explorer token); sandbox tenants refresh weekly with production data; `config show`/`auth token`/`tenant token` print live bearer tokens; empty build log after "Downloading source code" = parse error; green build ≠ runtime-verified; app REST API silently paginates at 20; 401 bodies parse as valid JSON; apps are permanent (no delete), named `<name>_<orgShortId>`; oclif.manifest.json in the wdcli install dir is the authoritative command surface (the CLI hides commands); PMD tags index doc id dyg1528862158582. → promoted to §Credentials and tenants + §Build diagnostics; also seeded as learnings/ entries marked unverified.
