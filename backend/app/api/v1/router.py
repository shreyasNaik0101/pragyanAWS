"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    classroom,
    health,
    intent,
    mindmap,
    quiz,
    telegram,
    transcript,
    video,
    whatsapp,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(intent.router, prefix="/intent", tags=["Intent Engine"])
api_router.include_router(video.router, prefix="/video", tags=["Video Factory"])
api_router.include_router(mindmap.router, prefix="/mindmap", tags=["Mindmap"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["Quiz / MCQ"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp Bot"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["Telegram Bot"])
api_router.include_router(classroom.router, prefix="/classroom", tags=["Google Classroom"])
api_router.include_router(transcript.router, prefix="/transcript", tags=["YouTube Transcript"])
