// /midi.js
// Web MIDI hookup for physical keyboards -> AudioEngine + visual flash
// This version uses global click delegation so it still works
// even if the button is inside a hidden panel when the page loads.

(function () {
  let midiLive = false;
  let midiAccessRef = null;
   document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("midiBtn");
    if (!btn) return;

    if (!navigator.requestMIDIAccess) {
      btn.textContent = "MIDI Not Supported";
      btn.disabled = true;
    } else {
      btn.textContent = "Enable MIDI";
      btn.disabled = false;
    }
  });

  // Map MIDI note number -> "C4", "F#3", etc.
  const NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function midiNumToName(n) {
    if (n < 0 || n > 127) return null;
    const pitchName = NAMES[n % 12];
    const octave = Math.floor(n / 12) - 1; // MIDI standard: 60 => C4
    return pitchName + octave;
  }

  // Visual feedback on the on-screen piano
  function pressVisual(noteName, down) {
    const el = document.querySelector(`[data-note="${noteName}"]`);
    if (!el) return;
    if (down) {
      el.classList.add("down");
    } else {
      el.classList.remove("down");
    }
  }

  // Handle incoming MIDI messages
  function handleMIDIMessage(e) {
    const [status, noteNum, velocity] = e.data;
    const cmd = status & 0xf0;

    // NOTE ON
    if (cmd === 0x90 && velocity > 0) {
      const nn = midiNumToName(noteNum);
      if (!nn) return;
      // play sound
      AudioEngine.playNote(nn, 0.06, velocity / 127);
      // flash
      pressVisual(nn, true);
      setTimeout(() => pressVisual(nn, false), 120);
    }

    // NOTE OFF (or NOTE ON with vel 0)
    if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
      const nn = midiNumToName(noteNum);
      if (!nn) return;
      pressVisual(nn, false);
    }
  }

  // Ask browser for MIDI and hook inputs
  async function activateMIDI(btnEl) {
    if (midiLive) {
      // already active
      if (btnEl) btnEl.textContent = "MIDI On ✅";
      return;
    }
        if (btnEl) btnEl.textContent = "Requesting MIDI…";

    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI not supported in this browser.");
      if (btnEl) btnEl.textContent = "MIDI Not Supported";
      return;
    }

    try {
      midiAccessRef = await navigator.requestMIDIAccess();

      // hook existing inputs
      midiAccessRef.inputs.forEach(input => {
        input.onmidimessage = handleMIDIMessage;
      });

      // hook future hot-plug devices too
      midiAccessRef.onstatechange = (ev) => {
        if (
          ev.port &&
          ev.port.type === "input" &&
          ev.port.state === "connected"
        ) {
          ev.port.onmidimessage = handleMIDIMessage;
        }
      };

      midiLive = true;
      if (btnEl) btnEl.textContent = "MIDI On ✅";
    } catch (err) {
      console.error("Could not enable MIDI:", err);
      if (btnEl) btnEl.textContent = "MIDI Blocked";
    }
  }

  // Global click listener.
  // We don't care WHEN #midiBtn appears in DOM, hidden or not —
  // when you actually click it, we catch it here.
  document.addEventListener("click", (e) => {
    // if you clicked directly on the button
    if (e.target && e.target.id === "midiBtn") {
      activateMIDI(e.target);
      return;
    }

    // if you clicked on a child inside the button (like text span)
    if (e.target && e.target.closest && e.target.closest("#midiBtn")) {
      const btn = e.target.closest("#midiBtn");
      activateMIDI(btn);
      return;
    }
  });
})();
