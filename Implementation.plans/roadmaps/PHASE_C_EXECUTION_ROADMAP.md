# Phase C: Execution Roadmap & Task Breakdown

**Author**: Claude Code Agent
**Date**: 2025-10-27
**Status**: Ready for Implementation
**Duration**: 5-6 weeks (full-time) or 10-12 weeks (shared capacity)
**Effort**: ~130-155 engineering hours

---

## Overview

This roadmap translates the Phase C specification into actionable tasks for the .taskmaster system. Tasks are organized in 4 phases with dependencies and staged deliverables.

**Phases**:
1. **Foundation** (Week 1-2): Data structures, state management, canvas rendering
2. **Interactivity** (Week 3): Wire drawing, validation, undo/redo
3. **Preview** (Week 4): Real-time visualization, export
4. **Polish** (Week 5): Help system, docs, refinement

---

## Phase C.1: Foundation (Week 1-2)

### C.1.1: Core Data Structures & Types

**Objective**: Establish TypeScript types and data models

**Dependencies**: None

**Tasks**:
```
C.1.1.1 Create nodeEditor/types/nodeEditor.ts
        - GraphState, NodeInstance, WireInstance
        - NodeTypeDefinition, ParameterDefinition
        - ValidationError, PatternMetadata
        Acceptance: All 16 Phase B nodes can be represented

C.1.1.2 Create nodeEditor/types/nodeTypes.ts
        - Enumerate all 16 Phase B node types
        - Define input/output ports for each
        - Define parameters for each
        Acceptance: TypeScript compiles, all nodes documented

C.1.1.3 Create nodeEditor/utils/nodeFactory.ts
        - Function: createNode(type, position, id)
        - Function: createWire(fromId, toId)
        - Function: createGraph(name, description)
        Acceptance: Unit tests pass for all node types

C.1.1.4 Create test file: test/NodeEditorTypes.test.ts
        - Test node creation with all types
        - Test parameter validation
        - Test wire structure
        Acceptance: Tests run, all passing
```

**Estimated Effort**: 8-10 hours
**Files Created**: 4 new files
**Test Coverage Target**: 100%

---

### C.1.2: State Management & Provider

**Objective**: Implement React Context for graph state

**Dependencies**: C.1.1

**Tasks**:
```
C.1.2.1 Create nodeEditor/NodeEditorProvider.tsx
        - useNodeEditorContext hook
        - State shape: graph, selectedNodeId, validationErrors
        - Actions: addNode, deleteNode, updateNode, createWire
        Acceptance: Provider mounts, state updates work

C.1.2.2 Create nodeEditor/hooks/useNodeEditor.ts
        - Main hook with all graph operations
        - Validation integration
        - Error state management
        Acceptance: Hook can be used in components

C.1.2.3 Implement undo/redo system
        - useUndoRedoStack hook
        - State history management (last 50 operations)
        - Integration with all graph operations
        Acceptance: Undo/redo works for node/wire operations

C.1.2.4 Create test file: test/NodeEditorProvider.test.ts
        - Test state initialization
        - Test addNode/deleteNode
        - Test undo/redo
        Acceptance: Tests pass, >90% coverage
```

**Estimated Effort**: 12-15 hours
**Files Created**: 3 new files
**Test Coverage Target**: >90%

---

### C.1.3: Canvas & Grid Rendering

**Objective**: Implement canvas foundation with grid and viewport

**Dependencies**: C.1.1, C.1.2

**Tasks**:
```
C.1.3.1 Create nodeEditor/Canvas/EditorCanvas.tsx
        - Canvas container component
        - SVG element for rendering
        - Zoom/pan state
        Acceptance: Canvas renders at 60 FPS

C.1.3.2 Create nodeEditor/Canvas/GridBackground.tsx
        - Grid pattern rendering
        - Snap-to-grid constants (16px)
        - Zoom-aware grid scaling
        Acceptance: Grid renders correctly at all zoom levels

C.1.3.3 Create nodeEditor/hooks/useCanvasZoom.ts
        - Zoom state management (0.5x - 2.0x)
        - Pan state management
        - Mouse wheel zoom
        - Spacebar + drag for pan
        Acceptance: Zoom/pan smooth, 60 FPS maintained

C.1.3.4 Create nodeEditor/utils/canvasUtils.ts
        - worldToScreen(worldPos, zoom, pan)
        - screenToWorld(screenPos, zoom, pan)
        - getSnapPosition(pos, gridSize)
        Acceptance: All functions tested with unit tests
```

**Estimated Effort**: 10-12 hours
**Files Created**: 4 new files
**Performance Target**: 60 FPS

---

### C.1.4: Node Rendering

**Objective**: Render nodes on canvas with visual language

**Dependencies**: C.1.2, C.1.3

**Tasks**:
```
C.1.4.1 Create nodeEditor/Canvas/NodesLayer.tsx
        - Render all nodes in graph
        - Use SVG for node elements
        - Render node labels and types
        Acceptance: 16 different node types render with distinct visuals

C.1.4.2 Create nodeEditor/Canvas/Node.tsx (component)
        - Individual node rendering
        - Node color by type/category
        - Input/output port indicators
        - Parameter display
        Acceptance: Single node renders correctly

C.1.4.3 Create nodeEditor/Canvas/NodePort.tsx
        - Port circle indicators (input/output)
        - Port color by type
        - Port hover state
        Acceptance: Ports are clearly visible, hover effects work

C.1.4.4 Implement node drag positioning
        - Mouse down on node → drag to new position
        - Snap to grid
        - Visual feedback during drag
        - Integrate with state management
        Acceptance: Nodes drag smoothly, snap correctly, state updates

C.1.4.5 Create test file: test/NodeRendering.test.tsx
        - Test node rendering for all types
        - Test port visibility
        - Test drag behavior
        Acceptance: Tests pass, >80% coverage
```

**Estimated Effort**: 14-16 hours
**Files Created**: 4 new files, 1 test file
**Test Coverage Target**: >80%

---

### C.1.5: Node Palette & Creation

**Objective**: Enable users to add nodes from palette

**Dependencies**: C.1.2, C.1.4

**Tasks**:
```
C.1.5.1 Create nodeEditor/Sidebar/NodePalette.tsx
        - Show all node types organized by category
        - Geometric, Color, Motion, Composition sections
        - Search/filter functionality
        Acceptance: All 16 nodes visible and categorized

C.1.5.2 Create nodeEditor/Sidebar/NodePaletteItem.tsx
        - Individual palette item component
        - Icon and description
        - Draggable to canvas
        Acceptance: Items are visually distinct and interactive

C.1.5.3 Implement drag-from-palette-to-canvas
        - Drag NodePaletteItem onto canvas
        - Create node at drop position
        - Auto-generate unique node ID
        Acceptance: New nodes appear at correct position with unique IDs

C.1.5.4 Create nodeEditor/Sidebar/GraphInfo.tsx
        - Display node count
        - Display wire count
        - Display validation status
        Acceptance: Info updates in real-time
```

**Estimated Effort**: 10-12 hours
**Files Created**: 3 new files
**Test Coverage Target**: >70%

---

### C.1.6: Node Inspector & Parameter Editing

**Objective**: Enable parameter editing for selected nodes

**Dependencies**: C.1.2, C.1.4, C.1.5

**Tasks**:
```
C.1.6.1 Create nodeEditor/Inspector/NodeInspector.tsx
        - Show selected node details
        - Node ID, type, description
        - Parameter list
        Acceptance: Inspector shows all node information

C.1.6.2 Create nodeEditor/Inspector/ParameterEditor.tsx
        - Inline parameter editing
        - Type-specific editors (number, string, select, color)
        - Parameter validation
        - Update state on change
        Acceptance: All parameter types editable, validation works

C.1.6.3 Create parameter editor types:
        - NumberParameterEditor (slider + input)
        - SelectParameterEditor (dropdown)
        - ColorParameterEditor (color picker)
        - StringParameterEditor (text input)
        Acceptance: Each editor type works correctly

C.1.6.4 Implement node deletion & duplication
        - Right-click node → Context menu
        - Delete option → Remove node and connected wires
        - Duplicate option → Create copy nearby
        Acceptance: Delete/duplicate operations work correctly
```

**Estimated Effort**: 12-14 hours
**Files Created**: 3 new files
**Test Coverage Target**: >70%

---

### C.1 Completion Criteria

- [ ] All data structures defined and tested
- [ ] Canvas renders at 60 FPS
- [ ] Grid background renders correctly
- [ ] All 16 node types render distinctly
- [ ] Drag nodes → move on canvas with snap-to-grid
- [ ] Drag from palette → create new nodes
- [ ] Edit parameters in inspector
- [ ] Undo/redo works for all operations
- [ ] Zero TypeScript errors
- [ ] Test coverage >85%

**Deliverable**: Working node editor with node creation, positioning, and parameter editing (no wires yet)

---

## Phase C.2: Interactivity (Week 3)

### C.2.1: Wire Drawing System

**Objective**: Enable users to connect nodes with wires

**Dependencies**: C.1 (all foundation tasks complete)

**Tasks**:
```
C.2.1.1 Create nodeEditor/Canvas/WiresLayer.tsx
        - Render all wires in graph
        - SVG path elements
        - Bezier curves for data flow visualization
        Acceptance: Wires render correctly

C.2.1.2 Create nodeEditor/Canvas/DragWire.tsx
        - Temporary wire while dragging from port
        - Preview before connection
        - Visual feedback
        Acceptance: In-progress wire visible while dragging

C.2.1.3 Implement wire drawing state machine
        - Click port → Enter wire-drawing mode
        - Drag to another port → Hover effect
        - Click target port → Create wire (if valid)
        - Right-click → Cancel wire drawing
        Acceptance: Wire drawing smooth and responsive

C.2.1.4 Wire validation during drawing
        - Prevent invalid connections (type mismatch)
        - Prevent connecting to self
        - Prevent duplicate wires
        - Show validation feedback (highlight valid targets)
        Acceptance: Invalid connections prevented, valid ones allowed

C.2.2.5 Create test file: test/WireDrawing.test.tsx
        - Test wire creation
        - Test validation rules
        - Test wire deletion
        Acceptance: Tests pass, >85% coverage
```

**Estimated Effort**: 12-14 hours
**Files Created**: 3 new files, 1 test file
**Test Coverage Target**: >85%

---

### C.2.2: Graph Validation & Error System

**Objective**: Validate graph structure and provide clear error messages

**Dependencies**: C.1.1, C.1.2

**Tasks**:
```
C.2.2.1 Create nodeEditor/services/graphValidator.ts
        - validateGraph(graph): ValidationResult
        - Check: no cycles
        - Check: no orphaned nodes (except inputs)
        - Check: type matching
        - Check: required inputs connected
        - Check: disconnected outputs
        Acceptance: All validation rules implemented and tested

C.2.2.2 Create nodeEditor/services/errorReporter.ts
        - humanReadableError(error) → Clear message
        - Provide actionable solutions
        - Link to help documentation
        Acceptance: Error messages are clear and helpful

C.2.2.3 Integrate validation with UI
        - Real-time validation on graph changes
        - Display errors in sidebar
        - Highlight invalid nodes with red outline
        - Update graph info status
        Acceptance: Validation errors display clearly

C.2.2.4 Create test file: test/GraphValidation.test.ts
        - Test all validation rules
        - Test error messages
        - Test edge cases
        Acceptance: Tests pass, >90% coverage
```

**Estimated Effort**: 10-12 hours
**Files Created**: 2 new files, 1 test file
**Test Coverage Target**: >90%

---

### C.2.3: Undo/Redo Integration

**Objective**: Ensure all operations are undoable

**Dependencies**: C.1.2, C.2.1

**Tasks**:
```
C.2.3.1 Extend useUndoRedoStack for wire operations
        - Track wire creation/deletion
        - Track node property changes
        - Track node deletion
        Acceptance: All operations can be undone/redone

C.2.3.2 Add keyboard shortcuts
        - Ctrl+Z / Cmd+Z → Undo
        - Ctrl+Y / Cmd+Y → Redo
        - Visual feedback (history indicator)
        Acceptance: Shortcuts work reliably

C.2.3.3 Create test file: test/UndoRedo.test.ts
        - Test undo/redo sequences
        - Test edge cases (rapid undo/redo)
        - Test complex operation sequences
        Acceptance: Tests pass, >90% coverage
```

**Estimated Effort**: 8-10 hours
**Files Created**: 1 test file
**Test Coverage Target**: >90%

---

### C.2.4: Selection & Inspection

**Objective**: Enable selecting nodes/wires and viewing their properties

**Dependencies**: C.1.4, C.1.6

**Tasks**:
```
C.2.4.1 Implement node selection state
        - Click node → Select
        - Highlight selected node
        - Update inspector with selected node
        - Ctrl+Click → Multi-select (future feature)
        Acceptance: Selection works, inspector updates

C.2.4.2 Implement wire selection state
        - Click wire → Select
        - Highlight selected wire
        - Show wire source/target in inspector
        Acceptance: Wire selection works

C.2.4.3 Delete selected nodes/wires
        - Delete key → Remove selected node/wire
        - Context menu → Delete option
        - Confirmation for important deletes
        Acceptance: Deletion works with undo support
```

**Estimated Effort**: 6-8 hours
**Files Created**: 0 new files
**Test Coverage Target**: >75%

---

### C.2 Completion Criteria

- [ ] Wire drawing works (click port → drag → click target)
- [ ] Validation catches all errors
- [ ] Error messages are clear and actionable
- [ ] Undo/redo works for all operations
- [ ] Node/wire selection and deletion work
- [ ] Red outline on invalid nodes
- [ ] No orphaned nodes or disconnected outputs allowed
- [ ] All validation rules tested

**Deliverable**: Fully interactive node editor with validation and error checking

---

## Phase C.3: Preview System (Week 4)

### C.3.1: Pattern Rendering Engine

**Objective**: Implement CPU-based LED simulation and rendering

**Dependencies**: C.1.1, C.1.2

**Tasks**:
```
C.3.1.1 Create nodeEditor/services/patternRenderer.ts
        - PatternRenderer class
        - render(graph, frameIndex): ColorBuffer
        - Topological sort of nodes
        - Evaluate each node in order
        - Handle timing and animation
        Acceptance: Renders patterns without errors

C.3.1.2 Create nodeEditor/services/ledSimulation.ts
        - SimulatedLEDStrip class
        - NUM_LEDS constant
        - setColor(index, color)
        - getColor(index): CRGBF
        - Simulate LED behavior
        Acceptance: LED simulation accurate

C.3.1.3 Implement node evaluation logic
        - For each node type, evaluate with inputs
        - Topological order ensures inputs available
        - Handle float, color, vector outputs
        - Cache intermediate results
        Acceptance: All node types evaluate correctly

C.3.1.4 Create test file: test/PatternRenderer.test.ts
        - Test rendering Departure pattern
        - Test rendering Lava pattern
        - Test rendering Twilight pattern
        - Test complex multi-node patterns
        Acceptance: Tests pass, patterns render identically to firmware

C.3.1.5 Performance optimize rendering
        - Profile render time
        - Optimize hot path
        - Cache expensive calculations
        - Target: <33ms per frame (30 FPS)
        Acceptance: Rendering achieves 30+ FPS
```

**Estimated Effort**: 16-20 hours
**Files Created**: 2 new files, 1 test file
**Performance Target**: 30+ FPS
**Test Coverage Target**: >85%

---

### C.3.2: Preview Canvas Component

**Objective**: Implement preview visualization UI

**Dependencies**: C.3.1

**Tasks**:
```
C.3.2.1 Create nodeEditor/Preview/PreviewCanvas.tsx
        - Canvas element for LED visualization
        - Animation loop (requestAnimationFrame)
        - Display current frame
        Acceptance: Canvas renders smoothly

C.3.2.2 Create nodeEditor/Preview/PreviewRenderer.tsx
        - Integrate PatternRenderer
        - Handle time progression
        - Support looping/non-looping
        Acceptance: Preview plays pattern

C.3.2.3 Create nodeEditor/Preview/PreviewControls.tsx
        - Play/pause button
        - Speed control (0.25x - 2.0x)
        - Loop toggle
        - Reset button
        Acceptance: Controls work as expected

C.3.2.4 Create nodeEditor/Preview/PreviewMetrics.tsx
        - Display FPS counter
        - Display render time (ms)
        - Display frame number
        - Display warnings (if FPS < 30)
        Acceptance: Metrics display accurately

C.3.2.5 Create test file: test/PreviewCanvas.test.tsx
        - Test preview renders
        - Test controls work
        - Test metrics update
        Acceptance: Tests pass, >70% coverage
```

**Estimated Effort**: 12-14 hours
**Files Created**: 4 new files, 1 test file
**Performance Target**: 30 FPS minimum
**Test Coverage Target**: >70%

---

### C.3.3: Pattern Export System

**Objective**: Export patterns as JSON for codegen compilation

**Dependencies**: C.1.1, C.1.2

**Tasks**:
```
C.3.3.1 Create nodeEditor/services/patternExporter.ts
        - exportAsJSON(graph): string
        - Convert GraphState to codegen JSON format
        - Validate exported JSON
        - Pretty-print JSON
        Acceptance: Exported JSON matches codegen format

C.3.3.2 Create nodeEditor/services/patternImporter.ts
        - importFromJSON(json): GraphState
        - Reverse of exporter
        - Validate imported data
        - Provide helpful error messages
        Acceptance: Can round-trip JSON → GraphState → JSON

C.3.3.3 Create export UI
        - Export button in editor
        - "Download as JSON" action
        - Show exported JSON in modal
        - Copy-to-clipboard option
        Acceptance: Export button works, JSON downloads

C.3.3.4 Create test file: test/PatternExport.test.ts
        - Test exporting all node types
        - Test round-trip (import → export → import)
        - Test exported JSON matches codegen format
        Acceptance: Tests pass, >85% coverage
```

**Estimated Effort**: 10-12 hours
**Files Created**: 2 new files, 1 test file
**Test Coverage Target**: >85%

---

### C.3.4: Integration with Codegen

**Objective**: Validate exported patterns against codegen pipeline

**Dependencies**: C.3.3.1, C.3.3.2

**Tasks**:
```
C.3.4.1 Create nodeEditor/services/codegenValidator.ts
        - sendToCodegen(json): CompileResult
        - Run codegen validation without compilation
        - Validate exported JSON can compile
        - Return detailed error messages if validation fails
        Acceptance: Can validate patterns before export

C.3.4.2 Integration test: Compile exported pattern
        - Export pattern from editor
        - Run through codegen pipeline
        - Verify generated C++ is valid
        - Compare preview rendering with firmware rendering
        Acceptance: Exported patterns compile successfully

C.3.4.3 Create end-to-end test
        - Create pattern in editor
        - Preview pattern
        - Export as JSON
        - Compile with codegen
        - Verify firmware runs compiled pattern
        Acceptance: Full pipeline works end-to-end
```

**Estimated Effort**: 8-10 hours
**Files Created**: 1 new file
**Test Coverage Target**: >80%

---

### C.3 Completion Criteria

- [ ] Preview canvas renders at 30+ FPS
- [ ] All node types render correctly in preview
- [ ] Patterns can be exported as JSON
- [ ] Exported JSON validates against codegen
- [ ] Export/import round-trip works
- [ ] Metrics show FPS and render time
- [ ] Play/pause/speed controls work
- [ ] Preview faithful to firmware rendering

**Deliverable**: Fully functional preview system with export capability

---

## Phase C.4: Polish & Documentation (Week 5)

### C.4.1: Keyboard Shortcuts & Help System

**Objective**: Make editor discoverable and power-user friendly

**Dependencies**: All previous phases

**Tasks**:
```
C.4.1.1 Create Help/ShortcutsHelp.tsx
        - Display all keyboard shortcuts
        - Organize by category
        - Searchable shortcut reference
        Acceptance: Help modal shows all shortcuts

C.4.1.2 Create Help/NodeHelpPanel.tsx
        - Hover node type → Show help tooltip
        - Click [?] → Open detailed node documentation
        - Link to node type reference
        Acceptance: Hover and click help works

C.4.1.3 Implement keyboard shortcuts
        - Ctrl+N / Cmd+N → New pattern
        - Ctrl+O / Cmd+O → Open pattern
        - Ctrl+S / Cmd+S → Save pattern
        - Ctrl+E / Cmd+E → Export JSON
        - Delete → Delete selected
        - Ctrl+Z / Cmd+Z → Undo
        - Ctrl+Y / Cmd+Y → Redo
        - Ctrl+? / Cmd+? → Show shortcuts
        Acceptance: All shortcuts work

C.4.1.4 Create onboarding tutorial
        - First-time user flow
        - Interactive tutorial (create simple pattern)
        - Highlight key features
        Acceptance: Tutorial guides new users
```

**Estimated Effort**: 10-12 hours
**Files Created**: 3 new files
**Test Coverage Target**: >60%

---

### C.4.2: Pattern Save & Library

**Objective**: Enable saving patterns locally and managing library

**Dependencies**: C.3.3

**Tasks**:
```
C.4.2.1 Create pattern persistence
        - Save pattern to localStorage
        - Auto-save every 30 seconds
        - Recovery from previous session
        Acceptance: Patterns persist across reload

C.4.2.2 Create PatternLibraryModal.tsx
        - Show saved patterns
        - Create new / Open / Delete patterns
        - Search patterns by name/tags
        Acceptance: Pattern library works

C.4.2.3 Create PatternCard.tsx
        - Display pattern thumbnail (preview)
        - Show pattern name, author, created date
        - Click to load, hover for preview
        Acceptance: Cards display patterns nicely

C.4.2.4 Create test file: test/PatternLibrary.test.ts
        - Test saving/loading patterns
        - Test pattern library UI
        - Test localStorage persistence
        Acceptance: Tests pass, >75% coverage
```

**Estimated Effort**: 10-12 hours
**Files Created**: 3 new files, 1 test file
**Test Coverage Target**: >75%

---

### C.4.3: UI Refinements & Accessibility

**Objective**: Polish UI and ensure accessibility compliance

**Dependencies**: All previous phases

**Tasks**:
```
C.4.3.1 Design refinements
        - Visual polish (colors, spacing, fonts)
        - Consistent component styling
        - Responsive design (works at different sizes)
        - Dark mode support (if K1 control app uses it)
        Acceptance: UI looks polished and consistent

C.4.3.2 Accessibility compliance (WCAG AA)
        - Keyboard navigation (Tab to move focus)
        - ARIA labels on interactive elements
        - Color contrast ratios (4.5:1 minimum)
        - Test with jest-axe
        Acceptance: jest-axe reports no violations

C.4.3.3 Error message refinements
        - Review all error messages for clarity
        - Add contextual help links
        - Improve visual highlighting of errors
        Acceptance: Error messages clear and actionable

C.4.3.4 Performance monitoring
        - Profile final implementation
        - Verify 60 FPS canvas
        - Verify 30+ FPS preview
        - Optimize if needed
        Acceptance: All performance targets met
```

**Estimated Effort**: 10-12 hours
**Files Created**: 0-1 new files
**Performance Target**: 60 FPS canvas, 30 FPS preview
**Accessibility Target**: WCAG AA compliance

---

### C.4.4: Documentation

**Objective**: Complete comprehensive documentation

**Dependencies**: All implementation tasks

**Tasks**:
```
C.4.4.1 Create docs/nodeEditor/ARCHITECTURE.md
        - System design overview
        - Component hierarchy
        - Data flow diagrams
        - State management
        Acceptance: Clear technical overview

C.4.4.2 Create docs/nodeEditor/TUTORIAL.md
        - Getting started guide
        - Create first pattern (Departure variant)
        - Create second pattern (custom)
        - Create complex pattern (audio-reactive)
        Acceptance: Tutorials work step-by-step

C.4.4.3 Create docs/nodeEditor/NODE_TYPES.md
        - Reference for all 16 + 3 node types
        - Input/output descriptions
        - Parameter descriptions
        - Usage examples
        Acceptance: Complete node reference

C.4.4.4 Create docs/nodeEditor/KEYBOARD_SHORTCUTS.md
        - Quick reference of all shortcuts
        - Tips for power users
        - Customization guide (future)
        Acceptance: Clear shortcut reference

C.4.4.5 Create docs/nodeEditor/API_REFERENCE.md
        - Component API documentation
        - Service API documentation
        - Hook documentation
        Acceptance: Developers can extend system

C.4.4.6 Create docs/nodeEditor/VALIDATION.md
        - Validation rules explained
        - Error messages and solutions
        - Graph structure requirements
        Acceptance: Clear validation documentation

C.4.4.7 Update main docs/README.md
        - Add link to Phase C features
        - Update project overview
        Acceptance: Project docs updated
```

**Estimated Effort**: 12-16 hours
**Files Created**: 7 new files
**Documentation Target**: Complete and clear

---

### C.4.5: Final Testing & Validation

**Objective**: Comprehensive testing and quality assurance

**Dependencies**: All implementation tasks

**Tasks**:
```
C.4.5.1 Test coverage validation
        - Run coverage reports
        - Target: >75% overall
        - Identify uncovered paths
        - Add tests as needed
        Acceptance: Coverage >75%

C.4.5.2 TypeScript validation
        - Run `npm run type-check`
        - Target: 0 errors
        - No @ts-ignore comments
        Acceptance: Zero TypeScript errors

C.4.5.3 End-to-end testing
        - Test full workflow (create → edit → preview → export)
        - Test all 16 node types
        - Test undo/redo extensively
        - Test error scenarios
        Acceptance: All workflows work

C.4.5.4 Performance profiling
        - Profile canvas rendering
        - Profile preview rendering
        - Profile memory usage
        - Optimize if needed
        Acceptance: Meets all performance targets

C.4.5.5 Browser compatibility
        - Test on Chrome, Firefox, Safari
        - Test on different screen sizes
        - Test touch interactions (if applicable)
        Acceptance: Works on all major browsers

C.4.5.6 Code review preparation
        - Prepare for code review
        - Create summary of changes
        - Document design decisions
        Acceptance: Ready for review
```

**Estimated Effort**: 10-12 hours
**Test Coverage Target**: >75%
**Performance Target**: All metrics met

---

### C.4 Completion Criteria

- [ ] Keyboard shortcuts implemented and working
- [ ] Help system complete with tutorials
- [ ] Pattern save/load functionality works
- [ ] Pattern library UI functional
- [ ] UI polished and consistent
- [ ] WCAG AA accessibility compliance
- [ ] All error messages clear and helpful
- [ ] 60 FPS canvas, 30 FPS preview maintained
- [ ] TypeScript: 0 errors
- [ ] Test coverage: >75%
- [ ] Documentation: Complete
- [ ] Code ready for review

**Deliverable**: Production-ready node editor with complete documentation

---

## Overall Phase C Success Criteria

### Functionality
- [ ] All 16 Phase B node types fully supported
- [ ] Drag-drop node creation
- [ ] Wire drawing with validation
- [ ] Parameter editing
- [ ] Real-time preview (30+ FPS)
- [ ] Undo/redo for all operations
- [ ] Pattern save/load/export
- [ ] JSON import/export with validation

### Performance
- [ ] Canvas rendering: 60 FPS
- [ ] Preview rendering: 30+ FPS
- [ ] No stuttering or frame drops
- [ ] Memory: <100MB for typical graphs
- [ ] Bundle size: <50KB additional code

### Quality
- [ ] TypeScript: 0 errors
- [ ] Test coverage: >75%
- [ ] WCAG AA compliance
- [ ] No known bugs
- [ ] Production-ready code

### Documentation
- [ ] User tutorial (30 min → functional pattern)
- [ ] Complete node reference
- [ ] API documentation
- [ ] Architecture documentation
- [ ] Keyboard shortcut reference
- [ ] Help system integrated

### Philosophy Alignment
- [ ] No feature bloat
- [ ] Intentional design throughout
- [ ] Educational value for users
- [ ] Clear visual language
- [ ] Maintains K1's uncompromising philosophy

---

## Risk Mitigation Timeline

| Week | Risk | Mitigation |
|------|------|-----------|
| 1-2 | Canvas performance not 60 FPS | Early profiling, optimize rendering |
| 3 | Wire validation too complex | Start simple, incrementally add rules |
| 4 | Preview ≠ firmware rendering | Side-by-side testing, validation tests |
| 5 | Scope creep | Strict scope control, cut nice-to-haves |

---

## Post-Phase C Future Extensions

**Phase D (Conditional - only if Phase C maintains philosophy)**:
- Pattern sharing community & library
- Additional node types (custom, shader-based)
- Audio visualization in editor
- Collaborative editing (WebSocket-based)
- Pattern templates & presets
- Advanced features (node groups, macros, subgraphs)

**But only if each addition serves the core mission.**

---

## Appendix: Task Template for .taskmaster

Each task should be entered into .taskmaster with format:

```
{
  "id": "C.1.1.1",
  "title": "Create nodeEditor/types/nodeEditor.ts",
  "description": "Define core TypeScript types for node editor state and structures",
  "details": "Implement GraphState, NodeInstance, WireInstance, NodeTypeDefinition, ParameterDefinition, ValidationError, PatternMetadata interfaces with full JSDoc documentation",
  "priority": "high",
  "dependencies": [],
  "estimatedHours": 8,
  "testStrategy": "Type compilation test, runtime validation of structure creation",
  "acceptanceCriteria": [
    "All interfaces defined with JSDoc",
    "TypeScript compiles without errors",
    "All 16 Phase B nodes can be represented",
    "Unit tests created and passing"
  ]
}
```

---

**End of Execution Roadmap**

*This roadmap is ready to be broken down into individual .taskmaster tasks. Estimated total effort: 130-155 hours.*
