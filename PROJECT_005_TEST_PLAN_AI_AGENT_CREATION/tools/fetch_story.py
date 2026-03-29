import requests

def fetch_story_details(story_id, tracker_connection):
    """Fetches Issue details from Jira or ADO deterministically."""
    provider = tracker_connection.get("provider_type", "").lower()
    base_url = tracker_connection.get("base_url", "").rstrip("/")
    auth_identifier = tracker_connection.get("auth_identifier", "")
    api_token = tracker_connection.get("api_token", "")
    
    story_data = {
        "id": story_id,
        "title": "",
        "description": "",
        "acceptance_criteria": ""
    }
    
    try:
        if provider == "jira":
            url = f"{base_url}/rest/api/2/issue/{story_id}"
            resp = requests.get(url, auth=(auth_identifier, api_token), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                story_data["title"] = data.get("fields", {}).get("summary", "")
                story_data["description"] = data.get("fields", {}).get("description", "")
        elif provider in ["ado", "azure"]:
            url = f"{base_url}/_apis/wit/workitems/{story_id}?api-version=6.0"
            resp = requests.get(url, auth=("", api_token), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                fields = data.get("fields", {})
                story_data["title"] = fields.get("System.Title", "")
                story_data["description"] = fields.get("System.Description", "")
                story_data["acceptance_criteria"] = fields.get("Microsoft.VSTS.Common.AcceptanceCriteria", "")
    except Exception as e:
        story_data["error"] = str(e)
        
    return story_data
