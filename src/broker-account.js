// Real-account responses live only in this closure, never in portfolio state.
const brokerEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brokerNumber=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('ko-KR',{maximumFractionDigits:8}):'미확인';
const brokerText=value=>value===null||value===undefined||value===''?'미확인':brokerEscape(value);
const brokerAmount=(value,currency='')=>typeof value==='number'&&Number.isFinite(value)?`${value.toLocaleString('ko-KR',{maximumFractionDigits:2})}${currency?` ${brokerEscape(currency)}`:''}`:'미확인';
const sectionOK=s=>s?.status==='success'&&s.paginationComplete===true;
const rowsFor=(a,key)=>Array.isArray(a?.sections?.[key]?.rows)?a.sections[key].rows:[];
export function brokerSummary(snapshot){
 if(!snapshot)return{currencies:{},totalKRW:null,pnlKRW:null,pnlPct:null,fxRate:null,depositOrderable:null,usdBalance:null,estimated:true};
 const domestic=rowsFor(snapshot,'domesticHoldings'),overseas=rowsFor(snapshot,'overseasHoldings'),all=[...domestic,...overseas];
 const groups={};
 for(const currency of ['KRW','USD']){
  const rows=all.filter(r=>r.currency===currency),complete=currency==='KRW'?sectionOK(snapshot.sections?.domesticHoldings):sectionOK(snapshot.sections?.overseasHoldings);
  const valid=rows.every(r=>[r.marketValue,r.quantity,r.averagePrice].every(v=>typeof v==='number'&&Number.isFinite(v)));
  const marketValue=complete&&valid?rows.reduce((n,r)=>n+r.marketValue,0):null;
  const cost=complete&&valid?rows.reduce((n,r)=>n+r.quantity*r.averagePrice,0):null;
  const pnl=marketValue!==null&&cost!==null?marketValue-cost:null;
  groups[currency]={marketValue,cost,pnl,pnlPct:pnl!==null&&cost>0?pnl/cost*100:null,complete:complete&&valid};
 }
 const currencyRows=rowsFor(snapshot,'currencies'),usd=currencyRows.find(r=>r.currency==='USD');
 const fxRate=sectionOK(snapshot.sections?.currencies)&&typeof usd?.fxRate==='number'&&Number.isFinite(usd.fxRate)&&usd.fxRate>0?usd.fxRate:null;
 const dep=rowsFor(snapshot,'deposit').find(r=>r.currency==='KRW')||rowsFor(snapshot,'deposit')[0];
 const depositOrderable=sectionOK(snapshot.sections?.deposit)&&typeof dep?.orderable==='number'&&Number.isFinite(dep.orderable)?dep.orderable:null;
 const usdBalance=sectionOK(snapshot.sections?.currencies)&&typeof usd?.balance==='number'&&Number.isFinite(usd.balance)?usd.balance:null;
 const currenciesValid=all.every(r=>r.currency==='KRW'||r.currency==='USD');
 const totalReady=currenciesValid&&sectionOK(snapshot.sections?.domesticHoldings)&&sectionOK(snapshot.sections?.overseasHoldings)&&sectionOK(snapshot.sections?.deposit)&&sectionOK(snapshot.sections?.currencies)&&groups.KRW.marketValue!==null&&groups.USD.marketValue!==null&&fxRate!==null&&typeof dep?.balance==='number'&&Number.isFinite(dep.balance)&&usdBalance!==null;
 const totalKRW=totalReady?groups.KRW.marketValue+groups.USD.marketValue*fxRate+dep.balance+usdBalance*fxRate:null;
 const pnlReady=sectionOK(snapshot.sections?.currencies)&&groups.KRW.pnl!==null&&groups.USD.pnl!==null&&fxRate!==null;
 const pnlKRW=pnlReady?groups.KRW.pnl+groups.USD.pnl*fxRate:null;
 const costKRW=pnlReady?groups.KRW.cost+groups.USD.cost*fxRate:null;
 return{currencies:groups,totalKRW,pnlKRW,pnlPct:pnlKRW!==null&&costKRW>0?pnlKRW/costKRW*100:null,fxRate,depositOrderable,usdBalance,estimated:true};
}
const brokerFields={
 domesticHoldings:[['quantity','보유수량'],['averagePrice','평균단가'],['currentPrice','조회가격'],['marketValue','평가금액'],['pnl','평가손익']],
 overseasHoldings:[['quantity','보유수량'],['averagePrice','평균단가'],['currentPrice','조회가격'],['marketValue','평가금액'],['pnl','평가손익']],
 deposit:[['balance','예수금'],['d1Balance','D+1 예수금'],['d2Balance','D+2 예수금'],['withdrawable','출금가능금액'],['orderable','주문가능금액']],
 currencies:[['balance','잔고'],['estimatedBalance','추정잔고'],['fxRate','적용환율']],
 fills:[['quantity','누적 체결수량'],['price','체결가격'],['amount','체결금액']]
};
const brokerTitles={domesticHoldings:'국내 보유잔고',overseasHoldings:'해외 보유잔고',deposit:'예수금',currencies:'통화별 잔고',fills:'체결수량 있는 주문'};
function brokerSectionHTML(key,section){
 const s=section||{status:'error',rows:[]};
 const complete=s.status==='success'&&s.paginationComplete===true;
 const status=s.status==='error'?'조회 실패':complete?'조회 완료':'부분 조회';
 const rows=Array.isArray(s.rows)?s.rows:[];
 return `<section class="broker-section" aria-label="${brokerTitles[key]}"><h2>${brokerTitles[key]} <span class="broker-status">${status}</span></h2>
 <p class="broker-meta">출처 meritz-openapi · REST 조회시각 ${brokerText(s.queriedAt)}<br>기준시각 미확인${s.paginationComplete!==true?' · 조회 범위 미완료':''}</p>
 ${s.errorCode?`<p class="broker-warning">오류 코드 ${brokerText(s.errorCode)}</p>`:''}
 ${Array.isArray(s.failedDates)&&s.failedDates.length?`<p class="broker-warning">조회 실패 날짜: ${s.failedDates.map(brokerText).join(', ')}</p>`:''}
 ${s.status==='error'?'<p class="broker-warning">조회 실패 — 잔고 0 또는 내역 없음으로 해석할 수 없습니다.</p>':''}
 ${!rows.length?(complete?'<p class="broker-empty">조회 결과 없음</p>':s.status==='error'?'':'<p class="broker-warning">확인된 내역 없음 — 전체 내역 없음이 아닙니다.</p>'):rows.map(row=>`<article class="broker-card">
 <h3>${brokerText(row.name||row.ticker||row.currency)}</h3>
 <p class="broker-meta">${row.ticker?`티커 ${brokerText(row.ticker)} · `:''}${row.providerSymbol?`원문 심볼 ${brokerText(row.providerSymbol)} · `:''}${row.currency?brokerText(row.currency):'통화 미확인'}</p>
 ${key==='fills'?`<p>${row.side==='buy'?'매수':row.side==='sell'?'매도':'매매구분 미확인'} · ${brokerText(row.date)} · 제공시각 ${brokerText(row.providerTime)} (시간대 미확인)</p>`:''}
 <dl>${brokerFields[key].map(([field,label])=>`<div><dt>${label}</dt><dd>${brokerNumber(row[field])}</dd></div>`).join('')}</dl></article>`).join('')}
 </section>`;
}
export function brokerAccountHTML(state){
 const a=state.snapshot;
 const summary=brokerSummary(a);
 const last=a?.queriedAt?new Date(a.queriedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'미조회';
 const holdings=[...rowsFor(a,'domesticHoldings'),...rowsFor(a,'overseasHoldings')].sort((x,y)=>(Number(y.marketValue)||0)-(Number(x.marketValue)||0));
 const holdingsHTML=`<section class="broker-section" aria-label="전체 보유잔고"><h2>보유잔고</h2>${['domesticHoldings','overseasHoldings'].map(key=>{const s=a?.sections?.[key];return `<p class="broker-meta">${brokerTitles[key]} · ${s?.status==='success'?'조회 완료':s?.status==='error'?'조회 실패':'부분 조회'} · 조회 ${brokerText(s?.queriedAt)}${s?.paginationComplete!==true?' · 조회 범위 미완료':''}</p>${s?.errorCode?`<p class="broker-warning">오류 코드 ${brokerText(s.errorCode)}</p>`:''}${!sectionOK(s)?'<p class="broker-warning">조회가 불완전합니다 — 해당 통화 합계는 미확인으로 처리합니다.</p>':!rowsFor(a,key).length?'<p class="broker-empty">조회 결과 없음</p>':''}`;}).join('')}${holdings.map(r=>{const g=summary.currencies[r.currency],weight=g?.marketValue>0?Number(r.marketValue)/g.marketValue*100:null,pnlClass=typeof r.pnl==='number'&&Number.isFinite(r.pnl)?r.pnl<0?'neg':r.pnl>0?'pos':'':'';return `<article class="broker-card broker-holding"><div class="broker-holding-title"><h3>${brokerText(r.name||r.ticker)}</h3><span>${brokerText(r.ticker)} · ${brokerText(r.currency||'통화 미확인')}</span></div><div class="broker-holding-line"><span>수량 ${brokerNumber(r.quantity)}</span><span>현재 ${brokerAmount(r.currentPrice,r.currency)}</span><span>평균 ${brokerAmount(r.averagePrice,r.currency)}</span></div><div class="broker-holding-line"><b>평가 ${brokerAmount(r.marketValue,r.currency)}</b><b class="${pnlClass}">손익 ${brokerAmount(r.pnl,r.currency)}${typeof r.pnl==='number'&&Number.isFinite(r.pnl)&&r.quantity*r.averagePrice!==0?` (${brokerAmount(r.pnl/(r.quantity*r.averagePrice)*100,'%')})`:''}</b></div><small>통화 내 비중 ${weight===null?'미확인':brokerAmount(weight,'%')}</small></article>`;}).join('')||'<p class="broker-empty">확인된 보유 내역 없음</p>'}</section>`;
 const fillsHTML=()=>{const s=a?.sections?.fills,rows=rowsFor(a,'fills').slice().sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')));const groups=new Map();for(const row of rows){const date=String(row.date||'일자 미확인');if(!groups.has(date))groups.set(date,[]);groups.get(date).push(row);}return `<section class="broker-section" aria-label="${brokerTitles.fills}"><h2>체결내역 <span class="broker-status">${s?.status==='success'?'조회 완료':s?.status==='error'?'조회 실패':'부분 조회'}</span></h2><p class="broker-meta">최근 7개 날짜 · 시간대 미확인 · 원장 자동 반영 없음${s?.paginationComplete!==true?' · 조회 범위 미완료':''}</p>${s?.errorCode?`<p class="broker-warning">오류 코드 ${brokerText(s.errorCode)}</p>`:''}${s?.status==='error'?'<p class="broker-warning">조회 실패 — 체결이 없다고 해석할 수 없습니다.</p>':''}${s?.failedDates?.length?`<p class="broker-warning">조회 실패 날짜: ${s.failedDates.map(brokerText).join(', ')}</p>`:''}${[...groups].map(([date,items])=>`<div class="broker-fill-date"><h3>${brokerText(date)}</h3>${items.map(r=>`<p><b class="${r.side==='buy'?'neg':r.side==='sell'?'pos':''}">${r.side==='buy'?'매수':r.side==='sell'?'매도':'구분 미확인'}</b> · ${brokerText(r.name||r.ticker)} (${brokerText(r.ticker)}) · ${brokerNumber(r.quantity)} × ${brokerAmount(r.price,r.currency)} · ${brokerAmount(r.amount,r.currency)}</p>`).join('')}</div>`).join('')||'<p class="broker-empty">확인된 체결내역 없음</p>'}</section>`;};
 return `<div class="broker-account"><div class="broker-intro"><p class="broker-eyebrow">MERITZ · READ ONLY</p><h1>실계좌</h1>
 <p>API 키 연결 계좌 · ISA 연결 미확인</p><p class="broker-meta">잔고·예수금·체결내역 조회 전용. 원장과 별도로 표시하며 자동 반영하지 않습니다. 이 화면의 조회 결과는 저장·동기화·내보내기에 포함되지 않습니다.</p>
 <button id="btnBrokerRead" type="button" ${state.loading?'disabled aria-busy="true"':''}>${state.loading?'조회 중…':'새로고침'}</button>
 <p class="broker-meta">마지막 조회 ${last} · 60초 자동 갱신</p></div>
 <div role="status" aria-live="polite">${state.error?`<p class="broker-warning">${brokerText(state.error)}</p>`:''}${state.stale?'<p class="broker-warning">이전 조회 결과 · 최신 정보 아님 — 마지막 조회에 실패했습니다.</p>':''}${!a&&!state.loading&&!state.error?'<p class="broker-empty">아직 조회하지 않았습니다.</p>':''}</div>
 ${a?`<div class="broker-summary"><strong>총 자산 · 추정</strong><p class="broker-total">${brokerAmount(summary.totalKRW,'KRW')}</p><p class="broker-meta">평가손익 ${brokerAmount(summary.pnlKRW,'KRW')} · ${brokerAmount(summary.pnlPct,'%')}<br>KRW 주식 ${brokerAmount(summary.currencies.KRW?.marketValue,'KRW')} · 손익 ${brokerAmount(summary.currencies.KRW?.pnl,'KRW')}<br>USD 주식 ${brokerAmount(summary.currencies.USD?.marketValue,'USD')} · 손익 ${brokerAmount(summary.currencies.USD?.pnl,'USD')}<br>적용환율 ${brokerAmount(summary.fxRate,'KRW/USD')} · REST 조회 ${brokerText(a.queriedAt)}<br>기준시각 ${a.observedAt?brokerText(a.observedAt):'미확인'} · 체결 조회기간 ${brokerText(a.period?.from)} ~ ${brokerText(a.period?.to)}<br>예수금 주문가능 ${brokerAmount(summary.depositOrderable,'KRW')} · USD 잔고 ${brokerAmount(summary.usdBalance,'USD')}</p></div>
 <p class="broker-meta">예수금·추정잔고·주문가능금액은 서로 다른 값이며 합산하지 않습니다. 원장 자동 반영 없음.</p>
 ${holdingsHTML}${brokerSectionHTML('deposit',a.sections?.deposit)}${brokerSectionHTML('currencies',a.sections?.currencies)}<p class="broker-meta">체결수량 있는 주문: 주문별 누적 체결수량이며 개별 체결 단위 내역이 아닐 수 있습니다. 시간대는 미확인입니다.</p>${fillsHTML()}`:''}</div>`;
}
export function createBrokerAccountReader({getUrl,getSecret,fetcher=(...args)=>fetch(...args),onChange=()=>{}}){
  let state={snapshot:null,loading:false,stale:false,error:null};
  return {
    getState:()=>state,
    async refresh(){
      if(state.loading)return;
      state={...state,loading:true,error:null};onChange();
      try{
        const url=getUrl(),secret=getSecret();
        if(!url||!secret)throw new Error('configuration');
        const res=await fetcher(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({_action:'broker_read',secret})});
        const data=await res.json();
        const a=data?.brokerAccount,statuses=['success','partial','error'];
        if(!res.ok||data?.success!==true||a?.provider!=='meritz-openapi'||a.readOnly!==true||!statuses.includes(a.status)||!a.period||!a.queriedAt||!Object.keys(brokerTitles).every(key=>{
          const section=a.sections?.[key];
          return section&&statuses.includes(section.status)&&Array.isArray(section.rows)&&typeof section.paginationComplete==='boolean'&&section.rows.every(row=>row&&typeof row==='object');
        }))throw new Error('response');
        state={snapshot:a,loading:false,stale:false,error:null};
      }catch{
        state={...state,loading:false,stale:!!state.snapshot,error:'조회 실패 — 설정 또는 연결을 확인한 뒤 다시 조회해주세요.'};
      }
      onChange();
    }
  };
}
export function createBrokerAccountAutoRead({reader,now=()=>Date.now(),setIntervalFn=(fn,ms)=>setInterval(fn,ms),clearIntervalFn=id=>clearInterval(id),intervalMs=60000}){
 let timer=null,active=false,visible=false;
 const tick=async()=>{if(!active||!visible)return;const current=reader.getState(),at=Date.parse(current.snapshot?.queriedAt||'');if(current.loading)return;if(!current.snapshot||!Number.isFinite(at)||now()-at>intervalMs)await reader.refresh();};
 const update=(isActive,isVisible)=>{active=!!isActive;visible=!!isVisible;if(active&&visible){if(timer===null)timer=setIntervalFn(tick,intervalMs);void tick();}else if(timer!==null){clearIntervalFn(timer);timer=null;}};
 return{update,stop:()=>update(false,false),tick};
}
