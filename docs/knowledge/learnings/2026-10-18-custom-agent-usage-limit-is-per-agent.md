---
title: The agent "exceeded an allowed usage limit" error is per custom agent, not per tenant
date: 2026-10-18
tags: [agent, chat, quota, debugging]
verification: runtime-verified
---

**What happened:** A custom agent in a personal development tenant started answering every chat turn with "This request can't be completed right now because it has exceeded an allowed usage limit. Please wait and try again later." It did not clear after three days, and deactivating and reactivating the agent did not clear it either.

**Root cause (partly inferred):** The limit is attached to the custom agent, not the tenant's AI backend: the delivered Self-Service Agent kept answering normally the whole time. Refused calls never reach the app (the app's App Hub Logs stay empty) and never count as sessions. The agent's Analytics tab showed a single-digit "Agent Sessions, current month to date", which is consistent with a small per-agent monthly session allowance on personal developer tenants. The size and reset window are not published anywhere I could find (developer console, tenant reports, docs).

**Rule:** When a custom agent refuses with the usage-limit message, test the delivered Self-Service Agent first. If it answers, stop spending chat turns on the custom agent; they will not count down the limit and the agent's Analytics tab gives the only visible number. Budget custom-agent chat turns from the first deploy: each test conversation is a session against a cap that appears to be monthly. Build and test the deterministic parts of a demo (Extend pages, orchestrations) first, and treat agent chat sessions as the scarce resource.

**Evidence:** Side-by-side chat turns against the custom agent and the Self-Service Agent in the same session; Agent Management Hub → agent → Analytics ("Agent Sessions, current month to date"); empty App Hub Logs for the custom agent during the refusals.
