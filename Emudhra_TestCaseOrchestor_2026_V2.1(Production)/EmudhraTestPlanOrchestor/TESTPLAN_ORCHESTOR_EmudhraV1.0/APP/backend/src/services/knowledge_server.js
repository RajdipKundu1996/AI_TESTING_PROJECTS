/**
 * Knowledge Store API — Document storage for HLD/LLD and Testing Buddy RAG
 * Runs on port 3002 alongside the main server
 * File-based storage (production-ready swap: replace with PostgreSQL + pgvector)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const STORAGE = path.join(process.cwd(), '.knowledge_store');
if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, code, data) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => { chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function simpleKeywordSearch(text, query) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const textLower = text.toLowerCase();
  let score = 0;
  words.forEach(w => { const re = new RegExp(w, 'g'); const m = textLower.match(re); if (m) score += m.length; });
  return score;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(200); res.end(); return; }
  const url = req.url.split('?')[0];

  try {
    // POST /api/document — store document text + analysis
    if (req.method === 'POST' && url === '/api/document') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const doc = { id, name: data.name || 'document', type: data.type || 'text', size: data.size || 0, rawText: data.rawText || '', analysis: data.analysis || {}, storedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(STORAGE, `${id}.json`), JSON.stringify(doc));
      return json(res, 201, { success: true, id });
    }

    // GET /api/documents — list all (meta only)
    if (req.method === 'GET' && url === '/api/documents') {
      const files = fs.readdirSync(STORAGE).filter(f => f.endsWith('.json'));
      const docs = files.map(f => {
        try { const d = JSON.parse(fs.readFileSync(path.join(STORAGE, f))); return { id: d.id, name: d.name, type: d.type, size: d.size, storedAt: d.storedAt }; }
        catch { return null; }
      }).filter(Boolean).sort((a, b) => b.storedAt.localeCompare(a.storedAt));
      return json(res, 200, docs);
    }

    // GET /api/document/:id — get full document
    const docGet = url.match(/^\/api\/document\/([a-z0-9]+)$/);
    if (req.method === 'GET' && docGet) {
      const fp = path.join(STORAGE, `${docGet[1]}.json`);
      if (!fs.existsSync(fp)) return json(res, 404, { error: 'Not found' });
      return json(res, 200, JSON.parse(fs.readFileSync(fp)));
    }

    // POST /api/search — keyword-based semantic search (RAG substitute)
    if (req.method === 'POST' && url === '/api/search') {
      const body = await readBody(req);
      const { query, limit = 3 } = JSON.parse(body);
      const files = fs.readdirSync(STORAGE).filter(f => f.endsWith('.json'));
      const results = files.map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(STORAGE, f)));
          const score = simpleKeywordSearch((d.rawText || '') + JSON.stringify(d.analysis || ''), query);
          return { id: d.id, name: d.name, score, snippet: (d.rawText || '').slice(0, 500) };
        } catch { return null; }
      }).filter(Boolean).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
      return json(res, 200, results);
    }

    // DELETE /api/document/:id
    const docDel = url.match(/^\/api\/document\/([a-z0-9]+)$/);
    if (req.method === 'DELETE' && docDel) {
      const fp = path.join(STORAGE, `${docDel[1]}.json`);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      return json(res, 200, { success: true });
    }

    // DELETE /api/documents — clear all
    if (req.method === 'DELETE' && url === '/api/documents') {
      fs.readdirSync(STORAGE).filter(f => f.endsWith('.json')).forEach(f => fs.unlinkSync(path.join(STORAGE, f)));
      return json(res, 200, { success: true });
    }

    json(res, 404, { error: 'Not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Knowledge API] http://127.0.0.1:${PORT}`);
});
