---
author: Claude (Debugger)
date: 2025-10-28
status: in_review
intent: Comprehensive diagnostic analysis of UART daisy chain sync implementation and current status
---

# UART Daisy Chain Sync - Complete Diagnostic Analysis

## Executive Summary

The S3Z secondary device **is receiving and parsing valid UART sync packets** (indicated by green status LED). This is verified by analyzing the status LED state machine:

- **Green LED = `sync_valid = true`** (line 101 in s3z/src/main.cpp)
- **`sync_valid` is only set to true in `parse_sync_packet()` after successful checksum validation**
- Therefore: **Yellow→Green transition means S3Z received valid packets**

However, there are **critical unknowns** that require instrumentation to verify:

1. **What is the actual packet reception rate?** (Is it consistent or intermittent?)
2. **Is FRAMES_COUNTED incrementing on S3Main?** (If not, no packets are sent)
3. **How many packets have been received total?** (Is packets_received counter incrementing?)
4. **Are there any checksum errors?** (Is packets_invalid counter at 0?)
5. **Are the LED flashes correlated with frame updates?** (Is sync truly synchronized?)

## Architecture Overview

### S3Main (Primary) UART Transmission Pipeline

**Frame Counting:**
- Location: `/firmware/src/profiler.cpp` lines 11-33
- `FRAMES_COUNTED` increments in `watch_cpu_fps()` (line 22)
- `watch_cpu_fps()` is called from main loop (line 361 in main.cpp)
- Reports show S3Main running at ~42.8 FPS
- Therefore: `FRAMES_COUNTED` increments ~42-43 times per second

**Transmission:**
- Location: `/firmware/src/main.cpp` lines 91-120
- Function: `send_uart_sync_frame()`
- Called: Every loop iteration (line 358)
- Logic: Only transmits when `current_frame != last_frame`
- Expected frequency: ~42-43 packets per second (synchronized to rendered frames)

**UART Configuration:**
- Port: UART_NUM_1 (preserves Serial debug on UART0)
- TX Pin: GPIO 38
- RX Pin: GPIO 37 (for feedback, if needed)
- Baud: 115200 bps
- Settings: 8N1, no flow control
- Initialized: `init_uart_sync()` called in setup() (line 196)

**Packet Format (6 bytes):**
```
[0] = 0xAA         (sync byte)
[1] = FRAME_HI     (MSB of frame counter)
[2] = FRAME_LO     (LSB of frame counter)
[3] = PATTERN_ID   (from g_current_pattern_index)
[4] = BRIGHTNESS   (0-255, scaled from params.brightness)
[5] = CHECKSUM     (XOR of bytes 0-4)
```

### S3Z (Secondary) UART Reception Pipeline

**UART Configuration:**
- Port: UART_NUM_1 (independent from USB CDC debug on UART0)
- RX Pin: GPIO 44 (receives from S3Main GPIO 38)
- TX Pin: GPIO 43 (for feedback, if needed)
- Baud: 115200 bps
- Settings: 8N1, no flow control
- Initialized: `init_uart_receiver()` called in setup() (line 407)

**Reception Task:**
- Location: `/s3z/src/main.cpp` lines 300-325
- Runs on Core 1 with priority 15
- Pattern: Byte-by-byte reception with packet reassembly
- Algorithm:
  1. Read 1 byte with 100ms timeout
  2. If byte 0 is not 0xAA, skip and continue
  3. Accumulate bytes until packet_pos == 6
  4. Call `parse_sync_packet()` to validate
  5. Reset packet_pos and continue

**Packet Parsing:**
- Location: `/s3z/src/main.cpp` lines 271-295
- Validates sync byte (0xAA)
- Validates checksum (XOR)
- On success: Sets `sync_valid = true`, increments `packets_received`
- On failure: Increments `packets_invalid`

**Status LED Control:**
- Location: `/s3z/src/main.cpp` lines 89-168
- Core logic (lines 93-106):
  ```cpp
  if (packets_invalid > 0) {
      status_state = STATUS_ERROR;  // Red LED
  } else if (sync_valid) {
      status_state = STATUS_SYNCED;  // Green LED ✓
  } else if (now_ms - last_sync_ms > 1000) {
      status_state = STATUS_TIMEOUT;  // Yellow LED
  } else {
      status_state = STATUS_LISTENING;  // Blue LED
  }
  ```

**Status LED States:**
| State | Color | Meaning | Condition |
|-------|-------|---------|-----------|
| SYNCED | Green | Receiving packets | `sync_valid == true` |
| TIMEOUT | Yellow | No packets >1s | `now_ms - last_sync_ms > 1000` |
| LISTENING | Blue | Waiting for packets | `sync_valid == false` AND `<1s elapsed` |
| ERROR | Red | Checksum error | `packets_invalid > 0` |
| BOOTING | Cyan | Startup | Initial state |

## Current Status Interpretation

### What the Green LED Tells Us

**Fact 1:** Green LED is showing on S3Z
**Source:** User report "now shows green LED"

**Fact 2:** Green LED = `sync_valid == true`
**Source:** s3z/src/main.cpp line 101

**Fact 3:** `sync_valid` is only set in `parse_sync_packet()` at line 290
**Verification:**
```cpp
bool parse_sync_packet(const uint8_t* packet) {
    if (packet[0] != 0xAA) { packets_invalid++; return false; }

    uint8_t checksum = packet[0];
    for (int i = 1; i < 5; i++) { checksum ^= packet[i]; }

    if (checksum != packet[5]) { packets_invalid++; return false; }

    // Only reaches here if packet is valid
    sync_frame = ((uint32_t)packet[1] << 8) | packet[2];
    sync_pattern = packet[3];
    sync_brightness = packet[4] / 255.0f;
    sync_valid = true;  // ← Line 290
    last_sync_ms = millis();
    packets_received++;
    return true;
}
```

**Conclusion:** Green LED means S3Z has successfully received and validated at least one sync packet with correct checksum.

### Yellow→Green Transition Meaning

1. **Initially Yellow:** No sync packets received for >1 second (timeout state)
2. **Changed to Green:** At least one valid packet was received
3. **Implication:** UART communication is working

### What We Don't Know

1. **Consistency:** Is it receiving one packet then timing out again? Or continuous reception?
2. **Rate:** How many packets/second? Should be ~42 (matching FPS)
3. **Errors:** How many checksum failures?
4. **Source:** Is S3Main actually transmitting, or did a stray packet arrive somehow?

## Critical Code Paths

### S3Main: Why Packets Might Not Be Sent

**Path 1: FRAMES_COUNTED not incrementing**
- If `watch_cpu_fps()` is not called → FRAMES_COUNTED stays 0
- If FRAMES_COUNTED never changes → `send_uart_sync_frame()` returns at line 97
- Result: No packets sent, S3Z stays blue (eventually times to yellow)

**Path 2: uart_write_bytes() fails silently**
- ESP-IDF UART driver write function can fail and return 0
- No error handling in `send_uart_sync_frame()` to detect this
- Result: Packets not transmitted even though code runs

**Path 3: UART not initialized**
- If `init_uart_sync()` fails
- If `uart_driver_install()` returns error
- Result: UART writes silently fail

### S3Z: Why Packets Might Not Be Received

**Path 1: UART RX pin not connected**
- GPIO 44 not physically wired
- Receiver would timeout waiting for data

**Path 2: Byte misalignment**
- If S3Main sends before S3Z initializes
- Receiver starts mid-packet
- Sync byte 0xAA detection (line 308) handles this by skipping non-sync bytes

**Path 3: Baud rate mismatch**
- S3Main: 115200 bps
- S3Z: 115200 bps
- Both configured correctly in code ✓

**Path 4: Task not created**
- `xTaskCreatePinnedToCore()` call at line 411 could fail
- But setup() doesn't check return value or print error

## Verification Checklist

### Hardware Verification
- [ ] UART wires physically connected: S3Main GPIO 38 → S3Z GPIO 44
- [ ] Ground wire connected between devices
- [ ] No loose connections or corrosion
- [ ] Wire not damaged or shorted

### Software Verification
- [ ] S3Main compiled with UART code (verify using `grep -r "init_uart_sync" firmware/src/`)
- [ ] S3Z compiled with UART code (verify using `grep -r "uart_receive_task" s3z/src/`)
- [ ] Both devices built and uploaded recently

### Real-Time Diagnostics Needed
- [ ] `watch_cpu_fps()` is being called (add debug output)
- [ ] `send_uart_sync_frame()` is transmitting (add byte count output)
- [ ] `packets_received` counter is incrementing on S3Z
- [ ] `packets_invalid` counter is at 0 on S3Z
- [ ] LED green color is stable or flashing with each packet (as expected ~42 Hz)

## Proposed Instrumentation

### S3Main: Add Debug Output

**File:** `/firmware/src/main.cpp`

**Change 1:** Track UART transmission
```cpp
void send_uart_sync_frame() {
    static uint32_t last_frame = 0;
    static uint32_t packets_sent = 0;
    uint32_t current_frame = FRAMES_COUNTED;

    if (current_frame == last_frame) {
        return;
    }

    uint8_t packet[6];
    packet[0] = 0xAA;
    packet[1] = (current_frame >> 8) & 0xFF;
    packet[2] = current_frame & 0xFF;
    packet[3] = g_current_pattern_index;
    packet[4] = (uint8_t)(get_params().brightness * 255);

    uint8_t checksum = packet[0];
    for (int i = 1; i < 5; i++) {
        checksum ^= packet[i];
    }
    packet[5] = checksum;

    uart_write_bytes(UART_NUM, (const char*)packet, 6);
    packets_sent++;

    // Debug output every 200 packets (~4.7 seconds at 42 FPS)
    if (packets_sent % 200 == 0) {
        Serial.printf("UART: Sent %lu packets (last frame: %lu)\n", packets_sent, current_frame);
    }

    last_frame = current_frame;
}
```

### S3Z: Add Debug Output

**File:** `/s3z/src/main.cpp`

**Change 1:** Expose sync counters via serial output
```cpp
void loop() {
    // ... existing code ...

    // Debug output every 100ms
    static uint32_t last_debug = 0;
    uint32_t now = millis();
    if (now - last_debug > 1000) {  // Print every second
        Serial.printf("UART: Received=%lu, Invalid=%lu, State=%s\n",
            packets_received, packets_invalid,
            status_state == STATUS_SYNCED ? "SYNCED(GREEN)" :
            status_state == STATUS_TIMEOUT ? "TIMEOUT(YELLOW)" :
            status_state == STATUS_LISTENING ? "LISTENING(BLUE)" :
            status_state == STATUS_ERROR ? "ERROR(RED)" :
            "BOOTING(CYAN)");
        last_debug = now;
    }

    // ... rest of existing code ...
}
```

## Next Steps

1. **Add instrumentation** to both devices (debug output above)
2. **Recompile and upload** both firmware images
3. **Power on S3Main** and wait for WiFi connection
4. **Power on S3Z** and observe:
   - LED sequence (Cyan → Blue → Green)
   - Serial output on S3Z showing `packets_received` incrementing
   - Serial output on S3Main showing `packets_sent` incrementing
5. **Verify synchronization:** LED flashes should be frequent (~42 Hz)
6. **Check for errors:** `packets_invalid` should stay at 0

## Root Cause Categories

Once instrumented, we'll determine the root cause:

### Category A: No Transmission (S3Main problem)
- FRAMES_COUNTED not incrementing
- uart_write_bytes() failing
- UART not initialized
- **Fix:** Debug frame counting and UART driver

### Category B: No Reception (S3Z problem)
- UART RX pin not connected
- uart_read_bytes() timeout too short
- Packet loss due to interference
- **Fix:** Check wiring, adjust timeout, add error correction

### Category C: Intermittent (Wiring problem)
- Connection loose or corroded
- Baud rate sync issues
- **Fix:** Reseat wires, verify pins

### Category D: Operational (Both working)
- Packets sending and receiving correctly
- LED behavior as expected
- **Fix:** None needed, system is functional

## References

- S3Main UART TX: `/firmware/src/main.cpp` lines 72-120, 196, 358
- S3Z UART RX: `/s3z/src/main.cpp` lines 27-30, 173-190, 300-325
- S3Z Status LED: `/s3z/src/main.cpp` lines 59-168
- Status LED Spec: `/s3z/STATUS_LED_INDICATORS.md`
- Frame Counting: `/firmware/src/profiler.cpp` lines 11-33
