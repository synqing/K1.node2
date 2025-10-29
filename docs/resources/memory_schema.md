---
title: Mem0 Memory Schema for K1.reinvented
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Mem0 Memory Schema for K1.reinvented

**Author:** Claude (Mem0 PoC)
**Date:** 2025-10-29
**Status:** Active (PoC Phase)
**Intent:** Define structured memory categories and extraction guidelines for Claude agents working on K1.reinvented

---

## Overview

Mem0 is an intelligent memory layer that enables Claude agents to store and retrieve institutional knowledge across sessions. This schema defines what gets stored, how it's tagged, and how agents should extract and cite memories.

**Goal:** Create a queryable archive of K1.reinvented decisions, learnings, and constraints that agents can reference to avoid mistakes and maintain architectural coherence.

---

## Memory Categories

### 1. Decision

**Purpose:** Capture architectural, design, or technical choices with explicit reasoning.

**Structure:**
```
Choice: [What was decided?]
Reasoning: [Why this choice over alternatives?]
Context: [What problem was it solving?]
Impact: [How does this affect future work?]
Status: [Active/Superseded/Conditional]
```

**Examples:**

| Memory | Content |
|--------|---------|
| "Canvas library for Node Editor" | Choice: React Flow over d3 / Custom<br/>Reasoning: Cleaner node/edge API, faster dev cycle, proven production patterns<br/>Impact: Shapes component structure, influences testing approach<br/>Status: Active |
| "Control Panel layout" | Choice: Three-column (effects, parameters, color) matching golden reference<br/>Reasoning: Familiar to users, clear information hierarchy, proven in design phase<br/>Impact: All parameter controls must fit this grid; breaking this requires ADR<br/>Status: Active |
| "K1 philosophy: zero-overhead node graphs" | Choice: Graphs compile at development-time; no runtime interpretation<br/>Reasoning: Enables zero-cost abstraction; all graph logic becomes machine code<br/>Impact: Node Editor outputs JSON; compilation happens offline; no graph VM at runtime<br/>Status: Active (foundational) |

**Extraction Guidelines for Agents:**

- Store a decision when: you're choosing between options, considering a new approach, or finalizing a design
- Include: the choice, the reasoning, why you rejected alternatives, and consequences for future work
- Tag decisions when storing: `memory.add(messages, user_id="spectrasynq", tags=["decision", "node_editor"])`

---

### 2. Learning

**Purpose:** Capture discoveries from attempts—both successes and failures.

**Structure:**
```
What happened: [Describe the attempt or discovery]
Why it matters: [What did we learn?]
Consequence: [How does this change future work?]
Category: [Success / Failure / Trade-off / Optimization]
```

**Examples:**

| Memory | Content |
|--------|---------|
| "Global provider cascade failures" | What: Agents modified authentication provider in k1-control-app without ADR<br/>Consequence: Provider changes propagated to all routes; broke dependent components<br/>Learning: Global context modifications need CODEOWNERS review + ADR<br/>Category: Failure (prevents future repeats) |
| "FPS bottleneck in audio pipeline" | What: Discovered I2S timeout was blocking LED updates; fixed with portMAX_DELAY<br/>Learning: Audio-visual synchronization is critical path; never block it<br/>Consequence: All audio changes must include FPS benchmarking<br/>Category: Success + Optimization |
| "Nested Storybook setup complexity" | What: Attempted multi-level component nesting in Storybook; caused build slowdowns<br/>Learning: Keep story composition flat; use composition stories for patterns<br/>Consequence: Component library stories must be simple and isolated<br/>Category: Trade-off |

**Extraction Guidelines for Agents:**

- Store a learning when: you discover something unexpected, find a solution to a problem, or hit a blocker
- Include: what you tried, what you learned, and why it matters for future agents
- Distinguish: was this a success, failure, optimization, or trade-off?
- Tag learnings: `memory.add(messages, user_id="spectrasynq", tags=["learning", "audio_pipeline"])`

---

### 3. Constraint

**Purpose:** Document non-negotiable principles, rules, or architectural constraints.

**Structure:**
```
Constraint: [The rule or principle]
Rationale: [Why is this non-negotiable?]
Scope: [Where does this apply? (e.g., K1-wide, UI-only, firmware-only)]
Enforcement: [How do we ensure compliance?]
```

**Examples:**

| Memory | Content |
|--------|---------|
| "K1 zero-cost abstraction principle" | Constraint: Node graphs compile at dev-time to C++; zero runtime interpretation<br/>Rationale: Enables predictable performance; all graph logic becomes firmware code<br/>Scope: K1-wide (firmware + web UI)<br/>Enforcement: Code review + architecture validation |
| "Control App: CODEOWNERS required for k1-control-app/src/**" | Constraint: All changes to production code require review from @spectrasynq<br/>Rationale: Prevent cascade failures from unreviewed provider/route changes<br/>Scope: UI only (k1-control-app)<br/>Enforcement: GitHub branch protection + CODEOWNERS file |
| "Design tokens: dark theme only" | Constraint: All UI uses predefined design tokens (dark theme colors, spacing scale)<br/>Rationale: Accessibility, consistency, maintainability<br/>Scope: K1 Control App<br/>Enforcement: Linting + design system enforcement |
| "Audio I2S timing: critical path" | Constraint: I2S audio capture cannot block LED updates; use non-blocking calls<br/>Rationale: Audio-visual sync is core to Emotiscope; any latency breaks the experience<br/>Scope: Firmware<br/>Enforcement: FPS benchmarking on every audio change |

**Extraction Guidelines for Agents:**

- Store a constraint when: you discover a rule, principle, or guardrail that affects future work
- Include: the rule, why it exists, what scope it covers, and how compliance is verified
- Do NOT store constraints as suggestions; they're enforceable rules
- Tag constraints: `memory.add(messages, user_id="spectrasynq", tags=["constraint", "architecture"])`

---

## Memory Tagging Conventions

All memories should include **at least one primary tag** from the list below. Use multiple tags for cross-cutting memories.

### Primary Tags (Mutually Exclusive)

- `decision`: Architectural or design choice
- `learning`: Discovery from attempt (success/failure/optimization)
- `constraint`: Non-negotiable rule or principle

### Domain Tags (Optional, can stack)

- `node_editor`: Node Graph Editor design / implementation
- `control_panel`: Control App UI / layout / parameters
- `audio_pipeline`: Audio capture, processing, FFT, synchronization
- `firmware`: ESP32-S3 firmware, C++, FreeRTOS
- `web_app`: Frontend (React, TypeScript, testing)
- `architecture`: System design, information architecture, patterns
- `performance`: FPS, benchmarking, optimization
- `testing`: Test strategy, coverage, CI/CD gates
- `design_system`: Tokens, components, accessibility

### Status Tags (Optional)

- `active`: Currently relevant, actively used
- `superseded`: Old decision; replaced by newer approach
- `conditional`: Relevant only under specific circumstances
- `exploratory`: Tentative; may change as we learn

**Example:** A memory about switching from d3 to React Flow would be tagged:
```
tags: ["decision", "node_editor", "active"]
```

A learning about a failed approach to global state would be:
```
tags: ["learning", "web_app", "active"]
```

---

## Memory Extraction Examples

### Example 1: Agent Documents a Design Decision

**Agent prompt includes:**
```
When you make a decision, extract it to memory using this format:

Choice: [what you decided]
Reasoning: [why, considering alternatives]
Impact: [consequences for future work]
```

**Agent output:**
```
Memory to store:
Choice: Use React Flow for Node Editor canvas
Reasoning:
  - Cleaner API than d3 (node/edge abstractions built-in)
  - Faster development cycle (2-3 weeks vs. 4-6 for custom)
  - Proven in production (used by 50+ startups)
  - Better accessibility out-of-box (keyboard navigation)
  - Rejected d3 because: too low-level for this scope, requires custom port/connection logic
  - Rejected custom because: too much scope creep, diverts from feature work

Impact:
  - Component structure follows React Flow pattern (Provider → Panel → Canvas)
  - Testing requires React Flow test utilities (not standard Playwright)
  - Performance: test with 50+ nodes to verify 60fps target
  - Migration path: if performance insufficient, custom is fallback (requires 2-week spike)

Status: Active

Tags: decision, node_editor, active
```

**How it would be stored:**
```python
memory.add(
    messages=[{
        "role": "user",
        "content": "You are designing the Node Editor canvas. What technology will you use?"
    }, {
        "role": "assistant",
        "content": "Memory to store: [the extraction above]"
    }],
    user_id="spectrasynq"
)
```

### Example 2: Agent Documents a Learning

**Agent discovers an issue:**
```
I tried to modify the auth provider in k1-control-app. But this change cascaded to 8 different
routes that depended on the old provider API. It broke login flow, device discovery, and the
control panel. The fix took 2 hours of debugging.

Lesson: Never modify global context providers without CODEOWNERS review.
```

**Agent extracts to memory:**
```
Memory to store:
What happened:
  Modified authentication provider in k1-control-app/src/contexts/auth.tsx to add a new field.
  Change propagated to 8 routes and 12+ components that depended on the old API.
  Broke login, device discovery, and control panel rendering.

Why it matters:
  Global context modifications have unexpected cascades. Need governance to prevent this.

Consequence:
  All future provider changes MUST go through CODEOWNERS review + ADR process.
  Add linting rule: no provider modifications without approval.

Category: Failure (prevents future repeats)

Tags: learning, web_app, control_panel, active
```

---

## How Agents Query and Use Memory

### Query Pattern: Before Making a Decision

**Agent step 1: Query relevant memory**
```python
# Before designing the Node Editor, query past decisions
relevant_memories = memory.search(
    query="node editor design decisions and alternatives",
    user_id="spectrasynq",
    limit=5
)

# Review what was already decided
# e.g., "React Flow chosen over d3"
# e.g., "Canvas must support 50+ nodes at 60fps"
```

**Agent step 2: Use memory to inform decision**
```
Based on prior decisions in memory:
- React Flow is already chosen (active decision)
- 60fps target with 50+ nodes is the benchmark
- Accessibility (keyboard operation) is required

I will design the Node Editor following React Flow patterns,
with performance testing built in.
```

**Agent step 3: Cite memory in output**
```
Design Brief:

Canvas Implementation:
- Using React Flow (per prior decision: cleaner API, faster dev, proven in production)
- Must support 50+ nodes at 60fps (per prior benchmark constraint)
- Keyboard-only operation required (per accessibility constraint in memory)
```

### Query Pattern: Learning from Mistakes

**Agent step 1: Query failures and learnings**
```python
# Before modifying global state, check what went wrong before
risky_memories = memory.search(
    query="global provider modifications failures cascade",
    user_id="spectrasynq",
    limit=3
)

# Retrieves: "Global provider cascade failures" learning
# Shows: past mistake + consequence
```

**Agent step 2: Avoid repeating**
```
Caution: Memory shows that modifying global context providers
caused cascade failures in 8 routes.

Action: I will propose this change via ADR first (per constraint in memory).
I will NOT modify the provider directly.
```

---

## Memory Hygiene & Maintenance

### Periodic Review (Monthly)

Once per month, review memory for:
- **Accuracy**: Do stored memories match reality?
- **Relevance**: Are superseded decisions still marked as such?
- **Duplicates**: Are similar memories consolidated?
- **Gaps**: Are there decisions/learnings we forgot to capture?

**Action:** Query memories, spot-check a few random entries, update status tags if needed.

### Archival & Pruning

- **Keep**: Active decisions, constraints, recent learnings
- **Archive**: Superseded decisions (mark `superseded` tag but keep in memory)
- **Delete**: Duplicates, test/noise entries

**Action:** Every quarter, review Mem0 UI and remove low-value noise.

### Semantic Drift

Over time, memory entries may become less relevant. Mem0 handles this by returning the most semantically similar matches. If you notice irrelevant results, refine your query or tag entries more specifically.

---

## Success Metrics for Memory Quality

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Retrieval relevance** | ≥80% of search results are actionable | Run test queries; manually review results |
| **Decision traceability** | Can trace "why we chose X" back to memory | Pick a design decision; retrieve its supporting memory |
| **Constraint compliance** | Agents cite constraints before deciding | Review agent outputs; count constraint citations |
| **False positives** | <20% of results are noise or off-topic | Monitor search results; refine tags if high noise |
| **Extraction completeness** | All major decisions/learnings end up in memory | Spot-check agent sessions; did they store memories? |

---

## Next Steps

1. **PoC Phase**: Seed 15–20 bootstrap memories with K1 institutional knowledge
2. **Task #1**: Document Node Architecture with agent handoff (test memory retrieval + citation)
3. **Task #2**: Design Node Editor with 3-agent handoff (test full pipeline)
4. **Validation**: Run quality assessment queries; measure agent behavior improvements
5. **Decision**: Go/no-go on production integration

---

**Questions?** Review this schema before starting Task #1. Clarify any tagging ambiguities with the team.
