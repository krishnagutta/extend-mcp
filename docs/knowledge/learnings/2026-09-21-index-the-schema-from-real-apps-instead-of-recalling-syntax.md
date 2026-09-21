---
title: Index the schema from real apps instead of recalling syntax
date: 2026-09-21
tags: [process, schema, grounding]
verification: build-verified
---

**What happened:** Reviews and drafts contained plausible but unverified Extend attribute names and limits recalled from memory.

**Root cause:** Extend syntax is sparse in general knowledge; recall produces confident guesses.

**Rule:** Use get_extend_schema for attribute names and values, get_extend_best_practices for rules, official limit pages for numbers. If a widget or attribute does not occur in the index, treat it as nonexistent until a doc proves otherwise.

**Evidence:** Schema index over the DevRel corpus: 715 files, 87 grids, 442 endpoints, 44 business objects; test/schema-index.test.mjs.
