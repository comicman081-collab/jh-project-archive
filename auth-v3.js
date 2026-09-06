import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile, reload,
  reauthenticateWithCredential, EmailAuthProvider, deleteUser
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, updateDoc, deleteDoc, runTransaction,
  serverTimestamp, addDoc, collection
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { firebaseConfig, privacyVersion } from './auth/firebase-config.js';

const $ = s => document.querySelector(s);
const configured = firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('REPLACE_');
const SITE_URL = `${location.origin}${location.pathname}`;
let app, auth, db, currentProfile = null;

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const sha256 = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))))].map(b=>b.toString(16).padStart(2,'0')).join('');
const normalizeUsername = s => String(s||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
const friendlyAuthError = e => ({
  'auth/email-already-in-use':'이미 가입된 이메일입니다.',
  'auth/invalid-email':'이메일 형식을 확인하세요.',
  'auth/weak-password':'비밀번호는 8자 이상으로 설정하세요.',
  'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/too-many-requests':'요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  'auth/requires-recent-login':'보안을 위해 다시 로그인한 뒤 시도하세요.'
}[e?.code] || e?.message || '처리 중 오류가 발생했습니다.');

function addStyles(){
  if($('#jh-auth-v3-style')) return;
  const st=document.createElement('style'); st.id='jh-auth-v3-style'; st.textContent=`
  .jh-auth-tabs{display:flex;gap:6px;margin:18px 0}.jh-auth-tabs button{flex:1;border:1px solid #284961;background:#081520;color:#9fb4c3;border-radius:9px;padding:10px;cursor:pointer;font-weight:700}.jh-auth-tabs button.on{color:#eaffff;border-color:#31cbe7;background:#0a2030}.jh-auth-pane[hidden]{display:none}.jh-auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.jh-auth-row{margin-top:12px}.jh-auth-row label{display:block;font-size:11px;font-weight:700;color:#9bb2c2;margin-bottom:6px}.jh-auth-row input{width:100%;border:1px solid #284961;background:#06101a;color:#fff;border-radius:8px;padding:12px}.jh-auth-check{display:flex;gap:9px;align-items:flex-start;margin:12px 0;color:#9fb3c3;font-size:12px}.jh-auth-check input{margin-top:3px}.jh-auth-check a{color:#63dff4}.jh-auth-msg{margin-top:14px;border:1px solid #2c4d63;background:#091824;border-radius:9px;padding:11px;color:#aec3d2;font-size:12px;line-height:1.55}.jh-auth-msg.ok{border-color:#287357;color:#8ef0bd}.jh-auth-msg.err{border-color:#7b3d4a;color:#ffadb9}.jh-auth-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.jh-auth-actions button{flex:1;min-width:130px}.jh-profile-card{border:1px solid #1b4056;background:#091824;border-radius:12px;padding:15px;margin-top:15px}.jh-profile-line{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #163248}.jh-profile-line:last-child{border-bottom:0}.jh-profile-line span{color:#829bad}.jh-profile-line b{color:#e9f8ff;text-align:right}.jh-danger{border-color:#77414b!important;color:#ffc1c9!important;background:#1b1116!important}.jh-pill{display:inline-block;padding:3px 7px;border-radius:999px;border:1px solid #31556b;font-size:10px}.jh-pill.good{border-color:#2c8063;color:#7eebba}.jh-pill.warn{border-color:#7a6331;color:#f2d789}@media(max-width:620px){.jh-auth-grid{grid-template-columns:1fr}}
  `; document.head.appendChild(st);
}

function modal(){
  const root=$('#auth'); if(!root) return null;
  root.innerHTML=`<section class="panel auth" style="width:min(540px,94vw)"><button class="close" id="jhAuthClose">×</button><span class="tag">MEMBER ACCESS</span><h2 id="jhAuthTitle">회원 로그인</h2>
  <div class="jh-auth-tabs"><button data-auth-tab="login" class="on">로그인</button><button data-auth-tab="signup">회원가입</button><button data-auth-tab="reset">PW 재설정</button></div>
  <div class="jh-auth-pane" data-pane="login">
    <div class="jh-auth-row"><label>이메일<input id="jhLoginEmail" type="email" autocomplete="email" placeholder="name@example.com"></label></div>
    <div class="jh-auth-row"><label>비밀번호<input id="jhLoginPw" type="password" autocomplete="current-password" placeholder="비밀번호"></label></div>
    <label class="jh-auth-check"><input id="jhRemember" type="checkbox" checked><span>이 기기에서 로그인 상태 유지</span></label>
    <button class="primary" style="width:100%" id="jhLoginGo">LOGIN</button>
  </div>
  <div class="jh-auth-pane" data-pane="signup" hidden>
    <div class="jh-auth-grid"><div class="jh-auth-row"><label>아이디<input id="jhJoinUser" maxlength="24" placeholder="영문/숫자/._-"></label></div><div class="jh-auth-row"><label>닉네임<input id="jhJoinName" maxlength="24" placeholder="사이트 표시 이름"></label></div></div>
    <div class="jh-auth-row"><label>이메일<input id="jhJoinEmail" type="email" autocomplete="email" placeholder="인증·PW 재설정에 사용"></label></div>
    <div class="jh-auth-grid"><div class="jh-auth-row"><label>비밀번호<input id="jhJoinPw" type="password" autocomplete="new-password" placeholder="8자 이상"></label></div><div class="jh-auth-row"><label>비밀번호 확인<input id="jhJoinPw2" type="password" autocomplete="new-password"></label></div></div>
    <label class="jh-auth-check"><input id="jhAge14" type="checkbox"><span><b>[필수]</b> 본인은 <b>만 14세 이상</b>입니다.</span></label>
    <label class="jh-auth-check"><input id="jhPrivacy" type="checkbox"><span><b>[필수]</b> <a href="./privacy.html" target="_blank" rel="noopener">개인정보 수집·이용 및 처리방침</a>을 확인했고 동의합니다.</span></label>
    <button class="primary" style="width:100%" id="jhJoinGo">회원가입 + 이메일 인증</button>
  </div>
  <div class="jh-auth-pane" data-pane="reset" hidden>
    <p class="detailtext">가입 이메일로 Firebase가 비밀번호 재설정 메일을 보냅니다.</p>
    <div class="jh-auth-row"><label>가입 이메일<input id="jhResetEmail" type="email" autocomplete="email"></label></div>
    <button class="primary" style="width:100%" id="jhResetGo">PW RESET EMAIL</button>
  </div>
  <div class="jh-auth-pane" data-pane="profile" hidden><div id="jhProfile"></div></div>
  <div class="jh-auth-msg" id="jhAuthMsg">${configured?'회원정보는 Firebase Authentication/Firestore 무료 플랜에 저장됩니다.':'Firebase 무료 프로젝트 연결 전입니다. UI와 보안 규칙은 준비되어 있으며 설정값 연결 후 실제 가입이 활성화됩니다.'}</div>
  </section>`;
  return root;
}

function msg(text,kind=''){const el=$('#jhAuthMsg'); if(!el)return; el.textContent=text; el.className='jh-auth-msg '+kind;}
function setTab(name){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('on',b.dataset.authTab===name));
  document.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==name);
  const t={login:'회원 로그인',signup:'회원가입',reset:'비밀번호 재설정',profile:'내 계정'}[name]; if($('#jhAuthTitle'))$('#jhAuthTitle').textContent=t;
}
function openAuth(tab){ const root=$('#auth'); if(!root)return; root.hidden=false; setTab(tab||((auth?.currentUser)?'profile':'login')); if(tab==='profile')renderProfile(); }
function closeAuth(){const root=$('#auth'); if(root)root.hidden=true;}

async function profileFor(user){ if(!user||!db)return null; const s=await getDoc(doc(db,'users',user.uid)); return s.exists()?s.data():null; }
async function refreshTop(user){
  const btn=$('#loginBtn'); if(!btn)return;
  if(!user){currentProfile=null;btn.textContent='LOGIN';btn.onclick=()=>openAuth('login');return;}
  currentProfile=await profileFor(user);
  const label=currentProfile?.displayName||currentProfile?.username||user.email?.split('@')[0]||'MEMBER';
  btn.textContent=user.emailVerified?`${label} ▾`:`${label} · 인증 필요`;
  btn.onclick=()=>openAuth('profile');
}

async function signup(){
  if(!configured)return msg('Firebase 프로젝트 설정값을 먼저 연결해야 합니다.','err');
  const username=normalizeUsername($('#jhJoinUser').value), displayName=$('#jhJoinName').value.trim(), email=$('#jhJoinEmail').value.trim(), pw=$('#jhJoinPw').value, pw2=$('#jhJoinPw2').value;
  if(username.length<3)return msg('아이디는 영문/숫자/._-로 3자 이상 입력하세요.','err');
  if(!displayName)return msg('닉네임을 입력하세요.','err');
  if(pw.length<8)return msg('비밀번호는 8자 이상이어야 합니다.','err');
  if(pw!==pw2)return msg('비밀번호 확인이 일치하지 않습니다.','err');
  if(!$('#jhAge14').checked)return msg('만 14세 이상 확인이 필요합니다.','err');
  if(!$('#jhPrivacy').checked)return msg('개인정보 수집·이용 동의가 필요합니다.','err');
  let cred;
  try{
    await setPersistence(auth,browserLocalPersistence);
    cred=await createUserWithEmailAndPassword(auth,email,pw);
    await updateProfile(cred.user,{displayName});
    const userRef=doc(db,'users',cred.user.uid), nameRef=doc(db,'usernames',username);
    await runTransaction(db,async tx=>{
      const nameSnap=await tx.get(nameRef); if(nameSnap.exists())throw new Error('USERNAME_TAKEN');
      tx.set(nameRef,{uid:cred.user.uid,createdAt:serverTimestamp()});
      tx.set(userRef,{username,displayName,email:cred.user.email,age14Plus:true,age14ConfirmedAt:serverTimestamp(),privacyVersion,privacyConsentAt:serverTimestamp(),role:'member',fullAccess:false,active:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastLoginAt:serverTimestamp()});
    });
    await sendEmailVerification(cred.user,{url:SITE_URL+'?emailVerified=1'});
    msg('가입 완료. 인증 메일을 보냈습니다. 메일의 인증 링크를 누른 뒤 이 사이트로 돌아오세요.','ok');
    setTab('profile'); await renderProfile();
  }catch(e){
    if(e?.message==='USERNAME_TAKEN'){
      try{if(cred?.user)await deleteUser(cred.user);}catch{}
      return msg('이미 사용 중인 아이디입니다.','err');
    }
    msg(friendlyAuthError(e),'err');
  }
}

async function login(){
  if(!configured)return msg('Firebase 프로젝트 설정값을 먼저 연결해야 합니다.','err');
  try{
    await setPersistence(auth,$('#jhRemember').checked?browserLocalPersistence:browserSessionPersistence);
    const c=await signInWithEmailAndPassword(auth,$('#jhLoginEmail').value.trim(),$('#jhLoginPw').value);
    await updateDoc(doc(db,'users',c.user.uid),{lastLoginAt:serverTimestamp(),updatedAt:serverTimestamp()}).catch(()=>{});
    await reload(c.user);
    await refreshTop(c.user); setTab('profile'); await renderProfile();
    msg(c.user.emailVerified?'로그인했습니다.':'로그인했습니다. 이메일 인증을 완료해야 Full Access를 사용할 수 있습니다.',c.user.emailVerified?'ok':'');
  }catch(e){msg(friendlyAuthError(e),'err');}
}

async function resetPw(){
  if(!configured)return msg('Firebase 프로젝트 설정값을 먼저 연결해야 합니다.','err');
  const email=$('#jhResetEmail').value.trim(); if(!email)return msg('이메일을 입력하세요.','err');
  try{await sendPasswordResetEmail(auth,email,{url:SITE_URL}); msg('비밀번호 재설정 메일을 보냈습니다. 스팸함도 확인하세요.','ok');}catch(e){msg(friendlyAuthError(e),'err');}
}
async function resendVerification(){try{await sendEmailVerification(auth.currentUser,{url:SITE_URL+'?emailVerified=1'});msg('인증 메일을 다시 보냈습니다.','ok');}catch(e){msg(friendlyAuthError(e),'err');}}
async function checkVerification(){try{await reload(auth.currentUser);await refreshTop(auth.currentUser);await renderProfile();msg(auth.currentUser.emailVerified?'이메일 인증이 확인됐습니다.':'아직 인증되지 않았습니다. 메일 링크를 먼저 눌러주세요.',auth.currentUser.emailVerified?'ok':'');}catch(e){msg(friendlyAuthError(e),'err');}}

async function unlockFull(){
  const user=auth.currentUser; if(!user)return openAuth('login');
  await reload(user); if(!user.emailVerified)return msg('이메일 인증을 먼저 완료하세요.','err');
  const code=$('#jhFullCode')?.value.trim(); if(!code)return msg('Full Access Code를 입력하세요.','err');
  try{
    const h=await sha256(code), ref=doc(db,'users',user.uid);
    await updateDoc(ref,{fullAccess:true,unlockCodeHash:h,updatedAt:serverTimestamp()});
    await updateDoc(ref,{unlockCodeHash:'',updatedAt:serverTimestamp()});
    currentProfile=await profileFor(user); await renderProfile(); msg('Full Access가 이 계정에 영구 등록되었습니다.','ok');
  }catch(e){msg('Access Code가 올바르지 않거나 비활성화되었습니다.','err');}
}

async function sendPrivacyRequest(){
  const user=auth.currentUser; if(!user)return;
  const text=$('#jhPrivacyRequest')?.value.trim(); if(!text)return msg('문의 내용을 입력하세요.','err');
  try{await addDoc(collection(db,'privacy_requests'),{uid:user.uid,email:user.email,message:text,status:'open',createdAt:serverTimestamp()}); $('#jhPrivacyRequest').value='';msg('개인정보 문의가 접수되었습니다.','ok');}catch(e){msg('문의 접수에 실패했습니다.','err');}
}

async function leaveAccount(){
  const user=auth.currentUser; if(!user)return;
  const pw=prompt('회원탈퇴를 위해 현재 비밀번호를 다시 입력하세요.'); if(!pw)return;
  if(!confirm('계정과 회원 프로필을 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속할까요?'))return;
  try{
    await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,pw));
    const p=await profileFor(user);
    if(p?.username)await deleteDoc(doc(db,'usernames',p.username)).catch(()=>{});
    await deleteDoc(doc(db,'users',user.uid)).catch(()=>{});
    await deleteUser(user);
    currentProfile=null;closeAuth();await refreshTop(null);alert('회원탈퇴가 완료되었습니다.');
  }catch(e){msg(friendlyAuthError(e),'err');}
}

async function renderProfile(){
  const box=$('#jhProfile'); if(!box)return;
  const user=auth?.currentUser;
  if(!user){setTab('login');return;}
  await reload(user).catch(()=>{}); currentProfile=await profileFor(user);
  if(currentProfile?.active===false){await signOut(auth);msg('정지된 계정입니다.','err');return;}
  const adminSnap=await getDoc(doc(db,'admins',user.uid)).catch(()=>null);
  const admin=!!(adminSnap?.exists?.() && adminSnap.data()?.active!==false);
  const full=!!currentProfile?.fullAccess || admin;
  box.innerHTML=`<div class="jh-profile-card">
    <div class="jh-profile-line"><span>아이디</span><b>${esc(currentProfile?.username||'-')}</b></div>
    <div class="jh-profile-line"><span>닉네임</span><b>${esc(currentProfile?.displayName||user.displayName||'-')}</b></div>
    <div class="jh-profile-line"><span>이메일</span><b>${esc(user.email||'-')}</b></div>
    <div class="jh-profile-line"><span>이메일 인증</span><b><span class="jh-pill ${user.emailVerified?'good':'warn'}">${user.emailVerified?'VERIFIED':'REQUIRED'}</span></b></div>
    <div class="jh-profile-line"><span>가입 연령</span><b>만 14세 이상 확인</b></div>
    <div class="jh-profile-line"><span>권한</span><b>${admin?'ADMIN':full?'FULL ACCESS':'MEMBER'}</b></div>
  </div>
  ${!user.emailVerified?`<div class="jh-auth-actions"><button class="ghost" id="jhResendVerify">인증 메일 재발송</button><button class="ghost" id="jhCheckVerify">인증 확인</button></div>`:''}
  ${user.emailVerified&&!full&&!admin?`<div class="jh-auth-row"><label>FULL ACCESS CODE<input id="jhFullCode" type="password" placeholder="지인용 Access Code"></label></div><button class="primary" style="width:100%;margin-top:9px" id="jhUnlockFull">FULL ACCESS 등록</button>`:''}
  <div class="jh-auth-row"><label>개인정보 문의<textarea id="jhPrivacyRequest" style="width:100%;min-height:70px;border:1px solid #284961;background:#06101a;color:#fff;border-radius:8px;padding:10px" placeholder="열람·정정·삭제 관련 문의"></textarea></label></div>
  <div class="jh-auth-actions"><button class="ghost" id="jhPrivacySend">문의 접수</button><button class="ghost" id="jhLogout">LOGOUT</button>${admin?'<a class="ghost" style="text-decoration:none;text-align:center" href="./admin.html">ADMIN</a>':''}</div>
  <button class="ghost jh-danger" style="width:100%;margin-top:10px" id="jhLeave">회원탈퇴</button>`;
  $('#jhResendVerify')?.addEventListener('click',resendVerification); $('#jhCheckVerify')?.addEventListener('click',checkVerification); $('#jhUnlockFull')?.addEventListener('click',unlockFull); $('#jhPrivacySend')?.addEventListener('click',sendPrivacyRequest); $('#jhLogout')?.addEventListener('click',async()=>{await signOut(auth);closeAuth();}); $('#jhLeave')?.addEventListener('click',leaveAccount);
}

function bindUI(){
  addStyles(); modal();
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.authTab)));
  $('#jhAuthClose')?.addEventListener('click',closeAuth); $('#jhLoginGo')?.addEventListener('click',login); $('#jhJoinGo')?.addEventListener('click',signup); $('#jhResetGo')?.addEventListener('click',resetPw);
  $('#loginBtn')?.addEventListener('click',()=>openAuth());
  window.JH_openAuth=openAuth;
  window.openAuth=()=>openAuth(auth?.currentUser?'profile':'login');
  document.addEventListener('click',e=>{if(e.target?.id==='fullBtn')setTimeout(()=>openAuth(auth?.currentUser?'profile':'login'),0);},true);
  const footer=document.querySelector('footer'); if(footer&&!document.querySelector('#jhPrivacyFooter')){const a=document.createElement('span');a.id='jhPrivacyFooter';a.innerHTML=' · <a href="./privacy.html" style="color:#8fb4c8">개인정보처리방침</a> · <a href="./terms.html" style="color:#8fb4c8">이용약관/14세 이상</a>';footer.appendChild(a);}
}

bindUI();
if(configured){
  try{
    app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app);
    onAuthStateChanged(auth,async user=>{await refreshTop(user); if(user&&location.search.includes('emailVerified=1')){await reload(user).catch(()=>{});await refreshTop(user);}});
  }catch(e){msg('Firebase 초기화 실패: '+friendlyAuthError(e),'err');}
}
