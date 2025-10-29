# Phase C: Visual Node Graph Editor - Complete Specification

**Author**: Claude Code Agent
**Date**: 2025-10-27
**Status**: Design Specification (Ready for Implementation)
**Intent**: Comprehensive technical specification for Phase C Node Graph Editor implementation
**Version**: 1.0

---

## Executive Summary

Phase C introduces a **visual node graph editor** that enables real-time pattern design without device upload. This document provides complete architectural specification, component hierarchy, implementation roadmap, and validation strategy.

**Key Objectives**:
- ✅ Enable visual pattern creation with drag-and-drop interface
- ✅ Real-time preview without firmware compilation
- ✅ Maintain K1's philosophy: intentionality, minimalism, zero compromise
- ✅ Support all 16 Phase B node types
- ✅ Pattern export/import with validation
- ✅ Educational value: visual clarity of node graph concepts

**Success Criteria**:
- Functional node editor with all Phase B node types
- Real-time pattern validation
- Preview system running at 30+ FPS
- Pattern save/load/export functionality
- Complete documentation and tutorials
- <2,000 additional lines of code (total web app remains <50KB)

---

## Part 1: Architecture & Design Philosophy

### 1.1 Core Principles for Node Editor

The node editor must honor K1's core philosophy:

**1. Intentionality Over Convenience**
- Every UI element must serve a purpose
- No decorative features
- Visual clarity supports intentional design
- Users make conscious choices, not stumble into results

**2. Separation of Concerns**
- Editor: Visual representation & user input
- Compiler: Node graph validation & C++ generation
- Preview: Real-time visualization (no device upload)
- Clear boundaries between layers

**3. Minimalism**
- Single-canvas editor (not tabs/panels)
- Essential controls only
- Keyboard shortcuts for power users
- Nodes communicate visually, not with verbose tooltips

**4. Educational**
- Visual representation teaches graph structure
- Clear data flow (wires show signal flow)
- Error messages explain why design failed
- Pattern metadata guides intentional choices

### 1.2 Design System Constraints

**Canvas & Rendering**:
- Use WebGL/Canvas 2D (not heavy libs like Three.js)
- Grid-based snapping for alignment
- Zoom/pan for large graphs (but keep graphs small intentionally)
- Real-time rendering without stuttering

**Node Visual Language**:
- **Shape**: Rectangle with rounded corners (64x48px base)
- **Color**: By node type (6 categories - geometric, color, motion, composition, input, output)
- **Ports**: Input ports (left), output ports (right)
- **Labels**: Node ID (top), type (center), parameters (bottom)
- **Connections**: Bezier curves showing data flow

**Interaction Model**:
- **Drag to canvas**: Add node from palette
- **Click+drag from port**: Create wire
- **Right-click node**: Context menu (delete, duplicate, edit parameters)
- **Double-click parameter**: Edit value with modal
- **Ctrl+Z/Cmd+Z**: Undo
- **Ctrl+S/Cmd+S**: Save pattern
- **Ctrl+Shift+Export**: Export as JSON

---

## Part 2: Component Architecture

### 2.1 High-Level Component Hierarchy

```
App (K1ControlApp)
├── NodeEditorProvider
│   ├── GraphState (current graph, undo/redo stack)
│   ├── ValidationState (error messages, type info)
│   └── PreviewState (preview canvas, FPS metrics)
│
└── NodeEditorLayout
    ├── Header
    │   ├── PatternMetadata (name, description, author)
    │   ├── Actions (New, Open, Save, Export)
    │   └── ZoomControls (fit, 100%, zoom in/out)
    │
    ├── Canvas
    │   ├── GridBackground
    │   ├── NodesLayer (SVG/Canvas rendering)
    │   │   ├── Node (each node: type, id, parameters)
    │   │   ├── NodePort (input/output ports)
    │   │   └── NodeLabel (text rendering)
    │   │
    │   ├── WiresLayer (connection lines)
    │   │   ├── Wire (completed connections)
    │   │   └── DragWire (in-progress wire)
    │   │
    │   └── SelectionLayer (highlights, selection box)
    │
    ├── Sidebar (Left)
    │   ├── NodePalette
    │   │   ├── GeometricNodes (4)
    │   │   ├── ColorTransformNodes (4)
    │   │   ├── MotionNodes (4)
    │   │   ├── CompositionNodes (4)
    │   │   └── SourceNodes (position, time, audio)
    │   │
    │   └── GraphInfo
    │       ├── NodeCount
    │       ├── WireCount
    │       └── ValidationStatus
    │
    ├── Inspector (Right)
    │   ├── NodeProperties (if node selected)
    │   │   ├── NodeId
    │   │   ├── NodeType
    │   │   ├── Parameters (inline editors)
    │   │   └── Connections
    │   │
    │   └── PaletteEditor (if palette-related node selected)
    │       ├── ColorStops
    │       ├── Interpolation
    │       └── Preview
    │
    └── Preview
        ├── PreviewCanvas (WebGL/Canvas)
        ├── Controls (play, pause, loop, speed)
        ├── Metrics (FPS, render time, warnings)
        └── ExportButton
```

### 2.2 Core Data Structures

```typescript
// Node Graph State
interface GraphState {
  id: string;
  name: string;
  description: string;
  nodes: NodeInstance[];
  wires: WireInstance[];
  palette?: PaletteDefinition;
  metadata: PatternMetadata;
}

// Individual Node Instance
interface NodeInstance {
  id: string;                           // Unique ID (e.g., "position_1")
  type: NodeType;                       // Node type (e.g., "position_gradient")
  position: { x: number; y: number };   // Canvas position
  parameters: Record<string, any>;      // Node-specific parameters
  collapsed?: boolean;                  // UI state
}

// Wire Connection
interface WireInstance {
  id: string;
  fromNodeId: string;
  fromPort: string;                     // Output port name
  toNodeId: string;
  toPort: string;                       // Input port name
  style?: { color?: string };           // UI styling
}

// Node Type Definition (metadata)
interface NodeTypeDefinition {
  type: NodeType;
  category: 'geometric' | 'color' | 'motion' | 'composition' | 'source' | 'output';
  description: string;
  inputs: {
    name: string;
    type: 'float' | 'color' | 'vector' | 'signal';
    required: boolean;
  }[];
  outputs: {
    name: string;
    type: 'float' | 'color' | 'vector' | 'signal';
  }[];
  parameters: {
    name: string;
    type: 'number' | 'string' | 'select' | 'color';
    default: any;
    min?: number;
    max?: number;
    options?: { label: string; value: any }[];
  }[];
}

// Pattern Metadata
interface PatternMetadata {
  id: string;
  name: string;
  description: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  intentStatement?: string;             // Why does this pattern exist?
}
```

### 2.3 Node Type Reference (Phase B Expansion)

**Geometric Nodes** (4):
```
Position Gradient     → Distance from center (0.0 center → 1.0 edges)
Radial Emanate       → Waves emanating from center point
Linear Sweep         → Linear progression across strip
Wave Distribution    → Sinusoidal spatial distribution
```

**Color Transform Nodes** (4):
```
Hue Rotation        → Rotate color wheel
Saturation Control  → Adjust color intensity
Brightness Adjust   → Luminosity adjustment
Color Mixer         → Blend two palettes
```

**Motion Nodes** (4):
```
Speed Control       → Time-based animation rate
Direction Control   → Forward/backward/oscillate
Phase Offset        → Stagger animations across LEDs
Easing Functions    → Smooth transitions (ease-in/out/linear)
```

**Composition Nodes** (4):
```
Layer Blend         → Combine multiple effects
Mask Application    → Selective effect application
Mirror Symmetry     → Create symmetric patterns
Zone Segment        → Control specific LED regions
```

**Source Nodes** (3):
```
Position            → Input: LED position (0-1)
Time                → Input: Animation time (0+)
Audio Reactive      → Input: Audio features (tempo, spectrum, etc.)
```

**Output Nodes** (1):
```
Final Output        → Must be connected for valid pattern
```

---

## Part 3: Implementation Roadmap

### Phase C.1: Foundation (Week 1-2)

**Deliverables**:
1. Node graph data structures & state management
2. Canvas rendering (grid, nodes, basic wires)
3. Node palette & drag-to-canvas
4. Basic node editor (single node selection, parameter editing)

**Files to Create**:
```
src/components/nodeEditor/
├── NodeEditorProvider.tsx           # State management
├── NodeEditorLayout.tsx              # Main layout
├── Canvas/
│   ├── EditorCanvas.tsx              # Canvas container
│   ├── GridBackground.tsx
│   ├── NodesLayer.tsx
│   ├── WiresLayer.tsx
│   └── DragLayer.tsx
├── Sidebar/
│   ├── NodePalette.tsx
│   ├── GraphInfo.tsx
│   └── NodePaletteItem.tsx
├── Inspector/
│   ├── NodeInspector.tsx
│   ├── ParameterEditor.tsx
│   └── PaletteEditor.tsx
├── hooks/
│   ├── useNodeEditor.ts              # Main hook
│   ├── useNodeDragDrop.ts
│   ├── useWireDrawing.ts
│   ├── useCanvasZoom.ts
│   └── useKeyboardShortcuts.ts
├── types/
│   ├── nodeEditor.ts                 # Data structures
│   └── nodeTypes.ts                  # Node definitions
└── utils/
    ├── graphValidator.ts
    ├── nodeFactory.ts
    └── canvasUtils.ts

src/services/
└── nodeEditorService.ts              # Graph validation & codegen

src/test/
└── NodeEditor.integration.test.tsx
```

**Testing Strategy**:
- Unit tests: Node creation, parameter validation
- Integration tests: Graph state transitions
- Acceptance tests: Drag-drop, wire creation

---

### Phase C.2: Interactivity (Week 3)

**Deliverables**:
1. Wire drawing (click port → drag to another port)
2. Node deletion & duplication
3. Undo/redo system
4. Parameter editing with validation
5. Graph validation & error display

**Files to Modify/Create**:
```
src/components/nodeEditor/
├── Canvas/WiresLayer.tsx             # Wire rendering + interaction
├── hooks/
│   ├── useWireDrawing.ts             # Wire creation
│   ├── useNodeDeletion.ts
│   └── useUndoRedo.ts                # State history
├── services/
│   ├── graphValidator.ts             # Validation logic
│   └── errorReporter.ts
└── Inspector/ParameterEditor.tsx     # Inline editing

src/components/
└── GraphValidationError.tsx           # Error display
```

---

### Phase C.3: Preview System (Week 4)

**Deliverables**:
1. Real-time preview canvas (Canvas 2D or WebGL)
2. Pattern rendering engine (CPU-based 1D LED strip simulation)
3. Preview controls (play/pause, speed, loop)
4. Performance metrics (FPS, render time)
5. Pattern export as JSON

**Files to Create**:
```
src/components/nodeEditor/
├── Preview/
│   ├── PreviewCanvas.tsx             # Canvas container
│   ├── PreviewRenderer.ts            # Rendering engine
│   ├── PreviewControls.tsx
│   └── PreviewMetrics.tsx
└── hooks/
    └── usePreviewRenderer.ts         # Animation loop

src/services/
├── patternRenderer.ts                # CPU rendering of patterns
├── patternValidator.ts               # Validate against codegen
└── patternExporter.ts                # JSON export

src/utils/
└── ledSimulation.ts                  # Simulate LED strip behavior
```

**Preview Engine Design**:
- Input: Node graph state
- Output: Array of CRGBF colors (one per simulated LED)
- Execution: Each frame, evaluate all nodes in topological order
- Performance: Optimize hot path, cache intermediate results

---

### Phase C.4: Polish & Documentation (Week 5)

**Deliverables**:
1. Keyboard shortcuts & help system
2. Pattern save/load from localStorage
3. Pattern library (save/restore patterns)
4. UI refinements & accessibility
5. Documentation & tutorials
6. Test coverage validation

**Files to Create**:
```
src/components/nodeEditor/
├── Help/
│   ├── ShortcutsHelp.tsx
│   ├── NodeHelpPanel.tsx
│   └── TutorialOverlay.tsx
└── PatternLibrary/
    ├── PatternLibraryModal.tsx
    └── PatternCard.tsx

docs/
└── nodeEditor/
    ├── TUTORIAL.md                   # User guide
    ├── NODE_TYPES.md                 # Node reference
    ├── KEYBOARD_SHORTCUTS.md
    └── ARCHITECTURE.md               # Technical docs
```

---

## Part 4: Technical Specifications

### 4.1 Node Editor State Management

**Provider Implementation**:
```typescript
interface NodeEditorContextValue {
  // State
  graph: GraphState;
  selectedNodeId: string | null;
  selectedWireId: string | null;
  validationErrors: ValidationError[];

  // Actions
  addNode(type: NodeType, position: { x: number; y: number }): void;
  deleteNode(nodeId: string): void;
  updateNodeParameter(nodeId: string, param: string, value: any): void;
  createWire(fromNodeId: string, toNodeId: string): void;
  deleteWire(wireId: string): void;
  selectNode(nodeId: string | null): void;

  // Graph operations
  savePattern(): Promise<void>;
  exportAsJSON(): string;
  importFromJSON(json: string): void;

  // Undo/redo
  undo(): void;
  redo(): void;
}
```

**State Persistence**:
- Auto-save to localStorage every 30 seconds
- Pattern library stored in K1Provider's persistent storage
- Export to JSON for sharing/version control

### 4.2 Canvas Rendering Strategy

**Rendering Approach**:
- **Nodes**: SVG elements (better for dragging/interaction)
- **Wires**: SVG path elements with Bezier curves
- **Grid**: Canvas background
- **Selection**: SVG overlays

**Performance Optimizations**:
- Use `useMemo` for expensive node rendering
- Batch DOM updates with `requestAnimationFrame`
- Virtualize node rendering if graph > 50 nodes (rare)
- Debounce drag operations (10ms)

**Zoom/Pan Implementation**:
- Limit zoom: 0.5x → 2.0x
- Pan with middle-mouse or spacebar+drag
- "Fit to view" button to auto-zoom

### 4.3 Graph Validation Pipeline

**Validation Rules**:
1. **No orphaned nodes**: Every non-input node must have input wire
2. **No cycles**: Graph must be acyclic (DAG)
3. **Type matching**: Output type must match input port type
4. **Required inputs**: All required inputs must be connected
5. **No disconnected outputs**: Output node must be connected

**Validation Timing**:
- Real-time: As user creates wires (prevent invalid connections)
- On-save: Full validation before export

**Error Messages** (intentionally clear):
```
"Pulse node needs Position input. Connect position_1 or create position node."
"Cycle detected: Node_A → Node_B → Node_A. Rewire to break cycle."
"Color Mix node requires two color inputs. Currently has 1."
```

### 4.4 Preview Rendering Engine

**Algorithm**:

```
for each frame:
  for each simulated LED (0 to NUM_LEDS-1):
    1. Topologically sort graph nodes
    2. Evaluate each node:
       - Input: Previous node outputs + current parameters
       - Execute node logic (position gradient, color mix, etc.)
       - Store output in node's output buffer
    3. Render output node result to LED
  4. Display rendered LEDs in preview canvas
```

**Node Execution Context**:
```typescript
interface NodeEvaluationContext {
  ledIndex: number;                   // Current LED being evaluated
  position: number;                   // Normalized position (0-1)
  time: number;                       // Elapsed time in seconds
  audio?: AudioSnapshot;              // Audio data if needed
  previousFrame?: ColorBuffer;        // For temporal effects
}
```

**Performance Target**: 30 FPS minimum on standard hardware

---

## Part 5: Integration Points

### 5.1 Integration with K1Provider

**Pattern Storage**:
```typescript
// In K1Provider's state
interface K1ProviderState {
  // ... existing fields ...
  patternDesigner?: {
    currentGraph: GraphState;
    savedPatterns: { id: string; graph: GraphState }[];
    isDesigning: boolean;
  };
}

// New actions
actions.startPatternDesign(graphId?: string)
actions.savePatternDesign(name: string)
actions.exportPatternAsJSON()
actions.loadPatternIntoDesigner(patternId: string)
```

### 5.2 Integration with Codegen

**Compilation Pipeline**:
```
GraphState (JSON)
  ↓
NodeEditorService.validate()
  ↓ (if valid)
NodeEditorService.compileToJSON()
  ↓
codegen/src/index.ts::generateCode()
  ↓
compliant_patterns_generated.h
  ↓
firmware upload (existing pipeline)
```

**Methods to Create**:
```typescript
// In src/services/nodeEditorService.ts
export class NodeEditorService {
  static validate(graph: GraphState): ValidationResult;
  static toJSON(graph: GraphState): PatternJSON;  // Convert to codegen format
  static fromJSON(json: PatternJSON): GraphState; // Reverse operation
}
```

### 5.3 UI Integration in Control App

**Navigation**:
Add to Sidebar:
```
├── Control Panel (existing)
├── Debug View (existing)
├── Pattern Designer (NEW)  ← Click to enter node editor
└── Pattern Library (NEW)
```

**Entry Points**:
1. "Create new pattern" → Opens blank node editor
2. "Edit existing pattern" → Opens editor with pattern loaded
3. "Export pattern" → Downloads JSON

---

## Part 6: Error Handling & Validation

### 6.1 Validation Error Catalog

| Error | Cause | Resolution |
|-------|-------|-----------|
| Orphaned Node | Node has no input | Connect input wire or delete node |
| Cycle Detected | Circular dependency | Remove one wire to break cycle |
| Type Mismatch | Output type ≠ input type | Check port colors, reconnect with matching type |
| Missing Required Input | Input port unfilled | Connect wire to required input |
| Invalid Parameter | Parameter out of range | Adjust parameter to valid range |
| Disconnected Output | Output node unfilled | Connect output wire |
| Too Many Inputs | Extra wire connected | Remove extra wire |

### 6.2 Error Display Strategy

**Philosophy**: Errors are education opportunities, not failures.

**Error Messages**:
- Clear cause: "Pulse node needs Position input"
- Actionable solution: "Connect position_1 or create position node"
- Link to help: "[Learn more about Position nodes]"

**UI Placement**:
- Red outline on invalid nodes
- Error badge with count in sidebar
- Expandable error panel showing all issues
- Do NOT block user interaction (they can keep designing)

---

## Part 7: Performance & Optimization

### 7.1 Canvas Performance

**Targets**:
- Node drag: 60 FPS
- Wire drawing: 60 FPS
- Pan/zoom: 60 FPS
- Preview rendering: 30 FPS minimum

**Optimization Techniques**:
1. **Use RAF throttling**: Cap update frequency
2. **Batch SVG updates**: Update once per frame
3. **Memoize expensive calculations**: Node rendering, validation
4. **Lazy load**: Only render visible nodes (if >50 nodes)
5. **Use transforms**: Pan/zoom via CSS transform, not position updates

### 7.2 Memory Management

**Constraints**:
- Graph state: <1MB (reasonable limit ~100 nodes)
- Undo/redo stack: Last 50 operations
- Preview buffer: Single frame buffer (NUM_LEDS × 3 bytes)

**Strategy**:
- Clear old undo states after limit reached
- Debounce auto-save
- Release preview resources when not actively previewing

---

## Part 8: Testing Strategy

### 8.1 Unit Tests

**Graph State**:
```typescript
describe('GraphState', () => {
  it('should create new node with unique ID');
  it('should validate node type exists');
  it('should prevent duplicate node IDs');
});

describe('WireValidation', () => {
  it('should detect cycles');
  it('should validate type matching');
  it('should reject orphaned nodes');
});
```

### 8.2 Integration Tests

```typescript
describe('NodeEditor Integration', () => {
  it('should create node → wire → preview');
  it('should undo/redo operations');
  it('should save and load pattern');
  it('should export valid JSON for codegen');
});
```

### 8.3 Acceptance Tests

```typescript
describe('User Workflows', () => {
  it('Create simple gradient pattern end-to-end');
  it('Create complex audio-reactive pattern');
  it('Export pattern and compile to firmware');
  it('Undo/redo complex edits');
});
```

---

## Part 9: Educational Design

### 9.1 Learning Curve

**Beginner** (30 min):
- Open editor
- Drag position_gradient node
- Drag palette_interpolate node
- Connect them
- Attach to output
- See preview

**Intermediate** (2-3 hours):
- Understand all Phase B node types
- Create custom palettes
- Combine multiple effects
- Use motion and composition nodes

**Advanced** (ongoing):
- Audio-reactive patterns
- Optimization techniques
- Graph complexity management
- Artistic vision expression

### 9.2 UI Teaches Concepts

**Visual Language**:
- **Node color** → Category (geometric, color, motion, composition)
- **Port color** → Data type (position, color, signal, time)
- **Wire Bezier curves** → Clear data flow direction
- **Icons on nodes** → Quick visual recognition

**Tooltips & Help**:
- Hover node type → Show description
- Hover port → Show type & requirements
- Click [?] button → Open documentation
- Keyboard [H] → Show shortcuts

---

## Part 10: Success Metrics

### 10.1 Implementation Checklist

- [ ] Node creation/deletion with full undo/redo
- [ ] Wire drawing with validation
- [ ] All 16 Phase B node types supported
- [ ] Real-time preview at 30+ FPS
- [ ] Pattern save/load to localStorage
- [ ] Export as JSON matching codegen format
- [ ] Keyboard shortcuts (create, delete, undo, save, export)
- [ ] Error validation with clear messages
- [ ] Graph info sidebar (node count, wire count, status)
- [ ] Parameter editing with type-specific editors
- [ ] Zoom/pan controls
- [ ] Help system and tutorials
- [ ] Unit test coverage >80%
- [ ] Integration test coverage >70%
- [ ] Performance verified (60 FPS canvas, 30 FPS preview)
- [ ] Accessibility compliance (WCAG AA)
- [ ] Documentation complete (tutorial, API, architecture)

### 10.2 Quality Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| TypeScript errors | 0 | CRITICAL |
| Test coverage | >75% | HIGH |
| Canvas FPS | 60 | HIGH |
| Preview FPS | 30+ | HIGH |
| Bundle size increase | <50KB | MEDIUM |
| Accessibility score | 90+ | MEDIUM |
| Documentation score | Complete | MEDIUM |

---

## Part 11: Risk Mitigation

### 11.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Canvas performance | 30 FPS target missed | Early performance testing, use RAF throttling |
| Type system complexity | Hard to maintain | Clear types in nodeEditor.ts, exhaustive validation |
| Undo/redo edge cases | State corruption | Thorough testing of state transitions |
| Preview → codegen mismatch | Generated C++ differs from preview | Create conversion tests, validate side-by-side |

### 11.2 Scope Creep Prevention

**Out of Scope for Phase C.1**:
- ❌ Collaborative editing
- ❌ Version control integration
- ❌ Cloud synchronization
- ❌ Plugin system
- ❌ Advanced animation curves
- ❌ 3D LED visualization

**Explicitly In Scope**:
- ✅ 2D canvas with SVG nodes
- ✅ JSON import/export
- ✅ Real-time preview
- ✅ Parameter editing
- ✅ All 16 Phase B nodes

---

## Part 12: Timeline & Resource Planning

### Phase C Implementation Schedule

**Week 1-2: Foundation**
- Commit: Node structures, state management, basic canvas
- Effort: 40-50 hours
- Deliverables: Canvas with node rendering, drag-to-canvas

**Week 3: Interactivity**
- Commit: Wire drawing, validation, undo/redo
- Effort: 35-40 hours
- Deliverables: Full node manipulation with validation

**Week 4: Preview**
- Commit: Preview system, export functionality
- Effort: 30-35 hours
- Deliverables: Real-time preview at 30+ FPS

**Week 5: Polish & Docs**
- Commit: Help system, tutorials, refinements
- Effort: 25-30 hours
- Deliverables: Complete documentation, 90%+ test coverage

**Total Effort**: ~130-155 engineering hours
**Estimated Duration**: 5-6 weeks (1 engineer, full-time)
**Estimated Duration**: 10-12 weeks (shared with other tasks)

---

## Part 13: Documentation Plan

**Technical Documentation** (docs/nodeEditor/):
- ARCHITECTURE.md - System design and data flow
- API_REFERENCE.md - Component and service APIs
- NODE_TYPES.md - Complete node type reference
- VALIDATION.md - Validation rules and error messages

**User Documentation** (docs/userGuide/):
- GETTING_STARTED.md - First 30 minutes
- TUTORIAL.md - Create 3 example patterns
- NODE_GUIDE.md - Understanding each node type
- PATTERNS.md - Gallery of community patterns
- KEYBOARD_SHORTCUTS.md - Quick reference

**Code Documentation**:
- JSDoc comments on all public APIs
- Type definitions with descriptions
- Usage examples in hook documentation

---

## Part 14: Post-Phase C Extensions (Future)

**Phase D Possibilities** (if Phase C succeeds):
- Pattern sharing community & library
- More node types (custom nodes, shader support)
- Audio visualization in editor
- Collaborative pattern design
- Pattern templates & presets
- Advanced features (node groups, macros, etc.)

**But only if Phase C maintains uncompromising philosophy.**

---

## Conclusion

This specification provides complete architectural guidance for Phase C Node Graph Editor implementation. The design balances:

- **Minimalism**: Essential features only, no decorative complexity
- **Intentionality**: Every UI element serves user and educational goals
- **Performance**: 60 FPS canvas, 30 FPS preview, <50KB code
- **Clarity**: Visual and conceptual clarity through design
- **Validation**: Comprehensive error handling and guidance

**Next Steps**:
1. Review this specification with team
2. Validate timeline and resource requirements
3. Set up development branch for Phase C
4. Create detailed task breakdown in .taskmaster
5. Begin Phase C.1 implementation

**Success will be demonstrated by**:
- Smooth node editing with real-time validation
- Beautiful, responsive canvas at 60 FPS
- Preview system faithful to compiled patterns
- Clear documentation enabling user mastery
- Zero compromises to K1's philosophy

---

## Appendix A: Node Type Definitions Reference

### Geometric Nodes

**Position Gradient**
- Inputs: None
- Outputs: float (0.0 at center → 1.0 at edges)
- Parameters: None
- Use: Base for most patterns

**Radial Emanate**
- Inputs: float (intensity)
- Outputs: float (radial wave)
- Parameters: wavelength, amplitude
- Use: Wave-like emanation from center

**Linear Sweep**
- Inputs: float (intensity)
- Outputs: float (linear progression)
- Parameters: speed, direction
- Use: Flow across strip

**Wave Distribution**
- Inputs: float (base position)
- Outputs: float (sinusoidal distribution)
- Parameters: wavelength, phase
- Use: Spatial oscillation

### Color Transform Nodes

**Hue Rotation**
- Inputs: color, float (rotation degrees)
- Outputs: color
- Parameters: None
- Use: Color wheel manipulation

**Saturation Control**
- Inputs: color, float (0-1 saturation)
- Outputs: color
- Parameters: None
- Use: Color intensity adjustment

**Brightness Adjust**
- Inputs: color, float (0-1 brightness)
- Outputs: color
- Parameters: None
- Use: Luminosity control

**Color Mixer**
- Inputs: color1, color2, float (mix ratio 0-1)
- Outputs: color
- Parameters: blendMode (linear, screen, multiply)
- Use: Blend two palettes

### Motion Nodes

**Speed Control**
- Inputs: float (base input), float (speed multiplier)
- Outputs: float (time-modulated)
- Parameters: None
- Use: Control animation speed

**Direction Control**
- Inputs: float (position), float (direction: -1/0/1)
- Outputs: float (reversed if needed)
- Parameters: oscillateMode (bool)
- Use: Animation direction reversal

**Phase Offset**
- Inputs: float (base input), float (offset per-LED)
- Outputs: float (phase-shifted)
- Parameters: None
- Use: Stagger animations across strip

**Easing Functions**
- Inputs: float (0-1 progress)
- Outputs: float (eased value)
- Parameters: easingType (linear, easeIn, easeOut, easeInOut)
- Use: Smooth transitions

### Composition Nodes

**Layer Blend**
- Inputs: color1, color2, float (blend ratio)
- Outputs: color
- Parameters: blendMode (add, multiply, screen, overlay)
- Use: Combine multiple effects

**Mask Application**
- Inputs: color (effect), float (mask 0-1)
- Outputs: color
- Parameters: invertMask (bool)
- Use: Selective effect application

**Mirror Symmetry**
- Inputs: float (position)
- Outputs: float (mirrored position)
- Parameters: mirrorType (center, edge, double)
- Use: Create symmetrical patterns

**Zone Segment**
- Inputs: float (value), float (zone index)
- Outputs: float (zone-specific value)
- Parameters: numZones (1-8)
- Use: Control specific LED regions

---

**End of Specification**

*This document is the authoritative source for Phase C Node Graph Editor implementation. All design decisions should reference this specification.*
