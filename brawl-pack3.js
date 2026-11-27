// Third pack of fighter classes for Duel King: creatures. Each class adds a row to FIGHTERS, a block to BEHAVE and its art to LOOKS.
// The first half is pure simulation (it loads in Node with only brawl-sim.js before it); the second half is drawing and
// only runs when the page asks for it. Every top-level name here starts with p3/P3 so it cannot clash with the other files.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.duck    ={name:'Duck',    color:'#e3b23c',hp:100,speed:165,spin:0,dmg:11.8,   cd:.8, arms:[],desc:'Leads a line of ducklings that peck. Its quack shoves rivals away.',sig:['Bigger brood','One more duckling in the line'],sfx:{hit:'tick'}};
FIGHTERS.cat     ={name:'Cat',     color:'#f0895a',hp:100,speed:175,spin:0,dmg:18.2,  cd:.5, arms:[],desc:'Crouches, then pounces. A blow that would finish it costs a spare life instead.',sig:['Nine lives','One more spare life, and it pounces sooner'],sfx:{hit:'slash'}};
FIGHTERS.frog    ={name:'Frog',    color:'#6cc24a',hp:100,speed:170,spin:0,dmg:15.3,  cd:1.6,arms:[],desc:'Hops about, then snaps out its tongue and yanks the rival in for a bite.',sig:['Longer tongue','The tongue reaches further and is ready sooner'],sfx:{hit:'thump',shot:'loose'}};
FIGHTERS.crab    ={name:'Crab',    color:'#e0563f',hp:100,speed:175,spin:0,dmg:9.02,  cd:.55,arms:[{a:-.5,l:15,head:7},{a:.5,l:15,head:7}],desc:'Scuttles in straight lines. Heavy pincers in front, a hard shell behind.',sig:['Bigger claws','Larger pincers that pinch harder'],sfx:{hit:'chop'}};
FIGHTERS.bull    ={name:'Bull',    color:'#a5482f',hp:100,speed:160,spin:0,dmg:20.2,  cd:.5, arms:[],desc:'Charges whenever the rival is dead ahead. Hitting it only makes it angrier.',sig:['Sharper horns','Gores harder and shakes off a crash sooner'],sfx:{hit:'heavy'}};
FIGHTERS.snail   ={name:'Snail',   color:'#b08a5a',hp:100,speed:115,spin:0,dmg:19.81,  cd:.45,arms:[],desc:'Slow, on a trail of slowing slime. Hit it and it becomes a spinning shell.',sig:['Harder shell','Spins for longer and hits harder'],sfx:{hit:'thump'}};
FIGHTERS.moth    ={name:'Moth',    color:'#b9a6d9',hp:100,speed:185,spin:0,dmg:8.7,  cd:.6, arms:[],desc:'Flutters after its rival and sheds dust that makes their hits miss.',sig:['Thicker dust','The dust blinds for longer'],sfx:{hit:'soft'}};
FIGHTERS.octopus ={name:'Octopus', color:'#d0679d',hp:100,speed:165,spin:3.4,dmg:11.65,cd:.3, arms:[{a:.7854,l:15},{a:2.3562,l:15},{a:3.927,l:15},{a:5.4978,l:15}],desc:'A whirl of short arms. Hit it and it hides in a cloud of ink.',sig:['More ink','A bigger cloud, more often, that hides it for longer'],sfx:{hit:'punch'}};
FIGHTERS.penguin ={name:'Penguin', color:'#3b4a6b',hp:100,speed:150,spin:0,dmg:7.72,  cd:.5, arms:[],desc:'Slides faster with every wall it bounces off, and slams harder the faster it goes.',sig:['Waxed belly','Builds speed faster, to a higher top speed'],sfx:{hit:'thump'}};
ROSTER.push('duck','cat','frog','crab','bull','snail','moth','octopus','penguin');

const p3clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
// signed difference between two angles, in -PI..PI
function p3turn(a,b){let d=(a-b)%6.2832;if(d>Math.PI)d-=6.2832;else if(d<-Math.PI)d+=6.2832;return d}
function p3head(f,e,sp){const d=gap(e,f)||1;f.vx=(e.x-f.x)/d*sp;f.vy=(e.y-f.y)/d*sp}

// Duck: ducklings walk the path the duck walked, a few steps apart, and peck whatever they touch. The quack is a shove.
const P3_DUCK_GAP=7;       // simulation steps between one duckling and the next
BEHAVE.duck={
  init(f){f.s.path=[];f.s.kids=[];for(let k=0;k<3+f.sig;k++)f.s.kids.push({x:f.x,y:f.y,a:0,cd:0});f.s.q=2.2;f.s.quack=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.duck,S=f.s,P=S.path,K=S.kids;
    P.push(f.x,f.y);
    if(P.length>2*P3_DUCK_GAP*(K.length+1))P.splice(0,2);
    for(let k=0;k<K.length;k++){
      const q=K[k],i=Math.max(0,P.length-2-2*P3_DUCK_GAP*(k+1)),dx=P[i]-q.x,dy=P[i+1]-q.y;
      if(dx*dx+dy*dy>.05)q.a=datan2(dy,dx);
      q.x+=dx*.4;q.y+=dy*.4;
      if(q.cd>0)q.cd-=DT;
      else if(!e.gone&&dhyp(q.x-e.x,q.y-e.y)<e.r+5){
        q.cd=D.cd/f.spdMul;
        m.events.push({k:'fx',n:'leaves',x:q.x,y:q.y,num:2,col:'#f4d35e',lo:20,hi:70,i:f.i});m.events.push({k:'fx',n:'sparks',x:q.x,y:q.y,num:3,col:'#fff1c9',lo:40,hi:110,life:.2,i:f.i});   // a peck: down and a glint
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
      }
    }
    if(S.quack>0)S.quack-=DT;
    S.q-=DT;
    if(S.q<=0&&!e.gone&&gap(e,f)<62+e.r){
      S.q=3/f.spdMul;S.quack=.45;
      m.events.push({k:'blast',x:f.x,y:f.y,r:62,i:f.i});m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Quack!',i:f.i});
      m.events.push({k:'fx',n:'leaves',x:f.x,y:f.y,num:8,col:'#f3ead6',lo:60,hi:170,jit:f.r,i:f.i});m.events.push({k:'fx',n:'squash',dir:f.aim,r:.13,i:f.i});      // feathers fly
      m.hurt(e,D.dmg*1.5*f.dmgMul*rage,f);m.knock(e,f);
    }
  }};

// Cat: roam, crouch, pounce. Spare lives: a direct hit that would finish it is dodged instead, and it is out of reach for a moment.
// (Poison and other damage that is not a hit can still finish it.)
function p3life(f,src,m){
  const S=f.s;
  S.lives--;S.safe=.9;S.leap=0;S.crouch=0;f.gone=true;
  if(f.hp<1)f.hp=1;
  const d=gap(src,f)||1;f.vx=(f.x-src.x)/d*f.speed;f.vy=(f.y-src.y)/d*f.speed;
  m.events.push({k:'burst',x:f.x,y:f.y,n:12,i:f.i});
  m.events.push({k:'fx',n:'holy',x:f.x,y:f.y,r:f.r*1.3,i:f.i});m.events.push({k:'fx',n:'poof',x:f.x,y:f.y,r:f.r,col:'#f3ead6',i:f.i});      // a life spent: a gold flash and it is gone in a puff
  m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:S.lives?S.lives+(S.lives>1?' lives left':' life left'):'Last life',big:true,i:f.i});
}
BEHAVE.cat={
  init(f){f.s.t=1.5;f.s.leap=0;f.s.crouch=0;f.s.lives=1+f.sig;f.s.safe=0},
  tick(f,e,m){
    const S=f.s;
    if(S.safe>0){S.safe-=DT;if(S.safe<=0)f.gone=false}
    if(S.leap>0){S.leap-=DT;return}
    if(S.crouch>0){
      S.crouch-=DT;
      if(S.crouch<=0&&!e.gone){
        S.leap=.42;f.cd=0;
        const d=gap(e,f)||1,lead=d/(f.speed*3.1)*.5,tx=e.x+e.vx*lead-f.x,ty=e.y+e.vy*lead-f.y,l=dhyp(tx,ty)||1;
        f.vx=tx/l*f.speed;f.vy=ty/l*f.speed;
        m.events.push({k:'fx',n:'poof',x:f.x,y:f.y,r:f.r*.8,i:f.i});m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r*.6,r:f.r+12,w:1.8,life:.24,i:f.i});      // it springs
      }
      return;
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone&&!f.gone){S.t=Math.max(1.1,2.3-.3*f.sig)/f.spdMul;S.crouch=.28;m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r+14,r:f.r+2,w:1.4,life:.26,col:'#f0dca4',i:f.i})}
  },
  fast:f=>f.s.crouch>0?.08:f.s.leap>0?3.1:1,
  touch:f=>f.s.leap>0?FIGHTERS.cat.dmg:FIGHTERS.cat.dmg*.2,
  dealt(f,v,dmg,m){
    if(f.s.leap>0){
      f.s.leap=0;m.knock(v,f);
      const a=datan2(v.y-f.y,v.x-f.x);                 // the pounce lands: three claw marks
      for(let k=-1;k<=1;k++)m.events.push({k:'fx',n:'slash',x:v.x+dcos(a)*k*7,y:v.y+dsin(a)*k*7,dir:a,r:v.r*.95,col:'#fff1e0',life:.22,i:f.i});
      m.events.push({k:'fx',n:'sparks',x:v.x,y:v.y,num:8,dir:a,spread:1.6,lo:90,hi:240,i:f.i});m.events.push({k:'fx',n:'shake',r:2.5,i:f.i});
    }
  },
  guard(f,src,dmg,m){
    if(f.s.lives>0&&dmg*f.armor>=f.hp){p3life(f,src,m);return 0}
    return 1;
  },
  hurt(f,src,dmg,m){if(f.hp<=0&&f.s.lives>0)p3life(f,src,m)}};

// Frog: sits, then leaps. While sitting it can shoot its tongue; a rival it touches is dragged in and bitten.
BEHAVE.frog={
  init(f){f.s.air=0;f.s.hop=.3;f.s.t=1.1;f.s.tongue=null;f.s.pull=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.frog,S=f.s,T=S.tongue;
    S.hop-=DT;
    if(S.hop<=0){
      if(S.air){S.air=0;S.hop=.42/f.spdMul;m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r*.7,r:f.r+9,w:1.4,life:.24,col:'#d9f2c4',i:f.i});m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:3,jit:f.r,i:f.i})}      // it lands
      else if(!T){S.air=1;S.hop=.3;m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:2,jit:f.r*.8,i:f.i})}
    }
    if(S.pull>0){
      S.pull-=DT;
      const d=gap(e,f)||1,reach=f.r+e.r+2;
      if(e.gone){S.pull=0;S.tongue=null;return}
      if(d>reach){const st=Math.min(d-reach,470*DT);e.x=p3clamp(e.x+(f.x-e.x)/d*st,e.r);e.y=p3clamp(e.y+(f.y-e.y)/d*st,e.r)}
      if(T){T.x=e.x;T.y=e.y}
      if(d<=reach+3||S.pull<=0){
        S.pull=0;S.tongue=null;
        if(d<=reach+12){
          m.events.push({k:'fx',n:'slash',x:e.x,y:e.y,dir:datan2(f.y-e.y,f.x-e.x),r:e.r*1.1,col:'#ffd0dc',i:f.i});m.events.push({k:'fx',n:'drops',x:e.x,y:e.y,num:6,col:'#e86a8a',i:f.i});m.events.push({k:'fx',n:'shake',r:2,i:f.i});      // the bite
          m.hurt(e,D.dmg*f.dmgMul*rage,f);e.slowT=Math.max(e.slowT,.7);
        }
      }
      return;
    }
    if(!T){
      S.t-=DT;
      const range=105+22*f.sig;
      if(S.t<=0&&!S.air&&!e.gone&&gap(e,f)<range+e.r){
        S.t=Math.max(.9,D.cd-.25*f.sig)/f.spdMul;
        const d=gap(e,f)||1,lead=d/620*.6;
        S.tongue={x:f.x,y:f.y,an:datan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x),out:1,range};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    if(T.out){
      T.x+=dcos(T.an)*620*DT;T.y+=dsin(T.an)*620*DT;
      if(!e.gone&&dhyp(T.x-e.x,T.y-e.y)<e.r+5){T.out=0;S.pull=.7;m.events.push({k:'fx',n:'splash',x:T.x,y:T.y,num:6,col:'#e86a8a',i:f.i});m.events.push({k:'fx',n:'flash',x:T.x,y:T.y,r:11,col:'#ffb0c4',i:f.i})}      // the tongue sticks
      else if(dhyp(T.x-f.x,T.y-f.y)>T.range||T.x<0||T.x>AW||T.y<0||T.y>AW)T.out=0;
    }else{
      const d=dhyp(f.x-T.x,f.y-T.y)||1;
      T.x+=(f.x-T.x)/d*Math.min(d,700*DT);T.y+=(f.y-T.y)/d*Math.min(d,700*DT);
      if(d<f.r+10)S.tongue=null;
    }
  },
  fast:f=>f.s.air?2.3:.12,
  touch:f=>f.s.air?FIGHTERS.frog.dmg*.35:0};

// Crab: it only ever travels along one axis at a time, switching every second or two. Its pincers turn (slowly) to face
// the rival; hits that do not come from the front land on the shell.
BEHAVE.crab={
  init(f){
    for(const o of f.arms)if(!o.extra){o.head+=1.6*f.sig;o.dmg*=1+.18*f.sig}
    f.s.face=datan2(AW/2-f.y,AW/2-f.x);f.s.ax=0;f.s.turn=.8;f.s.clang=0;f.ang=f.s.face;f.spin=0;      // the pincers face where it looks; they do not whirl
  },
  tick(f,e,m){
    const S=f.s,rate=3*DT*f.spdMul;
    S.face+=Math.max(-rate,Math.min(rate,p3turn(f.aim,S.face)));f.ang=S.face;
    if(S.clang>0)S.clang-=DT;
    S.turn-=DT;
    if(S.turn<=0){
      S.turn=(.8+m.rnd()*1.1)/f.spdMul;S.ax=1-S.ax;
      if(S.ax){f.vx=0;f.vy=(e.y>f.y?1:-1)*f.speed}else{f.vy=0;f.vx=(e.x>f.x?1:-1)*f.speed}
      m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:3,jit:f.r*1.2,i:f.i});      // it skids round the corner
    }else if(S.ax){f.vy=(f.vy>=0?1:-1)*f.speed;f.vx=0}
    else{f.vx=(f.vx>=0?1:-1)*f.speed;f.vy=0}
  },
  guard(f,src,dmg,m){
    if(Math.abs(p3turn(datan2(src.y-f.y,src.x-f.x),f.s.face))>1.1){
      f.s.clang=.18;
      const a=datan2(src.y-f.y,src.x-f.x),x=f.x+dcos(a)*f.r,y=f.y+dsin(a)*f.r;      // it rings off the shell
      m.events.push({k:'fx',n:'sparks',x,y,num:6,col:'#e8eef5',dir:a,spread:1.5,lo:90,hi:230,life:.22,size:1,i:f.i});m.events.push({k:'fx',n:'stars',x,y,num:1,col:'#ffffff',lo:0,hi:6,size:5,life:.2,i:f.i});
      return .55;
    }
    return 1;
  },
  dealt(f,v,dmg,m){
    v.slowT=Math.max(v.slowT,.5);
    const a=datan2(v.y-f.y,v.x-f.x),x=v.x-dcos(a)*v.r*.8,y=v.y-dsin(a)*v.r*.8;      // the pinch
    m.events.push({k:'fx',n:'sparks',x,y,num:3,dir:a+3.1416,spread:1.8,lo:50,hi:140,life:.2,i:f.i});m.events.push({k:'fx',n:'wave',x,y,r0:7,r:2,w:1.5,life:.18,i:f.i});
  }};          // a pinch holds on for a moment

// Bull: no wind-up. The moment the rival is in front of where it is already heading, it charges (mode 2) and keeps going
// until it gores or meets a wall (mode 3, dazed). Every hit it takes makes the next gore worse.
BEHAVE.bull={
  init(f){f.s.mode=0;f.s.t=.9;f.s.anger=0;f.s.gore=0},
  tick(f,e,m){
    const S=f.s;
    S.t-=DT;
    if(S.mode===0){
      if(S.t<=0&&!e.gone&&Math.abs(p3turn(datan2(f.vy,f.vx),f.aim))<.34){
        S.mode=2;S.t=1.5;f.cd=0;p3head(f,e,f.speed);
        m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:7,jit:f.r*1.4,lo:20,hi:80,i:f.i});m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r*.8,r:f.r+16,w:2.2,life:.28,col:'#e8493a',i:f.i});      // it charges
      }
    }else if(S.t<=0){S.t=(S.mode===2?.5:.6)/f.spdMul;S.mode=0}
  },
  fast:f=>f.s.mode===2?2.9:f.s.mode===3?.03:1,
  bounce(f,m,x,y){
    if(f.s.mode!==2)return;
    f.s.mode=3;f.s.t=Math.max(.35,.85-.15*f.sig);
    m.events.push({k:'burst',x,y,n:12,i:f.i});
    m.events.push({k:'fx',n:'shatter',x,y,num:10,col:'#cdbb96',r:20,i:f.i});m.events.push({k:'fx',n:'dust',x,y,num:8,jit:16,lo:20,hi:90,i:f.i});m.events.push({k:'fx',n:'shake',r:4.5,i:f.i});      // head first into the wall
    m.events.push({k:'fx',n:'stars',x:f.x,y:f.y-f.r,num:5,col:'#f0dca4',jit:f.r,i:f.i});
  },
  touch(f){
    const D=FIGHTERS.bull,S=f.s;
    if(S.mode===3)return 0;
    if(S.mode!==2)return D.dmg*.15;
    S.gore=1;return D.dmg*(1+.2*f.sig)*(1+.3*S.anger);
  },
  dealt(f,v,dmg,m){
    if(f.s.gore){
      const a=datan2(v.y-f.y,v.x-f.x),hot=f.s.anger;      // the gore: two horn cuts, redder the angrier it was
      for(const k of [-.45,.45])m.events.push({k:'fx',n:'slash',x:v.x-dcos(a)*v.r*.5,y:v.y-dsin(a)*v.r*.5,dir:a+k,r:v.r*(1.1+.15*hot),col:hot?'#ff8a6a':'#fff1e0',life:.24,i:f.i});
      m.events.push({k:'fx',n:'sparks',x:v.x,y:v.y,num:8+4*hot,col:'#ff6a4a',dir:a,spread:1.4,lo:110,hi:300,i:f.i});m.events.push({k:'fx',n:'dust',x:v.x,y:v.y,num:4,jit:v.r,i:f.i});m.events.push({k:'fx',n:'shake',r:3+hot,i:f.i});
      f.s.gore=0;f.s.mode=0;f.s.t=.9/f.spdMul;f.s.anger=0;m.knock(v,f);
    }
  },
  guard:f=>f.s.mode===3?1.3:1,                          // dazed against the wall, it is wide open
  hurt(f,src,dmg,m){
    if(f.s.anger<3){m.events.push({k:'fx',n:'embers',x:f.x,y:f.y-f.r*.6,num:5,col:'#ff5a3a',jit:f.r,i:f.i});m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y-f.r,num:2,col:'#d8d0c8',lo:8,hi:26,size:2.6,life:.45,i:f.i})}      // it fumes
    f.s.anger=Math.min(3,f.s.anger+1);
  }};

// Snail: the trail slows the rival. A hit (or simply enough time) sends it into its shell: a few moments as a fast,
// hard, ricocheting shell that is the only way it does real damage.
function p3shell(f,e,m){
  const S=f.s;
  S.shell=1.3+.25*f.sig;S.auto=4.2;f.cd=0;
  if(!e.gone)p3head(f,e,f.speed);
  m.events.push({k:'burst',x:f.x,y:f.y,n:8,i:f.i});
  m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r*1.7,r:f.r*.8,w:2.4,life:.26,col:'#e2c896',i:f.i});m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:5,jit:f.r,i:f.i});      // it snaps into its shell
}
BEHAVE.snail={
  init(f){f.s.trail=[];f.s.acc=0;f.s.shell=0;f.s.cd=0;f.s.auto=3},
  tick(f,e,m){
    const S=f.s,T=S.trail;
    S.acc+=DT;
    if(S.acc>=.08&&S.shell<=0){S.acc=0;T.push({x:f.x,y:f.y,t:m.t})}
    while(T.length&&m.t-T[0].t>4.5)T.shift();
    if(!e.gone)for(const p of T)if(m.t-p.t>.2&&dhyp(e.x-p.x,e.y-p.y)<e.r+4){e.slowT=Math.max(e.slowT,.35);break}
    if(S.cd>0)S.cd-=DT;
    if(S.shell>0){S.shell-=DT;if(S.shell<=0){S.cd=2.2/f.spdMul;m.events.push({k:'fx',n:'poof',x:f.x,y:f.y,r:f.r,col:'#d6eeb0',i:f.i});m.events.push({k:'fx',n:'bubbles',x:f.x,y:f.y,num:5,col:'#cfeea0',jit:f.r,i:f.i})}}      // and comes back out
    else{S.auto-=DT;if(S.auto<=0&&S.cd<=0)p3shell(f,e,m)}
  },
  fast:f=>f.s.shell>0?3.4:1,
  guard(f,src,dmg,m){
    if(!(f.s.shell>0))return 1;
    const a=datan2(src.y-f.y,src.x-f.x);            // hits skitter off the spinning shell
    m.events.push({k:'fx',n:'sparks',x:f.x+dcos(a)*f.r,y:f.y+dsin(a)*f.r,num:5,col:'#f3ead6',dir:a+1.2,spread:1,lo:100,hi:240,life:.2,size:1,i:f.i});
    return .3;
  },
  hurt(f,src,dmg,m){if(f.s.shell<=0&&f.s.cd<=0&&f.hp>0)p3shell(f,src,m)},
  touch:f=>f.s.shell>0?FIGHTERS.snail.dmg*(1+.15*f.sig):0,
  dealt(f,v,dmg,m){
    if(f.s.shell>0){
      m.knock(v,f);
      const a=datan2(v.y-f.y,v.x-f.x),x=(f.x+v.x)/2,y=(f.y+v.y)/2;      // the shell cracks into them
      m.events.push({k:'fx',n:'wave',x,y,r0:4,r:26,w:2.6,life:.26,col:'#e2c896',fill:.25,i:f.i});m.events.push({k:'fx',n:'sparks',x,y,num:8,col:'#f3ead6',dir:a,spread:2.2,lo:90,hi:250,i:f.i});m.events.push({k:'fx',n:'shake',r:2.5,i:f.i});
    }
  }};

// Moth: always steering at the rival, wobbling as it goes. A touch (not more than once every few seconds) dusts the
// rival: for a moment every direct hit the rival tries to land on the moth misses.
BEHAVE.moth={
  init(f,m){f.s.ph=m.rnd()*6.2832;f.s.dust=0;f.s.cd=0;f.s.miss=0},
  tick(f,e,m){
    const S=f.s;
    S.ph+=DT*11;
    if(S.dust>0)S.dust-=DT;
    if(S.cd>0)S.cd-=DT;
    if(S.miss>0)S.miss-=DT;
    if(!e.gone){
      const d=gap(e,f)||1,ux=(e.x-f.x)/d,uy=(e.y-f.y)/d,w=dcos(S.ph)*1.15;
      f.vx+=(ux-uy*w)*f.speed*5*DT;f.vy+=(uy+ux*w)*f.speed*5*DT;m.renorm(f);
    }
  },
  touch:()=>FIGHTERS.moth.dmg,
  dealt(f,v,dmg,m){
    const S=f.s;
    if(S.cd>0)return;
    S.cd=3.6/f.spdMul;S.dust=1.1+.25*f.sig;
    m.events.push({k:'burst',x:v.x,y:v.y,n:10,i:f.i});m.events.push({k:'text',x:v.x,y:v.y-v.r,txt:'Dusted',i:f.i});
    m.events.push({k:'fx',n:'poof',x:v.x,y:v.y,r:v.r*1.2,col:'#f4e6aa',i:f.i});m.events.push({k:'fx',n:'stars',x:v.x,y:v.y,num:9,col:'#f4e6aa',jit:v.r*1.6,lo:10,hi:60,life:.7,i:f.i});      // a cloud of glittering scales
  },
  guard(f,src,dmg,m){
    if(f.s.dust<=0)return 1;
    if(f.s.miss<=0){
      f.s.miss=.45;m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Miss',i:f.i});
      m.events.push({k:'fx',n:'wisps',x:f.x,y:f.y,num:5,col:'#f4e6aa',jit:f.r*1.4,life:.5,i:f.i});m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r+2,r:f.r+12,w:1.3,life:.24,col:'#f4e6aa',i:f.i});      // the blow goes through dust
    }
    return 0;
  }};

// Octopus: four whirling arms. A hit makes it squirt ink: it jets away inside a cloud that hides it (anything that
// strikes from a distance misses, and close hits land weaker), and the blot it leaves behind slows the rival.
BEHAVE.octopus={
  init(f){f.s.ink=null;f.s.cd=1.2;f.s.jet=0;f.s.hid=0;f.s.hidMax=1},
  tick(f,e){
    const S=f.s,I=S.ink;
    if(S.cd>0)S.cd-=DT;
    if(S.jet>0)S.jet-=DT;
    if(S.hid>0)S.hid-=DT;
    if(I){
      I.t+=DT;
      if(I.t>I.life)S.ink=null;
      else if(!e.gone&&dhyp(e.x-I.x,e.y-I.y)<I.r+e.r*.5)e.slowT=Math.max(e.slowT,.3);
    }
  },
  hurt(f,src,dmg,m){
    const S=f.s;
    if(S.cd>0||f.hp<=0)return;
    S.cd=Math.max(2.4,4.4-.6*f.sig)/f.spdMul;S.hidMax=S.hid=1.5+.5*f.sig;S.jet=.35;
    S.ink={x:f.x,y:f.y,r:42+9*f.sig,t:0,life:2.6+.5*f.sig};
    const d=gap(src,f)||1;f.vx=(f.x-src.x)/d*f.speed;f.vy=(f.y-src.y)/d*f.speed;
    m.events.push({k:'fade',x:f.x,y:f.y,i:f.i});
    m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y,num:10,col:'#17132e',jit:f.r*1.6,lo:10,hi:60,size:6,life:.9,i:f.i});m.events.push({k:'fx',n:'splash',x:f.x,y:f.y,num:12,col:'#17132e',i:f.i});      // the squirt
    m.events.push({k:'fx',n:'drops',x:f.x,y:f.y,num:10,col:'#2a2450',lo:60,hi:200,size:2,i:f.i});
  },
  fast:f=>f.s.jet>0?2.2:1,
  guard(f,src,dmg,m){
    if(f.s.hid<=0)return 1;
    const far=gap(src,f)>src.r+f.r+34;
    if(!(f.s.fxMiss>m.t)){                                // (fxMiss only paces the effect) the blow lands in ink
      f.s.fxMiss=m.t+.45;
      m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y,num:4,col:'#17132e',jit:f.r,lo:10,hi:50,size:4.5,life:.6,i:f.i});
      if(far)m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Miss',i:f.i});
    }
    return far?0:.6;
  }};

// Penguin: every wall adds speed, and the slam scales with it. Landing the slam spends all of it.
BEHAVE.penguin={
  init(f){f.s.n=0;f.s.slam=0},
  bounce(f,m,x,y,nx,ny){
    const S=f.s,was=S.n;
    S.n=Math.min(5+f.sig,S.n+1+.34*f.sig);
    f.speed=f.base*(1+.16*S.n);m.renorm(f);
    const a=datan2(ny,nx);                             // ice sprays off the wall, more the faster it is going
    m.events.push({k:'fx',n:'sparks',x:x+nx*3,y:y+ny*3,num:3+S.n,col:'#dff6ff',dir:a,spread:2.2,lo:60,hi:150+30*S.n,life:.26,i:f.i});m.events.push({k:'fx',n:'flakes',x:x+nx*6,y:y+ny*6,num:2+S.n,jit:12,i:f.i});
    if(S.n>was&&S.n>=5+f.sig){m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+18,w:2.2,life:.3,col:'#bfe9ff',fill:.2,i:f.i});m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:5,col:'#eaf7ff',jit:f.r*1.6,i:f.i})}      // top speed
  },
  touch(f){f.s.slam=1;return FIGHTERS.penguin.dmg*(1+.45*f.s.n)},
  dealt(f,v,dmg,m){
    const S=f.s;
    if(!S.slam)return;
    S.slam=0;
    if(S.n>0){
      const x=(f.x+v.x)/2,y=(f.y+v.y)/2;                 // the slam: all that speed, spent as ice
      m.events.push({k:'fx',n:'frost',x,y,r:14+S.n*4,num:4+2*S.n,i:f.i});m.events.push({k:'fx',n:'wave',x,y,r0:5,r:20+S.n*7,w:2+S.n*.4,life:.3,col:'#bfe9ff',fill:.25,i:f.i});
      if(S.n>=3){m.events.push({k:'fx',n:'shatter',x,y,num:6+2*S.n,col:'#eaf7ff',r:16,i:f.i});m.events.push({k:'fx',n:'shake',r:1.5+S.n*.6,i:f.i})}
      m.knock(v,f);S.n=0;f.speed=f.base;m.renorm(f);
    }
  }};


// ---------- art ----------
// "Gilded": every fighter is a medallion drawn by the shared drawFighter in brawl-looks.js. These blocks add each class's
// crest (origin at the medallion centre, enamel field at radius 1) and whatever else makes it its own. All of it draws
// with g, the current context, in arena units.
const P3={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  BEAK:'#f0a23a',       // beaks, feet and the capybara's orange
  DOWN:'#f4d35e',       // duckling yellow
  TONGUE:'#e86a8a',
};
const P3_TAU=6.2832;
const p3now=()=>typeof NOW!=='undefined'?NOW:0;
const p3disc=(x,y,r)=>{g.beginPath();g.arc(x,y,Math.max(0,r),0,P3_TAU)};
function p3tone(hex,k){
  const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return hex;
  const n=parseInt(m[1],16),f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
  return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';
}
function p3glow(x,y,r,rgb,a){
  if(!(r>0))return;
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p3disc(x,y,r);g.fill();
}
// stroke the current path as a solid rod: dark edge underneath, the material on top
function p3rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P3.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
// fill the current path and give it the thin dark edge everything solid has
function p3solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P3.EDGE;g.lineWidth=.9;g.lineJoin='round';g.stroke()}
const p3col=f=>f.col||FIGHTERS[f.key].color;
// continuous effects (the amb hooks below) are paced through the effects engine; r1 is a random number from -1 to 1
const p3due=(f,tag,perSec,dt)=>FX.due(f.i,'p3'+tag,perSec,dt);
const p3r1=()=>Math.random()*2-1;
const p3dir=f=>{const sp=dhyp(f.vx,f.vy)||1;return [f.vx/sp,f.vy/sp]};
function p3star(x,y,r,col){
  g.beginPath();for(let k=0;k<8;k++){const a=k/8*P3_TAU-1.5708,q=k%2?r*.38:r;g.lineTo(x+dcos(a)*q,y+dsin(a)*q)}
  g.closePath();g.fillStyle=col;g.fill();
}
// a duckling walking along angle a
function p3duckling(x,y,a,peck){
  const c=dcos(a),s=dsin(a),hx=x+c*(4+peck*2),hy=y+s*(4+peck*2);
  g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x+.4,y+1.6,4.6,3.8,0,0,P3_TAU);g.fill();
  p3disc(x,y,4.3);p3solid(P3.DOWN);
  g.beginPath();g.moveTo(hx+c*4.6,hy+s*4.6);g.lineTo(hx+c*1.6-s*1.7,hy+s*1.6+c*1.7);g.lineTo(hx+c*1.6+s*1.7,hy+s*1.6-c*1.7);g.closePath();p3solid(P3.BEAK);
  p3disc(hx,hy,2.7);p3solid('#f8e08a');
  g.fillStyle=P3.EDGE;p3disc(hx+c*.8-s*1.1,hy+s*.8+c*1.1,.55);g.fill();p3disc(hx+c*.8+s*1.1,hy+s*.8-c*1.1,.55);g.fill();
}

LOOKS.duck={
  crest(fg,bg){                                           // the duck from the style sheet
    g.fillStyle=fg;
    g.beginPath();g.ellipse(-.06,.22,.5,.32,0,0,P3_TAU);g.fill();
    g.beginPath();g.moveTo(-.5,.1);g.lineTo(-.72,-.1);g.lineTo(-.38,0);g.closePath();g.fill();
    g.beginPath();g.arc(.26,-.24,.27,0,P3_TAU);g.fill();
    g.fillStyle=P3.BEAK;g.beginPath();g.moveTo(.46,-.3);g.lineTo(.8,-.2);g.lineTo(.46,-.1);g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.arc(.32,-.3,.05,0,P3_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.05;g.lineCap='round';g.beginPath();g.moveTo(-.28,.2);g.quadraticCurveTo(-.05,.36,.2,.2);g.stroke();
  },
  back(f){                                                // the brood, last in line first
    const K=f.s.kids,cd=FIGHTERS.duck.cd/f.spdMul;
    for(let k=K.length-1;k>=0;k--){const q=K[k];p3duckling(q.x,q.y,q.a,q.cd>cd*.7?1:0)}
  },
  over(f){                                                // the quack, as three arcs leaving its bill
    if(!(f.s.quack>0))return;
    const p=1-f.s.quack/.45,a=f.aim;
    g.lineCap='round';g.strokeStyle='rgba(243,234,214,'+(.9*(1-p)).toFixed(3)+')';g.lineWidth=1.6;
    for(let k=0;k<3;k++){g.beginPath();g.arc(f.x,f.y,f.r+6+k*7+p*14,a-.55,a+.55);g.stroke()}
  },
  amb(f,e,m,dt){                                          // little feet kick up dust; the quack blows a cone of air
    const K=f.s.kids;
    if(f.gone)return;
    for(let n=p3due(f,'dk',3,dt);n>0;n--){const q=K[(Math.random()*K.length)|0];if(q)FX.dust(q.x,q.y+3,1,'#d9cfb4',{lo:4,hi:14,size:2.2,life:.35})}
    if(f.s.quack>0)for(let n=p3due(f,'qk',28,dt);n>0;n--){const a=f.aim+p3r1()*.55,d=f.r+4+Math.random()*12;FX.sparks(f.x+dcos(a)*d,f.y+dsin(a)*d,1,'#fff1c9',{dir:a,spread:.25,lo:130,hi:280,life:.22,size:1})}
  }};

LOOKS.cat={
  crest(fg,bg){                                           // a cat's face
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    for(const s of [-1,1]){g.beginPath();g.moveTo(s*.52,-.7);g.lineTo(s*.56,-.08);g.lineTo(s*.1,-.34);g.closePath();g.fill()}
    g.beginPath();g.ellipse(0,.1,.58,.48,0,0,P3_TAU);g.fill();
    g.fillStyle=bg;
    for(const s of [-1,1]){g.beginPath();g.ellipse(s*.24,.02,.07,.15,s*.25,0,P3_TAU);g.fill()}
    g.beginPath();g.moveTo(-.07,.22);g.lineTo(.07,.22);g.lineTo(0,.31);g.closePath();g.fill();
    g.strokeStyle=fg;g.lineWidth=.04;g.beginPath();
    for(const s of [-1,1]){g.moveTo(s*.5,.2);g.lineTo(s*.86,.1);g.moveTo(s*.5,.3);g.lineTo(s*.86,.36)}
    g.stroke();
  },
  back(f){
    const S=f.s,sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp,r=f.r,a=datan2(-uy,-ux),sw=dsin(p3now()*5+f.i)*.55;
    if(S.leap>0){                                         // mid-pounce: three thin streaks behind it
      g.strokeStyle='rgba(243,234,214,.5)';g.lineWidth=1.1;g.lineCap='round';g.beginPath();
      for(let k=-1;k<=1;k++){const ox=-uy*k*r*.6,oy=ux*k*r*.6;g.moveTo(f.x+ox-ux*(r+3),f.y+oy-uy*(r+3));g.lineTo(f.x+ox-ux*(r+26-Math.abs(k)*8),f.y+oy-uy*(r+26-Math.abs(k)*8))}
      g.stroke();
    }
    g.beginPath();g.moveTo(f.x+dcos(a)*(r-1),f.y+dsin(a)*(r-1));    // the tail, swishing
    g.quadraticCurveTo(f.x+dcos(a+sw*.4)*(r+9),f.y+dsin(a+sw*.4)*(r+9),f.x+dcos(a+sw)*(r+15),f.y+dsin(a+sw)*(r+15));
    p3rod(p3tone(p3col(f),-.15),2.8);
  },
  over(f){                                                // spare lives, as gold studs on the left of the rim
    const n=f.s.lives|0;
    for(let k=0;k<n;k++){const a=2.55+k*.3;p3disc(f.x+dcos(a)*(f.r+3.5),f.y+dsin(a)*(f.r+3.5),1.7);p3solid(P3.GOLD_HI)}
    if(f.s.crouch>0){                                     // crouched: its haunches tremble
      const w=dsin(f.s.crouch*50)*1.3;
      g.strokeStyle='rgba(240,220,164,.75)';g.lineWidth=1.1;g.lineCap='round';
      g.beginPath();g.arc(f.x+w,f.y,f.r+5,.6,2.5);g.stroke();
    }
  },
  amb(f,e,m,dt){
    const S=f.s,r=f.r,u=p3dir(f);
    if(S.safe>0){for(let n=p3due(f,'sf',12,dt);n>0;n--)FX.wisps(f.x+p3r1()*r,f.y+p3r1()*r,1,p3col(f),{life:.5});return}      // out of reach: only a shimmer where it is
    if(f.gone)return;
    if(S.leap>0)for(let n=p3due(f,'lp',30,dt);n>0;n--)FX.sparks(f.x-u[0]*r+p3r1()*r*.7,f.y-u[1]*r+p3r1()*r*.7,1,'#ffe6c4',{dir:datan2(-u[1],-u[0]),spread:.5,lo:30,hi:120,life:.26,size:1.1});
    if(S.crouch>0)for(let n=p3due(f,'cr',16,dt);n>0;n--)FX.dust(f.x+p3r1()*r,f.y+r*.7,1,null,{lo:6,hi:22,size:2.4,life:.3});
  }};

LOOKS.frog={
  crest(fg,bg){                                           // a frog, seen from the front
    g.lineCap='round';g.fillStyle=fg;
    g.beginPath();g.ellipse(0,.2,.64,.42,0,0,P3_TAU);g.fill();
    for(const s of [-1,1]){g.beginPath();g.arc(s*.34,-.3,.23,0,P3_TAU);g.fill()}
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.arc(s*.34,-.32,.1,0,P3_TAU);g.fill()}
    g.strokeStyle=bg;g.lineWidth=.055;g.beginPath();g.moveTo(-.42,.2);g.quadraticCurveTo(0,.44,.42,.2);g.stroke();
    g.beginPath();g.arc(-.08,.02,.025,0,P3_TAU);g.arc(.08,.02,.025,0,P3_TAU);g.fill();
  },
  back(f){                                                // hind legs: folded while it sits, flung out in a leap
    const a=datan2(f.vy,f.vx)+Math.PI,air=f.s.air?1:0,col=p3tone(p3col(f),-.2);
    for(const s of [-1,1]){
      const an=a+s*.8,d=f.r+1+air*6;
      g.beginPath();g.ellipse(f.x+dcos(an)*d,f.y+dsin(an)*d,5+air*4,3.2,an,0,P3_TAU);p3solid(col);
    }
  },
  over(f){                                                // the tongue
    const T=f.s.tongue;
    if(!T)return;
    const dx=T.x-f.x,dy=T.y-f.y,d=dhyp(dx,dy)||1;
    if(d>f.r){g.beginPath();g.moveTo(f.x+dx/d*f.r,f.y+dy/d*f.r);g.lineTo(T.x,T.y);p3rod(P3.TONGUE,2.2)}
    p3disc(T.x,T.y,3.3);p3solid(P3.TONGUE);
  },
  amb(f,e,m,dt){
    const S=f.s,T=S.tongue,u=p3dir(f);
    if(f.gone)return;
    if(S.pull>0&&!e.gone){                                 // dragging the rival in: its heels scrape, the tongue drips
      for(let n=p3due(f,'pl',14,dt);n>0;n--)FX.dust(e.x+p3r1()*e.r*.7,e.y+e.r*.6,1,null,{lo:6,hi:26,size:2.6,life:.35});
      for(let n=p3due(f,'dr',9,dt);n>0;n--){const k=Math.random();FX.drops(f.x+(e.x-f.x)*k,f.y+(e.y-f.y)*k,1,P3.TONGUE,{dir:1.57,spread:.5,lo:10,hi:40})}
    }else if(T)for(let n=p3due(f,'tg',12,dt);n>0;n--)FX.drops(T.x,T.y,1,P3.TONGUE,{lo:10,hi:50,life:.3});
    if(S.air)for(let n=p3due(f,'ar',9,dt);n>0;n--)FX.sparks(f.x-u[0]*f.r+p3r1()*f.r*.6,f.y-u[1]*f.r+p3r1()*f.r*.6,1,'#b9f08a',{lo:8,hi:40,life:.22,size:1});
  }};

LOOKS.crab={
  crest(fg,bg){                                           // a crab, claws raised
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.beginPath();g.ellipse(0,.16,.5,.32,0,0,P3_TAU);g.fill();
    g.lineWidth=.09;g.beginPath();
    for(const s of [-1,1]){
      g.moveTo(s*.4,.02);g.lineTo(s*.62,-.3);                              // arms
      for(let k=0;k<3;k++){g.moveTo(s*(.38-k*.12),.36+k*.04);g.lineTo(s*(.66-k*.14),.58+k*.05)}   // legs
      g.moveTo(s*.14,-.1);g.lineTo(s*.14,-.3);                             // eye stalks
    }
    g.stroke();
    for(const s of [-1,1]){
      g.beginPath();g.arc(s*.6,-.46,.2,0,P3_TAU);g.fill();
      g.beginPath();g.arc(s*.14,-.34,.06,0,P3_TAU);g.fill();
    }
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.moveTo(s*.6,-.44);g.lineTo(s*.5,-.72);g.lineTo(s*.72,-.7);g.closePath();g.fill()}
  },
  arm(f,A,x1,y1,x2,y2,an){                                // a pincer: it snaps shut just after a pinch
    const col=p3tone(p3col(f),-.12),h=Math.max(3,A.head),open=f.cd>0?.1:.42;
    g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);p3rod(col,3.2);
    p3disc(x2,y2,h);p3solid(col);
    g.beginPath();g.moveTo(x2-dcos(an)*h*.2,y2-dsin(an)*h*.2);
    g.lineTo(x2+dcos(an-open)*h*1.08,y2+dsin(an-open)*h*1.08);g.lineTo(x2+dcos(an+open)*h*1.08,y2+dsin(an+open)*h*1.08);
    g.closePath();g.fillStyle='#1a0d0a';g.fill();
    g.fillStyle='rgba(255,255,255,.35)';p3disc(x2-dsin(an)*h*.45,y2+dcos(an)*h*.45,h*.18);g.fill();
  },
  back(f){                                                // legs down both flanks, and the shell flashing when it takes a hit
    const a=f.s.face,r=f.r,col=p3tone(p3col(f),-.3),t=p3now();
    for(const s of [-1,1])for(let k=0;k<3;k++){
      const an=a+s*(1.35+k*.42),l=6+dsin(t*18+k*2+s)*1.4;
      g.beginPath();g.moveTo(f.x+dcos(an)*(r-1),f.y+dsin(an)*(r-1));
      g.lineTo(f.x+dcos(an)*(r+l),f.y+dsin(an)*(r+l));g.lineTo(f.x+dcos(an+s*.35)*(r+l+4),f.y+dsin(an+s*.35)*(r+l+4));
      p3rod(col,1.5);
    }
    if(f.s.clang>0){g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=2;g.lineCap='round';g.beginPath();g.arc(f.x,f.y,r+2.5,a+1.1,a+5.18);g.stroke()}
  },
  amb(f,e,m,dt){                                          // sand scuffed up behind the scuttle
    if(f.gone)return;
    const u=p3dir(f);
    for(let n=p3due(f,'sc',6,dt);n>0;n--)FX.dust(f.x-u[0]*f.r+p3r1()*f.r*.8,f.y-u[1]*f.r+p3r1()*f.r*.8,1,'#d9c8a0',{lo:6,hi:22,size:2.3,life:.35});
  }};

LOOKS.bull={
  crest(fg){                                              // horns over a ring: the sign of the bull
    g.lineCap='round';g.strokeStyle=fg;g.lineWidth=.17;
    g.beginPath();g.arc(0,.3,.3,0,P3_TAU);g.stroke();
    g.beginPath();g.moveTo(-.6,-.62);g.quadraticCurveTo(-.5,-.02,0,0);g.quadraticCurveTo(.5,-.02,.6,-.62);g.stroke();
  },
  back(f){
    const S=f.s,sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp,r=f.r,a=datan2(uy,ux),x=f.x,y=f.y;
    if(S.mode===2){                                       // charging: chevrons of dust behind it
      g.strokeStyle='rgba(222,206,172,.55)';g.lineWidth=1.6;g.lineCap='round';g.lineJoin='round';
      for(let k=1;k<=3;k++){
        const d=r+4+k*8,w=r*(.9-k*.18);
        g.globalAlpha=1-k*.25;g.beginPath();g.moveTo(x-ux*(d+5)-uy*w,y-uy*(d+5)+ux*w);g.lineTo(x-ux*d,y-uy*d);g.lineTo(x-ux*(d+5)+uy*w,y-uy*(d+5)-ux*w);g.stroke();
      }
      g.globalAlpha=1;
    }
    for(const s of [-1,1]){                               // the horns, on the side it is heading
      const P=(an,rad)=>[x+dcos(a+s*an)*rad,y+dsin(a+s*an)*rad],b1=P(.82,r-1),c1=P(.95,r+11),tip=P(.22,r+12),c2=P(.5,r+5),b2=P(.42,r-1);
      g.beginPath();g.moveTo(b1[0],b1[1]);g.quadraticCurveTo(c1[0],c1[1],tip[0],tip[1]);g.quadraticCurveTo(c2[0],c2[1],b2[0],b2[1]);g.closePath();p3solid(P3.IVORY);
    }
  },
  over(f){
    const S=f.s,r=f.r;
    if(S.mode===3){for(let k=0;k<3;k++){const a=S.t*9+k*2.094;p3star(f.x+dcos(a)*r*.75,f.y-r-7+dsin(a)*3.5,3.4,P3.GOLD_HI)}}
    g.lineCap='round';g.strokeStyle='#e8493a';g.lineWidth=1.8;      // anger: red marks along the top of the rim
    for(let k=0;k<S.anger;k++){const a=-2.4+k*.5;g.beginPath();g.arc(f.x,f.y,r+3.4,a,a+.32);g.stroke()}
  },
  amb(f,e,m,dt){
    const S=f.s,r=f.r,u=p3dir(f);
    if(f.gone)return;
    if(S.mode===2){                                       // the charge: a wake of dust, and sparks off the hooves if it is angry
      for(let n=p3due(f,'ch',24,dt);n>0;n--)FX.dust(f.x-u[0]*r+p3r1()*r*.8,f.y-u[1]*r+p3r1()*r*.8,1,null,{lo:10,hi:50,size:3.6,life:.45});
      for(let n=p3due(f,'ce',6+6*S.anger,dt);n>0;n--)FX.embers(f.x-u[0]*r*.6+p3r1()*r,f.y-u[1]*r*.6+p3r1()*r,1,S.anger?'#ff5a3a':'#ffc98a',{life:.4});
    }else if(S.mode===3){                                  // dazed: stars round its head
      for(let n=p3due(f,'dz',6,dt);n>0;n--)FX.stars(f.x+p3r1()*r,f.y-r-5+p3r1()*4,1,'#f0dca4',{lo:4,hi:22,size:2.8,life:.4});
    }
    if(S.anger>0&&S.mode!==3){                            // angry: it snorts steam and smoulders
      for(let n=p3due(f,'sn',1.6*S.anger,dt);n>0;n--)FX.smoke(f.x+u[0]*r+p3r1()*3,f.y+u[1]*r+p3r1()*3,1,'#e0d8d0',{dir:datan2(u[1],u[0]),spread:.8,lo:14,hi:40,size:2.4,life:.4});
      for(let n=p3due(f,'an',2.2*S.anger,dt);n>0;n--){const a=Math.random()*P3_TAU;FX.embers(f.x+dcos(a)*r,f.y+dsin(a)*r,1,'#ff5a3a',{life:.5})}
    }
  }};

LOOKS.snail={
  crest(fg,bg){                                           // a snail
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.beginPath();g.ellipse(-.02,.5,.66,.12,0,0,P3_TAU);g.fill();
    g.lineWidth=.2;g.beginPath();g.moveTo(-.4,.46);g.quadraticCurveTo(-.6,.36,-.56,.06);g.stroke();
    g.lineWidth=.05;g.beginPath();g.moveTo(-.6,0);g.lineTo(-.72,-.3);g.moveTo(-.52,0);g.lineTo(-.44,-.32);g.stroke();
    g.beginPath();g.arc(-.72,-.32,.055,0,P3_TAU);g.fill();g.beginPath();g.arc(-.44,-.34,.055,0,P3_TAU);g.fill();
    g.beginPath();g.arc(.14,.04,.43,0,P3_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.06;
    g.beginPath();g.arc(.14,.04,.27,.6,5.4);g.stroke();
    g.beginPath();g.arc(.17,.06,.12,2.2,7.2);g.stroke();
  },
  under(f){                                               // slime
    const T=f.s.trail,t=typeof MATCH!=='undefined'&&MATCH?MATCH.t:p3now();
    if(T.length<2)return;
    g.lineCap='round';g.lineJoin='round';
    for(let pass=0;pass<2;pass++){
      g.strokeStyle=pass?'rgba(226,246,190,.3)':'rgba(170,214,130,.2)';g.lineWidth=pass?3:8.5;
      g.beginPath();
      for(let i=0;i<T.length;i++){const p=T[i],q=T[i-1];if(!i||dhyp(p.x-q.x,p.y-q.y)>14)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y)}
      g.stroke();
    }
    const p=T[0],age=Math.max(0,Math.min(1,(t-p.t)/4.5));
    g.fillStyle='rgba(226,246,190,'+(.3*(1-age)).toFixed(3)+')';p3disc(p.x,p.y,2.2);g.fill();
  },
  back(f){
    const r=f.r,a=datan2(f.vy,f.vx);
    if(f.s.shell>0){                                      // spinning: arcs whipping round it
      const ph=p3now()*24;
      g.lineCap='round';g.strokeStyle='rgba(243,234,214,.65)';g.lineWidth=1.5;
      for(let k=0;k<3;k++){g.beginPath();g.arc(f.x,f.y,r+3.5,ph+k*2.094,ph+k*2.094+1.1);g.stroke()}
      return;
    }
    for(const s of [-1,1]){                               // eye stalks, out in front
      const bx=f.x+dcos(a+s*.3)*(r-1),by=f.y+dsin(a+s*.3)*(r-1),tx=f.x+dcos(a+s*.36)*(r+7),ty=f.y+dsin(a+s*.36)*(r+7);
      g.beginPath();g.moveTo(bx,by);g.lineTo(tx,ty);p3rod(p3tone(p3col(f),.25),1.5);
      p3disc(tx,ty,2);p3solid(P3.IVORY);g.fillStyle=P3.EDGE;p3disc(tx+dcos(a)*.6,ty+dsin(a)*.6,.8);g.fill();
    }
  },
  over(f){                                                // withdrawn: the shell's lip closes over the rim
    if(!(f.s.shell>0))return;
    const ph=p3now()*24;
    g.strokeStyle='rgba(226,200,150,.9)';g.lineWidth=2.2;p3disc(f.x,f.y,f.r*.93);g.stroke();
    g.lineCap='round';g.strokeStyle='rgba(60,40,20,.55)';g.lineWidth=1.3;
    for(let k=0;k<2;k++){g.beginPath();g.arc(f.x,f.y,f.r*.55,ph+k*3.1416,ph+k*3.1416+1.6);g.stroke()}
  },
  amb(f,e,m,dt){
    const S=f.s,T=S.trail,r=f.r;
    if(T.length)for(let n=p3due(f,'sm',3.5,dt);n>0;n--){const p=T[(Math.random()*T.length)|0];FX.bubbles(p.x+p3r1()*4,p.y+p3r1()*4,1,'#cfeea0',{life:.6,size:1.1})}      // the slime glistens
    if(!e.gone&&e.hp>0){                                  // a rival wading through it drags strings of slime
      let on=false;
      for(const p of T)if(m.t-p.t>.2&&dhyp(e.x-p.x,e.y-p.y)<e.r+4){on=true;break}
      if(on)for(let n=p3due(f,'ss',10,dt);n>0;n--)FX.drops(e.x+p3r1()*e.r*.8,e.y+e.r*.5,1,'#bfe28a',{dir:-1.57,spread:1.6,lo:20,hi:70});
    }
    if(S.shell>0&&!f.gone)for(let n=p3due(f,'sp',16,dt);n>0;n--){const a=Math.random()*P3_TAU;FX.sparks(f.x+dcos(a)*r,f.y+dsin(a)*r,1,'#f3ead6',{dir:a+1.57,spread:.4,lo:60,hi:160,life:.2,size:1})}      // the spin throws grit
  }};

LOOKS.moth={
  crest(fg,bg){                                           // a moth, wings spread
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    for(const s of [-1,1]){
      g.beginPath();g.moveTo(0,-.12);g.quadraticCurveTo(s*.5,-.8,s*.76,-.4);g.quadraticCurveTo(s*.62,0,0,.08);g.closePath();g.fill();
      g.beginPath();g.moveTo(0,.06);g.quadraticCurveTo(s*.64,.1,s*.5,.58);g.quadraticCurveTo(s*.2,.52,0,.24);g.closePath();g.fill();
    }
    g.fillStyle=bg;
    for(const s of [-1,1]){g.beginPath();g.arc(s*.44,-.34,.1,0,P3_TAU);g.fill();g.beginPath();g.arc(s*.34,.32,.06,0,P3_TAU);g.fill()}
    g.beginPath();g.ellipse(0,.06,.12,.44,0,0,P3_TAU);g.fill();
    g.fillStyle=fg;g.beginPath();g.ellipse(0,.06,.065,.39,0,0,P3_TAU);g.fill();
    g.strokeStyle=fg;g.lineWidth=.04;g.beginPath();g.moveTo(-.03,-.32);g.quadraticCurveTo(-.1,-.56,-.26,-.7);g.moveTo(.03,-.32);g.quadraticCurveTo(.1,-.56,.26,-.7);g.stroke();
  },
  back(f){                                                // wings beating either side of its path
    const a=datan2(f.vy,f.vx),r=f.r,flap=.5+.5*Math.abs(dsin(f.s.ph*1.7)),col=p3col(f);
    for(const s of [-1,1]){
      const P=(an,rad)=>[f.x+dcos(a+s*an)*rad,f.y+dsin(a+s*an)*rad],p1=P(1.1,r-2),c=P(1.85,r+10+16*flap),p2=P(2.6,r-2),eye=P(1.85,r+3+5*flap);
      g.beginPath();g.moveTo(p1[0],p1[1]);g.quadraticCurveTo(c[0],c[1],p2[0],p2[1]);g.closePath();
      g.fillStyle='rgba(236,226,250,.6)';g.fill();g.strokeStyle='rgba(9,11,13,.6)';g.lineWidth=.7;g.lineJoin='round';g.stroke();
      p3disc(eye[0],eye[1],1.8);g.fillStyle=p3tone(col,-.35);g.fill();
    }
  },
  top(f,m){                                               // dust hanging round the rival it has blinded (drawn above both fighters)
    if(!(f.s.dust>0)||!m)return;
    const e=m.f[1-f.i],t=p3now();
    if(!e||e.hp<=0)return;
    g.fillStyle='rgba(244,230,170,.9)';
    for(let k=0;k<9;k++){const a=k*.7+t*2.6,rr=e.r+2+(k*37%8);p3disc(e.x+dcos(a)*rr,e.y+dsin(a)*rr*.85-(t*9+k*3)%5,1.1+(k%3)*.35);g.fill()}
    g.strokeStyle='rgba(244,230,170,.5)';g.lineWidth=.9;g.setLineDash([1.5,3.5]);p3disc(e.x,e.y,e.r+4.5);g.stroke();g.setLineDash([]);
  },
  amb(f,e,m,dt){
    const S=f.s,r=f.r;
    if(!f.gone)for(let n=p3due(f,'md',7,dt);n>0;n--)FX.embers(f.x+p3r1()*r*1.3,f.y+p3r1()*r*1.3,1,'#f4e6aa',{lo:2,hi:14,life:.6,size:1.1,grav:24});      // scales drift off its wings
    if(S.dust>0&&e.hp>0&&!e.gone)for(let n=p3due(f,'me',13,dt);n>0;n--){const a=Math.random()*P3_TAU;FX.embers(e.x+dcos(a)*(e.r+3),e.y+dsin(a)*(e.r+3),1,'#f4e6aa',{lo:2,hi:12,life:.5,size:1.3,grav:28})}
  }};

LOOKS.octopus={
  crest(fg,bg){                                           // an octopus
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.beginPath();g.ellipse(0,-.2,.46,.44,0,0,P3_TAU);g.fill();
    g.lineWidth=.12;g.beginPath();
    for(let k=-2;k<=2;k++){g.moveTo(k*.17,.12);g.quadraticCurveTo(k*.3-.12,.42,k*.34,.56);g.quadraticCurveTo(k*.36+.1,.7,k*.36+.16,.56)}
    g.stroke();
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.ellipse(s*.18,-.14,.07,.11,0,0,P3_TAU);g.fill()}
  },
  arm(f,A,x1,y1,x2,y2,an){                                // a tentacle, curling as it whirls
    const col=p3tone(p3col(f),-.1),w=dsin(p3now()*7+A.a*2)*5,mx=(x1+x2)/2-dsin(an)*w,my=(y1+y2)/2+dcos(an)*w;
    g.beginPath();g.moveTo(x1,y1);g.quadraticCurveTo(mx,my,x2,y2);p3rod(col,3.8);
    p3disc(x2,y2,2.3);p3solid(p3tone(p3col(f),.3));
    g.fillStyle='rgba(243,234,214,.8)';p3disc((x1+mx)/2,(y1+my)/2,.8);g.fill();p3disc((x2+mx)/2,(y2+my)/2,.8);g.fill();
  },
  under(f){                                               // the blot it left on the floor
    const I=f.s.ink;
    if(!I)return;
    const p=Math.max(0,1-I.t/I.life),a=Math.min(1,p*2.2);
    p3glow(I.x,I.y,I.r*1.15,'10,9,22',.85*a);
    g.fillStyle='rgba(10,9,22,'+(.5*a).toFixed(3)+')';
    for(let k=0;k<6;k++){const an=k*1.047+I.x*.1;p3disc(I.x+dcos(an)*I.r*.5,I.y+dsin(an)*I.r*.5,I.r*.3);g.fill()}
  },
  over(f){                                                // the ink it is hiding in
    const S=f.s;
    if(!(S.hid>0))return;
    const a=Math.min(1,S.hid/(S.hidMax||1)*1.6),t=p3now();
    for(let k=0;k<6;k++){const an=k*1.047+t*1.3;p3glow(f.x+dcos(an)*f.r*.7,f.y+dsin(an)*f.r*.7,f.r*.95,'12,10,26',.6*a)}
  },
  amb(f,e,m,dt){
    const S=f.s,I=S.ink,r=f.r,u=p3dir(f),INK='#17132e';
    if(I){                                                // the blot seethes, and clings to a rival standing in it
      const k=Math.max(0,1-I.t/I.life);
      for(let n=p3due(f,'ib',1+4*k,dt);n>0;n--){const a=Math.random()*P3_TAU,d=Math.random()*I.r*.8;FX.bubbles(I.x+dcos(a)*d,I.y+dsin(a)*d,1,'#4a4380',{life:.6,size:1.4})}
      if(!e.gone&&e.hp>0&&dhyp(e.x-I.x,e.y-I.y)<I.r+e.r*.5)for(let n=p3due(f,'ie',10,dt);n>0;n--)FX.drops(e.x+p3r1()*e.r*.8,e.y+e.r*.5,1,INK,{dir:-1.57,spread:1.6,lo:20,hi:70,size:1.8});
    }
    if(S.hid>0)for(let n=p3due(f,'ih',9,dt);n>0;n--)FX.smoke(f.x+p3r1()*r,f.y+p3r1()*r,1,INK,{lo:4,hi:18,size:4,life:.6});      // the cloud it hides in
    if(S.jet>0)for(let n=p3due(f,'ij',34,dt);n>0;n--)FX.drops(f.x-u[0]*r,f.y-u[1]*r,1,INK,{dir:datan2(-u[1],-u[0]),spread:.9,lo:60,hi:170,size:2,grav:0});      // jetting away
  }};

LOOKS.penguin={
  crest(fg,bg){                                           // a penguin
    g.lineJoin='round';g.fillStyle=fg;
    for(const s of [-1,1]){g.beginPath();g.ellipse(s*.5,.12,.1,.34,-s*.3,0,P3_TAU);g.fill()}
    g.beginPath();g.ellipse(0,.04,.42,.62,0,0,P3_TAU);g.fill();
    g.fillStyle=bg;
    g.beginPath();g.moveTo(-.42,-.02);g.quadraticCurveTo(-.4,-.66,0,-.66);g.quadraticCurveTo(.4,-.66,.42,-.02);     // the dark hood, dipping to a widow's peak
    g.quadraticCurveTo(.3,-.36,.14,-.34);g.quadraticCurveTo(.04,-.34,0,-.2);g.quadraticCurveTo(-.04,-.34,-.14,-.34);g.quadraticCurveTo(-.3,-.36,-.42,-.02);g.fill();
    g.strokeStyle=fg;g.lineWidth=.07;g.beginPath();g.ellipse(0,.04,.42,.62,0,Math.PI,P3_TAU);g.stroke();
    g.fillStyle=fg;for(const s of [-1,1]){g.beginPath();g.arc(s*.17,-.42,.055,0,P3_TAU);g.fill()}
    g.fillStyle=P3.BEAK;
    g.beginPath();g.moveTo(-.09,-.2);g.lineTo(.09,-.2);g.lineTo(0,-.04);g.closePath();g.fill();
    for(const s of [-1,1]){g.beginPath();g.ellipse(s*.2,.68,.15,.06,0,0,P3_TAU);g.fill()}
  },
  back(f){                                                // the faster it slides, the longer the spray behind it
    const n=f.s.n;
    if(!(n>0))return;
    const sp=dhyp(f.vx,f.vy)||1,ux=f.vx/sp,uy=f.vy/sp,r=f.r,L=r+6+n*7;
    const q=g.createLinearGradient(f.x,f.y,f.x-ux*L,f.y-uy*L);q.addColorStop(0,'rgba(200,232,255,'+Math.min(.6,.18+n*.08).toFixed(3)+')');q.addColorStop(1,'rgba(200,232,255,0)');
    g.fillStyle=q;g.beginPath();g.moveTo(f.x-uy*r*.8,f.y+ux*r*.8);g.lineTo(f.x-ux*L,f.y-uy*L);g.lineTo(f.x+uy*r*.8,f.y-ux*r*.8);g.closePath();g.fill();
    g.strokeStyle='rgba(235,247,255,.7)';g.lineWidth=1;g.lineCap='round';g.beginPath();
    for(let k=-1;k<=1;k+=2){const ox=-uy*k*r*.55,oy=ux*k*r*.55;g.moveTo(f.x+ox-ux*(r+3),f.y+oy-uy*(r+3));g.lineTo(f.x+ox-ux*(r+5+n*4),f.y+oy-uy*(r+5+n*4))}
    g.stroke();
  },
  over(f){                                                // near top speed: frost glints on the rim
    const n=f.s.n;
    if(n<4)return;
    const t=p3now();
    for(let k=0;k<3;k++){const a=t*3+k*2.094;p3star(f.x+dcos(a)*(f.r+3),f.y+dsin(a)*(f.r+3),2.4,'#eaf7ff')}
  },
  amb(f,e,m,dt){                                          // the faster the slide, the more ice it throws behind
    const n0=f.s.n,r=f.r,u=p3dir(f);
    if(!(n0>0)||f.gone)return;
    for(let n=p3due(f,'pg',3*n0,dt);n>0;n--)FX.flakes(f.x-u[0]*r+p3r1()*r*.7,f.y-u[1]*r+p3r1()*r*.7,1,'#dff6ff',{lo:4,hi:26,life:.5});
    if(n0>=3)for(let n=p3due(f,'ps',2.5*n0,dt);n>0;n--){const off=p3r1()*r*.85,x=f.x-u[0]*r*.6-u[1]*off,y=f.y-u[1]*r*.6+u[0]*off,l=10+Math.random()*16;FX.line(x,y,x-u[0]*l,y-u[1]*l,'#eaf7ff',1,.2)}
  }};

