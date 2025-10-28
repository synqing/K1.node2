---
title: K1.reinvented Control App - Emotiscope Dashboard Adaptation Plan
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented Control App - Emotiscope Dashboard Adaptation Plan

## Executive Summary

**Proposal:** Adapt the existing Emotiscope 2.0 Control Dashboard prototype for K1.reinvented, leveraging the proven UI/UX design while integrating K1's specific features and architecture.

**Key Advantage:** The Emotiscope prototype provides a production-ready foundation with:
- Professional dark theme design system
- Comprehensive component library (shadcn/ui + Radix)
- Three-view architecture (Control Panel, Profiling, Terminal)
- Real-time parameter controls and visualization

## Emotiscope Prototype Analysis

### Technology Stack ✅ EXCELLENT
```json
{
  "framework": "React 18.3.1 + TypeScript",
  "build_tool": "Vite 6.3.5",
  "ui_library": "Radix UI + shadcn/ui",
  "styling": "Tailwind CSS + CSS Variables",
  "charts": "Recharts 2.15.2",
  "icons": "Lucide React",
  "notifications": "Sonner"
}
```

**Assessment:** This is an ideal modern stack that aligns perfectly with our K1 requirements.

### Design System Analysis ✅ PROFESSIONAL

#### Color Tokens (Perfect for K1)
```css
--k1-bg: #0F1115           /* Background */
--k1-bg-elev: #151923      /* Elevated Background */
--k1-panel: #1A1F2B        /* Panel */
--k1-border: rgba(42,50,66,0.2) /* Border */
--k1-text: #E6E9EF         /* Primary Text */
--k1-accent: #6EE7F3       /* Cyan Accent */
--k1-accent-2: #A78BFA     /* Purple Accent */
```

**Assessment:** The dark theme with cyan/purple accents matches K1's premium aesthetic perfectly.

#### Component Architecture ✅ MODULAR
- **Three-view system:** Control Panel, Profiling, Terminal
- **Modular components:** Each feature is a separate, reusable component
- **Consistent patterns:** All controls follow the same design language
- **Responsive design:** Adapts to different screen sizes

### Current Emotiscope Features vs K1 Requirements

| Feature | Emotiscope | K1 Needs | Adaptation Required |
|---------|------------|----------|-------------------|
| **Effect Selection** | 9 effects (Analog, Spectrum, etc.) | 11 patterns (Departure, Lava, etc.) | ✅ Simple mapping |
| **Color Management** | 12 preset palettes + HSV | 33 palettes + parameters | ⚠️ Expand palette grid |
| **Global Settings** | Brightness, Blur, Softness, etc. | Brightness, Speed, Saturation, etc. | ⚠️ Parameter mapping |
| **Real-time Charts** | FPS, CPU, Memory | Same + Audio visualization | ✅ Minimal changes |
| **Terminal** | Device commands | Same concept | ✅ Command adaptation |
| **Connection** | IP + Serial | IP only (WiFi) | ✅ Simplify |

## Adaptation Strategy

### Phase 1: Direct Port & Basic Integration (1 week)

#### 1.1 Project Setup
- Copy Emotiscope prototype to new K1 project directory
- Update package.json with K1 branding
- Modify color tokens to match K1 aesthetic (if needed)
- Set up build pipeline for K1 deployment

#### 1.2 Pattern Integration
**Current Emotiscope Effects → K1 Patterns Mapping:**

```typescript
// Emotiscope effects (9)
const emotiscopeEffects = [
  'analog', 'spectrum', 'octave', 'metronome', 
  'spectronome', 'hype', 'bloom', 'pulse', 'sparkle'
];

// K1 patterns (11) 
const k1Patterns = [
  'departure', 'lava', 'twilight',           // Static
  'spectrum', 'octave', 'bloom',             // Audio-reactive (overlap)
  'pulse', 'tempiscope', 'beat_tunnel',      // Beat-reactive
  'perlin', 'void_trail'                     // Procedural
];
```

**Implementation:**
- Replace `EffectSelector` with `PatternSelector`
- Update pattern metadata (names, descriptions, icons)
- Map K1 pattern categories to visual groupings

#### 1.3 API Integration
**Replace Emotiscope API calls with K1 REST API:**

```typescript
// Current Emotiscope (hypothetical)
const emotiscopeAPI = {
  getEffects: () => fetch('/api/effects'),
  setEffect: (id) => fetch('/api/effect', { method: 'POST', body: { id } }),
  getParams: () => fetch('/api/parameters')
};

// K1 API (existing)
const k1API = {
  getPatterns: () => fetch('/api/patterns'),
  selectPattern: (index) => fetch('/api/select', { method: 'POST', body: { index } }),
  getParams: () => fetch('/api/params'),
  updateParams: (params) => fetch('/api/params', { method: 'POST', body: params })
};
```

### Phase 2: K1-Specific Features (1 week)

#### 2.1 Palette System Enhancement
**Expand from 12 to 33 palettes:**

```typescript
// Current: 12 preset palettes in 3x4 grid
const emotiscopePalettes = 12;

// K1: 33 palettes in 6x6 grid (with scrolling)
const k1Palettes = [
  { id: 0, name: 'Sunset Real', gradient: '...' },
  { id: 1, name: 'Rivendell', gradient: '...' },
  // ... all 33 K1 palettes
];
```

**Implementation:**
- Expand `ColorManagement` component palette grid
- Add scrolling/pagination for 33 palettes
- Integrate with K1's `color_from_palette()` system
- Add palette preview with actual K1 colors

#### 2.2 Parameter System Mapping
**Map Emotiscope parameters to K1 parameters:**

```typescript
// Emotiscope parameters
interface EmotiscopeParams {
  brightness: number;    // 0-100%
  blur: number;         // 0,25,50,75,100%
  softness: number;     // 0-100%
  gamma: boolean;       // on/off
  warmth: number;       // 0-100%
}

// K1 parameters (existing)
interface K1Params {
  brightness: number;   // 0.0-1.0 → Map to 0-100%
  speed: number;        // 0.0-1.0 → Map to 0-100%
  saturation: number;   // 0.0-1.0 → Map to 0-100%
  warmth: number;       // 0.0-1.0 → Map to 0-100%
  softness: number;     // 0.0-1.0 → Map to 0-100%
  background: number;   // 0.0-1.0 → Map to 0-100%
  palette_id: number;   // 0-32 → Direct mapping
}
```

**Implementation:**
- Replace `blur` with `speed` (more relevant for K1)
- Add `saturation` and `background` controls
- Update parameter validation and ranges
- Implement real-time parameter sync

#### 2.3 Audio Visualization Enhancement
**Add K1-specific audio features:**

```typescript
// K1 audio data (from existing API)
interface K1AudioData {
  spectrum: number[];      // 64 frequency bins
  chromagram: number[];    // 12 musical notes
  vu_level: number;        // Overall volume
  tempo_confidence: number; // Beat detection
}
```

**Implementation:**
- Add spectrum analyzer visualization
- Add chromagram (musical note) display
- Add beat detection indicator
- Integrate with K1's audio snapshot system

### Phase 3: Advanced Features & Polish (1 week)

#### 3.1 LED Preview System
**Add virtual LED strip visualization:**

```typescript
interface LEDPreview {
  ledCount: 180;           // K1's LED count
  centerOrigin: boolean;   // K1's center-origin architecture
  mirrorMode: boolean;     // First half mirrors to second half
  realTimeUpdate: boolean; // Show actual pattern output
}
```

**Implementation:**
- Create `LEDPreview` component with 180 virtual LEDs
- Implement center-origin layout (first 90 mirror to last 90)
- Add real-time color updates from pattern rendering
- Include zoom and pan controls for detailed view

#### 3.2 Pattern-Specific Controls
**Add advanced controls for specific patterns:**

```typescript
// Pattern-specific parameters
interface PatternSpecificControls {
  pulse: {
    waveCount: number;     // custom_param_1
    decayRate: number;     // custom_param_2
  };
  beat_tunnel: {
    tunnelSpeed: number;   // custom_param_1
    persistence: number;   // custom_param_2
  };
  perlin: {
    noiseScale: number;    // custom_param_1
    octaves: number;       // custom_param_2
  };
}
```

**Implementation:**
- Extend `EffectParameters` component
- Add pattern-specific UI elements
- Expose K1's `custom_param_1/2/3` fields
- Create pattern-specific help tooltips

#### 3.3 Device Management
**Enhance connection and device features:**

```typescript
interface K1DeviceManager {
  discovery: {
    autoScan: boolean;
    foundDevices: K1Device[];
    manualIP: string;
  };
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    latency: number;
    lastUpdate: Date;
  };
  device: {
    firmwareVersion: string;
    uptime: number;
    memoryUsage: number;
    temperature?: number;
  };
}
```

**Implementation:**
- Add device auto-discovery (mDNS scanning)
- Enhance connection status indicators
- Add device information display
- Implement connection retry logic

## Technical Implementation Details

### File Structure Adaptation
```
k1-control-app/
├── src/
│   ├── components/
│   │   ├── control/
│   │   │   ├── PatternSelector.tsx      # Adapted from EffectSelector
│   │   │   ├── PatternParameters.tsx    # Adapted from EffectParameters
│   │   │   ├── PaletteManagement.tsx    # Enhanced ColorManagement
│   │   │   ├── GlobalSettings.tsx       # Adapted parameter mapping
│   │   │   ├── LEDPreview.tsx          # NEW: Virtual LED strip
│   │   │   └── StatusBar.tsx           # Enhanced with K1 metrics
│   │   ├── profiling/
│   │   │   ├── AudioVisualizer.tsx     # NEW: K1 audio visualization
│   │   │   └── ...                     # Existing profiling components
│   │   ├── views/
│   │   │   ├── ControlPanelView.tsx    # Adapted for K1 patterns
│   │   │   └── ...                     # Existing views
│   │   └── ui/                         # Keep existing shadcn/ui components
│   ├── api/
│   │   ├── k1-client.ts               # K1 REST API client
│   │   └── websocket.ts               # Real-time updates
│   ├── types/
│   │   ├── k1-types.ts                # K1-specific TypeScript types
│   │   └── ...
│   └── ...
├── package.json                        # Updated for K1 branding
└── ...
```

### API Client Implementation
```typescript
// k1-client.ts
export class K1Client {
  constructor(private baseURL: string) {}

  // Pattern control
  async getPatterns(): Promise<K1Pattern[]> {
    const response = await fetch(`${this.baseURL}/api/patterns`);
    return response.json();
  }

  async selectPattern(index: number): Promise<void> {
    await fetch(`${this.baseURL}/api/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
  }

  // Parameter control
  async getParams(): Promise<K1Params> {
    const response = await fetch(`${this.baseURL}/api/params`);
    return response.json();
  }

  async updateParams(params: Partial<K1Params>): Promise<void> {
    await fetch(`${this.baseURL}/api/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  }

  // Real-time updates (WebSocket)
  connectWebSocket(onUpdate: (data: K1RealtimeData) => void): WebSocket {
    const ws = new WebSocket(`ws://${this.baseURL.replace('http://', '')}/ws`);
    ws.onmessage = (event) => onUpdate(JSON.parse(event.data));
    return ws;
  }
}
```

### State Management
```typescript
// Use Zustand for simple state management
interface K1AppState {
  // Connection
  isConnected: boolean;
  deviceIP: string;
  connectionStatus: ConnectionStatus;

  // Patterns
  patterns: K1Pattern[];
  selectedPattern: number;

  // Parameters
  parameters: K1Params;
  
  // Real-time data
  audioData: K1AudioData;
  performanceData: K1PerformanceData;

  // Actions
  connect: (ip: string) => Promise<void>;
  selectPattern: (index: number) => Promise<void>;
  updateParameter: (key: keyof K1Params, value: number) => Promise<void>;
}
```

## Migration Benefits

### 1. **Proven UI/UX Design** ✅
- Professional dark theme that matches K1's aesthetic
- Comprehensive component library with accessibility
- Responsive design that works on desktop and tablet
- Consistent interaction patterns and animations

### 2. **Rapid Development** ✅
- 70% of UI components already implemented
- Design system and styling complete
- Component architecture proven and tested
- Focus on K1 integration rather than UI development

### 3. **Advanced Features Ready** ✅
- Real-time charting and visualization
- Terminal interface for debugging
- Profiling dashboard for performance monitoring
- Toast notifications and error handling

### 4. **Modern Tech Stack** ✅
- React 18 + TypeScript for type safety
- Vite for fast development and building
- Radix UI for accessible components
- Tailwind CSS for maintainable styling

## Implementation Timeline

### Week 1: Core Adaptation
- **Days 1-2:** Project setup and basic pattern integration
- **Days 3-4:** API client implementation and connection
- **Days 5-7:** Parameter mapping and basic functionality

### Week 2: K1-Specific Features  
- **Days 1-3:** Palette system expansion (33 palettes)
- **Days 4-5:** Audio visualization integration
- **Days 6-7:** LED preview system implementation

### Week 3: Advanced Features & Polish
- **Days 1-2:** Pattern-specific controls
- **Days 3-4:** Device management enhancements
- **Days 5-7:** Testing, bug fixes, and polish

## Risk Assessment

### Low Risk ✅
- **UI Framework:** Proven React + TypeScript stack
- **Design System:** Complete and professional
- **Component Library:** Comprehensive and accessible

### Medium Risk ⚠️
- **API Integration:** Need to adapt Emotiscope API calls to K1
- **Real-time Updates:** May need WebSocket implementation in K1 firmware
- **Performance:** Ensure smooth operation with 180 LEDs at 120 FPS

### Mitigation Strategies
- **Incremental Development:** Build and test each feature separately
- **Fallback Options:** Graceful degradation if advanced features fail
- **Performance Monitoring:** Built-in profiling to catch issues early

## Success Metrics

### User Experience
- **Connection Time:** < 2 seconds to discover and connect
- **Parameter Response:** < 100ms for slider changes
- **Visual Feedback:** Immediate LED preview updates
- **Reliability:** 99.9% uptime during connected sessions

### Technical Performance
- **Memory Usage:** < 150MB RAM (lighter than Electron)
- **CPU Usage:** < 3% when idle, < 10% when active
- **Bundle Size:** < 50MB (smaller due to web-based)
- **Startup Time:** < 2 seconds

## Conclusion

Adapting the Emotiscope 2.0 Control Dashboard for K1.reinvented provides the optimal path forward:

**Advantages:**
- ✅ Professional, proven UI/UX design
- ✅ 70% of development work already complete
- ✅ Modern, maintainable tech stack
- ✅ Advanced features ready for integration

**Required Work:**
- Pattern and parameter mapping (straightforward)
- K1 API integration (well-defined)
- Palette system expansion (mechanical)
- LED preview system (new feature)

**Recommendation:** Proceed with this adaptation approach. The Emotiscope prototype provides an excellent foundation that can be efficiently adapted to K1's specific needs while maintaining the project's commitment to uncompromising quality.

---

**Next Steps:**
1. Set up K1 control app project based on Emotiscope prototype
2. Begin Phase 1 adaptation with pattern integration
3. Implement K1 API client and basic connectivity
4. Iterate based on testing and user feedback

**Dependencies:**
- K1 firmware WebSocket server (optional, for real-time updates)
- Enhanced REST API endpoints (optional, for advanced features)
- Testing hardware setup for validation