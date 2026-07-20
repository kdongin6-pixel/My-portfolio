// ═══════════════════════════════════════════
// 렌더
// ═══════════════════════════════════════════
import {S} from './state.js';
import {destroyCharts,drawChart,drawTrend} from './charts.js';
import {mkHdr,mkTabs,mkList,mkChart,mkTrend,mkJournal,mkTxn,mkModal} from './views.js';
import {mkMarket} from './market-ui.js';
import {bind} from './bind.js';

let _syncMsgTimer=null;

export function render(){
  destroyCharts();
  const app=document.getElementById("app");
  app.innerHTML="";
  if(S.tab==="cash")S.tab="list";
  app.appendChild(mkHdr());
  if(S.tab==="list")app.appendChild(mkList());
  if(S.tab==="chart")app.appendChild(mkChart());
  if(S.tab==="trend")app.appendChild(mkTrend());
  if(S.tab==="market")app.appendChild(mkMarket());
  if(S.tab==="journal")app.appendChild(mkJournal());
  if(S.tab==="txn")app.appendChild(mkTxn());
  app.appendChild(mkTabs()); // 하단 고정 탭바
  if(S.modal)app.appendChild(mkModal());
  bind();
  if(S.tab==="chart")drawChart();
  if(S.tab==="list"&&S.showTrend)drawTrend();
  if(S.tab==="trend")drawTrend();
  // 동기화 메시지는 배너로 자리를 계속 차지하지 않도록 잠시 후 자동으로 사라짐
  if(_syncMsgTimer)clearTimeout(_syncMsgTimer);
  if(S.syncMsg){
    _syncMsgTimer=setTimeout(()=>{S.syncMsg="";render();},3000);
  }
}
