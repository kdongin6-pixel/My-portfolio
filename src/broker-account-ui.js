import {S,getApiUrl,getApiSecret} from './state.js';
import {createBrokerAccountReader,createBrokerAccountAutoRead,brokerAccountHTML} from './broker-account.js';
import {render} from './render.js';
export function addPaperClass(html,tagRegex,cls){
 return html.replace(tagRegex,tag=>{
  if(/\sclass\s*=\s*(["'])/.test(tag))return tag.replace(/(\sclass\s*=\s*)(["'])([^"']*)\2/,(_,prefix,quote,value)=>`${prefix}${quote}${value} ${cls}${quote}`);
  return tag.replace(/^<[^\s/>]+/,name=>`${name} class="${cls}"`);
 });
}
// Reads start only while the account tab is active and the document is visible.
export function createBrokerAccountSelection(storage){
 let selected='meritz';
 try{if(storage?.getItem?.('pf_broker_account')==='kis')selected='kis';}catch{}
 return {get:()=>selected,select(value){if(!['meritz','kis'].includes(value)||value===selected)return false;selected=value;try{storage?.setItem('pf_broker_account',value);}catch{}return true;}};
}
const brokerSelection=createBrokerAccountSelection(typeof localStorage==='undefined'?null:localStorage);
const brokerReaders=Object.fromEntries(['meritz','kis'].map(provider=>[provider,createBrokerAccountReader({provider,getUrl:getApiUrl,getSecret:getApiSecret,onChange:()=>{if(S.tab==='broker'&&brokerSelection.get()===provider)render();}})]));
const brokerAutoReads=Object.fromEntries(Object.entries(brokerReaders).map(([key,reader])=>[key,createBrokerAccountAutoRead({reader})]));
export function setBrokerAccountActive(active){for(const [key,auto] of Object.entries(brokerAutoReads))auto.update(active&&key===brokerSelection.get(),document.visibilityState==='visible');}
export function selectBrokerAccount(provider){if(!brokerSelection.select(provider))return;for(const auto of Object.values(brokerAutoReads))auto.stop();render();if(S.tab==='broker'&&document.visibilityState==='visible'){const reader=brokerReaders[provider];if(!reader.getState().autoPaused)void reader.refresh();setBrokerAccountActive(true);}}

if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>setBrokerAccountActive(S.tab==='broker'));
export function mkBrokerAccount(){
 const d=document.createElement('div');
 let html=brokerAccountHTML(brokerReaders[brokerSelection.get()].getState())
  .replace('class="broker-account"','class="broker-account tabular-nums"')
  .replace(/class="(broker-intro|broker-section|broker-summary|broker-card)(?=[ " ])/g,'class="$1 paper-card')
  .replace(/<h([123])>/g,'<h$1 class="paper-section-heading">');
 html=addPaperClass(html,/<button\b[^>]*>/g,'paper-button');
 d.innerHTML=addPaperClass(html,/<button\b(?=[^>]*\bid="btnBrokerRead")[^>]*>/g,'paper-button-accent');
 return d;
}
export async function refreshBrokerAccount(){await brokerReaders[brokerSelection.get()].refresh();}
