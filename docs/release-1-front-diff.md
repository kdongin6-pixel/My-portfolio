# Release 1 front diff (saved live snapshot vs candidate)

Evidence: E:/hermes/collab/shared/live-snapshot-20261109/ and Claude's read-only comparison dated 2026-11-09. No live-site re-fetch. Comparison baseline d50264e; candidate includes 84f300f and 6201766. CR bytes ignored. Rows summarize normalized `git diff --no-index` hunks (candidate minus saved live bytes). For live-404 paths, saved 404 HTML is compared to candidate bytes.

| File | Live status | Actual diff summary | Classification | Removal impact |
|---|---|---|---|---|
| src/bind.js | changed | Imports auth; adds Google sign-in/logout handlers and login-aware settings save | saving fix | Breaks auth UI and browser_save login path |
| src/helpers.js | changed | Replaces inline cash sum with valuationCashKRW(S, account) | release-1 needed (other) | Breaks settlement-aware valuation and its module dependency |
| src/portfolio-export.js | changed | Separates broker settlement and estimated D+2 cash; prevents double count | release-1 needed (other) | Breaks settlement-safe export/tests |
| src/state.js | changed | Persists journal tombstones/KIS settlement and uses shared cash valuation | release-1 needed (other) | Breaks tombstone persistence, valuation and tests |
| src/trades.js | changed | Guards broker-owned ISA manual changes/undo; records journal tombstones | NOT for release 1 (KIS/unrelated) | Removing KIS guard changes ISA behavior; removing tombstone logic resurrects deletions; deleting module breaks imports |
| src/views.js | changed | Adds Google login settings and settlement display labels | saving fix | Breaks login settings UI and settlement display |
| src/cloud-merge.js | changed | Adds journal/tag merge, stale server revision handling and conflict backup signaling | saving fix | Breaks safe merge and tests |
| src/cloud.js | changed | Authenticated browser_save and response validation replace flat no-cors save; merges/persists tombstones | saving fix | Reverts to unverified saves; breaks auth/sync tests |
| index.html | changed | Adds Google Identity Services script | saving fix | Google sign-in cannot initialize |
| src/auth.js | live 404/new in candidate | Adds token/client-ID storage and Google sign-in button API | saving fix | Required imports fail; app module graph will not load |
| src/settlement-value.js | live 404/new in candidate | Adds validated settlement-aware cash valuation | release-1 needed (other) | Required imports fail; valuation/tests break |
| sw.js | identical in original comparison; changed in WO-2c | Original live cache was pf-cache-v5-20261109-account-labels; now a new unique name | saving fix | Old cache namespace would not be invalidated by new worker |

## Files identical in saved live comparison

manifest.webmanifest; icons/apple-touch-icon.png; icons/icon-192.png; src/broker-account-ui.js; src/broker-account.js; src/charts.js; src/constants.js; src/holdings-ui.js; src/intelligence.js; src/main.js; src/market-ui.js; src/portfolio-read.js; src/render.js; src/styles.css; src/vision.js.

## Recommended ship set and KIS entanglement

Minimal saving/login ship set: index.html, sw.js, src/auth.js, src/bind.js, src/cloud.js, src/cloud-merge.js, src/constants.js, src/views.js. The app statically imports settlement-value.js through state.js/helpers.js, so include state.js, helpers.js and settlement-value.js unless safely refactored. Keep trades.js for journal tombstone syncing. Keep portfolio-export.js if analysis export is in scope. auth.js and settlement-value.js cannot be omitted while imported.

KIS grep locations (line numbers at this worktree):
- src/cloud.js:25,70,105,134; src/cloud-merge.js:88,94,128; src/portfolio-export.js:12; src/settlement-value.js:6; src/state.js:60,130; src/views.js:95,97,218,220; src/trades.js:9. These form the ISA settlement state/valuation/export/display contract; deleting whole files breaks imports or cash totals.
- `src/trades.js:9` is the actual `kis` grep hit. Smallest candidate cut is blockBrokerIsa plus its call sites (inspect call sites in execTrade/execCash/undo functions); remove the broker-imported undo guard only if confirmed unnecessary. Retain delJournal tombstone code. Do not implement this cut in WO-2c.

The KIS guard is release-1-extraneous; remove only that behavior in a separately reviewed change, not the trades/journal module. SW uses runtime request caching, not a fixed asset list; removed modules can remain cached until network failure or worker activation cleanup.

## SW cache and visible version

New CACHE: pf-cache-v6-20261110-release1-saving; it differs from live pf-cache-v5-20261109-account-labels (tested). Fetch is network-first: online requests return network responses and refresh cache; cache is fallback only on network exception. On activation, old named caches are deleted and clients.claim() runs. An already-open old-worker page is not forcibly reloaded; offline use before the new worker activates is not guaranteed fresh. APP_VERSION is v0.11.0-release1-saving in src/constants.js and shown in the src/views.js header.

## Journal merge and tombstone rules

For same-ID entries, newer valid timestamp wins. Equal/missing timestamps deterministically prefer local; differing loser is preserved in conflictVersions, deduplicated, so content is not silently discarded. Merge is idempotent. Tombstones lack timestamps, so unique IDs retain append order and only the last 500 remain. Dropped older IDs may allow a very stale device to resurrect a deleted entry. This bounded-retention tradeoff and merge idempotence are tested.
