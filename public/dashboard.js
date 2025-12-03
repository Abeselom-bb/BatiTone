// public/dashboard.js
(async function () {
  if (!API.token) {
    location.replace("/");
    return;
  }

  const nameEl      = document.getElementById("name");
  const attemptsEl  = document.getElementById("kpiAttempts");
  const accEl       = document.getElementById("kpiAcc");
  const accBar      = document.getElementById("accBar");
  const unlockBadge = document.getElementById("unlockBadge");
  const moduleGrid  = document.getElementById("moduleGrid");
  const suggestionsEl = document.getElementById("suggestions");

  // api.js exposes API.user, not API.me
  nameEl.textContent = API.user?.name || "Musician";

  function unlocks(levels) {
    return {
      note:     levels.note     >= 1,
      interval: levels.interval >= 1,
      melody:   levels.melody   >= 1,
      chord:    levels.chord    >= 1,
      rhythm:   levels.rhythm   >= 1,
    };
  }

  try {
    const s = await API.get("/api/progress/summary");
    const total = s.total || 0;
    const accuracy = s.accuracy || 0;

    attemptsEl.textContent = total;
    accEl.textContent = `${accuracy}%`;
    accBar.style.width = `${accuracy}%`;

    // simple unlock status
    const u = unlocks(s.levels || {});
    if (total === 0) {
      unlockBadge.textContent = "Getting started";
      unlockBadge.className = "badge muted";
    } else if (accuracy >= 80) {
      unlockBadge.textContent = "On track";
      unlockBadge.className = "badge good";
    } else {
      unlockBadge.textContent = "Keep practicing";
      unlockBadge.className = "badge warn";
    }

    // module cards
    const types = ["note", "interval", "melody", "chord", "rhythm"];
    moduleGrid.innerHTML = types
      .map((t) => {
        const d = s.byType?.[t] || {};
        const lvl = s.levels?.[t] || 1;
        const accT = d.accuracy || 0;
        return `
          <div class="stat-card">
            <h4>${t.toUpperCase()}</h4>
            <div class="kpi">${accT}%</div>
            <div class="muted">${d.correct || 0}/${d.total || 0} correct • Level ${lvl}</div>
          </div>
        `;
      })
      .join("");

     
  } 
  
  catch (err) {
    console.error(err);
    alert("Failed to load your progress.");
  }

  document.getElementById("logout").onclick = () => {
    API.clear();
    location.href = "/";
  };
})();

    // Piano scroll mode
    if (pianoScrollBtn && pianoSection) {
      pianoScrollBtn.addEventListener("click", () => {
        const isScroll = pianoSection.classList.toggle("scroll-mode");
        pianoScrollBtn.textContent = isScroll ? "Play Keys" : "Scroll Keys";
      });
    }
