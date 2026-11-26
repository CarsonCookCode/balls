// Ball Brawl balance lab. Plays very many simulated fights and climbs and reports what is too strong, too weak or never worth taking.
// The rule it checks: nothing should be better than something else in every situation.
//
//   node tools/balance.js classes [--n 12] [--focus key,key]   every class against every other: win rates, counters, one-sided pairings
//   node tools/balance.js tune --keys a,b [--write]            nudge those classes' damage dial toward a 50% win rate (--write saves it)
//   node tools/balance.js boons [--reps 3]                     what each upgrade is worth, by class and by stage of a climb
//   node tools/balance.js sig [--focus key,key]               what each level of a class's own upgrade is worth
//   node tools/balance.js stacks                               what each extra copy of a stackable upgrade is worth
//   node tools/balance.js pairs                                upgrades that are far stronger together than apart
//   node tools/balance.js climb [--n 30]                       real climbs: random picks vs a player who tests every offer first
//   node tools/balance.js all                                  everything, with the red flags gathered at the end
// Common options: --with file.js (also load a file that duel.html does not list yet), --workers N, --seed N, --json out.json
//
// It loads the simulation files duel.html lists (brawl-sim.js, class packs, upgrade packs), so new content is covered as soon as it is added.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const EXPORT = ';return {FIGHTERS,ROSTER,UPGRADES,UP_IDS,STRENGTHS,SIZES,makeBuild,canTake,addUpgrade,offers,rival,createMatch,mulberry32,typeOf,upName};';

function simFiles(extra) {
  const html = fs.readFileSync(path.join(ROOT, 'duel.html'), 'utf8');
  const list = [...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m => m[1]).filter(f => /^brawl-(sim|pack\d*|boons\d*)\.js$/.test(f));
  for (const f of extra) if (f && !list.includes(f)) list.push(f);
  return list;
}
const simSource = files => files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + EXPORT;

// ---------------------------------------------------------------- worker: plays what it is told to
function workerMain() {
  const S = new Function(workerData.src)();
  const build = spec => {
    if (spec.rv) return S.rival(spec.rv[0], S.mulberry32(spec.rv[1]));
    const b = S.makeBuild(spec.k, spec.s == null ? -1 : spec.s, spec.z == null ? 1 : spec.z);
    for (const id of spec.u || []) if (S.UPGRADES[id] && S.canTake(b, id)) S.addUpgrade(b, id);
    if (spec.m) { b.hp *= spec.m; b.dmg *= spec.m; }
    return b;
  };
  let count = 0;
  const play = (A, B, seed) => {
    count++;
    const m = S.createMatch(A, B, seed); let steps = 0;
    while (!m.over && steps++ < 6000) { m.step(); m.events.length = 0; }
    if (!m.over) throw new Error('match did not end: ' + A.key + ' [' + A.ups + '] v ' + B.key + ' [' + B.ups + '] seed ' + seed);
    for (const f of m.f) if (!Number.isFinite(f.hp) || !Number.isFinite(f.x) || !Number.isFinite(f.y)) throw new Error('bad number in ' + A.key + ' [' + A.ups + '] v ' + B.key + ' [' + B.ups + '] seed ' + seed);
    return m;
  };
  const setDmg = d => { if (d) for (const k in d) if (S.FIGHTERS[k]) S.FIGHTERS[k].dmg = d[k]; };
  const jobs = {
    matches(p) {
      setDmg(p.dmg);
      const w = new Array(p.list.length); let t = 0, to = 0, tmax = 0;
      for (let i = 0; i < p.list.length; i++) { const [a, b, seed] = p.list[i], m = play(build(a), build(b), seed); w[i] = m.winner; t += m.t; if (m.t >= 70) to++; if (m.t > tmax) tmax = m.t; }
      return { w, t, to, tmax };
    },
    // real climbs, as the game plays them: beat the rung's rival, take one of three offered upgrades, go on until a loss
    climbs(p) {
      setDmg(p.dmg);
      const out = [];
      for (const seed of p.seeds) {
        const rnd = S.mulberry32(seed), b = build(p.spec), fights = []; let rung = 1; const p0 = count;
        const off = {}, got = {};
        // the two second chances a player gets: a shield from rung 5 and an extra life after rung 10. The shield is the
        // player's to place; here it is simply spent on the first loss, which is the least it is worth.
        let shield = 0, life = 0, gotShield = false, gotLife = false;
        while (rung <= p.cap) {
          if (rung >= 5 && !gotShield) { gotShield = true; shield = 1; }
          if (rung > 10 && !gotLife) { gotLife = true; life = 1; }
          const res = play(b, S.rival(rung, rnd), (rnd() * 2147483647) | 0);
          if (res.draw && fights.length < p.cap * 6) { fights.push(0); continue; }   // a draw: a new rival on the same rung, nothing spent
          const won = res.winner === 0 && !res.draw;
          fights.push(won ? 1 : 0);
          if (!won) { if (shield) { shield = 0; continue; } if (life) { life = 0; continue; } break; }
          const o = S.offers(b, rnd, 3);
          if (o.length) {
            let pick = o[(rnd() * o.length) | 0];
            if (p.policy === 'look') {                       // a careful player: try each offer against the rivals coming up, keep the best
              let best = -1;
              const tests = []; for (let k = 0; k < p.K; k++) tests.push([rung + 1 + (k % 3), (rnd() * 2147483647) | 0, (rnd() * 2147483647) | 0]);
              for (const id of o) {
                const c = build({ k: b.key, s: b.str, z: b.size, u: b.ups.concat(id) }); let w = 0;
                for (const t of tests) if (play(c, S.rival(t[0], S.mulberry32(t[1])), t[2]).winner === 0) w++;
                if (w > best) { best = w; pick = id; }
              }
            } else if (p.policy && p.policy.prefer && o.includes(p.policy.prefer)) pick = p.policy.prefer;
            for (const id of o) off[id] = (off[id] || 0) + 1;
            got[pick] = (got[pick] || 0) + 1;
            S.addUpgrade(b, pick);
          }
          rung++;
        }
        out.push({ r: rung - 1, fights, off, got, ups: b.ups.slice(), capped: rung > p.cap, n: count - p0 });
      }
      return out;
    },
  };
  parentPort.on('message', msg => {
    try { parentPort.postMessage({ id: msg.id, out: jobs[msg.type](msg.payload) }); }
    catch (e) { parentPort.postMessage({ id: msg.id, err: String(e && e.message || e) }); }
  });
}

// ---------------------------------------------------------------- main
class Pool {
  constructor(n, src) {
    this.all = []; this.idle = []; this.q = []; this.cb = new Map(); this.id = 0;
    for (let i = 0; i < n; i++) {
      const w = new Worker(__filename, { workerData: { src } });
      w.on('message', msg => { const c = this.cb.get(msg.id); this.cb.delete(msg.id); this.idle.push(w); this.pump(); if (msg.err) c.rej(new Error(msg.err)); else c.res(msg.out); });
      w.on('error', e => { console.error(e); process.exit(1); });
      this.all.push(w); this.idle.push(w);
    }
  }
  run(type, payload) { return new Promise((res, rej) => { this.q.push({ type, payload, res, rej }); this.pump(); }); }
  pump() { while (this.idle.length && this.q.length) { const w = this.idle.pop(), j = this.q.shift(), id = ++this.id; this.cb.set(id, j); w.postMessage({ id, type: j.type, payload: j.payload }); } }
  close() { for (const w of this.all) w.terminate(); }
}

async function main() {
  const args = process.argv.slice(2), mode = args[0] || 'all';
  const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
  const has = name => args.includes('--' + name);
  const extra = String(opt('with', '')).split(',').filter(Boolean);
  const files = simFiles(extra), src = simSource(files), S = new Function(src)();
  const workers = Math.max(1, +opt('workers', Math.min(10, os.cpus().length - 2)));
  const pool = new Pool(workers, src), SEED = +opt('seed', 1);
  const K = S.ROSTER, U = S.UP_IDS, name = k => S.FIGHTERS[k].name, uname = id => id === 'sig' ? 'Signature' : S.UPGRADES[id].name;
  const pct = v => (v * 100).toFixed(0) + '%', pp = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(0);
  const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
  const flags = [], report = {};
  const flag = (kind, text) => { flags.push('[' + kind + '] ' + text); };
  let dmg = null;                                    // damage dials being tried by `tune`
  let played = 0; const t00 = Date.now();
  async function matches(list) {
    const CH = 300, parts = [];
    for (let i = 0; i < list.length; i += CH) parts.push(pool.run('matches', { dmg, list: list.slice(i, i + CH) }));
    const res = await Promise.all(parts), w = []; let t = 0, to = 0, tmax = 0;
    for (const r of res) { for (const x of r.w) w.push(x); t += r.t; to += r.to; tmax = Math.max(tmax, r.tmax); }
    played += list.length;
    return { w, t, to, tmax };
  }
  const hash = (...a) => { let h = 2166136261 ^ SEED; for (const v of a) { h = Math.imul(h ^ (v | 0), 16777619); h ^= h >>> 13; } return (h >>> 0) || 1; };

  // ----- classes: every class against every other
  async function classes(n, focus, quiet) {
    const list = [], idx = [];
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) {
      if (focus && !focus.includes(K[i]) && !focus.includes(K[j])) continue;
      // each fight uses a different mix of strength and size on both sides, as real fights do; identical 100-health fighters
      // make win rates jump whenever a damage dial crosses 'one hit fewer to win'
      for (let s = 0; s < n; s++) { const first = s % 2 === 0, h = hash(i, j, s, 5), A = { k: K[i], s: h % 3, z: (h >>> 3) % 3 }, B = { k: K[j], s: (h >>> 6) % 3, z: (h >>> 9) % 3 }; list.push([first ? A : B, first ? B : A, hash(i, j, s)]); idx.push([i, j, first]); }
    }
    const r = await matches(list), win = {}, games = {}, table = {};
    for (const k of K) { win[k] = 0; games[k] = 0; table[k] = {}; }
    for (let q = 0; q < list.length; q++) {
      const [i, j, first] = idx[q], iWon = (r.w[q] === 0) === first, a = K[i], b = K[j];
      win[iWon ? a : b]++; games[a]++; games[b]++;
      table[a][b] = (table[a][b] || 0) + (iWon ? 1 : 0) / n; table[b][a] = (table[b][a] || 0) + (iWon ? 0 : 1) / n;
    }
    const rows = K.filter(k => games[k] && (!focus || focus.includes(k))).map(k => {
      const opp = Object.entries(table[k]).sort((a, b) => b[1] - a[1]);
      return { k, wr: win[k] / games[k], good: opp.filter(o => o[1] >= .6).length, bad: opp.filter(o => o[1] <= .4).length, best: opp[0], worst: opp[opp.length - 1], n: opp.length };
    }).sort((a, b) => b.wr - a.wr);
    if (!quiet) {
      console.log('\nCLASSES: ' + K.length + ' classes, ' + n + ' fights per pairing, ' + list.length + ' fights; average fight ' + (r.t / list.length).toFixed(1) + 's, longest ' + r.tmax.toFixed(0) + 's, timeouts ' + r.to);
      console.log(pad('class', 14) + lpad('wins', 5) + '  beats/loses to  easiest rival        hardest rival');
      for (const x of rows) console.log(pad(name(x.k), 14) + lpad(pct(x.wr), 5) + lpad(x.good, 7) + ' / ' + pad(x.bad, 6) + pad(name(x.best[0]) + ' ' + pct(x.best[1]), 21) + name(x.worst[0]) + ' ' + pct(x.worst[1]));
      for (const x of rows) {
        if (x.wr > .58) flag('class too strong', name(x.k) + ' wins ' + pct(x.wr) + ' of all fights');
        if (x.wr < .42) flag('class too weak', name(x.k) + ' wins ' + pct(x.wr) + ' of all fights');
        if (n >= 8 && x.n >= 10 && x.bad === 0 && x.worst[1] >= .45) flag('class has no counter', name(x.k) + ': its hardest rival (' + name(x.worst[0]) + ') still loses to it ' + pct(x.worst[1]));
        if (n >= 8 && x.n >= 10 && x.good === 0 && x.best[1] <= .55) flag('class counters nothing', name(x.k) + ': its easiest rival (' + name(x.best[0]) + ') still beats it ' + pct(1 - x.best[1]));
      }
      if (r.to / list.length > .02) flag('fights time out', (r.to / list.length * 100).toFixed(1) + '% of class fights hit the time limit');
      report.classes = rows.map(x => ({ key: x.k, winRate: +x.wr.toFixed(3), beats: x.good, losesTo: x.bad }));
    }
    return { rows, table, avg: r.t / list.length, to: r.to };
  }

  // ----- tune: move damage dials toward 50%
  async function tune(keys, rounds, n, write) {
    dmg = {}; for (const k of keys) { if (!S.FIGHTERS[k]) throw new Error('no class ' + k); dmg[k] = S.FIGHTERS[k].dmg; }
    console.log('tuning ' + keys.join(', ') + ' against all ' + K.length + ' classes');
    for (let r = 0; r < rounds; r++) {
      const { rows } = await classes(n, keys, true);
      console.log('  round ' + (r + 1) + ': ' + rows.map(x => x.k + ' ' + pct(x.wr)).join(', '));
      for (const x of rows) { const f = Math.pow(Math.min(1.8, Math.max(.55, .5 / Math.max(.05, x.wr))), .6); dmg[x.k] = +(dmg[x.k] * f).toFixed(2); }
    }
    const fin = await classes(n * 2, keys, true);
    console.log('  after:   ' + fin.rows.map(x => x.k + ' ' + pct(x.wr)).join(', '));
    console.log('  damage dials: ' + JSON.stringify(dmg));
    if (write) for (const k of keys) {
      let done = false;
      for (const f of files) {
        const p = path.join(ROOT, f); let s = fs.readFileSync(p, 'utf8');
        const re = [new RegExp('(FIGHTERS\\.' + k + '\\s*=\\s*\\{[^\\n]*?\\bdmg:)\\s*[0-9.]+'), new RegExp('(\\n\\s*' + k + ':\\s*\\{name:[^\\n]*?\\bdmg:)\\s*[0-9.]+')];
        for (const x of re) if (!done && x.test(s)) { s = s.replace(x, (m, a) => a + dmg[k]); fs.writeFileSync(p, s); done = true; }
      }
      console.log(done ? '  wrote ' + k + ' = ' + dmg[k] : '  COULD NOT find the dmg of ' + k + ' to write it');
    }
  }

  // a random fighter part-way up a climb: class, strength, size and `ups` random upgrades, never the ones in `without`
  function context(key, ups, seed, without) {
    const rnd = S.mulberry32(seed), spec = { k: key, s: (rnd() * 3) | 0, z: (rnd() * 3) | 0, u: [] }, b = S.makeBuild(key, spec.s, spec.z);
    let guard = 0;
    while (spec.u.length < ups && guard++ < 200) { const o = S.offers(b, rnd, 1)[0]; if (!o) break; if (without && without.includes(o)) continue; S.addUpgrade(b, o); spec.u.push(o); }
    return { spec, b };
  }
  const STAGES = [{ name: 'early', ups: 1, rung: 3 }, { name: 'mid', ups: 5, rung: 7 }, { name: 'late', ups: 12, rung: 14 }];

  // ----- boons: what one more copy of each upgrade is worth, measured against the same rivals with and without it
  async function boons(reps, M) {
    const list = [], tag = [];
    K.forEach((key, ci) => STAGES.forEach((st, si) => {
      for (let rep = 0; rep < reps; rep++) {
        const c = context(key, st.ups, hash(ci, si, rep, 11));
        const foes = []; for (let j = 0; j < M; j++) foes.push([{ rv: [st.rung, hash(ci, si, rep, j, 12)] }, hash(ci, si, rep, j, 13)]);
        for (const id of [''].concat(U.filter(id => S.canTake(c.b, id)))) {
          const spec = id ? { k: c.spec.k, s: c.spec.s, z: c.spec.z, u: c.spec.u.concat(id) } : c.spec;
          for (const f of foes) { list.push([spec, f[0], f[1]]); tag.push([ci, si, id]); }
        }
      }
    }));
    const r = await matches(list);
    // wins[ci][si][id] = [won, played]
    const acc = {};
    for (let q = 0; q < list.length; q++) { const [ci, si, id] = tag[q], key = ci + '|' + si, a = acc[key] = acc[key] || {}, x = a[id] = a[id] || [0, 0]; x[1]++; if (r.w[q] === 0) x[0]++; }
    const d = {};                                    // d[id][si][ci] = change in win rate
    for (const id of U) d[id] = STAGES.map(() => ({}));
    for (const key in acc) { const [ci, si] = key.split('|').map(Number), a = acc[key], base = a[''][0] / a[''][1]; for (const id in a) if (id) d[id][si][ci] = a[id][0] / a[id][1] - base; }
    const mean = o => { const v = Object.values(o); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
    const baseAll = STAGES.map((st, si) => { let w = 0, n = 0; for (const key in acc) if (+key.split('|')[1] === si) { w += acc[key][''][0]; n += acc[key][''][1]; } return w / n; });
    console.log('\nUPGRADES: value of one more copy, in points of win rate, for a fighter ' + STAGES.map(s => s.name + ' (' + s.ups + ' upgrades, rung ' + s.rung + ')').join(', '));
    console.log('  without the extra upgrade those fighters win ' + baseAll.map(pct).join(' / ') + '; ' + list.length + ' fights');
    console.log(pad('upgrade', 16) + ' early   mid  late  helps  hurts  best for                                    worst for');
    const rows = U.map(id => {
      const m = d[id].map(mean), all = {};            // per class, averaged over stages
      for (let ci = 0; ci < K.length; ci++) { const v = d[id].map(o => o[ci]).filter(x => x !== undefined); if (v.length) all[ci] = v.reduce((x, y) => x + y, 0) / v.length; }
      const e = Object.entries(all).sort((a, b) => b[1] - a[1]), n = e.length || 1;
      return { id, m, avg: mean(all), helps: e.filter(x => x[1] >= .04).length / n, hurts: e.filter(x => x[1] <= -.03).length / n, best: e.slice(0, 3), worst: e.slice(-2).reverse(), all, n: e.length };
    }).sort((a, b) => b.avg - a.avg);
    for (const x of rows) console.log(pad(uname(x.id), 16) + x.m.map(v => lpad(pp(v), 6)).join('') + lpad(pct(x.helps), 7) + lpad(pct(x.hurts), 7) + '  ' +
      pad(x.best.map(e => name(K[e[0]]) + ' ' + pp(e[1])).join(', '), 44) + x.worst.map(e => name(K[e[0]]) + ' ' + pp(e[1])).join(', '));
    const med = rows.map(x => x.avg).sort((a, b) => a - b)[rows.length >> 1];
    for (const x of rows) {
      if (x.id === 'sig') continue;
      if (Math.max(...x.m) > .22) flag('upgrade too strong', uname(x.id) + ' adds ' + pp(Math.max(...x.m)) + ' points of win rate on its own (' + STAGES[x.m.indexOf(Math.max(...x.m))].name + ' in a climb)');
      if (x.avg < -.02) flag('upgrade hurts', uname(x.id) + ' lowers win rate by ' + pp(x.avg) + ' on average');
      else if (x.avg < .012 && x.helps < .12) flag('upgrade does nothing', uname(x.id) + ' adds ' + pp(x.avg) + ' on average and helps only ' + pct(x.helps) + ' of classes');
      if (x.helps > .95 && x.avg > med * 1.8 && x.avg > .1) flag('upgrade always good', uname(x.id) + ' helps ' + pct(x.helps) + ' of classes and is worth ' + pp(x.avg) + ' (the middle upgrade is worth ' + pp(med) + ')');
    }
    // the rule itself: is any upgrade at least as good as another for every class?
    const dom = [];
    for (const a of rows) for (const b of rows) {
      if (a === b || a.id === 'sig' || b.id === 'sig' || a.avg - b.avg < .05) continue;
      const both = Object.keys(a.all).filter(ci => ci in b.all); if (both.length < 10) continue;
      const better = both.filter(ci => a.all[ci] > b.all[ci] + .01).length / both.length;
      if (better >= .9) dom.push([a, b, better]);
    }
    const worst = {}; for (const [a, b, f] of dom) (worst[b.id] = worst[b.id] || []).push(uname(a.id));
    for (const id in worst) if (worst[id].length >= 3) flag('upgrade outclassed', uname(id) + ' is worse than ' + worst[id].length + ' other upgrades for nine classes in ten (for example ' + worst[id].slice(0, 3).join(', ') + ')');
    report.upgrades = rows.map(x => ({ id: x.id, early: +x.m[0].toFixed(3), mid: +x.m[1].toFixed(3), late: +x.m[2].toFixed(3), helps: +x.helps.toFixed(2), hurts: +x.hurts.toFixed(2) }));
    return rows;
  }

  // ----- stacks: is the third copy worth more than the first?
  async function stacks(ctxN, M) {
    const ids = U.filter(id => S.UPGRADES[id].max > 1), list = [], tag = [];
    ids.forEach((id, ui) => {
      for (let c = 0; c < ctxN; c++) {
        const key = K[hash(ui, c, 21) % K.length], cx = context(key, 5, hash(ui, c, 22), [id]);
        if (!S.canTake(cx.b, id)) continue;
        const foes = []; for (let j = 0; j < M; j++) foes.push([{ rv: [9, hash(ui, c, j, 23)] }, hash(ui, c, j, 24)]);
        for (let n = 0; n <= S.UPGRADES[id].max; n++) { const spec = { k: key, s: cx.spec.s, z: cx.spec.z, u: cx.spec.u.concat(Array(n).fill(id)) }; for (const f of foes) { list.push([spec, f[0], f[1]]); tag.push([ui, n]); } }
      }
    });
    const r = await matches(list), acc = ids.map(id => Array.from({ length: S.UPGRADES[id].max + 1 }, () => [0, 0]));
    for (let q = 0; q < list.length; q++) { const [ui, n] = tag[q]; acc[ui][n][1]++; if (r.w[q] === 0) acc[ui][n][0]++; }
    console.log('\nSTACKS: win rate of a mid-climb fighter (5 other upgrades, rivals from rung 9) with 0, 1, 2... copies; ' + list.length + ' fights');
    const out = [];
    ids.forEach((id, ui) => {
      const wr = acc[ui].map(x => x[1] ? x[0] / x[1] : 0), gain = wr.map((v, i) => i ? v - wr[i - 1] : 0).slice(1);
      console.log(pad(uname(id), 16) + wr.map(v => lpad(pct(v), 5)).join('') + '   each copy: ' + gain.map(pp).join(' '));
      const total = wr[wr.length - 1] - wr[0];
      if (total / (wr.length - 1) > .2) flag('stack too strong', uname(id) + ' taken ' + (wr.length - 1) + ' times lifts win rate by ' + pp(total) + ' points (' + pp(total / (wr.length - 1)) + ' a copy)');
      if (gain.length >= 3 && gain[gain.length - 1] > gain[0] + .12 && gain[gain.length - 1] > .15) flag('stack snowballs', uname(id) + ': the last copy is worth ' + pp(gain[gain.length - 1]) + ' but the first only ' + pp(gain[0]));
      out.push({ id, winRate: wr.map(v => +v.toFixed(3)) });
    });
    report.stacks = out;
  }

  // ----- pairs: two upgrades (each taken up to three times) that are worth far more together than the two are apart
  async function pairs(ctxN, M) {
    const ids = U, cx = [], foes = [];
    for (let c = 0; c < ctxN; c++) {
      cx.push(context(K[hash(c, 31) % K.length], 4, hash(c, 32)));
      foes.push(Array.from({ length: M }, (_, j) => [{ rv: [11, hash(c, j, 33)] }, hash(c, j, 34)]));   // strong rivals, so there is room to improve
    }
    const many = id => Array(Math.min(3, S.UPGRADES[id].max)).fill(id);
    const list = [], tag = [];
    const add = (c, ups, t) => { const spec = { k: cx[c].spec.k, s: cx[c].spec.s, z: cx[c].spec.z, u: cx[c].spec.u.concat(ups) }; for (const f of foes[c]) { list.push([spec, f[0], f[1]]); tag.push(t); } };
    for (let c = 0; c < ctxN; c++) {
      add(c, [], 'base');
      for (let i = 0; i < ids.length; i++) add(c, many(ids[i]), 's' + i);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) add(c, many(ids[i]).concat(many(ids[j])), 'p' + i + '_' + j);
    }
    const r = await matches(list), acc = {};
    for (let q = 0; q < list.length; q++) { const a = acc[tag[q]] = acc[tag[q]] || [0, 0]; a[1]++; if (r.w[q] === 0) a[0]++; }
    const wr = t => acc[t][0] / acc[t][1], base = wr('base'), out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = wr('s' + i) - base, b = wr('s' + j) - base, ab = wr('p' + i + '_' + j) - base;
      out.push({ a: ids[i], b: ids[j], da: a, db: b, dab: ab, syn: ab - a - b, wr: wr('p' + i + '_' + j) });
    }
    out.sort((x, y) => y.syn - x.syn);
    console.log('\nPAIRS: ' + ids.length + ' upgrades, up to three copies each, on fighters with 4 other upgrades against rung-11 rivals (base win rate ' + pct(base) + '); ' + list.length + ' fights');
    console.log('  strongest together (points of win rate: each alone, both, and the extra from combining)');
    for (const x of out.slice(0, 14)) console.log('  ' + pad(uname(x.a) + ' + ' + uname(x.b), 34) + lpad(pp(x.da), 5) + lpad(pp(x.db), 5) + ' -> ' + lpad(pp(x.dab), 4) + '   extra ' + pp(x.syn));
    console.log('  weakest together');
    for (const x of out.slice(-6).reverse()) console.log('  ' + pad(uname(x.a) + ' + ' + uname(x.b), 34) + lpad(pp(x.da), 5) + lpad(pp(x.db), 5) + ' -> ' + lpad(pp(x.dab), 4) + '   extra ' + pp(x.syn));
    const top = out.slice().sort((x, y) => y.wr - x.wr);
    console.log('  highest win rate of any pair: ' + top.slice(0, 6).map(x => uname(x.a) + ' + ' + uname(x.b) + ' ' + pct(x.wr)).join('; '));
    // a combination is a problem when it stands far above the other pairs, not merely when six good picks add up
    const p90 = top[Math.floor(top.length * .1)].wr;
    console.log('  nine pairs in ten win ' + pct(p90) + ' or less');
    for (const x of out) if (x.syn > .2 && x.wr > p90 + .3) flag('combination', uname(x.a) + ' + ' + uname(x.b) + ' win ' + pct(x.wr) + ' together (' + pp(x.da) + ' and ' + pp(x.db) + ' points alone); nine pairs in ten win ' + pct(p90) + ' or less');
    for (const x of top.slice(0, 3)) if (x.wr > .92) flag('combination', uname(x.a) + ' + ' + uname(x.b) + ' win ' + pct(x.wr) + ' against rivals that otherwise win ' + pct(1 - base));
    report.pairs = out.slice(0, 40).map(x => ({ a: x.a, b: x.b, alone: [+x.da.toFixed(3), +x.db.toFixed(3)], together: +x.dab.toFixed(3) }));
  }

  // ----- climb: the real game loop
  async function climb(n, K2) {
    const CAP = 60, run = async (policy, keys, count, salt) => {
      const jobs = keys.map((key, ci) => { const seeds = []; for (let s = 0; s < count; s++) seeds.push(hash(K.indexOf(key), s, salt)); return pool.run('climbs', { dmg, spec: { k: key, s: hash(ci, salt, 1) % 3, z: 1 }, policy, seeds, cap: CAP, K: K2 }); });
      const res = await Promise.all(jobs); for (const c of res) for (const x of c) played += x.n; return res;
    };
    const stat = arr => { const v = arr.map(x => x.r).sort((a, b) => a - b); return { mean: v.reduce((a, b) => a + b, 0) / v.length, med: v[v.length >> 1], p90: v[Math.floor(v.length * .9)], max: v[v.length - 1] }; };
    const rand = await run('random', K, n, 41), look = await run('look', K, n, 42);
    const byRung = res => { const w = [], g = []; for (const c of res) for (const x of c) x.fights.forEach((f, i) => { w[i] = (w[i] || 0) + f; g[i] = (g[i] || 0) + 1; }); return w.map((v, i) => [v / g[i], g[i]]); };
    console.log('\nCLIMB: ' + n + ' climbs per class with random picks, and ' + n + ' by a careful player who tests each offer ' + K2 + ' times before choosing');
    const cr = byRung(rand), cl = byRung(look);
    console.log('  chance to win each rung, random picks:  ' + cr.slice(0, 14).map((x, i) => (i + 1) + ':' + pct(x[0])).join(' '));
    console.log('  chance to win each rung, careful picks: ' + cl.slice(0, 14).map((x, i) => (i + 1) + ':' + pct(x[0])).join(' '));
    console.log(pad('class', 14) + 'random picks: mean  best    careful picks: mean  middle  top-tenth  best');
    const rows = K.map((key, i) => ({ key, a: stat(rand[i]), b: stat(look[i]) })).sort((x, y) => y.b.mean - x.b.mean);
    for (const x of rows) console.log(pad(name(x.key), 14) + lpad(x.a.mean.toFixed(1), 18) + lpad(x.a.max, 6) + lpad(x.b.mean.toFixed(1), 20) + lpad(x.b.med, 8) + lpad(x.b.p90, 11) + lpad(x.b.max, 6));
    const mid = rows.map(x => x.b.mean).sort((a, b) => a - b)[rows.length >> 1];
    console.log('  the middle class climbs ' + mid.toFixed(1) + ' rungs with careful picks');
    for (const x of rows) {
      if (x.b.mean > mid * 1.6 && x.b.mean - mid > 3) flag('class climbs too far', name(x.key) + ' averages ' + x.b.mean.toFixed(1) + ' rungs with careful picks; the middle class manages ' + mid.toFixed(1));
      if (x.b.mean < mid * .55) flag('class cannot climb', name(x.key) + ' averages ' + x.b.mean.toFixed(1) + ' rungs with careful picks; the middle class manages ' + mid.toFixed(1));
    }
    const capped = []; look.forEach((c, i) => c.forEach(x => { if (x.capped) capped.push([K[i], x.ups]); }));
    if (capped.length) {
      const count = {}; for (const [, ups] of capped) for (const id of new Set(ups)) count[id] = (count[id] || 0) + 1;
      flag('unbeatable build', capped.length + ' careful climbs reached rung ' + CAP + ' without losing (' + [...new Set(capped.map(c => name(c[0])))].slice(0, 6).join(', ') + '); upgrades they share: ' +
        Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => uname(e[0]) + ' ' + pct(e[1] / capped.length)).join(', '));
    }
    // what the careful player takes when it is offered
    const off = {}, got = {}; for (const c of look) for (const x of c) { for (const id in x.off) off[id] = (off[id] || 0) + x.off[id]; for (const id in x.got) got[id] = (got[id] || 0) + x.got[id]; }
    const pick = U.filter(id => off[id] >= 30).map(id => [id, (got[id] || 0) / off[id], off[id]]).sort((a, b) => b[1] - a[1]);
    console.log('  the careful player takes, when offered (a third would be no preference): ' + pick.map(x => uname(x[0]) + ' ' + pct(x[1])).join(', '));
    for (const x of pick) { if (x[1] > .68 && x[0] !== 'sig') flag('upgrade always picked', uname(x[0]) + ' is taken ' + pct(x[1]) + ' of the times a careful player is offered it'); if (x[1] < .1) flag('upgrade never picked', uname(x[0]) + ' is taken ' + pct(x[1]) + ' of the times a careful player is offered it'); }
    // always taking one upgrade when offered: how much further does that get a random player?
    const sample = K.filter((k, i) => hash(i, 43) % Math.max(1, Math.round(K.length / 12)) === 0), per = Math.max(10, Math.round(n * .7));
    const baseRes = await run('random', sample, per, 44), base = stat(baseRes.flat()).mean, lifts = [];
    for (const id of U) { const res = await run({ prefer: id }, sample, per, 44); lifts.push([id, stat(res.flat()).mean - base]); }
    lifts.sort((a, b) => b[1] - a[1]);
    console.log('  rungs gained by always taking one upgrade when offered (random picks otherwise, ' + sample.length + ' classes, base ' + base.toFixed(1) + '): ' + lifts.map(x => uname(x[0]) + ' ' + (x[1] >= 0 ? '+' : '') + x[1].toFixed(1)).join(', '));
    for (const x of lifts) if (x[1] > Math.max(2.5, base * .5)) flag('upgrade carries climbs', 'always taking ' + uname(x[0]) + ' adds ' + x[1].toFixed(1) + ' rungs to a climb that otherwise reaches ' + base.toFixed(1));
    report.climb = { winByRungRandom: cr.slice(0, 20).map(x => +x[0].toFixed(3)), winByRungCareful: cl.slice(0, 20).map(x => +x[0].toFixed(3)), classes: rows.map(x => ({ key: x.key, random: +x.a.mean.toFixed(2), careful: +x.b.mean.toFixed(2), best: x.b.max })), pickRate: pick.map(x => ({ id: x[0], rate: +x[1].toFixed(2) })) };
  }

  // ----- sig: each class's signature upgrade, level by level
  async function sig(keys, ctxN, M) {
    const list = [], tag = [];
    keys.forEach((key, ci) => { for (let c = 0; c < ctxN; c++) {
      const cx = context(key, 4, hash(K.indexOf(key), c, 51), ['sig']);
      for (let j = 0; j < M; j++) { const foe = { rv: [7, hash(K.indexOf(key), c, j, 52)] }, seed = hash(K.indexOf(key), c, j, 53);
        for (let n = 0; n <= 3; n++) { list.push([{ k: key, s: cx.spec.s, z: cx.spec.z, u: cx.spec.u.concat(Array(n).fill('sig')) }, foe, seed]); tag.push([ci, n]); } }
    } });
    const r = await matches(list), acc = keys.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]);
    for (let q = 0; q < list.length; q++) { const [ci, n] = tag[q]; acc[ci][n][1]++; if (r.w[q] === 0) acc[ci][n][0]++; }
    console.log("\nSIGNATURES: win rate with the class's own upgrade taken 0, 1, 2 and 3 times (4 other upgrades, rung-7 rivals); " + list.length + ' fights');
    const out = [];
    keys.forEach((key, ci) => {
      const wr = acc[ci].map(x => x[0] / x[1]);
      console.log(pad(name(key), 14) + pad(S.FIGHTERS[key].sig[0], 20) + wr.map(v => lpad(pct(v), 5)).join('') + '   total ' + pp(wr[3] - wr[0]));
      if (wr[3] - wr[0] < .08) flag('signature too weak', name(key) + ': ' + S.FIGHTERS[key].sig[0] + ' taken three times adds only ' + pp(wr[3] - wr[0]) + ' points');
      if (wr[3] - wr[0] > .6) flag('signature too strong', name(key) + ': ' + S.FIGHTERS[key].sig[0] + ' taken three times adds ' + pp(wr[3] - wr[0]) + ' points');
      out.push({ key, winRate: wr.map(v => +v.toFixed(3)) });
    });
    report.signatures = out;
  }

  console.log('Ball Brawl balance lab: ' + K.length + ' classes, ' + U.length + ' upgrades (' + files.join(', ') + '), ' + workers + ' workers');
  const focus = opt('focus', '') ? opt('focus', '').split(',') : null;
  if (mode === 'classes') await classes(+opt('n', 12), focus);
  else if (mode === 'tune') await tune(String(opt('keys', '')).split(',').filter(Boolean), +opt('rounds', 5), +opt('n', 10), has('write'));
  else if (mode === 'sig') await sig(focus || K, +opt('ctx', 12), +opt('m', 8));
  else if (mode === 'boons') await boons(+opt('reps', 3), +opt('m', 8));
  else if (mode === 'stacks') await stacks(+opt('ctx', 40), +opt('m', 8));
  else if (mode === 'pairs') await pairs(+opt('ctx', 24), +opt('m', 6));
  else if (mode === 'climb') await climb(+opt('n', 30), +opt('k', 9));
  else if (mode === 'all') { await classes(+opt('n', 12), null); await boons(+opt('reps', 3), 8); await sig(K, 12, 8); await stacks(40, 8); await pairs(24, 6); await climb(+opt('n', 30), 9); }
  else { console.log('unknown mode ' + mode + '; see the top of tools/balance.js'); }
  console.log('\nRED FLAGS (' + flags.length + ')' + (flags.length ? '' : ': none'));
  for (const f of flags.sort()) console.log('  ' + f);
  console.log('\n' + played + ' fights in ' + ((Date.now() - t00) / 1000).toFixed(0) + 's');
  if (opt('json', '')) fs.writeFileSync(opt('json', ''), JSON.stringify({ classes: K.length, upgrades: U.length, flags, report }, null, 1));
  pool.close();
}
if (isMainThread) main().catch(e => { console.error('FAILED: ' + (e && e.message || e)); process.exit(1); });
else workerMain();
