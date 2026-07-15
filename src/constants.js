// ═══════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════
export const TC_DEFAULT={"성장주":"#6366f1","방어주":"#10b981","중소형주":"#f59e0b","현금/채권":"#06b6d4","기타":"#94a3b8"};
export const DEFAULT_TAGS=["성장주","방어주","중소형주","현금/채권","기타"];
export const APP_VERSION="v0.4.0";

export const REFRESH_MS={pre:60000,regular:30000,post:60000,dead:300000,closed:300000};

export const STOCK_PALETTE=["#f87171","#fb923c","#fbbf24","#a3e635","#4ade80","#34d399",
  "#2dd4bf","#38bdf8","#60a5fa","#818cf8","#a78bfa","#e879f9",
  "#f472b6","#fb7185","#fcd34d","#bbf7d0","#99f6e4","#bae6fd"];

export const JOURNAL_CATEGORIES={
  buy_thesis:{label:"📈 매수논리",color:"#10b981"},
  sell_thesis:{label:"📉 매도논리",color:"#f43f5e"},
  news:{label:"📰 뉴스/이슈",color:"#3b82f6"},
  thought:{label:"💭 생각",color:"#a78bfa"},
  earnings:{label:"📊 실적",color:"#f59e0b"},
  etc:{label:"📌 기타",color:"#94a3b8"}
};

export const MARKET_CFG=[
  {key:"IXIC",  label:"나스닥",  sec:"지수",     fmt:"num"},
  {key:"SPX",   label:"S&P500",  sec:"지수",     fmt:"num"},
  {key:"DJI",   label:"다우",    sec:"지수",     fmt:"num"},
  {key:"KOSPI", label:"코스피",  sec:"지수",     fmt:"num"},
  {key:"VIX",   label:"VIX",    sec:"지수",     fmt:"dec", vix:true},
  {key:"USDKRW",label:"원/달러",    sec:"금리·환율", fmt:"krw"},
  {key:"T2Y",   label:"미2Y채",    sec:"금리·환율", fmt:"pct"},
  {key:"T5Y",   label:"미5Y채",    sec:"금리·환율", fmt:"pct"},
  {key:"T10Y",  label:"미10Y채",   sec:"금리·환율", fmt:"pct"},
  {key:"DXY",   label:"달러인덱스",sec:"금리·환율", fmt:"usd"},
  {key:"GOLD",  label:"금",      sec:"원자재",   fmt:"usd"},
  {key:"WTI",   label:"WTI",    sec:"원자재",   fmt:"usd"},
  {key:"QQQ",   label:"QQQ",    sec:"ETF",      fmt:"usd"},
  {key:"TQQQ",  label:"TQQQ",   sec:"ETF",      fmt:"usd"},
  {key:"SPY",   label:"SPY",    sec:"ETF",      fmt:"usd"},
  {key:"TLT",   label:"TLT",    sec:"ETF",      fmt:"usd"},
  {key:"SOXX",  label:"SOXX",   sec:"ETF",      fmt:"usd"},
  {key:"GLD",   label:"GLD",    sec:"ETF",      fmt:"usd"},
  {key:"NVDA",  label:"NVDA",   sec:"빅테크",   fmt:"usd"},
  {key:"GOOGL", label:"GOOGL",  sec:"빅테크",   fmt:"usd"},
  {key:"AAPL",  label:"AAPL",   sec:"빅테크",   fmt:"usd"},
  {key:"MSFT",  label:"MSFT",   sec:"빅테크",   fmt:"usd"},
  {key:"AMZN",  label:"AMZN",   sec:"빅테크",   fmt:"usd"},
  {key:"META",  label:"META",   sec:"빅테크",   fmt:"usd"},
  {key:"TSLA",  label:"TSLA",   sec:"빅테크",   fmt:"usd"},
  {key:"AVGO",  label:"AVGO",   sec:"빅테크",   fmt:"usd"},
  {key:"BTC",   label:"BTC",    sec:"원자재",   fmt:"usd"},
  {key:"RUT",   label:"러셀2000",sec:"지수",     fmt:"num"},
  {key:"T3M",   label:"미3M채",   sec:"금리·환율", fmt:"pct"},
  {key:"SILVER",label:"은",      sec:"원자재",   fmt:"usd"},
  {key:"BRENT", label:"브렌트",  sec:"원자재",   fmt:"usd"},
  {key:"XLK",   label:"기술",    sec:"섹터", fmt:"usd"},
  {key:"XLB",   label:"소재",    sec:"섹터", fmt:"usd"},
  {key:"XLY",   label:"임의소비", sec:"섹터", fmt:"usd"},
  {key:"XLI",   label:"산업재",  sec:"섹터", fmt:"usd"},
  {key:"XLC",   label:"통신",    sec:"섹터", fmt:"usd"},
  {key:"XLV",   label:"헬스케어", sec:"섹터", fmt:"usd"},
  {key:"XLF",   label:"금융",    sec:"섹터", fmt:"usd"},
  {key:"XLRE",  label:"부동산",  sec:"섹터", fmt:"usd"},
  {key:"XLU",   label:"유틸리티", sec:"섹터", fmt:"usd"},
  {key:"XLP",   label:"필수소비", sec:"섹터", fmt:"usd"},
  {key:"XLE",   label:"에너지",  sec:"섹터", fmt:"usd"},
  {key:"SNOW",  label:"SNOW",   sec:"이슈", fmt:"usd"},
  {key:"SMCI",  label:"SMCI",   sec:"이슈", fmt:"usd"},
  {key:"MU",    label:"MU",     sec:"이슈", fmt:"usd"},
  {key:"PLTR",  label:"PLTR",   sec:"이슈", fmt:"usd"},
  {key:"COST",  label:"COST",   sec:"이슈", fmt:"usd"},
  {key:"XOM",   label:"XOM",    sec:"이슈", fmt:"usd"},
  {key:"CVX",   label:"CVX",    sec:"이슈", fmt:"usd"},
  {key:"INTC",  label:"INTC",   sec:"이슈", fmt:"usd"},
];
