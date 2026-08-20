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
  make prod deployable; `EXTEND_SAFE_TENANTS` when set is an ENFORCED
  allowlist) and require explicit user confirmation before any tenant write.
- NEVER wrap the wdcli commands that print live bearer tokens (config-show /
  auth-token / tenant-token style) as tools — `test/no-token-commands.test.mjs`
  scans the source for this and must stay.
- wdcli has THREE independent credentials (account session; per-tenant token
  via human browser SSO; ~1h API Explorer token). Classify auth failures and
  name the exact fix — never "fix" a tenant-token failure by account re-login
  (`classifyAuthFailure` in `src/wdcli-core.mjs`).
- Develop against DEVELOPMENT tenants only: sandbox tenants refresh weekly
  with PRODUCTION data. Apps are permanent (WDCLI has no delete) — name any
  throwaway app obviously.
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
- Before adding any tool that wraps a wdcli command not already used here,
  verify the real command surface first: wdcli is oclif-based and HIDES
  commands — `oclif.manifest.json` in the wdcli install directory is
  authoritative, not `wdcli --help`. Planned-but-blocked on live wdcli:
  whoami, get_build_log, create_app, copy_app (from a LOCAL directory — the
  copy-by-reference-id path silently uploads nothing), promote_app (must
  require an explicit human confirmation string).
- Tests: Node stdlib runner (`npm test` → `node --test "test/**/*.test.mjs"`),
  no new deps. Every rule/guard needs BOTH a fires-on-bad and a silent-on-good
  case, verified against an independent oracle (hand-specified expectations,
  not the implementation's own logic).
- Knowledge must ship THROUGH the MCP: if a curated knowledge base exists, a
  tool must serve it live (docs alone never reach a teammate's workspace).
  Two-tier: append-only intake log, periodically promoted into a curated
  reference — verify each entry against current code BEFORE promoting.

## Knowledge flow (implemented)

- `docs/knowledge/learnings/` — ONE FILE per learning (a shared append-to-one
  file guarantees merge conflicts), written by `log_extend_learning` (which
  scrubs credentials/tenant values — public repo) and queried by
  `get_extend_learnings` (full-text + tag + verification). Tag honestly:
  `build-verified` proves the grammar parsed; only runtime observation earns
  `runtime-verified`. Corrections of earlier learnings are themselves
  learnings (`corrects: <slug>`).
- `docs/knowledge/intake.md` — historical pre-tool intake log (frozen for new
  entries; see its header).
- `docs/knowledge/extend-patterns.md` — the curated tier, served live by
  `get_extend_patterns` (re-read per call; edits reach users without restart).
  New `## Section` headings become addressable sections automatically; the
  knowledge tests assert core sections exist and bodies stay non-trivial.
- `search_extend_examples` / `read_extend_example` — searchable corpus of
  Workday DevRel sample apps, shallow-cloned at runtime into
  `EXTEND_WORK_DIR/.knowledge/wdp` (never vendored into this repo). Always
  attribute: Workday/WorkdayDeveloperProgram, Apache-2.0.
