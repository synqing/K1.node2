---
title: Design System – Node UI + K1 Control App
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Design System – Node UI + K1 Control App

## Principles
- Consistency across Control App and Node Editor
- Clarity and efficiency for complex graph tasks
- Accessibility-first; responsive and scalable

## Design Tokens (Figma ↔ CSS Variables)
- Colors
  - `--k1-bg`, `--k1-panel`, `--k1-border`, `--k1-text`, `--k1-text-dim`, `--k1-accent`, `--k1-danger`, `--k1-success`
- Typography
  - Font: system-ui; Sizes: 12, 14, 16, 18, 20, 24; Line-heights: 1.3–1.6
- Spacing
  - Scale: 4, 8, 12, 16, 20, 24, 32
- Radii
  - `sm`: 6px, `md`: 10px, `lg`: 14px
- Elevation
  - Shadows: `xs`, `sm`, `md` aligned to Figma elevation scale

## Component Library (spec outline)
- NodeCanvas
  - Responsibilities: render nodes/wires, selection, panning/zooming
  - Props: graph, selection, viewport; Events: onAddNode, onConnect, onSelect
  - States: idle, dragging, connecting, selecting
- NodeCard
  - Variants: default, selected, error, disabled
  - Slots: header (icon+name), ports, body (params summary), footer (actions)
- Port
  - Types: input/output; States: default, hover, active, connected; Accessibility labels per port name
- WirePath
  - Curve style, hover/selected states, snapping guides
- InspectorPanel
  - Tabs: Properties, Parameters, Palette/Color, Bindings, Validation
  - Controls: sliders (speed, brightness, etc.), palette selector, bindings list
- GraphOutline
  - Search, filter by category; list with status badges
- Toolbar
  - Actions: Add node, Connect, Validate, Compile, Publish; progress indicators
- StatusToasts
  - Success/error/info; duration and dismiss; accessible live region

## Interaction Patterns
- Add Node: opens categorized palette; searchable; keyboard navigable
- Connect Ports: drag from source; invalid targets show visual rejection; keyboard connect with Enter
- Validate Graph: inline badges; panel shows list with jump-to-node
- Compile & Publish: modal or inline progress; cancel/rollback path
- Undo/Redo: standard shortcuts; history snapshots

## Accessibility Guidelines
- Keyboard: tab within canvas and inspector; arrow keys to move selection; Enter to connect; Esc to cancel
- ARIA: roles for canvas region, node elements, port controls; live regions for compile/publish feedback
- Contrast: WCAG AA; avoid relying solely on color for state; include badges/icons/text
- Reduced Motion: prefer opacity/scale over position animations; respect OS setting

## Responsive Behavior
- Breakpoints: ≥1280px (full), 960–1279px (compact), <960px (stacked panels)
- Canvas reflows; inspector collapsible; toolbar condenses to icon-only

## Theming
- Dark theme primary; support light theme variant via token switch
- Node categories use distinct, colorblind-friendly hues (with redundant shapes/icons)

## Token Mapping Example (CSS)
```css
:root {
  --k1-bg: #0a0a0a; --k1-panel: #141414; --k1-border: #2a2a2a;
  --k1-text: #e6e6e6; --k1-text-dim: #9aa0a6; --k1-accent: #6ee7f3;
  --k1-danger: #ef4444; --k1-success: #10b981;
}
```

## Implementation Notes
- Reuse `k1-control-app` primitives (`K1Button`, `K1Card`, `K1Modal`, `K1Toast`) where possible
- New components should follow existing naming and prop patterns
- Provide Storybook entries for new components to aid QA

