---
title: Documentation Cleanup Plan (Operational Guide)
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Documentation Cleanup Plan (Operational Guide)

Goal: Turn a fragmented document library into a reliable, discoverable knowledge base within two weeks. This plan defines phases, tasks, roles, and success metrics.

---

## Scope
- All Markdown docs under `docs/`, `Implementation.plans/`, and other documentation folders.
- Excludes source code changes; focuses on organization and standards.

---

## Roles
- Coordinator (Maintainer): runs the checklist, assigns owners, tracks progress.
- Doc Owners: update content and frontmatter; resolve duplicates.
- Reviewers: validate accuracy and usability.

---

## Phases & Tasks

Phase 1 — Inventory (Day 1–2)
- Enumerate all docs; collect paths, titles, last_updated, owner (if any).
- Identify orphans (no owner), duplicates, and outdated (>180 days).
- Output: `docs_index.json` or CSV inventory.

Phase 2 — Triage & Label (Day 3–4)
- Assign owners; set `status` (`draft/review/approved/deprecated`).
- Tag each doc using taxonomy; add `related_docs` links.
- Output: PRs adding frontmatter to all docs.

Phase 3 — Normalize & Deduplicate (Day 5–7)
- Consolidate duplicates into a single canonical doc; deprecate older copies.
- Normalize naming to `kebab-case.md` and move into canonical folders.
- Output: PR with moves and deprecations; update links.

Phase 4 — Index & Navigation (Day 8)
- Create index pages per category with curated links and status badges.
- Add `README.md` at `docs/` describing structure and how to contribute.

Phase 5 — Quality Gate (Day 9–10)
- Run link check and frontmatter validation.
- Spot‑check accessibility and clarity; fix broken anchors.
- Approve and merge; schedule next review cadence.

---

## Tools (Recommended)
- Link checker: `markdown-link-check` or similar.
- Frontmatter validator: simple Node script or CI step.
- Diagram rendering: keep diagrams in `tools/render_diagrams.sh`.

---

## Version Control & Process
- Use small, focused PRs per phase.
- Maintain a `docs/README.md` with structure and contribution guidelines.
- Record changes in each doc’s `## Changelog`.

---

## Success Metrics
- 100% docs have valid frontmatter and tags.
- 0 broken links in CI.
- 0 orphan docs; all have owners.
- Reduced duplicates (target: ≥80% eliminated).

---

## Risks & Mitigations
- Risk: Moving files breaks links → Mitigation: run link checker; add redirects where applicable.
- Risk: Ownership gaps → Mitigation: Coordinator assigns fallback owner; set review due dates.
- Risk: Large PRs → Mitigation: phase by phase, keep PRs small and scoped.

---

## Cadence & Maintenance
- Quarterly audit: re‑validate Approved docs; archive deprecated over 90 days.
- Add new tags sparingly; document in taxonomy changelog.

