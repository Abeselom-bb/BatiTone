/*  colour-tuner – dead-simple guitar tuner  */
(() => {
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>r.querySelectorAll(s);

  const modal  = $("#colourTunerModal");
  const btnOpn = $("#tunerBtn");        // add this button wherever you like
  const btnCls = $("#ctClose");
  const btnMic = $("#ctMic");
  const info   = {note:$("#ctNote"),cents:$("#ctCents"),hz:$("#ctHz")};

  if (!modal) return;

  /* ---------- audio ---------- */
  let ctx, analyser, buf, stream, running=false, rAF=0;
  let targetMidi = null;

  const A4=440, NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const midiToHz=m=>A4*Math.pow(2,(m-69)/12);
  const hzToMidi=f=>69+12*Math.log2(f/A4);

  /* ---------- open / close ---------- */
  btnOpn.onclick = () => modal.classList.add("open");
  btnCls.onclick = () => { modal.classList.remove("open"); stopMic(); };

  /* ---------- string buttons ---------- */
  $$(".ct-string").forEach(b=>{
    b.addEventListener("click",()=>{
      $$(".ct-string").forEach(x=>x.classList.remove("active","inTune"));
      b.classList.add("active");
      targetMidi = +b.dataset.midi;
    });
  });

  /* ---------- mic ---------- */
  async function startMic(){
    try{
      ctx = new (window.AudioContext||window.webkitAudioContext)();
      await ctx.resume();
      stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      buf = new Float32Array(analyser.frequencyBinCount);
      src.connect(analyser);
      running = true;
      btnMic.textContent = "Mic On"; btnMic.classList.add("primary");
      loop();
    }catch(e){
      alert("Mic not available"); stopMic();
    }
  }
  function stopMic(){
    running = false; if (rAF) cancelAnimationFrame(rAF), rAF=0;
    if (stream) stream.getTracks().forEach(t=>t.stop()), stream=null;
    if (ctx) ctx.close().catch(()=>{}), ctx=null;
    btnMic.textContent = "Enable Mic"; btnMic.classList.remove("primary");
  }
  btnMic.onclick = () => running ? stopMic() : startMic();

  /* ---------- pitch ---------- */
  function autoCorrelate(x,sr){
    const L=x.length; let rms=0;
    for (let i=0;i<L;i++) rms+=x[i]*x[i];
    rms=Math.sqrt(rms/L); if (rms<0.01) return -1;
    let bestK=-1, best=0;
    for (let k=8;k<1024;k++){
      let sum=0; for (let i=0;i<L-k;i++) sum+=x[i]*x[i+k];
      if (sum>best) best=sum, bestK=k;
    }
    return bestK>0 ? sr/bestK : -1;
  }

  /* ---------- main loop ---------- */
  function loop(){
    if (!running) return;
    analyser.getFloatTimeDomainData(buf);
    const hz = autoCorrelate(buf,ctx.sampleRate);
    if (hz>0 && targetMidi!==null){
      const estMidi = Math.round(hzToMidi(hz));
      const cents = Math.round(1200*Math.log2(hz/midiToHz(targetMidi)));
      const absC = Math.abs(cents);

      info.note.textContent = NAMES[(estMidi%12+12)%12]+(Math.floor(estMidi/12)-1);
      info.cents.textContent = (cents>0?"+":"")+cents+"¢";
      info.hz.textContent = hz.toFixed(1)+" Hz";

      const activeBtn = $(".ct-string.active");
      if (activeBtn){
        activeBtn.classList.toggle("inTune", absC<=5);
      }
    }else{
      info.note.textContent="—"; info.cents.textContent="—"; info.hz.textContent="—";
    }
    rAF = requestAnimationFrame(loop);
  }
})();