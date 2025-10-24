---
description: Build and upload K1.reinvented pattern to device
---

Build and upload a specific pattern to the K1 device via OTA.

## Usage

Ask me to flash a pattern:
- "Flash departure to 192.168.1.100"
- "Upload lava pattern"
- "Deploy twilight to the device"

## What This Does

1. Runs the build-and-upload script with specified pattern
2. Compiles the graph to C++
3. Builds firmware with PlatformIO
4. Uploads via OTA to device

## Required

- WiFi credentials set in `firmware/src/main.cpp`
- Device IP address (first time) or mDNS hostname
- Device on same network as build machine

## Example

```bash
./tools/build-and-upload.sh departure 192.168.1.100
```

## Patterns Available

- **departure** - Transformation journey (dark earth → golden light → emerald green)
- **lava** - Primal intensity (black → deep red → blazing orange → white hot)
- **twilight** - Peaceful contemplation (warm amber → deep purple → midnight blue)
