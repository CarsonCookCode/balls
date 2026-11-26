// Records one day's duel as a video file, with nobody watching: the automatic half of the daily YouTube Short.
//
//   node tools/duel-video.js --day 2026-11-26 --out out [--min 1] [--db http://...] [--chrome path] [--timeout 420]
//
// What it does:
//   1. Reads that day's climbs from the ladder's database and looks at which rules they were played under (each entry
//      carries the rules fingerprint, see tools/stamp.js). The game is then served from this folder if its rules match,
//      or otherwise from the newest commit that has those rules, in a temporary git worktree. A climb can only be
//      played again under the rules it was made with.
//   2. Opens the game in headless Chrome as ?video=<day>. The page itself reads the ladder, plays every climb's proof
//      again and keeps only those that pass, filters the names, and records the duel between the best fighters of the
//      top two players (brawl-app.js, "the automatic daily video").
//   3. Saves the video to <out>/ and writes <out>/meta.json: {ok, day, file, title, description, tags, ...}.
//      ok:false with a reason means there is nothing to post (no players that day, say); that is not an error.
//
// --min N   how many of the two duellists must be real, proven players (default 1; 2 = never a house fighter; 0 = any)
// --db URL  read another database (the tests use a pretend one); the real address in brawl-net.js is the default
// Chrome is found from --chrome, the CHROME_PATH environment variable, or the usual install places.
// Uses only what Node 22+ has built in (it speaks to Chrome over its DevTools socket directly).
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process');
const stamp = require('./stamp');
const ROOT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d; };
const DAY = arg('day', ''), OUT = path.resolve(arg('out', 'out')), MIN = Math.max(0, Math.min(2, +arg('min', 1) || 0)), TIMEOUT = (+arg('timeout', 420) || 420) * 1000;
const say = (...a) => console.log('[duel-video]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

function findChrome() {
  const list = [arg('chrome', ''), process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  for (const p of list) if (p && fs.existsSync(p)) return p;
  throw new Error('Chrome was not found: pass --chrome or set CHROME_PATH');
}
function dbAddress() {
  const m = /const NET=\{url:'([^']*)'/.exec(fs.readFileSync(path.join(ROOT, 'brawl-net.js'), 'utf8'));
  return arg('db', m ? m[1] : '');
}
// which commit's game to serve: null = this folder as it is
function commitFor(rules) {
  if (stamp.written(stamp.fromDisk) === rules) return null;
  const list = cp.execFileSync('git', ['rev-list', '-n', '400', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  for (const c of list) { try { if (stamp.written(stamp.fromCommit(c)) === rules) return c; } catch (e) { return undefined; } }
  return undefined;
}
function serve(dir, db) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const file = path.join(dir, path.normalize(p).replace(/^([/\\]|\.\.)+/, ''));
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      let data = fs.readFileSync(file);
      if (db !== null && path.basename(file) === 'brawl-net.js') data = Buffer.from(String(data).replace(/const NET=\{url:'[^']*'/, "const NET={url:'" + db + "'"));
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
// a very small DevTools client: one page, commands by name
async function openPage(chrome, profile, url) {
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--autoplay-policy=no-user-gesture-required', '--window-size=540,960', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-dev-shm-usage', 'about:blank'];
  if (process.env.CI) args.unshift('--no-sandbox');           // GitHub's runners do not allow Chrome's own sandbox; the only page opened is this repo's game
  const proc = cp.spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  const ws = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Chrome did not start: ' + err.slice(-300))), 30000);
    proc.stderr.on('data', d => { err += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(err); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', c => { clearTimeout(t); reject(new Error('Chrome exited (' + c + '): ' + err.slice(-300))); });
  });
  const sock = new WebSocket(ws);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = () => rej(new Error('could not connect to Chrome')); });
  let id = 0; const waiting = new Map(), problems = [];
  sock.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') problems.push(String(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).split('\n')[0]);
  };
  const send = (method, params, sessionId) => new Promise((res, rej) => { const i = ++id; waiting.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params: params || {}, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId);
  const evaluate = async (expression, awaitPromise) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: !!awaitPromise, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error('in the page: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const close = async () => { try { sock.close(); } catch (e) {} try { proc.kill(); } catch (e) {} await sleep(400); };
  return { evaluate, close, problems };
}
const nice = day => { const d = new Date(day + 'T12:00:00Z'); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + d.getUTCDate(); };
// the words that go with the video. They never say who wins.
function words(day, d) {
  // a player whose name was refused by the filter is shown under their fighter's class name: say "a player's" then
  const side = i => (d.house[i] ? 'the house’s ' : d.a_b[i].endsWith(d.who[i]) ? 'a player’s ' : d.who[i] + '’s ') + d.a_b[i], rungs = i => d.rungs[i] + ' rung' + (d.rungs[i] === 1 ? '' : 's');
  return {
    title: d.a_b[0] + ' vs ' + d.a_b[1] + ': who takes the crown? | Duel King, ' + nice(day),
    description: 'The duel for ' + nice(day) + ': ' + side(0) + ' (climbed ' + rungs(0) + ') against ' + side(1) + ' (' + rungs(1) + '). Best of three, and the winner is that day’s Duel King.\n\n' +
      'These fighters were made by players. Make your own in three taps, climb the ladder, and the top two each day fight in the next video:\nhttps://playduelking.com\n\n#shorts #duelking #ballbattle',
    tags: ['Duel King', 'ball battle', 'ball fight', 'bouncing balls', 'shorts', d.a_b[0], d.a_b[1]],
  };
}
(async () => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(DAY)) throw new Error('give the day as --day YYYY-MM-DD');
  fs.mkdirSync(OUT, { recursive: true });
  const meta = { ok: false, day: DAY, made: new Date().toISOString() };
  const done = (code) => { fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2)); say(meta.ok ? 'recorded ' + meta.file + ': ' + meta.title : 'nothing to post: ' + meta.reason); process.exitCode = code; };
  const db = dbAddress();
  if (!db) { meta.reason = 'the game has no ladder address'; return done(1); }
  // 1. the day's climbs, and the rules they were played under
  const res = await fetch(db + '/climbs/' + DAY + '.json');
  if (!res.ok) { meta.reason = 'the ladder could not be read (' + res.status + ')'; return done(1); }
  const dayData = await res.json();
  let latest = null, count = 0;
  if (dayData && typeof dayData === 'object') for (const pid of Object.keys(dayData)) { const m = dayData[pid]; if (m && typeof m === 'object') for (const cid of Object.keys(m)) { const e = m[cid]; if (e && typeof e.v === 'string' && Number.isFinite(e.t)) { count++; if (!latest || e.t > latest.t) latest = e; } } }
  meta.entries = count;
  if (!latest && MIN > 0) { meta.reason = 'nobody climbed that day'; return done(0); }
  const rules = latest ? latest.v : stamp.written(stamp.fromDisk);
  meta.rules = rules;
  let dir = ROOT, tree = '';
  const commit = /^[0-9a-f]{6,16}$/.test(rules) ? commitFor(rules) : undefined;
  if (commit === undefined) { meta.reason = 'no saved version of the game has the rules ' + rules + ' that day was played under'; return done(0); }
  if (commit) {
    tree = fs.mkdtempSync(path.join(os.tmpdir(), 'duel-king-tree-'));
    cp.execFileSync('git', ['worktree', 'add', '--detach', '--force', tree, commit], { cwd: ROOT, stdio: 'ignore' });
    dir = tree; meta.commit = commit; say('that day was played under rules ' + rules + ': serving commit ' + commit.slice(0, 8));
  }
  const srv = await serve(dir, arg('db', null)), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'duel-king-chrome-'));
  let page = null, code = 0;
  try {
    page = await openPage(findChrome(), profile, 'http://127.0.0.1:' + srv.address().port + '/?video=' + DAY + '&min=' + MIN);
    // 2. wait for the page to finish
    const t0 = Date.now(); let st = null, last = '';
    for (;;) {
      await sleep(700);
      let raw = null; try { raw = await page.evaluate('JSON.stringify(window.__duel||null)'); } catch (e) {}
      st = raw ? JSON.parse(raw) : null;
      if (st && st.state !== last) { last = st.state; say(st.state + (st.entries !== undefined && last === 'recording' ? ' (' + st.entries + ' climbs read, ' + (st.rejected || []).length + ' refused)' : '')); }
      if (st && (st.state === 'done' || st.state === 'skip' || st.state === 'error')) break;
      if (Date.now() - t0 > TIMEOUT) { st = { state: 'error', reason: 'timed out in state ' + last }; break; }
    }
    Object.assign(meta, { build: st.build, players: st.players, rejected: st.rejected, sound: st.sound });
    if (page.problems.length) meta.pageErrors = page.problems.slice(0, 5);
    if (st.state === 'skip') { meta.reason = st.reason; }
    else if (st.state === 'error') { meta.reason = st.reason + (page.problems.length ? ' | ' + page.problems[0] : ''); code = 1; }
    else {
      // 3. the file, a slice at a time
      const f = st.file, name = f.name.replace(/[^A-Za-z0-9._-]/g, '-'), fd = fs.openSync(path.join(OUT, name), 'w');
      for (let at = 0; at < f.size; at += 1 << 20) fs.writeSync(fd, Buffer.from(await page.evaluate('window.__duelSlice(' + at + ',' + Math.min(f.size, at + (1 << 20)) + ')', true), 'base64'));
      fs.closeSync(fd);
      const size = fs.statSync(path.join(OUT, name)).size;
      if (size !== f.size || size < 200000) { meta.reason = 'the video file is too small or incomplete (' + size + ' of ' + f.size + ' bytes)'; code = 1; }
      else if (f.cut) { meta.reason = 'the recording was cut short'; code = 1; }
      else {
        const d = Object.assign({}, st.duel, { a_b: [st.duel.a, st.duel.b] });
        Object.assign(meta, { ok: true, file: name, bytes: size, seconds: f.secs, type: f.type, duel: st.duel }, words(DAY, d));
      }
    }
  } catch (e) { meta.reason = String(e && e.message || e); code = 1; }
  finally {
    if (page) await page.close();
    srv.close();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch (e) {}
    if (tree) { try { cp.execFileSync('git', ['worktree', 'remove', '--force', tree], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  done(code);
})().catch(e => { console.error('[duel-video] ' + (e && e.message || e)); process.exitCode = 1; });
