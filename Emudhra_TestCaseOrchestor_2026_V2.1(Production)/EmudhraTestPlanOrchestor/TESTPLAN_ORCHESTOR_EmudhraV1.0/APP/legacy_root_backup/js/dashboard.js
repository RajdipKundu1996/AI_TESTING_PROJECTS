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
  el.addEventListener('click', () => {
    openModal('modelsModal');
    // Ensure the currently active tab's data is populated
    const activeTab = document.querySelector('.int-tab[data-model].active') || document.querySelector('.int-tab[data-model="ollama"]');
    if (activeTab) activeTab.click();
  });
});

document.querySelectorAll('[data-action="integrations"]').forEach(el => {
  el.addEventListener('click', () => {
    openModal('integrationsModal');
    // Ensure the currently active integration data is populated
    const activeTab = document.querySelector('.int-tab[data-int].active') || document.querySelector('.int-tab[data-int="jira"]');
    if (activeTab) activeTab.click();
  });
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
    { key: 'ollama', icon: '🦙', name: 'Ollama', sub: 'Local Inference', bg: 'rgba(59,130,246,0.12)' },
    { key: 'mistral', icon: '🌪️', name: 'Mistral', sub: 'Mistral AI', bg: 'rgba(245,158,11,0.12)' },
    { key: 'huggingface', icon: '🤗', name: 'Hugging Face', sub: 'HF Inference API', bg: 'rgba(255,213,79,0.12)' },
    { key: 'openai', icon: '💬', name: 'OpenAI', sub: 'ChatGPT API', bg: 'rgba(59,130,246,0.12)' },
    { key: 'gemini', icon: '🧠', name: 'Gemini', sub: 'Gemini API', bg: 'rgba(16,185,129,0.12)' },
    { key: 'anthropic', icon: '🧠', name: 'Claude (Anthropic)', sub: 'Claude API', bg: 'rgba(139,92,246,0.12)' },
    { key: 'sarvam', icon: '🇮🇳', name: 'Sarvam AI', sub: 'Sarvam (India)', bg: 'rgba(239,68,68,0.12)' }
  ];
  list.innerHTML = modelData.map(m => {
    const modelConfig = models.data[m.key];
    const active = modelConfig?.active;
    
    // Per-Model Tokens Setup
    let tokenHTML = '';
    if (modelConfig && modelConfig.apiTokens) {
        const total = modelConfig.apiTokens.total;
        const spent = modelConfig.apiTokens.spent;
        const rem = total - spent;
        tokenHTML = `<div style="font-size:0.75rem; color:#a8b8cc; margin-top:6px; display:flex; gap:12px; font-family:monospace;">
            <span><span style="color:#6b7f96">T:</span> ${total.toLocaleString()}</span>
            <span><span style="color:#ef4444">S:</span> ${spent.toLocaleString()}</span>
            <span><span style="color:#10b981">R:</span> ${rem.toLocaleString()}</span>
        </div>`;
    }

    return `<div class="model-row" style="align-items:flex-start">
      <div class="model-icon" style="background:${m.bg}">${m.icon}</div>
      <div class="model-info"><div class="model-name">${m.name}</div><div class="model-sub">${m.sub}</div>${tokenHTML}</div>
      <div class="status-badge ${active ? 'active' : 'inactive'}"><span class="status-dot"></span>${active ? 'Valid' : 'Invalid'}</div>
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
      <div class="status-badge ${connected ? 'active' : 'inactive'}"><span class="status-dot"></span>${connected ? 'Valid' : 'Invalid'}</div>
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
  if (!apiKey || apiKey.length < 5) {
     showToast('Invalid API Key. Connection failed.', 'error');
     return;
  }

  showToast(`Validating ${currentIntegration.toUpperCase()} credentials...`, 'info');
  
  try {
    if (currentIntegration === 'jira' && typeof AIEngine !== 'undefined') {
        const res = await AIEngine.validateJira({ baseUrl: url, email: email, apiKey: apiKey });
        if (res.status === 'active') {
            showToast(`Jira Connected! Hello, ${res.name}`, 'success');
        } else {
            showToast(`Jira Connection Failed: ${res.message}`, 'error', 6000);
        }
        return;
    }

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
    const data = (AppState.models.data && AppState.models.data[currentModel]) || {};
    document.getElementById('modelBaseUrl').value = data.baseUrl || '';
    document.getElementById('modelApiKey').value = data.apiKey || '';
    
    // Automatically update the dropdown for the selected model
    populateModelDropdown(currentModel);
    if(data.version) {
      const select = document.getElementById('modelVersionSelect');
      if(select) select.value = data.version;
    }
  });
});

function populateModelDropdown(model) {
  const select = document.getElementById('modelVersionSelect');
  if(!select) return;
  let opts = '';
  const anthropicNote = document.getElementById('anthropicNoteDiv');
  const geminiNote = document.getElementById('geminiNoteDiv');
  const sarvamNote = document.getElementById('sarvamNoteDiv');
  
  if (anthropicNote) anthropicNote.style.display = 'none';
  if (geminiNote) geminiNote.style.display = 'none';
  if (sarvamNote) sarvamNote.style.display = 'none';

  if (model === 'mistral') {
    opts = '<option value="mistral-large-latest">Mistral Large (Latest)</option><option value="ministral-8b-latest">Ministral 8B (Fast)</option><option value="mistral-small-latest">Mistral Small</option>';
  } else if (model === 'ollama') {
    opts = '<option value="llama3.1:latest">llama3.1:latest (Local)</option><option value="qwen2.5-coder:latest">qwen2.5-coder:latest (Local)</option><option value="gemma3:latest">gemma3:latest (Local)</option><option value="qwen3:8b">qwen3:8b (Local)</option>';
  } else if (model === 'huggingface') {
    opts = '<option value="meta-llama/Llama-3.3-70B-Instruct">⭐ Meta Llama 3.3 70B (Recommended)</option>'
         + '<option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen 2.5 Coder 32B (Fast)</option>'
         + '<option value="Qwen/Qwen2.5-72B-Instruct">Qwen 2.5 72B Instruct</option>'
         + '<option value="google/gemma-3-27b-it">Gemma 3 27B IT</option>'
         + '<option value="HuggingFaceH4/zephyr-7b-beta">Zephyr 7B Beta (Lightweight)</option>';
  } else if (model === 'anthropic') {
    opts = '<option value="claude-3-5-sonnet-20241022" selected>⚡ Claude 3.5 Sonnet (Recommended)</option>'
         + '<option value="claude-3-5-haiku-20241022">🚀 Claude 3.5 Haiku (Fastest)</option>'
         + '<option value="claude-3-opus-20240229">🏆 Claude 3 Opus (Most Powerful)</option>';
    if (anthropicNote) anthropicNote.style.display = 'block';
  } else if (model === 'openai') {
    opts = '<option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>'
         + '<option value="gpt-4o">gpt-4o</option>'
         + '<option value="gpt-4o-mini-0613">gpt-4o-mini-0613</option>'
         + '<option value="gpt-4o-rev">gpt-4o-rev</option>';
  } else if (model === 'gemini') {
    opts = '<option value="gemini-3.5-pro">Gemini 3.5 Pro</option>'
         + '<option value="gemini-3.5-flash">Gemini 3.5 Flash</option>'
         + '<option value="gemini-3.5">Gemini 3.5</option>'
         + '<option value="gemini-3.0-flash">Gemini 3 Flash</option>'
         + '<option value="gemini-1.5-pro">Gemini 1.5 Pro</option>'
         + '<option value="gemini-1.5-mini">Gemini 1.5 Mini</option>'
         + '<option value="gemini-1.0">Gemini 1.0</option>'
         + '<option value="gemini-1.0-mini">Gemini 1.0 Mini</option>';
    if (geminiNote) geminiNote.style.display = 'block';
  } else if (model === 'sarvam') {
    opts = '<option value="sarvam-2b" selected>sarvam-2b (Recommended)</option>'
         + '<option value="sarvam-105b">sarvam-105b</option>'
         + '<option value="sarvam-30b">sarvam-30b</option>';
    if (sarvamNote) sarvamNote.style.display = 'block';
  } else {
    opts = '<option value="default">Default</option>';
  }
  select.innerHTML = opts;
}

document.getElementById('testModelBtn')?.addEventListener('click', async () => {
  let url = document.getElementById('modelBaseUrl').value.trim();
  const apiKey = document.getElementById('modelApiKey').value.trim();

  // Gemini doesn't need a base URL - it uses Google's API endpoint
  if (currentModel === 'gemini') {
    if (!apiKey || apiKey.length < 10) {
      showToast('Please enter a valid Gemini API Key.', 'error');
      return;
    }
    showToast('Verifying Gemini API key...', 'info');
    try {
      const res = await AIEngine.validateConnection(currentModel, { apiKey: apiKey });
      if (res.status === 'active') {
        showToast(`Gemini connection successful! (${res.message})`, 'success');
      } else {
        showToast(`Gemini connection failed: ${res.message}`, 'error', 5000);
      }
    } catch (err) {
      console.error('Gemini validation error:', err);
      showToast(`Failed to validate Gemini. Error: ${err.message}`, 'error');
    }
    return;
  }

  // For other models, validate URL
  if (url && !url.startsWith('http')) url = 'http://' + url;
  if (url.endsWith('/')) url = url.slice(0, -1);
  document.getElementById('modelBaseUrl').value = url;

  if (!url) {
     if (currentModel === 'openai') {
       url = 'https://api.openai.com/v1';
       document.getElementById('modelBaseUrl').value = url;
     }
  }
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
     // Properly validate deep configurations using AIEngine hooks
     const res = await AIEngine.validateConnection(currentModel, { baseUrl: url, apiKey: apiKey });
     if (res.status === 'active') {
         showToast(`${currentModel.toUpperCase()} connection successful! (${res.message})`, 'success');
     } else {
         showToast(`${currentModel.toUpperCase()} connection failed: ${res.message}`, 'error', 5000);
     }
  } catch (err) {
     console.error('Connection Test Error:', err);
     showToast(`Failed to reach ${currentModel.toUpperCase()}. Error: ${err.message}`, 'error');
  }
});

document.getElementById('syncModelBtn')?.addEventListener('click', async () => {
  const select = document.getElementById('modelVersionSelect');
  if(!select) return;
  showToast('Fetching available ' + currentModel + ' models...', 'info');
  
  const btn = document.getElementById('syncModelBtn');
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  
  if (currentModel === 'ollama') {
      try {
          let url = document.getElementById('modelBaseUrl').value.trim();
          if (url && !url.startsWith('http')) url = 'http://' + url;
          if (url.endsWith('/')) url = url.slice(0, -1);
          if (!url.endsWith('/v1') && !url.endsWith('/api')) url += '/v1';
          
          const res = await fetch(`${url}/models`);
          if (!res.ok) throw new Error('API request failed');
          const data = await res.json();
          let models = data.data || data.models || [];
          
          if (models.length > 0) {
              let opts = '';
              models.forEach(m => {
                  const mName = m.id || m.name;
                  opts += `<option value="${mName}">${mName} (Local)</option>`;
              });
              select.innerHTML = opts;
              showToast('Successfully fetched local Ollama models!', 'success');
          } else {
              populateModelDropdown(currentModel);
              showToast('No local models found, using defaults.', 'warning');
          }
      } catch (err) {
          console.error('Ollama fetch error:', err);
          populateModelDropdown(currentModel);
          showToast('Could not fetch local models. Ensure Ollama is running.', 'warning');
      }
  } else if (currentModel === 'huggingface') {
      try {
          const apiKey = document.getElementById('modelApiKey').value.trim();
          // Fetch popular text-generation models from HF via CORS relay
          const headers = {
              'X-Target-Url': 'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=trendingScore&direction=-1&limit=20'
          };
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
          
          const res = await fetch('http://127.0.0.1:11435', { headers });
          if (!res.ok) throw new Error('HF API request failed');
          const models = await res.json();
          
          if (models.length > 0) {
              let opts = '';
              models.forEach(m => {
                  const dlCount = m.downloads ? ` (${(m.downloads/1000).toFixed(0)}K DL)` : '';
                  opts += `<option value="${m.id}">${m.id}${dlCount}</option>`;
              });
              select.innerHTML = opts;
              showToast(`Fetched ${models.length} trending HF models!`, 'success');
          } else {
              populateModelDropdown(currentModel);
              showToast('No models found from HF, using defaults.', 'warning');
          }
      } catch (err) {
          console.error('HuggingFace fetch error:', err);
          populateModelDropdown(currentModel);
          showToast('Could not fetch HF models. Check API token & Relay server.', 'warning');
      }
  } else if (currentModel === 'openai' || currentModel === 'gemini') {
      await new Promise(r => setTimeout(r, 800));
      populateModelDropdown(currentModel);
      showToast('OpenAI/Gemini defaults loaded. Use the API key and model selection to connect.', 'success');
  } else {
      await new Promise(r => setTimeout(r, 1200));
      populateModelDropdown(currentModel);
      showToast('Models updated for ' + currentModel + '!', 'success');
  }

  btn.disabled = false;
  btn.textContent = '🔄 Synchronize';
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

// Donut Chart — Test Results breakdown
function drawDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 220;
  const H = 156;
  canvas.width = W;
  canvas.height = H;

  const segments = [
    { pct: 78, color: '#10b981' },
    { pct: 12, color: '#ef4444' },
    { pct: 7,  color: '#f59e0b' },
    { pct: 3,  color: '#6b7280' }
  ];

  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(cx, cy) - 6;
  const innerR = R * 0.58;
  const total = segments.reduce((s, d) => s + d.pct, 0);
  const gap = 0.04;
  let angle = -Math.PI / 2;

  segments.forEach(seg => {
    const sweep = (seg.pct / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep + gap;
  });

  // Center label
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Outfit, Inter, sans-serif';
  ctx.fillText('78%', cx, cy + 6);
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Pass Rate', cx, cy + 20);
}

// Line Chart — Coverage Trend
function drawCoverageChart() {
  const canvas = document.getElementById('coverageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 500;
  canvas.width = W; canvas.height = 200;
  const css = getComputedStyle(document.body);
  const gridColor = css.getPropertyValue('--border-subtle').trim() || 'rgba(20,33,58,0.1)';
  const labelColor = css.getPropertyValue('--text-muted').trim() || '#64748b';
  const testsColor = '#2563eb';
  const issuesColor = '#f26a21';
  const withAlpha = (color, alpha) => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const n = parseInt(full, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }
    return color.replace(/rgba?\(([^)]+)\)/, (_, parts) => {
      const [r, g, b] = parts.split(',').map(p => p.trim());
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  };

  const testsRun = [20, 35, 45, 55, 60, 65, 75, 82];
  const issues   = [5,  15, 20, 20, 25, 22, 20, 18];
  const xLabels  = ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8'];
  const pad = { top: 20, right: 16, bottom: 36, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = 200 - pad.top - pad.bottom;

  // Horizontal grid lines + Y labels
  ctx.textAlign = 'right';
  [0,20,40,60,80,100].forEach(v => {
    const y = pad.top + cH - (v / 100 * cH);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText(v + '%', pad.left - 4, y + 3);
  });

  // Vertical grid lines + X labels
  ctx.textAlign = 'center';
  xLabels.forEach((lbl, i) => {
    const x = pad.left + (i / (xLabels.length - 1)) * cW;
    ctx.strokeStyle = gridColor;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = labelColor;
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText(lbl, x, pad.top + cH + 18);
  });

  function drawLine(data, color, fill) {
    if (!data || data.length === 0) return;
    const pts = data.map((v, i) => ({
      x: pad.left + (i / (data.length - 1)) * cW,
      y: pad.top + cH - (v / 100 * cH)
    }));
    if (fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad.top + cH);
      ctx.lineTo(pts[0].x, pad.top + cH);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      g.addColorStop(0, withAlpha(color, 0.18));
      g.addColorStop(1, withAlpha(color, 0.02));
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  drawLine(testsRun, testsColor, true);
  drawLine(issues, issuesColor, false);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  updateTokenSubUI();
  renderModels();
  renderConnections();
  renderActivityFeed();
  setTimeout(() => { drawDonutChart(); drawCoverageChart(); }, 120);
  showToast('Welcome back, ' + (AppState.user?.name || 'User') + '!', 'success');
});
