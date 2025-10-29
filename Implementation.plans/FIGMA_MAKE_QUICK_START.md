---
author: Claude Agent
date: 2025-10-29
status: published
intent: Quick start guide for Figma Make agent to implement Phase C Node Editor features
---

# Figma Make Agent Quick Start Guide

## TL;DR: What You're Building

Implement **8 missing features** for the Phase C Node Graph Editor to reach 100% feature completeness.

**Current Status**: 57% complete (13.5/24 subsections)
**Target**: 100% complete (all 24 subsections)
**Effort**: 4 weeks (1 week per phase)
**Framework**: React 18 + Vite + Radix UI + Tailwind + Framer Motion

---

## Your Mission: 4-Week Implementation Sprint

### Phase 1 (Week 1): Critical Features - P0 Blocker
- [ ] **1.1 Node Search & Discovery** - Find and add nodes to canvas
- [ ] **1.2 Undo/Redo History** - Recover from mistakes
- [ ] **1.3 Import/Export** - Save/load graphs

**Gate**: All 3 complete before Week 2

### Phase 2 (Week 2): Usability Features - P0/P1
- [ ] **2.1 Keyboard Shortcuts** - Power-user navigation
- [ ] **2.2 Copy/Paste Nodes** - Duplicate nodes/subgraphs
- [ ] **2.3 Enhanced Validation** - Better error details

**Gate**: All 3 complete before Week 3

### Phase 3 (Week 3): Enhancement - P1/P2
- [ ] **3.1 Interactive Wire Creation** - Draw connections by dragging
- [ ] **3.2 Zoom & Pan** - Canvas navigation
- [ ] **3.3 Onboarding** - Welcome modal + templates

**Gate**: All 3 complete before Week 4

### Phase 4 (Week 4): Polish - P2/P3
- [ ] **4.1 Metadata Editor** - Edit graph/node metadata
- [ ] **4.2 Light Mode Theme** - Dark/light toggle
- [ ] **4.3 Testing & Accessibility** - Full test suite + WCAG AA

**Gate**: All gates passed = Phase C deployment approved ✅

---

## Quick Links & References

**Full Specification**: `Implementation.plans/FIGMA_MAKE_AGENT_PROMPT.md`
**Alignment Analysis**: `docs/reports/PHASE_C_WIREFRAME_ALIGNMENT_ANALYSIS.md`
**Executive Brief**: `docs/reports/PHASE_C_ALIGNMENT_EXECUTIVE_BRIEF.md`

**Existing Components**: `src/components/prism/`
- Canvas.tsx, NodeCard variants, Wire.tsx, Port.tsx
- ParameterPanel.tsx, PreviewWindow.tsx, CompilationPanel.tsx

**Design System**: See Part 1 of FIGMA_MAKE_AGENT_PROMPT.md
- Colors, typography, glass effect, spacing, animations

---

## Getting Started (Immediate Steps)

### Step 1: Review Existing Codebase
```bash
cd Implementation.plans/Node\ Graph\ Editor\ Design_v5
npm install
npm run dev
```

Open `http://localhost:5173` to see:
- 9 hardcoded nodes with 8 wires
- Draggable canvas with grid snapping
- LED preview (144×1)
- Compilation panel (right side)
- Design system showcase
- Parameter panel (left side) when node selected

### Step 2: Read Full Specification
Open: `FIGMA_MAKE_AGENT_PROMPT.md` (this repository)
- Part 1: Context & Design System
- Part 2: 8 missing features (detailed specs)
- Part 3: Implementation sequence
- Part 4: Technical specs (dependencies, file structure)
- Part 5: Testing checklist
- Part 6: Deliverables

### Step 3: Check Design Tokens
Review `src/components/prism/DesignSystemShowcase.tsx`
- Font families: Bebas, Rama, JetBrains
- Color palette: status colors, text colors, backgrounds
- Glass effect: blur(30-40px) + backdrop-filter
- Animation easing: `[0.68, -0.25, 0.265, 1.15]`

### Step 4: Open Figma File
Figma project: https://www.figma.com/design/p1ogkU52Eqa336R7rNfcz1/Node-Graph-Editor-Design

(Or ask for Figma IDs if needed)

---

## Week 1: Critical Features

### Feature 1.1: Node Search & Discovery

**Components to Create**:
1. SearchInput.tsx
   - Top-left toolbar
   - Placeholder "Search nodes..."
   - "/" keyboard shortcut to focus
   - Real-time filtering

2. NodePalette.tsx
   - Modal with search results
   - Category tabs (Audio Input, Processing, Color, Output)
   - Each item shows: name, description, cost, output type
   - Drag-to-add or click-to-add to canvas

3. NodeRegistry.ts
   - Array of 20+ node definitions
   - Each: {id, name, description, category, cost, ports, parameters}

**Testing**:
- [ ] Search "beat" → shows BEAT DETECTOR
- [ ] Search "color" → shows COLOR MIX, PALETTE
- [ ] "/" key opens search input
- [ ] Drag node → adds to canvas at drop position
- [ ] Click node → adds to canvas center

**Keyboard Shortcuts**:
- `/` - Open search
- Arrow Up/Down - Navigate results
- Enter - Add selected node
- Escape - Close palette

---

### Feature 1.2: Undo/Redo History

**Components to Create**:
1. UndoRedoButtons.tsx
   - Two buttons in top toolbar (↶ and ↷)
   - Disabled when no history
   - Show tooltip: "Undo (Ctrl+Z)" / "Redo (Ctrl+Y)"

2. useHistory.ts hook
   - Manage state stack (max 50)
   - API: push(state), undo(), redo(), canUndo(), canRedo()
   - Debounce snapshots (500ms)
   - Persist to sessionStorage

**Testing**:
- [ ] Add node → Undo → node disappears
- [ ] Undo → Redo → node reappears
- [ ] 10 edits → Undo 5x → Redo 3x → state correct
- [ ] Ctrl+Z works
- [ ] Ctrl+Y works
- [ ] Page reload → undo/redo history survives (sessionStorage)

---

### Feature 1.3: Import/Export

**Components to Create**:
1. ExportButton.tsx
   - Button in top-right toolbar
   - Click → downloads graph-{timestamp}.json
   - Show toast: "Graph exported"
   - Shortcut: Ctrl+Shift+E

2. ImportButton.tsx
   - Button in top-right toolbar
   - Click → file picker
   - Load JSON → validate schema → restore state
   - Show toast: success or error
   - Shortcut: Ctrl+Shift+I

3. GraphSchema.ts
   - Zod validation schema
   - Validate on import
   - Format includes: metadata, nodes, wires

**Testing**:
- [ ] Export → file downloads as JSON
- [ ] Import valid JSON → graph restored
- [ ] Import invalid JSON → error toast
- [ ] Export → Import → same state (round-trip)
- [ ] Ctrl+Shift+E triggers export
- [ ] Ctrl+Shift+I triggers import

---

## Week 2: Usability Features

### Feature 2.1: Keyboard Shortcuts

**Components to Create**:
1. ShortcutsModal.tsx
   - Modal showing all shortcuts
   - Two columns: Windows/Linux | Mac
   - Categories: Navigation, Editing, Canvas, Selection
   - Triggered by: `?` key or Help button
   - Search box to filter

2. useKeyboardShortcuts.ts
   - Register 20+ shortcuts:
     - `/` or `Ctrl+K` → Search
     - `?` or `Ctrl+/` → Help
     - `Escape` → Deselect
     - `F` → Fit to view
     - `Delete` or `Ctrl+D` → Delete selected
     - `Ctrl+C` → Copy
     - `Ctrl+V` → Paste
     - `Ctrl+A` → Select all
     - `Ctrl+Z` → Undo
     - `Ctrl+Y` → Redo
     - `Ctrl+Scroll` → Zoom
     - `Ctrl+Shift+E` → Export
     - `Ctrl+Shift+I` → Import
     - `Ctrl+Shift+T` → Toggle theme
   - Avoid browser defaults

**Testing**:
- [ ] `?` opens ShortcutsModal
- [ ] All shortcuts listed in modal
- [ ] Ctrl+Z works (undo)
- [ ] Ctrl+C works (copy)
- [ ] Escape deselects node

---

### Feature 2.2: Copy/Paste Nodes

**Components to Create**:
1. ContextMenu.tsx
   - Right-click on node → show menu
   - Options: Copy, Duplicate, Delete, Rename, Properties
   - Glass styling

2. useCopyPaste.ts
   - copyNode(nodeId) → clipboard
   - pasteNode(position) → creates new node
   - duplicateNode(nodeId) → creates at offset position
   - Copy preserves edges
   - Paste re-connects if source nodes exist

**Testing**:
- [ ] Right-click node → context menu appears
- [ ] Copy → Paste → new node appears offset
- [ ] Copy 2-node subgraph with edge → Paste → edge preserved
- [ ] Ctrl+C works (copy)
- [ ] Ctrl+V works (paste)
- [ ] Ctrl+D works (duplicate)

---

### Feature 2.3: Enhanced Validation

**Update CompilationPanel.tsx**:
1. Add ErrorDetailPanel.tsx
   - Slide-out showing selected error details
   - Error code, message, affected node, suggestion

2. Add ErrorFilter.tsx
   - Filter by: type, node, severity
   - Shows count: "5 errors (2 critical, 3 warnings)"

3. Add error-to-node highlighting
   - Click error → highlights node on canvas
   - Severity badges: red (critical), orange (warning), cyan (info)

**Testing**:
- [ ] Click error → node highlights on canvas
- [ ] Filter errors by severity
- [ ] Error details show remediation tips

---

## Week 3: Enhancement

### Feature 3.1: Interactive Wire Creation

**Components to Create**:
1. useWireCreation.ts
   - Track dragging state
   - Detect port clicks
   - Validate compatibility (scalar→scalar, etc.)
   - Create wire on drop

2. GhostWire.tsx
   - Dashed line following cursor during drag
   - Shows while dragging from port
   - Bezier curve

3. PortHotspots.ts
   - Calculate port positions
   - Detect hover during drag

**Testing**:
- [ ] Drag from output port → ghost wire follows cursor
- [ ] Hover invalid target → red glow (no-drop)
- [ ] Hover valid target → green glow (drop here)
- [ ] Drop on valid target → wire created
- [ ] Drop on invalid target → cancel
- [ ] Type validation: scalar→scalar works, scalar→field fails

---

### Feature 3.2: Zoom & Pan

**Components to Create**:
1. ZoomPanControls.tsx
   - Buttons: -, 100%, +, Fit
   - Top toolbar
   - Keyboard: +, -, 1, F

2. useCanvasTransform.ts
   - State: {scale, translateX, translateY}
   - zoom(delta), pan(dx, dy), fitToView(), resetZoom()
   - Constraints: 25%-500% zoom
   - Smooth animation

**Testing**:
- [ ] Ctrl+Scroll → zoom in/out
- [ ] Middle-mouse drag → pan
- [ ] Spacebar+drag → pan
- [ ] Click "+" → zoom 110%
- [ ] Click "100%" → reset to 100%
- [ ] Click fit → all nodes visible
- [ ] Zoom stays between 25%-500%

---

### Feature 3.3: Onboarding

**Components to Create**:
1. WelcomeModal.tsx
   - Shows on first launch
   - "Get Started" section
   - "Don't show again" checkbox

2. TemplateSelector.tsx
   - 4-6 sample templates
   - Each shows thumbnail, name, complexity
   - Click to load template

3. EmptyStateCard.tsx
   - Shows when canvas empty
   - "Add your first node with / or Import a graph"
   - Large icon

**Sample Templates**:
- basic-audio-reactive.json (beat → color)
- spectrum-analyzer.json (spectrum → palette → output)
- complex-3-source.json (3 inputs + processing)
- blank.json (empty)

**Testing**:
- [ ] First launch → WelcomeModal appears
- [ ] Click "Start from template" → TemplateSelector
- [ ] Click template → graph loads
- [ ] "Don't show again" → prevents reappearing
- [ ] New canvas → EmptyStateCard shows
- [ ] Add first node → EmptyStateCard fades

---

## Week 4: Polish

### Feature 4.1: Metadata Editor

**Components to Create**:
1. MetadataPanel.tsx
   - Edit graph metadata: name, author, tags, description
   - Edit node metadata: comment, custom properties
   - Validation with Zod

**Testing**:
- [ ] Edit graph name → saved in state
- [ ] Edit node comment → appears in node metadata
- [ ] Export includes metadata
- [ ] Import restores metadata

---

### Feature 4.2: Light Mode Theme

**Components to Create**:
1. ThemeToggle.tsx
   - Button in top-right toolbar
   - Sun/moon icon
   - Keyboard: Ctrl+Shift+T

2. ThemeContext.tsx
   - Provide theme state (dark/light)
   - Persist to localStorage

**Color Palette (Light)**:
- Text primary: #1c2130
- Background: #f5f5f5
- Panel: #ffffff
- Border: rgba(0, 0, 0, 0.1)

**Update All Components**:
- Replace hardcoded colors with theme-aware tokens
- Test contrast (WCAG AA: 4.5:1 minimum)

**Testing**:
- [ ] Click toggle → theme switches
- [ ] Reload page → theme persists
- [ ] Light mode contrast ≥ 4.5:1
- [ ] All components readable in both modes

---

### Feature 4.3: Testing & Accessibility

**Test Suite**:
- [ ] Unit tests (Vitest): search, undo/redo, serialization
- [ ] Integration tests (Vitest + RTL): workflows
- [ ] E2E tests (Playwright): full user scenarios
- [ ] Accessibility (axe): WCAG 2.1 AA (85%+ pass)
- [ ] Performance (React Profiler): 60 FPS with 50+ nodes
- [ ] Browser compatibility: Chrome, Firefox, Safari, Edge

**Gate**: 100% Phase C deployment approved when all tests pass ✅

---

## File Structure to Create

```
src/components/prism/
  ├── SearchInput.tsx
  ├── NodePalette.tsx
  ├── UndoRedoButtons.tsx
  ├── ExportButton.tsx
  ├── ImportButton.tsx
  ├── ShortcutsModal.tsx
  ├── ContextMenu.tsx
  ├── ErrorDetailPanel.tsx
  ├── ErrorFilter.tsx
  ├── GhostWire.tsx
  ├── ZoomPanControls.tsx
  ├── WelcomeModal.tsx
  ├── TemplateSelector.tsx
  ├── EmptyStateCard.tsx
  ├── MetadataPanel.tsx
  ├── MetadataForm.tsx
  ├── ThemeToggle.tsx
  └── TutorialTooltips.tsx

src/hooks/
  ├── useHistory.ts
  ├── useKeyboardShortcuts.ts
  ├── useCopyPaste.ts
  ├── useWireCreation.ts
  ├── useCanvasTransform.ts
  └── useTheme.ts

src/data/
  ├── NodeRegistry.ts
  └── GraphSchema.ts

src/utils/
  ├── FileDialog.ts
  ├── PortHotspots.ts
  ├── WireValidation.ts
  └── PanHandler.ts

public/templates/
  ├── basic-audio-reactive.json
  ├── spectrum-analyzer.json
  ├── complex-3-source.json
  └── blank.json
```

---

## Dependencies to Add

```bash
npm install fuse.js zod zustand
```

Already in package.json:
- next-themes
- react-hook-form
- Radix UI components
- Framer Motion
- Lucide React

---

## Design System Constants

Use consistently across all new components:

**Colors** (CSS variables recommended):
```css
--color-status-pass: #22dd88;
--color-status-warn: #f59e0b;
--color-status-error: #ef4444;
--color-status-idle: #6ee7f3;
--color-text-primary: #e6e9ef;
--color-text-secondary: #b5bdca;
--color-bg-dark: #1c2130;
--color-bg-panel: #252d3f;
--color-border: rgba(255, 255, 255, 0.15);
```

**Glass Effect**:
```css
.glass {
  background-color: rgba(37, 45, 63, 0.7);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25), 0 32px 64px rgba(0, 0, 0, 0.35);
}
```

**Typography**:
- Bebas: titles, headings (14-16px)
- Rama: labels, descriptions (11-12px)
- JetBrains: values, code (12-13px)

**Animation Easing**:
```typescript
ease: [0.68, -0.25, 0.265, 1.15]  // Sharp ease-out
```

---

## Success Criteria (Go/No-Go Gates)

### Week 1 Gate (Must Pass Before Week 2)
- ✅ Search finds nodes
- ✅ Adding node works (click or drag)
- ✅ Undo/redo buttons visible and functional
- ✅ Ctrl+Z / Ctrl+Y work
- ✅ Export downloads JSON
- ✅ Import loads JSON
- ✅ Round-trip export → import works

### Week 2 Gate (Must Pass Before Week 3)
- ✅ Shortcuts modal shows 20+ shortcuts
- ✅ All keyboard shortcuts work (at least 10 critical ones)
- ✅ Copy/paste works
- ✅ Undo/redo still work
- ✅ Error details show when error clicked
- ✅ Error filtering works

### Week 3 Gate (Must Pass Before Week 4)
- ✅ Wire creation by dragging works
- ✅ Type validation prevents invalid connections
- ✅ Zoom controls work (min 25%, max 500%)
- ✅ Pan works (middle-mouse, spacebar+drag, or buttons)
- ✅ Welcome modal shows on first launch
- ✅ Template loading works
- ✅ Empty state card shows/hides correctly

### Week 4 Gate (Final Phase C Deployment Approval)
- ✅ Metadata editor saves/loads
- ✅ Light mode toggle works
- ✅ All components render in light mode
- ✅ Light mode contrast ≥ 4.5:1 (WCAG AA)
- ✅ 60 FPS with 50+ nodes (React Profiler)
- ✅ 0 TypeScript errors
- ✅ 95%+ test coverage
- ✅ WCAG 2.1 AA compliance (85%+ pass)
- ✅ All 11 existing components still work

**Final Status**: Phase C = 100% Complete ✅

---

## Getting Help

**Questions about spec?** → Read `FIGMA_MAKE_AGENT_PROMPT.md` (full details)

**Questions about gaps?** → Read `docs/reports/PHASE_C_WIREFRAME_ALIGNMENT_ANALYSIS.md`

**Questions about current code?** → Examine `src/components/prism/` (11 existing components)

**Need to run tests?** → `npm run test` (setup needed)

**Need to build?** → `npm run build`

---

## Start Building! 🚀

You have all the specs, design system, and context you need.

**First task**:
1. Review existing components (15 min)
2. Read full FIGMA_MAKE_AGENT_PROMPT.md (30 min)
3. Create Feature 1.1: SearchInput.tsx (2-3 hours)
4. Create Feature 1.1: NodePalette.tsx (2-3 hours)
5. Create Feature 1.1: NodeRegistry.ts (1 hour)
6. Test and verify (1 hour)

Target: Complete all Week 1 features by end of week.

**Good luck!** 💪
