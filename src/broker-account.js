// Real-account responses live only in this closure, never in portfolio state.
const brokerEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brokerNumber=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('ko-KR',{maximumFractionDigits:8}):'미확인';
const brokerText=value=>value===null||value===undefined||value===''?'미확인':brokerEscape(value);
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
 return `<div class="broker-account"><div class="broker-intro"><p class="broker-eyebrow">MERITZ · READ ONLY</p><h1>실계좌</h1>
 <p>API 키 연결 계좌 · ISA 연결 미확인</p><p class="broker-meta">잔고·예수금·체결내역 조회 전용. 원장과 별도로 표시하며 자동 반영하지 않습니다. 이 화면의 조회 결과는 저장·동기화·내보내기에 포함되지 않습니다.</p>
 <button id="btnBrokerRead" type="button" ${state.loading?'disabled aria-busy="true"':''}>${state.loading?'조회 중…':'실계좌 조회'}</button>
 <p class="broker-meta">버튼을 눌렀을 때만 조회합니다. 자동 갱신하지 않습니다.</p></div>
 <div role="status" aria-live="polite">${state.error?`<p class="broker-warning">${brokerText(state.error)}</p>`:''}${state.stale?'<p class="broker-warning">이전 조회 결과 · 최신 정보 아님 — 마지막 조회에 실패했습니다.</p>':''}${!a&&!state.loading&&!state.error?'<p class="broker-empty">아직 조회하지 않았습니다.</p>':''}</div>
 ${a?`<div class="broker-summary"><strong>${a.status==='success'?'조회 완료':a.status==='partial'?'부분 조회':'조회 실패'}</strong><p class="broker-meta">출처 ${brokerText(a.provider)} · REST 스냅샷<br>REST 조회시각 ${brokerText(a.queriedAt)}<br>${a.observedAt?'제공 기준시각 '+brokerText(a.observedAt):'기준시각 미확인'}<br>체결 조회기간 ${brokerText(a.period?.from)} ~ ${brokerText(a.period?.to)} (최근 7개 날짜 · 한국 기준)</p></div>
 <p class="broker-meta">예수금·추정잔고·주문가능금액은 서로 다른 값이며 합산하지 않습니다.</p>
 ${Object.keys(brokerTitles).map(key=>(key==='fills'?'<p class="broker-meta">체결수량 있는 주문: 주문별 누적 체결수량이며 개별 체결 단위 내역이 아닐 수 있습니다. 제공시각의 시간대는 미확인입니다. 원장 자동 반영 없음.</p>':'')+brokerSectionHTML(key,a.sections?.[key])).join('')}`:''}</div>`;
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
