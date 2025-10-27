# NODE GRAPH VALIDATION REPORT
**Generated:** 2025-10-27T04:20:39.549Z

## Executive Summary

- **Total Files:** 24
- **Passed:** 16 (67%)
- **Failed:** 8 (33%)

### Violation Breakdown
- **🚨 Critical:** 9 (block integration)
- **⚠️ Major:** 7 (require fixes)
- **⚡ Minor:** 2 (correctable)
- **💡 Warnings:** 0 (recommendations)

## Compliance Categories

### ✅ COMPLIANT (16 files)
Ready for immediate integration:
- audio_example_bass_pulse.json
- audio_example_spectrum_sweep.json
- audio_test_beat_spectrum.json
- audio_test_comprehensive.json
- audio_test_spectrum_bin.json
- beat_locked_grid.json
- breathing_ambient.json
- emotiscope_fft.json
- emotiscope_octave.json
- emotiscope_spectrum.json
- energy_adaptive_pulse.json
- harmonic_resonance.json
- multiband_cascade.json
- predictive_beat_flash.json
- spectral_mirror.json
- transient_particles.json

### 🚨 CRITICAL VIOLATIONS (1 files)
Block integration until complete redesign:
- departure_spectrum.json

### ⚠️ MAJOR VIOLATIONS (7 files)
Require fixes before integration:
- aurora.json
- aurora_spectrum.json
- departure.json
- lava.json
- lava_beat.json
- twilight.json
- twilight_chroma.json

## Detailed Results


=== VALIDATION REPORT: audio_example_bass_pulse.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: audio_example_spectrum_sweep.json ===
Status: ✅ PASSED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚡ MINOR: beat node "beat" uses hardcoded tempo_bin 0
   Location: Node: beat, parameter: tempo_bin
   Fix: Consider using tempo_bin: -1 for auto-detection of strongest beat


=== VALIDATION REPORT: audio_test_beat_spectrum.json ===
Status: ✅ PASSED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚡ MINOR: beat node "beat_pulse" uses hardcoded tempo_bin 0
   Location: Node: beat_pulse, parameter: tempo_bin
   Fix: Consider using tempo_bin: -1 for auto-detection of strongest beat


=== VALIDATION REPORT: audio_test_comprehensive.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: audio_test_spectrum_bin.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: aurora.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: aurora_spectrum.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: beat_locked_grid.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: breathing_ambient.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: departure.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: departure_spectrum.json ===
Status: ❌ FAILED
Violations: 9
Warnings: 0

VIOLATIONS:
1. 🚨 CRITICAL: Palette entry 0 uses object format instead of required array format
   Location: palette_data[0]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

2. 🚨 CRITICAL: Palette entry 1 uses object format instead of required array format
   Location: palette_data[1]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

3. 🚨 CRITICAL: Palette entry 2 uses object format instead of required array format
   Location: palette_data[2]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

4. 🚨 CRITICAL: Palette entry 3 uses object format instead of required array format
   Location: palette_data[3]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

5. 🚨 CRITICAL: Palette entry 4 uses object format instead of required array format
   Location: palette_data[4]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

6. 🚨 CRITICAL: Palette entry 5 uses object format instead of required array format
   Location: palette_data[5]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

7. 🚨 CRITICAL: Palette entry 6 uses object format instead of required array format
   Location: palette_data[6]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

8. 🚨 CRITICAL: Palette entry 7 uses object format instead of required array format
   Location: palette_data[7]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255

9. 🚨 CRITICAL: Palette entry 8 uses object format instead of required array format
   Location: palette_data[8]
   Fix: Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255


=== VALIDATION REPORT: emotiscope_fft.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: emotiscope_octave.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: emotiscope_spectrum.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: energy_adaptive_pulse.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: harmonic_resonance.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: lava.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: lava_beat.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: multiband_cascade.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: predictive_beat_flash.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: spectral_mirror.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: transient_particles.json ===
Status: ✅ PASSED
Violations: 0
Warnings: 0


=== VALIDATION REPORT: twilight.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)


=== VALIDATION REPORT: twilight_chroma.json ===
Status: ❌ FAILED
Violations: 1
Warnings: 0

VIOLATIONS:
1. ⚠️ MAJOR: position_gradient node "position" missing center-origin documentation
   Location: Node: position
   Fix: Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)

