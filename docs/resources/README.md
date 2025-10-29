---
title: K1.reinvented
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented

## The Problem

Walk into any LED project community. Look at what exists. You'll find two categories of failure:

**Category 1: Static Systems**
Pre-programmed patterns that cycle endlessly. Generic gradients. Algorithmically generated variations. Hard-coded in firmware. Fast but rigid. Every new idea requires C++ recompilation.

**Category 2: Flexible Systems**
Runtime interpreters. JSON configurations. Network control. Visually designed. But the computational overhead destroys performance. You get responsiveness *or* smoothness, not both.

The root problem is the same in both: **flexibility OR performance. Creative freedom OR speed.**

Pick one. That's what everything tells you.

You can't have both. Not without some ugly middle ground where you lose everything to complexity.

This project exists because that premise is a lie.

---

## The Awakening

Three years of iteration. Eight different architectural approaches. Every iteration reinforced the same false choice. Hard-coded effects were fast but rigid. Network control was flexible but complex. Runtime interpretation was creative but slow.

Each failure taught the same lesson: you can't escape the trade-off by trying harder.

The breakthrough didn't come from a new algorithm or a clever optimization. It came from asking a different question:

**What if we move the creative work to the wrong device?**

Don't ask the *device* to be creative. Don't ask a tiny embedded system with limited RAM to interpret JSON, evaluate node graphs, and execute effects in real-time. Of course that fails.

Ask the *computer* to be creative. Let the computer do what it's good at: visual thinking, flexibility, iteration. Node graphs. Visual composition. Artistic decision-making.

Then ask the *device* to be fast. Compile the artistic vision into native C++. Zero interpretation overhead. Native speed. The device runs what the computer created, at full fidelity, no compromise.

Suddenly: **complete flexibility paired with complete execution purity.**

No trade-off. No compromise. Both, entirely.

That's the revolution.

---

## What This Means

Most people don't understand what they're looking at when they first encounter code generation. They think it's a convenience. A wrapper. A build step that saves some typing.

It's not. It's a *creative medium.*

Think about shader languages. They enabled graphics programmers to create stunning visuals by writing mathematical code that the GPU compiles and executes perfectly. The shader language didn't exist because typing was hard—it existed because it was the *right way* to think about the problem.

Node graphs compiled to C++ are the same. They're not convenient—they're *true*. They're the right way to think about the problem of creating beautiful effects while demanding perfect execution.

When you create a node graph here, you're not giving instructions for a runtime to interpret. You're creating a blueprint that will be compiled into optimized native code. Your artistic vision becomes machine code. Not interpreted. Not approximated. *Compiled.*

That distinction changes everything.

---

## What We Built

Three patterns. Each one is a *statement*.

**Departure:** The palette of transformation. Dark earth → golden light → pure white → emerald green. This is what it feels like when you change and can't go back. When you awaken. It's the story of growth in light form.

**Lava:** Intensity without apology. Black → deep red → blazing orange → white hot. This is what it feels like when something inside you demands expression without filtering. No restraint. No gentleness. Pure passion.

**Twilight:** The space between. Warm amber → deep purple → midnight blue. This is contemplation. Reflection. The moment when day releases you and night welcomes you. Peace.

Together, these three patterns are proof. They prove that light can carry meaning. That intentionality matters. That you can create something beautiful without accepting compromise.

Each pattern exists because someone *decided* it should exist. Not because an algorithm generated it. Not because it was a default. Because it was *chosen*.

---

## Why We Rejected the Rainbow

A rainbow is the absence of choice.

It's the default gradient. The thing you get when you don't decide what you want to say. It appears everywhere because it requires no thought. No creative decision. No understanding of what you're trying to communicate.

In a project built on intentionality, accepting a rainbow would have been a betrayal of the entire mission.

We didn't reject it because of taste. We rejected it because taste without intention is just decoration. And this project isn't about decoration. It's about *meaning*.

---

## How This Works

```
Your artistic vision (node graph)
         ↓
Compilation (TypeScript → C++)
         ↓
Native code on device
         ↓
~120 FPS execution (100 FPS minimum)
         ↓
Light expressing your intention without compromise
```

The system is ruthlessly minimal. 1,200 lines of code across firmware and codegen. That's not efficient—that's *uncompromising*. Every line exists for a reason. Every function serves the mission. If you find yourself adding code that doesn't directly enable beauty, you delete it.

This is the opposite of modern software development. Modern software apologizes for complexity by adding more features. This project refuses that compromise. Radical minimalism. Undecorated. Pure.

---

## For Those Ready to Build

This is not for people who want a hobby project. This is for people tired of mediocrity. Who look at what exists and think "there has to be better." Who believe intention matters. Who understand that saying *no* to compromise is more important than saying *yes* to everything.

If that's not you, stop reading. There are plenty of other LED libraries.

If it is you, here's how to start:

### Step 1: Set Your Credentials

Edit `firmware/src/main.cpp`:
```cpp
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASS "YOUR_PASSWORD"
```

### Step 2: Create Your Statement

Choose one of the patterns and compile it into your device:

```bash
# The story of transformation and growth
./tools/build-and-upload.sh departure 192.168.1.100

# Unapologetic passion and intensity
./tools/build-and-upload.sh lava 192.168.1.100

# Peaceful contemplation and rest
./tools/build-and-upload.sh twilight 192.168.1.100
```

That's it. The build script handles everything: graph compilation, C++ code generation, PlatformIO build, and OTA upload.

### Step 3: Witness It

```bash
cd firmware
pio device monitor --baud 2000000
```

Watch as your intention becomes light at ~120 FPS.

---

## The Architecture (And Why Each Choice Matters)

**Node graphs are visual composition, not configuration.**
Node graphs aren't a way to configure effects. They're a medium for artistic expression. This changes how you think about building them.

**Compilation is the bridge between artistic vision and execution perfection.**
Compiling to C++ isn't a performance optimization—it's the *right way* to execute artistic code. It removes all barriers between what you intend and what happens. No interpretation. No approximation. No compromise.

**Code generation is creative automation, not mere convenience.**
The codegen tool doesn't exist because writing C++ by hand is hard. It exists because node graphs are the right way to *think* about the problem, and C++ is the right way to *execute* it. The compilation step is the translation between those two correct domains.

**Minimalism is uncompromising intentionality.**
Every line of code is a choice. The core system (firmware + codegen) is ruthlessly minimal: no unnecessary abstractions, no feature bloat. When you add patterns, each one must justify its existence by saying something true through light.

This is what uncompromising software looks like.

**ESP32-S3 dual core execution.**
(Domain 1) Graphics rendering at ~120 FPS on Core 0, optional future use on Core 1. (Domain 2, future) Audio processing on Core 1, graphics rendering on Core 0. No bottlenecks. No trade-offs. Both running at full capacity, in parallel, without interference.

**OTA updates with automatic rollback.**
You can update firmware over WiFi, and if the new code crashes within 30 seconds, it rolls back automatically. This means you can iterate fearlessly.

---

## Two Distinct Domains Under One Architecture

K1.reinvented solves the flexibility/performance dilemma using the same architectural foundation, but applies it to two distinct problem domains:

### Domain 1: Intentional Static Patterns

**What they are:** Carefully composed, time-based light expressions. No external data input. Pure artistic statements.

**Examples:** Departure, Lava, Twilight

**How they work:**
- Node graph compiled to C++ at build time
- Time accumulation drives the expression
- No audio input required
- ~120 FPS execution
- Core 0: LED rendering

**Philosophy:** Each pattern exists because someone *decided* it should exist. A statement about what deserves to be expressed through light. The pattern is complete in itself.

### Domain 2: Audio-Reactive Visualizations

**What they are:** Patterns driven by real-time music analysis. Light responding to sound with full artistic control.

**Key difference from Domain 1:** They accept audio data as input and respond to music in real-time, computed at compile-time (not interpreted at runtime).

**How they work:**
- Same node graph → C++ compilation pipeline
- Additional node types for frequency analysis, beat detection, spectrum mapping
- Audio input via I2S microphone (live Goertzel analysis + FFT)
- Core 0: LED rendering (uses audio snapshot)
- Core 1: continuous audio capture and analysis

**Philosophy:** The same principle applies: move complex decision-making to compile time. Don't ask the device to interpret music in real-time. Ask the computer to design how patterns *should* respond to music, then compile that logic into C++. The pattern responds to music, but that responsiveness is baked into the C++.

### The Shared Foundation

Both domains use the same:
- **Compilation pipeline** (graphs → C++)
- **Pattern registry** (switch at runtime without recompiling)
- **Thread-safe parameter updates** (adjust speed, brightness, etc. live)
- **Web API** (optional runtime control)
- **Minimalism principle** (every line serves the mission)

The architectural difference is what data flows into the render loop:
- Domain 1: `draw_current_pattern(time, params)`
- Domain 2: `draw_current_pattern(time, params, audio_snapshot)`

Both execute at native C++ speed. Both demand artistic intentionality. Both refuse compromise.

---

## Project Structure

```
K1.reinvented/
├── firmware/
│   ├── src/
│   │   ├── main.cpp           # Entry point (no hardcoded effects)
│   │   ├── types.h            # CRGBF color type (HDR precision)
│   │   ├── led_driver.h       # Non-blocking WS2812B control
│   │   └── generated_effect.h # CODE-GENERATED from your node graph
│   └── platformio.ini
│
├── codegen/
│   └── src/index.ts           # Graph → C++ compiler (~200 lines)
│
├── graphs/
│   ├── departure.json         # Your artistic statements
│   ├── lava.json
│   └── twilight.json
│
├── docs/
│   └── TEST_PATTERNS.md       # Deep dive into each pattern
│
└── tools/
    └── build-and-upload.sh    # One-command build system
```

---

## The Three-Year Journey

- **2022:** Hard-coded effects in firmware. Fast but inflexible. Every new idea meant changing C++ code.
- **2023:** Network control from computer (OSC). Flexible authoring but the system complexity exploded.
- **2024:** Runtime JSON interpretation. Visual design but sacrificed performance entirely.
- **2025:** **Compilation to native code.** Finally understood that the solution wasn't to try harder—it was to ask the *right device* to do the *right work*.

Three years to understand that separation of concerns isn't just a code pattern. It's a philosophical principle: let the computer be creative, let the device be fast.

---

## Advanced Usage

**Compile a graph manually:**
```bash
cd codegen && npm run build
node dist/index.js ../graphs/departure.json ../firmware/src/generated_effect.h
```

**Build firmware without OTA:**
```bash
cd firmware && pio run
```

**Initial USB flash (one time only):**
```bash
cd firmware && pio run -t upload
```

**Subsequent WiFi updates:**
```bash
./tools/build-and-upload.sh lava 192.168.1.100
# or
./tools/build-and-upload.sh lava k1-reinvented.local
```

---

## Runtime Control (Registry, Parameters, Web)

**Pattern Registry (firmware)**
- Files: `firmware/src/pattern_registry.h`, `firmware/src/generated_patterns.h`
- Concept: Patterns are registered with metadata and a function pointer. Switch at runtime without recompiling firmware.
- API highlights:
  - `select_pattern(uint8_t index)` → switch by index (bounds-checked)
  - `select_pattern_by_id(const char* id)` → switch by stable ID string
  - `get_current_pattern()` → inspect current selection
  - `draw_current_pattern(time, params)` → renders the selected pattern

Minimal example (inside your loop):
```cpp
extern float g_time; // your time accumulator
draw_current_pattern(g_time, get_params());
```

**Runtime Parameters (thread-safe)**
- Files: `firmware/src/parameters.h`, `firmware/src/parameters.cpp`
- Concept: Double‑buffered parameters updated on Core 0 (e.g., web) and read on Core 1 (render) without tearing.
- API highlights:
  - `init_params()` → initialize buffers with `get_default_params()`
  - `get_params()` → read active parameter set in render loop
  - `update_params_safe(new_params)` → validate and swap atomically

Parameter struct includes: `speed`, `brightness`, `palette_id`, `palette_shift`, `beat_sensitivity`, `spectrum_low/mid/high`, `custom_param_1..3`.

**Web Server (optional, async)**
- File: `firmware/src/webserver.h`
- Initialize with `init_webserver()` in `setup()`; non‑blocking, safe to use alongside render loop.
- Intended REST surface (subject to implementation):
  - `GET /api/patterns` → list: `[ { id, name, is_audio_reactive }, ... ]`
  - `POST /api/select` body: `{ id: "lava" }` → returns `{ ok: true }`
  - `GET /api/params` → returns current `PatternParameters`
  - `POST /api/params` body: `PatternParameters` → updates via `update_params_safe`

Note: Web endpoints are scaffolding; consult `webserver.cpp` in this repo for current status.

---

## Beat Tracking Learning Resources

### Week 1: Diagnostic Metrics Understanding

**File:** [mirex_metrics_diagnostic_guide.md](mirex_metrics_diagnostic_guide.md)

Quick-reference guide for interpreting MIREX beat metrics during algorithm implementation:
- 10-word summaries of F-measure, Cemgil, Goto
- Symptom-to-cause diagnostic tables
- Common error patterns from empirical testing
- Tolerance window calibration (±70-80ms)
- Metric interdependencies

**For:** Week 2-4 beat tracking implementers

---

## Current Status & Roadmap

**Core System: COMPLETE** ✓
- Dual-core architecture (audio + rendering)
- Node graph compilation pipeline (JSON → C++)
- Pattern registry (runtime switching)
- Parameter system (thread-safe updates)
- Web API scaffolding

**Visualization Pipeline: IN PROGRESS**

The existing patterns were built without understanding the core principles of the system:
- Palette logic (colour spaces, intentional progressions)
- Centre-origin rendering (symmetry, mirror modes)
- Audio pipeline → Visual pipeline flow
- Creating stunning audio-reactive patterns

See `Implementation.plans/` for the detailed rebuild strategy.

---

**What this means:**

Everything collapses if we lose the core commitment: **refusing compromise between artistic vision and execution perfection.**

Every pattern we build should serve that mission. Every optimization should remove obstacles between intention and reality. Everything else is noise.

---

## Why This Project Exists

You are not building a light controller. You are not creating a visualization tool.

You are creating *emotional experiences* through light.

Every color choice matters. Every pattern is a statement about what you believe is worth expressing. When you build Departure, you're not displaying data—you're telling the story of transformation. When you build Lava, you're channeling intensity without apology.

The 120 FPS target (100 FPS minimum) isn't a vanity metric. It's a standard of execution fidelity: smoothness without compromise, aligned to the project’s minimalism and intentionality.

This is what happens when you refuse to accept mediocrity. When you reject the default. When you understand that saying *no* is more important than saying *yes*.

---

## License

MIT

---

## One Final Truth

Anyone can control LEDs. That's easy.

Creating something beautiful that matters? That requires intention. Uncompromising intention. The kind that says "no" to easy options. The kind that demands perfection at every stage. The kind that refuses to accept that flexibility and performance are opposites.

That's what this is.

Build something that matters.
