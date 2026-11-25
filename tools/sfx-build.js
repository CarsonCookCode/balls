// Builds Ball Brawl's sound file from the sound library kept on this PC (outside the repo).
//   node tools/sfx-build.js
// Output: sfx/brawl.mp3 (every sound end to end, with silence between) and brawl-sfx.js (where each one starts).
// Needs ffmpeg on PATH. Sources are Kenney's audio packs (kenney.nl), which are public domain (CC0), so the
// built file may be published. Sounds from libraries whose licence forbids republishing must NOT be added here.
//
// To change the sound of something: edit GROUPS below (several takes per sound keep repeats from grating),
// run this script, and bump the ?v= on brawl-sfx.js in duel.html.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const LIB = process.env.BRAWL_AUDIO_LIBRARY || 'C:/repos/balls-audio-library';
const OUT = path.join(__dirname, '..');
const RATE = 44100, GAP = 0.18, LEAD = 0.03;

const imp = (n, ...i) => i.map(k => 'impact-sounds/impact' + n + '_00' + k);
// name: { g: playback gain, cap: longest it may run (seconds), gap: shortest time between two plays, files }
const GROUPS = {
  // blows, by what is doing the hitting
  slash:   { g: .75, cap: .42, gap: .07, files: ['rpg-audio/knifeSlice', 'rpg-audio/knifeSlice2'] },
  metal:   { g: .7,  cap: .3,  gap: .06, files: imp('Metal_medium', 0, 1, 2, 3, 4) },
  clang:   { g: .6,  cap: .45, gap: .09, files: imp('Metal_light', 0, 1, 2, 3, 4) },
  iron:    { g: .85, cap: .36, gap: .08, files: imp('Metal_heavy', 0, 1, 2, 3, 4) },
  punch:   { g: .75, cap: .45, gap: .07, files: imp('Punch_medium', 0, 1, 2, 3) },
  heavy:   { g: .9,  cap: .55, gap: .09, files: imp('Punch_heavy', 1, 2, 3, 4) },
  soft:    { g: .45, cap: .2,  gap: .12, files: imp('Soft_medium', 0, 1, 2, 3, 4) },
  thump:   { g: .8,  cap: .55, gap: .1,  files: imp('Soft_heavy', 0, 1, 2, 3) },
  wood:    { g: .7,  cap: .33, gap: .07, files: imp('Wood_medium', 0, 1, 2, 3) },
  twig:    { g: .55, cap: .27, gap: .08, files: imp('Wood_light', 0, 1, 2) },
  chop:    { g: .85, cap: .31, gap: .08, files: ['rpg-audio/chop', ...imp('Wood_heavy', 0, 2)] },
  plate:   { g: .65, cap: .5,  gap: .08, files: [...imp('Plate_medium', 2, 4), ...imp('Plate_heavy', 1, 3)] },
  glass:   { g: .55, cap: .21, gap: .08, files: imp('Glass_light', 0, 1, 2, 3) },
  shatter: { g: .7,  cap: .54, gap: .2,  files: imp('Glass_medium', 0, 1, 2) },
  bell:    { g: .6,  cap: .7,  gap: .25, files: imp('Bell_heavy', 2, 3, 4) },
  toll:    { g: .75, cap: 1.5, gap: .6,  files: imp('Bell_heavy', 0) },
  tick:    { g: .4,  cap: .14, gap: .09, files: imp('Generic_light', 0, 1, 2, 3, 4) },
  tin:     { g: .45, cap: .2,  gap: .09, files: imp('Tin_medium', 0, 1, 2, 3) },
  // launching, casting and the larger events
  twang:   { g: .5,  cap: .16, gap: .08, files: ['interface-sounds/pluck_001', 'interface-sounds/pluck_002'] },
  whoosh:  { g: .45, cap: .46, gap: .15, files: ['casino-audio/card-slide-4', 'casino-audio/card-slide-1', 'casino-audio/card-slide-2'] },
  cast:    { g: .4,  cap: .45, gap: .15, files: ['digital-audio/phaseJump1', 'digital-audio/phaseJump2', 'digital-audio/phaseJump3', 'digital-audio/phaseJump4'] },
  zap:     { g: .4,  cap: .34, gap: .1,  files: ['sci-fi-sounds/laserSmall_000', 'sci-fi-sounds/laserSmall_001', 'sci-fi-sounds/laserSmall_002'] },
  boom:    { g: .9,  cap: 1.0, gap: .15, files: ['sci-fi-sounds/explosionCrunch_000', 'sci-fi-sounds/explosionCrunch_001', 'sci-fi-sounds/explosionCrunch_002'] },
  rumble:  { g: .9,  cap: 1.0, gap: .4,  files: ['sci-fi-sounds/lowFrequency_explosion_001'] },
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
  for (const id of G.files) {
    if (!index[id]) throw new Error('not in the library: ' + id);
    const y = tidy(decode(index[id]), G.cap);
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
fs.writeFileSync(path.join(OUT, 'sfx', 'CREDITS.txt'), 'brawl.mp3 is assembled from sound effects by Kenney (www.kenney.nl), released into the public domain (Creative Commons Zero).\nPacks used: Impact Sounds, RPG Audio, Interface Sounds, UI Audio, Digital Audio, Sci-fi Sounds, Casino Audio.\n');
fs.writeFileSync(path.join(OUT, 'brawl-sfx.js'),
  '// Generated by tools/sfx-build.js. Where each sound sits inside sfx/brawl.mp3: name -> gain, shortest gap between plays, and its takes as [start, length] in seconds.\n' +
  "const SFX_FILE='sfx/brawl.mp3',SFX_LEAD=" + LEAD + ';\nconst SFX=' + JSON.stringify(map).replace(/"(\w+)":/g, '$1:') + ';\n');
console.log(Object.keys(GROUPS).length + ' sounds, ' + takes + ' takes, ' + (total / RATE).toFixed(1) + ' s, ' + Math.round(fs.statSync(mp3).size / 1024) + ' KB -> sfx/brawl.mp3');
