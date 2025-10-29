---
title: Documentation Multipliers Playbook
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-28
tags: [guide, docs, multipliers]
related_docs: [docs/INDEX.md, docs/templates/Documentation_Governance.md, docs/templates/Doc_Taxonomy.md]
---
# Documentation Multipliers Playbook

Purpose: Identify high‑leverage improvements that amplify documentation quality, discoverability, and reliability across the workspace.

## Navigation & Discovery
- Curated Index (`docs/INDEX.md`): keep critical links centralized.
- Inventory JSON (`docs/docs_index.json`): programmatic overview for audits.
- Tag Pages: generate tag‑based indexes (e.g., `node-ui`, `webserver`).
- Status Badges: surface `status` and `owner` per doc inline.

## Governance & Automation
- CI Validation: enforce frontmatter and status via GitHub Actions.
- Pre‑Commit Hook: local validation before pushes to reduce CI noise.
- PR Template: standardized checklist for doc changes.
- Review Cadence: quarterly audits; auto‑flag stale docs.

## Authoring Ergonomics
- VS Code Snippets: frontmatter boilerplate and common section scaffolds.
- Templates Library: reusable templates in `docs/templates/`.
- Prompt Standards: Figma Make guide to reduce design prompt drift.

## Quality & Reliability
- Link Checker: prevent broken references; run in CI for doc PRs.
- Accessibility Baseline: headings structure, plain language, scannability.
- Changelog Discipline: visible change history and traceability per doc.

## Cross‑Linking With Code
- Source Anchors: link key docs to files (e.g., `webserver.cpp`).
- Code Comments: optional doc refs in code for critical modules.
- ADR References: decisions linked from implementation guides.

## Reporting & Analytics
- Docs Dashboard: metrics table — counts by status, missing frontmatter, orphan owners.
- Coverage Goals: target % of docs with complete frontmatter and tags.
- Drift Alerts: list of docs not updated in >90 days.

## Roadmap (Suggested)
- Phase 1: Index + Inventory + CI validation.
- Phase 2: Dashboard + Pre‑commit hook + Tag pages.
- Phase 3: VS Code snippets + Stale doc alerts.

## Changelog
- 2025-10-28 — v1.0 — Initial multipliers playbook created.

