import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../gas/KisLedgerSnapshot.js',import.meta.url),'utf8'),ctx);
const state={stocks:[{id:1,acct:'ISA',ticker:'123456',curr:'KRW',qty:5,avg:90,cur:100}],cash:{ISA:{KRW:20,USD:0}},txns:[],cashTxns:[]};
const snapshot={status:'success',paginationComplete:true,queriedAt:'2026-11-09T00:00:00Z',rows:[{ticker:'123456',currency:'KRW',quantity:2,averagePrice:100,currentPrice:110}],zeroTickers:[],cash:{currency:'KRW',balance:500,provisionalSettlement:900}};
const fills={complete:true,rows:[{id:'broker-order-1',ticker:'123456',date:'2026-11-06',mode:'sell',quantity:3,totalAmount:301}]};
test('reconciliation stores confirmed fills once and keeps deposit and settlement distinct',()=>{
 assert.equal(typeof ctx.planKisReconciliation_,'function');
 const r=ctx.planKisReconciliation_(state,snapshot,fills);
 assert.equal(r.success,true);assert.equal(r.state.cash.ISA.KRW,500);assert.equal(r.state.kisIsaSettlement.amount,900);
 assert.equal(r.state.txns.length,1);assert.equal(r.state.txns[0].price,301/3);assert.equal(r.state.txns[0].totalAmount,301);
 const again=ctx.planKisReconciliation_(r.state,snapshot,fills);assert.equal(again.success,true);assert.equal(again.state.txns.length,1);
 assert.equal(state.txns.length,0);
});
test('rejects ambiguous existing history and unverified fills without mutating input',()=>{
 const s=structuredClone(state);s.txns.push({acct:'ISA',ticker:'123456',mode:'sell',qty:3,date:'2026-11-06'});
 assert.equal(ctx.planKisReconciliation_(s,snapshot,fills).success,false);
 assert.equal(ctx.planKisReconciliation_(state,snapshot,{...fills,complete:false}).success,false);
 assert.equal(ctx.planKisReconciliation_(state,snapshot,{complete:true,rows:[{...fills.rows[0],quantity:0}]}).success,false);
 assert.equal(state.txns.length,0);
});
test('rejects a changed broker quantity not explained by new fills',()=>{const bad=structuredClone(snapshot);bad.rows[0].quantity=4;assert.equal(ctx.planKisReconciliation_(state,bad,fills).success,false)});
