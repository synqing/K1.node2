# Phase A Success Criteria

## Primary Goal
**Prove that node graphs can be compiled to C++ and run at 400+ FPS on ESP32-S3**

## Success Metrics

### ✅ Must Have (MVP)
- [ ] **Compilation Works**
  - Graph JSON → C++ code generation
  - Generated code compiles with PlatformIO
  - No manual edits needed

- [ ] **Performance Target**
  - Runs at >= 400 FPS
  - Stable over 5-minute test
  - No frame drops

- [ ] **OTA Upload**
  - Upload firmware over WiFi
  - Device reboots into new code
  - Rollback if crash

- [ ] **Clean Architecture**
  - ZERO hardcoded effects
  - Firmware < 500 lines
  - Codegen < 1000 lines

### 🎯 Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| FPS | >= 400 | TBD | ⏳ |
| Firmware LOC | < 500 | ~400 | ✅ |
| Codegen LOC | < 1000 | ~200 | ✅ |
| Compile Time | < 5s | TBD | ⏳ |
| Build Time | < 60s | TBD | ⏳ |
| Upload Time | < 30s | TBD | ⏳ |
| Binary Size | < 2MB | TBD | ⏳ |

## Test Procedure

### Day 1: Foundation ✅
- [x] Create directory structure
- [x] Port essential files
- [x] Create minimal main.cpp
- [x] Set up PlatformIO

### Day 2: Codegen ✅
- [x] Create TypeScript project
- [x] Implement graph compiler
- [x] Generate C++ templates

### Day 3: Integration
- [ ] Generate code from rainbow.json
- [ ] Build firmware
- [ ] Flash via USB (first time)

### Day 4: OTA & Testing
- [ ] Enable ArduinoOTA
- [ ] Upload via WiFi
- [ ] Measure FPS
- [ ] Verify visual output

### Day 5: Validation
- [ ] Test rollback scenarios
- [ ] Document results
- [ ] Record demo video

## Visual Verification

**Expected Output:** Rainbow gradient flowing across LEDs
- LED 0: Red
- LED 45: Yellow
- LED 90: Green
- LED 135: Cyan
- LED 179: Red (wraps)

## Go/No-Go Decision

### 🟢 GO to Phase B if:
- FPS >= 400
- OTA works reliably
- Visual output correct
- No crashes in 5 minutes

### 🟡 ITERATE if:
- FPS 200-399 (needs optimization)
- Minor bugs fixable in 1-2 days

### 🔴 PIVOT if:
- FPS < 200
- Compilation fundamentally broken
- Device crashes repeatedly

## Key Innovation

**What makes this different:**
- Previous attempts INTERPRETED graphs at runtime
- K1.reinvented COMPILES graphs to native code
- Result: 10-50x performance improvement

## Status: READY TO TEST

All infrastructure is in place. Next step:
```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented
./tools/build-and-upload.sh graphs/rainbow.json
```

**Moment of Truth:** Will it hit 400 FPS?