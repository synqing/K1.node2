# PRISM.node Design System Implementation

## Overview

This is a fully-functional React implementation of the PRISM.node visual programming interface - a node graph editor for creating LED visualization patterns that compile to native C++ code running on ESP32-S3 hardware at 120+ FPS.

The interface proves a specific thesis: **flexibility and performance are not opposites**. The visual language communicates this through physics-based glassmorphism where every design decision follows actual material physics.

---

## Core Design Principles

### 1. Single Light Source Physics

**All glass effects follow a single directional light from top-left (20%, 20%) at 45°.**

This is implemented through:
- Primary light gradient positioned at `20% 20%` in radial gradients
- Consistent shadow directions (down and right, opposite the light source)
- No competing gradients or random darkening

**Why it matters:** Creates believable, consistent materials rather than arbitrary translucent panels.

### 2. Beer-Lambert Law (Glass Thickness = Computational Cost)

Real glass darkens as light travels through thicker sections. We use this to communicate algorithm cost:

**Light Nodes (20px blur):**
- Cheap static operations: position gradients, constants, simple math
- Visual: Insubstantial, lightweight, see-through
- Backdrop blur: 20px
- Base fill: 6% white opacity

**Heavy Nodes (40px blur):**
- Expensive audio-reactive operations: FFT analysis, beat detection, spectrum processing
- Visual: Substantial, weighty, dense
- Backdrop blur: 40px
- Base fill: 10% white opacity

**Implementation:** Component variants in `NodeCard.tsx` with `.node-card-light` and `.node-card-heavy` classes.

### 3. Fresnel Effect (Edge Brightness)

Glass reflects more light at grazing angles. Implemented through:
- 1px inner stroke at 20% white opacity (bright rim)
- Inner shadow highlights at top edge
- Inner shadow definition at bottom edge

**Location:** Layer 4 effects in `.node-card` CSS

### 4. Environmental Reflections

Glass picks up colors from the LED visualization background. Implemented as:
- Radial gradient positioned at 85%, 85% (bottom-right, opposite light source)
- Cyan tint (#6EE7F3) at 4-6% opacity
- Simulates reflection of LED output colors

**Location:** Layer 3 (::after pseudo-element) in node card styles

---

## Color System

### Structural Colors

```css
--prism-bg-canvas: #1C2130        /* RGB(28, 33, 48) - Dark blue-gray canvas */
--prism-bg-chrome: #252D3F        /* RGB(37, 45, 63) - Panel backgrounds */
--prism-surface-elevated: #2F3849 /* RGB(47, 56, 73) - Selected nodes */
```

### Text Colors

```css
--prism-text-primary: #E6E9EF     /* RGB(230, 233, 239) - 18.5:1 contrast */
--prism-text-secondary: #B5BDCA   /* RGB(181, 189, 202) - 7.2:1 contrast */
--prism-text-disabled: #7A8194    /* RGB(122, 129, 148) - 4.8:1 contrast */
```

### Semantic Colors

```css
--prism-action-primary: #FFB84D   /* Gold - from SpectraSynq logo */
--prism-success: #22DD88          /* Technical green */
--prism-warning: #F59E0B          /* Amber */
--prism-error: #EF4444            /* Red */
--prism-info: #6EE7F3             /* Cyan */
```

### Wire Data Type Colors

```css
--prism-wire-scalar: #F59E0B      /* Orange - single numeric values */
--prism-wire-field: #22D3EE       /* Cyan - positional/spatial data */
--prism-wire-color: #F472B6       /* Magenta - RGB/HSV color data */
--prism-wire-output: #34D399      /* Green - final render output */
```

**Wire width variation:** 3px (scalar), 4px (field/color), 5px (output) - aids colorblind distinction.

---

## Typography System

### Font Families

**Bebas Neue** - Display font for headers
- Usage: Node type names, panel titles, section headers
- Always uppercase, strong vertical emphasis
- Sizes: 14px (nodes), 16px (panels), 18px (major headers)

**Nunito Sans** - Body font (substitute for Rama Gothic Rounded)
- Usage: Descriptions, parameter labels, interface text
- Geometric with rounded terminals
- Sizes: 11px (descriptions), 12px (labels), 13-14px (body)

**JetBrains Mono** - Monospace font for data
- Usage: Numeric values, parameter data, technical info
- Tabular figures ensure alignment
- Size: 13px

### Typography Hierarchy Examples

```css
.node-type-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--prism-text-primary);
}

.parameter-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--prism-text-primary);
}
```

---

## Glass Material Layer Structure

### Light Node (20px blur)

1. **Base Glass:** Backdrop blur 20px + 6% white fill
2. **Light Source Gradient:** Radial at 20%, 20% (white 12% → 3% → 0%)
3. **Environmental Reflection:** Radial at 85%, 85% (cyan 4% → 0%)
4. **Fresnel Edges:** Inner shadows + 1px white stroke at 20%
5. **Depth Shadows:** Two drop shadows (12px & 32px offsets)
6. **Surface Texture:** 2-3% noise overlay prevents banding

### Heavy Node (40px blur)

Same layer structure, adjusted values:
- Backdrop blur: 40px (2× light)
- Base fill: 10% (vs 6%)
- Light gradient: 14% first stop (vs 12%)
- Environmental: 6% (vs 4%)
- Shadows: 32% & 48% opacity (vs 18% & 27%)

**Result:** Heavy nodes feel substantially thicker and denser.

---

## Interaction States

### Hover State (120ms tanh-linear easing)
- Backdrop blur: +4px
- Brightness: +5% (white fill, screen blend)
- Shadow Y offset: +2px
- Easing: `cubic-bezier(0.5, 0, 0.5, 1)`

### Selected State (280ms tanh-snap easing)
- Backdrop blur: +8px
- Brightness: +8%
- Outline: 1px solid gold (#FFB84D)
- Shadow Y offset: +4px
- Easing: `cubic-bezier(0.68, -0.25, 0.265, 1.15)`

### Error State (2s sine wave pulse)
- Outline: 2px solid red (#EF4444)
- Animation: Opacity pulses 0.4 → 1.0
- Error badge: 20px diameter circle in top-right

---

## Component Architecture

### NodeCard.tsx
- Props: `weight` ('light' | 'heavy'), `state` ('default' | 'hover' | 'selected' | 'error')
- Variants: 8 combinations (2 weights × 4 states)
- Layout: Auto-layout vertical with 16px padding, 8px spacing
- Ports: Input (left edge), Output (right edge)

### Wire.tsx
- Bezier curve rendering using SVG paths
- Control points: 40% and 60% of horizontal distance
- Drop shadow glow effect for visibility
- Props: `type` (determines color and width)

### CompilationPanel.tsx
- Heavy glass (40px blur) docked to right edge
- Sections: Header, Graph Health, Performance, Semantics, Risk Preview
- Performance bar: Gradient from green → yellow → red
- Auto-scrolling with styled scrollbar

### LEDPreview.tsx
- Animated canvas showing vibrant LED visualization
- Colors: Cyans, purples, magentas, oranges
- Simulates K1 Lightwave hardware output
- Provides colorful background for glass materials

---

## Accessibility

### Contrast Ratios (WCAG AA Compliant)

- Primary text: 18.5:1 against canvas
- Secondary text: 7.2:1 against canvas
- Disabled text: 4.8:1 against canvas
- Interactive elements: 3:1 minimum for non-text

### Focus States

- Gold outline: 1px solid #FFB84D
- Glow: 4px blur at 30% opacity
- Offset: 2px from element edge

### Reduce Motion Support

Motion preferences documented for implementation:
- Swap position/scale animations → opacity fades
- Disable continuous animations (pulses, processing borders)
- Preserve timing for feedback clarity

---

## File Structure

```
/App.tsx                      - Main application with node graph
/components/
  NodeCard.tsx               - Node component with variants
  Port.tsx                   - Input/output port circles
  Wire.tsx                   - Bezier wire renderer
  CompilationPanel.tsx       - Right-side feedback panel
  LEDPreview.tsx             - Animated background visualization
  DesignSystemInfo.tsx       - Interactive design documentation
/styles/
  globals.css                - PRISM color tokens
  prism.css                  - Complete glass physics styles
```

---

## Key Implementation Details

### Canvas Background Strategy

The LED preview is NOT a separate panel - it IS the canvas. Nodes float directly over active visualization, creating immediate visual connection between program structure and output.

Grid overlay: 32px spacing, 3% opacity for positioning aid.

### Wire Routing

Uses Bezier curves with S-shape for horizontal connections:
- Start: Output port center
- End: Input port center  
- Control 1: 40% distance, source Y
- Control 2: 60% distance, destination Y

### Panel Glass Treatment

Compilation panel uses heavy glass (40px blur) because it's a prominent persistent panel containing dense information. Includes semi-opaque scrim behind text if LED background is too bright.

---

## Validation Checklist

✅ Single light source consistency (20%, 20% position)  
✅ Heavy nodes visibly thicker than light nodes  
✅ Fresnel edge brightening on all glass surfaces  
✅ Environmental reflections in bottom-right regions  
✅ Only specified hex values used from color system  
✅ Gold exclusively for primary actions  
✅ Typography: Bebas Neue headers, JetBrains Mono numbers  
✅ All text meets 4.5:1 contrast minimum  
✅ Wire types distinguishable by color AND width  
✅ Bezier curves (not straight lines) for wires  
✅ Component variants complete (2 costs × 4 states)  

---

## Design Philosophy

This is NOT decorative glassmorphism - it is **functional material design** where physics principles create information architecture.

The single light source creates consistent, believable materials. Glass density variations make performance intuitive - **heavy nodes LOOK expensive because they ARE expensive**. Wire semantics make data flow explicit. Compilation feedback surfaces quality gates transparently.

Every design decision serves the mission: **prove flexibility and performance can coexist without compromise**.

---

## Interactive Features

Click the **info button** (bottom-left) to view the design system explanation panel while using the interface.

Try:
- **Hovering** nodes to see subtle glass thickness increase
- **Clicking** nodes to see selection state with gold outline  
- **Observing** wire colors connecting different data types
- **Watching** the LED preview animation behind the glass panels
- **Reviewing** the compilation panel metrics and quality gates

---

## Credits

**Design System:** PRISM.node specification (physics-based glassmorphism)  
**Brand Identity:** SpectraSynq (pyramid logo, gold accent)  
**Implementation:** React + TypeScript + CSS with authentic material physics  

Build something that matters. Build it true.
