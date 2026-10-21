"""Generate Gyan_Intent hackathon pitch PDF matching the purple-triangle template.

Addresses three judge objections head-on:
  1. Problem statement is crisp — 60s DOUBT-RESOLVER, not a full-course replacement
     (YouTube playlists handle the "full concept" learning).
  2. WHAT/WHY is sharp — defines the gap between Google/YouTube and a 1:1 tutor.
  3. NOT kids-only — explicitly targets competitive-exam aspirants, college students,
     working professionals, corporate L&D, and teachers themselves.
"""

from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT_PATH = "/Users/coder.op/Gyan_Pragyan_Pitch.pdf"

PAGE_W, PAGE_H = landscape(A4)  # 842 x 595 pts approx
PURPLE = HexColor("#5B2C9F")
PURPLE_DARK = HexColor("#3E1B6F")
PURPLE_LIGHT = HexColor("#F3EEFA")
GRAY_LIGHT = HexColor("#E8E6EE")
GRAY_TRI = HexColor("#D8D4E0")
TEXT = HexColor("#1A1A2E")
ACCENT = HexColor("#7A3FC5")


# ---------- helpers ----------------------------------------------------------

def draw_background(c, page_num, total_pages):
    """Purple sidebar + soft triangle watermarks + page number."""
    # left purple bar
    c.setFillColor(PURPLE)
    c.rect(0, 0, 18, PAGE_H, fill=1, stroke=0)

    # faint triangles (right side watermark)
    c.setFillColor(GRAY_TRI)
    # big triangle
    p = c.beginPath()
    p.moveTo(PAGE_W - 180, PAGE_H - 60)
    p.lineTo(PAGE_W - 60, PAGE_H - 60)
    p.lineTo(PAGE_W - 120, PAGE_H - 180)
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    c.setFillColor(HexColor("#EEEAF4"))
    p2 = c.beginPath()
    p2.moveTo(PAGE_W - 260, PAGE_H - 120)
    p2.lineTo(PAGE_W - 180, PAGE_H - 120)
    p2.lineTo(PAGE_W - 220, PAGE_H - 200)
    p2.close()
    c.drawPath(p2, fill=1, stroke=0)

    # bottom triangles
    c.setFillColor(HexColor("#EDE9F4"))
    p3 = c.beginPath()
    p3.moveTo(60, 40)
    p3.lineTo(160, 40)
    p3.lineTo(110, 130)
    p3.close()
    c.drawPath(p3, fill=1, stroke=0)

    c.setFillColor(HexColor("#F1EDF7"))
    p4 = c.beginPath()
    p4.moveTo(PAGE_W - 150, 30)
    p4.lineTo(PAGE_W - 40, 30)
    p4.lineTo(PAGE_W - 95, 110)
    p4.close()
    c.drawPath(p4, fill=1, stroke=0)

    # page number
    c.setFillColor(HexColor("#777777"))
    c.setFont("Helvetica", 11)
    c.drawRightString(PAGE_W - 40, 28, f"{page_num:02d}")

    # subtle footer brand
    c.setFillColor(HexColor("#999999"))
    c.setFont("Helvetica", 8)
    c.drawString(50, 28, "Gyan_Intent  ·  From Gesture to Genius")


def draw_title(c, title):
    c.setFillColor(PURPLE)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(60, PAGE_H - 80, title)
    # underline
    c.setStrokeColor(HexColor("#111111"))
    c.setLineWidth(1.2)
    tw = c.stringWidth(title, "Helvetica-Bold", 26)
    c.line(60, PAGE_H - 88, 60 + tw + 20, PAGE_H - 88)


def draw_bullets(c, bullets, x=70, y_start=None, line_h=22, max_w=680,
                 font="Helvetica", size=13, bullet_char="○"):
    if y_start is None:
        y_start = PAGE_H - 130
    c.setFillColor(TEXT)
    y = y_start
    for b in bullets:
        # bullet char
        c.setFont("Helvetica", size)
        c.setFillColor(PURPLE)
        c.drawString(x, y, bullet_char)
        # wrapped text
        c.setFillColor(TEXT)
        c.setFont(font, size)
        lines = wrap_text(b, max_w - 20, font, size)
        for i, ln in enumerate(lines):
            c.drawString(x + 18, y - (i * (line_h - 4)), ln)
        y -= line_h + (len(lines) - 1) * (line_h - 4)


def wrap_text(text, max_w, font, size):
    """Very simple word-wrap using pdfmetrics stringWidth."""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_key_box(c, label, value, x, y, w=200, h=70, accent=PURPLE):
    """Draw a rounded stat/key box."""
    c.setFillColor(PURPLE_LIGHT)
    c.setStrokeColor(accent)
    c.setLineWidth(1.0)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x + 12, y + h - 24, label)
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 10)
    for i, ln in enumerate(wrap_text(value, w - 24, "Helvetica", 10)):
        c.drawString(x + 12, y + h - 42 - i * 12, ln)


def draw_pill(c, text, x, y, color=PURPLE):
    c.setFont("Helvetica-Bold", 10)
    from reportlab.pdfbase.pdfmetrics import stringWidth
    tw = stringWidth(text, "Helvetica-Bold", 10)
    c.setFillColor(color)
    c.roundRect(x, y - 4, tw + 20, 20, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.drawString(x + 10, y + 2, text)
    return x + tw + 26


# ---------- slide builders ---------------------------------------------------

def slide_cover(c):
    c.setFillColor(PURPLE_DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # triangles
    c.setFillColor(HexColor("#7A3FC5"))
    p = c.beginPath()
    p.moveTo(PAGE_W - 240, PAGE_H)
    p.lineTo(PAGE_W, PAGE_H)
    p.lineTo(PAGE_W, PAGE_H - 240)
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    c.setFillColor(HexColor("#4A2285"))
    p2 = c.beginPath()
    p2.moveTo(0, 0)
    p2.lineTo(300, 0)
    p2.lineTo(0, 300)
    p2.close()
    c.drawPath(p2, fill=1, stroke=0)

    # title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 56)
    c.drawString(70, PAGE_H / 2 + 50, "GYAN_INTENT")
    c.setFont("Helvetica-Oblique", 22)
    c.setFillColor(HexColor("#E4D9F5"))
    c.drawString(70, PAGE_H / 2 + 20, "From Gesture to Genius")

    # one-liner
    c.setFillColor(white)
    c.setFont("Helvetica", 16)
    c.drawString(70, PAGE_H / 2 - 30,
                 "The 60-second Doubt-Resolver on WhatsApp — in your language.")

    # subtitle
    c.setFillColor(HexColor("#CBB8E8"))
    c.setFont("Helvetica", 13)
    c.drawString(70, PAGE_H / 2 - 60,
                 "Hackathon Pitch  ·  Generative EdTech  ·  Multilingual · Accessibility-first")

    c.setFillColor(HexColor("#9B7CC4"))
    c.setFont("Helvetica", 11)
    c.drawString(70, 60, "Team Gyan_Intent")
    c.drawRightString(PAGE_W - 70, 60, "2026")
    c.showPage()


def slide_problem(c):
    draw_background(c, 2, 9)
    draw_title(c, "PROBLEM STATEMENT")

    # theme pill
    c.setFillColor(HexColor("#666666"))
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(60, PAGE_H - 108,
                 "Theme:  AI / Education Technology  ·  Accessible, Multilingual, Generative")

    bullets = [
        "Students get STUCK on specific doubts at 11 PM the night before an exam — and there is "
        "no fast, visual, vernacular way to unblock them.",
        "Existing options all fail for doubt-resolution:  YouTube lectures are 30+ min & generic  ·  "
        "ChatGPT gives text-only walls  ·  Coaching centre TAs reply next day  ·  1:1 tutors cost ₹500+/hr.",
        "The 'full concept' problem is already solved — YouTube + NPTEL + Khan Academy teach concepts "
        "end-to-end. What is UNSOLVED is the 60-second, per-doubt micro-explainer.",
        "India scale:  260M+ learners across school, competitive-exam, college and professional "
        "upskilling  ·  70%+ think in vernacular  ·  95%+ have WhatsApp, <30% own a laptop.",
    ]
    draw_bullets(c, bullets, y_start=PAGE_H - 140, line_h=26, max_w=720, size=13)

    # bottom highlight box — the one-line problem statement the judge asked for
    y = 110
    c.setFillColor(PURPLE_LIGHT)
    c.setStrokeColor(PURPLE)
    c.setLineWidth(1.5)
    c.roundRect(60, y, PAGE_W - 160, 60, 10, fill=1, stroke=1)
    c.setFillColor(PURPLE_DARK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(78, y + 40, "Problem Statement (one line):")
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 12)
    c.drawString(78, y + 20,
                 "Learners cannot get a 60-second, animated, vernacular explanation for a "
                 "specific doubt — instantly, on the device they already use.")
    c.showPage()


def slide_solution(c):
    draw_background(c, 3, 9)
    draw_title(c, "PROPOSED IDEA / SOLUTION")

    # lead one-liner
    c.setFillColor(PURPLE_DARK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(60, PAGE_H - 115,
                 "Gyan_Intent = Generative EdTech Doubt-Resolver on WhatsApp.")

    bullets = [
        "Overview:  Ask any doubt (text / voice / photo / gesture) on WhatsApp or web → our multi-agent "
        "AI generates a CUSTOM 60-90 sec animated video in your language → delivered as MP4 in <2 min.",
        "Key innovation:  GENERATIVE, not retrieval — every video is freshly rendered by AI for the exact "
        "doubt, in the exact language. No pre-recorded library. No 'search YouTube and hope'.",
        "For full-concept learning:  we append a curated YouTube / NPTEL playlist link alongside the "
        "micro-explainer. Gyan_Intent is the LAST MILE of learning, not a replacement for foundational courses.",
        "Accessibility-first:  gesture control (MediaPipe hand tracking) for motor-impaired learners, "
        "voice input for low-literacy users, vernacular for non-English speakers.",
        "Zero-friction delivery:  works inside WhatsApp — no app download, no signup, runs on a ₹5,000 phone.",
    ]
    draw_bullets(c, bullets, y_start=PAGE_H - 145, line_h=25, max_w=720, size=12)

    # feature chips row
    y = 100
    c.setFillColor(PURPLE_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y + 30, "Built-in inputs:")
    x = 165
    for chip in ["Text", "Voice (Indic)", "Photo", "Air-gesture"]:
        x = draw_pill(c, chip, x, y + 28) + 6
    c.showPage()


def slide_methodology(c):
    draw_background(c, 4, 9)
    draw_title(c, "METHODOLOGY USED")

    c.setFillColor(HexColor("#555555"))
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(60, PAGE_H - 108,
                 "Step-by-step pipeline — from user intent to delivered video.")

    steps = [
        ("1", "Intent Capture",
         "WhatsApp bot / web dashboard receives text, voice, image, or air-drawn gesture."),
        ("2", "Intent Router",
         "LangGraph Supervisor classifies the doubt → Math / Concept / Visual / Code / Biography."),
        ("3", "Specialist Agent Team",
         "Script agent writes a vernacular 60-90 sec script with scene-by-scene beats."),
        ("4", "Remotion Renderer",
         "React-based video compositor turns the script into 1280×720 animated MP4 at 24 fps."),
        ("5", "Sarvam AI TTS",
         "Generates Hinglish / Hindi / Marathi / Kannada voice-over, synced frame-accurate."),
        ("6", "Delivery",
         "Video compressed to <10 MB and sent back to WhatsApp + YouTube playlist for the full topic."),
    ]

    # render as two columns of step cards
    col_w = 340
    row_h = 70
    x0, x1 = 60, 60 + col_w + 30
    y0 = PAGE_H - 150
    for i, (num, title, body) in enumerate(steps):
        col = i % 2
        row = i // 2
        x = x0 if col == 0 else x1
        y = y0 - row * (row_h + 12)
        # number circle
        c.setFillColor(PURPLE)
        c.circle(x + 18, y - 22, 16, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(x + 18, y - 27, num)
        # title
        c.setFillColor(PURPLE_DARK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x + 44, y - 15, title)
        # body
        c.setFillColor(TEXT)
        c.setFont("Helvetica", 10)
        for j, ln in enumerate(wrap_text(body, col_w - 50, "Helvetica", 10)):
            c.drawString(x + 44, y - 30 - j * 12, ln)
    c.showPage()


def slide_stack(c):
    draw_background(c, 5, 9)
    draw_title(c, "TECHNOLOGY STACK")

    sections = [
        ("Languages",          ["Python 3.11", "TypeScript 5", "React 19 / TSX"]),
        ("Frameworks / libs",  ["FastAPI", "Next.js 15", "LangGraph + LangChain",
                                "Remotion (video)", "whatsapp-web.js", "MediaPipe Hands"]),
        ("AI & models",        ["OpenAI GPT-4o", "Sarvam AI (Indic LLM + TTS)",
                                "Google Gemini 1.5 (vision)", "HuggingFace LLaVA (fallback)"]),
        ("Infra / platforms",  ["Docker Compose", "Redis 7", "AWS EC2 (prod)",
                                "Vercel (frontend)", "FFmpeg", "Chromium (Remotion render)"]),
        ("Hardware / IoT",     ["No special hardware required", "Any Android / iOS phone w/ WhatsApp",
                                "Webcam for gesture mode (optional)"]),
    ]

    y = PAGE_H - 140
    for label, items in sections:
        c.setFillColor(PURPLE_DARK)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(60, y, label + ":")
        x = 240
        for it in items:
            x = draw_pill(c, it, x, y - 2, color=PURPLE) + 6
            if x > PAGE_W - 120:
                y -= 24
                x = 240
        y -= 36
    c.showPage()


def slide_prototype(c):
    draw_background(c, 6, 9)
    draw_title(c, "EXPECTED OUTCOME / PROTOTYPE PLAN")

    bullets = [
        "Working prototype built during the hackathon:  Next.js web dashboard  +  FastAPI backend  +  "
        "Remotion video service  +  WhatsApp bot — all live and integrated.",
        "Generative video in 4 languages (English, Hindi, Marathi, Kannada) with 15+ built-in concept "
        "templates + a generic LLM-driven renderer for any topic.",
        "Gesture-controlled quiz demo (MediaPipe thumb up/down) — showcases accessibility for "
        "motor-impaired learners.",
        "Live demo script:  'Generate a 60-sec video on Chhatrapati Shivaji Maharaj's timeline' → rendered "
        "MP4 delivered to WhatsApp in ~90 seconds, with the right historical icons (fort, sword, scroll).",
    ]
    draw_bullets(c, bullets, y_start=PAGE_H - 135, line_h=24, max_w=720, size=12)

    # deliverables grid
    y = 175
    c.setFillColor(PURPLE_DARK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(60, y + 30, "Deliverables:")

    boxes = [
        ("Web App",      "Next.js dashboard with chat, quiz, docs, gesture drawing"),
        ("WhatsApp Bot", "QR-scan link; 4-language flow; video + playlist delivery"),
        ("Video Engine", "Remotion + LangGraph; 60-90 s MP4 in <2 min"),
        ("Demo Script",  "Shivaji timeline + Calculus + Photosynthesis prepared"),
    ]
    for i, (label, body) in enumerate(boxes):
        x = 60 + (i % 4) * 185
        draw_key_box(c, label, body, x, y - 55, w=170, h=70)
    c.showPage()


def slide_future(c):
    draw_background(c, 7, 9)
    draw_title(c, "FUTURE SCOPE")

    # address "kids only?" head-on
    c.setFillColor(PURPLE_LIGHT)
    c.setStrokeColor(PURPLE)
    c.setLineWidth(1.2)
    c.roundRect(60, PAGE_H - 165, PAGE_W - 160, 38, 8, fill=1, stroke=1)
    c.setFillColor(PURPLE_DARK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(76, PAGE_H - 142, "NOT kids-only.  Gyan_Intent targets every learner who has doubts:")
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 11)
    c.drawString(76, PAGE_H - 158,
                 "K-12  ·  Competitive-exam aspirants (JEE / NEET / UPSC / GATE)  ·  "
                 "College & uni  ·  Working professionals  ·  Corporate L&D  ·  Teachers themselves.")

    bullets = [
        "Vertical expansion:  from school & coaching (now)  →  college & competitive exams (Q2)  →  "
        "professional upskilling like coding, finance, law (Q3)  →  corporate L&D / compliance training (Q4).",
        "Scale to users:  22 Indian constitutional languages  +  South-East Asian languages (Bahasa, Thai, Sinhala)  "
        "for the same doubt-resolution gap in non-English markets.",
        "Advanced tech integration:  AR/VR micro-lessons (WebXR), on-device LLMs for offline rural use, "
        "RCS messaging when India rolls it out, voice-only IVR channel for feature-phone users.",
        "Real-world deployment paths:  B2C subscription inside WhatsApp  ·  B2B API licensing to existing "
        "EdTechs (Unacademy, PW, Vedantu)  ·  B2G contracts with state education boards  ·  "
        "enterprise LMS plug-in for corporate training.",
        "Long-term impact:  a generative 'doubt layer' that sits on top of ALL existing learning content — "
        "making every YouTube video, textbook, and LMS course instantly interrogable in any language.",
    ]
    draw_bullets(c, bullets, y_start=PAGE_H - 200, line_h=25, max_w=720, size=12)
    c.showPage()


def slide_need(c):
    """Extra slide: why this is needed NOW — addresses the 'proper need' question."""
    draw_background(c, 8, 9)
    draw_title(c, "WHY NOW — THE NEED")

    # three-column justification
    cols = [
        ("The Gap",
         "YouTube teaches concepts (30-min lectures).  1:1 tutors clarify doubts (₹500/hr, not "
         "always available).  There is NO scalable layer in between for 60-second doubt resolution "
         "in vernacular — that is the exact gap we fill."),
        ("The Timing",
         "Generative video (Remotion / Manim-class tools) became viable in 2024.  Indic LLMs "
         "(Sarvam, IndicBERT) crossed usable quality in 2025.  WhatsApp is 500M+ MAU in India.  "
         "All three curves only just intersected — now is the window."),
        ("The Moat",
         "Multi-agent orchestration (LangGraph) + vernacular TTS + Remotion icon library + WhatsApp "
         "delivery is a non-trivial 4-way stack.  First mover with this exact combo wins the "
         "doubt-resolution layer."),
    ]
    col_w = 240
    y = PAGE_H - 160
    for i, (h, body) in enumerate(cols):
        x = 60 + i * (col_w + 10)
        c.setFillColor(PURPLE)
        c.roundRect(x, y - 180, col_w, 170, 10, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 16, y - 30, h)
        c.setFillColor(HexColor("#F0E8FB"))
        c.setFont("Helvetica", 11)
        for j, ln in enumerate(wrap_text(body, col_w - 32, "Helvetica", 11)):
            c.drawString(x + 16, y - 52 - j * 14, ln)

    # stats strip
    y2 = 110
    stats = [
        ("260M+",  "Learners in India"),
        ("70%",    "Prefer vernacular"),
        ("500M",   "WhatsApp MAU"),
        ("<₹10",   "Per video cost (target)"),
    ]
    for i, (big, small) in enumerate(stats):
        x = 60 + i * 185
        c.setFillColor(PURPLE_DARK)
        c.roundRect(x, y2 - 60, 170, 60, 8, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(x + 16, y2 - 32, big)
        c.setFillColor(HexColor("#E0D4F0"))
        c.setFont("Helvetica", 10)
        c.drawString(x + 16, y2 - 48, small)
    c.showPage()


def slide_conclusion(c):
    draw_background(c, 9, 9)
    draw_title(c, "CONCLUSION")

    bullets = [
        "Gyan_Intent is the 60-second Doubt-Resolver Layer for education — it complements (does not "
        "replace) YouTube, Khan Academy, NPTEL, or a coaching centre's core lectures.",
        "Recap of the solution:  multi-agent AI  →  generative animated video in your language  →  "
        "delivered to WhatsApp  →  with curated full-concept playlist attached.",
        "Expected impact:  cut doubt-resolution time from hours/days to under 2 minutes, at <₹10 per "
        "video — accessible to every learner from K-12 to corporate trainee, across 22+ languages.",
        "Commitment:  a working end-to-end prototype is already live during the hackathon — web app, "
        "FastAPI backend, Remotion video pipeline, WhatsApp bot, gesture accessibility demo — all "
        "integrated and demo-ready.",
    ]
    draw_bullets(c, bullets, y_start=PAGE_H - 135, line_h=26, max_w=720, size=13)

    # closing banner
    c.setFillColor(PURPLE_DARK)
    c.rect(0, 80, PAGE_W, 70, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(PAGE_W / 2, 115, "From Gesture to Genius.")
    c.setFillColor(HexColor("#CBB8E8"))
    c.setFont("Helvetica-Oblique", 12)
    c.drawCentredString(PAGE_W / 2, 95,
                        "Every learner. Every doubt. Every language. In 60 seconds.")
    c.showPage()


# ---------- main -------------------------------------------------------------

def build():
    c = canvas.Canvas(OUT_PATH, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Gyan_Intent — Hackathon Pitch")
    c.setAuthor("Team Gyan_Intent")
    slide_cover(c)
    slide_problem(c)
    slide_solution(c)
    slide_methodology(c)
    slide_stack(c)
    slide_prototype(c)
    slide_future(c)
    slide_need(c)
    slide_conclusion(c)
    c.save()
    print(f"✅ PDF written → {OUT_PATH}")


if __name__ == "__main__":
    build()
