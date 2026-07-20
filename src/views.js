// ═══════════════════════════════════════════
// 화면 조립 (헤더 / 탭 / 목록 / 차트 / 추이 / 일지 / 내역 / 모달)
// ═══════════════════════════════════════════
import {S,getApiUrl} from './state.js';
import {APP_VERSION,JOURNAL_CATEGORIES} from './constants.js';
import {fK,fKShort,fP,fM,evK,totK,filt,filtCashKRW} from './helpers.js';
import {getMarketPhase} from './cloud.js';
import {getAnthropicKey,getShotFiles} from './vision.js';
import {mkTodayStrip} from './market-ui.js';

export function mkHdr(){
  const fl=filt(),tot=totK(fl)+filtCashKRW();
  const inv=fl.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg),0);
  const pnl=totK(fl)-inv;
  const pct=inv>0?pnl/inv*100:0;
  const d=document.createElement("div");d.className="hdr";
  d.innerHTML=`
    <div class="hdr-row1">
      <div class="hdr-title">📊 포트폴리오 <span id="cloudBadge" style="font-size:.6em;color:#8b949e;margin-left:8px;font-weight:600">☁️</span><span style="font-size:.5em;color:#4b5563;margin-left:6px;font-weight:500;letter-spacing:.3px">${APP_VERSION}</span></div>
      <button id="btnTrend" style="background:${S.tab==='trend'?'rgba(99,102,241,.25)':'rgba(99,102,241,.1)'};border:1px solid ${S.tab==='trend'?'#6366f1':'rgba(99,102,241,.3)'};color:${S.tab==='trend'?'#818cf8':'#6366f1'};border-radius:8px;padding:3px 9px;font-size:.72em;font-weight:700;cursor:pointer;white-space:nowrap">📈 추이</button>
      <button class="${getMarketPhase()==='regular'?'sync-btn live-btn':'sync-btn'}" id="btnSync">${getMarketPhase()==='regular'?'⚡ LIVE':'🔄 동기화'}</button>
    </div>
    ${S.syncMsg?`<div class="msg-sync" style="background:${S.syncMsg.startsWith('✅')?'rgba(16,185,129,.15)':S.syncMsg.startsWith('❌')?'rgba(244,63,94,.15)':'rgba(245,158,11,.15)'};color:${S.syncMsg.startsWith('✅')?'#10b981':S.syncMsg.startsWith('❌')?'#f43f5e':'#fbbf24'}">${S.syncMsg}</div>`:''}
    <div class="asset-cards">
      <div class="asset-card"><div class="ac-lbl">총 자산</div><div class="ac-val" style="font-size:.9em">₩${fK(tot)}</div></div>
      <div class="asset-card"><div class="ac-lbl">매매 손익</div><div class="ac-val ${pnl>=0?'pos':'neg'}">₩${fK(pnl)}</div></div>
      <div class="asset-card"><div class="ac-lbl">수익률</div><div class="ac-val ${pct>=0?'pos':'neg'}">${fP(pct)}</div></div>
    </div>
    <div class="btn-row">
      <button class="hdr-btn btn-add" id="btnAdd">+ 종목</button>
      <button class="hdr-btn btn-shot" id="btnShot">📷 매매인식</button>
      <button class="hdr-btn" id="btnSettings" style="background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.25);color:#94a3b8;min-width:40px;flex:0">⚙️</button>
    </div>`;
  return d;
}

export function mkTabs(){
  const d=document.createElement("div");
  d.innerHTML=`<div class="tabs">
    <div class="tab ${S.tab==='list'?'on':''}" data-tab="list">📋 종목</div>
    <div class="tab ${S.tab==='chart'?'on':''}" data-tab="chart">📊 비중</div>
    <div class="tab ${S.tab==='trend'?'on':''}" data-tab="trend">📈 추이</div>
    <div class="tab ${S.tab==='market'?'on':''}" data-tab="market">🌐 시장</div>
    <div class="tab ${S.tab==='journal'?'on':''}" data-tab="journal">📓 일지</div>
    <div class="tab ${S.tab==='txn'?'on':''}" data-tab="txn">📒 내역</div>
  </div>`;
  return d;
}

export function mkList(){
  const fl=filt(),stockTot=totK(fl);
  const d=document.createElement("div");

  // 정렬
  const sorted=[...fl].sort((a,b)=>{
    const aInvK=a.curr==="USD"?a.qty*a.avg*S.rate:a.qty*a.avg;
    const bInvK=b.curr==="USD"?b.qty*b.avg*S.rate:b.qty*b.avg;
    const aEvK=evK(a),bEvK=evK(b);
    let av=0,bv=0;
    if(S.sortBy==="eval"){av=aEvK;bv=bEvK;}
    else if(S.sortBy==="pct"){av=aInvK>0?(aEvK-aInvK)/aInvK:0;bv=bInvK>0?(bEvK-bInvK)/bInvK:0;}
    else if(S.sortBy==="pnl"){av=aEvK-aInvK;bv=bEvK-bInvK;}
    else if(S.sortBy==="wt"){av=aEvK;bv=bEvK;}
    return S.sortDir==="desc"?bv-av:av-bv;
  });

  const SORT_LABELS={eval:"평가금액",pct:"수익률",pnl:"손익",wt:"비중"};
  const sortOptions=Object.entries(SORT_LABELS)
    .map(([k,l])=>`<option value="${k}" ${S.sortBy===k?'selected':''}>${l}</option>`)
    .join('');

  // ── 현금 인라인 섹션 ──────────────────────────────
  const accts=["메리츠증권","ISA"];
  let cashCardsHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0">';
  accts.forEach(acct=>{
    const c=S.cash[acct]||{USD:0,KRW:0};
    ["USD","KRW"].forEach(curr=>{
      cashCardsHtml+=`<div class="cash-card-sm">
        <div class="cash-curr">${acct} · ${curr}</div>
        <div class="cash-amt">${fM(c[curr]||0,curr)}</div>
        <div class="cash-btns">
          <button class="cash-btn cash-btn-in" data-cash-in="${acct}|${curr}">+ 입금</button>
          <button class="cash-btn cash-btn-out" data-cash-out="${acct}|${curr}">− 출금</button>
        </div>
      </div>`;
    });
  });
  cashCardsHtml+='</div>';
  let cashTxnHtml='';
  if(S.cashTxns.length===0){
    cashTxnHtml='<div style="font-size:.8em;color:#8b949e;padding:10px 0 4px">입출금 내역이 없어요</div>';
  }else{
    cashTxnHtml=`<div class="cash-section-title">📜 최근 입출금</div>`+
      S.cashTxns.slice(0,5).map(t=>`<div class="txn" style="margin-bottom:6px">
        <div class="txn-head">
          <span class="txn-name">${t.mode==='in'?'⬆️':'⬇️'} ${t.acct} ${t.curr}</span>
          <span class="txn-date">${t.date}</span>
        </div>
        <div class="txn-det">${fM(t.amount,t.curr)}${t.memo?` · ${t.memo}`:''}</div>
        <div class="txn-actions"><button class="cbtn cbtn-undo" data-cash-undo="${t.id}">↩️ 취소</button></div>
      </div>`).join('');
    if(S.cashTxns.length>5)cashTxnHtml+=`<div style="text-align:center;padding:6px 0;color:#8b949e;font-size:.78em">+${S.cashTxns.length-5}건 더...</div>`;
  }
  const cashSection=`
    <button class="cash-toggle-btn" id="btnCashToggle">
      <span>💰 현금 관리</span>
      <span>${S.showCash?'▲':'▼'}</span>
    </button>
    ${S.showCash?`<div class="cash-inline">${cashCardsHtml}${cashTxnHtml}</div>`:''}`;

  // ── 추이 인라인 섹션 ──────────────────────────────
  const periods=[["1D","1일"],["1W","1주"],["1M","1달"],["3M","3달"],["1Y","1년"],["ALL","전체"]];
  const periodBtns=periods.map(([k,l])=>`<button class="flt ${S.trendPeriod===k?'on':''}" data-period="${k}">${l}</button>`).join('');
  let trendSummaryHtml='';
  if(S.showTrend){
    if(S.trendPeriod==="1D"){
      const c24=new Date();c24.setDate(c24.getDate()-1);
      const intra=(S.intradaySnaps||[]).filter(s=>new Date(s.dt)>=c24);
      if(intra.length>=2){
        const first=intra[0],last=intra[intra.length-1];
        const chg=last.totalKRW-first.totalKRW,chgPct=first.totalKRW>0?chg/first.totalKRW*100:0;
        trendSummaryHtml=`<div class="trend-summary">
          <div class="ts-item"><div class="ts-lbl">총자산</div><div class="ts-val" style="font-size:.82em">₩${fK(last.totalKRW)}</div></div>
          <div class="ts-item"><div class="ts-lbl">당일 변화</div><div class="ts-val ${chg>=0?'pos':'neg'}">${chg>=0?'+':''}${fKShort(chg)}</div></div>
          <div class="ts-item"><div class="ts-lbl">당일 수익률</div><div class="ts-val ${chgPct>=0?'pos':'neg'}">${fP(chgPct)}</div></div>
        </div>`;
      }else{
        trendSummaryHtml='<div style="font-size:.8em;color:#8b949e;padding:8px 0 4px">⏳ 당일 데이터 수집 중</div>';
      }
    }else{
      const now=new Date();let cutoff=new Date(0);
      if(S.trendPeriod==="1W"){cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-7);}
      else if(S.trendPeriod==="1M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-1);}
      else if(S.trendPeriod==="3M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-3);}
      else if(S.trendPeriod==="1Y"){cutoff=new Date(now);cutoff.setFullYear(cutoff.getFullYear()-1);}
      const filtered=S.snapshots.filter(s=>s.date>=cutoff.toISOString().slice(0,10));
      if(filtered.length>=2){
        const first=filtered[0],last=filtered[filtered.length-1];
        const chg=last.totalKRW-first.totalKRW,chgPct=first.totalKRW>0?chg/first.totalKRW*100:0;
        trendSummaryHtml=`<div class="trend-summary">
          <div class="ts-item"><div class="ts-lbl">총자산</div><div class="ts-val" style="font-size:.82em">₩${fK(last.totalKRW)}</div></div>
          <div class="ts-item"><div class="ts-lbl">기간 변화</div><div class="ts-val ${chg>=0?'pos':'neg'}">${chg>=0?'+':''}${fKShort(chg)}</div></div>
          <div class="ts-item"><div class="ts-lbl">기간 수익률</div><div class="ts-val ${chgPct>=0?'pos':'neg'}">${fP(chgPct)}</div></div>
        </div>`;
      }else{
        trendSummaryHtml='<div style="font-size:.8em;color:#8b949e;padding:8px 0 4px">📭 스냅샷 없음 — 매일 방문 시 자동 기록돼요</div>';
      }
    }
  }
  const trendSection=`<div class="trend-section">
    <div class="trend-section-hdr" id="btnTrendToggle">
      <span class="trend-section-title">📈 추이</span>
      <span style="color:#8b949e;font-size:.82em">${S.showTrend?'▲ 접기':'▼ 펼치기'}</span>
    </div>
    ${S.showTrend?`
      <div class="filters" style="padding:0 0 4px">${periodBtns}</div>
      ${trendSummaryHtml}
      <div class="trend-chart-box">
        <div class="trend-chart-title">💰 총 자산 추이</div>
        <div style="position:relative;height:160px;width:100%"><canvas id="trendTotal"></canvas></div>
      </div>
      <div class="trend-chart-box">
        <div class="trend-chart-title">📈 수익률 추이</div>
        <div style="position:relative;height:130px;width:100%"><canvas id="trendPct"></canvas></div>
      </div>
    `:''}
  </div>`;

  const todayStripHtml=mkTodayStrip();

  const filtersHtml=`
    <div class="filters">
      <button class="flt ${S.acct==='전체'?'on':''}" data-acct="전체">전체</button>
      <button class="flt ${S.acct==='메리츠증권'?'on':''}" data-acct="메리츠증권">메리츠</button>
      <button class="flt ${S.acct==='ISA'?'on':''}" data-acct="ISA">ISA</button>
      <select class="sort-select" id="sortSelect">${sortOptions}</select>
      <button class="sort-dir-btn" id="sortDirBtn" title="정렬 방향">${S.sortDir==="desc"?"↓":"↑"}</button>
      <button class="view-tog" id="btnView">${S.viewMode==="table"?"📋":"📊"}</button>
    </div>
    <div style="padding:6px 12px 0">
      <div class="sum-card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div class="cg-item"><div class="cg-lbl">종목 평가</div><div class="cg-val">₩${fK(stockTot)}</div></div>
          <div class="cg-item"><div class="cg-lbl">현금</div><div class="cg-val">₩${fK(filtCashKRW())}</div></div>
        </div>
        ${cashSection}
      </div>
    </div>`;

  if(S.viewMode==="table"){
    const totalInvK=sorted.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg),0);
    const totalPnl=stockTot-totalInvK;
    const totalPct=totalInvK>0?totalPnl/totalInvK*100:0;

    const rows=sorted.map(s=>{
      const evk=s.curr==="USD"?s.qty*s.cur*S.rate:s.qty*s.cur;
      const sinvK=s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg;
      const spnl=evk-sinvK,spct=sinvK>0?spnl/sinvK*100:0;
      const wt=stockTot>0?evk/stockTot*100:0;
      const tc=S.tagColors[s.tag]||"#94a3b8";
      const curDisp=s.curr==="USD"?`$${s.cur.toFixed(2)}`:`₩${fK(s.cur)}`;
      const avgDisp=s.curr==="USD"?`$${s.avg.toFixed(2)}`:`₩${fK(s.avg)}`;
      const tblExtBadge=s.extPrice&&s.extType?`<div style="font-size:.65em;color:#fbbf24;margin-top:1px">${s.extType==='pre'?'🌅':'🌙'} $${s.extPrice.toFixed(2)}</div>`:'';
      return `<tr class="gs-r1">
        <td class="gs-td">
          <span class="gs-name">${s.name}</span>
          <span class="gs-sub">${s.qty.toLocaleString()}주 · ${avgDisp}</span>
        </td>
        <td class="gs-td">${curDisp}${tblExtBadge}</td>
        <td class="gs-td">${fKShort(evk)}</td>
        <td class="gs-td"><button class="gs-more" data-action="${s.id}">⋮</button></td>
      </tr>
      <tr class="gs-r2">
        <td class="gs-td"><span style="font-size:.68em;display:flex;gap:4px;align-items:center"><span class="chip ${s.acct==='ISA'?'chip-i':'chip-m'}" style="font-size:.9em;padding:1px 5px">${s.acct==='ISA'?'ISA':'메리츠'}</span><span class="chip" style="padding:1px 5px;background:${tc}22;color:${tc}">${s.tag||'-'}</span></span></td>
        <td class="gs-td ${spct>=0?'pos':'neg'}">${fP(spct)}</td>
        <td class="gs-td">
          <div style="font-size:.78em;color:#8b949e">${wt.toFixed(1)}%</div>
          <div class="${spnl>=0?'pos':'neg'}" style="font-size:.78em">${spnl>=0?'+':''}${fKShort(spnl)}</div>
        </td>
        <td class="gs-td"></td>
      </tr>`;
    }).join('');

    const sumRow=`<tr class="gs-sum">
      <td class="gs-td">합계</td>
      <td class="gs-td"></td>
      <td class="gs-td">
        <div>${fKShort(stockTot)}</div>
        <div class="${totalPnl>=0?'pos':'neg'}" style="font-size:.85em">${totalPnl>=0?'+':''}${fKShort(totalPnl)}</div>
      </td>
      <td class="gs-td"></td>
    </tr>`;

    d.innerHTML=`${todayStripHtml}${filtersHtml}<div class="gs-wrap"><table class="gs-tbl">
      <thead><tr>
        <th class="gs-th">종목명 / 태그</th>
        <th class="gs-th">현재가</th>
        <th class="gs-th">평가금액</th>
        <th class="gs-th"></th>
      </tr></thead>
      <tbody>${rows||'<tr><td class="gs-td" colspan="4" style="text-align:center;padding:20px;color:#8b949e">종목이 없어요</td></tr>'}${sumRow}</tbody>
    </table></div>${trendSection}`;
    return d;
  }

  // 카드뷰
  const cards=sorted.map(s=>{
    const ev=s.qty*s.cur,evk=s.curr==="USD"?ev*S.rate:ev;
    const sinv=s.qty*s.avg,spnl=ev-sinv,spct=sinv>0?spnl/sinv*100:0;
    const wt=stockTot>0?evk/stockTot*100:0;
    const tc=S.tagColors[s.tag]||"#94a3b8";
    const extBadge=s.extPrice&&s.extType?`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.62em;padding:2px 6px;border-radius:4px;background:rgba(245,158,11,.15);color:#fbbf24;font-weight:700">${s.extType==='pre'?'🌅':'🌙'} $${s.extPrice.toFixed(2)} <span style="opacity:.8">${s.extPct>=0?'+':''}${(s.extPct||0).toFixed(2)}%</span></span>`:'';
    return `<div class="card">
      <div class="card-top">
        <div style="flex:1;min-width:0">
          <div class="card-name">${s.name}</div>
          <div class="card-chips">
            <span class="chip ${s.acct==='ISA'?'chip-i':'chip-m'}">${s.acct==='ISA'?'ISA':'메리츠'}</span>
            <span class="chip chip-tag" style="background:${tc}22;color:${tc}" data-edit-tag="${s.id}">${s.tag||'태그없음'} ✏️</span>
            ${extBadge}
          </div>
        </div>
        <div class="card-pct ${spct>=0?'pos':'neg'}">${fP(spct)}</div>
      </div>
      <div class="card-grid">
        <div class="cg-item"><div class="cg-lbl">수량</div><div class="cg-val">${s.qty.toLocaleString()}</div></div>
        <div class="cg-item"><div class="cg-lbl">평단가</div><div class="cg-val">${fM(s.avg,s.curr)}</div></div>
        <div class="cg-item"><div class="cg-lbl">평가금액</div><div class="cg-val">${fM(ev,s.curr)}</div></div>
        <div class="cg-item"><div class="cg-lbl">손익</div><div class="cg-val ${spnl>=0?'pos':'neg'}">${fM(spnl,s.curr)}</div></div>
        <div class="cg-item"><div class="cg-lbl">비중</div><div class="cg-val">${wt.toFixed(1)}%</div></div>
      </div>
      <div class="card-bottom">
        <div class="cur-wrap">
          <span class="cur-lbl">현재가</span>
          <input class="cur-inp" data-id="${s.id}" type="number" value="${s.cur}" step="0.01">
        </div>
        <div class="card-btns">
          <button class="cbtn cbtn-buy" data-id="${s.id}" data-mode="buy">매수</button>
          <button class="cbtn cbtn-sell" data-id="${s.id}" data-mode="sell">매도</button>
          <button class="cbtn cbtn-edit" data-edit="${s.id}">✏️</button>
          <button class="cbtn cbtn-del" data-del="${s.id}">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');

  d.innerHTML=`${todayStripHtml}${filtersHtml}<div class="cards">${cards||'<div class="empty">종목이 없어요</div>'}</div>${trendSection}`;
  return d;
}

export function mkCash(){
  const d=document.createElement("div");
  const accts=["메리츠증권","ISA"];
  let html='<div class="cash-wrap">';
  accts.forEach(acct=>{
    const c=S.cash[acct]||{USD:0,KRW:0};
    ["USD","KRW"].forEach(curr=>{
      html+=`<div class="cash-card">
        <div class="cash-curr">${acct} · ${curr}</div>
        <div class="cash-amt">${fM(c[curr]||0,curr)}</div>
        <div class="cash-btns">
          <button class="cash-btn cash-btn-in" data-cash-in="${acct}|${curr}">+ 입금</button>
          <button class="cash-btn cash-btn-out" data-cash-out="${acct}|${curr}">− 출금</button>
        </div>
      </div>`;
    });
  });
  html+='<div class="cash-section-title">📜 입출금 내역</div>';
  if(S.cashTxns.length===0){
    html+='<div class="empty">입출금 내역이 없어요</div>';
  }else{
    S.cashTxns.forEach(t=>{
      html+=`<div class="txn">
        <div class="txn-head">
          <span class="txn-name">${t.mode==='in'?'⬆️':'⬇️'} ${t.acct} ${t.curr} ${t.mode==='in'?'입금':'출금'}</span>
          <span class="txn-date">${t.date} ${t.time||''}</span>
        </div>
        <div class="txn-det">
          ${fM(t.amount,t.curr)}${t.memo?` · ${t.memo}`:''}
        </div>
        <div class="txn-actions">
          <button class="cbtn cbtn-undo" data-cash-undo="${t.id}">↩️ 취소</button>
        </div>
      </div>`;
    });
  }
  html+='</div>';
  d.innerHTML=html;
  return d;
}

export function mkChart(){
  const d=document.createElement("div");
  const isTree=S.chartView==="treemap";
  d.innerHTML=`
    <div class="filters">
      <button class="flt ${!isTree?'on':''}" data-cview="donut">🍩 도넛</button>
      <button class="flt ${isTree?'on':''}" data-cview="treemap">▦ 트리맵</button>
      <button class="flt ${S.wMode==='stock'?'on':''}" data-wmode="stock">종목별</button>
      <button class="flt ${S.wMode==='tag'?'on':''}" data-wmode="tag">태그별</button>
    </div>
    <div class="chart-wrap">
      ${isTree
        ?'<div id="treemap-container" class="treemap-container"></div>'
        :'<div class="chart-box"><canvas id="donut"></canvas></div><div class="legend" id="legend"></div>'
      }
    </div>`;
  return d;
}

// ═══════════════════════════════════════════
// 📈 추이 탭 (💡 1D 추가 및 세로 팽창 방지 높이 고정)
// ═══════════════════════════════════════════
export function mkTrend(){
  const d=document.createElement("div");
  const periods=[["1D","1일"],["1W","1주"],["1M","1달"],["3M","3달"],["1Y","1년"],["ALL","전체"]];
  const btns=periods.map(([k,l])=>`<button class="flt ${S.trendPeriod===k?'on':''}" data-period="${k}">${l}</button>`).join('');

  if(S.trendPeriod==="1D"){
    const cutoff24=new Date();cutoff24.setDate(cutoff24.getDate()-1);
    const intra=(S.intradaySnaps||[]).filter(s=>new Date(s.dt)>=cutoff24);
    let summary='';
    if(intra.length>=2){
      const first=intra[0],last=intra[intra.length-1];
      const change=last.totalKRW-first.totalKRW;
      const changePct=first.totalKRW>0?change/first.totalKRW*100:0;
      summary=`<div class="trend-summary">
        <div class="ts-item"><div class="ts-lbl">현재 총자산</div><div class="ts-val">₩${fK(last.totalKRW)}</div></div>
        <div class="ts-item"><div class="ts-lbl">당일 변화</div><div class="ts-val ${change>=0?'pos':'neg'}">${change>=0?'+':''}₩${fK(change)}</div></div>
        <div class="ts-item"><div class="ts-lbl">당일 수익률</div><div class="ts-val ${changePct>=0?'pos':'neg'}">${fP(changePct)}</div></div>
      </div>`;
    }
    const notice=intra.length<2?'<div class="empty" style="padding:20px">⏳ 당일 데이터 수집 중<br><br><span style="font-size:.85em">동기화할 때마다 30분 간격으로 기록됩니다</span></div>':'';
    d.innerHTML=`
      <div class="filters">${btns}</div>
      <div class="trend-wrap">
        ${summary}${notice}
        ${intra.length>=2?`
        <div class="trend-chart-box">
          <div class="trend-chart-title">💰 총 자산 추이 (오늘)</div>
          <div style="position:relative;height:220px;width:100%"><canvas id="trendTotal"></canvas></div>
        </div>
        <div class="trend-chart-box">
          <div class="trend-chart-title">📈 수익률 추이 (오늘)</div>
          <div style="position:relative;height:180px;width:100%"><canvas id="trendPct"></canvas></div>
        </div>
        <div style="font-size:.75em;color:#8b949e;text-align:center;padding:10px">기록된 포인트: ${intra.length}개 (30분 간격)</div>`:''}
      </div>`;
    return d;
  }

  if(!S.snapshots||S.snapshots.length<1){
    d.innerHTML=`<div class="filters">${btns}</div>
      <div class="empty">📭 스냅샷 데이터가 없어요<br><br><span style="font-size:.85em">매일 페이지에 한 번씩 방문하면<br>자동으로 기록돼서 추이를 볼 수 있어요</span></div>`;
    return d;
  }

  const now=new Date();
  let cutoff=new Date(0);
  if(S.trendPeriod==="1W"){cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-7);}
  else if(S.trendPeriod==="1M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-1);}
  else if(S.trendPeriod==="3M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-3);}
  else if(S.trendPeriod==="1Y"){cutoff=new Date(now);cutoff.setFullYear(cutoff.getFullYear()-1);}

  const cutoffStr=cutoff.toISOString().slice(0,10);
  const filtered=S.snapshots.filter(s=>s.date>=cutoffStr);

  let summary='';
  if(filtered.length>=2){
    const first=filtered[0],last=filtered[filtered.length-1];
    const change=last.totalKRW-first.totalKRW;
    const changePct=first.totalKRW>0?change/first.totalKRW*100:0;
    summary=`<div class="trend-summary">
      <div class="ts-item"><div class="ts-lbl">현재 총자산</div><div class="ts-val">₩${fK(last.totalKRW)}</div></div>
      <div class="ts-item"><div class="ts-lbl">기간 변화</div><div class="ts-val ${change>=0?'pos':'neg'}">${change>=0?'+':''}₩${fK(change)}</div></div>
      <div class="ts-item"><div class="ts-lbl">기간 수익률</div><div class="ts-val ${changePct>=0?'pos':'neg'}">${fP(changePct)}</div></div>
    </div>`;
  }

  d.innerHTML=`
    <div class="filters">${btns}</div>
    <div class="trend-wrap">
      ${summary}
      <div class="trend-chart-box">
        <div class="trend-chart-title">💰 총 자산 추이 (KRW)</div>
        <div style="position:relative;height:220px;width:100%"><canvas id="trendTotal"></canvas></div>
      </div>
      <div class="trend-chart-box">
        <div class="trend-chart-title">📈 누적 수익률 (%)</div>
        <div style="position:relative;height:180px;width:100%"><canvas id="trendPct"></canvas></div>
      </div>
      <div style="font-size:.75em;color:#8b949e;text-align:center;padding:10px">기록된 일수: ${filtered.length}일 / 전체 ${S.snapshots.length}일</div>
    </div>`;
  return d;
}

// ═══════════════════════════════════════════
// 📓 매매일지 탭
// ═══════════════════════════════════════════
export function mkJournal(){
  const d=document.createElement("div");
  const stockNames=["전체",...new Set(S.journal.map(j=>j.stockName).filter(Boolean))];
  const filtBtns=stockNames.map(n=>`<button class="flt ${S.jFilter===n?'on':''}" data-jfilt="${n}">${n}</button>`).join('');

  let journalCards='';
  const items=S.jFilter==="전체"?S.journal:S.journal.filter(j=>j.stockName===S.jFilter);
  if(items.length===0){
    journalCards='<div class="empty">📭 일지가 없어요<br><br><span style="font-size:.85em">"+ 일지 추가" 버튼으로<br>매수 사유, 뉴스, 생각을 기록해보세요</span></div>';
  }else{
    journalCards=items.map(j=>{
      const cat=JOURNAL_CATEGORIES[j.category]||JOURNAL_CATEGORIES.etc;
      return `<div class="journal-item" style="border-left:3px solid ${cat.color}">
        <div class="journal-head">
          <span class="journal-cat" style="background:${cat.color}22;color:${cat.color}">${cat.label}</span>
          ${j.stockName?`<span class="journal-stock">${j.stockName}</span>`:''}
          <span class="journal-date">${j.date} ${j.time||''}</span>
        </div>
        <div class="journal-content">${j.content}</div>
        <div class="journal-actions">
          <button class="cbtn cbtn-del" data-jdel="${j.id}">🗑 삭제</button>
        </div>
      </div>`;
    }).join('');
  }

  d.innerHTML=`
    <div class="filters">${filtBtns}</div>
    <div style="padding:12px 12px 0">
      <button class="mbtn mbtn-pri" id="btnAddJournal">+ 일지 추가</button>
    </div>
    <div class="journal-list">${journalCards}</div>`;
  return d;
}

export function mkTxn(){
  const d=document.createElement("div");
  if(!S.txns.length){d.innerHTML='<div class="empty">📭 거래 내역이 없어요</div>';return d;}
  d.className="txn-list";
  S.txns.forEach(t=>{
    const el=document.createElement("div");el.className="txn";
    let detail=`${t.mode==='buy'?'매수':'매도'} ${t.qty}주 × ${t.price}`;
    if(t.fee>0)detail+=` · 수수료 ${t.fee}`;
    if(t.mode==='sell'){
      const inv=t.prevAvg*t.qty;
      const pct=inv>0?t.pnl/inv*100:0;
      detail+=` · 실현손익 <span class="${t.pnl>=0?'pos':'neg'}">${t.pnl>=0?'+':''}${t.pnl.toFixed(2)} (${pct>=0?'+':''}${pct.toFixed(2)}%)</span>`;
    }
    el.innerHTML=`<div class="txn-head">
      <span class="txn-name">${t.mode==='buy'?'📈':'📉'} ${t.name}</span>
      <span class="txn-date">${t.date} ${t.time||''}</span>
    </div>
    <div class="txn-det">${detail}</div>
    <div class="txn-actions"><button class="cbtn cbtn-undo" data-txn-undo="${t.id}">↩️ 거래 취소</button></div>`;
    d.appendChild(el);
  });
  return d;
}

// ═══════════════════════════════════════════
// 모달 (💡 수정 및 추가 모달에 티커 입력창 포함 완료)
// ═══════════════════════════════════════════
export function mkModal(){
  const d=document.createElement("div");d.className="modal-bg";d.id="mbg";

  if(S.modal.type==="trade"){
    const s=S.stocks.find(x=>x.id===S.modal.stockId);
    const c=S.cash[s?.acct]?.[s?.curr]||0;
    d.innerHTML=`<div class="modal">
      <div class="modal-title">${S.modal.mode==='buy'?'📈 매수':'📉 매도'} - ${s?.name}<button class="modal-close" id="mc">×</button></div>
      <div style="font-size:.82em;color:#8b949e;margin-bottom:10px">💰 보유 현금: ${fM(c,s?.curr)}</div>
      <div class="field"><label>수량</label><input type="number" id="tq" placeholder="0" min="0"></div>
      <div class="field"><label>가격 (${s?.curr})</label><input type="number" id="tp" value="${s?.cur}" step="0.01"></div>
      <div class="field"><label>수수료 (${s?.curr}, 선택)</label><input type="number" id="tf" placeholder="0" min="0" step="0.01"></div>
      <div class="preview" id="tprev"></div>
      <button class="mbtn mbtn-pri" id="exec">${S.modal.mode==='buy'?'매수 확인':'매도 확인'}</button>
      <button class="mbtn mbtn-sec" id="mc2">취소</button></div>`;
  }

  if(S.modal.type==="add"||S.modal.type==="edit"){
    const isEdit=S.modal.type==="edit";
    const s=isEdit?S.stocks.find(x=>x.id===S.modal.stockId):null;
    // Default currency: existing stock's curr, or KRW for ISA, USD for 메리츠증권
    const defCurr=s?.curr||(S.modal.defaultAcct==='ISA'?'KRW':'USD');
    const defAcct=s?.acct||S.modal.defaultAcct||'메리츠증권';
    const tagOpts=S.tags.map(t=>`<option ${s?.tag===t?'selected':''}>${t}</option>`).join('');
    d.innerHTML=`<div class="modal">
      <div class="modal-title">${isEdit?'✏️ 종목 수정':'+ 종목 추가'}<button class="modal-close" id="mc">×</button></div>
      <div class="field"><label>종목명</label><input type="text" id="an" placeholder="종목명" value="${s?.name||''}"></div>
      <div class="field"><label>티커명 (구글파이낸스용)</label><input type="text" id="aticker" placeholder="예: LLY 또는 005930" value="${s?.ticker||''}"></div>
      <div class="field"><label>계좌</label><select id="aa"><option ${defAcct==='메리츠증권'?'selected':''}>메리츠증권</option><option ${defAcct==='ISA'?'selected':''}>ISA</option></select></div>
      <div class="field"><label>통화</label><select id="ac"><option ${defCurr==='USD'?'selected':''}>USD</option><option ${defCurr==='KRW'?'selected':''}>KRW</option></select></div>
      <div class="field"><label>수량</label><input type="number" id="aq" value="${s?.qty??''}" step="any"></div>
      <div class="field"><label>평균단가</label><input type="number" id="aavg" value="${s?.avg??''}" step="any"></div>
      <div class="field"><label>현재가</label><input type="number" id="acur" value="${s?.cur??''}" step="any"></div>
      <div class="field"><label>태그</label><select id="at">${tagOpts}</select></div>
      <button class="mbtn mbtn-pri" id="exec">${isEdit?'저장':'추가'}</button>
      <button class="mbtn mbtn-sec" id="mc2">취소</button></div>`;
  }

  if(S.modal.type==="cashIn"||S.modal.type==="cashOut"){
    const [acct,curr]=S.modal.target.split("|");
    const mode=S.modal.type==="cashIn"?"in":"out";
    const c=S.cash[acct]?.[curr]||0;
    d.innerHTML=`<div class="modal">
      <div class="modal-title">${mode==='in'?'⬆️ 입금':'⬇️ 출금'} - ${acct} ${curr}<button class="modal-close" id="mc">×</button></div>
      <div style="font-size:.82em;color:#8b949e;margin-bottom:10px">현재 잔액: ${fM(c,curr)}</div>
      <div class="field"><label>금액 (${curr})</label><input type="number" id="cashAmt" placeholder="0"></div>
      <div class="field"><label>메모 (선택)</label><input type="text" id="cashMemo" placeholder="예: 월급, 배당금"></div>
      <button class="mbtn mbtn-pri" id="exec">${mode==='in'?'입금':'출금'} 확인</button>
      <button class="mbtn mbtn-sec" id="mc2">취소</button></div>`;
  }

  if(S.modal.type==="editTag"){
    const s=S.stocks.find(x=>x.id===S.modal.stockId);
    const tagBtns=S.tags.map(t=>{
      const c=S.tagColors[t]||"#94a3b8";
      const on=s?.tag===t;
      return `<button class="tag-pick ${on?'on':''}" style="background:${c}22;color:${c}" data-pick-tag="${t}">${t}</button>`;
    }).join('');
    d.innerHTML=`<div class="modal">
      <div class="modal-title">🏷️ ${s?.name} 태그<button class="modal-close" id="mc">×</button></div>
      <div class="tag-list">${tagBtns}</div>
      <div style="margin:14px 0 6px;font-size:.85em;color:#a5b4fc;font-weight:700">새 태그 만들기</div>
      <div class="tag-manage">
        <input type="text" id="newTagName" placeholder="태그 이름">
        <input type="color" id="newTagColor" value="#6366f1" style="width:50px;padding:2px">
        <button class="mbtn mbtn-pri" id="addTagBtn" style="width:auto;padding:11px 14px;margin:0">+</button>
      </div>
      <div style="margin:18px 0 6px;font-size:.85em;color:#a5b4fc;font-weight:700">태그 관리</div>
      <div>${S.tags.map(t=>`<div class="tag-row"><span class="tag-row-name" style="color:${S.tagColors[t]||'#94a3b8'}">● ${t}</span><button class="tag-row-del" data-del-tag="${t}">삭제</button></div>`).join('')}</div>
      <button class="mbtn mbtn-sec" id="mc2" style="margin-top:14px">닫기</button>
    </div>`;
  }

  if(S.modal.type==="stockAction"){
    const s=S.stocks.find(x=>x.id===S.modal.stockId);
    const ev=s?s.qty*s.cur:0;
    const evk=s?.curr==="USD"?ev*S.rate:ev;
    const sinvK=s?.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg;
    const spnl=evk-sinvK,spct=sinvK>0?spnl/sinvK*100:0;
    d.innerHTML=`<div class="modal">
      <div class="modal-title" style="flex-direction:column;align-items:flex-start;gap:4px">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span>${s?.name}</span><button class="modal-close" id="mc">×</button>
        </div>
        <div style="font-size:.78em;font-weight:600">
          <span class="${spct>=0?'pos':'neg'}">${fP(spct)}</span>
          <span style="color:#8b949e;margin:0 6px">·</span>
          <span style="color:#8b949e">₩${fK(evk)}</span>
          <span style="color:#8b949e;margin:0 6px">·</span>
          <span class="${spnl>=0?'pos':'neg'}">${spnl>=0?'+':''}₩${fK(spnl)}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <button class="mbtn mbtn-pri" id="actBuy" style="margin:0">📈 매수</button>
        <button class="mbtn" id="actSell" style="margin:0;background:rgba(244,63,94,.2);color:#f43f5e;border:1px solid rgba(244,63,94,.4)">📉 매도</button>
      </div>
      <div class="field"><label>현재가 수정 (${s?.curr})</label>
        <input type="number" id="actPrice" value="${s?.cur}" step="0.01">
      </div>
      <button class="mbtn mbtn-sec" id="actEdit">✏️ 종목 정보 수정</button>
      <button class="mbtn mbtn-danger" id="actDel">🗑 삭제</button>
      <button class="mbtn mbtn-sec" id="mc2">닫기</button>
    </div>`;
  }

  if(S.modal.type==="addJournal"){
    const stockOpts=`<option value="">선택 안 함</option>`+S.stocks.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
    const catOpts=Object.entries(JOURNAL_CATEGORIES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
    const preStockId=S.modal.stockId||"";
    d.innerHTML=`<div class="modal">
      <div class="modal-title">📓 일지 추가<button class="modal-close" id="mc">×</button></div>
      <div class="field"><label>카테고리</label><select id="jcat">${catOpts}</select></div>
      <div class="field"><label>관련 종목 (선택)</label><select id="jstock">${stockOpts.replace(`value="${preStockId}"`,`value="${preStockId}" selected`)}</select></div>
      <div class="field"><label>내용</label><textarea id="jcontent" placeholder="예: AIP 모멘텀 지속 + 정부 계약 확대 기대..."></textarea></div>
      <button class="mbtn mbtn-pri" id="exec">저장</button>
      <button class="mbtn mbtn-sec" id="mc2">취소</button>
    </div>`;
  }

  if(S.modal.type==="settings"){
    const cur=getApiUrl();
    const akey=getAnthropicKey();
    d.innerHTML=`<div class="modal">
      <div class="modal-title">⚙️ 설정<button class="modal-close" id="mc">×</button></div>
      <div class="field">
        <label>Google Apps Script 배포 URL</label>
        <input type="text" id="apiUrlInp" value="${cur}" placeholder="https://script.google.com/macros/s/...">
        <div style="font-size:.72em;color:#8b949e;margin-top:5px;line-height:1.5">클라우드 동기화에 필요한 GAS 배포 URL입니다.<br>이 기기의 localStorage에만 저장되며 소스코드에 포함되지 않습니다.</div>
      </div>
      <div class="field">
        <label>Anthropic API 키 (📷 매매인식용, 선택)</label>
        <input type="password" id="anthropicKeyInp" value="${akey}" placeholder="sk-ant-...">
        <div style="font-size:.72em;color:#8b949e;margin-top:5px;line-height:1.5">console.anthropic.com에서 발급. 스크린샷 매매인식에 사용됩니다.<br>이 기기의 localStorage에만 저장되며 소스코드에 포함되지 않습니다.</div>
      </div>
      <button class="mbtn mbtn-pri" id="saveApiUrl">저장</button>
      <button class="mbtn mbtn-sec" id="mc2">취소</button>
    </div>`;
  }

  if(S.modal.type==="screenshot"){
    const hasKey=!!getAnthropicKey();
    const n=getShotFiles().length;
    d.innerHTML=`<div class="modal">
      <div class="modal-title">📷 매매 스크린샷 인식<button class="modal-close" id="mc">×</button></div>
      <div style="font-size:.78em;color:#8b949e;margin-bottom:12px;line-height:1.6">
        증권사 앱의 <b style="color:#f472b6">체결내역 / 거래내역 / 입출금</b> 화면 스크린샷을 올리면<br>
        Claude가 자동으로 읽어서 잔고에 반영합니다 (수수료·세금 포함).
      </div>
      ${hasKey?'':`<div class="field">
        <label>Anthropic API 키 (최초 1회 입력)</label>
        <input type="password" id="shotKeyInp" placeholder="sk-ant-...">
        <div style="font-size:.72em;color:#8b949e;margin-top:5px">console.anthropic.com에서 발급 · 이 기기에만 저장</div>
      </div>`}
      <div class="field">
        <label>스크린샷 선택 (여러 장 가능)</label>
        <input type="file" id="shotFiles" accept="image/*" multiple>
        <div style="font-size:.75em;color:#a5b4fc;margin-top:6px" id="shotCount">${n?`✅ ${n}장 선택됨`:''}</div>
      </div>
      <div id="shotStatus" style="font-size:.8em;color:#fbbf24;min-height:1.2em;margin-bottom:6px"></div>
      <button class="mbtn mbtn-pri" id="execShotAnalyze">🔍 분석하기</button>
      <button class="mbtn mbtn-sec" id="mc2">닫기</button>
    </div>`;
  }

  if(S.modal.type==="screenshotConfirm"){
    const items=S.modal.parsed||[];
    const typeInfo={buy:['📈 매수','#10b981'],sell:['📉 매도','#f43f5e'],deposit:['⬆️ 입금','#60a5fa'],withdraw:['⬇️ 출금','#f97316'],dividend:['💵 배당','#a78bfa']};
    const rows=items.map((t,i)=>{
      const [lbl,col]=typeInfo[t.type]||['❓ '+t.type,'#94a3b8'];
      const isTrade=t.type==='buy'||t.type==='sell';
      const desc=isTrade
        ?`${t.qty}주 × ${fM(t.price,t.curr)}${t.fee?` · 수수료 ${fM(t.fee,t.curr)}`:''}`
        :`${fM(t.amount,t.curr)}`;
      let warn='';
      if(t.invalid)warn='<span style="color:#f43f5e">⚠️ 값 인식 불가</span>';
      else if(t.insufficient)warn='<span style="color:#f43f5e">⚠️ 보유수량 부족</span>';
      else if(t.type==='sell'&&!t.matchedId)warn='<span style="color:#f43f5e">⚠️ 종목 미매칭</span>';
      else if(t.isNew)warn='<span style="color:#fbbf24">🆕 신규 종목으로 추가</span>';
      else if(t.matchedName)warn=`<span style="color:#8b949e">→ ${t.matchedName}</span>`;
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid rgba(48,54,61,.6)">
        <input type="checkbox" data-shot-idx="${i}" ${t.checked?'checked':''} ${t.invalid?'disabled':''} style="margin-top:3px;width:17px;height:17px;accent-color:#6366f1">
        <div style="flex:1;min-width:0">
          <div style="font-size:.88em;font-weight:700"><span style="color:${col}">${lbl}</span> ${t.name||t.acct}</div>
          <div style="font-size:.8em;color:#e6edf3;margin-top:2px">${desc}</div>
          <div style="font-size:.72em;margin-top:2px">${t.acct} · ${t.curr}${t.date?` · ${t.date}`:''} ${warn}</div>
        </div>
      </div>`;
    }).join('');
    d.innerHTML=`<div class="modal">
      <div class="modal-title">📋 인식 결과 확인<button class="modal-close" id="mc">×</button></div>
      <div style="font-size:.78em;color:#8b949e;margin-bottom:6px">반영할 거래를 확인하고 체크하세요. 숫자가 틀렸으면 체크 해제 후 수동 입력해주세요.</div>
      <div style="max-height:48vh;overflow-y:auto;margin-bottom:8px">${rows}</div>
      <button class="mbtn mbtn-pri" id="execShotApply">✅ 선택한 거래 반영</button>
      <button class="mbtn mbtn-sec" id="shotBack">← 다시 선택</button>
      <button class="mbtn mbtn-sec" id="mc2">닫기</button>
    </div>`;
  }

  return d;
}
