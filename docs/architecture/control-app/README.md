---
title: K1 Control App - Architecture Documentation
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1 Control App - Architecture Documentation

## Overview

This directory contains comprehensive architectural documentation for the K1 Control App, a React-based web application for controlling K1.reinvented LED devices.

## Documentation Structure

| Document | Purpose | Audience |
|----------|---------|----------|
| **[OVERVIEW.md](./OVERVIEW.md)** | High-level architecture, technology stack, and system context | All developers, stakeholders |
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** | Directory organization, file purposes, and conventions | New developers, maintainers |
| **[BUILD_PIPELINE.md](./BUILD_PIPELINE.md)** | Vite configuration, build process, and optimization | DevOps, build engineers |
| **[STATE_AND_DATA_FLOW.md](./STATE_AND_DATA_FLOW.md)** | State management patterns and data flow | Frontend developers |
| **[COMPONENT_HIERARCHY.md](./COMPONENT_HIERARCHY.md)** | React component organization and relationships | Frontend developers |
| **[K1_INTEGRATION.md](./K1_INTEGRATION.md)** | Device API communication and integration | API developers, testers |
| **[DEVELOPMENT_WORKFLOWS.md](./DEVELOPMENT_WORKFLOWS.md)** | Setup, debugging, and development processes | All developers |
| **[QUALITY_PLAYBOOK.md](./QUALITY_PLAYBOOK.md)** | Testing, linting, and code quality standards | All developers, QA |
| **[DIAGRAMS.md](./DIAGRAMS.md)** | Visual architecture diagrams and workflows | All audiences |

## Quick Navigation

### For New Developers
1. Start with [OVERVIEW.md](./OVERVIEW.md) for the big picture
2. Follow [DEVELOPMENT_WORKFLOWS.md](./DEVELOPMENT_WORKFLOWS.md) for setup
3. Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) to understand the codebase
4. Check [COMPONENT_HIERARCHY.md](./COMPONENT_HIERARCHY.md) for React patterns

### For DevOps/Build Engineers
1. Review [BUILD_PIPELINE.md](./BUILD_PIPELINE.md) for build configuration
2. Check [QUALITY_PLAYBOOK.md](./QUALITY_PLAYBOOK.md) for CI/CD setup
3. See [DEVELOPMENT_WORKFLOWS.md](./DEVELOPMENT_WORKFLOWS.md) for deployment processes

### For API Integration
1. Study [K1_INTEGRATION.md](./K1_INTEGRATION.md) for device communication
2. Review [STATE_AND_DATA_FLOW.md](./STATE_AND_DATA_FLOW.md) for data patterns
3. Check [DIAGRAMS.md](./DIAGRAMS.md) for visual API flows

### For Architecture Review
1. Start with [OVERVIEW.md](./OVERVIEW.md) for system context
2. Review [DIAGRAMS.md](./DIAGRAMS.md) for visual architecture
3. Check [STATE_AND_DATA_FLOW.md](./STATE_AND_DATA_FLOW.md) for proposed improvements
4. See [QUALITY_PLAYBOOK.md](./QUALITY_PLAYBOOK.md) for optimization opportunities

## Key Architectural Decisions

### Current Architecture (As Implemented)
- **Framework**: React 18.3.1 with TypeScript 5.6.3
- **Build Tool**: Vite 6.4.1 with SWC compiler
- **State Management**: Local useState with props drilling
- **UI Library**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Device Communication**: REST API with planned WebSocket support

### Planned Improvements (Tasks 2-10)
- **State Management**: Centralized K1Provider with Context API
- **Connection Resilience**: Exponential backoff with jitter
- **Parameter Optimization**: Debounced coalescing for <100ms updates
- **Testing Infrastructure**: Vitest + React Testing Library + Playwright
- **Code Quality**: ESLint + Prettier + pre-commit hooks
- **Performance**: Code splitting, memoization, bundle optimization

## Technology Stack Summary

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 18.3.1 | UI framework |
| **Language** | TypeScript | 5.6.3 | Type safety |
| **Build** | Vite | 6.4.1 | Development and build |
| **Compiler** | SWC | via plugin | Fast TS/JSX compilation |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS |
| **UI Components** | Radix UI + shadcn/ui | Latest | Accessible components |
| **Icons** | Lucide React | 0.487.0 | Icon system |
| **Charts** | Recharts | 2.15.2 | Data visualization |
| **Notifications** | Sonner | 2.0.3 | Toast notifications |

## Performance Targets

| Metric | Current | Target | Critical |
|--------|---------|--------|----------|
| **Parameter Update Latency** | ~100-200ms | <100ms | >200ms |
| **Bundle Size** | ~500KB (est.) | <500KB | >750KB |
| **Time to Interactive** | ~3s | <3s | >5s |
| **Test Coverage** | 0% | >80% | <60% |

## Related Documentation

### External References
- [K1 Firmware API](../../api/K1_FIRMWARE_API.md) - Complete device API reference
- [Project README](../../../k1-control-app/README.md) - Project overview
- [Development Guide](../../../k1-control-app/DEVELOPMENT.md) - Setup instructions
- [Design Specifications](../../../k1-control-app/src/DESIGN_SPECS.md) - UI/UX guidelines

### Architecture Decision Records
- [ADR-0001: FPS Targets](../../adr/ADR-0001-fps-targets.md)
- [ADR-0002: Global Brightness](../../adr/ADR-0002-global-brightness.md)
- [ADR-0003: Phase A Acceptance](../../adr/ADR-0003-phase-a-acceptance.md)

## Maintenance

### Document Updates
- **When to Update**: Architecture changes, new features, technology upgrades
- **Review Schedule**: Quarterly architecture review, monthly link validation
- **Ownership**: Frontend team maintains component docs, DevOps maintains build docs

### Feedback and Contributions
- Create issues for documentation gaps or inaccuracies
- Submit PRs for documentation improvements
- Follow the same review process as code changes

## Getting Started

```bash
# Quick start for new developers
cd k1-control-app
npm install
npm run dev

# Open http://localhost:3000
# Review DEVELOPMENT_WORKFLOWS.md for detailed setup
```

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Maintained By**: K1.reinvented Development Team