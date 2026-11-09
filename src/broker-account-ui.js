import {S,getApiUrl,getApiSecret} from './state.js';
import {createBrokerAccountReader,createBrokerAccountAutoRead,brokerAccountHTML} from './broker-account.js';
import {render} from './render.js';
// Reads start only while the account tab is active and the document is visible.
const brokerReader=createBrokerAccountReader({getUrl:getApiUrl,getSecret:getApiSecret,onChange:()=>{if(S.tab==='broker')render();}});
const brokerAutoRead=createBrokerAccountAutoRead({reader:brokerReader});
export function setBrokerAccountActive(active){brokerAutoRead.update(active,document.visibilityState==='visible');}
if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>setBrokerAccountActive(S.tab==='broker'));
export function mkBrokerAccount(){
 const d=document.createElement('div');
 d.innerHTML=brokerAccountHTML(brokerReader.getState());
 return d;
}
export async function refreshBrokerAccount(){await brokerReader.refresh();}
