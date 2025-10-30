# Song Analysis Module – Backend & Frontend Integration Specification

This document details the engineering work required to replace the current mock-driven Song Analysis view with fully functional backend integrations, live data pipelines, and UI behaviours. Each section outlines API contracts, storage, data flow, and frontend consumption patterns.

---

## 1. Track Catalogue API

### 1.1 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tracks` | Returns paginated list of analysed tracks. Supports search, status filter, preset filter, pagination. |
| GET | `/api/v1/tracks/{trackId}` | Returns metadata, latest version, available bundle versions, and artefact manifest. |
| GET | `/api/v1/tracks/{trackId}/versions/{version}` | Returns specific analysis version details (metadata + artefact manifest). |

### 1.2 Request Parameters
`GET /api/v1/tracks?status=ready&search=midnight&limit=20&offset=0&preset=edm`
- `status`: optional, one of `processing|ready|warning|failed`.
- `preset`: optional, analysis preset identifier (e.g. edm, rock).
- `search`: optional, fuzzy match on title/artist/tags.
- `limit`/`offset`: pagination.

### 1.3 Response Schema
```json
{
  "total": 123,
  "items": [
    {
      "id": "trk_9e1b8b",
      "title": "Midnight Dreams",
      "artist": "Electronic Artist",
      "duration_ms": 204000,
      "bpm": 128,
      "f_measure": 0.962,
      "status": "ready",
      "preset": "edm",
      "updated_at": "2025-11-02T12:45:00Z",
      "current_version": 3
    }
  ]
}
```

`GET /api/v1/tracks/{id}`
```json
{
  "track": {
    "id": "trk_9e1b8b",
    "title": "Midnight Dreams",
    "artist": "Electronic Artist",
    "duration_ms": 204000,
    "bpm": 128,
    "f_measure": 0.962,
    "status": "ready",
    "preset": "edm",
    "tags": ["club", "edm"],
    "created_at": "2025-10-31T18:20:00Z",
    "updated_at": "2025-11-02T12:45:00Z"
  },
  "versions": [
    {
      "version": 3,
      "created_at": "2025-11-02T12:45:00Z",
      "artefacts": [
        { "type": "genesis_map", "path": "s3://analysis/trk_9e1b8b/v3/track.genesis.json", "size_bytes": 820312 },
        { "type": "metrics", "path": "s3://analysis/trk_9e1b8b/v3/phase2b_metrics.json", "size_bytes": 12403 }
      ]
    },
    { "version": 2, "created_at": "2025-11-01T09:10:00Z", "artefacts": [...] }
  ]
}
```

### 1.4 Storage
- Tracks table: `tracks(id, title, artist, duration_ms, bpm, f_measure, status, preset, tags jsonb, created_at, updated_at)`.
- Track versions table: `track_versions(track_id, version, artefact_manifest jsonb, runtime_estimate_ms, firmware_min_version, created_at)`.
- Artefacts stored in S3 under `analysis/{track_id}/v{version}/`.

### 1.5 Frontend Integration
- Replace `MOCK_TRACKS` in `analysis/mock-data.ts` with React Query hook loading `/api/v1/tracks`.
- Use infinite scroll/virtualisation for list (react-window) with server-side pagination.
- Track detail view fetches `/api/v1/tracks/{id}` and memoises selected version.

---

## 2. Analysis Artefact Fetchers

### 2.1 Artefact Types
| Artefact | Description | Stored As |
|----------|-------------|-----------|
| `track.genesis.json` | Genesis Map v4 | JSON |
| `phase2b_metrics.json` | Synthetic/real metrics (F-measure, Cemgil, tempo) | JSON |
| `graph.metrics.json` | Graph structural metrics (nodes, edges, DAG flag) | JSON |
| `graph.estimate.json` | Runtime estimate (est_ms, cpu_pct, mem_mb) | JSON |
| `graph.validation.json` | Validation violations (ruleId, nodeId, severity) | JSON |
| `graph.impact.json` | Node diff metadata (added/removed/changed) | JSON |
| `graph.executor.scale.json` | Simulation results | JSON |
| `visual.report.json` | Visual QA (pixel mismatch, LAB delta) | JSON |
| `profile.speedscope.json` | Profiling trace | JSON |
| `graph.analysis.beat_override.json` | Manual beat edits | JSON |

### 2.2 Access Strategy
- `GET /api/v1/tracks/{id}/versions/{version}/artefacts` returns signed URLs or direct JSON payload (depending on size).
  ```json
  {
    "artefacts": {
      "genesis_map": "https://signed.s3/path/track.genesis.json",
      "metrics": "https://signed.s3/path/phase2b_metrics.json",
      "graph_metrics": "...",
      "graph_estimate": "...",
      "graph_validation": "...",
      "graph_impact": "...",
      "graph_executor_scale": "...",
      "visual_report": "...",
      "speedscope": "...",
      "beat_override": "..."
    }
  }
  ```
- Alternatively, provide a manifest with inline `inline_json` flag to reduce round-trips for small artefacts (metrics, estimates).

### 2.3 Frontend Consumption
- React Query hook loads manifest, then uses `Promise.allSettled` to fetch JSON in parallel (ensuring missing optional files fall back gracefully).
- Chart components (`BeatGridChart`, `FrequencyChart`, etc.) parse relevant sections: e.g., `genesis_map.layers.frequency` for stacks, `beat_override` for manual edits.
- Speedscope button fetches trace on demand (lazy import for viewer).

---

## 3. Upload & Analysis Workflow

### 3.1 Flow
1. User uploads audio file (+ metadata) via `POST /api/v1/tracks/upload`.
   - Endpoint writes raw file to staging bucket (e.g., `uploads/{track_id}/{uuid}.mp3`).
   - Response returns `track_id`, initial metadata, and `job_id`.
2. Analysis job enqueued via worker queue (e.g., RabbitMQ). Worker pulls job, performs analysis (beat detection, Genesis map, metrics), stores artefacts, updates track status.
3. Progress & status exposed via:
   - `GET /api/v1/analysis/jobs/{job_id}` – returns `status: queued|processing|completed|failed`, `eta_seconds`, `warnings`.
   - `GET /api/v1/analysis/jobs?status=processing` – list of active jobs (for queue badge).
4. Upload modal polls job or uses SSE/WS updates (optional) to refresh queue data. Once completed, auto-select new track and show toast.

### 3.2 API Contracts
`POST /api/v1/tracks/upload`
```json
Form-data:
  file: multipart (audio)
  title: string
  artist: string
  tags?: string[]
  preset?: string
Response:
{
  "track_id": "trk_9e1b8b",
  "job_id": "job_12345",
  "status": "queued"
}
```

`GET /api/v1/analysis/jobs/{id}`
```json
{
  "job_id": "job_12345",
  "track_id": "trk_9e1b8b",
  "status": "processing",
  "queue_position": 2,
  "estimated_seconds_remaining": 75,
  "log_tail": ["Extracting features...", "Computing beat grid..."]
}
```

`GET /api/v1/analysis/jobs`
```json
{
  "jobs": [
    { "job_id": "job_12345", "track_id": "trk_9e1b8b", "status": "processing" },
    { "job_id": "job_12346", "track_id": "trk_abcd", "status": "queued" }
  ]
}
```

### 3.3 Frontend Updates
- Upload modal posts to `/tracks/upload`, updates queue data via React Query `useQuery` polling `jobs`.
- Toolbar worker badge shows `active/total` workers (provided by separate `/api/v1/analysis/workers` endpoint) + queue length (from `jobs`).
- Activity log consumes job status changes (success/warning/failure) to display real-time updates.

---

## 4. Telemetry Stream (SSE/WS)

### 4.1 Endpoint
- `GET /api/v1/tracks/{trackId}/telemetry/stream` (Server-Sent Events preferred; fallback to WebSocket).
- Message format (JSON per event):
```json
{
  "timestamp": "2025-11-02T12:50:01.234Z",
  "drift_ms": 12.4,
  "cpu_pct": 58.2,
  "temp_c": 51.8,
  "error": null
}
```
- On error/rollback events:
```json
{
  "timestamp": "...",
  "event": "auto_rollback",
  "details": {
    "device_id": "Device-02",
    "reason": "drift_ms > 100 for 5s"
  }
}
```

### 4.2 Frontend Consumption
- Use EventSource (SSE) in `AnalysisView` to populate activity log and runtime strip. When connection drops, show grey info entry and attempt reconnect with backoff.
- Aggregate telemetry in React state (bounded history) for drift risk evaluation.

---

## 5. Deployment Orchestrator Hooks

### 5.1 API
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tracks/{trackId}/versions/{version}/bundle` | Returns bundle meta (manifest, compatibility info, runtime estimate). |
| POST | `/api/v1/deployments` | Initiates deployment to device(s). |
| GET | `/api/v1/deployments/{deploymentId}` | Returns deployment status, logs, rollback info. |

`GET bundle` response:
```json
{
  "manifest": {
    "bundle_version": "1.0.3",
    "firmware_min_version": "2.5.0",
    "required_nodes": ["BeatPulse", "TempoTracker"],
    "map_version": "v4.0",
    "checksum_sha256": "..."
  },
  "runtime_estimate": {
    "est_ms": 7.3,
    "cpu_pct": 62,
    "confidence": 0.82
  },
  "compatibility": [
    { "device_id": "Device-01", "firmware": "2.6.1", "status": "ok" },
    { "device_id": "Device-02", "firmware": "2.4.0", "status": "upgrade_required" }
  ]
}
```

`POST /deployments`
```json
Request:
{
  "track_id": "trk_9e1b8b",
  "version": 3,
  "device_ids": ["Device-01", "Device-03"]
}
Response:
{
  "deployment_id": "dep_0001",
  "status": "queued"
}
```

### 5.2 Frontend
- `DeploySideSheet` fetches bundle info to display compatibility badges and enable/disable deploy button.
- After user confirms deployment, poll `/deployments/{id}` to update status; log results to Activity strip.

---

## 6. Real-time Monitoring & Frontend Caching

### 6.1 React Query Setup
- `useTracksQuery(params)` – loads `/tracks` with caching, pagination, and search debouncing (150ms).
- `useTrackDetail(trackId)` – fetches `/tracks/{id}` and caches for quick switching.
- `useArtefactManifest(trackId, version)` – fetches manifest + sequentially loads JSON artefacts using `queryClient.fetchQuery`.
- `useAnalysisJobs()` – fetches `/analysis/jobs` (poll interval 5s or SSE).
- Configure query cache TTL ~5 minutes; use `refetchOnWindowFocus` for staleness.

### 6.2 Virtualisation
- Track list: adopt `react-window` or `react-virtualized` for >50 items; integrate with query results (infinite scroll).
- Charts: ensure no heavy re-renders; operations restricted to data updates (no structural re-renders).

---

## 7. Graph Preset Diff & Simulation Data

### 7.1 Backend Output
- Extend analysis worker to compute diff between recommended template and current graph configuration:
  ```json
  {
    "added_nodes": ["IntensityNormalizer"],
    "removed_nodes": ["LegacyVisualizer"],
    "changed_params": [
      { "node": "ColorMapper", "param": "gain", "from": 1.2, "to": 1.4 }
    ],
    "template_version": "preset_edm_v5",
    "confidence": 0.82
  }
  ```
- `graph.executor.scale.json` should contain simulation results:
  ```json
  {
    "before_ms": 9.4,
    "after_ms": 7.1,
    "cpu_pct_before": 81,
    "cpu_pct_after": 62
  }
  ```

### 7.2 Frontend
- `GraphPresetCard` reads diff arrays to render two-column lists, uses simulation data for overlay.
- Provide action to trigger “Simulate” by calling `/api/v1/tracks/{id}/versions/{version}/simulate`, which runs executor and updates artefact.

---

## 8. Manual Beat Override Persistence

### 8.1 API
- `POST /api/v1/tracks/{trackId}/versions/{version}/beat-override`
  ```json
  {
    "beats": [0.0, 0.469, 0.938, ...],
    "edited_by": "user@example.com",
    "note": "Aligned intro"
  }
  ```
- `GET` returns current override (if any).
- Worker merges override into runtime pipeline and includes it in artefact manifest.

### 8.2 Frontend
- Beat grid editor writes to override endpoint; success updates local state and adds log entry (“Manual override saved by …”).
- Display badge + metadata (editedBy, editedAt) in overview card.

---

## 9. Artefact Management Actions

### 9.1 Operations
- `POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/copy-link` → returns time-limited signed URL.
- `POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/restore` → undeletes artefact.
- `DELETE /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}` → soft-delete, returns undo token (valid 30s).
- `GET /api/v1/storage/usage` → returns overall usage (total bytes, per track) for progress bar.

Example storage usage response:
```json
{
  "total_bytes": 5368709120,
  "used_bytes": 3858759680,
  "top_artefacts": [
    { "track_id": "trk_9e1b8b", "version": 3, "name": "track.genesis.json", "size_bytes": 820312 },
    { "track_id": "trk_abcd", "version": 1, "name": "profile.speedscope.json", "size_bytes": 2240512 }
  ]
}
```

### 9.2 Frontend
- `ArtifactTable` buttons call relevant endpoints, optimistically update UI (copy link uses clipboard API, restore/delete toggle state).
- Storage usage bar uses `GET /api/v1/storage/usage`.
- Provide undo snackbar for soft delete (calls restore endpoint with undo token).

---

## 10. Outstanding Engineering Tasks Summary
| Item | Team | Notes |
|------|------|-------|
| Track catalogue APIs & DB schema | Backend | Build services and migrations. |
| Analysis artefact manifest + signed URL service | Backend | Provide secure access control. |
| Upload/analysis job orchestration | Backend | Worker pipeline, queue infrastructure, job APIs. |
| Telemetry SSE service | Backend | Reuse existing device metrics or create new tracker. |
| Deployment orchestrator endpoints | Backend | Integrate with bundle builder/device manager. |
| React Query hooks + virtualization | Frontend | Replace mocks with live data, ensure performance budgets. |
| Graph diff & simulation outputs | Backend | Extend analysis engine to compute diffs/estimates. |
| Beat override storage | Backend | New endpoint, gating for audit trail. |
| Artefact management actions | Backend | Signed URL service, storage usage metrics, soft-delete workflow. |

---

## 11. Implementation Order (Recommended)
1. Track catalogue APIs (foundation for list/detail).  
2. Artefact manifest service (enables charts/metrics).  
3. Telemetry + activity log stream (quick win for live status).  
4. Upload & job queue (replace modal placeholders).  
5. Deployment bundle API & compatibility checks.  
6. Graph diff/simulation output.  
7. Beat override endpoints.  
8. Artefact management actions/storage usage.  
9. React Query/virtualisation rollout + remove mocks.

---

Delivering these services/models will allow the Song Analysis tab to transition from static prototypes to a production-ready tool tightly integrated with the backend pipelines. Each component already has UI scaffolding—just wire in the data sources described above. Upon completion, deprecate `analysis/mock-data.ts` and remove Figma prototype dependencies.
