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

function onlyIn(items,other){
  const known=new Set((Array.isArray(other)?other:[]).map(entryKey));
  return (Array.isArray(items)?items:[]).filter(item=>!known.has(entryKey(item)));
}

function mergeSnapshots(localItems,remoteItems,key){
  const byKey=new Map();
  (remoteItems||[]).forEach(item=>byKey.set(item[key],item));
  (localItems||[]).forEach(item=>byKey.set(item[key],item));
  return [...byKey.values()].sort((a,b)=>String(a[key]).localeCompare(String(b[key])));
}

function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value??null);
}

// Server-owned ledger values: holdings (quantity and average cost per ticker), cash and the KIS settlement.
// Quote fields such as `cur` change on every refresh, so they are intentionally left out.
export function serverOwnedSignature(state){
  const stocks=(Array.isArray(state?.stocks)?state.stocks:[])
    .map(s=>({key:String(s?.acct||'')+'|'+String(s?.ticker||s?.name||s?.id||''),qty:Number(s?.qty)||0,avg:Number(s?.avg)||0}))
    .sort((a,b)=>a.key.localeCompare(b.key));
  return stable({stocks,cash:state?.cash||{},kis:state?.kisIsaSettlement??null});
}

// `baseRevision` is the server revision this device last loaded or saved; `remoteRevision` is the one just read.
// Without them the clock-based rule below applies unchanged.
export function mergeCloudState(local,remote,{baseRevision,remoteRevision}={}){
  if(!remote||typeof remote!=='object')return{applied:false,state:local};
  const remoteIsNewerByClock=timestamp(remote.updatedAt)>timestamp(local?.updatedAt);
  // A device clock can be ahead of the server, so a stale local ledger can look "newer". When the server revision
  // moved since our base and holdings/cash differ, the local values are stale: the server's values win.
  const serverMoved=typeof remoteRevision==='string'&&remoteRevision!==''&&remoteRevision!==baseRevision;
  const staleLocal=remoteIsNewerByClock||(serverMoved&&serverOwnedSignature(local)!==serverOwnedSignature(remote));
  const remoteIsNewer=remoteIsNewerByClock||staleLocal;

  if(!remoteIsNewer){
    const txns=mergeUnique(local?.txns,remote.txns,{protectedOnly:true});
    const cashTxns=mergeUnique(local?.cashTxns,remote.cashTxns,{protectedOnly:true});
    const agentImports=mergeUnique(local?.agentImports,remote.agentImports);
    const changed=txns.length!==(local?.txns||[]).length||cashTxns.length!==(local?.cashTxns||[]).length||agentImports.length!==(local?.agentImports||[]).length;
    if(!changed)return{applied:false,state:local};
    return{applied:true,state:{...local,txns,cashTxns,agentImports}};
  }

  // When stale local values are replaced, unsaved local ledger entries must leave the ledger too: their effect is not
  // in the server's holdings and cash, so keeping them would leave trades that no position reflects. They are
  // returned in `droppedLocal` so the caller can back them up.
  const droppedLocal=staleLocal?{txns:onlyIn(local?.txns,remote.txns),cashTxns:onlyIn(local?.cashTxns,remote.cashTxns)}:null;
  return{applied:true,overwroteLocal:staleLocal,droppedLocal,state:{
    ...local,
    stocks:Array.isArray(remote.stocks)?remote.stocks:[],
    cash:remote.cash||local.cash,
    kisIsaSettlement:remote.kisIsaSettlement ?? local?.kisIsaSettlement ?? null,
    txns:staleLocal?(Array.isArray(remote.txns)?[...remote.txns]:[]):mergeUnique(remote.txns,local?.txns),
    cashTxns:staleLocal?(Array.isArray(remote.cashTxns)?[...remote.cashTxns]:[]):mergeUnique(remote.cashTxns,local?.cashTxns),
    agentImports:mergeUnique(remote.agentImports,local?.agentImports),
    snapshots:mergeSnapshots(local?.snapshots,remote.snapshots,'date'),
    intradaySnaps:mergeSnapshots(local?.intradaySnaps,remote.intradaySnaps,'dt'),
    journal:Array.isArray(remote.journal)?remote.journal:(local?.journal||[]),
    tags:Array.isArray(remote.tags)?remote.tags:(local?.tags||[]),
    tagColors:remote.tagColors||local?.tagColors||{},
    updatedAt:remote.updatedAt
  }};
}
