import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { firebaseConfig } from './auth/firebase-config.js';

// Load optional archive categories after the base classic script has created P/render.
const educationAddon=document.createElement('script');
educationAddon.src='./education-addon.js?v=20260906c';
document.head.appendChild(educationAddon);

const $ = s => document.querySelector(s);
const state = window.JH_ACCESS_STATE = {
  ready:false, loggedIn:false, emailVerified:false, fullAccess:false, admin:false, unlimited:false, uid:null
};
let stopUser=null, stopAdmin=null;

function publish(){
  state.unlimited = !!(state.loggedIn && state.emailVerified && (state.admin || state.fullAccess));
  window.dispatchEvent(new CustomEvent('jh-access-change',{detail:{...state}}));
  updateButtons();
}
function clearSubs(){ try{stopUser?.()}catch{} try{stopAdmin?.()}catch{} stopUser=stopAdmin=null; }
function updateButtons(){
  const preview=$('#previewBtn'), full=$('#fullBtn');
  if(preview) preview.textContent=state.unlimited?'▶ PLAY':'▶ 30 SEC PREVIEW';
  if(full) full.textContent=state.admin?'✓ ADMIN UNLIMITED':state.fullAccess?'✓ FULL ACCESS':'🔒 FULL ACCESS';
}
function externalOnly(x){
  return !!(x && x.id==='false-summer' && x.url);
}
function launchExternal(x){
  if(!x?.url) return;
  // itch.io project pages are not reliable cross-origin iframe targets.
  // Open the supported public project page directly instead of leaving a blank player.
  const opened=window.open(x.url,'_blank','noopener,noreferrer');
  if(!opened) window.location.href=x.url;
}
function launchUnlimited(x){
  if(!x) return;
  if(externalOnly(x)) return launchExternal(x);
  const player=$('#player'), lock=$('#lock'), frame=$('#frame'), ph=$('#placeholder'), timer=$('#timer'), title=$('#ptitle');
  if(title) title.textContent=x.title||'Project';
  if(player) player.hidden=false;
  if(lock) lock.hidden=true;
  if(timer) timer.textContent=state.admin?'ADMIN · UNLIMITED':'FULL ACCESS · UNLIMITED';
  if(x.url){
    if(frame){frame.hidden=false;frame.src=x.url;}
    if(ph) ph.hidden=true;
  }else{
    if(frame){frame.hidden=true;frame.src='about:blank';}
    if(ph) ph.hidden=false;
  }
}

const originalPreview=window.preview;
if(typeof originalPreview==='function'){
  window.preview=function(x){
    if(externalOnly(x)) return launchExternal(x);
    if(state.unlimited) return launchUnlimited(x);
    return originalPreview(x);
  };
}

document.addEventListener('click',e=>{
  const target=e.target?.closest?.('#fullBtn');
  if(!target || !state.unlimited) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  $('#previewBtn')?.click();
},true);

document.addEventListener('click',()=>setTimeout(updateButtons,0),true);

try{
  const app=getApps().length?getApp():initializeApp(firebaseConfig);
  const auth=getAuth(app), db=getFirestore(app);
  onAuthStateChanged(auth,user=>{
    clearSubs();
    state.loggedIn=!!user;
    state.emailVerified=!!user?.emailVerified;
    state.uid=user?.uid||null;
    state.fullAccess=false;
    state.admin=false;
    state.ready=true;
    if(!user){ publish(); return; }
    stopUser=onSnapshot(doc(db,'users',user.uid),snap=>{
      state.fullAccess=!!(snap.exists() && snap.data()?.fullAccess===true && snap.data()?.active!==false);
      publish();
    },()=>{state.fullAccess=false;publish();});
    stopAdmin=onSnapshot(doc(db,'admins',user.uid),snap=>{
      state.admin=!!(snap.exists() && snap.data()?.active!==false);
      publish();
    },()=>{state.admin=false;publish();});
    publish();
  });
}catch(e){
  console.error('JH access control init failed',e);
  state.ready=true; publish();
}
