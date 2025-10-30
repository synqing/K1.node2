# Genesis Web App – Song Analysis Tab Design Spec

**Document Owner:** Frontend Experience Team  
**Last Updated:** 2025‑11‑02  
**Status:** Draft (ready for design handoff)

---

## 1. Purpose
Define the UX and visual design requirements for the new “Song Analysis” module within the K1/PRISM web application. This view surfaces the Genesis analysis artefacts (audio uploads, Genesis Maps, metrics, graph presets) and orchestrates user workflows: upload → analyse → review → deploy.

---

## 2. Navigation & Information Architecture
- **Top Nav update:** Add a fifth tab labelled **“analysis”** alongside `control`, `profiling`, `terminal`, `graph`.  
  - Maintain camel-case internally (`'analysis'`) for routing.  
  - Hover prefetch: `void import('./components/views/AnalysisView')`.
- **Route:** `/analysis`.  
  - Persist selected tab in the same state mechanism as existing views.
- **Breadcrumb (optional):** Under the top nav, display context: `Analysis / {Track Name or “New Track”}`.

---

## 3. Layout Overview
Responsive layout built on the existing dark theme token set (`var(--prism-bg-*)`). Use auto-layout wrappers similar to other views.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TopNav (existing component, new “analysis” tab)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Sidebar (existing)      │  Main Content (flex column, gap-4)                │
│ (unchanged)             │   ├── Upload & Status Toolbar                     │
│                         │   ├── Two-column body                             │
│                         │   │    ├── Left: Track Library panel              │
│                         │   │    └── Right: Track Detail surface            │
│                         │   └── Bottom: Activity Log / Telemetry strip       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Breakpoints
- **Desktop (≥1280px):** Two-column layout (3/7 split).
- **Tablet (768–1279px):** Stack panels vertically; track list collapses into accordion.
- **Mobile (≤767px):** Use route switching: list view, track detail view (bottom sheet).

---

## 4. Data & Artifact Contracts
- All data drives from backend artefacts (stored under `analysis/{track_id}/{version}/`). Front-end must treat every file as optional and surface graceful fallbacks.
- **`track.genesis.json`**  
  - Primary schema (see PRD §6). Supplies beats, envelopes, dynamics, sections.  
  - Null-safe: if envelope arrays empty, chart collapses with “No data” state.  
- **`graph.metrics.json`**  
  - Shape:  
    ```json
    {
      "nodes": 47,
      "edges": 56,
      "outdegree": {"min":0,"max":5,"avg":1.9},
      "isDag": true,
      "disconnectedComponents": 1
    }
    ```  
  - Drives Overview “Graph health” pill + alerts (cycles, disconnected components).
- **`graph.estimate.json`**  
  - Fields: `est_ms`, `cpu_pct`, `mem_mb`, `confidence`.  
  - Used for runtime risk strip (compare to frame budget).
- **`bench.topo.json`** *(optional)*  
  - Fields: `topo_sort_ms`, `solver_ms`. Display if present for advanced perf insight.
- **`graph.validation.json`**  
  - Array `violations[]` with `{ruleId, nodeId, severity, message, fixHint}`.  
  - Populate Validation list; severity drives badge colour.
- **`graph.impact.json`**  
  - Fields: `changedNodes[]`, `closureDepth`, `impactOrder[]` (sorted).  
  - Feed into preset diff + deployment CTA.
- **`graph.analysis.json`**  
  - Contains precomputed traversals:  
    ```json
    {"bfs":["nodeA","nodeB"],"dfs":["nodeA","nodeC"],"dijkstra":{"start":"nodeA","weights":{...}},"topological":["nodeA","nodeB"]}
    ```  
  - Charts use this to highlight path previews.
- **`graph.analysis.beat_override.json`** *(optional)*  
  - Custom beat grid overrides with provenance `{editedBy, editedAt, notes}`. Show “Manual override” badge when present.
- **`profile.speedscope.json`** *(optional)*  
  - Path to Speedscope profile. Trigger viewer modal via “Open Speedscope”.
- **`visual.report.json`** *(optional)*  
  - Keys: `pixelMismatchPct`, `maxDeltaLab`, `framesTested`. Display as visual QA callout.
- **Telemetry stream**  
  - SSE/WebSocket emitting `{timestamp, drift_ms, cpu_pct, temp_c, errors[]}`.  
  - Feed activity strip + runtime risk updates in real-time.
- **`graph.executor.scale.json`** *(optional)*  
  - Predicted scaling results after “Simulate” action. Use to overlay performance improvements.
- **Deletion & storage metadata**  
  - API returns `sha256`, `size_bytes`, `created_at`, `deleted_at` (nullable) per artefact.

Front-end should coalesce missing artefacts to specific UI states (empty, warning, hidden) rather than throw.

## 5. Component Breakdown

### 5.1 Upload & Status Toolbar
- Positioned at top of main content, sticky within scroll container.
- Elements (left → right):
  1. **Primary button** “Upload audio” (variant = primary) – opens upload dialog.  
     - Accepts drag-and-drop area inside modal with waveform illustration.  
     - Supports MP3/WAV up to 50 MB.  
  2. **Secondary button** “Analyse selected” – disabled unless a track is selected and not already processing.  
  3. **Toggle group** for presets (Chips using `Badge` variant) – e.g., EDM, Rock, Orchestral; clicking updates preset.  
  4. **Status chip** showing worker health + queue depth (green/amber/red using `--color-prism-success/warning/error`, tooltip with avg wait).  
  5. **In-flight badge** (optional) showing count of queued/running jobs; clicking opens queue side panel.  
  6. **Search input** (icon + placeholder “Filter tracks by title, artist, tags”). Reuse existing `Input` component, debounced 150 ms.

### 5.2 Track Library Panel (Left)
- Container background: `var(--prism-bg-surface)` with elevation border `var(--prism-bg-elevated)`.
- **Header row:** Title + track count + sort dropdown (Newest, Oldest, F-measure, Duration).  
- **Tabs/Pills** for filter states: All, Processing, Ready, Warning, Failed.
- **List item structure:**  
  - Artwork placeholder (square, icon).  
  - Column with title (UI/Body) and subtitle (artist · duration).  
  - Metrics pill: F-measure badge (colour-coded).  
  - Status chip (Processing/Ready/Failed).  
  - Hover state reveals quick actions: “Open”, “Deploy”, kebab menu (Edit metadata, Delete).  
  - Pressing item selects + highlights row (border `--color-primary`).
- **Empty state:** Illustration + CTA (“No tracks yet. Upload audio to begin.”).

### 5.3 Track Detail Surface (Right)
Split into collapsible sections (accordion with persistent open state). Use `var(--prism-bg-elevated)` card surfaces.

#### 5.3.1 Overview Card
- Track title, artist, duration, last analysis timestamp.
- Status badges for each pipeline stage (Uploaded, Analysed, Bundled, Deployed) with timestamps (hover).
- **Bundle compatibility tile**  
  - Reads `manifest.json` + `graph.metrics.json`.  
  - Displays firmware minimum vs connected device firmware, required node list, map schema version.  
  - Show green tick when compatible; otherwise amber/red with CTA “Update devices” or “Regenerate bundle”.
- **Runtime risk strip**  
  - Bind to `graph.estimate.json`.  
  - Present horizontal meter (frame budget 8 ms baseline).  
  - If `est_ms > 8.0` or `cpu_pct > 80`, mark amber with link to Graph Preset Builder; red if >10 ms.  
- Primary action buttons: “Deploy bundle”, “Export bundle”, “Open in graph editor” (disabled when compatibility or risk gate fails).

#### 5.3.2 Analysis Metrics
- Grid of metrics (cards with icon + label + value):  
  - F-measure, Cemgil, Tempo BPM (with tolerance), Dynamic Range, Spectral Centroid, File Size, Graph nodes/edges.  
  - Each card uses `Chart` colour tokens when highlighting (e.g., Chart/1 for tempo).  
- Secondary line showing prior run delta (↑/↓) if historical data exists.  
- Tooltip reveals raw value + source file.  
- Threshold warnings (e.g., F-measure <0.80) escalate to amber badge with explanation and link to re-run analysis.

#### 5.3.3 Visualisations
- Tabs: “Beat Grid”, “Frequency Bands”, “Dynamics”, “Sections”.  
  - Beat grid: lane-based timeline. Downbeats render in dedicated top lane (`var(--color-prism-gold)`), regular beats in muted lane. Zoom controls quantise density (bucket by 10/50/100 ms). “Edit beats” icon opens override editor (writes `graph.analysis.beat_override.json`).  
  - Frequency: stacked area derived from `genesis_map.layers.frequency`. Display legend with actual frequency ranges/band ids (e.g., `spectrum_low(20-250 Hz)`). Tooltips show band + raw intensity + bin indices.  
  - Dynamics: area chart for RMS (window size displayed in legend), overlay dynamic range thresholds.  
  - Sections: bar timeline with colors per section; add quick-jump buttons (“Intro”, “Drop”, etc.) that seek the timeline + highlight corresponding graph nodes.  
- Provide download buttons (PNG, CSV) and “Copy JSON path” for each tab.  
- Respect reduce-motion by disabling animated transitions.

#### 5.3.4 Graph Preset Builder
- Panel showing recommended node graph template generated from analysis + preset rules.  
  - Display node list (chips with data-type badges), grouped by pipeline stage.  
  - Badges reference data-source (beats, bass_envelope, etc.) and estimated cost.  
  - Buttons: “Apply template”, “Customize in graph editor”, “Regenerate suggestion”, **“Simulate”** (runs executor, saves `graph.executor.scale.json`, overlays predicted ms/CPU deltas atop runtime strip).  
  - Diff viewer (two-column) compares current device graph vs template (Added, Removed, Changed params).  
  - Metadata callout: Template version, genre/preset used, confidence score, compatibility pill (green if `manifest.firmware_min_version ≤ current device fw`, otherwise amber with “Update devices” CTA).  
  - Link to rule source (tooltip referencing rule id/preset).

#### 5.3.5 Artefact Manager
- Table listing all generated files with filters (All/Map/Graph/Metrics/Audio/Overrides/Profiles).  
  - Columns: Name, Type, Size, Age, SHA-256 (truncated), Status (active/soft-deleted), Actions (Download, Copy link, Restore/Delete).  
  - Copy buttons output pre-signed URL + SHA text.  
  - Storage usage bar warns ≥80% with tooltip listing top 3 largest artefacts.  
  - Delete performs soft-delete (undo snackbar 30 s).  
  - Highlight missing but expected artefacts (e.g., Speedscope) with dashed row + “Not generated” badge.

### 5.4 Activity Log / Telemetry Strip
- Horizontal console-like strip at bottom of view.  
  - Show last N events (upload started, analysis completed, deployment success, drift warnings) merged with live telemetry stream.  
  - Severity logic:  
    - `drift_ms >20` amber warning; `>100` sustained 5 s triggers red + “Auto-rollback executed” message.  
    - Device offline / SSE drop shows grey info with reconnection countdown.  
  - Each entry: timestamp, severity icon, message, contextual action (“View logs”, “Open Speedscope”, etc.).  
  - “Pin logs” persists per `{trackId}` key (`analysis:{trackId}:pinLogs`).  
  - Clicking an entry with correlationId deep-links to global log view with filters pre-applied.

---

## 6. Interaction States & Workflows

### 6.1 Upload
1. Click “Upload audio” → Modal with dropzone + metadata form (title, artist, tags, preset suggestion).  
2. Modal displays estimated analysis time (based on historical average + track length) before submission.  
3. Client-side validation: enforce file type (MP3/WAV), size ≤50 MB, duration hint (optional). Server re-validates and returns meaningful errors.  
4. During upload, show progress bar (0–100% with `var(--color-prism-info)`) and allow enqueuing multiple files (queue table).  
5. After success, auto-select newest track, fire toast, and display “Analyse now” inline CTA.  
6. Failed upload retries keep metadata (do not clear form); offer “Report issue” link with prefilled context.

### 6.2 Analysis Execution
- “Analyse selected” opens confirmation popover summarising preset, estimated runtime, and cost (queue length). Default action enqueues job and returns user to detail view.  
- Users can queue multiple tracks; a side panel lists in-flight jobs with status + cancel option.  
- While processing, show shimmer skeletons for metrics, disable deploy button, but keep other data accessible (no blocking overlay).  
- Partial artefacts: render as they land (`Promise.allSettled`); e.g., metrics panel updates before visual QA finishes.  
- Completion toasts differentiate **Success**, **Warning (review metrics)**, **Failed** with direct action buttons (Retry, Open logs).  
- Failure surfaces `graph.validation.json` issues inline plus link to activity log filtered by job id.

### 6.3 Deployment
- “Deploy bundle” opens side sheet (reuse Control panel pattern) listing target devices + compatibility status (green/amber/red).  
- Gate: deploy button enabled only if bundle compatibility tile (Overview) is green and runtime risk is within threshold. Disabled state shows reason tooltip.  
- Sheet displays last successful deployment timestamp per device + firmware version; allows pinning notes.  
- On confirm, orchestrator kicks bundle job; user can stay on tab (progress indicator sits in header).  
- Completion updates status badges and writes telemetry entry; failure triggers automatic rollback message with “View diff” link.

### 6.4 Manual Adjustments
- Inline editing: title, artist, tags, preset. Autosave on blur (`PATCH /api/v1/tracks/{id}`).  
- Beat override editor: toggled via Beat Grid panel; timeline editor allows dragging beats, inserting/deleting. Saves diff to `graph.analysis.beat_override.json` with user + timestamp.  
- Notes/annotations field (monospace) stored as `analysis_notes.md`; show Markdown preview.  
- Manual changes mark “Manual override” badge in Overview + activity log entry.

---

## 7. Visual & Component Specs

### 7.1 Tokens & Styles
- Follow `z5.css` tokens. Primary surfaces:  
  - Background: `var(--prism-bg-canvas)`  
  - Panels: `var(--prism-bg-surface)`  
  - Elevated cards: `var(--prism-bg-elevated)` with 1px border `rgba(255,255,255,0.06)`  
  - Text: `var(--prism-text-primary)` / `--prism-text-secondary` for muted text.
- Metrics badges use PRISM status colors.  
- Charts leverage `--color-chart-*` variables for consistency.  
- Node/graph badges maintain `--color-prism-scalar/field/color/output`.
- Include token matrix in Figma handoff documenting surface/background/border usage per component to avoid colour drift.

### 7.2 Typography
- Section headings: `Display/H2` (Bebas).  
- Card titles: `UI/Body` 16px medium.  
- Metadata labels: `UI/Label` 12px uppercase tracking 0.05em.  
- Code/artefact filenames: `Mono/Small`.

### 7.3 Iconography
- Use Lucide icons (already in project). Suggested mapping:  
  - Upload: `UploadCloud`  
  - Analysis: `ActivitySquare`  
  - Metrics: `Gauge`  
  - Artefacts: `FileStack`  
  - Logs: `ScrollText`  
  - Warnings: `OctagonAlert`

### 7.4 Motion
- Buttons, toggles: 120 ms ease-out.  
- Modals, side sheets: 180 ms ease-in-out.  
- Chart transitions: 300 ms (respect reduced motion).  
- Skeleton loaders fade with animate-pulse (reuse pattern from `App.tsx` fallback).

---

## 8. States & Edge Cases
- **Processing:** disable actions, show progress bars.  
- **Warning:** highlight metrics card in amber, show tooltip (“F-measure below threshold 0.80”).  
- **Failure:** show action button “Retry analysis” + link to logs.  
- **No bundle available:** hide deploy button, show callout to run analysis first.  
- **Device offline:** disable deploy button, show tooltip referencing device status (via existing connection state).  
- **Large dataset queue:** display estimate banner (“High load: expected start in ~5 min”).  
- **Manual override:** show badge `Manual override` next to metrics if user edited beat grid.
- **Partial artefacts:** sections without data display stub cards (“Not generated”) and keep remainder interactive.

---

## 9. Accessibility
- All controls ≥44 px tap target.  
- Focus states use `outline: 2px solid var(--color-ring); outline-offset: 2px;`.  
- Charts must include textual summaries (e.g., “Average BPM 128 ± 2”).  
- Provide keyboard shortcuts (document in help modal) for primary actions:  
  - `U` Upload, `A` Analyse, `D` Deploy, `L` Toggle logs.  
- Include inline “?” shortcut popover listing context-aware hotkeys.  
- Ensure screen reader labelling: track list items expose status and metrics via `aria-describedby`.

---

## 10. Performance & Data Loading Budgets
- **Track library**  
  - Virtualise row rendering when list >50 items (react-window or equivalent).  
  - Debounce search/filter input to 150 ms.  
  - Prefetch track detail on row hover (fire-and-forget fetch).  
- **Charts**  
  - Use Canvas/WebGL-backed charts for Beat Grid & Frequency views; cap redraw to ≤30 FPS.  
  - Disable transitions when streaming telemetry; otherwise limit to 300 ms ease-in-out.  
  - Quantise beat rendering by zoom level to avoid >1k DOM nodes (bucket beats per pixel).  
- **Data fetching**  
  - React Query caching TTL = 5 min; background refetch on tab focus.  
  - Use `select` + shallow equals to minimise rerenders; load JSON files in parallel with `Promise.allSettled`.  
  - Fallback logic: missing optional artefacts produce inline “Not generated” states, never hard error.  
- **Budgets**  
  - Cold tab load (uncached) ≤1.5 s P95 (Simulated Slow 3G, 4x CPU throttle).  
  - Tab switch (cached) ≤250 ms P95.  
  - Chart redraw ≤16 ms/frame mean (budget 60 FPS).  
  - SSE telemetry handler <2 ms per message; batch updates with `requestAnimationFrame`.

---

## 11. Implementation Notes
- Scaffold new view `AnalysisView.tsx` under `webapp/src/components/views/`.  
- Compose using existing UI primitives (`Card`, `Tabs`, `Badge`, `Table`).  
- Create reusable components for metrics grid, charts, artefact table to avoid duplication.  
- Integrate with new API endpoints defined in PRD §5.2 (`/api/v1/tracks`, etc.).  
- Add Zustand or React Query store for analysis data (caching, optimistic updates).  
- Use `Suspense` boundaries for chart sections with skeleton fallback.

---

## 12. Deliverables
1. High-fidelity Figma page “05_Analysis” using tokens from `FIGMA_MAKE_AGENT_PROMPT_UNIFIED.md`.  
2. Component specifications for new patterns (upload modal, artefact table).  
3. Frontend implementation plan (tickets mapping to sections above).  
4. QA checklist covering workflows in §6 and edge cases in §8.

---

## 13. Acceptance Checklist
- Overview pane renders (with skeleton transitions) in ≤1.5 s P95 on simulated Slow 3G / 4× CPU throttle (Chrome dev tools).  
- Optional artefacts missing (`graph.estimate.json`, `profile.speedscope.json`, etc.) never produce unhandled promise rejections; UI shows explicit “Not generated” states.  
- When `graph.metrics.json.isDag === false`, display cycles badge and expose download link for `graph.cycles.dot`.  
- “Open Speedscope” lazily loads viewer + profile without full page reload, closes cleanly.  
- Deploy action enabled only when bundle compatibility + runtime risk checks pass; otherwise show inline reason.  
- Track list virtualisation verified with ≥250 items (scroll jank <16 ms).  
- Telemetry drift >20 ms triggers amber log entry; >100 ms for 5 s triggers red entry + rollback banner.

---

## 14. Next Steps
1. Validate layout with design team, adjust Figma components.  
2. Create front-end tickets referencing sections (e.g., ANL-01 Upload Modal).  
3. Sync with backend on API readiness before implementing data hooks.
