// ═══════════════════════════════════════════
// 거래 / 현금 입출금 / 일지
// ═══════════════════════════════════════════
import {S,save} from './state.js';
import {fM} from './helpers.js';
import {render} from './render.js';

export function execTrade(id,mode,qty,price,fee){
  const s=S.stocks.find(x=>x.id===id);
  const q=parseFloat(qty),p=parseFloat(price);
  const f=Math.max(0,parseFloat(fee)||0);
  if(!s||isNaN(q)||isNaN(p)||q<=0||p<=0)return alert("수량/가격 확인");
  const cost=q*p;
  const oldQty=s.qty,oldAvg=s.avg;
  let pnl=0,cashChange=0;

  if(!S.cash[s.acct])S.cash[s.acct]={USD:0,KRW:0};

  if(mode==="buy"){
    const totalCost=cost+f;
    if(S.cash[s.acct][s.curr]<totalCost){
      if(!confirm(`현금 부족! 현재 ${fM(S.cash[s.acct][s.curr],s.curr)}\n그래도 진행할까요?`))return;
    }
    const curQty=Number(s.qty)||0,curAvg=Number(s.avg)||0;
    const tot=curQty*curAvg+totalCost;
    s.qty=curQty+q;
    s.avg=s.qty>0?tot/s.qty:0;
    S.cash[s.acct][s.curr]-=totalCost;
    cashChange=-totalCost;
  }else{
    if(q>s.qty)return alert("보유수량 초과");
    pnl=(p-s.avg)*q-f;
    s.qty-=q;
    S.cash[s.acct][s.curr]+=cost-f;
    cashChange=cost-f;
  }

  S.txns.unshift({
    id:Date.now(),stockId:id,name:s.name,acct:s.acct,curr:s.curr,
    mode,qty:q,price:p,fee:f,pnl,cashChange,
    prevQty:oldQty,prevAvg:oldAvg,
    date:new Date().toLocaleDateString("ko-KR"),
    time:new Date().toLocaleTimeString("ko-KR")
  });
  save();S.modal=null;render();
}

export function undoTrade(txnId){
  const t=S.txns.find(x=>x.id===txnId);
  if(!t)return;
  if(!confirm(`'${t.name}' ${t.mode==='buy'?'매수':'매도'} ${t.qty}주를 취소할까요?\n거래 기록이 완전히 삭제됩니다.`))return;

  const s=S.stocks.find(x=>x.id===t.stockId);
  if(s){
    const pq=Number(t.prevQty),pa=Number(t.prevAvg);
    if(!isNaN(pq)&&!isNaN(pa)){
      s.qty=pq;
      s.avg=pa;
    }else{
      alert("이 거래는 평단가 복원 정보가 없어요.\n거래 기록만 삭제합니다.");
    }
  }
  if(!S.cash[t.acct])S.cash[t.acct]={USD:0,KRW:0};
  const cc=Number(t.cashChange);
  if(!isNaN(cc))S.cash[t.acct][t.curr]-=cc;

  S.txns=S.txns.filter(x=>x.id!==txnId);
  save();render();
}

export function execCash(acct,curr,mode,amount,memo){
  const a=parseFloat(amount);
  if(isNaN(a)||a<=0)return alert("금액 확인");
  if(!S.cash[acct])S.cash[acct]={USD:0,KRW:0};
  if(mode==="out"&&S.cash[acct][curr]<a){
    if(!confirm(`현금 부족! 현재 ${fM(S.cash[acct][curr],curr)}\n그래도 진행할까요?`))return;
  }

  S.cash[acct][curr]+=mode==="in"?a:-a;
  S.cashTxns.unshift({
    id:Date.now(),acct,curr,mode,amount:a,memo:memo||"",
    date:new Date().toLocaleDateString("ko-KR"),
    time:new Date().toLocaleTimeString("ko-KR")
  });
  save();S.modal=null;render();
}

export function undoCashTxn(txnId){
  const t=S.cashTxns.find(x=>x.id===txnId);
  if(!t||!confirm(`${t.mode==='in'?'입금':'출금'} ${fM(t.amount,t.curr)} 취소할까요?`))return;
  if(!S.cash[t.acct])S.cash[t.acct]={USD:0,KRW:0};
  S.cash[t.acct][t.curr]+=t.mode==="in"?-t.amount:t.amount;
  S.cashTxns=S.cashTxns.filter(x=>x.id!==txnId);
  save();render();
}

export function execJournal(stockId,category,content){
  if(!content||!content.trim())return alert("내용 입력");
  const stock=stockId?S.stocks.find(x=>x.id===+stockId):null;
  S.journal.unshift({
    id:Date.now(),
    stockId:stockId||null,
    stockName:stock?.name||"",
    category:category||"thought",
    content:content.trim(),
    date:new Date().toLocaleDateString("ko-KR"),
    time:new Date().toLocaleTimeString("ko-KR",{hour:'2-digit',minute:'2-digit'})
  });
  save();S.modal=null;render();
}

export function delJournal(id){
  const j=S.journal.find(x=>x.id===id);
  if(!j||!confirm("이 일지를 삭제할까요?"))return;
  S.journal=S.journal.filter(x=>x.id!==id);
  save();render();
}
