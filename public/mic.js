// public/mic.js
window.Mic = (() => {
  let ctx, src, analyser, buf, running=false;
  let onPitch = ()=>{}, onOnset = ()=>{};

  async function enable() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    running = true;
    loop();
    return true;
  }

  function loop(){
    if(!running) return;
    analyser.getFloatTimeDomainData(buf);
    // --- pitch (autocorrelation) ---
    const hz = autoCorrelate(buf, ctx.sampleRate);      // -1 if silence
    if (hz > 0) onPitch(hz);

    // --- rhythm (simple onset via zero-crossings energy spike) ---
    const zc = zeroCrossings(buf);
    if (zc > 65) onOnset(ctx.currentTime);

    requestAnimationFrame(loop);
  }

  function setHandlers({ pitch, onset }={}) {
    if (pitch) onPitch = pitch;
    if (onset) onOnset = onset;
  }

  // helpers
  function autoCorrelate(x, sr){
    let SIZE=x.length, rms=0;
    for(let i=0;i<SIZE;i++){ const v=x[i]; rms+=v*v; }
    rms = Math.sqrt(rms/SIZE);
    if (rms<0.01) return -1; // too quiet
    let best=0, bestK=-1;
    for(let k=8;k<1024;k++){
      let sum=0; for(let i=0;i<SIZE-k;i++) sum += x[i]*x[i+k];
      if (sum>best){ best=sum; bestK=k; }
    }
    return bestK>0 ? sr/bestK : -1;
  }
  function zeroCrossings(a){ let c=0; for(let i=1;i<a.length;i++) if ((a[i-1]<0)!==(a[i]<0)) c++; return c; }

  // note/cents helpers
  function hzToMidi(f){ return 69 + 12*Math.log2(f/440); }
  function midiToHz(m){ return 440 * Math.pow(2,(m-69)/12); }
  function centsOff(f){
    const m = Math.round(hzToMidi(f));
    const ref = midiToHz(m);
    return { noteMidi: m, noteHz: ref, cents: Math.round(1200*Math.log2(f/ref)) };
  }

  return { enable, setHandlers, centsOff };
})();
