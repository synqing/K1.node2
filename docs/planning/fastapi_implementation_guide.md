---
title: FastAPI Implementation Guide for Song Analysis Module
author: Claude (FastAPI Expert Agent)
date: 2025-10-31
status: published
intent: Provide step-by-step implementation guide for FastAPI backend
---

# FastAPI Implementation Guide for Song Analysis Module

## Purpose

This guide provides detailed implementation steps for building the Song Analysis Module backend with FastAPI, following the architecture defined in `GENESIS_REINTEGRATION_PRD.md` and the technical comparison in `docs/analysis/fastapi_vs_nestjs_song_analysis_comparison.md`.

---

## 1. Project Bootstrap

### 1.1 Directory Structure

```bash
# Create backend directory structure
mkdir -p backend/app/{api,models,services,workers,core,db}
mkdir -p backend/tests/{unit,integration,e2e}
mkdir -p backend/alembic/versions

# Create files
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/config.py
touch backend/pyproject.toml
touch backend/Dockerfile
```

### 1.2 Dependencies (`backend/pyproject.toml`)

```toml
[project]
name = "k1-song-analysis-backend"
version = "0.1.0"
description = "FastAPI backend for K1 Song Analysis Module"
requires-python = ">=3.11"
dependencies = [
    # Core FastAPI
    "fastapi==0.110.0",
    "uvicorn[standard]==0.28.0",
    "pydantic==2.6.3",
    "pydantic-settings==2.2.1",

    # Database
    "sqlalchemy[asyncio]==2.0.28",
    "asyncpg==0.29.0",
    "alembic==1.13.1",

    # Task queue
    "celery==5.3.6",
    "redis==5.0.2",

    # Auth
    "python-jose[cryptography]==3.3.0",
    "passlib[bcrypt]==1.7.4",
    "python-multipart==0.0.9",

    # HTTP client
    "httpx==0.27.0",

    # Audio processing (from existing beat detector)
    "librosa==0.10.1",
    "soundfile==0.12.1",
    "numpy==1.26.4",
    "scipy==1.12.0",

    # Observability
    "prometheus-client==0.20.0",
    "structlog==24.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest==8.1.1",
    "pytest-asyncio==0.23.5",
    "pytest-cov==4.1.0",
    "httpx==0.27.0",
    "faker==24.0.0",
    "locust==2.24.0",
    "ruff==0.3.2",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

### 1.3 Configuration (`backend/app/config.py`)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """Application settings using Pydantic V2."""

    # API
    app_name: str = "K1 Song Analysis API"
    version: str = "1.0.0"
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # Database
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/k1_analysis"
    db_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # S3 / Object Storage
    s3_bucket_audio: str = "k1-audio-ingest"
    s3_bucket_analysis: str = "k1-analysis-results"
    s3_region: str = "us-west-2"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None

    # Auth
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # Analysis
    max_concurrent_analyses: int = 5
    analysis_timeout_seconds: int = 300
    genesis_preset_default: str = "edm_high_energy"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

settings = Settings()
```

---

## 2. Database Layer

### 2.1 SQLAlchemy Models (`backend/app/db/models.py`)

```python
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, JSON, DateTime, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import enum

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass

class TrackStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    WARNING = "warning"
    FAILED = "failed"

class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    track_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    artist: Mapped[Optional[str]] = mapped_column(String(255))
    duration_hint: Mapped[Optional[float]] = mapped_column(Float)
    audio_sha256: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[TrackStatus] = mapped_column(
        SQLEnum(TrackStatus),
        default=TrackStatus.UPLOADED,
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    track_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    preset: Mapped[str] = mapped_column(String(64), nullable=False)
    metrics_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    artefact_manifest_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    error_message: Mapped[Optional[str]] = mapped_column(String(1024))

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    deployment_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    track_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    bundle_version: Mapped[str] = mapped_column(String(32), nullable=False)
    devices: Mapped[list] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    telemetry_json: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
```

### 2.2 Database Connection (`backend/app/db/session.py`)

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings
from app.db.models import Base

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # Verify connections before using
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    """Dependency for getting DB session in endpoints."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize database (create tables)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### 2.3 Alembic Configuration

```bash
# Initialize Alembic
cd backend
alembic init alembic
```

Update `alembic/env.py`:

```python
from app.db.models import Base
from app.config import settings

# Set target metadata
target_metadata = Base.metadata

# Use async database URL
config.set_main_option("sqlalchemy.url", settings.database_url)
```

Create initial migration:

```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

---

## 3. Pydantic Models (API Schema)

### 3.1 Genesis Map Schema (`backend/app/models/genesis_map.py`)

```python
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
from datetime import datetime

class EnvelopePoint(BaseModel):
    """Single point in frequency/dynamics envelope."""
    time_ms: float = Field(..., ge=0, description="Time in milliseconds")
    intensity: float = Field(..., ge=0.0, le=1.0, description="Normalized intensity")

class FrequencyLayer(BaseModel):
    """Frequency band envelopes."""
    bass: List[EnvelopePoint] = Field(..., min_length=1)
    mids: List[EnvelopePoint] = Field(..., min_length=1)
    highs: List[EnvelopePoint] = Field(..., min_length=1)

class RhythmLayer(BaseModel):
    """Beat and downbeat timing."""
    beat_grid_ms: List[float] = Field(..., min_length=1)
    downbeat_ms: List[float] = Field(default_factory=list)
    beat_strength: List[float] = Field(default_factory=list)

class Layers(BaseModel):
    """All analysis layers."""
    rhythm: RhythmLayer
    frequency: FrequencyLayer
    dynamics: Optional[Dict] = None
    spectral: Optional[Dict] = None
    annotations: Optional[Dict] = None

class GlobalMetrics(BaseModel):
    """Track-level metrics."""
    duration_ms: float = Field(..., gt=0)
    bpm: float = Field(..., gt=0, le=300)
    f_measure: float = Field(..., ge=0.0, le=1.0)
    cemgil: float = Field(..., ge=0.0, le=1.0)
    dynamic_range: Optional[float] = None

class GenesisMetadata(BaseModel):
    """Analysis metadata."""
    filename: str
    analysis_engine: str
    timestamp_utc: datetime
    version: str
    hashes: Dict[str, str]
    analysis_config: Dict

    @field_validator("hashes")
    @classmethod
    def validate_hashes(cls, v):
        required_keys = {"audio_sha256", "map_sha256"}
        if not required_keys.issubset(v.keys()):
            raise ValueError(f"Missing required hash keys: {required_keys - v.keys()}")
        return v

class GenesisMapV4(BaseModel):
    """Complete Genesis Map v4 schema."""
    metadata: GenesisMetadata
    global_metrics: GlobalMetrics
    layers: Layers

    model_config = {
        "json_schema_extra": {
            "example": {
                "metadata": {
                    "filename": "track.mp3",
                    "analysis_engine": "genesis_v4",
                    "timestamp_utc": "2025-10-31T12:00:00Z",
                    "version": "4.0.0",
                    "hashes": {
                        "audio_sha256": "a" * 64,
                        "map_sha256": "b" * 64
                    },
                    "analysis_config": {"sr": 44100, "hop_length": 512}
                },
                "global_metrics": {
                    "duration_ms": 240000,
                    "bpm": 128.0,
                    "f_measure": 0.95,
                    "cemgil": 0.68
                },
                "layers": {
                    "rhythm": {
                        "beat_grid_ms": [468, 937, 1406],
                        "downbeat_ms": [468, 2343, 4218],
                        "beat_strength": [0.9, 0.85, 0.92]
                    },
                    "frequency": {
                        "bass": [{"time_ms": 0, "intensity": 0.5}],
                        "mids": [{"time_ms": 0, "intensity": 0.3}],
                        "highs": [{"time_ms": 0, "intensity": 0.2}]
                    }
                }
            }
        }
    }
```

### 3.2 API Request/Response Models (`backend/app/models/api.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TrackStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    WARNING = "warning"
    FAILED = "failed"

class TrackCreate(BaseModel):
    """Request body for creating a track."""
    name: str = Field(..., min_length=1, max_length=255)
    artist: Optional[str] = Field(None, max_length=255)
    duration_hint: Optional[float] = Field(None, gt=0)

class TrackResponse(BaseModel):
    """Track resource response."""
    track_id: str
    name: str
    artist: Optional[str]
    duration_hint: Optional[float]
    status: TrackStatus
    audio_sha256: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Latest analysis results (if available)
    latest_analysis: Optional[dict] = None

    model_config = {"from_attributes": True}

class AnalysisRequest(BaseModel):
    """Request body for starting analysis."""
    preset: str = Field(default="edm_high_energy", max_length=64)
    priority: int = Field(default=5, ge=1, le=10)

class AnalysisResponse(BaseModel):
    """Response for analysis request."""
    track_id: str
    task_id: str
    status: str
    estimated_time_sec: int

class AnalysisStatusResponse(BaseModel):
    """Analysis job status."""
    task_id: str
    state: str
    progress: Optional[dict] = None
    result: Optional[dict] = None
    error: Optional[str] = None
```

---

## 4. Core API Endpoints

### 4.1 Main Application (`backend/app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.config import settings
from app.db.session import init_db
from app.api import tracks, analysis, websockets

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("Starting K1 Song Analysis API", version=settings.version)
    await init_db()
    logger.info("Database initialized")

    yield

    # Shutdown
    logger.info("Shutting down K1 Song Analysis API")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tracks.router, prefix="/api/v1", tags=["tracks"])
app.include_router(analysis.router, prefix="/api/v1", tags=["analysis"])
app.include_router(websockets.router, prefix="/ws", tags=["websockets"])

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.version}
```

### 4.2 Tracks Endpoints (`backend/app/api/tracks.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import hashlib

from app.db.session import get_db
from app.db.models import Track, TrackStatus
from app.models.api import TrackCreate, TrackResponse
from app.services.storage import upload_to_s3, generate_presigned_url

router = APIRouter()

@router.post("/tracks", response_model=TrackResponse)
async def create_track(
    track_data: TrackCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new track record and return presigned upload URL.

    Workflow:
    1. Create track record with UPLOADED status
    2. Generate presigned S3 URL for audio upload
    3. Return track_id and upload URL
    """
    track_id = uuid.uuid4().hex[:12]

    track = Track(
        track_id=track_id,
        name=track_data.name,
        artist=track_data.artist,
        duration_hint=track_data.duration_hint,
        status=TrackStatus.UPLOADED
    )

    db.add(track)
    await db.commit()
    await db.refresh(track)

    # Generate presigned URL for audio upload
    upload_url = await generate_presigned_url(
        bucket=settings.s3_bucket_audio,
        key=f"{track_id}/audio.mp3",
        expiration=3600  # 1 hour
    )

    return {
        **track.__dict__,
        "upload_url": upload_url
    }

@router.get("/tracks", response_model=List[TrackResponse])
async def list_tracks(
    status: Optional[TrackStatus] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List tracks with optional status filter."""
    query = select(Track)

    if status:
        query = query.where(Track.status == status)

    query = query.limit(limit).offset(offset).order_by(Track.created_at.desc())

    result = await db.execute(query)
    tracks = result.scalars().all()

    return tracks

@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get track details including latest analysis."""
    result = await db.execute(
        select(Track).where(Track.track_id == track_id)
    )
    track = result.scalar_one_or_none()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    return track

@router.delete("/tracks/{track_id}")
async def delete_track(
    track_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete track and all associated data."""
    result = await db.execute(
        select(Track).where(Track.track_id == track_id)
    )
    track = result.scalar_one_or_none()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Delete from S3 (audio + analysis artifacts)
    # await delete_from_s3(track_id)

    await db.delete(track)
    await db.commit()

    return {"status": "deleted", "track_id": track_id}
```

---

## 5. Analysis Integration

### 5.1 Beat Detector Service (`backend/app/services/beat_detection.py`)

```python
import asyncio
from pathlib import Path
from typing import Dict, Any
import structlog

# Direct import from existing codebase
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "firmware/K1.node2/beats"))
from beat_detector import BeatDetector

logger = structlog.get_logger()

class BeatDetectionService:
    """Wrapper for beat detector with async support."""

    def __init__(self, sr: int = 44100, hop_length: int = 512):
        self.detector = BeatDetector(sr=sr, hop_length=hop_length)

    async def analyze_audio(
        self,
        audio_path: str,
        method: str = "librosa",
        filter_beats: bool = True
    ) -> Dict[str, Any]:
        """
        Run beat detection on audio file (async wrapper).

        Runs CPU-bound work on thread pool to avoid blocking event loop.
        """
        logger.info("Starting beat detection", audio_path=audio_path, method=method)

        # Run on thread pool (non-blocking)
        if method == "librosa":
            result = await asyncio.to_thread(
                self.detector.detect_beats,
                audio_path,
                units="time",
                filter_beats=filter_beats
            )
        else:
            result = await asyncio.to_thread(
                self.detector.detect_beats_custom,
                audio_path
            )

        logger.info(
            "Beat detection complete",
            tempo=result["tempo"],
            num_beats=len(result["beats"]),
            num_onsets=len(result["onsets"])
        )

        return result
```

### 5.2 Celery Worker (`backend/app/workers/celery_app.py`)

```python
from celery import Celery, Task
from app.config import settings
from app.services.beat_detection import BeatDetectionService
import structlog

logger = structlog.get_logger()

celery_app = Celery(
    "k1_analysis",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.analysis_timeout_seconds,
)

class AnalysisTask(Task):
    """Base task with shared resources."""
    _detector = None

    @property
    def detector(self):
        if self._detector is None:
            self._detector = BeatDetectionService()
        return self._detector

@celery_app.task(bind=True, base=AnalysisTask)
def analyze_track(
    self,
    track_id: str,
    audio_path: str,
    preset: str = "edm_high_energy"
):
    """
    Full analysis workflow:
    1. Beat detection
    2. Genesis Engine
    3. Validation
    4. S3 upload
    5. DB update
    """
    total_steps = 5

    try:
        # Step 1: Beat detection
        self.update_state(state="PROGRESS", meta={"step": 1, "total": total_steps})
        logger.info("Step 1: Beat detection", track_id=track_id)

        # Use sync version in Celery worker (already on thread pool)
        from beat_detector import BeatDetector
        detector = BeatDetector()
        beat_result = detector.detect_beats(audio_path)

        # Step 2: Genesis Engine (placeholder - implement separately)
        self.update_state(state="PROGRESS", meta={"step": 2, "total": total_steps})
        logger.info("Step 2: Genesis Engine", track_id=track_id)

        # TODO: Integrate Genesis Engine
        # from genesis_engine import AdvancedGenesisEngine
        # engine = AdvancedGenesisEngine(preset=preset)
        # genesis_map = engine.generate_map(beat_result)

        # Step 3: Validation
        self.update_state(state="PROGRESS", meta={"step": 3, "total": total_steps})
        logger.info("Step 3: Validation", track_id=track_id)

        # Validate against Pydantic schema
        # from app.models.genesis_map import GenesisMapV4
        # validated_map = GenesisMapV4(**genesis_map)

        # Step 4: Upload to S3
        self.update_state(state="PROGRESS", meta={"step": 4, "total": total_steps})
        logger.info("Step 4: S3 upload", track_id=track_id)

        # TODO: S3 upload

        # Step 5: Update database
        self.update_state(state="PROGRESS", meta={"step": 5, "total": total_steps})
        logger.info("Step 5: Database update", track_id=track_id)

        # TODO: DB update

        return {
            "track_id": track_id,
            "status": "completed",
            "metrics": {
                "tempo": float(beat_result["tempo"]),
                "num_beats": len(beat_result["beats"]),
                "f_measure": 0.95  # Placeholder
            }
        }

    except Exception as e:
        logger.error("Analysis failed", track_id=track_id, error=str(e))
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise
```

### 5.3 Analysis Endpoints (`backend/app/api/analysis.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.api import AnalysisRequest, AnalysisResponse, AnalysisStatusResponse
from app.workers.celery_app import analyze_track

router = APIRouter()

@router.post("/tracks/{track_id}/analysis", response_model=AnalysisResponse)
async def start_analysis(
    track_id: str,
    request: AnalysisRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start analysis job for a track.

    Enqueues Celery task and returns task_id for status polling.
    """
    # Verify track exists
    # ... (query DB)

    audio_path = f"storage/audio/{track_id}.mp3"

    # Enqueue Celery task
    task = analyze_track.delay(
        track_id=track_id,
        audio_path=audio_path,
        preset=request.preset
    )

    return AnalysisResponse(
        track_id=track_id,
        task_id=task.id,
        status="queued",
        estimated_time_sec=90
    )

@router.get("/tasks/{task_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(task_id: str):
    """Poll analysis job status."""
    from app.workers.celery_app import celery_app

    task = celery_app.AsyncResult(task_id)

    return AnalysisStatusResponse(
        task_id=task_id,
        state=task.state,
        progress=task.info if task.state == "PROGRESS" else None,
        result=task.result if task.state == "SUCCESS" else None,
        error=str(task.info) if task.state == "FAILURE" else None
    )
```

---

## 6. WebSocket Support

### 6.1 WebSocket Manager (`backend/app/services/websocket_manager.py`)

```python
from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import structlog

logger = structlog.get_logger()

class WebSocketManager:
    """Manage WebSocket connections and broadcasting."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, device_id: str, websocket: WebSocket):
        """Register new WebSocket connection."""
        await websocket.accept()

        if device_id not in self.active_connections:
            self.active_connections[device_id] = set()

        self.active_connections[device_id].add(websocket)
        logger.info("WebSocket connected", device_id=device_id)

    def disconnect(self, device_id: str, websocket: WebSocket):
        """Remove WebSocket connection."""
        if device_id in self.active_connections:
            self.active_connections[device_id].discard(websocket)
            if not self.active_connections[device_id]:
                del self.active_connections[device_id]

        logger.info("WebSocket disconnected", device_id=device_id)

    async def send_to_device(self, device_id: str, message: dict):
        """Send message to all connections for a device."""
        if device_id in self.active_connections:
            disconnected = set()

            for connection in self.active_connections[device_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error("Failed to send message", device_id=device_id, error=str(e))
                    disconnected.add(connection)

            # Clean up dead connections
            for connection in disconnected:
                self.disconnect(device_id, connection)

    async def broadcast_to_all(self, message: dict):
        """Broadcast message to all connected devices."""
        for device_id in list(self.active_connections.keys()):
            await self.send_to_device(device_id, message)

ws_manager = WebSocketManager()
```

### 6.2 WebSocket Endpoints (`backend/app/api/websockets.py`)

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import time
import structlog

from app.services.websocket_manager import ws_manager

router = APIRouter()
logger = structlog.get_logger()

@router.websocket("/telemetry/{device_id}")
async def telemetry_websocket(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint for device telemetry streaming.

    Protocol:
    - Device sends: {"drift_ms": float, "cpu_pct": float, "temperature_c": float}
    - Server responds: {"status": "ok", "timestamp": float}
    - Server alerts if drift_ms > threshold
    """
    await ws_manager.connect(device_id, websocket)

    try:
        while True:
            # Receive telemetry from device
            data = await websocket.receive_json()

            logger.info(
                "Telemetry received",
                device_id=device_id,
                drift_ms=data.get("drift_ms"),
                cpu_pct=data.get("cpu_pct")
            )

            # Check drift threshold
            drift_ms = data.get("drift_ms", 0)
            if abs(drift_ms) > 50:
                # Broadcast alert to monitoring clients
                await ws_manager.broadcast_to_all({
                    "type": "drift_alert",
                    "device_id": device_id,
                    "drift_ms": drift_ms,
                    "timestamp": time.time()
                })

            # Acknowledge
            await websocket.send_json({
                "status": "ok",
                "timestamp": time.time()
            })

    except WebSocketDisconnect:
        ws_manager.disconnect(device_id, websocket)
        logger.info("Device disconnected", device_id=device_id)

@router.websocket("/monitor")
async def monitoring_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for frontend monitoring dashboard.

    Streams aggregated telemetry from all devices.
    """
    await websocket.accept()

    try:
        while True:
            # Send periodic status updates
            await websocket.send_json({
                "type": "status",
                "active_devices": len(ws_manager.active_connections),
                "timestamp": time.time()
            })

            await asyncio.sleep(5)

    except WebSocketDisconnect:
        pass
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (`backend/tests/unit/test_genesis_map.py`)

```python
import pytest
from app.models.genesis_map import GenesisMapV4, EnvelopePoint, FrequencyLayer

def test_envelope_point_validation():
    """Test EnvelopePoint validation."""
    # Valid
    point = EnvelopePoint(time_ms=100, intensity=0.5)
    assert point.time_ms == 100
    assert point.intensity == 0.5

    # Invalid intensity
    with pytest.raises(ValueError):
        EnvelopePoint(time_ms=100, intensity=1.5)

def test_genesis_map_validation():
    """Test full Genesis Map validation."""
    valid_map = {
        "metadata": {
            "filename": "test.mp3",
            "analysis_engine": "test",
            "timestamp_utc": "2025-10-31T12:00:00Z",
            "version": "4.0.0",
            "hashes": {
                "audio_sha256": "a" * 64,
                "map_sha256": "b" * 64
            },
            "analysis_config": {}
        },
        "global_metrics": {
            "duration_ms": 240000,
            "bpm": 128,
            "f_measure": 0.95,
            "cemgil": 0.68
        },
        "layers": {
            "rhythm": {
                "beat_grid_ms": [468, 937],
                "downbeat_ms": [468],
                "beat_strength": [0.9, 0.85]
            },
            "frequency": {
                "bass": [{"time_ms": 0, "intensity": 0.5}],
                "mids": [{"time_ms": 0, "intensity": 0.3}],
                "highs": [{"time_ms": 0, "intensity": 0.2}]
            }
        }
    }

    genesis_map = GenesisMapV4(**valid_map)
    assert genesis_map.global_metrics.bpm == 128
```

### 7.2 Integration Tests (`backend/tests/integration/test_api.py`)

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_track():
    """Test track creation endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/tracks",
            json={
                "name": "Test Track",
                "artist": "Test Artist",
                "duration_hint": 240.0
            }
        )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Track"
    assert "track_id" in data

@pytest.mark.asyncio
async def test_analysis_workflow():
    """Test full analysis workflow."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create track
        track_response = await client.post(
            "/api/v1/tracks",
            json={"name": "Test", "artist": "Artist"}
        )
        track_id = track_response.json()["track_id"]

        # 2. Start analysis
        analysis_response = await client.post(
            f"/api/v1/tracks/{track_id}/analysis",
            json={"preset": "edm_high_energy"}
        )
        task_id = analysis_response.json()["task_id"]

        # 3. Poll status
        status_response = await client.get(f"/api/v1/tasks/{task_id}")
        assert status_response.status_code == 200
```

---

## 8. Deployment

### 8.1 Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies for librosa
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')"

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 8.2 Docker Compose (`backend/docker-compose.yml`)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/k1_analysis
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/app/app

  worker:
    build: .
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/k1_analysis
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/app/app

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=k1_analysis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run with:
```bash
docker-compose up -d
```

---

## 9. Next Steps

1. **Initialize project structure**: Run bootstrap script
2. **Set up database**: Run Alembic migrations
3. **Implement Genesis Engine integration**: Port from `Implementation.plans/genesis_engine/`
4. **Write tests**: Start with unit tests for Pydantic models
5. **Deploy locally**: Use Docker Compose
6. **Load test**: Use Locust to verify <200ms response times
7. **Document API**: Generate OpenAPI docs at `/docs`

---

## References

- **Beat Detector**: `/firmware/K1.node2/beats/beat_detector.py`
- **Genesis PRD**: `/Implementation.plans/GENESIS_REINTEGRATION_PRD.md`
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0**: https://docs.sqlalchemy.org/en/20/
- **Celery**: https://docs.celeryq.dev/
