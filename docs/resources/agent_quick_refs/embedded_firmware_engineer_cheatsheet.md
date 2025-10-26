<!-- markdownlint-disable MD013 -->

# Embedded Firmware Engineer Quick Reference

**Agent Persona:** Parallel Implementation Specialist
**Tier:** 2 — Parallel Code Fixes & Features
**Responsibility:** Apply fixes/features atomically, validate locally, document changes with traceability

---

## Filing Locations

| Artifact | Location |
|----------|----------|
| Code changes | `firmware/src/` |
| Test suites | `firmware/test/test_{fix_name}/` |
| Before/after docs | `Implementation.plans/runbooks/` |
| Validation reports | `docs/reports/` |

---

## Workflow: From Analysis to Validation

```
SUPREME delivers:
  └─ docs/analysis/{subsystem}/bottleneck_matrix.md
     (ID, file:line, severity, effort estimate)

You implement:
  ├─ firmware/src/{file} (apply fix with comments)
  ├─ firmware/test/test_{fix_name}/*.cpp (comprehensive tests)
  ├─ Implementation.plans/runbooks/{fix_name}_implementation.md (documentation)
  └─ docs/reports/{PHASE}_fixes_validation.md (test results)

Tier 3 validates:
  └─ Reads all artifacts above
```

---

## Required Artifacts

### 1. Code Changes: `firmware/src/{file}`

**Rules:**
- Make fix atomically (one logical change per commit)
- Add comment referencing source bottleneck:
  ```cpp
  // Addresses BOTTLENECK_2_MUTEX_TIMEOUT from docs/analysis/audio_pipeline/bottleneck_matrix.md
  // Original: xSemaphoreTake(..., pdMS_TO_TICKS(1))
  // Fix: xSemaphoreTake(..., pdMS_TO_TICKS(10))  // Increased timeout from 1ms to 10ms
  ```
- Do NOT commit with compiler warnings
- Do NOT introduce new security issues

### 2. Test Suite: `firmware/test/test_{fix_name}/*.cpp`

**Purpose:** Validate the fix actually works

**Structure:**
```cpp
// firmware/test/test_fix2_i2s_timeout/test_i2s_timeout.cpp

#include <gtest/gtest.h>
#include "../../src/audio/microphone.h"

// Test 1: Normal operation
TEST(I2STimeout, ReadsAudioWhenMicrophoneConnected) {
  // Arrange: simulate microphone connected
  // Act: call acquire_sample_chunk()
  // Assert: bytes_read > 0, no timeout logged
}

// Test 2: Graceful degradation
TEST(I2STimeout, UsesSilenceOnMicrophoneDisconnect) {
  // Simulate microphone disconnected
  // Verify: falls back to silence, logs once per second max
}

// Test 3: Performance
TEST(I2STimeout, MaintainsFPS) {
  // Run for 30 seconds, measure FPS
  // Assert: FPS >= 150 despite timeout events
}
```

**Test naming:** `test_{what_you_test}.cpp`
**Required:** Minimum 3 tests per fix
**Coverage:** Must test:
- Happy path (normal operation)
- Error cases (what fails gracefully?)
- Performance impact (doesn't slow system?)

### 3. Runbook: `Implementation.plans/runbooks/{fix_name}_implementation.md`

**Purpose:** Document before/after for code reviewers

**Structure:**
```markdown
---
author: "embedded-firmware-engineer"
date: "2025-10-26"
status: "published"
intent: "Document I2S timeout fix for reviewers"
---

# Fix: I2S Timeout Safety

## Location
- File: firmware/src/audio/microphone.h
- Lines: 90-110
- Addresses: BOTTLENECK_2_MUTEX_TIMEOUT (docs/analysis/.../bottleneck_matrix.md)

## Problem
I2S read blocks indefinitely (portMAX_DELAY), causing device freeze if microphone disconnects.

## Before Code
\`\`\`cpp
// Line 95-96 (original, broken)
i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, portMAX_DELAY);
// If microphone disconnected → FOREVER WAIT
\`\`\`

## After Code
\`\`\`cpp
// Line 95-97 (fixed)
BaseType_t read_result = i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(20));
if (read_result != pdPASS) {
  memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);  // Use silence
}
\`\`\`

## Validation
- Test: firmware/test/test_fix2_i2s_timeout/test_i2s_timeout.cpp
- All 5 tests pass
- FPS maintained at 200+
- No memory leaks detected

## Performance Impact
- Latency: +0ms (timeout is fallback only)
- Memory: +0 bytes
- CPU: +0% (timeout branch taken <1% of time)

## Rollback Plan
```bash
git revert {commit_hash}
```

---
```

### 4. Validation Report: `docs/reports/{PHASE}_fixes_validation.md`

**Purpose:** Summary of all fixes in phase
**Created by:** You (as implementation summary) + Tier 3 agents (detailed review)

**Your sections:**
```markdown
## Tier 2: Fixes Implementation

### Completed Fixes
- [x] BOTTLENECK_1_PATTERN_RACE: firmware/src/generated_patterns.h:180
- [x] BOTTLENECK_2_I2S_TIMEOUT: firmware/src/audio/microphone.h:95
- [ ] BOTTLENECK_5_DUAL_CORE: firmware/src/main.cpp (in progress)

### Test Summary
- Total tests: 37
- Passing: 37
- Failing: 0
- Coverage: 97.5%

### Resource Usage
| Resource | Before | After | Delta |
|----------|--------|-------|-------|
| RAM | 96.5 KB | 96.8 KB | +0.3 KB |
| Flash | 1.05 MB | 1.06 MB | +10 KB |
| Compile time | 6.0s | 6.9s | +0.9s |

### Known Issues
- None

---
```

---

## Exit Criteria Checklist

✓ **Code Quality**
- [ ] Compiles with 0 errors
- [ ] 0 new compiler warnings
- [ ] No security issues (static analysis clean)
- [ ] Follows existing code style
- [ ] Comments link fixes to source bottlenecks

✓ **Testing**
- [ ] Minimum 3 tests per fix
- [ ] All tests pass locally
- [ ] Tests actually verify the fix (not just compile)
- [ ] No test isolation issues (tests don't depend on order)

✓ **Documentation**
- [ ] Runbook includes before/after code
- [ ] Before/after clearly shows what changed
- [ ] Line numbers are accurate
- [ ] Validation report summarizes all fixes in phase
- [ ] All files pass markdownlint

✓ **Performance**
- [ ] Memory footprint change < 5% (or approved)
- [ ] No latency regression
- [ ] Achieves fix goal (e.g., no more timeouts)
- [ ] Passes 30-minute stress test

✓ **Traceability**
- [ ] Each fix references source BOTTLENECK_N from SUPREME analysis
- [ ] Each test explains what it validates
- [ ] Validation report cites baseline metrics
- [ ] All diffs are atomic (one logical change per commit)

---

## Escalation

**If you encounter...**

| Situation | Action |
|-----------|--------|
| Compilation failure | Document exact error in `Implementation.plans/backlog/{issue}_blocker.md` + escalate immediately |
| Unexpected test failure | Isolate to specific code change, document root cause, escalate if not fixable |
| Memory regression > 5% | Escalate to @spectrasynq with analysis |
| Race condition you can't eliminate | Escalate with evidence (race detector output, statistical analysis) |
| Dependency chain broken | Document in backlog, escalate |

---

## Tools & Commands

```bash
# Build locally
cd firmware && pio run

# Run unit tests
cd firmware && pio test -e esp32-s3-devkitc-1

# Check for compiler warnings
pio run 2>&1 | grep -i warning

# Static analysis
pio check --severity medium

# Memory analysis
pio run --target size

# Performance profiling (on device)
# See firmware/test/test_fix_*/*.cpp for examples

# Commit your changes
git add firmware/src/{file} firmware/test/test_{fix}/
git commit -m "firmware: {fix_name} - {one_sentence_benefit}"

# Before final commit, ensure:
# 1. Compiles: pio run
# 2. Tests pass: pio test
# 3. No warnings: pio run 2>&1 | grep -i warning
# 4. Memory OK: pio run --target size
```

---

## Template: Quick Commit Message

```
firmware: {fix_name} - {benefit}

Addresses: BOTTLENECK_{N}_{NAME} from docs/analysis/.../bottleneck_matrix.md
Tests: firmware/test/test_{fix_name}/ (all passing)
Documentation: Implementation.plans/runbooks/{fix_name}_implementation.md
Validation: {brief_result} - {metric_improvement}

Fixes #123 (if applicable)
```

---

## Reference

- Full details: **CLAUDE.md § Agent Playbooks → Embedded Firmware Engineer**
- Dependency chains: **CLAUDE.md § Multiplier Workflow → Tier 2**
- Exit criteria: **CLAUDE.md § Multiplier Workflow → Exit Criteria (per fix)**

<!-- markdownlint-enable MD013 -->
