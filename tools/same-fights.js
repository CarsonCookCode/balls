// Are fights unchanged? Plays the same seeded fights with the committed code and with the working tree, and compares
// the winner, the length and both fighters' health to the last decimal. Usage: node samefights.js [fights]
const fs = require('fs'), cp = require('child_process');
const R = 'C:/repos/balls/';
const SIM = ['brawl-sim.js', 'brawl-pack2.js', 'brawl-pack3.js', 'brawl-pack4.js', 'brawl-pack5.js', 'brawl-pack6.js', 'brawl-pack7.js', 'brawl-pack8.js', 'brawl-boons.js'];
const old = SIM.map(f => cp.execSync('git show HEAD:' + f, { cwd: R, maxBuffer: 1 << 26 }).toString()).join('\n;\n');
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;   // --only brawl-pack3.js: take just that file from the working tree
const now = SIM.map(f => !ONLY || f === ONLY ? fs.readFileSync(R + f, 'utf8') : cp.execSync('git show HEAD:' + f, { cwd: R, maxBuffer: 1 << 26 }).toString()).join('\n;\n');
const tail = ';return {FIGHTERS,ROSTER,UP_IDS,makeBuild,addUpgrade,canTake,offers,createMatch,mulberry32}';
const A = new Function(old + tail)(), B = new Function(now + tail)();
function play(S, seed) {
  const rnd = S.mulberry32(seed), pick = () => {
    const b = S.makeBuild(S.ROSTER[(rnd() * S.ROSTER.length) | 0], ((rnd() * 4) | 0) - 1, (rnd() * 3) | 0), n = (rnd() * 12) | 0;
    for (let k = 0; k < n; k++) { const o = S.offers(b, rnd, 3); if (o.length) S.addUpgrade(b, o[(rnd() * o.length) | 0]); }
    return b;
  };
  const a = pick(), b = pick(), m = S.createMatch(a, b, seed * 7 + 1);
  let steps = 0, kinds = {};
  while (!m.over && steps < 20000) { m.step(); for (const e of m.events) kinds[e.k] = (kinds[e.k] || 0) + 1; m.events.length = 0; steps++; }
  return { sig: [m.winner, steps, m.f[0].hp, m.f[1].hp].join('|'), kinds };
}
const N = +process.argv[2] > 0 ? +process.argv[2] : 1500;
let bad = 0; const seen = {};
for (let s = 1; s <= N; s++) {
  const x = play(A, s), y = play(B, s);
  if (x.sig !== y.sig) { bad++; if (bad < 6) console.log('DIFFERENT seed', s, x.sig, 'vs', y.sig); }
  for (const k in y.kinds) seen[k] = (seen[k] || 0) + y.kinds[k];
}
console.log(N + ' fights, ' + bad + ' differ');
console.log('events now:', JSON.stringify(seen));
