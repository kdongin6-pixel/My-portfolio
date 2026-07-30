# 📊 포트폴리오 조회 API (읽기 전용)

`Code.gs`의 `doGet`/`doPost`가 제공하는 읽기 전용 조회 경로. `agent_apply`(거래
반영, 쓰기)와는 완전히 별개이며 서로 다른 비밀값을 쓴다.

| 경로 | 용도 | 비밀값 |
|---|---|---|
| `agent_apply` (POST, `_action` 필드) | 거래 1건 반영 (쓰기) | `AGENT_IMPORT_TOKEN` |
| 이 문서의 조회 경로 (GET 또는 POST) | 잔고/시세 조회 (읽기 전용) | `SHARED_SECRET` |

두 비밀값은 서로 다른 스크립트 속성이며, 하나가 유출/교체돼도 다른 하나에는
영향이 없다.

## 사전 준비

1. **GAS 웹앱 배포 URL** (`https://script.google.com/macros/s/.../exec`)
2. **SHARED_SECRET** — Apps Script → 프로젝트 설정 → 스크립트 속성에 등록된
   임의의 랜덤 문자열 (이름이 정확히 `SHARED_SECRET`이어야 함 — 대소문자까지
   일치해야 서버가 인식한다)

두 값 모두 저장소에 커밋하지 않는다. `agent_apply`와 마찬가지로
git-ignore된 로컬 파일(예: `E:\hermes\.secrets\gas-agent.json`)에 함께
저장해도 되고, 별도 파일로 분리해도 된다.

## 요청 방법 (서버 간 호출은 POST 권장)

```
POST {GAS_URL}
Content-Type: application/json

{"secret": "{SHARED_SECRET}", "mode": "portfolio"}
```

`mode`는 `"portfolio"`(기본값) 또는 `"market"`.

> GET(`{GAS_URL}?mode=portfolio&secret={SHARED_SECRET}`)도 동작하지만, 그건
> 프런트엔드(`src/cloud.js`) 호환을 위해 열어둔 경로다. 서버 간 호출은 POST를
> 쓴다 — URL 쿼리스트링에 비밀값이 남는 걸 줄이기 위함.

시크릿이 없거나 틀리면 항상 아래를 반환한다 (다른 필드 없음):
```json
{"error": "unauthorized"}
```

## 응답 — `mode: "portfolio"`

```json
{
  "rate": 1510,
  "meritz": [...],
  "isa": [...],
  "appData": { ... },
  "savedAt": "2026-...",
  "sheetCash": {"메리츠증권": {"USD":0,"KRW":0}, "ISA": {"USD":0,"KRW":0}},
  "yahooData": { ... }
}
```

실제로 필요한 건 대부분 **`appData`** 하나다 — 앱의 전체 상태(localStorage
`pf_v3`와 동일 스키마)가 그대로 들어있다. 핵심 필드:

| 필드 | 설명 |
|---|---|
| `appData.stocks[]` | `{id, name, ticker, acct, curr, qty, avg, cur, tag}` — 종목별 보유수량·평단가·현재가·계좌·통화. `tag`가 v5 스펙의 "섹터"에 가장 가까운 필드(예: "성장주") — 별도 GICS 섹터 필드는 없음, 필요하면 `tag`로 근사하거나 티커 기준 별도 매핑 필요 |
| `appData.cash` | `{"메리츠증권": {"USD":n,"KRW":n}, "ISA": {"USD":n,"KRW":n}}` |
| `appData.txns[]` | 거래 이력 (매수/매도, 수수료 포함) |
| `appData.snapshots[]` | 일별 스냅샷 `{date, totalKRW, stockKRW, cashKRW, pnl, pct, rate, byStock}` — `dailySnapshot()` 트리거로 매시간 갱신됨 |
| `appData.updatedAt` | 마지막 갱신 시각 (ISO 8601) — 데이터 신선도 판정용 |

`savedAt`(시트에 저장된 시각)과 `appData.updatedAt`을 비교하면 스냅샷 기준일
신선도를 판정할 수 있다.

## 응답 — `mode: "market"`

```json
{"market": [{"key":"T10Y","price":4.66,"daily":0.63,"weekly":0.2,"history":[...]}, ...]}
```

지수/금리/원자재/ETF/빅테크/섹터 시세 배열. 국채금리(`T3M`,`T2Y`,`T5Y`,`T10Y`)
포함.

## 주의사항

- **읽기 전용이다.** 이 경로로는 어떤 값도 바꿀 수 없다 — 잔고를 바꾸려면
  `screenshot-trade-import.md`의 `agent_apply` 경로를 쓴다.
- `SHARED_SECRET`, GAS URL은 어떤 경우에도 저장소·커밋 메시지·채팅 로그에
  평문으로 남기지 않는다.
- v5 스펙 §5.1 3단계(OAuth 읽기 전용 연동)의 대체가 아니라, 그 전까지의 임시
  강화 조치다. 앱이 GitHub Pages로 공개 호스팅되므로, `SHARED_SECRET`이
  브라우저 네트워크 탭/localStorage에서는 여전히 보인다는 한계가 있다
  ("URL 유출"은 막지만 "앱을 열어본 사람"까지는 못 막음).
