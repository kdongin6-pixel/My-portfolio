const {test} = require('node:test');
const assert = require('assert');
const fs = require('fs');

const views = fs.readFileSync('src/views.js', 'utf8');
const render = fs.readFileSync('src/render.js', 'utf8');
const bind = fs.readFileSync('src/bind.js', 'utf8');
const state = fs.readFileSync('src/state.js', 'utf8');
const constants = fs.readFileSync('src/constants.js', 'utf8');

test('analysis tab is registered in state, render, and navigation', () => {
  assert.match(state, /tab:"list"/);
  assert.match(render, /S\.tab==="analysis"/);
  assert.match(views, /data-tab="analysis"/);
  assert.match(bind, /data-tab/);
});

test('analysis view exposes TWR approximation, risk, thesis, and taxonomy sections', () => {
  assert.match(views, /시간가중수익률/);
  assert.match(views, /최대낙폭/);
  assert.match(views, /투자논지/);
  assert.match(views, /태그별 노출/);
});

test('default taxonomy separates leverage, infrastructure, and defensive roles', () => {
  assert.match(constants, /AI·데이터센터/);
  assert.match(constants, /레버리지·개별주/);
  assert.match(constants, /초단기채·현금성/);
  assert.match(constants, /배당·방어/);
});
