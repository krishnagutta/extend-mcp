---
title: Parallel page loads trip API gateway 429s and look like script errors
date: 2026-10-15
tags: [debugging, rate-limit, api-gateway]
verification: runtime-verified
---

**What happened:** Loading several test pages in quick succession made most of them fail with the same generic page error. App Hub Logs showed the REST calls behind those pages returning **429** from the API gateway, not 500 from the page.

**Root cause:** Each page load fans out to every endpoint on the page. Several pages loaded within a second or two exceed the gateway's per-tenant rate limit, and the page reports the endpoint failure as the same generic error as a script crash.

**Rule:** When bisecting page failures, load test pages one at a time with a pause between them, and read the App Hub Logs (`wd_log_type: remote`, `wd_response_code`) to separate 429s from real page errors before drawing conclusions. The `wdratelimittokensremaining` response header shows the remaining budget.

**Evidence:** App Hub Logs for a development tenant during a bisection run; the same pages loaded fine individually afterwards.
