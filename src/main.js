// ═══════════════════════════════════════════
// 부트스트랩
// ═══════════════════════════════════════════
import {S,load,getApiUrl} from './state.js';
import {render} from './render.js';
import {loadFromCloud,scheduleAutoRefresh} from './cloud.js';
import {createAuthSession,initializeGoogleIdentity} from './auth.js';

const auth=createAuthSession();
function startGoogleIdentity(attempt=0){
  if(initializeGoogleIdentity({auth,onAuthenticated:()=>{
    document.getElementById('googleLogin')?.replaceChildren();
    S.syncMsg='✅ Google 로그인 완료';
    render();
    if(getApiUrl())loadFromCloud(false);
  }}))return;
  if(attempt<40)setTimeout(()=>startGoogleIdentity(attempt+1),250);
}
window.addEventListener('portfolio-auth-required',()=>startGoogleIdentity());

load();
// Auto-open settings if API URL is not configured yet
if(!getApiUrl()){S.modal={type:"settings"};}
render();
startGoogleIdentity();
// Auto-sync on page load (only if API URL is configured)
if(getApiUrl())setTimeout(()=>loadFromCloud(false),2000);
// Start auto-refresh engine after initial load settles
if(getApiUrl())setTimeout(scheduleAutoRefresh,3000);
