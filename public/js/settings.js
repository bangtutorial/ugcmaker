(function () {
  const $ = (sel) => document.querySelector(sel);

  function init() {
    loadSettings();
    setupToggleKey();
    setupModelRules();
    setupSave();
  }

  function loadSettings() {
    const s = window.__currentSettings;
    if (!s) return;

    if (s.api_key) $('#api-key-input').value = s.api_key;
    if (s.api_base_url) $('#api-url-input').value = s.api_base_url;
    if (s.default_resolution) $('#def-resolution').value = s.default_resolution;
    if (s.default_ratio) $('#def-ratio').value = s.default_ratio;
    if (s.default_model) $('#def-model').value = s.default_model;
    if (s.default_duration) $('#def-duration').value = s.default_duration;
  }

  function setupToggleKey() {
    const btn = $('#toggle-key');
    const input = $('#api-key-input');

    btn.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  }

  function setupModelRules() {
    const model = $('#def-model');
    const resolution = $('#def-resolution');
    if (!model || !resolution) return;

    const sync = () => {
      const fullHd = resolution.querySelector('option[value="1080p"]');
      if (!fullHd) return;

      if (model.value === 'seedance-2.0-fast') {
        fullHd.disabled = true;
        if (resolution.value === '1080p') {
          resolution.value = '720p';
          showToast('Fast model uses 720p or lower', 'success');
        }
      } else {
        fullHd.disabled = false;
      }
    };

    model.addEventListener('change', sync);
    sync();
  }

  function setupSave() {
    const btn = $('#save-btn');

    btn.addEventListener('click', async () => {
      const data = {
        api_key: $('#api-key-input').value.trim(),
        api_base_url: $('#api-url-input').value.trim(),
        default_resolution: $('#def-resolution').value,
        default_ratio: $('#def-ratio').value,
        default_model: $('#def-model').value,
        default_duration: $('#def-duration').value
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          showToast('Settings saved', 'success');
        } else {
          showToast('Failed to save', 'error');
        }
      } catch (err) {
        showToast('Connection error', 'error');
      }

      btn.disabled = false;
      btn.textContent = 'Save Settings';
    });
  }

  function showToast(message, type) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
