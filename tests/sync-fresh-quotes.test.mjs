import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cloud = fs.readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
const loadFromCloud = cloud.match(/export async function loadFromCloud\(showAlert,options=\{\}\)\s*\{([\s\S]*?)\n\}/)?.[1];
const automaticRefresh = cloud.match(/export function scheduleAutoRefresh\(\)\s*\{([\s\S]*?)\n\}/)?.[1];

assert.ok(loadFromCloud, 'loadFromCloud function should exist');
assert.ok(automaticRefresh, 'scheduleAutoRefresh function should exist');

test('manual portfolio sync opts into fresh quotes', () => {
  assert.match(loadFromCloud, /freshQuotes\s*:\s*fresh/);
  assert.match(loadFromCloud, /options\.fresh\?\?!!showAlert/);
  assert.match(cloud, /syncSheets\(\)\s*\{\s*await loadFromCloud\(true\)/);
});

test('automatic refresh performs a fresh quote load', () => {
  assert.match(automaticRefresh, /loadFromCloud\(false\)/);
  assert.match(cloud,/setTimeout\(\(\)=>loadFromCloud\(false,\{fresh:true\}\),0\)/);
  assert.match(cloud,/if\(_loadPromise\)return _loadPromise/);
});
