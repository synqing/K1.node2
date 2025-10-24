# K1.reinvented Agent Toolset

## Purpose

This directory contains tools, skills, and agents that **enable creation** in K1.reinvented. Not governance. Not guard rails. **Tools that multiply your ability to create beautiful patterns.**

---

## What's Here

### Skills (Auto-Activate on Keywords)

**fastled-color-specialist** - Color theory, palette design, harmony
- Keywords: "FastLED color", "palette", "HSV", "RGB", "color harmony", "gradient"
- Use when: Designing patterns, choosing colors, debugging visual issues

**ESP-IDF** - ESP32-S3 firmware reference
- Keywords: "ESP32", "I2S", "RMT", "FreeRTOS", "dual core", "interrupts"
- Use when: Working with hardware, understanding timing, optimizing performance

**FastLED** - LED control library
- Keywords: "FastLED", "CRGB", "CHSV", "LED driver", "color math"
- Use when: Working with LED arrays, color conversions, effects

**PlatformIO** - Build system
- Keywords: "PlatformIO", "platformio.ini", "build", "compile", "dependencies"
- Use when: Build failures, configuration issues, dependency problems

### Agents (Specialized Workers)

**embedded-firmware-coder** - ESP32/firmware specialist
- Handles: C++ firmware, ESP32 APIs, hardware optimization
- Invoke: When working on firmware code

**fastled-color-specialist** (agent) - Interactive palette design
- Handles: Color theory questions, palette creation, visual debugging
- Invoke: When designing patterns or debugging color issues

### Commands (Slash Commands)

**`/build`** - Compile firmware without uploading
- Quick verification that changes compile

**`/flash [pattern]`** - Build and upload pattern to device
- Example: `/flash departure 192.168.1.100`

**`/test-pattern [name]`** - Compile graph and verify generated code
- Inspect generated C++ before uploading

---

## How to Use This

### When Creating a New Pattern

1. **Design the colors** - Use fastled-color-specialist skill
2. **Create the graph** - Define nodes in JSON
3. **Test compilation** - `/test-pattern [name]`
4. **Upload to device** - `/flash [pattern] [ip]`
5. **Verify beauty** - Does it look how you intended?

### When Debugging

1. **Color issues?** - fastled-color-specialist skill
2. **Build failures?** - PlatformIO skill
3. **Hardware issues?** - ESP-IDF skill
4. **Code issues?** - embedded-firmware-coder agent

### When Extending

1. **Adding node types** - Review codegen logic, understand compilation
2. **Optimizing performance** - ESP-IDF skill for hardware understanding
3. **New patterns** - fastled-color-specialist for color design

---

## Critical Code Protection

See `CRITICAL_CODE.md` for what must never break:
- Codegen palette interpolation logic
- LED driver non-blocking transmission
- Pattern compilation pipeline

But this is **minimal governance**. The focus is on enabling creation, not preventing failure.

---

## Philosophy

**Tools over rules.**

The Emotiscope project learned over 2 years that:
- Skills that enable creation are more valuable than guard rails that prevent failure
- Agents that multiply workflow are more important than validation scripts
- Commands that remove friction matter more than documentation that explains complexity

This `.claude/` directory embodies that lesson. Use these tools. They exist to help you create beauty without compromise.

---

## Quick Reference

**I'm designing a new pattern** → fastled-color-specialist skill
**I'm working on firmware** → embedded-firmware-coder agent
**I'm debugging colors** → fastled-color-specialist agent
**I need to build** → `/build`
**I need to deploy** → `/flash [pattern] [ip]`
**I need hardware reference** → ESP-IDF skill

---

**Now go create something beautiful.**
