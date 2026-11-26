// Writes the rules fingerprint (RULES in brawl-proof.js): a short hash of every file that decides how a fight or a
// climb goes. A climb is checked by playing it again, which only works under the very same rules, so every ladder
// entry carries this fingerprint and the ladder reads only entries that match the page's own.
//
//   node tools/stamp.js           write the fingerprint (run after ANY change to the files below, before pushing)
//   node tools/stamp.js --check   change nothing; fail if the fingerprint is stale, or if a simulation file calls a
//                                 maths function that can differ between devices (use dsin, dcos, datan2, dhyp, dpow)
//   node tools/stamp.js --at <commit>   print the fingerprint the files had at that commit (used by tools/duel-video.js)
//
// A new fingerprint starts a fresh ladder for everyone, so change these files deliberately, and ideally just after the
// daily reset (midnight UTC).
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const FILES = ['brawl-sim.js', 'brawl-pack2.js', 'brawl-pack3.js', 'brawl-pack4.js', 'brawl-pack5.js', 'brawl-pack6.js', 'brawl-pack7.js', 'brawl-pack8.js', 'brawl-boons.js', 'brawl-proof.js'];
const LINE = /const RULES='[0-9a-f]*';/;
function fingerprint(read) {
  const h = crypto.createHash('sha256');
  for (const f of FILES) h.update(f + '\n' + read(f).replace(/\r\n/g, '\n').replace(LINE, "const RULES='';") + '\n');
  return h.digest('hex').slice(0, 10);
}
const fromDisk = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fromCommit = c => f => cp.execFileSync('git', ['show', c + ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
const written = read => { const m = /const RULES='([0-9a-f]*)';/.exec(read('brawl-proof.js')); return m ? m[1] : ''; };
module.exports = { FILES, fingerprint, fromDisk, fromCommit, written };
if (require.main === module) {
  const at = process.argv.indexOf('--at');
  if (at > 0) { console.log(written(fromCommit(process.argv[at + 1]))); process.exit(0); }
  const want = fingerprint(fromDisk), have = written(fromDisk);
  if (process.argv.includes('--check')) {
    let bad = 0;
    for (const f of FILES) {
      const code = fromDisk(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');          // comments may name them
      const hits = code.match(/Math\.(sin|cos|tan|atan2|atan|asin|acos|hypot|pow|exp|log|log2|log10|cbrt|sinh|cosh|tanh)\b/g);
      if (hits) { bad++; console.log(f + ' uses ' + [...new Set(hits)].join(', ') + ': these can differ between devices'); }
      if (/\*\*/.test(code)) { bad++; console.log(f + ' uses ** (powers can differ between devices): use dpow'); }
    }
    if (have !== want) { bad++; console.log('the rules fingerprint is stale: brawl-proof.js says ' + have + ', the files make ' + want + '. Run: node tools/stamp.js'); }
    console.log(bad ? 'NOT ready to push' : 'rules fingerprint ' + have + ' is current; simulation maths is device-independent');
    process.exit(bad ? 1 : 0);
  }
  if (have === want) console.log('rules fingerprint unchanged: ' + have);
  else {
    const p = path.join(ROOT, 'brawl-proof.js');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(LINE, "const RULES='" + want + "';"));
    console.log('rules fingerprint ' + have + ' -> ' + want + ' (a fresh ladder for everyone once this is live)');
  }
}
