import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const views=readFileSync('src/views.js','utf8');
const css=readFileSync('src/styles.css','utf8');
const html=readFileSync('index.html','utf8');
const view=(name,next)=>views.slice(views.indexOf(`export function ${name}()`),views.indexOf(`export function ${next}()`));

test('phase two screens use paper cards and numeric layout without inventing controls',()=>{
  for(const [name,next] of [['mkCash','mkChart'],['mkTrend','mkJournal'],['mkJournal','mkTxn'],['mkTxn','mkModal'],['mkAnalysis',null]]){
    const text=next?view(name,next):views.slice(views.indexOf(`export function ${name}()`));
    for(const cls of ['paper-screen','paper-card','paper-section-heading','paper-nums']) assert.ok(text.includes(cls),`${name}: ${cls}`);
  }
});

test('existing primary actions receive a single conditional accent',()=>{
  assert.match(view('mkTrend','mkJournal'),/S\.trendPeriod===k\?'on paper-button-accent'/);
  assert.match(view('mkTxn','mkModal'),/cur===key\?'on paper-button-accent'/);
  assert.match(view('mkJournal','mkTxn'),/paper-button-accent[^\"]*" id="btnAddJournal"/);
  assert.match(view('mkCash','mkChart'),/acct==='메리츠증권'&&curr==='USD'\?'paper-button-accent'/);
  assert.doesNotMatch(views.slice(views.indexOf('export function mkAnalysis()')),/<button/);
});

test('paper screens stack and use semantic gain and loss colors',()=>{
  assert.match(css,/\.paper-screen \.pos\s*\{color:var\(--gain\)/);
  assert.match(css,/\.paper-screen \.neg\s*\{color:var\(--loss\)/);
  assert.match(css,/@media\s*\(max-width:899px\)[\s\S]*?\.paper-screen-grid\s*\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.paper-screen-grid\s*\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('inline phase two load order is documented and phone table sort controls align with rows',()=>{
  assert.match(html,/load.order|load order/i);
  for(const [n,area] of [[1,'1 / 1'],[2,'2 / 1'],[3,'1 / 2'],[4,'2 / 2']]) assert.ok(css.includes(`.paper-table thead th:nth-child(${n}){grid-area:${area}`));
  assert.doesNotMatch(css,/\.paper-table thead\s*\{display:none/);
});

test('rendered views retain actions and one accent where an action exists',async()=>{
  globalThis.localStorage={getItem:()=>null};
  globalThis.document={createElement:()=>({innerHTML:'',className:'',children:[],appendChild(child){this.children.push(child);}})};
  const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
  const {S}=await import('../src/state.js');
  const {mkCash,mkTrend,mkJournal,mkTxn,mkAnalysis}=await import('../src/views.js');
  globalThis.setInterval=interval;
  S.cash={'메리츠증권':{USD:1,KRW:2},ISA:{USD:0,KRW:3}};S.cashTxns=[];
  S.trendPeriod='ALL';S.snapshots=[];S.intradaySnaps=[];
  S.journal=[{id:9,category:'etc',stockName:'종목',content:'기록',date:'2026-01-01'}];S.jFilter='전체';
  S.txns=[{id:7,acct:'ISA',name:'종목',mode:'buy',qty:1,price:2}];S.txnAcct='전체';
  S.stocks=[];S.readStatus='success';S.rate=1400;
  const cash=mkCash(),trend=mkTrend(),journal=mkJournal(),txn=mkTxn(),analysis=mkAnalysis();
  for(const node of [cash,trend,journal,txn,analysis]) assert.match(node.className,/paper-screen/);
  for(const markup of [cash.innerHTML,trend.innerHTML,journal.innerHTML,txn.children[0].innerHTML]) assert.equal((markup.match(/paper-button-accent/g)||[]).length,1);
  assert.match(cash.innerHTML,/data-cash-in="메리츠증권\|USD"/);
  assert.match(journal.innerHTML,/data-jdel="9"/);
  assert.match(txn.children[1].children[0].innerHTML,/data-txn-undo="7"/);
  assert.doesNotMatch(analysis.innerHTML,/<button/);
});

test('screen templates and rendered category labels have no decorative emoji',async()=>{
  for(const [name,next] of [['mkCash','mkChart'],['mkTrend','mkJournal'],['mkJournal','mkTxn'],['mkTxn','mkModal'],['mkAnalysis',null]]){
    const text=next?view(name,next):views.slice(views.indexOf(`export function ${name}()`));
    assert.doesNotMatch(text,/\p{Extended_Pictographic}/u,name);
  }
  globalThis.localStorage={getItem:()=>null};
  globalThis.document={createElement:()=>({innerHTML:'',className:'',children:[],appendChild(child){this.children.push(child);}})};
  const {S}=await import('../src/state.js');
  const {mkJournal,mkAnalysis}=await import('../src/views.js');
  S.journal=[{id:1,category:'buy_thesis',stockName:'종목',content:'기록',date:'2026-01-01'}];
  S.jFilter='전체';S.stocks=[];S.readStatus='success';
  assert.doesNotMatch(mkJournal().innerHTML,/\p{Extended_Pictographic}/u);
  assert.doesNotMatch(mkAnalysis().innerHTML,/\p{Extended_Pictographic}/u);
});

test('all analysis section titles use the shared heading class',()=>{
  const titles=[...views.slice(views.indexOf('export function mkAnalysis()')).matchAll(/class="([^"]*analysis-section-title[^"]*)"/g)];
  assert.ok(titles.length>0);
  for(const [,classes] of titles) assert.match(classes,/\bpaper-section-heading\b/);
});

test('inline headings align and semantic analysis colors beat metric defaults',()=>{
  assert.match(css,/\.paper-screen \.txn-head \.paper-section-heading\s*\{[^}]*margin:0/);
  assert.match(css,/\.paper-screen \.journal-cat\s*\{[^}]*margin:0/);
  assert.match(css,/\.paper-screen \.analysis-metric strong\.pos\s*\{color:var\(--gain\)/);
  assert.match(css,/\.paper-screen \.analysis-metric strong\.neg\s*\{color:var\(--loss\)/);
});

test('load order documents why inline table rules do not override header grid areas',()=>{
  assert.ok(html.indexOf('href="src/styles.css"')<html.indexOf('<style>'));
  assert.match(html,/thead[^*]*grid-area/i);
  assert.doesNotMatch(html,/\.paper-table thead[^{}]*\{[^}]*grid-area/);
});
