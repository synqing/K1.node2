# Design Document

## Overview

The Song Analysis Module design follows a three-tier architecture: backend services (Node.js/Python), data storage (PostgreSQL + S3), and frontend application (React + TypeScript). The system processes audio files through an asynchronous analysis pipeline, stores artifacts in object storage, and provides real-time updates via Server-Sent Events. The frontend consumes REST APIs through React Query for caching and state management, implements virtual scrolling for performance, and renders interactive charts using Recharts.

The design prioritizes separation of concerns: the backend handles compute-intensive analysis and storage orchestration, while the frontend focuses on responsive UI and real-time data visualization. Communication occurs through well-defined REST API contracts with JSON payloads, supplemented by SSE for telemetry streaming.

## Architecture

### System Context

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │◄───────►│  Control Dashboard│◄───────►│  Backend    │
│  (User)     │  HTTPS  │   (React SPA)     │   REST  │   Services  │
└─────────────┘         └──────────────────┘         └──────┬──────┘
                                                              │
                                                              ▼
                                                      ┌───────────────┐
                                                      │  PostgreSQL   │
                                                      │  + S3 Storage │
                                                      └───────────────┘
```

### Component Architecture

```
Frontend (React)
├── Views
│   └── AnalysisView (main container)
├── Components
│   ├── Toolbar (upload, analyze, deploy actions)
│   ├── TrackList (virtualized list with search/filter)
│   ├── TrackDetail (metadata + version selector)
│   ├── Charts (BeatGrid, Frequency, Dynamics, Sections)
│   ├── GraphPresetCard (recommendations + diff)
│   ├── ArtifactTable (download, restore, delete)
│   ├── ActivityLog (telemetry + events)
│   ├── UploadModal (file + metadata input)
│   └── DeploySideSheet (device selection + deployment)
├── API Layer
│   ├── React Query hooks (useTracksQuery, useTrackDetail, etc.)
│   └── API client (fetch wrappers with error handling)
└── State Management
    ├── React Query cache (5-minute TTL)
    └── Local state (selected track, filters, UI toggles)

Backend Services
├── REST API (Express/FastAPI)
│   ├── /api/v1/tracks (CRUD + search)
│   ├── /api/v1/tracks/{id}/versions (version management)
│   ├── /api/v1/tracks/{id}/telemetry/stream (SSE)
│   ├── /api/v1/analysis/jobs (queue management)
│   ├── /api/v1/deployments (orchestration)
│   └── /api/v1/storage/usage (metrics)
├── Analysis Worker (Python)
│   ├── Beat detection (librosa + madmom)
│   ├── Spectral analysis (FFT + mel-spectrogram)
│   ├── Genesis Map generation
│   └── Metrics computation (F-measure, Cemgil)
├── Job Queue (RabbitMQ/Redis)
└── Storage Service
    ├── S3 client (signed URLs)
    └── Artifact manifest builder

Data Storage
├── PostgreSQL
│   ├── tracks table
│   ├── track_versions table
│   ├── analysis_jobs table
│   └── deployments table
└── S3 Buckets
    ├── uploads/ (raw audio files)
    └── analysis/ (generated artifacts)
```

### Data Flow

**Upload & Analysis Flow:**
1. User uploads audio file via UploadModal
2. Frontend POSTs multipart form to `/api/v1/tracks/upload`
3. Backend writes file to S3 `uploads/` bucket, creates track record, enqueues analysis job
4. Worker pulls job, performs analysis, generates artifacts, stores in S3 `analysis/` bucket
5. Worker updates track status to "ready" and writes artifact manifest
6. Frontend polls `/api/v1/analysis/jobs/{id}` every 5s, updates UI on completion

**Track Detail Flow:**
1. User selects track from list
2. Frontend fetches `/api/v1/tracks/{id}` (metadata + versions)
3. Frontend fetches `/api/v1/tracks/{id}/versions/{version}/artefacts` (manifest with signed URLs)
4. Frontend uses Promise.allSettled to fetch JSON artifacts in parallel
5. Charts parse relevant sections (genesis_map.layers.frequency, beat_override, etc.)
6. Missing artifacts fall back to placeholder states

**Deployment Flow:**
1. User clicks deploy button
2. Frontend fetches `/api/v1/tracks/{id}/versions/{version}/bundle` (compatibility + estimate)
3. DeploySideSheet displays device list with compatibility badges
4. User selects devices and confirms
5. Frontend POSTs to `/api/v1/deployments` with track_id, version, device_ids
6. Backend enqueues deployment jobs, returns deployment_id
7. Frontend polls `/api/v1/deployments/{id}` every 3s, updates activity log

**Telemetry Flow:**
1. Frontend establishes SSE connection to `/api/v1/tracks/{id}/telemetry/stream`
2. Backend streams JSON events: `{ timestamp, drift_ms, cpu_pct, temp_c, error }`
3. Frontend appends events to ActivityLog, updates runtime strip
4. On connection drop, frontend displays grey info entry, attempts reconnect with exponential backoff

## Components and Interfaces

### Backend API Endpoints

#### Track Catalogue

**GET /api/v1/tracks**
- Query params: `status`, `preset`, `search`, `limit`, `offset`
- Response: `{ total: number, items: Track[] }`
- Caching: 5-minute TTL in React Query
- Pagination: Server-side with limit/offset

**GET /api/v1/tracks/{trackId}**
- Response: `{ track: Track, versions: Version[] }`
- Includes: metadata, current version, version history, artifact manifest

**GET /api/v1/tracks/{trackId}/versions/{version}**
- Response: `{ version: number, created_at: string, artefacts: Artefact[] }`

#### Analysis Jobs

**POST /api/v1/tracks/upload**
- Body: multipart form-data (file, title, artist, tags, preset)
- Response: `{ track_id: string, job_id: string, status: string }`
- Validation: max file size 100MB, formats: mp3, wav, flac, m4a

**GET /api/v1/analysis/jobs/{jobId}**
- Response: `{ job_id, track_id, status, queue_position, estimated_seconds_remaining, log_tail }`
- Polling: 5-second interval

**GET /api/v1/analysis/jobs**
- Query params: `status` (optional filter)
- Response: `{ jobs: Job[] }`
- Used for: queue badge count

#### Artifacts

**GET /api/v1/tracks/{trackId}/versions/{version}/artefacts**
- Response: `{ artefacts: { genesis_map: string, metrics: string, ... } }`
- Returns: signed S3 URLs (1-hour expiry) or inline JSON for small artifacts

**POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/copy-link**
- Response: `{ url: string, expires_at: string }`

**DELETE /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}**
- Response: `{ undo_token: string }`
- Soft-delete: 30-second undo window

**POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/restore**
- Body: `{ undo_token: string }`
- Response: `{ ok: boolean }`

#### Telemetry

**GET /api/v1/tracks/{trackId}/telemetry/stream**
- Protocol: Server-Sent Events (SSE)
- Event format: `data: { timestamp, drift_ms, cpu_pct, temp_c, error }\n\n`
- Reconnection: exponential backoff (1s, 2s, 4s, 8s, max 30s)

#### Deployments

**GET /api/v1/tracks/{trackId}/versions/{version}/bundle**
- Response: `{ manifest, runtime_estimate, compatibility }`
- Includes: firmware_min_version, required_nodes, checksum

**POST /api/v1/deployments**
- Body: `{ track_id, version, device_ids }`
- Response: `{ deployment_id, status }`

**GET /api/v1/deployments/{deploymentId}**
- Response: `{ deployment_id, status, logs, rollback_info }`
- Polling: 3-second interval

#### Beat Override

**POST /api/v1/tracks/{trackId}/versions/{version}/beat-override**
- Body: `{ beats: number[], edited_by: string, note: string }`
- Response: `{ ok: boolean }`
- Triggers: re-analysis job to update dependent artifacts

**GET /api/v1/tracks/{trackId}/versions/{version}/beat-override**
- Response: `{ beats: number[], edited_by, edited_at, note }`

#### Storage

**GET /api/v1/storage/usage**
- Response: `{ total_bytes, used_bytes, top_artefacts }`
- Used for: storage progress bar

### Frontend Components

#### AnalysisView (Container)
- **Props**: `connectionState?: ConnectionState`
- **State**: `selectedTrackId`, `uploadOpen`, `deployOpen`, `isMobile`
- **Hooks**: `useTracksQuery()`, `useTrackDetail(selectedTrackId)`
- **Responsibilities**: Layout orchestration, state coordination, responsive breakpoints

#### Toolbar
- **Props**: `onUploadClick`, `onAnalyseClick`, `onDeployClick`
- **Features**: Queue badge (active/total workers + queue length), action buttons
- **Data**: `useAnalysisJobs()` hook for queue status

#### TrackList
- **Props**: `tracks`, `selectedId`, `onSelect`, `searchQuery`, `statusFilter`, `presetFilter`
- **Virtualization**: react-window with 50-item threshold
- **Performance**: Memoized list items, debounced search (150ms)

#### TrackDetail
- **Props**: `track`, `versions`, `selectedVersion`, `onVersionChange`
- **Features**: Metadata display, version selector, status badges
- **Badges**: Bundle ready, runtime estimate, firmware compatibility

#### BeatGridChart
- **Props**: `genesisMap`, `beatOverride`, `onBeatEdit`
- **Data**: Parses `genesis_map.layers.beat` + `beat_override.beats`
- **Interactions**: Click to add/move/delete beats, drag to adjust positions
- **Library**: Recharts with custom overlay for beat markers

#### FrequencyChart
- **Props**: `genesisMap`
- **Data**: Parses `genesis_map.layers.frequency` (stacked area chart)
- **Features**: Frequency band labels, time axis, energy scale

#### DynamicsChart
- **Props**: `genesisMap`
- **Data**: Parses `genesis_map.layers.dynamics` (line chart)
- **Features**: Amplitude envelope, dynamic range indicator

#### SectionsTimeline
- **Props**: `genesisMap`
- **Data**: Parses `genesis_map.sections` (horizontal timeline)
- **Features**: Color-coded sections (intro, verse, chorus, bridge, outro)

#### GraphPresetCard
- **Props**: `trackId`, `version`
- **Data**: `useGraphDiff(trackId, version)` hook
- **Features**: Two-column diff (added/removed/changed), simulation results, apply button

#### ArtifactTable
- **Props**: `artifacts`, `onCopyLink`, `onDelete`, `onRestore`
- **Features**: Name, type, size, age, SHA, status columns, action buttons
- **State**: Optimistic updates for delete/restore

#### ActivityLog
- **Props**: `telemetryStream`
- **Data**: SSE connection via `useTelemetryStream(trackId)`
- **Features**: Auto-scroll, severity icons (info/warning/error), timestamp

#### UploadModal
- **Props**: `open`, `onOpenChange`
- **Form**: File input, title, artist, tags (multi-select), preset (dropdown)
- **Validation**: File size (<100MB), format (mp3/wav/flac/m4a), required fields
- **Submission**: Multipart form-data POST, progress indicator

#### DeploySideSheet
- **Props**: `open`, `onOpenChange`, `trackId`, `version`
- **Data**: `useBundleInfo(trackId, version)` hook
- **Features**: Device list with compatibility badges, runtime estimate, deploy button

### React Query Hooks

```typescript
// Track catalogue with search/filter/pagination
function useTracksQuery(params: {
  status?: string;
  preset?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['tracks', params],
    queryFn: () => fetchTracks(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Track detail with versions
function useTrackDetail(trackId: string) {
  return useQuery({
    queryKey: ['track', trackId],
    queryFn: () => fetchTrackDetail(trackId),
    staleTime: 5 * 60 * 1000,
  });
}

// Artifact manifest with signed URLs
function useArtefactManifest(trackId: string, version: number) {
  return useQuery({
    queryKey: ['artefacts', trackId, version],
    queryFn: async () => {
      const manifest = await fetchArtefactManifest(trackId, version);
      // Fetch JSON artifacts in parallel
      const results = await Promise.allSettled(
        Object.entries(manifest.artefacts).map(([key, url]) =>
          fetch(url).then(r => r.json()).then(data => [key, data])
        )
      );
      // Handle missing artifacts gracefully
      return results.reduce((acc, result) => {
        if (result.status === 'fulfilled') {
          const [key, data] = result.value;
          acc[key] = data;
        }
        return acc;
      }, {} as Record<string, any>);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Analysis jobs for queue monitoring
function useAnalysisJobs() {
  return useQuery({
    queryKey: ['analysis-jobs'],
    queryFn: fetchAnalysisJobs,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Telemetry stream via SSE
function useTelemetryStream(trackId: string) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/v1/tracks/${trackId}/telemetry/stream`);
    
    eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
    };
    
    eventSource.onerror = () => {
      // Exponential backoff reconnection handled by EventSource
      setEvents(prev => [...prev, {
        severity: 'info',
        message: 'Telemetry connection lost, reconnecting...',
        timestamp: new Date().toISOString(),
      }]);
    };
    
    return () => eventSource.close();
  }, [trackId]);
  
  return events;
}
```

## Data Models

### Database Schema

```sql
-- Tracks table
CREATE TABLE tracks (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  duration_ms INTEGER NOT NULL,
  bpm INTEGER,
  f_measure DECIMAL(4,3),
  status VARCHAR(20) NOT NULL, -- processing, ready, warning, failed
  preset VARCHAR(50),
  tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_preset ON tracks(preset);
CREATE INDEX idx_tracks_search ON tracks USING gin(to_tsvector('english', title || ' ' || artist));

-- Track versions table
CREATE TABLE track_versions (
  track_id VARCHAR(32) REFERENCES tracks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  artefact_manifest JSONB NOT NULL,
  runtime_estimate_ms DECIMAL(5,2),
  firmware_min_version VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (track_id, version)
);

-- Analysis jobs table
CREATE TABLE analysis_jobs (
  id VARCHAR(32) PRIMARY KEY,
  track_id VARCHAR(32) REFERENCES tracks(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- queued, processing, completed, failed
  queue_position INTEGER,
  estimated_seconds_remaining INTEGER,
  log_tail TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_jobs_track ON analysis_jobs(track_id);

-- Deployments table
CREATE TABLE deployments (
  id VARCHAR(32) PRIMARY KEY,
  track_id VARCHAR(32) REFERENCES tracks(id),
  version INTEGER NOT NULL,
  device_ids TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL, -- queued, deploying, completed, failed
  logs JSONB,
  rollback_info JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_track ON deployments(track_id);
```

### TypeScript Types

```typescript
// Track model
interface Track {
  id: string;
  title: string;
  artist: string;
  duration_ms: number;
  bpm?: number;
  f_measure?: number;
  status: 'processing' | 'ready' | 'warning' | 'failed';
  preset?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  current_version?: number;
}

// Track version model
interface TrackVersion {
  version: number;
  created_at: string;
  artefacts: Artefact[];
  runtime_estimate_ms?: number;
  firmware_min_version?: string;
}

// Artefact model
interface Artefact {
  type: 'genesis_map' | 'metrics' | 'graph_metrics' | 'graph_estimate' | 
        'graph_validation' | 'graph_impact' | 'graph_executor_scale' | 
        'visual_report' | 'speedscope' | 'beat_override';
  path: string;
  size_bytes: number;
  sha256?: string;
  status?: 'active' | 'missing' | 'soft-deleted';
}

// Analysis job model
interface AnalysisJob {
  job_id: string;
  track_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queue_position?: number;
  estimated_seconds_remaining?: number;
  log_tail?: string[];
}

// Deployment model
interface Deployment {
  deployment_id: string;
  track_id: string;
  version: number;
  device_ids: string[];
  status: 'queued' | 'deploying' | 'completed' | 'failed';
  logs?: DeploymentLog[];
  rollback_info?: RollbackInfo;
}

// Telemetry event model
interface TelemetryEvent {
  timestamp: string;
  drift_ms?: number;
  cpu_pct?: number;
  temp_c?: number;
  error?: string;
  event?: 'auto_rollback';
  details?: Record<string, any>;
}

// Bundle info model
interface BundleInfo {
  manifest: {
    bundle_version: string;
    firmware_min_version: string;
    required_nodes: string[];
    map_version: string;
    checksum_sha256: string;
  };
  runtime_estimate: {
    est_ms: number;
    cpu_pct: number;
    confidence: number;
  };
  compatibility: DeviceCompatibility[];
}

interface DeviceCompatibility {
  device_id: string;
  firmware: string;
  status: 'ok' | 'upgrade_required' | 'incompatible';
}
```

## Error Handling

### Backend Error Responses

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "TRACK_NOT_FOUND",
    "message": "Track with ID 'trk_9e1b8b' does not exist",
    "details": {
      "track_id": "trk_9e1b8b"
    }
  }
}
```

**Error Codes:**
- `TRACK_NOT_FOUND` (404)
- `INVALID_FILE_FORMAT` (400)
- `FILE_TOO_LARGE` (413)
- `ANALYSIS_FAILED` (500)
- `DEPLOYMENT_FAILED` (500)
- `ARTIFACT_NOT_FOUND` (404)
- `UNAUTHORIZED` (401)
- `RATE_LIMIT_EXCEEDED` (429)

### Frontend Error Handling

**Network Errors:**
- Display toast notification with retry button
- Implement exponential backoff for retries (1s, 2s, 4s, 8s, max 30s)
- Log error to console for debugging

**Missing Artifacts:**
- Display placeholder chart with "Artifact not available" message
- Provide "Regenerate" button to trigger re-analysis

**SSE Connection Drops:**
- Display grey info entry in activity log
- Attempt reconnection with exponential backoff
- Show connection status indicator in toolbar

**Validation Errors:**
- Display inline error messages below form fields
- Prevent form submission until errors are resolved
- Highlight invalid fields with red border

**Deployment Failures:**
- Log failure reason in activity log
- Provide "View Logs" button to display detailed error information
- Offer "Retry" button for transient failures

## Testing Strategy

### Backend Testing

**Unit Tests:**
- API endpoint handlers (request validation, response formatting)
- Analysis worker functions (beat detection, spectral analysis)
- Storage service (S3 operations, signed URL generation)
- Database queries (CRUD operations, search, pagination)

**Integration Tests:**
- End-to-end upload → analysis → artifact storage flow
- Deployment orchestration with mock devices
- SSE telemetry streaming
- Job queue processing

**Performance Tests:**
- API response time (<200ms for GET requests)
- Analysis worker throughput (tracks per minute)
- Database query performance (search, pagination)
- S3 upload/download speed

### Frontend Testing

**Component Tests (Vitest + React Testing Library):**
- TrackList rendering and virtualization
- Chart components with mock data
- Form validation in UploadModal
- DeploySideSheet device selection

**Integration Tests (MSW):**
- Track catalogue loading with pagination
- Track detail fetching with artifact loading
- Upload flow with progress updates
- Deployment flow with status polling

**E2E Tests (Playwright):**
- Complete upload → analysis → visualization → deployment flow
- Search and filter functionality
- Beat override editing and saving
- Artifact management (copy link, delete, restore)

**Performance Tests:**
- Track list rendering with 1000+ items (maintain 60 FPS)
- Chart re-rendering on data updates (<16ms)
- React Query cache hit rate (>80%)
- Bundle size (<500KB gzipped)

### Test Data

**Mock Tracks:**
- EDM track (128 BPM, high F-measure)
- Rock track (140 BPM, moderate F-measure)
- Irregular track (variable tempo, low F-measure)
- Failed analysis track (corrupted file)

**Mock Artifacts:**
- Complete artifact set (all types present)
- Partial artifact set (missing optional artifacts)
- Corrupted artifact (invalid JSON)

## Performance Considerations

### Frontend Optimization

**React Query Caching:**
- 5-minute TTL for track catalogue and detail data
- Aggressive prefetching for adjacent tracks in list
- Background refetching on window focus

**Virtual Scrolling:**
- Implement react-window for lists >50 items
- Row height: 80px (fixed for performance)
- Overscan: 5 rows above/below viewport

**Chart Rendering:**
- Use React.memo for chart components
- Debounce data updates (100ms)
- Limit data points (max 1000 per chart)
- Lazy-load Speedscope viewer (code-splitting)

**Bundle Size:**
- Code-splitting for analysis view (<100KB initial)
- Lazy-load chart libraries (Recharts ~50KB)
- Tree-shake unused Radix UI components

### Backend Optimization

**Database Indexing:**
- B-tree indexes on status, preset, created_at
- GIN index on full-text search (title + artist)
- Composite index on (track_id, version) for versions table

**API Response Time:**
- Target: <200ms for GET requests
- Implement Redis caching for frequently accessed tracks
- Use database connection pooling (max 20 connections)

**S3 Operations:**
- Generate signed URLs with 1-hour expiry
- Use multipart upload for files >5MB
- Implement CloudFront CDN for artifact downloads

**Worker Throughput:**
- Target: 10 tracks per minute per worker
- Horizontal scaling with multiple worker instances
- Job prioritization (user-initiated > batch)

## Security Considerations

**Authentication:**
- JWT-based authentication for API requests
- Refresh token rotation (7-day expiry)
- Rate limiting (100 requests per minute per user)

**Authorization:**
- Role-based access control (admin, user, viewer)
- Track ownership validation (users can only access their tracks)
- Signed S3 URLs with 1-hour expiry

**Input Validation:**
- File type validation (magic number check, not just extension)
- File size limit (100MB max)
- Metadata sanitization (prevent XSS in title/artist)
- SQL injection prevention (parameterized queries)

**Data Protection:**
- HTTPS for all API communication
- S3 bucket encryption at rest (AES-256)
- Database encryption at rest
- Audit logging for sensitive operations (delete, deploy)

## Deployment Strategy

**Backend Deployment:**
- Docker containers for API and workers
- Kubernetes for orchestration and scaling
- Blue-green deployment for zero-downtime updates
- Health checks on `/api/health` endpoint

**Frontend Deployment:**
- Static build deployed to CDN (CloudFront)
- Versioned assets with cache-busting
- Rollback capability via CDN invalidation

**Database Migrations:**
- Flyway for schema versioning
- Backward-compatible migrations (no breaking changes)
- Automated rollback on migration failure

**Monitoring:**
- Application metrics (Prometheus + Grafana)
- Error tracking (Sentry)
- Log aggregation (ELK stack)
- Uptime monitoring (Pingdom)
