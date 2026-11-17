import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('render keeps modal inputs, focus and scroll across background re-renders',async()=>{
  const src=await readFile(new URL('../src/render.js',import.meta.url),'utf8');
  assert.ok(src.indexOf('captureView()')<src.indexOf('app.innerHTML=""'));
  assert.ok(src.indexOf('mkModal()')<src.indexOf('restoreView(keep)'));
  assert.ok(src.includes('.modal-bg input[id]'));
  assert.ok(src.includes('window.scrollTo(0,keep.scrollY)'));
});

test('sync banner timeout removes the banner without a full re-render',async()=>{
  const src=await readFile(new URL('../src/render.js',import.meta.url),'utf8');
  const timer=src.slice(src.indexOf('_syncMsgTimer=setTimeout'));
  assert.ok(timer.slice(0,120).includes(".msg-sync')?.remove()"));
  assert.ok(!timer.slice(0,120).includes('render()'));
});
