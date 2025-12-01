import { Registry } from "./core.js";
const SOL = ["Do","Re","Mi","Fa","Sol","La","Ti"];
const NOTE = { Do:"C4", Re:"D4", Mi:"E4", Fa:"F4", Sol:"G4", La:"A4", Ti:"B4" };

const mod = {
  type:"melody",
  state:{ target:null, seq:[] },

  render(host){
    host.innerHTML = `
      <div class="choices seven" id="choices">${SOL.map(s=>`<button data-sol="${s}">${s}</button>`).join("")}</div>
      <div id="seq"></div>
      <div class="row">
        <button id="preview">Preview</button>
        <button id="undo" class="ghost">Undo</button>
        <button id="clear" class="ghost">Clear</button>
      </div>`;
    host.querySelectorAll("#choices button").forEach(b=>{
      b.addEventListener("click", ()=>{ this.state.seq.push(b.dataset.sol); this.renderSeq(); });
    });
    host.querySelector("#undo").addEventListener("click", ()=>{ this.state.seq.pop(); this.renderSeq(); });
    host.querySelector("#clear").addEventListener("click", ()=>{ this.state.seq=[]; this.renderSeq(); });
    host.querySelector("#preview").addEventListener("click", ()=>{ if(this.state.seq.length) AudioEngine.playSequence(this.state.seq.map(s=>NOTE[s]),0.7); });
  },

  renderSeq(){
    const s = document.getElementById("seq");
    s.textContent = this.state.seq.join(" · ");
  },

  async new(){ const lvl = Registry.levelOf("melody"); this.state = { target: await API.get(`/api/exercises/new?type=melody&level=${lvl}`), seq:[] }; },

  async play(){ await AudioEngine.playSequence(this.state.target.notes,0.8); },

  answerPayload(){
    return { type:"melody", level: Registry.levelOf("melody"),
      target: this.state.target, userAnswer: { notes: this.state.seq.map(s=>NOTE[s]), answer: this.state.seq } };
  }
};

Registry.register("melody", mod);
export default mod;
