// Shared by the tests: returns Duel King's scripts as one string, in the order index.html loads them.
const fs = require('fs');
const R = 'C:/repos/balls/';
function files() {
  const html = fs.readFileSync(R + 'index.html', 'utf8');
  return [...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m => m[1]);
}
// kind: 'all' (everything the page loads) or 'sim' (only the files that are pure simulation: brawl-sim.js and class packs)
function load(kind) {
  let list = files();
  // BRAWL_EXTRA=brawl-pack3.js,brawl-boons.js loads files index.html does not list yet, right after the last class pack
  const extra = (process.env.BRAWL_EXTRA || '').split(',').filter(f => f && !list.includes(f));
  if (extra.length) { let at = 0; list.forEach((f, i) => { if (/^brawl-(sim|pack\d*|boons\d*)\.js$/.test(f)) at = i + 1; }); list.splice(at, 0, ...extra); }
  if (kind === 'sim') list = list.filter(f => f === 'brawl-sim.js' || /^brawl-pack\d*\.js$/.test(f));
  // tests never talk to the real database: the shared ladder's address is blanked here
  return list.map(f => fs.readFileSync(R + f, 'utf8')).join('\n;\n').replace(/const NET=\{url:'[^']*'/, "const NET={url:''");
}
module.exports = { load, files, R };
