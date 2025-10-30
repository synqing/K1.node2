# Song Analysis Module Backend & Frontend Integration - Execution Plan

**Author**: Claude Agent
**Date**: 2025-10-31
**Status**: Published
**Intent**: Transform mock-based Song Analysis UI into production-ready system with full backend integration

---

## Executive Summary

This document provides a comprehensive execution plan for implementing the Song Analysis Module backend and frontend integration as specified in `Implementation.plans/Song Analysis Module/backend_frontend_spec.md`. The plan addresses all 10 sections of the specification and provides a clear path from the current mock-based UI to a fully functional production system.

---

## Current State Assessment

### Existing Assets
- **Frontend Components**: Complete UI implementation in `webapp/src/components/analysis/`
  - TrackListItem, BeatGridChart, FrequencyChart, DynamicsChart
  - Toolbar, UploadModal, DeploySideSheet, ActivityLog
  - ArtifactTable, MetricsCard, GraphPresetCard
- **Mock Data**: Structured mock data matching planned API schemas
- **Technology Stack**: React 18.3, TypeScript 5.6, Vite, Radix UI components
- **Basic API Client**: Firmware endpoint client in `webapp/src/lib/api.ts`

### Critical Gaps Analysis

| Component | Required | Current State | Impact |
|-----------|----------|---------------|--------|
| Backend Server | Express/Fastify API | None | CRITICAL |
| Database | PostgreSQL + Prisma | None | CRITICAL |
| React Query | Data fetching/caching | Not installed | HIGH |
| Worker Queue | Bull/Redis | None | HIGH |
| Real-time Stream | SSE/WebSocket | None | MEDIUM |
| Storage Service | S3/MinIO | None | HIGH |

---

## Architecture Design

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │   React Query + SSE Client + WebSocket Client    │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (Express)                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │  Tracks  │  │ Analysis │  │   Deployments      │    │
│  │   API    │  │   API    │  │      API           │    │
│  └──────────┘  └──────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │  Redis Queue │   │  S3 Storage  │
│   Database   │   │    (Bull)    │   │   (MinIO)    │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Technology Stack

**Backend:**
- Runtime: Node.js 20 LTS
- Framework: Express 4.x with TypeScript
- Database: PostgreSQL 15 + Prisma ORM
- Queue: Bull with Redis
- Storage: MinIO (S3-compatible) for development, AWS S3 for production
- Real-time: Server-Sent Events (SSE)

**Frontend:**
- Framework: React 18.3 with TypeScript
- Data Fetching: @tanstack/react-query v5
- Virtualization: react-window
- Real-time: EventSource API for SSE

---

## Implementation Phases

### Phase 1: Backend Infrastructure (Week 1)

#### 1.1 Project Setup (Day 1)

**Directory Structure:**
```bash
webapp-backend/
├── src/
│   ├── api/
│   │   ├── tracks/
│   │   │   ├── tracks.controller.ts
│   │   │   ├── tracks.service.ts
│   │   │   └── tracks.validation.ts
│   │   ├── analysis/
│   │   │   ├── analysis.controller.ts
│   │   │   ├── jobs.controller.ts
│   │   │   └── analysis.service.ts
│   │   ├── artifacts/
│   │   │   ├── artifacts.controller.ts
│   │   │   └── artifacts.service.ts
│   │   └── deployments/
│   │       ├── deployments.controller.ts
│   │       └── deployments.service.ts
│   ├── services/
│   │   ├── storage.service.ts
│   │   ├── queue.service.ts
│   │   └── telemetry.service.ts
│   ├── models/
│   │   ├── track.model.ts
│   │   ├── job.model.ts
│   │   └── deployment.model.ts
│   ├── workers/
│   │   ├── analysis.worker.ts
│   │   └── deployment.worker.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
└── .env.example
```

**Setup Commands:**
```bash
# Create backend project
mkdir webapp-backend && cd webapp-backend
npm init -y

# Install core dependencies
npm install express cors helmet compression dotenv
npm install @prisma/client prisma bull ioredis
npm install multer @aws-sdk/client-s3
npm install zod express-rate-limit

# Install dev dependencies
npm install -D typescript @types/node @types/express
npm install -D tsx nodemon vitest @vitest/ui
npm install -D @types/multer @types/compression

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

#### 1.2 Database Schema (Day 1-2)

**Prisma Schema (`prisma/schema.prisma`):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum TrackStatus {
  processing
  ready
  warning
  failed
}

enum JobStatus {
  queued
  processing
  completed
  failed
}

model Track {
  id            String        @id @default(cuid())
  title         String
  artist        String?
  duration_ms   Int?
  bpm           Int?
  f_measure     Float?
  status        TrackStatus   @default(processing)
  preset        String?
  tags          Json?
  created_at    DateTime      @default(now())
  updated_at    DateTime      @updatedAt

  versions      TrackVersion[]
  jobs          AnalysisJob[]
  deployments   Deployment[]

  @@index([status])
  @@index([created_at])
}

model TrackVersion {
  id                    Int       @id @default(autoincrement())
  track_id              String
  version               Int
  artifact_manifest     Json
  runtime_estimate_ms   Float?
  firmware_min_version  String?
  created_at            DateTime  @default(now())

  track                 Track     @relation(fields: [track_id], references: [id])

  @@unique([track_id, version])
  @@index([track_id])
}

model AnalysisJob {
  id                    String    @id @default(cuid())
  track_id              String
  status                JobStatus @default(queued)
  queue_position        Int?
  estimated_seconds     Int?
  log_entries           Json?
  error_message         String?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  completed_at          DateTime?

  track                 Track     @relation(fields: [track_id], references: [id])

  @@index([status])
  @@index([created_at])
}

model Deployment {
  id            String    @id @default(cuid())
  track_id      String
  version       Int
  device_ids    String[]
  status        String
  logs          Json?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  track         Track     @relation(fields: [track_id], references: [id])

  @@index([status])
  @@index([created_at])
}

model BeatOverride {
  id            String    @id @default(cuid())
  track_id      String
  version       Int
  beats         Float[]
  edited_by     String
  note          String?
  created_at    DateTime  @default(now())

  @@unique([track_id, version])
}
```

**Migration Commands:**
```bash
# Create migration
npx prisma migrate dev --name initial_schema

# Generate Prisma Client
npx prisma generate
```

#### 1.3 Core Services (Day 2-3)

**Storage Service (`src/services/storage.service.ts`):**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucket = process.env.S3_BUCKET || 'k1-analysis';
  }

  async uploadArtifact(key: string, buffer: Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    return await this.s3Client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getArtifactPath(trackId: string, version: number, filename: string) {
    return `analysis/${trackId}/v${version}/${filename}`;
  }
}
```

**Queue Service (`src/services/queue.service.ts`):**
```typescript
import Queue from 'bull';
import Redis from 'ioredis';

export class QueueService {
  private analysisQueue: Queue.Queue;
  private deploymentQueue: Queue.Queue;

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    this.analysisQueue = new Queue('analysis', { redis: redisConfig });
    this.deploymentQueue = new Queue('deployment', { redis: redisConfig });
  }

  async addAnalysisJob(trackId: string, data: any) {
    return await this.analysisQueue.add('analyze', { trackId, ...data });
  }

  async addDeploymentJob(deploymentId: string, data: any) {
    return await this.deploymentQueue.add('deploy', { deploymentId, ...data });
  }

  async getQueueStatus() {
    const [analysisWaiting, analysisActive, deploymentWaiting, deploymentActive] =
      await Promise.all([
        this.analysisQueue.getWaitingCount(),
        this.analysisQueue.getActiveCount(),
        this.deploymentQueue.getWaitingCount(),
        this.deploymentQueue.getActiveCount(),
      ]);

    return {
      analysis: { waiting: analysisWaiting, active: analysisActive },
      deployment: { waiting: deploymentWaiting, active: deploymentActive },
    };
  }
}
```

### Phase 2: API Implementation (Week 1-2)

#### 2.1 Track Catalogue APIs (Day 3-4)

**Tracks Controller (`src/api/tracks/tracks.controller.ts`):**
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { TracksService } from './tracks.service';

const querySchema = z.object({
  status: z.enum(['processing', 'ready', 'warning', 'failed']).optional(),
  preset: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
});

export class TracksController {
  constructor(private tracksService: TracksService) {}

  async getTracks(req: Request, res: Response) {
    const params = querySchema.parse(req.query);
    const result = await this.tracksService.getTracks(params);
    res.json(result);
  }

  async getTrackById(req: Request, res: Response) {
    const { trackId } = req.params;
    const track = await this.tracksService.getTrackById(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json(track);
  }

  async getTrackVersion(req: Request, res: Response) {
    const { trackId, version } = req.params;
    const versionData = await this.tracksService.getTrackVersion(
      trackId,
      parseInt(version)
    );
    if (!versionData) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json(versionData);
  }
}
```

#### 2.2 Upload & Analysis Workflow (Day 4-5)

**Upload Controller (`src/api/analysis/upload.controller.ts`):**
```typescript
import { Request, Response } from 'express';
import multer from 'multer';
import { AnalysisService } from './analysis.service';

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac'];
    cb(null, allowedMimes.includes(file.mimetype));
  }
});

export class UploadController {
  constructor(private analysisService: AnalysisService) {}

  uploadMiddleware = upload.single('file');

  async uploadTrack(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, artist, tags, preset } = req.body;

    const result = await this.analysisService.processUpload({
      file: req.file,
      title,
      artist,
      tags: tags ? JSON.parse(tags) : undefined,
      preset,
    });

    res.json(result);
  }

  async getJobStatus(req: Request, res: Response) {
    const { jobId } = req.params;
    const job = await this.analysisService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  }

  async getActiveJobs(req: Request, res: Response) {
    const jobs = await this.analysisService.getActiveJobs();
    res.json({ jobs });
  }
}
```

**Analysis Worker (`src/workers/analysis.worker.ts`):**
```typescript
import Queue from 'bull';
import { prisma } from '../db';
import { StorageService } from '../services/storage.service';
import { generateGenesisMap } from '../analysis/genesis';
import { detectBeats } from '../analysis/beats';
import { computeMetrics } from '../analysis/metrics';

export function setupAnalysisWorker(queue: Queue.Queue) {
  const storage = new StorageService();

  queue.process('analyze', async (job) => {
    const { trackId, audioPath } = job.data;

    try {
      // Update job status
      await job.progress(10);
      await prisma.analysisJob.update({
        where: { id: job.id.toString() },
        data: { status: 'processing' }
      });

      // Step 1: Beat detection
      await job.progress(30);
      job.log('Detecting beats...');
      const beats = await detectBeats(audioPath);

      // Step 2: Generate Genesis Map
      await job.progress(50);
      job.log('Generating Genesis map...');
      const genesisMap = await generateGenesisMap(audioPath, beats);

      // Step 3: Compute metrics
      await job.progress(70);
      job.log('Computing metrics...');
      const metrics = await computeMetrics(beats, genesisMap);

      // Step 4: Store artifacts
      await job.progress(90);
      job.log('Storing artifacts...');

      const version = await getNextVersion(trackId);
      const artifacts = [
        {
          type: 'genesis_map',
          path: await storage.uploadArtifact(
            storage.getArtifactPath(trackId, version, 'track.genesis.json'),
            Buffer.from(JSON.stringify(genesisMap)),
            'application/json'
          ),
        },
        {
          type: 'metrics',
          path: await storage.uploadArtifact(
            storage.getArtifactPath(trackId, version, 'phase2b_metrics.json'),
            Buffer.from(JSON.stringify(metrics)),
            'application/json'
          ),
        },
      ];

      // Update database
      await prisma.$transaction([
        prisma.trackVersion.create({
          data: {
            track_id: trackId,
            version,
            artifact_manifest: artifacts,
            runtime_estimate_ms: metrics.estimated_runtime,
          },
        }),
        prisma.track.update({
          where: { id: trackId },
          data: {
            status: 'ready',
            bpm: metrics.bpm,
            f_measure: metrics.f_measure,
          },
        }),
        prisma.analysisJob.update({
          where: { id: job.id.toString() },
          data: {
            status: 'completed',
            completed_at: new Date(),
          },
        }),
      ]);

      return { success: true, version };
    } catch (error) {
      await prisma.analysisJob.update({
        where: { id: job.id.toString() },
        data: {
          status: 'failed',
          error_message: error.message,
        },
      });
      throw error;
    }
  });
}
```

### Phase 3: Real-time Features (Week 2)

#### 3.1 SSE Telemetry Stream (Day 6)

**Telemetry Controller (`src/api/telemetry/sse.controller.ts`):**
```typescript
import { Request, Response } from 'express';
import { TelemetryService } from '../../services/telemetry.service';

export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  streamTelemetry(req: Request, res: Response) {
    const { trackId } = req.params;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    });

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Subscribe to telemetry updates
    const unsubscribe = this.telemetryService.subscribe(trackId, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
      res.end();
    });

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}
```

#### 3.2 Deployment Orchestrator (Day 7)

**Deployment Controller (`src/api/deployments/deployments.controller.ts`):**
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { DeploymentService } from './deployments.service';

const deployRequestSchema = z.object({
  track_id: z.string(),
  version: z.number(),
  device_ids: z.array(z.string()),
});

export class DeploymentController {
  constructor(private deploymentService: DeploymentService) {}

  async getBundle(req: Request, res: Response) {
    const { trackId, version } = req.params;
    const bundle = await this.deploymentService.getBundle(
      trackId,
      parseInt(version)
    );
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    res.json(bundle);
  }

  async createDeployment(req: Request, res: Response) {
    const data = deployRequestSchema.parse(req.body);
    const deployment = await this.deploymentService.createDeployment(data);
    res.json(deployment);
  }

  async getDeploymentStatus(req: Request, res: Response) {
    const { deploymentId } = req.params;
    const status = await this.deploymentService.getDeploymentStatus(deploymentId);
    if (!status) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json(status);
  }
}
```

### Phase 4: Frontend Integration (Week 2-3)

#### 4.1 React Query Setup (Day 8)

**Query Client Configuration (`webapp/src/lib/queryClient.ts`):**
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: true,
    },
  },
});
```

**App Provider Setup (`webapp/src/App.tsx`):**
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* existing app content */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### 4.2 API Hooks (Day 8-9)

**Tracks Query Hook (`webapp/src/hooks/useTracksQuery.ts`):**
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface TrackParams {
  status?: 'processing' | 'ready' | 'warning' | 'failed';
  preset?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useTracksQuery(params: TrackParams) {
  return useQuery({
    queryKey: ['tracks', params],
    queryFn: () => api.getTracks(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useInfiniteTracksQuery(params: Omit<TrackParams, 'offset'>) {
  return useInfiniteQuery({
    queryKey: ['tracks', 'infinite', params],
    queryFn: ({ pageParam = 0 }) =>
      api.getTracks({ ...params, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((sum, page) => sum + page.items.length, 0);
      return totalFetched < lastPage.total ? totalFetched : undefined;
    },
  });
}
```

**Track Detail Hook (`webapp/src/hooks/useTrackDetail.ts`):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useTrackDetail(trackId: string | undefined) {
  return useQuery({
    queryKey: ['track', trackId],
    queryFn: () => api.getTrackById(trackId!),
    enabled: !!trackId,
  });
}

export function useTrackVersion(trackId: string | undefined, version: number) {
  return useQuery({
    queryKey: ['track', trackId, 'version', version],
    queryFn: () => api.getTrackVersion(trackId!, version),
    enabled: !!trackId,
  });
}
```

**Artifact Manifest Hook (`webapp/src/hooks/useArtifactManifest.ts`):**
```typescript
import { useQuery, useQueries } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useArtifactManifest(trackId: string | undefined, version: number) {
  const manifestQuery = useQuery({
    queryKey: ['artifacts', trackId, version, 'manifest'],
    queryFn: () => api.getArtifactManifest(trackId!, version),
    enabled: !!trackId,
  });

  const artifactQueries = useQueries({
    queries: (manifestQuery.data?.artifacts || []).map((artifact) => ({
      queryKey: ['artifacts', trackId, version, artifact.type],
      queryFn: () => api.fetchArtifact(artifact.url),
      enabled: !!manifestQuery.data,
    })),
  });

  return {
    manifest: manifestQuery.data,
    artifacts: artifactQueries.reduce((acc, query, index) => {
      if (query.data && manifestQuery.data) {
        const artifact = manifestQuery.data.artifacts[index];
        acc[artifact.type] = query.data;
      }
      return acc;
    }, {} as Record<string, any>),
    isLoading: manifestQuery.isLoading || artifactQueries.some((q) => q.isLoading),
    error: manifestQuery.error || artifactQueries.find((q) => q.error)?.error,
  };
}
```

**SSE Telemetry Hook (`webapp/src/hooks/useTelemetryStream.ts`):**
```typescript
import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '../lib/api-client';

interface TelemetryData {
  timestamp: string;
  drift_ms?: number;
  cpu_pct?: number;
  temp_c?: number;
  event?: string;
  error?: string;
}

export function useTelemetryStream(trackId: string | undefined) {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!trackId) return;

    const connect = () => {
      const eventSource = new EventSource(
        `${API_BASE_URL}/api/v1/tracks/${trackId}/telemetry/stream`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const telemetryData: TelemetryData = JSON.parse(event.data);
          setData((prev) => [...prev.slice(-99), telemetryData]); // Keep last 100
        } catch (error) {
          console.error('Failed to parse telemetry:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Reconnect with exponential backoff
        setTimeout(connect, 5000);
      };

      eventSourceRef.current = eventSource;
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [trackId]);

  return { data, isConnected };
}
```

#### 4.3 Update Components (Day 9-10)

**Updated AnalysisView (`webapp/src/components/views/AnalysisView.tsx`):**
```typescript
import { useMemo, useState } from 'react';
import { useTracksQuery } from '../../hooks/useTracksQuery';
import { useTrackDetail } from '../../hooks/useTrackDetail';
import { useArtifactManifest } from '../../hooks/useArtifactManifest';
import { useTelemetryStream } from '../../hooks/useTelemetryStream';
import { useAnalysisJobs } from '../../hooks/useAnalysisJobs';
// ... other imports

export function AnalysisView({ connectionState }: AnalysisViewProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>();
  const [selectedVersion, setSelectedVersion] = useState<number>(1);

  // Fetch tracks list
  const { data: tracksData, isLoading: tracksLoading } = useTracksQuery({
    limit: 50,
  });

  // Fetch selected track details
  const { data: trackDetail } = useTrackDetail(selectedTrackId);

  // Fetch artifacts for selected track version
  const { artifacts, manifest } = useArtifactManifest(selectedTrackId, selectedVersion);

  // Subscribe to telemetry stream
  const { data: telemetryData, isConnected } = useTelemetryStream(selectedTrackId);

  // Poll analysis jobs
  const { data: jobsData } = useAnalysisJobs();

  // Auto-select first track
  useEffect(() => {
    if (tracksData?.items.length && !selectedTrackId) {
      setSelectedTrackId(tracksData.items[0].id);
    }
  }, [tracksData, selectedTrackId]);

  // Extract metrics from artifacts
  const metrics = useMemo(() => {
    if (!artifacts?.metrics) return [];
    return formatMetrics(artifacts.metrics);
  }, [artifacts]);

  if (tracksLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        onUploadClick={() => setUploadOpen(true)}
        queueLength={jobsData?.jobs.length || 0}
        isConnected={isConnected}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r">
          <TrackList
            tracks={tracksData?.items || []}
            selectedId={selectedTrackId}
            onSelect={setSelectedTrackId}
          />
        </aside>

        <main className="flex-1 overflow-y-auto">
          {trackDetail && (
            <>
              <TrackOverview
                track={trackDetail.track}
                versions={trackDetail.versions}
                selectedVersion={selectedVersion}
                onVersionChange={setSelectedVersion}
              />

              <MetricsGrid metrics={metrics} />

              {artifacts?.genesis_map && (
                <>
                  <BeatGridChart data={artifacts.genesis_map.beats} />
                  <FrequencyChart data={artifacts.genesis_map.layers.frequency} />
                  <DynamicsChart data={artifacts.genesis_map.layers.dynamics} />
                  <SectionsTimeline data={artifacts.genesis_map.sections} />
                </>
              )}

              <GraphPresetCard
                diff={artifacts?.graph_impact}
                simulation={artifacts?.graph_executor_scale}
              />

              <ArtifactTable
                artifacts={manifest?.artifacts || []}
                onAction={handleArtifactAction}
              />

              <ActivityLog
                entries={formatTelemetryToActivity(telemetryData)}
              />
            </>
          )}
        </main>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <DeploySideSheet
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        track={trackDetail}
        version={selectedVersion}
      />
    </div>
  );
}
```

### Phase 5: Advanced Features (Week 3)

#### 5.1 Graph Preset Diff (Day 11)
- Implement diff computation in analysis worker
- Store diff results in `graph.impact.json`
- Update GraphPresetCard to visualize changes

#### 5.2 Manual Beat Override (Day 12)
- Create beat override endpoints
- Add beat editor UI controls
- Store overrides in database
- Merge overrides in runtime pipeline

#### 5.3 Artifact Management (Day 13)
- Implement soft-delete with undo
- Add copy-link functionality
- Create storage usage metrics endpoint
- Add cleanup routines

---

## Testing Strategy

### Unit Testing
```typescript
// Example test: tracks.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TracksService } from './tracks.service';

describe('TracksService', () => {
  it('should return paginated tracks', async () => {
    const service = new TracksService();
    const result = await service.getTracks({ limit: 10, offset: 0 });

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('items');
    expect(result.items).toHaveLength(10);
  });

  it('should filter by status', async () => {
    const service = new TracksService();
    const result = await service.getTracks({ status: 'ready' });

    expect(result.items.every(t => t.status === 'ready')).toBe(true);
  });
});
```

### Integration Testing
```typescript
// Example test: upload.integration.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Upload API', () => {
  it('should upload and process audio file', async () => {
    const response = await request(app)
      .post('/api/v1/tracks/upload')
      .attach('file', 'test/fixtures/sample.mp3')
      .field('title', 'Test Track')
      .field('artist', 'Test Artist')
      .expect(200);

    expect(response.body).toHaveProperty('track_id');
    expect(response.body).toHaveProperty('job_id');
    expect(response.body.status).toBe('queued');
  });
});
```

### Performance Testing
```javascript
// k6 load test script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let response = http.get('http://localhost:3000/api/v1/tracks');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## Validation Criteria

### Functional Requirements
- [ ] All 10 specification sections implemented
- [ ] Mock data completely removed
- [ ] Real-time updates functional
- [ ] File upload and processing working
- [ ] Deployment flow operational

### Performance Requirements
- [ ] API response time < 200ms (p95)
- [ ] SSE latency < 100ms
- [ ] Frontend remains responsive with 1000+ tracks
- [ ] Analysis job processing < 30s per track
- [ ] Memory usage < 512MB under normal load

### Quality Requirements
- [ ] Test coverage > 80%
- [ ] No critical security vulnerabilities
- [ ] All endpoints documented in OpenAPI
- [ ] Error handling consistent across APIs
- [ ] Logging implemented for debugging

---

## Risk Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|---------|-------------------|
| Analysis worker crashes | Medium | High | Implement job retry with exponential backoff, add health checks |
| SSE connection drops | High | Medium | Auto-reconnect with backoff, fallback to polling |
| Database performance degrades | Low | High | Add indexes, implement caching, consider read replicas |
| S3 storage costs exceed budget | Medium | Medium | Implement lifecycle policies, compression, usage alerts |
| Frontend bundle size too large | Low | Low | Code splitting, lazy loading, tree shaking |

### Monitoring & Alerting
- Implement Prometheus metrics for API endpoints
- Add Grafana dashboards for visualization
- Set up alerts for queue backlog > 100 jobs
- Monitor SSE connection pool
- Track S3 storage usage daily

---

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations tested and reversible
- [ ] Redis cluster configured
- [ ] S3/MinIO bucket created with proper permissions
- [ ] SSL certificates installed
- [ ] CORS configuration validated
- [ ] Rate limiting configured
- [ ] Security headers implemented

### Deployment
- [ ] Blue-green deployment setup
- [ ] Database backup taken
- [ ] Feature flags configured
- [ ] Load balancer health checks passing
- [ ] Monitoring dashboards active

### Post-deployment
- [ ] Smoke tests passing
- [ ] Performance metrics within targets
- [ ] Error rates normal
- [ ] User acceptance testing complete
- [ ] Documentation updated

---

## Timeline Summary

**Week 1:** Backend infrastructure, database, core APIs
**Week 2:** Real-time features, frontend integration begins
**Week 3:** Complete integration, advanced features, testing

**Total Duration:** 3 weeks
**Team Size:** 3 developers + DevOps support
**Deliverable:** Production-ready Song Analysis Module

---

## Success Metrics

- **User Experience**: Analysis workflow time reduced from 10 minutes to < 2 minutes
- **Performance**: 99.9% uptime, < 200ms API latency
- **Scalability**: Support 1000+ concurrent users
- **Quality**: Zero critical bugs in production
- **Adoption**: 90% of users actively using new features within 1 month

---

## Appendix: Additional Resources

- [API Documentation](./api-documentation.md)
- [Database Schema Diagram](./database-schema.png)
- [Architecture Diagram](./architecture.png)
- [Deployment Guide](./deployment-guide.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

*This execution plan provides a complete roadmap for transforming the Song Analysis Module from mock-based UI to production-ready system. Follow the phases sequentially, validate at each milestone, and maintain quality standards throughout implementation.*