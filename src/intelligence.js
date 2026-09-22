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
