# 메리츠 시세 전용 서버 연결과 UI 데이터 계약

## 범위
- 브라우저는 증권사 App Key/Secret을 보유하지 않는다. 공개 정적 파일이나 저장소에 키를 넣지 않는다.
- GAS의 서버 전용 `MeritzMarketData` 파일이 OAuth 발급 및 국내/해외 현재가 GET 두 경로만 호출한다. `MeritzPriceHistory`는 시세 전용 일봉 GET `/market/v1/candles/days`, `/market/v1/overseas/candles/days`만 추가한다. 원종가(수정주가 구분 1), 국내 TJ/Y 정규장 종가를 요청하고 실제 거래일만 표시한다. 기본 조회는 캐시만 읽으며 fresh 요청에서만 수집한다.
- 계좌조회·주문·취소·환전 경로는 없다. 증권사-원장 대조 기능은 별도 승인/권한이 생길 때까지 미연결이다.
- 클라이언트 경로 제한은 유출된 키의 증권사 측 거래권한 제한과 다르다.

## 조회 계약
기존 `portfolio` 읽기 요청에서 `freshQuotes: true`일 때 외부 시세를 갱신한다. 기본 읽기는 서버 시세 캐시와 원장만 읽는다. 시세 갱신은 원장·현금·평단·보유수량·거래행·시트 가격을 쓰지 않는다.

- 종목별 응답: `quoteSource`, `quoteObservedAt`, `quoteQueriedAt`, `quoteRequestedAt`, `quoteMode`, `quoteSession`, `quoteCached`.
- `quoteObservedAt: null`은 실제 거래소 관측시각 미제공을 뜻한다. `quoteQueriedAt`으로 채우지 않는다.
- 모드/세션은 공급자 데이터로 검증하지 못하면 `unknown`을 유지한다.
- `quoteQuality`: account/ticker/source/observedAt/queriedAt/mode/session/cached/validPrice.
- `quoteProvider`: provider/enabled/verified/total/requestedFresh. `verified`는 공급자 성공 응답과 종목 식별자·양수가 확인됐다는 뜻이지 체결 지연시간 검증이나 전시장 실시간 보장이 아니다.
- `rateQuality`: 기존 시트 환율의 관측시각은 미확인이므로 source=sheet, observedAt=null, mode=unknown.
- REST 요청이 실패하면 이전 정상 캐시 또는 기존 시트 가격을 남기되 출처·시각 미확인을 숨기지 않는다.

## 호출 제한
최대 50개 서로 다른 보유종목만 대상으로 한다. 해외 거래소는 검증된 매핑이 있는 종목만 조회한다. 잘 모르는 거래소를 티커만 보고 추측하지 않는다. GGLL은 실제 Nasdaq/OQ 조회로 확인했다.

최대 4개 병렬 배치 사이에 1초 간격을 둔다. 실패 종목 중 최대 8개에 대해 순차 1회만 재시도한다. 무한 재시도하지 않는다. 최근 30초 이내 캐시는 재사용하며, 서버 캐시 수명은 최대 6시간이다. 캐시를 장중 실시간 수신으로 표시하면 안 된다.

## 서버 설정과 인증
`agent_configure_market_data`는 기존 거래수입용 agent token을 검증한 뒤 지정된 메리츠 키·MAC·enabled 속성만 설정한다. 공유 읽기 secret으로는 설정 변경이 불가능하다. 임의 URL/경로/속성 필드는 거부한다. 응답은 성공·provider·enabled만 반환한다. 정상 시세 응답에는 키/토큰이 없다.

키는 기존 ACL 제한 로컬 설정에서 서버 ScriptProperties로 전달하며 값은 출력하지 않는다. 일회용 폰 키 전달 페이지를 다시 사용하지 않는다.

## 배포·롤백 원칙
실제 운영 GAS에는 저장소 `Code.gs`와 다른 인증·원장 코드 및 별도 파일이 존재할 수 있다. **저장소 Code.gs를 그대로 push해서 운영 코드를 덮어쓰지 않는다.** 관리 API로 현재 배포의 immutable content와 HEAD를 별도 백업하고, 운영 코드에 아래 변경만 적용한다.

1. `getPortfolioResponse_`의 `updateKrxPrices` 쓰기를 제거한다.
2. 메리츠 활성화 시 같은 요청에서 Yahoo 종목 현재가 조회를 중복 수행하지 않는다.
3. 원장 로드 뒤 `applyMeritzReadQuotes_`를 호출하고 provider/FX 품질 필드를 응답에 추가한다.
4. `doPost`의 공유 읽기 gate 뒤, owner-auth 경로 앞에 전용 설정 handler를 배치한다. handler 자체가 agent token을 검증한다.
5. additive SERVER_JS 파일을 추가하고 나머지 파일·manifest는 그대로 보존한다.
6. 후보 업로드→immutable version read-back→원래 HEAD 복원→기존 deployment ID 업데이트→실제 인증된 fresh/default 읽기 순서로 검증한다.

로컬 관리/증거 경로는 운영자 환경에만 존재한다: `E:/hermes/portfolio-ui-evidence/` (배포 전 content/deployment/HEAD, 후보, 원장 digest, 실제 probe 결과). 키 파일은 증거 디렉터리나 저장소에 복사하지 않는다.

롤백은 메리츠 enabled=false를 인증된 설정 경로로 적용한 뒤, 백업한 기존 deploymentConfig의 버전을 되돌리고 read-back한다. 원장은 변경하지 않았으므로 잔고/거래 데이터를 과거 시점으로 복원하지 않는다. 프론트엔드는 배포 직전 커밋을 기준으로 기능 커밋만 되돌린다.

## 검증
`node --test tests/meritz_market_data.test.mjs`는 인증 거부, 엄격한 종목/통화 일치, 날짜 미조작, 캐시 전용 기본 조회, 불변 원장 overlay, 호출 배치·실패 재시도를 테스트한다. 실제 운영 함수를 실행하는 별도 로컬 integration probe와 실제 운영 fresh/default 요청에서도 원장 전체 appData digest와 savedAt을 비교한다.

명세상 실시간 요청 플래그와 실제 틱 지연 검증은 다르다. WebSocket은 연결하지 않는다. 서버 연결 이후에도 PC가 켜져 있어야만 조회되는 브리지나 새 LLM 정기 작업은 추가하지 않는다.
