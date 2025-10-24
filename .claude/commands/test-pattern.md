---
description: Quick iteration: compile specific pattern graph to C++ and verify output
---

Test a pattern by compiling its graph to C++ and examining the generated code.

## Usage

"Test the departure pattern"
"Compile lava graph and show me the output"
"Verify twilight pattern generates correct code"

## What This Does

1. Runs codegen on specified pattern's JSON graph
2. Generates `firmware/src/generated_effect.h`
3. Shows you the generated C++ code
4. Verifies it compiles without errors

## Example

```bash
cd codegen && npm run build
node dist/index.js ../graphs/departure.json ../firmware/src/generated_effect.h
```

Then inspect the generated code to verify:
- Palette colors are correct
- Interpolation logic is present
- No placeholder code remains

## Available Patterns

- `graphs/departure.json`
- `graphs/lava.json`
- `graphs/twilight.json`
