from fastapi import APIRouter, Request, Response
from app.config import settings
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
import httpx

router = APIRouter()

# YouTube search URL base
YOUTUBE_SEARCH = "https://www.youtube.com/results?search_query="

# Popular educational channels for better results
EDU_CHANNELS = [
    "Khan Academy",
    "Crash Course",
    "TED-Ed",
    "Veritasium",
    "Kurzgesagt",
    "MinutePhysics",
    "3Blue1Brown"
]

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Handle incoming Telegram messages"""
    data = await request.json()
    
    # Extract message
    if "message" not in data:
        return {"ok": True}
    
    message = data["message"]
    chat_id = message["chat"]["id"]
    user_message = message.get("text", "")
    bot_token = settings.TELEGRAM_BOT_TOKEN
    
    # Check if user wants video links explicitly
    msg_lower = user_message.lower()
    wants_video = any(kw in msg_lower for kw in ["video", "watch", "show me", "/video"])

    # Handle greetings
    if any(word in msg_lower for word in ["hello", "hi", "namaste", "start", "/start", "/help"]):
        response_text = """🙏 Namaste! Welcome to Gyan_Intent Bot!

I'm your AI learning assistant. I can explain any topic!

📖 Just ask me anything:
• explain quantum physics
• what is photosynthesis?
• teach me calculus

🎬 Want video links? Just say "video":
• video photosynthesis
• show me how black holes work

Ask away! 🚀"""

    elif wants_video:
        # VIDEO MODE: find YouTube links
        topic = msg_lower.replace("video", "").replace("watch", "").replace("show me", "").replace("/video", "").strip()
        if not topic:
            response_text = "� Please tell me the topic! Example: *video photosynthesis*"
        else:
            try:
                llm = ChatOpenAI(
                    model="gpt-4o-mini",
                    api_key=settings.OPENAI_API_KEY,
                    temperature=0.3,
                )

                prompt = f"""The user wants a YouTube video about: "{topic}"

Generate a YouTube search URL for this topic.
Rules:
1. Create URL: https://www.youtube.com/results?search_query=TOPIC+educational
2. Replace spaces with +
3. Give a brief 1-line description of what they'll learn

Response format (JSON only):
{{"topic": "...", "search_url": "https://www.youtube.com/results?search_query=...", "description": "..."}}"""

                result = await llm.ainvoke([HumanMessage(content=prompt)])

                import json
                try:
                    content = result.content
                    if '{' in content:
                        json_str = content[content.find('{'):content.rfind('}')+1]
                    else:
                        json_str = content
                    video_data = json.loads(json_str.replace("{{", "{").replace("}}", "}"))

                    response_text = f"""🎬 Found videos for: {video_data.get('topic', topic)}

{video_data.get('description', 'Learn about this topic!')}

🔗 Watch here:
{video_data.get('search_url', YOUTUBE_SEARCH + topic.replace(' ', '+') + '+educational')}

📚 Want another topic? Just ask!"""
                except:
                    search_url = YOUTUBE_SEARCH + topic.replace(" ", "+") + "+educational"
                    response_text = f"""🎬 Videos for: {topic}

🔗 Watch here:
{search_url}

📚 Want another topic? Just ask!"""

            except Exception as e:
                search_url = YOUTUBE_SEARCH + topic.replace(" ", "+") + "+educational"
                response_text = f"""🎬 Videos for: {topic}

🔗 {search_url}

📚 Ask me about any topic!"""

    else:
        # EXPLAIN MODE: just explain the topic, no video links
        try:
            llm = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.OPENAI_API_KEY,
                temperature=0.5,
            )

            prompt = f"""You are Gyan_Intent, a friendly and knowledgeable educational assistant on Telegram.
The student asked: "{user_message}"

Explain the topic clearly and concisely. Use simple language suitable for students.
Keep your response under 300 words. Use bullet points or numbered steps where helpful.
Do NOT include any video links or YouTube URLs.
If the topic is unclear, ask the student to clarify.
End with a brief encouraging note."""

            result = await llm.ainvoke([HumanMessage(content=prompt)])
            response_text = result.content

        except Exception as e:
            response_text = f"""📖 I'd love to explain that, but I'm having a small issue right now.

Try again in a moment, or say "video {user_message}" to find videos on this topic!"""
    
    # Send response via Telegram API
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": response_text}
        )
    
    return {"ok": True}

@router.get("/status")
async def telegram_status():
    """Check Telegram bot status"""
    return {
        "status": "active",
        "platform": "telegram",
        "features": [
            "AI topic explanations",
            "YouTube video links (on request)",
            "Educational Q&A",
        ]
    }
