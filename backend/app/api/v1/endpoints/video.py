"""Video Factory endpoints — thin proxy to the Remotion renderer service.

Video rendering is handled by the Node/Remotion service
(see `remotion-service/` at the repo root). This module preserves the public
API contract consumed by the WhatsApp bot and the frontend:

- POST   /api/v1/video/generate
- GET    /api/v1/video/status/{job_id}
- GET    /api/v1/video/stream/{job_id}
- POST   /api/v1/video/analyze-drawing
- POST   /api/v1/video/solve-math
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

REMOTION_SERVICE_URL = os.getenv("REMOTION_SERVICE_URL", "http://localhost:3005")

# In-memory job registry. In production, swap for Redis.
video_jobs: dict[str, dict] = {}
video_tasks: dict[str, asyncio.Task] = {}


# ---------------------------------------------------------------------------
# Topic-keyed video cache
# ---------------------------------------------------------------------------
# Persisted to disk so renders survive backend restarts. First request for a
# topic+language does the full render (~60s). Every subsequent request for
# the same topic+language returns the cached Remotion URL instantly.

CACHE_FILE = Path(__file__).resolve().parents[4] / "data" / "video_cache.json"
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
_cache_lock = threading.Lock()
_video_cache: dict[str, dict] = {}


def _load_cache() -> None:
    global _video_cache
    if CACHE_FILE.exists():
        try:
            _video_cache = json.loads(CACHE_FILE.read_text())
            logger.info("video cache loaded: %d entries", len(_video_cache))
        except Exception:
            logger.exception("failed to load video cache; starting empty")
            _video_cache = {}
    else:
        _video_cache = {}


def _save_cache() -> None:
    try:
        tmp = CACHE_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(_video_cache, indent=2, sort_keys=True))
        tmp.replace(CACHE_FILE)
    except Exception:
        logger.exception("failed to persist video cache")


def _cache_key(concept: str, language: str) -> str:
    """Normalize topic+language into a stable cache key.

    Lowercases, trims, collapses whitespace, strips trailing punctuation and
    leading question words so "What is DFS?" and "dfs" both hit the same
    entry.
    """
    t = (concept or "").strip().lower()
    # Strip common leading question / connector prefixes. Run in a loop so
    # "video for nuclear fission" → "for nuclear fission" → "nuclear fission"
    # collapses to the same cache key as a plain "nuclear fission" request.
    prefixes = (
        "what is ", "what are ", "how does ", "how do ", "how is ",
        "why is ", "why does ", "why do ",
        "explain ", "define ", "describe ", "tell me about ",
        # Leading connectors that survive bot topic extraction
        "for ", "about ", "on ", "regarding ", "of ",
        # Hinglish / Marathi
        "kya hai ", "kya hota hai ", "kaise ", "kyun ", "kyu ", "samjhao ",
        "ke baare mein ", "ke baare me ", "baddal ", "vishayi ",
    )
    # Loop so chained prefixes like "what is for nuclear fission" collapse to
    # the same key as "nuclear fission".
    changed = True
    while changed:
        changed = False
        for p in prefixes:
            if t.startswith(p):
                t = t[len(p):].strip()
                changed = True
                break
    # Strip trailing punctuation / fillers
    t = re.sub(r"[?!.।]+$", "", t)
    t = re.sub(r"\s+(please|plz|pls|kindly)$", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    lang = (language or "english").strip().lower()
    # v10 → "1-minute context video" budget: 5 segments (11-13s each,
    # total 55-65s), tighter narration (28-35 words/seg) so audio runs
    # continuously without silent gaps. Target end-to-end render ~2 min.
    # Bump this whenever renderer output changes so stale mp4s from
    # older layouts are never served.
    return f"v10|{t}|{lang}"


async def _cache_entry_is_valid(entry: dict) -> bool:
    """HEAD the cached video URL to make sure the mp4 still exists on disk."""
    url = entry.get("video_url")
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.head(url)
        return r.status_code == 200
    except Exception:
        return False


def _remember(concept: str, language: str, job: dict) -> None:
    """Persist a completed job's video URL in the topic cache."""
    key = _cache_key(concept, language)
    entry = {
        "video_url": job.get("video_url"),
        "subtitles_url": job.get("subtitles_url"),
        "concept": concept,
        "language": language,
        "created_at": time.time(),
    }
    if not entry["video_url"]:
        return
    with _cache_lock:
        _video_cache[key] = entry
        _save_cache()
    logger.info("video cached: %s", key)


_load_cache()


class VideoGenerationRequest(BaseModel):
    concept: str = Field(..., description="The concept to explain")
    explanation: str = Field(default="", description="Additional context")
    language: str = Field(default="english", description="Target language")
    visual_style: str = Field(default="educational", description="Animation style")
    duration: int = Field(default=30, description="Target duration in seconds")
    use_agents: bool = Field(
        default=False,
        description=(
            "Route through the LangGraph supervisor → specialist team → video_team "
            "so the video reflects structured math steps / code analysis / diagrams "
            "instead of a flat concept script."
        ),
    )


class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    video_url: Optional[str] = None
    subtitles_url: Optional[str] = None
    duration: Optional[float] = None
    estimated_time: int = 45


class VideoStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float = Field(0.0, ge=0.0, le=100.0)
    video_url: Optional[str] = None
    subtitles_url: Optional[str] = None
    error_message: Optional[str] = None


class DrawingAnalysisRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image")
    question: str = Field(default="", description="Optional question about the drawing")


class DrawingAnalysisResponse(BaseModel):
    analysis: str
    solution: Optional[str] = None
    steps: Optional[list] = None
    video_job_id: Optional[str] = None


# --- Background task -------------------------------------------------------

async def _poll_remotion_job(job_id: str, remote_job_id: str) -> None:
    """Poll the Remotion service and mirror progress into `video_jobs`.

    Long / content-heavy topics (e.g. "detailed timeline of Shivaji Maharaj")
    can produce 20+ scenes and take well over 10 minutes to render. We keep
    polling for up to 30 minutes so the cache eventually records the mp4,
    even if the upstream client (WhatsApp bot / browser) has already given
    up. This guarantees the user's next retry is a cache hit instead of a
    fresh render.
    """
    status_url = f"{REMOTION_SERVICE_URL}/status/{remote_job_id}"
    # 30 min hard cap (1800 × 1s). Anything beyond this is almost certainly
    # a wedged render — the Remotion service itself would have errored by
    # then too.
    MAX_ITERATIONS = 1800
    async with httpx.AsyncClient(timeout=30.0) as client:
        for _ in range(MAX_ITERATIONS):
            try:
                r = await client.get(status_url)
                if r.status_code == 404:
                    # Service restarted or job was dropped
                    video_jobs[job_id]["status"] = "failed"
                    video_jobs[job_id]["error_message"] = "Remotion job not found"
                    return
                r.raise_for_status()
                data = r.json()
            except Exception as e:  # pragma: no cover
                logger.warning("Poll error for job %s: %s", job_id, e)
                await asyncio.sleep(2.0)
                continue

            video_jobs[job_id]["status"] = data.get("status", "rendering")
            video_jobs[job_id]["progress"] = float(data.get("progress", 0))

            if data.get("status") == "completed":
                video_jobs[job_id]["video_url"] = data.get("video_url")
                video_jobs[job_id]["subtitles_url"] = data.get("subtitles_url")
                video_jobs[job_id]["progress"] = 100.0
                _remember(
                    video_jobs[job_id].get("concept", ""),
                    video_jobs[job_id].get("language", "english"),
                    video_jobs[job_id],
                )
                return
            if data.get("status") == "failed":
                video_jobs[job_id]["error_message"] = data.get("error_message", "render failed")
                return

            await asyncio.sleep(1.0)

    video_jobs[job_id]["status"] = "failed"
    video_jobs[job_id]["error_message"] = "Timed out waiting for Remotion render"


async def _start_remotion_job(
    job_id: str, concept: str, explanation: str, language: str
) -> None:
    """Kick off a render on the Remotion service, then poll to completion."""
    try:
        video_jobs[job_id]["status"] = "queued"
        video_jobs[job_id]["progress"] = 2

        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{REMOTION_SERVICE_URL}/render",
                json={
                    "concept": concept,
                    "explanation": explanation,
                    "language": language,
                    "jobId": job_id,
                },
            )
            r.raise_for_status()
            data = r.json()
            remote_job_id = data.get("jobId") or job_id

        await _poll_remotion_job(job_id, remote_job_id)
    except httpx.HTTPError as e:
        logger.exception("Failed to start Remotion render")
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error_message"] = (
            f"Remotion service unreachable at {REMOTION_SERVICE_URL}: {e}"
        )
    except Exception as e:  # pragma: no cover
        logger.exception("Unexpected video pipeline error")
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error_message"] = str(e)


async def _start_agent_job(
    job_id: str, concept: str, explanation: str, language: str
) -> None:
    """Run the LangGraph pipeline. The video_team node produces the render."""
    try:
        # Imported lazily so the video router has no hard dependency on the
        # agent stack (useful when running backend tests without OPENAI_API_KEY).
        from agents.graph import process_intent

        video_jobs[job_id]["status"] = "agents"
        video_jobs[job_id]["progress"] = 5

        query = concept if not explanation else f"{concept}\n\n{explanation}"
        result = await process_intent(query=query, modality="text", language=language)

        video_url = result.get("video_url")
        if not video_url:
            video_jobs[job_id]["status"] = "failed"
            video_jobs[job_id]["error_message"] = (
                result.get("route") or "agent pipeline did not produce a video"
            )
            return

        video_jobs[job_id]["status"] = "completed"
        video_jobs[job_id]["progress"] = 100.0
        video_jobs[job_id]["video_url"] = video_url
        video_jobs[job_id]["subtitles_url"] = result.get("subtitles_url")
        video_jobs[job_id]["route"] = result.get("route")
        _remember(concept, language, video_jobs[job_id])
    except Exception as e:  # pragma: no cover
        logger.exception("Agent pipeline failed")
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error_message"] = str(e)


# --- Routes ----------------------------------------------------------------

@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
):
    """Kick off a Remotion-based educational video render.

    If the exact topic+language has been rendered before and the mp4 still
    exists on the Remotion service, the cached video is returned synthesized
    as an already-completed job — no re-render, near-instant response.
    """
    job_id = str(uuid.uuid4())

    # ---- Cache fast path --------------------------------------------------
    key = _cache_key(request.concept, request.language)
    with _cache_lock:
        entry = _video_cache.get(key)
    if entry and await _cache_entry_is_valid(entry):
        logger.info("video cache HIT: %s → %s", key, entry["video_url"])
        video_jobs[job_id] = {
            "status": "completed",
            "progress": 100.0,
            "concept": request.concept,
            "language": request.language,
            "video_url": entry["video_url"],
            "subtitles_url": entry.get("subtitles_url"),
            "cached": True,
        }
        return VideoGenerationResponse(
            job_id=job_id,
            status="completed",
            video_url=entry["video_url"],
            subtitles_url=entry.get("subtitles_url"),
            estimated_time=0,
        )

    # Cache miss (or stale entry) — drop stale key and render fresh
    if entry:
        logger.info("video cache STALE: %s — refreshing", key)
        with _cache_lock:
            _video_cache.pop(key, None)
            _save_cache()
    else:
        logger.info("video cache MISS: %s", key)

    video_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "concept": request.concept,
        "language": request.language,
    }

    runner = _start_agent_job if request.use_agents else _start_remotion_job
    task = asyncio.create_task(
        runner(
            job_id,
            request.concept,
            request.explanation,
            request.language,
        )
    )
    video_tasks[job_id] = task
    task.add_done_callback(lambda _: video_tasks.pop(job_id, None))

    return VideoGenerationResponse(
        job_id=job_id,
        status="pending",
        estimated_time=45,
    )


@router.get("/status/{job_id}", response_model=VideoStatusResponse)
async def get_video_status(job_id: str):
    if job_id not in video_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = video_jobs[job_id]
    return VideoStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0),
        video_url=job.get("video_url"),
        subtitles_url=job.get("subtitles_url"),
        error_message=job.get("error_message"),
    )


@router.get("/stream/{job_id}")
async def stream_video(job_id: str):
    job = video_jobs.get(job_id)
    url = job.get("video_url") if job else None
    if not url:
        raise HTTPException(status_code=404, detail="Video not ready")
    return {"stream_url": url}


@router.post("/analyze-drawing", response_model=DrawingAnalysisResponse)
async def analyze_drawing(request: DrawingAnalysisRequest):
    """Analyze a drawing/image using Gemini AI and return an analysis."""
    try:
        from app.services.gemini import gemini_service

        result = await gemini_service.analyze_image(request.image_data, request.question)
        analysis = result.get("analysis", "")

        if (
            analysis.startswith("Error:")
            or analysis.startswith("\u26a0\ufe0f")
            or result.get("problem_type") == "error"
        ):
            return DrawingAnalysisResponse(
                analysis=analysis,
                solution=None,
                steps=[],
                video_job_id=None,
            )

        return DrawingAnalysisResponse(
            analysis=result.get("analysis", "Analysis complete!"),
            solution=result.get("solution"),
            steps=result.get("steps", []),
            video_job_id=None,
        )
    except Exception as e:
        return DrawingAnalysisResponse(
            analysis=(
                "\u26a0\ufe0f **Analysis Error**\n\n"
                f"Could not analyze the drawing: {e}\n\n"
                "Try drawing a clearer shape or check your connection."
            ),
            solution=None,
            steps=[],
            video_job_id=None,
        )


@router.post("/solve-math")
async def solve_math(problem: str):
    """Solve a math problem using Gemini AI."""
    from app.services.gemini import gemini_service

    return await gemini_service.solve_math_problem(problem)
