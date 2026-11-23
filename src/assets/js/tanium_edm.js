(() => {
  'use strict';
  const page=document.querySelector('.te-page');
  if(!page)return;
  const $=(s,r=page)=>r?r.querySelector(s):null, $$=(s,r=page)=>r?[...r.querySelectorAll(s)]:[];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 768px)');
  const assembly=$('[data-te-assemble]'),canvas=$('.te-assembleCanvas'),pieces=$$('.te-piece'),ends=$$('.te-endCaption');
  const manuscript=$('[data-te-manuscript]'),manCanvas=$('.te-manuscriptCanvas'),paper=$('.te-paper'),papers=$$('.te-paperBlock'),blocks=$$('.te-block'),svg=$('.te-connectors'),connections=$('g',svg);
  const reader=$('[data-te-reader]'),app=$('.te-app'),view=$('.te-readerViewport'),readerMail=$('.te-mail',view),highlight=$('.te-readerHighlight'),readerCards=$$('.te-readerCard'),cardsWrap=$('.te-readerCards'),dots=$$('.te-readerDots i');
  const band=$('.te-band'),bandTrack=$('.te-bandTrack'),wall=$('.te-wall'),nav=document.querySelector('.p-navSticky');
  if(!assembly||!canvas||!manuscript||!paper||!connections||!reader||!app||!view||!readerMail||!highlight||!cardsWrap||!band||!bandTrack||!wall)return;
  const pieceHeights=[914,541,594,226,380],starts=[[.22,.52,-2],[.5,.3,-1.5],[.78,.26,2.5],[.5,.67,1],[.78,.75,2]];
  const regions=[[0,480],[480,1110],[1180,1600],[1640,2960]];
  let frame=0,vh=innerHeight,navHeight=0,headerHeight=70,resizeTimer=0,lastScroll=0,prevY=scrollY,prevTime=performance.now(),boost=0,bandOffset=0,geometry={},wallCols=[],visibleBand=false,visibleWall=false,resizeObserver;
  const progress=el=>{const r=el.getBoundingClientRect(),top=mobile.matches?parseFloat(el.firstElementChild.style.getPropertyValue('--te-stage-top'))||0:0;return clamp((top-r.top)/Math.max(1,r.height-vh));};
  const revealProgress=(el,start=.85)=>{const r=el.getBoundingClientRect();return clamp((vh*start-r.top)/Math.max(1,vh*(start-.5)));};
  const clock=(p,count,dwell)=>{const slot=Math.min(count-1e-7,clamp(p)*count),index=Math.floor(slot),local=slot-index;return{index,local,moving:index<count-1&&local>=dwell,t:ease(clamp((local-dwell)/(1-dwell)))}};
  const visible=el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<vh;};
  const request=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const connector=(x,y,a,b)=>`M ${x} ${y} C ${(x+a)/2} ${y}, ${(x+a)/2} ${b}, ${a} ${b}`;
  const measure=()=>{
    vh=reduce.matches?innerHeight:assembly.clientHeight/2.6;
    navHeight=nav?nav.offsetHeight:0;
    headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||70;
    page.style.setProperty('--te-nav-height',`${navHeight}px`);
    const available=vh-headerHeight-navHeight;
    const sizeStage=(stage,height)=>{stage.style.setProperty('--te-stage-height',`${height}px`);stage.style.setProperty('--te-stage-top',`${Math.max(headerHeight,headerHeight+(available-height)/2)}px`);};
    if(mobile.matches&&!reduce.matches){
      sizeStage($('.te-assembleStage'),Math.min(available-16,Math.min(480,canvas.clientWidth-48)*914/700+48));
      const stage=$('.te-manuscriptStage');stage.classList.remove('te-fit-small','te-fit-short');
      stage.style.setProperty('--te-block-width','100%');
      const paperTop=$('.te-paperLabel').offsetTop+$('.te-paperLabel').offsetHeight+parseFloat(getComputedStyle($('.te-paperLabel')).marginBottom);
      stage.style.setProperty('--te-paper-content-top',`${paperTop}px`);
      const getSize=()=>{const ph=Math.max(...papers.map(e=>e.scrollHeight))+paperTop+20,bh=Math.max(...blocks.map(e=>e.offsetHeight));return {ph,bh,height:ph+50+bh};};
      let size=getSize();
      if(size.height>available-16){stage.classList.add('te-fit-small');size=getSize();}
      if(size.height>available-16){stage.style.setProperty('--te-block-width',`${Math.max(0,manCanvas.clientWidth-32)}px`);size=getSize();}
      if(size.height>available-16){stage.classList.add('te-fit-short');size=getSize();}
      paper.style.height=`${size.ph}px`;manCanvas.style.setProperty('--te-paper-height',`${size.ph}px`);papers.forEach(e=>e.dataset.fit='1');
      sizeStage(stage,size.height);
    }
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const finalW=Math.min(mobile.matches?210:270,(H-16)*700/2655,mobile.matches?W*.54:270),finalH=2655*finalW/700;
    geometry={W,H,finalW,finalH,top:Math.max(0,(H-finalH)/2),left:mobile.matches?24:(W-finalW)/2};
    page.style.setProperty('--te-final-width',`${finalW}px`);
    page.style.setProperty('--te-caption-width',`${Math.min(440,(W-finalW)/2-120)}px`);
    // Fit whole columns, including the measured, rotated captions.
    let initialW=Math.min(480,W-48),initialPositions=[];
    page.classList.remove('te-compactCaptions');
    if(!mobile.matches&&!reduce.matches){
      const columns=[[0],[1,3],[2,4]],shifts=[0,-H*.04,H*.02],gutter=parseFloat(getComputedStyle($('.te-readerStage')).paddingLeft),gap=Math.min(W*.04,16);
      const limit=Math.min(520,W*.27,(W-gap*2-2*gutter)/3);
      const layout=w=>{
        page.style.setProperty('--te-piece-caption-width',`${w}px`);
        const origin=canvas.getBoundingClientRect();
        const boxes=pieces.map((el,i)=>{
          el.style.width=`${w}px`;el.style.left='0px';el.style.top='0px';el.style.transform=`rotate(${starts[i][2]}deg)`;
          const image=$('img',el).getBoundingClientRect(),cap=$('figcaption',el).getBoundingClientRect();
          return {top:Math.min(image.top,cap.top)-origin.top,bottom:Math.max(image.bottom,cap.bottom)-origin.top,left:Math.min(image.left,cap.left)-origin.left,right:Math.max(image.right,cap.right)-origin.left};
        });
        const heights=columns.map(indices=>indices.reduce((sum,i)=>sum+boxes[i].bottom-boxes[i].top,0)+(indices.length-1)*28);
        const upper=Math.min(...heights.map((height,col)=>shifts[col]-height/2));
        const lower=Math.max(...heights.map((height,col)=>shifts[col]+height/2));
        const center=(H-upper-lower)/2,positions=[];
        columns.forEach((indices,col)=>{
          let y=center+shifts[col]-heights[col]/2;
          indices.forEach(i=>{positions[i]={x:(W-(3*w+2*gap))/2+col*(w+gap),y:y-boxes[i].top};y+=boxes[i].bottom-boxes[i].top+28;});
        });
        const left=Math.min(...boxes.map((b,i)=>b.left+positions[i].x)),right=Math.max(...boxes.map((b,i)=>b.right+positions[i].x));
        return {fits:lower-upper<=H-24&&left>=gutter+20&&right<=W-gutter-20,positions};
      };
      // Wrapping can remove a whole line as width grows, so the fit is not monotonic.
      const fit=()=>{
        for(let w=limit;w>0;w-=2){
          if(!layout(w).fits)continue;
          let low=w,high=Math.min(limit,w+2);
          for(let pass=0;pass<5;pass++){const mid=(low+high)/2;if(layout(mid).fits)low=mid;else high=mid;}
          return low;
        }
        return 0;
      };
      initialW=fit();
      if(initialW<300){page.classList.add('te-compactCaptions');initialW=fit();}
      initialPositions=layout(initialW).positions;
    }
    geometry.initialW=initialW;geometry.initialPositions=initialPositions;
    if(!mobile.matches){
      paper.style.height='';
      manCanvas.style.transform='';
      const available=$('.te-manuscriptStage').clientHeight-headerHeight-navHeight-48;
      const scale=reduce.matches?1:Math.min(1,available/manCanvas.offsetHeight);
      manCanvas.style.transform=`scale(${scale})`;
      const c=manCanvas.getBoundingClientRect();
      connections.replaceChildren();
      papers.forEach((el,i)=>{
        const a=el.getBoundingClientRect(),b=$('img',blocks[i]).getBoundingClientRect();
        const x=(a.right-c.left)/scale+8,y=(a.top+a.height/2-c.top)/scale,toX=(b.left-c.left)/scale-8,toY=(b.top+b.height/2-c.top)/scale;
        const group=document.createElementNS('http://www.w3.org/2000/svg','g');
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',connector(x,y,toX,toY));group.append(path);
        [[x,y],[toX,toY]].forEach(([cx,cy])=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);dot.setAttribute('r','4');group.append(dot)});
        connections.append(group);
      });
    }
    const twin=$('.te-twin'),cols=$$('.te-twinCol'),outside=(twin.clientWidth-(cols[0].clientWidth*2+parseFloat(getComputedStyle(twin).columnGap||40)))/2-40;
    twin.classList.toggle('te-twin--below',!mobile.matches&&outside<240);
    twin.style.setProperty('--te-twin-caption-width',`${clamp(outside-24,220,340)}px`);
    if(!mobile.matches&&!twin.classList.contains('te-twin--below')&&$$('.te-twinCaption p').some(el=>el.offsetHeight/parseFloat(getComputedStyle(el).lineHeight)>4.05))twin.classList.add('te-twin--below');
    cols.forEach(col=>$$('.te-twinCaption',col).forEach(cap=>cap.style.top=mobile.matches||twin.classList.contains('te-twin--below')?'':`${Number(cap.dataset.y)*col.clientWidth/700}px`));
    cardsWrap.style.removeProperty('--te-card-height');
    const cardHeight=Math.max(...readerCards.map(c=>c.scrollHeight));
    cardsWrap.style.setProperty('--te-card-height',`${cardHeight}px`);
    if(mobile.matches&&!reduce.matches){
      const appHeight=Math.min(650,available-cardHeight-32-16-16);
      $('.te-readerStage').style.setProperty('--te-app-height',`${appHeight}px`);
      sizeStage($('.te-readerStage'),appHeight+cardHeight+32+16);
    }
    wallCols=$$('.te-wallGrid--'+(mobile.matches?'mobile':'desktop')+' .te-wall__col').map(el=>({el,track:$('.te-wall__track',el),height:$('.te-wall__group',el).offsetHeight,offset:0,speed:Number(el.dataset.speed),down:el.classList.contains('is-down')}));
    request();
  };
  const assemble=p=>{
    const {W,H,finalW,finalH,top,left}=geometry;
    let y=0;
    pieces.forEach((el,i)=>{
      const endY=top+y*finalW/700,endH=pieceHeights[i]*finalW/700;
      let w,x,ty,angle;
      if(mobile.matches){
        const phase=clamp(p*4,0,4),active=Math.min(4,Math.floor(phase)+1),t=ease(clamp(phase-(i-1)));
        const shrink=ease(p),firstW=Math.min(480,W-48);
        w=lerp(firstW,finalW,shrink);
        const accumulated=pieceHeights.slice(0,active).reduce((a,b)=>a+b,0),focus=accumulated+pieceHeights[active]/2;
        const dynamicTop=lerp(H/2-pieceHeights[0]*w/1400,Math.min(0,H/2-focus*w/700),clamp(p*2));
        const columnTop=lerp(dynamicTop,top,ease(clamp((p-.7)/.3)));
        x=lerp((W-w)/2,left,shrink)+(i?lerp((i%2?1:-1)*(W+w),0,t):0);
        ty=columnTop+y*w/700;
        angle=i?lerp(i%2?6:-6,0,t):0;
        el.style.opacity=String(i&&p<(i-1)/4?0:1);
      }else{
        const t=ease(clamp((p-i*.04)/(.75-i*.04))),initialW=geometry.initialW,s=starts[i];
        const initial=geometry.initialPositions[i]||{x:left,y:endY};
        w=lerp(initialW,finalW,t);x=lerp(initial.x,left,t);ty=lerp(initial.y,endY,t);angle=lerp(s[2],0,t);el.style.opacity='1';
      }
      el.style.width=`${w}px`;el.style.left=`${x}px`;el.style.top=`${ty}px`;el.style.transform=`rotate(${angle}deg)`;
      $('figcaption',el).style.opacity=String(1-clamp((p-.15)/.3));
      const cap=ends[i],odd=i%2===0;
      cap.style.opacity=String(clamp((p-.72)/.13));cap.style.top=`${endY+endH/2}px`;cap.style.transform='translateY(-50%)';
      cap.style.textAlign=mobile.matches?'left':odd?'right':'left';
      cap.style.left=mobile.matches?`${left+finalW+20}px`:odd?'auto':`${left+finalW+72}px`;
      cap.style.right=!mobile.matches&&odd?`${W-left+72}px`:'auto';
      cap.classList.toggle('is-left',odd);y+=pieceHeights[i];
    });
    const label=$('.te-mobilePieceLabel');
    if(mobile.matches){const index=Math.min(4,Math.floor(p*4+.5));$$('span',label).forEach((el,i)=>el.classList.toggle('is-current',i===index));label.style.opacity=String(1-clamp((p-.75)/.1));}
  };
  const manuscriptPose=p=>{
    const state=clock(p,3,.8);
    papers.forEach((el,i)=>{
      const t=ease(clamp((p-i/3)/.2));
      el.style.backgroundSize=`${t*100}% 100%`;
      const cross=state.moving?state.t:0;
      const visibility=i===state.index?1-cross:i===state.index+1?cross:0;
      if(mobile.matches&&!reduce.matches){el.style.backgroundSize=`${(i===0?clamp(p/.2):1)*100}% 100%`;el.style.opacity=String(visibility);el.style.transform=`translateY(${i===state.index?-cross*16:(1-cross)*16}px) scale(${Number(el.dataset.fit)||1})`;el.style.pointerEvents=visibility>.5?'':'none';}
      else{el.style.opacity='1';el.style.transform='';}
      const b=blocks[i];
      const show=mobile.matches&&!reduce.matches?visibility*(i===0?clamp(p/.2):1):t;
      b.style.opacity=String(show);b.style.transform=`translateX(${(1-t)*24}px) scale(${lerp(.94,1,t)})`;
      if(connections.children[i]){
        const group=connections.children[i],path=$('path',group);
        group.style.opacity=String(t);
        path.style.strokeDashoffset=String((1-t)*100);
        group.style.clipPath=`inset(0 ${(1-t)*100}% 0 0)`;
      }
    });
  };
  const readerPose=(i,local)=>{
    const [y,end]=regions[i],scale=readerMail.clientWidth/700,H=view.clientHeight,pad=mobile.matches?8:32;
    const height=(end-y)*scale;
    const scan=clamp(local/.7),offset=y*scale+Math.max(0,height-(H-2*pad))*scan;
    return {offset,top:pad,height:Math.min(height,H-2*pad),scale};
  };
  const read=p=>{
    const state=clock(p,4,.7),a=readerPose(state.index,state.local),b=readerPose(Math.min(3,state.index+1),0),t=state.moving?state.t:0;
    const offset=lerp(a.offset,b.offset,t),top=lerp(a.top,b.top,t),h=lerp(a.height,b.height,t);
    const zoom=mobile.matches&&!reduce.matches?lerp(1,1/1.15,state.moving?Math.sin(t*Math.PI):0):1;
    readerMail.style.transform=`translateY(${-offset*zoom}px) scale(${zoom})`;
    const mailLeft=readerMail.offsetLeft+(readerMail.clientWidth*(1-zoom))/2;
    highlight.style.left=`${mailLeft+(mobile.matches?1:-3)}px`;highlight.style.width=`${readerMail.clientWidth*zoom+(mobile.matches?-2:6)}px`;highlight.style.top=`${top}px`;highlight.style.height=`${h*zoom}px`;highlight.style.opacity=state.moving?'0':'1';highlight.style.transform='';
    readerCards.forEach((c,i)=>{c.style.opacity=i===state.index?(state.moving?'.35':'1'):'0';c.style.pointerEvents=i===state.index?'auto':'none';c.setAttribute('aria-hidden',String(i!==state.index));});
    dots.forEach((d,i)=>d.classList.toggle('is-current',i===state.index));
    if(!mobile.matches){const cardH=Number.parseFloat(cardsWrap.style.getPropertyValue('--te-card-height'))||150;const center=app.offsetTop+$('.te-appBar').offsetHeight+$('.te-readingHead').offsetHeight+top+h/2;const target=clamp(center-cardH/2,headerHeight+24,vh-navHeight-cardH-60);cardsWrap.style.transform=`translateY(${target-cardsWrap.offsetTop}px)`;}
  };
  function update(now){
    frame=0;const dt=Math.min(.05,(now-prevTime)/1000||0);prevTime=now;boost*=.93;
    if(reduce.matches){assemble(1);manuscriptPose(1);readerMail.style.transform='';highlight.style.opacity='0';return;}
    if(visible(assembly))assemble(clamp(progress(assembly)/.85));
    if(visible(manuscript))manuscriptPose(clamp(progress(manuscript)/.85));
    if(visible(reader)){read(clamp(progress(reader)/.85));app.style.transform=`rotateX(${14*(1-revealProgress(reader))}deg)`;}
    const twin=$('.te-twin'),cols=$$('.te-twinCol'),tr=twin.getBoundingClientRect();
    if(!mobile.matches&&tr.bottom>0&&tr.top<vh){
      const aH=cols[0].offsetHeight,bH=cols[1].offsetHeight,p=clamp((vh-tr.top)/Math.max(1,aH));
      const aShift=lerp(40,0,p),stagger=330*cols[1].clientWidth/500;
      cols[0].style.transform=`translateY(${aShift}px)`;
      cols[1].style.transform=`translateY(${lerp(stagger,aH-bH,p)+aShift}px)`;
    }
    cols.forEach(col=>{
      $$('.te-twinCaption',col).forEach(cap=>{if(mobile.matches?cap.getBoundingClientRect().top<vh*.8:col.getBoundingClientRect().top+Number(cap.dataset.y)*col.clientWidth/700<vh*.55)cap.classList.add('is-in');});
    });
    const mock=$('.te-mock');if(visible(mock)){const p=ease(revealProgress(mock));mock.style.clipPath=`inset(0 ${(1-p)*50}%)`;$('img',mock).style.transform=`scale(${lerp(1.1,1,p)})`;}
    const follow=$('.te-followupMail');if(visible(follow))follow.style.transform=`translateY(${40*(1-revealProgress(follow))}px)`;
    if(visibleBand){const w=bandTrack.firstElementChild.offsetWidth;bandOffset=(bandOffset+dt*(40+boost*200))%Math.max(1,w);bandTrack.style.transform=`translateX(${-bandOffset}px)`;}
    if(visibleWall)wallCols.forEach(col=>{if(!col.height)return;col.offset=(col.offset+dt*(24+boost*170)*col.speed)%col.height;col.track.style.transform=`translateY(${col.down?col.offset-col.height:-col.offset}px)`;});
    if(visibleBand||visibleWall)request();
  }
  const enterObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');enterObserver.unobserve(e.target);}}),{threshold:.25,rootMargin:'0px 0px -15% 0px'});
  $$('[data-te-enter]').forEach(el=>enterObserver.observe(el));
  const motionObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.target===band)visibleBand=e.isIntersecting;if(e.target===wall)visibleWall=e.isIntersecting;});request();});
  motionObserver.observe(band);motionObserver.observe(wall);
  let eventObserver;
  const observeEvents=()=>{
    if(eventObserver)eventObserver.disconnect();
    eventObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;eventObserver.unobserve(e.target);const items=mobile.matches?[e.target]:$$('.te-event',e.target);items.forEach((el,i)=>{el.style.setProperty('--te-event-delay',`${mobile.matches?0:i*.15}s`);el.classList.add('is-open');});}),{rootMargin:'0px 0px -20% 0px'});
    $$(mobile.matches?'.te-event':'.te-eventRow').forEach(el=>eventObserver.observe(el));
  };
  const queueMeasure=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(performance.now()-lastScroll<160){queueMeasure();return;}measure();},180);};
  const applyMode=()=>{
    page.classList.toggle('te-motion',!reduce.matches);
    $$('.te-piece,.te-piece figcaption,.te-endCaption,.te-paper,.te-paperBlock,.te-block,.te-manuscriptCanvas,.te-twinCol,.te-twinCaption,.te-app,.te-readerViewport .te-mail,.te-readerHighlight,.te-readerCard,.te-readerCards,.te-mock,.te-mock img,.te-followupMail,.te-wall__track,.te-bandTrack,.te-eventClip').forEach(el=>el.removeAttribute('style'));
    $$('.te-assembleStage,.te-manuscriptStage,.te-readerStage,.te-twin').forEach(el=>el.removeAttribute('style'));
    $('.te-manuscriptStage').classList.remove('te-fit-small','te-fit-short');
    $$('.te-readerCard').forEach(el=>el.removeAttribute('aria-hidden'));
    $$('.te-event').forEach(el=>{if(reduce.matches)el.classList.add('is-open');});
    measure();observeEvents();
    if(reduce.matches){$$('[data-te-enter],.te-twinCaption').forEach(el=>el.classList.add('is-in'));assemble(1);manuscriptPose(1);}
  };
  const dialog=$('.te-lightbox');let opener=null,oldOverflow='';
  const close=()=>dialog.close();
  $$('.te-eventOpen').forEach(button=>button.addEventListener('click',()=>{
    opener=button;const code=button.closest('.te-event').dataset.code;
    $$('.te-lightboxMail',dialog).forEach(el=>{el.hidden=el.dataset.code!==code;const template=$('template',el);if(!el.hidden&&template){el.append(template.content.cloneNode(true));template.remove();}});
    oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();dialog.scrollTop=0;$('.te-close',dialog).focus();
  }));
  $('.te-close',dialog).addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;if(opener)opener.focus({preventScroll:true});});
  addEventListener('scroll',()=>{const now=performance.now();boost=Math.min(4,boost+Math.abs(scrollY-prevY)/300);prevY=scrollY;lastScroll=now;request();},{passive:true});
  addEventListener('resize',queueMeasure,{passive:true});reduce.addEventListener('change',applyMode);mobile.addEventListener('change',applyMode);
  $$('img').forEach(img=>{if(!img.complete)img.addEventListener('load',queueMeasure,{once:true});});
  if(document.fonts)document.fonts.ready.then(queueMeasure);
  if('ResizeObserver' in window){resizeObserver=new ResizeObserver(queueMeasure);[app,canvas,paper,nav].filter(Boolean).forEach(el=>resizeObserver.observe(el));}
  applyMode();
})();
