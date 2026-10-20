---
title: A micro edit page lands on the app root after OK unless an AMD flowDefinition names the next task
date: 2026-10-19
tags: [pmd, amd, flow, navigation, micro, edit-page]
verification: runtime-verified
---

**What happened:** A `micro` edit page (POST to an app business object) opened from a list page by `taskReference`; after OK the write succeeded (201) but the user landed on the app's landing page (the hub root), not back on the list. Nothing in the page said where to go next.

**Rule:** Give each edit task a flow in the AMD so OK returns where the user came from. Shape (from the Workday sample app charitableDonations.amd): `"flowDefinitions": [{"id": "quickAddFlow", "flowSteps": [{"id": "step1", "startsFlow": true, "taskId": "<edit task>", "transitions": [{"order": "a", "value": "done", "condition": "true"}]}, {"id": "done", "endsFlow": true, "taskId": "<list task>"}]}]`. No page change is needed: opening a task that is a `startsFlow` step starts its flow, and the built-in OK moves to the next step. Several flows may end on the same task; give the step ids distinct names. A full-page edit (the bulk-assign page) behaves the same way and returned to the team page inside the hub frame.

**Evidence:** Development tenant, 2026-10-19: before the flow, OK on the micro page landed on the hub root; after adding three flowDefinitions (quick add, edit, bulk assign) each OK returned to the originating list page.
