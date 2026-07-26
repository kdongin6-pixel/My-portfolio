const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('Code.gs', 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(
  typeof context.upsertHourlySnapshot,
  'function',
  'upsertHourlySnapshot should be available for the hourly trigger'
);

const state = {
  intradaySnaps: [
    { dt: '2026-07-20T09:00:00.000Z', totalKRW: 100 },
    { dt: '2026-07-24T10:05:00.000Z', totalKRW: 200 }
  ]
};

context.upsertHourlySnapshot(
  state,
  { dt: '2026-07-24T10:55:00.000Z', totalKRW: 300, pct: 2.5 },
  '2026-07-24T10:55:00.000Z'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(state.intradaySnaps)),
  [{ dt: '2026-07-24T10:55:00.000Z', totalKRW: 300, pct: 2.5 }],
  'the latest point should replace a duplicate hour and points older than 48 hours should be removed'
);

console.log('hourly snapshot behavior: PASS');
