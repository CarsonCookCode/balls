// Reads Ball Brawl's play log for one day and prints what happened, so play can be reviewed.
//   node tools/review-log.js              today (UTC)
//   node tools/review-log.js 2026-11-25   that day
//   node tools/review-log.js 2026-11-25 full    also list every fight
// The log is written by Net.log in brawl-net.js: log/<day>/<player id>/<entry> = {t, e, d}.
// Every fight entry carries both builds and the seed, so a fight can be replayed exactly with createMatch(A, B, seed).
const fs = require('fs'), path = require('path');
const net = fs.readFileSync(path.join(__dirname, '..', 'brawl-net.js'), 'utf8');
const URL0 = (net.match(/const NET=\{url:'([^']*)'\}/) || [])[1];
const day = /^\d{4}-\d\d-\d\d$/.test(process.argv[2] || '') ? process.argv[2] : new Date().toISOString().slice(0, 10);
const full = process.argv.includes('full');
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
const hhmm = t => new Date(t).toISOString().slice(11, 16);
(async () => {
  if (!URL0) throw new Error('the shared ladder is off (NET.url is empty)');
  const raw = await (await fetch(URL0 + '/log/' + day + '.json')).json();
  if (!raw) { console.log('nothing logged on ' + day + ' (UTC)'); return; }
  const cls = {}, boons = {}, offered = {}, rungs = {};
  let allFights = 0;
  for (const [pid, entries] of Object.entries(raw)) {
    const ev = Object.values(entries).map(x => { let d = {}; try { d = JSON.parse(x.d); } catch (e) {} return { t: x.t, e: x.e, d }; }).sort((a, b) => a.t - b.t || a.d.i - b.d.i);
    const of = k => ev.filter(x => x.e === k);
    const fights = of('fight').filter(f => f.d.me && f.d.vs && f.d.hp), runs = of('run'), ends = of('end'), opens = of('open'), errs = of('err');
    allFights += fights.length;
    const names = [...new Set(runs.map(r => r.d.n + ' (' + r.d.k + ')'))];
    const o = opens[opens.length - 1];
    console.log('\n=== player ' + pid.slice(0, 6) + '  ' + (names.join(', ') || 'no climb yet') + ' ===');
    console.log('  ' + hhmm(ev[0].t) + ' to ' + hhmm(ev[ev.length - 1].t) + ' UTC, ' + new Set(ev.map(x => x.d.s)).size + ' visits' + (o ? ', ' + o.d.b + ', screen ' + o.d.w + 'x' + o.d.h + ' at ' + o.d.dpr + 'x' + (o.d.touch ? ', touch' : '') : ''));
    const wins = fights.filter(f => f.d.win).length, secs = fights.reduce((a, f) => a + f.d.t, 0);
    console.log('  ' + runs.length + ' climbs, ' + fights.length + ' fights, won ' + pct(wins, fights.length) + ', average fight ' + (fights.length ? (secs / fights.length).toFixed(1) : 0) + 's of game time');
    if (ends.length) console.log('  climbs ended at rung: ' + ends.map(x => x.d.cleared).join(' ') + '   (best ' + Math.max(...ends.map(x => x.d.cleared)) + ')');
    const fp = fights.filter(f => f.d.fps > 0);
    if (fp.length) console.log('  frames per second in fights: average ' + Math.round(fp.reduce((a, f) => a + f.d.fps, 0) / fp.length) + ', worst fight ' + Math.min(...fp.map(f => f.d.fps)) + ', slow frames ' + fp.reduce((a, f) => a + f.d.slow, 0));
    const sp = {}; for (const f of fights) sp[f.d.sp] = (sp[f.d.sp] || 0) + 1;
    if (fights.length) console.log('  speed setting used: ' + Object.entries(sp).map(([k, n]) => k + 'x in ' + n).join(', '));
    // who they met, and how often the same rival came back
    const met = {}; let friends = 0, repeat = 0;
    fights.forEach((f, i) => { const tag = (f.d.vs.o ? f.d.vs.o + "'s " : '') + f.d.vs.k; met[tag] = (met[tag] || 0) + 1; if (f.d.vs.o) friends++; if (i && fights.slice(Math.max(0, i - 4), i).some(g => g.d.vs.k === f.d.vs.k)) repeat++; });
    if (fights.length) {
      console.log('  rivals: ' + friends + ' of ' + fights.length + " were another player's fighter; same class within four fights " + repeat + ' times');
      console.log('  met most: ' + Object.entries(met).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + ' x' + n).join(', '));
      const lost = {}; for (const f of fights) if (!f.d.win) { const tag = (f.d.vs.o ? f.d.vs.o + "'s " : '') + f.d.vs.k; lost[tag] = (lost[tag] || 0) + 1; }
      console.log('  lost to: ' + (Object.entries(lost).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + ' x' + n).join(', ') || 'nobody'));
    }
    const taps = {}; for (const x of of('tap')) taps[x.d.a] = (taps[x.d.a] || 0) + 1;
    if (Object.keys(taps).length) console.log('  taps: ' + Object.entries(taps).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', '));
    const hides = of('hide'); if (hides.length) console.log('  left the page ' + hides.length + ' times, ' + hides.filter(h => h.d.m === 'fight').length + ' of them mid-fight');
    for (const x of errs) console.log('  ERROR ' + hhmm(x.t) + ' ' + x.d.m + ' ' + (x.d.f || '') + ':' + (x.d.l || '') + ' (' + x.d.mode + ')');
    if (full) for (const f of fights) console.log('    ' + hhmm(f.t) + ' rung ' + String(f.d.r).padStart(2) + ' ' + (f.d.win ? 'won ' : 'LOST') + ' ' + f.d.me.k + ' vs ' + (f.d.vs.o ? f.d.vs.o + "'s " : '') + f.d.vs.k + ' in ' + f.d.t + 's, hp left ' + f.d.hp.join('/') + ', seed ' + f.d.seed + ', boons ' + (f.d.me.u.join(' ') || 'none'));
    for (const f of fights) {
      const a = cls[f.d.me.k] = cls[f.d.me.k] || { played: 0, won: 0, as: 0, asWon: 0 }; a.as++; a.asWon += f.d.win;
      const b = cls[f.d.vs.k] = cls[f.d.vs.k] || { played: 0, won: 0, as: 0, asWon: 0 }; b.played++; b.won += 1 - f.d.win;
      const r = rungs[f.d.r] = rungs[f.d.r] || { n: 0, won: 0 }; r.n++; r.won += f.d.win;
    }
    for (const p of of('pick')) { boons[p.d.got] = (boons[p.d.got] || 0) + 1; for (const k of p.d.of) offered[k] = (offered[k] || 0) + 1; }
  }
  console.log('\n=== everyone, ' + day + ': ' + Object.keys(raw).length + ' players, ' + allFights + ' fights ===');
  console.log('  players win by rung: ' + Object.entries(rungs).map(([r, v]) => r + ':' + pct(v.won, v.n) + '(' + v.n + ')').join('  '));
  console.log('  as the player\'s fighter: ' + Object.entries(cls).filter(([, v]) => v.as).sort((a, b) => b[1].as - a[1].as).map(([k, v]) => k + ' ' + pct(v.asWon, v.as) + ' of ' + v.as).join(', '));
  console.log('  as the rival (how often it beat the player): ' + Object.entries(cls).filter(([, v]) => v.played >= 3).sort((a, b) => b[1].won / b[1].played - a[1].won / a[1].played).map(([k, v]) => k + ' ' + pct(v.won, v.played) + ' of ' + v.played).join(', '));
  console.log('  boons taken when offered: ' + Object.entries(offered).sort((a, b) => (boons[b[0]] || 0) / b[1] - (boons[a[0]] || 0) / a[1]).map(([k, n]) => k + ' ' + pct(boons[k] || 0, n) + ' of ' + n).join(', '));
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
