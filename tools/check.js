// Everything to run before a push, in one go.  Usage: node tools/check.js [--video]
// It stops at the first failure. --video also records a real test video in headless Chrome (about a minute).
// None of this talks to the real database (tools/loadbrawl.js blanks its address).
const cp = require('child_process'), path = require('path');
const steps = [
  ['the rules fingerprint is current and the simulation maths is device-independent', 'stamp.js', '--check'],
  ['the name filter', 'names-test.js'],
  ['the proof of a climb: honest climbs pass, cheats fail', 'proof-test.js', '40'],
  ['the page: builder, climbs, ladder, duel, a new day', 'page-test.js'],
  ['the shared ladder between several phones', 'net-test.js'],
  ['the recorder, with a stand-in browser', 'recorder-test.js'],
  ['every class drawn with effects', 'fx-smoke.js', '--fights', '1'],
];
if (process.argv.includes('--video')) steps.push(['the automatic video, for real, in headless Chrome', 'video-test.js']);
for (const [what, file, ...args] of steps) {
  const t0 = Date.now(), r = cp.spawnSync(process.execPath, [path.join(__dirname, file), ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const last = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(l => !/^events:/.test(l)).slice(-1)[0] || '';
  console.log((r.status === 0 ? 'ok   ' : 'FAIL ') + what + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + 's): ' + last.slice(0, 160));
  if (r.status !== 0) { console.log(((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-12).join('\n')); process.exit(1); }
}
console.log('all checks passed');
