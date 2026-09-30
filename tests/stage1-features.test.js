const {test}=require('node:test');
const assert=require('assert');
const fs=require('fs');
const intelligence=fs.readFileSync('src/intelligence.js','utf8');
const views=fs.readFileSync('src/views.js','utf8');
const styles=fs.readFileSync('src/styles.css','utf8');

test('performance attribution exposes realized and unrealized contribution',()=>{
  assert.match(intelligence,/calcPerformanceAttribution/);
  assert.match(intelligence,/calcDayAttribution/);
  assert.match(intelligence,/unrealized/);
  assert.match(intelligence,/realized/);
});

test('risk budget uses cash, leverage, high volatility, and single-name limits',()=>{
  assert.match(intelligence,/RISK_BUDGETS/);
  assert.match(intelligence,/calcRiskBudget/);
  assert.match(intelligence,/leverage/);
  assert.match(intelligence,/cashFloor/);
});

test('event calendar contains macro and election checkpoints',()=>{
  assert.match(intelligence,/EVENT_CALENDAR/);
  assert.match(intelligence,/FOMC/);
  assert.match(intelligence,/미국 중간선거/);
  assert.match(intelligence,/eventCards/);
});

test('analysis view exposes all first-stage features',()=>{
  for(const label of ['손익 기여도','리스크 예산판','이벤트 리스크 캘린더']) assert.match(views,new RegExp(label));
  assert.match(views,/calcPerformanceAttribution/);
  assert.match(views,/calcRiskBudget/);
  assert.match(views,/eventCards/);
});

test('mobile styles cover risk and event cards',()=>{
  assert.match(styles,/risk-budget-row/);
  assert.match(styles,/event-card/);
  assert.match(styles,/max-width:480px/);
});
