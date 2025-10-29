---
title: Emotiscope 2.0 Control Dashboard - Design Specifications
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# Emotiscope 2.0 Control Dashboard - Design Specifications

## Overview
This document provides comprehensive design specifications for the Emotiscope 2.0 Control Dashboard, a dual-platform (web + Tauri-based macOS) interface for controlling an audio-reactive LED system.

## Design System

### Color Tokens

#### Background & Surfaces
- **Background**: `#0F1115` (var(--k1-bg))
- **Elevated Background**: `#151923` (var(--k1-bg-elev))
- **Panel**: `#1A1F2B` (var(--k1-panel))
- **Border**: `rgba(42, 50, 66, 0.2)` (var(--k1-border))

#### Text
- **Primary Text**: `#E6E9EF` (var(--k1-text))
- **Dimmed Text**: `#B5BDCA` (var(--k1-text-dim))

#### Accents
- **Primary Accent (Cyan)**: `#6EE7F3` (var(--k1-accent))
- **Secondary Accent (Purple)**: `#A78BFA` (var(--k1-accent-2))

#### Status Colors
- **Success**: `#34D399` (var(--k1-success))
- **Warning**: `#F59E0B` (var(--k1-warning))
- **Error**: `#EF4444` (var(--k1-error))
- **Info**: `#6EE7F3` (var(--k1-info))

#### Port/Wire Colors
- **Scalar**: `#F59E0B` (var(--port-scalar))
- **Field**: `#22D3EE` (var(--port-field))
- **Color**: `#F472B6` (var(--port-color))
- **Output**: `#34D399` (var(--port-output))

### Typography

#### Font Families
- **Body**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Code/Monospace**: 'JetBrains Mono', 'Monaco', 'Menlo', monospace

#### Font Sizes
- **Extra Small**: 10px (var(--k1-text-xs))
- **Small**: 12px (var(--k1-text-sm))
- **Base**: 14px (var(--k1-text-base)) - Default body text
- **Large**: 16px (var(--k1-text-lg))
- **Extra Large**: 20px (var(--k1-text-xl))
- **2XL**: 28px (var(--k1-text-2xl))

#### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

#### Line Heights
- **Tight**: 1.2
- **Normal**: 1.5
- **Relaxed**: 1.75

### Spacing Scale
- **Space 1**: 4px
- **Space 2**: 8px
- **Space 3**: 12px
- **Space 4**: 16px
- **Space 6**: 24px
- **Space 8**: 32px
- **Space 12**: 48px

### Border Radius
- **Small**: 6px (var(--k1-r-sm))
- **Medium**: 10px (var(--k1-r-md))
- **Large**: 14px (var(--k1-r-lg))
- **Extra Large**: 20px (var(--k1-r-xl))

### Shadows
- **Small**: `0 6px 20px rgba(0, 0, 0, 0.35)` (var(--shadow-sm))
- **Medium**: `0 8px 24px rgba(0, 0, 0, 0.45)` (var(--shadow-md))
- **Large**: `0 12px 32px rgba(0, 0, 0, 0.55)` (var(--shadow-lg))

### Motion & Animation

#### Durations
- **Fast**: 120ms (var(--motion-fast))
- **Medium**: 180ms (var(--motion-med))
- **Slow**: 300ms (var(--motion-slow))

#### Easing Functions
- **Ease Out**: `cubic-bezier(0.33, 1, 0.68, 1)` (var(--ease-out))
- **Ease**: `cubic-bezier(0.4, 0, 0.2, 1)` (var(--ease))
- **Ease In Out**: `cubic-bezier(0.65, 0, 0.35, 1)` (var(--ease-in-out))

#### Animation Guidelines
- State transitions: 150-250ms ease-out
- Hover effects: 120ms ease-out
- Loading spinners: smooth continuous rotation
- Micro-interactions: 180ms ease

## Layout Structure

### Top Navigation (56px height)
- Logo/Title with connection status
- View tabs (Control Panel, Profiling, Terminal)
- Settings and help icons with tooltips

### Left Sidebar (280px width)
- Device Connection card
  - IP input with validation
  - Serial port selector
  - Connect/disconnect button
  - Connection statistics
- Quick Actions menu
  - Refresh Data
  - Export Profiling
  - Device Settings

### Main Content Area
- Responsive to sidebar width
- Three primary views with distinct layouts
- Consistent padding and spacing

## Views

### 1. Control Panel View
**Layout**: Three-column grid (equal width on desktop)

#### Column 1: Effect Selector
- 9 effect cards in vertical stack
- Each card shows:
  - Icon (colored based on effect)
  - Effect name
  - Brief description
  - Active state highlight (cyan glow)
- Hover states with border color change
- Disabled state when disconnected

#### Column 2: Effect Parameters
- Dynamic parameter list based on selected effect
- Parameter types:
  - Sliders with value display and unit
  - Toggles with labels
  - Dropdowns for discrete options
- Sync status indicator (Syncing.../Synced)
- Reset to default button

#### Column 3: Color & Global Settings
**Color Management**:
- 12 preset palette grid (3x4)
- Manual HSV sliders
- Live color preview swatch
- Hex value readout

**Global Settings**:
- Brightness slider with threshold warnings
- Blur slider with discrete stops (0, 25, 50, 75, 100)
- Softness slider with mini visualization
- Gamma correction toggle with curve preview
- Warmth slider with color temperature bar

#### Status Bar Footer
- FPS indicator (color-coded: green 55+, yellow 40-54, red <40)
- CPU usage (bar + microseconds)
- Memory usage (bar + free KB)
- Warning states for critical thresholds

### 2. Profiling Dashboard View

#### Layout
- Filter bar at top
- Two-column layout: Charts (60%) | Statistics (40%)

#### Filter Controls
- Effect dropdown (All Effects or specific)
- Time range segmented control (Last 100/500/1000)
- Phase comparison toggle
- Export CSV button
- Update rate indicator (~10Hz)

#### Charts Column (4 stacked charts)

**1. FPS Over Time** (Line Chart)
- Y-axis: 0-70 FPS
- Reference lines: Target (60, green), Minimum (40, yellow)
- Cyan line chart
- Grid background

**2. Frame Time Breakdown** (Stacked Area Chart)
- Components: Effect, GPU, Driver, Other
- Color-coded layers
- Legend
- Hover tooltips showing microseconds

**3. CPU Usage by Effect** (Horizontal Bar Chart)
- Sorted by CPU load (highest to lowest)
- Cyan bars with rounded corners
- Shows all 9 effects

**4. Memory Usage** (Area Chart)
- Y-axis: 0-100%
- Reference bands: Safe (<70, green), Warning (70-85, yellow), Critical (>85, red)
- Gradient fill under line

#### Statistics Table
- 12 live metrics with:
  - Metric name
  - Current value (color-coded by status)
  - Trend indicator (↑↓→)
  - Unit
- Alternating row colors for readability
- Hover highlight
- Scroll for overflow
- Update rate: ~2Hz
- Footer: "Click metric to drill down"

#### Chart States
- **Loading**: Spinner with "Loading data..."
- **Empty**: Icon + "No data yet, connect device"
- **Error**: Alert icon + error message
- **Disconnected**: All charts show connection prompt

### 3. Terminal View

#### Layout
- Full-width terminal output area
- Command input row at bottom
- Collapsible command history drawer

#### Terminal Output
- Dark background (#0F1115)
- JetBrains Mono 12px, line-height 1.6
- Color-coded output:
  - Timestamps: dimmed
  - Commands: cyan
  - Errors: red
  - Success: green
  - Info: default text color
- Auto-scroll with pause indicator
- Toolbar: Copy, Clear, Search buttons

#### Command Input
- Monospace text field
- Placeholder: "Enter command... (p, k, v, j, help)"
- Execute button
- Enter key to submit
- Validation for unknown commands

#### Command History
- Shows last 10 commands
- Timestamp per entry
- Click to fill input
- Hover highlight
- Delete individual entries

#### Available Commands
- `p` - Print current effect parameters
- `k` - Kill current effect
- `v` - Print firmware version
- `j` - Print device info (JSON)
- `r` - Reboot device
- `c` - Clear terminal
- `s` - System status
- `help` - Show command list

## Component States

### Buttons
- **Default**: Visible, interactive
- **Hover**: Slight brightness increase, 120ms transition
- **Active**: Pressed appearance
- **Focus**: Outline ring in accent color
- **Disabled**: 50% opacity, cursor not-allowed
- **Loading**: Spinner icon, disabled interaction

### Inputs
- **Default**: Border color: var(--k1-border)
- **Focus**: Ring in accent color, border brightens
- **Error**: Red border, error message below
- **Disabled**: Grayed out, not interactive
- **Valid**: Optional green checkmark

### Sliders
- **Default**: Track + thumb
- **Hover**: Thumb enlarges slightly
- **Dragging**: Increased thumb size, show tooltip
- **Disabled**: Grayed out, no interaction
- **Step markers**: Small ticks for discrete values

### Switches
- **Off**: Gray background
- **On**: Accent color background
- **Transitioning**: 180ms ease animation
- **Disabled**: 50% opacity
- **Focus**: Ring around switch

### Connection Status Indicators
- **Connected**: Green dot, solid
- **Connecting**: Yellow dot, pulsing animation
- **Disconnected**: Gray dot, no animation
- **Error**: Red dot, solid

## Interaction Patterns

### Hover States
- Buttons: Background lightens
- Cards: Border brightens
- Interactive elements: Subtle scale or brightness change
- Duration: 120-180ms

### Focus States
- Keyboard navigation support
- Visible focus rings (accent color)
- Tab order follows logical flow

### Loading States
- Spinners for async operations
- Skeleton loaders for content areas
- Progress indicators for known durations
- Disable interaction during loading

### Error States
- Inline validation messages
- Toast notifications for critical errors
- Error boundaries for component failures
- Clear error messaging with recovery actions

## Responsive Behavior

### Desktop (1920×1080 baseline)
- Three-column layouts as specified
- Full sidebar visibility
- All charts displayed

### Tablet (768-1024px)
- Sidebar becomes collapsible/overlay
- Two-column layouts
- Charts stack vertically
- Reduced chart heights

### Mobile Strategy (Future)
- Terminal desktop-only
- Single-column layouts
- Bottom navigation for views
- Simplified parameter controls

## Accessibility

### Keyboard Navigation
- Tab order: Top nav → Sidebar → Main content
- Escape to close modals/dropdowns
- Enter to confirm actions
- Arrow keys for sliders and selects
- Hotkeys (optional):
  - 1-9: Switch effects
  - Cmd+/ (Mac) or Ctrl+/ (Win): Help
  - ~ : Focus terminal

### ARIA Labels
- All interactive elements labeled
- Charts have descriptive text alternatives
- Form inputs have associated labels
- Status indicators have text equivalents

### Color Contrast
- Text on backgrounds meets WCAG AA standards
- Status colors distinguishable
- Not relying solely on color for information

## Data Update Cadence

### Real-time Updates
- **Charts**: ~10Hz (100ms intervals)
- **Statistics Table**: ~2Hz (500ms intervals)
- **Status Bar**: ~5Hz (200ms intervals)
- **Connection Status**: Immediate on change

### Debounced Updates
- Parameter changes: 300ms debounce before sync
- Search/filter inputs: 250ms debounce
- Resize events: 150ms throttle

## Export & Data Format

### CSV Export Structure
```csv
Timestamp,Effect,FPS,Frame_Time_us,CPU_Percent,Memory_Percent
2025-10-23 14:32:01,Analog,58.4,245,42,65
...
```

### JSON Device Info
```json
{
  "device": "Emotiscope 2.0",
  "firmware": "2.0.3-beta",
  "uptime": 754,
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

## Modal/Dialog Templates

### Device Settings Modal
- Title: "Device Settings"
- WiFi configuration
- LED count/layout
- Audio input source
- Calibration controls
- Buttons: Save, Cancel

### Profiling Options Modal
- Export format selection
- Time range
- Metrics to include
- Buttons: Export, Cancel

### Connection Error Dialog
- Error icon
- Error message
- Troubleshooting tips
- Reconnect button
- Dismiss button

### Command Help Modal
- Command reference table
- Examples
- Keyboard shortcuts
- Close button

## Microcopy Guidelines

### Tooltips
- Concise (1-2 sentences)
- Action-oriented
- Include keyboard shortcuts when applicable

### Error Messages
- Clear description of what went wrong
- Actionable next steps
- Avoid technical jargon

### Success Messages
- Confirm action completed
- Optional: What happens next

### Empty States
- Friendly, helpful tone
- Clear call-to-action
- Explain why state is empty

## Animation Specifications

### State Transitions
- Fade in/out: 200ms
- Slide transitions: 250ms ease-out
- Scale transforms: 180ms ease-out

### Loading Indicators
- Spinner rotation: Continuous, linear
- Pulse effect: 2s ease-in-out, infinite
- Progress bars: 300ms ease for updates

### Micro-interactions
- Button press: 100ms
- Switch toggle: 180ms
- Slider drag: Immediate, no delay
- Tooltip appear: 150ms delay, 200ms fade

## Icon Usage

### Library
- Lucide React
- Size: 14px standard, 16px for emphasis
- Stroke width: 2px
- Color: Inherit from text or specific accent

### Common Icons
- Activity: Performance/metrics
- Settings: Configuration
- HelpCircle: Help/info
- Wifi: Connection
- RefreshCw: Reload/refresh
- Download: Export
- Zap: Effects/power
- AlertCircle: Warnings
- CheckCircle: Success
- Loader2: Loading states

## Performance Targets

### Frame Rate
- Target: 60 FPS
- Acceptable: 40+ FPS
- Warning: <40 FPS

### CPU Usage
- Good: <300μs average
- Warning: 300-500μs
- Critical: >500μs

### Memory
- Safe: <70%
- Warning: 70-85%
- Critical: >85%

### Latency
- Good: <20ms
- Acceptable: 20-50ms
- Poor: >50ms

## Cross-Platform Considerations

### Web Browser
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- WebSocket for real-time communication
- Local storage for preferences

### Tauri Desktop (macOS)
- Native window controls
- System tray integration
- File system access for export
- Native notifications

### Shared Codebase
- React components for both platforms
- Platform-specific API bridges
- Consistent design language
- Responsive to window resizing

---

**Version**: 1.0  
**Last Updated**: October 23, 2025  
**Design System**: PRISM.node  
**Product**: Emotiscope 2.0 Control Dashboard
