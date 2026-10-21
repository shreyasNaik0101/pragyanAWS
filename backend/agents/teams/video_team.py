"""Video generation team — builds a typed Script and delegates to Remotion.

The video team is the last hop in the agent graph. It takes whatever
structured output an upstream team produced (math `solution_steps`,
`code_analysis`, `visual_analysis`, free-form `explanation`) and asks the
LLM to plan it as a typed `Script` for the Remotion renderer. The four
scene types understood by the renderer are:

    concept  - plain narration + visual cue
    math     - KaTeX step-by-step equations
    code     - syntax-highlighted code block
    diagram  - labelled nodes with directed edges

See `remotion-service/src/remotion/types.ts` for the authoritative schema.
"""

import asyncio
import json
import logging
import os
import uuid
from typing import Any

import httpx
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from agents.state import AgentState

logger = logging.getLogger(__name__)

REMOTION_SERVICE_URL = os.getenv("REMOTION_SERVICE_URL", "http://localhost:3005")


# LangChain's ChatPromptTemplate uses f-string style substitution, so every
# literal `{` / `}` in the template must be doubled. Keep only `{payload}` as
# an actual template variable (in the human message below).
VIDEO_SCRIPT_PROMPT = """You are the Illustrator Agent for Gyan_Pragyan.
You are given a topic + the notes from the specialist teams, and you must
direct a short educational video by composing SCENES. You are the single
authority on what to draw — the renderer is a dumb stage that only follows
your instructions.

FIVE scene kinds are available. Pick the one that best TEACHES each beat:

1. "stage"   — **Primary storytelling scene.** You place real-world actors
               (sun, tree, leaf, water, cloud, cell, atom, brain, heart,
               cpu, etc.) on a stage with a backdrop and draw light rays,
               water flows or arrows between them. Use this for ANY topic
               that has physical actors interacting in space (biology,
               physics, chemistry, astronomy, systems, machines).

2. "diagram" — Abstract node/edge flowchart (supervisors, graphs, state
               machines). Use ONLY when the topic is inherently a graph,
               not a physical scene.

3. "math"    — LaTeX equation walkthrough with a side geometric figure.

4. "code"    — Syntax-highlighted code block.

5. "concept" — Plain narration with a single illustration. Use sparingly,
               only for pure-verbal intros / summaries.

You receive up to four pieces of material (any may be empty):
  - explanation, solution_steps, code_analysis, visual_analysis

Output STRICT JSON (no markdown fences):
{{
  "title": "...",
  "subtitle": "...",
  "language": "<echo requested>",
  "segments": [ /* 4-5 segments, total 50-75 seconds */ ],
  "total_duration": 100
}}

=== Stage segment structure ===

{{
  "kind": "stage",
  "text": "<3-4 sentences of voiceover narration — 150-260 chars>",
  "duration": 14,
  "backdrop": "sky_ground" | "space" | "indoor" | "zoom_cell" | "plain",
  "actors": [
    {{ "id": "<unique id>", "actor": "<ACTOR NAME>", "x": <0-100>,
       "y": <0-100>, "scale": <0.5-3>, "enter_at": <0-1>,
       "highlight": false }}
  ],
  "beams": [
    {{ "from": "<actor id>", "to": "<actor id>", "label": "<short>",
       "start": <0-1>, "style": "light" | "flow" | "arrow" }}
  ],
  "labels": [
    {{ "text": "<short annotation>", "x": <0-100>, "y": <0-100>,
       "at": <0-1> }}
  ]
}}

ACTOR NAMES you can use (the renderer has a dedicated SVG for each):
  Sun, Leaf, Water, CO2, Oxygen, Glucose, Root, Tree, Cell, DNA, Atom,
  Electron, Battery, Bulb, CPU, Memory, Database, Cloud, Heart, Brain,
  Fire, Star, Earth, Gear, Molecule, Flask, Book, Lightning, Thylakoid,
  Chlorophyll.
If you need something not in the list, pick the closest match — the
renderer will fall back to a labeled bubble.

=== Worked example for Photosynthesis ===

Segment 1 — WIDE SHOT on a sky+ground backdrop: Sun top-left, a big Tree
centre, Cloud top-right, Water droplet near the roots, Leaf zoomed-in at
the tree. Light beams from Sun to Leaf. Water beam from root up into leaf.
CO2 beam from the air into leaf. Arrow beam from leaf out to Oxygen on
the right.

  {{ "kind": "stage",
     "backdrop": "sky_ground",
     "text": "Every green plant is a tiny solar-powered factory. The sun
       sends its light down onto the leaves, water travels up from the
       roots, and carbon dioxide drifts in from the air — all three meet
       inside the leaf to start photosynthesis.",
     "duration": 15,
     "actors": [
       {{ "id": "sun",   "actor": "Sun",   "x": 15, "y": 18, "scale": 1.2, "enter_at": 0 }},
       {{ "id": "cloud", "actor": "Cloud", "x": 80, "y": 20, "scale": 1.0, "enter_at": 0.1 }},
       {{ "id": "tree",  "actor": "Tree",  "x": 50, "y": 60, "scale": 2.6, "enter_at": 0.1 }},
       {{ "id": "leaf",  "actor": "Leaf",  "x": 60, "y": 45, "scale": 0.8, "enter_at": 0.4, "highlight": true }},
       {{ "id": "water", "actor": "Water", "x": 38, "y": 82, "scale": 0.9, "enter_at": 0.3 }},
       {{ "id": "o2",    "actor": "Oxygen","x": 88, "y": 50, "scale": 0.9, "enter_at": 0.8 }}
     ],
     "beams": [
       {{ "from": "sun",   "to": "leaf", "label": "light",  "start": 0.35, "style": "light" }},
       {{ "from": "water", "to": "leaf", "label": "H2O",    "start": 0.45, "style": "flow"  }},
       {{ "from": "cloud", "to": "leaf", "label": "CO2",    "start": 0.55, "style": "flow"  }},
       {{ "from": "leaf",  "to": "o2",   "label": "O2 out", "start": 0.75, "style": "arrow" }}
     ],
     "labels": [ {{ "text": "photosynthesis", "x": 50, "y": 8, "at": 0.15 }} ]
  }}

Segment 2 — ZOOM INSIDE THE LEAF on a "zoom_cell" backdrop: Chlorophyll,
Thylakoid, Electron, Lightning. Light beams hitting chlorophyll, electrons
flowing out, glucose produced.

=== Hard rules ===
- 4-5 segments, total 50-75s. Each segment 10-15s.
- Use "stage" as the default scene for storytelling topics. Fall back to
  diagram only for pure graphs, math for equations, code for code.
- Every "text" MUST be 150-260 characters (3-4 sentences), spoken as
  voiceover. Never write titles like "Overview" — write full narration.
- In stage segments, use meaningful x/y coordinates: inputs enter from the
  edges, the main actor is centred, outputs exit on the right.
- Stagger `enter_at` so actors appear progressively (not all at 0).
- Beams' `start` should come AFTER the from/to actors' `enter_at`.
- Output JSON only, no prose, no markdown fences."""


def _build_user_payload(state: AgentState) -> str:
    """Flatten the relevant parts of the agent state into a prompt string."""
    parts: list[str] = []
    parts.append(f"Concept / query: {state.get('query', '')}")
    parts.append(f"Language: {state.get('language', 'english')}")
    if state.get("explanation"):
        parts.append(f"Explanation:\n{state['explanation']}")
    if state.get("solution_steps"):
        steps = "\n".join(f"- {s}" for s in state["solution_steps"])
        parts.append(f"Solution steps:\n{steps}")
    if state.get("code_analysis"):
        parts.append(f"Code analysis:\n{json.dumps(state['code_analysis'])}")
    if state.get("visual_analysis"):
        parts.append(f"Visual analysis:\n{json.dumps(state['visual_analysis'])}")
    return "\n\n".join(parts)


def _fallback_script(state: AgentState) -> dict[str, Any]:
    """Minimal concept-only script used when the LLM call fails."""
    concept = state.get("query") or "Learning Topic"
    explanation = state.get("explanation") or f"Understanding {concept}."
    return {
        "title": concept[:80],
        "subtitle": "An Educational Overview",
        "language": state.get("language", "english"),
        "total_duration": 28,
        "segments": [
            {
                "kind": "concept",
                "text": f"Today's topic: {concept}.",
                "visual_cue": "Title card with accent",
                "duration": 6,
                "animation_type": "fade",
            },
            {
                "kind": "concept",
                "text": explanation[:160],
                "visual_cue": "Key idea visualised",
                "duration": 8,
                "animation_type": "create",
            },
            {
                "kind": "concept",
                "text": "Let's recap the takeaways.",
                "visual_cue": "Summary bullets",
                "duration": 6,
                "animation_type": "write",
            },
        ],
    }


async def _run_remotion(
    client: httpx.AsyncClient, script: dict[str, Any], language: str, job_id: str
) -> tuple[str | None, str | None, str | None]:
    """Submit a pre-built script to Remotion and poll until done.

    Returns (video_url, subtitles_url, error).
    """
    payload = {"script": script, "language": language, "jobId": job_id}
    r = await client.post(f"{REMOTION_SERVICE_URL}/render", json=payload)
    if r.status_code >= 400:
        # Surface the validation body so we can see which field failed.
        body_snippet = r.text[:1500]
        logger.error(
            "Remotion /render rejected payload (%s): %s\nscript=%s",
            r.status_code,
            body_snippet,
            json.dumps(script)[:2000],
        )
        return None, None, f"Remotion rejected script: {body_snippet}"
    remote_id = r.json().get("jobId", job_id)

    for _ in range(600):
        await asyncio.sleep(1.0)
        s = await client.get(f"{REMOTION_SERVICE_URL}/status/{remote_id}")
        if s.status_code != 200:
            continue
        data = s.json()
        if data.get("status") == "completed":
            return data.get("video_url"), data.get("subtitles_url"), None
        if data.get("status") == "failed":
            return None, None, data.get("error_message", "render failed")
    return None, None, "Remotion render timed out"


def create_video_team_node(llm: ChatOpenAI):
    """Create the video team node.

    1. Ask the LLM to build a typed Script using every signal we have.
    2. POST the script to the Remotion service and poll to completion.
    """
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", VIDEO_SCRIPT_PROMPT),
            ("human", "{payload}"),
        ]
    )
    chain = prompt | llm.bind(response_format={"type": "json_object"})

    async def video_node(state: AgentState) -> AgentState:
        job_id = str(uuid.uuid4())
        language = state.get("language", "english")

        # Build a typed script from the LLM (with safe fallback).
        try:
            result = await chain.ainvoke({"payload": _build_user_payload(state)})
            script = json.loads(result.content)
            # Ensure the language echoes through; some LLM outputs omit it.
            script.setdefault("language", language)
        except Exception:  # pragma: no cover
            logger.exception("video_team: script generation failed, using fallback")
            script = _fallback_script(state)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                video_url, subtitles_url, err = await _run_remotion(
                    client, script, language, job_id
                )
        except Exception as e:  # pragma: no cover
            logger.exception("video_team: Remotion request failed")
            return {
                **state,
                "last_error": str(e),
                "error_count": state.get("error_count", 0) + 1,
                "next": "__end__",
            }

        if err is not None:
            return {
                **state,
                "last_error": err,
                "error_count": state.get("error_count", 0) + 1,
                "next": "__end__",
            }

        return {
            **state,
            "script": script,
            "video_url": video_url,
            "subtitles_url": subtitles_url,
            "next": "__end__",
        }

    return video_node
