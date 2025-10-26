<!-- markdownlint-disable MD013 -->

# CLAUDE Agent Operations Manual

## Purpose

- Provide a single source of truth for where Claude-generated artifacts live.
- Guardrail autonomous and semi-autonomous Claude agents so every output slots cleanly into the curated workspace taxonomy.
- Prevent root-level sprawl by enforcing a consistent filing, naming, and review workflow.

If you are a Claude agent creating or modifying documentation, follow this guide before you commit or hand work off to a human partner.

---

## Workspace Map

```text
/docs
  /architecture      -> System design, component interaction, diagrams
  /analysis          -> Deep dives, comparative studies, forensics
  /planning          -> Future work, migration plans, decision proposals
  /reports           -> Phase closeouts, validation summaries, delivery notes
  /templates         -> Reusable report or analysis scaffolds
  /adr               -> Architecture Decision Records (ADR-####-*.md)
  /resources         -> Glossaries, quick references, shared indices
/Implementation.plans
  /roadmaps          -> Active execution plans, multi-sprint arcs
  /runbooks          -> Step-by-step operational guides
  /backlog           -> Prioritized task stacks awaiting execution
/Implementation.plans
  /roadmaps          -> Active execution plans, multi-sprint arcs
  /runbooks          -> Step-by-step operational guides
  /backlog           -> Prioritized task stacks awaiting execution
```

Only living execution artifacts (things you expect to revisit during delivery) belong under `/Implementation.plans`. All historical, informational, or archival materials belong under `/docs`.

---

## Routing Quick Reference

| Doc type                             | Destination folder           | Example filename                                |
|-------------------------------------|------------------------------|-------------------------------------------------|
| Architecture overview               | `docs/architecture/`         | `rendering_pipeline_overview.md`                |
| Technical analysis / comparison     | `docs/analysis/`             | `stability_analysis_and_comparison.md`          |
| Decision record                     | `docs/adr/`                  | `ADR-0004-led-topology-choice.md`               |
| Phase or milestone report           | `docs/reports/`              | `phase_a_completion_report.md`                  |
| Planning proposal / migration plan  | `docs/planning/`             | `audio_sync_migration_plan.md`                  |
| Reusable template or checklist      | `docs/templates/`            | `pattern_review_template.md`                    |
| Operational runbook                 | `Implementation.plans/runbooks/` | `ota_deployment_runbook.md`               |
| Active roadmap / gantt narrative    | `Implementation.plans/roadmaps/` | `phase_b_execution_path.md`               |
| Backlog / queue                     | `Implementation.plans/backlog/`  | `audio_pipeline_todo.md`                  |
| Tooling assets or scripts           | `tools/` or existing tooling tree | `tools/generate_release_notes.mjs`     |

When in doubt, prefer `/docs`. Escalate to a human maintainer before inventing a new top-level folder.

---

## Naming & Metadata

- Use `snake_case` for filenames; reserve uppercase prefixes (e.g. `PHASE_`, `ADR-####`) for formally tracked
  documents.
- Include ISO date codes only when chronology matters (`2024-05-17_audio_sync_status.md`).
- Add a short front-matter header (YAML or inline bullet list) with:
  - `author` (agent handle or human collaborator)
  - `date` (YYYY-MM-DD)
  - `status` (`draft`, `in_review`, `published`, `superseded`)
  - `intent` (one-line purpose)
- Update or create the nearest index file (`docs/README.md`, `docs/planning/README.md`, folder-specific index)
  whenever you add a new published document.

---

## Workflow Checklist

1. **Classify** the artifact using the routing table.
2. **Name** the file following the conventions above; avoid placeholders like `notes.md`.
3. **Place** the file directly in the correct folder (create subfolders only after maintainer approval).
4. **Annotate** front matter and add contextual links to related docs.
5. **Update indices** and any cross-reference lists.
6. **Run linting**: spell-check, Markdown formatting (e.g. `markdownlint`), and ensure ASCII unless explicitly
   required.
7. **Summarize** the change in the PR/commit description with folder + intent (`docs/planning: add audio sync
   migration proposal`).
8. **Request review** if the document alters policy, process, or introduces new taxonomy.

If a step cannot be completed, halt and escalate rather than leaving a partially filed artifact.

---

## Agent Playbooks

### Research Analyst

- Outputs: deep technical comparisons, forensic reports, exploratory notes.
- Default destination: `docs/analysis/`.
- Responsibilities: ensure hypotheses, methodology, and findings sections are explicit; archive superseded drafts
  under `docs/analysis/archive/` after approval.

### SUPREME Analyst (Forensic Deep-Dive Specialist)

- **Tier 1: Discovery & Analysis**
- Outputs: forensic scan results, bottleneck matrices, root cause analysis, improvement recommendations.
- Default destination: `docs/analysis/{subsystem}/` (e.g., `docs/analysis/audio_pipeline/`)
- Required files:
  - `{SUBSYSTEM}_forensic_analysis.md` — comprehensive technical findings with line numbers
  - `{SUBSYSTEM}_bottleneck_matrix.md` — prioritized issues with severity/effort scores
  - `{SUBSYSTEM}_root_causes.md` — causal chains and dependency analysis
- Responsibilities: provide exact file paths and line numbers; include code snippets; quantify impact (CPU%, latency, race conditions); flag architectural vs. tactical fixes.
- Escalation: if analysis reveals unfixable design flaw, create `docs/adr/ADR-####-{issue}.md` decision record.

### ULTRA Choreographer (Enhancement & Design Specialist)

- **Tier 2+: Pattern & Feature Design**
- Outputs: pattern designs, choreography proposals, enhancement specifications.
- Default destination: `docs/planning/` for forward-looking; `Implementation.plans/roadmaps/` for active design arcs.
- Required files:
  - `{FEATURE}_design_proposal.md` — vision, constraints, success criteria
  - `{FEATURE}_implementation_spec.md` — technical specification, pseudo-code, dependencies
  - `{FEATURE}_validation_plan.md` — test strategy, acceptance criteria
- Responsibilities: link to SUPREME discoveries; quantify performance impact; flag resource constraints; propose staged rollout.
- Escalation: if design conflicts with architectural constraints, escalate via ADR.

### Embedded Firmware Engineer

- **Tier 2: Parallel Implementation**
- Outputs: fixed code, test cases, validation reports.
- Default destination: `firmware/src/`, `firmware/test/`; document changes in `Implementation.plans/runbooks/`
- Required artifacts:
  - For each fix: before/after code comparison in a `{FIX_NAME}_implementation.md` runbook
  - Test file: `firmware/test/test_{fix_name}/*.cpp`
  - Verification: `firmware/FIXES_{phase}_VALIDATION.md` with test results and metrics
- Responsibilities: apply changes atomically; validate locally before commit; document exact line numbers; flag dependency chains.
- Escalation: if compilation fails or unexpected test failures occur, halt and report root cause to maintainer.

### Code Reviewer & Quality Validator

- **Tier 3: Quality Gates**
- Outputs: security audits, performance profiles, test coverage reports.
- Default destination: `docs/reports/` (phase summaries) + `Implementation.plans/backlog/` (lint debt)
- Required files:
  - `{PHASE}_code_review_report.md` — security/quality/performance scores with evidence
  - `{PHASE}_test_summary.md` — test counts, coverage %, failure analysis
  - `{PHASE}_profiling_report.md` — memory, CPU, timing metrics
- Responsibilities: run automated checkers (markdownlint, clang-tidy, cppcheck); cite line numbers for issues; provide remediation priority.
- Escalation: if security vulnerability found, create critical ADR and notify maintainer immediately.

### Multiplier Orchestrator (Workflow State Machine)

- **Meta-Layer: Continuous Optimization & Automation**
- Outputs: workflow state, execution logs, phase transition records.
- Default destination: `.taskmaster/workflow/` (internal state) + `docs/reports/` (public summaries)
- State files: `workflow_state.json` (current phase, subtask, attempts, timestamps)
- Required documentation:
  - `{PHASE}_execution_log.md` — what ran, timing, outputs, any errors
  - `orchestration_status.md` — live status of all phases, bottlenecks, next steps
- Responsibilities: track state transitions; validate preconditions before phase entry; escalate if preconditions fail; commit state to git.
- Escalation: if circular dependency detected, fail safely and report dependency graph to maintainer.

### Documentation Curator

- Outputs: indices, quick references, templates.
- Default destination: `docs/resources/` or `docs/templates/`.
- Responsibilities: maintain navigation consistency, prune stale links, coordinate with maintainers before
  reorganizing folders.

---

## Multiplier Workflow: Artifact Dependency Chain

The workflow multiplier system spans three tiers with strict dependency relationships. Agents MUST validate preconditions before proceeding.

### Tier 1: Discovery & Analysis (SUPREME)

**Inputs:** codebase, performance baselines, issue reports

**Outputs:** forensic reports → `docs/analysis/{subsystem}/`

**Key Artifacts:**

- `{SUBSYSTEM}_forensic_analysis.md` (25+ KB, 15 sections minimum)
- `{SUBSYSTEM}_bottleneck_matrix.md` (prioritized, severity/effort scores)
- `{SUBSYSTEM}_root_causes.md` (causal chains, line numbers)

**Exit Criteria:**

- ✓ Minimum 3 bottlenecks identified with exact file:line references
- ✓ Root cause chains documented (why each bottleneck exists)
- ✓ Severity quantified (latency ms, CPU %, race condition probability, etc.)
- ✓ All files pass markdownlint
- ✓ Cross-references to related ADRs or architecture docs

**Downstream Dependency:**

- Tier 2 agents MUST read these files before implementing fixes
- Each fix MUST reference the corresponding bottleneck (e.g., "Addresses BOTTLENECK_2_MUTEX_TIMEOUT from microphone.h:243")

### Tier 2: Parallel Fixes & Enhancement (Embedded Engineers + ULTRA Choreographer)

**Inputs:** Tier 1 bottleneck reports + ULTRA design specifications

**Outputs:**

- Fixed firmware code → `firmware/src/`
- Test suites → `firmware/test/`
- Runbooks → `Implementation.plans/runbooks/`
- Performance metrics → `docs/reports/`

**Key Artifacts (per fix):**

- `firmware/src/{modified_file}` (patched code with comments linking to analysis)
- `firmware/test/test_{fix_name}/*.cpp` (comprehensive test suite)
- `Implementation.plans/runbooks/{fix_name}_implementation.md` (before/after comparison, validation steps)
- `docs/reports/{PHASE}_fixes_validation.md` (test results, memory/performance delta)

**Exit Criteria (per fix):**

- ✓ Code compiles with 0 errors, 0 warnings
- ✓ All related tests pass
- ✓ Memory footprint validated (RAM/Flash deltas < 5% unless approved)
- ✓ Runbook documents exact line numbers changed
- ✓ Performance improvement quantified against baseline
- ✓ No new security issues introduced (static analysis pass)

**Downstream Dependency:**

- Tier 3 agents MUST verify each fix validates against original Tier 1 analysis
- Code review must cite improvements vs. baseline metrics

### Tier 3: Quality Validation (Code Reviewer + Test Automator)

**Inputs:** Tier 2 fixed code + validation reports

**Outputs:** audit reports, test summaries → `docs/reports/`

**Key Artifacts:**

- `{PHASE}_code_review_report.md` (security/quality/performance scores)
- `{PHASE}_test_summary.md` (coverage %, test counts, pass rates)
- `{PHASE}_profiling_report.md` (RAM, Flash, CPU, latency metrics)

**Exit Criteria (all must PASS):**

- ✓ Security score ≥ 90/100
- ✓ Code quality score ≥ 90/100
- ✓ Test coverage ≥ 95%
- ✓ All performance targets met (FPS, latency, memory)
- ✓ Zero new compiler warnings
- ✓ Zero high/critical lint violations

**Decision Gate:**

If all gates PASS → **READY FOR DEPLOYMENT**
If 1-2 gates CONDITIONAL → escalate to maintainer
If 3+ gates FAIL → return to Tier 2 for rework

### Artifact Link Graph

```text
Tier 1: Discovery
├── {SUBSYSTEM}_forensic_analysis.md
├── {SUBSYSTEM}_bottleneck_matrix.md (prioritized)
└── {SUBSYSTEM}_root_causes.md
    ↓ [feeds]
Tier 2: Fixes
├── firmware/src/{files} (patched with line-level traceability)
├── firmware/test/ (comprehensive test suites)
├── Implementation.plans/runbooks/{fix}_implementation.md
└── docs/reports/{PHASE}_fixes_validation.md
    ↓ [feeds]
Tier 3: Quality
├── {PHASE}_code_review_report.md (cites improvements vs. Tier 1)
├── {PHASE}_test_summary.md (references Tier 2 test counts)
└── {PHASE}_profiling_report.md (compares metrics)
    ↓ [produces]
Deployment Decision
├── docs/reports/{PHASE}_deployment_decision.md
└── firmware.bin (ready for hardware validation)
```

**Traceability Rules:**

1. Every fix MUST reference its source bottleneck from Tier 1
2. Every test MUST verify a specific fix or requirement
3. Every quality report MUST cite before/after metrics from docs/reports/
4. Every ADR MUST link to the analysis and decision that triggered it

---

## Failure Escalation Paths

### Compilation Failure

1. **Halt immediately** — do not attempt workarounds
2. **Document** error, file paths, and context in `Implementation.plans/backlog/{issue}_blocker.md`
3. **Escalate** to maintainer with exact compiler output
4. **Do not revert** without explicit approval

### Test Failure (Unexpected)

1. **Verify test isolation** — ensure test doesn't depend on external state
2. **Isolate failure** to specific code change(s)
3. **Document root cause** in runbook or backlog item
4. **Propose fix** or mark as known issue with mitigation plan
5. **Escalate** if fix blocks critical path

### Performance Regression

1. **Quantify impact** — measure CPU%, latency, memory delta vs. baseline
2. **Identify source** — which change caused regression?
3. **Document trade-off** — is regression acceptable for feature gain?
4. **Escalate** if regression exceeds budget or acceptance criteria

### Architecture Conflict

1. **Document conflict** in ADR draft (Decision, Alternatives, Consequences)
2. **Flag for design review** — halt implementation pending decision
3. **Escalate** to maintainer with supporting analysis

---

## Agent Resources & Quick References

**All agents must consult the appropriate quick reference before starting work.**

Located in: `docs/resources/agent_quick_refs/`

| Agent Type | Reference | When to Use |
|-----------|-----------|------------|
| SUPREME Analyst | [SUPREME_analyst_cheatsheet.md](docs/resources/agent_quick_refs/SUPREME_analyst_cheatsheet.md) | Before starting forensic analysis (Tier 1) |
| ULTRA Choreographer | [ULTRA_choreographer_cheatsheet.md](docs/resources/agent_quick_refs/ULTRA_choreographer_cheatsheet.md) | Before designing features/patterns (Tier 2+) |
| Embedded Engineer | [embedded_firmware_engineer_cheatsheet.md](docs/resources/agent_quick_refs/embedded_firmware_engineer_cheatsheet.md) | Before writing code (Tier 2) |
| Code Reviewer | [code_reviewer_quality_validator_cheatsheet.md](docs/resources/agent_quick_refs/code_reviewer_quality_validator_cheatsheet.md) | Before running quality audits (Tier 3) |
| Orchestrator | [multiplier_orchestrator_cheatsheet.md](docs/resources/agent_quick_refs/multiplier_orchestrator_cheatsheet.md) | Before phase transitions (meta-layer) |

**Quick start:** See [docs/resources/README.md](docs/resources/README.md) for navigation.

---

## Standards & Methodologies

Located in: `docs/resources/`

| Standard | Purpose | Use When |
|----------|---------|----------|
| [performance_baseline_schema.md](docs/resources/performance_baseline_schema.md) | Standardized metrics (FPS, latency, CPU, memory) | Measuring before/after performance |
| [testing_standards.md](docs/resources/testing_standards.md) | What constitutes proof a fix works | Writing tests for fixes |

**Both documents include:** JSON schemas, templates, tools, Python scripts, integration points.

---

## Architecture Decision Records (ADRs)

Located in: `docs/adr/`

**When to create:** If you discover an architectural conflict, unfixable design flaw, or significant trade-off.

**Template:** [ADR-template.md](docs/adr/ADR-template.md)
**Index & rules:** [docs/adr/README.md](docs/adr/README.md)

**Escalation path:** If found during analysis or implementation, create ADR draft immediately and escalate to @spectrasynq.

---

## Quality Gates

- **Clarity**: Avoid ambiguous titles; every document should explain its scope in the opening paragraph.
- **Completeness**: Don’t ship half-filled sections or TODO placeholders without an explicit follow-up owner.
- **Traceability**: Reference related ADRs, Jira tickets, or implementation plans so readers can trace decisions.
- **Versioning**: Use status front matter; archive superseded docs into `/archive` subfolders instead of deleting.
- **Formatting**: Keep Markdown heading levels consistent; use fenced code blocks with language tags.

---

## Governance & Maintenance

- Maintainer: `@spectrasynq` (default escalation) or the currently assigned documentation steward listed in
  `docs/README.md`.
- Taxonomy changes: propose via PR updating this file and relevant folder README. Provide migration notes before
  moving large sets.
- Review cadence: weekly doc triage ensures new files sit in approved folders and indices remain accurate.
- Changelog: append notable updates to the `### Changelog` section below.

### Changelog

- `2025-10-26` — **Major enhancement**: Added Multiplier Workflow section with Tier 1/2/3 artifact dependencies, agent playbooks for SUPREME/ULTRA/Engineers, failure escalation paths, and traceability requirements. Agents now have explicit guidance for forensic analysis, parallel fixes, and quality validation coordination. Updated Agent Playbooks to include SUPREME Analyst, ULTRA Choreographer, Embedded Firmware Engineer, Code Reviewer, and Multiplier Orchestrator personas.
- `2024-05-18` — Initial guardrail authored for Claude agents (Codex).

<!-- markdownlint-disable-next-line MD022 -->
## Questions?
When uncertain, stop generating and request guidance from the maintainer rather than guessing. Compliance with this manual is mandatory for all Claude-driven changes.

<!-- markdownlint-enable MD013 -->
