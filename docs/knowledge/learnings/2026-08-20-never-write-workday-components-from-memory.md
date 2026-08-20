---
title: Never write Workday components from memory
date: 2026-08-20
tags: [pmd, grounding, build]
verification: unverified
---

**What happened:** Plausible-looking PMD recalled from memory rather than copied from a grounded source failed the build (typically as an empty-log parse error — unknown properties).

**Root cause:** The PMD grammar's property vocabulary is strict, undocumented in aggregate, and not statistically inferable — near-miss property names don't exist.

**Rule:** Ground every component, in order of authority: (1) downloaded real apps (`download_extend_app` a Workday-delivered App Gallery template — they ship presentation/, model/, AND orchestration/); (2) the WorkdayDeveloperProgram corpus (`search_extend_examples`); (3) developer.workday.com/documentation — the PMD tags index (doc id dyg1528862158582) lists every tag by name, and each tag's own page has the full property table: read it before using an unfamiliar tag; (4) Workday Community for error messages; (5) the API Explorer for REST surfaces.

**Evidence:** Reported by the workday-developer-mcp bootstrap session (2026-08-20); consistent with this server's corpus reads; not independently build-verified here.
