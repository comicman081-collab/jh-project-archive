(()=>{
  'use strict';
  if(typeof P==='undefined'||typeof render!=='function') return;

  const E=[
    {id:'cozy-english-365',title:'Cozy English 365',type:'education',label:'EDUCATION',status:'WEB',cls:'rel',ver:'v3.2',sub:'English · 900 Lessons',desc:'초급·중급·고급 각각 300일, 총 900개 수업으로 구성한 통합 영어 학습 앱. 단어·숙어·문법·대화·읽기·듣기·작문·쉐도잉·복습을 한 흐름으로 학습합니다.',liveThumb:true,url:'./apps/cozy-english/',note:'기존 Android APK의 실제 웹 자산을 복원해 GitHub Pages용 브라우저 버전으로 배포. 3레벨 × 300일, 총 900개 수업 콘텐츠 엔진 유지.'},
    {id:'cozy-japanese-365',title:'Cozy Japanese 365',type:'education',label:'EDUCATION',status:'WEB',cls:'rel',ver:'v19',sub:'Japanese · Learning · Character',desc:'일본어 일일 학습, 복습, 캐릭터 코디와 학습 보상을 결합한 언어 학습 앱. 후리가나와 일본어 TTS를 지원하고 웹에서는 한국어 캐릭터 음성을 브라우저 TTS로 대체합니다.',liveThumb:true,url:'./apps/cozy-japanese/',note:'실기기 Android 하단 내비게이션 안전영역까지 조정한 v19 기반 웹 배포본. 로컬 APK 전용 한국어 음성은 웹 환경에서 브라우저 한국어 TTS fallback을 사용.'},
    {id:'starlight-math-garden',title:'별빛 수학 정원',type:'education',label:'EDUCATION',status:'NETLIFY',cls:'rel',ver:'PWA',sub:'Elementary Math · PWA',desc:'초등 수학 학습을 주차별·일차별 흐름으로 구성한 PWA 학습 프로젝트. 웹에서 진도 저장과 홈 화면 설치를 지원합니다.',liveThumb:true,url:'https://astonishing-cactus-a64fc5.netlify.app/',note:'Netlify 공개 배포본. astonishing-cactus-a64fc5 = 별빛 수학 정원.'},
    {id:'little-atelier',title:'Little Atelier',type:'education',label:'EDUCATION',status:'NETLIFY',cls:'rel',ver:'Web',sub:'Creative Learning · Drawing',desc:'그리기와 창작 활동을 중심으로 구성한 어린이용 크리에이티브 학습 웹 프로젝트.',liveThumb:true,url:'https://leafy-vacherin-6566d2.netlify.app/',note:'Netlify 공개 배포본. leafy-vacherin-6566d2 = Little Atelier.'}
  ];

  for(const e of E) if(!P.some(x=>x.id===e.id)) P.push(e);

  const filters=document.querySelector('.filters');
  if(filters&&!filters.querySelector('[data-filter="education"]')){
    const b=document.createElement('button');
    b.className='filter';
    b.dataset.filter='education';
    b.textContent='EDUCATION';
    b.onclick=()=>{
      document.querySelectorAll('.filter').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      render('education');
    };
    filters.appendChild(b);
  }

  const nav=document.querySelector('.nav');
  if(nav&&!nav.querySelector('[data-nav="education"]')){
    const about=nav.querySelector('[data-nav="about"]');
    const b=document.createElement('button');
    b.dataset.nav='education';
    b.textContent='EDUCATION';
    b.onclick=()=>{
      document.querySelectorAll('[data-nav]').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      const lib=document.querySelector('#library');
      const hero=document.querySelector('.hero');
      const aboutSection=document.querySelector('#about');
      if(lib) lib.style.display='block';
      if(hero) hero.style.display='grid';
      if(aboutSection) aboutSection.classList.remove('on');
      render('education');
    };
    nav.insertBefore(b,about||null);
  }

  render('all');
})();
