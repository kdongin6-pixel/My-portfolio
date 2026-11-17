import {periodReturn,buildBase100Series,alignSeries,alpha,deriveSnapshotSeries} from './benchmark-calc.js';

export const BENCHMARK_COLORS={portfolio:'#8a6a2f',SPY:'#77736d',QQQ:'#a39e95',GLD:'#c2bcb2'};
const tickers=['SPY','QQQ','GLD'];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))?value:null;
const points=value=>(Array.isArray(value)?value:[]).filter(p=>p&&date(p.date));
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const figure=value=>{
  const n=number(value);
  return n===null?'<span>—</span>':`<span class="${n>0?'bm-gain':n<0?'bm-loss':''}">${n>0?'+':''}${n.toFixed(2)}%</span>`;
};
const returns=series=>series.length>=2?periodReturn(series[0].close,series[series.length-1].close):null;

export function renderBenchmarkChart(state,payload){
  const snapshots=deriveSnapshotSeries(points(object(state).snapshots)).map(p=>({date:p.date,close:p.value}));
  const benchmark=object(object(payload).benchmark);
  if(snapshots.length<2)return '<p class="bm-empty">비교할 포트폴리오 추적 기록이 부족합니다.</p>';
  const start=snapshots[0].date;
  const series=[{name:'내 포트폴리오',color:BENCHMARK_COLORS.portfolio,points:buildBase100Series(snapshots)}];
  const omitted=[];
  for(const ticker of tickers){
    const aligned=alignSeries(snapshots,points(benchmark[ticker]));
    // A line can share the base only when its first aligned date is the tracking start.
    if(aligned.benchmark.length>=2&&aligned.benchmark[0].date===start)series.push({name:ticker,color:BENCHMARK_COLORS[ticker],points:buildBase100Series(aligned.benchmark)});
    else if(aligned.benchmark.length>=2&&aligned.benchmark[0].date!==start)omitted.push(ticker);
  }
  if(series.length===1)return '<p class="bm-empty">추적 시작일부터 비교할 벤치마크 가격 기록이 없습니다.</p>';
  const all=series.flatMap(s=>s.points),times=all.map(p=>Date.parse(p.date+'T00:00:00Z'));
  const minT=Math.min(...times),maxT=Math.max(...times),minV=Math.min(100,...all.map(p=>p.value)),maxV=Math.max(100,...all.map(p=>p.value));
  const range=maxV-minV||1;
  const lines=series.map(s=>`<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${s.points.map(p=>`${(20+(Date.parse(p.date+'T00:00:00Z')-minT)/(maxT-minT||1)*560).toFixed(1)},${(180-(p.value-minV)/range*160).toFixed(1)}`).join(' ')}"/>`).join('');
  return `<div class="bm-chart"><svg viewBox="0 0 600 200" role="img" aria-label="추적 시작 기준 100 누적 비교 차트"><line x1="20" y1="180" x2="580" y2="180" stroke="#ddd8ce"/>${lines}</svg><div class="bm-axis"><span>추적 시작 ${escape(start)}</span><span>${escape(snapshots[snapshots.length-1].date)}</span></div><div class="bm-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>${omitted.length?`<p class="bm-note">${omitted.join(', ')}: 추적 시작일에 비교 가격이 없어 차트에서 제외했습니다.</p>`:''}</div>`;
}

export function renderBenchmarkView(state,payload){
  const data=object(payload),benchmark=object(data.benchmark),history=object(data.longHistory),statuses=object(data.longHistoryStatus);
  const snapshots=deriveSnapshotSeries(points(object(state).snapshots)).map(p=>({date:p.date,close:p.value}));
  const rows=tickers.map(ticker=>{
    const aligned=alignSeries(snapshots,points(benchmark[ticker]));
    const my=returns(aligned.portfolio),bench=returns(aligned.benchmark),entry=object(history[ticker]);
    const status=typeof data.longHistoryStatus==='string'?data.longHistoryStatus:statuses[ticker];
    const available=status==='ok'&&history[ticker]&&typeof history[ticker]==='object'&&!Array.isArray(history[ticker]);
    const asOf=available&&date(entry.asOf)?escape(entry.asOf):'미확인';
    const note=available?'':`<span class="bm-note">장기 가격 기록을 사용할 수 없습니다.</span>`;
    const period=aligned.portfolio.length>=2?`${escape(aligned.portfolio[0].date)} ~ ${escape(aligned.portfolio[aligned.portfolio.length-1].date)}`:'비교 기간 없음';
    return `<tr><th scope="row">${ticker}<small>${period}</small><small>장기 기준일 ${asOf}</small>${note}</th><td data-label="추적 이후">${figure(bench)}</td><td data-label="내 수익률">${figure(my)}</td><td data-label="알파">${figure(alpha(my,bench))}</td><td data-label="CAGR">${figure(available?entry.cagr:null)}</td><td data-label="1Y">${figure(available?entry.ret1y:null)}</td><td data-label="3Y">${figure(available?entry.ret3y:null)}</td></tr>`;
  }).join('');
  return `<main class="benchmark-view"><header class="bm-header"><p>PORTFOLIO / BENCHMARK</p><h1>벤치마크 비교</h1><p>추적 시작 기준 · 가격 수익률</p></header><div class="bm-layout"><section class="bm-panel"><h2>누적 비교</h2><p>추적 시작을 100으로 환산한 자산 가치와 가격</p>${renderBenchmarkChart(state,payload)}<p class="bm-note">포트폴리오 자산 가치는 입출금과 환율의 영향을 받습니다.</p></section><section class="bm-panel"><h2>기간별 비교</h2><p>가격 수익률 · 각 벤치마크와 겹치는 기간 기준</p><div class="bm-table-wrap"><table class="bm-table"><thead><tr><th>벤치마크</th><th>추적 이후</th><th>내 수익률</th><th>알파</th><th>CAGR</th><th>1Y</th><th>3Y</th></tr></thead><tbody>${rows}</tbody></table></div></section></div></main>`;
}
