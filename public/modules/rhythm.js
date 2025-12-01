import { Registry } from "./core.js";

const mod = {
  type:"rhythm",
  state:{ target:null, taps:[], startTime:0 },

  render(host){
    host.innerHTML = `
      <div>Tap the pad in time. Quantization: sixteenth.</div>
      <div class="tap-pad" id="pad">TAP</div>
      <div id="tapInfo"></div>`;
    const pad = host.querySelector("#pad");
    pad.addEventListener("mousedown", ()=>this.tap());
    window.addEventListener("keydown", (e)=>{ if(e.code==="Space") this.tap(); });
  },

  async new(){
    const lvl = Registry.levelOf("rhythm");
    this.state = { target: await API.get(`/api/exercises/new?type=rhythm&level=${lvl}`), taps:[], startTime:0 };
  },

  async play(){
    const t = this.state.target;
    AudioEngine.metronomeStart(t.tempo, 1);
  },

  tap(){
    const now = performance.now();
    if (!this.state.startTime) this.state.startTime = now;
    this.state.taps.push(now - this.state.startTime);
    const el = document.querySelector("#tapInfo");
    el.textContent = `Taps: ${this.state.taps.length}`;
  },

  quantize(){
    // convert tap times to counts of sixteenth units in 1 bar (approx)
    if (!this.state.target) return [];
    const bpm = this.state.target.tempo;
    const sixteenth = (60000/bpm)/4;
    const diffs = this.state.taps.map((t,i)=> i? t-this.state.taps[i-1] : t);
    const units = diffs.map(d=>Math.max(0, Math.round(d/sixteenth)));
    return units;
  },

  answerPayload(){
    const units = this.quantize();
    return { type:"rhythm", level: Registry.levelOf("rhythm"),
      target: this.state.target, userAnswer: { units } };
  }
};

Registry.register("rhythm", mod);
export default mod;
