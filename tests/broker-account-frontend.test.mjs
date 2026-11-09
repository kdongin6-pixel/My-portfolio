import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import vm from 'node:vm';
import {analysisExport} from '../src/portfolio-export.js';
const path=new URL('../src/broker-account.js',import.meta.url);
const broker=existsSync(path)?await import(path):{};
const source=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');
function runtime(){
 const S={tab:'broker',stocks:[{name:'Synthetic ledger',qty:2,avg:20,cur:0,acct:'ISA',curr:'KRW'}],cash:{ISA:{KRW:35}},txns:[],cashTxns:[],updatedAt:'synthetic-ledger-time',modal:null,marketData:null,syncMsg:''};
 let calls=[],writes=[],brokerButton={listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}},tab={dataset:{tab:'broker'},addEventListener(type,fn){this.click=fn;}};
 const app={innerHTML:'',children:[],appendChild(el){this.children.push(el);}};
 const document={getElementById:()=>app,createElement:()=>({innerHTML:'',className:''}),querySelector:s=>s==='#btnBrokerRead'?brokerButton:null,querySelectorAll:s=>s==='.tab[data-tab]'?[tab]:[]};
 const context=vm.createContext({...broker,S,document,getApiUrl:()=>'/api',getApiSecret:()=> 'synthetic',fetch:async(...args)=>{calls.push(args);return response(account());},localStorage:{setItem(...args){writes.push(args);}},destroyCharts(){},mkHdr:()=>({}),mkTabs:()=>({}),Date,Intl,console,setTimeout(){throw Error('no automatic timer allowed');},clearTimeout(){}});
 const uiPath=new URL('../src/broker-account-ui.js',import.meta.url);
 new vm.Script(source('broker-account.js')).runInContext(context);
 if(existsSync(uiPath))new vm.Script(source('broker-account-ui.js')).runInContext(context);
 new vm.Script(source('render.js')).runInContext(context);new vm.Script(source('bind.js')).runInContext(context);
 return {context,S,calls,writes,app,tab,brokerButton};
}
test('dedicated mobile tab renders and navigates without read; only its explicit click reads without touching ledger or saves',async()=>{
 assert.ok(existsSync(new URL('../src/broker-account-ui.js',import.meta.url)),'runtime account tab required');
 const r=runtime(),before=JSON.stringify(r.S),exportBefore=analysisExport(r.S);
 vm.runInContext('render()',r.context);assert.equal(r.calls.length,0);assert.ok(r.app.children.some(el=>el.innerHTML?.includes('실계좌 조회')));
 r.S.tab='list';r.tab.click();assert.equal(r.S.tab,'broker');assert.equal(r.calls.length,0);
 await r.brokerButton.listeners.click();assert.equal(r.calls.length,1);assert.equal(JSON.stringify(r.S),before);assert.deepEqual(r.writes,[]);assert.deepEqual(analysisExport(r.S),exportBefore);
 const views=source('views.js');assert.match(views,/data-tab="broker"/);assert.match(views,/S.tab===['"]broker['"]/);
 const style=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');assert.match(style,/\.broker-account/);assert.match(style,/\.broker-card/);
});
test('real-account header never presents ledger totals or ledger-changing controls',()=>{
 const r=runtime();Object.assign(r.context,{filt:()=>[],portfolioStatus:()=>({confirmed:0,total:0,covered:0,valueKRW:0}),filtCashKRW:()=>0,APP_VERSION:'synthetic',dataNotice:()=>'',fK:()=>'',fP:()=>''});
 new vm.Script(source('views.js')).runInContext(r.context);
 const h=vm.runInContext('mkHdr().innerHTML',r.context);
 assert.doesNotMatch(h,/btnAdd|btnShot|btnSync|총 자산|원가 대비/);assert.match(h,/btnSettings/);assert.match(h,/원장과 분리/);
});
const queriedAt='2026-11-09T00:00:00.000Z';
const section=(rows=[],extra={})=>({status:'success',rows,queriedAt,paginationComplete:true,errorCode:null,...extra});
const account=(extra={})=>({provider:'meritz-openapi',readOnly:true,accountLabel:'API 키 연결 계좌 · ISA 연결 미확인',queriedAt,observedAt:null,status:'success',period:{from:'2026-11-03',to:'2026-11-09'},sections:{domesticHoldings:section(),overseasHoldings:section(),deposit:section(),currencies:section(),fills:section()},...extra});
const response=a=>({ok:true,json:async()=>({success:true,brokerAccount:a})});
test('Korean read-only account cards distinguish pending, partial, error, empty and unknown provenance safely',()=>{
 assert.equal(typeof broker.brokerAccountHTML,'function','account view required');
 const idle=broker.brokerAccountHTML({snapshot:null,loading:false,stale:false,error:null});
 assert.match(idle,/실계좌 조회/);assert.match(idle,/아직 조회하지 않았/);assert.doesNotMatch(idle,/<input|data-mode|data-action|가져오기|반영 버튼/);
 const a=account({status:'partial'});
 a.sections.domesticHoldings=section([{name:'<img src=x onerror=alert(1)>',ticker:'<T>',providerSymbol:'T.O',currency:null,quantity:2,averagePrice:null,currentPrice:0,marketValue:NaN,pnl:null}]);
 a.sections.deposit=section([],{status:'error',errorCode:'<BAD>'});
 a.sections.currencies=section([],{status:'partial',paginationComplete:false});
 a.sections.fills=section([],{status:'partial',failedDates:['2026-11-05'],paginationComplete:false});
 const h=broker.brokerAccountHTML({snapshot:a,loading:false,stale:true,error:'조회 실패'});
 for(const s of ['국내 보유잔고','해외 보유잔고','예수금','통화별 잔고','체결수량 있는 주문','누적 체결수량','개별 체결','meritz-openapi','REST 조회시각','기준시각 미확인','ISA 연결 미확인','이전 조회 결과','부분 조회','조회 실패','조회 결과 없음','조회 범위 미완료','2026-11-05','통화 미확인'])assert.ok(h.includes(s),s);
 assert.doesNotMatch(h,/<img|<T>|<BAD>|NaN|LIVE|실시간/);assert.match(h,/&lt;img/);assert.match(h,/&lt;BAD&gt;/);
 assert.doesNotMatch(h,/<button[^>]*>(매수|매도|주문|반영|가져오기)/);
 const loading=broker.brokerAccountHTML({snapshot:a,loading:true,stale:false,error:null});assert.match(loading,/id="btnBrokerRead"[^>]*disabled/);
});
test('broker reader stays idle until explicit refresh and posts only the existing reader auth',async()=>{
 assert.equal(typeof broker.createBrokerAccountReader,'function','new explicit-only reader is required');
 let calls=[];
 const r=broker.createBrokerAccountReader({getUrl:()=>'/existing-api',getSecret:()=> 'synthetic-only',fetcher:async(...args)=>{calls.push(args);return response(account());}});
 assert.equal(r.getState().snapshot,null);assert.equal(calls.length,0);
 await r.refresh();
 assert.equal(calls.length,1);assert.equal(calls[0][0],'/existing-api');
 assert.equal(calls[0][1].method,'POST');assert.equal(calls[0][1].headers['Content-Type'],'text/plain');
 assert.deepEqual(JSON.parse(calls[0][1].body),{_action:'broker_read',secret:'synthetic-only'});
 assert.equal(r.getState().snapshot.provider,'meritz-openapi');assert.equal(r.getState().loading,false);
});
test('subsequent real local save, cloud save and export cannot include the broker snapshot',async()=>{
 const stored=new Map([['pf_api_url','/synthetic'],['pf_api_secret','synthetic']]),requests=[];
 const a=account();a.sections.domesticHoldings=section([{name:'BROKER-EPHEMERAL-SENTINEL',ticker:'READONLY',quantity:987654321,currency:'KRW'}]);
 const context=vm.createContext({DEFAULT_TAGS:[],TC_DEFAULT:{},REFRESH_MS:{},Date,Intl,console,render(){},getIdToken:()=> 'synthetic-id-token',clearIdToken(){},document:{getElementById:()=>null},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},positive:v=>Number(v)>0,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return response(a);}});
 for(const file of ['state.js','cloud.js','broker-account.js','broker-account-ui.js'])new vm.Script(source(file)).runInContext(context);
 vm.runInContext('S.tab="broker";S.updatedAt="ledger-before-read";S.cloudRevision="ledger-before-read"',context);
 const before=vm.runInContext('JSON.stringify(S)',context);
 await vm.runInContext('refreshBrokerAccount()',context);
 assert.equal(vm.runInContext('JSON.stringify(S)',context),before);assert.equal(stored.has('pf_v3'),false);assert.equal(requests.length,1);
 vm.runInContext('save()',context);await vm.runInContext('saveToCloud()',context);
 const local=stored.get('pf_v3'),cloud=JSON.stringify(requests[1]),exported=JSON.stringify(analysisExport(vm.runInContext('S',context)));
 for(const payload of [local,cloud,exported])assert.doesNotMatch(payload,/BROKER-EPHEMERAL-SENTINEL|987654321|brokerAccount|domesticHoldings/);
 assert.equal(requests.length,2);assert.equal(requests[0]._action,'broker_read');assert.equal(requests[1]._action,'browser_save');
});
test('malformed successful broker responses are not shown as confirmed account snapshots',async()=>{
 const r=broker.createBrokerAccountReader({getUrl:()=>'/api',getSecret:()=> 'synthetic',fetcher:async()=>response(account({sections:{}}))});
 await r.refresh();assert.equal(r.getState().snapshot,null);assert.match(r.getState().error,/조회 실패/);
});
test('network, HTTP and authentication failures preserve last result, mark stale and do not expose raw error details',async()=>{
 let mode='success';const r=broker.createBrokerAccountReader({getUrl:()=>'/api',getSecret:()=> 'synthetic',fetcher:async()=>{
  if(mode==='network')throw new Error('DO-NOT-DISPLAY-RAW-ERROR');
  if(mode==='http')return {ok:false,json:async()=>({success:true,brokerAccount:account()})};
  if(mode==='auth')return {ok:true,json:async()=>({success:false,error:'DO-NOT-DISPLAY-RAW-ERROR'})};
  return response(account());
 }});
 await r.refresh();const previous=r.getState().snapshot;
 for(const failure of ['network','http','auth']){mode=failure;await r.refresh();assert.equal(r.getState().snapshot,previous);assert.equal(r.getState().stale,true);assert.equal(r.getState().loading,false);assert.doesNotMatch(broker.brokerAccountHTML(r.getState()),/DO-NOT-DISPLAY/);}
 mode='success';await r.refresh();assert.equal(r.getState().stale,false);assert.equal(r.getState().error,null);
});
test('missing existing configuration does not send any broker request or add secret inputs',async()=>{
 let calls=0;const r=broker.createBrokerAccountReader({getUrl:()=>'',getSecret:()=>'',fetcher:()=>{calls++;}});
 await r.refresh();assert.equal(calls,0);assert.equal(r.getState().snapshot,null);assert.match(r.getState().error,/설정/);assert.doesNotMatch(broker.brokerAccountHTML(r.getState()),/<input/);
});
test('valid partial and broker error responses stay distinct from successful empty sections',async()=>{
 for(const status of ['partial','error']){
  const a=account({status});a.sections.deposit=section([],{status,paginationComplete:false,errorCode:'SYNTHETIC'});
  const r=broker.createBrokerAccountReader({getUrl:()=>'/api',getSecret:()=> 'synthetic',fetcher:async()=>response(a)});await r.refresh();
  assert.equal(r.getState().snapshot.status,status);assert.equal(r.getState().stale,false);
  const h=broker.brokerAccountHTML(r.getState()),deposit=h.split('aria-label="예수금"')[1].split('</section>')[0];
  assert.doesNotMatch(deposit,/조회 결과 없음/);assert.match(deposit,status==='partial'?/부분 조회/:/조회 실패/);
 }
});
test('invalid envelopes cannot overwrite a successful ephemeral snapshot; concurrent clicks are ignored',async()=>{
 let resolve,calls=0,next=response(account());
 const r=broker.createBrokerAccountReader({getUrl:()=>'/api',getSecret:()=> 'synthetic',fetcher:async()=>{calls++;return next;}});
 await r.refresh();const previous=r.getState().snapshot;
 next=new Promise(r=>{resolve=r;});const pending=r.refresh();await r.refresh();assert.equal(calls,2);assert.equal(r.getState().loading,true);
 resolve(response(account({readOnly:false})));await pending;
 assert.equal(r.getState().snapshot,previous);assert.equal(r.getState().stale,true);assert.match(r.getState().error,/조회 실패/);
});
