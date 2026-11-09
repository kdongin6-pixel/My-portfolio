import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../tools/compare-totals.mjs';

const base = () => ({
  rate: 1500,
  stocks: [
    {acct: '메리츠증권', curr: 'USD', qty: 2, cur: 10},
    {acct: 'ISA', curr: 'KRW', qty: 3, cur: 100}
  ],
  cash: {메리츠증권: {USD: 4, KRW: 100}, ISA: {USD: 0, KRW: 500}},
  kisIsaSettlement: null
});

test('no ISA settlement: live and candidate totals match, including USD cash', async () => {
  const rows = await compare(base());
  assert.deepEqual(rows.map(row => row.differenceKRW), [0, 0, 0]);
  assert.ok(rows.every(row => row.equal));
  // Meritz: USD stock (30,000) + USD cash converted at the fixture rate (6,000) + KRW cash (100).
  assert.equal(rows[0].liveTotalKRW, 36100);
  assert.equal(rows[0].candidateTotalKRW, 36100);
});

test('ISA settlement replaces cash; D+2 estimate is candidate-only, not added to totals', async () => {
  const state = base();
  state.kisIsaSettlement = {currency: 'KRW', amount: 800, queriedAt: '2026-11-09T12:00:00Z'};
  const rows = await compare(state);
  // Live totals include deposited ISA cash (500); candidate uses settlement (800).
  assert.deepEqual(rows.map(row => row.differenceKRW), [0, 300, 300]);
  assert.ok(rows.every((row, index) => row.equal === (index === 0)));
  assert.equal(rows[1].candidateTotalKRW - rows[1].liveTotalKRW, 300);
});
