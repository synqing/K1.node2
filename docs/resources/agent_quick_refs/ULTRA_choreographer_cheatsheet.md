---
title: ULTRA Choreographer Quick Reference
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
<!-- markdownlint-disable MD013 -->

# ULTRA Choreographer Quick Reference

**Agent Persona:** Enhancement & Design Specialist
**Tier:** 2+ — Pattern & Feature Design
**Responsibility:** Design patterns/features with clear specs, validation plans, and constraints analysis

---

## Filing Locations

**Forward-looking proposals:** `docs/planning/`
**Active design work:** `Implementation.plans/roadmaps/`
**Example:** `docs/planning/emotiscope_fft_enhancement.md`

---

## Required Artifacts

Create these three files per feature/pattern:

### 1. `{FEATURE}_design_proposal.md`

**Purpose:** Vision, constraints, success criteria
**Audience:** Embedded engineers (Tier 2) need to understand scope before starting code

**Structure:**
- Feature name & vision (1 paragraph)
- Motivation (why is this needed? what problem does it solve?)
- Proposed solution (high-level description)
- Technical constraints:
  - Memory budget (RAM/Flash available)
  - CPU budget (FPS target, latency target)
  - Timing constraints (real-time? 100 Hz? <20ms?)
- Success criteria (measurable, testable)
- Dependencies (other fixes/features must complete first?)
- Risks & trade-offs
- Reference to SUPREME analysis (which bottleneck does this improve?)

### 2. `{FEATURE}_implementation_spec.md`

**Purpose:** Technical specification for implementers
**Deliverable to:** Embedded Firmware Engineers (Tier 2)

**Structure:**
- Architecture overview (diagram or text description)
- Data structures (C++ structs, memory layout)
- Function signatures (pseudo-code or actual declarations)
- Algorithm description (pseudocode, not full code)
- State machine (if applicable)
- Resource requirements (exact RAM bytes, CPU %, Flash bytes)
- Test points (what must tests verify?)
- Integration points (how does it connect to existing code?)
- Performance targets (FPS/latency/memory/CPU specifics)

### 3. `{FEATURE}_validation_plan.md`

**Purpose:** Test strategy, acceptance criteria
**Audience:** Code reviewers, test automators (Tier 3)

**Structure:**
- Feature requirements checklist (must have, should have, nice to have)
- Test categories:
  - Unit tests (individual functions)
  - Integration tests (component interaction)
  - Performance tests (meets timing/memory targets?)
  - Stress tests (30+ minutes? edge cases?)
- Acceptance criteria (quantified, testable)
- Known issues & limitations (be honest)
- Performance baseline (expected metrics vs. current state)
- Rollback plan (if deployed and broken, how do we revert?)

---

## Exit Criteria Checklist

✓ **Design Clarity**
- [ ] Proposal explains "why" this feature/pattern exists
- [ ] Technical specifications are detailed enough for engineers to code from
- [ ] All constraints (memory, CPU, timing) are quantified
- [ ] Dependencies are explicit (what must complete first?)

✓ **Constraint Analysis**
- [ ] Memory footprint estimated (RAM + Flash in bytes)
- [ ] CPU impact estimated (% of available budget)
- [ ] Timing impact estimated (FPS, latency deltas)
- [ ] Trade-offs documented (what are we sacrificing?)

✓ **Traceability**
- [ ] Links to SUPREME analysis files (which bottleneck does this address?)
- [ ] Links to existing architecture docs
- [ ] References to related ADRs (if design conflicts or decisions made)
- [ ] Changelog entry in docs/planning/README.md

✓ **Validation Rigor**
- [ ] Test plan is testable (not vague)
- [ ] Acceptance criteria are quantified (not "works well")
- [ ] Performance targets are measurable (not "should be fast")
- [ ] All files pass markdownlint

---

## Downstream Expectations

**Tier 2 (Embedded Engineers) will:**
- Read proposal → understand scope
- Read spec → write code
- Read validation plan → write tests
- Reference design doc in commits ("Implements feature from docs/planning/emotiscope_fft_enhancement.md")

**Tier 3 (Code Reviewers) will:**
- Verify implementation matches spec
- Verify tests match validation plan
- Measure performance against targets in design doc
- Reference design doc in quality report

---

## Escalation

**If you discover...**

| Situation | Action |
|-----------|--------|
| Design conflicts with architecture | Create `docs/adr/ADR-####-{issue}.md` |
| Resource constraints impossible to meet | Escalate to @spectrasynq with trade-off analysis |
| Test plan too expensive (time/complexity) | Propose simplified acceptance criteria |
| Performance targets unachievable | Document in design & escalate |

---

## Tools & Commands

```bash
# Check markdown formatting
npx markdownlint-cli docs/planning/emotiscope_fft_enhancement.md

# Verify cross-references
grep -r "emotiscope_fft_enhancement" docs/

# Calculate memory estimate
# (pseudocode: arrays size = num_elements * bytes_per_element)
python3 -c "print(64 * 4 + 256 * 4)"  # 64 samples + 256 FFT bins, 4 bytes each

# Check for dangling references
npx markdown-link-check docs/planning/emotiscope_fft_enhancement.md
```

---

## Template: Quick Copy-Paste Start

```markdown
---
author: "light-show-choreography-specialist-ultra"
date: "2025-10-26"
status: "draft"
intent: "Design for [FEATURE]"
---

# [FEATURE] Design Proposal

## Vision

[1-2 sentence explanation of what this feature does]

## Motivation

[Why do we need this? What problem does it solve?]
[Link to SUPREME analysis: docs/analysis/.../bottleneck_matrix.md]

## Proposed Solution

[High-level description]

## Constraints

| Type | Budget | Impact |
|------|--------|--------|
| RAM | 50 KB | Must fit in audio buffer space |
| Flash | 100 KB | Need to leave 30% free |
| CPU | 10% | Cannot exceed audio task overhead |
| Latency | <5ms | Real-time requirement |

## Success Criteria

- [ ] Passes unit tests (100% code coverage)
- [ ] Achieves [X] FPS minimum
- [ ] Uses <[Y]> KB RAM
- [ ] No race conditions or deadlocks
- [ ] Audio reactivity latency <[Z]>ms

---
```

---

## Reference

- Full details: **CLAUDE.md § Agent Playbooks → ULTRA Choreographer**
- Dependency management: **CLAUDE.md § Multiplier Workflow**
- Escalation paths: **CLAUDE.md § Failure Escalation Paths**

<!-- markdownlint-enable MD013 -->
