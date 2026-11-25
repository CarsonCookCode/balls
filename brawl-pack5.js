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
FIGHTERS.battery  ={name:'Battery',    color:'#8fbf2f',hp:100,speed:185,spin:0,  dmg:20.72,cd:.5, arms:[],desc:'Stores every hit it takes and gives it back on the next touch.',sig:['Bigger cells','A stronger discharge'],sfx:{hit:'punch'}};
FIGHTERS.chainsaw ={name:'Chainsaw',   color:'#c9562e',hp:100,speed:165,spin:0,  dmg:7.49, cd:.5, arms:[],desc:'Cuts faster the longer it stays on you. A hard hit knocks it loose.',sig:['Bigger engine','Revs up sooner and cuts faster'],sfx:{hit:'tin'}};
FIGHTERS.roomba   ={name:'Roomba',     color:'#8e9aa6',hp:100,speed:175,spin:0,  dmg:14.75,cd:.45,arms:[],desc:'Bumps and turns. Its vacuum eats traps, shots and minions to heal.',sig:['Stronger suction','Pulls harder, reaches further and heals more'],sfx:{hit:'thump'}};
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
function p5shot(f,m,x,y,an,d){m.bullets.push({x,y,vx:Math.cos(an)*330,vy:Math.sin(an)*330,own:f.i,d});m.events.push({k:'shot',x,y,i:f.i})}

// Netrunner: a slow packet that follows the rival. A weapon can swat it. If it lands, the rival's weapons and touch are
// jammed for a moment, its heading is scrambled, and the netrunner rushes in to hit it while it cannot hit back.
BEHAVE.netrunner={
  init(f){f.s.t=1;f.s.pk=[];f.s.jam=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.netrunner,S=f.s,Q=S.pk;
    if(S.jam>0){
      S.jam-=DT;
      if(!e.gone){e.cd=Math.max(e.cd,.15);e.xcd=Math.max(e.xcd,.15);p5seek(f,e)}
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
        if(q.re<=0){q.alive=1;q.t=.8;q.burst=0;m.events.push({k:'spawn',x:f.x,y:f.y,i:f.i})}
        continue;
      }
      const dx=tx-q.x,dy=ty-q.y,d=Math.hypot(dx,dy)||1,st=Math.min(d,420*DT);
      q.x+=dx/d*st;q.y+=dy/d*st;
      if(!e.gone&&(Math.hypot(q.x-e.x,q.y-e.y)<e.r+5||p5cut(e,q.x,q.y,5))){
        q.alive=0;q.re=4.5/f.spdMul;m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});continue;
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
      }
    }
    for(let i=M.length-1;i>=0;i--){
      const q=M[i];
      q.t+=DT;
      if(q.t>=1){
        m.events.push({k:'boom',x:q.x,y:q.y,i:f.i});
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
      const a=m.rnd()*P5_TAU,d=e.r+f.r+14+m.rnd()*24;
      f.x=p5clamp(e.x+Math.cos(a)*d,f.r);f.y=p5clamp(e.y+Math.sin(a)*d,f.r);
      p5seek(f,e);f.gone=true;S.blink=.2;S.fresh=.9;
      m.events.push({k:'appear',x:f.x,y:f.y,i:f.i});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;
      if(q.t>.35&&!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+q.r*.7){
        m.events.push({k:'burst',x:q.x,y:q.y,n:10,i:f.i});
        m.hurt(e,D.dmg*.8*f.dmgMul*rage,f);Q.splice(i,1);continue;
      }
      if(q.t>life)Q.splice(i,1);
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
      if(S.t<=0){S.mode=2;S.t=.55+.18*f.sig;S.cd=0;m.events.push({k:'zap',x:f.x,y:f.y,x2:S.x2,y2:S.y2,i:f.i})}
      return;
    }
    S.cd-=DT;
    if(S.cd<=0&&!e.gone&&distPS(e.x,e.y,f.x,f.y,S.x2,S.y2)<e.r+2+2*f.sig){S.cd=.1;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
    if(S.t<=0){S.mode=0;S.t=D.cd/f.spdMul}
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
    if(S.t<=0){
      S.mode=0;S.t=D.cd*(1-.14*f.sig)/f.spdMul;S.tr=.2;
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});m.events.push({k:'burst',x:f.x+c*f.r,y:f.y+s*f.r,n:8,col:'#bfe6ff',i:f.i});
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
      if(T.length<2+f.sig&&!near){S.t=(2.4-.3*f.sig)/f.spdMul;T.push({x:p5clamp(f.x,8),y:p5clamp(f.y,8),t:.7,life:9+2*f.sig,an:f.aim});m.events.push({k:'mine',x:f.x,y:f.y,i:f.i})}
    }
    for(let i=T.length-1;i>=0;i--){
      const q=T[i];
      q.life-=DT;
      if(!e.gone)q.an=Math.atan2(e.y-q.y,e.x-q.x);
      if(q.life<=0||(!e.gone&&(Math.hypot(q.x-e.x,q.y-e.y)<e.r+7||p5cut(e,q.x,q.y,6)))){m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});T.splice(i,1);continue}
      q.t-=DT;
      if(q.t<=0&&!e.gone){q.t=1.15/(1+.2*f.sig)/f.spdMul;p5shot(f,m,q.x+Math.cos(q.an)*8,q.y+Math.sin(q.an)*8,q.an+(m.rnd()-.5)*.16,D.dmg*.55)}
    }
  }};

// Battery: every direct hit it takes fills its cells (a hit worth a third of its health fills them completely). The
// next time it touches the rival the whole charge goes into them at once.
BEHAVE.battery={
  init(f){f.s.ch=0;f.s.rel=0},
  tick(f){f.s.rel=0},
  hurt(f,src,dmg){f.s.ch=Math.min(1,f.s.ch+dmg/(f.max*.33))},
  touch(f){f.s.rel=1;return FIGHTERS.battery.dmg*(.3+(1.5+.5*f.sig)*f.s.ch)},
  dealt(f,v,dmg,m){
    if(!f.s.rel)return;
    f.s.rel=0;
    if(f.s.ch>.2){m.events.push({k:'zap',x:f.x,y:f.y,x2:v.x,y2:v.y,i:f.i});m.knock(v,f)}
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
        m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Stalled',col:'#ffd27a',i:f.i});return;
      }
      if(S.c<=0){
        S.c=(.44-(.24+.035*f.sig)*S.rev)/f.spdMul;
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
        if((S.sp=(S.sp+1)%3)===0)m.events.push({k:'burst',x:f.x+c*(f.r+S.len*.7),y:f.y+s*(f.r+S.len*.7),n:4,col:'#ffd27a',i:f.i});
      }
    }else{S.rev=Math.max(0,S.rev-DT*1.1);S.heat=Math.max(0,S.heat-DT)}
  },
  hurt(f,src,dmg,m){if(dmg>=f.max*.15){f.s.stall=.6;f.s.rev*=.4;m.knock(f,src)}}};

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
      const h=Math.min(f.max*(.03+.015*f.sig),f.max-f.hp);
      if(h>.05){f.hp+=h;m.events.push({k:'heal',x:f.x,y:f.y,dmg:h,i:f.i})}
    }
  },
  touch:()=>FIGHTERS.roomba.dmg,
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
// a quadcopter seen from above
function p5drone(x,y,rot){
  const c=Math.cos(rot+.785),s=Math.sin(rot+.785),L=5.6;
  p5seg(x-c*L,y-s*L,x+c*L,y+s*L,P5.STEEL_LO,1.3);p5seg(x+s*L,y-c*L,x-s*L,y+c*L,P5.STEEL_LO,1.3);
  g.fillStyle='rgba(215,221,226,.22)';g.strokeStyle='rgba(215,221,226,.7)';g.lineWidth=.6;
  for(const p of [[c,s],[-c,-s],[-s,c],[s,-c]]){p5disc(x+p[0]*L,y+p[1]*L,2.9);g.fill();g.stroke()}
  p5disc(x,y,2.7);p5solid(P5.GUN);
  g.fillStyle=P5.CYAN;p5disc(x,y,1.05);g.fill();
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
    }
    const e=m&&m.f?m.f[1-f.i]:null;
    if(f.s.jam>0&&e&&e.hp>0&&!e.gone){                    // the rival, jammed: target brackets and scan lines across it
      const r=e.r+4,x=e.x,y=e.y,t=p5now(),c=r*.45;
      g.strokeStyle='rgba(85,230,255,.95)';g.lineWidth=1.3;g.lineCap='butt';g.lineJoin='miter';g.beginPath();
      for(const sx of [-1,1])for(const sy of [-1,1]){g.moveTo(x+sx*r,y+sy*(r-c));g.lineTo(x+sx*r,y+sy*r);g.lineTo(x+sx*(r-c),y+sy*r)}
      g.stroke();
      g.fillStyle='rgba(85,230,255,.4)';
      for(let k=0;k<3;k++){const yy=y+Math.sin(t*9+k*2.1)*e.r*.75,w=e.r*(1.1+.5*Math.sin(t*17+k));g.fillRect(x-w+Math.sin(t*31+k*4)*3,yy-1,w*2,2)}
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
    }
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
    }
  },
  over(f){                                                // the emitter, pointing where it will fire
    const S=f.s,a=S.mode?S.an:f.aim,c=Math.cos(a),s=Math.sin(a),r=f.r;
    p5seg(f.x+c*(r-2),f.y+s*(r-2),f.x+c*(r+7),f.y+s*(r+7),P5.GUN,4.2);
    g.strokeStyle=P5.GOLD;g.lineWidth=1;g.beginPath();g.moveTo(f.x+c*(r+3)-s*3,f.y+s*(r+3)+c*3);g.lineTo(f.x+c*(r+3)+s*3,f.y+s*(r+3)-c*3);g.stroke();
    const hot=S.mode===1?Math.max(0,1-S.t/.8):S.mode===2?1:0;
    if(hot>0)p5glow(f.x+c*(r+8),f.y+s*(r+8),5+9*hot,'255,90,79',.75);
    g.fillStyle=hot>0?'#ffd9d2':P5.RED;p5disc(f.x+c*(r+8),f.y+s*(r+8),2);g.fill();
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
    if(S.mode===1)p5glow(f.x+c*(r+9),f.y+s*(r+9),4+8*Math.max(0,1-S.t),'120,200,255',.7);
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
  under(f){for(const q of f.s.tu)p5turret(q.x,q.y,q.an,q.life/(9+2*f.sig))}};

LOOKS.battery={
  crest(fg,bg){                                           // a cell with a bolt through it
    g.fillStyle=fg;p5rr(-.34,-.48,.68,1.08,.1);g.fill();g.fillRect(-.14,-.64,.28,.2);
    g.fillStyle=bg;g.beginPath();g.moveTo(.1,-.32);g.lineTo(-.2,.1);g.lineTo(-.03,.1);g.lineTo(-.1,.46);g.lineTo(.2,0);g.lineTo(.03,0);g.closePath();g.fill();
  },
  back(f){                                                // the charge gauge: eight cells round the rim, lit as it fills
    const ch=f.s.ch||0,n=8,lit=Math.round(ch*n),R=f.r+4.5;
    if(ch>=.99)p5glow(f.x,f.y,f.r+16,'216,255,90',.45+.2*Math.sin(p5now()*18));
    g.lineCap='butt';
    for(let k=0;k<n;k++){
      const a0=-1.5708+k/n*P5_TAU+.07,a1=-1.5708+(k+1)/n*P5_TAU-.07;
      g.beginPath();g.arc(f.x,f.y,R,a0,a1);g.strokeStyle=P5.EDGE;g.lineWidth=4.6;g.stroke();
      g.strokeStyle=k<lit?P5.LIME:'#4a5340';g.lineWidth=3;g.stroke();
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
  }};
