/**
 * eMudhra QA-Gen AI Orchestrator — Enterprise Start Script v2
 * Serves:  APP/frontend/  as web root (port 3000)
 * Spawns:  APP/backend/src/services/ for relay, recorder, knowledge API
 */
const { spawn, exec } = require('child_process');
const fs   = require('fs');
const http = require('http');
const path = require('path');

const PROJECT_ROOT  = path.join(__dirname, '..');
const FRONTEND_ROOT = path.join(PROJECT_ROOT, 'frontend');
const SERVERS_ROOT  = path.join(PROJECT_ROOT, 'backend', 'src', 'services');

function openInChrome(url) {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      spawn(p, ['--new-window', url], { detached: true, stdio: 'ignore' }).unref();
      console.log('\n✅ Opened Chrome: ' + url);
      return;
    }
  }
  exec('start "" "' + url + '"', (err) => {
    if (!err) console.log('\n✅ Opened default browser: ' + url);
  });
}

console.log('=========================================');
console.log('🚀 Starting eMudhra Testplan Orchestrator');
console.log('=========================================\n');

// Free ports if already occupied
console.log('Checking for existing processes on ports 11435, 3000, 3001...');
try {
  const { execSync } = require('child_process');
  [11435, 3000, 3001].forEach(p => {
    try {
      const out = execSync('netstat -ano | findstr ":' + p + ' "', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      out.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
        const pid = line.split(/\s+/).pop();
        if (pid && !isNaN(pid)) {
          try { execSync('taskkill /PID ' + pid + ' /F', { stdio: 'ignore' }); } catch (_) {}
        }
      });
    } catch (_) {}
  });
} catch (_) {}

// 1. CORS Relay (port 11435)
console.log('Starting CORS Relay Server on port 11435...');
const relay = spawn('node', [path.join(SERVERS_ROOT, 'ollama_relay.js')], {
  stdio: 'inherit', cwd: PROJECT_ROOT,
});

// 2. Recorder Backend — Playwright WebSocket bridge (port 3001)
console.log('Starting Recorder Backend on port 3001...');
const recorder = spawn('node', [path.join(SERVERS_ROOT, 'recorder_backend.js')], {
  stdio: 'inherit', cwd: PROJECT_ROOT,
});
recorder.on('error', () => {
  console.log('[start] recorder_backend not started (run: npm install playwright ws && npx playwright install chromium)');
});

// 3. Knowledge API Server — document storage for HLD/LLD + Testing Buddy (port 3002)
console.log('Starting Knowledge API Server on port 3002...');
const knowledgeApi = spawn('node', [path.join(SERVERS_ROOT, 'knowledge_server.js')], {
  stdio: 'inherit', cwd: PROJECT_ROOT,
});
knowledgeApi.on('error', e => console.log('[start] knowledge_server error:', e.message));

// 4. Static HTTP server — serves APP/frontend/ (port 3000)
console.log('Starting HTTP Web Server on port 3000...');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1:3000');
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.normalize(path.join(FRONTEND_ROOT, pathname));
  if (!filePath.startsWith(FRONTEND_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Web UI available at http://127.0.0.1:3000');
  setTimeout(() => openInChrome('http://127.0.0.1:3000'), 800);
});

process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  relay.kill(); recorder.kill();
  try { knowledgeApi.kill(); } catch (_) {}
  server.close();
  process.exit();
});

