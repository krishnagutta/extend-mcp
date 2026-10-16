---
title: Runtime-verified REST endpoints for worker profile, explicit skills and job postings
date: 2026-10-15
tags: [rest, endpoints, staffing, recruiting, common]
verification: runtime-verified
---

**What happened:** Developer Agent, without a tenant token, guessed `talent/v1/workers/me/skills`, which returned 404. With a fresh `wdcli tenant login` its schema-aware tools found the real endpoints, which then worked at runtime.

**Rule:** These paths (relative to `apiGatewayEndpoint`, `authType: sso`) work in a development tenant:
- `common/v1/workers/me` returns a single object: `descriptor` (full name), `businessTitle`, `primarySupervisoryOrganization.descriptor`, `location.descriptor`, `yearsOfService`, `primaryWorkAddressText`, `isManager`.
- `staffing/v7/workers/me/explicitSkills` returns `data[]` of career-profile skills, each `{ id, descriptor, skillItem: { id, descriptor } }`. Note: `data` is the skills array itself, not `data[0].skills`.
- `recruiting/v4/jobPostings?status=Open` returns `data[]` with `title`, `jobDescription` (HTML), `primaryLocation.descriptor`, `categories[].descriptor`, `company.descriptor`, `url`. Postings carry no skills list; match skills against `jobDescription` text or load the job profile separately.

**Evidence:** Debug pages printing `endpoint.toJson()` in a development tenant, and App Hub Logs showing 200s for all three paths.
