---
title: Personal developer accounts need auth login --environment personal
date: 2026-10-15
tags: [wdcli, auth, personal-account]
verification: runtime-verified
corrects: 2026-09-21-browser-wdcli-login-has-a-fixed-60-second-callback-window
---

**What happened:** With a personal developer account (signed in with a Workday Digital ID), `wdcli auth login` opened the "Sign In to Workday Developer CLI" page. The "Accessing your personal account?" option led to the Digital ID sign-in, which succeeded but ended on the Developer Site home page. The CLI never got the callback and reported "Timed out waiting for authentication". Repeating it did not help.

**Root cause:** wdcli logs in to the `enterprise` environment by default (authorize URL on the enterprise API host). Personal accounts live in the `personal` environment (a different API host). The personal-account link drops the CLI's authorize request, so no code is ever returned to 127.0.0.1:64000.

**Rule:** Personal accounts run `wdcli auth login --environment personal` (or set `WDCLI_ENVIRONMENT=personal`). The redirect then returns to the CLI ("Connected Successfully"), `whoami` shows environment Personal, and `tenant login <alias>` works as usual. The earlier learning's advice ("sign in first, finish inside 60 seconds") does not fix this case.

**Evidence:** wdcli 1.9.20 `oclif.manifest.json`, `auth:login` flag `environment` (options enterprise, personal, eusovereign; default enterprise). Runtime-checked: the default authorize URL failed; with `-e personal` the callback succeeded and `whoami` reported Environment = Personal.
