// ===== SHARED AUTH GUARD =====
(function() {
  const user = sessionStorage.getItem('qa_gen_user');
  if (!user) {
    window.location.href = '/index.html';
  }
})();

// ===== SESSION HEARTBEAT =====
(function() {
  var AUTH_SERVER = '';
  var LOGOUT_MSGS = {
    force_logout:        'You have been logged out by an administrator. Please contact your workspace admin if this was unexpected.',
    session_expired:     'Your session has expired. Please sign in again.',
    concurrent_override: 'Your session was ended because the same account was accessed from another device. If this wasn\'t you, please reset your password immediately.'
  };
  function beat() {
    var sid = sessionStorage.getItem('qa_gen_session_id');
    if (!sid) return;
    fetch(AUTH_SERVER + '/api/session/heartbeat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (!data.valid) {
        sessionStorage.setItem('qa_gen_logout_reason', data.reason || 'session_expired');
        sessionStorage.setItem('qa_gen_logout_msg', LOGOUT_MSGS[data.reason] || 'Your session has ended.');
        sessionStorage.removeItem('qa_gen_user');
        sessionStorage.removeItem('qa_gen_session_id');
        window.location.href = '/index.html';
      }
    }).catch(function() { /* server unreachable — don't force logout */ });
  }
  setInterval(beat, 30000);
})();

// ===== PREMIUM THEME CSS =====
(function() {
  if (!document.querySelector('[data-pm-theme], link[href*="theme-premium"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/styles/theme-premium.css';
    link.setAttribute('data-pm-theme', '1');
    document.head.appendChild(link);
  }
})();

// ===== API CONFIG SEEDER =====
(function() {
  if (!document.querySelector('[data-api-config]')) {
    var s = document.createElement('script');
    s.src = '/src/app/api-config.js';
    s.setAttribute('data-api-config', '1');
    document.head.appendChild(s);
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
      current: 'groq',
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
        },
        groq: {
          name: 'Groq Cloud',
          baseUrl: 'https://api.groq.com/openai/v1',
          apiKey: '',
          version: 'llama-3.3-70b-versatile',
          status: 'inactive',
          active: true,
          apiTokens: { total: 1000000, spent: 0 }
        }
      }
    };
    let data = m ? JSON.parse(m) : defaults;
    
    if (!data.data) {
        const newData = { current: data.current || defaults.current, data: { ...defaults.data } };
        ['ollama', 'mistral', 'huggingface', 'sarvam'].forEach(k => {
            if (data[k]) newData.data[k] = { ...newData.data[k], ...data[k] };
        });
        data = newData;
    }
    
    // Purge deprecated/blocked models completely from state
    ['openrouter', 'deepseek'].forEach(oldKey => {
        if (data.data[oldKey]) {
            delete data.data[oldKey];
        }
    });
    if (['openrouter', 'deepseek'].includes(data.current)) {
        data.current = defaults.current;
    }

    // Auto-inject missing models
    ['ollama', 'mistral', 'huggingface', 'anthropic', 'openai', 'gemini', 'sarvam', 'groq'].forEach(model => {
        if (!data.data[model]) data.data[model] = defaults.data[model];
    });
    data.current = data.current || defaults.current;

    // Pick up flat-format keys written by api-config.js even when nested structure already exists
    ['mistral', 'huggingface', 'sarvam'].forEach(k => {
        if (data[k] && data[k].apiKey && data.data[k] && !data.data[k].apiKey) {
            data.data[k].apiKey = data[k].apiKey;
        }
    });

    let needsSave = false;
    console.log('--- Model Configuration Migration Check ---');

    if (data.data.mistral) {
        data.data.mistral.name = 'Mistral AI';
        data.data.mistral.baseUrl = 'https://api.mistral.ai/v1';
        if (!data.data.mistral.apiKey) data.data.mistral.apiKey = '';
        data.data.mistral.version = data.data.mistral.version || 'mistral-large-latest';
        needsSave = true;
    }

    // Force Hugging Face migration to verified Router API
    if (data.data.huggingface) {
        if (!data.data.huggingface.apiKey) data.data.huggingface.apiKey = '';
        data.data.huggingface.baseUrl = 'https://router.huggingface.co';
        data.data.huggingface.version = 'meta-llama/Llama-3.3-70B-Instruct';
        needsSave = true;
    }

    // Force Ollama migration to user provided key and llama3:8b
    if (data.data.ollama) {
        data.data.ollama.apiKey = '';
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
        if (!data.data.sarvam.version || data.data.sarvam.version === 'sarvam-2b' || data.data.sarvam.version === 'sarvam-m') {
            data.data.sarvam.version = 'sarvam-30b';
            needsSave = true;
        }
    }
    if (data.data.groq) {
        data.data.groq.name = 'Groq Cloud';
        data.data.groq.baseUrl = 'https://api.groq.com/openai/v1';
        if (!data.data.groq.version || !['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','gemma2-9b-it'].includes(data.data.groq.version)) {
            data.data.groq.version = 'llama-3.3-70b-versatile';
        }
        needsSave = true;
    }

    // Select the server-configured Groq provider once, without overriding later user choices.
    if (!localStorage.getItem('qa_gen_groq_server_migrated')) {
        data.current = 'groq';
        localStorage.setItem('qa_gen_groq_server_migrated', '1');
        needsSave = true;
    }

    if (!['mistral', 'ollama', 'groq'].includes(data.current) && !(data.data[data.current] && data.data[data.current].apiKey)) {
        data.current = defaults.current;
        needsSave = true;
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
    var sid = sessionStorage.getItem('qa_gen_session_id');
    if (sid) {
      try { fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) }).catch(function(){}); } catch(_){}
    }
    sessionStorage.removeItem('qa_gen_user');
    sessionStorage.removeItem('qa_gen_session_id');
    window.location.href = '/index.html';
  }
};

// ===== PROFILE PHOTO =====
var PROFILE_PHOTO_KEY = 'qa_gen_profile_photo';

function applyProfilePhoto() {
  var photo = localStorage.getItem(PROFILE_PHOTO_KEY);
  document.querySelectorAll('[data-user-initials]').forEach(function(el) {
    if (el.id === 'epAvatarInitials') return;
    if (photo) {
      el.classList.add('has-photo');
      // Use CSS custom property so the photo survives theme !important gradient rules
      el.style.setProperty('--ep-photo-url', 'url(' + photo + ')');
    } else {
      el.classList.remove('has-photo');
      el.style.removeProperty('--ep-photo-url');
    }
  });
}

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
  applyProfilePhoto();

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
    el.addEventListener('click', () => showLogoutConfirm());
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
      // Refresh modal photo preview
      var ring = document.getElementById('epPhotoRing');
      if (ring) {
        delete ring.dataset.pendingPhoto;
        var img = document.getElementById('epPhotoImg');
        var ini = document.getElementById('epAvatarInitials');
        var err = document.getElementById('epPhotoError');
        var stored = localStorage.getItem(PROFILE_PHOTO_KEY);
        if (ini && user) ini.textContent = user.initials || (user.name || 'AD').substring(0, 2).toUpperCase();
        if (err) err.style.display = 'none';
        if (stored) {
          if (img) { img.src = stored; img.style.display = 'block'; }
          if (ini) ini.style.display = 'none';
        } else {
          if (img) { img.src = ''; img.style.display = 'none'; }
          if (ini) ini.style.display = '';
        }
        var fileInput = document.getElementById('epPhotoInput');
        if (fileInput) fileInput.value = '';
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
      // Save pending photo if one was selected
      var ring = document.getElementById('epPhotoRing');
      if (ring && ring.dataset.pendingPhoto) {
        localStorage.setItem(PROFILE_PHOTO_KEY, ring.dataset.pendingPhoto);
        delete ring.dataset.pendingPhoto;
      }
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

// ===== LOGOUT CONFIRMATION =====
function showLogoutConfirm() {
  if (document.getElementById('logoutConfirmOverlay')) return;
  const user    = AppState.user;
  const firstName = user ? user.name.split(' ')[0] : 'there';

  const ov = document.createElement('div');
  ov.id = 'logoutConfirmOverlay';
  ov.style.cssText =
    'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,.76);' +
    'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
    'animation:lcFadeIn .25s ease';

  ov.innerHTML = `
    <style>
      @keyframes lcFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes lcPop{0%{transform:scale(.55) translateY(24px);opacity:0}
        68%{transform:scale(1.05) translateY(-4px);opacity:1}
        100%{transform:scale(1) translateY(0)}}
      @keyframes lcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
      @keyframes lcBrow{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      #lcCard{animation:lcPop .48s cubic-bezier(.34,1.56,.64,1) both}
      #lcAv{animation:lcPulse 2.2s ease-in-out infinite}
    </style>
    <div id="lcCard" style="background:linear-gradient(148deg,#0d041a 0%,#1c0a28 55%,#0d041a 100%);
        border:1.5px solid rgba(212,175,55,.32);border-radius:26px;
        padding:38px 34px 30px;max-width:390px;width:92%;text-align:center;
        box-shadow:0 48px 130px rgba(0,0,0,.85);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;
          background:radial-gradient(ellipse at 50% -8%,rgba(212,175,55,.13) 0%,transparent 62%);
          pointer-events:none"></div>
      <!-- Sad Veda face -->
      <div id="lcAv" style="width:84px;height:84px;border-radius:50%;
          background:linear-gradient(135deg,#7B1535,#4A0E1F);
          border:2.5px solid rgba(212,175,55,.45);
          margin:0 auto 20px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 32px rgba(212,175,55,.14)">
        <svg width="56" height="56" viewBox="0 0 58 58" fill="none">
          <circle cx="29" cy="27" r="17" fill="#C07868"/>
          <!-- worried brows -->
          <path d="M19 20 Q23 17.5 27 20" stroke="#5a2a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M31 20 Q35 17.5 39 20" stroke="#5a2a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <!-- big sad eyes -->
          <ellipse cx="23" cy="26" rx="3.4" ry="4.6" fill="#1a0820"/>
          <ellipse cx="35" cy="26" rx="3.4" ry="4.6" fill="#1a0820"/>
          <circle cx="24" cy="24.2" r="1.4" fill="white"/>
          <circle cx="36" cy="24.2" r="1.4" fill="white"/>
          <!-- sad mouth -->
          <path d="M23.5 33.5 Q29 30 34.5 33.5" stroke="#7B1535" stroke-width="1.7" stroke-linecap="round" fill="none"/>
          <!-- tiny tear drops -->
          <ellipse cx="21.5" cy="31" rx="1" ry="1.5" fill="rgba(100,160,255,.55)"/>
          <ellipse cx="36.5" cy="31" rx="1" ry="1.5" fill="rgba(100,160,255,.55)"/>
          <path d="M12 25 Q12 10 29 10 Q46 10 46 25 Q42 12 29 12 Q16 12 12 25Z" fill="#1a0820"/>
          <path d="M12 27 Q10 33 13.5 36" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>
          <circle cx="13" cy="36" r="3.2" fill="#D4AF37"/>
          <path d="M46 27 Q48 33 44.5 36" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>
          <circle cx="45" cy="36" r="3.2" fill="#D4AF37"/>
          <path d="M12 27 Q29 18 46 27" stroke="#D4AF37" stroke-width="1.6" fill="none"/>
        </svg>
      </div>
      <div style="font-size:.63rem;letter-spacing:.18em;color:rgba(212,175,55,.6);font-weight:700;
          text-transform:uppercase;margin-bottom:9px">VEDA &mdash; AI ASSISTANT</div>
      <div style="font-size:1.18rem;font-weight:700;color:#fff;margin-bottom:7px">
        Are you sure, ${firstName}?
      </div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.42);margin-bottom:30px;line-height:1.6">
        I'll miss you! 😢<br>All your progress is saved and waiting.
      </div>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="lcYes" style="flex:1;background:linear-gradient(135deg,#6B1128,#3A0A18);
            color:#fff;font-weight:700;font-size:.87rem;
            border:1.5px solid rgba(212,175,55,.25);border-radius:13px;
            padding:13px 0;cursor:pointer;transition:all .2s;position:relative;overflow:hidden">
          Yes, Logout
        </button>
        <button id="lcNo" style="flex:1;
            background:linear-gradient(135deg,#D4AF37,#B8962E);
            color:#0d041a;font-weight:800;font-size:.87rem;
            border:none;border-radius:13px;
            padding:13px 0;cursor:pointer;transition:all .2s">
          No, Stay! 🙏
        </button>
      </div>
    </div>`;

  document.body.appendChild(ov);

  const dismiss = (confirmed) => {
    ov.style.transition = 'opacity .28s ease';
    ov.style.opacity    = '0';
    setTimeout(() => {
      ov.remove();
      if (confirmed) showVedaGoodbye(() => AppState.logout());
    }, 290);
  };

  document.getElementById('lcYes').addEventListener('click', () => dismiss(true));
  document.getElementById('lcNo').addEventListener('click',  () => dismiss(false));
  ov.addEventListener('click', e => { if (e.target === ov) dismiss(false); });

  const yBtn = document.getElementById('lcYes');
  const nBtn = document.getElementById('lcNo');
  yBtn.addEventListener('mouseover', () => { yBtn.style.transform = 'translateY(-2px) scale(1.03)'; yBtn.style.boxShadow = '0 6px 24px rgba(123,21,53,.45)'; });
  yBtn.addEventListener('mouseout',  () => { yBtn.style.transform = ''; yBtn.style.boxShadow = ''; });
  nBtn.addEventListener('mouseover', () => { nBtn.style.transform = 'translateY(-2px) scale(1.03)'; nBtn.style.boxShadow = '0 6px 24px rgba(212,175,55,.4)'; });
  nBtn.addEventListener('mouseout',  () => { nBtn.style.transform = ''; nBtn.style.boxShadow = ''; });
}

// Expose for emi.js logout intercept
window.showLogoutConfirm = showLogoutConfirm;

// ===== VEDA GOODBYE — AI / Neural-Network Theme =====
function showVedaGoodbye(onLogout) {
  const user = AppState.user;
  const firstName = user ? user.name.split(' ')[0] : 'there';

  /* ── Overlay ── */
  const ov = document.createElement('div');
  ov.id = 'vedaGoodbyeOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:hidden;background:#030318;font-family:Outfit,Inter,sans-serif;opacity:0;transition:opacity 0.5s ease;';
  document.body.appendChild(ov);
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = '1'; }));

  /* ── NEURAL NETWORK CANVAS ── */
  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;inset:0;';
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  ov.appendChild(cvs);
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;

  /* Node colour palette with rgb triplets for gradient construction */
  const nodeSpec = [
    { hex: '#00cfff', rgb: '0,207,255' },
    { hex: '#8b5cf6', rgb: '139,92,246' },
    { hex: '#00ff88', rgb: '0,255,136' },
  ];

  const nodes = Array.from({ length: 42 }, (_, i) => {
    const col = nodeSpec[i % 3];
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: 2.5 + Math.random() * 3.2,
      vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
      glow: Math.random(), glowDir: Math.random() > 0.5 ? 0.014 : -0.014,
      hex: col.hex, rgb: col.rgb,
    };
  });

  let pulses = [];
  const spawnPulse = () => {
    const a = (Math.random() * nodes.length) | 0;
    const b = (Math.random() * nodes.length) | 0;
    if (a === b) return;
    const dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y;
    if (Math.sqrt(dx * dx + dy * dy) < 195)
      pulses.push({ from: a, to: b, t: 0, speed: 0.016 + Math.random() * 0.025, rgb: nodes[a].rgb });
  };
  for (let i = 0; i < 24; i++) spawnPulse();

  let alive = true;
  const t0 = Date.now();
  const COLLAPSE_AT = 3100;

  const drawNN = () => {
    if (!alive) return;
    const elapsed = Date.now() - t0;
    const cpct = Math.max(0, (elapsed - COLLAPSE_AT) / 1100);

    ctx.fillStyle = 'rgba(3,3,24,0.17)';
    ctx.fillRect(0, 0, W, H);

    /* Edges */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 190) {
          ctx.strokeStyle = `rgba(0,155,235,${(1 - d / 190) * 0.22 * (1 - cpct * 0.85)})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    /* Pulses travelling along edges */
    pulses = pulses.filter(p => {
      p.t += p.speed;
      if (p.t >= 1) { spawnPulse(); return false; }
      const fn = nodes[p.from], tn = nodes[p.to];
      const px = fn.x + (tn.x - fn.x) * p.t;
      const py = fn.y + (tn.y - fn.y) * p.t;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, 10);
      gr.addColorStop(0, `rgba(${p.rgb},0.92)`);
      gr.addColorStop(1, `rgba(${p.rgb},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    /* Nodes — drift and slowly collapse toward centre */
    const cx = W / 2, cy = H / 2;
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (cpct > 0) {
        n.x += (cx - n.x) * 0.007 * cpct * 3.5;
        n.y += (cy - n.y) * 0.007 * cpct * 3.5;
      }
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      n.glow += n.glowDir;
      if (n.glow > 1 || n.glow < 0.15) n.glowDir *= -1;

      /* Glow halo */
      const glowR = n.r * 5 * n.glow;
      const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
      gr.addColorStop(0, `rgba(${n.rgb},${0.5 * n.glow})`);
      gr.addColorStop(1, `rgba(${n.rgb},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2); ctx.fill();

      /* Core dot */
      ctx.fillStyle = n.hex;
      ctx.shadowColor = n.hex;
      ctx.shadowBlur = 8 * n.glow;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(drawNN);
  };
  drawNN();

  /* ── BRAINWAVE at bottom ── */
  const wCvs = document.createElement('canvas');
  wCvs.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:60px;pointer-events:none;';
  wCvs.width = window.innerWidth; wCvs.height = 60;
  ov.appendChild(wCvs);
  const wCtx = wCvs.getContext('2d');
  let wOff = 0;
  const drawWave = () => {
    if (!alive) return;
    wCtx.clearRect(0, 0, wCvs.width, 60);
    wCtx.beginPath();
    for (let x = 0; x <= wCvs.width; x += 2) {
      const y = 30 + Math.sin(x * 0.017 + wOff) * 14 + Math.sin(x * 0.031 + wOff * 1.5) * 7;
      x === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
    }
    const wg = wCtx.createLinearGradient(0, 0, wCvs.width, 0);
    wg.addColorStop(0,    'rgba(0,207,255,0)');
    wg.addColorStop(0.25, 'rgba(0,207,255,0.55)');
    wg.addColorStop(0.5,  'rgba(139,92,246,0.7)');
    wg.addColorStop(0.75, 'rgba(0,207,255,0.55)');
    wg.addColorStop(1,    'rgba(0,207,255,0)');
    wCtx.strokeStyle = wg;
    wCtx.lineWidth = 2;
    wCtx.shadowColor = '#00cfff';
    wCtx.shadowBlur = 8;
    wCtx.stroke();
    wCtx.shadowBlur = 0;
    wOff += 0.055;
    requestAnimationFrame(drawWave);
  };
  drawWave();

  /* ── CENTRAL MESSAGE ── */
  const msg = document.createElement('div');
  msg.style.cssText =
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'text-align:center;opacity:0;transition:opacity 0.7s ease;pointer-events:none;' +
    'background:rgba(3,3,24,0.72);padding:32px 44px;border-radius:18px;' +
    'border:1px solid rgba(0,207,255,0.14);' +
    'box-shadow:0 0 60px rgba(0,207,255,0.07),0 24px 60px rgba(0,0,0,0.5);';
  msg.innerHTML = `
    <div style="display:inline-flex;align-items:center;gap:8px;
      background:rgba(0,207,255,0.07);border:1px solid rgba(0,207,255,0.24);
      border-radius:20px;padding:5px 16px;margin-bottom:20px;">
      <div style="width:7px;height:7px;border-radius:50%;background:#00cfff;
        box-shadow:0 0 10px #00cfff;animation:vgbDot 0.9s ease-in-out infinite;"></div>
      <span style="font-size:10px;color:rgba(0,207,255,0.72);letter-spacing:2.5px;font-family:Consolas,monospace;">AI SESSION COMPLETE</span>
    </div>
    <div style="font-size:2.6rem;font-weight:900;line-height:1.1;margin-bottom:12px;
      background:linear-gradient(135deg,#00cfff 0%,#8b5cf6 50%,#00ff88 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
      Goodbye, ${firstName}
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.28);margin-bottom:22px;letter-spacing:0.4px;">
      Your session data has been saved securely to eMudhra Cloud
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:20px;
      font-size:10.5px;color:rgba(0,207,255,0.38);font-family:Consolas,monospace;letter-spacing:0.5px;">
      <span>&#x26A1; AI: Offline</span>
      <span style="opacity:0.25;">|</span>
      <span>&#x1F512; Encrypted</span>
      <span style="opacity:0.25;">|</span>
      <span>&#x2601; Synced</span>
    </div>
    <style>@keyframes vgbDot{0%,100%{opacity:0.35;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}</style>
  `;
  ov.appendChild(msg);
  setTimeout(() => { msg.style.opacity = '1'; }, 650);

  /* ── Dismiss after 4.3 s ── */
  setTimeout(() => {
    alive = false;
    ov.style.transition = 'opacity 0.75s ease';
    ov.style.opacity = '0';
    setTimeout(() => { if (ov.parentNode) ov.remove(); onLogout(); }, 780);
  }, 4300);
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

// ===== PERSISTENT ALERT BANNERS (error / warning) =====
function showAlert(message, type, title) {
  type = type || 'error';
  if (!document.getElementById('qaAlertStyles')) {
    const s = document.createElement('style');
    s.id = 'qaAlertStyles';
    s.textContent = `
      .qa-alert{position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:99999;min-width:320px;max-width:min(680px,calc(100vw - 32px));border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.32),0 2px 8px rgba(0,0,0,0.14);display:flex;align-items:flex-start;gap:12px;padding:14px 16px;font-size:0.82rem;line-height:1.5;animation:qaAlertIn 0.28s cubic-bezier(.34,1.56,.64,1) both;border:1px solid transparent;}
      @keyframes qaAlertIn{from{opacity:0;transform:translateX(-50%) translateY(-10px) scale(0.97);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
      .qa-alert.qa-error{background:#1c0a0a;border-color:rgba(239,68,68,0.4);}
      .qa-alert.qa-warning{background:#1c1204;border-color:rgba(245,158,11,0.4);}
      .qa-alert.qa-info{background:#051620;border-color:rgba(59,130,246,0.4);}
      .qa-alert.qa-success{background:#041a0e;border-color:rgba(16,185,129,0.4);}
      .qa-alert-icon{font-size:1.15rem;flex-shrink:0;margin-top:1px;}
      .qa-alert.qa-error   .qa-alert-icon{color:#ef4444;}
      .qa-alert.qa-warning .qa-alert-icon{color:#f59e0b;}
      .qa-alert.qa-info    .qa-alert-icon{color:#3b82f6;}
      .qa-alert.qa-success .qa-alert-icon{color:#10b981;}
      .qa-alert-body{flex:1;min-width:0;}
      .qa-alert-title{font-weight:700;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;}
      .qa-alert.qa-error   .qa-alert-title{color:#ef4444;}
      .qa-alert.qa-warning .qa-alert-title{color:#f59e0b;}
      .qa-alert.qa-info    .qa-alert-title{color:#3b82f6;}
      .qa-alert.qa-success .qa-alert-title{color:#10b981;}
      .qa-alert-msg{color:#c8d4e0;}
      .qa-alert-close{flex-shrink:0;background:transparent;border:1px solid rgba(255,255,255,0.14);border-radius:6px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#7a8fa8;font-size:14px;transition:background 0.15s,color 0.15s;padding:0;}
      .qa-alert-close:hover{background:rgba(255,255,255,0.08);color:#e2e8f0;}
    `;
    document.head.appendChild(s);
  }
  const ICONS = { error: '✕', warning: '⚠', info: 'ℹ', success: '✓' };
  const TITLES = { error: title || 'Error', warning: title || 'Warning', info: title || 'Information', success: title || 'Success' };
  const alertId = 'qaAlert_' + type;
  const prev = document.getElementById(alertId);
  if (prev) prev.remove();
  const el = document.createElement('div');
  el.id = alertId;
  el.className = `qa-alert qa-${type}`;
  el.innerHTML = `<span class="qa-alert-icon">${ICONS[type] || ICONS.info}</span><div class="qa-alert-body"><div class="qa-alert-title">${TITLES[type]}</div><div class="qa-alert-msg">${message}</div></div><button class="qa-alert-close" type="button" onclick="document.getElementById('${alertId}').remove()" title="Close">✕</button>`;
  document.body.appendChild(el);
}

// ===== TOAST (success / info — auto-dismiss) =====
function showToast(message, type = 'info', duration = 3500) {
  // Route errors and warnings to persistent alert banner
  if (type === 'error' || type === 'warning') {
    showAlert(message, type);
    return;
  }
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✓', info: 'ℹ' };
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
  const modelsData = models.data || {};
  const failedConfigured = [];

  for (const engine in stats) {
    const badge = document.getElementById(`status-${engine}`);
    if (badge) {
      badge.classList.remove('checking', 'active', 'inactive');
      const res = stats[engine];
      badge.classList.add(res.status);
      const textEl = badge.querySelector('.status-text');
      if (textEl) textEl.textContent = res.message;
    }

    const res = stats[engine];
    // Collect models where user has set an API key but connection failed
    if (res.status !== 'active' && modelsData[engine] && modelsData[engine].apiKey) {
      failedConfigured.push({ engine, message: res.message });
    }

    // Save status to AppState
    AppState.saveModel(engine, { status: res.status });
  }

  // Show one grouped warning alert if any configured models have issues (once per session)
  if (failedConfigured.length > 0 && !sessionStorage.getItem('qa_health_warned')) {
    sessionStorage.setItem('qa_health_warned', '1');
    const names = failedConfigured.map(f => f.engine.toUpperCase()).join(', ');
    showToast(`Connection issue detected for: ${names}. Check API keys in Dashboard → Configure.`, 'warning');
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
  toggleBtn.innerHTML = '<svg class="qg-theme-palette-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="5.5" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/></svg>';

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

// 4. PROFILE PHOTO UPLOAD WITH CROP / ROTATE / ZOOM TOOL
var _cs = { img: null, scale: 1, rotation: 0, ox: 0, oy: 0, dragging: false, lx: 0, ly: 0 };
var _CV = 320, _CD = 240, _CR = 120; // viewport px, crop-circle diameter & radius

function _cropInject() {
  if (document.getElementById('photoCropOverlay')) return;
  var ov = document.createElement('div');
  ov.id = 'photoCropOverlay';
  ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;' +
    'background:rgba(0,0,0,0.74);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
    'align-items:center;justify-content:center;';
  ov.innerHTML =
    '<div style="background:#1a2035;border-radius:18px;box-shadow:0 20px 80px rgba(0,0,0,.6);' +
      'width:380px;max-width:95vw;font-family:Inter,sans-serif;overflow:hidden;">' +
      // ── header ──
      '<div style="padding:15px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.08);' +
          'display:flex;align-items:center;justify-content:space-between;">' +
        '<span style="font-size:0.92rem;font-weight:700;color:#fff;">Crop Profile Photo</span>' +
        '<button id="_cropCloseBtn" style="background:rgba(255,255,255,0.07);border:none;color:#94a3b8;' +
            'cursor:pointer;width:28px;height:28px;border-radius:6px;font-size:1.1rem;">&times;</button>' +
      '</div>' +
      // ── canvas viewport ──
      '<div id="_cropVP" style="position:relative;width:' + _CV + 'px;height:' + _CV + 'px;' +
          'margin:0 auto;overflow:hidden;cursor:move;touch-action:none;user-select:none;background:#000;">' +
        '<canvas id="_cropCanvas" width="' + _CV + '" height="' + _CV + '" style="display:block;touch-action:none;"></canvas>' +
        '<div style="position:absolute;width:' + _CD + 'px;height:' + _CD + 'px;border-radius:50%;' +
            'border:2.5px solid rgba(255,255,255,0.88);pointer-events:none;' +
            'box-shadow:0 0 0 9999px rgba(0,0,0,0.58);top:50%;left:50%;transform:translate(-50%,-50%);"></div>' +
      '</div>' +
      // ── controls ──
      '<div style="padding:13px 18px 10px;border-top:1px solid rgba(255,255,255,0.07);">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">' +
          '<span style="font-size:0.67rem;font-weight:700;letter-spacing:.07em;color:#64748b;' +
              'min-width:46px;text-transform:uppercase;">Zoom</span>' +
          '<button id="_cropZoomOut" style="width:27px;height:27px;border-radius:6px;' +
              'border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);' +
              'color:#e2e8f0;cursor:pointer;font-size:1.1rem;line-height:1;flex-shrink:0;">&#8722;</button>' +
          '<input type="range" id="_cropSlider" min="0.5" max="4" step="0.02" value="1" ' +
              'style="flex:1;height:4px;accent-color:#3b82f6;cursor:pointer;" />' +
          '<button id="_cropZoomIn"  style="width:27px;height:27px;border-radius:6px;' +
              'border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);' +
              'color:#e2e8f0;cursor:pointer;font-size:1.1rem;line-height:1;flex-shrink:0;">&#43;</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<span style="font-size:0.67rem;font-weight:700;letter-spacing:.07em;color:#64748b;' +
              'min-width:46px;text-transform:uppercase;">Rotate</span>' +
          '<button id="_cropRotL" style="flex:1;height:28px;border-radius:6px;' +
              'border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);' +
              'color:#e2e8f0;cursor:pointer;font-size:0.79rem;font-weight:600;">&#8630; &minus;90&deg;</button>' +
          '<button id="_cropRotR" style="flex:1;height:28px;border-radius:6px;' +
              'border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);' +
              'color:#e2e8f0;cursor:pointer;font-size:0.79rem;font-weight:600;">&#8631; +90&deg;</button>' +
          '<button id="_cropReset" style="flex:1;height:28px;border-radius:6px;' +
              'border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);' +
              'color:#94a3b8;cursor:pointer;font-size:0.77rem;">Reset</button>' +
        '</div>' +
      '</div>' +
      // ── footer ──
      '<div style="padding:12px 18px;border-top:1px solid rgba(255,255,255,0.07);' +
          'display:flex;justify-content:flex-end;gap:10px;">' +
        '<button id="_cropCancelBtn" style="padding:8px 18px;border-radius:7px;' +
            'border:1px solid rgba(255,255,255,.13);background:transparent;color:#94a3b8;' +
            'font-size:0.82rem;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">Cancel</button>' +
        '<button id="_cropApplyBtn"  style="padding:8px 22px;border-radius:7px;border:none;' +
            'background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;' +
            'font-size:0.82rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">Apply Crop</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);

  // Drag – mouse
  var vp = document.getElementById('_cropVP');
  vp.addEventListener('mousedown', function(e) {
    _cs.dragging = true; _cs.lx = e.clientX; _cs.ly = e.clientY; e.preventDefault();
  });
  window.addEventListener('mousemove', function(e) {
    if (!_cs.dragging) return;
    _cs.ox += e.clientX - _cs.lx; _cs.oy += e.clientY - _cs.ly;
    _cs.lx = e.clientX; _cs.ly = e.clientY; _cropDraw();
  });
  window.addEventListener('mouseup', function() { _cs.dragging = false; });

  // Drag – touch
  vp.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    _cs.dragging = true; _cs.lx = e.touches[0].clientX; _cs.ly = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', function(e) {
    if (!_cs.dragging || e.touches.length !== 1) return;
    _cs.ox += e.touches[0].clientX - _cs.lx; _cs.oy += e.touches[0].clientY - _cs.ly;
    _cs.lx = e.touches[0].clientX; _cs.ly = e.touches[0].clientY; _cropDraw();
  }, { passive: false });
  window.addEventListener('touchend', function() { _cs.dragging = false; });

  // Zoom slider
  document.getElementById('_cropSlider').addEventListener('input', function() {
    _cs.scale = parseFloat(this.value); _cropDraw();
  });
  document.getElementById('_cropZoomIn').addEventListener('click', function() {
    _cs.scale = Math.min(4, +(_cs.scale + 0.1).toFixed(2));
    var s = document.getElementById('_cropSlider'); if (s) s.value = _cs.scale; _cropDraw();
  });
  document.getElementById('_cropZoomOut').addEventListener('click', function() {
    _cs.scale = Math.max(0.3, +(_cs.scale - 0.1).toFixed(2));
    var s = document.getElementById('_cropSlider'); if (s) s.value = _cs.scale; _cropDraw();
  });

  // Rotate
  document.getElementById('_cropRotL').addEventListener('click', function() {
    _cs.rotation = (_cs.rotation - 90 + 360) % 360; _cropDraw();
  });
  document.getElementById('_cropRotR').addEventListener('click', function() {
    _cs.rotation = (_cs.rotation + 90) % 360; _cropDraw();
  });

  // Reset
  document.getElementById('_cropReset').addEventListener('click', function() {
    _cs.ox = 0; _cs.oy = 0; _cs.rotation = 0;
    if (_cs.img) _cropFit();
    var s = document.getElementById('_cropSlider'); if (s) s.value = _cs.scale; _cropDraw();
  });

  // Cancel / close
  function _cropHide() {
    document.getElementById('photoCropOverlay').style.display = 'none';
    var inp = document.getElementById('epPhotoInput'); if (inp) inp.value = '';
  }
  document.getElementById('_cropCancelBtn').addEventListener('click', _cropHide);
  document.getElementById('_cropCloseBtn').addEventListener('click', _cropHide);

  // Apply
  document.getElementById('_cropApplyBtn').addEventListener('click', function() {
    var out = document.createElement('canvas');
    out.width = _CD; out.height = _CD;
    var ctx = out.getContext('2d');
    // Clip to circle
    ctx.beginPath(); ctx.arc(_CR, _CR, _CR, 0, Math.PI * 2); ctx.clip();
    // Draw — image center in view is (CV/2 + ox, CV/2 + oy)
    // In output, crop circle top-left is at (CV/2 - CR) in view coords
    // So output origin offset = crop circle offset from view center = CR - (CV/2)
    // output image center = CR + ox, CR + oy
    ctx.save();
    ctx.translate(_CR + _cs.ox, _CR + _cs.oy);
    ctx.rotate(_cs.rotation * Math.PI / 180);
    ctx.scale(_cs.scale, _cs.scale);
    ctx.drawImage(_cs.img, -_cs.img.naturalWidth / 2, -_cs.img.naturalHeight / 2,
                  _cs.img.naturalWidth, _cs.img.naturalHeight);
    ctx.restore();

    var dataUrl = out.toDataURL('image/jpeg', 0.93);
    var ring  = document.getElementById('epPhotoRing');
    var imgEl = document.getElementById('epPhotoImg');
    var iniEl = document.getElementById('epAvatarInitials');
    if (ring)  ring.dataset.pendingPhoto = dataUrl;
    if (imgEl) { imgEl.src = dataUrl; imgEl.style.display = 'block'; }
    if (iniEl) iniEl.style.display = 'none';
    document.getElementById('photoCropOverlay').style.display = 'none';
  });
}

function _cropDraw() {
  var c = document.getElementById('_cropCanvas');
  if (!c || !_cs.img) return;
  var ctx = c.getContext('2d');
  ctx.clearRect(0, 0, _CV, _CV);
  ctx.save();
  ctx.translate(_CV / 2 + _cs.ox, _CV / 2 + _cs.oy);
  ctx.rotate(_cs.rotation * Math.PI / 180);
  ctx.scale(_cs.scale, _cs.scale);
  ctx.drawImage(_cs.img, -_cs.img.naturalWidth / 2, -_cs.img.naturalHeight / 2,
                _cs.img.naturalWidth, _cs.img.naturalHeight);
  ctx.restore();
}

function _cropFit() {
  var iw = _cs.img.naturalWidth, ih = _cs.img.naturalHeight;
  _cs.scale = Math.max(_CD / iw, _CD / ih) * 1.05;
}

function _cropOpen(dataUrl) {
  _cropInject();
  var img = new Image();
  img.onload = function() {
    _cs.img = img; _cs.ox = 0; _cs.oy = 0; _cs.rotation = 0;
    _cropFit();
    var s = document.getElementById('_cropSlider');
    if (s) { s.min = '0.5'; s.max = '4'; s.value = _cs.scale; }
    _cropDraw();
    var ov = document.getElementById('photoCropOverlay');
    if (ov) { ov.style.display = 'flex'; }
  };
  img.src = dataUrl;
}

function initProfilePhotoUpload() {
  var ring    = document.getElementById('epPhotoRing');
  var input   = document.getElementById('epPhotoInput');
  var errorEl = document.getElementById('epPhotoError');
  if (!ring || !input) return;

  ring.addEventListener('click', function() { input.click(); });

  input.addEventListener('change', function() {
    var file = input.files[0];
    if (!file) return;
    if (errorEl) errorEl.style.display = 'none';

    var ext = file.name.toLowerCase().split('.').pop();
    if (!['jpg', 'jpeg', 'png', 'jfif'].includes(ext)) {
      showEpError(errorEl, 'Invalid format — accepted: JPG, JPEG, PNG, JFIF.');
      input.value = ''; return;
    }
    if (file.size < 100 * 1024) {
      showEpError(errorEl, 'File too small — minimum 100 KB (this file: ' + (file.size / 1024).toFixed(1) + ' KB).');
      input.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showEpError(errorEl, 'File too large — maximum 5 MB (this file: ' + (file.size / (1024 * 1024)).toFixed(2) + ' MB).');
      input.value = ''; return;
    }
    var reader = new FileReader();
    reader.onload = function(e) { _cropOpen(e.target.result); };
    reader.readAsDataURL(file);
  });
}

function showEpError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

// 5. HOME BUTTON
function initHomeButton() {
  var brand = document.querySelector('.topbar-brand');
  if (!brand || document.getElementById('qg-home-btn')) return;

  var sep = document.createElement('div');
  sep.style.cssText = 'width:1px;height:20px;background:rgba(255,255,255,0.18);margin:0 10px;flex-shrink:0;';
  brand.appendChild(sep);

  var isActive = window.location.pathname.indexOf('dashboard.html') !== -1;

  var btn = document.createElement('a');
  btn.id = 'qg-home-btn';
  btn.className = 'qg-home-btn' + (isActive ? ' qg-home-btn--active' : '');
  btn.href = 'dashboard.html';
  btn.title = 'Overview';
  btn.setAttribute('aria-label', 'Go to Overview');
  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
      '<polyline points="9 22 9 12 15 12 15 22"/>' +
    '</svg>' +
    '<span>Home</span>';
  brand.appendChild(btn);
}

// 5. INIT
function initEnhancedUI() {
  patchApplyTheme();
  setTimeout(initFieldControls, 200);
  initThemeSwitcher();
  initHomeButton();
  initProfilePhotoUpload();
}

document.addEventListener('DOMContentLoaded', initEnhancedUI);

// ===== PREMIUM MOTION ENGINE =====
(function() {
  if (!document.querySelector('[data-pm-script]')) {
    var script = document.createElement('script');
    script.src = '/src/components/ui/premium-motion.js';
    script.setAttribute('data-pm-script', '1');
    document.head.appendChild(script);
  }
})();
