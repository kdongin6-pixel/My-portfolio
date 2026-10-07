function timestamp(value){
  const parsed=Date.parse(value||'');
  return Number.isFinite(parsed)?parsed:0;
}

function entryKey(item){
  if(typeof item==='string')return `source:${item}`;
  if(item?.sourceId)return `source:${item.sourceId}`;
  if(item?.id!==undefined&&item?.id!==null)return `id:${item.id}`;
  return `value:${JSON.stringify(item)}`;
}

function mergeUnique(primary,secondary,{protectedOnly=false}={}){
  const result=Array.isArray(primary)?[...primary]:[];
  const seen=new Set(result.map(entryKey));
  (Array.isArray(secondary)?secondary:[]).forEach(item=>{
    if(protectedOnly&&item?.source!=='agent'&&!item?.sourceId)return;
    const key=entryKey(item);
    if(!seen.has(key)){seen.add(key);result.push(item);}
  });
  return result;
}

function mergeSnapshots(localItems,remoteItems,key){
  const byKey=new Map();
  (remoteItems||[]).forEach(item=>byKey.set(item[key],item));
  (localItems||[]).forEach(item=>byKey.set(item[key],item));
  return [...byKey.values()].sort((a,b)=>String(a[key]).localeCompare(String(b[key])));
}

export function mergeCloudState(local,remote){
  if(!remote||typeof remote!=='object')return{applied:false,state:local};
  const remoteIsNewer=timestamp(remote.updatedAt)>timestamp(local?.updatedAt);

  if(!remoteIsNewer){
    const txns=mergeUnique(local?.txns,remote.txns,{protectedOnly:true});
    const cashTxns=mergeUnique(local?.cashTxns,remote.cashTxns,{protectedOnly:true});
    const agentImports=mergeUnique(local?.agentImports,remote.agentImports);
    const changed=txns.length!==(local?.txns||[]).length||cashTxns.length!==(local?.cashTxns||[]).length||agentImports.length!==(local?.agentImports||[]).length;
    if(!changed)return{applied:false,state:local};
    return{applied:true,state:{...local,txns,cashTxns,agentImports}};
  }

  return{applied:true,state:{
    ...local,
    stocks:Array.isArray(remote.stocks)?remote.stocks:[],
    cash:remote.cash||local.cash,
    txns:mergeUnique(remote.txns,local?.txns),
    cashTxns:mergeUnique(remote.cashTxns,local?.cashTxns),
    agentImports:mergeUnique(remote.agentImports,local?.agentImports),
    snapshots:mergeSnapshots(local?.snapshots,remote.snapshots,'date'),
    intradaySnaps:mergeSnapshots(local?.intradaySnaps,remote.intradaySnaps,'dt'),
    journal:Array.isArray(remote.journal)?remote.journal:(local?.journal||[]),
    tags:Array.isArray(remote.tags)?remote.tags:(local?.tags||[]),
    tagColors:remote.tagColors||local?.tagColors||{},
    updatedAt:remote.updatedAt
  }};
}
