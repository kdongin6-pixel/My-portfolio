import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('release worker cache name differs from saved live name',async()=>{
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  const cache=sw.match(/const CACHE='([^']+)'/)?.[1];
  assert.ok(cache);
  assert.notEqual(cache,'pf-cache-v5-20261109-account-labels');
  assert.notEqual(cache,'pf-cache-v6-20261110-release1-saving');
  assert.notEqual(cache,'pf-cache-v10-20261110-live-account');
  assert.notEqual(cache,'pf-cache-v15-20261112-ui-calm');
  assert.notEqual(cache,'pf-cache-v17-20261117-ui-polish');
  assert.notEqual(cache,'pf-cache-v18-20261117-benchmark');
  assert.notEqual(cache,'pf-cache-v0.19.0-ui-overhaul-1');
  assert.notEqual(cache,'pf-cache-v20-20261118-ui-overhaul-2');
  assert.notEqual(cache,'pf-cache-v21-20261118-market-grid');
  assert.notEqual(cache,'pf-cache-v21-20261118-settings-keep');
  assert.equal(cache,'pf-cache-v21-20261118-no-flash');
});
