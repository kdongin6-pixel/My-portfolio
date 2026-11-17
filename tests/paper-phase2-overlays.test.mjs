import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('src/styles.css','utf8');
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.document={visibilityState:'visible',addEventListener(){},createElement:()=>({innerHTML:'',className:'',children:[],appendChild(node){this.children.push(node);}})};
const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
const {S}=await import('../src/state.js');
const {mkModal,mkJournal,mkTrend}=await import('../src/views.js');
const {mkMarket}=await import('../src/market-ui.js');
const {mkBrokerAccount,addPaperClass}=await import('../src/broker-account-ui.js');
const helpers=await import('../src/helpers.js');
globalThis.setInterval=interval;
const accents=html=>(html.match(/paper-button-accent/g)||[]).length;
const tags=html=>html.match(/<[a-z][^>]*>/gi)||[];
const tagById=(html,id)=>tags(html).find(tag=>new RegExp(`\\bid="${id}"`).test(tag));
const classes=tag=>tag?.match(/(?:^|\s)class="([^"]*)"/)?.[1].split(/\s+/)||[];
const noDuplicateClasses=html=>{for(const tag of tags(html))assert.ok((tag.match(/(?:^|\s)class\s*=/g)||[]).length<=1,tag);};

test('paper class helper merges existing class attributes without losing them',()=>{
  const input='<button class="mbtn existing" id="x">확인</button><button id="y">취소</button><input class="old" id="z">';
  const output=addPaperClass(addPaperClass(input,/<button\b[^>]*>/g,'paper-button'),/<input\b[^>]*>/g,'paper-input');
  noDuplicateClasses(output);
  assert.deepEqual(classes(tagById(output,'x')),['mbtn','existing','paper-button']);
  assert.deepEqual(classes(tagById(output,'y')),['paper-button']);
  assert.deepEqual(classes(tagById(output,'z')),['old','paper-input']);
});

test('rendered overlays and broker controls contain no duplicate class attributes',()=>{
  noDuplicateClasses(mkBrokerAccount().innerHTML);
  for(const type of ['settings','addJournal','exportText']){
    S.modal={type,text:'기록'};S.stocks=[];S.tags=[];
    const html=mkModal().innerHTML;noDuplicateClasses(html);
    assert.ok(classes(tagById(html,'mc2')).includes('mbtn'));
    if(type==='exportText')assert.ok(tagById(html,'mc'));
  }
});

test('stock detail and screenshot confirmation retain actions and exactly one accent',()=>{
  S.stocks=[{id:1,name:'종목',ticker:'AAA',acct:'ISA',curr:'KRW',qty:2,avg:8,cur:10,tag:'기타'}];
  S.cash={ISA:{KRW:10}};S.tags=['기타'];S.tagColors={};
  for(const type of ['stockDetail','stockAction']){
    S.modal={type,stockId:1};const html=mkModal().innerHTML;noDuplicateClasses(html);
    assert.equal(accents(html),1,type);assert.ok(classes(tagById(html,'actBuy')).includes('paper-button-accent'));
  }
  S.modal={type:'screenshotConfirm',parsed:[{type:'buy',name:'종목',acct:'ISA',curr:'KRW',qty:1,price:10,checked:true}]};
  const html=mkModal().innerHTML;noDuplicateClasses(html);assert.equal(accents(html),1);
  for(const id of ['mc','mc2','execShotApply','shotBack'])assert.ok(tagById(html,id),id);
  assert.match(html,/data-shot-idx="0"/);assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
});

test('market loading state has one disabled accent refresh and no emoji',()=>{
  S.marketLoading=true;const html=mkMarket().innerHTML;S.marketLoading=false;
  noDuplicateClasses(html);assert.equal(accents(html),1);assert.match(tagById(html,'btnMktRefresh'),/\bdisabled\b/);
  assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
});

test('benchmark semantic colors and mobile layout account for fixed navigation',()=>{
  const benchmark=readFileSync('src/benchmark-ui.js','utf8');
  assert.match(benchmark,/bm-gain/);assert.match(benchmark,/bm-loss/);
  assert.match(css,/\.benchmark-view \.bm-gain\{color:var\(--gain\)\}/);
  assert.match(css,/\.benchmark-view \.bm-loss\{color:var\(--loss\)\}/);
  assert.match(css,/\.broker-account,\.mkt2-wrap,\.mkt-wrap,\.benchmark-view\{min-width:0/);
  assert.match(css,/@media\(max-width:899px\)\{\.broker-account,\.mkt2-idx-grid[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.broker-account,\.mkt2-wrap,\.mkt-wrap,\.benchmark-view\{padding-bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)\}/);
  assert.match(css,/\.tabs\{[^}]*z-index:20/);assert.match(css,/\.modal-bg\{z-index:120/);
});

test('category label helper removes emoji and leaves Korean text intact',()=>{
  assert.equal(helpers.stripEmoji('📈 매수 검토 ✏️'),'매수 검토');
  assert.equal(helpers.stripEmoji('기타'),'기타');
});
test('broker output keeps its controls with paper styling',()=>{
  const html=mkBrokerAccount().innerHTML;
  for(const value of ['paper-card','paper-section-heading','paper-button','tabular-nums','data-broker-account="meritz"','data-broker-account="kis"','id="btnBrokerRead"']) assert.ok(html.includes(value),value);
  assert.equal(accents(html),1);
});
test('market empty and populated views keep refresh and one accent',()=>{
  S.marketLoading=false;
  for(const data of [[],[{key:'IXIC',price:100,daily:1,weekly:-1,history:[99,100]}]]){
    S.marketData=data;const html=mkMarket().innerHTML;
    for(const value of ['paper-card','paper-section-heading','paper-button','tabular-nums','id="btnMktRefresh"']) assert.ok(html.includes(value),value);
    assert.equal(accents(html),1);assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
    if(data.length){assert.match(html,/data-etftab="etf"/);assert.doesNotMatch(html,/<linearGradient/);}
  }
});
test('settings and ordinary modal preserve controls and paper treatment',()=>{
  for(const type of ['settings','addJournal','exportText']){
    S.modal={type,text:'기록'};S.stocks=[];S.tags=[];
    const html=mkModal().innerHTML;
    for(const value of ['paper-card','paper-button','paper-input']) assert.ok(html.includes(value),`${type}: ${value}`);
    assert.equal(accents(html),1,type);assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
    assert.match(html,/id="mc"/);
    if(type==='settings') for(const id of ['apiUrlInp','apiSecretInp','googleClientIdInp','anthropicKeyInp','saveApiUrl']) assert.ok(html.includes(`id="${id}"`));
  }
});
test('trend and journal empty or trailing grid items span the row',()=>{
  S.trendPeriod='1D';S.intradaySnaps=[];assert.match(mkTrend().innerHTML,/trend-full-row/);
  S.intradaySnaps=[{dt:new Date().toISOString(),totalKRW:1},{dt:new Date().toISOString(),totalKRW:2}];assert.match(mkTrend().innerHTML,/trend-full-row/);
  S.journal=[];S.jFilter='전체';assert.match(mkJournal().innerHTML,/journal-empty/);
  assert.match(css,/\.trend-full-row[^}]*grid-column\s*:\s*1\s*\/\s*-1/);
  assert.match(css,/\.journal-empty[^}]*grid-column\s*:\s*1\s*\/\s*-1/);
});
test('trade, cash and tag modals preserve their controls without emoji',()=>{
  S.stocks=[{id:1,name:'종목',acct:'ISA',curr:'KRW',qty:2,cur:10,tag:'기타'}];
  S.cash={ISA:{KRW:10}};S.tags=['기타'];S.tagColors={};
  for(const [type,extra,id] of [['trade',{stockId:1,mode:'buy'},'tq'],['cashIn',{target:'ISA|KRW'},'cashAmt'],['editTag',{stockId:1},'newTagName']]){
    S.modal={type,...extra};const html=mkModal().innerHTML;
    assert.match(html,new RegExp(`id="${id}"`));assert.equal(accents(html),1,type);assert.doesNotMatch(html,/\p{Extended_Pictographic}/u,type);
  }
});
