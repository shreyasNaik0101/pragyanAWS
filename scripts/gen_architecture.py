"""Gyan Pragyan architecture — simple, accurate, with brand logos."""
import os
import urllib.request
from io import BytesIO

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

ICON_DIR = os.path.join(os.path.dirname(__file__), "_icons")
os.makedirs(ICON_DIR, exist_ok=True)

# slug -> simpleicons CDN
ICONS = {
    "whatsapp":   "whatsapp",
    "chrome":     "googlechrome",
    "openai":     "openai",
    "youtube":    "youtube",
    "langchain":  "langchain",
    "fastapi":    "fastapi",
    "python":     "python",
    "nextjs":     "nextdotjs",
    "react":      "react",
    "threejs":    "threedotjs",
    "tailwind":   "tailwindcss",
    "postgres":   "postgresql",
    "redis":      "redis",
    "ffmpeg":     "ffmpeg",
    "docker":     "docker",
    "remotion":   "remotion",
}


FALLBACK_URLS = {
    "openai":   "https://raw.githubusercontent.com/gilbarbara/logos/main/logos/openai.svg",
    "remotion": "https://raw.githubusercontent.com/gilbarbara/logos/main/logos/remotion.svg",
}


def fetch_icon(slug):
    """Download SVG -> rasterize to PNG (cached). Falls back to gilbarbara/logos."""
    png_path = os.path.join(ICON_DIR, f"{slug}.png")
    if os.path.exists(png_path):
        return png_path
    urls = [f"https://cdn.simpleicons.org/{slug}"]
    if slug in FALLBACK_URLS:
        urls.insert(0, FALLBACK_URLS[slug])
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                svg_bytes = r.read()
            svg_path = os.path.join(ICON_DIR, f"{slug}.svg")
            with open(svg_path, "wb") as f:
                f.write(svg_bytes)
            drawing = svg2rlg(svg_path)
            renderPM.drawToFile(drawing, png_path, fmt="PNG", dpi=200)
            return png_path
        except Exception as e:
            print(f"[warn] {slug} via {url}: {e}")
    return None


# Pre-fetch all icons
ICON_PATHS = {k: fetch_icon(v) for k, v in ICONS.items()}


# ---------- Light theme ----------
BG     = "#ffffff"
TITLE  = "#0f172a"
SUB    = "#475569"
TEXT   = "#0f172a"
BORDER = "#94a3b8"
ARROW  = "#1e293b"
LBL    = "#475569"

COLORS = {
    "ai":       ("#ede9fe", "#7c3aed"),
    "external": ("#ffedd5", "#ea580c"),
    "users":    ("#fce7f3", "#db2777"),
    "wabot":    ("#dcfce7", "#16a34a"),
    "frontend": ("#fef9c3", "#ca8a04"),
    "backend":  ("#cffafe", "#0891b2"),
    "remotion": ("#fee2e2", "#dc2626"),
    "storage":  ("#e0e7ff", "#4f46e5"),
}

fig, ax = plt.subplots(figsize=(20, 11), dpi=160)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 200)
ax.set_ylim(0, 115)
ax.set_aspect("equal")
ax.axis("off")


def group(x, y, w, h, title, sub, key):
    fill, edge = COLORS[key]
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=0.6,rounding_size=1.4",
                                linewidth=2.0, edgecolor=edge, facecolor=fill, alpha=0.85))
    ax.text(x + 1.6, y + h - 2.2, title, fontsize=12, fontweight="bold", color=TEXT, va="center")
    ax.text(x + 1.6, y + h - 4.4, sub, fontsize=8.5, color=edge, va="center",
            style="italic", fontweight="bold")


def add_icon(cx, cy, slug, zoom=0.07):
    p = ICON_PATHS.get(slug)
    if not p or not os.path.exists(p):
        return
    img = Image.open(p).convert("RGBA")
    oi = OffsetImage(img, zoom=zoom)
    ab = AnnotationBbox(oi, (cx, cy), frameon=False, box_alignment=(0.5, 0.5))
    ax.add_artist(ab)


def node(cx, cy, w, h, label, sub="", icon=None):
    x, y = cx - w / 2, cy - h / 2
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=0.2,rounding_size=0.7",
                                linewidth=1.1, edgecolor=BORDER, facecolor="white"))
    if icon:
        add_icon(x + 1.8, cy, icon, zoom=0.07)
        text_x = x + 3.6
        ha = "left"
    else:
        text_x = cx
        ha = "center"
    if sub:
        ax.text(text_x, cy + 0.9, label, fontsize=8, ha=ha, va="center",
                color=TEXT, fontweight="bold")
        ax.text(text_x, cy - 1.4, sub, fontsize=6.8, ha=ha, va="center",
                color=SUB, style="italic")
    else:
        ax.text(text_x, cy, label, fontsize=8, ha=ha, va="center",
                color=TEXT, fontweight="bold")


def arrow(p1, p2, label="", curve=0.0, dashed=False):
    ax.add_patch(FancyArrowPatch(p1, p2,
                                 arrowstyle="-|>", mutation_scale=13,
                                 linewidth=1.4, color=ARROW,
                                 connectionstyle=f"arc3,rad={curve}",
                                 linestyle=(0, (4, 3)) if dashed else "-"))
    if label:
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2 + 1.4
        ax.text(mx, my, label, fontsize=6.8, color=LBL, ha="center", style="italic",
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.85))


# ============================================================
# GROUPS
# ============================================================
group(4,    78, 60, 28, "AI Supervisor",     "LangGraph + LangChain", "ai")
group(70,   78, 56, 28, "External APIs",     "OpenAI · Sarvam · YouTube", "external")
group(132,  78, 64, 28, "Remotion Service",  "Node + Remotion 4", "remotion")

group(4,    44, 32, 28, "Users",             "Web · WhatsApp", "users")
group(42,   44, 50, 28, "WhatsApp Bot",      "whatsapp-web.js", "wabot")
group(98,   44, 98, 28, "Backend",           "FastAPI (Python)", "backend")

group(4,     4, 122, 36, "Frontend",         "Next.js 15 + React 19", "frontend")
group(132,   4, 64, 36, "Storage",           "PostgreSQL · Redis", "storage")


# ============================================================
# AI SUPERVISOR
# ============================================================
node(13, 90, 12, 6, "Supervisor",  "router")
node(28, 96, 14, 5, "Visual Team", "GPT-4o-mini")
node(28, 90, 14, 5, "Math Team",   "GPT-4o-mini")
node(28, 84, 14, 5, "Video Team",  "Remotion")
node(50, 90, 18, 6, "State Graph", "langgraph", icon="langchain")

arrow((19, 90), (21, 96), curve=0.2)
arrow((19, 90), (21, 90))
arrow((19, 90), (21, 84), curve=-0.2)
arrow((35, 90), (41, 90))


# ============================================================
# EXTERNAL APIS
# ============================================================
node(80,  96, 14, 6, "OpenAI",    "GPT-4o-mini",    icon="openai")
node(98,  96, 14, 6, "Sarvam AI", "Hinglish TTS")
node(116, 96, 14, 6, "YouTube",   "transcript api", icon="youtube")

arrow((59, 90), (73, 93), curve=0.1, label="LLM calls")


# ============================================================
# REMOTION
# ============================================================
node(142, 96, 14, 6, "Express API",  "/render")
node(160, 96, 14, 6, "Remotion CLI", "renderer", icon="remotion")
node(178, 96, 14, 6, "OpenAI",       "script gen", icon="openai")
node(142, 86, 14, 6, "Sarvam TTS",   "voice")
node(160, 86, 14, 6, "KaTeX",        "math render")
node(178, 86, 14, 6, "FFmpeg",       "MP4", icon="ffmpeg")

arrow((149, 96), (153, 96))
arrow((167, 96), (171, 96))
arrow((149, 86), (153, 86))
arrow((167, 86), (171, 86))


# ============================================================
# USERS
# ============================================================
node(13, 58, 14, 7, "WhatsApp",    "consumer chat", icon="whatsapp")
node(29, 58, 14, 7, "Web Browser", "Chrome / Edge", icon="chrome")


# ============================================================
# WHATSAPP BOT
# ============================================================
node(50, 60, 14, 6, "Listener",       "Client.on", icon="whatsapp")
node(66, 60, 14, 6, "Language Flow",  "en/hi/hin/kn")
node(82, 60, 14, 6, "Media Handler",  "image · audio")
node(58, 50, 14, 6, "Speech-to-Text", "Sarvam STT")
node(76, 50, 14, 6, "Health Server",  "express :3003")

arrow((20, 58), (43, 60), label="msg / voice")
arrow((57, 60), (59, 60))
arrow((73, 60), (75, 60))


# ============================================================
# BACKEND
# ============================================================
node(106, 60, 16, 7, "API Routes",       "FastAPI",     icon="fastapi")
node(124, 60, 16, 7, "Auth + JWT",       "python-jose", icon="python")
node(142, 60, 16, 7, "LangGraph Agents", "supervisor",  icon="langchain")
node(160, 60, 16, 7, "Video Renderer",   "Remotion",    icon="react")
node(178, 60, 16, 7, "Celery",           "async jobs")

node(115, 50, 16, 6, "WebSockets",  "live updates")
node(133, 50, 16, 6, "FFmpeg",      "compression", icon="ffmpeg")
node(151, 50, 16, 6, "Pydantic v2", "schemas")
node(169, 50, 16, 6, "Prometheus",  "metrics")

arrow((90, 60), (98, 60), label="HTTP / WS")
arrow((114, 60), (116, 60))
arrow((132, 60), (134, 60))
arrow((150, 60), (152, 60))
arrow((168, 60), (170, 60))

arrow((178, 64), (158, 80), curve=-0.25, label="render job")
arrow((142, 64), (50, 84), curve=0.30, label="agent.invoke()")


# ============================================================
# FRONTEND  (slimmed per request)
# ============================================================
ax.text(12, 33.5, "Pages (App Router)", fontsize=9.5, fontweight="bold", color=TEXT)
node(16, 29, 24, 5, "Dashboard / Hub",   icon="nextjs")
node(16, 23, 24, 5, "Learning Notes",    icon="react")
node(16, 17, 24, 5, "Docs & Onboarding", icon="nextjs")
node(16, 11, 24, 5, "Progress & Stats",  icon="react")

ax.text(48, 33.5, "Interactive UI", fontsize=9.5, fontweight="bold", color=TEXT)
node(54, 29, 26, 5, "Three.js + R3F Hero3D", icon="threejs")
node(54, 23, 26, 5, "Tailwind v4 styling",   icon="tailwind")
node(54, 17, 26, 5, "react-markdown + KaTeX")
node(54, 11, 26, 5, "lucide-react icons")

ax.text(86, 33.5, "Bridges", fontsize=9.5, fontweight="bold", color=TEXT)
node(92, 29, 26, 5, "Route Handlers (app/api)", icon="nextjs")
node(92, 23, 26, 5, "REST client (fetch/axios)")
node(92, 17, 26, 5, "HLS.js streaming")
node(92, 11, 26, 5, "jsPDF / html2canvas")

# Frontend -> Users
arrow((30, 29), (22, 52), curve=-0.20, label="HTTPS")
# Frontend -> Backend
arrow((110, 32), (115, 44), curve=0.0, label="REST · WS")


# ============================================================
# STORAGE  (slimmed)
# ============================================================
node(146, 32, 22, 8, "PostgreSQL", "asyncpg / SQLAlchemy", icon="postgres")
node(176, 32, 16, 8, "Redis",      "cache · session",      icon="redis")
node(146, 18, 22, 8, "Static MP4", "/media")
node(176, 18, 16, 8, "Docker",     "compose",              icon="docker")

arrow((148, 44), (150, 40), label="SQL")
arrow((178, 44), (178, 40), label="cache")
arrow((158, 22), (158, 80), curve=-0.40, label="MP4 assets", dashed=True)


# ============================================================
# Title
# ============================================================
ax.text(100, 112, "Gyan Pragyan — System Architecture",
        fontsize=20, fontweight="bold", color=TITLE, ha="center")
ax.text(100, 109, "Multimodal AI Learning Platform",
        fontsize=11, color=SUB, ha="center", style="italic")

out = "/Users/coder.op/Gyan_Pragyan/Gyan_Pragyan_Architecture.png"
plt.savefig(out, dpi=200, bbox_inches="tight", facecolor=BG)
print(f"Saved: {out}")
