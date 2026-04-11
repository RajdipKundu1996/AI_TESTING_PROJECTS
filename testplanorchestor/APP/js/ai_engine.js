/**
 * AI Engine — Orchestrator for real-world LLM calls
 * Supports: Groq, Gemini, Ollama
 * Frameworks: BLAST, RICEPOT
 */

const AIEngine = {
    // Composition of the "Super Prompt" based on framework files
    composePrompt(prdText) {
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

INSTRUCTIONS:
1. Conduct a deep RICEPOT analysis of the PRD above.
2. Formulate a Master Test Plan following professional QA standards.
3. List structured Test Scenarios derived from BLAST.
4. Generate a detailed Test Case table with exactly 15 columns as specified (S.No, Module, Sub-Module, PRD ID, Pre-Conditions, Case ID, Scenario, Steps, Expected, Actual, Status, Tester, Date, Bug ID, Remarks). Use HTML <table> format for the Test Cases.
5. Provide a Java Selenium automation script for the critical path.

DELIMITER REQUIREMENTS (CRITICAL):
Wrap each section EXACTLY with these markers:
[TEST_PLAN_START] ... [TEST_PLAN_END]
[SCENARIOS_START] ... [SCENARIOS_END]
[TEST_CASES_START] ... [TEST_CASES_END]
[AUTOMATION_START] ... [AUTOMATION_END]
`;
    },

    async generate(prdText, modelConfig, onChunk) {
        const prompt = this.composePrompt(prdText);
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
            case 'groq':
                return await this.callGroq(prompt, callConfig, onChunk);
            case 'gemini':
                return await this.callGemini(prompt, callConfig, onChunk);
            case 'ollama':
                return await this.callOllama(prompt, callConfig, onChunk);
            default:
                throw new Error('Unknown AI Engine selected.');
        }
    },

    async callGroq(prompt, config, onChunk) {
        const url = `${config.baseUrl}/chat/completions`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.version || 'llama3-8b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    stream: !!onChunk
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
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
                throw new Error(`Connection to Groq failed. Please check if ${config.baseUrl} is reachable.`);
            }
            throw err;
        }
    },

    async callGemini(prompt, config, onChunk) {
        try {
            const modelId = config.version || 'gemini-1.5-flash';
            const method = onChunk ? 'streamGenerateContent' : 'generateContent';
            const url = `${config.baseUrl}/v1beta/models/${modelId}:${method}?key=${config.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1 }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Gemini API Error: ${errData.error?.message || response.statusText}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    // Gemini stream is a JSON array that updates. Very tricky to parse manually without a stream parser.
                    // A simple regex approach for the text parts in the buffer:
                    const matches = buffer.matchAll(/"text":\s*"([\s\S]*?)"/g);
                    let lastMatchEnd = 0;
                    for (const match of matches) {
                        const newText = this.unescapeJs(match[1]);
                        if (newText.length > fullText.length) {
                            const chunk = newText.slice(fullText.length);
                            fullText += chunk;
                            onChunk(chunk);
                        }
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            }
        } catch (err) {
            if (err.message.includes('Failed to fetch')) {
                throw new Error(`Connection to Gemini failed. Check your internet or Base URL.`);
            }
            throw err;
        }
    },

    unescapeJs(text) {
        return text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    },

    async callOllama(prompt, config, onChunk) {
        const model = config.version || 'gemma3:latest';
        const url = `${config.baseUrl}/api/generate`;
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

        try {
            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ model: model, prompt: prompt, stream: !!onChunk })
            });

            if (!response.ok) {
                // Server responded but with an error (e.g. model not found)
                let errBody = '';
                try { errBody = await response.text(); } catch(_) {}
                const hint = response.status === 404 ? ` Model "${model}" may not be installed. Run: ollama pull ${model}` : '';
                throw new Error(`Ollama Error ${response.status}: ${errBody.slice(0, 120) || response.statusText}.${hint}`);
            }

            if (onChunk) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunkText = decoder.decode(value);
                    const lines = chunkText.split('\n');
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const json = JSON.parse(line);
                            const text = json.response || '';
                            if (text) {
                                fullText += text;
                                onChunk(text);
                            }
                            if (json.done) break;
                        } catch (e) {}
                    }
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.response;
            }
        } catch (err) {
            // Network-level failure — relay is not running or unreachable
            if (err.message.includes('Ollama Error')) throw err;
            console.error('Ollama Network Error:', err);
            throw new Error(`Ollama relay not reachable at ${config.baseUrl}. Make sure ollama_relay.js is running (node APP/ollama_relay.js).`);
        }
    },

    // --- HEALTH CHECKS & VALIDATION ---
    async validateAll(modelsConfig) {
        const results = {};
        for (const engine in modelsConfig) {
            results[engine] = await this.validateConnection(engine, modelsConfig[engine]);
        }
        return results;
    },

    async validateConnection(engine, config) {
        try {
            switch (engine) {
                case 'groq':
                    return await this.checkGroq(config);
                case 'gemini':
                    return await this.checkGemini(config);
                case 'ollama':
                    return await this.checkOllama(config);
                default:
                    return { status: 'error', message: 'Unknown engine' };
            }
        } catch (err) {
            return { status: 'inactive', message: err.message };
        }
    },

    async checkGroq(config) {
        // Ping models endpoint to verify API key
        const url = `${config.baseUrl}/models`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
        if (res.ok) return { status: 'active', message: 'Groq Ready' };
        return { status: 'inactive', message: 'Invalid API Key' };
    },

    async checkGemini(config) {
        // Ping models endpoint to verify API key
        const url = `${config.baseUrl}/v1beta/models?key=${config.apiKey}`;
        const res = await fetch(url);
        if (res.ok) return { status: 'active', message: 'Gemini Ready' };
        return { status: 'inactive', message: 'Invalid API Key' };
    },

    async checkOllama(config) {
        // Ping tags endpoint to see if relay/ollama is up
        const url = `${config.baseUrl}/api/tags`;
        const headers = {};
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        
        try {
            const res = await fetch(url, { headers });
            if (res.ok) return { status: 'active', message: 'Ollama Ready' };
            return { status: 'inactive', message: 'Ollama Service Down' };
        } catch (e) {
            return { status: 'inactive', message: 'Relay unreachable' };
        }
    },

    // Simple parser to extract sections from the LLM return
    parseOutput(rawText) {
        const extract = (start, end) => {
            const regex = new RegExp(`${start}([\\s\\S]*?)${end}`, 'i');
            const match = rawText.match(regex);
            return match ? match[1].trim() : null;
        };

        return {
            testPlan: extract('\\[TEST_PLAN_START\\]', '\\[TEST_PLAN_END\\]'),
            scenarios: extract('\\[SCENARIOS_START\\]', '\\[SCENARIOS_END\\]'),
            testCases: extract('\\[TEST_CASES_START\\]', '\\[TEST_CASES_END\\]'),
            automation: extract('\\[AUTOMATION_START\\]', '\\[AUTOMATION_END\\]')
        };
    }
};
