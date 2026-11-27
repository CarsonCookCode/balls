// Sixth pack of fighter classes for Duel King: ten existential and abstract characters. Each class adds a row to FIGHTERS,
// a block to BEHAVE and its art to LOOKS. The first half is pure simulation (it loads in Node with only brawl-sim.js before
// it); the second half is drawing and only runs when the page asks for it. Every top-level name here starts with p6/P6.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.void   ={name:'Void',     color:'#3b3160',hp:100,speed:120,spin:0,  dmg:12.62,cd:.35, arms:[],desc:'A dark well. Whatever drifts too close is dragged in and hurt.',sig:['Event horizon','Its pull reaches further and drags harder'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.echo   ={name:'Echo',     color:'#4fb8b0',hp:100,speed:170,spin:4.8,dmg:29.55,cd:.45,arms:[{a:0,l:30}],desc:'Every hit it lands rings out again a moment later, where it landed.',sig:['Reverb','Echoes ring wider and repeat once more'],sfx:{hit:'metal',shot:'whoosh'}};
FIGHTERS.paradox={name:'Paradox',  color:'#c95fb0',hp:100,speed:180,spin:0,  dmg:13.5,cd:.5, arms:[],desc:'Every few seconds the two fighters trade health. Lovely when it is losing.',sig:['Unfair trade','It comes out of every trade a little better off'],sfx:{hit:'punch',shot:'whoosh'}};
FIGHTERS.entropy={name:'Entropy',  color:'#8a8468',hp:100,speed:150,spin:0,  dmg:21.81, cd:.6, arms:[],desc:'A spreading rot. Everything inside it crumbles, itself included.',sig:['Heat death','The rot spreads faster and costs it less'],sfx:{hit:'tick',shot:'whoosh'}};
FIGHTERS.dice   ={name:'Dice',     color:'#b8323a',hp:100,speed:175,spin:0,  dmg:15.99,cd:.5, arms:[],desc:'Rolls a die every couple of seconds. A six is a heavy blow; a one hurts itself.',sig:['Loaded dice','Ones turn into sixes more and more often'],sfx:{hit:'thump',shot:'tick'}};
FIGHTERS.shadow ={name:'Shadow',   color:'#4d5273',hp:100,speed:185,spin:0,  dmg:18.53,cd:.6, arms:[],desc:'The rival’s own shadow trails behind it, and bites if they turn back into it.',sig:['Long shadows','One more shadow, further behind'],sfx:{hit:'slash',shot:'whoosh'}};
FIGHTERS.loop   ={name:'Time Loop',color:'#3fa0cf',hp:100,speed:180,spin:0,  dmg:13.41,cd:.45,arms:[],desc:'Hurt it badly and it snaps back to where and how it was three seconds ago.',sig:['Tighter loop','Rewinds sooner and undoes more of the damage'],sfx:{hit:'punch',shot:'whoosh'}};
FIGHTERS.monk   ={name:'Monk',     color:'#e2953a',hp:100,speed:125,spin:0,  dmg:8.51, cd:.6, arms:[],desc:'Does nothing while calm. Touch it and all that calm comes out as one palm strike.',sig:['Deeper calm','Calm builds faster and runs deeper'],sfx:{hit:'heavy',shot:'whoosh'}};
FIGHTERS.gravity={name:'Gravity',  color:'#6f9a3c',hp:100,speed:165,spin:0,  dmg:10.35,cd:.6, arms:[],desc:'Tilts the floor. The rival slides to a wall and it drops on them there.',sig:['Heavier','The floor tilts more often and it lands harder'],sfx:{hit:'heavy',shot:'whoosh'}};
FIGHTERS.mimic  ={name:'Mimic',    color:'#9a6a3c',hp:100,speed:180,spin:0,  dmg:13.82,cd:.5, arms:[],desc:'No attack of its own. It gives back the hardest blow it has just taken.',sig:['Perfect copy','It holds bigger blows and gives back more than it took'],sfx:{hit:'chop',shot:'whoosh'}};
ROSTER.push('void','echo','paradox','entropy','dice','shadow','loop','monk','gravity','mimic');

const p6clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
const p6knock={dealt(f,v,dmg,m){m.knock(v,f)}};
// How squarely two bodies have just met, from .7 (a graze) to 1.3 (head on). Classes that fight by ramming scale their
// touch by it, so a fight does not hinge on one fixed number landing one time more or less.
function p6square(f,e){
  const dx=e.x-f.x,dy=e.y-f.y,d=dhyp(dx,dy)||1,part=((e.vx-f.vx)*dx+(e.vy-f.vy)*dy)/d/((f.speed+e.speed)||1);
  return .7+.6*Math.max(0,Math.min(1,part));
}

// Void: a slow well. A rival inside its reach has its path bent inward and is dragged bodily; only touching the Void hurts.
// Small things that reach it (bees, bones, reflections) are simply swallowed. It has nothing to offer at range.
BEHAVE.void={
  init(f){f.s.range=78},
  tick(f,e,m){
    const S=f.s,range=78+16*f.sig;
    S.range=range;S.grip=0;
    const d=gap(e,f)||1;
    if(!e.gone&&d<range+e.r){
      const k=1-Math.max(0,d-f.r-e.r)/range,pull=(650+180*f.sig)*(.4+.6*k);
      S.grip=k;
      if(e.stunT<=0){e.vx+=(f.x-e.x)/d*pull*DT;e.vy+=(f.y-e.y)/d*pull*DT;m.renorm(e)}
      if(d>f.r+e.r){const drag=20+6*f.sig;e.x+=(f.x-e.x)/d*drag*DT;e.y+=(f.y-e.y)/d*drag*DT}
    }
    for(const q of m.minions){
      if(q.own===f.i)continue;
      const dq=dhyp(f.x-q.x,f.y-q.y)||1;
      if(dq<f.r+q.r+1){q.hp=0;m.events.push({k:'ring',x:q.x,y:q.y,r0:q.r+4,r:1,life:.25,w:2,i:f.i});m.events.push({k:'fx',n:'dark',x:q.x,y:q.y,r:q.r+10,col:'#b9a8ff',i:f.i});m.events.push({k:'fx',n:'seek',x:q.x,y:q.y,to:f.i,num:4,col:'#cdbfff',i:f.i})}
    }
  },
  touch:(f,e)=>FIGHTERS.void.dmg*(1+.15*f.sig)*p6square(f,e),
  dealt(f,v,dmg,m){                                       // effects only: light is torn off the rival and falls into the well
    m.events.push({k:'fx',n:'wave',x:v.x,y:v.y,r0:v.r+12,r:v.r*.4,life:.26,col:'#9a86e8',w:2,i:f.i});
    m.events.push({k:'fx',n:'seek',x:v.x,y:v.y,to:f.i,num:5,col:'#cdbfff',i:f.i});
  }};

// Echo: a tuning fork. Each hit leaves a mark where the rival stood; a second later the mark rings, and hurts if they are
// still near it. With Reverb an echo that lands leaves a fainter mark of its own.
BEHAVE.echo={
  init(f){f.s.q=[];f.s.mute=false;f.s.rad=52},
  dealt(f,v,dmg,m){if(!f.s.mute){f.s.q.push({x:v.x,y:v.y,t:.9,d:dmg*(.7+.08*f.sig),gen:1});m.events.push({k:'fx',n:'wave',x:v.x,y:v.y,r0:3,r:16,life:.3,col:'#bff5ee',w:1.6,i:f.i});m.events.push({k:'fx',n:'stars',x:v.x,y:v.y,num:3,col:'#d7faf6',i:f.i})}},
  tick(f,e,m){
    const S=f.s,Q=S.q,rad=52+8*f.sig;
    S.rad=rad;
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t-=DT;
      if(q.t>0)continue;
      Q.splice(i,1);
      m.events.push({k:'ring',x:q.x,y:q.y,r0:5,r:rad,life:.3,w:2,i:f.i});
      m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:3,r:rad*.62,life:.42,col:'#ffffff',w:1.2,i:f.i});
      m.events.push({k:'fx',n:'flash',x:q.x,y:q.y,r:16,col:'#bff5ee',i:f.i});
      m.events.push({k:'fx',n:'stars',x:q.x,y:q.y,num:4,col:'#bff5ee',i:f.i});
      if(e.gone||dhyp(e.x-q.x,e.y-q.y)>rad+e.r*.5)continue;
      const before=e.hp;
      S.mute=true;m.hurt(e,q.d,f);S.mute=false;
      if(e.hp<before){m.events.push({k:'fx',n:'line',x:q.x,y:q.y,x2:e.x,y2:e.y,col:'#d7faf6',w:2.2,life:.24,i:f.i});m.events.push({k:'fx',n:'sparks',x:e.x,y:e.y,num:6,col:'#bff5ee',i:f.i})}
      if(e.hp<before&&q.gen<1+f.sig)Q.push({x:e.x,y:e.y,t:.9,d:q.d*.7,gen:q.gen+1});
    }
    if(Q.length>12)Q.splice(0,Q.length-12);
  }};

// Paradox: a clock runs down and the two fighters trade health: each takes the other's share of a full bar, and the rival
// gets a jolt for its trouble. Between trades it only jostles. A trade is only as complete as the two are evenly matched:
// when one is much bigger and harder-hitting than the other, only part of the gap moves, whichever way it runs.
const P6_TRADE=5.5;
BEHAVE.paradox={
  init(f){f.s.t=P6_TRADE;f.s.flash=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.paradox,S=f.s;
    if(S.flash>0)S.flash-=DT;
    S.t-=DT;
    if(S.t>0)return;
    if(e.gone||e.hp<=0||f.hp<=0){S.t=.2;return}           // nobody to trade with yet
    S.t=P6_TRADE;S.flash=.6;
    const a=f.hp/f.max,b=e.hp/e.max,ratio=(f.max*f.dmgMul)/(e.max*e.dmgMul),pw=Math.min(ratio,1/ratio),part=pw*pw,move=(b-a)*part;
    f.hp=Math.min(f.max,(a+move+.07*f.sig)*f.max);e.hp=Math.max(.01,b-move)*e.max;
    S.was=a;S.got=a+move;
    m.events.push({k:'appear',x:f.x,y:f.y,i:f.i});m.events.push({k:'ring',x:e.x,y:e.y,r0:6,r:40,life:.3,w:3,i:f.i});
    m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Trade',big:true,i:f.i});
    m.events.push({k:'fx',n:'beam',x:f.x,y:f.y,x2:e.x,y2:e.y,col:'#ffc4ee',w:3.4,life:.3,i:f.i});
    m.events.push({k:'fx',n:'seek',x:f.x,y:f.y,to:e.i,num:8,col:'#ffc4ee',i:f.i});
    m.events.push({k:'fx',n:'seek',x:e.x,y:e.y,to:f.i,num:8,col:'#ffffff',i:f.i});
    m.events.push({k:'fx',n:'tele',x:e.x,y:e.y,r:e.r,col:'#ffc4ee',i:f.i});
    m.events.push({k:'fx',n:'shake',r:3,i:f.i});
    m.hurt(e,D.dmg*P6_JOLT*(1+.2*f.sig)*f.dmgMul*rage,f);
  },
  touch:(f,e)=>FIGHTERS.paradox.dmg*.5*p6square(f,e),
  dealt:p6knock.dealt};
const P6_JOLT=1.2;

// Entropy: a field of rot centred on it that grows all fight. The rival crumbles while inside it; Entropy always crumbles,
// at a smaller rate; and the rate itself climbs with the clock. Minions inside the field age twice as fast.
BEHAVE.entropy={
  init(f){f.s.t=.6;f.s.rad=85;f.s.inside=false;f.vamp*=.5},     // there is little to drink in dust
  tick(f,e,m,rage){
    const D=FIGHTERS.entropy,S=f.s;
    S.rad=85+(9+3*f.sig)*m.t;
    S.inside=!e.gone&&gap(e,f)<S.rad+e.r*.5;
    S.t-=DT;
    if(S.t>0)return;
    S.t=D.cd/f.spdMul;
    const grow=1+.05*m.t,own=Math.max(.12,.3-.05*f.sig);
    m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:Math.max(4,S.rad-10),r:S.rad,life:.45,col:'#d6cca4',w:1.1,i:f.i});
    m.events.push({k:'fx',n:'dust',x:f.x,y:f.y+f.r*.3,num:2,col:'#d6cca4',jit:f.r,i:f.i});
    if(S.inside){m.events.push({k:'fx',n:'dust',x:e.x,y:e.y,num:5,col:'#d6cca4',jit:e.r*1.4,i:f.i});m.events.push({k:'fx',n:'shards',x:e.x,y:e.y,num:3,col:'#b8ae84',lo:20,hi:70,jit:e.r,i:f.i})}
    if(S.inside)m.hurt(e,D.dmg*grow*f.dmgMul*rage,f);
    f.hp-=D.dmg*grow*own*rage*f.max/100;                 // its own share, as a part of its health: not a hit, so no armour and no reaction
    for(const q of m.minions)if(q.own!==f.i&&dhyp(q.x-f.x,q.y-f.y)<S.rad)q.life-=D.cd;
  }};

// Dice: a roll every couple of seconds. 1 hurts itself, 2 mends it a little, 3 makes it quick for a while,
// 4 throws one pip, 5 throws three, 6 is a heavy blow that lands wherever the rival is.
const P6_ROLL=2.1;
BEHAVE.dice={
  init(f){f.s.t=1.2;f.s.face=0;f.s.show=0;f.s.quick=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.dice,S=f.s;
    if(S.show>0)S.show-=DT;
    if(S.quick>0)S.quick-=DT;
    S.t-=DT;
    if(S.t>0||e.gone)return;
    S.t=P6_ROLL/f.spdMul;
    let n=1+((m.rnd()*6)|0);
    if(n===1&&m.rnd()<.3*f.sig)n=6;
    S.face=n;S.show=1.3;
    m.events.push({k:'text',x:f.x,y:f.y-f.r-6,txt:String(n),big:n===6||n===1,i:f.i});
    if(n===1){m.events.push({k:'fx',n:'dark',x:f.x,y:f.y,r:f.r+10,col:'#ff5a6a',i:f.i});m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y,num:3,jit:f.r,i:f.i})}
    else if(n===2)m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:6,col:'#b5ecae',jit:f.r*1.6,grav:-50,i:f.i});
    else if(n===3){m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+22,life:.3,col:'#fff1cf',w:2.4,i:f.i});m.events.push({k:'fx',n:'sparks',x:f.x,y:f.y,num:10,col:'#fff1cf',i:f.i})}
    else if(n<6)m.events.push({k:'fx',n:'stars',x:f.x,y:f.y-f.r,num:n===5?5:3,col:'#f3ead6',jit:10,i:f.i});
    else{m.events.push({k:'fx',n:'confetti',x:e.x,y:e.y,num:12,i:f.i});m.events.push({k:'fx',n:'stars',x:e.x,y:e.y,num:9,col:'#ffd76a',hi:150,i:f.i});m.events.push({k:'fx',n:'scorch',x:e.x,y:e.y,r:22,i:f.i});m.events.push({k:'fx',n:'shake',r:4,i:f.i})}
    if(n===1)m.hurt(f,D.dmg*.7,e,true);
    else if(n===2){const h=Math.min(f.max*.05,f.max-f.hp);if(h>.05){f.hp+=h;m.events.push({k:'heal',x:f.x,y:f.y,dmg:h,i:f.i})}}
    else if(n===3)S.quick=2.5;
    else if(n===4)m.shoot(f,D.dmg*.7);
    else if(n===5)for(let k=0;k<3;k++)m.shoot(f,D.dmg*.45);
    else{
      m.events.push({k:'blast',x:e.x,y:e.y,r:34,i:f.i});
      m.hurt(e,D.dmg*2.4*f.dmgMul*rage,f);m.knock(e,f);
    }
  },
  fast:f=>f.s.quick>0?1.6:1,
  touch:f=>FIGHTERS.dice.dmg*(f.s.quick>0?.7:.35),
  dealt:p6knock.dealt};

// Shadow: remembers the rival's path. A shadow walks it a fixed time behind them and bites when the rival comes back
// within its reach: after a head-on bounce, a corner, or a bump from the Shadow itself.
const P6_LAG=66,P6_GAP=30,P6_BITE=13;                     // steps behind for the first shadow, steps between shadows, bite reach
BEHAVE.shadow={
  init(f){f.s.path=[];f.s.sh=[];f.s.bit=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.shadow,S=f.s,P=S.path,keep=(P6_LAG+P6_GAP*3+2)*2;
    P.push(e.x,e.y);
    if(P.length>keep)P.splice(0,P.length-keep);
    if(S.bit>0)S.bit-=DT;
    S.sh.length=0;
    for(let k=0;k<=f.sig;k++){
      const at=P.length-2*(P6_LAG+P6_GAP*k)-2;
      if(at<0)break;
      const x=P[at],y=P[at+1];
      S.sh.push(x,y);
      if(!e.gone&&f.cd<=0&&dhyp(e.x-x,e.y-y)<e.r+P6_BITE){
        f.cd=D.cd/f.spdMul;S.bit=.25;S.bx=x;S.by=y;
        m.events.push({k:'fx',n:'slash',x:e.x,y:e.y,dir:datan2(e.y-y,e.x-x),r:e.r*1.4,col:'#d9dcff',life:.22,i:f.i});
        m.events.push({k:'fx',n:'dark',x:x,y:y,r:e.r+10,col:'#9aa0e0',i:f.i});
        m.events.push({k:'fx',n:'smoke',x:x,y:y,num:4,col:'#0b0b18',jit:e.r,i:f.i});
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
      }
    }
  },
  touch:()=>FIGHTERS.shadow.dmg*.3};          // its own body only jostles: a bump is how it turns the rival round

// Time Loop: keeps three seconds of its own history. When it has lost a lot of health inside that window it goes back to
// the start of it: position, heading and most of its health (all of it with the signature). It has to live through the
// damage first, so one huge blow still kills it.
BEHAVE.loop={
  init(f){f.s.h=[];f.s.acc=0;f.s.cd=0;f.s.jump=0},
  tick(f,e,m){
    const S=f.s,H=S.h;
    if(S.cd>0)S.cd-=DT;
    if(S.jump>0)S.jump-=DT;
    S.acc+=DT;
    if(S.acc>=.1){S.acc-=.1;H.push({x:f.x,y:f.y,vx:f.vx,vy:f.vy,hp:f.hp});if(H.length>30)H.shift()}
    if(S.cd>0||H.length<30||f.hp<=0)return;
    const old=H[0];
    if(old.hp-f.hp<f.max*(.3-.03*f.sig))return;
    m.events.push({k:'fade',x:f.x,y:f.y,i:f.i});
    S.fx=f.x;S.fy=f.y;S.jump=.5;
    f.x=old.x;f.y=old.y;f.vx=old.vx;f.vy=old.vy;f.hp+=(old.hp-f.hp)*Math.min(1,.64+.12*f.sig);f.poisonT=0;f.slowT=0;
    m.renorm(f);
    S.cd=S.wind=8-1.1*f.sig;H.length=0;
    m.events.push({k:'appear',x:f.x,y:f.y,i:f.i});
    m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Again',big:true,i:f.i});
    m.events.push({k:'fx',n:'beam',x:S.fx,y:S.fy,x2:f.x,y2:f.y,col:'#bfeaff',w:3.2,life:.36,i:f.i});
    m.events.push({k:'fx',n:'seek',x:S.fx,y:S.fy,to:f.i,num:10,col:'#bfeaff',i:f.i});
    m.events.push({k:'fx',n:'tele',x:f.x,y:f.y,r:f.r,col:'#bfeaff',i:f.i});
    m.events.push({k:'fx',n:'plus',x:f.x,y:f.y,num:4,jit:f.r*1.4,i:f.i});
    m.events.push({k:'fx',n:'shake',r:3,i:f.i});
  },
  touch:(f,e)=>FIGHTERS.loop.dmg*p6square(f,e),
  dealt:p6knock.dealt};

// Monk: calm rises every second it is left alone and halves whenever it is hit. Body contact spends all of it in one strike.
BEHAVE.monk={
  init(f){f.s.calm=0;f.s.cap=4;f.s.palm=0;f.s.strike=false},
  tick(f){
    const S=f.s;
    S.strike=false;
    S.cap=4+1.2*f.sig;
    S.calm=Math.min(S.cap,S.calm+DT*(1+.25*f.sig)*f.spdMul);
    if(S.palm>0)S.palm-=DT;
  },
  hurt(f,src,dmg,m){if(f.s.calm>1)m.events.push({k:'fx',n:'shatter',x:f.x,y:f.y,num:Math.round(3+2*f.s.calm),col:'#ffe2aa',r:f.r,i:f.i});f.s.calm*=.5},
  touch(f){const S=f.s,c=S.calm;S.calm=0;S.strike=true;S.spent=c;return FIGHTERS.monk.dmg*(.4+c)},
  dealt(f,v,dmg,m){
    const S=f.s;
    if(!S.strike)return;
    S.strike=false;S.palm=.35;S.pa=datan2(v.y-f.y,v.x-f.x);
    m.knock(v,f);
    m.events.push({k:'fx',n:'wave',x:(f.x+v.x)/2,y:(f.y+v.y)/2,r0:4,r:14+8*S.spent,life:.3,col:'#ffe2aa',w:2+S.spent*.5,fill:.25,i:f.i});
    m.events.push({k:'fx',n:'sparks',x:v.x,y:v.y,num:Math.round(4+4*S.spent),col:'#ffe2aa',dir:S.pa,spread:1.2,lo:90,hi:200+40*S.spent,i:f.i});
    if(S.spent>1.5){m.events.push({k:'fx',n:'holy',x:v.x,y:v.y,r:18+5*S.spent,col:'#ffe2aa',i:f.i});m.events.push({k:'fx',n:'shake',r:Math.min(5,1.5+S.spent*.7),i:f.i})}
    if(S.spent>1.5){v.stunT=Math.max(v.stunT,.3);m.events.push({k:'blast',x:(f.x+v.x)/2,y:(f.y+v.y)/2,r:16+6*S.spent,i:f.i})}
  }};

// Gravity: for a couple of seconds at a time the floor tilts toward one wall. The rival slides that way; Gravity falls
// toward the rival, and a landing on someone pinned against the low wall is a slam.
const P6_DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
BEHAVE.gravity={
  init(f){f.s.t=1.4;f.s.on=0;f.s.k=-1;f.s.gx=0;f.s.gy=0;f.s.slam=0},
  tick(f,e,m){
    const S=f.s;
    if(S.slam>0)S.slam-=DT;
    S.t-=DT;
    if(S.t<=0){
      if(S.on){S.on=0;S.t=Math.max(.8,1.9-.35*f.sig)/f.spdMul;m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r+3,r:f.r+16,life:.32,col:'#d6f0aa',w:1.6,i:f.i})}
      else{
        let k=(m.rnd()*4)|0;if(k===S.k)k=(k+1)%4;
        S.k=k;S.gx=P6_DIRS[k][0];S.gy=P6_DIRS[k][1];S.on=1;S.t=S.dur=2.3+.3*f.sig;
        m.events.push({k:'pull',x:AW/2+S.gx*AW*.38,y:AW/2+S.gy*AW*.38,i:f.i});
        m.events.push({k:'text',x:AW/2,y:AW/2,txt:'Tilt',i:f.i});
        m.events.push({k:'fx',n:'seek',x:AW/2,y:AW/2,x2:AW/2+S.gx*AW*.48,y2:AW/2+S.gy*AW*.48,num:14,col:'#d6f0aa',i:f.i});
        m.events.push({k:'fx',n:'dust',x:AW/2+S.gx*AW*.47,y:AW/2+S.gy*AW*.47,num:8,jit:AW*.5,i:f.i});
        m.events.push({k:'fx',n:'shake',r:2.5,i:f.i});
      }
    }
    if(!S.on)return;
    if(!e.gone){
      if(e.stunT<=0){e.vx+=S.gx*900*DT;e.vy+=S.gy*900*DT;m.renorm(e)}
      e.x=p6clamp(e.x+S.gx*30*DT,e.r);e.y=p6clamp(e.y+S.gy*30*DT,e.r);
      const d=gap(e,f)||1;                               // Gravity itself falls toward whoever is below it
      f.vx+=(e.x-f.x)/d*1100*DT;f.vy+=(e.y-f.y)/d*1100*DT;m.renorm(f);
    }
    for(const q of m.minions){
      q.vx+=S.gx*500*DT;q.vy+=S.gy*500*DT;
      const sp=dhyp(q.vx,q.vy)||1;q.vx*=q.sp/sp;q.vy*=q.sp/sp;
    }
  },
  fast:f=>f.s.on?1.25:1,
  touch(f,e){
    const S=f.s;
    if(!S.on)return FIGHTERS.gravity.dmg*p6square(f,e);
    const room=S.gx>0?AW-e.x-e.r:S.gx<0?e.x-e.r:S.gy>0?AW-e.y-e.r:e.y-e.r;
    if(room>18)return FIGHTERS.gravity.dmg*p6square(f,e);
    S.slam=.3;
    return FIGHTERS.gravity.dmg*(2.2+.45*f.sig);
  },
  dealt(f,v,dmg,m){
    if(!(f.s.slam>.29))return;
    const S=f.s,wx=v.x+S.gx*v.r,wy=v.y+S.gy*v.r,back=datan2(-S.gy,-S.gx);
    m.events.push({k:'blast',x:v.x,y:v.y,r:30,i:f.i});
    m.events.push({k:'fx',n:'shards',x:wx,y:wy,num:9,col:'#9a958a',dir:back,spread:2.2,i:f.i});
    m.events.push({k:'fx',n:'dust',x:wx,y:wy,num:8,jit:v.r*1.6,i:f.i});
    m.events.push({k:'fx',n:'scorch',x:v.x,y:v.y,r:v.r*1.1,life:3,i:f.i});
    m.events.push({k:'fx',n:'squash',i:v.i,dir:back,r:.16});
    m.events.push({k:'fx',n:'shake',r:4.5,i:f.i});
  }};

// Mimic: remembers the hardest blow it has taken since it last touched the rival, and gives it back on the next touch,
// with a little of its own on top. Many small hits teach it nothing; one big one is a gift, up to the most it can hold.
const P6_HOLD=36;
BEHAVE.mimic={
  init(f){f.s.copy=0;f.s.gave=0;f.s.snap=0},
  tick(f){if(f.s.snap>0)f.s.snap-=DT},
  hurt(f,src,dmg,m){const c=Math.min(dmg,P6_HOLD+12*f.sig);if(c>f.s.copy){f.s.copy=c;m.events.push({k:'fx',n:'seek',x:src.x,y:src.y,to:f.i,num:Math.round(3+c*.12),col:'#ffce78',i:f.i});m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r+14,r:f.r+2,life:.3,col:'#ffce78',w:2,i:f.i})}},     // it can only swallow so big a blow
  touch(f){
    const D=FIGHTERS.mimic,S=f.s,c=S.copy;
    S.copy=0;S.gave=c;if(c>0)S.snap=.3;
    // the blow comes back at the size it arrived: the Mimic's own strength adds to it only a little
    return D.dmg*.3+c*(D.dmg/10)*(1+.25*f.sig)/Math.sqrt(f.dmgMul);
  },
  dealt(f,v,dmg,m){
    m.knock(v,f);
    const S=f.s,c=S.gave;
    if(!(S.snap>.29&&c>0))return;                           // effects only: the held blow, given back
    const a=datan2(v.y-f.y,v.x-f.x);
    m.events.push({k:'fx',n:'slash',x:v.x,y:v.y,dir:a+1.5708,r:v.r*1.3,col:'#ffecbe',life:.2,i:f.i});
    m.events.push({k:'fx',n:'slash',x:v.x,y:v.y,dir:a-1.5708,r:v.r*1.3,col:'#ffecbe',life:.2,i:f.i});
    m.events.push({k:'fx',n:'shatter',x:v.x,y:v.y,num:Math.round(5+c*.3),col:'#ffce78',r:v.r,i:f.i});
    if(c>=14){m.events.push({k:'text',x:v.x,y:v.y-v.r,txt:'Returned',big:c>=26,col:'#ffce78',i:f.i});m.events.push({k:'fx',n:'shake',r:Math.min(4.5,c*.12),i:f.i})}
  }};

// ---------- art ----------
// "Gilded": every fighter is a medallion drawn by the shared drawFighter in brawl-looks.js. These blocks add what makes
// each class its own: crest(fg,bg) is the emblem (origin at the medallion centre, enamel field at radius 1); arm() draws
// a weapon arm; under(f,m) / back(f) / over(f,m) put things on the floor, behind the medallion, or on top of everything.
// top(f,m) draws over both fighters (marks left on the rival); amb(f,e,m,dt) feeds the effects engine (brawl-fx.js) with
// whatever a class gives off continuously. The moments themselves are {k:'fx',...} events pushed from the simulation half.
// These ten are ideas more than people, so their marks are thin, pale and a little cold. All of it draws with g.
const P6={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  STEEL:typeof STEEL!=='undefined'?STEEL:'#d7dde2',STEEL_LO:typeof STEEL_LO!=='undefined'?STEEL_LO:'#8b959d',
  DARK:'#07090b',
};
const P6_TAU=6.2832;
const p6disc=(x,y,r)=>{g.beginPath();g.arc(x,y,Math.max(.1,r),0,P6_TAU)};
// a soft round glow; rgb is an "r,g,b" triple
function p6glow(x,y,r,rgb,a){
  r=Math.max(.5,r);
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p6disc(x,y,r);g.fill();
}
// stroke the current path as a solid rod: dark edge underneath, the material on top
function p6rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P6.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
const p6foe=(f,m)=>m&&m.f?m.f[1-f.i]:null;

LOOKS.void={
  crest(fg){                                              // an eclipse
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';g.lineWidth=.045;
    g.beginPath();
    for(let k=0;k<12;k++){const a=k/12*P6_TAU,q=k%2?.7:.8;g.moveTo(dcos(a)*.56,dsin(a)*.56);g.lineTo(dcos(a)*q,dsin(a)*q)}
    g.stroke();
    g.beginPath();g.arc(0,0,.47,0,P6_TAU);g.fill();
    g.fillStyle=P6.DARK;g.beginPath();g.arc(.07,-.05,.4,0,P6_TAU);g.fill();
  },
  under(f,m){                                             // the well: darkness that thickens toward it, slow arcs winding in
    const R=(f.s.range||78)+f.r*.4,t=m?m.t:0;
    const q=g.createRadialGradient(f.x,f.y,f.r*.6,f.x,f.y,R);q.addColorStop(0,'rgba(6,4,14,.78)');q.addColorStop(.6,'rgba(10,8,24,.3)');q.addColorStop(1,'rgba(10,8,24,0)');
    g.fillStyle=q;p6disc(f.x,f.y,R);g.fill();
    g.lineCap='round';g.strokeStyle='rgba(176,160,235,.3)';g.lineWidth=1;
    for(let k=0;k<4;k++){const rr=f.r+6+(R-f.r-10)*(1-((t*.35+k*.25)%1)),a=t*(.9+.2*k)+k*1.7;g.beginPath();g.arc(f.x,f.y,rr,a,a+1.5);g.stroke()}
    g.setLineDash([2,5]);g.strokeStyle='rgba(176,160,235,.4)';g.lineWidth=.8;p6disc(f.x,f.y,R-f.r*.4);g.stroke();g.setLineDash([]);
  },
  back(f){p6glow(f.x,f.y,f.r+11,'4,3,10',.85)},
  amb(f,e,m,dt){                                          // light winding into the well; more of it, torn from the rival, while it has a grip
    if(f.gone)return;
    const S=f.s,R=S.range||78;
    for(let n=FX.due(f.i,'p6vw',5,dt);n>0;n--){const a=Math.random()*P6_TAU;FX.seek(f.x+dcos(a)*R,f.y+dsin(a)*R,f.i,1,'#8f7fe0',0,0,{jit:6,size:1.1,life:1.4})}
    if(S.grip>0&&!e.gone&&gap(e,f)<R+e.r)for(let n=FX.due(f.i,'p6vg',4+9*S.grip,dt);n>0;n--)FX.seek(e.x,e.y,f.i,1,'#cdbfff',0,0,{jit:e.r*1.7,size:1.4});
  }};

LOOKS.echo={
  crest(fg){                                              // a sound, and its rings
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';
    g.beginPath();g.arc(0,0,.13,0,P6_TAU);g.fill();
    for(const r of [.34,.56,.78]){
      g.lineWidth=.12-r*.06;
      for(const s of [0,Math.PI]){g.beginPath();g.arc(0,0,r,s-.75,s+.75);g.stroke()}
    }
  },
  arm(f,A,x1,y1,x2,y2,an){                                // a tuning fork
    const L=dhyp(x2-x1,y2-y1);
    g.save();g.translate(x1,y1);g.rotate(an);
    g.beginPath();g.moveTo(-1,0);g.lineTo(L*.42,0);p6rod(P6.STEEL_LO,2.2);
    g.beginPath();g.moveTo(L,-3.3);g.lineTo(L*.52,-3.3);g.quadraticCurveTo(L*.4,0,L*.52,3.3);g.lineTo(L,3.3);p6rod(P6.STEEL,2);
    g.fillStyle=P6.GOLD;p6disc(1.5,0,2.1);g.fill();g.strokeStyle=P6.EDGE;g.lineWidth=.6;g.stroke();
    if(f.cd>0){                                           // it hums after a hit
      g.strokeStyle='rgba(190,245,238,.6)';g.lineWidth=.8;g.lineCap='round';
      for(const s of [-1,1]){g.beginPath();g.arc(L*.8,s*3.3,3.4,s>0?.5:-2.6,s>0?2.6:-.5);g.stroke()}
    }
    g.restore();
  },
  under(f){                                               // echoes waiting to sound: a ring closing on the spot it will strike
    const R=f.s.rad||52;
    for(const q of f.s.q){
      const u=Math.max(0,Math.min(1,q.t/.9));
      g.setLineDash([3,4]);g.strokeStyle='rgba(170,238,230,.55)';g.lineWidth=1;p6disc(q.x,q.y,R);g.stroke();g.setLineDash([]);
      g.strokeStyle='rgba(215,250,246,'+(.35+.5*(1-u)).toFixed(2)+')';g.lineWidth=1.4;p6disc(q.x,q.y,4+(R-4)*u);g.stroke();
      g.fillStyle='rgba(215,250,246,.8)';p6disc(q.x,q.y,1.8);g.fill();
      if(typeof FX!=='undefined'&&typeof LIVE!=='undefined'&&LIVE)FX.glow(g,q.x,q.y,7+9*(1-u),'#bff5ee',.25+.45*(1-u));
    }
  },
  amb(f,e,m,dt){                                          // waiting echoes shimmer; the fork hums after a hit
    const Q=f.s.q,R=f.s.rad||52;
    if(Q&&Q.length)for(let n=FX.due(f.i,'p6eq',Math.min(10,3*Q.length),dt);n>0;n--){
      const q=Q[(Math.random()*Q.length)|0],a=Math.random()*P6_TAU,d=4+(R-4)*Math.max(0,Math.min(1,q.t/.9));
      FX.stars(q.x+dcos(a)*d,q.y+dsin(a)*d,1,'#bff5ee',{lo:2,hi:14,size:2.6,life:.4});
    }
    if(f.cd>0&&!f.gone&&f.arms[0])for(let n=FX.due(f.i,'p6eh',9,dt);n>0;n--){
      const A=f.arms[0],an=f.ang*A.rate+A.a,d=f.r+A.l*(.75+.25*Math.random());
      FX.sparks(f.x+dcos(an)*d,f.y+dsin(an)*d,1,'#bff5ee',{lo:10,hi:55,life:.2,size:1});
    }
  }};

LOOKS.paradox={
  crest(fg){                                              // two arrows passing each other
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';g.lineJoin='round';g.lineWidth=.13;
    g.beginPath();g.moveTo(-.55,-.26);g.lineTo(.3,-.26);g.stroke();
    g.beginPath();g.moveTo(.68,-.26);g.lineTo(.28,-.52);g.lineTo(.28,0);g.closePath();g.fill();
    g.beginPath();g.moveTo(.55,.26);g.lineTo(-.3,.26);g.stroke();
    g.beginPath();g.moveTo(-.68,.26);g.lineTo(-.28,0);g.lineTo(-.28,.52);g.closePath();g.fill();
  },
  over(f,m){                                              // the clock running down to the next trade, and the tie between the two
    const S=f.s,e=p6foe(f,m),left=Math.max(0,Math.min(1,S.t/P6_TRADE));
    g.lineCap='butt';g.strokeStyle='rgba(9,11,13,.6)';g.lineWidth=3;p6disc(f.x,f.y,f.r+5);g.stroke();
    g.strokeStyle=left<.22?'#ffffff':'rgba(255,196,238,.9)';g.lineWidth=1.6;g.beginPath();g.arc(f.x,f.y,f.r+5,-1.5708,-1.5708+P6_TAU*(1-left));g.stroke();
  },
  top(f,m){                                               // the tie between the two as a trade nears, drawn over both of them
    const S=f.s,e=p6foe(f,m);
    if(e&&!e.gone&&e.hp>0&&(S.t<1.2||S.flash>0)){
      const hot=S.flash>0,a=hot?.9:.35+.5*(1-S.t/1.2);
      g.setLineDash(hot?[]:[4,4]);g.strokeStyle='rgba(255,196,238,'+a.toFixed(2)+')';g.lineWidth=hot?2.4:1.2;g.lineCap='round';
      g.beginPath();g.moveTo(f.x,f.y);g.lineTo(e.x,e.y);g.stroke();g.setLineDash([]);
      g.strokeStyle='rgba(255,196,238,'+a.toFixed(2)+')';g.lineWidth=1.2;p6disc(e.x,e.y,e.r+5);g.stroke();
      if(typeof FX!=='undefined'&&typeof LIVE!=='undefined'&&LIVE){FX.glow(g,e.x,e.y,e.r*1.7,'#ff9ee0',a*.4);FX.glow(g,f.x,f.y,f.r*1.7,'#ff9ee0',a*.4)}
    }
  },
  amb(f,e,m,dt){                                          // the last second before a trade: both of them start to sparkle
    const S=f.s;
    if(f.gone||e.gone||!(e.hp>0)||!(S.t<1.2))return;
    for(let n=FX.due(f.i,'p6px',12,dt);n>0;n--){const v=Math.random()<.5?f:e,a=Math.random()*P6_TAU;FX.stars(v.x+dcos(a)*(v.r+5),v.y+dsin(a)*(v.r+5),1,'#ffc4ee',{lo:2,hi:16,size:2.8,life:.4})}
    for(let n=FX.due(f.i,'p6pl',7,dt);n>0;n--){const u=Math.random();FX.sparks(f.x+(e.x-f.x)*u,f.y+(e.y-f.y)*u,1,'#ffc4ee',{lo:6,hi:30,life:.3,size:1})}
  }};

LOOKS.entropy={
  crest(fg){                                              // a ring coming apart
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='butt';g.lineWidth=.16;
    g.beginPath();g.arc(-.06,-.06,.5,.9,5.3);g.stroke();
    for(const p of [[.5,-.2,.1],[.62,.06,.08],[.5,.32,.07],[.68,.4,.05],[.42,.58,.05],[.64,.66,.035]])g.fillRect(p[0]-p[2],p[1]-p[2],p[2]*2,p[2]*2);
  },
  under(f,m){                                             // the rot: a pale stain that keeps growing, its edge flaking
    const R=f.s.rad||85,t=m?m.t:0;
    g.fillStyle='rgba(150,140,104,.11)';p6disc(f.x,f.y,R);g.fill();
    g.setLineDash([1.5,5]);g.lineDashOffset=-t*3;g.strokeStyle='rgba(214,204,164,.6)';g.lineWidth=1.3;p6disc(f.x,f.y,R);g.stroke();
    g.setLineDash([]);g.lineDashOffset=0;
    g.fillStyle='rgba(214,204,164,.5)';
    for(let k=0;k<10;k++){                                 // flakes drifting down inside it
      const a=k*2.399,rr=R*(.25+.07*k),u=(t*.5+k*.31)%1,x=f.x+dcos(a)*rr,y=f.y+dsin(a)*rr*.9+u*12,s=1.7*(1-u);
      if(x>2&&x<AW-2&&y>2&&y<AW-2)g.fillRect(x-s/2,y-s/2,s,s);
    }
  },
  over(f,m){p6shed(f,m?m.t:0,3)},                         // whoever is crumbling sheds dust
  top(f,m){const e=p6foe(f,m);if(f.s.inside&&e&&!e.gone&&e.hp>0)p6shed(e,m?m.t:0,5)},
  amb(f,e,m,dt){
    if(f.gone)return;
    const S=f.s,R=S.rad||85;
    for(let n=FX.due(f.i,'p6es',3,dt);n>0;n--)FX.dust(f.x+(Math.random()-.5)*f.r*1.6,f.y+f.r*.4,1,'#d6cca4',{dir:1.5708,spread:.6,lo:6,hi:22,size:2.2,grav:30});
    if(S.inside&&!e.gone){
      for(let n=FX.due(f.i,'p6ei',7,dt);n>0;n--)FX.dust(e.x+(Math.random()-.5)*e.r*1.6,e.y+e.r*.3,1,'#d6cca4',{dir:1.5708,spread:.6,lo:8,hi:26,size:2.4,grav:30});
      for(let n=FX.due(f.i,'p6ec',2,dt);n>0;n--){const a=Math.random()*P6_TAU;FX.shards(e.x+dcos(a)*e.r,e.y+dsin(a)*e.r,1,e.col,{dir:1.5708,spread:1,lo:10,hi:40,size:1.6,life:.5})}
    }
    for(let n=FX.due(f.i,'p6er',4,dt);n>0;n--){                // the edge of the rot smoulders as it creeps outward
      const a=Math.random()*P6_TAU,x=f.x+dcos(a)*R,y=f.y+dsin(a)*R;
      if(x>2&&x<AW-2&&y>2&&y<AW-2)FX.wisps(x,y,1,'#b8ae84',{life:.6,size:3.2});
    }
    for(const q of m.minions)if(q.own!==f.i&&dhyp(q.x-f.x,q.y-f.y)<R&&FX.due(f.i,'p6em',1.5,dt))FX.dust(q.x,q.y+q.r*.4,1,'#d6cca4',{lo:4,hi:14,size:1.8});
  }};
function p6shed(v,t,n){
  if(v.gone)return;
  g.fillStyle='rgba(226,216,180,.85)';
  for(let k=0;k<n;k++){const u=(t*1.4+k*.23)%1,s=2*(1-u);g.fillRect(v.x+dsin(k*2.3+v.i)*v.r*.75-s/2,v.y+v.r*.35+u*15,s,s)}
}

// the pips on each face of a die, on a 3 by 3 grid
const P6_PIPS=[[],[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],[[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]];
LOOKS.dice={
  crest(fg,bg){                                           // the five
    g.fillStyle=fg;g.beginPath();if(g.roundRect)g.roundRect(-.56,-.56,1.12,1.12,.2);else g.rect(-.56,-.56,1.12,1.12);g.fill();
    g.fillStyle=bg;for(const p of P6_PIPS[5]){g.beginPath();g.arc(p[0]*.28,p[1]*.28,.1,0,P6_TAU);g.fill()}
  },
  back(f){
    if(!(f.s.quick>0))return;                             // rolled a three: streaks behind it
    const sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp;
    g.strokeStyle='rgba(243,234,214,.5)';g.lineWidth=1.1;g.lineCap='round';g.beginPath();
    for(let k=-1;k<=1;k++){const ox=-uy*k*f.r*.6,oy=ux*k*f.r*.6;g.moveTo(f.x+ox-ux*(f.r+4),f.y+oy-uy*(f.r+4));g.lineTo(f.x+ox-ux*(f.r+16-Math.abs(k)*5),f.y+oy-uy*(f.r+16-Math.abs(k)*5))}
    g.stroke();
  },
  over(f){                                                // the die itself, beside it, showing the last roll
    const S=f.s,n=S.face||0,fresh=Math.max(0,S.show||0),s=5.5+(fresh>1?(fresh-1)*8:0),right=f.x<AW-f.r-18;
    const x=f.x+(right?1:-1)*(f.r+s+4),y=Math.max(s+2,f.y-f.r*.35);
    g.save();g.translate(x,y);g.rotate(fresh>1?(fresh-1)*9:0);
    g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.rect(-s+.8,-s+1.4,s*2,s*2);g.fill();
    g.fillStyle=n===6?P6.GOLD_HI:P6.IVORY;g.strokeStyle=P6.EDGE;g.lineWidth=.7;g.lineJoin='round';
    g.beginPath();if(g.roundRect)g.roundRect(-s,-s,s*2,s*2,s*.3);else g.rect(-s,-s,s*2,s*2);g.fill();g.stroke();
    g.fillStyle=n===1?'#b3313f':P6.EDGE;
    for(const p of P6_PIPS[n]){g.beginPath();g.arc(p[0]*s*.52,p[1]*s*.52,s*(n===1?.26:.17),0,P6_TAU);g.fill()}
    g.restore();
    if(fresh>.6&&(n===6||n===1)&&typeof FX!=='undefined'&&typeof LIVE!=='undefined'&&LIVE)FX.glow(g,x,y,s*3,n===6?'#ffd76a':'#ff5a6a',Math.min(.7,(fresh-.6)*1.2));
  },
  amb(f,e,m,dt){
    const S=f.s;
    if(f.gone)return;
    if(S.quick>0){                                        // a three: it tears along
      const sp=dhyp(f.vx,f.vy)||1,bx=-f.vx/sp,by=-f.vy/sp;
      for(let n=FX.due(f.i,'p6dq',12,dt);n>0;n--){const off=(Math.random()-.5)*f.r*1.7,x=f.x+bx*f.r*.7-by*off,y=f.y+by*f.r*.7+bx*off,l=10+Math.random()*14;FX.line(x,y,x+bx*l,y+by*l,'#fff1cf',1,.2)}
    }
    if(S.show>1){                                         // the die is still tumbling
      const right=f.x<AW-f.r-18,x=f.x+(right?1:-1)*(f.r+10),y=Math.max(8,f.y-f.r*.35);
      for(let n=FX.due(f.i,'p6dr',16,dt);n>0;n--)FX.stars(x,y,1,S.face===6?'#ffd76a':S.face===1?'#ff5a6a':'#f3ead6',{lo:10,hi:50,size:2.6,life:.35,jit:8});
    }
  }};

LOOKS.shadow={
  crest(fg){                                              // eyes under a hood
    g.fillStyle=fg;
    g.beginPath();g.moveTo(0,-.72);g.bezierCurveTo(.5,-.62,.6,0,.52,.6);g.lineTo(-.52,.6);g.bezierCurveTo(-.6,0,-.5,-.62,0,-.72);g.fill();
    g.fillStyle=P6.DARK;
    g.beginPath();g.moveTo(0,-.44);g.bezierCurveTo(.32,-.4,.36,.1,.28,.46);g.lineTo(-.28,.46);g.bezierCurveTo(-.36,.1,-.32,-.4,0,-.44);g.fill();
    g.fillStyle=fg;
    g.beginPath();g.ellipse(-.12,.02,.085,.04,.3,0,P6_TAU);g.fill();g.beginPath();g.ellipse(.12,.02,.085,.04,-.3,0,P6_TAU);g.fill();
  },
  under(f,m){                                             // the rival's trail, and the shadows walking it
    const S=f.s,P=S.path,e=p6foe(f,m),er=e?e.r:22;
    if(P.length>8){
      g.lineCap='round';g.lineJoin='round';g.strokeStyle='rgba(6,6,14,.3)';g.lineWidth=er*.5;g.beginPath();
      const from=Math.max(0,P.length-2*(P6_LAG+P6_GAP*f.sig)-2);
      g.moveTo(P[from],P[from+1]);
      for(let k=from+8;k<P.length;k+=8){
        if(dhyp(P[k]-P[k-8],P[k+1]-P[k-7])>40)g.moveTo(P[k],P[k+1]);else g.lineTo(P[k],P[k+1]);      // a blink breaks the trail
      }
      g.stroke();
    }
    for(let k=0;k<S.sh.length;k+=2){
      const x=S.sh[k],y=S.sh[k+1],bite=S.bit>0&&dhyp(x-S.bx,y-S.by)<1;
      p6glow(x,y,er*1.5,'4,4,12',.55);
      g.fillStyle='rgba(5,5,12,.82)';p6disc(x,y,er*.85);g.fill();
      g.fillStyle=bite?'#ffffff':'rgba(226,230,255,.9)';
      g.beginPath();g.ellipse(x-er*.3,y-er*.12,er*.17,er*.08,.35,0,P6_TAU);g.fill();g.beginPath();g.ellipse(x+er*.3,y-er*.12,er*.17,er*.08,-.35,0,P6_TAU);g.fill();
      if(bite){                                           // teeth
        g.beginPath();for(let j=0;j<5;j++){const tx=x-er*.4+j*er*.2;g.moveTo(tx-er*.09,y+er*.2);g.lineTo(tx,y+er*.5);g.lineTo(tx+er*.09,y+er*.2)}
        g.fill();
      }
    }
  },
  top(f,m){                                               // the bite shows over the rival it closes on
    const S=f.s,e=p6foe(f,m),er=e?e.r:22;
    if(!(S.bit>0)||S.bx===undefined)return;
    const x=S.bx,y=S.by,a=Math.min(1,S.bit*5);
    g.globalAlpha=a;g.fillStyle='#ffffff';g.strokeStyle=P6.EDGE;g.lineWidth=.5;g.lineJoin='round';
    g.beginPath();g.ellipse(x-er*.3,y-er*.12,er*.17,er*.08,.35,0,P6_TAU);g.fill();g.beginPath();g.ellipse(x+er*.3,y-er*.12,er*.17,er*.08,-.35,0,P6_TAU);g.fill();
    g.beginPath();for(let j=0;j<5;j++){const tx=x-er*.4+j*er*.2;g.moveTo(tx-er*.09,y+er*.2);g.lineTo(tx,y+er*.5);g.lineTo(tx+er*.09,y+er*.2);g.closePath()}
    g.fill();g.stroke();g.globalAlpha=1;
  },
  amb(f,e,m,dt){                                          // the shadows smoke along the floor as they walk
    const sh=f.s.sh,er=e?e.r:22;
    if(!sh||!sh.length)return;
    for(let n=FX.due(f.i,'p6sh',4.5*sh.length/2,dt);n>0;n--){
      const k=2*((Math.random()*sh.length/2)|0);
      FX.dust(sh[k]+(Math.random()-.5)*er*1.4,sh[k+1]+(Math.random()-.5)*er*1.4,1,'#0a0a16',{lo:4,hi:18,size:3.4,life:.6});
    }
    for(let n=FX.due(f.i,'p6se',1.2*sh.length/2,dt);n>0;n--){
      const k=2*((Math.random()*sh.length/2)|0);
      FX.wisps(sh[k],sh[k+1]-er*.4,1,'#8f96e6',{life:.5,size:3});
    }
  }};

LOOKS.loop={
  crest(fg){                                              // an arrow that runs backwards round a clock
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';g.lineJoin='round';g.lineWidth=.15;
    g.beginPath();g.arc(0,0,.5,-.9,3.9);g.stroke();
    g.beginPath();g.moveTo(.045,-.603);g.lineTo(.448,-.564);g.lineTo(.174,-.22);g.closePath();g.fill();
    g.lineWidth=.09;g.beginPath();g.moveTo(0,-.27);g.lineTo(0,0);g.lineTo(.2,.1);g.stroke();
  },
  under(f){                                               // where it has been these three seconds, and where it would return to
    const S=f.s,H=S.h;
    for(let k=0;k<H.length;k+=3){
      g.fillStyle='rgba(150,215,245,'+(.12+.5*k/30).toFixed(2)+')';p6disc(H[k].x,H[k].y,1.3+k*.04);g.fill();
    }
    if(H.length>=30&&S.cd<=0){
      const o=H[0];
      g.setLineDash([3,3]);g.strokeStyle='rgba(170,225,250,.75)';g.lineWidth=1.1;p6disc(o.x,o.y,f.r);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(170,225,250,.14)';p6disc(o.x,o.y,f.r);g.fill();
    }
  },
  over(f){
    const S=f.s;
    if(S.jump>0){                                         // the snap back: a streak from where it was
      g.strokeStyle='rgba(190,235,255,'+Math.min(1,S.jump*1.6).toFixed(2)+')';g.lineWidth=2;g.lineCap='round';g.setLineDash([6,5]);
      g.beginPath();g.moveTo(S.fx,S.fy);g.lineTo(f.x,f.y);g.stroke();g.setLineDash([]);
      p6disc(S.fx,S.fy,f.r);g.stroke();
    }
    if(S.cd>0){                                           // winding itself up again
      g.lineCap='butt';g.strokeStyle='rgba(170,225,250,.55)';g.lineWidth=1.2;
      g.beginPath();g.arc(f.x,f.y,f.r+4,-1.5708,-1.5708+P6_TAU*Math.max(0,1-S.cd/(S.wind||8)));g.stroke();
    }
  },
  amb(f,e,m,dt){
    const S=f.s,H=S.h;
    if(f.gone||!H)return;
    if(H.length>=30&&S.cd<=0){                            // armed: the moment it would return to glints
      const o=H[0],hurt=Math.max(0,Math.min(1,(o.hp-f.hp)/(f.max*.3)));
      for(let n=FX.due(f.i,'p6lo',3+9*hurt,dt);n>0;n--){const a=Math.random()*P6_TAU;FX.stars(o.x+dcos(a)*f.r,o.y+dsin(a)*f.r,1,'#bfeaff',{lo:2,hi:12,size:2.6,life:.4})}
      if(hurt>.4)for(let n=FX.due(f.i,'p6lh',10*hurt,dt);n>0;n--)FX.seek(f.x,f.y,-2,1,'#bfeaff',o.x,o.y,{jit:f.r,size:1.1,life:.8});
    }
    if(S.jump>0)for(let n=FX.due(f.i,'p6lj',24,dt);n>0;n--){const u=Math.random();FX.sparks(S.fx+(f.x-S.fx)*u,S.fy+(f.y-S.fy)*u,1,'#bfeaff',{lo:6,hi:40,life:.3,size:1})}
  }};

LOOKS.monk={
  crest(fg,bg){                                           // a lotus
    g.fillStyle=fg;g.strokeStyle=bg;g.lineWidth=.035;g.lineJoin='round';
    for(const a of [-1.05,1.05,-.52,.52,0]){
      const tip=-.84+.2*Math.abs(a);
      g.save();g.translate(0,.36);g.rotate(a);
      g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(.24,-.42,0,tip);g.quadraticCurveTo(-.24,-.42,0,0);g.fill();g.stroke();
      g.restore();
    }
    g.beginPath();g.ellipse(0,.44,.52,.075,0,0,P6_TAU);g.fill();
  },
  back(f){                                                // calm, gathering as rings of warm light
    const c=f.s.calm||0;
    if(c<.15)return;
    p6glow(f.x,f.y,f.r+8+c*5,'255,214,140',Math.min(.5,.12+.07*c));
    g.strokeStyle='rgba(255,226,170,.7)';g.lineWidth=.9;
    for(let k=0;k<Math.floor(c);k++){p6disc(f.x,f.y,f.r+4+k*3.6);g.stroke()}
  },
  over(f){
    const S=f.s;
    if(!(S.palm>0))return;                                // the strike: an open palm of light, thrown forward
    const a=S.pa||0,u=Math.max(0,1-S.palm/.35),d=f.r+6+u*14,x=f.x+dcos(a)*d,y=f.y+dsin(a)*d;
    g.globalAlpha=Math.max(0,1-u);
    g.fillStyle='#fff3cf';g.strokeStyle=P6.EDGE;g.lineWidth=.7;g.lineJoin='round';
    g.save();g.translate(x,y);g.rotate(a);
    g.beginPath();g.ellipse(0,0,5,6.5,0,0,P6_TAU);g.fill();g.stroke();
    for(let k=-2;k<=1;k++){g.beginPath();g.ellipse(6.5,k*3.4+1.7,4.2,1.5,0,0,P6_TAU);g.fill();g.stroke()}
    g.beginPath();g.ellipse(1,-8.2,3.4,1.5,-.9,0,P6_TAU);g.fill();g.stroke();
    g.restore();
    g.globalAlpha=1;
  },
  amb(f,e,m,dt){                                          // calm rises off it as motes of warm light; full calm glitters
    const S=f.s,c=S.calm||0;
    if(f.gone||c<.3)return;
    for(let n=FX.due(f.i,'p6mc',Math.min(11,2.2*c),dt);n>0;n--){const a=Math.random()*P6_TAU,d=f.r*(.8+.5*Math.random());FX.embers(f.x+dcos(a)*d,f.y+dsin(a)*d,1,'#ffd68c',{lo:4,hi:20,life:.8})}
    if(c>=(S.cap||4)-.05)for(let n=FX.due(f.i,'p6mf',4,dt);n>0;n--){const a=Math.random()*P6_TAU,d=f.r+4+Math.random()*10;FX.stars(f.x+dcos(a)*d,f.y+dsin(a)*d,1,'#fff3cf',{lo:2,hi:10,size:3,life:.45})}
  }};

LOOKS.gravity={
  crest(fg,bg){                                           // the apple, falling
    g.fillStyle=fg;g.strokeStyle=fg;g.lineCap='round';
    g.beginPath();g.arc(-.17,.16,.36,0,P6_TAU);g.fill();g.beginPath();g.arc(.17,.16,.36,0,P6_TAU);g.fill();
    g.lineWidth=.07;g.beginPath();g.moveTo(0,-.14);g.quadraticCurveTo(.02,-.36,.14,-.48);g.stroke();
    g.beginPath();g.ellipse(.32,-.38,.17,.08,-.5,0,P6_TAU);g.fill();
    g.lineWidth=.05;g.beginPath();for(const p of [[-.52,-.72,-.48],[-.34,-.8,-.5],[-.16,-.72,-.48]]){g.moveTo(p[0],p[1]);g.lineTo(p[0],p[2])}g.stroke();
    g.fillStyle=bg;g.beginPath();g.ellipse(0,-.16,.07,.04,0,0,P6_TAU);g.fill();
  },
  under(f,m){                                             // the tilt: the low wall glows and the floor points to it
    const S=f.s,t=m?m.t:0;
    if(!S.on)return;
    const gx=S.gx,gy=S.gy,fade=Math.max(0,Math.min(1,S.t/.3,((S.dur||2.3)-S.t)/.2));
    const x0=gx>0?AW:gx<0?0:AW/2,y0=gy>0?AW:gy<0?0:AW/2;
    const q=g.createLinearGradient(x0,y0,x0-gx*70,y0-gy*70);q.addColorStop(0,'rgba(196,232,140,'+(.34*fade).toFixed(2)+')');q.addColorStop(1,'rgba(196,232,140,0)');
    g.fillStyle=q;g.fillRect(gx>0?AW-70:0,gy>0?AW-70:0,gx?70:AW,gy?70:AW);
    g.strokeStyle='rgba(214,240,170,'+(.42*fade).toFixed(2)+')';g.lineWidth=1.6;g.lineCap='round';g.lineJoin='round';
    const slide=(t*60)%52;
    g.beginPath();
    for(let a=0;a<5;a++)for(let b=0;b<5;b++){             // chevrons sliding downhill
      const along=26+a*52,down=(b*52+slide)%260,cx=gx?(gx>0?down:AW-down):along,cy=gy?(gy>0?down:AW-down):along;
      g.moveTo(cx-gx*5-gy*6,cy-gy*5-gx*6);g.lineTo(cx+gx*3,cy+gy*3);g.lineTo(cx-gx*5+gy*6,cy-gy*5+gx*6);
    }
    g.stroke();
  },
  over(f){
    const S=f.s;
    if(!S.on)return;                                      // heavy: a weight ring that sags downhill
    g.strokeStyle='rgba(214,240,170,.8)';g.lineWidth=1.3;p6disc(f.x+S.gx*3,f.y+S.gy*3,f.r+3.5);g.stroke();
  },
  amb(f,e,m,dt){                                          // while the floor is tipped: grit runs downhill, the rival scrapes along, Gravity streaks as it falls
    const S=f.s;
    if(!S.on)return;
    const dir=datan2(S.gy,S.gx);
    for(let n=FX.due(f.i,'p6gs',10,dt);n>0;n--)FX.sparks(Math.random()*AW,Math.random()*AW,1,'#d6f0aa',{dir,spread:.15,lo:70,hi:150,life:.5,size:1,drag:0});
    if(!e.gone)for(let n=FX.due(f.i,'p6ge',6,dt);n>0;n--)FX.dust(e.x-S.gx*e.r+(Math.random()-.5)*e.r,e.y-S.gy*e.r+(Math.random()-.5)*e.r,1,null,{dir:dir+3.1416,spread:.8,lo:10,hi:40});
    if(!f.gone){
      const sp=dhyp(f.vx,f.vy)||1,bx=-f.vx/sp,by=-f.vy/sp;
      for(let n=FX.due(f.i,'p6gf',8,dt);n>0;n--){const off=(Math.random()-.5)*f.r*1.7,x=f.x+bx*f.r*.7-by*off,y=f.y+by*f.r*.7+bx*off,l=10+Math.random()*14;FX.line(x,y,x+bx*l,y+by*l,'#d6f0aa',1,.2)}
    }
  }};

LOOKS.mimic={
  crest(fg,bg){                                           // a chest with teeth
    g.fillStyle=fg;g.lineJoin='round';
    g.beginPath();g.moveTo(-.56,-.2);g.quadraticCurveTo(-.56,-.66,0,-.66);g.quadraticCurveTo(.56,-.66,.56,-.2);g.closePath();g.fill();
    g.beginPath();g.rect(-.56,.1,1.12,.44);g.fill();
    for(let k=0;k<5;k++){const x=-.45+k*.225;g.beginPath();g.moveTo(x-.09,-.2);g.lineTo(x,0);g.lineTo(x+.09,-.2);g.closePath();g.fill()}
    for(let k=0;k<4;k++){const x=-.3375+k*.225;g.beginPath();g.moveTo(x-.09,.1);g.lineTo(x,-.08);g.lineTo(x+.09,.1);g.closePath();g.fill()}
    g.fillStyle=bg;
    g.beginPath();g.ellipse(-.2,-.42,.09,.045,.35,0,P6_TAU);g.fill();g.beginPath();g.ellipse(.2,-.42,.09,.045,-.35,0,P6_TAU);g.fill();
    g.fillRect(-.07,.24,.14,.16);
  },
  back(f){                                                // a blow held ready: the harder it was, the brighter the ring
    const c=f.s.copy||0;
    if(c<=0)return;
    p6glow(f.x,f.y,f.r+7+Math.min(10,c*.25),'255,206,120',Math.min(.6,.25+c*.012));
  },
  over(f,m){
    const S=f.s,e=p6foe(f,m);
    if(S.copy>0&&e){                                      // it wears the rival's own emblem while it holds their blow
      const up=f.y>f.r+16,x=f.x+f.r*.86,y=f.y+(up?-1:1)*f.r*.86,r=7.5,C=typeof LOOKS!=='undefined'&&LOOKS[e.key]&&LOOKS[e.key].crest;
      g.fillStyle=P6.GOLD;g.strokeStyle=P6.EDGE;g.lineWidth=.6;p6disc(x,y,r);g.fill();g.stroke();
      g.fillStyle=e.col||'#555555';p6disc(x,y,r*.84);g.fill();
      g.save();g.translate(x,y);g.scale(r*.72,r*.72);
      g.fillStyle=P6.IVORY;g.strokeStyle=P6.IVORY;g.lineCap='round';g.lineJoin='round';g.lineWidth=.06;
      if(C)C(P6.IVORY,e.col||'#555555');else{g.beginPath();g.moveTo(0,-.56);g.lineTo(.4,0);g.lineTo(0,.56);g.lineTo(-.4,0);g.closePath();g.fill()}
      g.restore();
    }
    if(S.snap>0){                                         // the lid snapping shut on the rival
      g.strokeStyle='rgba(255,236,190,'+Math.min(1,S.snap*3).toFixed(2)+')';g.lineWidth=1.6;g.lineJoin='miter';g.lineCap='round';
      for(const s of [-1,1]){g.beginPath();for(let k=0;k<=6;k++){const x=f.x-f.r+k*f.r/3,y=f.y+s*(f.r+3+(k%2?5:0));if(k)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke()}
    }
  },
  amb(f,e,m,dt){                                          // a held blow seethes: the bigger it is, the more it spits
    const c=f.s.copy||0;
    if(f.gone||c<=0)return;
    for(let n=FX.due(f.i,'p6mh',Math.min(11,2+c*.25),dt);n>0;n--){const a=Math.random()*P6_TAU;FX.embers(f.x+dcos(a)*f.r,f.y+dsin(a)*f.r,1,'#ffce78',{lo:6,hi:28,life:.6})}
    if(c>=20)for(let n=FX.due(f.i,'p6ms',5,dt);n>0;n--){const a=Math.random()*P6_TAU;FX.sparks(f.x+dcos(a)*f.r,f.y+dsin(a)*f.r,1,'#ffecbe',{dir:a,spread:.8,lo:40,hi:120,life:.22,size:1})}
  }};
