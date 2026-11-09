import {valuation,positive} from './portfolio-read.js';
// Explicit schema: do not serialize the state, transactions, account numbers or provider internals.
const account=a=>a==='ISA'?'ISA':a==='메리츠증권'?'메리츠증권':'기타 원장';
const provider=s=>['meritz-openapi','meritz-openapi-cache','sheet-fallback','yahoo','googlefinance','naver'].includes(s)?s:'미확인';
const cell=v=>{let s=v===null||v===undefined?'':String(v);if(/^[\s]*[=+\-@]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export function analysisExport(state,acct='전체'){
 const stocks=(state.stocks||[]).filter(s=>acct==='전체'||s.acct===acct),v=valuation(stocks,state.rate);
 const complete=v.covered===v.total&&v.confirmed===v.total;
 const rows=v.rows.map(r=>({kind:'holding',account:account(r.s.acct),ticker:r.s.ticker||'',name:r.s.name||'',qty:r.s.qty,avg:r.s.avg,price:r.quote.valid?Number(r.s.cur):null,currency:r.s.curr,valueKRW:r.valueKRW,pnlKRW:r.pnlKRW,weight:complete&&v.valueKRW>0?r.valueKRW/v.valueKRW*100:null,cash:null,source:provider(r.quote.source),observedAt:r.quote.observedAt,queriedAt:r.quote.requestedAt,session:r.quote.session,mode:r.quote.mode}));
 for(const [a,cash] of Object.entries(state.cash||{})){
  if(acct!=='전체'&&a!==acct)continue;
  for(const currency of ['KRW','USD'])if(Number.isFinite(Number(cash[currency]))){const amount=Number(cash[currency]);const settlement=a==='ISA'&&currency==='KRW'&&state.kisIsaSettlement!=null;rows.push({kind:'cash',account:account(a),currency,cash:amount,valueKRW:settlement?null:currency==='KRW'?amount:positive(state.rate)?amount*state.rate:null,source:settlement?'결제 예수금 · 평가 제외':'사용자 원장',observedAt:state.updatedAt||null});if(settlement){const p=state.kisIsaSettlement;if(p.currency!=='KRW'||!Number.isSafeInteger(p.amount)||p.amount<0||!Number.isFinite(Date.parse(p.queriedAt)))throw new Error('invalid_settlement');rows.push({kind:'cash',account:account(a),currency:'KRW',cash:p.amount,valueKRW:p.amount,source:'D+2 추정 예수금 · 평가 반영',observedAt:p.queriedAt});}}
 }
 const note=`분석용 잔고 · 원장 ${state.updatedAt||'기준시각 미확인'} · 시세 ${v.confirmed}/${v.total} 확인 · 평가 가능 ${v.covered}/${v.total}${complete?'':' · 부분 합계 (미확인 제외)'} · 비중은 주식 평가액 기준\n환율 ${state.rate||'미확인'} KRW/USD · ${state.rateAsOf?'기준 '+state.rateAsOf:'추정 환율 (기준시각 미확인)'}\n증권사-원장 대조: 계좌조회 별도 승인·미연결 (현재 시세 only)\n`;
 const fields=['kind','account','ticker','name','qty','avg','price','currency','valueKRW','pnlKRW','weight','cash','source','observedAt','queriedAt','session','mode'];
 const csv='\uFEFF'+[fields.map(cell).join(','),...rows.map(r=>fields.map(k=>cell(r[k])).join(',')),fields.map(k=>cell(k==='kind'?'coverage':k==='name'?note:k==='source'?'사용자 원장':null)).join(',')].join('\r\n');
 const text=note+rows.map(r=>r.kind==='cash'?`${r.account} | 현금 ${r.cash} ${r.currency} | ${r.source}`:`${r.account} | ${r.ticker} ${r.name} | 수량 ${r.qty} | 평단 ${r.avg} ${r.currency} | 조회가격 ${r.price??'미확인'} ${r.currency} | 평가 ${r.valueKRW??'미확인'} KRW | 원가대비 손익 ${r.pnlKRW??'미확인'} KRW | 비중 ${r.weight===null?'미확인':r.weight.toFixed(2)+'%'} | ${r.source} | 관측 ${r.observedAt||'미제공'} | 조회 ${r.queriedAt||'미확인'} | ${r.session} / ${r.mode}`).join('\n');
 return {rows,text,csv,note};
}
