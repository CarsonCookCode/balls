// Sound-and-picture helpers for the automatic video, built on ffmpeg (used when it is installed; the tools say so when
// it is not). Two things go wrong with a browser's recording, both measured on 2026-11-26:
//   - While the game is silent the recorder writes no sound at all, leaving holes in the sound's timeline (two seconds
//     in one recording). A converter that ignores the holes slides every later sound earlier. They are filled here.
//   - The sound can sit a steady fraction of a second ahead of or behind the picture, by a different amount on
//     different computers.
// So the recorder puts a mark at the very start and the very end of every automatic video: a white square in the corner
// and a beep in the same instant (brawl-video.js). finish() measures the gap between square and beep at both ends,
// shifts the sound to close it, cuts both marks off and writes an MP4. If the two ends disagree, the sound is drifting
// and the video is not trusted.
const cp = require('child_process'), fs = require('fs');
const FF = process.env.FFMPEG_PATH || 'ffmpeg', PROBE = process.env.FFPROBE_PATH || 'ffprobe';
const has = () => { try { return cp.spawnSync(FF, ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; } };
const raw = args => cp.spawnSync(FF, ['-v', 'error', ...args], { maxBuffer: 1 << 30 }).stdout || Buffer.alloc(0);
// the length of the picture: a browser's recording does not always say, so the last frame's time is read
function duration(file) {
  const r = cp.spawnSync(PROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const t = String(r.stdout || '').trim().split(/\r?\n/).map(Number).filter(Number.isFinite);
  return t.length ? Math.max(...t) : 0;
}
const AUDIO = 'aresample=16000:async=1:first_pts=0';     // the sound on the file's own clock, holes filled with silence
// One mark, looked for between `from` and `from+secs`: when the white square appears in the top-left corner and when the
// beep starts (both in seconds on the file's clock, -1 when not found).
function mark(file, from, secs) {
  const FPS = 120;
  const v = raw(['-i', file, '-an', '-vf', `fps=${FPS}:start_time=0,trim=start=${from}:duration=${secs},setpts=PTS-STARTPTS,crop=64:64:0:0,scale=4:4,format=gray`, '-f', 'rawvideo', '-']);
  let flash = -1;
  for (let i = 0; i + 16 <= v.length; i += 16) { let s = 0; for (let k = 0; k < 16; k++) s += v[i + k]; if (s / 16 > 170) { flash = from + i / 16 / FPS; break; } }
  const a = raw(['-i', file, '-vn', '-af', `${AUDIO},atrim=start=${from}:duration=${secs},asetpts=PTS-STARTPTS`, '-ac', '1', '-f', 's16le', '-']), step = 16, dt = step / 16000;   // 1 ms
  let beep = -1; const loud = [];
  for (let i = 0; i + step * 2 <= a.length; i += step * 2) { let s = 0; for (let k = 0; k < step; k++) { const x = a.readInt16LE(i + k * 2); s += x * x; } loud.push(Math.sqrt(s / step)); }
  // the beep is a loud square wave that lasts tens of milliseconds: far louder, for longer, than anything in the game's mix
  for (let i = 0; i + 30 < loud.length; i++) if (loud[i] > 9000 && loud[i + 10] > 9000 && loud[i + 20] > 9000 && loud[i + 30] > 7000) { beep = from + i * dt; break; }
  return { flash, beep };
}
// Lines sound up with picture, cuts the marks off and writes an MP4.
// clap = {lead, at, len, tail, tailAt} as the recorder reports it. Returns {ok, file, startMs, endMs, seconds, why}:
// startMs and endMs are how late the sound was at each end (negative = early) before the correction.
function finish(input, output, clap) {
  if (!has()) return { ok: false, why: 'ffmpeg is not installed' };
  const dur = duration(input), m1 = mark(input, 0, 3.6), m2 = mark(input, Math.max(0, dur - 1.5), 1.6);
  if (m1.flash < 0 || m1.beep < 0) return { ok: false, why: 'the opening sync mark was not found (' + (m1.flash < 0 ? 'no square' : 'no beep') + ')' };
  if (m2.flash < 0 || m2.beep < 0) return { ok: false, why: 'the closing sync mark was not found (' + (m2.flash < 0 ? 'no square' : 'no beep') + ')' };
  const o1 = m1.beep - m1.flash, o2 = m2.beep - m2.flash, startMs = Math.round(o1 * 1000), endMs = Math.round(o2 * 1000);
  if (Math.abs(o1) > 1.5) return { ok: false, startMs, endMs, why: 'sound and picture are ' + o1.toFixed(2) + ' s apart, too far to trust' };
  if (Math.abs(o1 - o2) > .09) return { ok: false, startMs, endMs, why: 'the sound drifts: ' + startMs + ' ms off at the start, ' + endMs + ' ms at the end' };
  const off = (o1 + o2) / 2;
  const v0 = m1.flash + (clap.lead - clap.at) + .02, v1 = m2.flash - clap.tailAt - .03, a0 = v0 + off, a1 = v1 + off;   // the part to keep, on each clock
  if (!(v1 - v0 > 3)) return { ok: false, startMs, endMs, why: 'nothing is left between the two marks' };
  const audio = a0 >= 0 ? `atrim=start=${a0.toFixed(4)}:end=${a1.toFixed(4)},asetpts=PTS-STARTPTS` : `atrim=end=${a1.toFixed(4)},asetpts=PTS-STARTPTS,adelay=${Math.round(-a0 * 1000)}:all=1`;
  const r = cp.spawnSync(FF, ['-v', 'error', '-y', '-i', input, '-filter_complex',
    `[0:v]fps=60:start_time=0,trim=start=${v0.toFixed(4)}:end=${v1.toFixed(4)},setpts=PTS-STARTPTS[v];[0:a]aresample=48000:async=1:first_pts=0,${audio}[a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', output], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0 || !fs.existsSync(output)) return { ok: false, startMs, endMs, why: 'ffmpeg failed: ' + String(r.stderr || '').trim().split('\n').slice(-1)[0] };
  // nothing of either mark may be left in the result
  const left = [mark(output, 0, 1), mark(output, Math.max(0, duration(output) - 1), 1.1)];
  if (left.some(m => m.flash >= 0 || m.beep >= 0)) return { ok: false, startMs, endMs, why: 'part of a sync mark is still in the video' };
  return { ok: true, file: output, startMs, endMs, seconds: Math.round(duration(output)) };
}
module.exports = { has, duration, mark, finish };
