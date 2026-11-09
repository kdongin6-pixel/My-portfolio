// ═══════════════════════════════════════════
// 클라우드 동기화 (Google Sheets) + 자동 갱신 엔진 + 시장 데이터
// ═══════════════════════════════════════════
import {S,getApiUrl,getApiSecret,save,updateTodaySnapshot,updateIntradaySnap} from './state.js';
import {getIdToken,clearIdToken} from './auth.js';
import {REFRESH_MS} from './constants.js';
import {render} from './render.js';
import {mergeCloudState,mergeJournalTags,serverOwnedSignature} from './cloud-merge.js';
import {applyQuoteResponse,quoteInfo} from './portfolio-read.js';

export function scheduleCloudSave(){
  if(S.autoSyncTimer)clearTimeout(S.autoSyncTimer);
  S.autoSyncTimer=setTimeout(saveToCloud,2000);
}

export async function saveToCloud(){
  const _url=getApiUrl();
  if(!_url){S.cloudStatus="error";S.syncMsg="❌ API URL 미설정 — ⚙️ 설정에서 입력해주세요";renderCloudBadge();return;}
  S.cloudStatus="saving";renderCloudBadge();
  try{
    const payload={
      stocks:S.stocks,cash:S.cash,cashTxns:S.cashTxns,txns:S.txns,agentImports:S.agentImports,
      snapshots:S.snapshots,intradaySnaps:S.intradaySnaps,journal:S.journal,journalDeletedIds:S.journalDeletedIds,
      tags:S.tags,tagColors:S.tagColors,rate:S.rate,
      ...(Object.prototype.hasOwnProperty.call(S,'kisIsaSettlement')?{kisIsaSettlement:S.kisIsaSettlement}:{}),
      updatedAt:new Date().toISOString()
    };
    const idToken=getIdToken();
    if(!idToken){S.syncMsg="🔐 Google 로그인 필요 — 설정에서 Google 로그인을 완료해주세요";throw new Error('google_login_required');}
    if(!Object.prototype.hasOwnProperty.call(S,'cloudRevision')){S.syncMsg="⚠️ 먼저 클라우드 원장을 불러와야 안전하게 저장할 수 있습니다";throw new Error('cloud_load_required');}
    const response=await fetch(_url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({_action:'browser_save',idToken,expectedRevision:S.cloudRevision,ownedSyncRevision:S.ownedSyncRevision,state:payload})
    });
    if(!response.ok || response.type==='opaque')throw new Error('unverified_save');
    let result;
    try{result=await response.json();}catch{throw new Error('non_json');}
    if(result.success!==true || typeof result.savedAt!=='string'){
      if(['unauthorized','forbidden','expired'].includes(result.error)){clearIdToken();S.syncMsg="🔐 Google 로그인이 만료되었거나 허용되지 않았습니다 — 다시 로그인해주세요";throw new Error('google_reauth_required');}
      if(result.error==='owned_stale'||result.error==='revision_conflict'||result.error==='stale_state'){
        const detail=describeSaveError(result.error);S.syncMsg=detail.message;
        if(detail.dropRevision)delete S.cloudRevision;
        if(result.error==='owned_stale')delete S.ownedSyncRevision;
        throw new Error(result.error);
      }
      const detail=describeSaveError(result.error);
      if(detail.dropRevision)delete S.cloudRevision;
      S.syncMsg=detail.message;
      throw new Error(result.error||'save_rejected');
    }
    S.cloudRevision=result.savedAt;
    S.ownedSyncRevision=result.savedAt; // what was just saved equals what the server now holds
    S.cloudStatus="saved";
    S.lastCloudSync=new Date();
    S.syncMsg="✅ 포트폴리오 원장 저장 완료";
  }catch(e){
    S.cloudStatus="error";
    if(!S.syncMsg||S.syncMsg.startsWith("✅"))S.syncMsg=describeSaveError(e?.message==='non_json'?'non_json':e?.message==='unverified_save'?'unverified_save':e?.message==='google_login_required'?'google_login_required':e?.message==='cloud_load_required'?'cloud_load_required':'network').message;
    console.error("Cloud save error:",e);
  }
  renderCloudBadge();
  if(S.syncMsg)render();
}

export function describeSaveError(code){
  const errors={
    unauthorized:["🔐 Google 인증에 실패했습니다 — 다시 로그인해주세요",false],forbidden:["⛔ 저장 권한이 없습니다 — 계정 권한을 확인해주세요",false],expired:["🔐 Google 로그인이 만료되었습니다 — 다시 로그인해주세요",false],
    revision_required:["⚠️ 안전한 저장을 위해 원장을 다시 불러와주세요",true],stale_state:["⚠️ 다른 기기에서 원장이 변경됐습니다 — 다시 불러와주세요",true],revision_conflict:["⚠️ 저장 기준이 충돌했습니다 — 원장을 다시 불러와주세요",true],owned_stale:["⚠️ 보유수량·현금이 서버와 달라 저장하지 않았습니다 — 다시 불러와주세요",true],
    invalid_request:["❌ 저장 요청 형식이 올바르지 않습니다 — 변경 내용을 확인해주세요",false],invalid_action:["❌ 지원하지 않는 저장 요청입니다",false],agent_state_conflict:["⚠️ 서버 원장과 충돌했습니다 — 다시 불러와 확인해주세요",true],timestamp_conflict:["⚠️ 저장 시각 충돌이 발생했습니다 — 다시 불러와주세요",true],reconciliation_pending:["⚠️ 서버 원장 정합성 확인이 필요합니다 — 다시 불러와주세요",true],reserved_state_field:["❌ 저장할 수 없는 보호 필드가 포함됐습니다",false],kis_state_conflict:["⚠️ 서버 보호 상태와 충돌했습니다 — 다시 불러와주세요",true],
    network:["❌ 네트워크 오류로 저장을 확인하지 못했습니다 — 연결 후 다시 시도해주세요",false],non_json:["❌ 서버 응답을 확인할 수 없어 저장되지 않았을 수 있습니다 — 다시 불러와 확인해주세요",true],unverified_save:["❌ 서버 저장 응답을 확인할 수 없습니다 — 다시 불러와 확인해주세요",true],google_login_required:["🔐 Google 로그인 필요 — 설정에서 Google 로그인을 완료해주세요",false],cloud_load_required:["⚠️ 먼저 클라우드 원장을 불러와야 안전하게 저장할 수 있습니다",true]
  };
  const [message,dropRevision]=errors[code]||["❌ 저장 실패 — 원장과 연결 상태를 확인한 뒤 다시 시도해주세요",false];
  return{message,dropRevision};
}

export async function loadFromCloud(showAlert){
  const _url=getApiUrl();
  if(!_url){S.cloudStatus="error";S.syncMsg="❌ API URL 미설정 — ⚙️ 설정에서 입력해주세요";if(showAlert)render();else renderCloudBadge();return;}
  const _secret=getApiSecret();
  if(!_secret){S.cloudStatus="error";S.syncMsg="❌ 공유 시크릿 미설정 — ⚙️ 설정에서 입력해주세요";if(showAlert)render();else renderCloudBadge();return;}
  S.readStatus="loading";S.cloudStatus="saving";render();
  let staleOverwritten=false;
  try{
    const res=await fetch(_url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({secret:_secret,mode:"portfolio",freshQuotes:!!showAlert})
    });
    if(!res.ok)throw new Error("로드 실패");
    const data=await res.json();
    if(data.success===false)throw new Error("원장 조회 실패");
    if(data.error)throw new Error(data.error==="unauthorized"?"인증 실패 — 공유 시크릿을 확인해주세요":"원장 조회 응답 오류");
        if(!data.appData&&!Array.isArray(data.meritz)&&!Array.isArray(data.isa))throw new Error("원장 응답 형식 미확인");
        S.rateAsOf=data.rateAsOf||null;
        let priceCount=0;
    if(data.rate&&data.rate>0)S.rate=data.rate;
    if(data.appData){
      const a=data.appData;
      const merged=mergeCloudState(S,a,{baseRevision:S.cloudRevision,remoteRevision:data.savedAt});
      if(merged.overwroteLocal){
        // Stale local holdings/cash are replaced by the server's. Keep the old values so nothing is lost for good.
        staleOverwritten=true;
        const previous=localStorage.getItem('pf_conflict_backup');
        const backup={at:new Date().toISOString(),stocks:S.stocks,cash:S.cash,kisIsaSettlement:S.kisIsaSettlement,droppedTxns:merged.droppedLocal?.txns||[],droppedCashTxns:merged.droppedLocal?.cashTxns||[],previous:previous?JSON.parse(previous):null};
        localStorage.setItem('pf_conflict_backup',JSON.stringify(backup));
      }
      if(merged.applied)Object.assign(S,merged.state);
      // The server's savedAt is the compare-and-swap revision. Keep it even when
      // local edits are newer so they can be safely submitted against that revision.
      if(typeof data.savedAt==='string'&&data.savedAt) S.cloudRevision=data.savedAt;
      else delete S.cloudRevision;
      // 캐시를 지운 새 기기는 updatedAt 비교와 무관하게 종목을 복구한다.
      if(a.stocks&&a.stocks.length&&!S.stocks.length){
        S.stocks=a.stocks.filter(s=>s&&s.name).map(s=>({...s,cur:s.cur??null}));
      }
      const notes=mergeJournalTags(S,a);
      S.journal=notes.journal;S.journalDeletedIds=notes.journalDeletedIds;S.tags=notes.tags;S.tagColors=notes.tagColors;
      // Proof for the server: holdings and cash are in sync with this revision only when they equal the server's.
      // Pending local edits on an unchanged server keep the proof from the last sync; stale values never get one.
      if(S.cloudRevision&&serverOwnedSignature(S)===serverOwnedSignature(a))S.ownedSyncRevision=S.cloudRevision;
      // rate는 여기서 appData의 옛 스냅샷 값으로 덮어쓰지 않는다 — 위에서 이미
      // 서버가 실시간으로 가져온 data.rate로 설정했고(52행), appData.rate는
      // 마지막 저장 시점의 낡은 값일 뿐이라 이걸로 덮어쓰면 환율이 항상
      // 구식으로 고정되는 버그가 생긴다.
    }
    // Quote-only refresh preserves ledger cash, quantities and costs.
    applyQuoteResponse(S,data,new Date().toISOString());
    S.readStatus="success";
    S.rateQuality=data.rateQuality||null;S.quoteProvider=data.quoteProvider||null;
    const holdings=S.stocks.filter(s=>Number(s.qty)>0);
    priceCount=holdings.filter(s=>quoteInfo(s).confirmed).length;
    updateTodaySnapshot();updateIntradaySnap();
    localStorage.setItem("pf_v3",JSON.stringify({stocks:S.stocks,cash:S.cash,cashTxns:S.cashTxns,txns:S.txns,agentImports:S.agentImports,snapshots:S.snapshots,intradaySnaps:S.intradaySnaps,journal:S.journal,journalDeletedIds:S.journalDeletedIds,tags:S.tags,tagColors:S.tagColors,rate:S.rate,kisIsaSettlement:S.kisIsaSettlement,updatedAt:S.updatedAt}));
    S.cloudStatus="saved";
    S.lastCloudSync=new Date();
    S.syncMsg=`${priceCount<holdings.length?"⚠️ 부분성공":"✅"} 시세 ${priceCount}/${holdings.length} 확인`;
    if(staleOverwritten)S.syncMsg+=" · ⚠️ 서버에서 바뀐 보유수량·현금을 서버 기준으로 적용했습니다 (이전 로컬 값은 이 브라우저에 백업됨)";
    render();
  }catch(e){
    applyQuoteResponse(S,{},new Date().toISOString());
    S.readStatus="error";S.cloudStatus="error";
    S.syncMsg="❌ 원장 조회 실패 — 연결/인증을 확인하세요. 이전 자료 유지";
    render();
  }
}

export function renderCloudBadge(){
  const el=document.getElementById("cloudBadge");
  if(!el)return;
  const icons={saving:"⏳",saved:"☁️",error:"⚠️","":"☁️"};
  const colors={saving:"#fbbf24",saved:"#10b981",error:"#f43f5e","":"#8b949e"};
  const labels={
    saving:"동기화 중",
    saved:S.lastCloudSync?`${Math.floor((Date.now()-S.lastCloudSync)/1000)}초 전`:"동기화됨",
    error:"동기화 실패",
    "":"준비 중"
  };
  el.style.color=colors[S.cloudStatus]||"#8b949e";
  el.textContent=`${icons[S.cloudStatus]||"☁️"} ${labels[S.cloudStatus]||"준비 중"}${arCountdown()}`;
}

setInterval(renderCloudBadge,5000);

export async function syncSheets(){
  await loadFromCloud(true);
  scheduleAutoRefresh(); // reset countdown after manual sync
}

// ═══════════════════════════════════════════
// 🌐 시장 상태 / 자동 갱신 엔진
// ═══════════════════════════════════════════
// 뉴욕 현지 시각(요일·분)을 직접 구한다 — 고정 UTC-4(EDT) 오프셋 대신
// Intl.DateTimeFormat이 서머타임(EST/EDT 전환)을 알아서 반영해준다.
const WEEKDAY_IDX={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
function nyNow(){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false
  }).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value;
  let hour=parseInt(get('hour'),10);
  if(hour===24)hour=0; // 일부 환경에서 자정을 "24"로 표기
  const minute=parseInt(get('minute'),10)||0;
  return{weekday:WEEKDAY_IDX[get('weekday')],mins:hour*60+minute};
}

export function getMarketStatus(){
  const {weekday,mins}=nyNow();
  const usOpen=weekday>=1&&weekday<=5&&mins>=9*60+30&&mins<16*60;
  // 한국은 서머타임이 없어 고정 UTC+9 계산 그대로 사용
  const now=new Date();
  const kDay=now.getUTCDay();
  const kMins=now.getUTCHours()*60+now.getUTCMinutes();
  const krOpen=kDay>=1&&kDay<=5&&kMins<6*60+30;
  if(usOpen)return{label:"🟢 미장 개장",color:"#10b981",bg:"rgba(16,185,129,.15)"};
  if(krOpen)return{label:"🔵 한국장 개장",color:"#60a5fa",bg:"rgba(59,130,246,.15)"};
  return{label:"⚫ 휴장",color:"#8b949e",bg:"rgba(148,163,184,.1)"};
}

// US market phase detection — 뉴욕 현지 시각 기준, 서머타임 자동 반영
export function getMarketPhase(){
  const {weekday,mins}=nyNow();
  if(weekday===0||weekday===6)return'closed';
  if(mins>=4*60&&mins<9*60+30)return'pre';      // 4:00AM-9:30AM ET
  if(mins>=9*60+30&&mins<16*60)return'regular'; // 9:30AM-4:00PM ET
  if(mins>=16*60&&mins<20*60)return'post';      // 4:00PM-8:00PM ET
  return'dead';                                 // 8:00PM-4:00AM ET
}

let _arTimer=null,_arNextAt=0;
export function scheduleAutoRefresh(){
  if(_arTimer)clearTimeout(_arTimer);
  if(!getApiUrl())return;
  const delay=REFRESH_MS[getMarketPhase()]||300000;
  _arNextAt=Date.now()+delay;
  _arTimer=setTimeout(async()=>{
    await loadFromCloud(false);
    if(S.tab==='market')loadMarketData(true);
    scheduleAutoRefresh();
  },delay);
}

export function arCountdown(){
  if(!_arNextAt||!getApiUrl())return'';
  const sec=Math.max(0,Math.round((_arNextAt-Date.now())/1000));
  const phase=getMarketPhase();
  if(phase==='dead'||phase==='closed')return` · 💤 ${Math.ceil(sec/60)}분후`;
  return` · ⟳ ${sec}s`;
}

// ═══════════════════════════════════════════
// 🌐 시장 데이터
// ═══════════════════════════════════════════
let _mktFetchTime=0;
export function getMktFetchTime(){return _mktFetchTime;}

// 종목(list) 탭 상단 "오늘 시황" 스트립도 이 데이터를 쓰므로, market 탭이
// 아니어도 리렌더한다.
const shouldRerenderForMarket=()=>S.tab==="market"||S.tab==="list";

export async function loadMarketData(force=false){
  if(S.marketLoading)return;
  const now=Date.now();
  if(!force&&_mktFetchTime&&now-_mktFetchTime<5*60*1000)return;
  const _url=getApiUrl();
  const _secret=getApiSecret();
  if(!_url||!_secret){
    // No API URL / secret — show empty state without retrying
    S.marketData=[];
    if(shouldRerenderForMarket())render();
    return;
  }
  S.marketLoading=true;
  if(shouldRerenderForMarket())render();
  try{
    const res=await fetch(_url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({secret:_secret,mode:"market"})
    });
    if(!res.ok)throw new Error("시장 데이터 로드 실패");
    const data=await res.json();
    if(data.error==="unauthorized")throw new Error("인증 실패 — 공유 시크릿을 확인해주세요");
    S.marketData=data.market||[];
    _mktFetchTime=Date.now();
  }catch(e){
    console.error("Market data error:",e);
    _mktFetchTime=Date.now(); // Throttle retries on error (5 min cooldown)
  }
  S.marketLoading=false;
  if(shouldRerenderForMarket())render();
}
