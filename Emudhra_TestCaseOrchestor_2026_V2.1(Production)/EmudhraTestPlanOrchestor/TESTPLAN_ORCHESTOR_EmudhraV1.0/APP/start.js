const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function openInChrome(url) {
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of chromePaths) {
        if (fs.existsSync(p)) {
            spawn(p, ['--new-window', url], { detached: true, stdio: 'ignore' }).unref();
            console.log(`\n✅ Opened Chrome: ${url}`);
            return;
        }
    }
    // Fallback: use system default handler
    exec(`start "" "${url}"`, (err) => {
        if (!err) console.log(`\n✅ Opened default browser: ${url}`);
    });
}

console.log("=========================================");
console.log("🚀 Starting eMudhra Testplan Orchestrator");
console.log("=========================================\n");

// 1. Start the Relay Server
console.log("Checking for existing processes on ports 11435 and 3000 and freeing them if found...");
try {
    const { execSync } = require('child_process');
    const ports = [11435, 3000, 3001];
    ports.forEach(p => {
        try {
            // Windows: use netstat to find owning PID
            const out = execSync(`netstat -ano | findstr ":${p} \\"`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            lines.forEach(line => {
                const parts = line.split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid)) {
                    try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); console.log(`Killed PID ${pid} on port ${p}`); } catch (e) { /* ignore */ }
                }
            });
        } catch (e) {
            // no listener found or command failed — ignore
        }
    });
} catch (e) {
    // best-effort only
}

try {
    const { execSync } = require('child_process');
    const ports = [11435, 3000, 3001, 3002, 3005];
    const out = execSync('netstat -ano -p tcp', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const currentPid = String(process.pid);
    const pids = new Set();

    out.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && /\bLISTENING\b/i.test(line))
        .forEach(line => {
            const parts = line.split(/\s+/);
            const localAddress = parts[1] || '';
            const pid = parts[parts.length - 1];
            const isTargetPort = ports.some(port => localAddress.endsWith(`:${port}`));
            if (isTargetPort && pid && pid !== currentPid && !Number.isNaN(Number(pid))) {
                pids.add(pid);
            }
        });

    pids.forEach(pid => {
        try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`Killed PID ${pid}`);
        } catch (e) {
            // Best-effort cleanup only.
        }
    });
} catch (e) {
    // Best-effort cleanup only.
}

console.log("Starting CORS Relay Server on port 11435...");
let relay;
(function startRelay() {
  relay = spawn('node', ['backend/src/services/ollama_relay.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  relay.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`[Relay] exited with code ${code} — restarting in 2 s…`);
      setTimeout(startRelay, 2000);
    }
  });
  relay.on('error', (err) => {
    console.error('[Relay] spawn error:', err.message, '— retrying in 2 s…');
    setTimeout(startRelay, 2000);
  });
})();

// 1b. Start the Recorder Backend (Playwright WebSocket bridge on port 3001)
console.log("Starting Recorder Backend on port 3001...");
const recorder = spawn('node', ['backend/src/services/recorder_backend.js'], {
  stdio: 'inherit',
  cwd: __dirname
});
recorder.on('error', () => {
  console.log('[start] recorder_backend.js not started (run: npm install playwright ws && npx playwright install chromium)');
});

// 1c. Start Knowledge API Server (port 3002) — document storage for HLD/LLD + Testing Buddy
console.log("Starting Knowledge API Server on port 3002...");
const knowledgeApi = spawn('node', ['backend/src/services/knowledge_server.js'], { stdio: 'inherit', cwd: __dirname });
knowledgeApi.on('error', (e) => { console.log('[start] knowledge_server.js error:', e.message); });

// 1d. Start Auth Server (port 3005) — user credentials, OTP, registration
console.log("Starting Auth Server on port 3005...");
const authServer = spawn('node', ['backend/src/services/auth_server.js'], { stdio: 'inherit', cwd: __dirname });
authServer.on('error', (e) => { console.log('[start] auth_server.js error:', e.message); });

// 2. Start the HTTP Server
console.log("Starting HTTP Web Server on port 3000...");
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const webRoot = path.join(__dirname, 'frontend');

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://127.0.0.1:3000');
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.normalize(path.join(webRoot, pathname));
    if (!filePath.startsWith(webRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (statErr, stat) => {
        if (statErr || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(3000, '127.0.0.1', () => {
    console.log("Web UI available at http://127.0.0.1:3000");
    setTimeout(() => openInChrome('http://127.0.0.1:3000'), 800);
});

// Note: bind http-server to localhost to avoid external firewall/proxy issues
// use `-a 127.0.0.1` so the server is only reachable on the loopback interface.

process.on('SIGINT', () => {
    console.log("\nShutting down servers...");
    relay.kill();
    recorder.kill();
    try { knowledgeApi.kill(); } catch(e) {}
    try { authServer.kill(); } catch(e) {}
    server.close();
    process.exit();
});
