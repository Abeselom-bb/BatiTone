// public/audioEngine.js
// Tone.Sampler using Salamander piano with low-latency settings.
// Exposes state() for quick debugging.

(function () {
  // ---- low-latency audio context tweaks ----
  const ctx = Tone.getContext();
  ctx.latencyHint = "interactive";   // prefer lowest latency
  ctx.updateInterval = 0.01;         // control-rate updates (~30ms)
  Tone.Transport.lookAhead = 0.1; // 100ms is safe for low latency
  ctx.updateInterval = 0.016; // 60fps

  const BASE = "https://tonejs.github.io/audio/salamander/";
  const URLS = {
    A0:"A0.mp3", C1:"C1.mp3", "D#1":"Ds1.mp3", "F#1":"Fs1.mp3",
    A1:"A1.mp3", C2:"C2.mp3", "D#2":"Ds2.mp3", "F#2":"Fs2.mp3",
    A2:"A2.mp3", C3:"C3.mp3", "D#3":"Ds3.mp3", "F#3":"Fs3.mp3",
    A3:"A3.mp3", C4:"C4.mp3", "D#4":"Ds4.mp3", "F#4":"Fs4.mp3",
    A4:"A4.mp3", C5:"C5.mp3", "D#5":"Ds5.mp3", "F#5":"Fs5.mp3",
    A5:"A5.mp3", C6:"C6.mp3", "D#6":"Ds6.mp3", "F#6":"Fs6.mp3",
    A6:"A6.mp3", C7:"C7.mp3", "D#7":"Ds7.mp3", "F#7":"Fs7.mp3",
    A7:"A7.mp3", C8:"C8.mp3"
  };

  let sampler = null, gain = null, loaded = false;
  let sustainOn = false;
  const held = new Set();

  // unlock on first gesture
  window.addEventListener("pointerdown", () => { Tone.start().catch(()=>{}); }, { once: true });

  let loadPromise = null;
  async function ensure() {
    if (loaded && sampler) return;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      await Tone.start().catch(()=>{});
      if (!gain) gain = new Tone.Gain(Tone.dbToGain(-6)).toDestination();
      sampler = new Tone.Sampler({
        urls: URLS, baseUrl: BASE, attack: 0.0, release: 0.6,
        onload: () => { loaded = true; }
      }).connect(gain);
      await sampler.loaded; // wait for buffers
      loaded = true;
    })();
    return loadPromise;
  }

  function setVolume(db) {
    if (!gain) return;
    gain.gain.value = Tone.dbToGain(Number(db) || -6);
  }

  function setSustain(on) {
    sustainOn = !!on;
    if (!sustainOn) {
      for (const n of Array.from(held)) {
        try { sampler.triggerRelease(n); } catch {}
        held.delete(n);
      }
    }
  }

  function stopAll() {
    try { sampler.releaseAll && sampler.releaseAll(); } catch {}
    held.clear();
  }

  // immediate, low-jitter trigger using audio clock
  // replace playNote with immediate scheduling on the audio clock
async function playNote(note, durSec = 0.06, velocity = 0.95) {
  await ensure();
  const t = Tone.now();                 // audio-time, not JS timers
  if (!sustainOn) {
    sampler.triggerAttack(note, t, velocity);
    sampler.triggerRelease(note, t + Math.max(0.03, durSec));
  } else {
    sampler.triggerAttack(note, t, velocity);
    held.add(note);
  }
}


  async function playSequence(notes, stepSec = 0.9, velocity = 0.95) {
    await ensure();
    const t0 = Tone.now();
    notes.forEach((n, i) =>
      sampler.triggerAttackRelease(n, Math.max(0.05, stepSec * 0.9), t0 + i * stepSec, velocity)
    );
  }

  async function playChord(notes, mode = "harmonic", velocity = 0.95) {
    await ensure();
    if (mode === "harmonic") {
      const now = Tone.now();
      notes.forEach(n => sampler.triggerAttack(n, now, velocity));
      if (!sustainOn) setTimeout(() => notes.forEach(n => sampler.triggerRelease(n)), 800);
      else notes.forEach(n => held.add(n));
    } else {
      await playSequence(notes, 0.6, velocity);
    }
  }

  function state() {
    return {
      tone: Tone.getContext().state,
      hasSampler: !!sampler,
      loaded,
      using: "Sampler",
    };
  }

  window.AudioEngine = { ensure, playNote, playSequence, playChord, setVolume, setSustain, stopAll, state };
})();
