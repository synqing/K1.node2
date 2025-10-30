# Figma Make Prompt – PRISM.node Song Analysis Module (One Shot)

Use this single prompt verbatim in Figma Make. The file must be self-contained, reuse existing PRISM styles, and deliver the complete “Song Analysis” experience described below.

---

## 0. Project Definition
- **Project name:** PRISM.node – Song Analysis Module  
- **Context:** Extend the existing PRISM.node control dashboard to include a dark-mode “Song Analysis” tab that displays Genesis audio-analysis artefacts, metrics, graph templates, and deployment readiness.  
- **Screen count:** 1 core view (Song Analysis) with responsive variants (Desktop 1920, Tablet 1024, Mobile 390).  
- **Design language:** Dark theme only, consistent with existing PRISM tokens, typography, and component styling.

---

## 1. Tokens & Typography
Recreate the same styles as the unified prompt so engineering can reference a single source:

### 1.1 Color Styles (use `z5.css` variables as values)
| Style Name | CSS Variable |
|------------|--------------|
| App/Background | `--color-background` |
| App/Foreground | `--color-foreground` |
| Card/Base | `--color-card` |
| Card/Foreground | `--color-card-foreground` |
| Popover/Base | `--color-popover` |
| Popover/Foreground | `--color-popover-foreground` |
| Accent/Primary | `--color-primary` |
| Accent/Primary/On | `--color-primary-foreground` |
| Accent/Secondary | `--color-secondary` |
| Accent/Secondary/On | `--color-secondary-foreground` |
| Accent/Muted | `--color-muted` |
| Accent/Muted/On | `--color-muted-foreground` |
| Accent/Destructive | `--color-destructive` |
| Accent/Destructive/On | `--color-destructive-foreground` |
| Border/Base | `--color-border` |
| Input/Base | `--color-input` |
| Ring/Focus | `--color-ring` |
| Chart/1 | `--color-chart-1` |
| Chart/2 | `--color-chart-2` |
| Chart/3 | `--color-chart-3` |
| Chart/4 | `--color-chart-4` |
| Chart/5 | `--color-chart-5` |
| Sidebar/Base | `--color-sidebar` |
| Sidebar/Foreground | `--color-sidebar-foreground` |
| Sidebar/Primary | `--color-sidebar-primary` |
| Sidebar/Primary/On | `--color-sidebar-primary-foreground` |
| Sidebar/Accent | `--color-sidebar-accent` |
| Sidebar/Accent/On | `--color-sidebar-accent-foreground` |
| Sidebar/Border | `--color-sidebar-border` |
| Sidebar/Ring | `--color-sidebar-ring` |
| Prism/BG/Canvas | `--color-prism-bg-canvas` |
| Prism/BG/Surface | `--color-prism-bg-surface` |
| Prism/BG/Elevated | `--color-prism-bg-elevated` |
| Prism/Text/Primary | `--color-prism-text-primary` |
| Prism/Text/Secondary | `--color-prism-text-secondary` |
| Prism/Status/Gold | `--color-prism-gold` |
| Prism/Status/Success | `--color-prism-success` |
| Prism/Status/Warning | `--color-prism-warning` |
| Prism/Status/Error | `--color-prism-error` |
| Prism/Status/Info | `--color-prism-info` |
| Prism/Data/Scalar | `--color-prism-scalar` |
| Prism/Data/Field | `--color-prism-field` |
| Prism/Data/Color | `--color-prism-color` |
| Prism/Data/Output | `--color-prism-output` |

**Token Matrix (include in Docs page):** map background/surface usage per component category (Toolbar, Track List, Detail Cards, Log Strip) to avoid drift.

### 1.2 Text Styles
| Style | Font | Size | Case | Weight | Line Height |
|-------|------|------|------|--------|-------------|
| Display/H1 | Bebas Neue (or Bebas substitute) | 28–32px | Uppercase | Medium | 1.2 |
| Display/H2 | Bebas Neue | 20–24px | Uppercase | Medium | 1.2 |
| UI/Body | Rama Gothic Rounded (or Nunito) | 14–16px | Sentence | Regular | 1.5 |
| UI/Label | Rama/Nunito | 12–14px | Uppercase | Medium | 1.5 |
| Mono/Small | JetBrains Mono | 12–13px | Sentence | Regular | 1.6 |

### 1.3 Spacing & Motion
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px.  
- Radii: 6, 10, 14, 20px.  
- Motion: 120 ms (fast), 180 ms (medium), 300 ms (slow). Hover/press = ease-out; transitions = ease-in-out. Respect reduced motion.

---

## 2. Component Library (Page `01_Components`)
Create the following components with variants and states:

1. **Upload Modal**  
   - States: Idle, Uploading (progress), Error.  
   - Fields: File dropzone, metadata form (title, artist, tags, preset).  
   - Queue table showing multiple pending uploads with ETA column.  
   - Error banner + retry CTA.
2. **Toolbar Buttons & Chips**  
   - Primary button (Upload), Secondary (Analyse), Disabled state.  
   - Preset badge group (EDM, Rock, Orchestral).  
   - Worker health chip with queue depth (green/amber/red).  
   - In-flight badge (count bubble).  
   - Search input (focused, with debounce hint).
3. **Track List Items**  
   - Variants: Default, Hover, Selected, Processing, Warning, Failed.  
   - Include metrics pill (F-measure color-coded), status chip, quick actions.
4. **Metrics Card**  
   - Variants: Normal, Warning, Error.  
   - Shows value, delta (↑/↓), tooltip icon.
5. **Charts** (static visual frames, no data binding required)  
   - Beat Grid lane (downbeats in top lane).  
   - Frequency spectrum stacked area with legend showing explicit ranges (e.g., 20–250 Hz).  
   - Dynamics RMS area chart (legend includes window size).  
   - Sections timeline with jump buttons.  
6. **Graph Preset Card**  
   - Shows template version, genre, node chips with data-type badges.  
   - Diff list (added/removed/changed).  
   - Simulate button state (loading, success).  
7. **Artifact Table Row**  
   - Variants: Active, Soft-deleted, Missing.  
   - Columns for name, type, size, age, SHA, actions (download, copy link, restore/delete).  
8. **Activity Log Row**  
   - Severity states: Info, Warning, Error.  
   - Include “View logs” CTA.  
9. **Queue Side Panel** (list of in-flight analyses with cancel buttons).  
10. **Help / Shortcuts Popover** (documentation of keyboard shortcuts).  
11. **Deploy Side Sheet** widget (bundle compatibility, device list, firmware versions).

Ensure components use auto-layout and references to color/text styles – no raw hex values.

---

## 3. Screens (Page `02_Screens`)
Create three responsive frames using auto-layout:

### 3.1 Desktop – 1920×1080
```
TopNav (existing style; add “Analysis” tab active)
Sidebar (collapsed/expanded state optional)
Main Column:
  Toolbar (Upload, Analyse, presets, worker health chip, in-flight badge, search)
  Body (two-column):
    Left: Track Library panel
      - Header with filters/tabs
      - Scrollable list (include at least 6 sample items covering statuses)
    Right: Track Detail surface (accordion sections):
      - Overview card (bundle compatibility, runtime risk, actions)
      - Metrics grid (6+ cards with sample data)
      - Visualization tabs (Beat Grid, Frequency, Dynamics, Sections)
      - Graph Preset Builder panel (template summary, diff table, simulate state)
      - Artifact Manager table (with mix of active/soft-deleted/missing rows)
  Bottom: Activity Log / Telemetry strip (sticky)
```
Include states for:
- Upload modal open (overlay).  
- Analysis confirmation popover.  
- Deploy side sheet.  
- Beat override editor invocation (small modal/panel).  
- Partial artefact placeholders (stub cards with “Not generated”).  
- Warning banner when runtime risk high.

### 3.2 Tablet – 1024×768
- Stack components vertically: toolbar, track library (accordion or swipe list), detail cards (full width).  
- Activity log collapses to expandable drawer.  
- Ensure interactions (upload, analyse, deploy) accessible.

### 3.3 Mobile – 390×844
- Use top tabs or segmented control to switch between “Tracks” and “Details”.  
- Upload icon in header.  
- Detail view uses cards stacked; log strip becomes floating button launching bottom sheet.

For each breakpoint show skeleton/loading states where appropriate and warn/failed states.

---

## 4. Data Binding Notes (Page `03_Docs`)
Document the following data → UI mappings with sample values:

| Artifact | Used In | Sample Fields |
|----------|---------|---------------|
| `track.genesis.json` | Charts (frequency, dynamics, sections), beat grid | beats[], envelopes[], sections[] |
| `phase2b_metrics.json` | Metrics grid | f_measure=0.962, cemgil=0.648 |
| `graph.metrics.json` | Overview (graph health), metrics card | nodes=47, edges=56, isDag=true |
| `graph.estimate.json` | Runtime risk strip | est_ms=7.3, cpu_pct=62 |
| `manifest.json` | Bundle compatibility | firmware_min_version="2.5.0", map_version="v4.0" |
| `graph.validation.json` | Validation panel | ruleId, nodeId, severity |
| `graph.impact.json` | Graph diff list | changedNodes[], closureDepth |
| `graph.executor.scale.json` | Simulate overlay | before_ms=9.4, after_ms=7.5 |
| `graph.analysis.beat_override.json` | Manual override badge | editedBy, editedAt |
| Telemetry SSE | Activity strip | drift_ms, cpu_pct, errors[] |
| `visual.report.json` | Visual QA callout | pixelMismatchPct=0.8 |
| `profile.speedscope.json` | Speedscope button | path |

Also document telemetry severity thresholds (drift>20ms=warning, >100ms for 5s=error) and performance budgets (cold load ≤1.5s P95, tab switch ≤250ms P95, chart redraw ≤16ms mean).

---

## 5. Accessibility & Interaction Guidelines
- All controls ≥44px tap target.  
- Focus ring: 2px using `--color-ring`.  
- Provide textual summaries under charts (“Average BPM 128 ± 2”).  
- Keyboard shortcuts: `U` Upload, `A` Analyse, `D` Deploy, `L` Toggle logs, `?` Shortcuts popover.  
- Ensure warnings use both color and icon.  
- Include skeleton states for loading + inline empty states for missing artefacts.

---

## 6. States to Render Explicitly
- Upload queue with multiple files, including failed retry state.  
- Analysis warning (F-measure <0.80) with tooltip.  
- Deploy button disabled due to runtime risk (show reason).  
- Manual beat override badge + edit modal.  
- Missing Speedscope profile placeholder.  
- Activity log error entry triggering “Auto-rollback executed” banner.  
- Telemetry disconnect state (grey info).  
- Partial artefact stub cards.

---

## 7. Deliverables Summary
Produce a Figma file with:
1. `00_Styles` – color/text styles + token matrix note.  
2. `01_Components` – components listed in §2 with variants/states.  
3. `02_Screens` – Song Analysis view at Desktop/Tablet/Mobile with interactions and states.  
4. `03_Docs` – data binding table, performance budgets, telemetry rules, accessibility notes, shortcuts.  
5. Optional `04_Prototype` – link buttons to overlays/sheets for clarity.

No invented colors or typography; everything must reference the defined styles. Auto-layout everywhere. Use Lucide icons (UploadCloud, ActivitySquare, Gauge, FileStack, ScrollText, OctagonAlert) for consistency.

---

**Prompt End – build entire deliverable in one pass.**
