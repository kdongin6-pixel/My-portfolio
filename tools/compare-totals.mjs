#!/usr/bin/env node
import {mkdtemp, cp, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(scriptDir, '..');
const liveSource = 'E:/hermes/collab/shared/live-snapshot-20261109/src';
const tempParent = 'E:/hermes/collab/shared/live-snapshot-20261109';
const accountNames = ['메리츠증권', 'ISA'];
const STEP_TIMEOUT_MS = 10000;

async function bounded(promise, label, ms = STEP_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms); })
    ]);
  } finally { clearTimeout(timer); }
}

async function loadLogic(srcDir, isLive) {
  // Isolate each copied helper's writable S while preserving the actual helpers.
  await bounded(writeFile(path.join(srcDir, 'state.js'), 'export const S = {};'), 'state_stub');
  const helpers = await bounded(import(pathToFileURL(path.join(srcDir, 'helpers.js')).href), 'helpers_import');
  const stateModule = await bounded(import(pathToFileURL(path.join(srcDir, 'state.js')).href), 'state_import');
  let cashFn;
  if (isLive) {
    cashFn = (state, account) => {
      stateModule.S.cash = state.cash;
      stateModule.S.rate = state.rate;
      stateModule.S.acct = account;
      return account === '전체' ? helpers.cashTotKRW() : helpers.filtCashKRW();
    };
  } else {
    const settlement = await bounded(import(pathToFileURL(path.join(srcDir, 'settlement-value.js')).href), 'settlement_import');
    cashFn = (state, account) => settlement.valuationCashKRW(state, account);
  }
  return {S: stateModule.S, stockFn: helpers.totK, cashFn};
}

function validateState(input) {
  const state = input?.appData && typeof input.appData === 'object' ? input.appData : input;
  if (!state || !Array.isArray(state.stocks) || !state.cash || !Number.isFinite(state.rate) || state.rate <= 0) {
    throw new Error('invalid_state_shape');
  }
  return state;
}

export async function compare(inputState, {repoRoot = repo, liveRoot = liveSource} = {}) {
  const state = validateState(inputState);
  const temp = await bounded(mkdtemp(path.join(tempParent, 'wo2g-live-')), 'temp_create');
  try {
    const liveSrc = path.join(temp, 'live-src');
    const candidateSrc = path.join(temp, 'candidate-src');
    await bounded(cp(liveRoot, liveSrc, {recursive: true}), 'live_copy');
    await bounded(cp(path.join(repoRoot, 'src'), candidateSrc, {recursive: true}), 'candidate_copy');
    const live = await loadLogic(liveSrc, true);
    const candidate = await loadLogic(candidateSrc, false);
    const rows = [];
    for (const account of [...accountNames, '전체']) {
      const stocks = account === '전체' ? state.stocks : state.stocks.filter(stock => stock.acct === account);
      live.S.rate = state.rate;
      candidate.S.rate = state.rate;
      const liveTotal = Math.round(live.stockFn(stocks) + live.cashFn(state, account));
      const candidateTotal = Math.round(candidate.stockFn(stocks) + candidate.cashFn(state, account));
      rows.push({account, equal: liveTotal === candidateTotal, differenceKRW: Math.abs(liveTotal - candidateTotal), liveTotalKRW: liveTotal, candidateTotalKRW: candidateTotal});
    }
    return rows;
  } finally {
    await bounded(rm(temp, {recursive: true, force: true}), 'temp_cleanup');
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: node tools/compare-totals.mjs <state.json>');
  const raw = await bounded(readFile(file, 'utf8'), 'state_read');
  const rows = await compare(JSON.parse(raw));
  for (const row of rows) {
    const label = row.account === '메리츠증권' ? 'Meritz' : row.account;
    console.log(`${label}: equal=${row.equal ? 'yes' : 'no'} differenceKRW=${row.differenceKRW}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().then(() => process.exit(0), error => { console.error(error.message); process.exit(1); });
}
