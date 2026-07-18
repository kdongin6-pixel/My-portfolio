// ═══════════════════════════════════════════
// 🌐 시장 탭 UI (스파크라인 / 게이지 / 카드)
// ═══════════════════════════════════════════
import {S} from './state.js';
import {fmtMktPrice} from './helpers.js';
import {getMarketStatus,getMktFetchTime} from './cloud.js';

function mkSparkSvg(weekly,daily,key,w,h,history){
  if(!w)w=68;if(!h)h=26;
  const up=(weekly||0)>=0;
  const col=up?'#10b981':'#f43f5e';
  const gid='sg'+Math.abs((key||'X').split('').reduce((a,c)=>(a*31+c.charCodeAt(0))|0,0)%9999);

  let pts;
  if(history&&history.length>=2){
    // 실제 7일 종가 기반 — GAS의 Yahoo chart API에서 온 진짜 데이터
    const lo=Math.min(...history),hi=Math.max(...history);
    const range=hi-lo||1;
    const n=history.length;
    pts=history.map((v,i)=>[
      Math.round(i*(w/(n-1))),
      Math.max(2,Math.min(h-2,Math.round(h-2-((v-lo)/range)*(h-4))))
    ]);
  }else{
    // 실데이터 없을 때만 방향·강도 기반 근사 곡선으로 폴백
    const mag=Math.min(Math.abs(weekly||0),5)/5;
    let seed=0;
    for(let i=0;i<(key||'X').length;i++)seed=(seed*31+(key.charCodeAt(i)||0))&0xffff;
    pts=[];
    for(let i=0;i<9;i++){
      seed=(seed*1664525+1013904223)&0xffff;
      const noise=((seed%100)/100-.5)*h*.42*(1-mag*.35);
      const baseY=h/2+(up?-1:1)*(i-4)*mag*h*.1;
      pts.push([Math.round(i*(w/8)),Math.max(2,Math.min(h-2,Math.round(baseY+noise)))]);
    }
  }

  const line=pts.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join('');
  const fill='M'+pts[0][0]+','+h+' '+pts.map(p=>'L'+p[0]+','+p[1]).join(' ')+' L'+pts[pts.length-1][0]+','+h+'Z';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${fill}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function vixToFG(vix){
  if(!vix||vix<=0)return{score:50,label:'중립',color:'#eab308'};
  const score=Math.max(0,Math.min(100,Math.round(110-vix*3)));
  const col=score>=75?'#10b981':score>=55?'#84cc16':score>=45?'#eab308':score>=25?'#f97316':'#ef4444';
  const label=score>=75?'극단적 탐욕':score>=55?'탐욕':score>=45?'중립':score>=25?'공포':'극단적 공포';
  return{score,label,color:col};
}

function mkGaugeSvg(score,label,color){
  const cx=60,cy=52,ro=38,ri=24;
  const a=s=>((s/100*180)-180)*Math.PI/180;
  const seg=(f,t,c)=>{
    const a1=a(f),a2=a(t);
    const x1o=cx+ro*Math.cos(a1),y1o=cy+ro*Math.sin(a1);
    const x2o=cx+ro*Math.cos(a2),y2o=cy+ro*Math.sin(a2);
    const x1i=cx+ri*Math.cos(a1),y1i=cy+ri*Math.sin(a1);
    const x2i=cx+ri*Math.cos(a2),y2i=cy+ri*Math.sin(a2);
    const lg=t-f>50?1:0;
    return `<path d="M${x1o.toFixed(1)},${y1o.toFixed(1)} A${ro},${ro} 0 ${lg},1 ${x2o.toFixed(1)},${y2o.toFixed(1)} L${x2i.toFixed(1)},${y2i.toFixed(1)} A${ri},${ri} 0 ${lg},0 ${x1i.toFixed(1)},${y1i.toFixed(1)}Z" fill="${c}" opacity=".9"/>`;
  };
  const na=a(score);const nlen=ri-5;
  const nx=cx+nlen*Math.cos(na),ny=cy+nlen*Math.sin(na);
  return `<div style="text-align:center">
    <svg width="120" height="62" viewBox="0 0 120 62">
      ${seg(0,25,'#ef4444')}${seg(25,45,'#f97316')}${seg(45,55,'#eab308')}${seg(55,75,'#84cc16')}${seg(75,100,'#10b981')}
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="#161b22"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="white"/>
    </svg>
    <div style="font-size:1.05em;font-weight:800;color:${color};margin-top:-6px">${score}</div>
    <div style="font-size:.68em;color:${color};font-weight:700">${label}</div>
  </div>`;
}

function mktChgBadge(val,vixInv,extraCls){
  if(val===null||val===undefined)return'';
  const cls=val===0?'mkt2-neu':(vixInv?(val>0?'mkt2-neg':'mkt2-pos'):(val>0?'mkt2-pos':'mkt2-neg'));
  return `<span class="mkt2-chg-badge ${cls}${extraCls?' '+extraCls:''}">${val>=0?'+':''}${val.toFixed(2)}%</span>`;
}

// ═══════════════════════════════════════════
// 📌 종목 탭 상단 "오늘 시황" 스트립 — 탭 전환 없이 그날 분위기 확인용
// ═══════════════════════════════════════════
export function mkTodayStrip(){
  const mdata=S.marketData||[];
  if(!mdata.length)return'';
  const bk={};mdata.forEach(m=>bk[m.key]=m);
  const items=[
    {key:'IXIC',  label:'나스닥',  fmt:'num'},
    {key:'SPX',   label:'S&P500', fmt:'num'},
    {key:'KOSPI', label:'코스피', fmt:'num'},
    {key:'VIX',   label:'VIX',   fmt:'dec', vixInv:true},
    {key:'DXY',   label:'달러인덱스',fmt:'usd'},
    {key:'USDKRW',label:'원/달러', fmt:'krw'},
  ];
  const cards=items.map(c=>{
    const m=bk[c.key];
    if(!m||!m.price)return'';
    const priceStr=fmtMktPrice(m.price,c.fmt)+(c.fmt==='krw'?'원':'');
    return `<div class="today-strip-item" data-goto-market="1">
      <span class="today-strip-lbl">${c.label}</span>
      <span class="today-strip-val">${priceStr}</span>
      ${mktChgBadge(m.daily,!!c.vixInv)}
    </div>`;
  }).join('');
  if(!cards)return'';
  return `<div class="today-strip" data-goto-market="1">${cards}</div>`;
}

// ═══════════════════════════════════════════
// 🌐 시장 탭
// ═══════════════════════════════════════════
export function mkMarket(){
  const d=document.createElement("div");
  const st=getMarketStatus();

  if(S.marketLoading){
    d.innerHTML=`<div class="mkt-wrap">
      <div class="mkt-header">
        <span style="font-size:.95em;font-weight:800;color:#e6edf3">🌐 시장 현황</span>
        <span class="mkt-badge" style="color:${st.color};background:${st.bg}">${st.label}</span>
      </div>
      <div class="empty">⏳ 시장 데이터 로드 중...</div>
    </div>`;
    return d;
  }

  const mdata=S.marketData||[];
  const bk={};mdata.forEach(m=>bk[m.key]=m);
  const gv=key=>{const m=bk[key];return m||null;};

  const _mktFetchTime=getMktFetchTime();
  const lastUpd=_mktFetchTime?new Date(_mktFetchTime).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'—';

  if(!mdata.length){
    d.innerHTML=`<div class="mkt2-wrap">
      <div class="mkt2-hdr">
        <span style="font-size:.95em;font-weight:800;color:#e6edf3">🌐 시장 현황</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="mkt-badge" style="color:${st.color};background:${st.bg}">${st.label}</span>
          <button class="mkt-refresh-btn" id="btnMktRefresh">🔄</button>
        </div>
      </div>
      <div class="empty">📭 데이터 없음<br><br><span style="font-size:.85em">🔄 버튼을 눌러 시장 데이터를 불러오세요<br>구글 시트 연결이 필요합니다</span></div>
    </div>`;
    return d;
  }

  // ── 주요 지수 카드 ──
  const idxKeys=[
    {key:'IXIC',label:'나스닥',fmt:'num'},
    {key:'SPX', label:'S&P500',fmt:'num'},
    {key:'DJI', label:'다우',  fmt:'num'},
    {key:'RUT', label:'러셀2000',fmt:'num'},
    {key:'KOSPI',label:'코스피',fmt:'num'},
  ];
  const idxCards=idxKeys.map(c=>{
    const m=gv(c.key);
    const price=m?m.price:0;
    const d_=m?m.daily:0, w_=m?m.weekly:0;
    const priceStr=price?fmtMktPrice(price,c.fmt):'—';
    const spark=mkSparkSvg(w_,d_,c.key,68,28,m?.history);
    return `<div class="mkt2-idx-card">
      <div class="mkt2-idx-name">${c.label}</div>
      <div class="mkt2-idx-bottom">
        <div>
          <div class="mkt2-idx-price">${priceStr}</div>
          <div style="display:flex;flex-direction:column;gap:2px">
            ${mktChgBadge(d_,false)}
            ${mktChgBadge(w_,false,'mkt2-w')}
          </div>
        </div>
        <div style="align-self:flex-end">${spark}</div>
      </div>
    </div>`;
  }).join('');

  // ── 시장 심리 (VIX + Fear/Greed) ──
  const vixM=gv('VIX');
  const vixPrice=vixM?vixM.price:0;
  const fg=vixToFG(vixPrice);
  const vixSpark=mkSparkSvg(vixM?vixM.weekly:0,vixM?vixM.daily:0,'VIX',60,24,vixM?.history);
  const sentHtml=`
    <div class="mkt2-vix-card">
      <div class="mkt2-vix-lbl">VIX 공포지수</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div class="mkt2-vix-price">${vixPrice?vixPrice.toFixed(2):'—'}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${mktChgBadge(vixM?vixM.daily:0,true)}
            ${mktChgBadge(vixM?vixM.weekly:0,true,'mkt2-w')}
          </div>
        </div>
        <div>${vixSpark}</div>
      </div>
    </div>
    <div class="mkt2-fg-card">${mkGaugeSvg(fg.score,fg.label,fg.color)}</div>`;

  // ── 금리 & 환율 ──
  const rateKeys=[
    {key:'USDKRW',label:'원/달러 환율',       fmt:'krw', showWeekly:true},
    {key:'T3M',   label:'미 3개월물 국채 금리',fmt:'pct', showWeekly:false},
    {key:'T2Y',   label:'미 2년물 국채 금리',  fmt:'pct', showWeekly:true},
    {key:'T5Y',   label:'미 5년물 국채 금리',  fmt:'pct', showWeekly:false},
    {key:'T10Y',  label:'미 10년물 국채 금리', fmt:'pct', showWeekly:false},
    {key:'DXY',   label:'달러 인덱스 (UUP)',   fmt:'usd', showWeekly:false},
  ];
  const rateRows=rateKeys.map(c=>{
    const m=gv(c.key);
    const price=m?m.price:0;
    const d_=m?m.daily:0, w_=m?m.weekly:0;
    const priceStr=price?fmtMktPrice(price,c.fmt)+(c.fmt==='krw'?'원':c.fmt==='pct'?'%':''):'— %';
    const spark=mkSparkSvg(w_,d_,c.key,54,22,m?.history);
    return `<div class="mkt2-rate-item">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1">
        <span class="mkt2-rate-label">${c.label}</span>
        <span class="mkt2-rate-price">${priceStr}</span>
      </div>
      <div class="mkt2-rate-right">
        ${mktChgBadge(d_,false)}
        ${c.showWeekly?mktChgBadge(w_,false,'mkt2-w'):''}
        <div class="mkt2-rate-spark">${spark}</div>
      </div>
    </div>`;
  }).join('');

  // ── 원자재 & 암호화폐 ──
  const commKeys=[
    {key:'GOLD',  label:'금',    fmt:'usd'},
    {key:'SILVER',label:'은',    fmt:'usd'},
    {key:'WTI',   label:'WTI',  fmt:'usd'},
    {key:'BRENT', label:'브렌트',fmt:'usd'},
    {key:'BTC',   label:'BTC',  fmt:'usd'},
  ];
  const commCards=commKeys.map(c=>{
    const m=gv(c.key);
    const price=m?m.price:0;
    const d_=m?m.daily:0;
    const priceStr=price?fmtMktPrice(price,c.fmt):'—';
    const spark=mkSparkSvg(m?m.weekly:0,d_,c.key,52,22,m?.history);
    return `<div class="mkt2-comm-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
        <div style="min-width:0;flex:1">
          <div class="mkt2-comm-lbl">${c.label}</div>
          <div class="mkt2-comm-price">${priceStr}</div>
          ${mktChgBadge(d_,false)}
        </div>
        <div style="flex-shrink:0;align-self:center">${spark}</div>
      </div>
    </div>`;
  }).join('');

  // ── 인기 ETF / 테마 / 섹터 (탭 토글) ──
  const etfList=[
    {key:'QQQ', label:'QQQ',  sub:'나스닥 100'},
    {key:'SPY', label:'SPY',  sub:'S&P500'},
    {key:'TLT', label:'TLT',  sub:'미 국채 20년+'},
    {key:'SOXX',label:'SOXX', sub:'반도체'},
    {key:'GLD', label:'GLD',  sub:'금 ETF'},
    {key:'TQQQ',label:'TQQQ', sub:'나스닥3X'},
  ];
  const themeList=[
    {key:'NVDA', label:'NVDA', sub:'AI 반도체'},
    {key:'TSLA', label:'TSLA', sub:'전기차'},
    {key:'AMZN', label:'AMZN', sub:'클라우드'},
    {key:'META', label:'META', sub:'AI/소셜'},
    {key:'GOOGL',label:'GOOGL',sub:'AI 검색'},
    {key:'MSFT', label:'MSFT', sub:'AI 플랫폼'},
  ];
  const sectorList=[
    {key:'XLK', label:'기술',  sub:'XLK'}, {key:'XLC', label:'통신',  sub:'XLC'},
    {key:'XLY', label:'임의소비',sub:'XLY'},{key:'XLP', label:'필수소비',sub:'XLP'},
    {key:'XLV', label:'헬스케어',sub:'XLV'},{key:'XLF', label:'금융',  sub:'XLF'},
    {key:'XLI', label:'산업재', sub:'XLI'},{key:'XLB', label:'소재',  sub:'XLB'},
    {key:'XLE', label:'에너지', sub:'XLE'},{key:'XLU', label:'유틸리티',sub:'XLU'},
    {key:'XLRE',label:'부동산', sub:'XLRE'},
  ];
  const etfTab=S.mktEtfTab||'etf';
  const activeEtfList=etfTab==='theme'?themeList:etfTab==='sector'?sectorList:etfList;
  const etfCards=activeEtfList.map(c=>{
    const m=gv(c.key);
    const price=m?m.price:0;
    const d_=m?m.daily:0;
    const spark=mkSparkSvg(m?m.weekly:0,d_,c.key,52,22,m?.history);
    return `<div class="mkt2-etf-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="min-width:0;flex:1">
          <div class="mkt2-etf-lbl">${c.label}</div>
          <div style="font-size:.65em;color:#6b7280;margin-bottom:2px">${c.sub||''}</div>
          <div class="mkt2-etf-price">${price?'$'+price.toFixed(2):'—'}</div>
          ${mktChgBadge(d_,false)}
        </div>
        <div style="flex-shrink:0;align-self:center">${spark}</div>
      </div>
    </div>`;
  }).join('');
  const mkEtfTabBtn=(id,val,txt)=>`<button class="mkt-tab-btn${etfTab===val?' active':''}" id="${id}" data-etftab="${val}" style="flex:1;padding:6px 0;font-size:.75em;font-weight:700;border:none;cursor:pointer;background:${etfTab===val?'rgba(99,102,241,.25)':'transparent'};color:${etfTab===val?'#818cf8':'#6b7280'}">${txt}</button>`;
  const etfTabBar=`
    <div style="display:flex;gap:0;background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:hidden;margin-bottom:8px">
      ${mkEtfTabBtn('btnMktEtf','etf','[ ETF ]')}
      ${mkEtfTabBtn('btnMktTheme','theme','테마별')}
      ${mkEtfTabBtn('btnMktSector','sector','섹터')}
    </div>`;

  // ── 이슈 종목 ──
  const issueKeys=['NVDA','AAPL','GOOGL','MSFT','AMZN','AVGO','TSLA','META',
                   'SNOW','SMCI','MU','PLTR','COST','XOM','CVX','INTC'];
  const issueCards=issueKeys.map(k=>{
    const m=gv(k);
    const price=m?m.price:0;
    const d_=m?m.daily:0;
    const spark=mkSparkSvg(m?m.weekly:0,d_,k,48,20,m?.history);
    return `<div class="mkt2-top-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
        <div style="min-width:0">
          <span class="mkt2-top-lbl">${k}</span>
          <div class="mkt2-top-price">${price?'$'+price.toFixed(2):'—'}</div>
          <div style="margin-top:2px">${mktChgBadge(d_,false)}</div>
        </div>
        <div style="flex-shrink:0;align-self:center">${spark}</div>
      </div>
    </div>`;
  }).join('');

  d.innerHTML=`<div class="mkt2-wrap">
    <div class="mkt2-hdr">
      <span style="font-size:.95em;font-weight:800;color:#e6edf3">🌐 시장 현황</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="mkt-badge" style="color:${st.color};background:${st.bg}">${st.label}</span>
        <button class="mkt-refresh-btn" id="btnMktRefresh" style="font-size:.78em;color:#8b949e">오후 ${lastUpd} 🔄</button>
      </div>
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">📊 주요 지수</div>
      <div class="mkt2-idx-grid">${idxCards}</div>
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">💡 시장 심리</div>
      <div class="mkt2-sent-grid">${sentHtml}</div>
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">💹 금리 & 환율</div>
      ${rateRows}
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">🏆 원자재 & 암호화폐</div>
      <div class="mkt2-comm-grid">${commCards}</div>
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">📈 ETF · 테마 · 섹터</div>
      ${etfTabBar}
      <div class="mkt2-etf-grid">${etfCards}</div>
    </div>

    <div class="mkt2-section">
      <div class="mkt2-stitle">🔥 이슈 종목</div>
      <div class="mkt2-top-grid">${issueCards}</div>
    </div>
  </div>`;
  return d;
}
