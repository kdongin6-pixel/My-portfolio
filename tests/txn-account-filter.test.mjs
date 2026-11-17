import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('transaction tab has per-account filter buttons and account badge',async()=>{
  const views=await read('../src/views.js');
  for(const key of ['전체','메리츠증권','ISA'])assert.ok(views.includes(`['${key}'`),`filter ${key}`);
  assert.match(views,/data-txnacct="\$\{key\}"/);
  assert.match(views,/S\.txns\.filter\(t=>t\.acct===cur\)/);
  assert.match(views,/return root;/);
});

test('filter state defaults to all and click handler re-renders',async()=>{
  assert.match(await read('../src/state.js'),/txnAcct:"전체"/);
  assert.match(await read('../src/bind.js'),/data-txnacct\]"\)\.forEach[\s\S]{0,120}S\.txnAcct=el\.dataset\.txnacct;render\(\)/);
});
