# Requirements Document

## Introduction

The Song Analysis Module transforms the K1.reinvented control dashboard from a pattern-control interface into a comprehensive music analysis and deployment platform. This feature enables users to upload audio tracks, analyze them using advanced beat detection and spectral analysis algorithms, visualize the results through interactive charts, and deploy optimized Genesis Maps to connected devices. The module replaces the current mock-based UI with a fully functional backend-integrated system that provides real-time telemetry, artifact management, and deployment orchestration.

## Glossary

- **Song Analysis Module**: The complete system comprising backend APIs, frontend UI, and data pipelines for music analysis and visualization
- **Control Dashboard**: The React-based web application that provides the user interface for K1 device control
- **Genesis Map**: A compiled JSON representation of audio-reactive patterns optimized for ESP32-S3 execution
- **Track**: An audio file that has been uploaded and analyzed by the system
- **Artifact**: A generated file resulting from track analysis (e.g., genesis_map, metrics, validation reports)
- **Analysis Job**: An asynchronous background task that processes an uploaded track
- **Deployment**: The process of transferring a Genesis Map bundle to one or more K1 devices
- **Telemetry Stream**: Real-time performance data from devices executing deployed patterns
- **Beat Override**: Manual corrections to automatically detected beat positions
- **F-measure**: A metric quantifying beat detection accuracy (0.0 to 1.0)
- **Preset**: A predefined analysis configuration optimized for specific music genres (e.g., EDM, rock)
- **Bundle**: A packaged Genesis Map with metadata, compatibility information, and runtime estimates
- **Worker**: A background process that executes analysis jobs from the queue
- **SSE**: Server-Sent Events, a protocol for server-to-client real-time data streaming

## Requirements

### Requirement 1: Track Catalogue Management

**User Story:** As a music producer, I want to view and search my analyzed tracks, so that I can quickly find and deploy patterns for specific songs.

#### Acceptance Criteria

1. WHEN the user navigates to the Song Analysis view, THE Control Dashboard SHALL display a paginated list of all analyzed tracks with title, artist, duration, BPM, F-measure, status, and last updated timestamp
2. WHEN the user enters text in the search field, THE Control Dashboard SHALL filter tracks by title, artist, or tags with a 150ms debounce
3. WHEN the user selects a status filter (processing, ready, warning, failed), THE Control Dashboard SHALL display only tracks matching that status
4. WHEN the user selects a preset filter (EDM, rock, etc.), THE Control Dashboard SHALL display only tracks analyzed with that preset
5. WHERE the track list contains more than 50 items, THE Control Dashboard SHALL implement virtual scrolling to maintain 60 FPS rendering performance

### Requirement 2: Track Detail Visualization

**User Story:** As a lighting designer, I want to view detailed analysis results for a track, so that I can understand the beat structure, frequency content, and dynamics before deployment.

#### Acceptance Criteria

1. WHEN the user selects a track from the catalogue, THE Control Dashboard SHALL display the track metadata including title, artist, duration, BPM, F-measure, status badges, and firmware compatibility
2. THE Control Dashboard SHALL render a beat grid chart showing detected beat positions with manual override capability
3. THE Control Dashboard SHALL render a frequency spectrum chart displaying energy distribution across frequency bands over time
4. THE Control Dashboard SHALL render a dynamics chart showing amplitude envelope and dynamic range
5. THE Control Dashboard SHALL render a sections timeline identifying intro, verse, chorus, bridge, and outro segments
6. WHEN analysis artifacts are missing or corrupted, THE Control Dashboard SHALL display placeholder states with error messages

### Requirement 3: Track Upload and Analysis

**User Story:** As a DJ, I want to upload audio files and have them automatically analyzed, so that I can create custom light shows for my sets.

#### Acceptance Criteria

1. WHEN the user clicks the upload button, THE Control Dashboard SHALL display a modal with file selection, metadata input fields (title, artist, tags), and preset selection
2. WHEN the user submits an audio file, THE Control Dashboard SHALL upload the file to the backend and receive a track ID and job ID
3. THE Control Dashboard SHALL poll the analysis job status endpoint every 5 seconds to update progress indicators
4. WHEN an analysis job completes successfully, THE Control Dashboard SHALL display a success notification and automatically select the new track
5. IF an analysis job fails, THEN THE Control Dashboard SHALL display an error notification with failure reason and retry option

### Requirement 4: Real-time Telemetry Monitoring

**User Story:** As a system administrator, I want to monitor device performance during pattern execution, so that I can detect and respond to runtime issues.

#### Acceptance Criteria

1. WHEN a track is deployed to a device, THE Control Dashboard SHALL establish an SSE connection to the telemetry stream endpoint
2. THE Control Dashboard SHALL display real-time drift (ms), CPU utilization (%), and temperature (°C) in the activity log
3. WHEN drift exceeds 100ms for 5 consecutive seconds, THE Control Dashboard SHALL display a warning notification
4. IF an auto-rollback event occurs, THEN THE Control Dashboard SHALL log the event with device ID and reason
5. WHEN the SSE connection drops, THE Control Dashboard SHALL display a grey info entry and attempt reconnection with exponential backoff

### Requirement 5: Deployment Orchestration

**User Story:** As a venue operator, I want to deploy analyzed tracks to multiple devices simultaneously, so that I can synchronize lighting across the space.

#### Acceptance Criteria

1. WHEN the user clicks the deploy button, THE Control Dashboard SHALL fetch bundle metadata including firmware compatibility, runtime estimate, and required nodes
2. THE Control Dashboard SHALL display a side sheet with device selection, compatibility badges (ok, upgrade_required), and estimated runtime
3. WHEN the user confirms deployment, THE Control Dashboard SHALL initiate deployment to selected devices and return a deployment ID
4. THE Control Dashboard SHALL poll the deployment status endpoint every 3 seconds to update progress indicators
5. WHEN deployment completes, THE Control Dashboard SHALL log success or failure for each device in the activity log

### Requirement 6: Artifact Management

**User Story:** As a data analyst, I want to download, restore, and delete analysis artifacts, so that I can manage storage and perform offline analysis.

#### Acceptance Criteria

1. WHEN the user views a track detail page, THE Control Dashboard SHALL display an artifact table with name, type, size, age, SHA checksum, and status
2. WHEN the user clicks "Copy Link" on an artifact, THE Control Dashboard SHALL request a signed URL and copy it to the clipboard
3. WHEN the user clicks "Delete" on an artifact, THE Control Dashboard SHALL soft-delete the artifact and display an undo snackbar for 30 seconds
4. WHEN the user clicks "Restore" on a soft-deleted artifact, THE Control Dashboard SHALL restore the artifact and update the table
5. THE Control Dashboard SHALL display a storage usage progress bar showing total bytes used and available

### Requirement 7: Manual Beat Override

**User Story:** As a music editor, I want to manually correct beat positions, so that I can fix detection errors in complex or irregular music.

#### Acceptance Criteria

1. WHEN the user clicks on the beat grid chart, THE Control Dashboard SHALL allow adding, moving, or deleting beat markers
2. WHEN the user saves beat overrides, THE Control Dashboard SHALL POST the edited beat array to the backend with user ID and note
3. THE Control Dashboard SHALL display a badge indicating manual override status with editor name and timestamp
4. WHEN beat overrides are saved, THE Control Dashboard SHALL trigger re-analysis to update dependent artifacts
5. THE Control Dashboard SHALL log the override action in the activity log

### Requirement 8: Graph Preset Recommendations

**User Story:** As a pattern designer, I want to see recommended graph configurations for a track, so that I can optimize pattern performance and visual quality.

#### Acceptance Criteria

1. WHEN analysis completes, THE Control Dashboard SHALL display a graph preset card showing recommended template version and confidence score
2. THE Control Dashboard SHALL render a two-column diff showing added nodes, removed nodes, and changed parameters
3. THE Control Dashboard SHALL display simulation results comparing before/after runtime (ms) and CPU utilization (%)
4. WHEN the user clicks "Simulate", THE Control Dashboard SHALL trigger executor simulation and update the card with results
5. THE Control Dashboard SHALL provide an "Apply" button to deploy the recommended configuration

### Requirement 9: Analysis Queue Monitoring

**User Story:** As a system operator, I want to monitor the analysis queue, so that I can understand system load and job throughput.

#### Acceptance Criteria

1. THE Control Dashboard SHALL display a toolbar badge showing active workers and queue length (e.g., "2/4 workers · 3 queued")
2. WHEN the user clicks the queue badge, THE Control Dashboard SHALL display a popover with job details (track title, status, queue position, ETA)
3. THE Control Dashboard SHALL poll the jobs endpoint every 5 seconds to update queue status
4. WHEN a job transitions from queued to processing, THE Control Dashboard SHALL update the badge count
5. WHEN all jobs complete, THE Control Dashboard SHALL hide the queue badge

### Requirement 10: Version History Management

**User Story:** As a version control user, I want to view and compare different analysis versions of a track, so that I can track improvements and revert changes.

#### Acceptance Criteria

1. WHEN the user views a track detail page, THE Control Dashboard SHALL display a version selector dropdown showing all available versions with creation timestamps
2. WHEN the user selects a different version, THE Control Dashboard SHALL fetch that version's artifacts and update all charts
3. THE Control Dashboard SHALL display version metadata including creation date, artifact count, runtime estimate, and minimum firmware version
4. THE Control Dashboard SHALL allow comparing two versions side-by-side with diff highlighting
5. THE Control Dashboard SHALL provide a "Set as Current" button to promote a historical version to the active version

### Requirement 11: Performance Optimization

**User Story:** As a frontend developer, I want the Song Analysis view to maintain 60 FPS, so that users experience smooth interactions even with large datasets.

#### Acceptance Criteria

1. THE Control Dashboard SHALL implement React Query caching with 5-minute TTL for track catalogue and detail data
2. THE Control Dashboard SHALL use React.memo and useMemo to prevent unnecessary re-renders of chart components
3. WHERE the track list exceeds 50 items, THE Control Dashboard SHALL implement virtual scrolling using react-window
4. THE Control Dashboard SHALL lazy-load chart data using Promise.allSettled to handle missing artifacts gracefully
5. THE Control Dashboard SHALL debounce search input by 150ms to reduce API calls

### Requirement 12: Error Handling and Resilience

**User Story:** As an end user, I want clear error messages and recovery options, so that I can resolve issues without developer assistance.

#### Acceptance Criteria

1. WHEN an API request fails with a network error, THE Control Dashboard SHALL display a toast notification with retry button
2. WHEN an artifact is missing, THE Control Dashboard SHALL display a placeholder chart with "Artifact not available" message
3. WHEN the SSE connection drops, THE Control Dashboard SHALL attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
4. WHEN a deployment fails, THE Control Dashboard SHALL log the failure reason and provide a "View Logs" button
5. THE Control Dashboard SHALL validate user input (file size, format, metadata) before submission and display inline validation errors
