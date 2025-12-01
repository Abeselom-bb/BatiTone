import { z } from 'zod';
// Core generators used by /api/exercises/new
const SOLFEGE = ["Do","Re","Mi","Fa","Sol","La","Ti"];
const NOTE_MAP = { Do:"C4", Re:"D4", Mi:"E4", Fa:"F4", Sol:"G4", La:"A4", Ti:"B4" };
const INV_NOTE = Object.fromEntries(Object.entries(NOTE_MAP).map(([k,v])=>[v,k]));

export function noteGen(level=1) {
  const i = Math.floor(Math.random()*SOLFEGE.length);
  const sol = SOLFEGE[i];
  return { notes: [NOTE_MAP[sol]], answer: [sol], playback: "melodic" };
}

export function intervalGen(level=1) {
  const stepsByLevel = [
    ["m2","M2"],
    ["m2","M2","m3","M3"],
    ["m2","M2","m3","M3","P4","P5"],
    ["m2","M2","m3","M3","P4","P5","m6","M6"],
    ["m2","M2","m3","M3","P4","TT","P5","m6","M6","m7","M7","P8"]
  ][Math.min(level-1,4)];
  const qualities = {
    m2:1,M2:2,m3:3,M3:4,P4:5,TT:6,P5:7,m6:8,M6:9,m7:10,M7:11,P8:12
  };
  const root = Object.values(NOTE_MAP)[Math.floor(Math.random()*7)];
  const list = Object.keys(qualities).filter(k=>stepsByLevel.includes(k));
  const name = list[Math.floor(Math.random()*list.length)];
  const semis = qualities[name];

  // compute target midi
  const order = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function toMidi(n){ const m = n.match(/([A-G]#?)(\d)/); return order.indexOf(m[1]) + 12*(+m[2]+1); }
  function fromMidi(m){ const note = order[m%12]; const oct = Math.floor(m/12)-1; return `${note}${oct}`; }
  const n1 = toMidi(root);
  const n2 = n1 + semis;
  const notes = [fromMidi(n1), fromMidi(n2)];
  return { notes, answer: [INV_NOTE[notes[1]] ? name : name], playback: "melodic" };
}

export function chordGen(level=1) {
  const roots = Object.values(NOTE_MAP);
  const root = roots[Math.floor(Math.random()*roots.length)];
  const qualitiesByLevel = [
    ["maj","min"],
    ["maj","min","dim","aug"],
    ["maj7","7","min7"],
    ["maj7","7","min7","m7b5"],
    ["maj7","7b9","7#9","7#5","7b5"]
  ][Math.min(level-1,4)];
  const q = qualitiesByLevel[Math.floor(Math.random()*qualitiesByLevel.length)];
  const midi = n=>{const o=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];const m=n.match(/([A-G]#?)(\d)/);return o.indexOf(m[1])+12*(+m[2]+1);};
  const fromMidi=m=>{const o=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];return `${o[m%12]}${Math.floor(m/12)-1}`;};
  const r = midi(root);
  const stacks = {
    maj:[0,4,7],min:[0,3,7],dim:[0,3,6],aug:[0,4,8],
    "7":[0,4,7,10], maj7:[0,4,7,11], min7:[0,3,7,10], m7b5:[0,3,6,10],
    "7b9":[0,4,7,10,13], "7#9":[0,4,7,10,15], "7#5":[0,4,8,10], "7b5":[0,4,6,10]
  };
  const notes = stacks[q].map(s=>fromMidi(r+s));
  return { notes, answer: [q], playback: "harmonic" };
}

export function rhythmGen(level=1) {
  // 1 bar pattern arrays in sixteenth units (4/4)
  const patternsL = [
    [[4,4,4,4]],                                // L1 quarters
    [[2,2,2,2,2,2,2,2]],                        // L2 eighths
    [[4,2,2,4,4]],                              // syncopation
    [[4,0,2,2,4,4]],                             // rests
    [[3,3,2,2,4]]                               // triplet-ish feel quantized (approx)
  ];
  const pat = patternsL[Math.min(level-1,4)];
  const idx = Math.floor(Math.random()*pat.length);
  const units = pat[idx];
  const tempo = 90 + level*10;
  return { tempo, units, answer: units.slice(), playback: "melodic" };
}

export function melodyGen(level=1) {
  const len = [3,4,5,6,7][Math.min(level-1,4)];
  const diatonic = Object.values(NOTE_MAP);
  const notes = Array.from({length:len}, () => diatonic[Math.floor(Math.random()*diatonic.length)]);
  return { notes, answer: notes.map(n=>INV_NOTE[n]), playback: "melodic" };
}

export function generate(type, level=1) {
  switch(type){
    case "note": return noteGen(level);
    case "interval": return intervalGen(level);
    case "chord": return chordGen(level);
    case "rhythm": return rhythmGen(level);
    case "melody": return melodyGen(level);
    default: return noteGen(level);
  }
}
// Use Zod/Joi schemas
const schema = z.object({
  email: z.string().email(),
  level: z.number().int().min(1).max(10)
});