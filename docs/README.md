# K1 Documentation Library

## Maintainer
- Primary steward: @spectrasynq
- Escalation: open an issue or tag the steward in Slack before reorganising folders

## Directory Map
- `architecture/` — system topology, component specs, integration diagrams
- `analysis/` — deep dives and research packs (`audio_system/`, `forensic_audio_pipeline/`, etc.)
- `planning/` — forward-looking proposals, migration plans, prioritisation decks
- `reports/` — milestone reports, validation summaries, delivery notes
- `templates/` — reusable scaffolds for analyses, reports, and reviews
- `resources/` — quick references, guides, node archives, tool READMEs
- `adr/` — architecture decision records (ADR-####)

## How To Use
1. Read `../CLAUDE.md` for agent guardrails before adding or moving docs.
2. File new documents directly into the correct folder; do not leave items at repo root.
3. Update this README (and any folder-specific README) when adding new categories or major assets.
4. Archive superseded content under `analysis/archive/` or `reports/archive/` instead of deleting outright.

## Cross-References
- Execution artifacts (runbooks, roadmaps, backlogs) now live in `../Implementation.plans/`.
- Tooling and automation assets belong in `../tools/` (see `../tools/claude_skill_pack`).
- Planning doc canonical home: `planning/` (e.g. `AUDIO_MIGRATION_PLAN.md`).
 - Quick reference: `resources/BETWEENNESS_CONTROLS_QUICK_REFERENCE.md` for libgraph betweenness domains & normalization.

## Recent Additions
- `analysis/palette_system_forensic_analysis.md` — Complete forensic investigation of palette selection failures (2025-10-27)
- `analysis/control_system_bottleneck_matrix.md` — Prioritized bottleneck analysis with severity scores (2025-10-27)  
- `reports/k1_system_audit_phase1_completion.md` — Phase 1 audit completion and deployment decision (2025-10-27)
 - `resources/BETWEENNESS_CONTROLS_QUICK_REFERENCE.md` — Condensed selector/normalization reference for libgraph (2025-10-27)

## Last Updated
- 2025-10-27 — Added K1 system audit analysis and reports (Claude SUPREME Analyst)
- 2024-05-18 — Workspace taxonomy refresh (Codex)
