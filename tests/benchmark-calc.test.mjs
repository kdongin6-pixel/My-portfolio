import test from 'node:test';
import assert from 'node:assert/strict';
import {periodReturn, buildBase100Series, alignSeries, alpha, annualizedFromShort, deriveSnapshotSeries} from '../src/benchmark-calc.js';

test('period return uses percentage and rejects invalid closes', () => {
  assert.ok(Math.abs(periodReturn(100, 120) - 20) < 1e-10);
  for (const value of [0, -1, NaN, Infinity, null, undefined, '100']) {
    assert.equal(periodReturn(value, 100), null);
    assert.equal(periodReturn(100, value), null);
  }
  assert.equal(periodReturn(Number.MIN_VALUE, Number.MAX_VALUE), null);
});

test('base 100 sorts valid closes, respects the start date and leaves input untouched', () => {
  const points = [{date: '2026-01-03', close: 150}, {date: '2026-01-01', close: 50},
    {date: '2026-01-02', close: 100}, {date: '2026-01-04', close: 0},
    {date: '2026-01-05', close: -1}, {date: '2026-01-06', close: NaN},
    {date: '2026-01-07', close: '200'}, {date: '2026-01-08', close: Infinity}];
  const before = structuredClone(points);
  assert.deepEqual(buildBase100Series(points, '2026-01-02'), [
    {date: '2026-01-02', value: 100}, {date: '2026-01-03', value: 150}]);
  assert.deepEqual(points, before);
});

test('base 100 handles empty and single point series', () => {
  assert.deepEqual(buildBase100Series([], '2026-01-01'), []);
  assert.deepEqual(buildBase100Series([{date: '2026-01-01', close: 2}]), [{date: '2026-01-01', value: 100}]);
  assert.deepEqual(buildBase100Series([{date: '2026-01-01', close: 0}]), []);
});

test('alignment carries benchmark closes on portfolio dates but never before the first quote', () => {
  const portfolio = [1, 2, 3, 4, 5].map(day => ({date: `2026-01-0${day}`, close: day * 100}));
  const benchmark = [{date: '2026-01-04', close: 20}, {date: '2026-01-02', close: 10},
    {date: '2026-01-03', close: 0}];
  assert.deepEqual(alignSeries(portfolio, benchmark), {
    portfolio: portfolio.slice(1), benchmark: [
      {date: '2026-01-02', close: 10}, {date: '2026-01-03', close: 10},
      {date: '2026-01-04', close: 20}, {date: '2026-01-05', close: 20}]
  });
});

test('alignment handles empty, single and invalid observations', () => {
  const one = [{date: '2026-01-01', close: 10}];
  assert.deepEqual(alignSeries([], one), {portfolio: [], benchmark: []});
  assert.deepEqual(alignSeries(one, []), {portfolio: [], benchmark: []});
  assert.deepEqual(alignSeries(one, one), {portfolio: one, benchmark: one});
  assert.deepEqual(alignSeries(one, [{date: '2026-01-01', close: NaN}]), {portfolio: [], benchmark: []});
});

test('alpha is a percentage-point difference and propagates missing or invalid inputs', () => {
  assert.equal(alpha(12, 7), 5);
  assert.equal(alpha(null, 7), null);
  assert.equal(alpha(12, null), null);
  assert.equal(alpha(NaN, 1), null);
});

test('annualization compounds only periods of at least 30 days', () => {
  assert.equal(annualizedFromShort(10, 29), null);
  assert.ok(Math.abs(annualizedFromShort(10, 30) - ((1.1 ** (365 / 30) - 1) * 100)) < 1e-10);
  assert.equal(annualizedFromShort(-100, 365), -100);
  assert.equal(annualizedFromShort(-101, 365), null);
  assert.equal(annualizedFromShort(10, NaN), null);
});

test('snapshot series uses daily totalKRW, not pct or intraday dt', () => {
  const snapshots = [{date: '2026-01-02', totalKRW: 200, pct: 90},
    {date: '2026-01-01', totalKRW: 100, pct: 5}, {date: '2026-01-03', totalKRW: 0},
    {date: '2026-01-04', totalKRW: NaN}, {dt: '2026-01-05', totalKRW: 300}, null];
  assert.deepEqual(deriveSnapshotSeries(snapshots), [
    {date: '2026-01-01', value: 100}, {date: '2026-01-02', value: 200}]);
  assert.deepEqual(deriveSnapshotSeries([]), []);
});
