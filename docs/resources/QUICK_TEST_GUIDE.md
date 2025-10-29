---
title: Quick Test Guide - Beat Detection Fix 🚀
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Quick Test Guide - Beat Detection Fix 🚀

**Firmware:** 4e3f202
**Status:** Ready to upload and test

---

## 30-Second Deploy

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware
pio run -e esp32-s3-devkitc-1 -t upload
pio device monitor --baud 115200
```

---

## What to Expect After Upload

**Serial Monitor Should Show:**
```
Initializing tempo detection...        ← NEW LINE (not in old firmware)
[PULSE] audio_available=1, tempo_confidence=0.45
```

**Key Change:** `tempo_confidence` should be **> 0.0** (was always 0.00 before)

---

## Test Sequence (5 minutes)

### 1. Pulse Pattern (2 min)
```
1. Open K1 web dashboard
2. Click "Pulse" pattern
3. Make loud sounds or play music with beats
4. EXPECT: Colorful waves radiate outward when you beat/tap
5. CHECK SERIAL: tempo_confidence value changes (0.3-0.8 range)
```

**✅ PASS:** See waves pulsing with beat
**❌ FAIL:** Only background gradient, no waves

---

### 2. Tempiscope Pattern (2 min)
```
1. Click "Tempiscope" pattern
2. Play music with clear beat (drums)
3. EXPECT: Spectrum visualization synchronized to beat
4. CHECK SERIAL: tempo_confidence > 0.2
```

**✅ PASS:** See rhythm bars moving with beat
**❌ FAIL:** Blank or static gradient only

---

### 3. Beat Tunnel Pattern (1 min)
```
1. Click "Beat Tunnel"
2. Play beat-heavy music
3. EXPECT: Tunnel scales/rotates with beat
4. CHECK SERIAL: tempo_confidence varies
```

**✅ PASS:** Tunnel pulses with beat
**❌ FAIL:** Static tunnel, no beat response

---

## Serial Monitor - What to Look For

### GOOD ✅
```
[PULSE] audio_available=1, tempo_confidence=0.45, brightness=1.00, speed=0.50
[PULSE] audio_available=1, tempo_confidence=0.38, brightness=1.00, speed=0.50
[PULSE] audio_available=1, tempo_confidence=0.52, brightness=1.00, speed=0.50
```
→ tempo_confidence is NOT 0.00 ✅
→ tempo_confidence changes ✅
→ Patterns updating ✅

### BAD ❌
```
[PULSE] audio_available=1, tempo_confidence=0.00, brightness=1.00, speed=0.50
[PULSE] audio_available=1, tempo_confidence=0.00, brightness=1.00, speed=0.50
```
→ tempo_confidence still 0.00 ❌
→ Beat detection not working ❌

---

## If Patterns Work ✅

Send confirmation and proceed to:
1. Fix Void Trail centre-origin bug
2. Optimize Perlin visuals
3. Tune beat sensitivity

---

## If Patterns DON'T Work ❌

Check these in order:

### 1. Audio Reaching K1?
```
Try other patterns: Spectrum, Octave, Bloom
If they work: ✅ Audio is fine
If they don't: ❌ Microphone issue
```

### 2. Firmware Updated?
```
Serial output should show:
"Initializing tempo detection..."
If not: Upload may have failed, retry
```

### 3. Serial Monitor at Correct Baud?
```
Must be 115200 baud
Check monitor dropdown
```

### 4. Music Playing into Microphone?
```
Play loud music or tap on microphone
Check Spectrum pattern for response
```

---

## One-Line Troubleshoot

```bash
# Re-upload firmware (clears any issues)
pio run -e esp32-s3-devkitc-1 -t upload
```

Then test Pulse pattern with loud sounds.

---

## Summary

| Pattern | Expected Behavior | Serial Indicator |
|---------|---|---|
| **Pulse** | Waves pulse with beat | tempo_confidence > 0.3 |
| **Tempiscope** | Spectrum syncs to beat | tempo_confidence > 0.2 |
| **Beat Tunnel** | Tunnel scales with beat | tempo_confidence varies |
| **Perlin** | Noise animation (no change) | Not beat-driven |
| **Void Trail** | Trail responds to beat | tempo_confidence varies |

---

## Expected Result

After uploading and playing music:

1. ✅ Serial shows `tempo_confidence` NOT 0.00
2. ✅ Pulse shows radial waves
3. ✅ Tempiscope shows tempo bars
4. ✅ Beat Tunnel shows pulse effect
5. ✅ LEDs respond to music in real-time

**If all 5 work: BEAT DETECTION IS FIXED! 🎉**

---

Ready? Upload firmware and test! Report back with results.

