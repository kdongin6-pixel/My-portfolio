import test from 'node:test';
import assert from 'node:assert/strict';
import {displayKst} from '../src/portfolio-read.js';
import {dataNotice,provenance,marketImpact} from '../src/holdings-ui.js';
import {brokerAccountHTML} from '../src/broker-account.js';

const iso='2026-11-11T02:55:40.982Z', expected='2026-11-11 11:55 (KST)';
test('KST instant formatting is independent of device zone, handles rollover and offsets',()=>{
 const previous=process.env.TZ;
 try { for(const zone of ['UTC','America/Los_Angeles','Asia/Seoul']) { process.env.TZ=zone; assert.equal(displayKst(iso),expected);assert.equal(displayKst('2026-11-11T18:30:00Z'),'2026-11-12 03:30 (KST)');assert.equal(displayKst('2026-11-11T04:55:00+02:00'),expected); } }
 finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('invalid, missing and ambiguous timestamps use fallback; date-only stays date-only',()=>{
 for(const v of [null,'','invalid','2026-11-11T02:55:00','2026-13-01T00:00:00Z','2026-02-30T00:00:00Z'])assert.equal(displayKst(v),'미확인');
 assert.equal(displayKst(null,'미조회'),'미조회');assert.equal(displayKst('2026-11-11'),'2026-11-11');
});
test('ledger, FX, quote and market displays use KST without mutating input',()=>{
 const state={stocks:[],rate:1400,readStatus:'success',updatedAt:iso,rateAsOf:iso};const before=JSON.stringify(state);
 const notice=dataNotice(state,true);assert.match(notice,/원장 갱신 2026-11-11 11:55 \(KST\)/);assert.match(notice,/기준 2026-11-11 11:55 \(KST\)/);assert.equal(JSON.stringify(state),before);
 assert.match(dataNotice({...state,updatedAt:'bad',rateAsOf:'bad'},true),/원장 갱신 미확인.*기준시각 미확인/);
 assert.match(provenance({_quoteMetadata:{quoteObservedAt:iso,quoteRequestedAt:iso}}),/관측 2026-11-11 11:55 \(KST\).*조회 2026-11-11 11:55 \(KST\)/);
 assert.match(provenance({_quoteMetadata:{quoteObservedAt:'bad'}}),/거래시각 미제공/);
 assert.match(marketImpact(state,[{key:'USDKRW',asOf:iso}]),/기준 2026-11-11 11:55 \(KST\)/);
});
test('broker query and reference times show KST and invalid times show fallback',()=>{
 const section={status:'success',paginationComplete:true,queriedAt:iso,rows:[]};
 const snapshot={provider:'kis-openapi',queriedAt:iso,observedAt:iso,sections:{domesticHoldings:section,deposit:section,fills:section},period:{from:'2026-11-01',to:'2026-11-11'}};
 const before=JSON.stringify(snapshot),h=brokerAccountHTML({snapshot,provider:'kis'});
 assert.match(h,/마지막 조회 2026-11-11 11:55 \(KST\)/);assert.match(h,/REST 조회 2026-11-11 11:55 \(KST\)/);assert.match(h,/기준시각 2026-11-11 11:55 \(KST\)/);assert.doesNotMatch(h,/2026-11-11T02:55/);assert.equal(JSON.stringify(snapshot),before);
 assert.match(brokerAccountHTML({snapshot:{...snapshot,queriedAt:'bad',observedAt:'bad'},provider:'kis'}),/마지막 조회 미조회/);
});
