---
title: The .agent frontmatter has no model field in wdcli 1.9.43, and the personal account terms say nothing about an AI allowance
date: 2026-10-18
tags: [agents, custom-agents, personal-account, limits]
verification: doc-verified
---

**What was checked (2026-10-18):**
- The bundled agent component reference in wdcli 1.9.43 (`workday://docs/components/agent-components`) defines `.agent` frontmatter as `name`, `description`, `skills` only. There is no model, model family or tier field, and the wdcli bundle contains no `modelFamily` string. Model choice for a custom agent is therefore not something the app author sets in the component files at this version; if it exists, it is tenant-side.
- The Workday Developer Personal Account Program Terms (developer.workday.com/terms/developerpersonalaccountterms, last updated 2026-06-15) contain no usage, quota, fair-use or AI allowance clause. The closest language is a ban on "excessive copies" and on anything "detrimental to the performance of operation" of Workday products, plus deletion of tenants for inactivity under the then-current policy.
- The same terms restrict personal accounts to "personal non-commercial use", forbid participation "as a Developer for any organization, including ... any Workday customer or partner", and forbid using the materials to "distribute, market, offer, or demonstrate" them or to "solicit, approach, or market any product or services to any Workday customer or prospective customer". Anyone planning a customer-facing demo from a personal tenant should read that section first.

- The developer documentation page "Custom Agents on Workday's AI Platform" (developer.workday.com/documentation, Agents > Custom Agents > Learn the Basics) describes the build, register and invoke stages, the Agent System User, the runtime clients and App Hub traces. It says nothing about model families, invocation allowances, Flex Credits or personal developer accounts. It does confirm that in dev environments ASOR registers a custom agent automatically, that all tool calls run under the agent's own system user, and that Agent Traces are stored in App Hub.

**Rule:** Do not look for a model switch in `.agent` files on this wdcli version, and do not expect the program terms to state the custom-agent allowance. The limit's size and reset are still unpublished; the only public data point is a forum report that a personal-account agent "defaults to auto - base" and hits the limit during testing.

**Evidence:** Direct reading of the bundled doc and the signed-in terms page; grep of the wdcli install for model-related keys.
