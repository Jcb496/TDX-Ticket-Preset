'use strict';
const KEY='tdx-remote-url-v1', CACHE='tdx-remote-config-v1', CHECK='tdx-remote-last-check-v1';
const urlInput=document.getElementById('url'),status=document.getElementById('status');
const show=s=>{status.textContent=s};
chrome.storage.local.get(KEY).then(v=>{urlInput.value=v[KEY]||''});
document.getElementById('save').addEventListener('click',async()=>{
  try {
    const value=urlInput.value.trim();
    if(!value) throw Error('Enter a URL or use the bundled presets button.');
    const parsed=new URL(value);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password) throw Error('A public HTTPS URL is required.');
    const origin=parsed.origin+'/*';
    const granted=await chrome.permissions.request({origins:[origin]});
    if(!granted) throw Error('Permission denied. No changes saved.');
    await chrome.storage.local.set({[KEY]:value,[CHECK]:0});
    show('Saved. Checking the configuration...');
    const result=await chrome.runtime.sendMessage({type:'TDX_GET_CONFIG',force:true});
    show(result.status==='updated'?'Configuration loaded successfully. Refresh your TDX ticket page.':'Saved URL, but update failed: '+(result.error||result.status));
  } catch(err){show(err.message)}
});
document.getElementById('check').addEventListener('click',async()=>{
  const result=await chrome.runtime.sendMessage({type:'TDX_GET_CONFIG',force:true});
  show(result.status==='updated'?'Updated. Refresh your TDX ticket page.':(result.error||'Using bundled/cached configuration.'));
});
document.getElementById('clear').addEventListener('click',async()=>{
  await chrome.storage.local.remove([KEY,CACHE,CHECK]);urlInput.value='';show('Bundled presets enabled. Refresh the TDX page.');
});
