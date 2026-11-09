import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync,readdirSync} from 'node:fs';import {applyQuoteResponse,quoteInfo} from '../src/portfolio-read.js';
// Synthetic-only integration fixtures, no real network or credentials.
const source=readFileSync('src/cloud.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');
async function run(response,extraStocks=[]){
 const s={stocks:[{name:'Synthetic',ticker:'TEST',acct:'ISA',curr:'KRW',qty:2,avg:80,cur:100}],cash:{ISA:{KRW:40}},txns:[],rate:1400,readStatus:'pending'};
 s.stocks.push(...extraStocks);
 const before=structuredClone(s);let req;
 const context=vm.createContext({S:s,getApiUrl:()=>'/synthetic',getApiSecret:()=> 'synthetic-test-only',applyQuoteResponse,quoteInfo,mergeCloudState:()=>({applied:false}),REFRESH_MS:{},render(){},updateTodaySnapshot(){},updateIntradaySnap(){},setInterval(){},setTimeout(){},clearTimeout(){},document:{getElementById:()=>null},localStorage:{setItem(){}},Date,Intl,console,fetch:async(url,options)=>{req=JSON.parse(options.body);return{ok:true,json:async()=>response};}});
 new vm.Script(source).runInContext(context);await vm.runInContext('loadFromCloud(true)',context);return {s,before,req};
}
test('sync runtime throws success:false and preserves prior quote without changing ledger',async()=>{
 const {s,before}=await run({success:false,error:'synthetic failure'});assert.equal(s.readStatus,'error');assert.equal(quoteInfo(s.stocks[0]).mode,'unknown');assert.equal(s.stocks[0].cur,100);assert.deepEqual(s.stocks[0]._quoteMetadata,before.stocks[0]._quoteMetadata);assert.equal(s.stocks[0].qty,before.stocks[0].qty);assert.deepEqual(s.cash,before.cash);
});
test('sync runtime preserves cash/qty/avg and observes missing exchange time',async()=>{
 const {s,before,req}=await run({isa:[{name:'Synthetic',cur:120,qty:999,avg:999,quoteSource:'meritz-openapi',quoteObservedAt:null,quoteQueriedAt:'2026-11-09T00:00:00Z'}],sheetCash:{ISA:{KRW:999}},rateQuality:{source:'sheet',observedAt:null,mode:'unknown'}});
 assert.equal(s.readStatus,'success');assert.equal(req.freshQuotes,true);assert.equal(s.stocks[0].qty,before.stocks[0].qty);assert.equal(s.stocks[0].avg,before.stocks[0].avg);assert.deepEqual(s.cash,before.cash);assert.equal(quoteInfo(s.stocks[0]).observedAt,null);assert.equal(quoteInfo(s.stocks[0]).requestedAt,'2026-11-09T00:00:00Z');
});
test('sync success count excludes retained zero-quantity ledger rows',async()=>{const {s}=await run({isa:[{name:'Synthetic',cur:120,quoteSource:'meritz-openapi',quoteQueriedAt:new Date().toISOString()}]},[{name:'Synthetic zero',ticker:'ZERO',acct:'ISA',curr:'KRW',qty:0,avg:80,cur:100}]);assert.match(s.syncMsg,/시세 1\/1 확인/);assert.equal(s.stocks.length,2);});
test('non-fresh partial load schedules one fresh follow-up request',async()=>{
 const timers=[],requests=[],s={stocks:[{name:'Synthetic',ticker:'TEST',acct:'ISA',curr:'KRW',qty:1,avg:10,cur:12}],cash:{},txns:[],rate:1400,readStatus:'pending'};
 const context=vm.createContext({S:s,getApiUrl:()=>'/synthetic',getApiSecret:()=> 'synthetic-test-only',applyQuoteResponse,quoteInfo,mergeCloudState:()=>({applied:false}),REFRESH_MS:{},render(){},renderCloudBadge(){},updateTodaySnapshot(){},updateIntradaySnap(){},setInterval(){},setTimeout:fn=>timers.push(fn),clearTimeout(){},document:{getElementById:()=>null},localStorage:{setItem(){}},Date,Intl,console,fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return{ok:true,json:async()=>({isa:[],meritz:[]})};}});
 new vm.Script(source).runInContext(context);await vm.runInContext('loadFromCloud(false)',context);
 assert.equal(timers.length,1);timers.shift()();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(requests.map(r=>r.freshQuotes),[false,true]);
});
test('overlapping cloud loads share one in-flight request',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),requests=[];
 const s={stocks:[],cash:{},txns:[],rate:1400,readStatus:'pending'};
 const context=vm.createContext({S:s,getApiUrl:()=>'/synthetic',getApiSecret:()=> 'synthetic-test-only',applyQuoteResponse,quoteInfo,mergeCloudState:()=>({applied:false}),REFRESH_MS:{},render(){},renderCloudBadge(){},updateTodaySnapshot(){},updateIntradaySnap(){},setInterval(){},setTimeout(){},clearTimeout(){},document:{getElementById:()=>null},localStorage:{setItem(){}},Date,Intl,console,fetch:async(url,options)=>{requests.push(JSON.parse(options.body));await gate;return{ok:true,json:async()=>({isa:[],meritz:[]})};}});
 new vm.Script(source).runInContext(context);const first=context.loadFromCloud(false);const second=context.loadFromCloud(false);assert.equal(requests.length,1);release();await Promise.all([first,second]);assert.equal(requests.length,1);
});
test('all frontend modules parse as actual module source',()=>{
 for(const f of readdirSync('src').filter(f=>f.endsWith('.js'))){const s=readFileSync('src/'+f,'utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');assert.doesNotThrow(()=>new vm.Script(s),f);}
});
