// ═══════════════════════════════════════════
// 클라우드 동기화 (Google Sheets) + 자동 갱신 엔진 + 시장 데이터
// ═══════════════════════════════════════════
import {S,getApiUrl,save,updateTodaySnapshot,updateIntradaySnap} from './state.js';
import {REFRESH_MS} from './constants.js';
import {render} from './render.js';
import {mergeCloudState} from './cloud-merge.js';
import {getGoogleIdToken,requestGoogleLogin} from './auth.js';

function getOwnerToken(){
  const idToken=getGoogleIdToken();
  if(!idToken){requestGoogleLogin();throw new Error("Google 로그인이 필요합니다");}
  return idToken;
}

function throwCloudAuthError(error,fallback){
  if(['unauthorized','forbidden','expired'].includes(error))requestGoogleLogin();
  throw new Error(error||fallback);
}

export function scheduleCloudSave(){
  if(S.autoSyncTimer)clearTimeout(S.autoSyncTimer);
  S.autoSyncTimer=setTimeout(saveToCloud,2000);
}

export async function saveToCloud(){
  const _url=getApiUrl();
  if(!_url){S.cloudStatus="error";S.syncMsg="❌ API URL 미설정 — ⚙️ 설정에서 입력해주세요";renderCloudBadge();return;}
  S.cloudStatus="saving";renderCloudBadge();
  try{
    const idToken=getOwnerToken();
    const payload={
      stocks:S.stocks,cash:S.cash,cashTxns:S.cashTxns,txns:S.txns,agentImports:S.agentImports,
      snapshots:S.snapshots,intradaySnaps:S.intradaySnaps,journal:S.journal,riskEvents:S.riskEvents,
            tags:S.tags,tagColors:S.tagColors,rate:S.rate, idToken,
      updatedAt:new Date().toISOString()
    };
    const res=await fetch(_url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    });
    if(!res.ok)throw new Error("저장 실패");
    const result=await res.json();
    if(!result.success)throwCloudAuthError(result.error,"저장 실패");
    S.cloudStatus="saved";
    S.lastCloudSync=new Date();
  }catch(e){
    S.cloudStatus="error";
    console.error("Cloud save error:",e);
  }
  renderCloudBadge();
}

export async function loadFromCloud(showAlert){
  const _url=getApiUrl();
  if(!_url){S.cloudStatus="error";S.syncMsg="❌ API URL 미설정 — ⚙️ 설정에서 입력해주세요";if(showAlert)render();else renderCloudBadge();return;}
  S.cloudStatus="saving";renderCloudBadge();
  try{
    const idToken=getOwnerToken();
    const res=await fetch(_url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({_action:'read',idToken,freshQuotes:false})
    });
    if(!res.ok)throw new Error("로드 실패");
    const data=await res.json();
    if(!data.success&&data.error)throwCloudAuthError(data.error,"로드 실패");

    let priceCount=0;
    if(data.rate&&data.rate>0)S.rate=data.rate;
    // appData 없을 때만 여기서 가격 적용 (있으면 아래 appData 블록에서 처리)
    if(!data.appData){
      (data.meritz||[]).forEach(item=>{
        const s=S.stocks.find(x=>x.name===item.name&&x.acct==='메리츠증권');
        if(s){if(item.cur>0){s.cur=item.cur;priceCount++;}if(item.ticker)s.ticker=item.ticker;}
      });
      (data.isa||[]).forEach(item=>{
        const s=S.stocks.find(x=>x.name===item.name&&x.acct==='ISA');
        if(s){if(item.cur>0){s.cur=item.cur;priceCount++;}if(item.ticker)s.ticker=item.ticker;}
      });
    }

    if(data.appData){
      const a=data.appData;
      const mergeResult=mergeCloudState(S,a);
      if(mergeResult.applied){
        Object.assign(S,mergeResult.state);
      }else if(a.stocks&&a.stocks.length&&!S.stocks.length){
        S.stocks=a.stocks.filter(s=>s&&s.name).map(s=>({...s,cur:s.cur||s.avg||0}));
      }
      // 현재가·티커 업데이트 (수량·평단가 건드리지 않음)
      (data.meritz||[]).forEach(item=>{
        const s=S.stocks.find(x=>x.name===item.name&&x.acct==='메리츠증권');
        if(s){if(item.cur>0){s.cur=item.cur;priceCount++;}if(item.ticker)s.ticker=item.ticker;}
      });
      (data.isa||[]).forEach(item=>{
        const s=S.stocks.find(x=>x.name===item.name&&x.acct==='ISA');
        if(s){if(item.cur>0){s.cur=item.cur;priceCount++;}if(item.ticker)s.ticker=item.ticker;}
      });
      updateTodaySnapshot();
      updateIntradaySnap();
      localStorage.setItem("pf_v3",JSON.stringify({
        stocks:S.stocks,cash:S.cash,cashTxns:S.cashTxns,txns:S.txns,agentImports:S.agentImports,
        snapshots:S.snapshots,intradaySnaps:S.intradaySnaps,journal:S.journal,riskEvents:S.riskEvents,
        tags:S.tags,tagColors:S.tagColors,rate:S.rate,updatedAt:S.updatedAt
      }));
    }

    if(Array.isArray(data.riskEvents))S.riskEvents=data.riskEvents;
    if(Array.isArray(data.appData?.riskEvents))S.riskEvents=data.appData.riskEvents;

    // Apply Yahoo Finance realtime prices (pre/post market override)
    if(data.yahooData){
      S.stocks.forEach(s=>{
        if(!s.ticker||/^\d/.test(s.ticker))return; // Skip KRX codes
        const yd=data.yahooData[s.ticker];
        if(!yd)return;
        if(yd.price>0){s.cur=yd.price;priceCount++;}
        s.extPrice=yd.extPrice||null;
        s.extPct=yd.extPct||null;
        s.extType=yd.extType||null;
        s.marketState=yd.marketState||null;
      });
    }

    // Sync cash from sheet (sheet is source of truth — overrides _appdata cash)
    if(data.sheetCash){
      let cashSynced=false;
      for(const acct in data.sheetCash){
        if(!S.cash[acct])S.cash[acct]={USD:0,KRW:0};
        for(const curr of['USD','KRW']){
          const v=data.sheetCash[acct][curr];
          if(v>0&&S.cash[acct][curr]!==v){S.cash[acct][curr]=v;cashSynced=true;}
        }
      }
      if(cashSynced)save();
    }

    S.cloudStatus="saved";
    S.lastCloudSync=new Date();
    S.syncMsg=`✅ ${priceCount}개 가격·현금 동기화 완료 (${new Date().toLocaleTimeString()})`;
    if(showAlert)render();
    else renderCloudBadge();
  }catch(e){
    S.cloudStatus="error";
    S.syncMsg=`❌ ${e.message}`;
    if(showAlert)render();
    else renderCloudBadge();
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
export function getMarketStatus(){
  const now=new Date();
  const day=now.getUTCDay();
  const mins=now.getUTCHours()*60+now.getUTCMinutes();
  // EDT (UTC-4): 9:30-16:00 ET = 13:30-20:00 UTC (summer)
  const usOpen=day>=1&&day<=5&&mins>=13*60+30&&mins<20*60;
  // KST (UTC+9): 9:00-15:30 = 0:00-6:30 UTC
  const krOpen=day>=1&&day<=5&&mins<6*60+30;
  if(usOpen)return{label:"🟢 미장 개장",color:"#10b981",bg:"rgba(16,185,129,.15)"};
  if(krOpen)return{label:"🔵 한국장 개장",color:"#60a5fa",bg:"rgba(59,130,246,.15)"};
  return{label:"⚫ 휴장",color:"#8b949e",bg:"rgba(148,163,184,.1)"};
}

// US market phase detection (EDT = UTC-4, summer schedule)
export function getMarketPhase(){
  const now=new Date();
  const day=now.getUTCDay();
  if(day===0||day===6)return'closed';
  const m=now.getUTCHours()*60+now.getUTCMinutes();
  if(m>=480&&m<810)return'pre';       // EDT 4AM-9:30AM = UTC 8:00-13:30
  if(m>=810&&m<1200)return'regular';  // EDT 9:30AM-4PM  = UTC 13:30-20:00
  if(m>=1200)return'post';            // EDT 4PM-8PM     = UTC 20:00-24:00
  return'dead';                       // EDT 8PM-4AM     = UTC 0:00-8:00
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

export async function loadMarketData(force=false){
  if(S.marketLoading)return;
  const now=Date.now();
  if(!force&&_mktFetchTime&&now-_mktFetchTime<5*60*1000)return;
  const _url=getApiUrl();
  if(!_url){
    // No API URL — show empty state without retrying
    S.marketData=[];
    if(S.tab==="market")render();
    return;
  }
  S.marketLoading=true;
  if(S.tab==="market")render();
  try{
    const res=await fetch(_url+"?mode=market");
    if(!res.ok)throw new Error("시장 데이터 로드 실패");
    const data=await res.json();
    S.marketData=data.market||[];
    _mktFetchTime=Date.now();
  }catch(e){
    console.error("Market data error:",e);
    _mktFetchTime=Date.now(); // Throttle retries on error (5 min cooldown)
  }
  S.marketLoading=false;
  if(S.tab==="market")render();
}
