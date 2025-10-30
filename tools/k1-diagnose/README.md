# K1 Diagnose

CLI tool to sanity‑check a K1 device’s HTTP control API end‑to‑end.

- Verifies connectivity
- Snapshots current params/patterns/audio config
- Tests palette switching (valid + invalid/clamp)
- Tests brightness and HSV param round‑trip
- Tests a control channel (`custom_param_1`) for "void trail" mapping
- Tests audio reactivity off/on
- Probes rate limiting on `/api/params`
- Restores original pattern/params/audio state
- Produces a JSON report under `tools/k1-diagnose/reports/`

## Usage

- `node tools/k1-diagnose/k1-diagnose.mjs --ip=192.168.1.103`
- `npm run k1:diagnose -- --ip=192.168.1.103`

Optional flags:
- `--dry` Do not send write requests
- `--wait=350` Delay between POSTs (ms) to comply with firmware rate limit

## Output

- Console summary with PASS/FAIL per step
- Report JSON saved as `tools/k1-diagnose/reports/report-YYYYMMDD-HHMMSS.json`

## Notes

- The tool attempts to switch to a palette‑aware pattern (Departure/Lava/Twilight) if available for palette tests; otherwise it stays on the current pattern.
- If firmware lacks fields (e.g., certain params), the tool will mark them as mismatched and include the round‑trip values in the report.
- Rate limiting: firmware enforces ~300ms window for POST `/api/params`. The default wait is 350ms between writes.
