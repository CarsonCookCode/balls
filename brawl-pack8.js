// Eighth pack of fighter classes for Ball Brawl: trades, toys and oddities. Each class adds a row to FIGHTERS, a block to
// BEHAVE and its art to LOOKS. The first half is pure simulation (it loads in Node with only brawl-sim.js before it); the
// second half is drawing and only runs when the page asks for it. Every top-level name here starts with p8/P8.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.chef   ={name:'Chef',      color:'#3d5a80',hp:100,speed:165,spin:0,  dmg:8.71,cd:1.15,arms:[],desc:'Throws cleavers. Every third throw is a pie in the face, and the rival misses.',sig:['Second helping','Throws faster, and a pie blinds for longer'],sfx:{hit:'soft',shot:'whoosh'}};
FIGHTERS.smith  ={name:'Blacksmith',color:'#5c6770',hp:100,speed:155,spin:4.1,dmg:20.42,cd:.6, arms:[{a:0,l:30,head:10}],desc:'Every hammer blow forges a plate of armour onto itself.',sig:['Thicker plate','One more plate, worn from the start, and each stops more'],sfx:{hit:'iron'}};
FIGHTERS.fisher ={name:'Fisher',    color:'#1f7a8c',hp:100,speed:165,spin:0,  dmg:26,cd:.4,arms:[],desc:'Casts a line across the arena. Cross it and you are tangled.',sig:['Heavy tackle','A longer line, a longer tangle and a harder hit'],sfx:{hit:'thump',shot:'loose'}};
FIGHTERS.balloon={name:'Balloon',   color:'#e5383b',hp:100,speed:170,spin:0,  dmg:33.19,cd:.5, arms:[],desc:'Swells up as it goes. Touch it when it is full and it bursts.',sig:['Bigger bang','A wider burst, and it swells faster'],sfx:{hit:'pop'}};
FIGHTERS.yoyo   ={name:'Yo-yo',     color:'#ff9f1c',hp:100,speed:175,spin:0,  dmg:15.63,cd:.45,arms:[{a:0,l:46,head:6}],desc:'Flicks a yo-yo out on a long string and snaps it back.',sig:['Longer string','The yo-yo reaches further and comes round sooner'],sfx:{hit:'tin',shot:'whoosh'}};
FIGHTERS.bowler ={name:'Bowler',    color:'#2f5d50',hp:100,speed:160,spin:0,  dmg:20.28,cd:1.5,arms:[],desc:'Rolls a heavy ball down a lane. Stand in it and you are a pin.',sig:['Heavier ball','A bigger, harder ball, bowled more often'],sfx:{hit:'wood',shot:'whoosh'}};
FIGHTERS.bumper ={name:'Bumper',    color:'#b5179e',hp:100,speed:170,spin:0,  dmg:15.16,cd:1.5,arms:[],desc:'Scatters pinball bumpers that fling the rival about.',sig:['Multiball','More bumpers on the table'],sfx:{hit:'bell'}};
FIGHTERS.bomb   ={name:'Bomb',      color:'#26282c',hp:100,speed:180,spin:0,  dmg:50.2,cd:1,  arms:[],desc:'A fuse burns down, then it blows up. Then it lights the fuse again.',sig:['Bigger charge','A wider blast and a shorter fuse'],sfx:{hit:''}};
FIGHTERS.candle ={name:'Candle',    color:'#8a5a2b',hp:100,speed:170,spin:0,  dmg:7.13, cd:.32,arms:[],desc:'Melts away as it burns, and burns hotter the lower it gets.',sig:['Tall flame','A wider glow that relights sooner'],sfx:{hit:'tick'}};
FIGHTERS.mime   ={name:'Mime',      color:'#5e548e',hp:100,speed:165,spin:0,  dmg:8.47,cd:1.5,arms:[],desc:'Builds invisible walls for the rival to walk into.',sig:['Glass box','Wider walls, built more often'],sfx:{hit:'glass'}};
ROSTER.push('chef','smith','fisher','balloon','yoyo','bowler','bumper','bomb','candle','mime');

const p8clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
// the angle from f to where e will be when something moving at sp gets there (k = how much of the lead to trust)
function p8lead(f,e,sp,k){const t=(gap(e,f)||1)/sp*k;return Math.atan2(e.y+e.vy*t-f.y,e.x+e.vx*t-f.x)}

// Chef: cleavers and, every third throw, a pie. A pie in the face means the rival's next attack on the chef misses.
BEHAVE.chef={
  init(f){f.s.t=.8;f.s.n=0;f.s.food=[];f.s.blind=0;f.s.blindT=0;f.s.pulse=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.chef,S=f.s,Q=S.food;
    if(S.blind>0){
      S.blindT-=DT;S.pulse-=DT;
      if(S.blindT<=0)S.blind=0;
      else if(S.pulse<=0&&!e.gone){S.pulse=.3;m.events.push({k:'ring',x:e.x,y:e.y,r0:e.r*.5,r:e.r*1.05,life:.28,col:'#f3ead6',w:3,i:f.i})}
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/(1+.12*f.sig)/f.spdMul;S.n++;
      const knife=S.n%3!==0,sp=knife?360:240,an=p8lead(f,e,sp,.6)+(m.rnd()-.5)*(knife?.5:.26);
      Q.push({knife,x:f.x+Math.cos(an)*f.r,y:f.y+Math.sin(an)*f.r,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,rot:an,t:0});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.x+=q.vx*DT;q.y+=q.vy*DT;q.t+=DT;if(q.knife)q.rot+=20*DT;
      if(!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+(q.knife?5:7)){
        if(q.knife)m.hurt(e,D.dmg*f.dmgMul*rage,f);
        else{
          m.hurt(e,D.dmg*.4*f.dmgMul*rage,f);
          S.blind=1;S.blindT=1.4+.45*f.sig;S.pulse=0;
          m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Splat',col:'#f3ead6',i:f.i});
        }
        Q.splice(i,1);continue;
      }
      if(q.x<-8||q.x>AW+8||q.y<-8||q.y>AW+8)Q.splice(i,1);
    }
  },
  guard(f,src,dmg,m){
    const S=f.s;
    if(!(S.blind>0)||!src||src.i===f.i)return 1;
    S.blind--;if(S.blind<=0)S.blindT=0;
    m.events.push({k:'text',x:src.x,y:src.y-src.r,txt:'Miss',col:'#f3ead6',i:f.i});
    return 0;
  }};

// Blacksmith: a heavy hammer. Each blow it lands forges a plate; each hit it takes is mostly stopped by a plate, and knocks it off.
BEHAVE.smith={
  init(f){f.s.plates=f.sig;f.s.max=2+f.sig;f.s.hot=0},
  tick(f){if(f.s.hot>0)f.s.hot-=DT},
  dealt(f,v,dmg,m){
    const S=f.s;
    if(Math.abs(f.cd-FIGHTERS.smith.cd/f.spdMul)>1e-6)return;      // not the hammer: an extra blade or a sidearm
    if(S.plates<S.max){S.plates++;S.hot=.35;m.events.push({k:'ring',x:f.x,y:f.y,r0:f.r+12,r:f.r+3,life:.25,col:'#ffcf7a',w:2,i:f.i})}
  },
  guard(f,src,dmg,m){
    const S=f.s;
    if(S.plates<=0)return 1;
    S.plates--;
    m.events.push({k:'parry',x:f.x+(src.x-f.x)*.4,y:f.y+(src.y-f.y)*.4});
    return Math.max(.15,.45-.1*f.sig);
  }};

// Fisher: casts a float and leaves the line lying across the arena. A rival that crosses the line is tangled: slowed, with
// the fisher turning towards it, and the next time the two touch the fisher lands a heavy blow.
const P8_CAST=1.5;       // seconds between landing a catch and casting again
BEHAVE.fisher={
  init(f){f.s.fl=null;f.s.t=.5;f.s.tangle=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.fisher,S=f.s;
    if(S.tangle>0){
      S.tangle-=DT;
      if(e.gone||S.tangle<=0){S.tangle=0;S.fl=null;S.t=P8_CAST/f.spdMul;return}
      const d=gap(e,f)||1;
      f.vx+=(e.x-f.x)/d*1500*DT;f.vy+=(e.y-f.y)/d*1500*DT;m.renorm(f);     // it wades towards its catch
      e.slowT=Math.max(e.slowT,.15);
      S.fl.x=e.x;S.fl.y=e.y;
      return;
    }
    const fl=S.fl;
    if(!fl){
      S.t-=DT;
      if(S.t<=0&&!e.gone){
        const an=p8lead(f,e,340,.6)+(m.rnd()-.5)*.5;
        S.fl={x:f.x,y:f.y,an,out:1,d:0,range:125+30*f.sig,age:0};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    if(fl.out){
      fl.x+=Math.cos(fl.an)*340*DT;fl.y+=Math.sin(fl.an)*340*DT;fl.d+=340*DT;
      if(fl.d>=fl.range||fl.x<8||fl.x>AW-8||fl.y<8||fl.y>AW-8){fl.out=0;fl.x=p8clamp(fl.x,8);fl.y=p8clamp(fl.y,8)}
    }else{
      fl.age+=DT;
      if(fl.age>4){S.fl=null;S.t=P8_CAST*.5/f.spdMul;return}
    }
    if(!e.gone&&gap(e,f)>f.r+e.r+5&&distPS(e.x,e.y,f.x,f.y,fl.x,fl.y)<e.r*.8){
      m.hurt(e,D.dmg*.2*f.dmgMul*rage,f);
      S.tangle=1.5+.45*f.sig;                             // set after the line's own small hit, so that hit does not end it
      e.slowT=Math.max(e.slowT,S.tangle);
      fl.out=0;fl.x=e.x;fl.y=e.y;
      m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Tangled',i:f.i});
    }
  },
  touch:f=>f.s.tangle>0?FIGHTERS.fisher.dmg*(1+.2*f.sig):0,
  dealt(f,v,dmg,m){
    if(f.s.tangle>0){f.s.tangle=0;f.s.fl=null;f.s.t=P8_CAST/f.spdMul;m.knock(v,f)}
  }};

// Balloon: swells from small and quick to big and slow. Once full, the next thing to touch or hit it bursts it: a blast
// around it, and it starts again small. Left alone at full size it bursts by itself after a moment.
function p8size(f){
  const S=f.s;
  f.r=Math.min(46,S.r0*(.72+.68*S.p));
  f.speed=f.base*(1.32-.6*S.p);
}
BEHAVE.balloon={
  init(f){f.s.r0=f.r;f.s.p=0;f.s.full=0;f.s.burst=false;p8size(f)},
  tick(f,e,m,rage){
    const D=FIGHTERS.balloon,S=f.s;
    if(S.p<1)S.p=Math.min(1,S.p+DT*(1+.22*f.sig)*f.spdMul/3.8);
    else{
      S.full+=DT;
      if(S.full>2.2||(!e.gone&&gap(e,f)<f.r+e.r+3))S.burst=true;
    }
    if(S.burst){
      const rad=f.r+34+13*f.sig;
      m.events.push({k:'blast',x:f.x,y:f.y,r:rad,i:f.i});m.events.push({k:'burst',x:f.x,y:f.y,n:14,i:f.i});
      if(!e.gone&&gap(e,f)<rad+e.r*.5){m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,f)}
      S.p=0;S.full=0;S.burst=false;
    }
    p8size(f);m.renorm(f);
    f.x=p8clamp(f.x,f.r);f.y=p8clamp(f.y,f.r);
  },
  guard(f){if(f.s.p>=1){f.s.burst=true;return .5}return 1},     // the air takes half of the hit that pops it
  touch:f=>FIGHTERS.balloon.dmg*.2};

// Yo-yo: its one arm is a string. It is flicked out towards the rival to full length, hangs for an instant and snaps back.
BEHAVE.yoyo={
  init(f){const A=f.arms[0],S=f.s;S.L=A.l*(1+.22*f.sig);S.ph=0;S.t=.5;S.an=f.aim||0;A.l=3},
  tick(f,e,m){
    const A=f.arms[0],S=f.s;
    S.t-=DT;
    if(S.ph===0){
      A.l=3;
      if(S.t<=0&&!e.gone){S.ph=1;S.t=.2;S.an=p8lead(f,e,S.L/.2,.6);m.events.push({k:'shot',x:f.x,y:f.y,i:f.i})}
    }else if(S.ph===1){A.l=3+(S.L-3)*Math.min(1,1-S.t/.2);if(S.t<=0){S.ph=2;S.t=.1}}
    else if(S.ph===2){A.l=S.L;if(S.t<=0){S.ph=3;S.t=.26}}
    else{A.l=3+(S.L-3)*Math.max(0,S.t/.26);if(S.t<=0){S.ph=0;S.t=Math.max(.3,.85-.13*f.sig)/f.spdMul}}
    A.a=S.an-f.ang*A.rate;                                // the string points where it was thrown, whatever the body is doing
  }};

// Bowler: sights down a lane at the rival, then sends a heavy ball along it from wall to wall.
BEHAVE.bowler={
  init(f){f.s.t=.9;f.s.ball=null;f.s.lane=null},
  tick(f,e,m,rage){
    const D=FIGHTERS.bowler,S=f.s;
    if(S.ball){
      const b=S.ball;
      b.x+=b.vx*DT;b.y+=b.vy*DT;b.rot+=9*DT;
      if(!b.hit&&!e.gone&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){
        b.hit=1;
        m.hurt(e,D.dmg*(1+.15*f.sig)*f.dmgMul*rage,f);m.knock(e,{x:b.x-b.vx*.1,y:b.y-b.vy*.1});
        m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Strike',i:f.i});
      }
      if(b.x<-b.r||b.x>AW+b.r||b.y<-b.r||b.y>AW+b.r){S.ball=null;S.t=D.cd/(1+.2*f.sig)/f.spdMul}
      return;
    }
    if(S.lane){
      const sp=300;
      S.lane.t-=DT;S.lane.an=p8lead(f,e,sp,.75);
      if(S.lane.t<=0||e.gone){
        const an=S.lane.an,r=9+2.5*f.sig;
        S.ball={x:f.x+Math.cos(an)*f.r,y:f.y+Math.sin(an)*f.r,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,r,rot:0,hit:0};
        S.lane=null;
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone)S.lane={t:.45,an:f.aim};
  }};

// Bumper: pinball bumpers appear around the arena. The rival is hurt and flung by each one it touches; a bumper wears
// out after a few hits or a while.
BEHAVE.bumper={
  init(f){f.s.b=[];f.s.t=.4},
  tick(f,e,m,rage){
    const D=FIGHTERS.bumper,S=f.s,B=S.b;
    S.t-=DT;
    if(S.t<=0){
      S.t=D.cd/f.spdMul;
      if(B.length<3+f.sig){
        let bx=AW/2,by=AW/2,best=-1;
        for(let n=0;n<7;n++){
          const x=24+m.rnd()*(AW-48),y=24+m.rnd()*(AW-48);
          let d=Math.min(Math.hypot(x-f.x,y-f.y),e.gone?999:Math.hypot(x-e.x,y-e.y)-e.r);
          for(const q of B)d=Math.min(d,Math.hypot(x-q.x,y-q.y));
          if(d>best){best=d;bx=x;by=y}
        }
        B.push({x:bx,y:by,r:10,cd:.3,life:11,hits:0,lit:0,age:0});
        m.events.push({k:'ring',x:bx,y:by,r0:22,r:8,life:.3,w:2,i:f.i});
      }
    }
    for(let i=B.length-1;i>=0;i--){
      const q=B[i];
      q.life-=DT;q.age+=DT;if(q.cd>0)q.cd-=DT;if(q.lit>0)q.lit-=DT;
      if(!e.gone){
        const dx=e.x-q.x,dy=e.y-q.y,d=Math.sqrt(dx*dx+dy*dy)||.01;
        if(d<e.r+q.r){
          e.x=p8clamp(q.x+dx/d*(e.r+q.r),e.r);e.y=p8clamp(q.y+dy/d*(e.r+q.r),e.r);
          if(q.cd<=0){
            q.cd=.45;q.lit=.25;q.hits++;
            m.hurt(e,D.dmg*f.dmgMul*rage,f);
            if(e.stunT<=0)m.knock(e,q);
          }
        }
      }
      if(q.life<=0||q.hits>=4){m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});B.splice(i,1)}
    }
  }};

// Bomb: the fuse burns down and it explodes, hurting a rival more the nearer it is and costing itself a little. Every hit it
// takes shakes the fuse shorter, so whoever is beating on it is usually standing right there when it goes.
BEHAVE.bomb={
  init(f){f.s.full=f.s.fuse=2.4-.12*f.sig;f.s.rad=92+8*f.sig},
  tick(f,e,m,rage){
    const D=FIGHTERS.bomb,S=f.s;
    S.fuse-=DT*f.spdMul;
    if(S.fuse>0)return;
    m.events.push({k:'boom',x:f.x,y:f.y,i:f.i});
    m.events.push({k:'ring',x:f.x,y:f.y,r0:f.r,r:S.rad,life:.35,col:'#ffb347',w:4,i:f.i});
    const d=gap(e,f)-e.r;
    if(!e.gone&&d<S.rad){m.hurt(e,D.dmg*(1-.6*Math.max(0,d)/S.rad)*(1+.08*f.sig)*f.dmgMul*rage,f);m.knock(e,f)}
    f.hp=Math.max(1,f.hp-f.max*.03);
    S.fuse=S.full;
  },
  hurt(f){f.s.fuse=Math.max(.12,f.s.fuse-.4)}};

// Candle: melts all the time, down to a stub. Its glow burns a rival standing in it, hotter the lower the candle's
// health. A hit blows the flame out for a moment; once relit it holds for a moment before it can be blown out again.
BEHAVE.candle={
  init(f){f.s.out=0;f.s.safe=0;f.s.cd=.4;f.s.rad=f.r+34;f.s.heat=1},
  tick(f,e,m,rage){
    const D=FIGHTERS.candle,S=f.s,low=1-Math.max(0,Math.min(f.max,f.hp))/f.max;
    if(f.hp>f.max*.12)f.hp-=f.max*.016*DT;
    S.rad=f.r+34+9*f.sig+14*low;S.heat=1+1.4*low;
    if(S.out>0){S.out-=DT;if(S.out<=0)S.safe=.7;return}
    if(S.safe>0)S.safe-=DT;
    if(S.cd>0)S.cd-=DT;
    else if(!e.gone&&gap(e,f)<S.rad+e.r*.6){S.cd=D.cd/f.spdMul;m.hurt(e,D.dmg*S.heat*f.dmgMul*rage,f)}
  },
  hurt(f){if(f.s.out<=0&&f.s.safe<=0)f.s.out=Math.max(.3,.7-.1*f.sig)}};

// Mime: a pane of nothing appears right in the rival's path. The rival bounces off it and is hurt; the mime walks through.
// A pane breaks after a few knocks.
BEHAVE.mime={
  init(f){f.s.w=[];f.s.t=.9},
  tick(f,e,m,rage){
    const D=FIGHTERS.mime,S=f.s,W=S.w;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/(1+.25*f.sig)/f.spdMul;
      const sp=Math.hypot(e.vx,e.vy)||1,ux=e.vx/sp,uy=e.vy/sp,ahead=e.r+30+m.rnd()*45,side=(m.rnd()-.5)*44,h=26+5*f.sig;
      const cx=p8clamp(e.x+ux*ahead-uy*side,6),cy=p8clamp(e.y+uy*ahead+ux*side,6);
      W.push({x1:cx-uy*h,y1:cy+ux*h,x2:cx+uy*h,y2:cy-ux*h,t:0,cd:0,hits:0,flash:0});
      if(W.length>4+f.sig)W.shift();
    }
    for(let i=W.length-1;i>=0;i--){
      const w=W[i];
      w.t+=DT;if(w.cd>0)w.cd-=DT;if(w.flash>0)w.flash-=DT;
      if(w.t>6||w.hits>=2){W.splice(i,1);continue}
      if(e.gone||e.stunT>0)continue;
      const dx=w.x2-w.x1,dy=w.y2-w.y1,l2=dx*dx+dy*dy||1e-9;
      let t=((e.x-w.x1)*dx+(e.y-w.y1)*dy)/l2;t=t<0?0:t>1?1:t;
      const qx=w.x1+dx*t,qy=w.y1+dy*t;
      let nx=e.x-qx,ny=e.y-qy;const d=Math.sqrt(nx*nx+ny*ny);
      if(d>=e.r)continue;
      if(d<.01){nx=-e.vx;ny=-e.vy;const q=Math.hypot(nx,ny)||1;nx/=q;ny/=q}else{nx/=d;ny/=d}
      e.x=p8clamp(qx+nx*e.r,e.r);e.y=p8clamp(qy+ny*e.r,e.r);
      const vn=e.vx*nx+e.vy*ny;
      if(vn<0){e.vx-=2*vn*nx;e.vy-=2*vn*ny}
      if(w.cd<=0){
        w.cd=.6;w.hits++;w.flash=.3;
        m.hurt(e,D.dmg*f.dmgMul*rage,f);
        m.events.push({k:'text',x:qx,y:qy-6,txt:'Bonk',i:f.i});
      }
    }
  }};

// ---------- art ----------
// "Gilded": every fighter is a medallion drawn by the shared drawFighter in brawl-looks.js. These blocks add what makes
// each class its own: crest(fg,bg) on the enamel (unit radius), arm(...) for a weapon arm, under(f,m) on the floor,
// back(f) behind the medallion, over(f,m) on top. All of it draws with g, the current context.
const P8={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',GOLD_LO:typeof GOLD_LO!=='undefined'?GOLD_LO:'#7a5d2b',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  CRIMSON:typeof CRIMSON!=='undefined'?CRIMSON:'#8f2732',STEEL:typeof STEEL!=='undefined'?STEEL:'#d7dde2',STEEL_LO:typeof STEEL_LO!=='undefined'?STEEL_LO:'#8b959d',
  WOOD:typeof WOOD!=='undefined'?WOOD:'#6f4d30',LEATHER:typeof LEATHER!=='undefined'?LEATHER:'#3a2a1e',
  FONT:typeof FONT!=='undefined'?FONT:'serif',
  CREAM:'#fbf3df',CRUST:'#c98f4e',FLAME:'255,170,70',
};
const P8_TAU=6.2832;
const p8disc=(x,y,r)=>{g.beginPath();g.arc(x,y,Math.max(.1,r),0,P8_TAU)};
function p8shade(hex,k){
  const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return hex;
  const n=parseInt(m[1],16),f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
  return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';
}
// a soft round glow; rgb is an "r,g,b" triple
function p8glow(x,y,r,rgb,a){
  r=Math.max(.5,r);a=Math.max(0,Math.min(1,a));
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a.toFixed(3)+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p8disc(x,y,r);g.fill();
}
// stroke the current path as a solid rod: dark edge underneath, the material on top
function p8rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P8.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
function p8seg(x1,y1,x2,y2,col,w){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);p8rod(col,w)}
// fill the current path and give it the thin dark edge everything solid has
function p8solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P8.EDGE;g.lineWidth=1;g.lineJoin='round';g.stroke()}
// a small polished sphere
function p8gem(x,y,r,col){
  r=Math.max(.5,r);
  const q=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);q.addColorStop(0,p8shade(col,.6));q.addColorStop(.55,col);q.addColorStop(1,p8shade(col,-.45));
  p8disc(x,y,r);p8solid(q);
}
function p8star(x,y,r,col,n){
  n=n||8;g.beginPath();for(let k=0;k<n;k++){const a=k/n*P8_TAU-1.5708,q=k%2?r*.42:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}
  g.closePath();g.fillStyle=col;g.fill();
}
const p8foe=(f,m)=>m&&m.f?m.f[1-f.i]:null;

LOOKS.chef={
  crest(fg,bg){                                           // a chef's tall hat
    g.fillStyle=fg;
    for(const p of [[-.3,-.3,.26],[0,-.44,.3],[.3,-.3,.26]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P8_TAU);g.fill()}
    g.beginPath();g.rect(-.34,-.3,.68,.74);g.fill();
    g.strokeStyle=bg;g.lineWidth=.06;g.lineCap='round';
    g.beginPath();g.moveTo(-.34,.2);g.lineTo(.34,.2);g.stroke();
    g.lineWidth=.045;g.beginPath();g.moveTo(-.12,-.16);g.lineTo(-.12,.06);g.moveTo(.12,-.16);g.lineTo(.12,.06);g.stroke();
  },
  over(f,m){
    const S=f.s,e=p8foe(f,m);
    if(S.blind>0&&e&&e.hp>0&&!e.gone){                    // cream on the rival's face
      g.fillStyle='rgba(251,243,223,.9)';
      for(const p of [[0,0,.5],[-.38,-.12,.26],[.34,-.2,.24],[.2,.34,.24],[-.26,.34,.2]]){p8disc(e.x+p[0]*e.r,e.y+p[1]*e.r,p[2]*e.r);g.fill()}
    }
    for(const q of S.food){
      if(q.knife){                                        // the cleaver, turning end over end
        g.save();g.translate(q.x,q.y);g.rotate(q.rot);
        g.beginPath();g.rect(-9,-1.4,8,2.8);p8solid(P8.WOOD);
        g.beginPath();g.moveTo(-1,-4.6);g.lineTo(9,-4.6);g.lineTo(9,3.4);g.lineTo(-1,3.4);g.closePath();p8solid(P8.STEEL);
        g.fillStyle=P8.EDGE;p8disc(7,-2.6,.8);g.fill();
        g.restore();
      }else{                                              // a cream pie
        p8disc(q.x,q.y,6.6);p8solid(P8.CRUST);
        p8disc(q.x,q.y,4.9);g.fillStyle=P8.CREAM;g.fill();
        p8disc(q.x,q.y,1.5);g.fillStyle='#c0303f';g.fill();
      }
    }
  }};

LOOKS.smith={
  crest(fg){                                              // an anvil
    g.lineJoin='round';g.fillStyle=fg;
    g.beginPath();g.moveTo(-.72,-.3);g.lineTo(-.3,-.36);g.lineTo(.54,-.36);g.lineTo(.54,-.1);g.lineTo(.22,-.06);g.lineTo(.16,.2);
    g.lineTo(.42,.34);g.lineTo(.42,.52);g.lineTo(-.38,.52);g.lineTo(-.38,.34);g.lineTo(-.12,.2);g.lineTo(-.18,-.06);g.lineTo(-.42,-.1);g.closePath();g.fill();
  },
  arm(f,A,x1,y1,x2,y2,an){                                // the hammer: a wooden haft and a block of a head
    p8seg(x1,y1,x2,y2,P8.WOOD,2.6);
    g.save();g.translate(x2,y2);g.rotate(an);
    const q=g.createLinearGradient(0,-9,0,9);q.addColorStop(0,'#eef2f4');q.addColorStop(.5,P8.STEEL_LO);q.addColorStop(1,'#4a5158');
    g.beginPath();g.rect(-5,-9.5,10,19);p8solid(q);
    g.fillStyle=P8.GOLD;g.fillRect(-1.2,-9.5,2.4,19);
    g.restore();
  },
  back(f){                                                // the plates it has forged, riveted round the ring
    const S=f.s,n=S.plates||0,max=S.max||2,R=f.r+4;
    if(S.hot>0)p8glow(f.x,f.y,f.r+12,'255,190,110',.5*Math.min(1,S.hot/.35));
    g.lineCap='butt';
    for(let k=0;k<n;k++){
      const a=-1.5708+k*P8_TAU/max,w=Math.min(1.1,P8_TAU/max*.42);
      g.beginPath();g.arc(f.x,f.y,R,a-w,a+w);g.strokeStyle=P8.EDGE;g.lineWidth=8;g.stroke();
      g.strokeStyle=P8.STEEL_LO;g.lineWidth=5.8;g.stroke();
      g.beginPath();g.arc(f.x,f.y,R+1.4,a-w+.05,a+w-.05);g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.stroke();
      g.fillStyle=P8.GOLD;for(const s of [-1,1]){p8disc(f.x+Math.cos(a+s*w*.7)*R,f.y+Math.sin(a+s*w*.7)*R,1.1);g.fill()}
    }
  }};

LOOKS.fisher={
  crest(fg,bg){                                           // a fish
    g.fillStyle=fg;
    g.beginPath();g.ellipse(-.1,0,.5,.28,0,0,P8_TAU);g.fill();
    g.beginPath();g.moveTo(.3,0);g.lineTo(.7,-.32);g.lineTo(.6,0);g.lineTo(.7,.32);g.closePath();g.fill();
    g.beginPath();g.moveTo(-.16,-.24);g.lineTo(.08,-.48);g.lineTo(.14,-.22);g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.arc(-.36,-.06,.055,0,P8_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.045;g.beginPath();g.arc(-.34,0,.2,-.9,.9);g.stroke();
  },
  over(f,m){
    const S=f.s,fl=S.fl,a=fl?Math.atan2(fl.y-f.y,fl.x-f.x):f.aim,c=Math.cos(a),s=Math.sin(a);
    const tx=f.x+c*(f.r+11),ty=f.y+s*(f.r+11);
    p8seg(f.x+c*(f.r-2),f.y+s*(f.r-2),tx,ty,'#b98a54',1.6);                           // the rod
    if(!fl)return;
    g.strokeStyle=S.tangle>0?'rgba(251,243,223,.95)':'rgba(251,243,223,.6)';g.lineWidth=S.tangle>0?1.1:.7;g.lineCap='round';
    g.beginPath();g.moveTo(tx,ty);g.lineTo(fl.x,fl.y);g.stroke();
    if(S.tangle>0){                                       // the line wound round the catch
      const e=p8foe(f,m);
      if(e){g.setLineDash([3,2.5]);for(const k of [3,6]){p8disc(e.x,e.y,e.r+k);g.stroke()}g.setLineDash([])}
    }else{                                                // the float: red over white
      p8gem(fl.x,fl.y,4,'#f3ead6');
      g.beginPath();g.arc(fl.x,fl.y,4,Math.PI,P8_TAU);g.closePath();g.fillStyle='#c0303f';g.fill();g.strokeStyle=P8.EDGE;g.lineWidth=.8;g.stroke();
      p8seg(fl.x,fl.y-4,fl.x,fl.y-7.5,P8.IVORY,.9);
    }
  }};

LOOKS.balloon={
  crest(fg,bg){                                           // a balloon on a string
    g.lineCap='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.beginPath();g.ellipse(0,-.16,.42,.5,0,0,P8_TAU);g.fill();
    g.beginPath();g.moveTo(0,.3);g.lineTo(-.1,.46);g.lineTo(.1,.46);g.closePath();g.fill();
    g.lineWidth=.05;g.beginPath();g.moveTo(0,.46);g.quadraticCurveTo(.16,.58,0,.68);g.quadraticCurveTo(-.12,.74,.04,.82);g.stroke();
    g.strokeStyle=bg;g.lineWidth=.06;g.beginPath();g.arc(-.04,-.18,.27,3.5,4.5);g.stroke();
  },
  back(f){                                                // its string, trailing behind
    const sp=Math.hypot(f.vx,f.vy)||1,ux=-f.vx/sp,uy=-f.vy/sp,r=f.r,w=Math.sin(p8now()*6)*4;
    g.strokeStyle='rgba(243,234,214,.8)';g.lineWidth=.9;g.lineCap='round';
    g.beginPath();g.moveTo(f.x+ux*r,f.y+uy*r);g.quadraticCurveTo(f.x+ux*(r+8)-uy*w,f.y+uy*(r+8)+ux*w,f.x+ux*(r+16),f.y+uy*(r+16));g.stroke();
  },
  over(f){
    const S=f.s;
    if(S.p>=1){                                           // full: it strains
      const k=.6+.4*Math.sin(p8now()*22);
      g.strokeStyle='rgba(255,236,200,'+(.35+.5*k).toFixed(3)+')';g.lineWidth=1.3;g.setLineDash([4,3]);p8disc(f.x,f.y,f.r+3+k);g.stroke();g.setLineDash([]);
    }
  }};
function p8now(){return typeof NOW!=='undefined'&&Number.isFinite(NOW)?NOW:0}

LOOKS.yoyo={
  crest(fg,bg){                                           // a yo-yo hanging from its loop
    g.fillStyle=fg;g.strokeStyle=fg;g.lineCap='round';
    g.lineWidth=.05;g.beginPath();g.moveTo(0,-.3);g.lineTo(0,-.68);g.stroke();
    g.lineWidth=.05;g.beginPath();g.arc(0,-.74,.07,0,P8_TAU);g.stroke();
    g.beginPath();g.arc(0,.14,.46,0,P8_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.07;g.beginPath();g.arc(0,.14,.29,0,P8_TAU);g.stroke();
    g.fillStyle=bg;g.beginPath();g.arc(0,.14,.09,0,P8_TAU);g.fill();
  },
  arm(f,A,x1,y1,x2,y2){                                   // the string, and the spinning disc on its end
    g.strokeStyle='rgba(251,243,223,.9)';g.lineWidth=.8;g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
    const r=(A.head||6)+.6,t=p8now()*14;
    p8gem(x2,y2,r,'#c8323e');
    p8disc(x2,y2,r*.55);g.strokeStyle=P8.GOLD_HI;g.lineWidth=1;g.stroke();
    g.fillStyle=P8.GOLD_HI;for(let k=0;k<2;k++){p8disc(x2+Math.cos(t+k*3.1416)*r*.55,y2+Math.sin(t+k*3.1416)*r*.55,.9);g.fill()}
  }};

LOOKS.bowler={
  crest(fg,bg){                                           // a bowling pin
    g.fillStyle=fg;
    g.beginPath();g.arc(0,-.5,.17,0,P8_TAU);g.fill();
    g.beginPath();g.moveTo(-.11,-.42);g.quadraticCurveTo(-.08,-.2,-.26,.06);g.quadraticCurveTo(-.38,.4,-.2,.68);g.lineTo(.2,.68);
    g.quadraticCurveTo(.38,.4,.26,.06);g.quadraticCurveTo(.08,-.2,.11,-.42);g.closePath();g.fill();
    g.fillStyle='#b3313f';g.fillRect(-.14,-.3,.28,.055);g.fillRect(-.16,-.2,.32,.055);
  },
  under(f){                                               // the lane it is sighting down
    const L=f.s.lane;
    if(!L)return;
    const c=Math.cos(L.an),s=Math.sin(L.an),w=10+2.5*f.sig,len=AW*1.5,p=Math.max(0,Math.min(1,1-L.t/.45));
    g.fillStyle='rgba(243,234,214,'+(.05+.1*p).toFixed(3)+')';
    g.beginPath();g.moveTo(f.x-s*w,f.y+c*w);g.lineTo(f.x-s*w+c*len,f.y+c*w+s*len);g.lineTo(f.x+s*w+c*len,f.y-c*w+s*len);g.lineTo(f.x+s*w,f.y-c*w);g.closePath();g.fill();
    g.strokeStyle='rgba(243,234,214,'+(.25+.4*p).toFixed(3)+')';g.lineWidth=.8;g.setLineDash([5,4]);
    g.beginPath();for(const k of [-1,1]){g.moveTo(f.x-s*w*k,f.y+c*w*k);g.lineTo(f.x-s*w*k+c*len,f.y+c*w*k+s*len)}g.stroke();g.setLineDash([]);
  },
  over(f){
    const b=f.s.ball;
    if(b){                                                // the ball: dark, glossy, three finger holes
      p8gem(b.x,b.y,b.r,'#2a3140');
      g.fillStyle=P8.EDGE;
      for(const k of [0,.9,1.8]){const a=b.rot+k*.55;p8disc(b.x+Math.cos(a)*b.r*.45,b.y+Math.sin(a)*b.r*.45,Math.max(.8,b.r*.13));g.fill()}
    }else{                                                // waiting in hand
      const a=(f.s.lane?f.s.lane.an:f.aim)+1.2;
      p8gem(f.x+Math.cos(a)*(f.r+5),f.y+Math.sin(a)*(f.r+5),5.5,'#2a3140');
    }
  }};

LOOKS.bumper={
  crest(fg,bg){                                           // a pinball bumper seen from above
    g.fillStyle=fg;g.beginPath();
    for(let k=0;k<16;k++){const a=k/16*P8_TAU-1.5708,q=k%2?.48:.7;g.lineTo(Math.cos(a)*q,Math.sin(a)*q)}
    g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.arc(0,0,.34,0,P8_TAU);g.fill();
    g.fillStyle=fg;g.beginPath();g.arc(0,0,.18,0,P8_TAU);g.fill();
  },
  under(f){
    for(const q of f.s.b){
      const k=Math.min(1,q.age/.25),r=q.r*(.4+.6*k),lit=q.lit>0;
      if(lit)p8glow(q.x,q.y,r+14,'255,220,240',.7);
      g.fillStyle='rgba(0,0,0,.4)';p8disc(q.x+.8,q.y+1.6,r+1);g.fill();
      p8disc(q.x,q.y,r+1);p8solid(P8.GOLD);
      p8star(q.x,q.y,r,lit?'#ffffff':P8.IVORY,12);
      p8gem(q.x,q.y,r*.55,lit?'#ff9ae6':f.col||'#b5179e');
      if(q.life<1.5||q.hits>=3){g.strokeStyle='rgba(9,11,13,.7)';g.lineWidth=.8;g.beginPath();g.moveTo(q.x-r*.5,q.y-r*.3);g.lineTo(q.x,q.y+r*.1);g.lineTo(q.x+r*.4,q.y-r*.5);g.stroke()}
    }
  }};

LOOKS.bomb={
  crest(fg,bg){                                           // a round bomb, fuse lit
    g.fillStyle=fg;g.strokeStyle=fg;g.lineCap='round';
    g.beginPath();g.arc(-.06,.14,.46,0,P8_TAU);g.fill();
    g.save();g.translate(.24,-.28);g.rotate(.7);g.fillRect(-.12,-.1,.24,.2);g.restore();
    g.lineWidth=.06;g.beginPath();g.moveTo(.3,-.36);g.quadraticCurveTo(.36,-.6,.56,-.58);g.stroke();
    g.fillStyle='#ffb347';g.beginPath();
    for(let k=0;k<8;k++){const a=k/8*P8_TAU,q=k%2?.06:.15;g.lineTo(.6+Math.cos(a)*q,-.6+Math.sin(a)*q)}
    g.closePath();g.fill();
    g.strokeStyle=bg;g.lineWidth=.06;g.beginPath();g.arc(-.06,.14,.3,3.4,4.3);g.stroke();
  },
  under(f){                                               // how far the blast will reach
    const S=f.s,p=1-Math.max(0,Math.min(1,S.fuse/S.full));
    if(p<.55)return;
    g.strokeStyle='rgba(255,179,71,'+(.15+.5*(p-.55)/.45).toFixed(3)+')';g.lineWidth=1;g.setLineDash([4,5]);p8disc(f.x,f.y,S.rad);g.stroke();g.setLineDash([]);
  },
  over(f){                                                // the fuse burning round the rim, and the count
    const S=f.s,p=Math.max(0,Math.min(1,S.fuse/S.full)),R=f.r+3,a0=-1.5708,a1=a0+P8_TAU*p;
    if(p>.01){
      g.lineCap='round';g.beginPath();g.arc(f.x,f.y,R,a0,a1);g.strokeStyle=P8.EDGE;g.lineWidth=3;g.stroke();g.strokeStyle='#d8c49a';g.lineWidth=1.4;g.stroke();
    }
    const sx=f.x+Math.cos(a1)*R,sy=f.y+Math.sin(a1)*R,k=3.2+Math.sin(p8now()*40)*1.2;
    p8glow(sx,sy,9,P8.FLAME,.7);p8star(sx,sy,k,'#ffe2a0',8);
    const nx=f.x+f.r*.78,ny=f.y-f.r*.78;
    p8disc(nx,ny,5.4);p8solid(S.fuse<1?'#b3313f':'#1c1e21');
    g.strokeStyle=P8.GOLD;g.lineWidth=.8;p8disc(nx,ny,5.4);g.stroke();
    g.fillStyle=P8.IVORY;g.textAlign='center';g.textBaseline='middle';g.font='700 7px '+P8.FONT;
    g.fillText(String(Math.max(1,Math.ceil(S.fuse))),nx,ny+.4);
  }};

LOOKS.candle={
  crest(fg,bg){                                           // a candle in its dish
    g.fillStyle=fg;g.strokeStyle=fg;g.lineCap='round';
    g.beginPath();g.rect(-.17,-.12,.34,.6);g.fill();
    g.beginPath();g.arc(.17,-.02,.07,0,P8_TAU);g.fill();g.fillRect(.14,-.1,.1,.1);
    g.beginPath();g.ellipse(0,.54,.42,.11,0,0,P8_TAU);g.fill();
    g.lineWidth=.045;g.beginPath();g.moveTo(0,-.12);g.lineTo(0,-.24);g.stroke();
    g.fillStyle='#ffb347';g.beginPath();g.moveTo(0,-.76);g.quadraticCurveTo(.24,-.42,0,-.22);g.quadraticCurveTo(-.24,-.42,0,-.76);g.fill();
    g.fillStyle='#fff3c4';g.beginPath();g.moveTo(0,-.52);g.quadraticCurveTo(.1,-.36,0,-.27);g.quadraticCurveTo(-.1,-.36,0,-.52);g.fill();
  },
  under(f){                                               // the glow: where it burns
    const S=f.s;
    if(S.out>0){
      g.strokeStyle='rgba(200,200,200,.25)';g.lineWidth=.8;g.setLineDash([2,5]);p8disc(f.x,f.y,S.rad);g.stroke();g.setLineDash([]);
      return;
    }
    const h=Math.min(1,(S.heat-1)/1.4),fl=.9+.1*Math.sin(p8now()*17);
    p8glow(f.x,f.y,S.rad*fl,P8.FLAME,.22+.3*h);
    g.strokeStyle='rgba(255,196,120,'+(.3+.4*h).toFixed(3)+')';g.lineWidth=.9;g.setLineDash([3,4]);p8disc(f.x,f.y,S.rad);g.stroke();g.setLineDash([]);
  },
  over(f){                                                // wax running down the ring; smoke when it has been blown out
    const S=f.s,low=1-Math.max(0,Math.min(f.max,f.hp))/f.max;
    g.fillStyle=P8.CREAM;g.strokeStyle=P8.EDGE;g.lineWidth=.5;
    for(let k=0;k<3;k++){
      const a=.5+k*.75,len=2+low*7*(.6+.2*k),x=f.x+Math.cos(a)*f.r,y=f.y+Math.sin(a)*f.r;
      g.beginPath();g.ellipse(x,y+len*.5,1.7,1.4+len*.5,0,0,P8_TAU);g.fill();g.stroke();
    }
    if(S.out>0){
      g.strokeStyle='rgba(210,210,210,.6)';g.lineWidth=1;g.lineCap='round';
      const t=p8now()*3,x=f.x+f.r*.75,y=f.y-f.r*.75;
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+4+Math.sin(t)*2,y-5,x+1,y-10);g.quadraticCurveTo(x-2,y-13,x+2+Math.sin(t+1)*2,y-17);g.stroke();
    }
  }};

LOOKS.mime={
  crest(fg,bg){                                           // a white face under a black beret
    g.fillStyle=fg;g.beginPath();g.ellipse(0,.08,.44,.54,0,0,P8_TAU);g.fill();
    g.fillStyle='#0b0d10';g.beginPath();g.ellipse(.03,-.46,.5,.17,-.12,0,P8_TAU);g.fill();
    g.beginPath();g.arc(.06,-.66,.06,0,P8_TAU);g.fill();
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.ellipse(s*.17,0,.055,.12,0,0,P8_TAU);g.fill()}
    g.fillStyle='#b3313f';for(const s of [-1,1]){g.beginPath();g.arc(s*.27,.24,.06,0,P8_TAU);g.fill()}
    g.strokeStyle='#0b0d10';g.lineWidth=.05;g.lineCap='round';g.beginPath();g.arc(0,.24,.15,.35,2.79);g.stroke();
  },
  under(f){                                               // the walls: almost not there, until something hits them
    for(const w of f.s.w){
      const hit=w.flash>0,life=6,fade=Math.min(1,(life-w.t)/.6,w.t/.15+.2);
      g.lineCap='round';
      if(hit){g.strokeStyle='rgba(255,255,255,'+(.5+.5*Math.min(1,w.flash/.3)).toFixed(3)+')';g.lineWidth=3;g.beginPath();g.moveTo(w.x1,w.y1);g.lineTo(w.x2,w.y2);g.stroke()}
      g.strokeStyle='rgba(235,240,255,'+(Math.max(0,fade)*(hit?.9:.34)).toFixed(3)+')';g.lineWidth=1.2;g.setLineDash([5,4]);
      g.beginPath();g.moveTo(w.x1,w.y1);g.lineTo(w.x2,w.y2);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(235,240,255,'+(Math.max(0,fade)*.5).toFixed(3)+')';p8disc(w.x1,w.y1,1.3);g.fill();p8disc(w.x2,w.y2,1.3);g.fill();
    }
  },
  over(f){                                                // white gloves, pressed flat against nothing
    for(const s of [-1,1]){
      const a=f.aim+s*.55,x=f.x+Math.cos(a)*(f.r+4),y=f.y+Math.sin(a)*(f.r+4);
      p8disc(x,y,3.2);p8solid(P8.IVORY);
    }
  }};
