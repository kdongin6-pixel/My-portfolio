import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const views=readFileSync(new URL('../src/views.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const bind=readFileSync(new URL('../src/bind.js',import.meta.url),'utf8');

test('drawer keeps navigation above independently scrollable holdings and compact actions',()=>{
  const drawer=views.slice(views.indexOf('export function mkTabs()'),views.indexOf('function sortedHoldings'));
  assert.ok(drawer.indexOf('drawer-summary')<drawer.indexOf('drawer-nav'));
  assert.ok(drawer.indexOf('drawer-nav')<drawer.indexOf('drawer-holdings'));
  assert.equal((drawer.match(/data-tab=/g)||[]).length,8);
  for(const id of ['btnAdd','btnShot','btnSettings','btnAnalysisCopy','btnAnalysisCsv','drawerSort','drawerSortDir'])assert.ok(drawer.includes(id),id);
  assert.match(css,/\.drawer-holdings-scroll\{[^}]*overflow:auto/);
  assert.match(css,/\.drawer\{display:flex;flex-direction:column;overflow:hidden\}/);
  assert.match(bind,/holdingsScrollTop=holdingsScroll\.scrollTop/);
  assert.match(bind,/details:not\(\[open\]\)/);
});
