---
title: Deploys that add model or attribute components force a tenant re-login and can report success:false while landing
date: 2026-10-18
tags: [deploy, wdcli, security-domains, attributes, sessions, debugging]
verification: runtime-verified (two episodes, one tenant); mechanism is inference
---

**What happened (twice in one day, same development tenant):**
- A deploy that added two `.securitydomain` files (and `securityDomains` on nine pages) returned `success: false` with an empty message from `wdcli app deploy`. Minutes later every Workday page in the tenant, including the delivered home page, rendered blank; the Workday shell request never returned and another session saw 401s and the login form. A fresh sign-in by the tenant admin fixed it at once. The build had in fact landed: every app page then answered with "You are not authorized to access this page" until the new domains were granted in App Manager.
- A second deploy that added `attributes/default.attributes` (plus cards and a page layout) did the same: `success: false`, then a blank shell for everyone signed in. Presentation-only deploys earlier the same day (pages and scripts only) never did this.

**Working explanation (inference, not documented):** a deploy that changes model-level or attribute components breaks the Workday UI shell bootstrap for sessions that were already signed in, while the API behind the same session keeps answering. Two data points: a second session still received 200 responses with real inbox data five minutes into the second blank period, and 401s only appeared about fifty minutes into the first one. A fresh login rebuilds the shell. So the "outage" is a forced re-login for existing sessions, not a tenant failure, and the CLI's `success: false` in that case does not mean the build was rejected.

**Caveat (same day, later):** the tenant owner reported the development tenant itself as down at about the time of the second episode, so both blank-shell episodes may have been tenant outages that coincided with the deploys rather than effects of them. Keep both readings until a model deploy is tried on a healthy tenant with a second signed-in session watching.

**Rules:**
- After any deploy that adds or changes `model/` or `attributes/` components, expect every signed-in browser session in the tenant to go blank; sign out and sign in again before judging the deploy.
- Do not trust `success: false` with an empty message after such a deploy. Check `wdcli app builds` for the build and open a page: a page-security refusal or new layout proves it landed.
- Batch all model and attribute changes into one scheduled deploy so the re-login happens once; keep presentation-only changes as separate, frequent deploys.
- When adding page security domains, have the App Manager grants ready to make immediately after the deploy; until then every secured page is locked for everyone, including the admin.
- Before deploying, stop any proxy session and tell anyone testing in the tenant.

**Evidence:** `wdcli app builds` showed both builds as SUCCEEDED with timestamps matching the "failed" deploys; the app's access logs showed no requests at all during the blank periods; page-security errors appeared only after the first episode; the second episode began within a minute of the attributes deploy.
