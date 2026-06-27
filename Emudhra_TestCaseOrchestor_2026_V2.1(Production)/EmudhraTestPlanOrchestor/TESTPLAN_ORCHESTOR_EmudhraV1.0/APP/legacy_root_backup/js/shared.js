// ===== SHARED AUTH GUARD =====
(function() {
  const user = sessionStorage.getItem('qa_gen_user');
  if (!user) {
    window.location.href = '../index.html';
  }
})();

// ===== SYSTEM CONSTANTS =====
const SYSTEM = {
  MAX_TOKENS: 100000,
  SUBSCRIPTION_DAYS: 365,
  VALID_DOMAIN: 'emudhra.com',
  MALICIOUS_RESPONSE: 'I am a testcase generator. I can only help you to analyze PRD, generate test plan, generate test cases, generate automation script.',
  APP_VERSION: '2.1.0'
};

// ===== USER STORE =====
const AppState = {
  get user() {
    const u = sessionStorage.getItem('qa_gen_user');
    return u ? JSON.parse(u) : null;
  },
  updateUser(updates) {
    const u = this.user;
    if (!u) return;
    const updated = { ...u, ...updates };
    sessionStorage.setItem('qa_gen_user', JSON.stringify(updated));
  },

  // --- TOKEN SYSTEM ---
  get tokens() {
    const t = localStorage.getItem('qa_gen_tokens');
    if (t === null) {
      localStorage.setItem('qa_gen_tokens', SYSTEM.MAX_TOKENS);
      return SYSTEM.MAX_TOKENS;
    }
    return parseInt(t);
  },
  consumeToken: function(amount, modelName = null) {
    const cost = amount || 320;
    
    // Legacy global tracking
    if (this.tokens && this.tokens >= cost) {
        localStorage.setItem('qa_gen_tokens', this.tokens - cost);
    }
    
    // Per-Model Tracker
    if (modelName) {
        const modelsConfig = this.models;
        if (modelsConfig.data && modelsConfig.data[modelName]) {
            if (!modelsConfig.data[modelName].apiTokens) {
                modelsConfig.data[modelName].apiTokens = { total: 1000000, spent: 0 };
            }
            if ((modelsConfig.data[modelName].apiTokens.total - modelsConfig.data[modelName].apiTokens.spent) >= cost) {
                modelsConfig.data[modelName].apiTokens.spent += cost;
                this.saveModel(modelName, modelsConfig.data[modelName]);
            } else {
                return false; // specific model out of tokens
            }
        }
    }
    this.addLog('Token consumed. Cost: ' + cost, 'token');
    return true;
  },
  get tokenUsagePercent() {
    return Math.round(((SYSTEM.MAX_TOKENS - this.tokens) / SYSTEM.MAX_TOKENS) * 100);
  },

  // --- SUBSCRIPTION ---
  get subscriptionStart() {
    let start = localStorage.getItem('qa_gen_sub_start');
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem('qa_gen_sub_start', start);
    }
    return new Date(start);
  },
  get subscriptionDaysLeft() {
    const startDate = this.subscriptionStart;
    const now = new Date();
    const elapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, SYSTEM.SUBSCRIPTION_DAYS - elapsed);
  },
  get subscriptionColor() {
    const d = this.subscriptionDaysLeft;
    if (d >= 200) return 'green';
    if (d >= 100) return 'yellow';
    return 'red';
  },

  // --- HISTORY (clearable) ---
  get history() {
    const h = localStorage.getItem('qa_gen_history');
    return h ? JSON.parse(h) : [];
  },
  addHistory(item) {
    const hist = this.history;
    hist.unshift({ ...item, id: Date.now(), date: new Date().toLocaleString() });
    localStorage.setItem('qa_gen_history', JSON.stringify(hist.slice(0, 30)));
  },
  clearHistory() {
    localStorage.removeItem('qa_gen_history');
    localStorage.removeItem('qa_gen_projects');
    localStorage.removeItem('qa_gen_prd_pct');
    localStorage.removeItem('qa_gen_tc_pct');
    localStorage.removeItem('qa_gen_last_output');
    window.dispatchEvent(new CustomEvent('qa-gen-history-cleared'));
  },

  // --- PERMANENT SECURITY LOGS (never deleted) ---
  get logs() {
    const l = localStorage.getItem('qa_gen_logs');
    return l ? JSON.parse(l) : [];
  },
  addLog(activity, type = 'info') {
    const logs = this.logs;
    const now = new Date();
    logs.unshift({
      id: Date.now(),
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString(),
      activity: activity,
      type: type,
      user: this.user?.name || 'System'
    });
    localStorage.setItem('qa_gen_logs', JSON.stringify(logs.slice(0, 500)));
  },

  // --- LOGIN HISTORY ---
  get loginHistory() {
    const l = localStorage.getItem('qa_gen_login_history');
    return l ? JSON.parse(l) : [];
  },
  addLoginRecord() {
    const hist = this.loginHistory;
    const now = new Date();
    hist.unshift({
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString(),
      full: now.toLocaleString(),
      user: this.user?.name || 'Unknown'
    });
    localStorage.setItem('qa_gen_login_history', JSON.stringify(hist.slice(0, 100)));
  },

  // --- SETTINGS ---
  get settings() {
    const s = localStorage.getItem('qa_gen_settings');
    const defaults = { allowFlaggedInputs: false };
    return s ? { ...defaults, ...JSON.parse(s) } : defaults;
  },
  saveSetting(key, value) {
    const s = this.settings;
    s[key] = value;
    localStorage.setItem('qa_gen_settings', JSON.stringify(s));
    this.addLog(`Setting updated: ${key}=${value}`, 'model');
  },

  // --- PROJECTS ---
  get projects() {
    const p = localStorage.getItem('qa_gen_projects');
    return p ? JSON.parse(p) : [];
  },
  addProject(prdTitle, status) {
    const projs = this.projects;
    projs.unshift({
      id: Date.now(),
      title: prdTitle,
      status: status || 'Analyzed',
      date: new Date().toLocaleString(),
      testCases: Math.floor(Math.random() * 40) + 20,
      coverage: Math.floor(Math.random() * 20) + 75
    });
    localStorage.setItem('qa_gen_projects', JSON.stringify(projs.slice(0, 50)));
  },

  // --- INTEGRATIONS STATE ---
  get integrations() {
    const i = localStorage.getItem('qa_gen_integrations');
    return i ? JSON.parse(i) : {
      jira: { connected: false, baseUrl: 'https://admin.atlassian.com/', email: '', apiKey: '' },
      testrail: { connected: false, baseUrl: '', email: '', apiKey: '' },
      azure: { connected: false, baseUrl: '', email: '', apiKey: '' }
    };
  },
  saveIntegration(name, data) {
    const ints = this.integrations;
    ints[name] = { ...ints[name], ...data };
    localStorage.setItem('qa_gen_integrations', JSON.stringify(ints));
    this.addLog(`Integration ${name.toUpperCase()} updated`, 'integration');
  },

  // --- MODEL ACTIVATION ---
  get models() {
    let m = localStorage.getItem('qa_gen_models');
    // Industry Grade AI Models (Configured for performance/speed)
    const defaults = {
      current: 'huggingface',
      data: {
        ollama: {
          name: 'Ollama (Local/Hosted)',
          baseUrl: 'http://127.0.0.1:11435',
          apiKey: '',
          version: 'llama3:8b',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        mistral: {
          name: 'Mistral AI',
          baseUrl: 'https://api.mistral.ai/v1',
          apiKey: '',
          version: 'mistral-large-latest',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        huggingface: {
          name: 'Hugging Face (Inference API)',
          baseUrl: 'https://router.huggingface.co',
          apiKey: '',
          version: 'meta-llama/Llama-3.3-70B-Instruct',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        anthropic: {
          name: 'Claude (Anthropic)',
          baseUrl: 'https://api.anthropic.com',
          apiKey: '',
          version: 'claude-3-5-sonnet-20241022',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        openai: {
          name: 'OpenAI ChatGPT',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          version: 'gpt-4o-mini',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        gemini: {
          name: 'Gemini',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          version: 'gemini-1.5-pro',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        },
        sarvam: {
          name: 'Sarvam AI (India)',
          baseUrl: 'https://api.sarvam.ai',
          apiKey: '',
          version: 'sarvam-m',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        }
      }
    };
    let data = m ? JSON.parse(m) : defaults;
    
    if (!data.data) {
        const newData = { current: data.current || 'huggingface', data: { ...defaults.data } };
        ['ollama', 'mistral', 'huggingface'].forEach(k => {
            if (data[k]) newData.data[k] = { ...newData.data[k], ...data[k] };
        });
        data = newData;
    }
    
    // Purge deprecated/blocked models completely from state
    ['openrouter', 'deepseek', 'groq'].forEach(oldKey => {
        if (data.data[oldKey]) {
            delete data.data[oldKey];
        }
    });
    if (['openrouter', 'deepseek', 'groq'].includes(data.current)) {
        data.current = 'huggingface';
    }

    // Auto-inject missing models
    ['ollama', 'mistral', 'huggingface', 'anthropic', 'openai', 'gemini', 'sarvam'].forEach(model => {
        if (!data.data[model]) data.data[model] = defaults.data[model];
    });

    let needsSave = false;
    console.log('--- Model Configuration Migration Check ---');

    // Force Hugging Face migration to verified Router API and new key
    if (data.data.huggingface) {
        data.data.huggingface.apiKey = '';
        data.data.huggingface.baseUrl = 'https://router.huggingface.co';
        data.data.huggingface.version = 'meta-llama/Llama-3.3-70B-Instruct';
        needsSave = true;
    }

    // Force Ollama migration to user provided key and llama3:8b
    if (data.data.ollama) {
        data.data.ollama.apiKey = '5daa367198e145b6a8ca7fd6e18e04cb.SiD61aqqd8yjYGCDQZMwRduO';
        data.data.ollama.version = 'llama3:8b';
        needsSave = true;
    }

    // Force Anthropic migration to verified base URL and key
    if (data.data.anthropic) {
        if (!data.data.anthropic.baseUrl || data.data.anthropic.baseUrl === 'fake') {
            data.data.anthropic.baseUrl = 'https://api.anthropic.com';
            needsSave = true;
        }
        if (!data.data.anthropic.version || data.data.anthropic.version.includes('4-5')) {
            data.data.anthropic.version = 'claude-3-5-sonnet-20241022';
            needsSave = true;
        }
    }
    if (data.data.openai) {
        if (!data.data.openai.baseUrl) {
            data.data.openai.baseUrl = 'https://api.openai.com/v1';
            needsSave = true;
        }
        if (!data.data.openai.version) {
            data.data.openai.version = 'gpt-4o-mini';
            needsSave = true;
        }
    }
    if (data.data.gemini) {
        if (!data.data.gemini.baseUrl) {
            data.data.gemini.baseUrl = 'https://api.openai.com/v1';
            needsSave = true;
        }
        if (!data.data.gemini.version) {
            data.data.gemini.version = 'gemini-1.5-pro';
            needsSave = true;
        }
    }
    if (data.data.sarvam) {
        // Always force correct Sarvam config (base URL + real API key)
        data.data.sarvam.baseUrl = 'https://api.sarvam.ai';
        data.data.sarvam.name = 'Sarvam AI (India)';
        // Fix wrongly stored base URL as apiKey — replace it with the real key
        if (!data.data.sarvam.apiKey || data.data.sarvam.apiKey === 'https://api.sarvam.ai' || data.data.sarvam.apiKey.startsWith('http')) {
            data.data.sarvam.apiKey = '';
            needsSave = true;
        }
        if (!data.data.sarvam.version || data.data.sarvam.version === 'sarvam-2b') {
            data.data.sarvam.version = 'sarvam-m';
            needsSave = true;
        }
    }

    if (needsSave) {
        localStorage.setItem('qa_gen_models', JSON.stringify(data));
    }
    
    return data;
  },
  saveModel(name, data) {
    const models = this.models;
    if (!models.data[name]) models.data[name] = {};
    models.data[name] = { ...models.data[name], ...data };
    localStorage.setItem('qa_gen_models', JSON.stringify(models));
    this.addLog(`Model ${name} configuration updated`, 'model');
  },

  // --- LOGOUT ---
  logout() {
    this.addLog('User logged out', 'auth');
    sessionStorage.removeItem('qa_gen_user');
    window.location.href = '../index.html';
  }
};

// ===== DOMAIN VALIDATION =====
function isValidDomain(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === SYSTEM.VALID_DOMAIN;
}

// ===== MALICIOUS QUERY CHECK =====
function isMaliciousQuery(text) {
  const lower = (text || '').toLowerCase().trim();
  const forbiddenPatterns = [
    { regex: /write me a (poem|story|song|joke)/i, reason: 'creative content (poem/story/song/joke) which is out-of-scope' },
    { regex: /tell me a joke/i, reason: 'jokes / casual conversation' },
    { regex: /who (is|are) you/i, reason: 'self-identification / conversational queries' },
    { regex: /what is (the weather|your name)/i, reason: 'informational or personal queries' },
    { regex: /play (a game|music)/i, reason: 'media playback / interactive games' },
    { regex: /hack|exploit|inject|bypass|crack/i, reason: 'malicious intent or security bypass' },
    { regex: /how to (cook|invest|travel)/i, reason: 'generic how-to instructions (out-of-scope)'}
  ];

  for (const p of forbiddenPatterns) {
    try {
      if (p.regex.test(lower)) return p.reason;
    } catch (e) { /* ignore regex errors */ }
  }
  return '';
}

// ===== POPULATE USER DATA =====
function populateUserData() {
  const user = AppState.user;
  if (!user) return;
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = user.initials);
  document.querySelectorAll('[data-user-login-time]').forEach(el => el.textContent = user.loginTime);

  // Token display
  document.querySelectorAll('[data-tokens]').forEach(el => el.textContent = AppState.tokens.toLocaleString());
  document.querySelectorAll('[data-tokens-pct]').forEach(el => el.textContent = AppState.tokenUsagePercent + '%');

  // Subscription display
  const daysLeft = AppState.subscriptionDaysLeft;
  const subColor = AppState.subscriptionColor;
  document.querySelectorAll('[data-sub-days]').forEach(el => {
    el.textContent = daysLeft + ' days';
    el.className = el.className.replace(/\bsub-(green|yellow|red)\b/g, '').trim() + ' sub-' + subColor;
  });
}

// ===== PROFILE DROPDOWN =====
function initProfileDropdown() {
  const trigger = document.getElementById('profileTrigger');
  const dropdown = document.getElementById('profileDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
  });

  document.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
  });

  dropdown.addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', () => {
      showConfirm('Are you sure you want to logout?', () => AppState.logout());
    });
  });

  document.querySelectorAll('[data-action="settings"]').forEach(el => {
    el.addEventListener('click', () => openModal('settingsModal'));
  });

  document.querySelectorAll('[data-action="about"]').forEach(el => {
    el.addEventListener('click', () => openModal('aboutModal'));
  });

  document.querySelectorAll('[data-action="edit-profile"]').forEach(el => {
    el.addEventListener('click', () => {
      const nameEl = document.getElementById('editName');
      const emailEl = document.getElementById('editEmail');
      const roleEl = document.getElementById('editRole');
      if (!nameEl || !emailEl || !roleEl) { openModal('editProfileModal'); return; }
      const user = AppState.user;
      if (user) {
        nameEl.value = user.name || '';
        emailEl.value = user.email || '';
        roleEl.value = user.role || '';
      }
      openModal('editProfileModal');
    });
  });

  // Handle Profile Save
  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = document.getElementById('editName').value;
      const email = document.getElementById('editEmail').value;
      const role = document.getElementById('editRole').value;
      
      if (!name || !email) {
        showToast('Name and Email are required.', 'error');
        return;
      }

      AppState.updateUser({ name, email, role, initials: name.substring(0, 2).toUpperCase() });
      populateUserData();
      closeModal('editProfileModal');
      showToast('Profile updated successfully!', 'success');
      AppState.addLog('Profile updated: ' + name, 'info');
    });
  }
}

// ===== MODAL SYSTEM =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; m.classList.add('modal-animate'); }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; }
}

function initModals() {
  // Modal overlay click listener removed to prevent accidental closing as per user request
  
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.style.display = 'none';
    });
  });
}

// ===== CONFIRM DIALOG =====
function showConfirm(message, onConfirm) {
  const overlay = document.getElementById('confirmModal');
  const msg = document.getElementById('confirmMessage');
  const okBtn = document.getElementById('confirmOk');
  const cancelBtn = document.getElementById('confirmCancel');
  if (!overlay) { onConfirm(); return; }
  msg.textContent = message;
  overlay.style.display = 'flex';
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.id = 'confirmOk';
  newOk.addEventListener('click', () => {
    overlay.style.display = 'none';
    onConfirm();
  });
}

// ===== TOAST =====
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-msg">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== THEME / APPEARANCE SETTINGS =====
const APPEARANCE_SETTINGS_KEY = 'qa_gen_appearance_settings';
const DEFAULT_APPEARANCE_SETTINGS = {
  theme: 'light',
  fontSize: 'medium',
  density: 'comfortable',
  accent: 'blue',
  motion: 'full',
  tableMode: 'color'
};

function getAppearanceSettings() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(APPEARANCE_SETTINGS_KEY) || '{}') || {};
  } catch (err) {
    stored = {};
  }
  const legacyTheme = localStorage.getItem('qa_gen_theme');
  return { ...DEFAULT_APPEARANCE_SETTINGS, ...(legacyTheme ? { theme: legacyTheme } : {}), ...stored };
}

function saveAppearanceSettings(settings) {
  const merged = { ...getAppearanceSettings(), ...(settings || {}) };
  localStorage.setItem(APPEARANCE_SETTINGS_KEY, JSON.stringify(merged));
  localStorage.setItem('qa_gen_theme', merged.theme);
  return merged;
}

function resolveSystemTheme(theme) {
  if (theme !== 'system') return theme;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const requested = theme || getAppearanceSettings().theme || 'emudhra';
  const resolved = resolveSystemTheme(requested);
  const ALL_T = ['theme-clean-light','theme-emudhra','theme-exec-navy','theme-graphite','theme-emerald','theme-sapphire','theme-sunset','theme-platinum','theme-cyber','theme-aurora','theme-arctic','theme-high-contrast','theme-light','theme-dark','theme-system','theme-custom','theme-midnight','theme-contrast','theme-ocean','theme-forest','theme-carbon','theme-royal','theme-dawn'];
  document.body.classList.remove(...ALL_T);
  document.body.classList.add(`theme-${resolved}`);
  document.body.dataset.themeMode = resolved;
  const DARK4 = ['exec-navy','graphite','cyber','dark','midnight','contrast','ocean','forest','carbon','royal'];
  if (DARK4.includes(resolved)) {
    document.body.classList.remove('em-light-app');
  } else {
    document.body.classList.add('em-light-app');
  }
  localStorage.setItem('qa_gen_theme', requested);
}

function applyAppearanceSettings(settings) {
  const merged = saveAppearanceSettings(settings);
  applyTheme(merged.theme);
  document.body.dataset.fontSize = merged.fontSize;
  document.body.dataset.density = merged.density;
  document.body.dataset.accent = merged.accent;
  document.body.dataset.motion = merged.motion;
  document.body.dataset.tableMode = merged.tableMode;
  document.documentElement.style.setProperty('--app-font-scale', {
    small: '0.92',
    medium: '1',
    large: '1.08',
    xlarge: '1.16'
  }[merged.fontSize] || '1');
  document.documentElement.style.setProperty('--app-density-pad', {
    compact: '0.82',
    comfortable: '1',
    spacious: '1.18'
  }[merged.density] || '1');
  syncSettingsControls(merged);
  return merged;
}

function initTheme() {
  applyAppearanceSettings(getAppearanceSettings());
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (getAppearanceSettings().theme === 'system') applyAppearanceSettings(getAppearanceSettings());
    });
  }
}

function settingsModalMarkup() {
  return `
    <div class="modal settings-modal">
      <div class="modal-header settings-modal-header">
        <div>
          <div class="modal-title">Settings</div>
          <p class="settings-subtitle">Tune theme, readability, spacing, motion, and table focus.</p>
        </div>
        <button class="modal-close" data-close-modal type="button">x</button>
      </div>
      <div class="modal-body settings-modal-body">
        <div class="settings-preview" aria-hidden="true">
          <span></span><strong>QA-Gen workspace preview</strong><small>Readable, calm, and execution-ready.</small>
        </div>
        <div class="settings-grid">
          <div class="form-group-dark">
            <label class="form-label-dark" for="themeSelect">Theme</label>
            <select class="form-input-dark" id="themeSelect">
              <option value="light">Light</option>
              <option value="emudhra">eMudhra Soft</option>
              <option value="dark">Dark</option>
              <option value="midnight">Midnight</option>
              <option value="contrast">High Contrast</option>
              <option value="ocean">Ocean Deep</option>
              <option value="forest">Forest Dark</option>
              <option value="carbon">Carbon Black</option>
              <option value="royal">Royal Purple</option>
              <option value="dawn">Dawn Warm</option>
              <option value="system">System</option>
            </select>
          </div>
          <div class="form-group-dark">
            <label class="form-label-dark" for="fontSizeSelect">Font Size</label>
            <select class="form-input-dark" id="fontSizeSelect">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </div>
          <div class="form-group-dark">
            <label class="form-label-dark" for="densitySelect">Layout Density</label>
            <select class="form-input-dark" id="densitySelect">
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
          <div class="form-group-dark">
            <label class="form-label-dark" for="accentSelect">Accent Color</label>
            <select class="form-input-dark" id="accentSelect">
              <option value="blue">Blue</option>
              <option value="orange">eMudhra Orange</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
              <option value="teal">Teal</option>
            </select>
          </div>
          <div class="form-group-dark">
            <label class="form-label-dark" for="motionSelect">Motion</label>
            <select class="form-input-dark" id="motionSelect">
              <option value="full">Full Animation</option>
              <option value="reduced">Reduced Motion</option>
            </select>
          </div>
          <div class="form-group-dark">
            <label class="form-label-dark" for="tableModeSelect">Table Readability</label>
            <select class="form-input-dark" id="tableModeSelect">
              <option value="color">Color-Coded Fields</option>
              <option value="focus">Focus Rows</option>
              <option value="plain">Plain Tables</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" data-close-modal type="button">Cancel</button>
        <button class="btn btn-outline" id="resetAppearanceBtn" type="button">Reset</button>
        <button class="btn btn-primary" id="saveSettingsBtn" type="button">Save</button>
      </div>
    </div>
  `;
}

function upgradeSettingsModal() {
  const overlay = document.getElementById('settingsModal');
  if (!overlay || overlay.dataset.appearanceUpgraded === 'true') return;
  overlay.innerHTML = settingsModalMarkup();
  overlay.dataset.appearanceUpgraded = 'true';
  overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal('settingsModal'));
  });
  overlay.querySelector('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  overlay.querySelector('#resetAppearanceBtn')?.addEventListener('click', () => {
    applyAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS);
    showToast('Appearance reset.', 'info', 2200);
  });
  ['themeSelect', 'fontSizeSelect', 'densitySelect', 'accentSelect', 'motionSelect', 'tableModeSelect'].forEach(id => {
    overlay.querySelector('#' + id)?.addEventListener('change', () => {
      applyAppearanceSettings(readSettingsControls());
    });
  });
}

function readSettingsControls() {
  return {
    theme: document.getElementById('themeSelect')?.value || getAppearanceSettings().theme,
    fontSize: document.getElementById('fontSizeSelect')?.value || getAppearanceSettings().fontSize,
    density: document.getElementById('densitySelect')?.value || getAppearanceSettings().density,
    accent: document.getElementById('accentSelect')?.value || getAppearanceSettings().accent,
    motion: document.getElementById('motionSelect')?.value || getAppearanceSettings().motion,
    tableMode: document.getElementById('tableModeSelect')?.value || getAppearanceSettings().tableMode
  };
}

function syncSettingsControls(settings) {
  const values = settings || getAppearanceSettings();
  const map = {
    themeSelect: values.theme,
    fontSizeSelect: values.fontSize,
    densitySelect: values.density,
    accentSelect: values.accent,
    motionSelect: values.motion,
    tableModeSelect: values.tableMode
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function initSettings() {
  upgradeSettingsModal();
  const s = AppState.settings;
  const toggle = document.getElementById('allowFlaggedToggle');
  if (toggle) toggle.checked = !!s.allowFlaggedInputs;
  applyAppearanceSettings(getAppearanceSettings());
}

function saveSettings() {
  const settings = applyAppearanceSettings(readSettingsControls());
  const toggle = document.getElementById('allowFlaggedToggle');
  if (toggle) {
    AppState.saveSetting('allowFlaggedInputs', !!toggle.checked);
  }
  showToast(`Settings saved: ${settings.theme}, ${settings.fontSize} font.`, 'success');
  closeModal('settingsModal');
}

// ===== CLEAR HISTORY (with confirm popup — does NOT clear logs) =====
function initClearHistory() {
  const buttons = document.querySelectorAll('#clearHistoryBtn, [data-action="clear-history"]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('Clear all conversation history, generated outputs, projects, and reset percentages? Logs will NOT be deleted. This cannot be undone.', () => {
        AppState.clearHistory();
        renderHistoryPanel();
        clearGeneratedOutputUI();
        clearProjectSummaryUI();
        showToast('History, generated outputs, and percentages cleared. Logs preserved.', 'success');
        // Update any percentage displays on page
        document.querySelectorAll('[data-prd-pct]').forEach(el => el.textContent = '0%');
        document.querySelectorAll('[data-tc-pct]').forEach(el => el.textContent = '0%');
      });
    });
  });
}

function clearProjectSummaryUI() {
  const activeProjectCount = document.getElementById('activeProjectCount');
  if (activeProjectCount) activeProjectCount.textContent = '0';

  const projectsBody = document.getElementById('projectsBody');
  if (projectsBody) {
    projectsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No projects yet. Analyze a PRD to create one.</td></tr>';
  }

  const historyTableBody = document.getElementById('historyTableBody');
  if (historyTableBody) {
    historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No projects analyzed yet</td></tr>';
  }

  ['rptProjectCount', 'rptTcCount', 'rptAutoCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '0';
  });
}

function clearGeneratedOutputUI() {
  if (typeof window.resetGeneratedOutputUI === 'function') {
    window.resetGeneratedOutputUI();
    return;
  }

  const outputStream = document.getElementById('outputStream');
  const outputArea = document.getElementById('outputArea');
  const outputStats = document.getElementById('outputStatsGrid');
  const outputLoading = document.getElementById('outputLoading');
  const featureGrid = document.getElementById('featureGrid');

  if (outputStream) outputStream.innerHTML = '';
  if (outputArea) outputArea.style.display = 'none';
  if (outputStats) outputStats.style.display = 'none';
  if (outputLoading) outputLoading.style.display = 'none';
  if (featureGrid) featureGrid.style.display = '';

  ['planStatus', 'tcCountDisplay', 'covCountDisplay', 'autoCountDisplay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '-';
  });

  document.querySelectorAll('.out-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.disabled = true;
    tab.classList.add('disabled');
    tab.setAttribute('aria-disabled', 'true');
  });
}

// ===== HISTORY PANEL =====
function renderHistoryPanel() {
  const panel = document.getElementById('historyList');
  if (!panel) return;
  const history = AppState.history;
  if (history.length === 0) {
    panel.innerHTML = '<div class="history-empty"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>No recent chats</span></div>';
    return;
  }
  panel.innerHTML = history.map(h => `
    <div class="history-item" data-id="${h.id}">
      <div class="history-title">${h.title}</div>
      <div class="history-meta">
        <span>${h.date}</span>
        ${h.completed ? '<span class="history-check">✓</span>' : '<span class="history-pending">⏳</span>'}
      </div>
    </div>
  `).join('');
}

// ===== SIDEBAR NAVIGATION ACTIVE STATE =====
function initSidebarNav() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href === currentPage) {
      item.classList.add('active');
    } else if (!href || href === '#') {
      // keep as is
    } else {
      item.classList.remove('active');
    }
  });
}

// ===== COPY TO CLIPBOARD UTILITY =====
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => showToast('Copied to clipboard!', 'success'),
    () => showToast('Failed to copy.', 'error')
  );
}

// ===== AI CONNECTION HEALTH CHECK =====
async function refreshAIStatus() {
  const models = AppState.models;
  const statusBar = document.getElementById('aiStatusBar');
  if (!statusBar) return;

  // Use AIEngine to validate. Note: AIEngine must be loaded.
  if (typeof AIEngine === 'undefined') {
    setTimeout(refreshAIStatus, 100);
    return;
  }

  const stats = await AIEngine.validateAll(models);

  for (const engine in stats) {
    const badge = document.getElementById(`status-${engine}`);
    if (!badge) continue;

    badge.classList.remove('checking', 'active', 'inactive');
    const res = stats[engine];
    badge.classList.add(res.status);

    const textEl = badge.querySelector('.status-text');
    if (textEl) textEl.textContent = res.message;

    // Save status to AppState
    AppState.saveModel(engine, { status: res.status });
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  populateUserData();
  initProfileDropdown();
  initModals();
  initTheme();
  initSettings();
  initClearHistory();
  renderHistoryPanel();
  initSidebarNav();
  refreshAIStatus();
  AppState.addLog('Page loaded: ' + window.location.pathname.split('/').pop(), 'navigation');
});

// ===== ENHANCED UI PATCH =====

// 1. PATCH applyTheme — Theme Library 4.0 (12 themes)
function patchApplyTheme() {
  var ALL_THEME_CLASSES = [
    'theme-clean-light','theme-emudhra','theme-exec-navy','theme-graphite',
    'theme-emerald','theme-sapphire','theme-sunset','theme-platinum',
    'theme-cyber','theme-aurora','theme-arctic','theme-high-contrast',
    // legacy keys kept for localStorage migration
    'theme-light','theme-dark','theme-midnight','theme-contrast',
    'theme-ocean','theme-forest','theme-carbon','theme-royal','theme-dawn'
  ];
  var DARK_THEMES_4 = ['exec-navy','graphite','cyber','dark','midnight','contrast','ocean','forest','carbon','royal'];

  window.applyTheme = function(theme) {
    var requested = theme || (typeof getAppearanceSettings === 'function' ? getAppearanceSettings().theme : 'emudhra') || 'emudhra';
    var resolved   = (typeof resolveSystemTheme === 'function') ? resolveSystemTheme(requested) : requested;
    document.body.classList.remove.apply(document.body.classList, ALL_THEME_CLASSES);
    document.body.classList.add('theme-' + resolved);
    document.body.dataset.themeMode = resolved;
    if (DARK_THEMES_4.indexOf(resolved) !== -1) {
      document.body.classList.remove('em-light-app');
    } else {
      document.body.classList.add('em-light-app');
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem('qa_gen_theme', requested);
  };
}

// 2. FIELD CONTROLS
function initFieldControls() {
  const FIELD_SELECTORS = [
    '.af-input:not([type=hidden]):not(.qg-no-ctrl)',
    '.af-select:not(.qg-no-ctrl)',
    '.form-input:not([type=hidden]):not(.qg-no-ctrl)',
    'textarea.af-input',
    'textarea.form-input'
  ];

  const fields = document.querySelectorAll(FIELD_SELECTORS.join(','));

  fields.forEach(function(field) {
    if (field.type === 'hidden') return;
    if (field.closest('.qg-field-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'qg-field-wrap';

    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);

    const actions = document.createElement('div');
    actions.className = 'qg-field-actions';

    const isSelect = field.tagName === 'SELECT';

    if (!isSelect) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'qg-field-btn qg-edit';
      editBtn.setAttribute('aria-label', 'Edit field');
      editBtn.innerHTML = '<svg width="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      editBtn.addEventListener('click', function() {
        field.focus();
        if (typeof field.select === 'function') field.select();
      });
      actions.appendChild(editBtn);
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'qg-field-btn qg-clear';
    clearBtn.setAttribute('aria-label', 'Clear field');
    clearBtn.innerHTML = '<svg width="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function updateClearVisibility() {
      clearBtn.style.display = field.value ? '' : 'none';
    }

    clearBtn.addEventListener('click', function() {
      field.value = '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      updateClearVisibility();
    });

    field.addEventListener('input', updateClearVisibility);
    field.addEventListener('change', updateClearVisibility);

    updateClearVisibility();

    actions.appendChild(clearBtn);
    wrap.appendChild(actions);
  });
}

// 3. THEME SWITCHER INJECTOR — Theme Library 4.0
function initThemeSwitcher() {
  var THEME_GROUPS = [
    {
      label: 'Light Themes',
      themes: [
        { key: 'emudhra',      name: 'eMudhra Enterprise', tag: 'default' },
        { key: 'clean-light',  name: 'Clean Light',        tag: 'light'   },
        { key: 'emerald',      name: 'Emerald Workspace',  tag: 'light'   },
        { key: 'sapphire',     name: 'Sapphire Analytics', tag: 'light'   },
        { key: 'sunset',       name: 'Sunset Professional',tag: 'light'   },
        { key: 'platinum',     name: 'Platinum Executive', tag: 'light'   },
        { key: 'aurora',       name: 'Aurora Purple',      tag: 'light'   },
        { key: 'arctic',       name: 'Arctic Blue',        tag: 'light'   }
      ]
    },
    {
      label: 'Dark Themes',
      themes: [
        { key: 'exec-navy', name: 'Executive Navy', tag: 'dark' },
        { key: 'graphite',  name: 'Graphite Pro',   tag: 'dark' },
        { key: 'cyber',     name: 'Cyber Command',  tag: 'dark' }
      ]
    },
    {
      label: 'Accessibility',
      themes: [
        { key: 'high-contrast', name: 'High Contrast', tag: 'a11y' }
      ]
    }
  ];

  var toggleBtn = document.createElement('button');
  toggleBtn.className = 'qg-theme-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Choose theme');
  toggleBtn.setAttribute('title', 'Choose theme');
  toggleBtn.innerHTML = '<svg width="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg>';

  var topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    topbarRight.insertBefore(toggleBtn, topbarRight.firstChild);
  } else {
    document.body.appendChild(toggleBtn);
  }

  var panel = document.createElement('div');
  panel.className = 'qg-theme-panel';

  var panelHeader = document.createElement('div');
  panelHeader.className = 'qg-theme-panel-hdr';
  panelHeader.innerHTML = '<span class="qg-theme-panel-title">Choose Theme</span><span class="qg-theme-panel-count">12 themes</span>';
  panel.appendChild(panelHeader);

  // Keep a flat list of all cards for active marking
  var allCards = [];

  THEME_GROUPS.forEach(function(group) {
    var groupEl = document.createElement('div');
    groupEl.className = 'qg-theme-group';

    var groupLabel = document.createElement('div');
    groupLabel.className = 'qg-theme-group-label';
    groupLabel.textContent = group.label;
    groupEl.appendChild(groupLabel);

    var grid = document.createElement('div');
    grid.className = 'qg-theme-grid qg-tg-' + group.themes.length;

    group.themes.forEach(function(t) {
      var card = document.createElement('div');
      card.className = 'qg-theme-card';
      card.dataset.theme = t.key;
      card.setAttribute('title', t.name);

      var swatch = document.createElement('div');
      swatch.className = 'qg-tc-swatch';

      var name = document.createElement('span');
      name.className = 'qg-tc-name';
      name.textContent = t.name;

      var tag = document.createElement('span');
      tag.className = 'qg-tc-tag';
      tag.textContent = t.tag;

      card.appendChild(swatch);
      card.appendChild(name);
      card.appendChild(tag);

      card.addEventListener('click', function() {
        if (typeof applyAppearanceSettings === 'function') {
          applyAppearanceSettings({ theme: t.key });
        } else if (typeof applyTheme === 'function') {
          applyTheme(t.key);
          localStorage.setItem('qa_gen_theme', t.key);
        }
        allCards.forEach(function(c) { c.classList.remove('active'); });
        card.classList.add('active');
        panel.classList.remove('open');
      });

      allCards.push(card);
      grid.appendChild(card);
    });

    groupEl.appendChild(grid);
    panel.appendChild(groupEl);
  });

  document.body.appendChild(panel);

  function markActiveCard() {
    var current = localStorage.getItem('qa_gen_theme') || 'emudhra';
    if (typeof getAppearanceSettings === 'function') {
      current = getAppearanceSettings().theme || current;
    }
    // migrate legacy keys
    var legacyMap = { 'light': 'clean-light', 'dark': 'exec-navy', 'dawn': 'sunset', 'midnight': 'exec-navy', 'ocean': 'exec-navy', 'forest': 'emerald', 'carbon': 'graphite', 'royal': 'aurora' };
    if (legacyMap[current]) current = legacyMap[current];
    allCards.forEach(function(c) { c.classList.toggle('active', c.dataset.theme === current); });
  }

  markActiveCard();

  toggleBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    markActiveCard();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target !== toggleBtn) {
      panel.classList.remove('open');
    }
  });
}

// 4. INIT
function initEnhancedUI() {
  patchApplyTheme();
  setTimeout(initFieldControls, 200);
  initThemeSwitcher();
}

document.addEventListener('DOMContentLoaded', initEnhancedUI);
