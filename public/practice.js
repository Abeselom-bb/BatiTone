// public/practice.js
import "./modules/core.js";
import "./modules/note.js";
import "./modules/interval.js";
import "./modules/chord.js";
import "./modules/rhythm.js";
import "./modules/melody.js";

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

(async function () {
  // Try both API.token and localStorage, but DO NOT auto-redirect on failure
  const token = window.API?.token || localStorage.getItem("token");

  if (!token) {
    // If you really want, you can show a message instead of hard redirect
    console.warn("No auth token found – staying on practice page.");
    // If you want to force login only when completely unauthenticated, you *can* do:
    // location.replace("/");
    // return;
  }

  document.addEventListener("pointerdown", () => AudioEngine.ensure(), { once: true });


  const skillBtns     = $$("#skillRow .skill-btn");
  const trackBadge    = $("#trackBadge");
  const questionTitle = $("#questionTitle");
  const tinyNote      = $("#tinyNote");
  const choiceHost    = $("#choiceHost");
  const feedback      = $("#feedback");
  const stats         = $("#stats");
  const startBtn      = $("#startBtn");
  const playBtn       = $("#playBtn");
  const submitBtn     = $("#submitBtn");

  const progressBtn   = $("#progressBtn");
  const progressModal = $("#progressModal");
  const closeProgress = $("#closeProgress");

  const pianoToggle   = $("#pianoToggle");
  const pianoSection  = $("#pianoSection");
  const pianoClose    = $("#pianoClose");

  $("#logoutBtn").onclick = () => { API.clear(); location.href = "/"; };

  // piano
  pianoToggle.onclick = () => pianoSection.classList.toggle("hidden");
  pianoClose.onclick  = () => pianoSection.classList.add("hidden");
  pianoSection.addEventListener("pointerdown", () => AudioEngine.ensure(), { once: true });
  if ($("#midiBtn")) {
    $("#midiBtn").onclick = async () => {
      const ok = await MIDIInput.enable();
      alert(ok ? "MIDI enabled" : "No MIDI device");
    };
  }

  // ===== STATE =====
  let currentSkill = "note";
  let currentAttempts = 0;
  let currentCorrectIdx = 0;
  let questionLocked = false;

  // local tracker (still uses your API summary just for numbers)
  const LOCAL = {
    note:{total:0,correct:0},
    interval:{total:0,correct:0},
    melody:{total:0,correct:0},
    chord:{total:0,correct:0},
    rhythm:{total:0,correct:0},
    last5:[]
  };

  // ===== DATA =====
  const STATIC_CHOICES = {
    note: [
      "C3","C#3","D3","D#3","E3","F3","F#3","G3","G#3","A3","A#3","B3"
    ],
    interval: [
      "m2 (C3→C#3)",
      "M2 (C3→D3)",
      "m3 (C3→D#3)",
      "M3 (C3→E3)",
      "P4 (C3→F3)",
      "P5 (C3→G3)",
      "m6 (C3→G#3)",
      "M6 (C3→A3)",
      "m7 (C3→A#3)",
      "M7 (C3→B3)",
      "P8 (C3→C4)"
    ],
    melody: [
      "C3 D3 E3 G3",
      "C3 E3 G3 C4",
      "C3 D3 E3 F3 G3",
      "C3 G3 E3 D3",
      "C3 E3 F3 G3 A3",
      "C3 D3 F3 A3",
      "C3 E3 G3 B3",
      "C3 D3 E3 G3 B3"
    ],
    chord: [
      "C3-E3-G3 (C major)",
      "C3-D#3-G3 (C minor)",
      "C3-E3-G3-Bb3 (C7)",
      "C3-E3-G3-B3 (Cmaj7)",
      "C3-D#3-G3-Bb3 (Cmin7)",
      "C3-F3-G3 (C sus4)",
      "C3-D#3-F#3 (C dim)"
    ],
    rhythm: [
      "𝅘𝅥 𝅘𝅥 𝅘𝅥 𝅘𝅥 (4 quarters)",
      "𝅗𝅥 𝅗𝅥 (2 halves)",
      "𝅘𝅥 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥 (q, 2x8th, q)",
      "𝅘𝅥 𝅘𝅥 𝅘𝅥𝅯 𝅘𝅥𝅯 (q, q, 2x16th)",
      "𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 𝅘𝅥𝅮 (4 eighths)"
    ]
  };

  // rhythm timings (ms)
  const RHYTHM_TIMINGS = [
    [500,500,500,500],
    [1000,1000],
    [500,250,250,500],
    [500,500,125,125],
    [250,250,250,250]
  ];

  // ===== INIT =====
  renderChoices("note");
  await refreshStats();
  questionTitle.textContent = "Press Start to hear the question.";
  tinyNote.textContent = "";

  // ===== SKILL CLICK =====
  skillBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      skillBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSkill = btn.dataset.skill;
      trackBadge.textContent = currentSkill[0].toUpperCase()+currentSkill.slice(1);
      renderChoices(currentSkill);
      questionTitle.textContent = "Press Start to hear the question.";
      feedback.textContent = "";
      currentAttempts = 0;
      questionLocked = false;
      if (["interval","melody","chord"].includes(currentSkill)) {
        tinyNote.textContent = "All ear drills for now start from C3 (Do).";
      } else {
        tinyNote.textContent = "";
      }
    });
  });

  // ===== START =====
  startBtn.onclick = async () => {
    await newQuestion(currentSkill);
  };

  // ===== PLAY =====
  playBtn.onclick = async () => {
    await playCurrentQuestion();
  };

  // ===== SUBMIT =====
  submitBtn.onclick = async () => {
    if (questionLocked) {
      feedback.textContent = "Press Start for a new question.";
      return;
    }
    const picked = getSelectedIndex();
    if (picked == null) {
      feedback.textContent = "Choose an answer first.";
      return;
    }

   const isCorrect = picked === currentCorrectIdx;
currentAttempts++;

paintAnswers(picked, currentCorrectIdx, !isCorrect && currentAttempts >= 3);

// 1) local stats
LOCAL[currentSkill].total++;
if (isCorrect) LOCAL[currentSkill].correct++;
LOCAL.last5.unshift({ skill: currentSkill, ok: isCorrect });
LOCAL.last5 = LOCAL.last5.slice(0, 5);

// 2) SAVE to backend so progress summary can see it
 
// picked = index the user chose
// currentCorrectIdx = index of the correct answer
 

try {
  await API.post("/api/exercises/attempt", {
    type: currentSkill,           // "note" | "interval" | ...
    level: 1,
    isCorrect,                    // <-- IMPORTANT
    target: { index: currentCorrectIdx },
    userAnswer: { index: picked },
  });
} catch (err) {
  console.error("practice attempt save failed:", err);
}

// 3) refresh dashboard-style stats
await refreshStats();

    if (isCorrect) {
      feedback.textContent = "✅ Correct! Press Start for next.";
      feedback.style.color = "#34d399";
      questionLocked = true;
      return;
    }

    // wrong
    if (currentAttempts < 3) {
      feedback.textContent = `❌ Wrong (${currentAttempts}/3). Try again.`;
      feedback.style.color = "#ef4444";
    } else {
      feedback.textContent = "❌ Wrong (3/3) — showing correct. Press Start for next.";
      feedback.style.color = "#ef4444";
      questionLocked = true;
    }
  };

  // ===== NEW QUESTION =====
  async function newQuestion(skill) {
    currentAttempts = 0;
    questionLocked = false;

    // always re-render choices (easy)
    renderChoices(skill);

    // pick correct from those choices
    const answers = choiceHost.querySelectorAll(".answer");
    currentCorrectIdx = answers.length ? Math.floor(Math.random() * answers.length) : 0;

    // play
    await playCurrentQuestion();

    feedback.textContent = "";
  }

  // ===== PLAY CURRENT =====
  async function playCurrentQuestion() {
    // play based on currentSkill and currentCorrectIdx
    const list = STATIC_CHOICES[currentSkill] || [];
    const item = list[currentCorrectIdx] || null;
    if (!item) return;

    if (currentSkill === "note") {
      // item like "C3"
      AudioEngine.playNote(item, 0.5, 1);
      return;
    }

    if (currentSkill === "interval") {
      // item like "M2 (C3→D3)" -> extract second note
      const match = item.match(/→([A-G]#?\d)/);
      const second = match ? match[1] : "D3";
      // first C3, then second
      AudioEngine.playNote("C3", 0.35, 1);
      setTimeout(()=>AudioEngine.playNote(second, 0.35, 1), 380);
      return;
    }

    if (currentSkill === "melody") {
      // item like "C3 D3 E3 G3"
      const notes = item.split(/\s+/);
      let t = 0;
      notes.forEach(n => {
        setTimeout(()=>AudioEngine.playNote(n, 0.28, 1), t);
        t += 320;
      });
      return;
    }

    if (currentSkill === "chord") {
      // item like "C3-E3-G3 (C major)" -> take before space
      const rootPart = item.split(" ")[0]; // "C3-E3-G3"
      const notes = rootPart.split("-");
      notes.forEach(n => AudioEngine.playNote(n, 0.8, 0.9));
      return;
    }

    if (currentSkill === "rhythm") {
      // use RHYTHM_TIMINGS
      const pat = RHYTHM_TIMINGS[currentCorrectIdx % RHYTHM_TIMINGS.length];
      let t = 0;
      pat.forEach(d => {
        setTimeout(()=>AudioEngine.playNote("C3", 0.15, 1), t);
        t += d;
      });
      return;
    }
  }

  // ===== RENDER CHOICES =====
  function renderChoices(skill) {
    const list = STATIC_CHOICES[skill] || [];
    choiceHost.innerHTML = list.map((txt,i)=>`
      <div class="answer" data-idx="${i}">${txt}</div>
    `).join("");
    makeSelectable();
  }

  function makeSelectable() {
    const answers = choiceHost.querySelectorAll(".answer");
    answers.forEach(a => {
      a.onclick = () => {
        if (questionLocked) return;
        answers.forEach(x=>x.classList.remove("selected"));
        a.classList.add("selected");
      };
    });
  }

  function getSelectedIndex() {
    const answers = choiceHost.querySelectorAll(".answer");
    for (let i=0;i<answers.length;i++){
      if (answers[i].classList.contains("selected")) return i;
    }
    return null;
  }

  function paintAnswers(pickedIdx, correctIdx, showCorrect) {
    const answers = choiceHost.querySelectorAll(".answer");
    answers.forEach(a=>a.classList.remove("correct","wrong"));
    if (answers[pickedIdx]) {
      if (pickedIdx === correctIdx) answers[pickedIdx].classList.add("correct");
      else answers[pickedIdx].classList.add("wrong");
    }
    if (showCorrect && answers[correctIdx]) {
      answers[correctIdx].classList.add("correct");
    }
  }

  // ===== progress modal (still from API) =====
  progressBtn.onclick = async () => {
    progressModal.classList.add("open");
    await renderProgress();
  };
  closeProgress.onclick = () => progressModal.classList.remove("open");

  async function refreshStats() {
    const s = await API.get("/api/progress/summary");
    stats.textContent = `Attempts: ${s.total} • Accuracy: ${s.accuracy || 0}%`;
  }

  async function renderProgress() {
    const s = await API.get("/api/progress/summary");
    const body = $("#progressBody");
    body.innerHTML = `
      <div class="row" style="gap:1rem;flex-wrap:wrap">
        <div class="card"><h4>Total</h4><p style="font-size:1.4rem">${s.total}</p></div>
        <div class="card"><h4>Accuracy</h4><p style="font-size:1.4rem">${s.accuracy || 0}%</p></div>
      </div>
      <h4 style="margin-top:1rem">By skill</h4>
      <div class="grid3">
        ${["note","interval","melody","chord","rhythm"].map(k=>{
          const v = s.byType?.[k] || {};
          const bad = (v.accuracy||0) < 60;
          return `
            <div class="card ${bad?'warn':''}">
              <div class="row" style="justify-content:space-between">
                <span>${k.toUpperCase()}</span>
                <span>${v.accuracy||0}%</span>
              </div>
              <small>${v.correct||0} / ${v.total||0}</small>
            </div>
          `;
        }).join("")}
      </div>
      <h4 style="margin-top:1rem">Recent</h4>
      <div class="row" style="gap:.4rem;flex-wrap:wrap">
        ${LOCAL.last5.map(x=>`<span class="pill ${x.ok?'good':'bad'}">${x.skill} ${x.ok?'✔':'✖'}</span>`).join("")}
      </div>
    `;
  }

  // init
  await refreshStats();
})();
// Add to the end of api.js
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  body.setAttribute('data-theme', savedTheme);

  // Update toggle text based on saved theme
  if (savedTheme === 'light') {
    themeToggle.textContent = '☀️ Light Mode';
  } else {
    themeToggle.textContent = '🌙 Dark Mode';
  }

  // Toggle theme
  themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update toggle text
    themeToggle.textContent = newTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode';
  });
});

const circleBtn = document.getElementById("circleBtn");
const circleOverlay = document.getElementById("circleOverlay");

circleBtn.addEventListener("click", () => {
  circleOverlay.style.display = "flex";
});

circleOverlay.addEventListener("click", () => {
  circleOverlay.style.display = "none";
});
