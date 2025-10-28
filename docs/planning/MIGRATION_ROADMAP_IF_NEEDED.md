---
title: ESP-IDF Migration Roadmap (If Needed in Future)
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# ESP-IDF Migration Roadmap (If Needed in Future)

## IMPORTANT PREAMBLE

**Do not execute this roadmap without explicit business justification.** See `MIGRATION_RECOMMENDATION_SUMMARY.md` for why migration is not currently recommended.

This roadmap exists for:
1. Future reference if constraints change
2. Technical understanding of what migration would entail
3. Planning if OTA overhaul becomes necessary for other reasons

**Estimated Total Effort:** 4-5 weeks for one experienced developer
**Target:** Zero feature loss, no performance regression, compatible OTA

---

## Phase 0: Preparation (Week 1)

### 0.1 Build System Setup

**Goal:** Get pure ESP-IDF building in parallel with PlatformIO

**Tasks:**

1. Create `/firmware/CMakeLists.txt`:
```cmake
cmake_minimum_required(VERSION 3.16)

set(COMPONENTS
    main
    esp_wifi
    esp_https_ota
    esp_timer
    driver
    freertos
)

set(EXTRA_COMPONENT_DIRS ".")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(k1_reinvented_idf)
```

2. Create `/firmware/idf_component.yml`:
```yaml
version: "1.0"
description: "K1.reinvented LED pattern engine"
dependencies:
  esp_wifi: ">=1.0"
  esp_https_ota: ">=1.0"
```

3. Create build documentation:
```bash
# IDF build
export IDF_PATH=/path/to/esp-idf
idf.py build
idf.py flash
idf.py monitor

# PlatformIO build (current)
pio run -t upload
pio run -t monitor
```

4. Update CI/CD to run both builds, verify binary compatibility

### 0.2 Architecture Mapping

Create lookup table of all Arduino → ESP-IDF API transitions:

| Arduino API | Current Usage | ESP-IDF Equivalent | Notes |
|-------------|---------------|-------------------|-------|
| Serial.begin(speed) | 1 place (main.cpp:134) | uart_driver_install() | Requires +30 lines |
| Serial.println() | 15+ places | uart_write_bytes() | Requires wrapper function |
| Serial.printf() | 3 places | uart_write_bytes() formatted | Use sprintf() + uart |
| WiFi.begin(ssid, pass) | 1 place (main.cpp:146) | esp_wifi APIs | Requires +40 lines |
| WiFi.status() | 1 place (main.cpp:147) | esp_wifi_get_sta_info() | Different API |
| delay(ms) | 1 place (main.cpp:148) | vTaskDelay() | Already using FreeRTOS |
| millis() | 2 places | esp_timer_get_time()/1000 | Needs helper macro |
| micros() | 2 places | esp_timer_get_time() | Direct replacement |
| ArduinoOTA.* | 20 lines (main.cpp:156-174) | esp_https_ota or custom | **Complex, see Phase 4** |

### 0.3 Risk Assessment Document

Document each component's migration risk:

```markdown
## Migration Risk Assessment

### High Risk (needs testing)
- OTA update system (protocol incompatibility)
- WiFi connection stability (event-driven vs polling)
- Serial output timing (UART driver buffering)

### Medium Risk (moderate changes)
- Timing accuracy (esp_timer vs Arduino's micros)
- Memory management (different initialization order)

### Low Risk (direct replacement)
- FreeRTOS calls (already native)
- I2S audio (already native)
- RMT LED driver (already native)
- Math operations (no change)
```

### 0.4 Testing Strategy

Define test plan:
```
Before migration baseline:
1. Record FPS stability (10 minutes)
2. Measure peak WiFi connection time
3. Log all OTA update events
4. Profile memory fragmentation

After each phase:
1. Verify FPS stability (must match baseline)
2. Verify WiFi reliability (test weak signal)
3. Test OTA update (must maintain compatibility)
4. Monitor memory (no new leaks)

After full migration:
1. Run stress test (72 hours continuous operation)
2. Test OTA update from old binary to new
3. Compare binary size and performance
4. Validate on target hardware
```

---

## Phase 1: Logging and Timing (Week 2)

### 1.1 Serial UART Driver

**Goal:** Replace Arduino Serial with native ESP-IDF UART

**Files to modify:** `main.cpp`, create new `firmware/src/logging.h`

**Implementation:**

Create `firmware/src/logging.h`:
```cpp
#pragma once
#include "driver/uart.h"
#include <stdarg.h>
#include <stdio.h>

#define LOG_UART_NUM UART_NUM_0
#define LOG_BAUDRATE 2000000

void log_init() {
    const uart_config_t uart_config = {
        .baud_rate = LOG_BAUDRATE,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .rx_flow_ctrl_thresh = 122,
        .source_clk = UART_CLK_APB,
    };

    uart_driver_install(LOG_UART_NUM, 1024 * 2, 0, 0, NULL, 0);
    uart_param_config(LOG_UART_NUM, &uart_config);
    uart_set_pin(LOG_UART_NUM, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
}

void log_write(const char* msg) {
    uart_write_bytes(LOG_UART_NUM, msg, strlen(msg));
}

void log_printf(const char* format, ...) {
    static char buffer[256];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    uart_write_bytes(LOG_UART_NUM, buffer, strlen(buffer));
}

void log_println(const char* msg) {
    uart_write_bytes(LOG_UART_NUM, msg, strlen(msg));
    uart_write_bytes(LOG_UART_NUM, "\n", 1);
}
```

Modify `main.cpp`:
```cpp
// Remove: #include <Arduino.h>
// Add:
#include "logging.h"

void setup() {
    // Remove: Serial.begin(2000000);
    // Add:
    log_init();

    log_println("\n\n=== K1.reinvented Starting ===");
    log_println("Dual-Core Architecture:");
    log_println("  Core 0: Real-time audio processing");
    log_println("  Core 1: Pattern rendering at 120 FPS");

    // ... rest of setup
}

void audio_task(void* parameter) {
    log_println("Audio Task starting on Core 0...");
    // ... rest of task
}

// In debug output:
// Replace: Serial.print(".");
// With:    log_write(".");
// Replace: Serial.println("Connected!");
// With:    log_println("Connected!");
// Replace: Serial.printf(...)
// With:    log_printf(...)
```

**Estimated changes:** 50 lines added, 20 lines removed

### 1.2 Timing Utilities

**Goal:** Replace millis()/micros() with esp_timer

Create timing wrapper in `logging.h`:
```cpp
#include "esp_timer.h"

static uint32_t system_start_us = 0;

void timing_init() {
    system_start_us = esp_timer_get_time();
}

uint32_t millis() {
    return (esp_timer_get_time() - system_start_us) / 1000;
}

uint32_t micros() {
    return (esp_timer_get_time() - system_start_us);
}
```

Modify `main.cpp`:
```cpp
void setup() {
    log_init();
    timing_init();  // Add this
    // ... rest
}
```

**Estimated changes:** 15 lines added

### 1.3 Testing

- Verify serial output at 2Mbps works correctly
- Verify timing accuracy within 1%
- Run FPS monitor for 10 minutes
- Check for timing drift

**Go/No-Go:** Both builds (PlatformIO and IDF CMake) must produce identical timing behavior

---

## Phase 2: WiFi Stack (Week 3)

### 2.1 WiFi Initialization

**Goal:** Replace `WiFi.begin()` with native ESP-IDF

Create `firmware/src/wifi.h`:
```cpp
#pragma once
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_log.h"
#include "lwip/err.h"
#include "lwip/sockets.h"

#define WIFI_SSID "OPTUS_738CC0N"
#define WIFI_PASS "parrs45432vw"

static esp_netif_t *sta_netif = NULL;
static bool wifi_connected = false;

static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                              int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT) {
        if (event_id == WIFI_EVENT_STA_START) {
            esp_wifi_connect();
        } else if (event_id == WIFI_EVENT_STA_DISCONNECTED) {
            wifi_connected = false;
            // Retry connection (with exponential backoff in production)
            esp_wifi_connect();
        }
    } else if (event_base == IP_EVENT) {
        if (event_id == IP_EVENT_STA_GOT_IP) {
            ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
            log_printf("Got IP: " IPSTR "\n", IP2STR(&event->ip_info.ip));
            wifi_connected = true;
        }
    }
}

void wifi_init() {
    // Event loop
    esp_event_loop_create_default();

    // Create default station interface
    sta_netif = esp_netif_create_default_wifi_sta();

    // WiFi driver configuration
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    // Register event handlers
    esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL);
    esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL);

    // Configure WiFi
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .scan_method = WIFI_FAST_SCAN,
            .sort_method = WIFI_CONNECT_AP_BY_SIGNAL,
            .threshold.rssi = -127,
            .threshold.authmode = WIFI_AUTH_OPEN,
        },
    };

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
    esp_wifi_connect();
}

bool wifi_is_connected() {
    return wifi_connected;
}

uint32_t wifi_get_ip() {
    esp_netif_ip_info_t ip_info;
    esp_netif_get_ip_info(sta_netif, &ip_info);
    return ip_info.ip.addr;
}
```

Modify `main.cpp`:
```cpp
#include "wifi.h"

void setup() {
    log_init();
    timing_init();

    log_println("Initializing LED driver...");
    init_rmt_driver();

    log_println("Initializing WiFi...");
    wifi_init();

    // Wait for connection (with timeout)
    uint32_t wifi_start = millis();
    while (!wifi_is_connected() && (millis() - wifi_start) < 10000) {
        log_write(".");
        vTaskDelay(100 / portTICK_PERIOD_MS);
    }

    if (wifi_is_connected()) {
        log_println("\nWiFi connected!");
        // Print IP (see below)
    } else {
        log_println("\nWiFi connection timeout (proceeding anyway)");
    }

    // ... rest of setup
}
```

**Estimated changes:** 100 lines added (most is event handling boilerplate)

### 2.2 Testing

- Verify WiFi connects within 5 seconds
- Verify connection with weak signal (test at -80dBm)
- Verify connection persistence (no disconnection for 1 hour)
- Verify reconnection after network outage

**Go/No-Go:** WiFi must connect reliably and display IP correctly

---

## Phase 3: OTA Preparation (Week 4, Part 1)

### 3.1 Dual OTA Support Plan

**Goal:** Support both ArduinoOTA (current) and ESP-IDF OTA (new) simultaneously

This is the most critical phase. Plan:

1. **Keep ArduinoOTA for backward compatibility** (don't remove from platformio.ini)
2. **Add ESP_HTTPS_OTA support** alongside it
3. **Implement firmware versioning** to detect incompatible updates
4. **Create migration script** for users to explicitly upgrade OTA protocol

Create `firmware/src/ota.h`:
```cpp
#pragma once
#include "esp_https_ota.h"

// OTA version identifier
#define OTA_PROTOCOL_VERSION 2  // 1=ArduinoOTA, 2=ESP_HTTPS_OTA

void ota_init() {
    // Register OTA endpoint
    // Implementation depends on whether we're using HTTP/HTTPS server
}

bool ota_check_and_apply() {
    // Check for OTA update
    // This runs periodically (not in hot loop)
    return false;  // true if update applied
}
```

**Key point:** Do NOT remove ArduinoOTA from platformio.ini yet. Let both coexist.

### 3.2 Migration Path Definition

Document how deployed devices will transition:
```
Timeline:
- Month 1: Release firmware with dual OTA support
  * ArduinoOTA still works
  * New ESP_HTTPS_OTA available but not required
  * User opt-in to switch protocols

- Month 2-3: Monitor adoption
  * Users can manually trigger protocol upgrade via web UI
  * Over-the-air upgrade from ArduinoOTA to ESP_HTTPS_OTA

- Month 4+: Can deprecate ArduinoOTA if desired
  * But keep both for backward compatibility
```

**Estimated changes:** 50 lines for dual OTA framework (actual OTA implementation deferred to Phase 4)

---

## Phase 4: OTA Implementation (Week 4, Part 2 - Week 5)

### 4.1 ESP_HTTPS_OTA Implementation

**This is complex and high-risk. Separate from other changes.**

```cpp
// Pseudocode - full implementation requires certificate management
esp_https_ota_config_t ota_config = {
    .server_cert_env = "server_crt_env",
    .skip_cert_common_name_check = false,
};

// During OTA:
esp_https_ota(&ota_config);

// Device reboots automatically after successful update
```

**Challenges:**
- Certificate management (self-signed vs commercial certs)
- Server infrastructure (need OTA host)
- Rollback strategy (corrupted firmware recovery)
- Version compatibility (prevent downgrading)

**Estimated effort:** 1-2 weeks (beyond this roadmap, requires server-side work)

### 4.2 Extensive Testing

**Before deploying to production:**
- Simulate network failures during OTA
- Test corrupted firmware recovery
- Verify devices don't brick
- Test OTA on every WiFi condition (weak signal, 5G interference)
- Test battery-powered devices (ensure OTA doesn't drain battery)

**Estimated testing time:** 1 week

---

## Phase 5: Cleanup and Optimization (Week 5-6)

### 5.1 Remove Arduino Dependencies

Only after Phases 1-4 are complete and tested:

1. Remove `#include <Arduino.h>` from all files
2. Remove `framework = arduino` from platformio.ini (add pure ESP-IDF platformio env instead)
3. Remove ArduinoOTA from lib_deps (keep for backward compatibility in separate branch)

### 5.2 Performance Optimization

With pure ESP-IDF build, enable optimizations:
```cmake
# In CMakeLists.txt
set(COMPILER_FLAGS "-O3 -march=esp32-s3")  # Aggressive optimization
```

or in platformio.ini:
```ini
build_flags = -O3 -march=esp32s3
```

### 5.3 Final Testing

- Benchmark before/after migration
- Measure FPS stability (should be ±0%)
- Measure memory usage (should be ±5%)
- Stress test for 72 hours

---

## Phase 6: Documentation (Week 6)

### 6.1 Migration Guide

Document for future developers:
- How pure ESP-IDF build differs from Arduino
- How to switch between PlatformIO and CMake builds
- Debugging differences
- Common pitfalls

### 6.2 Architecture Update

Update documentation:
- Remove references to Arduino abstractions
- Clarify all uses of native ESP-IDF
- Document OTA protocol version

### 6.3 Build Automation

Create helper scripts:
```bash
#!/bin/bash
# build_pio.sh - PlatformIO build
pio run -t upload

# build_idf.sh - Pure ESP-IDF build
idf.py build && idf.py flash

# switch_build.sh - Switch between build systems
# Manages CMakeLists.txt and platformio.ini
```

---

## Rollback Strategy

If migration goes wrong at any phase:

**Phase 1-2 (Serial/WiFi):** Hard rollback
- Revert git commits
- Deploy previous firmware via OTA
- Cost: 1-2 hours + risk to deployed devices

**Phase 3 (OTA Prep):** Medium rollback
- Keep ArduinoOTA in firmware
- Don't deploy pure ESP-IDF to production
- Cost: none (was just prep)

**Phase 4 (OTA Implementation):** Critical rollback
- Only deploy to small subset first
- Have recovery mechanism in place
- Cost: 1-2 weeks delay, reputational damage if devices brick

**Phase 5+ (Cleanup):** Easy rollback
- Revert to previous git commit
- Deploy previous firmware
- Cost: 1-2 hours

---

## Success Criteria

Migration is complete when:

1. ✓ Pure ESP-IDF build produces identical firmware (binary comparison)
2. ✓ All 120 FPS tests pass (no performance regression)
3. ✓ WiFi connects within 5 seconds reliably
4. ✓ OTA updates work (both old ArduinoOTA and new ESP-IDF protocols)
5. ✓ Memory footprint is ±5% of original
6. ✓ 72-hour stress test passes
7. ✓ All development tools documented and working

---

## What NOT to Do

1. **Don't try to do Phases 1-5 simultaneously** - Do them sequentially with testing between
2. **Don't skip Phase 3-4 OTA preparation** - This is where projects get bricked
3. **Don't rely on binary comparison alone** - Must test actual functionality
4. **Don't migrate to production before small-scale validation** - Use canary deployment
5. **Don't remove PlatformIO support** - Keep it as fallback

---

## Abort Conditions

Stop migration and revert if:

1. **OTA protocol incompatibility blocks migration** - Too risky
2. **Performance regresses >5%** - Unexpected bottleneck discovered
3. **Memory usage increases >20%** - Something went wrong
4. **WiFi stability degrades** - IDF event-driven model causing issues
5. **Development team blocked for >3 weeks** - Hitting hard limits

In any abort condition, revert to original Arduino+PlatformIO approach.

---

## Timeline Summary

| Phase | Duration | Deliverable | Risk |
|-------|----------|-------------|------|
| 0 | 1 week | CMake build working in parallel | Low |
| 1 | 1 week | Serial/timing native | Low |
| 2 | 1 week | WiFi native | Medium |
| 3 | 1 week | OTA framework (dual support) | Medium |
| 4 | 1-2 weeks | Full OTA implementation + testing | **High** |
| 5 | 1 week | Cleanup and optimization | Low |
| 6 | 1 week | Documentation | Low |
| **Total** | **4-5 weeks** | **Pure ESP-IDF firmware** | **Medium** |

---

## Cost Summary

**Engineering effort:** 4-5 weeks for one experienced developer
**Server infrastructure:** 1-2 weeks for OTA host setup (not included)
**Testing effort:** 2-3 weeks intensive QA
**Total cost:** ~8-10 weeks for full migration with confidence

**This cost is only justified if one of the "What Would Justify Migration" criteria from the main analysis is met.**

---

## Conclusion

This roadmap is thorough and achievable, but only execute it if you have:

1. **Clear business justification** (not "cleanliness" or "learning")
2. **Risk tolerance for OTA system changes** (critical subsystem)
3. **Dedicated QA time** (can't be rushed)
4. **Canary deployment capability** (gradual rollout to devices)

Otherwise: Stay with Arduino + PlatformIO. It's working fine.

