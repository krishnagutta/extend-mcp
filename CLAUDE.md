# extend-mcp — session rules

MCP server for Workday Extend app development. Entry: `src/index.mjs`; tools in
`src/tools/` (one file per tool, each exports `register(server)`); subprocess
wrapper in `src/wdcli.mjs`; env config in `src/config.mjs`.

## Public repo — scrub rule (standing)

This repo is PUBLIC. Never include client names, tenant IDs or aliases, org
names, internal URLs, credentials, or real WIDs — in files OR commit messages.
Use generic placeholders (`<tenant>-sb`, `acme`, `myApp_xxxxx`) in all examples,
tool descriptions, and tests. Scan every diff before pushing.

## This server is NOT local-only

`src/wdcli.mjs` shells out to `wdcli` with real `WDCLI_CLIENT_ID` /
`WDCLI_CLIENT_SECRET`, and tools deploy to live tenants. Therefore:

- Never log, echo, or commit credential values; `.env` stays gitignored.
- Every deploy/write tool is consequential. Preserve the production guard
  (`src/tenant-guard.mjs` — fail closed; `EXTEND_PROD_TENANT` unset must never
  make prod deployable) and require explicit user confirmation before any
  tenant write.
- Never advertise "no network calls / no credentials" — that describes a
  different (Studio) MCP, not this one.

## GitHub account

Before any repo-admin operation (merge, branch-protection read, settings):
`gh api user --jq .login` must return `krishnagutta`. The shared gh CLI drifts
to another account whose failures mislead (admin merges report "Waiting on code
owner review"; protection reads 404). Fix: `gh auth switch --user krishnagutta`.

## Workflow conventions

- `src/` and `docs/` changes go through a PR (admin-merge after self-review).
  Knowledge/log-only commits may go straight to main.
- Bump the version when the tool count changes.
- Tests: Node stdlib runner (`npm test` → `node --test "test/**/*.test.mjs"`),
  no new deps. Every rule/guard needs BOTH a fires-on-bad and a silent-on-good
  case, verified against an independent oracle (hand-specified expectations,
  not the implementation's own logic).
- Knowledge must ship THROUGH the MCP: if a curated knowledge base exists, a
  tool must serve it live (docs alone never reach a teammate's workspace).
  Two-tier: append-only intake log, periodically promoted into a curated
  reference — verify each entry against current code BEFORE promoting.
