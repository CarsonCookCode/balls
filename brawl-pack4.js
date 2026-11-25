// Fourth pack of fighter classes for Ball Brawl: figures from history and myth. Each class adds a row to FIGHTERS, a block
// to BEHAVE and its art to LOOKS. The first half is pure simulation (it loads in Node with only brawl-sim.js before it);
// the second half is drawing and only runs when the page asks for it. Every top-level name here starts with p4/P4.

// ---------- simulation ----------
// As in brawl-sim.js, dmg is each class's single damage dial and f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.emperor  ={name:'Emperor',      color:'#2c4f9a',hp:100,speed:155,spin:0,    dmg:19.17,   cd:.8, arms:[],desc:'Guards circle it and take the blows meant for it.',sig:['Old Guard','More guards, and the fallen return sooner'],sfx:{hit:'metal'}};
FIGHTERS.samurai  ={name:'Samurai',      color:'#8e2f3c',hp:100,speed:175,spin:0,    dmg:28,  cd:3.2,arms:[],desc:'Waits with its blade sheathed, then makes one terrible cut.',sig:['Second cut','Sheathes faster and reaches further'],sfx:{hit:'slash'}};
FIGHTERS.viking   ={name:'Viking',       color:'#5aa0c8',hp:100,speed:165,spin:0,    dmg:8.83,  cd:1.5,arms:[],desc:'Hurls spinning axes, faster and faster as its health drops.',sig:['Bearded axe','Bigger, faster axes that hit harder'],sfx:{hit:'chop',shot:'whoosh'}};
FIGHTERS.gladiator={name:'Gladiator',    color:'#d1a03a',hp:100,speed:170,spin:0,    dmg:9.24,   cd:3,  arms:[],desc:'Throws a net that pins the rival down, then goes to work with a trident.',sig:['Weighted net','A wider net that holds for longer'],sfx:{hit:'metal',shot:'whoosh'}};
FIGHTERS.pharaoh  ={name:'Pharaoh',      color:'#2aa6a0',hp:100,speed:150,spin:0,    dmg:4.93, cd:1,  arms:[],desc:'Its curse bites harder every second. A heavy blow lifts half of it.',sig:['Ancient curse','The curse grows faster'],sfx:{hit:'tick'}};
FIGHTERS.spartan  ={name:'Spartan',      color:'#b5653a',hp:100,speed:165,spin:.0001,dmg:20.89,  cd:.5, arms:[{a:0,l:30}],desc:'Spear and shield to the front. Nothing gets through; its back is bare.',sig:['Phalanx','A wider shield and a longer spear'],sfx:{hit:'iron'}};
FIGHTERS.alchemist={name:'Alchemist',    color:'#c77b2b',hp:100,speed:160,spin:0,    dmg:22.64,  cd:1.3,arms:[],desc:'Lobs flasks: fire, then acid, then a tonic for whoever reaches it first.',sig:['Bigger flasks','Wider pools that last longer'],sfx:{hit:'glass',shot:'whoosh'}};
FIGHTERS.plague   ={name:'Plague Doc',   color:'#7d8a99',hp:100,speed:160,spin:0,    dmg:10.89,   cd:.5, arms:[],desc:'Walks in a foul cloud. The longer you breathe it, the worse it gets.',sig:['Thicker fog','A wider cloud'],sfx:{hit:'soft'}};
FIGHTERS.cowboy   ={name:'Cowboy',       color:'#b98a55',hp:100,speed:170,spin:0,    dmg:9.61,  cd:1.3,arms:[],desc:'Shots bounce off the walls, and hit hardest from far away.',sig:['Trick shot','One more ricochet, and a quicker draw'],sfx:{hit:'punch',shot:'gun'}};
FIGHTERS.medusa   ={name:'Medusa',       color:'#6aa84f',hp:100,speed:160,spin:0,    dmg:20.77,  cd:2.6,arms:[],desc:'Run at her face and you turn to stone. From behind she is harmless.',sig:['Stone gaze','A wider gaze that holds for longer'],sfx:{hit:'thump'}};
ROSTER.push('emperor','samurai','viking','gladiator','pharaoh','spartan','alchemist','plague','cowboy','medusa');

const p4clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));
// the angle between two directions, 0..PI
function p4turn(a,b){const d=Math.abs(a-b)%6.2832;return d>Math.PI?6.2832-d:d}

// Emperor: a ring of guards. A blow from a guard's side lands on the guard instead; a guard can only soak so much, and
// one fallen guard at a time is called back up. Many small hits strip the ring bare; a few big ones mostly bounce off it.
BEHAVE.emperor={
  init(f){
    const n=3+((f.sig+1)>>1),S=f.s;
    S.g=[];S.rot=0;S.call=0;S.ghp=f.max*.11;
    for(let k=0;k<n;k++)S.g.push({a:k/n*6.2832,up:1,hp:S.ghp,cd:0,x:f.x,y:f.y});
  },
  tick(f,e,m,rage){
    const D=FIGHTERS.emperor,S=f.s,R=f.r+13;
    S.rot+=2.2*f.spdMul*DT;
    let down=null;
    for(const q of S.g){
      q.x=f.x+Math.cos(S.rot+q.a)*R;q.y=f.y+Math.sin(S.rot+q.a)*R;
      if(!q.up){if(!down)down=q;continue}
      if(q.cd>0)q.cd-=DT;
      else if(!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+7){q.cd=D.cd/f.spdMul;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
    }
    if(down){
      S.call+=DT;
      if(S.call>=(f.sig>=2?3.6:5)/f.spdMul){S.call=0;down.up=1;down.hp=S.ghp;m.events.push({k:'spawn',x:down.x,y:down.y,i:f.i})}
    }else S.call=0;
  },
  guard(f,src,dmg,m){
    const S=f.s,a=Math.atan2(src.y-f.y,src.x-f.x);
    let best=null,bd=1.2;                                 // only a guard standing on the attacker's side can step in
    for(const q of S.g)if(q.up){const d=p4turn(S.rot+q.a,a);if(d<bd){bd=d;best=q}}
    if(!best||!(dmg>0))return 1;
    const took=Math.min(dmg,best.hp);
    best.hp-=took;
    if(best.hp<=.01){best.up=0;m.events.push({k:'pop',x:best.x,y:best.y,i:f.i})}
    else m.events.push({k:'parry',x:best.x,y:best.y});
    return (dmg-took)/dmg;
  }};

// Samurai: nothing until the rival comes within reach, then one cut that carries it straight through. Sheathing takes a
// while, and it is slow and harmless until the blade is home.
BEHAVE.samurai={
  init(f){f.s.t=.8;f.s.cut=0;f.s.dash=0;f.s.x1=f.s.x2=f.x;f.s.y1=f.s.y2=f.y},
  tick(f,e,m,rage){
    const D=FIGHTERS.samurai,S=f.s;
    if(S.cut>0)S.cut-=DT;
    if(S.dash>0)S.dash-=DT;
    if(S.t>0){S.t-=DT;return}
    const d=gap(e,f)||1;
    if(e.gone||d>f.r+e.r+24+7*f.sig)return;
    S.t=D.cd*(1-.15*f.sig)/f.spdMul;S.cut=.22;S.dash=.14;
    S.x1=f.x;S.y1=f.y;S.x2=e.x;S.y2=e.y;
    f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed;
    m.hurt(e,D.dmg*f.dmgMul*rage,f);m.knock(e,f);
  },
  fast:f=>f.s.dash>0?2.6:f.s.t>0?.8:1};

// Viking: axes thrown at where the rival is going. The throwing arm speeds up as its health falls: at death's door it
// throws two and a half times as often as when fresh.
BEHAVE.viking={
  init(f){f.s.axes=[];f.s.t=.7},
  tick(f,e,m,rage){
    const D=FIGHTERS.viking,S=f.s,A=S.axes;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd*(.4+.6*Math.max(0,f.hp)/f.max)/f.spdMul;
      const sp=235+30*f.sig,d=gap(e,f)||1,lead=d/sp*.7,an=Math.atan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x)+(m.rnd()-.5)*.16;
      A.push({x:f.x+Math.cos(an)*f.r,y:f.y+Math.sin(an)*f.r,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,r:7+2*f.sig,rot:an});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    for(let i=A.length-1;i>=0;i--){
      const q=A[i];
      q.x+=q.vx*DT;q.y+=q.vy*DT;q.rot+=15*DT;
      if(!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+q.r){m.hurt(e,D.dmg*(1+.15*f.sig)*f.dmgMul*rage,f);m.knock(e,q);A.splice(i,1);continue}
      if(q.x<-10||q.x>AW+10||q.y<-10||q.y>AW+10)A.splice(i,1);
    }
  }};

// Gladiator: the net first. A netted rival is held where it stands, tangled and slowed but still able to swing, and the
// gladiator closes to trident's length and jabs again and again until the net gives. Without the net its trident is a
// slow, half-hearted poke.
BEHAVE.gladiator={
  init(f){f.s.net=null;f.s.pin=null;f.s.t=.9;f.s.jab=0;f.s.jabA=0;f.s.hold=false},
  tick(f,e,m,rage){
    const D=FIGHTERS.gladiator,S=f.s,d=gap(e,f)||1;
    if(S.jab>0)S.jab-=DT;
    if(S.jabA>0)S.jabA-=DT;
    if(S.pin){
      const P=S.pin;
      P.t-=DT;
      if(P.t<=0||Math.hypot(e.x-P.x,e.y-P.y)>30){S.pin=null;S.t=D.cd/f.spdMul}   // it gave way, or the rival vanished out of it
      else{
        e.x=P.x;e.y=P.y;e.slowT=Math.max(e.slowT,.2);
        S.hold=d<f.r+e.r+20;
        f.vx=(e.x-f.x)/d*f.speed;f.vy=(e.y-f.y)/d*f.speed;
      }
    }else if(S.net){
      const q=S.net;
      q.x+=q.vx*DT;q.y+=q.vy*DT;q.d+=330*DT;
      if(!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+q.r){
        S.net=null;S.pin={x:e.x,y:e.y,t:1.2+.3*f.sig,r:e.r};
        m.hurt(e,D.dmg*.3*f.dmgMul*rage,f);
        m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Netted',i:f.i});
      }else if(q.d>q.range||q.x<0||q.x>AW||q.y<0||q.y>AW){S.net=null;S.t=D.cd/f.spdMul}
    }else{
      S.t-=DT;
      if(S.t<=0&&!e.gone){
        const lead=d/330*.75,an=Math.atan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x)+(m.rnd()-.5)*.1;
        S.net={x:f.x,y:f.y,vx:Math.cos(an)*330,vy:Math.sin(an)*330,d:0,range:185+20*f.sig,r:11+3*f.sig};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
    }
    if(S.jab<=0&&!e.gone&&d<f.r+e.r+(S.pin?27:20)){
      S.jab=(S.pin?.34:1.3)/f.spdMul;S.jabA=.12;
      m.hurt(e,D.dmg*(S.pin?1:.5)*f.dmgMul*rage,f);
    }
  },
  fast(f){return f.s.pin?(f.s.hold?.04:2.2):1}};

// Pharaoh: no weapon at all. Once a second the curse bites, and each bite is worse than the last. A single blow worth a
// good part of the Pharaoh's health breaks its hold and halves the curse.
BEHAVE.pharaoh={
  init(f){f.s.n=0;f.s.t=1.2;f.s.lift=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.pharaoh,S=f.s;
    if(S.lift>0)S.lift-=DT;
    S.t-=DT;
    if(S.t>0)return;
    S.t=D.cd/f.spdMul;
    S.n=Math.min(14,S.n+1+.34*f.sig);
    if(!e.gone)m.hurt(e,D.dmg*(.4+.2*S.n)*f.dmgMul*rage,f);
  },
  hurt(f,src,dmg,m){
    if(dmg<f.max*.11||f.s.n<2)return;
    f.s.n*=.5;f.s.lift=.5;
    m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Curse broken',i:src.i});
  }};

// Spartan: the spear and the shield both point where it is going. Hits from ahead do nothing at all; hits from behind
// land half as hard again. Every bounce off a wall or a body turns its back on something.
BEHAVE.spartan={
  init(f){
    const S=f.s;
    S.clang=0;S.arc=.95+.18*f.sig;S.head=Math.atan2(f.vy,f.vx);f.ang=S.head;
    for(const a of f.arms)if(!a.extra)a.l*=1+.15*f.sig;
  },
  tick(f){const S=f.s;if(S.clang>0)S.clang-=DT;S.head=Math.atan2(f.vy,f.vx);f.ang=S.head},
  guard(f,src,dmg,m){
    const S=f.s,d=p4turn(S.head,Math.atan2(src.y-f.y,src.x-f.x));
    if(d<S.arc){
      if(S.clang<=0)m.events.push({k:'parry',x:f.x+Math.cos(S.head)*f.r,y:f.y+Math.sin(S.head)*f.r});
      S.clang=.18;return 0;
    }
    return d>2.2?1.5:1;
  }};

// Alchemist: three flasks in turn. Fire and acid are lobbed at where the rival is standing and leave a pool: fire burns,
// acid stings and makes everything else hurt more. The third is a tonic that lands ahead of the alchemist itself, and
// heals whichever of the two gets to it first.
BEHAVE.alchemist={
  init(f,m){const S=f.s;S.fl=[];S.pools=[];S.t=.8;S.k=(m.rnd()*3)|0;S.acidT=0;S.acidOn=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.alchemist,S=f.s;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/f.spdMul;
      const k=S.k;S.k=(k+1)%3;
      S.fl.push({k,x0:f.x,y0:f.y,x:k===2?p4clamp(f.x+f.vx*.75,16):e.x,y:k===2?p4clamp(f.y+f.vy*.75,16):e.y,t:0});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    for(let i=S.fl.length-1;i>=0;i--){
      const q=S.fl[i];
      q.t+=DT;
      if(q.t<.5)continue;
      S.fl.splice(i,1);
      const r=q.k===2?17:30+5*f.sig;
      S.pools.push({k:q.k,x:q.x,y:q.y,r,t:0,life:q.k===2?5:3+.7*f.sig,cd:0});
      m.events.push({k:'burst',x:q.x,y:q.y,n:7,i:f.i});
      if(q.k<2&&!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<r+e.r*.5)m.hurt(e,D.dmg*.7*f.dmgMul*rage,f);   // caught by the splash
    }
    for(let i=S.pools.length-1;i>=0;i--){
      const q=S.pools[i];
      q.t+=DT;
      if(q.cd>0)q.cd-=DT;
      const inE=!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r*.4;
      if(q.k===0){if(inE&&q.cd<=0){q.cd=.4;m.hurt(e,D.dmg*.5*f.dmgMul*rage,f)}}
      else if(q.k===1){
        if(inE){S.acidT=1.2;if(q.cd<=0){q.cd=.5;m.hurt(e,D.dmg*.25*f.dmgMul*rage,f)}}
      }else{
        const who=Math.hypot(f.x-q.x,f.y-q.y)<q.r+f.r?f:inE||(!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r)?e:null;
        if(who){
          const h=Math.min(who.max*.09,who.max-who.hp);
          if(h>.05){who.hp+=h;m.events.push({k:'heal',x:who.x,y:who.y,dmg:h,i:who.i})}
          S.pools.splice(i,1);continue;
        }
      }
      if(q.t>q.life)S.pools.splice(i,1);
    }
    // acid eats at whatever protects the rival: for a moment after touching it, every hit lands 40% harder
    if(S.acidT>0){S.acidT-=DT;if(!S.acidOn){S.acidOn=1;e.armor*=1.4}}
    else if(S.acidOn){S.acidOn=0;e.armor/=1.4}
  }};

// Plague Doctor: the cloud does little to a rival that passes through, and a great deal to one that lingers. It chokes:
// a rival inside it moves slowly, so getting out takes a while. Exposure builds while inside and fades slowly outside,
// so every visit starts worse than the last.
BEHAVE.plague={
  init(f){f.s.x=0;f.s.t=.5;f.s.age=0;f.s.R=72+6*f.sig},
  tick(f,e,m,rage){
    const D=FIGHTERS.plague,S=f.s;
    S.age+=DT;
    const inside=!e.gone&&gap(e,f)<S.R+e.r*.5;
    S.x=inside?Math.min(1,S.x+DT/2):Math.max(0,S.x-DT/7);
    if(inside)e.slowT=Math.max(e.slowT,.2);
    S.t-=DT;
    if(S.t>0)return;
    S.t=D.cd/f.spdMul;
    if(inside)m.hurt(e,D.dmg*(.25+1.75*S.x)*f.dmgMul*rage,f);
  }};

// Cowboy: a revolver. Shots skip off the walls and can be knocked down by a weapon. The further away the rival is when
// the trigger is pulled, the harder the shot hits: up close it is barely a slap.
BEHAVE.cowboy={
  init(f){f.s.shots=[];f.s.t=.9;f.s.flash=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.cowboy,S=f.s,Q=S.shots;
    if(S.flash>0)S.flash-=DT;
    S.t-=DT;
    if(S.t<=0&&!e.gone){
      S.t=D.cd/(1+.2*f.sig)/f.spdMul;S.flash=.08;
      const d=gap(e,f)||1,far=Math.min(1,Math.max(0,(d-70)/120)),lead=d/400*.5;
      const an=Math.atan2(e.y+e.vy*lead-f.y,e.x+e.vx*lead-f.x)+(m.rnd()-.5)*.2;
      Q.push({x:f.x+Math.cos(an)*f.r,y:f.y+Math.sin(an)*f.r,vx:Math.cos(an)*400,vy:Math.sin(an)*400,b:1+f.sig,pow:.5+1.5*far,t:0});
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      if(far>=1)m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'High noon',i:f.i});
    }
    const es=Q.length?segs(e):null;
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.x+=q.vx*DT;q.y+=q.vy*DT;q.t+=DT;
      let gone=q.t>2.5,hitWall=false;
      if(q.x<0){q.x=0;q.vx=Math.abs(q.vx);hitWall=true}else if(q.x>AW){q.x=AW;q.vx=-Math.abs(q.vx);hitWall=true}
      if(q.y<0){q.y=0;q.vy=Math.abs(q.vy);hitWall=true}else if(q.y>AW){q.y=AW;q.vy=-Math.abs(q.vy);hitWall=true}
      if(hitWall){if(q.b>0){q.b--;m.events.push({k:'parry',x:q.x,y:q.y})}else gone=true}
      if(!gone)for(const s of es)if(distPS(q.x,q.y,s[0],s[1],s[2],s[3])<5||(s[4]&&Math.hypot(q.x-s[2],q.y-s[3])<s[4]+4)){gone=true;m.events.push({k:'parry',x:q.x,y:q.y});break}
      if(!gone&&!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+3){gone=true;m.hurt(e,D.dmg*q.pow*f.dmgMul*rage,f)}
      if(gone)Q.splice(i,1);
    }
  }};

// Medusa: she looks where she is going. A rival inside her gaze that is also heading her way turns to stone for a moment
// and cracks (most of that is a blow like any other; the rest is the stone itself splitting). Her snakes nip at anything she runs into face first; from behind there is nothing to fear.
BEHAVE.medusa={
  init(f){const S=f.s;S.t=1.2;S.stone=0;S.age=0;S.head=Math.atan2(f.vy,f.vx);S.range=115+15*f.sig;S.cone=.6+.12*f.sig},
  tick(f,e,m,rage){
    const D=FIGHTERS.medusa,S=f.s;
    S.age+=DT;S.head=Math.atan2(f.vy,f.vx);
    if(S.stone>0)S.stone-=DT;
    if(S.t>0){S.t-=DT;return}
    if(e.gone)return;
    const d=gap(e,f)||1;
    if(d>S.range+e.r||p4turn(S.head,Math.atan2(e.y-f.y,e.x-f.x))>S.cone)return;        // she must be facing it
    if((e.vx*(f.x-e.x)+e.vy*(f.y-e.y))/d<.35*Math.hypot(e.vx,e.vy))return;             // and it must be coming her way
    S.t=D.cd/f.spdMul;S.stone=.8+.2*f.sig;
    e.stunT=Math.max(e.stunT,S.stone);
    m.events.push({k:'ring',x:e.x,y:e.y,r0:e.r+16,r:e.r,life:.3,w:3,col:'#c9cfc4',i:f.i});
    m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Stone',col:'#d8ddd2',i:f.i});
    m.hurt(e,D.dmg*.7*f.dmgMul*rage,f);
    m.hurt(e,D.dmg*.3*f.dmgMul*rage,f,true);          // stone cracks whatever it was hiding behind: this part is not a blow and cannot be blocked
  },
  touch:(f,e)=>p4turn(f.s.head,Math.atan2(e.y-f.y,e.x-f.x))<1.2?FIGHTERS.medusa.dmg*.35:0};

// ---------- art ----------
// "Gilded" medallions, as in the other packs: crest(fg,bg) is the emblem (origin at the medallion centre, enamel field at
// radius 1); arm/under/back/over add the weapons and effects. Everything draws with g, the current context.
const P4={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',GOLD_LO:typeof GOLD_LO!=='undefined'?GOLD_LO:'#7a5d2b',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  CRIMSON:typeof CRIMSON!=='undefined'?CRIMSON:'#8f2732',
  STEEL:typeof STEEL!=='undefined'?STEEL:'#d7dde2',STEEL_LO:typeof STEEL_LO!=='undefined'?STEEL_LO:'#8b959d',
  WOOD:typeof WOOD!=='undefined'?WOOD:'#6f4d30',LEATHER:typeof LEATHER!=='undefined'?LEATHER:'#3a2a1e',
  ASH:'#c9a877',BRONZE:'#b9803a',BRONZE_HI:'#ecc27a',SAND:'#e2c98a',LACQUER:'#2a1b22',
  POOL:['255,128,48','150,214,70','140,214,245'],POOLC:['#f47a2c','#8fd43a','#8fd6f2'],
};
const P4_TAU=6.2832;
const p4disc=(x,y,r)=>{g.beginPath();g.arc(x,y,Math.max(.1,r),0,P4_TAU)};
function p4shade(hex,k){
  const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return hex;
  const n=parseInt(m[1],16),f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
  return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';
}
function p4glow(x,y,r,rgb,a){
  r=Math.max(.5,r);a=Math.max(0,Math.min(1,a));
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a.toFixed(3)+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p4disc(x,y,r);g.fill();
}
function p4rod(col,w){g.lineCap='round';g.lineJoin='round';g.strokeStyle=P4.EDGE;g.lineWidth=w+1.6;g.stroke();g.strokeStyle=col;g.lineWidth=w;g.stroke()}
function p4seg(x1,y1,x2,y2,col,w){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);p4rod(col,w)}
function p4solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P4.EDGE;g.lineWidth=1;g.lineJoin='round';g.stroke()}
// a throwing axe: ash handle, one broad curved blade. rot is the way the handle points.
function p4axe(x,y,rot,size){
  const c=Math.cos(rot),s=Math.sin(rot),hx=x+c*size*.55,hy=y+s*size*.55,nx=-s,ny=c;
  p4seg(x-c*size,y-s*size,x+c*size,y+s*size,P4.ASH,1.5);
  g.beginPath();g.moveTo(hx-c*size*.3,hy-s*size*.3);g.lineTo(hx-c*size*.62+nx*size,hy-s*size*.62+ny*size);
  g.quadraticCurveTo(hx+nx*size*1.3,hy+ny*size*1.3,hx+c*size*.62+nx*size,hy+s*size*.62+ny*size);g.lineTo(hx+c*size*.3,hy+s*size*.3);g.closePath();p4solid(P4.STEEL);
}
// a round net: rim, mesh and lead weights
function p4net(x,y,r,a){
  g.globalAlpha=a;g.lineCap='round';
  p4disc(x,y,r);g.strokeStyle='rgba(9,11,13,.7)';g.lineWidth=2.4;g.stroke();g.strokeStyle=P4.SAND;g.lineWidth=1.1;g.stroke();
  g.beginPath();
  for(const an of [.7854,-.7854]){
    const c=Math.cos(an),s=Math.sin(an);
    for(let k=-2;k<=2;k++){const o=k*r*.36,h=Math.sqrt(Math.max(0,r*r-o*o));g.moveTo(x-s*o-c*h,y+c*o-s*h);g.lineTo(x-s*o+c*h,y+c*o+s*h)}
  }
  g.strokeStyle=P4.SAND;g.lineWidth=.7;g.stroke();
  g.fillStyle=P4.STEEL_LO;for(let k=0;k<6;k++){p4disc(x+Math.cos(k*1.0472)*r,y+Math.sin(k*1.0472)*r,1.5);g.fill()}
  g.globalAlpha=1;
}

LOOKS.emperor={
  crest(fg,bg){                                           // a general's bicorne hat with a gold cockade
    g.fillStyle=fg;
    g.beginPath();g.ellipse(0,.34,.25,.27,0,0,P4_TAU);g.fill();
    g.beginPath();g.moveTo(-.78,.02);g.quadraticCurveTo(-.3,-.75,0,-.5);g.quadraticCurveTo(.3,-.75,.78,.02);g.quadraticCurveTo(0,-.16,-.78,.02);g.fill();
    g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();g.moveTo(-.6,-.02);g.quadraticCurveTo(0,-.22,.6,-.02);g.stroke();
    g.fillStyle='#d6b25a';g.beginPath();g.arc(0,-.3,.1,0,P4_TAU);g.fill();g.fillStyle=bg;g.beginPath();g.arc(0,-.3,.04,0,P4_TAU);g.fill();
  },
  over(f){                                                // the guard: small soldiers in its colours, bayonets outward
    const S=f.s;
    for(const q of S.g){
      if(!q.up){g.setLineDash([2,2.5]);p4disc(q.x,q.y,5);g.strokeStyle='rgba(243,234,214,.4)';g.lineWidth=.8;g.stroke();g.setLineDash([]);continue}
      const a=Math.atan2(q.y-f.y,q.x-f.x),c=Math.cos(a),s=Math.sin(a);
      p4seg(q.x+c*4,q.y+s*4,q.x+c*12,q.y+s*12,P4.STEEL,1.1);
      p4disc(q.x,q.y,5.8);p4solid(f.col||FIGHTERS.emperor.color);
      g.strokeStyle=P4.IVORY;g.lineWidth=1.2;g.lineCap='round';g.beginPath();g.moveTo(q.x-3,q.y-3);g.lineTo(q.x+3,q.y+3);g.moveTo(q.x+3,q.y-3);g.lineTo(q.x-3,q.y+3);g.stroke();
      g.fillStyle=P4.GOLD_HI;p4disc(q.x,q.y,1.3);g.fill();
      if(q.hp<S.ghp*.99){g.strokeStyle='rgba(255,90,70,.85)';g.lineWidth=1;g.beginPath();g.arc(q.x,q.y,7.4,-1.5708,-1.5708+P4_TAU*(1-q.hp/S.ghp));g.stroke()}
    }
  }};

LOOKS.samurai={
  crest(fg,bg){                                           // a kabuto: crescent, bowl and flaring neck guard
    g.lineJoin='round';g.fillStyle=fg;
    g.beginPath();g.moveTo(-.66,-.68);g.quadraticCurveTo(0,.12,.66,-.68);g.quadraticCurveTo(0,-.24,-.66,-.68);g.fill();
    g.beginPath();g.moveTo(-.42,.12);g.quadraticCurveTo(-.42,-.4,0,-.4);g.quadraticCurveTo(.42,-.4,.42,.12);g.closePath();g.fill();
    for(const s of [-1,1]){g.beginPath();g.moveTo(s*.42,.06);g.lineTo(s*.74,.52);g.lineTo(s*.26,.6);g.lineTo(s*.2,.12);g.closePath();g.fill()}
    g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();g.moveTo(-.44,.12);g.lineTo(.44,.12);g.stroke();
    g.fillStyle='#d6b25a';g.beginPath();g.arc(0,-.14,.07,0,P4_TAU);g.fill();
  },
  over(f){
    const S=f.s,a=f.aim,r=f.r,bx=f.x+Math.cos(a+1.5)*(r+3),by=f.y+Math.sin(a+1.5)*(r+3),ux=Math.cos(a+2.7),uy=Math.sin(a+2.7);
    p4seg(bx,by,bx+ux*26,by+uy*26,P4.LACQUER,3);          // the scabbard, worn at the hip
    g.fillStyle=P4.GOLD;p4disc(bx+ux*26,by+uy*26,1.6);g.fill();
    if(S.t>0){                                            // blade still out: it is being brought home
      const p=Math.min(1,S.t/.8),b=a+2.7-Math.PI+1.3*p;
      p4seg(bx,by,bx+Math.cos(b)*29,by+Math.sin(b)*29,P4.STEEL,1.7);
    }else p4seg(bx,by,bx-ux*9,by-uy*9,P4.LEATHER,2.2);     // sheathed: only the hilt shows
    p4disc(bx,by,2.3);p4solid(P4.GOLD);
    if(S.cut>0){                                          // the cut itself: one bright line through the rival
      const dx=S.x2-S.x1,dy=S.y2-S.y1,d=Math.hypot(dx,dy)||1,vx=dx/d,vy=dy/d,p=Math.max(0,Math.min(1,S.cut/.22));
      g.lineCap='round';g.beginPath();g.moveTo(S.x1,S.y1);g.lineTo(S.x2+vx*30,S.y2+vy*30);
      g.strokeStyle='rgba(255,255,255,'+(.3*p).toFixed(3)+')';g.lineWidth=2+9*p;g.stroke();
      g.strokeStyle='rgba(255,255,255,'+(.95*p).toFixed(3)+')';g.lineWidth=1.6;g.stroke();
    }
  }};

LOOKS.viking={
  crest(fg,bg){                                           // a double-headed axe
    g.lineJoin='round';g.fillStyle=fg;
    g.fillRect(-.055,-.74,.11,1.46);
    for(const s of [-1,1]){g.beginPath();g.moveTo(s*.05,-.44);g.lineTo(s*.46,-.68);g.quadraticCurveTo(s*.84,-.2,s*.46,.28);g.lineTo(s*.05,.04);g.closePath();g.fill()}
    g.fillStyle=bg;g.fillRect(-.055,-.26,.11,.06);g.fillRect(-.055,-.1,.11,.06);
    g.fillStyle=fg;g.beginPath();g.arc(0,.72,.09,0,P4_TAU);g.fill();
  },
  over(f){
    for(const q of f.s.axes){
      g.strokeStyle='rgba(215,221,226,.22)';g.lineWidth=2;p4disc(q.x,q.y,q.r*1.25);g.stroke();     // the blur of its spin
      p4axe(q.x,q.y,q.rot,q.r);
    }
    const a=f.aim+1.25;p4axe(f.x+Math.cos(a)*(f.r+7),f.y+Math.sin(a)*(f.r+7),f.aim-.5,6.5);        // the next one, in hand
  }};

LOOKS.gladiator={
  crest(fg){                                              // a trident
    g.lineCap='round';g.lineJoin='round';g.strokeStyle=fg;g.fillStyle=fg;
    g.lineWidth=.11;g.beginPath();g.moveTo(0,.72);g.lineTo(0,-.5);g.stroke();
    g.lineWidth=.1;g.beginPath();g.moveTo(-.42,-.5);g.quadraticCurveTo(-.42,-.08,0,-.08);g.quadraticCurveTo(.42,-.08,.42,-.5);g.stroke();
    for(const x of [-.42,0,.42]){const y=x?-.5:-.56;g.beginPath();g.moveTo(x,y-.24);g.lineTo(x-.12,y);g.lineTo(x+.12,y);g.closePath();g.fill()}
    g.lineWidth=.07;g.beginPath();g.moveTo(-.14,.32);g.lineTo(.14,.32);g.stroke();
  },
  under(f){const P=f.s.pin;if(P)p4net(P.x,P.y,P.r+9,.9)},  // the net spread on the floor around its catch
  over(f){
    const S=f.s,a=f.aim,c=Math.cos(a),s=Math.sin(a),r=f.r,L=r+15+(S.jabA>0?9:0),tx=f.x+c*L,ty=f.y+s*L;
    p4seg(f.x+c*(r-3),f.y+s*(r-3),tx,ty,P4.BRONZE,1.8);   // the trident, always levelled at the rival
    g.beginPath();g.moveTo(tx-s*5+c*7,ty+c*5+s*7);g.lineTo(tx-s*5,ty+c*5);g.lineTo(tx+s*5,ty-c*5);g.lineTo(tx+s*5+c*7,ty-c*5+s*7);g.moveTo(tx,ty);g.lineTo(tx+c*9,ty+s*9);p4rod(P4.STEEL,1.3);
    if(S.net){const q=S.net;p4net(q.x,q.y,q.r*(.6+.4*Math.min(1,q.d/60)),1)}
    if(S.pin)p4net(S.pin.x,S.pin.y,S.pin.r+3,.85);
  }};

LOOKS.pharaoh={
  crest(fg,bg){                                           // the striped headdress
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    g.beginPath();g.moveTo(-.34,-.58);g.quadraticCurveTo(0,-.82,.34,-.58);g.lineTo(.72,.5);g.lineTo(.26,.62);g.lineTo(-.26,.62);g.lineTo(-.72,.5);g.closePath();g.fill();
    g.fillStyle=bg;g.beginPath();g.ellipse(0,-.04,.25,.33,0,0,P4_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();
    for(const s of [-1,1])for(let k=0;k<4;k++){const y=-.36+k*.22;g.moveTo(s*(.3+k*.02),y);g.lineTo(s*(.44+k*.08),y+.1)}
    g.stroke();
    g.fillStyle=fg;g.fillRect(-.055,.3,.11,.3);
    g.fillStyle='#d6b25a';g.beginPath();g.arc(0,-.56,.085,0,P4_TAU);g.fill();
  },
  back(f){p4glow(f.x,f.y,f.r+12,'226,201,138',.3+(f.s.lift>0?.4:0))},      // desert light; it flares when the curse is broken
  over(f,m){                                              // the curse: scarabs gathering around the rival, one for each bite so far
    const e=m&&m.f?m.f[1-f.i]:null,n=Math.floor(f.s.n);
    if(!e||e.hp<=0||e.gone||n<1)return;
    const t=m.t||0;
    for(let k=0;k<n;k++){
      const a=k/14*P4_TAU+t*1.3,x=e.x+Math.cos(a)*(e.r+6),y=e.y+Math.sin(a)*(e.r+6);
      g.fillStyle=P4.EDGE;p4disc(x,y,2.2);g.fill();g.fillStyle=k%2?'#d8b24a':'#2aa6a0';p4disc(x,y,1.5);g.fill();
    }
  }};

LOOKS.spartan={
  crest(fg,bg){                                           // a bronze helmet with a horsehair crest
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.lineWidth=.14;g.beginPath();g.moveTo(-.6,-.3);g.quadraticCurveTo(0,-1.16,.6,-.3);g.stroke();
    g.beginPath();g.moveTo(-.4,.62);g.lineTo(-.44,-.08);g.quadraticCurveTo(-.44,-.54,0,-.54);g.quadraticCurveTo(.44,-.54,.44,-.08);g.lineTo(.4,.62);g.closePath();g.fill();
    g.fillStyle=bg;g.fillRect(-.3,-.16,.6,.13);g.fillRect(-.065,-.06,.13,.7);
  },
  arm(f,A,x1,y1,x2,y2,an){                                // the spear: ash shaft, leaf-shaped head
    const c=Math.cos(an),s=Math.sin(an);
    p4seg(x1-c*5,y1-s*5,x2-c*8,y2-s*8,P4.ASH,1.7);
    g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-c*7-s*3,y2-s*7+c*3);g.lineTo(x2-c*11,y2-s*11);g.lineTo(x2-c*7+s*3,y2-s*7-c*3);g.closePath();p4solid(P4.STEEL);
  },
  over(f){                                                // the round shield, carried on the side it is heading
    const S=f.s,h=S.head,r=f.r,cx=f.x+Math.cos(h)*r*.95,cy=f.y+Math.sin(h)*r*.95,R=r*.56,hot=S.clang>0;
    g.strokeStyle='rgba(236,194,122,.55)';g.lineWidth=1;g.beginPath();g.arc(f.x,f.y,r+4,h-S.arc,h+S.arc);g.stroke();   // how much of it the shield covers
    const q=g.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R);q.addColorStop(0,hot?'#ffffff':P4.BRONZE_HI);q.addColorStop(.6,hot?'#ffe9c0':P4.BRONZE);q.addColorStop(1,'#6e4a1e');
    p4disc(cx,cy,R);p4solid(q);
    g.strokeStyle='rgba(60,36,10,.7)';g.lineWidth=.8;p4disc(cx,cy,R*.8);g.stroke();
    g.strokeStyle=P4.CRIMSON;g.lineWidth=Math.max(1,R*.16);g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(cx-R*.36,cy+R*.42);g.lineTo(cx,cy-R*.46);g.lineTo(cx+R*.36,cy+R*.42);g.stroke();
  }};

LOOKS.alchemist={
  crest(fg,bg){                                           // a round-bottomed flask, bubbling
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    g.beginPath();g.arc(0,.24,.44,0,P4_TAU);g.fill();
    g.fillRect(-.12,-.6,.24,.52);g.fillRect(-.2,-.7,.4,.11);
    g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();g.moveTo(-.4,.16);g.quadraticCurveTo(-.2,.06,0,.16);g.quadraticCurveTo(.2,.26,.4,.16);g.stroke();
    g.fillStyle=bg;for(const p of [[-.14,.4,.07],[.12,.34,.05],[.02,.52,.04]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P4_TAU);g.fill()}
    g.fillStyle=fg;for(const p of [[.3,-.5,.06],[.42,-.7,.045]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P4_TAU);g.fill()}
  },
  under(f){
    for(const q of f.s.pools){
      const a=Math.max(0,Math.min(1,(q.life-q.t)/.5)),rgb=P4.POOL[q.k];
      if(q.k===2){                                        // the tonic: a small bright puddle marked with a cross
        p4glow(q.x,q.y,q.r+8,rgb,.5*a);
        g.globalAlpha=a;p4disc(q.x,q.y,q.r*.6);p4solid('#dff4ff');
        g.fillStyle='#3d9fc4';g.fillRect(q.x-1.2,q.y-5,2.4,10);g.fillRect(q.x-5,q.y-1.2,10,2.4);g.globalAlpha=1;
        continue;
      }
      const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);
      gr.addColorStop(0,'rgba('+rgb+','+(.75*a).toFixed(3)+')');gr.addColorStop(.7,'rgba('+rgb+','+(.4*a).toFixed(3)+')');gr.addColorStop(1,'rgba('+rgb+',0)');
      p4disc(q.x,q.y,q.r);g.fillStyle=gr;g.fill();
      g.setLineDash(q.k?[2,3]:[5,3]);g.strokeStyle='rgba('+rgb+','+(.8*a).toFixed(3)+')';g.lineWidth=1;p4disc(q.x,q.y,q.r*.92);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(255,255,255,'+(.55*a).toFixed(3)+')';
      for(let k=0;k<4;k++){                               // flames flicker; acid bubbles rise
        const u=(q.t*(q.k?1.1:2.2)+k*.27)%1,an=k*1.7+q.x*.1,rr=q.r*(.25+.14*k);
        p4disc(q.x+Math.cos(an)*rr,q.y+Math.sin(an)*rr-u*(q.k?4:9),q.k?1.6*(1-u)+.4:2.2*(1-u)+.3);g.fill();
      }
    }
  },
  over(f){
    for(const q of f.s.fl){                               // flasks in the air, and where each will land
      const p=Math.max(0,Math.min(1,q.t/.5)),x=q.x0+(q.x-q.x0)*p,y=q.y0+(q.y-q.y0)*p-Math.sin(p*Math.PI)*22;
      g.setLineDash([3,3]);g.strokeStyle='rgba('+P4.POOL[q.k]+',.7)';g.lineWidth=1;p4disc(q.x,q.y,q.k===2?12:22);g.stroke();g.setLineDash([]);
      p4disc(x,y,4.2);p4solid(P4.POOLC[q.k]);
      g.fillStyle=P4.IVORY;g.fillRect(x-1.3,y-7.2,2.6,3.4);g.fillStyle='rgba(255,255,255,.7)';p4disc(x-1.3,y-1.4,1.1);g.fill();
    }
    const a=f.aim+1.2,k=f.s.k;                             // the next flask, in hand
    p4disc(f.x+Math.cos(a)*(f.r+5),f.y+Math.sin(a)*(f.r+5),3.4);p4solid(P4.POOLC[k]);
  }};

LOOKS.plague={
  crest(fg,bg){                                           // the beaked mask under a flat-brimmed hat
    g.lineJoin='round';g.fillStyle=fg;
    g.beginPath();g.arc(-.16,.02,.36,0,P4_TAU);g.fill();
    g.beginPath();g.moveTo(.02,-.26);g.lineTo(.8,.36);g.lineTo(-.02,.34);g.closePath();g.fill();
    g.fillRect(-.66,-.44,1,.11);g.fillRect(-.42,-.76,.52,.34);
    g.fillStyle=bg;g.beginPath();g.arc(-.1,-.04,.13,0,P4_TAU);g.fill();
    g.fillStyle=fg;g.beginPath();g.arc(-.1,-.04,.05,0,P4_TAU);g.fill();
    g.strokeStyle=bg;g.lineWidth=.04;g.beginPath();g.moveTo(.2,.08);g.lineTo(.56,.3);g.stroke();
  },
  under(f){                                               // the miasma: it thickens as the rival breathes more of it
    const S=f.s,R=S.R,x=S.x;
    p4glow(f.x,f.y,R,'128,150,78',.26+.22*x);
    for(let k=0;k<5;k++){
      const a=k*1.2566+S.age*.5,rr=R*(.48+.12*Math.sin(S.age*1.3+k*2.1));
      p4glow(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr,R*.4,'96,118,62',.16+.24*x);
    }
    g.setLineDash([3,5]);g.strokeStyle='rgba(176,196,116,'+(.3+.4*x).toFixed(3)+')';g.lineWidth=1;p4disc(f.x,f.y,R);g.stroke();g.setLineDash([]);
  },
  over(f){                                                // a cane with a smoking censer
    const a=f.aim+1.1,c=Math.cos(a),s=Math.sin(a),r=f.r;
    p4seg(f.x+c*(r-2),f.y+s*(r-2),f.x+c*(r+13),f.y+s*(r+13),P4.LEATHER,1.8);
    p4glow(f.x+c*(r+15),f.y+s*(r+15),7,'150,190,90',.55);
    p4disc(f.x+c*(r+15),f.y+s*(r+15),2.6);p4solid(P4.GOLD);
  }};

LOOKS.cowboy={
  crest(fg,bg){                                           // the hat
    g.lineJoin='round';g.lineCap='round';g.fillStyle=fg;
    g.beginPath();g.moveTo(-.8,.08);g.quadraticCurveTo(-.42,.5,0,.4);g.quadraticCurveTo(.42,.5,.8,.08);g.quadraticCurveTo(.4,.28,0,.2);g.quadraticCurveTo(-.4,.28,-.8,.08);g.fill();
    g.beginPath();g.moveTo(-.36,.26);g.quadraticCurveTo(-.4,-.56,-.12,-.5);g.quadraticCurveTo(0,-.4,.12,-.5);g.quadraticCurveTo(.4,-.56,.36,.26);g.closePath();g.fill();
    g.strokeStyle=bg;g.lineWidth=.07;g.beginPath();g.moveTo(-.36,.06);g.quadraticCurveTo(0,.16,.36,.06);g.stroke();
    g.fillStyle='#d6b25a';g.beginPath();for(let k=0;k<10;k++){const a=k/10*P4_TAU-1.5708,q=k%2?.045:.1;g.lineTo(Math.cos(a)*q,.1+Math.sin(a)*q)}g.closePath();g.fill();
  },
  over(f){
    const S=f.s,a=f.aim,c=Math.cos(a),s=Math.sin(a),r=f.r;
    p4seg(f.x+c*(r-1)-s*3.2,f.y+s*(r-1)+c*3.2,f.x+c*(r+1)-s*6,f.y+s*(r+1)+c*6,P4.WOOD,2.4);       // grip
    p4seg(f.x+c*(r-1),f.y+s*(r-1),f.x+c*(r+11),f.y+s*(r+11),'#6a7078',2.6);                     // barrel
    if(S.flash>0)p4glow(f.x+c*(r+15),f.y+s*(r+15),9,'255,220,150',.9);
    for(const q of S.shots){                              // the harder the shot, the fatter its streak
      g.lineCap='round';g.strokeStyle='rgba(255,226,160,.75)';g.lineWidth=.8+q.pow;g.beginPath();g.moveTo(q.x-q.vx*.028,q.y-q.vy*.028);g.lineTo(q.x,q.y);g.stroke();
      g.fillStyle='#fff3d0';g.strokeStyle=P4.EDGE;g.lineWidth=.4;p4disc(q.x,q.y,1.4+q.pow*.7);g.fill();g.stroke();
    }
  }};

LOOKS.medusa={
  crest(fg,bg){                                           // a face wreathed in snakes
    g.lineCap='round';g.lineJoin='round';g.fillStyle=fg;g.strokeStyle=fg;
    g.lineWidth=.09;
    for(let k=0;k<6;k++){
      const a=-2.75+k*.47,c=Math.cos(a),s=Math.sin(a),w=k%2?.16:-.16;
      g.beginPath();g.moveTo(c*.3,.14+s*.3);g.quadraticCurveTo(c*.5-s*w,.14+s*.5+c*w,c*.7,.14+s*.7);g.stroke();
      g.beginPath();g.arc(c*.74,.14+s*.74,.075,0,P4_TAU);g.fill();
    }
    g.beginPath();g.ellipse(0,.2,.34,.4,0,0,P4_TAU);g.fill();
    g.fillStyle='#e7c46a';for(const s of [-1,1]){g.beginPath();g.ellipse(s*.14,.14,.09,.055,0,0,P4_TAU);g.fill()}
    g.fillStyle=bg;for(const s of [-1,1]){g.beginPath();g.arc(s*.14,.14,.03,0,P4_TAU);g.fill()}
    g.strokeStyle=bg;g.lineWidth=.04;g.beginPath();g.moveTo(-.1,.4);g.lineTo(.1,.4);g.stroke();
  },
  under(f){                                               // her gaze: bright when it can strike, dim while she gathers it
    const S=f.s,h=S.head,ready=S.t<=0,R=S.range;
    const q=g.createRadialGradient(f.x,f.y,f.r,f.x,f.y,R);
    q.addColorStop(0,'rgba(170,240,150,'+(ready?.34:.1)+')');q.addColorStop(1,'rgba(170,240,150,0)');
    g.fillStyle=q;g.beginPath();g.moveTo(f.x,f.y);g.arc(f.x,f.y,R,h-S.cone,h+S.cone);g.closePath();g.fill();
    if(ready){
      g.strokeStyle='rgba(200,250,180,.5)';g.lineWidth=.8;g.setLineDash([4,4]);g.beginPath();
      g.moveTo(f.x+Math.cos(h-S.cone)*f.r,f.y+Math.sin(h-S.cone)*f.r);g.lineTo(f.x+Math.cos(h-S.cone)*R,f.y+Math.sin(h-S.cone)*R);
      g.moveTo(f.x+Math.cos(h+S.cone)*f.r,f.y+Math.sin(h+S.cone)*f.r);g.lineTo(f.x+Math.cos(h+S.cone)*R,f.y+Math.sin(h+S.cone)*R);
      g.stroke();g.setLineDash([]);
    }
  },
  back(f){                                                // snakes writhing round the rim, all but where she is looking
    const S=f.s,r=f.r;
    for(let k=1;k<8;k++){
      const a=S.head+k*.7854,c=Math.cos(a),s=Math.sin(a),w=Math.sin(S.age*6+k*1.9)*4,L=r+9+(k%2)*3;
      g.beginPath();g.moveTo(f.x+c*(r-2),f.y+s*(r-2));g.quadraticCurveTo(f.x+c*(r+5)-s*w,f.y+s*(r+5)+c*w,f.x+c*L,f.y+s*L);p4rod('#6fcf6a',1.6);
      g.fillStyle='#bff0a8';p4disc(f.x+c*L,f.y+s*L,1.5);g.fill();
    }
  },
  over(f,m){                                              // what she has turned to stone
    const e=m&&m.f?m.f[1-f.i]:null,S=f.s;
    if(!e||e.hp<=0||S.stone<=0)return;
    g.fillStyle='rgba(168,172,164,.62)';p4disc(e.x,e.y,e.r*.92);g.fill();
    g.strokeStyle='rgba(40,44,40,.8)';g.lineWidth=.9;g.lineJoin='round';g.beginPath();
    g.moveTo(e.x-e.r*.5,e.y-e.r*.6);g.lineTo(e.x-e.r*.1,e.y-e.r*.1);g.lineTo(e.x-e.r*.35,e.y+e.r*.3);g.moveTo(e.x-e.r*.1,e.y-e.r*.1);g.lineTo(e.x+e.r*.45,e.y+e.r*.15);g.lineTo(e.x+e.r*.3,e.y+e.r*.6);
    g.stroke();
  }};
