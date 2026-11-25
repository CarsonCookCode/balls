// Seventh pack of fighter classes for Ball Brawl: elements and nature. Same layout as brawl-pack2.js: the first half is pure
// simulation (it loads in Node with only brawl-sim.js before it), the second half is drawing and only runs when the page
// asks for it. Every top-level name here starts with p7/P7 so it cannot clash with the other files.

// ---------- simulation ----------
// dmg is each class's single damage dial; f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.tornado  ={name:'Tornado',    color:'#8fb4c9',hp:100,speed:185,spin:0,  dmg:25.13,cd:2.4,arms:[],desc:'Whirls the rival round, then hurls them at a wall.',sig:['Bigger funnel','Catches from further away, and more often'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.storm    ={name:'Storm Cloud',color:'#5c6f9c',hp:100,speed:120,spin:0,  dmg:25.7,cd:1.15,arms:[],desc:'Drifts slowly while lightning strikes the marked spots.',sig:['Thunderhead','One more bolt in every volley'],sfx:{hit:'',shot:'cast'}};
FIGHTERS.glacier  ={name:'Glacier',    color:'#9fd6e8',hp:100,speed:150,spin:0,  dmg:25.61,cd:1.2,arms:[],desc:'Leaves ice in its wake. Rivals bounce off it until it shatters on them.',sig:['Pack ice','Lays ice faster, and it shatters wider'],sfx:{hit:'glass'}};
FIGHTERS.mushroom ={name:'Mushroom',   color:'#c9584c',hp:100,speed:150,spin:0,  dmg:8.32,cd:1.1,arms:[],desc:'Scatters spores that grow into mushrooms and burst into poison.',sig:['Fairy ring','More mushrooms, bigger clouds'],sfx:{hit:'soft',shot:'pop'}};
FIGHTERS.cactus   ={name:'Cactus',     color:'#5fae5a',hp:100,speed:160,spin:0,  dmg:10.57,cd:.5, arms:[],desc:'Every hit it takes sends needles flying in all directions.',sig:['More needles','More needles in every burst'],sfx:{hit:'tick',shot:'loose'}};
FIGHTERS.tide     ={name:'Tide',       color:'#3f8fd1',hp:100,speed:165,spin:0,  dmg:35.6,cd:3.2,arms:[],desc:'Sends a wave across the arena that slams the rival into the far wall.',sig:['Spring tide','Waves come more often'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.quake    ={name:'Quake',      color:'#a8794a',hp:100,speed:200,spin:0,  dmg:19.5,cd:.6, arms:[],desc:'Shakes the ground when it hits a wall. Rivals near any wall are hurt.',sig:['Aftershock','The danger reaches further from the walls'],sfx:{hit:'thump'}};
FIGHTERS.firefly  ={name:'Firefly',    color:'#e8d24a',hp:75, speed:230,spin:0,  dmg:4.54,cd:.35,arms:[],desc:'Quick and frail. Every touch leaves an ember that keeps burning.',sig:['Wildfire','More embers that burn hotter and for longer'],sfx:{hit:'tick'}};
FIGHTERS.crystal  ={name:'Crystal',    color:'#b9a7f0',hp:100,speed:165,spin:4.4,dmg:15.49,cd:.4, arms:[{a:0,l:24,d:.8},{a:Math.PI,l:24,d:.8}],desc:'Part of every hit from a distance bounces back at whoever sent it.',sig:['Flawless','Sends back more, and grows another shard'],sfx:{hit:'glass'}};
FIGHTERS.sandstorm={name:'Sandstorm',  color:'#d9b06a',hp:100,speed:170,spin:0,  dmg:9.86,cd:.5, arms:[],desc:'Rivals caught in its sand take more and more damage from everything.',sig:['Dust devil','A wider cloud of sand'],sfx:{hit:''}};
ROSTER.push('tornado','storm','glacier','mushroom','cactus','tide','quake','firefly','crystal','sandstorm');

const p7clamp=(v,r)=>Math.min(AW-r,Math.max(r,v));

// Tornado: when the rival strays close it is caught, whirled round the funnel, and thrown outwards. The wall does the
// damage, and a longer flight means a harder landing.
BEHAVE.tornado={
  init(f){f.s.t=1.2;f.s.hold=0;f.s.a=0;f.s.w=11;f.s.fl=null},
  tick(f,e,m,rage){
    const D=FIGHTERS.tornado,S=f.s;
    if(S.fl){                                              // the rival is in the air
      const q=S.fl;q.t-=DT;
      if(e.gone||q.t<=0)S.fl=null;
      else{
        e.x=p7clamp(e.x+q.ux*270*DT,e.r);e.y=p7clamp(e.y+q.uy*270*DT,e.r);q.d+=(270+e.speed)*DT;
        const wall=(q.ux>.35&&e.x>=AW-e.r-.5)||(q.ux<-.35&&e.x<=e.r+.5)||(q.uy>.35&&e.y>=AW-e.r-.5)||(q.uy<-.35&&e.y<=e.r+.5);
        if(wall){
          S.fl=null;
          m.events.push({k:'burst',x:e.x,y:e.y,n:12,i:f.i});
          m.hurt(e,D.dmg*(.55+.9*Math.min(1,q.d/170))*f.dmgMul*rage,f);
        }
      }
    }
    if(S.hold>0){
      S.hold-=DT;
      if(e.gone){S.hold=0;S.t=1;return}                    // it slipped away: wait a moment before trying again
      S.a+=S.w*DT;
      const rad=f.r+e.r+12,c=Math.cos(S.a),s=Math.sin(S.a),dir=S.w>0?1:-1;
      e.x=p7clamp(f.x+c*rad,e.r);e.y=p7clamp(f.y+s*rad,e.r);
      e.vx=-s*e.speed*dir;e.vy=c*e.speed*dir;
      e.p7held=m.t;
      e.cd=Math.max(e.cd,.12);e.xcd=Math.max(e.xcd,.12);   // too dizzy to strike while it is whirled
      if(S.hold<=0){                                       // let go: straight out from the funnel
        e.vx=c*e.speed;e.vy=s*e.speed;
        S.fl={ux:c,uy:s,t:1.1,d:0};
        S.t=Math.max(1.3,D.cd/(1+.2*f.sig)/f.spdMul);       // the wait starts now, and has a floor, so speed cannot make one endless whirl
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone&&!(m.t-(f.p7held||-9)<.3)&&gap(e,f)<f.r+e.r+52+14*f.sig){
      S.hold=.7;S.a=Math.atan2(e.y-f.y,e.x-f.x);S.w=(m.rnd()<.5?-1:1)*11;
      e.p7held=m.t;                                        // marked at once, so two Tornadoes cannot catch each other in the same step
      m.events.push({k:'pull',x:f.x,y:f.y,i:f.i});
    }
  }};

// Storm Cloud: every volley marks several spots, one of them near where the rival is heading. Each is struck a moment later.
BEHAVE.storm={
  init(f){f.s.t=.8;f.s.marks=[]},
  tick(f,e,m,rage){
    const D=FIGHTERS.storm,S=f.s,Q=S.marks;
    S.t-=DT;
    if(S.t<=0){
      S.t=D.cd/f.spdMul;
      const n=3+f.sig;
      for(let k=0;k<n;k++){
        let x,y;
        if((k===0||k>2)&&!e.gone){const lead=.3+m.rnd()*.4,sc=k?90:50;x=e.x+e.vx*lead+(m.rnd()-.5)*sc;y=e.y+e.vy*lead+(m.rnd()-.5)*sc}
        else{x=m.rnd()*AW;y=m.rnd()*AW}
        Q.push({x:p7clamp(x,14),y:p7clamp(y,14),r:24,t:-k*.09,lit:0});
      }
      m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;
      if(!q.lit){
        if(q.t>=.7){
          q.lit=1;q.t=0;
          m.events.push({k:'zap',x:p7clamp(q.x+(m.rnd()-.5)*50,2),y:0,x2:q.x,y2:q.y,i:f.i});
          const reach=q.r+e.r*.45,d=Math.hypot(e.x-q.x,e.y-q.y);
          if(!e.gone&&d<reach)m.hurt(e,D.dmg*(.6+.8*(1-d/reach))*f.dmgMul*rage,f);     // the middle of a bolt hurts most
        }
      }else if(q.t>.2)Q.splice(i,1);
    }
  }};

// Glacier: drops a block of ice now and then. The rival bounces off a block; the second bounce (or old age) shatters it,
// and the shards hurt and chill a rival standing next to it. A block that has stood for a while is thicker and hurts more.
BEHAVE.glacier={
  init(f){f.s.t=.6;f.s.ice=[]},
  tick(f,e,m,rage){
    const D=FIGHTERS.glacier,S=f.s,Q=S.ice;
    S.t-=DT;
    if(S.t<=0){
      S.t=D.cd/(1+.3*f.sig)/f.spdMul;
      let ok=Q.length<5+2*f.sig&&(e.gone||Math.hypot(e.x-f.x,e.y-f.y)>e.r+18);
      for(const q of Q)if(Math.hypot(q.x-f.x,q.y-f.y)<32-3*f.sig)ok=false;
      if(ok)Q.push({x:f.x,y:f.y,r:10,hp:2,t:0,cd:0,rot:m.rnd()*6.2832});
    }
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.t+=DT;if(q.cd>0)q.cd-=DT;
      q.r=10+5*Math.min(1,q.t/5);                         // the ice thickens as it stands
      if(!e.gone){
        const dx=e.x-q.x,dy=e.y-q.y,d=Math.sqrt(dx*dx+dy*dy)||.01;
        if(d<e.r+q.r){
          const nx=dx/d,ny=dy/d,vn=e.vx*nx+e.vy*ny;
          e.x=p7clamp(q.x+nx*(e.r+q.r),e.r);e.y=p7clamp(q.y+ny*(e.r+q.r),e.r);
          if(vn<0){e.vx-=2*vn*nx;e.vy-=2*vn*ny;m.renorm(e)}
          if(q.cd<=0){q.cd=.25;q.hp--;m.events.push({k:'pop',x:q.x+nx*q.r,y:q.y+ny*q.r,i:f.i})}
        }
      }
      if(q.hp<=0||q.t>8){
        const reach=q.r+14+7*f.sig;
        m.events.push({k:'ring',x:q.x,y:q.y,r0:q.r,r:reach,life:.3,col:'#dff3ff',w:3,i:f.i});
        m.events.push({k:'burst',x:q.x,y:q.y,n:8,col:'#dff3ff',i:f.i});
        if(!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<reach+e.r){m.hurt(e,D.dmg*(.55+.9*Math.min(1,q.t/5))*f.dmgMul*rage,f);e.slowT=Math.max(e.slowT,.8)}
        Q.splice(i,1);
      }
    }
  }};

// Mushroom: lobs spores to random spots nearby. A spore grows into a mushroom; a grown one bursts when the rival comes
// close and leaves a cloud that hurts for as long as the rival stays in it.
BEHAVE.mushroom={
  init(f){f.s.t=.5;f.s.spores=[];f.s.caps=[];f.s.clouds=[]},
  tick(f,e,m,rage){
    const D=FIGHTERS.mushroom,S=f.s;
    S.t-=DT;
    if(S.t<=0){
      S.t=D.cd/f.spdMul;
      if(S.spores.length+S.caps.length<5+2*f.sig){
        const an=m.rnd()*6.2832,d=50+m.rnd()*70;
        S.spores.push({x0:f.x,y0:f.y,tx:p7clamp(f.x+Math.cos(an)*d,16),ty:p7clamp(f.y+Math.sin(an)*d,16),t:0});
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
    }
    for(let i=S.spores.length-1;i>=0;i--){
      const q=S.spores[i];
      q.t+=DT;
      if(q.t>=.55){S.caps.push({x:q.tx,y:q.ty,age:0});S.spores.splice(i,1)}
    }
    for(let i=S.caps.length-1;i>=0;i--){
      const q=S.caps[i];
      q.age+=DT;
      if(q.age>=1.2&&!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+18){
        S.clouds.push({x:q.x,y:q.y,r:36+6*f.sig,t:0,cd:0});
        m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});
        m.events.push({k:'burst',x:q.x,y:q.y,n:10,col:'#a6d86a',i:f.i});
        S.caps.splice(i,1);
      }else if(q.age>14)S.caps.splice(i,1);
    }
    for(let i=S.clouds.length-1;i>=0;i--){
      const q=S.clouds[i];
      q.t+=DT;if(q.cd>0)q.cd-=DT;
      if(q.cd<=0&&!e.gone&&Math.hypot(e.x-q.x,e.y-q.y)<q.r+e.r*.3){q.cd=.4;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
      if(q.t>2.6)S.clouds.splice(i,1);
    }
  }};

// Cactus: a prickly body, and a burst of needles every time something lands a hit on it. Up close a needle or two is
// sure to find the attacker; from across the arena most of them miss.
BEHAVE.cactus={
  init(f){f.s.cd=0;f.s.needles=[]},
  hurt(f,src,dmg,m){
    const S=f.s;
    if(S.cd>0)return;
    S.cd=Math.max(.4,.5/f.spdMul);
    const n=8+3*f.sig,a0=m.rnd()*6.2832;
    for(let k=0;k<n;k++){const a=a0+k*6.2832/n;S.needles.push({x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r,vx:Math.cos(a)*290,vy:Math.sin(a)*290})}
    m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
  },
  tick(f,e,m,rage){
    const D=FIGHTERS.cactus,S=f.s,Q=S.needles;
    if(S.cd>0)S.cd-=DT;
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      if(!e.gone&&Math.hypot(q.x-e.x,q.y-e.y)<e.r+2){m.hurt(e,D.dmg*f.dmgMul*rage,f);Q.splice(i,1);continue}
      if(q.x<0||q.x>AW||q.y<0||q.y>AW)Q.splice(i,1);
    }
  },
  touch:()=>FIGHTERS.cactus.dmg*.6};

// Tide: a wave crosses the arena from one wall to the opposite one. Whatever it catches is carried to the far wall;
// the rival is hurt there, more the further it was carried. The Tide rides along unharmed.
BEHAVE.tide={
  init(f){f.s.t=1.6;f.s.w=null},
  tick(f,e,m,rage){
    const D=FIGHTERS.tide,S=f.s;
    S.t-=DT;
    if(!S.w){
      if(S.t<=0){
        S.t=D.cd/(1+.25*f.sig)/f.spdMul;
        S.w={dir:(m.rnd()*4)|0,p:0,from:[-1,-1],done:[0,0]};
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
      return;
    }
    const w=S.w,horiz=w.dir<2,fwd=w.dir%2===0;
    w.p+=300*DT;
    for(const b of [f,e]){
      if(w.done[b.i]||b.gone)continue;
      const lim=AW-b.r;
      let c=horiz?b.x:b.y;
      if(!fwd)c=AW-c;                                      // measure from the wall the wave left
      if(c>w.p)continue;                                   // the wave has not reached it yet
      if(w.from[b.i]<0)w.from[b.i]=c;
      c=Math.min(w.p,lim);
      if(horiz)b.x=fwd?c:AW-c;else b.y=fwd?c:AW-c;
      if(c>=lim-.01){
        w.done[b.i]=1;
        if(b===e){
          const far=Math.max(0,lim-w.from[b.i])/AW;
          m.events.push({k:'burst',x:e.x,y:e.y,n:10,col:'#bfe4ff',i:f.i});
          m.hurt(e,D.dmg*(.5+.6*far)*f.dmgMul*rage,f);
        }
      }
    }
    if(w.p>AW+40)S.w=null;
  }};

// Quake: each time it strikes a wall the ground shakes along every wall. A rival whose edge is within the danger strip
// is hurt; the middle of the arena is safe.
BEHAVE.quake={
  init(f){f.s.last=-9;f.s.shake=0;f.s.pend=false;f.s.margin=22+7*f.sig;f.s.bx=0;f.s.by=0},
  bounce(f,m,x,y){
    const S=f.s;
    if(m.t-S.last<FIGHTERS.quake.cd/f.spdMul)return;
    S.last=m.t;S.pend=true;S.shake=.3;S.bx=x;S.by=y;
  },
  tick(f,e,m,rage){
    const S=f.s;
    if(S.shake>0)S.shake-=DT;
    if(!S.pend)return;
    S.pend=false;
    const d=Math.min(e.x,e.y,AW-e.x,AW-e.y)-e.r;
    if(!e.gone&&d<S.margin)m.hurt(e,FIGHTERS.quake.dmg*(.6+.8*(1-Math.max(0,d)/S.margin))*f.dmgMul*rage,f);   // worst right against the wall
  }};

// Firefly: small, fast and drawn to the rival. Every hit it lands leaves an ember; embers burn together and all go out
// if it cannot land another hit for a few seconds.
BEHAVE.firefly={
  init(f){f.r*=.82;f.s.n=0;f.s.last=-9;f.s.bt=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.firefly,S=f.s;
    if(!e.gone){const d=gap(e,f)||1;f.vx+=(e.x-f.x)/d*240*DT;f.vy+=(e.y-f.y)/d*240*DT;m.renorm(f)}
    if(S.n>0){
      if(m.t-S.last>3+.8*f.sig){S.n=0;return}
      S.bt-=DT;
      if(S.bt<=0){S.bt=.5;m.hurt(e,D.dmg*.5*(1+.2*f.sig)*S.n*f.dmgMul*rage,f,true)}
    }
  },
  touch:()=>FIGHTERS.firefly.dmg*.6,
  dealt(f,v,dmg,m){const S=f.s;if(S.n===0)S.bt=.5;S.n=Math.min(4+2*f.sig,S.n+1);S.last=m.t}};

// Crystal: a hit that comes from further away than its attacker could reach by hand is split: part is taken, the rest
// goes straight back. Up close it has only a short shard to fight with.
BEHAVE.crystal={
  init(f){
    f.s.rays=[];f.s.busy=false;
    const a0=f.arms[0];
    if(a0)for(let k=0;k<f.sig;k++)f.arms.push({a:[Math.PI/2,Math.PI*1.5,Math.PI/4][k],l:a0.l,head:0,dmg:a0.dmg,extra:0,rate:1});
  },
  tick(f){const Q=f.s.rays;for(let i=Q.length-1;i>=0;i--){Q[i].t-=DT;if(Q[i].t<=0)Q.splice(i,1)}},
  guard(f,src,dmg,m){
    const S=f.s;
    if(S.busy||!src||src===f)return 1;
    let L=2;for(const a of src.arms)L=Math.max(L,a.l+(a.head||0));
    if(gap(src,f)<=f.r+src.r+L+8)return 1;
    S.busy=true;
    m.hurt(src,dmg/Math.max(1,src.dmgMul)*Math.min(.9,FIGHTERS.crystal.dmg/15*(.4+.08*f.sig)*f.dmgMul),f);   // a share of the hit, never more than nine tenths; a stronger rival does not feed it more
    S.busy=false;
    S.rays.push({x:src.x,y:src.y,t:.2});
    m.events.push({k:'parry',x:f.x,y:f.y});
    return .7-.06*f.sig;
  }};

// Sandstorm: a cloud of sand trails after it. While the rival is inside, the sand scours it and wears it down: every
// second there adds to the damage it takes from everything, for the rest of the fight, up to a limit.
BEHAVE.sandstorm={
  init(f){f.s.cx=f.x;f.s.cy=f.y;f.s.wear=0;f.s.on=1;f.s.cd=0;f.s.said=0;f.s.rad=70+8*f.sig},
  tick(f,e,m,rage){
    const D=FIGHTERS.sandstorm,S=f.s;
    S.cx+=(f.x-S.cx)*Math.min(1,3*DT);S.cy+=(f.y-S.cy)*Math.min(1,3*DT);
    if(S.cd>0)S.cd-=DT;
    if(e.gone||Math.hypot(e.x-S.cx,e.y-S.cy)>S.rad+e.r*.3)return;
    S.wear=Math.min(1,S.wear+.12*DT);
    e.armor=e.armor/S.on*(1+S.wear);S.on=1+S.wear;       // undo what was applied before, apply the new amount
    const step=Math.floor(S.wear*10+1e-6);
    if(step>S.said){S.said=step;m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Worn '+step*10+'%',col:'#ecd29a',i:f.i})}
    if(S.cd<=0){S.cd=D.cd/f.spdMul;m.hurt(e,D.dmg*f.dmgMul*rage,f)}
  }};

// ---------- art ----------
// Gilded medallions, as in brawl-looks.js: crest(fg,bg) draws the emblem with the enamel field at radius 1; under/back/over
// draw in arena units with g, the current context. The floor is dark stone, so effects are pale ice, warm sand and soft light.
const P7={
  GOLD:typeof GOLD!=='undefined'?GOLD:'#c9a45c',GOLD_HI:typeof GOLD_HI!=='undefined'?GOLD_HI:'#f0dca4',
  IVORY:typeof IVORY!=='undefined'?IVORY:'#f3ead6',EDGE:typeof EDGE!=='undefined'?EDGE:'#090b0d',
  ICE:'#cfeefb',ICE_LO:'#7fb6d2',SAND:'214,176,106',SPORE:'150,205,100',
};
const P7_TAU=6.2832;
const p7now=()=>typeof NOW==='number'?NOW:0;
const p7disc=(x,y,r)=>{g.beginPath();g.arc(x,y,Math.max(.1,r),0,P7_TAU)};
// a soft round glow; rgb is an "r,g,b" triple
function p7glow(x,y,r,rgb,a){
  r=Math.max(.5,r);
  const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba('+rgb+','+a+')');q.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=q;p7disc(x,y,r);g.fill();
}
// fill the current path and give it the thin dark edge everything solid has
function p7solid(col){g.fillStyle=col;g.fill();g.strokeStyle=P7.EDGE;g.lineWidth=.9;g.lineJoin='round';g.stroke()}
function p7poly(pts){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)g.lineTo(pts[k][0],pts[k][1]);g.closePath()}

LOOKS.tornado={
  crest(fg){                                              // a funnel: bands that narrow towards the ground
    g.strokeStyle=fg;g.lineCap='round';
    const rows=[[-.5,.62,.14],[-.24,.47,.13],[.0,.33,.12],[.22,.21,.1],[.42,.11,.09]];
    rows.forEach((r,k)=>{const ox=(k%2?.07:-.05)+k*.03;g.lineWidth=r[2];g.beginPath();g.moveTo(ox-r[1],r[0]);g.quadraticCurveTo(ox,r[0]+.1,ox+r[1],r[0]);g.stroke()});
    g.beginPath();g.arc(.2,.61,.05,0,P7_TAU);g.fill();
  },
  back(f){                                                // wind circling the medallion
    const t=p7now()*9;
    g.lineCap='round';
    for(let k=0;k<3;k++){
      g.strokeStyle='rgba(222,236,244,'+(.5-k*.12)+')';g.lineWidth=2.2-k*.5;
      g.beginPath();g.arc(f.x,f.y,f.r+4+k*4,t+k*2.1,t+k*2.1+2.3);g.stroke();
    }
  },
  over(f,m){
    const S=f.s,e=m&&m.f[1-f.i];
    if(!e||e.hp<=0)return;
    g.lineCap='round';
    if(S.hold>0){                                         // the rival's path round the funnel
      const rad=f.r+e.r+12,dir=S.w>0?1:-1;
      for(let k=0;k<3;k++){
        g.strokeStyle='rgba(222,236,244,'+(.55-k*.15)+')';g.lineWidth=3-k*.8;
        g.beginPath();g.arc(f.x,f.y,rad+(k-1)*5,S.a-dir*(1.5+k*.4),S.a,dir<0);g.stroke();
      }
    }else if(S.fl){                                       // thrown: streaks behind it
      const q=S.fl,px=-q.uy,py=q.ux;
      g.strokeStyle='rgba(222,236,244,.6)';g.lineWidth=1.4;g.beginPath();
      for(let k=-1;k<=1;k++){const ox=px*k*e.r*.55,oy=py*k*e.r*.55,l=26-Math.abs(k)*8;g.moveTo(e.x+ox-q.ux*(e.r+3),e.y+oy-q.uy*(e.r+3));g.lineTo(e.x+ox-q.ux*(e.r+3+l),e.y+oy-q.uy*(e.r+3+l))}
      g.stroke();
    }
  }};

LOOKS.storm={
  crest(fg){                                              // a cloud, and the bolt under it
    for(const p of [[-.3,-.16,.26],[.02,-.34,.32],[.34,-.14,.24]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P7_TAU);g.fill()}
    g.beginPath();g.rect(-.5,-.16,1,.26);g.fill();
    g.fillStyle='#ffd27a';
    p7poly([[.06,.16],[-.2,.48],[-.02,.48],[-.14,.76],[.24,.38],[.05,.38],[.2,.16]]);g.fill();
  },
  under(f){                                               // where the lightning is about to fall
    for(const q of f.s.marks){
      if(q.lit){p7glow(q.x,q.y,q.r*1.5,'200,236,255',.75*Math.max(0,1-q.t/.2));continue}
      const p=Math.max(0,Math.min(1,q.t/.7));
      g.fillStyle='rgba(8,12,22,'+(.18+.22*p)+')';p7disc(q.x,q.y,q.r);g.fill();
      g.setLineDash([3,3]);g.strokeStyle='rgba(170,215,255,'+(.35+.55*p)+')';g.lineWidth=1.1;p7disc(q.x,q.y,q.r);g.stroke();g.setLineDash([]);
      g.strokeStyle='rgba(200,236,255,'+(.3+.6*p)+')';g.lineWidth=1;p7disc(q.x,q.y,Math.max(1.5,q.r*(1-p)));g.stroke();
    }
  },
  back(f){                                                // a dark cloud around it
    const t=p7now();
    for(let k=0;k<5;k++){
      const a=k/5*P7_TAU+Math.sin(t*.8+k)*.15,d=f.r*.95;
      p7glow(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d*.8-2,f.r*.62,'70,82,112',.6);
    }
  }};

LOOKS.glacier={
  crest(fg,bg){                                           // an iceberg, most of it under the water
    p7poly([[-.54,.1],[-.32,-.3],[-.14,-.14],[.08,-.68],[.36,-.2],[.54,.1]]);g.fill();
    p7poly([[-.42,.24],[.44,.24],[.24,.5],[0,.64],[-.26,.48]]);g.fill();
    g.strokeStyle=bg;g.lineWidth=.045;g.beginPath();g.moveTo(.08,-.68);g.lineTo(0,.1);g.moveTo(-.32,-.3);g.lineTo(-.22,.1);g.stroke();
  },
  under(f){                                               // blocks of ice, cracking as they are hit
    for(const q of f.s.ice){
      const old=q.t>7&&Math.sin(q.t*26)>0,r=q.r;
      p7glow(q.x,q.y,r+7,'170,225,250',.22);
      g.beginPath();for(let k=0;k<6;k++){const a=q.rot+k/6*P7_TAU,d=r*(k%2?1.06:.94);g.lineTo(q.x+Math.cos(a)*d,q.y+Math.sin(a)*d)}g.closePath();
      const gr=g.createLinearGradient(q.x-r,q.y-r,q.x+r,q.y+r);gr.addColorStop(0,'#f4fcff');gr.addColorStop(.5,P7.ICE);gr.addColorStop(1,P7.ICE_LO);
      g.globalAlpha=old?.6:.92;p7solid(gr);g.globalAlpha=1;
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.9;g.lineCap='round';g.beginPath();g.moveTo(q.x-r*.5,q.y-r*.15);g.lineTo(q.x-r*.1,q.y-r*.55);g.stroke();
      g.strokeStyle='rgba(30,70,100,.8)';g.lineWidth=.8;g.beginPath();
      for(let k=0;k<2-q.hp;k++){const a=q.rot+1+k*2.3;g.moveTo(q.x,q.y);g.lineTo(q.x+Math.cos(a)*r*.5,q.y+Math.sin(a)*r*.5);g.lineTo(q.x+Math.cos(a+.5)*r*.9,q.y+Math.sin(a+.5)*r*.9)}
      g.stroke();
    }
  },
  back(f){p7glow(f.x,f.y,f.r+9,'170,225,250',.3)}};       // cold air

LOOKS.mushroom={
  crest(fg,bg){                                           // a spotted toadstool
    g.beginPath();g.moveTo(-.64,.06);g.quadraticCurveTo(-.62,-.64,0,-.64);g.quadraticCurveTo(.62,-.64,.64,.06);g.quadraticCurveTo(0,.2,-.64,.06);g.fill();
    g.beginPath();g.moveTo(-.15,.12);g.lineTo(-.2,.58);g.quadraticCurveTo(0,.7,.2,.58);g.lineTo(.15,.12);g.closePath();g.fill();
    g.fillStyle=bg;for(const p of [[-.3,-.22,.11],[.12,-.38,.13],[.38,-.1,.08],[-.04,-.04,.07]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P7_TAU);g.fill()}
  },
  under(f){
    const S=f.s;
    for(const q of S.clouds){                             // poison hanging in the air
      const a=Math.max(0,Math.min(1,(2.6-q.t)/.6))*Math.min(1,q.t/.15);
      p7glow(q.x,q.y,q.r,P7.SPORE,.42*a);
      for(let k=0;k<5;k++){const an=k*1.26+q.t*.7,d=q.r*.5;p7glow(q.x+Math.cos(an)*d,q.y+Math.sin(an)*d,q.r*.42,P7.SPORE,.3*a)}
      g.setLineDash([2,4]);g.strokeStyle='rgba(190,230,140,'+(.5*a)+')';g.lineWidth=.9;p7disc(q.x,q.y,q.r);g.stroke();g.setLineDash([]);
    }
    for(const q of S.caps){                               // mushrooms, small until they are grown
      const k=.35+.65*Math.min(1,q.age/1.2),w=9*k,h=7*k,ripe=q.age>=1.2;
      if(ripe)p7glow(q.x,q.y,15,P7.SPORE,.25+.1*Math.sin(q.age*6));
      g.beginPath();g.rect(q.x-w*.22,q.y-h*.1,w*.44,h*.9);p7solid(P7.IVORY);
      g.beginPath();g.moveTo(q.x-w,q.y);g.quadraticCurveTo(q.x-w,q.y-h*1.5,q.x,q.y-h*1.5);g.quadraticCurveTo(q.x+w,q.y-h*1.5,q.x+w,q.y);g.closePath();p7solid(ripe?'#c64a3e':'#a8776a');
      g.fillStyle=P7.IVORY;p7disc(q.x-w*.4,q.y-h*.6,w*.16);g.fill();p7disc(q.x+w*.3,q.y-h*.85,w*.2);g.fill();
    }
  },
  over(f){                                                // spores in the air
    for(const q of f.s.spores){
      const u=Math.min(1,q.t/.55),x=q.x0+(q.tx-q.x0)*u,y=q.y0+(q.ty-q.y0)*u-Math.sin(u*Math.PI)*16;
      p7glow(x,y,6,P7.SPORE,.5);p7disc(x,y,1.8);p7solid('#e9e2b8');
    }
  }};

LOOKS.cactus={
  crest(fg,bg){                                           // a saguaro
    g.strokeStyle=fg;g.lineCap='round';g.lineJoin='round';
    g.lineWidth=.27;g.beginPath();g.moveTo(0,.6);g.lineTo(0,-.5);g.stroke();
    g.lineWidth=.19;g.beginPath();g.moveTo(-.42,-.24);g.lineTo(-.42,.1);g.lineTo(-.08,.1);g.moveTo(.42,-.4);g.lineTo(.42,-.06);g.lineTo(.08,-.06);g.stroke();
    g.fillStyle=bg;for(const y of [-.36,-.06,.24]){g.beginPath();g.arc(0,y,.035,0,P7_TAU);g.fill()}
  },
  back(f){                                                // spines all round the ring
    g.lineCap='round';g.strokeStyle=P7.EDGE;g.lineWidth=1.7;g.beginPath();
    for(let k=0;k<14;k++){const a=k/14*P7_TAU+.2,c=Math.cos(a),s=Math.sin(a);g.moveTo(f.x+c*(f.r-1),f.y+s*(f.r-1));g.lineTo(f.x+c*(f.r+5),f.y+s*(f.r+5))}
    g.stroke();g.strokeStyle='#e6edc4';g.lineWidth=.8;g.stroke();
  },
  over(f){                                                // needles in flight
    g.lineCap='round';
    for(const pass of [0,1]){
      g.strokeStyle=pass?'#eef2cf':P7.EDGE;g.lineWidth=pass?.9:2;g.beginPath();
      for(const q of f.s.needles){g.moveTo(q.x-q.vx*.026,q.y-q.vy*.026);g.lineTo(q.x,q.y)}
      g.stroke();
    }
  }};

LOOKS.tide={
  crest(fg){                                              // a breaking wave
    g.beginPath();g.moveTo(-.7,.44);g.quadraticCurveTo(-.5,-.5,.1,-.54);g.quadraticCurveTo(.58,-.5,.62,-.08);g.quadraticCurveTo(.4,-.3,.14,-.22);
    g.quadraticCurveTo(-.12,-.1,-.02,.2);g.quadraticCurveTo(.2,.46,.7,.44);g.closePath();g.fill();
    for(const p of [[.52,.12,.05],[.36,.22,.04],[.62,.26,.035]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P7_TAU);g.fill()}
  },
  under(f){                                               // the wave: deep water behind a line of foam
    const w=f.s.w;
    if(!w)return;
    const horiz=w.dir<2,fwd=w.dir%2===0,front=fwd?w.p:AW-w.p,tail=fwd?front-56:front+56;
    const gr=horiz?g.createLinearGradient(tail,0,front,0):g.createLinearGradient(0,tail,0,front);
    gr.addColorStop(0,'rgba(40,110,190,0)');gr.addColorStop(.75,'rgba(52,128,205,.42)');gr.addColorStop(1,'rgba(120,190,240,.6)');
    g.fillStyle=gr;
    const lo=Math.min(tail,front),span=Math.abs(front-tail);
    if(horiz)g.fillRect(lo,0,span,AW);else g.fillRect(0,lo,AW,span);
    g.fillStyle='rgba(240,250,255,.9)';
    for(let k=0;k<=18;k++){
      const u=k/18*AW,o=Math.sin(k*1.7+w.p*.05)*3,r=2.2+((k*7)%3)*.7;
      if(horiz)p7disc(front+o*(fwd?-1:1),u,r);else p7disc(u,front+o*(fwd?-1:1),r);
      g.fill();
    }
  },
  back(f){                                                // spray round the medallion
    const t=p7now()*3;
    g.strokeStyle='rgba(170,215,245,.55)';g.lineWidth=1.3;g.lineCap='round';
    for(let k=0;k<2;k++){g.beginPath();g.arc(f.x,f.y,f.r+4+k*3,t+k*3.1,t+k*3.1+1.6);g.stroke()}
  }};

LOOKS.quake={
  crest(fg){                                              // a slab of rock split by a fissure
    p7poly([[-.58,-.52],[-.02,-.52],[-.16,-.2],[.06,0],[-.14,.22],[.02,.52],[-.58,.52]]);g.fill();
    p7poly([[.2,-.44],[.62,-.44],[.62,.6],[.26,.6],[.1,.3],[.3,.08],[.08,-.12]]);g.fill();
  },
  under(f){                                               // the danger strip along the walls, flashing when the ground shakes
    const S=f.s,mg=S.margin||22,a=Math.max(0,S.shake)/.3;
    g.setLineDash([3,5]);g.strokeStyle='rgba(224,178,112,.3)';g.lineWidth=.8;g.beginPath();g.rect(mg,mg,AW-2*mg,AW-2*mg);g.stroke();g.setLineDash([]);
    if(a<=0)return;
    g.fillStyle='rgba(214,150,80,'+(.36*a)+')';
    g.fillRect(0,0,AW,mg);g.fillRect(0,AW-mg,AW,mg);g.fillRect(0,mg,mg,AW-2*mg);g.fillRect(AW-mg,mg,mg,AW-2*mg);
    g.strokeStyle='rgba(20,12,6,'+(.8*a)+')';g.lineWidth=1.4;g.lineJoin='round';g.lineCap='round';g.beginPath();   // cracks from where it struck
    const cx=AW/2,cy=AW/2,dx=cx-S.bx,dy=cy-S.by,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
    for(let k=-1;k<=1;k++){
      const c=Math.cos(k*.7),s=Math.sin(k*.7),vx=ux*c-uy*s,vy=ux*s+uy*c;
      g.moveTo(S.bx,S.by);g.lineTo(S.bx+vx*12-vy*4,S.by+vy*12+vx*4);g.lineTo(S.bx+vx*24+vy*3,S.by+vy*24-vx*3);g.lineTo(S.bx+vx*36-vy*2,S.by+vy*36+vx*2);
    }
    g.stroke();
  }};

LOOKS.firefly={
  crest(fg){                                              // the insect, tail alight
    g.beginPath();g.ellipse(-.3,-.1,.3,.15,.5,0,P7_TAU);g.fill();g.beginPath();g.ellipse(.3,-.1,.3,.15,-.5,0,P7_TAU);g.fill();
    g.beginPath();g.ellipse(0,0,.15,.32,0,0,P7_TAU);g.fill();
    g.beginPath();g.arc(0,-.4,.13,0,P7_TAU);g.fill();
    g.strokeStyle=fg;g.lineWidth=.045;g.lineCap='round';g.beginPath();g.moveTo(-.06,-.5);g.lineTo(-.2,-.72);g.moveTo(.06,-.5);g.lineTo(.2,-.72);g.stroke();
    g.fillStyle='#ffd95a';g.beginPath();g.arc(0,.42,.2,0,P7_TAU);g.fill();
  },
  back(f){                                                // its light, pulsing
    const t=p7now();
    p7glow(f.x,f.y,f.r+10+Math.sin(t*7)*3,'255,222,96',.5);
  },
  over(f,m){                                              // embers burning on the rival
    const S=f.s,e=m&&m.f[1-f.i];
    if(!e||e.hp<=0||e.gone||!(S.n>0))return;
    const t=m.t;
    for(let k=0;k<S.n;k++){
      const a=k/S.n*P7_TAU+t*2.2,x=e.x+Math.cos(a)*(e.r+3),y=e.y+Math.sin(a)*(e.r+3)+Math.sin(t*9+k)*1.2;
      p7glow(x,y,6.5,'255,150,50',.6);
      g.fillStyle='#ffe9a8';p7disc(x,y,1.5);g.fill();
    }
  }};

LOOKS.crystal={
  crest(fg,bg){                                           // a cut gem between two smaller shards
    p7poly([[0,-.72],[.3,-.3],[.3,.36],[0,.68],[-.3,.36],[-.3,-.3]]);g.fill();
    p7poly([[-.4,.3],[-.62,.02],[-.66,.36],[-.46,.58]]);g.fill();
    p7poly([[.4,.34],[.6,.12],[.64,.4],[.46,.58]]);g.fill();
    g.strokeStyle=bg;g.lineWidth=.045;g.lineJoin='round';g.beginPath();g.moveTo(-.3,-.3);g.lineTo(0,-.06);g.lineTo(.3,-.3);g.moveTo(0,-.06);g.lineTo(0,.68);g.stroke();
  },
  arm(f,A,x1,y1,x2,y2,an){                                // a shard of crystal, not a blade
    const L=Math.hypot(x2-x1,y2-y1);
    g.save();g.translate(x1,y1);g.rotate(an);
    const gr=g.createLinearGradient(0,-5,0,5);gr.addColorStop(0,'#f6f0ff');gr.addColorStop(.5,'#cdbcf7');gr.addColorStop(1,'#8f79cf');
    p7poly([[-3,0],[L*.3,-5],[L+1,0],[L*.3,5]]);p7solid(gr);
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=.7;g.beginPath();g.moveTo(-1,0);g.lineTo(L-1,0);g.stroke();
    g.restore();
  },
  back(f){p7glow(f.x,f.y,f.r+8,'200,180,255',.3)},
  over(f){                                                // what it sends back
    g.lineCap='round';
    for(const q of f.s.rays){
      const a=Math.max(0,q.t/.2);
      g.strokeStyle='rgba(190,160,255,'+(.55*a)+')';g.lineWidth=4.5;g.beginPath();g.moveTo(f.x,f.y);g.lineTo(q.x,q.y);g.stroke();
      g.strokeStyle='rgba(255,255,255,'+(.95*a)+')';g.lineWidth=1.3;g.stroke();
      p7glow(f.x,f.y,f.r+12,'230,215,255',.5*a);
    }
  }};

LOOKS.sandstorm={
  crest(fg){                                              // wind, curling
    g.strokeStyle=fg;g.lineCap='round';g.lineJoin='round';g.lineWidth=.11;
    g.beginPath();g.moveTo(-.66,-.22);g.lineTo(.05,-.22);g.arc(.05,-.39,.17,Math.PI/2,Math.PI*1.1,true);g.stroke();
    g.beginPath();g.moveTo(-.5,.08);g.lineTo(.46,.08);g.arc(.46,-.12,.2,Math.PI/2,Math.PI*1.1,true);g.stroke();
    g.beginPath();g.moveTo(-.62,.38);g.lineTo(.1,.38);g.arc(.1,.52,.14,-Math.PI/2,Math.PI*.9,false);g.stroke();
    for(const p of [[.44,.44,.05],[.62,.32,.04],[-.3,-.5,.04]]){g.beginPath();g.arc(p[0],p[1],p[2],0,P7_TAU);g.fill()}
  },
  under(f,m){                                             // the cloud of sand that trails after it
    const S=f.s,R=S.rad||70,t=m?m.t:p7now();
    if(!Number.isFinite(S.cx))return;
    p7glow(S.cx,S.cy,R,P7.SAND,.4);
    g.setLineDash([2,5]);g.strokeStyle='rgba(236,210,154,.4)';g.lineWidth=.9;p7disc(S.cx,S.cy,R);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(244,222,170,.75)';
    for(let k=0;k<16;k++){
      const a=k*2.4+t*(1.6+(k%3)*.5),d=R*(.2+.75*((k*37)%10)/10);
      p7disc(S.cx+Math.cos(a)*d,S.cy+Math.sin(a)*d*.9,.8+(k%3)*.35);g.fill();
    }
    g.strokeStyle='rgba(244,222,170,.3)';g.lineWidth=1.2;g.lineCap='round';
    for(let k=0;k<3;k++){g.beginPath();g.arc(S.cx,S.cy,R*(.35+k*.22),t*2.2+k*2,t*2.2+k*2+1.4);g.stroke()}
  }};
