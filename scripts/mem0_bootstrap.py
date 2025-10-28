#!/usr/bin/env python3
"""
Mem0 Bootstrap Script for K1.reinvented PoC

Purpose:
  - Test Mem0 connectivity and API
  - Seed institutional knowledge into memory
  - Validate query functionality
  - Provide reference implementation for agent integration

Usage:
  1. Set MEM0_API_KEY in .env or export it:
     export MEM0_API_KEY="your-api-key"

  2. Run:
     python scripts/mem0_bootstrap.py

  3. Verify output shows successful add/search operations

Mem0 Documentation: https://docs.mem0.ai/
"""

import os
import json
from datetime import datetime
from typing import Optional

# Import Mem0 SDK (install with: pip install mem0ai)
try:
    from mem0 import MemoryClient
except ImportError:
    print("ERROR: mem0ai package not installed. Install with:")
    print("  pip install mem0ai")
    exit(1)


class Mem0Bootstrap:
    """Bootstrap Mem0 with K1.reinvented institutional knowledge."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Mem0 connection."""
        self.api_key = api_key or os.getenv("MEM0_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MEM0_API_KEY not found. Set via environment or pass as argument."
            )

        # Initialize Mem0 MemoryClient with managed platform API
        self.memory = MemoryClient(api_key=self.api_key)
        self.user_id = "spectrasynq"
        self.session_count = 0

    def add_memory(
        self,
        content: str,
        memory_type: str,
        domain_tags: list[str],
        status: str = "active"
    ) -> None:
        """
        Add a memory entry to Mem0.

        Args:
            content: Full memory content (should include structure from schema)
            memory_type: One of 'decision', 'learning', 'constraint'
            domain_tags: List of domain tags (e.g., ['node_editor', 'architecture'])
            status: 'active', 'superseded', 'conditional', 'exploratory'
        """
        tags = [memory_type, status] + domain_tags
        messages = [
            {
                "role": "user",
                "content": f"Store this K1.reinvented memory:\n\n{content}",
            },
            {
                "role": "assistant",
                "content": f"I've stored this {memory_type.upper()} memory about K1.reinvented with tags: {', '.join(tags)}",
            }
        ]

        print(f"\n[ADD] {memory_type.upper()}: {domain_tags}")
        print(f"  Tags: {tags}")
        print(f"  Content preview: {content[:80]}...")

        try:
            self.memory.add(
                messages=messages,
                user_id=self.user_id
            )
            print(f"  ✅ Added successfully")
        except Exception as e:
            print(f"  ⚠️  Error: {e}")

        self.session_count += 1

    def search_memory(self, query: str, limit: int = 3) -> list:
        """
        Search Mem0 for relevant memories.

        Args:
            query: Natural language search query
            limit: Number of results to return

        Returns:
            List of memory results
        """
        print(f"\n[SEARCH] Query: '{query}'")
        try:
            # Filters are required per Mem0 API
            filters = {"user_id": self.user_id}
            results = self.memory.search(
                query=query,
                filters=filters,
                limit=limit
            )
            print(f"  Found {len(results)} results:")
            if isinstance(results, list):
                for i, result in enumerate(results[:limit], 1):
                    result_str = str(result)[:100]
                    print(f"    {i}. {result_str}...")
            return results if results else []
        except Exception as e:
            print(f"  ⚠️  Search error: {e}")
            return []

    def test_connectivity(self) -> bool:
        """Test basic Mem0 connectivity."""
        print("\n" + "="*60)
        print("MEM0 BOOTSTRAP TEST")
        print("="*60)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"User ID: {self.user_id}")
        print(f"API Key (first 10 chars): {self.api_key[:10]}...")

        try:
            # Test add
            test_messages = [
                {
                    "role": "user",
                    "content": "Test: K1.reinvented is a visual programming environment for addressable LEDs on ESP32-S3."
                },
                {
                    "role": "assistant",
                    "content": "Understood. K1.reinvented uses ESP32-S3 for LED control with visual programming."
                }
            ]
            self.memory.add(
                messages=test_messages,
                user_id=self.user_id,
            )
            print("\n✅ ADD operation successful")

            # Test search
            filters = {"user_id": self.user_id}
            results = self.memory.search(
                query="K1.reinvented visual programming LED control",
                filters=filters,
                limit=1
            )
            result_count = len(results) if results else 0
            print(f"✅ SEARCH operation successful ({result_count} results)")

            return True
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            return False


def bootstrap_k1_memories(memory_system: Mem0Bootstrap) -> None:
    """Seed K1.reinvented institutional knowledge into Mem0."""

    print("\n" + "="*60)
    print("BOOTSTRAPPING K1.REINVENTED INSTITUTIONAL KNOWLEDGE")
    print("="*60)

    # Decision: Zero-overhead node graphs
    memory_system.add_memory(
        content="""
Decision: Zero-overhead compilation of node graphs at development time

Choice: Node graphs compile to C++ at development-time; zero runtime interpretation

Reasoning:
  - Enables zero-cost abstraction: all graph logic becomes machine code
  - Predictable performance: no runtime overhead, no graph VM required
  - Firmware stays minimal: no graph interpreter code in ESP32 binary
  - Supports complex patterns: audio reactivity, FFT, layering all pre-computed

Impact:
  - Node Editor outputs JSON graphs (not runtime objects)
  - Compilation pipeline: JSON → TypeScript → C++ → firmware binary
  - Consequence: graphs cannot be modified at runtime (not a limitation; by design)
  - Firmware size remains minimal (<500KB)

Status: Active (foundational principle)
        """,
        memory_type="decision",
        domain_tags=["architecture", "node_editor"],
        status="active"
    )

    # Decision: Control Panel three-column layout
    memory_system.add_memory(
        content="""
Decision: Control Panel layout - three-column design

Choice: Three-column layout (effects, parameters, color) matching golden reference screenshot

Reasoning:
  - Clear information hierarchy: effects (left) → parameters (center) → colors (right)
  - Familiar to users: proven interaction pattern from prior design phase
  - Efficient use of space: all controls visible at once on standard displays
  - Accessibility: logical tab order (left to right)

Impact:
  - All effect selectors must be 1-column grid on the left
  - Parameter controls (sliders, toggles, dropdowns) must fit center column
  - Color management must fit right column
  - Breaking this layout requires explicit ADR + design review
  - Mobile: may need responsive collapse (future consideration)

Status: Active (validated design)
        """,
        memory_type="decision",
        domain_tags=["control_panel", "ui", "design_system"],
        status="active"
    )

    # Constraint: CODEOWNERS for Control App
    memory_system.add_memory(
        content="""
Constraint: CODEOWNERS required for k1-control-app/src/**/* changes

Rule: All changes to k1-control-app/src/ and styles/ require review from @spectrasynq

Rationale:
  - Previous agents modified global providers without review → cascade failures
  - Context providers affect 8+ routes and 12+ components
  - Unreviewed changes break authentication, device discovery, control panel

Scope: k1-control-app code only (UI, not firmware)

Enforcement:
  - GitHub CODEOWNERS file (k1-control-app/src/**/* → @spectrasynq)
  - Branch protection: no merges without approval
  - CI gate: type-check + RTL subset must pass

Status: Active (enforced guardrail)
        """,
        memory_type="constraint",
        domain_tags=["control_panel", "governance", "testing"],
        status="active"
    )

    # Learning: Global provider failures
    memory_system.add_memory(
        content="""
Learning: Global provider modifications cause cascade failures

What happened:
  Agent modified authentication provider in k1-control-app/src/contexts/auth.tsx
  to add a field (non-breaking change, or so it seemed).

  Change propagated to 8 different routes and 12+ components that relied on the old API.
  Broke: login flow, device discovery, control panel rendering.
  Resolution time: 2 hours of debugging and fixes.

Why it matters:
  Global context modifications are NOT isolated. They have systemic consequences.
  A "simple provider tweak" can break the entire app.

Consequence:
  All future provider changes MUST go through:
    1. Design review (ADR or design doc)
    2. CODEOWNERS approval (@spectrasynq)
    3. Full RTL + E2E test suite
    4. Cascading impact analysis

Category: Failure (prevents future repeats)

Status: Active (critical learning)
        """,
        memory_type="learning",
        domain_tags=["control_panel", "web_app", "governance"],
        status="active"
    )

    # Constraint: Audio I2S timing
    memory_system.add_memory(
        content="""
Constraint: Audio I2S timing is the critical path for Emotiscope

Rule: I2S audio capture cannot block LED updates; use non-blocking calls and proper timing

Rationale:
  - Emotiscope's core value: audio-visual synchronization (audio in → LEDs respond in <100ms)
  - Any audio-side latency directly breaks user experience
  - I2S misconfigurations (blocking timeouts, incorrect slot width) cause immediate FPS loss

Scope: Firmware (audio pipeline, LED driver synchronization)

Enforcement:
  - FPS benchmarking required for any audio pipeline change
  - Baseline: maintain 198+ FPS with audio active
  - Any change <190 FPS is a blocker until resolved
  - Code review for I2S/DMA configuration changes

Status: Active (critical performance constraint)
        """,
        memory_type="constraint",
        domain_tags=["firmware", "audio_pipeline", "performance"],
        status="active"
    )

    # Decision: React Flow for Node Editor
    memory_system.add_memory(
        content="""
Decision: Use React Flow for Node Editor canvas implementation

Choice: React Flow over d3.js or custom canvas solution

Reasoning:
  - React Flow provides: node/edge abstractions, connection logic, pan/zoom, multi-select
  - Cleaner API: 3-4 weeks dev vs. 6+ weeks with d3 or custom
  - Proven in production: 50+ teams use React Flow for visual editors
  - Accessibility: built-in keyboard navigation and ARIA labels
  - Testing support: React Flow provides test utilities

Rejected alternatives:
  - d3.js: too low-level; requires custom port/connection/validation logic (scope creep)
  - Custom canvas: too much implementation work; diverts from feature work
  - SVG manual: performance issues with 50+ nodes; hard to implement pan/zoom

Impact:
  - Component structure follows React Flow pattern (Provider wrapper → Canvas area)
  - Testing requires React Flow utilities (not standard Playwright)
  - Performance benchmark: test with 50+ nodes for 60fps target
  - Migration path: if performance issues arise, custom is fallback (requires 2-week spike)

Status: Active (validated choice)
        """,
        memory_type="decision",
        domain_tags=["node_editor", "web_app"],
        status="active"
    )

    # Learning: FPS bottleneck analysis
    memory_system.add_memory(
        content="""
Learning: I2S timeout misconfiguration caused FPS bottleneck

What happened:
  Firmware I2S configuration had 20ms timeout (blocking call).
  This blocked the LED update loop, causing FPS to drop from 200+ to <100.
  Root cause: I2S was waiting for audio frames; timeout was too aggressive.

  Fix: Restored configuration to Emotiscope defaults (32-bit data/slot width, STEREO mode, inverted WS, portMAX_DELAY).
  Result: FPS returned to 198-210 with no audio-side latency.

Why it matters:
  Small I2S configuration mistakes have massive FPS impact.
  This is the critical path for Emotiscope; no margin for error.

Consequence:
  - All I2S changes require FPS benchmarking (measure before/after)
  - Baseline: maintain 198+ FPS with audio active
  - Any drop below 190 FPS is an automatic blocker
  - Audio configuration is read-only; changes require deep analysis

Category: Success + Optimization (turned a critical bug into a documented constraint)

Status: Active (critical learning)
        """,
        memory_type="learning",
        domain_tags=["firmware", "audio_pipeline", "performance"],
        status="active"
    )

    # Constraint: Design tokens and dark theme
    memory_system.add_memory(
        content="""
Constraint: K1 Control App uses design tokens and dark theme only

Rule: All UI colors, spacing, typography use predefined design tokens; light theme not supported

Rationale:
  - Consistency: single source of truth for visual design
  - Accessibility: dark theme optimized for low-light environments (creative spaces)
  - Maintainability: theme changes apply globally (one config file)
  - Performance: CSS variables enable efficient theme switching (if needed in future)

Scope: K1 Control App (k1-control-app/src/styles/ and components)

Enforcement:
  - Linting: no hardcoded colors (e.g., #FFF, rgb(255,255,255)) allowed
  - All colors must come from token registry
  - Spacing must use 4px/8px/12px/16px/24px scale (no arbitrary values)
  - Code review: check for token compliance

Token categories:
  - Color: semantic scales (primary, success, error, warning) + neutrals
  - Spacing: 4px, 8px, 12px, 16px, 24px, 32px, 48px
  - Typography: font families, sizes (xs, sm, md, lg, xl), weights, line heights
  - Radius: corner radii for different component types
  - Shadows: elevation levels (z-depth) for depth

Status: Active (enforced design system)
        """,
        memory_type="constraint",
        domain_tags=["control_panel", "design_system", "accessibility"],
        status="active"
    )

    # Decision: Node categories and types
    memory_system.add_memory(
        content="""
Decision: Node graph architecture - four core node categories

Choice: Generators, Transforms, Color Operations, Compositers (as defined in NODE_ARCHITECTURE.md)

Reasoning:
  - Generators: source of variation (time, position, randomness)
  - Transforms: mathematical operations (sine, multiply, clamp)
  - Color Ops: color space conversions and palette interpolation
  - Compositers: layer and combine sub-graphs into final output
  - This categorization is intuitive for users and maps cleanly to C++ templates

Node types (non-exhaustive):
  - Generators: position_gradient, time, random
  - Transforms: sine_wave, multiply, add, clamp, modulo
  - Color Ops: palette_interpolate, hsv_to_rgb, rgb_to_hsv, gradient
  - Audio: spectrum_bin, spectrum_interpolate, spectrum_range, chromagram
  - Compositers: layer, output (final render target)

Impact:
  - Node Editor palette must mirror these categories
  - Each node type maps to a C++ template in codegen/src/
  - Adding new nodes requires: JSON definition + C++ template + palette UI

Status: Active (architectural pattern)
        """,
        memory_type="decision",
        domain_tags=["node_editor", "architecture"],
        status="active"
    )

    # Learning: Design iteration feedback
    memory_system.add_memory(
        content="""
Learning: Original wireframe needed evolution to match current capabilities

What happened:
  Original K1 Control App wireframe was created early in project (Figma Make template).
  As the project evolved (node graphs, audio reactivity, new effects), the wireframe wasn't updated.
  Agents applied new features to old layout → grew organically → broke.

  Solution: Rather than patch, redesign wireframe from scratch with current understanding.
  (This is the PoC Task #2: Node Editor Design)

Why it matters:
  Wireframes should evolve with the project.
  If the design doesn't match the current feature set, agents will struggle.
  Better to redesign holistically than incrementally patch.

Consequence:
  - Wireframes should be reviewed quarterly (or when major features land)
  - Design should drive implementation (not the other way around)
  - Future wireframe changes require Figma Make + full design review

Category: Learnings (design discipline)

Status: Active
        """,
        memory_type="learning",
        domain_tags=["control_panel", "design_system"],
        status="active"
    )

    # Decision: Figma Make for design
    memory_system.add_memory(
        content="""
Decision: Use Figma Make agent for wireframe and design system creation

Choice: Leverage Figma Make (AI design assistant) to design Control App wireframes

Reasoning:
  - Figma Make understands design tokens and design systems
  - Faster than manual design: produce polished wireframes in 2-3 days
  - Iterative: easy to refine based on feedback
  - Export-ready: Figma files can be handed to implementers or used as Storybook reference

Impact:
  - Wireframes become source-of-truth for app layout and components
  - Implementers use wireframe screenshots for visual regression testing
  - Design tokens are formalized in Figma (colors, spacing, typography)
  - Future changes follow wireframe-first workflow (design → spec → code)

Status: Active (active for Node Editor brief handoff)
        """,
        memory_type="decision",
        domain_tags=["control_panel", "design_system"],
        status="active"
    )

    # Constraint: ADR for architectural changes
    memory_system.add_memory(
        content="""
Constraint: Architectural Decision Records (ADRs) required for major changes

Rule: Create ADR for changes affecting routes, providers, global styles, core hooks, or system architecture

Rationale:
  - ADRs document the "why" behind decisions
  - Prevents agents from repeating rejected approaches
  - Provides traceability for future reference
  - Creates a historical record of architectural evolution

Scope: K1-wide (firmware + web app)

Examples of changes requiring ADR:
  - Adding or removing routes (Control Panel, Node Editor, Settings, etc.)
  - Modifying global context providers
  - Changing global styling approach (CSS-in-JS, CSS modules, design tokens)
  - Core architectural patterns (state management, data flow)

Enforcement:
  - Code review: check for ADR before approving PR
  - Branch protection: architectural PRs require ADR link
  - Archive ADRs in /docs/adr/ with numbering (ADR-0001, ADR-0002, etc.)

Status: Active (enforced process)
        """,
        memory_type="constraint",
        domain_tags=["architecture", "governance"],
        status="active"
    )

    print("\n" + "="*60)
    print(f"Bootstrap complete: {memory_system.session_count} memories added")
    print("="*60)


def test_memory_queries(memory_system: Mem0Bootstrap) -> None:
    """Test that seeded memories can be retrieved."""

    print("\n" + "="*60)
    print("TESTING MEMORY RETRIEVAL")
    print("="*60)

    test_queries = [
        "What is K1's philosophy about node graphs?",
        "Why did we choose React Flow for the Node Editor?",
        "What happened when agents modified global providers?",
        "How is the Control Panel laid out?",
        "What constraints apply to the audio pipeline?",
    ]

    for query in test_queries:
        results = memory_system.search_memory(query, limit=2)
        if results:
            print(f"  ✅ Retrieved {len(results)} relevant results")
        else:
            print(f"  ⚠️  No results found (may be normal on first run)")

    print("\n" + "="*60)
    print("✅ BOOTSTRAP COMPLETE AND TESTED")
    print("="*60)
    print("\nNext steps:")
    print("  1. Review memory entries in Mem0 dashboard")
    print("  2. Test agent integration with Task #1")
    print("  3. Validate that agents can query and cite memory")


if __name__ == "__main__":
    # Initialize Mem0
    print("Initializing Mem0...")
    bootstrap = Mem0Bootstrap()

    # Test connectivity
    if not bootstrap.test_connectivity():
        print("\n❌ Failed to connect to Mem0. Check API key and try again.")
        exit(1)

    # Bootstrap K1 memories
    bootstrap_k1_memories(bootstrap)

    # Test memory retrieval
    test_memory_queries(bootstrap)
