---
title: Orchestrations are Builder-only; an app deploy carries the .orchestration file but never updates a deployed one
date: 2026-10-19
tags: [orchestration, builder, wdcli, deploy, lifecycle]
verification: runtime-verified
---

**What happened:** Looking for a non-browser way to author an orchestration (the Builder canvas only takes drag-and-drop, which an automated browser pane cannot perform). `wdcli app download --latest-version` returned the Builder-created `orchestration/<name>.orchestration` JSON (a `Flow` document with start structure, nodes, resources, credentials map), and uploading the app with that folder built and deployed cleanly. The bundled orchestrations doc then settled it: orchestrations are not authored in code files, the folder is read-only, and "once an orchestration is deployed, subsequent app deploys will not update it".

**Rule:** Build and change orchestrations only in Orchestration Builder on the Developer Site. Keep the downloaded `orchestration/` folder in the local tree so uploads do not drop it, but never edit it expecting the change to land. When a step needs a drag onto the canvas, a human does it; a build sheet listing each step and its fields is the hand-off. The API-key credential value belongs in the Builder's credential store only.

**Evidence:** wdcli 1.9.43 download and upload in a development tenant, 2026-10-19; `docs__development__orchestrations.md` (bundled, Workday-authored).
