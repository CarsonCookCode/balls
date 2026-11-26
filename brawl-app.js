// ---------- Page ----------
const BUILD='Build 41';   // bump on every deploy so the phone shows which version is loaded
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// thirty colours to choose from; a fighter that has not been given one wears its class colour (me.color = -1)
const PALETTE=ROSTER.slice(0,30).map(k=>FIGHTERS[k].color);
const okColor=c=>/^#[0-9a-fA-F]{6}$/.test(c||"");
const BOTS=14;           // house fighters on each day's ladder until real players fill it
// mode: 'make' (three taps, then a name), 'fight', 'pick' (choose an upgrade), 'over', 'board' (today's ladder), 'duel'
let browse=false;          // the fighter picker is showing every fighter instead of three
let mode='make',step=0,me={key:'blade',str:-1,size:-1,name:'',color:0,colorSet:false},deck=[],deckAt=0;
let myBest={date:'',f:{}};   // this player's best climb today with each class: {class: the fighter as it finished}
let run=null,match=null,you=-1,loud=false,choice=[],best=0,speed=1,muted=false,last=0,acc=0,overFor=0,shake=0;
let board={date:'',bots:[]},today={date:'',cleared:0},duel=null,backTo='make';
const fx={floats:[],sparks:[],rings:[],bolts:[],live:true},floats=fx.floats,sparks=fx.sparks,rings=fx.rings,bolts=fx.bolts;   // short-lived effects, shared with the video recorder
const newSeed=()=>(Math.random()*2147483647)|0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanName=s=>Names.tidy(s);                      // what may be typed; what is shown also passes Names.safe (brawl-names.js)
const shownName=()=>Names.safe(me.name,FIGHTERS[me.key].name);
const ready=()=>me.str>=0&&me.size>=0;
const myBuild=()=>makeBuild(me.key,me.str,me.size,shownName(),PALETTE[me.color]||FIGHTERS[me.key].color);
function shuffled(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
// Every upgrade is one of a few kinds, each with a colour and an icon, so a card can be read at a glance.
const KINDS={
  sig: {label:'Signature',col:'#8a6a1c',icon:'<path d="M8 1.3l2 4.2 4.6.6-3.4 3.2.9 4.6L8 11.7l-4.1 2.2.9-4.6L1.4 6.1 6 5.5z"/>'},
  atk: {label:'Attack',   col:'#8f2732',icon:'<path d="M13 1h2v2L8.4 9.6 6.4 7.6zM4.2 6.8l5 5-1.1 1.1-1.9-1.9-2.4 2.4 .4 .4L2.8 15.2 .8 13.2l1.4-1.4.4.4 2.4-2.4L3.1 7.9z"/>'},
  def: {label:'Defence',  col:'#2f4f7a',icon:'<path d="M8 1l6 2v5c0 3.5-3 6-6 7-3-1-6-3.500-6-7V3z"/>'},
  heal:{label:'Healing',  col:'#3f7a3a',icon:'<path d="M8 14.2L2.3 8.4a3.4 3.4 0 0 1 5.700-3.9 3.400 3.400 0 0 1 5.700 3.900z"/>'},
  move:{label:'Speed',    col:'#a8741a',icon:'<path d="M9.600 1L3 9h4.200L6 15l7-8.500H8.600z"/>'},
  ctl: {label:'Control',  col:'#5b3f8a',icon:'<path d="M8 1.500v13M2.400 4.750l11.200 6.500M13.600 4.750L2.400 11.250" fill="none" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"/>'},
  size:{label:'Size',     col:'#6b4a2b',icon:'<path d="M2 2h5v2H5.400l2.300 2.300-1.400 1.400L4 5.400V7H2zM14 14H9v-2h1.600L8.300 9.700l1.400-1.400L12 10.600V9h2z"/>'},
  ally:{label:'Allies',   col:'#1f6f6a',icon:'<circle cx="8" cy="10.600" r="3.200"/><circle cx="3.500" cy="6.700" r="1.600"/><circle cx="6.500" cy="3.700" r="1.600"/><circle cx="9.700" cy="3.700" r="1.600"/><circle cx="12.600" cy="6.700" r="1.600"/>'},
};
const UP_KIND={sig:'sig'};
for(const [kind,ids] of Object.entries({
  def:'tougher armor shield revive thorns dodge plating brace rebound clutch barrier static partingshot keepaway',
  heal:'vampire regen mending siphon',move:'faster adrenaline lunge',ctl:'frost concuss nova shoulder icyskin',
  size:'bulk shrink pocket colossus',ally:'hornet packlead'}))for(const id of ids.split(' '))UP_KIND[id]=kind;
const kindOf=id=>KINDS[UP_KIND[id]||'atk'];                 // anything not listed is an attack upgrade
const kindIcon=K=>`<svg viewBox="0 0 16 16" aria-hidden="true">${K.icon}</svg>`;
// a fighter's upgrades as small coloured tags; each can be tapped to read what it does (side 0 is you, 1 the rival)
let tip=null,sheet=false;     // sheet: the panel is showing your own fighter's sheet (from the boon screen or the matchup)
// With many upgrades the tags shrink to icon discs (compact), so the matchup still fits one screen; the name is a tap away.
function chips(b,side,compact){
  if(!b.ups.length)return '<span class="chip none">no upgrades</span>';
  const n={};for(const id of b.ups)n[id]=(n[id]||0)+1;
  return Object.keys(n).map(id=>{
    const K=kindOf(id),on=tip&&tip.side===side&&tip.id===id?' on':'',at=`id="chip-${side}-${id}" data-act="tip" data-side="${side}" data-key="${id}" style="--k:${K.col}"`;
    return compact?`<button type="button" class="chip dot${on}" ${at} aria-label="${upName(b,id)}">${kindIcon(K)}${n[id]>1?`<sup>${n[id]}</sup>`:''}</button>`
      :`<button type="button" class="chip${on}" ${at}>${upName(b,id)}${n[id]>1?' ×'+n[id]:''}</button>`;
  }).join('');
}
// the line under the tags: what the tapped upgrade does
// One line under the tags: what the rival's class does, or, after a tap on a tag, what that upgrade does.
function tipLine(a,b){
  const o=tip&&(tip.side?b:a);
  if(!o||!o.ups.includes(tip.id))return `<p class="ps what"><b>${FIGHTERS[b.key].name}.</b> ${FIGHTERS[b.key].desc}</p>`;
  const K=kindOf(tip.id),n=o.ups.filter(x=>x===tip.id).length;
  return `<p class="ps tipline" id="tipLine" style="--k:${K.col}"><b>${upName(o,tip.id)}${n>1?' ×'+n:''}</b><em>${K.label}</em>${upText(o,tip.id)}${n>1?' (each)':''}</p>`;
}
function summary(b){
  if(!b.ups.length)return 'no upgrades yet';
  const n={};for(const id of b.ups)n[id]=(n[id]||0)+1;
  return Object.keys(n).map(id=>upName(b,id)+(n[id]>1?' ×'+n[id]:'')).join(', ');
}

// ----- today's ladder -----
// Until entries are stored on a server, the ladder is filled with house fighters. Each one really plays a climb,
// seeded by the date, so the board is the same all day and changes at midnight.
let pinnedDay='';
function dayKey(){if(pinnedDay)return pinnedDay;const d=new Date();return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0')}
// the play log (see Net.log): every fight, boon and tap, so play can be reviewed afterwards
const log=(ev,d)=>{try{Net.log(dayKey(),ev,d)}catch(e){}};
const logBuild=b=>({k:b.key,s:b.str,z:b.size,u:b.ups,hp:Math.round(effHp(b)),d:+effDmg(b).toFixed(2)});
function daySeed(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
const boardReady=()=>board.bots.length>=BOTS;
function addBot(){
  const i=board.bots.length,rnd=mulberry32(daySeed(board.date)+i*7919),b=makeBuild(ROSTER[(rnd()*ROSTER.length)|0],(rnd()*3)|0,(rnd()*3)|0);
  let rung=1;
  while(rung<40&&quickMatch(b,rival(rung,rnd),(rnd()*2147483647)|0)===0){const o=offers(b,rnd,3);if(o.length)addUpgrade(b,o[(rnd()*o.length)|0]);rung++}
  board.bots.push({key:b.key,str:b.str,size:b.size,ups:b.ups,cleared:rung-1});
  if(boardReady()){
    try{localStorage.setItem('brawl.board2',JSON.stringify(board))}catch(e){}
    if(mode==='make'||mode==='over'||mode==='board')render();
  }
}
function rebuild(e){
  const b=makeBuild(e.key,e.str,e.size,e.name,e.color);
  for(const id of e.ups)if(UPGRADES[id]&&canTake(b,id))addUpgrade(b,id);
  return b;
}
// One row per fighter: every house fighter, and each player's best climb with each class they have tried today.
// `who` says whose fighter it is, because the daily duel is between two different players.
function standings(){
  const rows=board.bots.map((b,i)=>({house:true,who:'h'+i,cleared:b.cleared,e:b,order:i}));
  Net.rivals().forEach((p,i)=>rows.push({player:true,who:p.id,cleared:p.cleared,e:p,order:20+i}));
  const own=Object.values(myBest.f).filter(x=>x&&x.cleared>0);
  if(today.cleared>0&&!own.some(x=>x.key===today.key&&x.cleared>=today.cleared))own.push(today);
  own.forEach((x,i)=>rows.push({you:true,who:'me',cleared:x.cleared,e:x,order:9000+i}));
  rows.sort((a,b)=>b.cleared-a.cleared||a.order-b.order);       // ties go to whoever was there first
  return rows;
}
// the best fighter of each of the top two players (or house fighters)
function duelPair(){
  const out=[],seen=new Set();
  for(const r of standings()){if(seen.has(r.who))continue;seen.add(r.who);out.push(r);if(out.length===2)break}
  return out;
}
function target(){
  const best=[],seen=new Set();
  for(const r of standings()){if(r.you||seen.has(r.who))continue;seen.add(r.who);best.push(r.cleared)}
  return best.length>1?best[1]+1:1;
}
const inDuel=()=>duelPair().some(x=>x.you);
const owner=r=>r.you?'You':r.player?r.e.name:'House';
function netLine(){
  if(!Net.on())return '';
  if(!Net.ok)return 'Connecting to today\u2019s ladder\u2026';
  const n=new Set(Net.rivals().map(p=>p.id)).size+(today.cleared>0?1:0);
  return n?n+' player'+(n>1?'s':'')+' on today\u2019s ladder':'No players on today\u2019s ladder yet. Be the first.';
}
// A rival on a rung is sometimes another player's fighter, cut back to what they had at that height.
// Players are met through every fighter they have climbed with today, not only their best one.
// Nobody should meet the same fighter over and over: a player's fighter comes back only after FRIEND_GAP other
// rivals, and a class that was met in the last few fights is not picked again.
// The climb itself (Climb, in brawl-proof.js) rolls whether a player's fighter may stand on a rung and builds the rival;
// this page only offers it a candidate.
const FRIEND_GAP=6;
let fightNo=0;
const lastMet={};
function pickRival(st){
  fightNo++;
  const pool=Net.rivals().filter(p=>!(fightNo-lastMet[p.id+':'+p.key]<=FRIEND_GAP)&&!st.met.includes(p.key));
  const p=pool.length?pool[(Math.random()*pool.length)|0]:null;
  const b=Climb.next(st,p?{k:p.key,s:p.str,z:p.size,u:p.ups,n:p.name,c:p.color}:null);
  if(st.friend&&p){b.owner=p.name;lastMet[p.id+':'+p.key]=fightNo}
  return b;
}
const whose=b=>(b.owner?esc(b.owner)+'\u2019s ':'')+typeOf(b);
function goalLine(){
  if(!boardReady())return 'Setting up today’s ladder…';
  if(inDuel())return 'You are in today’s duel. Climb higher to make it safe.';
  return 'Today’s duel is between the top two players. Clear <b>'+target()+'</b> rungs to get in.';
}

// ----- sound -----
// Every sound is a slice of one recorded file (sfx/brawl.mp3, built by tools/sfx-build.js from public-domain packs;
// brawl-sfx.js says where each slice is). Several takes per sound and a little pitch drift keep repeats from grating;
// a minimum gap per sound, a cap on voices and a compressor keep fast fights from turning into noise.
let actx=null,bus=null,comp=null,sfxRaw=null,sfxBuf=null,sfxBusy=false,sfxBad=null,voices=0,audioStale=false;
const sfxLast={},sfxPrev={};
function audioOut(){
  if(!bus&&actx){
    bus=actx.createGain();comp=bus;
    try{
      bus.gain.value=.9;
      const c=actx.createDynamicsCompressor();
      c.threshold.value=-16;c.knee.value=18;c.ratio.value=5;c.attack.value=.004;c.release.value=.18;
      bus.connect(c);c.connect(actx.destination);comp=c;
    }catch(err){bus.connect(actx.destination)}
  }
  return bus;
}
window.BrawlAudio={ctx:()=>actx,out:()=>{audioOut();return comp}};   // the recorder taps the finished mix
function audioOn(){
  if(muted)return;
  try{
    if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();const c=actx;c.onstatechange=()=>{if(c===actx&&c.state==='interrupted')audioStale=true}}
    if(actx.state!=='running')actx.resume();
  }catch(e){actx=null}
  sfxDecode();
}
function sfxFetch(){
  if(typeof fetch!=='function'||typeof SFX_FILE==='undefined')return;
  try{fetch(SFX_FILE).then(r=>r&&r.ok?r.arrayBuffer():null).then(b=>{sfxRaw=b;sfxDecode()}).catch(()=>{})}catch(e){}
}
function sfxDecode(){
  if(!actx||!sfxRaw||sfxBuf||sfxBusy||sfxBad===actx||!actx.decodeAudioData)return;
  sfxBusy=true;
  // the file's bytes are kept (decoding uses up a copy) so a fresh sound output can decode them again
  const ctx=actx,done=b=>{if(ctx!==actx)return;sfxBuf=b;sfxBusy=false},fail=()=>{if(ctx!==actx)return;sfxBusy=false;sfxBad=ctx};
  try{const p=actx.decodeAudioData(sfxRaw.slice(0),done,fail);if(p&&p.catch)p.catch(()=>{})}catch(e){fail()}
}
// Phones can leave the sound output silent after the page has been in the background (another app, a locked screen,
// a call), sometimes while still reporting that it is running. So after any time away the output is rebuilt from
// scratch on the next tap, and every tap anywhere wakes an output that has been paused.
function audioReset(){
  const old=actx,was=old?old.state:'none';
  actx=null;bus=null;comp=null;sfxBuf=null;sfxBusy=false;sfxBad=null;voices=0;
  for(const k in sfxLast)delete sfxLast[k];
  try{if(old&&old.close){const p=old.close();if(p&&p.catch)p.catch(()=>{})}}catch(e){}
  audioOn();
  log('audio',{was,now:actx?actx.state:'none'});
}
function audioWake(){
  if(muted||!actx)return;
  const recording=window.Broadcast&&Broadcast.stats&&Broadcast.stats().state!=='idle';      // a recording holds the old output
  if(audioStale&&!recording){audioStale=false;audioReset();return}
  if(actx.state!=='running'){try{const p=actx.resume();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
}
for(const ev of ['touchend','click','keydown'])document.addEventListener(ev,audioWake,true);
document.addEventListener('visibilitychange',()=>{
  if(!actx)return;
  if(document.hidden){audioStale=true;return}
  try{const p=actx.resume();if(p&&p.catch)p.catch(()=>{})}catch(e){}       // allowed without a tap on some phones
});
if(window.addEventListener)window.addEventListener('pageshow',ev=>{if(ev.persisted&&actx)audioStale=true});
// vol and rate are multipliers; ui=true lets it play outside a fight (buttons, the scroll)
function sfx(name,vol,rate,ui){
  if(muted||!actx||!sfxBuf||(!ui&&!loud)||typeof SFX==='undefined')return;
  const S=SFX[name];
  if(!S)return;
  const now=actx.currentTime,gap=S.gap/(ui?1:Math.max(1,speed*.6));
  if(now-(sfxLast[name]||-9)<gap||voices>=8)return;
  sfxLast[name]=now;
  let k=(Math.random()*S.v.length)|0;
  if(S.v.length>1&&k===sfxPrev[name])k=(k+1)%S.v.length;      // never the same take twice running
  sfxPrev[name]=k;
  const v=S.v[k];
  try{
    const src=actx.createBufferSource(),g=actx.createGain();
    src.buffer=sfxBuf;src.playbackRate.value=(rate||1)*(1+(Math.random()-.5)*(ui?.05:.14));
    g.gain.value=Math.min(1.2,(vol==null?1:vol)*S.g);
    src.connect(g);g.connect(audioOut());
    voices++;src.onended=()=>{voices=Math.max(0,voices-1)};
    src.start(now,Math.max(0,v[0]-SFX_LEAD),v[1]+SFX_LEAD*2);
  }catch(e){}
}
// what a hit sounds like depends on who landed it; mines and eruptions already have their boom
const HIT_SFX={blade:'slash',twin:'slash',leech:'slash',pirate:'slash',clock:'metal',fury:'chop',mace:'heavy',jugger:'heavy',turtle:'iron',spikes:'punch',jester:'punch',
  blaster:'punch',archer:'twig',miner:'',volcano:'',comet:'tick',bramble:'twig',bees:'tin',ghost:'thump',snow:'thump',tesla:'',magnet:'',mirror:'glass',spider:'soft',
  necro:'wood',painter:'tick',hunter:'wood',beacon:'tick',drum:'thump',wizard:'glass'};
const HIT_VOL={archer:.7,blaster:.8};
// each ranged weapon has a voice of its own (these come before a class's own sfx.shot): a crack for the Gunner, a deeper
// bang for the Cowboy's revolver, a charged shot for the Railgun, a soft release for the bow
const SHOT_SFX={blaster:'gun',cowboy:'revolver',railgun:'rail',archer:'loose',wizard:'cast',hunter:'whoosh',pirate:'whoosh'};
const UI_SFX={weapon:'place',str:'place',size:'place',others:'page',back:'page',col:'click',new:'page',start:'page',up:'coins',fight:'draw',arm:'latch',tip:'page',duel:'draw',recduel:'draw',board:'open',closeboard:'page'};
function hitSound(e){
  if(e.ind){sfx('tick',.6);return}
  const own=FIGHTERS[e.by]&&FIGHTERS[e.by].sfx,n=e.by in HIT_SFX?HIT_SFX[e.by]:own?own.hit:undefined;
  if(n===''){return}
  sfx(n||'punch',(.5+Math.min(.5,e.dmg/45))*(HIT_VOL[e.by]||1),e.crit?.9:1);
  if(e.crit)sfx('clang',.7,1.15);
}

// ----- effects from sim events -----
// What a moment looks like is the effects engine's business (brawl-fx.js). This keeps what the page owns: the floating
// numbers and words, the lightning, the shake of the arena, and the sound.
// Numbers and words over the arena. Left alone they pile up on one spot into something nobody can read, so:
//   - quick hits on the same fighter add up into one number instead of a stack of small ones;
//   - a word that is still on screen nearby is not said again;
//   - anything new steps upward until it is clear of what is already there.
function say(x,y,txt,col,big){
  txt=String(txt);
  const m=/^([-+\u2212])(\d+)(!?)$/.exec(txt),num=!!m,size=num?(m[1]==='+'?12:big?19:14):big?13:11,h=size*1.15;
  x+=(Math.random()-.5)*(num?16:6);y-=26;
  if(num&&!big){
    for(const f of floats)if(f.num&&!f.big&&f.sign===m[1]&&f.life>.5&&Math.abs(f.x-x)<34&&Math.abs(f.y-y)<34){
      f.v+=+m[2];f.txt=f.sign+f.v;f.w=f.txt.length*size*.62+4;f.life=.8;return;
    }
  }else if(!num){
    for(const f of floats)if(f.txt===txt&&f.life>.3&&Math.abs(f.x-x)<80&&Math.abs(f.y-y)<60)return;
  }
  const w=txt.length*size*.62+4;
  for(let k=0;k<7;k++){
    let hit=null;
    for(const f of floats)if(f.life>.15&&Math.abs(f.x-x)<(w+(f.w||40))/2&&Math.abs(f.y-y)<(h+(f.h||h))/2){hit=f;break}
    if(!hit)break;
    y=hit.y-(h+(hit.h||h))/2-1;
  }
  if(y<10)y=10;
  if(floats.length<40)floats.push({x,y,txt,life:.8,col,big,num,sign:num?m[1]:'',v:num?+m[2]:0,w,h});
}
function bolt(x,y,x2,y2,n,jag,life){
  const pts=[[x,y]];
  for(let k=1;k<n;k++){const t=k/n;pts.push([x+(x2-x)*t+(Math.random()-.5)*jag,y+(y2-y)*t+(Math.random()-.5)*jag])}
  pts.push([x2,y2]);if(bolts.length<24)bolts.push({pts,life});
  return pts;
}
FX.say=say;FX.kick=n=>{shake=Math.max(shake,n)};FX.calm=calm;
function onEvents(ev){
  for(const e of ev){
    const col=e.i>=0&&match?match.f[e.i].col:'#fff4c2';
    FX.on(e,match);
    if(e.k==='hit'){
      say(e.x,e.y,'-'+Math.max(1,Math.round(e.dmg))+(e.crit?'!':''),e.crit?'#ffd447':'#ff5a4f',e.crit);
      if(e.dmg>=18||e.crit)shake=Math.max(shake,Math.min(4,e.dmg*.09+(e.crit?1:0)));
      hitSound(e);
    }else if(e.k==='heal'){say(e.x,e.y,'+'+Math.max(1,Math.round(e.dmg)),'#7ddc5a')}
    else if(e.k==='block'){say(e.x,e.y,'Blocked','#bcd4ff');sfx('bell',.8)}
    else if(e.k==='revive'){say(e.x,e.y,'Second life','#ffd447',true);sfx('toll',1)}
    else if(e.k==='parry'){sfx('clang',.55,1.12)}
    else if(e.k==='bump'){sfx('soft',.4)}
    else if(e.k==='shot'){const sk=match&&e.i>=0?match.f[e.i].key:'',n=SHOT_SFX[sk]||(FIGHTERS[sk]&&FIGHTERS[sk].sfx&&FIGHTERS[sk].sfx.shot)||'whoosh';sfx(n,n==='loose'?.8:n==='gun'||n==='revolver'||n==='rail'?.75:.6,n==='loose'?1.2:n==='gun'?1.15:1)}
    else if(e.k==='mine'){sfx('latch',.6)}
    else if(e.k==='boom'){shake=Math.max(shake,4);sfx('boom',.9)}
    else if(e.k==='zap'){
      // a main stroke and a thinner fork that peels off it
      const pts=bolt(e.x,e.y,e.x2,e.y2,6,18,.14),mid=pts[2+((Math.random()*2)|0)],a=Math.atan2(e.y2-e.y,e.x2-e.x)+(Math.random()<.5?.9:-.9),l=14+Math.random()*18;
      bolt(mid[0],mid[1],mid[0]+Math.cos(a)*l,mid[1]+Math.sin(a)*l,3,8,.1);
      sfx('zap',.55);
    }
    else if(e.k==='fade'){sfx('fall',.6)}
    else if(e.k==='appear'){sfx('rise',.7)}
    else if(e.k==='pull'){sfx('hum',.7)}
    else if(e.k==='blast'){shake=Math.max(shake,3);sfx('thump',1,.8)}
    else if(e.k==='freeze'){say(e.x,e.y,'Frozen','#9fe0ff',true);sfx('shatter',.9)}
    else if(e.k==='spawn'){sfx('pop',.6)}
    else if(e.k==='pop'){if(!(match&&e.i>=0&&match.f[e.i].key==='archer'))sfx('tick',.5)}
    else if(e.k==='text'){say(e.x,e.y,String(e.txt),e.col||col,e.big)}
    else if(e.k==='ko'){shake=9;if(e.draw)say(AW/2,AW/2+20,'Double knockout','#ffd447',true);else sfx('ko',1)}
  }
  ev.length=0;
}

// ----- drawing: the arena itself is drawn by brawl-looks.js -----
function fit(){
  const r=cv.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
}
function draw(){
  const cw=cv.width,ch=cv.height,M=10;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cw,ch);
  const s=Math.min(cw/(AW+M*2),ch/(AW+M*2));
  const sx=calm?0:(Math.random()-.5)*shake,sy=calm?0:(Math.random()-.5)*shake;
  ctx.setTransform(s,0,0,s,(cw-AW*s)/2+sx*s,(ch-AW*s)/2+sy*s);
  drawSmooth(ctx,match,you,fx);
}
// Draws the arena with everything that moves placed part-way between its last two simulation steps.
let lerpA=1;
const lerpKeep=[];
function snap(m){
  for(const f of m.f){f.px=f.x;f.py=f.y;f.pa=f.ang}
  for(const q of m.minions){q.px=q.x;q.py=q.y}
  for(const q of m.bullets){q.px=q.x;q.py=q.y}
}
function ease(o,a){
  if(o.px===undefined)return;
  const dx=o.x-o.px,dy=o.y-o.py;
  if(dx*dx+dy*dy>900)return;                           // a blink or a swap: do not smear it across the arena
  lerpKeep.push(o,o.x,o.y,o.ang);
  o.x=o.px+dx*a;o.y=o.py+dy*a;
  if(o.pa!==undefined)o.ang=o.pa+(o.ang-o.pa)*a;
}
function drawSmooth(c,m,youSide,fxs){
  const a=lerpA;
  if(!m||a>=1){drawArena(c,m,youSide,fxs);return}
  lerpKeep.length=0;
  for(const f of m.f)ease(f,a);
  for(const q of m.minions)ease(q,a);
  for(const q of m.bullets)ease(q,a);
  try{drawArena(c,m,youSide,fxs)}
  finally{for(let i=0;i<lerpKeep.length;i+=4){const o=lerpKeep[i];o.x=lerpKeep[i+1];o.y=lerpKeep[i+2];if(lerpKeep[i+3]!==undefined)o.ang=lerpKeep[i+3]}}
}

// ----- health bars -----
function hud(){
  if(!match)return;
  for(let i=0;i<2;i++){
    const f=match.f[i],el=$(i?'hpB':'hpA');
    el.style.width=Math.max(0,Math.min(100,f.hp/f.max*100)).toFixed(1)+'%';
    el.style.backgroundColor=f.col;
  }
}
function setNames(){
  $('nameA').textContent=(you===0?'You · ':'')+match.f[0].label;$('nameB').textContent=(you===1?'You · ':'')+match.f[1].label;
}

// ----- loop -----
let netT=0;
const fps={n:0,t:0,slow:0};   // frames drawn, seconds, and frames slower than 30 a second in the current fight
function ladderChanged(){
  if(mode==='board')render();                           // other screens may hold a text box, so only their goal line is touched
  else{const el=$('goal');if(el&&(mode==='make'||mode==='over'))el.innerHTML=goalLine()}
}
function refreshNet(){Net.pull(board.date).then(changed=>{if(changed)ladderChanged()})}
// each other player's climb is played again on this device (see brawl-net.js); the verdict goes in the play log, so it
// can be seen whether honest climbs from every kind of phone pass
function onVerdict(e,c){log('vfy',{p:e.id.slice(0,6),c:e.cid,k:e.key,r:e.cleared,ok:c.ok?1:0,why:c.why,n:c.fights})}
function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  if(mode==='fight'&&match&&!match.over){fps.n++;fps.t+=dt;if(dt>.034)fps.slow++}
  fit();
  const playing=mode==='fight'||mode==='duel';
  if(!boardReady()&&!playing)addBot();
  netT+=dt;
  if(Net.on()&&!playing&&!pinnedDay&&netT>15){netT=0;refreshNet()}                 // one house climb per frame, never during a fight
  if(Net.on()&&!playing&&!pinnedDay&&mode!=='ready'&&Net.pending()&&Net.verifyStep(6,onVerdict))ladderChanged();
  if(match&&(mode==='make'||playing)){
    acc+=dt*(playing?speed:1);
    let n=0;
    while(acc>=DT&&n<10){snap(match);match.step();onEvents(match.events);acc-=DT;n++}
    if(n===10)acc=0;
    lerpA=match.over?1:acc/DT;
    FX.rate=!playing||speed<=1?1:speed===2?.75:.55;       // at higher speeds each moment throws fewer sparks, so the arena stays readable
    if(mode!=='ready')FX.ambient(match,dt);
    if(match.over){
      overFor+=dt;
      if(mode==='make'&&overFor>1.2)practice();
      else if(mode==='fight'&&overFor>1)fightDone();
      else if(mode==='duel'&&!duel.done&&overFor>1.2)duelDone();
    }
  }
  if(!(match&&(mode==='make'||playing)))lerpA=1;
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.life-=dt;f.y-=28*dt;if(f.life<=0)floats.splice(i,1)}
  FX.update(dt);
  for(let i=bolts.length-1;i>=0;i--){bolts[i].life-=dt;if(bolts[i].life<=0)bolts.splice(i,1)}
  shake*=.78;if(shake<.3)shake=0;
  if(mode!=='ready')draw();                             // the arena is hidden behind the matchup
  hud();
  if(window.Broadcast&&Broadcast.onFrame)Broadcast.onFrame(dt);
  requestAnimationFrame(frame);
}

// ----- the climb -----
function begin(m,youSide,label,isLoud){
  match=m;you=youSide;loud=isLoud;overFor=0;acc=0;floats.length=0;sparks.length=0;rings.length=0;bolts.length=0;
  $('round').textContent=label;setNames();
}
function practice(){begin(createMatch(myBuild(),rival(1,Math.random),newSeed()),-1,'Practice',false)}
function startClimb(){
  if(!ready())return;
  audioOn();
  const b0=myBuild(),st=Climb.start((Math.random()*4294967296)>>>0,me.key,me.str,me.size,b0.name,b0.color);
  run={st,rung:1,build:st.build,rival:null,shield:0,life:0,t0:Date.now()};
  log('run',{k:me.key,s:me.str,z:me.size,n:run.build.name,c:run.build.color,best,today:today.cleared});
  nextFight();
}
// Before every fight the two fighters stand in the arena and the scroll shows the matchup; the fight starts on a tap.
// The rules of a climb (the shield, the extra life, draws) live in Climb, in brawl-proof.js; run mirrors its state.
function nextFight(note){
  const st=run.st;
  run.rival=pickRival(st);run.seed=st.fseed;run.armed=false;run.note=note||'';tip=null;sheet=false;
  run.rung=st.rung;run.shield=st.shield;run.life=st.life;
  if(st.earned==='shield'||st.earned==='both')run.note+=(run.note?' ':'')+'You have earned a shield.';
  if(st.earned==='life'||st.earned==='both')run.note+=(run.note?' ':'')+'You have earned an extra life.';
  mode='ready';
  begin(createMatch(run.build,run.rival,run.seed),0,'Rung '+run.rung,true);
  render();
}
function startFight(){
  if(mode!=='ready')return;
  sheet=false;
  fps.n=fps.t=fps.slow=0;overFor=0;acc=0;
  mode='fight';
  render();
}
// The matchup fills the screen in place of the arena: the two fighters are drawn side by side at the top of the scroll,
// each cut out of the real match that is about to start, so size, colour and extra weapons all show.
const FACE=176;
function faces(){
  const P=$('panel');
  if(!P.querySelectorAll||!match)return;
  for(const el of P.querySelectorAll('canvas[data-face]')){
    const f=match.f[+el.dataset.face];
    if(!f)continue;
    const lab=f.label;
    try{
      const c=el.getContext('2d'),span=Math.max(62,f.r*2.7),z=el.width/span;
      f.label='';
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,el.width,el.height);
      c.setTransform(z,0,0,z,el.width/2-f.x*z,el.height/2-(f.y+2)*z);
      drawArena(c,match,-1,{floats:[],sparks:[],rings:[],bolts:[]});
    }catch(e){}
    f.label=lab;
  }
}
const sizeWord=r=>r<21?'Small':r<28?'Medium':r<36?'Big':'Huge';
function readyBody(){
  const a=run.build,b=run.rival,compact=new Set(a.ups).size>4||new Set(b.ups).size>4;
  const row=(label,x,y,num)=>`<b class="${num&&x>y?'hi':''}">${num?Math.round(x):x}${num===2?'%':''}</b><i>${label}</i><b class="${num&&y>x?'hi':''}">${num?Math.round(y):y}${num===2?'%':''}</b>`;
  return `<p class="stepn">Rung ${run.rung} · the matchup</p>`+
    (run.note?`<p class="ps note">${run.note}</p>`:'')+
    `<div class="duo"><button type="button" class="side mine" id="btnSheet" data-act="sheet" aria-label="Your fighter's sheet"><canvas data-face="0" width="${FACE}" height="${FACE}"></canvas><small>You · tap for your sheet</small><b>${typeOf(a)}</b></button><span class="vs">vs</span>`+
      `<div class="side"><canvas data-face="1" width="${FACE}" height="${FACE}"></canvas><small>${b.owner?esc(b.owner):'House'}</small><b>${typeOf(b)}</b></div></div>`+
    `<div class="mu">`+
      row('Health',effHp(a),effHp(b),1)+row('Damage',effDmg(a)*100,effDmg(b)*100,2)+row('Speed',effSpd(a)*100,effSpd(b)*100,2)+row('Size',sizeWord(a.r),sizeWord(b.r),0)+
    `</div>`+(a.ups.length||b.ups.length?`<p class="stepn sub">Upgrades · tap one to read it</p>`:'')+
    `<div class="mu2"><div class="chips">${chips(a,0,compact)}</div><div class="chips">${chips(b,1,compact)}</div></div>`+tipLine(a,b)+
    (run.shield>0?`<button type="button" id="btnArm" class="arm" data-act="arm" aria-pressed="${run.armed}">${run.armed?'Shield raised: lose this fight and you climb on':'Raise your shield for this fight'}</button>`:'')+
    (run.life>0?`<p class="ps keep">Extra life held: spent the next time you lose.</p>`:'')+
    `<button type="button" id="btnFight" class="go" data-act="fight">Fight</button>`;
}
function fightDone(){
  const left=f=>+Math.max(0,f.hp/f.max).toFixed(2);
  const st=run.st,draw=!!match.draw,won=!draw&&match.winner===0,rung=st.rung,wasArmed=run.armed&&st.shield>0;
  const next=Climb.settle(st,match,run.armed);
  const saved=st.last==='shield'||st.last==='life'?st.last:'';
  run.shield=st.shield;run.life=st.life;
  log('fight',{r:rung,win:won?1:0,dr:draw?1:0,sh:wasArmed?1:0,saved,t:+match.t.toFixed(1),hp:[left(match.f[0]),left(match.f[1])],seed:run.seed,sp:speed,
    fps:fps.t>0?Math.round(fps.n/fps.t):0,slow:fps.slow,me:logBuild(run.build),vs:Object.assign(logBuild(run.rival),{o:run.rival.owner||''})});
  if(draw){                                               // both fell at once: nobody wins, nothing is spent, a new rival steps up
    sfx('bell',.9,.8,true);
    nextFight('A draw: you both fell at once. A new rival steps up.');
    return;
  }
  if(won){
    if(next!=='pick'){nextFight();return}                  // nothing left to take: just keep climbing
    choice=st.choice.slice();
    mode='pick';
    sfx('bell',.8,1,true);
  }else if(saved){
    sfx('bell',.9,.8,true);
    nextFight(saved==='shield'?'Your shield held. A new rival steps up.':'Your extra life is spent. A new rival steps up.');
    return;
  }else{
    mode='over';
    sfx('door',.9,1,true);
    const cleared=st.cleared;
    run.record=cleared>best;
    if(run.record){best=cleared;try{localStorage.setItem('brawl.best',String(best))}catch(e){}}
    if(cleared>today.cleared){
      today={date:dayKey(),cleared,key:me.key,str:me.str,size:me.size,name:run.build.name,color:run.build.color,ups:run.build.ups.slice()};
      try{localStorage.setItem('brawl.today2',JSON.stringify(today))}catch(e){}
    }
    if(cleared>(myBest.f[me.key]?myBest.f[me.key].cleared:0)){      // a new best with this class today goes to the shared ladder, with its proof
      myBest.f[me.key]={cleared,key:me.key,str:me.str,size:me.size,name:run.build.name,color:run.build.color,ups:run.build.ups.slice(),seed:st.seed,proof:Climb.proof(st)};
      try{localStorage.setItem('brawl.mine',JSON.stringify(myBest))}catch(e){}
      Net.pushClimb(myBest.date,myBest.f[me.key]);
    }
    log('end',{cleared,rec:run.record?1:0,best,by:run.rival.key,o:run.rival.owner||'',secs:Math.round((Date.now()-run.t0)/1000),players:Net.others().length});
  }
  render();
}

// ----- today's duel: the top two on the ladder, best of three -----
// In the video the two sides must be told apart at a glance. When their colours are close, the second fighter wears a
// warm colour against a cool one, or a cool colour against a warm one, for the duel only.
function hueOf(hex){
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  if(d<.12)return -1;                                   // grey, white or black: no hue to speak of
  const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
  return (h*60+360)%360;
}
function apart(a,b){
  if(!okColor(a.color)||!okColor(b.color))return;
  const ha=hueOf(a.color),hb=hueOf(b.color),gap=ha<0||hb<0?(ha<0&&hb<0?0:180):Math.min(Math.abs(ha-hb),360-Math.abs(ha-hb));
  if(gap<70)b.color=ha>=150&&ha<=300?'#e0662b':'#3f8fd1';
}
function startDuel(){
  const r=duelPair();
  if(!boardReady()||r.length<2)return;
  audioOn();
  const da=rebuild(r[0].e),db=rebuild(r[1].e);
  apart(da,db);
  duel={a:da,b:db,you:r[0].you?0:r[1].you?1:-1,who:[owner(r[0]),owner(r[1])],score:[0,0],round:1,done:false};
  mode='duel';duelRound();
  log('duel',{a:logBuild(duel.a),b:logBuild(duel.b),who:duel.who,you:duel.you,rec:window.Broadcast&&Broadcast.stats&&Broadcast.stats().state!=='idle'?1:0});
}
function duelRound(){
  duel.tries=(duel.tries||0)+1;
  const seed=daySeed([dayKey(),duel.a.key,duel.a.ups.join('.'),duel.b.key,duel.b.ups.join('.'),duel.tries].join('|'))&0x7fffffff;
  begin(createMatch(duel.a,duel.b,seed),duel.you,'Today’s duel · round '+duel.round,true);render();
}
function duelDone(){
  if(match.draw){duelRound();return}                      // a double knockout settles nothing: the round is fought again
  duel.score[match.winner]++;
  if(duel.score[match.winner]>=2){duel.done=true;duel.winner=match.winner;log('duelend',{score:duel.score,win:duel.winner});if(window.Broadcast&&Broadcast.finish)Broadcast.finish();sfx('toll',1,1,true);sfx('coins',.8,1,true);render()}
  else{duel.round++;duelRound()}
}

// ----- panel -----
const head=(n,title)=>`<p class="stepn">${n}</p><h2 class="ph">${title}</h2>`;
const card=(id,act,data,title,text,dot,tag)=>`<button type="button" class="card" id="${id}" data-act="${act}" ${data}>${dot?`<i style="background:${dot}"></i>`:''}<span><b>${title}${tag?`<em>${tag}</em>`:''}</b><small>${text}</small></span></button>`;
// an upgrade card: a stripe and an icon in its kind's colour, and the kind named beside the title
const upCard=(b,id,n)=>{const K=kindOf(id);return `<button type="button" class="card up" id="up-${id}" data-act="up" data-key="${id}" style="--k:${K.col}"><i class="ic">${kindIcon(K)}</i><span><b>${upName(b,id)}<em class="kd">${K.label}</em>${n?`<em>you have ${n}</em>`:''}</b><small>${upText(b,id)}</small></span></button>`};
function makeBody(){
  if(step===0&&browse){
    return head(ROSTER.length+' fighters','Choose your champion')+
      `<div class="roster">`+ROSTER.map(k=>`<button type="button" class="pick" id="pk-${k}" data-act="weapon" data-key="${k}"><canvas width="${THUMB}" height="${THUMB}" data-thumb="${k}"></canvas><span>${FIGHTERS[k].name}</span></button>`).join('')+`</div>`+
      `<button type="button" id="btnFew" class="quiet" data-act="few">Show three at a time</button>`;
  }
  if(step===0){
    const offer=[0,1,2].map(i=>deck[(deckAt+i)%deck.length]);
    return head('Step 1 of 3 · '+ROSTER.length+' fighters','Choose your champion')+
      offer.map(k=>`<button type="button" class="card face" id="wp-${k}" data-act="weapon" data-key="${k}"><canvas width="${THUMB}" height="${THUMB}" data-thumb="${k}" aria-hidden="true"></canvas><span><b>${FIGHTERS[k].name}</b><small>${FIGHTERS[k].desc}</small></span></button>`).join('')+
      `<button type="button" id="btnOthers" class="quiet" data-act="others">Show three others</button>`+
      `<button type="button" id="btnAll" class="quiet" data-act="all">See all ${ROSTER.length} fighters</button>`;
  }
  const what=`<p class="ps what"><b>${FIGHTERS[me.key].name}.</b> ${FIGHTERS[me.key].desc}</p>`;
  if(step===1)return head('Step 2 of 3','Pick a strength')+what+
    STRENGTHS.map((s,i)=>card('str-'+i,'str',`data-i="${i}"`,s.label,s.text)).join('')+
    `<button type="button" id="btnBack" class="quiet" data-act="back">Back</button>`;
  if(step===2)return head('Step 3 of 3','Pick a size')+what+
    SIZES.map((s,i)=>card('size-'+i,'size',`data-i="${i}"`,s.label,s.text)).join('')+
    `<button type="button" id="btnBack" class="quiet" data-act="back">Back</button>`;
  return `<h2 class="ph">Name your ${typeOf(myBuild())}</h2>`+
    `<input id="inName" type="text" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Fighter name" placeholder="${FIGHTERS[me.key].name}" value="${esc(me.name)}">`+
    `<div class="sw">`+PALETTE.map((c,i)=>`<button type="button" id="col-${i}" data-act="col" data-i="${i}" class="${i===me.color?'on':''}" aria-pressed="${i===me.color}" aria-label="Colour ${i+1}"><i style="background:${c}"></i></button>`).join('')+`</div>`+
    `<button type="button" id="btnStart" class="go" data-act="start">Begin the climb</button>`+
    `<p class="ps">Beat a rival, claim a boon, climb a rung. One loss ends the run.</p>`+
    `<p class="ps" id="goal">${goalLine()}</p>`+
    `<button type="button" id="btnNew" class="alt" data-act="new">Make a different fighter</button>`;
}
const CROWN='<svg class="crown" viewBox="0 0 20 16" width="19" height="15" role="img" aria-label="1"><path d="M3 14.5h14l1.8-10-5 3.8L10 1.5 6.2 8.3l-5-3.8z" fill="#c9a45c" stroke="#3c280f" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const CHANNEL='https://www.youtube.com/@playduelking';
function boardBody(){
  const rows=standings(),pair=[],seen=new Set();
  for(const r of rows){if(seen.has(r.who))continue;seen.add(r.who);pair.push(r);if(pair.length===2)break}
  const row=(r,i)=>{
    const b=rebuild(r.e);
    return `<li class="${r.you?'me':''}${pair.includes(r)?' in':''}"><span class="rk">${i?i+1:CROWN}</span><i style="background:${b.color}"></i>`+
      `<span class="nm"><b>${typeOf(b)}</b><small>${r.you?esc(b.name)+' · you':r.player?esc(b.name):'house fighter'}</small></span><span class="rg">${r.cleared}</span></li>`;
  };
  // The duel is not played here: it is fought once, when the day ends, and shown in the video. The way out of the
  // ladder is the Back plate in the footer.
  return `<h2 class="ph">Today’s ladder</h2><p class="ps" id="goal">${goalLine()}</p>`+
    `<p class="ps" id="duelNote">The duel is fought when the day ends, and shown in <a href="${CHANNEL}" target="_blank" rel="noopener">the next video</a>.</p>`+
    (netLine()?`<p class="ps" id="netLine">${netLine()}</p>`:'')+
    (boardReady()?`<ol class="lb">`+rows.slice(0,80).map(row).join('')+`</ol>`:'');
}
function duelBody(){
  // kept short so the arena has the screen; the fighters' names are already above the health bars
  const t=[typeOf(duel.a),typeOf(duel.b)];
  return `<p class="stepn">Today’s duel · best of three</p>`+
    `<p class="duelrow"><span>${t[0]}<small>${esc(duel.who[0])}</small></span><b>${duel.score[0]} – ${duel.score[1]}</b><span>${t[1]}<small>${esc(duel.who[1])}</small></span></p>`+
    (duel.done?`<h2 class="ph">${t[duel.winner]} is today’s Duel King</h2>`+
      `<button type="button" id="btnToBoard" class="go" data-act="board">Back to the ladder</button>`
      :`<button type="button" id="btnLeave" class="quiet" data-act="board">Leave the duel</button>`);
}
function render(){
  const P=$('panel'),B=document.body;
  if(B&&B.dataset)B.dataset.mode=mode;                 // the stylesheet gives the arena more room while a fight is on
  $('btnSpeed').hidden=!(mode==='fight'||mode==='duel'||mode==='ready');
  $('btnBoard').hidden=!(mode==='make'||mode==='over'||mode==='board');
  $('btnBoard').textContent=mode==='board'?'Back':'Ladder';          // the same plate opens the ladder and leaves it
  if(sheet&&run&&(mode==='pick'||mode==='ready')){P.innerHTML=sheetBody();portraits();return}
  if(mode==='make'){P.innerHTML=makeBody();if(step===0)thumbsFill()}
  else if(mode==='board')P.innerHTML=boardBody();
  else if(mode==='duel')P.innerHTML=duelBody();
  else if(mode==='ready'){P.innerHTML=readyBody();faces()}
  else if(mode==='fight'){
    P.innerHTML=(run.armed?`<p class="ps keep">Shield raised: you survive a loss here.</p>`:run.life>0?`<p class="ps keep">You hold an extra life.</p>`:'')+`<p class="ps"><b>You, ${typeOf(run.build)}:</b> ${summary(run.build)}</p><p class="ps"><b>${whose(run.rival)}:</b> ${FIGHTERS[run.rival.key].desc}${run.rival.ups.length?' ('+summary(run.rival)+')':''}</p>`;
  }else if(mode==='pick'){
    const have=id=>{let n=0;for(const x of run.build.ups)if(x===id)n++;return n};
    P.innerHTML=`<button type="button" class="mebtn" id="btnSheet" data-act="sheet" aria-label="Your fighter's sheet"><canvas data-me width="96" height="96"></canvas></button>`+
      head('Rung '+run.rung+' cleared · you are a '+typeOf(run.build),'Claim a boon')+
      choice.map(id=>upCard(run.build,id,have(id))).join('');
    portraits();
  }else{
    const cleared=run.rung-1;
    P.innerHTML=`<h2 class="ph">${cleared?'Your '+typeOf(run.build)+' climbed '+cleared+' rung'+(cleared>1?'s':''):'Out on the first rung'}</h2>`+
      `<p class="ps">${run.record?'New best. ':'Your best is '+best+'. '}Beaten by ${run.rival.owner?'':'a '}${whose(run.rival)}.</p>`+
      `<p class="ps" id="goal">${goalLine()}</p>`+
      `<button type="button" id="btnAgain" class="go" data-act="start">Climb again</button>`+
      `<button type="button" id="btnNew" class="alt" data-act="new">Make a different fighter</button>`;
  }
}
// Small portraits for the grid of every fighter: each is drawn once, from a real fighter standing in the arena, and kept.
const THUMB=132,thumbs={};
let thumbBusy=false;
function thumbMake(key){
  const cv2=document.createElement('canvas');cv2.width=cv2.height=THUMB;
  try{
    const c=cv2.getContext('2d'),m=createMatch(makeBuild(key,-1,1),makeBuild(key,-1,1),7),f=m.f[0],z=THUMB/66;
    f.x=80;f.y=AW/2;f.ang=-.6;f.label='';m.f[1].x=AW-40;m.f[1].y=30;
    c.setTransform(z,0,0,z,THUMB/2-f.x*z,THUMB/2-(f.y+3)*z);
    drawArena(c,m,-1,{floats:[],sparks:[],rings:[],bolts:[]});
  }catch(e){}
  return cv2;
}
function thumbsFill(){
  if(thumbBusy)return;
  thumbBusy=true;
  const go=()=>{
    const list=$('panel').querySelectorAll?$('panel').querySelectorAll('canvas[data-thumb]'):[];
    let made=0,left=0;
    for(const el of list){
      const k=el.dataset.thumb;
      if(el.dataset.done)continue;
      if(!thumbs[k]){if(made>=6){left++;continue}thumbs[k]=thumbMake(k);made++}
      try{el.getContext('2d').drawImage(thumbs[k],0,0)}catch(e){}
      el.dataset.done='1';
    }
    if(left&&mode==='make'&&step===0)requestAnimationFrame(go);else thumbBusy=false;
  };
  go();
}
// Your own fighter, drawn from the real thing (colour, size, extra weapons and all), on every canvas marked data-me.
function portraits(){
  const P=$('panel');
  if(!P.querySelectorAll||!run)return;
  for(const el of P.querySelectorAll('canvas[data-me]')){
    try{
      const c=el.getContext('2d'),m=createMatch(run.build,makeBuild('turtle',-1,1),7),f=m.f[0],span=Math.max(62,f.r*2.7),z=el.width/span;
      f.x=80;f.y=AW/2;f.ang=-.6;f.label='';m.f[1].x=AW+200;m.f[1].y=-200;
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,el.width,el.height);
      c.setTransform(z,0,0,z,el.width/2-f.x*z,el.height/2-(f.y+2)*z);
      drawArena(c,m,-1,{floats:[],sparks:[],rings:[],bolts:[]});
    }catch(e){}
  }
}
// The sheet: what your class does, its numbers as they stand now, and every boon it carries, each with what it does.
function sheetBody(){
  const b=run.build,F=FIGHTERS[b.key],n={};
  for(const id of b.ups)n[id]=(n[id]||0)+1;
  const stat=(v,label)=>`<span><b>${v}</b><i>${label}</i></span>`;
  const boon=id=>{const K=kindOf(id);return `<p class="ps tipline boon" style="--k:${K.col}"><b>${upName(b,id)}${n[id]>1?' ×'+n[id]:''}</b><em>${K.label}</em>${upText(b,id)}${n[id]>1?' (each)':''}</p>`};
  const held=(run.shield>0?'A shield is held. ':'')+(run.life>0?'An extra life is held.':'');
  return `<p class="stepn">Your fighter · rung ${run.rung}</p>`+
    `<div class="sheettop"><canvas data-me width="${FACE}" height="${FACE}"></canvas><div><h2 class="ph">${typeOf(b)}</h2><p class="ps">${esc(b.name)}</p></div></div>`+
    `<p class="ps what"><b>${F.name}.</b> ${F.desc}</p>`+
    `<p class="ps what"><b>Its own boon, ${F.sig[0]}:</b> ${F.sig[1]}${n.sig?' (taken'+(n.sig>1?' ×'+n.sig:'')+')':' (not taken yet)'}</p>`+
    `<div class="stats">`+stat(Math.round(effHp(b)),'Health')+stat(Math.round(effDmg(b)*100)+'%','Damage')+stat(Math.round(effSpd(b)*100)+'%','Speed')+stat(sizeWord(b.r),'Size')+`</div>`+
    (held?`<p class="ps keep">${held}</p>`:'')+
    `<p class="stepn sub">${b.ups.length?'Boons · '+b.ups.length:'No boons yet'}</p>`+
    Object.keys(n).map(boon).join('')+
    `<button type="button" id="btnSheetBack" class="go" data-act="sheet">Back</button>`;
}
function save(){try{localStorage.setItem('brawl.fighter',JSON.stringify(me))}catch(e){}}
$('panel').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b||b.disabled)return;
  const act=b.dataset.act;
  audioOn();sfx(UI_SFX[act]||'click',1,1,true);
  if(act!=='start'&&act!=='up'&&act!=='fight'&&act!=='tip')log('tap',{a:act,m:mode,v:b.dataset.key||b.dataset.i||''});
  if(act==='weapon'){if(!FIGHTERS[b.dataset.key])return;me.key=b.dataset.key;if(!me.colorSet)me.color=PALETTE.indexOf(FIGHTERS[me.key].color);step=1;save();render();practice()}
  else if(act==='others'){deckAt=(deckAt+3)%deck.length;render()}
  else if(act==='all'){browse=true;render()}
  else if(act==='few'){browse=false;render()}
  else if(act==='str'){me.str=+b.dataset.i;step=2;save();render();practice()}
  else if(act==='size'){me.size=+b.dataset.i;step=3;save();render();practice()}
  else if(act==='back'){step=Math.max(0,step-1);render()}
  else if(act==='col'){me.color=+b.dataset.i;me.colorSet=true;save();render();practice()}
  else if(act==='new'){mode='make';step=0;me.str=-1;me.size=-1;deck=shuffled(ROSTER);deckAt=0;save();render();practice()}
  else if(act==='start')startClimb();
  else if(act==='fight')startFight();
  else if(act==='tip'){const side=+b.dataset.side,id=b.dataset.key;tip=tip&&tip.side===side&&tip.id===id?null:{side,id};if(mode==='ready')render()}
  else if(act==='sheet'){if(run&&(mode==='pick'||mode==='ready')){sheet=!sheet;tip=null;render()}}
  else if(act==='arm'){if(mode==='ready'&&run.shield>0){run.armed=!run.armed;render()}}
  else if(act==='up'){
    if(mode!=='pick'||!choice.includes(b.dataset.key))return;
    log('pick',{r:run.rung,of:choice,got:b.dataset.key});
    if(Climb.pick(run.st,choice.indexOf(b.dataset.key)))nextFight();
  }
  // no button asks for these three any more: the automatic video and the tests start and leave a duel through them
  else if(act==='duel')startDuel();
  else if(act==='recduel'){if(window.Broadcast&&Broadcast.start)Broadcast.start();startDuel()}
  else if(act==='board'){mode='board';render()}
  else if(act==='closeboard'){mode=backTo;render();if(mode==='make')practice()}
});
$('panel').addEventListener('input',e=>{
  // typing must not rebuild the panel, or the keyboard would close on every letter
  if(e.target.id!=='inName')return;
  me.name=cleanName(e.target.value);
  if(match&&mode==='make'){match.f[0].label=shownName();setNames()}
  save();
});
document.addEventListener('contextmenu',e=>{if(!e.target.closest('input'))e.preventDefault()});
// No zooming, ever. The stylesheet already asks for this; some phones still zoom on a quick double tap, so the second
// tap of a pair is swallowed here and passed on as a plain click to whatever control was under it.
let lastTap=0;
document.addEventListener('touchend',e=>{
  const now=Date.now(),quick=now-lastTap<350;
  lastTap=now;
  if(!quick||e.target.closest('input,textarea,video'))return;
  e.preventDefault();
  const c=e.target.closest('button,a,[data-act]');
  if(c&&!c.disabled)c.click();
},{passive:false});
for(const ev of ['gesturestart','gesturechange','dblclick'])document.addEventListener(ev,e=>e.preventDefault());
$('btnBoard').addEventListener('click',()=>{
  if(mode==='board'){audioOn();sfx('page',1,1,true);log('tap',{a:'closeboard',m:mode,v:'foot'});mode=backTo;render();if(mode==='make')practice();return}
  if(mode!=='make'&&mode!=='over')return;audioOn();sfx('open',1,1,true);log('tap',{a:'ladder',m:mode});backTo=mode;mode='board';render()});
$('btnSpeed').addEventListener('click',()=>{sfx('click',1,1,true);speed=speed===1?2:speed===2?4:1;$('btnSpeed').textContent='Speed '+speed+'×';try{localStorage.setItem('brawl.speed',String(speed))}catch(e){}log('tap',{a:'speed',v:speed})});
$('btnSound').addEventListener('click',()=>{muted=!muted;$('btnSound').setAttribute('aria-pressed',String(!muted));if(!muted){audioOn();sfx('click',1,1,true)}log('tap',{a:'sound',v:muted?0:1})});

board.date=today.date=myBest.date=dayKey();
// Raise LADDER_RESET to wipe the ladder, today's climb and the best record on every device, once, the next time it loads.
// The player's fighter and speed setting are kept.
const LADDER_RESET='1:'+RULES;
try{
  if(localStorage.getItem('brawl.reset')!==LADDER_RESET){
    ['brawl.board2','brawl.today2','brawl.best','brawl.mine'].forEach(k=>localStorage.removeItem(k));
    localStorage.setItem('brawl.reset',LADDER_RESET);
  }
}catch(e){}
try{
  const v=parseInt(localStorage.getItem('brawl.best'),10);if(Number.isFinite(v)&&v>0)best=v;
  const sp=parseInt(localStorage.getItem('brawl.speed'),10);if([1,2,4].includes(sp)){speed=sp;$('btnSpeed').textContent='Speed '+speed+'×'}
  const s=JSON.parse(localStorage.getItem('brawl.fighter'));
  if(s&&FIGHTERS[s.key]&&[0,1,2].includes(s.str)&&[0,1,2].includes(s.size)&&s.color>=-1&&s.color<PALETTE.length){
    me={key:s.key,str:s.str,size:s.size,name:cleanName(s.name),color:s.color|0,colorSet:!!s.colorSet};
    step=3;                                   // a returning player goes straight to their fighter
  }
  const okEntry=x=>x&&FIGHTERS[x.key]&&[0,1,2].includes(x.str)&&[0,1,2].includes(x.size)&&Array.isArray(x.ups)&&x.ups.length<80&&Number.isInteger(x.cleared)&&x.cleared>=0;
  const bd=JSON.parse(localStorage.getItem('brawl.board2'));
  if(bd&&bd.date===board.date&&Array.isArray(bd.bots)&&bd.bots.length===BOTS&&bd.bots.every(okEntry))board=bd;
  const td=JSON.parse(localStorage.getItem('brawl.today2'));
  if(td&&td.date===today.date&&okEntry(td))today={date:td.date,cleared:td.cleared,key:td.key,str:td.str,size:td.size,name:Names.safe(td.name,FIGHTERS[td.key].name),color:okColor(td.color)?td.color:FIGHTERS[td.key].color,ups:td.ups};
  const mn=JSON.parse(localStorage.getItem('brawl.mine'));
  if(mn&&mn.date===myBest.date&&mn.f&&typeof mn.f==='object')for(const k of Object.keys(mn.f).slice(0,200)){
    const x=mn.f[k];
    if(okEntry(x)&&x.key===k&&x.cleared>0)myBest.f[k]={cleared:x.cleared,key:k,str:x.str,size:x.size,name:Names.safe(x.name,FIGHTERS[k].name),color:okColor(x.color)?x.color:FIGHTERS[k].color,ups:x.ups,seed:x.seed>>>0,proof:typeof x.proof==='string'?x.proof:''};
  }
}catch(e){}
if(!me.colorSet)me.color=PALETTE.indexOf(FIGHTERS[me.key].color);
deck=shuffled(ROSTER);
Net.init();
// ----- the automatic daily video -----
// tools/duel-video.js opens the page as ?video=YYYY-MM-DD in a browser nobody is watching. The page then reads that
// day's ladder, plays every climb's proof again and keeps only those that pass (whatever NET.proof says), and records
// the duel between the best fighters of the top two players. What happened is left in window.__duel for the tool:
// state 'done' (with the file and the words for the title), 'skip' (nothing worth posting) or 'error'.
const VIDEO=(()=>{try{const m=/[?&]video=(\d{4}-\d{2}-\d{2})(?:&|$)/.exec(location.search||'');return m?m[1]:''}catch(e){return ''}})();
const VIDEO_MIN=(()=>{try{const m=/[?&]min=(\d)(?:&|$)/.exec(location.search||'');return m?+m[1]:1}catch(e){return 1}})();   // real players the duel needs
async function autoVideo(day){
  const out=window.__duel={state:'starting',day,rules:RULES,build:BUILD};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    pinnedDay=day;Net.strict=true;Net.id='';
    board={date:day,bots:[]};today={date:day,cleared:0};myBest={date:day,f:{}};
    while(!boardReady())addBot();
    out.state='reading';
    for(let k=0;k<4&&!Net.ok;k++){await Net.pull(day);if(!Net.ok)await wait(1500)}
    if(!Net.ok)throw new Error('the ladder could not be read');
    out.state='checking';
    while(Net.pending()){Net.verifyStep(40);await wait(0)}
    Net.settle();
    out.entries=Net.all.length;out.rejected=Net.rejected();
    const pair=duelPair(),real=pair.filter(r=>r.player).length;
    out.players=new Set(Net.rows.map(p=>p.id)).size;
    if(pair.length<2||real<VIDEO_MIN){out.state='skip';out.reason=real+' proven player'+(real===1?'':'s')+' in the top two that day; '+VIDEO_MIN+' needed';return}
    if(!(window.Broadcast&&Broadcast.supported&&Broadcast.supported()))throw new Error('this browser cannot record');
    out.state='sound';
    muted=false;audioOn();
    for(let k=0;k<100&&!sfxBuf;k++){audioOn();await wait(100)}
    out.sound=!!sfxBuf&&!!actx&&actx.state==='running';
    out.state='recording';
    window.__duelFile=null;
    Broadcast.clap=true;                                // a flash and a beep at the start, for lining sound up with picture
    Broadcast.start();startDuel();
    for(let k=0;k<3000&&!window.__duelFile;k++)await wait(100);
    const f=window.__duelFile;
    if(!f||!f.ok)throw new Error('the recording came out empty'+(f&&f.note?' ('+f.note+')':''));
    const t=[typeOf(duel.a),typeOf(duel.b)],w=duel.winner;
    out.file={name:f.name,type:f.type,size:f.blob.size,secs:f.secs,cut:!!f.cut,clap:Broadcast.CLAP};
    out.duel={a:t[0],b:t[1],who:duel.who.slice(),winner:w,score:duel.score.slice(),rungs:[pair[0].cleared,pair[1].cleared],house:[!pair[0].player,!pair[1].player]};
    out.state='done';
  }catch(e){out.state='error';out.reason=String(e&&e.message||e)}
}
// hands the recorded file to the tool a slice at a time, as base64 text
window.__duelSlice=async(from,to)=>{
  const b=window.__duelFile&&window.__duelFile.blob;if(!b)return '';
  const u=new Uint8Array(await b.slice(from,to).arrayBuffer());let s='';
  for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
  return btoa(s);
};
if(Net.on()&&!VIDEO){
  refreshNet();
  for(const k of Object.keys(myBest.f))if(myBest.f[k].proof)Net.pushClimb(myBest.date,myBest.f[k]);     // in case it never arrived (it cannot be sent twice)
}
// the play log: opening, leaving and coming back, and anything that goes wrong
const openedAt=Date.now();let errs=0;
const ENGINE=(()=>{try{const u=navigator.userAgent||'';return /Firefox\//.test(u)?'gecko':/AppleWebKit/.test(u)&&!/Chrome\/|Chromium\/|Edg\//.test(u)?'webkit':'blink'}catch(e){return ''}})();
log('open',{b:BUILD,ru:RULES,eng:ENGINE,w:window.innerWidth||0,h:window.innerHeight||0,dpr:+(window.devicePixelRatio||1).toFixed(2),touch:'ontouchstart' in window?1:0,back:step===3?1:0,f:me.key,best,today:today.cleared});
document.addEventListener('visibilitychange',()=>log(document.hidden?'hide':'show',{m:mode,r:run?run.rung:0,secs:Math.round((Date.now()-openedAt)/1000),fights:fightNo}));
if(window.addEventListener){
  window.addEventListener('error',ev=>{if(errs++<10)log('err',{m:String(ev.message).slice(0,200),f:String(ev.filename||'').split('/').pop().slice(0,40),l:ev.lineno|0,c:ev.colno|0,mode})});
  window.addEventListener('unhandledrejection',ev=>{if(errs++<10)log('err',{m:String(ev.reason&&ev.reason.message||ev.reason).slice(0,200),mode})});
}
$('build').textContent=BUILD;
sfxFetch();
render();practice();
requestAnimationFrame(frame);
if(VIDEO)autoVideo(VIDEO);
