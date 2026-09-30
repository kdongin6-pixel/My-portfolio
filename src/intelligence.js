// 통합 투자 인텔리전스: 논지·스트레스·사이클
// 읽기 전용 계산만 담당하며 거래/현금/스냅샷을 변경하지 않는다.

export const THESIS_PROFILES={
  CME:{role:'금융·시장인프라',thesis:'거래·청산·시장데이터 수수료를 받는 거래소 사업',drivers:['거래량·헤지 수요','금리·FX·지수 변동성','청산·시장데이터 수익'],falsifiers:['거래량 수개 분기 둔화','수수료 경쟁·시장점유율 하락','청산회원·시스템 리스크'],cycle:['market_activity']},
  GOOGL:{role:'AI·빅테크',thesis:'Cloud·AI 성장과 대규모 Capex의 회수',drivers:['Cloud 성장·마진','AI 수요와 RPO','Capex 대비 CFO·FCF'],falsifiers:['Cloud·RPO 둔화','Capex 회수 지연','반독점·희석 부담'],cycle:['ai','cloud']},
  PLTR:{role:'소프트웨어',thesis:'기업 데이터·AI 의사결정 플랫폼의 반복 매출 확대',drivers:['상업·정부 계약','고객당 매출 확대','소프트웨어 마진'],falsifiers:['상업 성장 둔화','계약의 일회성화','높은 밸류에이션'],cycle:['ai','software']},
  NBIS:{role:'AI·데이터센터',thesis:'GPU·데이터센터 투자의 매출·가동률·마진 전환',drivers:['GPU 가동률','계약·RPO','Capex 회수·자금조달'],falsifiers:['고객집중','Capex/매출 불균형','부채·리스·희석 확대'],cycle:['ai','datacenter']},
  GEV:{role:'전력·원전',thesis:'전력망·터빈·그리드 백로그의 매출·마진 전환',drivers:['RPO·수주','가스터빈·그리드 공급','Wind 정상화'],falsifiers:['Wind 손실','수주 전환 지연','선수금 없는 CFO 약화'],cycle:['power','datacenter']},
  IBM:{role:'엔터프라이즈 IT',thesis:'Red Hat·소프트웨어·AI 계약과 메인프레임 방어력의 결합',drivers:['소프트웨어 반복매출','AI 계약의 매출 전환','FCF·부채 관리'],falsifiers:['소프트웨어 성장 둔화','컨설팅 약화','FCF·부채 지표 악화'],cycle:['ai','software']}
};

export const STRESS_SHOCKS={
  '전력·원전':-0.25,'반도체':-0.30,'AI·데이터센터':-0.25,'AI·빅테크':-0.25,'소프트웨어':-0.25,
  '미국지수·코어':-0.18,'레버리지·지수':-0.50,'레버리지·개별주':-0.50,'양자컴퓨팅':-0.40,
  '헬스케어':-0.15,'배당·방어':-0.10,'가치·복합금융':-0.15,'초단기채·현금성':-0.01,'금융·시장인프라':-0.15,
  '디지털자산·고변동':-0.50
};

const TAG_PROFILES={
  '전력·원전':{role:'전력·원전',thesis:'전력수요·그리드·원전 투자 사이클의 수혜',drivers:['전력수요·데이터센터 CAPEX','수주·백로그 전환','마진·현금흐름 정상화'],falsifiers:['수주 전환 지연','원가·Wind 손실 확대','전력투자 둔화'],cycle:['power']},
  '반도체':{role:'반도체',thesis:'AI·메모리·가속기 수요와 반도체 투자 사이클',drivers:['메모리·GPU 수요','가격·가동률','고객 CAPEX'],falsifiers:['재고 증가','가격 하락','CAPEX 축소'],cycle:['ai']},
  '배당·방어':{role:'배당·방어',thesis:'현금흐름·배당·방어적 수요를 통한 변동성 완충',drivers:['배당 지속성','가격결정력','방어적 수요'],falsifiers:['마진 하락','배당 여력 약화','방어수요 훼손'],cycle:[]},
  'AI·빅테크':{role:'AI·빅테크',thesis:'대형 플랫폼·AI·클라우드의 이익과 현금흐름 성장',drivers:['클라우드·광고 성장','AI 수익화','현금흐름'],falsifiers:['성장 둔화','Capex 회수 지연','규제'],cycle:['ai','cloud']},
  '소프트웨어':{role:'소프트웨어',thesis:'기업용 데이터·AI·소프트웨어 반복매출 확대',drivers:['ARR·계약 성장','고객 유지율','마진'],falsifiers:['성장 둔화','계약 일회성화','고평가'],cycle:['software','ai']},
  '헬스케어':{role:'헬스케어',thesis:'의료 수요·제품 경쟁력·방어적 현금흐름',drivers:['수요 안정성','신제품·처방 성장','마진'],falsifiers:['규제·가격압박','임상·제품 리스크','성장 둔화'],cycle:[]},
  '미국지수·코어':{role:'미국지수·코어',thesis:'미국 대형주·성장기업 전체에 대한 코어 노출',drivers:['이익 성장','시장 폭 확대','장기 투자기간'],falsifiers:['이익 추정 하향','금리 급등','집중도 확대'],cycle:['ai']},
  '레버리지·지수':{role:'레버리지·지수',thesis:'미국 성장·지수 방향성에 대한 전술적 레버리지',drivers:['지수 상승','추세 지속','변동성 관리'],falsifiers:['횡보·급락','경로의존성','비중 과대'],cycle:['ai']},
  '레버리지·개별주':{role:'레버리지·개별주',thesis:'개별 성장·인프라 종목 방향성에 대한 전술적 레버리지',drivers:['기초자산 상승','추세 지속','분할매수 규율'],falsifiers:['급락·변동성','경로의존성','기초논지 훼손'],cycle:['ai','power']},
  '양자컴퓨팅':{role:'양자컴퓨팅',thesis:'양자 기술 상용화 기대에 대한 고변동 위성 노출',drivers:['기술 진전','정부·기업 계약','상용화'],falsifiers:['상용화 지연','자금조달·희석','높은 변동성'],cycle:['ai']},
  '가치·복합금융':{role:'가치·복합금융',thesis:'보험·현금·산업자산이 결합된 가치·방어 복합 노출',drivers:['자본배분','보험·산업 이익','현금성 자산'],falsifiers:['보험손실','자본배분 악화','가치평가 하락'],cycle:[]},
  '디지털자산·고변동':{role:'디지털자산·고변동',thesis:'디지털자산·채굴·고성장 인프라에 대한 고변동 노출',drivers:['디지털자산 가격','채굴 economics','전력·데이터센터 수요'],falsifiers:['가격 급락','희석·부채','전력비·가동률 악화'],cycle:['datacenter']},
  '초단기채·현금성':{role:'초단기채·현금성',thesis:'유동성 보존과 대기자금 운용',drivers:['원금 안정성','이자수익','유동성'],falsifiers:['유동성·신용 문제','금리 하락','현금 필요 증가'],cycle:[]}
};

export function profileFor(stock){
  const ticker=String(stock?.ticker||'').toUpperCase();
  return THESIS_PROFILES[ticker]||TAG_PROFILES[analysisTag(stock)]||null;
}
export function analysisTag(stock){return stock?.ticker==='CME'?'금융·시장인프라':(stock?.tag||'태그 없음');}
export function calcStress(stocks,rate,total){
  const rows=[]; let loss=0;
  for(const s of stocks||[]){if(!(Number(s.qty)>0))continue;const value=s.qty*s.cur*(s.curr==='USD'?rate:1);const tag=analysisTag(s);const shock=STRESS_SHOCKS[tag]??-0.20;const row={ticker:s.ticker,name:s.name,tag,value,shock,loss:value*shock};rows.push(row);loss+=row.loss;}
  return {rows,totalLoss:loss,totalLossPct:total>0?loss/total*100:0};
}
export function cycleCards(stocks,rate=1){
  const counts={ai:0,software:0,datacenter:0,power:0,market_activity:0};
  for(const s of stocks||[]){if(!(Number(s.qty)>0))continue;const v=s.qty*s.cur*(s.curr==='USD'?rate:1);const p=profileFor(s);for(const c of (p?.cycle||[]))counts[c]+=v;}
  return [
    {key:'ai',label:'AI·클라우드',value:counts.ai,phase:'확장 논지 확인 필요',check:'Capex·Cloud·계약의 매출 전환'},
    {key:'datacenter',label:'데이터센터·전력',value:counts.datacenter,phase:'수요는 강하나 회수 검증',check:'가동률·전력공급·마진'},
    {key:'power',label:'전력·원전',value:counts.power,phase:'수주에서 이익 전환',check:'RPO·Wind·선수금 없는 CFO'},
    {key:'software',label:'소프트웨어',value:counts.software,phase:'반복매출 확인',check:'상업 성장·마진·유지율'},
    {key:'market_activity',label:'금융시장 활동',value:counts.market_activity,phase:'거래량 의존',check:'거래량·수수료·청산 안정성'}
  ];
}

function positionValue(s,rate=1){return Number(s?.qty)>0?Number(s.qty)*Number(s.cur||0)*(s.curr==='USD'?rate:1):0;}
function nativeToKrw(value,curr,rate=1){return Number(value||0)*(curr==='USD'?rate:1);}

// 원장과 현재 평가액을 분리해 보여주는 읽기 전용 손익 기여도.
export function calcPerformanceAttribution(stocks,txns=[],rate=1){
  const byKey=new Map();
  for(const s of stocks||[]){
    const key=String(s.ticker||s.name||'');
    if(!key)continue;
    const value=positionValue(s,rate), cost=nativeToKrw(Number(s.qty||0)*Number(s.avg||0),s.curr,rate);
    byKey.set(key,{ticker:s.ticker||'',name:s.name||key,value,cost,realized:0,day:0});
  }
  for(const t of txns||[]){
    const key=String(t.ticker||'');
    const row=byKey.get(key)||byKey.get(String(t.name||''));
    if(!row)continue;
    row.realized+=nativeToKrw(Number(t.pnl||0),t.curr,rate);
  }
  const rows=[...byKey.values()].map(r=>({...r,unrealized:r.value-r.cost,contribution:r.value-r.cost+r.realized}));
  const totalContribution=rows.reduce((a,r)=>a+r.contribution,0);
  return {rows:rows.sort((a,b)=>b.contribution-a.contribution),totalContribution,unrealized:rows.reduce((a,r)=>a+r.unrealized,0),realized:rows.reduce((a,r)=>a+r.realized,0)};
}

// 최근 두 일별 스냅샷에서 확인 가능한 가격·평가액 변화 기여도.
export function calcDayAttribution(snapshots=[]){
  const snaps=[...(snapshots||[])].filter(s=>s&&s.byStock).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(snaps.length<2)return {date:null,rows:[],totalChange:null};
  const prev=snaps[snaps.length-2],last=snaps[snaps.length-1];
  const names=new Set([...Object.keys(prev.byStock||{}),...Object.keys(last.byStock||{})]);
  const rows=[...names].map(name=>({name,change:Number(last.byStock?.[name]||0)-Number(prev.byStock?.[name]||0)})).sort((a,b)=>b.change-a.change);
  return {date:last.date,previousDate:prev.date,rows,totalChange:Number(last.totalKRW||0)-Number(prev.totalKRW||0)};
}

export const RISK_BUDGETS={single:25,leverage:10,highVol:20,cashFloor:5};
export function calcRiskBudget(stocks,cash={},rate=1,total=0){
  const rows=(stocks||[]).filter(s=>Number(s.qty)>0).map(s=>({ticker:s.ticker,name:s.name,tag:analysisTag(s),value:positionValue(s,rate)}));
  const securities=rows.reduce((a,r)=>a+r.value,0);
  const cashValue=Object.values(cash||{}).reduce((a,c)=>a+nativeToKrw(c?.KRW,'KRW',rate)+nativeToKrw(c?.USD,'USD',rate),0);
  const nav=total||securities+cashValue;
  const top=rows.slice().sort((a,b)=>b.value-a.value)[0]||null;
  const leverageValue=rows.filter(r=>r.tag.startsWith('레버리지')).reduce((a,r)=>a+r.value,0);
  const highVolValue=rows.filter(r=>['레버리지·지수','레버리지·개별주','양자컴퓨팅','디지털자산·고변동'].includes(r.tag)).reduce((a,r)=>a+r.value,0);
  const pct=v=>nav>0?v/nav*100:0;
  const checks=[
    {key:'single',label:'단일 종목 집중',value:pct(top?.value||0),limit:RISK_BUDGETS.single,unit:'%',status:pct(top?.value||0)>RISK_BUDGETS.single?'주의':'정상',detail:top?.name||'—'},
    {key:'leverage',label:'레버리지 노출',value:pct(leverageValue),limit:RISK_BUDGETS.leverage,unit:'%',status:pct(leverageValue)>RISK_BUDGETS.leverage?'주의':'정상',detail:'레버리지 ETF·개별주'},
    {key:'highVol',label:'고변동 위성 노출',value:pct(highVolValue),limit:RISK_BUDGETS.highVol,unit:'%',status:pct(highVolValue)>RISK_BUDGETS.highVol?'주의':'정상',detail:'레버리지·양자·디지털자산'},
    {key:'cash',label:'현금 완충',value:pct(cashValue),limit:RISK_BUDGETS.cashFloor,unit:'%',status:pct(cashValue)<RISK_BUDGETS.cashFloor?'주의':'정상',detail:'USD·KRW 현금 환산'}
  ];
  return {nav,securities,cashValue,cashPct:pct(cashValue),top,checks,leverageValue,highVolValue};
}

export const EVENT_CALENDAR=[
  {id:'us-midterm-2026',date:'2026-11-03',title:'미국 중간선거',type:'정책·선거',impact:'높음',tags:['미국지수·코어','AI·빅테크','전력·원전'],note:'정책·금리·위험선호 변동성 점검'},
  {id:'fomc-2026-10',date:'2026-10-28',title:'FOMC 금리결정',type:'금리',impact:'높음',tags:['미국지수·코어','소프트웨어','반도체'],note:'금리 경로와 성장주 밸류에이션 점검'},
  {id:'cpi-2026-10',date:'2026-10-14',title:'미국 CPI',type:'물가',impact:'높음',tags:['미국지수·코어','레버리지·지수','배당·방어'],note:'실질금리·달러·레버리지 노출 점검'},
  {id:'jobs-2026-10',date:'2026-10-02',title:'미국 고용보고서',type:'고용',impact:'중간',tags:['미국지수·코어','금융·시장인프라'],note:'경기 둔화와 인하 기대의 방향 확인'},
  {id:'pce-2026-10',date:'2026-10-30',title:'미국 PCE 물가',type:'물가',impact:'높음',tags:['미국지수·코어','소프트웨어','반도체'],note:'연준 선호 물가와 금리 민감도 점검'}
];
export function eventCards(now=new Date(),events=EVENT_CALENDAR){
  const today=new Date(now);today.setHours(0,0,0,0);
  return (events||[]).map(e=>{const date=e.date?new Date(`${e.date}T00:00:00`):null;const days=date?Math.ceil((date-today)/86400000):null;return {...e,days,status:days===null?'일정 입력 필요':days<0?'지난 일정':days===0?'오늘':`D-${days}`};}).sort((a,b)=>(a.days??99999)-(b.days??99999));
}
