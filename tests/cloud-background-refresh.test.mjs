import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(new URL('../src/cloud.js',import.meta.url),'utf8');
function makeCloud(fetcher){
  const calls={render:0,badge:0,applyQuote:0};
  const S={readStatus:'success',cloudStatus:'saved',syncMsg:'',stocks:[]};
  const badge={style:{},textContent:''};
  const context=vm.createContext({S,getApiUrl:()=>'/mock',getApiSecret:()=> 'mock',fetch:fetcher,render(){calls.render++;},applyQuoteResponse(){calls.applyQuote++;},document:{getElementById(){calls.badge++;return badge;}},setInterval(){},console,Date});
  const executable=source.replace(/^import .*;\s*$/mg,'').replace(/\bexport\s+/g,'')+'\nglobalThis.runLoad=loadFromCloud;';
  new vm.Script(executable).runInContext(context);
  return{run:context.runLoad,S,calls,badge};
}

test('background cloud load never renders loading or error screen and preserves read status on failure',async()=>{
  let rejectFetch;
  const cloud=makeCloud(()=>new Promise((_,reject)=>{rejectFetch=reject;}));
  const pending=cloud.run(false,{fresh:true});
  assert.equal(cloud.S.readStatus,'success');
  assert.equal(cloud.S.cloudStatus,'saving');
  assert.equal(cloud.calls.render,0);
  assert.match(cloud.badge.textContent,/동기화 중/);
  rejectFetch(new Error('mock network failure'));
  await pending;
  assert.equal(cloud.S.readStatus,'success');
  assert.equal(cloud.S.cloudStatus,'error');
  assert.match(cloud.S.syncMsg,/원장 조회 실패/);
  assert.equal(cloud.calls.render,0);
  assert.match(cloud.badge.textContent,/동기화 실패/);
  assert.equal(cloud.calls.applyQuote,0);
});

test('foreground cloud load retains visible loading and error rendering',async()=>{
  const cloud=makeCloud(async()=>{throw new Error('mock network failure');});
  await cloud.run(true);
  assert.equal(cloud.S.readStatus,'error');
  assert.equal(cloud.calls.render,2);
  assert.equal(cloud.calls.applyQuote,1);
});
