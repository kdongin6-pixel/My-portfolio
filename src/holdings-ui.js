import {quoteInfo,valuation,portfolioStatus,positive} from './portfolio-read.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'미확인':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:4});
const money=(v,c)=>`${num(v)} ${esc(c)}`;
const modes={unknown:'유형 미확인',cache:'이전 시세 · 캐시',stale:'이전 시세',delayed:'지연 시세',realtime:'실시간 요청값 (스트리밍 아님)',close:'종가'};
const sessions={unknown:'시장구간 미확인',regular:'정규장',pre:'장전',post:'장후',closed:'휴장'};
export function provenance(s){const q=quoteInfo(s),minutes=q.ageMs===null?null:Math.max(0,Math.floor(q.ageMs/60000));const freshness=q.cached?(q.confirmed?`${minutes}분 전 확인 시세`:`이전 시세 · ${minutes??'미확인'}분 전`):((modes[q.mode]||q.mode));return `<div class="quote-provenance">출처 ${esc(q.source)} · ${esc(freshness)} · ${esc(sessions[q.session]||q.session)}<br>${q.observedAt?'관측 '+esc(q.observedAt):'거래시각 미제공'} · 조회 ${esc(q.requestedAt||'미확인')}${q.reason?'<br>'+esc(q.reason):''}</div>`;}
export function dataNotice(state,configured){
 const p=portfolioStatus(state,configured),labels={unconnected:'미연결 — 설정에서 원장 연결을 확인하세요',pending:'아직 조회하지 않음 — 잔고 0원이 아닙니다',loading:'불러오는 중 — 이전 자료는 아래 유지합니다',error:'조회 실패 — 이전 자료만 표시합니다',partial:'부분성공 — 미확인 가격을 정상 합계로 계산하지 않습니다',empty:'확인된 빈 원장 — 보유종목 없음 (현금 별도)',success:'원장 조회 완료'};
 return `<div class="data-notice" role="status"><b>${labels[p.state]}</b><br>시세 ${p.confirmed}/${p.total} 확인 · 평가 가능 ${p.covered}/${p.total} (이전 시세 포함)${p.confirmed<p.total?'<br>미확인: '+esc(p.rows.filter(r=>!r.quote.confirmed||r.valueKRW===null).map(r=>r.s.ticker||r.s.name).join(', ')):''}<br>원장 갱신 ${esc(state.updatedAt||'미확인')} · 환율 ${num(state.rate)} KRW/USD · ${state.rateAsOf?'기준 '+esc(state.rateAsOf):'기준시각 미확인 · 추정 환율'}</div>`;
}
function metrics(state,s,list){
 const v=valuation(list,state.rate),r=valuation([s],state.rate).rows[0],complete=v.confirmed===v.total&&v.covered===v.total;
 const pnl=r.quote.valid?Number(s.qty)*(Number(s.cur)-Number(s.avg)):null;
 const pct=pnl!==null&&positive(s.avg)?pnl/(Number(s.qty)*Number(s.avg))*100:null;
 const items=[['보유수량',num(s.qty)+' 주'],['원장 평단',money(s.avg,s.curr)],['조회가격',r.quote.valid?money(s.cur,s.curr):'가격 미확인'],['평가금액',r.quote.valid?money(Number(s.qty)*Number(s.cur),s.curr):'미확인'],['원가 대비 평가손익',money(pnl,s.curr)+(pct===null?'':` (${num(pct)}%)`)],['주식 내 비중',complete&&v.valueKRW>0?num(r.valueKRW/v.valueKRW*100)+'%':'미확인 · 전체시세 필요']];
 return `<dl class="holding-metrics">${items.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
export function holdingCards(state,list){return `<div class="holding-cards">${list.filter(s=>positive(s.qty)).map(s=>`<article class="holding-card"><button class="holding-title" data-detail="${esc(s.id)}">${esc(s.ticker||s.name)} · ${esc(s.name)} <span aria-hidden="true">↗</span></button><div class="holding-tags">${esc(s.acct)} · ${esc(s.curr)} · ${esc(s.tag||'태그 없음')}</div>${metrics(state,s,list)}${provenance(s)}</article>`).join('')||'<div class="empty">보유행 없음 — 위 연결·조회 상태를 확인하세요.</div>'}</div>`;}
export function priceHistoryPanel(state,s){
 const points=(s.priceHistory||state.priceHistory?.[s.ticker]||[]).filter(p=>p&&positive(p.price)&&/^\d{4}-\d{2}-\d{2}/.test(p.date)&&Number.isFinite(Date.parse(p.date))).map(p=>({...p,price:Number(p.price)})).sort((a,b)=>a.date.localeCompare(b.date));
 const source=s.priceHistorySource||state.priceHistorySource||null;
 const txns=(state.txns||[]).filter(t=>(t.ticker?t.ticker===s.ticker:t.name===s.name)&&t.acct===s.acct);
 const events=[...(state.events||[]).filter(e=>e.ticker===s.ticker),...(state.journal||[]).filter(j=>j.stockName===s.name).map(j=>({...j,title:j.content,source:'사용자 일지',user:true}))];
 let chart='<p class="analysis-empty">가격 이력 없음 — 종목 가격 차트는 수집된 가격 이력만 사용합니다. 자산 스냅샷으로 대체하지 않습니다.</p>';
 if(points.length>=2&&source){
  const dates=points.map(p=>Date.parse(p.date)),minD=Math.min(...dates),span=Math.max(...dates)-minD||1,min=Math.min(...points.map(p=>p.price)),range=Math.max(...points.map(p=>p.price))-min||1;
  const x=d=>20+(Date.parse(d)-minD)/span*280,y=p=>110-(p-min)/range*90;
  const marks=txns.filter(t=>Date.parse(t.date)>=minD&&Date.parse(t.date)<=minD+span).map(t=>{const p=points.reduce((a,b)=>Math.abs(Date.parse(a.date)-Date.parse(t.date))<Math.abs(Date.parse(b.date)-Date.parse(t.date))?a:b);return `<circle data-trade="${esc(t.mode)}" cx="${x(t.date)}" cy="${y(p.price)}" r="4" fill="${t.mode==='buy'?'#f87171':'#60a5fa'}" stroke="#161b22" stroke-width="1"><title>${esc('원장 '+(t.mode==='buy'?'매수':'매도')+' '+t.date)}</title></circle>`;}).join('');
  chart=`<svg class="price-history" viewBox="0 0 320 130" role="img" aria-label="종목 가격 이력과 원장 기록 표시"><polyline points="${points.map(p=>x(p.date)+','+y(p.price)).join(' ')}" fill="none" stroke="#818cf8" stroke-width="2"/>${marks}</svg><div class="trade-legend" role="group" aria-label="매매 표시 범례"><span class="trade-key buy"><span aria-hidden="true">●</span> 매수 (빨강)</span><span class="trade-key sell"><span aria-hidden="true">●</span> 매도 (파랑)</span></div><p>${esc(points[0].date)} ~ ${esc(points.at(-1).date)} · ${esc(s.curr)} · 출처 ${esc(source)}</p>`;
 }
 return `<section class="detail-history"><h3>종목 가격 · 원장 기록 · 이벤트</h3>${chart}<p class="quote-provenance">수정주가·배당·분할·장전/장후 포함 여부 미확인. 아래 원장 기록은 사용자 기록이며 실제 주문·체결 조회가 아닙니다.</p><ul>${txns.map(t=>`<li>${esc(t.date)} · 원장 ${t.mode==='buy'?'매수':'매도'} · ${num(t.qty)}주 × ${money(t.price,s.curr)}</li>`).join('')||'<li>해당 종목의 원장 기록 없음</li>'}${events.map(e=>`<li>${esc(e.date||'일자 미확인')} · ${e.user?'사용자 이벤트':'공식 여부 '+(e.source&&e.asOf?'출처 확인 필요':'미확인')} · ${esc(e.title)} · 출처 ${esc(e.source||'미확인')} · 기준 ${esc(e.asOf||'미확인')}</li>`).join('')}</ul></section>`;
}
export function holdingDetail(state,s){return `<div class="modal holding-detail" role="dialog" aria-modal="true" aria-labelledby="holdingDetailTitle" tabindex="-1"><div class="modal-title"><span id="holdingDetailTitle">${esc(s.ticker)} · ${esc(s.name)}</span><button class="modal-close" id="mc" aria-label="닫기">×</button></div><p>${esc(s.acct)} · ${esc(s.curr)} · ${esc(s.tag||'태그 없음')}</p>${metrics(state,s,state.stocks)}${provenance(s)}<p class="quote-provenance">평가손익은 평단 대비이며 일등락과 다릅니다. KRW 환산은 현재 환율의 참고값이며 취득환율 미확인으로 환차손익을 분리하지 않습니다.</p>${priceHistoryPanel(state,s)}<p class="data-notice">증권사 잔고·예수금·체결내역: 실계좌 탭에서 별도 조회<br>원장 자동 대조·반영 없음 · 주문·환전 기능 없음</p><div class="ledger-actions"><button class="mbtn mbtn-sec" id="actBuy">매수 원장 기록</button><button class="mbtn mbtn-sec" id="actSell">매도 원장 기록</button><button class="mbtn mbtn-sec" id="actEdit">원장 정보 수정</button></div><button class="mbtn mbtn-sec" id="mc2">닫기</button></div>`;}
export function marketImpact(state,market){
 const tags=[...new Set((state.stocks||[]).map(s=>s.tag).filter(Boolean))];
 const relevant=[{key:'USDKRW',label:'달러/원',why:'USD 보유분의 원화 환산 평가에 영향을 줄 수 있습니다.'},{key:'T10Y',label:'미국 장기금리',why:'성장주·장기 현금흐름의 할인율 민감도를 점검합니다.'},{key:'T2Y',label:'미국 단기금리',why:'정책금리 기대와 현금 기회비용의 참고 지표입니다.'},{key:'SPX',label:'S&P500',why:'주식시장 전반과 내 보유 움직임을 비교합니다.'},{key:'IXIC',label:'나스닥',why:'기술·성장 노출의 시장 맥락을 확인합니다.'}];
 return `<section class="market-impact"><h3>내 보유에 중요한 시장 맥락</h3><p>사용자 보유 태그: ${esc(tags.join(' · ')||'없음')}</p>${relevant.map(r=>{const m=market.find(m=>m.key===r.key);return `<article><b>${r.label} · ${num(m?.price)}</b><p>${r.why}</p><small>출처 ${esc(m?.source||m?.quoteSource||'미확인')} · ${m?.asOf||m?.quoteObservedAt?'기준 '+esc(m.asOf||m.quoteObservedAt):'기준시각 미확인'} · 다음 발표 ${esc(m?.nextRelease||'미확인')}</small></article>`;}).join('')}<p class="quote-provenance">교육용 관계 설명입니다. 인과 확정이나 자동매매 신호가 아닙니다. 지수는 개별 종목 가격이 아니며 조회시각은 지표 기준시각이 아닙니다.</p></section>`;
}
