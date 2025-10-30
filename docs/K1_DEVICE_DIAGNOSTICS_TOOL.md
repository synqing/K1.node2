# K1 Device Diagnostics Tool

This document explains the automated diagnostics tool that validates the K1 device’s HTTP control API end‑to‑end. Use it any time the webapp controls appear unresponsive or inconsistent.

- Location: `tools/k1-diagnose/k1-diagnose.mjs`
- Quick start: `npm run k1:diagnose -- --ip=192.168.1.103`
- Output: JSON report under `tools/k1-diagnose/reports/`

## What It Checks

The tool performs a full, repeatable sequence of operations (read → write → verify → restore), respecting the device’s rate limits.

1. Connectivity
   - GET `/api/test-connection` → expect HTTP 200 with `{ status: "ok" }`.
2. Snapshot
   - GET `/api/params`, `/api/patterns`, `/api/audio-config` to capture the current state.
3. Palette switching
   - If available, switch to a palette‑aware pattern (Departure/Lava/Twilight).
   - POST `/api/params` with a valid `palette_id`, then GET `/api/params` to confirm round‑trip.
   - POST `/api/params` with an invalid `palette_id` (e.g., 255) to exercise clamping.
4. Brightness + HSV
   - POST `/api/params` with `{ brightness: 0.8 }` and verify round‑trip.
   - POST `/api/params` with `{ color, saturation, brightness }` and verify round‑trip.
5. Void trail control channel
   - POST `/api/params` with `{ custom_param_1: 0.85 }` and verify round‑trip.
6. Audio reactivity
   - POST `/api/audio-config` with `{ active: false }`, verify, then `{ active: true }`, verify.
7. Rate limiting
   - Sends 3 rapid POSTs to `/api/params` (<300ms) to detect `429` behavior.
8. Restore original state
   - Re-applies the original params, pattern, and audio config captured in Snapshot.

## Why It’s Safe

- It saves the original device state, and restores it at the end (params, pattern, audio).
- It waits between writes (default 350ms) to comply with POST `/api/params` rate limit (300ms window). For `/api/audio-config`, allow ≥500ms between GET/POST.
- `--dry` mode previews actions without making changes.

## Usage

- Node: `node tools/k1-diagnose/k1-diagnose.mjs --ip=192.168.1.103`
- NPM: `npm run k1:diagnose -- --ip=192.168.1.103`

Options
- `--ip=<host>` or `--host=<host>`: device address (IP or http(s)://hostname)
- `--dry`: do not send writes (read‑only)
- `--wait=<ms>`: delay between write operations (default 350)

## Interpreting Results

Each step logs PASS/FAIL and saves structured data in a JSON report.

- PASS with “confirmed” → The value round‑tripped as expected in GET.
- FAIL with “mismatch” → The value didn’t round‑trip. Causes include:
  - Firmware ignored the field (unsupported or not wired to params)
  - Firmware clamped the field to a default (e.g., 0)
  - The pattern doesn’t use the param (e.g., palette ignored by pattern)
  - Verify happened inside a rate‑limit window
- FAIL with HTTP 429 → Requests were too close together; increase `--wait`.

## Where Reports Live

- Saved to `tools/k1-diagnose/reports/report-YYYYMMDD-HHMMSS.json`
- Include: target URL, per‑step ok/msg/details, and a summary with failures.

## Extending the Tool

- Add new checks by appending steps in `k1-diagnose.mjs`.
- Respect rate limits: wait ≥350ms between POST `/api/params` and ≥500ms for `/api/audio-config`.
- Keep operations idempotent and restore prior state.

## Common Failure Patterns

- All params echo back as 0 after POST → firmware isn’t applying/persisting values (or fields aren’t in the struct/validator).
- `palette_id` changes but no visual change → the active pattern doesn’t use `params.palette_id`.
- `custom_param_1` set but nothing changes → pattern doesn’t read custom param; UI needs capability handshake or firmware needs wiring.
- Frequent `429` → UI/users are dragging sliders too fast; increase debounce, coalesce updates, and verify after the rate‑limit window.

## Pinning / Prominence

- Linked from `START_HERE.md` under “Troubleshooting: Device Control Diagnostics”.
- File path is stable under `tools/k1-diagnose/`.

