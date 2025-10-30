# Song Analysis Module → Webapp Integration Plan

This document outlines how to merge the generated “Song Analysis Module” prototype into the main `webapp/` codebase while preserving the styling and interaction character from the Figma-derived bundle.

---

## 1. Goals
- Add an `analysis` route/tab to the existing PRISM.node web application.
- Reuse the generated components (toolbar, track list, charts, preset builder, artefact manager, activity log, deploy sheet, upload modal, shortcuts panel) within the webapp framework.
- Wire components to real backend artefacts (analysis outputs, metrics, telemetry) once API bindings are available.
- Keep the distinctive visual/interaction style from the prototype while aligning with existing theme and component primitives.

---

## 2. High-Level Steps

### Step A – Extract Components
1. Create `webapp/src/components/analysis/`.
2. Copy the following from `Implementation.plans/Song Analysis Module/src/components/` into the new directory:
   - `Toolbar.tsx`
   - `TrackListItem.tsx`
   - `MetricsCard.tsx`
   - `BeatGridChart.tsx`
   - `FrequencyChart.tsx`
   - `DynamicsChart.tsx`
   - `SectionsTimeline.tsx`
   - `GraphPresetCard.tsx`
   - `ArtifactTable.tsx`
   - `ActivityLog.tsx`
   - `DeploySideSheet.tsx`
   - `UploadModal.tsx`
   - `HelpShortcuts.tsx`
   - Any helper utilities (e.g., sample data types) if needed.
3. Review `components/ui/` inside the prototype. For each primitive (button, input, badge, tabs, accordion, alert, card, table, sonner toaster):
   - If the same component exists in `webapp/src/components/ui`, adjust imports in the analysis components to point to the existing one.
   - If a variant does not exist, consider porting it or extending the webapp version accordingly.
4. Keep inline CSS variable usage (`var(--color-prism-…)`) to maintain visual character.

### Step B – Create Analysis View
1. Add `webapp/src/components/views/AnalysisView.tsx` that composes the imported components, mirroring the structure from `Song Analysis Module/src/App.tsx`.
2. Implement state management for:
   - Upload modal (`useState`).
   - Deploy side sheet.
   - Selected track.
   - Active detail tab (overview/visuals/preset/etc.).
   - Responsive layout detection (mobile vs desktop).
3. Use mock data initially (from the prototype) but define TypeScript interfaces so replacing with live data later is straightforward.
4. Ensure all sections support loading/fallback states defined in the spec (skeletons, warnings, missing artefacts).

### Step C – Integrate with App Shell
1. Update `webapp/src/App.tsx`:
   - Extend `currentView` union to include `'analysis'`.
   - Add `<AnalysisView />` to the Suspense content switch.
   - Import lazily (similar to Graph/Profiling) to maintain bundle splitting.
2. Update `webapp/src/components/TopNav.tsx`:
   - Insert an “Analysis” button/tab.
   - Prefetch the view on hover (as done for other views).
3. Confirm mobile layout works with the existing responsive logic.

### Step D – Theme & Tokens Alignment
1. Verify `z5.css` already defines all `var(--color-prism-…)` tokens used by the components.
2. Add documentation (or update the existing token matrix) to describe component → token mapping.
3. Ensure typography uses the shared styles (Bebas for headings, Rama/Nunito for body, JetBrains Mono for code) via CSS classes or style overrides.

### Step E – Prepare for Real Data Bindings
1. Define API hooks (React Query or custom) for:
   - `GET /api/v1/tracks` (with support for search/filter/pagination).
   - `GET /api/v1/tracks/{id}` (detail with artefact URLs).
   - `GET` requests for artefact JSON (genesis map, metrics, manifest, validation, impact, estimate, visual report, Speedscope profile).
   - SSE/WebSocket subscription for telemetry.
2. Structure the view to first render with mock data, then swap in hooks once endpoints are ready.
3. Implement safe fallbacks if any artefact is missing (as per design spec).

### Step F – Testing & QA
1. Add unit tests for key components (e.g., toolbar interactions, chart wrappers with sample data).
2. Extend Playwright/E2E tests to cover:
   - Navigating to Analysis tab.
   - Upload modal flow (mocked).
   - Analysis warning state (F-measure below threshold).
   - Deploy gating (runtime risk).
   - Activity log updates.
3. Run linting and formatting to ensure new files comply with repo standards.

---

## 3. File Mapping Reference

| Prototype Path | Destination |
|----------------|-------------|
| `src/components/Toolbar.tsx` | `webapp/src/components/analysis/Toolbar.tsx` |
| `src/components/TrackListItem.tsx` | `webapp/src/components/analysis/TrackListItem.tsx` |
| `src/components/MetricsCard.tsx` | `webapp/src/components/analysis/MetricsCard.tsx` |
| `src/components/BeatGridChart.tsx` | `webapp/src/components/analysis/BeatGridChart.tsx` |
| `src/components/FrequencyChart.tsx` | `webapp/src/components/analysis/FrequencyChart.tsx` |
| `src/components/DynamicsChart.tsx` | `webapp/src/components/analysis/DynamicsChart.tsx` |
| `src/components/SectionsTimeline.tsx` | `webapp/src/components/analysis/SectionsTimeline.tsx` |
| `src/components/GraphPresetCard.tsx` | `webapp/src/components/analysis/GraphPresetCard.tsx` |
| `src/components/ArtifactTable.tsx` | `webapp/src/components/analysis/ArtifactTable.tsx` |
| `src/components/ActivityLog.tsx` | `webapp/src/components/analysis/ActivityLog.tsx` |
| `src/components/DeploySideSheet.tsx` | `webapp/src/components/analysis/DeploySideSheet.tsx` |
| `src/components/UploadModal.tsx` | `webapp/src/components/analysis/UploadModal.tsx` |
| `src/components/HelpShortcuts.tsx` | `webapp/src/components/analysis/HelpShortcuts.tsx` |
| `src/components/ui/*` | Merge into existing `webapp/src/components/ui/*` primitives or re-export as appropriate. |
| `src/components/Documentation.tsx` | Optional: use to render inline help/notes in the analysis view or developer docs. |

---

## 4. Open Questions / Follow-Up
- Determine whether to keep the prototype’s custom table styling or adapt to existing table component.
- Confirm backend artefact endpoints and shape; adjust field names in components accordingly.
- Decide if the upload/analysis queue should integrate with a central store (e.g., Zustand) or remain local state.

---

## 5. Next Actions
1. Copy components per Step A.  
2. Scaffold `AnalysisView.tsx` with mock data.  
3. Integrate view into `App.tsx`/`TopNav.tsx`.  
4. Replace mock data with API bindings once available.  
5. QA on desktop/tablet/mobile breakpoints.  
6. Remove prototype Vite bundle once integration is complete.

---

This plan ensures the new Song Analysis module fits cleanly into the existing app while preserving the visual/interaction qualities from the Figma-driven prototype.
