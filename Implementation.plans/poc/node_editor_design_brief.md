---
title: Node Editor Design Brief (Figma Make Handoff)
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads, Design Team]
last_updated: 2025-10-29
next_review_due: 2025-11-12
tags: [design, node_editor, figma, poc]
related_docs: [Implementation.plans/poc/node_architecture_doc.md, k1-control-app/src/DESIGN_SPECS.md]
---
# Node Editor Design Brief (Figma Make Handoff)

**Purpose:** Complete design specification for K1 Node Editor visual interface, ready for Figma Make agent implementation.

**Source:** Synthesized by Agent #3 (Designer) from Agent #1 (Researcher) design context + Agent #2 (Architect) integration proposals.

**PoC Context:** This document validates Mem0 institutional memory system with 3-agent handoff (Task #2 of PoC).

---

## 1. Core Philosophy & Principles

**From institutional memory (Agent #1):**

The node editor embodies K1's "zero-overhead abstraction" philosophy: visual programming that compiles to bare-metal performance. The node graph doesn't exist at runtime—it's a way of thinking that compiles to a way of executing.

**Design Principles:**
- **Clarity over complexity:** Every visual element must serve a functional purpose
- **Consistency with Control Panel:** Shared design tokens, unified navigation, cohesive experience
- **Accessibility-first:** Keyboard-only operation, screen reader support, WCAG AA compliance
- **Performance visibility:** Show compile-time decisions + runtime metrics inline
- **Phased delivery:** Ship read-only viewer first, editing second, compilation third

---

## 2. Design System & Tokens

**From institutional memory (Agent #1 + bootstrap):**

### Color Palette

**Backgrounds & Surfaces:**
- Background: `#0a0a0a` (--k1-bg)
- Panel: `#141414` (--k1-panel)
- Border: `#2a2a2a` (--k1-border)

**Text:**
- Primary: `#e6e6e6` (--k1-text)
- Dimmed: `#9aa0a6` (--k1-text-dim)

**Accents:**
- Primary (Cyan): `#6ee7f3` (--k1-accent)
- Danger (Red): `#ef4444` (--k1-danger)
- Success (Green): `#10b981` (--k1-success)

**Port/Wire Colors (colorblind-safe):**
- Scalar: `#F59E0B` (orange)
- Field: `#22D3EE` (cyan)
- Color: `#F472B6` (pink)
- Output: `#34D399` (green)

### Typography
- Font: system-ui (fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)
- Sizes: 12px, 14px (base), 16px, 18px, 20px, 24px
- Line heights: 1.3 (tight), 1.5 (normal), 1.6 (relaxed)

### Spacing Scale
- 4px, 8px, 12px, 16px, 20px, 24px, 32px

### Border Radii
- Small: 6px
- Medium: 10px
- Large: 14px

### Shadows & Elevation
- xs: `0 1px 2px rgba(0,0,0,0.1)`
- sm: `0 2px 4px rgba(0,0,0,0.2)`
- md: `0 4px 8px rgba(0,0,0,0.3)`

---

## 3. Layout & Navigation Integration

**From institutional memory (Agent #2 architectural proposal):**

### Navigation Pattern: 4th View Tab

Add "Node Editor" tab to top navigation (56px height) alongside:
- Control Panel
- Profiling
- Terminal

**Route:** `/node-editor`

### Layout Structure

**Top Navigation (56px height):**
- Logo/title + connection status (left)
- View tabs: Control Panel | Profiling | Terminal | **Node Editor** (center)
- Settings + help icons (right)

**Left Sidebar (280px width, collapsible <1280px):**
- **Node Palette** (categorized accordion):
  - Generators (waveform icons)
  - Transforms (function graph icons)
  - Color Operations (color wheel icons)
  - Compositers (layer stack icons)
- **Graph Outline** (search + filter):
  - Node list with status badges
  - Click to focus node on canvas

**Main Content Area (split 60/40):**
- **Canvas (60%):** Node graph with pan/zoom
- **Inspector Panel (40%, collapses to modal <960px):**
  - Tabs: Properties | Parameters | Bindings | Validation

**Bottom Status Bar (32px default, 56px during compile):**
- Compilation pipeline status (4 stages)
- Validation error count + jump-to-node
- FPS + device metrics (when connected)

### Responsive Breakpoints
- ≥1280px: Full layout (sidebar + split canvas/inspector)
- 960-1279px: Compact (collapsible sidebar, narrower inspector)
- <960px: Stacked (sidebar overlay, inspector modal)

---

## 4. Component Library

**From institutional memory (Agent #1 + Agent #2):**

### Reused K1 Primitives
- **K1Button:** Actions (Add Node, Validate, Compile, etc.)
- **K1Card:** Node cards with header/body/footer slots
- **K1Modal:** Compile progress, error dialogs, node palette modal
- **K1Toast:** Validation errors, compile success/failure
- **K1Slider:** Inspector parameter controls

### New Node Editor Components

#### NodeCanvas
- **Purpose:** Render nodes, wires, handle pan/zoom
- **States:** idle, dragging, connecting, selecting
- **Events:** onAddNode, onConnect, onSelect, onDelete
- **ARIA:** role="application", aria-label="Node graph canvas"

#### NodeCard
- **Variants:** default, selected, error, disabled
- **Structure:**
  - Header: icon (category color) + node name
  - Ports (left/right): input/output with type color
  - Body: parameter summary (collapsed by default)
  - Footer: edit/delete actions (visible on hover/focus)
- **ARIA:** Focusable, aria-label="[Category]: [Node Name]"

#### Port
- **Types:** input (left), output (right)
- **States:** default, hover, active, connected
- **Visual:** Circle (8px) with type color + label
- **Interaction:** Click to select, drag to connect
- **ARIA:** role="button", aria-label="[Port Name]: [Type]"

#### WirePath
- **Style:** Cubic Bezier curve (smooth S-curve)
- **States:** default, hover, selected, invalid
- **Color:** Inherits from source port type
- **Width:** 2px default, 3px hover/selected
- **Snapping:** Visual guides when near valid target

#### InspectorPanel (Right Sidebar)
- **Tabs:**
  1. **Properties:** Node name, category, description
  2. **Parameters:** Sliders, toggles, dropdowns (dynamic per node type)
  3. **Bindings:** Input/output connections list
  4. **Validation:** Error/warning badges + messages
- **Sticky header:** Node icon + name
- **Scroll:** Body content only

#### GraphOutline (Left Sidebar Section)
- **Search:** Filter nodes by name (debounced 250ms)
- **Filter:** Category dropdown (All | Generators | Transforms | etc.)
- **List:** Node name + status badge (✓ valid | ⚠ warning | ✗ error)
- **Click:** Focus + select node on canvas

#### Toolbar (Below Top Nav or in Sidebar)
- **Actions:**
  - Add Node (N) → opens palette modal
  - Connect Mode (C) → enables port-to-port drawing
  - Validate (V) → runs graph validation
  - Compile (Cmd+B) → starts compilation pipeline
  - Undo/Redo (Cmd+Z/Cmd+Shift+Z)
- **Icons:** Lucide React, 16px, 2px stroke
- **States:** default, hover, active, disabled

---

## 5. Interaction Patterns

**From institutional memory (Agent #1 + Agent #2):**

### Add Node
1. Click "Add Node" button (or press N)
2. Palette modal opens with 4 category tabs
3. Search bar filters nodes in real-time
4. Click node → adds to canvas at center (or mouse position)
5. Keyboard: Arrow keys navigate, Enter adds, Esc cancels

### Connect Ports
1. **Mouse:** Drag from source port → wire follows cursor → drop on target port
2. **Keyboard:** Select source node (Enter), press C, arrow keys to target node, Enter connects
3. **Validation:** Invalid targets show red rejection indicator (type mismatch)
4. **Visual feedback:** Wire color matches source port type

### Validate Graph
1. Click "Validate" (or press V)
2. Inline badges appear on affected nodes (⚠ warning, ✗ error)
3. Validation panel (Inspector tab 4) lists all issues
4. Click issue → jumps to node + highlights error

### Compile & Publish
1. Click "Compile" (or press Cmd+B)
2. Bottom status bar expands to show 4-stage pipeline:
   - **Stage 1: Validate** (green check or red X)
   - **Stage 2: Compile** (spinner or green check)
   - **Stage 3: Build** (spinner or green check)
   - **Stage 4: Deploy** (spinner or green check)
3. Click stage → opens modal with logs/errors
4. Cancel button aborts compile
5. Rollback button restores previous firmware (if deploy fails)

### Undo/Redo
- Standard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
- History snapshots: node add/delete, connection, parameter change
- Timeline UI (optional): visual history scrubber

---

## 6. Accessibility Requirements

**From institutional memory (Agent #1 + Agent #2):**

### Keyboard Navigation
- **Tab:** Move focus between canvas, sidebar, inspector
- **Arrow keys:** Move selected node (1px increments, Shift+Arrow for 10px)
- **Enter:** Edit node (opens inspector), confirm action
- **Escape:** Cancel action, close modals
- **Space:** Pan canvas (hold + drag)
- **+/-:** Zoom in/out
- **Cmd+A:** Select all nodes
- **Delete/Backspace:** Delete selected nodes

### Keyboard Shortcuts
- **N:** Add node (opens palette modal)
- **C:** Connect mode (port-to-port drawing)
- **V:** Validate graph
- **Cmd+B:** Compile
- **Cmd+Z:** Undo
- **Cmd+Shift+Z:** Redo
- **Cmd+/:** Help modal (shows all shortcuts)

### ARIA Annotations
- Canvas: `role="application"`, `aria-label="Node graph canvas"`
- Nodes: Focusable, `aria-label="[Category]: [Node Name]"`
- Ports: `role="button"`, `aria-label="[Port Name]: [Type] port"`
- Validation errors: `aria-live="polite"` live region announces errors

### Screen Reader Support
- Node add: "Added [Node Name] to canvas"
- Connection: "Connected [Source Node].[Port] to [Target Node].[Port]"
- Validation: "Graph has 3 errors, 1 warning. See validation panel."
- Compile: "Compilation started. Stage 1 of 4: Validating..."

### Color Contrast
- All text: WCAG AA compliance (4.5:1 minimum)
- Port/wire colors: Tested for colorblindness (Deuteranopia, Protanopia, Tritanopia)
- No color-only state: Use badges, icons, text labels

### Reduced Motion
- Respect `prefers-reduced-motion` OS setting
- Animations: opacity/scale only (no position transforms)
- Disable panning transitions, wire animations

---

## 7. Node Categories & Visual Language

**From institutional memory (Agent #1 + Task #1):**

### Category 1: Generators
**Purpose:** Source signals (sine waves, noise, pulses)

**Visual Identity:**
- Color: Purple/violet tint
- Icon: Waveform (sine curve, sawtooth, square)
- Port types: Output only (Field or Scalar)

**Example Nodes:**
- Sine Wave (icon: sine curve)
- Noise (icon: random dots)
- Pulse (icon: square wave)
- Time (icon: clock)

### Category 2: Transforms
**Purpose:** Modify field values (scale, offset, curve)

**Visual Identity:**
- Color: Blue tint
- Icon: Function graph (y=f(x) curve)
- Port types: Input (Field/Scalar), Output (Field/Scalar)

**Example Nodes:**
- Scale (icon: vertical stretch arrows)
- Offset (icon: horizontal shift arrows)
- Curve (icon: S-curve)
- Clamp (icon: horizontal bars)

### Category 3: Color Operations
**Purpose:** Map values to colors (palettes, gradients, HSV)

**Visual Identity:**
- Color: Pink/magenta tint
- Icon: Color wheel, gradient bar
- Port types: Input (Field/Scalar), Output (Color)

**Example Nodes:**
- Palette (icon: color swatches)
- Gradient (icon: horizontal gradient)
- HSV (icon: HSV cone)
- RGB (icon: RGB cubes)

### Category 4: Compositers
**Purpose:** Combine layers (blend, mask, alpha)

**Visual Identity:**
- Color: Green tint
- Icon: Layer stack
- Port types: Input (Color), Output (Color/Output)

**Example Nodes:**
- Blend (icon: overlapping circles)
- Mask (icon: cut-out shape)
- Alpha (icon: transparency grid)
- Final Output (icon: LED strip - special "sink" node)

### Visual Hierarchy
- **Node size:** 160px wide × variable height (min 80px)
- **Port spacing:** 16px vertical spacing between ports
- **Icon size:** 20px (header), 14px (ports)
- **Font:** Node name 14px semibold, port labels 12px regular

---

## 8. Compilation Pipeline UI

**From institutional memory (Agent #2 architectural proposal):**

### Status Bar (Bottom, 56px during compile)

**4 Stages (left to right):**

1. **Validate** (icon: checkmark in shield)
   - Idle: Gray icon
   - Running: Yellow spinner
   - Success: Green checkmark
   - Error: Red X

2. **Compile** (icon: code brackets)
   - Idle: Gray icon
   - Running: Yellow spinner + progress bar (JSON → C++)
   - Success: Green checkmark
   - Error: Red X

3. **Build** (icon: hammer)
   - Idle: Gray icon
   - Running: Yellow spinner + progress bar (PlatformIO)
   - Success: Green checkmark
   - Error: Red X

4. **Deploy** (icon: upload to cloud)
   - Idle: Gray icon
   - Running: Yellow spinner + device IP
   - Success: Green checkmark
   - Error: Red X

**Actions:**
- Cancel button (visible during stages 2-4)
- Rollback button (visible after stage 4 failure)

**Click Stage:**
- Opens modal with logs/errors for that stage
- Syntax highlighting for code errors
- Jump-to-node links for validation errors

---

## 9. Profiling Integration

**From institutional memory (Agent #2 architectural proposal):**

### Per-Node Performance Overlay

When Profiling view is active AND device is connected:

**Node Card Overlay (top-right corner):**
- CPU usage: `245μs` (color-coded: green <300μs, yellow 300-500μs, red >500μs)
- Memory: `1.2KB` (if available from firmware instrumentation)
- Bottleneck badge: ⚠ (if this node is top 3 slowest)

**Inspector Panel (Profiling Tab):**
- CPU timeline chart (last 100 frames)
- Memory allocation graph
- Comparison vs. other nodes
- Link to Profiling view for deep-dive

**Constraint:**
Requires firmware to report per-node metrics (not currently implemented). Phase 3 feature.

---

## 10. State Management

**From institutional memory (Agent #2 architectural proposal):**

### Dual State Approach

**Control Panel State (existing):**
- Redux/Zustand for parameter sync
- Device connection status
- Real-time metrics (FPS, CPU, memory)

**Node Editor State (new, separate store):**
- Graph data: nodes, wires, viewport (pan/zoom)
- Selection state: selected nodes, active wire
- Validation errors: per-node, per-wire
- Compilation status: pipeline stage, logs

**Shared State:**
- Device connection (read-only from Control Panel state)
- Profiling metrics (subscribed from Profiling view)
- Validation errors (published to validation panel)

**Constraint:**
No shared mutable state between graph and parameters. Compile is the bridge (graph JSON → firmware).

**Benefit:**
Isolation prevents Control Panel bugs from affecting Node Editor.

**Trade-off:**
Two state trees increase memory overhead ~10-15% (acceptable).

---

## 11. Data Flow & Backend

**From institutional memory (Agent #2 architectural proposal):**

### Graph JSON Format

**File structure:**
```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "node_1",
      "type": "generator_sine",
      "position": { "x": 100, "y": 150 },
      "parameters": { "frequency": 2.0, "amplitude": 1.0 }
    }
  ],
  "wires": [
    {
      "id": "wire_1",
      "source": { "nodeId": "node_1", "port": "output" },
      "target": { "nodeId": "node_2", "port": "input" }
    }
  ]
}
```

### Backend API Endpoints

**Compile Graph:**
```
POST /api/graph/compile
Body: { "graph": { ... } }
Response: { "jobId": "abc123", "status": "queued" }
```

**Check Compile Status:**
```
GET /api/graph/compile/:jobId
Response: {
  "status": "running|success|error",
  "stage": "validate|compile|build|deploy",
  "logs": "...",
  "binaryUrl": "https://..."  // if success
}
```

**Deploy Firmware:**
```
POST /api/device/flash
Body: { "deviceIp": "192.168.1.100", "binaryUrl": "..." }
Response: { "status": "deployed|failed", "error": "..." }
```

**Constraint:**
Backend must support async compile (5-30s). Use job queue (Redis/Celery).

---

## 12. Migration Path & Rollout Strategy

**From institutional memory (Agent #2 architectural proposal):**

### Phase 1: Read-Only Viewer (2 weeks)
**Scope:**
- Visualize existing pattern JSON (Departure, Lava, Twilight)
- Pan/zoom/select nodes
- Inspector shows node properties (read-only)
- No editing, no compile

**Deliverables:**
- NodeCanvas component (render only)
- NodeCard component (static)
- Inspector panel (properties tab only)
- Navigation integration (Node Editor tab)

**Validation:**
- Users can open pattern JSON and see visual graph
- Keyboard navigation works
- Accessibility: screen reader announces nodes

### Phase 2: Editing + Validation (3 weeks)
**Scope:**
- Add/delete nodes (palette modal)
- Connect/disconnect ports (drag or keyboard)
- Edit parameters (inspector sliders)
- Validate graph (cycles, types, dangling ports)
- Save graph JSON (no compile)

**Deliverables:**
- Node palette (categorized, searchable)
- Wire drawing (Bezier curves, snapping)
- Validation engine (client-side checks)
- Graph outline (search/filter)
- Undo/redo

**Validation:**
- Users can create new graphs from scratch
- Validation catches errors before compile
- Keyboard-only operation verified

### Phase 3: Compile + Deploy (2 weeks)
**Scope:**
- Compile graph to C++ (backend job)
- Build firmware binary (PlatformIO)
- Deploy to device (OTA)
- Rollback on failure
- Per-node profiling (if firmware instrumentation ready)

**Deliverables:**
- Backend API endpoints (compile, deploy)
- Compilation pipeline UI (4-stage status bar)
- Error handling (logs, retry, rollback)
- Profiling integration (per-node metrics)

**Validation:**
- End-to-end compile works (JSON → firmware.bin → device)
- Errors are actionable (jump-to-node links)
- Rollback restores previous firmware

**Total Timeline:** 7 weeks (2 + 3 + 2)

---

## 13. Figma Make Handoff Checklist

### Design Deliverables Required

- [ ] Top navigation with Node Editor tab
- [ ] Left sidebar: Node palette (4 categories) + graph outline
- [ ] Main canvas: node rendering, wire paths, selection states
- [ ] Inspector panel (right sidebar): 4 tabs (Properties, Parameters, Bindings, Validation)
- [ ] Bottom status bar: compilation pipeline (4 stages)
- [ ] Node palette modal (searchable, keyboard-navigable)
- [ ] Node card variants: default, selected, error, disabled
- [ ] Port types: Scalar (orange), Field (cyan), Color (pink), Output (green)
- [ ] Wire path states: default, hover, selected, invalid
- [ ] Validation panel: error/warning list with jump-to-node
- [ ] Compile progress modal: logs, cancel/rollback buttons
- [ ] Keyboard shortcut help modal
- [ ] Responsive breakpoints: ≥1280px, 960-1279px, <960px
- [ ] Accessibility: ARIA labels, focus indicators, contrast validation

### Design System Consistency

- [ ] All colors use K1 design tokens (--k1-*)
- [ ] Typography: system-ui, 12-24px scale
- [ ] Spacing: 4px increments (4, 8, 12, 16, 20, 24, 32)
- [ ] Radii: 6px (sm), 10px (md), 14px (lg)
- [ ] Shadows: xs, sm, md (elevation scale)
- [ ] Icons: Lucide React, 16px, 2px stroke

### Interaction States

- [ ] Hover states: brightness increase, cursor changes
- [ ] Focus states: visible outline rings (--k1-accent)
- [ ] Active states: pressed appearance
- [ ] Disabled states: 50% opacity, cursor not-allowed
- [ ] Loading states: spinners, skeleton loaders

### Accessibility Verification

- [ ] Keyboard-only operation (no mouse required)
- [ ] WCAG AA contrast (4.5:1 minimum)
- [ ] No color-only state (use badges/icons/text)
- [ ] Screen reader friendly (ARIA labels, live regions)
- [ ] Reduced motion support (opacity/scale only)

---

## 14. Success Criteria

### Functional Requirements
- ✅ Users can visualize existing pattern JSON graphs (Phase 1)
- ✅ Users can create new graphs with add/connect/delete (Phase 2)
- ✅ Validation catches errors before compile (Phase 2)
- ✅ Graphs compile to firmware and deploy to device (Phase 3)

### Design Requirements
- ✅ Consistent with K1 Control Panel design system
- ✅ Keyboard-only operation works
- ✅ WCAG AA accessibility compliance
- ✅ Responsive at all breakpoints (≥1280px, 960-1279px, <960px)

### Performance Requirements
- ✅ Canvas renders 50+ nodes at 60 FPS
- ✅ Compile completes in <30s (typical graph)
- ✅ Graph state <5MB memory (typical graph)

### PoC Validation (Task #2)
- ✅ Agent #3 cited memories from Agents #1 and #2
- ✅ 3-agent handoff validated (research → architect → design)
- ✅ Figma brief is comprehensive and actionable

---

## 15. Next Steps

### Immediate (Figma Make Agent)
1. Import K1 design tokens into Figma (colors, typography, spacing)
2. Create component library: NodeCanvas, NodeCard, Port, WirePath, Inspector
3. Design Phase 1 screens (read-only viewer)
4. Export Figma file + component spec for engineering

### Engineering (Post-Figma)
1. Implement Phase 1 (read-only viewer)
2. QA Phase 1 with accessibility audit
3. User testing (keyboard-only operation)
4. Iterate based on feedback before Phase 2

### PoC Conclusion (Captain Review)
1. Review this Figma brief for completeness
2. Validate Agent #3 cited Agent #1 and Agent #2 memories
3. Confirm 3-agent handoff meets PoC success criteria
4. Approve next PoC phase (memory quality assessment)

---

**Document Status:** Draft for Captain review
**Author:** Agent #3 (Designer)
**Memory Sources:** Agent #1 (8 design memories) + Agent #2 (8 architectural proposals) + bootstrap (12 institutional memories)
**Output:** Figma-ready design brief for Node Editor
**PoC Task:** #2 of 2 (3-agent handoff validation)

---

**End of Design Brief**
