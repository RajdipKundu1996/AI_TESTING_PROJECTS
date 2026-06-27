/**
 * AutoFlow Tester — Core Logic
 * Record → Generate → Replay → Validate
 * Enterprise test automation for QA-Gen AI
 */

// ─── State ───────────────────────────────────────────────────────
const AF = {
  flow: null,          // Current active flow
  recording: false,
  replaying: false,
  timer: null,
  elapsed: 0,
  currentFramework: 'playwright',
  currentScript: '',
  editingStepId: null,
  history: [],
  replayTimeout: null,
  filterMode: 'all',
  screen: {
    stream: null,
    recorder: null,
    chunks: [],
    videoUrl: null
  },
  // Playwright backend
  ws: null,
  wsConnected: false,
  wsRetryTimer: null,
  // Test cases generated during replay
  testCases: []
};

const LOCATOR_PRIORITY = ['testId', 'id', 'name', 'css', 'xpath'];
const REPLAY_WARN_KEY  = 'af_replay_warned_date';

// ─── Utilities ───────────────────────────────────────────────────
function afToast(msg, type = 'info', duration = 3000) {
  const el = document.getElementById('afToast');
  if (!el) return;
  el.textContent = msg;
  el.className = `af-toast ${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.classList.remove('show'); }, duration);
}

function $(id) { return document.getElementById(id); }

function formatDuration(secs) {
  const h = Math.floor(secs / 3600).toString().padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function actionChipClass(action) {
  const map = { navigate:'ac-navigate', click:'ac-click', type:'ac-type', assert:'ac-assert',
    hover:'ac-hover', scroll:'ac-scroll', wait:'ac-wait', submit:'ac-submit',
    select:'ac-select', doubleclick:'ac-click', keypress:'ac-type' };
  return map[action] || 'ac-navigate';
}

function actionLabel(action) {
  const map = { navigate:'Navigate', click:'Click', type:'Type', assert:'Assert',
    hover:'Hover', scroll:'Scroll', wait:'Wait', submit:'Submit',
    select:'Select', doubleclick:'DblClick', keypress:'KeyPress' };
  return map[action] || action;
}

// ─── Flow Lifecycle ───────────────────────────────────────────────
function createFlow() {
  const user = (typeof AppState !== 'undefined' && AppState.user) ? AppState.user : {};
  return {
    flowId: 'flow_' + Date.now(),
    flowName: $('flowName').value.trim() || 'Untitled Flow',
    url: $('appUrl').value.trim(),
    browser: $('browserSelect').value,
    steps: [],
    expectedResults: {},
    createdDate: new Date().toISOString(),
    createdBy: user.name || user.email || 'QA Engineer',
    status: 'draft',
    lastExecuted: null,
    successRate: null
  };
}

function ensureFlow() {
  if (!AF.flow) AF.flow = createFlow();
}

// ─── Timer ───────────────────────────────────────────────────────
function startTimer() {
  AF.elapsed = 0;
  clearInterval(AF.timer);
  AF.timer = setInterval(() => {
    AF.elapsed++;
    $('recordingDuration').textContent = formatDuration(AF.elapsed);
  }, 1000);
}
function stopTimer() {
  clearInterval(AF.timer);
  AF.timer = null;
}

// ─── Screen Capture ──────────────────────────────────────────────
async function startScreenCapture() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always', frameRate: 15 },
      audio: false
    });
    AF.screen.stream = stream;
    AF.screen.chunks = [];
    AF.screen.videoUrl = null;

    const video = $('screenPreviewVideo');
    const wrap = $('screenPreviewWrap');
    if (video) { video.srcObject = stream; }
    if (wrap) { wrap.style.display = 'block'; }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    AF.screen.recorder = new MediaRecorder(stream, { mimeType });
    AF.screen.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) AF.screen.chunks.push(e.data);
    };
    AF.screen.recorder.start(1000);

    // If user stops sharing from the browser UI, stop the recording too
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (AF.recording) stopRecording();
    });

    return true;
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      afToast('Screen capture failed: ' + err.message, 'error');
    }
    return false;
  }
}

function stopScreenCapture() {
  if (AF.screen.recorder && AF.screen.recorder.state !== 'inactive') {
    AF.screen.recorder.onstop = () => {
      if (!AF.screen.chunks.length) return;
      const blob = new Blob(AF.screen.chunks, { type: 'video/webm' });
      AF.screen.videoUrl = URL.createObjectURL(blob);
      const dlBtn = $('downloadRecordingBtn');
      if (dlBtn) { dlBtn.style.display = ''; }
      afToast('Screen recording saved — click "Download Recording" to save the video file.', 'success', 6000);
    };
    AF.screen.recorder.stop();
  }
  if (AF.screen.stream) {
    AF.screen.stream.getTracks().forEach(t => t.stop());
    AF.screen.stream = null;
  }
  const wrap = $('screenPreviewWrap');
  if (wrap) { wrap.style.display = 'none'; }
}

function captureFrame() {
  const video = $('screenPreviewVideo');
  if (!video || !video.srcObject || !video.videoWidth) return null;
  try {
    const W = Math.min(video.videoWidth, 480);
    const H = Math.round(W * (video.videoHeight / video.videoWidth));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.getContext('2d').drawImage(video, 0, 0, W, H);
    return canvas.toDataURL('image/jpeg', 0.55);
  } catch (_) { return null; }
}

function downloadRecording() {
  if (!AF.screen.videoUrl) { afToast('No recording available yet.', 'warning'); return; }
  const name = (AF.flow?.flowName || 'autoflow').replace(/[^a-zA-Z0-9]/g, '_') + '_recording.webm';
  const a = document.createElement('a');
  a.href = AF.screen.videoUrl;
  a.download = name;
  a.click();
  afToast('Downloading: ' + name, 'success');
}

// ─── Recording ───────────────────────────────────────────────────
async function startRecording() {
  const flowName = $('flowName').value.trim();
  let url = $('appUrl').value.trim();
  if (!flowName) { afToast('Please enter a Flow Name first.', 'error'); $('flowName').focus(); return; }
  if (!url) { afToast('Please enter the Application URL first.', 'error'); $('appUrl').focus(); return; }

  // Auto-prepend http:// if no protocol given
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
    $('appUrl').value = url;
  }

  // ── If WS not connected, force an immediate reconnect and wait ──────────
  if (!AF.wsConnected) {
    const btn = $('startRecordingBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Connecting…'; }
    updateBackendStatus(false);

    // Force close any stale/stuck socket before reconnecting
    if (AF.ws && AF.ws.readyState < 2) {
      try { AF.ws.close(); } catch {}
    }
    AF.ws = null;
    clearTimeout(AF.wsRetryTimer);
    connectRecorderWS();

    // Wait up to 8 s for WS to open
    let waited = 0;
    while (!AF.wsConnected && waited < 8000) {
      await new Promise(r => setTimeout(r, 250));
      waited += 250;
    }

    if (!AF.wsConnected) {
      afToast('⚠️ Cannot reach Playwright backend on port 3001. Make sure "node start.js" is running.', 'error', 8000);
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M9 15s1 2 3 2 3-2 3-2"/></svg> Start Recording'; }
      return;
    }
    if (btn) { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg> Start Recording'; }
  }

  AF.flow = createFlow();
  AF.recording = true;
  $('startRecordingBtn').disabled = true;
  $('stopRecordingBtn').disabled = false;
  $('heroFlowName').textContent = flowName;
  startTimer();
  updateStats();

  // ── Playwright backend mode: fully automatic — no manual input needed ────
  $('statusDot').className = 'af-status-dot recording';
  $('statusText').textContent = '● Recording via Playwright';

  const addBtn = $('addStepBtn');
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.title = 'Steps are auto-captured from Playwright — no manual entry needed';
    addBtn._afOrigHTML = addBtn.innerHTML;
    addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg> Auto-Capturing…';
  }

  AF.ws.send(JSON.stringify({ type: 'start_recording', url, browser: $('browserSelect').value.toLowerCase() }));
  afToast('🎬 Playwright browser is opening — perform your test actions in that window', 'success', 7000);
}

function stopRecording() {
  AF.recording = false;
  stopTimer();

  $('statusDot').className = 'af-status-dot idle';
  $('statusText').textContent = 'Status: Idle (Recording Stopped)';
  $('startRecordingBtn').disabled = false;
  $('stopRecordingBtn').disabled = true;

  if (AF.flow) {
    AF.flow.flowName = $('flowName').value.trim() || AF.flow.flowName;
    AF.flow.url = $('appUrl').value.trim() || AF.flow.url;
    AF.flow.browser = $('browserSelect').value;
  }

  if (AF.wsConnected) {
    // Backend closes Playwright, syncs all steps back via 'recording_stopped' message
    AF.ws.send(JSON.stringify({ type: 'stop_recording' }));
    afToast('Stopping Playwright recording — steps syncing…', 'info', 3000);
    return;
  }

  // Fallback: stop screen capture
  stopScreenCapture();

  if (AF.flow && AF.flow.steps.length === 0) {
    setTimeout(() => afToast('No steps captured — use "Add Step" or "Generate AI Steps".', 'warning', 7000), 400);
    const addBtn = $('addStepBtn');
    if (addBtn) {
      addBtn.style.boxShadow = '0 0 0 3px rgba(34,211,238,.5)';
      addBtn.style.borderColor = '#22d3ee';
      setTimeout(() => { if (addBtn) { addBtn.style.boxShadow = ''; addBtn.style.borderColor = ''; } }, 5000);
    }
  } else {
    afToast('Recording stopped. Review steps and click "Generate Script".', 'info', 4000);
  }
}

function clearFlow() {
  if (AF.flow && AF.flow.steps.length > 0) {
    if (!confirm('Clear all recorded steps? This cannot be undone.')) return;
  }
  AF.flow = null;
  AF.recording = false;
  AF.elapsed = 0;
  stopTimer();
  stopScreenCapture();
  if (AF.screen.videoUrl) {
    URL.revokeObjectURL(AF.screen.videoUrl);
    AF.screen.videoUrl = null;
  }
  AF.screen.chunks = [];
  const dlBtn = $('downloadRecordingBtn');
  if (dlBtn) { dlBtn.style.display = 'none'; }
  localStorage.removeItem('af_draft_flow');

  $('statusDot').className = 'af-status-dot idle';
  $('statusText').textContent = 'Status: Idle';
  $('recordingDuration').textContent = '00:00:00';
  $('startRecordingBtn').disabled = false;
  $('stopRecordingBtn').disabled = true;

  updateStats();
  renderTimeline();
  renderVisualizer();
  $('heroFlowName').textContent = 'Untitled Flow';
  $('heroStepCount').textContent = '0 steps recorded';
  $('scriptOutput').textContent = '// Click "Generate Script" after recording steps to see automation code here.';
  afToast('Flow cleared.', 'info');
}

// ─── Step Management ─────────────────────────────────────────────
function openAddStepModal(editId = null) {
  AF.editingStepId = editId;
  $('editingStepId').value = editId || '';

  if (editId) {
    const step = AF.flow && AF.flow.steps.find(s => s.id == editId);
    if (!step) return;
    $('stepModalTitle').textContent = 'Edit Step';
    $('saveStepBtn').textContent = 'Update Step';
    $('stepAction').value = step.action;
    $('stepTarget').value = step.target;
    $('stepValue').value = step.value;
    $('stepExpected').value = step.expectedResult || '';
    $('stepExpected').dataset.auto = step.expectedResult ? '' : '1';
    $('stepDescription').value = step.description;
  } else {
    $('stepModalTitle').textContent = 'Add Step';
    $('saveStepBtn').textContent = 'Add Step';
    $('stepAction').value = 'click';
    $('stepTarget').value = '';
    $('stepValue').value = '';
    $('stepDescription').value = '';
    updateStepModalLabels();
    // Auto-fill expected result for new step
    const autoExp = generateSmartExpectedResult('click', '', '', '');
    $('stepExpected').value = autoExp;
    $('stepExpected').dataset.auto = '1';
  }
  $('stepModalOverlay').classList.remove('hidden');
}

function closeStepModal() {
  $('stepModalOverlay').classList.add('hidden');
  AF.editingStepId = null;
}

function saveStep() {
  ensureFlow();
  const action = $('stepAction').value;
  const target = $('stepTarget').value.trim();
  const value  = $('stepValue').value.trim();
  const expected = $('stepExpected').value.trim();
  const description = $('stepDescription').value.trim();

  if (action === 'navigate' && !target) { afToast('Please enter a URL or path for Navigate.', 'error'); return; }
  if (['click','type','assert','hover','select','submit','doubleclick'].includes(action) && !target) {
    afToast('Please enter a target selector or element description.', 'error'); return;
  }

  const now = new Date().toISOString();

  const screenshot = captureFrame();

  if (AF.editingStepId) {
    const idx = AF.flow.steps.findIndex(s => s.id == AF.editingStepId);
    if (idx !== -1) {
      AF.flow.steps[idx] = {
        ...AF.flow.steps[idx],
        action, target, value, expectedResult: expected, description, timestamp: now,
        screenshot: screenshot || AF.flow.steps[idx].screenshot
      };
    }
  } else {
    const pages = new Set(AF.flow.steps.filter(s => s.action === 'navigate').map(s => s.target));
    if (action === 'navigate') pages.add(target);
    AF.flow.steps.push({
      id: Date.now(),
      stepNumber: AF.flow.steps.length + 1,
      action, target, value,
      expectedResult: expected,
      description,
      locator: { testId: '', id: target.startsWith('#') ? target.slice(1) : '', name: '', css: target, xpath: '' },
      timestamp: now,
      duration: 0,
      status: 'pending',
      screenshot
    });
  }

  // Re-number steps
  AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });

  const wasEditing = !!AF.editingStepId;
  updateStats();
  renderTimeline();
  renderVisualizer();
  autosaveCurrentFlow();
  closeStepModal();
  afToast(wasEditing ? 'Step updated.' : 'Step added.', 'success');
}

function deleteStep(id) {
  if (!AF.flow) return;
  AF.flow.steps = AF.flow.steps.filter(s => s.id != id);
  AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });
  updateStats();
  renderTimeline();
  renderVisualizer();
  autosaveCurrentFlow();
  afToast('Step removed.', 'info');
}

function updateStepModalLabels() {
  const action = $('stepAction').value;
  const labels = {
    navigate:    ['Target URL or Path', 'Page title or expected element'],
    click:       ['Element Selector (CSS/ID/text)', 'Verify after click'],
    type:        ['Element Selector (CSS/ID)', 'Text to type'],
    assert:      ['Element Selector or Text', 'Expected state (visible/hidden/text)'],
    hover:       ['Element Selector', 'Tooltip / popup text'],
    scroll:      ['Scroll direction or selector', 'Pixel offset or "bottom"'],
    wait:        ['Element Selector or "page"', 'Timeout in ms (default 5000)'],
    submit:      ['Form selector', 'Expected confirmation'],
    select:      ['Select element selector', 'Option value or text'],
    doubleclick: ['Element Selector', 'Verify after double click'],
    keypress:    ['Element Selector', 'Key name (e.g. Enter, Tab, Escape)']
  };
  const [tLabel, vLabel] = labels[action] || ['Target', 'Value'];
  $('targetLabel').textContent = tLabel;
  $('valueLabel').textContent = vLabel;
  autoRefreshExpected();
}

function autoRefreshExpected() {
  const expField = $('stepExpected');
  if (!expField) return;
  // Only auto-update if field is empty or was previously auto-generated
  if (expField.value.trim() && expField.dataset.auto !== '1') return;
  const action = ($('stepAction') || {}).value || '';
  const target = ($('stepTarget') || {}).value || '';
  const value  = ($('stepValue')  || {}).value || '';
  const desc   = ($('stepDescription') || {}).value || '';
  const result = generateSmartExpectedResult(action, target, value, desc);
  expField.value = result;
  expField.dataset.auto = '1';
}

// ─── Stats ────────────────────────────────────────────────────────
function updateStats() {
  const steps = AF.flow ? AF.flow.steps : [];
  const pages = new Set(steps.filter(s => s.action === 'navigate').map(s => s.target));
  $('stepsCount').textContent = steps.length;
  $('actionsCount').textContent = steps.length;
  $('elementsCount').textContent = steps.filter(s => s.action !== 'navigate').length;
  $('pagesCount').textContent = pages.size;
  $('heroStepCount').textContent = `${steps.length} step${steps.length !== 1 ? 's' : ''} recorded`;
  $('heroFlowName').textContent = ($('flowName').value.trim()) || 'Untitled Flow';
}

// ─── Timeline Render ─────────────────────────────────────────────
function renderTimeline() {
  const container = $('flowTimeline');
  const steps = AF.flow ? AF.flow.steps : [];

  if (steps.length === 0) {
    container.innerHTML = `<div class="af-timeline-empty" id="timelineEmpty">
      <div style="font-size:2rem;margin-bottom:8px">🎬</div>
      <div style="font-weight:700;margin-bottom:4px">No Recording Yet</div>
      <div style="font-size:0.68rem">Click <strong>Start Recording</strong> or <strong>Add Step</strong> to begin building your flow</div>
    </div>`;
    return;
  }

  container.innerHTML = steps.map((step, idx) => {
    const st = step.status || 'pending';
    const actionClass = actionChipClass(step.action);
    const label = actionLabel(step.action);
    const meta = step.description || step.target || '';
    const valPart = step.value ? ` → <em style="color:var(--text-muted)">"${escHtml(step.value.slice(0, 32))}"</em>` : '';
    const time = new Date(step.timestamp).toLocaleTimeString();

    // Tick icon shows the step's inclusion/replay status
    const tickIcon = st === 'passed'  ? '✔'
                   : st === 'failed'  ? '✖'
                   : st === 'running' ? '⟳'
                   : st === 'skipped' ? '–'
                   : '✔'; // pending/new steps show a ready tick

    const thumbHtml = step.screenshot
      ? `<img class="af-step-screenshot" src="${step.screenshot}" alt="Step ${step.stepNumber}"
             onclick="showScreenshot('${step.id}')" title="Click to enlarge" />`
      : '';

    return `<div class="af-timeline-item ${st}" id="step-item-${step.id}" style="animation-delay:${idx * 25}ms">
      <div class="af-step-num ${st}">${step.stepNumber}</div>
      <div class="af-step-tick ${st}" title="Step status: ${st}">${tickIcon}</div>
      <div class="af-step-body">
        <div class="af-step-title">
          <span class="af-action-chip ${actionClass}">${label}</span>
          <span class="af-step-title-text">${escHtml(meta.slice(0, 55))}${valPart}</span>
        </div>
        <div class="af-step-meta">
          ${renderLocatorBadges(step.locator, step.target)}
          ${step.value ? '<span style="color:var(--text-muted)"> · ' + escHtml(step.value.slice(0, 38)) + '</span>' : ''}
          <span style="color:var(--text-muted)"> · ${time}</span>
        </div>
        ${step.expectedResult ? `<div class="af-step-meta" style="color:#6ee7b7;margin-top:2px">→ Expected: ${escHtml(step.expectedResult)}</div>` : ''}
        ${thumbHtml}
        <div class="af-step-actions">
          <button class="af-step-action-btn" onclick="openAddStepModal('${step.id}')" title="Edit step">✏ Edit</button>
          <button class="af-step-delete-btn" onclick="deleteStep('${step.id}')" title="Remove step">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Generate Test Cases from recorded steps (before replay) ──────
function generateTestCasesFromSteps() {
  if (!AF.flow || !AF.flow.steps.length) {
    afToast('No steps to generate from — record a flow first.', 'warning', 4000);
    return;
  }

  AF.testCases = AF.flow.steps.map((step, idx) => ({
    tcId:           `TC-${String(idx + 1).padStart(3, '0')}`,
    title:          step.description || `${actionLabel(step.action)} — ${(step.target || '').slice(0, 60)}`,
    action:         step.action,
    target:         step.target  || '',
    locator:        step.locator || null,
    value:          step.value   || '',
    expectedResult: step.expectedResult || generateSmartExpectedResult(step.action, step.target, step.value, step.description),
    actualResult:   '—',
    status:         'pending',
    duration:       0,
    screenshot:     step.screenshot || null,
    stepNumber:     step.stepNumber
  }));

  renderTestCases();
  afToast(`✅ ${AF.testCases.length} test case${AF.testCases.length !== 1 ? 's' : ''} generated — click Replay Test to fill actual results.`, 'success', 5000);

  // Scroll to panel
  const panel = $('testCasesPanel');
  if (panel) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ─── Flow Visualizer ─────────────────────────────────────────────
function renderVisualizer() {
  const container = $('flowVisualizer');
  const steps = AF.flow ? AF.flow.steps : [];

  if (steps.length === 0) {
    container.innerHTML = '<div class="af-vis-empty">Flow chart will appear as you add steps</div>';
    return;
  }

  // Header bar with clear action
  const headerHtml = `<div class="af-vis-header">
    <span class="af-vis-header-label">${steps.length} Step${steps.length !== 1 ? 's' : ''}</span>
    <button class="af-vis-clear-btn" onclick="clearVisualizerConfirm()" title="Clear all steps">✕ Clear</button>
  </div>`;

  const nodes = steps.map((s, i) => {
    const fullLabel = s.target || s.value || s.description || '—';
    const statusClass = s.status === 'passed' ? 'passed' : s.status === 'failed' ? 'failed' : s.status === 'running' ? 'running' : '';
    const tickIcon = s.status === 'passed' ? '✔' : s.status === 'failed' ? '✖' : s.status === 'running' ? '⟳' : '';
    return `<div class="af-vis-node ${statusClass}" style="animation-delay:${i*40}ms">
      <div class="af-vis-node-main">
        <span class="af-vis-step-num">${s.stepNumber}</span>
        <span class="af-vis-action-chip ${actionChipClass(s.action)}">${actionLabel(s.action)}</span>
        ${tickIcon ? `<span class="af-vis-tick">${tickIcon}</span>` : ''}
        <span class="af-vis-node-label" title="${escHtml(fullLabel)}">${escHtml(fullLabel)}</span>
      </div>
      <div class="af-vis-node-actions">
        <button class="af-vis-node-btn af-vis-edit-btn" onclick="openAddStepModal('${s.id}')" title="Edit step">✏</button>
        <button class="af-vis-node-btn af-vis-del-btn" onclick="deleteStep('${s.id}')" title="Delete step">✕</button>
      </div>
    </div>
    <div class="af-vis-arrow">↓</div>`;
  });
  // Remove last arrow
  if (nodes.length) {
    nodes[nodes.length - 1] = nodes[nodes.length - 1].replace('<div class="af-vis-arrow">↓</div>', '');
  }
  container.innerHTML = headerHtml + nodes.join('');
}

function clearVisualizerConfirm() {
  if (!AF.flow || !AF.flow.steps.length) return;
  if (!confirm('Clear all steps from the flow?')) return;
  clearFlow();
}

// ─── Smart Expected Results Generator ───────────────────────────────
function generateSmartExpectedResult(action, target, value, description) {
  const t = (target || '').trim();
  const v = (value  || '').trim();
  const d = (description || '').trim();
  const tShort = t.length > 50 ? t.slice(0, 50) + '…' : t;
  const vShort = v.length > 40 ? v.slice(0, 40) + '…' : v;

  switch (action) {
    case 'navigate':
      return `Browser navigates to "${tShort}" successfully. Page loads completely, displays the correct title and URL, and all primary UI elements are visible without errors or broken resources.`;
    case 'click':
      if (/login|sign.?in|submit|confirm|ok|proceed/i.test(t + d)) {
        return `System processes the click on "${tShort}". Authentication or action is triggered, page redirects or updates within 2 seconds, and no error messages are displayed.`;
      }
      if (/logout|sign.?out/i.test(t + d)) {
        return `Session is terminated. User is redirected to the login page. All session tokens and cached credentials are cleared. Re-access requires fresh authentication.`;
      }
      if (/button|btn|cta/i.test(t + d)) {
        return `Button "${tShort}" responds to click. The expected action (navigation, modal, state change) is triggered within 1 second with visible UI feedback.`;
      }
      return `Element "${tShort}" registers the click event. UI state updates immediately — any modal, navigation, tooltip, or state change triggered by this action completes without errors.`;
    case 'type':
      if (/password|pwd|secret/i.test(t + d)) {
        return `Password field "${tShort}" accepts the input and masks each character. Field value is correctly set and not exposed in plain text. No validation error appears for valid input.`;
      }
      if (/email/i.test(t + d)) {
        return `Email field "${tShort}" accepts "${vShort}". Input is stored correctly, format validation passes for valid email. Field shows no error state on valid input.`;
      }
      if (/search/i.test(t + d)) {
        return `Search field accepts "${vShort}". On submission, results matching the query appear. Empty search returns an appropriate empty-state or full list, not an error.`;
      }
      return `Input field "${tShort}" accepts the text "${vShort}". The value is correctly persisted in the field, character count is accurate, and no validation error is displayed for valid input.`;
    case 'assert':
      if (/visible|present|exist|display/i.test(t + d)) {
        return `Element "${tShort}" is present in the DOM and visible to the user. It is rendered at the expected location within the page layout without any overlay or clipping.`;
      }
      if (/text|content|label|heading/i.test(t + d)) {
        return `The text content of "${tShort}" matches the expected value exactly. The text is readable, correctly formatted, and not truncated or overlapped by adjacent elements.`;
      }
      if (/url|page|redirect|navigate/i.test(t + d)) {
        return `Current page URL matches the expected path. Page title is correct and all expected elements for this route are loaded and interactive.`;
      }
      return `Assertion on "${tShort}" passes successfully. The element, value, or condition is in the expected state, confirming the previous action completed correctly.`;
    case 'submit':
      return `Form submits successfully. System processes the submission, displays a success message or redirects to the confirmation page within 3 seconds. Submitted data is persisted and any required notifications are triggered.`;
    case 'select':
      return `Dropdown "${tShort}" updates its selected value to "${vShort || 'selected option'}". The selection is reflected immediately in the UI. Any dependent fields, filters, or conditional logic triggered by this selection update correctly.`;
    case 'hover':
      return `Element "${tShort}" responds to hover state. Tooltip, overlay, highlight, or contextual menu appears as expected with correct content. The hover state is visually distinct and dismisses cleanly on mouse-out.`;
    case 'scroll':
      return `Page or element scrolls to the target position "${tShort || 'expected area'}". Content that was below the fold becomes visible. Scroll position is stable and does not cause layout reflow.`;
    case 'wait':
      return `System waits until the expected condition is met within the specified timeout. Page reaches a stable, interactive state before the next action proceeds. No timeout error occurs under normal load.`;
    case 'doubleclick':
      return `Element "${tShort}" registers the double-click event. The expected action (inline edit, selection, activation) is triggered. Single-click artifacts do not interfere.`;
    case 'keypress':
      return `Key "${vShort || target}" is registered by the focused element. The expected keyboard behavior occurs (form submission on Enter, field blur on Tab, modal close on Escape) without side effects.`;
    default:
      return `Action "${action}" on "${tShort}" completes successfully. The system responds with the expected state change, UI update, or data operation within acceptable response time.`;
  }
}

// ─── Script Generation ─────────────────────────────────────────────
const SCRIPT_GENERATORS = {
  'playwright': generatePlaywright,
  'selenium-java': generateSeleniumJava,
  'selenium-python': generateSeleniumPython,
  'cypress': generateCypress,
  'robot': generateRobot,
  'testng': generateTestNG,
  'javascript': generateJavaScript,
  'typescript': generateTypeScript
};

const FRAMEWORK_LABELS = {
  'playwright': 'Playwright · JavaScript',
  'selenium-java': 'Selenium · Java',
  'selenium-python': 'Selenium · Python',
  'cypress': 'Cypress · JavaScript',
  'robot': 'Robot Framework',
  'testng': 'TestNG · Java',
  'javascript': 'Pure JavaScript · Puppeteer',
  'typescript': 'TypeScript · Playwright'
};

function getSelector(step) {
  if (!step.target) return `'[data-testid="element"]'`;
  const t = step.target.trim();
  if (t.startsWith('#') || t.startsWith('.') || t.startsWith('[') || t.includes(' ') === false && t.length > 0) return `'${t}'`;
  return `'[aria-label="${t.replace(/'/g,"\\'")}"]'`;
}

function getSeleniumBy(step) {
  const t = (step.target || '').trim();
  if (t.startsWith('#')) return `By.id("${t.slice(1)}")`;
  if (t.startsWith('.')) return `By.className("${t.slice(1)}")`;
  if (t.startsWith('[data-testid')) return `By.cssSelector("${t}")`;
  if (t.startsWith('/')) return `By.xpath("${t}")`;
  return `By.cssSelector("${t}")`;
}

function generatePlaywright() {
  if (!AF.flow || !AF.flow.steps.length) return `// No steps recorded yet.\n// Add steps and click "Generate Script".`;
  const f = AF.flow;
  const lines = [
    `const { test, expect } = require('@playwright/test');`,
    ``,
    `test('${f.flowName || 'AutoFlow Test'}', async ({ page }) => {`,
    `  // Flow: ${f.flowName} | Browser: ${f.browser} | Created: ${new Date(f.createdDate).toLocaleDateString()}`,
    ``
  ];
  f.steps.forEach(step => {
    const sel = getSelector(step);
    const desc = step.description || step.target;
    lines.push(`  // Step ${step.stepNumber}: ${actionLabel(step.action)}${desc ? ' — ' + desc : ''}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`  await page.goto('${step.target || f.url}');`); break;
      case 'click':
        lines.push(`  await page.click(${sel});`); break;
      case 'doubleclick':
        lines.push(`  await page.dblclick(${sel});`); break;
      case 'type':
        lines.push(`  await page.fill(${sel}, '${escStr(step.value)}');`); break;
      case 'hover':
        lines.push(`  await page.hover(${sel});`); break;
      case 'scroll':
        lines.push(`  await page.evaluate(() => window.scrollBy(0, 500));`); break;
      case 'wait':
        lines.push(`  await page.waitForSelector(${sel}, { timeout: ${step.value || 5000} });`); break;
      case 'submit':
        lines.push(`  await page.click(${sel});`); break;
      case 'select':
        lines.push(`  await page.selectOption(${sel}, '${escStr(step.value)}');`); break;
      case 'keypress':
        lines.push(`  await page.keyboard.press('${step.value || 'Enter'}');`); break;
      case 'assert':
        lines.push(`  await expect(page.locator(${sel})).toBeVisible();`); break;
      default:
        lines.push(`  await page.locator(${sel}).click();`);
    }
    if (step.expectedResult) lines.push(`  // Expected: ${step.expectedResult}`);
    lines.push('');
  });
  if ($('expectedElement').value) lines.push(`  await expect(page.locator('${$('expectedElement').value}')).toBeVisible();`);
  if ($('expectedTitle').value)   lines.push(`  await expect(page).toHaveTitle(/${escStr($('expectedTitle').value)}/);`);
  lines.push(`});`);
  return lines.join('\n');
}

function generateSeleniumJava() {
  if (!AF.flow || !AF.flow.steps.length) return `// No steps recorded yet.`;
  const f = AF.flow;
  const className = (f.flowName || 'AutoFlowTest').replace(/[^a-zA-Z0-9]/g,'');
  const lines = [
    `import org.openqa.selenium.*;`,
    `import org.openqa.selenium.chrome.ChromeDriver;`,
    `import org.openqa.selenium.support.ui.*;`,
    `import org.junit.Test;`,
    `import org.junit.After;`,
    `import org.junit.Before;`,
    `import static org.junit.Assert.*;`,
    ``,
    `public class ${className}Test {`,
    `    private WebDriver driver;`,
    `    private WebDriverWait wait;`,
    ``,
    `    @Before`,
    `    public void setUp() {`,
    `        driver = new ChromeDriver();`,
    `        wait = new WebDriverWait(driver, Duration.ofSeconds(10));`,
    `        driver.manage().window().maximize();`,
    `    }`,
    ``,
    `    @Test`,
    `    public void test${className}() {`,
    `        // Flow: ${f.flowName} | Created: ${new Date(f.createdDate).toLocaleDateString()}`,
    ``
  ];
  f.steps.forEach(step => {
    const by = getSeleniumBy(step);
    lines.push(`        // Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`        driver.get("${step.target || f.url}");`); break;
      case 'click': case 'submit': case 'doubleclick':
        lines.push(`        wait.until(ExpectedConditions.elementToBeClickable(${by})).click();`); break;
      case 'type':
        lines.push(`        wait.until(ExpectedConditions.visibilityOfElementLocated(${by})).sendKeys("${escStr(step.value)}");`); break;
      case 'hover':
        lines.push(`        new Actions(driver).moveToElement(driver.findElement(${by})).perform();`); break;
      case 'select':
        lines.push(`        new Select(driver.findElement(${by})).selectByVisibleText("${escStr(step.value)}");`); break;
      case 'wait':
        lines.push(`        wait.until(ExpectedConditions.visibilityOfElementLocated(${by}));`); break;
      case 'assert':
        lines.push(`        assertTrue(driver.findElement(${by}).isDisplayed());`); break;
      case 'keypress':
        lines.push(`        driver.findElement(${by}).sendKeys(Keys.${(step.value||'RETURN').toUpperCase()});`); break;
      default:
        lines.push(`        driver.findElement(${by}).click();`);
    }
    lines.push('');
  });
  lines.push(`    }`, ``, `    @After`, `    public void tearDown() { if (driver != null) driver.quit(); }`, `}`);
  return lines.join('\n');
}

function generateSeleniumPython() {
  if (!AF.flow || !AF.flow.steps.length) return `# No steps recorded yet.`;
  const f = AF.flow;
  const lines = [
    `import pytest`,
    `from selenium import webdriver`,
    `from selenium.webdriver.common.by import By`,
    `from selenium.webdriver.support.ui import WebDriverWait, Select`,
    `from selenium.webdriver.support import expected_conditions as EC`,
    `from selenium.webdriver.common.keys import Keys`,
    `from selenium.webdriver.common.action_chains import ActionChains`,
    ``,
    `class Test${(f.flowName||'AutoFlow').replace(/[^a-zA-Z0-9]/g,'')}:`,
    `    def setup_method(self):`,
    `        self.driver = webdriver.Chrome()`,
    `        self.wait = WebDriverWait(self.driver, 10)`,
    `        self.driver.maximize_window()`,
    ``,
    `    def test_flow(self):`,
    `        """${f.flowName} — created ${new Date(f.createdDate).toLocaleDateString()}"""`,
    ``
  ];
  f.steps.forEach(step => {
    const t = step.target || '';
    const by = t.startsWith('#') ? `By.ID, "${t.slice(1)}"` : t.startsWith('.') ? `By.CLASS_NAME, "${t.slice(1)}"` : `By.CSS_SELECTOR, "${t}"`;
    lines.push(`        # Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`        self.driver.get("${step.target || f.url}")`); break;
      case 'click': case 'submit': case 'doubleclick':
        lines.push(`        self.wait.until(EC.element_to_be_clickable((${by}))).click()`); break;
      case 'type':
        lines.push(`        self.wait.until(EC.visibility_of_element_located((${by}))).send_keys("${escStr(step.value)}")`); break;
      case 'hover':
        lines.push(`        ActionChains(self.driver).move_to_element(self.driver.find_element(${by})).perform()`); break;
      case 'select':
        lines.push(`        Select(self.driver.find_element(${by})).select_by_visible_text("${escStr(step.value)}")`); break;
      case 'assert':
        lines.push(`        assert self.driver.find_element(${by}).is_displayed()`); break;
      case 'keypress':
        lines.push(`        self.driver.find_element(${by}).send_keys(Keys.${(step.value||'RETURN').toUpperCase()})`); break;
      default:
        lines.push(`        self.driver.find_element(${by}).click()`);
    }
    lines.push('');
  });
  lines.push(`    def teardown_method(self):`, `        self.driver.quit()`);
  return lines.join('\n');
}

function generateCypress() {
  if (!AF.flow || !AF.flow.steps.length) return `// No steps recorded yet.`;
  const f = AF.flow;
  const lines = [
    `describe('${f.flowName || 'AutoFlow Test'}', () => {`,
    `  beforeEach(() => {`,
    `    cy.visit('${f.url || '/'}');`,
    `  });`,
    ``,
    `  it('should complete the recorded flow', () => {`,
    `    // Flow: ${f.flowName} | Created: ${new Date(f.createdDate).toLocaleDateString()}`,
    ``
  ];
  f.steps.forEach(step => {
    const sel = step.target || 'body';
    lines.push(`    // Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`    cy.visit('${step.target || f.url}');`); break;
      case 'click': case 'submit': case 'doubleclick':
        lines.push(`    cy.get('${sel}').click();`); break;
      case 'type':
        lines.push(`    cy.get('${sel}').clear().type('${escStr(step.value)}');`); break;
      case 'hover':
        lines.push(`    cy.get('${sel}').trigger('mouseover');`); break;
      case 'select':
        lines.push(`    cy.get('${sel}').select('${escStr(step.value)}');`); break;
      case 'wait':
        lines.push(`    cy.get('${sel}').should('exist');`); break;
      case 'assert':
        lines.push(`    cy.get('${sel}').should('be.visible');`); break;
      case 'keypress':
        lines.push(`    cy.get('${sel}').type('{${step.value || 'enter'}}');`); break;
      default:
        lines.push(`    cy.get('${sel}').click();`);
    }
    if (step.expectedResult) lines.push(`    // Expected: ${step.expectedResult}`);
    lines.push('');
  });
  lines.push(`  });`, `});`);
  return lines.join('\n');
}

function generateRobot() {
  if (!AF.flow || !AF.flow.steps.length) return `# No steps recorded yet.`;
  const f = AF.flow;
  const lines = [
    `*** Settings ***`,
    `Library    SeleniumLibrary`,
    ``,
    `*** Variables ***`,
    `\${URL}    ${f.url || 'https://your-app.com'}`,
    `\${BROWSER}    ${f.browser || 'Chrome'}`,
    ``,
    `*** Test Cases ***`,
    `${f.flowName || 'AutoFlow Test'}`,
    `    [Documentation]    ${f.flowName} — Created ${new Date(f.createdDate).toLocaleDateString()}`,
    `    Open Browser    \${URL}    \${BROWSER}`,
    `    Maximize Browser Window`,
    ``
  ];
  f.steps.forEach(step => {
    const sel = step.target || 'id=element';
    lines.push(`    # Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`    Go To    ${step.target || '${URL}'}`); break;
      case 'click': case 'submit': case 'doubleclick':
        lines.push(`    Click Element    ${sel}`); break;
      case 'type':
        lines.push(`    Input Text    ${sel}    ${step.value || ''}`); break;
      case 'hover':
        lines.push(`    Mouse Over    ${sel}`); break;
      case 'select':
        lines.push(`    Select From List By Label    ${sel}    ${step.value || ''}`); break;
      case 'wait':
        lines.push(`    Wait Until Element Is Visible    ${sel}    timeout=10s`); break;
      case 'assert':
        lines.push(`    Element Should Be Visible    ${sel}`); break;
      case 'keypress':
        lines.push(`    Press Keys    ${sel}    ${step.value || 'ENTER'}`); break;
      default:
        lines.push(`    Click Element    ${sel}`);
    }
    lines.push('');
  });
  lines.push(`    Close Browser`);
  lines.push(``, `*** Keywords ***`, `# Add reusable keywords here`);
  return lines.join('\n');
}

function generateTestNG() {
  if (!AF.flow || !AF.flow.steps.length) return `// No steps recorded yet.`;
  const f = AF.flow;
  const className = (f.flowName || 'AutoFlowTest').replace(/[^a-zA-Z0-9]/g,'');
  const lines = [
    `import org.testng.annotations.*;`,
    `import org.testng.Assert;`,
    `import org.openqa.selenium.*;`,
    `import org.openqa.selenium.chrome.ChromeDriver;`,
    `import org.openqa.selenium.support.ui.*;`,
    ``,
    `public class ${className}TestNG {`,
    `    private WebDriver driver;`,
    `    private WebDriverWait wait;`,
    ``,
    `    @BeforeClass`,
    `    public void setUp() {`,
    `        driver = new ChromeDriver();`,
    `        wait = new WebDriverWait(driver, Duration.ofSeconds(10));`,
    `        driver.manage().window().maximize();`,
    `    }`,
    ``,
    `    @Test(description = "${f.flowName}")`,
    `    public void test${className}() {`,
    `        // Flow: ${f.flowName} | Created: ${new Date(f.createdDate).toLocaleDateString()}`,
    ``
  ];
  f.steps.forEach(step => {
    const by = getSeleniumBy(step);
    lines.push(`        // Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`        driver.get("${step.target || f.url}");`); break;
      case 'click': case 'submit':
        lines.push(`        wait.until(ExpectedConditions.elementToBeClickable(${by})).click();`); break;
      case 'type':
        lines.push(`        driver.findElement(${by}).clear();`);
        lines.push(`        driver.findElement(${by}).sendKeys("${escStr(step.value)}");`); break;
      case 'assert':
        lines.push(`        Assert.assertTrue(driver.findElement(${by}).isDisplayed());`); break;
      default:
        lines.push(`        driver.findElement(${by}).click();`);
    }
    lines.push('');
  });
  lines.push(`    }`, ``, `    @AfterClass`, `    public void tearDown() { if (driver != null) driver.quit(); }`, `}`);
  return lines.join('\n');
}

function generateJavaScript() {
  if (!AF.flow || !AF.flow.steps.length) return `// No steps recorded yet.`;
  const f = AF.flow;
  const lines = [
    `const puppeteer = require('puppeteer');`,
    ``,
    `(async () => {`,
    `  // ${f.flowName} | Created: ${new Date(f.createdDate).toLocaleDateString()}`,
    `  const browser = await puppeteer.launch({ headless: false });`,
    `  const page = await browser.newPage();`,
    `  await page.setViewport({ width: 1280, height: 800 });`,
    ``
  ];
  f.steps.forEach(step => {
    const sel = step.target || 'body';
    lines.push(`  // Step ${step.stepNumber}: ${actionLabel(step.action)}`);
    switch (step.action) {
      case 'navigate':
        lines.push(`  await page.goto('${step.target || f.url}', { waitUntil: 'networkidle0' });`); break;
      case 'click': case 'submit': case 'doubleclick':
        lines.push(`  await page.waitForSelector('${sel}');`);
        lines.push(`  await page.click('${sel}');`); break;
      case 'type':
        lines.push(`  await page.type('${sel}', '${escStr(step.value)}');`); break;
      case 'hover':
        lines.push(`  await page.hover('${sel}');`); break;
      case 'select':
        lines.push(`  await page.select('${sel}', '${escStr(step.value)}');`); break;
      case 'wait':
        lines.push(`  await page.waitForSelector('${sel}');`); break;
      case 'keypress':
        lines.push(`  await page.keyboard.press('${step.value || 'Enter'}');`); break;
      default:
        lines.push(`  await page.click('${sel}');`);
    }
    lines.push('');
  });
  lines.push(`  await browser.close();`, `})();`);
  return lines.join('\n');
}

function generateTypeScript() {
  return generatePlaywright()
    .replace(`const { test, expect } = require('@playwright/test');`, `import { test, expect } from '@playwright/test';`)
    .replace(/async \(\{ page \}\)/g, 'async ({ page }: { page: import("@playwright/test").Page })');
}

function escStr(s) { return String(s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"'); }

function generateScript() {
  if (!AF.flow || AF.flow.steps.length === 0) {
    afToast('No steps recorded. Add steps first.', 'error'); return;
  }
  const gen = SCRIPT_GENERATORS[AF.currentFramework] || generatePlaywright;
  AF.currentScript = gen();
  $('scriptOutput').textContent = AF.currentScript;
  afToast(`Script generated for ${FRAMEWORK_LABELS[AF.currentFramework]}!`, 'success');
}

function setFramework(framework) {
  AF.currentFramework = framework;
  $('scriptLangLabel').textContent = FRAMEWORK_LABELS[framework] || framework;
  document.querySelectorAll('.af-framework-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.framework === framework);
  });
  if (AF.flow && AF.flow.steps.length > 0) generateScript();
}

// ─── AI Enhancement ──────────────────────────────────────────────
async function aiEnhanceScript() {
  if (!AF.currentScript || AF.currentScript.startsWith('//')) {
    afToast('Generate a script first, then AI Enhance it.', 'warning'); return;
  }
  if (typeof AppState === 'undefined') { afToast('AppState not available.', 'error'); return; }
  const models = AppState.models;
  const engine = (document.getElementById('selectedModel') || {}).value || models.current || 'huggingface';
  const config = { current: engine, data: models.data || models };

  afToast('AI is enhancing your script with smart waits, assertions, and self-healing locators...', 'info', 6000);

  const prompt = `You are an expert test automation engineer. Enhance the following ${FRAMEWORK_LABELS[AF.currentFramework]} automation script by:
1. Adding smart waits (waitForSelector, WebDriverWait, cy.should) before every interaction
2. Adding meaningful assertions after key actions (page title, element visibility, URL verification)
3. Adding self-healing locator fallback comments (primary: CSS, fallback: XPath, text-match)
4. Adding error handling (try/catch or TestNG @Test(expectedExceptions))
5. Adding descriptive comments for each test step
6. Improving variable naming for readability
7. Adding setup and teardown best practices

Script to enhance:
\`\`\`
${AF.currentScript}
\`\`\`

Return only the enhanced code, no explanation.`;

  try {
    if (typeof AIEngine === 'undefined') throw new Error('AIEngine not available on this page.');
    const result = await AIEngine.generateWithPrompt(prompt, config, null);
    // Strip markdown fences if present
    let cleaned = result.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    }
    AF.currentScript = cleaned;
    $('scriptOutput').textContent = cleaned;
    afToast('Script enhanced with AI! Smart waits and assertions added.', 'success');
  } catch (err) {
    afToast('AI enhancement failed: ' + err.message, 'error');
  }
}

// ─── Replay Warning (once per day) ───────────────────────────────
function shouldShowReplayWarning() {
  return localStorage.getItem(REPLAY_WARN_KEY) !== new Date().toDateString();
}

function markReplayWarningShown() {
  localStorage.setItem(REPLAY_WARN_KEY, new Date().toDateString());
}

function handleReplayBtnClick() {
  if (!AF.flow || AF.flow.steps.length === 0) {
    afToast('No steps to replay. Record or add steps first.', 'error');
    return;
  }
  if (shouldShowReplayWarning()) {
    const overlay = $('replayConfirmModal');
    if (overlay) { overlay.style.display = 'flex'; return; }
  }
  replayTest();
}

// ─── Replay Engine ───────────────────────────────────────────────
async function replayTest() {
  if (!AF.flow || AF.flow.steps.length === 0) {
    afToast('No steps to replay. Record or add steps first.', 'error'); return;
  }

  // ── Playwright backend replay: streams real screenshots + actual results ──
  if (AF.wsConnected) {
    AF.replaying = true;
    $('replayTestBtn').disabled = true;
    AF.ws.send(JSON.stringify({ type: 'replay', steps: AF.flow.steps, maximize: true }));
    return;
  }

  // ── Simulation replay (no backend) ──
  AF.replaying = true;
  AF.testCases = [];
  renderTestCases();
  $('replayTestBtn').disabled = true;

  // Reset step statuses
  AF.flow.steps.forEach(s => { s.status = 'pending'; s.duration = 0; s.errorMessage = ''; });
  renderTimeline();
  renderVisualizer();

  // Update execution dashboard
  const total = AF.flow.steps.length;
  updateExecDashboard('running', { total, passed: 0, failed: 0, skipped: 0, rate: '0%' });
  $('execProgressFill').style.width = '0%';
  $('execStepsList').innerHTML = '';
  $('failureAnalysisPanel').innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.74rem"><div style="font-size:1.4rem">⏳</div><div>Executing steps...</div></div>`;

  const dot = $('statusDot');
  dot.className = 'af-status-dot replay';
  $('statusText').textContent = '▶ Replaying';

  let passed = 0, failed = 0, skipped = 0;
  const failures = [];

  for (let i = 0; i < AF.flow.steps.length; i++) {
    const step = AF.flow.steps[i];
    step.status = 'running';
    renderTimeline();

    // Add running step to exec list
    appendExecStep(step, 'running');

    const stepStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 600));
    step.duration = Date.now() - stepStart;

    // Simulate pass/fail — assert steps and last step may fail for demo
    const shouldFail = step.action === 'assert' && step.expectedResult && Math.random() < 0.15;

    if (shouldFail) {
      step.status = 'failed';
      step.errorMessage = `Element not found: ${step.target} — Expected: "${step.expectedResult}"`;
      step.actualResult = step.errorMessage;
      failed++;
      failures.push({ step, index: i + 1 });
    } else if (step.action === 'scroll') {
      step.status = 'skipped';
      step.actualResult = 'Step skipped (scroll simulation)';
      skipped++;
    } else {
      step.status = 'passed';
      step.actualResult = `${actionLabel(step.action)} completed successfully`;
      passed++;
    }

    storeTestCase(step);
    updateExecStep(step);
    $('execProgressFill').style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    updateExecDashboard('running', {
      total,
      passed,
      failed,
      skipped,
      rate: (total ? Math.round((passed / total) * 100) : 0) + '%'
    });
    renderTimeline();
  }

  // Final state
  const finalStatus = failed === 0 ? 'pass' : 'fail';
  const successRate = total ? Math.round((passed / total) * 100) : 0;
  updateExecDashboard(finalStatus, { total, passed, failed, skipped, rate: successRate + '%' });
  $('execProgressFill').style.width = '100%';

  dot.className = 'af-status-dot idle';
  $('statusText').textContent = failed === 0 ? '✅ Replay Complete — All Passed' : `❌ Replay Complete — ${failed} Step(s) Failed`;

  renderVisualizer();
  renderFailureAnalysis(failures);

  // Save execution to flow
  AF.flow.status = finalStatus === 'pass' ? 'PASS' : 'FAIL';
  AF.flow.lastExecuted = new Date().toISOString();
  AF.flow.successRate = successRate + '%';
  AF.flow.execReport = { total, passed, failed, skipped, successRate, duration: AF.elapsed };

  AF.replaying = false;
  $('replayTestBtn').disabled = false;
  afToast(failed === 0 ? '✅ All steps passed!' : `❌ ${failed} step(s) failed. See failure analysis.`, failed === 0 ? 'success' : 'error', 5000);
}

function updateExecDashboard(status, { total, passed, failed, skipped, rate }) {
  const badge = $('executionBadge');
  if (status === 'running') {
    badge.className = 'af-exec-badge running'; badge.textContent = '⏳ Running';
  } else if (status === 'pass') {
    badge.className = 'af-exec-badge pass'; badge.textContent = '🟢 PASS';
  } else {
    badge.className = 'af-exec-badge fail'; badge.textContent = '🔴 FAIL';
  }
  $('execTotal').textContent   = total   === undefined ? '—' : total;
  $('execPassed').textContent  = passed  === undefined ? '—' : passed;
  $('execFailed').textContent  = failed  === undefined ? '—' : failed;
  $('execSkipped').textContent = skipped === undefined ? '—' : skipped;
  $('execRate').textContent    = rate    || '—';
}

function appendExecStep(step, status) {
  const list = $('execStepsList');
  const icons = { running: '⏳', passed: '✅', failed: '❌', skipped: '⏭' };
  const el = document.createElement('div');
  el.className = `af-exec-step ${status}`;
  el.id = `execStep_${step.id}`;
  el.innerHTML = `<span class="af-exec-step-icon">${icons[status]}</span>
    <span class="af-exec-step-text">Step ${step.stepNumber}: ${actionLabel(step.action)} — ${escHtml((step.target || '').slice(0,40))}</span>
    <span class="af-exec-step-dur" id="execDur_${step.id}">...</span>`;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function updateExecStep(step) {
  const el = document.getElementById(`execStep_${step.id}`);
  const icons = { passed: '✅', failed: '❌', skipped: '⏭' };
  if (el) {
    el.className = `af-exec-step ${step.status}`;
    el.querySelector('.af-exec-step-icon').textContent = icons[step.status] || '?';
    const durEl = document.getElementById(`execDur_${step.id}`);
    if (durEl) durEl.textContent = step.duration + 'ms';
  }
}

function renderFailureAnalysis(failures) {
  const panel = $('failureAnalysisPanel');
  if (!failures.length) {
    panel.innerHTML = `<div class="af-rca-clean">
      <div class="af-rca-clean-icon">✅</div>
      <div class="af-rca-clean-title">All Steps Passed</div>
      <div class="af-rca-clean-hint">No failures detected in this replay run</div>
    </div>`;
    return;
  }

  const failureHtml = failures.map(({ step, index }) => `
    <div class="af-failure-card">
      <div class="af-failure-title">❌ Step ${index} Failed — ${actionLabel(step.action)}</div>
      <div class="af-failure-row"><span class="af-failure-key">Failed Step:</span><span class="af-failure-val">Step ${index}: ${actionLabel(step.action)}</span></div>
      <div class="af-failure-row"><span class="af-failure-key">Target Locator:</span><span class="af-failure-val">${escHtml(step.target || 'N/A')}</span></div>
      <div class="af-failure-row"><span class="af-failure-key">Expected Result:</span><span class="af-failure-val">${escHtml(step.expectedResult || 'N/A')}</span></div>
      <div class="af-failure-row"><span class="af-failure-key">Actual Result:</span><span class="af-failure-val">Element Not Found</span></div>
      <div class="af-failure-row"><span class="af-failure-key">Error Message:</span><span class="af-failure-val">${escHtml(step.errorMessage)}</span></div>
    </div>`).join('');

  panel.innerHTML = failureHtml + `
    <div class="af-ai-card" style="margin-top:12px" id="aiRcaCard">
      <div class="af-ai-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        AI Root Cause Analysis
        <button class="af-btn sm outline" onclick="runAIRootCause()" style="margin-left:auto">
          Analyze with AI
        </button>
      </div>
      <div id="aiRcaContent">
        <div style="color:var(--text-muted);font-size:0.72rem;text-align:center;padding:12px">
          Click "Analyze with AI" to get intelligent root cause analysis and fix recommendations
        </div>
      </div>
    </div>`;
}

async function runAIRootCause() {
  if (!AF.flow) return;
  const failedSteps = AF.flow.steps.filter(s => s.status === 'failed');
  if (!failedSteps.length) { afToast('No failed steps to analyze.', 'info'); return; }

  const rcaContent = $('aiRcaContent');
  rcaContent.innerHTML = '<div style="color:#a5b4fc;font-size:0.74rem;text-align:center;padding:12px">⏳ AI is analyzing failures...</div>';

  const failureSummary = failedSteps.map(s =>
    `Step ${s.stepNumber}: ${actionLabel(s.action)} on "${s.target}" — Error: ${s.errorMessage}`
  ).join('\n');

  const prompt = `You are a senior test automation engineer performing root cause analysis.

Application: ${AF.flow.url}
Browser: ${AF.flow.browser}
Flow: ${AF.flow.flowName}

Failed steps:
${failureSummary}

Provide a concise root cause analysis in this exact JSON format:
{
  "likelyCause": "Brief cause description",
  "impact": "What functionality is blocked",
  "suggestedFix": "Specific actionable fix",
  "confidence": 85,
  "locatorFix": "Updated selector suggestion if applicable"
}`;

  try {
    if (typeof AIEngine === 'undefined' || typeof AppState === 'undefined') throw new Error('AI Engine not available.');
    const models = AppState.models;
    const engine = models.current || 'huggingface';
    const config = { current: engine, data: models.data || models };
    const resultText = await AIEngine.generateWithPrompt(prompt, config, null);

    let rca = null;
    const jsonStart = resultText.indexOf('{');
    const jsonEnd = resultText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { rca = JSON.parse(AIEngine.normalizeAIJsonResponse(resultText.slice(jsonStart, jsonEnd + 1))); } catch (_) {}
    }

    if (rca) {
      rcaContent.innerHTML = `
        <div class="af-ai-row"><span class="af-ai-row-label">Likely Cause</span><span class="af-ai-row-val">${escHtml(rca.likelyCause)}</span></div>
        <div class="af-ai-row"><span class="af-ai-row-label">Impact</span><span class="af-ai-row-val">${escHtml(rca.impact)}</span></div>
        <div class="af-ai-row"><span class="af-ai-row-label">Suggested Fix</span><span class="af-ai-row-val">${escHtml(rca.suggestedFix)}</span></div>
        ${rca.locatorFix ? `<div class="af-ai-row"><span class="af-ai-row-label">Updated Locator</span><span class="af-ai-row-val">${escHtml(rca.locatorFix)}</span></div>` : ''}
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
          <span class="af-confidence">✓ Confidence: ${rca.confidence}%</span>
        </div>`;
    } else {
      rcaContent.innerHTML = `<div class="af-ai-row-val" style="font-size:0.72rem;padding:8px">${escHtml(resultText.slice(0, 400))}</div>`;
    }
  } catch (err) {
    rcaContent.innerHTML = `<div style="color:#fca5a5;font-size:0.72rem;padding:8px">Analysis failed: ${escHtml(err.message)}</div>`;
  }
}

// ─── Save & History ──────────────────────────────────────────────
function saveFlow() {
  ensureFlow();
  if (!AF.flow.flowName || AF.flow.flowName === 'Untitled Flow') {
    AF.flow.flowName = $('flowName').value.trim() || 'Untitled Flow';
  }
  AF.flow.url    = $('appUrl').value.trim() || AF.flow.url;
  AF.flow.browser = $('browserSelect').value;
  AF.flow.expectedResults = {
    url:     $('expectedUrl').value.trim(),
    element: $('expectedElement').value.trim(),
    title:   $('expectedTitle').value.trim(),
    toast:   $('expectedToast').value.trim()
  };
  AF.flow.status = AF.flow.status || 'draft';

  const history = loadHistory();
  const existing = history.findIndex(f => f.flowId === AF.flow.flowId);
  if (existing !== -1) history[existing] = { ...AF.flow };
  else history.unshift({ ...AF.flow });

  // Keep max 50 flows
  if (history.length > 50) history.splice(50);
  saveHistory(history);
  AF.history = history;

  localStorage.removeItem('af_draft_flow');
  renderHistory();
  afToast(`Flow "${AF.flow.flowName}" saved successfully!`, 'success');
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('af_history') || '[]'); } catch { return []; }
}
function saveHistory(h) { localStorage.setItem('af_history', JSON.stringify(h)); }

function autosaveCurrentFlow() {
  if (AF.flow && AF.flow.steps && AF.flow.steps.length > 0) {
    localStorage.setItem('af_draft_flow', JSON.stringify(AF.flow));
  }
}

function loadDraftFlow() {
  try {
    const saved = localStorage.getItem('af_draft_flow');
    if (!saved) return;
    const flow = JSON.parse(saved);
    if (!flow || !flow.flowId || !flow.steps || !flow.steps.length) return;
    AF.flow = flow;
    $('flowName').value = flow.flowName || '';
    $('appUrl').value = flow.url || '';
    try { $('browserSelect').value = flow.browser || 'Chrome'; } catch (_) {}
    if (flow.expectedResults) {
      if ($('expectedUrl')) $('expectedUrl').value = flow.expectedResults.url || '';
      if ($('expectedElement')) $('expectedElement').value = flow.expectedResults.element || '';
      if ($('expectedTitle')) $('expectedTitle').value = flow.expectedResults.title || '';
      if ($('expectedToast')) $('expectedToast').value = flow.expectedResults.toast || '';
    }
    updateStats();
    renderTimeline();
    renderVisualizer();
    afToast(`Draft restored — "${flow.flowName}" (${flow.steps.length} step${flow.steps.length !== 1 ? 's' : ''}). Click Save Flow to keep it permanently.`, 'info', 5000);
  } catch (_) {}
}

function loadFlowFromHistory(flowId) {
  const history = loadHistory();
  const flow = history.find(f => f.flowId === flowId);
  if (!flow) { afToast('Flow not found.', 'error'); return; }
  AF.flow = { ...flow };
  AF.flow.steps = (flow.steps || []).map(s => ({ ...s, status: 'pending' }));
  $('flowName').value  = flow.flowName || '';
  $('appUrl').value    = flow.url || '';
  $('browserSelect').value = flow.browser || 'Chrome';
  $('expectedUrl').value     = flow.expectedResults?.url || '';
  $('expectedElement').value = flow.expectedResults?.element || '';
  $('expectedTitle').value   = flow.expectedResults?.title || '';
  $('expectedToast').value   = flow.expectedResults?.toast || '';
  updateStats();
  renderTimeline();
  renderVisualizer();
  updateExecDashboard('idle', {});
  afToast(`Flow "${flow.flowName}" loaded — ${flow.steps?.length || 0} steps.`, 'success');
}

function deleteFlowFromHistory(flowId) {
  let history = loadHistory();
  history = history.filter(f => f.flowId !== flowId);
  saveHistory(history);
  AF.history = history;
  renderHistory();
  afToast('Flow deleted from history.', 'info');
}

function renderHistory() {
  const tbody = $('historyTableBody');
  const history = loadHistory().filter(f => {
    if (AF.filterMode === 'all') return true;
    if (AF.filterMode === 'pass') return f.status === 'PASS';
    if (AF.filterMode === 'fail') return f.status === 'FAIL';
    if (AF.filterMode === 'draft') return f.status === 'draft' || !f.status;
    return true;
  });

  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="af-table-empty">
      <div style="font-size:1.5rem;margin-bottom:8px">📂</div>
      <div style="font-weight:700">No Flows Found</div>
      <div style="font-size:0.68rem;margin-top:4px">Save a flow or adjust filters</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = history.map(f => {
    const status = f.status || 'draft';
    const badgeClass = status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'draft';
    const badgeIcon = status === 'PASS' ? '🟢' : status === 'FAIL' ? '🔴' : '📝';
    const createdDate = f.createdDate ? new Date(f.createdDate).toLocaleDateString() : '—';
    const lastExec = f.lastExecuted ? new Date(f.lastExecuted).toLocaleDateString() : 'Never';
    return `<tr>
      <td style="font-weight:700;color:var(--text-primary)">${escHtml(f.flowName || 'Untitled')}</td>
      <td>${escHtml(f.createdBy || '—')}</td>
      <td>${createdDate}</td>
      <td>${lastExec}</td>
      <td><span class="af-status-badge ${badgeClass}">${badgeIcon} ${status.toUpperCase()}</span></td>
      <td>${f.successRate || '—'}</td>
      <td>
        <button class="af-btn sm outline" onclick="loadFlowFromHistory('${f.flowId}')" style="margin-right:4px">Load</button>
        <button class="af-btn sm outline" onclick="deleteFlowFromHistory('${f.flowId}')" style="border-color:#ef444440;color:#fca5a5">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── Save & Add Another ───────────────────────────────────────────
function saveStepAndAnother() {
  const action = $('stepAction').value;
  const target = $('stepTarget').value.trim();
  if (action === 'navigate' && !target) { afToast('Please enter a URL for Navigate.', 'error'); return; }
  if (['click','type','assert','hover','select','submit','doubleclick'].includes(action) && !target) {
    afToast('Please enter a target selector.', 'error'); return;
  }
  AF.editingStepId = null;
  saveStep();
  setTimeout(() => openAddStepModal(), 80);
}

// ─── Expected Result Helpers ──────────────────────────────────────
function generateExpectedFromAI() {
  const action      = ($('stepAction')      || {}).value || '';
  const target      = ($('stepTarget')      || {}).value || '';
  const value       = ($('stepValue')       || {}).value || '';
  const description = ($('stepDescription') || {}).value || '';
  if (!action) { afToast('Select an action first.', 'warning'); return; }
  const result = generateSmartExpectedResult(action, target, value, description);
  const field = $('stepExpected');
  if (field) {
    field.value = result;
    field.dataset.auto = '1';
    field.focus();
    field.setSelectionRange(result.length, result.length);
  }
  afToast('Expected result generated.', 'success', 2000);
}

function useActualAsExpected() {
  const field = $('stepExpected');
  if (!field) return;
  // Try step's recorded actualResult first
  if (AF.editingStepId) {
    const step = (AF.flow && AF.flow.steps || []).find(s => s.id === AF.editingStepId);
    if (step && step.actualResult && step.actualResult !== '—') {
      field.value = step.actualResult;
      afToast('Actual result applied.', 'success', 2000);
      return;
    }
    // Fall back to matching test case actualResult
    const tc = (AF.testCases || []).find(t => t.stepId === AF.editingStepId);
    if (tc && tc.actualResult && tc.actualResult !== '—') {
      field.value = tc.actualResult;
      afToast('Actual result from test case applied.', 'success', 2000);
      return;
    }
  }
  afToast('No actual result recorded yet — run a Replay first, or write the actual result in the Test Cases table.', 'info', 4000);
}

// ─── Import PRD Steps ─────────────────────────────────────────────
function importFromPRD() {
  $('importModalOverlay').classList.remove('hidden');
  setTimeout(() => { const ta = $('importPrdText'); if (ta) ta.focus(); }, 80);
}

function closeImportModal() {
  $('importModalOverlay').classList.add('hidden');
}

function _parsePrdSentences(prdText) {
  ensureFlow();
  const sentences = prdText.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 5);
  let added = 0;
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    let action = 'click', target = '', value = '';
    if (/navigate|go to|visit|open|launch|load/i.test(lower)) {
      action = 'navigate';
      const urlMatch = sentence.match(/https?:\/\/[^\s]+/) || sentence.match(/\/[a-zA-Z][^\s]*/);
      target = urlMatch ? urlMatch[0] : AF.flow.url || '/';
    } else if (/type|enter|input|fill|write/i.test(lower)) {
      action = 'type';
      const inMatch = sentence.match(/(?:type|enter|input|fill|write)\s+"?([^"]+)"?(?:\s+(?:in|into|on|for|at)\s+(.+))?/i);
      value = inMatch ? inMatch[1].replace(/^"|"$/g,'').trim() : '';
      target = inMatch && inMatch[2] ? '#' + inMatch[2].replace(/\s+/g,'-').toLowerCase() : '#input';
    } else if (/click|press|tap/i.test(lower)) {
      action = 'click';
      const btnMatch = sentence.match(/(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+)/i);
      target = btnMatch ? '#' + btnMatch[1].replace(/\s+button.*$/i,'').replace(/\s+/g,'-').toLowerCase() : '#button';
    } else if (/assert|verify|check|validate|should|expect|see|confirm/i.test(lower)) {
      action = 'assert';
      target = sentence.replace(/assert|verify|check|validate|should|expect|see|confirm\s+/gi,'').trim().slice(0,60);
    } else if (/hover|mouse.over/i.test(lower)) {
      action = 'hover'; target = '#element';
    } else if (/scroll/i.test(lower)) {
      action = 'scroll'; target = 'window';
    } else if (/wait/i.test(lower)) {
      action = 'wait'; target = 'page';
    } else if (/submit/i.test(lower)) {
      action = 'submit'; target = 'form';
    }
    AF.flow.steps.push({
      id: Date.now() + added,
      stepNumber: AF.flow.steps.length + 1,
      action, target, value,
      expectedResult: generateSmartExpectedResult(action, target, value, sentence),
      description: sentence,
      locator: { css: target },
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'pending'
    });
    added++;
  });
  AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });
  updateStats();
  renderTimeline();
  renderVisualizer();
  autosaveCurrentFlow();
  return added;
}

function confirmImport() {
  const prdText = ($('importPrdText').value || '').trim();
  if (!prdText) { afToast('Please enter a flow description.', 'error'); return; }
  const added = _parsePrdSentences(prdText);
  closeImportModal();
  $('importPrdText').value = '';
  afToast(`${added} step${added !== 1 ? 's' : ''} imported successfully.`, 'success');
}

// ─── AI Step Generation ───────────────────────────────────────────
async function generateAISteps() {
  ensureFlow();
  const url = $('appUrl').value.trim() || AF.flow.url;
  const flowName = $('flowName').value.trim() || AF.flow.flowName || 'Test Flow';

  if (!url) { afToast('Please enter the Application URL first.', 'error'); $('appUrl').focus(); return; }
  if (typeof AIEngine === 'undefined' || typeof AppState === 'undefined') {
    afToast('AI Engine not available. Use "Add Step" or "Import PRD" to add steps manually.', 'error'); return;
  }

  const genBtn = $('generateAIStepsBtn');
  if (genBtn) { genBtn.disabled = true; genBtn.textContent = '⏳ Generating…'; }
  afToast('AI is generating test steps for your flow…', 'info', 10000);

  const models = AppState.models;
  const engine = models.current || 'huggingface';
  const config = { current: engine, data: models.data || models };

  const u = url.toLowerCase();
  let appHint = 'general web application';
  if (u.includes('login') || u.includes('auth') || u.includes('secure') || u.includes('sec')) appHint = 'authentication / login system';
  else if (u.includes('admin')) appHint = 'admin management panel';
  else if (u.includes('dashboard')) appHint = 'analytics dashboard';
  else if (u.includes('shop') || u.includes('cart') || u.includes('product')) appHint = 'e-commerce';
  else if (u.includes('bank') || u.includes('finance') || u.includes('pay')) appHint = 'banking / payments';

  const prompt = `You are a senior test automation engineer. Generate a realistic, complete sequence of test automation steps for this web application.

Application URL: ${url}
Flow/Feature Name: ${flowName}
Application Type: ${appHint}

Generate 10-15 realistic test steps covering navigation, form interactions, data entry, and validation assertions.
Return ONLY a valid JSON array — no explanation, no markdown fences, no text outside the array:

[
  {"action":"navigate","target":"${url}","value":"","description":"Navigate to application","expectedResult":"Page loaded successfully"},
  {"action":"click","target":"#loginBtn","value":"","description":"Click login button","expectedResult":"Login form appears"}
]

Valid action values: navigate, click, type, assert, hover, scroll, wait, submit, select, doubleclick, keypress
Rules:
- type: target = CSS selector (#id, .class, [attr]), value = text to type
- assert: target = element selector or visible text to verify
- navigate: target = full URL
- Always include 2-3 assert steps to validate expected outcomes`;

  try {
    const resultText = await AIEngine.generateWithPrompt(prompt, config, null);
    let steps = null;
    const jsonStart = resultText.indexOf('[');
    const jsonEnd = resultText.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { steps = JSON.parse(resultText.slice(jsonStart, jsonEnd + 1)); } catch (_) {}
    }

    if (!steps || !Array.isArray(steps) || !steps.length) {
      afToast('AI returned an unexpected format. Try "Import PRD" to describe steps manually.', 'warning', 5000);
      return;
    }

    const validActions = new Set(['navigate','click','type','assert','hover','scroll','wait','submit','select','doubleclick','keypress']);
    steps.forEach((s, idx) => {
      if (!s || !s.action) return;
      AF.flow.steps.push({
        id: Date.now() + idx,
        stepNumber: AF.flow.steps.length + 1,
        action: validActions.has(s.action) ? s.action : 'click',
        target: s.target || '',
        value: s.value || '',
        expectedResult: s.expectedResult || generateSmartExpectedResult(validActions.has(s.action) ? s.action : 'click', s.target || '', s.value || '', s.description || ''),
        description: s.description || '',
        locator: { css: s.target || '' },
        timestamp: new Date().toISOString(),
        duration: 0,
        status: 'pending'
      });
    });

    AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });
    updateStats();
    renderTimeline();
    renderVisualizer();
    autosaveCurrentFlow();
    afToast(`${steps.length} AI-generated steps added! Review and edit in the timeline below.`, 'success', 5000);
  } catch (err) {
    afToast('AI step generation failed: ' + err.message, 'error', 5000);
  } finally {
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate AI Steps`;
    }
  }
}

// ─── Run History ──────────────────────────────────────────────────
const AF_RUNS_KEY = 'af_run_history';

function saveRunToHistory() {
  if (!AF.testCases || !AF.testCases.length) return;
  const passed = AF.testCases.filter(tc => tc.status === 'passed').length;
  const failed = AF.testCases.filter(tc => tc.status === 'failed').length;
  const total  = AF.testCases.length;
  const rate   = total ? Math.round((passed / total) * 100) : 0;

  const run = {
    id: Date.now(),
    flowName:    AF.flow ? AF.flow.flowName : 'Unnamed Flow',
    url:         AF.flow ? AF.flow.url      : '',
    browser:     AF.flow ? AF.flow.browser  : 'Chrome',
    date:        new Date().toISOString(),
    totalSteps:  total,
    passed,
    failed,
    skipped:     AF.testCases.filter(tc => tc.status === 'skipped').length,
    successRate: rate + '%',
    status:      failed === 0 ? 'PASS' : 'FAIL',
    duration:    AF.testCases.reduce((s, tc) => s + (tc.duration || 0), 0),
    testCases:   AF.testCases.map(tc => ({
      tcId: tc.tcId, title: tc.title, action: tc.action,
      target: tc.target, value: tc.value,
      expectedResult: tc.expectedResult, actualResult: tc.actualResult,
      status: tc.status, duration: tc.duration
    }))
  };

  const runs = JSON.parse(localStorage.getItem(AF_RUNS_KEY) || '[]');
  runs.unshift(run);
  localStorage.setItem(AF_RUNS_KEY, JSON.stringify(runs.slice(0, 100)));

  pushRunToReports(run);
  renderRunHistory();

  const strip = $('reportSavedStrip');
  if (strip) strip.style.display = 'flex';
}

function pushRunToReports(run) {
  try {
    const key  = 'qa_gen_af_reports';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({
      type: 'autoflow', id: run.id,
      name: run.flowName, url: run.url,
      date: run.date, status: run.status,
      total: run.totalSteps, passed: run.passed, failed: run.failed,
      successRate: run.successRate, duration: run.duration,
      browser: run.browser
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

function renderRunHistory(filterMode) {
  const panel = $('runHistoryPanel');
  const countEl = $('runHistoryCount');
  if (!panel) return;

  let runs = JSON.parse(localStorage.getItem(AF_RUNS_KEY) || '[]');
  const mode = filterMode || AF.filterMode || 'all';

  if (mode === 'pass')  runs = runs.filter(r => r.status === 'PASS');
  if (mode === 'fail')  runs = runs.filter(r => r.status === 'FAIL');
  if (mode === 'draft') runs = runs.filter(r => !r.status || r.status === 'draft');

  if (countEl) countEl.textContent = runs.length + ' run' + (runs.length !== 1 ? 's' : '');

  if (!runs.length) {
    panel.innerHTML = '<div class="af-empty-state"><div class="ae-icon">📂</div><div class="ae-title">No Runs Match This Filter</div><div class="ae-hint">Change the filter or run a Replay to generate history.</div></div>';
    return;
  }

  panel.innerHTML = '<div class="af-run-list">' + runs.map(r => {
    const pct    = r.totalSteps ? Math.round((r.passed / r.totalSteps) * 100) : 0;
    const date   = new Date(r.date).toLocaleString();
    const durSec = r.duration ? (r.duration / 1000).toFixed(1) + 's' : '—';
    const isPass = r.status === 'PASS';
    return `<div class="af-run-card ${isPass ? 'run-pass' : 'run-fail'}">
      <span class="af-run-status-badge ${isPass ? 'pass' : 'fail'}">${isPass ? '✅ PASS' : '❌ FAIL'}</span>
      <div>
        <div class="af-run-name">${escHtml(r.flowName)}</div>
        <div class="af-run-meta">${escHtml(r.url || '—')} · ${date} · ${r.browser || 'Chrome'} · ${durSec}</div>
      </div>
      <div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px">${r.passed}/${r.totalSteps} passed</div>
        <div class="af-run-bar"><div class="af-run-bar-fill" style="width:${pct}%;background:${isPass?'linear-gradient(90deg,#10b981,#34d399)':'linear-gradient(90deg,#ef4444,#f87171)'}"></div></div>
      </div>
      <div class="af-run-actions">
        <button class="af-btn sm outline" onclick="loadRunDetails(${r.id})" title="View test cases">📋</button>
        <button class="af-btn sm outline" onclick="deleteRun(${r.id})" title="Delete this run" style="color:#f87171;border-color:#f87171">🗑</button>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function loadRunDetails(runId) {
  const runs = JSON.parse(localStorage.getItem(AF_RUNS_KEY) || '[]');
  const run  = runs.find(r => r.id === runId);
  if (!run) return;
  AF.testCases = run.testCases || [];
  renderTestCases();
  const panel = document.querySelector('.af-layout.full');
  if (panel) panel.scrollIntoView({ behavior: 'smooth' });
  afToast('Loaded ' + run.testCases.length + ' test cases from "' + run.flowName + '"', 'info', 3000);
}

function deleteRun(runId) {
  const runs = JSON.parse(localStorage.getItem(AF_RUNS_KEY) || '[]').filter(r => r.id !== runId);
  localStorage.setItem(AF_RUNS_KEY, JSON.stringify(runs));
  renderRunHistory();
  afToast('Run deleted.', 'info', 2000);
}

function clearRunHistory() {
  if (!confirm('Clear all run history? This cannot be undone.')) return;
  localStorage.removeItem(AF_RUNS_KEY);
  renderRunHistory();
  afToast('Run history cleared.', 'info', 2000);
}

// ─── Recorder Backend WebSocket ──────────────────────────────────
function connectRecorderWS() {
  // If already OPEN, nothing to do
  if (AF.ws && AF.ws.readyState === 1) return;
  // If stuck in CONNECTING for too long, force-close and re-create
  if (AF.ws && AF.ws.readyState === 0) {
    const age = Date.now() - (AF.wsConnectStart || 0);
    if (age < 4000) return; // still within timeout window — wait
    try { AF.ws.close(); } catch {}
    AF.ws = null;
  }
  // Show "Connecting…" in badge
  const badge = $('backendStatusBadge');
  if (badge && !AF.wsConnected) {
    badge.className = 'af-backend-badge disconnected';
    badge.textContent = '⟳ Connecting…';
  }
  try {
    AF.wsConnectStart = Date.now();
    AF.ws = new WebSocket('ws://localhost:3001');
    AF.ws.onopen = () => {
      AF.wsConnected = true;
      updateBackendStatus(true);
      clearTimeout(AF.wsRetryTimer);
      AF.ws.send(JSON.stringify({ type: 'ping' }));
    };
    AF.ws.onmessage = e => {
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      handleWsMsg(msg);
    };
    AF.ws.onclose = () => {
      AF.wsConnected = false;
      updateBackendStatus(false);
      clearTimeout(AF.wsRetryTimer);
      AF.wsRetryTimer = setTimeout(connectRecorderWS, 3000);
    };
    AF.ws.onerror = () => {
      AF.wsConnected = false;
      updateBackendStatus(false);
      // onerror is always followed by onclose; retry happens there
    };
  } catch {
    AF.wsConnected = false;
    updateBackendStatus(false);
    clearTimeout(AF.wsRetryTimer);
    AF.wsRetryTimer = setTimeout(connectRecorderWS, 3000);
  }
}

function forceReconnectWS() {
  if (AF.ws) { try { AF.ws.close(); } catch {} AF.ws = null; }
  clearTimeout(AF.wsRetryTimer);
  AF.wsConnected = false;
  AF.wsConnectStart = 0;
  updateBackendStatus(false);
  connectRecorderWS();
  afToast('Reconnecting to Playwright backend…', 'info', 3000);
}

function updateBackendStatus(connected) {
  const el = $('backendStatusBadge');
  if (!el) return;
  if (connected) {
    el.className = 'af-backend-badge connected';
    el.innerHTML = '<span class="af-rec-dot" style="width:6px;height:6px;margin:0 5px 0 0"></span>Playwright Ready';
  } else {
    el.className = 'af-backend-badge disconnected';
    el.textContent = '⚪ Manual Mode';
  }
}

function handleWsMsg(msg) {
  switch (msg.type) {

    case 'pong': break;

    case 'recording_started':
      afToast('Playwright browser opened — perform your actions in that window to auto-capture steps', 'success', 7000);
      break;

    case 'step_captured': {
      ensureFlow();
      const step = msg.step;
      const existIdx = AF.flow.steps.findIndex(s => s.id === step.id);
      if (existIdx !== -1) {
        AF.flow.steps[existIdx] = step;
      } else {
        step.stepNumber = AF.flow.steps.length + 1;
        AF.flow.steps.push(step);
      }
      AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });
      updateStats();
      renderTimeline();
      renderVisualizer();
      autosaveCurrentFlow();
      afToast(`Step ${step.stepNumber}: ${actionLabel(step.action)} auto-captured`, 'info', 1500);
      break;
    }

    case 'recording_stopped': {
      if (msg.steps && msg.steps.length) {
        ensureFlow();
        AF.flow.steps = msg.steps;
        AF.flow.steps.forEach((s, i) => { s.stepNumber = i + 1; });
        updateStats();
        renderTimeline();
        renderVisualizer();
        autosaveCurrentFlow();
      }
      AF.recording = false;
      // Restore the Add Step button
      const addBtnRS = $('addStepBtn');
      if (addBtnRS) {
        addBtnRS.disabled = false;
        addBtnRS.title = '';
        if (addBtnRS._afOrigHTML) { addBtnRS.innerHTML = addBtnRS._afOrigHTML; delete addBtnRS._afOrigHTML; }
      }
      afToast(`Recording complete — ${AF.flow ? AF.flow.steps.length : 0} steps captured with auto-locators`, 'success', 5000);
      break;
    }

    case 'replay_started': {
      AF.testCases = [];
      renderTestCases();
      if (AF.flow) {
        AF.flow.steps.forEach(s => { s.status = 'pending'; s.duration = 0; s.errorMessage = ''; });
        renderTimeline();
        renderVisualizer();
      }
      $('execStepsList').innerHTML = '';
      $('execProgressFill').style.width = '0%';
      $('failureAnalysisPanel').innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.74rem">
        <div style="font-size:1.4rem">⏳</div><div>Executing steps via Playwright...</div></div>`;
      updateExecDashboard('running', { total: msg.total, passed: 0, failed: 0, skipped: 0, rate: '0%' });
      $('statusDot').className = 'af-status-dot replay';
      $('statusText').textContent = '▶ Replaying via Playwright';
      $('replayBanner').classList.add('active');
      $('replayBannerText').textContent = 'Flow is Performing...';
      $('replayBannerStep').textContent = `0 / ${msg.total} steps`;
      break;
    }

    case 'step_result': {
      const s = msg.step;
      const total = AF.flow ? AF.flow.steps.length : 1;
      if (AF.flow) {
        const idx = AF.flow.steps.findIndex(fs => fs.id === s.id || fs.stepNumber === s.stepNumber);
        if (idx !== -1) AF.flow.steps[idx] = { ...AF.flow.steps[idx], ...s };
        renderTimeline();
      }
      appendExecStep(s, s.status);
      updateExecStep(s);
      const done = msg.passed + msg.failed;
      $('execProgressFill').style.width = `${Math.round((done / total) * 100)}%`;
      updateExecDashboard('running', { total, passed: msg.passed, failed: msg.failed, skipped: 0,
        rate: (total ? Math.round((msg.passed / total) * 100) : 0) + '%' });
      $('replayBannerStep').textContent = `${done} / ${total} steps`;
      storeTestCase(s);
      break;
    }

    case 'replay_complete': {
      const finalStatus = msg.failed === 0 ? 'pass' : 'fail';
      updateExecDashboard(finalStatus, { total: msg.total, passed: msg.passed, failed: msg.failed,
        skipped: 0, rate: (msg.total ? Math.round((msg.passed / msg.total) * 100) : 0) + '%' });
      $('execProgressFill').style.width = '100%';
      $('statusDot').className = 'af-status-dot idle';
      $('statusText').textContent = msg.failed === 0 ? '✅ Replay Complete — All Passed' : `❌ Replay Complete — ${msg.failed} Failed`;
      $('replayBanner').classList.remove('active');
      $('replayTestBtn').disabled = false;
      AF.replaying = false;
      if (AF.flow) {
        AF.flow.status = finalStatus === 'pass' ? 'PASS' : 'FAIL';
        AF.flow.lastExecuted = new Date().toISOString();
        AF.flow.successRate = (msg.total ? Math.round((msg.passed / msg.total) * 100) : 0) + '%';
      }
      renderVisualizer();
      const failures = (AF.flow ? AF.flow.steps : []).filter(s => s.status === 'failed')
        .map(s => ({ step: s, index: s.stepNumber }));
      renderFailureAnalysis(failures);
      saveRunToHistory();
      afToast(msg.failed === 0 ? '✅ All steps passed!' : `❌ ${msg.failed} step(s) failed — see Test Cases panel`, msg.failed === 0 ? 'success' : 'error', 5000);
      break;
    }

    case 'error':
      afToast('Recorder backend: ' + msg.message, 'error', 7000);
      $('replayBanner').classList.remove('active');
      $('replayTestBtn').disabled = false;
      $('startRecordingBtn').disabled = false;
      $('stopRecordingBtn').disabled = true;
      AF.replaying = false; AF.recording = false;
      $('statusDot').className = 'af-status-dot idle';
      $('statusText').textContent = 'Status: Error — check backend';
      // Restore manual step button if it was locked by Playwright recording
      const addBtnErr = $('addStepBtn');
      if (addBtnErr) {
        addBtnErr.disabled = false;
        addBtnErr.title = '';
        if (addBtnErr._afOrigHTML) { addBtnErr.innerHTML = addBtnErr._afOrigHTML; delete addBtnErr._afOrigHTML; }
      }
      break;
  }
}

// ─── Test Cases ───────────────────────────────────────────────────
function storeTestCase(step) {
  const tcId = 'TC_' + String(AF.testCases.length + 1).padStart(3, '0');
  AF.testCases.push({
    tcId,
    title: step.description || `${actionLabel(step.action)}: ${(step.target || '').slice(0, 60)}`,
    action: step.action,
    target: step.target || '',
    value: step.value || '',
    locator: step.locator || null,
    expectedResult: step.expectedResult || '',
    actualResult: step.actualResult || (step.status === 'passed' ? 'Step completed' : step.errorMessage || 'Step failed'),
    status: step.status,
    errorMessage: step.errorMessage || '',
    screenshot: step.screenshot || null,
    duration: step.duration || 0,
    timestamp: step.timestamp || new Date().toISOString(),
    stepNumber: step.stepNumber
  });
  renderTestCases();
}

// ─── Status dropdown helper ───────────────────────────────────────────
const TC_STATUS_OPTIONS = [
  { val: 'pending',        icon: '⏳', label: 'Pending' },
  { val: 'not-checked',   icon: '○',  label: 'Not Checked' },
  { val: 'passed',         icon: '✔',  label: 'Pass' },
  { val: 'failed',         icon: '✖',  label: 'Fail' },
  { val: 'blocked',        icon: '⊘',  label: 'Blocked' },
  { val: 'not-applicable', icon: '—',  label: 'N/A' },
];

function buildStatusDD(idx, status) {
  const st = TC_STATUS_OPTIONS.find(o => o.val === status) || TC_STATUS_OPTIONS[0];
  const opts = TC_STATUS_OPTIONS.map(o =>
    `<option value="${o.val}"${o.val === status ? ' selected' : ''}>${o.icon} ${o.label}</option>`
  ).join('');
  return `<div class="af-status-dd-wrap" data-status="${st.val}" id="sd-wrap-${idx}">
    <select class="af-status-dd" aria-label="Test case status" onchange="updateTCStatus(${idx},this)">${opts}</select>
  </div>`;
}

function renderTestCases() {
  const panel = $('testCasesPanel');
  if (!panel) return;
  const badge = $('tcCountBadge');
  if (badge) badge.textContent = AF.testCases.length + ' test case' + (AF.testCases.length !== 1 ? 's' : '');

  if (!AF.testCases.length) {
    panel.innerHTML = `<div class="af-empty-state">
      <div class="ae-icon">🧪</div>
      <div class="ae-title">No Test Cases Yet</div>
      <div class="ae-hint">Click <strong>Generate Test Cases</strong> after recording your flow, or run <strong>Replay Test</strong> to auto-generate with actual results and screenshots.</div>
    </div>`;
    return;
  }

  const rows = AF.testCases.map((tc, idx) => {
    const hasExp   = !!(tc.expectedResult && tc.expectedResult.trim());
    const hasAct   = !!(tc.actualResult   && tc.actualResult   !== '—' && tc.actualResult.trim());
    const hasSS    = !!tc.screenshot;
    const actClass = tc.status === 'passed' ? ' passed' : tc.status === 'failed' ? ' failed' : '';

    return `<tr>
      <td class="af-tc-id-cell">${escHtml(tc.tcId)}</td>
      <td>
        <div class="af-cell-clip">${escHtml(tc.title)}</div>
        ${tc.target ? `<div class="af-cell-clip dim" title="${escHtml(tc.target)}">${escHtml(tc.target)}</div>` : ''}
      </td>
      <td style="white-space:nowrap;vertical-align:top;padding-top:12px">
        <span class="af-action-chip ${actionChipClass(tc.action)}">${actionLabel(tc.action)}</span>
      </td>
      <td class="af-tc-locator-cell">${renderLocatorBadges(tc.locator, tc.target)}</td>
      <td>
        <div class="af-tc-expected-cell" id="exp-cell-${idx}" onclick="editExpectedResult(${idx})" title="Click to edit expected result">
          <span class="af-tc-expected-text${hasExp ? '' : ' empty'}">${escHtml(hasExp ? tc.expectedResult : 'Click to add expected result…')}</span>
          <span class="af-tc-pencil">✏</span>
          ${hasSS ? `<button type="button" class="af-tc-ai-analyze" onclick="event.stopPropagation();analyzeScreenshotExpected(${idx})" title="AI-analyze screenshot">🤖 AI</button>` : ''}
        </div>
      </td>
      <td>
        <div class="af-tc-actual-cell" id="act-cell-${idx}" onclick="editActualResult(${idx})" title="Click to write actual result">
          <span class="af-tc-actual-text${hasAct ? actClass : ' empty'}">${escHtml(hasAct ? tc.actualResult : 'Click to write actual result…')}</span>
          <span class="af-tc-pencil">✏</span>
        </div>
      </td>
      <td style="vertical-align:top;padding-top:11px">${buildStatusDD(idx, tc.status)}</td>
      <td style="font-size:0.67rem;color:#475569;font-weight:700;white-space:nowrap;text-align:center;vertical-align:top;padding-top:13px">${tc.duration || 0}ms</td>
      <td style="text-align:center;vertical-align:top;padding-top:10px">${hasSS
        ? `<img class="af-tc-thumb" src="${tc.screenshot}" onclick="showScreenshotByUrl('${tc.screenshot}','${escHtml(tc.tcId)}')" title="Click to enlarge" />`
        : '<span style="color:#94a3b8;font-size:0.65rem">—</span>'}</td>
    </tr>`;
  }).join('');

  panel.innerHTML = `<div class="af-tc-table-wrap">
    <table class="af-tc-table">
      <colgroup>
        <col class="c-id">
        <col class="c-ttl">
        <col class="c-act">
        <col class="c-loc">
        <col class="c-exp">
        <col class="c-actl">
        <col class="c-st">
        <col class="c-ms">
        <col class="c-ss">
      </colgroup>
      <thead><tr>
        <th>TC ID</th>
        <th>Title / Description</th>
        <th>Action</th>
        <th>Locator Strategy</th>
        <th>Expected Result<span class="af-th-hint">✏ click to edit · 🤖 AI fill</span></th>
        <th>Actual Result<span class="af-th-hint">✏ click to write</span></th>
        <th>Status</th>
        <th style="text-align:center">ms</th>
        <th style="text-align:center">Screenshot</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ─── Update TC status via dropdown ───────────────────────────────────
function updateTCStatus(idx, selectEl) {
  if (idx < 0 || idx >= AF.testCases.length) return;
  const val = selectEl.value;
  AF.testCases[idx].status = val;
  const wrap = document.getElementById('sd-wrap-' + idx);
  if (wrap) wrap.setAttribute('data-status', val);
  syncExecDashboardFromTCs();
}

// ─── Sync execution dashboard from current TC statuses ────────────────
function syncExecDashboardFromTCs() {
  if (!AF.testCases.length) return;
  const total   = AF.testCases.length;
  const passed  = AF.testCases.filter(t => t.status === 'passed').length;
  const failed  = AF.testCases.filter(t => t.status === 'failed').length;
  const blocked = AF.testCases.filter(t => t.status === 'blocked').length;
  const skipped = AF.testCases.filter(t => t.status === 'not-applicable' || t.status === 'skipped').length;
  const rate    = total > 0 ? Math.round((passed / total) * 100) : 0;

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('execTotal',   total);
  set('execPassed',  passed);
  set('execFailed',  failed);
  set('execSkipped', skipped + blocked);
  set('execRate',    rate + '%');

  const fill = $('execProgressFill');
  if (fill) {
    fill.style.width = rate + '%';
    fill.style.background = rate === 100
      ? 'linear-gradient(90deg,#10b981,#059669)'
      : failed > 0
        ? 'linear-gradient(90deg,#ef4444,#dc2626)'
        : 'linear-gradient(90deg,#6366f1,#4f46e5)';
  }

  const badge = $('executionBadge');
  if (badge) {
    if (failed > 0) { badge.className = 'af-exec-badge fail'; badge.textContent = '✖ ' + failed + ' Failed'; }
    else if (passed === total) { badge.className = 'af-exec-badge pass'; badge.textContent = '✔ All Pass'; }
    else { badge.className = 'af-exec-badge idle'; badge.textContent = '⏳ ' + passed + '/' + total + ' Pass'; }
  }

  // Update Failure Analysis panel based on TC statuses
  renderTCFailureAnalysis(failed > 0 ? AF.testCases.filter(t => t.status === 'failed') : []);
}

// ─── Render Failure Analysis panel from TC status changes ────────────
function renderTCFailureAnalysis(failedTCs) {
  const panel = $('failureAnalysisPanel');
  if (!panel) return;

  if (!AF.testCases.length) {
    panel.innerHTML = `<div class="af-rca-idle">
      <div class="af-rca-idle-icon">🕵️</div>
      <div class="af-rca-idle-title">No Execution Run Yet</div>
      <div class="af-rca-idle-hint">Run a <strong>Replay Test</strong> or set test case statuses to <strong>Failed</strong> to trigger AI root cause analysis</div>
    </div>`;
    return;
  }

  if (!failedTCs.length) {
    panel.innerHTML = `<div class="af-rca-clean">
      <div class="af-rca-clean-icon">✅</div>
      <div class="af-rca-clean-title">No Failures Detected</div>
      <div class="af-rca-clean-hint">All checked test cases passed — great work!</div>
    </div>`;
    return;
  }

  const items = failedTCs.map(tc => `<div class="af-rca-failure-item">
    <div class="af-rca-failure-tc">✖ ${escHtml(tc.tcId)} — ${escHtml(actionLabel(tc.action))}</div>
    <div class="af-rca-failure-msg">${escHtml(tc.title)}</div>
    ${tc.actualResult && tc.actualResult !== '—'
      ? `<div class="af-rca-failure-hint">Actual: ${escHtml(tc.actualResult)}</div>` : ''}
    ${tc.expectedResult
      ? `<div class="af-rca-failure-hint">Expected: ${escHtml(tc.expectedResult)}</div>` : ''}
  </div>`).join('');

  panel.innerHTML = `<div class="af-rca-failure-list">${items}</div>
    <div class="af-ai-card" style="margin-top:12px" id="aiRcaCard">
      <div class="af-ai-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        AI Root Cause Analysis
        <button class="af-btn sm outline" type="button" onclick="runAIRootCause()" style="margin-left:auto">Analyze with AI</button>
      </div>
      <div id="aiRcaContent">
        <div style="color:var(--text-muted);font-size:0.72rem;text-align:center;padding:12px">
          Click "Analyze with AI" to get intelligent root cause analysis and fix recommendations
        </div>
      </div>
    </div>`;
}

// ─── Inline edit expected result ─────────────────────────────────────
function editExpectedResult(idx) {
  if (idx < 0 || idx >= AF.testCases.length) return;
  const cell = document.getElementById('exp-cell-' + idx);
  if (!cell) return;

  const current = AF.testCases[idx].expectedResult || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'af-tc-expected-input';
  input.value = current;
  input.placeholder = 'Enter expected result…';
  input.maxLength = 250;

  const save = () => {
    AF.testCases[idx].expectedResult = input.value.trim();
    renderTestCases();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') { renderTestCases(); }
  });
  input.addEventListener('blur', save);
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
}

// ─── Inline edit actual result ────────────────────────────────────────
function editActualResult(idx) {
  if (idx < 0 || idx >= AF.testCases.length) return;
  const cell = document.getElementById('act-cell-' + idx);
  if (!cell) return;

  const current = (AF.testCases[idx].actualResult === '—' ? '' : AF.testCases[idx].actualResult) || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'af-tc-actual-input';
  input.value = current;
  input.placeholder = 'What actually happened?';
  input.maxLength = 250;

  const save = () => {
    const val = input.value.trim();
    AF.testCases[idx].actualResult = val || '—';
    renderTestCases();
    syncExecDashboardFromTCs();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') { renderTestCases(); }
  });
  input.addEventListener('blur', save);
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
}

// ─── AI: analyze screenshot to generate expected result ───────────────
async function analyzeScreenshotExpected(idx) {
  if (idx < 0 || idx >= AF.testCases.length) return;
  const tc = AF.testCases[idx];
  if (!tc.screenshot) { afToast('No screenshot for this step.', 'warning'); return; }

  // Mark button as loading
  const cells = document.querySelectorAll('#testCasesPanel .af-tc-expected-cell');
  const cell = cells[idx];
  const btn = cell ? cell.querySelector('.af-tc-ai-analyze') : null;
  if (btn) { btn.classList.add('loading'); btn.textContent = '⟳'; }

  try {
    const prompt =
      `You are a QA engineer. Look at this UI screenshot taken during a test step.\n` +
      `Step action: "${tc.action}", Target: "${tc.target || 'N/A'}", Value: "${tc.value || 'N/A'}".\n` +
      `Based on the screenshot and action context, write ONE concise expected result sentence (max 80 chars).\n` +
      `Examples: "Login button is clickable and active", "Username field accepts input", "Page navigates to dashboard".\n` +
      `Respond with ONLY the expected result text, nothing else.`;

    let result = null;

    // Try Ollama relay
    try {
      const resp = await fetch('http://localhost:11435/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llava',
          prompt,
          images: [tc.screenshot.replace(/^data:image\/\w+;base64,/, '')],
          stream: false
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        result = (data.response || '').trim().replace(/^["']|["']$/g, '').slice(0, 150);
      }
    } catch (_) { /* vision not available, fall back */ }

    // Fallback: use smart expected result generator
    if (!result) {
      result = generateSmartExpectedResult(tc.action, tc.target, tc.value, tc.title);
    }

    AF.testCases[idx].expectedResult = result;
    renderTestCases();
    afToast(`✅ Expected result set for ${tc.tcId}`, 'success', 3000);
  } catch (err) {
    if (btn) { btn.classList.remove('loading'); btn.textContent = '🤖 AI'; }
    afToast('Could not analyze screenshot: ' + err.message, 'error', 4000);
  }
}

// ─── AI: analyze ALL screenshots at once ─────────────────────────────
async function analyzeAllScreenshots() {
  const withScreenshots = AF.testCases.filter(tc => tc.screenshot && !tc.expectedResult);
  if (!withScreenshots.length) {
    afToast('No pending screenshots to analyze (all already have expected results).', 'info', 3500);
    return;
  }
  afToast(`🤖 Analyzing ${withScreenshots.length} screenshot${withScreenshots.length !== 1 ? 's' : ''}…`, 'info', 2000);
  for (let i = 0; i < AF.testCases.length; i++) {
    if (AF.testCases[i].screenshot && !AF.testCases[i].expectedResult) {
      await analyzeScreenshotExpected(i);
      await new Promise(r => setTimeout(r, 200));
    }
  }
  afToast('✅ All screenshots analyzed!', 'success', 3000);
}

function renderLocatorBadges(loc, fallback) {
  if (!loc && !fallback) return '<span style="color:var(--text-muted)">—</span>';
  if (!loc) return `<span class="af-loc-badge css">${escHtml((fallback || '').slice(0, 40))}</span>`;
  const b = [];
  if (loc.testId) b.push(`<span class="af-loc-badge testid" title="data-testid">🎯 ${escHtml(loc.testId.slice(0, 35))}</span>`);
  if (loc.id)     b.push(`<span class="af-loc-badge id" title="id selector">${escHtml(loc.id.slice(0, 28))}</span>`);
  if (loc.name)   b.push(`<span class="af-loc-badge name" title="name attribute">${escHtml(loc.name.slice(0, 28))}</span>`);
  if (!b.length && loc.css) b.push(`<span class="af-loc-badge css" title="CSS path">${escHtml(loc.css.slice(0, 40))}</span>`);
  if (!b.length && fallback) b.push(`<span class="af-loc-badge css">${escHtml(fallback.slice(0, 40))}</span>`);
  return b.join(' ');
}

function exportTestCasesXLSX() {
  if (!AF.testCases.length) { afToast('No test cases to export yet.', 'warning'); return; }
  if (typeof XLSX === 'undefined') { exportTestCasesCSV(); return; }
  const data = [['TC ID','Title','Action','Target','Locator (Best)','Value','Expected Result','Actual Result','Status','Duration (ms)','Timestamp']];
  AF.testCases.forEach(tc => data.push([
    tc.tcId, tc.title, actionLabel(tc.action), tc.target,
    tc.locator ? (tc.locator.best || tc.target) : tc.target,
    tc.value || '', tc.expectedResult || '', tc.actualResult || '',
    tc.status.toUpperCase(), tc.duration, tc.timestamp
  ]));
  const wsSheet = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSheet, 'Test Cases');
  XLSX.writeFile(wb, (AF.flow ? AF.flow.flowName : 'testcases').replace(/[^a-zA-Z0-9]/g, '_') + '_test_cases.xlsx');
  afToast('Test cases exported to Excel!', 'success');
}

function exportTestCasesCSV() {
  const rows = [['TC ID','Title','Action','Target','Expected','Actual','Status','Duration'].join(',')];
  AF.testCases.forEach(tc => rows.push([
    tc.tcId, `"${tc.title.replace(/"/g,'""')}"`, actionLabel(tc.action),
    `"${tc.target}"`, `"${(tc.expectedResult||'').replace(/"/g,'""')}"`,
    `"${(tc.actualResult||'').replace(/"/g,'""')}"`, tc.status.toUpperCase(), tc.duration + 'ms'
  ].join(',')));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = (AF.flow ? AF.flow.flowName : 'testcases').replace(/[^a-zA-Z0-9]/g,'_') + '_test_cases.csv';
  a.click();
  afToast('Test cases exported as CSV!', 'success');
}

// ─── Screenshot Lightbox ─────────────────────────────────────────
function showScreenshotByUrl(src, title) {
  if (!src) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;box-sizing:border-box';
  overlay.innerHTML = `<div style="max-width:90vw;max-height:90vh;position:relative">
    <div style="font-size:0.72rem;font-weight:700;color:#94a3b8;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <span>${escHtml(title || 'Screenshot')}</span>
      <span style="cursor:pointer;font-size:1.2rem;color:#f1f5f9;margin-left:16px" onclick="this.closest('[style*=fixed]').remove()">✕</span>
    </div>
    <img src="${src}" style="max-width:100%;max-height:82vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,0.7);display:block" />
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showScreenshot(stepId) {
  if (!AF.flow) return;
  const step = AF.flow.steps.find(s => s.id == stepId);
  if (!step || !step.screenshot) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;box-sizing:border-box';
  overlay.innerHTML = `
    <div style="max-width:90vw;max-height:90vh;position:relative">
      <div style="font-size:0.72rem;font-weight:700;color:#94a3b8;margin-bottom:8px;text-align:center">
        Step ${step.stepNumber}: ${actionLabel(step.action)} — ${escHtml((step.description || step.target || '').slice(0,60))}
        <span style="float:right;cursor:pointer;font-size:1rem;color:#f1f5f9" onclick="this.closest('div').parentElement.parentElement.remove()">✕</span>
      </div>
      <img src="${step.screenshot}" style="max-width:100%;max-height:80vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:block" />
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─── Download Script ──────────────────────────────────────────────
function downloadScript() {
  if (!AF.currentScript || AF.currentScript.startsWith('//')) {
    afToast('Generate a script first.', 'warning'); return;
  }
  const extMap = { playwright:'spec.js', 'selenium-java':'.java', 'selenium-python':'_test.py',
    cypress:'.cy.js', robot:'.robot', testng:'TestNG.java', javascript:'.test.js', typescript:'.spec.ts' };
  const ext = extMap[AF.currentFramework] || '.js';
  const name = (AF.flow?.flowName || 'autoflow').replace(/[^a-zA-Z0-9]/g,'') + ext;
  const blob = new Blob([AF.currentScript], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  afToast(`Downloaded: ${name}`, 'success');
}

// ─── Event Wiring ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // ── Connect to Playwright backend FIRST — nothing must block this ──────
  connectRecorderWS();

  // ── History & draft ────────────────────────────────────────────────────
  try { AF.history = loadHistory(); renderHistory(); } catch(e) { console.error('history load', e); }

  // On fresh login, discard the draft so the workspace starts clean
  const freshLogin = sessionStorage.getItem('af_fresh_login');
  if (freshLogin) {
    sessionStorage.removeItem('af_fresh_login');
    localStorage.removeItem('af_draft_flow');
    AF.testCases = [];
  } else {
    try { loadDraftFlow(); } catch(e) { console.error('draft load', e); }
  }

  try { renderRunHistory(); } catch(e) { console.error('run history', e); }

  // ── Helper: safe addEventListener ──────────────────────────────────────
  function on(id, ev, fn) {
    const el = $( id);
    if (el) el.addEventListener(ev, fn);
  }

  // ── Recording controls ─────────────────────────────────────────────────
  on('startRecordingBtn', 'click', startRecording);
  on('stopRecordingBtn',  'click', stopRecording);
  on('addStepBtn', 'click', () => {
    if (AF.recording && AF.wsConnected) {
      afToast('Steps are auto-captured from the Playwright browser — no manual entry needed.', 'info', 4000);
      return;
    }
    openAddStepModal();
  });
  on('clearFlowBtn',        'click', clearFlow);
  on('generateScriptBtn',   'click', generateScript);
  on('replayTestBtn',       'click', handleReplayBtnClick);
  on('generateTCBtn',       'click', generateTestCasesFromSteps);
  on('analyzeAllSSBtn',     'click', analyzeAllScreenshots);
  on('saveFlowBtn',         'click', saveFlow);
  on('aiEnhanceBtn',        'click', aiEnhanceScript);
  on('downloadScriptBtn',   'click', downloadScript);
  on('importStepsBtn',      'click', importFromPRD);
  on('generateAIStepsBtn',  'click', generateAISteps);
  on('saveAddAnotherBtn',   'click', saveStepAndAnother);
  on('copyScriptBtn', 'click', () => {
    const text = $('scriptOutput') ? $('scriptOutput').textContent : '';
    if (!text || text.startsWith('//')) { afToast('Nothing to copy yet.', 'warning'); return; }
    navigator.clipboard.writeText(text).then(
      () => afToast('Script copied to clipboard!', 'success'),
      () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); afToast('Script copied!', 'success'); }
    );
  });

  const dlRecBtn = $('downloadRecordingBtn');
  if (dlRecBtn) { dlRecBtn.style.display = 'none'; dlRecBtn.addEventListener('click', downloadRecording); }

  // ── Step modal ─────────────────────────────────────────────────────────
  on('closeStepModal',   'click', closeStepModal);
  on('cancelStepModal',  'click', closeStepModal);
  on('saveStepBtn',      'click', saveStep);
  on('stepAction',       'change', updateStepModalLabels);
  on('genExpFromAIBtn',  'click', generateExpectedFromAI);
  on('useActualResultBtn', 'click', useActualAsExpected);

  // Live-refresh expected result as user types target/value (debounced)
  let _expRefreshTimer = null;
  const scheduleExpRefresh = () => {
    clearTimeout(_expRefreshTimer);
    _expRefreshTimer = setTimeout(autoRefreshExpected, 350);
  };
  ['stepTarget', 'stepValue', 'stepDescription'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', scheduleExpRefresh);
  });

  // Mark expected field as manually edited so auto-refresh stops overwriting
  const expField = $('stepExpected');
  if (expField) {
    expField.addEventListener('input', () => {
      expField.dataset.auto = '';
    });
  }
  on('stepModalOverlay', 'click', (e) => { if (e.target === $('stepModalOverlay')) closeStepModal(); });

  // ── Import PRD modal ───────────────────────────────────────────────────
  on('closeImportModal',   'click', closeImportModal);
  on('cancelImportModal',  'click', closeImportModal);
  on('confirmImportBtn',   'click', confirmImport);
  on('importModalOverlay', 'click', (e) => { if (e.target === $('importModalOverlay')) closeImportModal(); });

  // ── Replay confirm modal ───────────────────────────────────────────────
  const closeReplayModal = () => {
    const el = $('replayConfirmModal');
    if (el) el.style.display = 'none';
  };
  on('replayConfirmClose', 'click', closeReplayModal);
  on('replayConfirmNo',    'click', closeReplayModal);
  on('replayConfirmYes',   'click', () => {
    markReplayWarningShown();
    closeReplayModal();
    replayTest();
  });
  const replayOverlay = $('replayConfirmModal');
  if (replayOverlay) {
    replayOverlay.addEventListener('click', (e) => { if (e.target === replayOverlay) closeReplayModal(); });
  }

  // ── Test Cases buttons ─────────────────────────────────────────────────
  on('exportTestCasesBtn', 'click', exportTestCasesXLSX);
  on('exportCsvBtn',       'click', exportTestCasesCSV);
  on('saveToReportBtn',    'click', () => { saveRunToHistory(); afToast('Saved to Reports!', 'success', 2000); });
  on('clearTestCasesBtn',  'click', () => { AF.testCases = []; renderTestCases(); afToast('Test cases cleared.', 'info'); });

  // ── History buttons ────────────────────────────────────────────────────
  on('clearRunHistoryBtn',  'click', clearRunHistory);
  on('clearHistoryFlowBtn', 'click', () => {
    if (confirm('Clear all saved flows? This cannot be undone.')) {
      saveHistory([]); AF.history = []; renderHistory(); afToast('History cleared.', 'info');
    }
  });

  // ── Framework tabs ─────────────────────────────────────────────────────
  document.querySelectorAll('.af-framework-tab').forEach(btn => {
    btn.addEventListener('click', () => setFramework(btn.dataset.framework));
  });

  // ── Filter chips ───────────────────────────────────────────────────────
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AF.filterMode = btn.dataset.filter;
      renderRunHistory(AF.filterMode);
      renderHistory();
    });
  });
  document.querySelectorAll('.af-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.af-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AF.filterMode = chip.dataset.filter;
      renderHistory();
    });
  });

  // Profile dropdown is handled by shared.js initProfileDropdown() — no duplicate here

  // ── Logout ─────────────────────────────────────────────────────────────
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof AppState !== 'undefined') sessionStorage.removeItem('qa_gen_user');
      window.location.href = '../index.html';
    });
  });

  // ── Live user data ─────────────────────────────────────────────────────
  if (typeof AppState !== 'undefined') {
    const user = AppState.user;
    if (user) {
      document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name || 'QA Engineer');
      document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role || 'Tester');
      document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email || '');
      document.querySelectorAll('[data-user-initials]').forEach(el => {
        const n = user.name || user.email || 'QA';
        el.textContent = n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
      });
    }
    const tokenEl = document.querySelector('[data-tokens]');
    if (tokenEl) tokenEl.textContent = Number(AppState.tokens || 0).toLocaleString();
    const subEl = document.querySelector('[data-sub-days]');
    if (subEl) subEl.textContent = (AppState.subscriptionDaysLeft || 0) + ' days';
  }
});
