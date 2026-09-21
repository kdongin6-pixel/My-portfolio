import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeCloudState} from '../src/cloud-merge.js';

function base(){return{
  updatedAt:'2026-09-21T07:00:00.000Z',
  stocks:[{id:1,ticker:'PEP',qty:25}],
  cash:{메리츠증권:{USD:100,KRW:0}},
  txns:[],cashTxns:[],agentImports:[],snapshots:[],intradaySnaps:[],journal:[],tags:[],tagColors:{},rate:1400
};}

test('로컬 updatedAt이 더 최신이어도 원격 에이전트 매매가 거래내역에 합쳐진다',()=>{
  const local={...base(),updatedAt:'2026-09-21T08:00:00.000Z',txns:[{id:1,source:'manual',name:'local'}]};
  const remote={...base(),updatedAt:'2026-09-21T06:50:00.000Z',txns:[{id:2,source:'agent',sourceId:'pep-buy',name:'펩시코'}],agentImports:[{sourceId:'pep-buy'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,true);
  assert.equal(result.state.stocks,local.stocks);
  assert.deepEqual(result.state.txns.map(x=>x.sourceId||x.id),[1,'pep-buy']);
  assert.deepEqual(result.state.agentImports,[{sourceId:'pep-buy'}]);
  assert.equal(result.state.updatedAt,local.updatedAt);
});

test('로컬 updatedAt이 더 최신이어도 원격 에이전트 입출금이 현금내역에 합쳐진다',()=>{
  const local={...base(),updatedAt:'2026-09-21T08:00:00.000Z'};
  const remote={...base(),updatedAt:'2026-09-21T06:50:00.000Z',cashTxns:[{id:2,source:'agent',sourceId:'cash-in',amount:5000}],agentImports:[{sourceId:'cash-in'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,true);
  assert.equal(result.state.cash,local.cash);
  assert.equal(result.state.cashTxns[0].sourceId,'cash-in');
});

test('동일 sourceId를 반복 동기화해도 원장이 중복되지 않는다',()=>{
  const item={id:2,source:'agent',sourceId:'pep-buy',name:'펩시코'};
  const local={...base(),txns:[item],agentImports:[{sourceId:'pep-buy'}]};
  const remote={...base(),updatedAt:'2026-09-21T06:50:00.000Z',txns:[{...item,id:99}],agentImports:[{sourceId:'pep-buy'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,false);
  assert.equal(result.state,local);
});

test('원격이 더 최신이면 기존처럼 원격 잔고를 적용하되 로컬 원장을 유실하지 않는다',()=>{
  const local={...base(),updatedAt:'2026-09-21T06:00:00.000Z',txns:[{id:1,source:'manual',name:'local'}]};
  const remote={...base(),updatedAt:'2026-09-21T07:00:00.000Z',stocks:[{id:1,ticker:'PEP',qty:50}],txns:[{id:2,source:'agent',sourceId:'pep-buy'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,true);
  assert.equal(result.state.stocks[0].qty,50);
  assert.deepEqual(result.state.txns.map(x=>x.sourceId||x.id),['pep-buy',1]);
});

test('sourceId 없는 일반 원격 원장은 로컬이 최신일 때 끌어오지 않는다',()=>{
  const local={...base(),updatedAt:'2026-09-21T08:00:00.000Z'};
  const remote={...base(),updatedAt:'2026-09-21T06:00:00.000Z',txns:[{id:9,source:'manual'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,false);
});

test('같은 날짜의 스냅샷은 기존 동작대로 로컬 값을 우선한다',()=>{
  const local={...base(),updatedAt:'2026-09-21T06:00:00.000Z',snapshots:[{date:'2026-09-20',totalKRW:200}]};
  const remote={...base(),updatedAt:'2026-09-21T07:00:00.000Z',snapshots:[{date:'2026-09-20',totalKRW:100}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.state.snapshots[0].totalKRW,200);
});
