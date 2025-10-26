<!-- markdownlint-disable MD013 -->

# Test Evidence Standards & Methodology

**Purpose:** Define what constitutes "proof" that a fix works, how tests relate to bottlenecks, and how to document test strategy.

**Maintained by:** Embedded Firmware Engineers & Test Automators
**Standard since:** 2025-10-26
**Version:** 1.0

---

## Core Principle

**Every test must verify a specific bottleneck fix or feature requirement.**

Not acceptable:
- "Test that pattern renders" (vague, not specific)
- "Check if audio works" (no measurable acceptance criteria)
- "Verify no crashes" (too broad)

Acceptable:
- "Test that pattern snapshots prevent tearing" (specific fix, measurable: no artifacts in 1M frames)
- "Verify I2S timeout gracefully falls back to silence" (specific fix, measurable: timeout → silence logged once/sec max)
- "Test dual-core doesn't create race conditions" (specific fix, measurable: run 30 min, no data corruption)

---

## Test Types & Evidence Standards

### Type 1: Unit Tests (Function-Level)

**Purpose:** Verify individual functions work correctly in isolation

**What to test:**
- Function inputs are validated
- Outputs are correct for valid inputs
- Error cases handled gracefully
- Boundary conditions handled

**Example: I2S Timeout**
```cpp
TEST(I2STimeout, NormalReadSuccess) {
  // Arrange: microphone connected, data available
  mock_i2s_set_data_available(true);

  // Act
  uint32_t buffer[CHUNK_SIZE];
  BaseType_t result = i2s_channel_read(..., pdMS_TO_TICKS(20));

  // Assert
  ASSERT_EQ(result, pdPASS);
  ASSERT_GT(bytes_read, 0);
}

TEST(I2STimeout, TimeoutFallback) {
  // Arrange: microphone NOT connected, no data
  mock_i2s_set_data_available(false);

  // Act
  uint32_t buffer[CHUNK_SIZE];
  BaseType_t result = i2s_channel_read(..., pdMS_TO_TICKS(20));

  // Assert: timeout occurs, function handles it
  ASSERT_NE(result, pdPASS);
  // Verify fallback to silence
  for (int i = 0; i < CHUNK_SIZE; i++) {
    ASSERT_EQ(buffer[i], 0);  // Silence buffer
  }
}
```

**Evidence standards:**
- ✓ At least 3 test cases per function
- ✓ Both success and failure paths tested
- ✓ Boundary values tested (min, max, edge cases)
- ✓ Each assert has a clear expected value (not just "should work")

---

### Type 2: Integration Tests (Component Interaction)

**Purpose:** Verify components work together correctly

**What to test:**
- Data flows between components correctly
- Synchronization (mutexes, semaphores) works
- No deadlocks or race conditions
- Timing constraints met

**Example: Audio Buffer Synchronization**
```cpp
TEST(AudioSync, NoTearingWithConcurrentAccess) {
  // Arrange: Two tasks competing for audio buffer
  // Task 1: writes new audio samples
  // Task 2: reads samples for pattern rendering

  // Act: Run both for 30 seconds
  xTaskCreate(audio_writer_task, ...);
  xTaskCreate(pattern_reader_task, ...);
  vTaskDelay(pdMS_TO_TICKS(30000));

  // Assert: No data corruption detected
  ASSERT_EQ(tearing_count, 0);
  ASSERT_EQ(deadlock_count, 0);
  ASSERT_GT(frames_rendered, 3000);  // Should render > 100 FPS
}

TEST(AudioSync, MutexTimeout) {
  // Verify mutex timeout doesn't starve readers
  uint32_t timeout_count = 0;

  for (int i = 0; i < 1000; i++) {
    AudioDataSnapshot snapshot;
    bool success = get_audio_snapshot(&snapshot);
    if (!success) timeout_count++;
  }

  ASSERT_LT(timeout_count, 50);  // < 5% timeout rate
  ASSERT_NE(timeout_count, 1000); // Not all timeouts
}
```

**Evidence standards:**
- ✓ Tests run concurrently (not sequential)
- ✓ Minimum 1000 iterations or 30 seconds runtime
- ✓ Specific failure detection (tearing, deadlock, timeout)
- ✓ Quantified expectations (< 5% timeout rate, 0 deadlocks)

---

### Type 3: Performance Tests (Timing, Memory, CPU)

**Purpose:** Verify fix achieves performance targets

**What to test:**
- Latency within target range
- FPS meets minimum
- Memory footprint acceptable
- CPU utilization < threshold
- No performance regression

**Example: FPS Target**
```cpp
TEST(Performance, FPS_Target_150Plus) {
  // Arrange: Run rendering loop for 10 seconds
  uint32_t frame_count = 0;
  uint32_t start_time = millis();

  // Act: Render frames
  while (millis() - start_time < 10000) {
    render_frame();
    frame_count++;
  }

  uint32_t duration_ms = millis() - start_time;
  float fps = (frame_count / (float)duration_ms) * 1000.0;

  // Assert: FPS meets target
  ASSERT_GE(fps, 150.0);  // Must be >= 150 FPS
}

TEST(Performance, AudioLatency_Under20ms) {
  // Simulate audio-to-LED latency measurement
  uint32_t latencies[100];

  for (int i = 0; i < 100; i++) {
    uint32_t audio_capture = measure_audio_timestamp();
    float audio_level = get_audio_level();
    uint32_t led_change = measure_led_timestamp();

    latencies[i] = led_change - audio_capture;
  }

  // Assert: All latencies < 20ms
  for (int i = 0; i < 100; i++) {
    ASSERT_LT(latencies[i], 20);
  }

  // Assert: Mean latency < 15ms (with headroom)
  float mean = average(latencies, 100);
  ASSERT_LT(mean, 15.0);
}
```

**Evidence standards:**
- ✓ Test runs minimum 30 seconds or 1000 iterations
- ✓ Measurements include min, max, mean, stddev
- ✓ Performance targets explicitly stated in asserts
- ✓ No ambient interference (disable other tasks if needed)

---

### Type 4: Stress Tests (Long-Duration, Edge Cases)

**Purpose:** Verify fix works under extreme conditions

**What to test:**
- Long-duration stability (30+ minutes)
- Resource limits (memory nearly full)
- Rapid state changes (pattern switching every 100ms)
- Thermal stability (monitor temperature)

**Example: 30-Minute Stability**
```cpp
TEST(Stability, 30MinuteAudioReactivity) {
  // Arrange: Live audio input, measure continuously
  uint32_t frame_count = 0;
  uint32_t crash_count = 0;
  uint32_t start_time = millis();

  // Monitoring
  struct {
    uint32_t fps_samples[180];  // 1 sample per 10 seconds = 180 samples in 30 min
    uint32_t memory_min, memory_max;
    uint32_t temp_min, temp_max;
    uint32_t race_condition_count;
  } telemetry = {0};

  // Act: Run for 30 minutes
  while (millis() - start_time < 30 * 60 * 1000) {
    // Render frame
    render_frame();
    frame_count++;

    // Every 10 seconds, record metrics
    if ((millis() - start_time) % 10000 == 0) {
      int sample_idx = (millis() - start_time) / 10000;
      telemetry.fps_samples[sample_idx] = get_current_fps();
      telemetry.memory_min = min(telemetry.memory_min, get_free_ram());
      telemetry.memory_max = max(telemetry.memory_max, get_used_ram());
      telemetry.temp_min = min(telemetry.temp_min, get_temp_c());
      telemetry.temp_max = max(telemetry.temp_max, get_temp_c());
    }

    // Detect crashes/hangs
    if (!is_device_responsive()) crash_count++;
  }

  // Assert: Stability metrics
  ASSERT_EQ(crash_count, 0);                     // No crashes
  ASSERT_GT(frame_count, 1800000);               // > 100 FPS for 30 min
  ASSERT_LT(telemetry.temp_max, 70);             // < 70°C
  ASSERT_GT(telemetry.memory_min, 50 * 1024);   // Never use > 50% RAM

  // Check FPS didn't degrade
  float fps_mean = average(telemetry.fps_samples, 180);
  ASSERT_GT(fps_mean, 150);
}
```

**Evidence standards:**
- ✓ Duration: minimum 30 minutes or 10,000+ iterations
- ✓ Continuous monitoring of multiple metrics
- ✓ Clear pass/fail criteria (no crashes, FPS stable, temp OK)
- ✓ Results logged for later analysis

---

## Test Documentation Template

Create file: `firmware/test/test_{fix_name}/TEST_STRATEGY.md`

```markdown
---
author: "embedded-firmware-engineer"
date: "2025-10-26"
intent: "Test strategy for Fix: {Fix Name}"
---

# Test Strategy: {Fix Name}

## Bottleneck Being Fixed
- **ID:** BOTTLENECK_{N}_{NAME}
- **File:Line:** {filename}:{line_number}
- **Severity:** {CRITICAL/HIGH}
- **Root Cause:** [From SUPREME analysis]

## What the Fix Does
[1 sentence explanation]

## Test Goals
- [ ] Verify normal operation works
- [ ] Verify error case is handled
- [ ] Verify no performance regression
- [ ] Verify fix eliminates the bottleneck

## Test Cases

### Test 1: Happy Path
**What:** Normal operation with valid inputs
**How:** [description]
**Evidence:** [what proves it works]
**PASS criteria:** [exact assertion]

### Test 2: Error Case
**What:** What happens when microphone disconnected / buffer full / timeout / etc.
**How:** [description]
**Evidence:** [what proves graceful handling]
**PASS criteria:** [exact assertion]

### Test 3: Stress
**What:** Long-duration, high-frequency, edge cases
**How:** [description]
**Duration:** [30 seconds / 30 minutes / 1M iterations]
**Evidence:** [what proves stability]
**PASS criteria:** [exact assertion]

## Success Criteria
- [ ] All 3+ test cases pass
- [ ] Code coverage ≥ 95% for fixed code
- [ ] No new memory leaks
- [ ] Performance meets targets (or documented regression accepted)
- [ ] No new compiler warnings

---
```

---

## Test Coverage Requirements

**By tier:**

| Tier | Min Coverage | Min Tests | Focus |
|------|-------------|-----------|-------|
| Tier 2 (Embedded) | ≥ 90% | 3+ per fix | Unit + Integration |
| Tier 3 (Quality) | ≥ 95% | 10+ total | Unit + Integration + Stress |
| Full system | ≥ 95% | 30+ total | All types + regression |

**Coverage measurement:**
```bash
# Generate coverage report
pio test -e esp32-s3-devkitc-1 --coverage

# Check specific file
gcov firmware/src/audio/microphone.cpp
```

---

## Test Naming Convention

```
test_{fix_name}.cpp

test_fix1_pattern_snapshots.cpp
test_fix2_i2s_timeout.cpp
test_fix3_mutex_timeout.cpp

Within file:
TEST({FixName}, {Behavior}) {
  // Example:
  // TEST(I2STimeout, NormalReadSuccess)
  // TEST(I2STimeout, TimeoutFallback)
  // TEST(I2STimeout, NoMemoryLeak)
}
```

---

## Test Failure Investigation

**When a test fails:**

1. **Isolate the failure:**
   - Does it fail every time (deterministic) or intermittent?
   - Does it fail on device or just in simulation?

2. **Investigate root cause:**
   - Add logging to understand state at failure
   - Check for race conditions (if multi-threaded)
   - Verify assumptions (is mock set up correctly?)

3. **Decide path forward:**
   - Is this a test isolation issue? (fix test)
   - Is this a real bug in implementation? (fix code)
   - Is this a known trade-off? (document as known issue)

4. **Document outcome:**
   - If test is fixed: document in TEST_STRATEGY.md
   - If code is fixed: update Implementation.plans/runbooks/
   - If known issue: document in backlog

---

## Integration with Multiplier Workflow

**Tier 2 (Embedded):**
- Create `firmware/test/test_{fix}/*.cpp` for each fix
- Create `firmware/test/test_{fix}/TEST_STRATEGY.md`
- Run locally: `pio test -e esp32-s3-devkitc-1`
- Ensure all pass before handoff to Tier 3

**Tier 3 (Code Reviewer):**
- Review test coverage (must be ≥ 95%)
- Verify each test matches a specific fix goal
- Verify assertions are quantified, not vague
- Report in `docs/reports/{PHASE}_test_summary.md`

---

## Reference

- Full details: **CLAUDE.md § Multiplier Workflow → Tier 2**
- Embedded engineer reference: **docs/resources/agent_quick_refs/embedded_firmware_engineer_cheatsheet.md**
- Code reviewer reference: **docs/resources/agent_quick_refs/code_reviewer_quality_validator_cheatsheet.md**

<!-- markdownlint-enable MD013 -->
