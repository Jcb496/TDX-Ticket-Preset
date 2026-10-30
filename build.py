from pathlib import Path
import json, zipfile
p=Path(__file__).parent
ext=p/'extension'
manifest={'manifest_version':3,'name':'TDX Account & Access Presets','version':'3.0.0','description':'TDX ticket presets with centrally managed configuration and local custom presets.','permissions':['storage'],'optional_host_permissions':['https://*/*'],'background':{'service_worker':'background.js'},'options_page':'options.html','content_scripts':[{'matches':['https://tdx.vanderbilt.edu/TDNext/Apps/34/Tickets/Edit*'],'js':['default-config.js','content.js'],'run_at':'document_idle'}]}
(ext/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ('chrome','edge','safari-webextension'):
    out=p/'dist'/f'tdx-presets-{name}-3.0.0.zip';out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for f in ext.iterdir():
            if f.is_file(): z.write(f,f.name)
print('Built 3 distributable extension source archives')
