(() => {
  'use strict';
  const page=document.querySelector('.mne-page');
  if(!page)return;
  const $=(s,r=page)=>r.querySelector(s), $$=(s,r=page)=>[...r.querySelectorAll(s)];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 768px)'),pointer=matchMedia('(hover: hover) and (pointer: fine)');
  const hero=document.querySelector('.mne-hero'),heroBG=$('.p-heroFx__bg',hero),heroTitle=$('.p-heroFx__title',hero);
  const scenes=$$('.mne-annotationScene'),board=$('.mne-phoneBoard');
  const devices=$$('.mne-floatingPhone').map(el=>({el,rig:$('.mne-phoneParallax',el),screen:$('.mne-floatScreen',el),long:$('.mne-floatLong',el),start:0,travel:0,elapsed:0}));
  let boardVisible=false,annotationObserver;
  const full=$('.mne-full'),browser=$('.mne-browserViewport'),fullImage=$('.mne-fullImage'),names=$$('.mne-sectionNames span');
  const phone=$('.mne-phoneViewport'),long=$('.mne-mobileLong'),form=$('.mne-form'),modal=$('.mne-modal'),contact=$('.mne-contactArt');
  const phoneLabel=$('.mne-mobileFull .mne-label');
  // Measured section starts in the stitched 780 x 16592 mobile screenshot.
  const phoneBounds=[0,1690,7632,12064,12838];
  const touch=matchMedia('(any-pointer: coarse)');
  const mobileClock=()=>({y:0,wait:.6,started:false,running:false});
  const phoneStage=$('.mne-mobileFull');
  devices.forEach(d=>d.clock=mobileClock());
  // Vertical visibility includes the intentionally cropped outer devices in scene 13.
  const exposure=el=>{const r=el.getBoundingClientRect();return r.height?clamp((Math.min(vh,r.bottom)-Math.max(0,r.top))/r.height):0;};
  const advancePhone=(state,el,screenHeight,travel,start,scale,dt)=>{
    const ratio=exposure(el);
    if(ratio<.5)state.running=false;
    if(ratio>=.8)state.running=true;
    if(!state.running||travel<=start)return false;
    state.started=true;
    let seconds=dt/1000;
    if(state.wait>0){const used=Math.min(seconds,state.wait);state.wait-=used;seconds-=used;}
    const from=start+state.y,to=Math.min(travel,from+seconds*screenHeight*.06);
    const boundary=phoneBounds.slice(1).map(y=>y*scale-screenHeight*.5).find(y=>y>from+.001&&y<=to);
    state.y=(boundary===undefined?to:boundary)-start;
    if(boundary!==undefined)state.wait=1.2;
    return start+state.y<travel;
  };
  const questions=$$('.mne-questions li'),moods=$$('.mne-mood'),metric=$$('.mne-metric')[1],sample=$('.mne-typeSample'),diagram=$('.mne-diagram'),lines=$$('.mne-structureLines i'),nodes=$$('.mne-final>div');
  const rows=$$('.mne-logoRow').map(el=>({el,track:$('.mne-logoTrack',el),width:0,offset:0,hover:false,visible:false,ready:false}));
  let frame=0,vh=innerHeight,timer=0,lastScroll=0,prevY=scrollY,lastTime=performance.now(),boost=0,px=0,py=0,geometry={fullTravel:0,phoneTravel:0},observer;
  const progress=el=>{const r=el.getBoundingClientRect();return clamp(-r.top/Math.max(1,r.height-vh));};
  const revealProgress=(el,start=.85)=>{const r=el.getBoundingClientRect();return clamp((vh*start-r.top)/Math.max(1,vh*(start-.5)));};
  const visible=el=>{const r=el.getBoundingClientRect();return r.top<vh&&r.bottom>0;};
  const request=()=>{if(reduce.matches){if(page.classList.contains('mne-motion'))applyMode();return;}if(!frame&&!document.hidden)frame=requestAnimationFrame(update);};
  const measure=()=>{
    vh=innerHeight;
    geometry.fullTravel=Math.max(0,fullImage.offsetHeight-browser.clientHeight);
    if(mobile.matches){
      const footer=document.querySelector('.p-navSticky');
      phoneStage.style.setProperty('--mne-pin-footer',`${footer?footer.getBoundingClientRect().height:0}px`);
    }else phoneStage.style.removeProperty('--mne-pin-footer');
    geometry.phoneTravel=Math.max(0,long.offsetHeight-phone.clientHeight);
    // Match the sticky runway to rendered screen travel: 1 scroll px = 1.5 image px.
    if(mobile.matches&&!reduce.matches){
      geometry.phoneRun=geometry.phoneTravel/1.5;
      full.style.height=`${phoneStage.offsetHeight+geometry.phoneRun}px`;
      geometry.phoneTop=parseFloat(getComputedStyle(phoneStage).top)||0;
    }else full.style.removeProperty('height');
    scenes.forEach(scene=>{
      const media=$('.mne-annotationMedia',scene),bottoms={left:0,right:0};
      if(mobile.matches){scene.style.removeProperty('min-height');$$('.mne-callout',scene).forEach(el=>el.style.removeProperty('top'));}
      else{
        $$('.mne-callout',scene).forEach(el=>{
          const side=el.classList.contains('mne-callout--right')?'right':'left';
          const top=Math.max(media.offsetHeight*parseFloat(el.style.getPropertyValue('--callout-y'))/100,bottoms[side]);
          el.style.top=`${top}px`;bottoms[side]=top+el.offsetHeight+16;
        });
        scene.style.minHeight=`${Math.max(media.offsetHeight,bottoms.left-16,bottoms.right-16)}px`;
      }
      const sr=scene.getBoundingClientRect();
      $$('.mne-callout',scene).forEach(el=>{
        const highlight=$$('.mne-webHighlight',scene)[+el.dataset.region],r=highlight.getBoundingClientRect(),right=el.classList.contains('mne-callout--right');
        const fromX=el.offsetLeft+(right?0:el.offsetWidth),fromY=el.offsetTop+el.offsetHeight/2;
        const dx=r.left-sr.left+(right?r.width:0)-fromX,dy=r.top-sr.top+r.height/2-fromY;
        el.style.setProperty('--connector-w',`${Math.hypot(dx,dy)}px`);
        el.style.setProperty('--connector-angle',`${Math.atan2(dy,dx)*180/Math.PI}deg`);
      });
    });
    devices.forEach(d=>{
      const scale=d.long.clientWidth/780;
      const oldTravel=d.travel,oldStart=d.start;
      d.travel=Math.max(0,d.long.offsetHeight-d.screen.clientHeight+d.screen.clientHeight*.0536);
      d.start=Math.min(d.travel,+d.el.dataset.start*scale);
      if(oldTravel>oldStart)d.clock.y*=(d.travel-d.start)/(oldTravel-oldStart);
      const y=mobile.matches?d.start+d.clock.y:Math.min(d.travel,d.start+d.elapsed*(2.5+Number(d.el.dataset.phone)*.25));
      d.long.style.transform=reduce.matches?'':`translateY(${-y}px)`;
      if(reduce.matches)d.long.style.top=`calc(5.36% - ${d.start}px)`;
      else d.long.style.removeProperty('top');
    });
    rows.forEach(row=>{
      if(!row.ready)return;
      const width=$('.mne-logoGroup',row.el).getBoundingClientRect().width;
      if(width>0){if(row.width>0)row.offset=row.offset/row.width*width;row.width=width;}
    });
    request();
  };
  const queueMeasure=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(performance.now()-lastScroll<160){queueMeasure();return;}measure();},180);};
  function update(time){
    frame=0;if(reduce.matches){applyMode();return;}if(document.hidden)return;
    const dt=Math.min(mobile.matches?32:64,Math.max(0,time-lastTime));lastTime=time;boost*=Math.exp(-dt/450);
    if(scrollY<vh*1.3){heroBG.style.transform=`translate3d(${px}px,${py}px,0)`;heroTitle.style.transform=`translateY(${scrollY*.35}px)`;}
    questions.forEach((el,i)=>{const p=revealProgress(el,.7);el.style.color=i===5?`rgba(233,23,78,${.25+.75*p})`:`rgb(${Math.round(lerp(207,30,p))},${Math.round(lerp(202,26,p))},${Math.round(lerp(204,27,p))})`;el.style.setProperty('--line-progress',p);});
    if(visible(diagram)){
      const p=revealProgress(diagram),draw=clamp(p*1.7);
      lines.forEach(el=>el.style.transform=`scaleY(${draw})`);
      nodes.forEach((el,i)=>{const t=clamp((p-.42-i*.035)/.3);el.style.opacity=t;el.style.transform=`translateY(${(1-t)*30}px)`;});
      $('.mne-aboutNode',diagram).style.backgroundColor=revealProgress(diagram)>.8?'#E9174E':'#1E1A1B';
    }
    if(visible(sample))sample.style.fontWeight=Math.round(lerp(400,700,revealProgress(sample)));
    moods.forEach((el,i)=>{if(visible(el))$('picture',el).style.transform=`translateY(${(revealProgress(el)*2-1)*(mobile.matches?30:60)*(i===1?-1:1)}px)`;});
    if(visible(metric)){const r=metric.getBoundingClientRect();metric.classList.toggle('is-active',r.top+r.height/2<vh*.55);}
    $$('.mne-metric').forEach((el,i)=>{if(visible(el))$('picture',el).style.transform=`translateY(${(1-revealProgress(el))*(i%2?18:-12)}px)`;});
    if(visible(contact)){
      const p=revealProgress(contact);form.style.transform=`rotate(${lerp(18,8,p)}deg) scale(${lerp(.94,1,p)})`;
      const m=clamp((p-.5)*2);modal.style.opacity=m;modal.style.transform=`translateY(${(1-m)*65}px) rotate(8deg)`;
    }
    if(mobile.matches){
        const r=full.getBoundingClientRect();
        const y=geometry.phoneTravel*clamp((geometry.phoneTop-r.top)/Math.max(1,geometry.phoneRun));
        long.style.transform=`translateY(${-y}px)`;
        // Map the visible screen center to original screenshot coordinates.
        const sourceY=(y+phone.clientHeight*.5)*780/Math.max(1,long.clientWidth);
        let active=0;phoneBounds.forEach((y,i)=>{if(sourceY>=y)active=i;});
        const label=names[active].textContent;if(phoneLabel.textContent!==label)phoneLabel.textContent=label;
    }else if(visible(full)){
        const p=progress(full);
        fullImage.style.transform=`translateY(${-geometry.fullTravel*p}px)`;
        const sourceY=(geometry.fullTravel*p+browser.clientHeight*.5)/(fullImage.offsetHeight||1)*5858;
        const bounds=[0,1080,2530,3940,4510];let active=0;bounds.forEach((y,i)=>{if(sourceY>=y)active=i;});
        names.forEach((el,i)=>el.classList.toggle('is-active',i===active));
    }
    if(!boardVisible&&mobile.matches)devices.forEach(d=>d.clock.running=false);
    if(boardVisible){
      const r=board.getBoundingClientRect(),p=clamp((vh-r.top)/(vh+r.height));
      devices.forEach((d,i)=>{
        if(getComputedStyle(d.el).display==='none')return;
        const amount=[40,-55,70,-90,65,-50,80][i];
        d.rig.style.transform=`translateY(${(p*2-1)*amount}px)`;
        if(mobile.matches){
          advancePhone(d.clock,d.rig,d.screen.clientHeight,d.travel,d.start,d.long.clientWidth/780,dt);
          d.long.style.transform=`translateY(${-d.start-d.clock.y}px)`;
        }else if(!document.hidden){d.elapsed+=dt/1000;const y=Math.min(d.travel,d.start+d.elapsed*(2.5+i*.25));d.long.style.transform=`translateY(${-y}px)`;}
      });
    }
    const closing=$('.mne-closing');if(visible(closing))$('picture',closing).style.transform=`scale(${1+revealProgress(closing)*.06})`;
    rows.forEach(row=>{
      if(!row.visible||row.hover||!row.width)return;
      row.offset=(row.offset+dt*row.width/40000*(1+(mobile.matches||touch.matches?0:boost)))%row.width;
      const x=row.el.dataset.direction==='1'?-row.offset:row.offset-row.width;
      row.track.style.transform=mobile.matches||touch.matches?`translate3d(${x}px,0,0)`:`translateX(${x}px)`;
    });
    if(boardVisible||rows.some(r=>r.visible&&!r.hover)||boost>.01)request();
  }
  new IntersectionObserver(entries=>{boardVisible=entries[0].isIntersecting;lastTime=performance.now();request();}).observe(board);
  const video=$('video');let videoVisible=false;
  const syncVideo=()=>{if(videoVisible&&!reduce.matches&&!document.hidden)video.play().catch(()=>{});else video.pause();};
  new IntersectionObserver(entries=>{videoVisible=entries[0].intersectionRatio>=.3;syncVideo();},{threshold:[0,.3]}).observe(video);
  const flowObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{const row=rows.find(r=>r.el===entry.target);if(row)row.visible=entry.isIntersecting;});request();});rows.forEach(row=>{
    flowObserver.observe(row.el);
    row.el.addEventListener('pointerenter',()=>{if(pointer.matches&&!mobile.matches)row.hover=true;});
    row.el.addEventListener('pointerleave',()=>{row.hover=false;request();});
  });
  rows.forEach(row=>{
    const images=$$('img',row.el);
    Promise.all(images.map(img=>img.decode().catch(()=>{}))).then(()=>{row.ready=true;measure();});
    new ResizeObserver(queueMeasure).observe($('.mne-logoGroup',row.el));
  });
  function applyMode(){
    cancelAnimationFrame(frame);frame=0;if(observer)observer.disconnect();if(annotationObserver)annotationObserver.disconnect();
    page.classList.toggle('mne-motion',!reduce.matches);hero.classList.toggle('is-motion',!reduce.matches);
    phoneLabel.textContent='HOME';
    if(reduce.matches){devices.forEach(d=>Object.assign(d.clock,mobileClock()));}
    // Remove only motion-owned properties; retain authored colors and stagger values.
    const props=['transform','opacity','filter','stroke-dashoffset','font-weight','color','background-color','--line-progress','visibility'];
    [heroBG,heroTitle,...devices.flatMap(d=>[d.rig,d.long]),...questions,...lines,...nodes,sample,...moods.map(e=>$('picture',e)),...$$('.mne-metric>picture'),form,modal,fullImage,long,$('.mne-closing>picture'),...rows.map(r=>r.track)].forEach(el=>{props.forEach(p=>el.style.removeProperty(p));});
    if(reduce.matches){$$('[data-mne-enter], [data-mne-open], .mne-words, .mne-phoneBoard').forEach(el=>el.classList.add('is-in'));}
    else{
      observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');observer.unobserve(e.target);}});},{rootMargin:'0px 0px -15% 0px',threshold:0});
      $$('[data-mne-enter], [data-mne-open], .mne-words, .mne-brand, .mne-phoneBoard').forEach(el=>{if(!el.classList.contains('is-in'))observer.observe(el);});
    }
    if(reduce.matches)scenes.forEach(scene=>scene.classList.add('is-annotated'));
    else{
      annotationObserver=new IntersectionObserver(entries=>entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add('is-annotated');annotationObserver.unobserve(e.target);}
      }),{rootMargin:'0px 0px -45% 0px',threshold:0});
      scenes.forEach(scene=>{if(!scene.classList.contains('is-annotated'))annotationObserver.observe(scene);});
    }
    rows.forEach(r=>{r.hover=false;});lastTime=performance.now();syncVideo();measure();
  }
  hero.addEventListener('pointermove',event=>{if(pointer.matches&&!mobile.matches&&!reduce.matches){px=(.5-event.clientX/innerWidth)*48;py=(.5-event.clientY/vh)*48;request();}});
  hero.addEventListener('pointerleave',()=>{px=0;py=0;request();});
  addEventListener('scroll',()=>{const now=performance.now();boost=mobile.matches||touch.matches?0:Math.min(4,boost+Math.abs(scrollY-prevY)/300);prevY=scrollY;lastScroll=now;request();queueMeasure();},{passive:true});
  addEventListener('resize',queueMeasure,{passive:true});
  reduce.addEventListener('change',applyMode);mobile.addEventListener('change',applyMode);
  document.addEventListener('visibilitychange',()=>{syncVideo();lastTime=performance.now();request();});
  $$('img').forEach(img=>{if(!img.complete)img.addEventListener('load',queueMeasure,{once:true});});
  if(document.fonts)document.fonts.ready.then(queueMeasure);
  $$('.mne-annotationMedia').forEach(el=>el.addEventListener('transitionend',queueMeasure));
  applyMode();
})();
