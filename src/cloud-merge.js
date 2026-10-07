function timestamp(value){
  const parsed=Date.parse(value||'');
  return Number.isFinite(parsed)?parsed:0;
}

function mergeSnapshots(localSnapshots,remoteSnapshots,key){
  const byKey=new Map();
  (localSnapshots||[]).forEach(item=>byKey.set(item[key],item));
  (remoteSnapshots||[]).forEach(item=>byKey.set(item[key],item));
  return [...byKey.values()].sort((a,b)=>String(a[key]).localeCompare(String(b[key])));
}

export function mergeCloudState(local,remote){
  if(!remote||typeof remote!=="object"||timestamp(remote.updatedAt)<=timestamp(local?.updatedAt)){
    return {applied:false,state:local};
  }
  return {applied:true,state:{
    ...local,
    stocks:Array.isArray(remote.stocks)?remote.stocks:[],
    cash:remote.cash||local.cash,
    txns:Array.isArray(remote.txns)?remote.txns:[],
    cashTxns:Array.isArray(remote.cashTxns)?remote.cashTxns:[],
    journal:Array.isArray(remote.journal)?remote.journal:(local.journal||[]),
    tags:Array.isArray(remote.tags)?remote.tags:(local.tags||[]),
    tagColors:remote.tagColors||local.tagColors||{},
    rate:Number.isFinite(Number(remote.rate))?Number(remote.rate):local.rate,
    agentImports:Array.isArray(remote.agentImports)?remote.agentImports:(local.agentImports||[]),
    snapshots:mergeSnapshots(local.snapshots,remote.snapshots,'date'),
    intradaySnaps:mergeSnapshots(local.intradaySnaps,remote.intradaySnaps,'dt'),
    updatedAt:remote.updatedAt
  }};
}
