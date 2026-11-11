import test from 'node:test';import assert from 'node:assert/strict';
import {holdingCards,holdingDetail,dataNotice,marketImpact,priceHistoryPanel} from '../src/holdings-ui.js';
const s={id:1,name:'<Synthetic>',ticker:'TEST',acct:'ISA',curr:'KRW',qty:2,avg:80,cur:100,tag:'성장'};
const state={stocks:[s],cash:{ISA:{KRW:0}},rate:1400,readStatus:'success',txns:[]};
test('holdings expose quantity cost quote currency and provenance without order controls or false zero',()=>{
 const h=holdingCards(state,[s,{...s,id:2,cur:0}]);
 assert.match(h,/data-detail/); assert.match(h,/ISA/); assert.match(h,/25%/); assert.match(h,/시세 미확인/); assert.doesNotMatch(h,/<Synthetic>|data-mode="buy"|data-mode="sell"|LIVE/);
 const d=holdingDetail(state,s); for(const word of ['수량','평단','조회가격','KRW','원가 대비','비중','거래시각 미제공','출처 미확인'])assert.ok(d.includes(word),word);
 assert.match(holdingDetail(state,{...s,cur:0}),/가격 미확인/);assert.match(dataNotice({...state,readStatus:'error'},true),/이전/);
 assert.match(d,/role="dialog"/);assert.match(d,/aria-modal="true"/);assert.match(d,/aria-label="닫기"/);assert.match(d,/원장 기록/);assert.match(d,/실계좌 탭/);assert.doesNotMatch(d,/계좌조회 별도 승인|계좌조회 없음/);
});
test('cached Meritz quote labels distinguish confirmed recent and older prices',()=>{
 const recent={...s,_quoteMetadata:{quoteSource:'meritz-openapi-cache',quoteRequestedAt:new Date().toISOString(),cached:true}};
 const old={...recent,_quoteMetadata:{...recent._quoteMetadata,quoteRequestedAt:new Date(Date.now()-11*60*1000).toISOString()}};
 assert.match(holdingDetail({...state,stocks:[recent]},recent),/0분 전 확인 시세/);
 assert.match(holdingDetail({...state,stocks:[old]},old),/이전 시세 · 11분 전/);
 assert.match(holdingCards({...state,stocks:[old]},[old]),/시세 미확인/);
});
test('stock history uses sourced price points only and no fabricated sparkline',()=>{
 assert.match(priceHistoryPanel(state,s),/가격 이력 없음/);assert.doesNotMatch(priceHistoryPanel({...state,snapshots:[{date:'2026-01-01',totalKRW:100}]},s),/<svg/);
 const history=[{date:'2026-01-01',price:90},{date:'2026-01-02',price:100}];
 const h=priceHistoryPanel({...state,txns:[{name:s.name,acct:'ISA',date:'2026-01-02',mode:'buy',qty:1,price:99}],events:[{ticker:'TEST',date:'2026-01-02',title:'Synthetic official',source:'issuer',asOf:'2026-01-01'}]}, {...s,priceHistory:history,priceHistorySource:'Synthetic provider'});
 assert.match(h,/<svg/);assert.match(h,/원장 매수/);assert.match(h,/Synthetic official/);assert.match(h,/수정주가.*미확인/);assert.match(h,/종목 가격/);
});
test('session detail defaults to summary and escapes transaction and journal content',()=>{
 const h=holdingDetail({...state,txns:[{name:s.name,acct:'ISA',date:'<date>',mode:'buy',qty:1,price:99}],journal:[{stockName:s.name,date:'2026-01-01',content:'<memo>'}]},s);
 assert.match(h,/<details class="session-section" open><summary aria-expanded="true">요약/);
 assert.match(h,/<summary aria-expanded="false">거래내역/);
 assert.match(h,/<summary aria-expanded="false">시세·차트/);
 assert.match(h,/<summary aria-expanded="false">일지·메모/);
 assert.match(h,/&lt;date&gt;/);assert.match(h,/&lt;memo&gt;/);assert.doesNotMatch(h,/<memo>|<date>/);
 assert.doesNotMatch(holdingDetail(state,s),/일지·메모/);
});
test('market impact uses actual holding tags and separates source/asOf from query time',()=>{
 const h=marketImpact(state,[{key:'T10Y',price:4.2,source:'Treasury',asOf:'2026-01-01'},{key:'USDKRW',price:1400}]);
 for(const t of ['성장','할인율','원화 환산','Treasury','2026-01-01','기준시각 미확인','자동매매'])assert.ok(h.includes(t),t);
});
