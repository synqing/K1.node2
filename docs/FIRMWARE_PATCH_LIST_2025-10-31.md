# Firmware Patch List — Control Plane Alignment (2025-10-31)

Goal: Make webapp controls effective by ensuring POST `/api/params` applies/persists values and that patterns use them.

## 1) Control Endpoint Correctness

Scope: `POST /api/params`, `GET /api/params`, shared utilities.

- Remove redundant, unsafe updates
  - Ensure only `update_params_safe(validated)` updates global params.
  - Do NOT call `update_params(new_params)` after safe update (historical bug).

- Map all supported fields in `apply_params_json(const JsonObjectConst& root)`
  - brightness (float 0..1)
  - softness (float 0..1)
  - color (float 0..1)
  - color_range (float 0..1)
  - saturation (float 0..1)
  - warmth (float 0..1)
  - background (float 0..1)
  - speed (float 0..1)
  - palette_id (uint8; clamp range)
  - custom_param_1, custom_param_2, custom_param_3 (float 0..1)

- Serializer parity in `build_params_json()`
  - Include all fields that can be set (above), so round‑trip confirmation works.

- Validation
  - `validate_and_clamp(PatternParameters&)` clamps: 0..1 for floats; `palette_id` to valid range `[0, NUM_PALETTES-1]`.
  - Return JSON should reflect clamped values, not raw input.

Acceptance
- `curl -X POST http://DEVICE/api/params -H 'Content-Type: application/json' -d '{"brightness":0.8}' && curl http://DEVICE/api/params | jq .brightness` → ~0.8
- `curl -X POST ... '{"palette_id":1}' && curl ... | jq .palette_id` → 1
- `curl -X POST ... '{"palette_id":255}' && curl ... | jq .palette_id` → 0 (or clamped), not 255

## 2) Pattern Conformance to Parameters

- Palette awareness
  - Ensure palette‑aware patterns call `color_from_palette(params.palette_id, progress, params.brightness * <effect factor>)`.
  - Verify Departure, Lava, Twilight are patched (as documented) and any others intended to be palette‑aware.

- Brightness adoption
  - Multiply output color by `params.brightness` in all patterns.

- HSV usage (if applicable)
  - If `params.color/saturation` should affect hue/saturation globally, apply as a modulation step. Otherwise, declare not used.

- Void trail channel
  - Adopt `params.custom_param_1` as the control for void trail behavior (e.g., OFF <0.1; 0.25, 0.55, 0.85 bands).

Acceptance
- On a palette‑aware pattern, switching `palette_id` changes visible colors.
- `brightness` slider visibly dims/brightens across patterns.
- Setting `custom_param_1` changes void trail behavior where applicable.

## 3) Rate Limiting & Headers

- Keep rate limits (e.g., POST `/api/params` 300ms; GET `/api/audio-config` 500ms).
- Return `X-RateLimit-Window` and `X-RateLimit-NextAllowedMs` consistently for 429 responses (already in plan docs); webapp will eventually honor them.

Acceptance
- Rapid 3 POSTs within 100ms → one 200 and subsequent 429s; headers present.

## 4) Tests (Manual / Automated)

- Manual smoke with `curl` (as above) for brightness/palette/custom params.
- Re-run the repository’s diagnostics tool and ensure all control steps PASS.

## 5) Deliverables

- Firmware patch touching:
  - Parameter parsing (`apply_params_json`), validation (`validate_and_clamp`), update path
  - JSON serializers (`build_params_json`)
  - Target patterns (Departure/Lava/Twilight, and any other intended palette‑aware patterns)
- Short CHANGELOG entry summarizing user‑visible fixes:
  - “POST /api/params persists values; GET reflects current params”
  - “Patterns updated to respect palette_id, brightness; void trail bound to custom_param_1”

Once these are merged and flashed, we will re-run `npm run k1:diagnose` and expect green across controls before adjusting the UI.
