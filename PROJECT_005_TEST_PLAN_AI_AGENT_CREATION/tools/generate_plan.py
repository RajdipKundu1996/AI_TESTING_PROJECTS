import requests

def generate_test_plan(story_details, additional_context, llm_connection, template_content):
    """Calls the dynamically selected LLM to generate the test plan based on the UI template."""
    provider = llm_connection.get("provider_type", "").lower()
    base_url = llm_connection.get("base_url", "").rstrip("/")
    api_token = llm_connection.get("api_token", "")
    
    system_prompt = f"""You are an expert QA Test Planner AI obeying the B.L.A.S.T protocol.
Your task is to generate a pristine Test Plan matching the formatting of the provided template.
Be deterministic, professional, and do not hallucinate business logic. Rely ONLY on the provided User Story details.

TEMPLATE:
{template_content}

USER STORY DETAILS:
Title: {story_details.get('title')}
Description: {story_details.get('description')}
Acceptance Criteria: {story_details.get('acceptance_criteria')}

ADDITIONAL CONTEXT:
{additional_context}
"""

    try:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_token}"
            payload = {"contents": [{"parts": [{"text": system_prompt}]}]}
            resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
            if resp.status_code == 200:
                return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return "Error from Gemini API."
            
        elif provider == "groq":
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}
            payload = {
                "model": "llama3-70b-8192",
                "messages": [{"role": "system", "content": system_prompt}]
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            return "Error from Groq API."
            
        elif provider == "ollama":
            url = f"{base_url}/api/chat"
            payload = {
                "model": "llama3",
                "messages": [{"role": "user", "content": system_prompt}],
                "stream": False
            }
            resp = requests.post(url, json=payload, timeout=60)
            if resp.status_code == 200:
                return resp.json()["message"]["content"]
            return "Error from Ollama API."
            
        return "Unsupported LLM Provider."
    except Exception as e:
        return f"Exception during generation: {str(e)}"
