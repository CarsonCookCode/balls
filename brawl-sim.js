//<sim>
// Pure simulation, no DOM. Two balls bounce around a square arena at constant speed; each class brings one mechanic of its own.
// To add a class: one row in FIGHTERS, one block in BEHAVE, and (on the page side) one block in LOOKS.
const AW=260,DT=1/60,R=24,SUDDEN=30,TIMEOUT=70,GP=13,PC=AW/GP;
// dmg is the class's one damage dial: everything the class does scales from it, so the balance test can tune a single number.
const FIGHTERS={
  blade:  {name:'Knight',     color:'#ff6a4d',hp:100,speed:170,spin:5.0,dmg:27.88,  cd:.35,arms:[{a:0,l:36}],desc:'A long sword that never stops spinning.',sig:['Greatsword','A longer sword that hits harder']},
  mace:   {name:'Ogre',       color:'#ffb23e',hp:100,speed:150,spin:3.2,dmg:29.61,  cd:.6, arms:[{a:0,l:34,head:9}],desc:'Slow and heavy. One hit really hurts.',sig:['Wrecking ball','A bigger, heavier mace head']},
  spikes: {name:'Urchin',     color:'#7ddc5a',hp:100,speed:215,spin:0,  dmg:16.14,  cd:.3, arms:[],desc:'No weapon. Its whole body hurts to touch.',sig:['Longer spines','Its touch hurts 30% more']},
  blaster:{name:'Gunner',     color:'#38c6ff',hp:100,speed:160,spin:0,  dmg:11.31, cd:1,  arms:[],desc:'Fires a shot at its rival, again and again.',sig:['Rapid fire','Shoots 30% faster']},
  leech:  {name:'Vampire',    color:'#c77dff',hp:100,speed:180,spin:6.5,dmg:25.45,  cd:.3, arms:[{a:0,l:20}],heal:.7,desc:'Short fangs. Heals with every bite.',sig:['Deep bite','Heals more with every bite']},
  miner:  {name:'Sapper',     color:'#ffd447',hp:100,speed:175,spin:0,  dmg:20.3,cd:2,  arms:[],desc:'Leaves mines behind for rivals to hit.',sig:['Minefield','More mines, bigger blasts']},
  twin:   {name:'Ninja',      color:'#ff6ac1',hp:100,speed:170,spin:6.0,dmg:15.45,cd:.22,arms:[{a:0,l:24},{a:Math.PI,l:24}],desc:'Two short blades, twice the spin.',sig:['Another blade','One more blade in the whirl']},
  fury:   {name:'Berserker',  color:'#2fd6b5',hp:100,speed:170,spin:4.5,dmg:19.79,  cd:.35,arms:[{a:0,l:30}],rage:17,desc:'Hits harder the closer it is to losing.',sig:['Blood rage','Its rage builds 40% higher']},
  comet:  {name:'Comet',      color:'#ff9d2e',hp:100,speed:215,spin:0,  dmg:6.39,   cd:.3, arms:[],desc:'Leaves a burning trail that hurts to cross.',sig:['Long tail','The trail burns for longer']},
  bramble:{name:'Bramble',    color:'#4fbf5b',hp:100,speed:185,spin:0,  dmg:12.65,  cd:.7, arms:[],desc:'Every wall it touches grows thorns.',sig:['Overgrowth','More thorns, and longer ones']},
  bees:   {name:'Beekeeper',  color:'#f2c230',hp:100,speed:160,spin:0,  dmg:8.48,   cd:1.0,arms:[],desc:'Releases bees that chase the rival.',sig:['Angry swarm','Faster bees that each sting once more']},
  ghost:  {name:'Ghost',      color:'#cfd6ff',hp:100,speed:165,spin:0,  dmg:30.71,  cd:.5, arms:[],desc:'Fades out of reach, then strikes as it returns.',sig:['Haunting','Fades out more often']},
  snow:   {name:'Snowball',   color:'#dff3ff',hp:100,speed:190,spin:0,  dmg:9.84,   cd:.5, arms:[],desc:'Grows with every bounce: bigger, slower, harder hitting.',sig:['Avalanche','Grows faster']},
  tesla:  {name:'Tesla',      color:'#7fe7ff',hp:100,speed:165,spin:0,  dmg:6.06,   cd:.45,arms:[],desc:'Arcs lightning to the rival whenever they get close.',sig:['High voltage','Lightning reaches further']},
  magnet: {name:'Magnet',     color:'#e2526f',hp:100,speed:160,spin:0,  dmg:30.91,  cd:1.4,arms:[],desc:'Drags the rival in, then blasts them away.',sig:['Stronger field','A bigger, harder blast, more often']},
  mirror: {name:'Mirror',     color:'#a9b8d9',hp:100,speed:175,spin:0,  dmg:11.3,   cd:.5, arms:[],desc:'Splits off a copy of itself whenever it is hit.',sig:['Hall of mirrors','More copies, sooner, and they hit harder']},
  spider: {name:'Spider',     color:'#8a6bd1',hp:100,speed:195,spin:0,  dmg:8.88,   cd:.5, arms:[],desc:'Strings webs between walls that slow whoever crosses.',sig:['More silk','More webs at once']},
  necro:  {name:'Necromancer',color:'#6fd3a0',hp:100,speed:160,spin:4.6,dmg:14.61,  cd:.45,arms:[{a:0,l:30}],desc:'Every wound it deals raises a minion.',sig:['Horde','More minions, tougher and quicker']},
  painter:{name:'Painter',    color:'#ff7fd0',hp:100,speed:200,spin:0,  dmg:3.59, cd:.25,arms:[],desc:'Paints the floor. Its paint heals it and hurts the rival.',sig:['Wide brush','Paints a wider stripe']},
  clock:  {name:'Clockmaker', color:'#d9b36c',hp:100,speed:160,spin:4.2,dmg:21.34,  cd:.4, arms:[{a:0,l:34},{a:Math.PI,l:20,d:.6,rate:.4}],desc:'Freezes the rival for a moment every few seconds.',sig:['Slow time','Longer freezes, more often']},
};
const ROSTER=Object.keys(FIGHTERS);
const STRENGTHS=[
  {label:'Tough', text:'35% more health',k:'hp',mul:1.35},
  {label:'Strong',text:'35% more damage',k:'dmg',mul:1.35},
  {label:'Quick', text:'Moves, spins and strikes 50% faster',k:'spd',mul:1.5},
];
const SIZES=[
  {label:'Small', text:'Hard to hit, a little less health',r:18,hp:.9},
  {label:'Medium',text:'No tricks, no weak spots',r:24,hp:1},
  {label:'Big',   text:'Extra health, easy to hit',r:31,hp:1.12},
];
// Upgrades picked during a climb. Every pick is counted in build.p. An upgrade can have:
//   apply(b)   changes the build's numbers when it is picked
//   only(b)    false when this build cannot take it
//   hooks      functions the match calls for a fighter that has it; n is how many times it was picked:
//     init(f,n,m)                  once, after the class's own init; may change the fighter's numbers
//     tick(f,e,m,n,rage)           every step while not frozen; e is the rival
//     guard(f,src,dmg,m,n)         multiplier for a direct hit it is about to take, before its shield (0 = no hit at all)
//     deal(f,v,dmg,m,n)            returns the damage of a direct hit it is about to land
//     take(f,src,dmg,m,n)          returns the damage of a direct hit it is about to take
//     hit(f,v,dmg,m,n)             after it lands a direct hit
//     hurt(f,src,dmg,m,n)          after it takes a direct hit
//     bounce(f,m,n,x,y,nx,ny)      when it hits a wall
//     bump(f,e,m,n)                when the two bodies touch
//     lethal(f,e,m,n)              when its health has reached zero, before Second life; may raise f.hp to survive
//     minion(f,q,m,n)              when it spawns a minion q; shot(f,q,m,n) when it fires a bullet q
//   f.u is a scratch object for upgrade state. Upgrades in other files add to UPGRADES and PREFIX and push their ids to UP_IDS.
// `sig` is the class's own upgrade: its name and text come from the class.
const UPGRADES={
  sig:      {name:'Signature',  text:'',max:3},
  tougher:  {name:'Tougher',    text:'25% more health',max:9,apply:b=>{b.hp*=1.25}},
  sharper:  {name:'Sharper',    text:'25% more damage',max:9,apply:b=>{b.dmg*=1.25}},
  faster:   {name:'Faster',     text:'Move, spin and strike 20% faster',max:4,apply:b=>{b.spd*=1.2}},
  bulk:     {name:'Bulk up',    text:'Bigger body, 35% more health',max:2,apply:b=>{b.r=Math.min(40,b.r*1.2);b.hp*=1.35}},
  shrink:   {name:'Shrink',     text:'Smaller body, harder to hit, 10% quicker',max:2,apply:b=>{b.r=Math.max(14,b.r*.84);b.spd*=1.1}},
  blade:    {name:'Extra blade',text:'One more spinning blade',max:3},
  reach:    {name:'Long reach', text:'Blades and chains 30% longer',max:2,needsArm:true},
  sidearm:  {name:'Sidearm',    text:'Fires a shot every 2 seconds',max:3},
  vampire:  {name:'Vampire',    text:'Heal for 25% of the damage you deal',max:3},
  regen:    {name:'Regrowth',   text:'Heal 2 health every second',max:3},
  armor:    {name:'Armour',     text:'Take 15% less damage',max:4},
  thorns:   {name:'Thorns',     text:'Attackers take 20% of their damage back',max:3},
  poison:   {name:'Poison',     text:'Hits poison for 4 damage a second',max:3},
  frost:    {name:'Frost',      text:'Hits slow the rival for 2 seconds',max:1},
  crit:     {name:'Critical',   text:'20% chance to deal double damage',max:3},
  ambush:   {name:'Ambush',     text:'Your first hit deals triple damage',max:1},
  laststand:{name:'Last stand', text:'50% more damage below 40% health',max:2},
  shield:   {name:'Shield',     text:'Blocks one hit every 8 seconds',max:2},
  revive:   {name:'Second life',text:'Come back once with 15% health',max:1},
};
const UP_IDS=Object.keys(UPGRADES);
const upName=(b,id)=>id==='sig'?FIGHTERS[b.key].sig[0]:UPGRADES[id].name;
const upText=(b,id)=>id==='sig'?FIGHTERS[b.key].sig[1]:UPGRADES[id].text;
// The upgrade a fighter has stacked most gives it the first half of its type: a Knight with Frost is a Frost Knight.
const PREFIX={sig:'Master',tougher:'Stout',sharper:'Savage',faster:'Swift',bulk:'Giant',shrink:'Tiny',blade:'Whirling',reach:'Long-arm',sidearm:'Armed',vampire:'Blood',
  regen:'Undying',armor:'Iron',thorns:'Thorned',poison:'Plague',frost:'Frost',crit:'Lucky',ambush:'Shadow',laststand:'Defiant',shield:'Shielded',revive:'Twice-born'};
function typeOf(b){
  let top=null,n=0;const c={};
  for(const id of b.ups){c[id]=(c[id]||0)+1;if(c[id]>n){n=c[id];top=id}}
  const pre=top?PREFIX[top]:b.str>=0?STRENGTHS[b.str].label:'';
  return (pre?pre+' ':'')+FIGHTERS[b.key].name;
}
// How the ladder gets harder: a rival's health and damage are multiplied by rivalScale(rung), and it has RIVAL_UPS upgrades per rung.
// The curve starts gentle and steepens. A straight line that is kind early lets a good build outgrow the rivals for ever.
const RIVAL_START=.70,RIVAL_GROW=.06,RIVAL_ACC=.004,RIVAL_UPS=.5;
const rivalScale=rung=>RIVAL_START+RIVAL_GROW*(rung-1)+RIVAL_ACC*(rung-1)*(rung-1);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// A build is everything a match needs to know about one fighter.
function makeBuild(key,str,size,name,color){
  const z=SIZES[size>=0?size:1],b={key,str:str>=0?str:-1,size:size>=0?size:1,hp:z.hp,dmg:1,spd:1,r:z.r,p:{},ups:[],name:name||FIGHTERS[key].name,color:color||FIGHTERS[key].color};
  if(str>=0)b[STRENGTHS[str].k]*=STRENGTHS[str].mul;
  return b;
}
function canTake(b,id){
  const U=UPGRADES[id];let n=0;
  for(const x of b.ups)if(x===id)n++;
  if(n>=U.max)return false;
  if(U.needsArm&&!(FIGHTERS[b.key].arms.length||b.p.blade))return false;
  if(U.only&&!U.only(b))return false;
  return true;
}
function addUpgrade(b,id){const U=UPGRADES[id];if(U.apply)U.apply(b);b.p[id]=(b.p[id]||0)+1;b.ups.push(id)}
function offers(b,rnd,n){
  const pool=UP_IDS.filter(id=>canTake(b,id)),out=[];
  // The class's own upgrade is the one players want most, and among sixty it would rarely come up, so it gets a seat
  // in about a third of the offers a player sees (and now and then in a house rival's build).
  if(pool.includes('sig')&&rnd()<(n>1?.32:.1)){out.push('sig');pool.splice(pool.indexOf('sig'),1)}
  while(out.length<n&&pool.length)out.push(pool.splice((rnd()*pool.length)|0,1)[0]);
  return out;
}
// The rival on a rung: a house fighter with some upgrades of its own and stats that rise a little every rung.
function rival(rung,rnd){
  const key=ROSTER[(rnd()*ROSTER.length)|0],b=makeBuild(key,rung>1?(rnd()*3)|0:-1,1);
  const n=Math.floor((rung-1)*RIVAL_UPS);
  for(let k=0;k<n;k++){const o=offers(b,rnd,1);if(o.length)addUpgrade(b,o[0])}
  const s=rivalScale(rung);
  b.hp*=s;b.dmg*=s;
  return b;
}

function distPS(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy||1e-9;
  let t=((px-x1)*dx+(py-y1)*dy)/l2;t=t<0?0:t>1?1:t;
  const qx=x1+dx*t-px,qy=y1+dy*t-py;
  return Math.sqrt(qx*qx+qy*qy);
}
function segX(p,q){
  const o=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
  const d1=o(q[0],q[1],q[2],q[3],p[0],p[1]),d2=o(q[0],q[1],q[2],q[3],p[2],p[3]),d3=o(p[0],p[1],p[2],p[3],q[0],q[1]),d4=o(p[0],p[1],p[2],p[3],q[2],q[3]);
  return ((d1>0)!==(d2>0))&&((d3>0)!==(d4>0));
}
// each arm as [x1,y1,x2,y2,headRadius,damage,isExtraBlade]
function segs(f){
  const out=[];
  if(f.gone)return out;
  for(const a of f.arms){
    const an=f.ang*a.rate+a.a,c=Math.cos(an),s=Math.sin(an);
    out.push([f.x+c*f.r,f.y+s*f.r,f.x+c*(f.r+a.l),f.y+s*(f.r+a.l),a.head,a.dmg,a.extra]);
  }
  return out;
}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mine=(f,m,kind)=>{let n=0;for(const q of m.minions)if(q.own===f.i&&q.kind===kind)n++;return n};

// What each class does beyond bouncing and (for some) swinging arms. All hooks are optional:
//   init(f,m)                 once, before the match
//   tick(f,e,m,rage)          every step while not frozen; e is the rival
//   bounce(f,m,x,y,nx,ny)     when it hits a wall at (x,y); (nx,ny) points back into the arena
//   touch(f,e)                damage dealt on body contact (0 for none)
//   fast(f)                   speed multiplier for this step
//   guard(f,src,dmg,m)        multiplier for a direct hit it is about to take (1 = full, 0 = no hit at all)
//   hurt(f,src,dmg,m)         after it takes a direct hit
//   dealt(f,v,dmg,m)          after it lands a direct hit
const BEHAVE={
  spikes:{touch:f=>FIGHTERS.spikes.dmg*(1+.3*f.sig)},
  blaster:{tick(f,e,m){
    f.timer-=DT;
    if(f.timer<=0){f.timer=FIGHTERS.blaster.cd/f.spdMul/(1+.3*f.sig);m.shoot(f,FIGHTERS.blaster.dmg)}
  }},
  miner:{
    init(f){f.s.mines=[]},
    tick(f,e,m,rage){
      const D=FIGHTERS.miner,M=f.s.mines;
      f.timer-=DT;
      if(f.timer<=0){f.timer=D.cd/f.spdMul;if(M.length<5+2*f.sig){M.push({x:f.x,y:f.y,age:0});m.events.push({k:'mine',x:f.x,y:f.y,i:f.i})}}
      for(let i=M.length-1;i>=0;i--){
        const q=M[i];q.age+=DT;
        if(q.age>.5&&!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+7){
          m.events.push({k:'boom',x:q.x,y:q.y});
          m.hurt(e,D.dmg*(1+.25*f.sig)*f.dmgMul*rage,f);m.knock(e,q);M.splice(i,1);
        }
      }
    }},
  comet:{
    init(f){f.s.trail=[];f.s.acc=0},
    tick(f,e,m,rage){
      const D=FIGHTERS.comet,T=f.s.trail,life=2.2+.9*f.sig;
      f.s.acc+=DT;
      if(f.s.acc>=.05){f.s.acc=0;T.push({x:f.x,y:f.y,t:m.t})}
      while(T.length&&m.t-T[0].t>life)T.shift();
      f.s.life=life;
      if(f.cd<=0&&!e.gone)for(const p of T)if(m.t-p.t>.25&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+3){f.cd=D.cd;m.hurt(e,D.dmg*f.dmgMul*rage,f);break}
    }},
  bramble:{
    init(f){f.s.thorns=[]},
    bounce(f,m,x,y,nx,ny){
      const T=f.s.thorns,len=26+5*f.sig;
      T.push({x,y,tx:x+nx*len,ty:y+ny*len,cd:0,born:m.t});
      if(T.length>10+4*f.sig)T.shift();
    },
    tick(f,e,m,rage){
      const D=FIGHTERS.bramble;
      for(const t of f.s.thorns){
        if(t.cd>0){t.cd-=DT;continue}
        if(!e.gone&&distPS(e.x,e.y,t.x,t.y,t.tx,t.ty)<e.r){t.cd=D.cd;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
      }
    }},
  bees:{
    init(f){f.s.t=.8},
    tick(f,e,m){
      const D=FIGHTERS.bees;
      f.s.t-=DT;
      if(f.s.t<=0){
        f.s.t=D.cd/f.spdMul;
        if(mine(f,m,'bee')<5+2*f.sig)m.spawn(f,f.x,f.y,{kind:'bee',r:5,hp:1+f.sig,dmg:D.dmg,sp:200+15*f.sig,home:700,life:8,wear:1});
      }
    }},
  ghost:{
    init(f){f.s.t=2.2;f.s.dash=0},
    tick(f,e,m){
      const S=f.s;
      S.t-=DT;
      if(S.dash>0)S.dash-=DT;
      if(!f.gone&&S.t<=0){f.gone=true;S.t=1.3;m.events.push({k:'fade',x:f.x,y:f.y,i:f.i})}
      else if(f.gone&&S.t<=0){
        f.gone=false;S.t=Math.max(1.2,2.6-.5*f.sig);S.dash=.55;
        const d=gap(e,f)||1;f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed;
        m.events.push({k:'appear',x:f.x,y:f.y,i:f.i});
      }
    },
    fast:f=>f.s.dash>0?2.3:1,
    touch:f=>f.s.dash>0?FIGHTERS.ghost.dmg:0},
  snow:{
    init(f){f.s.grow=0},
    bounce(f){
      const g=Math.min(14,f.s.grow+.9*(1+.5*f.sig));
      f.r+=g-f.s.grow;f.s.grow=g;f.speed=f.base*(1-.012*g);
    },
    hurt(f,src,dmg,m){
      if(m.t-(f.s.chip||-9)<1.2)return;                   // a hit knocks a chunk off, but not more than once a second or so
      f.s.chip=m.t;
      const lose=f.s.grow*.12;f.s.grow-=lose;f.r-=lose;f.speed=f.base*(1-.012*f.s.grow);
    },
    touch:f=>FIGHTERS.snow.dmg*(1+f.s.grow*.1)},
  tesla:{tick(f,e,m,rage){
    const D=FIGHTERS.tesla,range=80+18*f.sig;
    f.s.range=range;
    if(f.cd<=0&&!e.gone&&gap(e,f)<range+e.r){
      f.cd=D.cd/f.spdMul;
      m.events.push({k:'zap',x:f.x,y:f.y,x2:e.x,y2:e.y,i:f.i});
      m.hurt(e,D.dmg*f.dmgMul*rage,f);
    }
  }},
  magnet:{
    init(f){f.s.t=1.6;f.s.pull=0},
    tick(f,e,m,rage){
      const D=FIGHTERS.magnet,S=f.s;
      if(S.pull>0){
        S.pull-=DT;
        const d=gap(e,f)||1;
        if(!e.gone&&e.stunT<=0){
          // the pull bends the rival's path and also drags it bodily, so the blast usually connects
          e.vx+=(f.x-e.x)/d*1400*DT;e.vy+=(f.y-e.y)/d*1400*DT;m.renorm(e);
          if(d>f.r+e.r){e.x+=(f.x-e.x)/d*35*DT;e.y+=(f.y-e.y)/d*35*DT}
        }
        if(S.pull<=0){
          const rad=80+15*f.sig;
          m.events.push({k:'blast',x:f.x,y:f.y,r:rad,i:f.i});
          if(!e.gone&&d<rad+e.r){m.hurt(e,D.dmg*(1+.25*f.sig)*f.dmgMul*rage,f);m.knock(e,f)}
        }
      }else{
        S.t-=DT;
        if(S.t<=0){S.t=D.cd/f.spdMul/(1+.12*f.sig);S.pull=1.1;m.events.push({k:'pull',x:f.x,y:f.y,i:f.i})}
      }
    }},
  mirror:{
    init(f){f.s.cd=0},
    tick(f){if(f.s.cd>0)f.s.cd-=DT},
    hurt(f,src,dmg,m){
      if(f.s.cd>0||mine(f,m,'copy')>=3+f.sig)return;
      f.s.cd=1.2/(1+.3*f.sig);
      m.spawn(f,f.x,f.y,{kind:'copy',r:13,hp:30,dmg:FIGHTERS.mirror.dmg*.7*(1+.2*f.sig),sp:190,home:0,life:6+f.sig,wear:10});
    },
    touch:()=>FIGHTERS.mirror.dmg},
  spider:{
    init(f){f.s.webs=[];f.s.last=null},
    bounce(f,m,x,y){
      const W=f.s.webs;
      if(f.s.last&&Math.hypot(x-f.s.last.x,y-f.s.last.y)>40){W.push({x1:f.s.last.x,y1:f.s.last.y,x2:x,y2:y,t:m.t,cd:0});if(W.length>3+2*f.sig)W.shift()}
      f.s.last={x,y};
    },
    tick(f,e,m,rage){
      const D=FIGHTERS.spider,W=f.s.webs;
      while(W.length&&m.t-W[0].t>10)W.shift();
      for(const w of W){
        if(w.cd>0)w.cd-=DT;
        if(!e.gone&&distPS(e.x,e.y,w.x1,w.y1,w.x2,w.y2)<e.r){
          e.slowT=Math.max(e.slowT,.5);
          if(w.cd<=0){w.cd=.5;m.hurt(e,D.dmg*.35*f.dmgMul*rage,f)}
        }
      }
    },
    touch:(f,e)=>FIGHTERS.spider.dmg*(e.slowT>0?1.6:1)},
  necro:{
    init(f){f.s.cd=0},
    tick(f){if(f.s.cd>0)f.s.cd-=DT},
    dealt(f,v,dmg,m){
      if(f.s.cd>0||mine(f,m,'bone')>=3+f.sig)return;
      f.s.cd=.8;
      m.spawn(f,v.x,v.y,{kind:'bone',r:10,hp:6+3*f.sig,dmg:FIGHTERS.necro.dmg*.5,sp:125+12*f.sig,home:400,life:9+2*f.sig,wear:3});
    }},
  painter:{tick(f,e,m,rage){
    const D=FIGHTERS.painter,P=m.paint,w=f.sig;
    const cx=Math.min(GP-1,Math.max(0,(f.x/PC)|0)),cy=Math.min(GP-1,Math.max(0,(f.y/PC)|0));
    for(let y=Math.max(0,cy-w);y<=Math.min(GP-1,cy+w);y++)for(let x=Math.max(0,cx-w);x<=Math.min(GP-1,cx+w);x++)P[y*GP+x]=f.i;
    f.hp=Math.min(f.max,f.hp+f.max*.006*DT);              // it is always standing on its own paint
    const c=Math.min(GP-1,Math.max(0,(e.y/PC)|0))*GP+Math.min(GP-1,Math.max(0,(e.x/PC)|0));
    if(P[c]===f.i&&f.cd<=0&&!e.gone){P[c]=-1;f.cd=D.cd;m.hurt(e,D.dmg*f.dmgMul*rage,f)}   // the rival scuffs the paint away as it burns
  }},
  clock:{
    init(f){f.s.t=3},
    tick(f,e,m){
      f.s.t-=DT;
      if(f.s.t<=0){
        f.s.t=4.2-.45*f.sig;
        if(!e.gone){e.stunT=.9+.35*f.sig;m.events.push({k:'freeze',x:e.x,y:e.y,i:e.i})}
      }
    }},
};

function createMatch(A,B,seed){
  const rnd=mulberry32(seed),bullets=[],minions=[],events=[],paint=new Int8Array(GP*GP).fill(-1);
  const F=[mk(A,0),mk(B,1)];
  const m={f:F,bullets,minions,events,paint,t:0,over:false,winner:-1,step,rnd,hurt,knock,renorm,shoot,spawn};
  for(const f of F){const H=BEHAVE[f.key];if(H&&H.init)H.init(f,m);for(const h of f.uh)if(h[0].init)h[0].init(f,h[1],m)}
  function mk(b,i){
    const D=FIGHTERS[b.key],P=b.p||{},sig=P.sig||0,a=rnd()*6.283,sp=D.speed*b.spd,hp=D.hp*b.hp,reach=1+.3*(P.reach||0);
    const arms=D.arms.map(o=>({a:o.a,l:o.l*reach,head:o.head||0,dmg:D.dmg*(o.d||1),extra:0,rate:o.rate||1}));
    if(b.key==='blade')for(const o of arms){o.l*=1+.25*sig;o.dmg*=1+.15*sig}
    if(b.key==='mace')for(const o of arms){o.head+=3*sig;o.dmg*=1+.2*sig}
    if(b.key==='twin')for(let k=0;k<sig;k++)arms.push({a:[Math.PI/2,Math.PI*1.5,Math.PI/4][k],l:24*reach,head:0,dmg:D.dmg,extra:0,rate:1});
    const slots=b.key==='twin'?[2.2,5.3,.9]:D.arms.length===1?[Math.PI,Math.PI/2,Math.PI*1.5]:D.arms.length===2?[Math.PI/2,Math.PI*1.5,Math.PI/4]:[0,Math.PI,Math.PI/2];
    for(let k=0;k<(P.blade||0)&&k<3;k++)arms.push({a:slots[k],l:28*reach,head:0,dmg:10,extra:1,rate:1});
    const uh=[];for(const id in P){const U=UPGRADES[id];if(U&&U.hooks&&P[id]>0)uh.push([U.hooks,P[id]])}
    return {u:{},uh,key:b.key,i,x:i?AW-80:80,y:AW/2+(rnd()-.5)*80,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:b.r,speed:sp,base:sp,hp,max:hp,
      dmgMul:b.dmg,spdMul:b.spd,sig,ang:rnd()*6.283,dir:i?-1:1,cd:0,xcd:0,pcd:0,timer:.4+rnd()*.6,flash:0,aim:0,arms,
      spin:D.spin||(arms.length?4.5:0),label:b.name,col:b.color,stunT:0,gone:false,s:{},
      regen:2*(P.regen||0),armor:Math.pow(.85,P.armor||0),vamp:.25*(P.vampire||0)+(D.heal?D.heal*(1+.3*sig):0),thorns:.2*(P.thorns||0),
      poison:4*(P.poison||0),frost:P.frost||0,crit:.2*(P.crit||0),ambush:P.ambush||0,last:.5*(P.laststand||0),
      shield:P.shield?8/P.shield:0,shieldT:0,revives:P.revive||0,side:P.sidearm?2/P.sidearm:0,sideT:1,poisonT:0,poisonDps:0,slowT:0};
  }
  function renorm(f){
    const sp=Math.sqrt(f.vx*f.vx+f.vy*f.vy);
    if(sp<1){const a=rnd()*6.283;f.vx=Math.cos(a)*f.speed;f.vy=Math.sin(a)*f.speed}
    else{f.vx*=f.speed/sp;f.vy*=f.speed/sp}
  }
  function knock(v,s){
    const dx=v.x-s.x,dy=v.y-s.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    v.vx+=dx/d*v.speed*.9;v.vy+=dy/d*v.speed*.9;renorm(v);
  }
  function spawn(f,x,y,o){
    const a=rnd()*6.283;
    minions.push({own:f.i,kind:o.kind,x:Math.min(AW-o.r,Math.max(o.r,x)),y:Math.min(AW-o.r,Math.max(o.r,y)),vx:Math.cos(a)*o.sp,vy:Math.sin(a)*o.sp,
      r:o.r,hp:o.hp,dmg:o.dmg,sp:o.sp,home:o.home,life:o.life,wear:o.wear,cd:.35,icd:0,col:f.col});
    for(const h of f.uh)if(h[0].minion)h[0].minion(f,minions[minions.length-1],m,h[1]);
    events.push({k:'spawn',x,y,i:f.i});
  }
  // indirect = damage that is not a hit (thorns), so it cannot be blocked or trigger on-hit effects
  function hurt(v,dmg,s,indirect){
    if(v.gone)return;
    let crit=false;
    if(!indirect){
      const G=BEHAVE[v.key];
      if(G&&G.guard){dmg*=G.guard(v,s,dmg,m);if(!(dmg>0))return}
      for(const h of v.uh)if(h[0].guard){dmg*=h[0].guard(v,s,dmg,m,h[1]);if(!(dmg>0))return}
      if(v.shield&&v.shieldT<=0){v.shieldT=v.shield;events.push({k:'block',x:v.x,y:v.y,i:v.i});return}
      if(s.ambush){dmg*=3;s.ambush=0;crit=true}
      if(s.crit&&rnd()<s.crit){dmg*=2;crit=true}
      if(s.last&&s.hp<s.max*.4)dmg*=1+s.last;
      for(const h of s.uh)if(h[0].deal)dmg=h[0].deal(s,v,dmg,m,h[1]);
      for(const h of v.uh)if(h[0].take)dmg=h[0].take(v,s,dmg,m,h[1]);
      if(!(dmg>0))return;
    }
    dmg*=v.armor;
    v.hp-=dmg;v.flash=.12;
    events.push({k:'hit',x:v.x,y:v.y,dmg,i:v.i,crit,by:s.key,ind:!!indirect});
    if(indirect)return;
    if(s.vamp){const h=Math.min(dmg*s.vamp,s.max-s.hp);if(h>.05){s.hp+=h;events.push({k:'heal',x:s.x,y:s.y,dmg:h,i:s.i})}}
    if(s.poison){v.poisonT=3;v.poisonDps=Math.max(v.poisonDps,s.poison)}
    if(s.frost)v.slowT=Math.max(v.slowT,2);
    if(v.thorns&&s.hp>0)hurt(s,dmg*v.thorns,v,true);
    const Hv=BEHAVE[v.key],Hs=BEHAVE[s.key];
    if(Hv&&Hv.hurt)Hv.hurt(v,s,dmg,m);
    if(Hs&&Hs.dealt)Hs.dealt(s,v,dmg,m);
    for(const h of v.uh)if(h[0].hurt)h[0].hurt(v,s,dmg,m,h[1]);
    for(const h of s.uh)if(h[0].hit)h[0].hit(s,v,dmg,m,h[1]);
  }
  function strike(s,ss,v,rage){
    if(s.stunT>0||v.gone)return;
    const D=FIGHTERS[s.key];
    for(const g of ss){
      if(g[6]?s.xcd>0:s.cd>0)continue;
      const near=distPS(v.x,v.y,g[0],g[1],g[2],g[3])<v.r||(g[4]&&Math.hypot(v.x-g[2],v.y-g[3])<v.r+g[4]);
      if(!near)continue;
      let dmg=g[5];
      if(D.rage&&!g[6])dmg+=D.rage*(1+.4*s.sig)*(1-Math.max(0,s.hp)/s.max);
      if(g[6])s.xcd=.4/s.spdMul;else s.cd=D.cd/s.spdMul;
      s.dir*=-1;
      hurt(v,dmg*s.dmgMul*rage,s);knock(v,s);
      return;
    }
  }
  function shoot(f,d){
    const an=f.aim+(rnd()-.5)*.3;
    bullets.push({x:f.x+Math.cos(an)*f.r,y:f.y+Math.sin(an)*f.r,vx:Math.cos(an)*330,vy:Math.sin(an)*330,own:f.i,d});
    for(const h of f.uh)if(h[0].shot)h[0].shot(f,bullets[bullets.length-1],m,h[1]);
    events.push({k:'shot',x:f.x,y:f.y,i:f.i});
  }
  function step(){
    if(m.over)return;
    m.t+=DT;
    const rage=m.t>SUDDEN?1+(m.t-SUDDEN)*.2:1,a=F[0],b=F[1];
    for(const f of F){
      const D=FIGHTERS[f.key],H=BEHAVE[f.key],e=F[1-f.i];
      f.aim=Math.atan2(e.y-f.y,e.x-f.x);
      if(f.slowT>0)f.slowT-=DT;
      if(f.stunT>0)f.stunT-=DT;                          // frozen: nothing below happens
      else{
        const sl=(f.slowT>0?.6:1)*(H&&H.fast?H.fast(f):1);
        f.x+=f.vx*sl*DT;f.y+=f.vy*sl*DT;
        let hx=0,hy=0;
        if(f.x<f.r){f.x=f.r;if(f.vx<0)hx=1;f.vx=Math.abs(f.vx)}else if(f.x>AW-f.r){f.x=AW-f.r;if(f.vx>0)hx=-1;f.vx=-Math.abs(f.vx)}
        if(f.y<f.r){f.y=f.r;if(f.vy<0)hy=1;f.vy=Math.abs(f.vy)}else if(f.y>AW-f.r){f.y=AW-f.r;if(f.vy>0)hy=-1;f.vy=-Math.abs(f.vy)}
        if(H&&H.bounce){
          if(hx)H.bounce(f,m,hx>0?0:AW,f.y,hx,0);
          if(hy)H.bounce(f,m,f.x,hy>0?0:AW,0,hy);
        }
        if(hx||hy)for(const h of f.uh)if(h[0].bounce){if(hx)h[0].bounce(f,m,h[1],hx>0?0:AW,f.y,hx,0);if(hy)h[0].bounce(f,m,h[1],f.x,hy>0?0:AW,0,hy)}
        let spin=f.spin*f.spdMul*(f.slowT>0?.6:1);
        if(D.rage)spin*=1+(1-Math.max(0,f.hp)/f.max)*.8;
        f.ang+=spin*f.dir*DT;
        if(H&&H.tick)H.tick(f,e,m,rage);
        for(const h of f.uh)if(h[0].tick)h[0].tick(f,e,m,h[1],rage);
        if(f.side){f.sideT-=DT;if(f.sideT<=0){f.sideT=f.side;shoot(f,6)}}
      }
      if(f.cd>0)f.cd-=DT;
      if(f.xcd>0)f.xcd-=DT;
      if(f.pcd>0)f.pcd-=DT;
      if(f.flash>0)f.flash-=DT;
      if(f.shieldT>0)f.shieldT-=DT;
      if(f.regen&&f.hp>0)f.hp=Math.min(f.max,f.hp+f.regen*DT);
      if(f.poisonT>0){f.poisonT-=DT;f.hp-=f.poisonDps*rage*DT}
    }
    // bodies bounce off each other; some classes hurt on touch
    if(!a.gone&&!b.gone){
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||.01;
      if(d<a.r+b.r){
        const nx=dx/d,ny=dy/d,ov=a.r+b.r-d;
        a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
        const va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny;
        if(va-vb>0){a.vx+=(vb-va)*nx;a.vy+=(vb-va)*ny;b.vx+=(va-vb)*nx;b.vy+=(va-vb)*ny}
        renorm(a);renorm(b);
        events.push({k:'bump',x:(a.x+b.x)/2,y:(a.y+b.y)/2});
        for(const h of a.uh)if(h[0].bump)h[0].bump(a,b,m,h[1]);
        for(const h of b.uh)if(h[0].bump)h[0].bump(b,a,m,h[1]);
        const Ha=BEHAVE[a.key],Hb=BEHAVE[b.key];
        const ta=Ha&&Ha.touch&&a.cd<=0&&a.stunT<=0?Ha.touch(a,b):0,tb=Hb&&Hb.touch&&b.cd<=0&&b.stunT<=0?Hb.touch(b,a):0;
        if(ta>0){a.cd=FIGHTERS[a.key].cd/a.spdMul;hurt(b,ta*a.dmgMul*rage,a)}
        if(tb>0){b.cd=FIGHTERS[b.key].cd/b.spdMul;hurt(a,tb*b.dmgMul*rage,b)}
      }
    }
    // weapons clash: both spins reverse
    const sa=segs(a),sb=segs(b);
    if(a.pcd<=0&&b.pcd<=0){
      clash:for(const p of sa)for(const q of sb){
        const touch=segX(p,q)||(p[4]&&distPS(p[2],p[3],q[0],q[1],q[2],q[3])<p[4])||(q[4]&&distPS(q[2],q[3],p[0],p[1],p[2],p[3])<q[4]);
        if(touch){a.dir*=-1;b.dir*=-1;a.pcd=b.pcd=.25;events.push({k:'parry',x:(p[2]+q[2])/2,y:(p[3]+q[3])/2});break clash}
      }
    }
    strike(a,sa,b,rage);strike(b,sb,a,rage);
    // shots: blocked by the rival's weapon or minions, otherwise they hurt
    for(let i=bullets.length-1;i>=0;i--){
      const q=bullets[i],e=F[1-q.own],es=q.own===0?sb:sa;
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      let gone=q.x<0||q.x>AW||q.y<0||q.y>AW;
      if(!gone)for(const g of es)if(distPS(q.x,q.y,g[0],g[1],g[2],g[3])<5||(g[4]&&Math.hypot(q.x-g[2],q.y-g[3])<g[4]+4)){gone=true;events.push({k:'parry',x:q.x,y:q.y});break}
      if(!gone)for(const u of minions)if(u.own!==q.own&&Math.hypot(q.x-u.x,q.y-u.y)<u.r+4){gone=true;u.hp-=q.d;break}
      if(!gone&&!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+4){gone=true;hurt(e,q.d*F[q.own].dmgMul*rage,F[q.own])}
      if(gone)bullets.splice(i,1);
    }
    // minions: bees, copies and raised bones. They bounce (or home in), hurt on touch, and wear out.
    for(let i=minions.length-1;i>=0;i--){
      const q=minions[i],o=F[q.own],e=F[1-q.own];
      q.life-=DT;if(q.cd>0)q.cd-=DT;
      if(q.home&&!e.gone){
        const d=gap(e,q)||1;q.vx+=(e.x-q.x)/d*q.home*DT;q.vy+=(e.y-q.y)/d*q.home*DT;
        const sp=Math.sqrt(q.vx*q.vx+q.vy*q.vy)||1;q.vx*=q.sp/sp;q.vy*=q.sp/sp;
      }
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      if(q.x<q.r){q.x=q.r;q.vx=Math.abs(q.vx)}else if(q.x>AW-q.r){q.x=AW-q.r;q.vx=-Math.abs(q.vx)}
      if(q.y<q.r){q.y=q.r;q.vy=Math.abs(q.vy)}else if(q.y>AW-q.r){q.y=AW-q.r;q.vy=-Math.abs(q.vy)}
      if(q.icd>0)q.icd-=DT;                              // a weapon can only cut the same minion a few times a second
      else for(const g of (q.own===0?sb:sa))if(distPS(q.x,q.y,g[0],g[1],g[2],g[3])<q.r+(g[4]||0)){q.hp-=g[5];q.icd=.3;break}
      if(q.hp>0&&!e.gone){
        const dx=q.x-e.x,dy=q.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||.01;
        if(d<e.r+q.r){
          q.x=e.x+dx/d*(e.r+q.r);q.y=e.y+dy/d*(e.r+q.r);
          const vn=q.vx*dx/d+q.vy*dy/d;if(vn<0){q.vx-=2*vn*dx/d;q.vy-=2*vn*dy/d}
          if(q.cd<=0){q.cd=.6;q.hp-=q.wear;hurt(e,q.dmg*o.dmgMul*rage,o)}
        }
      }
      if(q.hp<=0||q.life<=0){events.push({k:'pop',x:q.x,y:q.y,i:q.own});minions.splice(i,1)}
    }
    for(const f of F)if(f.hp<=0)for(const h of f.uh)if(h[0].lethal&&f.hp<=0)h[0].lethal(f,F[1-f.i],m,h[1]);
    for(const f of F)if(f.hp<=0&&f.revives>0){f.revives--;f.hp=f.max*.15;f.poisonT=0;events.push({k:'revive',x:f.x,y:f.y,i:f.i})}
    if(a.hp<=0||b.hp<=0){m.over=true;m.winner=a.hp<=0&&b.hp<=0?(a.hp>=b.hp?0:1):a.hp<=0?1:0}
    else if(m.t>TIMEOUT){m.over=true;m.winner=a.hp/a.max>=b.hp/b.max?0:1}
    if(m.over)events.push({k:'ko',x:F[1-m.winner].x,y:F[1-m.winner].y,i:1-m.winner});
  }
  return m;
}
function quickMatch(A,B,seed){
  const m=createMatch(A,B,seed);
  while(!m.over){m.step();m.events.length=0}
  return m.winner;
}
//</sim>

// Per-class art is registered here by the drawing files; the simulation itself never reads it.
const LOOKS={};
