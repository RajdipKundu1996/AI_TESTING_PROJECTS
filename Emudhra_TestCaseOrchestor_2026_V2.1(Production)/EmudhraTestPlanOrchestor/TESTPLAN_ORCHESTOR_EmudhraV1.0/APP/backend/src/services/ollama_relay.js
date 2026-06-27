/**
 * CORS Relay Server
 * Proxies requests from the frontend to local or remote APIs (Ollama, HuggingFace, Anthropic).
 * Also exposes a lightweight `/mistral_test` endpoint to validate a Mistral API key and list models.
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 11435;
const OLLAMA_TARGET = 'http://127.0.0.1:11434';
const MISTRAL_BASE = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1';
const SERVER_GROQ_KEY = process.env.GROQ_API_KEY || '';

// Server-side API key (optional). Frontend can also send 'x-mistral-key' header to test a key.
const SERVER_MISTRAL_KEY = process.env.MISTRAL_API_KEY || '';

const server = http.createServer((req, res) => {
    // 1. Set CORS Headers for the browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Target-Url, X-Auth-Mode, x-api-key, x-mistral-key, x-huggingface-key, x-sarvam-key, anthropic-version, api-subscription-key');

    // 2. Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 2.b Simple Mistral key tester endpoint
    //    GET /mistral_test  -> will call Mistral /models using either server env key or header 'x-mistral-key'
    if (req.url && req.url.startsWith('/mistral_test')) {
        const keyFromHeader = req.headers['x-mistral-key'] || req.headers['x-api-key'];
        const key = keyFromHeader || SERVER_MISTRAL_KEY;
        if (!key) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing Mistral API key. Provide via server env MISTRAL_API_KEY or x-mistral-key header.' }));
            return;
        }

        let targetUrl;
        try {
            targetUrl = new URL(MISTRAL_BASE + '/models');
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Invalid MISTRAL_BASE URL' }));
            return;
        }

        const client = targetUrl.protocol === 'https:' ? https : http;
        const proxyOptions = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            }
        };

        const apiReq = client.request(proxyOptions, (apiRes) => {
            Object.keys(apiRes.headers).forEach(h => res.setHeader(h, apiRes.headers[h]));
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(apiRes.statusCode || 200);
            apiRes.pipe(res);
        });

        apiReq.on('error', (err) => {
            console.error('Mistral Test Error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: err.message }));
        });

        apiReq.end();
        return;
    }

    // 3. Determine Target URL
    const targetHeader = req.headers['x-target-url'];
    let targetUrl;
    
    try {
        if (targetHeader) {
            targetUrl = new URL(targetHeader);
        } else {
            targetUrl = new URL(OLLAMA_TARGET + req.url);
        }
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid target URL');
        return;
    }

    // 4. Prepare Proxy Request
    const proxyOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: { ...req.headers }
    };
    
    // Remove headers that could interfere
    delete proxyOptions.headers.host;
    delete proxyOptions.headers.origin;
    delete proxyOptions.headers.referer;
    delete proxyOptions.headers['x-target-url'];
    delete proxyOptions.headers['x-auth-mode'];
    // Keep x-api-key and anthropic-version for Anthropic Claude calls
    if (/(\.|^)mistral\.ai$/i.test(targetUrl.hostname) && SERVER_MISTRAL_KEY && !proxyOptions.headers.authorization) {
        proxyOptions.headers.authorization = `Bearer ${SERVER_MISTRAL_KEY}`;
    }
    // Keep Groq credentials on the server so they are never exposed in browser storage.
    if (/(\.|^)api\.groq\.com$/i.test(targetUrl.hostname) && SERVER_GROQ_KEY && !proxyOptions.headers.authorization) {
        proxyOptions.headers.authorization = `Bearer ${SERVER_GROQ_KEY}`;
    }

    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.request(proxyOptions, (proxyRes) => {
        // Expose all response headers
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });
        // Important: Add CORS to response to ensure the browser accepts it
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Relay Error:', err.message, 'Target:', targetUrl.href);
        res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Relay Error: ' + err.message);
    });

    // 5. Pipe original body to proxy
    req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n✅ CORS RELAY ACTIVE`);
    console.log(`-----------------------------------`);
    console.log(`Relay Listening: http://127.0.0.1:${PORT}`);
    console.log(`Default Target:  ${OLLAMA_TARGET}`);
    console.log(`Accepts custom targets via X-Target-Url header`);
    console.log(`-----------------------------------\n`);
});
