import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const mergeSource=readFileSync('src/cloud-merge.js','utf8').replace(/^export /mg,'');
const cloudSource=readFileSync('src/cloud.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');

function fixture(){
  const localUpdatedAt='2026-11-09T02:00:00.000Z';
  const remoteUpdatedAt='2026-11-09T01:00:00.000Z';
  const serverRevision='2026-11-09T01:00:00.500Z';
  const S={stocks:[],cash:{ISA:{KRW:10,USD:0}},cashTxns:[],txns:[],agentImports:[],snapshots:[],intradaySnaps:[],journal:[],tags:[],tagColors:{},rate:1500,updatedAt:localUpdatedAt,readStatus:'pending'};
  const c=vm.createContext({
    S,getApiUrl:()=>'/gas',getApiSecret:()=> 'read-only-secret',
    REFRESH_MS:1000,render(){},renderCloudBadge(){},
    applyQuoteResponse(){},quoteInfo:()=>({confirmed:false}),
    updateTodaySnapshot(){},updateIntradaySnap(){},
    document:{getElementById:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},
    localStorage:{setItem(){}},console:{error(){}},Date,Intl,
    fetch:async()=>({ok:true,json:async()=>({
      appData:{updatedAt:remoteUpdatedAt,stocks:[],cash:{ISA:{KRW:10,USD:0}},cashTxns:[],txns:[],agentImports:[],snapshots:[],intradaySnaps:[],journal:[],tags:[],tagColors:{}},
      savedAt:serverRevision
    })})
  });
  vm.runInContext(mergeSource,c);
  vm.runInContext(cloudSource,c);
  return {c,localUpdatedAt,remoteUpdatedAt,serverRevision};
}

test('cloud load retains the server CAS revision when local ledger is newer',async()=>{
  const f=fixture();
  await f.c.loadFromCloud(false);
  assert.equal(f.c.S.updatedAt,f.localUpdatedAt);
  assert.equal(f.c.S.cloudRevision,f.serverRevision);
});
