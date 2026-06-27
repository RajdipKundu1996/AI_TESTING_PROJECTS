/**
 * AI Engine — Orchestrator for real-world LLM calls
 * Supports: Ollama, Mistral, Hugging Face, Anthropic (Claude)
 * Frameworks: BLAST, RICEPOT
 */

const AIEngine = {
    enterpriseTestCaseColumns() {
        return 'Test Case ID | Module / Feature | Requirement ID / User Story | Test Scenario | Test Case Title | Priority | Severity | Preconditions | Test Data | Steps to Execute | Expected Result | Actual Result | Status | Environment | Browser / Device | Postconditions | Executed By | Execution Date | Comments / Attachments | Automation Status | Defect ID';
    },

    enterpriseQAPromptBody() {
        return `
You are a Principal QA Architect, Senior Product Analyst, Business Analyst, API Testing Expert, UI/UX Quality Engineer, Security Tester, and Enterprise Quality Consultant.

Your responsibility is NOT to immediately generate test cases.
You must first deeply analyze the provided PRD and understand the complete product before generating any test cases.

PHASE 1: PRD ANALYSIS (MANDATORY)
Step 1: Product Understanding
- Identify product type, business objective, target users, user personas, core workflows, critical business processes, and success criteria.
- Determine whether the PRD contains web application, mobile application, API service, admin portal, dashboard, workflow system, payment system, authentication system, reporting system, AI feature, third-party integrations, database operations, background jobs, notifications, messaging systems, or microservices.

Step 2: Requirement Breakdown
- Extract functional requirements: features, user actions, business logic, and user journeys.
- Extract non-functional requirements: performance, security, accessibility, reliability, and scalability expectations.
- Extract business rules: validations, permissions, eligibility logic, approval rules, and workflow conditions.

Step 3: Component Discovery
- Identify UI components: buttons, forms, dropdowns, tables, search, filters, modals, navigation, tabs, dashboards, and reports.
- Identify backend components: APIs, services, business logic, and database operations.
- Identify integration components: webhooks, third-party APIs, payment gateways, email systems, and SMS systems.
- Identify security components: authentication, authorization, sessions, tokens, and encryption.

PHASE 2: REQUIREMENT GAP ANALYSIS
Before generating test cases, identify missing requirements, missing validations, ambiguous business rules, missing acceptance criteria, missing error handling, missing permission definitions, missing API contracts, and missing UX specifications. Provide recommendations.

PHASE 3: TEST STRATEGY CREATION
Create a testing strategy covering Functional Testing, Validation Testing, API Testing, UI Testing, UX Testing, Security Testing, Integration Testing, Database Testing, Performance Testing, Accessibility Testing, Compatibility Testing, Exploratory Testing, and Black Box Testing.

PHASE 4: TEST CASE GENERATION
Generate comprehensive functional, validation, UI, UX, API, security, integration, database, negative, boundary, edge case, exploratory, accessibility, compatibility, and performance test cases based on discovered requirements.
For API requirements, generate functional, boundary, security, contract, and reliability tests including valid requests, invalid requests, missing fields, invalid datatypes, empty/null/large payloads, SQL injection, XSS, JWT tampering, authorization validation, token expiry, rate limiting, schema validation, timeout, retry, and concurrent request validation.
For database requirements, generate data validation, data integrity, rollback, audit, and foreign-key tests with SQL verification query guidance.

MANDATORY TEST CASE COLUMNS:
${this.enterpriseTestCaseColumns()}

MANDATORY ENTERPRISE TRACEABILITY FIELDS:
Every generated test case must clearly contain or map to Test Case ID, Requirement ID, Requirement Mapping, Module, Feature, Test Objective, Preconditions, Test Data, Test Steps, Expected Results, Priority, Severity, Risk, Automation Candidate, Requirement Traceability, and API Mapping when applicable.

MANDATORY FIELD DEFAULTS:
- Actual Result: "Not Executed"
- Status: "Not Run"
- Executed By: "TBD"
- Execution Date: "TBD"
- Defect ID: "N/A"

MANDATORY BLACK BOX COVERAGE:
- Equivalence Partitioning: valid/invalid partitions for inputs, APIs, file uploads, search filters, numeric ranges, text fields, dates, and business rules.
- Boundary Value Analysis: min, max, exact boundary, below min, above max, overflow, underflow for character limits, numeric inputs, API limits, upload limits, pagination, and date ranges.
- Decision Table Testing: AND/OR/dependency rules for permissions, eligibility, payments, approvals, subscriptions, and feature flags.
- State Transition Testing: valid, invalid, interrupted, recovery, and persistence transitions for auth, orders, workflows, sessions, approvals, and retry logic.
- Use Case Testing: primary, alternate, exception, recovery, multi-user, and end-to-end journeys.
- Cause-Effect Graph Testing: validation engines, conditional workflows, calculations, eligibility, and approval rules.
- Error Guessing: duplicate submissions, double-clicks, refresh during transactions, session expiry, network interruption, concurrent edits, partial saves, invalid navigation, corrupted payloads, unexpected actions.
- Pairwise Testing: browsers, devices, roles, configurations, and feature combinations.
- Syntax Testing: JSON, XML, email, date, URL, regex, and payload syntax.
- Random Testing: random valid/invalid inputs, payload mutation, and interruption scenarios.
- Exploratory Testing: UX inconsistencies, hidden edge cases, navigation anomalies, cross-feature effects, persistence issues, unexpected states.
- Compatibility Testing: browser, device, OS, responsive layouts, screen resolutions.
- Security-Oriented Black Box Testing: SQL injection, XSS, CSRF, HTML injection, JSON injection, command injection, auth bypass, authorization failures, broken access control, session hijacking, token manipulation, parameter tampering, sensitive data exposure.
- Negative Testing: invalid inputs, workflows, payloads, corrupted requests, unsupported actions, invalid permissions, missing dependencies, invalid state manipulations.

UI/UX VALIDATION REQUIREMENTS:
If UI exists in the PRD, generate test cases for button visibility, positioning, alignment, label clarity, disabled state, hover state, focus state, active state, click response, loading state, hover animation, click animation, ripple effects, smooth transitions, visual feedback, micro-interactions, loading indicators, success animations, error animations, CTA visibility, CTA prominence, CTA placement, user engagement cues, visual hierarchy, user attention flow, attractive button design, visual consistency, user confidence indicators, progress indicators, empty-state experience, success-state experience, keyboard navigation, focus indicators, color contrast, screen reader compatibility, ARIA labels, and touch target size.

FIELD VALIDATION RULES:
For every field, generate checks for required/optional, null, empty, whitespace-only, min/max length, allowed/disallowed characters, numeric, alphabetic, alphanumeric, regex, Unicode, duplicates, case sensitivity, trimming, copy-paste, and defaults.

API TESTING:
If APIs exist, cover methods, headers, authorization, authentication, content-type, missing/null/invalid fields, nested objects, arrays, booleans, enum values, date/time formats, unexpected properties, malformed JSON, status codes, schemas, error messages, error codes, pagination, sorting/filtering, response consistency, response time, expired/invalid tokens, RBAC, rate limits, sensitive data exposure, timeouts, retries, concurrency, idempotency, network failure recovery, and partial processing.

UI TESTING:
If UI exists, validate visibility, alignment, responsiveness, navigation, error placement, help/tooltips, accessibility basics, button states, loading indicators, session handling, and browser compatibility.

INTEGRATION/DATA/NON-FUNCTIONAL:
Cover frontend-backend, DB updates, third-party integrations, notifications, queues, async/event workflows, persistence, rollback, duplicate prevention, synchronization, audit logs, encryption, soft/hard delete, masking, performance, load, stress, scalability, reliability, recovery, accessibility, localization, and compatibility.

AUTOMATION EXPANSION:
In automation recommendations, include framework-ready guidance for UI (Cypress, WebdriverIO), API (Rest Assured, Karate, Postman Collection, Newman, Supertest, Requests + Pytest), and BDD (Cucumber, Gherkin) in addition to Java Selenium, Python Selenium, and Playwright when suitable.

REQUIREMENT GAP ANALYSIS:
If the specification is incomplete or ambiguous, include a short "Requirement Gap Analysis" section before the test table listing missing requirements, unclear logic, additional validations, operational risks, and clarification points.

OUTPUT QUALITY:
Generate enterprise-grade, structured, detailed, non-duplicative, execution-ready, traceable, risk-focused, automation-friendly test cases. Never skip negative tests, edge cases, abuse scenarios, frontend/backend validation, API validation, UI/UX validation, accessibility validation, or realistic test data.
`;
    },

    // Composition of the "Super Prompt" based on framework files
    composePrompt(prdText, autoLang = 'JAVA') {
        const trimmed = prdText.trim().toLowerCase();
        const conversationalTriggers = ['hi', 'hello', 'hey', 'test', 'how are you', 'good morning', 'who are you', 'what can you do', 'good evening', 'thanks'];
        if (trimmed.length < 25 || conversationalTriggers.includes(trimmed) || /^(hi|hello)\b/i.test(trimmed)) {
            return `
[SYSTEM_ROLE]
You are a Senior QA Test Architect AI, operating inside the 'TestPlan Orchestrator Cloud' environment.
The user just sent you a conversational message or a very short, non-PRD input. 
Your goal is to warmly acknowledge them, explain that you are an Elite AI Orchestrator designed to analyze software PRDs, API Specs, and Acceptance Criteria to generate exhaustive, audit-ready Test Plans, Scenarios, Test Cases, and Automation Scripts.

USER INPUT:
"${prdText}"

INSTRUCTIONS:
Simply reply conversationally. Do NOT output any test case tables. Wrap your entire conversational reply in [CONVERSATIONAL_START] and [CONVERSATIONAL_END] markers.
`;
        }

        return `
[SYSTEM_ROLE]
${this.enterpriseQAPromptBody()}

OUTPUT RULES:
1. You MUST return the response in these exact sections and markers:
   [PRD_ANALYSIS_START]
   PRD Analysis Summary only. Include product understanding, requirement breakdown, and component discovery.
   [PRD_ANALYSIS_END]
   [GAP_ANALYSIS_START]
   Requirement Gap Analysis only. Include missing requirements, ambiguities, missing validations, missing API contracts, missing UX details, and recommendations.
   [GAP_ANALYSIS_END]
   [TEST_STRATEGY_START]
   Test Strategy only. Cover functional, validation, API, UI, UX, security, integration, database, performance, accessibility, compatibility, exploratory, and black-box testing.
   [TEST_STRATEGY_END]
   [RISK_ASSESSMENT_START]
   Risk Assessment only. Include business, technical, security, integration, performance, accessibility, and operational risks.
   [RISK_ASSESSMENT_END]
   [TEST_CASES_START]
   One enterprise markdown test-case table using exactly the mandatory columns and order.
   [TEST_CASES_END]
   [COVERAGE_MATRIX_START]
   Coverage Matrix only. Map requirements, modules, components, risks, and test types to generated test case IDs.
   [COVERAGE_MATRIX_END]
   [AUTOMATION_START]
   Automation Recommendations only. Include candidates, priority, framework/language fit (${autoLang}), smoke/regression split, CI notes, and non-automatable cases.
   [AUTOMATION_END]
2. Generate test cases by studying the provided PRD/API specification only. Do not use demo URLs, localhost URLs, admin@emudhra.com, admin123, or any example data unless those values are explicitly present in the PRD.
3. Test Steps must be logical, execution-ready, and specific to the PRD/API flow. For API requirements, steps must include endpoint, method, headers, request payload, and validation of response/status/body. For UI requirements, steps must follow the PRD-described UI flow only.
4. Separate security cases under a final dedicated section titled "SECURITY TEST CASES" inside the Test Cases section.
5. Populate every field intelligently. Keep Actual Result, Status, Executed By, Execution Date, and Defect ID defaults as instructed when not executed.
6. Avoid duplicate rows.
7. Final deliverables must appear in this order: PRD Analysis Summary, Requirement Gap Analysis, Test Strategy, Risk Assessment, Comprehensive Test Cases, Coverage Matrix, Automation Recommendations.
8. Comprehensive Test Cases must be exhaustive and PRD-specific, not a short/demo list. For every detected module, workflow, form, API, role, and acceptance criterion, include positive, negative, boundary, null/empty/whitespace, invalid format/type, authorization, session/security, UI/UX, accessibility, performance, compatibility, error handling, state-transition, and data-integrity coverage as applicable.
9. If the input contains "UNIT TEST CASE GENERATOR FLOW INPUT", treat it as supplemental evidence only. Use it to enrich UI steps, expected results, and actual-result reasoning; never use it to narrow the suite, replace PRD/API analysis, or reduce the Comprehensive Test Cases section to only that flow.
10. Minimum test-case volume: for a real PRD/API/user-story input over 500 characters, generate at least 60 distinct enterprise test cases; for 200-500 characters, generate at least 35 cases. Never stop after only a few rows. Expand each requirement into functional, negative, validation, boundary, security, integration, data, accessibility, performance, and error-handling cases.

USER INPUT:
"""
${prdText}
"""
`;
    },

    // Truncate large inputs to avoid context-window overflow on JSON/API generation calls.
    // Keeps the opening sections (overview, requirements, API definitions) which are most useful.
    truncateInput(text, maxChars = 28000) {
        if (!text || text.length <= maxChars) return text;
        return text.slice(0, maxChars) + '\n\n[... Document truncated to fit context window. Remaining content omitted ...]';
    },

    composeJSONPrompt(problem) {
        // Use a focused, conflict-free prompt — no enterpriseQAPromptBody() here because
        // that body instructs the model to output multi-section text, which causes JSON.parse to fail.
        const truncated = this.truncateInput(problem);
        return `You are a senior QA engineer. Analyze the requirement / PRD below and generate comprehensive enterprise-grade test cases.

REQUIREMENT / PRD:
"""
${truncated}
"""

MANDATORY OUTPUT: Return ONLY a single valid JSON object — no explanation, no markdown fences, no text before or after.

Required JSON structure:
{
  "testCases": [
    "<header-row>",
    "<separator-row>",
    "<test-case-row>",
    ...
  ]
}

Rules:
- "testCases" is an array of pipe-separated row strings (21 columns each).
- Row 1 (header): ${this.enterpriseTestCaseColumns()}
- Row 2 (separator): | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
- Rows 3+: one test case per row, pipe-separated, matching the 21 columns in order.
- Default field values: Actual Result = "Not Executed" | Status = "Not Run" | Executed By = "TBD" | Execution Date = "TBD" | Defect ID = "N/A"
- Coverage: functional (happy path), negative (invalid inputs, missing fields, wrong types), boundary (min/max/empty/null), security (auth bypass, token expiry, injection), API (valid/invalid payloads, status codes) if APIs present, UI/UX if UI present.
- Generate at least 40 distinct rows for a real PRD. No duplicate scenarios.
- Output ONLY the JSON — nothing else.`;
    },

    async generateJSON(problem, modelConfig) {
        const engine = modelConfig.current;
        const config = modelConfig.data[engine] || {};

        if (!config || (engine !== 'ollama' && !config.apiKey)) {
            throw new Error(`API key missing for ${engine.toUpperCase()}. Please configure it in Dashboard settings.`);
        }

        const prompt = this.composeJSONPrompt(problem);

        let baseUrl = (config.baseUrl || '').trim();
        if (engine !== 'gemini') {
            if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            if (engine === 'ollama' && !baseUrl.endsWith('/v1') && !baseUrl.endsWith('/api')) {
                baseUrl += '/v1';
            }
        }

        const callConfig = { ...config, baseUrl: baseUrl };

        let result;
        switch (engine) {
            case 'mistral':
            case 'ollama':
            case 'openai':
                result = await this.callOpenAICompatible(prompt, callConfig, null, engine.toUpperCase());
                break;
            case 'sarvam':
                result = await this.callSarvam(prompt, callConfig, null);
                break;
            case 'gemini':
                result = await this.callGemini(prompt, callConfig, null);
                break;
            case 'huggingface':
                result = await this.callHuggingFace(prompt, callConfig, null);
                break;
            case 'anthropic':
                result = await this.callAnthropic(prompt, callConfig, null);
                break;
            default:
                throw new Error('Unknown AI Engine selected.');
        }

        // Strip markdown fences and normalize the response
        let cleaned = result.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
        else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = this.normalizeAIJsonResponse(cleaned);

        // Extract outermost JSON object even when LLM adds surrounding text
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
        }

        try {
            return JSON.parse(cleaned.trim());
        } catch (e) {
            console.error('Failed to parse JSON from AI:', cleaned);
            throw new Error('AI returned invalid JSON. Try a different model or simplify your input.');
        }
    },

    normalizeAIJsonResponse(rawJson) {
        let cleaned = rawJson.trim();

        // Remove markdown fences if present
        cleaned = cleaned.replace(/```(?:json)?/gi, '');

        // Remove trailing commas before objects/arrays
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

        // Expand repeat expressions like "a".repeat(8)
        cleaned = cleaned.replace(/(["'])(.*?)\1\s*\.repeat\(\s*(\d+)\s*\)/gi, (_, quote, text, count) => {
            count = Number(count) || 0;
            return quote + text.repeat(count) + quote;
        });

        // Expand concatenated repeat expressions like "a" + "b".repeat(7)
        cleaned = cleaned.replace(/(["'])(.*?)\1\s*\+\s*(["'])(.*?)\3\.repeat\(\s*(\d+)\s*\)/gi,
            (_, q1, a, q2, b, count) => q1 + a + b.repeat(Number(count) || 0) + q1);

        // Normalize single quotes to double quotes for JSON compatibility when safe
        cleaned = cleaned.replace(/(\{|,|\[|:)\s*'([^']*?)'/g, '$1"$2"');

        // Remove stray JS-style comments
        cleaned = cleaned.replace(/\/\/.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

        return cleaned;
    },

    // Send a fully pre-composed prompt directly to the engine without any additional wrapping.
    // Use this whenever the caller (e.g. API test generation) has already built its own prompt.
    async generateWithPrompt(customPrompt, modelConfig, onChunk) {
        const engine = modelConfig.current;
        const config = modelConfig.data[engine] || {};

        if (!config || (engine !== 'ollama' && !config.apiKey)) {
            throw new Error(`API key missing for ${engine.toUpperCase()}. Please configure it in Dashboard settings.`);
        }

        let baseUrl = (config.baseUrl || '').trim();
        if (engine !== 'gemini') {
            if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            if (engine === 'ollama' && !baseUrl.endsWith('/v1') && !baseUrl.endsWith('/api')) baseUrl += '/v1';
        }
        const callConfig = { ...config, baseUrl, version: config.version };

        switch (engine) {
            case 'mistral':
            case 'ollama':
            case 'openai':
                return await this.callOpenAICompatible(customPrompt, callConfig, onChunk, engine.toUpperCase());
            case 'sarvam':
                return await this.callSarvam(customPrompt, callConfig, onChunk);
            case 'gemini':
                return await this.callGemini(customPrompt, callConfig, onChunk);
            case 'huggingface':
                return await this.callHuggingFace(customPrompt, callConfig, onChunk);
            case 'anthropic':
                return await this.callAnthropic(customPrompt, callConfig, onChunk);
            default:
                throw new Error('Unknown AI Engine selected.');
        }
    },

    async generate(prdText, modelConfig, onChunk, autoLang = 'JAVA') {
        const prompt = this.composePrompt(prdText, autoLang);
        const engine = modelConfig.current; 
        const config = modelConfig.data[engine] || {};
        
        // Normalize URL (ensure http://, remove trailing slash)
        // Gemini doesn't use baseUrl, so skip normalization for it
        let baseUrl = (config.baseUrl || '').trim();
        if (engine !== 'gemini') {
            if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
            if (engine === 'ollama' && !baseUrl.endsWith('/v1') && !baseUrl.endsWith('/api')) {
                baseUrl += '/v1';
            }
        }

        const callConfig = { 
            ...config, 
            baseUrl: baseUrl,
            version: config.version 
        };

        if (!config || (engine !== 'ollama' && !config.apiKey)) {
            throw new Error(`API key missing for ${engine.toUpperCase()}. Please check Dashboard settings.`);
        }

        switch (engine) {
            case 'mistral':
            case 'ollama':
            case 'openai':
                return await this.callOpenAICompatible(prompt, callConfig, onChunk, engine.toUpperCase());
            case 'sarvam':
                return await this.callSarvam(prompt, callConfig, onChunk);
            case 'gemini':
                return await this.callGemini(prompt, callConfig, onChunk);
            case 'huggingface':
                return await this.callHuggingFace(prompt, callConfig, onChunk);
            case 'anthropic':
                return await this.callAnthropic(prompt, callConfig, onChunk);
            default:
                throw new Error('Unknown AI Engine selected.');
        }
    },

    async callSarvam(prompt, config, onChunk) {
        const relayUrl = 'http://127.0.0.1:11435';
        const baseUrl = (config.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
        const targetUrl = `${baseUrl}/v1/chat/completions`;
        
        try {
            const body = {
                model: config.version || 'sarvam-2b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                stream: !!onChunk
            };

            const response = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'api-subscription-key': config.apiKey,
                    'Content-Type': 'application/json',
                    'X-Target-Url': targetUrl
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Sarvam AI API Error: ${errData.error?.message || response.statusText}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const data = line.trim().slice(6);
                            if (data === '[DONE]') break;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    fullText += content;
                                    onChunk(content);
                                }
                            } catch (e) {}
                        }
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error('Connection to Sarvam AI failed. Ensure the Relay server is running on port 11435.');
            }
            throw err;
        }
    },

    async callOpenAICompatible(prompt, config, onChunk, engineName) {
        const url = `${config.baseUrl}/chat/completions`;
        
        // Ollama specific optimizations for memory
        const options = {};
        if (engineName === 'OLLAMA') {
            options.num_ctx = 32768; // Large PRDs plus exhaustive enterprise output.
            options.num_predict = 12000;
            options.keep_alive = '5m'; // Unload after 5 mins of inactivity
            options.temperature = 0.1;
        }

        try {
            const body = {
                model: config.version || (engineName === 'OLLAMA' ? 'llama3' : 'gpt-4o'),
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 16384,
                stream: !!onChunk
            };

            // Merge Ollama options if needed
            if (engineName === 'OLLAMA') {
                body.options = options;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`${engineName} API Error: ${errData.error?.message || response.statusText}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const data = line.trim().slice(6);
                            if (data === '[DONE]') break;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullText += content;
                                    onChunk(content);
                                }
                            } catch (e) {}
                        }
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error(`Connection to ${engineName} failed. Please check if ${config.baseUrl} is reachable.`);
            }
            throw err;
        }
    },

    // --- GEMINI API ---
    async callGemini(prompt, config, onChunk) {
        const modelId = config.version || 'gemini-1.5-pro';
        const apiKey = config.apiKey;
        
        if (!apiKey) {
            throw new Error('Gemini API key is missing. Please add it in Dashboard settings.');
        }

        const apiVersions = ['v1', 'v1beta'];
        const methods = ['generateText', 'generateContent'];
        const tryBody = (method) => {
            if (method === 'generateText') {
                return {
                    text: prompt,
                    temperature: 0.1,
                    maxOutputTokens: 16384
                };
            }
            return {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 16384
                }
            };
        };

        let lastError;
        for (const apiVersion of apiVersions) {
            for (const method of methods) {
                const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:${method}?key=${encodeURIComponent(apiKey)}`;
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(tryBody(method))
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const errMessage = errData.error?.message || errData.error_description || response.statusText;

                        if (response.status === 404 && method === 'generateContent') {
                            lastError = new Error(`Gemini Error 404: ${modelId} does not support generateContent on ${apiVersion}. Trying the next endpoint.`);
                            continue;
                        }
                        if (response.status === 404 && method === 'generateText') {
                            lastError = new Error(`Gemini Error 404: ${modelId} does not support generateText on ${apiVersion}. Trying the next endpoint.`);
                            continue;
                        }
                        if (response.status === 400) {
                            throw new Error(`Gemini Error: ${errMessage}`);
                        }
                        if (response.status === 401 || response.status === 403) {
                            throw new Error('Invalid Gemini API Key or insufficient permissions.');
                        }
                        throw new Error(`Gemini API Error ${response.status}: ${errMessage}`);
                    }

                    const data = await response.json();
                    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || data.output?.text || '';
                    if (onChunk && fullText) {
                        onChunk(fullText);
                    }
                    return fullText;
                } catch (err) {
                    if (err.message.includes('Failed to fetch')) {
                        throw new Error(`Connection to Gemini API failed. Check your network connectivity. ${err.message}`);
                    }
                    lastError = err;
                }
            }
        }

        throw lastError || new Error('Gemini request failed.');
    },

    // --- HUGGING FACE INFERENCE API ---
    async callHuggingFace(prompt, config, onChunk) {
        const modelId = config.version || 'meta-llama/Llama-3.3-70B-Instruct';
        const targetUrl = `https://router.huggingface.co/v1/chat/completions`;
        const relayUrl = 'http://127.0.0.1:11435';

        try {
            const body = {
                model: modelId,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 16384,
                stream: !!onChunk
            };

            const response = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Target-Url': targetUrl
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 503) {
                    throw new Error(`HUGGINGFACE Model Loading: ${errData.error || 'Model is loading, please try again in a few seconds.'}`);
                }
                throw new Error(`HUGGINGFACE API Error: ${errData.error || response.statusText}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const data = line.trim().slice(6);
                            if (data === '[DONE]') break;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    fullText += content;
                                    onChunk(content);
                                }
                            } catch (e) {}
                        }
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.choices?.[0]?.message?.content || data[0]?.generated_text || '';
            }
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error('Connection to Hugging Face API failed. Please check your internet connection or ensure the Relay server is running.');
            }
            throw err;
        }
    },

    // Normalize Anthropic URL to always include /v1/messages
    normalizeAnthropicUrl(url) {
        let target = (url || 'https://api.anthropic.com').trim();
        if (!target.startsWith('http')) target = 'https://' + target;
        if (target.endsWith('/')) target = target.slice(0, -1);
        
        if (!target.endsWith('/v1/messages')) {
            if (target.endsWith('/v1')) {
                target += '/messages';
            } else {
                target += '/v1/messages';
            }
        }
        return target;
    },

    // --- ANTHROPIC CLAUDE API ---
    async callAnthropic(prompt, config, onChunk) {
        const modelId = config.version && config.version !== 'default' ? config.version : 'claude-3-5-sonnet-20241022';
        // Use relay to bypass CORS; relay forwards to Anthropic
        const relayUrl = 'http://127.0.0.1:11435';
        
        // Respect baseUrl if user provided a custom one in settings, otherwise use official
        const targetUrl = this.normalizeAnthropicUrl(config.baseUrl);

        try {
            const body = {
                model: modelId,
                max_tokens: 16000,
                messages: [{ role: 'user', content: prompt }],
                stream: !!onChunk
            };

            const response = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                    'X-Target-Url': targetUrl,
                    'X-Auth-Mode': 'anthropic'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 401) throw new Error('ANTHROPIC: Invalid API Key. Please check your Claude API key.');
                if (response.status === 429) throw new Error('ANTHROPIC: Rate limit exceeded. Please wait and try again.');
                throw new Error(`ANTHROPIC API Error: ${errData.error?.message || response.statusText}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('data: ')) {
                            const data = line.trim().slice(6);
                            if (data === '[DONE]' || data === 'event: message_stop') break;
                            try {
                                const json = JSON.parse(data);
                                // Anthropic streaming: content_block_delta event
                                const content = json.delta?.text || json.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    fullText += content;
                                    onChunk(content);
                                }
                            } catch (e) {}
                        }
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                // Anthropic non-streaming response
                return data.content?.[0]?.text || data.choices?.[0]?.message?.content || '';
            }
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error('Connection to Anthropic API failed. Ensure the Relay server is running on port 11435.');
            }
            throw err;
        }
    },

    async checkAnthropic(config) {
        try {
            const relayUrl = 'http://127.0.0.1:11435';
            // Minimal token request to verify key
            const res = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                    'X-Target-Url': this.normalizeAnthropicUrl(config.baseUrl),
                    'X-Auth-Mode': 'anthropic'
                },
                body: JSON.stringify({
                    model: config.version && config.version !== 'default' ? config.version : 'claude-3-5-haiku-20241022',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'hi' }]
                })
            });
            if (res.ok) return { status: 'active', message: 'Claude Ready' };
            if (res.status === 401) return { status: 'inactive', message: 'Invalid Claude API Key' };
            if (res.status === 403) return { status: 'inactive', message: 'Claude API: Permission Denied' };
            return { status: 'inactive', message: `Claude Error ${res.status}` };
        } catch (e) {
            return { status: 'inactive', message: 'Unreachable (Check Relay Server)' };
        }
    },

    async checkSarvam(config) {
        try {
            const relayUrl = 'http://127.0.0.1:11435';
            const baseUrl = (config.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
            const targetUrl = `${baseUrl}/v1/chat/completions`;
            const apiKey = config.apiKey || '';

            // Reject if key looks like a URL (old bad config)
            if (!apiKey || apiKey.startsWith('http')) {
                return { status: 'inactive', message: 'Invalid API Key — check configuration' };
            }
            
            const res = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'api-subscription-key': apiKey,
                    'Content-Type': 'application/json',
                    'X-Target-Url': targetUrl
                },
                body: JSON.stringify({
                    model: config.version || 'sarvam-m',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'hi' }]
                })
            });
            
            if (res.ok) return { status: 'active', message: '🇮🇳 Sarvam AI Ready' };
            if (res.status === 401 || res.status === 403) return { status: 'inactive', message: 'Invalid Sarvam API Key' };
            if (res.status === 422) return { status: 'inactive', message: 'Sarvam: Invalid model/request' };
            const errText = await res.text().catch(() => '');
            return { status: 'inactive', message: `Sarvam Error ${res.status}` };
        } catch (e) {
            if (e.message && e.message.includes('Failed to fetch')) {
                return { status: 'inactive', message: 'Relay server offline (port 11435)' };
            }
            return { status: 'inactive', message: 'Unreachable: ' + (e.message || 'unknown') };
        }
    },

    // Compose API-specific test prompt for endpoints detected in PRD
    composeAPITestPrompt(apiSpec, autoLang = 'JAVA') {
        // Truncate large inputs — API generation prompts are strict JSON-output calls
        // that need output budget; oversized inputs leave no room for the response.
        const truncatedSpec = this.truncateInput(apiSpec);
        return `
[SYSTEM_ROLE]
You are a Principal API Test Architect specializing in REST API validation, contract testing, and security testing.

[TASK]
Analyze the following API specification or PRD containing API information and generate comprehensive API test cases.
Apply enterprise QA analysis: infer hidden requirements, identify requirement gaps, validate every payload field, and include positive, negative, boundary, equivalence partition, decision-table, state-transition, syntax, random mutation, reliability, integration, and security-oriented black-box coverage.
Always include authentication, authorization/RBAC, expired and invalid tokens, rate limiting, sensitive-data exposure, malformed JSON, unexpected properties, idempotency, retry, timeout, concurrent request, network interruption, and partial-processing scenarios where relevant.
If explicit API endpoint definitions are not found, infer likely REST endpoints from the described features, user actions, and business workflows in the document.

API INPUT:
"""
${truncatedSpec}
"""

[MANDATORY OUTPUT]
Generate a JSON object with the following structure:
{
  "endpoints": [
    {
      "id": "API-TC-001",
      "method": "POST",
      "endpoint": "/api/v1/users",
      "description": "Create new user",
      "testCases": [
        {
          "id": "API-TC-001-01",
          "type": "positive",
          "description": "Create user with valid payload",
          "request": {
            "method": "POST",
            "url": "/api/v1/users",
            "headers": {"Content-Type": "application/json", "Authorization": "Bearer {token}"},
            "body": {"name": "John Doe", "email": "john@emudhra.com", "role": "user"}
          },
          "expectedResponse": {
            "statusCode": 201,
            "body": {"id": "uuid", "name": "John Doe", "status": "active"}
          }
        },
        {
          "id": "API-TC-001-02",
          "type": "negative",
          "description": "Missing required email field",
          "request": {
            "method": "POST",
            "url": "/api/v1/users",
            "headers": {"Content-Type": "application/json"},
            "body": {"name": "John Doe"}
          },
          "expectedResponse": {
            "statusCode": 400,
            "body": {"error": "email is required", "code": "VALIDATION_ERROR"}
          }
        }
      ]
    }
  ]
}

Generate at least 8-12 test cases per endpoint covering: positive, negative, security (auth), boundary, error, and data-validation scenarios.
For every endpoint with a body/query/path parameter, include separate validation cases for missing required field, null field value, empty string, whitespace-only value, invalid format, invalid data type, min/max length or value, duplicate value, unsupported extra field, malformed JSON, and invalid enum where applicable.
Use exact request payload values such as null, "", "   ", invalid-email, -1, oversized strings, duplicate IDs/emails, and unsupported enum values.
Populate realistic request headers, payloads, expected status codes, response schemas, error codes, response-time expectations, and business-risk focused descriptions.
Output ONLY valid JSON. No explanations outside JSON.
`;
    },

    // Extract API endpoints from PRD text — handles explicit specs and prose banking/enterprise docs.
    extractAPISpec(prdText) {
        const endpoints = [];
        const seen = new Set();
        const addEp = (method, path) => {
            const key = `${method}:${path}`;
            if (!seen.has(key)) { seen.add(key); endpoints.push({ method, path }); }
        };

        let match;

        // Pattern 1: Explicit HTTP method + path (GET /api/users)
        const methodPattern = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([/][a-zA-Z0-9/_{}?=&.-]+)/gi;
        while ((match = methodPattern.exec(prdText)) !== null) {
            addEp(match[1].toUpperCase(), match[2]);
        }

        // Pattern 2: endpoint/url/path/route keyword before a /path
        const urlPattern = /(?:endpoint|url|path|route|api)["']?\s*[:=]\s*["']?([/][a-zA-Z0-9/_{}?=&.-]+)/gi;
        while ((match = urlPattern.exec(prdText)) !== null) {
            addEp('GET', match[1]);
        }

        // Pattern 3: /api/... or /v1/... or /v2/... paths mentioned anywhere in prose
        const apiPathPattern = /\b(\/(?:api|v[0-9]+|rest|service|services|auth|user|users|account|accounts|payment|payments|transaction|transactions|login|logout|register|token|refresh|otp|kyc|onboard)[/a-zA-Z0-9_{}?=&.-]*)/g;
        while ((match = apiPathPattern.exec(prdText)) !== null) {
            const path = match[1];
            if (path.length > 4) addEp('POST', path);
        }

        // Pattern 4: Infer endpoints from banking/enterprise feature keywords when no paths found
        if (endpoints.length === 0) {
            const featureKeywords = [
                ['login', '/api/auth/login', 'POST'],
                ['logout', '/api/auth/logout', 'POST'],
                ['register', '/api/user/register', 'POST'],
                ['otp', '/api/auth/otp/verify', 'POST'],
                ['password reset', '/api/auth/password/reset', 'POST'],
                ['profile', '/api/user/profile', 'GET'],
                ['transaction', '/api/transactions', 'GET'],
                ['payment', '/api/payments', 'POST'],
                ['account', '/api/accounts', 'GET'],
                ['fund transfer', '/api/transfers', 'POST'],
                ['balance', '/api/accounts/balance', 'GET'],
                ['statement', '/api/accounts/statement', 'GET'],
                ['kyc', '/api/kyc/submit', 'POST'],
                ['notification', '/api/notifications', 'GET'],
                ['session', '/api/session/validate', 'POST'],
            ];
            const lowerText = prdText.toLowerCase();
            featureKeywords.forEach(([keyword, path, method]) => {
                if (lowerText.includes(keyword)) addEp(method, path);
            });
        }

        return endpoints;
    },

    unescapeJs(text) {
        return text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    },


    // --- HEALTH CHECKS & VALIDATION ---
    async validateAll(modelsConfig) {
        const results = {};
        const data = modelsConfig.data || modelsConfig;
        for (const engine in data) {
            results[engine] = await this.validateConnection(engine, data[engine]);
        }
        return results;
    },

    async validateConnection(engine, config) {
        try {
            // Sanitize baseUrl (remove trailing slash)
            let sanitizedConfig = { ...config };
            if (sanitizedConfig.baseUrl && sanitizedConfig.baseUrl.endsWith('/')) {
                sanitizedConfig.baseUrl = sanitizedConfig.baseUrl.slice(0, -1);
            }
            if (engine === 'ollama' && sanitizedConfig.baseUrl && !sanitizedConfig.baseUrl.endsWith('/v1') && !sanitizedConfig.baseUrl.endsWith('/api')) {
                sanitizedConfig.baseUrl += '/v1';
            }

            switch (engine) {
                case 'mistral':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'Mistral');
                case 'ollama':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'Ollama');
                case 'openai':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'OpenAI');
                case 'gemini':
                    return await this.checkGemini(sanitizedConfig);
                case 'huggingface':
                    return await this.checkHuggingFace(sanitizedConfig);
                case 'anthropic':
                    return await this.checkAnthropic(sanitizedConfig);
                case 'sarvam':
                    return await this.checkSarvam(sanitizedConfig);
                default:
                    return { status: 'error', message: 'Unknown engine' };
            }
        } catch (err) {
            return { status: 'inactive', message: err.message };
        }
    },

    async checkOpenAICompatible(config, name) {
        let sanitized = { ...config };
        if (!sanitized.baseUrl) {
            sanitized.baseUrl = 'https://api.openai.com/v1';
        }
        if (!sanitized.baseUrl.startsWith('http')) {
            sanitized.baseUrl = `https://${sanitized.baseUrl}`;
        }
        if (sanitized.baseUrl.endsWith('/')) {
            sanitized.baseUrl = sanitized.baseUrl.slice(0, -1);
        }

        const path = '/models';
        try {
            const url = `${sanitized.baseUrl}${path}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${sanitized.apiKey}` } });
            
            if (res.ok) return { status: 'active', message: `${name} Ready` };
            if (res.status === 401) return { status: 'inactive', message: 'Invalid API Key' };
            
            // Fallback: micro-completion if /models fails due to 404 or CORS, but NOT 401
            const dummy = await fetch(`${sanitized.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sanitized.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: sanitized.version || 'gpt-4o-mini', messages: [{ role:'user', content:'hi' }], max_tokens: 1 })
            });
            if (dummy.ok) return { status: 'active', message: `${name} Ready` };
            if (dummy.status === 401) return { status: 'inactive', message: 'Invalid API Key' };
            return { status: 'inactive', message: `${name} Error ${dummy.status}` };
        } catch(e) {
            return { status: 'inactive', message: `Unreachable` };
        }
    },

    async checkGemini(config) {
        try {
            const apiKey = config.apiKey;
            if (!apiKey) return { status: 'inactive', message: 'Missing API Key' };

            const modelId = config.version || 'gemini-1.5-pro';
            const buildUrl = (method) => `https://generativelanguage.googleapis.com/v1/models/${modelId}:${method}?key=${encodeURIComponent(apiKey)}`;
            const body = { text: 'test', temperature: 0.1, maxOutputTokens: 1 };
            const methods = ['generateText', 'generateContent'];

            let lastError;
            for (const method of methods) {
                const url = buildUrl(method);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(method === 'generateText' ? body : {
                        contents: [{ parts: [{ text: 'test' }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                });

                if (response.ok) return { status: 'active', message: 'Gemini Ready' };
                const errData = await response.json().catch(() => ({}));
                const errMessage = errData.error?.message || errData.error_description || '';

                if (response.status === 404 && method === 'generateContent') {
                    lastError = new Error('Gemini model or endpoint unsupported for generateContent; attempting generateText.');
                    continue;
                }
                if (response.status === 400) {
                    if (errMessage.toLowerCase().includes('api key') || errMessage.toLowerCase().includes('invalid')) {
                        return { status: 'inactive', message: 'Invalid Gemini API key. Check project key and Generative AI API access.' };
                    }
                    return { status: 'inactive', message: `Gemini Bad Request: ${errMessage || 'Invalid request payload'}` };
                }
                if (response.status === 401) return { status: 'inactive', message: 'Invalid Gemini API key or permission denied.' };
                if (response.status === 403) {
                    if (errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('permission')) {
                        return { status: 'inactive', message: 'Gemini access denied. Verify quotas, permissions, and API key restrictions.' };
                    }
                    return { status: 'inactive', message: `Gemini Forbidden: ${errMessage || 'Access denied'}` };
                }

                lastError = new Error(`Gemini Error ${response.status}: ${errMessage || 'Unknown error'}`);
                break;
            }

            return { status: 'inactive', message: lastError?.message || 'Gemini validation failed.' };
        } catch (e) {
            console.error('Gemini validation error:', e);
            const details = e?.message ? `: ${e.message}` : '';
            return { status: 'inactive', message: `Unreachable (Connection Error)${details}` };
        }
    },

    async checkHuggingFace(config) {
        try {
            // Using whoami via router/relay to verify token
            const res = await fetch('http://127.0.0.1:11435', {
                headers: { 
                    'Authorization': `Bearer ${config.apiKey}`,
                    'X-Target-Url': 'https://huggingface.co/api/whoami-v2'
                }
            });
            if (res.ok) {
                const data = await res.json();
                return { status: 'active', message: `HF Ready (${data.name || 'User'})` };
            }
            if (res.status === 401) return { status: 'inactive', message: 'Invalid HF Token' };
            return { status: 'inactive', message: `HF Error ${res.status}` };
        } catch(e) {
            return { status: 'inactive', message: 'Unreachable (Check Relay Server or Connection)' };
        }
    },

    async validateJira(config) {
        try {
            // Atlassian Cloud Basic Auth expects email:token base64 encoded
            // Or Bearer token if it's a PAT
            let authHeader = `Bearer ${config.apiKey}`;
            if (config.email && config.email.includes('@')) {
                authHeader = `Basic ` + btoa(`${config.email}:${config.apiKey}`);
            }

            // To support both direct Jira Cloud URLs and admin.atlassian.com standard pings
            // The user supplied https://admin.atlassian.com/ as BaseURL. 
            // We ping a Jira API health endpoint.
            const url = `${config.baseUrl}${config.baseUrl.endsWith('/') ? '' : '/'}rest/api/3/myself`;
            
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                return { status: 'active', message: 'Jira Connected', name: data.displayName || 'User' };
            }
            if (res.status === 401 || res.status === 403) return { status: 'inactive', message: 'Unauthorized (Check API Token or Email)' };
            
            // If the user's admin.atlassian.com URL rejects /rest/api/3/myself because it's not a Jira instance, warn them elegantly.
            let errText = await res.text();
            if (errText.includes('<html') || res.status === 404) {
               return { status: 'inactive', message: 'Connected, but this URL handles Admin tasks, not Jira issues! Please use your project workspace URL (e.g. https://your-company.atlassian.net) to create tickets.' };
            }

            return { status: 'inactive', message: `Jira Error ${res.status}` };
        } catch (err) {
            return { status: 'inactive', message: 'Unreachable (Check URL)' };
        }
    },
    
    async pushToJira(payload, config) {
        let authHeader = `Bearer ${config.apiKey}`;
        if (config.email && config.email.includes('@')) {
            authHeader = `Basic ` + btoa(`${config.email}:${config.apiKey}`);
        }
        
        const url = `${config.baseUrl}${config.baseUrl.endsWith('/') ? '' : '/'}rest/api/2/issue`;
        
        // Convert the markdown tables/scenarios to Jira markup
        const description = payload.testCases 
            ? `Generated Output attached below.\n\n{code}\n${payload.testCases.substring(0, 10000)}\n{code}` 
            : 'No Test Cases attached.';

        const body = {
            fields: {
                project: { key: "QA" }, // Note: We default to QA assuming a common project key
                summary: `[AI Gen] Test Orchestration for ${payload.title}`,
                description: description,
                issuetype: { name: "Task" } // Usually available in all instances
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(()=>({}));
            throw new Error(err.errorMessages ? err.errorMessages[0] : 'Jira connection rejected the ticket. (Verify Project "QA" exists or Issue Type "Task").');
        }
        const data = await res.json();
        return data;
    },

    // Simple parser to extract sections from the LLM return
    parseOutput(rawText) {
        const extract = (start, end) => {
            const regex = new RegExp(`${start}([\\s\\S]*?)${end}`, 'i');
            const match = rawText.match(regex);
            return match ? match[1].trim() : null;
        };
        const findTable = () => {
            const tableStart = rawText.search(/\|\s*(Test Case ID|Module \/ Feature|Requirement ID \/ User Story)\s*\|/i);
            if (tableStart < 0) return null;
            const rest = rawText.slice(tableStart);
            const nextSection = rest.slice(1).search(/\n\s*(?:#{1,4}\s*)?(?:\d+\.\s*)?(Coverage Matrix|Automation Recommendations|Automation|Appendix|Notes)\b/i);
            return (nextSection >= 0 ? rest.slice(0, nextSection + 1) : rest).trim();
        };
        const sectionByHeading = (() => {
            const names = [
                'PRD Analysis Summary',
                'Requirement Gap Analysis',
                'Test Strategy',
                'Risk Assessment',
                'Comprehensive Test Cases',
                'Coverage Matrix',
                'Automation Recommendations'
            ];
            const pattern = new RegExp(`^\\s*(?:#{1,4}\\s*)?(?:\\d+\\.\\s*)?(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b[^\\n]*$`, 'gmi');
            const matches = [];
            let match;
            while ((match = pattern.exec(rawText)) !== null) {
                matches.push({ name: match[1].toLowerCase(), start: match.index, end: pattern.lastIndex });
            }
            const get = (name) => {
                const idx = matches.findIndex(item => item.name === name.toLowerCase());
                if (idx < 0) return null;
                const end = idx + 1 < matches.length ? matches[idx + 1].start : rawText.length;
                return rawText.slice(matches[idx].end, end).trim();
            };
            return get;
        })();

        let conversational = extract('\\[CONVERSATIONAL_START\\]', '\\[CONVERSATIONAL_END\\]');
        let prdAnalysis = extract('\\[PRD_ANALYSIS_START\\]', '\\[PRD_ANALYSIS_END\\]');
        let gapAnalysis = extract('\\[GAP_ANALYSIS_START\\]', '\\[GAP_ANALYSIS_END\\]');
        let testStrategy = extract('\\[TEST_STRATEGY_START\\]', '\\[TEST_STRATEGY_END\\]');
        let riskAssessment = extract('\\[RISK_ASSESSMENT_START\\]', '\\[RISK_ASSESSMENT_END\\]');
        let coverageMatrix = extract('\\[COVERAGE_MATRIX_START\\]', '\\[COVERAGE_MATRIX_END\\]');
        let testPlan = extract('\\[TEST_PLAN_START\\]', '\\[TEST_PLAN_END\\]');
        let scenarios = extract('\\[SCENARIOS_START\\]', '\\[SCENARIOS_END\\]');
        let testCases = extract('\\[TEST_CASES_START\\]', '\\[TEST_CASES_END\\]');
        let automation = extract('\\[AUTOMATION_START\\]', '\\[AUTOMATION_END\\]');

        prdAnalysis = prdAnalysis || sectionByHeading('PRD Analysis Summary');
        gapAnalysis = gapAnalysis || sectionByHeading('Requirement Gap Analysis');
        testStrategy = testStrategy || sectionByHeading('Test Strategy');
        riskAssessment = riskAssessment || sectionByHeading('Risk Assessment');
        coverageMatrix = coverageMatrix || sectionByHeading('Coverage Matrix');
        automation = automation || sectionByHeading('Automation Recommendations');
        testCases = testCases || sectionByHeading('Comprehensive Test Cases') || findTable();

        if (!testPlan && (prdAnalysis || gapAnalysis || testStrategy)) {
            testPlan = [prdAnalysis, gapAnalysis, testStrategy, riskAssessment].filter(Boolean).join('\n\n');
        }

        if (!testCases) {
            testCases = findTable();
        }

        if (!conversational && !prdAnalysis && !testPlan && !testCases && !rawText.includes('[PRD_ANALYSIS_START]') && !rawText.includes('[TEST_PLAN_START]')) {
            const looksLikeQaOutput = /test plan|test case|requirement gap|scenario|precondition|expected result/i.test(rawText);
            if (looksLikeQaOutput) {
                const tableStart = rawText.search(/\|\s*(Test Case ID|Module \/ Feature|Requirement ID)/i);
                if (tableStart >= 0) {
                    prdAnalysis = rawText.slice(0, tableStart).trim();
                    testPlan = prdAnalysis;
                    testCases = rawText.slice(tableStart).trim();
                } else {
                    prdAnalysis = rawText.trim();
                    testPlan = prdAnalysis;
                }
            } else {
                conversational = rawText.trim();
            }
        }

        return {
            conversational: conversational,
            prdAnalysis: prdAnalysis,
            gapAnalysis: gapAnalysis,
            testStrategy: testStrategy,
            riskAssessment: riskAssessment,
            testPlan: testPlan,
            scenarios: scenarios,
            testCases: testCases,
            coverageMatrix: coverageMatrix,
            automation: automation
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIEngine;
}
