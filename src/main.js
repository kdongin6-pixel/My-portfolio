// ═══════════════════════════════════════════
// 부트스트랩
// ═══════════════════════════════════════════
import {S,load,getApiUrl} from './state.js';
import {render} from './render.js';
import {loadFromCloud,scheduleAutoRefresh} from './cloud.js';

load();
// Auto-open settings if API URL is not configured yet
if(!getApiUrl()){S.modal={type:"settings"};}
render();
// Auto-sync on page load (only if API URL is configured)
if(getApiUrl())setTimeout(()=>loadFromCloud(false),2000);
// Start auto-refresh engine after initial load settles
if(getApiUrl())setTimeout(scheduleAutoRefresh,3000);
