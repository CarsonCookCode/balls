// One-time helper: gets the YouTube "refresh token" that lets the daily job upload videos to the Duel King channel.
// The channel owner runs it once on their own PC. Node built-ins only, no packages.
//   node tools/youtube-auth.js                       (with YT_CLIENT_ID and YT_CLIENT_SECRET set in the shell)
//   node tools/youtube-auth.js --id <client id> --secret <client secret>
// It prints a Google link. Open it, pick the channel, press Allow. Google sends the browser back to this script
// (a tiny web server on this PC only, 127.0.0.1), which trades the answer for the refresh token and prints it ONCE.
// The token is never written to disk. Store it as the GitHub secret YT_REFRESH_TOKEN and nowhere else.
//
// One-time setup in Google Cloud (https://console.cloud.google.com), needed before this script can do anything:
//   1. Create a project (any name).
//   2. APIs & Services > Library: enable "YouTube Data API v3".
//   3. OAuth consent screen (the console now calls this area "Google Auth Platform"; the status is on its
//      "Audience" page): user type External. Either add your own Google account as a test user, or publish the app.
//      IMPORTANT: while the app is in "Testing", every refresh token dies 7 days after consent, so a daily job would
//      stop within a week. Press "Publish app" so the status reads "In production" BEFORE running this script.
//      Google's review ("verification") is not needed for your own use: the consent page shows a "Google hasn't
//      verified this app" warning that you continue past, and an unverified app may be approved by at most 100 users.
//   4. Clients (or Credentials) > Create OAuth client > application type "Desktop app". Its client id and client
//      secret are the YT_CLIENT_ID and YT_CLIENT_SECRET this script and the daily job use.
//   5. Run this script. When Google asks which account or channel, choose the Duel King channel. It is a Brand
//      Account, so the chooser lists it as its own entry, separate from your personal channel. Picking the personal
//      one would send every video to the wrong channel.
// Afterwards the token keeps working until access is removed at https://myaccount.google.com/permissions, or it
// goes unused for six months, or this script has been run 100 more times for the same account (oldest tokens drop).
//
// Checked against Google's documentation on 26 Nov 2026:
//   Desktop-app clients may still use the 127.0.0.1 "loopback" redirect (it is deprecated only for Android,
//   iOS and Chrome-app clients):  https://developers.google.com/identity/protocols/oauth2/native-app
//   Tokens from an External app in "Testing" expire after 7 days; other ways a refresh token stops working:
//   https://developers.google.com/identity/protocols/oauth2#expiration
//   Testing / In production, test users, the 100-user cap for unverified apps, and a newer "Personal" user type
//   (owner's account only, no 7-day expiry, no warning page; not tried here with a Brand Account channel):
//   https://support.google.com/cloud/answer/15549945
const http = require('http'), crypto = require('crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const WAIT_MINUTES = 10;

const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined; };
const id = opt('id') || process.env.YT_CLIENT_ID, secret = opt('secret') || process.env.YT_CLIENT_SECRET;
if (!id || !secret) {
  console.error('Missing the Google OAuth client. Set YT_CLIENT_ID and YT_CLIENT_SECRET in the shell, or pass --id and --secret.\n'
    + 'They come from a "Desktop app" OAuth client in Google Cloud: see the notes at the top of this file.');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');                              // checked when Google sends the browser back
const verifier = crypto.randomBytes(32).toString('base64url');                     // PKCE: ties the code to this run
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
let redirect = '', done = false;

const page = (title, text) => '<!doctype html><meta charset="utf-8"><title>Duel King</title>'
  + '<body style="font:16px system-ui,sans-serif;background:#14110f;color:#eadfc8;text-align:center;padding-top:18vh">'
  + '<h1 style="font-size:22px">' + title + '</h1><p>' + text + '</p></body>';
const answer = (res, code, title, text, then) => {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'close' });
  res.end(page(title, text), then);
};
// Stops the local server so the script can end; the short timer drops any connection the browser still holds open.
// (No process.exit() here: calling it while a network connection is still open can crash Node 24 on Windows.)
const finish = code => { process.exitCode = code; clearTimeout(timer); server.close(); setTimeout(() => server.closeAllConnections(), 500).unref(); };

async function exchange(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST', signal: AbortSignal.timeout(30000),
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Google refused the exchange (HTTP ' + res.status + '): ' + [j.error, j.error_description].filter(Boolean).join(': '));
  if (!j.refresh_token) throw new Error('Google gave no refresh token. Remove this app at https://myaccount.google.com/permissions and run the script again.');
  return j.refresh_token;
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, redirect); } catch (_) { return answer(res, 400, 'Not accepted', 'That address makes no sense.'); }
  const q = url.searchParams;
  if (url.pathname !== '/' || (!q.has('code') && !q.has('error'))) return answer(res, 404, 'Nothing here', 'This page only receives the answer from Google.');
  if (q.get('state') !== state) return answer(res, 400, 'Not accepted', 'This answer does not belong to the sign-in that is waiting. Use the link printed in the terminal.');
  if (done) return answer(res, 200, 'Already done', 'You can close this tab.');
  done = true;
  if (q.has('error')) {
    console.error('\nGoogle did not grant access: ' + q.get('error').replace(/[^\w.-]/g, '').slice(0, 60));
    return answer(res, 200, 'Not connected', 'Google did not grant access. You can close this tab and run the script again.', () => finish(1));
  }
  try {
    const token = await exchange(q.get('code'));
    console.log('\nRefresh token (shown once, not saved anywhere):\n\n' + token + '\n');
    console.log('Store it as the GitHub secret YT_REFRESH_TOKEN (repo Settings > Secrets and variables > Actions) and nowhere else.');
    answer(res, 200, 'Connected', 'Duel King may now upload videos to this channel. You can close this tab and go back to the terminal.', () => finish(0));
  } catch (e) {
    console.error('\n' + e.message);
    answer(res, 200, 'Something went wrong', 'See the terminal for the reason. You can close this tab.', () => finish(1));
  }
});

const timer = setTimeout(() => { console.error('\nGave up after ' + WAIT_MINUTES + ' minutes without an answer from Google. Run the script again.'); finish(1); }, WAIT_MINUTES * 60000);
server.on('error', e => { console.error('Could not start the local web server: ' + e.message); clearTimeout(timer); process.exitCode = 1; });
server.listen(0, '127.0.0.1', () => {
  redirect = 'http://127.0.0.1:' + server.address().port;
  const link = AUTH_URL + '?' + new URLSearchParams({
    client_id: id, redirect_uri: redirect, response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
  });
  console.log('Open this link in your browser, choose the Duel King channel, and press Allow:\n\n' + link + '\n');
  console.log('Waiting for Google to send the browser back to ' + redirect + ' (Ctrl+C to stop)...');
});
