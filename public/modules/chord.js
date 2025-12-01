import { Registry } from "./core.js";
const QUALS = ["maj","min","dim","aug","7","maj7","min7","m7b5","7b9","7#9","7#5","7b5"];

const mod = {
  type:"chord",
  state:{ target:null, choice:null },

  render(host){
    host.innerHTML = `<div class="choices grid6" id="choices">${QUALS.map(q=>`<button data-q="${q}">${q}</button>`).join("")}</div>`;
    host.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", ()=>{ this.state.choice=b.dataset.q; setActive(host,b); });
    });
  },

  async new(){ const lvl = Registry.levelOf("chord"); this.state.target = await API.get(`/api/exercises/new?type=chord&level=${lvl}`); },
  async play(){ await AudioEngine.playChord(this.state.target.notes, this.state.target.playback); },

  answerPayload(){ return { type:"chord", level: Registry.levelOf("chord"), target:this.state.target, userAnswer:{ notes:this.state.target.notes, answer:[this.state.choice] } }; }
};

function setActive(host, btn){ host.querySelectorAll("button").forEach(x=>x.classList.remove("active")); btn.classList.add("active"); }
Registry.register("chord", mod);
export default mod;
