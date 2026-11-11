import test from 'node:test';
import assert from 'node:assert/strict';
import {brokerSummary,brokerAccountHTML,createBrokerAccountAutoRead} from '../src/broker-account.js';
import {APP_VERSION} from '../src/constants.js';

const section=(rows=[])=>({status:'success',paginationComplete:true,queriedAt:'2026-11-10T00:00:00Z',rows});
const snapshot=()=>({provider:'meritz-openapi',readOnly:true,status:'success',queriedAt:'2026-11-10T00:00:00Z',period:{from:'2026-11-03',to:'2026-11-09'},sections:{
 domesticHoldings:section([{name:'KRW name',ticker:'K',currency:'KRW',quantity:2,averagePrice:1000,currentPrice:1200,marketValue:2400,pnl:400}]),
 overseasHoldings:section([{name:'USD name',ticker:'U',currency:'USD',quantity:3,averagePrice:10,currentPrice:12,marketValue:36,pnl:6}]),
 deposit:section([{currency:'KRW',balance:5000,d1Balance:0,d2Balance:0,withdrawable:4000,orderable:3500}]),
 currencies:section([{currency:'USD',balance:100,estimatedBalance:100,fxRate:1400}]),
 fills:section([{date:'2026-11-08',side:'sell',ticker:'U',name:'USD name',currency:'USD',quantity:1,price:12,amount:12,providerTime:'10:00'},{date:'2026-11-09',side:'buy',ticker:'K',name:'KRW name',currency:'KRW',quantity:1,price:1000,amount:1000,providerTime:'11:00'}])
}});
test('account-view release version is pinned',()=>assert.equal(APP_VERSION,'v0.14.0-ui-drawer'));

test('brokerSummary computes per-currency holdings, profit rates and estimated converted total',()=>{
 const r=brokerSummary(snapshot());assert.equal(r.currencies.KRW.marketValue,2400);assert.equal(r.currencies.KRW.cost,2000);assert.equal(r.currencies.KRW.pnl,400);assert.equal(r.currencies.KRW.pnlPct,20);assert.equal(r.currencies.USD.marketValue,36);assert.equal(r.currencies.USD.cost,30);assert.equal(r.currencies.USD.pnl,6);assert.equal(r.currencies.USD.pnlPct,20);assert.equal(r.totalKRW,197800);assert.equal(r.pnlKRW,8800);assert.equal(r.pnlPct,20);assert.equal(r.depositOrderable,3500);assert.equal(r.usdBalance,100);assert.equal(r.estimated,true);
});
test('failed sections null affected totals rather than showing partial sums',()=>{
 const a=snapshot();a.sections.domesticHoldings.status='partial';assert.equal(brokerSummary(a).currencies.KRW.marketValue,null);assert.equal(brokerSummary(a).totalKRW,null);assert.equal(brokerSummary(a).currencies.USD.marketValue,36);
 a.sections.currencies.status='error';assert.equal(brokerSummary(a).fxRate,null);assert.equal(brokerSummary(a).usdBalance,null);assert.equal(brokerSummary(a).totalKRW,null);
});
test('account view sorts holdings, computes currency weights, signs PnL and escapes hostile text',()=>{
 const a=snapshot();a.sections.overseasHoldings.rows.push({name:'<script>alert(1)</script>',ticker:'X',currency:'USD',quantity:2,averagePrice:10,currentPrice:9,marketValue:18,pnl:-2});
 const html=brokerAccountHTML({snapshot:a,loading:false,stale:false,error:null});assert.ok(html.indexOf('KRW name')<html.indexOf('USD name'));assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/class="neg"/);assert.match(html,/매수/);assert.match(html,/매도/);assert.match(html,/2026-11-09[\s\S]*2026-11-08/);assert.match(html,/broker-total/);assert.match(html,/마지막 조회/);assert.match(html,/원장 자동 반영 없음/);
 const weights=[...html.matchAll(/통화 내 비중 ([\d,.]+) %/g)].map(m=>Number(m[1].replaceAll(',','')));assert.ok(Math.abs(weights.reduce((x,y)=>x+y,0)-200)<0.02);
});
test('broker fill groups retain newest-date-first presentation and hostile strings are escaped',()=>{
 const a=snapshot();a.sections.fills.rows[0].name='<bad>';const html=brokerAccountHTML({snapshot:a});assert.ok(html.indexOf('2026-11-09')<html.indexOf('2026-11-08'));assert.match(html,/&lt;bad&gt;/);assert.doesNotMatch(html,/<bad>/);
});
test('auto-read starts only for active visible tab, refreshes stale snapshots and stops when hidden or inactive',async()=>{
 let now=Date.parse('2026-11-10T00:00:00Z'),timer,cleared=0,calls=0;const reader={state:{snapshot:null,loading:false},getState(){return this.state;},async refresh(){calls++;this.state={snapshot:{queriedAt:new Date(now).toISOString()},loading:false};}};
 const auto=createBrokerAccountAutoRead({reader,now:()=>now,setIntervalFn:fn=>{timer=fn;return 7;},clearIntervalFn:id=>{assert.equal(id,7);cleared++;}});
 auto.update(true,false);assert.equal(calls,0);assert.equal(timer,undefined);
 auto.update(true,true);await auto.tick();assert.equal(calls,1);assert.equal(typeof timer,'function');
 now+=60001;await timer();assert.equal(calls,2);
 auto.update(true,false);assert.equal(cleared,1);now+=120000;await auto.tick();assert.equal(calls,2);
 auto.update(false,true);assert.equal(cleared,1);
});
test('auto-read does not overlap an existing reader request',async()=>{
 let calls=0;const reader={getState:()=>({snapshot:null,loading:true}),async refresh(){calls++;}};const auto=createBrokerAccountAutoRead({reader,setIntervalFn:()=>1,clearIntervalFn(){}});auto.update(true,true);await auto.tick();assert.equal(calls,0);auto.stop();
});
test('auto-read refreshes at interval minus 15 seconds, including the immediate tick',async()=>{
 let now=Date.parse('2026-11-10T00:00:00Z'),calls=0,timer;const reader={getState:()=>({snapshot:{queriedAt:new Date(now-46000).toISOString()},loading:false}),async refresh(){calls++;}};
 const auto=createBrokerAccountAutoRead({reader,now:()=>now,setIntervalFn:fn=>{timer=fn;return 1;},clearIntervalFn(){},intervalMs:60000});
 auto.update(true,true);await Promise.resolve();assert.equal(calls,1);await timer();assert.equal(calls,2);auto.stop();
});
