# Implementation Plan

## Overview

This implementation plan transforms the Song Analysis Module from mock-based prototypes to a production-ready system. The plan follows an incremental approach: establish backend foundations first (database, APIs, storage), then build the analysis pipeline, and finally integrate the frontend. Each task builds on previous work, ensuring no orphaned code. The plan prioritizes core functionality over optional features, with testing integrated as sub-tasks rather than standalone phases.

## Task Breakdown

- [ ] 1. Database schema and storage infrastructure
- [x] 1.1 Create PostgreSQL schema with tracks, track_versions, analysis_jobs, and deployments tables
  - Write migration scripts using Flyway or similar tool
  - Add indexes for status, preset, full-text search on title/artist
  - Create composite indexes for (track_id, version) lookups
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Configure S3 buckets for uploads and analysis artifacts
  - Create `uploads/` bucket with lifecycle policy (delete after 30 days)
  - Create `analysis/` bucket with versioning enabled
  - Configure bucket encryption (AES-256)
  - Set up IAM roles and policies for backend access
  - _Requirements: 3.2, 6.1_

- [x] 1.3 Implement storage service for S3 operations
  - Write S3 client wrapper with signed URL generation (1-hour expiry)
  - Implement multipart upload for files >5MB
  - Add artifact manifest builder (JSON with paths, sizes, checksums)
  - Create storage usage calculator (total/used bytes)
  - _Requirements: 6.1, 6.2, 6.5_


- [ ] 2. Track catalogue REST API endpoints
- [x] 2.1 Implement GET /api/v1/tracks with pagination, search, and filtering
  - Add query parameter parsing (status, preset, search, limit, offset)
  - Implement full-text search using PostgreSQL tsvector
  - Add pagination with total count
  - Return JSON response with { total, items }
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Implement GET /api/v1/tracks/{trackId} for track detail
  - Fetch track metadata from database
  - Join with track_versions to get version history
  - Include artifact manifest for current version
  - Return JSON response with { track, versions }
  - _Requirements: 2.1_

- [x] 2.3 Implement GET /api/v1/tracks/{trackId}/versions/{version}
  - Fetch specific version metadata
  - Include artifact manifest with signed S3 URLs
  - Return JSON response with { version, created_at, artefacts }
  - _Requirements: 2.1, 10.2_

- [x] 2.4 Write integration tests for track catalogue endpoints
  - Test pagination with various limit/offset combinations
  - Test search with partial matches and special characters
  - Test filtering by status and preset
  - Test 404 responses for non-existent tracks
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

- [ ] 3. Upload and analysis job orchestration
- [x] 3.1 Implement POST /api/v1/tracks/upload endpoint
  - Add multipart form-data parsing (file, title, artist, tags, preset)
  - Validate file size (<100MB) and format (mp3, wav, flac, m4a)
  - Upload file to S3 uploads/ bucket
  - Create track record in database with status "processing"
  - Enqueue analysis job in RabbitMQ/Redis
  - Return JSON response with { track_id, job_id, status }
  - _Requirements: 3.1, 3.2_

- [x] 3.2 Implement analysis worker with beat detection and spectral analysis
  - Pull jobs from queue (RabbitMQ/Redis)
  - Download audio file from S3
  - Run beat detection using librosa/madmom
  - Compute spectral analysis (FFT, mel-spectrogram)
  - Generate Genesis Map v4 JSON
  - Compute metrics (F-measure, Cemgil, tempo)
  - Upload artifacts to S3 analysis/ bucket
  - Update track status to "ready" or "failed"
  - _Requirements: 3.3, 2.2, 2.3, 2.4, 2.5_

- [x] 3.3 Implement GET /api/v1/analysis/jobs/{jobId} for job status
  - Fetch job from database
  - Calculate queue position and ETA
  - Return JSON response with { job_id, track_id, status, queue_position, estimated_seconds_remaining, log_tail }
  - _Requirements: 3.3_

- [x] 3.4 Implement GET /api/v1/analysis/jobs for queue monitoring
  - Fetch all jobs with optional status filter
  - Return JSON response with { jobs }
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 3.5 Write integration tests for upload and analysis workflow
  - Test successful upload with valid audio file
  - Test validation errors (file too large, invalid format)
  - Test job status polling until completion
  - Test worker processing with mock audio file
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [ ] 4. Artifact management endpoints
- [x] 4.1 Implement GET /api/v1/tracks/{trackId}/versions/{version}/artefacts
  - Fetch artifact manifest from database
  - Generate signed S3 URLs for each artifact (1-hour expiry)
  - Return JSON response with { artefacts: { genesis_map: url, metrics: url, ... } }
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.2 Implement POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/copy-link
  - Generate signed S3 URL with 1-hour expiry
  - Return JSON response with { url, expires_at }
  - _Requirements: 6.2_

- [x] 4.3 Implement DELETE /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}
  - Soft-delete artifact (mark as deleted in manifest)
  - Generate undo token (valid 30 seconds)
  - Return JSON response with { undo_token }
  - _Requirements: 6.3_

- [x] 4.4 Implement POST /api/v1/tracks/{trackId}/versions/{version}/artefacts/{artefactId}/restore
  - Validate undo token
  - Restore artifact (remove deleted flag)
  - Return JSON response with { ok }
  - _Requirements: 6.4_

- [x] 4.5 Implement GET /api/v1/storage/usage for storage metrics
  - Calculate total and used bytes across all tracks
  - Identify top 10 largest artifacts
  - Return JSON response with { total_bytes, used_bytes, top_artefacts }
  - _Requirements: 6.5_

- [x] 4.6 Write integration tests for artifact management
  - Test artifact manifest fetching with signed URLs
  - Test copy link generation and expiry
  - Test soft-delete with undo token
  - Test restore with valid and expired tokens
  - Test storage usage calculation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Telemetry streaming with Server-Sent Events
- [x] 5.1 Implement GET /api/v1/tracks/{trackId}/telemetry/stream SSE endpoint
  - Establish SSE connection with proper headers (Content-Type: text/event-stream)
  - Stream telemetry events from device or mock source
  - Format events as JSON: { timestamp, drift_ms, cpu_pct, temp_c, error }
  - Handle client disconnection and cleanup
  - _Requirements: 4.1, 4.2_

- [x] 5.2 Add auto-rollback event detection and streaming
  - Monitor drift_ms threshold (>100ms for 5 seconds)
  - Emit auto_rollback event with device_id and reason
  - Format event as JSON: { timestamp, event: "auto_rollback", details: { device_id, reason } }
  - _Requirements: 4.3, 4.4_

- [x] 5.3 Write integration tests for telemetry streaming
  - Test SSE connection establishment
  - Test event streaming with mock telemetry data
  - Test auto-rollback event emission
  - Test client disconnection handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [ ] 6. Deployment orchestration endpoints
- [x] 6.1 Implement GET /api/v1/tracks/{trackId}/versions/{version}/bundle
  - Fetch bundle metadata (manifest, runtime estimate, compatibility)
  - Query device firmware versions
  - Calculate compatibility status (ok, upgrade_required, incompatible)
  - Return JSON response with { manifest, runtime_estimate, compatibility }
  - _Requirements: 5.1, 5.2_

- [x] 6.2 Implement POST /api/v1/deployments for deployment initiation
  - Validate track_id, version, and device_ids
  - Create deployment record in database
  - Enqueue deployment jobs for each device
  - Return JSON response with { deployment_id, status }
  - _Requirements: 5.3_

- [x] 6.3 Implement GET /api/v1/deployments/{deploymentId} for deployment status
  - Fetch deployment record from database
  - Aggregate status from individual device jobs
  - Return JSON response with { deployment_id, status, logs, rollback_info }
  - _Requirements: 5.4, 5.5_

- [x] 6.4 Write integration tests for deployment orchestration
  - Test bundle metadata fetching with compatibility checks
  - Test deployment initiation with multiple devices
  - Test deployment status polling
  - Test rollback scenario
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Beat override persistence
- [ ] 7.1 Implement POST /api/v1/tracks/{trackId}/versions/{version}/beat-override
  - Validate beats array (sorted, positive values)
  - Store override in database or S3 as JSON artifact
  - Trigger re-analysis job to update dependent artifacts
  - Return JSON response with { ok }
  - _Requirements: 7.1, 7.2_

- [ ] 7.2 Implement GET /api/v1/tracks/{trackId}/versions/{version}/beat-override
  - Fetch beat override from database or S3
  - Return JSON response with { beats, edited_by, edited_at, note }
  - _Requirements: 7.3_

- [ ] 7.3 Write integration tests for beat override
  - Test saving beat override with valid data
  - Test validation errors (unsorted, negative values)
  - Test fetching beat override
  - Test re-analysis trigger
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Graph preset recommendations
- [ ] 8.1 Extend analysis worker to compute graph diff
  - Compare current graph configuration with recommended template
  - Identify added nodes, removed nodes, and changed parameters
  - Store diff as graph.impact.json artifact
  - _Requirements: 8.1, 8.2_

- [ ] 8.2 Implement graph executor simulation
  - Run executor with current and recommended configurations
  - Measure runtime (ms) and CPU utilization (%)
  - Store results as graph.executor.scale.json artifact
  - _Requirements: 8.3_

- [ ] 8.3 Implement POST /api/v1/tracks/{trackId}/versions/{version}/simulate
  - Trigger executor simulation job
  - Update graph.executor.scale.json artifact
  - Return JSON response with { ok }
  - _Requirements: 8.4_

- [ ] 8.4 Write integration tests for graph preset recommendations
  - Test diff computation with mock configurations
  - Test executor simulation with mock graphs
  - Test simulation endpoint
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


- [ ] 9. Frontend React Query hooks and API client
- [ ] 9.1 Create API client functions for all backend endpoints
  - Implement fetchTracks with query parameters
  - Implement fetchTrackDetail with track ID
  - Implement fetchArtefactManifest with track ID and version
  - Implement uploadTrack with multipart form-data
  - Implement fetchAnalysisJobs with status filter
  - Implement fetchBundleInfo with track ID and version
  - Implement createDeployment with track ID, version, and device IDs
  - Implement fetchDeploymentStatus with deployment ID
  - Implement saveBeatOverride with track ID, version, and beats array
  - Implement fetchBeatOverride with track ID and version
  - Implement copyArtifactLink with track ID, version, and artifact ID
  - Implement deleteArtifact with track ID, version, and artifact ID
  - Implement restoreArtifact with track ID, version, artifact ID, and undo token
  - Implement fetchStorageUsage
  - Add error handling with consistent error format
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2, 3.3, 4.1, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_

- [ ] 9.2 Implement React Query hooks for data fetching
  - Create useTracksQuery with pagination, search, and filter parameters
  - Create useTrackDetail with track ID
  - Create useArtefactManifest with track ID and version (parallel artifact fetching)
  - Create useAnalysisJobs with 5-second polling
  - Create useBundleInfo with track ID and version
  - Create useDeploymentStatus with deployment ID and 3-second polling
  - Create useBeatOverride with track ID and version
  - Create useStorageUsage
  - Configure 5-minute staleTime for all queries
  - Enable refetchOnWindowFocus for track catalogue
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.3, 5.1, 6.1, 7.3, 11.1_

- [ ] 9.3 Implement useTelemetryStream custom hook with SSE
  - Establish EventSource connection to telemetry stream endpoint
  - Parse JSON events and append to state (keep last 100 events)
  - Handle connection errors with exponential backoff
  - Clean up connection on unmount
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 12.3_

- [ ] 9.4 Write unit tests for API client and React Query hooks
  - Test API client functions with mock responses
  - Test React Query hooks with MSW
  - Test error handling and retry logic
  - Test SSE connection and reconnection
  - _Requirements: 11.1, 12.1, 12.2, 12.3_

- [ ] 10. Frontend track catalogue components
- [-] 10.1 Update TrackList component to use useTracksQuery hook
  - Replace MOCK_TRACKS with useTracksQuery
  - Implement search input with 150ms debounce
  - Implement status filter dropdown
  - Implement preset filter dropdown
  - Add loading and error states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.5_

- [ ] 10.2 Implement virtual scrolling for TrackList with react-window
  - Wrap track list in FixedSizeList component
  - Set row height to 80px
  - Set overscan to 5 rows
  - Implement infinite scroll with pagination
  - _Requirements: 1.5, 11.2, 11.3_

- [ ] 10.3 Update TrackListItem component with real data
  - Display title, artist, duration, BPM, F-measure, status
  - Add status badge with color coding
  - Implement selection highlighting
  - _Requirements: 1.1_

- [ ] 10.4 Write component tests for track catalogue
  - Test TrackList rendering with mock data
  - Test search and filter functionality
  - Test virtual scrolling with 100+ items
  - Test loading and error states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_


- [ ] 11. Frontend track detail and visualization components
- [ ] 11.1 Update TrackDetail component to use useTrackDetail hook
  - Replace mock data with useTrackDetail
  - Display metadata (title, artist, duration, BPM, F-measure)
  - Implement version selector dropdown
  - Display status badges (bundle ready, runtime, firmware)
  - Add loading and error states
  - _Requirements: 2.1, 10.1, 10.2, 10.3_

- [ ] 11.2 Update BeatGridChart to use real Genesis Map data
  - Parse genesis_map.layers.beat from useArtefactManifest
  - Parse beat_override.beats from useBeatOverride
  - Render beat markers on timeline
  - Implement click to add/move/delete beats
  - Add save button to persist overrides
  - _Requirements: 2.2, 7.1, 7.2, 7.3_

- [ ] 11.3 Update FrequencyChart to use real Genesis Map data
  - Parse genesis_map.layers.frequency from useArtefactManifest
  - Render stacked area chart with frequency bands
  - Add frequency band labels and time axis
  - _Requirements: 2.3_

- [ ] 11.4 Update DynamicsChart to use real Genesis Map data
  - Parse genesis_map.layers.dynamics from useArtefactManifest
  - Render line chart with amplitude envelope
  - Add dynamic range indicator
  - _Requirements: 2.4_

- [ ] 11.5 Update SectionsTimeline to use real Genesis Map data
  - Parse genesis_map.sections from useArtefactManifest
  - Render horizontal timeline with color-coded sections
  - Add section labels (intro, verse, chorus, bridge, outro)
  - _Requirements: 2.5_

- [ ] 11.6 Handle missing artifacts with placeholder states
  - Display "Artifact not available" message for missing artifacts
  - Add "Regenerate" button to trigger re-analysis
  - Show loading spinner during artifact fetching
  - _Requirements: 2.6, 12.2_

- [ ] 11.7 Write component tests for track detail and charts
  - Test TrackDetail rendering with mock data
  - Test version selector functionality
  - Test chart rendering with mock Genesis Map data
  - Test beat override editing and saving
  - Test missing artifact placeholders
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 12. Frontend upload and analysis workflow
- [ ] 12.1 Update UploadModal to use uploadTrack API
  - Replace mock submission with uploadTrack API call
  - Implement file validation (size, format)
  - Implement metadata validation (required fields)
  - Display progress indicator during upload
  - Show success notification on completion
  - Show error notification on failure with retry button
  - _Requirements: 3.1, 3.2, 12.5_

- [ ] 12.2 Update Toolbar to display queue status
  - Use useAnalysisJobs hook to fetch queue data
  - Display badge with active/total workers and queue length
  - Implement popover with job details on badge click
  - Poll every 5 seconds to update queue status
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12.3 Implement auto-selection of newly uploaded track
  - Listen for job completion events
  - Update selectedTrackId state to new track ID
  - Display success toast notification
  - _Requirements: 3.4_

- [ ] 12.4 Write component tests for upload workflow
  - Test UploadModal form validation
  - Test file upload with progress indicator
  - Test success and error notifications
  - Test queue badge updates
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [ ] 13. Frontend deployment orchestration
- [ ] 13.1 Update DeploySideSheet to use useBundleInfo hook
  - Replace mock data with useBundleInfo
  - Display bundle metadata (version, firmware requirement, runtime estimate)
  - Display device list with compatibility badges (ok, upgrade_required, incompatible)
  - Enable/disable deploy button based on compatibility
  - _Requirements: 5.1, 5.2_

- [ ] 13.2 Implement deployment initiation and status polling
  - Call createDeployment API on user confirmation
  - Use useDeploymentStatus hook to poll status every 3 seconds
  - Update progress indicators in side sheet
  - Log deployment results to ActivityLog
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 13.3 Write component tests for deployment workflow
  - Test DeploySideSheet rendering with mock bundle info
  - Test device selection and compatibility badges
  - Test deployment initiation and status polling
  - Test activity log updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14. Frontend telemetry and activity log
- [ ] 14.1 Update ActivityLog to use useTelemetryStream hook
  - Replace mock events with useTelemetryStream
  - Display real-time telemetry (drift, CPU, temperature)
  - Display auto-rollback events with device ID and reason
  - Implement auto-scroll to latest event
  - Add severity icons (info, warning, error)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 14.2 Implement connection status indicator
  - Display grey info entry on SSE connection drop
  - Show reconnection attempts with backoff timing
  - Display success message on reconnection
  - _Requirements: 4.5, 12.3_

- [ ] 14.3 Write component tests for activity log
  - Test ActivityLog rendering with mock telemetry events
  - Test auto-scroll functionality
  - Test connection status indicator
  - Test auto-rollback event display
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 15. Frontend artifact management
- [ ] 15.1 Update ArtifactTable to use real artifact data
  - Replace mock artifacts with data from useArtefactManifest
  - Display name, type, size, age, SHA, status columns
  - Implement "Copy Link" button with copyArtifactLink API
  - Implement "Delete" button with deleteArtifact API and undo snackbar
  - Implement "Restore" button with restoreArtifact API
  - Add optimistic updates for delete/restore
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 15.2 Implement storage usage progress bar
  - Use useStorageUsage hook to fetch storage metrics
  - Display progress bar with total/used bytes
  - Show percentage and absolute values
  - _Requirements: 6.5_

- [ ] 15.3 Write component tests for artifact management
  - Test ArtifactTable rendering with mock artifacts
  - Test copy link functionality
  - Test delete with undo snackbar
  - Test restore functionality
  - Test storage usage progress bar
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [ ] 16. Frontend graph preset recommendations
- [ ] 16.1 Update GraphPresetCard to use real diff and simulation data
  - Parse graph.impact.json from useArtefactManifest for diff
  - Parse graph.executor.scale.json from useArtefactManifest for simulation results
  - Display recommended template version and confidence score
  - Render two-column diff (added/removed/changed nodes and parameters)
  - Display before/after runtime and CPU utilization
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 16.2 Implement "Simulate" button functionality
  - Call simulate API endpoint on button click
  - Show loading spinner during simulation
  - Update card with new simulation results
  - _Requirements: 8.4_

- [ ] 16.3 Implement "Apply" button functionality
  - Deploy recommended configuration to device
  - Show confirmation dialog before applying
  - Log application to ActivityLog
  - _Requirements: 8.5_

- [ ] 16.4 Write component tests for graph preset recommendations
  - Test GraphPresetCard rendering with mock diff and simulation data
  - Test simulate button functionality
  - Test apply button functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 17. Frontend version history management
- [ ] 17.1 Implement version selector dropdown in TrackDetail
  - Display all versions with creation timestamps
  - Update charts and metadata on version change
  - Fetch artifacts for selected version
  - _Requirements: 10.1, 10.2_

- [ ] 17.2 Implement version comparison view
  - Add "Compare" button to version selector
  - Display side-by-side diff of two versions
  - Highlight changed artifacts and metadata
  - _Requirements: 10.4_

- [ ] 17.3 Implement "Set as Current" button
  - Promote historical version to active version
  - Update track metadata
  - Show confirmation dialog before promoting
  - _Requirements: 10.5_

- [ ] 17.4 Write component tests for version history
  - Test version selector functionality
  - Test version comparison view
  - Test "Set as Current" button
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 18. Frontend performance optimization
- [ ] 18.1 Implement React.memo for chart components
  - Wrap BeatGridChart, FrequencyChart, DynamicsChart, SectionsTimeline in React.memo
  - Add custom comparison function to prevent unnecessary re-renders
  - Measure re-render count with React DevTools Profiler
  - _Requirements: 11.2_

- [ ] 18.2 Implement useMemo for expensive computations
  - Memoize chart data transformations
  - Memoize filtered track lists
  - Memoize artifact manifest parsing
  - _Requirements: 11.2_

- [ ] 18.3 Implement code-splitting for analysis view
  - Lazy-load AnalysisView component
  - Lazy-load Recharts library
  - Lazy-load Speedscope viewer
  - Measure bundle size reduction
  - _Requirements: 11.4_

- [ ] 18.4 Write performance tests
  - Test track list rendering with 1000+ items (maintain 60 FPS)
  - Test chart re-rendering on data updates (<16ms)
  - Test React Query cache hit rate (>80%)
  - Test bundle size (<500KB gzipped)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_


- [ ] 19. Frontend error handling and resilience
- [ ] 19.1 Implement toast notifications for API errors
  - Display toast on network errors with retry button
  - Display toast on validation errors with error details
  - Display toast on success (upload, deployment, etc.)
  - Use Sonner library for toast notifications
  - _Requirements: 12.1_

- [ ] 19.2 Implement error boundaries for component failures
  - Wrap AnalysisView in error boundary
  - Display fallback UI on component errors
  - Log errors to console for debugging
  - _Requirements: 12.1_

- [ ] 19.3 Implement inline validation for forms
  - Validate file size and format in UploadModal
  - Validate required fields (title, artist)
  - Display inline error messages below form fields
  - Highlight invalid fields with red border
  - _Requirements: 12.5_

- [ ] 19.4 Implement retry logic for failed API requests
  - Use React Query retry configuration (3 attempts)
  - Implement exponential backoff (1s, 2s, 4s)
  - Display retry count in error messages
  - _Requirements: 12.1_

- [ ] 19.5 Write tests for error handling
  - Test toast notifications with mock API errors
  - Test error boundary fallback UI
  - Test inline form validation
  - Test retry logic with failing API
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20. End-to-end integration and cleanup
- [ ] 20.1 Remove mock data files
  - Delete webapp/src/components/analysis/mock-data.ts
  - Remove all references to MOCK_TRACKS, MOCK_METRICS, MOCK_ACTIVITY, MOCK_ARTIFACTS
  - Verify no remaining mock data in codebase
  - _Requirements: All_

- [ ] 20.2 Update AnalysisView to use all real data hooks
  - Replace all mock data with React Query hooks
  - Verify all components receive real data
  - Test complete user flow from upload to deployment
  - _Requirements: All_

- [ ] 20.3 Write E2E tests for complete workflow
  - Test upload → analysis → visualization → deployment flow
  - Test search and filter functionality
  - Test beat override editing and saving
  - Test artifact management (copy link, delete, restore)
  - Test version history management
  - Test error scenarios (network failure, invalid file, etc.)
  - _Requirements: All_

- [ ] 20.4 Performance validation and optimization
  - Run Lighthouse audit (target: >90 performance score)
  - Measure FPS during track list scrolling (target: 60 FPS)
  - Measure chart re-render time (target: <16ms)
  - Measure bundle size (target: <500KB gzipped)
  - Optimize if targets not met
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 20.5 Documentation and handoff
  - Update webapp/README.md with Song Analysis Module documentation
  - Document API endpoints in docs/api/
  - Create runbook for deployment in Implementation.plans/runbooks/
  - Update CLAUDE.md with Song Analysis Module routing rules
  - _Requirements: All_

## Implementation Notes

**Execution Order:**
1. Backend foundation (tasks 1-8): Establish database, APIs, and analysis pipeline
2. Frontend integration (tasks 9-17): Connect UI to backend services
3. Optimization (task 18): Improve performance and bundle size
4. Error handling (task 19): Add resilience and user feedback
5. Integration (task 20): Remove mocks, E2E testing, documentation

**Testing Strategy:**
- Unit tests for API client and React Query hooks (task 9.4)
- Component tests for UI components (tasks 10.4, 11.7, 12.4, 13.3, 14.3, 15.3, 16.4, 17.4)
- Integration tests for backend endpoints (tasks 2.4, 3.5, 4.6, 5.3, 6.4, 7.3, 8.4)
- Performance tests for frontend optimization (task 18.4)
- E2E tests for complete workflow (task 20.3)

**All tasks are required for comprehensive implementation from the start.**

**Dependencies:**
- Task 2 depends on task 1 (database schema)
- Task 3 depends on task 1 (storage service)
- Task 4 depends on task 1 (storage service)
- Task 9 depends on tasks 2-8 (backend APIs)
- Tasks 10-17 depend on task 9 (API client and hooks)
- Task 18 depends on tasks 10-17 (components to optimize)
- Task 19 depends on tasks 10-17 (components to add error handling)
- Task 20 depends on all previous tasks (integration and cleanup)

**Performance Budgets:**
- API response time: <200ms for GET requests
- Track list rendering: 60 FPS with 1000+ items
- Chart re-rendering: <16ms per update
- Bundle size: <500KB gzipped
- React Query cache hit rate: >80%

**Security Considerations:**
- JWT authentication for all API requests
- File size validation (<100MB)
- File format validation (magic number check)
- SQL injection prevention (parameterized queries)
- XSS prevention (metadata sanitization)
- HTTPS for all communication
- S3 signed URLs with 1-hour expiry
