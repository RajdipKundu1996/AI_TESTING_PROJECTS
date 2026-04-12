/**
 * AI Engine — Orchestrator for real-world LLM calls
 * Supports: Groq, Gemini, Ollama
 * Frameworks: BLAST, RICEPOT
 */

const AIEngine = {
    // Composition of the "Super Prompt" based on framework files
    composePrompt(prdText, autoLang = 'JAVA') {
        const trimmed = prdText.trim().toLowerCase();
        const conversationalTriggers = ['hi', 'hello', 'hey', 'test', 'how are you', 'good morning', 'who are you', 'what can you do', 'good evening', 'thanks'];
        if (trimmed.length < 25 || conversationalTriggers.includes(trimmed) || /^(hi|hello)\b/i.test(trimmed)) {
            return `
[SYSTEM_ROLE]
You are a Senior QA Test Architect AI, operating inside the 'TestPlan Orchestrator Cloud' environment.
The user just sent you a conversational message or a very short, non-PRD input. 
Your goal is to warmly acknowledge them, explain that you are an AI Orchestrator designed to analyze software PRDs and generate comprehensive Test Plans, Scenarios, Test Cases, and Automation Scripts using the RICEPOT and BLAST frameworks, and invite them to paste a real requirement document.

USER INPUT:
"${prdText}"

INSTRUCTIONS:
Simply reply conversationally. Do NOT output any test case tables. Do NOT use the Delimiter Requirements.
Wrap your entire conversational reply in [CONVERSATIONAL_START] and [CONVERSATIONAL_END] markers.
`;
        }

        return `
[SYSTEM_ROLE]
You are a Senior QA Test Architect with expertise in PRD analysis, Test Planning, and Test Case Design using the RICEPOT methodology and BLAST framework.

[ANALYSIS_FRAMEWORK: RICEPOT]
- R (Requirements): Extract functional & non-functional requirements.
- I (Interfaces): Identify UI, APIs, and integrations.
- C (Constraints): Identify file formats, login dependencies, and limitations.
- E (Errors): Identify failure scenarios and edge risks.
- P (Performance): Identify output generation and responsiveness goals.
- O (Operations): Identify the end-to-end workflow Login -> Dashboard -> PRD Upload -> Output.
- T (Testability): Identify testable inputs and validation points.

[DESIGN_FRAMEWORK: BLAST]
- B (Business Flow): User journeys for Login, PRD analysis, and Profile/Settings.
- L (Logic Coverage): Decision points for valid/invalid inputs, file validations.
- A (API & Integration): Connection states for JIRA, TestRail, and AI Models.
- S (Security): Negative awareness, unauthorized access, and prompt injection guards.
- T (Technology/UI): UI components, responsiveness, and output rendering accuracy.

USER PRD INPUT TO ANALYZE:
"""
${prdText}
"""

INSTRUCTIONS (MANDATORY):
1. USE ${autoLang.toUpperCase()} EXCLUSIVELY for all automation code. Do NOT under any circumstances use Python if JAVA is requested.
2. Conduct a deep RICEPOT analysis of the PRD above.
3. Formulate a Master Test Plan following professional QA standards.
4. List structured Test Scenarios derived from BLAST.
5. Generate an exhaustive Markdown Table covering all Scenarios. Columns: S.No | Module | Sub-Module | PRD ID | Pre-Conditions | Case ID | Scenario | Steps | Expected | Actual | Status | Tester | Date | Bug ID | Remarks
6. Generate robust, modular automation code in ${autoLang.toUpperCase()}. The script MUST cover EVERY SINGLE test case generated above safely and completely. Include setup, teardown, and well-commented flow-headers.


DELIMITER REQUIREMENTS (CRITICAL):
Wrap each section EXACTLY with these markers:
[TEST_PLAN_START] ... [TEST_PLAN_END]
[SCENARIOS_START] ... [SCENARIOS_END]
[TEST_CASES_START] ... [TEST_CASES_END]
[AUTOMATION_START] ... [AUTOMATION_END]
`;
    },

    async generate(prdText, modelConfig, onChunk, autoLang = 'JAVA') {
        const prompt = this.composePrompt(prdText, autoLang);
        const engine = modelConfig.current; 
        const config = modelConfig.data[engine] || {};
        
        // Normalize URL (ensure http://, remove trailing slash)
        let baseUrl = (config.baseUrl || '').trim();
        if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const callConfig = { 
            ...config, 
            baseUrl: baseUrl,
            version: config.version 
        };

        if (!config || (engine !== 'ollama' && !config.apiKey)) {
            throw new Error(`API key missing for ${engine.toUpperCase()}. Please check Dashboard settings.`);
        }

        switch (engine) {
            case 'openrouter':
            case 'deepseek':
            case 'mistral':
            case 'groq':
                return await this.callOpenAICompatible(prompt, callConfig, onChunk, engine.toUpperCase());
            default:
                throw new Error('Unknown AI Engine selected.');
        }
    },

    async callOpenAICompatible(prompt, config, onChunk, engineName) {
        const url = `${config.baseUrl}/chat/completions`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.version || 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    stream: !!onChunk
                })
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
            const sanitizedConfig = { ...config };
            if (sanitizedConfig.baseUrl && sanitizedConfig.baseUrl.endsWith('/')) {
                sanitizedConfig.baseUrl = sanitizedConfig.baseUrl.slice(0, -1);
            }

            switch (engine) {
                case 'openrouter':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'OpenRouter');
                case 'deepseek':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'DeepSeek');
                case 'mistral':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'Mistral');
                case 'groq':
                    return await this.checkOpenAICompatible(sanitizedConfig, 'Groq');
                default:
                    return { status: 'error', message: 'Unknown engine' };
            }
        } catch (err) {
            return { status: 'inactive', message: err.message };
        }
    },

    async checkOpenAICompatible(config, name) {
        // Different providers use different model endpoint paths
        let path = '/models';
        if (config.baseUrl.includes('openrouter')) path = '/auth/key'; 
        
        try {
            const url = `${config.baseUrl}${path}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
            
            if (res.ok) return { status: 'active', message: `${name} Ready` };
            if (res.status === 401) return { status: 'inactive', message: 'Invalid API Key' };
            
            // Fallback for strict CORS endpoints that block /models (some Deepseek/Mistral configurations)
            // Perform a dummy micro-completion if /models fails due to 404 or CORS, but NOT 401
            const dummy = await fetch(`${config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: config.version, messages: [{ role:'user', content:'hi' }], max_tokens: 1 })
            });
            if (dummy.ok) return { status: 'active', message: `${name} Ready` };
            if (dummy.status === 401) return { status: 'inactive', message: 'Invalid API Key' };
            return { status: 'inactive', message: `${name} Error ${dummy.status}` };
        } catch(e) {
            return { status: 'inactive', message: `Unreachable` };
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

        let conversational = extract('\\[CONVERSATIONAL_START\\]', '\\[CONVERSATIONAL_END\\]');
        if (!conversational && extract('\\[TEST_PLAN_START\\]', '\\[TEST_PLAN_END\\]') == null) {
            if (!rawText.includes('[TEST_PLAN_START]')) {
                conversational = rawText.trim();
            }
        }

        return {
            conversational: conversational,
            testPlan: extract('\\[TEST_PLAN_START\\]', '\\[TEST_PLAN_END\\]'),
            scenarios: extract('\\[SCENARIOS_START\\]', '\\[SCENARIOS_END\\]'),
            testCases: extract('\\[TEST_CASES_START\\]', '\\[TEST_CASES_END\\]'),
            automation: extract('\\[AUTOMATION_START\\]', '\\[AUTOMATION_END\\]')
        };
    }
};
