# Workday Extend patterns

Curated reference served live by the `get_extend_patterns` tool. Distilled from
[Workday/WorkdayDeveloperProgram](https://github.com/Workday/WorkdayDeveloperProgram)
(Apache-2.0, official Workday DevRel) — principally the `pmdScripting`,
`pmdWidgetDictionary`, `orchestrationToolkit`, and `prismAndExtendDesignPatterns`
catalog apps — plus operational experience with this MCP. Use
`search_extend_examples` / `read_extend_example` to pull the full working source
these summaries came from.

## App anatomy

An Extend app is a directory of declarative JSON-ish files:

- `appManifest.json` — minimal: `{ "referenceId", "name" }`.
- `presentation/<app>.amd` — app model: `tasks` (each `{ id, routingPattern, page }`)
  and `flowDefinitions` (multi-step flows with ordered, conditional `transitions`).
- `presentation/<app>.smd` — site model: languages, `siteAuth.authTypes`
  (e.g. `{ "scheme": "SSO" }`), `siteId`, `cdnEnabled`, `siteProperties`.
- `presentation/*.pmd` — one page model per page (see PMD structure below).
- `presentation/pods/*.pod` — reusable presentation fragments; referenced from
  PMDs via `{ "type": "pod", "podId": "footer" }`; the pod file has
  `{ "podId", "seed": { "template": {...} } }`.
- `presentation/scripts/*.script` — PMD Script files (see scripting below).
- `model/*` — business objects (`.businessobject`), security domains
  (`.securitydomain`), tasks (`.task`), attachment types (`.attachment`).
- `orchestration/*.orchestration` / `.suborchestration` — server-side flows.
- `cards/*.carddefinition` — Workday-surface cards.

## PMD page structure

A PMD is `{ "id", "presentation": { "title", "body", ... } }`. The body is a
tree of typed widgets: `section` (supports `horizontal: "true"`), `fieldSet`,
`pod`, and leaf widgets. Inline expressions use `<% ... %>` template syntax
(e.g. `json:create(json:attribute(...))`).

Buttons: `type: button` with `action` of `PRIMARY` / `SECONDARY` (default) /
`AUXILIARY` / `LINK`, navigating via
`taskReference: { taskId, parameterBindings }`. Gotcha from the widget
dictionary source: `taskReference.parameters` works but **`parameterBindings`
overwrites `parameters`** when both are present — prefer `parameterBindings`.

## PMD scripting essentials

From `pmdScripting`'s `.script` sources:

- Functions are `var name = function(args) { ... };` with arrow-lambda
  collection operations: `.map()`, `.filter()`, `.sort()`, `.distinct()`,
  `.join(', ')`.
- A lambda returning an object literal needs a **nested brace block**:
  ```
  workers.data.map(worker => {
  {
    'column1': worker.descriptor,
    'column2': worker.businessTitle
  }
  })
  ```
- Endpoint invocation: `getWorkerbyId.invoke({'id': id[0]})` — the argument map
  binds URL parameters; the return value is the parsed response body.
- Widget state is mutated directly: `descriptor.value = ...`,
  `workerDetail.visible = true`.
- Emptiness test is the prefix operator `empty`: `if (!(empty id)) { ... }`.
- A `.script` file **ends with an export map**:
  `{ "populate": populate }` — only exported functions are callable from PMDs.
- Common idioms in the corpus: RaaS report structures consumed as
  `Report_Entry` arrays; CSV via `.map(...).join(', ')`; date math in
  `dateCalculations.script`; logging patterns in `logging.script`.

## Widget quick reference

`pmdWidgetDictionary` ships a working page per widget. Notable coverage:
layout (`areaLayout`, `pageLayout`, `basicFormLayout`, `sections`, `sidebar`,
`tabs`), data (`grids`, `gridsEdit`, `sortFilterEditGrid`, `instanceList`,
`lists`, `loops`, `templatedListItem`), input (`dropdown`, `snapSlider`,
`calendar`, `fileUploaderRow`, `attachmentList`), display (`images`,
`labeledImage`, `labeledThumbnail`, `monikerLevel`, `progressIndicator`,
`richText`), navigation/flow (`buttons`, `popup`, `relatedAction`, `micro`,
`editWizard`, `superEdit`, `submit`), business-process (`bpExtender`,
`bpExtenderConfirm`), and query (`queryBuild`, `redirectQuery`). When unsure
how a widget behaves, read its page:
`read_extend_example` with app `pmdWidgetDictionary`,
file `presentation/<widget>.pmd`.

## Orchestration patterns

`orchestrationToolkit` is a pattern-per-file library:

- **Error handling**: global handlers (`AsynchGlobalErrorHandlerLogging`,
  `GlobalErrorHandlerDemoNoModificationOfResponse`), local handlers with
  conditional output or propagation (`LocalErrorHandler*`), and HTTP steps with
  explicit `validResponseCodes` config vs. relying on handlers
  (`HTTPwithValidResponseCodesConfig`, `HTTPwithGlobalErrorHandlerNoValidResponseCodesSet`).
- **Paged REST consumption**: `RESTPagedGet.orchestration`.
- **Rollback on failure**: `LunchAccountUpdateWithRollback.orchestration`.
- **Validation**: `ValidateWithValidationIterator`, plus variants for custom
  responses and continue-on-condition.
- **File generation**: `CreateExcel.suborchestration` + `CreateSingleSheet`,
  `MergeXMLandCSV`, CSV→Excel task trio in `model/`.
- **Auth**: `OAuthCCExample.orchestration` (client-credentials to an external API).
- **Interop**: `launchStudioThroughSOAP.orchestration` (trigger a Studio
  integration), `LoopExternal` / `JoinLoopGrandchild` (looping compositions).

## Prism + Extend patterns

From `prismAndExtendDesignPatterns`: design pages for **large data sets**
(search-then-page rather than load-everything), and trigger Prism Data Change
Tasks through a **single-threaded correction queue** (`updateCorrectionQueue` →
`checkDataChangeStatus` → `bulkSaveProcessing`) so concurrent DCTs don't
collide. Prism must be enabled on the dev tenant. Post-deploy configuration is
manual: create the domain security policy in App Manager, grant the security
group Report/Task permissions, then run **Activate Pending Security Policy
Changes** — an app whose tasks 403 usually has pending security.

## Credentials and tenants

WDCLI has THREE independent credentials, each expiring on its own clock —
classify auth failures before "fixing" them, because retrying the wrong login
fixes nothing:

- **Account session** (`wdcli auth login`) — upload, build, most commands.
  This server maintains it automatically via system-user client credentials.
- **Tenanted token** (`wdcli tenant login <alias>`) — deploys only, one tenant
  at a time, browser SSO that only a human can complete. Per-tenant: logging
  into one tenant does not cover another.
- **API Explorer token** (copy from developer.workday.com/api-explorer) —
  direct REST calls from scripts, roughly 1-hour life.

REST gotchas: a 401 body parses as valid JSON — check the HTTP status before
parsing or an expired token masquerades as "no data"; the app REST API
silently paginates at 20, so every collection read needs an explicit limit.

Tenant safety: develop against DEVELOPMENT tenants only. Sandbox tenants
refresh weekly with PRODUCTION data and hold real employee records — "not
production" is not "safe". When `EXTEND_SAFE_TENANTS` is set it is an enforced
allowlist. Never expose `wdcli config show`, `auth token`, or `tenant token`
through any tool — all three print live bearer tokens in plaintext.

## Build diagnostics

The build is the oracle, and its failure modes are learnable:

- **Empty log = parse error.** If the log stops after "Downloading source
  code" with no Validating/Compiling lines, the grammar never parsed — an
  unknown property, a non-ASCII character, an id collision. Not a logic error.
  `upload_extend_app` flags this signature as `build_diagnosis`.
- **One variable per build.** When green goes red, bisect by reverting the
  single change; re-apply a multi-part change incrementally.
- **Green ≠ working.** A green build proves the grammar parsed, not runtime
  behavior: only a UI submission proves a form's onSend, only a launched flow
  proves an orchestration. Learnings distinguish `build-verified` from
  `runtime-verified` for exactly this reason.
- **Rule zero: never write a Workday component from memory.** Ground every
  component, in order of authority: downloaded real apps → the DevRel corpus
  (`search_extend_examples`) → the per-tag reference pages under
  developer.workday.com/documentation (the PMD tags index, doc id
  dyg1528862158582, lists every tag; each tag's page has the full property
  table) → Workday Community → the API Explorer.
- Apps are **permanent** — WDCLI has no delete. Name throwaways obviously
  (`zzTest...`), and remember apps are named `<name>_<orgShortId>`.

## Working with this MCP

- Cycle: `download_extend_app` → edit (`read`/`write_extend_app_file`) →
  `validate_extend_app` → `upload_extend_app` (builds) →
  `list_extend_app_versions` → `deploy_extend_app` to an allowlisted
  development tenant.
- Deploys to `EXTEND_PROD_TENANT` are always refused, and when
  `EXTEND_SAFE_TENANTS` is set, so is any tenant not on it. Promote through
  the Workday Developer Site after validating in a dev tenant.
- After any failure that cost a build: `log_extend_learning` (one file per
  learning, scrubbed of tenant values). Before debugging or writing an
  unfamiliar component: `get_extend_learnings`.
- Backups of edited files land in `EXTEND_WORK_DIR/.backups/`; uploads refuse
  while stray `.bak` files sit inside the app directory.
- `download_extend_app` refuses to overwrite local edits unless
  `overwrite: true`.

## Contributing upstream

The upstream `catalog/` is closed to external PRs (CODEOWNERS-gated; open an
issue instead). The `examples/` section **is** open to community contributions
— "Agent Skill" is an approved type and the section is sparse (3 entries as of
2026-08) — a candidate home for Extend-related agent skills built here.
