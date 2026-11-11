// Read-only presentation contracts. No DOM, storage, network or ledger writes.
const kstFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
// A date without a time is not an instant; keep it as a date, not midnight UTC.
export function displayKst(value,fallback='미확인'){
 if(typeof value!=='string'||!value)return fallback;
 const day=value.slice(0,10),check=new Date(day+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==day)return fallback;
 if(value===day)return value;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return fallback;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return fallback;
 const parts=Object.fromEntries(kstFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 const utc=date.toISOString().slice(0,16).replace('T',' ');
 return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (KST) · 기준 ${utc} (UTC)`;
}
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export const positive=v=>finite(v)&&Number(v)>0;
export const QUOTE_CONFIRM_WINDOW_MS=10*60*1000;
export function quoteInfo(s,now=Date.now()){
 const m=s._quoteMetadata||s;
 const observedAt=m.quoteObservedAt??m.observedAt??null;
 const requestedAt=m.quoteRequestedAt??m.quoteQueriedAt??m.queriedAt??m.requestedAt??null;
 const mode=m.quoteMode||m.mode||'unknown';
 const cached=!!m.cached||/cache|fallback/.test(m.quoteSource||m.source||'');
 const source=m.quoteSource||m.source||'미확인';
 const requestedMs=requestedAt?Date.parse(requestedAt):NaN,ageMs=Number.isFinite(requestedMs)?now-requestedMs:null;
 const meritz=source.startsWith('meritz-openapi');
 return {valid:positive(s.cur),cached,ageMs,confirmed:positive(s.cur)&&!m.failed&&meritz&&ageMs!==null&&ageMs>=0&&ageMs<=QUOTE_CONFIRM_WINDOW_MS,source,observedAt,requestedAt,session:m.quoteSession||m.session||'unknown',mode,reason:m.reason||m.error||null};
}
export function valuation(stocks,rate,now){
 const rows=stocks.filter(s=>positive(s.qty)).map(s=>{
  const quote=quoteInfo(s,now),fx=s.curr==='KRW'?1:s.curr==='USD'&&positive(rate)?Number(rate):null;
  const valueKRW=quote.valid&&fx!==null&&finite(s.qty)?Number(s.qty)*Number(s.cur)*fx:null;
  const costKRW=fx!==null&&finite(s.qty)&&finite(s.avg)?Number(s.qty)*Number(s.avg)*fx:null;
  return {s,quote,valueKRW,costKRW,pnlKRW:valueKRW!==null&&costKRW!==null?valueKRW-costKRW:null};
 });
 return {rows,valueKRW:rows.reduce((a,r)=>a+(r.valueKRW??0),0),covered:rows.filter(r=>r.valueKRW!==null).length,confirmed:rows.filter(r=>r.valueKRW!==null&&r.quote.confirmed).length,total:rows.length};
}
export function portfolioStatus(s,configured,now){
 const v=valuation(s.stocks||[],s.rate,now);
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
   s._quoteMetadata={quoteSource:incoming.quoteSource||incoming.source||(positive(yd?.price)?'yahoo':'미확인'),quoteObservedAt:incoming.quoteObservedAt??incoming.observedAt??null,quoteRequestedAt:incoming.quoteRequestedAt??incoming.quoteQueriedAt??incoming.queriedAt??null,quoteSession:incoming.quoteSession||'unknown',quoteMode:incoming.quoteMode||'unknown',cached:!!quality?.cached||/cache|fallback/.test(incoming.quoteSource||'')};
   if(item?.ticker)s.ticker=item.ticker;
  }else{
   // Missing quotes do not mutate prior evidence; time-window expiry alone downgrades it.
  }
 }
}
