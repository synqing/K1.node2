# Critical Code - What Must Never Break

This is **minimal governance**. Not complex validation. Just: don't break these three things.

---

## 1. Codegen Palette Interpolation

**File:** `codegen/src/index.ts`
**Function:** `generateNodeCode()` case `'palette_interpolate'`

**What it does:**
- Takes palette_data array from JSON graph
- Generates C++ code that interpolates between keyframes
- Maps LED position (0.0 to 1.0) to palette colors

**Why it's critical:**
If this breaks, all three patterns (Departure, Lava, Twilight) become generic gradients. The entire proof-of-concept fails. You've broken the mission.

**Protected logic:**
```typescript
// This must correctly:
// 1. Read palette_data from graph
// 2. Generate C++ array of colors
// 3. Create interpolation code that maps position to color
// 4. Handle edge cases (first/last LED)
```

**If you modify this:**
- Test all three patterns compile
- Verify generated C++ is valid
- Upload to device and confirm colors are correct
- If any pattern looks wrong, you broke it - revert

---

## 2. LED Driver Non-Blocking Transmission

**File:** `firmware/src/led_driver.h`
**Function:** Non-blocking WS2812B control via RMT

**What it does:**
- Transmits color data to LED strip without blocking
- Uses ESP32's RMT peripheral for precise timing
- Allows dual-core execution (audio + graphics)

**Why it's critical:**
Blocking LED transmission destroys the 450+ FPS capability. Audio processing would stall. The entire architecture collapses.

**Protected constants:**
- RMT timing values for WS2812B protocol
- GPIO pin assignments
- DMA buffer configuration

**If you modify this:**
- Verify timing matches WS2812B datasheet
- Test on actual hardware (not just compilation)
- Confirm FPS stays at 450+
- If LEDs flicker or go dark, you broke it - revert

---

## 3. Pattern Compilation Pipeline

**Files:**
- `codegen/src/index.ts` (graph → C++)
- `tools/build-and-upload.sh` (orchestration)
- `firmware/src/generated_effect.h` (output)

**What it does:**
- Takes JSON graph as input
- Generates C++ code
- Compiles with PlatformIO
- Uploads via OTA

**Why it's critical:**
This is the entire system. If the pipeline breaks, nothing works. Flexibility and performance both collapse.

**Protected flow:**
```
JSON graph → TypeScript codegen → C++ code → PlatformIO build → OTA upload → Device execution
```

**If you modify any step:**
- Verify the entire pipeline still works
- Test with all three patterns
- Confirm device receives and runs code
- If compilation or upload fails, you broke it - revert

---

## That's It

Three things. Protect them.

Everything else in this codebase can be modified, refactored, or deleted as long as those three things still work.

**The test is simple:**
1. Run `./tools/build-and-upload.sh departure 192.168.1.100`
2. Run `./tools/build-and-upload.sh lava 192.168.1.100`
3. Run `./tools/build-and-upload.sh twilight 192.168.1.100`

If all three work, you haven't broken anything critical.

If any fail, you broke the mission. Fix it.

---

**Remember:** This is minimal governance. The focus is on enabling creation, not preventing mistakes. But don't break these three things. They're the foundation everything else builds on.
