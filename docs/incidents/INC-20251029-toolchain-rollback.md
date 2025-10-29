# Incident Report: Toolchain Pinning Broke IDF5-only Drivers, Full System Rollback Executed

Date: 2025-10-29
Status: Resolved via rollback to commit `9ff9cef` on branch `rollback/production-baseline-9ff9cef`

## Summary

Firmware builds and runtime stability regressed after pinning the PlatformIO `platform` to a version that resolved Arduino-ESP32 2.0.11 (ESP-IDF 4.4). The codebase depends on ESP-IDF 5.x driver APIs (I2S Standard mode and RMT v2). These APIs do not exist in IDF 4.4, causing build breakage and incompatible runtime paths. We executed a full, documented rollback to the last known good state and restored a stable baseline.

## Impact

- Firmware: Build failures and/or runtime incompatibilities due to missing `i2s_std` and RMT v2 APIs in Arduino 2.0.11/IDF 4.4.
- Frontend: No direct breakage; included for completeness in system rollback verification.
- No database/infrastructure changes were part of this repo; those phases were N/A in this context.

## Root Cause Analysis

- Change: Pinning `platform = espressif32 @ 6.4.0` in `platformio.ini`.
- Resolution consequence: Arduino-ESP32 2.0.11 (ESP-IDF 4.4) is selected by PlatformIO.
- Mismatch: The firmware uses ESP-IDF 5.x-only drivers (I2S Standard mode and RMT v2 handles), not available in IDF 4.4.
- Result: Build and/or runtime breakage when toolchain downgraded beneath driver API requirements.

References:
- ADR-0010: Toolchain Pinning and Driver API Compatibility.
- Production baseline commit: `9ff9cef` ("Dual-core production deployment approved - ready for OTA").

## Timeline (UTC)

- 19:12:54 – Created full repo backup artifacts and stashed local changes.
- 19:13:00 – Created rollback branch `rollback/production-baseline-9ff9cef` at commit `9ff9cef`.
- 19:15:00 – Verified firmware dependency resolution under Arduino 3.x / ESP-IDF 5.x and executed clean build.
- 19:16:00 – Installed frontend dependencies and validated production build.
- 19:22:00 – Completed post-rollback validation checks and documented incident.

## Resolution Actions

1. Backup
   - Generated a git bundle and component snapshots in `artifacts/rollback/<timestamp>/`.

2. Rollback Execution
   - Stashed working changes.
   - Created and switched to rollback branch at `9ff9cef`.

3. Firmware Verification
   - Installed scoped dependencies for `env:esp32-s3-devkitc-1`.
   - Performed clean build:
     - RAM: 36.8% used (120,584 bytes of 327,680).
     - Flash: 60.4% used (1,186,545 bytes of 1,966,080).
     - Output: `.pio/build/esp32-s3-devkitc-1/firmware.bin` created successfully.

4. Frontend Verification
   - Installed dependencies successfully.
   - Built production assets successfully (Vite). Warning observed: some chunks > 500 kB post-minification.

5. Post-Rollback Validation
   - System functionality: Firmware builds, frontend builds without errors.
   - Data consistency: N/A (no database in this repository).
   - Performance: Firmware size within expected bounds; frontend produced large chunk warning (historical behavior). Consider code-splitting in future.
   - Security: `npm audit --omit=dev` reported 0 vulnerabilities.

## Lessons Learned

- Platform pinning must respect driver API levels in use. Arduino-ESP32 version indirectly chooses ESP-IDF level; pinning below required level silently removes needed APIs.
- Cross-checking driver APIs (I2S, RMT) against the resolved toolchain must be part of PR validation.
- Keeping a production-approved baseline branch/commit greatly speeds safe recovery.

## Preventive Measures

- Follow ADR-0010 policy:
  - Do not pin `platform = espressif32` to versions that resolve Arduino-ESP32 2.x when code relies on IDF 5.x APIs.
  - If Arduino 2.x is required, migrate code paths to IDF 4.x-compatible drivers first.
- Add CI guardrails:
  - Check and fail builds if resolved Arduino core < 3.x when IDF5-only drivers are detected.
  - Add a PR checklist for `platformio.ini` changes and runtime driver API migration steps.
- Maintain a rollback playbook and artifacts location in the repo to reduce MTTR.

## Verification Evidence (Pointers)

- Firmware build logs and artifact: `.pio/build/esp32-s3-devkitc-1/firmware.bin`.
- Frontend build completed with Vite; chunk size warning observed.
- Security audit: `npm audit --omit=dev` → 0 vulnerabilities.

## Approvals

- Prepared by: Engineering
- Approved by: Project Owner / Tech Lead

