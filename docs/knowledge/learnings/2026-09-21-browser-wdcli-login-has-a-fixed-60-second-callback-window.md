---
title: Browser wdcli login has a fixed 60 second callback window
date: 2026-09-21
tags: [wdcli, auth]
verification: runtime-verified
---

**What happened:** wdcli auth login timed out and the browser showed the Developer Site downloads page, which looked like an installer had been triggered.

**Root cause:** The CLI listens on 127.0.0.1:64000 and waits a hard-coded 60 seconds for the redirect. If sign-in takes longer, or the site loses the return address, the callback never arrives.

**Rule:** Sign in to the intended Developer Site identity in the default browser first, then run the login and finish inside 60 seconds. tenant login behaves the same. Use WDCLI_CONFIG_DIR / HOME to keep one profile per client.

**Evidence:** wdcli 1.9.20 bundle: exchange server on port 64000, timeoutMs default 6e4; activity log entry auth:login failure "Timed out waiting for authentication".
