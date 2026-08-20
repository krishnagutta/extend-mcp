---
title: Check HTTP status before parsing REST responses
date: 2026-08-20
tags: [rest-api, auth]
verification: unverified
---

**What happened:** A script calling the Workday REST API with an expired API Explorer token (~1h life) read `.data?.[0]` off a 401 body and misreported the token expiry as a fact about the tenant.

**Root cause:** A 401 body parses as valid JSON. Optional chaining then silently turns the auth failure into "no data".

**Rule:** In any script that calls the REST API, check the HTTP status before parsing the body. Also: the app REST API silently paginates at 20 — every collection read needs an explicit limit or it under-reports.

**Evidence:** Reported by the workday-developer-mcp bootstrap session (2026-08-20); not yet re-verified by this server.
