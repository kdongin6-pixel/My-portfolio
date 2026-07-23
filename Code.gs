// 📊 포트폴리오 자동 생성 및 최신 동기화 스크립트 (완성본)

const MARKET_ITEMS=[
  {key:"IXIC",  label:"나스닥",  ticker:"INDEXNASDAQ:.IXIC",  sec:"지수",    fmt:"num"},
  {key:"SPX",   label:"S&P500", ticker:"INDEXSP:.INX",        sec:"지수",    fmt:"num"},
  {key:"DJI",   label:"다우",   ticker:"INDEXDJX:.DJI",       sec:"지수",    fmt:"num"},
  {key:"KOSPI", label:"코스피", ticker:"KRX:KOSPI",           sec:"지수",    fmt:"num"},
  {key:"VIX",   label:"VIX",   ticker:"INDEXCBOE:VIX",       sec:"지수",    fmt:"dec"},
  {key:"USDKRW",label:"원/달러",ticker:"CURRENCY:USDKRW",    sec:"금리·환율",fmt:"krw"},
  {key:"T2Y",   label:"미2Y",  treasuryKey:"BC_2YEAR",       sec:"금리·환율",fmt:"pct"},
  {key:"T5Y",   label:"미5Y",  ticker:"INDEXCBOE:FVX",       sec:"금리·환율",fmt:"pct", scale:0.1},
  {key:"T10Y",  label:"미10Y", ticker:"INDEXCBOE:TNX",       sec:"금리·환율",fmt:"pct", scale:0.1},
  {key:"DXY",   label:"DXY",  ticker:"UUP",                 sec:"금리·환율",fmt:"usd"},
  {key:"GOLD",  label:"금",    ticker:"CURRENCY:XAUUSD",     sec:"원자재",  fmt:"usd"},
  {key:"WTI",   label:"WTI",  ticker:"USO",                 sec:"원자재",  fmt:"usd"},
  {key:"QQQ",   label:"QQQ",  ticker:"QQQ",                 sec:"ETF",     fmt:"usd"},
  {key:"TQQQ",  label:"TQQQ", ticker:"TQQQ",                sec:"ETF",     fmt:"usd"},
  {key:"SPY",   label:"SPY",  ticker:"SPY",                 sec:"ETF",     fmt:"usd"},
  {key:"TLT",   label:"TLT",  ticker:"TLT",                 sec:"ETF",     fmt:"usd"},
  {key:"SOXX",  label:"SOXX", ticker:"SOXX",                sec:"ETF",     fmt:"usd"},
  {key:"GLD",   label:"GLD",  ticker:"GLD",                 sec:"ETF",     fmt:"usd"},
  {key:"NVDA",  label:"NVDA", ticker:"NVDA",                sec:"빅테크",  fmt:"usd"},
  {key:"GOOGL", label:"GOOGL",ticker:"GOOGL",               sec:"빅테크",  fmt:"usd"},
  {key:"AAPL",  label:"AAPL", ticker:"AAPL",                sec:"빅테크",  fmt:"usd"},
  {key:"MSFT",  label:"MSFT", ticker:"MSFT",                sec:"빅테크",  fmt:"usd"},
  {key:"AMZN",  label:"AMZN", ticker:"AMZN",                sec:"빅테크",  fmt:"usd"},
  {key:"META",  label:"META", ticker:"META",                sec:"빅테크",  fmt:"usd"},
  {key:"TSLA",  label:"TSLA", ticker:"TSLA",                sec:"빅테크",  fmt:"usd"},
  {key:"AVGO",  label:"AVGO", ticker:"AVGO",                sec:"빅테크",  fmt:"usd"},
  {key:"BTC",   label:"비트코인",ticker:"CRYPTO:BTCUSD",    sec:"원자재",  fmt:"usd"},
  // ── 추가: 지수 / 금리 / 원자재 ──
  {key:"RUT",   label:"러셀2000",ticker:"INDEXRUSSELL:RUT", sec:"지수",    fmt:"num"},
  {key:"T3M",   label:"미3M",  treasuryKey:"BC_3MONTH",      sec:"금리·환율",fmt:"pct"},
  {key:"SILVER",label:"은",    ticker:"CURRENCY:XAGUSD",     sec:"원자재",  fmt:"usd"},
  {key:"BRENT", label:"브렌트",ticker:"BNO",                 sec:"원자재",  fmt:"usd"},
  // ── 섹터 ETF (GICS 11) ──
  {key:"XLK",   label:"기술",   ticker:"XLK",  sec:"섹터", fmt:"usd"},
  {key:"XLB",   label:"소재",   ticker:"XLB",  sec:"섹터", fmt:"usd"},
  {key:"XLY",   label:"임의소비",ticker:"XLY", sec:"섹터", fmt:"usd"},
  {key:"XLI",   label:"산업재", ticker:"XLI",  sec:"섹터", fmt:"usd"},
  {key:"XLC",   label:"통신",   ticker:"XLC",  sec:"섹터", fmt:"usd"},
  {key:"XLV",   label:"헬스케어",ticker:"XLV", sec:"섹터", fmt:"usd"},
  {key:"XLF",   label:"금융",   ticker:"XLF",  sec:"섹터", fmt:"usd"},
  {key:"XLRE",  label:"부동산", ticker:"XLRE", sec:"섹터", fmt:"usd"},
  {key:"XLU",   label:"유틸리티",ticker:"XLU", sec:"섹터", fmt:"usd"},
  {key:"XLP",   label:"필수소비",ticker:"XLP", sec:"섹터", fmt:"usd"},
  {key:"XLE",   label:"에너지", ticker:"XLE",  sec:"섹터", fmt:"usd"},
  // ── 이슈 종목 ──
  {key:"SNOW",  label:"SNOW", ticker:"SNOW", sec:"이슈", fmt:"usd"},
  {key:"SMCI",  label:"SMCI", ticker:"SMCI", sec:"이슈", fmt:"usd"},
  {key:"MU",    label:"MU",   ticker:"MU",   sec:"이슈", fmt:"usd"},
  {key:"PLTR",  label:"PLTR", ticker:"PLTR", sec:"이슈", fmt:"usd"},
  {key:"COST",  label:"COST", ticker:"COST", sec:"이슈", fmt:"usd"},
  {key:"XOM",   label:"XOM",  ticker:"XOM",  sec:"이슈", fmt:"usd"},
  {key:"CVX",   label:"CVX",  ticker:"CVX",  sec:"이슈", fmt:"usd"},
  {key:"INTC",  label:"INTC", ticker:"INTC", sec:"이슈", fmt:"usd"},
];

const MERITZ_DATA = [
  ["메리츠증권","나비타스 세미컨덕터","NVTS",     "USD",500, 20.3280, '=IFERROR(GOOGLEFINANCE("NVTS"),29.25)'],
  ["메리츠증권","GE베르노바",         "GEV",      "USD",16,  813.8956,'=IFERROR(GOOGLEFINANCE("GEV"),1038.74)'],
  ["메리츠증권","알파벳 A",           "GOOGL",    "USD",39,  239.1233,'=IFERROR(GOOGLEFINANCE("GOOGL"),388.51)'],
  ["메리츠증권","iSh 0-3M T-Bond",   "SGOV",     "USD",103, 100.5521,'=IFERROR(GOOGLEFINANCE("SGOV"),100.67)'],
  ["메리츠증권","팔란티어 테크",      "PLTR",     "USD",43,  116.9074,'=IFERROR(GOOGLEFINANCE("PLTR"),144.88)'],
  ["메리츠증권","네비우스 그룹",      "NBIS",     "USD",21,  205.5523,'=IFERROR(GOOGLEFINANCE("NBIS"),227.64)'],
  ["메리츠증권","버티브 홀딩스",      "VRT",      "USD",8,   295.10,  '=IFERROR(GOOGLEFINANCE("VRT"),316.62)'],
  ["메리츠증권","Direxion GOOGL 2X", "GGLL",     "USD",15,  123.9800,'=IFERROR(GOOGLEFINANCE("GGLL"),137.90)'],
  ["메리츠증권","TEMA Space Innov.", "NASA",     "USD",114, 40.3677, '=IFERROR(GOOGLEFINANCE("NASA"),40.95)'],
  ["메리츠증권","AMD",               "AMD",      "USD",10,  478.9200,'=IFERROR(GOOGLEFINANCE("AMD"),519.98)'],
  ["메리츠증권","GraniteShares NBIS 2X","NBIL",  "USD",57,  40.0100, '=IFERROR(GOOGLEFINANCE("NBIL"),42.30)'],
  ["메리츠증권","TRADR IBM Daily 2X","IBX",      "USD",80,  26.3025, '=IFERROR(GOOGLEFINANCE("BATS:IBX"),IFERROR(GOOGLEFINANCE("NASDAQ:IBX"),IFERROR(GOOGLEFINANCE("IBX"),29.88)))'],
  ["메리츠증권","아이온큐",           "IONQ",     "USD",1,   48.94,   '=IFERROR(GOOGLEFINANCE("IONQ"),69.67)'],
  ["메리츠증권","IREN",              "IREN",     "USD",1,   56.68,   '=IFERROR(GOOGLEFINANCE("IREN"),64.23)'],
  ["메리츠증권","💵 현금 (USD)",      "",         "USD",1,   7354,    7354]
];

// Yahoo Finance symbol mapping (GOOGLEFINANCE ticker → Yahoo symbol)
const YAHOO_SYMBOL_MAP = {
  'INDEXNASDAQ:.IXIC': '^IXIC',
  'INDEXSP:.INX':      '^GSPC',
  'INDEXDJX:.DJI':     '^DJI',
  'KRX:KOSPI':         '^KS11',
  'INDEXCBOE:VIX':     '^VIX',
  'CURRENCY:USDKRW':   'USDKRW=X',
  'INDEXCBOE:FVX':     '^FVX',
  'INDEXCBOE:TNX':     '^TNX',
  'UUP':               'UUP',
  'CURRENCY:XAUUSD':   'GC=F',
  'USO':               'CL=F',
  'CRYPTO:BTCUSD':     'BTC-USD',
  'INDEXRUSSELL:RUT':  '^RUT',
  'CURRENCY:XAGUSD':   'SI=F',
};

const ISA_DATA = [
  ["ISA","KoAct 글로벌AI메모리반도체액티브","0174B0","KRW",283,17390, 0],
  ["ISA","KoAct 팔란티어밸류체인액티브",     "0093D0","KRW",720, 14198, '=IFERROR(GOOGLEFINANCE("KRX:0093D0"),19590)'],
  ["ISA","TIMEFOLIO 미국나스닥100액티브",    "426030","KRW",345, 42639, '=IFERROR(GOOGLEFINANCE("KRX:426030"),55300)'],
  ["ISA","KODEX 미국서학개미",               "473460","KRW",189, 21478, '=IFERROR(GOOGLEFINANCE("KRX:473460"),27595)'],
  ["ISA","KODEX 미국배당커버드콜액티브",      "441640","KRW",490, 11997, '=IFERROR(GOOGLEFINANCE("KRX:441640"),13425)'],
  ["ISA","TIGER 미국초단기국채",             "0046A0","KRW",761, 9963,  '=IFERROR(GOOGLEFINANCE("KRX:0046A0"),10510)'],
  ["ISA","TIGER 글로벌비만치료제TOP2Plus",   "476690","KRW",235, 10250, '=IFERROR(GOOGLEFINANCE("KRX:476690"),10830)'],
  ["ISA","KODEX 미국AI전력핵심인프라",        "487230","KRW",307, 26408, '=IFERROR(GOOGLEFINANCE("KRX:487230"),26535)'],
  ["ISA","한화",                             "000880","KRW",1,   132000,'=IFERROR(GOOGLEFINANCE("KRX:000880"),140500)'],
  ["ISA","💵 현금 (KRW)",                    "",      "KRW",1,   223229,223229]
];

const MERITZ_SUM_ROW = 1 + MERITZ_DATA.length * 2 + 1;
const ISA_SUM_ROW    = 1 + ISA_DATA.length    * 2 + 1;

// ─────────────────────────────────────────────
// 합계 공식 재설정 (행 삭제/삽입 후 범위 깨짐 방지)
// ─────────────────────────────────────────────
function fixSumFormula(sheet) {
  if (!sheet) return;
  const rows = sheet.getLastRow();
  if (rows < 2) return;
  const colA = sheet.getRange(1, 1, rows, 1).getValues();
  let sumRow = -1;
  for (let i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
  }
  if (sumRow > 2) {
    const last = sumRow - 1;
    sheet.getRange(sumRow, 4).setFormula(
      `=SUMPRODUCT((MOD(ROW(D2:D${last}),2)=0)*D2:D${last})`
    );
    sheet.getRange(sumRow, 5).setFormula(
      `=SUMPRODUCT((MOD(ROW(E2:E${last}),2)=0)*E2:E${last})`
    );
  }
}

// ─────────────────────────────────────────────
// Yahoo Finance v7 — realtime bulk quotes (pre/post market included)
// ─────────────────────────────────────────────
function fetchYahooQuotes(symbols) {
  if (!symbols || !symbols.length) return {};
  try {
    const syms = [...new Set(symbols)].filter(Boolean).join(',');
    const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(syms);
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
      }
    });
    if (res.getResponseCode() !== 200) {
      Logger.log('Yahoo HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
      return {};
    }
    const json = JSON.parse(res.getContentText());
    const results = (json.quoteResponse && json.quoteResponse.result) || [];
    const map = {};
    results.forEach(q => {
      const state = q.marketState || 'CLOSED'; // REGULAR | PRE | POST | CLOSED
      let extPrice = null, extPct = null, extType = null;
      if (state === 'PRE' && q.preMarketPrice) {
        extPrice = q.preMarketPrice;
        extPct   = q.preMarketChangePercent || 0;
        extType  = 'pre';
      } else if ((state === 'POST' || state === 'CLOSED') && q.postMarketPrice) {
        extPrice = q.postMarketPrice;
        extPct   = q.postMarketChangePercent || 0;
        extType  = 'post';
      }
      // Live price: extended-hours if available, otherwise regular market
      const livePrice = (state === 'REGULAR') ? (q.regularMarketPrice || 0)
                                               : (extPrice || q.regularMarketPrice || 0);
      map[q.symbol] = {
        price:       livePrice,
        regPrice:    q.regularMarketPrice || 0,
        daily:       q.regularMarketChangePercent || 0,
        marketState: state,
        extPrice, extPct, extType
      };
    });
    Logger.log('Yahoo: ' + Object.keys(map).length + '/' + symbols.length + ' fetched');
    return map;
  } catch(e) {
    Logger.log('Yahoo error: ' + e);
    return {};
  }
}

// ─────────────────────────────────────────────
// Yahoo Finance v8 chart API — real historical daily closes (7d), batched
// via fetchAll for speed. Used for: (1) real sparklines instead of the
// frontend's noise-generated fake curve, (2) a per-symbol price fallback
// for tickers that intermittently come back empty from the bulk v7 quote
// endpoint (observed for futures/crypto like GC=F, BTC-USD).
// ─────────────────────────────────────────────
function fetchYahooCharts(symbols){
  const uniq=[...new Set(symbols)].filter(Boolean);
  if(!uniq.length)return{};
  const headers={
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept':'application/json, text/plain, */*',
    'Referer':'https://finance.yahoo.com'
  };
  const requests=uniq.map(sym=>({
    url:'https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range=7d&interval=1d',
    muteHttpExceptions:true,
    headers
  }));
  let responses;
  try{
    responses=UrlFetchApp.fetchAll(requests);
  }catch(e){
    Logger.log('Yahoo chart batch error: '+e);
    return{};
  }
  const map={};
  uniq.forEach((sym,i)=>{
    try{
      const res=responses[i];
      if(!res||res.getResponseCode()!==200)return;
      const json=JSON.parse(res.getContentText());
      const result=json.chart&&json.chart.result&&json.chart.result[0];
      if(!result)return;
      const closesRaw=(result.indicators&&result.indicators.quote&&result.indicators.quote[0]&&result.indicators.quote[0].close)||[];
      const closes=closesRaw.filter(v=>v!=null&&v>0);
      const price=(result.meta&&result.meta.regularMarketPrice)||closes[closes.length-1]||0;
      if(price>0)map[sym]={price,closes};
    }catch(e){/* skip this symbol */}
  });
  Logger.log('Yahoo chart: '+Object.keys(map).length+'/'+uniq.length+' fetched');
  return map;
}

// 30분 캐시 — 30초 간격 자동 갱신 시에도 차트 API 호출량이 하루 한도를
// 넘지 않도록 방지 (스파크라인/가격 폴백용 데이터는 그 정도 신선도면 충분)
function getYahooChartsCached(symbols){
  const cache=CacheService.getScriptCache();
  const cacheKey='yahoo_charts_v1';
  try{
    const cached=cache.get(cacheKey);
    if(cached)return JSON.parse(cached);
  }catch(e){}
  const fresh=fetchYahooCharts(symbols);
  if(Object.keys(fresh).length){
    try{cache.put(cacheKey,JSON.stringify(fresh),1800);}catch(e){/* 캐시 크기 초과 시 무시 */}
  }
  return fresh;
}

// Fetch KRX ETF price via Naver Finance API (for tickers not in GOOGLEFINANCE)
function fetchKrxPrice(code){
  try{
    const url=`https://api.finance.naver.com/service/itemSummary.nhn?itemcode=${code}`;
    const res=UrlFetchApp.fetch(url,{
      muteHttpExceptions:true,
      headers:{'User-Agent':'Mozilla/5.0','Referer':'https://finance.naver.com'}
    });
    if(res.getResponseCode()!==200)return null;
    const data=JSON.parse(res.getContentText());
    // Naver itemSummary API: now=현재가, rate=등락률(%), diff=전일대비
    const price=parseFloat(data.now)||0;
    const daily=parseFloat(data.rate)||0;
    return{price,daily,weekly:0};
  }catch(e){
    Logger.log('KRX fetch error '+code+': '+e);
    return null;
  }
}

// Update ISA sheet price cells for every KRX ETF (6-digit ticker) via Naver —
// GOOGLEFINANCE frequently lags or fails to support newly-listed KRX ETFs for
// months, so KRX tickers bypass it entirely rather than relying on a manual
// allow-list. Tickers are read live from the sheet's GOOGLEFINANCE formulas
// (same extraction as getPricesFromSheet), not from the stale seed arrays.
function updateKrxPrices(ss){
  if(!ss)ss=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=ss.getSheetByName('ISA');
  if(!sheet)return;
  const lastRow=sheet.getLastRow();
  if(lastRow<2)return;

  const names=sheet.getRange(1,1,lastRow,1).getValues();
  const formulas=sheet.getRange(1,1,lastRow,3).getFormulas();

  for(let i=1;i<names.length;i+=2){
    const name=String(names[i][0]).trim();
    if(!name||name.includes('【 집계 】')||name.includes('💵 현금'))continue;
    const formula=formulas[i][2];
    if(!formula)continue;
    const match=formula.match(/GOOGLEFINANCE\(\s*"KRX:(\d{6})"/i);
    if(!match)continue; // not a KRX 6-digit ticker — leave to GOOGLEFINANCE
    const code=match[1];
    const fetched=fetchKrxPrice(code);
    if(!fetched||!fetched.price)continue;
    sheet.getRange(i+1,3).setValue(fetched.price);
    Logger.log(`KRX ${code} (${name}): ₩${fetched.price} (${fetched.daily>0?'+':''}${fetched.daily}%)`);
  }
  SpreadsheetApp.flush();
}

function setupMarketSheet(ss){
  if(!ss) ss=SpreadsheetApp.getActiveSpreadsheet();
  let sheet=ss.getSheetByName('_market');
  if(!sheet){sheet=ss.insertSheet('_market');try{sheet.hideSheet();}catch(e){}}
  sheet.clearContents();
  sheet.getRange(1,1,1,4).setValues([['key','price','daily_pct','weekly_pct']]);
  MARKET_ITEMS.forEach((item,i)=>{
    const r=i+2;
    sheet.getRange(r,1).setValue(item.key);
    if(item.treasuryKey){
      // Treasury API items: values set by updateTreasuryRates() at fetch time
      sheet.getRange(r,2).setValue(0);
      sheet.getRange(r,3).setValue(0);
      sheet.getRange(r,4).setValue(0);
    } else {
      const t=item.ticker, sc=item.scale||1;
      sheet.getRange(r,2).setFormula(`=IFERROR(GOOGLEFINANCE("${t}")*${sc},0)`);
      sheet.getRange(r,3).setFormula(`=IFERROR(GOOGLEFINANCE("${t}","changepct"),0)`);
      sheet.getRange(r,4).setFormula(`=IFERROR((GOOGLEFINANCE("${t}")/INDEX(GOOGLEFINANCE("${t}","price",TODAY()-7,1),2,2)-1)*100,0)`);
    }
  });
  SpreadsheetApp.flush();
}

// Fetch US Treasury yield curve from official Treasury XML API
function fetchTreasuryYields(){
  try{
    function getXml(date){
      const yyyymm=Utilities.formatDate(date,'America/New_York','yyyyMM');
      const url=`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${yyyymm}`;
      // User-Agent 없는 요청은 봇으로 간주해 차단하는 경우가 있어 다른 fetch 함수들과
      // 동일하게 브라우저 UA를 명시 (T3M/T2Y 값이 계속 비어있던 원인으로 추정)
      const res=UrlFetchApp.fetch(url,{
        muteHttpExceptions:true,
        headers:{
          'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept':'application/xml,text/xml,*/*'
        }
      });
      const body=res.getContentText();
      Logger.log('Treasury HTTP '+res.getResponseCode()+' len='+body.length+' head='+body.slice(0,300));
      if(res.getResponseCode()!==200){
        return null;
      }
      return body;
    }
    let xml=getXml(new Date());
    // If current month has no data yet (early month), try previous month
    if(!xml||xml.indexOf('BC_2YEAR')===-1){
      Logger.log('Treasury: BC_2YEAR not found in current-month response, trying previous month');
      const prev=new Date(); prev.setMonth(prev.getMonth()-1);
      xml=getXml(prev);
    }
    if(!xml){
      Logger.log('Treasury: no xml at all, returning {}');
      return {};
    }

    const parseKey=key=>{
      const matches=[...xml.matchAll(new RegExp(`<d:${key}[^>]*>([\\d.]+)<\\/d:${key}>`, 'g'))];
      return matches.map(m=>parseFloat(m[1]));
    };

    const build=(vals)=>{
      if(!vals.length) return null;
      const price  = vals[vals.length-1];
      const prev1  = vals.length>1 ? vals[vals.length-2] : price;
      const prev5  = vals.length>5 ? vals[vals.length-6] : vals[0];
      // daily/weekly stored as absolute change in pct points (e.g. +0.02 = +2bp)
      return {price, daily:+(price-prev1).toFixed(3), weekly:+(price-prev5).toFixed(3)};
    };

    const m3=parseKey('BC_3MONTH'), y2=parseKey('BC_2YEAR');
    Logger.log('Treasury parsed: BC_3MONTH count='+m3.length+' BC_2YEAR count='+y2.length);
    return {
      T3M: build(m3),
      T2Y: build(y2),
      T5Y: null  // T5Y uses GOOGLEFINANCE FVX — no need to fetch here
    };
  }catch(e){
    Logger.log('Treasury fetch error: '+e);
    return {};
  }
}

// Write treasury-fetched values into _market sheet
function updateTreasuryRates(ss){
  if(!ss) ss=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=ss.getSheetByName('_market');
  if(!sheet) return;
  const yields=fetchTreasuryYields();
  const lastRow=sheet.getLastRow();
  if(lastRow<2) return;
  const keys=sheet.getRange(2,1,lastRow-1,1).getValues().map(r=>String(r[0]));
  MARKET_ITEMS.forEach(item=>{
    if(!item.treasuryKey) return;
    const data=yields[item.key];
    if(!data) return;
    const idx=keys.indexOf(item.key);
    if(idx===-1) return;
    const row=idx+2;
    sheet.getRange(row,2).setValue(data.price);
    sheet.getRange(row,3).setValue(data.daily);
    sheet.getRange(row,4).setValue(data.weekly);
  });
  SpreadsheetApp.flush();
}

function getMarketData(ss){
  if(!ss) ss=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=ss.getSheetByName('_market');
  if(!sheet)return[];
  const lastRow=sheet.getLastRow();
  if(lastRow<2)return[];
  return sheet.getRange(2,1,lastRow-1,4).getValues()
    .map(r=>({key:String(r[0]),price:Number(r[1])||0,daily:Number(r[2])||0,weekly:Number(r[3])||0}))
    .filter(item=>item.key&&item.key!=='');
}

function createPortfolioSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tempName = "TEMP_RESET_" + Date.now();
  const tempSheet = ss.insertSheet(tempName);

  // _appdata 백업
  let appdataValue = null, appdataB = null;
  const adSheetOld = ss.getSheetByName('_appdata');
  if (adSheetOld) {
    appdataValue = adSheetOld.getRange('A1').getValue();
    appdataB     = adSheetOld.getRange('B1').getValue();
  }

  ss.getSheets().forEach(s => {
    if (s.getName() !== tempName) ss.deleteSheet(s);
  });

  const sumSheet    = ss.insertSheet('종합');
  const meritzSheet = ss.insertSheet('메리츠증권');
  const isaSheet    = ss.insertSheet('ISA');
  const adSheet     = ss.insertSheet('_appdata');
  try { adSheet.hideSheet(); } catch(e) {}

  ss.deleteSheet(tempSheet);

  // _appdata 복원
  if (appdataValue) {
    adSheet.getRange('A1').setValue(appdataValue);
    adSheet.getRange('B1').setValue(appdataB || new Date().toISOString());
  }

  createSummarySheet(sumSheet);
  createDetailSheet(meritzSheet, MERITZ_DATA, 'USD', MERITZ_SUM_ROW);
  createDetailSheet(isaSheet,    ISA_DATA,    'KRW', ISA_SUM_ROW);
  setupMarketSheet(ss);
  SpreadsheetApp.getUi().alert('✅ 최신 데이터로 초기화 완료!');
}

function createSummarySheet(sheet) {
  sheet.clearContents();
  const title = sheet.getRange('A1:D1');
  title.merge();
  title.setValue('📊 포트폴리오 종합 대시보드');
  title.setBackground('#1E40AF').setFontColor('white').setFontSize(15).setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange('A3').setValue('환율 (USD/KRW)').setFontWeight('bold');
  sheet.getRange('B3').setValue(1515).setBackground('#FEF3C7').setNumberFormat('#,##0');

  const hdr = sheet.getRange('A5:D5');
  hdr.setValues([['계좌','평가금액(KRW)','손익(KRW)','수익률(%)']]);
  hdr.setBackground('#1E40AF').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');

  sheet.getRange('A6').setValue('메리츠증권 (USD)');
  sheet.getRange('B6').setFormula(`=메리츠증권!D${MERITZ_SUM_ROW}*B3`);
  sheet.getRange('C6').setFormula(`=메리츠증권!E${MERITZ_SUM_ROW}*B3`);
  sheet.getRange('D6').setFormula('=IFERROR(C6/B6*100,0)');

  sheet.getRange('A7').setValue('ISA (KRW)');
  sheet.getRange('B7').setFormula(`=ISA!D${ISA_SUM_ROW}`);
  sheet.getRange('C7').setFormula(`=ISA!E${ISA_SUM_ROW}`);
  sheet.getRange('D7').setFormula('=IFERROR(C7/B7*100,0)');

  sheet.getRange('A8').setValue('【 총합 】').setFontWeight('bold');
  sheet.getRange('B8').setFormula('=B6+B7');
  sheet.getRange('C8').setFormula('=C6+C7');
  sheet.getRange('D8').setFormula('=IFERROR(C8/B8*100,0)');

  sheet.getRange('A8:D8').setBackground('#FEF3C7').setFontWeight('bold');
  sheet.getRange('B6:B8').setNumberFormat('₩#,##0');
  sheet.getRange('C6:C8').setNumberFormat('₩#,##0');
  sheet.getRange('D6:D8').setNumberFormat('0.00');
  sheet.setColumnWidth(1,150); sheet.setColumnWidth(2,150);
  sheet.setColumnWidth(3,150); sheet.setColumnWidth(4,120);
}

function createDetailSheet(sheet, data, currency, sumRow) {
  sheet.clearContents();
  const hdr = sheet.getRange(1, 1, 1, 5);
  hdr.setValues([['종목명 / 태그','수량 / 평단가','현재가 / 수익률%','평가금액 / 비중%','손익']]);
  hdr.setBackground('#1E40AF').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setRowHeight(1, 28);

  for (let i = 0; i < data.length; i++) {
    const name = data[i][1], qty = data[i][4], avg = data[i][5], curF = data[i][6];
    const r1 = 2 + i * 2, r2 = 3 + i * 2;

    sheet.getRange(r1, 1).setValue(name).setFontWeight('bold');
    sheet.getRange(r1, 2).setValue(qty);
    if (typeof curF === 'string' && curF.startsWith('=')) sheet.getRange(r1, 3).setFormula(curF);
    else sheet.getRange(r1, 3).setValue(curF);
    sheet.getRange(r1, 4).setFormula(`=B${r1}*C${r1}`);
    sheet.getRange(r1, 5).setFormula(`=D${r1}-B${r1}*B${r2}`);

    sheet.getRange(r2, 1).setValue('').setFontColor('#6B7280').setFontStyle('italic');
    sheet.getRange(r2, 2).setValue(avg);
    sheet.getRange(r2, 3).setFormula(`=IF(B${r2}=0,0,(C${r1}/B${r2}-1))`);
    sheet.getRange(r2, 4).setFormula(`=IF(D${sumRow}=0,0,D${r1}/D${sumRow})`);
    sheet.getRange(r2, 5).setValue('');

    sheet.getRange(r1, 1, 1, 5).setBackground('#FFFFFF');
    sheet.getRange(r2, 1, 1, 5).setBackground('#F1F5F9');

    const isWon = (currency === 'KRW');
    sheet.getRange(r1, 3).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r1, 4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r1, 5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r2, 2).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
    sheet.getRange(r2, 3).setNumberFormat('0.00%');
    sheet.getRange(r2, 4).setNumberFormat('0.00%');
    sheet.setRowHeight(r1, 22); sheet.setRowHeight(r2, 19);
  }

  const last = sumRow - 1;
  sheet.getRange(sumRow, 1).setValue('【 집계 】').setFontWeight('bold');
  sheet.getRange(sumRow, 4).setFormula(`=SUMPRODUCT((MOD(ROW(D2:D${last}),2)=0)*D2:D${last})`);
  sheet.getRange(sumRow, 5).setFormula(`=SUMPRODUCT((MOD(ROW(E2:E${last}),2)=0)*E2:E${last})`);

  const isWon = (currency === 'KRW');
  sheet.getRange(sumRow, 4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
  sheet.getRange(sumRow, 5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
  sheet.getRange(sumRow, 1, 1, 5).setBackground('#FEF3C7').setFontWeight('bold');
  sheet.setColumnWidth(1,130); sheet.setColumnWidth(2,80);
  sheet.setColumnWidth(3,80);  sheet.setColumnWidth(4,85); sheet.setColumnWidth(5,80);
}

// ─────────────────────────────────────────────
// 📅 일일 스냅샷 — 앱을 안 열어도 추이가 끊기지 않도록 시간 트리거로 실행
// 등록 방법: Apps Script 에디터 좌측 "트리거" → 트리거 추가 →
//   실행할 함수: dailySnapshot, 이벤트 소스: 시간 기반, 시간 기반 트리거 유형: 일 타이머,
//   시간대: 오후 4~5시 (미 정규장 마감 부근) 선택
// ─────────────────────────────────────────────
function dailySnapshot(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const adSheet=ss.getSheetByName('_appdata');
  if(!adSheet)return;
  const raw=adSheet.getRange('A1').getValue();
  if(!raw)return;
  let state;
  try{state=JSON.parse(raw);}catch(e){Logger.log('dailySnapshot: appData 파싱 실패');return;}
  if(!state.stocks||!state.stocks.length)return;

  updateKrxPrices(ss);
  const priceByName={};
  [...getPricesFromSheet(ss,'메리츠증권'),...getPricesFromSheet(ss,'ISA')].forEach(p=>{priceByName[p.name]=p.cur;});

  const usTickers=[...new Set(state.stocks.filter(s=>s.ticker&&!/^\d/.test(s.ticker)).map(s=>s.ticker))];
  const yahoo=fetchYahooQuotes(usTickers);

  const rate=Number(state.rate)||1510;
  let stockKRW=0, inv=0;
  const byStock={};
  state.stocks.forEach(s=>{
    let cur=Number(s.cur)||0;
    const yd=yahoo[s.ticker];
    if(yd&&yd.price>0)cur=yd.price;
    else if(priceByName[s.name]>0)cur=priceByName[s.name];
    const qty=Number(s.qty)||0, avg=Number(s.avg)||0;
    const ev=s.curr==='USD'?qty*cur*rate:qty*cur;
    const iv=s.curr==='USD'?qty*avg*rate:qty*avg;
    stockKRW+=ev; inv+=iv;
    byStock[s.name]=Math.round(ev);
  });
  const cashKRW=Object.values(state.cash||{}).reduce((a,c)=>a+(Number(c.USD)||0)*rate+(Number(c.KRW)||0),0);
  const pnl=stockKRW-inv;
  const pct=inv>0?pnl/inv*100:0;
  // 앱이 KST 기준 날짜로 스냅샷을 기록하므로 동일하게 맞춘다
  const todayStr=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');

  const snapshots=Array.isArray(state.snapshots)?state.snapshots:[];
  const snap={date:todayStr,totalKRW:Math.round(stockKRW+cashKRW),stockKRW:Math.round(stockKRW),
    cashKRW:Math.round(cashKRW),pnl:Math.round(pnl),pct:Number(pct.toFixed(2)),rate,byStock};
  const idx=snapshots.findIndex(x=>x.date===todayStr);
  if(idx>=0)snapshots[idx]=snap; else snapshots.push(snap);
  snapshots.sort((a,b)=>a.date.localeCompare(b.date));
  state.snapshots=snapshots;
  state.updatedAt=new Date().toISOString();

  adSheet.getRange('A1').setValue(JSON.stringify(state));
  adSheet.getRange('B1').setValue(state.updatedAt);
  Logger.log('일일 스냅샷 기록: '+todayStr+' 총자산 ₩'+snap.totalKRW);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 포트폴리오')
    .addItem('자동 설정하기 (초기화)', 'createPortfolioSheet')
    .addToUi();
}

// 메리츠증권/ISA 시트에서 종목별 현재가·수량·평단가를 읽는다.
// doGet과 dailySnapshot() 양쪽에서 공용으로 쓴다.
function getPricesFromSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data     = sheet.getRange(1, 1, lastRow, 5).getValues();
  const formulas = sheet.getRange(1, 1, lastRow, 5).getFormulas();
  const result   = [];

  for (let i = 1; i < data.length; i += 2) {
    const name = String(data[i][0]).replace(/\s+/g, ' ').trim();
    if (!name || name.includes('【 집계 】') || name.includes('종목명')) continue;

    const curPrice = parseFloat(data[i][2]);
    const formula  = formulas[i][2];
    let extractedTicker = '';
    if (formula && formula.toUpperCase().includes('GOOGLEFINANCE')) {
      const match = formula.match(/GOOGLEFINANCE\(\s*"([^"]+)"/i);
      if (match && match[1]) extractedTicker = match[1].replace('KRX:', '');
    }

    if (name && !isNaN(curPrice)) {
      const qty = parseFloat(data[i][1]) || 0;
      const avg = (i + 1 < data.length) ? (parseFloat(data[i + 1][1]) || 0) : 0;
      result.push({ name, cur: curPrice, ticker: extractedTicker, qty, avg });
    }
  }
  return result;
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mode = (e && e.parameter && e.parameter.mode) || 'portfolio';

  if (mode === 'market') {
    updateTreasuryRates(ss);  // Fetch T2Y from US Treasury API
    const baseMarket = getMarketData(ss);  // GOOGLEFINANCE sheet data (has weekly %)

    // Bulk-fetch Yahoo for realtime prices (overrides 15-min delayed GOOGLEFINANCE)
    const yahooSyms = MARKET_ITEMS
      .filter(item => !item.treasuryKey && item.ticker)
      .map(item => YAHOO_SYMBOL_MAP[item.ticker] || item.ticker)
      .filter(Boolean);
    const yahooMkt = fetchYahooQuotes(yahooSyms);
    // 7일 실데이터 차트 (30분 캐시) — 진짜 스파크라인용 + 묶음 조회가 가끔
    // 비워서 돌려주는 종목(예: 금·BTC 선물류)의 가격 폴백으로 사용
    const chartData = getYahooChartsCached(yahooSyms);

    // Merge: Yahoo price/daily overrides sheet, weekly kept from sheet
    const market = baseMarket.map(item => {
      const cfg = MARKET_ITEMS.find(m => m.key === item.key);
      if (!cfg || cfg.treasuryKey) return item;
      const ySym = YAHOO_SYMBOL_MAP[cfg.ticker] || cfg.ticker;
      const yd    = yahooMkt[ySym];
      const chart = chartData[ySym];
      const sc = cfg.scale || 1;
      let merged = item;
      if (yd && yd.price) {
        merged = {
          ...item,
          price:       yd.price    * sc,
          daily:       yd.daily,
          marketState: yd.marketState,
          extPrice:    yd.extPrice ? yd.extPrice * sc : null,
          extPct:      yd.extPct
        };
      } else if (chart && chart.price) {
        // 묶음 조회 실패 시 차트 API 가격으로 폴백
        merged = { ...item, price: chart.price * sc };
      }
      if (chart && chart.closes && chart.closes.length >= 2) {
        merged = { ...merged, history: chart.closes.map(c => +(c * sc).toFixed(4)) };
      }
      return merged;
    });

    return ContentService
      .createTextOutput(JSON.stringify({ market }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let rate = 1510;
  const sumSheet = ss.getSheetByName('종합');
  if (sumSheet) rate = Number(sumSheet.getRange('B3').getValue()) || 1510;

  updateKrxPrices(ss);  // Fetch KRX tickers not supported by GOOGLEFINANCE
  const meritz = getPricesFromSheet(ss, '메리츠증권');
  const isa    = getPricesFromSheet(ss, 'ISA');

  // Yahoo Finance bulk fetch for US portfolio tickers (realtime + pre/post market)
  const usTickers = new Set();
  [...meritz, ...isa].forEach(item => {
    if (item.ticker && !/^\d/.test(item.ticker)) usTickers.add(item.ticker);
  });
  const yahooPortfolio = fetchYahooQuotes([...usTickers]);
  // Build yahooData: ticker → {price, regPrice, daily, marketState, extPrice, extPct, extType}
  const yahooData = {};
  Object.entries(yahooPortfolio).forEach(([sym, data]) => { yahooData[sym] = data; });

  // Extract cash rows from sheet data — source of truth for cash amounts
  const sheetCash = {'메리츠증권':{USD:0,KRW:0}, ISA:{USD:0,KRW:0}};
  meritz.forEach(item=>{
    if(item.name.includes('💵')||item.name.includes('현금')){
      const curr=item.name.includes('USD')?'USD':'KRW';
      sheetCash['메리츠증권'][curr]=item.cur*item.qty;
    }
  });
  isa.forEach(item=>{
    if(item.name.includes('💵')||item.name.includes('현금')){
      const curr=item.name.includes('USD')?'USD':'KRW';
      sheetCash['ISA'][curr]=item.cur*item.qty;
    }
  });

  let appData = null, savedAt = null;
  try {
    const adSheet = ss.getSheetByName('_appdata');
    if (adSheet) {
      const v = adSheet.getRange('A1').getValue();
      if (v) appData = JSON.parse(v);
      savedAt = adSheet.getRange('B1').getValue();
    }
  } catch(err) {}

  return ContentService
    .createTextOutput(JSON.stringify({ rate, meritz, isa, appData, savedAt, sheetCash, yahooData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'no data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    let sheet = ss.getSheetByName('_appdata');
    if (!sheet) {
      sheet = ss.insertSheet('_appdata');
      try { sheet.hideSheet(); } catch(e) {}
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      // 📷 에이전트(채팅) 스크린샷 거래 반영 — AGENT_IMPORT_TOKEN으로만 인증,
      // 앱의 일반 저장/조회와는 별도 경로. src/vision.js와 별개로 서버 쪽에서
      // 계산까지 수행하므로 클라이언트는 거래 1건만 넘기면 된다.
      if (data._action === 'agent_apply') {
        const rawState = sheet.getRange('A1').getValue();
        if (!rawState) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'app_data_missing' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        const currentState = JSON.parse(rawState);
        const expectedToken = PropertiesService.getScriptProperties().getProperty('AGENT_IMPORT_TOKEN');
        const outcome = handleAgentApply(currentState, data, expectedToken);
        if (!outcome.success) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: outcome.error }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        if (!outcome.duplicate) {
          sheet.getRange('A1').setValue(JSON.stringify(outcome.state));
          sheet.getRange('B1').setValue(outcome.state.updatedAt);
          updateVisibleSheets(ss, outcome.state);
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: true, duplicate: outcome.duplicate,
          sourceId: data.transaction && data.transaction.sourceId,
          savedAt: outcome.state.updatedAt
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // 앱의 일반 저장 — 앱 상태에는 agentImports(에이전트 중복 방지 장부)가 없으므로,
      // 서버에 쌓인 기록을 저장분에 합쳐서 보존한다. 거부하면 no-cors인 앱이
      // 실패를 인지하지 못한 채 클라우드 저장이 영구히 끊기므로 병합이 안전하다.
      const rawState = sheet.getRange('A1').getValue();
      if (rawState) {
        try {
          const serverState = JSON.parse(rawState);
          if (Array.isArray(serverState.agentImports) && serverState.agentImports.length) {
            const incoming = Array.isArray(data.agentImports) ? data.agentImports : [];
            const seen = new Set(incoming.map(i => typeof i === 'string' ? i : i && i.sourceId).filter(Boolean));
            data.agentImports = incoming.concat(serverState.agentImports.filter(i => {
              const id = typeof i === 'string' ? i : i && i.sourceId;
              return id && !seen.has(id);
            })).slice(0, 1000);
          }
        } catch (mergeErr) {}
      }

      sheet.getRange('A1').setValue(JSON.stringify(data));
      sheet.getRange('B1').setValue(new Date().toISOString());

      if (data._action === 'export') updateVisibleSheets(ss, data);

      return ContentService
        .createTextOutput(JSON.stringify({ success: true, savedAt: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateVisibleSheets(ss, data) {
  if (!data || !data.stocks) return;

  function syncToSheet(sheetName, accountName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const stocks = data.stocks.filter(s => s.acct === accountName);
    let lastRow  = sheet.getLastRow();
    if (lastRow < 2) return;

    const appStockNames = stocks.map(s => s.name.replace(/\s+/g, ' ').trim());

    // 1. 삭제 로직
    let sumRow = -1;
    const totalRows = sheet.getLastRow();
    const allA      = sheet.getRange(1, 1, totalRows, 1).getValues();
    for (let i = 0; i < allA.length; i++) {
      if (String(allA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
    }

    if (sumRow > 2) {
      const fontWeights = sheet.getRange(1, 1, totalRows, 1).getFontWeights();
      const nameRows = [];
      for (let r = 1; r < sumRow - 1; r++) {
        if (fontWeights[r][0] === 'bold') {
          const val = String(allA[r][0]).trim();
          if (val && !val.includes('💵 현금')) nameRows.push(r + 1);
        }
      }
      for (let ni = nameRows.length - 1; ni >= 0; ni--) {
        const row       = nameRows[ni];
        const cellValue = String(sheet.getRange(row, 1).getValue()).replace(/\s+/g, ' ').trim();
        if (!appStockNames.includes(cellValue)) sheet.deleteRows(row, 2);
      }
    }

    // 2. 기존 종목 업데이트
    lastRow = sheet.getLastRow();
    const values        = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const existingNames = [];

    for (let i = 0; i < values.length; i += 2) {
      const rowName = String(values[i][0]).trim();
      if (rowName && !rowName.includes('💵 현금'))
        existingNames.push(rowName.replace(/\s+/g, ' ').trim());

      if (rowName.includes('💵 현금')) {
        let cashAmt = 0;
        if (accountName === '메리츠증권' && data.cash && data.cash['메리츠증권'])
          cashAmt = data.cash['메리츠증권']['USD'];
        else if (accountName === 'ISA' && data.cash && data.cash['ISA'])
          cashAmt = data.cash['ISA']['KRW'];
        sheet.getRange(i + 2, 3).setValue(cashAmt);
        sheet.getRange(i + 3, 2).setValue(cashAmt);
        continue;
      }

      const stock = stocks.find(s =>
        s.name.replace(/\s+/g, ' ').trim() === rowName.replace(/\s+/g, ' ').trim()
      );
      if (stock) {
        if (values[i][1] !== stock.qty) sheet.getRange(i + 2, 2).setValue(stock.qty);
        if (values[i + 1] && values[i + 1][0] !== (stock.tag || ''))
          sheet.getRange(i + 3, 1).setValue(stock.tag || '');
        if (values[i + 1] && values[i + 1][1] !== stock.avg)
          sheet.getRange(i + 3, 2).setValue(stock.avg);
        if (stock.ticker) {
          // KRX 6자리 티커도 GOOGLEFINANCE 수식을 그대로 둔다 — updateKrxPrices()가
          // 매 요청마다 네이버 시세로 값을 덮어쓰고, GOOGLEFINANCE는 안전망(폴백)으로 남는다.
          const prefix = (accountName === 'ISA') ? 'KRX:' : '';
          sheet.getRange(i + 2, 3).setFormula(
            `=IFERROR(GOOGLEFINANCE("${prefix}${stock.ticker}"),${stock.cur || 0})`
          );
        }
      }
    }

    // 3. 신규 종목 추가
    const newStocks = stocks.filter(s =>
      !existingNames.includes(s.name.replace(/\s+/g, ' ').trim())
    );
    if (newStocks.length > 0) {
      sumRow = -1;
      const currentA = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
      for (let i = 0; i < currentA.length; i++) {
        if (String(currentA[i][0]).includes('【 집계 】')) { sumRow = i + 1; break; }
      }

      if (sumRow > 2) {
        newStocks.forEach(stock => {
          sheet.insertRowsBefore(sumRow, 2);
          sheet.getRange(sumRow, 1, 2, 5).clearContent().clearFormat();

          sheet.getRange(sumRow,     1, 1, 5).setBackground('#FFFFFF');
          sheet.getRange(sumRow + 1, 1, 1, 5).setBackground('#F1F5F9');

          sheet.getRange(sumRow, 1).setValue(stock.name).setFontWeight('bold');
          sheet.getRange(sumRow, 2).setValue(stock.qty);

          if (stock.ticker) {
            const prefix = (accountName === 'ISA') ? 'KRX:' : '';
            sheet.getRange(sumRow, 3).setFormula(
              `=IFERROR(GOOGLEFINANCE("${prefix}${stock.ticker}"),${stock.cur || 0})`
            );
          } else {
            sheet.getRange(sumRow, 3).setValue(0);
          }

          sheet.getRange(sumRow, 4).setFormula(`=B${sumRow}*C${sumRow}`);
          sheet.getRange(sumRow, 5).setFormula(`=D${sumRow}-(B${sumRow}*B${sumRow + 1})`);

          sheet.getRange(sumRow + 1, 1).setValue(stock.tag || '').setFontColor('#6B7280').setFontStyle('italic');
          sheet.getRange(sumRow + 1, 2).setValue(stock.avg);
          sheet.getRange(sumRow + 1, 3).setFormula(
            `=IF(B${sumRow + 1}=0,0,(C${sumRow}/B${sumRow + 1}-1))`
          );
          sheet.getRange(sumRow + 1, 4).setValue('');
          sheet.getRange(sumRow + 1, 5).setValue('');

          const isWon = (accountName === 'ISA');
          sheet.getRange(sumRow,     3).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow,     4).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow,     5).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow + 1, 2).setNumberFormat(isWon ? '₩#,##0' : '$#,##0.00');
          sheet.getRange(sumRow + 1, 3).setNumberFormat('0.00%');
          sheet.getRange(sumRow + 1, 4).setNumberFormat('0.00%');
          sheet.setRowHeight(sumRow,     22);
          sheet.setRowHeight(sumRow + 1, 19);

          sumRow += 2;
        });
      }
    }
  }

  syncToSheet('메리츠증권', '메리츠증권');
  syncToSheet('ISA', 'ISA');

  // ✅ 행 삽입/삭제로 깨진 합계 공식 재설정
  fixSumFormula(ss.getSheetByName('메리츠증권'));
  fixSumFormula(ss.getSheetByName('ISA'));
}

// ─────────────────────────────────────────────
// 📷 에이전트 스크린샷 거래 반영 규칙
// (GAS 의존성 없음 — Node로 단위 테스트 가능. Google 로그인/OAuth 불필요,
//  AGENT_IMPORT_TOKEN 스크립트 속성 하나로만 인증한다)
// ─────────────────────────────────────────────
const AGENT_ACCOUNT_CURRENCY = { '메리츠증권': 'USD', ISA: 'KRW' };
const AGENT_TRANSACTION_TYPES = ['buy', 'sell', 'cash_in', 'cash_out'];

function agentPositiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} 값이 올바르지 않습니다.`);
  return number;
}

function agentSafeText(value, field, maxLength, pattern) {
  if (typeof value !== 'string') throw new Error(`${field} 값이 올바르지 않습니다.`);
  const text = value.trim();
  if (!text || text.length > maxLength || /[<>"'\u0000-\u001F]/.test(text) || /^[=+\-@]/.test(text) || (pattern && !pattern.test(text))) {
    throw new Error(`${field} 값이 올바르지 않습니다.`);
  }
  return text;
}

function validateAgentTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') throw new Error('거래 데이터가 없습니다.');
  const sourceId = agentSafeText(transaction.sourceId, 'sourceId', 200, /^[A-Za-z0-9|:._+-]+$/);
  if (!AGENT_TRANSACTION_TYPES.includes(transaction.type)) throw new Error('지원하지 않는 거래 유형입니다.');
  if (!AGENT_ACCOUNT_CURRENCY[transaction.account]) throw new Error('지원하지 않는 계좌입니다.');
  if (transaction.currency !== AGENT_ACCOUNT_CURRENCY[transaction.account]) throw new Error('계좌 통화가 맞지 않습니다.');
  const tradedAt = agentSafeText(transaction.tradedAt, '체결시각', 40, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  if (Number.isNaN(new Date(tradedAt).getTime())) throw new Error('체결시각이 올바르지 않습니다.');

  const normalized = {
    ...transaction,
    sourceId,
    tradedAt,
    ticker: transaction.ticker === undefined ? undefined : agentSafeText(transaction.ticker, 'ticker', 15, /^(?:[A-Z][A-Z0-9.-]{0,14}|\d{6})$/),
    name: transaction.name === undefined ? undefined : agentSafeText(transaction.name, 'name', 100),
    memo: transaction.memo === undefined || transaction.memo === null || transaction.memo === '' ? '' : agentSafeText(transaction.memo, 'memo', 500),
    qty: transaction.qty === undefined ? undefined : agentPositiveNumber(transaction.qty, '수량'),
    price: transaction.price === undefined ? undefined : agentPositiveNumber(transaction.price, '단가'),
    amount: transaction.amount === undefined ? undefined : agentPositiveNumber(transaction.amount, '금액'),
    fee: transaction.fee === undefined || transaction.fee === null ? 0 : Number(transaction.fee)
  };
  if (!Number.isFinite(normalized.fee) || normalized.fee < 0) throw new Error('수수료 값이 올바르지 않습니다.');
  if (normalized.type === 'buy' || normalized.type === 'sell') {
    if (!normalized.ticker || !normalized.name) throw new Error('종목명과 티커가 필요합니다.');
    if (!normalized.qty || !normalized.price) throw new Error('수량과 단가가 필요합니다.');
  } else if (!normalized.amount) {
    throw new Error('현금 거래에는 금액이 필요합니다.');
  }
  return normalized;
}

function applyAgentTransaction(state, transaction) {
  const tx = validateAgentTransaction(transaction);
  const next = JSON.parse(JSON.stringify(state || {}));
  next.stocks = Array.isArray(next.stocks) ? next.stocks : [];
  next.txns = Array.isArray(next.txns) ? next.txns : [];
  next.cashTxns = Array.isArray(next.cashTxns) ? next.cashTxns : [];
  next.agentImports = Array.isArray(next.agentImports) ? next.agentImports : [];
  next.cash = next.cash || {};
  next.cash[tx.account] = next.cash[tx.account] || { USD: 0, KRW: 0 };
  if (next.agentImports.some(item => (typeof item === 'string' ? item : item.sourceId) === tx.sourceId)) {
    return { state: next, duplicate: true };
  }

  const cash = Number(next.cash[tx.account][tx.currency]) || 0;
  const now = new Date().toISOString();
  if (tx.type === 'buy' || tx.type === 'sell') {
    let stock = next.stocks.find(item => item.acct === tx.account && item.ticker === tx.ticker);
    if (tx.type === 'buy' && !stock) {
      const id = next.stocks.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
      stock = { id, name: tx.name, ticker: tx.ticker, acct: tx.account, curr: tx.currency, qty: 0, avg: 0, cur: tx.price, tag: '' };
      next.stocks.push(stock);
    }
    if (!stock) throw new Error('매도할 보유 종목을 찾을 수 없습니다.');
    if (stock.curr !== tx.currency) throw new Error('보유 종목 통화가 거래 통화와 다릅니다.');

    const gross = tx.qty * tx.price;
    let cashChange;
    let pnl = 0;
    if (tx.type === 'buy') {
      const totalCost = gross + tx.fee;
      if (cash < totalCost) throw new Error('현금이 부족합니다.');
      const oldQty = Number(stock.qty) || 0;
      stock.qty = oldQty + tx.qty;
      stock.avg = (oldQty * (Number(stock.avg) || 0) + totalCost) / stock.qty;
      stock.cur = tx.price;
      cashChange = -totalCost;
    } else {
      if (tx.qty > Number(stock.qty)) throw new Error('보유수량을 초과했습니다.');
      pnl = (tx.price - Number(stock.avg || 0)) * tx.qty - tx.fee;
      stock.qty = Number(stock.qty) - tx.qty;
      stock.cur = tx.price;
      cashChange = gross - tx.fee;
    }
    next.cash[tx.account][tx.currency] = cash + cashChange;
    next.txns.unshift({
      id: Date.now(), stockId: stock.id, name: stock.name, acct: tx.account, curr: tx.currency,
      mode: tx.type, qty: tx.qty, price: tx.price, fee: tx.fee, pnl, cashChange,
      source: 'agent', sourceId: tx.sourceId, tradedAt: tx.tradedAt,
      date: tx.tradedAt.slice(0, 10), time: tx.tradedAt.slice(11, 19), memo: tx.memo || ''
    });
  } else {
    const direction = tx.type === 'cash_in' ? 1 : -1;
    if (direction < 0 && cash < tx.amount) throw new Error('현금이 부족합니다.');
    next.cash[tx.account][tx.currency] = cash + direction * tx.amount;
    next.cashTxns.unshift({
      id: Date.now(), acct: tx.account, curr: tx.currency, mode: direction > 0 ? 'in' : 'out',
      amount: tx.amount, memo: tx.memo || '', source: 'agent', sourceId: tx.sourceId,
      tradedAt: tx.tradedAt, date: tx.tradedAt.slice(0, 10), time: tx.tradedAt.slice(11, 19)
    });
  }
  next.agentImports.unshift({ sourceId: tx.sourceId, processedAt: now });
  next.agentImports = next.agentImports.slice(0, 1000);
  next.updatedAt = now;
  return { state: next, duplicate: false };
}

function handleAgentApply(state, payload, expectedToken) {
  if (!expectedToken || !payload || payload.token !== expectedToken) return { success: false, error: 'unauthorized' };
  try {
    const result = applyAgentTransaction(state, payload.transaction);
    return { success: true, duplicate: result.duplicate, state: result.state };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}
