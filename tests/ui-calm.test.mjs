import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('drawer navigation has decorative SVG icons and unchanged tab identifiers',async()=>{
  const src=await readFile(new URL('../src/views.js',import.meta.url),'utf8');
  for(const tab of ['list','chart','trend','analysis','broker','market','journal','txn']){
    assert.match(src,new RegExp(`data-tab="${tab}"`));
    assert.ok(src.includes(`navIcon('${tab}')`));
  }
  assert.match(src,/class="nav-icon" aria-hidden="true"/);
});

test('zoom remains enabled and infinite pulse is absent',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  assert.doesNotMatch(html,/maximum-scale\s*=/i);
  assert.doesNotMatch(css,/animation\s*:[^;}]*\binfinite\b/i);
  assert.match(css,/button:focus-visible/);
});
