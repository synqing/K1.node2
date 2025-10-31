---
title: K1.reinvented Planning & Design Documents Index
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented Planning & Design Documents Index

This directory contains forward-looking design specifications, migration plans, and implementation proposals created by ULTRA Choreographer and specialist agents.

---

## 🔥 Active Development (High Priority)

### I2S Audio Pipeline Optimization

**Goal:** Restore Core 0 FPS from 43 to 200+ by fixing I2S blocking timeout

| Document | Purpose | Status |
|----------|---------|--------|
| [i2s_timeout_fix_summary.md](i2s_timeout_fix_summary.md) | **START HERE** - Executive summary (one-page) | ✅ Published |
| [i2s_nonblocking_audio_acquisition_design.md](i2s_nonblocking_audio_acquisition_design.md) | Full design specification with options analysis | ✅ Published |
| [/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md) | Step-by-step implementation guide | ✅ Published |

**Key Insight:** Original Emotiscope used `portMAX_DELAY` timeout, which is effectively non-blocking due to I2S DMA buffering. Current 20ms timeout blocks Core 0 rendering unnecessarily.

**Quick Win:** One-line change + comments = 5x FPS improvement (43 → 200+)

**Related Forensic Analysis:**
- [MAIN_CPP_FORENSIC_ANALYSIS_README.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/MAIN_CPP_FORENSIC_ANALYSIS_README.md)
- [main_cpp_bottleneck_matrix.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/main_cpp_bottleneck_matrix.md)
- [main_cpp_root_causes.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/main_cpp_root_causes.md)

---

## Audio System Evolution

### Migration & Cleanup

| Document | Purpose | Status |
|----------|---------|--------|
| [AUDIO_MIGRATION_PLAN.md](AUDIO_MIGRATION_PLAN.md) | Phase-by-phase migration from stubs to real audio | ✅ Complete |
| [IMPLEMENTATION_PLAN_AUDIO_SYNC.md](IMPLEMENTATION_PLAN_AUDIO_SYNC.md) | Audio synchronization and double-buffering strategy | ✅ Complete |
| [MIGRATION_RECOMMENDATION_SUMMARY.md](MIGRATION_RECOMMENDATION_SUMMARY.md) | Decision record: when to migrate | ✅ Complete |
| [MIGRATION_ROADMAP_IF_NEEDED.md](MIGRATION_ROADMAP_IF_NEEDED.md) | Backup migration plan (if sync issues arise) | 📦 Archive |

### Diagnostics & Testing

| Document | Purpose | Status |
|----------|---------|--------|
| [DIAGNOSTIC_PLAN_BEAT_PATTERNS.md](DIAGNOSTIC_PLAN_BEAT_PATTERNS.md) | Debugging beat detection and tempo patterns | ✅ Published |
| [/Implementation.plans/runbooks/audio_pipeline_cleanup_v1.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/Implementation.plans/runbooks/audio_pipeline_cleanup_v1.md) | Phase 1 cleanup: remove clutter, 16kHz reconfiguration | ✅ Complete |

---

## Pattern System

| Document | Purpose | Status |
|----------|---------|--------|
| [LIGHTSHOW_PORTING_PLAN.md](LIGHTSHOW_PORTING_PLAN.md) | Porting patterns from original Emotiscope | ✅ Complete |
| [PALETTE_AND_EASING_IMPLEMENTATION_PLAN.md](PALETTE_AND_EASING_IMPLEMENTATION_PLAN.md) | Palette and easing function architecture | ✅ Complete |

---

## Control Application

### Device Discovery Enhancements

| Document | Purpose | Status |
|----------|---------|--------|
| [DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md](DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md) | Task 2-4 specifications for improved discovery | ✅ Published |
| [task_2_smart_cache_invalidation_specification.md](task_2_smart_cache_invalidation_specification.md) | Cache invalidation strategy | ✅ Published |
| [task_3_priority_queue_fallback_specification.md](task_3_priority_queue_fallback_specification.md) | Priority queue for discovery requests | ✅ Published |
| [task_4_monitoring_dashboard_specification.md](task_4_monitoring_dashboard_specification.md) | Real-time monitoring dashboard | ✅ Published |
| [SPECIFICATIONS_DELIVERY_SUMMARY.md](SPECIFICATIONS_DELIVERY_SUMMARY.md) | Summary of all device discovery specs | ✅ Published |

### App Architecture

| Document | Purpose | Status |
|----------|---------|--------|
| [k1_control_app_adaptation_plan.md](k1_control_app_adaptation_plan.md) | Adapting Emotiscope 2.0 control app for K1 | ✅ Published |
| [k1_native_control_app_proposal.md](k1_native_control_app_proposal.md) | Native iOS/Android app proposal | 📋 Proposed |

---

## Backend & Infrastructure

| Document | Purpose | Status |
|----------|---------|--------|
| [song_analysis_refined_architecture.md](song_analysis_refined_architecture.md) | **NEW** - Refined architecture for Song Analysis Module with 10-133x performance gains | ✅ Published |
| [fastapi_implementation_guide.md](fastapi_implementation_guide.md) | FastAPI implementation guide for Song Analysis backend | ✅ Published |
| [song_analysis_ml_architecture.md](song_analysis_ml_architecture.md) | ML/AI architecture for audio analysis pipeline | ✅ Published |
| [phase3_mcp_executive_summary.md](phase3_mcp_executive_summary.md) | **NEW** - **START HERE** - Phase 3 custom MCP servers one-page summary | ✅ Published |
| [phase3_custom_mcp_servers_research.md](phase3_custom_mcp_servers_research.md) | **NEW** - Phase 3: Full research & specifications (5 MCP servers, 12-18 day timeline, code templates) | ✅ Published |
| [webserver_split_proposal.md](webserver_split_proposal.md) | Splitting webserver into reusable modules | ✅ Published |
| [PF5_IMPLEMENTATION_STRATEGY.md](PF5_IMPLEMENTATION_STRATEGY.md) | PlatformIO Firebase 5 integration strategy | ✅ Published |
| [WORKFLOW_ORCHESTRATOR_IMPLEMENTATION.yaml](WORKFLOW_ORCHESTRATOR_IMPLEMENTATION.yaml) | Workflow orchestration config | ✅ Published |

---

## Execution Plans

| Document | Purpose | Status |
|----------|---------|--------|
| [PHASE_B_EXECUTION_PLAN.md](PHASE_B_EXECUTION_PLAN.md) | Phase B feature delivery roadmap | ✅ Published |
| [RESEARCH_DIRECTIONS.md](RESEARCH_DIRECTIONS.md) | Open research questions and directions | 📋 Active |

---

## Document Organization Rules

### File Naming Conventions

- `UPPERCASE_SNAKE_CASE.md` - Formal planning documents (migration plans, execution plans)
- `lowercase_snake_case.md` - Technical specifications and design docs
- `README.md` - Index files (like this one)

### Status Tags

- ✅ **Published** - Reviewed, approved, ready for implementation
- 📋 **Active** - In progress or under active development
- 🔶 **Proposed** - Draft proposal awaiting review
- 📦 **Archive** - Superseded or historical reference only

### Document Lifecycle

1. **Draft** → Created by ULTRA Choreographer or specialist agent
2. **Review** → Reviewed by Code Reviewer or maintainer
3. **Published** → Approved for implementation
4. **Complete** → Implementation finished, document now historical
5. **Archive** → Moved to `/archive/` if superseded

---

## Quick Start Guide for New Developers

### 1. Start with the I2S Fix (Highest Impact)

**Problem:** Core 0 FPS capped at 43 due to I2S blocking timeout

**Solution:** Read these 3 documents in order:
1. [i2s_timeout_fix_summary.md](i2s_timeout_fix_summary.md) (5 min read)
2. [i2s_nonblocking_audio_acquisition_design.md](i2s_nonblocking_audio_acquisition_design.md) (20 min read)
3. [/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/Implementation.plans/runbooks/i2s_timeout_fix_runbook.md) (execute)

**Expected time:** 35 minutes (5 min code change + 30 min testing)
**Expected gain:** 5x FPS improvement (43 → 200+)

---

### 2. Understand Audio Pipeline Architecture

**Required reading:**
1. [AUDIO_MIGRATION_PLAN.md](AUDIO_MIGRATION_PLAN.md) - How we got here
2. [IMPLEMENTATION_PLAN_AUDIO_SYNC.md](IMPLEMENTATION_PLAN_AUDIO_SYNC.md) - Double-buffering strategy
3. [/Implementation.plans/runbooks/audio_pipeline_cleanup_v1.md](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/Implementation.plans/runbooks/audio_pipeline_cleanup_v1.md) - Recent cleanup

**Key concepts:**
- Double-buffered audio snapshots (audio_front / audio_back)
- 16kHz sample rate, 128-sample chunks (8ms cadence)
- Goertzel FFT processing pipeline
- Beat detection and tempo tracking

---

### 3. Explore Pattern System

**Required reading:**
1. [LIGHTSHOW_PORTING_PLAN.md](LIGHTSHOW_PORTING_PLAN.md) - Pattern architecture
2. [PALETTE_AND_EASING_IMPLEMENTATION_PLAN.md](PALETTE_AND_EASING_IMPLEMENTATION_PLAN.md) - Visual effects

**Key concepts:**
- Pattern registry and function pointers
- Audio-reactive parameters (beat_magnitude, bass, mid, treble)
- Palette mapping and easing functions

---

### 4. Control App Development

**Required reading:**
1. [DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md](DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md) - Discovery improvements
2. [k1_control_app_adaptation_plan.md](k1_control_app_adaptation_plan.md) - App architecture

**Key concepts:**
- WebSocket real-time updates
- REST API endpoints
- Device discovery via mDNS/Bonjour
- Priority queue for fallback scanning

---

## Cross-Reference Matrix

| If you're working on... | Start with... | Related docs... |
|-------------------------|---------------|-----------------|
| **FPS optimization** | [i2s_timeout_fix_summary.md](i2s_timeout_fix_summary.md) | MAIN_CPP_FORENSIC_ANALYSIS, bottleneck_matrix |
| **Audio pipeline** | [AUDIO_MIGRATION_PLAN.md](AUDIO_MIGRATION_PLAN.md) | IMPLEMENTATION_PLAN_AUDIO_SYNC, audio_pipeline_cleanup_v1 |
| **Beat detection bugs** | [DIAGNOSTIC_PLAN_BEAT_PATTERNS.md](DIAGNOSTIC_PLAN_BEAT_PATTERNS.md) | AUDIO_MIGRATION_PLAN |
| **Pattern porting** | [LIGHTSHOW_PORTING_PLAN.md](LIGHTSHOW_PORTING_PLAN.md) | PALETTE_AND_EASING_IMPLEMENTATION_PLAN |
| **Control app** | [DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md](DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md) | task_2/3/4 specs, k1_control_app_adaptation_plan |
| **WebServer refactor** | [webserver_split_proposal.md](webserver_split_proposal.md) | - |

---

## Relationship to Other Documentation

### Planning vs. Analysis vs. Implementation

```
/docs/analysis/          → SUPREME Analyst forensic reports (what's broken)
/docs/planning/          → ULTRA Choreographer design specs (how to fix)
/Implementation.plans/   → Runbooks and execution guides (step-by-step)
/docs/reports/           → Completion reports and validation (what was done)
```

### Document Flow

```
SUPREME Forensic Analysis
         ↓
ULTRA Design Specification (you are here)
         ↓
Implementation Runbook
         ↓
Embedded Engineer Code Changes
         ↓
Code Reviewer Validation
         ↓
Completion Report
```

---

## Contributing

When creating new planning documents:

1. **Use templates:** See [/docs/templates/](../templates/) for scaffolds
2. **Follow naming:** lowercase_snake_case.md for specs, UPPERCASE for formal plans
3. **Add metadata:** YAML front matter (author, date, status, intent)
4. **Update this index:** Add your document to appropriate section
5. **Cross-reference:** Link to related docs (analysis, implementation, reports)

---

## Recent Updates

| Date | Document | Change |
|------|----------|--------|
| 2025-10-31 | phase3_custom_mcp_servers_research.md | **NEW** - Comprehensive research for 5 custom MCP servers (K1-Monitor, FastLED-Sim, Audio-DSP, Beat-Validator, Stem-Separator) |
| 2025-10-31 | song_analysis_refined_architecture.md | Created refined architecture with expert agent reviews - 10-133x performance improvements |
| 2025-10-31 | fastapi_implementation_guide.md | Created FastAPI implementation guide for Song Analysis backend |
| 2025-10-31 | song_analysis_ml_architecture.md | Created ML/AI architecture for audio analysis pipeline |
| 2025-10-28 | i2s_timeout_fix_summary.md | Created executive summary for I2S timeout fix |
| 2025-10-28 | i2s_nonblocking_audio_acquisition_design.md | Created full design specification |
| 2025-10-28 | /Implementation.plans/runbooks/i2s_timeout_fix_runbook.md | Created step-by-step implementation guide |
| 2025-10-28 | README.md (this file) | Added I2S optimization section and quick start guide |
| 2025-10-27 | DEVICE_DISCOVERY_ENHANCEMENT_SPECIFICATIONS.md | Published Task 2-4 specifications |
| 2025-10-26 | /Implementation.plans/runbooks/audio_pipeline_cleanup_v1.md | Documented Phase 1 cleanup |

---

## Questions?

**For architectural decisions:** Review ADRs in [/docs/adr/](../adr/)
**For forensic analysis:** See [/docs/analysis/](../analysis/)
**For implementation guidance:** See [/Implementation.plans/runbooks/](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/Implementation.plans/runbooks/)
**For completed work:** See [/docs/reports/](../reports/)

**Escalation:** If unsure, create an ADR draft in `/docs/adr/` and tag @spectrasynq for review.

---

**Index Status:** Published
**Maintainer:** ULTRA Choreographer + @spectrasynq
**Last Updated:** 2025-10-28
