// Makes the interface's texture pictures: the torn parchment of the scroll, the chipped stone of the buttons, the round
// stone of the small footer buttons, and the dark stone behind the page. It writes them into art/ui/ as PNG files, which
// brawl.css uses.  Usage: node tools/textures.js
// The user asked for these on 2026-11-28 ("actual parchment texture", buttons "like stone"; then, of a first try with
// straight edges: "still looks like web UI elements, maybe an adjustment to the edges of the paper to look like
// parchment, and some subtly things to make the stone buttons look like stone") and approved this version from a mock-up.
// The recipe is the one behind the arena floor in brawl-looks.js: a small picture made dot by dot from a few colours and
// a noise, then enlarged with hard edges. The pictures are nine-slice sheets (corners, edges that repeat, a middle that
// repeats), so a scroll or button of any size gets an uneven outline with no straight box edge.
// If a picture ever changes, give it a new file name: the page keeps these for a long time.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = path.join(__dirname, '..', 'art', 'ui'), BIG = 4;   // each dot becomes 4 by 4 pixels: one phone pixel each on most phones

const cl = (v, a, b) => v < a ? a : v > b ? b : v;
function hash(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// smooth noise that repeats every `per` cells, so a picture made from it can tile
function vnoise(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, w = (a, b) => hash(((a % per) + per) % per, ((b % per) + per) % per, s), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (w(xi, yi) * (1 - sx) + w(xi + 1, yi) * sx) * (1 - sy) + (w(xi, yi + 1) * (1 - sx) + w(xi + 1, yi + 1) * sx) * sy;
}
function pix(n, m, fn) {
  const d = Buffer.alloc(n * m * 4);
  for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) { const q = fn(x, y), i = (y * n + x) * 4; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = q.length > 3 ? q[3] : 255; }
  return { w: n, h: m, d };
}

// A nine-slice sheet. T = its size, C = the corner size; the middle (T - 2C) repeats, so everything in it is made to wrap.
function sheet(T, C, o) {
  const P = T - 2 * C;
  return pix(T, T, (x, y) => {
    const u = ((x - C) % P + P) % P, v = ((y - C) % P + P) % P, dl = x, dr = T - 1 - x, dt = y, db = T - 1 - y;
    // how far in the outline bites here: a wandering line along each side, with a deeper nick now and then
    const bite = (pos, side) => o.e0 + o.e1 * vnoise(pos / o.f1, side * 7.3, Math.round(P / o.f1), 40 + side) + o.e2 * vnoise(pos / o.f2, side * 3.1, Math.round(P / o.f2), 50 + side) +
      (hash(Math.floor(pos / o.nick), side, 60) > o.nickP ? o.nickD * Math.max(0, 1 - Math.abs((pos % o.nick) - o.nick / 2) / (o.nick * .3)) : 0);
    const bl = bite(v, 1), br = bite(v, 2), bt = bite(u, 3), bb = bite(u, 4);
    let inside = dl > bl && dr > br && dt > bt && db > bb, edge = Math.min(dl - bl, dr - br, dt - bt, db - bb);
    for (const [cx, cy, sx, sy, sd] of [[0, 0, 1, 1, 5], [T - 1, 0, -1, 1, 6], [0, T - 1, 1, -1, 7], [T - 1, T - 1, -1, -1, 8]]) {   // corners: worn round, each differently
      const R = o.cr * (.7 + .6 * hash(sd, 1, 90)), ax = (x - cx) * sx, ay = (y - cy) * sy;
      if (ax < R && ay < R) { const d = Math.sqrt((R - ax) * (R - ax) + (R - ay) * (R - ay)), lim = R - o.e0 - o.e1 * vnoise(ax / 3 + sd, ay / 3, 64, 95); if (d > lim) inside = false; edge = Math.min(edge, lim - d); }
    }
    return inside ? o.paint(u, v, edge, x, y) : [0, 0, 0, 0];
  });
}

// parchment: mottled tans, browner towards the torn edge, a few fibres and specks
const PARCH = [[196, 170, 120], [208, 185, 137], [218, 197, 151], [226, 207, 163], [233, 216, 174], [239, 224, 185]];
const parchment = sheet(176, 32, { e0: 1.5, e1: 3.2, f1: 14.4, e2: 1.6, f2: 4.8, nick: 28, nickP: .72, nickD: 4.5, cr: 11, paint(u, v, edge, x, y) {
  let n = vnoise(u / 28, v / 28, 4, 2) * .44 + vnoise(u / 8, v / 8, 14, 4) * .24 + hash(u, v, 6) * .32, k = cl(Math.floor(n * 5.4) + 1, 1, 5);
  if (vnoise(u / 14, v / 14, 8, 40) > .74) k--;
  if (hash(u >> 2, v, 77) > .986 && hash(u, v, 78) > .35) k--;                 // a fibre
  if (hash(u, v, 90) > .9993) return [150, 122, 82, 255];                     // a speck
  if (edge < 1.2) return [124, 96, 58, 255];                                  // the very edge, darkened by handling
  if (edge < 3.2) k -= 2; else if (edge < 6) k -= 1; else if (edge < 9 && hash(x, y, 12) > .5) k -= 1;
  return PARCH[cl(k, 0, 5)].concat(255);
} });

// a stone block: lit along its top and left, shaded along its bottom and right, pitted, chipped at the corners
const stoneSheet = (pal, seed) => sheet(72, 12, { e0: .4, e1: 1.5, f1: 6, e2: .9, f2: 2.4, nick: 16, nickP: .8, nickD: 2.2, cr: 5, paint(u, v, edge, x, y) {
  let n = vnoise(u / 8, v / 8, 6, seed) * .5 + vnoise(u / 3, v / 3, 16, seed + 1) * .26 + hash(u, v, seed + 2) * .24, k = cl(Math.floor(n * 4.4), 0, 3) + 1;
  if (edge < 2.2) { if (y > 59 || x > 59) k -= 2; else if ((y < 12 && x < 60) || (x < 12 && y < 60)) k += 1; }
  if (edge < .9) k -= 1;
  if (hash(u, v, seed + 3) > .985) k = 0;                                       // a pit
  if (hash(u, v, seed + 4) > .992) k = Math.min(5, k + 2);                      // a pale fleck
  return pal[cl(k, 0, 5)].concat(255);
} });
const GREY = [[26, 28, 31], [40, 44, 47], [53, 57, 59], [66, 70, 70], [81, 85, 81], [104, 107, 99]], RED = [[52, 14, 18], [86, 24, 30], [108, 32, 38], [128, 40, 46], [148, 50, 54], [182, 84, 80]];

// the dark stone behind everything: a plain tile that repeats
const wall = pix(64, 64, (x, y) => { const n = vnoise(x / 8, y / 8, 8, 31) * .5 + vnoise(x / 3, y / 3, 21, 32) * .28 + hash(x, y, 33) * .22; return [[20, 22, 26], [27, 30, 33], [34, 38, 40], [42, 46, 46]][cl(Math.floor(n * 4), 0, 3)]; });
// a round stone for the small footer buttons
const disc = pix(24, 24, (x, y) => {
  const dx = x - 11.5, dy = y - 11.5, d = Math.sqrt(dx * dx + dy * dy) + vnoise(x / 3, y / 3, 8, 70) * 1.4; if (d > 11.6) return [0, 0, 0, 0];
  let k = 2 + Math.floor(vnoise(x / 4, y / 4, 6, 71) * 2 + hash(x, y, 72) * .8); if (d > 9.6) k += (dx + dy < 0 ? 1 : -2); return GREY[cl(k, 0, 5)].concat(255);
});

// ----- writing a PNG (a palette one: these pictures use a handful of colours each)
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); }
function png(p, k) {
  const W = p.w * k, H = p.h * k, at = new Map(), pal = [];
  const small = Buffer.alloc(p.w * p.h);
  for (let i = 0; i < p.w * p.h; i++) { const key = p.d.readUInt32BE(i * 4); let n = at.get(key); if (n === undefined) { n = pal.length; if (n > 255) throw new Error('more than 256 colours'); at.set(key, n); pal.push(key); } small[i] = n; }
  const raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) { const row = y * (W + 1), sy = Math.floor(y / k) * p.w; for (let x = 0; x < W; x++) raw[row + 1 + x] = small[sy + Math.floor(x / k)]; }
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = 3;
  const plte = Buffer.alloc(pal.length * 3), trns = Buffer.alloc(pal.length);
  pal.forEach((c, i) => { plte[i * 3] = c >>> 24; plte[i * 3 + 1] = (c >>> 16) & 255; plte[i * 3 + 2] = (c >>> 8) & 255; trns[i] = c & 255; });
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('PLTE', plte), chunk('tRNS', trns), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, p] of [['parchment', parchment], ['stone', stoneSheet(GREY, 11)], ['stone2', stoneSheet(GREY, 61)], ['redstone', stoneSheet(RED, 21)], ['disc', disc], ['wall', wall]]) {
  const b = png(p, BIG); fs.writeFileSync(path.join(OUT, name + '.png'), b);
  console.log(name + '.png  ' + p.w * BIG + ' by ' + p.h * BIG + '  ' + (b.length / 1024).toFixed(1) + ' KB');
}
