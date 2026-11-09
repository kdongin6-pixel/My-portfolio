import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisExport} from '../src/portfolio-export.js';
// Synthetic fixtures only.
test('analysis export allowlists fields, protects CSV formulas, covers cash and leaves ledger immutable',()=>{
 const state={readStatus:'success',rate:1400,updatedAt:'2026-11-09T00:00:00Z',secret:'NEVER',accountNumber:'NEVER',stocks:[{id:1,name:'=HYPERLINK("bad")',ticker:'TEST',acct:'ISA',curr:'KRW',qty:2,avg:80,cur:100,sourceId:'NEVER',_quoteMetadata:{quoteSource:'meritz-openapi',quoteObservedAt:null,quoteRequestedAt:new Date().toISOString()}},{name:'Synthetic missing',acct:'메리츠증권',curr:'USD',qty:3,avg:10,cur:0}],cash:{ISA:{KRW:40,USD:0}},txns:[{sourceId:'NEVER'}]};
 const before=structuredClone(state);const result=analysisExport(state,'전체');
 assert.deepEqual(state,before);assert.doesNotMatch(result.csv,/NEVER|sourceId|accountNumber|secret/);assert.doesNotMatch(result.text,/NEVER|sourceId/);
 assert.match(result.csv,/'=HYPERLINK/);assert.match(result.csv,/시세 1\/2/);assert.match(result.csv,/부분 합계/);assert.match(result.csv,/cash/);assert.match(result.text,/1\/2/);assert.match(result.text,/관측 미제공/);assert.match(result.text,/조회 /);
 assert.equal(result.rows[1].price,null);assert.equal(result.rows[1].valueKRW,null);assert.equal(result.rows[0].weight,null);
 assert.match(result.text,/추정 환율/);assert.match(result.text,/계좌조회 별도 승인/);
});
test('account filter applies to both stock rows and cash export',()=>{
 const s={stocks:[],cash:{ISA:{KRW:7},메리츠증권:{USD:99}},rate:1400};const r=analysisExport(s,'ISA');assert.match(r.csv,/7/);assert.doesNotMatch(r.csv,/99/);
});
