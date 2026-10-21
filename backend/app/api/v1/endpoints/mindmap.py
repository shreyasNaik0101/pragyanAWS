"""Mind-map generator — LLM writes a Mermaid `mindmap` for a topic, the
Kroki service renders it to PNG, we cache it on disk and return the URL.

This is intentionally small: no job queue, no polling. Rendering a mindmap
takes ~1-3 seconds end-to-end so we block until done and return the image
URL directly.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# This file lives at  backend/app/api/v1/endpoints/mindmap.py
# The static mount in main.py serves  backend/media  (relative to backend/).
# parents[0]=endpoints 1=v1 2=api 3=app 4=backend → media lives at parents[4].
MEDIA_DIR = Path(__file__).resolve().parents[4] / "media"
MINDMAP_DIR = MEDIA_DIR / "mindmaps"
MINDMAP_DIR.mkdir(parents=True, exist_ok=True)

KROKI_URL = os.getenv("KROKI_URL", "https://kroki.io")
PUBLIC_BASE_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")

# Keep the mindmap LLM on the cheapest capable model — the output is short
# structured text, we don't need the big one.
_llm = ChatOpenAI(
    model=os.getenv("MINDMAP_MODEL", "gpt-4o-mini"),
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)


SYSTEM_PROMPT = """You are a Mermaid mindmap author. Given a single topic,
output ONLY the body of a Mermaid `mindmap` diagram (no backticks, no prose,
no explanation).

Rules:
- Start the output with the literal line `mindmap` and nothing before it.
- Use a single root node like `  root((Topic))` — double parentheses make it
  a circular root.
- Produce 4-6 first-level branches, each with 2-4 sub-branches (depth 2-3).
- Keep every node label SHORT (max 4 words).
- Indent children with 2 extra spaces than their parent.
- Use plain ASCII in labels when possible; avoid colons and parentheses in
  labels except for the root.
- If the user asks in a non-English language, write labels in that language.

Example for the topic "Photosynthesis":

mindmap
  root((Photosynthesis))
    Inputs
      Sunlight
      Water
      CO2
    Process
      Light reactions
        Thylakoid
        Chlorophyll
      Calvin cycle
    Outputs
      Glucose
      Oxygen
    Location
      Chloroplast
      Leaf cells
    Importance
      Food chain
      Oxygen cycle
"""


class MindmapRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=120)
    language: str = Field(default="english")


class MindmapResponse(BaseModel):
    image_url: str
    mermaid: str
    topic: str


def _extract_mermaid(raw: str) -> str:
    """Best-effort cleaner — strip ``` fences, stray prose before `mindmap`."""
    text = raw.strip()
    # Drop ``` fences if the LLM added them despite instructions.
    text = re.sub(r"^```(?:mermaid|text)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*$", "", text)
    # Ensure the diagram starts with `mindmap`.
    idx = text.lower().find("mindmap")
    if idx > 0:
        text = text[idx:]
    return text.strip()


async def _render_via_kroki(mermaid_text: str) -> bytes:
    """POST the mermaid source to Kroki and return PNG bytes."""
    url = f"{KROKI_URL.rstrip('/')}/mermaid/png"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            url,
            content=mermaid_text.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
        )
    if r.status_code >= 400:
        logger.error("Kroki render failed: %s %s", r.status_code, r.text[:500])
        raise HTTPException(
            status_code=502,
            detail=f"Mindmap renderer returned {r.status_code}",
        )
    return r.content


@router.post("/generate", response_model=MindmapResponse)
async def generate_mindmap(req: MindmapRequest) -> MindmapResponse:
    """Generate a mindmap PNG for `topic` and return a public URL."""
    logger.info("mindmap generation requested: topic=%s lang=%s", req.topic, req.language)

    user_prompt = (
        f"Topic: {req.topic}\n"
        f"Language for labels: {req.language}\n"
        f"Produce the Mermaid mindmap now."
    )

    # 1. LLM writes the Mermaid source
    try:
        ai_msg = await _llm.ainvoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
    except Exception as exc:
        logger.exception("LLM call failed for mindmap")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    mermaid_text = _extract_mermaid(str(ai_msg.content))
    if not mermaid_text.lower().startswith("mindmap"):
        logger.error("LLM returned non-mindmap output: %r", mermaid_text[:200])
        raise HTTPException(status_code=502, detail="LLM did not produce a mindmap")

    # 2. Kroki renders to PNG
    png_bytes = await _render_via_kroki(mermaid_text)

    # 3. Save to disk + build the public URL
    filename = f"{uuid.uuid4()}.png"
    out_path = MINDMAP_DIR / filename
    out_path.write_bytes(png_bytes)

    image_url = f"{PUBLIC_BASE_URL.rstrip('/')}/media/mindmaps/{filename}"
    logger.info("mindmap saved: %s (%d bytes)", image_url, len(png_bytes))

    return MindmapResponse(image_url=image_url, mermaid=mermaid_text, topic=req.topic)
