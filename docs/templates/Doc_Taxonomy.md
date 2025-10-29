---
title: Documentation Taxonomy & Tagging
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Documentation Taxonomy & Tagging

Purpose: Provide a consistent categorization and tagging scheme to improve discovery, search, and linkage across the documentation library.

---

## Top-Level Categories
- `architecture/` — system diagrams, design decisions, modules, interfaces.
- `api/` — firmware/web APIs, contracts, examples.
- `features/` — product features (e.g., Node UI), specs, UX documentation.
- `planning/` — roadmaps, implementation plans, milestones, sequencing.
- `analysis/` — investigations, audits, performance reports.
- `qa/` — test plans, results, quality gates.
- `resources/` — reference materials, pattern libraries, external links.
- `templates/` — governance standards, prompt suites, templates.

Align repository folders to the above; migrate ad‑hoc documents to their closest canonical category.

---

## Tagging Scheme
- Domain: `firmware`, `frontend`, `codegen`, `node-ui`, `audio`, `webserver`.
- Platform: `web`, `ios`, `desktop`.
- Lifecycle: `draft`, `review`, `approved`, `deprecated`, `archived` (from frontmatter).
- Type: `adr`, `spec`, `guide`, `template`, `report`, `plan`, `analysis`.

Use 3–6 tags per doc to capture area, platform, and type. Avoid single‑use tags unless necessary.

---

## Examples (Mapping Existing Content)
- `docs/features/node-ui/` — Node UI design, integration plans, Figma specs; tags: `[frontend, node-ui, web, spec]`.
- `docs/analysis/webserver/` — webserver route mapping; tags: `[firmware, webserver, analysis]`.
- `docs/api/K1_FIRMWARE_API.md` — API contracts; tags: `[firmware, api, guide]`.
- `Implementation.plans/` → Migrate approved plans into `docs/planning/` over time; tags: `[plan, frontend/firmware]`.

---

## Tagging Conventions
- Use `kebab-case` for tags.
- Prefer generic reusable tags; avoid personal names or sprint codes.
- Keep tags stable; document additions in taxonomy changelog.

---

## Taxonomy Changelog
- 2025-10-28 — v1.0 — Initial taxonomy adopted: categories, domain/platform/type tags.

