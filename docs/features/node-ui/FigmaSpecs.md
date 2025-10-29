---
title: Figma Design Specifications – Node UI
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Figma Design Specifications – Node UI

## Component Specifications & Interactive States
- NodeCanvas
  - Frames: default, with grid, selection marquee, zoom levels
  - Interactions: pan/zoom, drag node, start connect, snap, select wire
- NodeCard
  - States: default, hover, selected, error, disabled
  - Anatomy: icon+name, ports (left/right), params summary, actions
  - Variants: category icons (math, color, audio, output)
- Port
  - States: default, hover, active (dragging), connected, invalid target
  - Focus styles for keyboard navigation
- WirePath
  - Styles: default curve, hover highlight, selected thickness, error (dashed/red)
- InspectorPanel
  - Tabs: Properties, Parameters, Palette/Color, Bindings, Validation
  - Controls: sliders (speed/brightness/saturation/warmth/softness), palette selector, binding table
  - Responsive: collapsible on small screens
- GraphOutline
  - Search, filters, node list with badges (error, audio-reactive, output)
- Toolbar
  - Actions: Add, Connect, Validate, Compile, Publish; progress indicator and status badges
- StatusToasts & Activity Log
  - Success/error/info variants; queue behavior; live region

## Responsive Layout Constraints
- Breakpoints
  - ≥1280px: 3-column (outline/canvas/inspector)
  - 960–1279px: 2-column (canvas+adaptive panel)
  - <960px: stacked panels; toolbar collapses to icons
- Canvas maintains min interactive area; inspector scrolls independently

## Design Tokens
- Colors: bg/panel/border/text/accent/danger/success
- Typography: font families, sizes, line heights; headings vs body
- Spacing: 4–32 scale; grid system for panel layouts
- Radii: sm/md/lg; port shapes and node corners
- Elevation: xs/sm/md for panels, modals, toasts

## Micro-Interaction Patterns
- Hover affordances on ports/nodes; gentle elevation changes
- Wire snapping guides; snap-to-port glow
- Validation badges animate in; error shake avoided (respect reduced motion)
- Compile progress bar with pulse; publish success toast with icon
- Keyboard: Enter to connect; Esc to cancel; Cmd/Ctrl+Z/Y for undo/redo

## Prototyping Requirements for User Testing
- Prototype Flows
  - Create → Connect → Validate → Compile → Publish → Preview
  - Error handling: invalid wire, missing audio macro, compile failure
  - Palette assignment and parameter binding
- Tasks & Metrics
  - Time-to-first valid graph; error recovery steps; satisfaction ratings
  - Event instrumentation notes for future in-app analytics

## Version Control & Handoff Protocols
- Figma File Organization
  - Pages: Foundations (tokens), Components, Wireframes, Prototypes, Archive
  - Naming: `NodeCard/[Category]/[State]`, `Port/[Type]/[State]`, `Wire/[State]`, `Inspector/[Tab]`
- Variants & Auto-Layout
  - Expose properties for state (selected/error/disabled), category icons, responsive constraints
- Review Process
  - PR-style comments; change log per iteration; accessibility review checklist appended
- Developer Handoff
  - Use Figma Inspect for sizes/tokens; export tokens via style dictionary where available
  - Link to `DesignSystem.md` for exact tokens; reference example CSS vars

