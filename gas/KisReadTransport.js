// Read-only KIS transport. No caller-supplied URL, method, or broker write route.
// Dependencies are injected to keep secrets in server storage and enable offline tests.
function createKisReadTransport_(dep){
 const base='https://openapi.koreainvestment.com:9443';
 const balancePath='/uapi/domestic-stock/v1/trading/inquire-balance';
 function balance(){
  const fail=()=>({complete:false,rows:[],summary:null,error:'broker_read_failed'});
  try{
   const cfg=dep.getConfig();
   if(!cfg||!cfg.appKey||!cfg.appSecret||!/^\d{8}$/.test(cfg.account)||!/^\d{2}$/.test(cfg.product))return fail();
   let token=dep.getToken();
   if(typeof token!=='string'||!token){
    const a=dep.request(base+'/oauth2/tokenP',{method:'post',contentType:'application/json',payload:JSON.stringify({grant_type:'client_credentials',appkey:cfg.appKey,appsecret:cfg.appSecret}),muteHttpExceptions:true,followRedirects:false});
    if(!a||a.status!==200)return fail();const body=JSON.parse(a.body);
    if(typeof body.access_token!=='string'||!body.access_token||!Number.isFinite(Number(body.expires_in))||Number(body.expires_in)<=60)return fail();
    token=body.access_token;dep.putToken(token,Math.min(21600,Math.floor(Number(body.expires_in)-60)));
   }
   let fk='',nk='',continuation='',rows=[],summary=null;const seen=new Set();
   for(let page=0;page<20;page++){
    const q={CANO:cfg.account,ACNT_PRDT_CD:cfg.product,AFHR_FLPR_YN:'N',OFL_YN:'N',INQR_DVSN:'01',UNPR_DVSN:'01',FUND_STTL_ICLD_YN:'N',FNCG_AMT_AUTO_RDPT_YN:'N',PRCS_DVSN:'01',CTX_AREA_FK100:fk,CTX_AREA_NK100:nk};
    const url=base+balancePath+'?'+Object.keys(q).map(k=>k+'='+encodeURIComponent(q[k])).join('&');
    const response=dep.request(url,{method:'get',headers:{authorization:'Bearer '+token,appkey:cfg.appKey,appsecret:cfg.appSecret,tr_id:'TTTC8434R',tr_cont:continuation,custtype:'P'},muteHttpExceptions:true,followRedirects:false});
    if(!response||response.status!==200)return fail();const body=JSON.parse(response.body);
    if(body.rt_cd!=='0'||!Array.isArray(body.output1)||!Array.isArray(body.output2)||body.output2.length!==1)return fail();
    if(summary===null)summary=body.output2[0];else if(JSON.stringify(summary)!==JSON.stringify(body.output2[0]))return fail();
    rows=rows.concat(body.output1);const headers=response.headers||{};const key=Object.keys(headers).find(k=>k.toLowerCase()==='tr_cont');const cont=key?String(headers[key]).toUpperCase():'';
    if(cont==='D'||cont==='E')return {complete:true,rows,summary};
    if(cont!=='M'&&cont!=='F')return fail();
    fk=body.ctx_area_fk100;nk=body.ctx_area_nk100;
    if(typeof fk!=='string'||typeof nk!=='string'||(!fk&&!nk)||seen.has(fk+'\0'+nk))return fail();
    seen.add(fk+'\0'+nk);continuation='N';
   }
   return fail();
  }catch(_){return fail();}
 }
 return Object.freeze({balance});
}
