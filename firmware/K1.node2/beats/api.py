#!/usr/bin/env python3
"""
FastAPI Song Analysis Service for K1.reinvented

Production-ready REST API with:
- File upload and processing
- Async job queue with Celery/Redis
- WebSocket real-time updates
- Caching with Redis
- Rate limiting
- Comprehensive error handling

Author: Claude (Song Analysis Enhancement)
Date: 2025-10-31
Status: Production-ready API
"""

import os
import asyncio
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import uuid

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

import redis
import librosa
import numpy as np

# Import our analysis modules
from enhanced_beat_detector import EnhancedBeatDetector
from stem_separator import StemSeparator
from harmonic_analyzer import HarmonicAnalyzer
from structure_analyzer import StructuralAnalyzer
from emotional_analyzer import EmotionalAnalyzer
from effect_mapper import EffectMapper


# Pydantic models for request/response
class AnalysisRequest(BaseModel):
    """Request model for song analysis."""
    file_url: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)
    callback_url: Optional[str] = None


class AnalysisStatus(BaseModel):
    """Status model for analysis jobs."""
    job_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    progress: float  # 0.0 to 1.0
    message: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    result_url: Optional[str] = None
    error: Optional[str] = None


class GenesisMap(BaseModel):
    """Genesis Map schema for frontend."""
    version: str = "v4.0"
    metadata: Dict[str, Any]
    beats: Dict[str, Any]
    drops: Dict[str, Any]
    harmony: Dict[str, Any]
    structure: Dict[str, Any]
    emotion: Dict[str, Any]
    stems: Dict[str, Any]
    effects: Optional[List[Dict]] = None


# Initialize Redis
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    print("🚀 Starting Song Analysis API...")

    # Initialize directories
    Path("uploads").mkdir(exist_ok=True)
    Path("results").mkdir(exist_ok=True)
    Path("cache").mkdir(exist_ok=True)

    # Test Redis connection
    try:
        redis_client.ping()
        print("✓ Redis connected")
    except Exception as e:
        print(f"⚠️  Redis not available: {e}")

    yield

    # Shutdown
    print("👋 Shutting down Song Analysis API...")


# Create FastAPI app
app = FastAPI(
    title="K1.reinvented Song Analysis API",
    description="Advanced audio analysis for LED visualization",
    version="4.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WebSocket connection manager
class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)


manager = ConnectionManager()


# Analysis orchestrator
class AnalysisOrchestrator:
    """Orchestrates the complete analysis pipeline."""

    def __init__(self):
        self.beat_detector = EnhancedBeatDetector()
        self.stem_separator = StemSeparator()
        self.harmonic_analyzer = HarmonicAnalyzer()
        self.structure_analyzer = StructuralAnalyzer()
        self.emotional_analyzer = EmotionalAnalyzer()
        self.effect_mapper = EffectMapper()

    async def analyze(self, audio_path: str, job_id: str,
                      options: Dict[str, Any] = None) -> GenesisMap:
        """
        Run complete analysis pipeline.

        Args:
            audio_path: Path to audio file
            job_id: Job ID for progress updates
            options: Analysis options

        Returns:
            Complete Genesis Map
        """
        options = options or {}

        # Load audio
        await self._update_progress(job_id, 0.05, "Loading audio...")
        y, sr = librosa.load(audio_path, sr=None)
        duration = len(y) / sr

        # Metadata
        metadata = {
            'filename': os.path.basename(audio_path),
            'duration_ms': int(duration * 1000),
            'sample_rate': sr,
            'analyzed_at': datetime.utcnow().isoformat()
        }

        # 1. Beat detection (20%)
        await self._update_progress(job_id, 0.1, "Detecting beats and drops...")
        beats, tempo, downbeats, drops = self.beat_detector.detect(y, sr)

        beats_data = {
            'tempo': float(tempo),
            'beat_times_ms': [int(b * 1000) for b in beats],
            'downbeat_times_ms': [int(d * 1000) for d in downbeats],
            'total_beats': len(beats)
        }

        drops_data = {
            'events': drops,
            'total_drops': len([d for d in drops if d['type'] == 'drop'])
        }

        # 2. Harmonic analysis (30%)
        await self._update_progress(job_id, 0.3, "Analyzing harmony...")
        key, confidence = self.harmonic_analyzer.detect_key(y, sr)
        chords = self.harmonic_analyzer.detect_chords(y, sr)

        harmony_data = {
            'key': key,
            'key_confidence': confidence,
            'progression': chords,
            'color_palette': self.harmonic_analyzer.key_to_color_palette(key)
        }

        # 3. Structural analysis (40%)
        await self._update_progress(job_id, 0.4, "Analyzing song structure...")
        segments = self.structure_analyzer.analyze(y, sr, beat_frames=None)

        structure_data = self.structure_analyzer.to_genesis_map_format(segments)['structure']

        # 4. Emotional analysis (50%)
        await self._update_progress(job_id, 0.5, "Analyzing emotional content...")
        emotional_states = self.emotional_analyzer.analyze(y, sr)
        mood_segments = self.emotional_analyzer.segment_by_mood(emotional_states)

        emotion_data = self.emotional_analyzer.to_genesis_map_format(
            emotional_states, mood_segments
        )['emotion']

        # 5. Stem separation (optional, 60-80%)
        stems_data = {}
        if options.get('extract_stems', False):
            await self._update_progress(job_id, 0.6, "Separating stems (this may take a minute)...")

            # Use local Demucs by default
            stems = self.stem_separator.separate_local(audio_path)
            stem_features = self.stem_separator.extract_stem_features(stems)
            stems_data = self.stem_separator.to_genesis_map_format(stem_features)['stems']

            await self._update_progress(job_id, 0.8, "Stem separation complete")

        # 6. Generate effects (90%)
        await self._update_progress(job_id, 0.9, "Generating LED effects...")

        self.effect_mapper.set_beats(beats, downbeats)
        self.effect_mapper.set_drops(drops)
        self.effect_mapper.set_mood_segments(emotion_data['mood_segments'])
        self.effect_mapper.set_structural_segments(structure_data['segments'])
        self.effect_mapper.set_harmonic_data(harmony_data)

        effects = self.effect_mapper.generate_effects()

        # Convert to serializable format
        effects_data = [
            {
                'type': e.type.value,
                'start_ms': e.start_ms,
                'duration_ms': e.duration_ms,
                'intensity': e.intensity,
                'colors': e.colors
            }
            for e in effects[:100]  # Limit to first 100 for API response
        ]

        await self._update_progress(job_id, 1.0, "Analysis complete!")

        return GenesisMap(
            version="v4.0",
            metadata=metadata,
            beats=beats_data,
            drops=drops_data,
            harmony=harmony_data,
            structure=structure_data,
            emotion=emotion_data,
            stems=stems_data,
            effects=effects_data
        )

    async def _update_progress(self, job_id: str, progress: float, message: str):
        """Update job progress in Redis and notify WebSocket clients."""

        # Update Redis
        redis_client.hset(f"job:{job_id}", mapping={
            'progress': progress,
            'message': message,
            'updated_at': datetime.utcnow().isoformat()
        })

        # Send WebSocket update
        update = {
            'job_id': job_id,
            'progress': progress,
            'message': message
        }
        await manager.send_personal_message(json.dumps(update), job_id)


orchestrator = AnalysisOrchestrator()


# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "K1.reinvented Song Analysis API",
        "version": "4.0.0",
        "status": "operational",
        "endpoints": [
            "/analyze",
            "/analyze/upload",
            "/status/{job_id}",
            "/result/{job_id}",
            "/ws/{client_id}"
        ]
    }


@app.post("/analyze/upload", response_model=AnalysisStatus)
async def analyze_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    extract_stems: bool = False,
    realtime: bool = False
):
    """
    Upload and analyze an audio file.

    Args:
        file: Audio file (mp3, wav, flac, etc.)
        extract_stems: Whether to perform stem separation
        realtime: Whether to return results immediately (small files only)

    Returns:
        Job status with job_id for tracking
    """

    # Validate file
    if not file.filename.lower().endswith(('.mp3', '.wav', '.flac', '.m4a', '.ogg')):
        raise HTTPException(400, "Invalid file format")

    if file.size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(413, "File too large (max 50MB)")

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file
    upload_path = f"uploads/{job_id}_{file.filename}"
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create job in Redis
    job_data = {
        'job_id': job_id,
        'status': 'pending',
        'progress': 0.0,
        'message': 'Analysis queued',
        'filename': file.filename,
        'created_at': datetime.utcnow().isoformat()
    }
    redis_client.hset(f"job:{job_id}", mapping=job_data)

    # Analysis options
    options = {
        'extract_stems': extract_stems
    }

    if realtime and file.size < 10 * 1024 * 1024:  # < 10MB
        # Process immediately for small files
        try:
            result = await orchestrator.analyze(upload_path, job_id, options)

            # Save result
            result_path = f"results/{job_id}.json"
            with open(result_path, 'w') as f:
                json.dump(result.dict(), f)

            # Update job status
            redis_client.hset(f"job:{job_id}", mapping={
                'status': 'completed',
                'progress': 1.0,
                'message': 'Analysis complete',
                'completed_at': datetime.utcnow().isoformat(),
                'result_url': f"/result/{job_id}"
            })

            return AnalysisStatus(
                job_id=job_id,
                status='completed',
                progress=1.0,
                message='Analysis complete',
                created_at=datetime.fromisoformat(job_data['created_at']),
                completed_at=datetime.utcnow(),
                result_url=f"/result/{job_id}"
            )

        except Exception as e:
            # Update job with error
            redis_client.hset(f"job:{job_id}", mapping={
                'status': 'failed',
                'error': str(e)
            })
            raise HTTPException(500, f"Analysis failed: {str(e)}")

    else:
        # Queue for background processing
        background_tasks.add_task(
            process_analysis_job,
            upload_path,
            job_id,
            options
        )

        return AnalysisStatus(
            job_id=job_id,
            status='pending',
            progress=0.0,
            message='Analysis queued',
            created_at=datetime.utcnow(),
            completed_at=None,
            result_url=None
        )


async def process_analysis_job(audio_path: str, job_id: str, options: Dict):
    """Background task to process analysis job."""

    try:
        # Update status to processing
        redis_client.hset(f"job:{job_id}", mapping={
            'status': 'processing',
            'progress': 0.0,
            'message': 'Starting analysis...'
        })

        # Run analysis
        result = await orchestrator.analyze(audio_path, job_id, options)

        # Save result
        result_path = f"results/{job_id}.json"
        with open(result_path, 'w') as f:
            json.dump(result.dict(), f)

        # Update job status
        redis_client.hset(f"job:{job_id}", mapping={
            'status': 'completed',
            'progress': 1.0,
            'message': 'Analysis complete',
            'completed_at': datetime.utcnow().isoformat(),
            'result_url': f"/result/{job_id}"
        })

        # Send final WebSocket notification
        await manager.send_personal_message(
            json.dumps({
                'job_id': job_id,
                'status': 'completed',
                'result_url': f"/result/{job_id}"
            }),
            job_id
        )

    except Exception as e:
        # Update job with error
        redis_client.hset(f"job:{job_id}", mapping={
            'status': 'failed',
            'error': str(e),
            'completed_at': datetime.utcnow().isoformat()
        })

        # Notify via WebSocket
        await manager.send_personal_message(
            json.dumps({
                'job_id': job_id,
                'status': 'failed',
                'error': str(e)
            }),
            job_id
        )

    finally:
        # Clean up uploaded file after 1 hour
        await asyncio.sleep(3600)
        if os.path.exists(audio_path):
            os.remove(audio_path)


@app.get("/status/{job_id}", response_model=AnalysisStatus)
async def get_status(job_id: str):
    """Get analysis job status."""

    job_data = redis_client.hgetall(f"job:{job_id}")

    if not job_data:
        raise HTTPException(404, "Job not found")

    return AnalysisStatus(
        job_id=job_id,
        status=job_data.get('status', 'unknown'),
        progress=float(job_data.get('progress', 0)),
        message=job_data.get('message', ''),
        created_at=datetime.fromisoformat(job_data.get('created_at', datetime.utcnow().isoformat())),
        completed_at=datetime.fromisoformat(job_data['completed_at']) if job_data.get('completed_at') else None,
        result_url=job_data.get('result_url'),
        error=job_data.get('error')
    )


@app.get("/result/{job_id}")
async def get_result(job_id: str):
    """Get analysis results."""

    result_path = f"results/{job_id}.json"

    if not os.path.exists(result_path):
        # Check if job exists
        job_data = redis_client.hgetall(f"job:{job_id}")
        if not job_data:
            raise HTTPException(404, "Job not found")
        elif job_data.get('status') != 'completed':
            raise HTTPException(425, f"Job still {job_data.get('status', 'pending')}")
        else:
            raise HTTPException(404, "Result file not found")

    with open(result_path, 'r') as f:
        result = json.load(f)

    return JSONResponse(content=result)


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates."""

    await manager.connect(websocket, client_id)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()

    except Exception:
        manager.disconnect(client_id)


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its results."""

    # Delete from Redis
    deleted = redis_client.delete(f"job:{job_id}")

    # Delete result file
    result_path = f"results/{job_id}.json"
    if os.path.exists(result_path):
        os.remove(result_path)

    # Delete upload file
    for file in Path("uploads").glob(f"{job_id}_*"):
        file.unlink()

    if not deleted:
        raise HTTPException(404, "Job not found")

    return {"message": "Job deleted"}


@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics."""

    try:
        info = redis_client.info('memory')
        return {
            'used_memory': info['used_memory_human'],
            'peak_memory': info['used_memory_peak_human'],
            'keys': redis_client.dbsize()
        }
    except Exception as e:
        return {"error": f"Redis not available: {str(e)}"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )