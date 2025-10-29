# S3Z Status LED Indicators

## Overview
The Waveshare ESP32-S3-Zero has a WS2812 status LED on **GPIO 21** that provides real-time visual feedback of the UART daisy chain synchronization status.

## Status States and Colors

### 🔵 BOOTING (Cyan, Pulsing)
- **When**: Device is starting up (first 1-2 seconds after power-on)
- **What it means**: Firmware initialization in progress
- **Action needed**: Wait for LED to change to blue (LISTENING state)
- **Visual**: Cyan color fades in and out smoothly

### 🔵 LISTENING (Blue, Slow Pulse)
- **When**: Device is running and waiting for UART packets from primary
- **What it means**: Firmware is ready but hasn't received sync data yet
- **Action needed**: Check primary device is powered on and UART wires are connected
- **Visual**: Blue color slowly pulses (breath effect every 1.5 seconds)
- **Next step**: Once primary starts, LED should change to GREEN

### 🟢 SYNCED (Green, Bright Flash)
- **When**: Device is actively receiving sync packets from primary
- **What it means**: UART connection working, pattern sync active
- **Action needed**: None - system is operating normally
- **Visual**:
  - Bright green flash when packet arrives (~50ms)
  - Fades to dim green between packets
  - Flashing = healthy sync at ~200 FPS

### 🟡 TIMEOUT (Yellow/Orange, Pulsing)
- **When**: No sync packets received for >1 second
- **What it means**: UART connection lost or primary device crashed
- **Action needed**:
  1. Check UART wires (GPIO 38→44, GPIO 37→43, GND)
  2. Verify primary device is running
  3. Check for power issues on either board
- **Visual**: Yellow/orange color slowly pulses

### 🔴 ERROR (Red, Rapid Blink)
- **When**: Checksum error in UART packet detected
- **What it means**: UART data corruption, usually due to:
  - Loose/bad wire connections
  - EMI/RF interference
  - Baud rate mismatch
- **Action needed**:
  1. Re-seat UART wires firmly
  2. Check for loose connections
  3. Reduce distance between boards if possible
  4. Try shielded twisted pair for UART lines
- **Visual**: Red color rapidly blinks (visible error indication)
- **Duration**: Error state persists for 500ms, then returns to SYNCED/LISTENING

## Quick Reference Table

| LED Color | Animation | Meaning | Status |
|-----------|-----------|---------|--------|
| Cyan | Fade in/out | Booting | 🟡 Transient |
| Blue | Slow pulse | Listening for UART | ✓ OK |
| Green | Bright flash → fade | Synced & receiving | ✓ OK |
| Yellow | Pulse | Timeout (>1s no sync) | ⚠️ Warning |
| Red | Rapid blink | Checksum error | ❌ Error |

## UART Protocol
The status LED responds to the 6-byte sync packet format:
```
[0xAA] [FRAME_HI] [FRAME_LO] [PATTERN_ID] [BRIGHTNESS] [CHECKSUM]
```

When a valid packet is received:
- Green LED flashes briefly
- LEDs update to match sync_pattern
- Brightness syncs to primary device

## Troubleshooting Guide

### LED stays blue (LISTENING) indefinitely
1. **Check power**: Verify s3z is powered on
2. **Check UART wires**:
   - Primary GPIO 38 → Secondary GPIO 44 (RX)
   - Primary GPIO 37 ← Secondary GPIO 43 (TX)
   - Both GND connected
3. **Check primary**: Verify K1.reinvented is running and UART initialized
4. **Check firmware**: Re-flash s3z firmware

### LED blinks red (ERROR)
1. **Inspect wires**: Look for loose connections
2. **Try different cables**: Replace UART wires with known-good ones
3. **Shorter distance**: Move boards closer together
4. **Shielded cable**: Use twisted pair or shielded wire

### LED shows green then immediately turns yellow (TIMEOUT)
1. **Packet loss**: Wires may be intermittent
2. **Baud rate**: Verify both devices using 115200 bps
3. **UART pins**: Double-check GPIO mappings (38/37 on main, 44/43 on s3z)

## Testing the Status LED

### Manual Test (without primary device)
You can test the status LED independently:
1. Power on s3z alone
2. Observe LED sequence: Cyan → Blue (LISTENING)
3. LED should be blue and pulsing

### With Primary Device
1. Power on primary K1.reinvented
2. Power on s3z
3. LED sequence: Cyan → Blue → Green (once sync achieves)
4. Green LED should flash with each frame (~200 FPS = ~200 flashes/sec)

## LED Brightness Levels

The status LED is controlled independently from the main LED strip:
- Does NOT respond to brightness slider on web UI
- Runs at fixed brightness to ensure visibility
- Always visible for diagnostics

## Performance Notes

- LED state updates every 10ms (100 Hz)
- Minimal CPU overhead (<1% of Core 0 render time)
- Does not interfere with audio processing or pattern rendering
- Status LED updates BEFORE patterns render, so timing is consistent
