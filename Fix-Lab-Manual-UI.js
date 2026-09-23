(function(){
    // ==========================================================
    // CLEANUP
    // ==========================================================
    ['bh-st','bh-dt','bh-bar','bh-hint','bh-ov','bh-css'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.remove();
    });
    document.querySelectorAll('.bh-sh').forEach(h=>{
        h.classList.remove('bh-sh'); h.style.transform='';
    });
    document.body.classList.remove('bsh','bdk');
    if(window.__bhCleanup){ try{window.__bhCleanup();}catch(e){} window.__bhCleanup=null; }

    // ==========================================================
    // STYLES
    // ==========================================================
    const c=document.createElement('style'); c.id='bh-css';
    c.textContent=`
        #bh-st,#bh-dt{position:fixed;top:10px;z-index:999999;background:rgba(9,105,218,.45);color:#fff;border:0;padding:6px 10px;font-size:14px;line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15);opacity:.7;transition:opacity .15s,background .15s;border-radius:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
        #bh-st{left:8px} #bh-dt{right:8px}
        #bh-st:hover,#bh-dt:hover{opacity:1;background:#0860ca}

        #bh-bar{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#0969da,#58a6ff);z-index:999998;pointer-events:none;transition:width .06s linear}

        #bh-hint{position:fixed;bottom:12px;right:12px;z-index:999997;background:rgba(9,105,218,.45);color:rgba(255,255,255,.9);padding:5px 9px;border-radius:4px;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;opacity:.6;cursor:pointer;transition:opacity .15s,background .15s;box-shadow:0 1px 4px rgba(0,0,0,.1)}
        #bh-hint:hover{opacity:1;background:#0860ca}

        #bh-ov{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999996;display:none;align-items:flex-start;justify-content:center;padding-top:8vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
        #bh-ov.on{display:flex}
        #bh-ov>div{width:min(760px,94vw);background:#fff;border:1px solid #d1d9e0;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column;max-height:80vh}
        #bh-in{width:100%;box-sizing:border-box;padding:16px 18px;font-size:16px;border:0;outline:0;background:transparent;color:#1f2328;border-bottom:1px solid #d1d9e0;font-family:inherit}
        #bh-in::placeholder{color:#8b949e}
        #bh-stt{padding:8px 18px;font-size:11px;color:#8b949e;border-bottom:1px solid #d1d9e0;background:#f6f8fa}
        #bh-rs{overflow-y:auto;max-height:65vh}
        .bh-i{padding:10px 18px;cursor:pointer;display:flex;flex-direction:column;gap:4px;color:#1f2328;font-size:13px;border-left:3px solid transparent;border-bottom:1px solid #f0f3f6}
        .bh-i.on,.bh-i:hover{background:rgba(9,105,218,.08);border-left-color:#0969da}
        .bh-l{font-size:11px;font-weight:600;color:#0969da;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bh-s{font-size:13px;line-height:1.5;color:#59636e;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .bh-s mark{background:#fff3a3;color:#1f2328;padding:0 2px;border-radius:2px}

        /* ---- STICKY HEADINGS (only when NOT suppressed) ---- */
        .bh-sh:not(.bh-no-sticky){
            position: sticky !important;
            top: 0 !important;
            z-index: 900;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: transform .12s linear;
            will-change: transform;
        }
        body:not(.bdk) .bh-sh:not(.bh-no-sticky){ background-color: rgba(255,255,255,.94) !important; }
        body.bdk .bh-sh:not(.bh-no-sticky){ background-color: rgba(13,17,23,.94) !important; border-bottom-color: #30363d !important; }

        /* Temporary override applied during scroll-to */
        .bh-no-sticky{
            position: static !important;
            top: auto !important;
            transform: none !important;
        }

        /* ---- SIDEBAR HIDE + REFLOW ---- */
        body.bsh nav,
        body.bsh .sidebar { display: none !important; }
        body.bsh .content,
        body.bsh .markdown-body {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            box-sizing: border-box !important;
        }

        /* ---- DARK MODE ---- */
        body.bdk{background:#0d1117!important;color:#c9d1d9!important}
        body.bdk .content,body.bdk .markdown-body{background:#0d1117!important;color:#c9d1d9!important}
        body.bdk h1,body.bdk h2{color:#f0f6fc!important;border-bottom-color:#21262d!important}
        body.bdk h3,body.bdk h4,body.bdk h5,body.bdk h6{color:#f0f6fc!important}
        body.bdk p,body.bdk li,body.bdk td,body.bdk dt,body.bdk dd{color:#c9d1d9!important}
        body.bdk small,body.bdk em{color:#8b949e!important}
        body.bdk strong,body.bdk b{color:#f0f6fc!important}
        body.bdk a{color:#58a6ff!important}
        body.bdk a:hover{color:#79c0ff!important}
        body.bdk hr{border-color:#21262d!important}
        body.bdk blockquote{border-left-color:#30363d!important;background:#161b22!important;color:#8b949e!important}
        body.bdk table{border-color:#30363d!important}
        body.bdk th{background:#161b22!important;color:#f0f6fc!important;border-color:#30363d!important}
        body.bdk td{border-color:#30363d!important;color:#c9d1d9!important}
        body.bdk tr:nth-child(even) td{background:#0f141a!important}
        body.bdk code:not(pre code){background:rgba(110,118,129,.25)!important;color:#ff7b72!important}
        body.bdk pre{background:#161b22!important;color:#c9d1d9!important;border:1px solid #30363d!important}
        body.bdk nav,body.bdk .sidebar{background:#010409!important;color:#c9d1d9!important}
        body.bdk nav a,body.bdk .sidebar a,body.bdk nav li,body.bdk .sidebar li{color:#c9d1d9!important}
        body.bdk nav a:hover,body.bdk .sidebar a:hover{color:#58a6ff!important}
        body.bdk img{filter:brightness(.92)}

        body.bdk #bh-ov>div{background:#161b22;border-color:#30363d}
        body.bdk #bh-in{color:#e6edf3;border-bottom-color:#30363d}
        body.bdk #bh-stt{background:#0d1117;color:#8b949e;border-bottom-color:#30363d}
        body.bdk .bh-i{color:#e6edf3;border-bottom-color:#21262d}
        body.bdk .bh-i.on,body.bdk .bh-i:hover{background:rgba(88,166,255,.1);border-left-color:#58a6ff}
        body.bdk .bh-l{color:#58a6ff}
        body.bdk .bh-s{color:#8b949e}
        body.bdk .bh-s mark{background:#bb8009;color:#fff}
    `;
    document.head.appendChild(c);

    // ==========================================================
    // PERSISTENCE
    // ==========================================================
    const P=JSON.parse(localStorage.getItem('bhprefs')||'{}');
    const save=()=>localStorage.setItem('bhprefs',JSON.stringify(P));
    if(P.d) document.body.classList.add('bdk');
    if(P.s) document.body.classList.add('bsh');

    // ==========================================================
    // SIDEBAR TOGGLE
    // ==========================================================
    const sideBtn=document.createElement('button');
    sideBtn.id='bh-st';
    sideBtn.textContent='☰';
    sideBtn.title='Toggle sidebar';
    sideBtn.onclick=()=>{
        P.s=document.body.classList.toggle('bsh');
        save();
    };
    document.body.appendChild(sideBtn);

    // ==========================================================
    // DARK MODE TOGGLE
    // ==========================================================
    const darkBtn=document.createElement('button');
    darkBtn.id='bh-dt';
    darkBtn.textContent=P.d?'☀':'🌙';
    darkBtn.title='Toggle dark mode';
    darkBtn.onclick=()=>{
        P.d=document.body.classList.toggle('bdk');
        darkBtn.textContent=P.d?'☀':'🌙';
        save();
    };
    document.body.appendChild(darkBtn);

    // ==========================================================
    // PROGRESS BAR
    // ==========================================================
    const bar=document.createElement('div'); bar.id='bh-bar';
    document.body.appendChild(bar);
    const updBar=()=>{
        const h=document.documentElement;
        const sc=h.scrollTop||document.body.scrollTop||window.pageYOffset;
        const tot=(h.scrollHeight||document.body.scrollHeight)-h.clientHeight;
        bar.style.width=(tot>0?(sc/tot)*100:0)+'%';
    };
    window.addEventListener('scroll',updBar,{passive:true});
    window.addEventListener('resize',updBar);
    updBar();

    // ==========================================================
    // STICKY HEADINGS
    // ==========================================================
    const scope=document.querySelector('.markdown-body')||document.querySelector('.content')||document.body;
    const headings=[...scope.querySelectorAll('h2,h3')];
    headings.forEach(h=>h.classList.add('bh-sh'));

    let rAF=null;
    function updateSticky(){
        rAF=null;
        for(let i=0;i<headings.length;i++){
            const cur=headings[i];
            // Skip headings temporarily suppressed during scroll-to
            if(cur.classList.contains('bh-no-sticky')) continue;
            const next=headings[i+1];
            const curRect=cur.getBoundingClientRect();
            if(curRect.top>0){ if(cur.style.transform) cur.style.transform=''; continue; }
            if(!next){ cur.style.transform=''; continue; }
            const nextRect=next.getBoundingClientRect();
            if(nextRect.top<curRect.height){
                const overlap=curRect.height-Math.max(nextRect.top,0);
                cur.style.transform='translateY(-'+overlap+'px)';
            } else {
                cur.style.transform='';
            }
        }
    }
    function onScroll(){ if(!rAF) rAF=requestAnimationFrame(updateSticky); }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    updateSticky();

    // ==========================================================
    // DISABLE STICKY DURING ANCHOR SCROLLS
    // ==========================================================
    // When any anchor click / hashchange happens, temporarily remove
    // sticky from ALL headings so the browser computes their real
    // layout position. Restore 700ms later.
    let stickySuppressTimer=null;
    function suppressSticky(duration){
        headings.forEach(h=>h.classList.add('bh-no-sticky'));
        clearTimeout(stickySuppressTimer);
        stickySuppressTimer=setTimeout(()=>{
            headings.forEach(h=>h.classList.remove('bh-no-sticky'));
        }, duration||700);
    }

    // Listen to clicks on any sidebar anchor (bubble phase — don't interfere)
    document.addEventListener('click',e=>{
        const a=e.target.closest('a[href^="#"]');
        if(!a) return;
        suppressSticky(900);
    }, false);

    // Also on hashchange (in case platform does it programmatically)
    window.addEventListener('hashchange',()=>suppressSticky(900));

    // ==========================================================
    // SEARCH INDEX
    // ==========================================================
    const blocks=[]; let ch='';
    const w=document.createTreeWalker(scope,NodeFilter.SHOW_ELEMENT,{acceptNode:el=>{
        const t=el.tagName;
        if(/^(H1|H2|H3|H4)$/.test(t)) return NodeFilter.FILTER_ACCEPT;
        if(/^(P|LI|PRE|TD|DD|BLOCKQUOTE)$/.test(t)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
    }});
    let nd;
    while((nd=w.nextNode())){
        const t=nd.tagName;
        if(/^(H1|H2|H3|H4)$/.test(t)){
            ch=nd.textContent.trim();
            if(ch.length>1) blocks.push({e:nd,x:ch,l:ch.toLowerCase(),h:ch});
            continue;
        }
        if(nd.closest('pre')&&t!=='PRE') continue;
        if(nd.closest('li')&&t!=='LI') continue;
        const x=nd.textContent.trim();
        if(x.length<3) continue;
        blocks.push({e:nd,x,l:x.toLowerCase(),h:ch});
    }
    console.log('Indexed '+blocks.length+' blocks.');

    // ==========================================================
    // SEARCH OVERLAY
    // ==========================================================
    const ov=document.createElement('div'); ov.id='bh-ov';
    ov.innerHTML='<div><input id="bh-in" placeholder="Search page…  ↑↓ · Enter · Esc" autocomplete="off" spellcheck="false"><div id="bh-stt">Type at least 2 characters…</div><div id="bh-rs"></div></div>';
    document.body.appendChild(ov);
    const inp=ov.querySelector('#bh-in'), stt=ov.querySelector('#bh-stt'), rs=ov.querySelector('#bh-rs');
    let ai=0, cm=[];

    const eh=s=>s.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    const er=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const sn=(t,q)=>{const lo=t.toLowerCase(),i=lo.indexOf(q.toLowerCase());if(i<0)return eh(t.slice(0,200));const a=Math.max(0,i-60),b=Math.min(t.length,i+q.length+100);return eh((a>0?'…':'')+t.slice(a,b)+(b<t.length?'…':'')).replace(new RegExp('('+er(q)+')','gi'),'<mark>$1</mark>');};

    const rd=q=>{
        const Q=q.trim().toLowerCase(); rs.innerHTML='';
        if(Q.length<2){ stt.textContent='Type at least 2 characters…'; cm=[]; return; }
        cm=blocks.filter(b=>b.l.includes(Q)).slice(0,100);
        stt.textContent=cm.length?cm.length+' match'+(cm.length===1?'':'es'):'No matches for "'+q+'"';
        if(!cm.length){ rs.innerHTML='<div style="padding:30px;text-align:center;color:#8b949e;font-size:13px">No matches</div>'; return; }
        ai=0;
        cm.forEach((m,i)=>{
            const r=document.createElement('div');
            r.className='bh-i'+(i?'':' on');
            r.dataset.i=i;
            r.innerHTML='<div class="bh-l">§ '+eh(m.h||'(top)')+'</div><div class="bh-s">'+sn(m.x,q.trim())+'</div>';
            rs.appendChild(r);
        });
    };
    const sa=i=>{
        const r=rs.children; if(!r.length) return;
        ai=Math.max(0,Math.min(i,r.length-1));
        [...r].forEach((x,j)=>x.classList.toggle('on',j===ai));
        r[ai].scrollIntoView({block:'nearest'});
    };
    const jp=m=>{
        if(!m) return;
        cl();
        // Suppress sticky so the browser can see the real position
        suppressSticky(900);
        // Use the platform's own scrollIntoView smooth behavior
        m.e.scrollIntoView({behavior:'smooth', block:'start'});
        const pb=m.e.style.backgroundColor, pt=m.e.style.transition;
        m.e.style.transition='background-color .4s';
        m.e.style.backgroundColor='rgba(255,235,59,.4)';
        setTimeout(()=>{ m.e.style.backgroundColor=pb; m.e.style.transition=pt; }, 900);
    };
    const op=()=>{ ov.classList.add('on'); inp.value=''; rd(''); setTimeout(()=>inp.focus(),30); };
    const cl=()=>ov.classList.remove('on');

    let iT;
    inp.addEventListener('input',()=>{ clearTimeout(iT); iT=setTimeout(()=>rd(inp.value),80); });
    inp.addEventListener('keydown',e=>{
        if(e.key==='ArrowDown'){e.preventDefault();sa(ai+1);}
        else if(e.key==='ArrowUp'){e.preventDefault();sa(ai-1);}
        else if(e.key==='Enter'){e.preventDefault();jp(cm[ai]);}
        else if(e.key==='Escape'){e.preventDefault();cl();}
    });
    rs.addEventListener('mousedown',e=>{
        const r=e.target.closest('.bh-i'); if(!r) return;
        e.preventDefault();
        jp(cm[+r.dataset.i]);
    });
    ov.addEventListener('mousedown',e=>{ if(e.target===ov) cl(); });

    document.addEventListener('keydown',e=>{
        if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){
            e.preventDefault();
            ov.classList.contains('on') ? cl() : op();
        }
    }, true);

    const hint=document.createElement('div');
    hint.id='bh-hint';
    hint.textContent='Ctrl+K · Search';
    hint.title='Open search';
    hint.onclick=op;
    document.body.appendChild(hint);

    window.__bhCleanup=()=>{
        window.removeEventListener('scroll',updBar);
        window.removeEventListener('resize',updBar);
        window.removeEventListener('scroll',onScroll);
        window.removeEventListener('resize',onScroll);
    };

    console.log('✅ Ready — sidebar · dark · sticky (with anchor-safe scroll) · progress · search.');
})();
