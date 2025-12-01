/* ===== MINI TUNER v3  (needle moves + yellow arc + sound fix) ===== */
(() => {
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>r.querySelectorAll(s);

  const box     = $("#miniTuner");
  const head    = $(".mini-head");
  const micBtn  = $("#mtMic");
  const autoChk = $("#mtAuto");
  const close   = $("#mtClose");

  let ctx, analyser, buf, stream, running=false, target=40, auto=false;
  const NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const STRINGS=[{midi:40,name:"E2"},{midi:45,name:"A2"},{midi:50,name:"D3"},
                 {midi:55,name:"G3"},{midi:59,name:"B3"},{midi:64,name:"E4"}];

  const midiToHz=m=>440*Math.pow(2,(m-69)/12);
  const hzToMidi=f=>69+12*Math.log2(f/440);

  /* ---- show / hide ---- */
  $("#popTunerBtn").onclick = () => {
    box.classList.add("show");
    if (!running) micBtn.click();   // auto-start mic
  };
  close.onclick = () => {
    box.classList.remove("show");
    if (running) stop();
  };

  /* ---- drag ---- */
  let dragging=false, offsetX, offsetY;
  head.addEventListener("mousedown", e=>{
    dragging=true; offsetX=e.clientX-box.offsetLeft; offsetY=e.clientY-box.offsetTop;
  });
  window.addEventListener("mousemove", e=>{
    if (!dragging) return;
    box.style.left=(e.clientX-offsetX)+"px"; box.style.top=(e.clientY-offsetTop)+"px";
    box.style.right="auto"; box.style.bottom="auto";
  });
  window.addEventListener("mouseup", ()=>dragging=false);

  /* ---- resize ---- */
  const resize=$(".resize-handle");
  resize.addEventListener("mousedown", e=>{
    e.stopPropagation();
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
  });
  function doResize(e){
    box.style.width=(e.clientX-box.offsetLeft)+"px";
    box.style.height=(e.clientY-box.offsetTop)+"px";
  }
  function stopResize(){
    window.removeEventListener("mousemove", doResize);
    window.removeEventListener("mouseup", stopResize);
  }

  /* ---- string buttons ---- */
  $$(".str-btn").forEach((b,i)=>{
    b.onclick=()=>{
      $$(".str-btn").forEach(x=>x.classList.remove("active","inTune"));
      b.classList.add("active");
      target= +b.dataset.midi; auto=false; autoChk.checked=false;
    };
  });

  /* ---- auto mode ---- */
  autoChk.onchange=e=>auto=e.target.checked;

  /* ---- mic ---- */
  micBtn.onclick=()=>running?stop():start();
  async function start(){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    await ctx.resume();
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    analyser=ctx.createAnalyser(); analyser.fftSize=2048;
    buf=new Float32Array(analyser.frequencyBinCount);
    ctx.createMediaStreamSource(stream).connect(analyser);
    running=true; micBtn.classList.add("on"); buildGauge(); loop();
  }
  function stop(){
    running=false; if (stream) stream.getTracks().forEach(t=>t.stop()), stream=null;
    if (ctx) ctx.close();
    micBtn.classList.remove("on");
  }

  /* ---- pitch detector ---- */
  function autoCorrelate(x,sr){
    const L=x.length; let rms=0;
    for (let i=0;i<L;i++) rms+=x[i]*x[i];
    rms=Math.sqrt(rms/L); if (rms<0.01) return -1;
    let bestK=-1,best=0;
    for (let k=8;k<1024;k++){
      let sum=0; for (let i=0;i<L-k;i++) sum+=x[i]*x[i+k];
      if (sum>best) best=sum,bestK=k;
    }
    return bestK>0 ? sr/bestK : -1;
  }

  /* ---- beep on perfect tune ---- */
  let lastInTune=false;
  function beep(){
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.frequency.value=880;
    osc.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.15);
    osc.start(); osc.stop(ctx.currentTime+0.16);
  }

  /* ---- gauge SVG (bottom-pivot + yellow arc) ---- */
  let needle, lastTS=0, ang=0, vel=0;
  const K=42, D=14; // critically-damped
  function buildGauge(){
    const g=$("#mtGauge"); g.innerHTML="";
    /* yellow half-circle background */
    g.appendChild(arc(100,100,80,Math.PI,0,"arc-bg"));
    g.appendChild(arc(100,100,80,Math.PI*0.8,Math.PI*0.2,"arc-yellow"));
    /* ticks / labels */
    for (let c=-40;c<=40;c+=5){
      const a=map(c,-40,40,Math.PI,0);
      const r1=80,r2=c%10?75:70;
      const p1=polar(100,100,r1,a),p2=polar(100,100,r2,a);
      g.appendChild(line(p1.x,p1.y,p2.x,p2.y,"tick"+(c%10?"":" major")));
      if (c%20===0) g.appendChild(text(polar(100,100,65,a),(c>0?"+":"")+c,"tick-label"+(c?"":" zero")));
    }
    /* needle group – pivots at bottom centre (100,100) */
    needle=el("g",{class:"needle"});
    needle.appendChild(line(100,100,100,20,"needle-red")); // 20 px up
    g.appendChild(needle);
    g.appendChild(circle(100,100,6,"needle-hub"));
    return needle;
  }

  /* ---- main loop ---- */
  function loop(){
    if (!running) return;
    analyser.getFloatTimeDomainData(buf);
    const hz=autoCorrelate(buf,ctx.sampleRate);   //  <-- FIXED sampleRate
    const now=performance.now();
    const dt=Math.max(0.001,(now-lastTS)/1000); lastTS=now;

    if (hz>0){
      const est=hzToMidi(hz);
      if (auto && target===null){
        let best=STRINGS[0],dMin=999;
        STRINGS.forEach(s=>{ const d=Math.abs(est-s.midi); if (d<dMin) dMin=d,best=s; });
        target=best.midi;
        STRINGS.forEach((s,i)=>{
          const btn=$$(".str-btn")[i];
          btn.classList.toggle("active",s.midi===target);
        });
      }
      if (target!==null){
        const cents=Math.round(1200*Math.log2(hz/midiToHz(target)));
        const clamped=Math.max(-50,Math.min(50,cents));
        const targetDeg=map(clamped,-50,50,-60,60);

        /* damped motion */
        const acc=K*(targetDeg-ang)-D*vel;
        vel+=acc*dt; ang+=vel*dt;
        needle.style.transform=`rotate(${ang}deg)`;

        $("#mtNote").textContent=NAMES[(Math.round(est)%12+12)%12]+(Math.floor(Math.round(est)/12)-1);
        $("#mtCents").textContent=(cents>=0?"+":"")+cents+"¢";
        $("#mtHz").textContent=hz.toFixed(1)+" Hz";

        const inTune=Math.abs(cents)<=5;
        const activeBtn=$(".str-btn.active");
        if (activeBtn) activeBtn.classList.toggle("inTune",inTune);
        if (inTune && !lastInTune) beep();   //  <-- beep only once per perfect hit
        lastInTune=inTune;
      }
    }else{
      $("#mtNote").textContent="—"; $("#mtCents").textContent="—"; $("#mtHz").textContent="—";
      const acc=K*(0-ang)-D*vel; vel+=acc*dt; ang+=vel*dt;
      needle.style.transform=`rotate(${ang}deg)`;
      lastInTune=false;
    }
    requestAnimationFrame(loop);
  }
  /* ---- string buttons ---- */
$$(".str-btn").forEach((b,i)=>{
  b.onclick=()=>{
    $$(".str-btn").forEach(x=>x.classList.remove("active","inTune"));
    b.classList.add("active");
    target= +b.dataset.midi;
    auto=false;               // 1. turn auto off
    autoChk.checked=false;    // 2. un-check the box
  };
});

/* ---- auto mode ---- */
autoChk.onchange=e=>{
  auto=e.target.checked;
  if (auto) target=null;     // let auto find closest again
};

/* inside buildGauge() – bright yellow gradient */
const defs=el("defs",{});
const grad=el("linearGradient",{id:"yellowGrad",x1:"0%",y1:"0%",x2:"0%",y2:"100%"});
grad.appendChild(el("stop",{offset:"0%","stop-color":"#FFDD44"}));
grad.appendChild(el("stop",{offset:"100%","stop-color":"#FFC700"}));
defs.appendChild(grad);
const g = $("#mtGauge");   // or document.getElementById("mtGauge") if you prefer
g.appendChild(defs);


  /* ---- SVG helpers ---- */
  function el(t,atts,txt){
    const e=document.createElementNS("http://www.w3.org/2000/svg",t);
    for (const k in atts) e.setAttribute(k,atts[k]);
    if (txt) e.textContent=txt; return e;
  }
  function arc(cx,cy,r,a1,a2,cls){
    const large=Math.abs(a2-a1)>Math.PI?1:0;
    const p1=polar(cx,cy,r,a1),p2=polar(cx,cy,r,a2);
    return el("path",{d:`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`,class:cls});
  }
  function polar(cx,cy,r,a){return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
  function map(v,a,b,c,d){return (v-a)/(b-a)*(d-c)+c}
  function line(x1,y1,x2,y2,cls){return el("line",{x1,y1,x2,y2,class:cls})}
  function circle(cx,cy,r,cls){return el("circle",{cx,cy,r,class:cls})}
  function text(pos,txt,cls){return el("text",{x:pos.x,y:pos.y,"text-anchor":"middle",class:cls},txt)}
})();