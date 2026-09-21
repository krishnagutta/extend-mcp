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
- Promotion ladder: development → implementation → sandbox → production, one
  level per `promote_extend_app` call, always with an explicit version and a
  human-typed confirmation string. Copies must come from a downloaded local
  directory (`copy_extend_app` enforces this). Apps and copies are permanent.
- Build logs: `list_extend_app_builds` → `get_extend_build_log <build_id>`;
  the empty-log parse-error signature is flagged automatically.
- Backups of edited files land in `EXTEND_WORK_DIR/.backups/`; uploads refuse
  while stray `.bak` files sit inside the app directory.
- `download_extend_app` refuses to overwrite local edits unless
  `overwrite: true`.

## Contributing upstream

The upstream `catalog/` is closed to external PRs (CODEOWNERS-gated; open an
issue instead). The `examples/` section **is** open to community contributions
— "Agent Skill" is an approved type and the section is sparse (3 entries as of
2026-08) — a candidate home for Extend-related agent skills built here.

## Grounding workflow

Extend syntax and limits are easy to misremember. Before writing or reviewing a component, look it up:

1. `get_extend_schema` — which attributes actually occur on a widget, endpoint, business-object field or orchestration
   node in real apps, with values and example files. An attribute or widget that does not occur there is a red flag,
   not a creative option.
2. `get_extend_best_practices` — Workday DevRel's rule-by-rule guide (the Arcane Auditor rules run on every example PR).
   Cite the rule name in a review instead of an opinion.
3. `search_extend_examples` / `read_extend_example` — copy the shape from a working app, then adapt.
4. `get_extend_learnings` — failures already paid for.
5. Official docs for numbers: developer.workday.com "Reference: Limits on Extend App Components" and "Reference:
   Orchestration Runtime Limits". Never quote a limit from memory; re-check each release.

Source tiers, strongest first: Workday documentation, real app file, tool ground truth (wdcli manifest, build log),
community post, memory. Say which one a claim rests on.

## Platform limits

Checked 2026-09 against developer.workday.com ("Limits on Extend App Components", "Orchestration Runtime Limits") and the
admin guide ("Limits on Presentation Components", "WQL Result Limits", "WQL and RaaS Comparisons"). Re-check each release.

- **Model:** 20 business objects per app; 50 fields per object; 10 SINGLE_/MULTI_INSTANCE fields per object; 25 instance
  fields targeting Workday-delivered objects per app; 5 with enableReportingFromTarget per app; 5 indexable fields per
  object; 40 derived fields per object; 3 searchable TEXT fields per app; 10 security domains, 5 business processes,
  20 tasks, 10 reports, 5 attachment objects per app; attachments 30 MB. Instance capacity is tenant-wide and SKU-bound.
- **Presentation:** 24 s per endpoint; 60 s per PMD request (load, submit, remote validation, all endpoints together);
  30 outbound endpoints per PMD; 30 non-deferred inbound endpoints; 25 MB endpoint response; 75 pages per app; 100 KB per
  .pmd/.amd/.smd/.pod/.script file; PMD script 5 s CPU, 25 call frames, 2 nested module levels; labels 255 chars;
  fileUploader 10 MB per file, 5 files, and xlsx is not in the default allowed types.
- **Orchestration:** 25 s when a page triggers a synchronous orchestration (overrides its own timeout); 5 min synchronous
  otherwise; 48 h asynchronous; one process 60 min in production, 45 min elsewhere; 31 recursive synchronous self-calls;
  300 steps; 150 orchestrations and sub-orchestrations per app; 200 MB in memory; 20 MB launch message.
- **Data access:** REST collections default 20, maximum 100 per request, so always pass an explicit limit; WQL 1,000,000
  rows per query, 10,000 per page, 5 min through api.workday.com; RaaS has no pagination; API calls are throttled per
  second with HTTP 429.
- Custom Object limits (200 fields, 1,500 instances) are a different feature and do not apply to Extend business objects.
- Workday states Extend apps "are not intended for high-volume import or export of large quantities of data".

## Business object schema

From the corpus index (44 business objects). Top level always has `id`, `name`, `label`, `defaultSecurityDomains`,
`defaultCollection` ({ name, label }) and `fields`; `derivedFields` is optional. Field types seen: TEXT, SINGLE_INSTANCE,
BOOLEAN, DATE, DECIMAL, MULTI_INSTANCE, INTEGER, CURRENCY. Every field has `id`, `name`, `type`.

- **TEXT** adds `useForDisplay`, `isReferenceId`, `enableIndex`, `enableSearch`, `isPurgeable`, optional `securityDomains`.
  Indexing is opt-in (`enableIndex: true` on 4 of 46 fields that state it): decide which filters deserve an index.
- **SINGLE_INSTANCE / MULTI_INSTANCE** add `target` (uppercase Workday object such as `WORKER`, or another object in the
  same app by name), `secureByTarget`, `useForDisplay`, `enableReportingFromTarget`, `isPurgeable`.
- A target must be on the tenant's *View Business Objects Available for Extension* report. Check before modelling.
- Run `get_extend_schema` with kind `businessobject-field` for the live table rather than trusting this summary.

## Grids, paging and endpoint safety

- **Server-side paging** uses the grid's `pagingInfo` object: `{ endPoint, rowCount, data }` bound to a paged endpoint
  (see `catalog/pmdWidgetDictionary/presentation/gridsView.pmd`). `autoPaging` also exists.
- **Do not combine paging with `sortableAndFilterable` columns** (GridPagingWithSortableFilterableRule, ACTION): every page
  change refetches, re-sorts and re-filters. Page on the server and filter with prompts, or keep the set small and
  unpaged.
- A grid bound to an unfiltered collection loads everything; the 24 s endpoint limit is what users then hit. Put project,
  status and owner scope in the query, select only displayed columns, and pass a limit.
- `excelExportEnabled` is limited to about 60 s and Workday warns above 4,000 rows; export large sets with RaaS.
- **`isCollection: true` on inbound endpoints** can degrade the whole tenant under concurrent use
  (NoIsCollectionOnEndpointsRule). Prefer WQL or RaaS.
- **Always set `failOnStatusCodes`** (at least 400 and 403) or failures are swallowed (EndpointFailOnStatusCodesRule).
- Keep queries in WQL Query components (`wqlQuery` on the endpoint) with parameters instead of concatenating strings in
  PMD script; interpolating user input into `contains('…')` is also an injection risk.
- Endpoint attributes that really occur: `name`, `baseUrlType`, `url`, `authType` (sso, isu, noAuth), `exclude`,
  `deferred`, `httpMethod`, `wqlQuery`, `graphQuery`, `failOnStatusCodes`, `isCollection`, `bestEffort`, `onSend`,
  `responseErrorDetail`, `headers`.

## Orchestration vocabulary

Node types that occur in the corpus include SendWorkdayApiRequest, SendHttpRequest, CallSubflow, Loop, BatchLoop with
SizeBasedBatchStrategy or CustomBatchStrategy, JoinLoop, Aggregate, BranchOnConditions, ContinueOnConditions,
ErrorHandler, RetryPolicy with BackOff, Validate / ValidationCheck, CreateJson, CreateTextTemplate, CsvFormat / CsvColumn,
StoreDocument, LogToFile, SendIntegrationMessage, AwsLambdaInvoke. Flow type is `.maya.FlowSync` or `.maya.FlowAsync`.

- There is **no Excel parsing node** in the corpus; file ingestion examples parse CSV (`asCSV()`). Treat xlsx upload as
  unproven until demonstrated in a tenant.
- A synchronous orchestration launched from a page that loops over hundreds of writes will hit the 25 s page limit and
  apply only part of the work. Use FlowAsync, a status object the page polls, and BatchLoop.
- Add an ErrorHandler and a RetryPolicy with back-off around API steps; expect HTTP 429 under load.
- ISU-authenticated endpoints fail with HTTP 500 and an empty body until the ISU is assigned to the app in Application
  Manager in that tenant; naming it in the SMD is not enough. Re-check after every promotion.

## WDCLI operations

Verified against wdcli 1.9.20 (its `oclif.manifest.json` is the authority; `--help` hides commands).

- `app download`, `app deploy` and `app builds` need a version selector: `--version`, `--version-id` or `--latest-version`.
- `auth login` without `--system-user` is a browser OAuth flow: it listens on `127.0.0.1:64000`, opens the default
  browser, and gives up after a hard-coded 60 seconds. Landing on the Developer Site downloads page means the callback
  was missed; be signed in to the right identity first and retry. `tenant login <alias>` works the same way.
- Login environment is `enterprise` by default; `personal` and `eusovereign` exist (`WDCLI_ENVIRONMENT` or config).
- wdcli is an oclif CLI, so `WDCLI_CONFIG_DIR`, `WDCLI_DATA_DIR` and `WDCLI_CACHE_DIR` (or a different `HOME`) give a
  fully separate profile. Use one per client or engagement; never share sessions across them.
- This server runs without system-user credentials when `WDCLI_CLIENT_ID` and `WDCLI_CLIENT_SECRET` are both empty: it
  never logs in by itself and tells you to run `wdcli auth login` in the same profile when the session expires.
- The macOS installer's post-install script links into `/usr/local/bin`; on Apple Silicon Macs that directory may not
  exist, the installer reports failure, and the payload is still at `/usr/local/opt/workday/wdcli`. Create the directory
  and the symlink by hand.
