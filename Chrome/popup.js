(() => {
  'use strict';
  const KEY = 'tdx-presets-enabled';
  const toggle = document.getElementById('toggle');
  const status = document.getElementById('status');
  const subtitle = document.getElementById('subtitle');
  const symbol = document.getElementById('symbol');
  document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;
  function render(enabled) {
    toggle.setAttribute('aria-checked', String(enabled));
    status.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
    subtitle.textContent = enabled ? 'Your TDX preset toolbar is active.' : 'Your TDX preset toolbar is hidden.';
    symbol.textContent = enabled ? '✓' : 'Ⅱ';
  }
  chrome.storage.local.get(KEY).then(data => render(data[KEY] !== false));
  toggle.addEventListener('click', async () => {
    const enabled = toggle.getAttribute('aria-checked') !== 'true';
    await chrome.storage.local.set({ [KEY]: enabled });
    render(enabled);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) render(changes[KEY].newValue !== false);
  });
  document.getElementById('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
})();
