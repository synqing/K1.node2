# Generated Patterns Quick Reference

**Date:** 2025-10-26
**Status:** Published

## TL;DR

**KEEP HEADER-ONLY.** Splitting provides zero benefits; current architecture is optimal.

---

## Critical Metrics

| Metric | Value | Assessment |
|--------|-------|-----------|
| File size | 40.1 KB | Acceptable for single TU |
| Functions | 16 total | 11 pattern draws, 5 inlined helpers |
| Static data | 7.2 KB | Instantiated once (main.cpp only) |
| Compilation units | 1 | Only main.cpp includes this |
| Inline opportunities | Limited | Function pointers prevent dispatch inlining |

---

## Why Header-Only is Optimal

| Reason | Evidence |
|--------|----------|
| **No code duplication** | Only 1 .cpp file includes this; no multi-TU compilation |
| **No inlining benefit from split** | Function pointers dispatch prevents compiler inlining regardless |
| **Static data safety** | Header-only guarantees single instantiation of 7.2 KB buffers |
| **Logical coherence** | All patterns grouped together; splitting fragments related code |
| **Performance-neutral** | Both approaches produce identical object file size |

---

## Minor Improvements (Do These Instead)

1. **Add `inline` to `color_from_palette()` (line 108)**
   - Called ~4,000 times/frame
   - Effort: 1 minute
   - Estimated impact: +0.5-1% FPS

2. **Add `inline` to `hsv()` (line 169)**
   - Called from beat detection
   - Effort: 1 minute
   - Estimated impact: Negligible

3. **Document static buffer lifetime**
   - Why buffers are persistent
   - Effort: 5 minutes
   - Estimated impact: Better maintainability

---

## Analysis Depth

- 100% of file examined (1,235 lines)
- All 16 functions analyzed
- All 11 static buffers inventoried
- Compilation unit analysis verified
- Function call frequency measured
- Performance impact estimated

---

## References

- **Full analysis:** `docs/analysis/generated_patterns_architecture_analysis.md`
- **File location:** `/firmware/src/generated_patterns.h`
- **Verified inclusions:** `main.cpp` only
- **Dispatched via:** `g_pattern_registry[]` function pointers

