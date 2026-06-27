document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('mistralModal');
  const openBtn = document.getElementById('settingsBtn');
  const closeBtn = document.getElementById('mistralCloseBtn');
  const keyInput = document.getElementById('mistralKeyInput');
  const saveBtn = document.getElementById('saveMistralBtn');
  const testBtn = document.getElementById('testMistralBtn');
  const autoBtn = document.getElementById('autoDetectModelBtn');
  const modelSelect = document.getElementById('mistralModelSelect');
  const saveModelBtn = document.getElementById('saveModelBtn');
  const modelFilter = document.getElementById('mistralModelFilter');
  const modelList = document.getElementById('mistralModelList');
  const statusEl = document.getElementById('mistralStatus');
  const modelNameEl = document.getElementById('mistralModelName');
  let availableModels = [];
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  // Virtualization / ARIA helpers
  const ITEM_HEIGHT = 40; // px per item (used for virtualization calculations)
  let modelListInner = null;
  let virtualFiltered = [];
  const OVERSCAN = 6;

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--error-red)' : 'var(--accent-green)';
  }

  // Load saved values
  const savedKey = localStorage.getItem('mistral_api_key');
  const savedModel = localStorage.getItem('mistral_model');
  if (savedKey) keyInput.value = savedKey;
  if (savedModel) modelNameEl.textContent = savedModel;
  if (savedModel && modelSelect) modelSelect.value = savedModel;
  if (savedModel && modelFilter) modelFilter.value = '';

  openBtn.addEventListener('click', () => {
    modal.classList.add('open');
  });
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  saveBtn.addEventListener('click', () => {
    const v = keyInput.value.trim();
    if (v) {
      localStorage.setItem('mistral_api_key', v);
      showStatus('Saved locally. Click Test to validate the key.');
    } else {
      localStorage.removeItem('mistral_api_key');
      showStatus('Key cleared from local storage.');
    }
  });

  async function testKeyAndMaybePickModel() {
    const key = keyInput.value.trim() || localStorage.getItem('mistral_api_key') || '';
    if (!key) {
      showStatus('No API key provided (local storage or input).', true);
      return;
    }
    showStatus('Testing key...');
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    try {
      // Call the relay endpoint which will in turn call Mistral.
      const relays = [
        'http://127.0.0.1:11435/mistral_test',
        'http://localhost:11435/mistral_test'
      ];
      let res, text, data;
      for (const url of relays) {
        try {
          res = await fetch(url, { method: 'GET', headers: { 'x-mistral-key': key } });
          text = await res.text();
          // if network error or not found, try next
          if (!res.ok) {
            // continue to try next relay URL
            continue;
          }
          break; // success
        } catch (err) {
          // try next URL
          continue;
        }
      }

      if (!res) {
        showStatus('Could not reach local relay at port 11435 — using local mock models.', true);
        loadMockModels();
        return;
      }
      if (!res.ok) {
        // show raw message if possible and fallback to mock list
        try { data = JSON.parse(text); showStatus('Test failed: ' + (data.error || res.statusText), true); }
        catch (e) { showStatus('Test failed: ' + res.status + ' ' + res.statusText, true); }
        // If the error is unauthorized (401) or any other, offer a local mock fallback so the UI remains usable
        loadMockModels();
        return;
      }

      try { data = JSON.parse(text); } catch (e) { data = text; }
      showStatus('Key validated — response received.');

      // Try to extract models list
      let models = [];
      if (Array.isArray(data)) models = data;
      else if (data && data.models && Array.isArray(data.models)) models = data.models;
      else if (data && data.model && Array.isArray(data.model)) models = data.model;

      if (models.length > 0) {
        // Populate dropdown
        populateModelSelect(models);
        const m = models[0];
        const name = (m && (m.id || m.name || m.model)) || String(m);
        modelNameEl.textContent = name;
        localStorage.setItem('mistral_model', name);
        if (modelSelect) modelSelect.value = name;
        showStatus('Auto-selected model: ' + name);
      } else {
        // Fallback: if response is an object with keys, pick first key
        if (data && typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            modelNameEl.textContent = keys[0];
            localStorage.setItem('mistral_model', keys[0]);
            showStatus('Auto-selected model key: ' + keys[0]);
            return;
          }
        }
        showStatus('No models array found in response, check console for raw response.');
        console.log('mistral_test response:', data);
      }

    } catch (err) {
      console.error('Mistral test error', err);
      showStatus('Network or server error: ' + err.message, true);
    }
    finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Key';
    }
  }

  testBtn.addEventListener('click', testKeyAndMaybePickModel);
  autoBtn.addEventListener('click', testKeyAndMaybePickModel);

  // Populate select helper
  function populateModelSelect(models) {
    if (!modelSelect) return;
    // normalize to list of names and store
    availableModels = models.map((m) => {
      return ((m && (m.id || m.name || m.model)) || String(m || '') );
    }).filter(Boolean);
    refreshModelOptions('');
  }

  function refreshModelOptions(filter) {
    if (!modelSelect) return;
    modelSelect.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '(select a model)';
    modelSelect.appendChild(defaultOpt);
    const q = (filter || '').toLowerCase().trim();
    availableModels.forEach((name) => {
      if (q && !name.toLowerCase().includes(q)) return;
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      modelSelect.appendChild(opt);
    });
    // also refresh custom list UI
    refreshModelList(filter || '');
  }

  // Initialize ARIA attributes for combobox/listbox
  if (modelFilter) {
    modelFilter.setAttribute('role', 'combobox');
    modelFilter.setAttribute('aria-autocomplete', 'list');
    modelFilter.setAttribute('aria-controls', 'mistralModelList');
    modelFilter.setAttribute('aria-expanded', 'false');
    modelFilter.setAttribute('aria-haspopup', 'listbox');
  }
  if (modelList) {
    modelList.setAttribute('role', 'listbox');
    modelList.setAttribute('tabindex', '0');
    modelList.setAttribute('aria-live', 'polite');
  }

  function updateFocusStyles() {
    if (!modelListInner) return;
    // clear previous focused
    const rendered = Array.from(modelListInner.querySelectorAll('.mistral-list-item'));
    rendered.forEach(el => el.classList.remove('focused'));
    if (focusedIndex >= 0) {
      const el = modelListInner.querySelector('#mistral-item-' + focusedIndex);
      if (el) {
        el.classList.add('focused');
        el.setAttribute('aria-selected', 'true');
        // update combobox activedescendant
        if (modelFilter) modelFilter.setAttribute('aria-activedescendant', el.id);
      }
    } else {
      if (modelFilter) modelFilter.removeAttribute('aria-activedescendant');
    }
  }

  function updateVisible() {
    if (!modelList || !modelListInner) return;
    const containerHeight = modelList.clientHeight || 220;
    const scrollTop = modelList.scrollTop || 0;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(virtualFiltered.length - 1, start + visibleCount - 1);

    // Clear and render visible window (absolute positioned)
    modelListInner.innerHTML = '';
    modelListInner.style.height = (virtualFiltered.length * ITEM_HEIGHT) + 'px';

    for (let i = start; i <= end; i++) {
      const name = virtualFiltered[i];
      const el = document.createElement('div');
      el.className = 'mistral-list-item';
      el.setAttribute('role', 'option');
      el.setAttribute('data-index', i);
      el.setAttribute('data-value', name);
      el.id = 'mistral-item-' + i;
      el.tabIndex = -1;
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.right = '0';
      el.style.top = (i * ITEM_HEIGHT) + 'px';
      el.style.height = ITEM_HEIGHT + 'px';
      el.style.lineHeight = ITEM_HEIGHT + 'px';
      el.textContent = name;
      el.addEventListener('click', () => selectModel(name));
      el.addEventListener('mouseenter', () => setFocusedIndex(i));
      modelListInner.appendChild(el);
    }

    updateFocusStyles();
  }

  function ensureItemVisible(index) {
    if (!modelList) return;
    const top = index * ITEM_HEIGHT;
    const bottom = top + ITEM_HEIGHT;
    const viewTop = modelList.scrollTop;
    const viewBottom = viewTop + modelList.clientHeight;
    if (top < viewTop + ITEM_HEIGHT) {
      modelList.scrollTop = Math.max(0, top - ITEM_HEIGHT * 2);
    } else if (bottom > viewBottom - ITEM_HEIGHT) {
      modelList.scrollTop = Math.min(modelList.scrollHeight, bottom - modelList.clientHeight + ITEM_HEIGHT * 2);
    }
  }

  // Local mock models fallback for offline/dev when Mistral is unreachable or key is invalid
  function loadMockModels() {
    const mock = [
      'mistral-7b-instruct',
      'mistral-1-alpha',
      'mistral-instruct-v1',
      'mock-local-test-model-v1'
    ];
    populateModelSelect(mock);
    showStatus('Loaded local mock models (offline/dev fallback).');
  }

  function refreshModelList(filter) {
    // Virtualized rendering for large lists + ARIA
    if (!modelList) return;
    const q = (filter || '').toLowerCase().trim();
    // filtered list (indices map to filtered array)
    virtualFiltered = availableModels.filter(name => !q || name.toLowerCase().includes(q));

    if (!modelListInner) {
      modelList.innerHTML = '';
      modelListInner = document.createElement('div');
      modelListInner.style.position = 'relative';
      modelListInner.style.width = '100%';
      modelList.appendChild(modelListInner);
      modelList.addEventListener('scroll', () => { updateVisible(); });
    }

    if (virtualFiltered.length === 0) {
      modelListInner.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'mistral-list-empty';
      empty.textContent = '(no models match)';
      modelListInner.appendChild(empty);
      modelList.setAttribute('aria-expanded', 'false');
      focusedIndex = -1;
      return;
    }

    // Set total height so the scroll bar reflects full list
    modelListInner.style.height = (virtualFiltered.length * ITEM_HEIGHT) + 'px';
    modelList.setAttribute('aria-expanded', 'true');
    // render visible window
    updateVisible();
  }

  let focusedIndex = -1;
  function setFocusedIndex(i) {
    if (i == null || i < 0 || i >= virtualFiltered.length) {
      focusedIndex = -1;
      updateFocusStyles();
      return;
    }
    focusedIndex = i;
    // ensure it becomes visible then re-render visible window
    ensureItemVisible(i);
    updateVisible();
    const el = document.getElementById('mistral-item-' + i);
    if (el) el.focus();
  }

  function selectModel(name) {
    modelNameEl.textContent = name;
    localStorage.setItem('mistral_model', name);
    if (modelSelect) modelSelect.value = name;
    showStatus('Selected model: ' + name);
  }

  if (modelFilter) {
    modelFilter.addEventListener('input', (e) => {
      refreshModelOptions(e.target.value || '');
    });
    modelFilter.addEventListener('keydown', (ev) => {
      // Combobox keyboard handling
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (virtualFiltered.length) setFocusedIndex(0);
        modelList.focus();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (virtualFiltered.length) setFocusedIndex(Math.max(0, virtualFiltered.length - 1));
        modelList.focus();
      } else if (ev.key === 'Enter') {
        const opts = virtualFiltered || [];
        if (opts.length === 1) { selectModel(opts[0]); }
      } else if (ev.key === 'Escape') {
        if (modal) modal.classList.remove('open');
      }
    });
    modelFilter.addEventListener('focus', () => { if (modelFilter) modelFilter.setAttribute('aria-expanded', 'true'); });
  }

  if (modelList) {
    modelList.addEventListener('keydown', (ev) => {
      if (!virtualFiltered || !virtualFiltered.length) return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setFocusedIndex(Math.min(focusedIndex + 1, virtualFiltered.length - 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setFocusedIndex(Math.max(focusedIndex - 1, 0)); }
      else if (ev.key === 'PageDown') { ev.preventDefault(); setFocusedIndex(Math.min(focusedIndex + Math.floor((modelList.clientHeight || 220) / ITEM_HEIGHT), virtualFiltered.length - 1)); }
      else if (ev.key === 'PageUp') { ev.preventDefault(); setFocusedIndex(Math.max(focusedIndex - Math.floor((modelList.clientHeight || 220) / ITEM_HEIGHT), 0)); }
      else if (ev.key === 'Home') { ev.preventDefault(); setFocusedIndex(0); }
      else if (ev.key === 'End') { ev.preventDefault(); setFocusedIndex(virtualFiltered.length - 1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (focusedIndex >= 0) selectModel(virtualFiltered[focusedIndex]); }
      else if (ev.key === 'Escape') { modal.classList.remove('open'); }
    });
    // allow clicking the list to focus
    modelList.addEventListener('click', () => { modelList.focus(); });
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const val = modelSelect.value;
      if (val) {
        modelNameEl.textContent = val;
        localStorage.setItem('mistral_model', val);
        showStatus('Selected model: ' + val);
      }
    });
  }

  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      showStatus('Clearing caches...');
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
        }
        showStatus('Caches cleared');
      } catch (err) {
        console.error(err);
        showStatus('Cache clear failed: ' + err.message, true);
      }
    });
  }

  // Save selected model
  if (saveModelBtn) {
    saveModelBtn.addEventListener('click', () => {
      if (!modelSelect) return showStatus('No model selected.', true);
      const sel = modelSelect.value;
      if (!sel) return showStatus('Select a model before saving.', true);
      localStorage.setItem('mistral_model', sel);
      modelNameEl.textContent = sel;
      showStatus('Saved model: ' + sel);
    });
  }

  // close modal on Esc
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });

});
