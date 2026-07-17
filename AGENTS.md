# My Portfolio — 에이전트 공통 컨텍스트

개인 포트폴리오 주식 관리 앱. 이 파일은 이 저장소에서 작업하는 모든 AI 코딩 도구(Claude Code, Hermes 등)가 공유하는 프로젝트 컨텍스트다.

## 구성

| 파일 | 역할 |
|------|------|
| `index.html` | 얇은 셸 — 메타 태그, PWA 등록, `src/main.js` 모듈 로드 |
| `manifest.webmanifest` / `sw.js` / `icons/` | PWA — 홈 화면 설치, 오프라인 캐시 (서비스 워커는 네트워크 우선, GAS 요청은 캐시 안 함) |
| `src/constants.js` | 상수 (APP_VERSION, 태그 기본값, 시장 티커 목록, 일지 카테고리) |
| `src/state.js` | 상태 객체 `S`, localStorage 저장/로드, 일간·인트라데이 스냅샷 |
| `src/helpers.js` | 포맷/계산 헬퍼 (fK, fM, evK, totK, cashTotKRW 등) |
| `src/cloud.js` | GAS 동기화 (saveToCloud/loadFromCloud), 장 단계 감지, 자동 갱신 엔진, 시장 데이터 |
| `src/trades.js` | 매수/매도/입출금/일지 실행 + 되돌리기 |
| `src/ai.js` | `buildAISummary()` — LLM 분석용 텍스트 생성 |
| `src/vision.js` | 📷 매매 스크린샷 인식 — Claude API 비전 (모델 `claude-opus-4-8`, 키는 localStorage `pf_anthropic_key`) |
| `src/charts.js` | Chart.js 도넛/추이 차트, 트리맵 (squarify) |
| `src/market-ui.js` | 시장 탭 (스파크라인, VIX 게이지, 카드) |
| `src/views.js` | 화면 조립 (mkHdr/mkList/mkModal 등) |
| `src/bind.js` | 이벤트 바인딩 전부 |
| `src/render.js` | `render()` — 전체 리렌더 |
| `src/main.js` | 부트스트랩 |
| `src/styles.css` | 스타일 전체 |
| `Code.gs` | Google Apps Script 백엔드. 수동으로 GAS 에디터에 복사·배포. 앱용 `doGet`/`doPost`(인증 없음)와 별개로 `agent_apply` 액션(`AGENT_IMPORT_TOKEN` 인증) 보유 |
| `CLAUDE.md` | Claude Code용 지침 (이슈 트래커, 라벨, 도메인 문서 위치) |
| `docs/agents/` | 이슈 트래커 · 트리아지 · 도메인 문서 규칙 |
| `docs/agents/screenshot-trade-import.md` | **채팅에 스크린샷을 첨부**해 에이전트가 `Code.gs`의 `agent_apply`로 거래 1건을 반영하는 절차 (앱 미경유). 계산은 `Code.gs` 서버 쪽에서 전담 |

배포: main 브랜치 push → GitHub Pages 자동 배포 (kdongin6-pixel.github.io/My-portfolio). 빌드 도구 없음 — 브라우저 네이티브 ES 모듈.

**로컬 실행**: ES 모듈은 `file://`로 열면 CORS로 막힌다. 로컬 서버 필요: `python -m http.server 8000` 후 `http://localhost:8000` 접속 (또는 VS Code Live Server).

## 아키텍처

```
index.html (정적 페이지, localStorage "pf_v3")
   ↕ fetch (인증 없음 — 앱 전용 경로)
Google Apps Script 배포 URL (사용자가 ⚙️ 설정에서 입력, 소스에 없음)
   doGet  → 실시간 가격: GOOGLEFINANCE + Yahoo v7 + Naver(KRX ETF) + 미 재무부 XML
   doPost → _appdata 숨김 시트에 상태 JSON 저장, _action:'export'면 보이는 시트 갱신
           → _action:'agent_apply'면 AGENT_IMPORT_TOKEN으로만 인증되는 별도 경로
             (거래 1건을 받아 서버에서 계산·반영 — docs/agents/screenshot-trade-import.md 참고)
```

**주의**: `doGet`/`doPost`(일반 경로)는 의도적으로 인증이 없다 — GAS URL 자체가
비밀값 역할을 한다. Google 로그인 등 소유자 인증을 앱에 추가하는 시도가
과거에 있었으나(별도 논의), 프론트엔드 미동기화로 실제 앱이 깨지는 사고가
있었다. **`doGet`/`doPost`에 인증 요구사항을 추가하려면 `src/cloud.js`도
반드시 같은 PR에서 함께 수정할 것** — 안 그러면 배포 직후 전체 동기화가
끊긴다.

## 상태 객체 S (localStorage "pf_v3")

- `S.stocks[]` — `{id, name, ticker, acct, curr, qty, avg, cur, tag}`
- `S.cash` — `{메리츠증권: {USD, KRW}, ISA: {USD, KRW}}`
- `S.txns[]` — 거래내역 (undo용 `prevQty`/`prevAvg`/`cashChange` 포함)
- `S.cashTxns[]` — 입출금 내역
- `S.snapshots[]` — 일별 `{date, totalKRW, pct}` / `S.intradaySnaps[]` — 30분 간격 (2일 보관)
- `S.journal[]` — 투자일지
- `S.rate` — USD/KRW 환율 (동기화 시 클라우드 값으로 갱신)
- `S.updatedAt` — 마지막 로컬 저장 시각. loadFromCloud에서 로컬이 더 최신이면 cash/txns 덮어쓰기 금지 (동기화 레이스 방지)

## 계좌

- **메리츠증권**: USD 기준 (미국 주식)
- **ISA**: KRW 기준 (국내 상장 ETF)

## 핵심 함수 (index.html)

- `evK(s)` 종목 평가금액(원화) · `totK(list)` 합산 · `cashTotKRW()` 전체 현금(원화)
- `execTrade(id, mode, qty, price)` — 매수/매도. 현금 자동 연동. **수수료 미반영 (알려진 한계)**
- `save()` — localStorage 저장 + updatedAt 갱신 + 2초 디바운스 클라우드 저장
- `loadFromCloud()` — 가격 갱신 + appData 병합. 스냅샷은 date 기준 병합 (로컬 우선)
- `render()` — 전체 리렌더. 상태 변경 패턴: `S.modal={type:"..."}; render();`
- `getMarketPhase()` — 미장 단계(pre/regular/post/dead) 감지 → 자동 갱신 주기 결정 (30초~5분)
- `buildAISummary()` — 포트폴리오 전체를 LLM 분석용 텍스트로 정리 (🤖 AI분석 버튼)

## 코드 컨벤션

- 바닐라 JS + 브라우저 네이티브 ES 모듈 (`import`/`export`), 프레임워크·빌드 없음. 압축된 스타일 (한 줄 CSS, 짧은 변수명)
- 모듈 간 순환 참조(state↔cloud, render↔views 등)는 함수 호출 시점에만 서로를 쓰므로 안전 — 모듈 최상위에서 다른 모듈의 값을 즉시 실행하지 말 것
- 다크 테마: 배경 `#0d1117`, 카드 `#161b22`, 테두리 `#30363d`, 포인트 `#6366f1`
- 모달은 bottom sheet (`modal-bg` → `modal`), 닫기 버튼 id는 `mc`/`mc2`
- 이벤트 바인딩은 `bind()` 안에서 `q("#id")?.addEventListener` 패턴으로 일괄 등록
- 텍스트/커밋 메시지는 한국어

## 협업 규칙 (여러 에이전트가 동시 작업할 때)

1. **작업 시작 전 반드시 `git pull origin main`** — 다른 도구가 머지한 변경을 먼저 받는다
2. 기능 브랜치에서 작업 → PR → squash merge (main 직접 push 금지)
3. `index.html`은 단일 파일이라 충돌 나기 쉽다 — 작업 단위를 작게, 머지는 빠르게
4. `Code.gs` 수정 시: 저장소 커밋만으로는 반영 안 됨. 사용자가 GAS 에디터에 붙여넣고 재배포해야 함을 PR 본문에 명시할 것

## 알려진 한계 / 진행 중 논의

- 수동 매수/매도 입력(`execTrade`)은 수수료 미반영 — 📷 매매인식 경로는 수수료·세금 반영됨. 수동 경로에도 수수료 필드 추가 검토 중
- `Code.gs`의 `MERITZ_DATA`/`ISA_DATA`는 낡은 하드코딩 스냅샷 — "자동 설정하기(초기화)" 실행 시 현재 데이터가 롤백되는 지뢰
- `getMarketPhase()`가 EDT 고정 — 겨울(EST)에 1시간 어긋남
- `saveToCloud()`가 no-cors라 저장 실패를 감지 못함
- 📷 매매인식의 계좌 판정은 통화 기반 (USD→메리츠증권, KRW→ISA) — 예외 케이스는 확인 모달에서 체크 해제 후 수동 입력
