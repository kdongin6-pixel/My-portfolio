// Squarified treemap in percentage coordinates. Invalid weights are excluded.
export function squarify(items){
  const valid=items.filter(item=>Number.isFinite(item.weight)&&item.weight>0);
  if(!valid.length)return [];
  const max=Math.max(...valid.map(item=>item.weight));
  const total=valid.reduce((sum,item)=>sum+item.weight/max,0);
  const pending=valid.map(item=>({id:item.id,area:(item.weight/max)/total*10000})).filter(item=>item.area>0).sort((a,b)=>b.area-a.area);
  const rects=[];
  let x=0,y=0,w=100,h=100;
  const worst=(row,side)=>{
    const areas=row.map(item=>item.area),sum=areas.reduce((a,b)=>a+b,0),s2=side*side;
    return Math.max(s2*Math.max(...areas)/(sum*sum),sum*sum/(s2*Math.min(...areas)));
  };
  while(pending.length){
    // Tiny weights can be smaller than the remaining floating-point precision.
    if(w<=0||h<=0){
      for(const item of pending)rects.push({id:item.id,x:Math.min(100,x),y:Math.min(100,y),w:0,h:0});
      break;
    }
    const row=[pending.shift()];
    while(pending.length&&worst([...row,pending[0]],Math.min(w,h))<=worst(row,Math.min(w,h)))row.push(pending.shift());
    const sum=row.reduce((a,b)=>a+b.area,0);
    if(w>=h){
      const width=Math.min(w,sum/h);let pos=y;
      if(!width){for(const item of row)rects.push({id:item.id,x,y,w:0,h:0});continue;}
      for(const item of row){const height=Math.min(Math.max(0,y+h-pos),item.area/width);rects.push({id:item.id,x,y:pos,w:width,h:height});pos+=height;}
      x+=width;w-=width;
    }else{
      const height=Math.min(h,sum/w);let pos=x;
      if(!height){for(const item of row)rects.push({id:item.id,x,y,w:0,h:0});continue;}
      for(const item of row){const width=Math.min(Math.max(0,x+w-pos),item.area/height);rects.push({id:item.id,x:pos,y,w:width,h:height});pos+=width;}
      y+=height;h-=height;
    }
  }
  return rects;
}
