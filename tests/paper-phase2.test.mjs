import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const rule=selector=>html.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\{([^}]*)\\}'))?.[1]||'';

test('phone dashboard has compact two-column stats and reserves the fixed navigation height',()=>{
 assert.match(html,/@media\s*\(max-width:\s*899px\)/);
 assert.match(rule('.paper-stats'),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(rule('.paper-stats .asset-card:first-child'),/grid-column:auto/);
 assert.match(rule('.paper-stats .asset-card'),/padding:12px/);
 assert.match(rule('#app'),/padding-bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
});

test('phone holdings use explicit left and right columns while desktop headers stay aligned',()=>{
 for(const [selector,area] of [['.paper-table tbody td:nth-child(1)','1 / 1'],['.paper-table tbody td:nth-child(2)','2 / 1'],['.paper-table tbody td:nth-child(3)','1 / 2'],['.paper-table tbody td:nth-child(4)','2 / 2']]) assert.ok(rule(selector).includes('grid-area:'+area),selector);
 assert.match(rule('.paper-table tbody td:nth-child(2)'),/font-size:12px/);
 assert.match(rule('.paper-table tbody td:nth-child(3)'),/text-align:right/);
 assert.match(rule('.paper-table tbody td:nth-child(4)'),/text-align:right/);
 assert.match(rule('.paper-table th'),/position:sticky/);
});

test('shared paper primitives use theme tokens and responsive grid',()=>{
 for(const selector of ['.paper-card','.paper-section-heading','.paper-input','.paper-button','.paper-button-accent','.paper-gain','.paper-loss','.paper-nums','.paper-grid']) assert.ok(rule(selector),selector);
 assert.match(rule('.paper-card'),/background:var\(--surface\).*border:1px solid var\(--border\)/);
 assert.match(rule('.paper-button-accent'),/background:var\(--accent\)/);
 assert.match(rule('.paper-gain'),/color:var\(--gain\)/);
 assert.match(rule('.paper-loss'),/color:var\(--loss\)/);
 assert.match(rule('.paper-nums'),/tabular-nums/);
 assert.match(html,/\.paper-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
});
