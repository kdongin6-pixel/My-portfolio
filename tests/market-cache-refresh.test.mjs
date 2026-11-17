import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('market load paints the cached copy, then refreshes quietly when it is old',async()=>{
  const src=await readFile(new URL('../src/cloud.js',import.meta.url),'utf8');
  assert.match(src,/mode:"market",\.\.\.\(force\?\{refresh:true\}:\{\}\)/);
  assert.match(src,/refreshAfter=!force&&!\(age<MARKET_STALE_MS\)/);
  assert.match(src,/setTimeout\(\(\)=>loadMarketData\(true,\{quiet:true\}\),0\)/);
  assert.match(src,/S\.marketAsOf=data\.asOf\|\|null/);
});

test('market tab keeps existing data on screen while a refresh runs',async()=>{
  const src=await readFile(new URL('../src/market-ui.js',import.meta.url),'utf8');
  assert.match(src,/if\(S\.marketLoading&&!\(S\.marketData&&S\.marketData\.length\)\)/);
  assert.match(src,/S\.marketAsOf/);
});
