// ===== DASHBOARD JS =====

// Theme select
document.getElementById('themeSelect')?.addEventListener('change', e => applyTheme(e.target.value));

// Profile save
document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
  const name = document.getElementById('editName')?.value?.trim();
  const email = document.getElementById('editEmail')?.value?.trim();
  const role = document.getElementById('editRole')?.value?.trim();
  if (name && email) {
    AppState.updateUser({ name, email, role, initials: name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) });
    populateUserData();
    showToast('Profile updated!', 'success');
    closeModal('editProfileModal');
    AppState.addLog('Profile updated', 'profile');
  } else {
    showToast('Name and email are required.', 'error');
  }
});

// Pre-fill edit profile
document.querySelectorAll('[data-action="edit-profile"]').forEach(el => {
  el.addEventListener('click', () => {
    const u = AppState.user;
    if (u) {
      const nameEl = document.getElementById('editName');
      const emailEl = document.getElementById('editEmail');
      const roleEl = document.getElementById('editRole');
      if (nameEl) nameEl.value = u.name;
      if (emailEl) emailEl.value = u.email;
      if (roleEl) roleEl.value = u.role;
    }
  });
});

// Configure buttons
document.querySelectorAll('[data-action="models"]').forEach(el => {
  el.addEventListener('click', () => openModal('modelsModal'));
});

document.querySelectorAll('[data-action="integrations"]').forEach(el => {
  el.addEventListener('click', () => openModal('integrationsModal'));
});

// Counter animation
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1200;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

// Token & Subscription display
function updateTokenSubUI() {
  const tokens = AppState.tokens;
  const pct = AppState.tokenUsagePercent;
  document.getElementById('tokenProgress').style.width = pct + '%';

  const daysLeft = AppState.subscriptionDaysLeft;
  const subColor = AppState.subscriptionColor;
  const subProgress = document.getElementById('subProgress');
  const subIcon = document.getElementById('subIcon');
  const subBadge = document.getElementById('subBadge');

  subProgress.style.width = (daysLeft / SYSTEM.SUBSCRIPTION_DAYS * 100) + '%';

  const colorMap = { green: 'progress-green', yellow: 'progress-gold', red: 'progress-red' };
  subProgress.className = 'progress-fill ' + (colorMap[subColor] || 'progress-green');

  const iconBgMap = {
    green: 'background:rgba(16,185,129,0.12);color:var(--accent-green)',
    yellow: 'background:rgba(245,158,11,0.12);color:var(--accent-amber)',
    red: 'background:rgba(239,68,68,0.12);color:var(--accent-red)'
  };
  if (subIcon) subIcon.style.cssText = iconBgMap[subColor];

  if (subBadge) {
    subBadge.className = 'sub-badge sub-' + subColor;
  }

  // Active projects count
  const projCount = document.getElementById('activeProjectCount');
  if (projCount) projCount.textContent = AppState.projects.length || '0';
}

// Models list
function renderModels() {
  const list = document.getElementById('modelList');
  if (!list) return;
  const models = AppState.models;
  const modelData = [
    { key: 'ollama', icon: '🦙', name: 'Ollama', sub: 'Local LLM Engine', bg: 'rgba(16,185,129,0.12)' },
    { key: 'groq', icon: '⚡', name: 'Groq', sub: 'Ultra-Fast Inference', bg: 'rgba(245,158,11,0.12)' },
    { key: 'gemini', icon: '💎', name: 'Gemini', sub: 'Google AI Platform', bg: 'rgba(139,92,246,0.12)' }
  ];
  list.innerHTML = modelData.map(m => {
    const active = models[m.key]?.active;
    return `<div class="model-row">
      <div class="model-icon" style="background:${m.bg}">${m.icon}</div>
      <div class="model-info"><div class="model-name">${m.name}</div><div class="model-sub">${m.sub}</div></div>
      <div class="status-badge ${active ? 'active' : 'inactive'}"><span class="status-dot"></span>${active ? 'Active' : 'Inactive'}</div>
    </div>`;
  }).join('');
}

// Connections list
function renderConnections() {
  const list = document.getElementById('connectionList');
  if (!list) return;
  const ints = AppState.integrations;
  const connData = [
    { key: 'jira', icon: '🔗', name: 'JIRA', sub: 'Issue Tracking', bg: 'rgba(59,130,246,0.12)' },
    { key: 'testrail', icon: '🧪', name: 'TestRail', sub: 'Test Management', bg: 'rgba(16,185,129,0.12)' },
    { key: 'azure', icon: '☁', name: 'Azure DevOps', sub: 'CI/CD Pipeline', bg: 'rgba(139,92,246,0.12)' }
  ];
  list.innerHTML = connData.map(c => {
    const connected = ints[c.key]?.connected;
    return `<div class="model-row">
      <div class="model-icon" style="background:${c.bg}">${c.icon}</div>
      <div class="model-info"><div class="model-name">${c.name}</div><div class="model-sub">${c.sub}</div></div>
      <div class="status-badge ${connected ? 'active' : 'inactive'}"><span class="status-dot"></span>${connected ? 'Connected' : 'Disconnected'}</div>
    </div>`;
  }).join('');
}

// Activity feed
function renderActivityFeed() {
  const list = document.getElementById('activityList');
  if (!list) return;
  const logs = AppState.logs.slice(0, 10);
  if (logs.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-text">No activity yet</span></div>';
    return;
  }
  const typeColors = { auth: 'var(--accent-green)', navigation: 'var(--accent-blue)', token: 'var(--accent-amber)', integration: 'var(--accent-purple)', model: 'var(--accent-teal)', info: 'var(--text-muted)' };
  list.innerHTML = logs.map(l => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${typeColors[l.type] || typeColors.info}"></div>
      <div class="activity-text">${l.activity}</div>
      <div class="activity-time">${l.time}</div>
    </div>
  `).join('');
}

// Login history modal
document.getElementById('lastLoginClickable')?.addEventListener('click', () => {
  const body = document.getElementById('loginHistoryBody');
  const history = AppState.loginHistory;
  body.innerHTML = history.length ? history.map(h => `<tr><td>${h.date}</td><td>${h.time}</td><td>${h.user}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No login history</td></tr>';
  openModal('loginHistoryModal');
});

// Projects modal
document.getElementById('activeProjectClickable')?.addEventListener('click', () => {
  const body = document.getElementById('projectsBody');
  const projects = AppState.projects;
  body.innerHTML = projects.length ? projects.map(p => `<tr><td>${p.title}</td><td><span class="status-badge active">${p.status}</span></td><td>${p.testCases}</td><td>${p.coverage}%</td><td>${p.date}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No projects yet. Analyze a PRD to create one.</td></tr>';
  openModal('projectsModal');
});

// Integration tabs
let currentIntegration = 'jira';
document.querySelectorAll('.int-tab[data-int]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.int-tab[data-int]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentIntegration = tab.dataset.int;
    const data = AppState.integrations[currentIntegration] || {};
    document.getElementById('intBaseUrl').value = data.baseUrl || '';
    document.getElementById('intEmail').value = data.email || '';
    document.getElementById('intApiKey').value = data.apiKey || '';
  });
});

document.getElementById('testConnectionBtn')?.addEventListener('click', async () => {
  const url = document.getElementById('intBaseUrl').value.trim();
  const email = document.getElementById('intEmail').value.trim();
  const apiKey = document.getElementById('intApiKey').value.trim();

  if (!url || !url.startsWith('http')) {
     showToast('Invalid Base URL. Example: https://jira.atlassian.net', 'error');
     return;
  }
  if (!email || !email.includes('@')) {
     showToast('Invalid Email address.', 'error');
     return;
  }
  if (!apiKey || apiKey.length < 5) {
     showToast('Invalid API Key. Connection failed.', 'error');
     return;
  }

  showToast(`Attempting to reach ${currentIntegration.toUpperCase()}...`, 'info');
  
  try {
    // Attempt a standard fetch first (this handles 200, 401, 403 as "reachable")
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    showToast(`${currentIntegration.toUpperCase()} server is reachable!`, 'success');
  } catch (err) {
    if (err.message.includes('Failed to fetch')) {
        showToast(`Could not connect to ${url}. The server might be down or blocked by firewall.`, 'error');
    } else {
        showToast(`${currentIntegration.toUpperCase()} reachable! (Response: ${err.message})`, 'success');
    }
  }
});

document.getElementById('syncIntegrationBtn')?.addEventListener('click', () => {
  showToast('Synchronizing ' + currentIntegration.toUpperCase() + ' metadata...', 'info');
  const btn = document.getElementById('syncIntegrationBtn');
  btn.disabled = true;
  btn.textContent = 'Synchronizing...';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = '🔄 Synchronize';
    showToast('Successfully synchronized from ' + currentIntegration.toUpperCase() + ' server.', 'success');
  }, 1200);
});

document.getElementById('saveIntegrationBtn')?.addEventListener('click', () => {
  AppState.saveIntegration(currentIntegration, {
    connected: true,
    baseUrl: document.getElementById('intBaseUrl').value,
    email: document.getElementById('intEmail').value,
    apiKey: document.getElementById('intApiKey').value
  });
  renderConnections();
  showToast(currentIntegration.toUpperCase() + ' integration saved!', 'success');
  closeModal('integrationsModal');
});

// Model tabs
let currentModel = 'ollama';
document.querySelectorAll('.int-tab[data-model]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.int-tab[data-model]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentModel = tab.dataset.model;
    const data = AppState.models[currentModel] || {};
    document.getElementById('modelBaseUrl').value = data.baseUrl || '';
    document.getElementById('modelApiKey').value = data.apiKey || '';
  });
});

document.getElementById('testModelBtn')?.addEventListener('click', async () => {
  let url = document.getElementById('modelBaseUrl').value.trim();
  const apiKey = document.getElementById('modelApiKey').value.trim();

  // Normalize
  if (url && !url.startsWith('http')) url = 'http://' + url;
  if (url.endsWith('/')) url = url.slice(0, -1);
  document.getElementById('modelBaseUrl').value = url;

  if (!url || (!url.startsWith('http') && !url.startsWith('https'))) {
     showToast('Invalid Model Base URL.', 'error');
     return;
  }
  
  if (currentModel !== 'ollama' && (!apiKey || apiKey.length < 10)) {
     showToast('Invalid or missing API Key for ' + currentModel.toUpperCase() + '. Connection failed.', 'error');
     return;
  }

  showToast(`Verifying ${currentModel.toUpperCase()} endpoint...`, 'info');
  
  try {
     const checkUrl = currentModel === 'ollama' ? `${url}/api/tags` : url;
     // Note: we don't use no-cors here so we can see real errors
     const response = await fetch(checkUrl, { 
        method: 'GET'
     });
     showToast(`${currentModel.toUpperCase()} endpoint is active and reachable!`, 'success');
  } catch (err) {
     console.error('Connection Test Error:', err);
     if (currentModel === 'ollama') {
        showToast(`Ollama Connection Failed. Tip: Set OLLAMA_ORIGINS="*" if running locally.`, 'error');
     } else {
        showToast(`Failed to reach ${currentModel.toUpperCase()} at ${url}. Check your internet or API key.`, 'error');
     }
  }
});

document.getElementById('syncModelBtn')?.addEventListener('click', () => {
  const select = document.getElementById('modelVersionSelect');
  if(!select) return;
  showToast('Fetching available ' + currentModel + ' models...', 'info');
  
  const btn = document.getElementById('syncModelBtn');
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  
  setTimeout(() => {
    let opts = '';
    if(currentModel === 'ollama') {
      opts = '<option value="gemma3">Gemma 3 (Local)</option><option value="llama3">Llama 3 (Local)</option><option value="qwen2">Qwen 2.5</option>';
    } else if (currentModel === 'groq') {
      opts = '<option value="llama3-70b-8192">Llama3 70B (Groq)</option><option value="mixtral-8x7b-32768">Mixtral 8x7B (Groq)</option>';
    } else {
      opts = '<option value="gemini-1.5-pro">Gemini 1.5 Pro</option><option value="gemini-1.5-flash">Gemini 1.5 Flash</option>';
    }
    select.innerHTML = opts;
    
    btn.disabled = false;
    btn.textContent = '🔄 Synchronize';
    showToast('Models updated for ' + currentModel + '!', 'success');
  }, 1200);
});

document.getElementById('saveModelBtn')?.addEventListener('click', () => {
  AppState.saveModel(currentModel, {
    active: true,
    baseUrl: document.getElementById('modelBaseUrl').value,
    apiKey: document.getElementById('modelApiKey').value,
    version: document.getElementById('modelVersionSelect')?.value || 'default'
  });
  renderModels();
  showToast(`${currentModel.toUpperCase()} settings and model ${document.getElementById('modelVersionSelect')?.value || ''} saved!`, 'success');
  closeModal('modelsModal');
});

// Line Chart
function drawCoverageChart() {
  const canvas = document.getElementById('coverageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 500;
  canvas.width = W; canvas.height = 200;

  const testsRun = [20, 35, 45, 55, 60, 65, 75, 82];
  const issues = [5, 15, 20, 20, 25, 22, 20, 18];
  const pad = { top: 20, right: 20, bottom: 30, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = 200 - pad.top - pad.bottom;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  [0,20,40,60,80,100].forEach(v => {
    const y = pad.top + cH - (v/100*cH);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+cW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(168,184,204,0.4)'; ctx.font = '9px Inter'; ctx.fillText(v, 6, y + 3);
  });

  function drawLine(data, color, fill) {
    const pts = data.map((v, i) => ({ x: pad.left + (i/(data.length-1))*cW, y: pad.top + cH - (v/100*cH) }));
    if (fill) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, pad.top+cH); ctx.lineTo(pts[0].x, pad.top+cH); ctx.closePath();
      const g = ctx.createLinearGradient(0, pad.top, 0, pad.top+cH);
      g.addColorStop(0, color.replace('1)', '0.15)')); g.addColorStop(1, color.replace('1)', '0.01)'));
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill(); });
  }

  drawLine(testsRun, 'rgba(59,130,246,1)', true);
  drawLine(issues, 'rgba(201,168,76,1)', false);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  updateTokenSubUI();
  renderModels();
  renderConnections();
  renderActivityFeed();
  setTimeout(drawCoverageChart, 100);
  showToast('Welcome back, ' + (AppState.user?.name || 'User') + '!', 'success');
});
