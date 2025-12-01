import { Registry } from "./core.js";
const LABELS = ["m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7","P8"];

const mod = {
  type: "interval",
  state: { target:null, choice:null },

  render(host){
    host.innerHTML = `<div class="choices grid6" id="choices">${LABELS.map(x=>`<button data-v="${x}">${x}</button>`).join("")}</div>`;
    host.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", ()=>{ this.state.choice=b.dataset.v; setActive(host,b); });
    });
  },

  async new(){
    const lvl = Registry.levelOf("interval");
    this.state.target = await API.get(`/api/exercises/new?type=interval&level=${lvl}`);
  },

  async play(){
    const t = this.state.target;
    if (t.playback==="harmonic") await AudioEngine.playChord(t.notes,"harmonic");
    else await AudioEngine.playSequence(t.notes,0.9);
  },

  answerPayload(){
    return { type:"interval", level: Registry.levelOf("interval"),
      target: this.state.target,
      userAnswer: { answer: [this.state.choice] } };
  }
};

function setActive(host, btn){ host.querySelectorAll("button").forEach(x=>x.classList.remove("active")); btn.classList.add("active"); }
Registry.register("interval", mod);
export default mod;
