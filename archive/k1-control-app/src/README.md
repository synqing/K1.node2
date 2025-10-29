# Emotiscope 2.0 Control Dashboard

A high-fidelity prototype for a dual-platform (web + Tauri-based macOS) interface that controls an audio-reactive LED system.

## Features

### Three Main Views

#### 1. Control Panel
- **Effect Selection**: Choose from 9 audio-reactive effects (Analog, Spectrum, Octave, Metronome, Spectronome, Hype, Bloom, PULSE, SPARKLE)
- **Dynamic Parameters**: Each effect has customizable parameters with real-time sync status
- **Color Management**: 12 preset palettes plus manual HSV controls with live preview
- **Global Settings**: Brightness, Blur, Softness, Gamma correction, and Warmth controls
- **Live Status Bar**: Real-time FPS, CPU, and Memory metrics with color-coded thresholds

#### 2. Profiling Dashboard
- **Performance Charts**:
  - FPS over time with target/minimum reference lines
  - Frame time breakdown by component (Effect, GPU, Driver, Other)
  - CPU usage comparison across all effects
  - Memory usage with safety thresholds
- **Live Statistics Table**: 12 real-time metrics with trend indicators
- **Filtering**: By effect, time range (Last 100/500/1000 frames), phase comparison
- **Export**: CSV export of profiling data

#### 3. Terminal
- **Command Interface**: Execute device commands with color-coded output
- **Command History**: Last 10 commands with click-to-fill
- **Available Commands**: p, k, v, j, r, c, s, help
- **Auto-scroll**: Intelligent scrolling with pause indicator
- **Output Formatting**: Monospace font with syntax highlighting

## Design System

### PRISM.node Design Tokens
Built on the PRISM.node design system with carefully crafted tokens:

**Colors**:
- Dark theme (Background #0F1115, Panels #1A1F2B)
- Cyan accent (#6EE7F3) and Purple accent (#A78BFA)
- Status colors: Success #34D399, Warning #F59E0B, Error #EF4444

**Typography**:
- Inter for body text (14px base)
- JetBrains Mono for code/numeric display (12px)
- Consistent weight and line-height scale

**Spacing & Layout**:
- 8/12/16/24/32px spacing scale
- 6/10/14/20px border radius options
- Elevation with carefully tuned shadows

**Motion**:
- 120/180/300ms timing for different interaction types
- Ease-out curves for natural feeling
- Micro-animations on state changes

## Component Library

### Interactive Components
- **Buttons**: Primary (Cyan), Secondary, Outline, Ghost, Destructive variants
- **Form Controls**: Inputs, Sliders, Switches, Selects with full state coverage
- **Status Indicators**: Badges, Pills, Progress bars with color-coded thresholds
- **Charts**: Line, Area, Bar charts with Recharts
- **Data Tables**: Sortable, scrollable with hover states
- **Alerts & Toasts**: Success/Warning/Error notifications

### States
All components include:
- Default, Hover, Active, Focus states
- Disabled and Loading states
- Error validation states
- Keyboard navigation support

## Usage

### Connecting to Device
1. Enter your device IP address in the sidebar (e.g., 192.168.1.100)
2. Select the appropriate serial port
3. Click "Connect"
4. Connection status shows in both sidebar and top navigation

### Selecting Effects
1. Navigate to the Control Panel view
2. Click on any of the 9 effect cards
3. Adjust parameters in the center column
4. Changes sync automatically with "Syncing..." indicator

### Managing Colors
1. Choose from 12 preset palettes
2. Or manually adjust Hue, Saturation, and Value sliders
3. Preview colors in real-time
4. Hex values displayed for reference

### Profiling Performance
1. Switch to the Profiling view
2. Filter by effect or view all effects
3. Adjust time range (100/500/1000 frames)
4. Toggle phase comparison overlay
5. Export data as CSV when needed

### Using the Terminal
1. Switch to Terminal view
2. Type commands in the input field
3. Press Enter or click Execute
4. View command history and click to reuse
5. Type "help" for available commands

## Keyboard Shortcuts

### Navigation
- **Tab**: Move through interactive elements
- **Escape**: Close modals and dropdowns
- **Enter**: Confirm actions

### Optional Hotkeys
- **1-9**: Quick switch between effects
- **Cmd+/** (Mac) or **Ctrl+/** (Win): Show help
- **~**: Focus terminal input

## Responsive Behavior

### Desktop (1920×1080 baseline)
- Full three-column layout in Control Panel
- Side-by-side charts and statistics in Profiling
- All features accessible

### Tablet (768-1024px)
- Collapsible sidebar
- Stacked layouts
- Maintained functionality

### Mobile (Future)
- Terminal view desktop-only
- Single-column layouts
- Touch-optimized controls

## Technical Implementation

### Built With
- **React**: Component framework
- **Tailwind CSS**: Styling with custom design tokens
- **Recharts**: Data visualization
- **Lucide React**: Icon library
- **Shadcn/ui**: Base component library
- **Sonner**: Toast notifications

### Design Tokens
All design tokens are defined in `/styles/globals.css` using CSS custom properties for easy theming and consistency.

### Mock Data
The prototype uses simulated data for demonstration:
- Performance metrics update at realistic intervals
- Commands return predefined responses
- Charts show generated data patterns

## File Structure

```
/
├── App.tsx                          # Main application entry
├── components/
│   ├── TopNav.tsx                   # Top navigation bar
│   ├── Sidebar.tsx                  # Device connection sidebar
│   ├── ComponentLibrary.tsx         # Design system showcase
│   ├── views/
│   │   ├── ControlPanelView.tsx    # Effect control interface
│   │   ├── ProfilingView.tsx       # Performance dashboard
│   │   └── TerminalView.tsx        # Command terminal
│   ├── control/
│   │   ├── EffectSelector.tsx      # Effect chooser
│   │   ├── EffectParameters.tsx    # Dynamic parameters
│   │   ├── ColorManagement.tsx     # Color picker
│   │   ├── GlobalSettings.tsx      # Global controls
│   │   └── StatusBar.tsx           # Performance footer
│   ├── profiling/
│   │   ├── ProfilingCharts.tsx     # Performance charts
│   │   ├── ProfilingFilters.tsx    # Filter controls
│   │   └── LiveStatistics.tsx      # Metrics table
│   └── ui/                          # Shadcn components
├── styles/
│   └── globals.css                  # Design tokens & styles
├── DESIGN_SPECS.md                  # Comprehensive design documentation
└── README.md                        # This file
```

## Design Documentation

See `/DESIGN_SPECS.md` for comprehensive design specifications including:
- Complete design token reference
- Layout specifications
- Component state definitions
- Interaction patterns
- Animation specifications
- Accessibility guidelines
- Export formats
- Cross-platform considerations

## Component Library Reference

Access the component library showcase by importing and rendering the `ComponentLibrary` component:

```tsx
import { ComponentLibrary } from './components/ComponentLibrary';

// Shows all components with variants and states
<ComponentLibrary />
```

## Browser Support

- **Chrome/Edge**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions

## Performance Considerations

### Update Rates
- **Charts**: ~10Hz (100ms intervals)
- **Statistics**: ~2Hz (500ms intervals)
- **Status Bar**: ~5Hz (200ms intervals)
- **Parameter Changes**: Debounced 300ms

### Optimization
- Virtualized scrolling for large datasets
- Debounced input handlers
- Throttled resize handlers
- Conditional rendering based on connection state

## Future Enhancements

### Planned Features
- Real device WebSocket integration
- Persistent user preferences
- Custom color palette creation
- Advanced profiling filters
- Keyboard macro recording
- Multi-device management

### Platform-Specific (Tauri)
- Native file picker for export
- System tray integration
- Native notifications
- Auto-update mechanism

## Development Notes

### Mock Data Patterns
- FPS: 55-65 range with sine wave variation
- CPU: 150-350μs with random variance
- Memory: 50-70% with gradual drift
- All realistic for audio processing workload

### State Synchronization
- Parameters show sync status during update
- Connection state propagates throughout app
- Disconnection disables interactive elements
- Automatic reconnection attempts (would be real)

## Credits

**Design System**: PRISM.node  
**Product**: Emotiscope 2.0  
**Created**: October 23, 2025  
**Version**: 2.0 (Prototype)

---

For questions, issues, or feature requests, please refer to the project documentation.
