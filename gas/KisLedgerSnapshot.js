// Pure ISA snapshot plan; no write, network, credentials or historical trade synthesis.
function planKisLedgerSnapshot_(state,snapshot){
 const fail=error=>({success:false,error});
 if(!state||!Array.isArray(state.stocks)||!state.cash||!state.cash.ISA||!snapshot||snapshot.status!=='success'||snapshot.paginationComplete!==true||!Number.isFinite(Date.parse(snapshot.queriedAt))||!Array.isArray(snapshot.rows)||!Array.isArray(snapshot.zeroTickers))return fail('snapshot_invalid');
 if(!snapshot.cash||snapshot.cash.currency!=='KRW'||!Number.isFinite(snapshot.cash.balance)||snapshot.cash.balance<0)return fail('cash_invalid');
 if(!Number.isFinite(snapshot.cash.nextSettlement)||snapshot.cash.nextSettlement!==snapshot.cash.balance)return fail('settlement_not_reconciled');
 const active=state.stocks.filter(x=>x.acct==='ISA'&&Number(x.qty)>0), existing=new Map(),broker=new Map();
 for(const r of active){if(!r.ticker||existing.has(r.ticker)||r.curr!=='KRW')return fail('ambiguous_ledger');existing.set(r.ticker,r);}
 for(const r of snapshot.rows){if(!r||typeof r.ticker!=='string'||broker.has(r.ticker)||r.currency!=='KRW'||!Number.isFinite(r.quantity)||r.quantity<=0||!Number.isFinite(r.averagePrice)||r.averagePrice<=0||!Number.isFinite(r.currentPrice)||r.currentPrice<=0)return fail('invalid_broker_holding');broker.set(r.ticker,r);}
 for(const ticker of snapshot.zeroTickers){if(typeof ticker!=='string'||broker.has(ticker))return fail('duplicate_zero_ticker');broker.set(ticker,null);}
 // Do not infer sold holdings or create new positions when the set cannot be verified.
 if([...existing.keys()].some(k=>!broker.has(k))||[...broker.keys()].some(k=>!existing.has(k)))return fail('holding_set_changed');
 const next=JSON.parse(JSON.stringify(state));next.stocks=next.stocks.map(r=>{if(r.acct!=='ISA'||!(Number(r.qty)>0))return r;const b=broker.get(r.ticker);return b?Object.assign({},r,{qty:b.quantity,avg:b.averagePrice,cur:b.currentPrice}):Object.assign({},r,{qty:0});});next.cash.ISA.KRW=snapshot.cash.balance;
 return {success:true,state:next};
}

// Pure, fail-closed reconciliation proposal. It is not a persistence endpoint.
function planKisReconciliation_(state,snapshot,fills){
 const fail=error=>({success:false,error});
 if(!state||!Array.isArray(state.txns)||!fills||fills.complete!==true||!Array.isArray(fills.rows))return fail('fills_incomplete');
 if(!snapshot||!snapshot.cash||!Number.isSafeInteger(snapshot.cash.provisionalSettlement)||snapshot.cash.provisionalSettlement<0)return fail('settlement_invalid');
 const seen=new Set();
 for(const f of fills.rows){
  if(!f||typeof f.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(f.id)||seen.has(f.id)||typeof f.ticker!=='string'||!/^[A-Za-z0-9]{6}$/.test(f.ticker)||!/^\d{4}-\d{2}-\d{2}$/.test(f.date)||!Number.isFinite(Date.parse(f.date))||!['buy','sell'].includes(f.mode)||!Number.isSafeInteger(f.quantity)||f.quantity<=0||!Number.isSafeInteger(f.totalAmount)||f.totalAmount<=0)return fail('fill_invalid');
  seen.add(f.id);
 }
 // Legacy history has no authoritative broker identifier: never guess it is distinct.
 if(state.txns.some(t=>t.acct==='ISA'&&!t.kisFillId))return fail('legacy_history_requires_reconciliation');
 const ids=new Set();
 for(const t of state.txns.filter(t=>t.acct==='ISA')){
  if(ids.has(t.kisFillId))return fail('duplicate_existing_fill');ids.add(t.kisFillId);
  const f=fills.rows.find(x=>x.id===t.kisFillId);
  if(f&&(t.ticker!==f.ticker||t.mode!==f.mode||t.qty!==f.quantity||t.totalAmount!==f.totalAmount||t.date!==f.date))return fail('fill_conflict');
 }
 const compatible=JSON.parse(JSON.stringify(snapshot));compatible.cash.nextSettlement=compatible.cash.balance;
 const plan=planKisLedgerSnapshot_(state,compatible);if(!plan.success)return plan;
 // Newly imported fills must explain every quantity change, including explicit zeros.
 for(const stock of state.stocks.filter(s=>s.acct==='ISA'&&Number(s.qty)>0)){
  const delta=fills.rows.filter(f=>f.ticker===stock.ticker&&!ids.has(f.id)).reduce((n,f)=>n+(f.mode==='buy'?f.quantity:-f.quantity),0);
  const broker=snapshot.rows.find(r=>r.ticker===stock.ticker);
  const quantity=broker?broker.quantity:(snapshot.zeroTickers.includes(stock.ticker)?0:null);
  if(!Number.isSafeInteger(Number(stock.qty))||quantity===null||Number(stock.qty)+delta!==quantity)return fail('quantity_not_reconciled');
 }
 const next=plan.state;
 for(const f of fills.rows){
  if(ids.has(f.id))continue;
  const matches=next.stocks.filter(s=>s.acct==='ISA'&&s.ticker===f.ticker);
  if(matches.length!==1)return fail('fill_holding_ambiguous');
  const stock=matches[0];
  next.txns.unshift({id:'kis:'+f.id,kisFillId:f.id,stockId:stock.id,name:stock.name,ticker:f.ticker,acct:'ISA',curr:'KRW',mode:f.mode,qty:f.quantity,price:f.totalAmount/f.quantity,totalAmount:f.totalAmount,date:f.date,brokerImported:true});
 }
 next.kisIsaSettlement={amount:snapshot.cash.provisionalSettlement,currency:'KRW',queriedAt:snapshot.queriedAt};
 return {success:true,state:next};
}
