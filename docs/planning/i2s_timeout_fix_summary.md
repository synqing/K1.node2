---
title: I2S Timeout Fix: Executive Summary
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# I2S Timeout Fix: Executive Summary

## The Problem in One Sentence

**Current I2S timeout of 20ms blocks Core 0 rendering, limiting FPS to 43 instead of target 200+.**

---

## Root Cause

**File:** `firmware/src/audio/microphone.h:93`

```cpp
// ❌ WRONG: Blocks for up to 20ms waiting for I2S data
esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    pdMS_TO_TICKS(20)  // 20ms timeout
);
```

**Impact:**
- Frame time: 20ms (I2S wait) + 3ms (render) = 23ms
- FPS: 1000ms / 23ms = **43 FPS** ❌
- Target: 1000ms / 5ms = **200 FPS** ✅

---

## The Fix

**Change one line:**

```cpp
// ✅ CORRECT: Non-blocking due to DMA buffering
esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    portMAX_DELAY  // Returns immediately when DMA data ready (<1ms)
);
```

**Why this works:**
1. I2S DMA fills internal buffer continuously at 16kHz (hardware-driven)
2. Buffer depth ~256 samples (16ms worth)
3. Main loop calls `acquire_sample_chunk()` every 20ms
4. Data is ALWAYS ready (8ms chunk, 20ms poll = 12ms buffered)
5. `portMAX_DELAY` returns immediately (<1ms actual wait)

---

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Core 0 FPS | 43 FPS | 200+ FPS | **5x faster** |
| I2S read time | 20ms | <1ms | **20x faster** |
| Frame time | 23ms | <5ms | **5x faster** |
| Audio cadence | 8ms (125 Hz) | 8ms (125 Hz) | Unchanged |

---

## Implementation Time

- **Code change:** 5 minutes (one line + comments)
- **Testing:** 30 minutes (FPS measurement + validation)
- **Total:** **35 minutes**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| portMAX_DELAY blocks >5ms | **Low** | High | Measure actual read time; fallback to 1ms timeout |
| DMA buffer overflow | **Low** | Medium | Add stall detector; log errors |
| Audio dropouts | **Very Low** | Low | Fill with silence on error |

**Overall Risk:** ✅ **LOW** (proven pattern from original Emotiscope)

---

## Validation Checklist

- [ ] FPS ≥200 (measured via serial monitor)
- [ ] I2S error rate = 0 (no DMA overflow)
- [ ] Audio reactive patterns work (visual confirmation)
- [ ] No main loop stalls >10ms

**Pass Criteria:** All checkboxes ✅

---

## Quick Links

- **Design Spec (FULL):** `/docs/planning/i2s_nonblocking_audio_acquisition_design.md`
- **Implementation Runbook:** `/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md`
- **Forensic Analysis:** `/docs/analysis/MAIN_CPP_FORENSIC_ANALYSIS_README.md`

---

## Decision

**Recommendation:** ✅ **APPROVED FOR IMPLEMENTATION**

**Rationale:**
1. One-line fix with massive performance gain (5x FPS)
2. Proven pattern (original Emotiscope used portMAX_DELAY)
3. Low risk (DMA buffering makes portMAX_DELAY effectively non-blocking)
4. Fast implementation (35 minutes total)

**Next Steps:**
1. Execute runbook: `/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md`
2. Measure baseline FPS (expect ~43 FPS)
3. Apply fix (change timeout to portMAX_DELAY)
4. Validate FPS ≥200 and error rate = 0
5. Monitor for 24 hours (ensure stability)

---

**Summary Status:** Published
**Decision:** APPROVED
**Priority:** HIGH (blocking 200+ FPS target)
**Owner:** Embedded Firmware Engineer (Tier 2)
