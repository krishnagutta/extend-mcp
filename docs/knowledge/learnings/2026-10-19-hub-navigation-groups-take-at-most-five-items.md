---
title: A hub navigation group takes at most five items; regroup instead of listing
date: 2026-10-19
tags: [pmd, hub, navigation, validator]
verification: runtime-verified
---

**What happened:** A hub page (`"type": "hub"`) with one `navigationTasks` group of six `items` failed `wdcli app validate` with "You can only specify up to 5 navigation items in a group." (presentation/careerHub.pmd). The same six tasks as top-level `type: item` entries had validated and deployed before; the cap applies per group.

**Rule:** Plan hub navigation as groups of five or fewer items. When a product vocabulary wants more tabs under one heading, split into two groups (for example "My Performance" and "My Growth") rather than dropping tabs; three groups with three items each validated and rendered as three collapsible headings. Group shape: `{"type": "group", "icon": "wd-icon-user", "label": "...", "items": [{"label": "...", "task": {"taskId": "..."}}]}`; top-level items and groups can be mixed.

**Evidence:** wdcli 1.9.43 validator error on a six-item group, then a clean validate and a live hub with three groups in a development tenant (2026-10-19).
