# 📷 채팅 기반 매매 스크린샷 반영 절차

증권사 체결내역/입출금 스크린샷을 **채팅창에 직접 첨부**하면, 에이전트(Hermes 또는
Claude)가 앱을 거치지 않고 `Code.gs`의 `agent_apply` 경로로 GAS에 거래 1건을
전송해 잔고를 반영하는 절차.

> **v2 (2026-07-17 개정)**: 이전 버전은 클라이언트가 전체 상태를 GET으로 받아
> 계산 후 통째로 POST하는 방식이었다. 지금은 `Code.gs`가 계산을 서버 쪽에서
> 전담하므로, 에이전트는 정규화된 거래 1건만 넘기면 된다 — `src/vision.js`와
> 로직을 중복 유지할 필요가 없어졌다.

## 사전 준비

1. **GAS 웹앱 배포 URL** (`https://script.google.com/macros/s/.../exec`)
2. **AGENT_IMPORT_TOKEN** — Apps Script → 프로젝트 설정 → 스크립트 속성에 등록된
   임의의 랜덤 문자열

두 값 모두 저장소에 커밋하지 않는다.

- **Claude Code (원격)**: claude.ai/code 환경 설정의 환경 변수로 등록, 또는 세션마다 사용자가 채팅으로 전달
- **Hermes (로컬)**: git-ignore된 로컬 파일 (예: `.secrets/gas-agent.json`)

> `AGENT_IMPORT_TOKEN`은 비밀번호와 동일하게 취급한다. 이 토큰만으로 거래
> 반영이 가능하므로 채팅 로그·커밋 메시지 등 어디에도 평문으로 남기지 않는다.

## 절차

### 1. 스크린샷에서 거래 추출 (에이전트 자체 비전 사용)

별도 API 호출 없이 에이전트 자신의 이미지 인식 능력으로 추출한다. 이미지에 보이는
**모든** 거래를 빠짐없이 추출한다 (여러 건이 한 화면에 있을 수 있음).

쉼표 포함 숫자(`1,234.56`)는 숫자로 변환. **반드시 사용자에게 인식 결과를 보여주고
확인받은 뒤** 다음 단계로 진행한다.

### 2. 계좌·통화·거래유형 정규화

`Code.gs`의 `validateAgentTransaction()`이 요구하는 형태로 변환한다:

| 필드 | 규칙 |
|---|---|
| `type` | `buy` \| `sell` \| `cash_in` \| `cash_out` (배당은 `cash_in`으로 매핑, memo에 "배당" 명시) |
| `account` | `메리츠증권` (USD 고정) \| `ISA` (KRW 고정) — **currency와 반드시 일치해야 함** |
| `currency` | `account`가 메리츠증권이면 무조건 `USD`, ISA면 무조건 `KRW` |
| `ticker` | **필수** (buy/sell). 미국 종목은 대문자 티커, 국내 ETF는 6자리 코드. 정규식 `^(?:[A-Z][A-Z0-9.-]{0,14}|\d{6})$` 미통과 시 거부됨 |
| `name` | **필수** (buy/sell), 100자 이내 |
| `qty`, `price` | **필수** (buy/sell), 양수 |
| `amount` | **필수** (cash_in/cash_out), 양수 |
| `fee` | 선택, 기본 0, 음수 불가 |
| `tradedAt` | ISO 8601 (`2026-07-17T10:00:00Z` 형식). 화면에 날짜만 있으면 시각은 `00:00:00Z`로 채움 |
| `sourceId` | **직접 생성** — 같은 거래가 두 번 반영되는 걸 막는 중복 방지 키. 예: `screenshot-{종목}-{날짜}-{수량}-{가격}` 처럼 같은 거래면 항상 같은 값이 나오게 구성 |
| `memo` | 선택, 500자 이내 |

**주의**: `ticker`는 서버가 종목을 찾는 유일한 키(`acct` + `ticker` 정확히 일치)다.
매도인데 티커가 기존 종목과 안 맞으면 신규 종목 없이 그냥 실패하니, 스크린샷에
티커가 없으면 사용자에게 반드시 물어본다.

### 3. GAS로 전송

```
POST {GAS_URL}
Content-Type: text/plain;charset=utf-8

{
  "_action": "agent_apply",
  "token": "{AGENT_IMPORT_TOKEN}",
  "transaction": {
    "sourceId": "screenshot-TSTA-20260717-3-115",
    "type": "buy",
    "account": "메리츠증권",
    "currency": "USD",
    "ticker": "TSTA",
    "name": "테스트A",
    "qty": 3,
    "price": 115,
    "fee": 0.6,
    "tradedAt": "2026-07-17T10:00:00Z",
    "memo": "📷 스크린샷 반영"
  }
}
```

계산(평단가 재계산, 현금 차감/증가, 신규 종목 생성, 보유수량 초과 검증)은 전부
`Code.gs`의 `applyAgentTransaction()`이 서버에서 수행한다. 응답:

```json
{"success": true, "duplicate": false, "sourceId": "...", "savedAt": "..."}
```

- `success: false`면 `error` 필드를 사용자에게 그대로 보여준다 (예: `현금이 부족합니다.`, `매도할 보유 종목을 찾을 수 없습니다.`, `unauthorized`(토큰 오류))
- `duplicate: true`면 이미 반영된 거래라는 뜻 — 정상, 다시 반영되지 않았을 뿐

여러 건을 반영할 땐 **하나씩 순차적으로** 요청한다 (한 번에 1건).

### 4. 완료 보고

몇 건이 반영됐는지, 반영 후 각 계좌 현금 잔액을 사용자에게 요약해서 알려준다.
확인하려면 앱을 열어 동기화하거나, GAS에 `?mode=market` 대신 별도 조회가
필요하면 사용자에게 앱에서 확인해달라고 안내한다 (일반 조회 경로는 Google
로그인 등 소유자 인증이 필요하므로 이 절차 대상이 아니다).

## 이 방식이 예전 방식보다 나은 이유

- 계산 로직이 서버(`Code.gs`) 한 곳에만 있다 — `src/vision.js`, 이 문서, Hermes
  구현이 각자 계산해서 결과가 어긋날 위험이 없다
- `sourceId` 기반 중복 반영 방지가 서버에 내장되어 있다
- 전체 상태를 매번 받아서 다시 통째로 쓰는 대신 거래 1건만 주고받아 충돌 위험이 작다
- `LockService`로 동시 요청에 대한 경합도 서버에서 처리한다

## 주의사항

- `AGENT_IMPORT_TOKEN`, GAS URL 등 민감값은 어떤 경우에도 저장소에 커밋하지 않는다
- 이 경로(`agent_apply`)는 앱의 일반 조회/저장과는 완전히 분리되어 있다. 앱 자체의
  로그인/보안 방식이 바뀌어도 이 절차와 `AGENT_IMPORT_TOKEN`에는 영향이 없다
- `Code.gs`의 `validateAgentTransaction`/`applyAgentTransaction`/`handleAgentApply`
  로직이 바뀌면 이 문서의 필드 규칙도 함께 갱신할 것
