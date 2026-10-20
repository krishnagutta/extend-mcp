---
title: A POST inbound endpoint cannot be invoked from onLoad; call it from a pageActionButton onClick or use a GET launch
date: 2026-10-20
tags: [pmd, orchestration, endpoint, onload, post, runtime]
verification: runtime-verified
---

**What happened:** A view page declared a deferred POST inbound endpoint (baseUrlType orchestration, url `<orchestration>/launch`, onSend returning a body built from pageVariables) and called `endpoint.invoke()` inside onLoad behind an attribute check. With the attribute on, the page failed to load with "1 Error"; the developer-site app log (category pageError.script) read: "UnsupportedOperationException: The page with the POST inbound endpoint <name> couldn't be loaded. If a button attempted to load the page, set the button's commandHttpMethod attribute to POST. Script Excerpt: const resp = <name>.invoke();". With the attribute off (endpoint never invoked) the page rendered normally.

**Root cause:** Page load runs under the page's own GET; a POST inbound endpoint is only reachable when the page itself was requested with POST (a button with commandHttpMethod POST) or when invoked later from a user action. onLoad cannot invoke it even when the endpoint is deferred.

**Rule:** To call an orchestration that needs a request body: put the `invoke()` in a pageActionButton onClick (catalog: AWSStarterKit sentimentAnalysisWithReuse, orchestrationToolkit triggerOrchestration) and write the result into widgets, or expose the orchestration as a GET `<name>/launch?param=...` endpoint and read it in onLoad (catalog: pmdWidgetDictionary bpExtender). Do not invoke a POST inbound endpoint from onLoad.

**Evidence:** Development tenant 2026-10-19; build with the onLoad invoke failed at runtime, the same build rendered with the attribute off; log category pageError.script, text quoted above.
