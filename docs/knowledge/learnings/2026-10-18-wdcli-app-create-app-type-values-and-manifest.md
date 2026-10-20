---
title: wdcli app create takes CUSTOM_AGENT_WORKDAY (not AGENT), and a manifest-less create half-succeeds
date: 2026-10-18
tags: [wdcli, app-create, agent, lifecycle]
verification: runtime-verified
---

**What happened:** `wdcli app create --app-type AGENT` was rejected: "Unknown app type AGENT." The valid options it lists are CUSTOM_AGENT_WORKDAY, EXTEND, INTEGRATION and CUSTOM_AGENT_EXTERNAL. The oclif manifest text that mentions `AGENT` describes App Hub's `appType` field, not the create flag. A second attempt with the right type and a `--source` directory lacking `appManifest.json` printed "Creating new app... done" and then failed the upload, leaving the app registered with no source.

**Rule:** Use `CUSTOM_AGENT_WORKDAY` for a Workday Agent app. If create fails after registering, do not create again (apps are permanent): run `wdcli app info <referenceId>` for `appId` and `organizationUuid`, write `appManifest.json` with `id`, `referenceId`, `name`, `description`, `organizationId`, add the `.amd` and `.smd` (copy a working app's shape, `applicationId` = the reference id), then `wdcli app validate`, `app upload`, `app deploy`.

**Evidence:** wdcli 1.9.43 error output and a recovered registration in a development tenant.
