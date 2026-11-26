// Builds Duel King's sound file from the sound library kept on this PC (outside the repo).
//   node tools/sfx-build.js
// Output: sfx/brawl.mp3 (every sound end to end, with silence between) and brawl-sfx.js (where each one starts, and a
// fingerprint of the file so a phone never plays new positions against an old cached copy).
// Needs ffmpeg on PATH. Sources are Kenney's audio packs (kenney.nl) and four packs from opengameart.org kept under
// oga/ in the library, all public domain (CC0), so the built file may be published.
// Which sounds are used was chosen by ear on the picker pages: heavy, metal, clang, ko, gun, revolver and rail are the
// user's picks of 2026-11-26.
// Some sounds (sn(...) below) come from the Sonniss #GameAudioGDC bundle, kept under sonniss/ in the library. Its
// licence (https://sonniss.com/gdc-bundle-license/) allows them inside a game, which is what this built file is, and
// forbids supplying them as sounds: never publish them as separate clips (the public picker page must not use them).
//
// To change the sound of something: edit GROUPS below (several takes per sound keep repeats from grating),
// run this script, and bump the ?v= on brawl-sfx.js in index.html.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const LIB = process.env.BRAWL_AUDIO_LIBRARY || 'C:/repos/balls-audio-library';
const OUT = path.join(__dirname, '..');
const RATE = 44100, GAP = 0.18, LEAD = 0.03;

const imp = (n, ...i) => i.map(k => 'impact-sounds/impact' + n + '_00' + k);
// from the opengameart packs: og(pack folder, names...). A name ending in * takes every file that starts with it.
const og = (pack, ...names) => ({ og: pack, names });
// from the Sonniss bundle: sn(part of the library's folder name, part of the file name[, takes]). With `takes`, the file
// is a long recording of several (five gunshots, say) and that many single takes are cut out of it.
const sn = (lib, name, takes) => ({ sn: lib, name, takes: takes || 0 });
// name: { g: playback gain, cap: longest it may run (seconds), gap: shortest time between two plays, files }
const GROUPS = {
  // blows, by what is doing the hitting
  slash:   { g: .75, cap: .42, gap: .07, files: ['rpg-audio/knifeSlice', 'rpg-audio/knifeSlice2'] },
  metal:   { g: .7,  cap: .5,  gap: .06, files: og('swords-starninjas', 'sword_clash.1', 'sword_clash.2', 'sword_clash.3', 'sword_clash.4', 'sword_clash.5') },
  clang:   { g: .6,  cap: .45, gap: .09, files: og('swords-starninjas', 'sword_clash.1', 'sword_clash.2', 'sword_clash.3', 'sword_clash.4', 'sword_clash.5') },   // the ring on a critical hit, and a parry
  iron:    { g: .85, cap: .36, gap: .08, files: imp('Metal_heavy', 0, 1, 2, 3, 4) },
  punch:   { g: .75, cap: .45, gap: .07, files: imp('Punch_medium', 0, 1, 2, 3) },
  heavy:   { g: .9,  cap: .6,  gap: .09, files: og('combat-150', 'BlastImpact*') },
  soft:    { g: .45, cap: .2,  gap: .12, files: imp('Soft_medium', 0, 1, 2, 3, 4) },
  thump:   { g: .8,  cap: .55, gap: .1,  files: imp('Soft_heavy', 0, 1, 2, 3) },
  wood:    { g: .7,  cap: .33, gap: .07, files: imp('Wood_medium', 0, 1, 2, 3) },
  twig:    { g: .55, cap: .27, gap: .08, files: imp('Wood_light', 0, 1, 2) },
  chop:    { g: .85, cap: .31, gap: .08, files: ['rpg-audio/chop', ...imp('Wood_heavy', 0, 2)] },
  glass:   { g: .55, cap: .21, gap: .08, files: imp('Glass_light', 0, 1, 2, 3) },
  shatter: { g: .7,  cap: .54, gap: .2,  files: imp('Glass_medium', 0, 1, 2) },
  bell:    { g: .6,  cap: .7,  gap: .25, files: imp('Bell_heavy', 2, 3, 4) },
  toll:    { g: .75, cap: 1.5, gap: .6,  files: imp('Bell_heavy', 0) },
  tick:    { g: .4,  cap: .14, gap: .09, files: imp('Generic_light', 0, 1, 2, 3, 4) },
  tin:     { g: .45, cap: .2,  gap: .09, files: imp('Tin_medium', 0, 1, 2, 3) },
  // launching, casting and the larger events
  gun:     { g: .5,  cap: .35, gap: .12, files: sn('Desert Eagle', '4m Left', 4) },   // the Gunner
  revolver:{ g: .55, cap: .55, gap: .12, files: sn('Smith & Wesson', '3m Behind', 4) },   // the Cowboy
  rail:    { g: .5,  cap: .7,  gap: .12, files: sn('Sci-Fi Energy Weapons', 'Shot Pulse') },   // the Railgun: a charged energy pulse
  loose:   { g: .4,  cap: .26, gap: .12, files: ['rpg-audio/cloth2', 'rpg-audio/cloth3', 'rpg-audio/cloth4'] },   // an arrow leaving the string: soft, short, airy
  whoosh:  { g: .45, cap: .46, gap: .15, files: ['casino-audio/card-slide-4', 'casino-audio/card-slide-1', 'casino-audio/card-slide-2'] },
  cast:    { g: .4,  cap: .45, gap: .15, files: ['digital-audio/phaseJump1', 'digital-audio/phaseJump2', 'digital-audio/phaseJump3', 'digital-audio/phaseJump4'] },
  zap:     { g: .4,  cap: .34, gap: .1,  files: ['sci-fi-sounds/laserSmall_000', 'sci-fi-sounds/laserSmall_001', 'sci-fi-sounds/laserSmall_002'] },
  boom:    { g: .9,  cap: 1.0, gap: .15, files: ['sci-fi-sounds/explosionCrunch_000', 'sci-fi-sounds/explosionCrunch_001', 'sci-fi-sounds/explosionCrunch_002'] },
  rumble:  { g: .9,  cap: 1.0, gap: .4,  files: ['sci-fi-sounds/lowFrequency_explosion_001'] },
  ko:      { g: .9,  cap: 1.3, gap: .4,  files: og('combat-150', 'ElectricExplosion*') },   // a fighter falls
  hum:     { g: .35, cap: .95, gap: .5,  files: ['sci-fi-sounds/forceField_000', 'sci-fi-sounds/forceField_002'] },
  rise:    { g: .3,  cap: .42, gap: .2,  files: ['digital-audio/phaserUp2', 'digital-audio/phaserUp4', 'digital-audio/phaserUp6'] },
  fall:    { g: .3,  cap: .47, gap: .2,  files: ['digital-audio/phaserDown1', 'digital-audio/phaserDown2'] },
  pop:     { g: .45, cap: .2,  gap: .1,  files: ['interface-sounds/drop_001', 'interface-sounds/drop_002', 'interface-sounds/drop_003'] },
  latch:   { g: .5,  cap: .3,  gap: .15, files: ['rpg-audio/metalLatch', 'rpg-audio/metalClick'] },
  // the scroll and the plates
  page:    { g: .5,  cap: .4,  gap: .05, files: ['rpg-audio/bookFlip2', 'rpg-audio/bookFlip3', 'rpg-audio/bookPlace1'] },
  open:    { g: .55, cap: .3,  gap: .05, files: ['rpg-audio/bookOpen', 'rpg-audio/bookClose'] },
  place:   { g: .5,  cap: .35, gap: .05, files: ['rpg-audio/bookPlace2', 'rpg-audio/bookPlace3'] },
  draw:    { g: .8,  cap: .48, gap: .2,  files: ['rpg-audio/drawKnife1', 'rpg-audio/drawKnife2', 'rpg-audio/drawKnife3'] },
  coins:   { g: .6,  cap: .85, gap: .2,  files: ['rpg-audio/handleCoins', 'rpg-audio/handleCoins2'] },
  click:   { g: .35, cap: .1,  gap: .04, files: ['ui-audio/click1', 'ui-audio/click2', 'ui-audio/click3'] },
  door:    { g: .75, cap: .7,  gap: .4,  files: ['rpg-audio/doorClose_1', 'rpg-audio/doorClose_4'] },
};

// library lookup: 'pack/name' -> file path
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(ogg|wav|mp3|flac)$/i.test(e.name)) out.push(p); } return out; }
const index = {};
for (const f of walk(path.join(LIB, 'kenney'))) index[path.relative(path.join(LIB, 'kenney'), f).split(path.sep)[0] + '/' + path.basename(f).replace(/\.\w+$/, '')] = f;
const OGA = fs.existsSync(path.join(LIB, 'oga')) ? walk(path.join(LIB, 'oga')).filter(f => !/__MACOSX|[\\/]\./.test(f)).map(f => ({ f, pack: path.relative(path.join(LIB, 'oga'), f).split(path.sep)[0], base: path.basename(f).replace(/\.\w+$/, '') })) : [];
const SON = fs.existsSync(path.join(LIB, 'sonniss')) ? walk(path.join(LIB, 'sonniss')).map(f => ({ f, rel: path.relative(LIB, f).split(path.sep).join('/').toLowerCase(), base: path.basename(f).replace(/\.\w+$/, '').toLowerCase() })) : [];
// single takes out of a long recording: where the sound jumps up out of quiet, the loudest `max` of those, in time order
function cutTakes(x, cap, max) {
  const hop = Math.round(.01 * RATE), env = [];
  for (let i = 0; i + hop <= x.length; i += hop) { let m = 0; for (let k = 0; k < hop; k++) m = Math.max(m, Math.abs(x[i + k])); env.push(m); }
  let peak = 0; for (const v of env) peak = Math.max(peak, v);
  const th = peak * .22, quiet = peak * .06, starts = [];
  let calm = 100;
  for (let i = 0; i < env.length; i++) { if (env[i] > th && calm >= 18) { let p = 0; for (let k = i; k < Math.min(env.length, i + 8); k++) p = Math.max(p, env[k]); starts.push({ i, p }); calm = 0; } else if (env[i] < quiet) calm++; else if (env[i] > th) calm = 0; }
  return starts.sort((a, b) => b.p - a.p).slice(0, max).sort((a, b) => a.i - b.i).map(s => tidy(x.slice(Math.max(0, s.i * hop - Math.round(.004 * RATE)), s.i * hop + Math.round((cap + .3) * RATE)), cap));
}
// the clips of one sound, ready to be laid end to end
function clips(G) {
  if (G.files.sn) {
    const hit = SON.filter(x => x.rel.includes(G.files.sn.toLowerCase()) && x.base.includes(G.files.name.toLowerCase())).sort((a, b) => a.base.localeCompare(b.base, 'en', { numeric: true }));
    if (!hit.length) throw new Error('not in the library: sonniss / ' + G.files.sn + ' / ' + G.files.name);
    const x = decode(hit[0].f), out = G.files.takes ? cutTakes(x, G.cap, G.files.takes) : [tidy(x, G.cap)];
    if (!out.length) throw new Error('no takes found in ' + hit[0].f);
    return out;
  }
  return resolve(G.files).map(f => tidy(decode(f), G.cap));
}
function resolve(files) {
  if (Array.isArray(files)) return files.map(id => { if (!index[id]) throw new Error('not in the library: ' + id); return index[id]; });
  const out = [];
  for (const n of files.names) {
    const hit = OGA.filter(x => x.pack === files.og && (n.endsWith('*') ? x.base.toLowerCase().startsWith(n.slice(0, -1).toLowerCase()) : x.base.toLowerCase() === n.toLowerCase())).sort((a, b) => a.base.localeCompare(b.base, 'en', { numeric: true }));
    if (!hit.length) throw new Error('not in the library: oga/' + files.og + '/' + n);
    for (const x of hit) if (!out.includes(x.f)) out.push(x.f);
  }
  return out;
}

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg could not read ' + file + ': ' + r.stderr);
  const b = r.stdout, n = b.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2) / 32768;
  return out;
}
// trim silence, cap the length, bring the peak to a common level, and fade the ends so nothing clicks
function tidy(x, cap) {
  let a = 0, b = x.length - 1; const th = 0.006;
  while (a < b && Math.abs(x[a]) < th) a++;
  while (b > a && Math.abs(x[b]) < th) b--;
  a = Math.max(0, a - 40); b = Math.min(x.length - 1, b + 400);
  let y = x.slice(a, Math.min(b + 1, a + Math.round(cap * RATE)));
  let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? 0.89 / peak : 1, cut = y.length === Math.round(cap * RATE);
  const fin = Math.min(y.length, Math.round(.002 * RATE)), fout = Math.min(y.length, Math.round((cut ? .09 : .02) * RATE));
  for (let i = 0; i < y.length; i++) { let g = k; if (i < fin) g *= i / fin; const e = y.length - 1 - i; if (e < fout) g *= e / fout; y[i] *= g; }
  return y;
}
const parts = [new Float32Array(Math.round(.25 * RATE))], map = {};
let pos = parts[0].length, takes = 0;
for (const [name, G] of Object.entries(GROUPS)) {
  map[name] = { g: G.g, gap: G.gap, v: [] };
  for (const y of clips(G)) {
    map[name].v.push([+(pos / RATE).toFixed(4), +(y.length / RATE).toFixed(4)]);
    parts.push(y, new Float32Array(Math.round(GAP * RATE)));
    pos += y.length + Math.round(GAP * RATE); takes++;
  }
}
// write a WAV, then let ffmpeg make the MP3
const total = pos, pcm = Buffer.alloc(total * 2);
let o = 0; for (const p of parts) for (const v of p) { pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), o); o += 2; }
const head = Buffer.alloc(44);
head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.join(OUT, 'sfx'), { recursive: true });
const wav = path.join(OUT, 'sfx', 'brawl.build.wav'), mp3 = path.join(OUT, 'sfx', 'brawl.mp3');
fs.writeFileSync(wav, Buffer.concat([head, pcm]));
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '80k', '-ac', '1', '-ar', String(RATE), mp3], { encoding: 'utf8' });
fs.unlinkSync(wav);
if (r.status !== 0) throw new Error('ffmpeg could not write the mp3: ' + r.stderr);
fs.writeFileSync(path.join(OUT, 'sfx', 'CREDITS.txt'), 'brawl.mp3 is assembled mostly from public-domain (Creative Commons Zero) sound effects.\n\nFrom opengameart.org, licence checked 2026-11-26:\n  20 Sword Sound Effects (Attacks and Clashes), by StarNinjas: https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes\n  150 Combat Sound Effects, compiled by untamedpixels (its LICENSES.txt names each source): https://opengameart.org/content/150-combat-sound-effects\n  RPG Sound Pack, by artisticdude: https://opengameart.org/content/rpg-sound-pack\n  80 CC0 RPG SFX, by rubberduck: https://opengameart.org/content/80-cc0-rpg-sfx\n\nFrom the Sonniss #GameAudioGDC bundle (sonniss.com/gameaudiogdc), used under its licence: some sounds inside brawl.mp3 only. They are licensed for use in this game and are not offered for reuse.\n\nFrom Kenney (www.kenney.nl):\nPacks used: Impact Sounds, RPG Audio, Interface Sounds, UI Audio, Digital Audio, Sci-fi Sounds, Casino Audio.\n');
fs.writeFileSync(path.join(OUT, 'brawl-sfx.js'),
  '// Generated by tools/sfx-build.js. Where each sound sits inside sfx/brawl.mp3: name -> gain, shortest gap between plays, and its takes as [start, length] in seconds.\n' +
  "const SFX_FILE='sfx/brawl.mp3?h=" + require('crypto').createHash('md5').update(fs.readFileSync(mp3)).digest('hex').slice(0, 8) + "',SFX_LEAD=" + LEAD + ';\nconst SFX=' + JSON.stringify(map).replace(/"(\w+)":/g, '$1:') + ';\n');
console.log(Object.keys(GROUPS).length + ' sounds, ' + takes + ' takes, ' + (total / RATE).toFixed(1) + ' s, ' + Math.round(fs.statSync(mp3).size / 1024) + ' KB -> sfx/brawl.mp3');
