import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync('src/cloud.js','utf8').replace(/^import .*$/mg,'').replace(/^export /mg,'');
async function run(response,token='synthetic-id-token',fetchImpl){let opts;let fetchCount=0;let currentToken=token;const S={stocks:[],cash:{},txns:[],cloudRevision:'r1'};const c=vm.createContext({S,getApiUrl:()=>'/api',getApiSecret:()=> 'read-only-secret',getIdToken:()=>currentToken,clearIdToken:()=>{currentToken='';},render(){},document:{getElementById:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},console:{error(){}},Date,Intl,fetch:fetchImpl|| (async(u,o)=>{fetchCount++;opts=o;return response;})});vm.runInContext(source,c);await c.saveToCloud();return {S,opts,fetchCount,token:currentToken};}
test('missing owner token never sends a browser write',async()=>{const {S,fetchCount}=await run({ok:true,json:async()=>({success:true,savedAt:'r2'})},'');assert.equal(fetchCount,0);assert.equal(S.cloudStatus,'error');assert.match(S.syncMsg,/Google 로그인/)});
test('expired owner token is cleared and prompts re-login',async()=>{const {S,token}=await run({ok:true,json:async()=>({success:false,error:'expired'})});assert.equal(token,'');assert.match(S.syncMsg,/다시 로그인/);assert.equal(S.cloudStatus,'error')});
test('authenticated save sends owner ID token and expected server revision',async()=>{const {S,opts}=await run({ok:true,json:async()=>({success:true,savedAt:'r2'})});assert.equal(S.cloudStatus,'saved');assert.equal(S.cloudRevision,'r2');assert.notEqual(opts.mode,'no-cors');const body=JSON.parse(opts.body);assert.equal(body._action,'browser_save');assert.equal(body.idToken,'synthetic-id-token');assert.equal(body.auth,undefined);assert.equal(body.expectedRevision,'r1')});
test('KIS settlement is omitted only when absent, preventing undefined from invalidating browser_save',async()=>{
 const missing=await run({ok:true,json:async()=>({success:true,savedAt:'r2'})});
 assert.equal(Object.hasOwn(JSON.parse(missing.opts.body).state,'kisIsaSettlement'),false);
 const presentState={stocks:[],cash:{},txns:[],cloudRevision:'r1',kisIsaSettlement:{amount:12}};let sent;
 const c=vm.createContext({S:presentState,getApiUrl:()=>'/api',getIdToken:()=> 'synthetic-id-token',render(){},document:{getElementById:()=>null},setInterval(){},setTimeout(){},clearTimeout(){},console:{error(){}},Date,Intl,fetch:async(_u,o)=>{sent=JSON.parse(o.body);return{ok:true,json:async()=>({success:true,savedAt:'r2'})}}});
 vm.runInContext(source,c);await c.saveToCloud();
 assert.deepEqual(sent.state.kisIsaSettlement,{amount:12});
});
test('server rejects with every documented error code as visible failure, never saved',async()=>{
 const codes=['unauthorized','forbidden','expired','revision_required','stale_state','revision_conflict','owned_stale','invalid_request','invalid_action','agent_state_conflict','timestamp_conflict','reconciliation_pending','reserved_state_field','kis_state_conflict','unknown-code'];
 for(const error of codes){const {S}=await run({ok:true,json:async()=>({success:false,error})});assert.equal(S.cloudStatus,'error',error);assert.ok(S.syncMsg&&S.syncMsg!=='✅ 포트폴리오 원장 저장 완료',error);}
});
test('network and non-JSON failures are visible errors, never saved',async()=>{
 const network=await run(null,'synthetic-id-token',async()=>{throw new Error('offline')});
 assert.equal(network.S.cloudStatus,'error');assert.match(network.S.syncMsg,/네트워크 오류/);
 const {S}=await run({ok:true,json:async()=>{throw new SyntaxError('invalid json')}});
 assert.equal(S.cloudStatus,'error');assert.match(S.syncMsg,/서버 응답/);
});
