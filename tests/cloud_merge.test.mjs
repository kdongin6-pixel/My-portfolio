import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeCloudState,mergeJournalTags,adoptServerProtectedKis} from '../src/cloud-merge.js';

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

test('원격이 더 최신이면 원격 잔고와 원장을 적용하고 로컬 거래는 백업 대상으로 남긴다',()=>{
  const local={...base(),updatedAt:'2026-09-21T06:00:00.000Z',txns:[{id:1,source:'manual',name:'local'}]};
  const remote={...base(),updatedAt:'2026-09-21T07:00:00.000Z',stocks:[{id:1,ticker:'PEP',qty:50}],txns:[{id:2,source:'agent',sourceId:'pep-buy'}]};
  const result=mergeCloudState(local,remote);
  assert.equal(result.applied,true);
  assert.equal(result.state.stocks[0].qty,50);
  assert.deepEqual(result.state.txns.map(x=>x.sourceId||x.id),['pep-buy']);
  assert.deepEqual(result.droppedLocal.txns.map(x=>x.id),[1]);
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

test('서버에 없는 로컬 일지는 merge 후에도 남는다',()=>{
  const merged=mergeJournalTags({journal:[{id:'local',createdAt:'2026-09-21T07:00:00Z',content:'memo'}]}, {journal:[]});
  assert.equal(merged.journal[0].content,'memo');
});
test('서버 전용 일지는 합쳐진다',()=>{
  assert.equal(mergeJournalTags({}, {journal:[{id:'remote'}]}).journal[0].id,'remote');
});
test('같은 일지 ID는 최신 시각 항목이 결정적으로 선택된다',()=>{
  const local={journal:[{id:1,updatedAt:'2026-09-21T08:00:00Z',content:'local'}]};
  const remote={journal:[{id:'1',updatedAt:'2026-09-21T07:00:00Z',content:'server-old'}]};
  assert.equal(mergeJournalTags(local,remote).journal[0].content,'local');
  assert.equal(mergeJournalTags({}, {journal:local.journal}).journal[0].content,'local');
});
test('timestamp 없는 동일 ID 충돌은 로컬 우선이며 원격 내용도 보존한다',()=>{
  const local={journal:[{id:'same',content:'local'}]},remote={journal:[{id:'same',content:'remote'}]};
  const merged=mergeJournalTags(local,remote);
  assert.equal(merged.journal[0].content,'local');
  assert.deepEqual(merged.journal[0].conflictVersions,[{id:'same',content:'remote'}]);
  assert.deepEqual(mergeJournalTags(merged,merged),merged);
});
test('tombstone 병합은 최대 500개를 유지하고 재병합해도 동일하다',()=>{
  const local={journalDeletedIds:Array.from({length:400},(_,i)=>`l${i}`)};
  const remote={journalDeletedIds:Array.from({length:400},(_,i)=>`r${i}`)};
  const merged=mergeJournalTags(local,remote);
  assert.equal(merged.journalDeletedIds.length,500);
  assert.equal(merged.journalDeletedIds[0],'l300');
  assert.deepEqual(mergeJournalTags(merged,merged),merged);
});
test('태그는 합집합이고 충돌 색상은 서버 우선',()=>{
  const merged=mergeJournalTags({tags:['local','both'],tagColors:{both:'#111',local:'#222'}},{tags:['remote','both'],tagColors:{both:'#fff',remote:'#333'}});
  assert.deepEqual(new Set(merged.tags),new Set(['local','both','remote']));
  assert.equal(merged.tagColors.both,'#fff');
});
test('빈 서버 일지는 로컬 일지를 지우지 않는다',()=>{
  assert.equal(mergeJournalTags({journal:[{id:7}]},{journal:[]}).journal.length,1);
});

test('서버에 없는 ISA 정산과 로컬 증권사 체결을 제거하고 백업 대상으로 반환한다',()=>{
  const settlement={amount:100};
  const txn={id:'broker-1',brokerImported:true,amount:50};
  const result=adoptServerProtectedKis({kisIsaSettlement:settlement,txns:[txn]}, {txns:[]});
  assert.equal(result.state.kisIsaSettlement,null);
  assert.deepEqual(result.state.txns,[]);
  assert.deepEqual(result.dropped,{kisIsaSettlement:settlement,txns:[txn]});
});

test('동일 kisFillId의 서버 체결 사본을 채택하고 서버 전용 보호 체결도 추가한다',()=>{
  const localFill={id:'old',kisFillId:'fill-1',qty:1};
  const serverFill={id:'new',kisFillId:'fill-1',qty:2};
  const serverOnly={id:'fill-2',kisFillId:'fill-2',qty:3};
  const result=adoptServerProtectedKis({txns:[localFill]}, {txns:[serverFill,serverOnly]});
  assert.deepEqual(result.state.txns,[serverFill,serverOnly]);
  assert.deepEqual(result.dropped.txns,[localFill]);
});

test('일반 거래와 일지형 메모 거래는 유지하며 동일 보호 상태는 멱등이다',()=>{
  const normal={id:1,memo:'manual'};
  const journalLike={id:2,memo:'note',source:'manual'};
  const protectedTxn={id:3,kisFillId:'same',qty:2};
  const local={kisIsaSettlement:{x:1},txns:[normal,journalLike,protectedTxn]};
  const remote={kisIsaSettlement:{x:1},txns:[{...protectedTxn}]};
  const first=adoptServerProtectedKis(local,remote);
  assert.deepEqual(first.state.txns,[normal,journalLike,protectedTxn]);
  assert.deepEqual(first.dropped,{});
  const second=adoptServerProtectedKis(first.state,remote);
  assert.deepEqual(second.state,first.state);
  assert.deepEqual(second.dropped,{});
});
test('삭제 tombstone은 반대편에 남은 일지를 재등장시키지 않는다',()=>{
  const merged=mergeJournalTags({journal:[],journalDeletedIds:['gone']},{journal:[{id:'gone',content:'deleted'}]});
  assert.deepEqual(merged.journal,[]);assert.deepEqual(merged.journalDeletedIds,['gone']);
});
test('tombstone 없는 상대편 snapshot은 기존 삭제와 구별하지 않고 로컬 일지를 보존한다',()=>{
  const merged=mergeJournalTags({journal:[{id:8}]},{journal:[]});
  assert.equal(merged.journal[0].id,8);
});
test('일지와 태그 merge는 멱등이다',()=>{
  const first=mergeJournalTags({journal:[{id:1,createdAt:'2026-09-21T07:00:00Z'}],tags:['a'],tagColors:{a:'#111'}},{journal:[{id:2}],tags:['b'],tagColors:{b:'#222'}});
  assert.deepEqual(mergeJournalTags(first,first),first);
});
