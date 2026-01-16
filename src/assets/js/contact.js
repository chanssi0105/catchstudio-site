/* =========================================================
   contact.js (Clean v1.3) - FULL
   - About hero splitWords 적용(data-split-words)
   - hero: 첫 페인트 후 is-animated 트리거
   - Panel 1개 고정 + Feed 누적 + 클릭 편집
   - Feed 순서: 일정 -> 이메일 -> 이름
   - Edit 후: 원래 작성중이던 단계로 복귀(returnTo)
   - 라벨 한글화 + Edit -> 수정
   - 버튼 화살표 추가 + 마지막 버튼 primary
   - date 입력: 지난 날짜 선택 불가(min=오늘)
   - ✅ 페이지 진입 후 몇 초 있다가 본문(폼)으로 자동 스크롤(once, 1.5s, smooth)
========================================================= */
(() => {
  document.documentElement.classList.add("is-js");

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const prefersReduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lockScroll = (()=> {
    let y=0;
    const html=document.documentElement;
    const body=document.body;
    const getSBW=()=>Math.max(0, window.innerWidth - html.clientWidth);

    return {
      on(){
        y=window.scrollY||0;
        const sbw=getSBW();

        body.style.paddingRight = sbw ? `${sbw}px` : "";   // ✅ 폭 보정 강제
        html.classList.add("is-scrollLocked");
        body.classList.add("is-scrollLocked");

        body.style.position="fixed";
        body.style.top=`-${y}px`;
        body.style.left="0";
        body.style.right="0";
        body.style.width="100%";
        body.style.boxSizing="border-box";                // ✅ padding 때문에 가로 튐 방지
      },
      off(){
        body.style.position="";
        body.style.top="";
        body.style.left="";
        body.style.right="";
        body.style.width="";
        body.style.boxSizing="";
        body.style.paddingRight="";                       // ✅ 원복

        html.classList.remove("is-scrollLocked");
        body.classList.remove("is-scrollLocked");

        window.scrollTo(0,y);
      }
    };
  })();


  // 버튼 화살표
  const ARROW_SVG=`<svg class="c-arrow" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M16.9661 9.18144L10.1379 2.3532C9.85916 2.0745 9.72538 1.74934 9.73653 1.37774C9.74768 1.00613 9.89307 0.680978 10.1727 0.402274C10.4514 0.146796 10.7766 0.0130186 11.1482 0.000941246C11.5198 -0.0111361 11.8449 0.122641 12.1236 0.402274L21.3208 9.59949C21.4602 9.73885 21.5591 9.88981 21.6177 10.0524C21.6762 10.215 21.7045 10.3892 21.7027 10.575C21.7008 10.7608 21.6716 10.9349 21.6149 11.0975C21.5582 11.2601 21.4597 11.4111 21.3195 11.5504L12.1222 20.7476C11.8668 21.0031 11.5472 21.1309 11.1635 21.1309C10.7798 21.1309 10.4491 21.0031 10.1713 20.7476C9.8926 20.4689 9.75325 20.1377 9.75325 19.7541C9.75325 19.3704 9.8926 19.0397 10.1713 18.7619L16.9661 11.9685L1.39353 11.9685C0.998702 11.9685 0.66751 11.8347 0.399955 11.5671C0.1324 11.2996 -0.000914508 10.9689 1.4336e-05 10.575C0.00094318 10.1811 0.134721 9.84986 0.401347 9.58138C0.667973 9.3129 0.998702 9.17958 1.39353 9.18144L16.9661 9.18144Z" fill="currentColor"/></svg>`;

  /* ----------------------------------------------------------
     0) About Hero splitWords
  ---------------------------------------------------------- */
  const splitWords=(el)=>{
    const html=el.innerHTML.replace(/<br\s*\/?>/gi,"\n");
    const tmp=document.createElement("div");
    tmp.innerHTML=html;

    const text=(tmp.textContent||"").replace(/[ \t]+/g," ").trim();
    const lines=text.split("\n").map(s=>s.trim()).filter(Boolean);

    el.innerHTML="";
    const frag=document.createDocumentFragment();

    let idx=0;
    lines.forEach((line,lineIndex)=>{
      line.split(" ").forEach((word)=>{
        if(!word) return;
        const w=document.createElement("span");
        w.className="w";
        const i=document.createElement("i");
        i.textContent=word;
        i.style.transitionDelay=`${Math.min(idx*45,520)}ms`;
        w.appendChild(i);
        frag.appendChild(w);
        frag.appendChild(document.createTextNode(" "));
        idx+=1;
      });
      if(lineIndex<lines.length-1) frag.appendChild(document.createElement("br"));
    });

    el.appendChild(frag);

    if(prefersReduce){
      el.classList.add("is-animated");
    }else{
      requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("is-animated")));
    }
  };

  const heroTitle=$("[data-split-words]");
  if(heroTitle && heroTitle.dataset.splitted!=="1"){
    heroTitle.dataset.splitted="1";
    splitWords(heroTitle);
  }

  /* ----------------------------------------------------------
     boot
  ---------------------------------------------------------- */
  const boot=(tries=60)=>{
    const form=$("[data-contact-form]");
    const panel=$("[data-contact-panel]");
    const feed=$("[data-contact-feed]");
    const viewport=$("[data-contact-viewport]");
    if(!form||!panel||!feed||!viewport){
      if(tries>0) return setTimeout(()=>boot(tries-1),25);
      return;
    }
    init(form,panel,feed,viewport);
  };

  const init=(form,panel,feed,viewport)=>{
    const MSG_MIN=10;
    const NAME_RE=/^[A-Za-z가-힣\s.'-]{2,}$/;
    const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const isNameValid=(v)=>NAME_RE.test((v||"").trim());
    const isEmailValid=(v)=>EMAIL_RE.test((v||"").trim());
    const isMsgValid=(v)=>((v||"").trim().length>=MSG_MIN);

    const state={name:"",email:"",schedule_flexible:"unknown",schedule_from:"",schedule_to:"",message:""};
    const done={name:false,email:false,schedule:false,message:false};

    let active="name";
    let returnTo=null;

    const escapeHtml=(s)=>String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");

    const fieldWrap=(el)=>el?el.closest(".c-field"):null;

    const setStateClass=(wrap,mode,touched)=>{
      if(!wrap) return;
      wrap.classList.toggle("is-touched",!!touched);
      wrap.classList.toggle("is-valid",mode==="valid");
      wrap.classList.toggle("is-invalid",mode==="invalid");
    };

    const nextKey=(k)=>{
      const order=["name","email","schedule","message"];
      const i=order.indexOf(k);
      return order[Math.min(order.length-1,i+1)];
    };

    const keyLabel=(k)=>{
      if(k==="name") return "이름";
      if(k==="email") return "이메일";
      if(k==="schedule") return "일정";
      return "세부사항";
    };

    const scheduleText=()=>{
      const flex=state.schedule_flexible;
      const label=flex==="yes"?"가능":(flex==="no"?"불가":"미정");
      const range=(flex==="no" && state.schedule_from && state.schedule_to) ? ` / ${state.schedule_from} ~ ${state.schedule_to}` : "";
      return `일정 조율: ${label}${range}`;
    };

    const summaryText=(k)=>{
      if(k==="name") return (state.name||"").trim();
      if(k==="email") return (state.email||"").trim();
      if(k==="schedule") return scheduleText();
      return ((state.message||"").trim().slice(0,80) + (((state.message||"").trim().length>80)?"…":"")) || "";
    };

    const validateKey=(k,markTouched=true)=>{
      if(k==="name"){
        const v=(state.name||"");
        const w=fieldWrap($("#c-name",panel));
        if(!v){setStateClass(w,"invalid",false);return false;}
        const ok=isNameValid(v);
        setStateClass(w,ok?"valid":"invalid",markTouched);
        return ok;
      }

      if(k==="email"){
        const v=(state.email||"").trim();
        const input=$("#c-email",panel);
        const w=fieldWrap(input);
        if(v && !isEmailValid(v)) input.setCustomValidity("invalid");
        else input.setCustomValidity("");
        if(!v){setStateClass(w,"invalid",false);return false;}
        const ok=isEmailValid(v);
        setStateClass(w,ok?"valid":"invalid",markTouched);
        return ok;
      }

      if(k==="schedule"){
        const ok=(()=>{
          if(state.schedule_flexible!=="no") return true;
          if(!state.schedule_from||!state.schedule_to) return false;
          if(state.schedule_from>state.schedule_to) return false;
          return true;
        })();

        const from=$("#c-from",panel);
        const to=$("#c-to",panel);
        const wf=fieldWrap(from);
        const wt=fieldWrap(to);

        if(state.schedule_flexible==="no"){
          setStateClass(wf,state.schedule_from?"valid":"invalid",markTouched);
          setStateClass(wt,state.schedule_to?"valid":"invalid",markTouched);
          if(state.schedule_from && state.schedule_to && state.schedule_from>state.schedule_to){
            setStateClass(wt,"invalid",markTouched);
          }
        }
        return ok;
      }

      // message
      {
        const v=(state.message||"");
        const w=fieldWrap($("#c-msg",panel));
        if(!v){setStateClass(w,"invalid",false);return false;}
        const ok=isMsgValid(v);
        setStateClass(w,ok?"valid":"invalid",markTouched);
        return ok;
      }
    };

    const renderFeed=()=>{
      const order=["schedule","email","name"];
      feed.innerHTML=order.filter(k=>done[k]).map(k=>{
        return `<div class="feed-item ${active===k?"is-active":""}" data-edit="${k}" role="button" tabindex="0" aria-label="${keyLabel(k)} 수정"><div class="feed-top"><div class="feed-key">${keyLabel(k)}</div><div class="feed-edit">수정</div></div><div class="feed-val">${escapeHtml(summaryText(k))}</div></div>`;
      }).join("");
    };

    const focusFirst=()=>{
      const t=panel.querySelector("input,textarea,button");
      t && t.focus({preventScroll:true});
    };

    const setActive=(k,scrollIntoView=false)=>{
      active=k;
      renderPanel();
      renderFeed();

      if(scrollIntoView){
        const panelTop=panel.getBoundingClientRect().top;
        const vpTop=viewport.getBoundingClientRect().top;
        window.scrollBy(0,panelTop-vpTop-10);
      }
      focusFirst();
    };

    const afterCommit=(k)=>{
      done[k]=true;
      renderFeed();

      if(returnTo && returnTo!==k){
        const dest=returnTo;
        returnTo=null;
        return setActive(dest,true);
      }

      const nk=nextKey(k);
      if(nk!==k) setActive(nk,true);
    };

    const tryCommit=(k)=>{
      if(!validateKey(k,true)) return false;
      afterCommit(k);
      return true;
    };

    const getToday=()=>{
      const d=new Date();
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,"0");
      const day=String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    };

    const renderPanel=()=>{
      if(active==="name"){
        panel.innerHTML=
          `<div class="c-card">`+
            `<label class="c-label" for="c-name">이름</label>`+
            `<div class="c-field" data-field="name">`+
              `<input class="c-input" id="c-name" name="name" type="text" autocomplete="name" placeholder="이름" required value="${escapeHtml(state.name)}" />`+
              `<span class="c-status" aria-hidden="true"></span>`+
            `</div>`+
            `<button class="c-next" type="button" data-next>다음${ARROW_SVG}</button>`+
          `</div>`;
        bindName();
        return;
      }

      if(active==="email"){
        panel.innerHTML=
          `<div class="c-card">`+
            `<label class="c-label" for="c-email">이메일</label>`+
            `<div class="c-field" data-field="email">`+
              `<input class="c-input" id="c-email" name="email" type="email" autocomplete="email" placeholder="이메일" required value="${escapeHtml(state.email)}" />`+
              `<span class="c-status" aria-hidden="true"></span>`+
            `</div>`+
            `<button class="c-next" type="button" data-next>다음${ARROW_SVG}</button>`+
          `</div>`;
        bindEmail();
        return;
      }

      if(active==="schedule"){
        const showExtra=state.schedule_flexible==="no";
        panel.innerHTML=
          `<div class="c-card">`+
            `<fieldset class="c-fieldset">`+
              `<legend class="c-legend">Catch Studio 일정에 맞추어 일정을 조율할 수 있나요?</legend>`+
              `<label class="c-chip"><input name="schedule_flexible" type="radio" value="yes" ${state.schedule_flexible==="yes"?"checked":""} />가능해요</label>`+
              `<label class="c-chip"><input name="schedule_flexible" type="radio" value="no" ${state.schedule_flexible==="no"?"checked":""} />어려워요</label>`+
              `<label class="c-chip"><input name="schedule_flexible" type="radio" value="unknown" ${state.schedule_flexible==="unknown"?"checked":""} />아직 모르겠어요</label>`+
              `<div class="c-schedule" data-schedule-extra aria-hidden="${showExtra?"false":"true"}">`+
                `<p class="c-hint">가능한 일정을 선택해주세요.</p>`+
                `<div class="c-row">`+
                  `<div class="c-col">`+
                    `<label class="c-label" for="c-from">시작 일</label>`+
                    `<div class="c-field" data-field="from">`+
                      `<input class="c-input" id="c-from" name="schedule_from" type="date" value="${escapeHtml(state.schedule_from)}" ${showExtra?"required":""} />`+
                      `<span class="c-status" aria-hidden="true"></span>`+
                    `</div>`+
                  `</div>`+
                  `<div class="c-col">`+
                    `<label class="c-label" for="c-to">종료 일</label>`+
                    `<div class="c-field" data-field="to">`+
                      `<input class="c-input" id="c-to" name="schedule_to" type="date" value="${escapeHtml(state.schedule_to)}" ${showExtra?"required":""} />`+
                      `<span class="c-status" aria-hidden="true"></span>`+
                    `</div>`+
                  `</div>`+
                `</div>`+
              `</div>`+
            `</fieldset>`+
            `<button class="c-next" type="button" data-next>다음${ARROW_SVG}</button>`+
          `</div>`;
        bindSchedule();
        return;
      }

      // MESSAGE
      panel.innerHTML=
        `<div class="c-card">`+
          `<label class="c-label" for="c-msg">세부사항</label>`+
          `<div class="c-field" data-field="message">`+
            `<textarea class="c-textarea" id="c-msg" name="message" rows="6" placeholder="프로젝트명(가칭), 목표, 필요한 범위 등을 편하게 작성해 주세요. (10자 이상 기입)" required>${escapeHtml(state.message)}</textarea>`+
            `<span class="c-status" aria-hidden="true"></span>`+
          `</div>`+
          `<button class="c-next c-next--primary" type="submit" data-submit disabled>이야기 나누기${ARROW_SVG}</button>`+
        `</div>`;
      bindMessage();
    };

    const bindNext=(key)=>{
      const btn=$("[data-next]",panel);
      btn?.addEventListener("click",()=>tryCommit(key));
    };

    // NAME
    const bindName=()=>{
      const input=$("#c-name",panel);
      const wrap=fieldWrap(input);
      const btn=$("[data-next]",panel);

      const update=(t=true)=>{
        state.name=input.value||"";
        if(!state.name){setStateClass(wrap,"invalid",false);btn.disabled=true;return;}
        const ok=isNameValid(state.name);
        setStateClass(wrap,ok?"valid":"invalid",t);
        btn.disabled=!ok;
      };

      input.addEventListener("input",()=>update(true));
      input.addEventListener("compositionend",()=>update(true));
      input.addEventListener("blur",()=>update(true));

      input.addEventListener("keydown",(e)=>{
        if(e.key==="Enter"){
          e.preventDefault();
          update(true);
          tryCommit("name");
        }
      });

      bindNext("name");
      update(false);
    };

    // EMAIL
    const bindEmail=()=>{
      const input=$("#c-email",panel);
      const wrap=fieldWrap(input);
      const btn=$("[data-next]",panel);

      const update=(t=true)=>{
        state.email=(input.value||"").trim();
        if(state.email && !isEmailValid(state.email)) input.setCustomValidity("invalid");
        else input.setCustomValidity("");

        if(!state.email){setStateClass(wrap,"invalid",false);btn.disabled=true;return;}
        const ok=isEmailValid(state.email);
        setStateClass(wrap,ok?"valid":"invalid",t);
        btn.disabled=!ok;
      };

      input.addEventListener("input",()=>update(true));
      input.addEventListener("compositionend",()=>update(true));
      input.addEventListener("blur",()=>update(true));

      input.addEventListener("keydown",(e)=>{
        if(e.key==="Enter"){
          e.preventDefault();
          update(true);
          tryCommit("email");
        }
      });

      bindNext("email");
      update(false);
    };

    // SCHEDULE
    const bindSchedule=()=>{
      const radios=$$('input[name="schedule_flexible"]',panel);
      const extra=$("[data-schedule-extra]",panel);
      const from=$("#c-from",panel);
      const to=$("#c-to",panel);
      const btn=$("[data-next]",panel);

      // 지난 날짜 선택 불가(오늘부터)
      const minDate=getToday();
      from.min=minDate;
      to.min=minDate;

      const setExtra=(show)=>{
        extra.setAttribute("aria-hidden",show?"false":"true");
        from.required=!!show;
        to.required=!!show;
        if(!show){
          state.schedule_from="";state.schedule_to="";
          from.value="";to.value="";
        }
      };

      const update=(t=true)=>{
        const ok=validateKey("schedule",t);
        btn.disabled=!ok;
      };

      radios.forEach(r=>{
        r.addEventListener("change",()=>{
          state.schedule_flexible=r.value;
          if(state.schedule_flexible==="no") setExtra(true);
          else setExtra(false);
          update(true);
        });
      });

      from.addEventListener("input",()=>{
        state.schedule_from=from.value||"";
        if(state.schedule_from && state.schedule_from<minDate){state.schedule_from=minDate;from.value=minDate;}
        if(state.schedule_to && state.schedule_to<state.schedule_from){state.schedule_to=state.schedule_from;to.value=state.schedule_to;}
        update(true);
      });

      to.addEventListener("input",()=>{
        state.schedule_to=to.value||"";
        if(state.schedule_to && state.schedule_to<minDate){state.schedule_to=minDate;to.value=minDate;}
        if(state.schedule_from && state.schedule_to<state.schedule_from){state.schedule_to=state.schedule_from;to.value=state.schedule_to;}
        update(true);
      });

      const onEnter=(e)=>{
        if(e.key==="Enter"){
          e.preventDefault();
          update(true);
          tryCommit("schedule");
        }
      };
      from.addEventListener("keydown",onEnter);
      to.addEventListener("keydown",onEnter);

      bindNext("schedule");
      setExtra(state.schedule_flexible==="no");
      update(false);
    };

    // MESSAGE
    const bindMessage=()=>{
      const textarea=$("#c-msg",panel);
      const wrap=fieldWrap(textarea);
      const btn=$("[data-submit]",panel);

      const scheduleOk=()=>{
        if(state.schedule_flexible!=="no") return true;
        if(!state.schedule_from||!state.schedule_to) return false;
        if(state.schedule_from>state.schedule_to) return false;
        return true;
      };

      const allOk=()=>{
        return isNameValid(state.name)
          && isEmailValid(state.email)
          && scheduleOk()
          && isMsgValid(state.message);
      };

      const update=(t=true)=>{
        state.message=textarea.value||"";

        if(!state.message){
          setStateClass(wrap,"invalid",false);
        }else{
          const ok=isMsgValid(state.message);
          setStateClass(wrap,ok?"valid":"invalid",t);
        }

        if(btn) btn.disabled=!allOk();
      };

      ["input","change","keyup","compositionend","blur"].forEach(evt=>{
        textarea.addEventListener(evt,()=>update(true));
      });

      update(false);
      requestAnimationFrame(()=>update(false));
    };

    // FEED -> EDIT
    const openEdit=(k)=>{
      returnTo=active;
      setActive(k,true);
    };

    feed.addEventListener("click",(e)=>{
      const item=e.target.closest("[data-edit]");
      if(!item) return;
      const k=item.getAttribute("data-edit");
      if(!k) return;
      openEdit(k);
    });

    feed.addEventListener("keydown",(e)=>{
      if(e.key!=="Enter" && e.key!==" ") return;
      const item=e.target.closest("[data-edit]");
      if(!item) return;
      e.preventDefault();
      const k=item.getAttribute("data-edit");
      if(!k) return;
      openEdit(k);
    });

    /* ----------------------------------------------------------
   Submit (TEST MODE + REAL MODE)
   - 테스트 모드: 네트워크 전송 없음(카운팅 0) / UI만 확인
   - 실전 모드: Formspree fetch 전송 + 성공/실패 처리
   - 버튼 카피: "이야기 나누기" -> "보내는 중" -> "보내기 완료"
   - 성공 모달 CTA: index("/") 이동
---------------------------------------------------------- */
(() => {
  const isTestMode=(() => {
    const qs=new URLSearchParams(location.search);
    if(qs.get("test")==="1") return true;             // /contact/?test=1
    // 로컬에서 자동 테스트 모드 원하면 아래 줄 주석 해제
    // if(location.hostname==="localhost" || location.hostname==="127.0.0.1") return true;
    return false;
  })();

  // 아이콘: 점 3개 / 체크
  const DOTS_SVG=`<svg class="c-arrow" width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="6" cy="11" r="1.8" fill="currentColor"/><circle cx="11" cy="11" r="1.8" fill="currentColor"/><circle cx="16" cy="11" r="1.8" fill="currentColor"/></svg>`;
  const CHECK_SVG=`<svg class="c-arrow" width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M9.1 15.3L4.7 10.9l1.4-1.4 3 3 6.8-6.8 1.4 1.4-8.2 8.2z" fill="currentColor"/></svg>`;

  const getSubmitBtn=()=>panel.querySelector("[data-submit]");
  const setBtn=(mode)=>{
    const btn=getSubmitBtn();
    if(!btn) return;
    if(mode==="idle"){
      btn.disabled=!true; // 아래에서 allOk로 다시 세팅될 수도 있어. 여기서는 "idle로 복귀"만 담당
      btn.innerHTML=`이야기 나누기${ARROW_SVG}`;
      btn.removeAttribute("aria-busy");
      btn.dataset.submitState="idle";
      return;
    }
    if(mode==="busy"){
      btn.disabled=true;
      btn.innerHTML=`보내는 중${DOTS_SVG}`;
      btn.setAttribute("aria-busy","true");
      btn.dataset.submitState="busy";
      return;
    }
    if(mode==="done"){
      btn.disabled=true;
      btn.innerHTML=`보내기 완료${CHECK_SVG}`;
      btn.removeAttribute("aria-busy");
      btn.dataset.submitState="done";
    }
  };

  const makeModal=()=>{
    let overlay=document.querySelector("[data-contact-modal]");
    if(overlay) return overlay;

    overlay=document.createElement("div");
    overlay.className="contact-modal";
    overlay.setAttribute("data-contact-modal","");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label","문의 접수 완료");

    const card=document.createElement("div");
    card.className="contact-modal__card";

    card.innerHTML=
      `<h3 class="contact-modal__title">접수 완료</h3>`+
      `<p class="contact-modal__desc">내용 잘 받았어요. 빠르게 답장드릴게요!</p>`+
      `<div class="contact-modal__actions">`+
        `<button type="button" data-modal-cta class="c-next c-next--primary">프로젝트 보러가기${ARROW_SVG}</button>`+
      `</div>`;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // CTA: 스크롤 잠금 해제 후 홈 이동
    card.querySelector("[data-modal-cta]")?.addEventListener("click",()=>{
      lockScroll.off();
      location.href="/";
    });

    return overlay;
  };


  const openModal=()=>{
    const overlay=makeModal();
    lockScroll.on();
    overlay.classList.add("is-open");
  };

  const showFail=()=>{
    // 실패 시: 버튼 원복 + 다시 활성화(검증 로직에 의해 disabled 여부는 다시 계산될 수 있음)
    const btn=getSubmitBtn();
    if(!btn) return;
    btn.disabled=false;
    btn.innerHTML=`이야기 나누기${ARROW_SVG}`;
    btn.removeAttribute("aria-busy");
    btn.dataset.submitState="idle";
  };

  // 기존 검증 로직은 유지하되, 성공 시 네트워크/테스트 UI로 진입
  form.addEventListener("submit", async (e) => {
    // 1) 동일한 검증(네 기존 로직 유지)
    const ok0=isNameValid(state.name);
    const ok1=isEmailValid(state.email);
    const ok2=(()=>{
      if(state.schedule_flexible!=="no") return true;
      if(!state.schedule_from||!state.schedule_to) return false;
      if(state.schedule_from>state.schedule_to) return false;
      return true;
    })();
    const ok3=isMsgValid(state.message);

    if(!ok0||!ok1||!ok2||!ok3){
      e.preventDefault();
      if(!ok0) return setActive("name",true);
      if(!ok1) return setActive("email",true);
      if(!ok2) return setActive("schedule",true);
      return setActive("message",true);
    }

    // 2) 여기서부터는 "실제 전송" 또는 "테스트 UI"
    e.preventDefault(); // ✅ 기본 submit(카운팅) 막음. 실전은 fetch로 보냄.
    setBtn("busy");

    // 테스트 모드: 네트워크 안 타고 성공/실패만 연출
    if(isTestMode){
      const FAIL_RATE=0.0; // 필요하면 0.2 같은 값으로 실패도 테스트
      const delay=900;

      setTimeout(()=>{
        const fail=Math.random()<FAIL_RATE;
        if(fail){
          showFail();
          return;
        }
        setBtn("done");
        openModal();
      }, delay);

      return;
    }

    // 실전 모드: Formspree fetch
    try{
      const res=await fetch(form.action,{
        method:"POST",
        body:new FormData(form),
        headers:{Accept:"application/json"}
      });

      if(!res.ok){
        showFail();
        return;
      }

      setBtn("done");
      openModal();
    }catch(_){
      showFail();
    }
  });
})();


    /* ----------------------------------------------------------
       Auto scroll to contact-body start (once) - CUSTOM SMOOTH
       ✅ 1.5초로 고정 + 더 부드러운 easing
       ✅ 타겟: .contact-body 섹션 시작점
    ---------------------------------------------------------- */
    (() => {
      if(prefersReduce) return;

      let done=false;

      const getHeaderH=()=>{
        const v=getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
        const n=parseFloat(v);
        return Number.isFinite(n)?n:70;
      };

      // ✅ 여기서 “속도/부드러움” 제어함
      const SCROLL_DURATION=2000; //

      const smoothScrollTo=(targetY,duration)=>{
        const startY=window.scrollY;
        const dist=targetY-startY;
        const startT=performance.now();
        // ✅ 부드러운 easeInOutCubic
        const ease=(t)=>t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

        const step=(now)=>{
          const p=Math.min(1,(now-startT)/duration);
          window.scrollTo(0, startY + dist*ease(p));
          if(p<1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      const run=async()=>{
        if(done) return;
        if(window.scrollY > 10) return; // 사용자가 이미 스크롤했으면 개입 X

        const target=document.querySelector(".contact-body");
        if(!target) return;

        const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
        try{
          if(document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, wait(700)]);
          else await wait(200);
        }catch(_){}
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

        const headerH=getHeaderH();
        const EXTRA=0; // 섹션 시작 딱 붙이면 0, 조금 띄우면 12~24
        const rect=target.getBoundingClientRect();

        const scroller=document.scrollingElement || document.documentElement;
        const maxScroll=scroller.scrollHeight - window.innerHeight;

        let y=window.scrollY + rect.top - headerH - EXTRA;
        y=Math.max(0, Math.min(maxScroll, y));

        done=true;
        smoothScrollTo(y, SCROLL_DURATION);
      };

      if(document.readyState==="complete"){
        setTimeout(run, 120);
      }else{
        window.addEventListener("load", ()=>setTimeout(run, 120), {once:true});
      }
    })();

    // initial
    renderPanel();
    renderFeed();
    focusFirst();
  };

  boot();
})();
