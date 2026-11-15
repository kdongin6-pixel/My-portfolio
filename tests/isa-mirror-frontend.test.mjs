import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tradesCode = fs.readFileSync(new URL('../src/trades.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/export /g, '');

function trades(S) {
  const calls = {alerts: [], saved: 0};
  const c = vm.createContext({S, save: () => { calls.saved++; }, render: () => {}, alert: m => calls.alerts.push(m), confirm: () => true, fM: v => String(v)});
  vm.runInContext(tradesCode, c);
  return {c, calls};
}
const state = extra => Object.assign({
  stocks: [{id: 1, name: 'A', ticker: '111111', acct: 'ISA', curr: 'KRW', qty: 10, avg: 100},
    {id: 2, name: 'B', ticker: 'AAPL', acct: '메리츠증권', curr: 'USD', qty: 5, avg: 10}],
  cash: {ISA: {USD: 0, KRW: 10000}, '메리츠증권': {USD: 100, KRW: 0}}, cashTxns: [], txns: []}, extra);

test('manual ISA trade is blocked while the server mirrors ISA, and nothing changes', () => {
  const S = state({kisMirror: {appliedAt: '2026-11-16T01:00:00.000Z', active: true}});
  const {c, calls} = trades(S);
  c.execTrade(1, 'buy', '1', '100', '0');
  assert.equal(calls.alerts.length, 1);
  assert.match(calls.alerts[0], /ISA/);
  assert.equal(calls.saved, 0);
  assert.equal(S.stocks[0].qty, 10);
  assert.equal(S.cash.ISA.KRW, 10000);
  assert.equal(S.txns.length, 0);
});

test('manual ISA cash entry is blocked while the server mirrors ISA', () => {
  const S = state({kisMirror: {appliedAt: '2026-11-16T01:00:00.000Z', active: true}});
  const {c, calls} = trades(S);
  c.execCash('ISA', 'KRW', 'in', '500', 'x');
  assert.equal(calls.alerts.length, 1);
  assert.equal(calls.saved, 0);
  assert.equal(S.cash.ISA.KRW, 10000);
  assert.equal(S.cashTxns.length, 0);
});

test('Meritz trades and cash stay manual even while the ISA mirror is on', () => {
  const S = state({kisMirror: {appliedAt: '2026-11-16T01:00:00.000Z', active: true}});
  const {c, calls} = trades(S);
  c.execTrade(2, 'buy', '1', '10', '0');
  c.execCash('메리츠증권', 'USD', 'in', '5', 'x');
  assert.equal(calls.alerts.length, 0);
  assert.equal(S.stocks[1].qty, 6);
  assert.equal(S.txns.length, 1);
  assert.equal(S.cashTxns.length, 1);
});

test('without the mirror, manual ISA trade and cash entry still work', () => {
  const S = state({kisMirror: null});
  const {c, calls} = trades(S);
  c.execTrade(1, 'buy', '1', '100', '0');
  c.execCash('ISA', 'KRW', 'in', '500', 'x');
  assert.equal(calls.alerts.length, 0);
  assert.equal(S.stocks[0].qty, 11);
  assert.equal(S.cash.ISA.KRW, 10000 - 100 + 500);
});

test('mirror status is not sent back to the server and is read from the cloud load', () => {
  const cloud = fs.readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
  const payload = cloud.slice(cloud.indexOf('const payload={'), cloud.indexOf('const idToken=getIdToken()'));
  assert.ok(payload.length > 50);
  assert.ok(!payload.includes('kisMirror'));
  assert.match(cloud, /S\.kisMirror=everApplied/);
  const local = cloud.slice(cloud.indexOf('localStorage.setItem("pf_v3"'));
  assert.ok(!local.slice(0, local.indexOf('\n')).includes('kisMirror'));
});

const holdingsCode = fs.readFileSync(new URL('../src/holdings-ui.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/export /g, '');
const sale = vm.runInContext(holdingsCode + ';saleResultText', vm.createContext({quoteInfo() {}, valuation() {}, portfolioStatus() {}, positive() {}, displayKst() {}}));

test('a sale with unknown cost says so instead of showing a made-up result', () => {
  const text = sale({mode: 'sell', qty: 2, prevAvg: 0, pnl: 0, costBasisUnknown: true});
  assert.match(text, /원가 미확인/);
  assert.ok(!text.includes('+0.00'));
});

test('a sale with known cost keeps the realised result and percentage', () => {
  const gain = sale({mode: 'sell', qty: 2, prevAvg: 1000, pnl: 400});
  assert.match(gain, /class="pos"/);
  assert.match(gain, /\+400\.00 \(\+20\.00%\)/);
  const loss = sale({mode: 'sell', qty: 2, prevAvg: 1000, pnl: -200});
  assert.match(loss, /class="neg"/);
  assert.match(loss, /-200\.00 \(-10\.00%\)/);
});

test('a sale record without pnl does not throw', () => {
  assert.doesNotThrow(() => sale({mode: 'sell', qty: 1, prevAvg: 0}));
});

test('a stopped or stale mirror does not block manual ISA entry', () => {
  for (const mirror of [{appliedAt: 'x', active: false, status: 'skipped', reason: 'unexplained_disappearance'}, null]) {
    const S = state({kisMirror: mirror});
    const {c, calls} = trades(S);
    c.execTrade(1, 'buy', '1', '100', '0');
    c.execCash('ISA', 'KRW', 'in', '500', 'x');
    assert.equal(calls.alerts.length, 0);
    assert.equal(S.stocks[0].qty, 11);
  }
});

test('undoing an ISA cash entry is blocked while the mirror is active, Meritz is not', () => {
  const S = state({kisMirror: {appliedAt: 'x', active: true},
    cashTxns: [{id: 7, acct: 'ISA', curr: 'KRW', mode: 'in', amount: 500}, {id: 8, acct: '메리츠증권', curr: 'USD', mode: 'in', amount: 5}]});
  const {c, calls} = trades(S);
  c.undoCashTxn(7);
  assert.equal(calls.alerts.length, 1);
  assert.equal(S.cashTxns.length, 2);
  assert.equal(S.cash.ISA.KRW, 10000);
  c.undoCashTxn(8);
  assert.equal(S.cashTxns.length, 1);
});

test('cloud load turns the server status into an active flag only for a fresh, healthy mirror', () => {
  const cloud = fs.readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
  const start = cloud.indexOf('const mir=a.snapshotAutomation');
  const block = cloud.slice(start - 10, cloud.indexOf('const merged=mergeCloudState'));
  const run = (a, now = Date.parse('2026-11-16T03:00:00Z')) => {
    const S = {};
    const D = class extends Date { static now() { return now; } };
    vm.runInContext('(function(a){' + block + '})', vm.createContext({S, Date: D, Number}))(a);
    return S.kisMirror;
  };
  const base = (isaMirror, at = '2026-11-16T02:30:00.000Z') => ({kisMirror: {appliedAt: '2026-11-16T01:55:00.000Z'}, snapshotAutomation: {lastCapturedAt: at, history: {isaMirror}}});
  assert.equal(run(base({status: 'unchanged'})).active, true);
  assert.equal(run(base({status: 'applied'})).active, true);
  assert.equal(run(base({status: 'history_rejected', ledgerStatus: 'applied'})).active, true);
  const stopped = run(base({status: 'skipped', reason: 'unexplained_disappearance'}));
  assert.deepEqual([stopped.active, stopped.reason], [false, 'unexplained_disappearance']);
  assert.equal(run(base({status: 'dry'})).active, false);
  assert.equal(run(base({status: 'unchanged'}, '2026-11-15T20:00:00.000Z')).active, false);
  assert.equal(run({snapshotAutomation: {lastCapturedAt: '2026-11-16T02:30:00.000Z', history: {isaMirror: {status: 'unchanged'}}}}), null);
});

test('the holdings notice shows why the ISA mirror stopped', async () => {
  const {dataNotice} = await import('../src/holdings-ui.js');
  const html = dataNotice({stocks: [], rate: 1500, readStatus: 'success', kisMirror: {active: false, reason: 'unexplained_disappearance'}}, true);
  assert.match(html, /ISA 자동 반영 중단 \(unexplained_disappearance\)/);
  const quiet = dataNotice({stocks: [], rate: 1500, readStatus: 'success', kisMirror: {active: true}}, true);
  assert.ok(!quiet.includes('ISA 자동 반영 중단'));
  const none = dataNotice({stocks: [], rate: 1500, readStatus: 'success', kisMirror: null}, true);
  assert.ok(!none.includes('ISA 자동 반영 중단'));
});

test('holding edit and screenshot import skip ISA while the mirror is active', () => {
  const bind = fs.readFileSync(new URL('../src/bind.js', import.meta.url), 'utf8');
  assert.match(bind, /data\.acct==="ISA"&&S\.kisMirror\?\.active\)return alert/);
  const vision = fs.readFileSync(new URL('../src/vision.js', import.meta.url), 'utf8');
  assert.match(vision, /t\.acct==="ISA"&&S\.kisMirror\?\.active\)return;/);
});
