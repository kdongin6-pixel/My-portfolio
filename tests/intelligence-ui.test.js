const {test}=require('node:test');
const assert=require('assert');
const fs=require('fs');
const intelligence=fs.readFileSync('src/intelligence.js','utf8');
const views=fs.readFileSync('src/views.js','utf8');
const styles=fs.readFileSync('src/styles.css','utf8');

test('integrated intelligence module defines thesis profiles and falsifiers',()=>{
  assert.match(intelligence,/THESIS_PROFILES/);
  assert.match(intelligence,/CME/);
  assert.match(intelligence,/falsifiers/);
  assert.match(intelligence,/GOOGL/);
});

test('stress test is tag based and keeps leverage separate',()=>{
  assert.match(intelligence,/STRESS_SHOCKS/);
  assert.match(intelligence,/레버리지·지수/);
});

test('analysis view exposes thesis cards, stress, and cycle monitor',()=>{
  assert.match(views,/종목별 논지 카드/);
  assert.match(views,/스트레스 테스트/);
  assert.match(views,/AI·반도체·전력·금융 사이클/);
  assert.match(views,/calcStress/);
  assert.match(views,/cycleCards/);
});

test('mobile styles cover integrated cards',()=>{
  assert.match(styles,/intel-thesis/);
  assert.match(styles,/analysis-mini-grid/);
  assert.match(styles,/max-width:480px/);
});
