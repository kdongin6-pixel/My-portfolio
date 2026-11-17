import test from 'node:test';
import assert from 'node:assert/strict';
import {squarify} from '../src/treemap.js';

const check=items=>{
  const rects=squarify(items);
  for(const r of rects){for(const k of ['x','y','w','h'])assert.ok(Number.isFinite(r[k]));assert.ok(r.x>=-1e-9&&r.y>=-1e-9&&r.x+r.w<=100+1e-9&&r.y+r.h<=100+1e-9);}
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1e-8||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<1e-8);}
  assert.ok(Math.abs(rects.reduce((s,r)=>s+r.w*r.h,0)-10000)<1e-7);
  return rects;
};
test('empty, invalid and single weights',()=>{
  assert.deepEqual(squarify([]),[]);assert.deepEqual(squarify([{id:'x',weight:0},{id:'y',weight:NaN},{id:'z',weight:Infinity},{id:'n',weight:-1}]),[]);
  assert.deepEqual(squarify([{id:'a',weight:5}]),[{id:'a',x:0,y:0,w:100,h:100}]);
  assert.equal(check([{id:'a',weight:2},{id:'b',weight:-4},{id:'c',weight:Infinity}]).length,1);
});
test('equal and unequal areas partition the square without overlap',()=>{
  for(const weights of [[1,1,1,1,1,1,1,1,1,1,1],[9,5,3,1],[1,1e-100],[Number.MAX_VALUE,Number.MAX_VALUE],[9.493438185816843e-18,1.8923323845948995e-33,1.790797838779158e-36]]){
    const items=weights.map((weight,id)=>({id,weight}));const rects=check(items),max=Math.max(...weights),total=weights.reduce((a,b)=>a+b/max,0);
    for(const r of rects)assert.ok(Math.abs(r.w*r.h/10000-(weights[r.id]/max)/total)<1e-9);
    assert.deepEqual(items.map(x=>x.weight),weights);
  }
});
