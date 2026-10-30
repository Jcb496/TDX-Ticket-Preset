(function () {
    'use strict';

    const STORAGE_KEY = 'tdx-account-access-custom-presets-v2';
    const POSITION_KEY = 'tdx-account-access-toolbar-position-v2';
    let activeConfig = globalThis.TDX_DEFAULT_CONFIG;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let cachedPresets = [];
    let cachedPosition = null;
    const byId = id => document.getElementById(id);

    function notify(message) {
        console.log('[TDX Presets]', message);
    }

    function change(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

    }

    function setValue(id, value) {
        const el = byId(id);

        if (!el) {
            notify('Field not found: ' + id);
            return false;
        }

        el.value = value;
        change(el);
        return true;
    }

    function setAccountAccessForm() {
        return setValue('FormID', activeConfig.formId);
    }

    function setSubject(text) {
        setValue('attribute37', text);
    }

    function setCommonFields() {
        for (const [id, value] of Object.entries(activeConfig.commonFields)) setValue(id, value);
    }

    // ==========================================
    // SERVICE SELECTION
    // ==========================================

    async function setService(searchText, serviceText) {
        const input = byId('attribute789_input');

        if (!input) {
            notify('Service field not found');
            return;
        }

        input.focus();
        input.value = searchText;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        for (let attempt = 0; attempt < 12; attempt++) {
            await delay(250);

            const items = document.querySelectorAll(
                '#attribute789_listbox .k-list-item, ' +
                '#attribute789_listbox [role="option"]'
            );

            const match = Array.from(items).find(item =>
                item.textContent.trim().includes(serviceText)
            );

            if (match) {
                match.dispatchEvent(new MouseEvent('mousedown', {
                    bubbles: true
                }));

                match.dispatchEvent(new MouseEvent('mouseup', {
                    bubbles: true
                }));

                match.click();
                return;
            }
        }

        notify('Service option not found: ' + serviceText);
    }

    // ==========================================
    // BUILT-IN PRESETS
    // ==========================================

    async function runBuiltIn(search, service, subject) {
        setAccountAccessForm();

        await delay(1500);

        setSubject(subject);
        setCommonFields();
        await setService(search, service);
    }

    // ==========================================
    // CAPTURE CURRENT TICKET
    // ==========================================

    // Capture only known, reusable ticket fields.
    // Do not capture ticket IDs, requestor identities,
    // free-text descriptions, or unrelated controls.

    const CAPTURE_IDS = [
        'FormID',
        'attribute37',
        'attribute3236',
        'attribute2682',
        'attribute1279',
        'attribute1279_input',
        'attribute789',
        'attribute789_input'
    ];

    function captureCurrentTicket() {
        const fields = {};

        for (const id of CAPTURE_IDS) {
            const el = byId(id);

            if (!el || el.disabled) continue;
            if (el.type === 'password' || el.type === 'file') continue;

            fields[id] = el.value;
        }

        const serviceInput = byId('attribute789_input');
        const serviceText = serviceInput?.value?.trim() || '';

        return {
            fields,
            serviceText
        };
    }

    // ==========================================
    // LOCAL STORAGE
    // ==========================================

    function readPresets() {
        return cachedPresets.slice();
    }

    function writePresets(presets) {
        cachedPresets = presets;
        chrome.storage.local.set({ [STORAGE_KEY]: presets }).catch(err => {
            notify('Could not save presets: ' + err.message);
            alert('Could not save presets in extension storage.');
        });
        return true;
    }

    // ==========================================
    // APPLY CUSTOM PRESET
    // ==========================================

    async function applyCustomPreset(preset) {
        const fields = preset.fields;

        if (fields.FormID !== undefined) {
            setValue('FormID', fields.FormID);
            await delay(1500);
        }

        // Set dropdowns before text fields.
        for (const id of [
            'attribute3236',
            'attribute2682',
            'attribute1279'
        ]) {
            if (fields[id] !== undefined) {
                setValue(id, fields[id]);
            }
        }

        if (fields.attribute1279_input !== undefined) {
            setValue(
                'attribute1279_input',
                fields.attribute1279_input
            );
        }

        if (fields.attribute37 !== undefined) {
            setSubject(fields.attribute37);
        }

        if (preset.serviceText) {
            await setService(
                preset.serviceText,
                preset.serviceText
            );

        } else if (fields.attribute789 !== undefined) {
            setValue('attribute789', fields.attribute789);
        }

        notify('Applied custom preset: ' + preset.name);
    }

    // ==========================================
    // BUTTON CREATOR
    // ==========================================

    function createButton(text, handler) {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = text;

        Object.assign(button.style, {
            padding: '8px 12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '140px',
            border: '1px solid #bbb',
            borderRadius: '5px',
            background: '#f7f7f7',
            color: '#222'
        });

        button.addEventListener('mousedown', e => {
            e.stopPropagation();
        });

        button.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            handler();
        });

        return button;
    }

    // ==========================================
    // SAVE CURRENT TICKET AS PRESET
    // ==========================================

    function saveCurrentTicket(existingName = null) {
        const initial = existingName || '';

        const entered = prompt(
            existingName
                ? 'Update preset name:'
                : 'Name this custom preset:',
            initial
        );

        if (entered === null) return;

        const name = entered.trim();

        if (!name || name.length > 80) {
            alert('Enter a preset name (1-80 characters).');
            return;
        }

        const captured = captureCurrentTicket();

        if (!Object.keys(captured.fields).length) {
            alert('No supported ticket fields were found.');
            return;
        }

        const presets = readPresets();

        const index = presets.findIndex(p =>
            p.name.toLowerCase() === name.toLowerCase()
        );

        if (
            index >= 0 &&
            !confirm(
                'Replace the existing preset "' +
                presets[index].name +
                '" with the current ticket fields?'
            )
        ) {
            return;
        }

        const record = {
            name,
            ...captured
        };

        if (index >= 0) {
            presets[index] = record;
        } else {
            presets.push(record);
        }

        if (writePresets(presets)) {
            renderCustomButtons();
            alert('Saved preset: ' + name);
        }
    }

    // ==========================================
    // FLOATING TOOLBAR
    // ==========================================

    const toolbar = document.createElement('div');

    toolbar.id = 'tdx-account-access-presets-toolbar';

    Object.assign(toolbar.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '999999',
        background: '#fff',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '190px',
        maxHeight: '85vh',
        overflowY: 'auto',
        color: '#222'
    });

    const heading = document.createElement('div');

    heading.textContent = 'TDX Presets  ·  Drag here';

    Object.assign(heading.style, {
        fontWeight: 'bold',
        cursor: 'move',
        padding: '4px',
        userSelect: 'none'
    });

    toolbar.appendChild(heading);

    // ==========================================
    // ORIGINAL PRESET BUTTONS
    // ==========================================

    const builtInSection = document.createElement('div');
    Object.assign(builtInSection.style, {display:'flex',flexDirection:'column',gap:'8px'});
    toolbar.appendChild(builtInSection);
    function renderBuiltIns() {
        builtInSection.replaceChildren();
        for (const preset of activeConfig.presets) {
            builtInSection.appendChild(createButton(preset.label, () =>
                runBuiltIn(preset.search, preset.service, preset.subject)));
        }
    }

    // ==========================================
    // SAVE CURRENT TICKET BUTTON
    // ==========================================

    toolbar.appendChild(
        createButton(
            '+ Save Current Ticket',
            () => saveCurrentTicket()
        )
    );

    // ==========================================
    // CUSTOM PRESETS SECTION
    // ==========================================

    const customSection = document.createElement('div');

    Object.assign(customSection.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        borderTop: '1px solid #ddd',
        paddingTop: '8px'
    });

    toolbar.appendChild(customSection);

    function renderCustomButtons() {
        customSection.replaceChildren();

        const title = document.createElement('strong');
        title.textContent = 'Custom Presets';

        customSection.appendChild(title);

        for (const preset of readPresets()) {
            const row = document.createElement('div');

            Object.assign(row.style, {
                display: 'flex',
                gap: '4px',
                alignItems: 'stretch'
            });

            // Apply saved preset
            const apply = createButton(
                preset.name,
                () => applyCustomPreset(preset)
            );

            apply.style.minWidth = '0';
            apply.style.flex = '1';
            apply.style.overflowWrap = 'anywhere';

            // Update saved preset
            const update = createButton(
                '↻',
                () => saveCurrentTicket(preset.name)
            );

            update.title =
                'Replace this preset with the current ticket fields';

            update.style.minWidth = '28px';
            update.style.padding = '5px';

            // Delete saved preset
            const remove = createButton('×', () => {
                if (
                    !confirm(
                        'Delete custom preset "' +
                        preset.name +
                        '"?'
                    )
                ) {
                    return;
                }

                const remaining = readPresets().filter(
                    p => p.name !== preset.name
                );

                if (writePresets(remaining)) {
                    renderCustomButtons();
                }
            });

            remove.title = 'Delete preset';
            remove.style.minWidth = '28px';
            remove.style.padding = '5px';

            row.append(apply, update, remove);
            customSection.appendChild(row);
        }
    }

    // ==========================================
    // DRAGGABLE TOOLBAR
    // ==========================================

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    heading.addEventListener('mousedown', e => {
        if (e.button !== 0) return;

        const rect = toolbar.getBoundingClientRect();

        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        dragging = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;

        toolbar.style.left = Math.max(
            0,
            Math.min(innerWidth - 40, e.clientX - offsetX)
        ) + 'px';

        toolbar.style.top = Math.max(
            0,
            Math.min(innerHeight - 40, e.clientY - offsetY)
        ) + 'px';

        toolbar.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;

        dragging = false;

        chrome.storage.local.set({ [POSITION_KEY]: {
            left: toolbar.style.left, top: toolbar.style.top
        } }).catch(err => notify('Could not save position: ' + err.message));
    });

    // ==========================================
    // INITIALIZE
    // ==========================================

    async function start() {
        if (byId(toolbar.id)) return;

        try {
            const stored = await chrome.storage.local.get([STORAGE_KEY, POSITION_KEY]);
            let presets = stored[STORAGE_KEY];
            let pos = stored[POSITION_KEY];

            // One-time migration from the original Tampermonkey page storage.
            if (!Array.isArray(presets)) {
                try { presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
                catch (_) { presets = []; }
                if (!Array.isArray(presets)) presets = [];
                await chrome.storage.local.set({ [STORAGE_KEY]: presets });
            }
            if (!pos) {
                try { pos = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null'); }
                catch (_) { pos = null; }
                if (pos) await chrome.storage.local.set({ [POSITION_KEY]: pos });
            }
            cachedPresets = presets.filter(p => p && typeof p.name === 'string' && p.fields && typeof p.fields === 'object');
            if (pos && /^\d+px$/.test(pos.left) && /^\d+px$/.test(pos.top)) {
                toolbar.style.left = pos.left;
                toolbar.style.top = pos.top;
                toolbar.style.right = 'auto';
            }
        } catch (err) {
            notify('Storage initialization failed: ' + err.message);
        }

        try {
            const result = await chrome.runtime.sendMessage({type:'TDX_GET_CONFIG'});
            if (result && result.config) activeConfig = result.config;
        } catch (err) { notify('Remote config unavailable: ' + err.message); }
        renderBuiltIns();
        renderCustomButtons();
        document.body.appendChild(toolbar);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

})();
