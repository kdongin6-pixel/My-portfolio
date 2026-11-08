// Server-only daily market data. Dates are provider trading dates, not invented trade timestamps.
function normalizeMeritzHistory_(stock,body){
  if(!body||body.rsp_cd!=='0000'||!Array.isArray(body.data))return [];
  const points=new Map();
  body.data.forEach(row=>{
    const raw=String(row.date||'');
    if(!/^\d{8}$/.test(raw))return;
    const date=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8);
    const parsed=new Date(date+'T00:00:00Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return;
    const value=stock.curr==='KRW'?row.stck_clpr:row.prpr;
    if(typeof value!=='number'&&typeof value!=='string')return;
    const price=Number(value);
    if(!Number.isFinite(price)||price<=0||price>1e12)return;
    if(!points.has(date))points.set(date,{date:date,price:price});
  });
  return Array.from(points.values()).sort((a,b)=>a.date.localeCompare(b.date)).slice(-64);
}
function meritzHistoryRequest_(spec,token,mac){
  const domestic=spec.currency==='KRW';
  const path=domestic?'/market/v1/candles/days':'/market/v1/overseas/candles/days';
  const params=domestic?{mrkt_div_code:'TJ',exch_use_yn:'Y',iscd:spec.ticker,mod_stpr_cls_code:'1'}:{mrkt_div_code:'OV',mrkt_cls_code:spec.exchange,iscd:spec.ticker,dely_rltm_cls_code:'0',mod_stpr_cls_code:'1'};
  return {url:'https://openapi.imeritz.com:9443'+path+'?'+Object.keys(params).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k])).join('&'),method:'get',headers:{Authorization:'Bearer '+token,mac_address:mac},muteHttpExceptions:true,followRedirects:false};
}
function readPortfolioPriceHistory_(stocks,fresh){
  const output={},properties=PropertiesService.getScriptProperties().getProperties();
  if(properties.MERITZ_QUOTES_ENABLED!=='true')return output;
  const cache=CacheService.getScriptCache(),pending=[],seen={};
  (stocks||[]).filter(s=>Number(s.qty)>0).slice(0,50).forEach(stock=>{
    const spec=meritzQuoteSpec_(stock);
    if(!spec||seen[spec.ticker])return;
    seen[spec.ticker]=true;
    let saved;try{saved=JSON.parse(cache.get('meritz-history-v1:'+spec.ticker)||'null');}catch(_){}
    if(saved&&saved.currency===stock.curr&&Array.isArray(saved.points)&&saved.points.length>=2){output[stock.ticker]=saved.points;return;}
    if(fresh)pending.push({stock:stock,spec:spec});
  });
  if(!pending.length)return output;
  let token;try{token=getMeritzQuoteToken_(properties,cache);}catch(_){}
  if(!token)return output;
  const succeeded={};
  const consume=(p,response)=>{
    try{
      if(response.getResponseCode()!==200)return;
      const points=normalizeMeritzHistory_(p.stock,JSON.parse(response.getContentText()));
      if(points.length<2)return;
      output[p.stock.ticker]=points;succeeded[p.stock.ticker]=true;
      cache.put('meritz-history-v1:'+p.stock.ticker,JSON.stringify({currency:p.stock.curr,points:points}),3600);
    }catch(_){}
  };
  for(let offset=0;offset<pending.length;offset+=4){
    if(offset)Utilities.sleep(1000);
    const batch=pending.slice(offset,offset+4);
    try{const responses=UrlFetchApp.fetchAll(batch.map(p=>meritzHistoryRequest_(p.spec,token,properties.MERITZ_MAC)));responses.forEach((r,i)=>consume(batch[i],r));}catch(_){}
  }
  pending.filter(p=>!succeeded[p.stock.ticker]).slice(0,8).forEach(p=>{
    Utilities.sleep(1000);
    try{const request=meritzHistoryRequest_(p.spec,token,properties.MERITZ_MAC);consume(p,UrlFetchApp.fetch(request.url,request));}catch(_){}
  });
  return output;
}
