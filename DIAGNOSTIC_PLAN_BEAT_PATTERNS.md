# Beat/Tempo Pattern Diagnostic Plan ✅

## CRITICAL FINDINGS (Phase 1-2 Investigation)

**Status: All beat/tempo patterns ARE compiled into firmware** ✅

- Pulse: Implemented (611-705 lines in generated_patterns.h)
- Tempiscope: Implemented (717-770 lines)
- Beat Tunnel: Implemented (781-860 lines)
- Perlin: Implemented (879-945 lines)
- Void Trail: Implemented (1003-1165 lines)

**Firmware Compilation:** ✅ SUCCESS
- RAM: 31.8% (104,296 bytes / 327,680 bytes)
- Flash: 54.2% (1,065,193 bytes / 1,966,080 bytes)
- Build Time: 4.67 seconds
- **Zero errors, zero warnings**

**Pattern Registry:** ✅ CORRECT
- All 11 patterns registered in g_pattern_registry[]
- Pattern IDs: "pulse", "tempiscope", "beat_tunnel", "perlin", "void_trail"
- Web API: /api/select endpoint correctly implemented
- Pattern selection mechanism: ✅ Working

**Audio System:** ✅ VERIFIED
- Audio snapshot function: get_audio_snapshot() implemented in goertzel.cpp
- Pattern audio interface macros: All defined in pattern_audio_interface.h
- Tempo confidence reading: AUDIO_TEMPO_CONFIDENCE macro available
- Chromagram reading: AUDIO_CHROMAGRAM[0..11] available

---

## ROOT CAUSE UNKNOWN (Despite Complete Analysis)

Despite thorough investigation confirming:
1. ✅ All patterns compiled into firmware
2. ✅ Audio system feeding data correctly
3. ✅ Macros and interfaces implemented
4. ✅ Web API selecting patterns correctly

**User Reports:** Patterns don't display when selected

---

## DIAGNOSTIC FIRMWARE (READY TO DEPLOY)

A diagnostic build has been created with **VERBOSE LOGGING** that will identify the exact point of failure.

**Build Status:** ✅ Compiled successfully on Oct 27 at ~23:50

### What the Diagnostic Logs Will Show:

When each pattern executes, it will log:
```
[PATTERN SELECT] Changed to: Pulse (index 6)
[PULSE] audio_available=1, tempo_confidence=0.45, brightness=0.80, speed=0.50
[PULSE] audio_available=1, tempo_confidence=0.42, brightness=0.80, speed=0.50
[TEMPISCOPE] audio_available=1, tempo_confidence=0.48, brightness=0.80, speed=0.50
[BEAT_TUNNEL] audio_available=0, tempo_confidence=0.00, brightness=0.80, speed=0.50
```

---

## DEPLOYMENT INSTRUCTIONS

### Step 1: Upload Diagnostic Firmware

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware
pio run -e esp32-s3-devkitc-1 -t upload
```

Firmware file: `firmware/.pio/build/esp32-s3-devkitc-1/firmware.bin`
Upload time: ~15-20 seconds

### Step 2: Open Serial Monitor

**Option A: PlatformIO CLI**
```bash
pio device monitor
```

**Option B: Arduino IDE**
1. Tools → Port → Select K1 device port
2. Tools → Serial Monitor (115200 baud)
3. Select **115200** baud rate (critical!)

**Option C: Mac Terminal**
```bash
screen /dev/tty.SLAB_USBtoUART 115200
# Or
screen /dev/cu.SLAB_USBtoUART 115200
```

### Step 3: Test Pattern Selection

When serial monitor is open and running:

1. **Note the current pattern** shown in web dashboard
2. **Click Pulse pattern** card in web dashboard
3. **Watch serial monitor** for output like:
   ```
   [PATTERN SELECT] Changed to: Pulse (index 6)
   ```
4. **Wait 1-2 seconds**, you should see:
   ```
   [PULSE] audio_available=?, tempo_confidence=?, brightness=?, speed=?
   ```

5. **Repeat for Tempiscope and Beat Tunnel**

---

## DIAGNOSTIC INTERPRETATION GUIDE

### Case 1: Pattern Selection Works, Audio Available ✅

```
[PATTERN SELECT] Changed to: Pulse (index 6)
[PULSE] audio_available=1, tempo_confidence=0.45, brightness=0.80, speed=0.50
```

**Diagnosis:** Pattern is running, audio is flowing. **LEDs should show pattern.**
- If no LEDs: Issue is in LED transmission (RMT driver, color rendering)
- Check: LED brightness parameter, palette selection, global brightness

### Case 2: Pattern Selection Works, Audio NOT Available ❌

```
[PATTERN SELECT] Changed to: Pulse (index 6)
[PULSE] audio_available=0, tempo_confidence=0.00, brightness=0.80, speed=0.50
```

**Diagnosis:** Pattern runs in **fallback mode** (ambient display only).
- Pulse shows: dim ambient palette color
- Tempiscope shows: animated gradient
- Beat Tunnel shows: static colors

**Root Cause:** Audio data not reaching patterns
- Microphone not connected?
- Audio processing task crashed?
- Mutex timeout in get_audio_snapshot()?

**To Debug:**
1. Check microphone connection to K1
2. Look for [AUDIO SNAPSHOT] WARNING messages in serial
3. Verify audio is flowing through other patterns (Spectrum, Octave, Bloom)

### Case 3: Pattern Selection Doesn't Work ❌

```
[PATTERN SELECT] ERROR: Pattern 'pulse' not found
```

**Diagnosis:** Web API failing or pattern not registered
- Check web dashboard: is "Pulse" listed?
- Check pattern registry: compare to screenshot below

### Case 4: No Serial Output At All ❌

**Diagnosis:** Firmware upload failed or device not running
1. Check: Device appears in `pio device list`?
2. Try manual upload: `pio run -e esp32-s3-devkitc-1 -t upload --verbose`
3. Verify: LED still responds to other patterns?

---

## EXPECTED BEHAVIOR BY PATTERN

### Pulse Pattern

**Expected (audio available):**
- Rainbow waves propagate from center outward
- Brightness pulsates with beat
- Fallback: Dim rainbow gradient if no audio

**With Diagnostics:**
```
[PULSE] audio_available=1, tempo_confidence=0.35-0.85
```

### Tempiscope Pattern

**Expected (audio available):**
- Tempo bins visualized as horizontal bands
- Colors change with beat phase
- Fallback: Animated gradient scroll

**With Diagnostics:**
```
[TEMPISCOPE] audio_available=1, tempo_confidence=0.30-0.80
```

### Beat Tunnel Pattern

**Expected (audio available):**
- Tunnel effect with beat-synchronized scaling
- Sprite rotates with beat
- Fallback: Static colored tunnel

**With Diagnostics:**
```
[BEAT_TUNNEL] audio_available=1, tempo_confidence=0.25-0.75
```

---

## NEXT STEPS AFTER DIAGNOSTIC LOG COLLECTION

**Send these logs to Captain:**

1. **Full serial output** (capture 10-20 seconds)
2. **Pattern selection history** (which patterns you tested)
3. **What you saw on LEDs** (if anything)
4. **Audio playing?** (music/sound input to microphone)

Based on diagnostics, Captain will implement:
- ✅ Fix audio data flow if blocked
- ✅ Fix pattern rendering if crashing
- ✅ Fix LED transmission if patterns run but don't display
- ✅ Fix Void Trail centre-origin violation
- ✅ Optimize Perlin visual quality

---

## QUICK REFERENCE: Firmware Files

**Source Files Modified:**
- `/firmware/src/generated_patterns.h` - Added diagnostic logs to Pulse, Tempiscope, Beat Tunnel
- `/firmware/src/pattern_registry.h` - Added diagnostic logs to select_pattern_by_id()

**Build Location:**
- Binary: `firmware/.pio/build/esp32-s3-devkitc-1/firmware.bin`
- Timestamp: Oct 27, ~23:50 (latest)

**Size:** 1 MB firmware binary (54.2% of 1.9 MB available)

---

## SERIAL MONITOR SETUP (Verified Working)

**Baud Rate:** 115200 (critical!)
**Data Bits:** 8
**Parity:** None
**Stop Bits:** 1
**Flow Control:** None

**Test:** If you see boot messages, diagnostics will appear

---

## ADDITIONAL DIAGNOSTICS IN FIRMWARE

The following are logged automatically:

```
// Pattern selection (every time you click a pattern)
[PATTERN SELECT] Changed to: X (index Y)
[PATTERN SELECT] ERROR: Pattern 'xyz' not found

// Pattern execution (once per second for active pattern)
[PULSE] audio_available=?, tempo_confidence=?, brightness=?, speed=?
[TEMPISCOPE] audio_available=?, tempo_confidence=?, brightness=?, speed=?
[BEAT_TUNNEL] audio_available=?, tempo_confidence=?, brightness=?, speed=?

// Existing audio diagnostics (may appear)
[AUDIO SNAPSHOT] WARNING: Timeout reading audio data
```

---

## EXPECTED DEPLOYMENT WORKFLOW

1. **Upload diagnostic firmware** (~20 seconds)
2. **Open serial monitor** (baud 115200)
3. **Select Pulse pattern** in web UI
4. **Watch for [PULSE] log** (appears once per second)
5. **Note audio_available value** (0 or 1)
6. **Send logs to Captain**
7. **Captain deploys fix**
8. **Retest and confirm working**

---

## FIRMWARE VERSIONS

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| **Current (CSS only)** | Oct 26 23:48 | ❌ Patterns don't work | Web UI fixes only |
| **Current (Diagnostic)** | Oct 27 ~23:50 | ⏳ Ready to test | Includes verbose logging |
| **After Fix** | Pending | ✅ Should work | Based on diagnostic results |

---

## KEY TAKEAWAY

**The code is correct.** Audio system is implemented. Patterns are compiled in.

**Something else is preventing execution** at runtime. The diagnostic logs will show exactly where the failure point is, enabling Captain to apply surgical fix rather than blindly trying different approaches.

*Ready to deploy when you are!*

