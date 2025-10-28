---
title: Documentation Governance Standard
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Documentation Governance Standard

Purpose: Establish clear ownership, lifecycle, and quality controls for all documentation in the K1 repository. This reduces drift, increases discoverability, and enables reliable handoff.

---

## Roles & Ownership
- Doc Owner: accountable for accuracy and updates.
- Reviewer: validates technical correctness and usability.
- Maintainer: enforces standards, runs doc checks, and merges updates.

Assign one primary Owner per document. Optional co‑owners allowed; list all in frontmatter.

---

## Document Lifecycle
- Draft → Review → Approved → Deprecated → Archived
- Status definitions:
  - Draft: new or incomplete; not relied upon for production decisions.
  - Review: undergoing peer review; changes expected.
  - Approved: signed off; canonical reference.
  - Deprecated: superseded; kept for history/context.
  - Archived: moved to `/archive/` or `deprecated/`; not to be used.

Lifecycle triggers:
- Major product changes → re‑review affected docs.
- 90 days since last review on an Approved doc → schedule re‑validation.

---

## Frontmatter (Mandatory)
Add YAML frontmatter at the top of every doc:
```
---
title: <Clear Title>
status: <draft|review|approved|deprecated|archived>
version: vX.Y
owner: [Name, Team]
reviewers: [Name A, Name B]
last_updated: YYYY-MM-DD
next_review_due: YYYY-MM-DD
tags: [area, platform, feature]
related_docs: [path/to/related1.md, path/to/related2.md]
---
```

Minimum required fields: `title`, `status`, `version`, `owner`, `last_updated`, `tags`.

---

## Naming & Location Conventions
- File names: `kebab-case.md` (e.g., `node-ui-design-system.md`).
- ADRs: `docs/adr/YYYY-MM-DD-meaningful-title.md`.
- Place docs under the closest canonical folder:
  - `docs/architecture/`, `docs/api/`, `docs/features/`, `docs/planning/`, `docs/analysis/`, `docs/qa/`, `docs/resources/`, `docs/templates/`.
  - Planning drafts under `Implementation.plans/` may be migrated into `docs/planning/` when approved.

---

## Review Workflow
1. Author updates doc with required frontmatter and follows templates.
2. Open PR with summary, impacted areas, and links to related docs.
3. Reviewer validates content and acceptance (see QA section).
4. Maintainer checks compliance (frontmatter, naming, location, links) and merges.

Sign‑off criteria:
- Frontmatter complete and current.
- Tags and related_docs set.
- Broken links fixed; references inline.
- Status transitions documented in changelog.

---

## Quality Bar & Checks
- Clarity: specific, actionable; avoid ambiguous language.
- Structure: clear headings, concise bullets, acceptance where applicable.
- Accessibility: plain language; link context; readable formatting.
- Consistency: naming, tokens, variants, layout rules consistent with standards.
- Traceability: changelog entries; related_docs linkage.

Automatable checks (recommended):
- Frontmatter presence and field validation.
- Markdown link check.
- Lint for headings hierarchy (H1 once; logical nesting).

---

## Changelog (Per Doc)
Append a `## Changelog` section:
```
- 2025-10-28 — v1.0 — Initial adoption of governance standard (Owner: <Name>)
```

---

## Archival & Deprecation
- Deprecate when replaced by a newer doc; add a link to the successor.
- Archive after 90 days in deprecated state unless explicitly retained for compliance.

