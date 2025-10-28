---
title: Tempo Confidence: Key Code Locations & Data Flow
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Tempo Confidence: Key Code Locations & Data Flow

## FILE LOCATIONS REFERENCE

### Audio Data Pipeline

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Tempo confidence global | `audio/tempo.cpp` | ~50 | `float tempo_confidence = 0.0f` |
| Tempo calculation | `audio/tempo.cpp` | detect_beats() | Calculates beat confidence |
| Audio snapshot struct | `audio/goertzel.h` | 87-113 | AudioDataSnapshot definition |
| Double buffer (front/back) | `audio/goertzel.h` | 161-164 | Extern declarations |
| Sync tempo to snapshot | `main.cpp` | 59 | `audio_back.tempo_confidence = tempo_confidence` |
| Commit/swap | `audio/goertzel.cpp` | 146-187 | `commit_audio_data()` function |

### Pattern Access & Logging

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Audio interface macros | `pattern_audio_interface.h` | 70-115 | PATTERN_AUDIO_START(), AUDIO_TEMPO_CONFIDENCE |
| Pulse pattern | `generated_patterns.h` | 611-705 | draw_pulse() function |
| Tempiscope pattern | `generated_patterns.h` | 717-770 | draw_tempiscope() function |
| Beat Tunnel pattern | `generated_patterns.h` | 781-868 | draw_beat_tunnel() function |

---

## DETAILED CODE FLOW

### 1. CALCULATION → GLOBAL
```
File: audio/tempo.cpp
Function: detect_beats()
Output: float tempo_confidence (global)
Range: 0.05-0.10 (observed)
```

### 2. GLOBAL → SNAPSHOT.tempo_confidence
```
File: main.cpp (line 59)
extern float tempo_confidence;
audio_back.tempo_confidence = tempo_confidence;
```

**Key point:** This happens in audio processing task BEFORE finish_audio_frame()

### 3. SNAPSHOT SWAP (Double Buffer)
```
File: audio/goertzel.cpp line 146
void commit_audio_data() {
    memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot));
    audio_front.is_valid = true;
}
```

**Thread safety:** Protected by dual mutex (swap_mutex + read_mutex)

### 4. PATTERN → GET SNAPSHOT
```
File: pattern_audio_interface.h line 70
PATTERN_AUDIO_START() macro:
    AudioDataSnapshot audio = {0};
    bool audio_available = get_audio_snapshot(&audio);
    
    (Creates local snapshot with tempo_confidence copied from audio_front)
```

### 5. PATTERN → READ VALUE
```
File: pattern_audio_interface.h line 115
#define AUDIO_TEMPO_CONFIDENCE  (audio.tempo_confidence)

Usage in patterns:
    float conf = AUDIO_TEMPO_CONFIDENCE;
    Serial.printf("[PATTERN] tempo_confidence=%.2f\n", AUDIO_TEMPO_CONFIDENCE);
```

---

## PATTERN IMPLEMENTATIONS

### Pattern 1: PULSE

**File:** `firmware/src/generated_patterns.h` Lines 611-705

**Data flow:**
```
Line 612:   PATTERN_AUDIO_START();  ← Get snapshot
Line 633:   if (AUDIO_TEMPO_CONFIDENCE > beat_threshold)  ← Read macro
Line 640:   pulse_waves[i].brightness = sqrtf(AUDIO_TEMPO_CONFIDENCE);  ← Use value
Line 619:   Serial.printf(...AUDIO_TEMPO_CONFIDENCE...);  ← Log it
Line 700-704: leds[i] *= params.brightness;  ← Final scaling (always 1.0)
```

**Problem:** Line 633 threshold (0.3f) > max confidence (0.10)

### Pattern 2: TEMPISCOPE

**File:** `firmware/src/generated_patterns.h` Lines 717-770

**Data flow:**
```
Line 718:   PATTERN_AUDIO_START();  ← Get snapshot
Line 745:   float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;  ← Read macro
Line 749:   if (tempo_confidence > 0.2f)  ← Check threshold
Line 756:   float magnitude = tempo_confidence * freshness_factor * phase_factor;
Line 757:   magnitude = fmaxf(0.005f, magnitude);  ← Minimum clamp
Line 765:   leds[i].r = color.r * params.brightness * params.saturation;
Line 725:   Serial.printf(...AUDIO_TEMPO_CONFIDENCE...);  ← Log it
```

**Problems:**
- Line 749 threshold (0.2f) > max confidence (0.10)
- Line 757 minimum floor (0.005) too low for visual impact

### Pattern 3: BEAT TUNNEL

**File:** `firmware/src/generated_patterns.h` Lines 781-868

**Data flow:**
```
Line 782:   PATTERN_AUDIO_START();  ← Get snapshot
Line 825:   float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;  ← Read macro
Line 828:   if (tempo_confidence > beat_threshold)  ← Check threshold
Line 836:   float brightness = tempo_confidence * (0.3f + 0.7f * sinf(...));
Line 859:   leds[i].r = beat_tunnel_image[i].r * params.brightness;  ← Scale
Line 789:   Serial.printf(...AUDIO_TEMPO_CONFIDENCE...);  ← Log it
```

**Problems:**
- Line 828 threshold (0.2f) > max confidence (0.10)
- Values not amplified, used directly

---

## GLOBAL BRIGHTNESS (Static Control)

**File:** `firmware/src/parameters.h`
```cpp
PatternParameters params;
params.brightness = 1.0f;  // DEFAULT - never changes from code
```

**File:** `firmware/src/webserver.cpp` Line 23
```cpp
doc["brightness"] = params.brightness;  // Returns 1.0
```

**Updated by:** REST API endpoint `/api/params` (JSON POST)

**Used in patterns:** As final multiplier after all brightness calculations

---

## DIAGNOSTIC LOGGING

All three patterns log once per second:

```cpp
Serial.printf("[PATTERN_NAME] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE, params.brightness, params.speed);
```

**Expected output:**
```
[PULSE] audio_available=1, tempo_confidence=0.07, brightness=1.00, speed=0.50
[TEMPISCOPE] audio_available=1, tempo_confidence=0.08, brightness=1.00, speed=0.50
[BEAT_TUNNEL] audio_available=1, tempo_confidence=0.06, brightness=1.00, speed=0.50
```

**Verification:** Logging reads from SNAPSHOT (via AUDIO_TEMPO_CONFIDENCE macro), so values are CORRECT.

---

## THRESHOLD ANALYSIS

### Current Thresholds (Too High)

| Pattern | Threshold | Location | Max Reported | Problem |
|---------|-----------|----------|--------------|---------|
| Pulse | 0.3f | L633 | 0.10 | Never triggers |
| Tempiscope | 0.2f | L749 | 0.10 | Never triggers |
| Beat Tunnel | 0.2f | L828 | 0.10 | Never triggers |

**Result:** Patterns may not render audio-reactive content at all

### Fixed Thresholds (Proposed)

| Pattern | New Threshold | Rationale |
|---------|---|---|
| Pulse | 0.05f | Lower than min observed |
| Tempiscope | 0.05f | Lower than min observed |
| Beat Tunnel | 0.05f | Lower than min observed |

**Benefit:** Patterns will render with current confidence levels

---

## AMPLIFICATION ANALYSIS

### Current Approach (Direct Use)
```
0.05 confidence → 0.05 brightness (5%)
0.10 confidence → 0.10 brightness (10%)
```

### Proposed Approach (Square Root + Scale)
```
0.05 confidence → sqrt(0.05) * 2.0 = 0.44 brightness (44%)
0.10 confidence → sqrt(0.10) * 2.0 = 0.63 brightness (63%)
```

**Benefit:** 4-6x brightness improvement with same input values

---

## CALL STACK FOR DEBUGGING

When pattern renders:
```
draw_pulse()  [generated_patterns.h:611]
    ↓
PATTERN_AUDIO_START() macro  [pattern_audio_interface.h:70]
    ↓
get_audio_snapshot(&audio)  [goertzel.cpp]
    ↓
xSemaphoreTake(audio_read_mutex)  [thread-safe copy]
    ↓
memcpy(snapshot, audio_front, sizeof(AudioDataSnapshot))
    ↓
AUDIO_TEMPO_CONFIDENCE macro  [pattern_audio_interface.h:115]
    ↓
audio.tempo_confidence  [local snapshot member]
```

**Key point:** Each level reads from the layer below. If any link breaks, patterns won't see tempo data.

---

## VERIFICATION POINTS

To verify data flow is working:

### 1. Tempo calculation (audio/tempo.cpp)
```cpp
if (actual_confidence_value > expected_max) {
    // Something is wrong with calculation
}
```

### 2. Snapshot population (main.cpp line 59)
```cpp
Serial.printf("[SYNC] audio_back.tempo_confidence = %.2f\n", audio_back.tempo_confidence);
// Should log same values as tempo.cpp calculation
```

### 3. Snapshot swap (audio/goertzel.cpp line 156)
```cpp
// After memcpy
Serial.printf("[SWAP] audio_front.tempo_confidence = %.2f\n", audio_front.tempo_confidence);
// Should match audio_back
```

### 4. Pattern access (generated_patterns.h line 619)
```cpp
Serial.printf("[PULSE] ...AUDIO_TEMPO_CONFIDENCE...);
// Should match audio_front (proves snapshot working)
```

---

## SUMMARY

- **Calculation:** Working (0.05-0.10 range confirmed)
- **Sync point:** Working (main.cpp:59 copies before swap)
- **Snapshot:** Working (thread-safe double-buffering)
- **Pattern access:** Working (macro provides correct values)
- **Logging:** Working (displays correct values every second)
- **Thresholds:** BROKEN (0.2-0.3f never triggered)
- **Amplification:** WEAK (values used directly, not boosted)
- **Final brightness:** DIM (5-10% due to low confidence * 1.0 global brightness)

