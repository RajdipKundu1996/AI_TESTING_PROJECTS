// ===== HOME PAGE JS — TC Orchestrator =====

// ===== STATE =====
let attachedFile = null;
let attachedFileContent = '';
let attachedFileParseStatus = 'idle';
let attachedFileParserWarning = '';
let generatedData = {};
let automationEnabled = true; // Toggle state for automation script generation
let parsingAttachedFile = false;
let uiFlowScreenshots = [];
let uiFlowRecording = null;
let uiFlowAnalysis = null;
let uiVisualOcrCache = {};
let successPopupTimer = null;
let processingOverlayStartedAt = 0;
let processingOverlayHideTimer = null;
const PROCESSING_OVERLAY_MIN_MS = 650;
let _procPctTarget = 0;
let _procPctCurrent = 0;
let _procPctTimer = null;
let _procElapsedTimer = null;
let _procElapsedStart = 0;
const SUCCESS_POPUP_MIN_MS = 2100;
const SUCCESS_POPUP_MAX_MS = 3200;
const OUTPUT_STORAGE_KEY = 'qa_gen_last_output';
const UI_FLOW_STORAGE_KEY = 'qa_gen_ui_flow_analysis';
const MAX_SAVED_OUTPUT_CHARS = 1500000;
const EXCEL_COMPACT_MAX_SHEETS = 8;
const EXCEL_COMPACT_MAX_ROWS_PER_SHEET = 60;
const EXCEL_COMPACT_MAX_COLUMNS = 12;
const EXCEL_COMPACT_MAX_CELL_CHARS = 240;
const EXCEL_COMPACT_MAX_CHARS = 90000;
const ALLOWED_PRD_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'csv', 'txt'];
const MAX_PRD_FILE_BYTES = 20 * 1024 * 1024;
const MIN_ENTERPRISE_TEST_CASES = 45;
const MAX_ENTERPRISE_EXPANSION_CASES = 96;

const FILE_ICONS = {
  pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗',
  csv: '📊', jpeg: '🖼', jpg: '🖼', png: '🖼', default: '📄'
};

function getUiNow() {
  return (window.performance && typeof window.performance.now === 'function') ? window.performance.now() : Date.now();
}

function updateProcessingOverlay(message, detail, pct) {
  const overlay = document.getElementById('globalProcessingOverlay');
  const msg = document.getElementById('globalProcessingMessage');
  const detailEl = document.getElementById('globalProcessingDetail');
  const progressEl = document.getElementById('globalProcessingProgress');
  if (message && msg) msg.textContent = message;
  if (detailEl) detailEl.textContent = detail || 'Preparing the result. Please keep this tab open.';
  if (progressEl) {
    if (typeof pct === 'number') {
      progressEl.classList.remove('indeterminate');
      progressEl.style.width = `${Math.max(8, Math.min(100, pct))}%`;
      _procPctTarget = pct;
    } else {
      progressEl.classList.add('indeterminate');
      progressEl.style.width = '';
    }
  }
  if (overlay && overlay.style.display !== 'none') {
    overlay.setAttribute('aria-live', 'polite');
  }
}

function _startProgressCounter() {
  _stopProgressCounter();
  _procPctCurrent = 1;
  _procPctTarget  = 5;
  _procElapsedStart = Date.now();
  var pctEl = document.getElementById('processingPct');
  var elEl  = document.getElementById('processingElapsed');
  if (pctEl) { pctEl.textContent = '1%'; pctEl.classList.remove('done'); }
  if (elEl)  elEl.textContent = '0s';

  _procElapsedTimer = setInterval(function() {
    var sec = Math.floor((Date.now() - _procElapsedStart) / 1000);
    var el = document.getElementById('processingElapsed');
    if (el) el.textContent = sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  }, 1000);

  _procPctTimer = setInterval(function() {
    if (_procPctCurrent < _procPctTarget) {
      _procPctCurrent = Math.min(_procPctTarget, _procPctCurrent + 0.6);
    }
    var el = document.getElementById('processingPct');
    if (el) el.textContent = Math.round(_procPctCurrent) + '%';
  }, 80);
}

function _stopProgressCounter(finalPct) {
  if (_procPctTimer)     { clearInterval(_procPctTimer);     _procPctTimer = null; }
  if (_procElapsedTimer) { clearInterval(_procElapsedTimer); _procElapsedTimer = null; }
  if (typeof finalPct === 'number') {
    var el = document.getElementById('processingPct');
    if (el) { el.textContent = finalPct + '%'; if (finalPct >= 100) el.classList.add('done'); }
  }
}

function showProcessingOverlay(message, detail) {
  const overlay = document.getElementById('globalProcessingOverlay');
  const successOverlay = document.getElementById('successPopupOverlay');
  if (processingOverlayHideTimer) {
    clearTimeout(processingOverlayHideTimer);
    processingOverlayHideTimer = null;
  }
  if (successOverlay) successOverlay.style.display = 'none';
  processingOverlayStartedAt = getUiNow();
  updateProcessingOverlay(
    message || 'eMudhra QA-Gen AI is processing your request...',
    detail || 'Starting the analysis workflow...',
    null
  );
  if (overlay) {
    overlay.classList.remove('is-hiding');
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-busy', 'true');
    document.body.classList.add('is-processing');
  }
  _startProgressCounter();
}

function hideProcessingOverlay(force) {
  const overlay = document.getElementById('globalProcessingOverlay');
  if (!overlay || overlay.style.display === 'none') return;
  _stopProgressCounter();

  const finish = function() {
    overlay.classList.add('is-hiding');
    processingOverlayHideTimer = setTimeout(function() {
      overlay.style.display = 'none';
      overlay.classList.remove('is-hiding');
      overlay.removeAttribute('aria-busy');
      document.body.classList.remove('is-processing');
      processingOverlayHideTimer = null;
    }, force ? 0 : 180);
  };

  if (force) {
    finish();
    return;
  }

  const elapsed = getUiNow() - processingOverlayStartedAt;
  const wait = Math.max(0, PROCESSING_OVERLAY_MIN_MS - elapsed);
  if (wait > 0) {
    processingOverlayHideTimer = setTimeout(finish, wait);
  } else {
    finish();
  }
}

function showSuccessPopup(title, message) {
  hideProcessingOverlay(true);
  const overlay = document.getElementById('successPopupOverlay');
  const titleEl = document.getElementById('successPopupTitle');
  const msgEl = document.getElementById('successPopupMessage');
  if (titleEl) titleEl.textContent = title || 'Completed Successfully';
  if (msgEl) msgEl.textContent = message || 'Your request has been completed.';
  if (successPopupTimer) clearTimeout(successPopupTimer);
  if (overlay) {
    overlay.style.display = 'flex';
    const duration = Math.min(SUCCESS_POPUP_MAX_MS, Math.max(SUCCESS_POPUP_MIN_MS, String(message || '').length * 22));
    successPopupTimer = setTimeout(closeSuccessPopup, duration);
  }
}

function closeSuccessPopup() {
  const overlay = document.getElementById('successPopupOverlay');
  if (successPopupTimer) {
    clearTimeout(successPopupTimer);
    successPopupTimer = null;
  }
  if (overlay) overlay.style.display = 'none';
}

const TEST_CASE_COLUMNS = [
  'Test Case ID',
  'Module / Feature',
  'Requirement ID / User Story',
  'Test Scenario',
  'Test Case Title',
  'Priority',
  'Severity',
  'Preconditions',
  'Test Data',
  'Steps to Execute',
  'Expected Result',
  'Actual Result',
  'Status',
  'Environment',
  'Browser / Device',
  'Postconditions',
  'Executed By',
  'Execution Date',
  'Comments / Attachments',
  'Automation Status',
  'Defect ID'
];

const TEST_CASE_COLUMN_WIDTHS = [
  140, 190, 250, 280, 320, 130, 130, 280, 300, 380, 360,
  190, 140, 160, 180, 280, 140, 150, 260, 190, 150
];

const AC_TEST_CASE_COLUMNS = [
  'TC ID',
  'Module Name',
  'Test Scenario',
  'Preconditions',
  'Test Steps',
  'Test Data',
  'Expected Result',
  'Database Table',
  'Database Validation',
  'Encryption / Storage Format Check',
  'Actual Result',
  'Status',
  "Tester's Name",
  'Testing Date',
  'Build Version',
  'Reviewed By',
  'Review Date',
  'Comments'
];

function buildTestCaseColGroup() {
  return `<colgroup>${TEST_CASE_COLUMN_WIDTHS.map(width => `<col style="width:${width}px">`).join('')}</colgroup>`;
}

function buildAcTestCaseColGroup() {
  const widths = [120, 220, 520, 360, 470, 280, 380, 300, 420, 360, 220, 150, 190, 170, 170, 190, 170, 260];
  return `<colgroup>${widths.map(width => `<col style="width:${width}px">`).join('')}</colgroup>`;
}

function normalizeHeaderText(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .trim()
    .toLowerCase();
}

const TEST_CASE_COLUMN_HEADER_SET = new Set(TEST_CASE_COLUMNS.map(normalizeHeaderText));

function isDuplicateTestCaseHeaderRow(cells) {
  const normalized = (cells || []).map(normalizeHeaderText).filter(Boolean);
  if (!normalized.length) return false;
  const matches = normalized.filter(cell => TEST_CASE_COLUMN_HEADER_SET.has(cell)).length;
  return normalized[0] === 'test case id' || matches >= 2;
}

function cleanupRenderedTestCaseTables(container) {
  const scope = container || document;
  if (!scope.querySelectorAll) return;
  scope.querySelectorAll('.test-case-table').forEach(function(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.slice(1).forEach(function(row) {
      if (table.classList.contains('ac-test-case-table')) return;
      const cells = Array.from(row.children).map(cell => cell.textContent);
      if (isDuplicateTestCaseHeaderRow(cells) || isExcludedTestCaseRow(cells)) {
        row.remove();
        return;
      }
      simplifyTestCaseRow(cells).forEach((value, index) => {
        if (row.children[index]) row.children[index].textContent = value;
      });
    });
  });
}

const EXCLUDED_TEST_CASE_PATTERN = /\b(security|non[-\s]?functional|performance|accessibility|reliability|scalability|compatibility|load test|stress test|rate limit|penetration|sql injection|xss|csrf|token tamper|audit log)\b/i;

function isExcludedTestCaseRow(cells) {
  const normalized = normalizeTestCaseRow(cells);
  const searchable = [
    normalized[3],
    normalized[4],
    normalized[8],
    normalized[18]
  ].join(' ');
  return EXCLUDED_TEST_CASE_PATTERN.test(searchable);
}

function simplifyGeneratedText(value) {
  return String(value == null ? '' : value)
    .replace(/\benterprise[-\s]?grade\b/ig, '')
    .replace(/\baudit[-\s]?ready\b/ig, '')
    .replace(/\btraceable\b/ig, '')
    .replace(/\bUI\/API state,\s*/ig, '')
    .replace(/\bdata persistence\b/ig, 'saved data')
    .replace(/\bsanitization,?\s*/ig, '')
    .replace(/\bauthorization behavior\b/ig, 'result')
    .replace(/\bduplicate prevention,\s*/ig, '')
    .replace(/\bfocus\/hover state,?\s*/ig, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function simplifyTestStepsText(value) {
  const source = simplifyGeneratedText(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s*(?=\d+\.\s*)/g, '\n')
    .replace(/\r/g, '\n');
  const steps = parseEvidenceLines(source)
    .map(step => step.replace(/^(?:check|review)\s+(?:related\s+)?screenshot\/OCR evidence\s+(?:for|of)\s*/i, 'Open '))
    .map(step => step.replace(/^check\s+related\s+screenshot\s+evidence\s+for\s+/i, 'Open '))
    .map(step => step.replace(/^validate\s+acceptance\s+criteria:\s*/i, 'Verify '))
    .map(step => step.replace(/^compare observed result:\s*/i, 'Check actual result: '))
    .map(step => step.replace(/^apply acceptance criteria:\s*/i, 'Verify '))
    .map(step => step.replace(/^submit\/continue/i, 'Submit or continue'))
    .map(step => simplifyGeneratedText(step))
    .filter(Boolean);
  return uniqueValues(steps).slice(0, 5).map((step, idx) => `${idx + 1}. ${step}`).join(' ');
}

function simplifyTestCaseRow(cells) {
  const row = normalizeTestCaseRow(cells);
  row[9] = simplifyTestStepsText(row[9]);
  row[10] = simplifyGeneratedText(row[10]);
  row[11] = row[11] ? simplifyGeneratedText(row[11]) : 'Not Executed';
  row[18] = simplifyGeneratedText(row[18]);
  return row;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function compactExcelCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= EXCEL_COMPACT_MAX_CELL_CHARS) return text;
  return text.slice(0, EXCEL_COMPACT_MAX_CELL_CHARS - 14).trimEnd() + ' ...[trimmed]';
}

function compactExcelRow(row) {
  const values = [];
  for (let i = 0; i < Math.min(row.length, EXCEL_COMPACT_MAX_COLUMNS); i++) {
    values.push(compactExcelCell(row[i]));
  }
  return values;
}

function getExcelSheetStats(worksheet) {
  if (!worksheet || !worksheet['!ref'] || typeof XLSX === 'undefined') {
    return { rows: 0, columns: 0 };
  }
  try {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    return {
      rows: Math.max(0, range.e.r - range.s.r + 1),
      columns: Math.max(0, range.e.c - range.s.c + 1)
    };
  } catch (err) {
    return { rows: 0, columns: 0 };
  }
}

function compactExcelWorkbook(data, file) {
  const workbook = XLSX.read(data, {
    type: 'array',
    dense: true,
    sheetRows: EXCEL_COMPACT_MAX_ROWS_PER_SHEET + 1,
    cellDates: false,
    cellNF: false,
    cellStyles: false
  });
  const totalSheets = workbook.SheetNames.length;
  const includedSheets = workbook.SheetNames.slice(0, EXCEL_COMPACT_MAX_SHEETS);
  const lines = [
    `Attached Excel workbook: ${file.name}`,
    `Original file size: ${formatBytes(file.size)}`,
    `Sheets found: ${totalSheets}`,
    `Compacted for faster analysis: up to ${EXCEL_COMPACT_MAX_ROWS_PER_SHEET} rows x ${EXCEL_COMPACT_MAX_COLUMNS} columns per sheet.`
  ];

  for (const sheetName of includedSheets) {
    const worksheet = workbook.Sheets[sheetName];
    const stats = getExcelSheetStats(worksheet);
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false
    });
    const compactRows = rows
      .slice(0, EXCEL_COMPACT_MAX_ROWS_PER_SHEET)
      .map(compactExcelRow)
      .filter(row => row.some(Boolean));

    lines.push('');
    lines.push(`--- SHEET: ${sheetName} ---`);
    lines.push(`Visible range in compact parse: ${stats.rows} rows x ${stats.columns} columns`);
    lines.push(`Rows included: ${compactRows.length}`);

    compactRows.forEach((row, index) => {
      lines.push(`${index + 1}. ${row.join(' | ')}`);
    });

    if (rows.length > compactRows.length || stats.columns > EXCEL_COMPACT_MAX_COLUMNS) {
      lines.push('[Sheet content compacted to reduce upload processing time.]');
    }
  }

  if (totalSheets > includedSheets.length) {
    lines.push('');
    lines.push(`[${totalSheets - includedSheets.length} additional sheet(s) omitted to keep the upload compact.]`);
  }

  const compacted = lines.join('\n').trim();
  if (compacted.length <= EXCEL_COMPACT_MAX_CHARS) return compacted;
  return compacted.slice(0, EXCEL_COMPACT_MAX_CHARS).trimEnd() + '\n[Excel summary truncated to keep analysis input small.]';
}

// ===== FADE-IN RENDER =====
function typewriterRender(containerId, htmlContent) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.style.opacity = '0';
  container.innerHTML = htmlContent;
  container.scrollTop = 0;
  container.scrollLeft = 0;
  void container.offsetWidth;
  container.style.transition = 'opacity 0.22s ease-out';
  container.style.opacity = '1';
  requestAnimationFrame(function() {
    cleanupRenderedTestCaseTables(container);
    resetGeneratedTableScroll(container);
  });
}

function resetGeneratedTableScroll(container) {
  requestAnimationFrame(function() {
    const scope = container || document;
    const wrappers = scope.querySelectorAll ? scope.querySelectorAll('.test-case-table-wrap, .test-case-table-shell') : [];
    wrappers.forEach(function(wrapper) {
      wrapper.scrollLeft = 0;
      wrapper.scrollTop = 0;
    });
  });
}

function markdownToBrightBlocks(text, mode) {
  const colors = mode === 'scenario'
    ? ['#6e3a91', '#f26a21', '#0ea5e9', '#10b981', '#ef4444']
    : ['#f26a21', '#6e3a91', '#0ea5e9', '#10b981', '#f59e0b'];
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const html = [];
  let listOpen = false;
  let cardIdx = 0;
  let tableBuffer = [];

  const RISK_BADGE = {
    'critical': 'qa-plan-badge critical',
    'high':     'qa-plan-badge high',
    'medium':   'qa-plan-badge medium',
    'low':      'qa-plan-badge low',
    'yes':      'qa-plan-badge yes',
    'no':       'qa-plan-badge no',
    'pass':     'qa-plan-badge yes',
    'fail':     'qa-plan-badge no',
    'candidate':'qa-plan-badge candidate',
    'pending':  'qa-plan-badge pending',
    'p1':       'qa-plan-badge critical',
    'p2':       'qa-plan-badge high',
    'p3':       'qa-plan-badge medium',
    'p4':       'qa-plan-badge low'
  };

  function renderInline(raw) {
    const str = escapeHtml(String(raw == null ? '' : raw).replace(/\*\*/g, '').replace(/__/g, '').trim());
    const key = str.toLowerCase();
    if (RISK_BADGE[key]) return `<span class="${RISK_BADGE[key]}">${str}</span>`;
    return str
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function parseTableRow(line) {
    let trimmed = String(line || '').trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim());
  }

  function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every(c => /^[\s:|-]+$/.test(String(c)));
  }

  function flushTable() {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.filter(cells => !isSeparatorRow(cells));
    tableBuffer = [];
    if (!rows.length) return;
    const colCount = rows[0].length;
    let t = '<div class="qa-plan-table-wrap"><table class="qa-plan-md-table"><thead><tr>';
    rows[0].forEach(h => { t += `<th>${renderInline(h)}</th>`; });
    t += '</tr></thead><tbody>';
    rows.slice(1).forEach((cells, ri) => {
      t += `<tr class="${ri % 2 ? 'alt' : ''}">`;
      for (let i = 0; i < colCount; i++) {
        t += `<td>${renderInline(cells[i] || '')}</td>`;
      }
      t += '</tr>';
    });
    t += '</tbody></table></div>';
    html.push(t);
  }

  function closeList() {
    if (listOpen) { html.push('</ul>'); listOpen = false; }
  }

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) {
      flushTable();
      closeList();
      return;
    }

    if (line.includes('|') && line.split('|').length >= 3) {
      closeList();
      tableBuffer.push(parseTableRow(line));
      return;
    }

    flushTable();

    const heading = line.match(/^(#{1,4})\s*(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const title = escapeHtml(heading[2].replace(/\*\*/g, '').trim());
      const color = colors[cardIdx++ % colors.length];
      html.push(`<div class="qa-plan-section" style="border-left-color:${color}">
        <div class="qa-plan-kicker">Section ${cardIdx}</div>
        <h${Math.min(level + 1, 4)} style="margin:0;color:#020617;font-weight:950;line-height:1.35">${title}</h${Math.min(level + 1, 4)}>
      </div>`);
      return;
    }

    const numbered = line.match(/^(\d+)[.)]\s*(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (numbered || bullet) {
      if (!listOpen) { html.push('<ul class="qa-plan-list">'); listOpen = true; }
      const body = escapeHtml((numbered ? numbered[2] : bullet[1]).replace(/\*\*/g, '').trim())
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      const marker = numbered ? numbered[1] : '';
      html.push(`<li><span class="qa-plan-bullet">${marker || '&bull;'}</span><span>${body}</span></li>`);
      return;
    }

    closeList();
    const paragraph = escapeHtml(line.replace(/\*\*/g, '').trim()).replace(/`([^`]+)`/g, '<code>$1</code>');
    html.push(`<p class="qa-plan-para">${paragraph}</p>`);
  });

  flushTable();
  closeList();
  return html.join('');
}

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  var el = $(id);
  if (el) el.textContent = value;
}

function yieldToBrowser() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

function createBufferedStreamRenderer(outputStream, streamBox) {
  let pending = '';
  let scheduled = false;

  function flush() {
    scheduled = false;
    if (!pending || !streamBox) return;
    streamBox.appendChild(document.createTextNode(pending));
    pending = '';
    if (outputStream) outputStream.scrollTop = outputStream.scrollHeight;
  }

  return {
    push(chunk) {
      pending += chunk;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    },
    flush
  };
}

function persistGeneratedOutput(inputSource) {
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      title: (inputSource || '').substring(0, 120),
      data: generatedData
    };
    const serialized = JSON.stringify(payload);
    if (serialized.length <= MAX_SAVED_OUTPUT_CHARS) {
      localStorage.setItem(OUTPUT_STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn('Unable to save latest generated output:', err);
  }
}

function restoreGeneratedOutput() {
  try {
    const raw = localStorage.getItem(OUTPUT_STORAGE_KEY);
    if (!raw || Object.keys(generatedData).length) return;
    const saved = JSON.parse(raw);
    if (!saved || !saved.data || (!saved.data.prd_analysis && !saved.data.testplan)) return;
    generatedData = saved.data;
    const outputArea = $('outputArea');
    const outputStats = $('outputStatsGrid');
    const featureGrid = $('featureGrid');
    if (featureGrid) featureGrid.style.display = 'grid';
    if (outputStats) outputStats.style.display = 'grid';
    if (outputArea) outputArea.style.display = 'block';
    setText('planStatus', 'Saved');
    setText('tcCountDisplay', 'Restored');
    setText('covCountDisplay', saved.savedAt ? new Date(saved.savedAt).toLocaleDateString() : 'Latest');
    setText('autoCountDisplay', 'Ready');
    if (saved.data.testplan && !saved.data.prd_analysis) {
      saved.data.prd_analysis = saved.data.testplan;
      delete saved.data.testplan;
    }
    const restoredTab = 'prd_analysis';
    updateOutputTabs(restoredTab);
    typewriterRender('outputStream', saved.data[restoredTab]);
  } catch (err) {
    console.warn('Unable to restore latest output:', err);
  }
}

function resetGeneratedOutputUI() {
  generatedData = {};
  localStorage.removeItem(OUTPUT_STORAGE_KEY);

  const outputStream = $('outputStream');
  const outputArea = $('outputArea');
  const outputStats = $('outputStatsGrid');
  const outputLoading = $('outputLoading');
  const featureGrid = $('featureGrid');

  if (outputStream) {
    outputStream.style.opacity = '1';
    outputStream.innerHTML = '';
  }
  if (outputArea) outputArea.style.display = 'none';
  if (outputStats) outputStats.style.display = 'none';
  if (outputLoading) outputLoading.style.display = 'none';
  if (featureGrid) featureGrid.style.display = '';

  setText('planStatus', '-');
  setText('tcCountDisplay', '-');
  setText('covCountDisplay', '-');
  setText('autoCountDisplay', '-');

  document.querySelectorAll('.out-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.disabled = true;
    tab.classList.add('disabled');
    tab.setAttribute('aria-disabled', 'true');
  });
  const firstTab = document.querySelector('.out-tab[data-tab="prd_analysis"]');
  if (firstTab) {
    firstTab.classList.add('active');
    firstTab.disabled = false;
    firstTab.classList.remove('disabled');
    firstTab.setAttribute('aria-disabled', 'false');
  }
}

window.resetGeneratedOutputUI = resetGeneratedOutputUI;
window.addEventListener('qa-gen-history-cleared', resetGeneratedOutputUI);

function getActiveOutputHtml() {
  const activeTab = document.querySelector('.out-tab.active');
  const key = activeTab ? activeTab.dataset.tab : 'testplan';
  return generatedData[key] || ($('outputStream') ? $('outputStream').innerHTML : '');
}

function getActiveOutputText() {
  const stream = $('outputStream');
  return stream ? stream.innerText : '';
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildExportFilename(ext) {
  var dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  var prdTitle = '';
  // Try visible heading on the page first
  var headingEl = document.getElementById('prdTitle') || document.getElementById('outputTitle') || document.querySelector('.prd-title, .output-title');
  if (headingEl && headingEl.textContent.trim()) {
    prdTitle = headingEl.textContent.trim();
  } else {
    // Fall back to most recent project in AppState
    var projs = (typeof AppState !== 'undefined') ? AppState.projects : [];
    if (projs.length) prdTitle = projs[0].title || '';
  }
  // Sanitise for filenames: keep alphanumeric, spaces and dashes, truncate to 40 chars
  prdTitle = prdTitle.replace(/[^a-zA-Z0-9 \-]/g, ' ').trim().replace(/\s+/g, '-').slice(0, 40).replace(/-+$/, '');
  var suffix = prdTitle ? ('_' + prdTitle) : '';
  return 'eMudhra-QA-Report' + suffix + '_' + dateStr + '.' + ext;
}

function xmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function excelSheetName(name, used) {
  let base = String(name || 'Output').replace(/[\\/?*[\]:]/g, ' ').trim().substring(0, 31) || 'Output';
  let sheet = base;
  let idx = 1;
  while (used.has(sheet)) {
    const suffix = ' ' + idx++;
    sheet = base.substring(0, 31 - suffix.length) + suffix;
  }
  used.add(sheet);
  return sheet;
}

function cleanExportText(value) {
  return String(value == null ? '' : value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitExportPipeRow(text) {
  const cleaned = cleanExportText(text);
  if (!cleaned.includes('|')) return null;
  const cells = cleaned
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cleanExportText(cell))
    .filter(Boolean);
  if (cells.length < 2) return null;
  if (cells.every(cell => /^[-:\s]+$/.test(cell))) return [];
  return cells;
}

function normalizeExportSteps(value) {
  return cleanExportText(value)
    .replace(/\s+(?=\d+\.\s+)/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function htmlToRows(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  const tables = Array.from(template.content.querySelectorAll('table'));
  const rows = [];

  if (tables.length > 0) {
    tables.forEach((table, tableIdx) => {
      if (tableIdx > 0) rows.push([]);
      table.querySelectorAll('tr').forEach(tr => {
        const rawCells = Array.from(tr.children).map(cell => cleanExportText(cell.textContent));
        if (!tr.querySelector('th') && isExcludedTestCaseRow(rawCells)) return;
        const normalized = table.classList.contains('ac-test-case-table') || tr.querySelector('th') ? rawCells : simplifyTestCaseRow(rawCells);
        const cells = Array.from(tr.children).map((cell, idx) => ({
          value: normalized[idx] || '',
          header: cell.tagName === 'TH'
        }));
        if (cells.length) rows.push(cells);
      });
    });
    return rows;
  }

  const text = cleanExportText(template.content.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return [[{ value: 'No content generated', header: false }]];

  text.split(/\r?\n/).forEach(line => {
    const cleaned = cleanExportText(line);
    if (!cleaned) {
      rows.push([]);
    } else {
      const pipeCells = splitExportPipeRow(cleaned);
      if (pipeCells && pipeCells.length) {
        rows.push(pipeCells.map(value => ({ value, header: false })));
        return;
      }
      if (pipeCells && pipeCells.length === 0) return;
      const isHeading = cleaned.length < 90 && (/^[A-Z0-9 .:/&()_-]+$/.test(cleaned) || /^(AI Generated|Test Plan|Scenarios|Automation|JSON|API)/i.test(cleaned));
      rows.push([{ value: cleaned, header: isHeading }]);
    }
  });
  return rows;
}

function htmlToExcelRows(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  const rows = [];
  const tables = Array.from(template.content.querySelectorAll('table'));

  if (tables.length > 0) {
    tables.forEach((table, tableIdx) => {
      if (tableIdx > 0) rows.push({ cells: [''], kind: 'spacer' });
      table.querySelectorAll('tr').forEach((tr, rowIdx) => {
        const rawCells = Array.from(tr.children).map(cell => cleanExportText(cell.textContent));
        if (!tr.querySelector('th') && isExcludedTestCaseRow(rawCells)) return;
        const cells = table.classList.contains('ac-test-case-table') || tr.querySelector('th') ? rawCells : simplifyTestCaseRow(rawCells);
        if (cells.length) rows.push({ cells, kind: rowIdx === 0 || tr.querySelector('th') ? 'header' : 'data' });
      });
    });
    return rows;
  }

  const contentRoot = template.content.querySelector('.qa-plan-output') || template.content;
  const blockSelector = 'h1,h2,h3,h4,p,li,pre,code';
  Array.from(contentRoot.querySelectorAll(blockSelector)).forEach(el => {
    if (el.closest('.qa-plan-kicker')) return;
    const text = cleanExportText(el.innerText || el.textContent || '');
    if (!text || text.length < 2) return;
    if (/^Section\s+\d+$/i.test(text)) return;
    const pipeCells = splitExportPipeRow(text);
    if (pipeCells && pipeCells.length) {
      rows.push({ cells: pipeCells, kind: 'data' });
      return;
    }
    if (pipeCells && pipeCells.length === 0) return;
    const tag = el.tagName.toLowerCase();
    const kind = /^h[1-4]$/.test(tag) || /^(AI Generated|Test Plan|Scenarios|Automation|JSON|API|Security)/i.test(text)
      ? 'section'
      : 'text';
    rows.push({ cells: [text], kind });
  });

  if (rows.length === 0) {
    const text = cleanExportText(contentRoot.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    (text ? text.split(/\r?\n/) : ['No content generated']).forEach(line => {
      const cleaned = cleanExportText(line);
      if (cleaned) rows.push({ cells: [cleaned], kind: 'text' });
    });
  }
  return rows;
}

function getExportEntries() {
  const labels = {
    prd_analysis: 'PRD Analysis Summary',
    gap_analysis: 'Requirement Gap Analysis',
    test_strategy: 'Test Strategy',
    risk_assessment: 'Risk Assessment',
    testcases: 'Comprehensive Test Cases',
    coverage_matrix: 'Coverage Matrix',
    automation: 'Automation Recommendations',
    json_suite: 'JSON Suite',
    api_tests: 'API Tests'
  };
  const entries = Object.entries(labels).filter(([key]) => {
    if (['prd_analysis', 'gap_analysis', 'test_strategy', 'risk_assessment', 'testcases', 'coverage_matrix'].includes(key)) return !!generatedData[key];
    return hasMeaningfulOutput(key);
  });
  return entries.length ? entries : [['output', 'Output']];
}

function hasMeaningfulOutput(key) {
  const html = generatedData[key];
  if (!html) return false;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (key === 'automation' && /No Automation|Automation Scripts Disabled|No Automation Scripts generated|Conversational Response/i.test(text)) return false;
  if (key === 'json_suite' && /No content generated/i.test(text)) return false;
  if (key === 'api_tests' && /No API Endpoints Detected/i.test(text)) return false;
  return true;
}

function updateOutputTabs(preferredTab) {
  const optionalTabs = new Set(['automation', 'json_suite', 'api_tests']);
  let activeAvailable = null;

  document.querySelectorAll('.out-tab').forEach(tab => {
    const key = tab.dataset.tab;
    const disabled = optionalTabs.has(key) && !hasMeaningfulOutput(key);
    tab.disabled = disabled;
    tab.classList.toggle('disabled', disabled);
    tab.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (!disabled && (key === preferredTab || tab.classList.contains('active'))) activeAvailable = key;
  });

  if (preferredTab && hasMeaningfulOutput(preferredTab)) {
    activeAvailable = preferredTab;
  }
  if (!activeAvailable || (optionalTabs.has(activeAvailable) && !hasMeaningfulOutput(activeAvailable))) {
    activeAvailable = generatedData.prd_analysis ? 'prd_analysis' : (generatedData.gap_analysis ? 'gap_analysis' : 'testcases');
  }

  document.querySelectorAll('.out-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === activeAvailable));
}

function buildStyledExcelXml() {
  const labels = {
    prd_analysis: 'PRD Analysis Summary',
    gap_analysis: 'Requirement Gap Analysis',
    test_strategy: 'Test Strategy',
    risk_assessment: 'Risk Assessment',
    testcases: 'Comprehensive Test Cases',
    coverage_matrix: 'Coverage Matrix',
    automation: 'Automation Recommendations',
    json_suite: 'JSON Suite',
    api_tests: 'API Tests'
  };
  const usedNames = new Set();
  const entries = Object.entries(labels).filter(([key]) => {
    if (['prd_analysis', 'gap_analysis', 'test_strategy', 'risk_assessment', 'testcases', 'coverage_matrix'].includes(key)) return !!generatedData[key];
    return hasMeaningfulOutput(key);
  });
  const selectedEntries = entries.length ? entries : [['output', 'Output']];

  const worksheets = selectedEntries.map(([key, label]) => {
    const html = key === 'output' ? getActiveOutputHtml() : generatedData[key];
    const rows = htmlToRows(html);
    const maxCols = Math.max(1, ...rows.map(row => row.length));
    const sheetName = excelSheetName(label, usedNames);
    const columns = Array.from({ length: maxCols }, (_, idx) => {
      const width = idx === 0 ? 130 : idx === 1 ? 260 : idx === 2 ? 230 : 320;
      return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
    }).join('');
    const rowXml = rows.map((row, rowIdx) => {
      if (!row.length) return '<Row ss:Height="10"/>';
      const cells = row.map((cell, colIdx) => {
        const style = rowIdx === 0 || cell.header ? 'Header' : (colIdx === 0 ? 'IdCell' : (rowIdx % 2 ? 'BodyAlt' : 'Body'));
        return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(cell.value)}</Data></Cell>`;
      }).join('');
      return `<Row ss:AutoFitHeight="1">${cells}</Row>`;
    }).join('');
    return `<Worksheet ss:Name="${xmlEscape(sheetName)}">
      <Table ss:ExpandedColumnCount="${maxCols}" ss:ExpandedRowCount="${Math.max(rows.length, 1)}" x:FullColumns="1" x:FullRows="1">
        ${columns}
        ${rowXml}
      </Table>
    </Worksheet>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#14213A"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
      </Borders>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Aptos Display" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#6E3A91" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#F26A21"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>
    <Style ss:ID="IdCell">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#008A5B"/>
      <Interior ss:Color="#F0FFF8" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
      </Borders>
    </Style>
    <Style ss:ID="Body">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#14213A"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
      </Borders>
    </Style>
    <Style ss:ID="BodyAlt">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#14213A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
      </Borders>
    </Style>
  </Styles>
  ${worksheets}
</Workbook>`;
}

async function exportGeneratedWorkbook() {
  await yieldToBrowser();
  if (typeof ExcelJS !== 'undefined') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QA-Gen AI | eMudhra';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = false;
    workbook.calcProperties.fullCalcOnLoad = true;

    const entries = getExportEntries();
    const usedNames = new Set();
    const palette = ['EAF4FF', 'FFF4E8', 'EEF9F0', 'F4ECFA', 'EAFBFC', 'FFF8DB'];
    const border = { style: 'thin', color: { argb: 'FFD9E2EC' } };

    entries.forEach(([key, label]) => {
      const html = key === 'output' ? getActiveOutputHtml() : generatedData[key];
      const exportRows = htmlToExcelRows(html);
      const maxCols = Math.max(1, Math.min(24, ...exportRows.map(row => row.cells.length)));
      const sheet = workbook.addWorksheet(excelSheetName(label, usedNames), {
        views: [{ showGridLines: true }]
      });

      sheet.mergeCells(1, 1, 1, maxCols);
      const title = sheet.getCell(1, 1);
      title.value = `eMudhra QA-Gen AI - ${label}`;
      title.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213A' } };
      title.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 28;

      sheet.mergeCells(2, 1, 2, maxCols);
      const meta = sheet.getCell(2, 1);
      meta.value = `Generated: ${new Date().toLocaleString()} | Format: XLSX | Exported by eMudhra QA-Gen AI`;
      meta.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      meta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      meta.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;
      sheet.addRow([]);

      let firstHeaderRow = null;
      exportRows.forEach((row, idx) => {
        const values = row.cells.slice(0, maxCols).map((value, colIdx) => {
          if (key === 'testcases' && row.kind === 'data' && colIdx === 9) return normalizeExportSteps(value);
          return cleanExportText(value);
        });
        const excelRow = sheet.addRow(values);
        const rowNumber = excelRow.number;
        excelRow.height = row.kind === 'section' ? 24 : (key === 'testcases' && row.kind === 'data' ? 58 : 30);

        if (row.kind === 'section') {
          if (maxCols > 1) sheet.mergeCells(rowNumber, 1, rowNumber, maxCols);
          excelRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };
            cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF14213A' } };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            cell.border = { top: border, left: border, bottom: border, right: border };
          });
          return;
        }

        if (row.kind === 'header' && !firstHeaderRow) firstHeaderRow = rowNumber;
        const isHeader = row.kind === 'header';
        const fillColor = isHeader ? 'FF1F4E78' : (idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');

        for (let col = 1; col <= maxCols; col++) {
          const cell = excelRow.getCell(col);
          cell.font = { name: 'Calibri', size: isHeader ? 10 : 10, bold: isHeader, color: { argb: isHeader ? 'FFFFFFFF' : 'FF14213A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.alignment = { vertical: 'top', horizontal: isHeader ? 'center' : 'left', wrapText: true };
          cell.border = { top: border, left: border, bottom: border, right: border };
        }

        if (!isHeader) {
          const first = excelRow.getCell(1);
          first.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF14213A' } };
          first.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
      });

      const widths = Array.from({ length: maxCols }, (_, idx) => {
        if (key === 'testcases') {
          if (idx === 0) return 18;
          if ([3, 4, 7, 8, 9, 10, 15, 18].includes(idx)) return 34;
          if (idx === 1 || idx === 2 || idx === 14) return 24;
          return 16;
        }
        if (idx === 0) return 34;
        if (idx === 1) return 42;
        return 26;
      });
      sheet.columns = widths.map(width => ({ width }));

      if (firstHeaderRow) {
        try {
          sheet.autoFilter = {
            from: { row: firstHeaderRow, column: 1 },
            to: { row: firstHeaderRow, column: maxCols }
          };
        } catch (err) {
          console.warn('Unable to apply autofilter:', err);
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, buildExportFilename('xlsx'));
    return;
  }

  const xml = buildStyledExcelXml();
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, buildExportFilename('xls'));
}

// ===== GENERATION STEPS =====
var STEPS = [
  'Initializing QA-Gen AI Engine...',
  'Extracting Requirements (RICEPOT: Requirements)...',
  'Mapping UI Components (RICEPOT: Interfaces)...',
  'Evaluating Edge Cases (RICEPOT: Errors)...',
  'Building Business Core (BLAST: Business Flow)...',
  'Drafting Logic Gates (BLAST: Logic Coverage)...',
  'Validating Technology Stack (BLAST: Tech/UI)...',
  'Generating Professional Test Plan...',
  'Structuring Modular Test Cases...',
  'Writing Native Automation Scripts...',
  'Finalizing Deliverables...'
];

async function startGeneration(inputSource) {
  generatedData = {};
  showProcessingOverlay('Please wait. eMudhra QA-Gen AI is analyzing the PRD and building enterprise QA deliverables...');
  $('featureGrid').style.display = 'grid';
  $('outputStatsGrid').style.display = 'grid';
  $('outputArea').style.display = 'block';
  $('outputLoading').style.display = 'flex';
  $('outputStream').innerHTML = '';

  ['planStatus', 'tcCountDisplay', 'covCountDisplay', 'autoCountDisplay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  document.querySelectorAll('.out-tab').forEach(function(t) { t.classList.remove('active'); });
  var firstTab = document.querySelector('.out-tab[data-tab="prd_analysis"]');
  if (firstTab) firstTab.classList.add('active');
  updateOutputTabs('prd_analysis');

  var autoLangEl = document.getElementById('autoLangSelect');
  var autoLang = autoLangEl ? autoLangEl.value : 'java';

  var stepIdx = 0;
  var stepEl = document.getElementById('loadingStep');
  
  // Custom deep analysis steps
  const DEEP_STEPS = [
    'eMudhra QA engine is reading the PRD...',
    'Extracting fields, validations, and business rules...',
    'Building boundary, null, empty, and character test coverage...',
    'Adding negative, workflow, API, and usability scenarios...',
    'Finalizing risk coverage and the 21-field enterprise test case table...'
  ];

  var timer = setInterval(function() {
    if (stepEl && stepIdx < DEEP_STEPS.length) {
      const nextStep = DEEP_STEPS[stepIdx++];
      stepEl.textContent = nextStep;
      updateProcessingOverlay(
        'Please wait. eMudhra QA-Gen AI is analyzing the PRD and building enterprise QA deliverables...',
        nextStep,
        Math.min(92, 16 + stepIdx * 15)
      );
    }
  }, 1200);

  try {
     // Prepare payloads
     const models = AppState.models;
     // Get currently selected engine from the dropdown on Home page
     const engineSelector = document.getElementById('selectedModel');
     const activeEngine = engineSelector ? engineSelector.value : 'ollama';

     const config = {
        current: activeEngine,
        data: models.data || models
     };

     // Create streaming UI
     const outputStream = $('outputStream');
     outputStream.innerHTML = '<div class="streaming-box" id="streamingBox"></div>';
     const streamBox = $('streamingBox');
     const streamRenderer = createBufferedStreamRenderer(outputStream, streamBox);

     const onChunk = (chunk) => {
       streamRenderer.push(chunk);
     };

     const result = await AIEngine.generate(inputSource, config, onChunk, autoLang);
     streamRenderer.flush();
     const parsed = AIEngine.parseOutput(result);

     clearInterval(timer);
     document.getElementById('outputLoading').style.display = 'none';
     updateProcessingOverlay('Analysis complete!', 'Building your enterprise QA deliverables...', 100);
     _stopProgressCounter(100);
     await new Promise(function(r) { setTimeout(r, 500); });
     finalizeGeneration(inputSource, parsed);
     showSuccessPopup('Analysis Completed Successfully', 'PRD analysis, strategy, risks, coverage, and enterprise test cases are ready.');
  } catch (err) {
     clearInterval(timer);
     document.getElementById('outputLoading').style.display = 'none';
     hideProcessingOverlay();
     showToast(err.message, 'error');
     console.error(err);
  }
}

function renderDynamicTestPlan(text, title, subtitle, badge) {
    if (!text) return '<div style="padding:20px;color:#64748b;font-weight:700">No section data generated.</div>';
    let html = markdownToBrightBlocks(text, 'plan');
    const safeTitle = title || 'AI Generated Test Plan';
    const safeSubtitle = subtitle || 'Structured from the attached PRD/API specification';
    const safeBadge = badge || 'QA';
    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(242,106,33,0.35);padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#f26a21,#6e3a91);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff;font-weight:950">${escapeHtml(safeBadge)}</div>
        <div>
          <div style="font-size:1.3rem;font-weight:950;color:#020617">${escapeHtml(safeTitle)}</div>
          <div style="font-size:0.78rem;color:#334155;font-weight:900">${escapeHtml(safeSubtitle)}</div>
        </div>
      </div>
      <div class="bright-output-text qa-plan-output">
        ${html}
      </div>
    </div>`;
}

function renderDynamicScenarios(text) {
    if (!text) return { html: '<div style="padding:20px;color:#64748b;font-weight:700">No Scenarios data generated.</div>', count: 0 };
    let count = (text.match(/(?:^|\n)- (.*?)(?=\n|$)/g) || []).length;
    let html = markdownToBrightBlocks(text, 'scenario');
    const finalHtml = `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(111,58,145,0.28);padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#6e3a91,#f26a21);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🗂</div>
        <div>
          <div style="font-size:1.3rem;font-weight:900;color:#14213a">AI Generated Scenarios</div>
          <div style="font-size:0.78rem;color:#64748b;font-weight:700">Extracted from custom PRD Upload — ${count} scenarios found</div>
        </div>
      </div>
      <div class="bright-output-text qa-plan-output">
        ${html}
      </div>
    </div>`;
    return { html: finalHtml, count };
}

function splitMarkdownTableRow(line) {
    let trimmed = String(line || '').trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed
        .split(/(?<!\\)\|/)
        .map(cell => cell.replace(/\\\|/g, '|').trim().replace(/\*\*/g, '').replace(/__/g, ''));
}

function normalizeTestCaseRow(cells) {
    const target = TEST_CASE_COLUMNS.length;
    const normalized = (cells || []).map(cell => String(cell == null ? '' : cell).trim());
    if (normalized.length > target) {
        return normalized.slice(0, target - 1).concat(normalized.slice(target - 1).join(' | '));
    }
    while (normalized.length < target) normalized.push('');
    return normalized;
}

function isLikelyTestCaseHeader(cells) {
    const normalized = (cells || []).map(normalizeHeaderText).filter(Boolean);
    if (!normalized.length) return false;
    if (isDuplicateTestCaseHeaderRow(cells)) return true;
    const headerAliases = new Set([
      'tc id',
      'test id',
      'case id',
      'module',
      'feature',
      'requirement id',
      'user story',
      'scenario',
      'test scenario',
      'title',
      'test case title',
      'precondition',
      'preconditions',
      'test data',
      'steps',
      'steps to execute',
      'expected result',
      'actual result',
      'priority',
      'severity',
      'status'
    ]);
    const matches = normalized.filter(cell => TEST_CASE_COLUMN_HEADER_SET.has(cell) || headerAliases.has(cell)).length;
    return matches >= 3 || ['test case id', 'tc id', 'test id', 'case id'].includes(normalized[0]);
}

function isMarkdownSeparatorRow(cells) {
    return cells && cells.length > 0 && cells.every(cell => /^[\s:-]+$/.test(String(cell || '')));
}

function renderDynamicTestCases(text) {
    if (!text) return { html: '<div style="padding:20px;color:#a8b8cc">No Test Cases generated.</div>', count: 0 };
    let content = text;
    let count = 0;
    
    if (text.includes('<table')) {
        content = text;
        // Count rows in existing HTML table
        count = (text.match(/<tr/g) || []).length - 1; // Subtract 1 for header
        if (count < 0) count = 0;
    } else if (text.includes('|')) {
        let lines = text.trim().split('\n');
        let htmlTable = '<div class="test-case-table-shell"><table class="test-case-table">' + buildTestCaseColGroup();
        let hasTable = false;
        let headerRendered = false;

        for(let line of lines) {
            line = line.trim();
            if(!line) continue;
            if(line.includes('|')) {
                let rowData = splitMarkdownTableRow(line);
                
                if(rowData.length > 0) {
                    if (isMarkdownSeparatorRow(rowData)) continue;
                    const headerLike = isLikelyTestCaseHeader(rowData) || isDuplicateTestCaseHeaderRow(rowData);
                    if (headerLike) {
                        if (!headerRendered) {
                            hasTable = true;
                            htmlTable += '<tr>';
                            TEST_CASE_COLUMNS.forEach(function(cell) {
                                htmlTable += `<th>${escapeHtml(cell)}</th>`;
                            });
                            htmlTable += '</tr>';
                            headerRendered = true;
                        }
                        continue;
                    }

                    if (!headerRendered) {
                        htmlTable += '<tr>';
                        TEST_CASE_COLUMNS.forEach(function(cell) {
                            htmlTable += `<th>${escapeHtml(cell)}</th>`;
                        });
                        htmlTable += '</tr>';
                        headerRendered = true;
                    }

                    hasTable = true;
                    if (isExcludedTestCaseRow(rowData)) continue;
                    const cells = simplifyTestCaseRow(rowData);
                    htmlTable += '<tr>';
                    count++;
                    for(let cell of cells) {
                        let c = escapeHtml(cell);
                        htmlTable += `<td>${c}</td>`;
                    }
                    htmlTable += '</tr>';
                }
            }
        }
        if(hasTable) {
            htmlTable += '</table></div>';
            content = htmlTable;
        } else {
            content = `<pre style="font-family:'Consolas',monospace;background:#f8fafc;padding:16px;border-radius:8px;color:#14213a;overflow-x:auto;border:1px solid #e2e8f0">${escapeHtml(text)}</pre>`;
        }
    } else if (/(TC ID:|Case ID:|Test ID:|Test Case Title:)/i.test(text)) {
        // Prettify Structured List format (Security/SSO)
        let sections = text.split(/(?=TC ID:|Case ID:|Test ID:|Test Case Title:)/gi);
        let listHtml = '<div style="display:flex; flex-direction:column; gap:20px;">';
        
        for (let section of sections) {
            if (!section.trim()) continue;
            count++; // Count list items
            let lines = section.trim().split('\n');
            let cardHtml = '<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; border-left:4px solid #10b981;">';
            
            for (let line of lines) {
                let parts = line.split(':');
                if (parts.length >= 2) {
                    let key = parts[0].trim();
                    let val = parts.slice(1).join(':').trim();
                    let keyColor = key.includes('TC ID') ? '#10b981' : '#6e3a91';
                    let valColor = '#14213a';
                    let fontSize = key.includes('TC ID') ? '1.1rem' : '0.85rem';
                    let fontWeight = key.includes('TC ID') ? '800' : '600';
                    
                    cardHtml += `<div style="margin-bottom:8px">
                        <span style="color:${keyColor}; font-weight:${fontWeight}; font-size:${fontSize}; font-family:'Outfit'; display:inline-block; min-width:120px">${key}:</span>
                        <span style="color:${valColor}; font-size:0.85rem; font-family:'Inter'">${val}</span>
                    </div>`;
                } else {
                    cardHtml += `<div style="color:#475569; font-size:0.8rem; margin-top:4px">${escapeHtml(line)}</div>`;
                }
            }
            cardHtml += '</div>';
            listHtml += cardHtml;
        }
        listHtml += '</div>';
        content = listHtml;
    } else {
        content = `<pre style="font-family:'Consolas',monospace;background:#f8fafc;padding:16px;border-radius:8px;color:#14213a;overflow-x:auto;border:1px solid #e2e8f0">${escapeHtml(text)}</pre>`;
    }

    const html = `<div style="font-family:'Outfit',sans-serif">
      <style>
      .ai-dynamic-table table { border-collapse: separate; border-spacing: 0; font-family:'Inter',sans-serif; width:100%; min-width:2400px; table-layout: fixed; color:#0f172a; border:1px solid #94a3b8; }
      .ai-dynamic-table th { padding: 14px 12px; text-align:left; background: #14213a; color: #ffffff; font-weight: 900; border: 1px solid #64748b; white-space: normal; position:sticky; top:0; z-index:2; }
      .ai-dynamic-table td { padding: 12px 12px; color: #0f172a; font-weight: 800; border: 1px solid #cbd5e1; word-wrap: break-word; overflow-wrap: anywhere; white-space: pre-wrap; vertical-align:top; background:#ffffff; }
      .ai-dynamic-table tr:nth-child(even) td { background:#f1f5f9; }
      .ai-dynamic-table tr:hover td { background: #dbeafe; }
      .ai-dynamic-table strong, .ai-dynamic-table b { color: #0f172a; font-weight: 900; }
      </style>
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(16,185,129,0.3);padding-bottom:14px;margin-bottom:20px">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🧪</div>
        <div>
          <div style="font-size:1.3rem;font-weight:900;color:#14213a">AI Generated Test Cases</div>
          <div style="font-size:0.72rem;color:#6b7f96">Extracted from custom PRD Upload — ${count} cases found</div>
        </div>
      </div>
      <div style="overflow:auto; max-height:calc(100vh - var(--topbar-h) - 190px); border-radius:10px; padding:8px; background:#ffffff">
        <div class="ai-dynamic-table">${content}</div>
      </div>
    </div>`;
    
    return { html, count };
}

function countEnterpriseRows(text) {
    if (!text) return 0;
    if (String(text).includes('<table')) {
        return Math.max(0, (String(text).match(/<tr\b/gi) || []).length - 1);
    }
    return String(text).split(/\r?\n/).reduce((count, line) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes('|')) return count;
        const cells = splitMarkdownTableRow(trimmed);
        if (cells.length < 5 || isMarkdownSeparatorRow(cells) || isLikelyTestCaseHeader(cells)) return count;
        return count + 1;
    }, 0);
}

function sanitizeMarkdownCell(value) {
    return String(value == null || value === '' ? 'N/A' : value)
      .replace(/\|/g, '/')
      .replace(/<br\s*\/?>/gi, '; ')
      .replace(/\r?\n/g, '; ')
      .replace(/\s{2,}/g, ' ')
      .trim();
}

function uniqueValues(items) {
    return Array.from(new Set((items || []).map(item => String(item || '').trim()).filter(Boolean)));
}

function inferEnterpriseModules(inputSource, intelligence) {
    const text = String(inputSource || '');
    const modules = uniqueValues([
      ...(intelligence && Array.isArray(intelligence.modules) ? intelligence.modules : []),
      /\bauth|login|sso|password|session|token\b/i.test(text) ? 'Authentication' : '',
      /\brole|permission|rbac|authorization|access\b/i.test(text) ? 'Authorization' : '',
      /\bapi|endpoint|request|response|integration\b/i.test(text) ? 'API & Integration' : '',
      /\bworkflow|approval|submit|review|status|state\b/i.test(text) ? 'Workflow' : '',
      /\bdashboard|screen|page|button|form|field|dropdown|table\b/i.test(text) ? 'UI / Forms' : '',
      /\breport|export|download|analytics\b/i.test(text) ? 'Reporting' : '',
      /\bemail|sms|notification|alert\b/i.test(text) ? 'Notifications' : '',
      /\bdatabase|data|record|audit|transaction\b/i.test(text) ? 'Data Management' : '',
      'Security',
      'Performance',
      'Accessibility'
    ]);
    return (modules.length ? modules : ['Core Workflow', 'Security', 'Data Management']).slice(0, 8);
}

function buildEnterpriseScenarioRows(inputSource) {
    const text = String(inputSource || '');
    const intelligence = (typeof EnterpriseQAEngine !== 'undefined' && EnterpriseQAEngine.analyzeRequirement)
      ? EnterpriseQAEngine.analyzeRequirement(text)
      : null;
    const modules = inferEnterpriseModules(text, intelligence);
    const endpoints = intelligence && intelligence.api && Array.isArray(intelligence.api.endpoints) ? intelligence.api.endpoints.slice(0, 5) : [];
    const rows = [];
    const moduleTemplates = [
      ['HAPPY', 'Happy path requirement coverage', 'Validate the primary successful business flow for this requirement.', 'Valid enterprise user, valid role, all mandatory values populated', '1. Sign in with a valid authorized user.<br>2. Open the module workflow.<br>3. Enter valid data for all required fields.<br>4. Submit and verify confirmation.', 'The workflow completes successfully, confirmation is shown, data is persisted, and audit trail is created.', 'High', 'High', 'Functional'],
      ['MAND', 'Mandatory field validation', 'Verify required fields reject null, empty, and whitespace-only values.', 'Null, empty, whitespace values for required fields', '1. Open the workflow.<br>2. Clear each mandatory field one at a time.<br>3. Submit the form after each change.<br>4. Review field-level errors.', 'Submission is blocked with clear validation messages and no partial save occurs.', 'High', 'High', 'Validation'],
      ['BOUND', 'Boundary value validation', 'Verify minimum, maximum, below-minimum, and above-maximum values are handled correctly.', 'Minimum length, maximum length, max+1, numeric min/max, oversized payload', '1. Enter boundary values in applicable fields.<br>2. Submit with each boundary set.<br>3. Repeat with values just outside allowed range.<br>4. Verify data and errors.', 'Valid boundaries are accepted and invalid boundaries are rejected with deterministic messages.', 'High', 'Medium', 'Boundary'],
      ['FORMAT', 'Invalid format and datatype validation', 'Verify invalid formats and wrong datatypes are rejected safely.', 'Invalid email/mobile/date/number/file/API datatype samples', '1. Enter invalid format values.<br>2. Submit through UI and API where applicable.<br>3. Verify validation response.<br>4. Confirm no invalid data is persisted.', 'Invalid formats are rejected and the user receives specific corrective guidance.', 'High', 'Medium', 'Negative'],
      ['DUP', 'Duplicate and idempotency coverage', 'Verify duplicate submissions and repeated requests do not create duplicate records.', 'Duplicate reference number, repeated submit click, replayed API request', '1. Submit a valid transaction.<br>2. Repeat the same submission immediately.<br>3. Replay the request where API exists.<br>4. Check created records.', 'System prevents duplicate processing or returns a controlled idempotent response.', 'Medium', 'High', 'Data Integrity'],
      ['AUTHZ', 'Role-based access control', 'Verify unauthorized users cannot view or modify protected data/actions.', 'User without permission, expired session, direct URL/API access', '1. Sign in as a lower-privilege user.<br>2. Attempt protected screen/action/API.<br>3. Attempt direct URL navigation.<br>4. Review security log.', 'Access is denied, sensitive data is not exposed, and denial is logged.', 'Critical', 'Critical', 'Security'],
      ['SESSION', 'Session timeout and token expiry', 'Verify expired sessions and invalid tokens are handled securely.', 'Expired session, invalid token, refreshed browser tab', '1. Start the workflow with a valid session.<br>2. Expire the session or token.<br>3. Submit or refresh the action.<br>4. Verify redirect/error state.', 'User is redirected or receives a controlled error, and no transaction is processed after expiry.', 'High', 'Critical', 'Security'],
      ['ERROR', 'Error handling and recovery', 'Verify service, validation, and upstream failures show controlled recovery behavior.', 'Network failure, 4xx/5xx response, unavailable dependency', '1. Trigger dependency failure or invalid response.<br>2. Submit the workflow.<br>3. Observe UI/API error handling.<br>4. Retry after recovery.', 'System displays a user-safe error, logs correlation details, and recovers without data corruption.', 'High', 'High', 'Error Handling'],
      ['AUDIT', 'Audit log and traceability', 'Verify critical user actions are written to audit/security logs.', 'Create/update/delete/search/download action, user id, timestamp, IP', '1. Perform the critical action.<br>2. Open audit/security log source.<br>3. Validate actor, timestamp, action, status, and correlation id.<br>4. Verify tamper resistance.', 'Audit entry is complete, accurate, searchable, and cannot be modified by unauthorized users.', 'High', 'High', 'Audit'],
      ['ACCESS', 'Accessibility and keyboard usability', 'Verify the workflow supports keyboard, focus, labels, contrast, and assistive technologies.', 'Keyboard-only navigation, screen reader labels, contrast check', '1. Navigate the module using keyboard only.<br>2. Verify focus order and visible focus.<br>3. Inspect labels/ARIA for inputs.<br>4. Validate error announcements.', 'Controls are reachable, labels are announced, contrast is acceptable, and errors are accessible.', 'Medium', 'Medium', 'Accessibility'],
      ['PERF', 'Performance and concurrency', 'Verify the requirement remains stable under concurrent and large-volume usage.', 'Concurrent users, large result set, large valid payload', '1. Execute concurrent requests/users for the module.<br>2. Submit large valid data sets.<br>3. Measure response time and error rate.<br>4. Validate data consistency.', 'Response remains within agreed SLA, no deadlocks occur, and data remains consistent.', 'Medium', 'High', 'Performance'],
      ['DATA', 'Data persistence and rollback', 'Verify saved data, rollback, and downstream synchronization are correct.', 'Valid save, forced failure, rollback trigger, downstream sync check', '1. Complete the workflow.<br>2. Verify stored database/API state.<br>3. Force a failure during save/sync.<br>4. Verify rollback and downstream consistency.', 'Data is persisted only on success; failed transactions roll back and downstream state remains consistent.', 'High', 'High', 'Data Integrity']
    ];

    let globalTcNum = 1;
    modules.forEach((moduleName, moduleIndex) => {
      moduleTemplates.forEach((template, templateIndex) => {
        const reqNo = moduleIndex * moduleTemplates.length + templateIndex + 1;
        rows.push({
          id: `TC-${String(globalTcNum++).padStart(3, '0')}`,
          module: moduleName,
          req: `REQ-${String(reqNo).padStart(3, '0')} / ${moduleName}`,
          scenario: template[8],
          title: `${moduleName} - ${template[1]}`,
          priority: template[6],
          severity: template[7],
          preconditions: 'User account, permissions, environment, test data, and required integrations are available.',
          testData: template[3],
          steps: template[4],
          expected: template[5],
          risk: template[8],
          automation: /Accessibility|Exploratory/i.test(template[8]) ? 'Candidate' : 'Candidate'
        });
      });
    });

    const apiTemplates = [
      ['VALID', 'Valid API contract request', 'Valid headers, auth token, request payload', 'Send request with valid headers and payload; validate status, schema, and business fields.', 'API returns success status, expected schema, and correct business data.'],
      ['MISSING', 'Missing required API fields', 'Payload with each required field removed', 'Remove each required field and submit request; validate status code and error body.', 'API returns 400/422 with field-specific error and no mutation.'],
      ['TYPE', 'Invalid API datatype coverage', 'String for number, number for string, invalid boolean/date', 'Submit wrong datatypes for each payload field; validate schema errors.', 'API rejects invalid datatypes with deterministic error response.'],
      ['AUTH', 'API authentication and authorization', 'Missing token, expired token, user without role', 'Call endpoint with missing/expired/unauthorized token variants.', 'API returns 401/403 and does not expose sensitive data.'],
      ['RATE', 'API rate limit and retry behavior', 'Burst requests above configured threshold', 'Send burst requests and observe throttling/retry headers.', 'API returns controlled rate-limit response without service degradation.'],
      ['IDEMP', 'API duplicate/idempotency behavior', 'Same request payload and idempotency key/replayed request', 'Send same request multiple times; validate resource count and response.', 'Duplicate processing is prevented or handled idempotently.']
    ];
    endpoints.forEach((endpoint, endpointIndex) => {
      apiTemplates.forEach((template, templateIndex) => {
        rows.push({
          id: `TC-${String(globalTcNum++).padStart(3, '0')}`,
          module: 'API & Integration',
          req: `REQ-API-${String(endpointIndex + 1).padStart(3, '0')} / ${endpoint.method || 'METHOD'} ${endpoint.endpoint || endpoint.path || '/endpoint'}`,
          scenario: 'API Contract',
          title: `${endpoint.method || 'METHOD'} ${endpoint.endpoint || endpoint.path || '/endpoint'} - ${template[1]}`,
          priority: templateIndex < 4 ? 'High' : 'Medium',
          severity: templateIndex === 3 ? 'Critical' : 'High',
          preconditions: 'API base URL, authentication, headers, payload examples, and test environment are available.',
          testData: template[2],
          steps: `1. Prepare ${endpoint.method || 'METHOD'} ${endpoint.endpoint || endpoint.path || '/endpoint'}.<br>2. ${template[3]}<br>3. Validate response status, headers, body, schema, and logs.`,
          expected: template[4],
          risk: 'API / Integration',
          automation: 'Yes',
          api: `${endpoint.method || 'METHOD'} ${endpoint.endpoint || endpoint.path || '/endpoint'}`
        });
      });
    });

    return rows.slice(0, MAX_ENTERPRISE_EXPANSION_CASES);
}

function enterpriseRowsToMarkdown(rows) {
    const header = `| ${TEST_CASE_COLUMNS.join(' | ')} |`;
    const separator = `| ${TEST_CASE_COLUMNS.map(() => '---').join(' | ')} |`;
    const body = rows
    .filter(row => !isExcludedTestCaseRow([
        row.id,
        row.module,
        row.req,
        row.scenario,
        row.title,
        row.priority,
        row.severity,
        row.preconditions,
        row.testData,
        row.steps,
        row.expected,
        'Not Executed',
        'Not Run',
        'QA / UAT',
        row.api ? 'API Client / Postman / Rest Assured' : 'Chrome / Edge / Firefox / Desktop',
        `Requirement ${row.req} remains traceable after execution.`,
        'QA Engineer',
        'TBD',
        row.risk,
        row.automation || 'Candidate',
        'N/A'
      ]))
    .map(row => {
      const cells = simplifyTestCaseRow([
        row.id,
        row.module,
        row.req,
        row.scenario,
        row.title,
        row.priority,
        row.severity,
        row.preconditions,
        row.testData,
        row.steps,
        row.expected,
        'Not Executed',
        'Not Run',
        'QA / UAT',
        row.api ? 'API Client / Postman / Rest Assured' : 'Chrome / Edge / Firefox / Desktop',
        `Requirement ${row.req} remains traceable after execution.`,
        'QA Engineer',
        'TBD',
        row.risk,
        row.automation || 'Candidate',
        'N/A'
      ]);
      return `| ${cells.map(sanitizeMarkdownCell).join(' |')} |`;
    });
    return [header, separator, ...body].join('\n');
}

function ensureEnterpriseTestCaseCoverage(inputSource, aiData) {
    if (!aiData || aiData.conversational) return aiData;
    const sourceText = String(inputSource || '').trim();
    if (sourceText.length < 120) return aiData;

    const existingText = aiData.testCases || '';
    const existingCount = countEnterpriseRows(existingText);
    const requiredCount = sourceText.length > 1400 ? 60 : MIN_ENTERPRISE_TEST_CASES;
    if (existingCount >= requiredCount) return aiData;

    const expansionRows = buildEnterpriseScenarioRows(sourceText);
    if (!expansionRows.length) return aiData;
    const expansionTable = enterpriseRowsToMarkdown(expansionRows);
    const expanded = { ...aiData };
    expanded.testCases = existingCount > 0
      ? `${existingText}\n\nENTERPRISE COVERAGE EXPANSION - Generated because AI returned only ${existingCount} test case(s).\n\n${expansionTable}`
      : expansionTable;
    expanded.coverageMatrix = [
      expanded.coverageMatrix || '',
      '',
      'Enterprise coverage expansion added to restore broad requirement-level test coverage:',
      `- AI returned ${existingCount} test case(s); required minimum was ${requiredCount}.`,
      `- Added ${expansionRows.length} requirement, validation, API, data, and error-handling cases.`
    ].filter(Boolean).join('\n');
    return expanded;
}

function normalizeAutomationLanguage(language) {
    const value = String(language || 'java').toLowerCase();
    if (value.includes('python')) return 'python';
    if (value.includes('playwright') || value.includes('js') || value.includes('javascript')) return 'playwright';
    return 'java';
}

function getAutomationLanguageMeta(language) {
    const normalized = normalizeAutomationLanguage(language);
    const map = {
      java: {
        key: 'java',
        short: 'JAVA',
        label: 'Java + Selenium/TestNG + Rest Assured',
        uiFramework: 'Hybrid TestNG Framework',
        apiFramework: 'Rest Assured Positive API Tests',
        codeLang: 'java',
        accent: '#f97316',
        soft: '#fff7ed'
      },
      python: {
        key: 'python',
        short: 'PY',
        label: 'Python + Selenium/Pytest + Requests',
        uiFramework: 'Hybrid Pytest Framework',
        apiFramework: 'Requests Positive API Tests',
        codeLang: 'python',
        accent: '#2563eb',
        soft: '#eff6ff'
      },
      playwright: {
        key: 'playwright',
        short: 'PW',
        label: 'Playwright JavaScript',
        uiFramework: 'Playwright Hybrid Framework',
        apiFramework: 'Playwright APIRequest Positive Tests',
        codeLang: 'javascript',
        accent: '#7c3aed',
        soft: '#f5f3ff'
      }
    };
    return map[normalized] || map.java;
}

function uniqueAutomationItems(items, getKey) {
    const seen = new Set();
    return (items || []).filter(item => {
      const key = getKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function extractAutomationUrls(text) {
    const urls = [];
    const pattern = /\bhttps?:\/\/[^\s"'<>),]+/gi;
    let match;
    while ((match = pattern.exec(String(text || ''))) !== null) {
      urls.push(match[0].replace(/[.;]+$/g, ''));
    }
    return uniqueAutomationItems(urls, url => url).slice(0, 12);
}

function splitAutomationUrl(url) {
    try {
      const parsed = new URL(url);
      return {
        baseUrl: parsed.origin,
        path: `${parsed.pathname || '/'}${parsed.search || ''}`,
        fullUrl: url
      };
    } catch (err) {
      return { baseUrl: '', path: url || '/', fullUrl: url || '' };
    }
}

function extractJsonLikeBodies(text) {
    const source = String(text || '');
    const bodies = [];
    let start = -1;
    let depth = 0;
    let inString = false;
    let quote = '';
    let escaped = false;

    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === quote) {
          inString = false;
          quote = '';
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
        continue;
      }
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const snippet = source.slice(start, i + 1);
          start = -1;
          if (snippet.length > 6 && snippet.length < 12000 && /["']?\w+["']?\s*:/.test(snippet)) {
            try {
              const parsed = JSON.parse(snippet);
              if (parsed && typeof parsed === 'object') {
                bodies.push(JSON.stringify(parsed, null, 2));
              }
            } catch (err) {
              if (/"[^"]+"\s*:/.test(snippet)) bodies.push(snippet.trim());
            }
          }
        }
      }
      if (depth < 0) {
        depth = 0;
        start = -1;
      }
    }

    return uniqueAutomationItems(bodies, body => body.replace(/\s+/g, '')).slice(0, 8);
}

function addAutomationEndpoint(list, endpoint) {
    const method = String(endpoint.method || 'GET').toUpperCase();
    const rawPath = String(endpoint.path || endpoint.endpoint || endpoint.url || endpoint.route || '').trim();
    if (!rawPath) return;
    const split = /^https?:\/\//i.test(rawPath) ? splitAutomationUrl(rawPath) : { baseUrl: '', path: rawPath, fullUrl: rawPath };
    list.push({
      method,
      path: split.path || rawPath,
      baseUrl: split.baseUrl || '',
      fullUrl: split.fullUrl || rawPath,
      description: endpoint.description || endpoint.name || 'Positive API functionality',
      body: endpoint.body || endpoint.requestBody || endpoint.payload || ''
    });
}

function extractAutomationApiEndpoints(text) {
    const source = String(text || '');
    const endpoints = [];

    if (typeof EnterpriseQAEngine !== 'undefined' && source.trim()) {
      try {
        const enterpriseIntel = EnterpriseQAEngine.analyzeRequirement(source);
        if (enterpriseIntel && enterpriseIntel.api && Array.isArray(enterpriseIntel.api.endpoints)) {
          enterpriseIntel.api.endpoints.forEach(ep => addAutomationEndpoint(endpoints, {
            method: ep.method,
            path: ep.endpoint,
            description: ep.name || ep.description
          }));
        }
      } catch (err) {
        console.warn('Enterprise API endpoint extraction skipped:', err);
      }
    }

    if (typeof AIEngine !== 'undefined' && typeof AIEngine.extractAPISpec === 'function') {
      try {
        AIEngine.extractAPISpec(source).forEach(ep => addAutomationEndpoint(endpoints, ep));
      } catch (err) {
        console.warn('AIEngine API endpoint extraction skipped:', err);
      }
    }

    const methodUrlPattern = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/[^\s"'<>),]+|\/[A-Za-z0-9/_{}:?.=&%-]+)/gi;
    let match;
    while ((match = methodUrlPattern.exec(source)) !== null) {
      addAutomationEndpoint(endpoints, { method: match[1], path: match[2] });
    }

    const jsonMethodPattern = /["']?method["']?\s*[:=]\s*["']?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)["']?[\s\S]{0,240}?["']?(?:endpoint|url|path|route)["']?\s*[:=]\s*["']?(https?:\/\/[^"',\s}]+|\/[A-Za-z0-9/_{}:?.=&%-]+)/gi;
    while ((match = jsonMethodPattern.exec(source)) !== null) {
      addAutomationEndpoint(endpoints, { method: match[1], path: match[2] });
    }

    const curlPattern = /curl[\s\S]{0,80}?(?:-X\s+)?(GET|POST|PUT|PATCH|DELETE)?[\s\S]{0,400}?(https?:\/\/[^\s"'<>),]+)/gi;
    while ((match = curlPattern.exec(source)) !== null) {
      addAutomationEndpoint(endpoints, { method: match[1] || 'GET', path: match[2] });
    }

    return uniqueAutomationItems(endpoints, ep => `${ep.method} ${ep.baseUrl}${ep.path}`).slice(0, 20);
}

function detectAutomationTargets(inputSource, aiData) {
    const sourceText = [
      inputSource || '',
      aiData && aiData.prdAnalysis ? aiData.prdAnalysis : '',
      aiData && aiData.testCases ? aiData.testCases : '',
      aiData && aiData.coverageMatrix ? aiData.coverageMatrix : ''
    ].filter(Boolean).join('\n\n');

    const urls = extractAutomationUrls(sourceText);
    const bodyExamples = extractJsonLikeBodies(sourceText);
    let apiEndpoints = extractAutomationApiEndpoints(sourceText);
    const apiSignal = /\b(api|endpoint|request body|payload|json body|swagger|postman|rest|curl|bearer|authorization|http method)\b/i.test(sourceText);
    const uiSignal = /\b(web application|ui|screen|page|browser|selenium|playwright|login|button|click|navigate|field|form|dashboard|url visible|screenshot)\b/i.test(sourceText);

    if (!apiEndpoints.length && bodyExamples.length && (apiSignal || !uiSignal)) {
      const url = urls.find(item => /\/api\/|\/v\d+\//i.test(item)) || urls[0] || '';
      const split = url ? splitAutomationUrl(url) : { baseUrl: '', path: '/api/positive-flow', fullUrl: '/api/positive-flow' };
      apiEndpoints.push({
        method: 'POST',
        baseUrl: split.baseUrl,
        path: split.path || '/api/positive-flow',
        fullUrl: split.fullUrl || '/api/positive-flow',
        description: 'Positive API functionality from detected request body',
        body: bodyExamples[0]
      });
    }

    apiEndpoints = apiEndpoints.map((ep, idx) => {
      const method = String(ep.method || 'GET').toUpperCase();
      return {
        ...ep,
        method,
        body: ep.body || (['POST', 'PUT', 'PATCH'].includes(method) ? bodyExamples[Math.min(idx, bodyExamples.length - 1)] || bodyExamples[0] || '' : '')
      };
    });

    const baseUrl = apiEndpoints.find(ep => ep.baseUrl)?.baseUrl || (urls[0] ? splitAutomationUrl(urls[0]).baseUrl : 'http://localhost:3000');
    const hasApi = apiEndpoints.length > 0 || (bodyExamples.length > 0 && (apiSignal || !uiSignal));
    const hasUi = uiSignal || (!hasApi && urls.length > 0);

    return {
      sourceText,
      baseUrl: baseUrl || 'http://localhost:3000',
      urls,
      bodyExamples,
      apiEndpoints,
      hasApi,
      hasApiBody: bodyExamples.length > 0,
      hasUi
    };
}

function automationCodeBlock(lang, lines) {
    return '```' + lang + '\n' + lines.join('\n') + '\n```';
}

function jsStringLiteral(value) {
    return JSON.stringify(String(value == null ? '' : value));
}

function javaStringLiteral(value) {
    return JSON.stringify(String(value == null ? '' : value)).replace(/\u2028|\u2029/g, ' ');
}

function pythonStringLiteral(value) {
    return JSON.stringify(String(value == null ? '' : value));
}

function automationMethodName(prefix, index, endpoint) {
    const cleanPath = String(endpoint.path || 'api')
      .replace(/\{[^}]+\}/g, 'by_id')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 34) || 'api';
    return `${prefix}_${String(index + 1).padStart(2, '0')}_${endpoint.method.toLowerCase()}_${cleanPath}`;
}

function buildJavaApiAutomation(targets) {
    const endpoints = targets.apiEndpoints.length ? targets.apiEndpoints : [{
      method: 'POST',
      path: '/api/positive-flow',
      baseUrl: targets.baseUrl,
      body: targets.bodyExamples[0] || '{}',
      description: 'Positive API functionality'
    }];
    const baseUrl = endpoints.find(ep => ep.baseUrl)?.baseUrl || targets.baseUrl || 'http://localhost:3000';
    const providerRows = endpoints.map(ep => {
      const path = ep.path || '/';
      const body = ['POST', 'PUT', 'PATCH'].includes(ep.method) ? (ep.body || '{}') : '';
      return `            { new ApiCase(${javaStringLiteral(ep.method)}, ${javaStringLiteral(path)}, ${javaStringLiteral(body)}) }`;
    }).join(',\n');
    return automationCodeBlock('java', [
      'package tests.api;',
      '',
      'import io.restassured.RestAssured;',
      'import io.restassured.http.ContentType;',
      'import io.restassured.response.Response;',
      'import io.restassured.specification.RequestSpecification;',
      'import org.testng.annotations.DataProvider;',
      'import org.testng.annotations.Test;',
      '',
      'import static io.restassured.RestAssured.given;',
      'import static org.hamcrest.MatcherAssert.assertThat;',
      'import static org.hamcrest.Matchers.anyOf;',
      'import static org.hamcrest.Matchers.is;',
      '',
      'public class PositiveApiAutomationTest {',
      `    private static final String BASE_URL = ${javaStringLiteral(baseUrl)};`,
      '',
      '    @DataProvider(name = "positiveApis")',
      '    public Object[][] positiveApis() {',
      '        return new Object[][] {',
      providerRows,
      '        };',
      '    }',
      '',
      '    @Test(dataProvider = "positiveApis")',
      '    public void verifyPositiveApiFunctionality(ApiCase api) {',
      '        RestAssured.baseURI = BASE_URL;',
      '        RequestSpecification request = given()',
      '            .relaxedHTTPSValidation()',
      '            .accept(ContentType.JSON)',
      '            .contentType(ContentType.JSON);',
      '',
      '        if (api.body != null && !api.body.isBlank()) {',
      '            request.body(api.body);',
      '        }',
      '',
      '        Response response = request.when().request(api.method, api.path);',
      '        assertThat("Positive API response status", response.statusCode(), anyOf(is(200), is(201), is(202), is(204)));',
      '    }',
      '',
      '    static class ApiCase {',
      '        final String method;',
      '        final String path;',
      '        final String body;',
      '',
      '        ApiCase(String method, String path, String body) {',
      '            this.method = method;',
      '            this.path = path;',
      '            this.body = body;',
      '        }',
      '    }',
      '}'
    ]);
}

function buildPythonApiAutomation(targets) {
    const endpoints = targets.apiEndpoints.length ? targets.apiEndpoints : [{
      method: 'POST',
      path: '/api/positive-flow',
      baseUrl: targets.baseUrl,
      body: targets.bodyExamples[0] || '{}',
      description: 'Positive API functionality'
    }];
    const baseUrl = endpoints.find(ep => ep.baseUrl)?.baseUrl || targets.baseUrl || 'http://localhost:3000';
    const caseRows = endpoints.map(ep => {
      const body = ['POST', 'PUT', 'PATCH'].includes(ep.method) ? (ep.body || '{}') : '';
      return `    {"method": ${pythonStringLiteral(ep.method)}, "path": ${pythonStringLiteral(ep.path || '/')}, "body": ${pythonStringLiteral(body)}}`;
    }).join(',\n');
    return automationCodeBlock('python', [
      'import json',
      'import pytest',
      'import requests',
      '',
      `BASE_URL = ${pythonStringLiteral(baseUrl)}`,
      'POSITIVE_API_CASES = [',
      caseRows,
      ']',
      '',
      '@pytest.mark.parametrize("api", POSITIVE_API_CASES)',
      'def test_positive_api_functionality(api):',
      '    payload = json.loads(api["body"]) if api["body"] else None',
      '    response = requests.request(',
      '        api["method"],',
      '        f"{BASE_URL}{api[\'path\']}",',
      '        json=payload,',
      '        headers={"Content-Type": "application/json"},',
      '        timeout=20',
      '    )',
      '    assert response.status_code in (200, 201, 202, 204)',
      '    if response.content:',
      '        assert response.text.strip()'
    ]);
}

function buildPlaywrightApiAutomation(targets) {
    const endpoints = targets.apiEndpoints.length ? targets.apiEndpoints : [{
      method: 'POST',
      path: '/api/positive-flow',
      baseUrl: targets.baseUrl,
      body: targets.bodyExamples[0] || '{}',
      description: 'Positive API functionality'
    }];
    const baseUrl = endpoints.find(ep => ep.baseUrl)?.baseUrl || targets.baseUrl || 'http://localhost:3000';
    const caseRows = endpoints.map((ep, index) => {
      const body = ['POST', 'PUT', 'PATCH'].includes(ep.method) ? (ep.body || '{}') : '';
      return `  { name: ${jsStringLiteral(automationMethodName('api', index, ep))}, method: ${jsStringLiteral(ep.method)}, path: ${jsStringLiteral(ep.path || '/')}, body: ${jsStringLiteral(body)} }`;
    }).join(',\n');
    return automationCodeBlock('javascript', [
      "const { test, expect } = require('@playwright/test');",
      '',
      `const baseURL = ${jsStringLiteral(baseUrl)};`,
      'const positiveApiCases = [',
      caseRows,
      '];',
      '',
      "test.describe('Positive API automation', () => {",
      '  for (const api of positiveApiCases) {',
      '    test(`${api.name} positive functionality`, async ({ request }) => {',
      '      const response = await request.fetch(`${baseURL}${api.path}`, {',
      '        method: api.method,',
      "        headers: { 'Content-Type': 'application/json' },",
      '        data: api.body ? JSON.parse(api.body) : undefined',
      '      });',
      '      expect([200, 201, 202, 204]).toContain(response.status());',
      '      if (response.status() !== 204) {',
      '        expect((await response.text()).trim().length).toBeGreaterThan(0);',
      '      }',
      '    });',
      '  }',
      '});'
    ]);
}

function buildApiAutomationSection(targets, language) {
    const meta = getAutomationLanguageMeta(language);
    const endpointLines = (targets.apiEndpoints.length ? targets.apiEndpoints : [{
      method: 'POST',
      path: '/api/positive-flow',
      description: 'Positive API functionality from detected request body'
    }]).map((ep, idx) => `- API ${idx + 1}: ${ep.method} ${ep.path} - positive functionality only`);
    const script = meta.key === 'python'
      ? buildPythonApiAutomation(targets)
      : meta.key === 'playwright'
        ? buildPlaywrightApiAutomation(targets)
        : buildJavaApiAutomation(targets);
    return [
      '### API Positive Automation',
      '- Automation is generated for positive functionality only.',
      '- Request body payloads are reused when available in the input.',
      '- Each detected API is covered as a separate positive automation case.',
      ...endpointLines,
      '',
      script
    ].join('\n');
}

function automationFileBlock(path, lang, lines) {
    // Each file is emitted as a labelled paragraph + its own fenced code block so the
    // UI renders one "code shell" card per file of the framework.
    return [`📄 ${path}`, automationCodeBlock(lang, lines)].join('\n');
}

function automationTreeBlock(title, treeLines) {
    return [title, automationCodeBlock('text', treeLines)].join('\n');
}

function buildJavaUiAutomation(targets) {
    const baseUrl = targets.urls[0] || targets.baseUrl || 'http://localhost:3000';
    const blocks = [];

    blocks.push(automationTreeBlock('Complete hybrid framework — copy this structure into a new Maven project:', [
      'selenium-testng-hybrid-framework/',
      '├── pom.xml',
      '├── testng.xml',
      '├── .gitignore',
      '├── README.md',
      '└── src',
      '    └── test',
      '        ├── java',
      '        │   ├── framework',
      '        │   │   ├── ConfigReader.java      # reads config.properties',
      '        │   │   ├── DriverFactory.java     # thread-safe WebDriver factory',
      '        │   │   └── BaseTest.java          # @BeforeMethod / @AfterMethod lifecycle',
      '        │   ├── pages',
      '        │   │   ├── BasePage.java           # shared page-object helpers',
      '        │   │   └── ApplicationPage.java    # page under test (extend per screen)',
      '        │   ├── utils',
      '        │   │   ├── WaitUtils.java          # explicit-wait wrappers',
      '        │   │   └── ScreenshotUtils.java    # capture on failure',
      '        │   ├── listeners',
      '        │   │   └── TestListener.java        # ITestListener -> logs + screenshots',
      '        │   └── tests',
      '        │       └── PositiveUiFlowTest.java  # actual test cases',
      '        └── resources',
      '            ├── config.properties',
      '            └── testdata',
      '                └── testdata.json'
    ]));

    blocks.push(automationFileBlock('pom.xml', 'xml', [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<project xmlns="http://maven.apache.org/POM/4.0.0"',
      '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">',
      '    <modelVersion>4.0.0</modelVersion>',
      '    <groupId>com.emudhra.qa</groupId>',
      '    <artifactId>selenium-testng-hybrid-framework</artifactId>',
      '    <version>1.0.0</version>',
      '    <properties>',
      '        <maven.compiler.source>17</maven.compiler.source>',
      '        <maven.compiler.target>17</maven.compiler.target>',
      '        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>',
      '    </properties>',
      '    <dependencies>',
      '        <dependency>',
      '            <groupId>org.seleniumhq.selenium</groupId>',
      '            <artifactId>selenium-java</artifactId>',
      '            <version>4.21.0</version>',
      '        </dependency>',
      '        <dependency>',
      '            <groupId>org.testng</groupId>',
      '            <artifactId>testng</artifactId>',
      '            <version>7.10.2</version>',
      '        </dependency>',
      '    </dependencies>',
      '    <build>',
      '        <plugins>',
      '            <plugin>',
      '                <groupId>org.apache.maven.plugins</groupId>',
      '                <artifactId>maven-surefire-plugin</artifactId>',
      '                <version>3.2.5</version>',
      '                <configuration>',
      '                    <suiteXmlFiles>',
      '                        <suiteXmlFile>testng.xml</suiteXmlFile>',
      '                    </suiteXmlFiles>',
      '                </configuration>',
      '            </plugin>',
      '        </plugins>',
      '    </build>',
      '</project>'
    ]));

    blocks.push(automationFileBlock('testng.xml', 'xml', [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">',
      '<suite name="PositiveUiSuite" verbose="1">',
      '    <listeners>',
      '        <listener class-name="listeners.TestListener"/>',
      '    </listeners>',
      '    <test name="PositiveUiFlow">',
      '        <classes>',
      '            <class name="tests.PositiveUiFlowTest"/>',
      '        </classes>',
      '    </test>',
      '</suite>'
    ]));

    blocks.push(automationFileBlock('src/test/resources/config.properties', 'properties', [
      `baseUrl=${baseUrl}`,
      'browser=chrome',
      'headless=false',
      'explicitWaitSeconds=15'
    ]));

    blocks.push(automationFileBlock('src/test/resources/testdata/testdata.json', 'json', [
      '{',
      '  "validUser": {',
      '    "username": "user@example.com",',
      '    "password": "ChangeMe123"',
      '  }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/framework/ConfigReader.java', 'java', [
      'package framework;',
      '',
      'import java.io.InputStream;',
      'import java.util.Properties;',
      '',
      'public final class ConfigReader {',
      '    private static final Properties PROPS = new Properties();',
      '',
      '    static {',
      '        try (InputStream in = ConfigReader.class.getClassLoader()',
      '                .getResourceAsStream("config.properties")) {',
      '            PROPS.load(in);',
      '        } catch (Exception e) {',
      '            throw new RuntimeException("Unable to load config.properties", e);',
      '        }',
      '    }',
      '',
      '    private ConfigReader() {}',
      '',
      '    public static String get(String key) {',
      '        return System.getProperty(key, PROPS.getProperty(key));',
      '    }',
      '',
      '    public static String get(String key, String fallback) {',
      '        String value = get(key);',
      '        return value != null ? value : fallback;',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/framework/DriverFactory.java', 'java', [
      'package framework;',
      '',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.chrome.ChromeDriver;',
      'import org.openqa.selenium.chrome.ChromeOptions;',
      '',
      'public final class DriverFactory {',
      '    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();',
      '',
      '    private DriverFactory() {}',
      '',
      '    public static WebDriver create() {',
      '        ChromeOptions options = new ChromeOptions();',
      '        if (Boolean.parseBoolean(ConfigReader.get("headless", "false"))) {',
      '            options.addArguments("--headless=new");',
      '        }',
      '        options.addArguments("--start-maximized");',
      '        WebDriver driver = new ChromeDriver(options);',
      '        DRIVER.set(driver);',
      '        return driver;',
      '    }',
      '',
      '    public static WebDriver get() { return DRIVER.get(); }',
      '',
      '    public static void quit() {',
      '        WebDriver driver = DRIVER.get();',
      '        if (driver != null) {',
      '            driver.quit();',
      '            DRIVER.remove();',
      '        }',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/framework/BaseTest.java', 'java', [
      'package framework;',
      '',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      'import org.testng.annotations.AfterMethod;',
      'import org.testng.annotations.BeforeMethod;',
      'import java.time.Duration;',
      '',
      'public abstract class BaseTest {',
      '    protected WebDriver driver;',
      '    protected WebDriverWait wait;',
      '',
      '    @BeforeMethod(alwaysRun = true)',
      '    public void setUp() {',
      '        driver = DriverFactory.create();',
      '        int seconds = Integer.parseInt(ConfigReader.get("explicitWaitSeconds", "15"));',
      '        wait = new WebDriverWait(driver, Duration.ofSeconds(seconds));',
      '        driver.get(ConfigReader.get("baseUrl"));',
      '    }',
      '',
      '    @AfterMethod(alwaysRun = true)',
      '    public void tearDown() {',
      '        DriverFactory.quit();',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/pages/BasePage.java', 'java', [
      'package pages;',
      '',
      'import org.openqa.selenium.By;',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.WebElement;',
      'import org.openqa.selenium.support.ui.ExpectedConditions;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      '',
      'public abstract class BasePage {',
      '    protected final WebDriver driver;',
      '    protected final WebDriverWait wait;',
      '',
      '    protected BasePage(WebDriver driver, WebDriverWait wait) {',
      '        this.driver = driver;',
      '        this.wait = wait;',
      '    }',
      '',
      '    protected WebElement waitClickable(By locator) {',
      '        return wait.until(ExpectedConditions.elementToBeClickable(locator));',
      '    }',
      '',
      '    protected WebElement waitVisible(By locator) {',
      '        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));',
      '    }',
      '',
      '    protected void type(By locator, String text) {',
      '        WebElement el = waitVisible(locator);',
      '        el.clear();',
      '        el.sendKeys(text);',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/pages/ApplicationPage.java', 'java', [
      'package pages;',
      '',
      'import org.openqa.selenium.By;',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      '',
      'public class ApplicationPage extends BasePage {',
      '    // Replace these locators with the real ones from the PRD / screenshot under test.',
      '    private final By primaryAction = By.cssSelector("button[type=\'submit\'], button, [role=\'button\']");',
      '',
      '    public ApplicationPage(WebDriver driver, WebDriverWait wait) {',
      '        super(driver, wait);',
      '    }',
      '',
      '    public ApplicationPage completePositiveFlow() {',
      '        waitClickable(primaryAction).click();',
      '        return this;',
      '    }',
      '',
      '    public boolean resultIsVisible() {',
      '        return driver.getPageSource().trim().length() > 0;',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/utils/WaitUtils.java', 'java', [
      'package utils;',
      '',
      'import org.openqa.selenium.By;',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.support.ui.ExpectedConditions;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      'import java.time.Duration;',
      '',
      'public final class WaitUtils {',
      '    private WaitUtils() {}',
      '',
      '    public static void forElement(WebDriver driver, By locator, int seconds) {',
      '        new WebDriverWait(driver, Duration.ofSeconds(seconds))',
      '            .until(ExpectedConditions.visibilityOfElementLocated(locator));',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/utils/ScreenshotUtils.java', 'java', [
      'package utils;',
      '',
      'import org.openqa.selenium.OutputType;',
      'import org.openqa.selenium.TakesScreenshot;',
      'import org.openqa.selenium.WebDriver;',
      'import java.io.File;',
      'import java.nio.file.Files;',
      'import java.nio.file.Path;',
      '',
      'public final class ScreenshotUtils {',
      '    private ScreenshotUtils() {}',
      '',
      '    public static void capture(WebDriver driver, String name) {',
      '        if (!(driver instanceof TakesScreenshot)) return;',
      '        try {',
      '            File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);',
      '            Path dir = Path.of("target", "screenshots");',
      '            Files.createDirectories(dir);',
      '            Files.copy(src.toPath(), dir.resolve(name + ".png"));',
      '        } catch (Exception ignored) { }',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/listeners/TestListener.java', 'java', [
      'package listeners;',
      '',
      'import framework.DriverFactory;',
      'import org.testng.ITestListener;',
      'import org.testng.ITestResult;',
      'import utils.ScreenshotUtils;',
      '',
      'public class TestListener implements ITestListener {',
      '    @Override',
      '    public void onTestSuccess(ITestResult result) {',
      '        System.out.println("PASS: " + result.getName());',
      '    }',
      '',
      '    @Override',
      '    public void onTestFailure(ITestResult result) {',
      '        System.out.println("FAIL: " + result.getName());',
      '        ScreenshotUtils.capture(DriverFactory.get(), result.getName());',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('src/test/java/tests/PositiveUiFlowTest.java', 'java', [
      'package tests;',
      '',
      'import framework.BaseTest;',
      'import org.testng.Assert;',
      'import org.testng.annotations.Test;',
      'import pages.ApplicationPage;',
      '',
      'public class PositiveUiFlowTest extends BaseTest {',
      '    @Test(description = "Verify positive UI flow based on PRD or screenshot")',
      '    public void verifyPositiveUiFlow() {',
      '        ApplicationPage page = new ApplicationPage(driver, wait);',
      '        page.completePositiveFlow();',
      '        Assert.assertTrue(page.resultIsVisible(),',
      '            "Expected UI result should be visible after the final action");',
      '    }',
      '}'
    ]));

    blocks.push(automationFileBlock('README.md', 'text', [
      '# Selenium + TestNG Hybrid Framework',
      '',
      '## Run',
      '  mvn clean test                 # runs testng.xml',
      '  mvn clean test -Dheadless=true # headless run',
      '  mvn clean test -DbaseUrl=...   # override the target URL',
      '',
      '## Extend',
      '  1. Add one page class per screen under src/test/java/pages (extend BasePage).',
      '  2. Add one test class per feature under src/test/java/tests (extend BaseTest).',
      '  3. Keep selectors in the page objects, assertions in the tests.'
    ]));

    return blocks.join('\n\n');
}

function buildPythonUiAutomation(targets) {
    const baseUrl = targets.urls[0] || targets.baseUrl || 'http://localhost:3000';
    const blocks = [];

    blocks.push(automationTreeBlock('Complete hybrid pytest framework — copy this structure into a new project:', [
      'selenium-pytest-hybrid-framework/',
      '├── requirements.txt',
      '├── pytest.ini',
      '├── conftest.py              # driver / config fixtures + screenshot-on-fail hook',
      '├── README.md',
      '├── config',
      '│   └── config.py            # loads settings + env overrides',
      '├── pages',
      '│   ├── base_page.py         # shared page-object helpers',
      '│   └── application_page.py  # page under test (extend per screen)',
      '├── utils',
      '│   ├── driver_factory.py    # builds the WebDriver',
      '│   └── logger.py            # console logger',
      '├── data',
      '│   └── testdata.json',
      '└── tests',
      '    └── test_positive_ui_flow.py'
    ]));

    blocks.push(automationFileBlock('requirements.txt', 'text', [
      'selenium==4.21.0',
      'pytest==8.2.0',
      'pytest-html==4.1.1',
      'webdriver-manager==4.0.1'
    ]));

    blocks.push(automationFileBlock('pytest.ini', 'ini', [
      '[pytest]',
      'addopts = -v --html=reports/report.html --self-contained-html',
      'testpaths = tests'
    ]));

    blocks.push(automationFileBlock('config/config.py', 'python', [
      'import os',
      '',
      `BASE_URL = os.getenv("BASE_URL", ${pythonStringLiteral(baseUrl)})`,
      'BROWSER = os.getenv("BROWSER", "chrome")',
      'HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"',
      'EXPLICIT_WAIT = int(os.getenv("EXPLICIT_WAIT", "15"))'
    ]));

    blocks.push(automationFileBlock('utils/driver_factory.py', 'python', [
      'from selenium import webdriver',
      'from selenium.webdriver.chrome.options import Options',
      'from config.config import HEADLESS',
      '',
      '',
      'def create_driver():',
      '    options = Options()',
      '    if HEADLESS:',
      '        options.add_argument("--headless=new")',
      '    options.add_argument("--start-maximized")',
      '    return webdriver.Chrome(options=options)'
    ]));

    blocks.push(automationFileBlock('utils/logger.py', 'python', [
      'import logging',
      '',
      'logging.basicConfig(',
      '    level=logging.INFO,',
      '    format="%(asctime)s [%(levelname)s] %(message)s",',
      ')',
      '',
      '',
      'def get_logger(name):',
      '    return logging.getLogger(name)'
    ]));

    blocks.push(automationFileBlock('conftest.py', 'python', [
      'import pytest',
      'from selenium.webdriver.support.ui import WebDriverWait',
      'from config.config import BASE_URL, EXPLICIT_WAIT',
      'from utils.driver_factory import create_driver',
      '',
      '',
      '@pytest.fixture',
      'def driver():',
      '    browser = create_driver()',
      '    browser.get(BASE_URL)',
      '    yield browser',
      '    browser.quit()',
      '',
      '',
      '@pytest.fixture',
      'def wait(driver):',
      '    return WebDriverWait(driver, EXPLICIT_WAIT)',
      '',
      '',
      '@pytest.hookimpl(hookwrapper=True)',
      'def pytest_runtest_makereport(item, call):',
      '    outcome = yield',
      '    report = outcome.get_result()',
      '    if report.when == "call" and report.failed:',
      '        drv = item.funcargs.get("driver")',
      '        if drv:',
      '            drv.save_screenshot(f"reports/{item.name}.png")'
    ]));

    blocks.push(automationFileBlock('pages/base_page.py', 'python', [
      'from selenium.webdriver.support import expected_conditions as EC',
      'from selenium.webdriver.support.ui import WebDriverWait',
      '',
      '',
      'class BasePage:',
      '    def __init__(self, driver, wait: WebDriverWait):',
      '        self.driver = driver',
      '        self.wait = wait',
      '',
      '    def click(self, locator):',
      '        self.wait.until(EC.element_to_be_clickable(locator)).click()',
      '',
      '    def type(self, locator, text):',
      '        element = self.wait.until(EC.visibility_of_element_located(locator))',
      '        element.clear()',
      '        element.send_keys(text)'
    ]));

    blocks.push(automationFileBlock('pages/application_page.py', 'python', [
      'from selenium.webdriver.common.by import By',
      'from pages.base_page import BasePage',
      '',
      '',
      'class ApplicationPage(BasePage):',
      '    # Replace with the real locators from the PRD / screenshot under test.',
      '    PRIMARY_ACTION = (By.CSS_SELECTOR, "button[type=\'submit\'], button, [role=\'button\']")',
      '',
      '    def complete_positive_flow(self):',
      '        self.click(self.PRIMARY_ACTION)',
      '        return self',
      '',
      '    def result_is_visible(self):',
      '        return len(self.driver.page_source.strip()) > 0'
    ]));

    blocks.push(automationFileBlock('data/testdata.json', 'json', [
      '{',
      '  "valid_user": {',
      '    "username": "user@example.com",',
      '    "password": "ChangeMe123"',
      '  }',
      '}'
    ]));

    blocks.push(automationFileBlock('tests/test_positive_ui_flow.py', 'python', [
      'from pages.application_page import ApplicationPage',
      '',
      '',
      'def test_positive_ui_flow(driver, wait):',
      '    page = ApplicationPage(driver, wait)',
      '    page.complete_positive_flow()',
      '    assert page.result_is_visible()'
    ]));

    blocks.push(automationFileBlock('README.md', 'text', [
      '# Selenium + Pytest Hybrid Framework',
      '',
      '## Setup',
      '  python -m venv .venv && . .venv/Scripts/activate   # Windows',
      '  pip install -r requirements.txt',
      '',
      '## Run',
      '  pytest                       # runs all tests, writes reports/report.html',
      '  HEADLESS=true pytest         # headless run (set BASE_URL=... to override target)',
      '',
      '## Extend',
      '  1. Add one page class per screen under pages/ (extend BasePage).',
      '  2. Add one test module per feature under tests/.',
      '  3. Keep locators in page objects, assertions in tests.'
    ]));

    return blocks.join('\n\n');
}

function buildPlaywrightUiAutomation(targets) {
    const baseUrl = targets.urls[0] || targets.baseUrl || 'http://localhost:3000';
    const blocks = [];

    blocks.push(automationTreeBlock('Complete Playwright hybrid framework — copy this structure into a new project:', [
      'playwright-hybrid-framework/',
      '├── package.json',
      '├── playwright.config.js      # browsers, baseURL, reporter, retries',
      '├── README.md',
      '├── pages',
      '│   ├── base.page.js          # shared page-object helpers',
      '│   └── application.page.js   # page under test (extend per screen)',
      '├── fixtures',
      '│   └── test-fixtures.js      # injects page objects into tests',
      '├── data',
      '│   └── testdata.json',
      '└── tests',
      '    └── positive-ui-flow.spec.js'
    ]));

    blocks.push(automationFileBlock('package.json', 'json', [
      '{',
      '  "name": "playwright-hybrid-framework",',
      '  "version": "1.0.0",',
      '  "scripts": {',
      '    "test": "playwright test",',
      '    "test:headed": "playwright test --headed",',
      '    "report": "playwright show-report"',
      '  },',
      '  "devDependencies": {',
      '    "@playwright/test": "^1.44.0"',
      '  }',
      '}'
    ]));

    blocks.push(automationFileBlock('playwright.config.js', 'javascript', [
      "const { defineConfig, devices } = require('@playwright/test');",
      '',
      'module.exports = defineConfig({',
      "  testDir: './tests',",
      '  retries: 1,',
      "  reporter: [['html', { open: 'never' }], ['list']],",
      '  use: {',
      `    baseURL: process.env.BASE_URL || ${jsStringLiteral(baseUrl)},`,
      "    screenshot: 'only-on-failure',",
      "    trace: 'retain-on-failure',",
      '  },',
      '  projects: [',
      "    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },",
      '  ],',
      '});'
    ]));

    blocks.push(automationFileBlock('pages/base.page.js', 'javascript', [
      'class BasePage {',
      '  constructor(page) {',
      '    this.page = page;',
      '  }',
      '',
      '  async goto(path = \'/\') {',
      '    await this.page.goto(path);',
      '  }',
      '',
      '  async clickWhenReady(locator) {',
      '    await locator.waitFor({ state: \'visible\' });',
      '    await locator.click();',
      '  }',
      '}',
      '',
      'module.exports = { BasePage };'
    ]));

    blocks.push(automationFileBlock('pages/application.page.js', 'javascript', [
      "const { BasePage } = require('./base.page');",
      '',
      'class ApplicationPage extends BasePage {',
      '  constructor(page) {',
      '    super(page);',
      '    // Replace with the real locator from the PRD / screenshot under test.',
      "    this.primaryAction = page.locator(\"button[type='submit'], button, [role='button']\").first();",
      '  }',
      '',
      '  async completePositiveFlow() {',
      '    await this.clickWhenReady(this.primaryAction);',
      '  }',
      '}',
      '',
      'module.exports = { ApplicationPage };'
    ]));

    blocks.push(automationFileBlock('fixtures/test-fixtures.js', 'javascript', [
      "const base = require('@playwright/test');",
      "const { ApplicationPage } = require('../pages/application.page');",
      '',
      'exports.test = base.test.extend({',
      '  applicationPage: async ({ page }, use) => {',
      '    await use(new ApplicationPage(page));',
      '  },',
      '});',
      'exports.expect = base.expect;'
    ]));

    blocks.push(automationFileBlock('data/testdata.json', 'json', [
      '{',
      '  "validUser": {',
      '    "username": "user@example.com",',
      '    "password": "ChangeMe123"',
      '  }',
      '}'
    ]));

    blocks.push(automationFileBlock('tests/positive-ui-flow.spec.js', 'javascript', [
      "const { test, expect } = require('../fixtures/test-fixtures');",
      '',
      "test.describe('Positive UI hybrid automation', () => {",
      "  test('verifies positive UI flow based on PRD or screenshot', async ({ page, applicationPage }) => {",
      "    await page.goto('/');",
      '    await applicationPage.completePositiveFlow();',
      "    await expect(page.locator('body')).toBeVisible();",
      '  });',
      '});'
    ]));

    blocks.push(automationFileBlock('README.md', 'text', [
      '# Playwright Hybrid Framework',
      '',
      '## Setup',
      '  npm install',
      '  npx playwright install',
      '',
      '## Run',
      '  npm test           # headless, generates HTML report',
      '  npm run test:headed',
      '  npm run report     # open the last HTML report',
      '',
      '## Extend',
      '  1. Add one page class per screen under pages/ (extend BasePage).',
      '  2. Expose it through fixtures/test-fixtures.js.',
      '  3. Add one spec per feature under tests/.'
    ]));

    return blocks.join('\n\n');
}

function buildUiAutomationSection(targets, language) {
    const meta = getAutomationLanguageMeta(language);
    const script = meta.key === 'python'
      ? buildPythonUiAutomation(targets)
      : meta.key === 'playwright'
        ? buildPlaywrightUiAutomation(targets)
        : buildJavaUiAutomation(targets);
    return [
      '### UI Hybrid Automation Framework',
      `- Selected framework: ${meta.uiFramework}.`,
      '- The complete, ready-to-run project is generated below: folder tree, build/config files, driver factory, BasePage + page objects, utilities, reporting/listeners, test data, and a sample positive UI test.',
      '- Copy each file into the path shown above it, then follow the README to run and extend it.',
      '- Selectors live in the page objects and assertions live in the tests, so the structure stays clean and reusable.',
      '',
      script
    ].join('\n');
}

function buildSmartAutomationOutput(inputSource, aiData, language) {
    const targets = detectAutomationTargets(inputSource, aiData);
    const meta = getAutomationLanguageMeta(language);
    const sections = [
      '### Automation Scope',
      `- Selected language: ${meta.label}.`,
      `- API body detected: ${targets.hasApiBody ? 'Yes' : 'No'}.`,
      `- API endpoints detected: ${targets.apiEndpoints.length}.`,
      `- UI or web flow detected: ${targets.hasUi ? 'Yes' : 'No'}.`
    ];

    if (targets.hasApi) sections.push('', buildApiAutomationSection(targets, language));
    if (targets.hasUi || !targets.hasApi) sections.push('', buildUiAutomationSection(targets, language));

    if (aiData && aiData.automation && String(aiData.automation).trim()) {
      sections.push(
        '',
        '### AI Automation Notes',
        '- These notes came from the model output and are kept below the deterministic framework.',
        '',
        automationCodeBlock(meta.codeLang, [String(aiData.automation).trim()])
      );
    }

    return sections.join('\n');
}

function renderAutomationText(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let listOpen = false;

    lines.forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) {
        if (listOpen) {
          html += '</ul>';
          listOpen = false;
        }
        return;
      }
      if (/^[-*]\s+/.test(line)) {
        if (!listOpen) {
          html += '<ul class="automation-bullets">';
          listOpen = true;
        }
        html += `<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`;
        return;
      }
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      if (/^📄\s+/.test(line)) {
        html += `<p class="automation-file-path">${escapeHtml(line.replace(/^📄\s+/, ''))}</p>`;
        return;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    });

    if (listOpen) html += '</ul>';
    return html;
}

function renderAutomationBody(text) {
    const source = String(text || '');
    const parts = [];
    const fencePattern = /```([A-Za-z0-9_+-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = fencePattern.exec(source)) !== null) {
      const before = source.slice(lastIndex, match.index);
      if (before.trim()) parts.push(renderAutomationText(before));
      const lang = match[1] || 'code';
      const code = match[2] || '';
      parts.push(`<div class="automation-code-shell">
        <div class="automation-code-toolbar">
          <span class="automation-dot red"></span>
          <span class="automation-dot amber"></span>
          <span class="automation-dot green"></span>
          <span class="automation-file-label">${escapeHtml(lang.toUpperCase())}</span>
        </div>
        <pre class="automation-code"><code>${escapeHtml(code)}</code></pre>
      </div>`);
      lastIndex = fencePattern.lastIndex;
    }

    const after = source.slice(lastIndex);
    if (after.trim()) parts.push(renderAutomationText(after));
    return parts.join('');
}

function renderAutomationSections(text) {
    const chunks = String(text || '').trim().split(/\n(?=###\s+)/).filter(Boolean);
    const sectionColors = ['#06b6d4', '#f97316', '#22c55e', '#7c3aed', '#ec4899'];
    return (chunks.length ? chunks : [String(text || '')]).map((chunk, index) => {
      const lines = chunk.split('\n');
      const first = lines[0] || '';
      const title = first.startsWith('### ') ? first.replace(/^###\s+/, '').trim() : `Automation Block ${index + 1}`;
      const body = first.startsWith('### ') ? lines.slice(1).join('\n') : chunk;
      const color = sectionColors[index % sectionColors.length];
      return `<section class="automation-section" style="--automation-section-color:${color}">
        <div class="automation-section-title">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${escapeHtml(title)}</strong>
        </div>
        <div class="automation-section-body">${renderAutomationBody(body)}</div>
      </section>`;
    }).join('');
}

function renderLegacyDynamicAutomation(text, language) {
    if (!text) return '<div style="padding:20px;color:#64748b;font-weight:700">No Automation Scripts generated.</div>';
    let codeStr = text.trim();
    if (codeStr.startsWith('\`\`\`')) {
        let lines = codeStr.split('\n');
        lines.shift();
        if (lines[lines.length-1].startsWith('\`\`\`')) lines.pop();
        codeStr = lines.join('\n');
    }
    codeStr = codeStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let accentColor = language === 'python' ? '#3b82f6' : language === 'playwright' ? '#8b5cf6' : '#f59e0b';
    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${accentColor}40;padding-bottom:14px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="background:linear-gradient(135deg,${accentColor},${accentColor}99);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🤖</div>
          <div>
            <div style="font-size:1.3rem;font-weight:900;color:#14213a">AI Generated Scripts</div>
            <div style="font-size:0.72rem;color:#6b7f96">Target Language: ${language.toUpperCase()}</div>
          </div>
        </div>
      </div>
      <pre style="margin:0;padding:20px 24px;font-family:Consolas,'Courier New',monospace;font-size:0.8rem;line-height:1.7;overflow:auto;max-height:450px;background:#f8fafc;border:1px solid #d9e2ec;border-radius:10px;color:#14213a">${codeStr}</pre>
    </div>`;
}

function renderDynamicAutomation(text, language) {
    if (!text) return '<div style="padding:20px;color:#64748b;font-weight:700">No Automation Scripts generated.</div>';
    const meta = getAutomationLanguageMeta(language);
    const source = String(text || '').trim();
    const hasApi = /API Positive Automation|Positive API automation|Rest Assured|requests\.request|request\.fetch/i.test(source);
    const hasUi = /UI Hybrid Automation|Selenium|Playwright|Page Object|Positive UI/i.test(source);
    const chipText = [hasApi ? 'API positive scripts' : null, hasUi ? 'UI hybrid framework' : null, meta.short].filter(Boolean);

    return `<div class="automation-output automation-output-${meta.key}" style="--automation-accent:${meta.accent};--automation-soft:${meta.soft}">
      <div class="automation-hero">
        <div class="automation-mark">${escapeHtml(meta.short)}</div>
        <div class="automation-heading">
          <div class="automation-kicker">Automation Scripts</div>
          <h3>${escapeHtml(meta.label)}</h3>
          <p>API bodies create positive API automation. UI and web flows create a selected hybrid framework.</p>
        </div>
        <div class="automation-chip-row">
          ${chipText.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
      <div class="automation-concept-grid">
        <div><strong>Detection</strong><span>API body, endpoint, URL, or UI/web flow</span></div>
        <div><strong>API Rule</strong><span>Positive functionality for every detected API</span></div>
        <div><strong>UI Rule</strong><span>Hybrid framework by selected language</span></div>
      </div>
      <div class="automation-sections">${renderAutomationSections(source)}</div>
    </div>`;
}

async function startJsonGeneration(problem) {
  generatedData = {};
  showProcessingOverlay('Please wait. eMudhra QA-Gen AI is generating the JSON test suite...');
  const _jfg = $('featureGrid');     if (_jfg) _jfg.style.display = 'grid';
  const _josg = $('outputStatsGrid'); if (_josg) _josg.style.display = 'grid';
  const _joa = $('outputArea');      if (_joa) _joa.style.display = 'block';
  const _jol = $('outputLoading');   if (_jol) _jol.style.display = 'flex';
  const _jos = $('outputStream');    if (_jos) _jos.innerHTML = '';

  ['planStatus', 'tcCountDisplay', 'covCountDisplay', 'autoCountDisplay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  document.querySelectorAll('.out-tab').forEach(function(t) { t.classList.remove('active'); });
  var jsonTab = document.querySelector('.out-tab[data-tab="json_suite"]');
  if (jsonTab) jsonTab.classList.add('active');

  var stepEl = document.getElementById('loadingStep');
  if (stepEl) stepEl.textContent = 'eMudhra QA engine is building the JSON test suite...';

  try {
     const models = AppState.models;
     const engineSelector = document.getElementById('selectedModel');
     const activeEngine = engineSelector ? engineSelector.value : 'ollama';

     const config = {
        current: activeEngine,
        data: models.data || models
     };

     let result = null;
     let aiSucceeded = false;
     try {
       result = await AIEngine.generateJSON(problem, config);
       aiSucceeded = true;
     } catch (aiErr) {
       // Auth/config errors always surface to the user
       if (/API key missing|configure/i.test(aiErr.message)) throw aiErr;
       console.warn('JSON Suite AI generation failed, using local fallback:', aiErr);
       showToast('AI model returned invalid JSON — rendering local test suite fallback.', 'warning', 5000);
     }

     document.getElementById('outputLoading').style.display = 'none';

     let totalCases = 0;
     if (aiSucceeded && result && Array.isArray(result.testCases) && result.testCases.length > 0) {
        const tableText = result.testCases.join('\n');
        const tcRes = renderDynamicTestCases(tableText);
        generatedData.json_suite = tcRes.html;
        totalCases = tcRes.count;
     } else if (aiSucceeded && result) {
        generatedData.json_suite = renderDynamicJSON(result);
        totalCases = (result.basic?.length || 0) + (result.edge?.length || 0) + (result.invalid?.length || 0) + (result.stress?.length || 0);
     } else {
        // Local fallback: generate enterprise test cases from the PRD text without AI
        const fallbackRows = buildEnterpriseScenarioRows(problem);
        const tcRes = fallbackRows.length > 0
          ? renderDynamicTestCases(enterpriseRowsToMarkdown(fallbackRows))
          : { html: renderLocalJSONFallback(problem), count: 0 };
        generatedData.json_suite = tcRes.html;
        totalCases = tcRes.count || 0;
     }

     setText('planStatus', 'JSON-Ready');
     setText('tcCountDisplay', totalCases + ' cases');
     setText('covCountDisplay', aiSucceeded ? (Array.isArray(result && result.testCases) ? 'Enterprise table' : '4 categories') : 'Local analysis');
     setText('autoCountDisplay', 'JSON');

     persistGeneratedOutput(problem);
     updateOutputTabs('json_suite');
     typewriterRender('outputStream', generatedData.json_suite);

     AppState.addLog('JSON Suite Generated Successfully', 'generation');
     showSuccessPopup('JSON Suite Generated', aiSucceeded ? 'Your JSON test suite is ready for review and export.' : 'Generated from local PRD analysis — configure an AI model for richer output.');
  } catch (err) {
     document.getElementById('outputLoading').style.display = 'none';
     hideProcessingOverlay();
     showToast(err.message, 'error');
     console.error(err);
  }
}

function renderDynamicJSON(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const highlighted = jsonStr
        .replace(/"(.*?)"(?=:)/g, '<span style="color:#3b82f6">"$1"</span>') // keys
        .replace(/:(.*?)(?=[,\n]|$)/g, (m, p1) => { // values
            if (p1.includes('"')) return ': <span style="color:#10b981">' + p1 + '</span>';
            if (p1.includes('true') || p1.includes('false')) return ': <span style="color:#f59e0b">' + p1 + '</span>';
            return ': <span style="color:#ef4444">' + p1 + '</span>';
        });

    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #f59e0b40;padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">📦</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">Strict JSON Test Suite</div>
          <div style="font-size:0.72rem;color:#6b7f96">Validated JSON Format for API Integration</div>
        </div>
      </div>
      <pre style="margin:0;padding:14px;font-family:'Consolas',monospace;font-size:0.76rem;line-height:1.35;overflow:auto;max-height:calc(100vh - var(--topbar-h) - 190px);background:#0d1624;border:1px solid #1e293b;border-radius:12px;color:#e2e8f0">${highlighted}</pre>
    </div>`;
}

// Local fallback JSON renderer — used when AI fails to return valid JSON.
// Generates a minimal but useful JSON test suite stub based on extracted keywords.
function renderLocalJSONFallback(inputText) {
    const text = String(inputText || '');
    const words = text.toLowerCase();

    const modules = [];
    if (words.includes('login') || words.includes('authentication') || words.includes('auth')) modules.push('Authentication');
    if (words.includes('register') || words.includes('signup') || words.includes('onboard')) modules.push('Registration');
    if (words.includes('password') || words.includes('reset')) modules.push('Password Management');
    if (words.includes('otp') || words.includes('one time password')) modules.push('OTP Verification');
    if (words.includes('payment') || words.includes('transfer') || words.includes('transaction')) modules.push('Payments & Transactions');
    if (words.includes('account') || words.includes('balance') || words.includes('statement')) modules.push('Account Management');
    if (words.includes('profile') || words.includes('kyc') || words.includes('user')) modules.push('User Profile');
    if (words.includes('notification') || words.includes('alert') || words.includes('sms')) modules.push('Notifications');
    if (modules.length === 0) modules.push('Core Functionality');

    const fallbackCases = [];
    let tcIdx = 1;
    modules.forEach(mod => {
        [
            ['Valid inputs', 'Positive', 'High', 'Critical'],
            ['Missing required fields', 'Negative', 'High', 'High'],
            ['Invalid data format', 'Negative', 'Medium', 'High'],
            ['Boundary values', 'Boundary', 'Medium', 'Medium'],
            ['Unauthorized access', 'Security', 'High', 'Critical'],
        ].forEach(([scenario, type, priority, severity]) => {
            fallbackCases.push({
                id: `TC-${String(tcIdx++).padStart(3, '0')}`,
                module: mod,
                scenario: `${type} — ${mod}`,
                title: `${scenario} for ${mod}`,
                priority, severity,
                steps: `1. Navigate to ${mod}. 2. Perform ${scenario.toLowerCase()} test. 3. Verify response.`,
                expected: type === 'Positive' ? 'Operation succeeds with valid response' : 'Appropriate error message displayed',
                automationStatus: 'Candidate'
            });
        });
    });

    const jsonOutput = {
        generatedBy: 'Local PRD Analysis (AI fallback)',
        modules: modules,
        testCaseCount: fallbackCases.length,
        testCases: fallbackCases
    };

    const highlighted = JSON.stringify(jsonOutput, null, 2)
        .replace(/"(.*?)"(?=:)/g, '<span style="color:#3b82f6">"$1"</span>')
        .replace(/: "(.*?)"/g, ': <span style="color:#10b981">"$1"</span>')
        .replace(/: (true|false)/g, ': <span style="color:#f59e0b">$1</span>');

    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #f59e0b40;padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">📦</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">JSON Test Suite — Local Analysis</div>
          <div style="font-size:0.72rem;color:#f59e0b">Generated from PRD keyword analysis · ${fallbackCases.length} test stubs · Configure AI model for full enterprise output</div>
        </div>
      </div>
      <pre style="margin:0;padding:14px;font-family:'Consolas',monospace;font-size:0.76rem;line-height:1.35;overflow:auto;max-height:calc(100vh - var(--topbar-h) - 190px);background:#0d1624;border:1px solid #1e293b;border-radius:12px;color:#e2e8f0">${highlighted}</pre>
    </div>`;
}

function buildBrightFallbackTestCasesHTML(cases) {
  const rows = cases.map((c, idx) => {
    const values = [
      c.id,
      c.mod,
      c.story,
      c.sc,
      c.desc,
      c.prio,
      c.sev,
      c.pre,
      c.data,
      c.steps,
      c.exp,
      c.act || 'Not Executed',
      c.status === 'Not Started' ? 'Not Run' : c.status,
      'QA',
      'Chrome / Desktop',
      c.rem || 'System state remains consistent after execution.',
      'TBD',
      'TBD',
      c.dep || 'N/A',
      c.type === 'Functional' ? 'Candidate' : 'Manual',
      'N/A'
    ];
    return `<tr>${values.map((value, colIdx) => {
      const isId = colIdx === 0;
      const bg = isId ? '#fef3c7' : (idx % 2 === 0 ? '#ffffff' : '#f1f5f9');
      const weight = isId ? 950 : 900;
      return `<td style="border:1px solid #cbd5e1;background:${bg};color:#020617 !important;padding:10px 12px;font-size:0.8rem;font-weight:${weight};line-height:1.55;vertical-align:top;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal">${escapeHtml(value)}</td>`;
    }).join('')}</tr>`;
  }).join('');

  return `<div class="bright-output-text" style="font-family:'Outfit',sans-serif;color:#020617">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(16,185,129,0.55);padding-bottom:14px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">TC</div>
        <div>
          <div style="font-size:1.28rem;font-weight:950;color:#020617">Generated Test Cases</div>
          <div style="font-size:0.78rem;color:#334155;font-weight:900">${cases.length} cases | Enterprise 21-field QA format</div>
        </div>
      </div>
    </div>
    <div class="test-case-table-wrap">
      <table class="test-case-table" style="border-collapse:separate;border-spacing:0;font-family:'Inter',sans-serif">
        ${buildTestCaseColGroup()}
        <thead>
          <tr>${TEST_CASE_COLUMNS.map(h => `<th style="position:sticky;top:0;z-index:2;background:#14213a;color:#ffffff !important;border:1px solid #64748b;padding:12px 14px;text-align:left;font-size:0.78rem;font-weight:950;white-space:nowrap">${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function finalizeGeneration(inputSource, aiData) {
  aiData = ensureEnterpriseTestCaseCoverage(inputSource, aiData);
  var autoLangEl = document.getElementById('autoLangSelect');
  var autoLang = autoLangEl ? autoLangEl.value : 'java';
  var displayTitle = inputSource.length > 50 ? inputSource.substring(0, 50) + '...' : inputSource;

  var planStatus = document.getElementById('planStatus');
  var tcCount    = document.getElementById('tcCountDisplay');
  var covCount   = document.getElementById('covCountDisplay');
  var autoCount  = document.getElementById('autoCountDisplay');
  
  // Extract actual counts from generated data
  let actualTcCount = 0;
  let actualScenCount = 0;

  if (aiData && aiData.testCases) {
      const tcRes = renderDynamicTestCases(aiData.testCases);
      generatedData.testcases = tcRes.html;
      actualTcCount = tcRes.count;
  } else if (aiData) {
      generatedData.testcases = `<div class="bright-output-text" style="padding:22px;border:1px solid #fed7aa;border-left:5px solid #f26a21;border-radius:10px;background:#fff7ed;color:#020617;font-weight:900;line-height:1.6">
        No enterprise test case table was found in the AI response. Please regenerate, or check that the PRD contains enough functional/API/UI detail for test case creation.
      </div>`;
      actualTcCount = 0;
  } else {
      generatedData.testcases = generateTestCasesHTML();
      actualTcCount = 3; 
  }

  if (aiData && aiData.conversational) {
      generatedData.prd_analysis = `<div style="padding:24px; font-family:'Inter', sans-serif; font-size:1rem; color:#020617; line-height:1.7;font-weight:850;">${escapeHtml(aiData.conversational).replace(/\n/g, '<br>')}</div>`;
      delete generatedData.automation;
  } else if (aiData && (aiData.prdAnalysis || aiData.testPlan || aiData.testCases)) {
      generatedData.prd_analysis = renderDynamicTestPlan(
        aiData.prdAnalysis || aiData.testPlan,
        '1. PRD Analysis Summary',
        'Product type, objectives, users, workflows, requirements, and components',
        'PA'
      );
      generatedData.gap_analysis = renderDynamicTestPlan(
        aiData.gapAnalysis,
        '2. Requirement Gap Analysis',
        'Missing requirements, ambiguous rules, validation gaps, API contracts, and UX recommendations',
        'GA'
      );
      generatedData.test_strategy = renderDynamicTestPlan(
        aiData.testStrategy,
        '3. Test Strategy',
        'Functional, validation, API, UI, UX, integration, database, exploratory, and black-box coverage',
        'TS'
      );
      generatedData.risk_assessment = renderDynamicTestPlan(
        aiData.riskAssessment,
        '4. Risk Assessment',
        'Business, technical, integration, operational, and validation risks',
        'RA'
      );
      generatedData.coverage_matrix = renderDynamicTestPlan(
        aiData.coverageMatrix,
        '6. Coverage Matrix',
        'Requirement, component, risk, and test case traceability',
        'CM'
      );
      if (aiData.automation && aiData.automation.trim()) {
        generatedData.automation = renderDynamicAutomation(aiData.automation, autoLang);
      } else {
        delete generatedData.automation;
      }
  } else {
      generatedData.prd_analysis = generateTestPlanHTML();
      generatedData.gap_analysis = renderDynamicTestPlan('No requirement gap analysis generated yet.', '2. Requirement Gap Analysis', 'Run PRD analysis to populate this section.', 'GA');
      generatedData.test_strategy = renderDynamicTestPlan('No test strategy generated yet.', '3. Test Strategy', 'Run PRD analysis to populate this section.', 'TS');
      generatedData.risk_assessment = renderDynamicTestPlan('No risk assessment generated yet.', '4. Risk Assessment', 'Run PRD analysis to populate this section.', 'RA');
      generatedData.coverage_matrix = renderDynamicTestPlan('No coverage matrix generated yet.', '6. Coverage Matrix', 'Run PRD analysis to populate this section.', 'CM');
      generatedData.automation = generateAutomationHTML(autoLang);
  }

  if (automationEnabled && !(aiData && aiData.conversational)) {
      generatedData.automation = renderDynamicAutomation(buildSmartAutomationOutput(inputSource, aiData, autoLang), autoLang);
  } else {
      delete generatedData.automation;
  }

  if (planStatus) planStatus.textContent = aiData ? 'AI-Verified' : 'Drafted';
  if (tcCount)    tcCount.textContent    = actualTcCount + ' cases';
  if (covCount)   covCount.textContent   = [generatedData.gap_analysis ? 'Gaps' : null, generatedData.test_strategy ? 'Strategy' : null].filter(Boolean).join(' + ') || 'Pending';
  if (autoCount)  autoCount.textContent  = automationEnabled && hasMeaningfulOutput('automation') ? autoLang.toUpperCase() : 'Disabled';

  // Show/hide Automation tab based on toggle
  const autoTab = document.getElementById('automationTab');
  if (autoTab) autoTab.style.display = automationEnabled ? '' : 'none';
  if (!automationEnabled) {
    delete generatedData.automation;
  }

  AppState.addLog('Deep Analysis Complete: ' + displayTitle.substring(0, 25) + '...', 'generation');
  AppState.addHistory({ title: displayTitle, completed: true });
  AppState.addProject(displayTitle, aiData ? 'Deeply Analyzed' : 'Analyzed');
  if (typeof renderHistoryPanel === 'function') renderHistoryPanel();

  localStorage.setItem('qa_gen_prd_pct', aiData ? '99' : '92');
  localStorage.setItem('qa_gen_tc_pct', aiData ? '97' : '88');
  persistGeneratedOutput(inputSource);
  updateOutputTabs('prd_analysis');

  typewriterRender('outputStream', generatedData.prd_analysis);

  // Auto-push to Jira if configured
  if (aiData && typeof AppState !== 'undefined' && AppState.integrations.jira?.connected) {
      showToast('Auto-syncing assets to Jira...', 'info');
      const ticketPayload = {
          title: displayTitle.replace(/\n/g, ' '),
          testPlan: aiData.testPlan || aiData.prdAnalysis,
          gapAnalysis: aiData.gapAnalysis,
          testStrategy: aiData.testStrategy,
          riskAssessment: aiData.riskAssessment,
          testCases: aiData.testCases,
          coverageMatrix: aiData.coverageMatrix,
          automation: aiData.automation
      };
      
      AIEngine.pushToJira(ticketPayload, AppState.integrations.jira)
          .then(res => {
              showToast(`Jira Ticket Auto-Created: ${res.key}`, 'success', 6000);
              AppState.addLog(`Jira Ticket Synced: ${res.key}`, 'integration');
          })
          .catch(err => {
              showToast(`Jira Sync Blocked: ${err.message}`, 'error', 6000);
              console.error('Jira Auto-Push Error', err);
          });
  }
}

// ===== CONTENT GENERATORS =====

function generateTestPlanHTML() {
  var date = new Date().toLocaleDateString('en-GB');
  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(59,130,246,0.3);padding-bottom:14px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">📋</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">Master Test Plan</div>
        <div style="font-size:0.72rem;color:#6b7f96">RICEPOT Analysis + BLAST Framework — Generated ${date}</div>
      </div>
    </div>

    <div class="qa-plan-output">
    <!-- Executive Summary -->
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.06));border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:18px;margin-bottom:16px;border-left:4px solid #3b82f6">
      <div style="font-size:0.78rem;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📌 1. Executive Summary</div>
      <p style="color:#a8b8cc;font-size:0.85rem;line-height:1.7">This Test Plan outlines the comprehensive testing strategy derived from the provided PRD. The strategy employs the <strong style="color:#3b82f6">RICEPOT</strong> analysis methodology combined with the <strong style="color:#8b5cf6">BLAST</strong> test design framework to ensure maximum coverage across functional, non-functional, and integration boundaries.</p>
    </div>

    <!-- RICEPOT Assessment -->
    <div style="background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(6,182,212,0.04));border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:18px;margin-bottom:16px;border-left:4px solid #06b6d4">
      <div style="font-size:0.78rem;font-weight:800;color:#06b6d4;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">🔬 2. RICEPOT Deep Assessment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['R','Requirements','3b82f6','All core functional & non-functional requirements mapped and verified against acceptance criteria.'],
           ['I','Interfaces','8b5cf6','Web/UI components, REST endpoints, and WebSocket integrations identified and documented.'],
           ['C','Constraints','f59e0b','File format restrictions, login domain enforcement, rate limits and browser compatibility verified.'],
           ['E','Errors','ef4444','Negative boundaries, exception paths and injection attack vectors included in scope.'],
           ['P','Performance','10b981','Page load targets set to &lt;2000ms; API response time thresholds benchmarked.'],
           ['O','Operations','06b6d4','End-to-end workflow: Login → Dashboard → PRD Upload → Output → Export mapped completely.'],
           ['T','Testability','c9a84c','Unique DOM locators (IDs, data-* attrs) confirmed available for Automation tooling.']]
           .map(([letter,label,color,desc]) => `<div style="background:rgba(${letter==='R'?'59,130,246':letter==='I'?'139,92,246':letter==='C'?'245,158,11':letter==='E'?'239,68,68':letter==='P'?'16,185,129':letter==='O'?'6,182,212':'201,168,76'},0.07);border:1px solid rgba(${letter==='R'?'59,130,246':letter==='I'?'139,92,246':letter==='C'?'245,158,11':letter==='E'?'239,68,68':letter==='P'?'16,185,129':letter==='O'?'6,182,212':'201,168,76'},0.2);border-radius:8px;padding:10px">
             <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
               <span style="width:22px;height:22px;border-radius:6px;background:#${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.7rem;color:#0a1628">${letter}</span>
               <span style="font-weight:700;font-size:0.8rem;color:#f0f4f8">${label}</span>
             </div>
             <div style="font-size:0.75rem;color:#a8b8cc;line-height:1.6">${desc}</div>
           </div>`)
           .join('')}
      </div>
    </div>

    <!-- Scope -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:18px;border-left:4px solid #10b981">
        <div style="font-size:0.78rem;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">✅ 3. In-Scope</div>
        ${['Authentication & Domain Validation','Dashboard Analytics Rendering','PRD Upload & Parsing Workflow','AI Model Integration (Mistral/DeepSeek/Gemini)','Token Management System','Export & Report Generation'].map(i=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.8rem;color:#a8b8cc"><span style="color:#10b981;font-weight:900">✓</span>${i}</div>`).join('')}
      </div>
      <div style="background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.04));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:18px;border-left:4px solid #ef4444">
        <div style="font-size:0.78rem;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🚫 4. Out-of-Scope</div>
        ${['Infrastructure / DevOps provisioning','Database administration tasks','Third-party vendor SLAs','Mobile native applications (iOS/Android)'].map(i=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.8rem;color:#a8b8cc"><span style="color:#ef4444;font-weight:900">✗</span>${i}</div>`).join('')}
      </div>
    </div>

    <!-- Environment -->
    <div style="background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.04));border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:18px;border-left:4px solid #c9a84c">
      <div style="font-size:0.78rem;font-weight:800;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🖥️ 5. Test Environment</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${[['QA Env','https://qa.emudhra.internal','3b82f6'],['Browsers','Chrome 120+, Edge 120+, Safari 17','8b5cf6'],['Test Data','Seeded Active Directory Users','10b981'],['OS','Windows 11, macOS Ventura','f59e0b'],['Network','Internal 100 Mbps LAN','06b6d4'],['Tools','Selenium 4.x, TestNG, Maven','c9a84c']]
           .map(([label,val,color])=>`<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:10px">
             <div style="font-size:0.68rem;color:#6b7f96;font-weight:700;margin-bottom:3px">${label}</div>
             <div style="font-size:0.78rem;color:#${color};font-weight:600">${val}</div>
           </div>`).join('')}
      </div>
    </div>
    </div>
  </div>`;
}

function generateScenariosHTML() {
  var blastItems = [
    { letter: 'B', color: '59,130,246', label: 'Business Flow', emoji: '💼', desc: 'End-to-End User Journeys',
      scenarios: [
        'Valid enterprise user logs in with @emudhra.com credentials and navigates to Dashboard.',
        'User uploads a PRD document and successfully triggers AI-based test generation.',
        'User updates LLM settings in the Settings panel and exports generated test cases.'
      ]},
    { letter: 'L', color: '139,92,246', label: 'Logic Coverage', emoji: '🔁', desc: 'Decision Points & Validations',
      scenarios: [
        'Verify file upload rejects .exe and .bat but accepts .pdf, .docx, .xlsx.',
        'Verify only @emudhra.com domain emails trigger successful authentication.',
        'Verify zero-token state correctly disables the Analyze PRD button.'
      ]},
    { letter: 'A', color: '6,182,212', label: 'API & Integration', emoji: '🔌', desc: 'REST & LLM Connectivity',
      scenarios: [
        'Disconnect Mistral and verify fallback connection to DeepSeek API activates.',
        'Verify generated test plans export valid payloads to TestRail/JIRA endpoints.',
        'Validate Gemini API response is parsed and rendered correctly in all tabs.'
      ]},
    { letter: 'S', color: '239,68,68', label: 'Stability', emoji: '🛡️', desc: 'Negative & Recovery Tests',
      scenarios: [
        'Enter unsupported text in the PRD input and verify a clear validation message is shown.',
        'Refresh the page during generation and verify the app recovers without duplicate output.',
        'Submit an invalid username value and verify normal validation appears.'
      ]},
    { letter: 'T', color: '16,185,129', label: 'Technology / UI', emoji: '🖥️', desc: 'Rendering & Responsiveness',
      scenarios: [
        'Verify tabular output scrolls gracefully in horizontal container on screens <768px.',
        'Verify labels, buttons, and generated table text remain readable in the selected theme.',
        'Verify animation and spinner loads correctly when LLM call is in progress.'
      ]}
  ];

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(201,168,76,0.3);padding-bottom:14px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#f59e0b,#c9a84c);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🗂</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">BLAST Test Scenarios</div>
        <div style="font-size:0.72rem;color:#6b7f96">Derived from RICEPOT analysis — 5 categories, 15 scenarios</div>
      </div>
    </div>
    
    <div class="qa-plan-output">
    ${blastItems.map(item => `
    <div style="background:rgba(${item.color},0.06);border:1px solid rgba(${item.color},0.25);border-radius:12px;padding:18px;margin-bottom:14px;border-left:4px solid rgba(${item.color},1)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="width:34px;height:34px;border-radius:10px;background:rgba(${item.color},0.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">${item.emoji}</span>
        <div>
          <div style="font-weight:800;color:#f0f4f8;font-size:0.92rem"><span style="color:rgba(${item.color},1);font-size:1rem">${item.letter}</span> — ${item.label}</div>
          <div style="font-size:0.7rem;color:#6b7f96">${item.desc}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${item.scenarios.map((sc, idx) => `
        <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 12px">
          <span style="width:22px;height:22px;border-radius:6px;background:rgba(${item.color},0.25);color:rgba(${item.color},1);font-weight:800;font-size:0.7rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${idx+1}</span>
          <span style="font-size:0.82rem;color:#a8b8cc;line-height:1.6">${sc}</span>
        </div>`).join('')}
      </div>
    </div>`).join('')}
    </div>
  </div>`;
}

function generateTestCasesHTML() {
  var cases = [
    { id:'TC-LOGIN-001', story:'Assumed Login Functionality', sc:'Valid Login — B (Business Flow)', desc:'Verify that a valid enterprise user can login successfully.', pre:'User is on login screen', steps:'1. Navigate to http://127.0.0.1:5500\n2. Enter admin@emudhra.com\n3. Enter password admin123\n4. Click Login button', data:'admin@emudhra.com / admin123', exp:'Dashboard renders; URL changes to /dashboard.html', act:'', status:'Not Started', prio:'High', sev:'Critical', type:'Functional', persona:'End User', mod:'Login Page', dep:'Network Connectivity', rem:'B - Business Flow' },
    { id:'TC-LOGIN-002', story:'Assumed Domain Validation', sc:'Invalid Domain - L (Logic Coverage)', desc:'Verify that non-enterprise domains are rejected.', pre:'User is on login screen', steps:'1. Enter user@gmail.com\n2. Enter any password\n3. Click Login', data:'user@gmail.com', exp:'Error: "User not registered" displayed. No navigation.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Data Validation', persona:'External User', mod:'Login Page', dep:'None', rem:'L - Logic Coverage' },
    { id:'TC-HOME-001', story:'Assumed PRD Parsing', sc:'Valid File Upload — T (Technology/UI)', desc:'Verify PRD upload and preview functionality.', pre:'Valid session & token > 0', steps:'1. Click Attach File\n2. Select a .pdf PRD document\n3. Observe preview panel', data:'test_prd.pdf', exp:'File preview displayed with name and size; Analyze PRD enabled', act:'', status:'Not Started', prio:'High', sev:'Major', type:'UI/UX', persona:'Admin', mod:'Home Page', dep:'Session Active', rem:'T - Technology/UI' }
  ];

  cases = cases.concat([
    { id:'TC-LOGIN-003', story:'Assumed Login Validation', sc:'Mandatory Email Missing - L (Logic Coverage)', desc:'Verify email/user id required-field validation.', pre:'User is on login screen', steps:'1. Leave email field blank\n2. Enter valid password\n3. Click Login', data:'email: "" / password: admin123', exp:'Inline required-field error is displayed. Login request is not submitted. No session is created.', act:'', status:'Not Started', prio:'High', sev:'Major', type:'Data Validation', persona:'End User', mod:'Login Page', dep:'None', rem:'Required field validation' },
    { id:'TC-LOGIN-004', story:'Assumed Login Validation', sc:'Null Email Value - L (Logic Coverage)', desc:'Verify null email value is rejected by UI/API validation.', pre:'User is on login screen or login API available', steps:'1. Submit login payload with email as null\n2. Enter valid password\n3. Observe response', data:'{"email": null, "password": "admin123"}', exp:'HTTP 400 or inline validation error returned. No session token generated. No partial user lookup succeeds.', act:'', status:'Not Started', prio:'High', sev:'Critical', type:'Data Validation', persona:'End User', mod:'Login Page/API', dep:'Validation middleware', rem:'Null value validation' },
    { id:'TC-LOGIN-005', story:'Assumed Login Validation', sc:'Whitespace Email Value - L (Logic Coverage)', desc:'Verify whitespace-only email is rejected after trimming.', pre:'User is on login screen', steps:'1. Enter three spaces in email field\n2. Enter valid password\n3. Click Login', data:'email: "   " / password: admin123', exp:'Email required/invalid error is displayed. No backend authentication call is accepted with whitespace value.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Data Validation', persona:'End User', mod:'Login Page', dep:'Client and server validation', rem:'Whitespace validation' },
    { id:'TC-LOGIN-006', story:'Assumed Login Validation', sc:'Invalid Email Format - L (Logic Coverage)', desc:'Verify malformed email format is rejected.', pre:'User is on login screen', steps:'1. Enter invalid-email\n2. Enter valid password\n3. Click Login', data:'email: invalid-email / password: admin123', exp:'Invalid email format error is displayed. Request is blocked or API returns validation error. No session is created.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Data Validation', persona:'End User', mod:'Login Page', dep:'Email validator', rem:'Format validation' },
    { id:'TC-LOGIN-007', story:'Assumed Login Validation', sc:'Password Below Minimum - L (Logic Coverage)', desc:'Verify password minimum length validation.', pre:'User is on login screen', steps:'1. Enter admin@emudhra.com\n2. Enter one-character password\n3. Click Login', data:'email: admin@emudhra.com / password: "a"', exp:'Password length validation error is displayed. No session is created and failure is safely logged.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Boundary', persona:'End User', mod:'Login Page', dep:'Password policy', rem:'Minimum length validation' },
    { id:'TC-LOGIN-008', story:'Assumed Login Validation', sc:'Oversized Email Input - L (Logic Coverage)', desc:'Verify oversized email does not break validation or persistence.', pre:'User is on login screen', steps:'1. Paste email value longer than 320 characters\n2. Enter valid password\n3. Click Login', data:'email: 321+ character string / password: admin123', exp:'Maximum length validation error is displayed. UI remains responsive. No oversized value is persisted or logged unsafely.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Boundary', persona:'End User', mod:'Login Page', dep:'Input length validator', rem:'Maximum length validation' },
    { id:'TC-HOME-002', story:'Assumed PRD Input Validation', sc:'Empty PRD Text - L (Logic Coverage)', desc:'Verify empty PRD text cannot trigger analysis.', pre:'Valid session & token > 0', steps:'1. Keep PRD textarea empty\n2. Do not attach a file\n3. Click Analyze PRD', data:'prdText: "" / file: null', exp:'Validation message asks for PRD text or attachment. Tokens are not consumed. Output area remains hidden.', act:'', status:'Not Started', prio:'High', sev:'Major', type:'Data Validation', persona:'Admin', mod:'Home Page', dep:'Token service', rem:'Empty input validation' },
    { id:'TC-HOME-003', story:'Assumed PRD Input Validation', sc:'Whitespace PRD Text - L (Logic Coverage)', desc:'Verify whitespace-only PRD input is rejected.', pre:'Valid session & token > 0', steps:'1. Enter spaces/newlines only in PRD textarea\n2. Click Analyze PRD', data:'prdText: "   \\n   "', exp:'Input is treated as empty. Validation message appears. No AI call is made and no output is generated.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Data Validation', persona:'Admin', mod:'Home Page', dep:'Input trimming', rem:'Whitespace input validation' },
    { id:'TC-HOME-004', story:'Assumed File Upload Validation', sc:'Unsupported File Type - T (Technology/UI)', desc:'Verify unsupported upload types are rejected.', pre:'Valid session & token > 0', steps:'1. Click Attach File\n2. Select .exe or .bat file\n3. Observe validation', data:'unsupported.exe', exp:'Unsupported file type error is shown. File content is not parsed. Analyze PRD remains blocked until valid input exists.', act:'', status:'Not Started', prio:'High', sev:'Major', type:'Data Validation', persona:'Admin', mod:'File Upload', dep:'File parser', rem:'File type validation' },
    { id:'TC-HOME-005', story:'Assumed File Upload Validation', sc:'Oversized File Upload - T (Technology/UI)', desc:'Verify oversized PRD upload is handled safely.', pre:'Valid session & token > 0', steps:'1. Upload PRD file exceeding configured size limit\n2. Observe validation and app responsiveness', data:'prd_oversized.pdf > maxUploadSize', exp:'Size validation error is displayed. Browser remains responsive. File is not sent to AI engine.', act:'', status:'Not Started', prio:'Medium', sev:'Major', type:'Boundary', persona:'Admin', mod:'File Upload', dep:'Upload size policy', rem:'Maximum file size validation' }
  ]);

  cases = cases.filter(c => !isExcludedTestCaseRow([
    c.id, c.story, '', c.sc, c.desc, c.prio, c.sev, c.pre, c.data,
    c.steps, c.exp, c.act, c.status, '', '', '', '', '', c.type, '', ''
  ]));
  return buildBrightFallbackTestCasesHTML(cases);

  var statusColors = {
    'Pass':        'rgba(16,185,129,0.15)',
    'Fail':        'rgba(239,68,68,0.15)',
    'Blocked':     'rgba(245,158,11,0.15)',
    'Not Started': 'rgba(107,127,150,0.15)',
    'In Progress': 'rgba(59,130,246,0.15)',
    'NA':          'rgba(255,255,255,0.06)'
  };
  var statusTextColors = { 'Pass':'#10b981','Fail':'#ef4444','Blocked':'#f59e0b','Not Started':'#6b7f96','In Progress':'#3b82f6','NA':'#6b7f96' };

  var rows = cases.map(function(c, idx) {
    var bg = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)';
    var sBg = statusColors[c.status] || statusColors['Not Started'];
    var sTxt = statusTextColors[c.status] || '#6b7f96';
    var values = [c.story, c.sc, c.desc, c.pre, c.steps, c.data, c.exp, c.act || '-', c.status, c.prio, c.sev, c.type, c.persona, c.mod, c.dep, c.rem];
    var cellColors = ['#38bdf8','#f8fafc','#e2e8f0','#e2e8f0','#f8fafc','#c084fc','#34d399','#fbbf24','#e2e8f0','#f87171','#f87171','#22d3ee','#fde68a','#60a5fa','#cbd5e1','#c084fc'];
    var valueCells = values.map(function(value, colIdx) {
      return `<td style="border:1px solid rgba(255,255,255,0.1);padding:8px;color:${cellColors[colIdx]};font-size:0.73rem;font-weight:800;white-space:pre-wrap;vertical-align:top">${escapeHtml(value)}</td>`;
    }).join('');
    return `<tr style="background:${bg};transition:background 0.15s" onmouseover="this.style.background='rgba(59,130,246,0.06)'" onmouseout="this.style.background='${bg}'">
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px"><span style="background:rgba(201,168,76,0.12);color:#c9a84c;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;white-space:nowrap">${c.id}</span></td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#38bdf8;font-size:0.76rem;font-weight:800">${escapeHtml(c.story)}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#f0f4f8;font-size:0.78rem">${c.sc}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.72rem">${c.desc}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.72rem">${c.pre}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.72rem;white-space:pre-wrap;max-width:220px">${c.steps}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#8b5cf6;font-size:0.72rem">${c.data}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#10b981;font-size:0.78rem">${c.exp}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#f59e0b;font-size:0.78rem;font-style:italic">${c.act || '—'}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;text-align:center"><span style="background:${sBg};color:${sTxt};padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:700;border:1px solid ${sTxt}40">${c.status}</span></td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;text-align:center;color:#ef4444;font-weight:700;font-size:0.7rem">${c.prio}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;text-align:center;color:#ef4444;font-weight:700;font-size:0.7rem">${c.sev}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#06b6d4;font-size:0.7rem">${c.type}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#c9a84c;font-size:0.7rem">${c.persona}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#3b82f6;font-weight:600;font-size:0.7rem">${c.mod}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#6b7f96;font-size:0.7rem">${c.dep}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#8b5cf6;font-size:0.7rem">${c.rem}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(16,185,129,0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🧪</div>
        <div>
          <div class="os-value" id="tcCountDisplay">—</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${[['Pass','#10b981'],['Fail','#ef4444'],['Blocked','#f59e0b'],['Not Started','#6b7f96']].map(([s,c])=>`<span style="background:rgba(255,255,255,0.04);border:1px solid ${c}40;color:${c};font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:6px">${s}</span>`).join('')}
    </div>
  </div>

  <!-- Column Legend -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    ${['Test Case ID','Requirement ID / User Story','Test Scenario','Test Case Title','Preconditions','Steps to Execute','Test Data','Expected Result','Actual Result','Status','Priority','Severity','Test Type','Persona','Module / Feature','Dependencies','Comments'].map((col,i)=>{
      var cols=['#c9a84c','#3b82f6','#f0f4f8','#a8b8cc','#a8b8cc','#a8b8cc','#8b5cf6','#10b981','#f59e0b','#6b7f96','#ef4444','#ef4444','#06b6d4','#c9a84c','#3b82f6','#6b7f96','#8b5cf6'];
      return `<span style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:${cols[i]};font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:4px">${col}</span>`;
    }).join('')}
  </div>

  <div style="overflow:auto; max-height:480px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
    <table style="min-width:2400px;border-collapse:collapse;font-size:0.8rem;font-family:'Inter',sans-serif">
      <thead>
        <tr style="background:linear-gradient(90deg,rgba(14,31,56,0.98),rgba(29,58,99,0.95));position:sticky;top:0;z-index:10">
          ${['Test Case ID','Requirement ID / User Story','Test Scenario','Test Case Title','Preconditions','Steps to Execute','Test Data','Expected Result','Actual Result','Status','Priority','Severity','Test Type','Persona','Module / Feature','Dependencies','Comments'].map((h,i)=>{
            var hColors=['#c9a84c','#3b82f6','#f0f4f8','#a8b8cc','#a8b8cc','#a8b8cc','#8b5cf6','#10b981','#f59e0b','#6b7f96','#ef4444','#ef4444','#06b6d4','#c9a84c','#3b82f6','#6b7f96','#8b5cf6'];
            return `<th style="padding:11px 12px;border:1px solid rgba(255,255,255,0.08);color:${hColors[i]};font-weight:800;font-size:0.72rem;white-space:nowrap;text-align:left;letter-spacing:0.3px">${h}</th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  </div>`;
}

function generateAutomationHTML(language) {
  var langLabel, ext, codeLines, accentColor;

  if (language === 'python') {
    langLabel = 'Python + Selenium WebDriver'; ext = 'py'; accentColor = '#3b82f6';
    codeLines = [
      '# === Flow: Authentication Testing ===',
      'import pytest',
      'from selenium import webdriver',
      'from selenium.webdriver.common.by import By',
      'from selenium.webdriver.support.ui import WebDriverWait',
      'from selenium.webdriver.support import expected_conditions as EC',
      '',
      'class TestAuthentication:',
      '    def setup_method(self):',
      '        self.driver = webdriver.Chrome()',
      '        self.wait = WebDriverWait(self.driver, 10)',
      '        self.driver.get("http://127.0.0.1:5500")',
      '',
      '    def teardown_method(self):',
      '        self.driver.quit()',
      '',
      '    # TC-LOGIN-001: Valid Enterprise Domain Login',
      '    def test_valid_domain_login(self):',
      '        self.driver.find_element(By.ID, "username").send_keys("admin@emudhra.com")',
      '        self.driver.find_element(By.ID, "password").send_keys("admin123")',
      '        self.driver.find_element(By.ID, "loginBtn").click()',
      '        self.wait.until(EC.url_contains("dashboard.html"))',
      '        assert "dashboard" in self.driver.current_url',
      '',
      '    # TC-LOGIN-002: Rejection of Non-Enterprise Domains',
      '    def test_invalid_domain_rejection(self):',
      '        self.driver.find_element(By.ID, "username").send_keys("hacker@gmail.com")',
      '        self.driver.find_element(By.ID, "password").send_keys("password123")',
      '        self.driver.find_element(By.ID, "loginBtn").click()',
      '        error_msg = self.wait.until(EC.visibility_of_element_located((By.ID, "loginErrorText")))',
      '        assert "User not registered" in error_msg.text'
    ];
  } else if (language === 'playwright') {
    langLabel = 'Playwright (JavaScript/TypeScript)'; ext = 'spec.js'; accentColor = '#8b5cf6';
    codeLines = [
      "// === Flow: Authentication Testing ===",
      "const { test, expect } = require('@playwright/test');",
      '',
      "test.describe('Enterprise Authentication — TC-LOGIN-001 to TC-LOGIN-002', () => {",
      '',
      "  test.beforeEach(async ({ page }) => {",
      "    await page.goto('http://127.0.0.1:5500');",
      '  });',
      '',
      "  // TC-LOGIN-001: Valid Enterprise Domain Login",
      "  test('Valid Enterprise Domain Login', async ({ page }) => {",
      "    await page.fill('#username', 'admin@emudhra.com');",
      "    await page.fill('#password', 'admin123');",
      "    await page.click('#loginBtn');",
      "    await expect(page).toHaveURL(/.*dashboard/);",
      "    await expect(page.locator('[data-user-name]')).toBeVisible();",
      '  });',
      '',
      "  // TC-LOGIN-002: Rejection of Non-Enterprise Domains",
      "  test('Rejection of Non-Enterprise Domains', async ({ page }) => {",
      "    await page.fill('#username', 'test@yahoo.com');",
      "    await page.fill('#password', 'pass123');",
      "    await page.click('#loginBtn');",
      "    const errorMsg = page.locator('#loginErrorText');",
      '    await expect(errorMsg).toBeVisible();',
      "    await expect(errorMsg).toContainText('User not registered');",
      '  });',
      '});'
    ];
  } else {
    langLabel = 'Java + Selenium (TestNG / Page Object Model)'; ext = 'java'; accentColor = '#f59e0b';
    codeLines = [
      'package com.emudhra.tests;',
      '',
      'import org.openqa.selenium.By;',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.WebElement;',
      'import org.openqa.selenium.chrome.ChromeDriver;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      'import org.openqa.selenium.support.ui.ExpectedConditions;',
      'import org.testng.Assert;',
      'import org.testng.annotations.*;',
      'import java.time.Duration;',
      '',
      'public class AuthenticationTests {',
      '    WebDriver driver;',
      '    WebDriverWait wait;',
      '',
      '    // === Flow: Setup ===',
      '    @BeforeMethod',
      '    public void setup() {',
      '        driver = new ChromeDriver();',
      '        wait = new WebDriverWait(driver, Duration.ofSeconds(10));',
      '        driver.get("http://127.0.0.1:5500");',
      '    }',
      '',
      '    @AfterMethod',
      '    public void teardown() { if (driver != null) driver.quit(); }',
      '',
      '    // === TC-LOGIN-001: Valid Enterprise Login ===',
      '    @Test(description = "Valid enterprise domain login")',
      '    public void testValidEnterpriseLogin() {',
      '        driver.findElement(By.id("username")).sendKeys("admin@emudhra.com");',
      '        driver.findElement(By.id("password")).sendKeys("admin123");',
      '        driver.findElement(By.id("loginBtn")).click();',
      '        wait.until(ExpectedConditions.urlContains("dashboard.html"));',
      '        Assert.assertTrue(driver.getCurrentUrl().contains("dashboard"), "Dashboard navigation verified");',
      '    }',
      '',
      '    // === TC-LOGIN-002: Invalid Domain Rejection ===',
      '    @Test(description = "Reject non-emudhra.com domain login")',
      '    public void testInvalidDomainRejection() {',
      '        driver.findElement(By.id("username")).sendKeys("user@gmail.com");',
      '        driver.findElement(By.id("password")).sendKeys("test1234");',
      '        driver.findElement(By.id("loginBtn")).click();',
      '        WebElement err = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginErrorText")));',
      '        Assert.assertTrue(err.getText().contains("User not registered"), "Domain guard validated");',
      '    }',
      '}'
    ];
  }

  var codeStr = codeLines.join('\n')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(${language==='python'?'59,130,246':language==='playwright'?'139,92,246':'245,158,11'},0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:linear-gradient(135deg,${accentColor},${accentColor}99);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🤖</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">Automation Scripts</div>
          <div style="font-size:0.72rem;color:#6b7f96">${langLabel}</div>
        </div>
      </div>
      <span style="background:rgba(255,255,255,0.05);border:1px solid ${accentColor}40;color:${accentColor};font-size:0.75rem;font-weight:700;padding:5px 14px;border-radius:20px">test_auth.${ext}</span>
    </div>

    <!-- File Header Bar -->
    <div style="background:#0d1624;border-radius:10px 10px 0 0;border:1px solid #1e293b;padding:8px 16px;display:flex;align-items:center;gap:8px">
      <span style="width:12px;height:12px;border-radius:50%;background:#ef4444;display:inline-block"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#f59e0b;display:inline-block"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#10b981;display:inline-block"></span>
      <span style="margin-left:8px;color:#475569;font-size:0.72rem;font-family:monospace">test_auth.${ext}</span>
    </div>
    <pre style="margin:0;padding:20px 24px;font-family:Consolas,'Courier New',monospace;font-size:0.8rem;line-height:1.7;overflow:auto;max-height:420px;background:#0d1624;border:1px solid #1e293b;border-top:none;border-radius:0 0 10px 10px;color:#e2e8f0">${codeStr}</pre>
  </div>`;
}
// ===== PRD INTELLIGENCE — Smart document sensing =====
function analyzePRDIntelligence(text) {
  if (typeof EnterpriseQAEngine !== 'undefined' && text && text.trim().length > 8) {
    const enterprise = EnterpriseQAEngine.analyzeRequirement(text);
    const endpointLabels = enterprise.api.endpoints.map(ep => `${ep.method} ${ep.endpoint}`);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estTC = Math.max(12, enterprise.enterpriseTestCases.length + endpointLabels.length * 12 + enterprise.classifications.length * 6 + Math.floor(wordCount / 70));
    const estTime = estTC > 120 ? '4-6 min' : estTC > 70 ? '2-4 min' : estTC > 35 ? '1-2 min' : '< 1 min';
    return {
      type: enterprise.api.mode ? 'API_SPEC' : (enterprise.classifications.includes('Security Requirement') ? 'SECURITY_SSO' : 'PRD'),
      modules: enterprise.modules,
      endpoints: endpointLabels,
      estTC,
      estTime,
      enterprise
    };
  }

  const t = text.toLowerCase();
  // Detect type
  let type = 'PRD';
  if ((t.includes('{') && t.includes('}') && (t.includes('"url"') || t.includes('"method"') || t.includes('"endpoint"'))) ||
      /\b(get|post|put|delete|patch)\s+\/\w/i.test(text)) {
    type = 'API_SPEC';
  } else if (t.includes('given ') && t.includes('when ') && t.includes('then ')) {
    type = 'ACCEPTANCE_CRITERIA';
  } else if ((text.match(/\|/g) || []).length > 5 || t.includes('s.no') || t.includes('process name')) {
    type = 'WORKFLOW_DATASET';
  } else if (t.includes('sso') || t.includes('saml') || t.includes('oauth') || t.includes('iam')) {
    type = 'SECURITY_SSO';
  }

  // Extract modules from headings
  const headingRegex = /(?:^|\n)#{1,3}\s+(.+)|(?:^|\n)([A-Z][A-Z\s]{4,30})(?:\n|:)/gm;
  const moduleKeywords = /\b(login|authentication|dashboard|upload|export|api|integration|security|payment|notification|user|admin|report|settings|profile|search|filter|cart|checkout|order|inventory|analytics|email|sms|webhook|jira|saml|sso|oauth|token|session)\b/gi;
  const moduleSet = new Set();
  let m;
  while ((m = headingRegex.exec(text)) !== null) {
    const heading = (m[1] || m[2] || '').trim();
    if (heading.length > 2 && heading.length < 40 && !/^\d+$/.test(heading)) moduleSet.add(heading);
  }
  let kwMatch;
  while ((kwMatch = moduleKeywords.exec(text)) !== null) {
    const kw = kwMatch[0].charAt(0).toUpperCase() + kwMatch[0].slice(1).toLowerCase();
    moduleSet.add(kw);
  }
  const modules = [...moduleSet].slice(0, 12);

  // Count API endpoints
  const apiMatches = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/[a-zA-Z0-9/_{}?&=-]+/gi) || [];
  const endpoints = [...new Set(apiMatches)].slice(0, 20);

  // Estimate test cases (simple heuristic)
  const wordCount = text.split(/\s+/).length;
  const endpointCount = endpoints.length;
  const moduleCount = modules.length;
  const estTC = Math.max(10, (moduleCount * 8) + (endpointCount * 5) + Math.floor(wordCount / 80));
  const estTime = estTC > 80 ? '3-5 min' : estTC > 40 ? '1-2 min' : '< 1 min';

  return { type, modules, endpoints, estTC, estTime };
}

function renderPRDIntelPanel(intel) {
  const panel = document.getElementById('prdIntelPanel');
  if (!panel) return;

  // Type badge
  const typeBadge = document.getElementById('prdIntelType');
  const sub = document.getElementById('prdIntelSub');
  const typeLabels = { PRD: 'PRD', API_SPEC: 'API SPEC', ACCEPTANCE_CRITERIA: 'ACCEPTANCE CRITERIA', WORKFLOW_DATASET: 'WORKFLOW DATASET', SECURITY_SSO: 'SECURITY/SSO' };
  const typeColors = { PRD: '#3b82f6', API_SPEC: '#06b6d4', ACCEPTANCE_CRITERIA: '#10b981', WORKFLOW_DATASET: '#f59e0b', SECURITY_SSO: '#ef4444' };
  if (typeBadge) {
    typeBadge.textContent = typeLabels[intel.type] || intel.type;
    typeBadge.style.background = `${typeColors[intel.type] || '#3b82f6'}20`;
    typeBadge.style.borderColor = `${typeColors[intel.type] || '#3b82f6'}50`;
    typeBadge.style.color = typeColors[intel.type] || '#3b82f6';
  }
  if (sub) sub.textContent = `AI detected ${typeLabels[intel.type] || intel.type} — Ready for deep analysis`;

  // Metrics
  const el = (id) => document.getElementById(id);
  if (el('intelModules')) el('intelModules').textContent = intel.modules.length;
  if (el('intelEndpoints')) el('intelEndpoints').textContent = intel.endpoints.length;
  if (el('intelEstimate')) el('intelEstimate').textContent = intel.estTC + '+';
  if (el('intelTime')) el('intelTime').textContent = intel.estTime;

  // Module chips
  const chipsEl = document.getElementById('prdModuleChips');
  if (chipsEl) {
    const colors = ['chip-blue', 'chip-green', 'chip-amber', 'chip-purple', 'chip-teal', 'chip-red'];
    const modules = intel.modules || [];
    const moduleChips = modules.map((mod, i) =>
      `<span class="module-chip ${colors[i % colors.length]}" style="animation-delay:${i * 50}ms" title="Module: ${escapeHtml(mod)}">${escapeHtml(mod)}</span>`
    ).join('');
    const enterprise = intel.enterprise;
    const scoreChips = enterprise ? [
      ['Quality', enterprise.scores.requirementQualityScore, 'chip-green'],
      ['Risk', enterprise.scores.riskScore, 'chip-red'],
      ['Ambiguity', enterprise.scores.ambiguityScore, 'chip-amber'],
      ['Coverage Confidence', enterprise.scores.coverageConfidenceScore, 'chip-blue']
    ].map(([label, value, cls], i) =>
      `<span class="module-chip ${cls}" style="animation-delay:${(i + modules.length) * 50}ms" title="${label} Score">${label}: ${value}%</span>`
    ).join('') : '';
    const apiMode = enterprise && enterprise.api.mode ? '<span class="module-chip chip-teal active" title="API Detection Engine">API Analysis Mode</span>' : '';
    chipsEl.innerHTML = moduleChips + scoreChips + apiMode;
    // Chip click ripple
    chipsEl.querySelectorAll('.module-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const ta = document.getElementById('prdTextarea');
        if (ta) {
          const kw = chip.textContent;
          ta.value = ta.value; // trigger if needed
          showToast(`Module: ${kw} — included in analysis`, 'info', 2000);
        }
      });
    });
  }

  panel.style.display = 'block';
}

// ===== API TEST GENERATION =====
async function startAPITestGeneration(inputSource) {
  generatedData = {};
  showProcessingOverlay('Please wait. eMudhra QA-Gen AI is extracting API endpoints and generating API tests...');
  const _afg = $('featureGrid');     if (_afg) _afg.style.display = 'grid';
  const _aosg = $('outputStatsGrid'); if (_aosg) _aosg.style.display = 'grid';
  const _aoa = $('outputArea');      if (_aoa) _aoa.style.display = 'block';
  const _aol = $('outputLoading');   if (_aol) _aol.style.display = 'flex';
  const _aos = $('outputStream');    if (_aos) _aos.innerHTML = '';

  const stepEl = document.getElementById('loadingStep');
  if (stepEl) stepEl.textContent = 'eMudhra QA engine is extracting API endpoints and validations...';

  document.querySelectorAll('.out-tab').forEach(t => t.classList.remove('active'));
  const apiTab = document.querySelector('.out-tab[data-tab="api_tests"]');
  if (apiTab) apiTab.classList.add('active');

  try {
    const models = AppState.models;
    const engineSelector = document.getElementById('selectedModel');
    const activeEngine = engineSelector ? engineSelector.value : 'ollama';
    const config = { current: activeEngine, data: models.data || models };

    // Local extraction (fast, synchronous, used as fallback/supplement)
    const enterpriseIntel = typeof EnterpriseQAEngine !== 'undefined' ? EnterpriseQAEngine.analyzeRequirement(inputSource) : null;
    const extractedEndpoints = enterpriseIntel && enterpriseIntel.api.endpoints.length
      ? enterpriseIntel.api.endpoints.map(ep => ({ method: ep.method, path: ep.endpoint }))
      : AIEngine.extractAPISpec(inputSource);

    // Always attempt AI-powered generation using the pre-composed API test prompt.
    // generateWithPrompt sends the prompt directly without re-wrapping it.
    let apiData = null;
    try {
      const apiPrompt = AIEngine.composeAPITestPrompt(inputSource);
      const resultText = await AIEngine.generateWithPrompt(apiPrompt, config, null);
      // Robustly extract the outermost JSON object from the response
      const jsonStart = resultText.indexOf('{');
      const jsonEnd = resultText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        try {
          const normalized = AIEngine.normalizeAIJsonResponse(resultText.slice(jsonStart, jsonEnd + 1));
          apiData = JSON.parse(normalized);
        } catch (_) {
          console.warn('API test JSON parse failed; falling back to local endpoints.');
        }
      }
    } catch (e) {
      // Re-throw auth/config errors so the user gets a clear message
      if (/API key missing|configure/i.test(e.message)) throw e;
      console.warn('AI API generation failed, using local extraction:', e);
    }

    document.getElementById('outputLoading').style.display = 'none';

    const apiHtml = renderAPITests(apiData, extractedEndpoints, inputSource) + renderEnterpriseAPIIntelligence(enterpriseIntel);
    generatedData.api_tests = apiHtml;
    const autoLangEl = document.getElementById('autoLangSelect');
    const autoLang = autoLangEl ? autoLangEl.value : 'java';
    if (automationEnabled) {
      const apiAutomationInput = [
        inputSource,
        extractedEndpoints.map(ep => `${ep.method} ${ep.path}`).join('\n'),
        apiData ? JSON.stringify(apiData, null, 2) : ''
      ].filter(Boolean).join('\n\n');
      generatedData.automation = renderDynamicAutomation(buildSmartAutomationOutput(apiAutomationInput, null, autoLang), autoLang);
    } else {
      delete generatedData.automation;
    }

    const totalCases = apiData?.endpoints?.reduce((s, ep) => s + (ep.testCases?.length || 0), 0) ||
      extractedEndpoints.length * 4;

    setText('planStatus', 'API-Ready');
    setText('tcCountDisplay', totalCases + ' API cases');
    setText('covCountDisplay', (apiData?.endpoints?.length || extractedEndpoints.length) + ' endpoints');
    setText('autoCountDisplay', automationEnabled ? getAutomationLanguageMeta(autoLang).short : 'Disabled');

    persistGeneratedOutput(inputSource);
    updateOutputTabs('api_tests');
    typewriterRender('outputStream', apiHtml);
    AppState.addLog('API Test Suite Generated', 'generation');
    showSuccessPopup('API Tests Generated Successfully', 'API endpoints, validations, and enterprise API test scenarios are ready.');
  } catch (err) {
    document.getElementById('outputLoading').style.display = 'none';
    hideProcessingOverlay();
    showToast(err.message, 'error');
    console.error(err);
  }
}

function renderAPITests(apiData, extractedEndpoints, sourceText) {
  // If AI returned structured data, render it
  if (apiData && apiData.endpoints && apiData.endpoints.length > 0) {
    return renderStructuredAPITests(apiData.endpoints);
  }
  // Fallback: render from extracted endpoints
  if (extractedEndpoints && extractedEndpoints.length > 0) {
    return renderExtractedAPITests(extractedEndpoints, sourceText);
  }
  // No API detected
  return `<div style="padding:40px;text-align:center;color:#6b7f96">
    <div style="font-size:3rem;margin-bottom:12px">🔗</div>
    <div style="font-weight:700;color:#a8b8cc;font-size:1rem">No API Endpoints Detected</div>
    <p style="font-size:0.82rem;margin-top:8px;line-height:1.6">Include API specs with HTTP methods (GET, POST, PUT, DELETE) and endpoint paths in your PRD.</p>
    <code style="display:block;margin-top:12px;font-size:0.78rem;background:#0d1624;padding:8px 14px;border-radius:6px;color:#06b6d4">Example: POST /api/v1/users — Create a new user</code>
  </div>`;
}

function renderEnterpriseAPIIntelligence(enterpriseIntel) {
  if (!enterpriseIntel || !enterpriseIntel.api || !enterpriseIntel.api.mode) return '';
  const tests = enterpriseIntel.api.generatedTests || [];
  const examples = enterpriseIntel.api.payloadExamples || { requests: [], responses: [] };
  const requestBlocks = (examples.requests || []).map(item => `
    <details style="background:#0d1624;border:1px solid #1e293b;border-radius:10px;overflow:hidden">
      <summary style="cursor:pointer;padding:10px 12px;color:#06b6d4;font-weight:900">${escapeHtml(item.name)}</summary>
      <pre style="margin:0;padding:12px;color:#e2e8f0;font-size:0.72rem;white-space:pre-wrap">${escapeHtml(JSON.stringify(item.payload, null, 2))}</pre>
    </details>
  `).join('');
  const responseBlocks = (examples.responses || []).map(item => `
    <details style="background:#0d1624;border:1px solid #1e293b;border-radius:10px;overflow:hidden">
      <summary style="cursor:pointer;padding:10px 12px;color:#10b981;font-weight:900">${item.status} ${escapeHtml(item.name)}</summary>
      <pre style="margin:0;padding:12px;color:#e2e8f0;font-size:0.72rem;white-space:pre-wrap">${escapeHtml(JSON.stringify(item.body, null, 2))}</pre>
    </details>
  `).join('');
  const byCategory = tests.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return `
    <div style="margin-top:18px;border-top:1px solid #1e293b;padding-top:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div>
          <div style="font-size:1rem;font-weight:950;color:#f8fafc">Enterprise API Intelligence</div>
          <div style="font-size:0.76rem;color:#94a3b8;font-weight:800">Functional, boundary, security, contract, reliability, payload, and response intelligence</div>
        </div>
        <a href="enterprise.html#api" style="text-decoration:none;background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc;border-radius:999px;padding:8px 12px;font-weight:950;font-size:0.78rem">Open API Intelligence</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-bottom:14px">
        ${Object.entries(byCategory).map(([category, rows]) => `
          <div style="background:#0d1624;border:1px solid #1e293b;border-radius:12px;padding:12px">
            <div style="color:#c9a84c;font-weight:950;margin-bottom:8px">${escapeHtml(category)} Tests</div>
            ${rows.slice(0, 6).map(row => `<div style="color:#cbd5e1;font-size:0.76rem;line-height:1.45;margin-bottom:7px"><b style="color:#06b6d4">${escapeHtml(row.id)}</b> ${escapeHtml(row.scenario)}</div>`).join('')}
          </div>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
        <div>
          <div style="font-weight:950;color:#f8fafc;margin-bottom:8px">Request Examples</div>
          <div style="display:grid;gap:8px">${requestBlocks}</div>
        </div>
        <div>
          <div style="font-weight:950;color:#f8fafc;margin-bottom:8px">Response Examples</div>
          <div style="display:grid;gap:8px">${responseBlocks}</div>
        </div>
      </div>
    </div>
  `;
}

function inferApiParameterName(testCase, endpoint) {
  const explicit = testCase?.parameterName || testCase?.parameter || testCase?.field || testCase?.fieldName;
  if (explicit) return String(explicit);

  const url = testCase?.request?.url || endpoint?.endpoint || endpoint?.path || '';
  const pathParams = [...String(url).matchAll(/\{([^}]+)\}|:([A-Za-z_][\w-]*)/g)].map(m => m[1] || m[2]);
  const body = testCase?.request?.body;
  const query = testCase?.request?.query || testCase?.request?.params || testCase?.request?.queryParams;
  const desc = String(testCase?.description || '').toLowerCase();
  const candidates = [];

  if (body && typeof body === 'object' && !Array.isArray(body)) candidates.push(...Object.keys(body));
  if (query && typeof query === 'object' && !Array.isArray(query)) candidates.push(...Object.keys(query));
  candidates.push(...pathParams);

  const matched = candidates.find(name => desc.includes(String(name).toLowerCase()));
  if (matched) return matched;
  if (/token|authorization|auth|bearer/.test(desc)) return 'Authorization';
  if (/malformed json|request body|payload|body/.test(desc) && candidates.length > 1) return 'requestBody';
  return candidates[0] || '-';
}

function formatApiTestData(testCase) {
  const request = testCase?.request || {};
  const pieces = [];
  if (request.body && Object.keys(request.body).length) pieces.push(JSON.stringify(request.body));
  if (request.query && Object.keys(request.query).length) pieces.push('query=' + JSON.stringify(request.query));
  if (request.params && Object.keys(request.params).length) pieces.push('params=' + JSON.stringify(request.params));
  if (request.headers && Object.keys(request.headers).length) pieces.push('headers=' + JSON.stringify(request.headers));
  return pieces.join('\n') || '-';
}

function renderStructuredAPITests(endpoints) {
  const methodClass = m => `method-${(m||'get').toLowerCase()}`;
  const typeClass = t => `tc-${(t||'positive').toLowerCase()}`;
  const tcColors = { positive: '#10b981', negative: '#ef4444', security: '#f59e0b', boundary: '#8b5cf6', error: '#ef4444' };

  const cards = endpoints.map((ep, epIdx) => {
    const tcRows = (ep.testCases || []).map(tc => {
      const reqJson = tc.request?.body ? JSON.stringify(tc.request.body, null, 2) : null;
      const resJson = tc.expectedResponse?.body ? JSON.stringify(tc.expectedResponse.body, null, 2) : null;
      const typeC = typeClass(tc.type);
      const typeColor = tcColors[tc.type] || '#3b82f6';
      const parameterName = inferApiParameterName(tc, ep);
      const testData = formatApiTestData(tc);
      return `<tr>
        <td><code style="color:#c9a84c;font-size:0.72rem">${tc.id||''}</code></td>
        <td><span class="api-tc-type ${typeC}">${tc.type||'positive'}</span></td>
        <td style="color:#06b6d4;font-size:0.72rem;font-weight:800">${escapeHtml(parameterName)}</td>
        <td style="color:#e2e8f0;font-size:0.75rem">${tc.description||''}</td>
        <td><code style="font-size:0.68rem;color:#8b5cf6;white-space:pre-wrap">${escapeHtml(testData)}</code></td>
        <td><span style="font-size:0.68rem;background:rgba(${tc.expectedResponse?.statusCode>=200&&tc.expectedResponse?.statusCode<300?'16,185,129':'239,68,68'},0.15);color:${tc.expectedResponse?.statusCode>=200&&tc.expectedResponse?.statusCode<300?'#10b981':'#ef4444'};padding:2px 8px;border-radius:4px;font-weight:800">${tc.expectedResponse?.statusCode||200}</span></td>
        <td>${reqJson ? `<details><summary style="cursor:pointer;font-size:0.68rem;color:#06b6d4">View Request</summary><pre class="api-json-block" style="margin-top:6px;font-size:0.7rem">${escapeHtml(reqJson)}</pre></details>` : '—'}</td>
        <td>${resJson ? `<details><summary style="cursor:pointer;font-size:0.68rem;color:#10b981">View Response</summary><pre class="api-json-block" style="margin-top:6px;font-size:0.7rem">${escapeHtml(resJson)}</pre></details>` : '—'}</td>
      </tr>`;
    }).join('');

    const sampleReq = ep.testCases?.[0]?.request;
    const sampleRes = ep.testCases?.[0]?.expectedResponse;

    return `<div class="api-endpoint-card">
      <div class="api-endpoint-header" onclick="toggleAPICard(this)" id="ep-header-${epIdx}">
        <span class="api-method-badge ${methodClass(ep.method)}">${ep.method||'GET'}</span>
        <span class="api-endpoint-path">${ep.endpoint||''}</span>
        <span class="api-endpoint-desc">${ep.description||''}</span>
        <span class="api-expand-icon">▼</span>
      </div>
      <div class="api-endpoint-body" id="ep-body-${epIdx}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;margin-bottom:4px">
          <div>
            <div class="api-section-label">Sample Request</div>
            <pre class="api-json-block">${escapeHtml(JSON.stringify(sampleReq?.body||{}, null, 2))}</pre>
          </div>
          <div>
            <div class="api-section-label">Expected Response</div>
            <pre class="api-json-block">${escapeHtml(JSON.stringify(sampleRes?.body||{}, null, 2))}</pre>
          </div>
        </div>
        <div class="api-section-label">Test Cases (${ep.testCases?.length||0})</div>
        <table class="api-tc-table">
          <thead><tr><th>TC ID</th><th>Type</th><th>Parameter Name</th><th>Description</th><th>Test Data</th><th>Status Code</th><th>Request Body</th><th>Response Body</th></tr></thead>
          <tbody>${tcRows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  return `<div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#0891b2,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🔗</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">API Test Suite</div>
        <div style="font-size:0.72rem;color:#6b7f96">${endpoints.length} endpoints • AI-Generated Request/Response Pairs</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
        ${['GET','POST','PUT','PATCH','DELETE'].map(m=>`<span class="api-method-badge method-${m.toLowerCase()}">${m}</span>`).join('')}
      </div>
    </div>
    ${cards}
  </div>`;
}

function renderExtractedAPITests(endpoints, sourceText) {
  const methodClass = m => `method-${(m||'get').toLowerCase()}`;
  // Generate default test cases for each endpoint
  const defaultTCTypes = [
    { type: 'positive', desc: 'Valid request with all required fields', code: 200 },
    { type: 'negative', desc: 'Missing required fields in request body', code: 400 },
    { type: 'negative', desc: 'Required field submitted as null. Example payload value: {"email": null}', code: 400 },
    { type: 'negative', desc: 'Required field submitted as empty string. Example payload value: {"email": ""}', code: 400 },
    { type: 'negative', desc: 'Required field submitted as whitespace only. Example payload value: {"email": "   "}', code: 400 },
    { type: 'security', desc: 'Unauthorized request without Bearer token', code: 401 },
    { type: 'boundary', desc: 'Payload with maximum allowed field length values', code: 200 },
    { type: 'boundary', desc: 'Payload exceeding maximum field length values', code: 400 }
  ];

  const cards = endpoints.slice(0, 15).map((ep, epIdx) => {
    const hasBodyInfo = /(?:body|payload|request body|json|email|password|required|data|create|update|submit)/i.test(sourceText);
    const validationCases = [];

    if (['POST','PUT','PATCH'].includes(ep.method) && hasBodyInfo) {
      validationCases.push(
        { type: 'negative', desc: 'Missing required fields in request body', code: 400 },
        { type: 'negative', desc: 'Null value for mandatory field in body payload. Example: {"name": null}', code: 400 },
        { type: 'negative', desc: 'Empty string for mandatory field in body payload. Example: {"name": ""}', code: 400 },
        { type: 'negative', desc: 'Whitespace-only value for mandatory field in body payload. Example: {"name": "   "}', code: 400 },
        { type: 'negative', desc: 'Invalid email format in body payload', code: 400 },
        { type: 'negative', desc: 'Invalid data type in body payload. Example: {"amount": "abc"} instead of number', code: 400 },
        { type: 'negative', desc: 'Duplicate unique field value in body payload. Example: existing email or existing external ID', code: 409 },
        { type: 'negative', desc: 'Password length below minimum requirement', code: 400 },
        { type: 'negative', desc: 'Request body contains unsupported extra field', code: 400 }
      );
    }

    const tcs = defaultTCTypes.concat(validationCases);
    const tcRows = tcs.map((tc, i) => {
      const tcId = `API-${ep.method}-${(ep.path||'').replace(/\//g,'-').replace(/[{}]/g,'').substring(0,10).toUpperCase()}-${String(i+1).padStart(2,'0')}`;
      const codeColor = tc.code >= 200 && tc.code < 300 ? '#10b981' : '#ef4444';
      const parameterName = /authorization|bearer|token/i.test(tc.desc) ? 'Authorization' :
        /email/i.test(tc.desc) ? 'email' :
        /password/i.test(tc.desc) ? 'password' :
        /amount/i.test(tc.desc) ? 'amount' :
        /name/i.test(tc.desc) ? 'name' :
        /extra field/i.test(tc.desc) ? 'unsupportedField' :
        /required field|mandatory field|payload|request body/i.test(tc.desc) ? 'requestBody' : '-';
      const sampleData = (tc.desc.match(/Example(?: payload value)?:\s*(\{.*\})/i) || [])[1] ||
        (parameterName === 'Authorization' ? 'Missing/invalid Bearer token' :
        parameterName === 'email' ? 'invalid-email' :
        parameterName === 'password' ? 'min-length violation' :
        parameterName === 'amount' ? '{"amount":"abc"}' :
        parameterName === 'unsupportedField' ? '{"unsupportedField":"value"}' : '-');
      return `<tr>
        <td><code style="color:#c9a84c;font-size:0.72rem">${tcId}</code></td>
        <td><span class="api-tc-type tc-${tc.type}">${tc.type}</span></td>
        <td style="font-size:0.68rem;color:#06b6d4;font-weight:800">${escapeHtml(parameterName)}</td>
        <td style="color:#e2e8f0;font-size:0.75rem">${tc.desc}</td>
        <td><code style="font-size:0.68rem;color:#8b5cf6">${escapeHtml(sampleData)}</code></td>
        <td><span style="font-size:0.68rem;background:rgba(${tc.code<300?'16,185,129':'239,68,68'},0.15);color:${codeColor};padding:2px 8px;border-radius:4px;font-weight:800">${tc.code}</span></td>
        <td><code style="font-size:0.68rem;color:#8b5cf6">${ep.method} ${ep.path}</code></td>
        <td style="font-size:0.68rem;color:#a8b8cc">${tc.type==='positive'?'200 OK + data':'Error body with code'}</td>
      </tr>`;
    }).join('');

    return `<div class="api-endpoint-card">
      <div class="api-endpoint-header" onclick="toggleAPICard(this)" id="ep-header-${epIdx}">
        <span class="api-method-badge ${methodClass(ep.method)}">${ep.method}</span>
        <span class="api-endpoint-path">${ep.path}</span>
        <span class="api-endpoint-desc">Extracted from PRD</span>
        <span class="api-expand-icon">▼</span>
      </div>
      <div class="api-endpoint-body" id="ep-body-${epIdx}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">
          <div>
            <div class="api-section-label">Sample Request</div>
            <pre class="api-json-block">{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer &lt;token&gt;"\n}</pre>
          </div>
          <div>
            <div class="api-section-label">Expected Response</div>
            <pre class="api-json-block">{\n  "status": "success",\n  "data": {}\n}</pre>
          </div>
        </div>
        <div class="api-section-label">Generated Test Cases</div>
        <table class="api-tc-table">
          <thead><tr><th>TC ID</th><th>Type</th><th>Parameter Name</th><th>Description</th><th>Test Data</th><th>Status Code</th><th>Endpoint</th><th>Response</th></tr></thead>
          <tbody>${tcRows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  return `<div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(6,182,212,0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#0891b2,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🔗</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">API Test Cases (Auto-Extracted)</div>
        <div style="font-size:0.72rem;color:#6b7f96">${endpoints.length} endpoints detected from PRD • Click to expand Request/Response</div>
      </div>
    </div>
    ${cards || '<div style="padding:20px;color:#6b7f96">No specific API endpoints could be extracted. Paste an API spec with HTTP methods.</div>'}
  </div>`;
}

function toggleAPICard(header) {
  header.classList.toggle('expanded');
  const bodyId = header.id.replace('ep-header', 'ep-body');
  const body = document.getElementById(bodyId);
  if (body) body.classList.toggle('open');
}

function escapeHtml(str) {
  if (!str || typeof str !== 'string') return String(str || '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function extractPdfText(arrayBuffer, options = {}) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF parser is not loaded yet.');
  }

  setUploadLoaderText('Reading PDF structure...');
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    disableWorker: true,
    useSystemFonts: true,
    isEvalSupported: false
  }).promise;

  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    setUploadLoaderText(`Extracting PDF text page ${pageNo} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const text = content.items
      .map(item => item && typeof item.str === 'string' ? item.str : '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) pages.push(`--- PAGE ${pageNo} ---\n${text}`);
  }

  const extracted = pages.join('\n\n').trim();
  if (extracted.length >= 40) return extracted;

  if (options.allowOcr === false) {
    throw new Error('No embedded readable text found. OCR will run when analysis starts.');
  }
  return extractPdfTextWithOcr(pdf);
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === 'true') resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureTesseractLoaded() {
  if (typeof Tesseract !== 'undefined') return;
  const sources = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'
  ];
  let lastError = null;
  for (const src of sources) {
    try {
      setUploadLoaderText('Loading OCR engine...');
      await loadScriptOnce(src);
      if (typeof Tesseract !== 'undefined') return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('OCR library could not be loaded.');
}

function setUploadLoaderText(message) {
  const loader = document.getElementById('uploadLoader');
  const label = loader ? loader.querySelector('span') : null;
  if (label && message) label.textContent = message;
}

async function extractPdfTextWithOcr(pdf) {
  await ensureTesseractLoaded();

  const pages = [];
  const totalPages = pdf.numPages || 0;
  for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
    setUploadLoaderText(`Running OCR on PDF page ${pageNo} of ${totalPages}...`);
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const result = await Tesseract.recognize(canvas, 'eng', {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger(progress) {
        if (progress && progress.status === 'recognizing text') {
          const pct = Math.round((progress.progress || 0) * 100);
          setUploadLoaderText(`OCR page ${pageNo} of ${totalPages}: ${pct}%`);
        }
      }
    });

    const text = (result && result.data && result.data.text ? result.data.text : '').replace(/\s+/g, ' ').trim();
    if (text) pages.push(`--- OCR PAGE ${pageNo} ---\n${text}`);
    canvas.width = 0;
    canvas.height = 0;
  }

  const extracted = pages.join('\n\n').trim();
  if (extracted.length < 40) {
    throw new Error('No readable text was found in this PDF even after OCR. It may be protected or too low-resolution.');
  }
  return extracted;
}

function setFileParsingLoader(visible, message) {
  const loader = document.getElementById('uploadLoader');
  const dropZone = document.getElementById('dropZone');
  if (loader) loader.style.display = visible ? 'flex' : 'none';
  if (visible) {
    closeSuccessPopup();
    setUploadLoaderText(message || 'Parsing PRD document...');
    showProcessingOverlay(message || 'Please wait. eMudhra is parsing and preparing the uploaded document...');
  } else {
    hideProcessingOverlay();
  }
  if (dropZone) {
    dropZone.style.pointerEvents = visible ? 'none' : '';
    dropZone.style.opacity = visible ? '0.96' : '';
    dropZone.classList.toggle('file-uploading', !!visible);
    dropZone.setAttribute('aria-busy', visible ? 'true' : 'false');
  }
}

function waitForUploadPaint() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function showAttachedFilePreview(file, ext) {
  var icon = document.getElementById('filePrevIcon');
  var name = document.getElementById('filePrevName');
  var size = document.getElementById('filePrevSize');
  var prev = document.getElementById('filePreview');
  var dropZone = document.getElementById('dropZone');
  if (icon) icon.textContent = FILE_ICONS[ext] || FILE_ICONS.default;
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatBytes(file.size);
  if (prev) prev.style.display = 'flex';
  if (dropZone) dropZone.classList.add('file-loaded');
}

function getPRDFileExtension(file) {
  return String(file && file.name ? file.name : '').split('.').pop().toLowerCase();
}

function validatePRDFile(file, ext, showErrors = true) {
  if (!file) return false;
  if (!ALLOWED_PRD_EXTENSIONS.includes(ext)) {
    attachedFile = null;
    if (showErrors) showToast('Unsupported file type. Please attach PDF, DOCX, Excel, CSV, or TXT.', 'error');
    return false;
  }
  if (file.size > MAX_PRD_FILE_BYTES) {
    attachedFile = null;
    if (showErrors) showToast('File is too large. Please attach a file below 20 MB.', 'error');
    return false;
  }
  return true;
}

function keepAttachmentWithFallback(file, err) {
  attachedFileParseStatus = 'fallback';
  attachedFileParserWarning = err && err.message ? err.message : String(err || 'Unknown parser issue');
  attachedFileContent = `Attached PRD document: ${file.name}\nParser warning: ${attachedFileParserWarning}`;
  console.warn('File attached with parser fallback:', err);
  showToast('File uploaded successfully. OCR/text extraction will run when you click Analyze.', 'success', 6500);
  showSuccessPopup('File Uploaded Successfully', 'The PRD file is attached. If embedded text is unavailable, OCR extraction will run during analysis.');
}

function withParsingTimeout(promise, file) {
  let warned = false;
  const timer = setTimeout(() => {
    warned = true;
    setUploadLoaderText('Still extracting text. Large scanned PDFs can take a few minutes...');
    showToast('Still extracting text from the attachment. Please wait for parsing to finish.', 'info', 6000);
  }, 180000);

  return promise.finally(() => {
    clearTimeout(timer);
    if (warned) setUploadLoaderText('Parsing PRD document...');
  });
}

// ===== HANDLE FILE ATTACH =====
function handleFileAttach(file, options = {}) {
  attachedFile = file;
  attachedFileContent = '';
  attachedFileParseStatus = 'parsing';
  attachedFileParserWarning = '';
  var ext = getPRDFileExtension(file);
  if (!validatePRDFile(file, ext)) {
    if (file && file.size > MAX_PRD_FILE_BYTES) return Promise.reject(new Error('File too large'));
    return Promise.reject(new Error('Unsupported file type'));
  }
  if (!options.previewAlreadyShown) {
    showAttachedFilePreview(file, ext);
  }

  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadstart = function() {
      setUploadLoaderText(`Uploading ${file.name}...`);
    };
    reader.onprogress = function(event) {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.max(1, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        setUploadLoaderText(`Reading ${file.name}: ${pct}%`);
      } else {
        setUploadLoaderText(`Reading ${file.name}...`);
      }
    };
    reader.onload = async function(e) {
      try {
        const data = e.target.result;
        if (ext === 'xlsx' || ext === 'xls') {
          if (typeof XLSX === 'undefined') throw new Error('Excel parser is not loaded yet.');
          setUploadLoaderText('Compressing Excel workbook for faster analysis...');
          attachedFileContent = compactExcelWorkbook(data, file);
          attachedFileParseStatus = attachedFileContent.trim().length ? 'parsed' : 'fallback';
        } else if (ext === 'pdf') {
          attachedFileContent = await extractPdfText(data, { allowOcr: options.allowOcr !== false });
          attachedFileParseStatus = 'parsed';
        } else if (ext === 'docx') {
          // mammoth returns a promise
          if (typeof mammoth === 'undefined') throw new Error('DOCX parser (mammoth) is not available');
          setUploadLoaderText('Extracting DOCX text...');
          mammoth.extractRawText({ arrayBuffer: data }).then(result => {
            attachedFileContent = (result.value || '').trim();
            if (!attachedFileContent) {
              keepAttachmentWithFallback(file, new Error('DOCX parser returned no readable text.'));
            } else {
              attachedFileParseStatus = 'parsed';
              showToast('DOCX content extracted', 'success');
              showSuccessPopup('File Uploaded Successfully', 'DOCX content was extracted and is ready for analysis.');
            }
            resolve();
          }).catch(err => {
            keepAttachmentWithFallback(file, err);
            resolve();
          });
          return;
        } else {
          // For plain text/csv or other types, coerce to string
          setUploadLoaderText('Reading text content...');
          if (typeof data === 'string') attachedFileContent = data;
          else attachedFileContent = (new TextDecoder()).decode(new Uint8Array(data));
          attachedFileParseStatus = attachedFileContent.trim().length ? 'parsed' : 'fallback';
        }

        if (attachedFileParseStatus === 'parsed') {
          if (ext === 'xlsx' || ext === 'xls') {
            showToast('Excel workbook compressed and loaded', 'success');
            showSuccessPopup('File Uploaded Successfully', 'Excel workbook was compressed and loaded for analysis.');
          } else {
            showToast('File content loaded', 'success');
            showSuccessPopup('File Uploaded Successfully', 'Document content was loaded and is ready for analysis.');
          }
        } else {
          keepAttachmentWithFallback(file, new Error('Parser returned no readable text.'));
        }
        resolve();
      } catch (err) {
        console.error('File parse error:', err);
        keepAttachmentWithFallback(file, err);
        resolve();
      }
    };
    reader.onerror = function() {
      keepAttachmentWithFallback(file, reader.error || new Error('Browser could not read the selected file.'));
      resolve();
    };

    // Use ArrayBuffer for binaries, text otherwise
    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'docx' || ext === 'pdf') reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    } catch (err) {
      try { reader.readAsText(file); } catch (err2) {
        keepAttachmentWithFallback(file, err2);
        resolve();
      }
    }
  });
}

async function processSelectedPRDFile(file, sourceInput) {
  if (!file) return;
  if (parsingAttachedFile) {
    showToast('Please wait, the previous document is still attaching.', 'info', 2500);
    return;
  }
  const ext = getPRDFileExtension(file);
  if (!validatePRDFile(file, ext)) {
    if (sourceInput) sourceInput.value = '';
    return;
  }
  attachedFile = file;
  attachedFileContent = '';
  attachedFileParseStatus = 'parsing';
  attachedFileParserWarning = '';
  showAttachedFilePreview(file, ext);
  parsingAttachedFile = true;
  setFileParsingLoader(true, `Uploading ${file.name}...`);
  try {
    await waitForUploadPaint();
    await new Promise(resolve => setTimeout(resolve, 40));
    await withParsingTimeout(handleFileAttach(file, { allowOcr: false, previewAlreadyShown: true }), file);
    const content = attachedFileContent || file.name;
    if (attachedFileParseStatus === 'parsed' && content.length > 20) {
      setTimeout(function() {
        renderPRDIntelPanel(analyzePRDIntelligence(content));
      }, 0);
    }
  } catch (err) {
    keepAttachmentWithFallback(file, err);
  } finally {
    parsingAttachedFile = false;
    setFileParsingLoader(false);
    if (sourceInput) sourceInput.value = '';
  }
}

window.handlePRDFileInputChange = function(input) {
  const file = input && input.files && input.files[0];
  processSelectedPRDFile(file, input);
};

async function retryFallbackAttachmentIfPossible(purposeLabel) {
  if (attachedFileParseStatus !== 'fallback' || !attachedFile) return attachedFileParseStatus !== 'fallback';
  const ext = getPRDFileExtension(attachedFile);
  if (!ALLOWED_PRD_EXTENSIONS.includes(ext)) return false;

  showToast(`Retrying ${ext.toUpperCase()} text extraction before ${purposeLabel}...`, 'info', 3500);
  parsingAttachedFile = true;
  setFileParsingLoader(true, `Preparing OCR/text extraction for ${attachedFile.name}...`);
  try {
    await waitForUploadPaint();
    await withParsingTimeout(handleFileAttach(attachedFile, { allowOcr: true }), attachedFile);
  } finally {
    parsingAttachedFile = false;
    setFileParsingLoader(false);
  }
  return attachedFileParseStatus === 'parsed' && attachedFileContent.trim().length > 0;
}

function buildAnalysisInput(prdText, fallbackTitle) {
  const sections = [];
  const primaryInput = String(prdText || '').trim();
  const attachedInput = attachedFileParseStatus === 'parsed' ? String(attachedFileContent || '').trim() : '';
  const unitFlowInput = buildUIFlowGeneratorInput();

  if (primaryInput) sections.push(`--- PRIMARY PRD / REQUIREMENT INPUT ---\n${primaryInput}`);
  if (attachedInput) sections.push(`--- ATTACHED FILE TEXT INPUT ---\n${attachedInput}`);
  if (unitFlowInput) sections.push(unitFlowInput);

  return sections.join('\n\n') || fallbackTitle || '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function getUIFlowEvidenceCount() {
  const navigation = document.getElementById('uiNavigationSteps')?.value.trim();
  const expected = document.getElementById('uiExpectedResult')?.value.trim();
  const actual = document.getElementById('uiActualResult')?.value.trim();
  return uiFlowScreenshots.length + (uiFlowRecording ? 1 : 0) + (navigation ? 1 : 0) + (expected ? 1 : 0) + (actual ? 1 : 0);
}

function updateUIFlowEvidenceBadge() {
  const badge = document.getElementById('uiFlowEvidenceBadge');
  if (badge) badge.textContent = `Evidence: ${getUIFlowEvidenceCount()}`;
}

function parseEvidenceLines(text) {
  const normalized = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\s+(?=(?:AC|TC|Step)?\s*\d+\s*[:.)-]\s*)/gi, '\n')
    .replace(/\s+(?=(?:For|When)\s+(?:valid|invalid|null|empty|blank|less|more|special|alphabetic|numeric)\b)/gi, '\n');
  const rawLines = normalized.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const items = [];
  rawLines.forEach(line => {
    const cleaned = line
      .replace(/^\s*(?:AC|TC|step)?\s*\d+\s*[:.)-]\s*/i, '')
      .replace(/^\s*[-*]\s*/, '')
      .trim();
    if (!cleaned) return;
    if (items.length && !/^(?:hit|open|enter|click|select|submit|verify|validate|navigate|for|when|then|and|user|system|display|url)\b/i.test(cleaned) && cleaned.length < 80) {
      items[items.length - 1] += ' ' + cleaned;
    } else {
      items.push(cleaned);
    }
  });
  return items;
}

function parseAcceptanceCriteria(text) {
  const items = parseEvidenceLines(text);
  if (items.length) return items;
  const fallback = String(text || '').trim();
  return fallback ? [fallback] : [];
}

function getCurrentTextareaLine(textarea) {
  const value = textarea.value || '';
  const cursor = textarea.selectionStart || 0;
  const before = value.slice(0, cursor);
  return before.slice(before.lastIndexOf('\n') + 1).trim();
}

function insertAtTextareaCursor(textarea, text) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || start;
  const value = textarea.value || '';
  textarea.value = value.slice(0, start) + text + value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function initAutoBulletTextarea(textarea) {
  if (!textarea || textarea.dataset.autoBulletReady === 'true') return;
  textarea.dataset.autoBulletReady = 'true';
  textarea.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const line = getCurrentTextareaLine(textarea);
    if (!line) return;
    const cleaned = line.replace(/^\s*(?:[-*]\s+|\d+[.)]\s*)/, '').trim();
    if (!/[.!?:;]$/.test(cleaned)) return;
    event.preventDefault();
    insertAtTextareaCursor(textarea, '\n- ');
  });
}

function isNegativeCriterion(text) {
  return /\b(invalid|null|empty|blank|less than|greater than|exceed|wrong|error|required|mandatory|not exist|does not exist|special character|alphabetic|blocked|failed|failure|denied|unauthorized)\b/i.test(String(text || ''));
}

function extractValidFunctionalAcceptanceCriteria(text) {
  const candidates = parseAcceptanceCriteria(text);
  const validItems = [];
  candidates.forEach(item => {
    const source = String(item || '').trim();
    if (!source) return;

    const explicitValid = source.match(/\b(?:for|when)\s+valid\b\s*[-:–—]?\s*([^.;\n]+)/i);
    if (explicitValid) {
      validItems.push(`For valid - ${explicitValid[1].trim()}`);
      return;
    }

    if (/\bvalid\b/i.test(source)) {
      const label = source.match(/^([^:–—-]+)\s*[:–—-]\s*/);
      const validClause = source
        .split(/\s*,\s*|\s*;\s*/g)
        .map(part => part.trim())
        .find(part => /\bvalid\b/i.test(part) && !/\binvalid\b/i.test(part));
      if (validClause) {
        validItems.push(`${label ? label[1].trim() + ' - ' : ''}${validClause}`.trim());
      }
      return;
    }

    if (!isNegativeCriterion(source)) validItems.push(source);
  });
  return uniqueValues(validItems);
}

function extractAllAcceptanceCriteriaScenarioItems(text) {
  const scenarioItems = [];
  parseAcceptanceCriteria(text).forEach(item => {
    const source = String(item || '').trim();
    if (!source) return;

    const explicitCondition = source.match(/\b(?:for|when)\s+([^:–—-]+?)\s*[-:–—]\s*([^.;\n]+)/i);
    if (explicitCondition) {
      scenarioItems.push({
        scenario: `For ${explicitCondition[1].trim()} - ${explicitCondition[2].trim()}`,
        value: explicitCondition[1].trim()
      });
      return;
    }

    const label = source.match(/^([^:–—-]+)\s*[:–—-]\s*/);
    const body = label ? source.slice(label[0].length).trim() : source;
    const parts = body.split(/\s*,\s*|\s*;\s*/g).map(part => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      parts.forEach(part => {
        scenarioItems.push({
          scenario: `${label ? label[1].trim() + ' - ' : ''}${part}`.trim(),
          value: part
        });
      });
      return;
    }

    const variants = extractScenarioVariants(source);
    if (variants.length) {
      variants.forEach(variant => {
        scenarioItems.push({
          scenario: `${label ? label[1].trim() + ' - ' : ''}${variant}`.trim(),
          value: variant
        });
      });
      return;
    }

    scenarioItems.push({ scenario: source, value: extractExactAcceptanceInputValues(source) || source });
  });

  const seen = new Set();
  return scenarioItems.filter(item => {
    const key = `${item.scenario}|${item.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseExpectedResultMappings(text) {
  const mappings = [];
  parseEvidenceLines(text).forEach(item => {
    const source = String(item || '').trim();
    if (!source) return;
    const match = source.match(/\b(?:for|when)\s+([^:–—-]+?)\s*[-:–—]\s*(.+)$/i);
    if (match) {
      mappings.push({ key: match[1].trim().toLowerCase(), expected: match[2].trim() });
    } else {
      mappings.push({ key: '', expected: source });
    }
  });
  return mappings;
}

function resolveExpectedResultForScenario(scenarioItem, expectedText) {
  const mappings = parseExpectedResultMappings(expectedText);
  if (!mappings.length) return '';
  const scenario = `${scenarioItem.scenario} ${scenarioItem.value}`.toLowerCase();
  const orderedMappings = mappings.slice().sort((a, b) => b.key.length - a.key.length);
  const exact = orderedMappings.find(item => item.key && new RegExp(`\\b${item.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(scenario));
  if (exact) return exact.expected;
  const inferredKey = /\b(invalid|null|empty|blank|less than|more than|greater than|non registered|non-registered|not registered|not exist|does not exist|special|alphabetic|alphabets|spaces|wrong|error|domain|format)\b/i.test(scenario)
    ? 'invalid'
    : /\b(valid|registered)\b/i.test(scenario)
      ? 'valid'
      : '';
  if (inferredKey) {
    const inferred = mappings.find(item => item.key === inferredKey || item.key.includes(inferredKey));
    if (inferred) return inferred.expected;
  }
  if (mappings.length === 1) return mappings[0].expected;
  const generic = mappings.find(item => !item.key);
  return generic ? generic.expected : '';
}

function extractScenarioTestData(scenarioItem) {
  const exact = extractExactAcceptanceInputValues(scenarioItem.scenario);
  if (exact) return exact;
  return String(scenarioItem.value || '').trim();
}

function getFinalUiActionFromNavigation(navigationText) {
  return parseEvidenceLines(navigationText)
    .map(step => String(step || '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(step => /^(click|tap|select|choose|submit|press)\b/i.test(step))
    .pop() || '';
}

function isInvalidAcceptanceCriteriaValue(value) {
  return /\b(invalid|null|empty|blank|less than|more than|greater than|non registered|non-registered|not registered|not exist|does not exist|special|alphabetic|alphabets|spaces|wrong|error|domain|format)\b/i.test(String(value || ''));
}

function isSensitiveAcceptanceCriteriaValue(text) {
  return /\b(mobile|phone|email|password|otp|pin|token|aadhaar|pan|card|account|credential|secret)\b/i.test(String(text || ''));
}

function buildDatabaseTableName(moduleName, visible) {
  const modulePart = String(moduleName || '').trim();
  if (modulePart) return `Mapped database table for ${modulePart}`;
  if (visible?.endpoint) return `Mapped database table for endpoint ${visible.endpoint}`;
  return 'Mapped database table for the tested module';
}

function buildDatabaseValidation(criterion, values, expected) {
  const scenarioText = `${criterion.scenario} ${values}`;
  if (isInvalidAcceptanceCriteriaValue(scenarioText)) {
    return `Verify the invalid/rejected value "${values || criterion.value || criterion.scenario}" is not saved as a successful business transaction. If validation/error logging is configured, verify only the rejection status/message is stored.`;
  }
  return `Verify the submitted value "${values || criterion.value || criterion.scenario}" is stored or updated in the mapped database table with the correct status and expected result "${expected}".`;
}

function buildEncryptionStorageCheck(criterion, values) {
  const scenarioText = `${criterion.scenario} ${values}`;
  if (isSensitiveAcceptanceCriteriaValue(scenarioText)) {
    return 'Verify sensitive data is encrypted, hashed, tokenized, or masked as per database policy and is not stored in plain text.';
  }
  return 'Verify stored database value follows the configured storage format and does not contain unintended plain-text sensitive data.';
}

function inferTestDataFromText(text) {
  const value = String(text || '').toLowerCase();
  if (/valid.*phone|phone.*valid|mobile.*valid/.test(value)) return 'Valid phone/mobile number registered for authentication';
  if (/invalid.*phone|phone.*invalid|not exist|does not exist/.test(value)) return 'Invalid or non-existing phone/mobile number';
  if (/null|empty|blank|required|mandatory/.test(value)) return 'Null, empty, blank, and whitespace-only value';
  if (/less than|minimum|min|10 numeric|digit/.test(value)) return 'Value below required digit/length limit';
  if (/special/.test(value)) return 'Special characters such as @, #, $, %, &, *';
  if (/alphabetic|character/.test(value)) return 'Alphabetic characters where numeric value is expected';
  if (/url/.test(value)) return 'Configured application URL';
  return 'Requirement-specific valid and invalid data set';
}

function normalizeScenarioVariant(text) {
  return String(text || '')
    .replace(/\bdoes\s+not\s+exist\b/ig, 'Non-existing value')
    .replace(/\bless\s+than\s+(\d+)\s+numerical?\s+digits?\b/ig, 'Less than $1 numeric digits')
    .replace(/\balphabetical?\s+characters?\b/ig, 'Alphabetic characters')
    .replace(/\bspecial\s+characters?\b/ig, 'Special characters')
    .replace(/\bnull\s+value\b/ig, 'Null value')
    .replace(/\binvalid\b/ig, 'Invalid value')
    .replace(/\bvalid\b/ig, 'Valid value')
    .trim();
}

function extractScenarioVariants(text) {
  const source = String(text || '').trim();
  if (!source) return [];
  const variantRegex = /\b(valid|invalid|does\s+not\s+exist|not\s+exist|non-existing|less\s+than\s+\d+\s+(?:numeric|numerical)?\s*digits?|alphabetic(?:al)?\s+characters?|special\s+characters?|null\s+value|null|empty|blank|whitespace|more\s+than\s+\d+\s+(?:numeric|numerical)?\s*digits?|greater\s+than\s+\d+|minimum|maximum|max\+1)\b/ig;
  const matches = [];
  let match;
  while ((match = variantRegex.exec(source)) !== null) {
    matches.push(normalizeScenarioVariant(match[0]));
  }
  const slashParts = source
    .split(/\s*(?:\/|,|;|\bor\b)\s*/i)
    .map(part => normalizeScenarioVariant(part))
    .filter(part => /\b(valid|invalid|existing|less than|more than|greater than|alphabetic|special|null|empty|blank|whitespace|minimum|maximum|max\+1)\b/i.test(part));
  return uniqueValues([...matches, ...slashParts]).slice(0, 12);
}

function describeVariantExpected(variant, criterion) {
  const text = `${variant} ${criterion}`;
  if (/\bvalid\b/i.test(text) && !/\binvalid\b/i.test(text)) {
    return 'Valid input is accepted and the expected successful result is displayed.';
  }
  if (/null|empty|blank|whitespace|required|mandatory/i.test(text)) {
    return 'Required-field validation is displayed and submission/authentication is blocked.';
  }
  if (/less than|more than|greater than|maximum|min|max|digit|length/i.test(text)) {
    return 'Length or boundary validation is displayed and the invalid value is rejected.';
  }
  if (/alphabetic|special|invalid|not exist|non-existing/i.test(text)) {
    return 'Invalid input validation is displayed and no successful transaction is created.';
  }
  return isNegativeCriterion(text)
    ? 'Negative condition is rejected with a clear validation/error message.'
    : 'Condition is validated according to the acceptance criteria.';
}

function inferWorkflowSteps(navigationText, expectedText, actualText) {
  const explicitSteps = parseEvidenceLines(navigationText);
  const criteria = parseAcceptanceCriteria(expectedText);
  const actualItems = parseAcceptanceCriteria(actualText);
  if (explicitSteps.length) {
    return explicitSteps.slice(0, 20).map((line, idx) => ({
      id: `WF-${idx + 1}`,
      screen: inferScreenFromAction(line, idx),
      action: line,
      expected: criteria[idx] || criteria[0] || 'Expected result should match the described image-based flow behavior.',
      actual: actualItems[idx] || actualItems[0] || 'Not executed / not provided.'
    }));
  }

  const text = `${navigationText || ''}\n${expectedText || ''}\n${actualText || ''}`;
  const patterns = [
    ['Login Screen', /\blog\s?in|sign\s?in|username|password|authenticate/i, 'Enter credentials and click Login', 'Dashboard is displayed successfully.'],
    ['Dashboard', /\bdashboard|home page|landing/i, 'Review landing dashboard', 'Dashboard widgets and navigation options are visible.'],
    ['Search Page', /\bsearch|filter|find/i, 'Search for the required item', 'Relevant search results are displayed.'],
    ['Product Details', /\bproduct detail|details|view product|select product/i, 'Open product details', 'Selected product details are displayed.'],
    ['Cart', /\bcart|basket|add to cart/i, 'Add selected item to cart', 'Cart count and cart summary update correctly.'],
    ['Checkout', /\bcheckout|payment|place order|confirm payment/i, 'Submit checkout details', 'Checkout is submitted without validation errors.'],
    ['Confirmation', /\bconfirmation|order created|success|receipt/i, 'Confirm final submission', 'Success confirmation and reference details are shown.'],
    ['Form Submission', /\bform|submit|save|create|update/i, 'Complete and submit form', 'Record is saved and confirmation is shown.'],
    ['Report / Export', /\breport|export|download/i, 'Generate or download report', 'Report output is generated in the selected format.']
  ];
  const steps = patterns
    .filter(item => item[1].test(text))
    .map((item, idx) => ({ id: `WF-${idx + 1}`, screen: item[0], action: item[2], expected: criteria[idx] || criteria[0] || item[3], actual: actualItems[idx] || actualItems[0] || 'Not executed / not provided.' }));

  if (!steps.length && uiFlowScreenshots.length) {
    return uiFlowScreenshots.map((shot, idx) => ({
      id: `WF-${idx + 1}`,
      screen: `Uploaded Screen ${idx + 1}`,
      action: idx === 0 ? 'Open initial screen' : `Navigate from Screen ${idx} to Screen ${idx + 1}`,
      expected: criteria[idx] || criteria[0] || `Screen ${idx + 1} is visible and matches uploaded UI evidence.`,
      actual: actualItems[idx] || actualItems[0] || 'Not executed / not provided.'
    }));
  }
  return steps.slice(0, 12);
}

function inferScreenFromAction(action, idx) {
  const text = String(action || '').toLowerCase();
  if (/login|sign in|password|username/.test(text)) return 'Login Screen';
  if (/dashboard|home/.test(text)) return 'Dashboard';
  if (/search|filter|find/.test(text)) return 'Search Page';
  if (/product|detail|view/.test(text)) return 'Details Screen';
  if (/cart|basket/.test(text)) return 'Cart Screen';
  if (/checkout|payment|order/.test(text)) return 'Checkout Screen';
  if (/confirm|success|receipt/.test(text)) return 'Confirmation Screen';
  if (/submit|save|create|update|form/.test(text)) return 'Form Screen';
  return `Image Flow Step ${idx + 1}`;
}

async function extractScreenshotOcrText() {
  const results = [];
  if (!uiFlowScreenshots.length) return results;
  try {
    await ensureTesseractLoaded();
  } catch (err) {
    console.warn('Screenshot OCR unavailable:', err);
    return results;
  }
  for (let idx = 0; idx < uiFlowScreenshots.length; idx++) {
    const shot = uiFlowScreenshots[idx];
    const cacheKey = `${shot.name}:${shot.size}`;
    if (uiVisualOcrCache[cacheKey]) {
      results.push(uiVisualOcrCache[cacheKey]);
      continue;
    }
    try {
      setUIFlowProgress(true, Math.min(34, 10 + idx * 6), `OCR extracting visible text from screenshot ${idx + 1} of ${uiFlowScreenshots.length}...`);
      const result = await Tesseract.recognize(shot.url, 'eng');
      const text = (result?.data?.text || '').replace(/\s+/g, ' ').trim();
      const item = { screen: `Screen ${idx + 1}`, name: shot.name, text };
      uiVisualOcrCache[cacheKey] = item;
      results.push(item);
    } catch (err) {
      console.warn('Screenshot OCR failed:', err);
      results.push({ screen: `Screen ${idx + 1}`, name: shot.name, text: '' });
    }
  }
  return results;
}

function inferVisualComponents(text) {
  const source = String(text || '');
  const components = [];
  const add = (componentType, label, location = 'screen', enabled = true) => {
    const key = `${componentType}:${label}`.toLowerCase();
    if (components.some(item => `${item.componentType}:${item.label}`.toLowerCase() === key)) return;
    components.push({ componentType, label, visible: true, enabled, location });
  };
  const rules = [
    ['Input Field', /\b(phone|mobile|email|username|password|otp|name|address|amount|date|search)\b/ig],
    ['Button', /\b(login|submit|continue|request otp|send otp|verify|save|cancel|close|search|filter|download|upload|add|delete|edit|reset)\b/ig],
    ['Link', /\b(forgot password|sign up|register|logout|terms|privacy|back)\b/ig],
    ['Dropdown', /\b(dropdown|select|country|state|type|category|role|status)\b/ig],
    ['Checkbox', /\b(checkbox|remember me|agree|terms)\b/ig],
    ['Radio Button', /\b(radio|yes|no|male|female)\b/ig],
    ['Table/Grid', /\b(table|grid|list|rows|columns|pagination|sort)\b/ig],
    ['Modal / Popup', /\b(popup|modal|dialog|otp|alert|confirmation)\b/ig],
    ['Upload Control', /\b(upload|choose file|attach|browse)\b/ig],
    ['Status Indicator', /\b(success|failed|error|invalid|required|active|pending|approved|rejected)\b/ig]
  ];
  rules.forEach(([type, regex]) => {
    let match;
    while ((match = regex.exec(source)) !== null) add(type, normalizeScenarioVariant(match[0]), 'detected from visual/OCR/evidence');
  });
  if (!components.length && uiFlowScreenshots.length) add('Screen', 'Uploaded UI Screen', 'screenshot');
  return components.slice(0, 30);
}

function inferActionsFromComponents(components, text) {
  const actionSet = new Set();
  components.forEach(component => {
    if (/button/i.test(component.componentType)) actionSet.add(`Click ${component.label}`);
    if (/input/i.test(component.componentType)) actionSet.add(`Enter text in ${component.label}`);
    if (/dropdown/i.test(component.componentType)) actionSet.add(`Select ${component.label}`);
    if (/checkbox/i.test(component.componentType)) actionSet.add(`Check and uncheck ${component.label}`);
    if (/upload/i.test(component.componentType)) actionSet.add(`Upload file using ${component.label}`);
    if (/table|grid/i.test(component.componentType)) actionSet.add(`Sort, filter, and review ${component.label}`);
    if (/modal|popup/i.test(component.componentType)) actionSet.add(`Open and close ${component.label}`);
  });
  parseEvidenceLines(text).forEach(line => actionSet.add(line));
  return Array.from(actionSet).slice(0, 40);
}

function inferBusinessRulesFromComponents(components, criteriaText) {
  const rules = [];
  components.forEach(component => {
    if (/phone|mobile/i.test(component.label)) rules.push('Mobile/phone number is mandatory, numeric-only, length validated, and rejects invalid/non-existing values.');
    if (/email/i.test(component.label)) rules.push('Email field must validate format, empty value, special characters, and unregistered email.');
    if (/password/i.test(component.label)) rules.push('Password field must show mandatory validation and reject invalid passwords.');
    if (/otp/i.test(component.label)) rules.push('OTP workflow must validate request, invalid OTP, resend, and successful verification.');
    if (/button/i.test(component.componentType)) rules.push(`${component.label} action must support enabled/disabled state and normal click handling.`);
  });
  extractScenarioVariants(criteriaText).forEach(variant => rules.push(`Datatype/validation rule detected: ${variant}.`));
  return uniqueValues(rules).slice(0, 30);
}

function inferVisualRisks(components, criteriaText) {
  const risks = ['Functional Risk: missing validations or incomplete visual evidence can cause false coverage.'];
  if (components.some(c => /input/i.test(c.componentType))) risks.push('Validation Risk: fields may accept empty, wrong-length, or invalid values.');
  if (components.some(c => /button|link/i.test(c.componentType))) risks.push('Workflow Risk: actions may be skipped or completed in the wrong order.');
  if (components.some(c => /modal|popup/i.test(c.componentType))) risks.push('Popup Risk: popup result messages must close and show the final result clearly.');
  if (/auth|login|otp|password|mobile|phone/i.test(criteriaText)) risks.push('Login Risk: valid and invalid login outcomes must be easy to verify.');
  return risks;
}

async function buildVisualAnalysisContext() {
  const evidence = getUnitFlowEvidence();
  const ocrItems = await extractScreenshotOcrText();
  const ocrText = ocrItems.map(item => `${item.screen} ${item.name}: ${item.text}`).join('\n');
  const combined = [ocrText, evidence.navigationText, evidence.expectedText, evidence.actualText].filter(Boolean).join('\n');
  const components = inferVisualComponents(combined);
  const actions = inferActionsFromComponents(components, combined);
  const workflows = inferWorkflowSteps(evidence.navigationText || actions.join('\n'), evidence.expectedText, evidence.actualText);
  const businessRules = inferBusinessRulesFromComponents(components, evidence.expectedText);
  const risks = inferVisualRisks(components, combined);
  return { ocrItems, ocrText, combinedText: combined, components, actions, workflows, businessRules, risks };
}

function extractVisibleUrlAndEndpoint(text) {
  const source = String(text || '');
  const urlMatch = source.match(/\bhttps?:\/\/[^\s"'<>),]+/i);
  const endpointMatch = source.match(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+)/i)
    || source.match(/\b(?:endpoint|api)\s*[:=-]\s*(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+)/i)
    || source.match(/\b\/api\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/i);
  const endpoint = endpointMatch ? (endpointMatch[1] || endpointMatch[0]).trim() : '';
  return {
    url: urlMatch ? urlMatch[0].trim() : '',
    endpoint: endpoint.replace(/^(?:endpoint|api)\s*[:=-]\s*/i, '').trim()
  };
}

function deriveModuleNameFromUrlAndEndpoint(url, endpoint) {
  const parts = [];
  try {
    if (url) {
      const parsed = new URL(url);
      const pathSegment = parsed.pathname.split('/').filter(Boolean)[0] || parsed.hostname;
      if (pathSegment) parts.push(pathSegment);
    }
  } catch (err) {
    const fallback = String(url || '').replace(/^https?:\/\//i, '').split(/[/?#]/)[1];
    if (fallback) parts.push(fallback);
  }
  if (endpoint) {
    const endpointSegment = String(endpoint).split(/[/?#]/)[0].split('/').filter(Boolean).find(Boolean);
    if (endpointSegment && !parts.includes(endpointSegment)) parts.push(endpointSegment);
  }
  return parts.join(' / ');
}

function extractExactAcceptanceInputValues(criteria) {
  const source = String(criteria || '');
  const values = [];
  const patterns = [
    /"([^"]+)"/g,
    /'([^']+)'/g,
    /`([^`]+)`/g,
    /\bhttps?:\/\/[^\s"'<>),]+/gi,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /\b\d{4,}\b/g,
    /\b(?:input|value|data|number|email|username|password|otp)\s*(?:is|=|:)\s*([^.;,\n]+)/gi
  ];
  patterns.forEach(regex => {
    let match;
    while ((match = regex.exec(source)) !== null) {
      const value = (match[1] || match[0] || '').trim();
      if (value && !values.includes(value)) values.push(value);
    }
  });
  if (!values.length && /\bvalid\b/i.test(source) && !/\binvalid\b/i.test(source)) {
    values.push('valid');
  }
  return values.join('\n');
}

function normalizeNavigationStepForAcceptanceCriteria(step, criterion, values, visible) {
  const source = String(step || '').replace(/^\s*\d+[.)]\s*/, '').trim();
  if (!source) return '';
  if (/^(hit|open|navigate|go to)\b/i.test(source) && /url|https?:\/\//i.test(source)) {
    return visible?.url ? `Navigate to URL: ${visible.url}` : source;
  }
  if (/^enter\b/i.test(source)) {
    return values
      ? `Enter Acceptance Criteria test data "${values}" for ${criterion.scenario}.`
      : `Enter the input value specified for Acceptance Criteria: ${criterion.scenario}.`;
  }
  if (/^(click|tap|select|choose|submit|press)\b/i.test(source)) {
    return `Perform UI action: ${source}.`;
  }
  return source;
}

function buildAcceptanceCriteriaSteps(criterion, values, visible, navigationText, expectedResult) {
  const navigationSteps = parseEvidenceLines(navigationText);
  const steps = [];
  if (navigationSteps.length) {
    navigationSteps.forEach(step => {
      const normalized = normalizeNavigationStepForAcceptanceCriteria(step, criterion, values, visible);
      if (normalized) steps.push(normalized);
    });
  } else {
    if (visible?.url) steps.push(`Navigate to URL: ${visible.url}`);
    if (visible?.endpoint) steps.push(`Open API endpoint: ${visible.endpoint}`);
    steps.push(values
      ? `Enter Acceptance Criteria test data "${values}" for ${criterion.scenario}.`
      : `Enter the input value specified for Acceptance Criteria: ${criterion.scenario}.`);
    steps.push('Perform the final UI action shown in the image.');
  }
  steps.splice(Math.min(1, steps.length), 0, `Declare Acceptance Criteria: ${criterion.scenario}.`);
  if (!steps.some(step => /^perform ui action:/i.test(step))) {
    steps.push('Perform the final UI action shown in the image.');
  }
  return uniqueValues(steps).map((step, index) => `${index + 1}. ${step.replace(/^\d+\.\s*/, '')}`).join('\n');
}

function buildAcceptanceCriteriaPreconditions(visible, moduleName) {
  const items = [];
  if (visible.url) items.push(`Application is accessible at ${visible.url}.`);
  if (visible.endpoint) items.push(`API endpoint is available: ${visible.endpoint}.`);
  if (moduleName) items.push(`${moduleName} module/page is available for testing.`);
  items.push('Acceptance Criteria and Expected Result are provided.');
  return uniqueValues(items).map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function buildDatabasePreconditions(visible, moduleName, databaseTable) {
  const items = [];
  if (visible.url) items.push(`Application workflow is executed from ${visible.url}.`);
  if (visible.endpoint) items.push(`API endpoint is available: ${visible.endpoint}.`);
  if (moduleName) items.push(`${moduleName} module/page execution result is available.`);
  items.push(`Read access to ${databaseTable} is available for validation.`);
  items.push('Database encryption/masking policy is available for comparison.');
  return uniqueValues(items).map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function buildDatabaseValidationSteps(databaseTable, databaseValidation, encryptionCheck) {
  return [
    `Connect to the database with read-only validation access.`,
    `Open ${databaseTable}.`,
    databaseValidation,
    encryptionCheck,
    'Record database validation evidence in the test execution comments.'
  ].filter(Boolean).map((step, index) => `${index + 1}. ${step}`).join('\n');
}

function buildAcceptanceCriteriaTestCaseRows(visualContext = {}) {
  const evidence = getUnitFlowEvidence();
  const criteria = extractAllAcceptanceCriteriaScenarioItems(evidence.expectedText);
  const visible = extractVisibleUrlAndEndpoint(visualContext.combinedText || '');
  const moduleName = deriveModuleNameFromUrlAndEndpoint(visible.url, visible.endpoint);
  const preconditions = buildAcceptanceCriteriaPreconditions(visible, moduleName);
  const finalAction = getFinalUiActionFromNavigation(evidence.navigationText);

  return criteria.flatMap((criterion, index) => {
    const testData = extractScenarioTestData(criterion);
    const expected = resolveExpectedResultForScenario(criterion, evidence.actualText) || criterion.scenario;
    const databaseTable = buildDatabaseTableName(moduleName, visible);
    const databaseValidation = buildDatabaseValidation(criterion, testData, expected);
    const encryptionCheck = buildEncryptionStorageCheck(criterion, testData);
    const scenarioParts = [
      criterion.scenario,
      finalAction ? `Action: ${finalAction}` : '',
      `Verify the Acceptance Criteria expected result: ${expected}.`
    ].filter(Boolean);
    const scenario = scenarioParts.join(' | ');
    const functionalRow = {
      id: `TC-${String(index + 1).padStart(3, '0')}`,
      moduleName,
      scenario,
      preconditions,
      steps: buildAcceptanceCriteriaSteps(criterion, testData, visible, evidence.navigationText, expected),
      testData,
      expected,
      databaseTable: 'N/A - separate database test case',
      databaseValidation: 'N/A - covered separately',
      encryptionCheck: 'N/A - covered separately',
      actualResult: 'Not Executed',
      status: 'Not Run',
      testerName: '',
      testingDate: '',
      buildVersion: '',
      reviewedBy: '',
      reviewDate: '',
      comments: ''
    };
    const dbRow = {
      id: `TC-DB-${String(index + 1).padStart(3, '0')}`,
      moduleName,
      scenario: `Database validation for ${criterion.scenario}`,
      preconditions: buildDatabasePreconditions(visible, moduleName, databaseTable),
      steps: buildDatabaseValidationSteps(databaseTable, databaseValidation, encryptionCheck),
      testData,
      expected: `${databaseValidation}\n${encryptionCheck}`,
      databaseTable,
      databaseValidation,
      encryptionCheck,
      actualResult: 'Not Executed',
      status: 'Not Run',
      testerName: '',
      testingDate: '',
      buildVersion: '',
      reviewedBy: '',
      reviewDate: '',
      comments: ''
    };
    return [functionalRow, dbRow];
  });
}

function renderAcceptanceCriteriaTestCaseSheet(rows) {
  const body = (rows || []).map(row => `
    <tr>
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.moduleName)}</td>
      <td>${escapeHtml(row.scenario)}</td>
      <td>${escapeHtml(row.preconditions).replace(/\n/g, '<br>')}</td>
      <td>${escapeHtml(row.steps).replace(/\n/g, '<br>')}</td>
      <td>${escapeHtml(row.testData).replace(/\n/g, '<br>')}</td>
      <td>${escapeHtml(row.expected)}</td>
      <td>${escapeHtml(row.databaseTable)}</td>
      <td>${escapeHtml(row.databaseValidation)}</td>
      <td>${escapeHtml(row.encryptionCheck)}</td>
      <td>${escapeHtml(row.actualResult)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.testerName)}</td>
      <td>${escapeHtml(row.testingDate)}</td>
      <td>${escapeHtml(row.buildVersion)}</td>
      <td>${escapeHtml(row.reviewedBy)}</td>
      <td>${escapeHtml(row.reviewDate)}</td>
      <td>${escapeHtml(row.comments)}</td>
    </tr>
  `).join('');
  return {
    count: (rows || []).length,
    html: `<div class="test-case-table-shell"><table class="test-case-table ac-test-case-table">${buildAcTestCaseColGroup()}<tr>${AC_TEST_CASE_COLUMNS.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr>${body}</table></div>`
  };
}

function mapResultEvidence(expectedText, actualText, steps) {
  const items = [];
  if (expectedText) {
    items.push({
      id: 'ER-1',
      text: expectedText,
      status: steps.length ? 'Mapped' : 'Missing',
      stepId: steps[0]?.id || ''
    });
  }
  if (actualText) {
    items.push({
      id: 'AR-1',
      text: actualText,
      status: expectedText && actualText.toLowerCase() === expectedText.toLowerCase() ? 'Matched' : 'Captured',
      stepId: steps[steps.length - 1]?.id || ''
    });
  }
  return items;
}

function calculateUIFlowConfidence(steps, resultMap) {
  const evidenceCount = getUIFlowEvidenceCount();
  if (!steps.length || evidenceCount < 2) return 0;
  const recordingBoost = uiFlowRecording ? 22 : 0;
  const screenshotBoost = Math.min(28, uiFlowScreenshots.length * 7);
  const resultBoost = resultMap.length ? Math.round((resultMap.length / 2) * 18) : 0;
  const navigationBoost = document.getElementById('uiNavigationSteps')?.value.trim() ? 22 : 0;
  return Math.min(98, 30 + recordingBoost + screenshotBoost + resultBoost + navigationBoost);
}

function getConfidenceClass(score) {
  if (score >= 90) return 'green';
  if (score >= 70) return 'amber';
  return 'red';
}

function buildUIFlowGeneratorInput() {
  if (!uiFlowAnalysis || !Array.isArray(uiFlowAnalysis.steps) || !uiFlowAnalysis.steps.length || uiFlowAnalysis.confidence < 70) return '';
  const steps = uiFlowAnalysis.steps.map((step, idx) => `${idx + 1}. Screen: ${step.screen}\n   Test Step / Navigation: ${step.action}\n   Acceptance Criteria: ${step.expected}\n   Expected Result: ${step.actual || 'Not provided.'}`).join('\n');
  const resultEvidence = (uiFlowAnalysis.resultMap || []).map(item => `${item.id}: ${item.text} - ${item.status}${item.stepId ? ` (${item.stepId})` : ''}`).join('\n');
  return [
    'IMAGE BASED TESTCASE GENERATOR FLOW INPUT',
    'Generate test cases strictly from Acceptance Criteria only. Do not create scenarios, steps, data, negative cases, edge cases, security, performance, accessibility, usability, or other non-functional cases unless explicitly present in the Acceptance Criteria.',
    `Image Based Flow Confidence Score: ${uiFlowAnalysis.confidence}%`,
    `Evidence Priority: ${uiFlowRecording ? 'Recording available' : 'No recording'}; ${uiFlowScreenshots.length} screenshot(s); pointwise navigation steps, acceptance criteria, and expected result included when provided.`,
    'Detected Screens, Navigation Steps, Acceptance Criteria, and Expected Results:',
    steps,
    resultEvidence ? 'Acceptance Criteria / Expected Result Evidence:\n' + resultEvidence : '',
    'Generation Rules: output columns must include TC ID, Module Name, Test Scenario, Preconditions, Test Steps, Test Data, Expected Result, Database Table, Database Validation, Encryption / Storage Format Check, Actual Result, Status, tester/reviewer fields, and Comments. Module Name must come from the URL/API endpoint visible in the image. Test Data must use exact input values from Acceptance Criteria.'
  ].filter(Boolean).join('\n\n');
}

function renderUIFlowScreenshots() {
  const preview = document.getElementById('uiScreenshotPreview');
  if (!preview) return;
  preview.innerHTML = uiFlowScreenshots.map((shot, idx) => `
    <div class="ui-thumb-card">
      <img src="${shot.url}" alt="${escapeHtml(shot.name)}" />
      <div>
        <strong>${escapeHtml(shot.name)}</strong>
        <span>Screen ${idx + 1}</span>
      </div>
      <div class="ui-thumb-actions">
        <button type="button" data-ui-shot-up="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
        <button type="button" data-ui-shot-down="${idx}" ${idx === uiFlowScreenshots.length - 1 ? 'disabled' : ''}>Down</button>
        <button type="button" data-ui-shot-remove="${idx}">Remove</button>
      </div>
    </div>
  `).join('');
  preview.querySelectorAll('[data-ui-shot-remove]').forEach(btn => btn.addEventListener('click', () => {
    uiFlowScreenshots.splice(Number(btn.dataset.uiShotRemove), 1);
    renderUIFlowScreenshots();
    updateUIFlowEvidenceBadge();
  }));
  preview.querySelectorAll('[data-ui-shot-up]').forEach(btn => btn.addEventListener('click', () => {
    const idx = Number(btn.dataset.uiShotUp);
    [uiFlowScreenshots[idx - 1], uiFlowScreenshots[idx]] = [uiFlowScreenshots[idx], uiFlowScreenshots[idx - 1]];
    renderUIFlowScreenshots();
  }));
  preview.querySelectorAll('[data-ui-shot-down]').forEach(btn => btn.addEventListener('click', () => {
    const idx = Number(btn.dataset.uiShotDown);
    [uiFlowScreenshots[idx + 1], uiFlowScreenshots[idx]] = [uiFlowScreenshots[idx], uiFlowScreenshots[idx + 1]];
    renderUIFlowScreenshots();
  }));
}

async function addUIFlowScreenshots(files) {
  const allowed = ['png', 'jpg', 'jpeg', 'webp'];
  for (const file of Array.from(files || [])) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      showToast('Only PNG, JPG, JPEG, and WEBP screenshots are supported.', 'error');
      continue;
    }
    const url = await readFileAsDataUrl(file);
    uiFlowScreenshots.push({ name: file.name, size: file.size, url });
  }
  renderUIFlowScreenshots();
  updateUIFlowEvidenceBadge();
}

function renderUIFlowRecording() {
  const preview = document.getElementById('uiRecordingPreview');
  if (!preview) return;
  if (!uiFlowRecording) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    return;
  }
  preview.style.display = 'block';
  preview.innerHTML = `
    <div class="ui-recording-meta">
      <strong>${escapeHtml(uiFlowRecording.name)}</strong>
      <span>${formatBytes(uiFlowRecording.size)}</span>
      <button type="button" id="uiRecordingRemoveBtn">Delete</button>
    </div>
    <div class="ui-upload-progress"><i style="width:100%"></i></div>
    <video controls src="${uiFlowRecording.url}"></video>
  `;
  document.getElementById('uiRecordingRemoveBtn')?.addEventListener('click', () => {
    uiFlowRecording = null;
    renderUIFlowRecording();
    updateUIFlowEvidenceBadge();
  });
}

async function setUIFlowRecording(file) {
  if (!file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['mp4', 'webm', 'mov'].includes(ext)) {
    showToast('Only MP4, WEBM, and MOV recordings are supported.', 'error');
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    showToast('Recording is too large. Maximum allowed size is 100 MB.', 'error');
    return;
  }
  const url = await readFileAsDataUrl(file);
  uiFlowRecording = { name: file.name, size: file.size, url };
  renderUIFlowRecording();
  updateUIFlowEvidenceBadge();
}

function setUIFlowProgress(visible, pct, text) {
  const wrap = document.getElementById('uiFlowProgress');
  const fill = document.getElementById('uiFlowProgressFill');
  const label = document.getElementById('uiFlowProgressText');
  const pctEl = document.getElementById('uiFlowProgressPct');
  if (wrap) wrap.style.display = visible ? 'block' : 'none';
  if (fill) fill.style.width = `${pct || 0}%`;
  if (label && text) label.textContent = text;
  if (pctEl) pctEl.textContent = `${pct || 0}%`;
  if (visible) {
    updateProcessingOverlay(null, text || 'Working on the image-based flow...', pct || 0);
  }
}

function renderUIFlowPreview() {
  const panel = document.getElementById('uiFlowPreviewPanel');
  const list = document.getElementById('uiDetectedWorkflow');
  const score = document.getElementById('uiConfidenceScore');
  const message = document.getElementById('uiFlowMessage');
  if (!panel || !list || !score || !message || !uiFlowAnalysis) return;
  panel.style.display = 'block';
  score.textContent = `${uiFlowAnalysis.confidence}% Match`;
  score.className = `ui-confidence ${getConfidenceClass(uiFlowAnalysis.confidence)}`;
  if (!uiFlowAnalysis.steps.length || uiFlowAnalysis.confidence < 70) {
    message.style.display = 'block';
    message.textContent = 'Unable to confidently reconstruct workflow. Please upload additional screenshots or recording.';
  } else {
    message.style.display = 'none';
  }
  list.innerHTML = uiFlowAnalysis.steps.map((step, idx) => `
    <div class="ui-step-card" data-ui-step="${idx}">
      <div class="ui-step-order">${idx + 1}</div>
      <input value="${escapeHtml(step.screen)}" data-ui-step-field="screen" aria-label="Workflow screen ${idx + 1}" />
      <textarea data-ui-step-field="action" aria-label="Workflow action ${idx + 1}">${escapeHtml(step.action)}</textarea>
      <textarea data-ui-step-field="expected" aria-label="Workflow expected result ${idx + 1}">${escapeHtml(step.expected)}</textarea>
      <textarea data-ui-step-field="actual" aria-label="Workflow expected result ${idx + 1}">${escapeHtml(step.actual || 'Not provided.')}</textarea>
      <div class="ui-step-actions">
        <button type="button" data-ui-step-up="${idx}" ${idx === 0 ? 'disabled' : ''}>Up</button>
        <button type="button" data-ui-step-down="${idx}" ${idx === uiFlowAnalysis.steps.length - 1 ? 'disabled' : ''}>Down</button>
        <button type="button" data-ui-step-delete="${idx}">Delete</button>
      </div>
    </div>
  `).join('');
  bindUIFlowStepControls();
  try {
    localStorage.setItem(UI_FLOW_STORAGE_KEY, JSON.stringify({ confidence: uiFlowAnalysis.confidence, steps: uiFlowAnalysis.steps, resultMap: uiFlowAnalysis.resultMap || [] }));
  } catch (err) {
    console.warn('Unable to persist UI flow analysis:', err);
  }
}

function syncUIFlowStepEdits() {
  if (!uiFlowAnalysis) return;
  document.querySelectorAll('#uiDetectedWorkflow [data-ui-step]').forEach(card => {
    const idx = Number(card.dataset.uiStep);
    const step = uiFlowAnalysis.steps[idx];
    if (!step) return;
    card.querySelectorAll('[data-ui-step-field]').forEach(field => {
      step[field.dataset.uiStepField] = field.value.trim();
    });
  });
}

function bindUIFlowStepControls() {
  document.querySelectorAll('#uiDetectedWorkflow [data-ui-step-field]').forEach(field => {
    field.addEventListener('input', syncUIFlowStepEdits);
  });
  document.querySelectorAll('[data-ui-step-delete]').forEach(btn => btn.addEventListener('click', () => {
    syncUIFlowStepEdits();
    uiFlowAnalysis.steps.splice(Number(btn.dataset.uiStepDelete), 1);
    uiFlowAnalysis.confidence = Math.max(0, uiFlowAnalysis.confidence - 4);
    renderUIFlowPreview();
  }));
  document.querySelectorAll('[data-ui-step-up]').forEach(btn => btn.addEventListener('click', () => {
    syncUIFlowStepEdits();
    const idx = Number(btn.dataset.uiStepUp);
    [uiFlowAnalysis.steps[idx - 1], uiFlowAnalysis.steps[idx]] = [uiFlowAnalysis.steps[idx], uiFlowAnalysis.steps[idx - 1]];
    renderUIFlowPreview();
  }));
  document.querySelectorAll('[data-ui-step-down]').forEach(btn => btn.addEventListener('click', () => {
    syncUIFlowStepEdits();
    const idx = Number(btn.dataset.uiStepDown);
    [uiFlowAnalysis.steps[idx + 1], uiFlowAnalysis.steps[idx]] = [uiFlowAnalysis.steps[idx], uiFlowAnalysis.steps[idx + 1]];
    renderUIFlowPreview();
  }));
}

async function analyzeUIWorkflow() {
  const navigationText = document.getElementById('uiNavigationSteps')?.value.trim() || '';
  const expectedText = document.getElementById('uiExpectedResult')?.value.trim() || '';
  const actualText = document.getElementById('uiActualResult')?.value.trim() || '';
  const evidenceCount = getUIFlowEvidenceCount();
  if (evidenceCount < 2) {
    uiFlowAnalysis = { confidence: 0, steps: [], resultMap: [] };
    renderUIFlowPreview();
    showToast('Unable to confidently reconstruct workflow. Please upload additional screenshots or recording.', 'warning', 6000);
    return;
  }
  const progressSteps = [
    [12, 'Screen Detection: identifying pages, forms, dialogs, and navigation cues...'],
    [30, 'Sequence Reconstruction: ordering screens and transitions...'],
    [48, 'Action Detection: extracting probable user actions...'],
    [66, 'Image Test Flow Reconstruction: building chronological journey...'],
    [84, 'Acceptance Criteria and Expected Result Mapping: checking described behavior...'],
    [100, 'Image Based Test Case Evidence Generation: preparing editable flow preview...']
  ];
  showProcessingOverlay('Please wait. eMudhra QA-Gen AI is reconstructing the image-based test flow...');
  setUIFlowProgress(true, 0, 'Starting AI workflow reconstruction...');
  for (const step of progressSteps) {
    await new Promise(resolve => setTimeout(resolve, 180));
    setUIFlowProgress(true, step[0], step[1]);
  }
  const steps = inferWorkflowSteps(navigationText, expectedText, actualText);
  const resultMap = mapResultEvidence(expectedText, actualText, steps);
  const confidence = calculateUIFlowConfidence(steps, resultMap);
  uiFlowAnalysis = { confidence, steps, resultMap };
  setUIFlowProgress(false, 0, '');
  renderUIFlowPreview();
  updateUIFlowEvidenceBadge();
  if (confidence >= 70) {
    showToast(`Image-based test flow reconstructed with ${confidence}% confidence. It will be added to the next analysis.`, 'success', 4500);
    if (typeof AppState !== 'undefined') AppState.addLog('Image-based test flow reconstructed for test generation', 'generation');
    showSuccessPopup('Image Test Flow Ready', `Image-based test flow reconstructed with ${confidence}% confidence.`);
  } else {
    hideProcessingOverlay();
    showToast('Unable to confidently reconstruct workflow. Please upload additional screenshots or recording.', 'warning', 6000);
  }
}

function getUnitFlowEvidence() {
  return {
    navigationText: document.getElementById('uiNavigationSteps')?.value.trim() || '',
    expectedText: document.getElementById('uiExpectedResult')?.value.trim() || '',
    actualText: document.getElementById('uiActualResult')?.value.trim() || '',
    screenshotCount: uiFlowScreenshots.length,
    hasRecording: !!uiFlowRecording
  };
}

function ensureUnitFlowAnalysis() {
  const evidence = getUnitFlowEvidence();
  syncUIFlowStepEdits();
  if (uiFlowAnalysis && Array.isArray(uiFlowAnalysis.steps) && uiFlowAnalysis.steps.length) return uiFlowAnalysis;
  const steps = inferWorkflowSteps(evidence.navigationText, evidence.expectedText, evidence.actualText);
  const resultMap = mapResultEvidence(evidence.expectedText, evidence.actualText, steps);
  const confidence = calculateUIFlowConfidence(steps, resultMap);
  uiFlowAnalysis = { confidence, steps, resultMap };
  renderUIFlowPreview();
  updateUIFlowEvidenceBadge();
  return uiFlowAnalysis;
}

function addVisualComponentRows(rows, visualContext, basePreconditions) {
  (visualContext.components || []).forEach((component, index) => {
    const req = `IMG-REQ-COMP-${String(index + 1).padStart(3, '0')} / ${component.componentType}`;
    const common = {
      module: 'Image Based Test Case Generator',
      req,
      preconditions: basePreconditions,
      automation: 'Candidate'
    };
    const componentLabel = `${component.componentType} - ${component.label}`;
    rows.push({
      ...common,
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      scenario: 'Component Positive Scenario',
      title: `${componentLabel} visibility and valid interaction`,
      priority: 'High',
      severity: 'High',
      testData: `${component.label}; visible=${component.visible}; enabled=${component.enabled}; location=${component.location}`,
      steps: `1. Open the screen with ${componentLabel}. 2. Check that it is visible and enabled. 3. Perform the normal user action. 4. Verify the expected message or screen change.`,
      expected: `${componentLabel} is visible, enabled where applicable, and completes the intended action successfully.`,
      risk: 'Component / Positive'
    });
    rows.push({
      ...common,
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      scenario: 'Component Negative Scenario',
      title: `${componentLabel} invalid/disabled interaction handling`,
      priority: 'High',
      severity: /input|button|upload/i.test(component.componentType) ? 'High' : 'Medium',
      testData: 'Invalid action, disabled state, or wrong sequence',
      steps: `1. Open the screen with ${componentLabel}. 2. Try an invalid, disabled, or wrong-sequence action. 3. Verify the error or blocked behavior. 4. Confirm the screen stays correct.`,
      expected: `${componentLabel} blocks invalid interaction and shows clear feedback.`,
      risk: 'Component / Negative'
    });
    if (/input|textarea|search/i.test(component.componentType)) {
      ['Empty value', 'Whitespace value', 'Minimum length', 'Maximum length', 'Special characters', 'Copy/Paste value'].forEach(variant => {
        rows.push({
          ...common,
          id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
          scenario: 'Component Validation Scenario',
          title: `${componentLabel} - ${variant}`,
          priority: /Empty|Maximum/i.test(variant) ? 'High' : 'Medium',
          severity: 'Medium',
          testData: variant,
          steps: `1. Open the screen with ${componentLabel}. 2. Enter ${variant} in the field. 3. Submit or continue the workflow. 4. Verify the validation message and screen state.`,
          expected: describeVariantExpected(variant, component.label),
          risk: 'Validation',
          automation: 'Yes'
        });
      });
    }
    if (/button/i.test(component.componentType)) {
      ['Click', 'Double click', 'Multiple click'].forEach(variant => {
        rows.push({
          ...common,
          id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
          scenario: 'Button Interaction Scenario',
          title: `${componentLabel} - ${variant}`,
          priority: 'Medium',
          severity: /Multiple|Double/i.test(variant) ? 'High' : 'Medium',
          testData: variant,
          steps: `1. Open the screen with ${componentLabel}. 2. Perform ${variant}. 3. Verify the expected result. 4. Confirm the screen does not submit the same action incorrectly.`,
          expected: `${componentLabel} handles ${variant} correctly and shows the expected result.`,
          risk: 'Button / Workflow',
          automation: 'Candidate'
        });
      });
    }
  });
}

function buildUnitTestCaseRows(visualContext = {}) {
  const evidence = getUnitFlowEvidence();
  const analysis = ensureUnitFlowAnalysis();
  const steps = Array.isArray(analysis.steps) ? analysis.steps : [];
  const navigationItems = parseEvidenceLines(evidence.navigationText);
  const acceptanceCriteria = parseAcceptanceCriteria(evidence.expectedText);
  const actualItems = parseAcceptanceCriteria(evidence.actualText);
  const rows = [];
  const evidenceSummary = [
    evidence.screenshotCount ? `${evidence.screenshotCount} screenshot(s)` : '',
    evidence.hasRecording ? 'screen recording' : '',
    acceptanceCriteria.length ? `${acceptanceCriteria.length} acceptance criteria` : '',
    evidence.actualText ? 'actual result evidence' : ''
  ].filter(Boolean).join(', ') || 'manual workflow description';
  const basePreconditions = `Image/UI evidence is available (${evidenceSummary}). Test environment, user account, and required data are ready.`;

  addVisualComponentRows(rows, visualContext, basePreconditions);

  if (evidence.screenshotCount) {
    uiFlowScreenshots.forEach((shot, idx) => {
      const screenLabel = `Screen ${idx + 1}`;
      rows.push({
        id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
        module: 'Image Based Test Case Generator',
        req: `IMG-REQ-SCREEN-${String(idx + 1).padStart(3, '0')} / Screenshot Evidence`,
        scenario: 'Screenshot Positive Verification',
        title: `${screenLabel} - verify visible UI evidence supports the workflow`,
        priority: 'High',
        severity: 'High',
        preconditions: basePreconditions,
        testData: `${shot.name}; ${formatBytes(shot.size)}`,
        steps: `1. Open uploaded ${screenLabel}. 2. Identify the visible page, fields, buttons, messages, and current state. 3. Match the screen with the related test step. 4. Note any mismatch before execution.`,
        expected: 'Screenshot supports the intended image-based flow and can be matched with the generated test steps.',
        risk: 'Screenshot Evidence / Positive',
        automation: 'Manual'
      });
      rows.push({
        id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
        module: 'Image Based Test Case Generator',
        req: `IMG-REQ-SCREEN-${String(idx + 1).padStart(3, '0')} / Screenshot Evidence`,
        scenario: 'Screenshot Negative Verification',
        title: `${screenLabel} - detect missing, unclear, or inconsistent UI evidence`,
        priority: 'Medium',
        severity: 'Medium',
        preconditions: basePreconditions,
        testData: `${shot.name}; unclear/missing field/action/message check`,
        steps: `1. Review uploaded ${screenLabel}. 2. Check whether required fields, buttons, or messages are missing or unclear. 3. Compare with the navigation steps. 4. Log the evidence gap.`,
        expected: 'Missing, unreadable, or inconsistent screenshot evidence is identified before execution.',
        risk: 'Screenshot Evidence / Negative',
        automation: 'Manual'
      });
    });
  }

  const effectiveSteps = steps.length ? steps : navigationItems.map((item, idx) => ({
    id: `WF-${idx + 1}`,
    screen: inferScreenFromAction(item, idx),
    action: item,
    expected: acceptanceCriteria[idx] || acceptanceCriteria[0] || 'Expected behavior should match acceptance criteria.',
    actual: actualItems[idx] || actualItems[0] || 'Not executed / not provided.'
  }));

  effectiveSteps.forEach((step, index) => {
    const stepNo = index + 1;
    const screen = step.screen || `Image Flow Step ${stepNo}`;
    const action = step.action || navigationItems[index] || `Execute workflow step ${stepNo}`;
    const expected = acceptanceCriteria[index] || step.expected || acceptanceCriteria[0] || 'Expected behavior should match acceptance criteria.';
    const actual = actualItems[index] || step.actual || 'Not executed / not provided.';
    const req = `IMG-REQ-STEP-${String(stepNo).padStart(3, '0')} / ${screen}`;
    rows.push({
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      module: 'Image Based Test Case Generator',
      req,
      scenario: 'Navigation Positive Scenario',
      title: `${screen} - execute valid navigation step`,
      priority: 'High',
      severity: 'High',
      preconditions: basePreconditions,
      testData: inferTestDataFromText(action),
      steps: `1. Open the screen for ${screen}. 2. Execute: ${action}. 3. Verify: ${expected}. 4. Check actual result: ${actual}.`,
      expected,
      risk: 'Navigation / Positive',
      automation: 'Candidate'
    });
    rows.push({
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      module: 'Image Based Test Case Generator',
      req,
      scenario: 'Navigation Negative Scenario',
      title: `${screen} - handle failed, skipped, or invalid navigation`,
      priority: 'High',
      severity: 'Medium',
      preconditions: basePreconditions,
      testData: 'Skipped action, wrong sequence, invalid input, unavailable page/control',
      steps: `1. Open the required screen. 2. Attempt the step in the wrong sequence or with invalid data: ${action}. 3. Verify the validation or blocked behavior. 4. Confirm the screen remains correct.`,
      expected: 'System blocks invalid navigation or failed action and displays clear feedback.',
      risk: 'Navigation / Negative',
      automation: 'Candidate'
    });
  });

  acceptanceCriteria.forEach((criterion, index) => {
    const criterionNo = index + 1;
    const negative = isNegativeCriterion(criterion);
    const relatedStep = effectiveSteps[index] || effectiveSteps[0] || {};
    const screen = relatedStep.screen || inferScreenFromAction(criterion, index);
    const action = relatedStep.action || navigationItems[index] || 'Execute related image-based workflow action';
    const req = `IMG-REQ-AC-${String(criterionNo).padStart(3, '0')} / Acceptance Criteria`;
    rows.push({
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      module: 'Image Based Test Case Generator',
      req,
      scenario: negative ? 'Acceptance Criteria Negative Scenario' : 'Acceptance Criteria Positive Scenario',
      title: `AC${criterionNo} - ${negative ? 'validate rejection/error behavior' : 'validate successful behavior'}`,
      priority: 'High',
      severity: negative ? 'High' : 'High',
      preconditions: basePreconditions,
      testData: inferTestDataFromText(criterion),
      steps: `1. Open the screen related to AC${criterionNo}. 2. Execute: ${action}. 3. Verify: ${criterion}. 4. Check the message and final screen state.`,
      expected: negative
        ? 'Invalid/negative condition is rejected with the expected validation message and no successful transaction is created.'
        : 'Valid condition completes successfully and the expected result is displayed.',
      risk: negative ? 'Acceptance Criteria / Negative' : 'Acceptance Criteria / Positive',
      automation: 'Candidate'
    });
    rows.push({
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      module: 'Image Based Test Case Generator',
      req,
      scenario: negative ? 'Acceptance Criteria Positive Control' : 'Acceptance Criteria Negative Control',
      title: `AC${criterionNo} - ${negative ? 'verify valid control still passes' : 'verify invalid control fails'}`,
      priority: 'High',
      severity: 'Medium',
      preconditions: basePreconditions,
      testData: negative ? 'Valid counterpart data for the same field/action' : 'Invalid, null, boundary, and malformed counterpart data',
      steps: `1. Open the screen related to AC${criterionNo}. 2. Execute the opposite condition for: ${criterion}. 3. Compare actual result with expected result. 4. Confirm the result is correct.`,
      expected: negative
        ? 'Valid control data is accepted, proving the validation rejects only invalid inputs.'
        : 'Invalid control data is rejected, proving the positive path does not accept bad input.',
      risk: 'Acceptance Criteria / Control',
      automation: 'Candidate'
    });

    const variantSource = `${criterion} ${navigationItems[index] || ''}`;
    const variants = extractScenarioVariants(variantSource);
    variants.forEach((variant) => {
      const variantNegative = isNegativeCriterion(variant);
      rows.push({
        id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
        module: 'Image Based Test Case Generator',
        req,
        scenario: variantNegative ? 'Datatype / Validation Negative Scenario' : 'Datatype / Validation Positive Scenario',
        title: `AC${criterionNo} - ${variant} datatype/validation check`,
        priority: 'High',
        severity: variantNegative ? 'High' : 'Medium',
        preconditions: basePreconditions,
        testData: inferTestDataFromText(variant),
        steps: `1. Open the related screen. 2. Execute: ${action}. 3. Enter test data: ${variant}. 4. Submit or continue. 5. Verify the message and final state.`,
        expected: describeVariantExpected(variant, criterion),
        risk: variantNegative ? 'Datatype Validation / Negative' : 'Datatype Validation / Positive',
        automation: 'Candidate'
      });
    });
  });

  if (evidence.hasRecording) {
    rows.push({
      id: `IMG-TC-${String(rows.length + 1).padStart(3, '0')}`,
      module: 'Image Based Test Case Generator',
      req: 'IMG-REQ-RECORDING / Flow Recording',
      scenario: 'Recording Transition Coverage',
      title: 'Validate uploaded recording transitions and actions',
      priority: 'Medium',
      severity: 'Medium',
      preconditions: basePreconditions,
      testData: uiFlowRecording ? `${uiFlowRecording.name} (${formatBytes(uiFlowRecording.size)})` : 'Recording evidence',
      steps: '1. Play the uploaded recording. 2. Verify transitions match the detected steps. 3. Note skipped, repeated, or failed actions.',
      expected: 'Recording evidence supports the generated image-based test flow.',
      risk: 'Workflow Transition',
      automation: 'Manual + Candidate'
    });
  }
  return rows;
}

async function generateUnitTestCases() {
  const evidenceCount = getUIFlowEvidenceCount();
  if (evidenceCount < 1) {
    showToast('Please add image-based test evidence: steps, acceptance criteria, screenshots, or recording.', 'error', 4500);
    return;
  }

  showProcessingOverlay('Please wait. eMudhra QA-Gen AI is generating Acceptance Criteria based test cases...');
  setUIFlowProgress(true, 0, 'Preparing image-based test case table...');
  const progressSteps = [
    [18, 'Reading Acceptance Criteria only...'],
    [38, 'Extracting URL and API endpoint from image evidence...'],
    [58, 'Identifying module name from visible URL/API endpoint...'],
    [78, 'Creating scenarios for all valid and invalid values present in Acceptance Criteria...'],
    [88, 'Formatting the complete test case sheet with execution and review columns...'],
    [100, 'Publishing Acceptance Criteria based test cases...']
  ];
  for (const step of progressSteps) {
    await new Promise(resolve => setTimeout(resolve, 120));
    setUIFlowProgress(true, step[0], step[1]);
  }

  const visualContext = await buildVisualAnalysisContext();
  const rows = buildAcceptanceCriteriaTestCaseRows(visualContext);
  if (!rows.length) {
    setUIFlowProgress(false, 0, '');
    hideProcessingOverlay();
    showToast('No Acceptance Criteria values found. Add explicit valid or invalid input values and expected behavior.', 'warning', 5000);
    return;
  }

  const rendered = renderAcceptanceCriteriaTestCaseSheet(rows);
  const visible = extractVisibleUrlAndEndpoint(visualContext.combinedText || '');
  generatedData.prd_analysis = renderDynamicTestPlan(
    [
      'Acceptance Criteria Generation Summary',
      'Test cases were generated strictly from Acceptance Criteria.',
      visible.url ? `URL Extracted From Image: ${visible.url}` : 'URL Extracted From Image: Not found',
      visible.endpoint ? `API Endpoint Extracted From Image: ${visible.endpoint}` : 'API Endpoint Extracted From Image: Not found',
      '',
      'Applied Rules',
      '- No invented scenarios.',
      '- No invented test data.',
      '- Negative, edge, security, performance, accessibility, usability, and non-functional cases excluded.',
      '',
      `Test Cases: ${rendered.count} row(s) generated. Functional UI rows and database validation rows are separated.`
    ].flat().join('\n'),
    '1. Acceptance Criteria Summary',
    'Strict Acceptance Criteria based generation',
    'VA'
  );
  generatedData.gap_analysis = renderDynamicTestPlan(
    [
      'Acceptance Criteria Mapping',
      ...rows.map(row => `- ${row.id}: ${row.scenario}`)
    ].join('\n'),
    '2. Acceptance Criteria Mapping',
    'Traceability between Acceptance Criteria and generated test cases',
    'AM'
  );
  generatedData.test_strategy = renderDynamicTestPlan(
    'Execute functional UI test cases first. Execute TC-DB rows separately for database storage, table validation, and encryption/storage-format checks.',
    '3. Acceptance Criteria Test Strategy',
    'Strict functional coverage focus',
    'US'
  );
  generatedData.risk_assessment = renderDynamicTestPlan(
    'No additional risk scenarios generated because the output is restricted to Acceptance Criteria only.',
    '4. Risk Analysis',
    'Restricted by Acceptance Criteria only',
    'RA'
  );
  generatedData.testcases = rendered.html;
  generatedData.coverage_matrix = renderDynamicTestPlan(
    rows.map(row => `${row.id} -> ${row.moduleName} -> ${row.scenario}`).join('\n'),
    '6. Coverage Matrix',
    'Acceptance Criteria to test case traceability',
    'CM'
  );
  const autoLangEl = document.getElementById('autoLangSelect');
  const autoLang = autoLangEl ? autoLangEl.value : 'java';
  if (automationEnabled) {
    const evidence = getUnitFlowEvidence();
    const automationInput = [
      'IMAGE BASED AUTOMATION INPUT',
      visualContext.combinedText || '',
      evidence.navigationText ? `Navigation Steps:\n${evidence.navigationText}` : '',
      evidence.expectedText ? `Acceptance Criteria:\n${evidence.expectedText}` : '',
      evidence.actualText ? `Expected Result:\n${evidence.actualText}` : '',
      rows.map(row => `${row.id}: ${row.scenario}`).join('\n')
    ].filter(Boolean).join('\n\n');
    generatedData.automation = renderDynamicAutomation(buildSmartAutomationOutput(automationInput, { testCases: rows.map(row => row.scenario).join('\n') }, autoLang), autoLang);
  } else {
    delete generatedData.automation;
  }

  const _fg = document.getElementById('featureGrid'); if (_fg) _fg.style.display = 'grid';
  const _osg = document.getElementById('outputStatsGrid'); if (_osg) _osg.style.display = 'grid';
  const _oa = document.getElementById('outputArea'); if (_oa) _oa.style.display = 'block';
  const _ol = document.getElementById('outputLoading'); if (_ol) _ol.style.display = 'none';
  setText('planStatus', 'Image-Ready');
  setText('tcCountDisplay', `${rendered.count} cases`);
  setText('covCountDisplay', 'AC Only');
  setText('autoCountDisplay', automationEnabled ? getAutomationLanguageMeta(autoLang).short : 'Disabled');
  updateOutputTabs('testcases');
  const stream = document.getElementById('outputStream');
  if (stream) {
    stream.innerHTML = generatedData.testcases;
    cleanupRenderedTestCaseTables(stream);
    resetGeneratedTableScroll(stream);
  }
  persistGeneratedOutput('Image Based TestCase Generator');
  setUIFlowProgress(false, 0, '');
  showSuccessPopup('Acceptance Criteria Test Cases Generated', `${rendered.count} test case(s) generated in the required test case sheet format.`);
}

function initUIFlowAnalyzer() {
  const screenshotInput = document.getElementById('uiScreenshotInput');
  const recordingInput = document.getElementById('uiRecordingInput');
  const screenshotDrop = document.getElementById('uiScreenshotDropZone');
  const recordingDrop = document.getElementById('uiRecordingDropZone');
  screenshotInput?.addEventListener('change', event => {
    addUIFlowScreenshots(event.target.files);
    event.target.value = '';
  });
  recordingInput?.addEventListener('change', event => {
    setUIFlowRecording(event.target.files && event.target.files[0]);
    event.target.value = '';
  });
  [screenshotDrop, recordingDrop].forEach(zone => {
    if (!zone) return;
    zone.addEventListener('dragover', event => {
      event.preventDefault();
      zone.classList.add('dragging');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  });
  screenshotDrop?.addEventListener('drop', event => {
    event.preventDefault();
    screenshotDrop.classList.remove('dragging');
    addUIFlowScreenshots(event.dataTransfer.files);
  });
  recordingDrop?.addEventListener('drop', event => {
    event.preventDefault();
    recordingDrop.classList.remove('dragging');
    setUIFlowRecording(event.dataTransfer.files && event.dataTransfer.files[0]);
  });
  ['uiNavigationSteps', 'uiExpectedResult', 'uiActualResult'].forEach(id => {
    const textarea = document.getElementById(id);
    textarea?.addEventListener('input', updateUIFlowEvidenceBadge);
    initAutoBulletTextarea(textarea);
  });
  document.getElementById('analyzeWorkflowBtn')?.addEventListener('click', analyzeUIWorkflow);
  document.getElementById('generateUnitTestCasesBtn')?.addEventListener('click', generateUnitTestCases);
  document.getElementById('uiAddStepBtn')?.addEventListener('click', () => {
    if (!uiFlowAnalysis) uiFlowAnalysis = { confidence: 70, steps: [], resultMap: [] };
    syncUIFlowStepEdits();
    const next = uiFlowAnalysis.steps.length + 1;
    uiFlowAnalysis.steps.push({ id: `WF-${next}`, screen: `Missing Step ${next}`, action: 'Describe user action', expected: 'Describe acceptance criteria', actual: 'Describe expected result.' });
    uiFlowAnalysis.confidence = Math.max(70, uiFlowAnalysis.confidence);
    renderUIFlowPreview();
  });
  updateUIFlowEvidenceBadge();
}

function activateHomeModule(moduleName) {
  const panels = {
    prd: document.getElementById('prdAnalyzerPanel'),
    unit: document.getElementById('unitTestCaseGenerator'),
    info: document.getElementById('moduleInfoPanel')
  };
  const infoContent = {
    gap: {
      title: 'Requirement Gap Analysis',
      desc: 'Review missing rules, unclear requirements, absent validations, API gaps, UX concerns, and incomplete acceptance criteria after generation.',
      chips: ['Missing Rules', 'API Gaps', 'Validation Gaps', 'UX Gaps', 'Business Risks']
    },
    testcases: {
      title: 'Enterprise Test Cases',
      desc: 'Generate the mandatory enterprise test case table using PRD content, attached files, acceptance criteria, image evidence, and validated screen flow evidence.',
      chips: ['21 Columns', 'Chronological Steps', 'Expected Results', 'Priority', 'Severity']
    },
    coverage: {
      title: 'Coverage Matrix',
      desc: 'Map requirements, risks, modules, and generated tests to confirm traceability and identify uncovered areas.',
      chips: ['Requirement Mapping', 'Risk Links', 'Traceability', 'Status', 'Coverage %']
    }
  };

  document.querySelectorAll('.module-selector').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.moduleTarget === moduleName);
  });
  Object.values(panels).forEach(panel => {
    if (!panel) return;
    panel.classList.remove('active');
    panel.style.display = 'none';
  });

  let activePanel = panels.prd;
  if (moduleName === 'unit') activePanel = panels.unit;
  if (['gap', 'testcases', 'coverage'].includes(moduleName)) {
    const data = infoContent[moduleName];
    const title = document.getElementById('moduleInfoTitle');
    const desc = document.getElementById('moduleInfoDesc');
    const body = document.getElementById('moduleInfoBody');
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc;
    if (body) {
      body.innerHTML = `
        <div class="module-info-visual">${data.title.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
        <div class="module-info-chips">${data.chips.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
        <p>Use the PRD Analysis module to generate this output. Once results are available, open the matching output tab on the right.</p>
      `;
    }
    activePanel = panels.info;
  }
  if (activePanel) {
    activePanel.style.display = 'flex';
    requestAnimationFrame(() => activePanel.classList.add('active'));
  }
}

function initHomeModuleSelectors() {
  document.querySelectorAll('.module-selector').forEach(btn => {
    btn.addEventListener('click', () => activateHomeModule(btn.dataset.moduleTarget || 'prd'));
  });
  activateHomeModule('prd');
}

function initSyncedModelSelectors() {
  const primary = document.getElementById('selectedModel');
  const mirrors = Array.from(document.querySelectorAll('.synced-model-select'));
  if (!primary || !mirrors.length) return;
  const syncFromPrimary = () => mirrors.forEach(select => { select.value = primary.value; });
  primary.addEventListener('change', syncFromPrimary);
  mirrors.forEach(select => {
    select.value = primary.value;
    select.addEventListener('change', () => {
      primary.value = select.value;
      primary.dispatchEvent(new Event('change', { bubbles: true }));
      syncFromPrimary();
    });
  });
  syncFromPrimary();
}

function initHomePageInteractions() {
  document.getElementById('successPopupClose')?.addEventListener('click', closeSuccessPopup);
  document.getElementById('successPopupOk')?.addEventListener('click', closeSuccessPopup);
  document.getElementById('successPopupOverlay')?.addEventListener('click', event => {
    if (event.target.id === 'successPopupOverlay') closeSuccessPopup();
  });
  initHomeModuleSelectors();
  initSyncedModelSelectors();
  initUIFlowAnalyzer();
  var automationToggle = document.getElementById('automationToggle');
  var toggleStateText = document.getElementById('toggleStateText');
  if (automationToggle) {
    automationToggle.addEventListener('change', function() {
      automationEnabled = this.checked;
      if (toggleStateText) {
        toggleStateText.textContent = automationEnabled ? 'ON' : 'OFF';
        toggleStateText.classList.toggle('off', !automationEnabled);
      }
      const autoTab = document.getElementById('automationTab');
      if (autoTab) autoTab.style.display = automationEnabled ? '' : 'none';
      showToast('Automation scripts: ' + (automationEnabled ? 'Enabled' : 'Disabled'), automationEnabled ? 'success' : 'info', 2000);
    });
  }

  // --- PRD Textarea Intelligence (debounce) ---
  var prdTextareaIntel = document.getElementById('prdTextarea');
  var intelDebounce;
  if (prdTextareaIntel) {
    prdTextareaIntel.addEventListener('input', function() {
      clearTimeout(intelDebounce);
      const val = this.value.trim();
      const panel = document.getElementById('prdIntelPanel');
      if (val.length < 30) {
        if (panel) panel.style.display = 'none';
        return;
      }
      intelDebounce = setTimeout(function() {
        const intel = analyzePRDIntelligence(val);
        renderPRDIntelPanel(intel);
      }, 700);
    });
  }

  // --- API Tests Button ---
  var generateApiTestsBtn = document.getElementById('generateApiTestsBtn');
  if (generateApiTestsBtn) {
    generateApiTestsBtn.addEventListener('click', async function() {
      var prdTextArea = document.getElementById('prdTextarea');
      var prdText = prdTextArea ? prdTextArea.value.trim() : '';
      if (!prdText && !attachedFileContent) {
        showToast('Please enter a PRD or API spec first.', 'error');
        return;
      }
      if (attachedFileParseStatus === 'fallback' && !prdText) {
        const recovered = await retryFallbackAttachmentIfPossible('API test generation');
        if (!recovered) {
          showToast(`Text extraction still failed: ${attachedFileParserWarning || 'OCR could not read this file'}. Paste PRD text or upload a text-based PDF/DOCX.`, 'warning', 9000);
          return;
        }
      }
      const finalInput = buildAnalysisInput(prdText, attachedFile ? attachedFile.name : '');
      if (typeof AppState !== 'undefined' && !AppState.consumeToken(80, document.getElementById('selectedModel')?.value || 'ollama')) {
        showToast('Insufficient tokens.', 'error');
        return;
      }
      startAPITestGeneration(finalInput);
    });
  }

  // --- File Input ---
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('click', function() {
      fileInput.value = '';
    });
  }

  // --- File Remove ---
  var fileRemoveBtn = document.getElementById('fileRemoveBtn');
  if (fileRemoveBtn) {
    fileRemoveBtn.addEventListener('click', function() {
      attachedFile = null;
      attachedFileContent = '';
      attachedFileParseStatus = 'idle';
      attachedFileParserWarning = '';
      if (fileInput) fileInput.value = '';
      var prev = document.getElementById('filePreview');
      var dropZone = document.getElementById('dropZone');
      if (prev) prev.style.display = 'none';
      if (dropZone) dropZone.classList.remove('file-loaded');
      showToast('File removed', 'info');
    });
  }

  // --- Drag & Drop ---
  var dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.style.borderStyle = 'solid';
      dropZone.style.borderColor = 'var(--accent-blue)';
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.style.borderStyle = 'dashed';
      dropZone.style.borderColor = 'var(--border-subtle)';
    });
    dropZone.addEventListener('drop', async function(e) {
      e.preventDefault();
      dropZone.style.borderStyle = 'dashed';
      dropZone.style.borderColor = 'var(--border-subtle)';
      var file = e.dataTransfer.files[0];
      if (file) processSelectedPRDFile(file, fileInput);
    });
  }

  // --- Output Tabs ---
  document.querySelectorAll('.out-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      if (tab.disabled || tab.classList.contains('disabled')) {
        showToast(tab.textContent.trim() + ' is not available for the current output.', 'info', 2500);
        return;
      }
      document.querySelectorAll('.out-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var type = tab.dataset.tab;
      var stream = document.getElementById('outputStream');
      if (stream && generatedData[type]) {
        stream.style.opacity = '0';
        stream.innerHTML = generatedData[type];
        void stream.offsetWidth;
        stream.style.transition = 'opacity 0.4s ease-in';
        stream.style.opacity = '1';
        cleanupRenderedTestCaseTables(stream);
        resetGeneratedTableScroll(stream);
      }
    });
  });

  // --- Analyze PRD Button ---
  var analyzeBtn = document.getElementById('analyzePrdBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async function() {
      var prdTextArea = document.getElementById('prdTextarea');
      var prdText = prdTextArea ? prdTextArea.value.trim() : '';
      var engineSelector = document.getElementById('selectedModel');
      var activeEngine = engineSelector ? engineSelector.value : 'openrouter';

      if (!prdText && !attachedFile) {
        showToast('Please enter text or attach a file to analyze.', 'error');
        return;
      }

      if (attachedFileParseStatus === 'fallback' && !prdText) {
        const recovered = await retryFallbackAttachmentIfPossible('analysis');
        if (!recovered) {
          showToast(`Text extraction still failed: ${attachedFileParserWarning || 'OCR could not read this file'}. Paste PRD text or upload a text-based PDF/DOCX.`, 'warning', 9000);
          return;
        }
      }

      if (prdText && typeof isMaliciousQuery === 'function') {
        const blockReason = isMaliciousQuery(prdText);
        if (blockReason) {
          const userRole = AppState.user && AppState.user.role ? AppState.user.role.toLowerCase() : '';
          const allowBypass = AppState.settings && AppState.settings.allowFlaggedInputs && userRole === 'admin';
          if (allowBypass) {
            AppState.addLog('Admin bypass used for flagged input', 'security');
            // Proceed without confirmation
            if (typeof AppState !== 'undefined' && !AppState.consumeToken(320, typeof activeEngine !== 'undefined' ? activeEngine : (document.getElementById('selectedModel') ? document.getElementById('selectedModel').value : 'openrouter'))) {
              showToast('Insufficient tokens. Please contact your administrator to recharge.', 'error');
              return;
            }
            document.querySelectorAll('[data-tokens]').forEach(function(el) {
              if (typeof AppState !== 'undefined') el.textContent = AppState.tokens.toLocaleString();
            });
            const finalInput = buildAnalysisInput(prdText, attachedFile ? attachedFile.name : 'PRD Input');
            startGeneration(finalInput);
            return;
          }

          // Offer a safe override — allow user to proceed after confirmation
          showConfirm(`Potentially unrelated or out-of-scope request detected: ${blockReason}.\n\nThis tool focuses on PRD analysis and test-case generation. Proceed anyway?`, async () => {
            // On confirm: perform token check and start generation
            if (typeof AppState !== 'undefined' && !AppState.consumeToken(320, typeof activeEngine !== 'undefined' ? activeEngine : (document.getElementById('selectedModel') ? document.getElementById('selectedModel').value : 'openrouter'))) {
              showToast('Insufficient tokens. Please contact your administrator to recharge.', 'error');
              return;
            }
            document.querySelectorAll('[data-tokens]').forEach(function(el) {
              if (typeof AppState !== 'undefined') el.textContent = AppState.tokens.toLocaleString();
            });
            const finalInput = buildAnalysisInput(prdText, attachedFile ? attachedFile.name : 'PRD Input');
            startGeneration(finalInput);
          });

          showToast('Potentially unrelated content detected — confirm to proceed.', 'warning', 6000);
          if (typeof AppState !== 'undefined') AppState.addLog('Flagged potentially unrelated query', 'security');
          return;
        }
      }

      if (typeof AppState !== 'undefined' && !AppState.consumeToken(320, typeof activeEngine !== 'undefined' ? activeEngine : (document.getElementById('selectedModel') ? document.getElementById('selectedModel').value : 'openrouter'))) {
        showToast('Insufficient tokens. Please contact your administrator to recharge.', 'error');
        return;
      }

      document.querySelectorAll('[data-tokens]').forEach(function(el) {
        if (typeof AppState !== 'undefined') el.textContent = AppState.tokens.toLocaleString();
      });

      // Prioritize file content if available, otherwise use textarea
      const finalInput = buildAnalysisInput(prdText, attachedFile ? attachedFile.name : 'PRD Input');
      
      startGeneration(finalInput);
    });
  }

  // --- Generate JSON Button ---
  var generateJsonBtn = document.getElementById('generateJsonBtn');
  if (generateJsonBtn) {
    generateJsonBtn.addEventListener('click', async function() {
      var prdTextArea = document.getElementById('prdTextarea');
      var prdText = prdTextArea ? prdTextArea.value.trim() : '';
      
      if (!prdText && !attachedFile) {
        showToast('Please enter a problem description first.', 'error');
        return;
      }

      if (attachedFileParseStatus === 'fallback' && !prdText) {
        const recovered = await retryFallbackAttachmentIfPossible('JSON generation');
        if (!recovered) {
          showToast(`Text extraction still failed: ${attachedFileParserWarning || 'OCR could not read this file'}. Paste PRD text or upload a text-based PDF/DOCX.`, 'warning', 9000);
          return;
        }
      }
      const finalInput = buildAnalysisInput(prdText, attachedFile ? attachedFile.name : '');
      startJsonGeneration(finalInput);
    });
  }

  // --- Export Button ---
  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() { openModal('exportModal'); });
  }

  // --- Export Rows ---
  document.querySelectorAll('.export-row').forEach(function(row) {
    row.addEventListener('click', async function() {
      var format = row.id.split('-')[1];
      var stream = $('outputStream');
      var text = getActiveOutputText();

      if (!stream || (!text.trim() && Object.keys(generatedData).length === 0)) {
        showToast('Generate or restore an output before exporting.', 'warning', 3500);
        return;
      }

      closeModal('exportModal');
      showToast('Preparing ' + format.toUpperCase() + ' export...', 'info');
      row.style.pointerEvents = 'none';
      row.style.opacity = '0.6';

      try {
        await yieldToBrowser();
        var tables = stream.querySelectorAll('table');
        var mainTable = stream.querySelector('.test-case-table') || stream.querySelector('table');
        
        function downloadBlob(blob, filename) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }

        if (format === 'xlsx') {
          await exportGeneratedWorkbook();
          showToast('Excel Export complete!', 'success');
        } else if (format === 'pdf' && typeof html2pdf !== 'undefined') {
          var opt = {
            margin:       [10, 10],
            filename:     buildExportFilename('pdf'),
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, width: mainTable ? 1900 : null },
            jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' } // Landscape A3 for wide tables
          };
          var clone = stream.cloneNode(true);
          clone.style.background = '#ffffff';
          clone.style.color = '#14213a';
          clone.style.padding = '24px';
          clone.style.width = mainTable ? '1850px' : 'auto';
          clone.style.fontFamily = 'Calibri, Arial, sans-serif';
          const pdfTitle = document.createElement('div');
          pdfTitle.textContent = 'eMudhra QA-Gen AI - Test Audit Report';
          pdfTitle.style.cssText = 'font-family:Calibri,Arial,sans-serif;font-size:22px;font-weight:700;color:#6e3a91;border-bottom:3px solid #f26a21;padding-bottom:10px;margin-bottom:16px;';
          clone.prepend(pdfTitle);
          clone.querySelectorAll('table').forEach(table => {
              table.style.borderCollapse = 'collapse';
              table.style.width = '100%';
              table.style.fontFamily = 'Calibri, Arial, sans-serif';
              table.style.fontSize = '10pt';
          });
          clone.querySelectorAll('th').forEach(th => {
              th.style.background = '#14213a';
              th.style.color = '#ffffff';
              th.style.border = '1px solid #d9e2ec';
              th.style.padding = '8px 10px';
              th.style.fontWeight = '700';
              th.style.textAlign = 'left';
          });
          clone.querySelectorAll('td').forEach((td, idx) => {
              td.style.color = '#14213a';
              td.style.border = '1px solid #d9e2ec';
              td.style.padding = '7px 9px';
              td.style.verticalAlign = 'top';
              td.style.background = idx % 2 ? '#ffffff' : '#f8fafc';
          });
          clone.querySelectorAll('tr').forEach((tr, idx) => {
              const first = tr.querySelector('td:first-child');
              if (first && idx > 0) {
                first.style.background = ['#eaf4ff', '#fff4e8', '#eef9f0', '#f4ecfa'][idx % 4];
                first.style.fontWeight = '700';
              }
          });
          html2pdf().set(opt).from(clone).save().then(function(){
             showToast('PDF Export complete!', 'success');
          }).finally(function() {
             row.style.pointerEvents = '';
             row.style.opacity = '';
          });
          return;
        } else if (format === 'docx') {
          var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Test Audit Report</title><style>table { border-collapse:collapse; width:100%; } th, td { border:1px solid #ccc; padding:8px; font-family:Arial; font-size:10pt; } th { background:#f2f2f2; }</style></head><body>";
          var footer = "</body></html>";
          var sourceHTML = header + stream.innerHTML + footer;
          var blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
          downloadBlob(blob, buildExportFilename('doc'));
          showToast('Word Export complete!', 'success');
        } else {
          var blob = new Blob([text], { type: 'text/plain' });
          downloadBlob(blob, buildExportFilename(format));
          showToast('Text Export complete!', 'success');
        }
      } catch (err) {
        console.error('Export failed:', err);
        showToast('Export failed: ' + err.message, 'error', 5000);
      } finally {
        row.style.pointerEvents = '';
        row.style.opacity = '';
      }
    });
  });

  // --- Copy Output ---
  var copyBtn = document.getElementById('copyOutputBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var stream = document.getElementById('outputStream');
      var text = stream ? stream.innerText : '';
      if (typeof copyToClipboard === 'function') copyToClipboard(text);
    });
  }

  // --- Edit Profile Save ---
  var saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', function() {
      var name  = document.getElementById('editName')  ? document.getElementById('editName').value.trim()  : '';
      var email = document.getElementById('editEmail') ? document.getElementById('editEmail').value.trim() : '';
      var role  = document.getElementById('editRole')  ? document.getElementById('editRole').value.trim()  : '';
      if (typeof AppState !== 'undefined') {
        AppState.updateUser({ name: name || AppState.user.name, email: email || AppState.user.email, role: role || AppState.user.role });
        if (typeof populateUserData === 'function') populateUserData();
      }
      showToast('Profile updated!', 'success');
      closeModal('editProfileModal');
    });
  }

  // Pre-fill edit profile modal
  var editProfileTrigger = document.querySelector('[data-action="edit-profile"]');
  if (editProfileTrigger && typeof AppState !== 'undefined') {
    editProfileTrigger.addEventListener('click', function() {
      var u = AppState.user;
      if (!u) return;
      var editName  = document.getElementById('editName');
      var editEmail = document.getElementById('editEmail');
      var editRole  = document.getElementById('editRole');
      if (editName)  editName.value  = u.name  || '';
      if (editEmail) editEmail.value = u.email || '';
      if (editRole)  editRole.value  = u.role  || '';
    });
  }

  // Theme selector live preview
  var themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() {
      if (typeof applyTheme === 'function') applyTheme(themeSelect.value);
    });
  }

  updateOutputTabs('prd_analysis');
  restoreGeneratedOutput();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePageInteractions);
} else {
  initHomePageInteractions();
}
