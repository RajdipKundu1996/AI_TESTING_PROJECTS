// Enterprise QE dashboard renderer.
(function() {
  'use strict';

  const STORAGE_KEY = 'qa_gen_enterprise_last_input';
  let currentIntelligence = null;

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

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function asPercent(value) {
    return `${Math.max(0, Math.min(100, Math.round(Number(value) || 0)))}%`;
  }

  function prettyJson(value) {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value || '');
    }
  }

  function scoreClass(value) {
    const num = Number(value) || 0;
    if (num >= 80) return 'critical';
    if (num >= 60) return 'warning';
    if (num >= 35) return 'medium';
    return 'good';
  }

  function qualityClass(value) {
    const num = Number(value) || 0;
    if (num >= 80) return 'good';
    if (num >= 60) return 'medium';
    if (num >= 40) return 'warning';
    return 'critical';
  }

  function pillList(items, className) {
    const rows = (items && items.length ? items : ['None detected']).map(item => `<span class="${className || 'enterprise-pill'}">${escapeHtml(item)}</span>`);
    return `<div class="enterprise-pill-list">${rows.join('')}</div>`;
  }

  function renderSummary(data) {
    const target = $('enterpriseSummaryCards');
    if (!target) return;
    const cards = [
      ['Requirement Type', data.requirementType, 'Type', 'blue'],
      ['Complexity', asPercent(data.scores.complexityScore), 'Score', scoreClass(data.scores.complexityScore)],
      ['Risk', asPercent(data.scores.riskScore), 'Score', scoreClass(data.scores.riskScore)],
      ['Quality', asPercent(data.scores.requirementQualityScore), 'Score', qualityClass(data.scores.requirementQualityScore)],
      ['Ambiguity', asPercent(data.scores.ambiguityScore), 'Score', scoreClass(data.scores.ambiguityScore)],
      ['Coverage', asPercent(data.scores.coverageConfidenceScore), 'Score', qualityClass(data.scores.coverageConfidenceScore)],
      ['API Mode', data.api.mode ? 'Enabled' : 'Not detected', data.api.modeLabel, data.api.mode ? 'teal' : 'gray']
    ];
    target.innerHTML = cards.map(([label, value, note, tone]) => `
      <article class="enterprise-summary-card ${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `).join('');

    const modeChip = $('enterpriseModeChip');
    if (modeChip) {
      modeChip.textContent = data.api.modeLabel;
      modeChip.className = `panel-chip ${data.api.mode ? 'cyan' : ''}`;
    }
  }

  function renderRequirement(data) {
    const target = $('enterprise-tab-requirement');
    if (!target) return;
    const scoreRows = [
      ['Complexity Score', data.scores.complexityScore, 'Requirement size, module spread, API/data/workflow breadth'],
      ['Risk Score', data.scores.riskScore, 'Business, technical, security, and operational exposure'],
      ['Coverage Confidence Score', data.scores.coverageConfidenceScore, 'Expected depth of generated tests from available detail'],
      ['Requirement Quality Score', data.scores.requirementQualityScore, 'Specificity, acceptance criteria, schemas, roles, and NFRs'],
      ['Ambiguity Score', data.scores.ambiguityScore, 'Subjective language and missing measurable criteria']
    ];

    target.innerHTML = `
      <div class="enterprise-grid two">
        <section class="premium-panel enterprise-module-card">
          <div class="panel-title-row">
            <div><h2>Requirement Intelligence</h2><p>Pre-generation assessment used to guide enterprise test design.</p></div>
            <span class="panel-chip">${escapeHtml(data.requirementType)}</span>
          </div>
          <div class="enterprise-score-list">
            ${scoreRows.map(([name, score, note]) => `
              <div class="enterprise-score-row">
                <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(note)}</span></div>
                <b class="${name.includes('Quality') || name.includes('Confidence') ? qualityClass(score) : scoreClass(score)}">${asPercent(score)}</b>
              </div>
            `).join('')}
          </div>
          <h3>Classifications</h3>
          ${pillList(data.classifications)}
          <h3>Detected Modules</h3>
          ${pillList(data.modules)}
        </section>

        <section class="premium-panel enterprise-module-card">
          <div class="panel-title-row">
            <div><h2>Ambiguity Detection</h2><p>Missing acceptance criteria and clarification suggestions.</p></div>
            <span class="panel-chip ${data.ambiguity.items.length ? '' : 'cyan'}">${data.ambiguity.items.length} items</span>
          </div>
          <div class="enterprise-alert-list">
            ${data.ambiguity.items.length ? data.ambiguity.items.map(item => `
              <div class="enterprise-alert warning">
                <strong>${escapeHtml(item.term)}</strong>
                <span>${escapeHtml(item.issue)}</span>
                <small>${escapeHtml(item.clarification)}</small>
              </div>
            `).join('') : '<div class="enterprise-alert good"><strong>No major ambiguous term detected</strong><span>Requirement language has enough measurable detail for first-pass analysis.</span></div>'}
            ${data.ambiguity.missingAcceptanceCriteria ? '<div class="enterprise-alert critical"><strong>Acceptance criteria missing</strong><span>Add Given/When/Then, status codes, thresholds, or explicit expected results.</span></div>' : ''}
          </div>
          <h3>Clarification Suggestions</h3>
          <ul class="enterprise-list">${data.ambiguity.clarificationSuggestions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
      </div>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>Enterprise Test Cases</h2><p>Every row includes ID, requirement mapping, objective, data, steps, expected result, priority, severity, risk, automation, traceability, and API mapping.</p></div>
          <span class="panel-chip cyan">${data.enterpriseTestCases.length} cases</span>
        </div>
        ${renderEnterpriseTestCaseTable(data.enterpriseTestCases)}
      </section>
    `;
  }

  function renderEnterpriseTestCaseTable(rows) {
    const headers = [
      'Test Case ID',
      'Requirement ID',
      'Requirement Mapping',
      'Module',
      'Feature',
      'Test Objective',
      'Preconditions',
      'Test Data',
      'Test Steps',
      'Expected Results',
      'Priority',
      'Severity',
      'Risk',
      'Automation Candidate',
      'Requirement Traceability',
      'API Mapping'
    ];
    const cells = row => [
      row.testCaseId,
      row.requirementId,
      row.requirementMapping,
      row.module,
      row.feature,
      row.testObjective,
      row.preconditions,
      row.testData,
      row.testSteps,
      row.expectedResults,
      row.priority,
      row.severity,
      row.risk,
      row.automationCandidate,
      row.requirementTraceability,
      row.apiMapping
    ];
    return `
      <div class="enterprise-table-wrap">
        <table class="enterprise-table">
          <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(row => `<tr>${cells(row).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    `;
  }

  function renderApi(data) {
    const target = $('enterprise-tab-api');
    if (!target) return;
    const examples = data.api.payloadExamples;
    target.innerHTML = `
      <div class="enterprise-grid two">
        <section class="premium-panel enterprise-module-card">
          <div class="panel-title-row">
            <div><h2>API Detection Engine</h2><p>Automatic API analysis mode for REST, GraphQL, Swagger/OpenAPI, payload, and status-code signals.</p></div>
            <span class="panel-chip ${data.api.mode ? 'cyan' : ''}">${data.api.mode ? 'Auto-switched' : 'Requirement mode'}</span>
          </div>
          <div class="enterprise-kpi-row">
            <div><span>Endpoints</span><strong>${data.api.endpoints.length}</strong></div>
            <div><span>OpenAPI</span><strong>${data.api.openApi.detected ? data.api.openApi.format : 'No'}</strong></div>
            <div><span>GraphQL</span><strong>${data.api.graphqlDetected ? 'Yes' : 'No'}</strong></div>
          </div>
          ${data.api.endpoints.length ? data.api.endpoints.map(ep => `
            <article class="enterprise-endpoint-card">
              <div><b>${escapeHtml(ep.method)}</b><strong>${escapeHtml(ep.endpoint)}</strong></div>
              <p>Auth: ${escapeHtml(ep.authentication)}</p>
              <p>Headers: ${escapeHtml(ep.headers.join(', '))}</p>
              <p>Status Codes: ${escapeHtml(ep.statusCodes.join(', '))}</p>
            </article>
          `).join('') : '<div class="soft-empty">No endpoint path was detected. Add method and route details to activate endpoint-level analysis.</div>'}
        </section>

        <section class="premium-panel enterprise-module-card">
          <div class="panel-title-row">
            <div><h2>Request & Response Payload Intelligence</h2><p>Realistic examples for positive, boundary, invalid, security, and performance testing.</p></div>
            <span class="panel-chip">${escapeHtml(examples.method)} ${escapeHtml(examples.endpoint)}</span>
          </div>
          <div class="enterprise-payload-grid">
            ${examples.requests.map(item => `<details open><summary>${escapeHtml(item.name)}</summary><pre>${escapeHtml(prettyJson(item.payload))}</pre></details>`).join('')}
          </div>
          <h3>Response Examples</h3>
          <div class="enterprise-response-grid">
            ${examples.responses.map(item => `<details><summary>${item.status} ${escapeHtml(item.name)}</summary><pre>${escapeHtml(prettyJson(item.body))}</pre></details>`).join('')}
          </div>
        </section>
      </div>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>Advanced API Test Generation</h2><p>Functional, boundary, security, contract, and reliability coverage.</p></div>
          <span class="panel-chip cyan">${data.api.generatedTests.length} tests</span>
        </div>
        <div class="enterprise-api-test-grid">
          ${data.api.generatedTests.map(item => `
            <article class="enterprise-api-test-card ${item.category.toLowerCase()}">
              <span>${escapeHtml(item.category)}</span>
              <strong>${escapeHtml(item.scenario)}</strong>
              <p>${escapeHtml(item.steps)}</p>
              <small>${escapeHtml(item.expected)}</small>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderRisk(data) {
    const target = $('enterprise-tab-risk');
    if (!target) return;
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>Risk Dashboard</h2><p>Business, security, technical, and operational risk with execution strategy.</p></div>
          <span class="panel-chip">${escapeHtml(data.risks[0]?.level || 'Low')}</span>
        </div>
        <div class="enterprise-risk-grid">
          ${data.risks.map(risk => `
            <article class="enterprise-risk-card ${risk.level.toLowerCase()}">
              <span>${escapeHtml(risk.name)}</span>
              <strong>${escapeHtml(risk.level)} - ${risk.score}%</strong>
              <p>${escapeHtml(risk.reason)}</p>
              <small>${escapeHtml(risk.executionStrategy)}</small>
            </article>
          `).join('')}
        </div>
      </section>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Test Coverage Intelligence</h2><p>Coverage scores and recommendations by testing dimension.</p></div></div>
        <div class="enterprise-coverage-list">
          ${data.coverage.map(item => `
            <div class="enterprise-coverage-row">
              <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.note)}</span></div>
              <div class="enterprise-coverage-meter"><i style="width:${item.value}%"></i></div>
              <b>${item.value}%</b>
              <small>${escapeHtml(item.recommendation)}</small>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderImpact(data) {
    const target = $('enterprise-tab-impact');
    if (!target) return;
    const impact = data.impact;
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>Test Impact Analysis</h2><p>Requirement change impact across test cases, automation scripts, modules, APIs, and data.</p></div>
          <span class="panel-chip cyan">Impact Report</span>
        </div>
        ${renderImpactFlow(data)}
        <div class="enterprise-impact-summary">${escapeHtml(impact.report)}</div>
        <div class="enterprise-grid four">
          ${renderImpactList('Impacted Test Cases', impact.impactedTestCases)}
          ${renderImpactList('Impacted Automation Scripts', impact.impactedAutomationScripts)}
          ${renderImpactList('Impacted Modules', impact.impactedModules)}
          ${renderImpactList('Impacted APIs', impact.impactedApis.length ? impact.impactedApis : ['No explicit API impact detected'])}
        </div>
      </section>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Regression Optimization Engine</h2><p>Recommended suites, run/skip guidance, and execution priority.</p></div></div>
        <div class="enterprise-grid two">
          ${renderImpactList('Smoke Suite', data.regression.smokeSuite)}
          ${renderImpactList('Sanity Suite', data.regression.sanitySuite)}
          ${renderImpactList('Regression Suite', data.regression.regressionSuite)}
          ${renderImpactList('Impact-Based Regression Suite', data.regression.impactBasedRegressionSuite)}
          ${renderImpactList('Tests To Run', data.regression.testsToRun)}
          ${renderImpactList('Tests To Skip', data.regression.testsToSkip)}
        </div>
        <h3>Execution Priority</h3>
        ${pillList(data.regression.executionPriority)}
      </section>
    `;
  }

  function renderImpactFlow(data) {
    const impact = data.impact || {};
    const regression = data.regression || {};
    const nodes = [
      ['Requirement', data.requirementType || 'Analyzed input', 'Source change'],
      ['Modules', `${(impact.impactedModules || []).length} impacted`, 'Application surface'],
      ['APIs', `${(impact.impactedApis || []).length} detected`, 'Contract surface'],
      ['Tests', `${(impact.impactedTestCases || []).length} mapped`, 'Validation surface'],
      ['Run Plan', `${(regression.testsToRun || []).length} run / ${(regression.testsToSkip || []).length} skip`, 'Regression decision']
    ];
    const metrics = [
      ['Automation', (impact.impactedAutomationScripts || []).length, 'script(s)'],
      ['Smoke', (regression.smokeSuite || []).length, 'case(s)'],
      ['Sanity', (regression.sanitySuite || []).length, 'case(s)'],
      ['Regression', (regression.regressionSuite || []).length, 'case(s)']
    ];

    return `
      <div class="enterprise-impact-visual" aria-label="Impact analysis flow">
        <div class="enterprise-impact-flow">
          ${nodes.map((node, index) => `
            <div class="enterprise-flow-step">
              <article class="enterprise-flow-node">
                <span>${escapeHtml(node[0])}</span>
                <strong>${escapeHtml(node[1])}</strong>
                <small>${escapeHtml(node[2])}</small>
              </article>
              ${index < nodes.length - 1 ? '<i class="enterprise-flow-connector" aria-hidden="true"></i>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="enterprise-impact-metrics">
          ${metrics.map(item => `
            <article>
              <span>${escapeHtml(item[0])}</span>
              <strong>${escapeHtml(item[1])}</strong>
              <small>${escapeHtml(item[2])}</small>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderImpactList(title, items) {
    return `
      <article class="enterprise-list-card">
        <h3>${escapeHtml(title)}</h3>
        <ul>${(items && items.length ? items : ['None detected']).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </article>
    `;
  }

  function renderDefects(data) {
    const target = $('enterprise-tab-defects');
    if (!target) return;
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>Defect Prediction Engine</h2><p>Likely failure areas from requirement complexity, business rules, API complexity, and workflow risk.</p></div>
          <span class="panel-chip">${data.defectPrediction.score}% score</span>
        </div>
        <div class="enterprise-defect-score ${scoreClass(data.defectPrediction.score)}">
          <strong>${data.defectPrediction.score}%</strong>
          <span>Defect Prediction Score</span>
        </div>
        <div class="enterprise-grid three">
          ${renderImpactList('Likely Failure Areas', data.defectPrediction.likelyFailureAreas)}
          ${renderImpactList('High Risk Components', data.defectPrediction.highRiskComponents)}
          ${renderImpactList('Prediction Drivers', data.defectPrediction.drivers)}
        </div>
      </section>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Automation Expansion</h2><p>Framework-ready targets for UI, API, and BDD automation.</p></div></div>
        <div class="enterprise-framework-grid">
          ${renderFrameworkGroup('UI', data.automationExpansion.ui)}
          ${renderFrameworkGroup('API', data.automationExpansion.api)}
          ${renderFrameworkGroup('BDD', data.automationExpansion.bdd)}
        </div>
        <div class="enterprise-impact-summary">${escapeHtml(data.automationExpansion.recommendation)}</div>
      </section>
    `;
  }

  function renderFrameworkGroup(title, rows) {
    return `
      <article class="enterprise-list-card">
        <h3>${escapeHtml(title)}</h3>
        ${(rows || []).map(row => `<div class="enterprise-framework-row"><strong>${escapeHtml(row.framework)}</strong><span>${escapeHtml(row.fit)}</span></div>`).join('')}
      </article>
    `;
  }

  function renderCopilot(data) {
    const target = $('enterprise-tab-copilot');
    if (!target) return;
    const commands = [
      'Show uncovered requirements',
      'Generate missing test cases',
      'Generate security tests',
      'Generate API boundary tests',
      'Explain risk score',
      'Show automation gaps',
      'Show impacted modules',
      'Why was this test generated?',
      'Create regression suite'
    ];
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row">
          <div><h2>AI QA Copilot</h2><p>Dedicated QA assistant for coverage, risk, automation, impact, and regression questions.</p></div>
          <span class="panel-chip cyan">Assistant</span>
        </div>
        <div class="enterprise-command-grid">
          ${commands.map(command => `<button type="button" data-copilot-command="${escapeHtml(command)}">${escapeHtml(command)}</button>`).join('')}
        </div>
        <div class="enterprise-copilot-ask">
          <input id="copilotQuestionInput" type="text" value="Explain risk score" />
          <button class="add-project-btn compact" id="askCopilotBtn" type="button"><span class="add-project-icon">AI</span><span>Ask</span></button>
        </div>
        <pre class="enterprise-copilot-answer" id="copilotAnswer">${escapeHtml(EnterpriseQAEngine.answerCopilot('Explain risk score', data))}</pre>
      </section>
    `;
    target.querySelectorAll('[data-copilot-command]').forEach(button => {
      button.addEventListener('click', () => askCopilot(button.dataset.copilotCommand));
    });
    $('askCopilotBtn')?.addEventListener('click', () => askCopilot($('copilotQuestionInput')?.value || 'Explain risk score'));
  }

  function askCopilot(question) {
    const input = $('copilotQuestionInput');
    const answer = $('copilotAnswer');
    if (input) input.value = question;
    if (answer && currentIntelligence) {
      answer.textContent = EnterpriseQAEngine.answerCopilot(question, currentIntelligence);
    }
  }

  function renderTestData(data) {
    const target = $('enterprise-tab-testdata');
    if (!target) return;
    const groups = [
      ['Positive Data', data.testData.positiveData],
      ['Negative Data', data.testData.negativeData],
      ['Boundary Data', data.testData.boundaryData],
      ['Security Data', data.testData.securityData],
      ['Performance Data', data.testData.performanceData],
      ['API Payload Data', data.testData.apiPayloadData],
      ['Database Seed Data', data.testData.databaseSeedData]
    ];
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Test Data Intelligence</h2><p>Positive, negative, boundary, security, performance, API payload, and database seed data.</p></div></div>
        <div class="enterprise-grid three">
          ${groups.map(([name, rows]) => `
            <article class="enterprise-list-card">
              <h3>${escapeHtml(name)}</h3>
              ${(rows && rows.length ? rows : [{ field: 'N/A', value: 'No specific data detected', purpose: 'Add requirement detail to generate this dataset' }]).map(row => `
                <div class="enterprise-data-row">
                  <strong>${escapeHtml(row.field || row.name || row.table || 'payload')}</strong>
                  <code>${escapeHtml(prettyJson(row.value || row.payload || row.rows || ''))}</code>
                  <span>${escapeHtml(row.purpose || '')}</span>
                </div>
              `).join('')}
            </article>
          `).join('')}
        </div>
      </section>
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Database Validation Engine</h2><p>Detected data operations and SQL verification queries.</p></div><span class="panel-chip ${data.database.detected ? '' : 'cyan'}">${data.database.detected ? 'Detected' : 'No DB signals'}</span></div>
        <div class="enterprise-grid two">
          ${renderImpactList('Detected Operations', data.database.operations.length ? data.database.operations : ['None detected'])}
          ${renderImpactList('Database References', data.database.references.length ? data.database.references : ['No explicit table/entity references'])}
        </div>
        <pre class="enterprise-sql-block">${escapeHtml(data.database.sqlQueries.join('\n'))}</pre>
      </section>
    `;
  }

  function renderRoadmap(data) {
    const target = $('enterprise-tab-roadmap');
    if (!target) return;
    const deliverables = data.deliverables;
    const groups = [
      ['Architecture Design', deliverables.architectureDesign],
      ['Database Changes', deliverables.databaseChanges],
      ['Backend APIs', deliverables.backendApis],
      ['Frontend Changes', deliverables.frontendChanges],
      ['AI Prompt Design', deliverables.aiPromptDesign],
      ['Folder Structure', deliverables.folderStructure],
      ['Migration Plan', deliverables.migrationPlan],
      ['Implementation Roadmap', deliverables.implementationRoadmap]
    ];
    target.innerHTML = `
      <section class="premium-panel enterprise-module-card">
        <div class="panel-title-row"><div><h2>Final Deliverables</h2><p>Scalable implementation blueprint for the enterprise QA platform upgrade.</p></div><span class="panel-chip cyan">Roadmap</span></div>
        <div class="enterprise-grid two">
          ${groups.map(([title, rows]) => renderImpactList(title, rows)).join('')}
        </div>
      </section>
    `;
  }

  function renderAll(data) {
    currentIntelligence = data;
    renderSummary(data);
    renderRequirement(data);
    renderApi(data);
    renderRisk(data);
    renderImpact(data);
    renderDefects(data);
    renderCopilot(data);
    renderTestData(data);
    renderRoadmap(data);
  }

  function exportJson() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    const blob = new Blob([JSON.stringify(currentIntelligence, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'enterprise-qa-intelligence.json');
  }

  function exportCsv() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    const headers = [
      'Test Case ID', 'Requirement ID', 'Requirement Mapping', 'Module', 'Feature',
      'Test Objective', 'Preconditions', 'Test Data', 'Test Steps', 'Expected Results',
      'Priority', 'Severity', 'Risk', 'Automation Candidate', 'Requirement Traceability', 'API Mapping'
    ];
    const rows = currentIntelligence.enterpriseTestCases.map(row => [
      row.testCaseId, row.requirementId, row.requirementMapping, row.module, row.feature,
      row.testObjective, row.preconditions, row.testData, row.testSteps, row.expectedResults,
      row.priority, row.severity, row.risk, row.automationCandidate, row.requirementTraceability, row.apiMapping
    ].map(cell => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, 'enterprise-test-cases.csv');
  }

  function exportPdf() {
    if (!currentIntelligence) { showToast('Run analysis first.', 'warning'); return; }
    window.print();
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function runAnalysis() {
    const input = $('enterpriseRequirementInput')?.value || '';
    if (!input.trim()) {
      showToast('Enter a requirement, API spec, or load the latest QA output.', 'warning');
      return;
    }
    const data = EnterpriseQAEngine.analyzeRequirement(input);
    localStorage.setItem(STORAGE_KEY, input);
    localStorage.setItem('qa_gen_enterprise_last_snapshot', JSON.stringify({ savedAt: new Date().toISOString(), data }));
    renderAll(data);
    const exportBar = $('enterpriseExportBar');
    if (exportBar) exportBar.classList.remove('enterprise-export-bar--hidden');
    if (typeof AppState !== 'undefined') AppState.addLog('Enterprise QE analysis generated', 'generation');
    showToast('Enterprise QA intelligence generated.', 'success');
  }

  function switchTab(tabName, updateHash) {
    const name = tabName || 'requirement';
    document.querySelectorAll('[data-enterprise-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.enterpriseTab === name);
    });
    document.querySelectorAll('.enterprise-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `enterprise-tab-${name}`);
    });
    if (updateHash) {
      history.replaceState(null, '', name === 'requirement' ? 'enterprise.html' : `enterprise.html#${name}`);
    }
  }

  function loadLastOutput() {
    const text = EnterpriseQAEngine.readLastOutputText();
    if (!text) {
      showToast('No generated QA output was found yet.', 'warning');
      return;
    }
    const input = $('enterpriseRequirementInput');
    if (input) input.value = text;
    runAnalysis();
  }

  function init() {
    const input = $('enterpriseRequirementInput');
    if (!input) return;
    localStorage.removeItem(STORAGE_KEY);
    input.value = '';

    const charCount = $('enterpriseCharCount');
    function updateCharCount() {
      if (charCount) charCount.textContent = input.value.length.toLocaleString();
    }
    input.addEventListener('input', updateCharCount);
    updateCharCount();

    const fileInput = $('enterpriseFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          input.value = event.target.result || '';
          updateCharCount();
          showToast(`Imported: ${file.name}`, 'success');
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }

    $('runEnterpriseAnalysisBtn')?.addEventListener('click', runAnalysis);
    $('loadLastOutputBtn')?.addEventListener('click', loadLastOutput);
    $('loadSampleApiBtn')?.addEventListener('click', () => {
      input.value = SAMPLE_API_SPEC;
      updateCharCount();
      runAnalysis();
    });
    $('exportJsonBtn')?.addEventListener('click', exportJson);
    $('exportCsvBtn')?.addEventListener('click', exportCsv);
    $('exportPdfBtn')?.addEventListener('click', exportPdf);

    document.querySelectorAll('[data-enterprise-tab]').forEach(button => {
      button.addEventListener('click', () => switchTab(button.dataset.enterpriseTab, true));
    });
    window.addEventListener('hashchange', () => switchTab(location.hash.replace('#', '') || 'requirement', false));

    const data = EnterpriseQAEngine.analyzeRequirement(input.value);
    renderAll(data);
    const exportBar = $('enterpriseExportBar');
    if (exportBar) exportBar.classList.remove('enterprise-export-bar--hidden');
    const hashTab = location.hash.replace('#', '');
    switchTab(hashTab || 'requirement', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
