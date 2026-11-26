// Builds the sound picker: a page (sounds.html) where each fight sound has several candidates to listen to and choose
// between. Claude cannot hear, so the sounds in the game were chosen by name; this is how a person chooses them by ear.
//
//   node tools/sound-picker.js            build sounds.html and the candidate clips in sfx/pick/
//   node tools/sound-picker.js --read [YYYY-MM-DD]   print the picks people have sent (they arrive in the play log)
//
// Sources: Kenney's packs and four packs from opengameart.org, all public domain (CC0), kept in the sound library on
// this PC (see each pack's LICENCE-NOTE.txt). Only CC0 sounds may be listed here, because the clips are published.
// After the picks are in: put the chosen files into GROUPS in tools/sfx-build.js and rebuild the game's sound file.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const LIB = process.env.BRAWL_AUDIO_LIBRARY || 'C:/repos/balls-audio-library', ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'sfx', 'pick');
const RATE = 44100;
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name === '__MACOSX') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(ogg|wav|mp3|flac)$/i.test(e.name)) out.push(p); } return out; }
const ALL = fs.existsSync(LIB) ? walk(LIB).map(f => ({ f, rel: path.relative(LIB, f).split(path.sep).join('/'), base: path.basename(f).replace(/\.\w+$/, '') })) : [];
// files of one pack (a folder name anywhere in the path) whose name starts with one of the prefixes, in name order
function pick(pack, prefixes, max) {
  const out = [];
  for (const pre of [].concat(prefixes)) for (const x of ALL.filter(x => x.rel.split('/').includes(pack) && x.base.toLowerCase().startsWith(pre.toLowerCase())).sort((a, b) => a.base.localeCompare(b.base, 'en', { numeric: true }))) if (!out.includes(x)) out.push(x);
  return out.slice(0, max || 4);
}
const K = (pack, pre, max) => pick(pack, pre, max), O = (pack, pre, max) => pick(pack, pre, max);
// Each sound of a fight: what it is, when it is heard, how long a clip may run, and the candidates. The first candidate
// is what the game plays now. A candidate is a small family of takes; the game picks one at random each time.
const ROLES = [
  { id: 'blade', name: 'Blade hit', when: 'A sword or knife lands (Knight, Ninja, Samurai, Pirate, Vampire).', cap: .5, now: 'slash', opts: [
    ['Knife slice', K('rpg-audio', ['knifeSlice'], 2)], ['Sword cuts, set 1', O('swords-starninjas', ['sword.1', 'sword.2', 'sword.3', 'sword.4', 'sword.5'], 5)], ['Sword cuts, set 2', O('swords-starninjas', ['sword.6', 'sword.7', 'sword.8', 'sword.9', 'sword.10'], 5)],
    ['Blade ring', O('rpg-rubberduck', ['blade_'], 3)], ['Swing through air', O('rpg-artisticdude', ['swing'], 3)]] },
  { id: 'blunt', name: 'Blunt hit', when: 'A body or fist lands (Urchin, Jester, most fighters without a weapon).', cap: .45, now: 'punch', opts: [
    ['Punch', K('impact-sounds', ['impactPunch_medium'], 4)], ['Small impact', O('combat-150', ['SmallImpact'], 3)], ['Impact', O('combat-150', ['Impact_0'], 2)], ['Plate knock', K('impact-sounds', ['impactPlate_medium'], 4)], ['Soft thud', K('impact-sounds', ['impactSoft_heavy'], 4)]] },
  { id: 'heavy', name: 'Heavy hit', when: 'A big, slow blow lands (Ogre, Juggernaut).', cap: .6, now: 'heavy', opts: [
    ['Blast impact', O('combat-150', ['BlastImpact'], 3)], ['Heavy punch', K('impact-sounds', ['impactPunch_heavy'], 4)], ['Heavy plate', K('impact-sounds', ['impactPlate_heavy'], 4)], ['Stones', O('rpg-rubberduck', ['stones_'], 4)], ['Earth strike', O('combat-150', ['Earth Spell Impact'], 3)]] },
  { id: 'metal', name: 'Metal on metal', when: 'A hit on armour, a parry, and the ring on top of a critical hit.', cap: .5, now: 'metal', opts: [
    ['Sword clash, set 1', O('swords-starninjas', ['sword_clash.1', 'sword_clash.2', 'sword_clash.3', 'sword_clash.4', 'sword_clash.5'], 5)], ['Metal knock', K('impact-sounds', ['impactMetal_medium'], 4)], ['Sword clash, set 2', O('swords-starninjas', ['sword_clash.6', 'sword_clash.7', 'sword_clash.8', 'sword_clash.9', 'sword_clash.10'], 5)],
    ['Metal ring', O('rpg-rubberduck', ['metal_'], 3)], ['Chain', O('rpg-rubberduck', ['chain_'], 3)], ['Heavy metal', K('impact-sounds', ['impactMetal_heavy'], 4)]] },
  { id: 'light', name: 'Small hit', when: 'Lots of little hits in a row: poison, thorns, small shots.', cap: .2, now: 'tick', opts: [
    ['Light tap', K('impact-sounds', ['impactGeneric_light'], 4)], ['Tin tap', K('impact-sounds', ['impactTin_medium'], 4)], ['Wood tap', K('impact-sounds', ['impactWood_light'], 4)], ['Pluck', K('interface-sounds', ['pluck'], 2)], ['Tick', K('interface-sounds', ['tick'], 3)]] },
  { id: 'wall', name: 'Wall bounce', when: 'A fighter bounces off a wall. Heard constantly, so it should be quiet and easy on the ear.', cap: .25, now: 'soft', silent: true, opts: [
    ['Soft bump', K('impact-sounds', ['impactSoft_medium'], 4)], ['Plank knock', K('impact-sounds', ['impactPlank_medium'], 4)], ['Wood knock', O('rpg-rubberduck', ['wood_'], 4)], ['Stone knock', O('rpg-rubberduck', ['item_stone'], 4)], ['Step on wood', K('impact-sounds', ['footstep_wood'], 4)]] },
  { id: 'block', name: 'Shield block', when: 'A shield stops a hit completely.', cap: .7, now: 'bell', opts: [
    ['Bell', K('impact-sounds', ['impactBell_heavy_002', 'impactBell_heavy_003', 'impactBell_heavy_004'], 3)], ['Sword clash', O('swords-starninjas', ['sword_clash.6', 'sword_clash.7', 'sword_clash.8'], 3)], ['Heavy metal', K('impact-sounds', ['impactMetal_heavy'], 4)], ['Heavy plate', K('impact-sounds', ['impactPlate_heavy'], 4)], ['Force field', K('sci-fi-sounds', ['forceField'], 3)]] },
  { id: 'gun', name: 'Gunner’s gun', when: 'The Gunner fires. Fast and often.', cap: .35, now: 'gun', opts: [
    ['Crack', K('sci-fi-sounds', ['explosionCrunch_000', 'explosionCrunch_003', 'explosionCrunch_001'], 3)], ['Shot', O('combat-150', ['Shoot_0'], 4)], ['Short shot', O('combat-150', ['ShootShort'], 1)], ['Laser pistol', O('combat-150', ['Laser Pistol'], 4)], ['Retro laser', K('sci-fi-sounds', ['laserRetro'], 4)]] },
  { id: 'revolver', name: 'Cowboy’s revolver', when: 'The Cowboy fires. Should not sound like the Gunner.', cap: .45, now: 'revolver', opts: [
    ['Heavy shot', O('combat-150', ['HeavyShot'], 3)], ['Shot', O('combat-150', ['Shoot_0'], 4)], ['Crack', K('sci-fi-sounds', ['explosionCrunch_000', 'explosionCrunch_003', 'explosionCrunch_001'], 3)], ['Blast', O('combat-150', ['BlastImpact'], 3)], ['Retro explosion', O('combat-150', ['Retro Explosion Short'], 2)]] },
  { id: 'rail', name: 'Railgun', when: 'The Railgun fires its charged shot. Rare and strong.', cap: .5, now: 'rail', opts: [
    ['Zap launcher', O('combat-150', ['ZapLauncher'], 3)], ['Laser rifle', O('combat-150', ['Laser Rifle'], 4)], ['Laser beam', O('combat-150', ['Laser Beam'], 4)], ['Heavy zap', O('combat-150', ['HeavyZap', 'PowerZap'], 2)], ['Pulse', O('combat-150', ['EMP'], 3)], ['Large laser', K('sci-fi-sounds', ['laserLarge'], 4)]] },
  { id: 'bow', name: 'Bow', when: 'An arrow leaves the string (Archer). Soft, short and airy.', cap: .3, now: 'loose', opts: [
    ['Cloth snap', K('rpg-audio', ['cloth2', 'cloth3', 'cloth4'], 3)], ['Swing through air', O('rpg-artisticdude', ['swing'], 3)], ['Card slide', K('casino-audio', ['card-slide'], 4)], ['Leather', K('rpg-audio', ['handleSmallLeather'], 2)], ['Belt', K('rpg-audio', ['clothBelt'], 2)]] },
  { id: 'zap', name: 'Magic and lightning', when: 'A spell is cast or lightning strikes (Wizard, Tesla, Storm Cloud).', cap: .5, now: 'zap', opts: [
    ['Small laser', K('sci-fi-sounds', ['laserSmall'], 3)], ['Zap', O('combat-150', ['ElectroZap', 'EnergyZap', 'HeavyZap', 'PowerZap'], 4)], ['Lightning strike', O('combat-150', ['Lightning Spell Impact'], 4)], ['Spell', O('rpg-rubberduck', ['spell_0'], 2)], ['Electric crackle', O('combat-150', ['Retro Electric Short', 'Retro Electric 0', 'Retro Electric 2'], 4)], ['Phase jump', K('digital-audio', ['phaseJump'], 4)]] },
  { id: 'boom', name: 'Explosion', when: 'A bomb, mine or blast goes off (Sapper, Bomb, Volcano).', cap: 1, now: 'boom', opts: [
    ['Crunch', K('sci-fi-sounds', ['explosionCrunch'], 3)], ['Blast', O('combat-150', ['BlastImpact'], 3)], ['Retro explosion', O('combat-150', ['Retro Explosion Short'], 2)], ['Gravity bomb', O('combat-150', ['GravityBomb'], 3)], ['Fire burst', O('combat-150', ['Fire Spell Impact'], 4)], ['Fire spell', O('rpg-rubberduck', ['spell_fire'], 4)]] },
  { id: 'ko', name: 'Knockout', when: 'A fighter falls: the end of a fight. Once per fight, so it can be big.', cap: 1.3, now: 'rumble', opts: [
    ['Electric explosion', O('combat-150', ['ElectricExplosion'], 1)], ['Low rumble', K('sci-fi-sounds', ['lowFrequency_explosion_001'], 1)], ['Low boom', O('combat-150', ['low_frequency_explosion'], 2)], ['Long explosion', O('combat-150', ['Retro Explosion Long'], 1)], ['Break', O('combat-150', ['Break_0'], 2)], ['Glass break', O('combat-150', ['BreakGlass'], 3)]] },
  { id: 'heal', name: 'Heal', when: 'A fighter gets health back. Silent in the game today.', cap: .6, now: '', silent: true, opts: [
    ['Healing, set 1', O('combat-150', ['Healing Spell Impact 1', 'Healing Spell Impact 2', 'Healing Spell Impact 3'], 3)], ['Healing, set 2', O('combat-150', ['Healing Spell Impact 4', 'Healing Spell Impact 5', 'Healing Spell Impact 6'], 3)], ['Power up', K('digital-audio', ['powerUp'], 3)], ['Soft chime', K('interface-sounds', ['confirmation'], 3)]] },
];
function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg could not read ' + file);
  const b = r.stdout, n = b.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2) / 32768;
  return out;
}
// trim silence, cap the length, bring every clip to the same peak, fade the ends (the same treatment the game's sounds get)
function tidy(x, cap) {
  let a = 0, b = x.length - 1; const th = 0.006;
  while (a < b && Math.abs(x[a]) < th) a++;
  while (b > a && Math.abs(x[b]) < th) b--;
  a = Math.max(0, a - 40); b = Math.min(x.length - 1, b + 400);
  const y = x.slice(a, Math.min(b + 1, a + Math.round(cap * RATE)));
  let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? 0.85 / peak : 1, cut = y.length === Math.round(cap * RATE), fin = Math.min(y.length, Math.round(.002 * RATE)), fout = Math.min(y.length, Math.round((cut ? .09 : .02) * RATE));
  for (let i = 0; i < y.length; i++) { let g = k; if (i < fin) g *= i / fin; if (i >= y.length - fout) g *= (y.length - 1 - i) / fout; y[i] *= g; }
  return y;
}
function mp3(y, file) {
  const buf = Buffer.alloc(y.length * 2);
  for (let i = 0; i < y.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), i * 2);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', file], { input: buf });
  if (r.status !== 0) throw new Error('ffmpeg could not write ' + file);
}
async function read() {
  const day = process.argv[process.argv.indexOf('--read') + 1] && /^\d{4}-\d\d-\d\d$/.test(process.argv[process.argv.indexOf('--read') + 1]) ? process.argv[process.argv.indexOf('--read') + 1] : new Date().toISOString().slice(0, 10);
  const m = /const NET=\{url:'([^']*)'/.exec(fs.readFileSync(path.join(ROOT, 'brawl-net.js'), 'utf8'));
  const j = await (await fetch(m[1] + '/log/' + day + '.json')).json();
  let n = 0;
  for (const pid of Object.keys(j || {})) for (const id of Object.keys(j[pid])) { const e = j[pid][id]; if (e && e.e === 'sndpick') { n++; console.log(new Date(e.t).toISOString() + ' player ' + pid.slice(0, 6) + ': ' + e.d); } }
  console.log(n ? n + ' set' + (n > 1 ? 's' : '') + ' of picks on ' + day : 'no picks sent on ' + day + ' (UTC)');
}
function build() {
  if (!ALL.length) throw new Error('the sound library was not found at ' + LIB);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const data = []; let clips = 0, bytes = 0;
  for (const R of ROLES) {
    const opts = [];
    R.opts.forEach(([label, files], oi) => {
      if (!files.length) { console.log('  (no files found for ' + R.id + ' / ' + label + ', left out)'); return; }
      const urls = files.map((x, ti) => { const name = R.id + '-' + oi + '-' + ti + '.mp3'; mp3(tidy(decode(x.f), R.cap), path.join(OUT, name)); clips++; bytes += fs.statSync(path.join(OUT, name)).size; return name; });
      opts.push({ k: String.fromCharCode(65 + opts.length), label, now: oi === 0 && !!R.now, src: files[0].rel.split('/').slice(0, 2).join('/'), files: urls });
    });
    data.push({ id: R.id, name: R.name, when: R.when, silent: !!R.silent, nowSilent: !R.now, opts });
  }
  fs.writeFileSync(path.join(ROOT, 'sounds.html'), PAGE.replace('/*DATA*/', JSON.stringify(data)));
  console.log('sounds.html written: ' + data.length + ' sounds, ' + data.reduce((a, r) => a + r.opts.length, 0) + ' candidates, ' + clips + ' clips, ' + Math.round(bytes / 1024) + ' KB in sfx/pick/');
}
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0d1216">
<title>Duel King: choose the fight sounds</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&display=swap">
<style>
:root{color-scheme:dark;--night:#0d1216;--gold:#c9a45c;--gold-lo:#7a5d2b;--ivory:#f3ead6;--crimson:#8f2732;--parch:#e6d6b0;--parch-lo:#c9b487;--ink:#231a12;--ink-2:#5a4630;--display:'Cinzel','Times New Roman',serif;--text:'Cormorant Garamond',Georgia,serif}
*{box-sizing:border-box;touch-action:manipulation}
body{margin:0 auto;max-width:560px;min-height:100dvh;background:var(--night);color:var(--ivory);font:500 18px/1.3 var(--text);padding:max(18px,env(safe-area-inset-top)) 14px max(30px,env(safe-area-inset-bottom))}
h1{margin:6px 0 4px;text-align:center;font:900 24px/1.1 var(--display);letter-spacing:.1em;text-transform:uppercase}
.lead{margin:0 0 14px;text-align:center;font-style:italic;color:#b9c1c4;text-wrap:balance}
section{background:linear-gradient(90deg,var(--parch-lo),var(--parch) 7%,var(--parch) 93%,var(--parch-lo));color:var(--ink);padding:13px 12px 10px;margin:0 0 14px;border-top:7px solid #efe0bb;border-bottom:7px solid #a08a5c;box-shadow:0 6px 0 rgba(0,0,0,.4)}
h2{margin:0;font:700 18px/1.1 var(--display);letter-spacing:.08em;text-transform:uppercase;text-align:center}
.when{margin:3px 0 9px;text-align:center;font-style:italic;color:var(--ink-2);text-wrap:balance}
.opt{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:6px 4px;border-top:1px solid rgba(60,40,15,.25)}
.opt.on{background:rgba(143,39,50,.14);box-shadow:inset 4px 0 0 var(--crimson)}
.k{font:900 18px/1 var(--display);width:26px;text-align:center}
.what{display:flex;flex-direction:column;min-width:0}
.what b{font:700 14.5px/1.15 var(--display);letter-spacing:.03em}
.what small{font:italic 500 14px/1.1 var(--text);color:var(--ink-2)}
button{font:700 12px/1 var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--ivory);background:linear-gradient(#3a444c,#232a30);border:2px solid var(--gold);border-radius:4px;min-height:44px;padding:0 11px;box-shadow:0 3px 0 rgba(0,0,0,.4)}
button:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
button.use{background:none;color:var(--ink);border-color:var(--gold-lo);box-shadow:none}
.on button.use{background:linear-gradient(#a93543,#77202a);color:var(--ivory);border-color:var(--gold)}
textarea{width:100%;min-height:86px;font:500 17px/1.3 var(--text);color:var(--ink);background:#f3e7c8;border:1px solid var(--gold-lo);border-radius:3px;padding:8px}
#send{width:100%;min-height:54px;font-size:16px;background:linear-gradient(#a93543,#77202a)}
#said{margin:10px 0 0;text-align:center;font-style:italic;color:var(--ink-2);min-height:1.3em;overflow-wrap:anywhere}
#left{position:sticky;top:0;z-index:3;margin:0 -14px 12px;padding:8px 14px;background:#0d1216ee;text-align:center;font:700 12px/1 var(--display);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
</style>
</head>
<body>
<h1>Fight sounds</h1>
<p class="lead">Round two. Your first picks are in the game and marked "in the game now". The guns each have their own row. For each sound, listen to the candidates and tap Use on the one you like. "Play" plays it once; "×5" plays it five times fast, the way it comes in a fight. Turn your ringer on.</p>
<p id="left"></p>
<div id="list"></div>
<section>
  <h2>Anything else</h2>
  <p class="when">Too loud, too quiet, too many at once, something missing: say it here.</p>
  <textarea id="note" maxlength="700" placeholder="Optional"></textarea>
  <p style="margin:10px 0 0"><button type="button" id="send">Send my picks</button></p>
  <p id="said"></p>
</section>
<script>
const ROLES=/*DATA*/;
const DB='https://ball-brawl-9b1bb-default-rtdb.firebaseio.com';
let picks={};try{picks=JSON.parse(localStorage.getItem('duelking.sndpick2'))||{}}catch(e){}
let ac=null;const bufs={};
function ctx(){if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state!=='running')ac.resume();return ac}
async function load(url){
  if(!bufs[url])bufs[url]=fetch('sfx/pick/'+url).then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>ctx().decodeAudioData(b,ok,no)));
  return bufs[url];
}
function fire(buf,when,rate){const a=ctx(),s=a.createBufferSource(),g=a.createGain();s.buffer=buf;s.playbackRate.value=rate;g.gain.value=.8;s.connect(g);g.connect(a.destination);s.start(when)}
// once, or five times fast with a different take and a little pitch drift each time, as the game does
async function play(o,times){
  ctx();
  const all=await Promise.all(o.files.map(load)),t0=ac.currentTime+.03;
  for(let i=0;i<times;i++)fire(all[(Math.random()*all.length)|0],t0+i*.16,times>1?.94+Math.random()*.12:1);
}
function render(){
  const L=document.getElementById('list');L.innerHTML='';
  for(const R of ROLES){
    const s=document.createElement('section');
    s.innerHTML='<h2>'+R.name+'</h2><p class="when">'+R.when+'</p>';
    const rows=R.opts.map(o=>({o,k:o.k,label:o.label,sub:o.now?'in the game now':''}));
    if(R.silent)rows.push({o:null,k:'–',label:'No sound',sub:R.nowSilent?'as it is now':''});
    for(const r of rows){
      const d=document.createElement('div'),key=r.o?r.k:'none';
      d.className='opt'+(picks[R.id]===key?' on':'');
      d.innerHTML='<span class="k">'+r.k+'</span><span class="what"><b>'+r.label+'</b><small>'+r.sub+'</small></span>';
      const box=document.createElement('span');box.style.cssText='display:flex;gap:6px';
      if(r.o){const p=document.createElement('button');p.type='button';p.textContent='Play';p.onclick=()=>play(r.o,1);const q=document.createElement('button');q.type='button';q.textContent='×5';q.onclick=()=>play(r.o,5);box.append(p,q)}
      const u=document.createElement('button');u.type='button';u.className='use';u.textContent=picks[R.id]===key?'Chosen':'Use';
      u.onclick=()=>{picks[R.id]=key;try{localStorage.setItem('duelking.sndpick2',JSON.stringify(picks))}catch(e){}render()};
      d.append(box,u);s.append(d);
    }
    L.append(s);
  }
  const n=ROLES.filter(R=>picks[R.id]).length;
  document.getElementById('left').textContent=n+' of '+ROLES.length+' chosen';
}
document.getElementById('send').onclick=async()=>{
  const said=document.getElementById('said'),note=document.getElementById('note').value.trim().slice(0,700);
  const text=ROLES.map(R=>R.id+':'+(picks[R.id]||'?')).join(' ');
  said.textContent='Sending…';
  try{
    let pid='';try{pid=localStorage.getItem('brawl.pid')||''}catch(e){}
    if(!/^[a-z0-9]{16}$/.test(pid)){pid='';for(let i=0;i<16;i++)pid+='abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random()*36)|0]}
    const d=new Date(),day=d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
    const r=await fetch(DB+'/log/'+day+'/'+pid+'.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:{'.sv':'timestamp'},e:'sndpick',d:JSON.stringify({p:text,n:note})})});
    if(!r.ok)throw new Error(r.status);
    said.textContent='Sent. Your picks: '+text;
  }catch(e){said.textContent='Could not send. Copy this into the chat instead: '+text+(note?' | '+note:'')}
};
render();
</script>
</body>
</html>
`;
if (process.argv.includes('--read')) read().catch(e => { console.error(e.message || e); process.exitCode = 1; }); else build();
