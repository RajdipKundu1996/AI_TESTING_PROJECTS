# Findings

## Research, Discoveries & Constraints

### Testing Context
- Generating API test cases and web application test cases.
- Includes both Functional and Non-functional test cases.

### Input Mechanism
- Users provide Jira requirements by pasting them or via chat interface.
- UI features a "Chat History" sidebar and a prompt input "Ask Here For Generating Test Cases on the Requirement" based on the HLD wireframe.

### LLM Infrastructure
- Supported APIs: Ollama API, LM Studio API, Grok API, OpenAI API, Claude API, Gemini API.
- Configurable via a dedicated settings window that contains specific settings sections for each provider.
- Settings window includes a "SAVE BUTTON" and a "TEST CONNECTION BUTTON".
- Based on the UI Wireframe, the primary interface shows "TEST BUDDY TEST CASE GENERATOR".

### Tech Stack
- Backend: Node.js with TypeScript.
- Frontend: React with TypeScript.

### Project Constraints
- Output must be purely in Jira format.
- Output features functional test cases, and optionally non-functional as requested.
