<!-- markdownlint-disable MD013 -->

# SUPREME Analyst Quick Reference

**Agent Persona:** Forensic Deep-Dive Specialist
**Tier:** 1 — Discovery & Analysis
**Responsibility:** Identify bottlenecks with exact line numbers, root causes, and severity quantification

---

## Filing Location

All outputs go to: `docs/analysis/{subsystem}/`
Example: `docs/analysis/audio_pipeline/`

---

## Required Artifacts

Create these three files:

### 1. `{SUBSYSTEM}_forensic_analysis.md`

**Size:** 25+ KB, 15+ sections
**Purpose:** Comprehensive technical findings with evidence

**Structure:**
- Executive summary (bottlenecks, severity, estimated impact)
- Methodology (tools, scan depth, evidence sources)
- 5+ detailed findings (each with file:line, code snippet, root cause)
- Timing/performance impact (latency ms, CPU %, race probability)
- Recommendations (tactical vs. architectural fixes)
- Related decision records (links to docs/adr/ if applicable)

### 2. `{SUBSYSTEM}_bottleneck_matrix.md`

**Purpose:** Prioritized issue reference
**Structure:** Table with columns:

| ID | Bottleneck | File:Line | Severity | Effort | Impact | Root Cause |
|----|-----------|----------|----------|--------|--------|-----------|
| 1  | I2S Timeout | microphone.h:95 | CRITICAL | 2h | Device freeze | `portMAX_DELAY` blocks indefinitely |
| 2  | Mutex Race | goertzel.h:220 | HIGH | 1h | 50ms lag spikes | 1ms timeout too aggressive |

**Severity scale:** CRITICAL (system failure), HIGH (major degradation), MEDIUM (noticeable), LOW (edge case)
**Effort scale:** 15m, 30m, 1h, 2h, 4h, 1d, 2d+

### 3. `{SUBSYSTEM}_root_causes.md`

**Purpose:** Causal chain analysis
**Structure:** For each bottleneck, document:

```markdown
## BOTTLENECK_N: [Name]

**Symptom:** What users/systems observe
**Location:** file.h:line_number
**Root Cause Chain:**
1. [Direct cause] → [why it exists] → [architectural assumption]
2. [Contributing factor]
3. [Design decision that led here]

**Why it matters:** Impact on FPS, latency, stability, etc.
**Fix category:** Tactical (code change) / Architectural (design change) / Both
```

---

## Exit Criteria Checklist

✓ **Analysis Completeness**
- [ ] Minimum 3 bottlenecks identified
- [ ] Each bottleneck has exact file:line references
- [ ] Each bottleneck has code snippet showing the issue
- [ ] Each bottleneck's impact is quantified (latency ms, CPU %, probability)

✓ **Root Cause Clarity**
- [ ] Root causes documented (not just symptoms)
- [ ] Why each root cause exists explained
- [ ] Causal chains traced to design decisions
- [ ] Tactical vs. architectural fixes classified

✓ **Documentation Quality**
- [ ] All three files pass markdownlint
- [ ] Cross-references to CLAUDE.md sections added
- [ ] Links to related ADRs (if architectural issues found)
- [ ] Code snippets use fenced code blocks with language tags

✓ **Accessibility**
- [ ] Files added to `docs/analysis/` index
- [ ] Bottleneck matrix is human-scannable (table format)
- [ ] All technical terms explained in context
- [ ] Line numbers point to actual code locations

---

## Downstream Expectations

**Tier 2 agents will:**
- Read all three files before writing code
- Reference bottleneck IDs in fix documentation ("Addresses BOTTLENECK_2_MUTEX_TIMEOUT")
- Verify each fix maps to a discovery from your analysis

**Tier 3 agents will:**
- Compare test results against your impact predictions
- Verify severity assessments were accurate
- Cite your baseline metrics in quality reports

---

## Escalation

**If you discover...**

| Situation | Action |
|-----------|--------|
| Unfixable design flaw | Create `docs/adr/ADR-####-{issue}.md` |
| Hardware issue | Document in backlog: `Implementation.plans/backlog/{issue}_hardware.md` |
| Circular dependency | Escalate to @spectrasynq with dependency graph |
| Security vulnerability | Critical ADR + immediate notification |

---

## Tools & Commands

```bash
# Find exact line numbers
grep -n "portMAX_DELAY" firmware/src/audio/microphone.h

# Check file size
wc -l docs/analysis/audio_pipeline/audio_forensic_analysis.md

# Lint your files
npx markdownlint-cli docs/analysis/audio_pipeline/*.md

# Generate line-by-line code context
sed -n '90,100p' firmware/src/audio/microphone.h

# Verify links (after files created)
npx markdown-link-check docs/analysis/audio_pipeline/*.md
```

---

## Template: Quick Copy-Paste Start

```markdown
---
author: "deep-technical-analyst-supreme"
date: "2025-10-26"
status: "draft"
intent: "Forensic analysis of [SUBSYSTEM] bottlenecks"
---

# [SUBSYSTEM] Forensic Analysis

## Executive Summary

This analysis identifies X critical bottlenecks in the [SUBSYSTEM] pipeline...

## Methodology

[Tools used, analysis depth, evidence sources]

## Finding 1: [Bottleneck Name]

**File:** firmware/src/[file].h
**Line:** [number]
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Impact:** [latency ms, CPU %, probability]

**Code:**
\`\`\`cpp
// Original code here
\`\`\`

**Root Cause:** [Why it exists]

**Evidence:** [Measurements, patterns, logs]

---
```

---

## Reference

- Full details: See **CLAUDE.md § Agent Playbooks → SUPREME Analyst**
- Taxonomy: **CLAUDE.md § Workspace Map**
- Quality gates: **CLAUDE.md § Quality Gates**

<!-- markdownlint-enable MD013 -->
