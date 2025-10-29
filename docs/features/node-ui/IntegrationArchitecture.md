---
title: Application Integration Strategy – K1 Control App + Node UI
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Application Integration Strategy – K1 Control App + Node UI

## Overview
Integrate the Node Graph Editor into the `k1-control-app` with shared state, unified design system, consistent navigation, and performance-conscious data flows between front-end, codegen, and firmware.

## Shared State Management
- Providers
  - Keep `K1Provider` for device connection, transport (WS/REST), parameters, patterns, telemetry.
  - Add `GraphProvider` (new) to manage graph schema, node/wire state, validation results, compile status.
  - Compose providers at App root: `<K1Provider><GraphProvider>…</GraphProvider></K1Provider>`.
- Persistence
  - Local storage for recent graphs and preferences; versioned wrapper matching `K1StorageWrapper`.
  - Optional cloud sync later via export/import.
- Events
  - Graph events: `nodeAdded`, `wireConnected`, `graphValidated`, `compileCompleted`, `publishStarted/Done`.
- Data Contracts
  - Graph schema aligned to codegen `Node`, `Wire`, `Graph` interfaces (ids, types, params, ports).

## Unified Design System
- Tokens
  - Use CSS variables in `index.css` to mirror Figma design tokens (colors, typography, spacing, radii, elevation).
  - Ensure Node Editor components use K1Button, K1Card, K1Modal patterns for consistency.
- Components
  - New: `NodeCanvas`, `NodeCard`, `WirePath`, `InspectorPanel`, `GraphOutline`, `Toolbar`, `StatusToasts`.
  - Reuse: color controls, audio presets, modals, toasts.

## Navigation Framework
- App Integration
  - Add `NodeEditorView` route alongside `control`, `profiling`, `terminal`, `debug`, `qa`.
  - Update `TopNav` to include Editor; show breadcrumb inside Editor.
- Deep Links
  - Support `?graph=<id>`; load from local storage or server.
- State Preservation
  - Preserve device connection across view switches; Node Editor can publish to current endpoint.

## Performance Optimization
- Transport
  - Prefer WebSocket for live preview; REST fallback via `K1Client` is already supported.
- Canvas
  - Avoid frequent re-renders; layer wires separate from nodes; throttle drag updates; use requestAnimationFrame.
- Compile Pipeline
  - Off-main-thread compilation via Web Worker or remote service to avoid UI stutter.
  - Debounce compile on small edits; batch changes.
- Publishing
  - Limit payload size; compress graph JSON where needed; incremental updates if supported.

## Compile + Publish Integration
- Compile
  - Front-end invokes codegen with current graph; returns `generated_patterns.h` (or diff).
  - Display validation: center-origin compliance, audio macro presence for audio-reactive graphs.
- Publish
  - Use existing firmware ops (REST endpoints/OTA pipeline) to upload compiled artifacts.
  - Track status via `GraphProvider` and show toasts/HUD.
- Preview
  - Confirm pattern selection via `/api/select`; monitor `/ws` for real-time parameters/performance.

## Data Flow Diagram (text)
```
NodeEditorView → GraphProvider (graph state) → Codegen (Worker/Service)
  → artifacts (.h/.cpp) → Firmware Ops (upload/select) → Device
    ↘ WebSocket (/ws) → K1Provider → Preview/Telemetry in UI
```

## Migration Plan
- Phase 1: Scaffold `NodeEditorView`, `GraphProvider`, static sample graph, validation overlay.
- Phase 2: Integrate codegen compile (worker), publish pipeline, live preview.
- Phase 3: Screen-by-screen refinements, accessibility hardening, performance tuning.

## Risks & Mitigations
- Long compile times → use Web Worker; show progress; cache results.
- Transport instability → leverage WS fallback to REST; exponential backoff in `K1Client`.
- Design divergence → enforce tokens/components; lint UI styles; review cycles with Figma source of truth.

