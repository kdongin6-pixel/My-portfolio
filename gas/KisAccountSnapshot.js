// Pure response normalizer; no network, storage or account credentials.
function normalizeKisBalance_(body,continuation,queriedAt){
 const fail=error=>({status:'error',paginationComplete:false,rows:[],cash:null,errorCode:error,queriedAt:queriedAt||null});
 const num=v=>{if((typeof v!=='string'&&typeof v!=='number')||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<=1e18?n:null;};
 if(!body||body.rt_cd!=='0'||!Array.isArray(body.output1)||!Array.isArray(body.output2)||body.output2.length!==1)return fail('provider_or_schema_error');
 if(continuation!=='D'&&continuation!=='E')return fail('pagination_incomplete');
 if(!Number.isFinite(Date.parse(queriedAt)))return fail('invalid_timestamp');
 const cash=num(body.output2[0]?.dnca_tot_amt);if(cash===null||cash<0)return fail('cash_unverified');
 const seen=new Set(),rows=[],zeroTickers=[];
 for(const r of body.output1){
  if(!r||typeof r.pdno!=='string'||!/^[A-Za-z0-9]{6}$/.test(r.pdno)||seen.has(r.pdno))return fail('invalid_or_duplicate_holding');
  seen.add(r.pdno);const quantity=num(r.hldg_qty);if(quantity===null||quantity<0)return fail('invalid_holding_quantity');if(quantity===0){zeroTickers.push(r.pdno);continue;}
  const avg=num(r.pchs_avg_pric),price=num(r.prpr);if(avg===null||avg<=0||price===null||price<=0)return fail('invalid_holding_price');
  rows.push({ticker:r.pdno,name:typeof r.prdt_name==='string'?r.prdt_name.slice(0,200):r.pdno,currency:'KRW',quantity,averagePrice:avg,currentPrice:price,marketValue:num(r.evlu_amt),pnl:num(r.evlu_pfls_amt)});
 }
 return {status:'success',paginationComplete:true,rows,zeroTickers,cash:{currency:'KRW',balance:cash,nextSettlement:num(body.output2[0]?.nxdy_excc_amt),provisionalSettlement:num(body.output2[0]?.prvs_rcdl_excc_amt)},errorCode:null,queriedAt};
}
