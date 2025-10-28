# Mem0 PoC Setup Instructions

**Status:** Ready to Execute
**Created:** 2025-10-29
**PoC Lead:** Claude (Agent)
**Overseer:** @spectrasynq

---

## TL;DR - Start Here

You have 3 files to get the PoC rolling:

1. **Memory Schema** (`docs/resources/memory_schema.md`) — defines what gets stored and how
2. **Bootstrap Script** (`scripts/mem0_bootstrap.py`) — seeds institutional knowledge
3. **PoC Guide** (`Implementation.plans/poc/README.md`) — execution timeline and checkpoints

**To get started (5 minutes):**

```bash
# 1. Sign up at https://app.mem0.ai/ (free tier)
# 2. Copy your API key
# 3. Set environment variable
export MEM0_API_KEY="your-key-here"

# 4. Install Mem0 SDK
pip install mem0ai

# 5. Run bootstrap
python scripts/mem0_bootstrap.py

# 6. Verify output shows ✅ BOOTSTRAP COMPLETE AND TESTED
```

That's it. You now have institutional memories seeded.

---

## What Just Got Created

### Core PoC Artifacts

| File | Purpose | Next Step |
|------|---------|-----------|
| `docs/resources/memory_schema.md` | Memory tagging conventions + extraction guidelines | Read it (10 min) |
| `scripts/mem0_bootstrap.py` | Bootstrap + test harness for Mem0 | Run it (5 min) |
| `Implementation.plans/poc/README.md` | Full PoC execution guide with timelines | Review it (15 min) |
| `Implementation.plans/poc/SETUP_INSTRUCTIONS.md` | This file | You're reading it |

### Supporting Documentation

| File | Purpose | Read When |
|------|---------|-----------|
| `/Implementation.plans/poc/node_architecture_doc.md` | Task #1 output (empty; Agent #1+#2 will fill) | After Task #1 |
| `/Implementation.plans/poc/node_editor_design_brief.md` | Task #2 output (empty; Agent #1+#2+#3 will fill) | After Task #2 |
| `/docs/reports/poc_*.md` | Assessment documents (will be created during validation) | During Phase 4 |

---

## Phase-by-Phase Execution

### PHASE 1: SETUP & BOOTSTRAP (Days 1–2)

**Your task (Captain):**
1. Sign up for Mem0 managed platform (5 min): https://app.mem0.ai/
2. Get API key from dashboard
3. Set `MEM0_API_KEY` in your shell
4. Run `python scripts/mem0_bootstrap.py`
5. Verify output shows success (10 memories added, test queries passed)

**My task (Agent):**
- Already created the bootstrap script
- Will monitor Mem0 dashboard to verify memories were added
- Will create simplified agent prompts for Task #1

**Deliverable:** Mem0 account active, 10+ seed memories, bootstrap tests passing

**Timeline:** Day 1–2 (you: 10 min; me: async monitoring)

---

### PHASE 2: TASK #1 (Days 3–5)

**Your task:**
1. Review the Task #1 prompt I create
2. Approve or suggest tweaks
3. Monitor memory usage in Mem0 dashboard (optional)

**My task:**
1. Create simplified Agent #1 prompt (Researcher): "Extract node architecture insights from NODE_ARCHITECTURE.md and store in memory"
2. Invoke Agent #1, capture output
3. Create Agent #2 prompt (Writer): "Query memory from Agent #1, synthesize Figma-ready documentation"
4. Invoke Agent #2, capture output
5. Document observations in `/docs/reports/poc_task1_review.md`

**Deliverable:**
- `/Implementation.plans/poc/node_architecture_doc.md` (agent output)
- `/docs/reports/poc_task1_review.md` (what worked, what didn't, agent behavior observations)

**Timeline:** Day 3–5 (you: 30 min total review time; me: execution)

---

### PHASE 3: TASK #2 (Days 6–12)

**Your task:**
1. Review Task #2 prompts
2. Approve or suggest adjustments
3. Review final outputs before validation phase

**My task:**
1. Create Agent #1 prompt (Researcher): "Gather Node Editor design context from NODE_ARCHITECTURE.md, wireframe, DESIGN_SPECS.md; store findings"
2. Invoke Agent #1
3. Create Agent #2 prompt (Architect): "Query Agent #1 research + Control Panel design; propose integration options"
4. Invoke Agent #2
5. Create Agent #3 prompt (Designer): "Query all prior research + K1 tokens; synthesize Figma brief"
6. Invoke Agent #3
7. Document observations in `/docs/reports/poc_task2_review.md`

**Deliverable:**
- `/Implementation.plans/poc/node_editor_design_brief.md` (agent output)
- `/docs/reports/poc_task2_review.md` (observations, handoff quality, memory usage)

**Timeline:** Day 6–12 (you: 45 min review time; me: execution + documentation)

---

### PHASE 4: VALIDATION (Days 13–14)

**Your task:**
1. Review assessment documents (I'll create them)
2. Validate success metrics

**My task:**
1. Run 5+ memory queries against Mem0: assess retrieval quality
2. Document in `/docs/reports/poc_memory_quality_assessment.md`
3. Review all agent outputs for memory citations and constraint adherence
4. Document in `/docs/reports/poc_agent_behavior_assessment.md`
5. Tally integration effort metrics (time, LOC, complexity)
6. Document in `/docs/reports/poc_integration_effort.md`

**Deliverable:**
- `/docs/reports/poc_memory_quality_assessment.md` (retrieval quality metrics)
- `/docs/reports/poc_agent_behavior_assessment.md` (agent behavior improvements)
- `/docs/reports/poc_integration_effort.md` (integration effort measurements)

**Timeline:** Day 13–14 (you: 30 min review; me: analysis + documentation)

---

### PHASE 5: DECISION & NEXT STEPS (Days 15–16)

**Your task:**
1. Review all assessment documents
2. Check success criteria (all 3 met? or 2 of 3?)
3. Make decision: GO / CONDITIONAL / NO-GO

**My task:**
1. Summarize findings in `/docs/reports/poc_summary.md`
2. If GO: create ADR (`docs/adr/ADR-####-mem0-institutional-memory.md`) and production integration plan
3. If CONDITIONAL: propose refinements and re-test strategy
4. If NO-GO: document blockers and alternative approaches

**Deliverable:**
- `/docs/reports/poc_summary.md` (executive summary)
- ADR + integration plan (if approved)
- Refinement proposal (if conditional)
- Blockers analysis (if rejected)

**Timeline:** Day 15–16 (you: 30 min decision; me: planning + documentation)

---

## Success Criteria (Go/No-Go)

You approved these three success criteria in brainstorming:

### ✅ Criterion 1: Institutional Memory Works

**What it means:** Mem0 can retrieve relevant decisions/learnings/constraints when queried

**How to validate:**
- Run queries like: "Why did we choose React Flow?" or "What went wrong with global providers?"
- Check that results are accurate, relevant, and actionable
- Target: ≥80% of results are useful

**You'll see:** In `/docs/reports/poc_memory_quality_assessment.md`

### ✅ Criterion 2: Agent Behavior Improves

**What it means:** Agents cite memory and avoid repeating past mistakes

**How to validate:**
- Review Agent #2 output from Task #1: does it cite Agent #1's research?
- Review Agent #3 output from Task #2: does it synthesize from Agents #1 and #2?
- Do agents avoid re-exploring options marked as "failed"?
- Target: ≥3 explicit memory citations per agent; ≥1 case of avoided re-exploration

**You'll see:** In `/docs/reports/poc_agent_behavior_assessment.md` with specific quotes

### ✅ Criterion 3: Integration is Simple

**What it means:** Adding Mem0 to an agent doesn't require extensive boilerplate or configuration

**How to validate:**
- Time to add memory to Agent #1: _____ min
- Time to add memory to Agent #2: _____ min
- Total boilerplate lines of code: _____ LOC
- Complexity score (1-5): _____
- Target: <30 min per agent; <20 LOC; complexity ≤2/5

**You'll see:** In `/docs/reports/poc_integration_effort.md` with timestamps

---

## Decision Logic

After reviewing all assessment documents:

```
All 3 success criteria ✅ ?

  YES (3/3 ✅):
    → APPROVED ✅
    → Proceed to production integration
    → Create ADR (docs/adr/ADR-####-mem0-institutional-memory.md)
    → Plan: integrate Mem0 into standard Claude Code workflow
    → All K1 agents will use memory going forward

  CONDITIONAL (2/3 ✅):
    → CONDITIONAL ⏳
    → Identify the 1 failing criterion
    → Propose refinement (e.g., adjust schema, refine agent prompts)
    → Re-run simplified Task #1 to validate fix (1 day turnaround)
    → Then re-assess
    → If fixed: upgrade to APPROVED
    → If still failing: escalate for decision

  REJECTED (0-1/3 ✅):
    → REJECTED ❌
    → Document blockers in docs/reports/poc_blockers.md
    → Consider alternatives (simpler memory system, different tool)
    → Archive PoC learnings for future retry
    → Move on to next approach
```

---

## Key Files You'll Interact With

### Read First (Setup)
- `docs/resources/memory_schema.md` — understand what gets stored
- `Implementation.plans/poc/README.md` — understand the PoC flow

### Review During Execution
- Task #1 outputs (after Day 5)
- Task #2 outputs (after Day 12)

### Review During Validation
- `/docs/reports/poc_memory_quality_assessment.md` (Day 13–14)
- `/docs/reports/poc_agent_behavior_assessment.md` (Day 13–14)
- `/docs/reports/poc_integration_effort.md` (Day 13–14)

### Make Decision From
- `/docs/reports/poc_summary.md` (Day 15–16)

---

## Potential Blockers & How We'll Handle Them

| Blocker | How We Handle It |
|---------|-----------------|
| Mem0 API key issues | Escalate; you try a different key or contact Mem0 support |
| Memory retrieval returns noise (irrelevant results) | Refine memory tags/schema; re-index |
| Agents don't cite memory | Adjust agent prompts to explicitly query memory before deciding |
| Integration takes >30 min | Abstract boilerplate into reusable wrapper/decorator |
| PoC tasks take longer than 2 weeks | Extend timeline; quality > speed |

All blockers have mitigation strategies. We're de-risked.

---

## What You Get If PoC Passes

If all 3 success criteria ✅:

1. **ADR**: Formal record of decision to adopt Mem0
2. **Integration Plan**: Step-by-step guide for adding Mem0 to all Claude agents
3. **Memory Governance**: Rules for what gets stored, retention policy, pruning schedule
4. **Agent Templates**: Reusable prompts for memory-integrated agents
5. **Monitoring Setup**: Dashboard/alerts to track memory usage and quality
6. **Production Ready**: Day 1 capability; integrate immediately or schedule for next sprint

---

## Timeline Summary

| Phase | Days | You (Min) | Me | Deliverable |
|-------|------|----------|----|----|
| Setup & Bootstrap | 1–2 | 10 min | Bootstrap creation | 10+ seed memories |
| Task #1 | 3–5 | 30 min | Agent execution | Node architecture doc |
| Task #2 | 6–12 | 45 min | Agent execution | Node editor brief |
| Validation | 13–14 | 30 min | Assessment | Quality metrics |
| Decision | 15–16 | 30 min | Planning | ADR + integration plan (if approved) |
| **TOTAL** | **16 days** | **145 min** | **Async execution** | **Production plan** |

---

## Next Action

**Ready to start?**

1. **Confirm** you'll do Phase 1 setup (get Mem0 API key, run bootstrap)
2. **Provide** the API key or confirm bootstrap ran successfully
3. **I'll create** Task #1 agent prompts and stand by to execute

**Or, if you have questions:**
- Review `docs/resources/memory_schema.md` (tagging conventions)
- Review `Implementation.plans/poc/README.md` (full PoC guide)
- Ask clarifications

**You're in control. Let's go! 🚀**
