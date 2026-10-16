---
title: A custom agent only answers in chat when picked and its skill is scoped to the user
date: 2026-10-15
tags: [agent, chat, security, activation]
verification: runtime-verified
---

**What happened:** A deployed and registered custom agent never answered "analyze my career". The tenant's built-in Self-Service Agent answered instead. Later, after activation, the agent's runs stalled until a broader security group was added to the skill.

**Root cause:** Registration alone leaves the agent Inactive. Once active, Workday chat shows an agent picker and does not route to the custom agent by itself. The skill also only runs for users in its "Available To" security groups.

**Rule:** (1) Activate the agent in Agent Management Hub. (2) In chat, pick the agent from the picker next to the agent name. (3) Put every role you test with in "Available To". In one dev tenant, adding an HR administrator role group alongside "Employee As Self" was what made the admin test user's runs complete.

**Evidence:** Runtime tests in a development tenant. The security-group effect was observed once and is not isolated, so treat (3) as the likely cause rather than proven.
