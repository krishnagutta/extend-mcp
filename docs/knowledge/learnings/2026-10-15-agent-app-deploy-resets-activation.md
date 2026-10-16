---
title: Every deploy of an agent app resets the agent to Inactive
date: 2026-10-15
tags: [agent, deploy, wdcli, activation]
verification: runtime-verified
---

**What happened:** After `wdcli app deploy` of an AGENT-type app that was already active, the tenant's Agent Management Hub showed the agent as Inactive again. The skill's Status toggle was off and its "Available To" security groups were empty.

**Root cause:** The deploy re-registers the agent with the Agent System of Record. The tenant-side activation settings (skill enabled, Available To, Active) are not carried over.

**Rule:** After every deploy of an agent app, open Agent Management Hub, find the agent, then Configure Agent: turn the skill on, set Available To, and click Activate (confirm the dialog). Put this in the deploy checklist. On first registration the platform merges all `.agentskill` files into one skill named "Agent Skill", in Delegate execution mode.

**Evidence:** Two deploys of the same app the same evening, both followed by an Inactive agent with cleared skill settings in the registry.
