/**
 * HLD → LLD Maker — Complete Architecture Intelligence Engine v2
 * PDF.js + Mammoth.js + SheetJS + Mermaid.js + AI Streaming + Knowledge Store
 */

/* ─────────────────────────────────────────────────────────────────────────────
   LIBRARY INIT
   ───────────────────────────────────────────────────────────────────────────── */
(function initLibs() {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#1e3a5f',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#3b82f6',
        lineColor: '#3b82f6',
        secondaryColor: '#0f1e35',
        tertiaryColor: '#0a1628',
        background: '#0a1628',
        mainBkg: '#1e3a5f',
        nodeBorder: '#3b82f6',
        clusterBkg: '#0f1e35',
        titleColor: '#93c5fd',
        edgeLabelBackground: '#1e3a5f',
        fontSize: '13px'
      },
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence: { diagramMarginX: 20, diagramMarginY: 10, actorMargin: 50 }
    });
  }
})();

/* ─────────────────────────────────────────────────────────────────────────────
   DOCUMENT EXTRACTOR
   ───────────────────────────────────────────────────────────────────────────── */
const DocExtractor = {
  async extract(file, onProgress) {
    const ext = file.name.split('.').pop().toLowerCase();
    onProgress && onProgress(10, 'Detecting file type...');
    if (ext === 'pdf') return this._pdf(file, onProgress);
    if (ext === 'docx' || ext === 'doc') return this._docx(file, onProgress);
    if (ext === 'xlsx' || ext === 'xls') return this._xlsx(file, onProgress);
    if (ext === 'csv') return this._csv(file, onProgress);
    if (['txt', 'md', 'text', 'rst'].includes(ext)) return this._text(file, onProgress);
    throw new Error(`Unsupported format: .${ext}`);
  },

  async _pdf(file, onProgress) {
    if (!window.pdfjsLib) throw new Error('PDF.js not loaded. Check your internet connection and reload the page.');
    onProgress && onProgress(15, 'Loading PDF...');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const total = pdf.numPages;
    let text = '';
    for (let i = 1; i <= total; i++) {
      onProgress && onProgress(15 + Math.round((i / total) * 75), `Extracting page ${i} of ${total}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it => it.str).join(' ');
      text += pageText + '\n\n';
    }
    onProgress && onProgress(95, 'Finalizing...');
    if (!text.trim()) throw new Error('PDF appears to be image-only (scanned). Please use a text-based PDF or paste the text manually.');
    return text.trim();
  },

  async _docx(file, onProgress) {
    if (!window.mammoth) throw new Error('Mammoth.js not loaded. Check your internet connection and reload.');
    onProgress && onProgress(30, 'Parsing DOCX...');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    onProgress && onProgress(95, 'Finalizing...');
    if (!result.value.trim()) throw new Error('Document appears to be empty.');
    return result.value.trim();
  },

  async _xlsx(file, onProgress) {
    if (!window.XLSX) throw new Error('SheetJS not loaded. Reload the page.');
    onProgress && onProgress(30, 'Parsing spreadsheet...');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    let text = '';
    wb.SheetNames.forEach((name, i) => {
      onProgress && onProgress(30 + Math.round(((i + 1) / wb.SheetNames.length) * 60), `Processing sheet: ${name}...`);
      const ws = wb.Sheets[name];
      text += `## Sheet: ${name}\n\n`;
      text += XLSX.utils.sheet_to_csv(ws) + '\n\n';
    });
    onProgress && onProgress(95, 'Finalizing...');
    return text.trim();
  },

  async _csv(file, onProgress) {
    onProgress && onProgress(40, 'Reading CSV...');
    const text = await this._readAsText(file);
    onProgress && onProgress(95, 'Finalizing...');
    return text.trim();
  },

  async _text(file, onProgress) {
    onProgress && onProgress(40, 'Reading file...');
    const text = await this._readAsText(file);
    onProgress && onProgress(95, 'Done.');
    return text.trim();
  },

  _readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file, 'utf-8');
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MERMAID RENDERER
   ───────────────────────────────────────────────────────────────────────────── */
const MermaidRenderer = {
  _counter: 0,

  async renderAll(containerEl) {
    if (!window.mermaid) return;
    const blocks = containerEl.querySelectorAll('pre code.language-mermaid, .mermaid-raw');
    for (const block of blocks) {
      await this.renderBlock(block);
    }
    // Also scan for ```mermaid blocks in text nodes that weren't converted
    const preBlocks = containerEl.querySelectorAll('pre');
    for (const pre of preBlocks) {
      const code = pre.querySelector('code');
      if (!code) continue;
      const txt = code.textContent || '';
      if (txt.trim().match(/^(graph|sequenceDiagram|flowchart|erDiagram|gantt|classDiagram|stateDiagram|journey|gitGraph|pie)/i)) {
        await this.renderBlock(pre, txt);
      }
    }
  },

  async renderBlock(el, code) {
    // Read source from the element; use innerHTML-based decode so any stray <br>
    // tags are converted back to newlines (safety net for cached/old content).
    let src = code || '';
    if (!src) {
      const tmp = document.createElement('div');
      tmp.innerHTML = (el.innerHTML || '').replace(/<br\s*\/?>/gi, '\n');
      src = tmp.textContent || el.textContent || '';
    }
    src = sanitizeMermaid(src);
    if (!src.trim()) return;
    const id = 'mermaid-' + (++this._counter) + '-' + Date.now();
    const wrap = document.createElement('div');
    wrap.className = 'mermaid-wrap';
    try {
      const { svg } = await mermaid.render(id, src.trim());
      wrap.innerHTML = `
        <div class="mermaid-svg-wrap">${svg}</div>
        <div class="mermaid-toolbar">
          <button class="mermaid-btn" onclick="MermaidRenderer.copyCode(this)" data-code="${encodeURIComponent(src.trim())}">Copy Mermaid</button>
          <button class="mermaid-btn" onclick="MermaidRenderer.downloadSVG(this)">Download SVG</button>
          <button class="mermaid-btn" onclick="MermaidRenderer.downloadPNG(this)">Download PNG</button>
        </div>`;
      el.parentNode.replaceChild(wrap, el);
    } catch (err) {
      wrap.innerHTML = `<div style="color:#ef4444;font-size:0.74rem;padding:8px">⚠ Diagram render error: ${err.message}</div><pre style="font-size:0.72rem;opacity:0.6">${src.slice(0, 300)}</pre>`;
      el.parentNode.replaceChild(wrap, el);
    }
  },

  copyCode(btn) {
    const code = decodeURIComponent(btn.dataset.code || '');
    navigator.clipboard.writeText(code).then(() => {
      const orig = btn.textContent; btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  },

  downloadSVG(btn) {
    const wrap = btn.closest('.mermaid-wrap');
    const svg = wrap ? wrap.querySelector('svg') : null;
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'diagram.svg'; a.click(); URL.revokeObjectURL(a.href);
  },

  downloadPNG(btn) {
    const wrap = btn.closest('.mermaid-wrap');
    const svg = wrap ? wrap.querySelector('svg') : null;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 800; canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = 'diagram.png'; a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   KNOWLEDGE STORE  (localStorage + backend)
   ───────────────────────────────────────────────────────────────────────────── */
const KnowledgeStore = {
  LS_KEY: 'hld_project_knowledge',
  API: 'http://127.0.0.1:3002',

  save(name, rawText, analysis) {
    const entry = { name, rawText: rawText.slice(0, 50000), analysis, savedAt: new Date().toISOString() };
    try { localStorage.setItem(this.LS_KEY, JSON.stringify(entry)); } catch(e) {}
    // Also push to backend (non-blocking)
    fetch(this.API + '/api/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rawText: rawText.slice(0, 50000), analysis, size: rawText.length })
    }).catch(() => {});
  },

  load() {
    try { return JSON.parse(localStorage.getItem(this.LS_KEY) || 'null'); } catch { return null; }
  },

  clear() {
    localStorage.removeItem(this.LS_KEY);
  },

  async listBackend() {
    try {
      const r = await fetch(this.API + '/api/documents');
      return r.ok ? await r.json() : [];
    } catch { return []; }
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   ARCHITECTURE PROMPT ENGINE
   ───────────────────────────────────────────────────────────────────────────── */
const ArchPrompt = {
  build(text, depth, archType, techStack, diagramMode) {
    const depthGuide = {
      standard: 'Generate a solid analysis. Cover key areas without extreme depth.',
      deep: 'Generate a comprehensive, highly detailed analysis. Cover every module, API, table, and workflow thoroughly.',
      expert: 'Generate an exhaustive, principal-architect-level analysis. Leave nothing out. Be extremely detailed. Cover every edge case, dependency, risk, and design decision.'
    }[depth] || '';

    const useMermaid = diagramMode === 'mermaid' || diagramMode === 'both';
    const useText = diagramMode === 'text' || diagramMode === 'both';

    const diagramInstr = useMermaid
      ? `Generate Mermaid diagrams for all flows. Use these syntax starters exactly:
- Flowcharts: start with \`graph TD\` or \`graph LR\`
- Sequence: start with \`sequenceDiagram\`
- ER Diagram: start with \`erDiagram\`
- Class: start with \`classDiagram\`
Wrap each diagram in a \`\`\`mermaid code block. The syntax MUST be valid Mermaid v10.`
      : 'Use ASCII/text flowcharts for all diagrams (use → and ↓ arrows).';

    return `You are a Principal Solution Architect, Senior Software Architect, and QA Architecture Expert with 20+ years of industry experience.

${depthGuide}
Architecture hint: ${archType !== 'auto' ? archType : 'auto-detect from the document'}.
Tech stack hint: ${techStack !== 'auto' ? techStack : 'auto-detect from the document'}.
${diagramInstr}

Analyze the following document and generate a COMPLETE architectural blueprint in ALL sections below.
Use rich markdown. Every section must have substantial content — NO placeholders, NO "TBD", NO "N/A".

DOCUMENT:
"""
${text.slice(0, 32000)}
"""

Now generate ALL sections with the exact markers shown:

[OVERVIEW_START]
## Architecture Overview

### Product Summary
What this product does, its type, primary users, business objective, success metrics.

### Technology Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | ... | ... |
| Backend | ... | ... |
| Database | ... | ... |
| Cache | ... | ... |
| Queue | ... | ... |
| Auth | ... | ... |

### User Roles & Actors
List all user types with their primary responsibilities and system access.

### Key Functional Areas
Numbered list of all major functional areas with brief descriptions.

### Non-Functional Requirements
Performance targets, security requirements, scalability, availability, reliability.

### Architecture Decision Record (ADR)
Key architectural decisions made and their justification.
[OVERVIEW_END]

[MODULES_START]
## Module Breakdown

For EVERY identified module, generate a complete card:

### [Module Name] — [emoji]
**Purpose:** One-paragraph description of what this module does and why it exists.

**Components:**
- UI: [list pages, components, widgets]
- Services: [list service classes]
- Controllers: [list API controllers]
- Repositories: [list data access layers]

**APIs Exposed:**
- POST /api/[module]/... — [description]
- GET /api/[module]/... — [description]

**Database Tables:** [table1], [table2]

**Events:** [event1 published], [event2 consumed]

**Internal Dependencies:** [Module A], [Module B]
**External Dependencies:** [Service X], [API Y]

**Business Rules:**
1. Rule 1
2. Rule 2

**Testing Areas:** [Functional areas, API testing, Security testing]

**Risks:** [Technical risk 1], [Business risk 1]

---

(Repeat for every module)
[MODULES_END]

[WORKFLOWS_START]
## Workflow Diagrams

For EVERY major user flow and business process:

### [Workflow Name]
**Description:** What this workflow accomplishes.
**Actors:** [list who participates]
**Trigger:** [what starts this flow]

${useMermaid ? `**Flow Diagram:**
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant API as API Gateway
    participant SVC as Service
    participant DB as Database
    U->>API: Request
    API->>SVC: Process
    SVC->>DB: Query
    DB-->>SVC: Result
    SVC-->>API: Response
    API-->>U: Response
\`\`\`` : `**Flow Diagram:**
\`\`\`
[User] → [Step 1] → [Step 2] → [Result]
           ↓ (error)
        [Error Handler] → [User Notification]
\`\`\``}

**Alternative Paths:**
- Happy path: ...
- Error path: ...
- Edge case: ...

---

Also include a Cross-Module Interaction Map showing how all modules connect.

${useMermaid ? `**Cross-Module Map:**
\`\`\`mermaid
graph LR
    A[Module A] -->|API call| B[Module B]
    B -->|event| C[Module C]
\`\`\`` : ''}
[WORKFLOWS_END]

[HLD_START]
## High Level Design

### Architecture Pattern
Chosen pattern (microservices/monolith/serverless/etc.) and detailed justification.

### System Architecture Diagram
${useMermaid ? `\`\`\`mermaid
graph TD
    Client[Client Browser/Mobile] --> GW[API Gateway]
    GW --> Auth[Auth Service]
    GW --> SVC1[Service 1]
    GW --> SVC2[Service 2]
    SVC1 --> DB[(Primary DB)]
    SVC2 --> DB
    SVC1 --> Cache[(Redis Cache)]
    SVC2 --> Queue[Message Queue]
    Queue --> Worker[Background Worker]
\`\`\`` : `\`\`\`
[Client] → [Load Balancer] → [API Gateway]
                                    ↓
                           [Service Layer]
                           ↙     ↓     ↘
                    [Svc A] [Svc B] [Svc C]
                         ↘   ↓   ↙
                        [Data Layer]
\`\`\``}

### Component Descriptions
Describe each component's role, technology, and responsibility.

### Service Communication
REST vs GraphQL vs gRPC vs Message Queue — for each service pair.

### Frontend Architecture
Framework choice, state management, component structure, build pipeline.

### Backend Architecture
API design strategy, service decomposition, business logic placement.

### Authentication & Authorization
Strategy: JWT/OAuth2/SAML. Token lifecycle, refresh strategy, RBAC model.

### Security Architecture
Input validation, output encoding, rate limiting, CORS, API keys, secrets management.

### Deployment Architecture
Cloud platform, container (Docker/K8s), CI/CD pipeline, environments (dev/staging/prod).

### Scalability Strategy
Horizontal scaling, connection pooling, CDN, caching, DB read replicas.
[HLD_END]

[LLD_START]
## Low Level Design

### Data Transfer Objects (DTOs)
For each major entity, show request/response schemas:

\`\`\`json
// [Entity] Request DTO
{
  "field1": "string (required, max 100 chars)",
  "field2": "integer (required, min 1)",
  "field3": "boolean (optional, default false)"
}
\`\`\`

### Class / Interface Design
For each key service:

\`\`\`
interface [ServiceName] {
  method1(param: Type): ReturnType
  method2(param: Type): Promise<ReturnType>
}

class [ServiceImpl] implements [ServiceName] {
  private readonly repo: [RepoName]
  constructor(repo: [RepoName])
  async method1(param: Type): Promise<ReturnType>
}
\`\`\`

### Sequence Diagrams for Key Operations
${useMermaid ? `\`\`\`mermaid
sequenceDiagram
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant DB as Database
    C->>S: processRequest(dto)
    S->>S: validate(dto)
    S->>R: findBy(criteria)
    R->>DB: SELECT query
    DB-->>R: rows
    R-->>S: entity[]
    S-->>C: ResponseDTO
\`\`\`` : ''}

### Validation Rules
| Field | Required | Type | Min | Max | Pattern | Notes |
|-------|----------|------|-----|-----|---------|-------|

### Error Handling Strategy
| Error Code | HTTP Status | Message | Action |
|-----------|------------|---------|--------|

### Caching Strategy
What gets cached, TTL values, cache keys, invalidation triggers.

### Logging & Monitoring
Log levels, key events, metrics to expose, alerting thresholds.

### Retry & Circuit Breaker
Retry policy for external calls, circuit breaker thresholds, fallback logic.
[LLD_END]

[APIS_START]
## API Contracts

### Authentication APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|

### [Module] APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/... | Bearer | Create ... |
| GET | /api/v1/... | Bearer | Fetch ... |
| PUT | /api/v1/.../id | Bearer | Update ... |
| DELETE | /api/v1/.../id | Bearer | Delete ... |

For each critical endpoint, provide:

**Request:**
\`\`\`json
{}
\`\`\`

**Success Response (200/201):**
\`\`\`json
{}
\`\`\`

**Error Responses:** List all possible error codes and messages.

**Security Notes:** Rate limits, auth requirements, input validation.

(Repeat for all modules)
[APIS_END]

[DATABASE_START]
## Database Design

### Entity Relationship Overview
${useMermaid ? `\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : included_in
    USER {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    ORDER {
        uuid id PK
        uuid user_id FK
        decimal total
        string status
        timestamp created_at
    }
\`\`\`` : 'List tables and their relationships.'}

### Table Definitions

#### [table_name]
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Primary key |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Indexes:**
- \`idx_[table]_[column]\` ON [column] — [purpose]

**Foreign Keys:**
- [column] → [other_table].[column] ON DELETE [CASCADE/SET NULL/RESTRICT]

(Repeat for ALL tables)

### Data Access Patterns
Most common queries and their optimization strategy.

### Seed Data Requirements
Initial data needed for system operation.
[DATABASE_END]

[RISKS_START]
## Risk Analysis

### Technical Risks
| Risk | Severity | Probability | Impact | Mitigation | Owner |
|------|----------|-------------|--------|------------|-------|
| ... | 🔴 High | High | ... | ... | Dev Team |
| ... | 🟡 Medium | Medium | ... | ... | Architect |
| ... | 🟢 Low | Low | ... | ... | QA Team |

### Security Risks
| Risk | Severity | Attack Vector | Mitigation |
|------|----------|--------------|------------|
| SQL Injection | 🔴 Critical | DB queries | Parameterized queries, ORM |
| XSS | 🔴 High | User input | Output encoding, CSP headers |

### Performance Risks
Bottlenecks identified, scaling risks, database query performance risks.

### Integration Risks
Third-party API dependencies, failure scenarios, fallback strategies.

### Business Risks
Feature gaps, requirement ambiguities, timeline risks, scope risks.

### Testing Risks
Hard-to-test areas, environment dependencies, data setup complexity.

### Mitigation Roadmap
Priority order for addressing top risks, with owners and deadlines.
[RISKS_END]

[TESTING_START]
## Testing Coverage Plan

### Test Pyramid
| Level | Type | Tools | Coverage Target |
|-------|------|-------|----------------|
| Unit | Function/class testing | Jest/JUnit | 80%+ |
| Integration | API + DB testing | Supertest/RestAssured | 70%+ |
| E2E | User journey testing | Playwright/Cypress | Key flows |
| Performance | Load/stress testing | k6/JMeter | All APIs |

### Functional Testing Coverage
| Module | Test Scenarios | Priority | Automation Candidate |
|--------|---------------|----------|---------------------|

### API Testing Coverage
For each API endpoint: positive, negative, boundary, security, performance tests.

### Security Testing Checklist
- [ ] OWASP Top 10 coverage
- [ ] Authentication bypass attempts
- [ ] Authorization (RBAC) verification
- [ ] Input validation (SQLi, XSS, XXE)
- [ ] Rate limiting verification
- [ ] Sensitive data exposure checks
- [ ] JWT token manipulation
- [ ] CORS misconfiguration testing

### Automation Script Templates

**Playwright E2E:**
\`\`\`javascript
test('[Feature] — [Scenario]', async ({ page }) => {
  await page.goto('/[path]');
  await page.fill('[selector]', '[value]');
  await page.click('[button]');
  await expect(page.locator('[result]')).toBeVisible();
});
\`\`\`

**API Test (Supertest/Axios):**
\`\`\`javascript
describe('POST /api/v1/[endpoint]', () => {
  it('should return 201 with valid payload', async () => {
    const res = await request(app).post('/api/v1/[endpoint]').send({ ... });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});
\`\`\`

### Test Data Requirements
Seed data, test users, mock services, environment variables needed.

### Coverage Matrix
| Requirement | Test Case IDs | Module | Priority | Status |
|-------------|---------------|--------|----------|--------|
[TESTING_END]
`;
  },

  parse(text) {
    const extract = (start, end) => {
      const s = text.indexOf(start);
      const e = text.indexOf(end);
      if (s === -1 || e === -1 || e <= s) return null;
      return text.slice(s + start.length, e).trim();
    };
    return {
      overview: extract('[OVERVIEW_START]', '[OVERVIEW_END]'),
      modules:  extract('[MODULES_START]',  '[MODULES_END]'),
      workflows:extract('[WORKFLOWS_START]','[WORKFLOWS_END]'),
      hld:      extract('[HLD_START]',      '[HLD_END]'),
      lld:      extract('[LLD_START]',      '[LLD_END]'),
      apis:     extract('[APIS_START]',     '[APIS_END]'),
      database: extract('[DATABASE_START]', '[DATABASE_END]'),
      risks:    extract('[RISKS_START]',    '[RISKS_END]'),
      testing:  extract('[TESTING_START]',  '[TESTING_END]'),
    };
  },

  countIn(text, pattern) {
    if (!text) return 0;
    const m = text.match(new RegExp(pattern, 'gi'));
    return m ? m.length : 0;
  },

  computeStats(results) {
    return {
      modules: this.countIn(results.modules, /^###\s+\w/m),
      apis: this.countIn(results.apis, /\|\s+(GET|POST|PUT|DELETE|PATCH)\s+\|/),
      tables: this.countIn(results.database, /^####\s+\w/m),
      risks: this.countIn(results.risks, /🔴|🟡|🟢|High|Medium|Low\s+\|/),
      flows: this.countIn(results.workflows, /^###\s+\w/m),
      tests: this.countIn(results.testing, /\|\s+\w/),
    };
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MARKDOWN RENDERER
   ───────────────────────────────────────────────────────────────────────────── */

function sanitizeMermaid(code) {
  return String(code || '')
    // Decode HTML entities that may have leaked in from prior escaping passes
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    // Normalise line endings, strip trailing spaces per line
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').map(l => l.trimEnd()).join('\n')
    .trim();
}

function renderMd(raw) {
  if (!raw) return '<p style="color:var(--text-muted);font-style:italic">No content available for this section.</p>';

  // Phase 1 — pull out all mermaid fenced blocks BEFORE any newline→<br> conversion
  // so that their internal newlines are preserved exactly for Mermaid parsing.
  const mermaidBlocks = [];
  let s = String(raw).replace(/```mermaid\n?([\s\S]*?)```/gi, (_, c) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(sanitizeMermaid(c));
    return `\x00MERMAID_BLOCK_${idx}\x00`;
  });

  // Phase 2 — standard HTML-escape + markdown transforms (newlines become <br> here)
  let h = s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,c) => `<pre class="lang-${lang}"><code>${c}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^#{6}\s(.+)$/gm,'<h6>$1</h6>')
    .replace(/^#{5}\s(.+)$/gm,'<h5>$1</h5>')
    .replace(/^#{4}\s(.+)$/gm,'<h4>$1</h4>')
    .replace(/^#{3}\s(.+)$/gm,'<h3>$1</h3>')
    .replace(/^#{2}\s(.+)$/gm,'<h2>$1</h2>')
    .replace(/^#{1}\s(.+)$/gm,'<h1>$1</h1>')
    .replace(/^&gt;\s(.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^---+$/gm,'<hr/>')
    .replace(/^\|(.+)\|$/gm, line => {
      const cells = line.split('|').slice(1,-1).map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/^[-*]\s(.+)$/gm,'<li>$1</li>')
    .replace(/^\d+\.\s(.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');

  h = h.replace(/(<tr>.*?<\/tr>(\s|<br>)*)+/gs, m => `<table><thead></thead><tbody>${m}</tbody></table>`);
  h = h.replace(/(<li>.*?<\/li>(\s|<br>)*)+/gs, m => `<ul>${m}</ul>`);

  // Phase 3 — reinsert mermaid blocks with safe HTML encoding but newlines intact
  mermaidBlocks.forEach((code, idx) => {
    const safeCode = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const rendered = `<pre><code class="language-mermaid">${safeCode}</code></pre>`;
    const marker = `\x00MERMAID_BLOCK_${idx}\x00`;
    // Clean up any <br> tags that wrapped around the placeholder during conversion
    h = h
      .split(`<br>${marker}<br>`).join(rendered)
      .split(`<br>${marker}`).join(rendered)
      .split(`${marker}<br>`).join(rendered)
      .split(marker).join(rendered);
  });

  return '<div class="hld-md"><p>' + h + '</p></div>';
}

/* ─────────────────────────────────────────────────────────────────────────────
   TAB MANAGER
   ───────────────────────────────────────────────────────────────────────────── */
const TabMgr = {
  TABS: ['overview','modules','workflows','hld','lld','apis','database','risks','testing'],
  _active: 'overview',
  _data: {},

  init() {
    document.querySelectorAll('.hld-tab').forEach(btn => {
      btn.addEventListener('click', () => this.show(btn.dataset.tab));
    });
  },

  show(tab) {
    this._active = tab;
    document.querySelectorAll('.hld-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.hld-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  },

  showLoading(tab) {
    const panel = document.getElementById('tab-' + tab);
    if (!panel) return;
    const empId = 'empty' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const el = document.getElementById(empId);
    const content = document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (el) el.style.display = 'none';
    if (content) content.style.display = 'none';
    // Show spinner inside panel
    let spin = panel.querySelector('.hld-loading');
    if (!spin) {
      spin = document.createElement('div');
      spin.className = 'hld-loading';
      spin.innerHTML = `<div class="hld-spinner"></div><div class="hld-loading-msg" id="loadMsg-${tab}">Generating ${tab} analysis...</div><div class="hld-loading-bar"><div class="hld-loading-fill"></div></div>`;
      panel.appendChild(spin);
    }
    spin.style.display = 'flex';
  },

  updateLoadingMsg(tab, msg) {
    const el = document.getElementById('loadMsg-' + tab);
    if (el) el.textContent = msg;
  },

  renderTab(tab, markdown) {
    this._data[tab] = markdown;
    const panel = document.getElementById('tab-' + tab);
    if (!panel) return;
    // Remove loading spinner
    const spin = panel.querySelector('.hld-loading');
    if (spin) spin.remove();

    const empId = 'empty' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const empEl = document.getElementById(empId);
    if (empEl) empEl.style.display = 'none';

    let contentEl = document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (!contentEl) {
      contentEl = document.createElement('div');
      contentEl.id = 'content' + tab.charAt(0).toUpperCase() + tab.slice(1);
      panel.appendChild(contentEl);
    }
    contentEl.style.display = 'block';
    contentEl.innerHTML = renderMd(markdown);

    // Render mermaid diagrams asynchronously
    setTimeout(() => MermaidRenderer.renderAll(contentEl), 100);
  },

  getCurrentText() {
    return this._data[this._active] || '';
  },

  getAllText() {
    return this.TABS.map(t => this._data[t] || '').filter(Boolean).join('\n\n---\n\n');
  },

  getAllData() {
    return { ...this._data };
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT MANAGER
   ───────────────────────────────────────────────────────────────────────────── */
const Exporter = {
  download(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  markdown() {
    const text = TabMgr.getAllText();
    if (!text) { showToast('No content to export', 'error'); return; }
    this.download('# Architecture Analysis\n\n' + text, 'architecture-' + Date.now() + '.md', 'text/markdown');
  },

  plainText() {
    const text = TabMgr.getAllText().replace(/<[^>]+>/g, '').replace(/```\w*/g, '').replace(/```/g, '');
    if (!text) { showToast('No content to export', 'error'); return; }
    this.download(text, 'architecture-' + Date.now() + '.txt', 'text/plain');
  },

  mermaidCode() {
    const text = TabMgr.getAllText();
    const matches = [...text.matchAll(/```mermaid\n?([\s\S]*?)```/gi)].map(m => m[1].trim());
    if (!matches.length) { showToast('No Mermaid diagrams found', 'error'); return; }
    this.download(matches.join('\n\n---\n\n'), 'diagrams-' + Date.now() + '.mmd', 'text/plain');
  },

  json() {
    const data = TabMgr.getAllData();
    if (!Object.keys(data).length) { showToast('No content to export', 'error'); return; }
    this.download(JSON.stringify({ generatedAt: new Date().toISOString(), tabs: data }, null, 2), 'architecture-' + Date.now() + '.json', 'application/json');
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATS BAR
   ───────────────────────────────────────────────────────────────────────────── */
function updateStats(results) {
  const s = ArchPrompt.computeStats(results);
  document.getElementById('sModules').textContent = s.modules || '?';
  document.getElementById('sApis').textContent = s.apis || '?';
  document.getElementById('sTables').textContent = s.tables || '?';
  document.getElementById('sRisks').textContent = s.risks || '?';
  document.getElementById('sFlows').textContent = s.flows || '?';
  document.getElementById('sTests').textContent = s.tests || '?';
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS BAR
   ───────────────────────────────────────────────────────────────────────────── */
function setStatus(msg, type) {
  const el = document.getElementById('hldStatus');
  if (!el) return;
  el.className = 'hld-status ' + (type || '');
  el.textContent = msg;
  if (!msg) el.className = 'hld-status';
  if (type === 'success') setTimeout(() => { if (el.textContent === msg) setStatus('', ''); }, 4000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE CONTROLLER
   ───────────────────────────────────────────────────────────────────────────── */
const HLDPage = (() => {
  let extractedText = '';
  let fileName = '';
  let isGenerating = false;
  let rawAIResponse = '';

  /* ── File Upload ── */
  function setProgress(pct, label) {
    const wrap = document.getElementById('hldProgressWrap');
    const fill = document.getElementById('hldProgressFill');
    const lbl = document.getElementById('hldProgressLabel');
    if (wrap) wrap.style.display = pct > 0 && pct < 100 ? 'block' : (pct === 100 ? 'none' : 'none');
    if (fill) fill.style.width = pct + '%';
    if (lbl) lbl.textContent = label;
    if (pct === 100) setTimeout(() => { if (wrap) wrap.style.display = 'none'; }, 600);
  }

  async function handleFile(file) {
    if (!file) return;
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) { setStatus('File too large (max 50 MB)', 'error'); return; }

    fileName = file.name;
    setStatus('Extracting text from ' + file.name + '...', 'info');
    setProgress(5, 'Starting extraction...');
    document.getElementById('hldProgressWrap').style.display = 'block';

    try {
      extractedText = await DocExtractor.extract(file, (pct, label) => setProgress(pct, label));
      setProgress(100, 'Done');

      // Show file info
      document.getElementById('hldFileName').textContent = file.name;
      document.getElementById('hldFileMeta').textContent =
        Math.round(file.size / 1024) + ' KB · ' + extractedText.length.toLocaleString() + ' characters extracted';
      document.getElementById('hldFileInfo').style.display = 'block';

      // Update char count in textarea
      document.getElementById('hldCharCount').textContent = extractedText.length.toLocaleString() + ' characters (from ' + file.name + ')';

      setStatus('✓ ' + file.name + ' extracted — ' + extractedText.length.toLocaleString() + ' chars ready', 'success');
      checkEnableBtn();

    } catch (err) {
      setProgress(0, '');
      document.getElementById('hldProgressWrap').style.display = 'none';
      setStatus('Extraction failed: ' + err.message, 'error');
      extractedText = '';
      checkEnableBtn();
    }
  }

  function removeFile() {
    extractedText = '';
    fileName = '';
    document.getElementById('hldFileInfo').style.display = 'none';
    document.getElementById('hldFileInput').value = '';
    document.getElementById('hldCharCount').textContent = '0 characters';
    setStatus('', '');
    checkEnableBtn();
  }

  function checkEnableBtn() {
    const btn = document.getElementById('hldGenBtn');
    if (!btn) return;
    const hasInput = extractedText.trim().length > 50 ||
                     (document.getElementById('hldPrdText').value || '').trim().length > 50;
    btn.disabled = !hasInput || isGenerating;
  }

  function getInput() {
    if (extractedText.trim().length > 10) return extractedText;
    return (document.getElementById('hldPrdText').value || '').trim();
  }

  /* ── Generation ── */
  async function generate() {
    const input = getInput();
    if (!input || isGenerating) return;

    isGenerating = true;
    const btn = document.getElementById('hldGenBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing... Please wait';

    // Show loading on all tabs
    TabMgr.TABS.forEach(t => TabMgr.showLoading(t));
    TabMgr.show('overview');

    setStatus('Sending to AI engine... Large documents may take 60–120 seconds.', 'info');

    const models = AppState.models;
    const engine = models.current || 'huggingface';
    const config = { current: engine, data: models.data || models };

    const depth = document.getElementById('hldDepth').value;
    const archType = document.getElementById('hldArchType').value;
    const techStack = document.getElementById('hldTechStack').value;
    const diagramMode = document.getElementById('hldDiagramMode').value;

    const prompt = ArchPrompt.build(input, depth, archType, techStack, diagramMode);
    rawAIResponse = '';
    let firstChunk = true;

    try {
      await AIEngine.generateWithPrompt(prompt, config, (chunk) => {
        rawAIResponse += chunk;
        if (firstChunk) {
          firstChunk = false;
          TabMgr.updateLoadingMsg('overview', 'AI is writing the architecture...');
        }

        // Live-stream overview tab
        const ovEl = document.getElementById('contentOverview') || (() => {
          const d = document.createElement('div'); d.id = 'contentOverview';
          const panel = document.getElementById('tab-overview');
          if (panel) { const spin = panel.querySelector('.hld-loading'); if (spin) spin.style.display = 'none'; panel.appendChild(d); }
          return d;
        })();
        if (ovEl) {
          ovEl.style.display = 'block';
          const partial = rawAIResponse.slice(0, 4000);
          ovEl.innerHTML = renderMd(partial) + '<span class="hld-stream-cursor"></span>';
        }
      });

      // Parse into sections
      const results = ArchPrompt.parse(rawAIResponse);

      // Fallback: if markers not found, show full text in overview
      if (!Object.values(results).some(Boolean)) {
        results.overview = rawAIResponse;
      }

      // Render all tabs
      TabMgr.TABS.forEach(tab => {
        if (results[tab]) {
          TabMgr.renderTab(tab, results[tab]);
        } else {
          // Show empty state instead of spinner
          const panel = document.getElementById('tab-' + tab);
          if (panel) {
            const spin = panel.querySelector('.hld-loading');
            if (spin) spin.remove();
            const empEl = document.getElementById('empty' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (empEl) empEl.style.display = 'flex';
          }
        }
      });

      updateStats(results);

      // Save to knowledge store
      const docName = fileName || 'Pasted Document';
      KnowledgeStore.save(docName, input, results);
      setStatus('✓ Architecture generated and saved to knowledge store!', 'success');

      // Load saved docs list
      loadSavedDocs();

    } catch (err) {
      setStatus('Generation error: ' + (err.message || 'Unknown error — check AI engine settings.'), 'error');
      TabMgr.TABS.forEach(tab => {
        const panel = document.getElementById('tab-' + tab);
        if (panel) { const spin = panel.querySelector('.hld-loading'); if (spin) spin.remove(); }
        const empEl = document.getElementById('empty' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (empEl) empEl.style.display = 'flex';
      });
    } finally {
      isGenerating = false;
      btn.disabled = false;
      btn.textContent = '🚀 Analyze & Generate Architecture';
    }
  }

  /* ── Saved docs ── */
  async function loadSavedDocs() {
    const docs = await KnowledgeStore.listBackend();
    const section = document.getElementById('hldSavedSection');
    const list = document.getElementById('hldDocList');
    if (!list) return;

    // Also check localStorage
    const local = KnowledgeStore.load();

    const items = [...docs];
    if (local && !docs.find(d => d.name === local.name)) {
      items.unshift({ name: local.name, storedAt: local.savedAt, _local: true });
    }

    if (!items.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = 'block';

    list.innerHTML = items.slice(0, 5).map(doc => {
      const date = new Date(doc.storedAt).toLocaleDateString();
      const ext = doc.name.split('.').pop().toUpperCase();
      return `<div class="hld-doc-item" title="${doc.name}">
        <span class="hld-doc-icon">${ext === 'PDF' ? '📄' : ext === 'DOCX' ? '📝' : ext === 'XLSX' ? '📊' : '📋'}</span>
        <div style="flex:1;overflow:hidden">
          <div class="hld-doc-name">${doc.name}</div>
          <div class="hld-doc-date">${date}</div>
        </div>
      </div>`;
    }).join('');
  }

  /* ── Init ── */
  function init() {
    // Tab manager
    TabMgr.init();

    // Upload zone
    const dropZone = document.getElementById('hldDropZone');
    const fileInput = document.getElementById('hldFileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    document.getElementById('hldRemoveBtn').addEventListener('click', removeFile);

    document.getElementById('hldPreviewBtn').addEventListener('click', () => {
      const modal = document.getElementById('previewModal');
      const pre = document.getElementById('previewContent');
      if (pre) pre.textContent = extractedText.slice(0, 5000) + (extractedText.length > 5000 ? '\n\n[... truncated for preview ...]' : '');
      if (modal) { modal.style.display = 'flex'; }
    });

    // Textarea char count
    const textarea = document.getElementById('hldPrdText');
    textarea.addEventListener('input', () => {
      document.getElementById('hldCharCount').textContent = textarea.value.length.toLocaleString() + ' characters';
      checkEnableBtn();
    });

    // Generate button
    document.getElementById('hldGenBtn').addEventListener('click', generate);

    // Copy button
    document.getElementById('hldCopyBtn').addEventListener('click', () => {
      const text = TabMgr.getCurrentText();
      if (!text) { showToast('No content to copy', 'error'); return; }
      navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
    });

    // Share to Buddy
    document.getElementById('hldShareBtn').addEventListener('click', () => {
      const data = TabMgr.getAllData();
      if (!Object.values(data).some(Boolean)) { showToast('Generate architecture first', 'error'); return; }
      KnowledgeStore.save(fileName || 'Document', getInput(), data);
      showToast('✓ Saved to Testing Buddy knowledge base!', 'success');
    });

    // Export buttons
    document.getElementById('expMd').addEventListener('click', () => Exporter.markdown());
    document.getElementById('expTxt').addEventListener('click', () => Exporter.plainText());
    document.getElementById('expMermaid').addEventListener('click', () => Exporter.mermaidCode());
    document.getElementById('expJson').addEventListener('click', () => Exporter.json());

    // Load saved docs
    loadSavedDocs();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => HLDPage.init());
