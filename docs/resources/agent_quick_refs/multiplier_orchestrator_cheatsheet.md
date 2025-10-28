---
title: Multiplier Orchestrator Quick Reference
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

# Multiplier Orchestrator Quick Reference

**Agent Persona:** Workflow State Machine & Continuous Optimization
**Layer:** Meta-Layer — Orchestration & Automation
**Responsibility:** Track phase transitions, manage state, validate preconditions, escalate failures

---

## Filing Locations

| Artifact | Location |
|----------|----------|
| Workflow state (internal) | `.taskmaster/workflow/` |
| Execution logs (internal) | `.taskmaster/workflow/execution_log.json` |
| Public summaries | `docs/reports/` |
| Orchestration status | `docs/reports/orchestration_status.md` (updated live) |

---

## Workflow State Machine

```
┌─────────────────────────────────────────────────────────┐
│                  MULTIPLIER WORKFLOW                    │
└─────────────────────────────────────────────────────────┘

Phase 1: DISCOVERY (SUPREME)
  ├─ Precondition: Codebase exists, baseline metrics available
  ├─ Action: Run forensic analysis
  ├─ Output: docs/analysis/{subsystem}/
  └─ Exit criteria: 3+ bottlenecks identified with line numbers
     │
     ├─ PASS → Phase 2
     └─ FAIL → Escalate + HALT

Phase 2: IMPLEMENTATION (Parallel: Embedded + ULTRA)
  ├─ Precondition: Phase 1 PASS
  ├─ Action 2a: Embedded engineers apply fixes in parallel
  ├─ Action 2b: ULTRA designs new features/patterns
  ├─ Output: firmware/src/, firmware/test/, Implementation.plans/runbooks/
  └─ Exit criteria: All fixes compile, all tests pass
     │
     ├─ PASS → Phase 3
     └─ FAIL → Retry up to 2x, then escalate + HALT

Phase 3: QUALITY VALIDATION (Code Reviewer + Tests)
  ├─ Precondition: Phase 2 PASS
  ├─ Action: Run security, quality, performance audits
  ├─ Output: docs/reports/{PHASE}_*.md
  └─ Exit criteria: All gates PASS or CONDITIONAL
     │
     ├─ ALL PASS → Phase 4 (READY FOR DEPLOYMENT)
     ├─ 1-2 CONDITIONAL → Escalate to maintainer
     └─ 3+ FAIL → Return to Phase 2

Phase 4: DEPLOYMENT DECISION
  ├─ Precondition: Phase 3 all PASS
  ├─ Action: Generate firmware.bin, create deployment package
  ├─ Output: docs/reports/{PHASE}_deployment_decision.md
  └─ Decision: READY / CONDITIONAL / HOLD
     │
     └─ → Hardware validation or closed-loop monitoring

---
```

---

## State Management

### Workflow State File: `.taskmaster/workflow/state.json`

**Purpose:** Persist workflow progress across sessions

**Schema:**
```json
{
  "workflow_id": "K1_PHASE_4_2025-10-26_14-32",
  "created_at": "2025-10-26T14:32:00Z",
  "status": "in_progress",
  "current_phase": 2,
  "phase_start_time": "2025-10-26T14:35:00Z",

  "tier_states": {
    "tier_1_discovery": {
      "status": "completed",
      "start_time": "2025-10-26T14:32:00Z",
      "end_time": "2025-10-26T14:50:00Z",
      "duration_minutes": 18,
      "output_files": [
        "docs/analysis/audio_pipeline/audio_forensic_analysis.md",
        "docs/analysis/audio_pipeline/bottleneck_matrix.md",
        "docs/analysis/audio_pipeline/root_causes.md"
      ],
      "exit_criteria_pass": true
    },
    "tier_2_implementation": {
      "status": "in_progress",
      "start_time": "2025-10-26T14:50:00Z",
      "parallel_tasks": [
        {
          "task_id": "fix_1_pattern_snapshots",
          "status": "completed",
          "attempts": 1,
          "output_files": [
            "firmware/src/generated_patterns.h",
            "firmware/test/test_fix1_pattern_snapshots/test_pattern_snapshots.cpp",
            "Implementation.plans/runbooks/fix1_pattern_snapshots_implementation.md"
          ]
        },
        {
          "task_id": "fix_2_i2s_timeout",
          "status": "completed",
          "attempts": 2,  // Had to retry after I2S config fix
          "output_files": [
            "firmware/src/audio/microphone.h",
            "firmware/test/test_fix2_i2s_timeout/test_i2s_timeout.cpp",
            "Implementation.plans/runbooks/fix2_i2s_timeout_implementation.md"
          ]
        },
        {
          "task_id": "fix_3_mutex_timeout",
          "status": "in_progress",
          "attempts": 1
        }
      ],
      "exit_criteria_pass": null  // Not yet complete
    },
    "tier_3_quality": {
      "status": "pending",
      "precondition_met": false
    }
  },

  "metrics": {
    "phases_completed": 1,
    "total_duration_minutes": 48,
    "errors_encountered": 1,
    "escalations": 0,
    "bottlenecks_identified": 5,
    "fixes_implemented": 2,
    "tests_passing": 16,
    "tests_total": 18
  },

  "last_update": "2025-10-26T15:20:00Z",
  "next_action": "Complete fix_3, validate compilation",
  "maintainer_contact": "@spectrasynq"
}
```

### Execution Log: `.taskmaster/workflow/execution_log.json`

**Purpose:** Detailed timeline of all operations

**Schema:**
```json
{
  "entries": [
    {
      "timestamp": "2025-10-26T14:32:00Z",
      "phase": 1,
      "agent": "deep-technical-analyst-supreme",
      "action": "Started forensic analysis",
      "status": "started"
    },
    {
      "timestamp": "2025-10-26T14:50:00Z",
      "phase": 1,
      "agent": "deep-technical-analyst-supreme",
      "action": "Forensic analysis complete",
      "status": "success",
      "outputs": ["docs/analysis/audio_pipeline/*.md"],
      "metrics": {
        "bottlenecks_found": 5,
        "files_scanned": 12,
        "lines_of_code_analyzed": 3847
      }
    },
    {
      "timestamp": "2025-10-26T14:50:30Z",
      "phase": 2,
      "agent": "embedded-firmware-engineer",
      "action": "Started fix_1_pattern_snapshots",
      "status": "started"
    },
    {
      "timestamp": "2025-10-26T15:05:00Z",
      "phase": 2,
      "agent": "embedded-firmware-engineer",
      "action": "Fix 1 compilation PASS",
      "status": "success",
      "metrics": {
        "compilation_time_seconds": 6.9,
        "warnings": 0,
        "errors": 0
      }
    }
  ]
}
```

---

## Required Artifacts

### 1. Orchestration Status: `docs/reports/orchestration_status.md`

**Purpose:** Live visibility into workflow progress

**Structure:**
```markdown
---
author: "multiplier-orchestrator"
date: "2025-10-26"
status: "published"
intent: "Current workflow status and next steps"
---

# K1.reinvented Multiplier Workflow Status

**Workflow ID:** K1_PHASE_4_2025-10-26
**Status:** Phase 2 in progress (70% complete)
**Last Updated:** 2025-10-26 15:20 UTC

## Phase Progress

| Phase | Name | Status | Duration | Start | End |
|-------|------|--------|----------|-------|-----|
| 1 | Discovery (SUPREME) | ✓ COMPLETE | 18 min | 14:32 | 14:50 |
| 2 | Implementation | ⏳ IN PROGRESS | 30 min | 14:50 | TBD |
| 3 | Quality Validation | ⏹️ PENDING | TBD | TBD | TBD |
| 4 | Deployment Decision | ⏹️ PENDING | TBD | TBD | TBD |

## Tier 2: Parallel Tasks Status

| Task | Status | Attempts | Completion |
|------|--------|----------|------------|
| fix_1_pattern_snapshots | ✓ PASS | 1 | 100% |
| fix_2_i2s_timeout | ✓ PASS | 2 | 100% |
| fix_3_mutex_timeout | ⏳ IN PROGRESS | 1 | 60% |
| fix_4_codegen_safety | ⏹️ PENDING | 0 | 0% |
| fix_5_dual_core | ⏹️ PENDING | 0 | 0% |

## Metrics at Glance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Bottlenecks identified | 5 | ≥3 | ✓ |
| Fixes implemented | 2/5 | 5 | ⏳ 40% |
| Tests passing | 16/37 | 37 | ⏳ 43% |
| Compilation warnings | 0 | 0 | ✓ |
| Build time | 6.9s | <10s | ✓ |

## Known Issues

### Issue 1: I2S Configuration Mismatch (RESOLVED)
- **Found:** During fix_2 implementation
- **Problem:** I2S configuration didn't match original Emotiscope
- **Resolution:** Updated microphone.h to exact Emotiscope settings
- **Impact:** Fixed device audio input (was timing out constantly)
- **Status:** ✓ RESOLVED

## Next Steps

1. **Complete fix_3_mutex_timeout** (ETA: 15:35)
   - Current progress: Mutex timeout increases applied
   - Remaining: Validation testing
   - Blocker: None

2. **Start fix_4_codegen_safety** (ETA: 15:45)
   - Depends on: fix_3 complete
   - Est. time: 20 min

3. **Start fix_5_dual_core** (ETA: 16:00)
   - Depends on: fix_4 complete
   - Est. time: 30 min

4. **Transition to Phase 3** (ETA: 16:30)
   - Precondition: All fixes compiled & tests pass
   - Duration: 15-20 min

## Escalation Status

**No active escalations.** All issues encountered have been resolved or documented.

---
```

### 2. Phase Execution Log: `docs/reports/{PHASE}_execution_log.md`

**Purpose:** Human-readable record of phase operations

**Structure:**
```markdown
---
author: "multiplier-orchestrator"
date: "2025-10-26"
status: "published"
intent: "Phase 2 execution timeline and outcomes"
---

# Phase 2: Execution Log

## Timeline

**Phase start:** 2025-10-26 14:50:00 UTC
**Phase end:** 2025-10-26 15:30:00 UTC (est.)
**Duration:** ~40 minutes

### 14:50:00 — Phase 2 Initiated
- Preconditions validated (Phase 1 PASS)
- Parallel tasks spawned:
  - embedded-firmware-engineer (fix_1, fix_2, fix_3, ...)
  - light-show-choreography-specialist-ultra (pattern design)

### 14:50:30 — Fix 1: Pattern Snapshots (Started)
- Bottleneck: BOTTLENECK_1_PATTERN_RACE (from docs/analysis/.../bottleneck_matrix.md)
- Approach: Add atomic snapshots before pattern rendering
- Status: In progress

### 14:55:00 — Fix 1: Pattern Snapshots (PASS)
- Compilation: ✓ 0 errors, 0 warnings
- Tests: 7/7 passing
- Documentation: Implementation.plans/runbooks/fix1_pattern_snapshots_implementation.md
- Notes: No issues, clean implementation

### 14:55:15 — Fix 2: I2S Timeout (Started)
- Bottleneck: BOTTLENECK_2_I2S_TIMEOUT
- Approach: Add bounded timeout fallback to silence
- Status: In progress

### 15:05:00 — Fix 2: Compilation FAIL
- Error: "[AUDIO] I2S read timeout - using silence buffer" logging continuous
- Root cause: I2S configuration doesn't match original Emotiscope
- Investigation: Compared firmware/src/audio/microphone.h with original
- Found issues:
  - Data bit width: 16-bit (should be 32-bit)
  - Slot mode: MONO (should be STEREO)
  - Channel: LEFT (should be RIGHT)
  - WS polarity: false (should be true)

### 15:10:00 — Fix 2: Configuration Correction (Applied)
- Updated I2S configuration to exact Emotiscope settings
- Reverted aggressive 20ms timeout to blocking portMAX_DELAY
- Recompiled: ✓ SUCCESS
- Tests: 5/5 passing

### 15:10:30 — Fix 2: PASS
- Device now reads audio successfully (198-210 FPS achieved)
- Audio reactivity responsive
- Attempts: 2 (1st failed due to config, 2nd passed)

### 15:10:45 — Fix 3: Mutex Timeout (Started)
- Bottleneck: BOTTLENECK_3_MUTEX_TIMEOUT_HANDLING
- Approach: Increase timeout values in goertzel.h
- Status: In progress

[Timeline continues...]

## Metrics Summary

| Metric | Result |
|--------|--------|
| Total fixes started | 2 |
| Fixes passing | 2 |
| Compilation failures | 1 (resolved) |
| Test failures | 0 |
| Avg fix time | ~20 min |
| Issues encountered | 1 (I2S config) |

## Issues Encountered & Resolution

### Issue 1: I2S Timeout Loop (CRITICAL)
- **Detection time:** 15:05:00
- **Root cause:** I2S configuration mismatch
- **Investigation duration:** 5 min
- **Resolution:** Restore exact Emotiscope I2S settings
- **Resolution time:** 10 min
- **Status:** ✓ RESOLVED

## Dependencies & Blockages

**No active blockages.** Workflow progressing on schedule.

---
```

---

## State Management Rules

### Precondition Validation

Before entering any phase:

```
Phase 1 Entry:
  ✓ Codebase exists and is readable
  ✓ Baseline metrics available (from previous runs)
  ✓ All required analysis tools available

Phase 2 Entry:
  ✓ Phase 1 exit criteria PASS
  ✓ All bottleneck files readable
  ✓ Compilation environment ready
  ✓ Test framework installed

Phase 3 Entry:
  ✓ Phase 2 exit criteria PASS
  ✓ All code compiles with 0 warnings
  ✓ All tests pass locally
  ✓ Static analysis tools available

Phase 4 Entry:
  ✓ Phase 3 exit criteria PASS (all gates)
  ✓ No critical issues outstanding
  ✓ Deployment target reachable
```

### State Transition

```
On Success:
  1. Update state.json: status = "completed"
  2. Record end_time, duration_minutes
  3. Save output_files list
  4. Move to next phase
  5. Log transition in execution_log.json

On Failure:
  1. Record failure timestamp
  2. Document error message
  3. Increment attempts counter
  4. If attempts < max_retries:
     - Retry (clear state, restart phase)
  5. Else:
     - Create escalation record
     - Notify maintainer
     - Halt workflow
     - Document in Implementation.plans/backlog/
```

---

## Escalation Decision Tree

```
If problem found:
  ├─ Is it a precondition failure?
  │  └─ YES → Halt phase, wait for precondition
  │
  ├─ Is it compilation/test failure?
  │  ├─ Retryable? (yes) → Retry up to 2x
  │  └─ Not retryable? → Escalate + HALT
  │
  ├─ Is it performance regression?
  │  ├─ < 5%? → Continue, document
  │  └─ > 5%? → Escalate to @spectrasynq
  │
  └─ Is it architecture conflict?
     └─ YES → Create ADR, escalate, HALT until resolved
```

---

## Exit Criteria Summary

| Phase | ALL conditions MUST be true | Escalation if |
|-------|----------------------------|----------------|
| 1 | 3+ bottlenecks identified, all with line numbers, root causes documented | Analysis incomplete or architecture issue found |
| 2 | Code compiles 0 errors/warnings, all tests pass, no memory regression > 5% | Compilation fails after 2 retries, or unexpected test failure |
| 3 | Security ≥90, Quality ≥90, Coverage ≥95%, Performance meets targets | Any gate < threshold, unless marked CONDITIONAL |
| 4 | All gates PASS, firmware.bin created, deployment package ready | Any gate fails in Phase 4 validation |

---

## Tools & Commands

```bash
# Initialize workflow
mkdir -p .taskmaster/workflow
cat > .taskmaster/workflow/state.json << 'EOF'
{
  "workflow_id": "K1_WORKFLOW_$(date +%Y-%m-%d_%H-%M)",
  "status": "initialized",
  "current_phase": 1
}
EOF

# Update state (simplified)
jq '.status = "in_progress" | .current_phase = 2' \
  .taskmaster/workflow/state.json > .taskmaster/workflow/state.json.tmp && \
  mv .taskmaster/workflow/state.json.tmp .taskmaster/workflow/state.json

# View workflow status
jq '.' .taskmaster/workflow/state.json

# Commit workflow state
git add .taskmaster/workflow/state.json
git commit -m "workflow: update state (Phase 2 in progress)"
```

---

## Reference

- Full details: **CLAUDE.md § Agent Playbooks → Multiplier Orchestrator**
- Workflow design: **CLAUDE.md § Multiplier Workflow**
- State schema: This document

<!-- markdownlint-enable MD013 -->
