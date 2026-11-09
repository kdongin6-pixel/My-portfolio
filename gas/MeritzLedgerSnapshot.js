// Pure planner. Never calls broker, sheet, storage, network or orders.
function planMeritzLedgerSnapshot_(state,broker){
 const fail=error=>({success:false,error});
 if(!state||!Array.isArray(state.stocks)||!state.cash||!state.cash['메리츠증권']||!broker||!broker.sections||!Number.isFinite(Date.parse(broker.queriedAt)))return fail('invalid_snapshot');
 const sections=broker.sections;
 for(const key of ['domesticHoldings','overseasHoldings','deposit','currencies'])if(!sections[key]||sections[key].status!=='success'||sections[key].paginationComplete!==true||!Array.isArray(sections[key].rows))return fail('incomplete_snapshot');
 const brokerRows=sections.domesticHoldings.rows.concat(sections.overseasHoldings.rows), active=state.stocks.filter(s=>s.acct==='메리츠증권'&&Number(s.qty)>0);
 const map=new Map(),existing=new Set();
 for(const row of brokerRows){if(!row||typeof row.ticker!=='string'||!row.ticker||map.has(row.ticker)||!['USD','KRW'].includes(row.currency)||!Number.isFinite(row.quantity)||row.quantity<=0||!Number.isFinite(row.averagePrice)||row.averagePrice<=0||!Number.isFinite(row.currentPrice)||row.currentPrice<=0)return fail('invalid_holdings');map.set(row.ticker,row);}
 for(const row of active){if(!row.ticker||existing.has(row.ticker))return fail('ambiguous_ledger');existing.add(row.ticker);if(map.has(row.ticker)&&map.get(row.ticker).currency!==row.curr)return fail('currency_mismatch');}
 // Refuse missing/new tickers for now: never create or erase a position from a partial or ambiguous snapshot.
 if(map.size!==existing.size||[...map.keys()].some(k=>!existing.has(k)))return fail('holding_set_changed');
 const deposits=sections.deposit.rows.filter(r=>r&&r.currency==='KRW'), currencies=sections.currencies.rows.filter(r=>r&&r.currency==='USD');
 if(deposits.length!==1||currencies.length!==1||!Number.isFinite(deposits[0].balance)||!Number.isFinite(currencies[0].balance))return fail('cash_unverified');
 const next=JSON.parse(JSON.stringify(state));
 next.stocks=next.stocks.map(s=>{if(s.acct!=='메리츠증권'||!(Number(s.qty)>0))return s;const row=map.get(s.ticker);if(row.currency!==s.curr)throw new Error('currency_mismatch');return Object.assign({},s,{qty:row.quantity,avg:row.averagePrice,cur:row.currentPrice});});
 next.cash['메리츠증권'].KRW=deposits[0].balance;next.cash['메리츠증권'].USD=currencies[0].balance;
 return {success:true,state:next};
}
