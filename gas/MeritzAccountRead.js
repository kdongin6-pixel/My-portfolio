// Server-only account snapshots. Never call broker order/FX/transfer APIs or mutate a ledger.
function meritzAccountNumber_(value,positive){
 if((typeof value!=='string'&&typeof value!=='number')||!String(value).trim())return null;
 const n=Number(value);return Number.isFinite(n)&&Math.abs(n)<=1e18&&(!positive||n>0)?n:null;
}
function meritzAccountDate_(value){
 const s=String(value||'');if(!/^\d{8}$/.test(s))return null;
 const d=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);const t=Date.parse(d+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===d?d:null;
}
function meritzAccountSymbol_(value,overseas){
 if(typeof value!=='string')return null;
 if(overseas){const match=value.match(/^([A-Z][A-Z0-9.\-]{0,19})\.(OQ|NY|AX)$/);return match?match[1]:null;}
 const symbol=/^A[0-9A-Z]{6}$/.test(value)?value.slice(1):value;return /^[0-9A-Z]{6}$/.test(symbol)?symbol:null;
}
function normalizeMeritzAccountRows_(kind,data){
 const out={rows:[],invalidRows:0};
 if(kind==='deposit'){
  if(!data||Array.isArray(data)||typeof data!=='object')throw new Error('account_schema_invalid');
  out.rows.push({currency:'KRW',balance:meritzAccountNumber_(data.tfam),d1Balance:meritzAccountNumber_(data.d1_aft_tfam),d2Balance:meritzAccountNumber_(data.d2_aft_tfam),withdrawable:meritzAccountNumber_(data.drng_able_amt),orderable:meritzAccountNumber_(data.oder_able_cash_amt)});
  if(out.rows[0].balance===null)out.invalidRows++;return out;
 }
 if(!Array.isArray(data))throw new Error('account_schema_invalid');
 data.forEach(r=>{
  if(!r||typeof r!=='object'){out.invalidRows++;return;}
  if(kind==='currencies'){
   if(typeof r.crcd!=='string'||!/^[A-Z]{3}$/.test(r.crcd)){out.invalidRows++;return;}
   out.rows.push({currency:r.crcd,balance:meritzAccountNumber_(r.frcr_amt),estimatedBalance:meritzAccountNumber_(r.estm_frcr_amt),fxRate:meritzAccountNumber_(r.vltn_exrt,true)});return;
  }
  const overseas=kind==='overseasHoldings'||kind==='fillsOverseas',fill=kind==='fillsOverseas'||kind==='fillsDomestic';
  // General holdings also returns overseas rows. Never count them a second time.
  if(kind==='domesticHoldings'&&(String(r.mksc_cls_name||'').indexOf('해외')>=0||meritzAccountSymbol_(r.iscd,true)))return;
  const providerSymbol=r.iscd,ticker=meritzAccountSymbol_(providerSymbol,overseas);
  const quantity=meritzAccountNumber_(fill?(overseas?r.cntg_dqty:r.cntg_qty):(overseas?r.rmnd_dqty:r.rmnd_qty));
  if(quantity===0)return;
  if(!ticker||quantity===null||quantity<0||(overseas&&!fill&&r.ovrs_stck_symb_iscd&&r.ovrs_stck_symb_iscd!==ticker)){out.invalidRows++;return;}
  const currency=overseas?(/^[A-Z]{3}$/.test(r.crcd||'')?r.crcd:null):'KRW';
  const name=typeof (fill?r.kor_isnm||r.isnm:r.isnm)==='string'?String(fill?r.kor_isnm||r.isnm:r.isnm).slice(0,200):ticker;
  if(fill){
   const code=String(overseas?r.seln_byov_clcd:r.deal_cls_code),side=code==='1'?'sell':code==='2'?'buy':null,date=meritzAccountDate_(r.oder_date);
   const price=meritzAccountNumber_(overseas?r.cntg_crnc_prc:r.cntg_unpr,true);
   if(!side||!date||price===null){out.invalidRows++;return;}
   out.rows.push({ticker:ticker,providerSymbol:providerSymbol,name:name,currency:currency,side:side,date:date,providerTime:typeof r.cntg_ymdh==='string'&&r.cntg_ymdh.length<=40?r.cntg_ymdh:null,quantity:quantity,price:price,amount:meritzAccountNumber_(overseas?r.cntg_camt:r.cntg_amt)});
  }else out.rows.push({ticker:ticker,providerSymbol:providerSymbol,name:name,currency:currency,quantity:quantity,averagePrice:meritzAccountNumber_(overseas?r.avrg_unpr:r.byng_unpr,true),currentPrice:meritzAccountNumber_(r.psnt_prc,true),marketValue:meritzAccountNumber_(overseas?r.frcr_vltn_amt:r.vltn_amt),pnl:meritzAccountNumber_(overseas?r.vltn_prls_camt:r.vltn_prls_amt)});
 });return out;
}
function readMeritzAccountSection_(kind,path,params,properties,token){
 assertMeritzAccountRoute_('get',path);
 const result={status:'error',rows:[],queriedAt:null,paginationComplete:false,errorCode:null};
 const seenKeys={},seenPages={};let key=null,invalid=0;
 for(let page=0;page<10;page++){
  if(page>0)Utilities.sleep(250);
  const query=Object.assign({},params);if(key!==null){query.tr_cont='1';query.tr_cont_key=key;}
  const url='https://openapi.imeritz.com:9443'+path+'?'+Object.keys(query).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(query[k])).join('&');
  try{
   const response=UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Bearer '+token,mac_address:properties.MERITZ_MAC},followRedirects:false,muteHttpExceptions:true});
   result.queriedAt=new Date().toISOString();
   if(response.getResponseCode()!==200){result.errorCode='provider_http_error';break;}
   const body=JSON.parse(response.getContentText()),code=body&&body.rsp_cd;
   if(['0000','0001','5620','5762','5766','5820','5822'].indexOf(code)<0){result.errorCode=/^\d{4}$/.test(code||'')?'provider_'+code:'provider_error';break;}
   const data=body.data===null||body.data===undefined?((code==='5820'||code==='5822')?[]:null):body.data;
   const fingerprint=JSON.stringify(data);
   if(seenPages[fingerprint]){result.errorCode='pagination_incomplete';break;}
   seenPages[fingerprint]=true;
   const normalized=normalizeMeritzAccountRows_(kind,data);result.rows=result.rows.concat(normalized.rows);invalid+=normalized.invalidRows;
   if(code!=='5762'){result.paginationComplete=true;break;}
   if(kind==='deposit'||kind==='currencies'){result.errorCode='pagination_incomplete';break;}
   if(typeof body.tr_cont_key!=='string'||!body.tr_cont_key||seenKeys[body.tr_cont_key]){result.errorCode='pagination_incomplete';break;}
   key=body.tr_cont_key;seenKeys[key]=true;
  }catch(_){result.errorCode='provider_response_unverified';break;}
 }
 if(!result.paginationComplete&&!result.errorCode)result.errorCode='pagination_incomplete';
 if(invalid&&!result.errorCode)result.errorCode='unverified_rows';
 result.status=result.paginationComplete&&!result.errorCode?'success':result.rows.length?'partial':'error';
 return result;
}
function handleMeritzAccountRead_(input){
 if(!input||input._action!=='broker_read'||typeof input.secret!=='string'||!checkSecret_(input.secret))return {success:false,error:'unauthorized'};
 if(Object.keys(input).some(k=>['_action','secret'].indexOf(k)<0))return {success:false,error:'invalid_broker_request'};
 const properties=PropertiesService.getScriptProperties().getProperties();
 if(!properties.MERITZ_APP_KEY||!properties.MERITZ_APP_SECRET||!/^[A-Fa-f0-9]{12}$/.test(properties.MERITZ_MAC||''))return {success:false,error:'broker_not_configured'};
 let token;try{assertMeritzAccountRoute_('post','/oauth2/token');token=getMeritzQuoteToken_(properties,CacheService.getScriptCache());}catch(_){}
 if(!token)return {success:false,error:'broker_authentication_failed'};
 const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10),last=Date.parse(day+'T00:00:00Z'),dates=[];
 for(let i=6;i>=0;i--)dates.push(new Date(last-i*86400000).toISOString().slice(0,10));
 let requests=0;const run=(kind,path,params)=>{if(requests++)Utilities.sleep(250);return readMeritzAccountSection_(kind,path,params,properties,token);};
 const sections={
  domesticHoldings:run('domesticHoldings','/accounts/v1/me/holdings',{nthn_rmnd_incu_yn:'N'}),
  overseasHoldings:run('overseasHoldings','/accounts/v1/me/overseas/holdings',{}),
  deposit:run('deposit','/accounts/v1/me/deposit',{}),
  currencies:run('currencies','/accounts/v1/me/overseas/currencies',{})
 };
 const pieces=dates.map(d=>({date:d,result:run('fillsDomestic','/trading/v1/orders/history',{oder_date:d.replace(/-/g,''),deal_cls_code:'0',cntg_cls_code:'1',sort_stnd_code:'1'})}));
 pieces.push({date:'overseas:'+dates[0]+'~'+day,result:run('fillsOverseas','/trading/v1/overseas/orders/history',{oder_sta_date:dates[0].replace(/-/g,''),oder_fin_date:day.replace(/-/g,''),seln_byov_clcd:'0',cntg_cls_code:'1'})});
 const fills={status:'success',rows:[],queriedAt:new Date().toISOString(),paginationComplete:true,errorCode:null,failedDates:[]};
 pieces.forEach(p=>{fills.rows=fills.rows.concat(p.result.rows);if(p.result.status!=='success'){fills.failedDates.push(p.date);fills.paginationComplete=false;}});
 fills.rows.sort((a,b)=>b.date.localeCompare(a.date));
 if(fills.failedDates.length){fills.status=pieces.every(p=>p.result.status==='error')?'error':'partial';fills.errorCode='history_incomplete';}
 sections.fills=fills;
 const statuses=Object.keys(sections).map(k=>sections[k].status),status=statuses.every(s=>s==='success')?'success':statuses.every(s=>s==='error')?'error':'partial';
 return {success:true,brokerAccount:{provider:'meritz-openapi',readOnly:true,accountLabel:'API 키 연결 계좌 · ISA 연결 미확인',queriedAt:new Date().toISOString(),observedAt:null,status:status,period:{from:dates[0],to:day},sections:sections}};
}
function meritzAccountReadResponse_(input){
 return ContentService.createTextOutput(JSON.stringify(handleMeritzAccountRead_(input))).setMimeType(ContentService.MimeType.JSON);
}
function assertMeritzAccountRoute_(method,path){
 const reads=['/accounts/v1/me/holdings','/accounts/v1/me/deposit','/accounts/v1/me/overseas/holdings','/accounts/v1/me/overseas/currencies','/trading/v1/orders/history','/trading/v1/overseas/orders/history'];
 if(!((method==='get'&&reads.indexOf(path)>=0)||(method==='post'&&path==='/oauth2/token')))throw new Error('account_route_denied');
}
