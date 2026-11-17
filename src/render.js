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
  // Keep what the user typed, the focus and the scroll position when a background load re-renders
  const keep=captureView();
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
  restoreView(keep);
  bind();
  if(S.tab==="chart")drawChart();
  if(S.tab==="list")drawTrend();
  if(S.tab==="trend")drawTrend();
  if(keep.tab===S.tab&&typeof window!=='undefined')window.scrollTo(0,keep.scrollY);
  // 동기화 메시지는 배너로 자리를 계속 차지하지 않도록 잠시 후 자동으로 사라짐
  // Remove only the banner; a full re-render here made the page flash like a reload
  if(_syncMsgTimer)clearTimeout(_syncMsgTimer);
  if(S.syncMsg){
    _syncMsgTimer=setTimeout(()=>{S.syncMsg="";document.querySelector('.msg-sync')?.remove();},3000);
  }
}

let _lastTab=null;
function captureView(){
  const tab=_lastTab;_lastTab=S.tab;
  if(typeof window==='undefined'||!document.querySelectorAll)return{fields:[],focus:null,scrollY:0,modalScroll:0,tab,modal:S.modal?.type||null};
  // Modal fields only: tab forms are cleared on purpose after a save and must not come back
  const fields=[...document.querySelectorAll('#app .modal-bg input[id],#app .modal-bg textarea[id],#app .modal-bg select[id]')]
    .filter(el=>el.type!=='file')
    .map(el=>({id:el.id,value:el.value,checked:el.checked}));
  const active=document.activeElement;
  const focus=active&&active.id&&active.closest?.('#app')?{id:active.id,start:active.selectionStart,end:active.selectionEnd}:null;
  const modalBody=document.querySelector('#app .modal-bg .modal');
  return{fields,focus,scrollY:window.scrollY,modalScroll:modalBody?modalBody.scrollTop:0,tab,modal:S.modal?.type||null};
}

function restoreView(keep){
  // Only restore inputs while the same modal or tab stays on screen
  if(keep.modal&&keep.modal===(S.modal?.type||null)){
    keep.fields.forEach(f=>{
      const el=document.getElementById(f.id);
      if(!el||el.type==='file')return;
      if(el.type==='checkbox'||el.type==='radio')el.checked=f.checked;
      else if(el.value!==f.value)el.value=f.value;
    });
  }
  const modalBody=document.querySelector?.('#app .modal-bg .modal');
  if(modalBody&&keep.modal&&keep.modal===(S.modal?.type||null))modalBody.scrollTop=keep.modalScroll;
  if(keep.focus&&keep.modal===(S.modal?.type||null)){
    const el=document.getElementById(keep.focus.id);
    if(el){try{el.focus({preventScroll:true});if(keep.focus.start!=null)el.setSelectionRange(keep.focus.start,keep.focus.end);}catch{}}
  }
}
