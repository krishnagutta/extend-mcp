---
title: onLoad "max memory limit" scales with rows times string scans; cap the read and match on a short list
date: 2026-10-19
tags: [pmd, script, onload, performance, memory]
verification: runtime-verified
---

**What happened:** A view page read `learning/v1/content?limit=100` and, in `onLoad`, ran a per-item term match (each of the worker's skills split into words, each word checked with several `contains` calls against the item title plus skill names). The page failed on load with "Script Constraint exceeded: Script/Expression used more than the allowed max memory limit" (App Event Logs, category `pageError.script`, `Exception thrown while processing 'onLoad' event of page`). The same matcher runs fine on ten job postings.

**Rule:** Treat the onLoad memory budget as roughly rows × string work. Before adding a per-row text scan: cap the endpoint (`limit=20` was fine where 100 failed), drop duplicate rows early (a `seen` list keyed by title), and match against a short fixed capability list rather than every term of every skill. Keep character-by-character helpers (manual lowercasing) out of row loops entirely; check the capitalised and lower-first forms instead.

**Evidence:** Development tenant, 2026-10-19: 100 items with per-term matching failed; 20 items with the same matcher passed; 20 items with a fixed 26-entry capability list and dedupe passed with room to spare. Request id and log category as above.
