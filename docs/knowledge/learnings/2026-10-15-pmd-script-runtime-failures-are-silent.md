---
title: PMD script runtime failures are silent; bisect by page, not by guess
date: 2026-10-15
tags: [pmd, scripting, debugging, validation]
verification: runtime-verified
---

**What happened:** A page with three working endpoints and a page script showed only "1 Error" and "A failure occurred while processing your request. Contact your administrator." in the UI. `wdcli app validate` and the build both passed. The App Hub Logs showed the three REST calls returning 200 and the page returning 500 with `wd_message: NULL`.

**Root cause:** The validator and the build check syntax and known function names, not runtime behaviour. A method that does not exist at runtime (for example `'x'.toLowerCase()` or `'x'.toUpperCase()`) passes validation and crashes the page. The UI and the logs do not name the failing expression.

**Rule:** Before writing a page script, grep Workday's sample apps for every method you plan to use; if it appears zero times, treat it as unavailable. Methods seen working at runtime: `string:split`, `.replace`, `.length()`, `.substring(a, b)`, `.contains` (string and list), `.join`, `.sort(fn).reverse()`, `.add`, `let`/`const`/`var`, `for (x : list)`, `pageVariables.*`. Not available at runtime despite passing validation: `.toLowerCase()`, `.toUpperCase()`. To find a failing construct, deploy copies of the page that each add one construct, and load them one at a time.

**Evidence:** Deploy-and-load bisection in a development tenant, cross-checked against App Hub Logs (`wd_log_type: access`, `wd_response_code: 500`).
