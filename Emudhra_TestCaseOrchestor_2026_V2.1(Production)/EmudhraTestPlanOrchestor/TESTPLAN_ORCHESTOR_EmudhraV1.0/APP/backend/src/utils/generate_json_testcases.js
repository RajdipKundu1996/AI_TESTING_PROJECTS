/**
 * Standalone JSON Test Case Generator
 * Usage: node generate_json_testcases.js "Your Problem Description"
 */

const token = process.env.HUGGINGFACE_API_KEY || "";
if (!token) {
    console.error('Set HUGGINGFACE_API_KEY before running this utility.');
    process.exit(1);
}
const relayUrl = "http://127.0.0.1:11435";
const targetUrl = "https://router.huggingface.co/v1/chat/completions";
const modelId = "meta-llama/Llama-3.3-70B-Instruct";

const problem = process.argv[2] || "User Registration System with Email Verification and Password Complexity Rules (minimum 8 chars, 1 uppercase, 1 number, 1 special char)";

async function generateJSONTestCases(problemText) {
    const prompt = `
Your task is to generate high-quality test cases for the given problem.

PROBLEM:
${problemText}

INSTRUCTIONS:
1. Generate comprehensive test cases covering:
   - Basic functionality
   - Edge cases (boundaries, limits)
   - Invalid inputs
   - Corner cases (rare but critical scenarios)
   - Stress cases (large inputs, performance scenarios)

2. Ensure:
   - No duplicate test cases
   - Clear and concise inputs
   - Realistic and meaningful scenarios

3. Think step-by-step internally, but DO NOT output reasoning.

4. Output MUST be strictly valid JSON.

OUTPUT FORMAT:
{
  "basic": [
    {"input": "", "expected_output": ""},
    {"input": "", "expected_output": ""}
  ],
  "edge": [
    {"input": "", "expected_output": ""}
  ],
  "invalid": [
    {"input": "", "expected_output": ""}
  ],
  "stress": [
    {"input": "", "expected_output": ""}
  ]
}

IMPORTANT:
- Do NOT include explanations
- Do NOT include text outside JSON
- Do NOT leave fields empty
`;

    const body = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false
    };

    console.log(`\x1b[36m[Step 1] Initializing JSON Test Case generation...\x1b[0m`);
    console.log(`\x1b[36m[Step 2] Problem: ${problemText}\x1b[0m`);
    console.log(`\x1b[36m[Step 3] Sending request to AI Engine...\x1b[0m`);

    try {
        const response = await fetch(relayUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Target-Url': targetUrl
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`API Error: ${response.status} - ${errData}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || data[0]?.generated_text || '';
        
        // Clean up JSON response if LLM added markdown blocks
        let cleaned = content.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.substring(0, cleaned.length - 3);
        }

        console.log(`\x1b[32m[Step 4] Generation Successful!\x1b[0m`);
        console.log(`\n\x1b[35m=== JSON OUTPUT ===\x1b[0m`);
        console.log(cleaned.trim());
        console.log(`\x1b[35m===================\x1b[0m`);

        // Final validation
        JSON.parse(cleaned.trim());
        console.log(`\n\x1b[32m✅ VALIDATION SUCCESS: Output is strictly valid JSON.\x1b[0m`);

    } catch (err) {
        console.error(`\n\x1b[31m❌ Error:\x1b[0m`, err.message);
        process.exit(1);
    }
}

generateJSONTestCases(problem);
