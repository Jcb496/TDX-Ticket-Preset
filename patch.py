from pathlib import Path
p=Path(__file__).parent/'extension/content.js'
s=p.read_text()
s=s.replace("    const FORM_ID = '144';\n    const CLAY_ID = 'df54862a-c253-ef11-991b-c9204fe4007e';", "    let activeConfig = globalThis.TDX_DEFAULT_CONFIG;")
s=s.replace("return setValue('FormID', FORM_ID);","return setValue('FormID', activeConfig.formId);")
s=s.replace("        setValue('attribute3236', '1442'); // Alternate Contact = No\n        setValue('attribute2682', '719');  // Request Type = Other\n        setValue('attribute1279', CLAY_ID);\n        setValue('attribute1279_input', 'Clay Bishop');", "        for (const [id, value] of Object.entries(activeConfig.commonFields)) setValue(id, value);")
start=s.index('    toolbar.appendChild(\n        createButton(\'Okta\'')
end=s.index('    // ==========================================\n    // SAVE CURRENT TICKET BUTTON',start)
s=s[:start]+'''    const builtInSection = document.createElement('div');
    Object.assign(builtInSection.style, {display:'flex',flexDirection:'column',gap:'8px'});
    toolbar.appendChild(builtInSection);
    function renderBuiltIns() {
        builtInSection.replaceChildren();
        for (const preset of activeConfig.presets) {
            builtInSection.appendChild(createButton(preset.label, () =>
                runBuiltIn(preset.search, preset.service, preset.subject)));
        }
    }

'''+s[end:]
s=s.replace('        renderCustomButtons();\n        document.body.appendChild(toolbar);', '''        try {
            const result = await chrome.runtime.sendMessage({type:'TDX_GET_CONFIG'});
            if (result && result.config) activeConfig = result.config;
        } catch (err) { notify('Remote config unavailable: ' + err.message); }
        renderBuiltIns();
        renderCustomButtons();
        document.body.appendChild(toolbar);''')
p.write_text(s)
