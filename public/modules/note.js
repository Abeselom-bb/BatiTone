import { Registry } from "./core.js";

const SOL = ["Do","Re","Mi","Fa","Sol","La","Ti"];

const mod = {
  type: "note",
  state: { target: null, choice: null },

  render(host) {
    host.innerHTML = `
      <div class="choices seven" id="choices">
        ${SOL.map(s=>`<button data-sol="${s}">${s}</button>`).join("")}
      </div>`;
    host.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", ()=>{ this.state.choice=b.dataset.sol; setActive(host,b); });
    });
  },

  async new() {
    const level = Registry.levelOf("note");
    const t = await API.get(`/api/exercises/new?type=note&level=${level}`);
    this.state.target = t;
  },

  async play(){ await AudioEngine.playSequence(this.state.target.notes); },

  answerPayload(){
    return { type:"note", level: Registry.levelOf("note"),
      target: this.state.target,
      userAnswer: { answer: [this.state.choice] } };
  }
};

function setActive(host, btn){
  host.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
}

Registry.register("note", mod);
export default mod;
 