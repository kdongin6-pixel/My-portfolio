# Meritz account snapshots — approved read-only connection

## Scope and authorization

User separately approved holdings, deposits and executed-quantity order history. Market-only quote/history adapters remain unchanged. Existing API key is bound to a single account: no `acno`, subaccount number or password is supplied. Do not imply that ISA or all brokerage accounts are connected. The underlying credential's broker-side order permission is not revoked by this application allowlist.

The dedicated request is a text/plain JSON POST to the existing configured GAS endpoint:

```js
{_action:'broker_read', secret: existingPortfolioReadSecret}
```

No other fields are accepted. An absent/wrong read secret is rejected before token issuance, broker calls or spreadsheet access. Agent write tokens do not authorize reads. No account information is added to ordinary portfolio reads or GET routes. Invalid `broker_*` actions return an error before generic save dispatch, never falling through to a ledger write.

## Server implementation and deployment

`gas/MeritzAccountRead.js` is server-only GAS SERVER_JS, uploaded as `MeritzAccountRead`. Browser modules must never import it. Retain existing `MeritzMarketData` token helper; it issues OAuth tokens against the existing ScriptProperties credentials. No new credential fields, credential rotations, account numbers or privileges are required.

Production `Code` receives only this insertion after `JSON.parse(e.postData.contents)`, before spreadsheet access and existing shared-secret routing:

```js
if (data._action === 'broker_read') return meritzAccountReadResponse_(data);
if (typeof data._action === 'string' && data._action.indexOf('broker_') === 0) {
  return ContentService.createTextOutput(JSON.stringify({success:false,error:'invalid_broker_action'})).setMimeType(ContentService.MimeType.JSON);
}
```

Do not replace production Code with the unrelated repository Code.gs. Back up production deployment, immutable content and unpublished HEAD; deploy a minimal additive immutable version, restore unpublished HEAD, then read back both version and deployment. The local deployment evidence and rollback baseline are outside the public repository, under `E:/hermes/meritz-account-read-evidence`.

## Fixed transport allowlist

Only OAuth token POST and these GET routes are allowed:

- `/accounts/v1/me/holdings`
- `/accounts/v1/me/overseas/holdings`
- `/accounts/v1/me/deposit`
- `/accounts/v1/me/overseas/currencies`
- `/trading/v1/orders/history`
- `/trading/v1/overseas/orders/history`

No order placement, amendment, cancellation, FX, transfer, collateral change or generic URL is accepted. Redirects are disabled on broker requests. Error bodies are never returned or logged. Account/order identifiers, tokens, keys and MAC are excluded from normalized responses.

## Definitions and completeness

- Explicitly initiated REST snapshots, not tick streaming. `queriedAt` is actual query time; `observedAt` stays null. Provider timestamps without a documented timezone remain literal provider strings.
- The general holdings endpoint also returns overseas equities. Exclude those from domestic rows and use the dedicated overseas source; never sum two representations of one position.
- Foreign symbols retain exact `providerSymbol`; only verified NY/OQ/AX suffixes are removed for display tickers. Unknown identities are unverified, not guessed.
- Current cash, D+1/D+2 estimated cash, withdrawable cash, orderable cash and estimated foreign cash are separate definitions, not additive buckets. Missing values stay null, not zero.
- Query the latest seven calendar dates in KST inclusively. Domestic history is queried separately for each date; overseas history uses the same range. `cntg_cls_code:'1'` selects orders with actual executed quantity; additionally require positive executed quantity and a valid side/date/executed price. These records are cumulative executed quantities per order, not necessarily individual execution prints, and are never imported into the ledger automatically.
- Recognize documented successful/empty result codes `0000`, `0001`, `5620`, `5762`, `5766`, `5820`, `5822`. Determine actual emptiness from data, not code alone. HTTP 200 with another response code is an error.
- Only holdings/history support pagination. Preserve continuation keys including trailing spaces. Maximum ten pages per request section, reject missing/repeated cursors or repeated pages, and mark truncation as partial. Cash endpoints never fabricate continuation requests.
- Each of five sections has explicit status, paginationComplete and sanitized errorCode. Errors are not empty/zero balances; partial results are not full coverage.
- Broker payload is ephemeral UI state only: excluded from localStorage, cloud saves, analysis exports, ledger mutations and automatic timers. No new recurring jobs are created.

## Validation

Run `node --test tests/meritz_account_read.test.mjs`, frontend broker tests, then the full suite. Test denied routes locally without sending actual order requests. The real production dispatcher is additionally exercised in a Node VM against both backed-up production (expected RED) and candidate (GREEN). After deployment, verify authenticated account read, missing/wrong credentials, invalid broker action and unknown payload-field rejection. Compare exact canonical appData hash and savedAt before/after; retain only safe counts/statuses and digests, never raw brokerage responses.

Primary references: current official `meritz-securities/open-api-studio` API catalog, core client/pagination implementation, and trading field glossary. Their response codes differ from the quote-only `0000` path; do not reuse the quote normalizer for account data.
