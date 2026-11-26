// Effects smoke test: fights through the real page code with the effects engine running (events, continuous effects,
// drawing) against a canvas stand-in that throws on anything a real canvas does not have or on a non-finite number.
// Usage: node fxsmoke.js [--keys duck,cat,...] [--fights 4]
// Each chosen class fights as itself plain, with its signature maxed, and with every upgrade it can take, against a few rivals.
const fs = require('fs'), vm = require('vm');
const script = require('./loadbrawl').load('all');
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
const CTX_METHODS = ['setTransform', 'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'rect', 'roundRect', 'fill', 'stroke', 'fillText', 'setLineDash', 'save', 'restore', 'translate', 'rotate', 'scale', 'strokeText', 'quadraticCurveTo', 'bezierCurveTo', 'ellipse', 'arcTo', 'clip', 'drawImage'];
const CTX_PROPS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'font', 'textAlign', 'textBaseline', 'lineDashOffset', 'miterLimit', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'letterSpacing', 'globalCompositeOperation'];
let calls = 0, depth = 0; const badNums = [];
const fake = new Proxy({}, {
  get(t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return (...a) => { calls++; for (const v of a) if (typeof v !== 'number' || !Number.isFinite(v)) badNums.push(p + '(' + a.join(',') + ')'); return { addColorStop(o, c) { if (!(o >= 0 && o <= 1) || typeof c !== 'string') throw new Error('bad colour stop ' + o + ' ' + c); } }; };
    if (p === 'measureText') return s => { calls++; return { width: String(s).length * 6 }; };
    if (p === 'getTransform') return () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
    if (p === 'save') return () => { depth++; };
    if (p === 'restore') return () => { depth--; };
    if (CTX_METHODS.includes(p)) return (...a) => { calls++; for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) badNums.push(p + '(' + a.join(',') + ')'); };
    if (CTX_PROPS.includes(p)) return t[p];
    throw new Error('canvas has no ' + String(p));
  },
  set(t, p, v) { if (!CTX_PROPS.includes(p)) throw new Error('canvas has no property ' + String(p)); if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad value for ' + p + ': ' + v); t[p] = v; return true; },
});
function el(id) {
  return { id, textContent: '', innerHTML: '', value: '', hidden: false, style: {}, dataset: {}, children: [], classList: { toggle() {} }, _h: {},
    addEventListener(t, f) { this._h[t] = f; }, setAttribute() {}, getBoundingClientRect() { return { width: 360, height: 360, left: 0, top: 0 }; }, getContext() { return fake; }, width: 0, height: 0 };
}
const els = {}, store = {};
class FakeDate { static now() { return 0; } getUTCFullYear() { return 2026; } getUTCMonth() { return 10; } getUTCDate() { return 25; } }
const ctx = { document: { getElementById: id => els[id] || (els[id] = el(id)), addEventListener() {}, createElement: () => el('made') }, window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 2 },
  matchMedia: () => ({ matches: false }), localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, requestAnimationFrame: () => {},
  navigator: {}, location: { hash: '', href: 'x' }, Math, console, setTimeout: () => 0, JSON, Set, Map, Number, String, Array, Object, Date: FakeDate };
vm.createContext(ctx);
vm.runInContext(script + `;
this.__fight=(ka,kb,mode,seed)=>{
  const A=makeBuild(ka,seed%3,seed%3),B=makeBuild(kb,(seed+1)%3,(seed+2)%3);
  if(mode===1)for(let n=0;n<3;n++)if(canTake(A,'sig'))addUpgrade(A,'sig');
  if(mode===2)for(const b of [A,B])for(const id of UP_IDS)for(let n=0;n<UPGRADES[id].max&&n<3;n++)if(canTake(b,id))addUpgrade(b,id);
  begin(createMatch(A,B,seed*7919+1),0,'t',true);
  let steps=0,ev={},peak=0;
  while(!match.over&&steps<7000){
    match.step();
    for(const e of match.events){const k=e.k==='fx'?'fx:'+e.n:e.k==='proc'?'proc:'+e.id:e.k;ev[k]=(ev[k]||0)+1;if(e.k==='fx'&&!FX.RECIPES[e.n])throw new Error(ka+': no effect called '+e.n)}
    onEvents(match.events);
    if(steps%2===0){FX.update(1/30);FX.ambient(match,1/30);if(FX.count>peak)peak=FX.count}
    if(steps%6===0){draw()}
    steps++;
  }
  for(let k=0;k<20;k++){FX.update(1/30);FX.ambient(match,1/30);draw()}
  for(const f of match.f)for(const k of ['x','y','hp','r','vx','vy','ang'])if(!Number.isFinite(f[k]))throw new Error(ka+' v '+kb+': '+k+' is '+f[k]);
  if(!match.over)throw new Error(ka+' v '+kb+' did not end');
  return {t:match.t,ev,peak};
};this.__R=ROSTER;`, ctx);
const all = ctx.__R, keys = (arg('keys') || all.join(',')).split(',').filter(k => all.includes(k));
const per = +arg('fights') || 4;
let n = 0, peak = 0; const seen = {}, byKey = {};
for (const k of keys) {
  byKey[k] = {};
  for (let j = 0; j < per; j++) for (let mode = 0; mode < 3; mode++) {
    const rival = all[(all.indexOf(k) * 7 + j * 13 + mode * 5 + 3) % all.length];
    let r;
    try { r = ctx.__fight(k, rival, mode, 100 + n); } catch (e) { console.log('FAILED ' + k + ' v ' + rival + ' (mode ' + mode + '): ' + (e && e.stack || e)); process.exit(1); }
    n++; if (r.peak > peak) peak = r.peak;
    for (const x in r.ev) { seen[x] = (seen[x] || 0) + r.ev[x]; if (/^fx:/.test(x)) byKey[k][x] = (byKey[k][x] || 0) + r.ev[x]; }
  }
}
if (depth !== 0) throw new Error('save/restore do not balance: ' + depth);
const fxErr = vm.runInContext('FX.errors+"|"+FX.lastError', ctx);
if (!/^0\|/.test(fxErr)) throw new Error('a class effect threw: ' + fxErr);
if (badNums.length) throw new Error('non-finite numbers passed to the canvas: ' + badNums.slice(0, 4).join(' | '));
console.log(n + ' fights drawn with effects, ' + calls + ' canvas calls, most particles at once ' + peak);
if (arg('keys')) for (const k of keys) console.log('  ' + k + ': ' + (Object.keys(byKey[k]).map(x => x.slice(3) + '×' + byKey[k][x]).join(' ') || '(no fx events in these fights)'));
else console.log('events: ' + Object.keys(seen).sort().map(k => k + '×' + seen[k]).join(' '));
