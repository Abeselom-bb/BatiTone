// Registry for modules (note/interval/chord/rhythm/melody)
export const Registry = {
  active: "note",
  level: { note:1, interval:1, chord:1, rhythm:1, melody:1 },
  modules: {},
  register(type, mod){ this.modules[type] = mod; },
  set(type){ this.active = type; },
  get(){ return this.modules[this.active]; },
  levelOf(type){ return this.level[type]; },
  setLevel(type, n){ this.level[type] = n; }
};
window.Registry = Registry;
