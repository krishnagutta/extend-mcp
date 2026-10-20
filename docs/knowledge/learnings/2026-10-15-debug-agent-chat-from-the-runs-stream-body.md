---
title: Debug a stuck agent chat from the runs/stream response body
date: 2026-10-15
tags: [agent, chat, debugging]
verification: runtime-verified
---

**What happened:** Agent chat showed "Calling <agent>..." indefinitely with no error, for custom and delivered agents alike. Agent Monitoring Report showed no sessions.

**Root cause:** The UI hides errors from the run stream. Each turn makes two calls: `POST .../aix/v1/threads` (creates a thread) and `POST .../agent-gateway/<tenant>/.../aix/v1/threads/<id>/runs/stream`. The stream call returns HTTP 200 even when the body is an error.

**Rule:** Open the browser's network panel and read the body of the `runs/stream` request. Errors seen so far:
- `{"detail":"thread <id> not found"}`: platform-side and transient. The delivered Self-Service Agent failed the same way and recovered on its own about 20 minutes later. Test the delivered agent first to separate platform problems from your app.
- "This request can't be completed right now because it has exceeded an allowed usage limit": the tenant's AI usage allowance is exhausted. The UI shows this one. Neither the developer console nor the tenant shows the limit or its reset time. Budget test runs.

**Evidence:** Network traces from a development tenant, compared with the delivered Self-Service Agent before and after recovery.
