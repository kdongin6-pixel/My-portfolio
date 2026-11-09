import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../Code.gs',import.meta.url),'utf8');
function run(payload,initial={updatedAt:'r1',stocks:[],cash:{ISA:{KRW:1,USD:0}},txns:[],kisIsaSettlement:{amount:2,currency:'KRW',queriedAt:'2026-11-09T00:00:00Z'}}){
 let stored=JSON.stringify(initial),writes=0;
 const sheet={};const ss={getSheetByName:()=>sheet};
 const c=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>ss},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'secret'})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType(){return JSON.parse(s)}})},Logger:{log(){}}});
 vm.runInContext(code,c);c.readAppData_=()=>stored;c.writeAppData_=(s,d)=>{writes++;stored=JSON.stringify(d)};c.updateVisibleSheets=()=>{};c.checkSecret_=s=>s==='secret';
 const result=c.doPost({postData:{contents:JSON.stringify(payload)}});return {result,writes,stored:JSON.parse(stored)};
}
test('unknown action cannot fall through to full-state save',()=>{const r=run({_action:'unknown'});assert.equal(r.result.success,false);assert.equal(r.writes,0)});
test('unauthenticated legacy save cannot replace private state',()=>{const r=run({stocks:[],cash:{}});assert.equal(r.result.success,false);assert.equal(r.writes,0)});
test('stale authenticated browser save is rejected',()=>{const r=run({_action:'browser_save',auth:'secret',expectedRevision:'old',state:{stocks:[],cash:{}}});assert.equal(r.result.success,false);assert.equal(r.writes,0)});
test('matching revision preserves server-owned settlement from an old client',()=>{const r=run({_action:'browser_save',auth:'secret',expectedRevision:'r1',state:{stocks:[],cash:{ISA:{KRW:1,USD:0}},txns:[]}});assert.equal(r.result.success,true);assert.equal(r.stored.kisIsaSettlement.amount,2);assert.equal(r.writes,1)});
test('browser cannot delete or change a server-imported KIS fill',()=>{const state={updatedAt:'r1',stocks:[],cash:{ISA:{KRW:1,USD:0}},txns:[{id:'kis:a',kisFillId:'a',brokerImported:true,totalAmount:123}]};const r=run({_action:'browser_save',auth:'secret',expectedRevision:'r1',state:{stocks:[],cash:state.cash,txns:[]}},state);assert.equal(r.result.success,true);assert.equal(r.stored.txns[0].totalAmount,123)});
