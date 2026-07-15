// ═══════════════════════════════════════════
// 렌더
// ═══════════════════════════════════════════
import {S} from './state.js';
import {destroyCharts,drawChart,drawTrend} from './charts.js';
import {mkHdr,mkTabs,mkList,mkChart,mkTrend,mkJournal,mkTxn,mkModal} from './views.js';
import {mkMarket} from './market-ui.js';
import {bind} from './bind.js';

export function render(){
  destroyCharts();
  const app=document.getElementById("app");
  app.innerHTML="";
  if(S.tab==="cash")S.tab="list";
  app.appendChild(mkHdr());
  app.appendChild(mkTabs());
  if(S.tab==="list")app.appendChild(mkList());
  if(S.tab==="chart")app.appendChild(mkChart());
  if(S.tab==="trend")app.appendChild(mkTrend());
  if(S.tab==="market")app.appendChild(mkMarket());
  if(S.tab==="journal")app.appendChild(mkJournal());
  if(S.tab==="txn")app.appendChild(mkTxn());
  if(S.modal)app.appendChild(mkModal());
  bind();
  if(S.tab==="chart")drawChart();
  if(S.tab==="list"&&S.showTrend)drawTrend();
  if(S.tab==="trend")drawTrend();
}
