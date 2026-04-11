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
  consumeToken() {
    const current = this.tokens;
    if (current <= 0) return false;
    localStorage.setItem('qa_gen_tokens', current - 1);
    this.addLog('Token consumed. Remaining: ' + (current - 1), 'token');
    return true;
  },
  get tokenUsagePercent() {
    return Math.round((this.tokens / SYSTEM.MAX_TOKENS) * 100);
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
    // Global clear for current session state if needed
    window.location.reload(); 
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
      jira: { connected: false, baseUrl: '', email: '', apiKey: '' },
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
      current: 'ollama',
      data: {
        groq: { 
          name: 'Groq (8B Fast)',
          baseUrl: 'https://api.groq.com/openai/v1', 
          apiKey: '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',
          version: 'llama3-8b-8192',
          status: 'inactive'
        },
        gemini: { 
          name: 'Gemini (1.5 Flash)',
          baseUrl: 'https://generativelanguage.googleapis.com', 
          apiKey: 'AIzaSyBTm87fLIeGnEzRA-VuqB2i-UF1-Qyt6Xo',
          version: 'gemini-1.5-flash',
          status: 'inactive'
        },
        ollama: { 
          name: 'Ollama (Local)',
          baseUrl: 'http://127.0.0.1:11435', 
          apiKey: '037fbb896a724514a1b8832e46da3381.BmmzLiYNiQvSv6WdKc0q7-VS',
          version: 'gemma3:latest',
          status: 'active'
        }
      }
    };
    let data = m ? JSON.parse(m) : defaults;
    
    let needsSave = false;

    // Auto-migrate: relay port (11434 → 11435)
    if (data.ollama && data.ollama.baseUrl && data.ollama.baseUrl.includes('11434')) {
        data.ollama.baseUrl = 'http://127.0.0.1:11435';
        needsSave = true;
    }

    // Auto-migrate: stale model version (gemma:7b, bare 'gemma3', anything old → gemma3:latest)
    const staleModels = ['gemma:7b', 'gemma3', 'gemma:latest', 'llama3', 'mixtral', 'gemini-1.5-pro'];
    if (data.ollama && staleModels.includes(data.ollama.version)) {
        data.ollama.version = 'gemma3:latest';
        needsSave = true;
    }

    // Force set the new tokens if they are empty or still in old format
    if (!data.groq.apiKey || data.groq.apiKey.length < 5) {
        data.groq.apiKey = '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';
        data.groq.baseUrl = 'https://api.groq.com/openai/v1';
        needsSave = true;
    }
    if (!data.gemini.apiKey || data.gemini.apiKey.length < 5) {
        data.gemini.apiKey = 'AIzaSyBTm87fLIeGnEzRA-VuqB2i-UF1-Qyt6Xo';
        needsSave = true;
    }
    if (!data.ollama.apiKey || data.ollama.apiKey.length < 5) {
        data.ollama.apiKey = '037fbb896a724514a1b8832e46da3381.BmmzLiYNiQvSv6WdKc0q7-VS';
        needsSave = true;
    }

    if (needsSave) {
        localStorage.setItem('qa_gen_models', JSON.stringify(data));
    }
    
    return data;
  },
  saveModel(name, data) {
    const models = this.models;
    models[name] = { ...models[name], ...data };
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
  const lower = text.toLowerCase().trim();
  const forbiddenPatterns = [
    /write me a (poem|story|song|joke)/i,
    /tell me a joke/i,
    /who (is|are) you/i,
    /what is (the weather|your name)/i,
    /play (a game|music)/i,
    /hack|exploit|inject|bypass|crack/i,
    /how to (cook|invest|travel)/i
  ];
  return forbiddenPatterns.some(p => p.test(lower));
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
    el.className = el.className.replace(/sub-\w+/g, '') + ' sub-' + subColor;
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
      const user = AppState.user;
      if (user) {
        document.getElementById('editName').value = user.name;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editRole').value = user.role;
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
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) m.style.display = 'none';
    });
  });

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

// ===== THEME =====
function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-system', 'theme-custom');
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
  } else {
    document.body.classList.add('theme-' + theme);
  }
  localStorage.setItem('qa_gen_theme', theme);
}

function initTheme() {
  const stored = localStorage.getItem('qa_gen_theme') || 'dark';
  applyTheme(stored);
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = stored;
}

// ===== CLEAR HISTORY (with confirm popup — does NOT clear logs) =====
function initClearHistory() {
  const btn = document.getElementById('clearHistoryBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      showConfirm('Clear all conversation history and reset percentages? Logs will NOT be deleted. This cannot be undone.', () => {
        AppState.clearHistory();
        renderHistoryPanel();
        showToast('History and percentages cleared. Logs preserved.', 'success');
        // Update any percentage displays on page
        document.querySelectorAll('[data-prd-pct]').forEach(el => el.textContent = '0%');
        document.querySelectorAll('[data-tc-pct]').forEach(el => el.textContent = '0%');
      });
    });
  }
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
  initClearHistory();
  renderHistoryPanel();
  initSidebarNav();
  refreshAIStatus();
  AppState.addLog('Page loaded: ' + window.location.pathname.split('/').pop(), 'navigation');
});
