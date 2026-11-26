// Second pack of fighter classes for Duel King. Each class adds a row to FIGHTERS, a block to BEHAVE and its art to LOOKS.
// The first half is pure simulation (it loads in Node with only brawl-sim.js before it); the second half is drawing and
// only runs when the page asks for it. Every top-level name here starts with p2/P2 so it cannot clash with the other files.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.archer ={name:'Archer',    color:'#a3b86c',hp:100,speed:165,spin:0,  dmg:8.22,cd:1.1,arms:[],desc:'Arrows that miss stay stuck in the wall as spikes.',sig:['Full quiver','Shoots faster; stuck arrows last longer']};
FIGHTERS.hunter ={name:'Hunter',    color:'#c98b4b',hp:100,speed:175,spin:0,  dmg:14.01, cd:.7, arms:[],desc:'Throws a boomerang that hits on the way out and on the way back.',sig:['Heavy boomerang','Bigger, flies further, hits harder']};
FIGHTERS.beacon ={name:'Lighthouse',color:'#ffe08a',hp:100,speed:150,spin:1.9,dmg:6.83,  cd:.2, arms:[],desc:'Sweeps beams of light around the arena.',sig:['Brighter lamp','One more beam']};
FIGHTERS.jugger ={name:'Juggernaut',color:'#b5453c',hp:100,speed:150,spin:0,  dmg:26.2, cd:.5, arms:[],desc:'Winds up, then charges in a straight line. Walls stop it cold.',sig:['Unstoppable','Charges again sooner, and hits harder']};
FIGHTERS.drum   ={name:'Drummer',   color:'#9a8cff',hp:100,speed:160,spin:0,  dmg:10.23, cd:1,  arms:[],desc:'Beats out shockwaves that hurt as the ring passes.',sig:['Bass drum','Shockwaves travel further']};
FIGHTERS.volcano={name:'Volcano',   color:'#e8703a',hp:100,speed:155,spin:0,  dmg:11.33, cd:.9, arms:[],desc:'The floor rumbles, then erupts under the rival.',sig:['Bigger eruptions','Wider craters']};
FIGHTERS.jester ={name:'Jester',    color:'#f04f9a',hp:100,speed:185,spin:5.5,dmg:11.44, cd:.4, arms:[{a:0,l:15,head:5,d:.6},{a:Math.PI,l:15,head:5,d:.6}],desc:'Swaps places with the rival and leaves a surprise behind.',sig:['More tricks','Swaps places more often']};
FIGHTERS.turtle ={name:'Turtle',    color:'#3fa57a',hp:100,speed:150,spin:0,  dmg:13.2, cd:.45,arms:[],desc:'A shell that halves hits from the front while it rams.',sig:['Thicker shell','The shell covers more of it']};
FIGHTERS.pirate ={name:'Pirate',    color:'#4a7fd1',hp:100,speed:165,spin:5.2,dmg:19.41, cd:.4, arms:[{a:0,l:24,d:.6}],desc:'Hooks the rival from across the arena and reels itself in.',sig:['Longer chain','The hook reaches further and comes round sooner']};
FIGHTERS.wizard ={name:'Wizard',    color:'#6f5bd6',hp:100,speed:160,spin:0,  dmg:14.69, cd:1.1,arms:[],desc:'Casts a different spell every time: fire, frost or a vanishing act.',sig:['Quick hands','Casts faster']};
ROSTER.push('archer','hunter','beacon','jugger','drum','volcano','jester','turtle','pirate','wizard');

const p2clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
// distance from (x,y) along the unit direction (c,s) to the arena wall
function p2ray(x,y,c,s){const tx=c>0?(AW-x)/c:c<0?-x/c:1e9,ty=s>0?(AW-y)/s:s<0?-y/s:1e9;return Math.max(0,Math.min(tx,ty))}
const p2rest=f=>Math.max(.6,1.7-.35*f.sig)/f.spdMul;

// Archer: aimed arrows. One that misses buries itself in the wall and stays there as a spike until something hits it.
BEHAVE.archer={
  init(f){f.s.arrows=[];f.s.t=.7},
  tick(f,e,m,rage){
    const D=FIGHTERS.archer,A=f.s.arrows;
    f.s.t-=DT;
    if(f.s.t<=0&&!e.gone){
      f.s.t=D.cd/f.spdMul/(1+.22*f.sig);
      const d=gap(e,f)||1,lead=d/360*.6,an=datan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x)+(m.rnd()-.5)*.18;
      A.push({x:f.x+dcos(an)*f.r,y:f.y+dsin(an)*f.r,an,stuck:0,age:0,tx:0,ty:0});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    let stuck=0;
    for(let i=A.length-1;i>=0;i--){
      const q=A[i];
      if(!q.stuck){
        q.x+=dcos(q.an)*360*DT;q.y+=dsin(q.an)*360*DT;
        if(!e.gone&&dhyp(q.x-e.x,q.y-e.y)<e.r+3){m.events.push({k:'fx',n:'shards',x:q.x,y:q.y,num:3,col:'#c9a877',dir:q.an+Math.PI,spread:1.6,size:2,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f);A.splice(i,1);continue}
        if(q.x<=0||q.x>=AW||q.y<=0||q.y>=AW){
          q.x=Math.min(AW,Math.max(0,q.x));q.y=Math.min(AW,Math.max(0,q.y));
          q.stuck=1;q.tx=q.x-dcos(q.an)*24;q.ty=q.y-dsin(q.an)*24;stuck++;
          m.events.push({k:'fx',n:'dust',x:q.x,y:q.y,num:3,i:f.i});m.events.push({k:'fx',n:'sparks',x:q.x,y:q.y,num:4,col:'#ffe2a0',dir:q.an+Math.PI,spread:1.8,lo:40,hi:130,life:.22,i:f.i});
        }
      }else{
        q.age+=DT;
        if(q.age>7+2*f.sig){m.events.push({k:'fx',n:'dust',x:q.tx,y:q.ty,num:2,i:f.i});A.splice(i,1);continue}
        if(!e.gone&&distPS(e.x,e.y,q.x,q.y,q.tx,q.ty)<e.r){
          m.hurt(e,D.dmg*.6*f.dmgMul*rage,f);m.events.push({k:'pop',x:q.tx,y:q.ty,i:f.i});m.events.push({k:'fx',n:'shards',x:q.tx,y:q.ty,num:5,col:'#c9a877',size:2.2,i:f.i});A.splice(i,1);continue;
        }
        stuck++;
      }
    }
    if(stuck>6+3*f.sig){const k=A.findIndex(q=>q.stuck);if(k>=0){m.events.push({k:'fx',n:'dust',x:A[k].tx,y:A[k].ty,num:2,i:f.i});A.splice(k,1)}}
  }};

// Hunter: one boomerang. It flies out, slows, turns round and comes home, and can hit once in each direction.
BEHAVE.hunter={
  init(f){f.s.b=null;f.s.t=.6},
  tick(f,e,m,rage){
    const D=FIGHTERS.hunter,S=f.s;
    if(!S.b){
      S.t-=DT;
      if(S.t<=0&&!e.gone){
        const d=gap(e,f)||1,lead=d/330*.5;
        S.b={x:f.x,y:f.y,an:datan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x),t:0,back:0,hit:0,rot:0};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    const b=S.b,size=7+2*f.sig;
    b.t+=DT;b.rot+=16*DT;
    if(!b.back){
      const sp=340*Math.max(.25,1-b.t/(.75+.12*f.sig));       // slows as it reaches the far end of its flight
      b.x+=dcos(b.an)*sp*DT;b.y+=dsin(b.an)*sp*DT;
      if(b.t>.62+.1*f.sig||b.x<size||b.x>AW-size||b.y<size||b.y>AW-size){b.back=1;b.hit=0;b.x=p2clamp(b.x,size);b.y=p2clamp(b.y,size);m.events.push({k:'fx',n:'wave',x:b.x,y:b.y,r0:3,r:size*2.4,life:.24,col:'#f0dca4',w:1.6,i:f.i})}
    }else{
      const d=dhyp(f.x-b.x,f.y-b.y)||1;
      b.x+=(f.x-b.x)/d*400*DT;b.y+=(f.y-b.y)/d*400*DT;
      if(d<f.r+8||b.t>5){m.events.push({k:'fx',n:'stars',x:b.x,y:b.y,num:3,col:'#f0dca4',lo:10,hi:50,i:f.i});m.events.push({k:'fx',n:'wave',x:b.x,y:b.y,r0:size*1.6,r:3,life:.2,col:'#f0dca4',w:1.4,i:f.i});S.b=null;S.t=D.cd/f.spdMul;return}
    }
    if(!b.hit&&!e.gone&&dhyp(b.x-e.x,b.y-e.y)<e.r+size){b.hit=1;m.events.push({k:'fx',n:'slash',x:b.x,y:b.y,dir:b.back?datan2(f.y-b.y,f.x-b.x):b.an,r:size*2.6,col:'#f0dca4',i:f.i});m.events.push({k:'fx',n:'shards',x:b.x,y:b.y,num:4,col:'#c9a877',size:2,i:f.i});m.hurt(e,D.dmg*(1+.22*f.sig)*f.dmgMul*rage,f)}
  }};

// Lighthouse: beams from its body to the walls, turning slowly. Every wall it bounces off reverses the sweep.
BEHAVE.beacon={
  init(f){f.s.beams=[]},
  bounce(f,m){f.dir*=-1;m.events.push({k:'fx',n:'flash',x:f.x,y:f.y,r:f.r*2,col:'#ffe08a',life:.2,i:f.i});m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:2,col:'#fff1c9',jit:f.r,i:f.i})},
  tick(f,e,m,rage){
    const D=FIGHTERS.beacon,n=2+f.sig,B=f.s.beams;
    B.length=0;
    let lit=false;
    for(let k=0;k<n;k++){
      const an=f.ang+k*6.2832/n,c=dcos(an),s=dsin(an),L=p2ray(f.x,f.y,c,s),x2=f.x+c*L,y2=f.y+s*L;
      B.push(x2,y2);
      if(!e.gone&&distPS(e.x,e.y,f.x,f.y,x2,y2)<e.r)lit=true;
    }
    if(lit&&f.cd<=0){f.cd=D.cd;m.events.push({k:'fx',n:'sparks',x:e.x,y:e.y,num:3,col:'#ffe9a8',jit:e.r,lo:30,hi:100,life:.26,grav:-60,i:f.i});m.events.push({k:'fx',n:'flash',x:e.x,y:e.y,r:e.r*1.3,col:'#ffe08a',life:.12,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f)}
  }};

// Juggernaut: roam, plant its feet (mode 1), charge (mode 2). Hitting a wall mid-charge leaves it dazed (mode 3).
BEHAVE.jugger={
  init(f){f.s.mode=0;f.s.t=1.2},
  tick(f,e,m){
    const S=f.s;
    S.t-=DT;
    if(S.t>0)return;
    if(S.mode===0){S.mode=1;S.t=.55;m.events.push({k:'ring',x:f.x,y:f.y,r0:f.r+18,r:f.r,life:.5,w:3,i:f.i});m.events.push({k:'fx',n:'dust',x:f.x,y:f.y+f.r*.5,num:5,jit:f.r*1.4,i:f.i})}
    else if(S.mode===1){
      S.mode=2;S.t=1;
      if(!e.gone){const d=gap(e,f)||1;f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed}
      m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+28,life:.3,w:3.4,fill:.25,i:f.i});m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:8,jit:f.r,lo:40,hi:120,i:f.i});m.events.push({k:'fx',n:'shake',r:2,i:f.i});
    }else{if(S.mode===2)m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:4,jit:f.r,i:f.i});S.mode=0;S.t=p2rest(f)}
  },
  fast:f=>f.s.mode===1?.06:f.s.mode===2?3:f.s.mode===3?.03:1,
  bounce(f,m,x,y){
    if(f.s.mode!==2)return;
    f.s.mode=3;f.s.t=.7;
    m.events.push({k:'burst',x,y,n:12,i:f.i});
    m.events.push({k:'fx',n:'shatter',x,y,num:10,col:'#9a907e',r:20,i:f.i});m.events.push({k:'fx',n:'dust',x,y,num:8,lo:30,hi:120,i:f.i});m.events.push({k:'fx',n:'shake',r:4,i:f.i});
    m.events.push({k:'fx',n:'stars',x:f.x,y:f.y-f.r,num:5,col:'#f0dca4',jit:f.r,i:f.i});m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Dazed',col:'#f0dca4',i:f.i});
  },
  touch:f=>f.s.mode===2?FIGHTERS.jugger.dmg*(1+.2*f.sig):f.s.mode===3?0:FIGHTERS.jugger.dmg*.2,
  dealt(f,v,dmg,m){if(f.s.mode===2){f.s.mode=0;f.s.t=p2rest(f);m.knock(v,f);
    m.events.push({k:'fx',n:'wave',x:v.x,y:v.y,r0:v.r*.5,r:v.r+32,life:.34,w:4,fill:.3,i:f.i});m.events.push({k:'fx',n:'sparks',x:(f.x+v.x)/2,y:(f.y+v.y)/2,num:14,col:'#ffe2a0',lo:120,hi:330,life:.36,i:f.i});m.events.push({k:'fx',n:'dust',x:(f.x+v.x)/2,y:(f.y+v.y)/2,num:5,lo:30,hi:100,i:f.i});m.events.push({k:'fx',n:'shake',r:4,i:f.i})}}};

// Drummer: every beat sends out a ring. It hurts once, at the moment its edge crosses the rival.
BEHAVE.drum={
  init(f){f.s.rings=[];f.s.t=.8},
  tick(f,e,m,rage){
    const D=FIGHTERS.drum,S=f.s,Q=S.rings;
    S.t-=DT;
    if(S.t<=0){S.t=D.cd/f.spdMul;Q.push({x:f.x,y:f.y,r:f.r,hit:0,max:115+20*f.sig});m.events.push({k:'bump',x:f.x,y:f.y});m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r*.6,r:f.r+16,life:.22,col:'#f0dca4',w:2.6,fill:.3,i:f.i});m.events.push({k:'fx',n:'stars',x:f.x,y:f.y-f.r,num:2,col:'#f0dca4',dir:-1.57,spread:1.4,lo:40,hi:90,i:f.i})}
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.r+=165*DT;
      if(!q.hit&&!e.gone&&Math.abs(dhyp(e.x-q.x,e.y-q.y)-q.r)<e.r*.7){q.hit=1;m.events.push({k:'fx',n:'sparks',x:e.x,y:e.y,num:8,col:'#f0dca4',dir:datan2(e.y-q.y,e.x-q.x),spread:2,lo:80,hi:220,life:.3,i:f.i});m.events.push({k:'fx',n:'wave',x:e.x,y:e.y,r0:e.r,r:e.r+14,life:.22,col:'#f0dca4',w:2,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,q)}
      if(q.r>q.max)Q.splice(i,1);
    }
  }};

// Volcano: marks the floor where the rival is heading; the mark erupts a moment later and leaves lava for a while.
BEHAVE.volcano={
  init(f){f.s.vents=[];f.s.t=.7},
  tick(f,e,m,rage){
    const D=FIGHTERS.volcano,S=f.s,V=S.vents;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/f.spdMul;
      const lead=.25+m.rnd()*.45,rad=30+5*f.sig;
      V.push({x:p2clamp(e.x+e.vx*lead+(m.rnd()-.5)*36,rad*.6),y:p2clamp(e.y+e.vy*lead+(m.rnd()-.5)*36,rad*.6),r:rad,t:0,hot:0,cd:0});
      m.events.push({k:'fx',n:'dust',x:V[V.length-1].x,y:V[V.length-1].y,num:4,jit:rad,i:f.i});
    }
    for(let i=V.length-1;i>=0;i--){
      const q=V[i];
      q.t+=DT;
      if(!q.hot){
        if(q.t>=.6){
          q.hot=1;q.t=0;
          m.events.push({k:'burst',x:q.x,y:q.y,n:10,i:f.i});
          m.events.push({k:'fx',n:'flash',x:q.x,y:q.y,r:q.r*1.4,col:'#ffb347',life:.22,i:f.i});m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:6,r:q.r*1.15,life:.34,col:'#ff8a3a',w:3.4,fill:.45,i:f.i});
          m.events.push({k:'fx',n:'sparks',x:q.x,y:q.y,num:16,col:'#ffb347',dir:-1.5708,spread:2.6,lo:120,hi:320,grav:260,life:.5,size:1.6,i:f.i});m.events.push({k:'fx',n:'embers',x:q.x,y:q.y,num:8,col:'#ff8a3a',jit:q.r,i:f.i});
          m.events.push({k:'fx',n:'smoke',x:q.x,y:q.y,num:3,jit:q.r*.6,i:f.i});m.events.push({k:'fx',n:'scorch',x:q.x,y:q.y,r:q.r*.9,life:3,i:f.i});
          if(!e.gone&&dhyp(e.x-q.x,e.y-q.y)<q.r+e.r*.5){m.events.push({k:'fx',n:'shake',r:2.5,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,q)}
        }
      }else{
        if(q.cd>0)q.cd-=DT;
        else if(!e.gone&&dhyp(e.x-q.x,e.y-q.y)<q.r){q.cd=.4;m.events.push({k:'fx',n:'fire',x:e.x,y:e.y+e.r*.4,num:5,i:f.i});m.hurt(e,D.dmg*.3*f.dmgMul*rage,f)}
        if(q.t>1.3)V.splice(i,1);
      }
    }
  }};

// Jester: juggles two balls (its arms), and every few seconds trades places with the rival, who lands on a box about to pop.
BEHAVE.jester={
  init(f){f.s.t=2;f.s.boxes=[];f.s.poof=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.jester,S=f.s;
    if(S.poof>0){S.poof-=DT;if(S.poof<=0){f.gone=false;m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:6,jit:f.r*1.6,i:f.i})}}   // it arrives in a puff and cannot be touched for a moment
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=Math.max(1.6,3.4-.5*f.sig)/f.spdMul;
      const ox=f.x,oy=f.y;
      f.x=p2clamp(e.x,f.r);f.y=p2clamp(e.y,f.r);e.x=p2clamp(ox,e.r);e.y=p2clamp(oy,e.r);
      S.boxes.push({x:ox,y:oy,t:0});
      f.gone=true;S.poof=.8;
      e.slowT=Math.max(e.slowT,.5);                     // the rival lands off balance, so its speed does not decide whether the box catches it
      m.events.push({k:'burst',x:ox,y:oy,n:8,i:f.i});m.events.push({k:'burst',x:f.x,y:f.y,n:8,i:f.i});
      m.events.push({k:'fx',n:'tele',x:ox,y:oy,r:e.r,i:f.i});m.events.push({k:'fx',n:'tele',x:f.x,y:f.y,r:f.r,i:f.i});m.events.push({k:'fx',n:'line',x:ox,y:oy,x2:f.x,y2:f.y,w:2.6,life:.3,i:f.i});m.events.push({k:'fx',n:'confetti',x:f.x,y:f.y,num:8,i:f.i});
    }
    for(let i=S.boxes.length-1;i>=0;i--){
      const q=S.boxes[i];
      q.t+=DT;
      if(q.t>=.35){
        m.events.push({k:'blast',x:q.x,y:q.y,r:42,i:f.i});m.events.push({k:'fx',n:'confetti',x:q.x,y:q.y,num:16,i:f.i});m.events.push({k:'fx',n:'stars',x:q.x,y:q.y,num:5,col:'#f0dca4',lo:40,hi:140,i:f.i});
        if(!e.gone&&dhyp(e.x-q.x,e.y-q.y)<42+e.r*.5){m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,q)}
        S.boxes.splice(i,1);
      }
    }
  }};

// Turtle: hits that come from the side it is heading towards mostly bounce off the shell. It fights by ramming.
BEHAVE.turtle={
  init(f){f.s.clang=0;f.s.arc=1.35+.3*f.sig;f.s.head=datan2(f.vy,f.vx)},
  // The heading is noted every step before bodies collide: by the time a ramming hit is scored the turtle has already
  // bounced away, and the shell must count for the side it was facing when it was hit.
  tick(f){if(f.s.clang>0)f.s.clang-=DT;f.s.head=datan2(f.vy,f.vx)},
  guard(f,src,dmg,m){
    let d=Math.abs(f.s.head-datan2(src.y-f.y,src.x-f.x))%6.2832;
    if(d>Math.PI)d=6.2832-d;
    if(d<f.s.arc){
      f.s.clang=.18;
      const a=datan2(src.y-f.y,src.x-f.x),sx=f.x+dcos(a)*(f.r+5),sy=f.y+dsin(a)*(f.r+5);     // where the blow lands on the shell
      m.events.push({k:'fx',n:'sparks',x:sx,y:sy,num:7,col:'#d7dde2',dir:a,spread:1.8,lo:90,hi:240,life:.22,i:f.i});m.events.push({k:'fx',n:'wave',x:sx,y:sy,r0:2,r:15,life:.2,col:'#ffffff',w:1.6,i:f.i});m.events.push({k:'fx',n:'stars',x:sx,y:sy,num:1,col:'#ffffff',lo:0,hi:6,life:.22,size:5,i:f.i});
      return .5;
    }
    return 1;
  },
  touch:()=>FIGHTERS.turtle.dmg,
  dealt(f,v,dmg,m){m.events.push({k:'fx',n:'wave',x:(f.x+v.x)/2,y:(f.y+v.y)/2,r0:4,r:22,life:.24,w:2.4,i:f.i});m.events.push({k:'fx',n:'dust',x:(f.x+v.x)/2,y:(f.y+v.y)/2,num:4,i:f.i});m.knock(v,f)}};

// Pirate: a cutlass for close work, and a hook. If the hook lands, the pirate hauls itself in at speed and hits on arrival.
BEHAVE.pirate={
  init(f){f.s.hook=null;f.s.t=1;f.s.reel=0;f.s.armed=false},
  tick(f,e,m,rage){
    const D=FIGHTERS.pirate,S=f.s;
    if(S.reel>0){
      S.reel-=DT;
      if(e.gone||S.reel<=0||!S.hook){S.reel=0;S.armed=false;S.hook=null;return}
      const d=gap(e,f)||1;
      f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed;
      S.hook.x=e.x;S.hook.y=e.y;
      return;
    }
    const h=S.hook;
    if(!h){
      S.t-=DT;
      if(S.t<=0&&!e.gone){
        S.t=Math.max(1.2,2.3-.35*f.sig)/f.spdMul;
        S.hook={x:f.x,y:f.y,an:f.aim+(m.rnd()-.5)*.14,out:1,range:150+35*f.sig};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    if(h.out){
      h.x+=dcos(h.an)*430*DT;h.y+=dsin(h.an)*430*DT;
      if(!e.gone&&dhyp(h.x-e.x,h.y-e.y)<e.r+5){
        m.events.push({k:'fx',n:'sparks',x:h.x,y:h.y,num:8,col:'#d7dde2',lo:70,hi:200,life:.24,i:f.i});m.events.push({k:'fx',n:'line',x:f.x,y:f.y,x2:e.x,y2:e.y,col:'#ffffff',w:2.6,life:.25,i:f.i});m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Hooked',i:f.i});
        m.hurt(e,D.dmg*.4*f.dmgMul*rage,f);
        S.reel=.75;S.armed=true;                       // armed only after the hook's own hit, so that hit does not end the reel
      }else if(dhyp(h.x-f.x,h.y-f.y)>h.range||h.x<0||h.x>AW||h.y<0||h.y>AW){h.out=0;m.events.push({k:'fx',n:'sparks',x:p2clamp(h.x,0),y:p2clamp(h.y,0),num:3,col:'#d7dde2',lo:30,hi:90,life:.2,i:f.i})}
    }else{
      const d=dhyp(f.x-h.x,f.y-h.y)||1;
      h.x+=(f.x-h.x)/d*520*DT;h.y+=(f.y-h.y)/d*520*DT;
      if(d<f.r+10)S.hook=null;
    }
  },
  fast:f=>f.s.reel>0?2.8:1,
  touch:f=>f.s.reel>0?FIGHTERS.pirate.dmg:0,
  dealt(f,v,dmg,m){if(f.s.armed){f.s.armed=false;f.s.reel=0;f.s.hook=null;
    m.events.push({k:'fx',n:'slash',x:v.x,y:v.y,dir:datan2(v.y-f.y,v.x-f.x),r:v.r*1.6,col:'#ffffff',i:f.i});m.events.push({k:'fx',n:'wave',x:v.x,y:v.y,r0:v.r*.5,r:v.r+22,life:.3,w:3,fill:.25,i:f.i});m.events.push({k:'fx',n:'dust',x:(f.x+v.x)/2,y:(f.y+v.y)/2,num:4,i:f.i});m.events.push({k:'fx',n:'shake',r:3,i:f.i})}}};

// Wizard: each cast is one of three spells. Fire is slow and follows; frost is fast and slows; the third is a vanishing
// act that leaves a blast where the wizard was standing.
BEHAVE.wizard={
  init(f){f.s.t=.9;f.s.spells=[]},
  tick(f,e,m,rage){
    const D=FIGHTERS.wizard,S=f.s,Q=S.spells;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/(1+.25*f.sig)/f.spdMul;
      const k=(m.rnd()*3)|0;
      if(k===0){
        Q.push({fire:1,x:f.x,y:f.y,vx:dcos(f.aim)*185,vy:dsin(f.aim)*185,r:9,t:0});
        m.events.push({k:'text',x:f.x,y:f.y,txt:'Fire',i:f.i});
        m.events.push({k:'fx',n:'fire',x:f.x+dcos(f.aim+.9)*(f.r+16),y:f.y+dsin(f.aim+.9)*(f.r+16),num:6,i:f.i});m.events.push({k:'fx',n:'flash',x:f.x+dcos(f.aim+.9)*(f.r+16),y:f.y+dsin(f.aim+.9)*(f.r+16),r:16,col:'#ff9a3a',life:.18,i:f.i});
      }else if(k===1){
        const d=gap(e,f)||1,lead=d/400*.7,an=datan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x);
        Q.push({fire:0,x:f.x,y:f.y,vx:dcos(an)*400,vy:dsin(an)*400,r:5,t:0});
        m.events.push({k:'text',x:f.x,y:f.y,txt:'Frost',i:f.i});
        m.events.push({k:'fx',n:'flakes',x:f.x+dcos(f.aim+.9)*(f.r+16),y:f.y+dsin(f.aim+.9)*(f.r+16),num:6,jit:10,i:f.i});m.events.push({k:'fx',n:'flash',x:f.x+dcos(f.aim+.9)*(f.r+16),y:f.y+dsin(f.aim+.9)*(f.r+16),r:16,col:'#9fe0ff',life:.18,i:f.i});
      }else{
        const ox=f.x,oy=f.y;
        let bx=ox,by=oy,bd=-1;
        for(let n=0;n<6;n++){const x=f.r+m.rnd()*(AW-2*f.r),y=f.r+m.rnd()*(AW-2*f.r),d=dhyp(x-e.x,y-e.y);if(d>bd){bd=d;bx=x;by=y}}
        f.x=bx;f.y=by;
        m.events.push({k:'blast',x:ox,y:oy,r:46,i:f.i});m.events.push({k:'burst',x:bx,y:by,n:8,i:f.i});
        m.events.push({k:'text',x:ox,y:oy,txt:'Blink',i:f.i});
        m.events.push({k:'fx',n:'tele',x:ox,y:oy,r:f.r,i:f.i});m.events.push({k:'fx',n:'tele',x:bx,y:by,r:f.r,i:f.i});m.events.push({k:'fx',n:'line',x:ox,y:oy,x2:bx,y2:by,col:'#c9b8ff',w:2.2,life:.3,i:f.i});
        if(dhyp(e.x-ox,e.y-oy)<46+e.r*.5){m.hurt(e,D.dmg*.9*f.dmgMul*rage,f);m.knock(e,{x:ox,y:oy})}
      }
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;
      if(q.fire&&!e.gone){
        const d=dhyp(e.x-q.x,e.y-q.y)||1;
        q.vx+=(e.x-q.x)/d*240*DT;q.vy+=(e.y-q.y)/d*240*DT;
        const sp=dhyp(q.vx,q.vy)||1;q.vx*=185/sp;q.vy*=185/sp;
      }
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      if(!e.gone&&dhyp(e.x-q.x,e.y-q.y)<e.r+q.r){
        if(q.fire){m.events.push({k:'fx',n:'fire',x:q.x,y:q.y,num:12,i:f.i});m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:4,r:30,life:.3,col:'#ff8a3a',w:3,fill:.4,i:f.i});m.events.push({k:'fx',n:'flash',x:q.x,y:q.y,r:26,col:'#ffb347',life:.18,i:f.i});m.events.push({k:'fx',n:'scorch',x:q.x,y:q.y,r:14,life:2.5,i:f.i});m.events.push({k:'fx',n:'shake',r:2,i:f.i});m.hurt(e,D.dmg*1.2*f.dmgMul*rage,f)}
        else{m.events.push({k:'fx',n:'frost',x:e.x,y:e.y,r:e.r+6,num:8,i:f.i});m.hurt(e,D.dmg*.6*f.dmgMul*rage,f);e.slowT=Math.max(e.slowT,2)}
        Q.splice(i,1);continue;
      }
      if(q.x<0||q.x>AW||q.y<0||q.y>AW||q.t>3.2){m.events.push({k:'fx',n:'sparks',x:p2clamp(q.x,0),y:p2clamp(q.y,0),num:5,col:q.fire?'#ff9a3a':'#bfe9ff',lo:30,hi:110,life:.24,i:f.i});Q.splice(i,1)}
    }
  }};

// ---------- art ----------
// "Gilded": every fighter is a medallion (worked gold ring, enamel in the player's colour, an ivory crest), drawn by the
// shared drawFighter in brawl-looks.js. These blocks add what makes each class its own:
//   crest(fg,bg)                 the emblem, drawn with the origin at the medallion centre and the enamel field at radius 1
//   arm(f,A,x1,y1,x2,y2,an)      one of its weapon arms, in arena units
//   under(f,m) / back(f) / over(f,m)   what it puts on the floor, behind the medallion, or on top of everything
//   top(f,m)                     what must show above BOTH fighters: arrows, boomerang, hook and spells in flight
//   amb(f,e,m,dt)                called every frame by the effects engine (brawl-fx.js): the class's continuous sparks and smoke
// The floor is dark stone, so everything here is steel, gold, wood and warm light. All of it draws with g, the current context.
const P2={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',GOLD_LO:typeof GOLD_LO!=='undefined'?GOLD_LO:'#7a5d2b',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  CRIMSON:typeof CRIMSON!=='undefined'?CRIMSON:'#8f2732',CRIMSON_LO:typeof CRIMSON_LO!=='undefined'?CRIMSON_LO:'#5e1820',
  STEEL:typeof STEEL!=='undefined'?STEEL:'#d7dde2',STEEL_LO:typeof STEEL_LO!=='undefined'?STEEL_LO:'#8b959d',
  WOOD:typeof WOOD!=='undefined'?WOOD:'#6f4d30',LEATHER:typeof LEATHER!=='undefined'?LEATHER:'#3a2a1e',
  ASH:'#c9a877',        // pale carved wood: arrow shafts, drumsticks, the boomerang
  LAMP:'255,224,150',   // warm lantern light, as an r,g,b triple for glows
};
const P2_TAU=6.2832;
const p2disc=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,P2_TAU)};
// lighten (k>0) or darken (k<0) a #rrggbb colour
function p2shade(hex,k){
  const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return hex;
  const n=parseInt(m[1],16),f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
  return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';
}
// a soft round glow; rgb is an "r,g,b" triple
function p2glow(x,y,r,rgb,a){
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p2disc(x,y,r);g.fill();
}
// stroke the current path as a solid rod: dark edge underneath, the material on top
function p2rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P2.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
function p2seg(x1,y1,x2,y2,col,w){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);p2rod(col,w)}
// fill the current path and give it the thin dark edge everything solid has
function p2solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P2.EDGE;g.lineWidth=1;g.lineJoin='round';g.stroke()}
// a small polished sphere
function p2gem(x,y,r,col){
  const q=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);q.addColorStop(0,p2shade(col,.6));q.addColorStop(.55,col);q.addColorStop(1,p2shade(col,-.45));
  p2disc(x,y,r);p2solid(q);
}
function p2star(x,y,r,col){
  g.beginPath();for(let k=0;k<8;k++){const a=k/8*P2_TAU-1.5708,q=k%2?r*.38:r;g.lineTo(x+dcos(a)*q,y+dsin(a)*q)}
  g.closePath();g.fillStyle=col;g.fill();
}
// additive light from the effects engine (brawl-fx.js); nothing when the page has not loaded it
const p2lite=(x,y,r,col,a)=>{if(typeof FX!=='undefined'&&FX.glow)FX.glow(g,x,y,r,col,a)};
const p2on=m=>typeof FX!=='undefined'&&!m.over;        // may a class's amb() emit right now?
// an arrow whose head is at (hx,hy), pointing along an. A buried arrow shows no head.
function p2arrow(hx,hy,an,len,head){
  const c=dcos(an),s=dsin(an),tx=hx-c*len,ty=hy-s*len;
  p2seg(tx,ty,hx,hy,P2.ASH,1.3);
  for(const k of [-1,1]){                                   // fletching
    g.beginPath();g.moveTo(tx+c*6,ty+s*6);g.lineTo(tx,ty);g.lineTo(tx-c*2.5-s*3.3*k,ty-s*2.5+c*3.3*k);g.closePath();p2solid(P2.CRIMSON);
  }
  if(head){g.beginPath();g.moveTo(hx+c*4.5,hy+s*4.5);g.lineTo(hx-c*2-s*2.7,hy-s*2+c*2.7);g.lineTo(hx-c*2+s*2.7,hy-s*2-c*2.7);g.closePath();p2solid(P2.STEEL)}
}
// a carved wooden boomerang
function p2boomerang(x,y,rot,size){
  const L=size*1.5,c1=dcos(rot),s1=dsin(rot),c2=dcos(rot+1.9),s2=dsin(rot+1.9);
  g.beginPath();g.moveTo(x+c1*L,y+s1*L);g.lineTo(x,y);g.lineTo(x+c2*L,y+s2*L);p2rod(P2.ASH,size*.55);
  g.strokeStyle='rgba(255,240,205,.55)';g.lineWidth=.8;g.beginPath();g.moveTo(x+c1*L*.85,y+s1*L*.85);g.lineTo(x,y);g.lineTo(x+c2*L*.85,y+s2*L*.85);g.stroke();
  g.fillStyle=P2.GOLD;for(const p of [[c1,s1],[c2,s2]]){p2disc(x+p[0]*L,y+p[1]*L,size*.2);g.fill()}
}

LOOKS.archer={
  crest(fg){                                              // a drawn bow, arrow on the string
    g.lineCap='round';g.lineJoin='round';g.strokeStyle=fg;g.fillStyle=fg;
    g.lineWidth=.1;g.beginPath();g.arc(-.2,0,.62,-1.12,1.12);g.stroke();
    g.lineWidth=.035;g.beginPath();g.moveTo(.07,-.558);g.lineTo(-.46,0);g.lineTo(.07,.558);g.stroke();
    g.lineWidth=.06;g.beginPath();g.moveTo(-.46,0);g.lineTo(.52,0);g.stroke();
    g.beginPath();g.moveTo(.76,0);g.lineTo(.48,-.13);g.lineTo(.48,.13);g.closePath();g.fill();
    g.lineWidth=.045;g.beginPath();
    for(const x of [-.4,-.28]){g.moveTo(x,0);g.lineTo(x-.12,-.11);g.moveTo(x,0);g.lineTo(x-.12,.11)}
    g.stroke();
  },
  under(f){for(const q of f.s.arrows)if(q.stuck)p2arrow(q.x,q.y,q.an,24,false)},      // arrows buried in the wall, tails out
  over(f){                                                // the bow, held towards the rival, and arrows in flight
    const a=f.aim,cx=f.x+dcos(a)*(f.r-2),cy=f.y+dsin(a)*(f.r-2),R=13;
    const x1=cx+dcos(a-1.15)*R,y1=cy+dsin(a-1.15)*R,x2=cx+dcos(a+1.15)*R,y2=cy+dsin(a+1.15)*R;
    g.strokeStyle='rgba(243,234,214,.8)';g.lineWidth=.8;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
    g.beginPath();g.arc(cx,cy,R,a-1.15,a+1.15);p2rod('#8a5f3a',2.3);
    g.fillStyle=P2.GOLD;p2disc(x1,y1,1.5);g.fill();p2disc(x2,y2,1.5);g.fill();
  },
  top(f){for(const q of f.s.arrows)if(!q.stuck){p2lite(q.x,q.y,7,'#ffe2a0',.45);p2arrow(q.x,q.y,q.an,17,true)}},   // arrows in flight, over both fighters
  amb(f,e,m,dt){
    if(!p2on(m))return;
    for(const q of f.s.arrows){
      if(!q.stuck){for(let n=FX.due(f.i,'ar',16,dt);n>0;n--)FX.sparks(q.x-dcos(q.an)*10,q.y-dsin(q.an)*10,1,'#f0dca4',{lo:4,hi:22,life:.22,size:.9})}
      else for(let n=FX.due(f.i,'as',.5,dt);n>0;n--){const t=Math.random();FX.stars(q.x+(q.tx-q.x)*t,q.y+(q.ty-q.y)*t,1,'#fff1c9',{lo:0,hi:5,size:2.6,life:.35})}
    }
  }};

LOOKS.hunter={
  crest(fg,bg){                                           // a stag's head
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.beginPath();g.moveTo(0,.7);g.quadraticCurveTo(.2,.52,.2,.1);g.lineTo(.12,-.1);g.lineTo(-.12,-.1);g.lineTo(-.2,.1);g.quadraticCurveTo(-.2,.52,0,.7);g.fill();
    for(const s of [-1,1]){
      g.beginPath();g.moveTo(s*.15,-.02);g.lineTo(s*.44,-.06);g.lineTo(s*.2,.14);g.closePath();g.fill();
      g.lineWidth=.075;g.beginPath();
      g.moveTo(s*.1,-.1);g.quadraticCurveTo(s*.14,-.44,s*.52,-.6);          // main beam
      g.moveTo(s*.17,-.34);g.lineTo(s*.1,-.66);                             // tines
      g.moveTo(s*.32,-.5);g.lineTo(s*.3,-.74);
      g.moveTo(s*.24,-.42);g.lineTo(s*.56,-.34);
      g.stroke();
    }
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.arc(s*.09,.16,.035,0,P2_TAU);g.fill()}
    g.beginPath();g.ellipse(0,.58,.06,.035,0,0,P2_TAU);g.fill();
  },
  over(f){                                                // the boomerang: in the air, or waiting in hand
    if(!f.s.b)p2boomerang(f.x+dcos(f.aim+1.3)*(f.r+7),f.y+dsin(f.aim+1.3)*(f.r+7),f.aim-.95,6);
  },
  top(f){                                                 // in the air, over both fighters
    const b=f.s.b;
    if(!b)return;
    const size=7+2*f.sig;
    p2lite(b.x,b.y,size*2.4,'#f0dca4',.35);
    g.strokeStyle='rgba(201,168,119,.22)';g.lineWidth=2;p2disc(b.x,b.y,size*1.5);g.stroke();   // the blur of its spin
    p2boomerang(b.x,b.y,b.rot,size);
  },
  amb(f,e,m,dt){
    const b=f.s.b;
    if(!b||!p2on(m))return;
    const size=7+2*f.sig;
    for(let n=FX.due(f.i,'bm',16,dt);n>0;n--){const a=Math.random()*P2_TAU;FX.sparks(b.x+dcos(a)*size*1.4,b.y+dsin(a)*size*1.4,1,'#f0dca4',{dir:a+1.57,spread:.5,lo:20,hi:70,life:.22,size:1})}
    if(b.back)for(let n=FX.due(f.i,'bd',6,dt);n>0;n--)FX.dust(b.x,b.y,1,'#d8c8a8',{lo:4,hi:18,life:.3,size:2.6});
  }};

LOOKS.beacon={
  crest(fg,bg){                                           // a lighthouse, lamp lit
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;
    g.strokeStyle=p2shade(bg,-.5);g.lineWidth=.07;        // a darker edge, so the tower holds on a pale enamel
    g.beginPath();g.moveTo(-.24,.66);g.lineTo(-.14,-.12);g.lineTo(.14,-.12);g.lineTo(.24,.66);g.closePath();g.stroke();g.fill();
    g.beginPath();g.rect(-.22,-.2,.44,.08);g.stroke();g.beginPath();g.rect(-.15,-.44,.3,.24);g.stroke();
    g.beginPath();g.moveTo(-.22,-.44);g.lineTo(0,-.7);g.lineTo(.22,-.44);g.closePath();g.stroke();g.fill();
    g.fillRect(-.22,-.2,.44,.08);g.fillRect(-.15,-.44,.3,.24);
    g.fillStyle='#ffd27a';g.fillRect(-.08,-.39,.16,.15);
    g.fillStyle=bg;g.fillRect(-.17,.14,.34,.1);g.fillRect(-.2,.42,.4,.1);
    g.strokeStyle='#ffd27a';g.lineWidth=.05;g.beginPath();
    for(const s of [-1,1])for(const d of [-1,0,1]){g.moveTo(s*.3,-.32+d*.08);g.lineTo(s*.66,-.32+d*.26)}
    g.stroke();
  },
  under(f){                                               // the beams: warm lantern light, brightest at the lamp
    const B=f.s.beams;
    for(let k=0;k<B.length;k+=2){
      const x2=B[k],y2=B[k+1],dx=x2-f.x,dy=y2-f.y,L=dhyp(dx,dy)||1,px=-dy/L*9,py=dx/L*9;
      const q=g.createLinearGradient(f.x,f.y,x2,y2);q.addColorStop(0,'rgba('+P2.LAMP+',.5)');q.addColorStop(1,'rgba('+P2.LAMP+',.13)');
      g.fillStyle=q;g.beginPath();g.moveTo(f.x,f.y);g.lineTo(x2+px,y2+py);g.lineTo(x2-px,y2-py);g.closePath();g.fill();
      g.strokeStyle='rgba(255,246,222,.5)';g.lineWidth=1.1;g.beginPath();g.moveTo(f.x,f.y);g.lineTo(x2,y2);g.stroke();
      p2glow(x2,y2,13,P2.LAMP,.4);                         // where it falls on the wall
      p2lite(x2,y2,17,'#ffe08a',.5);
    }
  },
  back(f){p2glow(f.x,f.y,f.r+15,P2.LAMP,.38);p2lite(f.x,f.y,f.r*2,'#ffe08a',.3)},           // the lamp's halo
  amb(f,e,m,dt){
    const B=f.s.beams;
    if(!p2on(m))return;
    for(let k=0;k<B.length;k+=2){
      for(let n=FX.due(f.i,'bm',3.5,dt);n>0;n--){const t=.2+Math.random()*.75;FX.stars(f.x+(B[k]-f.x)*t+(Math.random()-.5)*8,f.y+(B[k+1]-f.y)*t+(Math.random()-.5)*8,1,'#fff1c9',{lo:2,hi:12,size:2.3,life:.5})}
      for(let n=FX.due(f.i,'bw',3,dt);n>0;n--)FX.embers(p2clamp(B[k],2),p2clamp(B[k+1],2),1,'#ffe08a',{life:.5,jit:8});
    }
  }};

LOOKS.jugger={
  crest(fg,bg){                                           // a bull's head, ring through its nose
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    for(const s of [-1,1]){
      g.beginPath();g.moveTo(s*.24,-.22);g.quadraticCurveTo(s*.78,-.2,s*.68,-.68);g.quadraticCurveTo(s*.56,-.36,s*.26,-.04);g.closePath();g.fill();
      g.beginPath();g.moveTo(s*.3,-.02);g.lineTo(s*.6,.03);g.lineTo(s*.33,.17);g.closePath();g.fill();
    }
    g.beginPath();g.moveTo(-.34,-.26);g.lineTo(.34,-.26);g.quadraticCurveTo(.36,.2,.2,.58);g.quadraticCurveTo(0,.7,-.2,.58);g.quadraticCurveTo(-.36,.2,-.34,-.26);g.fill();
    g.fillStyle=bg;
    g.beginPath();g.ellipse(-.17,0,.09,.05,.5,0,P2_TAU);g.fill();g.beginPath();g.ellipse(.17,0,.09,.05,-.5,0,P2_TAU);g.fill();
    g.beginPath();g.ellipse(-.08,.44,.035,.05,0,0,P2_TAU);g.fill();g.beginPath();g.ellipse(.08,.44,.035,.05,0,0,P2_TAU);g.fill();
    g.strokeStyle='#e7c46a';g.lineWidth=.05;g.beginPath();g.arc(0,.55,.11,.3,Math.PI-.3);g.stroke();
  },
  back(f){
    if(f.s.mode===2){                                     // charging: a streak of dust behind it
      const sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp,r=f.r,L=r+48;
      const q=g.createLinearGradient(f.x,f.y,f.x-ux*L,f.y-uy*L);q.addColorStop(0,'rgba(222,206,172,.42)');q.addColorStop(1,'rgba(222,206,172,0)');
      g.fillStyle=q;g.beginPath();g.moveTo(f.x-uy*r*.85,f.y+ux*r*.85);g.lineTo(f.x-ux*L,f.y-uy*L);g.lineTo(f.x+uy*r*.85,f.y-ux*r*.85);g.closePath();g.fill();
      g.strokeStyle='rgba(243,234,214,.45)';g.lineWidth=1;g.lineCap='round';g.beginPath();
      for(let k=-1;k<=1;k++){const ox=-uy*k*r*.55,oy=ux*k*r*.55;g.moveTo(f.x+ox-ux*(r+5),f.y+oy-uy*(r+5));g.lineTo(f.x+ox-ux*(r+24-Math.abs(k)*6),f.y+oy-uy*(r+24-Math.abs(k)*6))}
      g.stroke();
    }else if(f.s.mode===1){                               // planting its feet: dust kicked up behind
      const p=Math.max(0,Math.min(1,1-f.s.t/.55)),a=f.aim+Math.PI;
      for(let k=-1;k<=1;k++)p2glow(f.x+dcos(a+k*.5)*(f.r+4+8*p),f.y+dsin(a+k*.5)*(f.r+4+8*p),5+6*p,'222,206,172',.4*(1-p*.5));
    }
  },
  over(f){
    if(f.s.mode===3){                                     // dazed: stars circling its head
      for(let k=0;k<3;k++){const a=f.s.t*9+k*2.094;p2star(f.x+dcos(a)*f.r*.75,f.y-f.r-7+dsin(a)*3.5,3.6,P2.GOLD_HI)}
    }else if(f.s.mode===1){                               // winding up: it trembles
      const w=dsin(f.s.t*40)*1.6;
      g.strokeStyle='rgba(240,220,164,.75)';g.lineWidth=1.2;g.lineCap='round';
      g.beginPath();g.arc(f.x+w,f.y,f.r+6,.5,2.6);g.stroke();g.beginPath();g.arc(f.x-w,f.y,f.r+6,3.64,5.74);g.stroke();
      p2lite(f.x,f.y,f.r*2.1,'#ff5a3a',.25+.3*Math.max(0,Math.min(1,1-f.s.t/.55)));
    }else if(f.s.mode===2)p2lite(f.x,f.y,f.r*2,'#ffb36b',.35);
  },
  amb(f,e,m,dt){
    if(!p2on(m))return;
    const S=f.s,r=f.r;
    if(S.mode===2){
      const sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp;
      for(let n=FX.due(f.i,'jd',14,dt);n>0;n--)FX.dust(f.x-ux*r+(Math.random()-.5)*r*1.4,f.y-uy*r+(Math.random()-.5)*r*1.4,1,null,{lo:6,hi:30});
      for(let n=FX.due(f.i,'js',12,dt);n>0;n--)FX.sparks(f.x-ux*r*.8+(Math.random()-.5)*r*1.6,f.y-uy*r*.8+(Math.random()-.5)*r*1.6,1,Math.random()<.5?'#ffe2a0':f.col,{dir:datan2(-uy,-ux),spread:.8,lo:40,hi:140,life:.26});
    }else if(S.mode===1){
      for(let n=FX.due(f.i,'jw',12,dt);n>0;n--){const a=Math.random()*P2_TAU;FX.embers(f.x+dcos(a)*r,f.y+dsin(a)*r,1,'#ff6a4a',{life:.5})}
      for(let n=FX.due(f.i,'jf',6,dt);n>0;n--)FX.dust(f.x+(Math.random()-.5)*r*2,f.y+r*.7,1,null,{lo:6,hi:24});
    }else if(S.mode===3){
      for(let n=FX.due(f.i,'jz',5,dt);n>0;n--)FX.stars(f.x+(Math.random()-.5)*r*1.5,f.y-r-6+(Math.random()-.5)*6,1,'#f0dca4',{lo:2,hi:14,size:2.8,life:.4});
    }
  }};

LOOKS.drum={
  crest(fg,bg){                                           // a war drum under crossed sticks
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.lineWidth=.07;g.beginPath();g.moveTo(-.54,-.62);g.lineTo(.2,-.04);g.moveTo(.54,-.62);g.lineTo(-.2,-.04);g.stroke();
    for(const s of [-1,1]){g.beginPath();g.arc(s*.54,-.62,.075,0,P2_TAU);g.fill()}
    g.beginPath();g.moveTo(-.46,0);g.lineTo(-.46,.42);g.quadraticCurveTo(0,.68,.46,.42);g.lineTo(.46,0);g.closePath();g.fill();
    g.beginPath();g.ellipse(0,0,.46,.17,0,0,P2_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.045;
    g.beginPath();g.ellipse(0,0,.37,.105,0,0,P2_TAU);g.stroke();
    g.beginPath();g.moveTo(-.39,.2);g.lineTo(-.2,.5);g.lineTo(0,.25);g.lineTo(.2,.5);g.lineTo(.39,.2);g.stroke();
  },
  under(f){                                               // the shockwaves: fine gold rings
    for(const q of f.s.rings){
      g.globalAlpha=.25+.75*Math.max(0,1-q.r/q.max);
      p2disc(q.x,q.y,q.r);g.strokeStyle=P2.EDGE;g.lineWidth=3.4;g.stroke();g.strokeStyle=P2.GOLD_HI;g.lineWidth=1.6;g.stroke();
      if(q.r>8){p2disc(q.x,q.y,q.r-4.5);g.strokeStyle=P2.GOLD;g.lineWidth=.7;g.stroke()}
    }
    g.globalAlpha=1;
  },
  over(f){                                                // drumsticks that come down on the beat
    const beat=Math.max(0,1-Math.max(0,f.s.t)*3);
    for(let k=-1;k<=1;k+=2){
      const tx=f.x+k*f.r*(1.36-.25*beat),ty=f.y-f.r*(.55-.6*beat);
      p2seg(f.x+k*f.r*1.02,f.y+f.r*.2,tx,ty,P2.ASH,1.5);
      p2disc(tx,ty,2.3);p2solid(P2.IVORY);
    }
    if(beat>0)p2lite(f.x,f.y,f.r*(1.6+.5*beat),'#f0dca4',.4*beat);     // the skin flashes on the beat
  },
  amb(f,e,m,dt){
    if(!p2on(m))return;
    for(const q of f.s.rings){
      const live=Math.max(0,1-q.r/q.max);
      for(let n=FX.due(f.i,'dr',3+9*live,dt);n>0;n--){const a=Math.random()*P2_TAU;FX.sparks(p2clamp(q.x+dcos(a)*q.r,1),p2clamp(q.y+dsin(a)*q.r,1),1,'#f0dca4',{dir:a,spread:.7,lo:15,hi:60,life:.24,size:1})}
    }
  }};

LOOKS.volcano={
  crest(fg){                                              // a mountain with fire in its mouth
    g.lineJoin='round';g.fillStyle=fg;
    for(const p of [[0,-.46,.13],[.17,-.62,.1],[-.12,-.68,.08]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P2_TAU);g.fill()}
    g.beginPath();g.moveTo(-.68,.58);g.lineTo(-.22,-.22);g.lineTo(-.1,-.12);g.lineTo(0,-.2);g.lineTo(.1,-.12);g.lineTo(.22,-.22);g.lineTo(.68,.58);g.closePath();g.fill();
    g.fillStyle='#f08a3c';
    g.beginPath();g.moveTo(-.1,-.12);g.lineTo(0,-.2);g.lineTo(.1,-.12);g.quadraticCurveTo(.12,.1,.2,.28);g.quadraticCurveTo(.08,.2,.04,.42);g.quadraticCurveTo(-.04,.14,-.14,.22);g.quadraticCurveTo(-.06,0,-.1,-.12);g.fill();
  },
  under(f){
    for(const q of f.s.vents){
      if(!q.hot){                                         // the warning: stone cracking, heat showing through
        const p=Math.min(1,q.t/.6),h=q.x*.37+q.y*.21;
        p2glow(q.x,q.y,q.r,'255,128,48',.12+.4*p);
        g.lineCap='round';g.lineJoin='round';g.beginPath();
        for(let k=0;k<7;k++){
          const a=k/7*P2_TAU+h,b=a+dsin(h*3+k*2.4)*.35,l1=q.r*.5*(.4+.6*p),l2=q.r*.92*(.4+.6*p);
          g.moveTo(q.x+dcos(a)*3,q.y+dsin(a)*3);g.lineTo(q.x+dcos(a)*l1,q.y+dsin(a)*l1);g.lineTo(q.x+dcos(b)*l2,q.y+dsin(b)*l2);
        }
        g.strokeStyle='rgba(9,11,13,.7)';g.lineWidth=2.8;g.stroke();
        g.strokeStyle='rgba(255,176,84,'+(.4+.6*p)+')';g.lineWidth=1.2;g.stroke();
        g.setLineDash([4,4]);p2disc(q.x,q.y,q.r);g.strokeStyle='rgba(255,200,130,.7)';g.lineWidth=1;g.stroke();g.setLineDash([]);
      }else{                                              // lava, cooling to dark crust
        const p=Math.max(.2,1-q.t/1.3),R=q.r*(.6+.4*p);
        const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,R);
        gr.addColorStop(0,'#ffe09a');gr.addColorStop(.4*p+.05,'#f47a2c');gr.addColorStop(.85,'#8f2a14');gr.addColorStop(1,'#2a100a');
        g.globalAlpha=.6+.4*p;p2disc(q.x,q.y,R);g.fillStyle=gr;g.fill();g.globalAlpha=1;
        g.strokeStyle='rgba(9,11,13,.8)';g.lineWidth=1.6;g.stroke();
        p2glow(q.x,q.y,R+8,'255,128,48',.3*p);
        p2lite(q.x,q.y,R*1.5,'#ff8a3a',.5*p);
      }
    }
  },
  amb(f,e,m,dt){
    if(!p2on(m))return;
    for(const q of f.s.vents){
      const a=Math.random()*P2_TAU,d=Math.random()*q.r*.8,x=q.x+dcos(a)*d,y=q.y+dsin(a)*d;
      if(!q.hot){
        for(let n=FX.due(f.i,'vw',7,dt);n>0;n--)FX.embers(x,y,1,'#ff9a4a',{life:.45});
        for(let n=FX.due(f.i,'vd',3,dt);n>0;n--)FX.dust(x,y,1,null,{lo:4,hi:16,life:.35,size:3});
      }else{
        const p=Math.max(.2,1-q.t/1.3);
        for(let n=FX.due(f.i,'vl',9*p,dt);n>0;n--)FX.embers(x,y,1,Math.random()<.4?'#ffd27a':'#ff7a2a',{life:.7});
        for(let n=FX.due(f.i,'vb',3*p,dt);n>0;n--)FX.bubbles(x,y,1,'#ffb04a');
        for(let n=FX.due(f.i,'vs',1.5,dt);n>0;n--)FX.smoke(x,y,1,null,{lo:4,hi:14});
      }
    }
  }};

LOOKS.jester={
  crest(fg,bg){                                           // a fool's cap with bells
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    for(const s of [-1,1]){                               // two horns that arch out and droop
      g.beginPath();g.moveTo(s*.16,-.32);g.quadraticCurveTo(s*.66,-.78,s*.7,-.04);g.quadraticCurveTo(s*.54,-.42,s*.36,-.08);g.closePath();g.fill();
    }
    g.beginPath();g.moveTo(-.38,.32);g.quadraticCurveTo(-.44,-.32,0,-.36);g.quadraticCurveTo(.44,-.32,.38,.32);g.quadraticCurveTo(0,.46,-.38,.32);g.fill();
    g.fillStyle=bg;                                       // the band, and the seam of the motley
    g.beginPath();g.moveTo(-.36,.13);g.quadraticCurveTo(0,.25,.36,.13);g.lineTo(.37,.22);g.quadraticCurveTo(0,.34,-.37,.22);g.closePath();g.fill();
    g.fillRect(-.02,-.34,.04,.5);
    g.fillStyle='#e7c46a';                                // bells
    for(const p of [[-.7,.05,.09],[.7,.05,.09],[0,-.42,.075]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P2_TAU);g.fill()}
  },
  under(f){                                               // the casket it left behind, and how long until it pops
    for(const q of f.s.boxes){
      g.setLineDash([3,4]);p2disc(q.x,q.y,Math.max(4,42*(1-q.t/.35)));g.strokeStyle='rgba(240,220,164,.8)';g.lineWidth=1;g.stroke();g.setLineDash([]);
      g.beginPath();g.rect(q.x-8,q.y-6,16,13);p2solid(P2.CRIMSON);
      g.beginPath();g.rect(q.x-9,q.y-8,18,4.5);p2solid(P2.CRIMSON_LO);
      g.fillStyle=P2.GOLD;g.fillRect(q.x-1.5,q.y-8,3,15);g.fillRect(q.x-8,q.y-.5,16,1.6);
      p2star(q.x,q.y-11,3+dsin(q.t*60)*1.2,P2.GOLD_HI);
      p2lite(q.x,q.y-11,9+q.t*30,'#ffd76a',.6);
    }
  },
  amb(f,e,m,dt){
    if(!p2on(m))return;
    for(const q of f.s.boxes)for(let n=FX.due(f.i,'jb',22,dt);n>0;n--)FX.sparks(q.x,q.y-11,1,'#ffd76a',{dir:-1.57,spread:2.2,lo:40,hi:130,life:.22,grav:200,size:1});
    if(f.s.poof>0)for(let n=FX.due(f.i,'jp',9,dt);n>0;n--){const a=Math.random()*P2_TAU;FX.wisps(f.x+dcos(a)*f.r,f.y+dsin(a)*f.r,1,f.col,{life:.5})}
  },
  arm(f,A,x1,y1,x2,y2){p2gem(x2,y2,5.2,A.a?'#2f6fb5':'#b5303f')}};   // the balls it juggles: no handle

LOOKS.turtle={
  crest(fg,bg){                                           // a shell
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    g.beginPath();g.ellipse(0,.02,.56,.62,0,0,P2_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.05;
    const H=[[0,-.26],[.24,-.12],[.24,.16],[0,.3],[-.24,.16],[-.24,-.12]];
    g.beginPath();g.moveTo(H[0][0],H[0][1]);for(let k=1;k<6;k++)g.lineTo(H[k][0],H[k][1]);g.closePath();g.stroke();
    g.beginPath();
    for(const p of H){const dx=p[0],dy=p[1]-.02,t=.9/Math.sqrt(dx*dx/.3136+dy*dy/.3844);g.moveTo(p[0],p[1]);g.lineTo(dx*t,.02+dy*t)}
    g.stroke();
  },
  back(f){                                                // a guard of steel plates on the side it is heading towards
    const a=f.s.head,arc=f.s.arc||1.35,x=f.x,y=f.y,R=f.r+4.5,n=5,hot=f.s.clang>0;
    if(hot){p2glow(x+dcos(a)*R,y+dsin(a)*R,f.r*.9,'255,255,255',.5);p2lite(x+dcos(a)*R,y+dsin(a)*R,f.r*1.5,'#eaf2ff',.6)}
    g.lineCap='butt';
    for(let k=0;k<n;k++){
      const a0=a-arc+k*2*arc/n+.035,a1=a-arc+(k+1)*2*arc/n-.035;
      g.beginPath();g.arc(x,y,R,a0,a1);g.strokeStyle=P2.EDGE;g.lineWidth=8.4;g.stroke();
      g.strokeStyle=hot?'#ffffff':k%2?P2.STEEL_LO:P2.STEEL;g.lineWidth=6.2;g.stroke();
    }
    g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.8;g.beginPath();g.arc(x,y,R+2.3,a-arc+.05,a+arc-.05);g.stroke();
    g.fillStyle=P2.GOLD;
    for(let k=0;k<n;k++){const t=a-arc+(k+.5)*2*arc/n;p2disc(x+dcos(t)*R,y+dsin(t)*R,1.05);g.fill()}
  },
  amb(f,e,m,dt){
    if(!p2on(m)||f.gone)return;
    const arc=f.s.arc||1.35;
    for(let n=FX.due(f.i,'tg',2.5,dt);n>0;n--){const t=f.s.head+(Math.random()*2-1)*arc;FX.stars(f.x+dcos(t)*(f.r+4.5),f.y+dsin(t)*(f.r+4.5),1,'#eaf2ff',{lo:0,hi:5,size:2.8,life:.3})}
  }};

LOOKS.pirate={
  crest(fg,bg){                                           // skull and crossed bones, one eye patched
    g.lineCap='round';g.lineJoin='round';g.strokeStyle=fg;g.fillStyle=fg;
    g.lineWidth=.12;g.beginPath();g.moveTo(-.52,.6);g.lineTo(.52,-.34);g.moveTo(.52,.6);g.lineTo(-.52,-.34);g.stroke();
    for(const p of [[-.52,.6],[.52,-.34],[.52,.6],[-.52,-.34]]){g.beginPath();g.arc(p[0],p[1],.09,0,P2_TAU);g.fill()}
    g.strokeStyle=bg;g.lineWidth=.07;
    g.beginPath();g.arc(0,-.12,.4,0,P2_TAU);g.stroke();g.beginPath();g.rect(-.22,.12,.44,.32);g.stroke();
    g.beginPath();g.arc(0,-.12,.4,0,P2_TAU);g.fill();g.beginPath();g.rect(-.22,.12,.44,.32);g.fill();
    g.fillStyle=bg;
    g.beginPath();g.arc(-.16,-.12,.11,0,P2_TAU);g.fill();
    g.beginPath();g.moveTo(0,.04);g.lineTo(-.055,.14);g.lineTo(.055,.14);g.closePath();g.fill();
    g.lineWidth=.035;g.beginPath();for(const x of [-.11,0,.11]){g.moveTo(x,.3);g.lineTo(x,.44)}g.stroke();
    g.fillStyle='#0b0d10';g.strokeStyle='#0b0d10';
    g.beginPath();g.arc(.16,-.12,.13,0,P2_TAU);g.fill();
    g.lineWidth=.05;g.beginPath();g.moveTo(-.33,-.36);g.lineTo(.38,-.02);g.stroke();
  },
  arm(f,A,x1,y1,x2,y2,an){                                // cutlass: a curved blade with a brass guard
    const L=dhyp(x2-x1,y2-y1);
    g.save();g.translate(x1,y1);g.rotate(an);
    const q=g.createLinearGradient(0,-7,0,3);q.addColorStop(0,'#f2f5f7');q.addColorStop(.55,P2.STEEL);q.addColorStop(1,P2.STEEL_LO);
    g.beginPath();g.moveTo(5,-2.8);g.quadraticCurveTo(L*.6,-7.5,L+1,-5);g.quadraticCurveTo(L*.72,-.4,5,2.8);g.closePath();p2solid(q);
    g.beginPath();g.rect(-2,-2.4,6,4.8);p2solid(P2.LEATHER);
    g.beginPath();g.moveTo(3.4,-5.2);g.lineTo(6,-5.2);g.lineTo(6,5.2);g.lineTo(3.4,5.2);g.closePath();p2solid(P2.GOLD);
    g.restore();
  },
  top(f){                                                 // chain and hook, over both fighters: the hook bites into the rival
    const h=f.s.hook;
    if(!h)return;
    if(f.s.reel>0)p2lite(h.x,h.y,12,'#ffffff',.5);
    const dx=h.x-f.x,dy=h.y-f.y,d=dhyp(dx,dy)||1;
    if(d>f.r+2){
      g.lineCap='butt';g.setLineDash([3.2,2.2]);g.beginPath();g.moveTo(f.x+dx/d*f.r,f.y+dy/d*f.r);g.lineTo(h.x,h.y);
      g.strokeStyle=P2.EDGE;g.lineWidth=3.4;g.stroke();g.strokeStyle=P2.STEEL_LO;g.lineWidth=1.8;g.stroke();g.setLineDash([]);
    }
    g.save();g.translate(h.x,h.y);g.rotate(datan2(dy,dx));
    g.beginPath();g.moveTo(-7,0);g.lineTo(1,0);g.arc(1,4.2,4.2,-1.5708,2.5);p2rod(P2.STEEL,2);
    p2disc(-8.5,0,1.9);g.strokeStyle=P2.EDGE;g.lineWidth=2.4;g.stroke();g.strokeStyle=P2.STEEL;g.lineWidth=1;g.stroke();
    g.restore();
  },
  amb(f,e,m,dt){
    const h=f.s.hook;
    if(!h||!p2on(m))return;
    if(f.s.reel>0){
      const sp=dhyp(f.vx,f.vy)||1;
      for(let n=FX.due(f.i,'pr',14,dt);n>0;n--){const t=Math.random();FX.sparks(f.x+(h.x-f.x)*t,f.y+(h.y-f.y)*t,1,'#d7dde2',{lo:20,hi:80,life:.2,size:1})}
      for(let n=FX.due(f.i,'pd',10,dt);n>0;n--)FX.dust(f.x-f.vx/sp*f.r+(Math.random()-.5)*f.r,f.y-f.vy/sp*f.r+(Math.random()-.5)*f.r,1,null,{lo:6,hi:26});
    }else for(let n=FX.due(f.i,'ph',12,dt);n>0;n--)FX.sparks(h.x,h.y,1,'#d7dde2',{lo:6,hi:30,life:.2,size:.9});
  }};

LOOKS.wizard={
  crest(fg,bg){                                           // the hat
    g.lineJoin='round';g.fillStyle=fg;
    g.beginPath();g.ellipse(0,.38,.64,.15,0,0,P2_TAU);g.fill();
    g.beginPath();g.moveTo(-.37,.34);g.quadraticCurveTo(-.18,-.26,.2,-.72);g.quadraticCurveTo(.16,-.2,.37,.34);g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.moveTo(-.34,.2);g.quadraticCurveTo(0,.31,.34,.2);g.lineTo(.36,.3);g.quadraticCurveTo(0,.41,-.36,.3);g.closePath();g.fill();
    g.beginPath();for(let k=0;k<8;k++){const a=k/8*P2_TAU-1.5708,q=k%2?.045:.13;g.lineTo(.02+dcos(a)*q,-.1+dsin(a)*q)}g.closePath();g.fill();
  },
  over(f){
    const a=f.aim+.9,c=dcos(a),s=dsin(a),r=f.r;   // staff, crystal at the tip
    p2seg(f.x+c*(r-2),f.y+s*(r-2),f.x+c*(r+13),f.y+s*(r+13),P2.WOOD,2);
    p2disc(f.x+c*(r+11.5),f.y+s*(r+11.5),1.9);p2solid(P2.GOLD);
    p2glow(f.x+c*(r+16),f.y+s*(r+16),8,'120,220,240',.5);
    p2lite(f.x+c*(r+16),f.y+s*(r+16),9,'#7fe7ff',.5);
    p2gem(f.x+c*(r+16),f.y+s*(r+16),3.4,'#3bb4cc');
  },
  top(f){                                                 // spells in flight, over both fighters
    for(const q of f.s.spells){
      const sp=dhyp(q.vx,q.vy)||1,ux=q.vx/sp,uy=q.vy/sp;
      if(q.fire){                                         // fireball, trailing embers
        p2lite(q.x,q.y,q.r*2.4,'#ff8a3a',.7);
        for(let k=3;k>=1;k--)p2glow(q.x-ux*k*6,q.y-uy*k*6,q.r+3-k*1.5,'255,140,50',.5-k*.12);
        p2glow(q.x,q.y,q.r+8,'255,140,50',.6);
        const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r*.8);gr.addColorStop(0,'#fff3c4');gr.addColorStop(1,'#ff8a2c');
        p2disc(q.x,q.y,q.r*.8);g.fillStyle=gr;g.fill();
      }else{                                              // frost shard
        p2glow(q.x,q.y,12,'150,220,255',.5);p2lite(q.x,q.y,14,'#9fe0ff',.6);
        g.beginPath();g.moveTo(q.x+ux*9,q.y+uy*9);g.lineTo(q.x-uy*4,q.y+ux*4);g.lineTo(q.x-ux*9,q.y-uy*9);g.lineTo(q.x+uy*4,q.y-ux*4);g.closePath();
        g.fillStyle='#d9f3ff';g.fill();g.strokeStyle='rgba(20,44,66,.85)';g.lineWidth=1;g.lineJoin='round';g.stroke();
        g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=.8;g.beginPath();g.moveTo(q.x+ux*7,q.y+uy*7);g.lineTo(q.x-ux*7,q.y-uy*7);g.stroke();
      }
    }
  },
  amb(f,e,m,dt){
    if(!p2on(m))return;
    const a=f.aim+.9;
    for(let n=FX.due(f.i,'wc',2,dt);n>0;n--)FX.stars(f.x+dcos(a)*(f.r+16),f.y+dsin(a)*(f.r+16),1,'#7fe7ff',{lo:0,hi:8,size:3,life:.35});
    for(const q of f.s.spells){
      if(q.fire){
        for(let n=FX.due(f.i,'wf',16,dt);n>0;n--)FX.embers(q.x+(Math.random()-.5)*q.r,q.y+(Math.random()-.5)*q.r,1,Math.random()<.4?'#ffd27a':'#ff8a3a',{life:.4,lo:2,hi:16});
        for(let n=FX.due(f.i,'ws',2,dt);n>0;n--)FX.smoke(q.x,q.y,1,null,{lo:2,hi:10,life:.5,size:3});
      }else for(let n=FX.due(f.i,'wi',12,dt);n>0;n--)FX.flakes(q.x+(Math.random()-.5)*8,q.y+(Math.random()-.5)*8,1,'#dff6ff',{life:.4,lo:2,hi:14});
    }
  }};
