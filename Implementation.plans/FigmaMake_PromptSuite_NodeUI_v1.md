---
title: Figma Make Agent Prompt Suite: Node UI (K1 Control App)
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# Figma Make Agent Prompt Suite: Node UI (K1 Control App)

**Purpose**: Generate a production-grade Node UI wireframe/prototype in Figma Make that aligns with K1’s design system, interaction patterns, and iOS/web constraints. Prompts are sequenced to minimize rework and maximize fidelity.

**How to Use**
- Run prompts in order. Do not skip ahead.
- Paste each prompt into Figma Make and execute fully before moving to the next.
- After each prompt, verify acceptance criteria; if unmet, iterate locally with focused follow-up prompts.

**Best Practices Applied**
- Front‑load context and constraints in the first prompt to reduce iterations [1].
- Break complex tasks into smaller prompts with narrow scope [1].
- Be specific about frameworks, naming, layout systems, and file structure [2].
- Use Auto Layout and responsive constraints; keep frames tidy before prompting [1].
- Treat prompts like briefing a teammate; state deliverables and acceptance tests [2].

---

## Prompt 0 — Project Setup & Guardrails

**Objective**: Initialize the Node UI project in Figma Make with strict guardrails: design system context, platform targets, naming conventions, and layout rules.

**Copy‑Paste Prompt**

> Project overview: Create the Node Graph Editor UI for the K1 Control App. It includes a canvas with nodes, ports, wires, an inspector/parameter panel, a compilation/status panel, a toolbar, a graph outline/minimap, and a preview window.
>
> Platforms: Web (desktop/tablet) primary with dark theme; iOS adaptation planned. Use Auto Layout and responsive constraints everywhere.
>
> Design system: Use K1 tokens and components per our design docs. Name tokens and components with the `k1-` prefix. Respect WCAG contrast, focus rings, reduced motion, safe areas for iOS later.
>
> Naming conventions:
> - Components: `K1/NodeCanvas`, `K1/NodeCard`, `K1/Port`, `K1/Wire`, `K1/InspectorPanel`, `K1/GraphOutline`, `K1/Toolbar`, `K1/StatusToast`, `K1/PreviewWindow`.
> - Variant props: `state` (default/hover/focus/active/disabled/error/loading/selected), `size` (sm/md/lg), `theme` (dark/light/iOS-light later), `type` for ports (scalar/field/color/output).
>
> Layout rules:
> - Root frame: desktop width 1440 × 900; responsive for 1280–1600.
> - Use a 12‑column grid (80px columns, 24px gutters) and Auto Layout on all containers.
> - Keep canvas scrollable, panels docked; toolbar top; status toasts top‑right.
>
> Deliverables: Create a clean project frame with empty placeholders for each component above, wired with Auto Layout, named per conventions. Do not add styling yet—just structure and constraints.
>
> Acceptance criteria: All components exist as top‑level placeholders with Auto Layout; names follow `K1/...`; root frame is responsive; no content overflows; tab order follows top‑left to bottom‑right.

---

## Prompt 1 — Design Tokens & Figma Variables

**Objective**: Create Figma Variables for K1 design tokens (colors, typography, spacing, radii, elevation) including interaction tokens and port/wire type colors.

**Copy‑Paste Prompt**

> Create a Figma Variables collection named `K1 Design Tokens` with groups: `color`, `typography`, `spacing`, `radius`, `elevation`, `interaction`, and `port-type`.
>
> Color tokens (dark theme):
> - Accent: `k1-accent = #6EE7F3` variants: `hover=#5BC9D1`, `pressed=#4AAAB0`, `focus-ring=rgba(110,231,243,0.2)`, `disabled=rgba(110,231,243,0.3)`.
> - Accent2: `k1-accent-2 = #A78BFA` with similar variants.
> - Warm: `k1-accent-warm = #FF8844` with similar variants.
> - Surfaces: `k1-bg=#0F1115`, `k1-surface=#1A1F2B`, `k1-surface-raised=#242C40`, `k1-surface-sunken=#151923`, `k1-border=rgba(42,50,66,0.2)`.
> - Text: `k1-text=#E6E9EF`, `k1-text-secondary=#B5BDCA`, `k1-text-disabled=#7A8194`, `k1-text-inverse=#0F1115`.
> - Semantic: `k1-success=#22DD88`, `k1-warning=#F59E0B`, `k1-error=#EF4444`, `k1-info=#6EE7F3`.
>
> Interaction tokens:
> - Focus ring: color=`k1-accent`, width=`2px`, offset=`2px`.
> - Reduced motion: boolean flag to disable animations.
>
> Port/Wire type colors:
> - `port-scalar=#F59E0B`, `port-field=#22D3EE`, `port-color=#F472B6`, `port-output=#34D399`.
>
> Typography:
> - Families: `font-sans=Inter system stack`, `font-mono=JetBrains Mono stack`.
> - Scales: `display 48/700/1.1`, `h1 32/700/1.2`, `h2 24/600/1.3`, `h3 20/600/1.4`, `h4 16/600`, `lg 16/400/1.6`, `base 14/400/1.5`, `sm 12/400/1.4`, `xs 10/500/1.2`, `button 14/600`, `code 12/400/1.5`.
>
> Spacing & radius:
> - Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40.
> - Radius scale: `xs=4`, `sm=6`, `md=10`, `lg=14`, `xl=20`, `full=9999`.
>
> Elevation:
> - `elevation-0` none, `1` subtle, `2` raised, `3` hovered, `4` overlay. Use color tokens for shadows.
>
> Map variables to component properties by default. Attach to styles used by placeholders from Prompt 0. Do not invent new names.
>
> Acceptance criteria: Variables created and applied to placeholders; all names prefixed `k1-`; contrast meets WCAG AA; focus ring tokens exist; port color variables exist; no duplicate tokens.

---

## Prompt 2 — Component States & Interactions

**Objective**: Define state matrices for all interactive components (buttons, inputs, sliders, cards, tabs) and attach Variants and Properties in Figma.

**Copy‑Paste Prompt**

> For each interactive component, create component sets with variants for `state` (default, hover, focus, active, disabled, error, loading, selected) and `size` (sm/md/lg). Use interaction tokens and elevation.
>
> Buttons: Primary, Secondary, Tertiary—implement states using `k1-accent`, surfaces, borders, focus rings, elevation changes. Note: iOS has no hover; keep web‑only hover flagged.
>
> Inputs: Text input, Slider—include focus states, error, disabled, active‑dragging (slider), placeholder color, thumb size per platform.
>
> Navigation: Nav tab—default, hover (web), focus, active‑selected, disabled. Use `k1-accent` for active indicators.
>
> Cards/Grid items: default, hover (web), focus, active‑selected, disabled; add glow when selected.
>
> Wireframe interactions: Add basic hovers for ports and wires to preview selection/glow states.
>
> Acceptance criteria: Each component has a Component Set with proper Variant properties; states visually distinct; names consistent; interactions preview in Prototype mode; iOS notes captured (no hover).

---

## Prompt 3 — Node Canvas, Layout, and Navigation

**Objective**: Build the Node Canvas layout with panels and navigation; ensure responsive behavior and information hierarchy.

**Copy‑Paste Prompt**

> Build `K1/NodeCanvas` frame with: left canvas area (scrollable), right `InspectorPanel` dock, bottom `CompilationPanel` collapsible, top `Toolbar`, and `GraphOutline` minimap overlay.
>
> Navigation: For web desktop, keep sidebar + tabs. For mobile preview, create an alternate frame that uses a bottom tab bar (to be refined in iOS prompt later).
>
> Apply grid, spacing, elevation, and radius tokens. Ensure panels snap and resize responsively.
>
> Place 3 sample `NodeCard`s on canvas with ports positioned left (inputs) and right (outputs). Include titles, metrics badge, and error badge placeholders.
>
> Acceptance criteria: Layout is responsive; all panels adhere to Auto Layout; minimap overlays correctly; sample nodes placed and readable; compilation panel collapses; no overlaps.

---

## Prompt 4 — Ports, Wires, and Connection Interactions

**Objective**: Implement interactive port connections and wire rendering behaviors for the wireframe.

**Copy‑Paste Prompt**

> Create `K1/Port` components with `type` variants: `scalar`, `field`, `color`, `output`. Use corresponding `port-type` color tokens and connected state glow.
>
> Create `K1/Wire` component using bezier curves; width/color respond to port type. Add hover/selected glow; pulse for active data.
>
> Prototype interactions: drag from an output port to an input port to create a wire; snap targets on hover; show validation error badge if incompatible types.
>
> Acceptance criteria: Drag‑to‑connect works in prototype; wires render cleanly; port colors match tokens; incompatible connections show error state; selection and keyboard focus visible.

---

## Prompt 5 — Accessibility and Validation Overlays

**Objective**: Bake in accessibility cues and validation layer mechanics to the wireframe.

**Copy‑Paste Prompt**

> Add a global accessibility layer: focus rings, skip‑to‑content, ARIA role annotations in notes, and high‑contrast view toggle.
>
> Add a validation overlay component: highlights cycles, missing inputs, type mismatches, and disconnected graphs. Toggle on/off from toolbar.
>
> Define keyboard navigation model in notes: tab order through nodes, ports, inspector controls; arrow keys nudge selected node; enter opens inspector.
>
> Acceptance criteria: Focus rings visible; high‑contrast toggle works; validation overlay highlights at least 4 error types; keyboard navigation notes documented and prototyped where possible.

---

## Prompt 6 — Prototyping Flows & Handoff Protocol

**Objective**: Add prototype flows for core tasks and document handoff details for engineering.

**Copy‑Paste Prompt**

> Create prototypes for flows:
> - Add and connect nodes, adjust parameters, compile, view status toasts.
> - Invalid graph shows validation overlay; fix and recompile.
> - Toggle preview window; switch device mock (placeholder interactions).
>
> Handoff notes:
> - Component names and variants must match `K1/...` conventions.
> - Include a tokens table exported (Figma variables list) and a components inventory page.
> - Document iOS adaptation requirements to be executed in a later prompt (safe areas, tab bar, sheets).
>
> Acceptance criteria: Prototype flows run end‑to‑end without dead ends; inventory and tokens pages exist; notes clearly map components and tokens to engineering counterparts.

---

## References
- [1] Figma Blog — “8 Essential Tips for Using Figma Make” (https://www.figma.com/blog/8-ways-to-build-with-figma-make/)
- [2] Figma Developer Docs — “Write effective prompts to guide the AI” (https://developers.figma.com/docs/figma-mcp-server/write-effective-prompts/)
- [3] Figma Make Product Page (https://www.figma.com/make/)
- [4] Figma Forum — Prompt strategies and file structuring discussions (https://forum.figma.com/ask-the-community-7/figma-make-how-to-generate-the-best-prompt-45361)
---
title: Figma Make Agent Prompt Suite: Node UI (K1 Control App)
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Design Leads, Frontend Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-28
tags: [plan, node-ui, frontend, figma-make]
related_docs: [docs/templates/FigmaMake_Prompt_Suite_Guide.md, docs/INDEX.md]
---

# Figma Make Agent Prompt Suite: Node UI (K1 Control App)
