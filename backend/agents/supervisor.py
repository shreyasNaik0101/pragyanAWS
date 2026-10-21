"""Supervisor agent for intent routing."""

import json
from typing import Literal

from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from agents.state import AgentState


SUPERVISOR_PROMPT = """You are the Supervisor Agent for Gyan_Pragyan, an AI-powered educational platform.

Your job is to route every user intent to exactly ONE specialist team. The
pipeline always culminates in a video, so you must NEVER return __end__.

Available Teams:
1. visual_team  — image analysis, diagram interpretation, OCR
2. math_team    — mathematical problems, equations, geometry, physics with formulas
3. coding_team  — code debugging, algorithm explanations, programming topics
4. video_team   — when the user already has an explanation ready and just needs it animated,
                   or for general educational / conceptual topics (history, biology,
                   geography, science overviews, etc.)

Routing Rules (apply top-down, first match wins):
- Input contains an image / diagram / handwriting → visual_team
- Input is a maths / physics problem with numbers, equations, geometry, proofs → math_team
- Input contains source code, an algorithm, or a programming concept → coding_team
- Any other educational query (concept, science, history, general knowledge) → video_team

You MUST pick one of: visual_team | math_team | coding_team | video_team.

Respond with a JSON object:
{{
    "team": "visual_team|math_team|coding_team|video_team",
    "reasoning": "Brief explanation of why this team was selected",
    "priority": "high|normal|low",
    "estimated_time": 30
}}
"""

TeamType = Literal["visual_team", "math_team", "coding_team", "video_team", "__end__"]


def create_supervisor_node(llm: ChatOpenAI):
    """Create the supervisor routing node."""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SUPERVISOR_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
        (
            "human",
            "Given the conversation above, analyze the latest intent and route to the appropriate team."
        )
    ])
    
    chain = prompt | llm.bind(response_format={"type": "json_object"})
    
    async def supervisor(state: AgentState) -> AgentState:
        """Route to appropriate team based on intent."""
        result = await chain.ainvoke({"messages": state["messages"]})
        
        decision = json.loads(result.content)
        
        return {
            **state,
            "next": decision["team"],
            "route_reasoning": decision["reasoning"],
            "priority": decision["priority"],
            "estimated_time": decision["estimated_time"]
        }
    
    return supervisor
