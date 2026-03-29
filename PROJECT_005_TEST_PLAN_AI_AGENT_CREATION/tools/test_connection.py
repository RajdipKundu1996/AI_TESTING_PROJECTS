import requests

def test_tracker_connection(connection_schema):
    """Verifies connection to Jira or ADO."""
    provider = connection_schema.get("provider_type", "").lower()
    base_url = connection_schema.get("base_url", "").rstrip("/")
    auth_identifier = connection_schema.get("auth_identifier", "")
    api_token = connection_schema.get("api_token", "")
    
    try:
        if provider == "jira":
            url = f"{base_url}/rest/api/2/myself"
            resp = requests.get(url, auth=(auth_identifier, api_token), timeout=5)
            return resp.status_code == 200
        elif provider in ["ado", "azure"]:
            url = f"{base_url}/_apis/connectionData?api-version=6.0"
            resp = requests.get(url, auth=("", api_token), timeout=5)
            return resp.status_code == 200
        else:
            return False 
    except Exception:
        return False

def test_llm_connection(connection_schema):
    """Verifies connection to Gemini, Groq, or Ollama."""
    provider = connection_schema.get("provider_type", "").lower()
    base_url = connection_schema.get("base_url", "").rstrip("/")
    api_token = connection_schema.get("api_token", "")
    
    try:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_token}"
            payload = {"contents": [{"parts": [{"text": "Ping"}]}]}
            resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=5)
            return resp.status_code == 200
        elif provider == "groq":
            url = "https://api.groq.com/openai/v1/models"
            headers = {"Authorization": f"Bearer {api_token}"}
            resp = requests.get(url, headers=headers, timeout=5)
            return resp.status_code == 200
        elif provider == "ollama":
            url = f"{base_url}/api/tags"
            resp = requests.get(url, timeout=5)
            return resp.status_code == 200
        return False
    except Exception:
        return False
