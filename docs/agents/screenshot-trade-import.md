# 📷 채팅 기반 매매 스크린샷 반영 절차

증권사 체결내역/입출금 스크린샷을 **채팅창에 직접 첨부**하면, 에이전트(Hermes 또는
Claude)가 앱을 거치지 않고 Google Sheets(`_appdata`)를 직접 읽고 써서 잔고를
반영하는 절차. 앱 내 `📷 매매인식` 버튼(`src/vision.js`, `claude-opus-4-8` 비전
API 호출)과 **동일한 계산 로직**을 그대로 따른다 — 어느 경로로 반영하든 숫자가
일치해야 하기 때문.

## 사전 준비

GAS 웹앱 배포 URL(`https://script.google.com/macros/s/.../exec`)이 필요하다.
이 URL은 저장소에 커밋하지 않는다 — 다음 중 하나로만 보관한다.

- **Claude Code (원격)**: claude.ai/code 환경 설정의 환경 변수로 등록, 또는 세션마다 사용자가 채팅으로 전달
- **Hermes (로컬)**: git-ignore된 로컬 파일 (예: `.secrets/gas-url.txt`)

> 이 URL은 인증 없이 읽기/쓰기가 가능한 엔드포인트이므로 비밀번호처럼 취급한다.

## 절차

### 1. 현재 클라우드 상태 조회

```
GET {GAS_URL}
```

응답 중 `appData` 필드가 `localStorage`의 `pf_v3`와 동일한 구조다 (`src/state.js`
`save()` 참고):

```json
{
  "rate": 1510,
  "appData": {
    "stocks": [{"id":1,"name":"...","ticker":"...","acct":"메리츠증권","curr":"USD","qty":10,"avg":100,"cur":120,"tag":"..."}],
    "cash": {"메리츠증권":{"USD":0,"KRW":0},"ISA":{"USD":0,"KRW":0}},
    "cashTxns": [...],
    "txns": [...],
    "snapshots": [...],
    "intradaySnaps": [...],
    "journal": [...],
    "tags": [...],
    "tagColors": {...},
    "rate": 1510,
    "updatedAt": "2026-07-17T..."
  },
  "savedAt": "..."
}
```

`appData`가 없으면(최초 1회) 시트에 아직 `_appdata`가 없는 것이므로 반영을 중단하고
사용자에게 먼저 앱을 한 번 열어 동기화해달라고 안내한다.

### 2. 스크린샷에서 거래 추출 (에이전트 자체 비전 사용)

별도 API 호출 없이 에이전트 자신의 이미지 인식 능력으로 아래 항목을 추출한다.
이미지에 보이는 **모든** 거래를 빠짐없이 추출한다 (여러 건이 한 화면에 있을 수 있음).

| 필드 | 설명 |
|---|---|
| `type` | `buy` \| `sell` \| `deposit` \| `withdraw` \| `dividend` |
| `name` | 종목명 (화면 그대로) |
| `ticker` | 티커/종목코드, 안 보이면 `""` |
| `qty` | 체결 수량 (매매만, 현금 거래는 0) |
| `price` | 체결 단가 (매매만) |
| `amount` | 입금/출금/배당 금액 (현금 거래만) |
| `fee` | 수수료 |
| `tax` | 세금/제비용 |
| `currency` | `USD` \| `KRW` |
| `date` | `YYYY-MM-DD`, 안 보이면 `""` |

쉼표 포함 숫자(`1,234.56`)는 숫자로 변환. 확실하지 않은 값은 0 또는 `""`로 두고
**반드시 사용자에게 인식 결과를 보여주고 확인받은 뒤** 다음 단계로 진행한다 — 앱의
확인 모달과 동일한 안전장치.

### 3. 종목 매칭 및 반영 계산 (`src/vision.js`의 `enrich()` + `applyParsed()`와 동일)

```
curr = currency === 'KRW' ? 'KRW' : 'USD'
acct = curr === 'USD' ? '메리츠증권' : 'ISA'
```

종목 매칭 순서: ① `ticker` 대소문자 무시 일치 → ② `name` 공백 제거·소문자 완전
일치 → ③ `name` 부분 포함 일치.

**매수 (`buy`)** — 미매칭 시 신규 종목 생성:
```
tot = 기존qty*기존avg + qty*price
새qty = 기존qty + qty
새avg = 새qty>0 ? tot/새qty : 0
cashChange = -(qty*price + fee+tax)
```

**매도 (`sell`)** — 미매칭이거나 `qty > 보유qty`면 **건너뛰고 사용자에게 경고**:
```
pnl = (price - avg)*qty - (fee+tax)
새qty = 기존qty - qty
cashChange = qty*price - (fee+tax)
```

**입금/배당 (`deposit`/`dividend`)**: `cash[acct][curr] += amount`
**출금 (`withdraw`)**: `cash[acct][curr] -= amount`

거래(`buy`/`sell`)는 `txns`에, 현금 이동은 `cashTxns`에 각각 새 레코드를 앞에
추가(`unshift`)한다. 필드 이름은 `src/vision.js`의 `applyParsed()`를 그대로 따른다
(`id`, `stockId`/`acct`, `curr`, `mode`, `qty`, `price`, `pnl`, `cashChange`, `fee`,
`prevQty`, `prevAvg`, `date`, `time`) — 그래야 앱의 거래 취소(undo) 기능이 정상
작동한다.

### 4. 클라우드에 반영

```
POST {GAS_URL}
Content-Type: text/plain;charset=utf-8

{
  "_action": "export",
  "stocks": [...],       ← 3단계에서 갱신된 전체 배열
  "cash": {...},
  "cashTxns": [...],
  "txns": [...],
  "snapshots": [...조회 시 받은 그대로...],
  "intradaySnaps": [...조회 시 받은 그대로...],
  "journal": [...조회 시 받은 그대로...],
  "tags": [...조회 시 받은 그대로...],
  "tagColors": {...조회 시 받은 그대로...},
  "rate": ...조회 시 받은 그대로...,
  "updatedAt": "<지금 시각 ISO 8601>"
}
```

`_action:"export"`를 포함하면 `Code.gs`의 `updateVisibleSheets()`가 실행되어
메리츠증권/ISA 시트(보이는 시트)의 수량·평단가·현금까지 함께 갱신된다 (목표 ④).
응답이 `{"success":true,...}`인지 확인한다.

### 5. 완료 보고

몇 건이 반영됐는지, 반영 후 각 계좌 현금 잔액을 사용자에게 요약해서 알려준다.

## 주의사항

- **동기화 경합**: 브라우저에서 방금 로컬로만 거래를 입력하고 아직 클라우드에
  올라가지 않은 상태에서 이 절차로 클라우드를 덮어쓰면, 다음에 앱을 열 때
  `loadFromCloud()`의 `updatedAt` 비교 로직 때문에 오히려 이 절차의 반영분이
  무시될 수 있다(로컬이 더 최신으로 판단됨). 개인 단독 운용 앱이라 위험은
  낮지만, 반영 직전 "방금 앱에서 직접 입력한 거래가 있나요?"라고 한 번
  확인하는 것을 권장.
- GAS URL, Anthropic API 키 등 민감값은 어떤 경우에도 저장소에 커밋하지 않는다.
- 이 문서의 계산 로직이 `src/vision.js`와 어긋나면 반드시 이 문서를 최신
  소스코드 기준으로 다시 맞출 것 — 로직 중복이므로 `src/vision.js` 수정 시
  이 문서도 함께 갱신.
