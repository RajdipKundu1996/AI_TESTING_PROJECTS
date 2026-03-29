# 📜 Project Constitution (Gemini.md)

## Behavioral Rules
- Architecture: A.N.T 3-Layer (Architecture, Navigation, Tools)
- Protocol: B.L.A.S.T
- Deterministic execution, no business logic guessing.
- Dynamic "on-the-fly" Trackers (Jira/ADO) and LLM Connections (Ollama/Groq/Grok/Gemini).
- Mandatory 'Test Connection' capability for all integrations.

## Data Schema (JSON Payload Shapes)

### 1. Connection Schema (UI Input)
```json
{
  "provider_type": "string",
  "connection_name": "string",
  "base_url": "string",
  "auth_identifier": "string",
  "api_token": "string"
}
```

### 2. Execution Payload (Agent Input)
```json
{
  "story_id": "string",
  "additional_context": "string",
  "tracker_connection": { /* Connection Schema */ },
  "llm_connection": { /* Connection Schema */ },
  "template_content": "string"
}
```

### 3. Generated Payload (Agent Output)
```json
{
  "status": "success | error",
  "test_plan_markdown": "string",
  "execution_time_ms": "number"
}
```
