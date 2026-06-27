'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const WEB_ROOT = path.join(__dirname, 'frontend');

const services = [
  { name: 'relay', script: 'backend/src/services/ollama_relay.js' },
  { name: 'recorder', script: 'backend/src/services/recorder_backend.js' },
  { name: 'knowledge', script: 'backend/src/services/knowledge_server.js' },
  { name: 'auth', script: 'backend/src/services/auth_server.js' }
];

const children = new Map();

function startChild(service) {
  const child = spawn(process.execPath, [path.join(__dirname, service.script)], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit'
  });
  children.set(service.name, child);
  child.on('exit', (code, signal) => {
    children.delete(service.name);
    if (!shuttingDown) {
      console.error(`[render] ${service.name} exited (${code ?? signal}); restarting in 2 seconds`);
      setTimeout(() => startChild(service), 2000).unref();
    }
  });
}

services.forEach(startChild);

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

const relayHosts = new Set([
  'api.groq.com',
  'api.mistral.ai',
  'api.openai.com',
  'api.anthropic.com',
  'api.sarvam.ai',
  'router.huggingface.co',
  'api-inference.huggingface.co',
  'generativelanguage.googleapis.com',
  ...(process.env.ALLOWED_RELAY_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean)
]);

function proxyRequest(req, res, port, prefix = '') {
  let outgoingPath = req.url;
  if (prefix && outgoingPath.startsWith(prefix)) {
    outgoingPath = outgoingPath.slice(prefix.length) || '/';
  }

  if (port === 11435 && req.headers['x-target-url']) {
    try {
      const target = new URL(req.headers['x-target-url']);
      if (!relayHosts.has(target.hostname.toLowerCase())) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Relay target is not allowed' }));
        return;
      }
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Invalid relay target' }));
      return;
    }
  }

  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const upstream = http.request({
    hostname: '127.0.0.1',
    port,
    path: outgoingPath,
    method: req.method,
    headers
  }, upstreamResponse => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });

  upstream.on('error', error => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Internal service unavailable', detail: error.message }));
  });
  req.pipe(upstream);
}

function isKnowledgePath(pathname) {
  return pathname === '/api/document' ||
    pathname === '/api/documents' ||
    pathname === '/api/search' ||
    pathname.startsWith('/api/document/');
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(WEB_ROOT, decodeURIComponent(requested)));
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ status: 'ok', service: 'nirikshanai' }));
    return;
  }
  if (pathname === '/relay' || pathname.startsWith('/relay/')) {
    proxyRequest(req, res, 11435, '/relay');
    return;
  }
  if (pathname.startsWith('/api/')) {
    proxyRequest(req, res, isKnowledgePath(pathname) ? 3002 : 3005);
    return;
  }
  serveStatic(req, res, pathname);
});

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (pathname !== '/recorder') {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const upstream = net.connect(3001, '127.0.0.1', () => {
    const headers = Object.entries({ ...req.headers, host: '127.0.0.1:3001' })
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n');
    upstream.write(`${req.method} / HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

server.listen(PORT, HOST, () => {
  console.log(`[render] NirikshanAI listening on http://${HOST}:${PORT}`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) child.kill('SIGTERM');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
