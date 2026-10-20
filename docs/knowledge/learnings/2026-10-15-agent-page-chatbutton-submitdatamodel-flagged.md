---
title: Agent Page chatButton submitDataModel is flagged as invalid by the validator
date: 2026-10-15
tags: [agent-page, aui, validation]
verification: build-verified
---

**What happened:** An `auis/*.aui` Agent Page copied from the wdcli-bundled Agent Pages doc (a `chatButton` with `submitDataModel: false`) validated with a warning: "You defined an invalid property in tag ChatButtonTag: submitDataModel."

**Root cause:** The validator's ChatButtonTag schema does not include `submitDataModel`, although the bundled doc (wdcli 1.9.43) documents it.

**Rule:** Omit `submitDataModel` on display-only buttons (an empty context is the default). For buttons that must submit form data, test at runtime before relying on it. The `.aui` file itself (chatCard, chatText with H2/H3, chatColumn, chatRow, chatDivider, chatButton) and an `.amd` `routes` entry for the page id both validated cleanly.

**Evidence:** `wdcli app validate`: one warning with the property, "No validation issues found" without it.
