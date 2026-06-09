(function(){
  const canvas=document.getElementById('matrixCanvas');
  if(canvas){
    const ctx=canvas.getContext('2d');
    let width,height,columns,drops;
    const chars='アァカサタナハマヤャラワガザダバパ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#<>/{}[]QUANTHEXA';
    function resize(){width=canvas.width=innerWidth;height=canvas.height=innerHeight;columns=Math.floor(width/18);drops=Array(columns).fill(0).map(()=>Math.random()*height/18)}
    resize(); addEventListener('resize',resize);
    function draw(){
      ctx.fillStyle='rgba(1,3,2,.055)';ctx.fillRect(0,0,width,height);
      ctx.font='16px ui-monospace, monospace';
      for(let i=0;i<drops.length;i++){
        const text=chars[Math.floor(Math.random()*chars.length)];
        const x=i*18,y=drops[i]*18;
        ctx.fillStyle=Math.random()>.985?'rgba(122,182,69,.22)':'rgba(29,143,82,.10)';
        ctx.fillText(text,x,y);
        if(y>height&&Math.random()>.975)drops[i]=0;
        drops[i]+=0.145+Math.random()*0.075;
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  const qxPreloader=document.getElementById('qx-preloader');
  if(qxPreloader){
    let alreadyLoaded=false;
    try{alreadyLoaded=localStorage.getItem('qxPreloaderShown')==='true';}catch(e){}
    if(alreadyLoaded){
      qxPreloader.remove();
    }else{
      try{localStorage.setItem('qxPreloaderShown','true');}catch(e){}
      const hidePreloader=()=>setTimeout(()=>qxPreloader.classList.add('is-hidden'),420);
      if(document.readyState==='complete') hidePreloader();
      else window.addEventListener('load',hidePreloader,{once:true});
    }
  }


  const finePointer=window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if(finePointer && !document.querySelector('.qx-cursor')){
    const cursor=document.createElement('div');
    cursor.className='qx-cursor is-hidden';
    document.body.appendChild(cursor);
    let x=window.innerWidth/2,y=window.innerHeight/2,tx=x,ty=y;
    const move=()=>{x+=(tx-x)*0.26;y+=(ty-y)*0.26;cursor.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;requestAnimationFrame(move);};
    move();
    window.addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;cursor.classList.remove('is-hidden');},{passive:true});
    window.addEventListener('mouseleave',()=>cursor.classList.add('is-hidden'));
    window.addEventListener('mouseenter',()=>cursor.classList.remove('is-hidden'));
    document.querySelectorAll('a,button,input,textarea,select,label,[data-service]').forEach(el=>{
      el.addEventListener('mouseenter',()=>cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave',()=>cursor.classList.remove('is-hover'));
    });
  }


  // Retro neon UI sounds: generated in browser, no external audio files.
  const qxSound=(()=>{
    let ctx=null,lastHover=0,enabled=true;
    const getCtx=()=>{
      if(!enabled) return null;
      if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
      if(ctx.state==='suspended') ctx.resume();
      return ctx;
    };
    const env=(audio,vol=0.035)=>{
      const gain=audio.createGain();
      gain.gain.setValueAtTime(0.0001,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol,audio.currentTime+0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+0.16);
      gain.connect(audio.destination);
      return gain;
    };
    const tone=(freq,duration,type='triangle',vol=0.035,slide=0)=>{
      const audio=getCtx(); if(!audio) return;
      const osc=audio.createOscillator();
      const gain=env(audio,vol);
      osc.type=type;
      osc.frequency.setValueAtTime(freq,audio.currentTime);
      if(slide) osc.frequency.exponentialRampToValueAtTime(freq+slide,audio.currentTime+duration);
      osc.connect(gain);
      osc.start();
      osc.stop(audio.currentTime+duration);
    };
    const hover=()=>{
      const now=performance.now();
      if(now-lastHover<90) return;
      lastHover=now;
      tone(520,0.09,'sine',0.018,42);
      setTimeout(()=>tone(780,0.065,'triangle',0.012,20),18);
    };
    const click=()=>{
      tone(260,0.075,'triangle',0.03,90);
      setTimeout(()=>tone(420,0.10,'sine',0.028,160),42);
      setTimeout(()=>tone(840,0.055,'triangle',0.014,-80),82);
    };
    const softClick=()=>{
      tone(340,0.055,'triangle',0.018,60);
      setTimeout(()=>tone(610,0.05,'sine',0.012,45),32);
    };
    return {hover,click,softClick};
  })();

  const qxSoundHoverSelector='.card,.visual-card,.home-visual-card,.home-feature,.service-lux,.metric-card,.stat,.panel,.terminal,.btn,.navlinks a,.footer-links a';
  document.querySelectorAll(qxSoundHoverSelector).forEach(el=>{
    el.addEventListener('mouseenter',()=>qxSound.hover(),{passive:true});
  });
  document.querySelectorAll('button,.btn,a[data-service],[data-service],input[type="submit"],select').forEach(el=>{
    el.addEventListener('click',()=>qxSound.click(),{passive:true});
  });
  document.querySelectorAll('input,textarea,select').forEach(el=>{
    el.addEventListener('focus',()=>qxSound.softClick(),{passive:true});
  });

  const hamb=document.querySelector('.hamb');
  hamb&&hamb.addEventListener('click',()=>document.body.classList.toggle('mobile-open'));
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
  document.querySelectorAll('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{localStorage.setItem('service',btn.dataset.service);location.href='request.html'}));
  const chosen=document.getElementById('chosenService');
  if(chosen&&localStorage.getItem('service')) chosen.value=localStorage.getItem('service');
  const form=document.getElementById('requestForm');
  if(form){form.addEventListener('submit',e=>{e.preventDefault();document.querySelector('.success').classList.add('show');form.reset();scrollTo({top:0,behavior:'smooth'});});}
})();
