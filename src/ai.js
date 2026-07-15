// ═══════════════════════════════════════════
// 🤖 AI 분석용 포트폴리오 요약
// ═══════════════════════════════════════════
import {S} from './state.js';
import {fK,fU,fP,fM,evK,cashTotKRW} from './helpers.js';

export function buildAISummary(){
  const today=new Date().toLocaleDateString("ko-KR");
  const stockKRW=S.stocks.reduce((a,s)=>a+evK(s),0);
  const cashKRW=cashTotKRW();
  const totalKRW=stockKRW+cashKRW;
  const inv=S.stocks.reduce((a,s)=>a+(s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg),0);
  const pnl=stockKRW-inv;
  const pct=inv>0?pnl/inv*100:0;

  const lines=[];
  lines.push(`📊 포트폴리오 분석 요청 (${today})`);
  lines.push(`환율: ${fK(S.rate)} KRW/USD`);
  lines.push(``);
  lines.push(`=== 총 자산 현황 ===`);
  lines.push(`총 자산:   ₩${fK(totalKRW)}`);
  lines.push(`주식 평가: ₩${fK(stockKRW)}`);
  lines.push(`보유 현금: ₩${fK(cashKRW)}`);
  lines.push(`투자 원금: ₩${fK(inv)}`);
  lines.push(`평가 손익: ${pnl>=0?'+':''}₩${fK(pnl)} (${fP(pct)})`);
  lines.push(``);
  lines.push(`=== 계좌별 현금 ===`);
  for(const acct of Object.keys(S.cash)){
    const c=S.cash[acct];
    const tot=(c.USD||0)*S.rate+(c.KRW||0);
    lines.push(`${acct}: USD $${fU(c.USD||0)} + KRW ₩${fK(c.KRW||0)} → ₩${fK(tot)}`);
  }
  lines.push(``);
  lines.push(`=== 종목 현황 (${S.stocks.length}개) ===`);
  const sorted=[...S.stocks].sort((a,b)=>evK(b)-evK(a));
  for(const s of sorted){
    const ev=evK(s);
    const sp=inv>0?ev/totalKRW*100:0;
    const sInv=s.curr==="USD"?s.qty*s.avg*S.rate:s.qty*s.avg;
    const sPnl=ev-sInv;
    const sPct=sInv>0?sPnl/sInv*100:0;
    lines.push(`${s.name} (${s.ticker||'-'}) [${s.acct}/${s.curr}]`);
    lines.push(`  수량:${s.qty} 평단:${fM(s.avg,s.curr)} 현재:${fM(s.cur,s.curr)} 평가:₩${fK(ev)} 비중:${sp.toFixed(1)}% 수익:${fP(sPct)}${s.tag?` [${s.tag}]`:''}`);
  }
  lines.push(``);
  lines.push(`=== 최근 거래 (최대 10건) ===`);
  const recent=S.txns.slice(0,10);
  if(recent.length===0){lines.push(`없음`);}
  else for(const t of recent){
    lines.push(`${t.date} ${t.mode==='buy'?'매수':'매도'} ${t.name} ${t.qty}주 @${fM(t.price,t.curr)}${t.pnl?` 손익:${t.pnl>=0?'+':''}₩${fK(t.curr==="USD"?t.pnl*S.rate:t.pnl)}`:''}`);
  }
  lines.push(``);
  lines.push(`=== 최근 스냅샷 추이 (최대 10일) ===`);
  const snaps=S.snapshots.slice(-10);
  if(snaps.length===0){lines.push(`없음`);}
  else for(const sn of snaps){
    lines.push(`${sn.date} 총:₩${fK(sn.totalKRW)} 수익:${fP(sn.pct)}`);
  }
  if(S.journal&&S.journal.length>0){
    lines.push(``);
    lines.push(`=== 투자 일지 (최근 5건) ===`);
    for(const j of S.journal.slice(0,5)){
      lines.push(`${j.date} [${j.category}] ${j.title}: ${j.body||''}`);
    }
  }
  lines.push(``);
  lines.push(`위 포트폴리오를 분석해주세요. 리스크, 집중도, 종목별 의견, 개선 제안을 부탁드립니다.`);
  return lines.join('\n');
}
