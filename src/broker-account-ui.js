import {S,getApiUrl,getApiSecret} from './state.js';
import {createBrokerAccountReader,brokerAccountHTML} from './broker-account.js';
import {render} from './render.js';
// No automatic reads: construction, render and tab navigation are side-effect free.
const brokerReader=createBrokerAccountReader({getUrl:getApiUrl,getSecret:getApiSecret,onChange:()=>{if(S.tab==='broker')render();}});
export function mkBrokerAccount(){
 const d=document.createElement('div');
 d.innerHTML=brokerAccountHTML(brokerReader.getState());
 return d;
}
export async function refreshBrokerAccount(){await brokerReader.refresh();}
