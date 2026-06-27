const token = process.env.HUGGINGFACE_API_KEY || "";
if (!token) {
    console.error('Set HUGGINGFACE_API_KEY before running this utility.');
    process.exit(1);
}
const proxyUrl = "http://127.0.0.1:11435";
const targetUrl = "https://router.huggingface.co/v1/chat/completions";
const modelId = "meta-llama/Llama-3.3-70B-Instruct";

async function testHuggingFace() {
    console.log(`[Step 1] Initializing test case generation...`);
    const prompt = `Generate a single short test case for a login page in CSV format.`;

    const body = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        stream: false
    };

    console.log(`[Step 2] Sending request to local CORS Relay (${proxyUrl})...`);
    console.log(`         Targeting Hugging Face Router: ${targetUrl}`);
    
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Target-Url': targetUrl
            },
            body: JSON.stringify(body)
        });

        console.log(`[Step 3] Received response from Relay (Status: ${response.status})`);
        
        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`API Error: ${response.status} - ${errData}`);
        }

        const data = await response.json();
        console.log(`[Step 4] Extracting generated content...`);
        const content = data.choices?.[0]?.message?.content || data[0]?.generated_text || '';
        
        if (content) {
            console.log(`\n=== GENERATED OUTPUT ===\n${content}\n========================`);
            console.log(`\n✅ End-to-End Verification SUCCESSFUL! The application CAN use Hugging Face models.`);
        } else {
            console.log(`\n❌ Failed to extract content from response:`, JSON.stringify(data));
        }

    } catch (err) {
        console.error(`\n❌ Test Failed:`, err.message);
    }
}

testHuggingFace();
