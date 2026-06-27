/*
 * Enterprise QA Intelligence Engine
 * Deterministic client-side analysis used to augment AI output with
 * requirement intelligence, API detection, risk, impact, defect prediction,
 * regression optimization, and test data recommendations.
 */
(function(global) {
  'use strict';

  const AMBIGUOUS_TERMS = [
    'fast',
    'quick',
    'efficient',
    'user friendly',
    'responsive',
    'secure',
    'reliable',
    'seamless',
    'robust',
    'intuitive',
    'easy to use',
    'high performance'
  ];

  const CLASSIFICATION_RULES = [
    ['UI Requirement', /\b(ui|screen|page|button|form|dropdown|modal|table|dashboard|navigation|responsive|accessibility|aria|keyboard|screen reader|contrast)\b/i],
    ['API Requirement', /\b(api|endpoint|rest|graphql|swagger|openapi|payload|request|response|status code|header|bearer|jwt)\b/i],
    ['Database Requirement', /\b(insert|update|delete|select|database|db|sql|table|foreign key|transaction|rollback|audit trail|data integrity)\b/i],
    ['Security Requirement', /\b(security|auth|authentication|authorization|jwt|oauth|saml|sso|token|encrypt|mask|permission|role|rate limit|sql injection|xss|csrf)\b/i],
    ['Accessibility Requirement', /\b(accessibility|wcag|aria|screen reader|keyboard|focus|contrast|alt text|tab order)\b/i],
    ['Performance Requirement', /\b(performance|latency|response time|load|stress|throughput|concurrent|scalability|timeout|sla)\b/i],
    ['Integration Requirement', /\b(integration|webhook|third party|external system|queue|event|notification|email|sms|jira|azure|testrail)\b/i],
    ['Workflow Requirement', /\b(workflow|approval|state|step|journey|process|maker|checker|submit|review|reject|approve)\b/i]
  ];

  const MODULE_KEYWORDS = [
    ['Authentication', /\b(login|logout|auth|authentication|sso|oauth|saml|password|session|token)\b/i],
    ['Authorization', /\b(role|permission|rbac|access control|entitlement|privilege)\b/i],
    ['API & Integration', /\b(api|endpoint|rest|graphql|webhook|integration|external|callback)\b/i],
    ['Data Management', /\b(database|data|record|insert|update|delete|table|sql|seed|audit)\b/i],
    ['Reporting', /\b(report|dashboard|analytics|export|trend|coverage|matrix)\b/i],
    ['Notifications', /\b(email|sms|notification|alert|message)\b/i],
    ['Workflow', /\b(workflow|approval|submit|review|reject|approve|state)\b/i],
    ['Security', /\b(security|encrypt|mask|xss|sql injection|csrf|jwt|rate limit)\b/i],
    ['Performance', /\b(performance|load|stress|latency|response time|throughput|concurrent)\b/i],
    ['Accessibility', /\b(accessibility|wcag|aria|keyboard|contrast|screen reader)\b/i]
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function unique(items) {
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function sentenceCount(text) {
    const matches = String(text || '').match(/[.!?](?:\s|$)/g);
    return matches ? matches.length : Math.max(1, Math.ceil(String(text || '').length / 220));
  }

  function words(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripHtml(value) {
    return String(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readLastOutputText() {
    try {
      const raw = global.localStorage && global.localStorage.getItem('qa_gen_last_output');
      if (!raw) return '';
      const saved = JSON.parse(raw);
      const data = saved && saved.data ? saved.data : {};
      const parts = [
        saved.title,
        data.prd_analysis,
        data.gap_analysis,
        data.test_strategy,
        data.risk_assessment,
        data.coverage_matrix,
        data.api_tests,
        data.testcases
      ];
      return parts.map(stripHtml).filter(Boolean).join('\n\n').slice(0, 160000);
    } catch (err) {
      return '';
    }
  }

  function detectClassifications(text) {
    return CLASSIFICATION_RULES
      .filter(([, regex]) => regex.test(text))
      .map(([name]) => name);
  }

  function detectRequirementType(text, classifications, endpoints) {
    if (/openapi|swagger|graphql/i.test(text) || endpoints.length) return 'API Specification';
    if (classifications.includes('Security Requirement')) return 'Security Control Requirement';
    if (classifications.includes('Database Requirement')) return 'Data Processing Requirement';
    if (classifications.includes('Workflow Requirement')) return 'Workflow Requirement';
    if (classifications.includes('UI Requirement')) return 'UI Requirement';
    return 'Enterprise Functional Requirement';
  }

  function detectModules(text) {
    const modules = MODULE_KEYWORDS
      .filter(([, regex]) => regex.test(text))
      .map(([name]) => name);
    const headingMatches = [];
    const headingRegex = /(?:^|\n)\s*(?:#{1,4}\s*)?([A-Z][A-Za-z0-9 &/-]{3,44})(?:\n|:)/g;
    let match;
    while ((match = headingRegex.exec(text)) !== null) {
      const heading = match[1].trim();
      if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(heading)) {
        headingMatches.push(heading);
      }
    }
    return unique([...modules, ...headingMatches]).slice(0, 12);
  }

  function detectEndpoints(text) {
    const endpoints = [];
    const explicit = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+((?:https?:\/\/[^\s"'<>]+)|(?:\/[A-Za-z0-9_./:{}?&=%-]+))/gi;
    let match;
    while ((match = explicit.exec(text)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        endpoint: match[2],
        source: 'method-path'
      });
    }

    const keyValue = /(?:endpoint|url|path|route)\s*[:=]\s*["']?((?:https?:\/\/[^\s"',<>]+)|(?:\/[A-Za-z0-9_./:{}?&=%-]+))/gi;
    while ((match = keyValue.exec(text)) !== null) {
      if (!endpoints.some(item => item.endpoint === match[1])) {
        endpoints.push({ method: inferMethodNear(text, match.index), endpoint: match[1], source: 'contract-field' });
      }
    }

    return endpoints.slice(0, 40).map((item, index) => ({
      id: `API-${String(index + 1).padStart(3, '0')}`,
      method: item.method,
      endpoint: item.endpoint,
      authentication: inferAuthentication(text),
      headers: inferHeaders(text),
      requestPayload: inferPayload(text, 'request'),
      responsePayload: inferPayload(text, 'response'),
      statusCodes: inferStatusCodes(text),
      source: item.source
    }));
  }

  function inferMethodNear(text, index) {
    const nearby = text.slice(Math.max(0, index - 120), index + 120);
    const method = nearby.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i);
    return method ? method[1].toUpperCase() : 'GET';
  }

  function inferAuthentication(text) {
    if (/bearer|jwt/i.test(text)) return 'Bearer JWT';
    if (/oauth/i.test(text)) return 'OAuth 2.0';
    if (/saml|sso/i.test(text)) return 'SSO/SAML';
    if (/api[-_\s]?key/i.test(text)) return 'API Key';
    if (/basic auth/i.test(text)) return 'Basic Auth';
    if (/auth|token|login|permission|role/i.test(text)) return 'Authenticated session';
    return 'Not specified';
  }

  function inferHeaders(text) {
    const headers = ['Content-Type: application/json'];
    if (/bearer|jwt|token|oauth|auth/i.test(text)) headers.push('Authorization: Bearer {token}');
    if (/correlation|trace/i.test(text)) headers.push('X-Correlation-ID: {uuid}');
    if (/tenant/i.test(text)) headers.push('X-Tenant-ID: {tenantId}');
    return unique(headers);
  }

  function inferStatusCodes(text) {
    const found = unique((text.match(/\b(?:20[0-8]|400|401|403|404|409|422|429|500|503)\b/g) || []));
    const defaults = ['200', '201', '400', '401', '403', '404', '409', '422', '500'];
    return unique([...found, ...defaults]).slice(0, 10);
  }

  function inferPayload(text, kind) {
    const pattern = kind === 'request'
      ? /(?:request\s*(?:payload|body)|body|payload)\s*[:\n]\s*({[\s\S]{0,1600}?})(?:\n\s*\n|response|status|$)/i
      : /(?:response\s*(?:payload|body)|response)\s*[:\n]\s*({[\s\S]{0,1600}?})(?:\n\s*\n|request|status|$)/i;
    const match = text.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        return match[1].trim();
      }
    }
    if (kind === 'request') {
      return {
        id: '{id}',
        name: 'Sample User',
        email: 'qa.user@emudhra.com',
        status: 'ACTIVE'
      };
    }
    return {
      id: '{id}',
      status: 'SUCCESS',
      message: 'Request processed successfully'
    };
  }

  function detectOpenApi(text) {
    const hasSpec = /\b(openapi|swagger)\b/i.test(text) || /"openapi"\s*:|"swagger"\s*:/i.test(text);
    if (!hasSpec) return { detected: false, format: 'None', paths: [] };
    let format = /openapi\.ya?ml|yaml|paths:/i.test(text) ? 'YAML' : 'JSON/Text';
    const paths = unique((text.match(/\/[A-Za-z0-9_./:{}-]+/g) || []).filter(path => path.length > 1)).slice(0, 20);
    return { detected: true, format, paths };
  }

  function detectDatabase(text) {
    const operations = [];
    ['INSERT', 'UPDATE', 'DELETE', 'SELECT'].forEach(op => {
      if (new RegExp(`\\b${op}\\b`, 'i').test(text)) operations.push(op);
    });
    if (/\bdatabase|db|sql|table|foreign key|audit trail|rollback|transaction\b/i.test(text)) {
      if (!operations.length) operations.push('DATA_REFERENCE');
    }
    const references = unique((text.match(/\b(?:table|entity|collection)\s+([A-Za-z_][\w-]*)/gi) || []).map(item => item.split(/\s+/).pop()));
    return {
      detected: operations.length > 0,
      operations,
      references,
      sqlQueries: buildSqlQueries(operations, references)
    };
  }

  function buildSqlQueries(operations, references) {
    const table = references[0] || 'target_table';
    const queries = [];
    if (operations.includes('INSERT') || operations.includes('DATA_REFERENCE')) {
      queries.push(`SELECT COUNT(*) AS inserted_rows FROM ${table} WHERE created_at >= :test_start_time;`);
      queries.push(`SELECT * FROM audit_log WHERE entity_name = '${table}' AND action = 'INSERT' ORDER BY created_at DESC;`);
    }
    if (operations.includes('UPDATE') || operations.includes('DATA_REFERENCE')) {
      queries.push(`SELECT id, updated_at, updated_by FROM ${table} WHERE id = :record_id;`);
      queries.push(`SELECT * FROM audit_log WHERE entity_id = :record_id AND action = 'UPDATE';`);
    }
    if (operations.includes('DELETE')) {
      queries.push(`SELECT id, deleted_at, deleted_by FROM ${table} WHERE id = :record_id;`);
      queries.push(`SELECT COUNT(*) AS child_rows FROM related_table WHERE ${table}_id = :record_id;`);
    }
    queries.push('SELECT COUNT(*) AS orphan_rows FROM child_table c LEFT JOIN parent_table p ON c.parent_id = p.id WHERE p.id IS NULL;');
    return unique(queries);
  }

  function detectAmbiguity(text) {
    const lower = text.toLowerCase();
    return AMBIGUOUS_TERMS
      .filter(term => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(lower))
      .map(term => ({
        term,
        issue: `The term "${term}" is subjective without a measurable target.`,
        clarification: `Define an acceptance threshold, owner, measurement method, and pass/fail tolerance for "${term}".`
      }));
  }

  function hasAcceptanceCriteria(text) {
    return /\b(given|when|then|acceptance criteria|expected result|shall|must|should|status code|response time|sla)\b/i.test(text);
  }

  function scoreRequirement(text, classifications, endpoints, ambiguities, database) {
    const wordCount = words(text).length;
    const sentenceTotal = sentenceCount(text);
    const hasCriteria = hasAcceptanceCriteria(text);
    const hasStatusCodes = /\b(200|201|400|401|403|404|409|422|500)\b/.test(text);
    const hasPayload = /payload|request|response|body|schema|json/i.test(text);
    const hasRoles = /role|permission|user|admin|maker|checker|approver/i.test(text);
    const hasNfr = /performance|security|accessibility|reliability|scalability|availability/i.test(text);

    const complexity = clamp(20 + wordCount / 18 + classifications.length * 5 + endpoints.length * 8 + (database.detected ? 8 : 0), 5, 100);
    const risk = clamp(
      18 +
      (classifications.includes('Security Requirement') ? 24 : 0) +
      (classifications.includes('API Requirement') ? 14 : 0) +
      (classifications.includes('Database Requirement') ? 13 : 0) +
      (classifications.includes('Workflow Requirement') ? 10 : 0) +
      (ambiguities.length * 5) +
      (sentenceTotal > 20 ? 8 : 0),
      5,
      100
    );
    const quality = clamp(
      35 +
      (hasCriteria ? 18 : 0) +
      (hasPayload ? 10 : 0) +
      (hasStatusCodes ? 8 : 0) +
      (hasRoles ? 8 : 0) +
      (hasNfr ? 8 : 0) -
      (ambiguities.length * 6),
      5,
      100
    );
    const ambiguityScore = clamp(ambiguities.length * 12 + (!hasCriteria ? 15 : 0), 0, 100);
    const coverageConfidence = clamp(88 - ambiguityScore * 0.45 + endpoints.length * 2 + (hasCriteria ? 8 : 0), 10, 100);

    return {
      complexityScore: complexity,
      riskScore: risk,
      coverageConfidenceScore: coverageConfidence,
      requirementQualityScore: quality,
      ambiguityScore
    };
  }

  function scoreLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 35) return 'Medium';
    return 'Low';
  }

  function buildCoverage(scores, classifications) {
    const base = scores.coverageConfidenceScore;
    const securityBoost = classifications.includes('Security Requirement') ? 12 : 0;
    const apiBoost = classifications.includes('API Requirement') ? 10 : 0;
    return [
      ['Positive Coverage', clamp(base + 4, 0, 100), 'Happy-path and role-valid workflows'],
      ['Negative Coverage', clamp(base - 13, 0, 100), 'Invalid inputs, denied actions, and malformed requests'],
      ['Boundary Coverage', clamp(base - 17 + apiBoost, 0, 100), 'Min, max, empty, null, and over-limit values'],
      ['Security Coverage', clamp(base - 22 + securityBoost, 0, 100), 'Auth, injection, token, RBAC, and rate-limit checks'],
      ['Accessibility Coverage', clamp(base - 28 + (classifications.includes('Accessibility Requirement') ? 18 : 0), 0, 100), 'Keyboard, ARIA, focus, contrast, and screen-reader checks'],
      ['Performance Coverage', clamp(base - 25 + (classifications.includes('Performance Requirement') ? 18 : 0), 0, 100), 'Latency, concurrency, timeout, and throughput checks'],
      ['Integration Coverage', clamp(base - 21 + (classifications.includes('Integration Requirement') ? 15 : 0), 0, 100), 'External system, retry, idempotency, and event checks']
    ].map(([name, value, note]) => ({
      name,
      value,
      note,
      recommendation: value >= 80 ? 'Maintain with regression traceability.' : `Add targeted ${name.toLowerCase()} scenarios before release.`
    }));
  }

  function buildRisks(scores, classifications, modules) {
    const riskRows = [
      ['Business Risk', scores.riskScore + (classifications.includes('Workflow Requirement') ? 6 : 0), 'Incorrect workflow outcomes or missing acceptance criteria can affect user commitments.'],
      ['Security Risk', scores.riskScore + (classifications.includes('Security Requirement') ? 18 : -12), 'Auth, authorization, sensitive data, token, and abuse paths need explicit validation.'],
      ['Technical Risk', scores.complexityScore + (classifications.includes('API Requirement') ? 8 : 0), 'Integration, API contracts, data rules, and UI state transitions can regress together.'],
      ['Operational Risk', scores.riskScore + (classifications.includes('Performance Requirement') ? 10 : -4), 'Timeout, rollback, audit, monitoring, and support workflows may be underspecified.']
    ];
    return riskRows.map(([name, score, reason]) => ({
      name,
      score: clamp(score, 0, 100),
      level: scoreLevel(score),
      reason,
      executionStrategy: buildExecutionStrategy(score, modules)
    }));
  }

  function buildExecutionStrategy(score, modules) {
    const priorityModules = modules.slice(0, 3).join(', ') || 'core workflow';
    if (score >= 80) return `Run security, API contract, database integrity, and critical path tests first for ${priorityModules}.`;
    if (score >= 60) return `Prioritize negative, boundary, and integration tests for ${priorityModules}.`;
    if (score >= 35) return `Run smoke, sanity, and targeted regression for ${priorityModules}.`;
    return `Include in standard regression with sampling for ${priorityModules}.`;
  }

  function buildPayloadExamples(endpoints) {
    const first = endpoints[0] || {
      method: 'POST',
      endpoint: '/api/v1/resource',
      requestPayload: {
        id: '{id}',
        name: 'Sample User',
        email: 'qa.user@emudhra.com',
        status: 'ACTIVE'
      }
    };
    const valid = typeof first.requestPayload === 'object' ? first.requestPayload : { name: 'Sample User', status: 'ACTIVE' };
    return {
      endpoint: first.endpoint,
      method: first.method,
      requests: [
        { name: 'Valid Request', payload: valid },
        { name: 'Boundary Request', payload: mutatePayload(valid, 'boundary') },
        { name: 'Invalid Request', payload: mutatePayload(valid, 'invalid') },
        { name: 'Security Request', payload: mutatePayload(valid, 'security') },
        { name: 'Performance Request', payload: mutatePayload(valid, 'performance') }
      ],
      responses: [
        { status: 200, name: 'Success', body: { status: 'SUCCESS', data: valid, correlationId: '{uuid}' } },
        { status: 201, name: 'Created', body: { status: 'CREATED', id: '{generatedId}', createdAt: '{timestamp}' } },
        { status: 400, name: 'Bad Request', body: { errorCode: 'VALIDATION_ERROR', message: 'Request payload failed validation.' } },
        { status: 401, name: 'Unauthorized', body: { errorCode: 'AUTH_REQUIRED', message: 'Valid authentication token is required.' } },
        { status: 403, name: 'Forbidden', body: { errorCode: 'ACCESS_DENIED', message: 'User is not authorized for this action.' } },
        { status: 404, name: 'Not Found', body: { errorCode: 'RESOURCE_NOT_FOUND', message: 'Requested resource does not exist.' } },
        { status: 409, name: 'Conflict', body: { errorCode: 'DUPLICATE_RESOURCE', message: 'A conflicting resource already exists.' } },
        { status: 422, name: 'Validation Failure', body: { errorCode: 'BUSINESS_RULE_FAILED', message: 'Request violates a business rule.' } },
        { status: 500, name: 'Internal Server Error', body: { errorCode: 'INTERNAL_ERROR', message: 'Unexpected service failure.' } }
      ]
    };
  }

  function mutatePayload(payload, mode) {
    const clone = JSON.parse(JSON.stringify(payload || {}));
    const keys = Object.keys(clone);
    const firstKey = keys[0] || 'name';
    if (mode === 'boundary') {
      clone[firstKey] = '';
      clone.pageSize = 1000;
      clone.name = 'A'.repeat(255);
    } else if (mode === 'invalid') {
      clone[firstKey] = null;
      clone.email = 'invalid-email';
      clone.status = 'UNSUPPORTED_STATUS';
    } else if (mode === 'security') {
      clone[firstKey] = "' OR '1'='1";
      clone.comments = '<script>alert("xss")</script>';
    } else if (mode === 'performance') {
      clone.batchSize = 5000;
      clone.records = Array.from({ length: 5 }, (_, idx) => ({ id: `bulk-${idx + 1}`, value: 'load-test' }));
    }
    return clone;
  }

  function buildApiTests(endpoints, examples) {
    const endpoint = endpoints[0] || { id: 'API-001', method: examples.method, endpoint: examples.endpoint, authentication: 'Bearer JWT' };
    return [
      ['Functional', 'Valid Requests', `Send ${endpoint.method} ${endpoint.endpoint} with required headers and valid payload.`, '2xx response with schema-compliant body and persisted business outcome.'],
      ['Functional', 'Invalid Requests', 'Send malformed JSON and unsupported enum values.', '400/422 response with actionable error code and no data mutation.'],
      ['Functional', 'Missing Fields', 'Remove each required field one at a time.', '400/422 response identifies the missing field.'],
      ['Functional', 'Required Fields', 'Validate each mandatory path, query, header, and body field.', 'Request is rejected until all mandatory fields are present.'],
      ['Functional', 'Invalid Datatypes', 'Send string for numeric field, object for array field, and null for non-nullable field.', '400/422 datatype validation response.'],
      ['Boundary', 'Min Length', 'Submit minimum allowed length and one character below minimum.', 'Minimum passes, below-minimum fails.'],
      ['Boundary', 'Max Length', 'Submit maximum allowed length and one character above maximum.', 'Maximum passes, over-limit fails.'],
      ['Boundary', 'Empty Payload', 'Send {} as request body.', '400/422 response with required-field failures.'],
      ['Boundary', 'Null Payload', 'Send null body with content-type application/json.', '400 response and no service exception.'],
      ['Boundary', 'Large Payload', 'Send oversized request body and large arrays.', '413/422/429 response based on configured limits.'],
      ['Security', 'SQL Injection', "Send ' OR '1'='1 in string fields.", 'Input is neutralized and request is rejected or safely handled.'],
      ['Security', 'XSS', 'Send script and HTML payloads in text fields.', 'Payload is encoded or rejected; no executable script is returned.'],
      ['Security', 'JWT Tampering', 'Modify token signature, expiry, and subject claims.', '401 response for invalid or tampered token.'],
      ['Security', 'Authorization Validation', 'Call endpoint with valid token lacking required role.', '403 response with no data leakage.'],
      ['Security', 'Token Expiry', 'Use expired token and refresh-token edge cases.', '401 response and refresh path behaves as specified.'],
      ['Security', 'Rate Limiting', 'Burst concurrent requests above configured threshold.', '429 response and retry-after header when applicable.'],
      ['Contract', 'Schema Validation', 'Validate every response against OpenAPI/JSON schema.', 'Response body matches contract.'],
      ['Contract', 'Datatype Validation', 'Validate datatypes for nested objects, arrays, dates, booleans, and enums.', 'No datatype mismatch is observed.'],
      ['Contract', 'Required Field Validation', 'Remove required fields from response stubs or mocks.', 'Contract test fails and reports missing fields.'],
      ['Reliability', 'Timeout Validation', 'Simulate upstream timeout.', 'Client receives timeout-safe error and correlation ID.'],
      ['Reliability', 'Retry Validation', 'Force transient 503/connection reset.', 'Retry policy follows configured count and backoff.'],
      ['Reliability', 'Concurrent Requests', 'Send simultaneous identical and conflicting requests.', 'Service remains idempotent or returns conflict consistently.']
    ].map((row, index) => ({
      id: `API-TC-${String(index + 1).padStart(3, '0')}`,
      category: row[0],
      scenario: row[1],
      steps: row[2],
      expected: row[3],
      endpoint: `${endpoint.method} ${endpoint.endpoint}`
    }));
  }

  function buildTestData(classifications, endpoints, database) {
    return {
      positiveData: [
        { field: 'name', value: 'QA Automation User', purpose: 'Standard valid user-facing text' },
        { field: 'email', value: 'qa.user@emudhra.com', purpose: 'Valid enterprise email' },
        { field: 'role', value: 'QA_LEAD', purpose: 'Authorized business role' }
      ],
      negativeData: [
        { field: 'email', value: 'invalid-email', purpose: 'Format validation' },
        { field: 'role', value: 'UNAUTHORIZED_ROLE', purpose: 'Authorization validation' },
        { field: 'mandatoryField', value: null, purpose: 'Required-field validation' }
      ],
      boundaryData: [
        { field: 'name', value: '', purpose: 'Minimum length violation' },
        { field: 'name', value: 'A'.repeat(255), purpose: 'Maximum length boundary' },
        { field: 'pageSize', value: 1000, purpose: 'Pagination upper boundary' }
      ],
      securityData: [
        { field: 'searchText', value: "' OR '1'='1", purpose: 'SQL injection probe' },
        { field: 'comments', value: '<script>alert("xss")</script>', purpose: 'XSS probe' },
        { field: 'Authorization', value: 'Bearer tampered.jwt.token', purpose: 'JWT tampering' }
      ],
      performanceData: [
        { field: 'batchSize', value: 5000, purpose: 'Large payload throughput' },
        { field: 'concurrency', value: 100, purpose: 'Parallel request pressure' },
        { field: 'duration', value: '30m', purpose: 'Soak test stability' }
      ],
      apiPayloadData: endpoints.length ? buildPayloadExamples(endpoints).requests : [],
      databaseSeedData: database.detected ? [
        { table: database.references[0] || 'target_table', rows: 10, purpose: 'Happy-path data validation' },
        { table: 'audit_log', rows: 5, purpose: 'Audit and rollback verification' },
        { table: 'related_table', rows: 3, purpose: 'Foreign key and orphan validation' }
      ] : []
    };
  }

  function buildRegression(classifications, modules, risks) {
    const criticalModules = modules.slice(0, 4);
    const highRisks = risks.filter(risk => risk.level === 'Critical' || risk.level === 'High').map(risk => risk.name);
    return {
      smokeSuite: ['Login/access check', 'Primary workflow happy path', 'Core API health', 'Critical export/report access'],
      sanitySuite: ['Latest changed module validation', 'Top negative validation', 'Role-specific access check', 'Basic integration callback'],
      regressionSuite: [
        'Full positive and negative requirement coverage',
        'API contract and schema validation',
        'Security auth/RBAC/injection suite',
        'Database integrity and audit verification',
        'Accessibility and compatibility sampling'
      ],
      criticalPathSuite: criticalModules.map(module => `${module} critical path validation`),
      impactBasedRegressionSuite: [
        ...criticalModules.map(module => `Changed ${module} scenarios`),
        ...highRisks.map(risk => `${risk} high-risk checks`)
      ],
      testsToRun: unique([
        'Smoke suite',
        classifications.includes('API Requirement') ? 'API contract suite' : '',
        classifications.includes('Security Requirement') ? 'Security suite' : '',
        classifications.includes('Database Requirement') ? 'Database validation suite' : '',
        'Impacted module regression'
      ]),
      testsToSkip: ['Low-priority visual polish tests with no affected component', 'Archived feature checks with no dependency impact'],
      executionPriority: ['Critical path', 'High risk modules', 'Changed APIs', 'Negative and boundary tests', 'Full regression']
    };
  }

  function buildImpact(modules, endpoints, classifications) {
    const impactedModules = modules.length ? modules.slice(0, 6) : ['Core Workflow', 'Requirement Repository'];
    return {
      impactedTestCases: impactedModules.map((module, index) => `TC-${String(index + 1).padStart(3, '0')} ${module} positive, negative, boundary, and regression cases`),
      impactedAutomationScripts: impactedModules.map(module => `${module.replace(/\s+/g, '')}Spec automation pack`),
      impactedModules,
      impactedApis: endpoints.map(ep => `${ep.method} ${ep.endpoint}`),
      impactedData: classifications.includes('Database Requirement') ? ['Seed data', 'Audit records', 'Rollback records', 'Foreign key relations'] : ['Test data pools', 'Role-based fixtures'],
      report: `Impact is concentrated in ${impactedModules.slice(0, 3).join(', ')}${endpoints.length ? ` and ${endpoints.length} detected API endpoint(s)` : ''}.`
    };
  }

  function buildDefectPrediction(scores, modules, endpoints, ambiguities) {
    const likelyFailureAreas = unique([
      scores.ambiguityScore > 20 ? 'Ambiguous acceptance criteria' : '',
      endpoints.length ? 'API contract and payload validation' : '',
      modules.includes('Authentication') ? 'Authentication and session expiry' : '',
      modules.includes('Authorization') ? 'Role-based authorization' : '',
      modules.includes('Data Management') ? 'Data integrity and rollback' : '',
      modules.includes('Performance') ? 'Timeout and concurrency handling' : '',
      modules.includes('Accessibility') ? 'Keyboard and screen-reader behavior' : '',
      'Negative validation and error messaging'
    ]);
    return {
      score: clamp((scores.complexityScore * 0.38) + (scores.riskScore * 0.42) + (scores.ambiguityScore * 0.2), 0, 100),
      likelyFailureAreas,
      highRiskComponents: modules.slice(0, 6),
      drivers: [
        `${scores.complexityScore}% requirement complexity`,
        `${scores.riskScore}% aggregate risk`,
        `${scores.ambiguityScore}% ambiguity pressure`,
        `${ambiguities.length} clarification item(s)`
      ]
    };
  }

  function buildAutomationExpansion(classifications) {
    return {
      ui: [
        { framework: 'Cypress', fit: 'Fast browser regression for component-heavy UI flows' },
        { framework: 'WebdriverIO', fit: 'Cross-browser and enterprise Selenium Grid compatibility' }
      ],
      api: [
        { framework: 'Rest Assured', fit: 'Java API regression and contract assertions' },
        { framework: 'Karate', fit: 'BDD-style API, schema, and mocks' },
        { framework: 'Postman Collection', fit: 'Exploratory API suite and stakeholder sharing' },
        { framework: 'Newman', fit: 'CI execution of Postman collections' },
        { framework: 'Supertest', fit: 'Node.js service-level API tests' },
        { framework: 'Requests + Pytest', fit: 'Python API validation and data-driven tests' }
      ],
      bdd: [
        { framework: 'Cucumber', fit: 'Executable business scenarios with step definitions' },
        { framework: 'Gherkin', fit: 'Readable Given/When/Then acceptance scenarios' }
      ],
      recommendation: classifications.includes('API Requirement')
        ? 'Prioritize Rest Assured/Karate for API contracts, then Newman for CI smoke execution.'
        : 'Prioritize Cypress/WebdriverIO for UI workflows, with Cucumber for business-readable regression.'
    };
  }

  function buildEnterpriseTestCases(intelligence) {
    const baseEndpoint = intelligence.api.endpoints[0];
    const modules = intelligence.modules.length ? intelligence.modules : ['Core Workflow'];
    const rows = [
      {
        module: modules[0],
        feature: 'Requirement acceptance validation',
        objective: 'Validate the primary happy-path workflow against explicit acceptance criteria.',
        data: 'Valid enterprise user, valid role, complete mandatory input set',
        steps: '1. Open the target workflow.\n2. Complete all mandatory fields with valid data.\n3. Submit the workflow.\n4. Verify confirmation, persisted state, and audit entry.',
        expected: 'Workflow completes successfully, confirmation is visible, data is persisted, and audit trail is created.',
        priority: 'High',
        severity: 'High',
        risk: 'Business Risk',
        automation: 'Yes'
      },
      {
        module: modules[0],
        feature: 'Mandatory field validation',
        objective: 'Ensure required fields reject null, empty, and whitespace-only values.',
        data: 'Null, empty string, whitespace-only string for each required field',
        steps: '1. Open the workflow.\n2. Clear each required field one at a time.\n3. Submit after each mutation.\n4. Verify field-level validation.',
        expected: 'Submission is blocked with field-specific validation and no partial data is persisted.',
        priority: 'High',
        severity: 'Medium',
        risk: 'Technical Risk',
        automation: 'Yes'
      },
      {
        module: 'Security',
        feature: 'Authorization validation',
        objective: 'Verify users without required permission cannot perform protected actions.',
        data: 'Valid token/user without required role',
        steps: '1. Sign in as a lower-privilege user.\n2. Navigate directly to protected action.\n3. Attempt UI action and direct API action.\n4. Review audit/security log.',
        expected: 'Access is denied with 403 or equivalent UI state, no sensitive data is exposed, and security log is recorded.',
        priority: 'Critical',
        severity: 'Critical',
        risk: 'Security Risk',
        automation: 'Yes'
      },
      {
        module: 'Security',
        feature: 'Injection resilience',
        objective: 'Verify text, search, and payload fields reject or neutralize SQL injection and XSS payloads.',
        data: "' OR '1'='1, <script>alert(\"xss\")</script>",
        steps: '1. Submit injection strings through UI and API inputs.\n2. Verify validation, encoding, and persistence behavior.\n3. Reload the affected page.\n4. Inspect response and rendered output.',
        expected: 'Payload is rejected or safely encoded; no script executes and no unauthorized data is returned.',
        priority: 'Critical',
        severity: 'Critical',
        risk: 'Security Risk',
        automation: 'Yes'
      },
      {
        module: 'Performance',
        feature: 'Timeout and concurrency behavior',
        objective: 'Validate workflow remains stable under concurrent requests and timeout conditions.',
        data: '100 concurrent users, large payload, delayed upstream response',
        steps: '1. Execute concurrent requests for the critical path.\n2. Inject upstream timeout.\n3. Monitor response code, retry behavior, and data consistency.\n4. Validate logs and correlation IDs.',
        expected: 'System returns controlled timeout/retry response, preserves data consistency, and remains within SLA.',
        priority: 'High',
        severity: 'High',
        risk: 'Operational Risk',
        automation: 'Candidate'
      }
    ];

    if (baseEndpoint) {
      rows.splice(2, 0, {
        module: 'API & Integration',
        feature: `${baseEndpoint.method} ${baseEndpoint.endpoint}`,
        objective: 'Validate API contract, headers, payload, status codes, and response schema.',
        data: JSON.stringify(baseEndpoint.requestPayload),
        steps: `1. Send ${baseEndpoint.method} ${baseEndpoint.endpoint} with valid headers.\n2. Validate response status and body schema.\n3. Repeat with missing required fields, invalid datatypes, and unsupported extra fields.\n4. Verify no unexpected data mutation occurs.`,
        expected: 'Valid request succeeds; invalid requests return 400/422 with deterministic error payload; response schema matches contract.',
        priority: 'Critical',
        severity: 'High',
        risk: 'Technical Risk',
        automation: 'Yes',
        apiMapping: `${baseEndpoint.method} ${baseEndpoint.endpoint}`
      });
    }

    if (intelligence.database.detected) {
      rows.push({
        module: 'Data Management',
        feature: 'Database integrity and rollback',
        objective: 'Validate data mutation, audit logging, rollback, and foreign key integrity.',
        data: 'Seeded parent/child records, rollback scenario, duplicate input',
        steps: '1. Execute create/update/delete workflow.\n2. Verify target table values.\n3. Verify audit table values.\n4. Force failure and verify rollback.\n5. Check orphan records and foreign key constraints.',
        expected: 'Data is accurate, audit records are complete, rollback restores prior state, and no orphan records are created.',
        priority: 'High',
        severity: 'High',
        risk: 'Technical Risk',
        automation: 'Candidate'
      });
    }

    return rows.map((row, index) => {
      const requirementId = `REQ-${String(index + 1).padStart(3, '0')}`;
      return {
        testCaseId: `ENT-TC-${String(index + 1).padStart(3, '0')}`,
        requirementId,
        requirementMapping: `${requirementId} - ${row.feature}`,
        module: row.module,
        feature: row.feature,
        testObjective: row.objective,
        preconditions: 'User, environment, test data, and required integrations are available.',
        testData: row.data,
        testSteps: row.steps,
        expectedResults: row.expected,
        priority: row.priority,
        severity: row.severity,
        risk: row.risk,
        automationCandidate: row.automation,
        requirementTraceability: `${requirementId} -> ${row.module} -> ${row.feature} -> ${row.risk}`,
        apiMapping: row.apiMapping || (baseEndpoint && row.module === 'API & Integration' ? `${baseEndpoint.method} ${baseEndpoint.endpoint}` : 'N/A')
      };
    });
  }

  function buildDeliverables(intelligence) {
    return {
      architectureDesign: [
        'Add EnterpriseQAEngine as a shared deterministic intelligence layer before LLM generation.',
        'Use existing Test Management for generation, Project Analysis for traceability, and Enterprise QE page for executive intelligence.',
        'Persist analysis snapshots in localStorage now; move to backend project storage for multi-user enterprise rollout.'
      ],
      databaseChanges: [
        'requirements(id, project_id, type, quality_score, ambiguity_score, risk_score, classifications, source_hash)',
        'api_contracts(id, requirement_id, method, path, auth_type, headers, request_schema, response_schema)',
        'risk_register(id, requirement_id, risk_type, level, score, mitigation, owner)',
        'impact_reports(id, project_id, changed_requirement_id, impacted_tests, impacted_scripts, impacted_apis)',
        'test_data_sets(id, requirement_id, category, payload, expected_use)'
      ],
      backendApis: [
        'POST /api/enterprise/requirements/analyze',
        'POST /api/enterprise/apis/detect',
        'POST /api/enterprise/testcases/generate',
        'GET /api/enterprise/projects/{projectId}/risk-dashboard',
        'POST /api/enterprise/impact/analyze',
        'POST /api/enterprise/copilot/ask'
      ],
      frontendChanges: [
        'Enterprise QE dashboard with Requirement Intelligence, API Intelligence, Risk Analysis, Impact Analysis, Defect Prediction, QA Copilot, and Test Data Intelligence tabs.',
        'Project Analysis summary cards for quality, ambiguity, risk, API mode, and impact.',
        'Test Management pre-generation intelligence panel and expanded enterprise recommendations.'
      ],
      aiPromptDesign: [
        'Ask the model to analyze requirement quality before generating test cases.',
        'Force exact enterprise test case fields with requirement traceability and API mapping.',
        'Generate risk-based execution strategy, clarification questions, payload examples, and framework-ready automation guidance.',
        'Require separate functional, boundary, security, contract, reliability, database, accessibility, and performance coverage.'
      ],
      folderStructure: [
        'APP/js/enterprise_qa_engine.js',
        'APP/js/enterprise_dashboard.js',
        'APP/pages/enterprise.html',
        'APP/css/pages.css enterprise dashboard extension block'
      ],
      migrationPlan: [
        'Phase 1: deploy client-side intelligence and dashboard modules.',
        'Phase 2: store requirement, API, risk, and impact snapshots in backend tables.',
        'Phase 3: connect LLM generation and repository sheets to persisted traceability.',
        'Phase 4: add CI exports for Cypress, WebdriverIO, Rest Assured, Karate, Newman, Supertest, Pytest, and Cucumber.'
      ],
      implementationRoadmap: [
        'Weeks 1-2: requirement intelligence, API detection, ambiguity and coverage dashboards.',
        'Weeks 3-4: API payload intelligence, OpenAPI import, database validation, SQL verification generation.',
        'Weeks 5-6: impact analysis, defect prediction, risk execution strategy, regression optimization.',
        'Weeks 7-8: QA Copilot, test data intelligence, automation expansion, enterprise reporting APIs.'
      ]
    };
  }

  function analyzeRequirement(inputText) {
    const text = String(inputText || '').trim() || readLastOutputText() || 'Enterprise requirement analysis workspace.';
    const endpoints = detectEndpoints(text);
    const classifications = detectClassifications(text);
    const modules = detectModules(text);
    const database = detectDatabase(text);
    const ambiguities = detectAmbiguity(text);
    const scores = scoreRequirement(text, classifications, endpoints, ambiguities, database);
    const requirementType = detectRequirementType(text, classifications, endpoints);
    const openApi = detectOpenApi(text);
    const apiMode = endpoints.length > 0 || openApi.detected || /graphql|request payload|response payload|schema/i.test(text);
    const payloadExamples = buildPayloadExamples(endpoints);
    const risks = buildRisks(scores, classifications, modules);
    const coverage = buildCoverage(scores, classifications);
    const impact = buildImpact(modules, endpoints, classifications);
    const defectPrediction = buildDefectPrediction(scores, modules, endpoints, ambiguities);
    const testData = buildTestData(classifications, endpoints, database);
    const regression = buildRegression(classifications, modules, risks);
    const automationExpansion = buildAutomationExpansion(classifications);

    const intelligence = {
      sourceText: text,
      requirementType,
      classifications,
      modules,
      scores,
      api: {
        mode: apiMode,
        modeLabel: apiMode ? 'API Analysis Mode' : 'Requirement Analysis Mode',
        endpoints,
        openApi,
        graphqlDetected: /\bgraphql\b/i.test(text),
        payloadExamples,
        generatedTests: buildApiTests(endpoints, payloadExamples)
      },
      database,
      ambiguity: {
        items: ambiguities,
        missingAcceptanceCriteria: !hasAcceptanceCriteria(text),
        clarificationSuggestions: buildClarifications(ambiguities, classifications, endpoints)
      },
      coverage,
      risks,
      impact,
      defectPrediction,
      testData,
      regression,
      automationExpansion
    };

    intelligence.enterpriseTestCases = buildEnterpriseTestCases(intelligence);
    intelligence.deliverables = buildDeliverables(intelligence);
    return intelligence;
  }

  function buildClarifications(ambiguities, classifications, endpoints) {
    const suggestions = ambiguities.map(item => item.clarification);
    if (!endpoints.length && classifications.includes('API Requirement')) {
      suggestions.push('Provide exact endpoint paths, HTTP methods, headers, status codes, and request/response schemas.');
    }
    if (classifications.includes('Performance Requirement')) {
      suggestions.push('Provide response-time, throughput, concurrency, and percentile targets.');
    }
    if (classifications.includes('Security Requirement')) {
      suggestions.push('Define roles, permissions, token expiry rules, audit expectations, and rate limits.');
    }
    if (!suggestions.length) {
      suggestions.push('Confirm acceptance criteria, priority, data setup, owner, and release scope for each requirement.');
    }
    return unique(suggestions);
  }

  function answerCopilot(question, intelligence) {
    const q = String(question || '').toLowerCase();
    const data = intelligence || analyzeRequirement('');
    if (/uncovered|coverage/.test(q)) {
      return data.coverage
        .filter(item => item.value < 80)
        .map(item => `${item.name}: ${item.value}%. ${item.recommendation}`)
        .join('\n');
    }
    if (/missing test|generate missing/.test(q)) {
      return data.enterpriseTestCases
        .filter(item => /Negative|Boundary|Security|Data|API/i.test(`${item.feature} ${item.risk}`))
        .map(item => `${item.testCaseId}: ${item.testObjective}`)
        .join('\n');
    }
    if (/security/.test(q)) {
      return data.api.generatedTests
        .filter(item => item.category === 'Security')
        .map(item => `${item.id}: ${item.scenario} - ${item.expected}`)
        .join('\n') || 'Run authorization, token tampering, SQL injection, XSS, sensitive data, and rate-limit tests.';
    }
    if (/api.*boundary|boundary.*api/.test(q)) {
      return data.api.generatedTests
        .filter(item => item.category === 'Boundary')
        .map(item => `${item.id}: ${item.scenario} - ${item.steps}`)
        .join('\n') || 'No explicit API endpoint was detected. Add method and path details to generate endpoint-specific boundary tests.';
    }
    if (/risk score|explain risk|why.*risk/.test(q)) {
      return data.risks.map(risk => `${risk.name}: ${risk.level} (${risk.score}%). ${risk.reason} Strategy: ${risk.executionStrategy}`).join('\n');
    }
    if (/automation gap|automation/.test(q)) {
      return [
        `Recommended expansion: ${data.automationExpansion.recommendation}`,
        ...data.automationExpansion.ui.map(item => `UI: ${item.framework} - ${item.fit}`),
        ...data.automationExpansion.api.map(item => `API: ${item.framework} - ${item.fit}`),
        ...data.automationExpansion.bdd.map(item => `BDD: ${item.framework} - ${item.fit}`)
      ].join('\n');
    }
    if (/impact|impacted/.test(q)) {
      return [
        data.impact.report,
        `Modules: ${data.impact.impactedModules.join(', ') || 'None detected'}`,
        `APIs: ${data.impact.impactedApis.join(', ') || 'None detected'}`,
        `Scripts: ${data.impact.impactedAutomationScripts.join(', ')}`
      ].join('\n');
    }
    if (/why.*test|why was/.test(q)) {
      return data.enterpriseTestCases.slice(0, 5).map(item => `${item.testCaseId} exists because ${item.requirementTraceability} has ${item.risk} and needs ${item.testObjective}`).join('\n');
    }
    if (/regression|suite/.test(q)) {
      return [
        `Smoke: ${data.regression.smokeSuite.join(', ')}`,
        `Sanity: ${data.regression.sanitySuite.join(', ')}`,
        `Impact-based: ${data.regression.impactBasedRegressionSuite.join(', ')}`,
        `Priority: ${data.regression.executionPriority.join(' -> ')}`
      ].join('\n');
    }
    return [
      `Requirement Type: ${data.requirementType}`,
      `Risk Score: ${data.scores.riskScore}%`,
      `Quality Score: ${data.scores.requirementQualityScore}%`,
      `API Mode: ${data.api.mode ? 'Enabled' : 'Not detected'}`,
      `Top Recommendation: ${data.coverage.find(item => item.value < 80)?.recommendation || 'Maintain traceability and regression coverage.'}`
    ].join('\n');
  }

  global.EnterpriseQAEngine = {
    analyzeRequirement,
    answerCopilot,
    readLastOutputText,
    stripHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.EnterpriseQAEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
