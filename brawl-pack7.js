// Seventh pack of fighter classes for Duel King: elements and nature. Same layout as brawl-pack2.js: the first half is pure
// simulation (it loads in Node with only brawl-sim.js before it), the second half is drawing and only runs when the page
// asks for it. Every top-level name here starts with p7/P7 so it cannot clash with the other files.

// ---------- simulation ----------
// dmg is each class's single damage dial; f.sig (0-3) is the level of its signature upgrade.
FIGHTERS.tornado  ={name:'Tornado',    color:'#8fb4c9',hp:100,speed:185,spin:0,  dmg:25.13,cd:2.4,arms:[],desc:'Whirls the rival round, then hurls them at a wall.',sig:['Bigger funnel','Catches from further away, and more often'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.storm    ={name:'Storm Cloud',color:'#5c6f9c',hp:100,speed:120,spin:0,  dmg:25.7,cd:1.15,arms:[],desc:'Drifts slowly while lightning strikes the marked spots.',sig:['Thunderhead','One more bolt in every volley'],sfx:{hit:'',shot:'cast'}};
FIGHTERS.glacier  ={name:'Glacier',    color:'#9fd6e8',hp:100,speed:150,spin:0,  dmg:25.61,cd:1.2,arms:[],desc:'Leaves ice in its wake. Rivals bounce off it until it shatters on them.',sig:['Pack ice','Lays ice faster, and it shatters wider'],sfx:{hit:'glass'}};
FIGHTERS.mushroom ={name:'Mushroom',   color:'#c9584c',hp:100,speed:150,spin:0,  dmg:7.23,cd:1.1,arms:[],desc:'Scatters spores that grow into mushrooms and burst into poison.',sig:['Fairy ring','More mushrooms, bigger clouds'],sfx:{hit:'soft',shot:'pop'}};
FIGHTERS.cactus   ={name:'Cactus',     color:'#5fae5a',hp:100,speed:160,spin:0,  dmg:6.44,cd:.5, arms:[],desc:'Any bump or hit sends needles flying in all directions.',sig:['More needles','More needles in every burst'],sfx:{hit:'tick',shot:'loose'}};
FIGHTERS.tide     ={name:'Tide',       color:'#3f8fd1',hp:100,speed:165,spin:0,  dmg:35.6,cd:3.2,arms:[],desc:'Sends a wave across the arena that slams the rival into the far wall.',sig:['Spring tide','Waves come more often'],sfx:{hit:'thump',shot:'whoosh'}};
FIGHTERS.quake    ={name:'Quake',      color:'#a8794a',hp:100,speed:200,spin:0,  dmg:19.5,cd:.6, arms:[],desc:'Shakes the ground when it hits a wall. Rivals near any wall are hurt.',sig:['Aftershock','The danger reaches further from the walls'],sfx:{hit:'thump'}};
FIGHTERS.firefly  ={name:'Firefly',    color:'#e8d24a',hp:75, speed:230,spin:0,  dmg:4.54,cd:.35,arms:[],desc:'Quick and frail. Each touch lights one more ember on its rival, and every ember keeps burning.',sig:['Wildfire','More embers that burn hotter and for longer'],sfx:{hit:'tick'}};
FIGHTERS.crystal  ={name:'Crystal',    color:'#b9a7f0',hp:100,speed:165,spin:4.4,dmg:14.19,cd:.4, arms:[{a:0,l:24,d:.8},{a:Math.PI,l:24,d:.8}],desc:'Part of every hit from a distance bounces back at whoever sent it.',sig:['Flawless','Sends back more, and grows another shard'],sfx:{hit:'glass'}};
FIGHTERS.sandstorm={name:'Sandstorm',  color:'#d9b06a',hp:100,speed:170,spin:0,  dmg:8.77,cd:.5, arms:[],desc:'Rivals caught in its sand take more and more damage from everything.',sig:['Dust devil','A wider cloud of sand'],sfx:{hit:''}};
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
          m.events.push({k:'fx',n:'wave',x:e.x,y:e.y,r0:e.r*.6,r:e.r+26,col:'#e6f1f7',w:3,fill:.3,life:.3,i:f.i});       // the landing
          m.events.push({k:'fx',n:'dust',x:e.x+q.ux*e.r,y:e.y+q.uy*e.r,num:9,lo:30,hi:110,jit:e.r,i:f.i});
          m.events.push({k:'fx',n:'squash',i:e.i,dir:datan2(q.uy,q.ux),r:.18});
          m.events.push({k:'fx',n:'shake',r:2+2.5*Math.min(1,q.d/170)});
          m.hurt(e,D.dmg*(.55+.9*Math.min(1,q.d/170))*f.dmgMul*rage,f);
        }
      }
    }
    if(S.hold>0){
      S.hold-=DT;
      if(e.gone){S.hold=0;S.t=1;return}                    // it slipped away: wait a moment before trying again
      S.a+=S.w*DT;
      const rad=f.r+e.r+12,c=dcos(S.a),s=dsin(S.a),dir=S.w>0?1:-1;
      e.x=p7clamp(f.x+c*rad,e.r);e.y=p7clamp(f.y+s*rad,e.r);
      e.vx=-s*e.speed*dir;e.vy=c*e.speed*dir;
      e.p7held=m.t;
      e.cd=Math.max(e.cd,.12);e.xcd=Math.max(e.xcd,.12);   // too dizzy to strike while it is whirled
      if(S.hold<=0){                                       // let go: straight out from the funnel
        e.vx=c*e.speed;e.vy=s*e.speed;
        S.fl={ux:c,uy:s,t:1.1,d:0};
        S.t=Math.max(1.3,D.cd/(1+.2*f.sig)/f.spdMul);       // the wait starts now, and has a floor, so speed cannot make one endless whirl
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
        m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:rad+e.r,col:'#dfeef6',w:2.4,life:.3,i:f.i});              // the throw
        m.events.push({k:'fx',n:'line',x:e.x,y:e.y,x2:e.x+c*44,y2:e.y+s*44,col:'#ffffff',w:3,life:.25,i:f.i});
      }
      return;
    }
    S.t-=DT;
    if(S.t<=0&&!e.gone&&!(m.t-(f.p7held||-9)<.3)&&gap(e,f)<f.r+e.r+52+14*f.sig){
      S.hold=.7;S.a=datan2(e.y-f.y,e.x-f.x);S.w=(m.rnd()<.5?-1:1)*11;
      e.p7held=m.t;                                        // marked at once, so two Tornadoes cannot catch each other in the same step
      m.events.push({k:'pull',x:f.x,y:f.y,i:f.i});
      m.events.push({k:'fx',n:'dust',x:e.x,y:e.y,num:6,col:'#dfeaf0',jit:e.r,i:f.i});                             // swept off its feet
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
          m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:3,r:q.r,col:'#bfe6ff',w:2.4,fill:.35,life:.28,i:f.i});        // where it lands: a flash, sparks, a scorched stone
          m.events.push({k:'fx',n:'sparks',x:q.x,y:q.y,num:6,col:'#dff3ff',lo:60,hi:200,life:.25,grav:120,i:f.i});
          m.events.push({k:'fx',n:'scorch',x:q.x,y:q.y,r:q.r*.7,life:2.2});
          const reach=q.r+e.r*.45,d=dhyp(e.x-q.x,e.y-q.y);
          if(!e.gone&&d<reach){
            m.events.push({k:'fx',n:'flash',x:e.x,y:e.y,r:e.r*1.8,col:'#dff3ff',life:.16});m.events.push({k:'fx',n:'shake',r:2});
            m.hurt(e,D.dmg*(.6+.8*(1-d/reach))*f.dmgMul*rage,f);     // the middle of a bolt hurts most
          }
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
      let ok=Q.length<5+2*f.sig&&(e.gone||dhyp(e.x-f.x,e.y-f.y)>e.r+18);
      for(const q of Q)if(dhyp(q.x-f.x,q.y-f.y)<32-3*f.sig)ok=false;
      if(ok){
        Q.push({x:f.x,y:f.y,r:10,hp:2,t:0,cd:0,rot:m.rnd()*6.2832});
        m.events.push({k:'fx',n:'flakes',x:f.x,y:f.y,num:5,jit:14,i:f.i});                                  // the ice sets
        m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:17,r:7,col:'#dff3ff',w:1.6,life:.25,i:f.i});
      }
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
          if(q.cd<=0){q.cd=.25;q.hp--;m.events.push({k:'pop',x:q.x+nx*q.r,y:q.y+ny*q.r,i:f.i});m.events.push({k:'fx',n:'shards',x:q.x+nx*q.r,y:q.y+ny*q.r,num:3,col:'#dff3ff',dir:datan2(ny,nx),spread:1.6,lo:40,hi:120,size:1.8,i:f.i})}
        }
      }
      if(q.hp<=0||q.t>8){
        const reach=q.r+14+7*f.sig;
        m.events.push({k:'ring',x:q.x,y:q.y,r0:q.r,r:reach,life:.3,col:'#dff3ff',w:3,i:f.i});
        m.events.push({k:'burst',x:q.x,y:q.y,n:8,col:'#dff3ff',i:f.i});
        m.events.push({k:'fx',n:'shatter',x:q.x,y:q.y,num:10,col:'#dff3ff',r:q.r,i:f.i});
        m.events.push({k:'fx',n:'flakes',x:q.x,y:q.y,num:8,jit:reach,i:f.i});
        if(!e.gone&&dhyp(e.x-q.x,e.y-q.y)<reach+e.r){m.events.push({k:'fx',n:'frost',x:e.x,y:e.y,r:e.r,num:6,i:f.i});m.hurt(e,D.dmg*(.55+.9*Math.min(1,q.t/5))*f.dmgMul*rage,f);e.slowT=Math.max(e.slowT,.8)}
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
        S.spores.push({x0:f.x,y0:f.y,tx:p7clamp(f.x+dcos(an)*d,16),ty:p7clamp(f.y+dsin(an)*d,16),t:0});
        m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
      }
    }
    for(let i=S.spores.length-1;i>=0;i--){
      const q=S.spores[i];
      q.t+=DT;
      if(q.t>=.55){S.caps.push({x:q.tx,y:q.ty,age:0});m.events.push({k:'fx',n:'poof',x:q.tx,y:q.ty,r:7,col:'#d6caa6',i:f.i});S.spores.splice(i,1)}   // it takes root
    }
    for(let i=S.caps.length-1;i>=0;i--){
      const q=S.caps[i];
      q.age+=DT;
      if(q.age>=1.2&&!q.fxRipe){q.fxRipe=1;m.events.push({k:'fx',n:'stars',x:q.x,y:q.y-6,num:3,col:'#c8f08a',lo:6,hi:30,i:f.i})}    // grown: it glints (fxRipe is only for show)
      if(q.age>=1.2&&!e.gone&&dhyp(e.x-q.x,e.y-q.y)<e.r+18){
        S.clouds.push({x:q.x,y:q.y,r:36+6*f.sig,t:0,cd:0});
        m.events.push({k:'pop',x:q.x,y:q.y,i:f.i});
        m.events.push({k:'burst',x:q.x,y:q.y,n:10,col:'#a6d86a',i:f.i});
        m.events.push({k:'fx',n:'wave',x:q.x,y:q.y,r0:6,r:36+6*f.sig,col:'#a6d86a',w:2.4,fill:.3,life:.4,i:f.i});
        m.events.push({k:'fx',n:'bubbles',x:q.x,y:q.y,num:10,col:'#a6d86a',jit:30,i:f.i});
        m.events.push({k:'fx',n:'wisps',x:q.x,y:q.y,num:6,col:'#a6d86a',jit:26,i:f.i});
        S.caps.splice(i,1);
      }else if(q.age>14){m.events.push({k:'fx',n:'poof',x:q.x,y:q.y,r:6,col:'#b9a98c',i:f.i});S.caps.splice(i,1)}
    }
    for(let i=S.clouds.length-1;i>=0;i--){
      const q=S.clouds[i];
      q.t+=DT;if(q.cd>0)q.cd-=DT;
      if(q.cd<=0&&!e.gone&&dhyp(e.x-q.x,e.y-q.y)<q.r+e.r*.3){q.cd=.4;m.events.push({k:'fx',n:'bubbles',x:e.x,y:e.y,num:3,col:'#a6d86a',jit:e.r,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f)}
      if(q.t>2.6)S.clouds.splice(i,1);
    }
  }};

// Cactus: a prickly body, and a burst of needles every time something lands a hit on it. Up close a needle or two is
// sure to find the attacker; from across the arena most of them miss.
BEHAVE.cactus={
  init(f){f.s.cd=0;f.s.needles=[]},
  hurt(f,src,dmg,m){BEHAVE.cactus.burst(f,m)},
  bounce(f,m){BEHAVE.cactus.burst(f,m)},                  // any bump sets it off: a wall,
  bump(f,e,m){BEHAVE.cactus.burst(f,m)},                  // or its rival
  burst(f,m){
    const S=f.s;
    if(S.cd>0)return;
    S.cd=Math.max(.4,.5/f.spdMul);
    const n=8+3*f.sig,a0=m.rnd()*6.2832;
    for(let k=0;k<n;k++){const a=a0+k*6.2832/n;S.needles.push({x:f.x+dcos(a)*f.r,y:f.y+dsin(a)*f.r,vx:dcos(a)*290,vy:dsin(a)*290})}
    m.events.push({k:'shot',x:f.x,y:f.y,i:f.i});
    m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+18,col:'#e6edc4',w:1.8,life:.22,i:f.i});                  // the burst
    m.events.push({k:'fx',n:'sparks',x:f.x,y:f.y,num:6,col:'#eef2cf',lo:120,hi:230,life:.15,size:.9,jit:f.r,i:f.i});
  },
  tick(f,e,m,rage){
    const D=FIGHTERS.cactus,S=f.s,Q=S.needles;
    if(S.cd>0)S.cd-=DT;
    for(let i=Q.length-1;i>=0;i--){
      const q=Q[i];
      q.x+=q.vx*DT;q.y+=q.vy*DT;
      if(!e.gone&&dhyp(q.x-e.x,q.y-e.y)<e.r+2){m.events.push({k:'fx',n:'shards',x:q.x,y:q.y,num:2,col:'#eef2cf',lo:40,hi:110,size:1.6,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f);Q.splice(i,1);continue}
      if(q.x<0||q.x>AW||q.y<0||q.y>AW){m.events.push({k:'fx',n:'sparks',x:p7clamp(q.x,0),y:p7clamp(q.y,0),num:2,col:'#eef2cf',lo:30,hi:90,life:.18,size:1,i:f.i});Q.splice(i,1)}   // a needle sticks in the wall
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
        {const d=S.w.dir,h=d<2,z=d%2===0?0:AW;                 // the wall the water rises from
          m.events.push({k:'fx',n:'line',x:h?z:0,y:h?0:z,x2:h?z:AW,y2:h?AW:z,col:'#bfe4ff',w:7,life:.45,i:f.i});
          m.events.push({k:'fx',n:'wave',x:f.x,y:f.y,r0:f.r,r:f.r+22,col:'#bfe4ff',w:2.4,life:.3,i:f.i})}
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
      if(w.from[b.i]<0){w.from[b.i]=c;m.events.push({k:'fx',n:'splash',x:b.x,y:b.y,num:b===e?9:4,col:'#bfe4ff',i:f.i})}        // the wave picks it up
      c=Math.min(w.p,lim);
      if(horiz)b.x=fwd?c:AW-c;else b.y=fwd?c:AW-c;
      if(c>=lim-.01){
        w.done[b.i]=1;
        if(b===e){
          const far=Math.max(0,lim-w.from[b.i])/AW;
          m.events.push({k:'burst',x:e.x,y:e.y,n:10,col:'#bfe4ff',i:f.i});
          m.events.push({k:'fx',n:'splash',x:e.x,y:e.y,num:14,col:'#dff1ff',i:f.i});                                 // dashed against the far wall
          m.events.push({k:'fx',n:'wave',x:e.x,y:e.y,r0:e.r*.6,r:e.r+28,col:'#bfe4ff',w:3,fill:.3,life:.32,i:f.i});
          m.events.push({k:'fx',n:'squash',i:e.i,dir:horiz?0:1.5708,r:.18});
          m.events.push({k:'fx',n:'shake',r:2+3*far});
          m.hurt(e,D.dmg*(.5+.6*far)*f.dmgMul*rage,f);
        }
      }
    }
    if(!w.fxEnd&&w.p>=AW){                                 // the wave breaks on the far wall (fxEnd is only for show)
      w.fxEnd=1;const z=fwd?AW:0;
      for(const u of [.2,.5,.8])m.events.push({k:'fx',n:'splash',x:horiz?z:u*AW,y:horiz?u*AW:z,num:7,col:'#dff1ff',i:f.i});
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
    m.events.push({k:'fx',n:'wave',x:S.bx,y:S.by,r0:5,r:54,col:'#e0b270',w:3.6,fill:.25,life:.34,i:f.i});              // where it struck
    m.events.push({k:'fx',n:'shards',x:S.bx,y:S.by,num:6,col:'#a8794a',lo:60,hi:170,i:f.i});
    m.events.push({k:'fx',n:'shake',r:1.8});
    const d=Math.min(e.x,e.y,AW-e.x,AW-e.y)-e.r;
    if(!e.gone&&d<S.margin){
      m.events.push({k:'fx',n:'dust',x:e.x,y:e.y,num:7,col:'#c9a274',jit:e.r*1.6,lo:20,hi:80,i:f.i});                  // the ground heaves under the rival
      m.events.push({k:'fx',n:'shards',x:e.x,y:e.y+e.r*.6,num:4,col:'#8a6a45',dir:-1.5708,spread:1.6,lo:60,hi:140,i:f.i});
      m.events.push({k:'fx',n:'shake',r:3});
      m.hurt(e,FIGHTERS.quake.dmg*(.6+.8*(1-Math.max(0,d)/S.margin))*f.dmgMul*rage,f);   // worst right against the wall
    }
  }};

// Firefly: small, fast and drawn to the rival. Every hit it lands leaves an ember; embers burn together and all go out
// if it cannot land another hit for a few seconds.
BEHAVE.firefly={
  init(f){f.r*=.82;f.s.n=0;f.s.last=-9;f.s.bt=0},
  tick(f,e,m,rage){
    const D=FIGHTERS.firefly,S=f.s;
    if(!e.gone){const d=gap(e,f)||1;f.vx+=(e.x-f.x)/d*240*DT;f.vy+=(e.y-f.y)/d*240*DT;m.renorm(f)}
    if(S.n>0){
      if(m.t-S.last>3+.8*f.sig){S.n=0;m.events.push({k:'fx',n:'smoke',x:e.x,y:e.y,num:5,jit:e.r,i:f.i});m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Embers out',col:'#c9d0d4',i:f.i});return}       // the embers go out
      S.bt-=DT;
      if(S.bt<=0){S.bt=.5;if(!e.gone)m.events.push({k:'fx',n:'fire',x:e.x,y:e.y,num:2+S.n,i:f.i});m.hurt(e,D.dmg*.5*(1+.2*f.sig)*S.n*f.dmgMul*rage,f,true)}
    }
  },
  touch:()=>FIGHTERS.firefly.dmg*.6,
  dealt(f,v,dmg,m){
    const S=f.s;if(S.n===0)S.bt=.5;S.n=Math.min(4+2*f.sig,S.n+1);S.last=m.t;
    m.events.push({k:'text',x:v.x,y:v.y-v.r,txt:S.n>1?'Embers ×'+S.n:'Ember',col:'#ffb04a',i:f.i});
    m.events.push({k:'fx',n:'embers',x:v.x,y:v.y,num:4,col:'#ffb04a',jit:v.r,i:f.i});                                 // another ember catches
    m.events.push({k:'fx',n:'sparks',x:(f.x+v.x)/2,y:(f.y+v.y)/2,num:4,col:'#ffe27a',lo:50,hi:150,life:.22,i:f.i});
  }};

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
    m.events.push({k:'fx',n:'beam',x:f.x,y:f.y,x2:src.x,y2:src.y,col:'#c9b6ff',w:3.5,life:.22,i:f.i});                  // the part it sends back
    m.events.push({k:'fx',n:'shards',x:src.x,y:src.y,num:5,col:'#cdbcf7',lo:60,hi:170,i:f.i});
    m.events.push({k:'fx',n:'stars',x:f.x,y:f.y,num:4,col:'#e6d9ff',jit:f.r*1.6,i:f.i});
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
    if(e.gone||dhyp(e.x-S.cx,e.y-S.cy)>S.rad+e.r*.3){S.fxIn=0;return}
    if(!S.fxIn){S.fxIn=1;if(m.t-(S.fxT||-9)>1.2){S.fxT=m.t;m.events.push({k:'fx',n:'poof',x:e.x,y:e.y,r:e.r,col:'#e6c88a',i:f.i})}}   // the sand closes over the rival (fxIn, fxT are only for show)
    S.wear=Math.min(1,S.wear+.12*DT);
    e.armor=e.armor/S.on*(1+S.wear);S.on=1+S.wear;       // undo what was applied before, apply the new amount
    const step=Math.floor(S.wear*10+1e-6);
    if(step>S.said){
      S.said=step;m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Worn '+step*10+'%',col:'#ecd29a',i:f.i});
      m.events.push({k:'fx',n:'shards',x:e.x,y:e.y,num:5,col:'#ecd29a',lo:40,hi:120,size:1.8,i:f.i});                      // a layer scoured off
      m.events.push({k:'fx',n:'wave',x:e.x,y:e.y,r0:e.r+12,r:e.r,col:'#ecd29a',w:2,life:.28,i:f.i});
    }
    if(S.cd<=0){S.cd=D.cd/f.spdMul;m.events.push({k:'fx',n:'dust',x:e.x,y:e.y,num:3,col:'#d9b06a',jit:e.r,i:f.i});m.hurt(e,D.dmg*f.dmgMul*rage,f)}
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
const p7r=()=>Math.random()-.5;                             // for the continuous effects only: never for the fight itself
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
  },
  amb(f,e,m,dt){                                          // wind off the funnel; grit round a whirled rival; streaks behind a thrown one
    if(m.over||f.gone)return;
    const S=f.s;let n;
    for(n=FX.due(f.i,'p7w',5,dt);n>0;n--){const a=Math.random()*P7_TAU,d=f.r+4+Math.random()*8;FX.wisps(f.x+dcos(a)*d,f.y+dsin(a)*d,1,'#dfeef6',{dir:a+1.57,spread:.4,lo:14,hi:40,life:.5})}
    if(!(e.hp>0)||e.gone)return;
    if(S.hold>0){
      const back=S.a-(S.w>0?1:-1)*1.5708;
      for(n=FX.due(f.i,'p7h',12,dt);n>0;n--)FX.sparks(e.x+p7r()*e.r,e.y+p7r()*e.r,1,'#ffffff',{dir:back,spread:.7,lo:40,hi:120,life:.25,size:1});
      for(n=FX.due(f.i,'p7hd',7,dt);n>0;n--)FX.dust(e.x+p7r()*e.r*1.6,e.y+p7r()*e.r*1.6,1,'#dfeaf0',{lo:10,hi:40});
    }else if(S.fl){
      const q=S.fl;
      for(n=FX.due(f.i,'p7f',14,dt);n>0;n--){const o=p7r()*e.r*1.6,x=e.x-q.ux*e.r-q.uy*o,y=e.y-q.uy*e.r+q.ux*o,l=12+Math.random()*18;FX.line(x,y,x-q.ux*l,y-q.uy*l,'#eef6fb',1.2,.2)}
      for(n=FX.due(f.i,'p7fd',6,dt);n>0;n--)FX.dust(e.x-q.ux*e.r+p7r()*e.r,e.y-q.uy*e.r+p7r()*e.r,1,'#dfeaf0',{lo:6,hi:30});
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
      const a=k/5*P7_TAU+dsin(t*.8+k)*.15,d=f.r*.95;
      p7glow(f.x+dcos(a)*d,f.y+dsin(a)*d*.8-2,f.r*.62,'70,82,112',.6);
    }
  },
  amb(f,e,m,dt){                                          // rain under the cloud, a flicker inside it, static over the marked spots
    if(m.over)return;
    let n;
    if(!f.gone){
      for(n=FX.due(f.i,'p7r',9,dt);n>0;n--)FX.drops(f.x+p7r()*f.r*1.8,f.y+f.r*.5,1,'#9cc4ee',{dir:1.5708,spread:.25,lo:50,hi:100,life:.45});
      for(n=FX.due(f.i,'p7k',1.1,dt);n>0;n--)FX.flash(f.x+p7r()*f.r,f.y-2,f.r*.9,'#dfe9ff',.1);
    }
    const Q=f.s.marks.filter(q=>!q.lit&&q.t>0);
    if(Q.length)for(n=FX.due(f.i,'p7m',Math.min(14,5*Q.length),dt);n>0;n--){const q=Q[(Math.random()*Q.length)|0];FX.sparks(q.x+p7r()*q.r*1.4,q.y+p7r()*q.r*1.4,1,'#bfe6ff',{lo:10,hi:55,life:.2,size:1})}
  }};

LOOKS.glacier={
  crest(fg,bg){                                           // an iceberg, most of it under the water
    p7poly([[-.54,.1],[-.32,-.3],[-.14,-.14],[.08,-.68],[.36,-.2],[.54,.1]]);g.fill();
    p7poly([[-.42,.24],[.44,.24],[.24,.5],[0,.64],[-.26,.48]]);g.fill();
    g.strokeStyle=bg;g.lineWidth=.045;g.beginPath();g.moveTo(.08,-.68);g.lineTo(0,.1);g.moveTo(-.32,-.3);g.lineTo(-.22,.1);g.stroke();
  },
  under(f){                                               // blocks of ice, cracking as they are hit
    for(const q of f.s.ice){
      const old=q.t>7&&dsin(q.t*26)>0,r=q.r;
      p7glow(q.x,q.y,r+7,'170,225,250',.22);
      g.beginPath();for(let k=0;k<6;k++){const a=q.rot+k/6*P7_TAU,d=r*(k%2?1.06:.94);g.lineTo(q.x+dcos(a)*d,q.y+dsin(a)*d)}g.closePath();
      const gr=g.createLinearGradient(q.x-r,q.y-r,q.x+r,q.y+r);gr.addColorStop(0,'#f4fcff');gr.addColorStop(.5,P7.ICE);gr.addColorStop(1,P7.ICE_LO);
      g.globalAlpha=old?.6:.92;p7solid(gr);g.globalAlpha=1;
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.9;g.lineCap='round';g.beginPath();g.moveTo(q.x-r*.5,q.y-r*.15);g.lineTo(q.x-r*.1,q.y-r*.55);g.stroke();
      g.strokeStyle='rgba(30,70,100,.8)';g.lineWidth=.8;g.beginPath();
      for(let k=0;k<2-q.hp;k++){const a=q.rot+1+k*2.3;g.moveTo(q.x,q.y);g.lineTo(q.x+dcos(a)*r*.5,q.y+dsin(a)*r*.5);g.lineTo(q.x+dcos(a+.5)*r*.9,q.y+dsin(a+.5)*r*.9)}
      g.stroke();
    }
  },
  back(f){p7glow(f.x,f.y,f.r+9,'170,225,250',.3)},        // cold air
  amb(f,e,m,dt){                                          // frost falling off it; mist on the blocks; a block about to go glitters
    if(m.over)return;
    let n;const Q=f.s.ice;
    if(!f.gone)for(n=FX.due(f.i,'p7g',4,dt);n>0;n--)FX.flakes(f.x+p7r()*f.r*2,f.y+p7r()*f.r*2,1,'#dff3ff',{life:.6});
    if(!Q.length)return;
    for(n=FX.due(f.i,'p7i',Math.min(7,1.2*Q.length),dt);n>0;n--){const q=Q[(Math.random()*Q.length)|0];FX.wisps(q.x+p7r()*q.r,q.y+p7r()*q.r,1,'#bfe6f5',{life:.6,lo:2,hi:12})}
    for(const q of Q)if(q.t>7||q.hp<2)for(n=FX.due(f.i,'p7o',q.t>7?7:2,dt);n>0;n--)FX.stars(q.x+p7r()*q.r*1.6,q.y+p7r()*q.r*1.6,1,'#ffffff',{lo:0,hi:8,size:2.6,life:.3});
  }};

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
      for(let k=0;k<5;k++){const an=k*1.26+q.t*.7,d=q.r*.5;p7glow(q.x+dcos(an)*d,q.y+dsin(an)*d,q.r*.42,P7.SPORE,.3*a)}
      g.setLineDash([2,4]);g.strokeStyle='rgba(190,230,140,'+(.5*a)+')';g.lineWidth=.9;p7disc(q.x,q.y,q.r);g.stroke();g.setLineDash([]);
    }
    for(const q of S.caps){                               // mushrooms, small until they are grown
      const k=.35+.65*Math.min(1,q.age/1.2),w=9*k,h=7*k,ripe=q.age>=1.2;
      if(ripe)p7glow(q.x,q.y,15,P7.SPORE,.25+.1*dsin(q.age*6));
      g.beginPath();g.rect(q.x-w*.22,q.y-h*.1,w*.44,h*.9);p7solid(P7.IVORY);
      g.beginPath();g.moveTo(q.x-w,q.y);g.quadraticCurveTo(q.x-w,q.y-h*1.5,q.x,q.y-h*1.5);g.quadraticCurveTo(q.x+w,q.y-h*1.5,q.x+w,q.y);g.closePath();p7solid(ripe?'#c64a3e':'#a8776a');
      g.fillStyle=P7.IVORY;p7disc(q.x-w*.4,q.y-h*.6,w*.16);g.fill();p7disc(q.x+w*.3,q.y-h*.85,w*.2);g.fill();
    }
  },
  over(f){                                                // spores in the air
    for(const q of f.s.spores){
      const u=Math.min(1,q.t/.55),x=q.x0+(q.tx-q.x0)*u,y=q.y0+(q.ty-q.y0)*u-dsin(u*Math.PI)*16;
      p7glow(x,y,6,P7.SPORE,.5);p7disc(x,y,1.8);p7solid('#e9e2b8');
    }
  },
  amb(f,e,m,dt){                                          // a spore's wake; ripe caps puffing; the cloud bubbling
    if(m.over)return;
    const S=f.s;let n;
    for(const q of S.spores)for(n=FX.due(f.i,'p7s',16,dt);n>0;n--){const u=Math.min(1,q.t/.55);FX.sparks(q.x0+(q.tx-q.x0)*u,q.y0+(q.ty-q.y0)*u-dsin(u*Math.PI)*16,1,'#cfe89a',{lo:4,hi:22,life:.28,size:1})}
    const ripe=S.caps.filter(q=>q.age>=1.2);
    if(ripe.length)for(n=FX.due(f.i,'p7p',Math.min(5,1.2*ripe.length),dt);n>0;n--){const q=ripe[(Math.random()*ripe.length)|0];FX.sparks(q.x+p7r()*8,q.y-8,1,'#d9f0a8',{dir:-1.5708,spread:1,lo:6,hi:22,life:.5,size:.9,grav:-10,drag:1})}
    if(S.clouds.length)for(n=FX.due(f.i,'p7c',Math.min(12,6*S.clouds.length),dt);n>0;n--){
      const q=S.clouds[(Math.random()*S.clouds.length)|0],a=Math.random()*P7_TAU,d=Math.random()*q.r*.85,x=q.x+dcos(a)*d,y=q.y+dsin(a)*d;
      if(Math.random()<.6)FX.bubbles(x,y,1,'#a6d86a');else FX.wisps(x,y,1,'#a6d86a',{life:.7});
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
    for(let k=0;k<14;k++){const a=k/14*P7_TAU+.2,c=dcos(a),s=dsin(a);g.moveTo(f.x+c*(f.r-1),f.y+s*(f.r-1));g.lineTo(f.x+c*(f.r+5),f.y+s*(f.r+5))}
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
      const u=k/18*AW,o=dsin(k*1.7+w.p*.05)*3,r=2.2+((k*7)%3)*.7;
      if(horiz)p7disc(front+o*(fwd?-1:1),u,r);else p7disc(u,front+o*(fwd?-1:1),r);
      g.fill();
    }
  },
  back(f){                                                // spray round the medallion
    const t=p7now()*3;
    g.strokeStyle='rgba(170,215,245,.55)';g.lineWidth=1.3;g.lineCap='round';
    for(let k=0;k<2;k++){g.beginPath();g.arc(f.x,f.y,f.r+4+k*3,t+k*3.1,t+k*3.1+1.6);g.stroke()}
  },
  amb(f,e,m,dt){                                          // it drips; the wave throws spray off its crest and leaves bubbles behind
    if(m.over)return;
    let n;const w=f.s.w;
    if(!f.gone)for(n=FX.due(f.i,'p7d',3,dt);n>0;n--)FX.drops(f.x+p7r()*f.r*1.6,f.y+f.r*.4,1,'#9fd0f2',{dir:1.5708,spread:.5,lo:10,hi:40});
    if(!w)return;
    const horiz=w.dir<2,fwd=w.dir%2===0,front=fwd?w.p:AW-w.p,sgn=fwd?1:-1,ahead=horiz?(fwd?0:Math.PI):(fwd?1.5708:-1.5708);
    if(front>-4&&front<AW+4)for(n=FX.due(f.i,'p7t',18,dt);n>0;n--){const u=Math.random()*AW;FX.sparks(horiz?front:u,horiz?u:front,1,'#eaf7ff',{dir:ahead,spread:1.4,lo:20,hi:90,life:.3,size:1.1})}
    for(n=FX.due(f.i,'p7tb',7,dt);n>0;n--){const u=Math.random()*AW,b=front-sgn*(8+Math.random()*40);if(b>0&&b<AW)FX.bubbles(horiz?b:u,horiz?u:b,1,'#bfe4ff')}
    if(e.hp>0&&!e.gone&&w.from[e.i]>=0&&!w.done[e.i])for(n=FX.due(f.i,'p7tc',12,dt);n>0;n--)FX.drops(e.x+p7r()*e.r*1.6,e.y+p7r()*e.r*1.6,1,'#dff1ff',{dir:ahead+Math.PI,spread:1.2,lo:30,hi:100});
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
    const cx=AW/2,cy=AW/2,dx=cx-S.bx,dy=cy-S.by,d=dhyp(dx,dy)||1,ux=dx/d,uy=dy/d;
    for(let k=-1;k<=1;k++){
      const c=dcos(k*.7),s=dsin(k*.7),vx=ux*c-uy*s,vy=ux*s+uy*c;
      g.moveTo(S.bx,S.by);g.lineTo(S.bx+vx*12-vy*4,S.by+vy*12+vx*4);g.lineTo(S.bx+vx*24+vy*3,S.by+vy*24-vx*3);g.lineTo(S.bx+vx*36-vy*2,S.by+vy*36+vx*2);
    }
    g.stroke();
  },
  amb(f,e,m,dt){                                          // while the ground shakes, dust and pebbles jump all along the walls
    if(m.over)return;
    const S=f.s,mg=S.margin||22;let n;
    const edge=()=>{const side=(Math.random()*4)|0,u=Math.random()*AW,d=Math.random()*mg;return side===0?[u,d]:side===1?[u,AW-d]:side===2?[d,u]:[AW-d,u]};
    if(S.shake>0){
      for(n=FX.due(f.i,'p7q',60,dt);n>0;n--){const p=edge();FX.dust(p[0],p[1],1,'#b99a70',{lo:8,hi:40,life:.45})}
      for(n=FX.due(f.i,'p7qs',26,dt);n>0;n--){const p=edge();FX.shards(p[0],p[1],1,'#8a6a45',{dir:-1.5708,spread:1.2,lo:40,hi:110,size:1.6,life:.35})}
    }
    if(e.hp>0&&!e.gone&&Math.min(e.x,e.y,AW-e.x,AW-e.y)-e.r<mg)                       // the rival is standing where it is not safe
      for(n=FX.due(f.i,'p7qd',5,dt);n>0;n--)FX.dust(e.x+p7r()*e.r*1.6,e.y+e.r*.5+p7r()*6,1,'#c9a274',{lo:4,hi:20,life:.4});
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
    p7glow(f.x,f.y,f.r+10+dsin(t*7)*3,'255,222,96',.5);
  },
  amb(f,e,m,dt){                                          // a wake of light behind it; fire rising off a burning rival
    if(m.over)return;
    const S=f.s;let n;
    if(!f.gone){
      for(n=FX.due(f.i,'p7ff',12,dt);n>0;n--)FX.embers(f.x+p7r()*f.r,f.y+p7r()*f.r,1,'#ffe27a',{lo:2,hi:14,life:.45,grav:-10});
      for(n=FX.due(f.i,'p7fs',2,dt);n>0;n--)FX.stars(f.x+p7r()*f.r*2,f.y+p7r()*f.r*2,1,'#fff3b0',{lo:0,hi:8,size:2.6,life:.3});
    }
    if(S.n>0&&e.hp>0&&!e.gone){
      for(n=FX.due(f.i,'p7fb',Math.min(14,2.5*S.n),dt);n>0;n--){const a=Math.random()*P7_TAU;FX.embers(e.x+dcos(a)*e.r,e.y+dsin(a)*e.r,1,Math.random()<.4?'#ffd27a':'#ff8a3a')}
      for(n=FX.due(f.i,'p7fk',1+.3*S.n,dt);n>0;n--)FX.smoke(e.x+p7r()*e.r,e.y-e.r*.6,1,null,{lo:4,hi:16,life:.6});
    }
  },
  top(f,m){                                               // embers burning on the rival, drawn above both fighters so its medallion cannot hide them
    const S=f.s,e=m&&m.f[1-f.i];
    if(!e||e.hp<=0||e.gone||!(S.n>0))return;
    const t=m.t,left=Math.max(0,1-(t-S.last)/(3+.8*f.sig));
    g.strokeStyle='rgba(255,170,70,.75)';g.lineWidth=1.3;g.lineCap='round';        // the time they have left, running down
    g.beginPath();g.arc(e.x,e.y,e.r+8,-1.5708,-1.5708+P7_TAU*left);g.stroke();
    for(let k=0;k<S.n;k++){
      const a=k/S.n*P7_TAU+t*2.2,x=e.x+dcos(a)*(e.r+8),y=e.y+dsin(a)*(e.r+8),fl=1+dsin(t*11+k*1.7)*.12,h=6.5*fl;
      p7glow(x,y,8,'255,150,50',.7);
      g.fillStyle='#ff8a3a';g.beginPath();g.moveTo(x,y-h);g.quadraticCurveTo(x+3.6,y-h*.2,x+2.6,y+2);g.quadraticCurveTo(x,y+4.2,x-2.6,y+2);g.quadraticCurveTo(x-3.6,y-h*.2,x,y-h);g.fill();
      g.fillStyle='#ffe9a8';g.beginPath();g.moveTo(x,y-h*.45);g.quadraticCurveTo(x+1.7,y,x+1.2,y+1.6);g.quadraticCurveTo(x,y+2.6,x-1.2,y+1.6);g.quadraticCurveTo(x-1.7,y,x,y-h*.45);g.fill();
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
    const L=dhyp(x2-x1,y2-y1);
    g.save();g.translate(x1,y1);g.rotate(an);
    const gr=g.createLinearGradient(0,-5,0,5);gr.addColorStop(0,'#f6f0ff');gr.addColorStop(.5,'#cdbcf7');gr.addColorStop(1,'#8f79cf');
    p7poly([[-3,0],[L*.3,-5],[L+1,0],[L*.3,5]]);p7solid(gr);
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=.7;g.beginPath();g.moveTo(-1,0);g.lineTo(L-1,0);g.stroke();
    g.restore();
  },
  back(f){p7glow(f.x,f.y,f.r+8,'200,180,255',.3)},
  amb(f,e,m,dt){                                          // light catching the facets
    if(m.over||f.gone)return;
    let n;
    if(f.arms.length)for(n=FX.due(f.i,'p7x',3,dt);n>0;n--){const A=f.arms[(Math.random()*f.arms.length)|0],an=f.ang*(A.rate||1)+A.a,d=f.r+A.l*(.2+Math.random()*.8);FX.stars(f.x+dcos(an)*d,f.y+dsin(an)*d,1,'#f0e8ff',{lo:0,hi:6,size:3,life:.3})}
    for(n=FX.due(f.i,'p7xb',1.5,dt);n>0;n--)FX.stars(f.x+p7r()*f.r*1.4,f.y+p7r()*f.r*1.4,1,'#d9c8ff',{lo:0,hi:6,size:2.6,life:.35});
  },
  top(f){                                                 // what it sends back, drawn above both fighters
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
      p7disc(S.cx+dcos(a)*d,S.cy+dsin(a)*d*.9,.8+(k%3)*.35);g.fill();
    }
    g.strokeStyle='rgba(244,222,170,.3)';g.lineWidth=1.2;g.lineCap='round';
    for(let k=0;k<3;k++){g.beginPath();g.arc(S.cx,S.cy,R*(.35+k*.22),t*2.2+k*2,t*2.2+k*2+1.4);g.stroke()}
  },
  amb(f,e,m,dt){                                          // grit flying round the cloud, scouring a rival inside it, and falling from a worn one
    if(m.over)return;
    const S=f.s,R=S.rad||70;let n;
    if(!Number.isFinite(S.cx))return;
    for(n=FX.due(f.i,'p7sa',10,dt);n>0;n--){const a=Math.random()*P7_TAU,d=R*(.25+Math.random()*.7);FX.sparks(S.cx+dcos(a)*d,S.cy+dsin(a)*d,1,'#f0d9a0',{dir:a+1.5708,spread:.5,lo:40,hi:110,life:.35,size:1,drag:1})}
    for(n=FX.due(f.i,'p7sd',4,dt);n>0;n--){const a=Math.random()*P7_TAU,d=R*Math.random()*.9;FX.dust(S.cx+dcos(a)*d,S.cy+dsin(a)*d,1,'#d9b06a',{lo:8,hi:36})}
    if(!(e.hp>0)||e.gone)return;
    if(dhyp(e.x-S.cx,e.y-S.cy)<=R+e.r*.3)for(n=FX.due(f.i,'p7sr',12,dt);n>0;n--){const a=Math.random()*P7_TAU;FX.sparks(e.x+dcos(a)*e.r,e.y+dsin(a)*e.r,1,'#f4deaa',{dir:a+1.5708,spread:.6,lo:50,hi:130,life:.22,size:1})}
    if(S.wear>.02)for(n=FX.due(f.i,'p7sw',1+4*S.wear,dt);n>0;n--)FX.sparks(e.x+p7r()*e.r*1.4,e.y+e.r*.4,1,'#ecd29a',{dir:1.5708,spread:.6,lo:10,hi:40,life:.4,size:.9,grav:120});
  },
  top(f,m){                                               // the wear lasts the whole fight: scratches scoured into the rival's enamel
    const S=f.s,e=m&&m.f[1-f.i];
    if(!e||e.hp<=0||e.gone||!(S.wear>.02))return;
    const n=Math.max(1,Math.round(S.wear*10)),l=e.r*.17;
    g.lineCap='round';
    for(const pass of [0,1]){
      g.strokeStyle=pass?'rgba(240,216,160,.9)':'rgba(40,26,10,.55)';g.lineWidth=Math.max(.6,e.r*.04)*(pass?1:2.1);g.beginPath();
      for(let k=0;k<n;k++){const a=k*2.4+.7,d=e.r*(.28+.5*((k*37)%10)/10),x=e.x+dcos(a)*d,y=e.y+dsin(a)*d*.75-e.r*.12;g.moveTo(x-l,y-l*.5);g.lineTo(x+l,y+l*.5)}
      g.stroke();
    }
  }};
