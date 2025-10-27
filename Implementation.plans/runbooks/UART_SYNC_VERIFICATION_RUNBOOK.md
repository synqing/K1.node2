---
author: Claude (Debugger)
date: 2025-10-28
status: draft
intent: Step-by-step procedure to verify UART daisy chain sync is working correctly
---

# UART Daisy Chain Sync - Verification Runbook

## Overview

This runbook guides you through verifying that the UART synchronization between S3Main and S3Z is working correctly. The instrumentation added provides real-time feedback on packet transmission and reception.

## Prerequisites

- Both S3Main and S3Z firmware compiled with debug instrumentation (changes made 2025-10-28)
- Serial console access to both devices
- USB cables for serial monitoring (or WiFi serial over S3Main)
- Both devices powered on

## Setup Phase (Before Test)

### Step 1: Build and Upload S3Main

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware
pio run -t upload --upload-port 192.168.1.103.local
```

**Expected output:**
```
...
[many build lines]
...
Uploading .pio/build/esp32-s3-devkitc-1/firmware.bin
```

### Step 2: Build and Upload S3Z

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/s3z
pio run -t upload --upload-port /dev/cu.usbmodem212401
```

**Expected output:**
```
...
[many build lines]
...
Writing at 0x00010000... (X%)
```

### Step 3: Connect Serial Monitors

**For S3Main (over WiFi):**
```bash
pio device monitor --port k1-reinvented.local
```

**For S3Z (USB):**
```bash
pio device monitor --port /dev/cu.usbmodem212401
```

Open both in separate terminal windows so you can observe both simultaneously.

## Test Phase

### Observation Period: 30 seconds

After both devices are booted, observe the serial output for ~30 seconds.

#### Expected S3Main Output

```
FPS: 42.8
avg_ms render/quantize/wait/tx: 0.45 / 0.00 / 1.20 / 0.00
...
UART: Sent 200 packets (frame 200, last write 6 bytes)
...
UART: Sent 400 packets (frame 400, last write 6 bytes)
...
UART: Sent 600 packets (frame 600, last write 6 bytes)
```

**What it means:**
- `FPS: 42.8` - Device is rendering at normal frame rate
- `Sent 200 packets` - Packets are being transmitted to UART (every 200 packets = ~4.7 seconds)
- `last write 6 bytes` - Each packet successfully written (6 bytes expected)

**If you see different output:**
- `last write 0 bytes` - UART write is failing (check initialization)
- No "Sent X packets" message - Check if packets_sent counter logic is working
- FPS much lower than 42 - Frame rate is throttled

#### Expected S3Z Output

```
============================================
✓ S3Z FIRMWARE READY
Waiting for sync packets from primary...
============================================

UART: RX=42 packets, Invalid=0, State=SYNCED(GREEN), sync_valid=1
UART: RX=85 packets, Invalid=0, State=SYNCED(GREEN), sync_valid=1
UART: RX=127 packets, Invalid=0, State=SYNCED(GREEN), sync_valid=1
UART: RX=169 packets, Invalid=0, State=SYNCED(GREEN), sync_valid=1
```

**What it means:**
- `RX=42 packets` - Device received 42 packets (approximately 1 second of data at 42 FPS)
- `Invalid=0` - No checksum errors (packet format is correct)
- `State=SYNCED(GREEN)` - Status LED is green (sync is active)
- `sync_valid=1` - Device has valid sync data from primary

**If you see different output:**
- `RX=0 packets` - No packets being received (check UART wiring)
- `Invalid=20` (non-zero) - Checksum errors (check signal integrity)
- `State=TIMEOUT(YELLOW)` - Packets arrived initially but stopped (intermittent connection)
- `State=LISTENING(BLUE)` - No packets ever received (UART not working)

### LED Observation

Simultaneously observe the physical LED on S3Z:

**Expected S3Z Status LED Behavior:**
```
Timeline:
T=0:     Cyan pulsing (BOOTING)
T=1-2s:  Blue pulsing (LISTENING, waiting for packets)
T=2-3s:  Green solid with bright flashes (SYNCED, receiving packets at ~42 Hz)
T=30s:   Green continues flashing (sync stable)
```

**What each state means:**
- Cyan → Blue: Firmware initialized, UART ready
- Blue → Green: First packet received and validated
- Green flashes: Packet arriving (one flash per packet from S3Main)

**If you see different behavior:**
- Stays Blue indefinitely: UART not receiving packets
- Blinks Red: Checksum errors detected
- Green → Yellow: Packets arrived then stopped (connection lost)

## Analysis Phase

### Test Case 1: Successful Sync
**Condition:** `RX increasing` + `Invalid=0` + `State=SYNCED(GREEN)` + `LED green`

**Verdict:** UART sync is working correctly

**Next steps:**
- Verify packet data is correct by checking `sync_frame` matches FPS
- Monitor for 5+ minutes to ensure stability
- Test with patterns to verify data is being used

### Test Case 2: Packets Lost or Intermittent
**Condition:** `RX increases` but `State=TIMEOUT` intermittently

**Likely cause:** Loose UART connection

**Diagnostics:**
1. Check GPIO 38 → GPIO 44 wire for loose connections
2. Check GPIO 37 → GPIO 43 wire for loose connections
3. Check GND connection between devices
4. Try reseating both ends of the wires
5. Repeat test

**Fix if needed:**
- Use shorter wires if possible
- Use shielded twisted pair cable
- Add ferrite toroid around UART lines

### Test Case 3: No Packets Received
**Condition:** `RX=0` + `State=LISTENING(BLUE)` + `LED stays blue`

**Diagnostic steps (in order):**

**Step 3a:** Check S3Main is transmitting
- Look for "UART: Sent X packets" message on S3Main console
- If NOT present: S3Main UART transmission is broken
  - Check UART initialization in setup()
  - Verify FRAMES_COUNTED is incrementing (check FPS output)
  - Check uart_write_bytes() return value

- If present: S3Main is transmitting, but S3Z not receiving
  - Verify wiring: GPIO 38 (S3Main TX) → GPIO 44 (S3Z RX)
  - Check for shorts or open circuits
  - Try swapping wires to verify pinout

**Step 3b:** Verify S3Z UART is initialized
- Look for "✓ UART1 receiver initialized (GPIO 44 RX, GPIO 43 TX)" message
- If NOT present: UART initialization failed
  - Check if uart_driver_install() is returning error
  - Verify GPIO 44 and 43 are available

**Step 3c:** Check for physical wiring issues
- Power off both devices
- Inspect UART wires for:
  - Loose solder connections
  - Bent pins
  - Corrosion
  - Short circuits
- Reseat wires firmly
- Power back on and retry

### Test Case 4: Checksum Errors
**Condition:** `Invalid>0` + `RX increases` + intermittent `State=ERROR(RED)`

**Likely cause:** Signal integrity issue

**Diagnostics:**
1. Count how many invalid packets: `invalid_rate = Invalid / (RX + Invalid)`
2. If invalid_rate > 5%: Serious signal issue
3. If invalid_rate < 1%: Occasional noise, likely acceptable

**Fix if needed:**
- Use shielded twisted pair for UART lines
- Move boards away from high-frequency sources (WiFi, USB hubs)
- Reduce UART cable length
- Add 0.1µF capacitors across 3.3V-GND near UART pins

### Test Case 5: S3Main Not Transmitting
**Condition:** No "UART: Sent" messages on S3Main + FPS showing normally

**Diagnostic steps:**

**Step 5a:** Check frame counting
- S3Main shows "FPS: 42.8" - Frame counting is working
- But no "Sent X packets" message in output

**Step 5b:** Likely causes:
1. `packets_sent` counter is 0 (modulo 200 check never triggers)
2. `uart_write_bytes()` is failing silently
3. Print buffer is full (unlikely)

**Fix:**
- Modify send_uart_sync_frame() to print every packet temporarily:
  ```cpp
  Serial.printf("UART: TX byte 0=%02X (frame %lu)\n", packet[0], current_frame);
  ```
- Recompile and verify output
- If output appears: UART write is working but debug output wasn't printing before

## Recovery Procedures

### If UART Communication Never Established

1. **Verify physical wiring:**
   ```
   S3Main      →    S3Z
   GPIO 38 TX  →    GPIO 44 RX
   GPIO 37 RX  ←    GPIO 43 TX
   GND         →    GND
   ```

2. **Test UART independently:**
   - Connect oscilloscope or logic analyzer to TX/RX lines
   - Verify signal is present on S3Main GPIO 38
   - Verify signal is present on S3Z GPIO 44
   - Check baud rate: Should be ~115200 bits/second (10.8 µs per bit)

3. **Reprogram devices:**
   ```bash
   # S3Main
   cd firmware && pio run -t upload --upload-port 192.168.1.103.local

   # S3Z
   cd s3z && pio run -t upload --upload-port /dev/cu.usbmodem212401
   ```

4. **Power cycle both devices:**
   - Turn off S3Main, wait 5 seconds
   - Turn off S3Z, wait 5 seconds
   - Turn on S3Main, wait 10 seconds (for WiFi)
   - Turn on S3Z, wait 5 seconds
   - Observe serial output

### If Intermittent Connection

1. **Identify disconnect pattern:**
   - Does it disconnect regularly (every N seconds)?
   - Or randomly?
   - Regular pattern suggests timeout issue, random suggests noise

2. **Check timeout logic:**
   - S3Z timeout is 1000ms (line 320 in s3z/src/main.cpp)
   - If S3Main sends at 42 Hz, packets should arrive every 24ms
   - If gap > 1000ms, S3Z declares timeout

3. **Monitor packet arrival time:**
   - Add timestamp to reception (modify parse_sync_packet):
   ```cpp
   static uint32_t last_packet_ms = 0;
   uint32_t now_ms = millis();
   if (now_ms - last_packet_ms > 100) {
       Serial.printf("Gap: %lu ms since last packet\n", now_ms - last_packet_ms);
   }
   last_packet_ms = now_ms;
   ```

## Success Criteria

System passes verification when:

- [ ] S3Main shows "UART: Sent X packets" messages regularly
- [ ] S3Z shows "UART: RX=Y packets, Invalid=0" with Y increasing by ~42 each second
- [ ] S3Z status LED shows green and flashing
- [ ] No "State=TIMEOUT" or "State=ERROR" messages on S3Z
- [ ] Test sustained for at least 5 minutes without errors

## Cleanup

Remove debug instrumentation after verification:

**S3Main:** Remove or comment out lines 119-125 in `/firmware/src/main.cpp`
**S3Z:** Remove or comment out lines 469-483 in `/s3z/src/main.cpp`

Or keep the instrumentation for ongoing monitoring of UART health.

## Troubleshooting Reference

| Symptom | Cause | Check First |
|---------|-------|------------|
| Blue LED, no packets | UART not initialized or S3Main not sending | S3Main "Sent" messages |
| RX=0, yellow LED after 1s | Packets not arriving | GPIO 38→44 connection |
| Invalid checksums | Data corruption | Signal integrity, wiring |
| Packets arrive then stop | Intermittent connection | Reseat wires, check cable |
| Sent messages but RX=0 | Wiring reversed or incomplete | Check all three connections |

## Related Documentation

- `/docs/analysis/UART_DAISY_CHAIN_DIAGNOSTIC.md` - Complete technical analysis
- `/s3z/STATUS_LED_INDICATORS.md` - Status LED state reference
- `/firmware/src/main.cpp` lines 72-128 - S3Main UART code
- `/s3z/src/main.cpp` lines 173-325 - S3Z UART code
