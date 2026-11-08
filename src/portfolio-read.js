// Read-only presentation contracts. No DOM, storage, network or ledger writes.
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export const positive=v=>finite(v)&&Number(v)>0;
export function quoteInfo(s){
 const m=s._quoteMetadata||s;
 const observedAt=m.quoteObservedAt??m.observedAt??null;
 const requestedAt=m.quoteRequestedAt??m.quoteQueriedAt??m.queriedAt??m.requestedAt??null;
 const mode=m.quoteMode||m.mode||'unknown';
 const cached=!!m.cached||/cache|fallback/.test(m.quoteSource||m.source||'');
 const source=m.quoteSource||m.source||'미확인';
 return {valid:positive(s.cur),cached,confirmed:positive(s.cur)&&!['미확인','unknown','sheet'].includes(source)&&!m.failed&&!cached&&mode!=='cache'&&mode!=='stale',source,observedAt,requestedAt,session:m.quoteSession||m.session||'unknown',mode,reason:m.reason||m.error||null};
}
export function valuation(stocks,rate){
 const rows=stocks.filter(s=>positive(s.qty)).map(s=>{
  const quote=quoteInfo(s),fx=s.curr==='KRW'?1:s.curr==='USD'&&positive(rate)?Number(rate):null;
  const valueKRW=quote.valid&&fx!==null&&finite(s.qty)?Number(s.qty)*Number(s.cur)*fx:null;
  const costKRW=fx!==null&&finite(s.qty)&&finite(s.avg)?Number(s.qty)*Number(s.avg)*fx:null;
  return {s,quote,valueKRW,costKRW,pnlKRW:valueKRW!==null&&costKRW!==null?valueKRW-costKRW:null};
 });
 return {rows,valueKRW:rows.reduce((a,r)=>a+(r.valueKRW??0),0),covered:rows.filter(r=>r.valueKRW!==null).length,confirmed:rows.filter(r=>r.valueKRW!==null&&r.quote.confirmed).length,total:rows.length};
}
export function portfolioStatus(s,configured){
 const v=valuation(s.stocks||[],s.rate);
 const state=s.readStatus==='loading'?'loading':s.readStatus==='error'?'error':!configured?'unconnected':s.readStatus!=='success'?'pending':v.total===0?'empty':v.confirmed<v.total?'partial':'success';
 return {...v,state};
}
export function applyQuoteResponse(state,data,queriedAt){
 state.quoteQuality=data.quoteQuality??null;
 if(data.priceHistory && typeof data.priceHistory==='object' && !Array.isArray(data.priceHistory)){
  state.priceHistory=data.priceHistory;
  state.priceHistorySource=typeof data.priceHistorySource==='string'?data.priceHistorySource:null;
 }
 for(const s of state.stocks){
  const list=s.acct==='ISA'?data.isa:data.meritz;
  const item=(list||[]).find(x=>x.name===s.name);
  const yd=s.ticker&&!/^\d/.test(s.ticker)?data.yahooData?.[s.ticker]:null;
  const useYahoo=!positive(item?.cur)&&positive(yd?.price);
  const quality=Array.isArray(data.quoteQuality)?data.quoteQuality.find(q=>q.ticker===s.ticker&&q.account===s.acct):null;
  const incoming=useYahoo?yd:(item?._quoteMetadata||item||{});
  const price=positive(item?.cur)?item.cur:positive(yd?.price)?yd.price:null;
  if(price!==null){
   s.cur=Number(price);
   s._quoteMetadata={quoteSource:incoming.quoteSource||incoming.source||(positive(yd?.price)?'yahoo':'미확인'),quoteObservedAt:incoming.quoteObservedAt??incoming.observedAt??null,quoteRequestedAt:incoming.quoteRequestedAt??incoming.quoteQueriedAt??incoming.queriedAt??queriedAt,quoteSession:incoming.quoteSession||'unknown',quoteMode:incoming.quoteMode||'unknown',cached:!!quality?.cached||/cache|fallback/.test(incoming.quoteSource||'')};
   if(item?.ticker)s.ticker=item.ticker;
  }else{
   const previous=quoteInfo(s);
   s._quoteMetadata={quoteSource:previous.source,quoteObservedAt:previous.observedAt,quoteRequestedAt:queriedAt,quoteSession:previous.session,quoteMode:previous.valid?'cache':'unknown',failed:true,reason:'조회가격 미확인 — 이전 값 유지'};
  }
 }
}
