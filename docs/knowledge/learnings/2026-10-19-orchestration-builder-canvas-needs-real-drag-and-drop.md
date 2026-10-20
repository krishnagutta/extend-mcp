---
title: Orchestration Builder adds steps only by real drag-and-drop; automated browser panes stop at the Start step
date: 2026-10-19
tags: [orchestration, builder, browser-automation, developer-site]
verification: runtime-verified
---

**What happened:** Driving Orchestration Builder from an embedded browser pane worked for creating the orchestration, naming it, configuring the Start step (Generate Structure from a pasted JSON sample) and saving to App Hub. Adding any component (Create JSON, Send HTTP Request, Create Values, Branch, Loop) requires dragging it from the Components panel onto the "Drop Component Here" zone. Simulated mouse drags (press, move, release) did not drop; clicking the drop zone or the component opened nothing; the Keyboard Shortcuts panel lists copy, cut, paste, disable, delete, duplicate, select all, find, toggle panels, save and deploy, but no "add component".

**Rule:** Plan for a human (or a real browser with native drag events) to place each step. Prepare a build sheet with one line per step: component, reference name, every field value and expression, and the credential reference, so the clicks take minutes. Do the Start structure and the save from the automated pane if useful; stop there and hand over.

**Evidence:** Developer Site Orchestration Builder, 2026-10-19, from the Claude desktop browser pane (Chromium 152); three drag attempts by text and by handle, one drop-zone click, one keyboard-shortcuts review.
