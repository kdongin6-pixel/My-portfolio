// Prices and portfolio values must be actual positive, finite numbers.
const validValue = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const validDate = date => typeof date === 'string' && date.length > 0;

export function periodReturn(startClose, endClose) {
  if (!validValue(startClose) || !validValue(endClose)) return null;
  const result = (endClose / startClose - 1) * 100;
  return Number.isFinite(result) ? result : null;
}

export function buildBase100Series(points, startDate) {
  const sorted = (Array.isArray(points) ? points : [])
    .filter(point => point && validDate(point.date) && validValue(point.close) &&
      (startDate == null || point.date >= startDate))
    .slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const base = sorted[0].close;
  return sorted.map(point => ({date: point.date, value: point.close / base * 100}))
    .filter(point => Number.isFinite(point.value));
}

// Align on portfolio dates; do not invent a benchmark value before its first quote.
// Both returned arrays contain {date, close} and have identical dates.
export function alignSeries(portfolioPoints, benchmarkPoints) {
  const sorted = points => (Array.isArray(points) ? points : [])
    .filter(point => point && validDate(point.date) && validValue(point.close))
    .slice().sort((a, b) => a.date.localeCompare(b.date));
  const portfolio = [], benchmark = [], quotes = sorted(benchmarkPoints);
  let index = 0, lastClose = null;
  for (const point of sorted(portfolioPoints)) {
    while (index < quotes.length && quotes[index].date <= point.date) {
      lastClose = quotes[index++].close;
    }
    if (lastClose === null) continue;
    portfolio.push({date: point.date, close: point.close});
    benchmark.push({date: point.date, close: lastClose});
  }
  return {portfolio, benchmark};
}

export function alpha(myReturn, benchReturn) {
  if (typeof myReturn !== 'number' || !Number.isFinite(myReturn) ||
      typeof benchReturn !== 'number' || !Number.isFinite(benchReturn)) return null;
  const result = myReturn - benchReturn;
  return Number.isFinite(result) ? result : null;
}

// Compound over a 365-day year; periods shorter than 30 days are not annualized.
export function annualizedFromShort(returnPct, days) {
  if (typeof returnPct !== 'number' || !Number.isFinite(returnPct) || returnPct < -100 ||
      typeof days !== 'number' || !Number.isFinite(days) || days < 30) return null;
  const result = (Math.pow(1 + returnPct / 100, 365 / days) - 1) * 100;
  return Number.isFinite(result) ? result : null;
}

// Daily snapshots store the entire portfolio value in totalKRW, not pct.
export function deriveSnapshotSeries(snapshots) {
  return (Array.isArray(snapshots) ? snapshots : [])
    .filter(snapshot => snapshot && validDate(snapshot.date) && validValue(snapshot.totalKRW))
    .map(snapshot => ({date: snapshot.date, value: snapshot.totalKRW}))
    .sort((a, b) => a.date.localeCompare(b.date));
}
