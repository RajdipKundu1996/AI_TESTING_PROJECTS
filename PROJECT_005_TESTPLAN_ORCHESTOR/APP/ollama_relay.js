/**
 * Ollama CORS Relay Server
 * This script bypasses browser CORS restrictions by proxying requests 
 * from the frontend (port 3000) to Ollama (port 11434) via a Node server.
 */

const http = require('http');

const PORT = 11435;
const OLLAMA_TARGET = 'http://127.0.0.1:11434';

const server = http.createServer((req, res) => {
    // 1. Set CORS Headers for the browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // 2. Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 3. Prepare Proxy Request
    const proxyOptions = {
        hostname: '127.0.0.1',
        port: 11434,
        path: req.url,
        method: req.method,
        headers: { ...req.headers }
    };
    
    // Remove host header to avoid conflicts
    delete proxyOptions.headers.host;
    delete proxyOptions.headers.origin;
    delete proxyOptions.headers.referer;

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Relay Error:', err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Ollama Relay Error: Is Ollama running? ' + err.message);
    });

    // 4. Pipe original body to proxy
    req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n✅ OLLAMA CORS RELAY ACTIVE`);
    console.log(`-----------------------------------`);
    console.log(`Relay Listening: http://127.0.0.1:${PORT}`);
    console.log(`Forwarding to:  ${OLLAMA_TARGET}`);
    console.log(`-----------------------------------\n`);
});
