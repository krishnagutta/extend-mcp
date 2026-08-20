---
title: Copy app from a local directory
date: 2026-08-20
tags: [lifecycle, copy, wdcli]
verification: unverified
---

**What happened:** `wdcli app copy` accepts either a local directory or a reference ID as source; the copy-by-reference-id path completed without error but silently uploaded nothing.

**Root cause:** The reference-id path resolves against server-side state that does not include the app's source files; only a local directory copy carries content.

**Rule:** Always copy from a downloaded LOCAL directory. `copy_extend_app` enforces this: it refuses to run until the source app is downloaded, and always passes the resolved directory path as the source argument (pinned by test).

**Evidence:** Reported by the workday-developer-mcp bootstrap session (2026-08-20); manifest confirms the dual-mode source argument; the silent-empty-upload behaviour is not yet re-verified here.
