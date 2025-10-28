---
title: K1 Control App - Codebase Foundations & Architecture
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1 Control App - Codebase Foundations & Architecture

**Author:** Claude Code Agent (Codebase Audit)
**Date:** 2025-10-27
**Status:** Published
**Intent:** Single source of truth for K1 Control App's technology stack, API contracts, state management, and component architecture

---

## Table of Contents

1. [Build & Runtime](#build--runtime)
2. [K1 Client & Transport Layer](#k1-client--transport-layer)
3. [State Management](#state-management)
4. [Component Architecture](#component-architecture)
5. [Data Persistence](#data-persistence)
6. [Configuration & Environment](#configuration--environment)
7. [Development Setup](#development-setup)

---

## Build & Runtime

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Build Tool** | Vite | Latest | Fast HMR dev server, ESNext build target |
| **Runtime** | React 18 | 18.x | React-jsx transform (no JSX import needed) |
| **Language** | TypeScript | 5.x | Strict mode enabled |
| **Package Manager** | npm | Latest | Lock file: package-lock.json |
| **Styling** | Tailwind CSS + CSS vars | v3 | K1 design tokens in `src/styles/design-tokens-v2.css` |
| **UI Components** | shadcn/ui + Radix UI | Latest | 40+ pre-built components in `src/components/ui/` |
| **Icons** | lucide-react | Latest | SVG-based, tree-shakeable |
| **Testing** | Vitest + React Testing Library | Latest | Global setup in `src/test/setup.ts` |
| **Linting** | ESLint + Prettier | Latest | Configured via `vite.config.ts` |
| **Bundling** | SWC via @vitejs/plugin-react-swc | Latest | Optimized builds + HMR |

### Build Configuration

**File:** `vite.config.ts` (22 lines)

```typescript
// Key config:
- plugins: [@vitejs/plugin-react-swc]
- resolve.alias: @ → ./src
- build.target: esnext
- build.outDir: build
- server.port: 3000
- server.open: true (auto-opens browser on dev start)
```

**Output:** Production build → `build/` directory (dist structure)

### TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Current Status:** 102 TypeScript errors (pending fixes - primarily styled-jsx blocks in K1 components and unused variables in strict mode)

---

## K1 Client & Transport Layer

### K1Client Implementation

**File:** `src/api/k1-client.ts` (628 lines)
**Pattern:** Class-based, instantiated per endpoint (not a singleton)

#### Constructor & Connection

```typescript
constructor(endpoint: string)
async connect(endpoint: string): Promise<K1DeviceInfo>
```

- `endpoint` format: `http://192.168.1.103` or `https://k1.local`
- Connection flow:
  1. Test with GET `/api/patterns`
  2. Emit `open` event on success
  3. Initialize WebSocket if enabled
  4. Fall back to REST polling if WS unavailable

#### Core Methods

| Method | Signature | Endpoint | Returns |
|--------|-----------|----------|---------|
| **selectPattern** | `async selectPattern(patternId: string)` | POST `/api/select` | `K1ApiResponse<{ pattern: K1Pattern }>` |
| **updateParameters** | `async updateParameters(params: Partial<K1Parameters>)` | POST `/api/params` | `K1ApiResponse<{ params: K1Parameters }>` |
| **setPalette** | `async setPalette(paletteId: number)` | POST `/api/params` | `K1ApiResponse<{ palette_id: number }>` |
| **getParameters** | `async getParameters()` | GET `/api/params` | `K1Parameters` |
| **getPatterns** | `async getPatterns()` | GET `/api/patterns` | `K1PatternResponse` |
| **getDeviceInfo** | `async getDeviceInfo()` | (mocked) | `K1DeviceInfo` |
| **disconnect** | `async disconnect()` | (cleanup) | `void` |

#### Parameter Scaling

- **UI → Firmware:** Divide by 100 (0-100 → 0.0-1.0) for:
  - brightness, speed, saturation, warmth, softness
  - color, color_range, background, dithering
  - custom_param_1, custom_param_2, custom_param_3
- **Firmware → UI:** Multiply by 100 (0.0-1.0 → 0-100)
- **Palette ID:** Passed as integer (no scaling)

#### WebSocket Transport

**Connection Flow:**

```
endpoint: "http://192.168.1.103"
→ buildWsUrl()
→ "ws://192.168.1.103/ws"
```

- Real-time data endpoint: `ws(s)://<host>/ws`
- Message format: JSON with `{ performance, audio, parameters, pattern_changed }` fields
- Update rate: Device-initiated (K1Client receives and emits)
- Fallback: REST polling at ~20Hz (50ms interval) if WS unavailable

**WebSocket Events:**

- `onopen`: Disables polling, emits `transportChanged`
- `onmessage`: Parses JSON, emits `performanceData`, `audioData`, `realtimeData`
- `onerror` / `onclose`: Falls back to REST polling, emits `transportChanged`

#### Event System

```typescript
on(event: string, handler: (payload: any) => void)
off(event: string, handler: (payload: any) => void)
emit(event: string, payload?: any)
```

**Emitted Events:**

- `open`: Device connected
- `close`: Device disconnected
- `transportChanged`: WS ↔ REST switch
- `realtimeData`: Combined audio + performance + parameters
- `performanceData`: FPS, frame time, CPU, memory
- `audioData`: Spectrum, chromagram, VU level, tempo
- `transportChanged`: WebSocket availability update

#### Error Handling

- **Error Class:** `K1Error` (src/utils/error-types.ts)
- **Error Codes:** CONNECTION_FAILED, CONNECTION_TIMEOUT, NETWORK_ERROR, VALIDATION_ERROR, etc.
- **Retry Strategy:** `withRetry(fn, { maxAttempts: 3, baseDelay: 1000, retryCondition })` in src/utils/retry.ts
- **Handler:** `setErrorHandler(handler: (error: K1Error) => void)`

---

## State Management

### Pattern: React Context + useReducer

**Provider File:** `src/providers/K1Provider.tsx` (600+ lines)

#### State Shape

```typescript
interface K1ProviderState {
  // Connection
  connection: K1ConnectionState // 'disconnected' | 'connecting' | 'connected' | 'error'
  deviceInfo: K1DeviceInfo | null

  // Transport
  transport: {
    wsAvailable: boolean
    restAvailable: boolean
    wsDisabled: boolean
    activeTransport: 'ws' | 'rest'
  }

  // Reconnection
  reconnect: {
    attemptCount: number
    nextDelay: number
    maxDelay: number
    isActive: boolean
  }

  // Pattern & Parameters
  selectedPatternId: string | null
  parameters: K1Parameters
  activePaletteId: number

  // Error Management
  lastError: K1Error | null
  errorHistory: K1Error[]

  // Feature Flags
  featureFlags: {
    enableAudioReactive: boolean
    enableWebSocket: boolean
    enableProfiling: boolean
    enableDebugHUD: boolean
    // ... additional flags
  }

  // Telemetry
  telemetry: K1TelemetryState
  recording: boolean
}
```

#### Reducer Actions

| Action Type | Payload | Effect |
|-------------|---------|--------|
| `SET_CONNECTION_STATE` | `K1ConnectionState` | Update connection status |
| `SET_DEVICE_INFO` | `K1DeviceInfo \| null` | Store device metadata |
| `SET_SELECTED_PATTERN` | `string \| null` | Update active pattern |
| `SET_PARAMETERS` | `K1Parameters` | Replace all parameters |
| `UPDATE_PARAMETERS` | `Partial<K1Parameters>` | Merge parameter updates |
| `SET_PALETTE` | `number` | Change active palette |
| `SET_ERROR` | `K1Error` | Add error (append to history) |
| `CLEAR_ERROR` | (none) | Clear last error |
| `CLEAR_ERROR_HISTORY` | (none) | Empty error history |
| `SET_TRANSPORT_FLAGS` | `Partial<transport>` | Update WS/REST state |
| `SET_RECONNECT_STATE` | `Partial<reconnect>` | Update retry state |
| `SET_FEATURE_FLAG` | `{ flag: string; value: boolean }` | Toggle feature |
| `INCREMENT_TELEMETRY` | `{ metric: string; value?: number }` | Increment counter |
| `UPDATE_TELEMETRY` | `K1TelemetryState` | Replace telemetry |
| `SET_RECORDING` | `boolean` | Start/stop session recording |
| `RESET_STATE` | (none) | Return to initial state |

#### Provider Exports

```typescript
// Hook to read state
export function useK1State(): K1ProviderState

// Hook to dispatch actions
export function useK1Actions(): K1ProviderActions

// Hook for connection
export function useK1(): K1ContextValue | null
```

#### Configuration Props

```typescript
interface K1ProviderProps {
  children: React.ReactNode
  initialEndpoint?: string // default: '192.168.1.103'
  initialFeatureFlags?: Partial<K1ProviderState['featureFlags']>
  hmrDelayMs?: number // back-compat prop
  devConfig?: { hmrDelayMs?: number; debugAborts?: boolean }
}
```

#### Initialization

```typescript
<K1Provider
  initialEndpoint="192.168.1.103"
  devConfig={{ hmrDelayMs: 500, debugAborts: true }}
>
  <App />
</K1Provider>
```

---

## Component Architecture

### Component Hierarchy

```
App
├── K1Provider
│   ├── ErrorProvider
│   ├── ErrorBoundary
│   ├── TopNav
│   ├── Sidebar
│   ├── Views
│   │   ├── ControlPanelView
│   │   │   ├── EffectSelector
│   │   │   ├── EffectParameters
│   │   │   └── ColorManagement
│   │   │       ├── ColorPaletteSelector
│   │   │       ├── BasicColorControls
│   │   │       ├── ColorMotionControls
│   │   │       └── AudioReactivePresets
│   │   ├── DebugView
│   │   ├── ProfilingView
│   │   └── TerminalView
│   └── DeviceDiscoveryModal
└── Toaster (sonner)
```

### Key Control Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| **EffectSelector** | `src/components/control/EffectSelector.tsx` | Pattern/effect selection | `selectedEffect`, `onEffectChange`, `disabled` |
| **EffectParameters** | `src/components/control/EffectParameters.tsx` | Real-time parameter tuning | (reads from context) |
| **ColorManagement** | `src/components/control/ColorManagement.tsx` | Color palette & motion | `disabled` |
| **GlobalSettings** | `src/components/control/GlobalSettings.tsx` | Device-wide controls | `disabled` |
| **StatusBar** | `src/components/control/StatusBar.tsx` | Connection status display | (reads from context) |

### Design System Components (K1 v2.0)

**Location:** `src/components/k1/`

| Component | Status | States | Features |
|-----------|--------|--------|----------|
| **K1Button** | ✅ Deployed | primary, secondary, tertiary; sm, md, lg | hover lift, loading spinner, error state |
| **K1Input** | ✅ Deployed | default, focus, error, disabled | validation, helper text, ARIA |
| **K1Card** | ✅ Deployed | default, hover, selected, disabled | elevation, hover lift, keyboard nav |
| **K1Modal** | ✅ Deployed | entrance/exit animations | focus trap, Escape close, backdrop |
| **K1Toast** | ✅ Deployed | info, success, warning, error | auto-dismiss, aria-live |

**Export:** Central `src/components/k1/index.ts` provides named exports

### UI Library (shadcn/ui)

**Location:** `src/components/ui/` (40+ components)

- Button, Input, Card, Dialog, Drawer, Sheet
- Slider, Toggle, Switch, Checkbox, Radio
- Tabs, Accordion, Popover, Tooltip
- Alert, Badge, Progress, Breadcrumb
- And more (Radix UI primitives)

### Layout Components

| Component | Responsibility | Key State |
|-----------|-----------------|-----------|
| **TopNav** | Header with branding + controls | (reads from context) |
| **Sidebar** | View navigation + device discovery | `activeView`, K1Client connection |
| **DeviceDiscoveryModal** | Device IP/hostname input | Connection IP, discovery results |

### Debug & Development Components

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| **DebugHUD** | Overlay telemetry display (Alt+D) | K1Client realtime events |
| **DevDebugPanel** | Development utilities | (reads from context) |
| **AudioReactiveDebug** | FFT visualization + frequency bins | K1Client audio events |
| **PatternPerformanceMonitor** | FPS/memory/CPU tracking | K1Client performance events |
| **ParameterHistory** | Parameter change log | Provider state changes |
| **HMRDelayOverlay** | Development-only HMR delay indicator | Configured via devConfig |

---

## Data Persistence

### Storage Keys

**File:** `src/types/k1-types.ts` (K1_STORAGE_KEYS)

| Key | Scope | Type | Managed By |
|-----|-------|------|-----------|
| `k1:v1:endpoint` | Device endpoint | string | `utils/persistence.ts` |
| `k1:v1:params:{patternId}` | Per-pattern parameters | JSON | `utils/persistence.ts` |
| `k1:v1:palette:{patternId}` | Per-pattern palette | number | `utils/persistence.ts` |
| `k1:v1:ui:colorTabOrder` | UI preference | JSON | Component local state |
| `k1:v1:ui:colorTabActive` | UI preference | string | Component local state |
| `k1.debugAborts` | Debug flag | boolean | K1Provider |

### Persistence Functions

**File:** `src/utils/persistence.ts`

```typescript
savePatternParameters(patternId: string, params: K1Parameters): void
loadPatternParameters(patternId: string): K1Parameters | null

savePatternPalette(patternId: string, paletteId: number): void
loadPatternPalette(patternId: string): number | null

saveEndpoint(endpoint: string): void
loadEndpoint(): string | null
```

### Telemetry & Session Recording

**Telemetry:** `src/utils/telemetry-manager.ts`

```typescript
class K1Telemetry {
  recordEvent(eventType: string, data?: any): void
  recordError(error: Error, context?: any): void
  handleError(error: K1Error, context?: any): void
  getMetrics(): K1TelemetryState
}
```

**Session Recording:** `src/utils/session-recorder.ts`

- Records user actions (pattern changes, parameter updates)
- Exports as JSON for analysis
- Used for debugging and replay

---

## Configuration & Environment

### Environment Variables

**Vite Prefix:** `VITE_` (loaded automatically via import.meta.env)

| Variable | Type | Default | Usage |
|----------|------|---------|-------|
| `VITE_K1_HMR_DELAY_MS` | number | undefined | HMR delay overlay in dev |
| `VITE_K1_DEBUG_ABORTS` | boolean | undefined | Enable abort logging |
| `VITE_DEBUG_ABORTS` | boolean | undefined | Fallback for debug aborts |

### Configuration Cascade

**In K1Provider.tsx (lines 260-291):**

```typescript
// Resolved in this order (highest priority first):
debugAborts = devConfig?.debugAborts
  ?? url?debugAborts
  ?? localStorage[k1.debugAborts]
  ?? env.VITE_K1_DEBUG_ABORTS
  ?? env.VITE_DEBUG_ABORTS
  ?? undefined
```

**Supported entry points:**

1. `<K1Provider devConfig={{ debugAborts: true }}>` (component prop)
2. URL: `http://localhost:3000?debugAborts=true` (query param)
3. localStorage: `localStorage.setItem('k1.debugAborts', 'true')`
4. `.env.local`: `VITE_K1_DEBUG_ABORTS=true`

### Development Server

**Vite Config (vite.config.ts):**

```typescript
server: {
  port: 3000,
  open: true // Auto-open browser on npm run dev
}
```

**Build Output:** `build/` directory (not `dist/`)

---

## Development Setup

### Scripts (package.json)

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start dev server on :3000 |
| `npm run build` | `vite build` | Production build to `build/` |
| `npm run preview` | `vite preview` | Preview production build |
| `npm run type-check` | `tsc --noEmit` | TypeScript validation (102 errors pending fix) |
| `npm run test` | `vitest` | Run unit tests |
| `npm run test:ui` | `vitest --ui` | Run tests with visual UI |

### Hot Module Replacement (HMR)

- Automatic on file save during `npm run dev`
- Components preserve state during HMR
- HMR delay configurable via devConfig for testing

### Dependencies Summary

**Core:**
- react@18, react-dom@18
- typescript@5
- vite@latest, @vitejs/plugin-react-swc

**UI & Styling:**
- tailwindcss@3, postcss, autoprefixer
- radix-ui/* (40+ component primitives)
- lucide-react (icons)
- class-variance-authority, clsx (styling utilities)

**Utilities:**
- sonner (toast notifications)
- date-fns (date handling)

**Testing & Dev:**
- vitest, @testing-library/react, @testing-library/dom
- @types/react, @types/react-dom

---

## Key Integration Points for Downstream Tasks

### For Backend/Firmware Integration:

1. **API Endpoints:**
   - `GET /api/patterns` → list available patterns
   - `POST /api/select` → select pattern by index
   - `GET /api/params` → fetch current parameters
   - `POST /api/params` → update parameters or palette
   - `GET /ws` → WebSocket upgrade for real-time data

2. **Required Device Responses:**
   - Pattern list with `index`, `id`, `name`, `description`, `is_audio_reactive`
   - Parameter object matching `K1Parameters` type
   - Real-time data with `{ performance, audio }` channels

### For UI Component Adoption:

1. **Replace shadcn components** with K1 components gradually:
   - Update button imports: `src/components/k1/K1Button` → shadows shadcn Button
   - Use K1 design tokens instead of hardcoded colors
   - Test K1 component states in Storybook (not yet created)

2. **Type Safety:**
   - All new code should import from `src/types/k1-types.ts`
   - Use `K1Parameters`, `K1Pattern`, `K1DeviceInfo` for type checking

### For Testing:

1. **Mock K1Client:**
   - `src/test/mocks/MockK1Client.ts` (already created)
   - Returns stub patterns and parameters for testing

2. **Test Setup:**
   - `src/test/setup.ts` configures Vitest globals (beforeEach, etc.)
   - Import testing utilities from this file

---

## Known Issues & Technical Debt

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| 102 TypeScript errors | Medium | Compilation requires error suppression | Pending fixes (styled-jsx, unused vars) |
| styled-jsx blocks in K1 components | High | No library installed; use Tailwind CSS + CSS modules instead | Refactor needed |
| Missing `recordError` in K1TelemetryManager | Medium | Error handling code references non-existent method | Add method or update callers |
| K1DiscoveryCallbacks type mismatch | Medium | Event string literals don't match callback types | Align event types |
| beforeEach not imported in test setup | Low | Vitest globals enabled at runtime but not in TypeScript | Add /// <reference types="vitest/globals" /> |

---

## Recommendations for Phase 2+

1. **Complete K1 Component Library:**
   - Create Storybook documentation
   - Add 15+ additional components (dropdown, accordion, tooltip, etc.)
   - Test all components on actual iOS device

2. **Refactor Styling:**
   - Remove styled-jsx blocks from K1 components
   - Migrate to Tailwind CSS with CSS modules for scoped styles

3. **Fix TypeScript Errors:**
   - Clean up unused imports/variables in strict mode
   - Add proper type definitions for discovery service events

4. **Expand Testing:**
   - Add comprehensive unit tests for K1Client transport
   - Integration tests for parameter updates
   - E2E tests with MockK1Client

5. **Documentation:**
   - Create component Storybook
   - Document API contract with firmware
   - Write troubleshooting guide for connection issues

---

**Last Updated:** 2025-10-27
**Next Review:** After Task 2 completion (API endpoint validation)
