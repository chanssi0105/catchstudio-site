/* Explicit image regions share one dwell/transition clock with their captions. */
(() => {
  'use strict';
  const page=document.querySelector('.tc-page');
  if(!page) return;
  const $=(s,root=page)=>root.querySelector(s), $$=(s,root=page)=>[...root.querySelectorAll(s)];
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v)), lerp=(a,b,t)=>a+(b-a)*t, ease=t=>t*t*(3-2*t);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width: 768px)');
  const compare=$('[data-tc-compare]'),web=$('[data-tc-web]'),browser=$('.tc-browser'),viewport=$('.tc-browser__viewport'),webImage=$('.tc-browser__image');
  const highlight=$('.tc-webHighlight'),callouts=$$('[data-tc-callout]'),regions=callouts.map(el=>el.dataset.region.split(',').map(Number)),regionsM=callouts.map(el=>(el.dataset.regionM||el.dataset.region).split(',').map(Number)),reg=i=>(mobile.matches?regionsM:regions)[i];
  const process=$('[data-tc-process]'),fan=$$('[data-tc-fan]'),steps=$$('[data-tc-step]'),applications=$$('[data-tc-application]');
  const morph=$('[data-tc-morph]'),morphCanvas=$('.tc-morphCanvas'),morphRig=$('.tc-morphRig'),morphImages=$$('[data-tc-morph-image]'),morphRatio=$('.tc-morphRatio'),morphOrigin=$('.tc-morphOrigin');
  const morphRatios=[2400/1438,2400/710,700/329,2400/1260],morphLabels=['1.7 : 1','3.4 : 1','2.1 : 1','1.9 : 1'];
  const regLeft=$('.tc-registerImage'),confirm=$('.tc-confirmImage'),buttons=$('.tc-buttons');
  const mail=$('[data-tc-mail]'),track=$('.tc-mailTrack'),cards=$$('.tc-mailCard'),timeline=$('.tc-timeline'),dots=$$('.tc-timeline li');
  const mock=$('[data-tc-mobile]'),mockScene=$('[data-tc-mobile-trigger]'),completion=$('[data-tc-completion]'),completionCard=$('.tc-completionCard');
  const nav=document.querySelector('.p-navSticky');
  let frame=0,vh=innerHeight,stride=532,fanStride=250,gutter=24,mailTravel=[],fanTravel=[],regTravel=0,manuallyCompared=false,drag=null,resizeTimer=0,lastScroll=0;
  const progress=el=>{const r=el.getBoundingClientRect();return clamp(-r.top/Math.max(1,r.height-vh));};
  const revealProgress=(el,start=.85)=>{
    const r=el.getBoundingClientRect();
    return clamp((vh*start-r.top)/Math.max(1,vh*(start-.5)+Math.min(r.height,vh)*.5));
  };
  const setWipe=value=>{
    const v=clamp(value,0,100);compare.style.setProperty('--wipe',`${v}%`);compare.setAttribute('aria-valuenow',String(Math.round(v)));
    $('.tc-compare__label--london').style.opacity=String(clamp(v/20));$('.tc-compare__label--seoul').style.opacity=String(clamp((100-v)/20));
  };
  const compareAt=x=>{const r=compare.getBoundingClientRect();manuallyCompared=true;setWipe((x-r.left)/r.width*100);};
  compare.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'){compareAt(e.clientX);return;}
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false};
  });
  compare.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'){compareAt(e.clientX);tick();return;}
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){drag.horizontal=true;compare.setPointerCapture(e.pointerId);}
    if(drag.horizontal)compareAt(e.clientX);
  });
  ['pointerup','pointercancel'].forEach(event=>compare.addEventListener(event,()=>{drag=null;}));
  // Implicit touch capture starts on the child image. Its bubbled loss during
  // transfer to the slider must not cancel the horizontal drag in progress.
  compare.addEventListener('lostpointercapture',e=>{if(e.target===compare)drag=null;});
  compare.addEventListener('keydown',e=>{
    const value=Number(compare.getAttribute('aria-valuenow')),next={ArrowLeft:value-5,ArrowRight:value+5,Home:0,End:100}[e.key];
    if(next===undefined)return;e.preventDefault();manuallyCompared=true;setWipe(next);
  });
  const measure=()=>{
    // Stable svh geometry; defer ResizeObserver measurements until scrolling settles.
    vh=page.classList.contains('tc-motion')?$('.tc-webStage').clientHeight:innerHeight;
    page.style.setProperty('--tc-nav-height',`${nav?nav.offsetHeight:0}px`);
    const chrome=timeline.offsetHeight+28+8+Math.max(...cards.map(c=>$('figcaption',c).offsetHeight));
    page.style.setProperty('--tc-mail-chrome',`${chrome}px`);
    stride=cards[1].offsetLeft-cards[0].offsetLeft;
    mailTravel=cards.map(c=>Math.max(0,$('img',c).offsetHeight-$('.tc-mailCard__viewport',c).clientHeight));
    fanTravel=fan.map(c=>Math.max(0,$('img',c).offsetHeight-c.clientHeight));
    regTravel=Math.max(0,$('img',regLeft).offsetHeight-regLeft.clientHeight);
    gutter=parseFloat(getComputedStyle($('.tc-head')).paddingLeft);
    const angles=[-9,-3,3,8],width=$('.tc-fan').clientWidth;
    const halves=fan.map((el,i)=>(el.offsetWidth*Math.abs(Math.cos(angles[i]*Math.PI/180))+el.offsetHeight*Math.abs(Math.sin(angles[i]*Math.PI/180)))*.52);
    fanStride=Math.min(280,width*.175);
    halves.forEach((a,i)=>halves.forEach((b,j)=>{if(j>i)fanStride=Math.min(fanStride,(width-2*gutter-a-b-4)/(j-i));}));fanStride=Math.max(0,fanStride);
  };
  const WEB_DWELL=.6;
  const clock=(p,count,dwell)=>{
    const slot=Math.min(count-1e-7,p*count),index=Math.floor(slot),local=slot-index;
    return {index,local,moving:local>=dwell&&index<count-1,t:ease(clamp((local-dwell)/(1-dwell)))};
  };
  const webPose=(i,local)=>{
    const [x,y,w,h]=reg(i),W=viewport.clientWidth,H=viewport.clientHeight,scale=mobile.matches?W/w:W/1920;
    const X=mobile.matches?-x*scale:0,scaledH=h*scale;
    const Y=scaledH>H?-y*scale-(scaledH-H)*clamp(local/WEB_DWELL):H/2-(y+h/2)*scale;
    return {x:X,y:clamp(Y,Math.min(0,H-5635*scale),0),scale};
  };
  const update=()=>{
    frame=0;if(reduce.matches)return;
    const cr=compare.getBoundingClientRect();
    if(cr.bottom<=0||cr.top>=vh)manuallyCompared=false;
    else if(!manuallyCompared)setWipe((1-revealProgress(compare,.75))*100);
    const ar=morph.getBoundingClientRect();
    if(ar.top<vh&&ar.bottom>0){
      // The clock starts only once this scene reaches its sticky position.
      const c=clock(progress(morph),4,.55),next=Math.min(3,c.index+1),available=morphCanvas.clientWidth;
      const pose=i=>{
        const wanted=mobile.matches?available:[Math.min(innerWidth*.5,640),1200,560,760][i];
        const width=Math.min(wanted,available,morphCanvas.clientHeight*morphRatios[i]);
        return {width,height:width/morphRatios[i]};
      };
      const from=pose(c.index),to=pose(next),t=c.moving?c.t:0;
      morphRig.style.width=`${lerp(from.width,to.width,t)}px`;morphRig.style.height=`${lerp(from.height,to.height,t)}px`;
      morphImages.forEach((el,i)=>{
        const opacity=i===c.index?1-t:i===next&&c.moving?t:0;
        el.style.opacity=String(opacity);el.style.transform=`scale(${i===next&&c.moving?1.025-.025*t:1})`;
      });
      morphRatio.textContent=morphLabels[c.index];morphRatio.style.opacity=c.moving?'0':'1';
      morphOrigin.classList.toggle('is-active',c.index===0&&!c.moving);
      applications.forEach((el,i)=>el.classList.toggle('is-active',i+1===c.index&&!c.moving));
      $$('.tc-morphDots li').forEach((el,i)=>el.classList.toggle('is-active',i===c.index));
      morph.dataset.index=String(c.index);morph.dataset.phase=c.moving?'transition':'dwell';
    }
    const wr=web.getBoundingClientRect();
    if(wr.top<vh&&wr.bottom>0){
      const p=progress(web),c=clock(p,5,WEB_DWELL),pose=webPose(c.index,c.local),next=webPose(Math.min(4,c.index+1),0);
      let {x,y,scale}=pose;
      if(c.moving){
        x=lerp(x,next.x,c.t);y=lerp(y,next.y,c.t);scale=lerp(scale,next.scale,c.t);
        if(mobile.matches){const zoom=1-.12*Math.sin(c.t*Math.PI);x=viewport.clientWidth/2+(x-viewport.clientWidth/2)*zoom;y=viewport.clientHeight/2+(y-viewport.clientHeight/2)*zoom;scale*=zoom;}
      }
      const base=viewport.clientWidth/1920;
      webImage.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale/base})`;
      const r=browser.getBoundingClientRect(),visible=clamp((vh-r.top)/Math.max(1,r.height)),entry=clamp((visible-.15)/.45);
      browser.style.transform=`rotateX(${18*(1-entry)}deg)`;
      const [rx,ry,rw,rh]=reg(c.index);highlight.classList.toggle('is-active',!c.moving);
      const pop=1+.035*(1-clamp(c.local/.07));
      Object.assign(highlight.style,{left:`${x+rx*scale}px`,top:`${y+ry*scale}px`,width:`${rw*scale}px`,height:`${rh*scale}px`,transform:`scale(${pop})`});
      callouts.forEach((el,i)=>{
        el.classList.toggle('is-active',i===c.index&&!c.moving);
        if(!mobile.matches&&i===c.index){
          const stage=$('.tc-webStage').getBoundingClientRect(),vr=viewport.getBoundingClientRect(),targetY=vr.top-stage.top+clamp(y+(ry+rh/2)*scale,24,viewport.clientHeight-24);
          const top=clamp(targetY-el.offsetHeight/2,65,vh-(nav?nav.offsetHeight:70)-el.offsetHeight-24);el.style.setProperty('--callout-y',`${top}px`);
          const left=i%2===0,fromX=left?el.offsetLeft+el.offsetWidth:el.offsetLeft,toX=vr.left-stage.left+x+(left?rx:rx+rw)*scale,dx=toX-fromX,dy=targetY-(top+el.offsetHeight/2);
          el.style.setProperty('--connector-w',`${Math.hypot(dx,dy)}px`);el.style.setProperty('--connector-angle',`${Math.atan2(dy,dx)*180/Math.PI}deg`);
        }
      });
      $$('.tc-webDots li').forEach((el,i)=>el.classList.toggle('is-active',i===c.index));web.dataset.index=String(c.index);web.dataset.phase=c.moving?'transition':'dwell';
    }
    const pr=process.getBoundingClientRect();
    if(pr.top<vh&&pr.bottom>0){
      if(mobile.matches){
        const c=clock(progress(process),4,.72);
        fan.forEach((el,i)=>{
          const coming=i===c.index+1&&c.moving,past=i<c.index,previous=i===c.index-1,covered=past?1:i===c.index&&c.moving?c.t:0;
          const x=coming?110*(1-c.t):past?-16:i===c.index?-16*covered:110,angle=coming?6*(1-c.t):-4*covered;
          el.style.visibility=i===c.index||previous||coming?'visible':'hidden';
          el.style.opacity=String(previous&&c.moving?1-c.t:1);
          el.style.transform=`translateX(${x}%) scale(${1-.1*covered}) rotate(${angle}deg)`;el.style.filter=`brightness(${1-.4*covered})`;el.style.zIndex=String(i+1);
          const inside=past?1:i===c.index?clamp(c.local/.72):0;$('img',el).style.transform=`translateY(${-fanTravel[i]*inside}px)`;
          el.style.borderColor=i===3&&c.index===3?'#e01a33':'transparent';
        });
        steps.forEach((el,i)=>{
          const current=i===c.index,incoming=i===c.index+1&&c.moving;
          el.classList.toggle('is-active',current);
          el.style.opacity=String(current?(c.moving?clamp(1-c.t*2):1):incoming?clamp((c.t-.5)*2):0);
          el.style.transform=`translateX(${current?(c.moving?-16*c.t:0):incoming?110*(1-c.t):110}%)`;
        });process.dataset.index=String(c.index);process.dataset.phase=c.moving?'transition':'dwell';
      }else{
        const p=revealProgress($('.tc-fan')),poses=fan.map((el,i)=>{
          const local=clamp((p-i*.06)/.82),angle=[-9,-3,3,8][i]*local,x=(i-1.5)*fanStride*local;
          const half=(el.offsetWidth*Math.abs(Math.cos(angle*Math.PI/180))+el.offsetHeight*Math.abs(Math.sin(angle*Math.PI/180)))/2;return {x,angle,half};
        });
        const center=(Math.min(...poses.map(p=>p.x-p.half))+Math.max(...poses.map(p=>p.x+p.half)))/2;
        fan.forEach((el,i)=>{const pose=poses[i];el.style.transform=`translate(-50%,-50%) translateX(${pose.x-center}px) rotate(${pose.angle}deg)`;el.style.borderColor=i===3&&p>.95?'#e01a33':'transparent';steps[i].classList.toggle('is-active',p>i*.2);});process.dataset.reveal=String(p);
      }
    }
    const regP=revealProgress(regLeft,.85);
    if(mobile.matches){const r=regLeft.getBoundingClientRect(),pan=clamp((vh*.75-r.top)/Math.max(1,r.height+vh*.25));$('img',regLeft).style.transform=`translateY(${-regTravel*pan}px)`;confirm.style.transform=`translateY(${65*(1-revealProgress(confirm))}px)`;}
    else{regLeft.style.transform=`translateY(${55*(1-regP)}px)`;confirm.style.transform=`translateY(${45*(1-revealProgress(confirm))}px)`;}
    const mr=mail.getBoundingClientRect();
    if(mr.top<vh&&mr.bottom>0){
      const c=clock(progress(mail),6,.7),travel=c.index+(c.moving?c.t:0),entry=clamp((vh*.85-$('.tc-mailStage').getBoundingClientRect().top)/(vh*.85));
      mail.dataset.reveal=String(entry);track.style.transform=`translate3d(${-travel*stride}px,0,0)`;timeline.style.setProperty('--mail-progress',`${travel/5*100}%`);
      dots.forEach((el,i)=>{el.classList.toggle('is-active',i<=c.index);el.classList.toggle('is-current',i===Math.round(travel));});
      cards.forEach((el,i)=>{
        const distance=clamp(Math.abs(i-travel)),inside=i<c.index?1:i===c.index?clamp(c.local/.7):0;
        el.style.opacity=String((1-.7*distance)*entry);el.style.filter=`brightness(${1-.45*distance}) saturate(${1-.4*distance})`;el.style.transform=`translateY(${28*(1-entry)}px) scale(${(1-.1*distance)*(1-.04*(1-entry))})`;$('figcaption',el).style.opacity=String(1-.4*distance);$('img',el).style.transform=`translateY(${-mailTravel[i]*inside}px)`;
      });mail.dataset.index=String(c.index);
    }
    const mp=revealProgress(mockScene);mock.style.clipPath=`inset(0 ${50*(1-mp)}%)`;mock.dataset.reveal=String(mp);
    const cp=revealProgress(completion);completion.style.paddingLeft=completion.style.paddingRight=`${mobile.matches?0:gutter*(1-cp)}px`;completionCard.style.borderRadius=`${mobile.matches?0:20*(1-cp)}px`;$('img',completion).style.transform=`scale(${1.08-.08*cp})`;completion.dataset.reveal=String(cp);
  };
  function tick(){if(!frame)frame=requestAnimationFrame(update);}
  const visibility=new IntersectionObserver(entries=>entries.forEach(e=>{buttons.classList.toggle('is-visible',e.isIntersecting);if(e.isIntersecting)buttons.classList.add('is-in');}),{threshold:.25,rootMargin:'0px 0px -15% 0px'});visibility.observe(buttons);
  const entrance=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');entrance.unobserve(e.target);}}),{threshold:.25,rootMargin:'0px 0px -15% 0px'});
  $$('[data-tc-enter]').forEach(el=>entrance.observe(el));
  const applyMode=()=>{
    page.classList.toggle('tc-motion',!reduce.matches);
    [browser,webImage,highlight,...fan,...fan.map(el=>$('img',el)),...steps,regLeft,$('img',regLeft),confirm,track,timeline,...cards,...cards.map(el=>$('img',el)),...cards.map(el=>$('figcaption',el)),mock,completion,completionCard,$('img',completion),...morphImages,morphRatio].forEach(el=>{
      ['transform','filter','opacity','visibility','clip-path','border-color','z-index','padding-left','padding-right','border-radius','--mail-progress'].forEach(prop=>el.style.removeProperty(prop));
    });
    manuallyCompared=false;setWipe(reduce.matches?0:100);callouts.forEach(el=>el.classList.remove('is-active'));highlight.classList.remove('is-active');
    if(reduce.matches)$$('[data-reveal-title],[data-reveal-body],[data-tc-enter]').forEach(el=>el.classList.add('is-in','is-revealed'));
    measure();tick();
  };
  const scheduleMeasure=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(performance.now()-lastScroll<160){scheduleMeasure();return;}measure();tick();},180);};
  addEventListener('scroll',()=>{lastScroll=performance.now();tick();},{passive:true});addEventListener('resize',scheduleMeasure,{passive:true});addEventListener('pageshow',scheduleMeasure);
  reduce.addEventListener('change',applyMode);mobile.addEventListener('change',applyMode);
  if(document.fonts)document.fonts.ready.then(scheduleMeasure);$$('img').forEach(el=>el.addEventListener('load',scheduleMeasure,{once:true}));
  const sizes=new ResizeObserver(scheduleMeasure);[viewport,timeline,...cards,...fan,...(nav?[nav]:[])].forEach(el=>sizes.observe(el));applyMode();
})();
