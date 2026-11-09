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
  assert.equal(cache,'pf-cache-v11-20261110-isa-live');
});
