# WO-2 Frontend Diff vs Public Live Site

Baseline for candidate: local baseline commit d50264e (branch feat/meritz-primary-view-20261109). Public live site was fetched read-only from https://kdongin6-pixel.github.io/My-portfolio/; its root and `src/cloud.js` returned HTTP 200. Local deploy URL is documented in AGENTS.md. Live files were not copied or modified.

| File | Classification | Purpose / comparison |
|---|---|---|
| src/cloud-merge.js | saving fix | Pure journal-by-id merge (latest timestamp wins), deleted-ID tombstone union, local/remote tag union and tag-color merge; applied by cloud-state merge. |
| src/cloud.js | saving fix | Keeps authenticated browser_save flow and response validation; omits undefined KIS settlement from save payload but preserves it when present; persists tombstones; merges memo/tags after load; Korean explicit error mapping for required backend codes, unknown errors, network and non-JSON responses; never marks a rejected response saved. |
| src/state.js | saving fix | Loads and persists journal deletion tombstones with local state. |
| tests/cloud_merge.test.mjs | saving fix | Covers local/server memo union, timestamp conflict, tags/color precedence, empty remote journal, idempotence, and tombstone retention. |
| tests/kis-cloud-save.test.mjs | saving fix | Covers each documented error code, unknown code, network/non-JSON and saved-state behavior. |
| tests/journal-delete-sync.test.cjs | saving fix | Verifies journal deletion records a tombstone before the local save. |
| src/trades.js | saving fix | Records deleted journal IDs as tombstones so they are not resurrected by another device's older snapshot. |

No changed file classified as “other”. Scope is limited to candidate diff; baseline-vs-live differences are broader than this work order and were not fully inventoried file-by-file.
