import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const path=new URL('../gas/MeritzAccountRead.js',import.meta.url);
function context(extra={}){const c={...extra};vm.createContext(c);vm.runInContext(fs.existsSync(path)?fs.readFileSync(path,'utf8'):'',c);return c;}
const plain=x=>JSON.parse(JSON.stringify(x));
test('non-paginated cash endpoints never send a fabricated continuation request',()=>{
 let calls=0;const c=context({Utilities:{sleep(){}},UrlFetchApp:{fetch(){calls++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({rsp_cd:'5762',data:{tfam:100},tr_cont_key:'cash-cursor'})};}}});
 const section=plain(c.readMeritzAccountSection_('deposit','/accounts/v1/me/deposit',{}, {MERITZ_MAC:'AABBCCDDEEFF'},'TOKEN'));
 assert.equal(calls,1);assert.equal(section.paginationComplete,false);assert.equal(section.status,'partial');
});
test('unknown deposit values do not become a confirmed zero or a successful balance section',()=>{
 const c=context({Utilities:{sleep(){}},UrlFetchApp:{fetch(){return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({rsp_cd:'5766',data:{tfam:'',d1_aft_tfam:null}})};}}});
 const section=plain(c.readMeritzAccountSection_('deposit','/accounts/v1/me/deposit',{}, {MERITZ_MAC:'AABBCCDDEEFF'},'TOKEN'));
 assert.notEqual(section.status,'success');assert.equal(section.rows[0]?.balance,null);assert.equal(section.errorCode,'unverified_rows');
});
test('broker action authenticates and validates exact input before access, bounds history to seven dates, and never writes a ledger',()=>{
 const requests=[],properties={MERITZ_APP_KEY:'PRIVATEKEY',MERITZ_APP_SECRET:'PRIVATESECRET',MERITZ_MAC:'AABBCCDDEEFF'};
 const c=context({checkSecret_:s=>s==='READSECRET',PropertiesService:{getScriptProperties:()=>({getProperties:()=>properties})},CacheService:{getScriptCache:()=>({})},getMeritzQuoteToken_:()=> 'TOKEN',Utilities:{sleep(){}},UrlFetchApp:{fetch(url,opts){requests.push({url,opts});const path=new URL(url).pathname;const data=path.endsWith('/deposit')?{tfam:100}:path.endsWith('/currencies')?[{crcd:'USD',frcr_amt:'25'}]:[];return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({rsp_cd:'5766',data})};}}});
 assert.equal(typeof c.handleMeritzAccountRead_,'function');
 for(const input of [{_action:'broker_read'},{_action:'broker_read',secret:'WRITE_TOKEN'},{_action:'broker_read',secret:'READSECRET',path:'/orders/buy'},{_action:'broker_write',secret:'READSECRET'}])assert.equal(c.handleMeritzAccountRead_(input).success,false);
 assert.equal(requests.length,0);
 const before=JSON.stringify(properties);const result=plain(c.handleMeritzAccountRead_({_action:'broker_read',secret:'READSECRET'}));
 assert.equal(result.success,true);assert.equal(result.brokerAccount.status,'success');assert.equal(result.brokerAccount.observedAt,null);assert.equal(result.brokerAccount.readOnly,true);assert.equal(result.brokerAccount.sections.deposit.rows[0].balance,100);assert.equal(JSON.stringify(properties),before);
 assert.equal(requests.filter(r=>new URL(r.url).pathname==='/trading/v1/orders/history').length,7);assert.equal(requests.length,12);assert.ok(requests.every(r=>r.opts.method==='get'));
 for(const r of requests.filter(r=>new URL(r.url).pathname.includes('orders/history')))assert.equal(new URL(r.url).searchParams.get('cntg_cls_code'),'1');
 assert.doesNotMatch(JSON.stringify(result),/PRIVATEKEY|PRIVATESECRET|TOKEN|READSECRET|account_no|oder_no/);
});
test('account reads accept documented response codes, preserve exact paging keys and expose truncation or errors honestly',()=>{
 const requests=[],key='CURSOR with trailing spaces  ';
 let bodies=[{rsp_cd:'5762',data:[{iscd:'A005930',rmnd_qty:1,byng_unpr:'10',psnt_prc:'11'}],tr_cont_key:key},{rsp_cd:'5766',data:[{iscd:'A000660',rmnd_qty:2,byng_unpr:'20',psnt_prc:'21'}]}];
 const c=context({Utilities:{sleep(){}},UrlFetchApp:{fetch(url,opts){requests.push({url,opts});const body=bodies.shift();return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(body)};}}});
 assert.equal(typeof c.readMeritzAccountSection_,'function');
 const read=()=>plain(c.readMeritzAccountSection_('domesticHoldings','/accounts/v1/me/holdings',{nthn_rmnd_incu_yn:'N'},{MERITZ_MAC:'AABBCCDDEEFF'},'TOKEN'));
 let r=read();assert.equal(r.status,'success');assert.equal(r.paginationComplete,true);assert.equal(r.rows.length,2);assert.equal(new URL(requests[1].url).searchParams.get('tr_cont_key'),key);assert.equal(new URL(requests[1].url).searchParams.get('tr_cont'),'1');assert.ok(requests.every(r=>r.opts.method==='get'&&r.opts.followRedirects===false));
 bodies=[{rsp_cd:'5820',data:[]}];r=read();assert.equal(r.status,'success');assert.equal(r.rows.length,0);
 bodies=[{rsp_cd:'5018',data:[{iscd:'A005930',rmnd_qty:1}]}];r=read();assert.equal(r.status,'error');assert.equal(r.rows.length,0);assert.equal(r.errorCode,'provider_5018');
 bodies=[{rsp_cd:'5762',data:[{iscd:'A005930',rmnd_qty:1}],tr_cont_key:key},{rsp_cd:'5762',data:[{iscd:'A000660',rmnd_qty:1}],tr_cont_key:key}];r=read();assert.equal(r.status,'partial');assert.equal(r.paginationComplete,false);assert.equal(r.errorCode,'pagination_incomplete');
 bodies=[{rsp_cd:'5762',data:[{iscd:'A005930',rmnd_qty:1}],tr_cont_key:'x'},{rsp_cd:'5762',data:[{iscd:'A005930',rmnd_qty:1}],tr_cont_key:'y'}];r=read();assert.equal(r.rows.length,1);assert.equal(r.status,'partial');
});
test('account row normalization allowlists fields, avoids overseas duplicates, and never calls unfilled orders executions',()=>{
 const c=context();assert.equal(typeof c.normalizeMeritzAccountRows_,'function');
 const foreign={iscd:'BRK.B.NY',ovrs_stck_symb_iscd:'BRK.B',isnm:'Test',crcd:'USD',rmnd_dqty:'14.000',avrg_unpr:'525.1728',psnt_prc:'570.89',frcr_vltn_amt:'7992.46',vltn_prls_camt:'640.0',account_no:'PRIVATE',secret:'PRIVATE'};
 const before=JSON.stringify(foreign);let n=plain(c.normalizeMeritzAccountRows_('overseasHoldings',[foreign]));
 assert.equal(n.rows[0].ticker,'BRK.B');assert.equal(n.rows[0].providerSymbol,'BRK.B.NY');assert.equal(n.rows[0].currency,'USD');assert.equal(n.rows[0].averagePrice,525.1728);assert.doesNotMatch(JSON.stringify(n),/PRIVATE|account_no|secret/);assert.equal(JSON.stringify(foreign),before);
 n=plain(c.normalizeMeritzAccountRows_('domesticHoldings',[{iscd:'BRK.B.NY',mksc_cls_name:'해외주식',rmnd_qty:14},{iscd:'A005930',isnm:'Test',rmnd_qty:2,byng_unpr:'',psnt_prc:'0'}]));assert.equal(n.rows.length,1);assert.equal(n.rows[0].ticker,'005930');assert.equal(n.rows[0].currency,'KRW');assert.equal(n.rows[0].averagePrice,null);assert.equal(n.rows[0].currentPrice,null);
 const fill={iscd:'BRK.B.NY',kor_isnm:'Test',crcd:'USD',seln_byov_clcd:'1',oder_date:'20261106',cntg_dqty:'3',cntg_crnc_prc:'581.69',cntg_camt:'1745.07',cntg_ymdh:'2026-11-06 12:34:56',oder_no:'PRIVATE'};
 n=plain(c.normalizeMeritzAccountRows_('fillsOverseas',[fill,{...fill,cntg_dqty:'0'},{...fill,seln_byov_clcd:'9'}]));assert.equal(n.rows.length,1);assert.equal(n.rows[0].side,'sell');assert.equal(n.rows[0].quantity,3);assert.equal(n.rows[0].price,581.69);assert.equal(n.rows[0].date,'2026-11-06');assert.equal(n.rows[0].providerTime,fill.cntg_ymdh);assert.equal(n.invalidRows,1);assert.doesNotMatch(JSON.stringify(n),/PRIVATE|oder_no/);
 n=plain(c.normalizeMeritzAccountRows_('deposit',{tfam:0,d1_aft_tfam:'',d2_aft_tfam:'100',drng_able_amt:'-10',oder_able_cash_amt:null}));assert.deepEqual(n.rows,[{currency:'KRW',balance:0,d1Balance:null,d2Balance:100,withdrawable:-10,orderable:null}]);
 n=plain(c.normalizeMeritzAccountRows_('currencies',[{crcd:'USD',frcr_amt:'25.50',estm_frcr_amt:'30',vltn_exrt:'1342.28',srno:'PRIVATE'}]));assert.deepEqual(n.rows,[{currency:'USD',balance:25.5,estimatedBalance:30,fxRate:1342.28}]);
});
test('account connector has an exact read-only transport allowlist and blocks every write before sending',()=>{
 const c=context();assert.equal(typeof c.assertMeritzAccountRoute_,'function');
 for(const path of ['/accounts/v1/me/holdings','/accounts/v1/me/deposit','/accounts/v1/me/overseas/holdings','/accounts/v1/me/overseas/currencies','/trading/v1/orders/history','/trading/v1/overseas/orders/history'])assert.doesNotThrow(()=>c.assertMeritzAccountRoute_('get',path));
 assert.doesNotThrow(()=>c.assertMeritzAccountRoute_('post','/oauth2/token'));
 for(const [method,path]of [['post','/trading/v1/orders/buy'],['post','/trading/v1/orders/sell'],['delete','/trading/v1/orders'],['post','/accounts/v1/fx'],['get','/accounts/v1/transactions'],['get','/accounts/v1/me/holdings?arbitrary=1'],['put','/oauth2/token']])assert.throws(()=>c.assertMeritzAccountRoute_(method,path),/account_route_denied/);
});
