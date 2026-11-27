// Sixth pack of fighter classes for Duel King: ten existential and abstract characters. Each class adds a row to FIGHTERS,
// a block to BEHAVE and its art to LOOKS. The first half is pure simulation (it loads in Node with only brawl-sim.js before
// it); the second half is drawing and only runs when the page asks for it. Every top-level name here starts with p6/P6.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.void   ={name:'Void',     color:'#3b3160',hp:100,speed:120,spin:0,  dmg:12.62,cd:.35, arms:[],desc:'A dark well. Whatever drifts too close is dragged in and hurt.',sig:['Event horizon','Its pull reaches further and drags harder'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.dice   ={name:'Dice',     color:'#b8323a',hp:100,speed:175,spin:0,  dmg:15.99,cd:.5, arms:[],desc:'Rolls a die every couple of seconds. A six is a heavy blow; a one hurts itself.',sig:['Loaded dice','Ones turn into sixes more and more often'],sfx:{hit:'thump',shot:'tick'}};
FIGHTERS.monk   ={name:'Monk',     color:'#e2953a',hp:100,speed:125,spin:0,  dmg:8.51, cd:.6, arms:[],desc:'Does nothing while calm. Touch it and all that calm comes out as one palm strike.',sig:['Deeper calm','Calm builds faster and runs deeper'],sfx:{hit:'heavy',shot:'whoosh'}};
FIGHTERS.gravity={name:'Gravity',  color:'#6f9a3c',hp:100,speed:165,spin:0,  dmg:10.35,cd:.6, arms:[],desc:'Tilts the floor. The rival slides to a wall and it drops on them there.',sig:['Heavier','The floor tilts more often and it lands harder'],sfx:{hit:'heavy',shot:'whoosh'}};
FIGHTERS.mimic  ={name:'Mimic',    color:'#9a6a3c',hp:100,speed:180,spin:0,  dmg:13.82,cd:.5, arms:[],desc:'Becomes a copy of whoever it fights, with its own strength and upgrades.',sig:['Perfect copy','Its copy has the rival’s own upgrade, one level for each'],sfx:{hit:'chop',shot:'whoosh'}};
ROSTER.push('void','dice','monk','gravity','mimic');

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
