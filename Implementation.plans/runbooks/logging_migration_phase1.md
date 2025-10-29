# Phase 1: Logging Migration Runbook

**Author:** Claude (Multiplier Orchestrator)
**Date:** 2025-10-29
**Status:** in_progress
**Intent:** Systematically migrate 97 Serial.print() calls to centralized LOG_* macros

---

## Overview

This runbook tracks the migration of raw `Serial.print()` calls to the centralized logging system. Migration is grouped by subsystem for systematic validation.

**Total Serial.print() calls found:** 97

**Migration strategy:**
1. Group by subsystem (audio, LED, webserver, core/init)
2. Migrate in groups of 10-15 calls
3. Compile + validate after each group
4. Document before/after for traceability

---

## Migration Groups

### Group 1: Core Initialization (main.cpp) - 47 calls

**File:** `firmware/src/main.cpp`

**Priority:** HIGH (these are critical startup messages)

**Tag to use:** `TAG_CORE0` (general system messages)

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 40 | `Serial.print("Connected! IP: ");` | `LOG_INFO(TAG_WIFI, "Connected! IP: %s", WiFi.localIP().toString().c_str());` | ⏳ pending |
| 41 | `Serial.println(WiFi.localIP());` | *(merge with line 40)* | ⏳ pending |
| 46 | `Serial.println("Initializing web server...");` | `LOG_INFO(TAG_WEB, "Initializing web server...");` | ⏳ pending |
| 49 | `Serial.println("Initializing CPU monitor...");` | `LOG_INFO(TAG_CORE0, "Initializing CPU monitor...");` | ⏳ pending |
| 55 | `Serial.printf("  Control UI: http://%s.local/\n", ArduinoOTA.getHostname());` | `LOG_INFO(TAG_WEB, "Control UI: http://%s.local", ArduinoOTA.getHostname());` | ⏳ pending |
| 60 | `Serial.println("WiFi connection lost, attempting recovery...");` | `LOG_WARN(TAG_WIFI, "WiFi connection lost, attempting recovery...");` | ⏳ pending |
| 73 | `Serial.println("[AUDIO_TASK] Starting on Core 1");` | `LOG_INFO(TAG_CORE1, "AUDIO_TASK Starting on Core 1");` | ⏳ pending |
| 127 | `Serial.println("[GPU_TASK] Starting on Core 0");` | `LOG_INFO(TAG_CORE0, "GPU_TASK Starting on Core 0");` | ⏳ pending |
| 162 | `Serial.println("\n\n=== K1.reinvented Starting ===");` | `LOG_INFO(TAG_CORE0, "=== K1.reinvented Starting ===");` | ⏳ pending |
| 165 | `Serial.println("Initializing LED driver...");` | `LOG_INFO(TAG_LED, "Initializing LED driver...");` | ⏳ pending |
| 183 | `Serial.println("OTA Update starting...");` | `LOG_INFO(TAG_CORE0, "OTA Update starting...");` | ⏳ pending |
| 186 | `Serial.println("\nOTA Update complete!");` | `LOG_INFO(TAG_CORE0, "OTA Update complete!");` | ⏳ pending |
| 189 | `Serial.printf("Progress: %u%%\r", (progress / (total / 100)));` | `LOG_DEBUG(TAG_CORE0, "Progress: %u%%", (progress / (total / 100)));` | ⏳ pending |
| 192 | `Serial.printf("Error[%u]: ", error);` | `LOG_ERROR(TAG_CORE0, "OTA Error[%u]: %s", error, ota_error_msg);` | ⏳ pending |
| 193-197 | *(OTA error codes)* | *(merge into line 192 with switch/case)* | ⏳ pending |
| 202 | `Serial.println("Initializing SPIFFS...");` | `LOG_INFO(TAG_CORE0, "Initializing SPIFFS...");` | ⏳ pending |
| 204 | `Serial.println("ERROR: SPIFFS initialization failed - web UI will not be available");` | `LOG_ERROR(TAG_CORE0, "SPIFFS initialization failed - web UI will not be available");` | ⏳ pending |
| 206 | `Serial.println("SPIFFS mounted successfully");` | `LOG_INFO(TAG_CORE0, "SPIFFS mounted successfully");` | ⏳ pending |
| 211 | `Serial.println("Initializing audio-reactive stubs...");` | `LOG_INFO(TAG_AUDIO, "Initializing audio-reactive stubs...");` | ⏳ pending |
| 215 | `Serial.println("Initializing SPH0645 microphone...");` | `LOG_INFO(TAG_I2S, "Initializing SPH0645 microphone...");` | ⏳ pending |
| 219 | `Serial.println("Initializing audio data sync...");` | `LOG_INFO(TAG_SYNC, "Initializing audio data sync...");` | ⏳ pending |
| 223 | `Serial.println("Initializing Goertzel DFT...");` | `LOG_INFO(TAG_AUDIO, "Initializing Goertzel DFT...");` | ⏳ pending |
| 228 | `Serial.println("Initializing tempo detection...");` | `LOG_INFO(TAG_TEMPO, "Initializing tempo detection...");` | ⏳ pending |
| 232 | `Serial.println("Initializing parameters...");` | `LOG_INFO(TAG_CORE0, "Initializing parameters...");` | ⏳ pending |
| 236 | `Serial.println("Initializing pattern registry...");` | `LOG_INFO(TAG_CORE0, "Initializing pattern registry...");` | ⏳ pending |
| 238 | `Serial.printf("  Loaded %d patterns\n", g_num_patterns);` | `LOG_INFO(TAG_CORE0, "Loaded %d patterns", g_num_patterns);` | ⏳ pending |
| 239 | `Serial.printf("  Starting pattern: %s\n", get_current_pattern().name);` | `LOG_INFO(TAG_CORE0, "Starting pattern: %s", get_current_pattern().name);` | ⏳ pending |
| 248 | `Serial.println("Activating dual-core architecture...");` | `LOG_INFO(TAG_CORE0, "Activating dual-core architecture...");` | ⏳ pending |
| 280 | `Serial.println("FATAL ERROR: GPU task creation failed!");` | `LOG_ERROR(TAG_GPU, "FATAL ERROR: GPU task creation failed!");` | ⏳ pending |
| 281 | `Serial.println("System cannot continue. Rebooting...");` | `LOG_ERROR(TAG_CORE0, "System cannot continue. Rebooting...");` | ⏳ pending |
| 287 | `Serial.println("FATAL ERROR: Audio task creation failed!");` | `LOG_ERROR(TAG_AUDIO, "FATAL ERROR: Audio task creation failed!");` | ⏳ pending |
| 288 | `Serial.println("System cannot continue. Rebooting...");` | `LOG_ERROR(TAG_CORE0, "System cannot continue. Rebooting...");` | ⏳ pending |
| 293 | `Serial.println("Dual-core tasks created successfully:");` | `LOG_INFO(TAG_CORE0, "Dual-core tasks created successfully:");` | ⏳ pending |
| 294 | `Serial.println("  Core 0: GPU rendering (100+ FPS target)");` | `LOG_INFO(TAG_GPU, "Core 0: GPU rendering (100+ FPS target)");` | ⏳ pending |
| 295 | `Serial.printf("    Stack: 16KB (was 12KB, increased for safety)\n");` | `LOG_DEBUG(TAG_GPU, "Stack: 16KB (was 12KB, increased for safety)");` | ⏳ pending |
| 296 | `Serial.println("  Core 1: Audio processing + network");` | `LOG_INFO(TAG_AUDIO, "Core 1: Audio processing + network");` | ⏳ pending |
| 297 | `Serial.printf("    Stack: 12KB (was 8KB, increased for safety)\n");` | `LOG_DEBUG(TAG_AUDIO, "Stack: 12KB (was 8KB, increased for safety)");` | ⏳ pending |
| 298 | `Serial.println("  Synchronization: Lock-free with sequence counters + memory barriers");` | `LOG_DEBUG(TAG_SYNC, "Synchronization: Lock-free with sequence counters + memory barriers");` | ⏳ pending |
| 299 | `Serial.println("Ready!");` | `LOG_INFO(TAG_CORE0, "Ready!");` | ⏳ pending |
| 300 | `Serial.println("Upload new effects with:");` | `LOG_INFO(TAG_CORE0, "Upload new effects with:");` | ⏳ pending |
| 301 | `Serial.printf("  pio run -t upload --upload-port %s.local\n", ArduinoOTA.getHostname());` | `LOG_INFO(TAG_CORE0, "pio run -t upload --upload-port %s.local", ArduinoOTA.getHostname());` | ⏳ pending |

---

### Group 2: Webserver (webserver.cpp) - 7 calls

**File:** `firmware/src/webserver.cpp`

**Priority:** MEDIUM

**Tag to use:** `TAG_WEB`

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 223 | `Serial.printf("[AUDIO CONFIG] Microphone gain updated to %.2fx\n", result.value);` | `LOG_INFO(TAG_AUDIO, "Microphone gain updated to %.2fx", result.value);` | ⏳ pending |
| 535 | `Serial.println("mDNS responder started: k1-reinvented.local");` | `LOG_INFO(TAG_WEB, "mDNS responder started: k1-reinvented.local");` | ⏳ pending |
| 548 | `Serial.println("Error starting mDNS responder");` | `LOG_ERROR(TAG_WEB, "Error starting mDNS responder");` | ⏳ pending |
| 553 | `Serial.println("Web server started on port 80");` | `LOG_INFO(TAG_WEB, "Web server started on port 80");` | ⏳ pending |
| 554 | `Serial.println("WebSocket server available at /ws");` | `LOG_INFO(TAG_WEB, "WebSocket server available at /ws");` | ⏳ pending |
| 574 | `Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());` | `LOG_DEBUG(TAG_WEB, "WebSocket client #%u connected from %s", client->id(), client->remoteIP().toString().c_str());` | ⏳ pending |
| 589 | `Serial.printf("WebSocket client #%u disconnected\n", client->id());` | `LOG_DEBUG(TAG_WEB, "WebSocket client #%u disconnected", client->id());` | ⏳ pending |
| 598 | `Serial.printf("WebSocket message from client #%u: %s\n", client->id(), (char*)data);` | `LOG_DEBUG(TAG_WEB, "WebSocket message from client #%u: %s", client->id(), (char*)data);` | ⏳ pending |

---

### Group 3: Profiler (profiler.cpp) - 10 calls

**File:** `firmware/src/profiler.cpp`

**Priority:** LOW (performance monitoring, can be DEBUG level)

**Tag to use:** `TAG_PROFILE`

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 47 | `Serial.print("FPS: ");` | `LOG_DEBUG(TAG_PROFILE, "FPS: %.1f", FPS_CPU);` | ⏳ pending |
| 48 | `Serial.println(FPS_CPU, 1);` | *(merge with line 47)* | ⏳ pending |
| 49 | `Serial.print("avg_ms render/quantize/wait/tx: ");` | `LOG_DEBUG(TAG_PROFILE, "avg_ms render/quantize/wait/tx: %.2f / %.2f / %.2f / %.2f", avg_render_ms, avg_quantize_ms, avg_rmt_wait_ms, avg_rmt_tx_ms);` | ⏳ pending |
| 50-56 | *(individual Serial.print calls)* | *(merge into line 49)* | ⏳ pending |

---

### Group 4: Audio Subsystem - 9 calls

**Files:** `firmware/src/audio/microphone.h`, `firmware/src/audio/goertzel.cpp`

**Priority:** HIGH (critical audio pipeline messages)

**Tag to use:** `TAG_I2S`, `TAG_AUDIO`, `TAG_SYNC`

#### microphone.h

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 104 | `Serial.printf("[I2S_DIAG] Block time: %lu us\n", i2s_block_us);` | `LOG_DEBUG(TAG_I2S, "Block time: %lu us", i2s_block_us);` | ⏳ pending |
| 110 | `Serial.printf("[I2S_ERROR] Read failed with code %d, block_us=%lu\n", i2s_result, i2s_block_us);` | `LOG_ERROR(TAG_I2S, "Read failed with code %d, block_us=%lu", i2s_result, i2s_block_us);` | ⏳ pending |

#### goertzel.cpp

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 87 | `Serial.println("[AUDIO SYNC] ERROR: Failed to create mutexes!");` | `LOG_ERROR(TAG_SYNC, "Failed to create mutexes!");` | ⏳ pending |
| 101 | `Serial.println("[AUDIO SYNC] Initialized successfully");` | `LOG_INFO(TAG_SYNC, "Initialized successfully");` | ⏳ pending |
| 102 | `Serial.printf("[AUDIO SYNC] Buffer size: %d bytes per snapshot\n", sizeof(AudioDataSnapshot));` | `LOG_DEBUG(TAG_SYNC, "Buffer size: %d bytes per snapshot", sizeof(AudioDataSnapshot));` | ⏳ pending |
| 103 | `Serial.printf("[AUDIO SYNC] Total memory: %d bytes (2x buffers)\n", sizeof(AudioDataSnapshot) * 2);` | `LOG_DEBUG(TAG_SYNC, "Total memory: %d bytes (2x buffers)", sizeof(AudioDataSnapshot) * 2);` | ⏳ pending |
| 156 | `Serial.println("[AUDIO_SYNC] WARNING: Max retries exceeded, using potentially stale data");` | `LOG_WARN(TAG_SYNC, "Max retries exceeded, using potentially stale data");` | ⏳ pending |
| 538 | `Serial.println("Starting noise cal...");` | `LOG_INFO(TAG_AUDIO, "Starting noise cal...");` | ⏳ pending |
| 585 | `// Serial.printf("[AUDIO] %s\n", msg);` | *(already commented out - skip)* | ✅ skip |

---

### Group 5: Pattern Registry & LED Driver - 6 calls

**Files:** `firmware/src/pattern_registry.h`, `firmware/src/led_driver.h`

**Priority:** MEDIUM

**Tag to use:** `TAG_LED`, `TAG_GPU`

#### pattern_registry.h

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 56 | `Serial.printf("[PATTERN SELECT] Changed to: %s (index %d)\n", ...);` | `LOG_INFO(TAG_GPU, "Pattern changed to: %s (index %d)", ...);` | ⏳ pending |
| 61 | `Serial.printf("[PATTERN SELECT] ERROR: Pattern '%s' not found\n", id);` | `LOG_ERROR(TAG_GPU, "Pattern '%s' not found", id);` | ⏳ pending |

#### led_driver.h

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 153 | `Serial.println("[LED] RMT transmission timeout");` | `LOG_WARN(TAG_LED, "RMT transmission timeout");` | ⏳ pending |

---

### Group 6: CPU Monitor (cpu_monitor.cpp) - 4 calls

**File:** `firmware/src/cpu_monitor.cpp`

**Priority:** LOW

**Tag to use:** `TAG_MEMORY`

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 20 | `Serial.println("CPU Monitor: Runtime stats enabled");` | `LOG_INFO(TAG_MEMORY, "CPU Monitor: Runtime stats enabled");` | ⏳ pending |
| 27 | `Serial.println("CPU Monitor: Runtime stats not enabled, using fallback method");` | `LOG_WARN(TAG_MEMORY, "CPU Monitor: Runtime stats not enabled, using fallback method");` | ⏳ pending |
| 70 | `Serial.println("CPU Monitor: Failed to allocate stats buffer");` | `LOG_ERROR(TAG_MEMORY, "Failed to allocate stats buffer");` | ⏳ pending |
| 79 | `Serial.println("CPU Monitor: Failed to parse task stats");` | `LOG_ERROR(TAG_MEMORY, "Failed to parse task stats");` | ⏳ pending |

---

### Group 7: Debug Patterns (generated_patterns.h) - 3 calls

**File:** `firmware/src/generated_patterns.h`

**Priority:** LOW (these are debug messages, can be commented out or converted to LOG_DEBUG)

**Tag to use:** `TAG_GPU`

| Line | Original Code | Replacement | Status |
|------|--------------|-------------|--------|
| 529 | `Serial.printf("[PULSE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n", ...);` | `LOG_DEBUG(TAG_GPU, "[PULSE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f", ...);` | ⏳ pending |
| 652 | `Serial.printf("[TEMPISCOPE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n", ...);` | `LOG_DEBUG(TAG_GPU, "[TEMPISCOPE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f", ...);` | ⏳ pending |
| 737 | `Serial.printf("[BEAT_TUNNEL] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n", ...);` | `LOG_DEBUG(TAG_GPU, "[BEAT_TUNNEL] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f", ...);` | ⏳ pending |

---

### Group 8: Logger Initialization (logger.cpp) - 3 calls

**File:** `firmware/src/logging/logger.cpp`

**Priority:** EXEMPT (these are part of the logger itself, keep as-is)

| Line | Original Code | Action | Status |
|------|--------------|--------|--------|
| 66-68 | Logger initialization banner | KEEP (cannot use logger before it's initialized) | ✅ exempt |

---

## Migration Execution Order

Execute in this order to minimize breakage:

1. ✅ **Group 8**: Logger initialization (EXEMPT - no changes)
2. ⏳ **Group 1**: Core initialization (47 calls) - HIGHEST PRIORITY
3. ⏳ **Group 4**: Audio subsystem (9 calls) - CRITICAL PATH
4. ⏳ **Group 5**: Pattern registry & LED driver (6 calls)
5. ⏳ **Group 2**: Webserver (7 calls)
6. ⏳ **Group 3**: Profiler (10 calls)
7. ⏳ **Group 6**: CPU Monitor (4 calls)
8. ⏳ **Group 7**: Debug patterns (3 calls) - LOWEST PRIORITY

---

## Validation Checklist (Run After Each Group)

After migrating each group:

- [ ] Add `#include "logging/logger.h"` to the file (if not already present)
- [ ] Compile firmware: `cd firmware && pio run --environment esp32-s3-devkitc-1`
- [ ] Check for compilation errors
- [ ] Verify no new warnings introduced
- [ ] Test on hardware (if available): check serial output for proper formatting
- [ ] Document any issues in this runbook

---

## Performance Baseline (Before Migration)

Capture these metrics before starting migration:

- **RAM usage**: *(to be measured)*
- **Flash usage**: *(to be measured)*
- **Compilation time**: *(to be measured)*
- **Serial output sample**: *(to be captured)*

---

## Performance Delta (After Migration)

Capture these metrics after completing all groups:

- **RAM delta**: *(expected: +100 bytes for tag filtering)*
- **Flash delta**: *(expected: negligible, possibly negative due to code deduplication)*
- **Compilation time delta**: *(expected: negligible)*
- **Serial output improvements**: *(timestamps, colors, severity levels, tags)*

---

## Issues Log

| Date | Group | Issue | Resolution | Status |
|------|-------|-------|------------|--------|
| *(example)* | Group 1 | Compilation error in main.cpp:40 | Fixed missing format specifier | ✅ resolved |

---

## Completion Criteria

Migration is complete when:

- ✅ All 97 Serial.print() calls migrated (except logger init)
- ✅ All files compile with 0 errors, 0 warnings
- ✅ Serial output validated on hardware
- ✅ Performance metrics documented
- ✅ Validation report created in `docs/reports/phase1_logging_migration_validation.md`

---

## Next Steps (Phase 2+)

After Phase 1 completes:

1. Add message sequencing (sequence numbers to detect message loss)
2. Implement non-blocking circular buffer (optional)
3. Add runtime configuration endpoint (enable/disable tags via web UI)
4. Add file logging to SPIFFS (optional)
