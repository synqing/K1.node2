<!-- markdownlint-disable MD013 -->

# Code Reviewer & Quality Validator Quick Reference

**Agent Persona:** Security, Quality, Performance Audit Specialist
**Tier:** 3 — Quality Validation & Decision Gates
**Responsibility:** Multi-layer validation, cite baseline metrics, provide quality scores with evidence

---

## Filing Locations

All reports go to: `docs/reports/`

**Examples:**
- `docs/reports/phase_4_code_review_report.md`
- `docs/reports/phase_4_test_summary.md`
- `docs/reports/phase_4_profiling_report.md`

---

## Workflow: From Implementation to Decision

```
Tier 2 delivers:
  ├─ firmware/src/{fixed_files}
  ├─ firmware/test/{test_suites}
  ├─ Implementation.plans/runbooks/{fix}_implementation.md
  └─ docs/reports/{PHASE}_fixes_validation.md

You validate:
  ├─ Code security/quality
  ├─ Test coverage & results
  ├─ Memory & performance profiling
  └─ Comparison vs. baseline

Output to:
  ├─ docs/reports/{PHASE}_code_review_report.md
  ├─ docs/reports/{PHASE}_test_summary.md
  └─ docs/reports/{PHASE}_profiling_report.md

Decision gate:
  └─ All PASS → Ready for deployment
     1-2 CONDITIONAL → Escalate
     3+ FAIL → Return to Tier 2
```

---

## Required Artifacts

### 1. Code Review Report: `{PHASE}_code_review_report.md`

**Purpose:** Security and quality assessment with scores

**Structure:**
```markdown
---
author: "code-reviewer"
date: "2025-10-26"
status: "published"
intent: "Security and quality audit for Phase 4"
---

# Phase 4: Code Review Report

## Executive Summary
- Security Score: 95/100 ✓ PASS
- Code Quality Score: 92/100 ✓ PASS
- Memory Safety: PASS (no unsafe patterns found)

## Security Analysis

### Static Analysis Scan
Tool: cppcheck/clang-tidy
Files scanned: firmware/src/audio/*.{h,cpp}
Issues found: 0 high severity, 2 medium (see below)

### Issue 1: Buffer Overflow Potential
- File: firmware/src/audio/goertzel.h:156
- Severity: MEDIUM
- Description: Array access without bounds check
- Fix: Add `if (i < NUM_FREQS)` guard (line 157)
- Status: REVIEW - no immediate risk but should be fixed

### Vulnerability Check
- No use of strcpy, sprintf without bounds
- All pointers validated before dereference
- No integer overflow vectors found
- Mutex deadlock analysis: OK (no nested waits)

### Security Score Breakdown
| Category | Score | Notes |
|----------|-------|-------|
| Injection vulnerabilities | 100 | None found |
| Memory safety | 90 | 1 potential buffer access, minor |
| Threading safety | 95 | Mutex strategy solid |
| Resource leaks | 100 | No leaks detected |
| **TOTAL** | **95/100** | PASS |

---

## Code Quality Analysis

### Complexity Metrics
- Cyclomatic complexity: avg 3.2, max 8 (acceptable)
- Functions >200 lines: 0 (good)
- Comment coverage: 85% (good)

### Style Compliance
- Naming conventions: 100% compliance
- Indentation: consistent (tabs)
- Bracket style: consistent
- Line length: 2 violations (commented, acceptable)

### Issues Found
1. Variable name inconsistency: `new_samples` vs `sample_new` (decide and standardize)
2. Missing function docstrings: 3 functions lack comments (add before merge)

### Code Quality Score Breakdown
| Aspect | Score | Notes |
|--------|-------|-------|
| Correctness | 95 | Logic sound, 1 buffer bounds check needed |
| Maintainability | 90 | Good structure, fix naming inconsistency |
| Testability | 95 | Code structure allows good test coverage |
| Documentation | 85 | Mostly clear, add 3 function docstrings |
| **TOTAL** | **92/100** | PASS |

---

## Comparison vs. Baseline

From SUPREME analysis (docs/analysis/audio_pipeline/bottleneck_matrix.md):
- BOTTLENECK_2_I2S_TIMEOUT: Expected to eliminate timeout hangs
- **Result:** ✓ No timeout hangs in 30-minute test run

---

## Gate Decision
✓ **PASS - Recommend for merge**

Conditions: Fix the 2 MEDIUM issues before deployment (both low-effort, non-blocking).

---
```

### 2. Test Summary: `{PHASE}_test_summary.md`

**Purpose:** Test coverage, execution results, quality metrics

**Structure:**
```markdown
---
author: "test-automator"
date: "2025-10-26"
status: "published"
intent: "Test execution summary for Phase 4"
---

# Phase 4: Test Summary

## Overall Results
✓ **ALL TESTS PASS**

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Total Tests | 37 | N/A | ✓ |
| Passing | 37 | 37 | ✓ PASS |
| Failing | 0 | 0 | ✓ PASS |
| Coverage | 97.5% | ≥95% | ✓ PASS |
| Execution Time | 4.2 min | <10 min | ✓ PASS |

## Test Breakdown by Fix

### Fix 1: Pattern Race Condition
- Tests: 7/7 passing
- Coverage: 100% (atomic snapshot functions)
- Evidence: No data races detected in 1M frame stress test

### Fix 2: I2S Timeout
- Tests: 5/5 passing
- Coverage: 95% (timeout branch, recovery)
- Evidence: Graceful silence buffer on disconnect, logged once/second max

### Fix 3: Mutex Timeout
- Tests: 6/6 passing
- Coverage: 98% (mutex acquisition, timeout handling)
- Evidence: No deadlocks in 10K mutex contention test

### Fix 4: Codegen Safety Macro
- Tests: 4/4 passing
- Coverage: 100% (macro expansion, pattern audio interface)

### Fix 5: Dual-Core Execution
- Tests: 7/7 passing
- Coverage: 96% (task creation, core affinity, memory isolation)
- Evidence: Audio task runs on Core 1, LED task on Core 0, no cross-core interference

### Stress Tests
- 30-minute stability: ✓ PASS (FPS 200+, no leaks)
- Rapid pattern switching: ✓ PASS (audio sync maintained)
- Thermal monitoring: ✓ PASS (<65°C max)

## Coverage Analysis

| Component | Coverage | Status |
|-----------|----------|--------|
| firmware/src/audio/microphone.h | 95% | ✓ PASS |
| firmware/src/audio/goertzel.h | 97% | ✓ PASS |
| firmware/src/led_driver.h | 92% | ✓ PASS |
| firmware/src/generated_patterns.h | 98% | ✓ PASS |
| **Total** | **97.5%** | ✓ PASS |

## Known Issues
None. All found issues are documented and have workarounds.

---

## Gate Decision
✓ **PASS - All metrics exceed targets**

---
```

### 3. Profiling Report: `{PHASE}_profiling_report.md`

**Purpose:** Memory, CPU, latency, performance metrics

**Structure:**
```markdown
---
author: "performance-profiler"
date: "2025-10-26"
status: "published"
intent: "Memory and performance profiling for Phase 4"
---

# Phase 4: Profiling Report

## Memory Usage

### Baseline (Pre-Fix)
- RAM: 92.5 KB / 320 KB (28.9%)
- Flash: 1.04 MB / 1.97 MB (52.8%)

### After Fixes
- RAM: 96.8 KB / 320 KB (30.3%)
- Flash: 1.06 MB / 1.97 MB (53.8%)

### Delta
- RAM: +4.3 KB (+1.4%) ✓ Within 5% budget
- Flash: +20 KB (+1.0%) ✓ Within 5% budget

### Breakdown
| Component | Size | Purpose |
|-----------|------|---------|
| Audio sync buffers (new) | +3.2 KB | Atomic snapshots (BOTTLENECK_1) |
| Mutex timeout logic | +1.1 KB | Timeout handling (BOTTLENECK_3) |
| Test instrumentation | +0.5 KB | Performance measurement |
| **Total** | **+4.8 KB** | |

---

## CPU Performance

### Baseline Measurements
| Metric | Before | Target |
|--------|--------|--------|
| FPS | 25-37 | ≥150 |
| Audio latency | 32-40ms | <20ms |
| Task CPU load (Core 0) | 45% | <70% |
| Task CPU load (Core 1) | N/A | <70% |

### After Fixes
| Metric | After | Target | Status |
|--------|-------|--------|--------|
| FPS | 198-210 | ≥150 | ✓ **5.3-8.2x improvement** |
| Audio latency | 16-18ms | <20ms | ✓ **50% reduction** |
| Task CPU (Core 0) | 35% | <70% | ✓ Better |
| Task CPU (Core 1) | 25% | <70% | ✓ **New, healthy** |

### Key Observations
- FPS stability: ±5 FPS variance (very stable)
- Audio latency: Consistent, no spikes
- Dual-core benefit: Freed 10% CPU on Core 0
- No thermal throttling detected

---

## Timing Analysis

### Frame Timing Breakdown
| Phase | Time | Target |
|-------|------|--------|
| LED rendering | 4.2ms | <5ms |
| Audio capture | 7.8ms | <10ms |
| Pattern computation | 1.1ms | <2ms |
| I2S transaction | 0.5ms | <1ms |
| **Total per frame** | **~5ms** | **200 FPS = 5ms/frame** |

### Latency Chain
- Microphone to FFT: 7.8ms
- FFT to pattern: 1.1ms
- Pattern to LED driver: 0.5ms
- **Total audio-to-visual latency: 9.4ms** (target <20ms) ✓ PASS

---

## Stress Test Results

### 30-Minute Stability Run
- Duration: 30 minutes
- FPS range: 198-210 (stable)
- Memory leaks: 0 detected
- Deadlocks: 0 detected
- Thermal max: 62°C

### Rapid Pattern Switching
- 1000 pattern switches over 2 minutes
- Audio sync maintained throughout
- No glitches or artifacts
- FPS remained stable

---

## Gate Decision
✓ **PASS - All metrics exceed targets with healthy margin**

---
```

---

## Exit Criteria Checklist

✓ **Quality Metrics**
- [ ] Security score ≥ 90/100 with evidence
- [ ] Code quality score ≥ 90/100 with evidence
- [ ] Test coverage ≥ 95% with breakdown
- [ ] Zero compiler warnings
- [ ] Zero high/critical lint violations

✓ **Performance Validation**
- [ ] FPS ≥ 150 (or target met)
- [ ] Latency < 20ms (or target met)
- [ ] Memory delta < 5% (or approved exception)
- [ ] CPU utilization < 70% per core
- [ ] No thermal issues
- [ ] 30-minute stability test passed

✓ **Traceability**
- [ ] Each report links to Tier 1 (SUPREME analysis)
- [ ] Each report cites Tier 2 (implementation & tests)
- [ ] Baseline metrics documented from before fixes
- [ ] Before/after comparison clear
- [ ] All files pass markdownlint

✓ **Decision Gate**
- [ ] All metrics PASS or CONDITIONAL (with escalation)
- [ ] Issues documented and assigned (or workaround documented)
- [ ] Deployment decision clear (READY / CONDITIONAL / HOLD)

---

## Escalation

**If you find...**

| Situation | Action | Decision |
|-----------|--------|----------|
| Security vulnerability (high/critical) | Create critical ADR + notify maintainer | HOLD deployment |
| Test coverage < 95% | Recommend additional tests | CONDITIONAL |
| Performance < 90% of target | Analyze cause, propose fix | CONDITIONAL or HOLD |
| Memory increase > 5% | Escalate with justification | CONDITIONAL |
| Unexpected failures in production-like test | Investigate root cause | HOLD |

---

## Tools & Commands

```bash
# Static analysis
pio check --severity medium

# Code complexity
cppcheck firmware/src/audio/*.cpp --enable=all

# Test execution
cd firmware && pio test -e esp32-s3-devkitc-1

# Memory profiling
pio run --target size
pio run --target size-files

# Coverage report (if configured)
pio test -e esp32-s3-devkitc-1 --coverage

# Performance measurement (on device)
# Use Serial output or telemetry API

# Lint reports
npx markdownlint-cli docs/reports/*.md
```

---

## Template: Quality Gate Decision

```markdown
## Final Gate Decision

**All quality gates: PASS ✓**

| Gate | Score | Status |
|------|-------|--------|
| Security | 95/100 | PASS |
| Quality | 92/100 | PASS |
| Testing | 97.5% | PASS |
| Performance | 5.3x improvement | PASS |

**Recommendation:** READY FOR DEPLOYMENT

Conditions: Fix 2 MEDIUM code quality issues before final release (non-blocking, low-effort).

Signed: code-reviewer
Date: 2025-10-26
```

---

## Reference

- Full details: **CLAUDE.md § Agent Playbooks → Code Reviewer & Quality Validator**
- Exit criteria: **CLAUDE.md § Multiplier Workflow → Tier 3**
- Escalation: **CLAUDE.md § Failure Escalation Paths**

<!-- markdownlint-enable MD013 -->
