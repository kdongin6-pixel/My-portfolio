import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterHoldings,sortHoldings,toggleSort,topGainLoss,returnPercent} from '../src/holdings-table.js';
const row=(name,account,pct,confirmed=true)=>({s:{name,ticker:name,acct:account},valueKRW:100+pct,costKRW:100,pnlKRW:pct,quote:{confirmed}});
const rows=[row('다','ISA',10),row('가','메리츠증권',-20),row('나','ISA',10),row('라','ISA',0)];
test('filter supports account, case-insensitive search, empty and no match',()=>{
 assert.deepEqual(filterHoldings([],''),[]);assert.deepEqual(filterHoldings(rows,'나','ISA'),[rows[2]]);assert.deepEqual(filterHoldings(rows,'없는 종목'),[]);assert.equal(filterHoldings([row('ABC','ISA',1)],'abc').length,1);
});
test('sorting is stable for ties, respects direction and never mutates input',()=>{
 const copy=[...rows];assert.deepEqual(sortHoldings(rows,'value','desc'),[rows[0],rows[2],rows[3],rows[1]]);assert.deepEqual(sortHoldings(rows,'return','asc'),[rows[1],rows[3],rows[0],rows[2]]);assert.equal(sortHoldings(rows,'name','asc')[0],rows[1]);assert.equal(sortHoldings(rows,'account','asc')[0],rows[1]);assert.deepEqual(rows,copy);assert.deepEqual(sortHoldings([]),[]);
});
test('direction toggle changes direction on same column and resets for another',()=>{
 assert.deepEqual(toggleSort({key:'name',direction:'asc'},'name'),{key:'name',direction:'desc'});assert.deepEqual(toggleSort({key:'name',direction:'desc'},'value'),{key:'value',direction:'asc'});
});
test('top lists select four confirmed gains and losses in order and ignore zero and unavailable',()=>{
 const data=[...Array.from({length:6},(_,i)=>row('g'+i,'ISA',i+1)),...Array.from({length:6},(_,i)=>row('l'+i,'ISA',-i-1)),row('zero','ISA',0),row('unconfirmed','ISA',90,false)];
 const top=topGainLoss(data);assert.deepEqual(top.gains.map(r=>r.s.name),['g5','g4','g3','g2']);assert.deepEqual(top.losses.map(r=>r.s.name),['l5','l4','l3','l2']);assert.deepEqual(topGainLoss([]),{gains:[],losses:[]});assert.equal(returnPercent({...data[0],costKRW:0}),null);
});
test('dashboard renders controls, confirmed data and escaped names without changing ledger',async()=>{
 globalThis.localStorage={getItem:()=>null};globalThis.document={createElement:()=>({innerHTML:'',className:''})};
 const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
 const {S}=await import('../src/state.js');const {mkList,tableUI}=await import('../src/views.js');globalThis.setInterval=interval;
 const now=new Date().toISOString();S.stocks=[{id:1,name:'<종목>',ticker:'TEST',acct:'ISA',curr:'KRW',qty:2,avg:100,cur:110,_quoteMetadata:{quoteSource:'meritz-openapi',quoteRequestedAt:now}}];S.readStatus='success';
 const before=JSON.stringify(S.stocks),html=mkList().innerHTML;
 for(const text of ['계좌별 보유 비중','총 자산 추이','수익 상위 4종목','holdingSearch','holdingAccount','data-table-sort','&lt;종목&gt;','v0.21.1-settings-keep'])assert.ok(html.includes(text),text);
 assert.equal(JSON.stringify(S.stocks),before);tableUI.query='없는 종목';assert.match(mkList().innerHTML,/일치하는 보유 종목이 없습니다/);tableUI.query='';
});
test('header renders four stat cards and strips emoji from sync messages',async()=>{
 const {S}=await import('../src/state.js');const {mkHdr}=await import('../src/views.js');
 S.tab='list';S.syncMsg='✅ 저장 완료 · ⚠️ 설정 확인';
 const html=mkHdr().innerHTML;
 assert.equal((html.match(/class="asset-card"/g)||[]).length,4);
 assert.match(html,/저장 완료/);assert.doesNotMatch(html,/[\p{Extended_Pictographic}\uFE0F]/u);
 S.syncMsg='';
});
test('bottom navigation renders five tab buttons',async()=>{
 const {mkTabs}=await import('../src/views.js');const html=mkTabs().innerHTML;
 const nav=html.match(/<nav class="tabs paper-tabs"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(nav);assert.equal((nav.match(/data-tab=/g)||[]).length,5);
});
test('zero return and profit have neutral classes',async()=>{
 const {S}=await import('../src/state.js');const {mkHdr,mkList}=await import('../src/views.js');
 S.stocks=[{id:2,name:'동일',ticker:'EQ',acct:'ISA',curr:'KRW',qty:1,avg:100,cur:100,_quoteMetadata:{quoteSource:'meritz-openapi',quoteRequestedAt:new Date().toISOString()}}];S.readStatus='success';S.acct='전체';
 const header=mkHdr().innerHTML,body=mkList().innerHTML;
 assert.match(header,/평가손익<\/div><div class="ac-val ">₩0/);
 assert.match(header,/수익률<\/div><div class="ac-val ">/);
 assert.match(body,/<td class="">\+?0\.00%<\/td>/);
});
test('dashboard restores the clickable market today strip',async()=>{
 const {S}=await import('../src/state.js');const {mkList}=await import('../src/views.js');
 S.marketData=[{key:'KOSPI',price:2500,daily:1}];
 const html=mkList().innerHTML;
 assert.match(html,/class="today-strip" data-goto-market="1"/);assert.match(html,/코스피/);
 assert.ok(html.indexOf('today-strip')<html.indexOf('paper-charts'));S.marketData=[];
});
test('expanded trend retains its summary and return chart without duplicate canvases',async()=>{
 const {S}=await import('../src/state.js');const {mkList}=await import('../src/views.js');
 S.showTrend=true;S.trendPeriod='ALL';S.snapshots=[];
 const html=mkList().innerHTML;
 assert.match(html,/id="btnTrendToggle"/);assert.match(html,/스냅샷 없음/);
 assert.equal((html.match(/id="trendTotal"/g)||[]).length,1);
 assert.equal((html.match(/id="trendPct"/g)||[]).length,1);S.showTrend=false;
 assert.equal((html.match(/data-period=/g)||[]).length,6);
});
test('search defers rendering during IME composition and commits on compositionend',()=>{
 const bind=readFileSync(new URL('../src/bind.js',import.meta.url),'utf8');
 assert.match(bind,/if\(e\.isComposing\)return;render\(\)/);
 assert.match(bind,/addEventListener\('compositionend',updateHoldingSearch\)/);
});
