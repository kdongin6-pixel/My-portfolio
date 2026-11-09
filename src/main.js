// ═══════════════════════════════════════════
// 부트스트랩
// ═══════════════════════════════════════════
import {S,load,getApiUrl,getApiSecret} from './state.js';
import {render} from './render.js';
import {loadFromCloud,scheduleAutoRefresh,loadMarketData} from './cloud.js';
import {shouldSkipBackgroundRefresh} from './background-refresh.js';

load();
// Auto-open settings if API URL/secret is not configured yet
if(!getApiUrl()||!getApiSecret()){S.modal={type:"settings"};}
render();
const _configured=getApiUrl()&&getApiSecret();
// Auto-sync on page load (only if API URL/secret configured)
if(_configured)setTimeout(()=>loadFromCloud(false),2000);
// Start auto-refresh engine after initial load settles
if(_configured)setTimeout(scheduleAutoRefresh,3000);
// 종목 탭 상단 "오늘 시황" 스트립용 — 시장 탭을 안 열어도 미리 로드
if(_configured)setTimeout(()=>loadMarketData(),2500);
let quoteRefreshInFlight=false;
const refreshVisibleQuotes=async()=>{
  const localEditPending=S.updatedAt&&(!S.lastCloudSync||Date.parse(S.updatedAt)>new Date(S.lastCloudSync).getTime());
  const tag=document.activeElement?.tagName?.toUpperCase();
  const typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';
  const modalOpen=!!S.modal||!!document.querySelector('.modal-bg');
  if(shouldSkipBackgroundRefresh({visible:document.visibilityState==='visible',inFlight:quoteRefreshInFlight,saving:S.cloudStatus==='saving',localEditPending:!!localEditPending,typing,modalOpen}))return;
  quoteRefreshInFlight=true;
  try{await loadFromCloud(false,{fresh:true});}finally{quoteRefreshInFlight=false;}
};
if(_configured){
  setInterval(refreshVisibleQuotes,60000);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&(!S.lastCloudSync||Date.now()-new Date(S.lastCloudSync).getTime()>60000))refreshVisibleQuotes();
  });
}
