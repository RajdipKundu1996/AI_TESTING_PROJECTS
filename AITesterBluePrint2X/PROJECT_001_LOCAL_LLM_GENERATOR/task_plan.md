# Task Plan

## Phase 1: Initialization & Discovery [COMPLETED]
- [x] Create initialization files (`task_plan.md`, `findings.md`, `progress.md`, `context.md`)
- [x] Ask discovery questions
- [x] Receive answers to discovery questions
- [x] Create and approve project Blueprint

## Phase 2: Setup & Scaffolding [COMPLETED]
- [x] Initialize Node.js TypeScript backend
- [x] Initialize React frontend
- [x] Configure basic project structure

## Phase 3: Implement Config Storage & Node.js backend proxy [COMPLETED]
- [x] Scaffold React UI (Main window & Settings window)
- [x] Implement Config Storage in frontend (localStorage)
- [x] Create Node.js backend proxy `/api/generate` route

## Phase 4: Implement generation logic (LLM API integrations) [COMPLETED]
- [x] Implement backend LLM proxy with Axios
- [x] Connect frontend Workspace API call to backend

## Phase 5: UI Polish, Jira formatting rules, and End-to-End testing [COMPLETED]
- [x] Ensure pre-wrap block for formatting Jira output
- [x] Integrate System Prompts for Jira specific fields
- [x] Test End to End flow

---

## 🏗️ APPROVED BLUEPRINT

### Application Name:
**Test Buddy Test Case Generator**

### Architecture
- **Frontend**: React (TypeScript) for building the UI based on the wireframe `TC_GENERATOR_LLM_HLD.jpg`. 
- **Backend/API Layer**: Node.js (Express with TypeScript) to handle LLM communication and integrations securely.

### Core Features

**1. Main UI Window [Test Generation Workspace]**
- **Chat History Sidebar**: To store previous generation queries.
- **Main Output Area**: Displays the generated Jira Test Cases. Formats code natively.
- **Input Chat Box**: "Ask Here For Generating Test Cases on the Requirement". The user can paste Jira tickets/requirements here.

**2. Settings UI Window [LLM Configurator]**
- Config panels for: `Ollama`, `LM Studio`, `Grok`, `OpenAI`, `Claude`, and `Gemini`.
- Inputs for API keys, Base URLs (for local models), and specific models.
- **Test Connection Button**: Verifies if the API keys/local instances are accessible.
- **Save Button**: Saves configurations securely (e.g., in `localStorage` or backend DB if requested).

**3. Output Specifications**
- Automatically formats generated output cleanly as Jira Test Cases.
- Will handle both functional and non-functional requirements.

### Implementation Phases

- **Phase 1**: Initializing node/react structure (Current Phase).
- **Phase 2**: Scaffold React UI (Main window & Settings window).
- **Phase 3**: Implement Config Storage & Node.js backend proxy.
- **Phase 4**: Implement generation logic (LLM API integrations).
- **Phase 5**: UI Polish, Jira formatting rules, and End-to-End testing.
