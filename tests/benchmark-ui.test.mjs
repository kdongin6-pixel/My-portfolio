import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderBenchmarkView,renderBenchmarkChart,BENCHMARK_COLORS} from '../src/benchmark-ui.js';
import {annualizedFromShort} from '../src/benchmark-calc.js';
import {applyQuoteResponse} from '../src/portfolio-read.js';

const state={snapshots:[{date:'2026-01-01',totalKRW:100},{date:'2026-02-10',totalKRW:120}]};
const quotes=[{date:'2026-01-01',close:100},{date:'2026-02-10',close:110}];
const history={asOf:'2026-02-10',ret1y:12,ret3y:-3,cagr:4,years:3,basis:'price'};
const payload={benchmark:{SPY:quotes,QQQ:quotes,GLD:quotes},longHistory:{SPY:history,QQQ:history,GLD:history},longHistoryStatus:{SPY:'ok',QQQ:'ok',GLD:'ok'}};

test('full payload renders aligned returns, long history and cumulative chart',()=>{
 const before=structuredClone({state,payload}),html=renderBenchmarkView(state,payload);
 for(const s of ['SPY','QQQ','GLD','추적 시작','가격 수익률','2026-02-10','+10.00%','+20.00%','+12.00%','-3.00%','+4.00%','<svg'])assert.ok(html.includes(s),s);
 assert.deepEqual({state,payload},before);
 assert.equal((html.match(/<polyline/g)||[]).length,4);
});
test('absent benchmark and malformed inputs produce a safe empty state',()=>{
 assert.match(renderBenchmarkView(state,{...payload,benchmark:null}),/벤치마크 가격 기록이 없습니다/);
 for(const value of [undefined,null,0,'bad',[],true])assert.doesNotThrow(()=>renderBenchmarkView(value,value));
});
test('absent long history and null ticker entries have plain empty states',()=>{
 assert.match(renderBenchmarkView(state,{...payload,longHistory:null}),/장기 가격 기록을 사용할 수 없습니다/);
 const html=renderBenchmarkView(state,{...payload,longHistory:{...payload.longHistory,SPY:null}});
 assert.match(html,/장기 가격 기록을 사용할 수 없습니다/);
 assert.equal((html.match(/\+12\.00%/g)||[]).length,2);
});
for(const status of ['key_missing','pending','fetch_invalid','other'])test(`non-ok ${status} suppresses long history`,()=>{
 const html=renderBenchmarkView(state,{...payload,longHistoryStatus:{SPY:status,QQQ:status,GLD:status}});
 assert.match(html,/장기 가격 기록을 사용할 수 없습니다/);
 assert.doesNotMatch(html,/\+12\.00%/);
});
test('short histories do not calculate an annualized return',()=>{
 const short={snapshots:[{date:'2026-01-01',totalKRW:100},{date:'2026-01-10',totalKRW:120}]};
 const html=renderBenchmarkView(short,{benchmark:{SPY:[quotes[0],{date:'2026-01-10',close:110}]},longHistory:null});
 assert.match(html,/\+20\.00%/);
 const cagrCells=html.match(/<td data-label="CAGR">.*?<\/td>/g);
 assert.deepEqual(cagrCells,Array(3).fill('<td data-label="CAGR"><span>—</span></td>'));
 assert.match(html,/장기 가격 기록을 사용할 수 없습니다/);
 assert.equal(annualizedFromShort(10,9),null);
 assert.equal(annualizedFromShort(10,29),null);
 const withHistory=renderBenchmarkView(short,{...payload,benchmark:{SPY:[quotes[0],{date:'2026-01-10',close:110}]}});
 assert.match(withHistory,/<td data-label="CAGR"><span class="bm-gain">\+4\.00%<\/span><\/td>/);
 assert.equal((withHistory.match(/<td data-label="CAGR"><span class="bm-gain">\+4\.00%<\/span><\/td>/g)||[]).length,3);
});
test('30-day annualization is available in the calculator but not substituted for long history',()=>{
 const value=annualizedFromShort(10,30);
 assert.ok(Math.abs(value-((1.1**(365/30)-1)*100))<1e-10);
 const longer={snapshots:[{date:'2026-01-01',totalKRW:100},{date:'2026-01-31',totalKRW:120}]};
 const html=renderBenchmarkView(longer,{benchmark:{SPY:[quotes[0],{date:'2026-01-31',close:110}]},longHistory:null});
 assert.deepEqual(html.match(/<td data-label="CAGR">.*?<\/td>/g),Array(3).fill('<td data-label="CAGR"><span>—</span></td>'));
 assert.match(html,/장기 가격 기록을 사용할 수 없습니다/);
});
test('chart colors are neutral or gold, and copy has no total return or emoji',()=>{
 const html=renderBenchmarkView(state,payload);
 assert.deepEqual(BENCHMARK_COLORS,{portfolio:'#8a6a2f',SPY:'#77736d',QQQ:'#a39e95',GLD:'#c2bcb2'});
 for(const color of Object.values(BENCHMARK_COLORS))assert.ok(renderBenchmarkChart(state,payload).includes(`stroke="${color}"`));
 assert.doesNotMatch(html,/total\s+return|총수익률/iu);
 assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);
 assert.doesNotMatch(html,/<polyline[^>]+stroke="(?:#c23b32|#2f63b5)"/);
 const delayed=renderBenchmarkChart({snapshots:[...state.snapshots,{date:'2026-03-01',totalKRW:130}]},{benchmark:{SPY:quotes,QQQ:[{date:'2026-02-10',close:100},{date:'2026-03-01',close:110}]}});
 assert.match(delayed,/QQQ: 추적 시작일에 비교 가격이 없어 차트에서 제외/);
});
test('partial read responses retain benchmark fields and present fields replace them',()=>{
 const target={stocks:[]};applyQuoteResponse(target,payload);
 for(const key of ['benchmark','longHistory','longHistoryStatus'])assert.equal(target[key],payload[key]);
 applyQuoteResponse(target,{});
 for(const key of ['benchmark','longHistory','longHistoryStatus'])assert.equal(target[key],payload[key]);
 const replacement={benchmark:{SPY:[]},longHistory:{SPY:{cagr:7}},longHistoryStatus:{SPY:'pending'}};
 applyQuoteResponse(target,replacement);
 for(const key of ['benchmark','longHistory','longHistoryStatus'])assert.equal(target[key],replacement[key]);
 applyQuoteResponse(target,{benchmark:null});
 assert.equal(target.benchmark,null);
 assert.equal(target.longHistory,replacement.longHistory);
 assert.equal(target.longHistoryStatus,replacement.longHistoryStatus);
 applyQuoteResponse(target,{longHistory:undefined});
 assert.equal(target.longHistory,null);
 assert.equal(target.longHistoryStatus,replacement.longHistoryStatus);
});
test('navigation uses the existing drawer binding and render flow',async()=>{
 const render=await readFile(new URL('../src/render.js',import.meta.url),'utf8');
 const bind=await readFile(new URL('../src/bind.js',import.meta.url),'utf8');
 assert.match(render,/data-tab="benchmark"/);assert.match(render,/renderBenchmarkView\(S,S\)/);
 assert.match(bind,/\.tab\[data-tab\]/);assert.match(bind,/S\.tab=el\.dataset\.tab/);
});

test('server payload with long history nested in benchmark is converted to percent and rendered',()=>{
 const entry={asOf:'2026-11-16',ret1y:0.1012,ret3y:0.6435,cagr:0.1759,years:3.58,basis:'price'};
 const data={benchmark:{SPY:[],QQQ:[],GLD:[],longHistory:{SPY:entry,QQQ:entry,GLD:{...entry,ret1y:-0.0613}},longHistoryStatus:{SPY:'ok',QQQ:'ok',GLD:'ok'}}};
 const target={};
 applyQuoteResponse({stocks:[],...target,quoteQuality:null},data,null);
 const st={stocks:[]};applyQuoteResponse(st,data,null);
 assert.ok(Math.abs(st.longHistory.SPY.ret1y-10.12)<1e-9);
 assert.equal(st.longHistory.SPY.cagr,17.59);
 const html=renderBenchmarkView(state,st);
 for(const s of ['+10.12%','+64.35%','+17.59%','-6.13%'])assert.ok(html.includes(s),s);
 const kept={stocks:[]};applyQuoteResponse(kept,{...data,longHistory:{SPY:history}},null);
 assert.equal(kept.longHistory.SPY.ret1y,12);
});
