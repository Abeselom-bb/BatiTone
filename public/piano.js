// public/piano.js
// - Multi-octave keyboard (#octSel end + #octCount count)
// - Visual press feedback
// - Persist prefs per user (octaves, sustain, volume)
// - Spacebar pedal; A–K keyboard mapping

(function () {
  const piano = document.getElementById("pianoCollapsible");
  if (!piano) return;

  const whiteOrder = ["C", "D", "E", "F", "G", "A", "B"];
  const blackMap   = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

  const octSel   = document.getElementById("octSel");
  const octCount = document.getElementById("octCount");
  const sustainC = document.getElementById("sustain");
  const volumeR  = document.getElementById("volume");

  // layout constants
  const WHITE_W = 42;
  const WHITE_M = 2;
  const BLACK_OFFSET = 28; // px from left edge of its paired white

  // ---------- prefs ----------
  const userId = (window.API?.me?._id) || "anon";
  const PREFK = `prefs_${userId}`;

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFK) || "{}");
    } catch {
      return {};
    }
  }

  function savePrefs(p) {
    localStorage.setItem(PREFK, JSON.stringify(p));
  }

  function applyPrefs() {
    const p = loadPrefs();
    if (p.endOct)   octSel.value   = p.endOct;
    if (p.count)    octCount.value = p.count;

    if (typeof p.sustain === "boolean") {
      sustainC.checked = p.sustain;
      AudioEngine.setSustain(p.sustain);
    }
    if (typeof p.volume === "number") {
      volumeR.value = p.volume;
      AudioEngine.setVolume(p.volume);
    }
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function startOct(){
    const end = +octSel.value;
    const cnt = +octCount.value;
    return Math.max(1, end - (cnt - 1));
  }

  // Build the list of white notes like ["C3","D3",...,"B4",...]
  function buildWhiteNotes() {
    const start = startOct();
    const cnt   = +octCount.value;
    const end   = start + cnt - 1;

    const whites = [];
    for (let oct = start; oct <= end; oct++) {
      for (const w of whiteOrder) {
        whites.push(w + oct);
      }
    }
    return whites;
  }

  // Main render
  function render() {
    piano.innerHTML = '';

    const whites = buildWhiteNotes();
    const blackPositions = []; // we'll fill this while placing whites

    // 1. render whites left-to-right
    whites.forEach((noteName, idx) => {
      const el = document.createElement('div');
      el.className = 'key white';
      el.dataset.note = noteName;
      el.innerHTML = `<span class="label">${noteName}</span>`;
      attachKeyHandlers(el, noteName);

      // position via flex/inline normally (CSS handles stacking of whites)
      // we also record where a black key (if any) should sit
      const base = noteName[0]; // "C","D",...
      if (blackMap[base]) {
        const sharpNote = blackMap[base] + noteName.slice(1); // "C#" + "3" => "C#3"
        blackPositions.push({
          idx,
          sharpNote,
          label: sharpNote
        });
      }

      piano.appendChild(el);
    });

    // 2. render blacks on top, absolutely positioned
    blackPositions.forEach(bp => {
      const b = document.createElement('div');
      b.className = 'key black';
      b.dataset.note = bp.sharpNote;
      b.innerHTML = `<span class="label">${bp.label}</span>`;
      attachKeyHandlers(b, bp.sharpNote);

      // math-based left position so we don't need offsetLeft
      const leftPx = bp.idx * (WHITE_W + WHITE_M * 2) + BLACK_OFFSET;
      b.style.left = leftPx + 'px';
      piano.appendChild(b);
    });

    // 3. piano min width so scroll works if needed
    piano.style.minWidth =
      whites.length * (WHITE_W + WHITE_M * 2) + 'px';
  }

  function attachKeyHandlers(el, note){
    el.addEventListener("pointerdown", e => {
      e.preventDefault();
      const vel = velocityFromEvent(e);
      AudioEngine.playNote(note, 0.06, vel);
      keyDownVisual(el);
    });

    const up = () => keyUpVisual(el);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }

  function keyDownVisual(el){
    el.classList.add("down");
    setTimeout(() => el.classList.remove("down"), 120);
  }

  function keyUpVisual(el){
    el.classList.remove("down");
  }

  function velocityFromEvent(e){
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    const v = 0.5 + (1 - y) * 0.5;
    return Math.max(0.4, Math.min(1, v));
  }

  function persist(){
    savePrefs({
      endOct:   +octSel.value,
      count:    +octCount.value,
      sustain:  !!sustainC.checked,
      volume:   +volumeR.value
    });
  }

  // dropdown / controls
  octSel.onchange   = () => { persist(); render(); };
  octCount.onchange = () => { persist(); render(); };
  sustainC.onchange = () => {
    AudioEngine.setSustain(sustainC.checked);
    persist();
  };
  volumeR.oninput   = () => {
    AudioEngine.setVolume(+volumeR.value);
    persist();
  };

  // ---------- PC keyboard ----------
  // Map physical keys to scale degrees in the *starting* octave
  const keyMap = [
    ["a","C"],["w","C#"],["s","D"],["e","D#"],["d","E"],
    ["f","F"],["t","F#"],["g","G"],["y","G#"],["h","A"],["u","A#"],["j","B"],["k","C+"]
  ];

  function keyToNote(k){
    const o0 = startOct();
    const m = keyMap.find(([kk]) => kk === k.toLowerCase());
    if (!m) return null;
    let [_, n] = m;
    let o = o0;
    if (n.endsWith("+")) {
      n = n.replace("+","");
      o = o0 + 1;
    }
    return n + o;
  }

  const downKeys = new Set();

  window.addEventListener("keydown", e => {
    if (e.repeat) return;

    // spacebar = sustain pedal
    if (e.code === "Space") {
      e.preventDefault();
      sustainC.checked = true;
      AudioEngine.setSustain(true);
      persist();
      return;
    }

    const note = keyToNote(e.key);
    if (!note || downKeys.has(note)) return;

    downKeys.add(note);
    AudioEngine.playNote(note, 0.06, 0.95);

    const el = piano.querySelector(`[data-note="${note}"]`);
    if (el) keyDownVisual(el);
  });

  window.addEventListener("keyup", e => {
    if (e.code === "Space") {
      sustainC.checked = false;
      AudioEngine.setSustain(false);
      persist();
      return;
    }

    const note = keyToNote(e.key);
    if (!note) return;

    downKeys.delete(note);
    const el = piano.querySelector(`[data-note="${note}"]`);
    if (el) keyUpVisual(el);
  });

  // ---------- boot ----------
  document.addEventListener("pointerdown", () => AudioEngine.ensure(), { once: true });

  applyPrefs();
  render();

  // optional: expose a manual refresh if you ever need it from outside
  window.refreshPiano = render;
})();
