import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {mergeCloudState} from '../src/cloud-merge.js';

// P0: a stale local ledger must never silently overwrite server-owned positions and cash.
// "Server-owned" = holdings (qty/avg per ticker) and cash. The decision is made from the server revision,
// not from the device clock, because a phone clock can be ahead of the server.

const REV_OLD='2026-11-09T09:00:00.000Z';
const REV_NEW='2026-11-09T10:00:00.000Z';

function server(){return{
  updatedAt:REV_NEW,
  stocks:[{id:1,ticker:'UBER',name:'UBER',qty:97,avg:70,cur:75}],
  cash:{MAIN:{USD:4607,KRW:0}},
  txns:[{id:'a1',source:'agent',sourceId:'agent-uber-45',ticker:'UBER',side:'buy',qty:45}],
  cashTxns:[],agentImports:[{sourceId:'agent-uber-45'}],
  snapshots:[],intradaySnaps:[],journal:[],tags:[],tagColors:{}
};}
function staleLocal(){return{
  updatedAt:'2026-11-09T10:30:00.000Z', // device clock is later than the server revision
  stocks:[{id:1,ticker:'UBER',name:'UBER',qty:52,avg:70,cur:75}],
  cash:{MAIN:{USD:7795,KRW:0}},
  txns:[],cashTxns:[],agentImports:[],
  snapshots:[],intradaySnaps:[],journal:[],tags:[],tagColors:{}
};}

test('server changed since the local base: server holdings and cash win, agent trade is kept',()=>{
  const r=mergeCloudState(staleLocal(),server(),{baseRevision:REV_OLD,remoteRevision:REV_NEW});
  assert.equal(r.applied,true);
  assert.equal(r.state.stocks[0].qty,97);
  assert.equal(r.state.cash.MAIN.USD,4607);
  assert.ok(r.state.txns.some(t=>t.sourceId==='agent-uber-45'));
  assert.equal(r.overwroteLocal,true);
});

test('unknown local base (after a conflict reset): server holdings and cash win',()=>{
  const r=mergeCloudState(staleLocal(),server(),{baseRevision:undefined,remoteRevision:REV_NEW});
  assert.equal(r.state.stocks[0].qty,97);
  assert.equal(r.state.cash.MAIN.USD,4607);
  assert.equal(r.overwroteLocal,true);
});

test('server unchanged since the base: local edits keep winning (no regression)',()=>{
  const local=staleLocal();
  const r=mergeCloudState(local,server(),{baseRevision:REV_NEW,remoteRevision:REV_NEW});
  assert.equal(r.state.stocks,local.stocks);
  assert.equal(r.state.cash,local.cash);
  assert.notEqual(r.overwroteLocal,true);
});

test('server changed but holdings and cash are identical: legacy behaviour, no false alarm',()=>{
  const local=staleLocal();
  local.stocks=server().stocks;
  local.cash=server().cash;
  const r=mergeCloudState(local,server(),{baseRevision:REV_OLD,remoteRevision:REV_NEW});
  assert.notEqual(r.overwroteLocal,true);
  assert.equal(r.state.updatedAt,local.updatedAt);
});

test('a price-only difference (cur) is not a conflict',()=>{
  const local=staleLocal();
  local.stocks=[{...server().stocks[0],cur:80}];
  local.cash=server().cash;
  const r=mergeCloudState(local,server(),{baseRevision:REV_OLD,remoteRevision:REV_NEW});
  assert.notEqual(r.overwroteLocal,true);
});

test('cash key order does not matter',()=>{
  const local=staleLocal();
  local.stocks=server().stocks;
  local.cash={MAIN:{KRW:0,USD:4607}};
  const r=mergeCloudState(local,server(),{baseRevision:REV_OLD,remoteRevision:REV_NEW});
  assert.notEqual(r.overwroteLocal,true);
});

test('without options the old clock-based behaviour is unchanged',()=>{
  const local=staleLocal();
  const r=mergeCloudState(local,server());
  assert.equal(r.state.stocks,local.stocks);
  assert.equal(r.state.cash,local.cash);
});

// ---- end to end on the browser side: load, then save ----
const mergeSource=readFileSync('src/cloud-merge.js','utf8').replace(/^export /mg,'');
const cloudSource=readFileSync('src/cloud.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');

function harness({saveResponse,backupFails=false}={}){
  const S={...staleLocal(),rate:1500,readStatus:'pending',cloudStatus:''};
  const sent=[];const stored={};
  const c=vm.createContext({
    S,getApiUrl:()=>'/gas',getApiSecret:()=>'read-only-secret',getIdToken:()=>'id-token',clearIdToken(){},
    REFRESH_MS:1000,render(){},renderCloudBadge(){},
    applyQuoteResponse(){},quoteInfo:()=>({confirmed:false}),
    updateTodaySnapshot(){},updateIntradaySnap(){},
    document:{getElementById:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},
    localStorage:{getItem(k){return stored[k]??null;},setItem(k,v){if(backupFails&&k==='pf_conflict_backup')throw new Error('quota');stored[k]=v;}},console:{error(){}},Date,Intl,JSON,
    fetch:async(url,opts)=>{
      const body=JSON.parse(opts.body);sent.push(body);
      if(body._action==='browser_save')return{ok:true,json:async()=>saveResponse||({success:true,savedAt:'2026-11-09T11:00:00.000Z'})};
      return{ok:true,json:async()=>({appData:server(),savedAt:REV_NEW})};
    }
  });
  vm.runInContext(mergeSource,c);
  vm.runInContext(cloudSource,c);
  return{c,sent,stored};
}

test('stale local after a conflict reload: the next save sends the server holdings and cash, not the stale ones',async()=>{
  const h=harness();
  // State after "stale_state -> reload": the base revision was dropped by saveToCloud.
  delete h.c.S.cloudRevision;
  await h.c.loadFromCloud(false);
  assert.equal(h.c.S.stocks[0].qty,97);
  assert.equal(h.c.S.cash.MAIN.USD,4607);
  assert.equal(h.c.S.cloudRevision,REV_NEW);
  await h.c.saveToCloud();
  const save=h.sent.find(b=>b._action==='browser_save');
  assert.ok(save,'a save request was sent');
  assert.equal(save.expectedRevision,REV_NEW);
  assert.equal(save.state.stocks[0].qty,97);
  assert.equal(save.state.cash.MAIN.USD,4607);
});

test('the overwritten local values are backed up in the browser and the user is told',async()=>{
  const h=harness();
  delete h.c.S.cloudRevision;
  await h.c.loadFromCloud(false);
  const backup=JSON.parse(h.stored.pf_conflict_backup);
  assert.equal(backup.stocks[0].qty,52);
  assert.equal(backup.cash.MAIN.USD,7795);
  assert.match(h.c.S.syncMsg,/서버 기준/);
});

test('backup failure preserves local ledger and blocks adoption of cloud revision',async()=>{
  const h=harness({backupFails:true});
  h.c.S.txns=[{id:'local'}];
  h.c.S.kisIsaSettlement={amount:7};
  await h.c.loadFromCloud(false);
  assert.equal(h.c.S.stocks[0].qty,52);
  assert.equal(h.c.S.txns[0].id,'local');
  assert.equal(h.c.S.kisIsaSettlement.amount,7);
  assert.equal(h.c.S.cloudRevision,undefined);
  assert.equal(h.c.S.cloudStatus,'error');
});

// ---- ledger consistency when the server values are adopted ----
test('stale overwrite: unsaved local manual ledger entries leave the ledger (their effect is not in the server holdings) but stay in the backup',()=>{
  const local=staleLocal();
  local.txns=[{id:'m1',source:'manual',ticker:'UBER',side:'buy',qty:2}];
  local.cashTxns=[{id:'c1',source:'manual',amount:100}];
  const r=mergeCloudState(local,server(),{baseRevision:REV_OLD,remoteRevision:REV_NEW});
  assert.ok(!r.state.txns.some(t=>t.id==='m1'));
  assert.ok(!r.state.cashTxns.some(t=>t.id==='c1'));
  assert.ok(r.state.txns.some(t=>t.sourceId==='agent-uber-45'));
  assert.equal(r.droppedLocal.txns[0].id,'m1');
  assert.equal(r.droppedLocal.cashTxns[0].id,'c1');
});

// ---- ownedSyncRevision: the proof the server asks for ----
test('after adopting the server holdings the browser is in sync and sends ownedSyncRevision on save',async()=>{
  const h=harness();
  delete h.c.S.cloudRevision;
  await h.c.loadFromCloud(false);
  assert.equal(h.c.S.ownedSyncRevision,REV_NEW);
  await h.c.saveToCloud();
  const save=h.sent.find(b=>b._action==='browser_save');
  assert.equal(save.ownedSyncRevision,REV_NEW);
  assert.equal(h.c.S.ownedSyncRevision,'2026-11-09T11:00:00.000Z'); // now in sync with the revision it just wrote
});

test('server unchanged and the user has pending holding edits: the proof from the last sync is kept',async()=>{
  const h=harness();
  h.c.S.stocks=server().stocks.map(s=>({...s}));
  h.c.S.cash=JSON.parse(JSON.stringify(server().cash));
  h.c.S.cloudRevision=REV_NEW;
  h.c.S.ownedSyncRevision=REV_NEW;
  h.c.S.stocks[0].qty=98; // pending manual edit, not saved yet
  await h.c.loadFromCloud(false);
  assert.equal(h.c.S.stocks[0].qty,98);
  assert.equal(h.c.S.ownedSyncRevision,REV_NEW);
});

test('a stale holdings view is never marked as in sync',async()=>{
  const h=harness();
  h.c.S.cloudRevision=REV_NEW;       // the old bug: revision adopted, values stale
  h.c.S.ownedSyncRevision='2026-11-09T09:00:00.000Z';
  await h.c.loadFromCloud(false);    // base == remote revision, server unchanged: local values kept, proof not refreshed
  assert.equal(h.c.S.ownedSyncRevision,'2026-11-09T09:00:00.000Z');
});

test('owned_stale from the server: the user is told, the base is dropped so the next load adopts the server values',async()=>{
  const h=harness({saveResponse:{success:false,error:'owned_stale'}});
  h.c.S.cloudRevision=REV_NEW;
  h.c.S.ownedSyncRevision='2026-11-09T09:00:00.000Z';
  await h.c.saveToCloud();
  assert.ok(!('cloudRevision' in h.c.S));
  assert.ok(!('ownedSyncRevision' in h.c.S));
  assert.match(h.c.S.syncMsg,/다시 불러/);
});
