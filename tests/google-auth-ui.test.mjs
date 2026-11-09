import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync('src/auth.js','utf8').replace(/^export /mg,'');
function fixture({clientId='',google=true}={}){
  const local=new Map(clientId?[['pf_google_oauth_client_id',clientId]]:[]);
  const session=new Map();
  let initialized=null,rendered=null;
  const identity={initialize:config=>{initialized=config;},renderButton:(el,options)=>{rendered={el,options};}};
  const container={cleared:false,replaceChildren(){this.cleared=true;}};
  const c=vm.createContext({
    localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v))},
    sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)},
    window:google?{google:{accounts:{id:identity}}}:{},
  });
  vm.runInContext(source,c);
  return {c,local,session,container,get initialized(){return initialized;},get rendered(){return rendered;}};
}

test('Google client ID persists locally but ID token is session-only',()=>{
  const f=fixture();
  f.c.setGoogleClientId(' public-client.apps.googleusercontent.com ');
  f.c.setIdToken('test-id-token');
  assert.equal(f.c.getGoogleClientId(),'public-client.apps.googleusercontent.com');
  assert.equal(f.c.getIdToken(),'test-id-token');
  assert.equal(f.local.get('pf_google_id_token'),undefined);
  assert.equal(f.session.get('pf_google_id_token'),'test-id-token');
});

test('Google sign-in button sends its credential only to session storage',()=>{
  const f=fixture({clientId:'public-client.apps.googleusercontent.com'});
  let success=0;
  assert.deepEqual(JSON.parse(JSON.stringify(f.c.renderGoogleButton(f.container,{onSuccess:()=>success++}))),{ok:true});
  assert.equal(f.initialized.client_id,'public-client.apps.googleusercontent.com');
  assert.equal(f.rendered.el,f.container);
  f.initialized.callback({credential:'returned-id-token'});
  assert.equal(f.c.getIdToken(),'returned-id-token');
  assert.equal(f.local.get('pf_google_id_token'),undefined);
  assert.equal(success,1);
});

test('sign-in UI fails closed when the client ID or Google library is absent',()=>{
  const noClient=fixture();
  assert.equal(noClient.c.renderGoogleButton(noClient.container).error,'google_client_id_missing');
  const noLibrary=fixture({clientId:'public-client.apps.googleusercontent.com',google:false});
  assert.equal(noLibrary.c.renderGoogleButton(noLibrary.container).error,'google_identity_unavailable');
});

test('sign out removes only the session token and retains the public client ID',()=>{
  const f=fixture({clientId:'public-client.apps.googleusercontent.com'});
  f.c.setIdToken('temporary');
  f.c.clearIdToken();
  assert.equal(f.c.getIdToken(),'');
  assert.equal(f.c.getGoogleClientId(),'public-client.apps.googleusercontent.com');
});
