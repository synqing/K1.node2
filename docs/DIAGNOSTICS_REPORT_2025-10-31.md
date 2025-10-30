# Diagnostics Report — 2025-10-31 (Device 192.168.1.103)

This document captures the results of the automated device diagnostics, interprets the findings, identifies likely root causes, and recommends next steps with a mitigation strategy.

- Source report: `tools/k1-diagnose/reports/report-20251031-015037.json`
- Tool: `tools/k1-diagnose/k1-diagnose.mjs`

## Summary (High-Level)

- Connectivity: OK
- Snapshot (GET params/patterns/audio): OK
- Palette change (valid + clamp): FAIL (no round‑trip)
- Brightness set: FAIL (no round‑trip)
- HSV (color/saturation/brightness) set: FAIL (no round‑trip)
- Void trail (`custom_param_1`): FAIL (no round‑trip)
- Audio reactivity OFF: OK (confirmed inactive)
- Audio reactivity ON: POST 200, verify 429 (rate‑limit)
- Rate limit probe: Expected behavior (429 within 71ms window)
- Restore: OK (params/pattern/audio restored)

## Detailed Results

- test-connection → 200, `{ status: "ok" }`
- snapshot → params 200, patterns 200
  - GET /api/params returned all numeric fields as `0` initially, including `brightness`, `color`, `saturation`, `palette_id`.
  - GET /api/patterns listed palette‑aware patterns (Departure, Lava, Twilight) and set `current_pattern` to 3 (Spectrum).
  - GET /api/audio-config: `{ microphone_gain: 1, active: true }`.
- select.palette-aware → switched to Departure (index 0), 200.
- palette.valid → POST `{ palette_id: 1 }`, verify GET showed `palette_id: 0` → mismatch.
- palette.clamp → POST `{ palette_id: 255 }`, verify GET showed `palette_id: 0` (still) → mismatch.
- brightness.set → POST `{ brightness: 0.8 }`, verify GET showed `brightness: 0` → mismatch.
- hsv.set → POST `{ color:0.38, saturation:0.8, brightness:0.9 }`, verify GET showed all zeros → mismatch.
- voidTrail.custom_param_1 → POST `{ custom_param_1: 0.85 }`, verify GET did not return `custom_param_1` at all → mismatch.
- audio.off → POST `{ active:false }`, verify GET shows `{ active:false }` → OK.
- audio.on → POST `{ active:true }` returned 200; verify GET returned 429 (rate-limited). The firmware’s GET `/api/audio-config` window appears to be ≥500ms; our default wait was 350ms.
- rate-limit.probe → three fast POSTs produced `[200, 429, 429]` within 71ms → expected.
- restore.* → params/pattern/audio restored successfully (200).

## Interpretation

- The control plane accepts write requests (HTTP 200) but the parameter values do not round‑trip through GET `/api/params`. This is why the webapp shows “Firmware applied safe bounds … → 0” and no visible change occurs.
- `palette_id` specifically does not persist, so palette clicks will not affect the pattern even when a palette‑aware pattern is active.
- `custom_param_1` is either not part of the params structure or excluded from the GET serializer, so “Void Trail Mode” has no effect.
- Audio reactivity toggling works when turning OFF; the immediate ON verify hits the 429 rate limit window. The device likely enforces a 500ms window on `/api/audio-config` GET.

## Likely Root Causes

1. Firmware not applying / persisting params from POST `/api/params`.
   - Historical bug (documented) where `update_params_safe()` was followed by a redundant `update_params()` that could undo validation/persistence. A similar regression would explain zeros in round‑trip.
   - `apply_params_json()` might not map all incoming fields to `PatternParameters`.
2. Incomplete params struct / serializers.
   - Missing `custom_param_1` in GET serializer, so round‑trip never confirms and patterns cannot consume it.
3. Patterns not wired to params.
   - Even with correct params, some patterns won’t change if they ignore `params.palette_id` or HSV fields.
4. Rate limiting not coordinated with UI/tests.
   - 300ms window for `/api/params` and ~500ms for audio config GET cause verify calls to fail when toggles are rapid.

## Recommended Next Steps

A. Firmware (blocking)
- Ensure POST `/api/params` applies and persists all supported fields:
  - Confirm `update_params_safe()` is the only path (no subsequent raw `update_params()` overwrites).
  - In `apply_params_json()`: map `brightness`, `softness`, `color`, `color_range`, `saturation`, `warmth`, `background`, `speed`, `palette_id`, and `custom_param_1..3`.
  - Serializer (`build_params_json()`): include any fields that can be set (including `custom_param_1` if used).
- Patterns: audit and patch to use `params.palette_id` (Departure/Lava/Twilight already called out; ensure Spectrum/others either use it or document that palette does not apply).
- Void Trail: choose a consistent param channel (e.g., `custom_param_1`) and wire pattern(s) to respect it.

B. UI (after firmware alignment)
- Increase debounces to ≥350ms for `/api/params`; ≥500ms around `/api/audio-config` verify.
- After POST, GET to confirm; if mismatch, show “Unconfirmed by device (rate‑limit or unsupported)” instead of “applied safe bounds → 0”.
- Capability handshake: hide/disable controls not present in GET `/api/params`.

C. Diagnostics (ongoing)
- Adjust audio verify wait to 500ms in the tool; keep `/api/params` at 350ms.
- Run diagnostics after firmware update to confirm fixes before UI changes.

## Preventing Recurrence (Mitigation Strategy)

- Contract tests: run the diagnostics tool (or an equivalent CI job) against a device or simulator for each firmware build. Gate releases on round‑trip success for core controls.
- Capability negotiation: the webapp should derive control availability from GET `/api/params` and `/api/audio-config`. If a field isn’t present, the control stays disabled.
- Rate‑limit aware UI: coalesce rapid slider updates and verify state only after the server’s advertised `X-RateLimit-*` headers elapse (or use a conservative fixed window).
- Pattern conformance: establish a rule that patterns must either use the standard params or explicitly declare they ignore them, so the UI can reflect that truth.

---

If you want, I can apply the firmware patch list next and then follow with UI debounce/confirmation changes once the device round‑trips are fixed.
