# K1.reinvented Logging Enhancement - Project Index

**Status:** Implementation Proposal (Approved for Phase 1)
**Timeline:** 4 weeks (4 phases), ~2-3 developers
**Objective:** Add rate limiting, runtime config, file logging, and observability to existing logger

---

## Quick Navigation

Choose your document based on your role:

### For Project Managers / Decision Makers
Start here → **[LOGGING_FEATURE_MATRIX.md](LOGGING_FEATURE_MATRIX.md)**
- What's being built (feature checklist)
- Timeline (4 weeks, 4 phases)
- Success criteria
- Risk assessment
- Budget (16 developer-days)

### For Firmware Engineers (Implementation)
Start here → **[Implementation Runbook](../Implementation.plans/runbooks/logging_enhancement_quick_ref.md)**
- Phase 1 checklist (4 days of work)
- Message format specifications
- Rate limiting algorithm
- Code examples (3 scenarios)
- Testing checklist

### For Technical Leads / Architects
Start here → **[LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md)** (Full document)
- Complete feature audit (55% complete, 45% to-do)
- Detailed design for each feature
- File/function changes required
- Migration strategy (backward compatible)
- Failure modes & recovery
- Complete testing strategy

### For QA / Testers
See **[Quick Ref Runbook](../Implementation.plans/runbooks/logging_enhancement_quick_ref.md)** section "Testing Checklist"
Plus **[Full Proposal](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md)** section 9 "Testing Strategy"

---

## The Problem Statement

**Current Issue:**
Audio subsystem logs 1000+ DEBUG messages per second, flooding serial output and drowning out logs from WiFi, LED driver, and other subsystems. Need to control logging frequency without recompiling firmware.

**Example:**
```
[12:34:56.100] DEBUG [A] Sample[0]: 12345
[12:34:56.101] DEBUG [A] Sample[1]: 12346
[12:34:56.102] DEBUG [A] Sample[2]: 12347
... (1000+ lines per second, other logs invisible)
```

**Proposed Solution:**
Rate limiting + runtime configuration
```
[000001] [12:34:56.100] DEBUG [C0] [A] Sample[0]: 12345   ← Rate limited to 100/sec
[000002] [12:34:56.100] DEBUG [C0] [A] Sample[1]: 12346
... (100 lines per second, other logs visible)
[000100] [12:34:56.101] WARN [C0] [I] I2S buffer underrun   ← Now visible!
```

---

## What's Being Built (Summary)

### Phase 1: Week 1 (4 Days) - CRITICAL
**Goals:** Solve audio flood, enable runtime control

- **Rate Limiting:** Cap TAG_AUDIO to 100 msgs/sec (configurable)
- **Runtime Config:** Change verbosity via webserver (no recompile)
- **Message Sequencing:** Add [000001], [000002] counter for drop detection
- **Core ID Tracking:** Show [C0] or [C1] to identify Core 0 vs Core 1 logs

**Impact:** Audio logs still work, other subsystems visible, no recompile needed to change settings

**Deliverable:** Functional rate limiting + webserver API

---

### Phase 2: Week 2 (5 Days) - IMPORTANT
**Goals:** Enable log persistence and structured output

- **File Logging:** Write logs to SPIFFS at `/logs/k1-YYYYMMDD.log`
- **JSON Format:** Optional structured output for log aggregation systems
- **Timestamp Options:** Choose format (HH:MM:SS, ISO-8601, epoch ms)
- **Log Rotation:** Daily rotation, automatic cleanup

**Impact:** Logs survive device reboot, machine-readable output, flexible formats

**Deliverable:** SPIFFS file logging + JSON format working

---

### Phase 3: Week 3 (4 Days) - NICE-TO-HAVE
**Goals:** Operational visibility

- **Statistics Tracking:** Monitor msgs/sec, dropped count, buffer usage
- **Debug Dashboard:** Web UI at `/logger` showing real-time stats
- **Live Message Stream:** Last 50 messages in dashboard
- **Performance Profiling:** CPU/memory impact metrics

**Impact:** Operators can monitor logging health without terminal access

**Deliverable:** Interactive dashboard + live statistics

---

### Phase 4: Week 4 (3 Days) - HARDENING
**Goals:** Production readiness

- **Unit Tests:** 95%+ code coverage
- **Integration Tests:** Full audio pipeline testing
- **Documentation:** User guide + deployment runbook
- **Code Review:** Security, performance, quality gates

**Impact:** Confidence in reliability, complete documentation

**Deliverable:** Production-ready system with full test coverage

---

## Key Features (Phase 1 - Immediate Impact)

| Feature | Before | After | Impact |
|---------|--------|-------|--------|
| **Audio Rate Limiting** | 1000+ msgs/sec flood | 100 msgs/sec (configurable) | Other logs visible |
| **Core ID Tracking** | No way to tell Core 0 vs 1 | [C0] or [C1] prefix | Diagnose synchronization |
| **Sequence Counter** | Can't detect dropped logs | [000001], [000002], etc. | Verify message ordering |
| **Runtime Config** | Must recompile to change level | Webserver API | No reboot needed |
| **Existing Code** | Works as-is | Still works unchanged | 100% backward compatible |

---

## Existing System (What's Already Working)

The K1.reinvented logger already has:
- ✅ Thread-safe logging (FreeRTOS mutex)
- ✅ Tag-based filtering (A, I, L, G, T, B, S, W, E, 0, 1, M, P)
- ✅ Severity levels (ERROR, WARN, INFO, DEBUG)
- ✅ Compile-time filtering (zero overhead)
- ✅ ANSI colors (red, yellow, green, blue)
- ✅ Timestamp generation (HH:MM:SS.mmm)
- ✅ Static buffers (no dynamic allocation)

**This proposal ADDS to that foundation without breaking anything.**

---

## File Structure (After Implementation)

```
NEW FILES:
  docs/planning/
    ├── LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md   ← Full 300+ line design
    ├── LOGGING_FEATURE_MATRIX.md                        ← Feature checklist
    └── LOGGING_ENHANCEMENT_README.md                    ← This file

  docs/planning/LOGGING_USER_GUIDE.md                    ← Phase 4 (user docs)

  Implementation.plans/runbooks/
    ├── logging_enhancement_quick_ref.md                 ← Developer quick ref
    └── logging_enhancement_runbook.md                   ← Phase 4 (deploy guide)

  firmware/src/logging/
    ├── logger_stats.h                                   ← NEW (Phase 1)
    ├── logger_file.h                                    ← NEW (Phase 2)
    ├── logger_file.cpp                                  ← NEW (Phase 2)
    ├── logger_json.h                                    ← NEW (Phase 2)
    ├── logger_json.cpp                                  ← NEW (Phase 2)

  firmware/src/
    └── webserver_logger_dashboard.h                     ← NEW (Phase 3)

  firmware/test/test_logger/
    ├── test_sequencing.cpp                              ← NEW (Phase 4)
    ├── test_rate_limiting.cpp                           ← NEW (Phase 4)
    ├── test_thread_safety.cpp                           ← NEW (Phase 4)
    ├── test_file_logging.cpp                            ← NEW (Phase 4)
    └── test_json_format.cpp                             ← NEW (Phase 4)

MODIFIED FILES:
  firmware/src/logging/
    ├── logger.h                                         ← Add new APIs
    ├── logger.cpp                                       ← Implement features
    └── log_config.h                                     ← Feature flags

  firmware/src/
    └── webserver.cpp                                    ← Add endpoints
```

---

## Reading Sequence

**If you have 5 minutes:**
→ Read this README

**If you have 15 minutes:**
→ Read [LOGGING_FEATURE_MATRIX.md](LOGGING_FEATURE_MATRIX.md)

**If you have 30 minutes:**
→ Read [logging_enhancement_quick_ref.md](../Implementation.plans/runbooks/logging_enhancement_quick_ref.md)

**If you have 1+ hours:**
→ Read [LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md) (full)

---

## Key Design Principles

1. **Backward Compatible**
   - Existing `LOG_*` macros work unchanged
   - Output format augmented (not replaced)
   - Can disable features via config flags
   - Zero impact if not used

2. **No Dynamic Allocation**
   - Static buffers only
   - Predictable memory footprint
   - No heap fragmentation

3. **Thread-Safe**
   - FreeRTOS mutex protection
   - Atomic message transmission
   - No message corruption
   - No Core 1 audio impact

4. **Feature-Flagged**
   - Each feature can be enabled/disabled at compile time
   - Zero overhead for disabled features
   - Runtime configuration for supported features

5. **Fail-Open Design**
   - Mutex timeout → output without synchronization (degraded)
   - Rate limit at limit → drop message (visible in stats)
   - SPIFFS full → skip file write (serial output continues)

---

## Success Metrics

### Phase 1 (Week 1)
- Rate limiting prevents TAG_AUDIO flood (100 msgs/sec works)
- Other subsystems visible in serial
- Runtime config via webserver (no recompile)
- Zero performance regression

### Phase 2 (Week 2)
- Logs persist to SPIFFS
- JSON format is valid
- Log rotation works
- Files downloadable

### Phase 3 (Week 3)
- Dashboard loads and updates live
- Stats tracking accurate
- <1ms message latency

### Phase 4 (Week 4)
- 95%+ test coverage
- All tests pass
- Zero compiler warnings
- Complete documentation

---

## Risk Summary

**Overall Risk:** LOW
- Features are isolated (new code path)
- Existing logger unchanged
- Feature-flagged (can disable if issues)
- Mutex timeout provides fallback
- No Core 1 audio changes

**Identified Risks:**
| Risk | Mitigation |
|------|-----------|
| Buffer overflow | Bounded snprintf calls + tests |
| Rate limit drops ERROR | Explicit ERROR exemption |
| Mutex contention | Rate check before mutex (quick) |
| SPIFFS full | Non-blocking writes + ring buffer |
| JSON escaping | Unit tests for all edge cases |

See **[Full Proposal section 8](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md#8-risk-mitigation)** for detailed analysis.

---

## Timeline

```
WEEK 1 (Phase 1): Rate Limiting + Runtime Config
  Mon:  Sequencing counter + Core ID tracking
  Tue:  Rate limiter infrastructure
  Wed:  Runtime config API + webserver
  Thu:  Integration testing

WEEK 2 (Phase 2): File Logging + JSON Format
  Mon:  File logging to SPIFFS
  Tue:  JSON serializer
  Wed:  Timestamp options + webserver
  Thu:  Integration testing

WEEK 3 (Phase 3): Statistics + Dashboard
  Mon:  Statistics collection
  Tue:  Dashboard HTML/CSS/JS
  Wed:  Dashboard endpoints + WebSocket
  Thu:  Performance optimization

WEEK 4 (Phase 4): Testing + Documentation
  Mon:  Unit tests (95% coverage)
  Tue:  Integration tests
  Wed:  Documentation + runbooks
  Thu:  Code review + release
```

**Effort:** 16 developer-days (or 2 weeks full-time, 1 person)

---

## Quick Decision Matrix

**Should we ship Phase 1?**
- YES: Solves the critical "audio flood" problem
- Cost: 4 days development
- Risk: Low (feature-flagged, backward compatible)
- Impact: High (other subsystems visible, runtime control)

**Should we do Phase 2?**
- YES: Enables log persistence for debugging
- Cost: 5 days development
- Risk: Medium (SPIFFS I/O, but non-blocking)
- Impact: High (logs survive reboot, machine-readable)

**Should we do Phase 3?**
- MAYBE: Operational visibility, not critical path
- Cost: 4 days development
- Risk: Low (read-only metrics)
- Impact: Medium (nice-to-have for operators)

**Should we do Phase 4?**
- YES: Essential for production (tests + docs)
- Cost: 3 days development
- Risk: None (quality improvement)
- Impact: High (confidence + documentation)

---

## Getting Started

### To Review the Proposal
1. Read [LOGGING_FEATURE_MATRIX.md](LOGGING_FEATURE_MATRIX.md) (5-10 min overview)
2. Review [LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md) (detailed design)
3. Approve Phase 1 scope

### To Begin Implementation
1. Clone the code
2. Create branch: `git checkout -b enhance/logging-phase-1`
3. Open [logging_enhancement_quick_ref.md](../Implementation.plans/runbooks/logging_enhancement_quick_ref.md)
4. Follow Phase 1 checklist

### To Review Progress
1. Check [Feature Matrix](LOGGING_FEATURE_MATRIX.md) for status
2. Run unit tests: `platformio test --filter test_logger`
3. Test webserver endpoints: `curl http://device.local/api/logger/config`

---

## FAQ

**Q: Will this break existing code?**
A: No. All existing `LOG_*` macros work unchanged. Output format is augmented but stays parseable.

**Q: Can I disable features I don't need?**
A: Yes. Each feature has a `LOG_ENABLE_*` flag in `log_config.h`. Set to 0 to disable.

**Q: How much memory does this use?**
A: ~100-200 bytes RAM total (depending on phase). All static, no dynamic allocation.

**Q: Can I change settings without rebooting?**
A: Yes (Phase 1). Use webserver API: `POST /api/logger/rate-limit?tag=A&limit=50`

**Q: What if rate limiting drops an important message?**
A: ERROR severity always passes (never rate-limited). WARN/INFO/DEBUG are rate-limited.

**Q: Do I need to recompile to change log levels?**
A: No (Phase 1 and beyond). Use webserver: `POST /api/logger/verbosity?level=WARN`

**Q: Where are the logs stored?**
A: Serial output (always). SPIFFS at `/logs/k1-YYYYMMDD.log` (Phase 2+, optional).

**Q: Can I export logs for analysis?**
A: Yes (Phase 2). JSON format is machine-readable, webserver serves files.

---

## Contact & Questions

For questions about:
- **Implementation details** → See [Full Proposal](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md)
- **Code examples** → See [Quick Ref Runbook](../Implementation.plans/runbooks/logging_enhancement_quick_ref.md) section 6
- **Testing approach** → See [Full Proposal section 9](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md#9-testing-strategy)
- **Architecture** → See [Full Proposal section 3](LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md#3-implementation-strategy)

---

## Document Version

| Date | Author | Status | Notes |
|------|--------|--------|-------|
| 2025-10-29 | Claude Agent | DRAFT | Initial proposal for review |

**Approval Status:** ⏳ Pending stakeholder review

---

## Next Steps

1. **Review:** Stakeholders review proposal (this week)
2. **Approve:** Confirm Phase 1 scope and timeline
3. **Assign:** Developer(s) assigned to Phase 1
4. **Implement:** Begin Phase 1 development (Week 1)
5. **Test:** Daily testing with audio pipeline
6. **Ship:** Phase 1 to production (end of Week 1)
7. **Iterate:** Phases 2-4 per schedule

---

## Appendix: Current Logger Status

**What's Working:**
```
✅ Thread-safe (mutex protected)
✅ Tag-based (13 tags: A, I, L, G, T, B, S, W, E, 0, 1, M, P)
✅ Severity levels (ERROR, WARN, INFO, DEBUG)
✅ Compile-time filtering (zero overhead)
✅ ANSI colors (red, yellow, green, blue, cyan, gray)
✅ Timestamp generation (HH:MM:SS.mmm)
✅ Static buffers (no dynamic allocation)
✅ Mutex timeout (10ms with degraded mode)
```

**Known Limitations (To Be Fixed):**
```
❌ No rate limiting (audio floods serial)
❌ No runtime config (must recompile to change levels)
❌ No file logging (logs lost on reboot)
❌ No JSON format (can't machine-parse)
❌ No statistics (can't see message rate, drop rate)
❌ No dashboard (no operational visibility)
```

**This proposal fixes all limitations in 4 phases over 4 weeks.**

