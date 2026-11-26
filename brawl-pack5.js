// Fifth pack of fighter classes for Ball Brawl: machines and cyberpunk. Each class adds a row to FIGHTERS, a block to
// BEHAVE and its art to LOOKS. The first half is pure simulation (it loads in Node with only brawl-sim.js before it);
// the second half is drawing and only runs when the page asks for it. Every top-level name starts with p5/P5.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
// cd is the pause between body or weapon hits; the bigger abilities keep their own timers.
FIGHTERS.netrunner={name:'Netrunner',  color:'#6a4fb0',hp:100,speed:170,spin:0,  dmg:10.69,cd:.5, arms:[],desc:'Sends data packets that jam the rival’s weapons, then rushes in.',sig:['Deep hack','Weapons stay jammed for longer'],sfx:{hit:'tick',shot:'cast'}};
FIGHTERS.drone    ={name:'Drone Pilot',color:'#4fa8a0',hp:100,speed:165,spin:0,  dmg:6.93, cd:1.5,arms:[],desc:'Harmless itself. Its drones circle it and fire in bursts.',sig:['Bigger swarm','One more drone'],sfx:{hit:'tick',shot:'pop'}};
FIGHTERS.mech     ={name:'Mech',       color:'#7d8b57',hp:100,speed:130,spin:0,  dmg:38.18,cd:.8, arms:[],desc:'Slow and heavy. Marks the floor, then a missile lands there.',sig:['Salvo','One more missile in every volley'],sfx:{hit:'',shot:'whoosh'}};
FIGHTERS.glitch   ={name:'Glitch',     color:'#c23bd4',hp:100,speed:175,spin:0,  dmg:10.89,cd:.5, arms:[],desc:'Blinks next to the rival and leaves a copy that hurts to touch.',sig:['Corruption','Blinks sooner and hits harder as it lands'],sfx:{hit:'glass'}};
FIGHTERS.laser    ={name:'Laser',      color:'#d43b3b',hp:100,speed:170,spin:0,  dmg:12.71, cd:1.5,arms:[],desc:'Stops, charges, then burns a beam right across the arena.',sig:['Overcharge','A wider beam that burns for longer'],sfx:{hit:''}};
FIGHTERS.railgun  ={name:'Railgun',    color:'#3f6fd8',hp:100,speed:160,spin:0,  dmg:44.62,cd:2.55,arms:[],desc:'Takes aim for a second, then one shot that really hurts.',sig:['Capacitors','Reloads sooner and locks on later'],sfx:{hit:'iron',shot:'gun'}};
FIGHTERS.engineer ={name:'Engineer',   color:'#d98a2b',hp:100,speed:165,spin:4.4,dmg:16.58,cd:.5, arms:[{a:0,l:16,d:.6}],desc:'Builds little turrets. Run them over to get rid of them.',sig:['Better turrets','One more turret, and they all shoot faster'],sfx:{hit:'metal',shot:'pop'}};
FIGHTERS.battery  ={name:'Battery',    color:'#8fbf2f',hp:100,speed:185,spin:0,  dmg:24.35,cd:.5, arms:[],desc:'Stores every hit it takes and gives it back on the next touch.',sig:['Bigger cells','A stronger discharge'],sfx:{hit:'punch'}};
FIGHTERS.chainsaw ={name:'Chainsaw',   color:'#c9562e',hp:100,speed:165,spin:0,  dmg:7.49, cd:.5, arms:[],desc:'Cuts faster the longer it stays on you. A hard hit knocks it loose.',sig:['Bigger engine','Revs up sooner and cuts faster'],sfx:{hit:'tin'}};
FIGHTERS.roomba   ={name:'Roomba',     color:'#8e9aa6',hp:100,speed:175,spin:0,  dmg:14.75,cd:.45,arms:[],desc:'Bumps and turns. Its vacuum eats traps, shots and minions to heal.',sig:['Stronger suction','Pulls harder, reaches further, heals more and bumps harder'],sfx:{hit:'thump'}};
ROSTER.push('netrunner','drone','mech','glitch','laser','railgun','engineer','battery','chainsaw','roomba');

const P5_TAU=6.2832;
const p5clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
// distance from (x,y) along the unit direction (c,s) to the arena wall
function p5ray(x,y,c,s){const tx=c>0?(AW-x)/c:c<0?-x/c:1e9,ty=s>0?(AW-y)/s:s<0?-y/s:1e9;return Math.max(0,Math.min(tx,ty))}
// head straight for the rival at full speed
function p5seek(f,e){const d=gap(e,f)||1;f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed}
// turn angle a towards angle b by at most `step`
function p5turn(a,b,step){let d=(b-a)%P5_TAU;if(d>Math.PI)d-=P5_TAU;if(d<-Math.PI)d+=P5_TAU;return a+Math.max(-step,Math.min(step,d))}
// does one of the rival's weapon arms reach the point (x,y)?
function p5cut(e,x,y,r){for(const s of segs(e))if(distPS(x,y,s[0],s[1],s[2],s[3])<r+(s[4]||0))return true;return false}
// a shot from any point, handled like every other shot in the match (weapons and minions can block it)
function p5shot(f,m,x,y,an,d){
  m.bullets.push({x,y,vx:Math.cos(an)*330,vy:Math.sin(an)*330,own:f.i,d});m.events.push({k:'shot',x,y,i:f.i});
  m.events.push({k:'fx',n:'flash',x,y,r:8,life:.1,i:f.i});m.events.push({k:'fx',n:'sparks',x,y,num:4,dir:an,spread:.7,lo:120,hi:260,life:.15,i:f.i});
}

// Netrunner: a slow packet that follows the rival. A weapon can swat it. If it lands, the rival's weapons and touch are
// jammed for a moment, its heading is scrambled, and the netrunner rushes in to hit it while it cannot hit back.
BEHAVE.netrunner={
  init(f){f.s.t=1;f.s.pk=[];f.s.jam=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.netrunner,S=f.s,Q=S.pk;
    if(S.jam>0){
      S.jam-=DT;
      if(!e.gone){e.cd=Math.max(e.cd,.15);e.xcd=Math.max(e.xcd,.15);p5seek(f,e)}
      if(S.jam<=0)m.events.push({k:'fx',n:'wave',x:e.x,y:e.y,r0:e.r,r:e.r+16,life:.3,col:'#7fe7ff',w:1.6,i:f.i});     // the jam lifts
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=2.6/f.spdMul;
      Q.push({x:f.x+Math.cos(f.aim)*f.r,y:f.y+Math.sin(f.aim)*f.r,vx:Math.cos(f.aim)*235,vy:Math.sin(f.aim)*235,t:0});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;
      if(!e.gone){
        const d=Math.hypot(e.x-q.x,e.y-q.y)||1;
        q.vx+=(e.x-q.x)/d*560*DT;q.vy+=(e.y-q.y)/d*560*DT;
        const sp=Math.hypot(q.vx,q.vy)||1;q.vx*=235/sp;q.vy*=235/sp;
      }
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      if(p5cut(e,q.x,q.y,5)){m.events.push({k:'parry',x:q.x,y:q.y});Q.splice(i,1);continue}
      if(!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+4){
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
        S.jam=1.1+.45*f.sig;
        const a=m.rnd()*P5_TAU;e.vx=Math.cos(a)*e.speed;e.vy=Math.sin(a)*e.speed;e.dir*=-1;
        m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Jammed',col:'#7fe7ff',i:f.i});
        m.events.push({k:'fx',n:'tele',x:e.x,y:e.y,r:e.r+6,col:'#55e6ff',i:f.i});
        m.events.push({k:'fx',n:'shards',x:q.x,y:q.y,num:7,col:'#d6fbff',lo:60,hi:190,i:f.i});
        m.events.push({k:'fx',n:'zap',x:e.x,y:e.y,col:'#7fe7ff',i:f.i});
        Q.splice(i,1);continue;
      }
      if(q.t>2.6||q.x<-10||q.x>AW+10||q.y<-10||q.y>AW+10)Q.splice(i,1);
    }
  },
  fast:f=>f.s.jam>0?1.6:1,
  touch:f=>f.s.jam>0?FIGHTERS.netrunner.dmg*.7:0,
  dealt(f,v,dmg,m){if(f.s.jam>0&&gap(f,v)<f.r+v.r+6)m.knock(v,f)}};

// Drone Pilot: the drones circle the pilot and fire two-shot bursts. A drone that the rival touches, or that a weapon
// reaches, is knocked out and takes a while to rebuild, so the answer to this class is to get in close.
BEHAVE.drone={
  init(f){
    const n=2+f.sig;f.s.rot=0;f.s.d=[];
    for(let k=0;k<n;k++)f.s.d.push({a:k/n*P5_TAU,x:f.x,y:f.y,alive:1,t:.7+k*.55,burst:0,re:0});
  },
  tick(f,e,m){
    const D=FIGHTERS.drone,S=f.s,R=f.r+24;
    S.rot+=1.5*DT;
    for(const q of S.d){
      const tx=p5clamp(f.x+Math.cos(S.rot+q.a)*R,5),ty=p5clamp(f.y+Math.sin(S.rot+q.a)*R,5);
      if(!q.alive){
        q.re-=DT;q.x=f.x;q.y=f.y;
        if(q.re<=0){q.alive=1;q.t=.8;q.burst=0;m.events.push({k:'spawn',x:f.x,y:f.y,i:f.i});m.events.push({k:'fx',n:'line',x:f.x,y:f.y,x2:tx,y2:ty,col:'#55e6ff',w:1.6,life:.25,i:f.i})}
        continue;
      }
      const dx=tx-q.x,dy=ty-q.y,d=Math.hypot(dx,dy)||1,st=Math.min(d,420*DT);
      q.x+=dx/d*st;q.y+=dy/d*st;
      if(!e.gone&&(Math.hypot(q.x-e.x,q.y-e.y)<e.r+5||p5cut(e,q.x,q.y,5))){
        q.alive=0;q.re=4.5/f.spdMul;m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});
        m.events.push({k:'fx',n:'shatter',x:q.x,y:q.y,num:7,col:'#8b959d',r:10,i:f.i});m.events.push({k:'fx',n:'smoke',x:q.x,y:q.y,num:3,i:f.i});continue;
      }
      q.t-=DT;
      if(q.t<=0&&!e.gone){
        const dd=Math.hypot(e.x-q.x,e.y-q.y)||1,lead=dd/330*.6;
        p5shot(f,m,q.x,q.y,Math.atan2(e.y+e.vy*lead-q.y,e.x+e.vx*lead-q.x)+(m.rnd()-.5)*.2,D.dmg);
        q.burst++;
        if(q.burst>=2){q.burst=0;q.t=D.cd*(1+.12*f.sig)/f.spdMul}else q.t=.16;
      }
    }
  }};

// Mech: picks the spot the rival is heading for, marks it, and a missile comes down on the mark one second later.
// Anything quick simply is not there any more. Its own bulk hurts a little to run into.
BEHAVE.mech={
  init(f){f.s.t=1.1;f.s.ms=[];f.s.q=0;f.s.qt=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.mech,S=f.s,M=S.ms;
    S.t-=DT;
    if(S.t<=0&&!e.gone){S.t=2.3/f.spdMul;S.q=1+f.sig;S.qt=0}
    if(S.q>0){
      S.qt-=DT;
      if(S.qt<=0&&!e.gone){
        S.qt=.2;S.q--;
        const lead=.5+m.rnd()*.45,sc=S.q>0||f.sig?44:22,rad=36;
        M.push({x:p5clamp(e.x+e.vx*lead+(m.rnd()-.5)*sc,rad*.5),y:p5clamp(e.y+e.vy*lead+(m.rnd()-.5)*sc,rad*.5),sx:f.x,sy:f.y,r:rad,t:0});
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
        const fq=M[M.length-1];
        m.events.push({k:'fx',n:'wave',x:fq.x,y:fq.y,r0:fq.r+18,r:fq.r,life:.35,col:'#ff785a',w:2,i:f.i});          // the mark locks on
        m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y-f.r*.6,num:4,col:'#8a8378',jit:f.r,i:f.i});                       // the pods cough
        m.events.push({k:'fx',n:'sparks',x:f.x,y:f.y-f.r*.6,num:5,col:'#ffb347',dir:-1.57,spread:1.4,lo:60,hi:160,life:.2,i:f.i});
      }
    }
    for(let i=M.length-1;i>=0;i--){
      const q=M[i];
      q.t+=DT;
      if(q.t>=1){
        m.events.push({k:'boom',x:q.x,y:q.y,i:f.i});
        m.events.push({k:'fx',n:'dust',x:q.x,y:q.y,num:8,lo:50,hi:120,life:.6,i:f.i});
        m.events.push({k:'fx',n:'shards',x:q.x,y:q.y,num:6,col:'#5b554c',lo:80,hi:220,i:f.i});
        if(!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r*.5){m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,q)}
        M.splice(i,1);
      }
    }
  },
  touch:()=>FIGHTERS.mech.dmg*.3};

// Glitch: every couple of seconds it vanishes and reappears right beside the rival, already heading for it. Where it
// stood it leaves a copy of itself that bursts on whoever touches it.
BEHAVE.glitch={
  init(f){f.s.t=1.4;f.s.im=[];f.s.blink=0;f.s.fresh=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.glitch,S=f.s,Q=S.im,life=2.4+.6*f.sig;
    S.life=life;
    if(S.blink>0){S.blink-=DT;if(S.blink<=0)f.gone=false}
    if(S.fresh>0)S.fresh-=DT;
    S.t-=DT;
    if(S.t<=0&&!e.gone&&!f.gone){
      S.t=Math.max(1.2,2.4-.3*f.sig)/f.spdMul;
      Q.push({x:f.x,y:f.y,r:f.r,t:0});
      if(Q.length>2+f.sig)Q.shift();
      m.events.push({k:'fade',x:f.x,y:f.y,i:f.i});
      const fx0=f.x,fy0=f.y;
      m.events.push({k:'fx',n:'shards',x:fx0,y:fy0,num:6,col:'#55e6ff',lo:40,hi:150,i:f.i});
      const a=m.rnd()*P5_TAU,d=e.r+f.r+14+m.rnd()*24;
      f.x=p5clamp(e.x+Math.cos(a)*d,f.r);f.y=p5clamp(e.y+Math.sin(a)*d,f.r);
      p5seek(f,e);f.gone=true;S.blink=.2;S.fresh=.9;
      m.events.push({k:'appear',x:f.x,y:f.y,i:f.i});
      m.events.push({k:'fx',n:'line',x:fx0-2,y:fy0,x2:f.x-2,y2:f.y,col:'#55e6ff',w:2,life:.22,i:f.i});                // the jump, split into its two colours
      m.events.push({k:'fx',n:'line',x:fx0+2,y:fy0,x2:f.x+2,y2:f.y,col:'#ff4fd8',w:2,life:.26,i:f.i});
      m.events.push({k:'fx',n:'shards',x:f.x,y:f.y,num:6,col:'#ff4fd8',lo:40,hi:150,i:f.i});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;
      if(q.t>.35&&!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+q.r*.7){
        m.events.push({k:'burst',x:q.x,y:q.y,n:10,i:f.i});
        m.events.push({k:'fx',n:'shatter',x:q.x,y:q.y,num:9,col:'#55e6ff',r:q.r,i:f.i});
        m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:q.r*.4,r:q.r+16,life:.3,col:'#ff4fd8',w:2.6,fill:.3,i:f.i});
        m.hurt(e,D.dmg*.8*f.dmgMul*rage,f);Q.splice(i,1);continue;
      }
      if(q.t>life){m.events.push({k:'fx',n:'wisps',x:q.x,y:q.y,num:5,jit:q.r,i:f.i});Q.splice(i,1)}
    }
  },
  touch:f=>FIGHTERS.glitch.dmg*(f.s.fresh>0?1+.3*f.sig:1)};

// Laser: roam, stop and charge (the aiming line follows the rival until the last moment), then a beam from the laser
// to the wall that burns whatever is standing in it. It cannot move while it charges or fires.
BEHAVE.laser={
  init(f){f.s.mode=0;f.s.t=1.2;f.s.an=0;f.s.cd=0;f.s.x2=f.x;f.s.y2=f.y},
  tick(f,e,m,rage){
    const D=FIGHTERS.laser,S=f.s;
    S.t-=DT;
    if(S.mode===0){
      if(S.t<=0&&!e.gone){S.mode=1;S.t=.8/f.spdMul;S.an=f.aim;m.events.push({k:'ring',x:f.x,y:f.y,r0:f.r+16,r:f.r,life:.6,w:2,col:'#ff8a7a',i:f.i})}
      return;
    }
    if(S.mode===1&&S.t>.22&&!e.gone)S.an=p5turn(S.an,f.aim,3.2*DT);
    const c=Math.cos(S.an),s=Math.sin(S.an),L=p5ray(f.x,f.y,c,s);
    S.x2=f.x+c*L;S.y2=f.y+s*L;
    if(S.mode===1){
      if(S.t<=0){
        S.mode=2;S.t=.55+.18*f.sig;S.cd=0;m.events.push({k:'zap',x:f.x,y:f.y,x2:S.x2,y2:S.y2,i:f.i});
        m.events.push({k:'fx',n:'flash',x:f.x+c*(f.r+8),y:f.y+s*(f.r+8),r:22,col:'#ff6a5a',life:.2,i:f.i});
        m.events.push({k:'fx',n:'wave',x:f.x+c*(f.r+8),y:f.y+s*(f.r+8),r0:3,r:24,life:.28,col:'#ff8a7a',w:2.4,i:f.i});
        m.events.push({k:'fx',n:'scorch',x:S.x2,y:S.y2,r:16,life:3,i:f.i});
        m.events.push({k:'fx',n:'shake',r:2.5,i:f.i});
      }
      return;
    }
    S.cd-=DT;
    if(S.cd<=0&&!e.gone&&distPS(e.x,e.y,f.x,f.y,S.x2,S.y2)<e.r+2+2*f.sig){S.cd=.1;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
    if(S.t<=0){S.mode=0;S.t=D.cd/f.spdMul;m.events.push({k:'fx',n:'smoke',x:f.x+c*(f.r+8),y:f.y+s*(f.r+8),num:4,col:'#7a6a66',i:f.i})}   // the emitter vents
  },
  fast:f=>f.s.mode?.04:1};

// Railgun: the aiming line follows the rival for most of a second and then locks. A moment later it fires along the
// locked line, wherever the rival is by then, and the recoil throws the railgun backwards.
BEHAVE.railgun={
  init(f){f.s.mode=0;f.s.t=1.4;f.s.an=0;f.s.tr=0;f.s.x1=f.x;f.s.y1=f.y;f.s.x2=f.x;f.s.y2=f.y;f.s.lock=.3},
  tick(f,e,m,rage){
    const D=FIGHTERS.railgun,S=f.s;
    if(S.tr>0)S.tr-=DT;
    S.t-=DT;
    S.lock=Math.max(.1,.22-.04*f.sig);
    if(S.mode===0){
      if(S.t<=0&&!e.gone){S.mode=1;S.t=1;S.an=f.aim}
      return;
    }
    if(S.t>S.lock&&!e.gone)S.an=f.aim;
    const c=Math.cos(S.an),s=Math.sin(S.an),L=p5ray(f.x,f.y,c,s);
    S.x1=f.x;S.y1=f.y;S.x2=f.x+c*L;S.y2=f.y+s*L;
    if(S.t<=S.lock&&!S.fxL){                               // locked on (fxL is only for show)
      S.fxL=1;
      m.events.push({k:'fx',n:'flash',x:f.x+c*(f.r+17),y:f.y+s*(f.r+17),r:14,col:'#eaf6ff',life:.16,i:f.i});
      m.events.push({k:'fx',n:'line',x:S.x1,y:S.y1,x2:S.x2,y2:S.y2,col:'#eaf6ff',w:2.4,life:.14,i:f.i});
    }
    if(S.t<=0){
      S.mode=0;S.t=D.cd*(1-.14*f.sig)/f.spdMul;S.tr=.2;S.fxL=0;
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});m.events.push({k:'burst',x:f.x+c*f.r,y:f.y+s*f.r,n:8,col:'#bfe6ff',i:f.i});
      m.events.push({k:'fx',n:'beam',x:f.x+c*f.r,y:f.y+s*f.r,x2:S.x2,y2:S.y2,col:'#78c8ff',w:6,life:.3,i:f.i});
      m.events.push({k:'fx',n:'wave',x:f.x+c*(f.r+10),y:f.y+s*(f.r+10),r0:4,r:34,life:.3,col:'#bfe6ff',w:3,fill:.3,i:f.i});
      m.events.push({k:'fx',n:'shatter',x:S.x2,y:S.y2,num:10,col:'#bfe6ff',r:16,i:f.i});
      m.events.push({k:'fx',n:'scorch',x:S.x2,y:S.y2,r:14,life:3,i:f.i});
      m.events.push({k:'fx',n:'dust',x:f.x,y:f.y,num:5,dir:S.an,spread:1.2,lo:40,hi:110,i:f.i});                     // the recoil
      m.events.push({k:'fx',n:'shake',r:4,i:f.i});
      if(!e.gone&&distPS(e.x,e.y,S.x1,S.y1,S.x2,S.y2)<e.r+4){m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,f)}
      f.vx=-c*f.speed;f.vy=-s*f.speed;
    }
  },
  fast:f=>f.s.mode===1?.45:1};

// Engineer: a wrench for close work, and turrets. A turret stays where it was planted and shoots until the rival
// runs it over, a weapon reaches it, or it wears out.
BEHAVE.engineer={
  init(f){f.s.t=.8;f.s.tu=[]},
  tick(f,e,m){
    const D=FIGHTERS.engineer,S=f.s,T=S.tu;
    S.t-=DT;
    if(S.t<=0){
      S.t=.5;
      let near=false;for(const q of T)if(Math.hypot(q.x-f.x,q.y-f.y)<46)near=true;
      if(T.length<2+f.sig&&!near){S.t=(2.4-.15*f.sig)/f.spdMul;T.push({x:p5clamp(f.x,8),y:p5clamp(f.y,8),t:.7,life:9+f.sig,an:f.aim});m.events.push({k:'mine',x:f.x,y:f.y,i:f.i});
        m.events.push({k:'fx',n:'sparks',x:f.x,y:f.y,num:9,col:'#ffd27a',lo:60,hi:180,life:.3,grav:220,i:f.i});m.events.push({k:'fx',n:'poof',x:f.x,y:f.y,r:10,i:f.i})}
    }
    for(let i=T.length-1;i>=0;i--){
      const q=T[i];
      q.life-=DT;
      if(!e.gone)q.an=Math.atan2(e.y-q.y,e.x-q.x);
      if(q.life<=0||(!e.gone&&(Math.hypot(q.x-e.x,q.y-e.y)<e.r+7||p5cut(e,q.x,q.y,6)))){
        m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});
        if(q.life<=0)m.events.push({k:'fx',n:'smoke',x:q.x,y:q.y,num:5,i:f.i});                                         // worn out: it just gives up
        else{m.events.push({k:'fx',n:'explode',x:q.x,y:q.y,r:15,col:'#ffb347',i:f.i});m.events.push({k:'fx',n:'shards',x:q.x,y:q.y,num:6,col:'#8b959d',i:f.i})}
        T.splice(i,1);continue;
      }
      q.t-=DT;
      if(q.t<=0&&!e.gone){q.t=1.15/(1+.08*f.sig)/f.spdMul;p5shot(f,m,q.x+Math.cos(q.an)*8,q.y+Math.sin(q.an)*8,q.an+(m.rnd()-.5)*.16,D.dmg*.55)}
    }
  }};

// Battery: every direct hit it takes fills its cells (a hit worth a third of its health fills them completely). The
// next time it touches the rival the whole charge goes into them at once.
BEHAVE.battery={
  init(f){f.s.ch=0;f.s.rel=0},
  tick(f){f.s.rel=0},
  hurt(f,src,dmg,m){
    const was=f.s.ch;
    f.s.ch=Math.min(1,f.s.ch+dmg/(f.max*.33));
    if(!m)return;
    m.events.push({k:'fx',n:'seek',x:src.x,y:src.y,to:f.i,num:2+Math.min(4,dmg/6),col:'#d8ff5a',i:f.i});            // the hit, flowing into the cells
    if(was<1&&f.s.ch>=1){
      m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Charged',col:'#d8ff5a',i:f.i});
      m.events.push({k:'fx',n:'holy',x:f.x,y:f.y,r:f.r+12,col:'#d8ff5a',i:f.i});
    }
  },
  touch(f){f.s.rel=1;return FIGHTERS.battery.dmg*(.3+(1.5+.5*f.sig)*f.s.ch)},
  dealt(f,v,dmg,m){
    if(!f.s.rel)return;
    f.s.rel=0;
    if(f.s.ch>.2){
      const ch=f.s.ch;
      m.events.push({k:'zap',x:f.x,y:f.y,x2:v.x,y2:v.y,i:f.i});
      m.events.push({k:'fx',n:'flash',x:v.x,y:v.y,r:v.r*(1.2+1.2*ch),col:'#d8ff5a',life:.2,i:f.i});
      m.events.push({k:'fx',n:'wave',x:v.x,y:v.y,r0:v.r*.5,r:v.r+10+26*ch,life:.34,col:'#d8ff5a',w:2+2*ch,fill:.35,i:f.i});
      m.events.push({k:'fx',n:'sparks',x:v.x,y:v.y,num:6+16*ch,col:'#eaffa0',lo:90,hi:200+160*ch,life:.3,i:f.i});
      m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r+8,r:f.r,life:.24,col:'#8fbf2f',w:2,i:f.i});                 // the cells empty
      if(ch>.6)m.events.push({k:'fx',n:'shake',r:1.5+2.5*ch,i:f.i});
      m.knock(v,f);
    }
    f.s.ch=0;
  }};

// Chainsaw: the bar points at the rival. While it is on them the engine revs up, the cuts come faster and the saw
// pulls itself after them, until the chain jams after a few seconds and it has to let go. A hit worth 15% of its health or more kicks it loose and stalls the engine.
BEHAVE.chainsaw={
  init(f){f.s.rev=0;f.s.an=0;f.s.c=0;f.s.stall=0;f.s.on=0;f.s.sp=0;f.s.len=22;f.s.heat=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.chainsaw,S=f.s;
    S.an=p5turn(S.an,f.aim,7*DT);
    if(S.c>0)S.c-=DT;
    if(S.on>0)S.on-=DT;
    if(S.stall>0){S.stall-=DT;S.rev=Math.max(0,S.rev-DT*2);S.heat=Math.max(0,S.heat-DT*3);return}
    const c=Math.cos(S.an),s=Math.sin(S.an);
    const on=!e.gone&&distPS(e.x,e.y,f.x+c*f.r,f.y+s*f.r,f.x+c*(f.r+S.len),f.y+s*(f.r+S.len))<e.r+2;
    if(on){
      S.rev=Math.min(1,S.rev+DT/(2-.35*f.sig));S.on=.12;
      p5seek(f,e);
      S.heat+=DT;
      if(S.heat>2.2){                                    // the chain jams: it lets go and has to cool down
        S.heat=0;S.stall=1.2;f.vx=-f.vx;f.vy=-f.vy;
        m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Stalled',col:'#ffd27a',i:f.i});
        m.events.push({k:'fx',n:'smoke',x:f.x-c*f.r*.5,y:f.y-s*f.r*.5,num:7,col:'#5a534c',jit:f.r*.6,i:f.i});
        m.events.push({k:'fx',n:'sparks',x:f.x+c*(f.r+S.len*.6),y:f.y+s*(f.r+S.len*.6),num:10,col:'#ffd27a',lo:70,hi:220,life:.32,grav:220,i:f.i});
        m.events.push({k:'fx',n:'shards',x:f.x+c*(f.r+S.len*.6),y:f.y+s*(f.r+S.len*.6),num:4,col:'#8b959d',i:f.i});return;
      }
      if(S.c<=0){
        S.c=(.44-(.24+.035*f.sig)*S.rev)/f.spdMul;
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
        if((S.sp=(S.sp+1)%3)===0)m.events.push({k:'burst',x:f.x+c*(f.r+S.len*.7),y:f.y+s*(f.r+S.len*.7),n:4,col:'#ffd27a',i:f.i});
      }
    }else{S.rev=Math.max(0,S.rev-DT*1.1);S.heat=Math.max(0,S.heat-DT)}
  },
  hurt(f,src,dmg,m){
    if(dmg>=f.max*.15){
      f.s.stall=.6;f.s.rev*=.4;
      const c=Math.cos(f.s.an),s=Math.sin(f.s.an);                                                                   // kicked loose
      m.events.push({k:'fx',n:'sparks',x:f.x+c*(f.r+f.s.len*.5),y:f.y+s*(f.r+f.s.len*.5),num:10,col:'#d7dde2',lo:80,hi:240,life:.28,i:f.i});
      m.events.push({k:'fx',n:'smoke',x:f.x,y:f.y-f.r*.6,num:4,col:'#5a534c',i:f.i});
      m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+14,life:.26,col:'#ffd27a',w:2,i:f.i});
      m.knock(f,src);
    }
  }};

// Roomba: bounces off walls in a new direction each time and rams. Whatever the rival leaves lying about within reach
// of its vacuum (shots, minions, mines, paint, webs, thorns, trails...) is swallowed and turned into health, and a
// rival inside the suction is drawn towards it.
// Other packs can make their own floor litter edible by adding the name of the list in their f.s here.
const P5_FLOOR={points:['mines','trail','vents','boxes','im','tu'],lines:['webs','thorns']};
BEHAVE.roomba={
  init(f){f.s.eat=0;f.s.got=0;f.s.rad=f.r+30},
  bounce(f,m,x,y,nx,ny){
    const a=Math.atan2(ny,nx)+(m.rnd()-.5)*2.3;
    f.vx=Math.cos(a)*f.speed;f.vy=Math.sin(a)*f.speed;
  },
  tick(f,e,m){
    const S=f.s,R=f.r+30+8*f.sig;
    S.rad=R;
    if(S.got>0)S.got-=DT;
    if(!e.gone&&e.stunT<=0&&gap(e,f)<R+e.r*.5){             // the suction bends the rival's path towards it
      const d=gap(e,f)||1,pull=(240+170*f.sig)*DT;
      e.vx+=(f.x-e.x)/d*pull;e.vy+=(f.y-e.y)/d*pull;m.renorm(e);
    }
    if(S.eat>0){S.eat-=DT;return}
    let ate=0;
    const B=m.bullets,N=m.minions,P=m.paint,es=e.s||{};
    for(let i=B.length-1;i>=0&&!ate;i--){                  // a shot is swallowed about half the time; the rest get through
      const q=B[i];
      if(q.own===f.i||q.p5||Math.hypot(q.x-f.x,q.y-f.y)>=R)continue;
      if(m.rnd()<.5){B.splice(i,1);ate=1}else q.p5=1;
    }
    for(let i=N.length-1;i>=0&&!ate;i--)if(N[i].own!==f.i&&Math.hypot(N[i].x-f.x,N[i].y-f.y)<R){N[i].hp=0;N[i].life=0;ate=1}
    for(const k of P5_FLOOR.points){
      const A=es[k];
      if(ate||!Array.isArray(A))continue;
      let n=0;
      for(let i=A.length-1;i>=0&&n<8;i--){const q=A[i];if(q&&Math.hypot(q.x-f.x,q.y-f.y)<R){A.splice(i,1);n++}}
      if(n)ate=1;
    }
    if(!ate&&Array.isArray(es.arrows))for(let i=es.arrows.length-1;i>=0&&!ate;i--){const q=es.arrows[i];if(q&&q.stuck&&Math.hypot(q.x-f.x,q.y-f.y)<R){es.arrows.splice(i,1);ate=1}}
    for(const k of P5_FLOOR.lines){
      const A=es[k];
      if(ate||!Array.isArray(A))continue;
      for(let i=A.length-1;i>=0&&!ate;i--){
        const q=A[i];if(!q)continue;
        const hit=q.x1!==undefined?distPS(f.x,f.y,q.x1,q.y1,q.x2,q.y2)<f.r+6:distPS(f.x,f.y,q.x,q.y,q.tx,q.ty)<R*.8;
        if(hit){A.splice(i,1);ate=1}
      }
    }
    if(!ate){
      let n=0;
      const x0=Math.max(0,((f.x-R)/PC)|0),x1=Math.min(GP-1,((f.x+R)/PC)|0),y0=Math.max(0,((f.y-R)/PC)|0),y1=Math.min(GP-1,((f.y+R)/PC)|0);
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(P[y*GP+x]===e.i&&Math.hypot((x+.5)*PC-f.x,(y+.5)*PC-f.y)<R){P[y*GP+x]=-1;n++}
      if(n>=2)ate=1;
    }
    if(ate){
      S.eat=.5-.08*f.sig;S.got=.35;
      m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:R,r:f.r,life:.3,col:'#bfe6c9',w:2.2,i:f.i});                      // gulp
      m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:5,col:'#9be86a',jit:f.r,i:f.i});
      const h=Math.min(f.max*(.03+.015*f.sig),f.max-f.hp);
      if(h>.05){f.hp+=h;m.events.push({k:'heal',x:f.x,y:f.y,dmg:h,i:f.i})}
    }
  },
  touch:f=>FIGHTERS.roomba.dmg*(1+.12*f.sig),
  dealt(f,v,dmg,m){m.knock(v,f)}};

// ---------- art ----------
// Machines, drawn like everything else here: a gold-ringed medallion with an ivory crest. What sets this pack apart is
// its light: neon cyan, magenta and red against the dark stone. All of it draws with g, the current context.
const P5={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',
  EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',STEEL:typeof STEEL!=='undefined'?STEEL:'#d7dde2',STEEL_LO:typeof STEEL_LO!=='undefined'?STEEL_LO:'#8b959d',
  GUN:'#3b4248',        // gunmetal: turret bodies, drone hulls, housings
  CYAN:'#55e6ff',MAGENTA:'#ff4fd8',RED:'#ff5a4f',LIME:'#d8ff5a',
};
const p5now=()=>typeof NOW!=='undefined'?NOW:0;
const p5disc=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,P5_TAU)};
function p5rr(x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h)}
// a soft round glow; rgb is an "r,g,b" triple
function p5glow(x,y,r,rgb,a){
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p5disc(x,y,r);g.fill();
}
// stroke the current path as a solid rod: dark edge underneath, the material on top
function p5rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P5.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
function p5seg(x1,y1,x2,y2,col,w){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);p5rod(col,w)}
// fill the current path and give it the thin dark edge everything solid has
function p5solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P5.EDGE;g.lineWidth=1;g.lineJoin='round';g.stroke()}
// a beam of light between two points: a wide soft glow, a narrower bright one, a white core
function p5beam(x1,y1,x2,y2,rgb,w,a){
  g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);
  g.strokeStyle='rgba('+rgb+','+(.22*a).toFixed(3)+')';g.lineWidth=w*2.6;g.stroke();
  g.strokeStyle='rgba('+rgb+','+(.6*a).toFixed(3)+')';g.lineWidth=w;g.stroke();
  g.strokeStyle='rgba(255,255,255,'+(.95*a).toFixed(3)+')';g.lineWidth=Math.max(.8,w*.32);g.stroke();
}
// additive light from the effects engine, where there is one (the art gallery has none)
function p5lite(x,y,r,col,a){
  if(typeof FX==='undefined'||!FX.glow)return;
  if(!g.globalCompositeOperation)g.globalCompositeOperation='source-over';
  FX.glow(g,x,y,r,col,a);
}
const p5rnd=Math.random;
// a quadcopter seen from above
function p5drone(x,y,rot){
  const c=Math.cos(rot+.785),s=Math.sin(rot+.785),L=5.6;
  p5seg(x-c*L,y-s*L,x+c*L,y+s*L,P5.STEEL_LO,1.3);p5seg(x+s*L,y-c*L,x-s*L,y+c*L,P5.STEEL_LO,1.3);
  g.fillStyle='rgba(215,221,226,.22)';g.strokeStyle='rgba(215,221,226,.7)';g.lineWidth=.6;
  for(const p of [[c,s],[-c,-s],[-s,c],[s,-c]]){p5disc(x+p[0]*L,y+p[1]*L,2.9);g.fill();g.stroke()}
  p5disc(x,y,2.7);p5solid(P5.GUN);
  g.fillStyle=P5.CYAN;p5disc(x,y,1.05);g.fill();
  p5lite(x,y,6,P5.CYAN,.5);
}
// a turret on three legs, barrel along an; left is how much of its life remains (0-1)
function p5turret(x,y,an,left){
  for(let k=0;k<3;k++){const a=k*2.094+.5;p5seg(x,y,x+Math.cos(a)*7,y+Math.sin(a)*7,P5.STEEL_LO,1.3)}
  p5seg(x,y,x+Math.cos(an)*9.5,y+Math.sin(an)*9.5,P5.STEEL,2.1);
  p5disc(x,y,4.4);p5solid(P5.GUN);
  g.strokeStyle=P5.GOLD;g.lineWidth=.9;g.beginPath();g.arc(x,y,3,-1.5708,-1.5708+P5_TAU*Math.max(.02,left));g.stroke();
  g.fillStyle='#ffb347';p5disc(x,y,1.1);g.fill();
}

LOOKS.netrunner={
  crest(fg,bg){                                           // a visor helmet with a lit strip
    g.fillStyle=fg;p5rr(-.46,-.56,.92,1.08,.22);g.fill();
    g.fillStyle=bg;p5rr(-.37,-.2,.74,.26,.08);g.fill();
    g.fillStyle=P5.CYAN;g.fillRect(-.3,-.11,.6,.08);
    g.strokeStyle=bg;g.lineWidth=.045;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(-.25,.22);g.lineTo(-.25,.36);g.lineTo(0,.36);g.moveTo(.25,.2);g.lineTo(.25,.4);g.stroke();
    g.fillStyle=bg;for(const p of [[0,.36],[.25,.4],[-.25,.22]]){g.beginPath();g.arc(p[0],p[1],.05,0,P5_TAU);g.fill()}
    g.strokeStyle=fg;g.lineWidth=.06;g.beginPath();g.moveTo(.3,-.56);g.lineTo(.4,-.76);g.stroke();
  },
  over(f,m){
    for(const q of f.s.pk){                               // data packets: a bright square with a tail of smaller ones
      const sp=Math.hypot(q.vx,q.vy)||1,ux=q.vx/sp,uy=q.vy/sp;
      p5glow(q.x,q.y,10,'85,230,255',.5);
      g.fillStyle='rgba(85,230,255,.55)';
      for(let k=1;k<=3;k++){const z=2.4-k*.5;g.fillRect(q.x-ux*k*5.5-z/2,q.y-uy*k*5.5-z/2,z,z)}
      g.beginPath();g.rect(q.x-3,q.y-3,6,6);p5solid('#d6fbff');
      g.fillStyle='#1c6f86';g.fillRect(q.x-1,q.y-1,2,2);
      p5lite(q.x,q.y,13,P5.CYAN,.6);
    }
  },
  top(f,m){                                               // drawn above both fighters, so the rival's medallion cannot hide it
    const e=m&&m.f?m.f[1-f.i]:null;
    if(f.s.jam>0&&e&&e.hp>0&&!e.gone){                    // the rival, jammed: target brackets and scan lines across it
      const r=e.r+4,x=e.x,y=e.y,t=p5now(),c=r*.45;
      g.strokeStyle='rgba(85,230,255,.95)';g.lineWidth=1.3;g.lineCap='butt';g.lineJoin='miter';g.beginPath();
      for(const sx of [-1,1])for(const sy of [-1,1]){g.moveTo(x+sx*r,y+sy*(r-c));g.lineTo(x+sx*r,y+sy*r);g.lineTo(x+sx*(r-c),y+sy*r)}
      g.stroke();
      g.fillStyle='rgba(85,230,255,.4)';
      for(let k=0;k<3;k++){const yy=y+Math.sin(t*9+k*2.1)*e.r*.75,w=e.r*(1.1+.5*Math.sin(t*17+k));g.fillRect(x-w+Math.sin(t*31+k*4)*3,yy-1,w*2,2)}
      p5lite(x,y,e.r*1.8,P5.CYAN,.25);
    }
  },
  amb(f,e,m,dt){
    const S=f.s,Q=S.pk;
    if(!Q||m.over)return;
    if(Q.length)for(let n=FX.due(f.i,'p5pk',10*Q.length,dt);n>0;n--){   // a packet sheds bits as it flies
      const q=Q[(p5rnd()*Q.length)|0];
      FX.sparks(q.x,q.y,1,p5rnd()<.3?'#ffffff':P5.CYAN,{dir:Math.atan2(-q.vy,-q.vx),spread:.9,lo:10,hi:55,life:.3,size:1});
    }
    if(S.jam>0&&e.hp>0&&!e.gone){
      for(let n=FX.due(f.i,'p5jm',11,dt);n>0;n--){                      // static crawling over the jammed rival
        const a=p5rnd()*P5_TAU,d=e.r*(.3+p5rnd()*.9);
        FX.sparks(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,1,P5.CYAN,{lo:10,hi:70,life:.2,size:1});
      }
      for(let n=FX.due(f.i,'p5jb',5,dt);n>0;n--){const yy=e.y+(p5rnd()-.5)*e.r*1.6,w=e.r*(.5+p5rnd()*.8),ox=(p5rnd()-.5)*8;FX.line(e.x-w+ox,yy,e.x+w+ox,yy,p5rnd()<.5?P5.CYAN:'#ffffff',1.8,.1)}
      if(!f.gone)for(let n=FX.due(f.i,'p5rs',9,dt);n>0;n--){           // the rush: streaks off its back
        const sp=Math.hypot(f.vx,f.vy)||1,bx=-f.vx/sp,by=-f.vy/sp,off=(p5rnd()-.5)*f.r*1.6,x=f.x+bx*f.r*.7-by*off,y=f.y+by*f.r*.7+bx*off,l=10+p5rnd()*14;
        FX.line(x,y,x+bx*l,y+by*l,P5.CYAN,1.1,.2);
      }
    }
  }};

LOOKS.drone={
  crest(fg){                                              // a quadcopter from above
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';g.lineWidth=.1;
    g.beginPath();g.moveTo(-.38,-.38);g.lineTo(.38,.38);g.moveTo(.38,-.38);g.lineTo(-.38,.38);g.stroke();
    g.lineWidth=.07;for(const p of [[-.38,-.38],[.38,-.38],[-.38,.38],[.38,.38]]){g.beginPath();g.arc(p[0],p[1],.2,0,P5_TAU);g.stroke()}
    g.beginPath();g.arc(0,0,.2,0,P5_TAU);g.fill();
    g.fillStyle=P5.CYAN;g.beginPath();g.arc(0,0,.08,0,P5_TAU);g.fill();
  },
  over(f){
    for(const q of f.s.d){
      if(!q.alive)continue;
      g.strokeStyle='rgba(85,230,255,.16)';g.lineWidth=.7;g.beginPath();g.moveTo(f.x,f.y);g.lineTo(q.x,q.y);g.stroke();   // the control link
      p5drone(q.x,q.y,f.s.rot*3+q.a);
    }
  },
  amb(f,e,m,dt){
    const D=f.s.d;
    if(!D||m.over||f.gone)return;
    let dead=0;
    for(const q of D){
      if(!q.alive){dead++;continue}
      if(FX.due(f.i,'p5dr',2.5,dt))FX.embers(q.x,q.y+2,1,P5.CYAN,{life:.3,lo:2,hi:10,grav:30,size:1.1});             // rotor wash
    }
    for(let n=FX.due(f.i,'p5rb',4*dead,dt);n>0;n--){                    // a drone being rebuilt: welding sparks at the pilot
      const a=p5rnd()*P5_TAU;
      FX.sparks(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r,1,'#ffd27a',{dir:a,spread:1.2,lo:30,hi:110,life:.25,grav:200,size:1});
    }
  }};

LOOKS.mech={
  crest(fg,bg){                                           // a walker: cockpit, two weapon pods, two legs
    g.fillStyle=fg;g.strokeStyle=fg;
    g.fillRect(-.24,-.5,.48,.46);
    g.fillRect(-.62,-.4,.28,.34);g.fillRect(.34,-.4,.28,.34);
    g.fillRect(-.36,-.3,.72,.1);
    g.lineWidth=.13;g.lineJoin='miter';g.lineCap='butt';
    g.beginPath();g.moveTo(-.12,-.06);g.lineTo(-.3,.28);g.lineTo(-.24,.58);g.moveTo(.12,-.06);g.lineTo(.3,.28);g.lineTo(.24,.58);g.stroke();
    g.fillRect(-.4,.54,.28,.1);g.fillRect(.12,.54,.28,.1);
    g.fillStyle=bg;g.fillRect(-.16,-.4,.32,.12);
    for(const sx of [-.48,.48]){g.beginPath();g.arc(sx,-.23,.06,0,P5_TAU);g.fill()}
  },
  under(f){                                               // target marks: a crosshair that closes as the missile comes down
    for(const q of f.s.ms){
      const p=Math.min(1,q.t),R=q.r;
      p5glow(q.x,q.y,R,'255,96,64',.1+.25*p);
      g.strokeStyle='rgba(255,120,90,.9)';g.lineWidth=1;g.setLineDash([4,3]);p5disc(q.x,q.y,R);g.stroke();g.setLineDash([]);
      g.lineWidth=1.2;p5disc(q.x,q.y,Math.max(2,R*(1-p)));g.stroke();
      g.beginPath();for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){g.moveTo(q.x+d[0]*R*.55,q.y+d[1]*R*.55);g.lineTo(q.x+d[0]*(R+4),q.y+d[1]*(R+4))}g.stroke();
    }
  },
  back(f){                                                // missile pods on its shoulders
    const r=f.r;
    for(const s of [-1,1]){
      g.beginPath();g.rect(f.x+s*(r+1)-(s<0?6:0),f.y-r*.62,6,r*.7);p5solid(P5.GUN);
      g.fillStyle=P5.RED;for(let k=0;k<2;k++){p5disc(f.x+s*(r+4),f.y-r*.62+r*.7*(.3+.4*k),1.1);g.fill()}
    }
  },
  over(f){                                                // missiles in the air: they climb, then come down on the mark
    for(const q of f.s.ms){
      const p=Math.min(1,q.t),x=q.sx+(q.x-q.sx)*p,gy=q.sy+(q.y-q.sy)*p,h=Math.sin(p*Math.PI)*46,y=gy-h;
      const p2=Math.min(1,p+.04),x2=q.sx+(q.x-q.sx)*p2,y2=q.sy+(q.y-q.sy)*p2-Math.sin(p2*Math.PI)*46,an=Math.atan2(y2-y,x2-x);
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,gy,3.5,2,0,0,P5_TAU);g.fill();           // its shadow on the floor
      const c=Math.cos(an),s=Math.sin(an);
      p5glow(x-c*6,y-s*6,6,'255,170,80',.7);
      p5seg(x-c*4.5,y-s*4.5,x+c*3,y+s*3,P5.STEEL,2.6);
      g.beginPath();g.moveTo(x+c*6.5,y+s*6.5);g.lineTo(x+c*2.5-s*2,y+s*2.5+c*2);g.lineTo(x+c*2.5+s*2,y+s*2.5-c*2);g.closePath();p5solid(P5.RED);
      p5lite(x-c*6,y-s*6,9,'#ffb050',.7);
    }
  },
  amb(f,e,m,dt){
    const M=f.s.ms;
    if(!M||m.over)return;
    for(const q of M){                                     // each missile trails smoke and fire down to its mark
      const p=Math.min(1,q.t),x=q.sx+(q.x-q.sx)*p,y=q.sy+(q.y-q.sy)*p-Math.sin(p*Math.PI)*46;
      for(let n=FX.due(f.i,'p5ms',13,dt);n>0;n--)FX.smoke(x,y,1,'#8a8378',{lo:2,hi:14,life:.45,size:2.6,grav:-8});
      for(let n=FX.due(f.i,'p5mf',9,dt);n>0;n--)FX.embers(x,y,1,'#ffb050',{lo:2,hi:16,life:.3,grav:20,jit:3});
      if(p>.6)for(let n=FX.due(f.i,'p5mk',7,dt);n>0;n--){const a=p5rnd()*P5_TAU;FX.embers(q.x+Math.cos(a)*q.r,q.y+Math.sin(a)*q.r,1,'#ff785a',{life:.3,lo:2,hi:12})}   // the mark heats up
    }
    if(!f.gone)for(let n=FX.due(f.i,'p5st',2.4,dt);n>0;n--)FX.dust(f.x+(p5rnd()-.5)*f.r*1.4,f.y+f.r*.75,1,null,{lo:6,hi:26,life:.45});   // heavy feet
  }};

LOOKS.glitch={
  crest(fg,bg){                                           // a block sliced into three and knocked out of line
    g.fillStyle=fg;
    g.fillRect(-.5,-.5,.84,.28);g.fillRect(-.26,-.16,.84,.3);g.fillRect(-.56,.2,.84,.28);
    g.fillStyle=P5.CYAN;g.fillRect(.4,-.5,.12,.28);
    g.fillStyle=P5.MAGENTA;g.fillRect(-.42,-.16,.12,.3);
    g.fillStyle=bg;g.fillRect(.04,-.08,.18,.14);g.fillRect(-.3,.28,.14,.1);
  },
  under(f){                                               // the copies it leaves: a medallion's outline, split into colours
    const life=f.s.life||2.4,t=p5now();
    for(const q of f.s.im){
      const a=Math.max(.15,1-q.t/life),j=Math.sin(t*23+q.x)*1.2;
      g.globalAlpha=a*.85;
      g.lineWidth=1.6;g.strokeStyle=P5.CYAN;p5disc(q.x-2+j,q.y,q.r);g.stroke();
      g.strokeStyle=P5.MAGENTA;p5disc(q.x+2-j,q.y,q.r);g.stroke();
      g.fillStyle='rgba(255,255,255,.14)';
      for(let k=-1;k<=1;k++)g.fillRect(q.x-q.r+k*3,q.y+k*q.r*.5-2,q.r*2,3.5);
      g.globalAlpha=1;
    }
  },
  back(f){                                                // its own edges never quite line up
    const j=Math.sin(p5now()*29)*1.1+1.6;
    g.lineWidth=1.3;g.strokeStyle='rgba(85,230,255,.75)';p5disc(f.x-j,f.y,f.r+.6);g.stroke();
    g.strokeStyle='rgba(255,79,216,.75)';p5disc(f.x+j,f.y,f.r+.6);g.stroke();
    if(f.s.fresh>0)p5lite(f.x,f.y,f.r*2,P5.MAGENTA,.5*Math.min(1,f.s.fresh/.5));        // just landed: it hits harder
  },
  amb(f,e,m,dt){
    const S=f.s,Q=S.im;
    if(!Q||m.over)return;
    if(Q.length){
      for(let n=FX.due(f.i,'p5im',4*Q.length,dt);n>0;n--){              // the copies flicker
        const q=Q[(p5rnd()*Q.length)|0],a=p5rnd()*P5_TAU;
        FX.sparks(q.x+Math.cos(a)*q.r,q.y+Math.sin(a)*q.r,1,p5rnd()<.5?P5.CYAN:P5.MAGENTA,{lo:6,hi:36,life:.26,size:1});
      }
      for(let n=FX.due(f.i,'p5ib',1.6*Q.length,dt);n>0;n--){const q=Q[(p5rnd()*Q.length)|0],yy=q.y+(p5rnd()-.5)*q.r*1.5,ox=(p5rnd()-.5)*10;FX.line(q.x-q.r+ox,yy,q.x+q.r+ox,yy,p5rnd()<.5?P5.CYAN:P5.MAGENTA,1.6,.1)}
    }
    if(f.gone)return;
    for(let n=FX.due(f.i,'p5gb',1.6,dt);n>0;n--){const yy=f.y+(p5rnd()-.5)*f.r*1.5,ox=(p5rnd()-.5)*12;FX.line(f.x-f.r+ox,yy,f.x+f.r+ox,yy,p5rnd()<.5?P5.CYAN:P5.MAGENTA,1.6,.09)}   // a torn scan line now and then
    if(S.fresh>0)for(let n=FX.due(f.i,'p5fr',14,dt);n>0;n--){const a=p5rnd()*P5_TAU;FX.sparks(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r,1,P5.MAGENTA,{dir:a,spread:1,lo:20,hi:90,life:.24})}
  }};

LOOKS.laser={
  crest(fg){                                              // a lens, and the beam leaving it
    g.strokeStyle=fg;g.fillStyle=fg;g.lineCap='round';
    g.lineWidth=.1;g.beginPath();g.arc(-.14,0,.42,0,P5_TAU);g.stroke();
    g.beginPath();g.arc(-.14,0,.21,0,P5_TAU);g.fill();
    g.beginPath();g.moveTo(.3,-.07);g.lineTo(.74,-.03);g.lineTo(.74,.03);g.lineTo(.3,.07);g.closePath();g.fill();
    g.lineWidth=.05;g.beginPath();
    for(const a of [2.0,2.6,3.68,4.28]){g.moveTo(-.14+Math.cos(a)*.5,Math.sin(a)*.5);g.lineTo(-.14+Math.cos(a)*.6,Math.sin(a)*.6)}
    g.stroke();
    g.fillStyle=P5.RED;g.beginPath();g.arc(-.14,0,.1,0,P5_TAU);g.fill();
  },
  under(f){
    const S=f.s;
    if(S.mode===1){                                       // taking aim: a thin line that hardens as the charge builds
      const p=Math.max(0,Math.min(1,1-S.t/.8));
      g.strokeStyle='rgba(255,90,79,'+(.35+.5*p).toFixed(3)+')';g.lineWidth=.8+p;g.setLineDash(S.t>.22?[5,4]:[]);
      g.beginPath();g.moveTo(f.x,f.y);g.lineTo(S.x2,S.y2);g.stroke();g.setLineDash([]);
    }else if(S.mode===2){                                 // the beam
      p5beam(f.x,f.y,S.x2,S.y2,'255,70,60',5+2*f.sig,1);
      p5glow(S.x2,S.y2,14,'255,120,90',.7);
      p5lite(S.x2,S.y2,20+4*Math.sin(p5now()*40),'#ff7a5a',.8);
    }
  },
  over(f){                                                // the emitter, pointing where it will fire
    const S=f.s,a=S.mode?S.an:f.aim,c=Math.cos(a),s=Math.sin(a),r=f.r;
    p5seg(f.x+c*(r-2),f.y+s*(r-2),f.x+c*(r+7),f.y+s*(r+7),P5.GUN,4.2);
    g.strokeStyle=P5.GOLD;g.lineWidth=1;g.beginPath();g.moveTo(f.x+c*(r+3)-s*3,f.y+s*(r+3)+c*3);g.lineTo(f.x+c*(r+3)+s*3,f.y+s*(r+3)-c*3);g.stroke();
    const hot=S.mode===1?Math.max(0,1-S.t/.8):S.mode===2?1:0;
    if(hot>0){p5glow(f.x+c*(r+8),f.y+s*(r+8),5+9*hot,'255,90,79',.75);p5lite(f.x+c*(r+8),f.y+s*(r+8),8+14*hot,'#ff5a4f',.3+.5*hot)}
    g.fillStyle=hot>0?'#ffd9d2':P5.RED;p5disc(f.x+c*(r+8),f.y+s*(r+8),2);g.fill();
  },
  amb(f,e,m,dt){
    const S=f.s;
    if(!S.mode||m.over||f.gone)return;
    const c=Math.cos(S.an),s=Math.sin(S.an),ex=f.x+c*(f.r+8),ey=f.y+s*(f.r+8);
    if(S.mode===1){                                        // charging: light gathers at the lens
      for(let n=FX.due(f.i,'p5lc',16,dt);n>0;n--){const a=p5rnd()*P5_TAU,d=16+p5rnd()*22;FX.seek(ex+Math.cos(a)*d,ey+Math.sin(a)*d,-2,1,'#ff6a5a',ex,ey,{jit:1,life:.5,size:1.3})}
      return;
    }
    const L=Math.hypot(S.x2-f.x,S.y2-f.y);                 // firing: the wall spits sparks, the air along the beam glows
    for(let n=FX.due(f.i,'p5lw',22,dt);n>0;n--)FX.sparks(S.x2,S.y2,1,p5rnd()<.4?'#ffffff':'#ffa080',{dir:S.an+Math.PI,spread:2.4,lo:50,hi:190,life:.3,grav:140});
    for(let n=FX.due(f.i,'p5lb',12,dt);n>0;n--){const t=p5rnd()*L;FX.embers(f.x+c*t,f.y+s*t,1,'#ff6a5a',{life:.35,lo:4,hi:22,jit:5})}
    for(let n=FX.due(f.i,'p5ls',3,dt);n>0;n--)FX.smoke(S.x2,S.y2,1,'#6a5a56',{lo:6,hi:22});
    if(!e.gone&&e.hp>0&&distPS(e.x,e.y,f.x,f.y,S.x2,S.y2)<e.r+2+2*f.sig)for(let n=FX.due(f.i,'p5lh',16,dt);n>0;n--){   // the rival, burning in it
      FX.embers(e.x,e.y,1,p5rnd()<.5?'#ffd0a0':'#ff6a3a',{jit:e.r*1.3,life:.45,lo:8,hi:40});
      if(p5rnd()<.2)FX.smoke(e.x,e.y-e.r*.5,1,null,{lo:4,hi:16});
    }
  }};

LOOKS.railgun={
  crest(fg){                                              // two rails, a breech, and the slug between them
    g.fillStyle=fg;
    g.fillRect(-.64,-.34,.24,.68);
    g.fillRect(-.4,-.3,1.06,.11);g.fillRect(-.4,.19,1.06,.11);
    g.beginPath();g.moveTo(.0,0);g.lineTo(.2,-.11);g.lineTo(.54,0);g.lineTo(.2,.11);g.closePath();g.fill();
    g.fillStyle=P5.CYAN;g.fillRect(-.36,-.035,.3,.07);
  },
  under(f){
    const S=f.s;
    if(S.mode===1){                                       // the aiming line: broken while it follows, solid once it has locked
      const locked=S.t<=S.lock;
      g.strokeStyle=locked?'rgba(235,250,255,.95)':'rgba(120,200,255,.55)';g.lineWidth=locked?1.5:.8;g.setLineDash(locked?[]:[2,5]);
      g.beginPath();g.moveTo(S.x1,S.y1);g.lineTo(S.x2,S.y2);g.stroke();g.setLineDash([]);
    }
    if(S.tr>0)p5beam(S.x1,S.y1,S.x2,S.y2,'120,200,255',7,Math.min(1,S.tr/.2));   // the shot, for an instant
  },
  over(f){                                                // the gun: two long rails bound with coils
    const S=f.s,a=S.mode?S.an:f.aim,c=Math.cos(a),s=Math.sin(a),r=f.r;
    for(const k of [-1,1])p5seg(f.x+c*(r-2)-s*2.4*k,f.y+s*(r-2)+c*2.4*k,f.x+c*(r+17)-s*2.4*k,f.y+s*(r+17)+c*2.4*k,P5.STEEL,1.5);
    for(const d of [4,10]){g.beginPath();g.moveTo(f.x+c*(r+d)-s*4,f.y+s*(r+d)+c*4);g.lineTo(f.x+c*(r+d)+s*4,f.y+s*(r+d)-c*4);p5rod(P5.GOLD,1.6)}
    if(S.mode===1){p5glow(f.x+c*(r+9),f.y+s*(r+9),4+8*Math.max(0,1-S.t),'120,200,255',.7);p5lite(f.x+c*(r+9),f.y+s*(r+9),7+15*Math.max(0,1-S.t),'#78c8ff',.3+.5*Math.max(0,1-S.t))}
  },
  amb(f,e,m,dt){
    const S=f.s;
    if(S.mode!==1||m.over||f.gone)return;
    const c=Math.cos(S.an),s=Math.sin(S.an),mx=f.x+c*(f.r+9),my=f.y+s*(f.r+9),p=Math.max(0,1-S.t);
    for(let n=FX.due(f.i,'p5rc',8+16*p,dt);n>0;n--){const a=p5rnd()*P5_TAU,d=14+p5rnd()*20;FX.seek(mx+Math.cos(a)*d,my+Math.sin(a)*d,-2,1,'#9fd4ff',mx,my,{jit:1,life:.5,size:1.2})}   // the capacitors fill
    if(S.t<=S.lock){                                       // locked: sparks crawl along the rails
      for(let n=FX.due(f.i,'p5rl',14,dt);n>0;n--){const d=f.r+p5rnd()*17,k=p5rnd()<.5?-2.4:2.4;FX.sparks(f.x+c*d-s*k,f.y+s*d+c*k,1,'#eaf6ff',{lo:10,hi:60,life:.16,size:1})}
    }
  }};

LOOKS.engineer={
  crest(fg,bg){                                           // a cog
    g.fillStyle=fg;g.beginPath();
    for(let k=0;k<8;k++){
      const a=k/8*P5_TAU;
      g.lineTo(Math.cos(a-.25)*.46,Math.sin(a-.25)*.46);g.lineTo(Math.cos(a-.15)*.68,Math.sin(a-.15)*.68);
      g.lineTo(Math.cos(a+.15)*.68,Math.sin(a+.15)*.68);g.lineTo(Math.cos(a+.25)*.46,Math.sin(a+.25)*.46);
    }
    g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.arc(0,0,.22,0,P5_TAU);g.fill();
    g.fillStyle=fg;g.beginPath();g.arc(0,0,.08,0,P5_TAU);g.fill();
  },
  arm(f,A,x1,y1,x2,y2,an){                                // a wrench: steel shaft, open jaw
    p5seg(x1,y1,x2,y2,P5.STEEL,2.6);
    g.beginPath();g.arc(x2+Math.cos(an)*2.6,y2+Math.sin(an)*2.6,4,an+.85,an+P5_TAU-.85);p5rod(P5.STEEL,2.4);
  },
  under(f){for(const q of f.s.tu)p5turret(q.x,q.y,q.an,q.life/(9+2*f.sig))},
  amb(f,e,m,dt){
    const T=f.s.tu;
    if(!T||m.over)return;
    for(const q of T){
      if(q.t<.18&&FX.due(f.i,'p5tw',14,dt))FX.sparks(q.x+Math.cos(q.an)*9.5,q.y+Math.sin(q.an)*9.5,1,'#ffb347',{lo:4,hi:26,life:.14,size:1});   // about to fire: the muzzle warms
      if(q.life<2.5){                                      // nearly worn out: it smokes and spits
        if(FX.due(f.i,'p5ts',4,dt))FX.smoke(q.x,q.y-3,1,'#5a534c',{lo:4,hi:14,life:.6,size:3});
        if(FX.due(f.i,'p5tk',3,dt))FX.sparks(q.x,q.y,1,'#ffd27a',{lo:30,hi:110,life:.22,grav:200,size:1});
      }
    }
  }};

LOOKS.battery={
  crest(fg,bg){                                           // a cell with a bolt through it
    g.fillStyle=fg;p5rr(-.34,-.48,.68,1.08,.1);g.fill();g.fillRect(-.14,-.64,.28,.2);
    g.fillStyle=bg;g.beginPath();g.moveTo(.1,-.32);g.lineTo(-.2,.1);g.lineTo(-.03,.1);g.lineTo(-.1,.46);g.lineTo(.2,0);g.lineTo(.03,0);g.closePath();g.fill();
  },
  back(f){                                                // the charge gauge: eight cells round the rim, lit as it fills
    const ch=f.s.ch||0,n=8,lit=Math.round(ch*n),R=f.r+4.5;
    if(ch>=.99)p5glow(f.x,f.y,f.r+16,'216,255,90',.45+.2*Math.sin(p5now()*18));
    if(ch>.05)p5lite(f.x,f.y,f.r*(1.5+.5*ch),P5.LIME,.12+.4*ch*(.8+.2*Math.sin(p5now()*18)));
    g.lineCap='butt';
    for(let k=0;k<n;k++){
      const a0=-1.5708+k/n*P5_TAU+.07,a1=-1.5708+(k+1)/n*P5_TAU-.07;
      g.beginPath();g.arc(f.x,f.y,R,a0,a1);g.strokeStyle=P5.EDGE;g.lineWidth=4.6;g.stroke();
      g.strokeStyle=k<lit?P5.LIME:'#4a5340';g.lineWidth=3;g.stroke();
    }
  },
  amb(f,e,m,dt){
    const ch=f.s.ch||0;
    if(ch<.05||m.over||f.gone)return;
    for(let n=FX.due(f.i,'p5bc',2+12*ch,dt);n>0;n--){     // the stored charge leaks sparks, more as the cells fill
      const a=p5rnd()*P5_TAU;
      FX.sparks(f.x+Math.cos(a)*(f.r+4),f.y+Math.sin(a)*(f.r+4),1,p5rnd()<.3?'#ffffff':P5.LIME,{dir:a,spread:1.6,lo:20,hi:90,life:.2,size:1});
    }
    if(ch>=.99){                                           // full: arcs jump across the rim
      for(let n=FX.due(f.i,'p5ba',7,dt);n>0;n--){
        const a=p5rnd()*P5_TAU,b=a+.5+p5rnd()*.9,R=f.r+5,mx=f.x+Math.cos((a+b)/2)*(R+3+p5rnd()*5),my=f.y+Math.sin((a+b)/2)*(R+3+p5rnd()*5);
        FX.line(f.x+Math.cos(a)*R,f.y+Math.sin(a)*R,mx,my,'#f4ffd0',1.3,.1);FX.line(mx,my,f.x+Math.cos(b)*R,f.y+Math.sin(b)*R,'#f4ffd0',1.3,.1);
      }
      for(let n=FX.due(f.i,'p5bs',3,dt);n>0;n--){const a=p5rnd()*P5_TAU;FX.stars(f.x+Math.cos(a)*(f.r+6),f.y+Math.sin(a)*(f.r+6),1,P5.LIME,{lo:0,hi:10,size:3,life:.35})}
    }
  }};

LOOKS.chainsaw={
  crest(fg,bg){                                           // the saw: engine block, guide bar, teeth
    g.rotate(-.5);
    g.fillStyle=fg;g.strokeStyle=fg;
    g.fillRect(-.66,-.24,.4,.5);
    g.lineWidth=.07;g.lineJoin='round';g.beginPath();g.moveTo(-.6,-.24);g.lineTo(-.6,-.42);g.lineTo(-.3,-.42);g.lineTo(-.3,-.24);g.stroke();
    p5rr(-.3,-.15,.98,.3,.15);g.fill();
    g.beginPath();
    for(let x=-.16;x<.5;x+=.17){g.moveTo(x,-.15);g.lineTo(x+.085,-.27);g.lineTo(x+.17,-.15);g.moveTo(x,.15);g.lineTo(x+.085,.27);g.lineTo(x+.17,.15)}
    g.fill();
    g.fillStyle=bg;g.fillRect(-.12,-.03,.62,.06);
    g.beginPath();g.arc(-.46,.01,.08,0,P5_TAU);g.fill();
  },
  back(f){                                                // the bar, pointing at the rival; the teeth run faster as it revs
    const S=f.s,r=f.r,L=S.len||22,rev=S.rev||0,ph=(p5now()*(12+70*rev))%4;
    g.save();g.translate(f.x,f.y);g.rotate(S.an||0);
    if(rev>.05)p5glow(r+L*.6,0,8+8*rev,'255,190,90',.25+.4*rev);
    if((S.heat||0)>1.2)p5lite(r+L*.55,0,10+6*Math.min(1,S.heat-1.2),'#ff5a2a',.35+.4*Math.min(1,S.heat-1.2));   // the chain glows as it is about to jam
    g.fillStyle=P5.STEEL_LO;g.strokeStyle=P5.EDGE;g.lineWidth=.5;g.lineJoin='round';g.beginPath();
    for(let x=r-2+ph;x<r+L-3;x+=4){g.moveTo(x,-3.2);g.lineTo(x+1.6,-5.6);g.lineTo(x+3.2,-3.2);g.moveTo(x,3.2);g.lineTo(x+1.6,5.6);g.lineTo(x+3.2,3.2)}
    g.fill();g.stroke();
    p5rr(r-4,-3.4,L+4,6.8,3.4);p5solid(S.stall>0?P5.STEEL_LO:P5.STEEL);
    g.strokeStyle='rgba(9,11,13,.6)';g.lineWidth=1;g.beginPath();g.moveTo(r,0);g.lineTo(r+L-4,0);g.stroke();
    g.fillStyle=P5.GOLD;p5disc(r+L-3.4,0,1.2);g.fill();
    g.restore();
  },
  over(f){                                                // stalled: a puff of smoke off the engine
    if(f.s.stall>0){const p=Math.max(0,1-f.s.stall/.6);p5glow(f.x-f.r*.5,f.y-f.r-4-8*p,5+6*p,'200,200,200',.5*(1-p))}
  },
  amb(f,e,m,dt){
    const S=f.s;
    if(S.an===undefined||m.over||f.gone)return;
    const c=Math.cos(S.an),s=Math.sin(S.an),rev=S.rev||0,L=S.len||22,ex=f.x-c*f.r*.55,ey=f.y-s*f.r*.55;
    if(S.stall>0){                                         // stalled: the engine smokes
      for(let n=FX.due(f.i,'p5cs',7,dt);n>0;n--)FX.smoke(ex,ey,1,'#5a534c',{lo:6,hi:22,jit:f.r*.5});
      for(let n=FX.due(f.i,'p5ck',2,dt);n>0;n--)FX.sparks(f.x+c*(f.r+L*.4),f.y+s*(f.r+L*.4),1,'#ffd27a',{lo:20,hi:90,life:.2,grav:200,size:1});
      return;
    }
    if(S.on>0&&!e.gone){                                   // cutting: sparks pour off the bar, faster as it revs
      const bx=f.x+c*(f.r+L*.7),by=f.y+s*(f.r+L*.7);
      for(let n=FX.due(f.i,'p5cc',12+30*rev,dt);n>0;n--)FX.sparks(bx,by,1,p5rnd()<.25?'#ffffff':'#ffd27a',{dir:S.an+(p5rnd()<.5?1.9:-1.9),spread:1.1,lo:70,hi:180+140*rev,life:.3,grav:240});
      for(let n=FX.due(f.i,'p5cd',2+5*rev,dt);n>0;n--)FX.shards(bx,by,1,e.col,{lo:40,hi:130,size:1.7});
      if(S.heat>1.2)for(let n=FX.due(f.i,'p5ch',10,dt);n>0;n--)FX.embers(f.x+c*(f.r+p5rnd()*L),f.y+s*(f.r+p5rnd()*L),1,'#ff6a3a',{life:.4,lo:4,hi:22});
    }
    if(rev>.08)for(let n=FX.due(f.i,'p5ce',1+6*rev,dt);n>0;n--)FX.smoke(ex,ey,1,'#6b6258',{lo:8,hi:26,life:.5,size:2.6,dir:S.an+Math.PI,spread:1});   // exhaust
  }};

LOOKS.roomba={
  crest(fg,bg){                                           // the robot from above: bumper, button, dust bin
    g.fillStyle=fg;g.beginPath();g.arc(0,0,.62,0,P5_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.06;g.lineCap='round';g.beginPath();g.arc(0,0,.49,Math.PI*1.12,Math.PI*1.88);g.stroke();
    g.fillStyle=bg;g.beginPath();g.arc(0,.02,.2,0,P5_TAU);g.fill();g.fillRect(-.28,.36,.56,.07);
    g.fillStyle='#7ddc5a';g.beginPath();g.arc(0,.02,.09,0,P5_TAU);g.fill();
  },
  under(f){                                               // the reach of the vacuum, and the air being drawn in
    const R=f.s.rad||f.r+30,t=p5now();
    g.strokeStyle='rgba(205,218,228,.3)';g.lineWidth=.9;g.setLineDash([3,5]);g.lineDashOffset=t*24;p5disc(f.x,f.y,R);g.stroke();g.setLineDash([]);g.lineDashOffset=0;
    g.strokeStyle='rgba(205,218,228,.38)';g.lineWidth=1;g.lineCap='round';
    for(let k=0;k<4;k++){
      const u=1-((t*.9+k*.25)%1),a=k*1.571+t*1.3,r0=f.r+2+(R-f.r-2)*u;
      g.beginPath();g.arc(f.x,f.y,r0,a,a+.55);g.stroke();
    }
    if(f.s.got>0)p5glow(f.x,f.y,f.r+12,'125,220,90',.5*Math.min(1,f.s.got/.35));
  },
  back(f){                                                // the bumper, on the side it is heading towards
    const a=Math.atan2(f.vy,f.vx),R=f.r+2.6;
    g.lineCap='round';g.beginPath();g.arc(f.x,f.y,R,a-1.15,a+1.15);g.strokeStyle=P5.EDGE;g.lineWidth=5.6;g.stroke();
    g.strokeStyle='#59626b';g.lineWidth=3.8;g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.8;g.beginPath();g.arc(f.x,f.y,R+1.2,a-1,a+1);g.stroke();
    if(f.s.got>0)p5lite(f.x,f.y,f.r*2,'#7ddc5a',.5*Math.min(1,f.s.got/.35));
  },
  amb(f,e,m,dt){
    const S=f.s,R=S.rad||f.r+30;
    if(m.over||f.gone)return;
    for(let n=FX.due(f.i,'p5va',8,dt);n>0;n--){           // dust off the floor, drawn into the vacuum
      const a=p5rnd()*P5_TAU,d=R*(.65+p5rnd()*.35);
      FX.seek(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,f.i,1,'#cfd8e0',0,0,{jit:1,life:.7,size:1});
    }
    if(!e.gone&&e.hp>0&&e.stunT<=0&&Math.hypot(e.x-f.x,e.y-f.y)<R+e.r*.5){   // the rival is in the suction: it streams towards the Roomba
      const d=Math.hypot(f.x-e.x,f.y-e.y)||1,ux=(f.x-e.x)/d,uy=(f.y-e.y)/d;
      for(let n=FX.due(f.i,'p5vr',9,dt);n>0;n--){
        const off=(p5rnd()-.5)*e.r*1.6,x=e.x+ux*e.r*.8-uy*off,y=e.y+uy*e.r*.8+ux*off;
        if(p5rnd()<.5)FX.seek(x,y,f.i,1,'#eef3f6',0,0,{jit:1,life:.6,size:1.1});else{const l=8+p5rnd()*12;FX.line(x,y,x+ux*l,y+uy*l,'#eef3f6',1,.18)}
      }
    }
    if(S.got>0)for(let n=FX.due(f.i,'p5vg',12,dt);n>0;n--){const a=p5rnd()*P5_TAU;FX.stars(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r,1,'#9be86a',{lo:4,hi:30,size:2.6,life:.4,grav:-30})}
  }};
