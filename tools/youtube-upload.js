// Uploads one video file to YouTube (Data API v3, resumable upload). Node built-ins only, no packages.
//   node tools/youtube-upload.js --file out/duel.webm --meta out/meta.json [--privacy private|unlisted|public] [--dry]
//
// --meta is the file the recorder (tools/duel-video.js) writes next to the video:
//   {"ok":true,"day":"2026-11-26","title":"...","description":"...","tags":["..."],"file":"duel.webm"}
// If "ok" is not true there is nothing to post: the "reason" is printed and the script ends without an error.
//
// Sign-in comes from three environment variables (GitHub secrets in the daily job, never written in a file):
//   YT_CLIENT_ID, YT_CLIENT_SECRET   the Google "Desktop app" OAuth client
//   YT_REFRESH_TOKEN                 printed once by tools/youtube-auth.js
// Privacy: private unless the environment variable YT_PRIVACY says otherwise; --privacy beats both.
// --dry shows what would be sent (title, privacy, file size) and makes no network call, so it needs no sign-in.
//
// On success it prints the video id and link, and inside GitHub Actions also records video_id as a step output.
// It then reads back the privacy YouTube actually gave the video and warns if that is not what was asked.
// (Until 2 Nov 2026 YouTube forced uploads from API projects that had not passed its audit to private;
// its change log says that rule is gone, but the script reports what really happened rather than trust it.)
// Text limits are YouTube's: title 100 characters, description 5000 bytes, tags 500 characters in total, no < or >.
//   https://developers.google.com/youtube/v3/docs/videos/insert
//   https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
//   https://developers.google.com/youtube/v3/revision_history   (the 2 Nov 2026 entry on private uploads)
// Not yet run against the real YouTube: written and tested against a pretend server before any sign-in existed.
const fs = require('fs'), path = require('path');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const TYPES = { '.webm': 'video/webm', '.mp4': 'video/mp4' };
const PRIVACY = ['private', 'unlisted', 'public'];
const CREDS = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
const TITLE_MAX = 100, DESC_MAX = 4900, DESC_BYTES = 5000, TAGS_MAX = 480;   // tags: the limit is 500, kept a little under
const TRIES = 5;                                                             // attempts at sending the bytes
const USAGE = 'Usage: node tools/youtube-upload.js --file <video.webm|.mp4> --meta <meta.json> [--privacy private|unlisted|public] [--dry]';

const argv = process.argv.slice(2);
// Anything printed on failure passes through here, so a secret can never reach the log even if a server echoes one.
const hide = s => CREDS.reduce((t, k) => (process.env[k] || '').length >= 8 ? t.split(process.env[k]).join('***') : t, String(s));
// Failures are thrown and reported at the very end, where the exit code is set. (Calling process.exit() while a
// network connection is still open can crash Node 24 on Windows.)
class Stop extends Error {}
const die = msg => { throw new Stop(msg); };
const opt = name => {
  const i = argv.indexOf('--' + name);
  if (i < 0) return undefined;
  if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) die('--' + name + ' needs a value.\n' + USAGE);
  return argv[i + 1];
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s == null ? '' : s).replace(/[<>]/g, '');   // YouTube rejects < and >

// Shortens text to at most maxLen characters and maxBytes bytes, never cutting a character (an emoji, say) in half.
function cut(s, maxLen, maxBytes) {
  let out = '', bytes = 0;
  for (const ch of s) {
    const b = Buffer.byteLength(ch);
    if (out.length + ch.length > maxLen || bytes + b > maxBytes) break;
    out += ch; bytes += b;
  }
  return out;
}

// Keeps as many tags as fit YouTube's total: commas between tags count, and a tag with a space costs two extra (quotes).
function fitTags(list) {
  const out = []; let used = 0;
  for (const raw of Array.isArray(list) ? list : []) {
    const t = clean(raw).replace(/[,"]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || out.some(o => o.toLowerCase() === t.toLowerCase())) continue;
    const cost = t.length + (t.includes(' ') ? 2 : 0) + (out.length ? 1 : 0);
    if (used + cost > TAGS_MAX) continue;
    out.push(t); used += cost;
  }
  return out;
}

// Turns a failed answer into one line: the status and Google's own error message.
async function problem(res) {
  const text = await res.text().catch(() => '');
  let msg = text.replace(/\s+/g, ' ').slice(0, 300);
  try {
    const j = JSON.parse(text), e = j.error;
    if (e && typeof e === 'object') msg = [e.message, e.errors && e.errors[0] && e.errors[0].reason && '(' + e.errors[0].reason + ')'].filter(Boolean).join(' ');
    else if (e) msg = [e, j.error_description].filter(Boolean).join(': ');
  } catch (_) { /* not JSON: keep the raw text */ }
  return 'HTTP ' + res.status + (msg ? ': ' + msg : '');
}
const netError = e => (e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'no answer';

async function accessToken() {
  const env = process.env;
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST', signal: AbortSignal.timeout(30000),
      body: new URLSearchParams({ client_id: env.YT_CLIENT_ID, client_secret: env.YT_CLIENT_SECRET, refresh_token: env.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
    });
  } catch (e) { die('Could not reach Google to sign in: ' + netError(e)); }
  if (!res.ok) {
    const what = await problem(res);
    die('Google refused the sign-in. ' + what + (/invalid_grant/.test(what)
      ? '\nThe refresh token has expired or been revoked: run tools/youtube-auth.js again and replace the YT_REFRESH_TOKEN secret.'
      : /invalid_client/.test(what) ? '\nYT_CLIENT_ID / YT_CLIENT_SECRET do not match a Google OAuth client.' : ''));
  }
  const token = (await res.json()).access_token;
  if (!token) die('Google answered the sign-in without an access token.');
  return token;
}

// Sends the bytes to the upload address. If the connection drops or YouTube has a passing fault, asks how much
// arrived and carries on from there instead of starting over.
async function send(session, token, bytes, type) {
  const size = bytes.length, auth = { Authorization: 'Bearer ' + token };
  let from = 0;
  for (let attempt = 1; ; attempt++) {
    let res, err;
    try {
      res = await fetch(session, {
        method: 'PUT', redirect: 'manual', body: from ? bytes.subarray(from) : bytes,
        headers: Object.assign({ 'Content-Type': type }, auth, from ? { 'Content-Range': 'bytes ' + from + '-' + (size - 1) + '/' + size } : {}),
      });
    } catch (e) { err = e; }
    if (res && (res.status === 200 || res.status === 201)) return res.json();
    const passing = !res || [500, 502, 503, 504].includes(res.status);
    const what = res ? await problem(res) : netError(err);
    if (!passing || attempt >= TRIES) die('Upload failed. ' + what);
    console.log('Upload interrupted (' + hide(what) + '). Trying again, ' + attempt + ' of ' + (TRIES - 1) + '.');
    await sleep(1000 * 2 ** attempt);
    let q;
    try { q = await fetch(session, { method: 'PUT', redirect: 'manual', headers: Object.assign({ 'Content-Range': 'bytes */' + size }, auth) }); }
    catch (_) { continue; }   // could not ask: the next attempt resends from the last known point
    if (q.status === 200 || q.status === 201) return q.json();   // it had arrived whole after all
    if (q.status === 404) die('Upload failed: YouTube dropped the upload session. Run the upload again.');
    if (q.status === 308) { const m = /bytes=0-(\d+)/.exec(q.headers.get('range') || ''); from = m ? +m[1] + 1 : 0; }
  }
}

async function main() {
  const file = opt('file'), metaPath = opt('meta'), asked = opt('privacy'), dry = argv.includes('--dry');
  if (!file || !metaPath) die(USAGE);

  let meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8').replace(/^﻿/, '')); }
  catch (e) { die('Cannot read ' + metaPath + ': ' + e.message); }
  if (!meta || meta.ok !== true) {
    console.log('Nothing to post: ' + ((meta && meta.reason) || 'meta.json does not say "ok": true and gives no reason.'));
    return;
  }

  const privacy = asked || process.env.YT_PRIVACY || 'private';
  if (!PRIVACY.includes(privacy)) die('Privacy must be one of ' + PRIVACY.join(', ') + ' (got "' + privacy + '").');
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) die('Unknown video type for ' + file + ': expected .webm or .mp4.');
  let size;
  try { size = fs.statSync(file).size; } catch (e) { die('Cannot find the video file ' + file + '.'); }
  if (!size) die('The video file ' + file + ' is empty.');

  const title = cut(clean(meta.title).replace(/\s+/g, ' ').trim(), TITLE_MAX, Infinity).trim();
  const description = cut(clean(meta.description).trim(), DESC_MAX, DESC_BYTES).trim();
  const tags = fitTags(meta.tags);
  if (!title) die('meta.json has no title.');

  if (dry) {
    console.log('DRY RUN: nothing was sent to YouTube.');
    console.log('  file:        ' + file + ' (' + type + ', ' + size + ' bytes, ' + (size / 1048576).toFixed(2) + ' MB)');
    console.log('  title:       ' + title);
    console.log('  privacy:     ' + privacy);
    console.log('  description: ' + description.length + ' characters');
    console.log('  tags:        ' + (tags.join(', ') || '(none)'));
    return;
  }

  const missing = CREDS.filter(k => !process.env[k]);
  if (missing.length) die('Cannot upload: missing environment variable' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ')
    + '.\nSet them as GitHub secrets (or in this shell), or add --dry to see what would be sent.');

  const bytes = fs.readFileSync(file);
  const token = await accessToken();
  console.log('Uploading "' + title + '" (' + (size / 1048576).toFixed(2) + ' MB) as ' + privacy + '...');
  let start;
  try {
    start = await fetch(UPLOAD_URL, {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(size) },
      body: JSON.stringify({ snippet: { title, description, tags, categoryId: '20' }, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } }),
    });
  } catch (e) { die('Could not reach YouTube: ' + netError(e)); }
  if (!start.ok) die('YouTube refused the upload. ' + await problem(start));
  const session = start.headers.get('location');
  if (!session) die('YouTube accepted the request but gave no upload address.');

  const video = await send(session, token, bytes, type);
  const id = video && video.id, status = (video && video.status) || {};
  if (!/^[\w-]{5,32}$/.test(id || '')) die('YouTube answered the upload without a video id.');
  console.log('Uploaded. Video id: ' + id);
  console.log('https://youtu.be/' + id);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'video_id=' + id + '\n');

  if (status.uploadStatus && !['uploaded', 'processed'].includes(status.uploadStatus))
    warn('YouTube reports the upload as "' + status.uploadStatus + '"' + (status.rejectionReason || status.failureReason ? ' (' + (status.rejectionReason || status.failureReason) + ')' : '') + '.');
  if (status.privacyStatus === privacy) console.log('Privacy: ' + privacy + ', as asked.');
  else if (status.privacyStatus) warn('asked for "' + privacy + '" but YouTube set the video to "' + status.privacyStatus + '". '
    + 'YouTube can hold uploads private for API projects or channels it has not cleared; change it by hand in YouTube Studio.');
  else warn('YouTube did not say what privacy the video got. Asked for "' + privacy + '"; check it in YouTube Studio.');
}

// A warning that stands out in the terminal and also shows on the GitHub Actions run page.
function warn(msg) {
  console.log('WARNING: ' + msg);
  if (process.env.GITHUB_ACTIONS) console.log('::warning title=YouTube upload::' + msg.replace(/\r?\n/g, ' '));
}

main().catch(e => { console.error(hide(e instanceof Stop ? e.message : 'Unexpected error: ' + ((e && e.message) || e))); process.exitCode = 1; });
