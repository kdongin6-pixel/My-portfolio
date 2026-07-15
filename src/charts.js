// ═══════════════════════════════════════════
// 차트 (도넛 / 트리맵 / 추이) — Chart.js는 CDN 전역
// ═══════════════════════════════════════════
import {S} from './state.js';
import {fK,fP,evK,totK,filt} from './helpers.js';
import {STOCK_PALETTE} from './constants.js';

let _chartInstances=[];
export function destroyCharts(){_chartInstances.forEach(c=>{try{c.destroy();}catch(e){}});_chartInstances=[];}

function squarify(items,x0,y0,x1,y1){
  const out=[];
  function lay(nodes,x0,y0,x1,y1){
    if(!nodes.length)return;
    if(nodes.length===1){out.push({...nodes[0],x:x0,y:y0,w:x1-x0,h:y1-y0});return;}
    const W=x1-x0,H=y1-y0,horiz=W>=H,short=horiz?H:W;
    const total=nodes.reduce((s,n)=>s+n.v,0);
    let row=[],rowV=0,prev=Infinity,split=0;
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i],nv=rowV+n.v;
      const rLen=(horiz?W:H)*nv/total;
      let worst=0;
      [...row,n].forEach(m=>{const cl=short*m.v/nv;worst=Math.max(worst,Math.max(rLen/cl,cl/rLen));});
      if(worst<=prev){row.push(n);rowV=nv;prev=worst;split=i+1;}
      else break;
    }
    const rLen=(horiz?W:H)*rowV/total;
    let off=horiz?y0:x0;
    row.forEach(n=>{
      const cl=short*n.v/rowV;
      if(horiz){out.push({...n,x:x0,y:off,w:rLen,h:cl});off+=cl;}
      else{out.push({...n,x:off,y:y0,w:cl,h:rLen});off+=cl;}
    });
    const rest=nodes.slice(split);
    if(rest.length){if(horiz)lay(rest,x0+rLen,y0,x1,y1);else lay(rest,x0,y0+rLen,x1,y1);}
  }
  lay(items,x0,y0,x1,y1);
  return out;
}

function drawTreemap(fl,tot){
  let items;
  if(S.wMode==="tag"){
    const m={},mc={};
    fl.forEach((s,i)=>{const t=s.tag||"기타";m[t]=(m[t]||0)+evK(s);if(!mc[t])mc[t]=S.tagColors[t]||STOCK_PALETTE[Object.keys(m).length%STOCK_PALETTE.length];});
    items=Object.entries(m).map(([name,v])=>({name,v,color:mc[name]}));
  }else{
    items=fl.map((s,i)=>({name:s.name,ticker:(s.ticker&&s.curr==="USD")?s.ticker:null,v:evK(s),color:STOCK_PALETTE[i%STOCK_PALETTE.length]}));
  }
  items=items.filter(i=>i.v>0).sort((a,b)=>b.v-a.v);
  if(!items.length)return;
  const W=400,H=300;
  const rects=squarify(items,0,0,W,H);
  const container=document.getElementById("treemap-container");
  if(!container)return;
  rects.forEach(r=>{
    const pct=tot>0?r.v/tot*100:0;
    const cell=document.createElement("div");
    cell.className="treemap-cell";
    cell.style.cssText=`left:${(r.x/W*100).toFixed(3)}%;top:${(r.y/H*100).toFixed(3)}%;width:${(r.w/W*100).toFixed(3)}%;height:${(r.h/H*100).toFixed(3)}%;background:${r.color}`;
    const minDim=Math.min(r.w/W*100,r.h/H*100);
    cell.title=r.name;
    if(minDim>6){
      const fs=Math.max(0.55,Math.min(0.9,minDim/12));
      const nm=r.ticker||r.name.slice(0,minDim>12?10:7)+(r.name.length>(minDim>12?10:7)?'…':'');
      cell.innerHTML=`<div class="tm-name" style="font-size:${fs}em">${nm}</div><div class="tm-pct" style="font-size:${(fs*0.88).toFixed(2)}em">${pct.toFixed(1)}%</div>`;
    }
    container.appendChild(cell);
  });
}

export function drawChart(){
  const fl=filt(),tot=totK(fl);
  if(S.chartView==="treemap"){drawTreemap(fl,tot);return;}
  let labels=[],vals=[],colors=[];
  if(S.wMode==="stock"){
    fl.forEach((s,i)=>{labels.push(s.name);vals.push(evK(s));colors.push(STOCK_PALETTE[i%STOCK_PALETTE.length]);});
  }else{
    const m={};fl.forEach(s=>{const t=s.tag||"기타";m[t]=(m[t]||0)+evK(s);});
    Object.entries(m).forEach(([t,v])=>{labels.push(t);vals.push(v);colors.push(S.tagColors[t]||"#94a3b8");});
  }
  const ctx=document.getElementById("donut");
  if(!ctx||!labels.length)return;
  const ch=new Chart(ctx,{type:"doughnut",data:{labels,datasets:[{data:vals,backgroundColor:colors.map(c=>c+"99"),borderColor:colors,borderWidth:2}]},
    options:{cutout:"65%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`₩${fK(c.parsed)} (${(c.parsed/tot*100).toFixed(1)}%)`}}}}});
  _chartInstances.push(ch);
  const lg=document.getElementById("legend");
  labels.forEach((l,i)=>{
    const el=document.createElement("div");el.className="legend-item";
    el.innerHTML=`<div class="l-dot" style="background:${colors[i]}"></div><div class="l-name">${l}</div><div class="l-pct">${(tot>0?vals[i]/tot*100:0).toFixed(1)}%</div>`;
    lg.appendChild(el);
  });
}

export function drawTrend(){
  let labels,totals,pcts;

  if(S.trendPeriod==="1D"){
    const cutoff24=new Date();cutoff24.setDate(cutoff24.getDate()-1);
    const intra=(S.intradaySnaps||[]).filter(s=>new Date(s.dt)>=cutoff24);
    if(intra.length<2)return;
    labels=intra.map(s=>{const t=new Date(s.dt);return t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0');});
    totals=intra.map(s=>s.totalKRW);
    pcts=intra.map(s=>s.pct);
  }else{
    const now=new Date();
    let cutoff=new Date(0);
    if(S.trendPeriod==="1W"){cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-7);}
    else if(S.trendPeriod==="1M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-1);}
    else if(S.trendPeriod==="3M"){cutoff=new Date(now);cutoff.setMonth(cutoff.getMonth()-3);}
    else if(S.trendPeriod==="1Y"){cutoff=new Date(now);cutoff.setFullYear(cutoff.getFullYear()-1);}
    const cutoffStr=cutoff.toISOString().slice(0,10);
    const data=S.snapshots.filter(s=>s.date>=cutoffStr);
    if(!data.length)return;
    labels=data.map(s=>s.date.slice(5));
    totals=data.map(s=>s.totalKRW);
    pcts=data.map(s=>s.pct);
  }

  const ctx1=document.getElementById("trendTotal");
  if(ctx1){
    const _c1=new Chart(ctx1,{type:"line",data:{labels,datasets:[{
      label:"총자산",data:totals,borderColor:"#a5b4fc",backgroundColor:"rgba(99,102,241,.15)",
      fill:true,tension:.3,pointRadius:totals.length<=14?3:0,pointHoverRadius:5,borderWidth:2
    }]},options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`₩${fK(c.parsed.y)}`}}},
      scales:{
        x:{ticks:{color:"#8b949e",maxTicksLimit:6,font:{size:10}},grid:{color:"rgba(48,54,61,.5)"}},
        y:{ticks:{color:"#8b949e",font:{size:10},callback:v=>"₩"+(v/1000000).toFixed(0)+"M"},grid:{color:"rgba(48,54,61,.5)"}}
      }
    }});
    _chartInstances.push(_c1);
  }

  const ctx2=document.getElementById("trendPct");
  if(ctx2){
    const _c2=new Chart(ctx2,{type:"line",data:{labels,datasets:[{
      label:"수익률",data:pcts,
      borderColor:ctx=>{const v=ctx.parsed?.y;return v>=0?"#10b981":"#f43f5e";},
      segment:{borderColor:c=>(c.p1.parsed.y>=0?"#10b981":"#f43f5e")},
      backgroundColor:"rgba(16,185,129,.1)",
      fill:{target:"origin",above:"rgba(16,185,129,.15)",below:"rgba(244,63,94,.15)"},
      tension:.3,pointRadius:totals.length<=14?3:0,pointHoverRadius:5,borderWidth:2
    }]},options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fP(c.parsed.y)}}},
      scales:{
        x:{ticks:{color:"#8b949e",maxTicksLimit:6,font:{size:10}},grid:{color:"rgba(48,54,61,.5)"}},
        y:{ticks:{color:"#8b949e",font:{size:10},callback:v=>v.toFixed(1)+"%"},grid:{color:"rgba(48,54,61,.5)"}}
      }
    }});
    _chartInstances.push(_c2);
  }
}
