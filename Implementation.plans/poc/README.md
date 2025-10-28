# Mem0 PoC Execution Guide

**Author:** Claude (Mem0 PoC)
**Date:** 2025-10-29
**Status:** In Progress
**Intent:** Grade-A++++ Proof of Concept for Mem0 institutional memory integration with K1.reinvented

---

## PoC Overview

This PoC validates that Mem0 can be integrated into the Claude Code workflow to:
1. **Build institutional memory** of K1.reinvented decisions, learnings, and constraints
2. **Enable agent handoffs** where agents query prior context before acting
3. **Measure integration ease** and memory quality improvements

**Timeline:** 2 weeks (part-time, minimal ops overhead)
**Success Criteria:**
- ✅ Memory retrieval surfaces relevant decisions automatically
- ✅ Agents visibly reference memory and avoid past mistakes
- ✅ Integration takes <30 min per agent

---

## Setup Checklist

### Phase 1: Environment & Bootstrap (Days 1–2)

- [ ] **Step 1.1**: Sign up for Mem0 managed platform (https://app.mem0.ai/)
- [ ] **Step 1.2**: Create API key from Mem0 dashboard
- [ ] **Step 1.3**: Set environment variable: `export MEM0_API_KEY="your-key"`
- [ ] **Step 1.4**: Install mem0ai package: `pip install mem0ai`
- [ ] **Step 1.5**: Run bootstrap script: `python scripts/mem0_bootstrap.py`
- [ ] **Step 1.6**: Verify in Mem0 dashboard that ~10 memories were added successfully

### Phase 2: Task #1 Execution (Days 3–5)

- [ ] **Step 2.1**: Read `/docs/resources/node_reference/NODE_ARCHITECTURE.md`
- [ ] **Step 2.2**: Invoke Agent #1 (Researcher) to extract and store learnings about node architecture
- [ ] **Step 2.3**: Invoke Agent #2 (Writer) to query memory and synthesize Figma-friendly documentation
- [ ] **Step 2.4**: Review output: `/Implementation.plans/poc/node_architecture_doc.md`
- [ ] **Step 2.5**: Document observations: `/docs/reports/poc_task1_review.md`

### Phase 3: Task #2 Execution (Days 6–12)

- [ ] **Step 3.1**: Invoke Agent #1 (Researcher) to gather Node Editor design context
- [ ] **Step 3.2**: Invoke Agent #2 (Architect) to propose integration patterns
- [ ] **Step 3.3**: Invoke Agent #3 (Designer) to synthesize Figma brief
- [ ] **Step 3.4**: Review output: `/Implementation.plans/poc/node_editor_design_brief.md`
- [ ] **Step 3.5**: Document observations: `/docs/reports/poc_task2_review.md`

### Phase 4: Validation (Days 13–14)

- [ ] **Step 4.1**: Run memory quality assessment queries
- [ ] **Step 4.2**: Document results: `/docs/reports/poc_memory_quality_assessment.md`
- [ ] **Step 4.3**: Assess agent behavior improvements
- [ ] **Step 4.4**: Document results: `/docs/reports/poc_agent_behavior_assessment.md`
- [ ] **Step 4.5**: Measure integration effort
- [ ] **Step 4.6**: Document results: `/docs/reports/poc_integration_effort.md`

### Phase 5: Decision (Days 15–16)

- [ ] **Step 5.1**: Review all assessment documents
- [ ] **Step 5.2**: Check success criteria (all 3 met?)
- [ ] **Step 5.3**: Make go/no-go decision
- [ ] **Step 5.4**: If GO: create ADR and production plan
- [ ] **Step 5.5**: If CONDITIONAL: refine and re-test
- [ ] **Step 5.6**: If NO-GO: document blockers and archive learnings

---

## Key Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `docs/resources/memory_schema.md` | Memory tagging conventions, extraction guidelines | ✅ Created |
| `scripts/mem0_bootstrap.py` | Bootstrap script and test harness | ✅ Created |
| `Implementation.plans/poc/node_architecture_doc.md` | Task #1 output (synthesized documentation) | ⏳ Pending (Task #1) |
| `Implementation.plans/poc/node_editor_design_brief.md` | Task #2 output (Figma-ready brief) | ⏳ Pending (Task #2) |
| `docs/reports/poc_task1_review.md` | Task #1 observations and findings | ⏳ Pending |
| `docs/reports/poc_task2_review.md` | Task #2 observations and findings | ⏳ Pending |
| `docs/reports/poc_memory_quality_assessment.md` | Memory retrieval quality metrics | ⏳ Pending |
| `docs/reports/poc_agent_behavior_assessment.md` | Agent behavior improvements | ⏳ Pending |
| `docs/reports/poc_integration_effort.md` | Integration time/complexity measurements | ⏳ Pending |

---

## Success Criteria (Go/No-Go Decision)

### Criterion 1: Institutional Memory Works

**Query**: Run these searches against Mem0 and verify results are actionable:
- "What is K1's philosophy about node graphs?"
- "Why did we choose React Flow?"
- "What happened when agents modified global providers?"
- "How should the Control Panel be laid out?"

**Success**: ≥80% of results are accurate and actionable
**Evidence**: Document in `poc_memory_quality_assessment.md`

### Criterion 2: Agent Behavior Improves

**Observation**: Do agents cite memory when making decisions?
- Does Agent #2 in Task #1 reference learnings from Agent #1?
- Does Agent #3 in Task #2 synthesize from both prior agents?
- Do agents avoid re-exploring options already marked as failed?

**Success**: Agents explicitly cite memory; avoid re-exploration of failed approaches
**Evidence**: Document in `poc_agent_behavior_assessment.md` with specific quotes from agent outputs

### Criterion 3: Integration is Simple

**Measurement**: How long does it take to wire Mem0 into an agent?
- Time to add memory setup to agent prompt: _____ min
- Lines of boilerplate code required: _____ LOC
- Complexity score (1-5): _____

**Success**: <30 min per agent; <20 LOC; complexity ≤2/5
**Evidence**: Document in `poc_integration_effort.md` with timestamps

---

## Decision Gate

```
All 3 criteria ✅ ?
  → YES: APPROVED - Proceed to production integration
         - Create ADR (docs/adr/ADR-####-mem0-institutional-memory.md)
         - Plan integration into standard Claude Code workflow
         - Integrate Mem0 into all K1 agents going forward

  → NO (2 of 3 ✅): CONDITIONAL - Refine and retry
         - Identify failing criterion
         - Propose refinement (schema adjustment, agent prompt improvement, etc.)
         - Re-run simplified Task #1 to validate fix (expected: 1 day turnaround)
         - Then re-assess

  → NO (0-1 of 3 ✅): REJECTED - Archive learnings
         - Document blockers in docs/reports/poc_blockers.md
         - Consider alternatives (simpler memory system, different tool)
         - Preserve PoC learnings for future retry
```

---

## Running the Bootstrap

```bash
# Install Mem0 SDK
pip install mem0ai

# Set API key
export MEM0_API_KEY="your-mem0-api-key"

# Run bootstrap
python scripts/mem0_bootstrap.py

# Expected output:
# ✅ ADD operation successful
# ✅ SEARCH operation successful
# Bootstrap complete: 10 memories added
# ✅ BOOTSTRAP COMPLETE AND TESTED
```

---

## Task #1: Document Node Architecture (Days 3–5)

### Task Overview

**Goal**: Test memory retrieval and agent handoff by synthesizing Node Architecture documentation

**Why this task?**
- Self-contained (doesn't require code changes)
- Tests memory in action (agents should cite prior research)
- Produces real artifact (Figma-friendly documentation)
- Simple enough to validate quickly; complex enough to be meaningful

### Agent Workflow

**Agent #1 (Researcher):**
```
1. Query memory: "node architecture learnings" (from bootstrap)
2. Read NODE_ARCHITECTURE.md and extract key insights
3. Store findings in memory with tags: ["decision", "learning", "node_editor"]
4. Hand off to Agent #2
```

**Agent #2 (Writer):**
```
1. Query memory: "node architecture learnings + research from Agent #1"
2. Synthesize Figma-friendly documentation
3. Cite memory sources in output (e.g., "As documented in prior research...")
4. Store final documentation in memory
5. Produce: Implementation.plans/poc/node_architecture_doc.md
```

**Success Criteria:**
- Agent #2 cites specific memories from Agent #1 (not generic knowledge)
- Documentation is clear and synthesis-oriented (not copy-paste)
- Memory entries are queryable and semantically rich

---

## Task #2: Node Editor Design Brief (Days 6–12)

### Task Overview

**Goal**: Validate full 3-agent handoff and integration pattern design with memory

**Why this task?**
- Real complexity (multiple decisions, multiple dependencies)
- Tests agent handoffs at scale (Researcher → Architect → Designer)
- Produces actionable artifact (Figma brief for design system handoff)
- Exercises memory in full pipeline

### Agent Workflow

**Agent #1 (Researcher):**
```
1. Query memory: "node editor design context"
2. Read: NODE_ARCHITECTURE.md, node_editor_design_v5 wireframe, DESIGN_SPECS.md
3. Extract and store: node types, canvas options, design constraints, integration considerations
4. Hand off to Agent #2
```

**Agent #2 (Architect):**
```
1. Query memory: "node editor research + control panel design"
2. Propose integration options (Option A/B/C) with trade-offs
3. Store trade-off analysis in memory
4. Hand off to Agent #3
```

**Agent #3 (Designer):**
```
1. Query memory: all prior research + architecture decisions + K1 design tokens
2. Synthesize Figma brief with: canvas layout, component specs, interaction specs, accessibility
3. Store: "Design brief complete, ready for Figma Make"
4. Produce: Implementation.plans/poc/node_editor_design_brief.md
```

**Success Criteria:**
- Agent #2 references specific Agent #1 research (traceable)
- Agent #3 synthesizes from both prior agents (full handoff)
- Final brief is actionable and includes architectural integration
- Memory trace shows full decision tree ("why React Flow?" → returns complete analysis chain)

---

## Next Steps

**You (Captain):**
1. Review this PoC guide and memory schema
2. Sign up for Mem0 and get API key
3. Run bootstrap script to seed memories
4. Confirm setup is working

**I (Agent):**
1. Create simplified agent prompts for Task #1 (Researcher + Writer)
2. Invoke agents with memory integration
3. Document observations and metrics

**Then we iterate:** Task #1 results → Task #2 → Validation → Decision

---

**Ready to start? Let me know when you've got the Mem0 API key, and we'll begin!**
