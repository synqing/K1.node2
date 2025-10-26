<!-- markdownlint-disable MD013 -->

# Multiplier Pattern Implementation Reference

**Quick-lookup matrix for choosing and executing workflow multiplier patterns.**

**For quick access:** Use this file. For detailed explanation: See workflow_multiplier_patterns.md.

---

## Pattern Selection Matrix

**What's your task?** → **Find multiplier pattern** → **Check required tools** → **Execute**

| Task | Pattern | Time Before | Time After | Tools Required | Multiplier |
|------|---------|-------------|-----------|-----------------|-----------|
| Ship feature (req → production) | Design-to-Deployed | 8 weeks | 2 weeks | Brainstorm, Pattern-Design, Embedded-Coder, Test-Automator, Code-Reviewer, Deploy-Engineer | 5x |
| Fix production bug | Bug Detection & Fix | 3-5 days | 4-8 hours | Error-Detective, Systematic-Debugger, Pragmatic-Coder, Test-Automator, Code-Reviewer, Verification | 8x |
| Redesign architecture | Architecture Evolution | 8-12 weeks | 2-3 weeks | Deep-Analyst, Architect-Review, Planner, Subagent-Dev, Code-Reviewer, Docs-Architect | 10x |
| Add major feature | Feature Pipeline | 6-8 weeks | 1-2 weeks | UI-Designer, Brainstorm, Planner, Subagent-Dev, Test-Automator, Verification, API-Docs, Code-Reviewer | 7x |
| System running slow | Performance Loop | 2-3 weeks | 3-4 days | DevOps-Troubleshooter, Deep-Analyst, Embedded-Coder, Test-Automator, Verification, Business-Analyst | 6x |
| Security vulnerability | Security Hardening | 5-7 days | 12-24 hours | Code-Reviewer, Error-Detective, Systematic-Debugger, Pragmatic-Coder, Test-Automator, Architect-Review, Ref-Builder | 8x |
| No documentation exists | Documentation Gen | 8-12 weeks | 1-2 weeks | Deep-Analyst, Docs-Architect, Ref-Builder, Writing-Plans, Writing-Clear, Cross-Architect | 5x |
| New skill to build | Skill Development | 3-4 weeks | 3-5 days | Brainstorm, Writing-Skills, Test-Automator, Code-Reviewer, Plugin-Validator, Marketplace-Manager | 6x |
| Test coverage < 50% | Rapid Testing | 3-4 weeks | 1 week | TDD, Test-Automator, Condition-Based-Waiting, Defense-in-Depth, Verification | 7x |
| ML model tuning | ML Optimization | 8-12 weeks | 2-3 weeks | Business-Analyst, MLOps-Engineer, Python-Pro, Test-Automator, DevOps-Troubleshooter, Verification | 9x |

---

## Tool Combination Recipes

Each multiplier uses a specific combination of tools. Here are the exact mixes:

### Recipe 1: Design-to-Deployed (Feature Shipping)

```yaml
Prerequisites:
  - Feature requirements are clear
  - No blocking architecture issues

Sequence:
  Stage 1 (Parallel):
    - Brainstorming skill: Refine feature concept (30 min)
    - Current codebase analysis: Understand constraints (30 min)

  Stage 2:
    - Pattern Design skill: Create specs + performance targets (1 hour)
    - Planner agent: Break into implementation tasks (30 min)

  Stage 3 (Parallel):
    - Embedded Firmware Coder: Implement code (2-4 hours)
    - Test Automator: Write comprehensive tests (1-2 hours)

  Stage 4:
    - Code Reviewer agent: Security/quality audit (30 min)
    - TDD superpowers: Verify test quality (15 min)

  Stage 5:
    - Deployment Engineer: Ship to production (15 min)
    - API Documenter: Generate docs from code (15 min)

Success Criteria:
  ✓ Code reviewer score >= 90/100
  ✓ Test coverage >= 95%
  ✓ Feature works as spec'd
  ✓ Deployed and docs published
```

### Recipe 2: Bug Detection & Fix

```yaml
Prerequisites:
  - Bug has been reported with symptoms
  - Access to logs and codebase

Sequence:
  Stage 1 (Parallel):
    - Error Detective agent: Search logs for pattern (30 min)
    - Systematic Debugger skill: 4-phase investigation (1 hour)

  Stage 2:
    - Analyze findings → Root cause hypothesis (15 min)

  Stage 3:
    - Pragmatic Coder agent: Implement minimal fix (30 min - 1 hour)
    - Test Automator: Write proof test (30 min)

  Stage 4:
    - Code Reviewer: Verify no regression (20 min)
    - Verification Before Completion: Metrics proof (10 min)

  Stage 5:
    - Deploy Engineer: Push fix (5 min)

Success Criteria:
  ✓ Root cause documented
  ✓ Fix is minimal (< 50 lines)
  ✓ Test proves bug is fixed
  ✓ No performance regression
  ✓ Deployed
```

### Recipe 3: Architecture Evolution (Major Redesign)

```yaml
Prerequisites:
  - Current state is well-understood
  - New design direction is clear
  - Dependencies can be identified

Sequence:
  Stage 1 (Parallel):
    - Deep Technical Analyst: Identify current bottlenecks (2 hours)
    - Architect Review agent: Design new state (2 hours)

  Stage 2:
    - Document ADR: Architectural Decision Record (30 min)

  Stage 3:
    - Planner agent: Create implementation plan with dependencies (1 hour)

  Stage 4 (Batched, with gates):
    Batch 1:
      - Task 1-2 (parallel) → Code Reviewer → Tests
    Batch 2:
      - Task 3-4 (parallel) → Code Reviewer → Tests
    Batch 3:
      - Task 5+ (final integration) → Full system test

  Stage 5:
    - Docs Architect: Extract documentation from implementation (1 hour)

Success Criteria:
  ✓ Before/after metrics documented
  ✓ All tests pass
  ✓ No regressions
  ✓ Architecture documented
  ✓ Deployment successful
```

### Recipe 4: Feature Pipeline (Major Feature)

```yaml
Prerequisites:
  - User requirements documented
  - Success metrics defined

Sequence:
  Stage 1 (Parallel):
    - UI/UX Designer: Create wireframes (1-2 hours)
    - Brainstorming: Refine interaction (30 min)

  Stage 2:
    - Planner: Break into dev tasks (30 min)

  Stage 3 (Parallel, multiple streams):
    Stream A - Frontend:
      - Embedded/Web Coder: UI implementation (2-3 hours)
    Stream B - Backend:
      - Embedded/Web Coder: API implementation (2-3 hours)
    Stream C - Testing:
      - Test Automator: Test strategy + base suite (1 hour)

  Stage 4 (Convergence):
    - Integration testing (30 min)
    - Test execution - full suite (30 min)
    - Verification Before Completion (15 min)

  Stage 5:
    - API Documenter: Auto-generate docs (30 min)
    - Code Reviewer: Final quality gate (30 min)

  Stage 6:
    - Deployment Engineer: Release (15 min)

Success Criteria:
  ✓ All user stories completed
  ✓ Test coverage >= 95%
  ✓ API docs complete
  ✓ No regressions
  ✓ Deployed
```

### Recipe 5: Performance Optimization Loop

```yaml
Prerequisites:
  - Performance issue is reproducible
  - Baseline metrics available

Sequence:
  Stage 1 (Parallel):
    - DevOps Troubleshooter: Identify bottleneck (1 hour)
    - Deep Technical Analyst: Forensic analysis (1 hour)

  Stage 2:
    - Synthesize root cause (15 min)

  Stage 3:
    - Embedded Coder: Optimization fix (1-2 hours)
    - Test Automator: Performance test (30 min)

  Stage 4:
    - Verification Before Completion: Metrics proof (15 min)
    - Business Analyst: ROI calculation (15 min)

  Stage 5:
    - Deployment Engineer: Release (5 min)

Success Criteria:
  ✓ Performance target achieved (FPS, latency, memory)
  ✓ No regression in other metrics
  ✓ ROI documented
  ✓ Deployed
```

### Recipe 6: Security Hardening

```yaml
Prerequisites:
  - Vulnerability described
  - Attack vector understood

Sequence:
  Stage 1 (Parallel):
    - Code Reviewer: Security audit (1 hour)
    - Error Detective: Find similar vulnerabilities (1 hour)

  Stage 2:
    - Systematic Debugger: Understand attack chain (30 min)

  Stage 3:
    - Pragmatic Coder: Implement minimal fix (30 min - 1 hour)
    - Test Automator: Proof exploit is blocked (30 min)

  Stage 4:
    - Architect Review: Prevent architectural recurrence (30 min)

  Stage 5:
    - Reference Builder: Document security standards (30 min)

  Stage 6:
    - Deploy Engineer: Emergency release (5 min)

Success Criteria:
  ✓ Vulnerability is fixed
  ✓ Similar vulnerabilities found and fixed
  ✓ Attack blocked by test
  ✓ Architectural prevention documented
  ✓ Team educated (docs created)
  ✓ Deployed
```

### Recipe 7: Documentation Generation

```yaml
Prerequisites:
  - Codebase is complete
  - Architecture is stable

Sequence:
  Stage 1 (Parallel):
    - Deep Analyst: Identify patterns in codebase (2 hours)
    - Docs Architect: Extract architecture (2 hours)

  Stage 2 (Parallel):
    - Reference Builder: Generate API reference (1 hour)
    - Writing Plans: Create user guides (1 hour)

  Stage 3:
    - Writing Clearly (Superpowers): Polish prose (30 min)

  Stage 4:
    - Cross-Project Architect: Link across projects (30 min)

Success Criteria:
  ✓ Architecture documented
  ✓ API reference complete
  ✓ User guides available
  ✓ Cross-references working
  ✓ All prose is clear and professional
```

### Recipe 8: Skill Development Pipeline

```yaml
Prerequisites:
  - Skill concept is solid
  - Use cases identified

Sequence:
  Stage 1:
    - Brainstorming: Refine skill concept (30 min)

  Stage 2:
    - Writing Skills superpowers: Document skill (2-3 hours)

  Stage 3:
    - Test Automator: TDD with subagents (1-2 hours)

  Stage 4:
    - Code Reviewer: Quality gate (30 min)

  Stage 5:
    - Plugin Validator: Compliance check (15 min)

  Stage 6:
    - Marketplace Manager: Publish (5 min)

Success Criteria:
  ✓ Skill documented clearly
  ✓ Tests pass with subagents
  ✓ Code review passed
  ✓ Validation passed
  ✓ In marketplace
```

### Recipe 9: Rapid Test Coverage

```yaml
Prerequisites:
  - Code exists but coverage < 50%
  - Code structure allows testing

Sequence:
  Stage 1-N (Iterative):
    For each test:
      1. TDD superpowers: Write failing test (RED)
      2. Pragmatic Coder: Write minimal code (GREEN)
      3. Code Reviewer: Refactor if needed (REFACTOR)
      4. Test Automator: Run full suite (continuous)

  Throughout:
    - Condition-Based-Waiting: Fix any flaky tests immediately
    - Defense-in-Depth: Add validation layers

  Final:
    - Verification: Coverage >= 95% proof

Success Criteria:
  ✓ Coverage >= 95%
  ✓ All tests pass consistently (no flakes)
  ✓ Edge cases covered
  ✓ Edge cases validated at multiple layers
```

### Recipe 10: ML Model Optimization

```yaml
Prerequisites:
  - Baseline metrics documented
  - Optimization goals defined

Sequence:
  Stage 1 (Parallel):
    - Business Analyst: ROI baseline (30 min)
    - MLOps Engineer: Build training pipeline (1-2 hours)
    - Python Pro: Model refinement strategy (30 min)

  Stage 2 (Iterative):
    For each optimization:
      1. Change hyperparams or architecture
      2. Train (via MLOps pipeline)
      3. Test (validate accuracy, latency)
      4. Measure (profiling)
      5. Decide (proceed or revert)

  Stage 3:
    - Verification: Metrics proof of improvement (15 min)

  Stage 4:
    - Deployment Engineer: Release new model (10 min)

Success Criteria:
  ✓ Accuracy improved (or latency reduced)
  ✓ ROI justified
  ✓ No regression in other metrics
  ✓ Deployed
```

---

## Implementation Checklist

**Before starting any multiplier pattern:**

- [ ] **Prerequisites met?** (Check pattern's prerequisites section)
- [ ] **Tools available?** (All required agents/skills accessible)
- [ ] **Baseline metrics captured?** (Before state documented)
- [ ] **Success criteria defined?** (Clear exit criteria identified)
- [ ] **Dependencies identified?** (Parallel work doesn't conflict)
- [ ] **Time estimates realistic?** (Team capacity allocated)
- [ ] **ADR escalation path ready?** (If architectural decision needed)

**During execution:**

- [ ] **Track tool handoffs** (Ensure output from one tool feeds next)
- [ ] **Parallelize where matrix shows** (Don't serialize parallel stages)
- [ ] **Run quality gates between stages** (Don't accumulate issues)
- [ ] **Log metrics continuously** (For before/after comparison)
- [ ] **Escalate blockers immediately** (Don't wait for stage end)

**After completion:**

- [ ] **Verify all success criteria met** (Checklist pass)
- [ ] **Document results** (Before/after metrics, lessons learned)
- [ ] **Capture ADRs if decisions made** (Link from docs)
- [ ] **Update team documentation** (Patterns used, tools learned)

---

## Integration with CLAUDE.md

Each pattern is referenced in CLAUDE.md § Agent Resources & Quick References:

```
Need to ship a feature? → Use Recipe 1: Design-to-Deployed
Bug in production? → Use Recipe 2: Bug Detection & Fix
Redesigning core system? → Use Recipe 3: Architecture Evolution
[etc.]
```

---

## Performance Benchmarks

**Actual multiplier gains from K1.reinvented Phase 4 (Dual-core Architecture):**

| Phase | Duration | Multiplier |
|-------|----------|-----------|
| Analysis (SUPREME) | 18 min | — |
| Implementation (Parallel fixes) | 40 min | 5x (5 fixes in 40 min vs 4 hours sequential) |
| Quality validation | 20 min | — |
| **Total elapsed** | **2.5 hours** | **10x vs 25 hours sequential** |

**Why 10x?**
- Analysis (18 min) identified exact bottlenecks → implementation (40 min) knew exactly what to fix
- Parallel implementation: 5 fixes running concurrently, converging at quality gates
- Quality gates validated as we went (no rework loops)
- vs. sequential: each fix would take 4-5 hours (guessing, wrong direction, rework)

---

## Reference

- **Full patterns:** docs/resources/workflow_multiplier_patterns.md
- **Multiplier workflow system:** CLAUDE.md § Multiplier Workflow
- **K1 case study:** WORKFLOW_ORCHESTRATOR_IMPLEMENTATION.yaml

<!-- markdownlint-enable MD013 -->
