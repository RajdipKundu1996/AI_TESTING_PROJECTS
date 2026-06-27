/* Seeds non-secret provider defaults into localStorage.
   API credentials must be supplied through the settings UI or the server-side .env file. */
(function () {
  var KEY_DEFAULTS = {
    mistral: {
      active:  true,
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey:  '',
      version: 'mistral-large-latest'
    },
    huggingface: {
      active:  true,
      baseUrl: 'https://router.huggingface.co',
      apiKey:  '',
      version: 'meta-llama/Llama-3.3-70B-Instruct'
    },
    sarvam: {
      active:  true,
      baseUrl: 'https://api.sarvam.ai',
      apiKey:  '',
      version: 'sarvam-30b'
    }
  };

  function seedKeys() {
    try {
      var stored = localStorage.getItem('qa_gen_models');
      var models = stored ? JSON.parse(stored) : null;
      if (!models) return;

      var changed = false;

      Object.keys(KEY_DEFAULTS).forEach(function (k) {
        var def = KEY_DEFAULTS[k];
        // Sarvam key is always force-written so a new key takes effect immediately.
        // Mistral/HuggingFace are only seeded when missing.
        var forceWrite = (k === 'sarvam');

        // Write to nested format (AppState.models reads from here)
        if (models.data && models.data[k]) {
          if (!models.data[k].apiKey || forceWrite) {
            models.data[k].apiKey = def.apiKey;
            changed = true;
          }
        }

        // Write to flat format (picked up by AppState.models migration on next load)
        if (!models[k] || !models[k].apiKey || forceWrite) {
          models[k] = { active: def.active, baseUrl: def.baseUrl, apiKey: def.apiKey, version: def.version };
          changed = true;
        }
      });

      if (changed) localStorage.setItem('qa_gen_models', JSON.stringify(models));
    } catch (e) { /* silent */ }
  }

  // Run immediately
  seedKeys();

  // Run again after DOM is ready to catch nested structure initialized by AppState.models
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(seedKeys, 100); });
  } else {
    setTimeout(seedKeys, 100);
  }
})();
