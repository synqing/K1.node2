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

**Prerequisites - Query Institutional Memory:**
Before starting research, query Mem0 for existing context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for related research and decisions
results = memory.search(
    query=f"What research exists on {topic}? What decisions were made?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results (80-90/100 scores) to understand existing work, decisions, and constraints.

**Workflow:**
- Outputs: deep technical comparisons, forensic reports, exploratory notes.
- Default destination: `docs/analysis/`.
- Responsibilities: ensure hypotheses, methodology, and findings sections are explicit; archive superseded drafts
  under `docs/analysis/archive/` after approval.

### SUPREME Analyst (Forensic Deep-Dive Specialist)

**Prerequisites - Query Institutional Memory:**
Before starting forensic analysis, query Mem0 for subsystem context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for subsystem architectural constraints and known issues
results = memory.search(
    query=f"What are the architectural constraints and known bottlenecks for {subsystem}?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Existing architectural decisions (avoid re-analysis)
- Known constraints and trade-offs
- Previous bottlenecks or performance issues
- Related ADRs or design documents

**Workflow:**
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

**Prerequisites - Query Institutional Memory:**
Before starting feature design, query Mem0 for design context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for feature design patterns and constraints
results = memory.search(
    query=f"What design patterns and constraints apply to {feature}?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Existing design patterns and conventions
- Performance budgets and resource constraints
- Related features and integration points
- SUPREME Analyst discoveries (build on existing bottleneck analysis)

**Workflow:**
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

**Prerequisites - Query Institutional Memory:**
Before implementing fixes, query Mem0 for code context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for implementation patterns and constraints
results = memory.search(
    query=f"What are the implementation patterns and constraints for {component}?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Coding patterns and conventions
- Performance constraints (FPS budget, memory limits)
- Known pitfalls and anti-patterns
- Related bottlenecks from SUPREME analysis

**Workflow:**
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

**Prerequisites - Query Institutional Memory:**
Before starting code review, query Mem0 for quality context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for quality standards and known issues
results = memory.search(
    query=f"What are the quality standards and common issues for {phase}?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Coding standards and quality thresholds
- Known security vulnerabilities or patterns to watch for
- Performance baselines and regression criteria
- Historical test failures and their root causes

**Workflow:**
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

**Prerequisites - Query Institutional Memory:**
Before orchestrating workflows, query Mem0 for execution context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for workflow patterns and historical execution
results = memory.search(
    query=f"What workflow patterns and execution history exist for {phase}?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Successful workflow patterns and anti-patterns
- Known dependency chains and potential circular references
- Historical bottlenecks and their resolutions
- Phase transition preconditions and validation criteria

**Workflow:**
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

**Prerequisites - Query Institutional Memory:**
Before curating documentation, query Mem0 for documentation context:

```python
from scripts.mem0_agent_search import K1MemorySearch
memory = K1MemorySearch(
    api_key=os.environ["MEM0_API_KEY"],
    reranker_model="llama3.2:latest",
    use_ollama=True
)

# Query for documentation organization and standards
results = memory.search(
    query="What are the documentation organization standards and key reference materials?",
    filters={"user_id": "spectrasynq"},
    limit=5
)
```

Review top 3-5 K1-reranked results to understand:
- Documentation taxonomy and folder structure
- Existing indices and navigation patterns
- Key reference materials and their locations
- Recent documentation reorganization decisions

**Workflow:**
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

## Workflow Multiplier Patterns

**The magic is not in individual tools. It's in strategic combinations of tools orchestrated together.**

When you have a task, **don't just run one agent**. Use a multiplier pattern that combines 3-7 tools in parallel + quality gates.

Available patterns unlock 5-10x productivity:

| Task Type | Pattern | Tools Used | Gain |
|-----------|---------|-----------|------|
| Ship a feature | Design-to-Deployed | Brainstorm → Pattern-Design → Code → Tests → Review → Deploy | 5x |
| Fix production bug | Bug Detection & Fix | Error-Detective + Debugger → Code → Tests → Review → Deploy | 8x |
| Major redesign | Architecture Evolution | SUPREME + Architect → Plan → Parallel implementation → Quality gates | 10x |
| Large new feature | Feature Pipeline | Designer → Brainstorm → Plan → Parallel devs → Tests → Docs → Deploy | 7x |
| System slow | Performance Loop | DevOps + SUPREME → Fix → Tests → Verify → ROI → Deploy | 6x |
| Security issue | Security Hardening | Review + Detective → Debugger → Fix → Tests → Architect → Docs | 8x |
| No documentation | Documentation Gen | SUPREME + DocArch → Reference-Builder → Write-Plans → Cross-link | 5x |
| New skill | Skill Development | Brainstorm → Write-Skill → Test → Validate → Publish | 6x |
| Low test coverage | Rapid Testing | TDD + Test-Auto + Condition-Based-Wait + Defense-in-Depth | 7x |
| ML model tuning | ML Optimization | Business-Analyst + MLOps + Python-Pro → Tests → Profiling → Deploy | 9x |

**How to use:**
1. Identify your task type (what are you trying to accomplish?)
2. Select the corresponding multiplier pattern from the table above
3. Read detailed guide: `docs/resources/workflow_multiplier_patterns.md`
4. Get tool recipes: `docs/resources/multiplier_pattern_reference.md`
5. Execute following the pattern's implementation checklist

**Key principles:**
- Use parallelization where pattern shows (don't serialize parallel stages)
- Converge at quality gates (don't accumulate issues)
- Measure before/after (prove the multiplier worked)
- Document decisions (create ADRs if architectural)

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

## Frontend Testing Playbook

Standardizes how agents run and report frontend tests for the control app.

- Tools: `vitest` (unit/component), `@testing-library/react`, `msw` (integration), `@playwright/test` (e2e), `storybook` (visual).
- Scripts (run from `k1-control-app/`):
  - `npm run test:component` → headless component/unit tests.
  - `npm run test:ui` → interactive Vitest UI.
  - `npm run test:e2e` → Playwright E2E.
  - `npm run test:e2e:headed` → Playwright E2E (headed).
  - `npm run storybook` → Storybook dev server at `http://localhost:6006/`.
  - `npm run storybook:build` → Build static Storybook.
- Structured outputs:
  - Playwright writes JSON to `tools/artifacts/playwright-report.json`.
  - Vitest includes a JSON reporter; agents can parse CLI JSON blocks when present.
  - Dev server serves `/artifacts/*` to inspect JSON while app runs.
- Agent reporting checklist:
  - Include counts: total, passed, failed, skipped.
  - For failures: file path, test name, assertion error, stack.
  - Attach links to artifacts: `/artifacts/playwright-report.json` when dev server is running.
  - Recommend next action (fix, quarantine, re-run with `--update` for snapshots if applicable).

Examples in repo:
- RTL component: `src/test/DeviceList.rtl.test.tsx`.
- MSW integration: `src/test/DevicesIntegration.msw.test.tsx`.
- E2E config: `k1-control-app/playwright.config.ts`.

Guardrails:
- Avoid changing production components in tests unless fixing a specific bug.
- Prefer test-local components for API demos; wire into app only after maintainer approval.
- Use `baseURL` in Playwright config; don’t hardcode full URLs in tests.
- Keep test names action-oriented and succinct; avoid flaky timing — use `await`/`waitFor`.

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
