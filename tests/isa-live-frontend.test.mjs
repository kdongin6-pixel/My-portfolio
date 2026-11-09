import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {analysisExport} from '../src/portfolio-export.js';
import {brokerSummary,brokerAccountHTML,createBrokerAccountReader,createBrokerAccountAutoRead} from '../src/broker-account.js';
const source=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');
const section=rows=>({status:'success',paginationComplete:true,queriedAt:'2026-11-09T00:00:00Z',rows});
const account=()=>({provider:'kis-openapi',readOnly:true,accountLabel:'DO NOT USE',queriedAt:'2026-11-09T00:00:00Z',status:'success',period:{from:'2026-10-10',to:'2026-11-09'},sections:{domesticHoldings:section([{ticker:'BIG',name:'ISA-ONLY-SENTINEL',currency:'KRW',quantity:2,averagePrice:40,currentPrice:100,marketValue:200,pnl:120},{ticker:'SMALL',name:'small',currency:'KRW',quantity:1,averagePrice:40,currentPrice:50,marketValue:50,pnl:10}]),deposit:section([{currency:'KRW',balance:30,d2Balance:900,orderable:20}]),fills:section([{date:'2026-11-08',ticker:'SMALL',currency:'KRW',side:'buy',quantity:1,price:50,amount:50},{date:'2026-11-09',ticker:'BIG',currency:'KRW',side:'sell',quantity:1,price:100,amount:100}])}});
const ok=a=>({ok:true,json:async()=>({success:true,brokerAccount:a})});
const fail=error=>({ok:true,json:async()=>({success:false,error})});
test('selection defaults, persists only the account key and tolerates unavailable storage',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 const ctx=vm.createContext({localStorage:storage,S:{tab:'other'},getApiUrl(){},getApiSecret(){},createBrokerAccountReader:()=>({}),createBrokerAccountAutoRead:()=>({}),render(){}});
 vm.runInContext(source('broker-account-ui.js'),ctx);
 const a=ctx.createBrokerAccountSelection(storage);assert.equal(a.get(),'meritz');assert.equal(a.select('kis'),true);assert.equal(m.get('pf_broker_account'),'kis');assert.equal(ctx.createBrokerAccountSelection(storage).get(),'kis');assert.equal(a.select('evil'),false);assert.equal(a.get(),'kis');
 assert.equal(ctx.createBrokerAccountSelection({getItem(){throw Error()},setItem(){throw Error()}}).get(),'meritz');
});
test('KIS request uses exactly the shared read secret and no other fields',async()=>{
 let args;const r=createBrokerAccountReader({provider:'kis',getUrl:()=>'/gas',getSecret:()=> 'shared',fetcher:async(...a)=>{args=a;return ok(account())}});
 await r.refresh();assert.equal(args[0],'/gas');assert.equal(args[1].method,'POST');assert.equal(args[1].headers['Content-Type'],'text/plain');assert.deepEqual(JSON.parse(args[1].body),{_action:'kis_read',secret:'shared'});assert.equal(r.getState().snapshot.provider,'kis-openapi');
});
test('ISA totals exclude D+2; holdings sorted, fills grouped and no FX or overseas sections',()=>{
 const a=account(),s=brokerSummary(a),h=brokerAccountHTML({provider:'kis',snapshot:a});
 assert.equal(s.totalKRW,280);assert.equal(s.pnlKRW,130);assert.match(h,/D\+2 예수금/);assert.match(h,/>900</);assert.match(h,/한국투자 ISA · API 연결 계좌/);assert.doesNotMatch(h,/DO NOT USE|적용환율|해외 보유잔고|통화별 잔고|USD/);assert.ok(h.indexOf('ISA-ONLY-SENTINEL')<h.indexOf('small'));assert.ok(h.indexOf('2026-11-09</h3>')<h.indexOf('2026-11-08</h3>'));
 a.sections.deposit.paginationComplete=false;assert.equal(brokerSummary(a).totalKRW,null);
});
for(const error of ['invalid_action','configuration'])test(`${error} stops automatic reads until manual retry and preserves old snapshot`,async()=>{
 let mode='ok',calls=0;const a=account(),r=createBrokerAccountReader({provider:'kis',getUrl:()=>'/gas',getSecret:()=> 'shared',fetcher:async()=>{calls++;return mode==='ok'?ok(a):fail(error)}});
 await r.refresh();mode='fail';await r.refresh();assert.equal(r.getState().snapshot,a);assert.equal(r.getState().autoPaused,true);const html=brokerAccountHTML(r.getState());assert.match(html,/ISA 서버 연결 준비 중/);assert.doesNotMatch(html,/broker-warning|이전 조회 결과/);assert.match(html,/마지막 조회/);
 const auto=createBrokerAccountAutoRead({reader:r,now:()=>Date.parse('2026-11-10'),setIntervalFn:()=>1,clearIntervalFn(){}});auto.update(true,true);await auto.tick();auto.update(false,false);auto.update(true,true);await auto.tick();assert.equal(calls,2);mode='ok';await r.refresh();assert.equal(calls,3);assert.equal(r.getState().autoPaused,false);auto.stop();
});
test('KIS unauthorized and broker failure keep previous snapshot and use safe existing error',async()=>{
 let result=ok(account());const r=createBrokerAccountReader({provider:'kis',getUrl:()=>'/gas',getSecret:()=> 'shared',fetcher:async()=>result});await r.refresh();const a=r.getState().snapshot;
 for(const e of ['unauthorized','broker_read_failed']){result=fail(e);await r.refresh();assert.equal(r.getState().snapshot,a);assert.equal(r.getState().stale,true);assert.equal(r.getState().autoPaused,false);assert.match(r.getState().error,/조회 실패/);}
});
test('ISA snapshot stays out of actual state, local save, cloud save and export',async()=>{
 const stored=new Map([['pf_api_url','/gas'],['pf_api_secret','shared'],['pf_broker_account','kis']]),requests=[];
 const context=vm.createContext({DEFAULT_TAGS:[],TC_DEFAULT:{},REFRESH_MS:{},Date,Intl,console,render(){},getIdToken:()=> 'id',clearIdToken(){},document:{getElementById:()=>null},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){},positive:v=>Number(v)>0,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return ok(account());}});
 for(const file of ['state.js','cloud.js','broker-account.js','broker-account-ui.js'])vm.runInContext(source(file),context);
 vm.runInContext('S.tab="broker";S.updatedAt="before";S.cloudRevision="before"',context);const before=vm.runInContext('JSON.stringify(S)',context);await vm.runInContext('refreshBrokerAccount()',context);assert.equal(vm.runInContext('JSON.stringify(S)',context),before);vm.runInContext('save()',context);await vm.runInContext('saveToCloud()',context);const exported=JSON.stringify(analysisExport(vm.runInContext('S',context)));for(const v of [stored.get('pf_v3'),JSON.stringify(requests[1]),exported])assert.doesNotMatch(v,/ISA-ONLY-SENTINEL|domesticHoldings|brokerAccount|d2Balance/);assert.equal(requests[0]._action,'kis_read');assert.equal(requests[1]._action,'browser_save');
});

test('switching accounts shows independent snapshots immediately and reads only the visible selection',async()=>{
 const stored=new Map(),requests=[],renders=[];let resolveKis;
 const document={visibilityState:'visible',addEventListener(){}};
 const c=vm.createContext({S:{tab:'broker'},document,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},getApiUrl:()=>'/gas',getApiSecret:()=> 'secret',render(){renders.push(vm.runInContext('brokerReaders[brokerSelection.get()].getState().snapshot?.provider||"empty"',c))},fetch:async(url,opt)=>{const action=JSON.parse(opt.body)._action;requests.push(action);return action==='broker_read'?ok({...account(),provider:'meritz-openapi',sections:{...account().sections,overseasHoldings:section([]),currencies:section([])}}):new Promise(r=>{resolveKis=r})},setInterval:()=>1,clearInterval(){},Date,Intl});
 vm.runInContext(source('broker-account.js'),c);vm.runInContext(source('broker-account-ui.js'),c);
 await vm.runInContext('refreshBrokerAccount()',c);vm.runInContext('selectBrokerAccount("kis")',c);assert.equal(renders.at(-1),'empty');assert.deepEqual(requests,['broker_read','kis_read']);vm.runInContext('selectBrokerAccount("meritz")',c);assert.ok(renders.includes('meritz-openapi'));resolveKis(ok(account()));await new Promise(r=>setImmediate(r));assert.equal(vm.runInContext('brokerReaders.kis.getState().snapshot.provider',c),'kis-openapi');
 document.visibilityState='hidden';vm.runInContext('setBrokerAccountActive(true);selectBrokerAccount("kis")',c);assert.equal(requests.filter(x=>x==='kis_read').length,1);assert.equal(vm.runInContext('brokerReaders[brokerSelection.get()].getState().snapshot.provider',c),'kis-openapi');
});
