// public/exam.js
// exam-style: pick group → 20 Q → server gets real attempts

(() => {
  const logoutBtn   = document.getElementById('logoutBtn');
  const topicCards  = Array.from(document.querySelectorAll('.topic-card'));
  const diffBtns    = Array.from(document.querySelectorAll('.diff-btn'));

  const qModal      = document.getElementById('questionModal');
  const qTopicBadge = document.getElementById('qTopicBadge');
  const qBody       = document.getElementById('qBody');
  const qPlay       = document.getElementById('qPlay');
  const qSubmit     = document.getElementById('qSubmit');
  const qNext       = document.getElementById('qNext');
  const qFeedback   = document.getElementById('qFeedback');
  const qClose      = document.getElementById('qClose');

  const EXAM_LEN = 20;
  const QUESTION_TIME = 30_000; // 30s

  let difficulty   = 'beginner';
  let currentTopic = null;
  let currentQ     = null;
  let qIndex       = 0;
  let correctCount = 0;
  let timerId      = null;

  // utils
  function rndInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
  const PCS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  function noteToMidi(name){
    const map = {C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
    const m = name.match(/^([A-G](?:#|b)?)(\d)$/);
    if (!m) return null;
    const pitch = m[1], oct = +m[2];
    return 12*(oct+1) + map[pitch];
  }
  function midiToNote(n){
    const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    return names[n%12] + (Math.floor(n/12)-1);
  }
  function shuffle(a){
    const b = a.slice();
    for (let i=b.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [b[i],b[j]] = [b[j],b[i]];
    }
    return b;
  }
  function arraysSame(a,b){
    if (a.length !== b.length) return false;
    for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function prettyTopic(t){
    return t==="note"?"Note Names":
           t==="interval"?"Intervals":
           t==="melody"?"Melody":
           t==="chord"?"Chord ID":
           t==="rhythm"?"Rhythm":t;
  }

  // difficulty → ranges
  function rangeForNotes(){
    if (difficulty === 'beginner') return {low:"C3", high:"B3"};
    return {low:"C2", high:"B4"};
  }
  function randomNoteInRange(){
    const r = rangeForNotes();
    const low = noteToMidi(r.low);
    const high = noteToMidi(r.high);
    return midiToNote(rndInt(low, high));
  }

  // audio helpers
  function playSingle(n){ AudioEngine.playNote(n,0.5,0.9); }
  function playInterval(n1,n2){
    AudioEngine.playNote(n1,0.5,0.9);
    setTimeout(()=>AudioEngine.playNote(n2,0.5,0.9), 500);
  }
  function playMelody(seq, gap=380){
    let t=0;
    seq.forEach(n=>{
      setTimeout(()=>AudioEngine.playNote(n,0.4,0.9), t);
      t += gap;
    });
  }
  function playChord(notes){
    notes.forEach(n=>AudioEngine.playNote(n,0.5,0.9));
  }
  function playTick(ms){
    setTimeout(()=>AudioEngine.playNote("G5",0.18,0.9), ms);
  }

  // formatting
  function formatSingleNote(str){
    const m = str.match(/^([A-G])([#b]?)(\d+)?$/);
    if (!m) return str;
    const base = m[1];
    const acc  = m[2] || '';
    const oct  = m[3] || '';
    return `<span class="note-token">${base}${acc?`<span class="note-acc">${acc}</span>`:''}${oct?`<span class="note-oct">${oct}</span>`:''}</span>`;
  }
  function formatMaybeSequence(str){
    if (str.includes('-')) {
      return str.split('-').map(s => formatSingleNote(s)).join('<span class="seq-sep">-</span>');
    }
    return formatSingleNote(str);
  }

  // ---- question generators (client) ----
  // server expects:
  // note / interval => target: {answer:[..]}
  // chord / melody  => target: {notes:[..]}
  // rhythm          => target: {units:[..]}

  // NOTE
  function genNoteQuestion(){
    const full = randomNoteInRange();           // e.g. C3
    const pitchClass = full.replace(/\d+/, ''); // "C"
    const wrongs = shuffle(PCS.filter(x=>x!==pitchClass)).slice(0,3);
    const choices = shuffle([pitchClass, ...wrongs]);
    return {
      type: "note",
      prompt: "Which note is this?",
      choices,
      correct: choices.indexOf(pitchClass),
      playFn: () => playSingle(full),
      serverTarget: { answer: [pitchClass] }    // for POST
    };
  }

  // INTERVAL
  const INTERVAL_TABLE = {
    0:"Perfect Unison",1:"Minor 2nd",2:"Major 2nd",3:"Minor 3rd",4:"Major 3rd",
    5:"Perfect 4th",6:"Tritone",7:"Perfect 5th",8:"Minor 6th",9:"Major 6th",
    10:"Minor 7th",11:"Major 7th",12:"Perfect Octave"
  };
  function intervalName(n1,n2){
    const d = noteToMidi(n2) - noteToMidi(n1);
    return INTERVAL_TABLE[d] || (d+" semitones");
  }
  function genIntervalQuestion(){
    const r = rangeForNotes();
    const low = noteToMidi(r.low), high = noteToMidi(r.high);
    let n1 = midiToNote(rndInt(low, high));
    let n2 = midiToNote(rndInt(low, high));
    if (noteToMidi(n2) < noteToMidi(n1)) [n1,n2] = [n2,n1];
    const iname = intervalName(n1,n2);
    const pool = Object.values(INTERVAL_TABLE);
    const wrongs = shuffle(pool.filter(x=>x!==iname)).slice(0,3);
    const choices = shuffle([iname, ...wrongs]);
    return {
      type:"interval",
      prompt:"What interval did you hear?",
      choices,
      correct: choices.indexOf(iname),
      playFn: () => playInterval(n1,n2),
      serverTarget: { answer: [iname] }
    };
  }

  // MELODY
  function genMelodyQuestion(){
    const r = rangeForNotes();
    const low = noteToMidi(r.low), high = noteToMidi(r.high);
    const len = (difficulty === 'beginner') ? rndInt(4,6) : rndInt(4,10);

    const seq = [];
    if (difficulty === 'beginner') {
      let cur = rndInt(low, high);
      for (let i=0;i<len;i++){
        seq.push(midiToNote(cur));
        cur = Math.min(high, cur + rndInt(0,2));
      }
    } else {
      for (let i=0;i<len;i++){
        seq.push(midiToNote(rndInt(low, high)));
      }
    }

    const correctStr = seq.join("-");
    const wrong1 = tweakMelody(seq, low, high).join("-");
    const wrong2 = tweakMelody(seq, low, high).join("-");
    const wrong3 = tweakMelody(seq, low, high).join("-");
    const choices = shuffle([correctStr, wrong1, wrong2, wrong3]);

    return {
      type:"melody",
      prompt:"Which pattern matches what you heard?",
      choices,
      correct: choices.indexOf(correctStr),
      playFn: () => playMelody(seq),
      serverTarget: { notes: seq }
    };
  }
  function tweakMelody(seq, low, high){
    const out = seq.slice();
    const i = rndInt(0, out.length-1);
    out[i] = midiToNote(rndInt(low, high));
    return out;
  }

  // CHORD
  function genChordQuestion(){
    const qualities = [
      {name:"Major",     iv:[0,4,7]},
      {name:"Minor",     iv:[0,3,7]},
      {name:"Dominant 7",iv:[0,4,7,10]},
      {name:"Major 7",   iv:[0,4,7,11]},
      {name:"Minor 7",   iv:[0,3,7,10]},
      {name:"Diminished",iv:[0,3,6]},
      {name:"Augmented", iv:[0,4,8]},
      {name:"Sus4",      iv:[0,5,7]},
      {name:"Power (5)", iv:[0,7]}
    ];
    const rootLow  = (difficulty === 'beginner') ? noteToMidi("C3") : noteToMidi("C2");
    const rootHigh = (difficulty === 'beginner') ? noteToMidi("E3") : noteToMidi("E4");
    const rootMidi = rndInt(rootLow, rootHigh);
    const rootNote = midiToNote(rootMidi);

    const correct = qualities[rndInt(0, qualities.length-1)];
    const chordNotes = correct.iv.map(s => midiToNote(rootMidi + s));

    const wrongs = shuffle(qualities.filter(q=>q!==correct)).slice(0,3).map(x=>x.name);
    const choices = shuffle([correct.name, ...wrongs]);

    return {
      type:"chord",
      prompt:`What chord quality is this? (root ${formatSingleNote(rootNote)})`,
      choices,
      correct: choices.indexOf(correct.name),
      playFn: () => playChord(chordNotes),
      serverTarget: { notes: chordNotes }
    };
  }

  // RHYTHM
  const RH_NOTEVALS = { "𝅝":16,"𝅗𝅥":8,"♩":4,"♪":2,"𝅘𝅥𝅯":1 };
  function buildBar(symbols){
    let used=0, out=[];
    for (const s of symbols){
      out.push(s);
      used += RH_NOTEVALS[s]||0;
    }
    while (used<16){ out.push("𝅘𝅥𝅯"); used++; }
    return out;
  }
  function renderRhythmLine(arr){
    let out=[], beat=[], tick=0;
    arr.forEach(sym=>{
      beat.push(sym);
      tick += RH_NOTEVALS[sym]||1;
      if (tick % 4 === 0){
        out.push(beat.join(" "));
        beat = [];
      }
    });
    if (beat.length) out.push(beat.join(" "));
    return out.join("  |  ");
  }
  function playRhythmBarTicks(arr){
    let t=0;
    arr.forEach(sym=>{
      playTick(t);
      const dur = RH_NOTEVALS[sym]||1;
      t += dur * 250;
    });
  }
  function genRhythmQuestion(){
    const SIMPLE = [
      buildBar(["𝅝"]),
      buildBar(["𝅗𝅥","𝅗𝅥"]),
      buildBar(["♩","♩","♩","♩"]),
      buildBar(["♩","♩","𝅗𝅥"]),
      buildBar(["♪","𝅗𝅥","♪","𝅘𝅥𝅯"])
    ];
    const ADV = [
      buildBar(["♩","♩","♩","♪","♪"]),
      buildBar(["♩","♪","♪","♩","♩"]),
      buildBar(["♪","♪","♪","♪","♩","♩"])
    ];
    const pool = difficulty==="beginner" ? SIMPLE : SIMPLE.concat(ADV);
    const correct = pool[rndInt(0,pool.length-1)];
    const wrongs = shuffle(pool.filter(p=>!arraysSame(p,correct))).slice(0,3);
    const all = shuffle([correct,...wrongs]);
    const idx = all.findIndex(p=>arraysSame(p,correct));
    return {
      type:"rhythm",
      prompt:"Which rhythm matches what you heard? (4/4)",
      choices: all.map(p=>renderRhythmLine(p)),
      correct: idx,
      playFn: () => playRhythmBarTicks(correct),
      serverTarget: { units: correct }
    };
  }

  const GENERATORS = {
    note: genNoteQuestion,
    interval: genIntervalQuestion,
    melody: genMelodyQuestion,
    chord: genChordQuestion,
    rhythm: genRhythmQuestion
  };

  // ----- flow -----
  function startExam(topic){
    currentTopic = topic;
    qIndex = 0;
    correctCount = 0;
    openQuestion();
  }

  function openQuestion(){
    qIndex++;
    if (qIndex > EXAM_LEN) {
      return showExamDone();
    }
    const gen = GENERATORS[currentTopic] || genNoteQuestion;
    currentQ = gen();
    qTopicBadge.innerHTML = `${prettyTopic(currentTopic)} (${difficulty}) — Q ${qIndex}/${EXAM_LEN}`;
    qBody.innerHTML = buildQuestionHTML(currentQ);
    qFeedback.textContent = '';
    qFeedback.style.color = '';
    qSubmit.classList.remove('hidden');
    qSubmit.disabled = false;
    qNext.classList.add('hidden');
    qModal.classList.add('show');
    startTimer();
  }

  function buildQuestionHTML(q){
    let answers = '';
    q.choices.forEach((c,i)=>{
      const content = (q.type==='note' || q.type==='melody') ? formatMaybeSequence(c) : c;
      answers += `
        <label class="answer-line" data-idx="${i}">
          <input type="radio" name="answer" value="${i}">
          <span class="ans-text">${content}</span>
        </label>
      `;
    });
    return `
      <div class="question-text"><div class="prompt">${q.prompt}</div></div>
      <div class="answer-block">${answers}</div>
    `;
  }

  function getSelectedIndex(){
    const el = qBody.querySelector('input[name="answer"]:checked');
    return el ? +el.value : null;
  }

  function markAnswers(sel, correct){
    const lines = qBody.querySelectorAll('.answer-line');
    lines.forEach(line=>{
      const idx = +line.dataset.idx;
      line.classList.remove('ans-correct','ans-wrong');
      if (idx === correct) line.classList.add('ans-correct');
      if (sel !== null && idx === sel && sel !== correct) line.classList.add('ans-wrong');
    });
  }

  function buildUserAnswer(sel){
    // convert our selected choice to server format
    if (sel === null) return {};
    switch (currentQ.type){
      case "note":
      case "interval":
        return { answer: [ currentQ.choices[sel] ] };
      case "melody":
      case "chord":
        // choices are strings for melody; we need notes array
        if (currentQ.type === "melody") {
          return { notes: currentQ.choices[sel].split("-") };
        }
        return { notes: currentQ.choices[sel] ? [currentQ.choices[sel]] : [] }; // chord names are text; server will just store
      case "rhythm":
        // we rendered text; best is to send the real units only on correct/target
        // for wrong we can send empty; server will mark wrong anyway
        return {};
    }
  }

  async function sendToServer(ok, sel){
    if (!window.API?.post) return;
    const levelNum = (difficulty === 'beginner') ? 1 : 4;
    const body = {
      type: currentQ.type,
      level: levelNum,
      target: currentQ.serverTarget || {},
      userAnswer: buildUserAnswer(sel),
      playback: currentQ.type === "chord" ? "harmonic" : "melodic",
      key: "C",
      tempo: 90,
      durationMs: 0,
      sessionId: `exam_${currentTopic}_${Date.now()}`
    };
    // for rhythm, send units for user too if they picked the right one
    if (currentQ.type === "rhythm" && sel !== null) {
      const chosenText = currentQ.choices[sel];
      // if correct, userAnswer = target
      if (sel === currentQ.correct) {
        body.userAnswer = { units: currentQ.serverTarget.units };
      } else {
        body.userAnswer = { units: [] };
      }
    }
    try {
      await API.post("/api/exercises/answer", body);
    } catch (e) {
      // ignore
    }
  }

  function handleSubmit(forced){
    clearInterval(timerId);
    if (!currentQ) return;
    const sel = getSelectedIndex();
    if (sel === null && !forced){
      qFeedback.style.color = '#ef4444';
      qFeedback.textContent = 'Choose an answer first.';
      startTimer();
      return;
    }
    const ok = (sel === currentQ.correct);
    markAnswers(sel, currentQ.correct);
    if (ok){
      qFeedback.style.color = '#34d399';
      qFeedback.textContent = '✅ Correct';
      correctCount++;
    } else {
      qFeedback.style.color = '#ef4444';
      qFeedback.textContent = `❌ Wrong — correct is: ${currentQ.choices[currentQ.correct]}`;
    }
    sendToServer(ok, sel);   // <-- important
    qSubmit.disabled = true;
    qSubmit.classList.add('hidden');
    qNext.classList.remove('hidden');
    if (qIndex >= EXAM_LEN) {
      qNext.textContent = "Finish";
    } else {
      qNext.textContent = "Next →";
    }
  }

  function handleNext(){
    if (qIndex >= EXAM_LEN) {
      return showExamDone();
    }
    openQuestion();
  }

  function showExamDone(){
    // simple pop-out in same modal
    qBody.innerHTML = `
      <div class="question-text">
        <h3>Exam finished 🎉</h3>
        <p>You got <b>${correctCount}</b> out of <b>${EXAM_LEN}</b>.</p>
        <p style="font-size:.9rem;opacity:.7">Tip: practice the lowest-scoring group in the Practice page.</p>
      </div>
      <div class="answer-block">
        <button id="goDash" class="btn">Go to Dashboard</button>
        <button id="closeExam" class="btn ghost">Close</button>
      </div>
    `;
    qFeedback.textContent = '';
    qSubmit.classList.add('hidden');
    qNext.classList.add('hidden');
    qModal.classList.add('show');

    qBody.querySelector('#goDash').onclick = () => location.href = '/dashboard.html';
    qBody.querySelector('#closeExam').onclick = () => qModal.classList.remove('show');
  }

  function startTimer(){
    clearInterval(timerId);
    qFeedback.style.color = '';
    qFeedback.textContent = `Time: 30s`;
    const start = Date.now();
    timerId = setInterval(()=>{
      const left = 30 - Math.floor((Date.now()-start)/1000);
      if (left <= 0){
        clearInterval(timerId);
        qFeedback.style.color = '#ef4444';
        qFeedback.textContent = '⏱️ Time up';
        handleSubmit(true);
      } else {
        qFeedback.textContent = `Time: ${left}s`;
      }
    }, 1000);
  }

  // events
  topicCards.forEach(card => {
    card.addEventListener('click', () => {
      topicCards.forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      startExam(card.dataset.topic);
    });
  });

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.level;
    });
  });

  qPlay.addEventListener('click', () => currentQ?.playFn && currentQ.playFn());
  qSubmit.addEventListener('click', () => handleSubmit(false));
  qNext.addEventListener('click', handleNext);
  qClose.addEventListener('click', () => qModal.classList.remove('show'));

  logoutBtn.addEventListener('click', () => {
    if (window.API?.clear) API.clear();
    location.href = '/';
  });
})();
