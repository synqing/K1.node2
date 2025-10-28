# K1.reinvented Product Overview

K1.reinvented is proof that creative expression doesn't require compromise. This system refuses the false choice between flexibility and performance by compiling artistic vision into native machine code—not interpreting it at runtime.

## Core Philosophy

**The premise that you must choose between creative flexibility and execution performance is a lie.** This project exists to prove it's a lie.

When you understand that the computer should be creative and the device should be fast, you stop asking the device to do both. You compile artistic vision into machine code. Not interpreted. Not approximated. Compiled.

That distinction changes everything about what's possible.

## System Components

- **Firmware** (ESP32-S3): Minimal runtime (~400 lines) that executes compiled patterns at 120+ FPS with real-time audio reactivity
- **Codegen** (TypeScript): Compiles JSON node graphs into optimized C++ code
- **Control App** (React): Professional web interface for pattern selection, parameter control, and real-time monitoring
- **Audio Pipeline**: Real-time spectral analysis, beat detection, and tempo tracking using SPH0645 MEMS microphone

## Design Principles

1. **Refuse False Trade-offs** - Flexibility and performance aren't opposites. Demand both uncompromisingly.
2. **Compile, Don't Interpret** - Creative work happens on the computer. Execution happens on the device. Never confuse these roles.
3. **Intentionality Over Everything** - Every line of code must serve the mission. If you can't explain why it exists, delete it.
4. **Ruthless Clarity** - Every function exists for a reason you can articulate. Every architectural decision serves the core mission. Delete anything that doesn't.

## Performance Targets

- LED rendering: 120 FPS target, never below 100 FPS
- Audio processing: 50 Hz update rate with <50ms end-to-end latency
- Pattern compilation: Single command build and OTA deploy
- Memory footprint: Minimal (~27KB for audio pipeline)

## Current State

Phase A complete: Three patterns (Departure, Lava, Twilight) prove the vision works. They're not just technically functional—they're emotionally resonant. They prove that light can carry meaning when you refuse to accept mediocrity.

**Non-Negotiables for All Work:**
- Don't compromise on the mission
- Don't optimize for the wrong thing (convenience over truth)
- Don't accept mediocrity in patterns or code
- Don't add code you're not sure about

Every decision serves one question: Does this enable beauty, or does it dilute it?
