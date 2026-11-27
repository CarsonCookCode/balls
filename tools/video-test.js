// Runs the automatic video for real, against a pretend ladder: three players' climbs (played by a bot through the
// real rules), one made-up entry claiming 99 rungs, and one player with a name the filter refuses. Headless Chrome
// then records the duel exactly as the daily job would. Checks the file is a real video and the cheat is not in it.
//   node tools/video-test.js [--keep]      (takes about a minute; needs Chrome; talks to nothing outside this PC)
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process');
const { load } = require('./loadbrawl');
const S = new Function(load('sim') + '\n;' + fs.readFileSync(path.join(__dirname, '..', 'brawl-boons.js'), 'utf8') + '\n;' + fs.readFileSync(path.join(__dirname, '..', 'brawl-proof.js'), 'utf8') + ';return {Climb,mulberry32,RULES,ROSTER}')();
const DAY = '2026-11-20', DAY0 = Date.parse(DAY + 'T00:00:00Z'), { Climb } = S;
function climb(seed, key) {
  const rnd = S.mulberry32(seed ^ 77), st = Climb.start(seed, key, (rnd() * 3) | 0, (rnd() * 3) | 0);
  for (let k = 0; k < 400 && !st.over; k++) { Climb.next(st, null); const r = Climb.settle(st, Climb.play(st.build, st.rival, st.fseed), st.shield > 0 && rnd() < .5); if (r === 'pick') Climb.pick(st, (rnd() * st.choice.length) | 0); }
  return st;
}
// each player keeps the best of a few climbs. The first two must stand above every house fighter on the test day's
// ladder, or the duel would not be between two players: they climb until they have cleared CLEAR rungs (the house's
// best on this day is 12 under the rules of Build 55; it moves when the fights change).
const CLEAR = 14;
const players = [['aaaaaaaaaaaaaaaa', 'Ana', 'samurai', '#8e2f3c'], ['bbbbbbbbbbbbbbbb', 'Bo', 'railgun', '#3f6fd8'], ['cccccccccccccccc', 'sh1t head', 'duck', '#e3b23c']];
const data = {}; let t = DAY0 + 3600000; const bests = [];
players.forEach(([pid, name, key, c], i) => {
  let best = null;
  for (let k = 0; k < (i < 2 ? 400 : 14) && !(i < 2 && k >= 14 && best && best.cleared >= CLEAR); k++) { const st = climb((i * 1000 + k * 7919 + 5) >>> 0, key); if (st.over && (!best || st.cleared > best.cleared)) best = st; }
  if (i < 2 && best && best.cleared < CLEAR) throw new Error('the test bot could not clear ' + CLEAR + ' rungs with ' + key);
  if (!best || best.cleared < 1) throw new Error('the test bot could not clear a rung with ' + key);
  bests.push(best.cleared);
  data[pid] = { [best.seed.toString(36)]: { n: name, k: key, s: best.str, z: best.size, c, u: best.build.ups, r: best.cleared, t: t += 60000, v: S.RULES, p: Climb.proof(best) } };
});
data['zzzzzzzzzzzzzzzz'] = { fake: { n: 'Cheater', k: 'bomb', s: 2, z: 2, c: '#26282c', u: ['tougher', 'sharper'], r: 99, t: t += 60000, v: S.RULES, p: '{"s":1,"f":[[0,0,0],[0,0,-1]]}' } };
const db = http.createServer((req, res) => {
  const ok = req.url.split('?')[0] === '/climbs/' + DAY + '.json';
  res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(ok ? JSON.stringify(data) : 'null');
});
db.listen(0, '127.0.0.1', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'duel-king-video-test-'));
  // not spawnSync: this process has to keep answering as the pretend database while the tool runs
  const r = await new Promise(done => { const c = cp.spawn(process.execPath, [path.join(__dirname, 'duel-video.js'), '--day', DAY, '--out', out, '--min', '2', '--db', 'http://127.0.0.1:' + db.address().port], { stdio: 'inherit' }); const k = setTimeout(() => c.kill(), 400000); c.on('exit', status => { clearTimeout(k); done({ status }); }); });
  db.close();
  let fails = 0; const bad = m => { fails++; console.log('FAILED: ' + m); };
  let meta = null; try { meta = JSON.parse(fs.readFileSync(path.join(out, 'meta.json'), 'utf8')); } catch (e) { bad('no meta.json'); }
  if (meta) {
    if (r.status !== 0) bad('the tool exited with ' + r.status);
    if (!meta.ok) bad('nothing was recorded: ' + meta.reason);
    else {
      const file = path.join(out, meta.file), head = fs.readFileSync(file).subarray(0, 12), kind = head.readUInt32BE(0) === 0x1a45dfa3 ? 'webm' : head.toString('latin1', 4, 8) === 'ftyp' ? 'mp4' : '?';
      if (kind === '?') bad('the file does not start like a video');
      if (meta.bytes < 800000) bad('the video is suspiciously small: ' + meta.bytes + ' bytes');
      if (!(meta.seconds >= 12 && meta.seconds <= 175)) bad('the video is ' + meta.seconds + ' seconds long');
      if (!meta.sound) bad('the game\'s sound was not running, so the video is silent');
      if (!Array.isArray(meta.rejected) || meta.rejected.length !== 1 || meta.rejected[0].id !== 'zzzzzz') bad('the made-up climb was not refused: ' + JSON.stringify(meta.rejected));
      const text = meta.title + ' ' + meta.description;
      if (/Cheater|Bomb|sh1t|undefined|NaN/.test(text)) bad('the words mention something they should not: ' + text);
      if (meta.players !== 3) bad('expected three proven players, got ' + meta.players);
      if (meta.title.length > 100) bad('the title is too long for YouTube');
      const order = players.map((p, i) => ({ name: p[1], r: bests[i] })).sort((a, b) => b.r - a.r);
      if (meta.duel.rungs[0] !== order[0].r || meta.duel.rungs[1] !== order[1].r) bad('the duel is not between the two best: ' + JSON.stringify(meta.duel.rungs) + ' vs ' + JSON.stringify(order));
      if (meta.pageErrors) bad('the page reported errors: ' + meta.pageErrors.join(' | '));
      // sound against picture: measured from the marks at both ends of the recording (tools/av.js)
      const av = require('./av');
      if (!av.has()) console.log('(ffmpeg is not installed: sound and picture were not lined up or checked)');
      else {
        if (!meta.sync || !meta.sync.fixed) bad('sound and picture were not lined up: ' + (meta.sync && meta.sync.why));
        else console.log('sound against picture as recorded: ' + meta.sync.startMs + ' ms at the start, ' + meta.sync.endMs + ' ms at the end (positive = late); corrected and the marks cut off');
      }
      console.log('\n' + meta.title + '\n' + meta.description + '\n\n' + kind + ', ' + meta.seconds + ' s, ' + (meta.bytes / 1048576).toFixed(1) + ' MB, sound ' + (meta.sound ? 'on' : 'off') + ', ' + meta.players + ' proven players, climbs ' + bests.join('/') + ', refused: ' + meta.rejected.map(x => x.id + ' (' + x.why + ')').join(', '));
      if (process.argv.includes('--keep')) console.log('kept: ' + file);
    }
  }
  if (!process.argv.includes('--keep')) try { fs.rmSync(out, { recursive: true, force: true }); } catch (e) {}
  console.log(fails ? fails + ' video checks FAILED' : 'automatic video ok');
  process.exit(fails ? 1 : 0);
});
