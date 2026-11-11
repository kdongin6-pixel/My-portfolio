import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('typography uses offline Korean system fallbacks and tabular figures',()=>{
  assert.match(css,/font-family:system-ui,'Apple SD Gothic Neo',Pretendard,'Noto Sans KR','Malgun Gothic',sans-serif/);
  assert.match(css,/font-variant-numeric:tabular-nums/);
  assert.match(css,/\.hero-total\{font-size:2rem;line-height:1\.15;font-weight:850/);
  assert.doesNotMatch(css,/@import|@font-face/);
});

test('compact holding values and market labels can wrap without ellipsis',()=>{
  assert.match(css,/\.compact-holding\{flex-wrap:wrap\}/);
  assert.match(css,/\.holding-name\{flex:1 1 10rem\}/);
  assert.match(css,/\.gs-name,\.gs-sub\{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere\}/);
  assert.match(css,/\.mkt2-idx-price,\.mkt2-rate-price,\.mkt2-tech-price,\.calendar-event small\{white-space:normal;overflow-wrap:anywhere\}/);
});

test('static typography declarations have a 12px floor',()=>{
  for(const file of ['../src/styles.css','../src/views.js','../src/market-ui.js']){
    const text=readFileSync(new URL(file,import.meta.url),'utf8');
    for(const m of text.matchAll(/font-size\s*:\s*((?:\d*\.)?\d+)(em|rem|px)(?=[;}"'])/g)){
      assert.ok(Number(m[1]) >= (m[2]==='px'?12:1),`${file}: ${m[0]}`);
    }
  }
});
