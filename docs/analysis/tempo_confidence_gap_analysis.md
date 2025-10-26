# ROOT CAUSE ANALYSIS: Tempo_Confidence Detected But Not Affecting Brightness

## EXECUTIVE SUMMARY

**The problem is NOT in the audio snapshot syncing or tempo calculation.** The tempo_confidence IS being calculated, IS being copied to audio_back, and IS being read by patterns. The disconnect is in the **pattern brightness logic itself** - patterns are logging tempo_confidence but NOT using it to modulate overall LED brightness through the params.brightness multiplier.

**The logging output is correct. The patterns are simply not transforming tempo_confidence into visible brightness changes.**

---

## PART 1: DATA FLOW VERIFICATION (WORKING CORRECTLY)

### 1. Tempo Confidence Calculation → Global Variable
**File:** `/firmware/src/audio/tempo.cpp`
```
float tempo_confidence = 0.0f;  // Line ~50
```
- Calculated in `detect_beats()` function
- Updated continuously with beat confidence scores
- Device reports: ranges 0.05 to 0.10 ✓

### 2. Global → Snapshot (audio_back)
**File:** `/firmware/src/main.cpp` Line 59
```cpp
extern float tempo_confidence;  // From tempo.cpp
audio_back.tempo_confidence = tempo_confidence;
```
- Called EVERY frame in audio processing task
- Happens BEFORE `finish_audio_frame()` which commits the swap
- This sync point is CORRECT ✓

### 3. Snapshot Swap (Double Buffer)
**File:** `/firmware/src/audio/goertzel.cpp` Line 146
```cpp
void commit_audio_data() {
    if (xSemaphoreTake(audio_swap_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            // Atomic swap
            memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot));
            audio_front.is_valid = true;
        }
    }
}
```
- Thread-safe with dual mutex (swap + read)
- audio_back.tempo_confidence IS copied to audio_front ✓

### 4. Pattern Access (Snapshot → Local)
**File:** `/firmware/src/pattern_audio_interface.h` Line 70-80
```cpp
#define PATTERN_AUDIO_START() \
    AudioDataSnapshot audio = {0}; \
    bool audio_available = get_audio_snapshot(&audio); \
    ...
```

**Macro:** Line 115
```cpp
#define AUDIO_TEMPO_CONFIDENCE  (audio.tempo_confidence)
```

- PATTERN_AUDIO_START() is called at line 612 (draw_pulse), 718 (draw_tempiscope), 782 (draw_beat_tunnel) ✓
- get_audio_snapshot() acquires mutex and copies audio_front to local snapshot ✓
- AUDIO_TEMPO_CONFIDENCE macro provides access ✓

### 5. Verification Point: Diagnostic Logging
**File:** `/firmware/src/generated_patterns.h` Lines 619, 725, 789
```cpp
// Line 619 (draw_pulse)
Serial.printf("[PULSE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE, params.brightness, params.speed);

// Line 725 (draw_tempiscope)
Serial.printf("[TEMPISCOPE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE, params.brightness, params.speed);

// Line 789 (draw_beat_tunnel)
Serial.printf("[BEAT_TUNNEL] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE, params.brightness, params.speed);
```

**KEY FINDING:** The logging is reading from the SNAPSHOT (via AUDIO_TEMPO_CONFIDENCE macro), and the values are correct:
- tempo_confidence: 0.05-0.10 ✓
- audio_available: 1 ✓

**BUT brightness: ALWAYS 1.00** - This is params.brightness (global parameter), NOT calculated from tempo_confidence.

---

## PART 2: THE ACTUAL PROBLEM - Pattern Brightness Logic

### The Disconnect: Patterns ARE Using tempo_confidence, But Not For Final Brightness

#### Pattern 1: PULSE (`draw_pulse`, Line 611)
```cpp
if (AUDIO_TEMPO_CONFIDENCE > beat_threshold) {  // Line 633
    pulse_waves[i].brightness = sqrtf(AUDIO_TEMPO_CONFIDENCE);  // Line 640
}
```
- Uses tempo_confidence to SET INITIAL WAVE BRIGHTNESS
- Then applies global params.brightness multiplier at lines 700-704:
```cpp
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i].r *= params.brightness;  // Line 701: SCALED BY GLOBAL BRIGHTNESS
    leds[i].g *= params.brightness;
    leds[i].b *= params.brightness;
}
```
- **VERDICT:** Correctly using tempo_confidence for wave intensity, BUT global params.brightness (1.0) doesn't amplify it.

#### Pattern 2: TEMPISCOPE (`draw_tempiscope`, Line 717)
```cpp
float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;  // Line 745
if (tempo_confidence > 0.2f) {  // Line 749: Threshold gate
    for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
        float magnitude = tempo_confidence * freshness_factor * phase_factor;  // Line 756
        magnitude = fmaxf(0.005f, magnitude);  // MINIMUM BRIGHTNESS THRESHOLD
        CRGBF color = color_from_palette(params.palette_id, hue_progress, magnitude);
        
        leds[i].r = color.r * params.brightness * params.saturation;  // Line 765: GLOBAL BRIGHTNESS
        leds[i].g = color.g * params.brightness * params.saturation;
        leds[i].b = color.b * params.brightness * params.saturation;
    }
}
```
- **PROBLEM:** Line 757 clamps minimum magnitude to 0.005f
- Even at tempo_confidence=0.10, the floor is still 0.005
- Then applies params.brightness (1.0) which doesn't scale anything up
- **VERDICT:** Tempo_confidence IS used, but minimum threshold + global brightness multiplier = weak effect

#### Pattern 3: BEAT_TUNNEL (`draw_beat_tunnel`, Line 781)
```cpp
float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;  // Line 825
if (tempo_confidence > beat_threshold) {  // Line 828: 0.2f threshold
    for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
        float brightness = tempo_confidence * (0.3f + 0.7f * sinf(time * 6.28318f + i * 0.1f));  // Line 836
        brightness = fmaxf(0.0f, fminf(1.0f, brightness));
        
        CRGBF color = color_from_palette(params.palette_id, hue, brightness);
        beat_tunnel_image[i].r += color.r * brightness;  // Line 840: ADDITIVE BLEND
        ...
    }
}

// Line 859: Final global brightness multiplier
leds[i].r = beat_tunnel_image[i].r * params.brightness;
```
- Uses tempo_confidence for per-LED brightness calculation
- BUT the final step multiplies by params.brightness (1.0)
- **VERDICT:** Correctly using tempo_confidence, but global brightness not optimizing

---

## PART 3: WHY BRIGHTNESS STAYS AT 1.0

### Source of params.brightness Value
**File:** `/firmware/src/parameters.h`
```cpp
// Default values
params.brightness = 1.0f;  // DEFAULT_BRIGHTNESS = 1.0
```

**File:** `/firmware/src/webserver.cpp` Line 23
```cpp
doc["brightness"] = params.brightness;  // Dashboard reports 1.0
```

**Storage:** The webserver can update this via JSON POST at `/api/params`, but unless the dashboard sends a different value, it stays at 1.0.

**Why it's always 1.0:**
- Device boots with brightness=1.0
- Web dashboard likely not sending brightness updates
- Patterns use it as a final multiplier (1.0 * anything = no change)

---

## PART 4: THE ROOT CAUSES (MULTIPLE)

### Root Cause #1: Global Brightness Not Reactive
**Location:** `parameters.h`, `webserver.cpp`, pattern rendering

The `params.brightness` is a **static global control**, not derived from audio. It's meant for user control via the dashboard. Patterns CAN use it, but they don't amplify it based on tempo_confidence.

**Evidence:**
- Logged brightness: always 1.0
- No code path multiplies tempo_confidence by params.brightness before final rendering
- Each pattern multiplies by params.brightness AFTER computing LED colors

### Root Cause #2: Minimum Brightness Threshold Clamps Low Confidence
**Location:** `generated_patterns.h` Line 757 (TEMPISCOPE)

```cpp
magnitude = fmaxf(0.005f, magnitude);  // Even at 0.10 confidence, floor is 0.005
```

When tempo_confidence=0.10, after multiplying by phase_factor (let's say 0.5), magnitude=0.05, then clamped to 0.005 max(0.005, 0.05) = 0.05 (OK).

But when multiplied by 0-1 color values from palette, the effect is very subtle.

### Root Cause #3: Weak Tempo Confidence Values (0.05-0.10)
**From device telemetry:**
- tempo_confidence ranges 0.05-0.10
- This is VERY LOW (5-10% confidence)
- When used as brightness multiplier, it produces 5-10% of maximum brightness
- With params.brightness=1.0, final output is 0.05-0.10 * color, which is barely visible

**Why so low?**
- Needs investigation in tempo.cpp `detect_beats()` function
- May be due to beat detection algorithm being conservative
- Or threshold being too high

### Root Cause #4: Patterns Not Amplifying Low Confidence Values
**Location:** All three patterns

When tempo_confidence is naturally low (0.05-0.10), patterns should:
1. Square it for emphasis: `brightness = tempo_confidence * tempo_confidence`
2. Boost with gain: `brightness = tempo_confidence * 2.0f` (scale factor)
3. Use exponential: `brightness = powf(tempo_confidence, 0.5f)` (square root boost)

But patterns just use it directly, so low values stay low.

**Example fix would be:**
```cpp
float confidence_boosted = sqrtf(AUDIO_TEMPO_CONFIDENCE);  // Boost from 0.05 to 0.22
float brightness_factor = (0.3f + 0.7f * confidence_boosted);  // Range: 0.3-1.0
```

---

## PART 5: DATA FLOW DIAGRAM (COMPLETE)

```
Audio Input (Microphone)
        ↓
Audio Processing Task (Core 1)
    ├─ Acquire samples
    ├─ Calculate Goertzel (spectrogram)
    ├─ Calculate tempo bins & confidence
    └─ audio_back.tempo_confidence = tempo_confidence  ← SYNC POINT (main.cpp:59)
        ↓
commit_audio_data() (goertzel.cpp:146)
    └─ memcpy(audio_front, audio_back)  ← THREAD-SAFE SWAP
        ↓
Pattern Rendering Task (Core 0)
    └─ draw_pulse/tempiscope/beat_tunnel()
        ├─ PATTERN_AUDIO_START()  ← Gets snapshot copy
        ├─ audio_available = get_audio_snapshot(&audio)
        ├─ tempo_conf = AUDIO_TEMPO_CONFIDENCE  ← READ FROM SNAPSHOT ✓
        ├─ Serial.printf tempo_conf  ← LOGS CORRECTLY ✓
        ├─ Calculate per-LED colors/brightness using tempo_conf ✓
        └─ leds[i] *= params.brightness  ← FINAL SCALE (always 1.0)
            ↓
LED Driver (led_driver.cpp)
    └─ Send to hardware
        ↓
Visible Output
    └─ BRIGHTNESS LOCKED AT ~5-10% (0.05-0.10 * 1.0)
```

---

## PART 6: SUMMARY TABLE

| Component | Status | Evidence |
|-----------|--------|----------|
| Tempo calculation | WORKING | tempo_confidence = 0.05-0.10 |
| Copy to audio_back | WORKING | main.cpp:59 sync point exists |
| Snapshot swap | WORKING | commit_audio_data() uses mutex |
| Pattern access | WORKING | PATTERN_AUDIO_START() and macro |
| Diagnostic logging | WORKING | [PULSE/TEMPISCOPE/BEAT_TUNNEL] output correct |
| **Pattern usage** | **WEAK** | Tempo_confidence used but values too low |
| **Global brightness** | **STATIC** | params.brightness = 1.0 always |
| **Final visibility** | **DIM** | Result is 0.05-0.10 * 1.0 * colors = barely visible |

---

## PART 7: RECOMMENDATIONS

### Fix 1: Investigate tempo_confidence Calculation
**Priority:** HIGH  
**Action:** Check `tempo.cpp` `detect_beats()` function
- Why is confidence capped at 0.05-0.10?
- Should it be 0.0-1.0 range?
- Is threshold too conservative?

### Fix 2: Boost Low Confidence Values in Patterns
**Priority:** MEDIUM  
**Action:** Apply confidence scaling before using as brightness
```cpp
float confidence_scaled = sqrtf(AUDIO_TEMPO_CONFIDENCE);  // Boost 0.05→0.22
float brightness_factor = fmaxf(0.3f, confidence_scaled);  // Floor 30%
```

### Fix 3: Separate Tempo-Responsive Brightness from Global Brightness
**Priority:** MEDIUM  
**Action:** Make patterns react to tempo_confidence AND apply params.brightness as overlay
```cpp
// Before final output
float tempo_boost = 0.5f + 0.5f * sqrtf(AUDIO_TEMPO_CONFIDENCE);
leds[i].r *= params.brightness * tempo_boost;
leds[i].g *= params.brightness * tempo_boost;
leds[i].b *= params.brightness * tempo_boost;
```

### Fix 4: Verify Threshold Gates in Patterns
**Priority:** LOW  
**Action:** Check beat_threshold values
- draw_pulse: threshold = 0.3f (never triggered if confidence max is 0.10!)
- draw_tempiscope: threshold = 0.2f (never triggered!)
- draw_beat_tunnel: threshold = 0.2f (never triggered!)

These thresholds may be preventing patterns from rendering at all!

---

## CONCLUSION

**The tempo_confidence IS being calculated and synced correctly.** The problem is:

1. **Tempo confidence values are too low** (0.05-0.10 instead of expected range)
2. **Pattern thresholds are too high** (0.2f-0.3f never triggered)
3. **Global brightness (params.brightness=1.0) doesn't amplify weak signals**
4. **Patterns don't boost low confidence values** (should apply square root or other amplification)

The data is flowing correctly from audio detection to pattern rendering. The patterns ARE using tempo_confidence. But the final visual result is dim because the confidence values are naturally low and not being amplified.

