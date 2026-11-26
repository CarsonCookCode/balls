// Several "phones" share one pretend database. Checks the shared ladder end to end: real climbs arrive with a proof and
// are believed; made-up, copied, mislabelled and out-of-date entries are not; names pass through the filter; other
// players turn up as rivals; and play carries on with the database down.  Usage: node tools/net-test.js
// Nothing here talks to the real database: loadbrawl blanks its address and this file puts a pretend one in its place.
const vm = require('vm');
const base = require('./loadbrawl').load('all');
const URL0 = 'https://example-default-rtdb.firebaseio.test', DAY = '2026-11-25', DAY0 = Date.parse(DAY + 'T00:00:00Z');
const remote = {};                                    // path -> value, like the real thing
let clock = DAY0 + 3600000, puts = 0, refused = 0, gets = 0, down = false;
const logged = [];
async function fakeFetch(url, opt = {}) {
  if (down) throw new Error('offline');
  if (!url.startsWith(URL0 + '/') || !url.endsWith('.json')) throw new Error('unexpected address ' + url);
  const path = url.slice(URL0.length + 1, -5).split('/');
  if ((opt.method || 'GET') === 'GET') {
    gets++; let node = remote; for (const p of path) node = node && node[p];
    return { ok: true, json: async () => (node === undefined ? null : JSON.parse(JSON.stringify(node))) };
  }
  if (opt.method === 'PUT') {                           // like the real rules: a climb can be created, never replaced
    if (path[0] !== 'climbs' || path.length !== 4) throw new Error('unexpected write to ' + path.join('/'));
    const v = JSON.parse(opt.body); if (v.t && v.t['.sv']) v.t = clock += 1000;
    let node = remote; for (const p of path.slice(0, -1)) node = node[p] = node[p] || {};
    if (node[path[3]] !== undefined) { refused++; return { ok: false, status: 403, json: async () => ({ error: 'Permission denied' }) }; }
    puts++; node[path[3]] = v; return { ok: true, json: async () => v };
  }
  if (opt.method === 'POST') {                          // the play log: each entry gets its own key
    const v = JSON.parse(opt.body);
    if (typeof v.e !== 'string' || typeof v.d !== 'string' || v.d.length > 1500 || path[0] !== 'log' || path.length !== 3) throw new Error('bad log entry ' + url + ' ' + opt.body.slice(0, 80));
    logged.push({ pid: path[2], e: v.e, d: JSON.parse(v.d) });
    return { ok: true, json: async () => ({ name: 'x' }) };
  }
  throw new Error('unexpected method');
}
function el(id) {
  return { id, textContent: '', innerHTML: '', value: '', hidden: false, style: {}, dataset: {}, children: [], classList: { toggle() {} }, _h: {},
    addEventListener(t, f) { this._h[t] = f; }, setAttribute() {}, getBoundingClientRect() { return { width: 360, height: 360, left: 0, top: 0 }; },
    getContext() { return new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true }); }, width: 0, height: 0 };
}
function boot(mode) {                                  // mode: 'enforce', 'check' or '' (offline)
  const els = {}, store = {};
  class FakeDate { static now() { return clock; } static parse(s) { return Date.parse(s); } getUTCFullYear() { return 2026; } getUTCMonth() { return 10; } getUTCDate() { return 25; } }
  const ctx = { document: { getElementById: id => els[id] || (els[id] = el(id)), addEventListener() {}, createElement: () => el('x') }, window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 2 },
    matchMedia: () => ({ matches: false }), localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, requestAnimationFrame: f => { ctx.raf = f; },
    navigator: { userAgent: 'test' }, location: { hash: '', search: '', href: 'x', host: 'x', pathname: '/' }, Math, console, setTimeout: () => 0, JSON, Set, Map, Number, String, Array, Object, Date: FakeDate, Promise, fetch: fakeFetch };
  vm.createContext(ctx);
  const at = "const NET={url:'',proof:'check'}";
  if (!base.includes(at)) throw new Error('the NET line has changed: update tools/net-test.js');
  const src = mode ? base.replace(at, "const NET={url:'" + URL0 + "',proof:'" + mode + "'}") : base;
  vm.runInContext(src + ';this.__p=()=>({mode,run,today,best,netOk:Net.ok,netId:Net.id,rows:Net.rows,pending:Net.pending()});this.__s=standings;this.__t=target;this.__pair=duelPair;this.__type=typeOf;this.__pc=()=>choice;this.__net=Net;this.__RULES=RULES;', ctx);
  let ts = 0;
  return { ctx, els, store, p: () => ctx.__p(),
    click: (act, d = {}) => els.panel._h.click({ target: { closest: () => ({ dataset: { act, ...d } }) } }),
    type: (id, value) => els.panel._h.input({ target: { id, value } }),
    tick: n => { for (let i = 0; i < n; i++) { ts += 16.7; ctx.raf(ts); } } };
}
const assert = (c, m) => { if (!c) throw new Error('FAILED: ' + m); };
const settle = () => new Promise(r => setImmediate(r));
function make(g, key, name) { g.click('weapon', { key }); g.click('str', { i: 1 }); g.click('size', { i: 1 }); g.type('inName', name); }
async function climbOnce(g, pickIdx, seen) {
  g.click('start'); let guard = 0;
  while (g.p().mode !== 'over' && guard++ < 300000) {
    const p = g.p();
    if (p.mode === 'ready') { if (seen && p.run.rival.owner) seen.add(p.run.rival.owner + ':' + p.run.rival.key); g.click('fight'); }
    else if (p.mode === 'pick') { const c = g.ctx.__pc(); g.click('up', { key: c[(guard + pickIdx) % c.length] }); }
    else g.tick(1);
  }
  await settle(); await settle();
  return g.p().run.st.cleared;
}
// look at the ladder again: pull, then play the waiting proofs
async function look(g) {
  if (g.p().mode === 'board') g.click('closeboard');
  clock += 20000;
  for (let k = 0; k < 4; k++) { g.tick(1000); await settle(); await settle(); }
  g.tick(50); g.els.btnBoard._h.click();
}
(async () => {
  const A = boot('enforce'), B = boot('enforce'), C = boot('enforce');
  await settle();
  assert(A.p().netOk && A.p().netId.length === 16 && A.p().netId !== B.p().netId, 'each phone connects and has its own id');
  make(A, 'blade', 'Ana'); make(B, 'mace', 'Bo'); make(C, 'tesla', 'Cy');
  for (const g of [A, B, C]) g.tick(40);
  const got = { A: 0, B: 0, C: 0 };
  for (let round = 0; round < 14; round++) {
    got.A = Math.max(got.A, await climbOnce(A, round)); got.B = Math.max(got.B, await climbOnce(B, round + 1)); got.C = Math.max(got.C, await climbOnce(C, round + 2));
    if (got.A && got.B && got.C && round >= 2) break;
  }
  const day = remote.climbs && remote.climbs[DAY];
  assert(day && Object.keys(day).length === 3, 'three players have climbs stored for the day: ' + JSON.stringify(Object.keys(day || {})));
  const bestOf = g => Object.values(day[g.p().netId]).sort((a, b) => b.r - a.r)[0];
  const sA = bestOf(A), RULES = A.ctx.__RULES;
  assert(sA.n === 'Ana' && sA.k === 'blade' && sA.r === got.A && sA.v === RULES && typeof sA.p === 'string' && sA.p.length > 10 && typeof sA.t === 'number', 'a stored climb has its name, rungs, rules and proof: ' + JSON.stringify(sA).slice(0, 200));
  assert(Object.values(day[A.p().netId]).every((x, i, a) => !i || a[i - 1].r !== x.r), 'only climbs that beat the best are stored');
  // A looks at the ladder: every climb from another phone is played again here and believed
  await look(A);
  let rows = A.ctx.__s(), names = rows.filter(r => r.player).map(r => r.e.name).sort();
  assert(names.join() === 'Bo,Cy', 'A sees Bo and Cy: ' + names.join());
  assert(A.p().pending === 0 && A.ctx.__net.rejected().length === 0, 'both passed the check on another phone: ' + JSON.stringify(A.ctx.__net.rejected()));
  assert(rows.filter(r => r.you).length === 1 && rows.filter(r => r.house).length === 14, 'A is on the ladder once, with fourteen house fighters');
  // ----- cheating and junk -----
  const bB = bestOf(B), cB = Object.keys(day[B.p().netId]).find(k => day[B.p().netId][k] === bB), t = () => clock += 1000;
  day['zzzzzzzzzzzzzzzz'] = { made: { n: 'Liar', k: 'blade', s: 0, z: 1, c: '#ff0000', u: ['poison'], r: 150, t: t(), v: RULES } };                       // no proof
  day['yyyyyyyyyyyyyyyy'] = { fake: { n: 'Liar2', k: 'blade', s: 0, z: 1, c: '#ff0000', u: ['poison'], r: 150, t: t(), v: RULES, p: '{"s":7,"f":[[0,0,0],[0,0,-1]]}' } };   // a proof that is not that climb
  day['xxxxxxxxxxxxxxxx'] = { [cB]: Object.assign({}, bB, { n: 'Thief', t: t() }) };                                                                  // Bo's climb, copied
  day['wwwwwwwwwwwwwwww'] = { more: Object.assign({}, bB, { n: 'Greedy', r: bB.r + 5, t: t() }) };                                                    // Bo's proof with more rungs claimed: still a copy
  day['vvvvvvvvvvvvvvvv'] = { old: Object.assign({}, bB, { n: 'Old', v: '0000000000', t: t() }) };                                                    // other rules
  day['uuuuuuuuuuuuuuuu'] = { late: Object.assign({}, bB, { n: 'Late', t: DAY0 + 3 * 86400000 }) };                                                   // written on another day
  day['tttttttttttttttt'] = 'hello'; day['bad'] = { a: { n: 'x', k: 'blade', s: 0, z: 1, r: 5, v: RULES } };
  day['ssssssssssssssss'] = { a: { n: '<img src=x onerror=1>', k: 'dragon', s: 0, z: 1, r: 999, v: RULES }, b: 5 };
  const cC = Object.keys(day[C.p().netId])[0]; for (const k of Object.keys(day[C.p().netId])) day[C.p().netId][k].n = 'sh1t head';                     // a name the filter refuses
  await look(A);
  rows = A.ctx.__s(); names = rows.filter(r => r.player).map(r => r.e.name).sort();
  assert(names.join() === 'Bo,Tesla', 'with proofs enforced A still sees only Bo and (renamed by the filter) Cy: ' + names.join());
  const why = A.ctx.__net.rejected().map(x => x.id + ' ' + x.why).sort();
  assert(why.length === 4 && why.some(w => /^zzzzzz no proof/.test(w)) && why.some(w => /^xxxxxx a copy/.test(w)) && why.some(w => /^wwwwww a copy/.test(w)) && why.some(w => /^yyyyyy /.test(w)), 'each cheat is refused for its own reason: ' + why.join(' | '));
  const html = A.els.panel.innerHTML;
  assert(!html.includes('<img') && !html.includes('undefined') && !/sh1t|Liar|Thief|Greedy|Old|Late/.test(html) && new Set(A.ctx.__net.rivals().map(p => p.id)).size === 2 && / · you/.test(html), 'ladder HTML is safe and filtered, and holds two other players and you');
  assert(rows.every((r, i) => !i || rows[i - 1].cleared >= r.cleared), 'ladder sorted');
  // a phone that only checks (the setting the site starts with) still shows the entries, and records each verdict
  const D = boot('check'); await settle(); make(D, 'duck', 'Dee'); D.tick(40); await look(D);
  const dn = D.ctx.__s().filter(r => r.player).map(r => r.e.name).sort();
  assert(dn.includes('Liar') && !dn.includes('Greedy') && dn.includes('Bo') && dn.includes('Ana') && !dn.includes('Thief') && !dn.includes('Old') && !dn.includes('Late'), 'check-only shows unproven entries but never copies, other rules or other days: ' + dn.join());
  const vf = logged.filter(x => x.e === 'vfy' && x.pid === D.p().netId);
  assert(vf.some(x => x.d.ok === 1 && x.d.p === A.p().netId.slice(0, 6)) && vf.some(x => x.d.ok === 0 && x.d.p === 'zzzzzz' && x.d.why === 'no proof'), 'each verdict is written to the play log: ' + JSON.stringify(vf.map(x => x.d.p + ':' + x.d.ok)));
  // an entry cannot be replaced: sending the same climb again is refused by the database
  const before = refused; await A.ctx.__net.pushClimb(DAY, JSON.parse(A.store['brawl.mine']).f.blade);
  assert(refused === before + 1 && bestOf(A).r === got.A, 'a stored climb cannot be overwritten');
  // other players turn up as rivals, by name, and a second fighter of theirs is kept too
  B.click('new'); make(B, 'archer', 'Bo'); B.tick(40);
  let second = 0; for (let k = 0; k < 30 && !second; k++) second = await climbOnce(B, k);
  assert(second > 0 && Object.values(day[B.p().netId]).some(x => x.k === 'archer') && Object.values(day[B.p().netId]).some(x => x.k === 'mace'), "both of Bo's fighters are stored");
  await look(A);
  const boRows = A.ctx.__s().filter(r => r.who === B.p().netId);
  assert(boRows.length === 2 && new Set(boRows.map(r => r.e.key)).size === 2, 'Bo has two rows on the ladder: ' + boRows.length);
  const pr = A.ctx.__pair(); assert(pr.length === 2 && pr[0].who !== pr[1].who, 'the duel is between two different players');
  A.click('closeboard');
  const seen = new Set(); let mine = 0;
  for (let k = 0; k < 40 && !(seen.has('Bo:mace') && seen.has('Bo:archer')); k++) mine = Math.max(mine, await climbOnce(A, k, seen));
  assert(seen.has('Bo:mace') && seen.has('Bo:archer') && ![...seen].some(x => /^Ana:/.test(x)), "Ana meets both of Bo's fighters and never herself: " + [...seen].join());
  // ...and climbs that met other players' fighters still pass the check on another phone
  await look(C);
  const cr = C.ctx.__net.rejected().filter(x => x.id === A.p().netId.slice(0, 6));
  assert(cr.length === 0 && C.ctx.__s().some(r => r.who === A.p().netId), 'climbs that met other players pass on another phone: ' + JSON.stringify(cr));
  // the play log recorded the climbs
  const kinds = new Set(logged.map(x => x.e)), fights = logged.filter(x => x.e === 'fight');
  assert(['open', 'run', 'fight', 'end', 'tap'].every(k => kinds.has(k)), 'log has open, run, fight, end and tap: ' + [...kinds].join());
  assert(fights.length > 5 && fights.every(f => f.d.seed >= 0 && f.d.me.k && f.d.vs.k && f.d.t > 0 && (f.d.win === 0 || f.d.win === 1)), 'every fight entry can be replayed');
  assert(logged.some(x => x.e === 'open' && x.d.ru === RULES && x.d.eng), 'opening the game records the rules and the kind of browser');
  // the duel between two players plays to a result
  await look(A); A.click('duel');
  let guard = 0; while (!vm.runInContext('duel.done', A.ctx) && guard++ < 300000) A.tick(1);
  assert(vm.runInContext('duel.done', A.ctx), 'the duel finishes');
  // the database going away must not break play
  down = true; A.click('board'); A.click('closeboard'); clock += 20000; A.tick(1200); await settle(); await settle();
  assert(!A.p().netOk, 'a failed pull is noticed');
  const r = await climbOnce(A, 3); assert(A.p().mode === 'over' && r >= 0, 'climbing still works with the database down');
  down = false;
  // offline (no address at all) never calls the network
  const g0 = gets + puts, O = boot(''); await settle(); make(O, 'blade', 'Off'); O.tick(40); await climbOnce(O, 1);
  assert(gets + puts === g0 && !O.p().netOk, 'with no address the game never calls the network');
  console.log('shared ladder ok: climbs A/B/C ' + got.A + ' ' + got.B + ' ' + got.C + ' | ' + puts + ' climbs stored, ' + refused + ' overwrite refused, ' + gets + ' reads | cheats refused: ' + why.length + ' | rivals met: ' + [...seen].join(' '));
})().catch(e => { console.error(e.message || e); process.exit(1); });
