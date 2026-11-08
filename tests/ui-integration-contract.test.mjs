import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('read state and pure quote adapter are wired into sync without average-price fallback',()=>{
 const c=read('src/cloud.js');assert.match(c,/applyQuoteResponse\(S,data,/);assert.match(c,/S\.readStatus="loading"/);assert.match(c,/S\.readStatus="success"/);assert.match(c,/S\.readStatus="error"/);assert.doesNotMatch(c,/cur:s\.cur\|\|s\.avg/);assert.match(c,/S\.rateAsOf=data\.rateAsOf\|\|null/);
});
test('holdings experience and export controls are wired to real app',()=>{
 const v=read('src/views.js'),b=read('src/bind.js');assert.doesNotMatch(v,/⚡ LIVE/);assert.match(v,/holdingCards\(S,sorted\)/);assert.match(v,/holdingDetail\(S,s\)/);assert.match(v,/dataNotice\(S,/);assert.match(b,/navigator\.clipboard\.writeText/);assert.match(b,/analysisExport\(S,S\.acct\)/);assert.match(b,/text\/csv/);assert.match(b,/Escape/);assert.match(b,/Tab/);assert.match(v,/원장 기록/);
});
test('incomplete valuation is not passed off as complete analysis or allocation',()=>{
 const v=read('src/views.js');assert.match(v,/valuationUnavailable\(\)/);assert.match(v,/function valuationUnavailable/);assert.match(v,/function mkAnalysis\(\)\{[\s\S]*?if\(valuationUnavailable\(\)\)/);
});
test('market charts have no generated fallback and snapshots reject incomplete quotes',()=>{
 const m=read('src/market-ui.js'),s=read('src/state.js');assert.doesNotMatch(m,/1664525|근사 곡선|mkGaugeSvg\(fg.score/);assert.match(m,/marketImpact\(S,mdata\)/);assert.match(s,/canSnapshot\(\)/);assert.match(s,/quoteInfo/);
});
