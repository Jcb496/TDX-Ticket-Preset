(() => {
  'use strict';
  const ENABLED = 'tdx-presets-enabled';
  const PRESETS = 'tdx-account-access-custom-presets-v2';
  const list = document.getElementById('presets');
  const presetStatus = document.getElementById('preset-status');
  const toggle = document.getElementById('toggle');
  let presets = [];
  let editing = -1;
  const subjectOf = p => String(p.fields?.attribute37 ?? '');
  function renderEnabled(value) {
    toggle.setAttribute('aria-checked', String(value));
    document.getElementById('enabled-status').textContent = value ? '✓ Extension is enabled' : 'Extension is disabled';
  }
  async function load() {
    const data = await chrome.storage.local.get([ENABLED, PRESETS]);
    renderEnabled(data[ENABLED] !== false);
    presets = Array.isArray(data[PRESETS]) ? data[PRESETS] : [];
    renderPresets();
  }
  toggle.addEventListener('click', async () => {
    const next = toggle.getAttribute('aria-checked') !== 'true';
    try { await chrome.storage.local.set({ [ENABLED]: next }); renderEnabled(next); }
    catch (e) { presetStatus.textContent = 'Could not change extension status: ' + e.message; }
  });
  function button(text, className, handler) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn ' + className; b.textContent = text;
    b.addEventListener('click', handler);
    return b;
  }
  function renderPresets() {
    list.replaceChildren();
    if (!presets.length) { const p = document.createElement('div'); p.className = 'empty'; p.textContent = 'No custom presets saved.'; list.append(p); return; }
    presets.forEach((preset, index) => {
      const card = document.createElement('div'); card.className = 'preset';
      const row = document.createElement('div'); row.className = 'row preset-row';
      const details = document.createElement('div');
      const name = document.createElement('div'); name.className = 'name'; name.textContent = preset.name;
      const subject = document.createElement('div'); subject.className = 'subject'; subject.textContent = subjectOf(preset);
      details.append(name, subject);
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(button('Edit', 'secondary', () => { editing = editing === index ? -1 : index; renderPresets(); }),
        button('Delete', 'danger', async () => {
          if (!confirm('Delete custom preset "' + preset.name + '"?')) return;
          const updated = presets.filter((_, i) => i !== index);
          try { await chrome.storage.local.set({ [PRESETS]: updated }); presets = updated; editing = -1; presetStatus.textContent = 'Preset deleted.'; renderPresets(); }
          catch (e) { presetStatus.textContent = 'Delete failed: ' + e.message; }
        }));
      row.append(details, actions); card.append(row);
      if (editing === index) {
        const editor = document.createElement('div'); editor.className = 'editor';
        const label1 = document.createElement('label'); label1.textContent = 'Preset Name';
        const nameInput = document.createElement('input'); nameInput.value = preset.name; nameInput.maxLength = 80; label1.append(nameInput);
        const label2 = document.createElement('label'); label2.textContent = 'Subject';
        const subjectInput = document.createElement('input'); subjectInput.value = subjectOf(preset); label2.append(subjectInput);
        const controls = document.createElement('div'); controls.className = 'actions';
        controls.append(button('Cancel', 'secondary', () => { editing = -1; renderPresets(); }), button('Save Changes', '', async () => {
          const newName = nameInput.value.trim();
          if (!newName || newName.length > 80) { presetStatus.textContent = 'Preset name must be 1–80 characters.'; return; }
          if (presets.some((p, i) => i !== index && p.name.toLowerCase() === newName.toLowerCase())) { presetStatus.textContent = 'A preset with that name already exists.'; return; }
          const updated = presets.map((p, i) => i === index ? { ...p, name: newName, fields: { ...p.fields, attribute37: subjectInput.value } } : p);
          try { await chrome.storage.local.set({ [PRESETS]: updated }); presets = updated; editing = -1; presetStatus.textContent = 'Preset saved.'; renderPresets(); }
          catch (e) { presetStatus.textContent = 'Save failed: ' + e.message; }
        }));
        editor.append(label1, label2, controls); card.append(editor);
      }
      list.append(card);
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[ENABLED]) renderEnabled(changes[ENABLED].newValue !== false);
    if (changes[PRESETS]) { presets = Array.isArray(changes[PRESETS].newValue) ? changes[PRESETS].newValue : []; editing = -1; renderPresets(); }
  });
  document.getElementById('check').addEventListener('click', async () => {
    const status = document.getElementById('update-status');
    const btn = document.getElementById('check'); btn.disabled = true; status.textContent = 'Checking for updates...';
    try {
      const response = await Promise.race([
        chrome.runtime.sendMessage({ type: 'TDX_GET_CONFIG', force: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for the background script.')), 15000))
      ]);
      if (response?.status === 'updated') status.textContent = 'Presets updated. Refresh your TDX ticket to see the changes.';
      else if (response?.status === 'bundled') status.textContent = 'Using built-in presets. No central configuration URL is set.';
      else if (response?.status === 'fallback') status.textContent = 'Update unavailable; saved presets are still available. ' + (response.error || '');
      else status.textContent = response?.error || 'No new configuration was loaded.';
    } catch (e) { status.textContent = 'Update check failed: ' + e.message; }
    finally { btn.disabled = false; }
  });
  load().catch(e => { presetStatus.textContent = 'Could not load settings: ' + e.message; });
})();
