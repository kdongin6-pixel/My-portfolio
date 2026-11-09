import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCloudState,serverOwnedSignature} from '../src/cloud-merge.js';

const local={updatedAt:'2020-01-01',stocks:[{acct:'A',ticker:'X',qty:1,avg:2}],cash:{A:1},txns:[{id:'local'}],cashTxns:[{id:'cash-local'}],kisIsaSettlement:{amount:1}};
const remote={updatedAt:'2021-01-01',stocks:[{acct:'A',ticker:'X',qty:2,avg:2}],cash:{A:2},txns:[{id:'remote'}],cashTxns:[],kisIsaSettlement:{amount:2}};
test('server clock winner does not attach local trades to server positions',()=>{
 const r=mergeCloudState(local,remote,{baseRevision:'old',remoteRevision:'new'});
 assert.deepEqual(r.state.txns,remote.txns);
 assert.deepEqual(r.droppedLocal.txns,local.txns);
 assert.equal(r.overwroteLocal,true);
});
test('account identity participates in ownership',()=>{
 assert.notEqual(serverOwnedSignature(local),serverOwnedSignature({...local,stocks:[{...local.stocks[0],acct:'B'}]}));
});
