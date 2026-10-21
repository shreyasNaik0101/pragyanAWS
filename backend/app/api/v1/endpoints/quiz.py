"""Quiz / MCQ endpoint — generates a 4-option multiple-choice question in the
requested language. Used by the WhatsApp bot to send a native WhatsApp Poll."""

import json
import re
import time
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings

router = APIRouter()

llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.4,
)


class QuizRequest(BaseModel):
    topic: str
    language: str = "english"
    difficulty: Optional[str] = "medium"  # easy | medium | hard


class QuizResponse(BaseModel):
    question: str
    options: List[str]       # exactly 4
    correct_index: int       # 0..3
    correct_letter: str      # "A" | "B" | "C" | "D"
    explanation: str
    language: str
    topic: str


_LANG_INSTRUCTION = {
    "english": "Write the question, options, and explanation in simple English.",
    "hinglish": "Write the question, options, and explanation in Hinglish (Roman Hindi + English words, friendly and conversational).",
    "hindi": "Write the question, options, and explanation in Hindi using Devanagari script.",
    "marathi": "Write the question, options, and explanation in Marathi using Devanagari script.",
    "kannada": "Write the question, options, and explanation in Kannada script.",
}


def _strip_fences(raw: str) -> str:
    """Remove ```json ... ``` fences if the model wraps the response."""
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw.strip())
    return m.group(1) if m else raw.strip()


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    """Generate a single 4-option MCQ on the given topic in the given language."""
    topic = (req.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")

    lang = (req.language or "english").strip().lower()
    lang_rule = _LANG_INSTRUCTION.get(lang, _LANG_INSTRUCTION["english"])
    difficulty = (req.difficulty or "medium").strip().lower()

    system = (
        "You are an educational quiz master. Output EXACTLY one JSON object "
        "with these keys: question (string), options (array of EXACTLY 4 short "
        "strings, each <= 80 characters), correct_index (integer 0..3), "
        "explanation (string, 1-2 sentences explaining WHY the correct option "
        "is right). Keep everything short and WhatsApp-poll friendly. "
        "Do NOT include letters A/B/C/D inside the options — the client will "
        "prefix them. No markdown, no code fences — JSON only."
    )

    user_prompt = (
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n"
        f"Language: {lang}. {lang_rule}\n\n"
        "Generate one clean, unambiguous multiple-choice question with exactly "
        "one correct answer and three plausible distractors. Keep the question "
        "under 180 characters. Each option must fit on a WhatsApp poll row "
        "(under 80 characters each)."
    )

    start = time.time()
    try:
        response = await llm.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=user_prompt),
        ])
        raw = response.content if isinstance(response.content, str) else str(response.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")

    try:
        data = json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned non-JSON output")

    # --- Validate & normalise ------------------------------------------------
    question = str(data.get("question", "")).strip()
    options = data.get("options") or []
    if not isinstance(options, list):
        raise HTTPException(status_code=502, detail="options must be a list")

    # Coerce to strings and strip any stray "A) " / "1. " prefixes the LLM
    # sometimes injects despite the instruction.
    cleaned: List[str] = []
    for opt in options[:4]:
        s = str(opt).strip()
        s = re.sub(r"^[A-Da-d][\.\):\-\s]+", "", s)
        s = re.sub(r"^[1-4][\.\):\-\s]+", "", s)
        s = s.strip()
        if s:
            cleaned.append(s[:90])

    if len(cleaned) != 4:
        raise HTTPException(status_code=502, detail=f"Need exactly 4 options, got {len(cleaned)}")

    try:
        correct_index = int(data.get("correct_index", 0))
    except (TypeError, ValueError):
        correct_index = 0
    if not 0 <= correct_index <= 3:
        correct_index = 0

    explanation = str(data.get("explanation", "")).strip()
    elapsed = time.time() - start

    return QuizResponse(
        question=question,
        options=cleaned,
        correct_index=correct_index,
        correct_letter="ABCD"[correct_index],
        explanation=explanation,
        language=lang,
        topic=topic,
    )
