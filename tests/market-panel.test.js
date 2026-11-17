import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.localStorage={getItem:()=>null};
globalThis.document={visibilityState:'visible',addEventListener(){},createElement:()=>({innerHTML:'',className:''})};
const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
const {S}=await import('../src/state.js');
const {mkList}=await import('../src/views.js');
const {mkMarket,mkTodayStrip}=await import('../src/market-ui.js');
globalThis.setInterval=interval;
const keys=['IXIC','SPX','KOSPI','VIX','DXY','USDKRW','GOLD','BTC'];
test('dashboard always displays eight market entries and navigates using existing action',()=>{
  S.stocks=[];S.readStatus='success';S.marketData=null;
  let html=mkList().innerHTML;assert.equal((html.match(/class="market-panel-item"/g)||[]).length,8);assert.equal((html.match(/class="market-panel-value">—/g)||[]).length,8);assert.match(html,/data-goto-market/);assert.equal(mkTodayStrip(),'');
  S.marketData=keys.map((key,i)=>({key,price:100+i,daily:1}));html=mkList().innerHTML;
  assert.equal((html.match(/class="market-panel-item"/g)||[]).length,8);assert.doesNotMatch(html,/class="market-panel-value">—/);assert.match(html,/BTC/);
  S.marketData=[{key:'IXIC',price:null}];assert.equal(mkTodayStrip(),'');
});
test('market empty, loading and populated output has no emoji and sector tiles reflect data',()=>{
  S.stocks=[];
  for(const data of [null,[],[{key:'XLK',price:20,daily:1.234},{key:'XLB',price:30,daily:-2},{key:'XLY',price:1,daily:null}]]){
    S.marketData=data;S.marketLoading=false;const html=mkMarket().innerHTML;
    assert.doesNotMatch(html,/[\p{Extended_Pictographic}\uFE0F]/u);assert.match(html,/id="btnMktRefresh"/);
    if(!data?.length)assert.match(html,/시장 데이터를 불러오지 못했습니다/);
    else {assert.equal((html.match(/class="sector-tile"/g)||[]).length,11);for(const s of ['#c23b32','#2f63b5','#8b8984','+1.23%','-2.00%','기술','소재'])assert.ok(html.includes(s),s);}
  }
  S.marketLoading=true;assert.doesNotMatch(mkMarket().innerHTML,/[\p{Extended_Pictographic}\uFE0F]/u);S.marketLoading=false;
});
test('responsive market grid and single navigation icon rules',()=>{
 const css=readFileSync('src/styles.css','utf8');assert.match(css,/\.market-grid\{[^}]*repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/@media\(min-width:900px\)[\s\S]*?\.market-grid\{[^}]*repeat\(4,minmax\(0,1fr\)\)/);assert.doesNotMatch(css,/\.tabs>\.more-menu>summary::before\{content:/);assert.match(css,/\.mkt-refresh-btn\.paper-button-accent\{[^}]*color:/);
});
