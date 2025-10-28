# K1.reinvented Technology Stack

## Firmware (ESP32-S3)

**Platform**: PlatformIO with Arduino framework
**Target**: esp32-s3-devkitc-1
**Language**: C++ with minimal abstraction

### Key Libraries
- ArduinoOTA - Over-the-air firmware updates
- ESPAsyncWebServer (v3.5.1) - REST API for control app
- AsyncTCP (v3.3.2) - Async networking
- ArduinoJson (^6.21.4) - JSON parsing
- ESP-DSP - Audio signal processing

### Build Commands
```bash
# From firmware/ directory
pio run                          # Build firmware
pio run -t upload               # Upload via serial
pio run -t upload --upload-port <ip>  # OTA upload
pio device monitor --baud 2000000     # Serial monitor
pio test                        # Run unit tests
```

### Configuration
- Serial: 2000000 baud
- Partition table: `partitions.csv` (custom for SPIFFS + OTA)
- Filesystem: SPIFFS for web UI assets
- Build flags: `-Os` (optimize for size), minimal debug output

## Codegen (TypeScript)

**Runtime**: Node.js
**Language**: TypeScript 5.3+
**Build**: tsc (TypeScript compiler)

### Dependencies
- handlebars (^4.7.8) - Template engine for C++ generation
- commander (^11.1.0) - CLI argument parsing

### Build Commands
```bash
# From codegen/ directory
npm install                     # Install dependencies
npm run build                   # Compile TypeScript
npm run compile                 # Build + run codegen
node dist/index.js <graph.json> <output.h>  # Generate C++
```

### Usage
Converts JSON node graphs to optimized C++ pattern code. Output is header file included in firmware build.

## Control App (React + TypeScript)

**Framework**: React 18.3.1
**Language**: TypeScript 5.6.3
**Build Tool**: Vite 6.4.1 with SWC plugin
**Styling**: Tailwind CSS 3.4.15
**UI Components**: Radix UI + shadcn/ui

### Key Dependencies
- React 18.3.1 + React DOM
- 30+ Radix UI components (pinned versions)
- Recharts (^2.15.2) - Real-time visualization
- Lucide React (^0.487.0) - Icons
- Sonner (^2.0.3) - Notifications

### Build Commands
```bash
# From k1-control-app/ directory
npm install                     # Install dependencies
npm run dev                     # Dev server (port 3000)
npm run build                   # Production build
npm run preview                 # Preview production build
npm run type-check              # TypeScript validation
npm run test                    # Run Vitest tests
npm run test:e2e                # Playwright E2E tests
npm run storybook               # Component development
```

### Development
- Dev server: `http://localhost:3000` with HMR
- Build output: `build/` directory
- Path aliases: `@/*` maps to `src/*`

## Integrated Build Pipeline

**Primary workflow**: `./tools/build-and-upload.sh <pattern> [device_ip]`

This script orchestrates:
1. Codegen: Compile JSON graph to C++ header
2. Firmware: Build with PlatformIO
3. Upload: OTA deployment to device

Example:
```bash
./tools/build-and-upload.sh departure 192.168.1.100
```

## Testing

### Firmware Tests
- Framework: Unity (PlatformIO)
- Location: `firmware/test/`
- Run: `pio test`

### Control App Tests
- Unit/Component: Vitest + React Testing Library
- Integration: MSW (Mock Service Worker)
- E2E: Playwright
- Visual: Storybook

### Layer 3 Desktop Tests
- Framework: CMake + CTest
- Location: `layer3_dsp_desktop/`
- Purpose: Desktop validation of DSP algorithms

## Audio System

**Hardware**: SPH0645 MEMS I2S microphone
**Sample Rate**: 16 kHz (configurable to 12.8 kHz)
**Processing**: Dual-core architecture
- Core 0: Audio acquisition and analysis
- Core 1: LED rendering and WiFi

**Pipeline**:
1. I2S DMA acquisition (128-sample chunks)
2. Goertzel frequency analysis (64 musical bins)
3. Beat detection and tempo tracking
4. Chromagram (12 pitch classes)
5. Lock-free buffer sync to rendering core

## Development Tools

- **PlatformIO**: Firmware build and upload
- **npm/Node.js**: Codegen and control app
- **CMake**: Desktop DSP testing
- **Git**: Version control
- **Serial Monitor**: Real-time firmware debugging

## Architecture Patterns

- **Firmware**: Header-only components, minimal abstraction, compile-time optimization
- **Codegen**: Template-based code generation with Handlebars
- **Control App**: Functional React components with hooks, TypeScript strict mode
- **Audio**: Double-buffered lock-free reads, ring buffer for sample history
- **Networking**: Async REST API, OTA updates, mDNS discovery

## Performance Considerations

- Firmware optimized for `-Os` (size) to fit in flash
- Audio processing budgeted at <70% Core 0 utilization
- LED rendering maintains 120 FPS on Core 1
- Control app uses React.memo and useMemo for expensive renders
- OTA updates don't block audio or rendering
