document.addEventListener('DOMContentLoaded', () => {
  const keyInput = document.getElementById('pageMistralKey');
  const testBtn = document.getElementById('pageTestKey');
  const saveBtn = document.getElementById('pageSaveKey');
  const autoBtn = document.getElementById('pageAutoDetect');
  const saveModelBtn = document.getElementById('pageSaveModel');
  const modelSelect = document.getElementById('pageModelSelect');
  const modelFilter = document.getElementById('pageModelFilter');
  const pageModelList = document.getElementById('pageModelList');
  const clearCacheBtn = document.getElementById('pageClearCache');
  const statusEl = document.getElementById('pageStatus');
  let availableModels = [];

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--error-red)' : 'var(--accent-green)';
  }

  function saveSettingsDetails(reason) {
    const details = {
      updatedAt: new Date().toISOString(),
      reason: reason || 'settings-updated',
      hasMistralKey: !!(keyInput.value.trim() || localStorage.getItem('mistral_api_key')),
      selectedModel: modelSelect.value || localStorage.getItem('mistral_model') || '',
      availableModelCount: availableModels.length
    };
    localStorage.setItem('qa_gen_settings_page_details', JSON.stringify(details));
  }

  // Load saved
  const savedKey = localStorage.getItem('mistral_api_key');
  const savedModel = localStorage.getItem('mistral_model');
  if (savedKey) keyInput.value = savedKey;

  if (savedModel) {
    // ensure UI shows selected
    const opt = document.createElement('option');
    opt.value = savedModel; opt.textContent = savedModel; opt.selected = true;
    modelSelect.appendChild(opt);
    saveSettingsDetails('loaded-saved-model');
  }

  async function testKeyAndFill() {
    const key = keyInput.value.trim() || localStorage.getItem('mistral_api_key') || '';
    if (!key) { showStatus('No key provided', true); return; }
    testBtn.disabled = true; testBtn.textContent = 'Testing...'; showStatus('Testing key...');
    try {
      const relays = ['http://127.0.0.1:11435/mistral_test', 'http://localhost:11435/mistral_test'];
      let res, text, data;
      for (const url of relays) {
        try {
          res = await fetch(url, { method: 'GET', headers: { 'x-mistral-key': key } });
          text = await res.text();
          if (!res.ok) continue;
          break;
        } catch (e) { continue; }
      }
      if (!res) { showStatus('Relay not reachable on 11435', true); return; }
      if (!res.ok) { try { data = JSON.parse(text); showStatus('Test failed: ' + (data.error || res.statusText), true); } catch (e) { showStatus('Test failed: ' + res.status, true); } return; }
      try { data = JSON.parse(text); } catch (e) { data = text; }
      showStatus('Key valid — fetched models (if any)');
      let models = [];
      if (Array.isArray(data)) models = data;
      else if (data && data.models && Array.isArray(data.models)) models = data.models;
      else if (data && typeof data === 'object') {
        // if object of keys, convert
        const keys = Object.keys(data);
        if (keys.length > 0) models = keys.map(k => ({ id: k }));
      }

      if (models.length > 0) {
        // populate select + custom list
        availableModels = models.map(m => ((m && (m.id || m.name || m.model)) || String(m || ''))).filter(Boolean);
        modelSelect.innerHTML = '';
        availableModels.forEach(name => {
          const o = document.createElement('option'); o.value = name; o.textContent = name; modelSelect.appendChild(o);
        });
        const saved = localStorage.getItem('mistral_model');
        if (saved && availableModels.includes(saved)) modelSelect.value = saved;
        // populate page model list
        refreshPageModelList('');
        // attach filter handler
        if (modelFilter && modelFilter.dataset.bound !== 'true') {
          modelFilter.dataset.bound = 'true';
          modelFilter.addEventListener('input', (e) => {
            const q = (e.target.value || '').toLowerCase().trim();
            // filter select
            modelSelect.innerHTML = '';
            availableModels.forEach(name => { if (q && !name.toLowerCase().includes(q)) return; const o = document.createElement('option'); o.value = name; o.textContent = name; modelSelect.appendChild(o); });
            // refresh custom list
            refreshPageModelList(q);
          });
        }
        saveSettingsDetails('models-loaded');
        showStatus('Loaded ' + models.length + ' models');
      } else {
        showStatus('No models found in response');
      }

    } catch (err) {
      console.error(err); showStatus('Network error: ' + err.message, true);
    } finally { testBtn.disabled = false; testBtn.textContent = 'Test Key'; }
  }

  saveBtn.addEventListener('click', () => {
    const v = keyInput.value.trim();
    if (v) { localStorage.setItem('mistral_api_key', v); showStatus('Key saved locally'); }
    else { localStorage.removeItem('mistral_api_key'); showStatus('Key removed'); }
    saveSettingsDetails(v ? 'key-saved' : 'key-removed');
  });

  testBtn.addEventListener('click', testKeyAndFill);
  autoBtn.addEventListener('click', testKeyAndFill);

  saveModelBtn.addEventListener('click', () => {
    const sel = modelSelect.value; if (!sel) return showStatus('Select a model first', true);
    localStorage.setItem('mistral_model', sel);
    saveSettingsDetails('model-saved');
    showStatus('Model saved: ' + sel);
  });

  // Clear cache button handler (if present)
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      showStatus('Clearing caches...');
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
        }
        saveSettingsDetails('cache-cleared');
        showStatus('Caches cleared — reloading');
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        console.error(err);
        showStatus('Cache clear failed: ' + err.message, true);
      }
    });
  }

  // Custom list rendering + keyboard navigation
  let pageFocusedIndex = -1;
  function refreshPageModelList(filter) {
    if (!pageModelList) return;
    pageModelList.innerHTML = '';
    const q = (filter || '').toLowerCase().trim();
    const items = availableModels.filter(name => !q || name.toLowerCase().includes(q));
    if (!items.length) { const empty = document.createElement('div'); empty.className = 'mistral-list-empty'; empty.textContent = '(no models)'; pageModelList.appendChild(empty); return; }
    items.forEach((name, idx) => {
      const el = document.createElement('div'); el.className = 'mistral-list-item'; el.tabIndex = -1; el.setAttribute('data-value', name); el.textContent = name;
      el.addEventListener('click', () => { modelSelect.value = name; localStorage.setItem('mistral_model', name); saveSettingsDetails('model-selected'); showStatus('Selected model: ' + name); });
      el.addEventListener('mouseenter', () => setPageFocusedIndex(idx));
      pageModelList.appendChild(el);
    });
    pageFocusedIndex = -1;
  }
  function setPageFocusedIndex(i) {
    const items = Array.from((pageModelList && pageModelList.querySelectorAll('.mistral-list-item')) || []);
    items.forEach(it => it.classList.remove('focused'));
    if (i >= 0 && i < items.length) { items[i].classList.add('focused'); items[i].focus(); pageFocusedIndex = i; } else pageFocusedIndex = -1;
  }
  if (pageModelList) {
    pageModelList.addEventListener('keydown', (ev) => {
      const items = Array.from(pageModelList.querySelectorAll('.mistral-list-item'));
      if (!items.length) return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setPageFocusedIndex(Math.min(pageFocusedIndex + 1, items.length - 1)); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setPageFocusedIndex(Math.max(pageFocusedIndex - 1, 0)); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (pageFocusedIndex >= 0) { const val = items[pageFocusedIndex].getAttribute('data-value'); modelSelect.value = val; localStorage.setItem('mistral_model', val); saveSettingsDetails('model-selected'); showStatus('Selected model: ' + val); } }
      else if (ev.key === 'Escape') { modelFilter && modelFilter.focus(); }
    });
  }

});
