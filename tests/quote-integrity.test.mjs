import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteInfo,portfolioStatus,applyQuoteResponse,valuation} from '../src/portfolio-read.js';
// All fixtures are synthetic; no private portfolio data.
const stock=()=>({id:1,name:'Synthetic',ticker:'TEST',acct:'ISA',curr:'KRW',qty:2,avg:80,cur:100});
test('quote metadata never substitutes request time for missing observation',()=>{
 const q=quoteInfo({...stock(),_quoteMetadata:{quoteSource:'meritz-openapi',quoteObservedAt:null,quoteRequestedAt:'2026-11-09T01:00:00Z',quoteSession:'unknown',quoteMode:'unknown'}});
 assert.equal(q.observedAt,null);assert.equal(q.requestedAt,'2026-11-09T01:00:00Z');assert.equal(q.mode,'unknown');assert.equal(q.session,'unknown');
 for(const cur of [0,-1,null,undefined,NaN,Infinity,''])assert.equal(quoteInfo({...stock(),cur}).valid,false);
});
test('backend aliases and cached quality remain honest across US override',()=>{
 const s={stocks:[{...stock(),ticker:'TEST',acct:'메리츠증권'}],rate:1400};
 applyQuoteResponse(s,{meritz:[],yahooData:{TEST:{price:120,quoteSource:'meritz-openapi-cache',quoteObservedAt:null,quoteQueriedAt:'2026-11-09T03:00:00Z',quoteMode:'unknown',quoteSession:'unknown'}},quoteQuality:[{account:'메리츠증권',ticker:'TEST',cached:true}]},'2026-11-09T04:00:00Z');
 const q=quoteInfo(s.stocks[0]);assert.equal(q.source,'meritz-openapi-cache');assert.equal(q.requestedAt,'2026-11-09T03:00:00Z');assert.equal(q.observedAt,null);assert.equal(q.confirmed,false);assert.equal(q.cached,true);
});
test('unconnected loading error partial and confirmed empty are different',()=>{
 const s={stocks:[],cash:{},rate:1400};
 assert.equal(portfolioStatus(s,false).state,'unconnected');
 assert.equal(portfolioStatus({...s,readStatus:'loading'},true).state,'loading');
 assert.equal(portfolioStatus({...s,readStatus:'error'},true).state,'error');
 assert.equal(portfolioStatus(s,true).state,'pending');
 assert.equal(portfolioStatus({...s,readStatus:'success'},true).state,'empty');
 assert.equal(portfolioStatus({...s,readStatus:'success',stocks:[stock(),{...stock(),cur:0}]},true).state,'partial');
 assert.equal(valuation([stock(),{...stock(),cur:0}],1400).valueKRW,200);
});
test('quote refresh preserves ledger and old price on failure but marks it cached',()=>{
 const state={stocks:[stock()],cash:{ISA:{KRW:42}},txns:[{id:4,qty:1}],rate:1400};const before=structuredClone(state);
 applyQuoteResponse(state,{isa:[{name:'Synthetic',cur:0,qty:999,avg:999,_quoteMetadata:{quoteSource:'meritz-openapi',quoteObservedAt:null}}],quoteQuality:{partial:true}},'2026-11-09T01:00:00Z');
 assert.equal(state.stocks[0].cur,100);assert.equal(quoteInfo(state.stocks[0]).mode,'cache');assert.equal(quoteInfo(state.stocks[0]).confirmed,false);
 assert.equal(state.stocks[0].qty,before.stocks[0].qty);assert.equal(state.stocks[0].avg,before.stocks[0].avg);assert.deepEqual(state.cash,before.cash);assert.deepEqual(state.txns,before.txns);
 assert.deepEqual(state.quoteQuality,{partial:true});
 applyQuoteResponse(state,{isa:[{name:'Synthetic',cur:110,_quoteMetadata:{quoteSource:'meritz-openapi',quoteObservedAt:null,quoteRequestedAt:'2026-11-09T02:00:00Z',quoteMode:'unknown'}}]},'2026-11-09T02:00:00Z');
 assert.equal(state.stocks[0].cur,110);assert.equal(quoteInfo(state.stocks[0]).observedAt,null);assert.equal(quoteInfo(state.stocks[0]).mode,'unknown');
});
