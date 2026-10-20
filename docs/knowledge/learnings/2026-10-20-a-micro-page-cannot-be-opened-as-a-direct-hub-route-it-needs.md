---
title: A micro page cannot be opened as a direct hub route; it needs a taskReference caller
date: 2026-10-20
tags: [pmd, micro, routing, hub, runtime]
verification: runtime-verified
---

**What happened:** A `micro` view page (presentation.micro true) with its own AMD task and routing pattern was opened directly by URL under the hub (`.../w/hub/<pageId>.htmld?id=...`). The hub shell rendered with "1 Error"; the developer-site Logs showed the page GET returning 500 in 16 ms with wd_page_id NULL and no endpoint call, so the page never executed. The same tenant opens micro edit pages fine as popups from buttons with taskReference.

**Root cause:** Micro pages are popup pages; the hub route handler cannot host them as a full page, and it fails before resolving the page.

**Rule:** Every micro page needs at least one caller (a button or link with taskReference and parameterBindings). Do not rely on its routing pattern for navigation or verification; an orphan micro page is unreachable. Verify micro pages by opening them from their caller.

**Evidence:** Development tenant 2026-10-19, developer-site Logs: GET .../w/hub/<pageId> 500, wd_page_id NULL, response time 16 ms, no remote calls.
