const {test} = require('node:test');
const assert = require('assert');
const fs = require('fs');

const css = fs.readFileSync('src/styles.css', 'utf8');
const views = fs.readFileSync('src/views.js', 'utf8');

test('mobile UI has a safe-area aware bottom navigation', () => {
  assert.match(css, /\.tabs\{[^}]*padding-bottom:env\(safe-area-inset-bottom\)/s);
  assert.match(css, /#app\{[^}]*padding-bottom:/s);
});

test('mobile UI reserves 44px touch targets for controls', () => {
  assert.match(css, /\.flt[^}]*min-height:44px/s);
  assert.match(css, /\.cbtn[^}]*min-height:44px/s);
  assert.match(css, /\.hdr-btn[^}]*min-height:44px/s);
});

test('mobile UI uses a compact two-column summary and card grid', () => {
  assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.asset-cards[^{]*\{[^}]*grid-template-columns:\s*1fr\s+1fr/s);
  assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.card-grid[^{]*\{[^}]*grid-template-columns:\s*1fr\s+1fr/s);
});

test('modal fields prevent iOS input zoom', () => {
  assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.field input[^}]*font-size:\s*16px/s);
});

test('portfolio exposes the core mobile actions', () => {
  assert.match(views, /id="btnAdd"/);
  assert.match(views, /id="btnShot"/);
  assert.match(views, /data-tab="trend"/);
});
