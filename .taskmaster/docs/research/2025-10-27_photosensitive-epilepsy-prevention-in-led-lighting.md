---
title: Research Session
query: "Photosensitive epilepsy prevention in LED lighting systems: dangerous frequency ranges (3-60Hz), brightness change limits, pattern restrictions, red saturation limits, transition speed constraints, and Harding Test protocols. Include medical research on photosensitivity triggers and IPS (Intermittent Photic Stimulation) thresholds."
date: 10/27/2025
time: 10:29:16 AM
timestamp: 2025-10-27T02:29:16.964Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Photosensitive epilepsy prevention in LED lighting systems: dangerous frequency ranges (3-60Hz), brightness change limits, pattern restrictions, red saturation limits, transition speed constraints, and Harding Test protocols. Include medical research on photosensitivity triggers and IPS (Intermittent Photic Stimulation) thresholds.

**Response:**

**Overview**

This brief consolidates medical research and broadcast safety guidance into actionable rules and implementation patterns to minimize photosensitive seizure risk in LED-based systems such as K1. It covers the critical frequency ranges (3–60 Hz), brightness-change constraints, red saturation limits, pattern restrictions, transition-speed constraints, and how to approximate a “Harding-style” preflight check in software. It also integrates these recommendations into the K1 Control App tasks (palette selection, state/provider safeguards, error handling and QA) with code examples and test strategies.

Photosensitivity risk is multifactorial: temporal frequency (flicker and flash rates), luminance contrast, color content (especially saturated red), spatial frequency (striping/chequerboard patterns), display/field-of-view area, overall luminance, waveform shape (abrupt vs sinusoidal), binocular viewing, and user susceptibility. You reduce risk by gating temporal and spatial frequencies to safe ranges, minimizing high-contrast/large-area flashes, avoiding saturated red flashing, smoothing transitions, and providing a “Safety Mode” that hard-limits unsafe parameters. These measures are widely applied in video/broadcast (Harding FPA/Ofcom/ITU/WCAG) and are compatible with LED systems.

Below, “flash” refers to a pair of opposing luminance changes of sufficient magnitude within 1 second; “flicker” can be periodic modulation. For LED systems, both the device PWM and the application-level pattern modulation matter; the app can’t change device PWM, but it can control pattern modulation and update cadence.

**Medical Background and IPS Thresholds**

- Trigger window: Intermittent Photic Stimulation (IPS) in EEG testing spans approximately 1–60 Hz; photosensitive epileptiform responses cluster strongly around 15–25 Hz, with meaningful sensitivity from ≈3 Hz up to ≈60 Hz. The widely cited “danger zone” for repetitive flashing is 3–60 Hz, especially ≈15–20 Hz.
- Brightness and area: Higher luminance and larger field-of-view coverage increase risk. A narrow LED strip generally covers a smaller area than full-screen video, but in dark rooms or immersive setups the effective field-of-view can be significant. Be conservative.
- Color content: Red flicker is more provocative than other hues; saturated red (narrow-band or very high R component) is an established risk factor when flashing, especially in the 10–30 Hz region.
- Waveform and contrast: Abrupt, high-contrast square-wave transitions provoke stronger responses. Sinusoidal modulation at reduced depth is safer for the same nominal frequency.
- Binocular view: Both eyes open increases risk; occluding one eye can reduce it but is not a viable product mitigation. Design the content to be safe for normal viewing.
- Susceptibility: Not all users are equally sensitive; safeguards should assume unknown vulnerabilities and default to safe content, with opt-in for “unrestricted” expert modes if ever provided.

These findings motivate limiting local brightness/color cycling rates to ≤3 Hz unless the flash is provably below general/red thresholds, smoothing transitions, and discouraging saturated-red flashes altogether.

**Standards and Safety Guidance**

- WCAG 2.3 (Seizures and Physical Reactions): “No more than three flashes in any one-second period, or the flash is below the general flash and red flash thresholds.” The general threshold concerns a pair of opposing luminance changes with ≥10% relative luminance difference over a non-trivial area; red-flash adds extra conservatism for saturated red. While originally for screen content, the principles map well to LED output when treated as “display pixels.”
- Ofcom/Harding FPA: Used in broadcast compliance. It looks for:
  - Flashing in the 3–50/60 Hz range.
  - Red flashes with stricter criteria.
  - Large-area high-contrast flashes.
  - Regular patterns with spatial frequencies likely to induce seizures (e.g., 0.5–8 cycles/degree) especially when moving at provocative temporal rates.
  The exact algorithm is proprietary, but public guidance enables conservative approximations.
- IEEE/IEC flicker: Keep device PWM in the high kHz range; avoid low frequency (<100–200 Hz) PWM at large modulation depths. For K1, assume device PWM is already high-frequency; app-level content should avoid slow, deep modulations in the critical window.

For K1, adopt WCAG/Ofcom conservative constraints for software-controlled pattern and color dynamics. When in doubt, enforce ≤3 flashes/cycles per second at any local point for high-contrast or saturated-red transitions.

**Actionable Safety Policy for K1**

Implement a default-on “Safety Mode” that hard-limits risky parameters, with configurable but conservative defaults:

- Frequency guardrails:
  - Max local cycle frequency at any fixed point: 3 Hz for high-contrast or red-dominant changes. If a pattern locally cycles color or brightness faster than 3 Hz, scale its speed down in Safety Mode.
  - For low-contrast, smooth sinusoidal modulations of small depth, additional headroom may be safe, but keep Safety Mode simple: cap at 3 Hz.
- Brightness-change limits:
  - Treat a flash as an absolute difference in relative luminance ΔL ≥ 0.10 (10% of normalized luminance). In Safety Mode, rate-limit any pair of opposing transitions with ΔL ≥ 0.10 so that their effective frequency ≤ 3 Hz.
  - Prefer continuous waveforms with eased transitions over step changes to reduce harmonic content; apply min ramp times to avoid abruptness.
- Red saturation limits:
  - Avoid flashing saturated red. In Safety Mode, when the color before/after a transition is “red-dominant” (e.g., R_lin is high while G_lin and B_lin are low), treat the flash as red and cap at ≤3 Hz regardless of contrast depth.
  - For palette selection, flag or de-prioritize “red-heavy + high brightness” swatches for use with fast patterns; provide UI warnings.
- Pattern restrictions:
  - Avoid spatially regular high-contrast striping that advances rapidly. For LED chases, the local cycle rate at a fixed LED equals the chase speed in cycles/sec; enforce ≤3 Hz in Safety Mode.
  - Avoid combined spatiotemporal aliases that create effective local flicker in the sensitive band.
- Transition-speed constraints:
  - Enforce min ramp time such that a 10% luminance step takes at least 333 ms (≈3 Hz), with proportional scaling for larger steps. For an abrupt on/off pulse of 100% contrast, enforce at least 333 ms between polarity reversals in Safety Mode.
- Global luminance/contrast management:
  - Clamp peak brightness in Safety Mode to reduce effective stimulus energy, especially when large room coverage or reflective surfaces are present.
  - Prefer sinusoidal modulation and gamma-eased curves for amplitude changes.

These rules align with WCAG’s 3 flashes per second and Ofcom/Harding principles and are conservative enough for a wide range of environments.

**Approximating a Harding-Style Preflight in Software**

While the Harding FPA algorithm is proprietary, you can implement a conservative checker that rejects risky content based on public criteria:

- Temporal analysis:
  - Sample the intended output at ≥120 Hz logical frames for analysis (oversampling vs your update cadence) for at least 1–2 seconds.
  - For each LED position, compute a time series of relative luminance L(t) and hue.
  - Detect “flash events”: a pair of opposing transitions whose absolute luminance difference ΔL ≥ 0.10. Count occurrences per 1-second sliding window; fail if >3.
  - Detect “red flashes”: transitions to/from red-dominant states (e.g., R_lin ≥ 0.7 and G_lin ≤ 0.2 and B_lin ≤ 0.2) with ΔL ≥ 0.10; apply the same 3 Hz cap; if uncertain, flag as red.
- Spatial/pattern analysis (LED context):
  - Identify regular on/off or high-contrast color alternation along the strip and estimate local cycle frequency at a fixed LED from the pattern’s speed parameter; fail if >3 Hz.
  - If your strip or matrix can render multiple stripes, ensure the effective spatial frequency does not combine with movement to produce ≥3 Hz at any fixed point.
- Area heuristic:
  - Treat a single K1 device as “large area” for safety when used in dark rooms. Err on the side of gating; you cannot reliably measure end-user field-of-view.
- Waveform/contrast heuristic:
  - Penalize square/step waveforms more than smoothed ones. If the wave is step-like with large ΔL, apply the strictest 3 Hz limit.

This checker runs as a preflight when a user selects a pattern or changes speed/contrast/brightness; in Safety Mode, the app auto-clamps parameters instead of failing; in Unrestricted Mode, it shows a warning and requires explicit confirmation.

**TypeScript Implementation Building Blocks (K1 Control App)**

Add a small safety module (e.g., `src/safety/photosensitivity.ts`) and integrate guards in the K1Provider and UI.

- Relative luminance and “red-dominant” detection:

```ts
// src/safety/color.ts
export type RGB = { r: number; g: number; b: number }; // sRGB, 0..1

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

// WCAG relative luminance (D65, linear sRGB)
export const relLuminance = ({ r, g, b }: RGB) => {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B; // 0..1
};

export const isRedDominant = ({ r, g, b }: RGB) => {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  // Conservative heuristic for saturated red
  return R > 0.7 && G < 0.2 && B < 0.2 && R > G && R > B;
};
```

- Flash detection and frequency clamping:

```ts
// src/safety/photosensitivity.ts
import { relLuminance, isRedDominant, RGB } from "./color";

export type SafetyPolicy = {
  maxFlashHz: number;         // default 3
  luminanceFlashDelta: number; // default 0.10 (10%)
};

export const DefaultPolicy: SafetyPolicy = {
  maxFlashHz: 3,
  luminanceFlashDelta: 0.10,
};

export type Sample = { t: number; color: RGB };

export function countFlashesPerSecond(samples: Sample[], policy = DefaultPolicy) {
  // Assuming monotonic t in seconds
  const flashes: number[] = []; // times when a qualifying flash completes
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const dL = Math.abs(relLuminance(curr.color) - relLuminance(prev.color));
    if (dL >= policy.luminanceFlashDelta) {
      flashes.push(curr.t);
    }
  }
  // sliding window count
  let maxPerSec = 0;
  let start = 0;
  for (let end = 0; end < flashes.length; end++) {
    while (flashes[end] - flashes[start] > 1.0) start++;
    maxPerSec = Math.max(maxPerSec, end - start + 1);
  }
  return maxPerSec;
}

export function hasRedFlashes(samples: Sample[], policy = DefaultPolicy) {
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const dL = Math.abs(relLuminance(curr.color) - relLuminance(prev.color));
    if (dL >= policy.luminanceFlashDelta) {
      if (isRedDominant(prev.color) || isRedDominant(curr.color)) return true;
    }
  }
  return false;
}

// Conservative local cycle frequency estimate from pattern parameters.
// For chases, local cycle frequency ≈ speedCyclesPerSecond.
export function clampLocalFrequency(speedCyclesPerSecond: number, policy = DefaultPolicy) {
  return Math.min(speedCyclesPerSecond, policy.maxFlashHz);
}
```

- Provider integration (Task 2):
  - On `selectPattern` and `updateParameters`, compute the implied local cycle frequency (pattern-specific); if it exceeds 3 Hz, clamp in Safety Mode.
  - When brightness/contrast/speed/redness changes would lead to >3 flashes/s or red-flash at ≥3 Hz, scale the parameters down (reduce speed, depth, or brightness).
  - Provide a visible “Compliant” badge in the UI when parameters are under thresholds.

- Pattern metadata:
  - For each pattern, add a “localFrequencyFn(params) -> Hz” and “waveformType: 'step'|'smooth'” to interpret risk. Step-like waveforms are stricter.
  - For chases/wipes: localFrequencyFn = speedCyclesPerSecond.
  - For pulse/breathe: localFrequencyFn = 1 / periodSeconds.

- Transitions:
  - Enforce per-update ramping so that a 10% ΔL change takes ≥333 ms. Implement easing in the device parameter updates rather than abrupt steps.

**Integrating With Task 6 (Palette Selection)**

- Extend `K1_PALETTES` with metadata:
  - `redScore` (0–1): compute from swatch average linear R vs G/B; or a boolean `containsRedDominant`.
  - `safeAtFastRates` boolean: false if redScore high and contrast high.
- UI behavior:
  - When a user selects a palette with `containsRedDominant` and the active pattern speed would imply >3 Hz local cycling, show a warning and automatically reduce the speed.
  - In Safety Mode, disallow combinations that would yield red flashes at ≥3 Hz.
- Tests:
  - Unit tests that “red-heavy + fast pulse” triggers clamping and aria-live announcement.
  - DOM style tests that gradient previews remain intact when marked as “constrained.”

**Device PWM and Update Cadence**

- Ensure device-level PWM is high frequency (kHz-range) to avoid low-frequency carrier flicker. If K1 device PWM is not configurable via app, document it in the README and architecture docs and focus app safeguards on content modulation.
- Avoid scheduling app-driven on/off toggles at low frequencies with large depth—this is the primary risk your app can introduce.

**Harding Test Protocols: Workflow and Proxy**

- Formal workflow (for broadcast/installation content approvals):
  - Generate representative sequences of the LED content (video capture or simulated pixel stream).
  - Run through a certified Harding FPA or equivalent lab service to confirm compliance if content will be used in sensitive contexts.
- In-app proxy:
  - Add a “Harding Proxy Check” that runs the conservative algorithm above whenever a pattern or speed/contrast/color changes, returning pass/fail and adjustments.
  - Provide an “Export Simulated Frames” developer tool to produce a short, deterministic sample of the pattern (e.g., 2–3 seconds at 120 logical FPS for N LEDs) for external analysis when needed.

Example proxy:

```ts
// src/safety/checker.ts
import { countFlashesPerSecond, hasRedFlashes, DefaultPolicy } from "./photosensitivity";

export type SafetyResult = {
  compliant: boolean;
  maxFlashesPerSecond: number;
  redFlashDetected: boolean;
  adjustments?: { speed?: number; depth?: number; brightness?: number };
  notes: string[];
};

export function safetyCheck(samples: { t: number; color: { r: number; g: number; b: number } }[]): SafetyResult {
  const maxFlashes = countFlashesPerSecond(samples, DefaultPolicy);
  const red = hasRedFlashes(samples, DefaultPolicy);
  const compliant = maxFlashes <= DefaultPolicy.maxFlashHz && (!red || maxFlashes <= DefaultPolicy.maxFlashHz);
  const notes = [];
  if (maxFlashes > DefaultPolicy.maxFlashHz) notes.push(`Flash rate ${maxFlashes}/s exceeds ${DefaultPolicy.maxFlashHz}/s`);
  if (red) notes.push(`Red-dominant flashes detected`);
  return { compliant, maxFlashesPerSecond: maxFlashes, redFlashDetected: red, notes };
}
```

Hook this into K1Provider so that when parameters are updated, you generate a small sample via the pattern’s generator, run `safetyCheck`, and auto-apply adjustments in Safety Mode.

**UI/UX and Error Handling (ties to Task 9 and Task 10)**

- Safety Mode toggle:
  - Default ON; clear label “Photosensitivity Safety.” Tooltip explaining that speed, brightness, and contrast may be limited to reduce seizure risk.
- Live warnings:
  - When the user selects risky combinations, show non-intrusive toast with “Reduced speed to maintain ≤3 Hz” and aria-live confirmation.
  - For Unrestricted Mode (developer), require explicit confirm.
- Documentation:
  - Add a “Photosensitivity Safety” section to `docs/architecture/control-app/QUALITY_PLAYBOOK.md` describing policy, rationale, and references to WCAG/Ofcom style guidance.
  - In README, include a standard photosensitive seizure warning and instructions to enable Safety Mode.
- Tests:
  - Unit tests for the checker and clamping logic.
  - Integration tests: simulate pattern + palette combos and verify auto-adjustment and messaging.
  - E2E: ensure Safety Mode remains on after reload; verify a risky speed slider movement is clamped.

**Edge Cases and Practical Considerations**

- Ambient vs focal viewing: A strip behind furniture at low brightness is less risky, but assume worst case. Keep Safety Mode conservative.
- Combined stimuli: External screens, music strobes, or other lighting in the environment can interact with K1. You cannot control external factors—document this.
- Spatial expansion: If K1 expands to matrices/panels, implement actual spatial frequency checks (e.g., stripe widths, contrast) and use WCAG pixel-area thresholds; for strips, treat each LED as a pixel along one dimension and apply the local cycle rule.
- Gamma and perceived contrast: Use relative luminance in linear space for ΔL; do not rely on raw sRGB values, which can under/over-estimate perceptual steps.
- Developer override: For lab use only, permit temporary override with session-only unlock, not persisted, and force a prominent warning.

**Recommendations Summary for K1**

- Cap local cycle/flash frequency to ≤3 Hz for high-contrast or red-dominant changes; auto-clamp speeds and step rates.
- Enforce min ramp times and prefer sinusoidal/eased transitions to avoid square-wave flashes.
- Flag and de-prioritize saturated-red palettes, and never allow them to flash above 3 Hz in Safety Mode.
- Integrate a conservative Harding-proxy check that counts flashes and detects red-dominant transitions using relative luminance and color heuristics.
- Provide default-on Safety Mode with transparent UI feedback and accessibility-friendly announcements.
- Add unit/integration/E2E tests to lock in safety behavior; document policy and disclaimers.

**How This Maps to Current Tasks**

- Task 6 (Palette selection):
  - Add `redScore`/`containsRedDominant` metadata; filter or warn on risky palettes when paired with fast patterns.
  - Aria-live announce when Safety Mode clamps speed or depth based on palette risk.
- Task 2 (K1 provider):
  - Centralize safety guards in the provider: wrap `selectPattern`, `updateParameters`, and `setPalette` with `safetyCheck` and clamping.
  - Persist Safety Mode preference; restore on reload.
- Task 9 (Error handling and performance):
  - Show consistent toasts for safety adjustments; treat them as “info” not “error.”
  - Memoize safety-check samples; don’t generate long sequences—use short deterministic sampling (e.g., 2 seconds at 120 logical FPS).
- Task 10 (Docs and tests):
  - Document Safety Mode policy and rationale.
  - Add unit tests for checker and provider clamping; add deterministic fixtures for patterns/palettes to test safety boundaries.
  - Include a small E2E scenario: enable Safety Mode, set a red-heavy palette and a fast pulse pattern → verify auto-clamp and messaging.

If you want, I can sketch the provider hook points for safety or add a small `photosensitivity/` module with tests to the repo, and update the docs to include the Safety Mode specification and usage.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-10-27T02:29:16.964Z*
