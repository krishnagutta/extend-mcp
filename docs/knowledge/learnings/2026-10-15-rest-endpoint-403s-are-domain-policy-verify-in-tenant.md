---
title: A REST 403 for one user is a domain security policy; verify the domain in the tenant
date: 2026-10-15
tags: [security, rest, recruiting, debugging]
verification: runtime-verified
---

**What happened:** A page calling `recruiting/v4/jobPostings` worked for an HR administrator but returned 403 for an ordinary employee. Developer Agent named a governing domain confidently, with no visible tenant lookup, and it was not quite right.

**Root cause:** Delivered REST resources are secured by Workday domain security policies, and an app's SSO endpoint runs as the signed-in user. The policy that governs `jobPostings` grants integration **Get** only to implementer/administrator groups by default.

**Rule:** Do not take a domain name from an assistant's answer. Verify it in the tenant with **View Security for Securable Item** (search the resource, open the Web Service Task row, read the Domain Security table), then open the policy to see which groups hold **Get**. For `jobPostings` the governing policies are the parent **Job Postings** plus **Job Postings: External** and **Job Postings: Internal**, and a request must pass **all** of them. Granting Get on the Internal child alone still returned 403; the parent **Job Postings** policy (Get held only by Implementers by default) must also grant the group. The External child inherits the parent, so a parent grant covers it. Granting integration Get requires **Activate Pending Security Policy Changes** before it takes effect, and a child showing "Has Pending Changes: Yes" means activation has not reached it yet. The App Hub Logs (`wd_log_type: app`, level ERROR) name the endpoint and status code for the failing user, which is faster than guessing.

**Evidence:** View Security for Securable Item and View Domain Security Policy in a development tenant; App Hub Logs showing `An endpoint error has occurred for 'jobPostings'... Status Code: 403` for the employee session.
