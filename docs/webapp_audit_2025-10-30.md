# K1 Webapp Audit — 2025-10-30

This is a comprehensive audit of the K1 web dashboard. It covers installation/build status, bundle performance, code-splitting and prefetch strategy, dependency hygiene, types alignment, accessibility, security/networking, testing/CI, and prioritized next steps.

## 1) Installation & Build

- Status: Installs and builds cleanly after fixing invalid npm package name.
  - Name fixed to `audio-reactive-led-control-dashboard` in `webapp/package.json`.
- Build toolchain: Vite + React 18 + SWC.
- Preview: `npm run preview` serves the production bundle.

## 2) Bundle & Performance Snapshot

Latest production build (post-optimizations):

- Main chunk: `build/assets/index-CMXK_EX7.js` ≈ 59.18 kB (gzip ≈ 15.35 kB)
- CSS: `build/assets/index-BVwOiesl.css` ≈ 56.40 kB (gzip ≈ 9.45 kB)
- Vendors (split):
  - `recharts-vendor` ≈ 451.07 kB (gzip ≈ 112.87 kB) — charts only, lazy-loaded
  - `react-vendor` ≈ 166.49 kB (gzip ≈ 54.78 kB)
  - `radix-ui` ≈ 79.58 kB (gzip ≈ 26.40 kB)
  - `d3-vendor` ≈ 63.05 kB (gzip ≈ 20.58 kB)
  - `ui-vendor`, `utils-vendor`, and small view-specific chunks

Notes

- No >500 kB chunk warnings. Heavy libraries are isolated and lazy-loaded.
- Charts load on demand (Profiling/Analysis views), not on first paint.

## 3) Code-Splitting & Prefetch Strategy

Implemented splitting and prefetching to reduce TTI and improve navigation:

- Route-level lazy loading via `React.lazy` + `Suspense`
  - App routes (Profiling, Terminal, Graph, Analysis) are lazy-loaded.
  - File: `webapp/src/App.tsx:1`

- Lazy-load charts (Recharts) at the feature level
  - Profiling charts bundle is deferred until Profiling renders.
  - File: `webapp/src/components/views/ProfilingView.tsx:7`

- Per-panel rendering deferral with IntersectionObserver
  - Chart panels render only when visible using `LazyVisible` placeholders.
  - Files: `webapp/src/components/common/LazyVisible.tsx:1`, `webapp/src/components/profiling/ProfilingCharts.tsx:55`

- Lazy-load Graph modals (Radix UI) on demand
  - Node palette and shortcuts modals are loaded only when opened.
  - File: `webapp/src/components/views/GraphEditorView.tsx:1`

- Hover prefetch for snappier navigation
  - Top nav preloads the target view and heavy vendors on mouse hover.
  - File: `webapp/src/components/TopNav.tsx:25`

- Idle prefetch with user toggle
  - Prefetch likely-next views/vendors when the browser is idle; user can disable.
  - Files: `webapp/src/App.tsx:22` (preference), `webapp/src/App.tsx:82` (persist), `webapp/src/App.tsx:90` (idle prefetch)
  - Toggle UI: `webapp/src/components/Sidebar.tsx:287` (“Idle Prefetch”) persisted to `localStorage` as `prefs.idlePrefetch`.

- Vendor chunking in Vite
  - Split major vendor groups (`react-vendor`, `radix-ui`, `recharts-vendor`, `d3-vendor`, `ui-vendor`, `utils-vendor`).
  - File: `webapp/vite.config.ts:52`

Observation

- Vite warns that `@radix-ui/react-select` is both dynamically and statically imported, so dynamic import won’t create a separate chunk for it. This is expected because Select is also used statically (e.g., Sidebar, ProfilingFilters). The lazy usage in ColorManagement simply defers loading for that context.

## 4) Dependencies & Hygiene

- Stars in dependencies:
  - `clsx` and `tailwind-merge` use `"*"` in `webapp/package.json`. Pin to installed versions for reproducibility:
    - Installed (from lockfile): `clsx@2.1.1`, `tailwind-merge@3.3.1`.
    - Recommended change: set `"clsx": "^2.1.1"`, `"tailwind-merge": "^3.3.1"`.

- Type mismatches:
  - Runtime React: `18.3.1`. Types: `@types/react@19.2.2`, `@types/react-dom@19.2.2`.
  - Align types to React 18 (e.g., `^18.3.x`) or upgrade runtime React to 19 if intentional.

- Node/engines:
  - Consider adding `"engines": { "node": ">=18 <21" }` for CI consistency. Local logs showed Node v24; not all CI/hosting targets support it.

## 5) Types & Code Quality

- Several `any` casts reduce type safety (examples):
  - ControlPanelView: `webapp/src/components/views/ControlPanelView.tsx:18, 57, 70, 108, 112` etc.
  - ProfilingCharts tooltip payload: `webapp/src/components/profiling/ProfilingCharts.tsx:33`.
  - ColorManagement palette mapping: `webapp/src/components/control/ColorManagement.tsx:80, 106, 113`.

Recommendations

- Introduce narrow interfaces for firmware payloads (`FirmwarePattern`, `FirmwarePalette`, etc. already exist) and map into explicit UI types to eliminate `as any` in views.
- Add a `typecheck` script (`tsc --noEmit`) to CI to catch regressions.

## 6) Accessibility

Strengths

- Skeletons use `role="status"` and labels while loading charts.
- Carousel and UI components include appropriate `role` and ARIA attributes.

Gaps & Suggestions

- Nav active state: add `aria-current="page"` to the active top-nav button.
  - File: `webapp/src/components/TopNav.tsx:25`.
- Live status: make StatusBar updates discoverable to AT by wrapping numbers in a region with `aria-live="polite"`.
  - File: `webapp/src/components/control/StatusBar.tsx:1`.
- Ensure all icon-only buttons that lack visible text have `aria-label` (spot-check showed most buttons have labels; re-confirm as you wire new actions).

## 7) Security & Networking

- API base URL builder allows `http://` and `https://` (good). Default is `http://` if no scheme specified.
  - File: `webapp/src/lib/api.ts:39`.
- `no-cors` fallbacks for POSTs return `{ ok: true }` without confirmable body (opaque response). This is helpful for firmware CORS quirks but can mask failures.
  - Files: `webapp/src/lib/api.ts:98, 125, 166`.
  - Suggest surfacing an “unconfirmed send” status in the UI when falling back to `no-cors`, and optionally retry with confirmable flow when available.
- Web Serial usage is feature-detected and gated; UI hints HTTPS requirement.
  - File: `webapp/src/components/Sidebar.tsx:157`.
- External fonts are loaded from Google Fonts over HTTPS in CSS.
  - Files: `webapp/src/index.css:1`, `webapp/src/styles/globals.css:1`.
  - Optional: self-host fonts if offline/air‑gapped operation is desired; consider CSP if deploying to locked-down environments.

## 8) Testing & CI

- Tests
  - Vitest + Testing Library present; one unit test for mock metrics.
    - Files: `webapp/src/lib/mockData.test.ts:1`, `webapp/src/test/setup.ts:1`.
  - Add `vitest.config.ts` to register `setupFiles` consistently.
    - Example:
      ```ts
      // vitest.config.ts
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
        },
      });
      ```
  - Scripts are present: `test`, `test:watch`, `test:ui`.

- Type checks
  - Add `"typecheck": "tsc --noEmit"` to scripts and run in CI.

## 9) Notable Changes Implemented in This Pass

- Fixed invalid package name to unblock installs (`webapp/package.json`).
- Added vendor chunking rules in Vite (`webapp/vite.config.ts`).
- Route-level lazy loading for Profiling, Terminal, Graph, Analysis (`webapp/src/App.tsx`).
- Lazy-loaded charts and added per-panel render deferral (`webapp/src/components/views/ProfilingView.tsx`, `webapp/src/components/profiling/ProfilingCharts.tsx`, `webapp/src/components/common/LazyVisible.tsx`).
- Lazy-loaded Graph modals (`webapp/src/components/views/GraphEditorView.tsx`).
- Hover prefetch in TopNav (`webapp/src/components/TopNav.tsx`).
- Idle prefetch with a user-facing toggle in Sidebar; persisted via `localStorage` (`webapp/src/App.tsx`, `webapp/src/components/Sidebar.tsx`).
- Added `preview` script; verified build output.

## 10) Actionable Next Steps (Prioritized)

P0 – Reliability

- Align React types with runtime React 18 or upgrade runtime to React 19 for parity.
- Replace `"*"` versions for `clsx` and `tailwind-merge` with pinned caret ranges based on the lockfile.

P1 – UX/Perf

- Add `aria-current="page"` to the active top-nav button; add `aria-live` region in StatusBar.
- Mark “opaque success” conditions in API POST fallbacks as “unconfirmed” in UI feedback (e.g., Sonner toast variant) to avoid silent failures.
- Optionally add a “Hover Prefetch” toggle next to the Idle Prefetch setting for full control.

P2 – DX/CI

- Add `vitest.config.ts` with `setupFiles`; add `typecheck` script; consider `engines` field for Node.
- Consider `vite-plugin-visualizer` locally to periodically review chunk graphs.

P3 – Deployment Hardening (Optional)

- Self-host fonts; consider CSP headers if deployed in restricted environments.
- Add perf budgets (e.g., keep initial JS < 200 kB raw) and monitor with CI artifacts.

---

If you’d like, I can apply the P0 and P1 items now (pin versions, align types, and add small a11y touches) and raise a PR for review.

