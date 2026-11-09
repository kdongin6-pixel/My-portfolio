import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('broker snapshot transaction cannot be undone as a manual cash-changing trade',()=>{
 const code=fs.readFileSync(new URL('../src/trades.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');
 let saved=false;const S={stocks:[{id:1,qty:2,avg:100}],cash:{ISA:{KRW:500}},txns:[{id:'kis:1',stockId:1,acct:'ISA',curr:'KRW',brokerImported:true,prevQty:5,prevAvg:90,cashChange:300}]};
 const c=vm.createContext({S,save:()=>{saved=true},render:()=>{},alert:()=>{},confirm:()=>true});vm.runInContext(code,c);c.undoTrade('kis:1');
 assert.equal(saved,false);assert.equal(S.stocks[0].qty,2);assert.equal(S.cash.ISA.KRW,500);assert.equal(S.txns.length,1);
});

test('broker snapshot blocks ISA manual trade and cash mutations',()=>{const code=fs.readFileSync(new URL('../src/trades.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');let saved=0,alerts=0;const S={kisIsaSettlement:{amount:500},stocks:[{id:1,acct:'ISA',curr:'KRW',qty:2,avg:100}],cash:{ISA:{KRW:500}},txns:[{id:2,stockId:1,acct:'ISA',curr:'KRW',prevQty:1,prevAvg:100,cashChange:-100}],cashTxns:[{id:3,acct:'ISA',curr:'KRW',mode:'in',amount:100}]};const c=vm.createContext({S,save:()=>saved++,render:()=>{},alert:()=>alerts++,confirm:()=>true,fM:String});vm.runInContext(code,c);c.execTrade(1,'buy',1,100,0);c.undoTrade(2);c.execCash('ISA','KRW','in',100,'');c.undoCashTxn(3);assert.equal(saved,0);assert.equal(alerts,4);assert.equal(S.stocks[0].qty,2);assert.equal(S.cash.ISA.KRW,500)});
