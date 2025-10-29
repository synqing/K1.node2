#!/usr/bin/env python3
"""
PoC Task #2 - Agent #1 (Researcher)
Gather Node Editor design context and store in Mem0

This agent:
1. Queries existing institutional memory (bootstrap + Task #1)
2. Reads Node Editor design documents
3. Extracts structured design insights
4. Stores memories for Agent #2 (Architect) to query
"""

import os
from mem0 import MemoryClient

class NodeEditorResearcher:
    def __init__(self, api_key: str):
        """Initialize Mem0 client."""
        self.memory = MemoryClient(api_key=api_key)
        self.user_id = "spectrasynq"

    def query_existing_memory(self, query: str, limit: int = 3):
        """Query existing institutional memory."""
        print(f"\n🔍 Querying memory: {query}")
        filters = {"user_id": self.user_id}
        results = self.memory.search(
            query=query,
            filters=filters,
            limit=limit
        )

        if results and 'results' in results:
            print(f"   ✓ Found {len(results['results'])} results")
            for i, result in enumerate(results['results'], 1):
                print(f"   {i}. {result['memory'][:100]}... (score: {result.get('score', 'N/A')})")
        else:
            print("   ⚠ No results found")

        return results

    def store_memory(self, content: str, metadata: dict):
        """Store a memory with metadata."""
        self.memory.add(
            content,
            user_id=self.user_id,
            metadata=metadata
        )
        print(f"   ✓ Stored: {content[:80]}...")

    def research_and_store(self):
        """Main research workflow."""
        print("\n" + "="*80)
        print("AGENT #1 (RESEARCHER): Node Editor Design Context")
        print("="*80)

        # Step 1: Query existing memory for Node Editor context
        print("\n📚 STEP 1: Query existing institutional memory")
        print("-" * 80)

        self.query_existing_memory("node architecture compilation philosophy", limit=2)
        self.query_existing_memory("K1 design system colors typography", limit=2)
        self.query_existing_memory("control panel layout patterns", limit=2)

        # Step 2: Extract design insights from Node Editor Design v5
        print("\n📝 STEP 2: Extract Node Editor Design v5 insights")
        print("-" * 80)

        # Insight 1: Figma Source
        insight_1 = (
            "Node Editor Design v5 is a Figma-exported code bundle from "
            "https://www.figma.com/design/p1ogkU52Eqa336R7rNfcz1/Node-Graph-Editor-Design. "
            "It serves as a visual reference/wireframe for the node editor UI, but is NOT "
            "production code. The bundle uses Vite + React but is a design artifact, not a "
            "functional graph editor."
        )
        self.store_memory(insight_1, {
            "category": "Learning",
            "domain": "node_editor",
            "source": "Implementation.plans/Node Graph Editor Design_v5/README.md",
            "tags": ["figma", "design_artifact", "node_editor_v5"]
        })

        # Insight 2: K1 Design System Integration
        insight_2 = (
            "K1 design system uses consistent tokens across Control App and Node Editor: "
            "Colors (--k1-bg #0a0a0a, --k1-panel #141414, --k1-accent #6ee7f3), "
            "Typography (system-ui, sizes 12-24px), Spacing (4px increments), "
            "Radii (6/10/14px). Port wire colors: Scalar #F59E0B, Field #22D3EE, "
            "Color #F472B6, Output #34D399. Dark theme is primary."
        )
        self.store_memory(insight_2, {
            "category": "Design",
            "domain": "design_system",
            "source": "k1-control-app/src/DESIGN_SPECS.md + docs/features/node-ui/DesignSystem.md",
            "tags": ["design_tokens", "colors", "typography", "node_editor", "control_panel"]
        })

        # Insight 3: Component Reuse Strategy
        insight_3 = (
            "Node Editor should reuse k1-control-app primitives (K1Button, K1Card, K1Modal, K1Toast) "
            "to maintain consistency. New node-specific components: NodeCanvas (render/pan/zoom), "
            "NodeCard (header/ports/params), Port (input/output states), WirePath (curved connections), "
            "InspectorPanel (properties/params/validation), GraphOutline (search/filter), "
            "Toolbar (add/connect/validate/compile). All follow existing naming and prop patterns."
        )
        self.store_memory(insight_3, {
            "category": "Design",
            "domain": "component_architecture",
            "source": "docs/features/node-ui/DesignSystem.md",
            "tags": ["components", "reuse", "control_panel_integration"]
        })

        # Insight 4: Interaction Patterns
        insight_4 = (
            "Node Editor interaction patterns: (1) Add Node via categorized palette (searchable, "
            "keyboard navigable), (2) Connect Ports via drag (invalid targets show visual rejection, "
            "keyboard connect with Enter), (3) Validate Graph with inline badges + panel jump-to-node, "
            "(4) Compile & Publish with modal/inline progress + cancel/rollback, (5) Undo/Redo "
            "with standard shortcuts and history snapshots."
        )
        self.store_memory(insight_4, {
            "category": "Design",
            "domain": "interaction_patterns",
            "source": "docs/features/node-ui/DesignSystem.md",
            "tags": ["ux", "interaction", "keyboard_navigation", "accessibility"]
        })

        # Insight 5: Accessibility Requirements
        insight_5 = (
            "Node Editor accessibility: Keyboard navigation (tab within canvas/inspector, arrow keys "
            "to move selection, Enter to connect, Esc to cancel), ARIA roles for canvas/nodes/ports, "
            "live regions for compile/publish feedback, WCAG AA contrast, no color-only state indication "
            "(use badges/icons/text), reduced motion support (opacity/scale over position animations). "
            "Keyboard-only operation is REQUIRED."
        )
        self.store_memory(insight_5, {
            "category": "Constraint",
            "domain": "accessibility",
            "source": "docs/features/node-ui/DesignSystem.md",
            "tags": ["a11y", "wcag", "keyboard", "aria", "reduced_motion"]
        })

        # Insight 6: Layout Integration with Control Panel
        insight_6 = (
            "Control Panel layout structure: Top nav (56px, logo/tabs/settings), Left sidebar (280px, "
            "device connection + quick actions), Main content (3 views: Control Panel/Profiling/Terminal). "
            "Node Editor should integrate as a 4th view tab with similar structure: maintain top nav, "
            "adapt sidebar for node palette/outline, use main area for canvas + inspector panel. "
            "Responsive breakpoints: ≥1280px full, 960-1279px compact, <960px stacked."
        )
        self.store_memory(insight_6, {
            "category": "Design",
            "domain": "layout_integration",
            "source": "k1-control-app/src/DESIGN_SPECS.md",
            "tags": ["layout", "control_panel", "responsive", "navigation"]
        })

        # Insight 7: Data Flow & Compilation UI
        insight_7 = (
            "Node Editor compilation UI should visualize the 4-stage pipeline from Task #1 memories: "
            "(1) Validate (check cycles, types, dangling ports), (2) Compile (JSON → C++), "
            "(3) Build (PlatformIO), (4) Deploy (OTA to device). Show progress inline or via modal "
            "with cancel/rollback. Status bar shows compile status, validation errors, and jump-to-node. "
            "Profiling view integration: show per-node performance metrics from firmware."
        )
        self.store_memory(insight_7, {
            "category": "Design",
            "domain": "compilation_ui",
            "source": "NODE_ARCHITECTURE.md learnings + DESIGN_SPECS.md",
            "tags": ["compilation", "validation", "pipeline", "profiling_integration"]
        })

        # Insight 8: Node Categories & Visual Language
        insight_8 = (
            "Node categories from Task #1: Generators (sine, noise, pulse - icons: waveforms), "
            "Transforms (scale, offset, curve - icons: function graphs), Color Operations "
            "(palette, gradient, HSV - icons: color wheels), Compositers (blend, mask, layer - "
            "icons: layer stacks). Each category has distinct colorblind-friendly hue + redundant "
            "shape/icon. Port types use color coding: Scalar (orange), Field (cyan), Color (pink), "
            "Output (green). All visual states must NOT rely solely on color (WCAG requirement)."
        )
        self.store_memory(insight_8, {
            "category": "Design",
            "domain": "node_categories",
            "source": "NODE_ARCHITECTURE.md + DesignSystem.md",
            "tags": ["node_types", "icons", "colorblind", "visual_language"]
        })

        print("\n" + "="*80)
        print("✅ AGENT #1 COMPLETE: Stored 8 design memories for Agent #2")
        print("="*80)

        return True

if __name__ == "__main__":
    api_key = os.environ.get("MEM0_API_KEY")
    if not api_key:
        print("❌ Error: MEM0_API_KEY not set")
        exit(1)

    researcher = NodeEditorResearcher(api_key)
    researcher.research_and_store()
