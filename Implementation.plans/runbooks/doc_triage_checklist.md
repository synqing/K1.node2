---
title: Weekly Documentation Triage
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
<!-- markdownlint-disable MD013 -->

# Weekly Documentation Triage

**Cadence:** Every Monday (or first workday of the week)  
**Owner:** Documentation steward (`@spectrasynq` by default)  
**Duration:** 15–20 minutes

## 1. Prep

- [ ] Skim `git log --stat HEAD@{1.week.ago}..HEAD -- '*.md'` for new or modified docs.
- [ ] Review outstanding PRs affecting docs and ensure `CLAUDE.md` guardrails were followed.

## 2. Filing Compliance

- [ ] Confirm new Markdown files live under `docs/` or `Implementation.plans/` (no root-level strays).
- [ ] Verify each file sits in the correct shelf (`architecture/`, `analysis/`, `planning/`, `reports/`,
      `templates/`, `resources/`, `adr/`).
- [ ] For agent output, ensure `CLAUDE.md` front-matter (author, date, status, intent) is present.

## 3. Index Updates

- [ ] Update `docs/README.md` and relevant folder README/index files with any notable additions.
- [ ] Append changelog entries when taxonomy or guardrail docs change (e.g., `CLAUDE.md`).

## 4. Quality Spot Checks

- [ ] Run `npx markdownlint-cli "**/*.md"` (document any violations for follow-up).
- [ ] Run `npx markdown-link-check` on changed docs to catch dead links.
- [ ] Flag oversized files (>25 KB) for potential summarisation or split.

## 5. Follow-Up Actions

- [ ] Open issues/PR comments for misplaced or non-compliant docs.
- [ ] Schedule cleanup tasks (archive or delete superseded material).
- [ ] Share highlights and reminders in the team channel (include link to `CLAUDE.md`).

## 6. Log Completion

- [ ] Drop a short note in the project log (`DELIVERABLES_MANIFEST.txt` or team Slack) with date plus key
      observations.

<!-- markdownlint-enable MD013 -->
