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

## Working with this MCP

- Cycle: `download_extend_app` → edit (`read`/`write_extend_app_file`) →
  `validate_extend_app` → `upload_extend_app` (builds) →
  `list_extend_app_versions` → `deploy_extend_app` to a non-production tenant.
- Deploys to `EXTEND_PROD_TENANT` are refused; promote through the Workday
  Developer Site after sandbox validation.
- Backups of edited files land in `EXTEND_WORK_DIR/.backups/`; uploads refuse
  while stray `.bak` files sit inside the app directory.
- `download_extend_app` refuses to overwrite local edits unless
  `overwrite: true`.

## Contributing upstream

The upstream `catalog/` is closed to external PRs (CODEOWNERS-gated; open an
issue instead). The `examples/` section **is** open to community contributions
— "Agent Skill" is an approved type and the section is sparse (3 entries as of
2026-08) — a candidate home for Extend-related agent skills built here.
