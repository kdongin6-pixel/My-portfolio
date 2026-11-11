import test from 'node:test';
import assert from 'node:assert/strict';
import {dataNotice} from '../src/holdings-ui.js';

const state={stocks:[],rate:1342.28,readStatus:'success',updatedAt:'2026-11-11T19:44:00Z'};
test('estimated FX warning remains visible and full timestamps remain in details',()=>{
 const html=dataNotice(state,true), summary=html.split('</summary>')[0];
 assert.match(summary,/환율 1,342\.28 \(추정\) · 시세 0\/0/);
 assert.match(summary,/notice-warning/);
 assert.doesNotMatch(summary,/원장 갱신|UTC/);
 assert.match(html,/원장 갱신 2026-11-12 04:44 \(KST\) · 기준 2026-11-11 19:44 \(UTC\)/);
 assert.match(html,/기준시각 미확인 · 추정 환율/);
});
test('known FX time and failed quote warnings retain their detail',()=>{
 const html=dataNotice({...state,rateAsOf:'2026-11-11T19:44:00Z',readStatus:'error'},true);
 assert.match(html.split('</summary>')[0],/환율 04:44/);
 assert.match(html,/aria-label="조회 실패/);
 assert.match(html,/기준 2026-11-12 04:44 \(KST\)/);
});
