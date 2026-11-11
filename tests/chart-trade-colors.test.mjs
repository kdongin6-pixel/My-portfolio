import test from 'node:test';
import assert from 'node:assert/strict';
import {priceHistoryPanel} from '../src/holdings-ui.js';
const stock={id:1,name:'Synthetic fixture',ticker:'TEST',acct:'ISA',curr:'KRW',qty:1,avg:90,cur:100};
const history=[{date:'2026-01-01',price:90},{date:'2026-01-03',price:100}];
const state={priceHistory:{TEST:history},priceHistorySource:'Synthetic test provider',txns:[{ticker:'TEST',acct:'ISA',date:'2026-01-01',mode:'buy',qty:2,price:90},{ticker:'TEST',acct:'ISA',date:'2026-01-03',mode:'sell',qty:1,price:100}]};
test('chart colors each ledger marker by its own buy or sell direction without mutating inputs',()=>{
 const before=JSON.stringify({state,stock});
 const html=priceHistoryPanel(state,stock);
 const circles=[...html.matchAll(/<circle\b[^>]*>[\s\S]*?<\/circle>/g)].map(m=>m[0]);
 assert.equal(circles.length,2);
 assert.match(circles[0],/data-trade="buy"/);
 assert.match(circles[0],/fill="var\(--chart-buy\)"/);
 assert.match(circles[0],/원장 매수 2026-01-01/);
 assert.match(circles[1],/data-trade="sell"/);
 assert.match(circles[1],/fill="var\(--chart-sell\)"/);
 assert.match(circles[1],/원장 매도 2026-01-03/);
 assert.equal(JSON.stringify({state,stock}),before);
});
test('sourced chart explains red buy and blue sell in a visible text legend',()=>{
 const html=priceHistoryPanel(state,stock);
 assert.match(html,/class="trade-legend"[^>]*aria-label="매매 표시 범례"/);
 assert.match(html,/class="trade-key buy"[^>]*>[\s\S]*?매수 \(빨강\)/);
 assert.match(html,/class="trade-key sell"[^>]*>[\s\S]*?매도 \(파랑\)/);
 assert.doesNotMatch(priceHistoryPanel({...state,priceHistory:{}},stock),/class="trade-legend"/);
});
