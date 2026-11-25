// ---------- Page ----------
const BUILD='Build 16';   // bump on every deploy so the phone shows which version is loaded
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const PALETTE=ROSTER.map(k=>FIGHTERS[k].color);
const BOTS=14;           // house fighters on each day's ladder until real players fill it
// mode: 'make' (three taps, then a name), 'fight', 'pick' (choose an upgrade), 'over', 'board' (today's ladder), 'duel'
let mode='make',step=0,me={key:'blade',str:-1,size:-1,name:'',color:0,colorSet:false},deck=[],deckAt=0;
let run=null,match=null,you=-1,loud=false,choice=[],best=0,speed=1,muted=false,last=0,acc=0,overFor=0,shake=0;
let board={date:'',bots:[]},today={date:'',cleared:0},duel=null,backTo='make';
const fx={floats:[],sparks:[],rings:[],bolts:[]},floats=fx.floats,sparks=fx.sparks,rings=fx.rings,bolts=fx.bolts;   // short-lived effects, shared with the video recorder
const newSeed=()=>(Math.random()*2147483647)|0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanName=s=>String(s||'').replace(/[^A-Za-z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,12);
const ready=()=>me.str>=0&&me.size>=0;
const myBuild=()=>makeBuild(me.key,me.str,me.size,cleanName(me.name)||FIGHTERS[me.key].name,PALETTE[me.color]);
function shuffled(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function summary(b){
  if(!b.ups.length)return 'no upgrades yet';
  const n={};for(const id of b.ups)n[id]=(n[id]||0)+1;
  return Object.keys(n).map(id=>upName(b,id)+(n[id]>1?' ×'+n[id]:'')).join(', ');
}

// ----- today's ladder -----
// Until entries are stored on a server, the ladder is filled with house fighters. Each one really plays a climb,
// seeded by the date, so the board is the same all day and changes at midnight.
function dayKey(){const d=new Date();return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0')}
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
function standings(){
  const rows=board.bots.map((b,i)=>({house:true,cleared:b.cleared,e:b,order:i}));
  Net.others().forEach((p,i)=>rows.push({player:true,cleared:p.cleared,e:p,order:20+i}));
  if(today.cleared>0)rows.push({you:true,cleared:today.cleared,e:today,order:9999});
  rows.sort((a,b)=>b.cleared-a.cleared||a.order-b.order);       // ties go to whoever was there first
  return rows;
}
function target(){const r=standings().filter(x=>!x.you);return r.length>1?r[1].cleared+1:1}
const inDuel=()=>standings().slice(0,2).some(x=>x.you);
const owner=r=>r.you?'You':r.player?r.e.name:'House';
function netLine(){
  if(!Net.on())return '';
  if(!Net.ok)return 'Connecting to today\u2019s ladder\u2026';
  const n=Net.others().length+(today.cleared>0?1:0);
  return n?n+' player'+(n>1?'s':'')+' on today\u2019s ladder':'No players on today\u2019s ladder yet. Be the first.';
}
// a rival on a rung is sometimes another player's fighter, cut back to what they had at that height
function pickRival(rung){
  const pool=Net.others();
  if(!pool.length||Math.random()<.5)return rival(rung,Math.random);
  const p=pool[(Math.random()*pool.length)|0],b=makeBuild(p.key,rung>1?p.str:-1,p.size,p.name,p.color);
  const n=Math.min(p.ups.length,Math.floor((rung-1)*RIVAL_UPS));
  for(let k=0;k<n;k++)if(canTake(b,p.ups[k]))addUpgrade(b,p.ups[k]);
  const sc=RIVAL_START+RIVAL_GROW*(rung-1);b.hp*=sc;b.dmg*=sc;b.owner=p.name;
  return b;
}
const whose=b=>(b.owner?esc(b.owner)+'\u2019s ':'')+typeOf(b);
function goalLine(){
  if(!boardReady())return 'Setting up today’s ladder…';
  if(inDuel())return 'You are in today’s duel. Climb higher to make it safe.';
  return 'Today’s duel is between the top two. Clear <b>'+target()+'</b> rungs to get in.';
}

// ----- sound -----
// Every sound is a slice of one recorded file (sfx/brawl.mp3, built by tools/sfx-build.js from public-domain packs;
// brawl-sfx.js says where each slice is). Several takes per sound and a little pitch drift keep repeats from grating;
// a minimum gap per sound, a cap on voices and a compressor keep fast fights from turning into noise.
let actx=null,bus=null,comp=null,sfxRaw=null,sfxBuf=null,sfxBusy=false,voices=0;
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
  try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){actx=null}
  sfxDecode();
}
function sfxFetch(){
  if(typeof fetch!=='function'||typeof SFX_FILE==='undefined')return;
  try{fetch(SFX_FILE).then(r=>r&&r.ok?r.arrayBuffer():null).then(b=>{sfxRaw=b;sfxDecode()}).catch(()=>{})}catch(e){}
}
function sfxDecode(){
  if(!actx||!sfxRaw||sfxBuf||sfxBusy||!actx.decodeAudioData)return;
  sfxBusy=true;
  const done=b=>{sfxBuf=b;sfxRaw=null;sfxBusy=false},fail=()=>{sfxBusy=false;sfxRaw=null};
  try{const p=actx.decodeAudioData(sfxRaw,done,fail);if(p&&p.catch)p.catch(()=>{})}catch(e){fail()}
}
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
  blaster:'plate',archer:'twig',miner:'',volcano:'',comet:'tick',bramble:'twig',bees:'tin',ghost:'thump',snow:'thump',tesla:'',magnet:'',mirror:'glass',spider:'soft',
  necro:'wood',painter:'tick',hunter:'wood',beacon:'tick',drum:'thump',wizard:'glass'};
const HIT_VOL={archer:.7};
const SHOT_SFX={blaster:'twang',archer:'loose',wizard:'cast',hunter:'whoosh',pirate:'whoosh'};
const UI_SFX={weapon:'place',str:'place',size:'place',others:'page',back:'page',col:'click',new:'page',start:'draw',up:'coins',duel:'draw',recduel:'draw',board:'open',closeboard:'page'};
function hitSound(e){
  if(e.ind){sfx('tick',.6);return}
  const n=HIT_SFX[e.by];
  if(n===''){return}
  sfx(n||'punch',(.5+Math.min(.5,e.dmg/45))*(HIT_VOL[e.by]||1),e.crit?.9:1);
  if(e.crit)sfx('clang',.7,1.15);
}

// ----- effects from sim events -----
function burst(x,y,n,lo,hi,life,col){for(let i=0;i<n&&sparks.length<260;i++){const a=Math.random()*TAU,s=lo+Math.random()*(hi-lo);sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,col})}}
function say(x,y,txt,col,big){if(floats.length<40)floats.push({x:x+(Math.random()-.5)*20,y:y-26,txt,life:.8,col,big})}
function ring(x,y,r0,r1,life,col,w){rings.push({x,y,r0,r1,life,max:life,col,w:w||2})}
function onEvents(ev){
  for(const e of ev){
    const col=e.i>=0&&match?match.f[e.i].col:'#fff4c2';
    if(e.k==='hit'){
      say(e.x,e.y,'-'+Math.max(1,Math.round(e.dmg))+(e.crit?'!':''),e.crit?'#ffd447':'#ff5a4f',e.crit);
      if(e.dmg>=18||e.crit)shake=Math.max(shake,Math.min(3,e.dmg*.08));
      hitSound(e);
    }else if(e.k==='heal'){say(e.x,e.y,'+'+Math.max(1,Math.round(e.dmg)),'#7ddc5a')}
    else if(e.k==='block'){say(e.x,e.y,'Blocked','#bcd4ff');burst(e.x,e.y,8,60,160,.25);sfx('bell',.8)}
    else if(e.k==='revive'){say(e.x,e.y,'Second life','#ffd447',true);burst(e.x,e.y,24,60,220,.5);sfx('toll',1)}
    else if(e.k==='parry'){burst(e.x,e.y,5,60,180,.25);sfx('clang',.55,1.12)}
    else if(e.k==='bump'){sfx('soft',.4)}
    else if(e.k==='shot'){const n=(match&&e.i>=0&&SHOT_SFX[match.f[e.i].key])||'twang';sfx(n,n==='loose'?.8:.6,n==='loose'?1.2:1)}
    else if(e.k==='mine'){sfx('latch',.6)}
    else if(e.k==='boom'){burst(e.x,e.y,12,80,240,.35);ring(e.x,e.y,6,34,.3,'#ffd447',3);shake=Math.max(shake,4);sfx('boom',.9)}
    else if(e.k==='zap'){
      const pts=[[e.x,e.y]],n=5;
      for(let k=1;k<n;k++){const t=k/n;pts.push([e.x+(e.x2-e.x)*t+(Math.random()-.5)*18,e.y+(e.y2-e.y)*t+(Math.random()-.5)*18])}
      pts.push([e.x2,e.y2]);bolts.push({pts,life:.13});
      sfx('zap',.55);
    }
    else if(e.k==='fade'){ring(e.x,e.y,26,6,.35,col);sfx('fall',.6)}
    else if(e.k==='appear'){ring(e.x,e.y,6,40,.3,col,3);burst(e.x,e.y,10,60,200,.3,col);sfx('rise',.7)}
    else if(e.k==='pull'){ring(e.x,e.y,90,20,1.05,col);sfx('hum',.7)}
    else if(e.k==='blast'){ring(e.x,e.y,10,e.r,.3,col,4);shake=Math.max(shake,3);sfx('thump',1,.8)}
    else if(e.k==='freeze'){say(e.x,e.y,'Frozen','#9fe0ff',true);ring(e.x,e.y,44,24,.4,'#9fe0ff',3);sfx('shatter',.9)}
    else if(e.k==='spawn'){burst(e.x,e.y,5,30,90,.25,col);sfx('pop',.6)}
    else if(e.k==='pop'){burst(e.x,e.y,4,30,100,.2,col);if(!(match&&e.i>=0&&match.f[e.i].key==='archer'))sfx('tick',.5)}
    // generic effects any class can ask for without the page knowing about the class
    else if(e.k==='ring'){ring(e.x,e.y,e.r0||6,e.r||40,e.life||.3,e.col||col,e.w||3)}
    else if(e.k==='text'){say(e.x,e.y,String(e.txt),e.col||col,e.big)}
    else if(e.k==='burst'){burst(e.x,e.y,e.n||10,60,200,.3,e.col||col)}
    else if(e.k==='ko'){burst(e.x,e.y,26,60,300,.6);shake=8;sfx('rumble',1);sfx('iron',1,.8)}
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
function refreshNet(){
  Net.pull(board.date).then(changed=>{
    if(!changed)return;
    if(mode==='board')render();                         // other screens may hold a text box, so only their goal line is touched
    else{const el=$('goal');if(el&&(mode==='make'||mode==='over'))el.innerHTML=goalLine()}
  });
}
function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  fit();
  const playing=mode==='fight'||mode==='duel';
  if(!boardReady()&&!playing)addBot();
  netT+=dt;
  if(Net.on()&&!playing&&netT>15){netT=0;refreshNet()}                 // one house climb per frame, never during a fight
  if(match&&(mode==='make'||playing)){
    acc+=dt*(playing?speed:1);
    let n=0;
    while(acc>=DT&&n<10){snap(match);match.step();onEvents(match.events);acc-=DT;n++}
    if(n===10)acc=0;
    lerpA=match.over?1:acc/DT;
    if(match.over){
      overFor+=dt;
      if(mode==='make'&&overFor>1.2)practice();
      else if(mode==='fight'&&overFor>1)fightDone();
      else if(mode==='duel'&&!duel.done&&overFor>1.2)duelDone();
    }
  }
  if(!(match&&(mode==='make'||playing)))lerpA=1;
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.life-=dt;f.y-=28*dt;if(f.life<=0)floats.splice(i,1)}
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)sparks.splice(i,1)}
  for(let i=rings.length-1;i>=0;i--){rings[i].life-=dt;if(rings[i].life<=0)rings.splice(i,1)}
  for(let i=bolts.length-1;i>=0;i--){bolts[i].life-=dt;if(bolts[i].life<=0)bolts.splice(i,1)}
  shake*=.78;if(shake<.3)shake=0;
  draw();hud();
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
  run={rung:1,build:myBuild(),rival:null};
  nextFight();
}
function nextFight(){
  run.rival=pickRival(run.rung);
  mode='fight';
  begin(createMatch(run.build,run.rival,newSeed()),0,'Rung '+run.rung,true);
  render();
}
function fightDone(){
  if(match.winner===0){
    choice=offers(run.build,Math.random,3);
    if(!choice.length){run.rung++;nextFight();return}      // nothing left to take: just keep climbing
    mode='pick';
    sfx('bell',.8,1,true);
  }else{
    mode='over';
    sfx('door',.9,1,true);
    const cleared=run.rung-1;
    run.record=cleared>best;
    if(run.record){best=cleared;try{localStorage.setItem('brawl.best',String(best))}catch(e){}}
    if(cleared>today.cleared){
      today={date:dayKey(),cleared,key:me.key,str:me.str,size:me.size,name:run.build.name,color:run.build.color,ups:run.build.ups.slice()};
      try{localStorage.setItem('brawl.today2',JSON.stringify(today))}catch(e){}
      Net.push(today.date,today);
    }
  }
  render();
}

// ----- today's duel: the top two on the ladder, best of three -----
function startDuel(){
  const r=standings().slice(0,2);
  if(!boardReady()||r.length<2)return;
  audioOn();
  duel={a:rebuild(r[0].e),b:rebuild(r[1].e),you:r[0].you?0:r[1].you?1:-1,who:[owner(r[0]),owner(r[1])],score:[0,0],round:1,done:false};
  mode='duel';duelRound();
}
function duelRound(){begin(createMatch(duel.a,duel.b,newSeed()),duel.you,'Today’s duel · round '+duel.round,true);render()}
function duelDone(){
  duel.score[match.winner]++;
  if(duel.score[match.winner]>=2){duel.done=true;duel.winner=match.winner;if(window.Broadcast&&Broadcast.finish)Broadcast.finish();sfx('toll',1,1,true);sfx('coins',.8,1,true);render()}
  else{duel.round++;duelRound()}
}

// ----- panel -----
const head=(n,title)=>`<p class="stepn">${n}</p><h2 class="ph">${title}</h2>`;
const card=(id,act,data,title,text,dot,tag)=>`<button type="button" class="card" id="${id}" data-act="${act}" ${data}>${dot?`<i style="background:${dot}"></i>`:''}<span><b>${title}${tag?`<em>${tag}</em>`:''}</b><small>${text}</small></span></button>`;
function makeBody(){
  if(step===0){
    const offer=[0,1,2].map(i=>deck[(deckAt+i)%deck.length]);
    return head('Step 1 of 3 · '+ROSTER.length+' fighters','Choose your champion')+
      offer.map(k=>card('wp-'+k,'weapon',`data-key="${k}"`,FIGHTERS[k].name,FIGHTERS[k].desc,FIGHTERS[k].color)).join('')+
      `<button type="button" id="btnOthers" class="quiet" data-act="others">Show three others</button>`;
  }
  if(step===1)return head('Step 2 of 3','Pick a strength')+
    STRENGTHS.map((s,i)=>card('str-'+i,'str',`data-i="${i}"`,s.label,s.text)).join('')+
    `<button type="button" id="btnBack" class="quiet" data-act="back">Back</button>`;
  if(step===2)return head('Step 3 of 3','Pick a size')+
    SIZES.map((s,i)=>card('size-'+i,'size',`data-i="${i}"`,s.label,s.text)).join('')+
    `<button type="button" id="btnBack" class="quiet" data-act="back">Back</button>`;
  return `<h2 class="ph">Name your ${typeOf(myBuild())}</h2>`+
    `<input id="inName" type="text" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Fighter name" placeholder="${FIGHTERS[me.key].name}" value="${esc(me.name)}">`+
    `<div class="sw">`+PALETTE.map((c,i)=>`<button type="button" id="col-${i}" data-act="col" data-i="${i}" class="${i===me.color?'on':''}" aria-pressed="${i===me.color}" aria-label="Colour ${i+1}"><i style="background:${c}"></i></button>`).join('')+`</div>`+
    `<button type="button" id="btnStart" class="go" data-act="start">Begin the climb</button>`+
    `<p class="ps">Beat a rival, claim a boon, climb a rung. One loss ends the run.</p>`+
    `<p class="ps" id="goal">${goalLine()}</p>`+
    `<button type="button" id="btnNew" class="quiet" data-act="new">Make a different fighter</button>`;
}
function boardBody(){
  const rows=standings(),mine=rows.findIndex(r=>r.you);
  const row=(r,i)=>{
    const b=rebuild(r.e);
    return `<li class="${r.you?'me':''}${i<2?' in':''}"><span class="rk">${i+1}</span><i style="background:${b.color}"></i>`+
      `<span class="nm"><b>${typeOf(b)}</b><small>${r.you?esc(b.name)+' · you':r.player?esc(b.name):'house fighter'}</small></span><span class="rg">${r.cleared}</span></li>`;
  };
  return `<h2 class="ph">Today’s ladder</h2><p class="ps" id="goal">${goalLine()}</p>`+(netLine()?`<p class="ps" id="netLine">${netLine()}</p>`:'')+
    (boardReady()?`<ol class="lb">`+rows.slice(0,6).map(row).join('')+(mine>=6?row(rows[mine],mine):'')+`</ol>`+
      `<button type="button" id="btnDuel" class="go" data-act="duel">Watch today’s duel</button>`+
      (window.Broadcast&&Broadcast.supported&&Broadcast.supported()?`<button type="button" id="btnRec" data-act="recduel">Record today’s duel as a video</button>`:''):'')+
    `<button type="button" id="btnClose" class="quiet" data-act="closeboard">Back</button>`;
}
function duelBody(){
  // kept short so the arena has the screen; the fighters' names are already above the health bars
  const t=[typeOf(duel.a),typeOf(duel.b)];
  return `<p class="stepn">Today’s duel · best of three</p>`+
    `<p class="duelrow"><span>${t[0]}<small>${esc(duel.who[0])}</small></span><b>${duel.score[0]} – ${duel.score[1]}</b><span>${t[1]}<small>${esc(duel.who[1])}</small></span></p>`+
    (duel.done?`<h2 class="ph">${t[duel.winner]} wins today’s duel</h2>`+
      `<button type="button" id="btnToBoard" class="go" data-act="board">Back to the ladder</button>`
      :`<button type="button" id="btnLeave" class="quiet" data-act="board">Leave the duel</button>`);
}
function render(){
  const P=$('panel'),B=document.body;
  if(B&&B.dataset)B.dataset.mode=mode;                 // the stylesheet gives the arena more room while a fight is on
  $('btnSpeed').hidden=!(mode==='fight'||mode==='duel');
  $('btnBoard').hidden=!(mode==='make'||mode==='over');
  if(mode==='make')P.innerHTML=makeBody();
  else if(mode==='board')P.innerHTML=boardBody();
  else if(mode==='duel')P.innerHTML=duelBody();
  else if(mode==='fight'){
    P.innerHTML=`<p class="ps"><b>You, ${typeOf(run.build)}:</b> ${summary(run.build)}</p><p class="ps"><b>${whose(run.rival)}:</b> ${FIGHTERS[run.rival.key].desc}${run.rival.ups.length?' ('+summary(run.rival)+')':''}</p>`;
  }else if(mode==='pick'){
    const have=id=>{let n=0;for(const x of run.build.ups)if(x===id)n++;return n};
    P.innerHTML=head('Rung '+run.rung+' cleared · you are a '+typeOf(run.build),'Claim a boon')+
      choice.map(id=>card('up-'+id,'up',`data-key="${id}"`,upName(run.build,id),upText(run.build,id),id==='sig'?run.build.color:null,have(id)?'you have '+have(id):'')).join('');
  }else{
    const cleared=run.rung-1;
    P.innerHTML=`<h2 class="ph">${cleared?'Your '+typeOf(run.build)+' climbed '+cleared+' rung'+(cleared>1?'s':''):'Out on the first rung'}</h2>`+
      `<p class="ps">${run.record?'New best. ':'Your best is '+best+'. '}Beaten by ${run.rival.owner?'':'a '}${whose(run.rival)}.</p>`+
      `<p class="ps" id="goal">${goalLine()}</p>`+
      `<button type="button" id="btnAgain" class="go" data-act="start">Climb again</button>`+
      `<button type="button" id="btnNew" class="quiet" data-act="new">Make a different fighter</button>`;
  }
}
function save(){try{localStorage.setItem('brawl.fighter',JSON.stringify(me))}catch(e){}}
$('panel').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b||b.disabled)return;
  const act=b.dataset.act;
  audioOn();sfx(UI_SFX[act]||'click',1,1,true);
  if(act==='weapon'){if(!FIGHTERS[b.dataset.key])return;me.key=b.dataset.key;if(!me.colorSet)me.color=ROSTER.indexOf(me.key);step=1;save();render();practice()}
  else if(act==='others'){deckAt=(deckAt+3)%deck.length;render()}
  else if(act==='str'){me.str=+b.dataset.i;step=2;save();render();practice()}
  else if(act==='size'){me.size=+b.dataset.i;step=3;save();render();practice()}
  else if(act==='back'){step=Math.max(0,step-1);render()}
  else if(act==='col'){me.color=+b.dataset.i;me.colorSet=true;save();render();practice()}
  else if(act==='new'){mode='make';step=0;me.str=-1;me.size=-1;deck=shuffled(ROSTER);deckAt=0;save();render();practice()}
  else if(act==='start')startClimb();
  else if(act==='up'){
    if(mode!=='pick'||!choice.includes(b.dataset.key))return;
    addUpgrade(run.build,b.dataset.key);run.rung++;nextFight();
  }
  else if(act==='duel')startDuel();
  else if(act==='recduel'){if(window.Broadcast&&Broadcast.start)Broadcast.start();startDuel()}
  else if(act==='board'){mode='board';render()}
  else if(act==='closeboard'){mode=backTo;render();if(mode==='make')practice()}
});
$('panel').addEventListener('input',e=>{
  // typing must not rebuild the panel, or the keyboard would close on every letter
  if(e.target.id!=='inName')return;
  me.name=cleanName(e.target.value);
  if(match&&mode==='make'){match.f[0].label=me.name||FIGHTERS[me.key].name;setNames()}
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
$('btnBoard').addEventListener('click',()=>{if(mode!=='make'&&mode!=='over')return;audioOn();sfx('open',1,1,true);backTo=mode;mode='board';render()});
$('btnSpeed').addEventListener('click',()=>{sfx('click',1,1,true);speed=speed===1?2:speed===2?4:1;$('btnSpeed').textContent='Speed '+speed+'×';try{localStorage.setItem('brawl.speed',String(speed))}catch(e){}});
$('btnSound').addEventListener('click',()=>{muted=!muted;$('btnSound').setAttribute('aria-pressed',String(!muted));if(!muted){audioOn();sfx('click',1,1,true)}});

board.date=today.date=dayKey();
try{
  const v=parseInt(localStorage.getItem('brawl.best'),10);if(Number.isFinite(v)&&v>0)best=v;
  const sp=parseInt(localStorage.getItem('brawl.speed'),10);if([1,2,4].includes(sp)){speed=sp;$('btnSpeed').textContent='Speed '+speed+'×'}
  const s=JSON.parse(localStorage.getItem('brawl.fighter'));
  if(s&&FIGHTERS[s.key]&&[0,1,2].includes(s.str)&&[0,1,2].includes(s.size)&&s.color>=0&&s.color<PALETTE.length){
    me={key:s.key,str:s.str,size:s.size,name:cleanName(s.name),color:s.color|0,colorSet:!!s.colorSet};
    step=3;                                   // a returning player goes straight to their fighter
  }
  const okEntry=x=>x&&FIGHTERS[x.key]&&[0,1,2].includes(x.str)&&[0,1,2].includes(x.size)&&Array.isArray(x.ups)&&x.ups.length<80&&Number.isInteger(x.cleared)&&x.cleared>=0;
  const bd=JSON.parse(localStorage.getItem('brawl.board2'));
  if(bd&&bd.date===board.date&&Array.isArray(bd.bots)&&bd.bots.length===BOTS&&bd.bots.every(okEntry))board=bd;
  const td=JSON.parse(localStorage.getItem('brawl.today2'));
  if(td&&td.date===today.date&&okEntry(td))today={date:td.date,cleared:td.cleared,key:td.key,str:td.str,size:td.size,name:cleanName(td.name),color:PALETTE.includes(td.color)?td.color:PALETTE[0],ups:td.ups};
}catch(e){}
if(!me.colorSet)me.color=ROSTER.indexOf(me.key);
deck=shuffled(ROSTER);
Net.init();
if(Net.on()){refreshNet();if(today.cleared>0)Net.push(today.date,today)}
$('build').textContent=BUILD;
sfxFetch();
render();practice();
requestAnimationFrame(frame);
