---
title: The agent "exceeded an allowed usage limit" error applies to all custom agents in the tenant, not per agent
date: 2026-10-18
tags: [agent, chat, quota, debugging]
verification: runtime-verified
---

**What happened:** A custom agent in a personal development tenant started answering every chat turn with "This request can't be completed right now because it has exceeded an allowed usage limit. Please wait and try again later." It did not clear after three days, and deactivating and reactivating did not clear it. A brand-new throwaway custom agent, deployed and activated the same day with zero prior sessions, got the identical refusal on its first turn. The delivered Self-Service Agent answered normally throughout.

**Root cause (partly inferred):** The allowance is attached to custom agents as a class for the tenant or organization, not to a single agent and not to the tenant's AI backend as a whole. Refused calls never reach the app (its App Hub Logs stay empty) and do not appear as sessions in the agent's Analytics tab. The size of the allowance and its reset window are not published anywhere I could find (developer console, tenant reports, docs).

**Rule:** When a custom agent refuses with the usage-limit message, test the delivered Self-Service Agent first: if it answers, the custom-agent allowance is exhausted and nothing you do to your agent (re-activate, redeploy, deploy a fresh copy) will clear it. Do not spend further chat turns on any custom agent. Budget custom-agent chat sessions from the first deploy as a scarce shared resource, and build the deterministic parts of a demo (Extend pages, orchestrations) first.

**Evidence:** Side-by-side chat turns against two custom agents (one days old, one minutes old) and the Self-Service Agent in one session; Agent Management Hub → agent → Analytics; empty App Hub Logs for the custom agents during the refusals.
