"""LangGraph agent orchestration."""

import os
from typing import Literal, Optional

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.config import settings
from agents.state import AgentState, RouteDecision
from agents.supervisor import create_supervisor_node
from agents.teams.visual_team import create_visual_team_node
from agents.teams.math_team import create_math_team_node
from agents.teams.coding_team import create_coding_team_node
from agents.teams.video_team import create_video_team_node


# Initialize LLM
llm = ChatOpenAI(
    # gpt-4o-mini is ~90% cheaper than gpt-4o and gives solid JSON for our
    # routing + structured-script use cases. Override with OPENAI_MODEL if
    # you want to bump back up for a specific run.
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    api_key=settings.OPENAI_API_KEY,
    temperature=0.2,
)


def should_continue(state: AgentState) -> Literal[
    "visual_team", "math_team", "coding_team", "video_team", "__end__"
]:
    """Determine next node based on supervisor decision.

    The video pipeline never wants to short-circuit to END — if the
    supervisor returns __end__ anyway (shouldn't happen after the prompt
    update, but be defensive) we fall back to video_team so we always
    produce a video.
    """
    nxt = state.get("next")
    if nxt in ("visual_team", "math_team", "coding_team", "video_team"):
        return nxt  # type: ignore[return-value]
    return "video_team"


def build_agent_graph():
    """Build and compile the LangGraph agent system."""
    
    # Initialize state graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("supervisor", create_supervisor_node(llm))
    workflow.add_node("visual_team", create_visual_team_node(llm))
    workflow.add_node("math_team", create_math_team_node(llm))
    workflow.add_node("coding_team", create_coding_team_node(llm))
    workflow.add_node("video_team", create_video_team_node(llm))
    
    # Add conditional edges from supervisor
    workflow.add_conditional_edges(
        "supervisor",
        should_continue,
        {
            "visual_team": "visual_team",
            "math_team": "math_team",
            "coding_team": "coding_team",
            "video_team": "video_team",
            "__end__": END,
        }
    )
    
    # After a specialist team runs, always flow into the video team. It is
    # the one authoritative place that composes a Remotion `Script` from
    # whatever structured outputs are available (math steps, code analysis,
    # visual analysis, or plain explanation). This avoids a second
    # supervisor hop that could otherwise loop without a "done" signal.
    workflow.add_edge("visual_team", "video_team")
    workflow.add_edge("math_team", "video_team")
    workflow.add_edge("coding_team", "video_team")

    # Video team ends the workflow
    workflow.add_edge("video_team", END)
    
    # Set entry point
    workflow.set_entry_point("supervisor")
    
    # Compile with memory
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)


# Global graph instance
agent_graph = build_agent_graph()


async def process_intent(
    query: str,
    modality: str = "text",
    image_data: Optional[str] = None,
    language: str = "hinglish",
) -> dict:
    """
    Process user intent through the agent graph.
    
    Args:
        query: User query
        modality: Input modality (text/visual/voice)
        image_data: Base64 encoded image (for visual modality)
        language: Target language
        
    Returns:
        Processing result with explanation and optional video
    """
    initial_state = AgentState(
        messages=[HumanMessage(content=query)],
        query=query,
        image_data=image_data,
        language=language,
        next="",
        route_reasoning="",
        priority="normal",
        estimated_time=30,
        explanation="",
        visual_analysis=None,
        solution_steps=None,
        code_analysis=None,
        script=None,
        video_url=None,
        subtitles_url=None,
        duration=None,
        error_count=0,
        last_error=None,
    )
    
    result = await agent_graph.ainvoke(
        initial_state,
        config={"configurable": {"thread_id": "intent_123"}}
    )
    
    return {
        "explanation": result["explanation"],
        "video_url": result.get("video_url"),
        "subtitles_url": result.get("subtitles_url"),
        "duration": result.get("duration"),
        "route": result["route_reasoning"],
    }
