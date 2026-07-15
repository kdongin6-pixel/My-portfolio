// ═══════════════════════════════════════════
// 📷 매매 스크린샷 인식 — Claude API 비전
// 스크린샷 → 거래 추출 → 확인 → 잔고 자동 반영
// ═══════════════════════════════════════════
import {S,save} from './state.js';
import {render} from './render.js';

// Anthropic API 키는 GAS URL과 마찬가지로 localStorage에만 저장 (소스코드에 없음)
export function getAnthropicKey(){return localStorage.getItem('pf_anthropic_key')||'';}
export function setAnthropicKey(k){localStorage.setItem('pf_anthropic_key',(k||'').trim());}

// 선택된 파일은 render()로 모달이 다시 그려져도 유지되도록 모듈 변수에 보관
let _shotFiles=[];
export function setShotFiles(files){_shotFiles=[...files];}
export function getShotFiles(){return _shotFiles;}
export function clearShotFiles(){_shotFiles=[];}

// 이미지 리사이즈 (긴 변 1568px, JPEG) → base64
function fileToBase64Jpeg(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const MAX=1568;
      let w=img.width,h=img.height;
      if(Math.max(w,h)>MAX){const sc=MAX/Math.max(w,h);w=Math.round(w*sc);h=Math.round(h*sc);}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      resolve(cv.toDataURL('image/jpeg',0.85).split(',')[1]);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('이미지를 읽을 수 없습니다'));};
    img.src=url;
  });
}

const PARSE_PROMPT=`이 이미지는 증권사 앱의 매매 체결내역 / 거래내역 / 입출금내역 스크린샷입니다.
이미지에 보이는 모든 거래를 빠짐없이 추출해서 아래 형식의 JSON만 출력하세요. JSON 외 다른 텍스트는 절대 출력하지 마세요.

{"trades":[
  {"type":"buy",          ← buy(매수) | sell(매도) | deposit(입금) | withdraw(출금) | dividend(배당)
   "name":"종목명",        ← 화면에 보이는 그대로. 현금 거래면 ""
   "ticker":"",           ← 티커/종목코드가 보이면 기재, 없으면 ""
   "qty":0,               ← 체결 수량 (숫자). 현금 거래면 0
   "price":0,             ← 체결 단가 (숫자). 현금 거래면 0
   "amount":0,            ← 입금/출금/배당 금액 (숫자). 매매면 0
   "fee":0,               ← 수수료 (숫자). 안 보이면 0
   "tax":0,               ← 세금/제비용 (숫자). 안 보이면 0
   "currency":"USD",      ← USD 또는 KRW
   "date":"",             ← YYYY-MM-DD 형식. 안 보이면 ""
   "memo":""}             ← 참고할 만한 기타 정보
]}

주의:
- 같은 종목이 여러 번 체결됐으면 각각 별도 항목으로
- 쉼표가 들어간 숫자(1,234.56)는 숫자로 변환
- 한국 ETF의 종목코드는 ticker에 (예: 426030)
- 확실하지 않은 값은 0 또는 ""로 두고 memo에 설명`;

// Claude API 호출 (브라우저 직접 — 개인용 앱, 키는 localStorage)
export async function parseScreenshots(files){
  const key=getAnthropicKey();
  if(!key)throw new Error('Anthropic API 키가 필요합니다 (⚙️ 설정)');
  if(!files||!files.length)throw new Error('스크린샷을 선택해주세요');

  const images=[];
  for(const f of files){
    images.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:await fileToBase64Jpeg(f)}});
  }

  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:'claude-opus-4-8',
      max_tokens:4096,
      thinking:{type:'adaptive'},
      messages:[{role:'user',content:[...images,{type:'text',text:PARSE_PROMPT}]}]
    })
  });
  if(!res.ok){
    let msg='API 오류 ('+res.status+')';
    try{const e=await res.json();if(e.error?.message)msg+=': '+e.error.message;}catch(_){}
    if(res.status===401)msg='API 키가 올바르지 않습니다 (⚙️ 설정에서 확인)';
    throw new Error(msg);
  }
  const data=await res.json();
  const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
  const jsonStr=text.slice(text.indexOf('{'),text.lastIndexOf('}')+1);
  let parsed;
  try{parsed=JSON.parse(jsonStr);}catch(e){throw new Error('응답 해석 실패 — 스크린샷이 선명한지 확인해주세요');}
  const trades=(parsed.trades||[]).filter(t=>t&&t.type);
  if(!trades.length)throw new Error('거래를 찾지 못했습니다 — 체결내역 화면인지 확인해주세요');
  return trades.map(enrich);
}

// 파싱 결과에 종목 매칭 정보 부여
function enrich(t){
  const curr=t.currency==='KRW'?'KRW':'USD';
  const acct=curr==='USD'?'메리츠증권':'ISA';
  const norm=s=>(s||'').replace(/\s+/g,'').toLowerCase();
  let matched=null;
  if(t.type==='buy'||t.type==='sell'){
    if(t.ticker)matched=S.stocks.find(x=>x.ticker&&x.ticker.toUpperCase()===String(t.ticker).toUpperCase());
    if(!matched&&t.name)matched=S.stocks.find(x=>norm(x.name)===norm(t.name));
    if(!matched&&t.name)matched=S.stocks.find(x=>norm(x.name).includes(norm(t.name))||norm(t.name).includes(norm(x.name)));
  }
  const qty=Number(t.qty)||0,price=Number(t.price)||0,amount=Number(t.amount)||0;
  const fee=(Number(t.fee)||0)+(Number(t.tax)||0);
  const isTrade=t.type==='buy'||t.type==='sell';
  const insufficient=t.type==='sell'&&matched&&qty>matched.qty;
  const invalid=isTrade?(qty<=0||price<=0):(amount<=0);
  return{
    type:t.type,name:t.name||'',ticker:t.ticker||'',qty,price,amount,fee,
    curr,acct,date:t.date||'',memo:t.memo||'',
    matchedId:matched?matched.id:null,
    matchedName:matched?matched.name:null,
    isNew:isTrade&&!matched&&t.type==='buy',
    insufficient,invalid,
    checked:!invalid&&!insufficient&&!(t.type==='sell'&&!matched)
  };
}

// 확인된 항목을 잔고에 반영 (수수료·세금까지 현금에 정확히 반영)
export function applyParsed(items){
  let applied=0;
  const nowDate=new Date().toLocaleDateString('ko-KR');
  const nowTime=new Date().toLocaleTimeString('ko-KR');
  items.forEach((t,i)=>{
    if(!S.cash[t.acct])S.cash[t.acct]={USD:0,KRW:0};

    if(t.type==='deposit'||t.type==='dividend'||t.type==='withdraw'){
      const inMode=t.type!=='withdraw';
      S.cash[t.acct][t.curr]+=inMode?t.amount:-t.amount;
      S.cashTxns.unshift({
        id:Date.now()+i,acct:t.acct,curr:t.curr,mode:inMode?'in':'out',amount:t.amount,
        memo:(t.type==='dividend'?'배당':t.type==='deposit'?'입금':'출금')+(t.name?' - '+t.name:'')+(t.memo?' ('+t.memo+')':'')+' 📷',
        date:t.date||nowDate,time:nowTime
      });
      applied++;return;
    }

    // 매수/매도
    let s=t.matchedId?S.stocks.find(x=>x.id===t.matchedId):null;
    if(!s&&t.type==='buy'){
      s={id:Math.max(0,...S.stocks.map(x=>x.id))+1,name:t.name,ticker:t.ticker,acct:t.acct,curr:t.curr,qty:0,avg:0,cur:t.price,tag:''};
      S.stocks.push(s);
    }
    if(!s)return; // 매도인데 종목 미매칭 → 건너뜀

    const oldQty=s.qty,oldAvg=s.avg;
    let pnl=0,cashChange=0;
    if(t.type==='buy'){
      const tot=(Number(s.qty)||0)*(Number(s.avg)||0)+t.qty*t.price;
      s.qty=(Number(s.qty)||0)+t.qty;
      s.avg=s.qty>0?tot/s.qty:0;
      cashChange=-(t.qty*t.price+t.fee);
    }else{
      if(t.qty>s.qty)return; // 보유수량 초과 → 건너뜀
      pnl=(t.price-s.avg)*t.qty-t.fee; // 수수료·세금 차감한 실현손익
      s.qty-=t.qty;
      cashChange=t.qty*t.price-t.fee;
    }
    S.cash[t.acct][t.curr]+=cashChange;
    S.txns.unshift({
      id:Date.now()+i,stockId:s.id,name:s.name,acct:t.acct,curr:t.curr,
      mode:t.type,qty:t.qty,price:t.price,pnl,cashChange,fee:t.fee,
      prevQty:oldQty,prevAvg:oldAvg,
      date:t.date||nowDate,time:nowTime+' 📷'
    });
    applied++;
  });
  save();
  return applied;
}
