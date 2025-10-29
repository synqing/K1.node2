---
author: Claude Agent (ULTRATHINK Analysis)
date: 2025-10-29
status: published
intent: Comprehensive prompt for Figma Make agent to implement missing Phase C features in Node Graph Editor
---

# Figma Make Agent Prompt: Complete Phase C Node Editor Implementation

## Overview

You are tasked with designing and implementing missing UI components for the Phase C Node Graph Editor using Figma Make. The existing wireframe (11 components) provides 57% coverage of Phase C requirements. Your job is to **add 8 critical missing features** to reach 100% Phase C readiness.

**Current state**: React/Vite project with Radix UI, Tailwind CSS, Framer Motion
**Target**: Full Phase C feature completion with design tokens applied

---

## Part 1: Context & Current State

### Existing Components (Keep & Enhance)

You have 11 production-ready components in `/src/components/prism/`:

1. **Canvas.tsx** (4.6K) - Grid background, pan/zoom context
2. **NodeCard.tsx** (8.3K) - Standard node display
3. **NodeCardCutaway.tsx** (14K) - Node with metrics tab
4. **NodeCardAdvanced.tsx** (15K) - Advanced node with glass layers
5. **DraggableNode.tsx** (3.3K) - Grid-snappable drag wrapper
6. **Wire.tsx** (4.7K) - Bezier connection lines
7. **Port.tsx** (876B) - Port visuals
8. **ParameterPanel.tsx** (13K) - Parameter editor (LEFT SIDE)
9. **PreviewWindow.tsx** (7.4K) - LED preview (BOTTOM LEFT)
10. **CompilationPanel.tsx** (16K) - Validation panel (RIGHT SIDE)
11. **DesignSystemShowcase.tsx** (8.9K) - Component library

### Design System (Use Consistently)

**Colors**:
- Status green: `#22dd88`
- Status orange: `#f59e0b`
- Status red: `#ef4444`
- Status cyan: `#6ee7f3`
- Text primary: `#e6e9ef`
- Text secondary: `#b5bdca`
- Background dark: `#1c2130`
- Panel background: `#252d3f`

**Typography**:
- Titles: Bebas (14-16px)
- Labels: Rama (11-12px)
- Values: JetBrains (12-13px)

**Glass Effect**:
```css
backdropFilter: blur(30-40px);
backgroundColor: rgba(37, 45, 63, 0.7) to rgba(47, 56, 73, 0.85);
border: 1px solid rgba(255, 255, 255, 0.15-0.2);
boxShadow: inset gradients + outer shadows
```

**Spacing**: 4px unit (Tailwind: p-4, gap-2, etc.)

**Animations**: Framer Motion with custom easing `[0.68, -0.25, 0.265, 1.15]`

---

## Part 2: 8 Missing Features (Priority Order)

### Phase 1: Critical Features (P0 - Blocks Deployment)

#### Feature 1.1: Node Search & Discovery Palette

**What**: Searchable popup showing all available node types with quick-add

**Location**: Top toolbar (next to Design System toggle)

**UI Components Needed**:

1. **SearchInput.tsx** (new)
   - Appears in top-left toolbar
   - Placeholder: "Search nodes..."
   - Icon: magnifying glass (Lucide: Search)
   - Real-time filtering as user types
   - Shows match count: "3 matches"
   - Keyboard shortcut: `/` to focus (Slash command)
   - Clear button (X icon) when has text

2. **NodePalette.tsx** (new modal)
   - Triggered by: SearchInput or "Add Node" button
   - Layout:
     - Search input at top
     - Category tabs: "Audio Input", "Processing", "Color", "Output", "Favorites"
     - Node list below (scrollable)
   - Each node shows:
     - Icon (placeholder circle with node type)
     - Name (e.g., "BEAT DETECTOR")
     - Description (1 line, dimmed)
     - Cost indicator (Light/Heavy dot)
     - Data type badge (Scalar/Field/Color)
   - Interactions:
     - Click node → add to canvas at center
     - Drag node → add at drop location
     - Double-click → add and close palette
     - Hover → show tooltip with full description
   - Keyboard: Arrow keys to navigate, Enter to select
   - Dimensions: 400×600px modal, 320px node list column
   - Glass effect: Same as ParameterPanel (blur 30px, dark background)

3. **NodeRegistry.ts** (new data file)
   - JSON array of node definitions:
   ```typescript
   interface NodeDef {
     id: string;
     name: string;
     description: string;
     category: 'audio-input' | 'processing' | 'color' | 'output';
     cost: 'light' | 'heavy';
     outputType: 'scalar' | 'field' | 'color';
     inputPorts?: { type: 'scalar' | 'field' | 'color'; label?: string }[];
     outputPorts: { type: 'scalar' | 'field' | 'color'; label?: string }[];
     defaultParameters: Record<string, any>;
   }
   ```
   - Include 20+ node types (audio, processing, color, output variants)

**Design Reference**:
- Similar to VS Code command palette (Ctrl+P)
- Similar to Figma components panel
- Modal backdrop: semi-transparent dark
- List items: hover state raises slightly (scale 1.01), background lightens

**Figma Make Tasks**:
- [ ] Design SearchInput component (top toolbar integration)
- [ ] Design NodePalette modal layout
- [ ] Design node list items with hover/selected states
- [ ] Design category tabs styling
- [ ] Create 20+ node type icons/badges
- [ ] Implement search filtering logic
- [ ] Add keyboard shortcuts (/ to open, arrow keys to navigate)
- [ ] Test with fuzzy matching (fuse.js library)

---

#### Feature 1.2: Undo/Redo History Stack

**What**: History navigation with visual state tracking and keyboard shortcuts

**Location**: Top toolbar (left side, after Design System toggle)

**UI Components Needed**:

1. **UndoRedoButtons.tsx** (new)
   - Two buttons: undo (↶) and redo (↷)
   - Icons: Lucide's `RotateCcw` and `RotateCw`
   - Location: Top-left toolbar
   - States:
     - Enabled (opacity 1.0, cursor pointer) when history available
     - Disabled (opacity 0.5, cursor not-allowed) when at start/end
   - Styling: Glass button with hover state
   - Keyboard shortcuts:
     - Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) → Undo
     - Ctrl+Y or Ctrl+Shift+Z → Redo
   - Tooltip on hover: "Undo (Ctrl+Z)" / "Redo (Ctrl+Y)"
   - Animated on click: brief pulse/scale effect

2. **useHistory.ts** (new hook)
   - Manages history stack (max 50 states)
   - API:
     ```typescript
     interface HistoryState {
       nodePositions: Record<string, {x: number; y: number}>;
       wires: Array<{from: string; to: string}>;
       selectedNode?: string;
       timestamp: number;
     }

     function useHistory() {
       return {
         push(state: HistoryState): void;
         undo(): void;
         redo(): void;
         canUndo(): boolean;
         canRedo(): boolean;
         historyIndex(): number;
         maxHistory(): number;
       };
     }
     ```
   - Debounce history snapshots (500ms) to avoid spam
   - Clear redo stack when new action taken
   - Persist to sessionStorage for page refresh resilience

3. **HistoryVisualization.tsx** (optional timeline view)
   - Popup showing recent history (last 10 states)
   - Click item to jump to that state
   - Shows timestamps and brief descriptions ("Node moved", "Wire deleted", etc.)
   - Appears on Ctrl+H or via button click
   - Similar to: Git history or Figma version history

**Figma Make Tasks**:
- [ ] Design undo/redo buttons (top toolbar)
- [ ] Design undo/redo tooltip styling
- [ ] Design disabled state styling
- [ ] Implement keyboard shortcuts (Ctrl+Z, Ctrl+Y, etc.)
- [ ] Implement history stack data structure
- [ ] Implement state serialization/deserialization
- [ ] Add debouncing to prevent history spam
- [ ] Test with 50-state deep history
- [ ] Design history visualization popup (optional)

---

#### Feature 1.3: Import/Export Graph

**What**: Save and load node graph as JSON file with schema validation

**Location**: Top toolbar (right side before Compilation Panel)

**UI Components Needed**:

1. **ExportButton.tsx** (new)
   - Button: "Export" or icon (↓ or Save icon from Lucide)
   - Location: Top-right toolbar
   - On click:
     - Serialize graph to JSON
     - Download as `graph-{timestamp}.json`
     - Show toast notification: "Graph exported"
   - Tooltip: "Download graph (Ctrl+Shift+E)"
   - File format:
     ```json
     {
       "version": "1.0",
       "metadata": {
         "name": "My Audio Graph",
         "author": "User",
         "createdAt": "2025-10-29T15:30:00Z",
         "modifiedAt": "2025-10-29T15:35:00Z",
         "tags": ["audio", "reactive"]
       },
       "nodes": [
         {
           "id": "beat-1",
           "type": "beat-detector",
           "position": { "x": 120, "y": 80 },
           "parameters": { "smoothing": 0.8 }
         }
       ],
       "wires": [
         {
           "id": "wire-1",
           "from": "beat-1:output",
           "to": "color-mix-1:input"
         }
       ]
     }
     ```

2. **ImportButton.tsx** (new)
   - Button: "Import" or icon (↑ or Open icon from Lucide)
   - Location: Top-right toolbar, next to Export
   - On click: Open file picker (accept .json)
   - On file selected:
     - Validate JSON schema (Zod)
     - Show loading spinner
     - Restore graph state
     - Show toast: "Graph imported successfully"
     - Handle errors: Show error toast with details
   - Keyboard shortcut: Ctrl+Shift+I
   - Tooltip: "Load graph (Ctrl+Shift+I)"

3. **FileDialogWrapper.ts** (utility)
   - Handles file picker UI
   - Uses Clipboard API for copy/paste (optional)
   - Error handling for invalid files
   - API:
     ```typescript
     function openFilePicker(accept: string): Promise<File>;
     function downloadFile(data: any, filename: string): void;
     ```

4. **GraphSchema.ts** (Zod validation)
   - Define strict schema for graph JSON
   - Validate on import
   - Version migration if needed
   - API:
     ```typescript
     const GraphSchema = z.object({
       version: z.string(),
       metadata: z.object({...}),
       nodes: z.array(...),
       wires: z.array(...)
     });

     function validateGraph(data: unknown): GraphType;
     ```

**Figma Make Tasks**:
- [ ] Design Export button (toolbar integration)
- [ ] Design Import button (toolbar integration)
- [ ] Design file picker modal (native or custom)
- [ ] Design loading spinner for import
- [ ] Design success/error toast notifications
- [ ] Implement JSON schema (Zod)
- [ ] Implement file download logic
- [ ] Implement file upload & validation
- [ ] Add keyboard shortcuts (Ctrl+Shift+E, Ctrl+Shift+I)
- [ ] Test with valid/invalid JSON files

---

### Phase 2: Usability Features (P0/P1)

#### Feature 2.1: Keyboard Shortcuts Reference & Implementation

**What**: Complete keyboard shortcut system with reference modal

**Location**: Help menu (? key or Help button in toolbar)

**UI Components Needed**:

1. **ShortcutsModal.tsx** (new)
   - Triggered by: `?` key or Help button
   - Layout:
     - Title: "Keyboard Shortcuts"
     - Two columns: Windows/Linux | Mac
     - Categories: Navigation, Editing, Canvas, Selection
     - Each shortcut shows: Key(s) | Action
     - Search box to filter shortcuts
     - Dismissable by: Esc or X button
   - Styling: Glass modal, dark background, organized groups
   - Dimensions: 600×500px modal

2. **useKeyboardShortcuts.ts** (new hook)
   - Registers keyboard listeners
   - Shortcuts to implement:
     ```
     Navigation:
     - / or Ctrl+K      → Open node search
     - ? or Ctrl+/      → Show this help
     - Escape           → Deselect node
     - F                → Fit-to-view all nodes
     - Delete or Ctrl+D → Delete selected node/wire

     Editing:
     - Ctrl+C           → Copy selected node(s)
     - Ctrl+V           → Paste copied node(s)
     - Ctrl+D           → Duplicate selected node
     - Ctrl+A           → Select all nodes
     - Ctrl+Z           → Undo
     - Ctrl+Y           → Redo

     Canvas:
     - Ctrl+Scroll      → Zoom in/out
     - Middle-mouse     → Pan canvas
     - Spacebar+drag    → Pan canvas (alt method)
     - + / -            → Zoom in/out (keyboard)
     - 1                → Zoom 100% (fit)

     Selection:
     - Click            → Select node
     - Ctrl+Click       → Multi-select
     - Drag             → Select multiple nodes (marquee)
     - Click wire       → Select wire
     ```
   - Event listeners with preventDefault
   - Global scope (document-level)
   - Avoid conflicts with browser defaults

3. **CommandPalette.tsx** (new bonus feature)
   - Triggered by: Ctrl+Shift+P or Cmd+Shift+P
   - Shows commands: "Delete Node", "Add Node", "Export Graph", etc.
   - Searchable with fuzzy match
   - Similar to VS Code command palette
   - Optional but recommended

**Figma Make Tasks**:
- [ ] Design ShortcutsModal layout
- [ ] Design shortcut category styling
- [ ] Design Windows/Mac key icons
- [ ] Implement keyboard event listeners
- [ ] Register all 20+ shortcuts
- [ ] Implement shortcut conflict detection
- [ ] Add search/filter to shortcuts modal
- [ ] Design CommandPalette (optional)
- [ ] Test shortcuts on Windows/Mac browsers

---

#### Feature 2.2: Copy/Paste Nodes & Subgraphs

**What**: Duplicate nodes and connected subgraphs with smart positioning

**Location**: Context menu or keyboard shortcuts

**UI Components Needed**:

1. **ContextMenu.tsx** (new)
   - Right-click on node → show context menu
   - Options:
     - Copy (Ctrl+C)
     - Duplicate (Ctrl+D)
     - Delete (Delete key)
     - Rename (F2)
     - Properties (Alt+Enter)
   - Styling: Glass panel, dark background, subtle icons
   - Dismissible by: Click elsewhere or Esc

2. **useCopyPaste.ts** (new hook)
   - Clipboard management
   - API:
     ```typescript
     function copyNode(nodeId: string): void;
     function pasteNode(position?: {x, y}): void;
     function duplicateNode(nodeId: string): void;
     function canPaste(): boolean;
     ```
   - Copy stores node definition + connected edges
   - Paste creates new node(s) offset by 40px from original
   - Smart wiring: Re-connect pasted subgraph if source nodes exist
   - Generate unique IDs for pasted nodes

3. **NodeContextMenu** (radix-ui context menu)
   - Unstyled component from Radix
   - Apply glass styling from design system
   - Icons from Lucide React

**Figma Make Tasks**:
- [ ] Design context menu styling
- [ ] Design menu item hover states
- [ ] Implement copy/paste clipboard logic
- [ ] Implement node duplication with smart positioning
- [ ] Implement subgraph copying (preserve connections)
- [ ] Add right-click event handlers
- [ ] Test copy/paste with multiple nodes
- [ ] Test undo/redo integration with copy/paste

---

#### Feature 2.3: Enhanced Validation Details Panel

**What**: Expand CompilationPanel with error drill-down and node highlighting

**Location**: Right-side compilation panel (existing, enhance)

**UI Components Needed**:

1. **ErrorDetailPanel.tsx** (new)
   - Slides out from bottom of CompilationPanel when error selected
   - Shows:
     - Error code (e.g., "VAL-001")
     - Full error message
     - Affected node name (clickable → highlights on canvas)
     - Suggestion/remediation steps
     - Line number or port reference
   - Styling: Glass panel, animated slide-in

2. **ErrorFilter.tsx** (new)
   - Dropdown in CompilationPanel header
   - Filter errors by:
     - Type (validation, performance, warning, info)
     - Node (select from dropdown)
     - Severity (critical only, warning+)
   - Shows: "5 errors (2 critical, 3 warnings)"

3. **Update CompilationPanel.tsx**
   - Add error filtering logic
   - Add click handlers on errors (highlight node on canvas)
   - Add severity badges with colors:
     - Critical: #ef4444 (red)
     - Warning: #f59e0b (orange)
     - Info: #6ee7f3 (cyan)
   - Show remediation tips for common errors

**Figma Make Tasks**:
- [ ] Design ErrorDetailPanel slide-out
- [ ] Design error severity badges
- [ ] Design filter dropdown in CompilationPanel
- [ ] Implement error-to-node highlighting
- [ ] Add click handlers on errors
- [ ] Design remediation suggestion cards
- [ ] Implement error filtering logic
- [ ] Test with 10+ sample errors

---

### Phase 3: Polish & Enhancement (P1/P2)

#### Feature 3.1: Interactive Wire Creation UI

**What**: Draw connections by dragging from port to port with visual feedback

**Location**: Canvas area

**UI Components Needed**:

1. **useWireCreation.ts** (new hook)
   - Track dragging state: `{fromPort, toPort, isCreating}`
   - Detect port clicks and drag start
   - Draw ghost wire while dragging (preview)
   - Validate compatibility (scalar→scalar, field→field, color→color)
   - Create wire on drop if valid, cancel if invalid
   - Visual feedback:
     - Cursor changes to "grab" over ports
     - Ghost wire shows during drag (dashed, semi-transparent)
     - Valid targets highlight (glow)
     - Invalid targets show red (no-drop indicator)

2. **GhostWire.tsx** (new component)
   - SVG path following mouse cursor
   - Shows while dragging from port
   - Bezier curve from port to current mouse position
   - Styling: Dashed stroke, 50% opacity, subtle glow
   - Z-index: Below real wires but above nodes

3. **PortHotspots.tsx** (utility)
   - Calculate port positions relative to canvas
   - Detect hover over ports during drag
   - API:
     ```typescript
     function getPortPosition(nodeId: string, portType: 'input'|'output'): {x, y};
     function getPortAtPosition(x: number, y: number): {nodeId, portType} | null;
     ```

4. **WireValidation.ts** (utility)
   - Type compatibility checking
   - Prevent duplicate wires (same from/to)
   - Prevent cycles if DAG enforcement
   - API:
     ```typescript
     function canConnect(fromPort, toPort): boolean;
     function validateWireCreation(wire): {valid, reason};
     ```

**Figma Make Tasks**:
- [ ] Design ghost wire rendering (dashed line)
- [ ] Design port hover/highlight state
- [ ] Design invalid target state (red glow)
- [ ] Implement mouse event listeners (mousedown on port, mousemove, mouseup)
- [ ] Implement drag-to-create wire logic
- [ ] Implement Bezier path calculation for ghost wire
- [ ] Implement wire validation (type checking, duplicate prevention)
- [ ] Add visual feedback (cursor changes, port glows)
- [ ] Test wire creation with all port type combinations

---

#### Feature 3.2: Zoom & Pan Controls

**What**: Canvas navigation with mouse wheel zoom and pan

**Location**: Top toolbar & canvas

**UI Components Needed**:

1. **ZoomPanControls.tsx** (new toolbar group)
   - Buttons:
     - ZoomOut (-) button: Zoom to 90%
     - ZoomLevel display: "100%" (clickable to reset)
     - ZoomIn (+) button: Zoom to 110%
     - FitToView button: Fit all nodes on screen
   - Styling: Glass buttons in toolbar
   - Keyboard shortcuts:
     - Ctrl+Scroll wheel → Zoom
     - + / - keys → Zoom
     - 1 key → Reset zoom to 100%
     - F key → Fit to view

2. **useCanvasTransform.ts** (new hook)
   - State: `{scale: number, translateX: number, translateY: number}`
   - API:
     ```typescript
     function zoom(delta: number): void;          // delta = 0.1 for ±10%
     function pan(dx: number, dy: number): void;
     function fitToView(): void;
     function resetZoom(): void;
     function getTransform(): {scale, x, y};
     ```
   - Constraints:
     - Min zoom: 25%
     - Max zoom: 500%
     - Smooth animation (0.3s easing)

3. **PanHandler.ts** (utility)
   - Detect middle-mouse or spacebar+drag for panning
   - Mouse event handlers
   - Touch support (pinch-zoom on mobile, optional)

4. **Update Canvas.tsx**
   - Apply SVG viewBox transforms
   - Listen for mouse wheel (deltaY for zoom)
   - Listen for spacebar+drag (pan)
   - Listen for keyboard shortcuts (+, -, 1, F)

**Figma Make Tasks**:
- [ ] Design zoom/pan control button group
- [ ] Design zoom level display (100%)
- [ ] Design fit-to-view button (icon: frame or expand)
- [ ] Implement mouse wheel zoom listener
- [ ] Implement keyboard shortcuts (Ctrl+Scroll, +, -, 1, F)
- [ ] Implement SVG viewBox transform calculations
- [ ] Implement smooth zoom animation
- [ ] Implement pan with middle-mouse drag
- [ ] Implement pan with spacebar+drag
- [ ] Test zoom/pan constraints (min 25%, max 500%)

---

#### Feature 3.3: Onboarding & Empty State

**What**: Welcome modal and sample graph templates for new users

**Location**: Canvas center (modal)

**UI Components Needed**:

1. **WelcomeModal.tsx** (new)
   - Shows on first launch (no nodes in graph)
   - Content:
     - Title: "Welcome to Node Graph Editor"
     - Brief description (2-3 lines)
     - "Get Started" section with:
       - "Start from template" → TemplateSelector
       - "Upload existing graph" → ImportButton
       - "Create blank graph" → Close modal
     - Keyboard: Esc to dismiss, Enter for primary action
   - Styling: Large center modal with glass effect
   - Dismissible: "Don't show again" checkbox (localStorage)

2. **TemplateSelector.tsx** (new)
   - Show 4-6 sample graphs:
     - "Basic Audio Reactive" (beat → color)
     - "Spectrum Analyzer" (spectrum → palette → output)
     - "Complex 3-Source" (3 inputs → processing → output)
     - "Blank Canvas" (empty)
   - Each shows:
     - Thumbnail (simple diagram)
     - Name
     - Description (1 line)
     - Complexity indicator (beginner/intermediate/advanced)
   - Click to load template
   - Styling: Card grid layout

3. **EmptyStateCard.tsx** (new)
   - Shows when canvas is empty (after initial setup)
   - Content:
     - Large icon (grid/nodes icon from Lucide)
     - "Empty Canvas" heading
     - "Add your first node with / or Import a graph"
     - "View shortcuts: ?"
   - Fades in when no nodes, fades out when node added
   - Styling: Subtle, centered, non-intrusive

4. **TutorialTooltips.tsx** (optional)
   - Hover tooltips on toolbar buttons
   - First-time user only (localStorage flag)
   - Show on: Search button, Parameters panel, Compilation panel
   - Dismissible: Click X or "Don't show again"

**Sample Templates** (JSON files):
```
templates/
  ├── basic-audio-reactive.json
  ├── spectrum-analyzer.json
  ├── complex-3-source.json
  └── blank.json
```

**Figma Make Tasks**:
- [ ] Design WelcomeModal layout
- [ ] Design TemplateSelector card grid
- [ ] Design sample graph thumbnails (4-6)
- [ ] Design EmptyStateCard styling
- [ ] Design TutorialTooltips (optional)
- [ ] Create 4-6 sample template JSON files
- [ ] Implement modal trigger logic (first launch)
- [ ] Implement "don't show again" localStorage
- [ ] Implement template loading
- [ ] Design onboarding flow

---

### Phase 4: Polish & Testing (P2/P3)

#### Feature 4.1: Metadata Editor

**What**: Edit graph and node metadata (title, author, tags, comments)

**Location**: Side panel or modal

**UI Components Needed**:

1. **MetadataPanel.tsx** (new)
   - Appears in toolbar or as modal
   - Sections:
     - **Graph Metadata**:
       - Name (text input)
       - Author (text input)
       - Tags (comma-separated or tag chips)
       - Created/Modified dates (read-only)
       - Description (textarea)
     - **Node Metadata** (when node selected):
       - Node name (text input)
       - Comment/description (textarea)
       - Custom properties (key-value pairs, optional)
   - Styling: Glass panel, scrollable
   - Keyboard: Escape to close

2. **MetadataForm.tsx** (new)
   - React Hook Form wrapper
   - Fields:
     - Text inputs (name, author, tags)
     - Textarea (description, comment)
     - Date picker (if custom dates allowed)
   - Validation (Zod):
     - Name: 1-50 chars
     - Author: 1-50 chars
     - Tags: max 10 tags, 20 chars each
     - Description: max 500 chars

3. **Update CompilationPanel.tsx**
   - Add "Metadata" section or button
   - Show saved metadata (name, author, tags) read-only
   - Button to edit → open MetadataPanel

**Figma Make Tasks**:
- [ ] Design MetadataPanel layout
- [ ] Design graph metadata form
- [ ] Design node metadata form
- [ ] Design tag input with chips
- [ ] Design textarea with char counter
- [ ] Implement metadata storage in graph state
- [ ] Implement metadata export/import (JSON)
- [ ] Add metadata to export file
- [ ] Test with special characters in metadata

---

#### Feature 4.2: Light Mode Theme Toggle

**What**: Switch between dark and light themes

**Location**: Top-right toolbar

**UI Components Needed**:

1. **ThemeToggle.tsx** (new)
   - Button with sun/moon icon (Lucide)
   - Toggles theme: dark ↔ light
   - Location: Top-right toolbar (next to Design System button)
   - Tooltip: "Toggle theme (Ctrl+Shift+T)"
   - Keyboard: Ctrl+Shift+T
   - Persist to localStorage

2. **ThemeContext.tsx** (new context)
   - Provide theme state
   - API:
     ```typescript
     const {theme, setTheme} = useTheme();
     // theme: 'dark' | 'light'
     ```
   - Apply CSS class to root element
   - Next-themes library recommended

3. **Light Mode Color Palette**
   ```
   Text primary (dark): #1c2130
   Text secondary: #666666
   Background: #f5f5f5
   Panel background: #ffffff
   Border: rgba(0, 0, 0, 0.1)
   Status colors: same (#22dd88, #f59e0b, #ef4444)
   ```

4. **Update all components**
   - Replace hardcoded colors with theme-aware tokens
   - Example:
     ```typescript
     const textColor = theme === 'dark' ? '#e6e9ef' : '#1c2130';
     const bgColor = theme === 'dark' ? '#252d3f' : '#ffffff';
     ```

**Figma Make Tasks**:
- [ ] Design light mode color palette
- [ ] Design ThemeToggle button
- [ ] Implement ThemeContext with React Context API
- [ ] Refactor color tokens to support both themes
- [ ] Update all 11 existing components for theme support
- [ ] Implement localStorage persistence
- [ ] Test theme switching on all components
- [ ] Test light mode contrast (WCAG AA compliance)

---

## Part 3: Implementation Sequence & Checklist

### Phase 1: Foundation

**Priority**: P0 Critical - Blocks Phase C deployment

- [ ] **1.1 Node Search & Discovery**
  - [ ] SearchInput component
  - [ ] NodePalette modal
  - [ ] NodeRegistry data (20+ nodes)
  - [ ] Fuzzy search with fuse.js
  - [ ] Drag-to-add functionality
  - [ ] Keyboard: / to open, arrows to navigate

- [ ] **1.2 Undo/Redo History**
  - [ ] UndoRedoButtons component
  - [ ] useHistory hook with 50-state stack
  - [ ] State serialization
  - [ ] Keyboard: Ctrl+Z, Ctrl+Y
  - [ ] Optional: Timeline visualization

- [ ] **1.3 Import/Export**
  - [ ] ExportButton component
  - [ ] ImportButton component
  - [ ] GraphSchema.ts (Zod validation)
  - [ ] File picker logic
  - [ ] JSON serialization
  - [ ] Error handling & toasts

**Go/No-Go Gate**: All 3 features must be complete and tested before moving to Phase 2.

---

### Phase 2: Usability

**Priority**: P0/P1 - Required for good UX

- [ ] **2.1 Keyboard Shortcuts**
  - [ ] ShortcutsModal.tsx
  - [ ] useKeyboardShortcuts hook
  - [ ] 20+ shortcuts registered
  - [ ] CommandPalette (optional)
  - [ ] Windows/Mac key references
  - [ ] Conflict detection

- [ ] **2.2 Copy/Paste Nodes**
  - [ ] ContextMenu.tsx (right-click)
  - [ ] useCopyPaste hook
  - [ ] Node duplication with smart positioning
  - [ ] Subgraph copying (preserve edges)
  - [ ] Unique ID generation for copies
  - [ ] Keyboard: Ctrl+C, Ctrl+V, Ctrl+D

- [ ] **2.3 Enhanced Validation**
  - [ ] ErrorDetailPanel (slide-out)
  - [ ] ErrorFilter dropdown
  - [ ] Severity badges
  - [ ] Error-to-node highlighting
  - [ ] Remediation suggestions

**Go/No-Go Gate**: All 3 features must be complete and tested before moving to Phase 3.

---

### Phase 3: Enhancement

**Priority**: P1/P2 - Polish & nice-to-have

- [ ] **3.1 Interactive Wire Creation**
  - [ ] useWireCreation hook
  - [ ] GhostWire component
  - [ ] Port hotspot detection
  - [ ] Wire validation logic
  - [ ] Type compatibility checking
  - [ ] Visual feedback (port glows, red no-drop)

- [ ] **3.2 Zoom & Pan Controls**
  - [ ] ZoomPanControls toolbar group
  - [ ] useCanvasTransform hook
  - [ ] SVG viewBox transforms
  - [ ] Mouse wheel zoom (Ctrl+Scroll)
  - [ ] Middle-mouse pan
  - [ ] Keyboard: +, -, 1, F
  - [ ] Constraints: 25%-500% zoom

- [ ] **3.3 Onboarding & Empty State**
  - [ ] WelcomeModal (first launch)
  - [ ] TemplateSelector (4-6 templates)
  - [ ] EmptyStateCard (when no nodes)
  - [ ] TutorialTooltips (optional)
  - [ ] 4-6 sample template JSON files
  - [ ] localStorage "don't show again"

**Go/No-Go Gate**: All 3 features must be complete and tested before moving to Phase 4.

---

### Phase 4: Refinement

**Priority**: P2/P3 - Final polish

- [ ] **4.1 Metadata Editor**
  - [ ] MetadataPanel component
  - [ ] Graph metadata form (name, author, tags)
  - [ ] Node metadata form (comment)
  - [ ] Zod validation
  - [ ] Storage in graph state
  - [ ] Export/import metadata in JSON

- [ ] **4.2 Light Mode Theme**
  - [ ] ThemeToggle button
  - [ ] ThemeContext (React Context)
  - [ ] Light mode color palette
  - [ ] Refactor all colors to theme-aware tokens
  - [ ] Update all 11 existing components
  - [ ] localStorage persistence
  - [ ] WCAG AA contrast testing

- [ ] **4.3 Testing & Accessibility**
  - [ ] React DevTools Profiler (60 FPS with 50+ nodes)
  - [ ] axe DevTools accessibility audit (WCAG 2.1 AA)
  - [ ] Keyboard-only navigation test
  - [ ] Screen reader test (VoiceOver/NVDA)
  - [ ] Responsive design test (1920×1080, 2560×1440, 4K)
  - [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile/tablet responsiveness (optional)

**Go/No-Go Gate**: Phase C deployment approved when all tests pass.

---

## Part 4: Technical Specifications

### Dependencies to Add

```json
{
  "fuse.js": "^7.0.0",           // Fuzzy search
  "zod": "^3.22.0",              // Schema validation
  "next-themes": "^0.4.6",       // Theme switching (already in package.json)
  "react-hook-form": "^7.55.0",  // Form handling (already in package.json)
  "zustand": "^4.4.0"            // Optional: lightweight state management
}
```

### File Structure

```
src/components/prism/
  ├── Canvas.tsx (existing)
  ├── NodeCard.tsx (existing)
  ├── NodeCardCutaway.tsx (existing)
  ├── NodeCardAdvanced.tsx (existing)
  ├── DraggableNode.tsx (existing)
  ├── Wire.tsx (existing)
  ├── Port.tsx (existing)
  ├── ParameterPanel.tsx (existing)
  ├── PreviewWindow.tsx (existing)
  ├── CompilationPanel.tsx (existing)
  ├── DesignSystemShowcase.tsx (existing)
  # NEW PHASE 1
  ├── SearchInput.tsx (new)
  ├── NodePalette.tsx (new)
  ├── UndoRedoButtons.tsx (new)
  ├── ExportButton.tsx (new)
  ├── ImportButton.tsx (new)
  # NEW PHASE 2
  ├── ShortcutsModal.tsx (new)
  ├── ContextMenu.tsx (new)
  ├── ErrorDetailPanel.tsx (new)
  ├── ErrorFilter.tsx (new)
  # NEW PHASE 3
  ├── GhostWire.tsx (new)
  ├── ZoomPanControls.tsx (new)
  ├── WelcomeModal.tsx (new)
  ├── TemplateSelector.tsx (new)
  ├── EmptyStateCard.tsx (new)
  # NEW PHASE 4
  ├── MetadataPanel.tsx (new)
  ├── MetadataForm.tsx (new)
  ├── ThemeToggle.tsx (new)
  └── TutorialTooltips.tsx (optional)

src/hooks/
  ├── useHistory.ts (new)
  ├── useKeyboardShortcuts.ts (new)
  ├── useCopyPaste.ts (new)
  ├── useWireCreation.ts (new)
  ├── useCanvasTransform.ts (new)
  ├── useTheme.ts (new)
  └── ...

src/data/
  ├── NodeRegistry.ts (new)
  ├── GraphSchema.ts (new)
  └── ...

src/utils/
  ├── FileDialog.ts (new)
  ├── PortHotspots.ts (new)
  ├── WireValidation.ts (new)
  ├── PanHandler.ts (new)
  └── ...

public/templates/
  ├── basic-audio-reactive.json
  ├── spectrum-analyzer.json
  ├── complex-3-source.json
  └── blank.json
```

### Design Token Registry

**Colors** (Figma Make should export as CSS variables):
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

**Glass Effect** (CSS mixin):
```css
.glass {
  background-color: rgba(37, 45, 63, 0.7);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.25),
    0 32px 64px rgba(0, 0, 0, 0.35),
    inset 0 1px 2px rgba(255, 255, 255, 0.12);
}
```

---

## Part 5: Testing Checklist

### Unit Tests (Vitest)

- [ ] SearchInput fuzzy matching
- [ ] NodeRegistry data structure
- [ ] undo/redo state transitions
- [ ] Graph JSON serialization/deserialization
- [ ] Wire type validation
- [ ] Keyboard shortcut parsing
- [ ] Copy/paste node duplication
- [ ] Zoom transform calculations

### Integration Tests (Vitest + RTL)

- [ ] Node search → add to canvas → appears in compilation panel
- [ ] Undo node delete → node reappears
- [ ] Export → import → same graph restored
- [ ] Keyboard shortcut Ctrl+Z works
- [ ] Copy node → paste → new node appears offset
- [ ] Drag from port A → port B → wire created (if valid types)
- [ ] Zoom in 50% → all nodes scale proportionally
- [ ] Import invalid JSON → shows error toast

### E2E Tests (Playwright)

- [ ] Full workflow: search → add 3 nodes → draw 2 wires → export → import
- [ ] Navigation: / → search → select node → see in canvas
- [ ] Undo/redo workflow: add node → undo → redo → node returns
- [ ] Copy/paste workflow: copy node → paste 3x → 4 total nodes
- [ ] Keyboard-only navigation: navigate canvas with arrows, add nodes with /
- [ ] Zoom/pan: zoom to 50%, pan to corner, zoom back to 100%

### Accessibility Tests (axe DevTools)

- [ ] WCAG 2.1 AA compliance (85+% pass rate)
- [ ] Color contrast ≥ 4.5:1 for text on colored backgrounds
- [ ] Keyboard navigation all components (Tab, Shift+Tab, Enter, Escape)
- [ ] Screen reader announces: node names, error counts, button functions
- [ ] Focus indicators visible on all interactive elements

### Performance Tests (React DevTools Profiler)

- [ ] 60 FPS with 50 nodes, 100 wires
- [ ] <100ms render time for node addition
- [ ] <50ms for pan/zoom operations
- [ ] Memory usage <50MB

---

## Part 6: Deliverables

### Figma Design File

Create in Figma Make or export from existing Figma:

1. **Component Library**
   - SearchInput (variants: default, focused, with results, with no results)
   - NodePalette modal (category tabs, node items, search)
   - UndoRedoButtons (variants: enabled, disabled)
   - ExportButton, ImportButton
   - ShortcutsModal (categories layout)
   - ContextMenu (items layout)
   - ErrorDetailPanel (slide-out states)
   - ZoomPanControls (button group)
   - WelcomeModal (template selector)
   - MetadataPanel (form layout)
   - ThemeToggle (dark/light states)

2. **Screens** (High-fidelity mockups)
   - Full editor with search open
   - Full editor with undo/redo and import/export
   - Full editor with context menu open
   - Full editor with shortcuts modal
   - Full editor with zoom/pan controls
   - Empty state with welcome modal
   - Light mode theme

### React Implementation

1. **8 new feature groups** (50+ new components/hooks)
2. **Updated App.tsx** (integrate all new features)
3. **Updated CompilationPanel.tsx** (add error detail, filtering)
4. **Updated Canvas.tsx** (add wire creation, zoom/pan)
5. **All existing components** updated for light mode theme
6. **Tests** (unit, integration, E2E, accessibility)
7. **Documentation** (README for each feature, setup guide)

### Documentation

1. **IMPLEMENTATION.md** - Step-by-step implementation guide
2. **ARCHITECTURE.md** - System design, data flow, state management
3. **API_REFERENCE.md** - All hooks and utilities API
4. **ACCESSIBILITY.md** - WCAG compliance checklist
5. **PERFORMANCE.md** - Optimization tips, profiling results

---

## Part 7: Success Criteria

### Phase C Deployment Gate

**All of the following must be TRUE**:

1. ✅ All 8 features implemented and tested
2. ✅ 0 TypeScript strict mode errors
3. ✅ 60 FPS maintained with 50+ nodes (React Profiler)
4. ✅ WCAG 2.1 AA compliance (axe audit: 85%+ pass)
5. ✅ 95%+ test coverage (unit + integration + E2E)
6. ✅ All 20+ keyboard shortcuts working
7. ✅ Import/export cycle verified (export → import → same state)
8. ✅ Undo/redo with 50-state history verified
9. ✅ Light & dark mode both tested
10. ✅ No console errors or warnings in production build
11. ✅ All 11 existing components render without regression
12. ✅ Design tokens applied consistently across all new components

**Phase C Status**: 100% Feature Complete ✅

---

## Conclusion

This prompt provides **detailed specifications** for implementing all missing Phase C features. The Figma Make agent should:

1. **Design** each component in Figma (visual mockups)
2. **Implement** in React (production-ready code)
3. **Test** thoroughly (unit, integration, E2E, accessibility)
4. **Document** comprehensively (README, API, architecture)

**Team**: 1-2 frontend engineers + 1 designer (or Figma Make agent for both)

**Next step**: Hand off to Figma Make agent with this prompt + Figma file link.

---

*This prompt was generated by ULTRATHINK analysis. See `PHASE_C_WIREFRAME_ALIGNMENT_ANALYSIS.md` for full context.*
