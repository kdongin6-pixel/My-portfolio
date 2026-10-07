export const GOOGLE_CLIENT_ID='490959104293-8p22eduqu48opvdh9ea32p169fckubvv.apps.googleusercontent.com';

const TOKEN_KEY='pf_google_id_token';

function tokenExpiryMs(token){
  try{
    const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return Number.isFinite(Number(payload.exp))?Number(payload.exp)*1000:null;
  }catch(e){return null;}
}

export function isGoogleIdTokenCurrent(token,nowMs=Date.now()){
  const expiry=typeof token==='string'?tokenExpiryMs(token):null;
  return expiry===null||expiry>nowMs;
}

export function getGoogleIdToken({sessionStorageRef=sessionStorage}={}){
  const token=sessionStorageRef.getItem(TOKEN_KEY);
  if(token&&!isGoogleIdTokenCurrent(token)){sessionStorageRef.removeItem(TOKEN_KEY);return null;}
  return token;
}

export function requestGoogleLogin({sessionStorageRef=sessionStorage,windowRef=window}={}){
  sessionStorageRef.removeItem(TOKEN_KEY);
  windowRef.dispatchEvent(new Event('portfolio-auth-required'));
}

export function createAuthSession({sessionStorageRef=sessionStorage}={}){
  function getToken(){return getGoogleIdToken({sessionStorageRef});}
  function setCredential(response){
    const token=response?.credential;
    if(typeof token!=="string"||!token.trim())return false;
    sessionStorageRef.setItem(TOKEN_KEY,token);
    return true;
  }
  function clear(){sessionStorageRef.removeItem(TOKEN_KEY);}
  return {getToken,setCredential,clear,isAuthenticated:()=>Boolean(getToken())};
}

export function initializeGoogleIdentity({googleRef=window.google,auth,documentRef=document,onAuthenticated=()=>{}}={}){
  if(!googleRef?.accounts?.id||!auth)return false;
  googleRef.accounts.id.initialize({
    client_id:GOOGLE_CLIENT_ID,
    callback:response=>{if(auth.setCredential(response))onAuthenticated();}
  });
  const container=documentRef.getElementById('googleLogin');
  if(container&&!auth.isAuthenticated()){
    googleRef.accounts.id.renderButton(container,{theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
  }
  return true;
}
