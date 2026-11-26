// Renders the channel art with headless Chrome: the page writes its canvas as a data address into the document,
// Chrome prints the document, and this saves the picture.  Usage: node tools/channel-art/render.js avatar|banner   (writes art/duel-king-avatar.png or art/duel-king-banner.jpg)
const cp = require('child_process'), fs = require('fs'), path = require('path');
const which = process.argv[2] || 'avatar';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = 'file:///' + path.join(__dirname, 'art.html').replace(/\\/g, '/') + '?w=' + which + (process.argv[3] ? '&' + process.argv[3] : '');
const prof = path.join(require('os').tmpdir(), 'duel-king-art-profile');
const out = cp.spawnSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--user-data-dir=' + prof, '--virtual-time-budget=15000', '--dump-dom', url], { maxBuffer: 1 << 28, encoding: 'utf8' });
const dom = out.stdout || '';
const done = /data-done="([^"]*)"/.exec(dom);
console.log('page says:', done ? JSON.stringify(done[1]) : 'not finished', '| stderr:', (out.stderr || '').split('\n').filter(l => /ERR|error/i.test(l)).slice(0, 3).join(' / '));
const m = /<pre id="png">data:image\/(png|jpeg);base64,([^<]+)<\/pre>/.exec(dom);
if (!m) { console.log('no picture in the page'); process.exit(1); }
const file = path.join(__dirname, '..', '..', 'art', 'duel-king-' + which + (m[1] === 'png' ? '.png' : '.jpg'));
fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
console.log('saved', file, Math.round(fs.statSync(file).size / 1024) + ' KB');
