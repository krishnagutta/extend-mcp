---
title: Paging plus sortable filterable grid columns is a performance defect
date: 2026-09-21
tags: [pmd, grid, performance]
verification: unverified
---

**What happened:** A prototype overview grid loaded an unfiltered collection, made every column sortableAndFilterable and enabled Excel export, relying on the whole dataset being in the browser.

**Root cause:** Client-side sort and filter only work when all rows are loaded; adding paging on top makes every page change refetch, re-sort and re-filter.

**Rule:** Scope the query (project, status, owner), page on the server with the grid pagingInfo object, turn sortableAndFilterable off on paged grids, filter with prompts, export large sets through RaaS. Workday DevRel flags the combination as ACTION (GridPagingWithSortableFilterableRule).

**Evidence:** get_extend_best_practices, rule name Grid Paging With Sortable Filterable; gridsView.pmd in the pmdWidgetDictionary catalog app shows pagingInfo.
