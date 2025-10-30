---
title: README
status: published
version: v2.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-31
next_review_due: 2026-01-31
tags: [docs, architecture]
related_docs: [song_analysis_module_architecture_review.md]
---

# Architecture Documentation

This directory contains system design documents, component interaction diagrams, and architectural decision records for the K1.reinvented platform.

---

## Latest Architecture Reviews

### Song Analysis Module Architecture Review (2025-10-31)
**Status:** Published | **Impact:** HIGH
**File:** [song_analysis_module_architecture_review.md](./song_analysis_module_architecture_review.md)

Comprehensive architectural evaluation of the proposed Song Analysis Module backend and frontend integration. Reviews technology stack choices, API protocols, real-time communication, database architecture, and queue systems with quantitative performance analysis.

**Key Findings:**
- Express.js architecture will not scale to 1000+ concurrent users
- REST API creates over/under-fetching problems (7 sequential calls for track detail = 560ms latency)
- PostgreSQL JSONB creates query performance bottlenecks (800ms sequential scans)
- Bull queue system is deprecated; migration to BullMQ required

**Recommended Stack:**
- **Backend:** NestJS with TypeScript (60-80% boilerplate reduction)
- **API Protocol:** GraphQL with Apollo Federation (50-70% latency reduction)
- **Real-time:** WebSockets with Socket.IO or GraphQL subscriptions (40-60% bandwidth savings)
- **Database:** Hybrid PostgreSQL + MongoDB + TimescaleDB (5-133x performance improvement)
- **Queue:** BullMQ with Redis Streams (30-40% throughput improvement)
- **Patterns:** CQRS, Event Sourcing, Saga Pattern

**Migration Effort:** 10-12 weeks with 3 backend engineers

---

## System Architecture Overview

### Core Components

#### Rendering Pipeline
- LED rendering architecture with FastLED integration
- Real-time audio-reactive effects
- Node/graph visual programming system

#### Graph System
- Visual graph editor with type-safe node connections
- Compilation from graphs to optimized C++ firmware
- See [k1-architecture skill](../../.claude/skills/k1-architecture/SKILL.md)

#### Audio Processing
- Beat detection (Phase 2A/2B with MIREX validation)
- Genesis Engine for audio-reactive lightshow maps
- Real-time frequency analysis (FFT, Goertzel)

#### Device Communication
- WebSocket API for control commands
- Telemetry streaming (SSE/WebSocket)
- OTA firmware updates via ESP32 partition system

---

## Architecture Call Graphs

This folder contains comprehensive, end‑to‑end audio→LED call graphs for both codebases:

- Emotiscope v1.1 (reference: Downloads/Emotiscope-2.0/Emotiscope-1/src)
- K1.reinvented (this repo: firmware/src)

### Files
- `emotiscope_v1_1.mmd` — Mermaid source for Emotiscope v1.1
- `emotiscope_v1_1.dot` — Graphviz DOT source for Emotiscope v1.1
- `k1_reinvented.mmd` — Mermaid source for K1.reinvented
- `k1_reinvented.dot` — Graphviz DOT source for K1.reinvented

### Quick Render
**Graphviz (PNG):**
```bash
dot -Tpng docs/architecture/emotiscope_v1_1.dot -o docs/architecture/out/emotiscope_v1_1.png
dot -Tpng docs/architecture/k1_reinvented.dot -o docs/architecture/out/k1_reinvented.png
```

**Mermaid (SVG/PNG) using mmdc (mermaid-cli):**
```bash
mmdc -i docs/architecture/emotiscope_v1_1.mmd -o docs/architecture/out/emotiscope_v1_1.svg
mmdc -i docs/architecture/k1_reinvented.mmd -o docs/architecture/out/k1_reinvented.svg
```

### Helper Script
- `tools/render_diagrams.sh` will attempt to render all outputs if `dot` and/or `mmdc` are installed
- Outputs are placed in `docs/architecture/out/`

---

## Architecture Decision Process

When evaluating architectural changes:

1. **Identify Impact Level** - HIGH/MEDIUM/LOW based on scalability, performance, maintainability
2. **Analyze Alternatives** - Minimum 2 alternatives with quantitative comparisons
3. **Document Trade-offs** - Performance vs complexity vs cost vs operational burden
4. **Provide Migration Paths** - Effort estimates (weeks), team size, risk assessment
5. **Reference Industry Patterns** - Cite production deployments at similar scale

For formal architectural decisions, create an ADR (Architecture Decision Record) in `/docs/adr/`.

---

## Architecture Review Template

Use this structure for new architecture reviews:

```markdown
# [Component] Architecture Review

**Author:** [Name/Role]
**Date:** YYYY-MM-DD
**Status:** [Draft/Published]
**Intent:** Brief purpose statement

## Executive Summary
- Overall assessment with impact level
- 3-5 key findings
- Recommended changes with estimated effort

## [Section 1: Technology Choice Analysis]
### Current Choice
### Critical Issues (with impact level)
### Recommended Alternative
### Migration Effort

## [Section 2-N: Additional Evaluations]
...

## Final Recommendations
Priority 1-4 roadmap with timelines

## Conclusion
ROI analysis, next steps
```

---

## Related Documentation

- **ADRs:** `/docs/adr/` - Formal architecture decisions
- **Analysis:** `/docs/analysis/` - Deep technical studies and forensics
- **Planning:** `/docs/planning/` - Future architecture proposals
- **Resources:** `/docs/resources/` - Quick reference guides and cheat sheets

---

## Index

### By Component
- **Song Analysis Module:** song_analysis_module_architecture_review.md
- **Rendering Pipeline:** (planned)
- **Graph System:** See k1-architecture skill documentation
- **Audio Processing:** (planned)

### By Topic
- **Scalability Patterns:** song_analysis_module_architecture_review.md (Section 7)
- **Database Design:** song_analysis_module_architecture_review.md (Section 4)
- **API Design:** song_analysis_module_architecture_review.md (Section 2)
- **Real-time Systems:** song_analysis_module_architecture_review.md (Section 3)
- **Queue Systems:** song_analysis_module_architecture_review.md (Section 5)
- **Security:** song_analysis_module_architecture_review.md (Section 8)
- **Observability:** song_analysis_module_architecture_review.md (Section 9)

### By Impact Level
- **HIGH:** song_analysis_module_architecture_review.md
- **MEDIUM:** (none currently)
- **LOW:** (none currently)

### By Technology
- **Backend Frameworks:** song_analysis_module_architecture_review.md (Section 1: NestJS vs Express)
- **API Protocols:** song_analysis_module_architecture_review.md (Section 2: GraphQL vs REST)
- **Databases:** song_analysis_module_architecture_review.md (Section 4: PostgreSQL + MongoDB + TimescaleDB)
- **Message Queues:** song_analysis_module_architecture_review.md (Section 5: BullMQ vs Bull vs SQS)

---

## Contributing

When adding new architecture documents:

1. Use the template structure above
2. Include **quantitative performance comparisons** (latency, throughput, resource usage)
3. Provide **concrete code examples** demonstrating recommended patterns
4. Link to relevant ADRs, analysis documents, and industry references
5. Update this README with new entries in all relevant index sections
6. Follow naming convention: `{component}_{topic}_architecture_review.md`

---

## Architecture Review Checklist

Before publishing an architecture review, verify:

- [ ] Performance impact quantified with specific metrics
- [ ] Scalability limits identified (users, data volume, throughput)
- [ ] Minimum 2 alternatives evaluated per major decision
- [ ] Migration effort estimated (weeks, team size, risk level)
- [ ] Security implications assessed
- [ ] Operational complexity documented (monitoring, deployment, maintenance)
- [ ] Industry references cited (proof of production use at similar scale)
- [ ] Code examples provided for recommended patterns
- [ ] Cross-references to ADRs and related documents added
- [ ] All index sections in this README updated

---

## Diagram Enhancement Roadmap

Future improvements for architecture diagrams:

- **Auto-render on push:** CI workflow to render PNG/SVG artifacts from DOT/Mermaid
- **Interactive HTML:** D3/Graphviz view with clickable nodes linked to source paths
- **Profiling overlay:** Annotate nodes with execution times from profiler logs
- **Code navigation index:** Map each node to file:line anchors for quick jumping
- **Generated callgraph:** ctags/clang+Graphviz to auto-extract call graphs for drift detection

---

Last Updated: 2025-10-31

