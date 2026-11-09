const fs=require('fs');
const vm=require('vm');
const test=require('node:test');
const assert=require('node:assert/strict');
const source=fs.readFileSync('src/trades.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');
test('journal deletion records a tombstone before saving',()=>{
  const state={journal:[{id:7}],journalDeletedIds:[]};let saved=0,rendered=0;
  const context=vm.createContext({S:state,confirm:()=>true,save:()=>saved++,render:()=>rendered++,alert(){},Date});
  vm.runInContext(source,context);context.delJournal(7);
  assert.equal(JSON.stringify(state.journal),JSON.stringify([]));assert.equal(JSON.stringify(state.journalDeletedIds),JSON.stringify(['7']));assert.equal(saved,1);assert.equal(rendered,1);
});
