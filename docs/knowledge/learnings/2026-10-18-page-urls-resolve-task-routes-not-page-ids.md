---
title: Extend page URLs resolve task routing patterns, not page ids; a fast 500 with no page id means the route does not exist
date: 2026-10-18
tags: [pmd, amd, routing, debugging, app-hub-logs]
verification: runtime-verified
---

**What happened:** A page kept failing with "1 Error / A failure occurred while processing your request" while an identical copy of the page under another id loaded fine. Hours went into bisecting the page script. The page was never broken.

**Root cause:** The URL `.../app/<appId>/<appId>/<name>.htmld` resolves `<name>` against the `routingPattern` of the tasks in the `.amd`, not against the page id. The page had `"id": "teamCareer"` and a task with `"routingPattern": "/team"`, so `teamCareer.htmld` hit no route. The copies "worked" only because their throwaway tasks used `/<pageId>` as the route. The correct URL was `team.htmld`.

**How to tell this apart from a script crash in App Hub Logs:** filter `wd_log_type: access`, then look at the page request row. A missing route fails in about 15 to 20 ms, returns 500, has `wd_page_id` empty and is not followed by any endpoint rows. A real script crash runs long enough to call the endpoints (they appear as 200 rows carrying the page id) before the page row returns 500.

**Rules:**
- Load pages by their task route, never by page id, unless the two are the same string.
- In App Hub Logs, add the columns `wd_path`, `wd_response_code`, `wd_response_time`, `wd_page_id`, `wd_message` and the "App Event Logs" preset before reading anything else; a 15 ms 500 with no page id is a routing problem, not a code problem.
- The error dialog on the page shows a request id (`I|<uuid>`). Paste it into the log search to jump straight to the matching `wd_common_request_id` row.

**Evidence:** Development tenant, same page deployed under three ids; only the one reached through its task route rendered. Access log rows compared side by side.
