// ═══════════════════════════════════════════
// 렌더
// ═══════════════════════════════════════════
import {S} from './state.js';
import {destroyCharts,drawChart,drawTrend} from './charts.js';
import {mkHdr,mkTabs,mkList,mkChart,mkTrend,mkAnalysis,mkJournal,mkTxn,mkModal} from './views.js';
import {mkMarket} from './market-ui.js';
import {mkBrokerAccount} from './broker-account-ui.js';
import {renderBenchmarkView} from './benchmark-ui.js';
import {bind} from './bind.js';

let _syncMsgTimer=null;

export function render(){
  destroyCharts();
  const app=document.getElementById("app");
  app.innerHTML="";
  if(S.tab==="cash")S.tab="list";
  app.appendChild(mkHdr());
  if(S.tab==="list")app.appendChild(mkList());
  if(S.tab==="broker")app.appendChild(mkBrokerAccount());
  if(S.tab==="chart")app.appendChild(mkChart());
  if(S.tab==="trend")app.appendChild(mkTrend());
  if(S.tab==="analysis")app.appendChild(mkAnalysis());
  if(S.tab==="market")app.appendChild(mkMarket());
  if(S.tab==="journal")app.appendChild(mkJournal());
  if(S.tab==="txn")app.appendChild(mkTxn());
  if(S.tab==="benchmark"){
    const view=document.createElement('div');
    view.innerHTML=renderBenchmarkView(S,S);
    app.appendChild(view);
  }
  const tabs=mkTabs();
  tabs.querySelector?.('.drawer-nav')?.insertAdjacentHTML('beforeend',`<button type="button" class="tab ${S.tab==='benchmark'?'on':''}" data-tab="benchmark" ${S.tab==='benchmark'?'aria-current="page"':''}><svg class="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18V6M4 18h16M7 14l4-4 3 2 5-6"/></svg> 벤치마크</button>`);
  app.appendChild(tabs); // 하단 고정 탭바
  if(S.modal)app.appendChild(mkModal());
  bind();
  if(S.tab==="chart")drawChart();
  if(S.tab==="list")drawTrend();
  if(S.tab==="trend")drawTrend();
  // 동기화 메시지는 배너로 자리를 계속 차지하지 않도록 잠시 후 자동으로 사라짐
  if(_syncMsgTimer)clearTimeout(_syncMsgTimer);
  if(S.syncMsg){
    _syncMsgTimer=setTimeout(()=>{S.syncMsg="";render();},3000);
  }
}
