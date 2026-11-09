import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const p=new URL('../gas/KisAccountSnapshot.js',import.meta.url);
const ctx=vm.createContext({});
if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
const clone=x=>JSON.parse(JSON.stringify(x));
test('a complete Korean investment domestic account result yields validated holdings and cash',()=>{
 assert.equal(typeof ctx.normalizeKisBalance_,'function');
 const r=clone(ctx.normalizeKisBalance_({rt_cd:'0',output1:[{pdno:'123456',prdt_name:'테스트',hldg_qty:'4',pchs_avg_pric:'100',prpr:'110',evlu_amt:'440',evlu_pfls_amt:'40'}],output2:[{dnca_tot_amt:'500',nxdy_excc_amt:'600',prvs_rcdl_excc_amt:'700'}]},'D','2026-11-09T01:00:00Z'));
 assert.equal(r.status,'success');assert.equal(r.paginationComplete,true);assert.equal(r.rows[0].ticker,'123456');assert.equal(r.rows[0].quantity,4);assert.equal(r.cash.balance,500);assert.equal(r.cash.nextSettlement,600);
});
test('keeps explicit zero quantity identifiers separate from active rows for reconciliation',()=>{
 const body={rt_cd:'0',output1:[{pdno:'654321',hldg_qty:'0'}],output2:[{dnca_tot_amt:'0'}]};const r=clone(ctx.normalizeKisBalance_(body,'D','2026-11-09T01:00:00Z'));assert.equal(r.status,'success');assert.equal(r.rows.length,0);assert.deepEqual(r.zeroTickers,['654321']);
});
test('provider failure, unknown pagination, invalid numbers and duplicate symbols fail closed',()=>{
 const good={rt_cd:'0',output1:[{pdno:'123456',prdt_name:'x',hldg_qty:'1',pchs_avg_pric:'10',prpr:'11'}],output2:[{dnca_tot_amt:'500'}]};
 for(const [body,continuation] of [[{rt_cd:'1',output1:[],output2:[]},'D'],[good,'M'],[{...good,output2:[]},'D'],[{...good,output1:[{...good.output1[0],hldg_qty:''}]},'D'],[{...good,output1:[good.output1[0],good.output1[0]]},'D']])assert.notEqual(ctx.normalizeKisBalance_(body,continuation,'2026-11-09T01:00:00Z').status,'success');
});
