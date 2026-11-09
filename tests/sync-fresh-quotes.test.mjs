import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {shouldSkipBackgroundRefresh} from '../src/background-refresh.js';

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

test('automatic portfolio quotes refresh on the visible 60-second fresh path only', () => {
  assert.doesNotMatch(automaticRefresh, /loadFromCloud/);
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/setInterval\(refreshVisibleQuotes,60000\)/);
  assert.match(main,/loadFromCloud\(false,\{fresh:true\}\)/);
  assert.match(main,/visible:document\.visibilityState==='visible'/);
  assert.match(main,/tag==='INPUT'\|\|tag==='TEXTAREA'\|\|tag==='SELECT'/);
  assert.match(main,/modalOpen=!!S\.modal\|\|!!document\.querySelector\('\.modal-bg'\)/);
  assert.match(cloud,/setTimeout\(\(\)=>loadFromCloud\(false,\{fresh:true\}\),0\)/);
  assert.match(cloud,/if\(_loadPromise\)return _loadPromise/);
});

test('background refresh skips any unsafe screen state',()=>{
  const base={visible:true,inFlight:false,saving:false,localEditPending:false,typing:false,modalOpen:false};
  assert.equal(shouldSkipBackgroundRefresh(base),false);
  for(const key of ['inFlight','saving','localEditPending','typing','modalOpen'])assert.equal(shouldSkipBackgroundRefresh({...base,[key]:true}),true,key);
  assert.equal(shouldSkipBackgroundRefresh({...base,visible:false}),true);
});
