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
    { key: 'sarvam', icon: '🇮🇳', name: 'Sarvam AI', sub: 'Sarvam (India)', bg: 'rgba(239,68,68,0.12)' },
    { key: 'groq', icon: '⚡', name: 'Groq Cloud', sub: 'Groq Inference API', bg: 'rgba(245,158,11,0.12)' }
  ];
  list.innerHTML = modelData.map(m => {
    const modelConfig = models.data[m.key];
    const cachedStatus = modelConfig?.status;
    const stateClass = cachedStatus === 'active' ? 'active' : cachedStatus === 'inactive' ? 'inactive' : 'checking';
    const stateText = cachedStatus === 'active' ? 'Connected' : cachedStatus === 'inactive' ? 'No Connection' : 'Checking...';

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
      <div class="status-badge ${stateClass}" id="mdl-status-${m.key}"><span class="status-dot"></span><span class="mdl-status-text">${stateText}</span></div>
    </div>`;
  }).join('');

  validateModelStatuses(modelData);
}

async function validateModelStatuses(modelData) {
  if (typeof AIEngine === 'undefined') { setTimeout(() => validateModelStatuses(modelData), 300); return; }
  for (const m of modelData) {
    const badge = document.getElementById('mdl-status-' + m.key);
    if (!badge) continue;
    badge.className = 'status-badge checking';
    badge.querySelector('.mdl-status-text').textContent = 'Checking...';
    const config = (AppState.models.data || {})[m.key] || {};
    try {
      const res = await AIEngine.validateConnection(m.key, config);
      badge.className = 'status-badge ' + (res.status === 'active' ? 'active' : 'inactive');
      badge.querySelector('.mdl-status-text').textContent = res.status === 'active' ? 'Connected' : 'No Connection';
      AppState.saveModel(m.key, { status: res.status });
    } catch (e) {
      badge.className = 'status-badge inactive';
      badge.querySelector('.mdl-status-text').textContent = 'Error';
    }
  }
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
  const groqNoteEl = document.getElementById('groqNoteDiv');

  if (anthropicNote) anthropicNote.style.display = 'none';
  if (geminiNote) geminiNote.style.display = 'none';
  if (sarvamNote) sarvamNote.style.display = 'none';
  if (groqNoteEl) groqNoteEl.style.display = 'none';

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
    opts = '<option value="sarvam-30b" selected>sarvam-30b (Recommended)</option>'
         + '<option value="sarvam-105b">sarvam-105b (Large)</option>';
    if (sarvamNote) sarvamNote.style.display = 'block';
  } else if (model === 'groq') {
    opts = '<option value="llama-3.3-70b-versatile" selected>⚡ Llama 3.3 70B Versatile (Recommended)</option>'
         + '<option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</option>'
         + '<option value="llama-3.1-8b-instant">🚀 Llama 3.1 8B Instant (Fastest)</option>'
         + '<option value="mixtral-8x7b-32768">Mixtral 8x7B 32K</option>'
         + '<option value="gemma2-9b-it">Gemma 2 9B IT</option>';
    const groqNote = document.getElementById('groqNoteDiv');
    if (groqNote) groqNote.style.display = 'block';
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
  
  if (!['ollama', 'mistral', 'groq'].includes(currentModel) && (!apiKey || apiKey.length < 10)) {
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

// ── Chart state ───────────────────────────────────────────────────────────────
let _chartRange = 30; // days; 0 = all time

// Parse "DD/MM/YYYY" log dates into Date objects
function _parseLogDate(dateStr) {
  if (!dateStr) return null;
  const p = dateStr.split('/');
  if (p.length !== 3) return null;
  return new Date(+p[2], +p[1] - 1, +p[0]);
}

// Build bucketed series from qa_gen_logs for the Coverage Trend chart
function getChartData(days) {
  const logs = AppState.logs;
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const cutoffMs = days === 0 ? null : now.getTime() - days * 86400000;

  const filtered = logs.filter(l => {
    if (!cutoffMs) return true;
    const d = _parseLogDate(l.date);
    return d && d.getTime() >= cutoffMs;
  });

  // Determine bucket size and count
  let numPts, stepMs;
  if      (days ===  7) { numPts =  7; stepMs =       86400000; }
  else if (days === 30) { numPts = 10; stepMs =   3 * 86400000; }
  else if (days === 90) { numPts = 13; stepMs =   7 * 86400000; }
  else                  { numPts =  8; stepMs =  30 * 86400000; }

  const buckets = [];
  for (let i = 0; i < numPts; i++) {
    const endMs   = now.getTime() - (numPts - 1 - i) * stepMs;
    const startMs = endMs - stepMs;
    const endDate = new Date(endMs);

    let label;
    if (days === 7)       label = endDate.toLocaleDateString('en-GB', { weekday: 'short' });
    else if (days === 30) label = endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    else if (days === 90) label = 'Wk' + (i + 1);
    else                  label = endDate.toLocaleDateString('en-GB', { month: 'short' });

    const inBucket = filtered.filter(l => {
      const d = _parseLogDate(l.date);
      return d && d.getTime() > startMs && d.getTime() <= endMs;
    });

    const issues = inBucket.filter(l => {
      const act = (l.activity || '').toLowerCase();
      return act.includes('error') || act.includes('fail') || act.includes('invalid') || l.type === 'error';
    }).length;

    buckets.push({ label, total: inBucket.length, issues });
  }

  return {
    labels:   buckets.map(b => b.label),
    testsRun: buckets.map(b => b.total),
    issues:   buckets.map(b => b.issues),
    hasData:  filtered.length > 0
  };
}

// Derive donut data from qa_gen_projects
function getDonutData() {
  const projects = AppState.projects;
  if (!projects.length) return null;
  let passed = 0, failed = 0, pending = 0, blocked = 0;
  projects.forEach(p => {
    const s = (p.status || '').toLowerCase();
    if      (s.includes('fail') || s.includes('error'))                        failed++;
    else if (s.includes('block'))                                               blocked++;
    else if (s.includes('pend') || s.includes('progress') || s.includes('run')) pending++;
    else                                                                         passed++;
  });
  const total = passed + failed + pending + blocked;
  return {
    passed:  Math.round(passed  / total * 100),
    failed:  Math.round(failed  / total * 100),
    pending: Math.round(pending / total * 100),
    blocked: Math.round(blocked / total * 100),
    total
  };
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function drawDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const card = canvas.closest('.chart-donut-card') || canvas.parentElement;
  const W = card ? Math.max(card.clientWidth - 28, 120) : 220; // 14px padding × 2
  const H = 156;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const data = getDonutData();

  if (!data) {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('No project data yet', W / 2, H / 2 - 8);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Analyze PRDs to see results', W / 2, H / 2 + 10);
    ['donutPassed','donutFailed','donutPending','donutBlocked'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0%';
    });
    return;
  }

  const segments = [
    { pct: data.passed,  color: '#10b981', id: 'donutPassed' },
    { pct: data.failed,  color: '#ef4444', id: 'donutFailed' },
    { pct: data.pending, color: '#f59e0b', id: 'donutPending' },
    { pct: data.blocked, color: '#6b7280', id: 'donutBlocked' }
  ];
  segments.forEach(seg => {
    const el = document.getElementById(seg.id);
    if (el) el.textContent = seg.pct + '%';
  });

  const cx = W / 2, cy = H / 2;
  const R = Math.min(cx, cy) - 6;
  const innerR = R * 0.58;
  const total = segments.reduce((s, d) => s + d.pct, 0);
  if (!total) return;
  const gap = 0.04;
  let angle = -Math.PI / 2;

  segments.forEach(seg => {
    if (!seg.pct) return;
    const sweep = (seg.pct / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep + gap;
  });

  const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = textColor;
  ctx.font = 'bold 22px Outfit, Inter, sans-serif';
  ctx.fillText(data.passed + '%', cx, cy + 6);
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Pass Rate', cx, cy + 20);
}

// ── Coverage Trend Line Chart ─────────────────────────────────────────────────
function drawCoverageChart() {
  const canvas = document.getElementById('coverageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const card = canvas.closest('.chart-card') || canvas.parentElement;
  const W = card ? Math.max(card.clientWidth - 36, 200) : 500; // 18px padding × 2
  const H = 200;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.body);
  const gridColor  = css.getPropertyValue('--border-subtle').trim() || 'rgba(20,33,58,0.15)';
  const labelColor = css.getPropertyValue('--text-muted').trim()    || '#64748b';

  const { labels: xLabels, testsRun, issues, hasData } = getChartData(_chartRange);
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  if (!hasData) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('No activity data for this period', W / 2, H / 2 - 8);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Use the app to generate QA content', W / 2, H / 2 + 12);
    return;
  }

  // Dynamic Y axis — "nice" step targeting 4–5 grid lines regardless of scale
  const allVals = [...testsRun, ...issues];
  const rawMax = Math.max(...allVals, 1);
  const roughStep = rawMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
  const norm = roughStep / mag;
  const niceStep = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag;
  const yMax = Math.ceil(rawMax / niceStep) * niceStep;
  const yTicks = [];
  for (let v = 0; v <= yMax; v += niceStep) yTicks.push(v);

  const withAlpha = (hex, alpha) => {
    const full = hex.length === 4
      ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
      : hex;
    const n = parseInt(full.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };

  // Grid + Y labels
  ctx.textAlign = 'right';
  yTicks.forEach(v => {
    const y = pad.top + cH - (v / yMax * cH);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText(String(v), pad.left - 4, y + 3);
  });

  // X labels + vertical grid
  ctx.textAlign = 'center';
  xLabels.forEach((lbl, i) => {
    const x = xLabels.length > 1
      ? pad.left + (i / (xLabels.length - 1)) * cW
      : pad.left + cW / 2;
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
    const n = data.length;
    const pts = data.map((v, i) => ({
      x: n > 1 ? pad.left + (i / (n - 1)) * cW : pad.left + cW / 2,
      y: pad.top + cH - (v / yMax * cH)
    }));
    if (fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[n - 1].x, pad.top + cH);
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

  drawLine(testsRun, '#2563eb', true);
  drawLine(issues,   '#f26a21', false);
}

function updateCharts() {
  drawDonutChart();
  drawCoverageChart();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  updateTokenSubUI();
  renderModels();
  renderConnections();
  renderActivityFeed();
  setTimeout(updateCharts, 120);
  showToast('Welcome back, ' + (AppState.user?.name || 'User') + '!', 'success');

  // Date range selector
  document.getElementById('dashRangeSelector')?.addEventListener('click', e => {
    const btn = e.target.closest('.dash-range-btn');
    if (!btn) return;
    document.querySelectorAll('.dash-range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _chartRange = parseInt(btn.dataset.days, 10);
    drawCoverageChart();
  });

  // Redraw on window resize to maintain DPI-correct dimensions
  window.addEventListener('resize', () => {
    clearTimeout(window._dashResizeTimer);
    window._dashResizeTimer = setTimeout(updateCharts, 200);
  });
});
