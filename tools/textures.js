// Makes the interface's texture pictures: the torn parchment of the scroll, the chiselled stone of the buttons, the round
// stone of the small footer buttons, and the dark stone behind the page. It writes them into art/ui/ as PNG files, which
// brawl.css uses.  Usage: node tools/textures.js
// The user asked for these on 2026-11-28 ("actual parchment texture", buttons "like stone"); said of a first try with
// straight edges that it "still looks like web UI elements, maybe an adjustment to the edges of the paper to look like
// parchment, and some subtly things to make the stone buttons look like stone"; and of the next, drawn in coarse dots:
// "the edges of the buttons and the parchment could be more high fidelity and like realistic. Also the parchment could
// be a little more even for the places where text and stuff is on there so it's clearly legible".
// So these are drawn at full detail, three picture pixels to one screen point (one phone pixel each on most phones):
//   the scroll  an uneven torn outline with small tears, a dark worn rim and a brown stain that fades inwards within
//               about a finger's width; the middle, where the writing goes, is one pale colour with only faint mottling
//   the stone   a block with a chiselled edge (a real bevel: lit from the top left, in shade at the bottom right), a few
//               chips out of the edge that catch the light the same way, a grained and pitted face
// Each is a nine-slice sheet (corners, edges that repeat, a middle that repeats), so a scroll or button of any size
// gets the outline with no straight box edge. Everything in a sheet's middle wraps, so the repeats join without a seam.
// Then two corrections (Build 65). "The buttons have like a weird rectangular strip now": a button is far shorter than
// the stone's repeating middle, so its middle band was cut from a different part of the stone than its top and bottom
// edges and showed as a strip. The stone sheet is now only as tall as a button and is stretched to the button's height
// instead of repeated down it, so the face is one continuous piece. And "the parchment and stone buttons should still
// retain a little bit of their old texture and character very slightly. It's slightly too just plain now": the first
// version's coarse dotted mottling (and its specks, pits and flecks) is laid faintly over the smooth surfaces.
// If a picture changes, give it a new file name, so no phone goes on showing the old one.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = path.join(__dirname, '..', 'art', 'ui');

const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const ss = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hash(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// smooth noise whose grid wraps every px cells across and py cells down, so a picture made from it can tile
function vn(x, y, px, py, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, w = (a, b) => hash(((a % px) + px) % px, ((b % py) + py) % py, s), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (w(xi, yi) * (1 - sx) + w(xi + 1, yi) * sx) * (1 - sy) + (w(xi, yi + 1) * (1 - sx) + w(xi + 1, yi + 1) * sx) * sy;
}
const n1 = (pos, P, scale, s) => vn(pos / scale, .5, P / scale, 1, s);                      // the same along a line
// several sizes of that noise added together; P / cell must be a whole number
function fbm(u, v, P, cell, oct, s) { let a = 0, amp = .5, tot = 0; for (let o = 0; o < oct; o++) { const c = cell / (1 << o); a += amp * vn(u / c, v / c, P / c, P / c, s + o * 17); tot += amp; amp *= .5; } return a / tot; }

// A nine-slice sheet. TX by TY = its size, C = the corner size; the middle repeats across, and down too unless
// o.stretchV says the sheet will be stretched to the box's height instead (then nothing needs to wrap that way).
// o.bite(pos, side) = how far in the outline sits at that point along a side; o.R = the four corners' roundness;
// o.paint(u, v, e, gx, gy, far) = the colour at a point, given how far inside the outline it is (e), which way "inwards"
// is, and how far inside a smoothed outline it is (far: o.calm(pos, side), where a sheet gives one).
function sheet(TX, TY, C, o) {
  const PX = TX - 2 * C, PY = TY - 2 * C, wrap = p => ((p % PX) + PX) % PX, wrapV = o.stretchV ? p => p : p => ((p % PY) + PY) % PY, W = TX + 2;
  const inside = (x, y, bite) => {
    const u = wrap(x - C), v = wrapV(y - C);
    const pl = x - bite(v, 1), pr = (TX - x) - bite(v, 2), pt = y - bite(u, 3), pb = (TY - y) - bite(u, 4);
    const px = Math.min(pl, pr), py = Math.min(pt, pb), R = o.R[(pl < pr ? 0 : 1) + (pt < pb ? 0 : 2)];
    return px < R && py < R ? R - Math.hypot(R - px, R - py) : Math.min(px, py);
  };
  const E = new Float32Array(W * (TY + 2));
  for (let y = -1; y <= TY; y++) for (let x = -1; x <= TX; x++) E[(y + 1) * W + x + 1] = inside(x + .5, y + .5, o.bite);
  const d = Buffer.alloc(TX * TY * 4);
  for (let y = 0; y < TY; y++) for (let x = 0; x < TX; x++) {
    const k = (y + 1) * W + x + 1, e = E[k], i = (y * TX + x) * 4;
    if (e <= 0) continue;
    const q = o.paint(wrap(x - C), wrapV(y - C), e, (E[k + 1] - E[k - 1]) / 2, (E[k + W] - E[k - W]) / 2, o.calm ? inside(x + .5, y + .5, o.calm) : e);
    d[i] = cl(Math.round(q[0]), 0, 255); d[i + 1] = cl(Math.round(q[1]), 0, 255); d[i + 2] = cl(Math.round(q[2]), 0, 255); d[i + 3] = Math.round(255 * cl(e / (o.soft || 1.2), 0, 1));
  }
  return { w: TX, h: TY, d };
}

// ----- the scroll: 24 screen points of corner, a middle that repeats every 160
const PAPER = [235, 222, 189], WARM = [228, 211, 171], STAIN = [182, 146, 92], RIM = [108, 78, 44], SP = 480;
const parchment = sheet(624, 624, 72, {
  R: [22, 30, 26, 18], soft: 1.6,
  bite(pos, s) {
    let b = 5 + 11 * n1(pos, SP, 96, s) + 6 * n1(pos, SP, 32, s + 10) + 3 * n1(pos, SP, 8, s + 20) + 1.6 * n1(pos, SP, 3, s + 30);   // a wandering line, rough at every size
    const seg = Math.floor(pos / 120);
    if (hash(seg, s, 60) > .78) { const c = seg * 120 + 25 + 70 * hash(seg, s, 61), hw = 7 + 6 * hash(seg, s, 62), dd = Math.abs(pos - c); if (dd < hw) b += (6 + 7 * hash(seg, s, 63)) * Math.pow(1 - dd / hw, 1.3); }   // a small tear
    return b;
  },
  calm: (pos, s) => 5 + 11 * n1(pos, SP, 96, s) + 6 * n1(pos, SP, 32, s + 10) + 2.3,
  paint(u, v, e, gx, gy, far) {
    let c = mixc(PAPER, WARM, ss(.5, .78, fbm(u, v, SP, 120, 4, 31)) * .3);          // faint warmer patches
    let k = 1 + (fbm(u, v, SP, 120, 3, 11) - .5) * .05;                             // faint mottling
    if (vn(u / 24, v / 1.5, SP / 24, SP / 1.5, 41) > .82) k -= .014;                 // a fibre
    // a little of the first version's character: its coarse dots (4 picture pixels each) in five tones, its foxing and specks, all faint
    const du = Math.floor(u / 4), dv = Math.floor(v / 4);
    let tone = cl(Math.floor((vn(du / 30, dv / 30, 4, 4, 2) * .44 + vn(du / 8, dv / 8, 15, 15, 4) * .24 + hash(du, dv, 6) * .32) * 5.4) + 1, 1, 5);
    if (vn(du / 15, dv / 15, 8, 8, 40) > .74) tone--;
    k += (tone - 3) * .013;
    if (hash(du, dv, 90) > .9985) k -= .09;
    const wide = 20 + 24 * vn(u / 60, v / 60, 8, 8, 51);                             // the stain reaches in further in some places
    c = mixc(c, STAIN, Math.pow(1 - ss(0, wide, Math.max(far, e * .6)), 1.7) * .8);
    c = mixc(c, RIM, (1 - ss(0, 3.4, e)) * .72);                                     // the worn rim
    return [c[0] * k, c[1] * k, c[2] * k];
  },
});

// ----- a stone block: 10 screen points of corner; its middle repeats every 64 across, and is 24 tall, stretched to the button
const BP = 192;
function stonePaint(base, seed) {
  return (u, v, e, gx, gy) => {
    let k = .74 + .5 * fbm(u, v, BP, 48, 5, seed) + .1 * (vn(u / 1.5, v / 1.5, 128, 128, seed + 40) - .5);   // the grain, coarse and fine
    const sp = vn(u / 2, v / 2, 96, 96, seed + 50); if (sp > .9) k *= 1 - 3 * (sp - .9); else if (sp < .07) k *= 1.14;   // pits and pale flecks
    // a little of the first version's character: its coarse dots in four tones, its square pits and flecks, all faint
    const du = Math.floor(u / 4), dv = Math.floor(v / 4);
    k *= 1 + (cl(Math.floor((vn(du / 8, dv / 8, 6, 6, seed + 100) * .5 + vn(du / 3, dv / 3, 16, 16, seed + 101) * .26 + hash(du, dv, seed + 102) * .24) * 4.4), 0, 3) - 1.5) * .04;
    if (hash(du, dv, seed + 103) > .985) k *= .8; else if (hash(du, dv, seed + 104) > .992) k *= 1.16;
    const wide = 6.5 + 3 * vn(u / 24, v / 24, 8, 8, seed + 90), g = Math.hypot(gx, gy) || 1, lit = (gx * .45 + gy * .89) / g;
    k *= 1 + (1 - ss(wide - 1.6, wide, e)) * .6 * lit;                               // the chiselled edge: lit from the top left
    k *= 1 - .14 * Math.exp(-(((e - wide) / 1.6) ** 2));                             // a fine dark line where the edge meets the face
    k *= .55 + .45 * ss(0, 1.8, e);
    return [base[0] * k, base[1] * k, base[2] * k];
  };
}
const stoneBite = seed => (pos, s) => {
  let b = 1.2 + 1.3 * n1(pos, BP, 48, s + seed) + .5 * n1(pos, BP, 6, s + seed + 10);
  const seg = Math.floor(pos / 64);
  if (hash(seg, s + seed, 60) > .62) { const c = seg * 64 + 12 + 40 * hash(seg, s + seed, 61), hw = 4 + 7 * hash(seg, s + seed, 62), dd = Math.abs(pos - c); if (dd < hw) b += (2.2 + 3.2 * hash(seg, s + seed, 63)) * Math.sqrt(1 - (dd / hw) ** 2); }   // a chip
  return b;
};
const GREY = [70, 74, 76], RED = [134, 42, 48];
const slab = (base, seed, R) => sheet(252, 132, 30, { R, stretchV: true, bite: stoneBite(seed), paint: stonePaint(base, seed) });

// ----- a round stone for the small footer buttons (38 screen points across)
function knob() {
  const T = 114, R = 54, W = T + 2, paint = stonePaint(GREY, 140), E = new Float32Array(W * W), d = Buffer.alloc(T * T * 4);
  const inside = (x, y) => { const dx = x - T / 2, dy = y - T / 2, a = (Math.atan2(dy, dx) / (2 * Math.PI) + .5) * 96; return R - Math.hypot(dx, dy) - 1.6 * n1(a, 96, 12, 201) - (n1(a, 96, 8, 202) > .78 ? 3 * ss(.78, .9, n1(a, 96, 8, 202)) : 0); };
  for (let y = -1; y <= T; y++) for (let x = -1; x <= T; x++) E[(y + 1) * W + x + 1] = inside(x + .5, y + .5);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const k = (y + 1) * W + x + 1, e = E[k], i = (y * T + x) * 4; if (e <= 0) continue;
    const q = paint(x, y, e, (E[k + 1] - E[k - 1]) / 2, (E[k + W] - E[k - W]) / 2);
    d[i] = cl(Math.round(q[0]), 0, 255); d[i + 1] = cl(Math.round(q[1]), 0, 255); d[i + 2] = cl(Math.round(q[2]), 0, 255); d[i + 3] = Math.round(255 * cl(e / 1.2, 0, 1));
  }
  return { w: T, h: T, d };
}

// ----- the dark stone behind everything: a plain tile of a few flat tones, enlarged four times, that repeats
function wall() {
  const n = 64, K = 4, T = n * K, d = Buffer.alloc(T * T * 4), tones = [[20, 22, 26], [27, 30, 33], [34, 38, 40], [42, 46, 46]];
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const sx = Math.floor(x / K), sy = Math.floor(y / K), q = tones[cl(Math.floor((vn(sx / 8, sy / 8, 8, 8, 31) * .5 + vn(sx / 3, sy / 3, 21, 21, 32) * .28 + hash(sx, sy, 33) * .22) * 4), 0, 3)], i = (y * T + x) * 4;
    d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255;
  }
  return { w: T, h: T, d };
}

// ----- writing a PNG (full colour with see-through; each row stored the way that packs smallest)
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); }
function png(p) {
  const W = p.w, H = p.h, B = 4, row = W * B, raw = Buffer.alloc((row + 1) * H), tries = [0, 1, 2, 3, 4].map(() => Buffer.alloc(row));
  const paeth = (a, b, c) => { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < H; y++) {
    const at = y * row; let best = 0, bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0; const t = tries[f];
      for (let i = 0; i < row; i++) {
        const x = p.d[at + i], a = i >= B ? p.d[at + i - B] : 0, b = y ? p.d[at - row + i] : 0, c = y && i >= B ? p.d[at - row + i - B] : 0;
        const v = (f === 0 ? x : f === 1 ? x - a : f === 2 ? x - b : f === 3 ? x - ((a + b) >> 1) : x - paeth(a, b, c)) & 255;
        t[i] = v; sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    raw[y * (row + 1)] = best; tries[best].copy(raw, y * (row + 1) + 1);
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, p] of [['scroll2', parchment], ['block', slab(GREY, 11, [8, 13, 9, 11])], ['block2', slab(GREY, 61, [12, 8, 11, 9])], ['block-red', slab(RED, 21, [9, 11, 13, 8])], ['knob2', knob()], ['wall', wall()]]) {
  const b = png(p); fs.writeFileSync(path.join(OUT, name + '.png'), b);
  console.log(name + '.png  ' + p.w + ' by ' + p.h + '  ' + (b.length / 1024).toFixed(1) + ' KB');
}
