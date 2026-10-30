'use strict';
const CONFIG_KEY='tdx-remote-config-v1';
const URL_KEY='tdx-remote-url-v1';
const CHECK_KEY='tdx-remote-last-check-v1';
const DEFAULT_CONFIG_URL =
  'https://jcb496.github.io/TDX-Ticket-Preset/config/presets.json';
const INTERVAL=60*60*1000;
function validate(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.presets) || data.presets.length>40 || typeof data.formId!=='string' || !data.commonFields || typeof data.commonFields!=='object') throw Error('Invalid config schema');
  const allowed=['attribute3236','attribute2682','attribute1279','attribute1279_input'];
  for(const [k,v] of Object.entries(data.commonFields)) if(!allowed.includes(k)||typeof v!=='string'||v.length>200) throw Error('Invalid common field');
  const ids=new Set();
  for(const item of data.presets) {
    if(!item || !['id','label','search','service','subject'].every(k=>typeof item[k]==='string'&&item[k].length>0&&item[k].length<=300)) throw Error('Invalid preset');
    if(ids.has(item.id)) throw Error('Duplicate ID'); ids.add(item.id);
  }
  return {schemaVersion:1,revision:String(data.revision||'').slice(0,100),formId:data.formId,commonFields:Object.fromEntries(Object.entries(data.commonFields).filter(([k])=>allowed.includes(k))),presets:data.presets.map(({id,label,search,service,subject})=>({id,label,search,service,subject}))};
}
async function getConfig(force=false) {
  const state=await chrome.storage.local.get([CONFIG_KEY,URL_KEY,CHECK_KEY]);
  const url=state[URL_KEY] || DEFAULT_CONFIG_URL;
  if(!url) return {config:state[CONFIG_KEY]||null,status:'bundled'};
  if(!force && Date.now()-(state[CHECK_KEY]||0)<INTERVAL) return {config:state[CONFIG_KEY]||null,status:'cached'};
  try {
    const parsed=new URL(url);
    if(parsed.protocol!=='https:' || parsed.username || parsed.password) throw Error('HTTPS required');
    const origin=parsed.origin+'/*';
    if(!await chrome.permissions.contains({origins:[origin]})) throw Error('Host permission not granted');
    const response=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw Error('HTTP '+response.status);
    const raw=await response.text();
    if(raw.length>100000) throw Error('Config too large');
    const config=validate(JSON.parse(raw));
    await chrome.storage.local.set({[CONFIG_KEY]:config,[CHECK_KEY]:Date.now()});
    return {config,status:'updated'};
  } catch(err) {
    await chrome.storage.local.set({[CHECK_KEY]:Date.now()});
    return {config:state[CONFIG_KEY]||null,status:'fallback',error:String(err.message)};
  }
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='TDX_GET_CONFIG') return false;
  // Only answer messages from this extension's content script / options page.
  if(sender.id!==chrome.runtime.id) return false;
  getConfig(Boolean(message.force)).then(sendResponse).catch(e=>sendResponse({config:null,status:'error',error:String(e)}));
  return true;
});
