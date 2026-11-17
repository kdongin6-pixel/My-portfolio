// Pure presentation helpers. Rows are supplied by the existing valuation adapter.
export function filterHoldings(rows,query='',account='전체'){
 const needle=query.trim().toLocaleLowerCase('ko-KR');
 return rows.filter(({s})=>(account==='전체'||s.acct===account)&&(!needle||[s.name,s.ticker,s.acct].some(v=>String(v||'').toLocaleLowerCase('ko-KR').includes(needle))));
}
export function returnPercent(row){return row.pnlKRW!==null&&row.costKRW>0?row.pnlKRW/row.costKRW*100:null;}
export function toggleSort(current,key){return {key,direction:current.key===key&&current.direction==='asc'?'desc':'asc'};}
export function sortHoldings(rows,key='value',direction='desc'){
 const value=r=>key==='name'?r.s.name||'':key==='account'?r.s.acct||'':key==='return'?returnPercent(r):r.valueKRW;
 return [...rows].sort((a,b)=>{const x=value(a),y=value(b);if(x==null||y==null)return x==null?(y==null?0:1):-1;const cmp=typeof x==='string'?x.localeCompare(y,'ko-KR'):x-y;return direction==='asc'?cmp:-cmp;});
}
export function topGainLoss(rows){
 const eligible=rows.filter(r=>r.quote.confirmed&&returnPercent(r)!==null);
 return {gains:sortHoldings(eligible.filter(r=>returnPercent(r)>0),'return','desc').slice(0,4),losses:sortHoldings(eligible.filter(r=>returnPercent(r)<0),'return','asc').slice(0,4)};
}
