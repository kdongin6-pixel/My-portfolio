// Server-only Meritz quote adapter. No account/order/FX routes; no secrets in response.
// This file is uploaded as GAS SERVER_JS, never imported by the browser.
function validateMeritzConfig_(input) {
  const expected=PropertiesService.getScriptProperties().getProperty('AGENT_IMPORT_TOKEN');
  if (!expected || !input || typeof input.token!=='string' || !constantTimeEquals_(input.token,expected)) return {ok:false,error:'unauthorized'};
  const keys=Object.keys(input);
  if(keys.some(k=>!['_action','token','enabled','appKey','appSecret','mac'].includes(k)) || typeof input.enabled!=='boolean')return {ok:false,error:'invalid_market_config'};
  if(input.enabled===false)return {ok:true,properties:{MERITZ_QUOTES_ENABLED:'false'}};
  if(typeof input.appKey!=='string'||!input.appKey||input.appKey.length>4096||typeof input.appSecret!=='string'||!input.appSecret||input.appSecret.length>4096||typeof input.mac!=='string'||!/^[A-Fa-f0-9]{12}$/.test(input.mac))return {ok:false,error:'invalid_market_config'};
  return {ok:true,properties:{MERITZ_QUOTES_ENABLED:'true',MERITZ_APP_KEY:input.appKey,MERITZ_APP_SECRET:input.appSecret,MERITZ_MAC:input.mac.toUpperCase()}};
}
function normalizeMeritzQuote_(spec, body, queriedAt) {
  if(!body||body.rsp_cd!=='0000'||!body.data)return null;
  const d=body.data;
  const domestic=spec.currency==='KRW';
  const echo=String(domestic?d.shrn_iscd||'':d.iscd||'').trim();
  if(echo!==spec.ticker && !(domestic && echo==='A'+spec.ticker))return null;
  if(d.crnc_code && String(d.crnc_code).trim()!==spec.currency)return null;
  const raw=domestic?d.stck_prpr:d.prpr;
  if((typeof raw!=='number'&&typeof raw!=='string')||!String(raw).trim())return null;
  const price=Number(raw);
  if(!Number.isFinite(price)||price<=0||price>1e12)return null;
  const now=Date.parse(queriedAt);
  if(!Number.isFinite(now))return null;
  return {ticker:spec.ticker,currency:spec.currency,price:price,source:'meritz-openapi',observedAt:null,queriedAt:queriedAt,session:'unknown',mode:'unknown'};
}
function meritzQuoteSpec_(stock) {
  if(!stock || !(Number(stock.qty)>0))return null;
  const ticker=String(stock.ticker||'').trim();
  if(stock.curr==='KRW' && /^[0-9A-Z]{6}$/.test(ticker))return {ticker:ticker,currency:'KRW',exchange:null};
  const exchanges={GOOGL:'OQ',GOOG:'OQ',PLTR:'OQ',IREN:'OQ',PEP:'OQ',CME:'OQ',QQQ:'OQ',AAPL:'OQ',MSFT:'OQ',NVDA:'OQ',TSLA:'OQ',AMZN:'OQ',META:'OQ',IONQ:'NY',UNH:'NY',ZTS:'NY','BRK.B':'NY',UBER:'NY',GEV:'NY',SPYM:'AX',SPY:'AX',GGLL:'OQ'};
  if(stock.curr==='USD' && Object.prototype.hasOwnProperty.call(exchanges,ticker))return {ticker:ticker,currency:'USD',exchange:exchanges[ticker]};
  return null; // An unknown exchange is unverified, never guessed from a ticker.
}
function getMeritzQuoteToken_(properties, cache) {
  const key='meritz-market-token-v1';
  const existing=cache.get(key);
  if(existing)return existing;
  const response=UrlFetchApp.fetch('https://openapi.imeritz.com:9443/oauth2/token',{
    method:'post',contentType:'application/x-www-form-urlencoded',payload:{grant_type:'client_credentials',client_id:properties.MERITZ_APP_KEY,client_secret:properties.MERITZ_APP_SECRET,scope:'login'},followRedirects:false,muteHttpExceptions:true
  });
  if(response.getResponseCode()!==200)return null;
  let body;try{body=JSON.parse(response.getContentText());}catch(_){return null;}
  if(typeof body.access_token!=='string'||!body.access_token)return null;
  cache.put(key,body.access_token,Math.max(1,Math.min(300,(Number(body.expires_in)||300)-60)));
  return body.access_token;
}
function meritzQuoteRequest_(spec,token,mac) {
  const path=spec.currency==='KRW'?'/market/v1/prices':'/market/v1/overseas/prices';
  const params=spec.currency==='KRW'?{mrkt_div_code:'J',iscd:spec.ticker}:{mrkt_div_code:'OV',mrkt_cls_code:spec.exchange,iscd:spec.ticker,dely_rltm_cls_code:'0'};
  const query=Object.keys(params).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k])).join('&');
  return {url:'https://openapi.imeritz.com:9443'+path+'?'+query,method:'get',headers:{Authorization:'Bearer '+token,mac_address:mac},followRedirects:false,muteHttpExceptions:true};
}
function readMeritzQuotes_(stocks, fresh) {
  const output={}, properties=PropertiesService.getScriptProperties().getProperties();
  if(properties.MERITZ_QUOTES_ENABLED!=='true'||!properties.MERITZ_APP_KEY||!properties.MERITZ_APP_SECRET||!/^[A-Fa-f0-9]{12}$/.test(properties.MERITZ_MAC||''))return output;
  const cache=CacheService.getScriptCache(), specs=[], seen={};
  (stocks||[]).forEach(s=>{const spec=meritzQuoteSpec_(s);if(spec&&!seen[spec.ticker]&&specs.length<50){seen[spec.ticker]=true;specs.push(spec);}});
  const pending=[];
  specs.forEach(spec=>{
    let saved;try{saved=JSON.parse(cache.get('meritz-quote-v1:'+spec.ticker)||'null');}catch(_){}
    const age=saved?Date.now()-Date.parse(saved.queriedAt):NaN;
    if(saved&&saved.ticker===spec.ticker&&saved.currency===spec.currency&&Number.isFinite(saved.price)&&saved.price>0&&age>=0&&age<21600000)output[spec.ticker]=Object.assign({},saved,{cached:true});
    if(fresh && !(age>=0&&age<30000))pending.push(spec);
  });
  if(!fresh||!pending.length)return output;
  let token;try{token=getMeritzQuoteToken_(properties,cache);}catch(_){}
  if(!token)return output;
  const successful={};
  // Bounded bursts: the gateway can reject a large parallel portfolio request.
  // No unbounded retries; a failed batch preserves its last successful cache.
  for(let offset=0;offset<pending.length;offset+=4){
    if(offset>0)Utilities.sleep(1000);
    const batch=pending.slice(offset,offset+4);
    let responses;try{responses=UrlFetchApp.fetchAll(batch.map(spec=>meritzQuoteRequest_(spec,token,properties.MERITZ_MAC)));}catch(_){continue;}
    responses.forEach((response,i)=>{
      const spec=batch[i];
      try{
        if(response.getResponseCode()!==200)return;
        const q=normalizeMeritzQuote_(spec,JSON.parse(response.getContentText()),new Date().toISOString());
        if(!q)return;
        output[spec.ticker]=q;
        successful[spec.ticker]=true;
        cache.put('meritz-quote-v1:'+spec.ticker,JSON.stringify(q),21600);
      }catch(_){} // Failure never erases a last-known price or prints the provider body.
    });
  }
  // At most one sequential retry for up to eight failures in this request.
  pending.filter(spec=>!successful[spec.ticker]).slice(0,8).forEach(spec=>{
    Utilities.sleep(1000);
    try{
      const request=meritzQuoteRequest_(spec,token,properties.MERITZ_MAC);
      const response=UrlFetchApp.fetch(request.url,request);
      if(response.getResponseCode()!==200)return;
      const q=normalizeMeritzQuote_(spec,JSON.parse(response.getContentText()),new Date().toISOString());
      if(!q)return;
      output[spec.ticker]=q;
      cache.put('meritz-quote-v1:'+spec.ticker,JSON.stringify(q),21600);
    }catch(_){}
  });
  return output;
}
function isMeritzQuoteEnabled_() {
  return PropertiesService.getScriptProperties().getProperty('MERITZ_QUOTES_ENABLED')==='true';
}
function applyMeritzReadQuotes_(meritz,isa,appData,fresh,yahooData) {
  const stocks=(appData&&Array.isArray(appData.stocks))?appData.stocks:[];
  const map=readMeritzQuotes_(stocks,fresh), quality=[];
  [['메리츠증권',meritz],['ISA',isa]].forEach(entry=>{
    entry[1].forEach(row=>{
      if(String(row.name).includes('현금') || !(Number(row.qty)>0))return;
      const matches=stocks.filter(s=>s.acct===entry[0] && s.name===row.name);
      const stock=matches.length===1?matches[0]:null;
      const ticker=stock?stock.ticker:row.ticker;
      const q=map[ticker];
      if(ticker)row.ticker=ticker;
      if(q && (!stock || q.currency===stock.curr)) {
        row.cur=q.price;
        row.quoteSource=q.source+(q.cached?'-cache':'');
        row.quoteObservedAt=q.observedAt;
        row.quoteQueriedAt=q.queriedAt;
        row.quoteRequestedAt=q.queriedAt;
        row.quoteMode=q.mode;
        row.quoteSession=q.session;
        row.quoteCached=!!q.cached;
        if(q.currency==='USD')yahooData[ticker]={price:q.price,quoteSource:row.quoteSource,quoteObservedAt:q.observedAt,quoteQueriedAt:q.queriedAt,quoteRequestedAt:q.queriedAt,quoteMode:q.mode,quoteSession:q.session,quoteCached:!!q.cached,extPrice:null,extPct:null,extType:null,marketState:null};
      } else {
        const legacy=yahooData[ticker];
        row.quoteSource=(legacy&&legacy.quoteSource)||'sheet-fallback';
        row.quoteObservedAt=(legacy&&legacy.quoteObservedAt)||null;
        row.quoteQueriedAt=null;
        row.quoteMode='unknown';row.quoteSession='unknown';row.quoteCached=true;
      }
      quality.push({account:entry[0],ticker:row.ticker||'',source:row.quoteSource,observedAt:row.quoteObservedAt||null,queriedAt:row.quoteQueriedAt||null,mode:row.quoteMode,session:row.quoteSession,cached:row.quoteCached,validPrice:Number.isFinite(Number(row.cur))&&Number(row.cur)>0});
    });
  });
  return quality;
}
function configureMeritzMarketData_(input) {
  const validated=validateMeritzConfig_(input);
  if(!validated.ok)return ContentService.createTextOutput(JSON.stringify({success:false,error:validated.error})).setMimeType(ContentService.MimeType.JSON);
  PropertiesService.getScriptProperties().setProperties(validated.properties);
  return ContentService.createTextOutput(JSON.stringify({success:true,provider:'meritz-openapi',enabled:input.enabled})).setMimeType(ContentService.MimeType.JSON);
}
