---
title: Claude Skills + QA Pack for K1.node2
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Claude Skills + QA Pack for K1.node2

This pack wires in:
- A Claude Skill (`k1-firmware-ops`) that documents the end-to-end flow
- A unified bash script that builds and uploads firmware, capturing artifacts
- Playwright tests for API + dashboard UI
- A release notes generator that summarizes results

## Install
1. Copy all files to the **root** of your `K1.node2` repository (preserving folders).
2. Ensure dependencies:
   - PlatformIO CLI (`pio`)
   - Node.js 18+ and npm
3. Populate `tools/k1.config.json` with your device IP and preferences.

## Run (end-to-end)
```bash
bash tools/k1_firmware_ops.sh --pattern "Twilight" --ip "192.168.1.50" --qa true
node tools/release/generate_release_notes.mjs
```

Artifacts will land in `artifacts/<timestamp>/` and a `LATEST_RELEASE_NOTES.md` will be created at the repo root.

## Notes
- The ops script will prefer your existing `tools/build-and-upload.sh` if present.
- If HTTP OTA (`/update`) isn't reachable, the script falls back to ArduinoOTA via PlatformIO.
- The Playwright tests are conservative by default (GETs only). To try a POST params update, place a JSON body at `artifacts/<timestamp>/params.sample.json` and re-run tests.
