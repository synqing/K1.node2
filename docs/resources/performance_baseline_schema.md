<!-- markdownlint-disable MD013 -->

# Performance Baseline Schema & Registry

**Purpose:** Standardize performance metrics collection, storage, and comparison across all multiplier workflow phases.

**Maintained by:** Code Reviewer & Performance Profiler agents
**Update frequency:** After each phase completion
**Location:** `docs/reports/performance_baselines/`

---

## Why Standardized Metrics Matter

Without standardized metrics:
- Tier 1 discovers FPS = 25-37
- Tier 2 claims FPS improvement but doesn't measure same way
- Tier 3 reports different FPS (different test conditions, different device state)
- Nobody knows if fixes actually worked

With standardized metrics:
- SUPREME measures FPS with standard test
- Tier 2 measures same test → direct comparison
- Tier 3 validates improvement against baseline
- Multiplier system can prove 5-8x improvement

---

## Performance Baseline File Format

**Location per subsystem:**
```
docs/reports/performance_baselines/
  ├─ audio_pipeline_baseline.json
  ├─ led_pipeline_baseline.json
  ├─ pattern_rendering_baseline.json
  └─ system_overall_baseline.json
```

**File naming:** `{subsystem}_baseline.json`
**Format:** JSON (machine-readable + human-readable)
**Ownership:** Phase agent that measures (SUPREME for initial, Code Reviewer for after-fixes)

---

## JSON Schema

```json
{
  "baseline_id": "K1_AUDIO_PIPELINE_2025-10-26_PRE",
  "subsystem": "audio_pipeline",
  "phase": "tier_1_discovery",
  "timestamp": "2025-10-26T14:30:00Z",
  "device": {
    "model": "ESP32-S3-DevKitC-1",
    "cpu_freq_mhz": 240,
    "cores": 2,
    "ram_total_kb": 320,
    "flash_total_kb": 1966
  },
  "test_conditions": {
    "ambient_temperature_c": 22.5,
    "device_runtime_minutes": 5,
    "pattern_active": "Bass Pulse",
    "audio_input": "live_microphone",
    "audio_level_db": -6
  },
  "measurements": {
    "fps": {
      "min": 25,
      "max": 37,
      "mean": 31.2,
      "stddev": 3.8,
      "samples": 1000,
      "unit": "frames_per_second"
    },
    "audio_latency_ms": {
      "min": 32,
      "max": 40,
      "mean": 35.6,
      "stddev": 2.1,
      "samples": 500,
      "unit": "milliseconds",
      "definition": "time from microphone capture to LED color change"
    },
    "cpu_usage_percent": {
      "core_0": {
        "min": 35,
        "max": 45,
        "mean": 40.2,
        "unit": "percent"
      },
      "core_1": null
    },
    "memory_usage": {
      "ram_used_kb": 96.5,
      "ram_used_percent": 30.2,
      "flash_used_kb": 1057,
      "flash_used_percent": 53.8
    },
    "thermal": {
      "temperature_c": {
        "min": 48,
        "max": 52,
        "mean": 50.1,
        "unit": "celsius"
      }
    },
    "race_conditions": {
      "detected": true,
      "probability_per_frame_percent": 5.2,
      "method": "pattern_corruption_observation",
      "samples_observed": 47
    },
    "lag_spikes": {
      "detected": true,
      "count_per_minute": 3.2,
      "duration_ms": {
        "min": 50,
        "max": 100,
        "mean": 72
      },
      "cause": "mutex_timeout_failures"
    }
  },
  "derived_metrics": {
    "frame_time_ms": {
      "mean": 32.15,
      "explanation": "1000ms / 31.2 FPS"
    },
    "audio_to_visual_lag_ms": {
      "value": 35.6,
      "target": 20,
      "status": "FAIL_high_latency"
    }
  },
  "notes": [
    "Continuous [AUDIO] I2S read timeout messages observed - microphone appears non-functional",
    "Pattern tearing visible approximately once per 20 frames",
    "Lag spikes coincide with mutex timeout events in logs"
  ],
  "metadata": {
    "measured_by": "deep-technical-analyst-supreme",
    "measurement_tool": "serial_log_analysis + code_inspection",
    "confidence_score": 0.95,
    "issues": [
      "High variance in FPS suggests timing issues",
      "Audio latency doubles target (35.6ms vs 20ms target)"
    ]
  }
}
```

---

## Measurement Methods by Metric

### FPS (Frames Per Second)

**What it measures:** LED rendering speed
**Measurement method:** Count frame completions per second
**Where to get data:**
- From device serial output: `FPS: {number}`
- From test logs: count completed frames / test_duration_seconds
- From profiling: frame_completion_timestamps

**Collection:**
```bash
# Device output (real-time)
# Serial monitor shows: "FPS: 198.7"

# From code (in firmware):
Serial.printf("FPS: %.1f\n", calculated_fps);
```

**Duration:** Minimum 10 seconds (stable measurement)
**Reporting:**
- Min, Max, Mean, Stddev (not just single number)
- Sample count (how many measurements)

### Audio Latency

**What it measures:** Time from microphone input to LED response
**Definition:** Exact moment when audio capture begins → moment LED color changes
**Measurement method:**
1. Send test tone to microphone
2. Timestamp when tone detected in Goertzel FFT
3. Timestamp when LED color changes
4. Latency = LED timestamp - audio timestamp

**Collection (simulation):**
```cpp
// In audio task:
uint32_t audio_capture_time = micros();
// [... FFT processing ...]
float audio_level = get_audio_level();

// In pattern render:
uint32_t led_change_time = micros();
// [... LED color change ...]

// Latency = led_change_time - audio_capture_time
```

**Real measurement:**
- Play 1 kHz tone, measure output color in slow-motion video
- Count frames from tone start to color change
- Latency = frame_count / FPS * 1000

**Reporting:**
- Min, Max, Mean, Stddev across 500+ samples
- Any spikes (>50ms) documented separately

### CPU Usage

**What it measures:** Percentage of CPU time spent in different tasks
**Measurement method:**
- FreeRTOS task timing (vTaskGetRunTimeStats)
- Or: measure active microseconds / total elapsed microseconds

**Collection (FreeRTOS):**
```cpp
TaskStatus_t *pxTaskStatusArray = NULL;
volatile UBaseType_t uxArraySize = uxTaskGetNumberOfTasks();

pxTaskStatusArray = pvPortMalloc(uxArraySize * sizeof(TaskStatus_t));
UBaseType_t uxNumTasks = uxTaskGetSystemState(pxTaskStatusArray, uxArraySize, NULL);

for (UBaseType_t i = 0; i < uxNumTasks; i++) {
  uint32_t ulRunTime = pxTaskStatusArray[i].ulRunTimeCounter;
  uint32_t ulCoreNum = pxTaskStatusArray[i].xCoreID;
  // Log: Core {ulCoreNum}: {task name}: {ulRunTime}us
}

vPortFree(pxTaskStatusArray);
```

**Reporting:**
- Per-core breakdown (Core 0, Core 1)
- Min, Max, Mean percentages
- Core idle percentage (should be > 20% headroom)

### Memory Usage

**What it measures:** RAM and Flash consumption
**RAM:** Current allocated / total available (327.68 KB)
**Flash:** Firmware binary size / total available (1966 KB)

**Collection:**
```bash
# At compile time (Flash):
pio run --target size

# Output example:
# RAM:   [===       ]  29.4% (used 96488 bytes from 327680 bytes)
# Flash: [=====     ]  53.8% (used 1057457 bytes from 1966080 bytes)
```

**Reporting:**
- Absolute bytes used (not just percentages)
- Percentage of total
- Breakdown if possible (code, data, heap)

### Race Conditions / Visual Artifacts

**What it measures:** Data corruption from unsynchronized access
**Detection method:**
- Visual observation: pattern tearing, color glitches
- Statistical: run pattern 1 million frames, count artifacts
- Code inspection: grep for unsynchronized access

**Collection:**
```cpp
// Detect if audio buffer was modified while pattern reads it
uint32_t snapshot1[CHUNK_SIZE];
memcpy(snapshot1, current_audio, CHUNK_SIZE * sizeof(uint32_t));
// [process pattern]
uint32_t snapshot2[CHUNK_SIZE];
memcpy(snapshot2, current_audio, CHUNK_SIZE * sizeof(uint32_t));

if (memcmp(snapshot1, snapshot2, CHUNK_SIZE * sizeof(uint32_t)) != 0) {
  race_condition_count++;
}
```

**Reporting:**
- Probability per frame (race_count / total_frames)
- Observed count (how many times seen in test)
- Duration of test (confidence metric)

### Lag Spikes

**What it measures:** Temporary FPS drops or latency increases
**Detection method:** Watch for FPS < 150 or latency > 50ms
**Collection:**
- Monitor FPS frame-by-frame
- Any frame taking > 6.7ms (150 FPS) = lag spike
- Record duration and cause (if identifiable from logs)

**Reporting:**
- Spikes per minute (frequency)
- Duration range (min, max, mean)
- Correlation with events (mutex timeouts, WiFi, etc.)

---

## Baseline Comparison Template

Create this when comparing baseline vs. fixed version:

```json
{
  "comparison_id": "K1_AUDIO_PHASE_4_2025-10-26",
  "baseline_id": "K1_AUDIO_PIPELINE_2025-10-26_PRE",
  "measurement_id": "K1_AUDIO_PIPELINE_2025-10-26_POST",
  "phase": "tier_3_quality_validation",
  "improvements": {
    "fps": {
      "before": 31.2,
      "after": 204.6,
      "improvement_percent": 555,
      "improvement_factor": 6.55,
      "target": 150,
      "status": "EXCEEDED_TARGET"
    },
    "audio_latency_ms": {
      "before": 35.6,
      "after": 16.8,
      "improvement_percent": 52.8,
      "target": 20,
      "status": "MEETS_TARGET"
    },
    "race_conditions": {
      "before": {
        "detected": true,
        "probability_percent": 5.2
      },
      "after": {
        "detected": false,
        "probability_percent": 0
      },
      "improvement": "100% elimination",
      "status": "FIXED"
    },
    "lag_spikes": {
      "before": {
        "count_per_minute": 3.2,
        "duration_ms": 72
      },
      "after": {
        "count_per_minute": 0,
        "duration_ms": 0
      },
      "improvement": "100% elimination",
      "status": "FIXED"
    }
  },
  "resource_impact": {
    "memory_delta_kb": 4.8,
    "memory_delta_percent": 1.4,
    "memory_status": "OK",
    "thermal_delta_c": 2,
    "thermal_status": "OK"
  },
  "validation_summary": "All targets met or exceeded. 5.3-8.2x FPS improvement, 50% latency reduction, 100% elimination of race conditions and lag spikes.",
  "recommendation": "READY_FOR_DEPLOYMENT"
}
```

---

## Registry: Index of All Baselines

Create `docs/reports/performance_baselines/README.md`:

```markdown
# Performance Baselines Registry

| Baseline ID | Subsystem | Phase | Date | FPS | Latency (ms) | Status | Link |
|------------|-----------|-------|------|-----|-------------|--------|------|
| K1_AUDIO_PIPELINE_2025-10-26_PRE | audio_pipeline | Tier 1 | 2025-10-26 | 31.2 | 35.6 | baseline | audio_pipeline_baseline.json |
| K1_AUDIO_PIPELINE_2025-10-26_POST | audio_pipeline | Tier 3 | 2025-10-26 | 204.6 | 16.8 | validated | (comparison) |

---
```

---

## Integration with Multiplier Workflow

**Tier 1 (SUPREME):**
- Create initial baseline: `{subsystem}_baseline.json`
- Include in forensic analysis: "Current state: FPS {min}-{max}, Latency {ms}, Race condition probability {%}"

**Tier 2 (Embedded):**
- Measure after each fix
- Interim results in Implementation.plans/runbooks/
- DO NOT update official baseline yet

**Tier 3 (Code Reviewer):**
- Compare Tier 2 results against Tier 1 baseline
- Create comparison JSON
- Generate before/after metrics for quality report
- Update official baseline if all gates PASS

---

## Tools & Commands

```bash
# Collect memory metrics
cd firmware && pio run --target size

# Collect FPS (from device serial output)
# Parse "FPS: {number}" messages

# Python script to analyze baseline JSON:
python3 << 'EOF'
import json

with open('audio_pipeline_baseline.json') as f:
  baseline = json.load(f)

fps = baseline['measurements']['fps']
print(f"FPS: {fps['mean']:.1f} ± {fps['stddev']:.1f}")
print(f"  (range: {fps['min']}-{fps['max']})")

latency = baseline['measurements']['audio_latency_ms']
print(f"Audio Latency: {latency['mean']:.1f}ms (target: {latency.get('target', 'N/A')})")
EOF

# Compare two baselines
python3 << 'EOF'
import json

with open('audio_pipeline_baseline_before.json') as f:
  before = json.load(f)
with open('audio_pipeline_baseline_after.json') as f:
  after = json.load(f)

improvement = (after['measurements']['fps']['mean'] - before['measurements']['fps']['mean']) / before['measurements']['fps']['mean'] * 100
print(f"FPS improvement: {improvement:.1f}%")
EOF
```

---

## Reference

- **Multiplier Workflow integration:** CLAUDE.md § Multiplier Workflow
- **Tier 3 exit criteria:** CLAUDE.md § Multiplier Workflow → Tier 3
- **Code review template:** docs/resources/agent_quick_refs/code_reviewer_quality_validator_cheatsheet.md

<!-- markdownlint-enable MD013 -->
