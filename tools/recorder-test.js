// Drives whole recorded duels through the real page code with a stand-in browser: fake MediaRecorder, captureStream,
// document.createElement, and a strict 1080x1920 canvas that throws on unknown members and reports non-finite numbers
// and text that would leave the frame.
const vm = require('vm');
const script = require('./loadbrawl').load('all');
const METHODS = ['setTransform', 'resetTransform', 'transform', 'translate', 'scale', 'rotate', 'save', 'restore', 'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath',
  'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'clip', 'fillText', 'strokeText', 'measureText',
  'setLineDash', 'getLineDash', 'drawImage', 'createLinearGradient', 'createRadialGradient', 'createPattern', 'isPointInPath'];
const PROPS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset', 'globalAlpha', 'globalCompositeOperation', 'font', 'textAlign', 'textBaseline',
  'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'imageSmoothingEnabled', 'letterSpacing', 'direction', 'filter'];
function strictCanvas(report) {
  let m = [1, 0, 0, 1, 0, 0]; const stack = []; const props = { font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic' };
  const px = () => { const q = /(\d+(?:\.\d+)?)px/.exec(props.font); return q ? +q[1] : 10; };
  const width = s => String(s).length * px() * 0.5;
  const fns = {
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; }, resetTransform() { m = [1, 0, 0, 1, 0, 0]; },
    translate(x, y) { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
    scale(x, y) { m = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; },
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, -m[0] * s + m[2] * c, -m[1] * s + m[3] * c, m[4], m[5]]; },
    save() { stack.push([m.slice(), Object.assign({}, props)]); }, restore() { const t = stack.pop(); if (t) { m = t[0]; Object.assign(props, t[1]); } },
    measureText(s) { return { width: width(s) }; },
    getLineDash() { return []; },
  };
  const drawText = (str, x, y) => {
    report.texts.add(String(str)); report.textCalls++;
    if (Math.abs(m[1]) > 1e-6 || Math.abs(m[2]) > 1e-6) return;           // rotated text: not checked
    const w = width(str), al = props.textAlign, left = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
    const x0 = m[0] * left + m[4], x1 = m[0] * (left + w) + m[4], yy = m[3] * y + m[5];
    if (x0 < -2 || x1 > 1082 || yy < 0 || yy > 1920) report.outside.push(JSON.stringify(String(str)) + ' x ' + Math.round(x0) + '..' + Math.round(x1) + ' y ' + Math.round(yy));
  };
  return new Proxy({}, {
    get(t, p) {
      if (typeof p === 'symbol') return undefined;
      if (PROPS.includes(p)) return props[p];
      if (!METHODS.includes(p)) throw new Error('canvas has no ' + p);
      return (...a) => {
        report.calls++;
        for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) report.bad.push(p + '(' + a.join(',') + ')');
        if (p === 'fillText' || p === 'strokeText') return drawText(a[0], a[1], a[2]);
        if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return { addColorStop() {} };
        if (fns[p]) return fns[p](...a);
      };
    },
    set(t, p, v) {
      if (!PROPS.includes(p)) throw new Error('canvas has no property ' + String(p));
      if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) throw new Error('bad value for ' + p + ': ' + v);
      props[p] = v; return true;
    },
  });
}
const loose = new Proxy({}, { get: (t, p) => p === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }), set: () => true });

function boot(o) {
  o = o || {};
  const R = { report: { calls: 0, textCalls: 0, texts: new Set(), outside: [], bad: [] }, recorders: [], captures: [], urls: [], revoked: [], dests: 0, shares: 0, timers: [] };
  const docH = {};
  function el(id, tag) {
    const e = { id: id || '', tagName: (tag || 'div').toUpperCase(), textContent: '', innerHTML: '', value: '', hidden: false, disabled: false, style: { cssText: '' }, dataset: {}, children: [], attrs: {}, _h: {}, parent: null,
      classList: { toggle() {}, add() {}, remove() {} }, width: 0, height: 0,
      addEventListener(t, f) { this._h[t] = f; }, setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
      appendChild(ch) { ch.remove && ch.remove(); this.children.push(ch); ch.parent = this; return ch; },
      remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); this.parent = null; } },
      focus() {}, select() {}, getBoundingClientRect() { return { width: 360, height: 360, left: 0, top: 0 }; }, getContext() { return loose; } };
    return e;
  }
  const els = {}, body = el('', 'body');
  const find = (node, id) => { for (const ch of node.children) { if (ch.id === id) return ch; const r = find(ch, id); if (r) return r; } return null; };
  const document = {
    body, hidden: false,
    getElementById: id => find(body, id) || els[id] || (els[id] = el(id)),
    addEventListener(t, f) { (docH[t] = docH[t] || []).push(f); },
    createElement(tag) {
      const e = el('', tag);
      if (tag === 'canvas') {
        const ctx = strictCanvas(R.report);
        e.getContext = () => ctx;
        e.captureStream = fps => {
          R.captures.push(fps);
          if (o.captureThrows) throw new Error('captureStream refused');
          const s = { tracks: [{ kind: 'video', stop() { this.stopped = true; } }], addTrack(t) { this.tracks.push(t); }, getTracks() { return this.tracks; }, getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); } };
          R.stream = s; return s;
        };
      }
      return e;
    },
  };
  class Blob { constructor(parts, opt) { this.size = (parts || []).reduce((n, p) => n + (p && p.size !== undefined ? p.size : String(p).length), 0); this.type = (opt && opt.type) || ''; } }
  class File extends Blob { constructor(parts, name, opt) { super(parts, opt); this.name = name; } }
  class MediaRecorder {
    static isTypeSupported(t) { return o.mp4 ? t.startsWith('video/mp4') : t.startsWith('video/webm'); }   // mp4:true behaves like Safari, which cannot record WebM
    constructor(stream, opts) { this.stream = stream; this.opts = opts || {}; this.mimeType = this.opts.mimeType || ''; this.state = 'inactive'; this.starts = 0; this.stops = 0; R.recorders.push(this); }
    start() { this.state = 'recording'; this.starts++; }
    stop() { this.state = 'inactive'; this.stops++; if (this.ondataavailable) this.ondataavailable({ data: new Blob([{ size: o.empty ? 0 : 2500000 }], { type: this.mimeType }) }); if (this.onstop) this.onstop(); }
  }
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() {} createOscillator() { return { type: '', frequency: param(), connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: param(), connect(x) { (R.conns = R.conns || []).push(x); }, disconnect(x) { (R.disc = R.disc || []).push(x); } }; }
    createMediaStreamDestination() { R.dests++; return { stream: { getAudioTracks: () => [{ kind: 'audio', stop() {} }] } }; }
  }
  const store = {};
  const ctx = { document, devicePixelRatio: 2, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, requestAnimationFrame: f => { ctx.raf = f; },
    navigator: o.share ? { canShare: q => !!(q && q.files), share: () => { R.shares++; return Promise.resolve(); } } : {},
    location: { hash: '', href: 'https://example.test/balls/duel.html', host: 'example.test', pathname: '/balls/duel.html' },
    URL: { createObjectURL: b => { R.urls.push(b); return 'blob:fake/' + R.urls.length; }, revokeObjectURL: u => R.revoked.push(u) }, Blob, File,
    setTimeout: (f, ms) => { R.timers.push([f, ms]); return R.timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.reject(new Error('offline in tests')), Promise, Math, console, JSON, Set, Map, Number, String, Array, Object, Date, Error, parseInt, parseFloat, isFinite, encodeURIComponent, decodeURIComponent };
  if (!o.noRecorder) ctx.MediaRecorder = MediaRecorder;
  if (o.audio) ctx.AudioContext = AudioContext;
  ctx.window = ctx;                                    // as in a browser, window is the global object
  vm.createContext(ctx);
  vm.runInContext(script + ';this.__p=()=>({mode,speed,duel,mt:match?match.t:-1,over:match?match.over:false});', ctx);
  let ts = 0;
  Object.assign(R, { ctx, els, body, document, docH, find: id => find(body, id), p: () => ctx.__p(), B: ctx.Broadcast,
    click: (act, d = {}) => els.panel._h.click({ target: { closest: () => ({ dataset: { act, ...d } }) } }),
    tick: n => { for (let i = 0; i < (n || 1); i++) { ts += 16.7; ctx.raf(ts); } } });
  return R;
}
const assert = (c, m) => { if (!c) throw new Error('FAILED: ' + m); };
function toLadder(g) {
  g.tick(80);                                           // lets the ladder fill with house fighters
  if (g.p().mode !== 'board') g.els.btnBoard._h.click();
  assert(g.p().mode === 'board', 'ladder screen open');
}
function runToOverlay(g, each) {
  let n = 0;
  while (!g.find('bcOverlay') && n++ < 60 * 400) { g.tick(1); if (each) each(n); }
  assert(g.find('bcOverlay'), 'overlay appeared (state ' + JSON.stringify(g.B.stats()) + ')');
  return n;
}

// 1. a full recorded duel
let g = boot({ share: true });
assert(g.B && g.B.supported() === true, 'Broadcast is defined and supported');
toLadder(g);
assert(!g.els.panel.innerHTML.includes('id="btnRec"'), 'the ladder has no record button: only the automatic video records');
g.click('recduel');
assert(g.p().mode === 'duel' && g.B.recording, 'recording armed and duel started');
let frozen = 0, sawZero = false, movedInIntro = false, slowOpen = 0, speedTapped = false, endFrames = 0;
const frames1 = runToOverlay(g, n => {
  const p = g.p();
  if (p.speed === 0) { frozen++; sawZero = true; }
  if (p.duel && p.duel.done) endFrames++;
  if (n < 60 && p.mt > 0.5) movedInIntro = true;         // the video opens on the fight itself
  if (n > 80 && n < 190 && p.speed > 0 && p.speed < .5) slowOpen++;   // then slows for the question
  if (n === 400 && !speedTapped) { speedTapped = true; g.els.btnSpeed._h.click(); }   // a stray tap on Speed mid-recording
  if (n === 402) assert(p.speed <= 1, 'the recorder keeps its own speed after a tap on Speed, got ' + p.speed);
});
let st = g.B.stats(), T = g.report.texts, p = g.p();
assert(movedInIntro && slowOpen > 80, 'the video opens on the fight, then slows for the question: ' + slowOpen + ' slow frames');
const rounds = p.duel.score[0] + p.duel.score[1];
const expectFrozen = (0.8 * (rounds - 1)) / 0.0167;
assert(sawZero && Math.abs(frozen - expectFrozen) < 14, 'held for each round call: ' + frozen + ' frames, expected about ' + Math.round(expectFrozen));
for (const s of ['who takes the crown?', 'VS', '#1', '#2', 'ROUND 1', 'ROUND 2', 'FINAL', 'is today’s Duel King', 'MAKE YOURS AT', 'example.test/balls'])
  assert(T.has(s), 'frame text drawn: ' + s + ' (have ' + [...T].slice(0, 40).join(' | ') + ')');
if (rounds === 3) assert(T.has('DECIDER'), 'third round is announced');
assert(g.recorders.length === 1 && g.recorders[0].starts === 1 && g.recorders[0].stops === 1, 'recorder started once and stopped once');
assert(g.captures[0] === 60 && g.recorders[0].opts.videoBitsPerSecond === 8000000 && g.recorders[0].opts.mimeType === 'video/webm;codecs=vp9,opus', 'capture and recorder options: ' + JSON.stringify([g.captures, g.recorders[0].opts]));
assert(st.frames > 400 && st.frames >= frames1 - 3, 'a video frame for every page frame: ' + st.frames + ' of ' + frames1);
assert(Math.abs(st.seconds - frames1 * 0.0167) < 0.5, 'recorded length matches the clock: ' + st.seconds.toFixed(1) + 's');
assert(p.speed === 1 && g.els.btnSpeed.textContent === 'Speed 1×', 'speed forced to 1: ' + p.speed + ' / ' + g.els.btnSpeed.textContent);
assert(p.duel.done && p.mode === 'duel', 'duel finished normally');
const save = g.find('bcSave'), vid = g.find('bcVideo');
assert(vid && /^blob:/.test(vid.src) && vid.controls === true, 'preview video uses the blob');
assert(save && /^blob:/.test(save.href) && /^duel-king-\d{4}-\d\d-\d\d-[a-z0-9-]+-vs-[a-z0-9-]+\.webm$/.test(save.download), 'save link: ' + (save && save.download));
assert(g.find('bcShare') && g.find('bcClose') && g.find('bcMeta') && /seconds · 2\.4 MB · WEBM/.test(g.find('bcMeta').textContent), 'share, close and details: ' + (g.find('bcMeta') || {}).textContent);
g.find('bcShare')._h.click(); assert(g.shares === 1, 'share hands the file to the system sheet');
assert(!g.body.children.some(c => c.tagName === 'CANVAS'), 'the recording canvas is gone from the page');
assert(g.report.outside.length === 0, 'text outside the frame: ' + g.report.outside.slice(0, 4).join(' ; '));
assert(g.report.bad.length === 0, 'non-finite numbers: ' + g.report.bad.slice(0, 3).join(' ; '));
console.log('recorded duel ok:', rounds, 'rounds,', st.frames, 'frames,', st.seconds.toFixed(1) + 's,', g.report.calls, 'canvas calls, file', save.download);
assert(Math.abs(endFrames * 0.0167 - 2.8) < 0.25, 'the video runs about 2.8s past the end of the duel: ' + (endFrames * 0.0167).toFixed(2));
console.log('  held', frozen, 'frames for round calls; the closing screen ends', (endFrames * 0.0167).toFixed(1) + 's after the duel is decided');

// 2. a second recording straight after
g.find('bcClose')._h.click();
assert(!g.find('bcOverlay') && g.revoked.length === 1, 'Close removes the overlay and frees the file');
g.click('board'); assert(g.p().mode === 'board', 'back on the ladder');
g.click('recduel');
runToOverlay(g);
assert(g.recorders.length === 2 && g.recorders[1].starts === 1 && g.recorders[1].stops === 1 && g.p().speed === 1, 'second recording works');
console.log('second recording ok');

// 3. leaving for the ladder during the end card still hands over the video
g.find('bcClose')._h.click(); g.click('board'); g.click('recduel');
let n = 0; while (!g.p().duel.done && n++ < 60 * 400) g.tick(1);
g.tick(20); assert(!g.find('bcOverlay'), 'end card still running');
g.click('board'); g.tick(2);
assert(g.find('bcOverlay') && g.recorders[2].stops === 1, 'leaving early stops and presents');
console.log('early exit ok');

// 4. no MediaRecorder: no button, and the duel plays as usual
g = boot({ noRecorder: true });
assert(g.B.supported() === false, 'unsupported without MediaRecorder');
toLadder(g);
assert(!g.els.panel.innerHTML.includes('btnRec') && !g.els.panel.innerHTML.includes('btnDuel'), 'no record or watch button');
// the arena art keeps its static floor on a spare canvas of its own, so count recorder-canvas calls from here on
const calls0 = g.report.calls;
g.click('recduel');
n = 0; while (!g.p().duel.done && n++ < 60 * 400) g.tick(1);
assert(g.p().duel.done && !g.find('bcOverlay') && g.p().speed !== 0 && !g.B.recording && g.report.calls - calls0 < 5000, 'duel plays normally without a recorder (' + (g.report.calls - calls0) + ' spare-canvas calls)');   // the effects engine paints a few small glow sprites on spare canvases; a recorder would make hundreds of thousands of calls
console.log('no-recorder ok');

// 5. the browser refuses to capture: the duel still plays, nothing is left behind
g = boot({ captureThrows: true });
toLadder(g); g.click('recduel');
n = 0; while (!g.p().duel.done && n++ < 60 * 400) g.tick(1);
g.tick(300);
assert(g.p().duel.done && !g.find('bcOverlay') && g.p().speed === 1 && !g.B.recording && g.captures.join() === '60,30', 'failed start leaves the duel alone: ' + JSON.stringify([g.p().speed, g.captures]));
assert(!g.body.children.some(c => c.tagName === 'CANVAS'), 'no canvas left behind');
console.log('capture-refused ok');

// 6. sound is recorded when it exists, mp4 is used where WebM cannot be recorded, and hiding the page cuts the recording short
g = boot({ audio: true, mp4: true });
toLadder(g); g.click('recduel'); g.tick(240);
assert(g.dests === 1 && g.stream.tracks.length === 2 && g.recorders[0].opts.mimeType === 'video/mp4;codecs=avc1,mp4a.40.2', 'audio track added, mp4 chosen: ' + JSON.stringify([g.dests, g.stream.tracks.length, g.recorders[0].opts.mimeType]));
g.document.hidden = true; for (const f of g.docH.visibilitychange || []) f();
assert(g.find('bcOverlay') && /cut short/.test((g.find('bcNote') || {}).textContent || '') && /\.mp4$/.test(g.find('bcSave').download) && g.p().speed === 1, 'hidden page stops the recording and says so');
assert((g.disc || []).length === 1, 'audio tap removed afterwards');
g.document.hidden = false; g.tick(120);
assert(g.p().mode === 'duel' && g.recorders[0].stops === 1, 'the duel itself carries on');
console.log('audio, mp4 and hidden-page ok');

// 7. an empty recording is reported, not offered
g = boot({ empty: true });
toLadder(g); g.click('recduel'); runToOverlay(g);
assert(!g.find('bcSave') && !g.find('bcVideo') && /came out empty/.test(g.find('bcTitle').textContent) && g.find('bcClose'), 'empty recording explained');
console.log('empty-recording ok');
