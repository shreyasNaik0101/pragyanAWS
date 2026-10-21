"""Intent Engine endpoints."""

import time
import base64
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.config import settings

router = APIRouter()

# Initialize LLM (gpt-4o-mini: fast, cheap, great quality)
llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3,
)


class IntentRequest(BaseModel):
    """Intent analysis request."""
    modality: str  # visual, voice, text
    content: Optional[str] = None
    query: Optional[str] = None  # alias used by WhatsApp bot
    language: str = "hinglish"
    image: Optional[str] = None  # Base64 encoded image

    @property
    def text(self) -> Optional[str]:
        """Return content or query, whichever is set."""
        return self.content or self.query


class IntentResponse(BaseModel):
    """Intent analysis response."""
    id: str
    category: str
    explanation: str
    confidence: float
    processing_time: float
    video_url: Optional[str] = None


@router.post("/analyze", response_model=IntentResponse)
async def analyze_intent(request: IntentRequest):
    """
    Analyze user intent and provide explanation.
    
    - **modality**: Input type (visual/voice/text)
    - **content**: The query or content to analyze
    - **language**: Target language (hinglish/hindi/english)
    - **image**: Base64 encoded image (for visual modality)
    """
    start_time = time.time()
    
    language_instruction = {
        "hinglish": "Respond in Hinglish (Roman Hindi + English mix) - friendly and conversational.",
        "hindi": "Respond in Hindi using Devanagari script.",
        "english": "Respond in simple, clear English.",
        "kannada": "Respond in Kannada.",
    }.get(request.language, "Respond in Hinglish.")

    if request.modality == "visual" and request.image:
        # Real vision OCR + Q&A via gpt-4o-mini's native image support.
        # The WhatsApp bot sends a base64 photo (see MessageHandler.ts
        # → ContentGenerator.solveImage). We instruct the model to:
        #   1. OCR any text/equations/handwriting in the image
        #   2. Answer the user's caption question (if any) using the image
        #   3. Briefly teach the underlying concept
        # This replaces the old hardcoded "Main samajh gaya!" placeholder
        # that ignored the image entirely.
        user_question = (request.text or "").strip()
        if user_question:
            answer_step = (
                f'The student also asked: "{user_question}". Answer THAT '
                "specifically using what you see in the image."
            )
        else:
            answer_step = (
                "If the image shows a question/problem, solve it step by "
                "step. If it's a diagram or concept, explain it clearly."
            )
        prompt_text = (
            "You are an educational AI tutor analyzing a photo a student sent.\n\n"
            f"{language_instruction}\n\n"
            "Step 1 — OCR: Carefully READ all text, equations, diagrams, or "
            "handwriting visible in the image. If the image contains a question "
            "or problem, transcribe it.\n\n"
            f"Step 2 — Answer: {answer_step}\n\n"
            "Step 3 — Teach: Briefly explain the underlying concept so the "
            "student learns *why*, not just the answer.\n\n"
            "Keep the reply under 200 words. Use line breaks for readability. "
            "Be warm and encouraging."
        )

        # gpt-4o-mini accepts images via the OpenAI vision content schema.
        content_blocks = [
            {"type": "text", "text": prompt_text},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{request.image}"},
            },
        ]
        try:
            response = await llm.ainvoke([HumanMessage(content=content_blocks)])
            explanation = response.content
        except Exception as e:
            # Fall back to Gemini if OpenAI vision fails (rate-limit, network, etc.)
            try:
                from app.services.gemini import gemini_service
                result = await gemini_service.analyze_image(
                    request.image,
                    user_question or "Read everything in this image and answer or explain it.",
                )
                explanation = (
                    result.get("analysis")
                    or "Image analyze nahi ho paya. Please try again!"
                )
            except Exception:
                explanation = (
                    f"⚠️ Image analysis failed: {e}. Please try again in a moment."
                )
    else:
        # Text-based analysis
        prompt = f"""
        You are an educational AI helping students learn.
        
        {language_instruction}
        
        Student's query: {request.text or 'Explain the drawing'}
        
        Provide a clear, engaging explanation. Use examples and analogies.
        If it's a problem, solve it step by step.
        """
        
        try:
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            explanation = response.content
        except Exception as e:
            explanation = f"Main samajh gaya! Tumhara sawaal interesting hai. Let me think about it..."
    
    processing_time = time.time() - start_time
    
    return IntentResponse(
        id=f"intent_{int(time.time() * 1000)}",
        category="educational",
        explanation=explanation,
        confidence=0.92,
        processing_time=processing_time,
    )


@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    language: str = Form("hinglish"),
    query: Optional[str] = Form(None),
):
    """Analyze uploaded image for visual intent."""
    # TODO: Implement image analysis
    
    return {
        "category": "visual",
        "explanation": "Image analyzed successfully",
        "detected_objects": [],
    }


@router.post("/route")
async def route_intent(request: IntentRequest):
    """Route intent to appropriate agent team without full processing."""
    # TODO: Implement supervisor routing logic
    
    return {
        "team": "math_team",
        "reasoning": "Detected mathematical expression",
        "estimated_time": 30,
    }
