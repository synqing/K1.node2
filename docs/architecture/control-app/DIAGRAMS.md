# K1 Control App - Architecture Diagrams

## System Overview

### High-Level System Context

```mermaid
flowchart LR
    User[User] --> Browser[Web Browser]
    Browser --> App[K1 Control App]
    App -->|REST API| K1Client[K1Client]
    App -->|WebSocket| K1Client
    K1Client -->|HTTP/WS| Device[K1 Device]
    Device -->|LED Control| Strip[LED Strip]
    Device -->|Audio Input| Mic[Microphone]
    
    subgraph "K1 Control App"
        App --> Views[Views]
        App --> State[State Management]
        Views --> Controls[Control Components]
        Controls --> UI[UI Primitives]
    end
    
    subgraph "K1 Device"
        Device --> Firmware[Firmware]
        Device --> Patterns[Pattern Engine]
        Device --> Audio[Audio Processing]
    end
    
    style App fill:#e1f5fe
    style Device fill:#f3e5f5
    style Browser fill:#e8f5e8
```

## Component Hierarchy

### Complete Component Tree

```mermaid
graph TD
    App[App.tsx<br/>Root Container] --> TopNav[TopNav.tsx<br/>Navigation Bar]
    App --> Sidebar[Sidebar.tsx<br/>Connection Panel]
    App --> MainView{Active View Router}
    App --> Toaster[ui/sonner.tsx<br/>Notifications]
    
    %% View Level
    MainView --> ControlPanel[ControlPanelView.tsx<br/>Main Control Interface]
    MainView --> Profiling[ProfilingView.tsx<br/>Performance Dashboard]
    MainView --> Terminal[TerminalView.tsx<br/>Debug Interface]
    
    %% Control Panel Components
    ControlPanel --> EffectSelector[EffectSelector.tsx<br/>Pattern Selection Grid]
    ControlPanel --> EffectParameters[EffectParameters.tsx<br/>Real-time Parameter Controls]
    ControlPanel --> ColorManagement[ColorManagement.tsx<br/>Palette & Color Controls]
    ControlPanel --> GlobalSettings[GlobalSettings.tsx<br/>Device-wide Settings]
    ControlPanel --> StatusBar[StatusBar.tsx<br/>Performance Metrics]
    
    %% Profiling Components
    Profiling --> ProfilingFilters[ProfilingFilters.tsx<br/>Data Filtering Controls]
    Profiling --> ProfilingCharts[ProfilingCharts.tsx<br/>Performance Visualization]
    Profiling --> LiveStatistics[LiveStatistics.tsx<br/>Real-time Metrics Table]
    
    %% UI Primitives (Key Examples)
    EffectSelector --> Card[ui/card.tsx]
    EffectSelector --> Badge[ui/badge.tsx]
    EffectParameters --> Slider[ui/slider.tsx]
    EffectParameters --> Button[ui/button.tsx]
    ColorManagement --> Select[ui/select.tsx]
    ProfilingCharts --> Chart[ui/chart.tsx]
    Sidebar --> Input[ui/input.tsx]
    
    %% Styling
    App --> GlobalCSS[index.css<br/>Global Styles]
    App --> TailwindCSS[Tailwind CSS v4]
    
    %% API Integration
    App --> K1Client[K1Client<br/>Device Communication]
    K1Client --> K1Types[k1-types.ts<br/>Type Definitions]
    K1Client --> K1Data[k1-data.ts<br/>Static Pattern Data]
    
    %% Color Coding
    style App fill:#e1f5fe
    style ControlPanel fill:#f3e5f5
    style Profiling fill:#e8f5e8
    style Terminal fill:#fff3e0
    style K1Client fill:#fce4ec
```

## Data Flow Diagrams

### Current Parameter Update Flow

```mermaid
sequenceDiagram
    participant User
    participant Slider as Parameter Slider
    participant ControlPanel as ControlPanelView
    participant App as App.tsx
    participant K1Client
    participant Device as K1 Device
    
    User->>Slider: Adjust parameter value
    Slider->>ControlPanel: onChange event
    ControlPanel->>App: State update (props drilling)
    App->>K1Client: updateParameters(params)
    
    Note over K1Client: Convert UI % to firmware 0.0-1.0
    
    K1Client->>Device: POST /api/params
    Device-->>K1Client: 200 OK {updated_params}
    K1Client-->>App: Return updated parameters
    App->>ControlPanel: Re-render with new state
    ControlPanel->>Slider: Update display value
    
    Note over User,Device: Total latency: ~100-200ms
```

### Proposed Optimized Parameter Flow (Task 5)

```mermaid
sequenceDiagram
    participant User
    participant Slider as Parameter Slider
    participant Provider as K1Provider (Future)
    participant Coalescer as Parameter Coalescer
    participant K1Client
    participant Device as K1 Device
    
    User->>Slider: Adjust parameter value
    Slider->>Provider: updateParameter(key, value)
    Provider->>Slider: Immediate optimistic update
    Provider->>Coalescer: Schedule parameter send
    
    Note over Coalescer: Debounce/coalesce ~80ms<br/>Merge multiple rapid changes
    
    Coalescer->>K1Client: updateParameters(merged_params)
    
    alt WebSocket Available
        K1Client->>Device: WebSocket parameter message
    else REST Fallback
        K1Client->>Device: POST /api/params
    end
    
    Device-->>K1Client: Confirmation
    K1Client-->>Provider: Success/error callback
    
    alt Success
        Provider->>Slider: Confirm final state
    else Error
        Provider->>Slider: Revert to last known good state
        Provider->>User: Show error notification
    end
    
    Note over User,Device: Target latency: <100ms first update
```

### Pattern Selection Flow

```mermaid
sequenceDiagram
    participant User
    participant EffectSelector
    participant ControlPanel as ControlPanelView
    participant App as App.tsx
    participant K1Client
    participant Device as K1 Device
    participant Storage as localStorage
    
    User->>EffectSelector: Click pattern card
    EffectSelector->>ControlPanel: onEffectChange(patternId)
    ControlPanel->>App: Update selectedEffect state
    
    %% Save current parameters
    App->>Storage: Save current pattern parameters
    
    %% Switch pattern
    App->>K1Client: selectPattern(patternId)
    K1Client->>Device: POST /api/select {index: patternId}
    Device-->>K1Client: 200 OK
    
    %% Load saved parameters for new pattern
    App->>Storage: Load parameters for new pattern
    
    alt Parameters exist for pattern
        App->>K1Client: updateParameters(saved_params)
        K1Client->>Device: POST /api/params
    else No saved parameters
        App->>K1Client: getParameters() (use device defaults)
        K1Client->>Device: GET /api/params
    end
    
    Device-->>K1Client: Current parameter state
    K1Client-->>App: Updated parameters
    App->>ControlPanel: Re-render with new pattern & parameters
    ControlPanel->>EffectSelector: Update selected state
```

## Connection State Machine

### Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> Connecting: connect()
    Connecting --> Connected: testConnection() success
    Connecting --> ConnectionError: network/timeout failure
    
    Connected --> Disconnected: disconnect() or manual
    Connected --> ConnectionError: communication failure
    Connected --> Reconnecting: WebSocket disconnect
    
    ConnectionError --> Reconnecting: auto-retry enabled
    ConnectionError --> Disconnected: max retries exceeded
    
    Reconnecting --> Connected: reconnection successful
    Reconnecting --> ConnectionError: reconnection failed
    
    state ConnectionError {
        [*] --> CalculatingBackoff
        CalculatingBackoff --> WaitingToRetry: apply exponential backoff + jitter
        WaitingToRetry --> AttemptingReconnect: timer expires
        AttemptingReconnect --> [*]: attempt complete
    }
    
    state Connected {
        [*] --> RESTMode
        RESTMode --> WebSocketMode: WS connection established
        WebSocketMode --> RESTMode: WS connection lost
        
        state WebSocketMode {
            [*] --> Streaming
            Streaming --> Buffering: high message rate
            Buffering --> Streaming: buffer cleared
        }
    }
```

### Reconnection Backoff Strategy

```mermaid
graph LR
    Start[Connection Lost] --> Attempt1[Attempt 1<br/>~500ms ±100ms]
    Attempt1 --> Attempt2[Attempt 2<br/>~1s ±200ms]
    Attempt2 --> Attempt3[Attempt 3<br/>~2s ±400ms]
    Attempt3 --> Attempt4[Attempt 4<br/>~4s ±800ms]
    Attempt4 --> Attempt5[Attempt 5<br/>~8s ±1.6s]
    Attempt5 --> AttemptMax[Attempts 6+<br/>~30s ±6s]
    
    Attempt1 --> Success[Connected]
    Attempt2 --> Success
    Attempt3 --> Success
    Attempt4 --> Success
    Attempt5 --> Success
    AttemptMax --> Success
    
    AttemptMax --> GiveUp[Give Up<br/>After 10 attempts]
    
    style Success fill:#4caf50
    style GiveUp fill:#f44336
```

## Build Process Workflow

### Development Build Pipeline

```mermaid
flowchart TD
    Start[npm run dev] --> ViteStart[Vite Dev Server Start]
    ViteStart --> LoadConfig[Load vite.config.ts]
    LoadConfig --> InitPlugins[Initialize Plugins]
    
    InitPlugins --> ReactSWC[React SWC Plugin]
    InitPlugins --> PathAliases[Path Alias Resolution]
    
    ReactSWC --> CompileTS[Compile TypeScript]
    ReactSWC --> TransformJSX[Transform JSX]
    
    PathAliases --> ResolveImports[Resolve @ imports to src/]
    PathAliases --> ResolveRadix[Resolve Radix UI aliases]
    
    CompileTS --> HMR[Hot Module Replacement]
    TransformJSX --> HMR
    ResolveImports --> HMR
    
    HMR --> DevServer[Development Server<br/>localhost:3000]
    
    FileChange[File Change Detected] --> CompileTS
    FileChange --> TransformJSX
    
    DevServer --> Browser[Browser Update<br/>No Page Reload]
    
    style ViteStart fill:#646cff
    style DevServer fill:#34d399
    style Browser fill:#2196f3
```

### Production Build Pipeline

```mermaid
flowchart TD
    Start[npm run build] --> ViteBuild[Vite Build Process]
    ViteBuild --> LoadConfig[Load vite.config.ts]
    LoadConfig --> InitPlugins[Initialize Build Plugins]
    
    InitPlugins --> ScanEntries[Scan Entry Points]
    ScanEntries --> AnalyzeDeps[Analyze Dependencies]
    
    AnalyzeDeps --> CompileAll[Compile All TS/JSX]
    CompileAll --> BundleModules[Bundle Modules with Rollup]
    
    BundleModules --> TreeShake[Tree Shake Unused Code]
    TreeShake --> MinifyJS[Minify JavaScript]
    MinifyJS --> OptimizeAssets[Optimize Assets]
    
    OptimizeAssets --> ProcessCSS[Process Tailwind CSS]
    ProcessCSS --> PurgeCSS[Purge Unused CSS]
    PurgeCSS --> MinifyCSS[Minify CSS]
    
    MinifyCSS --> GenerateHashes[Generate Asset Hashes]
    GenerateHashes --> CreateManifest[Create Asset Manifest]
    
    CreateManifest --> OutputFiles[Output to build/]
    
    OutputFiles --> BuildComplete[Build Complete]
    
    style ViteBuild fill:#646cff
    style OutputFiles fill:#34d399
    style BuildComplete fill:#4caf50
```

## Module Dependency Graph

### Core Module Dependencies

```mermaid
graph TD
    %% Application Layer
    App[App.tsx] --> Views[View Components]
    App --> Layout[Layout Components]
    App --> State[State Management]
    
    %% View Layer
    Views --> ControlPanel[ControlPanelView]
    Views --> Profiling[ProfilingView]
    Views --> Terminal[TerminalView]
    
    %% Control Layer
    ControlPanel --> Controls[Control Components]
    Controls --> EffectSelector
    Controls --> EffectParameters
    Controls --> ColorManagement
    Controls --> GlobalSettings
    Controls --> StatusBar
    
    %% API Layer
    App --> K1Client[K1Client API]
    Controls --> K1Client
    K1Client --> K1Types[Type Definitions]
    K1Client --> K1Data[Static Data]
    
    %% UI Layer
    Controls --> UIComponents[shadcn/ui Components]
    Layout --> UIComponents
    Views --> UIComponents
    
    UIComponents --> RadixUI[Radix UI Primitives]
    UIComponents --> TailwindCSS[Tailwind CSS]
    
    %% External Dependencies
    RadixUI --> React[React 18.3.1]
    K1Client --> WebAPI[Web APIs]
    App --> React
    
    %% Styling
    App --> GlobalStyles[Global CSS]
    GlobalStyles --> TailwindCSS
    
    %% Build Dependencies
    App --> ViteConfig[Vite Configuration]
    ViteConfig --> ReactSWC[React SWC Plugin]
    ViteConfig --> TypeScript[TypeScript 5.6.3]
    
    %% Color Coding by Layer
    style App fill:#e1f5fe
    style Views fill:#f3e5f5
    style Controls fill:#e8f5e8
    style K1Client fill:#fce4ec
    style UIComponents fill:#fff3e0
    style React fill:#61dafb
```

### Dependency Metrics

| Layer | Components | External Deps | Internal Deps |
|-------|------------|---------------|---------------|
| **Application** | 1 | React, Sonner | Views, Layout, API |
| **Views** | 3 | React | Controls, UI |
| **Controls** | 5 | React, Lucide | UI, API, Types |
| **UI Primitives** | 47 | Radix UI, CVA | Tailwind |
| **API** | 2 | Web APIs | Types |
| **Types** | 1 | None | None |

## Performance Flow Diagrams

### Real-time LED Visualization (Future - Task 7)

```mermaid
sequenceDiagram
    participant Device as K1 Device
    participant WS as WebSocket
    participant Queue as Frame Queue
    participant Renderer as Canvas Renderer
    participant Display as LED Display
    
    loop Every ~16ms (60fps)
        Device->>WS: LED Frame Data (540 bytes RGB)
        WS->>Queue: Push frame to queue
        
        alt Queue full (backpressure)
            Queue->>Queue: Drop oldest frame
        end
        
        Note over Queue: Keep only latest 2-3 frames
    end
    
    loop Render Loop (requestAnimationFrame)
        Renderer->>Queue: Pop latest frame
        
        alt Frame available
            Renderer->>Renderer: Map 180 LEDs to positions
            Renderer->>Renderer: Draw circles on canvas
            Renderer->>Display: Update canvas display
        else No new frame
            Renderer->>Display: Keep previous frame
        end
    end
    
    Note over Device,Display: Target: 60fps display, drop frames if needed
```

### Parameter Coalescing Strategy (Future - Task 5)

```mermaid
graph TD
    UserInput[User Input] --> ParamChange[Parameter Change]
    ParamChange --> Coalescer{Coalescer}
    
    Coalescer --> FirstChange[First Change?]
    FirstChange -->|Yes| ImmediateSend[Send Immediately]
    FirstChange -->|No| MergeParams[Merge with Pending]
    
    MergeParams --> ResetTimer[Reset 80ms Timer]
    ResetTimer --> WaitTimer[Wait for Timer]
    
    WaitTimer --> TimerExpired[Timer Expired]
    TimerExpired --> SendCoalesced[Send Coalesced Parameters]
    
    ImmediateSend --> Device[K1 Device]
    SendCoalesced --> Device
    
    Device --> Success{Success?}
    Success -->|Yes| UpdateUI[Update UI State]
    Success -->|No| RetryLogic[Retry Logic]
    
    RetryLogic --> Device
    
    UserInput --> ParamChange
    
    style ImmediateSend fill:#4caf50
    style SendCoalesced fill:#2196f3
    style RetryLogic fill:#ff9800
```

## Future Architecture Diagrams

### Proposed K1Provider Architecture (Task 2)

```mermaid
graph TD
    App[App.tsx] --> K1Provider[K1Provider Context]
    K1Provider --> K1State[Centralized State]
    K1Provider --> K1Client[K1Client Instance]
    
    K1State --> ConnectionState[Connection State]
    K1State --> DeviceInfo[Device Info]
    K1State --> PatternState[Pattern State]
    K1State --> ParameterState[Parameter State]
    K1State --> ErrorState[Error State]
    
    Components[All Components] --> useK1Hook[useK1() Hook]
    useK1Hook --> K1Provider
    
    K1Provider --> Persistence[localStorage Persistence]
    K1Provider --> Reconnection[Reconnection Logic]
    K1Provider --> ErrorHandling[Error Boundaries]
    
    style K1Provider fill:#e1f5fe
    style K1State fill:#f3e5f5
    style useK1Hook fill:#e8f5e8
```

## Diagram Maintenance

### Keeping Diagrams Current

1. **Component Changes**: Update component hierarchy when adding/removing components
2. **API Changes**: Update data flow diagrams when API contracts change
3. **State Changes**: Update state diagrams when state management evolves
4. **Build Changes**: Update build diagrams when tooling changes

### Diagram Validation

- **Quarterly Review**: Verify all diagrams match current implementation
- **PR Reviews**: Update diagrams when architecture changes
- **Documentation Sync**: Ensure diagrams align with written documentation

### Mermaid Syntax Reference

```mermaid
%% This is a comment
graph TD
    A[Rectangle] --> B{Diamond}
    B -->|Yes| C[Rectangle]
    B -->|No| D[Rectangle]
    
    %% Styling
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
```

## Cross-References

- [Component Hierarchy](./COMPONENT_HIERARCHY.md) - Detailed component relationships
- [State and Data Flow](./STATE_AND_DATA_FLOW.md) - State management patterns
- [K1 Integration](./K1_INTEGRATION.md) - API communication details
- [Build Pipeline](./BUILD_PIPELINE.md) - Build process configuration