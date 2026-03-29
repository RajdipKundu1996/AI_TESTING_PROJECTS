import sys
import os
import time

# Add tools to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.test_connection import test_tracker_connection, test_llm_connection
from tools.fetch_story import fetch_story_details
from tools.generate_plan import generate_test_plan

def execute_agent(payload):
    """
    A.N.T Layer 2 Navigation: Translates the B.L.A.S.T blueprint into deterministic execution.
    payload: dict adhering to the Gemini.md Execution Payload schema.
    """
    start_time = time.time()
    result = {
        "status": "error",
        "test_plan_markdown": "",
        "execution_time_ms": 0,
        "error_details": ""
    }
    
    try:
        # 1. Verification (Phase 2 Link)
        if not test_tracker_connection(payload.get("tracker_connection", {})):
            result["error_details"] = "Tracker connection failed. Check credentials."
            return result
        
        if not test_llm_connection(payload.get("llm_connection", {})):
            result["error_details"] = "LLM connection failed. Check API key or endpoint."
            return result
            
        # 2. Architect (Phase 3 Core Tools)
        story_id = payload.get("story_id")
        story_details = fetch_story_details(story_id, payload.get("tracker_connection", {}))
        
        if "error" in story_details or not story_details.get("title"):
            result["error_details"] = f"Failed to fetch user story details for ID: {story_id}."
            return result
            
        # 3. Stylize (Phase 4 Generation)
        generated_plan = generate_test_plan(
            story_details=story_details,
            additional_context=payload.get("additional_context", ""),
            llm_connection=payload.get("llm_connection", {}),
            template_content=payload.get("template_content", "Generate standard test plan.")
        )
        
        if "Error" in generated_plan or "Exception" in generated_plan:
            result["error_details"] = generated_plan
            return result
            
        result["status"] = "success"
        result["test_plan_markdown"] = generated_plan
        
    except Exception as e:
        result["error_details"] = f"Agent orchestration error: {str(e)}"
        
    finally:
        result["execution_time_ms"] = int((time.time() - start_time) * 1000)
        
    return result
