---
title: OTA Deployment Failure - Systematic Diagnosis
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# OTA Deployment Failure - Systematic Diagnosis

**Date:** 2025-10-28
**Status:** INVESTIGATION IN PROGRESS
**Problem:** FPS still 42.3 despite firmware deployment

---

## Evidence Summary

### What Should Have Happened (New Firmware - 13ab26f)
```
run_audio_pipeline_once() called EVERY loop iteration (no timing throttle)
→ Main loop runs at ~200+ FPS
→ FPS output would show: 120-200+
```

### What IS Happening (Old Firmware - 40582ec)
```
if ((now_ms - last_audio_ms) >= 20ms) { run_audio_pipeline_once(); }
→ Main loop throttled to ~50Hz max, actually 42.3 Hz
→ FPS output shows: 42.3  ← EXACT MATCH WITH CURRENT OBSERVATION
```

### Conclusion
**Device is running OLD firmware (40582ec), not new firmware (13ab26f)**

---

## OTA Failure Symptoms

| Symptom | Means |
|---------|-------|
| OTA shows "Upload: [====...] 100% Done" | Upload successful |
| OTA shows "Result: OK" | Download to device succeeded |
| Device comes online after reboot | Device boot works |
| **BUT FPS unchanged (42.3)** | **Firmware switch FAILED** |

**Root Cause:** Device downloaded firmware but bootloader didn't switch to new partition

---

## Why This Happens With ESP32 OTA

ESP32 OTA has two app partitions:
- `app0` (current running firmware)
- `app1` (next firmware to be flashed to)

When OTA succeeds:
1. ✓ Download to `app1` completes
2. ✓ Checksum validation passes
3. ✗ **Bootloader fails to switch partition on next boot** (THIS FAILED)
4. ✗ Device reverts to running `app0` (old firmware)

Common causes:
- Partition table corrupted
- OTA_DATA partition out of sync
- Bootloader configuration wrong
- Device ran out of RAM during flash write

---

## Diagnostic Questions For User

**Need to verify which firmware is running:**

1. **Check serial console output**
   - Look for boot messages showing firmware version
   - Look for error messages during I2S init
   - Check if "run_audio_pipeline_once()" appears in logs

2. **Check if this log line appears:**
   ```
   // NEW CODE would show: no timing messages
   // OLD CODE would show: timing checks in output
   ```

3. **Measure actual I2S behavior:**
   - New code: acquire_sample_chunk() blocks ~8ms at random intervals
   - Old code: acquire_sample_chunk() blocked every 20ms  like a clock

4. **Physical device check:**
   - Can you access device's USB serial port directly?
   - Can you use esptool to read what's in flash?

---

## Next Steps (In Priority Order)

### Option 1: Force USB Direct Flash (RECOMMENDED)
```bash
# Use esptool directly instead of OTA
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware
esptool.py --port /dev/ttyUSB0 write_flash -z --flash_mode dio --flash_freq 80m \
  0x0 .pio/build/esp32-s3-devkitc-1/bootloader.bin \
  0x8000 .pio/build/esp32-s3-devkitc-1/partitions.bin \
  0x10000 .pio/build/esp32-s3-devkitc-1/firmware.bin
```

**Advantage:** Bypasses OTA partition switching logic entirely
**Disadvantage:** Requires physical USB connection

### Option 2: Check Device Serial Port For Error Messages
Connect USB and monitor boot output:
```bash
screen /dev/ttyUSB* 115200
# Watch for error messages during boot
```

### Option 3: Try OTA Again With Board Reset
- Disconnect power completely
- Wait 10 seconds
- Reconnect power
- Then try OTA upload again
- Watch serial console if possible

### Option 4: Erase OTA_DATA Partition
OTA_DATA might be corrupted. Try:
```bash
# Erase OTA data partition before OTA
esptool.py --port /dev/ttyUSB0 erase_region 0xe000 0x2000
```

---

## What I Will Do

**If device is still on old firmware after next deployment attempt:**

1. Stop pretending the fix works
2. Investigate why OTA isn't persisting (partition issue? bootloader?)
3. Try USB direct flash instead
4. Verify new firmware actually runs
5. THEN check if fix actually works

**No more documentation without verification.**

---

## Reference Commits

- **Old firmware (CURRENT running):** 40582ec
  - Has: `if ((now_ms - last_audio_ms) >= 20ms)` timing throttle
  - Result: FPS capped at ~42.3 Hz

- **New firmware (NOT RUNNING YET):** 13ab26f
  - Has: `run_audio_pipeline_once()` called directly
  - Expected: FPS 120+ Hz

---

**NEXT ACTION:** User provides serial console output or tries USB flash method
**GOAL:** Get device actually running commit 13ab26f so we can test if the fix works
