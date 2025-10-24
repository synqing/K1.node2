---
description: Compile K1.reinvented firmware without uploading
---

Compile the firmware for K1.reinvented without uploading to device.

## Steps

1. Navigate to firmware directory
2. Run PlatformIO build
3. Report success or failures

```bash
cd firmware && pio run
```

## Expected Output

- Build completes without errors
- Firmware binary created at `.pio/build/esp32-s3-devkitc-1/firmware.bin`
- No warnings about protected constants

## If Build Fails

Check:
- Is codegen output (`src/generated_effect.h`) valid C++?
- Are all dependencies installed (`pio pkg install`)?
- Is platformio.ini configuration correct?
