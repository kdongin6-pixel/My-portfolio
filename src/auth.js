const TOKEN_KEY='pf_google_id_token';
const CLIENT_ID_KEY='pf_google_oauth_client_id';
let initializedClientId='';
let buttonHandlers={onSuccess:null,onError:null};

export function getGoogleClientId(){
  try{return localStorage.getItem(CLIENT_ID_KEY)||'';}catch{return '';}
}

export function setGoogleClientId(value){
  localStorage.setItem(CLIENT_ID_KEY,(value||'').trim());
}

export function getIdToken(){
  try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch{return '';}
}

export function setIdToken(value){
  if(typeof value!=='string'||!value.trim())throw new Error('missing_id_token');
  sessionStorage.setItem(TOKEN_KEY,value);
}

export function clearIdToken(){
  try{sessionStorage.removeItem(TOKEN_KEY);}catch{}
}

export function renderGoogleButton(container,handlers={}){
  if(!container)return{ok:false,error:'button_container_missing'};
  const clientId=getGoogleClientId();
  if(!clientId)return{ok:false,error:'google_client_id_missing'};
  const identity=window.google?.accounts?.id;
  if(!identity)return{ok:false,error:'google_identity_unavailable'};
  buttonHandlers=handlers;
  if(initializedClientId!==clientId){
    identity.initialize({client_id:clientId,callback:response=>{
      if(!response||typeof response.credential!=='string'||!response.credential){
        buttonHandlers.onError?.('missing_id_token');
        return;
      }
      try{
        setIdToken(response.credential);
        buttonHandlers.onSuccess?.();
      }catch{
        buttonHandlers.onError?.('session_storage_unavailable');
      }
    }});
    initializedClientId=clientId;
  }
  container.replaceChildren();
  identity.renderButton(container,{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular',locale:'ko'});
  return{ok:true};
}
