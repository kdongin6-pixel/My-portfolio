import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const path=new URL('../gas/MeritzLedgerSnapshot.js',import.meta.url);
const code=fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';const c=vm.createContext({});vm.runInContext(code,c);
const clone=x=>JSON.parse(JSON.stringify(x));
test('rejects incomplete, ambiguous, changed symbol or missing cash inputs before making any write plan',()=>{
 const section=rows=>({status:'success',paginationComplete:true,rows});const state={stocks:[{id:1,acct:'메리츠증권',ticker:'TEST',curr:'USD',qty:1,avg:10,cur:11}],cash:{메리츠증권:{USD:10,KRW:2},ISA:{USD:0,KRW:777}},txns:[],cashTxns:[],updatedAt:'2026-01-01'};const good={queriedAt:'2026-11-09T00:00:00Z',sections:{domesticHoldings:section([]),overseasHoldings:section([{ticker:'TEST',currency:'USD',quantity:3,averagePrice:12,currentPrice:15}]),deposit:section([{currency:'KRW',balance:8}]),currencies:section([{currency:'USD',balance:100}])}};
 const cases=[];let b=clone(good);b.sections.overseasHoldings.status='partial';cases.push(b);b=clone(good);b.sections.overseasHoldings.paginationComplete=false;cases.push(b);b=clone(good);b.sections.overseasHoldings.rows.push(clone(b.sections.overseasHoldings.rows[0]));cases.push(b);b=clone(good);b.sections.overseasHoldings.rows=[];cases.push(b);b=clone(good);b.sections.currencies.rows[0].balance=null;cases.push(b);b=clone(good);b.sections.overseasHoldings.rows[0].currency='KRW';cases.push(b);
 for(const bad of cases){let result;assert.doesNotThrow(()=>result=c.planMeritzLedgerSnapshot_(state,bad));assert.equal(result.success,false);assert.equal(result.state,undefined);}
});
test('verified broker snapshot updates only matched Meritz holdings and currency balances without inventing transactions or touching ISA',()=>{
 const state={stocks:[{id:1,acct:'메리츠증권',ticker:'TEST',name:'Test',curr:'USD',qty:1,avg:10,cur:11,tag:'x'},{id:2,acct:'ISA',ticker:'123456',qty:5,avg:9,cur:8}],cash:{메리츠증권:{USD:10,KRW:2},ISA:{USD:0,KRW:777}},txns:[{id:1}],cashTxns:[{id:2}],journal:[{id:3}],agentImports:[],updatedAt:'2026-01-01'};
 const section=rows=>({status:'success',paginationComplete:true,rows});const broker={queriedAt:'2026-11-09T00:00:00Z',sections:{domesticHoldings:section([]),overseasHoldings:section([{ticker:'TEST',currency:'USD',quantity:3,averagePrice:12,currentPrice:15}]),deposit:section([{currency:'KRW',balance:8}]),currencies:section([{currency:'USD',balance:100}])}};
 assert.equal(typeof c.planMeritzLedgerSnapshot_,'function');const original=JSON.stringify(state);const result=clone(c.planMeritzLedgerSnapshot_(state,broker));assert.equal(JSON.stringify(state),original);assert.equal(result.success,true);assert.equal(result.state.stocks[0].qty,3);assert.equal(result.state.stocks[0].avg,12);assert.equal(result.state.stocks[0].cur,15);assert.equal(result.state.stocks[0].tag,'x');assert.deepEqual(result.state.stocks[1],state.stocks[1]);assert.deepEqual(result.state.cash.ISA,state.cash.ISA);assert.deepEqual(result.state.cash['메리츠증권'],{USD:100,KRW:8});for(const k of ['txns','cashTxns','journal','agentImports'])assert.deepEqual(result.state[k],state[k]);
});
