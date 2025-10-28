---
title: Node UI Wireframes – Evaluation and Redesign Plan
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Node UI Wireframes – Evaluation and Redesign Plan

## Goals
- Deliver a clear, efficient Node Graph UI that matches the K1 firmware/codegen graph model, supports compile-and-deploy, and integrates seamlessly with the Control App.
- Improve navigation, information hierarchy, and visual consistency while meeting accessibility requirements.

## Usability Assessment Criteria
- Alignment to architecture: nodes, wires, parameters, audio-reactive flags, palette selection, compile outputs.
- Core tasks: create/edit/delete nodes, connect wires, validate graph, compile, preview, publish to device.
- Learnability: discoverability of actions (add node, connect, inspect), inline guidance, guardrails.
- Efficiency: minimal clicks for common tasks, keyboard shortcuts, smart defaults.
- Feedback: validation messages, compile status, device publish results, real-time preview state.
- Accessibility: keyboard navigation, roles/states, color contrast, focus order, reduced motion.

## Pain Points Identified (routing & interactions)
- Global navigation ambiguity between Control Panel and Node Editor; unclear context when switching.
- Insufficient hierarchy: inspector and palette controls compete for attention; parameters scattered.
- Connection affordances and snap targets not explicit; wire creation discoverability low for new users.
- Validation feedback not localized; errors shown globally rather than near offending node/wire.
- Compile/publish flow requires context switch; no inline progress or rollback.

## Redesign Recommendations
- Navigation
  - Add dedicated Node Editor entry in TopNav and persistent breadcrumb: Home › Editor › GraphName.
  - Contextual toolbar within Editor: Add Node, Connect, Validate, Compile, Publish.
- Information Hierarchy
  - Left: Graph Outline (search + list of nodes). Center: Canvas. Right: Inspector Panel.
  - Inspector tabs: Properties, Parameters, Palette/Color, Bindings, Validation.
- Visual Consistency
  - Standardize component styles with K1 design tokens (colors, spacing, radius, elevation).
  - Consistent iconography for node categories (math, color, audio, output).
- Interaction Patterns
  - Node creation: plus button, palette of categories, searchable.
  - Wire creation: drag from explicit ports; hover highlights; snap-to-valid targets; keyboard assist.
  - Validation surfaces: badges on nodes, inline messages; global summary panel.
  - Compile & publish: inline progress in toolbar; status toast + activity log.

## User Flows (mapped)
1) Create New Graph
   - New → Name → Add nodes → Connect → Validate → Compile → Publish → Preview.
2) Edit Existing Graph
   - Open Graph → Modify nodes/wires → Validate → Compile delta → Publish.
3) Import/Export
   - Import JSON → Inspect → Validate → (Auto-fix prompts) → Compile → Publish.
4) Audio-Reactive Setup
   - Add audio nodes → Connect → Validate presence of PATTERN_AUDIO_START → Compile.
5) Palette & Parameters
   - Select palette → Adjust sliders → Bind to node inputs → Preview.

## Accessibility Checklist
- Keyboard: tab order across canvas elements, toolbar, inspector; shortcuts for add/connect/validate.
- Roles: ARIA labels for nodes, ports, wires; live regions for compile/publish feedback.
- Contrast: meet WCAG AA for text and interactive elements; colorblind-safe node categories.
- Motion: respect reduced motion; avoid high-frequency animations in micro-interactions.
- Focus: clear focus indicators; no focus traps; escape closes modals.

## Wireframe Artifacts (to be produced in Figma)
- Editor shell (nav + canvas + inspector).
- Node card variants: default, selected, error, disabled.
- Ports: input/output states, hover/drag, connected.
- Wires: path styles, hover, selection handles.
- Validation badges & panel.
- Toolbar and status surfaces for compile/publish.

## Next Steps
- Translate this plan into Figma wireframes and interactive prototypes.
- Validate with 3–5 target users using defined tasks.
- Iterate and finalize for developer handoff.

