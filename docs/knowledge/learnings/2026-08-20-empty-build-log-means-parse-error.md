---
title: Empty build log means parse error
date: 2026-08-20
tags: [build, diagnostics]
verification: unverified
---

**What happened:** A large class of source mistakes fails with a completely empty build log — it stops after "Downloading source code" with no Validating/Compiling lines.

**Root cause:** The grammar never parsed: an unknown property, a non-ASCII character in a label or script, or an id collision. The build dies before validation can produce line-level messages.

**Rule:** If the log stops after "Downloading source code", treat it as a parse error, never a logic error. Diff against the last green build; bisect one change per build. (`upload_extend_app` now flags this signature automatically as `build_diagnosis`.)

**Evidence:** Reported by the workday-developer-mcp bootstrap session (2026-08-20), which ran live WDCLI builds; not yet re-verified by this server against a live tenant.
