# K1 Node Architecture Documentation
## For Figma Design System Handoff

**Author:** Agent #2 (Writer)
**Source:** Agent #1 (Researcher) institutional memory retrieval
**Date:** 2025-10-29
**Purpose:** Design reference for K1 Node Editor visual interface
**Memory Queries:** 4 successful retrievals with custom K1 reranker

---

## 1. Core Philosophy: Zero-Overhead Visual Programming

**Key Insight** (from institutional memory):
> "The node graph doesn't exist at runtime because it doesn't need to. It's a way of
> thinking that compiles to a way of executing. The abstraction has truly zero cost."

K1's node architecture proves that **flexibility and performance are not opposites**. The system achieves:
- ✅ Zero virtual function calls (everything inlines)
- ✅ Zero heap allocations (stack only)
- ✅ Zero runtime interpretation (pure machine code)
- ✅ Literally indistinguishable from hand-written optimized code

**Implication for UI Design:**
Users design with visual nodes, but ESP32 executes pure machine code. The visual editor is not a toy—it's a production tool that produces optimal firmware.

---

## 2. Two-Stage Compilation Pipeline

**Stage 1: JSON → C++ Templates** (Development Time)
- Visual node graphs export to JSON (nodes array + edges array)
- TypeScript compiler (`graph_compiler.ts`) converts JSON → C++ template code
- Example: `{"type": "sin", "input": "position"}` → `Sin<Position>`

**Stage 2: C++ → Machine Code** (Compile Time)
- C++ compiler optimizes templates to pure assembly
- All node structure disappears; becomes direct math operations
- **Result: 15.9x faster** than traditional runtime node systems

**Performance Benchmark** (from institutional memory):
- Traditional: ~350 cycles per LED
- K1 compile-time: ~22 cycles per LED
- For 180 LEDs at 450 FPS: 3,960 cycles/frame vs. 63,000 cycles/frame

**UI Implication:**
The Node Editor must include a visible **compilation pipeline UI**:
1. **Validate Graph** button (cycle detection, type checking)
2. **Compile to C++** button (runs graph_compiler.ts)
3. **Build Firmware** button (triggers C++ compilation)
4. **Deploy to Device** button (OTA or serial upload)

Each stage should show:
- ✅ Progress indicator (spinner or progress bar)
- ✅ Status messages (success / errors)
- ✅ Logs panel (compiler output, validation errors)

---

## 3. Node Categories & UI Palette Organization

**4 Core Categories** (from institutional memory):

### 3.1 Generators (Context → Value)
**Purpose:** Source of variation; starting points for effects

**Node Types:**
- `Position` — LED position (0.0 to 1.0)
- `Time` — Global time in seconds
- `Index` — Raw LED index
- `Random` — Noise/random values

**UI Design:**
- **Icon:** Circle with radiating lines (source)
- **Color:** Blue (#3B82F6)
- **Palette Location:** Top section

### 3.2 Transforms (Value → Value)
**Purpose:** Shape and modulate values

**Node Types:**
- Math: `Add`, `Multiply`, `Scale`
- Oscillators: `Sin`, `Cos`, `Saw`
- Conditioning: `Clamp`, `Smooth`
- Noise: Perlin/Simplex

**UI Design:**
- **Icon:** Arrow with wave (transformation)
- **Color:** Green (#10B981)
- **Palette Location:** Second section

### 3.3 Color Operations (Value → Color)
**Purpose:** Convert numeric values to visual colors

**Node Types:**
- `HSVToRGB` — Color space conversion
- `PaletteMap` — Value → palette lookup
- `Gradient` — Multi-stop gradients
- `Blend` — Mix colors

**UI Design:**
- **Icon:** Paint palette
- **Color:** Purple (#8B5CF6)
- **Palette Location:** Third section

### 3.4 Compositers (Multiple → Single)
**Purpose:** Combine sub-graphs into final output

**Node Types:**
- `Layer` — Blend multiple effects
- `Mask` — Selective application
- `Switch` — Conditional selection

**UI Design:**
- **Icon:** Layers stack
- **Color:** Orange (#F59E0B)
- **Palette Location:** Bottom section

**Palette Interaction:**
- Drag node from palette → drop on canvas
- Search bar filters by name or category
- Category headers collapsible for focus
- Hover shows node description + parameter preview

---

## 4. Canvas Area Design

### 4.1 Node Appearance

**Visual Structure:**
```
┌─────────────────────┐
│   [Icon] Node Name  │  ← Header (category color)
├─────────────────────┤
│ ○ Input Port 1      │  ← Input ports (left side)
│ ○ Input Port 2      │
├─────────────────────┤
│ Parameter: [value]  │  ← Inline parameter editing
├─────────────────────┤
│      Output Port ○  │  ← Output port (right side)
└─────────────────────┘
```

**States:**
- **Default:** Neutral background, category-colored header
- **Selected:** Blue outline, glow effect
- **Dragging:** 50% opacity, snap-to-grid guides
- **Error:** Red outline, error icon in header
- **Validated:** Green checkmark in header

### 4.2 Connection (Edge) Appearance

**Visual Style:**
- Curved Bezier paths (not straight lines)
- Color matches output port's node category
- Thickness: 2px default, 4px when hovering
- Animation: pulse from output → input (shows data flow direction)

**States:**
- **Valid:** Solid line (type compatibility confirmed)
- **Invalid:** Dashed red line (type mismatch)
- **Pending:** Gray dashed (being drawn, not connected yet)

### 4.3 Canvas Interactions

**Pan/Zoom:**
- Mouse wheel: zoom in/out (cursor as focal point)
- Middle-click drag: pan canvas
- Keyboard: Arrow keys pan, +/- keys zoom

**Selection:**
- Click node: select single
- Click + drag on empty space: marquee selection (multi-select)
- Ctrl+A: select all

**Connection:**
- Click output port: start connection (shows pending edge)
- Drag to input port: complete connection
- Drag to empty space: cancel connection

**Deletion:**
- Select node(s) → Delete key: remove nodes
- Select edge → Delete key: remove connection
- Undo/Redo: Ctrl+Z / Ctrl+Y

**Alignment:**
- Right-click selected nodes → context menu → Align (left, center, right, distribute)

---

## 5. Inspector Panel (Right Sidebar)

**Purpose:** Edit selected node's parameters in detail

**Layout:**
```
┌──────────────────────────┐
│ Node: Sin Wave           │ ← Node name
├──────────────────────────┤
│ Type: Transform          │ ← Category
├──────────────────────────┤
│ Frequency: [2.0    ]     │ ← Parameter inputs
│ Phase:     [0.0    ]     │
│ Amplitude: [1.0    ]     │
├──────────────────────────┤
│ Preview                  │ ← Live waveform preview
│ ╱╲  ╱╲  ╱╲  ╱╲         │   (mini-graph of output)
│╱  ╲╱  ╲╱  ╲╱  ╲        │
├──────────────────────────┤
│ Connected to:            │ ← Connection info
│ • Position (input)       │
│ • Palette Map (output)   │
└──────────────────────────┘
```

**Interaction:**
- Click parameter input: inline editing
- Drag slider: real-time value adjustment
- Validation: red border if invalid value (e.g., negative frequency)
- Reset button: restore default values

---

## 6. Graph Pipeline Panel (Bottom)

**Purpose:** Validate, compile, build, and deploy graphs

**Layout:**
```
[Validate Graph] [Compile to C++] [Build Firmware] [Deploy to Device]
     ↓                ↓                 ↓                 ↓
  (Checking...)    (Compiling...)   (Building...)    (Uploading...)
```

**Stage 1: Validate Graph**
- Checks: cycle detection, type compatibility, orphaned nodes
- Output: ✅ "Graph valid" or ❌ "3 errors found" (with list)

**Stage 2: Compile to C++**
- Runs: `graph_compiler.ts` (JSON → C++ templates)
- Output: Generated C++ code preview (read-only)
- Errors: Compilation failures with line numbers

**Stage 3: Build Firmware**
- Runs: PlatformIO build (C++ → binary)
- Output: Build log (scrollable, searchable)
- Errors: C++ compiler errors (syntax, type mismatches)

**Stage 4: Deploy to Device**
- Options: OTA (WiFi) or Serial (USB)
- Progress: Upload percentage (0-100%)
- Success: "Deployed successfully, device restarted"

**Logs Panel:**
- Collapsible section below buttons
- Auto-scroll to bottom on new messages
- Search/filter by keyword
- Copy button (copy entire log to clipboard)

---

## 7. Example Patterns (Templates)

**From institutional memory:**
Three intentional patterns that demonstrate K1 philosophy:

### Pattern 1: Departure (Transformation)
- **Graph:** `Position + (Sin(Time * 2) * 0.1) → Palette[Black, Gold, White, Green]`
- **Effect:** Base gradient that breathes with time
- **Philosophy:** Subtle movement without destroying core progression
- **Complexity:** Medium

### Pattern 2: Lava (Intensity)
- **Graph:** `Sin((Position * 3) + Time) → Palette[Black, DarkRed, Orange, White]`
- **Effect:** Multiple waves traveling along the strip
- **Philosophy:** Position scaling creates frequency, time creates motion
- **Complexity:** Medium

### Pattern 3: Twilight (Peace)
- **Graph:** `Position → Palette[Amber, Purple, MidnightBlue]`
- **Effect:** Pure static gradient, no animation
- **Philosophy:** "Intentionality matters more than complexity"
- **Complexity:** Minimal

**UI Integration:**
- Templates section in left sidebar (below node palette)
- Drag template → canvas: instantiate entire graph
- Each template shows: name, preview image, philosophy note
- Users can save custom templates (export → import)

---

## 8. Performance Constraints & Guarantees

**From institutional memory:**
> "Every addition must maintain zero overhead. If it adds runtime cost, it doesn't belong."

**UI Performance Targets:**
- Canvas rendering: 60fps with 50+ nodes
- Node drag: <16ms latency (smooth, no jank)
- Connection drawing: instant feedback
- Memory footprint: <50MB for entire editor

**Graph Performance Guarantees:**
- All node types compile to zero-overhead code
- Users can add unlimited nodes without worrying about runtime performance
- Firmware performance is guaranteed by architecture, not user discipline

**Benchmark Mode (Optional):**
- Button: "Estimate Performance"
- Output: "This graph will execute in ~3,200 cycles/frame at 180 LEDs"
- Comparison: "15.9x faster than runtime nodes"

---

## 9. Accessibility Requirements

**Keyboard-Only Operation:**
- Tab: cycle through nodes, ports, buttons
- Arrow keys: navigate canvas (pan), move selected nodes
- Enter: edit parameter (inline), confirm connection
- Esc: cancel operation (connection, edit)
- Delete: remove selected nodes/edges
- Ctrl+Z/Y: undo/redo
- Ctrl+A: select all

**Screen Reader Support:**
- All nodes announce: type, name, parameters, connections
- Canvas state announced: "3 nodes selected, 2 connections"
- Pipeline stages announce: "Compiling... 50% complete"

**Color Contrast:**
- WCAG AA minimum (4.5:1 for text, 3:1 for UI components)
- Category colors distinguishable for colorblind users
- High-contrast mode toggle (optional)

**Focus Indicators:**
- Visible outline on focused node/port/button (2px blue)
- Never remove focus outlines (critical for keyboard navigation)

---

## 10. Integration with Control Panel

**Separation of Concerns:**
- **Node Editor:** Design mode (create graphs, compile patterns)
- **Control Panel:** Runtime mode (select patterns, adjust parameters, manage colors)

**Workflow:**
1. User designs graph in Node Editor
2. Validates, compiles, builds, deploys
3. Switches to Control Panel
4. Selects compiled pattern from effect list
5. Adjusts runtime parameters (brightness, speed, colors)
6. Returns to Node Editor to iterate on design

**Data Flow:**
- Node Editor outputs: JSON graph + compiled firmware binary
- Control Panel inputs: Effect name, runtime parameters
- No direct connection: patterns are precompiled, not interpreted at runtime

**Navigation:**
- Tab/button to switch between Editor and Panel
- State preserved: switching back to Editor restores canvas

---

## 11. Next Steps for Figma Design

**Deliverables Needed:**
1. **Wireframes** for each screen (canvas, palette, inspector, pipeline panel)
2. **Component Library** for nodes, ports, connections, buttons
3. **Design Tokens** (colors, spacing, typography, radii, shadows)
4. **Interaction Specs** (drag, connect, edit, validate, compile)
5. **Accessibility Checklist** (color contrast, focus states, keyboard shortcuts)

**Design Principles:**
- Clarity over cleverness (intentional, minimal)
- Performance as a feature (60fps, instant feedback)
- Accessibility first (keyboard, screen reader, contrast)
- Separation of concerns (editor creates, panel controls)

**References:**
- React Flow library (proven canvas patterns)
- K1 Control Panel design (three-column layout, dark theme, design tokens)
- NODE_ARCHITECTURE.md (technical reference)

---

## Summary

This documentation synthesizes institutional memory (Agent #1 research) into actionable design specifications for the K1 Node Editor. The UI must respect:

✅ **Zero-overhead philosophy** (visual programming → machine code)
✅ **Two-stage compilation** (JSON → C++ → binary)
✅ **Four node categories** (Generators, Transforms, Color Ops, Compositers)
✅ **Performance guarantees** (15.9x faster, 22 cycles/LED)
✅ **Intentionality over complexity** (Twilight proves simplicity works)
✅ **Accessibility first** (keyboard, contrast, screen reader)

**Ready for Figma design handoff.**

---

*Built with institutional memory. Agent #2 synthesized this from Agent #1's research using Mem0's custom K1 reranker.*
