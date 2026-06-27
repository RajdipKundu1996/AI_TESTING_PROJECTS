// Enterprise QE Dashboard — v5 Modern Renderer
(function () {
  'use strict';

  const STORAGE_KEY = 'qa_gen_enterprise_last_input';
  const AI_RELAY    = '/relay';
  const AI_MODEL    = 'sarvam-30b';

  let currentIntelligence = null;
  let copilotHistory      = [];    // [{role:'user'|'assistant', content:string}]

  // ── Sample spec ─────────────────────────────────────────────────────────────
  const SAMPLE_API_SPEC = `OpenAPI requirement: User onboarding API

POST /api/v1/users
Authentication: Bearer JWT
Headers: Content-Type application/json, X-Correlation-ID
Request payload:
{
  "name": "QA User",
  "email": "qa.user@emudhra.com",
  "role": "QA_LEAD",
  "department": "Quality Engineering"
}
Response payload:
{
  "id": "usr_1001",
  "status": "ACTIVE",
  "createdAt": "2026-06-03T10:00:00Z"
}
Status codes: 201, 400, 401, 403, 409, 422, 500

Requirement: The API must be secure, fast, reliable, and user friendly. It must create an audit entry, reject duplicate email IDs, support rollback on downstream failure, and rate limit abusive calls.`;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function pct(v) { return Math.max(0, Math.min(100, Math.round(Number(v) || 0))); }

  function prettyJson(v) {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v || ''); }
  }

  // Score → CSS modifier
  function scoreClass(v) {
    const n = pct(v);
    if (n >= 80) return 'critical';
    if (n >= 60) return 'warning';
    if (n >= 35) return 'medium';
    return 'good';
  }
  function qualityClass(v) {
    const n = pct(v);
    if (n >= 80) return 'good';
    if (n >= 60) return 'medium';
    if (n >= 40) return 'warning';
    return 'critical';
  }

  // Progress fill colors by class
  function progressColors(cls) {
    return {
      good:     ['#22C55E', '#16A34A'],
      medium:   ['#F59E0B', '#D97706'],
      warning:  ['#F97316', '#EA580C'],
      critical: ['#EF4444', '#DC2626']
    }[cls] || ['#1E6FE0', '#1558c8'];
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast('Copied to clipboard', 'success');
    }).catch(() => {});
  }

  function codeBlock(content, lang) {
    const id = 'cb_' + Math.random().toString(36).slice(2, 8);
    return `<div class="eq-code-wrap" id="${id}">
      <pre class="eq-pre">${esc(content)}</pre>
      <button class="eq-code-copy" type="button" onclick="(function(){var el=document.getElementById('${id}');var txt=el.querySelector('pre').textContent;navigator.clipboard&&navigator.clipboard.writeText(txt).then(function(){if(typeof showToast==='function')showToast('Copied','success');});})()">Copy</button>
    </div>`;
  }

  function pillList(items, mod) {
    return `<div class="eq-pill-list">${(items && items.length ? items : ['None detected']).map(i => `<span class="eq-pill ${mod || ''}">${esc(i)}</span>`).join('')}</div>`;
  }

  function listCard(title, items) {
    return `<article class="eq-list-card">
      <h3>${esc(title)}</h3>
      <ul>${(items && items.length ? items : ['None detected']).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </article>`;
  }

  // ── KPI Icons ────────────────────────────────────────────────────────────────
  const ICONS = {
    req:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    cplx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    risk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round" stroke-width="3"/></svg>`,
    qual: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    amb:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round" stroke-width="3"/></svg>`,
    cov:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    api:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  };

  // ── renderKpis ───────────────────────────────────────────────────────────────
  function renderKpis(data) {
    const grid = $('eqKpiGrid');
    if (!grid) return;

    const kpis = [
      { label: 'Requirement Type', value: data.requirementType, note: 'Classification', color: '#1E6FE0', icon: ICONS.req },
      { label: 'Complexity', value: pct(data.scores.complexityScore) + '%', note: scoreClass(data.scores.complexityScore).toUpperCase(), color: progressColors(scoreClass(data.scores.complexityScore))[0], icon: ICONS.cplx },
      { label: 'Risk Score', value: pct(data.scores.riskScore) + '%', note: scoreClass(data.scores.riskScore).toUpperCase(), color: progressColors(scoreClass(data.scores.riskScore))[0], icon: ICONS.risk },
      { label: 'Quality', value: pct(data.scores.requirementQualityScore) + '%', note: qualityClass(data.scores.requirementQualityScore).toUpperCase(), color: progressColors(qualityClass(data.scores.requirementQualityScore))[0], icon: ICONS.qual },
      { label: 'Ambiguity', value: pct(data.scores.ambiguityScore) + '%', note: data.ambiguity.items.length + ' items found', color: progressColors(scoreClass(data.scores.ambiguityScore))[0], icon: ICONS.amb },
      { label: 'Coverage', value: pct(data.scores.coverageConfidenceScore) + '%', note: qualityClass(data.scores.coverageConfidenceScore).toUpperCase(), color: '#06C2AC', icon: ICONS.cov },
      { label: 'API Mode', value: data.api.mode ? 'Active' : 'Inactive', note: data.api.modeLabel, color: data.api.mode ? '#06C2AC' : '#94a3b8', icon: ICONS.api },
    ];

    grid.innerHTML = kpis.map(k => `
      <article class="eq-kpi-card" style="--kpi-color:${k.color}">
        <div class="eq-kpi-icon">${k.icon}</div>
        <div class="eq-kpi-label">${esc(k.label)}</div>
        <div class="eq-kpi-value">${esc(k.value)}</div>
        <div class="eq-kpi-note">${esc(k.note)}</div>
      </article>
    `).join('');

    const badge = $('eqModeLabel');
    if (badge) badge.textContent = data.api.modeLabel;
  }

  // ── renderRequirement ────────────────────────────────────────────────────────
  function renderRequirement(data) {
    const panel = $('eq-panel-requirement');
    if (!panel) return;

    const scoreRows = [
      ['Complexity Score', data.scores.complexityScore, 'Requirement breadth: modules, API signals, workflow depth', scoreClass(data.scores.complexityScore)],
      ['Risk Score', data.scores.riskScore, 'Business, security, technical, and operational exposure', scoreClass(data.scores.riskScore)],
      ['Coverage Confidence', data.scores.coverageConfidenceScore, 'Expected depth from available requirement detail', qualityClass(data.scores.coverageConfidenceScore)],
      ['Requirement Quality', data.scores.requirementQualityScore, 'Specificity, acceptance criteria, schemas, NFRs', qualityClass(data.scores.requirementQualityScore)],
      ['Ambiguity Score', data.scores.ambiguityScore, 'Subjective language and missing measurable criteria', scoreClass(data.scores.ambiguityScore)],
    ];

    panel.innerHTML = `
      <div class="eq-panel-grid two" style="margin-bottom:14px">
        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">Requirement Intelligence</h2><p class="eq-card-sub">Pre-generation assessment guiding enterprise test design.</p></div>
            <span class="eq-chip eq-chip-blue">${esc(data.requirementType)}</span>
          </div>
          <div class="eq-card-body">
            <div class="eq-score-list">
              ${scoreRows.map(([name, score, note, cls]) => {
                const [ca, cb] = progressColors(cls);
                return `<div class="eq-score-row">
                  <div class="eq-score-head">
                    <div><div class="eq-score-name">${esc(name)}</div><div class="eq-score-note">${esc(note)}</div></div>
                    <span class="eq-score-val ${cls}">${pct(score)}%</span>
                  </div>
                  <div class="eq-progress-track"><div class="eq-progress-fill" style="width:${pct(score)}%;--pf-a:${ca};--pf-b:${cb}"></div></div>
                </div>`;
              }).join('')}
            </div>
            <div class="eq-section-h">Classifications</div>
            ${pillList(data.classifications)}
            <div class="eq-section-h">Detected Modules</div>
            ${pillList(data.modules, 'teal')}
          </div>
        </div>

        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">Ambiguity Detection</h2><p class="eq-card-sub">Missing acceptance criteria and clarification suggestions.</p></div>
            <span class="eq-chip ${data.ambiguity.items.length ? 'eq-chip-amber' : 'eq-chip-green'}">${data.ambiguity.items.length ? data.ambiguity.items.length + ' issues' : 'Clean'}</span>
          </div>
          <div class="eq-card-body">
            <div class="eq-alert-list">
              ${data.ambiguity.items.length
                ? data.ambiguity.items.map(item => `
                    <div class="eq-alert warning">
                      <strong>${esc(item.term)}</strong>
                      <span>${esc(item.issue)}</span>
                      <small>${esc(item.clarification)}</small>
                    </div>`).join('')
                : '<div class="eq-alert good"><strong>No ambiguous terms detected</strong><span>Requirement language has measurable detail for first-pass analysis.</span></div>'}
              ${data.ambiguity.missingAcceptanceCriteria
                ? '<div class="eq-alert critical"><strong>Acceptance criteria missing</strong><span>Add Given/When/Then, status codes, thresholds, or explicit expected results.</span></div>'
                : ''}
            </div>
            ${data.ambiguity.clarificationSuggestions.length ? `
              <div class="eq-section-h">Clarification Suggestions</div>
              <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
                ${data.ambiguity.clarificationSuggestions.map(s => `<li style="font-size:.76rem;color:#475569;line-height:1.5">${esc(s)}</li>`).join('')}
              </ul>` : ''}
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Enterprise Test Cases</h2><p class="eq-card-sub">Every case includes ID, requirement mapping, objective, preconditions, test data, steps, expected results, priority, severity, risk, automation, and traceability.</p></div>
          <span class="eq-chip eq-chip-teal">${data.enterpriseTestCases.length} cases</span>
        </div>
        <div class="eq-card-body">
          ${renderTestCaseCards(data.enterpriseTestCases)}
        </div>
      </div>
    `;

    // Expand/collapse test cases
    panel.querySelectorAll('.eq-tc-header').forEach(h => {
      h.addEventListener('click', () => h.closest('.eq-tc-card').classList.toggle('open'));
    });
  }

  function renderTestCaseCards(rows) {
    if (!rows || !rows.length) return '<div class="eq-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Run analysis to generate test cases.</div>';

    const severityChip = s => {
      const m = { Critical: 'eq-chip-red', High: 'eq-chip-amber', Medium: 'eq-chip-blue', Low: 'eq-chip-gray' };
      return `<span class="eq-chip ${m[s] || 'eq-chip-gray'}" style="font-size:.6rem;padding:2px 7px">${esc(s)}</span>`;
    };
    const prioChip = p => {
      const m = { P1: 'eq-chip-red', P2: 'eq-chip-amber', P3: 'eq-chip-blue', P4: 'eq-chip-gray' };
      return `<span class="eq-chip ${m[p] || 'eq-chip-blue'}" style="font-size:.6rem;padding:2px 7px">${esc(p)}</span>`;
    };

    return `<div class="eq-tc-list">
      ${rows.map((row, i) => `
        <div class="eq-tc-card ${i === 0 ? 'open' : ''}">
          <div class="eq-tc-header">
            <span class="eq-tc-id">${esc(row.testCaseId)}</span>
            <span class="eq-tc-obj">${esc(row.testObjective)}</span>
            <div class="eq-tc-badges">
              ${prioChip(row.priority)}
              ${severityChip(row.severity)}
              ${row.automationCandidate === 'Yes' ? '<span class="eq-chip eq-chip-teal" style="font-size:.6rem;padding:2px 7px">Auto</span>' : ''}
            </div>
            <svg class="eq-tc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="eq-tc-body" style="display:${i === 0 ? 'grid' : 'none'}">
            <div class="eq-tc-field"><strong>Module</strong><span>${esc(row.module)}</span></div>
            <div class="eq-tc-field"><strong>Feature</strong><span>${esc(row.feature)}</span></div>
            <div class="eq-tc-field full"><strong>Preconditions</strong><span>${esc(row.preconditions)}</span></div>
            <div class="eq-tc-field full"><strong>Test Data</strong><span>${esc(row.testData)}</span></div>
            <div class="eq-tc-field full"><strong>Test Steps</strong><span style="white-space:pre-line">${esc(row.testSteps)}</span></div>
            <div class="eq-tc-field full"><strong>Expected Results</strong><span>${esc(row.expectedResults)}</span></div>
            <div class="eq-tc-field"><strong>Risk Level</strong><span>${esc(row.risk)}</span></div>
            <div class="eq-tc-field"><strong>Requirement ID</strong><span>${esc(row.requirementId)}</span></div>
            <div class="eq-tc-field full"><strong>Requirement Traceability</strong><span>${esc(row.requirementTraceability)}</span></div>
            <div class="eq-tc-field full"><strong>API Mapping</strong><span>${esc(row.apiMapping)}</span></div>
          </div>
        </div>`).join('')}
    </div>`;
  }

  // ── renderApi ────────────────────────────────────────────────────────────────
  function renderApi(data) {
    const panel = $('eq-panel-api');
    if (!panel) return;
    const ex = data.api.payloadExamples;

    const methodBadge = m => `<span class="eq-method-badge eq-method-${esc(m)}">${esc(m)}</span>`;

    panel.innerHTML = `
      <div class="eq-panel-grid two" style="margin-bottom:14px">
        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">API Detection Engine</h2><p class="eq-card-sub">Auto-analysis for REST, GraphQL, Swagger/OpenAPI, payloads, and status-code signals.</p></div>
            <span class="eq-chip ${data.api.mode ? 'eq-chip-teal' : 'eq-chip-gray'}">${esc(data.api.modeLabel)}</span>
          </div>
          <div class="eq-card-body">
            <div class="eq-kpi-row-inline">
              <div class="eq-kpi-mini"><span>Endpoints</span><strong>${data.api.endpoints.length}</strong></div>
              <div class="eq-kpi-mini"><span>OpenAPI</span><strong>${data.api.openApi.detected ? data.api.openApi.format : 'No'}</strong></div>
              <div class="eq-kpi-mini"><span>GraphQL</span><strong>${data.api.graphqlDetected ? 'Yes' : 'No'}</strong></div>
              <div class="eq-kpi-mini"><span>Tests</span><strong>${data.api.generatedTests.length}</strong></div>
            </div>
            ${data.api.endpoints.length
              ? data.api.endpoints.map(ep => `
                  <div class="eq-endpoint-card">
                    <div class="eq-endpoint-head">
                      ${methodBadge(ep.method)}
                      <span class="eq-endpoint-path">${esc(ep.endpoint)}</span>
                    </div>
                    <div class="eq-endpoint-meta">
                      <span>Auth: ${esc(ep.authentication)}</span>
                      <span>Codes: ${esc(ep.statusCodes.join(', '))}</span>
                      ${ep.headers.map(h => `<span>${esc(h)}</span>`).join('')}
                    </div>
                  </div>`).join('')
              : '<div class="eq-empty" style="padding:24px 0"><p>No endpoint paths detected. Add HTTP method and route details (e.g. POST /api/v1/users) to activate endpoint analysis.</p></div>'}
          </div>
        </div>

        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">Request &amp; Response Payload Intelligence</h2><p class="eq-card-sub">Positive, boundary, invalid, security, and performance examples.</p></div>
            <span class="eq-chip eq-chip-blue">${esc(ex.method)} ${esc(ex.endpoint)}</span>
          </div>
          <div class="eq-card-body" style="display:flex;flex-direction:column;gap:6px">
            <div class="eq-section-h">Request Payloads</div>
            ${ex.requests.map(item => `
              <details class="eq-detail">
                <summary><span class="eq-pill" style="font-size:.62rem;padding:2px 7px;margin-right:4px">${esc(item.name)}</span></summary>
                ${codeBlock(prettyJson(item.payload))}
              </details>`).join('')}
            <div class="eq-section-h">Response Examples</div>
            ${ex.responses.map(item => `
              <details class="eq-detail">
                <summary><span style="color:#1E6FE0;font-family:monospace;font-size:.75rem;font-weight:700;margin-right:6px">${esc(item.status)}</span>${esc(item.name)}</summary>
                ${codeBlock(prettyJson(item.body))}
              </details>`).join('')}
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Advanced API Test Generation</h2><p class="eq-card-sub">Functional, boundary, security, contract, and reliability coverage across all endpoints.</p></div>
          <span class="eq-chip eq-chip-teal">${data.api.generatedTests.length} tests</span>
        </div>
        <div class="eq-card-body">
          <div class="eq-api-test-grid">
            ${data.api.generatedTests.map(t => `
              <article class="eq-api-test-card ${esc(t.category.toLowerCase())}">
                <div class="eq-api-test-cat">${esc(t.category)}</div>
                <div class="eq-api-test-scenario">${esc(t.scenario)}</div>
                <div class="eq-api-test-steps">${esc(t.steps)}</div>
                <div class="eq-api-test-expected">${esc(t.expected)}</div>
              </article>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── renderRisk ───────────────────────────────────────────────────────────────
  function renderRisk(data) {
    const panel = $('eq-panel-risk');
    if (!panel) return;

    const levelColor = l => ({ Critical:'#DC2626', High:'#F5A623', Medium:'#D97706', Low:'#22C55E' })[l] || '#94a3b8';

    panel.innerHTML = `
      <div class="eq-card" style="margin-bottom:14px">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Risk Dashboard</h2><p class="eq-card-sub">Business, security, technical, and operational risk with execution strategies.</p></div>
          <span class="eq-chip eq-chip-${data.risks[0]?.level === 'Critical' ? 'red' : data.risks[0]?.level === 'High' ? 'amber' : 'blue'}">${esc(data.risks[0]?.level || 'Low')} Risk</span>
        </div>
        <div class="eq-card-body">
          <div class="eq-risk-grid">
            ${data.risks.map(risk => `
              <article class="eq-risk-card ${esc(risk.level.toLowerCase())}">
                <div class="eq-risk-name">${esc(risk.name)}</div>
                <div class="eq-risk-level">
                  <strong style="color:${levelColor(risk.level)}">${esc(risk.level)}</strong>
                  <span>${risk.score}%</span>
                </div>
                <div class="eq-progress-track" style="margin-bottom:8px">
                  <div class="eq-progress-fill" style="width:${risk.score}%;--pf-a:${levelColor(risk.level)};--pf-b:${levelColor(risk.level)}"></div>
                </div>
                <div class="eq-risk-reason">${esc(risk.reason)}</div>
                <div class="eq-risk-strategy">${esc(risk.executionStrategy)}</div>
              </article>`).join('')}
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Test Coverage Intelligence</h2><p class="eq-card-sub">Coverage scores and recommendations across all testing dimensions.</p></div>
        </div>
        <div class="eq-card-body">
          <div class="eq-cov-list">
            ${data.coverage.map(item => `
              <div class="eq-cov-row">
                <div class="eq-cov-head">
                  <span class="eq-cov-name">${esc(item.name)}</span>
                  <span class="eq-cov-pct">${item.value}%</span>
                </div>
                <div class="eq-cov-track"><div class="eq-cov-fill" style="width:${item.value}%"></div></div>
                <div class="eq-cov-note">${esc(item.note)} &mdash; ${esc(item.recommendation)}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── renderImpact ─────────────────────────────────────────────────────────────
  function renderImpact(data) {
    const panel = $('eq-panel-impact');
    if (!panel) return;
    const impact = data.impact;
    const reg = data.regression;

    const flowNodes = [
      { label: 'Requirement', val: data.requirementType || 'Input', sub: 'Source change' },
      { label: 'Modules', val: (impact.impactedModules || []).length + ' affected', sub: 'Application surface' },
      { label: 'APIs', val: (impact.impactedApis || []).length + ' detected', sub: 'Contract surface' },
      { label: 'Test Cases', val: (impact.impactedTestCases || []).length + ' mapped', sub: 'Validation surface' },
      { label: 'Run Plan', val: (reg.testsToRun || []).length + ' run / ' + (reg.testsToSkip || []).length + ' skip', sub: 'Regression decision' },
    ];

    panel.innerHTML = `
      <div class="eq-card" style="margin-bottom:14px">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Test Impact Analysis</h2><p class="eq-card-sub">Requirement change impact across test cases, automation scripts, modules, APIs, and data.</p></div>
          <span class="eq-chip eq-chip-teal">Impact Report</span>
        </div>
        <div class="eq-card-body">
          <div class="eq-flow">
            ${flowNodes.map((n, i) => `
              <div class="eq-flow-node">
                <strong>${esc(n.label)}</strong>
                <span>${esc(n.val)}</span>
                <small>${esc(n.sub)}</small>
              </div>
              ${i < flowNodes.length - 1 ? '<span class="eq-flow-arrow">→</span>' : ''}`).join('')}
          </div>
          <p style="font-size:.8rem;color:#475569;line-height:1.7;margin:16px 0 14px;padding:12px;background:#f8fafc;border-radius:8px;border-left:3px solid #1E6FE0">${esc(impact.report)}</p>
          <div class="eq-panel-grid four">
            ${listCard('Impacted Test Cases', impact.impactedTestCases)}
            ${listCard('Automation Scripts', impact.impactedAutomationScripts)}
            ${listCard('Impacted Modules', impact.impactedModules)}
            ${listCard('Impacted APIs', impact.impactedApis.length ? impact.impactedApis : ['No explicit API impact'])}
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Regression Optimization Engine</h2><p class="eq-card-sub">Recommended suites, run/skip guidance, and execution priority.</p></div>
        </div>
        <div class="eq-card-body">
          <div class="eq-panel-grid three" style="margin-bottom:14px">
            ${listCard('Smoke Suite', reg.smokeSuite)}
            ${listCard('Sanity Suite', reg.sanitySuite)}
            ${listCard('Full Regression', reg.regressionSuite)}
            ${listCard('Impact-Based Regression', reg.impactBasedRegressionSuite)}
            ${listCard('Tests To Run', reg.testsToRun)}
            ${listCard('Tests To Skip', reg.testsToSkip)}
          </div>
          <div class="eq-section-h">Execution Priority</div>
          ${pillList(reg.executionPriority, 'teal')}
        </div>
      </div>
    `;
  }

  // ── renderDefects ────────────────────────────────────────────────────────────
  function renderDefects(data) {
    const panel = $('eq-panel-defects');
    if (!panel) return;
    const dp = data.defectPrediction;
    const score = dp.score;
    const gaugeColor = score >= 80 ? '#DC2626' : score >= 60 ? '#F5A623' : score >= 35 ? '#D97706' : '#22C55E';

    // SVG radial gauge
    const R = 52, circumference = 2 * Math.PI * R;
    const filled = circumference * (score / 100);
    const gaugeSvg = `<svg class="eq-gauge-svg" width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="rgba(0,0,0,.06)" stroke-width="10"/>
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="${gaugeColor}" stroke-width="10"
        stroke-dasharray="${filled} ${circumference}" stroke-linecap="round"
        style="transition:stroke-dasharray .8s cubic-bezier(.4,0,.2,1)"/>
      <text x="70" y="76" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="900" fill="${gaugeColor}" transform="rotate(90,70,70)">${score}%</text>
    </svg>`;

    panel.innerHTML = `
      <div class="eq-panel-grid two" style="margin-bottom:14px">
        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">Defect Prediction Engine</h2><p class="eq-card-sub">Likely failure areas from complexity, business rules, API surface, and workflow risk.</p></div>
            <span class="eq-chip ${score >= 60 ? 'eq-chip-red' : score >= 35 ? 'eq-chip-amber' : 'eq-chip-green'}">${score}% Score</span>
          </div>
          <div class="eq-card-body" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
            <div class="eq-gauge-wrap">
              ${gaugeSvg}
              <div class="eq-gauge-label">
                <div class="eq-gauge-sub" style="color:${gaugeColor};font-weight:700;font-size:.75rem;margin-top:4px">Defect Likelihood</div>
              </div>
            </div>
            <div style="flex:1;min-width:200px">
              <div class="eq-section-h">Prediction Drivers</div>
              <div class="eq-alert-list">
                ${dp.drivers.map(d => `<div class="eq-alert ${score >= 60 ? 'critical' : 'warning'}"><span>${esc(d)}</span></div>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="eq-card">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">Failure Hotspots</h2><p class="eq-card-sub">Areas most likely to produce defects based on requirement signals.</p></div>
          </div>
          <div class="eq-card-body">
            <div class="eq-panel-grid two">
              ${listCard('Likely Failure Areas', dp.likelyFailureAreas)}
              ${listCard('High Risk Components', dp.highRiskComponents)}
            </div>
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Automation Expansion</h2><p class="eq-card-sub">Framework-ready targets for UI, API, and BDD automation layers.</p></div>
        </div>
        <div class="eq-card-body">
          <div class="eq-panel-grid three" style="margin-bottom:12px">
            ${['ui', 'api', 'bdd'].map(type => {
              const rows = data.automationExpansion[type] || [];
              const titles = { ui: 'UI Frameworks', api: 'API Frameworks', bdd: 'BDD Frameworks' };
              return `<div class="eq-list-card">
                <h3>${titles[type]}</h3>
                ${rows.map(r => `<div class="eq-fw-row"><span class="eq-fw-name">${esc(r.framework)}</span><span class="eq-fw-fit">${esc(r.fit)}</span></div>`).join('')}
              </div>`;
            }).join('')}
          </div>
          <p style="font-size:.78rem;color:#475569;padding:12px;background:#f8fafc;border-radius:8px;line-height:1.6;margin:0">${esc(data.automationExpansion.recommendation)}</p>
        </div>
      </div>
    `;
  }

  // ── renderCopilot (AI Chat) ──────────────────────────────────────────────────
  function renderCopilot(data) {
    const panel = $('eq-panel-copilot');
    if (!panel) return;

    const commands = [
      'Explain the risk score', 'Show uncovered requirements', 'Generate missing test cases',
      'Generate security tests', 'Generate API boundary tests', 'Show automation gaps',
      'Show impacted modules', 'Create regression suite', 'Why was this requirement flagged?'
    ];

    panel.innerHTML = `
      <div class="eq-panel-grid two">
        <div class="eq-card" style="grid-column:1/-1">
          <div class="eq-card-header">
            <div><h2 class="eq-card-title">AI QA Copilot</h2><p class="eq-card-sub">Ask anything about your requirement — coverage gaps, test strategy, risk, automation, regression, API design, and more.</p></div>
            <span class="eq-chip eq-chip-teal">
              <span style="width:6px;height:6px;border-radius:50%;background:#06C2AC;display:inline-block;box-shadow:0 0 5px #06C2AC;animation:eqPulse 2s infinite;flex-shrink:0"></span>
              AI Ready
            </span>
          </div>
          <div class="eq-chat-wrap">
            <div class="eq-cmd-chips" id="eqCmdChips">
              ${commands.map(c => `<button class="eq-cmd-chip" type="button" data-cmd="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>
            <div class="eq-chat-msgs" id="eqChatMsgs">
              <div class="eq-chat-msg ai">
                <div class="eq-chat-avatar">AI</div>
                <div class="eq-chat-bubble">Hello! I've analyzed your requirement. I can help you with test coverage, risk analysis, API test design, automation gaps, and more.<br><br>Click a quick command above or type your question below.</div>
              </div>
            </div>
            <div class="eq-chat-footer">
              <input class="eq-chat-input" id="eqChatInput" type="text" placeholder="Ask about coverage gaps, security tests, automation strategy..." />
              <button class="eq-chat-send" id="eqChatSend" type="button">
                ${ICONS.send}
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind command chips
    panel.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = $('eqChatInput');
        if (input) input.value = btn.dataset.cmd;
        sendCopilotMessage(btn.dataset.cmd);
      });
    });

    // Bind send button
    $('eqChatSend')?.addEventListener('click', () => {
      const input = $('eqChatInput');
      const q = (input?.value || '').trim();
      if (q) sendCopilotMessage(q);
    });

    // Enter key
    $('eqChatInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const q = (e.target.value || '').trim();
        if (q) { e.preventDefault(); sendCopilotMessage(q); }
      }
    });
  }

  function appendChatMsg(role, text) {
    const msgs = $('eqChatMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `eq-chat-msg ${role}`;
    div.innerHTML = `
      <div class="eq-chat-avatar">${role === 'ai' ? 'AI' : 'You'}</div>
      <div class="eq-chat-bubble" style="white-space:pre-wrap">${esc(text)}</div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function appendThinking() {
    const msgs = $('eqChatMsgs');
    if (!msgs) return null;
    const div = document.createElement('div');
    div.className = 'eq-chat-msg ai';
    div.innerHTML = `<div class="eq-chat-avatar">AI</div><div class="eq-chat-bubble eq-chat-thinking"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendCopilotMessage(question) {
    if (!question || !currentIntelligence) return;
    const input = $('eqChatInput');
    const sendBtn = $('eqChatSend');
    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    appendChatMsg('user', question);
    const thinking = appendThinking();
    copilotHistory.push({ role: 'user', content: question });

    const aiEnabled = $('eqAiToggle')?.checked !== false;
    let answer = '';

    if (aiEnabled) {
      try {
        const contextStr = JSON.stringify({
          requirementType: currentIntelligence.requirementType,
          scores: currentIntelligence.scores,
          classifications: currentIntelligence.classifications,
          modules: currentIntelligence.modules,
          ambiguity: currentIntelligence.ambiguity,
          risks: currentIntelligence.risks,
          defectPrediction: { score: currentIntelligence.defectPrediction.score, likelyFailureAreas: currentIntelligence.defectPrediction.likelyFailureAreas },
          coverageSummary: currentIntelligence.coverage.map(c => `${c.name}: ${c.value}%`),
          apiMode: currentIntelligence.api.mode,
          endpoints: (currentIntelligence.api.endpoints || []).map(e => `${e.method} ${e.endpoint}`),
          testCaseCount: (currentIntelligence.enterpriseTestCases || []).length,
        }, null, 2);

        const systemMsg = `You are an expert QA engineer and test architect for eMudhra enterprise systems. You have just analyzed a requirement and produced the following intelligence. Answer the user's question concisely and professionally, focusing on practical QA guidance.\n\nAnalysis context:\n${contextStr}`;

        const resp = await fetch(AI_RELAY + '/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: systemMsg },
              ...copilotHistory.slice(-8)
            ],
            stream: false,
            max_tokens: 600
          }),
          signal: AbortSignal.timeout(30000)
        });
        if (resp.ok) {
          const d = await resp.json();
          answer = d.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (_) { /* fall through to deterministic */ }
    }

    if (!answer) {
      answer = (typeof EnterpriseQAEngine !== 'undefined')
        ? EnterpriseQAEngine.answerCopilot(question, currentIntelligence)
        : 'Analysis engine not loaded. Please refresh the page.';
    }

    copilotHistory.push({ role: 'assistant', content: answer });
    if (thinking) thinking.remove();
    appendChatMsg('ai', answer);
    if (sendBtn) sendBtn.disabled = false;
  }

  // ── renderTestData ───────────────────────────────────────────────────────────
  function renderTestData(data) {
    const panel = $('eq-panel-testdata');
    if (!panel) return;

    const groups = [
      ['Positive Data', data.testData.positiveData, 'eq-chip-green'],
      ['Negative Data', data.testData.negativeData, 'eq-chip-red'],
      ['Boundary Data', data.testData.boundaryData, 'eq-chip-amber'],
      ['Security Data', data.testData.securityData, 'eq-chip-red'],
      ['Performance Data', data.testData.performanceData, 'eq-chip-blue'],
      ['API Payload Data', data.testData.apiPayloadData, 'eq-chip-teal'],
      ['Database Seed Data', data.testData.databaseSeedData, 'eq-chip-gray'],
    ];

    panel.innerHTML = `
      <div class="eq-card" style="margin-bottom:14px">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Test Data Intelligence</h2><p class="eq-card-sub">Positive, negative, boundary, security, performance, payload, and database seed datasets.</p></div>
        </div>
        <div class="eq-card-body">
          <div class="eq-panel-grid three">
            ${groups.map(([name, rows, chip]) => {
              const empty = !rows || !rows.length;
              return `<div class="eq-list-card">
                <h3 style="display:flex;align-items:center;gap:6px;justify-content:space-between">
                  ${esc(name)}
                  <span class="eq-chip ${chip}" style="font-size:.58rem;padding:1px 6px">${empty ? '0' : rows.length}</span>
                </h3>
                ${empty
                  ? '<p style="font-size:.72rem;color:#94a3b8;font-style:italic">No specific data detected.</p>'
                  : rows.map(row => `<div class="eq-data-row">
                      <span class="eq-data-field">${esc(row.field || row.name || row.table || 'payload')}</span>
                      <span class="eq-data-val">${esc(prettyJson(row.value || row.payload || row.rows || ''))}</span>
                    </div>`).join('')}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Database Validation Engine</h2><p class="eq-card-sub">Detected operations and auto-generated SQL verification queries.</p></div>
          <span class="eq-chip ${data.database.detected ? 'eq-chip-teal' : 'eq-chip-gray'}">${data.database.detected ? 'DB Detected' : 'No DB Signals'}</span>
        </div>
        <div class="eq-card-body">
          <div class="eq-panel-grid two" style="margin-bottom:14px">
            ${listCard('Detected Operations', data.database.operations.length ? data.database.operations : ['None detected'])}
            ${listCard('Database References', data.database.references.length ? data.database.references : ['No explicit table/entity references'])}
          </div>
          ${data.database.sqlQueries.length
            ? `<div class="eq-section-h">Generated SQL Queries</div>
               <div class="eq-code-wrap" id="sqlBlock">
                 <pre class="eq-sql-block">${esc(data.database.sqlQueries.join('\n\n'))}</pre>
                 <button class="eq-code-copy" type="button" onclick="(function(){var el=document.getElementById('sqlBlock');var txt=el.querySelector('pre').textContent;navigator.clipboard&&navigator.clipboard.writeText(txt).then(function(){if(typeof showToast==='function')showToast('SQL copied','success');});})()">Copy SQL</button>
               </div>`
            : ''}
        </div>
      </div>
    `;
  }

  // ── renderRoadmap ────────────────────────────────────────────────────────────
  function renderRoadmap(data) {
    const panel = $('eq-panel-roadmap');
    if (!panel) return;
    const d = data.deliverables;

    const phases = [
      { title: 'Architecture Design', items: d.architectureDesign },
      { title: 'Database Changes', items: d.databaseChanges },
      { title: 'Backend APIs', items: d.backendApis },
      { title: 'Frontend Changes', items: d.frontendChanges },
      { title: 'AI Prompt Design', items: d.aiPromptDesign },
      { title: 'Folder Structure', items: d.folderStructure },
      { title: 'Migration Plan', items: d.migrationPlan },
      { title: 'Implementation Roadmap', items: d.implementationRoadmap },
    ];

    panel.innerHTML = `
      <div class="eq-card">
        <div class="eq-card-header">
          <div><h2 class="eq-card-title">Final Deliverables Roadmap</h2><p class="eq-card-sub">Scalable implementation blueprint for the enterprise QA platform upgrade.</p></div>
          <span class="eq-chip eq-chip-teal">8 phases</span>
        </div>
        <div class="eq-card-body">
          <div class="eq-panel-grid two">
            ${phases.map((phase, i) => `
              <div class="eq-roadmap-phase">
                <div class="eq-roadmap-phase-header">
                  <div class="eq-roadmap-phase-num">${i + 1}</div>
                  <span class="eq-roadmap-phase-title">${esc(phase.title)}</span>
                  <span class="eq-chip eq-chip-gray" style="font-size:.58rem;padding:1px 6px;margin-left:auto">${(phase.items || []).length}</span>
                </div>
                <div class="eq-roadmap-phase-body">
                  ${(phase.items || ['No items detected']).map(item => `<div class="eq-roadmap-item">${esc(item)}</div>`).join('')}
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── renderAll ────────────────────────────────────────────────────────────────
  function renderAll(intelligence) {
    currentIntelligence = intelligence;
    copilotHistory = [];
    renderKpis(intelligence);
    renderRequirement(intelligence);
    renderApi(intelligence);
    renderRisk(intelligence);
    renderImpact(intelligence);
    renderDefects(intelligence);
    renderCopilot(intelligence);
    renderTestData(intelligence);
    renderRoadmap(intelligence);
  }

  // ── Exports ──────────────────────────────────────────────────────────────────
  function exportJson() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    const blob = new Blob([JSON.stringify(currentIntelligence, null, 2)], { type: 'application/json' });
    dlBlob(blob, 'enterprise-qa-intelligence.json');
    showToast('JSON exported.', 'success');
  }

  function exportCsv() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    const headers = ['Test Case ID','Requirement ID','Requirement Mapping','Module','Feature','Test Objective','Preconditions','Test Data','Test Steps','Expected Results','Priority','Severity','Risk','Automation Candidate','Requirement Traceability','API Mapping'];
    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...currentIntelligence.enterpriseTestCases.map(r =>
        [r.testCaseId,r.requirementId,r.requirementMapping,r.module,r.feature,r.testObjective,r.preconditions,r.testData,r.testSteps,r.expectedResults,r.priority,r.severity,r.risk,r.automationCandidate,r.requirementTraceability,r.apiMapping]
          .map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');
    dlBlob(new Blob([csv], { type: 'text/csv' }), 'enterprise-test-cases.csv');
    showToast('CSV exported.', 'success');
  }

  function exportPdf() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    window.print();
  }

  function dlBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Tab switching ────────────────────────────────────────────────────────────
  function switchTab(name, updateHash) {
    const n = name || 'requirement';
    document.querySelectorAll('[data-eq-tab]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.eqTab === n));
    document.querySelectorAll('.eq-panel').forEach(p =>
      p.classList.toggle('active', p.id === `eq-panel-${n}`));
    if (updateHash)
      history.replaceState(null, '', n === 'requirement' ? 'enterprise.html' : `enterprise.html#${n}`);
  }

  // ── Run analysis ─────────────────────────────────────────────────────────────
  async function runAnalysis() {
    const input = $('enterpriseRequirementInput');
    const text = input?.value?.trim() || '';
    if (!text) { showToast('Enter a requirement, API spec, or load the latest QA output.', 'warning'); return; }

    const loadingBar = $('eqLoadingBar');
    const analyzeBtn = $('runEnterpriseAnalysisBtn');
    const modeLabel  = $('eqModeLabel');

    if (loadingBar) loadingBar.classList.add('active');
    if (analyzeBtn) { analyzeBtn.disabled = true; analyzeBtn.querySelector('span:last-child').textContent = 'Analyzing…'; }
    if (modeLabel) modeLabel.textContent = 'Analyzing…';

    // Small async delay so UI updates render before heavy computation
    await new Promise(r => setTimeout(r, 30));

    try {
      const intelligence = EnterpriseQAEngine.analyzeRequirement(text);
      localStorage.setItem(STORAGE_KEY, text);
      localStorage.setItem('qa_gen_enterprise_last_snapshot', JSON.stringify({ savedAt: new Date().toISOString(), data: intelligence }));
      renderAll(intelligence);

      const exportBar = $('eqExportBar');
      if (exportBar) exportBar.classList.remove('hidden');
      if (typeof AppState !== 'undefined') AppState.addLog('Enterprise QE analysis generated', 'generation');
      showToast('Enterprise QA intelligence generated.', 'success');
    } catch (e) {
      showToast('Analysis failed: ' + e.message, 'error');
    } finally {
      if (loadingBar) loadingBar.classList.remove('active');
      if (analyzeBtn) { analyzeBtn.disabled = false; analyzeBtn.querySelector('span:last-child').textContent = 'Analyze Requirement'; }
      if (modeLabel) modeLabel.textContent = 'Ready';
    }
  }

  // ── Load last output ─────────────────────────────────────────────────────────
  function loadLastOutput() {
    const text = (typeof EnterpriseQAEngine !== 'undefined') ? EnterpriseQAEngine.readLastOutputText() : '';
    if (!text) { showToast('No generated QA output found. Run Test Management first.', 'warning'); return; }
    const input = $('enterpriseRequirementInput');
    if (input) { input.value = text; updateCounters(input); }
    runAnalysis();
  }

  // ── Counter helper ───────────────────────────────────────────────────────────
  function updateCounters(input) {
    const v = input.value;
    const chars = v.length;
    const words = v.trim() ? v.trim().split(/\s+/).length : 0;
    const lines = v.split('\n').length;
    const cc = $('eqCharCount'); if (cc) cc.textContent = chars.toLocaleString();
    const wc = $('eqWordCount'); if (wc) wc.textContent = words.toLocaleString();
    const lc = $('eqLineCount'); if (lc) lc.textContent = lines.toLocaleString();
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    const input = $('enterpriseRequirementInput');
    if (!input) return;
    localStorage.removeItem(STORAGE_KEY);
    input.value = '';

    input.addEventListener('input', () => updateCounters(input));
    updateCounters(input);

    // Ctrl+Enter to analyze
    input.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runAnalysis(); }
    });

    // Drag-and-drop file onto textarea
    input.addEventListener('dragover', e => { e.preventDefault(); input.style.borderColor = '#1E6FE0'; });
    input.addEventListener('dragleave', () => { input.style.borderColor = ''; });
    input.addEventListener('drop', e => {
      e.preventDefault(); input.style.borderColor = '';
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { input.value = ev.target.result || ''; updateCounters(input); showToast('File imported: ' + file.name, 'success'); };
      reader.readAsText(file);
    });

    // File input
    const fileInput = $('enterpriseFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const f = fileInput.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => { input.value = ev.target.result || ''; updateCounters(input); showToast('Imported: ' + f.name, 'success'); };
        r.readAsText(f); fileInput.value = '';
      });
    }

    $('runEnterpriseAnalysisBtn')?.addEventListener('click', runAnalysis);
    $('loadLastOutputBtn')?.addEventListener('click', loadLastOutput);
    $('loadSampleApiBtn')?.addEventListener('click', () => {
      input.value = SAMPLE_API_SPEC; updateCounters(input); runAnalysis();
    });
    $('eqClearBtn')?.addEventListener('click', () => {
      input.value = ''; updateCounters(input);
      $('eqKpiGrid').innerHTML = '';
      $('eqExportBar')?.classList.add('hidden');
      currentIntelligence = null; copilotHistory = [];
      ['requirement','api','risk','impact','defects','copilot','testdata','roadmap'].forEach(t => {
        const p = $('eq-panel-' + t); if (p) p.innerHTML = '';
      });
      showToast('Cleared.', 'success');
    });

    $('exportJsonBtn')?.addEventListener('click', exportJson);
    $('exportCsvBtn')?.addEventListener('click', exportCsv);
    $('exportPdfBtn')?.addEventListener('click', exportPdf);

    // Tabs
    document.querySelectorAll('[data-eq-tab]').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.eqTab, true)));
    window.addEventListener('hashchange', () =>
      switchTab(location.hash.replace('#', '') || 'requirement', false));

    const hashTab = location.hash.replace('#', '');
    switchTab(hashTab || 'requirement', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
