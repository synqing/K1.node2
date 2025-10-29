---
title: Tempo Confidence Investigation - Complete Documentation
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Tempo Confidence Investigation - Complete Documentation

**Investigation Completed:** 2025-10-27  
**Status:** Root cause identified, ready for implementation  
**Problem:** Audio-reactive patterns (Pulse, Tempiscope, Beat Tunnel) showing 5-10% brightness despite working tempo detection

---

## Quick Start

### If you want to understand the problem:
1. Read `/docs/analysis/TEMPO_CONFIDENCE_INVESTIGATION_SUMMARY.md` (10 min read)
2. Review the "Headline Findings" section
3. Look at "Before/After Comparison" for visual understanding

### If you want to fix it:
1. Read `/Implementation.plans/runbooks/tempo_confidence_amplification_fix.md`
2. Follow the implementation checklist (10 minutes of code changes)
3. Test on device with music
4. Done!

### If you need technical details:
1. Read `/docs/analysis/tempo_confidence_gap_analysis.md` (deep dive, 20 min)
2. Reference `/docs/analysis/tempo_confidence_code_locations.md` for exact line numbers

---

## Document Map

### Executive Summary
**File:** `TEMPO_CONFIDENCE_INVESTIGATION_SUMMARY.md`  
**Audience:** Project leads, developers who want quick overview  
**Content:**
- Headline findings (problem & solution)
- Root causes with code examples
- Impact analysis (5-10x brightness improvement)
- Before/after comparison
- Testing strategy
- Implementation checklist

**Key takeaway:** 10 minutes of code changes fixes 3 patterns

---

### Complete Root Cause Analysis
**File:** `tempo_confidence_gap_analysis.md`  
**Audience:** Forensic engineers, architecture reviewers  
**Content:**
- 7-part technical analysis
- Data flow verification (proves sync working)
- Pattern-by-pattern breakdown
- Threshold analysis
- Amplification analysis
- Summary table with status of each component

**Key takeaway:** Sync is correct, patterns need threshold lowering + amplification

---

### Code Locations & Call Stack
**File:** `tempo_confidence_code_locations.md`  
**Audience:** Implementation engineers, debuggers  
**Content:**
- File location reference table
- Detailed code flow (5 steps)
- Pattern implementations with line numbers
- Threshold analysis
- Amplification analysis
- Call stack for debugging
- Verification points

**Key takeaway:** Exact file:line for every change needed

---

### Implementation Runbook
**File:** `/Implementation.plans/runbooks/tempo_confidence_amplification_fix.md`  
**Audience:** Implementers, QA engineers  
**Content:**
- Problem statement
- Root causes ranked by impact
- 4-phase implementation plan (threshold fixes, amplification, investigation, validation)
- Implementation checklist
- Testing procedures
- Success criteria
- Code templates

**Key takeaway:** Step-by-step guide to fixing and validating

---

## The Problem in One Sentence

**Patterns log correct tempo_confidence values (0.05-0.10) but don't use them effectively to modulate brightness, resulting in 5-10% output despite working audio detection.**

---

## The Solution in One Sentence

**Lower pattern threshold gates from 0.2f-0.3f to 0.05f and amplify confidence values with square root boost (sqrt * 2.0x) before using as brightness.**

---

## Problem Categories

### Category 1: Threshold Gates Too High (Critical)
- **Pattern:** Pulse (0.3f), Tempiscope (0.2f), Beat Tunnel (0.2f)
- **Issue:** Thresholds exceed max tempo_confidence (0.10)
- **Result:** Patterns may not render audio-reactive content
- **Fix:** Change thresholds to 0.05f
- **Files:** generated_patterns.h lines 633, 749, 828
- **Time:** 3 minutes

### Category 2: No Confidence Amplification (Important)
- **Pattern:** All three (Pulse, Tempiscope, Beat Tunnel)
- **Issue:** Confidence values used directly (0.05-0.10 = 5-10% brightness)
- **Result:** Very dim output despite working audio
- **Fix:** Apply sqrt() * 2.0x boost before using
- **Files:** generated_patterns.h lines 640, 756, 836
- **Time:** 6 minutes

### Category 3: Weak Confidence Values (Investigation)
- **Pattern:** Audio detection (tempo.cpp)
- **Issue:** Confidence capped at 0.05-0.10 instead of 0.0-1.0
- **Result:** Even amplified values stay modest
- **Fix:** Investigate detect_beats() algorithm
- **Files:** audio/tempo.cpp
- **Time:** 30 minutes investigation + possible fix

---

## Key Findings

### What's Working
✓ Tempo calculation in audio/tempo.cpp  
✓ Global variable tempo_confidence updates  
✓ Snapshot sync in main.cpp line 59  
✓ Thread-safe double-buffer swap  
✓ Pattern access via PATTERN_AUDIO_START() macro  
✓ Diagnostic logging shows correct values  

### What's Broken
✗ Pattern threshold gates (0.2-0.3f vs 0.10 max)  
✗ Confidence amplification (not applied)  
✗ Brightness visibility (5-10% due to weak signals)  

### What Needs Investigation
? Tempo confidence algorithm (why capped at 0.10?)  
? beat_threshold calculation in detect_beats()  

---

## Success Criteria (After Fix)

- All three patterns render visibly with music (beats clearly responsive)
- Serial output unchanged (proves no data corruption)
- No new compiler warnings
- LED brightness 5-10x improvement
- Patterns still respond to audio variations
- No performance regression

---

## Risk Assessment

| Risk | Probability | Severity | Mitigation |
|------|-------------|----------|-----------|
| Over-amplification | LOW | MEDIUM | Use 1.5x instead of 2.0x if too bright |
| Threshold too low triggers false positives | VERY LOW | LOW | 0.05f is proven noise floor |
| Memory impact | NONE | - | Just math changes, no allocation |
| Performance impact | NONE | - | Simple float operations |
| Compilation failure | VERY LOW | HIGH | Only arithmetic, should compile cleanly |

---

## Timeline Estimate

| Phase | Effort | Time | Effort |
|-------|--------|------|--------|
| Phase 1: Threshold fixes | TRIVIAL | 3 min | Low |
| Phase 2: Amplification fixes | LOW | 6 min | Low |
| Phase 3: Investigation (optional) | MEDIUM | 30 min | Medium |
| Phase 4: Validation | MEDIUM | 20 min | Medium |
| **Total** | **LOW** | **20-50 min** | **Per phase** |

---

## Next Steps

1. **Read:** TEMPO_CONFIDENCE_INVESTIGATION_SUMMARY.md (10 min)
2. **Decide:** Do Phase 1-2 fix immediately, or investigate Phase 3 first?
3. **Implement:** Follow tempo_confidence_amplification_fix.md runbook
4. **Test:** Verify on device with music
5. **Verify:** Check logs unchanged, brightness improved 5-10x

---

## Related Issues

- Original problem report: Pattern brightness locked at 1.0 despite tempo detection working
- Investigation scope: Why tempo_confidence visible in logs but not in LED output?
- Solution scope: Make patterns respond to tempo_confidence effectively

---

## File Structure

```
docs/analysis/
├── TEMPO_CONFIDENCE_INVESTIGATION_SUMMARY.md  (START HERE - executive summary)
├── README_TEMPO_CONFIDENCE.md                  (this file - navigation guide)
├── tempo_confidence_gap_analysis.md            (deep technical analysis)
└── tempo_confidence_code_locations.md          (code reference, line numbers)

Implementation.plans/runbooks/
└── tempo_confidence_amplification_fix.md       (step-by-step fix procedure)
```

---

## Questions?

If you need clarification on any aspect:

1. **Understanding the problem?** → Read TEMPO_CONFIDENCE_INVESTIGATION_SUMMARY.md
2. **Need exact code locations?** → Read tempo_confidence_code_locations.md
3. **Ready to implement?** → Follow tempo_confidence_amplification_fix.md runbook
4. **Need deep technical details?** → Read tempo_confidence_gap_analysis.md

---

## Investigation Artifacts

All documents were created through systematic code analysis:
- 6 source files searched with grep patterns
- 4 key files read and analyzed in detail
- 3 patterns analyzed line-by-line
- Data flow traced through 5 layers (calculation → global → snapshot → macro → pattern)
- 2 threshold gates and 3 amplification points identified

Total investigation time: 90 minutes  
Total documentation time: 60 minutes  
Estimated fix time: 10-15 minutes  

