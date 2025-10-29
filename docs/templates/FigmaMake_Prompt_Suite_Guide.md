---
title: Figma Make Prompt Suite Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Figma Make Prompt Suite Guide

Purpose: Provide a reusable, comprehensive standard for crafting high‑quality Figma Make prompts that produce consistent, testable, and implementation‑ready outputs. This guide defines prompt structure, content rules, implementation workflow, and quality assurance methods with examples and templates.

---

## 1) Prompt Structure Requirements

- Title and Intent
  - Short, descriptive prompt title (e.g., “Prompt 2 — Component States & Interactions”).
  - One‑sentence intent describing what Figma Make should accomplish.
- Context
  - Product area, platform targets (web/iOS), and relevant design system constraints.
  - Where the screen/flow fits and dependencies that must be respected.
- Inputs
  - Existing frames/components to reference, design tokens, and required variables.
  - Links or identifiers for assets; name prefixes required (e.g., `K1/...`).
- Constraints
  - Layout systems (Auto Layout, grid), responsiveness, accessibility (WCAG AA), reduced motion, iOS safe areas.
  - Naming conventions, variant properties, file organization rules.
- Expected Output
  - What Figma Make should generate or modify (component sets, variables, layout changes, prototypes).
  - Scope boundaries and non‑goals.
- Deliverables
  - Explicit artifacts (e.g., Component Set with `state` and `size` variants; Variables collection created and applied).
- Acceptance Criteria (Mandatory)
  - Testable checks (e.g., “Auto Layout applied to all containers”, “Focus ring visible”, “No overflow at 1280–1600 widths”).
- Platform Notes
  - Web vs iOS differences (e.g., hover is web‑only; iOS uses tab bar and sheet presentations).
- Iteration Notes
  - How to request small fixes if acceptance criteria aren’t met; encourage narrow follow‑ups.

Formatting Standards
- Use numbered prompts (Prompt 0, 1, 2…) with clear section headers.
- Use consistent component and token naming (prefix like `K1/...`, `k1-...`).
- Use bullets for constraints and deliverables; keep sentences active and specific.
- Use code fences for tokens, variable sets, or structured examples.
- Mark web‑only or iOS‑only behavior explicitly.

Mandatory Elements in Every Prompt
- Context, Constraints, Expected Output, Deliverables, Acceptance Criteria.
- Naming conventions and variant properties where components are involved.
- Accessibility and responsiveness considerations when UI is affected.

---

## 2) Content Guidelines

Best Practices
- Front‑load context and constraints in the first prompt to reduce iterations.
- Be specific: name components, variants, tokens, and expected behaviors.
- Break complex tasks into smaller prompts; avoid multi‑concern prompts.
- Align with the design system: use existing tokens, variables, and component patterns.
- Write measurable acceptance criteria; avoid subjective phrases (e.g., “looks nice”).
- Add scope boundaries and non‑goals to limit unintended changes.
- Keep language directive and unambiguous; treat it like briefing a teammate.

Common Pitfalls to Avoid
- Missing acceptance criteria or vague outputs.
- Omitting Auto Layout and responsiveness rules.
- Mixing multiple unrelated tasks (navigation, tokens, animations) into one prompt.
- Inconsistent naming or missing prefixes.
- Forgetting platform differences (hover states on iOS, safe areas).
- Ignoring accessibility (focus rings, high contrast, reduced motion).

Examples: Good vs Bad Prompts

Good Prompt (Component States)
```
Title: Prompt 2 — Component States & Interactions
Intent: Define state matrices and variants for buttons, inputs, sliders, tabs, and cards.
Context: K1 Control App, web primary (dark theme), iOS adaptation later. Use K1 tokens.
Constraints: Auto Layout on containers, responsive at 1280–1600 widths, WCAG AA, web hover is web‑only.
Expected Output: Component Sets with state (default, hover, focus, active, disabled, error, loading, selected) and size (sm/md/lg) variants.
Deliverables: Primary/Secondary/Tertiary Button sets; Input Text/Slider sets; Nav Tab and Card sets.
Acceptance Criteria: States visually distinct; focus ring visible; hover only on web; variables applied; prototype interactions preview.
Platform Notes: iOS has no hover; record notes for touch feedback.
```

Bad Prompt
```
Make all components better and interactive. Use our design system. Add variants. Make it responsive.
```
— Why it’s bad: vague scope, no deliverables or acceptance criteria, no constraints, no naming.

Good Prompt (Ports & Wires)
```
Title: Prompt 4 — Ports, Wires, and Connection Interactions
Intent: Implement port types, wire rendering, and drag‑to‑connect prototypes.
Context: Node Canvas in K1 Control App; use port color tokens and bezier wires; dark theme.
Constraints: Auto Layout; wire glow uses `k1-accent` focus ring; high contrast toggle respected.
Expected Output: `K1/Port` components with type variants (scalar, field, color, output) and connected state; `K1/Wire` component with hover/selected glow and pulse.
Deliverables: Interactive prototype: drag from output to input creates a wire; incompatible type shows validation error badge.
Acceptance Criteria: Ports show correct tokens; drag‑to‑connect works; keyboard focus visible; validation error appears for mismatches.
Platform Notes: Capture iOS adaptation notes (touch feedback), hover web‑only.
```

Bad Prompt
```
Add wires between nodes so it looks cool. Make connections work.
```
— Why it’s bad: subjective (“looks cool”), no tokens or variants, no testable criteria.

---

## 3) Implementation Details

Step‑by‑Step Process
- Pre‑flight Hygiene
  - Clean frames: Auto Layout, tidy names, proper constraints.
  - Identify existing tokens/variables; map required additions.
- Prompt Sequencing
  - Prompt 0: Project setup and guardrails (structure, naming, layout rules).
  - Prompt 1: Design tokens and Figma Variables.
  - Prompt 2: Component states and interactions.
  - Prompt 3: Canvas layout and navigation.
  - Prompt 4: Ports, wires, and connection interactions.
  - Prompt 5: Accessibility and validation overlays.
  - Prompt 6: Prototyping flows and handoff protocol.
- Iteration
  - After each prompt, verify acceptance criteria; if unmet, issue focused sub‑prompts (e.g., “Increase focus ring offset to 2px”).
  - If outputs drift, start fresh with a new Make file and re‑run improved prompts.

Tools and Templates
- Figma Variables collections for tokens (color, typography, spacing, radius, elevation, interaction, port‑type).
- Component Sets with Variant properties (e.g., `state`, `size`, `theme`, `type`).
- Auto Layout with responsive constraints and grid.
- Template structures (see Appendix) to standardize prompt writing and acceptance checks.

Version Control and Documentation Standards
- Store prompt suites under `Implementation.plans/` or `docs/templates/`.
- Naming: `FigmaMake_PromptSuite_<Area>_vX.Y.md`.
- Include a Changelog section with date, author, and changes.
- Reference sources (design system, Figma docs) at the end.
- Require review sign‑off before updating the canonical prompt suite.

---

## 4) Quality Assurance

Testing Methodology
- Acceptance Criteria Review
  - Check each deliverable is present and correctly named.
  - Validate Auto Layout and responsive behavior at target widths.
- Prototype Interaction Tests
  - Verify interactive flows in Prototype mode (e.g., drag‑to‑connect, tab navigation).
- Accessibility Checks
  - Focus ring visibility; keyboard navigation paths documented and usable.
  - High‑contrast toggle and reduced motion respected.
- Visual/Token Alignment
  - Verify token application (colors, elevation) and WCAG AA contrast.
- Platform Differences
  - Confirm web‑only hover; plan iOS adaptations (safe areas, tab bar, sheets).

Review and Iteration Process
- Peer Review Checklist
  - Are context and constraints explicit?
  - Are acceptance criteria testable and complete?
  - Are names consistent with conventions?
  - Are platform notes accurate?
- Iteration Cadence
  - Apply targeted fixes; avoid broad re‑prompts.
  - If multiple issues persist, reset with improved Prompt 0–2.

Why This Structure
- Reduces ambiguity and iteration by anchoring prompts to constraints and acceptance tests.
- Produces consistent, design‑system aligned outputs suitable for engineering handoff.
- Encourages modularity and traceability, easing review and future changes.

Key Guard Rails (Where/When to Apply)
- Naming conventions (`K1/...`, `k1-...`): every component, variable, and prompt.
- Layout and responsiveness: Prompt 0 and all UI prompts.
- Accessibility (focus rings, high contrast, reduced motion): all interactive prompts.
- Platform behaviors (web hover vs iOS touch): component state and navigation prompts.
- Scope boundaries and non‑goals: every prompt to prevent drift.

---

## Appendix A — Prompt Template (Copy/Paste)

```
Title: Prompt <N> — <Clear Objective>
Intent: <1 sentence describing the action>
Context: <product area, platform, design system>
Inputs: <frames/components/tokens to reference>
Constraints: <layout, responsiveness, accessibility, naming>
Expected Output: <what Make should generate/modify>
Deliverables: <explicit artifacts>
Acceptance Criteria:
- <testable check 1>
- <testable check 2>
- <testable check 3>
Platform Notes: <web/iOS differences>
Iteration Notes: <how to request fixes>
```

## Appendix B — Acceptance Criteria Template

- Auto Layout applied to all containers.
- Responsive constraints correct at target widths.
- Component names follow `K1/...` conventions.
- Variants created: `state`, `size`, `theme`, `type` where applicable.
- Tokens applied and WCAG AA contrast met.
- Focus rings visible; reduced motion respected.
- Prototype interactions run without dead ends.

## Appendix C — Peer Review Checklist

- Context and constraints are complete and explicit.
- Acceptance criteria are specific and testable.
- Names, variants, tokens are consistent with conventions.
- Platform differences are correct and flagged.
- Scope is narrow; non‑goals listed.

## References
- Figma Blog — “8 Essential Tips for Using Figma Make” https://www.figma.com/blog/8-ways-to-build-with-figma-make/
- Figma Developer Docs — “Write effective prompts to guide the AI” https://developers.figma.com/docs/figma-mcp-server/write-effective-prompts/
- Figma Make Product Page https://www.figma.com/make/

## Changelog
- 2025-10-28 — v1.0 — Initial guide authored and adopted.
