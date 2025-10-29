---
title: Implementation Plans
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# Implementation Plans

Active execution artifacts only. Archive completed work under `../docs/`.

## Structure
- `runbooks/` — repeatable operational workflows (e.g. `DEPLOYMENT_CHECKLIST.md`, `test-ultra-supreme-workflow.yaml`)
- `roadmaps/` — phase or sprint plans that are currently in motion
- `backlog/` — prioritised task stacks awaiting scheduling

## Contribution Notes
1. Keep filenames in `snake_case` with clear intent (e.g. `phase_b_audio_roadmap.md`).
2. Reference upstream documentation in `../docs/` rather than duplicating content.
3. When a plan is completed, move its summary to `../docs/reports/` and archive or delete the stale execution doc.
4. Tooling belongs in `../tools/` (see `../tools/claude_skill_pack`).

_Last updated: 2024-05-18 (Codex)_
