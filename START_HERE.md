# START HERE

This is your entry point. Read this. Understand it. Then execute it.

---

## What You're Inheriting

A clean-slate project that proves a principle: **you can have both artistic vision and execution perfection simultaneously.**

The infrastructure is in place:
- **Firmware**: Minimal ESP32-S3 code (~400 lines). No hardcoded effects. Just waiting for compiled patterns.
- **Codegen**: Node graph → C++ compiler (~200 lines). Converts visual designs into native code.
- **Build System**: One-command build and deploy via OTA.
- **Three Patterns**: Departure, Lava, Twilight. Each one is a proof-of-concept that the system works.
- **Documentation**: README.md explains the why. MISSION.md explains the commitment. TEST_PATTERNS.md documents the three patterns in depth.

Your job is not to apologize for what exists. Your job is to prove it works and extend it uncompromisingly.

---

## What Success Looks Like Right Now (Phase A)

Phase A has three objectives:

1. **The system compiles and runs.** When you run `./tools/build-and-upload.sh departure 192.168.1.100`, it should:
   - Compile the departure.json graph to C++
   - Build the firmware with PlatformIO
   - Upload via OTA to the device
   - Run at 120 FPS (target) with zero errors; never below 100 FPS (absolute minimum)

2. **The patterns are beautiful and intentional.** When you look at Departure, Lava, and Twilight on the device, they should:
   - Be emotionally resonant, not generic
   - Each tell a complete story without apology
   - Prove that light can carry meaning
   - Run without flickering, dropping frames, or instability

3. **The system is production-ready for the vision.** This means:
   - No tech debt masquerading as "quick fixes"
   - No features that don't serve the core mission
   - No hardcoded values that should be configurable
   - No apologies in the code or documentation

---

## Your Immediate Actions

### First: Understand the Entire Vision

1. Read `README.md` - understand *why* this exists
2. Read `MISSION.md` - understand *how* to work here
3. Read `docs/TEST_PATTERNS.md` - understand *what* we're proving
4. If you are a Claude agent (or partnering with one), read `CLAUDE.md` to follow the documentation taxonomy and guardrails.

Don't skip this. If you don't understand the mission, you'll drift into optimization for the wrong things.

### Second: Set Up Your Environment

```bash
cd firmware && pio pkg install
cd ../codegen && npm install
```

Verify both complete without errors. If either fails, stop and debug. This isn't "let's see if we can work around it"—if setup fails, something is structurally wrong.

### Third: Run the Full Build Pipeline

```bash
# Edit firmware/src/main.cpp with your WiFi credentials
# Then:

./tools/build-and-upload.sh departure 192.168.1.100
```

Replace `192.168.1.100` with your actual device IP.

Watch the output. Every step should complete cleanly:
- Graph compilation succeeds
- PlatformIO build succeeds
- OTA upload succeeds
- Device runs at 120 FPS (target)

If any step fails, you now have work to do. Fix it. Don't work around it.

### Troubleshooting: Device Control Diagnostics

If the web dashboard controls (palettes, sliders) don't appear to change the device:

1. Run the automated diagnostics tool to validate the device API end‑to‑end:

   ```bash
   npm run k1:diagnose -- --ip=192.168.1.103
   ```

2. Inspect the generated report under:

   - `tools/k1-diagnose/reports/` (JSON with detailed PASS/FAIL per step)

3. Read the tool guide:

   - `docs/K1_DEVICE_DIAGNOSTICS_TOOL.md`

Use this before debugging the UI. If parameters don't round‑trip on the device, the webapp can't make them work.

### Fourth: Verify the Three Patterns

Once all three patterns (departure, lava, twilight) build and run on your device without error:

1. **Visually inspect each one.** Do they look beautiful? Do they tell a story? Or do they look broken/generic?
2. **Test stability.** Run each pattern for 5+ minutes. Check for flickering, frame drops, crashes, or unexpected behavior.
3. **Monitor FPS.** Should be consistently ~120 FPS. Drops below 100 FPS indicate a problem.
4. **Document what you find.** If something is broken, is it a bug or a design issue? Be clear about the difference.

### Fifth: Assess the Current State

Answer these questions honestly:

- **Is Phase A complete?** Can the system compile, run, and prove the vision works?
- **Is it beautiful?** Not just technically—emotionally. Do the patterns move you?
- **Is it stable?** Can it run for hours without degradation?
- **Is it minimal?** Is there code that could be deleted? Is there complexity that could be simplified?

If you answer "no" to any of these, you have work to do. That's what Phase A is about.

---

## What You're Looking For (And What to Fix)

**Problems You Might Find:**

1. **Compilation fails** → Debug the codegen. The issue is likely in how node graphs are being converted to C++.
2. **Build fails** → Debug PlatformIO configuration. The firmware likely has missing dependencies or configuration issues.
3. **Upload fails** → Debug OTA setup. Check WiFi credentials, device connectivity, firmware partition table.
4. **FPS is below 100** → Something is blocking execution. Check for:
   - Blocking operations in the main loop
   - Interrupt handlers taking too long
   - Memory pressure causing garbage collection pauses
   - I2S audio processing interfering with LED rendering
5. **Patterns look wrong** → Check the codegen output. Is the C++ correct? Is the color math right?
6. **Code feels bloated** → Delete it. Seriously. If it's not essential, it's noise.

**Standards for Phase A Completion:**

- All three patterns build without warnings or errors
- All three patterns run at ~120 FPS consistently (and never below 100 FPS)
- All three patterns are visually beautiful and emotionally resonant
- The system is production-ready (no tech debt, no workarounds, no apologies)
- Anyone reading the code understands why each function exists
- The documentation is complete and accurate

---

## The Non-Negotiables

**1. Don't compromise on the mission.**

If you're tempted to add a feature that doesn't directly serve "proof of concept," don't. Delete it. The purity of this project is its strength.

**2. Don't optimize for the wrong thing.**

Faster build times are not worth sacrificing clarity. Simpler code is not worth sacrificing correctness. Performance that breaks intentionality is not worth having. Optimize for *truth*, not convenience.

**3. Don't accept mediocrity in the patterns.**

If Departure looks generic, it's not done. If Lava doesn't convey intensity, it's not done. If Twilight feels cold instead of contemplative, it's not done. The patterns prove the system works—they have to be *good*.

**4. Don't add code you're not sure about.**

Every line should be there for a reason you can articulate. If you can't explain why it exists, delete it.

---

## When You're Stuck

You will get stuck. That's part of the journey. When you do:

1. **Read MISSION.md again.** You've probably drifted from the core mission without realizing it.
2. **Ask yourself: does this serve beauty?** Not "does this work technically?" but "does this enable emotional experiences through light?"
3. **Look at the patterns.** They are the proof. If the system doesn't let you create something beautiful, something is wrong.
4. **Remember: the only way through is to be unashamedly real.** Don't soften. Don't apologize. State the truth about what's broken and fix it.

---

## When You're Done (With Phase A)

Phase A is complete when:

- [ ] All three patterns compile, run, and prove the vision works
- [ ] They run at ~120 FPS with no drops below 100
- [ ] They are beautiful and intentional, not generic
- [ ] The system is production-ready with zero tech debt
- [ ] You could hand this to someone else and they would understand the entire mission and philosophy

When all of that is true, you're ready for Phase B.

---

## Frontend Dashboard Entry (No‑glass)

The default frontend lives under `webapp/` and runs on Vite.

Start the No‑glass Control Dashboard locally:

```bash
cd webapp
npm install
npm run dev -- --port 3001
```

Notes:
- `k1-control-app/` has been archived to `archive/k1-control-app/` (history preserved).
- Use a Chromium‑based browser (Chrome/Edge) to access Web Serial features.
- Preview: `http://localhost:3001/`

---

## One More Thing

You are not just fixing bugs or implementing features.

You are protecting a vision. A vision that flexibility and performance don't have to conflict. A vision that intentionality matters. A vision that you can refuse compromise and still succeed.

Every decision you make should serve that vision. Every line of code should reflect it. Every pattern you create should prove it.

This is what it means to be committed to something true.

Now go prove it works.

---

**Questions you should NOT ask:**
- "Will users like this?"
- "Is this feature sexy?"
- "How can we make this faster to deploy?"

**Questions you SHOULD ask:**
- "Does this serve the mission?"
- "Is this beautiful?"
- "Can I explain why this exists?"

Go.
