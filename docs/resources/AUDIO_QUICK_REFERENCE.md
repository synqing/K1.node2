# Audio Integration Quick Reference

**Companion to:**
- AUDIO_INTEGRATION_ARCHITECTURE.md (main design document)
- AUDIO_IMPLEMENTATION_TEMPLATES.md (code templates)

---

## Hardware Pinout Summary

### ESP32-S3 DevKit to SPH0645 Microphone

```
ESP32-S3 DEVKIT            SPH0645 MEMS MICROPHONE
─────────────────          ──────────────────────────

GPIO 14 (BCLK) ────────→ CLK   (Bit Clock)
GPIO 12 (WS)   ────────→ LRCL  (Left/Right Clock)
GPIO 13 (SD)   ←────────  OUT   (Data Out)

3.3V Power ─────────────→ VCC   (Power)
GND ─────────────────────→ GND   (Ground)
GND ─────────────────────→ SEL   (Channel Select - grounded = RIGHT channel)

3.3V ─┬─ 0.1µF Capacitor ─→ GND  (Decoupling capacitor)
      └─ (Optional pull-up)
```

---

## Audio Signal Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AUDIO ACQUISITION (Core 0)                                  │
├─────────────────────────────────────────────────────────────┤

SPH0645 Microphone (analog signal 50 Hz - 20 kHz)
      │
      ├─ I2S RX at 12,800 Hz (12-bit effective, 32-bit aligned)
      │  [Interrupt fires every 5 ms for 64-sample chunks]
      │
      ├─ SAMPLE ACQUISITION TASK
      │  ├─ Convert 32-bit raw → 18-bit signed integer
      │  ├─ Apply DC offset calibration: value = ((raw >> 14) + 7000) - 360
      │  ├─ Normalize to float [-1.0, 1.0]
      │  └─ Pre-process:
      │     ├─ DC blocker (single-pole highpass, α=0.995)
      │     └─ RMS normalization
      │
      ├─ CIRCULAR BUFFER (4096 samples, 320 ms @ 12.8 kHz)
      │  └─ Ring buffer updated by I2S task
      │
      ├─ AUDIO ANALYSIS TASK (50 Hz)
      │  ├─ Read buffer segments for Goertzel
      │  ├─ Compute 64 spectral bins (55 Hz - 7.04 kHz)
      │  ├─ Compute novelty curve from spectral energy
      │  ├─ Apply Goertzel to novelty curve → 64 tempo bins
      │  └─ Update beat phase tracking
      │
      └─ SHARED AUDIO STATE (atomic updates)
         ├─ spectrogram[64]        → Frequency spectrum
         ├─ spectrogram_smooth[64] → Smoothed spectrum (moving average)
         ├─ chromagram[12]         → Pitch class energy
         ├─ tempi[64]              → Beat detection (magnitude + phase)
         ├─ tempi_smooth[64]       → Smoothed beat magnitudes
         ├─ audio_level            → Overall RMS
         └─ update_counter         → Synchronization flag

┌─────────────────────────────────────────────────────────────┐
│ LED RENDERING (Core 1)                                      │
├─────────────────────────────────────────────────────────────┤

MAIN LOOP @ 60 FPS
      │
      ├─ Audio State Read (atomic)
      │  └─ Copy all globals from Core 0 (memcpy)
      │
      ├─ Pattern Computation
      │  ├─ Use spectrogram[64] for frequency reactivity
      │  ├─ Use tempi[BEAT_BIN].beat for beat sync
      │  ├─ Use chromagram[12] for pitch-aware effects
      │  └─ Compute LED colors for all 60 pixels
      │
      ├─ LED Transmission (RMT)
      │  └─ Send WS2812B data via GPIO 15
      │
      └─ FPS Tracking & Serial Output

```

---

## Data Structure Reference

### tempo struct (from tempo.h)

```cpp
struct {
    float magnitude;                    // 0.0 - 1.0 (normalized)
    float magnitude_full_scale;         // Raw magnitude (>1.0 possible)
    float magnitude_smooth;             // Exponential moving average
    float beat;                         // sin(phase), -1.0 to 1.0
    float phase;                        // Radians, -π to π
    bool phase_inverted;                // Beat direction flag

    // Configuration (set once at init)
    float target_tempo_hz;              // Target BPM converted to Hz
    uint16_t block_size;                // Analysis window length
    float window_step;                  // Window function stride
    float coeff;                        // Goertzel coefficient
    float cosine, sine;                 // Phase calculation
    float phase_radians_per_reference_frame;  // Phase update rate
};
```

### freq struct (from goertzel.h)

```cpp
struct {
    float magnitude;                    // 0.0 - 1.0 (normalized)
    float magnitude_full_scale;         // Raw magnitude
    float magnitude_last;               // Previous frame (for novelty)
    float novelty;                      // Energy increase

    // Configuration (set once at init)
    float target_freq;                  // Center frequency in Hz
    uint16_t block_size;                // Analysis window
    float window_step;                  // Window stride
    float coeff;                        // Goertzel coefficient
};
```

---

## Common Audio Patterns

### Pattern: Beat-Synchronized Animation

```cpp
// In generated effect code:

void draw_beat_effect(float time, const PatternParameters& params) {
    // Find tempo bin closest to 120 BPM
    static uint16_t beat_bin = find_closest_tempo_bin(120.0f);

    // Get beat amplitude (0.0 - 1.0)
    float beat_power = max(0.0f, tempi[beat_bin].beat);
    float beat_magnitude = tempi[beat_bin].magnitude;

    // Create envelope: ramps down between beats
    float beat_envelope = beat_power * beat_magnitude;

    // Apply to all LEDs
    for (int i = 0; i < NUM_LEDS; i++) {
        // Base color
        CRGBF color = CRGBF(0.2f, 0.5f, 1.0f);

        // Brighten on beat
        color *= (1.0f + beat_envelope * 2.0f);

        leds[i] = color;
    }
}
```

### Pattern: Frequency-Responsive Effect

```cpp
// Map 64 frequency bins to RGB spectrum

void draw_spectrum_effect(float time, const PatternParameters& params) {
    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED index to frequency bin
        int freq_bin = (i * NUM_FREQS) / NUM_LEDS;

        // Get smoothed spectrum magnitude
        float magnitude = spectrogram_smooth[freq_bin];

        // Convert frequency to hue (HSV color model)
        float hue = (float)freq_bin / NUM_FREQS;  // 0.0 - 1.0

        // Create HSV color
        CHSV hsv_color(hue * 255, 255, magnitude * 255);
        leds[i] = hsv_color;
    }
}
```

### Pattern: Pitch-Class Harmony

```cpp
// Use chromagram to create pitch-aware effects

void draw_chroma_effect(float time, const PatternParameters& params) {
    // Get dominant pitch class
    float max_chroma = 0.0f;
    int dominant_pitch = 0;
    for (int p = 0; p < 12; p++) {
        if (chromagram[p] > max_chroma) {
            max_chroma = chromagram[p];
            dominant_pitch = p;
        }
    }

    // Pitch class colors (chromatic scale)
    const CRGBF pitch_colors[12] = {
        CRGBF(1.0, 0.0, 0.0),  // C = Red
        CRGBF(1.0, 0.5, 0.0),  // C#
        CRGBF(1.0, 1.0, 0.0),  // D = Yellow
        // ... etc for all 12 semitones
    };

    CRGBF base_color = pitch_colors[dominant_pitch];

    // Apply to all LEDs with magnitude envelope
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = base_color * max_chroma;
    }
}
```

---

## Troubleshooting Guide

### Problem: I2S Not Starting

**Symptoms:** "I2S channel created" appears in serial, but no "I2S channel enabled"

**Diagnosis:**
```cpp
// Add to main.cpp setup()
esp_err_t ret = i2s_manager_init();
Serial.printf("I2S init result: %s\n", esp_err_to_name(ret));
```

**Root Causes:**
1. **PIN CONFLICT**: GPIO 12, 13, 14 used elsewhere
   - Check led_driver.h for LED pin assignments
   - Verify no SPI/UART on conflicting pins

2. **DRIVER NOT READY**: ESP-IDF version mismatch
   - Required: ESP-IDF 5.0+ (with esp32-s3-devkitc-1)
   - Check: `pio run --verbose` for compiler flags

3. **MEMORY INSUFFICIENT**: Stack too small for I2S task
   - Increase stack: 2048 → 4096 in xTaskCreatePinnedToCore

### Problem: No Audio Data (Buffer Not Filling)

**Symptoms:** sample_buffer.write_idx stays at 0

**Diagnosis:**
```cpp
// Verify I2S ISR is firing
esp_log_level_set("I2S", ESP_LOG_DEBUG);

// Check total samples counter
Serial.printf("Total samples acquired: %lu\n", sample_buffer_get_total());

// Check for I2S errors
i2s_manager_print_status();
```

**Root Causes:**
1. **SPH0645 NOT CONNECTED**: No clock on BCLK
   - Verify 3.3V power at VCC pin
   - Use oscilloscope: BCLK should see 409.6 kHz clock
   - Check SEL is tied to GND (not floating)

2. **WRONG MICROPHONE CHANNEL**: Using LEFT instead of RIGHT
   - SPH0645 outputs on RIGHT channel when SEL=GND
   - Check `slot_mask = I2S_STD_SLOT_RIGHT` in i2s_manager.cpp

3. **DC OFFSET NOT CALIBRATED**: All samples reading as 0 or max
   - Look for: `((raw >> 14) + 7000) - 360` adjustment
   - May need to tweak the 7000 and 360 values empirically

### Problem: Spectrum Is Flat (All Zeros)

**Symptoms:** spectrogram[i] shows 0.0 for all 64 bins

**Diagnosis:**
```cpp
// Check raw audio samples
float raw_chunk[64];
sample_buffer_read_at_offset(raw_chunk, 64, 0);

Serial.print("Raw samples: ");
for (int i = 0; i < 8; i++) {
    Serial.printf("%.4f ", raw_chunk[i]);
}
Serial.println();
```

**Root Causes:**
1. **AUDIO GAIN TOO LOW**: Samples all close to DC offset
   - Verify microphone sees sound (>40 dB SPL)
   - Check VCC voltage is 3.3V (not 5V)

2. **SAMPLE BUFFER FULL OF SILENCE**: Very quiet signal
   - Test by clapping near microphone
   - Serial output should show magnitude changes

3. **GOERTZEL NOT INITIALIZED**: block_size = 0
   - Verify `init_goertzel_constants_musical()` called in setup()
   - Check frequencies_musical[] is populated

### Problem: Beat Detection Not Working (All Zeros)

**Symptoms:** tempi[i].magnitude = 0.0, no beat detection

**Diagnosis:**
```cpp
// Check novelty curve is updating
Serial.printf("Novelty[%d]: %.3f\n", NOVELTY_HISTORY_LENGTH-1,
              novelty_curve_normalized[NOVELTY_HISTORY_LENGTH-1]);

// Check tempo initialization
Serial.printf("Tempo 0 target: %.2f Hz, block_size: %d\n",
              tempi_bpm_values_hz[0], tempi[0].block_size);
```

**Root Causes:**
1. **NOVELTY CURVE EMPTY**: Spectrum analysis not running
   - Verify `update_novelty()` called at 50 Hz
   - Check `t_now_us` global is being updated (from main loop)

2. **FREQUENCY BINS ARE ZERO**: Goertzel computation failed
   - See "Spectrum Is Flat" troubleshooting above

3. **AUDIO TOO QUIET**: Beat magnitude below detection threshold
   - Try with louder audio (normal speech, music)
   - Verify `silence_level < 0.5` (indicates non-silence)

### Problem: Core 0 Watchdog Trigger (Hard Reset)

**Symptoms:** Unexpected resets, "Guru Meditation Error"

**Diagnosis:**
```cpp
// Check Core 0 CPU load
Serial.printf("Core 0 Free Stack: %d bytes\n", uxTaskGetStackHighWaterMark(NULL));
```

**Root Causes:**
1. **STACK OVERFLOW**: Analysis task using too much memory
   - Increase stack in xTaskCreatePinnedToCore: 4096 → 8192

2. **BLOCKING I/O**: Analysis task waiting on I2S
   - Verify `portMAX_DELAY` not used in analysis loop
   - Use `vTaskDelay()` instead

3. **INFINITE LOOP**: Missing condition to exit task
   - Ensure `while (1)` has periodic breaks or delays

### Problem: Serial Output Corruption (Garbage Characters)

**Symptoms:** Mixed/garbled output, "×Ü…§¶"

**Diagnosis:**
1. Check baud rate matches: 2,000,000 bps
   ```bash
   pio device monitor -b 2000000
   ```

2. Verify no concurrent Serial writes from both cores
   - Add Serial mutex if needed
   ```cpp
   static portMUX_TYPE serial_mux = portMUX_INITIALIZER_UNLOCKED;

   void safe_serial_printf(const char* fmt, ...) {
       taskENTER_CRITICAL(&serial_mux);
       Serial.printf(fmt, ...);
       taskEXIT_CRITICAL(&serial_mux);
   }
   ```

---

## Performance Checklist

### Minimum Acceptable Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| I2S sample rate | 12,800 Hz | _____ | |
| Novelty update rate | 50 Hz | _____ | |
| LED frame rate | 60 FPS | _____ | |
| Core 0 CPU load | < 70% | _____ | |
| E2E latency (audio→LED) | < 50 ms | _____ | |
| Memory free (heap) | > 100 KB | _____ | |
| WiFi response time | < 500 ms | _____ | |

### Profiling Commands

```cpp
// Add to main.cpp loop() for periodic diagnostics
static uint32_t last_profile = millis();
if (millis() - last_profile > 10000) {
    Serial.printf("=== DIAGNOSTICS ===\n");
    Serial.printf("FPS: %.1f\n", current_fps);
    Serial.printf("Free heap: %d KB\n", esp_get_free_heap_size() / 1024);
    Serial.printf("Core 0 stack: %d bytes\n", uxTaskGetStackHighWaterMark(NULL));
    Serial.printf("I2S buffer: %d / 4096\n", sample_buffer_get_write_idx());

    i2s_manager_print_status();

    Serial.printf("Spectrum[0]: %.3f, Spectrum[32]: %.3f\n",
                  spectrogram[0], spectrogram[32]);

    uint16_t beat_bin = find_closest_tempo_bin(120.0f);
    Serial.printf("120 BPM: mag=%.3f, beat=%.3f\n",
                  tempi[beat_bin].magnitude, tempi[beat_bin].beat);

    last_profile = millis();
}
```

---

## Reset Procedure (If Stuck)

If the ESP32-S3 becomes unresponsive:

```bash
# 1. Connect to USB-C port
# 2. Force bootloader:
#    - Hold BOOT button
#    - Press RST button
#    - Release BOOT button

# 3. Erase flash
pio run -t erase --upload-port /dev/ttyUSB0

# 4. Rebuild and upload
pio run -e esp32-s3-devkitc-1-audio -t upload --upload-port /dev/ttyUSB0

# 5. Monitor
pio device monitor -b 2000000
```

---

## Rollback Procedure

If real audio integration breaks pattern rendering:

```cpp
// firmware/platformio.ini
[env:esp32-s3-devkitc-1-audio-debug]
extends = esp32-s3-devkitc-1-audio
build_flags = ${esp32-s3-devkitc-1-audio.build_flags}
    -DUSE_REAL_AUDIO=0  # Disable real audio, revert to stubs

# Build fallback
pio run -e esp32-s3-devkitc-1-audio-debug

# Upload fallback
pio run -e esp32-s3-devkitc-1-audio-debug -t upload --upload-port k1-reinvented.local
```

---

## Useful ESP-DSP Functions

```cpp
#include "esp_dsp.h"

// Vector operations
dsps_add_f32(x, y, z, len, 1, 1);          // z = x + y
dsps_sub_f32(x, y, z, len, 1, 1);          // z = x - y
dsps_mulc_f32(x, y, len, scale, 1, 1);     // y = x * scale
dsps_mul_f32(x, y, z, len, 1, 1, 1);       // z = x * y
dsps_power_f32(x, y, len, 1, 1);           // y = x^2
dsps_sqrt_f32(x, y, len, 1, 1);            // y = sqrt(x)

// Filters
dsps_dc_blocker_f32(x, y, len, alpha, status);  // Highpass: alpha=0.995

// Complex math (if using FFT instead of Goertzel)
dsps_fft_f32(real, imag, N, status);        // FFT in-place
dsps_fft_init_real_fc32(N, status);         // Init FFT

// Profiling
uint32_t start = esp_timer_get_time();      // Microseconds
// ... do work ...
uint32_t end = esp_timer_get_time();
float ms = (end - start) / 1000.0f;
```

---

## Next Steps After Integration

1. **Calibration**
   - Fine-tune DC offset values (7000, 360)
   - Adjust novelty threshold for silence detection

2. **Optimization**
   - Profile actual CPU usage with full effects
   - Consider reducing novelty update rate if needed

3. **Pattern Development**
   - Create audio-reactive effects using new audio globals
   - Test beat sync with various tempos (60-180 BPM)

4. **Production Deployment**
   - Create production build: `pio run -e esp32-s3-devkitc-1-audio`
   - Update device firmware via OTA
   - Monitor serial for diagnostics

---

**End of Quick Reference**

For detailed information, see:
- AUDIO_INTEGRATION_ARCHITECTURE.md (design & rationale)
- AUDIO_IMPLEMENTATION_TEMPLATES.md (ready-to-use code)

