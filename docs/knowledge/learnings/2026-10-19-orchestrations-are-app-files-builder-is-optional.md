---
title: Orchestrations are app source files that deploy with wdcli; the Builder is an optional editor
date: 2026-10-19
tags: [orchestration, wdcli, deploy, builder, lifecycle]
verification: runtime-verified
corrects: 2026-10-19-orchestrations-builder-only-and-app-deploys-do-not-update-them
---

**What happened:** The bundled wdcli orchestrations doc says orchestrations "cannot be authored via code files" and that the `orchestration/` folder is read-only, and a session took that literally and parked the work for a human to click together in Orchestration Builder. A practitioner who has shipped orchestrations at two customers corrected it, and the Workday DevRel catalog proves the shape: `orchestrationToolkit/orchestration/` holds twenty-plus `.orchestration` and `.suborchestration` files that upload and build with the app. The doc's wording describes the IDE agent's limits, not the platform.

**Rule:** Author or copy orchestration files in `orchestration/` from the catalog shapes, validate, and deploy them with `wdcli app deploy`; use the Builder when a visual edit is quicker. Keep the one binding rule from the same doc: "Once an orchestration is deployed, subsequent app deploys will not update it", so every change to a deployed orchestration is a new name plus a repointed page endpoint, or a Builder edit. Secrets never go in the file: declare the credential by name in `resources.credentials` and fill the value on the Developer Site.

**Evidence:** DevRel catalog `orchestrationToolkit` (Apache-2.0), 2026-10-19; practitioner correction relayed by the dev lead the same night; a Builder-created Start step downloaded as `orchestration/<name>.orchestration` and re-uploaded cleanly with wdcli 1.9.43.
