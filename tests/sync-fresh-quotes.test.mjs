import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cloud = fs.readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
const loadFromCloud = cloud.match(/export async function loadFromCloud\(showAlert\)\s*\{([\s\S]*?)\n\}/)?.[1];
const automaticRefresh = cloud.match(/export function scheduleAutoRefresh\(\)\s*\{([\s\S]*?)\n\}/)?.[1];

assert.ok(loadFromCloud, 'loadFromCloud function should exist');
assert.ok(automaticRefresh, 'scheduleAutoRefresh function should exist');

test('manual portfolio sync opts into fresh quotes', () => {
  assert.match(loadFromCloud, /mode\s*:\s*["']portfolio["'][^}]*freshQuotes\s*:\s*!!showAlert/);
  assert.match(loadFromCloud, /freshQuotes\s*:\s*!!showAlert/);
  assert.match(cloud, /syncSheets\(\)\s*\{\s*await loadFromCloud\(true\)/);
});

test('automatic refresh does not force quote-provider calls', () => {
  assert.match(automaticRefresh, /loadFromCloud\(false\)/);
});
