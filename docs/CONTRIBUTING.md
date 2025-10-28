---
title: Documentation Contribution Guide
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-28
tags: [guide, docs, governance]
related_docs: [docs/templates/Documentation_Governance.md, docs/templates/Doc_Taxonomy.md]
---
# Documentation Contribution Guide

Use this guide when adding or updating documentation anywhere in the repository.

## Standards Summary
- Frontmatter: Required fields — `title`, `status`, `version`, `owner`, `last_updated`, `tags`.
- Naming: `kebab-case.md` filenames.
- Location: Place docs under the closest category (`docs/architecture/`, `docs/api/`, `docs/features/`, etc.).
- Tags: Use taxonomy (`domain`, `platform`, `type`); include 3–6.
- Changelog: Append changes under a `## Changelog` section in each doc.

## Workflow
1. Use the template-first scaffolder when creating docs:
   - `node tools/src/new-doc.js --type feature --title "Node UI" --out docs/features/node-ui/spec.md`
   - Types: `feature`, `analysis`, `plan`.
2. Create or update your doc with frontmatter and standard sections.
2. Link related docs via `related_docs` and inline references.
3. Open a PR and complete the Documentation Checklist.
4. CI runs frontmatter validation; fix any errors reported.
5. Reviewer checks accuracy and usability; Maintainer verifies standards.

## Templates
- Governance standard: `docs/templates/Documentation_Governance.md`
- Taxonomy: `docs/templates/Doc_Taxonomy.md`
- Cleanup plan: `docs/templates/Docs_Cleanup_Plan.md`
- Prompt Suite Guide: `docs/templates/FigmaMake_Prompt_Suite_Guide.md`
- Index template: `docs/templates/Docs_Index_Template.md`

## Reviewing & Status
- Lifecycle: Draft → Review → Approved → Deprecated → Archived.
- Re‑validate Approved docs every 90 days; archive deprecated after 90 days.

## Quality Checklist
- Clear, concise sections with actionable guidance.
- Correct tags and category placement.
- Links work; anchors and references updated.
- Accessibility: plain language, scannable headings.

## Changelog
- 2025-10-28 — v1.0 — Initial contribution guide established.
