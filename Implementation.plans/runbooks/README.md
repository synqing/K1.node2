# K1.reinvented Implementation Runbooks

This directory contains operational guides for implementing, deploying, and maintaining features in K1.reinvented. Each runbook documents step-by-step procedures with verification checklist and rollback plans.

## Active Runbooks

### 🚀 Critical Fixes

#### [fps_bottleneck_fix_v2.md](./fps_bottleneck_fix_v2.md)
**Status:** ✅ Deployed | **Date:** 2025-10-28 | **Commit:** 13ab26f

Fixes the 42.5 FPS hard cap that was artificially limiting the visual pipeline. Implements the Sensory Bridge audio-visual synchronization pattern with:
- SAMPLE_RATE synchronization (12800 → 16000)
- I2S reconfiguration (16kHz/128-chunk = 8ms cadence)
- Removed artificial timing throttle from main loop
- Restored portMAX_DELAY blocking for natural I2S synchronization

**Key changes:**
- `firmware/src/main.cpp` - Restructured loop to remove timing throttle
- `firmware/src/audio/microphone.h` - Reconfigured I2S
- `firmware/src/audio/goertzel.h` - Fixed SAMPLE_RATE constant

**Expected impact:** FPS increases from 42.5 to 120-200+ FPS

**Rollback:** `git revert 13ab26f && pio run -t upload`

---

#### [i2s_timeout_fix_runbook.md](./i2s_timeout_fix_runbook.md)
**Status:** Complete | **Date:** 2025-10-28

Detailed analysis of I2S timeout configurations and the evolution from non-blocking reads to natural portMAX_DELAY blocking. Documents why Sensory Bridge's approach is superior.

---

#### [audio_pipeline_cleanup_v1.md](./audio_pipeline_cleanup_v1.md)
**Status:** Complete | **Date:** 2025-10-28

Removes architectural clutter from main.cpp and reconfigures audio pipeline for clean 16kHz/128-chunk operation with 8ms cadence. Commented out unused dual-core audio_task() function.

**Changes:**
- Removed SPIFFS file enumeration (100-500ms startup delay)
- Removed 20ms audio throttle (was FPS bottleneck)
- Removed telemetry broadcast overhead
- Changed I2S from 12.8kHz/64 to 16kHz/128

---

### 🎯 Pattern & Feature Implementation

#### [generated_patterns_inline_optimization.md](./generated_patterns_inline_optimization.md)
**Status:** Complete | **Date:** 2025-10-26

Optimizes the pattern registry by converting function pointers to inline direct calls. Improves performance by eliminating function pointer indirection.

---

#### [led_driver_refactoring_runbook.md](./led_driver_refactoring_runbook.md)
**Status:** Complete | **Date:** 2025-10-26

Comprehensive refactoring of the LED driver to improve code organization, reduce quantization errors, and optimize RMT timing.

**Changes:**
- Consolidated color quantization logic
- Improved RMT timeout handling (1ms instead of 10ms)
- Added performance profiling metrics

---

#### [tempo_confidence_amplification_fix.md](./tempo_confidence_amplification_fix.md)
**Status:** Complete | **Date:** 2025-10-27

Fixes beat detection by properly synchronizing tempo_confidence values and tempo magnitude/phase arrays between audio processing and pattern access.

---

### 🔐 Security & Quality

#### [security_vulnerability_remediation.md](./security_vulnerability_remediation.md)
**Status:** Complete | **Date:** 2025-10-27

Addresses security vulnerabilities in WebSocket handling and JSON processing. Implements proper input validation and error handling.

---

#### [webserver_refactoring_phase1.md](./webserver_refactoring_phase1.md)
**Status:** Complete | **Date:** 2025-10-27

Phase 1 refactoring of web server endpoints with improved error handling, parameter validation, and API response consistency.

---

### 🛠️ Infrastructure & Setup

#### [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
**Status:** Reference | **Date:** 2025-10-26

Comprehensive pre-deployment and post-deployment verification checklist for firmware updates.

---

#### [k1_control_app_setup.md](./k1_control_app_setup.md)
**Status:** Complete | **Date:** 2025-10-27

Setup guide for the K1 control application and integration with the device API.

---

### 📋 Task-Specific Runbooks

#### [task_3_4_provider_integration_implementation.md](./task_3_4_provider_integration_implementation.md)
**Status:** Complete | **Date:** 2025-10-27

Implementation details for provider integration in the control system.

---

#### [task_3_5_error_states_and_retry_ux.md](./task_3_5_error_states_and_retry_ux.md)
**Status:** Complete | **Date:** 2025-10-27

Error state handling and user experience improvements for retry logic.

---

#### [task_3_6_device_deduplication_and_sorting.md](./task_3_6_device_deduplication_and_sorting.md)
**Status:** Complete | **Date:** 2025-10-27

Device list deduplication and intelligent sorting logic implementation.

---

## Runbook Structure

Each runbook follows this standard format:

```
# Title

**Author:** Role
**Date:** YYYY-MM-DD
**Status:** Draft|In Review|Complete|Deployed
**Intent:** One-line purpose

## Executive Summary
High-level overview and expected impact

## Changes Made
Detailed before/after code comparisons

## Verification Steps
Step-by-step validation checklist

## Files Modified
Table of files with change summary

## Rollback Plan
How to revert if needed
```

## Navigation & Index

### By Category

**🚀 Critical Performance Fixes:**
- [fps_bottleneck_fix_v2.md](./fps_bottleneck_fix_v2.md) - Latest (2025-10-28)
- [i2s_timeout_fix_runbook.md](./i2s_timeout_fix_runbook.md)
- [audio_pipeline_cleanup_v1.md](./audio_pipeline_cleanup_v1.md)

**🎯 Features & Optimization:**
- [led_driver_refactoring_runbook.md](./led_driver_refactoring_runbook.md)
- [generated_patterns_inline_optimization.md](./generated_patterns_inline_optimization.md)
- [tempo_confidence_amplification_fix.md](./tempo_confidence_amplification_fix.md)

**🔐 Quality & Security:**
- [security_vulnerability_remediation.md](./security_vulnerability_remediation.md)
- [webserver_refactoring_phase1.md](./webserver_refactoring_phase1.md)

**🛠️ Infrastructure:**
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [k1_control_app_setup.md](./k1_control_app_setup.md)

**📋 Task-Specific:**
- [task_3_4_provider_integration_implementation.md](./task_3_4_provider_integration_implementation.md)
- [task_3_5_error_states_and_retry_ux.md](./task_3_5_error_states_and_retry_ux.md)
- [task_3_6_device_deduplication_and_sorting.md](./task_3_6_device_deduplication_and_sorting.md)

### By Date (Most Recent First)

1. 2025-10-28: [fps_bottleneck_fix_v2.md](./fps_bottleneck_fix_v2.md) ⭐ **LATEST**
2. 2025-10-28: [i2s_timeout_fix_runbook.md](./i2s_timeout_fix_runbook.md)
3. 2025-10-28: [audio_pipeline_cleanup_v1.md](./audio_pipeline_cleanup_v1.md)
4. 2025-10-27: [security_vulnerability_remediation.md](./security_vulnerability_remediation.md)
5. 2025-10-27: [webserver_refactoring_phase1.md](./webserver_refactoring_phase1.md)
6. 2025-10-27: [task_3_6_device_deduplication_and_sorting.md](./task_3_6_device_deduplication_and_sorting.md)
7. 2025-10-27: [task_3_5_error_states_and_retry_ux.md](./task_3_5_error_states_and_retry_ux.md)
8. 2025-10-27: [task_3_4_provider_integration_implementation.md](./task_3_4_provider_integration_implementation.md)
9. 2025-10-27: [k1_control_app_setup.md](./k1_control_app_setup.md)
10. 2025-10-26: [tempo_confidence_amplification_fix.md](./tempo_confidence_amplification_fix.md)
11. 2025-10-26: [led_driver_refactoring_runbook.md](./led_driver_refactoring_runbook.md)
12. 2025-10-26: [generated_patterns_inline_optimization.md](./generated_patterns_inline_optimization.md)
13. 2025-10-26: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## Quick Start: Deploying a Runbook

1. **Read the runbook** - Understand the changes and verification steps
2. **Review files modified** - Check code changes against your architecture
3. **Test locally** - Build and verify on your machine
4. **Deploy** - Use deployment commands provided in the runbook
5. **Verify** - Follow post-deployment verification checklist
6. **Document** - Update this README if creating a new runbook

## Runbook Creation Guidelines

When creating a new runbook:

1. **Use the template structure** - Title, Author, Date, Status, Intent
2. **Include before/after code** - Show exact changes with line numbers
3. **Add verification steps** - Specific tests or output to validate
4. **Provide rollback plan** - How to revert if something breaks
5. **Update this README** - Add entry in appropriate category and by-date list
6. **Link to related docs** - Reference other runbooks or architecture docs

## Related Documentation

- **Architecture & Analysis:** [docs/analysis/](../../docs/analysis/)
- **Design & Planning:** [docs/planning/](../../docs/planning/)
- **Architecture Decisions:** [docs/adr/](../../docs/adr/)

---

**Last updated:** 2025-10-28
**Total runbooks:** 16
**Status:** Active maintenance and ongoing improvements
