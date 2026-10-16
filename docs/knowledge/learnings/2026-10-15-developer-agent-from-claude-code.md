---
title: Driving Workday Developer Agent from Claude Code
date: 2026-10-15
tags: [developer-agent, wdcli, claude-code, auth]
verification: runtime-verified
---

**What happened:** Wiring Workday Developer Agent into Claude through `wdcli mcp`, as Workday's official Claude Code plugin does, failed in several distinct ways.

**Root cause and rules:**
- `wdcli mcp` gates its tools on the MCP client name. The full Extend toolset is served only to `workday-developer-agent` (the IDE extension). `call_workday_developer_agent` (wdcli 1.9.43+, not present in 1.9.20) is served only to `claude-code` and `claude-ai`. Other hosts get "MCP features are only available to the Workday Developer Agent". Use the Claude Code CLI, for example headless `claude -p` with an `--mcp-config` that runs `wdcli mcp`. Do not spoof the client name.
- The tool drives the Developer Agent panel in VS Code or Cursor. The project folder must be open in a trusted window (Restricted Mode disables the extension), and edits are approved in the panel (per tool, workspace or global scope).
- The extension signs in with a plain `wdcli auth:login`, after running `auth:logout`. The logout wipes `wdcli config set loginEnvironment personal`. Personal accounts must therefore start the IDE with `WDCLI_ENVIRONMENT=personal` in its environment, quitting the IDE first.
- Developer Agent cannot use its tenant-aware endpoint generation without a current tenant token (`wdcli tenant login`, about one hour). Without it, it falls back to guessed REST paths. One such guess (`/talent/v1/workers/me/skills`) returned 404 at runtime. Verify generated endpoints at runtime.
- A headless `claude -p` relay can fail on its own final reply, for example with a false-positive safety block, after the Developer Agent turn has already completed. Read the result from the files rather than assuming failure.

**Evidence:** wdcli 1.9.43 bundle (`lib/commands/index.js`: client-name gate, `call_workday_developer_agent`), extension 1.1.1 bundle (`auth:logout` then `auth:login`, `config show loginEnvironment`), and runtime runs.
