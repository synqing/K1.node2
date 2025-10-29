---
title: Phase 2 Hardware Testing - I2S Error Logging Interference
status: blocker
date: 2025-10-29
author: Claude Agent (Test Validation)
intent: Document blocker preventing Phase 2B/2C testing and propose mitigation
---

# Phase 2 Hardware Testing - I2S Error Logging Interference

## Issue Description

Phase 2B and 2C stress tests cannot execute properly due to continuous I2S microphone error logging flooding the system at ~37 msg/sec.

## Root Cause Analysis

### Pre-Existing I2S Configuration Issue
- **Source:** `firmware/src/audio/microphone.h` - I2S read timeout errors (code 262 = ESP_ERR_TIMEOUT)
- **Rate:** ~37 messages/second
- **Message:** `[HH:MM:SS.mmm] ERROR [I] Read failed with code 262, block_us=N`

### Not Caused by Phase 2
- These errors existed before Phase 2 implementation
- Phase 1 logging simply made them visible (previously silent failures)
- Phase 2 Ring Buffer is **successfully transmitting** these messages

### Test Contamination Impact
- **Phase 2A Ring Buffer Test:** Successfully completed (10,000 message burst)
- **Phase 2B Rate Limiter Test:** BLOCKED - Cannot test rate limiting with continuous I2S errors
  - Expected: 1000 messages/sec generation rate to test 100 msg/sec limit
  - Actual: 37 I2S errors/sec + test messages = mixed signal
  - Problem: Can't distinguish which messages were rate-limited vs. I2S errors
- **Phase 2C HTTP API Test:** Not yet tested (manual verification phase)

## Escalation Reason

**Test failures blocked by pre-existing hardware issue**, not Phase 2 implementation failure.

**Critical path blocked:** Cannot complete Phase 2B validation without resolving I2S error logging.

## Proposed Solutions

### Option A: Disable Microphone During Tests (RECOMMENDED)
```cpp
// In test initialization
init_i2s_microphone();  // Start microphone
// ...
// Before Phase 2B test
// TODO: Disable I2S input or mute audio logging
set_tag_enabled('I', false);  // Disable I2S tag logging
// Run tests
// Re-enable after
set_tag_enabled('I', true);
```

**Pros:**
- Non-invasive to Phase 2 code
- Uses existing rate limiter infrastructure
- Tests can proceed cleanly

**Cons:**
- Requires temporary code change for testing
- Tests won't validate logging during active audio

### Option B: Fix I2S Configuration
```cpp
// In microphone.h - investigate why read() times out
// Possible causes:
// 1. PDM/I2S mode mismatch
// 2. GPIO pin configuration (BCLK, LRCLK, DIN)
// 3. I2S clock divider settings
// 4. Microphone hardware failure
```

**Pros:**
- Fixes the real hardware issue
- Eliminates 37 msg/sec of error noise
- Improves overall system stability

**Cons:**
- Requires I2S/audio expertise
- May require hardware debugging
- Longer timeline to resolution

### Option C: Filter I2S Errors in Test
```cpp
// In test harness
// Only count non-'I' tag messages for rate limiter test
while (millis() - test_start < 1000) {
    if (RateLimiter::should_limit('B')) {
        messages_dropped++;
    } else {
        messages_passed++;
        // Only log test messages with tag B, skip I2S noise
        LOG_INFO('B', "Rate limit test message %d", messages_passed);
    }
    messages_generated++;
}
```

**Pros:**
- No code changes needed in production
- Tests proceed with data cleaned in test harness

**Cons:**
- Test isolation violated (depends on external state)
- Doesn't fix the underlying issue
- Test becomes less realistic

## Recommendation

**Option A (Disable Microphone During Tests)** is best short-term approach:
1. Simple implementation: `set_tag_enabled('I', false)` before Phase 2B
2. Preserves test integrity
3. Unblocks Phase 2 validation
4. Leaves Option B (fix I2S) for separate maintenance

## Blocking Path Forward

**Until this is resolved:**
1. ❌ Cannot complete Phase 2B rate limiter stress test
2. ❌ Cannot complete Phase 2C HTTP API test
3. ✅ Phase 2A ring buffer test PASSED (verified independently)
4. ⏳ Cannot complete full hardware validation

**Next action:** Implement Option A (mute I2S logging during tests) and rerun test suite

---

## Evidence

### Device Output Sample (17:25-17:29 UTC)
```
[00:00:25.07] ERROR [I] Read failed with code 262, block_us=1
[00:00:25.10] ERROR [I] Read failed with code 262, block_us=1
[00:00:25.13] ERROR [I] Read failed with code 262, block_us=1
... (continuous, ~37 msg/sec)
[00:00:25.26] ERROR [I] Read failed with code 262, block_us=1
```

### Build Impact
- Phase 2 additions: +1.2 KB Flash (824 KB total)
- RAM: Still within budget (37.8%)
- Compilation: 0 errors, 0 warnings

---

**Status:** ESCALATION POINT - Awaiting decision on Option A/B/C before proceeding

