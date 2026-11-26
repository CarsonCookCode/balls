// Checks the proof of a climb (brawl-proof.js): climbs played through the rules pass when played again, and every way
// of cheating tried here fails.  Usage: node tools/proof-test.js [climbs]
const { load } = require('./loadbrawl');
const S = new Function(load('sim') + '\n;' + require('fs').readFileSync(require('path').join(__dirname, '..', 'brawl-boons.js'), 'utf8') + '\n;' + require('fs').readFileSync(require('path').join(__dirname, '..', 'brawl-proof.js'), 'utf8') +
  ';return {FIGHTERS,ROSTER,UPGRADES,UP_IDS,Climb,mulberry32,RULES,canTake,makeBuild,addUpgrade,RIVAL_UPS}')();
const { Climb, ROSTER } = S, N = +process.argv[2] || 60;
// a bot plays a climb the way the page does; friends = other players' fighters it may be offered as rivals
function climb(seed, key, friends) {
  const rnd = S.mulberry32(seed ^ 0x5bd1e995), st = Climb.start(seed, key, (rnd() * 3) | 0, (rnd() * 3) | 0);
  for (let k = 0; k < 400 && !st.over; k++) {
    const p = friends.length && rnd() < .8 ? friends[(rnd() * friends.length) | 0] : null;
    Climb.next(st, p);
    const armed = st.shield > 0 && rnd() < .4;
    const r = Climb.settle(st, Climb.play(st.build, st.rival, st.fseed), armed);
    if (r === 'pick') Climb.pick(st, (rnd() * st.choice.length) | 0);
  }
  return { key, str: st.str, size: st.size, ups: st.build.ups.slice(), cleared: st.cleared, text: Climb.proof(st), over: st.over };
}
const entry = c => ({ key: c.key, str: c.str, size: c.size, ups: c.ups, cleared: c.cleared, proof: Climb.parse(c.text) });
let fails = 0, fights = 0, withFriend = 0, withShield = 0, best = 0, t0 = Date.now();
const done = [], friends = [];
for (let i = 0; i < N; i++) {
  const c = climb((i * 2654435761 + 12345) >>> 0, ROSTER[(i * 7) % ROSTER.length], friends);
  if (!c.over) { fails++; console.log('climb ' + i + ' never ended'); continue; }
  const v = Climb.check(entry(c));
  fights += v.fights; best = Math.max(best, c.cleared);
  if (/\{"k"/.test(c.text)) withFriend++;
  if (/,1,/.test(c.text)) withShield++;
  if (!v.ok) { fails++; console.log('an honest climb FAILED its own check: ' + c.key + ' cleared ' + c.cleared + ': ' + v.why); }
  done.push(c);
  if (c.cleared > 0) friends.push({ k: c.key, s: c.str, z: c.size, u: c.ups });
}
console.log(done.length + ' honest climbs checked (' + fights + ' fights, best ' + best + ' rungs, ' + withFriend + ' met another player\'s fighter, ' + withShield + ' raised a shield) in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
// ----- cheating -----
const long = done.filter(c => c.cleared >= 3).sort((a, b) => b.cleared - a.cleared)[0];
if (!long) { console.log('no climb long enough to tamper with'); process.exit(1); }
const P = () => JSON.parse(long.text), must = (name, e, want) => { const v = Climb.check(e); if (v.ok !== !!want) { fails++; console.log('WRONG: ' + name + ' -> ' + (v.ok ? 'accepted' : 'refused: ' + v.why)); } else if (!want) cheats.push(name + ' (' + v.why + ')'); };
const cheats = [], E = (over, proof) => Object.assign(entry(long), over, proof ? { proof: Climb.parse(JSON.stringify(proof)) } : {});
must('the climb as played', E({}), true);
must('one more rung claimed', E({ cleared: long.cleared + 1 }));
must('an extra boon claimed', E({ ups: long.ups.concat('tougher') }));
must('another class claimed', E({ key: ROSTER.find(k => k !== long.key) }));
must('a different seed', E({}, Object.assign(P(), { s: P().s + 1 })));
{ const p = P(); p.f.pop(); must('the losing fight left out', E({}, p)); }
{ const p = P(); p.f.push([0, 0, -1]); must('a fight added after the end', E({}, p)); }
{ const p = P(); const i = p.f.findIndex(x => x[2] >= 0); p.f[i][2] = 7; must('a boon that was never offered', E({}, p)); }
{ const p = P(); p.f[0][1] = 1; must('a shield raised before it was earned', E({}, p)); }
{ const p = P(); p.f[p.f.length - 1][2] = 0; must('a boon taken after a loss', E({}, p)); }
{ const p = P(); p.f = p.f.map(x => [{ k: 'snail', s: 0, z: 0, u: [] }, x[1], x[2]]); must('a hand-picked weak rival on every rung', E({}, p)); }
{ const p = P(); const i = p.f.length - 1; p.f[i] = [{ k: 'snail', s: 0, z: 0, u: ['tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher', 'tougher'] }, p.f[i][1], p.f[i][2]]; must('a rival with boons it could not hold', E({}, p)); }
must('no proof at all', Object.assign(entry(long), { proof: null }));
must('a proof that is not a climb', Object.assign(entry(long), { proof: Climb.parse('{"s":5,"f":[[0,0,0]]}') }));
if (Climb.parse('x'.repeat(30000)) !== null || Climb.parse('{"s":-1,"f":[[0,0,0]]}') !== null || Climb.parse('{"s":1,"f":[]}') !== null) { fails++; console.log('WRONG: a malformed proof was parsed'); }
console.log('cheats refused: ' + cheats.length + '\n  ' + cheats.join('\n  '));
console.log(fails ? fails + ' proof checks FAILED' : 'proof ok (rules ' + S.RULES + ')');
process.exit(fails ? 1 : 0);
