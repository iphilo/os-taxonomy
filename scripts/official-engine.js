<script>
(function(){
  "use strict";
  const DATA=JSON.parse(document.getElementById('graphdata').textContent);
  const GROUPS=DATA.groups, N=DATA.nodes, E=DATA.edges, H=DATA.H;
  const MID=String.fromCharCode(183);
  const reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // legend swatch colors per subject family (nodes carry their own domain color)
  const GCOL=DATA.gcol;

  document.getElementById('nCount').textContent=N.length;
  document.getElementById('eCount').textContent=E.length;

  // center world on funnel axis; y up
  N.forEach(n=>{ n.py=n.y-H/2; });

  // prerequisite adjacency
  const incident=Array.from({length:N.length},()=>[]);
  const directPre=Array.from({length:N.length},()=>[]);   // e[0] depends on e[1] (prereq)
  const directNext=Array.from({length:N.length},()=>[]);  // e[1] unlocks e[0]
  E.forEach((e,i)=>{
    incident[e[0]].push(i); incident[e[1]].push(i);
    directPre[e[0]].push(e[1]); directNext[e[1]].push(e[0]);
  });

  // growth animation keyed to height
  N.forEach(n=>{ n.appear=n.y/H; });

  const wrap=document.getElementById('wrap');
  const cv=document.getElementById('cv');
  const ctx=cv.getContext('2d');
  let DPR=1,VW=0,VH=0;
  function resize(){
    DPR=Math.min(window.devicePixelRatio||1,2);
    VW=wrap.clientWidth; VH=wrap.clientHeight;
    cv.width=VW*DPR; cv.height=VH*DPR; cv.style.width=VW+'px'; cv.style.height=VH+'px';
  }

  // ---- camera ----
  let rotY=0.6, tilt=-0.32, zoom=1, spin=reduce?0:0.00018;
  const FOV=1400;
  let grow=reduce?1:0;

  // projected cache per frame
  const P=new Float32Array(N.length*3); // sx, sy, depth-scale

  function project(){
    const cy=Math.cos(rotY), sy=Math.sin(rotY);
    const ct=Math.cos(tilt), st=Math.sin(tilt);
    const cx=VW*0.52, cyy=VH*0.52;
    const sc=Math.min(VW/1500,VH/1780)*zoom;
    for(let i=0;i<N.length;i++){
      const n=N[i];
      let x=n.x*cy+n.z*sy, z=-n.x*sy+n.z*cy, y=n.py;
      let y2=y*ct-z*st, z2=y*st+z*ct;
      const pf=FOV/(FOV+z2*sc*1.6);
      P[i*3]=cx+x*sc*pf;
      P[i*3+1]=cyy-y2*sc*pf;
      P[i*3+2]=pf;
    }
  }

  // ---- state ----
  const active=new Set(GROUPS.map((_,i)=>i));
  let hover=-1, selected=-1, lineage=null;

  function buildLineage(i){
    const nodes=new Set([i]), edges=new Set(), q=[i];
    while(q.length){
      const u=q.shift();
      for(const idx of incident[u]){
        const e=E[idx];
        if(e[0]===u){ edges.add(idx); if(!nodes.has(e[1])){nodes.add(e[1]);q.push(e[1]);} }
      }
    }
    lineage={nodes,edges};
  }

  // ---- interaction ----
  let dragging=false,moved=false,lx=0,ly=0;
  wrap.addEventListener('pointerdown',e=>{
    dragging=true;moved=false;lx=e.clientX;ly=e.clientY;
    wrap.classList.add('drag'); wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove',e=>{
    if(dragging){
      const dx=e.clientX-lx,dy=e.clientY-ly;
      if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
      rotY+=dx*0.0055; tilt=Math.max(-1.1,Math.min(0.15,tilt-dy*0.003));
      lx=e.clientX; ly=e.clientY;
    } else onHover(e);
  });
  wrap.addEventListener('pointerup',e=>{
    dragging=false; wrap.classList.remove('drag');
    if(!moved) onClick(e);
  });
  wrap.addEventListener('pointerleave',()=>{hideTip();hover=-1;});
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    zoom=Math.max(.5,Math.min(4,zoom*Math.exp(-e.deltaY*0.0016)));
  },{passive:false});
  let pts=new Map(),pinchD=0;
  wrap.addEventListener('pointerdown',e=>pts.set(e.pointerId,[e.clientX,e.clientY]));
  wrap.addEventListener('pointermove',e=>{
    if(pts.has(e.pointerId))pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(pts.size===2){
      const[a,b]=[...pts.values()];const dd=Math.hypot(a[0]-b[0],a[1]-b[1]);
      if(pinchD)zoom=Math.max(.5,Math.min(4,zoom*dd/pinchD));
      pinchD=dd;dragging=false;
    }
  });
  wrap.addEventListener('pointerup',e=>{pts.delete(e.pointerId);if(pts.size<2)pinchD=0;});

  function nodeR(i){
    return (2.3+Math.sqrt(N[i].c)*7.5)*P[i*3+2]*Math.min(1.6,Math.max(.9,zoom));
  }
  function pick(mx,my){
    let best=-1,bd=20*20;
    for(let i=0;i<N.length;i++){
      if(!active.has(N[i].g))continue;
      const dx=P[i*3]-mx,dy=P[i*3+1]-my,d=dx*dx+dy*dy;
      const rr=Math.max(11,nodeR(i)+6);
      if(d<rr*rr&&d<bd){bd=d;best=i;}
    }
    return best;
  }
  function onHover(e){
    const r=cv.getBoundingClientRect();
    const i=pick(e.clientX-r.left,e.clientY-r.top);
    if(i!==hover){hover=i;i>=0?showTip(i,e):hideTip();}
    else if(i>=0)placeTip(e);
    spin = (hover>=0||selected>=0||reduce)?0:0.00018;
  }
  // ---- selection + prerequisite explorer ----
  const hist=[];                       // navigation back-stack
  let rotYTarget=null, tiltTarget=null, zoomTarget=null;   // camera focus tween

  function focusNode(i){
    // rotate so node i faces front-centre; pick the nearer of the two solutions
    const n=N[i];
    let best=null, bestZ=Infinity;
    for(const cand of [Math.atan2(-n.x,n.z), Math.atan2(-n.x,n.z)+Math.PI]){
      const z2=-n.x*Math.sin(cand)+n.z*Math.cos(cand);
      if(z2<bestZ){bestZ=z2;best=cand;}
    }
    rotYTarget=best; tiltTarget=-0.18; zoomTarget=Math.max(zoom,1.5);
  }
  function onClick(e){
    const r=cv.getBoundingClientRect();
    const i=pick(e.clientX-r.left,e.clientY-r.top);
    if(i<0){clearSel();return;}
    selectNode(i,true);
  }
  function selectNode(i,push){
    if(push && selected>=0 && selected!==i) hist.push(selected);
    selected=i; buildLineage(i); showCard(i); focusNode(i); spin=0;
    hideTip();
  }
  function goBack(){
    if(!hist.length) return;
    selectNode(hist.pop(), false);
  }
  function clearSel(){
    selected=-1;lineage=null;hist.length=0;
    rotYTarget=null;tiltTarget=null;zoomTarget=null;
    document.getElementById('card').classList.remove('on');
    if(!reduce)spin=0.00018;
  }

  // ---- tooltip / card ----
  const tip=document.getElementById('tip');
  function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function showTip(i,e){
    const n=N[i];
    tip.querySelector('.sw').style.background=n.col;
    tip.querySelector('.ts').textContent=n.dm+' '+MID+' age '+n.a;
    tip.querySelector('.ttl').textContent=n.t;
    tip.querySelector('.q').innerHTML=n.q?esc(n.q):'';
    tip.classList.add('on');placeTip(e);
  }
  function placeTip(e){
    const r=wrap.getBoundingClientRect();
    let x=e.clientX-r.left+16,y=e.clientY-r.top+16;
    const w=tip.offsetWidth,h=tip.offsetHeight;
    if(x+w>VW-8)x=e.clientX-r.left-w-16;
    if(y+h>VH-8)y=e.clientY-r.top-h-16;
    tip.style.left=x+'px';tip.style.top=y+'px';
  }
  function hideTip(){tip.classList.remove('on');}

  const card=document.getElementById('card');
  // panels sit inside #wrap; keep their pointer/wheel events from reaching the
  // canvas drag/zoom/click handlers (otherwise a row click also fires onClick).
  ['pointerdown','pointerup','click','wheel'].forEach(ev=>{
    card.addEventListener(ev, e=>e.stopPropagation());
    document.getElementById('legend').addEventListener(ev, e=>e.stopPropagation());
  });
  card.querySelector('.close').addEventListener('click',clearSel);
  card.querySelector('.back').addEventListener('click',goBack);
  function fillRows(container, idxs){
    container.innerHTML='';
    if(!idxs.length){
      const d=document.createElement('div'); d.className='empty'; d.textContent='nothing yet'; container.appendChild(d); return;
    }
    idxs.slice().sort((a,b)=>N[a].a-N[b].a).forEach(j=>{
      const m=N[j], b=document.createElement('button'); b.className='row';
      b.innerHTML='<span class="rdot" style="background:'+m.col+'"></span>'+
        '<span class="rt">'+esc(m.t)+'</span><span class="ra mono">age '+m.a+'</span>';
      b.addEventListener('click',()=>selectNode(j,true));
      container.appendChild(b);
    });
  }
  function showCard(i){
    const n=N[i],cnt=lineage.nodes.size-1;
    card.querySelector('.sw').style.background=n.col;
    card.querySelector('.cs').textContent=n.dm+' '+MID+' age '+n.a;
    card.querySelector('.ctl').textContent=n.t;
    card.querySelector('.cq').innerHTML=n.q?esc(n.q):'';
    card.querySelector('.n').textContent=cnt;
    card.querySelector('.u').textContent=cnt===1?'prerequisite in total':'prerequisites in total';
    card.querySelector('.sub').textContent=cnt>0
      ?'Everything a learner must master before this one, traced all the way back.'
      :'A starting point. Nothing has to come before it.';
    const pre=directPre[i], nxt=directNext[i];
    card.querySelector('.sec-pre .k').textContent=pre.length?pre.length:'';
    card.querySelector('.sec-next .k').textContent=nxt.length?nxt.length:'';
    fillRows(card.querySelector('.rows-pre'), pre);
    fillRows(card.querySelector('.rows-next'), nxt);
    card.querySelector('.back').classList.toggle('on', hist.length>0);
    card.scrollTop=0;
    card.classList.add('on');
  }

  // ---- legend ----
  const chips=document.getElementById('chips');
  const counts=GROUPS.map(()=>0);N.forEach(n=>counts[n.g]++);
  GROUPS.forEach((s,i)=>{
    const el=document.createElement('div');el.className='chip';el.tabIndex=0;
    el.setAttribute('role','button');el.setAttribute('aria-pressed','true');
    el.innerHTML='<span class="sw" style="background:'+GCOL[i]+'"></span>'+
      '<span class="nm">'+esc(s)+'</span><span class="ct mono">'+counts[i]+'</span>';
    const toggle=()=>{
      if(active.has(i)){active.delete(i);el.classList.add('off');el.setAttribute('aria-pressed','false');}
      else{active.add(i);el.classList.remove('off');el.setAttribute('aria-pressed','true');}
    };
    el.addEventListener('click',toggle);
    el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle();}});
    chips.appendChild(el);
  });

  function hex2rgb(h){const n=parseInt(h.slice(1),16);return(n>>16)+','+((n>>8)&255)+','+(n&255);}
  const RGB=N.map(n=>hex2rgb(n.col));

  // draw order by depth (painter's algorithm)
  const order=N.map((_,i)=>i);

  function draw(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,VW,VH);
    project();

    const hasSel=!!lineage;

    // ---- edges (behind dots) ----
    for(let k=0;k<E.length;k++){
      const e=E[k],a=e[0],b=e[1];
      if(!active.has(N[a].g)||!active.has(N[b].g))continue;
      if(!reduce&&(N[a].appear>grow||N[b].appear>grow))continue;
      let alpha,col=null,lw=1;
      if(hasSel){
        if(lineage.edges.has(k)){alpha=.75;col=RGB[b];lw=1.6;}
        else{alpha=.04;}
      } else {
        alpha=e[2]?.10:.05;
      }
      const depth=(P[a*3+2]+P[b*3+2])/2;
      ctx.strokeStyle=col?'rgba('+col+','+alpha+')':'rgba(150,165,205,'+(alpha*depth)+')';
      ctx.lineWidth=lw;
      ctx.beginPath();
      ctx.moveTo(P[a*3],P[a*3+1]);ctx.lineTo(P[b*3],P[b*3+1]);
      ctx.stroke();
    }

    // ---- dots, far-to-near ----
    order.sort((a,b)=>P[a*3+2]-P[b*3+2]);
    for(const i of order){
      const n=N[i];
      if(!active.has(n.g))continue;
      if(!reduce&&n.appear>grow)continue;
      const inLin=hasSel?lineage.nodes.has(i):true;
      const isFocus=(i===selected)||(i===hover);
      let dim=1;
      if(hasSel&&!inLin)dim=0.10;
      const sx=P[i*3],sy=P[i*3+1],pf=P[i*3+2];
      const r=nodeR(i)*(isFocus?1.6:1);
      const rgb=RGB[i];
      // depth fog on the base color
      const a=dim*(0.55+0.45*Math.min(1,pf*pf));
      // subtle rim glow only on focus/lineage
      if(isFocus||(hasSel&&inLin)){
        ctx.shadowColor='rgb('+rgb+')';ctx.shadowBlur=isFocus?18:9;
      } else ctx.shadowBlur=0;
      ctx.fillStyle='rgba('+rgb+','+a+')';
      ctx.beginPath();ctx.arc(sx,sy,r,0,6.2832);ctx.fill();
      ctx.shadowBlur=0;
      // darker edge ring gives dots definition against same-color neighbors
      ctx.strokeStyle='rgba(8,10,18,'+(0.5*dim)+')';
      ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(sx,sy,r,0,6.2832);ctx.stroke();
      if(isFocus){
        ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.arc(sx,sy,r+2.5,0,6.2832);ctx.stroke();
      }
    }
  }

  // wall-clock anchored: robust to rAF throttling in background/occluded tabs
  const START=performance.now();
  let lastTs=START;
  function frame(ts){
    if(!reduce) grow=Math.min(1.02,(ts-START)/2800*1.02);
    const dt=Math.min(64,ts-lastTs); lastTs=ts;
    rotY+=spin*dt;
    if(rotYTarget!==null){
      let d=((rotYTarget-rotY+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
      rotY+=d*0.12;
      if(tiltTarget!==null) tilt+=(tiltTarget-tilt)*0.12;
      if(zoomTarget!==null) zoom+=(zoomTarget-zoom)*0.12;
      if(Math.abs(d)<0.008){rotYTarget=null;tiltTarget=null;zoomTarget=null;}
    }
    draw();
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize',()=>{resize();});
  resize();
  requestAnimationFrame(frame);
})();
</script>