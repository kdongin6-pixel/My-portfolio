// ═══════════════════════════════════════════
// 이벤트 바인딩
// ═══════════════════════════════════════════
import {S,save,setApiUrl} from './state.js';
import {fM} from './helpers.js';
import {syncSheets,loadMarketData} from './cloud.js';
import {execTrade,undoTrade,execCash,undoCashTxn,execJournal,delJournal} from './trades.js';
import {getAnthropicKey,setAnthropicKey,setShotFiles,getShotFiles,clearShotFiles,parseScreenshots,applyParsed} from './vision.js';
import {render} from './render.js';

export function bind(){
  const q=s=>document.querySelector(s);
  const qa=s=>document.querySelectorAll(s);
  const close=()=>{S.modal=null;render();};

  q("#btnTrend")?.addEventListener("click",()=>{S.tab="trend";render();});
  q("#btnMktEtf")?.addEventListener("click",()=>{S.mktEtfTab="etf";render();});
  q("#btnMktTheme")?.addEventListener("click",()=>{S.mktEtfTab="theme";render();});
  q("#btnMktSector")?.addEventListener("click",()=>{S.mktEtfTab="sector";render();});
  q("#btnSync")?.addEventListener("click",syncSheets);
  q("#btnSettings")?.addEventListener("click",()=>{S.modal={type:"settings"};render();});
  q("#saveApiUrl")?.addEventListener("click",()=>{
    const url=q("#apiUrlInp")?.value?.trim();
    if(!url)return alert("URL을 입력해주세요");
    setApiUrl(url);
    const akey=q("#anthropicKeyInp")?.value?.trim();
    if(akey!==undefined)setAnthropicKey(akey);
    S.syncMsg="✅ 설정 저장 완료 — 동기화 버튼을 눌러 연결을 확인해보세요";
    S.modal=null;render();
  });
  q("#btnAdd")?.addEventListener("click",()=>{S.modal={type:"add",defaultAcct:S.acct!=='전체'?S.acct:'메리츠증권'};render();});
  // Auto-switch currency when account changes in add/edit modal
  q("#aa")?.addEventListener("change",e=>{
    const ac=q("#ac");if(!ac)return;
    if(e.target.value==='ISA')ac.value='KRW';
    else if(e.target.value==='메리츠증권')ac.value='USD';
  });
  // 📷 매매 스크린샷 인식
  q("#btnShot")?.addEventListener("click",()=>{clearShotFiles();S.modal={type:"screenshot"};render();});
  q("#shotFiles")?.addEventListener("change",e=>{
    setShotFiles(e.target.files);
    const c=q("#shotCount");
    if(c)c.textContent=e.target.files.length?`✅ ${e.target.files.length}장 선택됨`:'';
  });
  q("#execShotAnalyze")?.addEventListener("click",async()=>{
    const keyInp=q("#shotKeyInp");
    if(keyInp&&keyInp.value.trim())setAnthropicKey(keyInp.value.trim());
    const st=q("#shotStatus"),btn=q("#execShotAnalyze");
    if(!getAnthropicKey()){if(st)st.textContent="⚠️ API 키를 입력해주세요";return;}
    if(!getShotFiles().length){if(st)st.textContent="⚠️ 스크린샷을 먼저 선택해주세요";return;}
    btn.disabled=true;btn.textContent="⏳ Claude가 분석 중... (10~30초)";
    try{
      const parsed=await parseScreenshots(getShotFiles());
      S.modal={type:"screenshotConfirm",parsed};
      render();
    }catch(e){
      if(st)st.textContent="❌ "+e.message;
      btn.disabled=false;btn.textContent="🔍 분석하기";
    }
  });
  q("#execShotApply")?.addEventListener("click",()=>{
    const items=(S.modal?.parsed||[]).filter((t,i)=>{
      const cb=q(`[data-shot-idx="${i}"]`);
      return cb&&cb.checked;
    });
    if(!items.length)return alert("반영할 거래를 체크해주세요");
    const n=applyParsed(items);
    clearShotFiles();
    S.syncMsg=`✅ 스크린샷에서 ${n}건 반영 완료 (${new Date().toLocaleTimeString()})`;
    S.modal=null;render();
  });
  q("#shotBack")?.addEventListener("click",()=>{S.modal={type:"screenshot"};render();});

  q("#btnCashToggle")?.addEventListener("click",()=>{S.showCash=!S.showCash;render();});
  q("#btnTrendToggle")?.addEventListener("click",()=>{S.showTrend=!S.showTrend;render();});
  q("#mc")?.addEventListener("click",close);
  q("#mc2")?.addEventListener("click",close);
  q("#mbg")?.addEventListener("click",e=>{if(e.target===q("#mbg"))close();});
  q("#rateInp")?.addEventListener("change",e=>{S.rate=parseFloat(e.target.value)||1510;save();render();});

  qa(".flt[data-acct]").forEach(el=>el.addEventListener("click",()=>{S.acct=el.dataset.acct;render();}));
  qa("[data-goto-market]").forEach(el=>el.addEventListener("click",()=>{S.tab="market";render();loadMarketData();}));
  qa(".tab[data-tab]").forEach(el=>el.addEventListener("click",()=>{
    S.tab=el.dataset.tab;render();
    if(el.dataset.tab==="market")loadMarketData();
  }));
  q("#btnMktRefresh")?.addEventListener("click",()=>loadMarketData(true));
  if(S.tab==="market"&&!S.marketData&&!S.marketLoading)setTimeout(loadMarketData,50);
  qa(".flt[data-wmode]").forEach(el=>el.addEventListener("click",()=>{S.wMode=el.dataset.wmode;render();}));
  qa("[data-cview]").forEach(el=>el.addEventListener("click",()=>{S.chartView=el.dataset.cview;render();}));
  qa("[data-sort]").forEach(el=>el.addEventListener("click",()=>{
    if(S.sortBy===el.dataset.sort)S.sortDir=S.sortDir==="desc"?"asc":"desc";
    else{S.sortBy=el.dataset.sort;S.sortDir="desc";}
    render();
  }));
  q("#btnView")?.addEventListener("click",()=>{S.viewMode=S.viewMode==="table"?"card":"table";render();});
  qa("[data-action]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();
    S.modal={type:"stockAction",stockId:+b.dataset.action};render();
  }));
  q("#actBuy")?.addEventListener("click",()=>{const id=S.modal.stockId;S.modal={type:"trade",stockId:id,mode:"buy"};render();});
  q("#actSell")?.addEventListener("click",()=>{const id=S.modal.stockId;S.modal={type:"trade",stockId:id,mode:"sell"};render();});
  q("#actEdit")?.addEventListener("click",()=>{const id=S.modal.stockId;S.modal={type:"edit",stockId:id};render();});
  q("#actDel")?.addEventListener("click",()=>{
    const s=S.stocks.find(x=>x.id===S.modal.stockId);
    if(s&&confirm(`'${s.name}' 삭제할까요?`)){S.stocks=S.stocks.filter(x=>x.id!==s.id);save();S.modal=null;render();}
  });
  q("#actPrice")?.addEventListener("change",e=>{
    const s=S.stocks.find(x=>x.id===S.modal?.stockId);
    if(s){s.cur=parseFloat(e.target.value)||s.cur;save();render();}
  });
  qa(".flt[data-period]").forEach(el=>el.addEventListener("click",()=>{S.trendPeriod=el.dataset.period;render();}));
  qa(".flt[data-jfilt]").forEach(el=>el.addEventListener("click",()=>{S.jFilter=el.dataset.jfilt;render();}));

  q("#btnAddJournal")?.addEventListener("click",()=>{S.modal={type:"addJournal"};render();});
  qa("[data-jdel]").forEach(b=>b.addEventListener("click",()=>delJournal(+b.dataset.jdel)));

  qa(".cur-inp").forEach(inp=>inp.addEventListener("change",e=>{
    const s=S.stocks.find(x=>x.id===+e.target.dataset.id);
    if(s){s.cur=parseFloat(e.target.value)||s.cur;save();render();}
  }));

  qa(".cbtn-buy,.cbtn-sell").forEach(b=>b.addEventListener("click",()=>{
    S.modal={type:"trade",stockId:+b.dataset.id,mode:b.dataset.mode};render();
  }));

  qa("[data-del]").forEach(b=>b.addEventListener("click",()=>{
    const s=S.stocks.find(x=>x.id===+b.dataset.del);
    if(s&&confirm(`'${s.name}' 삭제할까요?`)){S.stocks=S.stocks.filter(x=>x.id!==+b.dataset.del);save();render();}
  }));

  qa("[data-edit]").forEach(b=>b.addEventListener("click",()=>{
    S.modal={type:"edit",stockId:+b.dataset.edit};render();
  }));

  qa("[data-edit-tag]").forEach(el=>el.addEventListener("click",()=>{
    S.modal={type:"editTag",stockId:+el.dataset.editTag};render();
  }));

  qa("[data-pick-tag]").forEach(b=>b.addEventListener("click",()=>{
    const s=S.stocks.find(x=>x.id===S.modal.stockId);
    if(s){s.tag=b.dataset.pickTag;save();render();}
  }));

  q("#addTagBtn")?.addEventListener("click",()=>{
    const name=q("#newTagName").value.trim();
    const color=q("#newTagColor").value;
    if(!name)return alert("태그 이름 입력");
    if(S.tags.includes(name))return alert("이미 존재하는 태그");
    S.tags.push(name);
    S.tagColors[name]=color;
    save();render();
  });

  qa("[data-del-tag]").forEach(b=>b.addEventListener("click",()=>{
    const t=b.dataset.delTag;
    const used=S.stocks.filter(s=>s.tag===t).length;
    let msg=`'${t}' 태그 삭제할까요?`;
    if(used>0)msg+=`\n(${used}개 종목이 이 태그를 쓰고 있어요. 태그가 비워집니다)`;
    if(!confirm(msg))return;
    S.tags=S.tags.filter(x=>x!==t);
    delete S.tagColors[t];
    S.stocks.forEach(s=>{if(s.tag===t)s.tag="";});
    save();render();
  }));

  qa("[data-cash-in]").forEach(b=>b.addEventListener("click",()=>{
    S.modal={type:"cashIn",target:b.dataset.cashIn};render();
  }));
  qa("[data-cash-out]").forEach(b=>b.addEventListener("click",()=>{
    S.modal={type:"cashOut",target:b.dataset.cashOut};render();
  }));

  qa("[data-txn-undo]").forEach(b=>b.addEventListener("click",()=>undoTrade(+b.dataset.txnUndo)));
  qa("[data-cash-undo]").forEach(b=>b.addEventListener("click",()=>undoCashTxn(+b.dataset.cashUndo)));

  // 거래 미리보기
  const upPrev=()=>{
    const q2=parseFloat(q("#tq")?.value||0),p=parseFloat(q("#tp")?.value||0);
    const s=S.stocks.find(x=>x.id===S.modal?.stockId),prev=q("#tprev");
    if(!prev||!s||!q2||!p)return;
    const c=S.cash[s.acct]?.[s.curr]||0;
    if(S.modal.mode==="buy"){
      const na=(s.qty*s.avg+q2*p)/(s.qty+q2);
      const cost=q2*p;
      prev.innerHTML=`<div><span>새 평균단가</span><span>${fM(na,s.curr)}</span></div>
        <div><span>새 수량</span><span>${s.qty+q2}</span></div>
        <div><span>매수금액</span><span>${fM(cost,s.curr)}</span></div>
        <div><span>거래 후 현금</span><span class="${c-cost<0?'neg':''}">${fM(c-cost,s.curr)}</span></div>`;
    }else{
      const pnl=(p-s.avg)*q2;
      const cost=q2*p;
      prev.innerHTML=`<div><span>실현손익</span><span class="${pnl>=0?'pos':'neg'}">${fM(pnl,s.curr)}</span></div>
        <div><span>남은수량</span><span>${s.qty-q2}</span></div>
        <div><span>거래 후 현금</span><span>${fM(c+cost,s.curr)}</span></div>`;
    }
  };
  q("#tq")?.addEventListener("input",upPrev);
  q("#tp")?.addEventListener("input",upPrev);

  // 모달 안의 실행 버튼들 (💡 여기에 티커 전송 로직이 완벽하게 포함됨!)
  q("#exec")?.addEventListener("click",()=>{
    const mt=S.modal?.type; // exec 도중 S.modal이 null로 바뀌어도 안전하게
    if(mt==="trade")execTrade(S.modal.stockId,S.modal.mode,q("#tq").value,q("#tp").value);

    if(mt==="add"||mt==="edit"){
      const name=q("#an").value.trim();
      if(!name)return alert("종목명 입력");

      const data={
        name,
        acct:q("#aa").value,
        curr:q("#ac").value,
        qty:parseFloat(q("#aq").value)||0,
        avg:parseFloat(q("#aavg").value)||0,
        cur:parseFloat(q("#acur").value)||0,
        tag:q("#at").value,
        ticker:q("#aticker")?.value.trim()||"" // 💡 티커를 무조건 저장합니다
      };

      if(mt==="edit"){
        const s=S.stocks.find(x=>x.id===S.modal.stockId);
        if(s)Object.assign(s,data);
      }else{
        data.id=Math.max(0,...S.stocks.map(s=>s.id))+1;
        S.stocks.push(data);
      }
      save();S.modal=null;render();
    }

    if(mt==="cashIn"||mt==="cashOut"){
      const [acct,curr]=S.modal.target.split("|");
      execCash(acct,curr,mt==="cashIn"?"in":"out",q("#cashAmt").value,q("#cashMemo").value);
    }

    if(mt==="addJournal"){
      execJournal(q("#jstock").value,q("#jcat").value,q("#jcontent").value);
    }
  });
}
