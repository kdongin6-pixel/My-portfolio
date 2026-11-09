// Portfolio cash valuation; ISA broker settlement replaces, never adds to, deposit.
export function valuationCashKRW(state,account){
 if(!state||!state.cash||!Number.isFinite(state.rate)||state.rate<=0)throw new Error('invalid_cash_state');
 const accounts=account==='전체'?Object.keys(state.cash):[account];let total=0;
 for(const name of accounts){const cash=state.cash[name];if(!cash||!Number.isFinite(cash.USD)||!Number.isFinite(cash.KRW))throw new Error('invalid_cash_state');let krw=cash.KRW;
  if(name==='ISA'&&state.kisIsaSettlement!=null){const p=state.kisIsaSettlement;if(p.currency!=='KRW'||!Number.isSafeInteger(p.amount)||p.amount<0||!Number.isFinite(Date.parse(p.queriedAt)))throw new Error('invalid_settlement');krw=p.amount;}
  total+=cash.USD*state.rate+krw;
 }
 return total;
}
