// Runs the real page script against a tiny fake DOM: builder, climbs (each must pass its own proof), today's ladder, today's duel and a new day.
const fs = require('fs'), vm = require('vm');
const script = require('./loadbrawl').load('all');
function el(id) {
  return { id, textContent: '', innerHTML: '', value: '', hidden: false, disabled: false, style: {}, dataset: {}, children: [],
    classList: { toggle() {} }, _h: {}, addEventListener(t, f) { this._h[t] = f; }, setAttribute() {}, focus() {}, select() {},
    getBoundingClientRect() { return { width: 360, height: 360, left: 0, top: 0 }; },
    getContext() { return new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true }); }, width: 0, height: 0 };
}
function boot(store, day) {
  const els = {}; const doc = { getElementById: id => els[id] || (els[id] = el(id)), addEventListener() {} };
  class FakeDate { static now() { return 0; } getUTCFullYear() { return 2026; } getUTCMonth() { return 10; } getUTCDate() { return day; } }
  const ctx = { document: doc, window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 2 }, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, requestAnimationFrame: f => { ctx.raf = f; },
    navigator: {}, location: { hash: '', href: 'https://example.test/duel.html' }, Math, console, setTimeout: () => 0, JSON, Set, Number, String, Array, Object, Date: FakeDate };
  vm.createContext(ctx);
  vm.runInContext(script + ';this.__p=()=>({mode,step,me,best,run,choice,you,board,today,duel,r:match&&match.f.map(f=>f.r),labels:match&&match.f.map(f=>f.label)});this.__s=standings;this.__t=target;this.__type=typeOf;this.__text=upText;this.__mk=makeBuild;this.__add=addUpgrade;this.__check=r=>Climb.check({key:r.st.key,str:r.st.str,size:r.st.size,ups:r.st.build.ups,cleared:r.st.cleared,proof:Climb.parse(Climb.proof(r.st))});', ctx);
  let ts = 0;
  return { ctx, els, p: () => ctx.__p(),
    click: (act, d = {}) => els.panel._h.click({ target: { closest: () => ({ dataset: { act, ...d } }) } }),
    type: (id, value) => els.panel._h.input({ target: { id, value } }),
    tick: n => { for (let i = 0; i < n; i++) { ts += 16.7; ctx.raf(ts); } } };
}
const assert = (c, m) => { if (!c) throw new Error('FAILED: ' + m); };
const count = (h, s) => h.split(s).length - 1;
const clean = h => !h.includes('undefined') && !h.includes('NaN');
const store = {};
let g = boot(store, 25);

// 1. three taps, then a name; types read as two words
assert(g.p().mode === 'make' && g.p().step === 0 && count(g.els.panel.innerHTML, 'data-act="weapon"') === 3 && count(g.els.panel.innerHTML, 'data-thumb=') === 3, 'step 1 offers three fighters, each with its picture');
g.click('weapon', { key: 'blade' }); g.click('str', { i: 0 }); g.click('size', { i: 1 });
assert(g.p().step === 3 && /Name your Tough Knight/.test(g.els.panel.innerHTML), 'finish screen names the type: ' + g.els.panel.innerHTML.slice(0, 80));
g.type('inName', 'Bob');
const kb = g.ctx.__mk('blade', 0, 1); assert(g.ctx.__type(kb) === 'Tough Knight', 'no upgrades: strength gives the prefix');
g.ctx.__add(kb, 'frost'); assert(g.ctx.__type(kb) === 'Frost Knight', 'one upgrade names it');
g.ctx.__add(kb, 'poison'); g.ctx.__add(kb, 'poison'); assert(g.ctx.__type(kb) === 'Plague Knight', 'most-stacked upgrade wins the name');
assert(g.ctx.__type(g.ctx.__mk('mace', -1, 1)) === 'Ogre', 'plain house fighter is just its class');
console.log('types ok');

// 2. the ladder fills itself with house climbs and gives a target
assert(/Setting up today/.test(g.els.panel.innerHTML) || g.p().board.bots.length > 0, 'ladder announces it is being set up');
g.tick(40);
let p = g.p();
assert(p.board.bots.length === 14 && store['brawl.board2'], 'fourteen house fighters climbed and were saved');
const rows = g.ctx.__s(), tgt = g.ctx.__t();
assert(rows.every((r, i) => !i || rows[i - 1].cleared >= r.cleared), 'standings sorted by rungs');
assert(tgt === rows[1].cleared + 1, 'target is one more than second place');
assert(new RegExp('Clear <b>' + tgt + '</b> rungs to get in').test(g.els.panel.innerHTML), 'start screen shows the target');
console.log('ladder ok: house fighters cleared', rows.map(r => r.cleared).join(','), '| target to get in:', tgt);
g.els.btnBoard._h.click();
assert(g.p().mode === 'board' && count(g.els.panel.innerHTML, '<li') === 14 && !/btnDuel|btnRec|btnClose/.test(g.els.panel.innerHTML) && g.els.panel.innerHTML.includes('id="duelNote"') && clean(g.els.panel.innerHTML), 'ladder view lists every fighter, with no duel or back buttons of its own');
assert(count(g.els.panel.innerHTML, 'class=" in"') === 2 || count(g.els.panel.innerHTML, ' in"') === 2, 'top two are marked as in the duel');
g.els.btnBoard._h.click(); assert(g.p().mode === 'make' && g.els.btnBoard.textContent === 'Ladder', 'the footer plate leaves the ladder');

// 3. climbs record today's best and can put you in the duel
const cleared = [];
let seenShield = false, armedFights = 0, tips = 0, sheets = 0;
for (let n = 0; n < 30; n++) {
  g.click('start');
  assert(g.p().mode === 'ready' && g.p().run.rung === 1 && g.els.round.textContent === 'Rung 1' && g.p().you === 0, 'climb starts on the rung 1 matchup');
  assert(/the matchup/.test(g.els.panel.innerHTML) && g.els.panel.innerHTML.includes('btnFight') && /Health/.test(g.els.panel.innerHTML) && clean(g.els.panel.innerHTML), 'matchup screen drawn');
  g.tick(30); assert(g.p().mode === 'ready', 'nothing happens until Fight is tapped');
  g.click('fight'); assert(g.p().mode === 'fight', 'Fight starts the fight');
  assert(g.els.btnBoard.hidden === true, 'Ladder button is hidden during a fight');
  let guard = 0;
  while (g.p().mode !== 'over' && guard++ < 200000) {
    p = g.p();
    if (p.mode === 'ready') {
      const html = g.els.panel.innerHTML, R = p.run;
      if (R.rung >= 5) { seenShield = true; assert(R.st.gotShield, 'a shield is earned on reaching rung 5'); }
      if (R.rung > 10) assert(R.st.gotLife, 'an extra life is earned after rung 10');
      assert(html.includes('btnArm') === (R.shield > 0), 'the shield button shows exactly when a shield is held');
      if (R.shield > 0 && (guard + n) % 2 === 0) { g.click('arm'); assert(g.p().run.armed && /Shield raised/.test(g.els.panel.innerHTML), 'shield can be raised'); armedFights++; }
      if (R.build.ups.length) {                        // tapping one of your upgrade tags explains it; tapping again closes it
        const id = R.build.ups[0]; g.click('tip', { side: '0', key: id });
        assert(g.els.panel.innerHTML.includes('id="tipLine"') && g.els.panel.innerHTML.includes(g.ctx.__text(R.build, id)) && clean(g.els.panel.innerHTML), 'tapping a tag shows what the upgrade does');
        g.click('tip', { side: '0', key: id }); assert(!g.els.panel.innerHTML.includes('id="tipLine"'), 'tapping it again closes it'); tips++;
      }
      if ((guard + n) % 11 === 0) { g.click('sheet'); assert(g.els.panel.innerHTML.includes('btnFight') && !g.els.panel.innerHTML.includes('btnSheet'), 'the matchup has no sheet'); }
      g.click('fight');
    } else if (p.mode === 'pick') {
      assert(count(g.els.panel.innerHTML, 'data-act="up"') === p.choice.length && count(g.els.panel.innerHTML, 'class="ic"') === p.choice.length && /see your fighter/.test(g.els.panel.innerHTML) && clean(g.els.panel.innerHTML), 'upgrade screen drawn');
      if (!sheets || (guard + n) % 9 === 0) {
        assert(g.els.panel.innerHTML.includes('class="mecard"') && g.els.panel.innerHTML.includes('see your fighter'), 'the boon screen opens with your fighter, which leads to the sheet');
        g.click('sheet');
        const h = g.els.panel.innerHTML, R = g.p().run;
        assert(h.includes('id="btnSheetBack"') && h.includes('Health') && h.includes('Its own boon') && h.includes('What a ') && h.includes(g.ctx.__type(R.build)) && !h.includes('data-act="up"') && clean(h), 'the sheet shows the class, its numbers and its own boon');
        for (const id of new Set(R.build.ups)) assert(h.includes(g.ctx.__text(R.build, id)), 'the sheet explains every boon: ' + id);
        g.click('sheet'); assert(count(g.els.panel.innerHTML, 'data-act="up"') === p.choice.length, 'Back returns to the boons'); sheets++;
      }
      g.click('up', { key: p.choice[(guard + n) % p.choice.length] });
    } else g.tick(1);
  }
  p = g.p();
  assert(g.els.panel.innerHTML.includes('btnAgain') && clean(g.els.panel.innerHTML), 'end panel text is complete');
  cleared.push(p.run.st.cleared);
  { const v = g.ctx.__check(p.run); assert(v.ok, 'a finished climb passes its own proof: ' + v.why); }
  const top = Math.max(...cleared);
  assert(p.today.cleared === top && p.best === top, 'today and best track the highest climb: ' + p.today.cleared + ' vs ' + top);
}
const top = Math.max(...cleared), inNow = g.ctx.__s().slice(0, 2).some(r => r.you);
assert(inNow === (top >= tgt), 'you are in the duel exactly when you reached the target');
assert(inNow ? /You are in today/.test(g.els.panel.innerHTML) : /Clear <b>\d+<\/b> rungs to get in/.test(g.els.panel.innerHTML), 'end screen says whether you are in');
console.log('30 climbs ok. Best today', top, '| in the duel:', inNow, '| reached rung 5:', seenShield, '| fights with the shield raised:', armedFights, '| upgrade tags tapped:', tips, '| sheets opened:', sheets);

// 4. today's duel plays best of three to a result
g.els.btnBoard._h.click(); g.click('duel');
assert(g.p().mode === 'duel' && /best of three/.test(g.els.panel.innerHTML) && g.els.panel.innerHTML.includes('duelrow') && g.els.panel.innerHTML.includes('btnLeave') && clean(g.els.panel.innerHTML), 'duel screen shows two types');
g.tick(120); g.click('board'); assert(g.p().mode === 'board' && g.els.panel.innerHTML.includes('class="lb"'), 'leaving the duel returns to the ladder');
g.click('duel'); assert(g.p().mode === 'duel' && g.p().duel.score.join() === '0,0', 'a fresh duel starts after leaving');
let guard = 0; while (!g.p().duel.done && guard++ < 200000) g.tick(1);
p = g.p();
assert(p.duel.done && Math.max(...p.duel.score) === 2 && p.duel.score[0] + p.duel.score[1] <= 3, 'duel ends at two wins: ' + p.duel.score);
assert(/is today’s Duel King/.test(g.els.panel.innerHTML) && clean(g.els.panel.innerHTML), 'winner announced');
g.tick(200); assert(g.p().duel.score[0] + g.p().duel.score[1] === p.duel.score[0] + p.duel.score[1], 'no extra rounds after the result');
console.log('duel ok:', g.ctx.__type(p.duel.a), p.duel.score.join('-'), g.ctx.__type(p.duel.b));
g.click('board'); assert(g.p().mode === 'board', 'back to the ladder');

// 5. same day keeps the board and your climb; a new day resets both
g = boot(store, 25);
assert(g.p().board.bots.length === 14 && g.p().today.cleared === top && g.p().step === 3, 'same day: board, today and fighter restored');
g = boot(store, 26);
assert(g.p().board.bots.length === 0 && g.p().today.cleared === 0 && g.p().best === top, 'new day: fresh ladder, best kept');
g.tick(40); assert(g.p().board.bots.length === 14, 'new day ladder fills');
console.log('day rollover ok');
