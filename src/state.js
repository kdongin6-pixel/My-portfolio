// ═══════════════════════════════════════════
// 상태 (현금 분리) + localStorage 저장/로드 + 스냅샷
// ═══════════════════════════════════════════
import {DEFAULT_TAGS,TC_DEFAULT} from './constants.js';
import {scheduleCloudSave} from './cloud.js';

// API URL is stored in localStorage only — never in source code
export function getApiUrl(){return localStorage.getItem('pf_api_url')||'';}
export function setApiUrl(url){localStorage.setItem('pf_api_url',url.trim());}

export let S={
  stocks:[],
  cash:{메리츠증권:{USD:0,KRW:0},ISA:{USD:0,KRW:0}},
  cashTxns:[],
  txns:[],
  snapshots:[],
  intradaySnaps:[],
  journal:[],
  tags:[...DEFAULT_TAGS],
  tagColors:{...TC_DEFAULT},
  rate:1510,
  tab:"list",acct:"전체",wMode:"stock",modal:null,syncMsg:"",showCash:false,showTrend:false,
  trendPeriod:"1M",
  jFilter:"전체",
  sortBy:"eval",sortDir:"desc",viewMode:"table",chartView:"donut",
  cloudStatus:"",
  lastCloudSync:null,
  autoSyncTimer:null,
  marketData:null, marketLoading:false, mktEtfTab:"etf"
};

export function load(){
  try{
    const d=JSON.parse(localStorage.getItem("pf_v3")||"null");
    if(d){
      S.stocks=(d.stocks||[]).filter(s=>s&&s.name).map(s=>({
        ...s,
        qty:Number(s.qty)||0,
        avg:Number(s.avg)||0,
        cur:Number(s.cur)||0
      }));
      S.cash=d.cash||{메리츠증권:{USD:0,KRW:0},ISA:{USD:0,KRW:0}};
      for(const acct in S.cash){
        if(!S.cash[acct])S.cash[acct]={USD:0,KRW:0};
        S.cash[acct].USD=Number(S.cash[acct].USD)||0;
        S.cash[acct].KRW=Number(S.cash[acct].KRW)||0;
      }
      S.cashTxns=d.cashTxns||[];
      S.txns=d.txns||[];
      S.updatedAt=d.updatedAt||null;
      S.snapshots=(d.snapshots||[]).filter(s=>s&&!isNaN(s.totalKRW));
      S.intradaySnaps=d.intradaySnaps||[];
      S.journal=d.journal||[];
      S.tags=d.tags||[...DEFAULT_TAGS];
      S.tagColors=d.tagColors||{...TC_DEFAULT};
      S.rate=Number(d.rate)||1510;
    }else{
      migrateFromV2();
    }
  }catch(e){
    console.error("load error",e);
    migrateFromV2();
  }
}

function migrateFromV2(){
  try{
    const v2=JSON.parse(localStorage.getItem("pf_v2")||"null");
    if(v2&&v2.stocks){
      v2.stocks.forEach(s=>{
        if(s.name.includes("현금")||s.name.includes("💵")){
          if(!S.cash[s.acct])S.cash[s.acct]={USD:0,KRW:0};
          S.cash[s.acct][s.curr]+=s.qty*s.avg;
        }else{
          S.stocks.push(s);
        }
      });
      S.txns=v2.txns||[];
      S.rate=v2.rate||1510;
      save();
      return;
    }
  }catch(e){}
  // Fresh install — start empty, data will load from cloud
  S.cash={메리츠증권:{USD:0,KRW:0},ISA:{USD:0,KRW:0}};
  save();
}

export function updateIntradaySnap(){
  if(!S.stocks||!S.stocks.length)return;
  const now=new Date();
  if(S.intradaySnaps.length>0){
    const last=new Date(S.intradaySnaps[S.intradaySnaps.length-1].dt);
    if(now-last<30*60*1000)return;
  }
  const stockKRW=S.stocks.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.cur*S.rate:s.qty*s.cur),0);
  const cashKRW=Object.values(S.cash).reduce((a,c)=>a+(c.USD||0)*S.rate+(c.KRW||0),0);
  const inv=S.stocks.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg),0);
  const pnl=stockKRW-inv;
  const pct=inv>0?pnl/inv*100:0;
  S.intradaySnaps.push({dt:now.toISOString(),totalKRW:Math.round(stockKRW+cashKRW),pct:Number(pct.toFixed(2))});
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-2);
  S.intradaySnaps=S.intradaySnaps.filter(s=>new Date(s.dt)>=cutoff);
}

export function save(){
  updateTodaySnapshot();
  updateIntradaySnap();
  S.updatedAt=new Date().toISOString();
  localStorage.setItem("pf_v3",JSON.stringify({
    stocks:S.stocks,cash:S.cash,cashTxns:S.cashTxns,txns:S.txns,
    snapshots:S.snapshots,intradaySnaps:S.intradaySnaps,journal:S.journal,
    tags:S.tags,tagColors:S.tagColors,rate:S.rate,
    updatedAt:S.updatedAt
  }));
  scheduleCloudSave();
}

// ═══════════════════════════════════════════
// 일간 스냅샷
// ═══════════════════════════════════════════
export function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function updateTodaySnapshot(){
  if(!S.stocks||!S.stocks.length)return;
  const today=todayKey();
  const stockKRW=S.stocks.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.cur*S.rate:s.qty*s.cur),0);
  const inv=S.stocks.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg),0);
  const cashKRW=Object.values(S.cash).reduce((a,c)=>a+(c.USD||0)*S.rate+(c.KRW||0),0);
  const pnl=stockKRW-inv;
  const pct=inv>0?pnl/inv*100:0;
  const byStock={};
  S.stocks.forEach(s=>{byStock[s.name]=Math.round(s.curr==="USD"?s.qty*s.cur*S.rate:s.qty*s.cur);});

  const snap={date:today,totalKRW:Math.round(stockKRW+cashKRW),stockKRW:Math.round(stockKRW),
    cashKRW:Math.round(cashKRW),pnl:Math.round(pnl),pct:Number(pct.toFixed(2)),rate:S.rate,byStock};
  const idx=S.snapshots.findIndex(x=>x.date===today);
  if(idx>=0)S.snapshots[idx]=snap;
  else S.snapshots.push(snap);
  S.snapshots.sort((a,b)=>a.date.localeCompare(b.date));

  const cutoff=new Date();cutoff.setFullYear(cutoff.getFullYear()-1);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  S.snapshots=S.snapshots.filter(x=>x.date>=cutoffStr);
}
