// ═══════════════════════════════════════════
// 헬퍼 (포맷/계산)
// ═══════════════════════════════════════════
import {S} from './state.js';

export const fK=n=>Math.round(n).toLocaleString("ko-KR");
export const fKShort=n=>{const a=Math.abs(n),s=n<0?'-':'';return a>=100000000?s+'₩'+(a/100000000).toFixed(1)+'억':a>=10000?s+'₩'+Math.round(a/10000)+'만':s+'₩'+fK(a);};
export const fU=n=>n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fP=n=>(n>=0?"+":"")+n.toFixed(2)+"%";
export const fM=(v,c)=>c==="USD"?"$"+fU(v):"₩"+fK(v);
export const evK=s=>(s.curr==="USD"?s.qty*s.cur*S.rate:s.qty*s.cur);
export const totK=list=>list.reduce((a,s)=>a+evK(s),0);
export const filt=()=>S.acct==="전체"?S.stocks:S.stocks.filter(s=>s.acct===S.acct);
export const cashTotKRW=()=>{
  let t=0;
  for(const acct of Object.keys(S.cash)){
    t+=S.cash[acct].USD*S.rate+S.cash[acct].KRW;
  }
  return t;
};
export const filtCashKRW=()=>{
  if(S.acct==="전체")return cashTotKRW();
  const c=S.cash[S.acct]||{USD:0,KRW:0};
  return c.USD*S.rate+c.KRW;
};

export function fmtMktPrice(price,fmt){
  if(price===null||price===undefined||price===0&&fmt!=="pct"&&fmt!=="dec")return"—";
  if(fmt==="num")return Math.round(price).toLocaleString();
  if(fmt==="krw")return Math.round(price).toLocaleString();
  if(fmt==="usd")return"$"+price.toFixed(2);
  if(fmt==="dec")return price.toFixed(2);
  if(fmt==="pct")return price.toFixed(2)+"%";
  return price.toFixed(2);
}
