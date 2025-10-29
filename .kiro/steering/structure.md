# K1.reinvented Project Structure

## Root Organization

```
K1.reinvented/
├── firmware/              # ESP32-S3 embedded firmware
├── codegen/              # JSON graph → C++ compiler
├── k1-control-app/       # React web control interface
├── graphs/               # Pattern definitions (JSON node graphs)
├── tools/                # Build scripts and utilities
├── docs/                 # All documentation (see taxonomy below)
├── Implementation.plans/ # Active execution artifacts
├── host/                 # Desktop tooling (libgraph)
├── layer3_dsp_desktop/   # Desktop DSP validation
└── tests/                # E2E integration tests
```

## Firmware Structure (`firmware/`)

```
firmware/
├── src/
│   ├── main.cpp                    # Entry point, setup/loop
│   ├── types.h                     # Core type definitions
│   ├── led_driver.h                # RMT LED control
│   ├── parameters.h                # Pattern parameter system
│   ├── pattern_registry.h          # Pattern management
│   ├── generated_patterns.h        # Codegen output (included)
│   ├── palettes.h                  # Color palette definitions
│   ├── easing_functions.h          # Animation easing
│   ├── webserver.h                 # REST API
│   ├── profiler.h                  # Performance monitoring
│   └── audio/                      # Audio processing subsystem
│       ├── microphone.h            # I2S SPH0645 interface
│       ├── goertzel.h              # Frequency analysis
│       ├── tempo.h                 # Beat detection
│       └── [other audio modules]
├── test/                           # Unity test suites
├── data/                           # SPIFFS filesystem (web UI)
├── platformio.ini                  # Build configuration
└── partitions.csv                  # Flash partition table
```

**Key Patterns**:
- Header-only components for compile-time optimization
- Minimal abstraction, direct hardware access
- Audio subsystem isolated in `audio/` folder
- Generated code included via `generated_patterns.h`

## Codegen Structure (`codegen/`)

```
codegen/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── audio_nodes.ts              # Audio node definitions
│   ├── validation_tests.ts         # Graph validation
│   └── layer1/                     # Layer 1 graph processing
├── compliant_patterns/             # Validated pattern library
├── test_patterns/                  # Test/validation patterns
├── dist/                           # Compiled TypeScript output
├── package.json
└── tsconfig.json
```

**Key Patterns**:
- TypeScript compiled to `dist/` before execution
- Handlebars templates generate C++ code
- Validation runs before code generation
- Output is single header file for firmware

## Control App Structure (`k1-control-app/`)

```
k1-control-app/
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root component
│   ├── api/                        # K1 device communication
│   │   ├── K1Client.ts             # REST API client
│   │   └── types.ts                # API type definitions
│   ├── components/                 # React components
│   │   ├── views/                  # Page-level components
│   │   ├── controls/               # Control widgets
│   │   └── ui/                     # Reusable UI primitives
│   ├── types/                      # TypeScript definitions
│   ├── styles/                     # Additional styling
│   └── test/                       # Component tests
├── build/                          # Production build output
├── public/                         # Static assets
├── index.html                      # HTML template
├── vite.config.ts                  # Vite configuration
├── package.json
└── tsconfig.json
```

**Key Patterns**:
- Functional components with hooks
- Radix UI + shadcn/ui component library
- API layer separated from UI components
- Tests colocated with source in `test/`

## Documentation Taxonomy (`docs/`)

**Follow CLAUDE.md routing rules strictly**

```
docs/
├── architecture/          # System design, component interaction
├── analysis/             # Deep dives, forensics, comparisons
├── planning/             # Future work, migration plans
├── reports/              # Phase closeouts, validation summaries
├── adr/                  # Architecture Decision Records
├── templates/            # Reusable scaffolds
├── resources/            # Quick references, glossaries
├── api/                  # API documentation
├── baseline/             # Performance baselines
├── features/             # Feature catalogs
├── implementation/       # Implementation summaries
├── qa/                   # Quality assurance
├── research/             # Research findings
└── roadmap/              # Project roadmaps
```

**Routing Rules**:
- Architecture overviews → `docs/architecture/`
- Technical analysis → `docs/analysis/`
- Decision records → `docs/adr/` (ADR-####-*.md format)
- Phase reports → `docs/reports/`
- Planning proposals → `docs/planning/`
- When in doubt, prefer `docs/` over root

## Active Work (`Implementation.plans/`)

```
Implementation.plans/
├── roadmaps/             # Active execution plans
├── runbooks/             # Step-by-step operational guides
└── backlog/              # Prioritized task queues
```

**Key Rule**: Only living execution artifacts belong here. Historical/informational content goes in `docs/`.

## Tools Structure (`tools/`)

```
tools/
├── build-and-upload.sh           # Primary build pipeline
├── k1_firmware_ops.sh            # Firmware operations
├── device-control.sh             # Device control utilities
├── src/                          # TypeScript tooling
├── scripts/                      # Helper scripts
├── qa/                           # Quality assurance tools
├── release/                      # Release management
└── artifacts/                    # Build artifacts
```

**Primary Workflow**: `./tools/build-and-upload.sh <pattern> [device_ip]`

## Pattern Definitions (`graphs/`)

```
graphs/
├── departure.json                # Journey pattern
├── lava.json                     # Intensity pattern
├── twilight.json                 # Peaceful pattern
└── [other patterns].json
```

**Format**: JSON node graphs compiled by codegen into C++

## Naming Conventions

### Files
- Use `snake_case` for most files
- Uppercase prefixes for formal docs: `PHASE_`, `ADR-####-`, `README`
- ISO dates only when chronology matters: `2025-10-27_status.md`

### Code
- **Firmware**: `snake_case` for functions/variables, `UPPER_CASE` for constants
- **TypeScript**: `camelCase` for functions/variables, `PascalCase` for types/classes
- **React**: `PascalCase` for components, `camelCase` for hooks

### Documentation
- Front matter with: author, date, status, intent
- Update nearest index when adding docs
- Cross-reference related documents

## Key Architectural Boundaries

### Separation of Concerns
- **Computer (codegen)**: Creates patterns, compiles to C++
- **Device (firmware)**: Executes compiled patterns at max performance
- **Human (control app)**: Expresses intent, adjusts parameters

### Core Allocation (Firmware)
- **Core 0**: Audio acquisition and analysis
- **Core 1**: LED rendering, WiFi, OTA

### Data Flow
1. Pattern designed as JSON graph
2. Codegen compiles to C++ header
3. Firmware includes and executes
4. Control app adjusts parameters via REST API
5. Audio pipeline feeds real-time data to patterns

## File Ownership Rules

### Generated Files (Do Not Edit Manually)
- `firmware/src/generated_patterns.h` - Output from codegen
- `codegen/dist/*` - Compiled TypeScript
- `k1-control-app/build/*` - Vite build output
- `firmware/.pio/*` - PlatformIO build artifacts

### Configuration Files (Edit Carefully)
- `firmware/platformio.ini` - Firmware build config
- `firmware/partitions.csv` - Flash layout
- `k1-control-app/vite.config.ts` - Frontend build config
- `k1-control-app/tsconfig.json` - TypeScript config

### Source of Truth
- Pattern definitions: `graphs/*.json`
- Firmware logic: `firmware/src/*.h`
- Control app: `k1-control-app/src/`
- Documentation: `docs/` (follow CLAUDE.md taxonomy)

## Common Workflows

### Add New Pattern
1. Create `graphs/pattern_name.json`
2. Run `./tools/build-and-upload.sh pattern_name <device_ip>`
3. Test on device
4. Document in `docs/` if significant

### Modify Firmware
1. Edit `firmware/src/*.h`
2. Build: `cd firmware && pio run`
3. Test: `pio test`
4. Upload: `pio run -t upload --upload-port <ip>`
5. Document changes in `Implementation.plans/runbooks/` or `docs/reports/`

### Update Control App
1. Edit `k1-control-app/src/`
2. Test: `npm run test`
3. Build: `npm run build`
4. Deploy: Copy `build/` to firmware `data/` folder

### Add Documentation
1. Classify using CLAUDE.md routing table
2. Place in correct `docs/` subfolder
3. Add front matter (author, date, status, intent)
4. Update nearest index file
5. Cross-reference related docs

## Anti-Patterns to Avoid

- **Root-level sprawl**: Don't create files in project root (use `docs/` or appropriate subfolder)
- **Duplicate documentation**: Check existing docs before creating new ones
- **Manual edits to generated files**: Always regenerate via build tools
- **Mixing concerns**: Keep firmware, codegen, and control app boundaries clear
- **Undocumented decisions**: Create ADRs for architectural choices
- **Orphaned files**: Always update indices when adding documentation

## Quick Reference

**Build firmware**: `cd firmware && pio run`
**Generate pattern**: `cd codegen && npm run compile`
**Full pipeline**: `./tools/build-and-upload.sh <pattern> <ip>`
**Control app dev**: `cd k1-control-app && npm run dev`
**Run tests**: `pio test` (firmware) or `npm test` (control app)
**Documentation**: Follow CLAUDE.md taxonomy strictly
