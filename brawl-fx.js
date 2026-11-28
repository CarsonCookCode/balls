// Duel King effects: everything short-lived and showy that the arena draws on top of the simulation.
// Glowing sparks, embers, dust, shards, stars, shockwaves, scorch marks, squash on impact, and the auras
// that show a fighter's conditions and upgrades. Nothing here feeds back into the simulation: it listens to the match's
// events and reads the fighters' state, and it uses Math.random freely because a different sparkle changes no result.
//
// How the other files use it:
//   FX.on(e,m)             the page hands it every simulation event
//   FX.update(dt)          once a frame;  FX.ambient(m,dt) once a frame while a match is on screen
//   FX.floor/back/front/top  called by drawArena and drawFighter at the right depths
//   FX.sq(i)               how squashed fighter i is right now
// A class or an upgrade can ask for an effect without this file knowing about it, by pushing an event:
//   {k:'fx',n:'sparks',x,y,num,col,dir,spread,...}     see RECIPES at the bottom for every name
// and a class that wants something continuous (smoke while it burns) gives its LOOKS entry
//   amb(f,e,m,dt)          called every frame; use FX.due(f.i,'tag',perSecond,dt) to pace what it emits.
const FX=(()=>{
  const TAU=6.2832,R=Math.random,MAXP=560;
  const P=[],W=[],DEC=[];                      // particles, shockwaves, marks on the floor
  const SQ=[{t:9,k:0,th:0},{t:9,k:0,th:0}];    // squash per fighter
  const ACC=[{},{}];                           // pacing for continuous effects, per fighter
  const SAID={};
  let q=1,rate=1,clock=0,lastM=null,screen=0,screenCol='255,255,255',cheer=null,slowDt=.016,entered=false,sdOn=false;
  const api={say:null,kick:null,calm:false,errors:0,lastError:''};
  const STEEL='#cfd8e6',GOLDC='#ffd76a',HOT='#fff2c4',ICE='#dff6ff',BLOOD='#ff5a6e',VENOM='#8be05a',EDGEC='#090b0d';

  // ----- colour and sprites -----
  const RGB={};
  function rgbOf(col){
    let v=RGB[col];if(v)return v;
    v=[255,255,255];
    if(typeof col==='string'&&col[0]==='#'){
      const h=col.length===4?col[1]+col[1]+col[2]+col[2]+col[3]+col[3]:col.slice(1,7),n=parseInt(h,16);
      if(n===n)v=[n>>16&255,n>>8&255,n&255];
    }
    return RGB[col]=v;
  }
  const SPR=new Map();
  // a soft round sprite: `hot` ones have a white core and are drawn additively (light), the others are plain puffs (dust, smoke)
  function sprite(col,hot){
    const key=(hot?'h':'s')+col;
    let s=SPR.get(key);
    if(s!==undefined)return s;
    s=null;
    if(typeof document!=='undefined'){
      try{
        if(SPR.size>220)SPR.clear();
        const cv=document.createElement('canvas');cv.width=cv.height=64;
        const c=cv.getContext('2d'),gr=c.createRadialGradient(32,32,0,32,32,32),v=rgbOf(col),m=v.map(x=>Math.round(x+(255-x)*.6));
        if(hot){
          gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.16,'rgba('+m+',.9)');
          gr.addColorStop(.42,'rgba('+v+',.38)');gr.addColorStop(.72,'rgba('+v+',.1)');gr.addColorStop(1,'rgba('+v+',0)');
        }else{
          gr.addColorStop(0,'rgba('+v+',.85)');gr.addColorStop(.55,'rgba('+v+',.4)');gr.addColorStop(1,'rgba('+v+',0)');
        }
        c.fillStyle=gr;c.fillRect(0,0,64,64);s=cv;
      }catch(e){s=null}
    }
    SPR.set(key,s);return s;
  }
  function blit(g,col,hot,x,y,r,a){
    if(!(a>.004)||!(r>.05))return;
    const s=sprite(col,hot);
    g.globalAlpha=a>1?1:a;
    if(s)g.drawImage(s,x-r,y-r,r*2,r*2);
    else{g.fillStyle=col;g.globalAlpha=Math.min(1,a)*.35;g.beginPath();g.arc(x,y,r*.6,0,TAU);g.fill()}
  }
  // a glow any drawing code can use (it switches to additive light and back)
  function glow(g,x,y,r,col,a){
    const was=g.globalCompositeOperation,al=g.globalAlpha;
    g.globalCompositeOperation='lighter';blit(g,col,true,x,y,r,a===undefined?.6:a);
    g.globalCompositeOperation=was;g.globalAlpha=al;
  }

  // ----- making particles -----
  const cnt=n=>{n*=q*rate;const k=n|0;return k+(R()<n-k?1:0)};
  function put(k,add,L,x,y,vx,vy,life,s,col){
    if(P.length>=MAXP)return null;
    const p={k,add,L,x,y,vx,vy,life,max:life,s,col,drag:0,g:0,rot:R()*TAU,vr:0,grow:0,tw:R()*TAU,to:-9,x2:0,y2:0};
    P.push(p);return p;
  }
  function fan(kind,add,L,x,y,n,col,o,d){
    o=o||{};
    const dir=o.dir||0,spread=o.spread===undefined?TAU:o.spread,lo=o.lo===undefined?d.lo:o.lo,hi=o.hi===undefined?d.hi:o.hi,
      life=o.life||d.life,size=o.size||d.size,jit=o.jit||0;
    for(let i=cnt(n);i>0;i--){
      const a=dir+(R()-.5)*spread,s=lo+R()*(hi-lo);
      const p=put(kind,add,L,x+(R()-.5)*jit,y+(R()-.5)*jit,Math.cos(a)*s,Math.sin(a)*s,life*(.6+.7*R()),size*(.7+.6*R()),Array.isArray(col)?col[(R()*col.length)|0]:col);
      if(!p)break;
      p.drag=o.drag===undefined?d.drag:o.drag;p.g=o.grav===undefined?d.grav:o.grav;p.vr=(R()-.5)*(d.vr||0);p.grow=d.grow||0;
    }
  }
  const sparks=(x,y,n,col,o)=>fan('spark',1,1,x,y,n,col,o,{lo:60,hi:210,life:.3,size:1.25,drag:3.2,grav:0});
  const embers=(x,y,n,col,o)=>fan('ember',1,1,x,y,n,col,o,{lo:4,hi:26,life:.75,size:1.5,drag:.6,grav:-46});
  const stars=(x,y,n,col,o)=>fan('star',1,1,x,y,n,col,o,{lo:14,hi:80,life:.55,size:3.4,drag:3,grav:0});
  const flakes=(x,y,n,col,o)=>fan('flake',1,1,x,y,n,col||ICE,o,{lo:6,hi:34,life:.8,size:2.1,drag:1.4,grav:26,vr:3});
  const wisps=(x,y,n,col,o)=>fan('wisp',1,1,x,y,n,col,o,{lo:4,hi:22,life:.9,size:4.5,drag:.8,grav:-14,grow:3});
  const dust=(x,y,n,col,o)=>fan('puff',0,0,x,y,n,col||'#b9a98c',o,{lo:8,hi:46,life:.5,size:4.2,drag:3.4,grav:-5,grow:9});
  const smoke=(x,y,n,col,o)=>fan('puff',0,1,x,y,n,col||'#4a433c',o,{lo:6,hi:30,life:.8,size:5,drag:1.6,grav:-22,grow:8});
  const shards=(x,y,n,col,o)=>fan('shard',0,1,x,y,n,col,o,{lo:50,hi:190,life:.5,size:2.5,drag:2.4,grav:150,vr:16});
  const bubbles=(x,y,n,col,o)=>fan('bubble',0,1,x,y,n,col||VENOM,o,{lo:2,hi:10,life:.75,size:1.4,drag:.4,grav:-30,grow:.9});
  const plus=(x,y,n,col,o)=>fan('plus',0,1,x,y,n,col||'#8be07a',o,{lo:2,hi:12,life:.85,size:2.3,drag:.5,grav:-30});
  const drops=(x,y,n,col,o)=>fan('drop',0,1,x,y,n,col,o,{lo:25,hi:110,life:.5,size:1.5,drag:1.2,grav:230});
  const leaves=(x,y,n,col,o)=>fan('leaf',0,1,x,y,n,col||'#7fbf55',o,{lo:20,hi:90,life:.8,size:2.6,drag:2.2,grav:40,vr:9});
  const confetti=(x,y,n,col,o)=>fan('conf',0,1,x,y,n,col||['#ffd447','#ff6b6b','#6bd6ff','#9be86a','#f3ead6','#c99bff'],o,{lo:60,hi:210,life:1.1,size:2.2,drag:2.2,grav:150,vr:10});
  function flash(x,y,r,col,life){const p=put('flash',1,1,x,y,0,0,life||.14,r,col||HOT);return p}
  function slash(x,y,dir,len,col,life){const p=put('slash',1,1,x,y,0,0,life||.17,len,col||'#ffffff');if(p)p.rot=dir}
  function line(x,y,x2,y2,col,w,life){const p=put('line',1,1,x,y,0,0,life||.18,w||1.4,col||'#ffffff');if(p){p.x2=x2;p.y2=y2}}
  // lights that fly to a fighter (to = 0 or 1) or to a point (to = -2, with tx,ty) and vanish on arrival
  function seek(x,y,to,n,col,tx,ty,o){
    o=o||{};
    for(let i=cnt(n);i>0;i--){
      const a=R()*TAU,s=40+R()*90,p=put('seek',1,1,x+(R()-.5)*(o.jit||10),y+(R()-.5)*(o.jit||10),Math.cos(a)*s,Math.sin(a)*s,o.life||1.1,(o.size||1.7)*(.8+.5*R()),col);
      if(!p)break;p.to=to;p.x2=tx||0;p.y2=ty||0;p.grow=120+R()*120;
    }
  }
  function wave(x,y,r0,r1,life,col,w,fill){if(W.length<70)W.push({x,y,r0,r1,life,max:life,col:col||'#ffffff',w:w||2,fill:fill||0})}
  function scorch(x,y,r,col,life){if(DEC.length<26)DEC.push({x,y,r,col:col||'#000000',life:life||4,max:life||4})}
  function squash(i,th,k){if(api.calm||!(i===0||i===1))return;const s=SQ[i];if(s.t<.05&&s.k>k)return;s.t=0;s.k=Math.min(.2,k);s.th=th}
  function due(i,tag,perSec,dt){
    const A=ACC[i]||(ACC[i]={});
    let v=(A[tag]||0)+perSec*dt*q*(.6+.4*rate);
    const n=v|0;A[tag]=v-n;return n>6?6:n;
  }
  function word(i,id,x,y,txt,col,big,gapS){
    const key=i+id;
    if(clock-(SAID[key]||-9)<(gapS||1.1))return;
    SAID[key]=clock;if(api.say)api.say(x,y,txt,col,big);
  }
  const kick=n=>{if(api.kick)api.kick(n)};
  const rim=(f,a,k)=>[f.x+Math.cos(a)*f.r*(k||1),f.y+Math.sin(a)*f.r*(k||1)];

  // ----- big set pieces, shared by events and by classes -----
  function explode(x,y,r,col){
    r=r||34;col=col||'#ffb347';
    flash(x,y,r*1.5,HOT,.16);flash(x,y,r*.9,col,.26);
    wave(x,y,4,r,.32,col,3.4,.5);wave(x,y,2,r*1.35,.42,'#ffffff',1.4);
    sparks(x,y,r*.55,col,{lo:90,hi:330,life:.42,size:1.5,grav:160});sparks(x,y,r*.2,HOT,{lo:60,hi:200,life:.3});
    embers(x,y,r*.22,col,{lo:10,hi:60,jit:r*.5});smoke(x,y,r*.14,null,{jit:r*.4});
    scorch(x,y,r*.72);
  }
  function frost(x,y,r,n){
    n=n||10;r=r||24;
    flash(x,y,r*.9,'#bfe9ff',.16);wave(x,y,r*1.1,r*.45,.3,'#9fe0ff',2.4);
    flakes(x,y,n,ICE,{jit:r});shards(x,y,n*.5,ICE,{lo:40,hi:130,size:2.2,grav:90});
  }
  function fire(x,y,n,col){
    n=n||8;col=col||'#ff8a3a';
    embers(x,y,n,col,{jit:8});sparks(x,y,n*.5,'#ffd27a',{lo:30,hi:120,life:.3,grav:-60});smoke(x,y,n*.15);
  }
  function splash(x,y,n,col){
    n=n||8;
    drops(x,y,n,col,{dir:-1.57,spread:2.6,lo:50,hi:150});wave(x,y,2,14,.26,col,1.6);
  }
  function poof(x,y,r,col){
    r=r||16;
    dust(x,y,6,col,{lo:20,hi:70,jit:r*.5});wave(x,y,r*.4,r*1.3,.26,col||'#e9dcc2',1.4);
  }
  function shatter(x,y,n,col,r){
    flash(x,y,(r||16)*1.1,col,.14);shards(x,y,n||10,col,{lo:70,hi:230});sparks(x,y,(n||10)*.5,'#ffffff',{lo:60,hi:180,life:.22});
  }
  function holy(x,y,r,col){
    col=col||GOLDC;r=r||30;
    flash(x,y,r,col,.22);wave(x,y,4,r*1.2,.4,col,2.6,.3);stars(x,y,8,col,{lo:20,hi:90,grav:-40,life:.7});
  }
  function dark(x,y,r,col){
    col=col||'#b48cff';r=r||26;
    wave(x,y,r*1.3,r*.3,.34,col,2.2);wisps(x,y,7,col,{jit:r});
  }
  function zapEnd(x,y,col){
    col=col||'#bff4ff';
    flash(x,y,11,col,.12);sparks(x,y,7,col,{lo:70,hi:230,life:.2,size:1});
  }

  // ----- what each simulation event looks like -----
  function on(e,m){
    if(!m)return;
    if(m!==lastM){lastM=m;reset(false)}
    const k=e.k,own=e.i>=0?m.f[e.i]:null,col=own?own.col:'#fff4c2';
    if(k==='hit'){
      const v=own,s=v?m.f[1-v.i]:null;if(!v)return;
      const big=Math.min(1,e.dmg/30),sc=s?s.col:HOT;
      let ix=e.x,iy=e.y,dir=R()*TAU,spread=TAU;
      if(e.ax!==undefined&&!e.ind){
        const dx=e.ax-e.x,dy=e.ay-e.y,d=Math.hypot(dx,dy)||1;
        ix=e.x+dx/d*v.r*.8;iy=e.y+dy/d*v.r*.8;dir=Math.atan2(dy,dx);spread=2.3;
      }
      if(e.ind){sparks(ix,iy,3,sc,{lo:40,hi:120,life:.24});flash(ix,iy,7,sc,.1);return}
      flash(ix,iy,9+15*big+(e.crit?10:0),HOT,.13);
      sparks(ix,iy,8+13*big,sc,{dir,spread,lo:80,hi:200+180*big,life:.28+.22*big,size:1.3+.5*big});
      sparks(ix,iy,3+5*big,'#ffffff',{dir,spread:spread*.7,lo:60,hi:170,life:.2,size:1});
      if(big>.3)embers(ix,iy,2+4*big,sc,{lo:10,hi:50,life:.5});
      if(e.dmg>=7)shards(ix,iy,1+3*big,v.col,{dir,spread:2.6,lo:50,hi:160,size:2+big});
      if(big>.45||e.crit)wave(ix,iy,4,18+28*big,.26,sc,2+big);
      if(s&&s.arms&&s.arms.length&&e.dmg>=4)slash(ix,iy,dir+3.1416,v.r*(.8+.5*big),'#ffffff',.16);
      if(e.crit){
        stars(ix,iy,7,GOLDC,{lo:40,hi:150,life:.6,size:4.4});wave(ix,iy,6,50,.34,GOLDC,3,.25);
        slash(ix,iy,dir+3.1416,v.r*1.5,GOLDC,.22);flash(ix,iy,30,GOLDC,.2);
      }
      const vp=v.p||{},sp=s&&s.p||{};
      if(vp.armor)sparks(ix,iy,2+vp.armor,STEEL,{dir,spread:1.6,lo:90,hi:220,life:.2,size:1});
      if(vp.glass)shards(ix,iy,3,'#d8f4ff',{dir,spread:2.4,size:2});
      if(sp.heavyhit){wave(v.x,v.y,v.r,v.r+16,.28,'#d9b98a',2.6);dust(v.x,v.y,3,null,{jit:v.r});kick(1.5+big)}
      if(sp.sharper&&e.dmg>=6)slash(ix,iy,dir+3.1416+.5,v.r*.9,'#ffe6b0',.14);
      squash(v.i,dir,.05+.11*big+(e.crit?.04:0));
    }
    else if(k==='heal'){
      plus(e.x,e.y,2+Math.min(4,e.dmg/3),'#8be07a',{jit:own?own.r*1.2:16});
      flash(e.x,e.y,(own?own.r:20)*1.2,'#7ddc5a',.22);
      if(e.fx!==undefined&&own)seek(e.fx,e.fy,own.i,2+Math.min(5,e.dmg/2),BLOOD);
    }
    else if(k==='block'){
      const r=own?own.r:22;
      flash(e.x,e.y,r*1.9,'#cfe1ff',.18);wave(e.x,e.y,r+5,r+22,.34,'#bcd4ff',3,.3);wave(e.x,e.y,r+5,r+10,.2,'#ffffff',1.2);
      shards(e.x,e.y,9,'#cfe1ff',{lo:90,hi:220,jit:r});stars(e.x,e.y,4,'#eaf2ff',{jit:r});
    }
    else if(k==='revive'){
      const r=own?own.r:22;
      flash(e.x,e.y,r*3.2,GOLDC,.4);wave(e.x,e.y,r*2.6,r*.6,.3,GOLDC,2.4);wave(e.x,e.y,r*.6,r*3,.55,GOLDC,3.4,.3);wave(e.x,e.y,r*.4,r*4.2,.75,'#ffffff',1.4);
      stars(e.x,e.y,16,GOLDC,{lo:20,hi:120,grav:-70,life:.95,jit:r});embers(e.x,e.y,18,GOLDC,{jit:r*1.6,lo:10,hi:60,life:1});
      sparks(e.x,e.y,22,GOLDC,{lo:80,hi:260,life:.5});kick(4);
    }
    else if(k==='parry'){
      flash(e.x,e.y,13,'#fff6d8',.11);stars(e.x,e.y,1,'#ffffff',{lo:0,hi:4,life:.2,size:7});
      sparks(e.x,e.y,8,'#ffe2a0',{lo:90,hi:260,life:.3,grav:200});
    }
    else if(k==='bump'){
      sparks(e.x,e.y,6,'#fff1cf',{lo:50,hi:150,life:.22,size:1});wave(e.x,e.y,3,15,.2,'#fff1cf',1.4);flash(e.x,e.y,7,'#fff1cf',.1);
      const a=m.f[0],b=m.f[1],th=Math.atan2(b.y-a.y,b.x-a.x);squash(0,th,.07);squash(1,th,.07);
    }
    else if(k==='wall'){
      if(!own)return;
      wallHit(e,own);
      const sp=Math.min(2.2,Math.hypot(own.vx,own.vy)/170),big=own.r/24,al=Math.atan2(e.ny,e.nx);
      // dust rolls out along the wall both ways, chips fly back into the arena
      dust(e.x,e.y,2.2*big*sp,null,{dir:al+1.5708,spread:.5,lo:30,hi:80*sp});dust(e.x,e.y,2.2*big*sp,null,{dir:al-1.5708,spread:.5,lo:30,hi:80*sp});
      sparks(e.x+e.nx*2,e.y+e.ny*2,3+3.5*sp*big,'#ffe2a0',{dir:al,spread:2.4,lo:50,hi:130+90*sp,life:.28,size:1.1});
      sparks(e.x+e.nx*2,e.y+e.ny*2,1+2*sp,own.col,{dir:al,spread:2.2,lo:40,hi:160,life:.3});
      wave(e.x,e.y,2,8+6*big*sp,.2,'#ffe2a0',1.2);
      const p=put('line',1,1,e.x+e.nx-e.ny*own.r*.7,e.y+e.ny+e.nx*own.r*.7,0,0,.14,1.5,'#ffd9a0');if(p){p.x2=e.x+e.nx+e.ny*own.r*.7;p.y2=e.y+e.ny-e.nx*own.r*.7}
      squash(own.i,al,.07+.05*Math.min(1.5,sp));
    }
    else if(k==='ping'){sparks(e.x,e.y,3,col,{lo:40,hi:130,life:.2,size:1});flash(e.x,e.y,6,col,.1)}
    else if(k==='shot'){
      if(!own)return;
      if(e.quiet)return;
      if(Math.hypot(e.x-own.x,e.y-own.y)>own.r*.6){flash(e.x,e.y,8,HOT,.09);flash(e.x,e.y,6,col,.14);sparks(e.x,e.y,3,col,{lo:60,hi:160,life:.16});return}
      const a=own.aim||0,x=own.x+Math.cos(a)*own.r,y=own.y+Math.sin(a)*own.r;
      flash(x,y,10,HOT,.09);flash(x,y,7,col,.14);sparks(x,y,5,col,{dir:a,spread:.8,lo:130,hi:300,life:.16});
      smoke(x,y,.6,'#6b6258',{lo:4,hi:14});
    }
    else if(k==='mine'){wave(e.x,e.y,9,3,.22,col,1.6);sparks(e.x,e.y,3,col,{lo:20,hi:70,life:.2,size:1})}
    else if(k==='boom'){explode(e.x,e.y,34,'#ffb347')}
    else if(k==='zap'){zapEnd(e.x2,e.y2);flash(e.x,e.y,9,'#bff4ff',.1)}
    else if(k==='fade'){wave(e.x,e.y,(own?own.r:20)+8,5,.36,col,2.2);wisps(e.x,e.y,9,col,{jit:own?own.r*1.4:20});dust(e.x,e.y,3,'#cfc7e6',{jit:14})}
    else if(k==='appear'){
      const r=own?own.r:22;
      flash(e.x,e.y,r*2.3,col,.2);wave(e.x,e.y,6,r+24,.32,col,3,.3);sparks(e.x,e.y,14,col,{lo:70,hi:230,life:.32});stars(e.x,e.y,4,'#ffffff',{jit:r});
    }
    else if(k==='pull'){
      wave(e.x,e.y,96,18,1,col,2.2);wave(e.x,e.y,70,14,.8,'#ffffff',1);
      for(let i=cnt(18);i>0;i--){const a=R()*TAU,d=60+R()*50,p=put('seek',1,1,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,-Math.sin(a)*50,Math.cos(a)*50,1.05,1.5,col);if(p){p.to=own&&Math.hypot(e.x-own.x,e.y-own.y)<own.r?own.i:-2;p.x2=e.x;p.y2=e.y;p.grow=90}}
    }
    else if(k==='blast'){
      const r=e.r||60;
      flash(e.x,e.y,r*.9,col,.2);flash(e.x,e.y,r*.5,HOT,.14);
      wave(e.x,e.y,8,r,.34,col,4,.4);wave(e.x,e.y,4,r*1.12,.44,'#ffffff',1.4);
      sparks(e.x,e.y,18,col,{lo:r*2.2,hi:r*4.2,life:.3,size:1.5});dust(e.x,e.y,7,null,{lo:r*1.4,hi:r*2.4,life:.5});
    }
    else if(k==='freeze'){const r=own?own.r:22;frost(e.x,e.y,r+14,12);wave(e.x,e.y,r+26,r,.4,'#9fe0ff',3)}
    else if(k==='spawn'){wave(e.x,e.y,2,13,.26,col,1.8,.4);sparks(e.x,e.y,5,col,{lo:30,hi:110,life:.26});stars(e.x,e.y,2,'#ffffff',{lo:6,hi:30,size:2.6})}
    else if(k==='pop'){sparks(e.x,e.y,5,col,{lo:40,hi:130,life:.22});shards(e.x,e.y,3,col,{lo:40,hi:120,size:1.8});dust(e.x,e.y,1.5,null,{lo:6,hi:24})}
    else if(k==='ring'){wave(e.x,e.y,e.r0||6,e.r||40,e.life||.3,e.col||col,e.w||3,e.fill||0)}
    else if(k==='burst'){
      const n=e.n||10,c=e.col||col;
      sparks(e.x,e.y,n,c,{lo:60,hi:210,life:.32});sparks(e.x,e.y,n*.3,'#ffffff',{lo:40,hi:120,life:.2,size:1});
      if(n>=8){flash(e.x,e.y,10+n*.6,c,.14);stars(e.x,e.y,n*.2,c,{lo:10,hi:60})}
    }
    else if(k==='ko'){
      if(!own)return;
      const r=own.r,win=m.f[1-own.i];
      if(breakApart(own,col,win,e.x,e.y,m)){                    // it bursts into chunks: dust and chips of stone, no light
        dust(e.x,e.y,12,null,{jit:r,lo:14,hi:70});smoke(e.x,e.y,5,null,{jit:r});
        shards(e.x,e.y,16,'#8d8b86',{lo:70,hi:260,life:.7,size:1.6,jit:r});shards(e.x,e.y,8,col,{lo:60,hi:220,life:.6,size:1.4,jit:r});
        wave(e.x,e.y,r*.7,r*2.6,.4,'#b9b4a8',1.6);
        if(win&&win.hp>0)cheer={i:win.i,t:1.5};
        return;
      }
      flash(e.x,e.y,r*3.6,'#ffffff',.2);flash(e.x,e.y,r*3.4,col,.55);
      wave(e.x,e.y,r*.5,r*3.4,.5,col,5,.45);wave(e.x,e.y,r*.4,r*5,.75,'#ffffff',2);wave(e.x,e.y,r*.3,r*7,1,GOLDC,1.4);
      shards(e.x,e.y,20,col,{lo:90,hi:330,life:.9,size:3.4,jit:r});shards(e.x,e.y,14,'#c9a45c',{lo:90,hi:300,life:.9,size:2.8,jit:r});
      sparks(e.x,e.y,36,GOLDC,{lo:120,hi:420,life:.6,size:1.6,grav:120});sparks(e.x,e.y,14,'#ffffff',{lo:90,hi:300,life:.4});
      embers(e.x,e.y,16,col,{jit:r*2,lo:10,hi:70,life:1.1});smoke(e.x,e.y,6,null,{jit:r});
      scorch(e.x,e.y,r*1.5,'#000000',6);
      if(!api.calm){screen=.38;screenCol='255,246,220'}
      if(win&&win.hp>0)cheer={i:win.i,t:1.5};
    }
    else if(k==='proc')proc(e,m);
    else if(k==='fx'){const fn=RECIPES[e.n];if(fn)fn(e,own,col,m)}
  }

  // ----- an upgrade doing its thing: e.i is whose upgrade it is -----
  function proc(e,m){
    const f=m.f[e.i];if(!f)return;
    const o=m.f[1-f.i],to=Math.atan2(o.y-f.y,o.x-f.x),x=e.x===undefined?o.x:e.x,y=e.y===undefined?o.y:e.y;
    const hx=o.x-Math.cos(to)*o.r*.8,hy=o.y-Math.sin(to)*o.r*.8;      // where f's hit lands on its rival
    switch(e.id){
      case 'thorns':{const p=rim(f,to);shards(p[0],p[1],4,'#9bcf5a',{dir:to,spread:.7,lo:170,hi:300,life:.3,size:2.6,grav:0});sparks(o.x-Math.cos(to)*o.r,o.y-Math.sin(to)*o.r,3,'#c8f08a',{lo:40,hi:120,life:.2});break}
      case 'poison':drops(hx,hy,4,VENOM,{dir:to+3.14,spread:2.4});wave(hx,hy,2,11,.22,VENOM,1.4);break;
      case 'frost':flakes(hx,hy,5,ICE,{jit:10});shards(hx,hy,2,ICE,{lo:40,hi:110,size:1.8,grav:60});wave(o.x,o.y,o.r+8,o.r,.26,'#9fe0ff',1.6);break;
      case 'ambush':word(f.i,'ambush',o.x,o.y,'Ambush','#c9a0ff',true);slash(hx,hy,to,o.r*1.7,'#c9a0ff',.24);slash(hx,hy,to+.6,o.r*1.3,'#ffffff',.2);dark(o.x,o.y,o.r*1.6);stars(hx,hy,6,'#c9a0ff');kick(3);break;
      case 'laststand':word(f.i,'laststand',f.x,f.y,'Last stand','#ff6a5a',true,9);wave(f.x,f.y,f.r,f.r*2.6,.5,'#ff5a4a',3.4,.3);embers(f.x,f.y,14,'#ff6a4a',{jit:f.r*1.6});flash(f.x,f.y,f.r*2.4,'#ff5a4a',.3);break;
      case 'execute':slash(hx,hy,to+.75,o.r*1.5,'#ff4a5a',.22);slash(hx,hy,to-.75,o.r*1.5,'#ff4a5a',.22);sparks(hx,hy,7,'#ff4a5a',{lo:80,hi:240,life:.3});break;
      case 'combo':{const n=e.n||1;stars(hx,hy,Math.min(4,n),GOLDC,{lo:20,hi:90});if(n>=3)word(f.i,'combo',o.x,o.y,'Combo ×'+n,GOLDC,n>=5,.9);break}
      case 'patient':word(f.i,'patient',o.x,o.y,'Patience','#f3ead6',true);flash(hx,hy,34,'#ffffff',.2);wave(hx,hy,5,44,.34,'#f3ead6',3,.3);stars(hx,hy,7,'#ffffff',{lo:40,hi:140});kick(2.5);break;
      case 'riposte':word(f.i,'riposte',o.x,o.y,'Riposte','#ff7a8a',true);slash(hx,hy,to+3.14,o.r*1.7,'#ff5a6e',.24);sparks(hx,hy,10,'#ff7a8a',{lo:90,hi:260});kick(2);break;
      case 'ricochet':word(f.i,'ricochet',o.x,o.y,'Ricochet','#7fe7ff');sparks(hx,hy,12,'#7fe7ff',{lo:90,hi:280});wave(hx,hy,4,34,.3,'#7fe7ff',2.4,.25);break;
      case 'giantkill':shards(hx,hy,5,o.col,{lo:70,hi:200,size:3.6});wave(o.x,o.y,o.r*.5,o.r+12,.3,'#c08cff',2.6);flash(hx,hy,16,'#c08cff',.16);break;
      case 'sunder':shards(hx,hy,3,'#ffb36b',{lo:50,hi:150,size:2});sparks(hx,hy,4,'#ffb36b',{lo:50,hi:150,life:.22});break;
      case 'decay':dark(o.x,o.y,o.r*1.8,'#b48cff');wisps(o.x,o.y,8,'#b48cff',{jit:o.r*1.5});break;
      case 'dodge':flash(f.x,f.y,f.r*1.7,f.col,.2);wave(f.x,f.y,f.r*1.5,f.r*.6,.24,'#ffffff',1.6);dust(f.x,f.y,4,null,{jit:f.r});
        for(let s=-1;s<2;s+=2)line(f.x+Math.cos(to+1.57)*f.r*s,f.y+Math.sin(to+1.57)*f.r*s,f.x+Math.cos(to+1.57)*(f.r+16)*s,f.y+Math.sin(to+1.57)*(f.r+16)*s,'#ffffff',1.6,.2);break;
      case 'plating':{const p=rim(f,to);sparks(p[0],p[1],4,STEEL,{dir:to,spread:1.4,lo:100,hi:240,life:.2,size:1});stars(p[0],p[1],1,STEEL,{lo:0,hi:6,life:.2,size:3.4});break}
      case 'brace':word(f.i,'brace',f.x,f.y,'Braced',STEEL);wave(f.x,f.y,f.r+12,f.r+2,.26,STEEL,3.4);sparks(f.x,f.y,6,STEEL,{lo:80,hi:200,jit:f.r});break;
      case 'rebound':wave(f.x,f.y,f.r+3,f.r+10,.3,'#9fc6ff',1.6);break;
      case 'clutch':{const p=rim(f,to);sparks(p[0],p[1],5,STEEL,{dir:to,spread:1.6,lo:90,hi:220,life:.22});wave(f.x,f.y,f.r+2,f.r+9,.22,STEEL,1.8);break}
      case 'barrier':{const p=rim(f,to,1.25);
        if(e.n>0){wave(f.x,f.y,f.r+7,f.r+13,.26,GOLDC,1.6);sparks(p[0],p[1],4,GOLDC,{dir:to,spread:1.8,lo:60,hi:170,life:.22});flash(p[0],p[1],10,GOLDC,.12)}
        else{shatter(f.x,f.y,14,GOLDC,f.r*1.6);wave(f.x,f.y,f.r+7,f.r+30,.4,GOLDC,2.6)}break}
      case 'static':zapEnd(o.x,o.y);sparks(f.x,f.y,4,'#bff4ff',{lo:50,hi:150,life:.2,jit:f.r});break;
      case 'icyskin':frost(o.x,o.y,o.r,6);break;
      case 'mending':plus(f.x,f.y,3,'#8be07a',{jit:f.r});stars(x,y,3,'#b5ecae',{lo:10,hi:50});flash(x,y,10,'#7ddc5a',.16);break;
      case 'siphon':seek(o.x,o.y,f.i,4,'#ff6f91');line(o.x,o.y,f.x,f.y,'#ff6f91',1.4,.22);break;
      case 'adrenaline':word(f.i,'adrenaline',f.x,f.y,'Adrenaline','#ffd447',true,6);flash(f.x,f.y,f.r*2.4,'#ffd447',.24);wave(f.x,f.y,f.r,f.r*2.4,.4,'#ffd447',3,.25);sparks(f.x,f.y,14,'#ffd447',{lo:90,hi:260});break;
      case 'partingshot':word(f.i,'partingshot',f.x,f.y,'Parting shot','#ff6a5a',true);explode(f.x,f.y,60,'#ff5a4a');wave(f.x,f.y,10,110,.6,'#ff5a4a',2);
        line(f.x,f.y,o.x,o.y,'#ffb0a0',3,.26);kick(5);break;
      case 'lunge':{word(f.i,'lunge',f.x,f.y,'Lunge','#ffb347',false,2);wave(f.x,f.y,f.r*1.6,f.r*.7,.26,'#ffb347',2.4);flash(f.x,f.y,f.r*1.8,'#ffb347',.18);
        for(let s=0;s<5;s++){const off=(R()-.5)*f.r*1.8,bx=f.x-Math.cos(to)*(f.r+4)+Math.cos(to+1.57)*off,by=f.y-Math.sin(to)*(f.r+4)+Math.sin(to+1.57)*off,l=14+R()*20;line(bx,by,bx-Math.cos(to)*l,by-Math.sin(to)*l,'#ffd9a0',1.2,.26)}break}
      case 'keepaway':poof(f.x,f.y,f.r,'#dfe8f5');wave(f.x,f.y,f.r+4,f.r+12,.3,'#cfe1ff',1.8);break;
      case 'shoulder':{const cx=(f.x+o.x)/2,cy=(f.y+o.y)/2;flash(cx,cy,18,'#ffb347',.14);wave(cx,cy,4,30,.28,'#ffb347',3,.3);sparks(cx,cy,9,'#ffd27a',{dir:to,spread:2,lo:90,hi:260});dust(cx,cy,3);kick(2);break}
      case 'nova':stars(f.x,f.y,10,f.col,{lo:90,hi:240,life:.45});wave(f.x,f.y,f.r,84,.5,'#ffffff',1.2);kick(3);break;
      case 'concuss':stars(o.x,o.y-o.r,6,'#ffe66b',{lo:20,hi:70,jit:o.r,life:.7});wave(o.x,o.y,o.r*.6,o.r+12,.3,'#ffe66b',2.2);break;
      case 'wild':if(e.n>=1.5){confetti(hx,hy,8);stars(hx,hy,3,GOLDC)}else if(e.n<=.65)smoke(hx,hy,2,'#8a857c',{lo:6,hi:26});break;
      case 'bloodpact':{const p=rim(f,to+3.14);drops(p[0],p[1],3,'#d8324a',{dir:to+3.14,spread:1.6,lo:30,hi:90});break}
      case 'blitz':sparks(hx,hy,4,'#ffb347',{lo:80,hi:220,life:.24});break;
      case 'momentum':line(hx,hy,hx-Math.cos(to)*26,hy-Math.sin(to)*26,'#ffffff',2,.16);break;
    }
  }

  // ----- continuous effects, from the state of the fight -----
  function ambient(m,dt){
    if(!m||api.calm)return;
    if(m!==lastM){lastM=m;reset(false)}
    const sudden=typeof SUDDEN==='number'&&m.t>SUDDEN&&!m.over,A=typeof AW==='number'?AW:360;
    if(!entered){                                           // the fighters arrive with a flourish
      entered=true;
      if(m.t<1.5)for(const f of m.f){wave(f.x,f.y,f.r*2.6,f.r,.36,f.col,2.4);wave(f.x,f.y,f.r*.6,f.r*2.1,.46,'#ffffff',1.2);sparks(f.x,f.y,10,f.col,{lo:60,hi:190,life:.36});stars(f.x,f.y,4,GOLDC,{jit:f.r*1.6});dust(f.x,f.y+f.r*.6,4,null,{jit:f.r})}
    }
    if(sudden&&!sdOn){                                      // the moment the arena turns on both of them
      sdOn=true;const c=A/2;
      if(api.say)api.say(c,c+26,'Sudden death','#ff6a4a',true);
      wave(c,c,10,A*.75,.8,'#ff4a2a',4,.2);wave(c,c,6,A*.5,.6,'#ffb347',2);kick(4);
      for(const f of m.f)embers(f.x,f.y,10,'#ff5a2a',{jit:f.r*2});
    }
    if(sudden){for(let n=due(0,'sd',9,dt);n>0;n--){const side=(R()*4)|0,t=R()*A;embers(side===0?t:side===1?t:side===2?3:A-3,side===0?A-3:side===1?3:t,1,'#ff5a2a',{life:1.1,lo:6,hi:30})}}
    for(const f of m.f){
      if(!(f.hp>0)){continue}
      const e=m.f[1-f.i],p=f.p||{},u=f.u||{},ep=e.p||{},eu=e.u||{},i=f.i,r=f.r,gone=f.gone;
      const L=typeof LOOKS!=='undefined'&&LOOKS[f.key];
      if(L&&L.amb){try{L.amb(f,e,m,dt)}catch(err){api.errors++;if(!api.lastError)api.lastError=f.key+': '+(err&&err.message||err)}}
      if(gone||m.over)continue;
      const sp=Math.hypot(f.vx,f.vy)||1,bx=-f.vx/sp,by=-f.vy/sp;      // "behind" the fighter
      const around=()=>{const a=R()*TAU;return rim(f,a,.75+R()*.4)};
      let n;
      if(f.poisonT>0){for(n=due(i,'po',9,dt);n>0;n--){const c=around();bubbles(c[0],c[1],1,VENOM)}for(n=due(i,'pd',2.5,dt);n>0;n--)drops(f.x+(R()-.5)*r,f.y+r*.6,1,VENOM,{dir:1.57,spread:.6,lo:10,hi:40})}
      if(f.slowT>0)for(n=due(i,'sl',8,dt);n>0;n--){const c=around();flakes(c[0],c[1],1,ICE)}
      if(f.stunT>0)for(n=due(i,'st',5,dt);n>0;n--){const c=around();stars(c[0],c[1],1,ICE,{lo:2,hi:14,size:2.6,life:.4})}
      if(f.regen>0&&f.hp<f.max-.5)for(n=due(i,'rg',1.2+f.regen*.35,dt);n>0;n--){const c=around();plus(c[0],c[1],1,'#8be07a')}
      if(f.last&&f.hp<f.max*.4)for(n=due(i,'ls',13,dt);n>0;n--){const c=around();embers(c[0],c[1],1,'#ff5a3a')}
      if(f.ambush>0)for(n=due(i,'am',6,dt);n>0;n--){const c=around();wisps(c[0],c[1],1,'#a67cff',{life:.6})}
      if(sudden)for(n=due(i,'sdf',5,dt);n>0;n--){const c=around();embers(c[0],c[1],1,'#ff7a3a')}
      if(p.blitz&&m.t<6)for(n=due(i,'bz',24,dt);n>0;n--)sparks(f.x+bx*r*.6+(R()-.5)*r,f.y+by*r*.6+(R()-.5)*r,1,R()<.5?'#ffb347':'#ffe27a',{dir:Math.atan2(by,bx),spread:.9,lo:20,hi:90,life:.3});
      if(p.slowburn){const st=Math.min(10,Math.floor(m.t/2));for(n=due(i,'sb',1.3*st,dt);n>0;n--){const c=around();embers(c[0],c[1],1,'#ff8a3a')}}
      if(p.momentum&&f.speed>180)for(n=due(i,'mo',Math.min(22,(f.speed-170)*.22),dt);n>0;n--)streak(f,bx,by,'#ffffff');
      if(p.faster)for(n=due(i,'fa',2.5*p.faster,dt);n>0;n--)streak(f,bx,by,'#fff1cf');
      if(p.adrenaline&&u.adr){for(n=due(i,'ad',16,dt);n>0;n--){const c=around();sparks(c[0],c[1],1,'#ffd447',{lo:30,hi:110,life:.22})}for(n=due(i,'ad2',6,dt);n>0;n--)streak(f,bx,by,'#ffd447')}
      if(p.lunge&&m.t<(u.lgH||0))for(n=due(i,'lg',30,dt);n>0;n--)embers(f.x+bx*r*.5+(R()-.5)*r*1.2,f.y+by*r*.5+(R()-.5)*r*1.2,1,R()<.4?'#ffe27a':'#ff8a3a',{life:.4,lo:4,hi:30});
      if(p.ricochet&&m.t<(u.rcT||0))for(n=due(i,'rc',26,dt);n>0;n--)sparks(f.x+(R()-.5)*r*1.4,f.y+(R()-.5)*r*1.4,1,'#7fe7ff',{lo:10,hi:60,life:.26,size:1});
      if(p.riposte&&m.t<(u.rpT||0))for(n=due(i,'rp',10,dt);n>0;n--){const c=around();embers(c[0],c[1],1,'#ff5a6e',{life:.45})}
      if(p.patient&&m.t-(u.ptT===undefined?-9:u.ptT)>=2.5)for(n=due(i,'pt',3,dt);n>0;n--){const c=around();stars(c[0],c[1],1,'#ffffff',{lo:2,hi:12,size:3,life:.5})}
      if(p.sharper&&f.arms&&f.arms.length)for(n=due(i,'sh',.5+.35*p.sharper,dt);n>0;n--){const A0=f.arms[(R()*f.arms.length)|0],an=f.ang*A0.rate+A0.a,d=f.r+A0.l*(.5+R()*.5);stars(f.x+Math.cos(an)*d,f.y+Math.sin(an)*d,1,'#ffffff',{lo:0,hi:6,size:3.4,life:.3})}
      if(p.bloodpact)for(n=due(i,'bp',1.5,dt);n>0;n--)drops(f.x+(R()-.5)*r,f.y+r*.5,1,'#d8324a',{dir:1.57,spread:.5,lo:10,hi:40});
      if(p.glass)for(n=due(i,'gl',1.2,dt);n>0;n--){const c=around();stars(c[0],c[1],1,'#d8f4ff',{lo:0,hi:8,size:2.6,life:.35})}
      if(u.bar>0)for(n=due(i,'br',2.5,dt);n>0;n--){const a=R()*TAU;stars(f.x+Math.cos(a)*(r+7),f.y+Math.sin(a)*(r+7),1,GOLDC,{lo:0,hi:8,size:2.4,life:.4})}
      // what the rival's upgrades are doing to this fighter
      if(ep.decay&&m.t>6)for(n=due(i,'dc',7,dt);n>0;n--){const c=around();wisps(c[0],c[1],1,'#b48cff',{grav:18,life:.7})}
      if(ep.siphon&&!e.gone&&Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r+40)for(n=due(i,'si',5,dt);n>0;n--)seek(f.x,f.y,e.i,1,'#ff6f91',0,0,{jit:r,size:1.2});
    }
    if(cheer&&m.f[cheer.i]){
      cheer.t-=dt;const w=m.f[cheer.i];
      for(let n=due(cheer.i,'ch',26,dt);n>0;n--){const a=R()*TAU;stars(w.x+Math.cos(a)*w.r*1.4,w.y+Math.sin(a)*w.r*1.4,1,R()<.6?GOLDC:w.col,{lo:20,hi:80,grav:-60,life:.8})}
      for(let n=due(cheer.i,'cf',14,dt);n>0;n--)confetti(w.x+(R()-.5)*w.r*2,w.y-w.r,1,null,{dir:-1.57,spread:1.8,lo:80,hi:220});
      if(cheer.t<=0)cheer=null;
    }
    // shots leave a glowing wake
    for(const b of m.bullets){if(due(b.own,'bl',16,dt)){const o=m.f[b.own],p=put('ember',1,1,b.x,b.y,(R()-.5)*14,(R()-.5)*14,.28,1.5,o?o.col:GOLDC);if(p){p.g=0;p.drag=2}}}
  }
  function streak(f,bx,by,col){
    const off=(R()-.5)*f.r*1.7,x=f.x+bx*f.r*.6-by*off,y=f.y+by*f.r*.6+bx*off,l=10+R()*16;
    line(x,y,x+bx*l,y+by*l,col,1,.2);
  }

  // ----- a fallen fighter explodes (Build 85; it broke along cracks in Builds 82 to 84) -----
  // The user asked for the knockout of the "Crypt" sample (the 3D art idea of Build 61's time): "When a unit dies have it
  // explode into pieces maybe similarly to the way it did in our Crypt art style idea before." Build 82 instead cut the
  // ball's picture into flat slabs that slid apart, and the user said: "The explosion effect when you die is not like the
  // crypt one, I want it more like that." So this is the Crypt's, seen from above: the ball is gone at once and eighteen
  // faceted chunks (eight-sided, uneven, like rough-cut rock) are thrown UP and outwards, tumbling, fall back under gravity, bounce two or three
  // times losing speed, and lie where they stop until the next fight. The sample's numbers, a little closer in: out at 45 to 170,
  // up at 130 to 330, gravity 600, 0.42 of the speed kept on a bounce. A chunk is solid: each face is lit by the arena's
  // lamp (hard, no glow), it throws a shadow that moves away from it as it rises, and it looks a little larger when high.
  // One side of a chunk is the fighter's paint (the ball's skin), the rest the bare stone inside; both carry a grain. Small chips fly with them and fade; a soot mark
  // stays on the floor; the fighter's weapons are thrown clear. The sample's burst of light and rings are left out (all
  // light effects are off, see EFFECTS_OFF below).
  // Needs brawl-art.js; without it nothing is drawn here (the tests take that path).
  const RUB=[],SOOT=[];let rubOf=null;                // the pieces and marks, and the fight they belong to: a new fight sweeps them away
  const LKL=Math.hypot(.5,.6,.62),LK=[-.5/LKL,-.6/LKL,.62/LKL],LKH=Math.hypot(LK[0],LK[1]),SHX=-LK[0]/LKH,SHY=-LK[1]/LKH;   // the lamp of brawl-art.js, and which way shadows fall
  // the two shapes: a rough eight-sided rock for the chunks, a four-sided splinter for the chips
  const OCT={v:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],f:[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]]};
  const TET={v:[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>v.map(c=>c/1.732)),f:[[0,1,2],[0,3,1],[0,2,3],[1,3,2]]};
  const INNER=[128,125,118],PV=[0,1,2,3,4,5].map(()=>[0,0,0]);
  let GRAIN=null;                                      // a speckle laid over every face, so a chunk is stone and not plastic
  function grain(g){
    if(GRAIN!==null)return GRAIN;
    try{
      const N=64,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d'),im=c.createImageData(N,N),d=im.data;
      for(let i=0;i<N*N;i++){const q=Math.random(),o=i*4,dark=q<.5;d[o]=d[o+1]=d[o+2]=dark?0:255;d[o+3]=q<.07?70:q<.5?(.5-q)*56:q>.95?46:(q-.5)*26}
      c.putImageData(im,0,0);
      GRAIN=g.createPattern(cv,'repeat')||false;
    }catch(err){GRAIN=false}
    return GRAIN;
  }
  // the colour a fighter's paint shows in the arena: the average of its own picture away from the emblem
  function paintOf(f,col){
    try{
      const pic=ART.pictureOf(f,col),N=24,cv=document.createElement('canvas');cv.width=cv.height=N;
      const c=cv.getContext('2d');c.drawImage(pic,0,0,N,N);
      const d=c.getImageData(0,0,N,N).data;let r=0,g=0,b=0,n=0;
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){
        const q=Math.hypot(x-(N-1)/2,y-(N-1)/2)/(N/2),i=(y*N+x)*4;
        if(q<.62||q>.86||d[i+3]<250)continue;
        r+=d[i];g+=d[i+1];b+=d[i+2];n++;
      }
      if(n>8)return [r/n*1.12,g/n*1.12,b/n*1.12];
    }catch(err){}
    const h=/^#?([0-9a-f]{6})$/i.exec(String(col||''));if(h){const v=parseInt(h[1],16);return [(v>>16&255)*.85,(v>>8&255)*.85,(v&255)*.85]}
    return [150,150,150];
  }
  // the soot left where it burst: a small dark picture made dot by dot, one dot to an arena unit like the floor's bricks
  function sootPic(r){
    const N=Math.max(16,Math.round(r*2)),cv=document.createElement('canvas');cv.width=cv.height=N;
    const c=cv.getContext('2d'),im=c.createImageData(N,N),d=im.data,lobes=[];
    for(let i=0;i<7;i++){const a=Math.random()*TAU,q=Math.random()*.42;lobes.push([.5+Math.cos(a)*q,.5+Math.sin(a)*q,.2+Math.random()*.22])}
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      let v=0;for(const L of lobes){const q=Math.hypot(x/N-L[0],y/N-L[1])/L[2];if(q<1)v=Math.max(v,1-q)}
      v=v*1.5+(Math.random()-.5)*.5;
      const a=v>1?.5:v>.62?.36:v>.32?.2:v>.14?.09:0,i=(y*N+x)*4;
      d[i]=8;d[i+1]=8;d[i+2]=10;d[i+3]=a*255;
    }
    c.putImageData(im,0,0);
    return cv;
  }
  // a piece of the ball: shape = OCT or TET, size = how far its corners are from its middle, paint and how much of it
  // is painted (the share of its faces, all on one side)
  function piece(shape,x,y,z,size,paint,part,dir,sp,up,bx,by,life){
    const rnd=()=>{const a=Math.random()*2-1,b=Math.random()*2-1,c=Math.random()*2-1,l=Math.hypot(a,b,c)||1;return [a/l,b/l,c/l]},ax=rnd(),side=rnd();
    const sq=[.75+Math.random()*.5,.75+Math.random()*.5,.6+Math.random()*.4];
    const off=()=>(Math.random()-.5)*size*.5;            // no two corners alike, so it is a rock and not a cut gem
    const v=shape.v.map(t=>{const j=size*(.7+Math.random()*.6);return [t[0]*j*sq[0]+off(),t[1]*j*sq[1]+off(),t[2]*j*sq[2]+off()*.6]});
    const cols=shape.f.map(F=>{
      const mx=(v[F[0]][0]+v[F[1]][0]+v[F[2]][0])/3,my=(v[F[0]][1]+v[F[1]][1]+v[F[2]][1])/3,mz=(v[F[0]][2]+v[F[1]][2]+v[F[2]][2])/3,ml=Math.hypot(mx,my,mz)||1;
      const skin=(mx*side[0]+my*side[1]+mz*side[2])/ml>1-2*part,c=skin?paint:INNER,j=.9+Math.random()*.2;
      return [c[0]*j,c[1]*j,c[2]*j];
    });
    return {k:0,x,y,z,size,vx:Math.cos(dir)*sp+bx,vy:Math.sin(dir)*sp+by,vz:up,ax:ax[0],ay:ax[1],az:ax[2],th:Math.random()*TAU,
      w:(Math.random()<.5?-1:1)*(3+Math.random()*8),rest:false,cols,life,max:life,v,f:shape.f,big:shape===OCT};
  }
  function breakApart(f,col,win,x,y,m){
    if(typeof ART==='undefined'||!ART||!ART.ok||typeof document==='undefined')return false;
    try{
      if(rubOf!==m){RUB.length=0;SOOT.length=0;rubOf=m}
      const r=f.r,k=r/24,paint=paintOf(f,col);
      // the blow comes from the winner: everything is carried a little that way
      let bx=0,by=0;if(win){const d=Math.hypot(x-win.x,y-win.y)||1;bx=(x-win.x)/d*28;by=(y-win.y)/d*28}
      for(let i=0;i<18;i++){
        const a=i/18*TAU+Math.random()*.6,d=Math.random()*r*.5;
        RUB.push(piece(OCT,x+Math.cos(a)*d,y+Math.sin(a)*d,r*(.5+Math.random()*.9),(5.5+Math.random()*5.5)*k,paint,.62,a+(Math.random()-.5)*.9,45+Math.random()*125,130+Math.random()*200,bx,by,0));
      }
      for(let i=0;i<30;i++){                                 // chips: fast, small, gone in a second
        const a=Math.random()*TAU,d=Math.random()*r*.7;
        RUB.push(piece(TET,x+Math.cos(a)*d,y+Math.sin(a)*d,r*(.4+Math.random()),(1.2+Math.random()*1.6)*k,paint,.6,a,80+Math.random()*220,90+Math.random()*330,bx,by,.75+Math.random()*.6));
      }
      // its weapons fly off the way they were pointing, spinning
      if(f.arms&&ART.strip&&ART.HELD)for(const A of f.arms){
        const T=ART.strip(ART.pick(f,A));if(!T||T.loose)continue;
        const an=f.ang*(A.rate||1)+A.a,c=Math.cos(an),s=Math.sin(an),sp=70+Math.random()*60;
        RUB.push({k:1,x:x+c*r*.9,y:y+s*r*.9,z:0,a:an,vx:c*sp+bx*1.4,vy:s*sp+by*1.4,va:(Math.random()<.5?-1:1)*(4+Math.random()*5),T,len:A.l+r*.1});
      }
      SOOT.push({x:Math.round(x),y:Math.round(y),r:Math.round(r*1.55),pic:sootPic(r*1.55)});
      return true;
    }catch(err){return false}
  }
  function moveRubble(dt){
    const lo=3,hi=(typeof AW==='number'?AW:260)-3,slide=Math.exp(-3.4*dt),stop=Math.exp(-9*dt);
    for(let i=RUB.length-1;i>=0;i--){
      const p=RUB[i];
      if(p.k===1){p.a+=p.va*dt;p.vx*=slide;p.vy*=slide;p.va*=slide}
      else{
        if(p.max){p.life-=dt;if(p.life<=0){RUB.splice(i,1);continue}}
        if(p.rest){p.vx*=stop;p.vy*=stop;p.w*=stop}
        else{
          p.vz-=600*dt;p.z+=p.vz*dt;
          if(p.z<=0){p.z=0;if(p.vz>-48){p.rest=true;p.vz=0}else{p.vz*=-.42;p.vx*=.72;p.vy*=.72;p.w*=.7}}
        }
        p.th+=p.w*dt;
      }
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<lo){p.x=lo;p.vx=Math.abs(p.vx)*.4}else if(p.x>hi){p.x=hi;p.vx=-Math.abs(p.vx)*.4}
      if(p.y<lo){p.y=lo;p.vy=Math.abs(p.vy)*.4}else if(p.y>hi){p.y=hi;p.vy=-Math.abs(p.vy)*.4}
    }
  }
  // turns a chunk's corners to where they are now (into PV) and returns how much larger it looks for being off the floor
  function turn(p){
    const c=Math.cos(p.th),s=Math.sin(p.th),ax=p.ax,ay=p.ay,az=p.az;
    for(let i=0;i<p.v.length;i++){
      const v=p.v[i],d=(ax*v[0]+ay*v[1]+az*v[2])*(1-c),o=PV[i];
      o[0]=v[0]*c+(ay*v[2]-az*v[1])*s+ax*d;o[1]=v[1]*c+(az*v[0]-ax*v[2])*s+ay*d;o[2]=v[2]*c+(ax*v[1]-ay*v[0])*s+az*d;
    }
    return 1+p.z/210;
  }
  function chunkShadow(g,p){
    const sc=turn(p),h=p.z*.6+p.size*.32,ox=p.x+SHX*h,oy=p.y+SHY*h;
    g.globalAlpha=.55/(1+p.z/70)*(p.max?Math.min(1,p.life/.3):1);
    g.beginPath();
    for(const F of p.f){
      const A=PV[F[0]],B=PV[F[1]],C=PV[F[2]],fl=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0])<0;   // all wound the same way, so they fill as one shape
      g.moveTo(ox+A[0]*sc,oy+A[1]*sc);
      if(fl){g.lineTo(ox+C[0]*sc,oy+C[1]*sc);g.lineTo(ox+B[0]*sc,oy+B[1]*sc)}else{g.lineTo(ox+B[0]*sc,oy+B[1]*sc);g.lineTo(ox+C[0]*sc,oy+C[1]*sc)}
      g.closePath();
    }
    g.fill();
  }
  // a chunk as a solid thing: each face that is turned to the sky, lit by the lamp. Drawn four times finer than the
  // arena's units so the grain is fine; the grain is fixed to the chunk's place, not to the floor.
  function chunk(g,p){
    const Z=4,sc=turn(p)*Z,n=p.v.length,gr=p.big?grain(g):null;
    let mx=0,my=0,mz=0;for(let i=0;i<n;i++){mx+=PV[i][0];my+=PV[i][1];mz+=PV[i][2]}mx/=n;my/=n;mz/=n;
    g.save();g.translate(p.x,p.y);g.scale(1/Z,1/Z);g.lineWidth=1;
    const al=p.max?Math.min(1,p.life/.3):1;
    for(let i=0;i<p.f.length;i++){
      const F=p.f[i],A=PV[F[0]],B=PV[F[1]],C=PV[F[2]];
      let nx=(B[1]-A[1])*(C[2]-A[2])-(B[2]-A[2])*(C[1]-A[1]),ny=(B[2]-A[2])*(C[0]-A[0])-(B[0]-A[0])*(C[2]-A[2]),nz=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]);
      if(nx*((A[0]+B[0]+C[0])/3-mx)+ny*((A[1]+B[1]+C[1])/3-my)+nz*((A[2]+B[2]+C[2])/3-mz)<0){nx=-nx;ny=-ny;nz=-nz}
      if(nz<=0)continue;                                     // this face is turned to the floor
      const nl=Math.hypot(nx,ny,nz)||1,lit=Math.max(0,(nx*LK[0]+ny*LK[1]+nz*LK[2])/nl),sh=.34+1.06*lit,q=p.cols[i];
      const col='rgb('+Math.min(255,q[0]*sh|0)+','+Math.min(255,q[1]*sh|0)+','+Math.min(255,q[2]*sh|0)+')';
      g.globalAlpha=al;g.fillStyle=col;g.strokeStyle=col;
      g.beginPath();g.moveTo(A[0]*sc,A[1]*sc);g.lineTo(B[0]*sc,B[1]*sc);g.lineTo(C[0]*sc,C[1]*sc);g.closePath();g.fill();g.stroke();
      if(gr){g.fillStyle=gr;g.fill()}
    }
    g.restore();
  }
  const byHeight=(a,b)=>(a.z||0)-(b.z||0);
  // on the floor: the soot, every shadow, the dropped weapons and the chunks that have landed
  function drawRubble(g){
    if(!RUB.length&&!SOOT.length)return;
    g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;g.lineJoin='round';g.lineWidth=.3;
    const sm=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;
    for(const s of SOOT)g.drawImage(s.pic,s.x-s.r,s.y-s.r,s.r*2,s.r*2);
    g.imageSmoothingEnabled=sm;
    g.fillStyle='#000';
    for(const p of RUB)if(p.k===0)chunkShadow(g,p);
    for(const p of RUB){
      if(p.k===1){                                           // a dropped weapon: its shadow, then itself
        const T=p.T,k=p.len/170,fw=T.fw*k,fh=T.fh*k,gx=17*k;
        g.save();g.globalAlpha=.45;g.translate(p.x+1,p.y+1.4);g.rotate(p.a);g.drawImage(T.sh,0,0,T.fw,T.fh,-gx,-fh/2,fw,fh);g.restore();
        g.save();g.globalAlpha=1;g.translate(p.x,p.y);g.rotate(p.a);g.drawImage(T.img,0,0,T.fw,T.fh,-gx,-fh/2,fw,fh);g.restore();
      }else if(p.z<3)chunk(g,p);
    }
    g.restore();
  }
  // in the air, over the fighters: the chunks still flying, the lowest first
  function drawFlying(g){
    if(!RUB.length)return;
    g.save();g.globalCompositeOperation='source-over';g.lineJoin='round';g.lineWidth=.3;
    RUB.sort(byHeight);
    for(const p of RUB)if(p.k===0&&p.z>=3)chunk(g,p);
    g.restore();
  }

  // ----- the wall lights up where a fighter bounces off it (Build 85) -----
  // The user: "Let's add the wall bouncing effect, let's have it light up that part of the wall when it bounces off".
  // This only keeps the list of recent bounces; brawl-looks.js draws them, because the wall's picture is there
  // (wallLight). Each: where on the wall, which way the wall faces, the fighter's size, how hard (0..1). The light is
  // white whoever bounced (Build 86, the user: "it should just be white").
  const WH=[];
  function wallHit(e,own){
    if(!own||own.gone)return;                              // a fighter that has faded from sight stays hidden
    if(WH.length>=10)WH.shift();
    WH.push({x:e.x,y:e.y,nx:e.nx,ny:e.ny,r:own.r,k:Math.min(1,.6+Math.hypot(own.vx||0,own.vy||0)/420),life:.5,max:.5});
  }
  function moveWall(dt){for(let i=WH.length-1;i>=0;i--){WH[i].life-=dt;if(WH[i].life<=0)WH.splice(i,1)}}

  // ----- per-frame bookkeeping -----
  function reset(soft){
    if(!soft){P.length=0;W.length=0;DEC.length=0;RUB.length=0;SOOT.length=0;WH.length=0}
    SQ[0].t=SQ[1].t=9;ACC[0]={};ACC[1]={};cheer=null;entered=false;sdOn=false;
    for(const k in SAID)delete SAID[k];
  }
  function update(dt){
    clock+=dt;
    moveRubble(dt);moveWall(dt);
    slowDt+=(dt-slowDt)*.05;                               // a slow phone gets fewer particles rather than a slower game
    q=api.calm?.3:slowDt>.03?.45:slowDt>.022?.7:1;
    for(let i=P.length-1;i>=0;i--){
      const p=P[i];
      p.life-=dt;
      if(p.life<=0){P[i]=P[P.length-1];P.pop();continue}
      if(p.k==='seek'){
        let tx=p.x2,ty=p.y2,tr=6;
        if(p.to>=0&&lastM&&lastM.f[p.to]){const t=lastM.f[p.to];tx=t.x;ty=t.y;tr=t.r*.6}
        const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1,age=p.max-p.life,want=p.grow+age*520,k=Math.min(1,dt*(3+age*14));
        p.vx+=(dx/d*want-p.vx)*k;p.vy+=(dy/d*want-p.vy)*k;
        if(d<tr+3){p.life=0;continue}
      }else{
        if(p.drag){const k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k}
        p.vy+=p.g*dt;p.s+=p.grow*dt;
      }
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
    }
    for(let i=W.length-1;i>=0;i--){W[i].life-=dt;if(W[i].life<=0)W.splice(i,1)}
    for(let i=DEC.length-1;i>=0;i--){DEC[i].life-=dt;if(DEC[i].life<=0)DEC.splice(i,1)}
    for(const s of SQ)s.t+=dt;
    if(screen>0)screen=Math.max(0,screen-dt*2.4);
  }
  // squash along the direction of the knock: {k,th} or null
  function sq(i){
    const s=SQ[i];if(!s||s.t>.3||!s.k)return null;
    const k=s.k*Math.exp(-s.t*13)*Math.cos(s.t*34);
    return Math.abs(k)<.004?null:{k,th:s.th};
  }

  // ----- drawing -----
  function drawParts(g,layer){
    const n=P.length;
    let any=false;
    for(let i=0;i<n;i++){
      const p=P[i];
      if(p.L!==layer)continue;
      if(p.add){any=true;continue}
      const t=p.life/p.max,a=t<.35?t/.35:1,x=p.x,y=p.y,s=p.s;
      switch(p.k){
        case 'puff':blit(g,p.col,false,x,y,s,a*.5*Math.min(1,(1-t)*8+.3));break;
        case 'shard':{
          const c=Math.cos(p.rot),sn=Math.sin(p.rot);
          g.globalAlpha=a;g.fillStyle=p.col;g.strokeStyle=EDGEC;g.lineWidth=.4;
          g.beginPath();g.moveTo(x+c*s,y+sn*s);g.lineTo(x-sn*s*.55-c*s*.5,y+c*s*.55-sn*s*.5);g.lineTo(x+sn*s*.5-c*s*.7,y-c*s*.5-sn*s*.7);g.closePath();g.fill();g.stroke();
          break}
        case 'bubble':
          g.globalAlpha=a*.85;g.strokeStyle=p.col;g.lineWidth=.5;g.beginPath();g.arc(x+Math.sin(clock*5+p.tw)*1.2,y,s,0,TAU);g.stroke();
          g.globalAlpha=a*.3;g.fillStyle=p.col;g.fill();
          g.globalAlpha=a*.9;g.fillStyle='#ffffff';g.beginPath();g.arc(x+Math.sin(clock*5+p.tw)*1.2-s*.35,y-s*.35,s*.22,0,TAU);g.fill();
          break;
        case 'plus':{
          const w=s*.34,k=Math.min(1,(1-t)*6);
          g.globalAlpha=a;g.fillStyle=EDGEC;g.fillRect(x-s*k-.45,y-w-.45,s*2*k+.9,w*2+.9);g.fillRect(x-w-.45,y-s*k-.45,w*2+.9,s*2*k+.9);
          g.fillStyle=p.col;g.fillRect(x-s*k,y-w,s*2*k,w*2);g.fillRect(x-w,y-s*k,w*2,s*2*k);
          break}
        case 'drop':{
          const sp=Math.hypot(p.vx,p.vy)||1,l=Math.min(3,sp*.012)*s;
          g.globalAlpha=a;g.strokeStyle=p.col;g.lineWidth=s*1.3;g.beginPath();g.moveTo(x,y);g.lineTo(x-p.vx/sp*l,y-p.vy/sp*l);g.stroke();
          break}
        case 'leaf':g.globalAlpha=a;g.fillStyle=p.col;g.strokeStyle=EDGEC;g.lineWidth=.35;g.beginPath();g.ellipse(x,y,s,s*.45,p.rot,0,TAU);g.fill();g.stroke();break;
        case 'conf':g.globalAlpha=a;g.fillStyle=p.col;g.beginPath();g.ellipse(x,y,s,Math.max(.25,Math.abs(Math.cos(clock*11+p.tw))*s*.6),p.rot,0,TAU);g.fill();break;
      }
    }
    g.globalAlpha=1;
    if(!any)return;
    g.globalCompositeOperation='lighter';
    for(let i=0;i<n;i++){
      const p=P[i];
      if(p.L!==layer||!p.add)continue;
      const t=p.life/p.max,x=p.x,y=p.y,s=p.s;
      switch(p.k){
        case 'spark':case 'seek':{
          const a=Math.min(1,t*1.7),sp=Math.hypot(p.vx,p.vy)||1,l=Math.min(p.k==='seek'?16:13,sp*.04);
          g.globalAlpha=a;g.strokeStyle=p.col;g.lineWidth=s*(.45+.55*a);g.beginPath();g.moveTo(x,y);g.lineTo(x-p.vx/sp*l,y-p.vy/sp*l);g.stroke();
          blit(g,p.col,true,x,y,s*(p.k==='seek'?3.4:2.6),a*.9);
          break}
        case 'ember':blit(g,p.col,true,x+Math.sin(clock*6+p.tw)*1.4,y,s*2.3*(.5+.5*t),Math.min(1,t*2)*(.65+.35*Math.sin(clock*31+p.tw)));break;
        case 'wisp':blit(g,p.col,true,x+Math.sin(clock*3+p.tw)*3,y,s,Math.min(1,t*2)*Math.min(1,(1-t)*5)*.5);break;
        case 'star':{
          const a=Math.min(1,t*2.2),r=s*(.6+.4*Math.sin(clock*15+p.tw))*Math.min(1,(1-t)*7+.2),w=r*.16;
          g.globalAlpha=a;g.fillStyle='#ffffff';
          g.beginPath();g.moveTo(x,y-r);g.lineTo(x+w,y-w);g.lineTo(x+r,y);g.lineTo(x+w,y+w);g.lineTo(x,y+r);g.lineTo(x-w,y+w);g.lineTo(x-r,y);g.lineTo(x-w,y-w);g.closePath();g.fill();
          blit(g,p.col,true,x,y,r*1.5,a*.85);
          break}
        case 'flake':{
          const a=Math.min(1,t*2);
          g.globalAlpha=a*.9;g.strokeStyle=p.col;g.lineWidth=.55;g.beginPath();
          for(let k=0;k<3;k++){const an=p.rot+k*1.0472,c=Math.cos(an)*s,sn=Math.sin(an)*s;g.moveTo(x-c,y-sn);g.lineTo(x+c,y+sn)}
          g.stroke();blit(g,p.col,true,x,y,s*1.6,a*.35);
          break}
        case 'flash':blit(g,p.col,true,x,y,s*(1.25-.35*t),t*t*.95);break;
        case 'slash':{
          const c=Math.cos(p.rot),sn=Math.sin(p.rot),L=s*(1.25-.35*t),px=-sn*L,py=c*L;
          g.globalAlpha=t*.95;g.fillStyle=p.col;
          g.beginPath();g.moveTo(x+px,y+py);g.quadraticCurveTo(x+c*L*.62,y+sn*L*.62,x-px,y-py);g.quadraticCurveTo(x+c*L*.2,y+sn*L*.2,x+px,y+py);g.fill();
          break}
        case 'line':{
          g.globalAlpha=t*.8;g.strokeStyle=p.col;g.lineWidth=s*(.4+.6*t);g.beginPath();g.moveTo(x,y);g.lineTo(p.x2,p.y2);g.stroke();
          break}
      }
    }
    g.globalCompositeOperation='source-over';g.globalAlpha=1;
  }
  function drawWaves(g){
    if(!W.length)return;
    g.globalCompositeOperation='lighter';
    for(const w of W){
      const t=1-w.life/w.max,e=1-(1-t)*(1-t)*(1-t),r=Math.max(.5,w.r0+(w.r1-w.r0)*e),a=(1-t)*(1-t*.4);
      if(w.fill){g.globalAlpha=w.fill*(1-t)*(1-t)*(1-t);g.fillStyle=w.col;g.beginPath();g.arc(w.x,w.y,r,0,TAU);g.fill()}
      g.beginPath();g.arc(w.x,w.y,r,0,TAU);
      g.strokeStyle=w.col;g.globalAlpha=a*.3;g.lineWidth=w.w*2.6*(1-t*.5);g.stroke();
      g.globalAlpha=a*.9;g.lineWidth=w.w*(1-t*.6);g.stroke();
      g.strokeStyle='#ffffff';g.globalAlpha=a*.55;g.lineWidth=Math.max(.35,w.w*.3*(1-t));g.stroke();
    }
    g.globalCompositeOperation='source-over';g.globalAlpha=1;
  }
  // on the flagstones, under everything in play
  function floor(g,m){
    for(const d of DEC){const t=d.life/d.max;blit(g,d.col,false,d.x,d.y,d.r,Math.min(1,t*1.6)*.5)}
    g.globalAlpha=1;
    if((RUB.length||SOOT.length)&&m!==rubOf){RUB.length=0;SOOT.length=0}
    drawRubble(g);
    drawParts(g,0);
  }
  // over the fighters and shots
  function top(g,m){drawWaves(g);drawParts(g,1);drawFlying(g)}
  function screenFlash(g,w){if(screen>0){g.globalAlpha=1;g.fillStyle='rgba('+screenCol+','+(screen*.55).toFixed(3)+')';g.fillRect(0,0,w,w)}}

  // behind a fighter's medallion and weapons: the light it stands in, and the arcs its blades leave
  function back(g,f,m,alpha){
    if(!m||f.gone||!(f.hp>0))return;
    const p=f.p||{},u=f.u||{},r=f.r,x=f.x,y=f.y,t=m.t,pulse=.5+.5*Math.sin(clock*7+f.i*2);
    g.globalCompositeOperation='lighter';
    if(f.last&&f.hp<f.max*.4)blit(g,'#ff4a3a',true,x,y,r*(2.1+.15*pulse),.5+.2*pulse);
    if(p.blitz&&t<6)blit(g,'#ffa53a',true,x,y,r*2,.45*Math.min(1,(6-t)*1.5));
    if(p.slowburn){const st=Math.min(10,Math.floor(t/2));if(st)blit(g,'#ff7a2a',true,x,y,r*(1.5+st*.06),.05*st)}
    if(p.adrenaline&&u.adr)blit(g,'#ffd447',true,x,y,r*(2+.2*pulse),.45+.2*pulse);
    if(p.riposte&&t<(u.rpT||0))blit(g,'#ff4a6a',true,x,y,r*2,.4+.25*pulse);
    if(p.patient&&t-(u.ptT===undefined?-9:u.ptT)>=2.5)blit(g,'#ffffff',true,x,y,r*(1.9+.2*pulse),.28+.16*pulse);
    if(p.lunge&&t<(u.lgH||0))blit(g,'#ff9a3a',true,x,y,r*2.1,.5);
    if(p.ricochet&&t<(u.rcT||0))blit(g,'#5fdcff',true,x,y,r*1.9,.45);
    if(f.poisonT>0)blit(g,VENOM,true,x,y,r*1.8,.22+.1*pulse);
    if(f.ambush>0)blit(g,'#8a5cff',true,x,y,r*1.9,.22+.1*pulse);
    if(f.revives>0)blit(g,GOLDC,true,x,y-r*1.05,r*.9,.3+.12*pulse);
    // There is no trail behind a moving weapon. Until Build 70 each arm drew a pale crescent over where it had just been
    // ("blade arcs"); with the weapons now real-looking objects the user asked: "Remove the effect that happens on weapons
    // when it's moving in a certain direction", and, asked which effect: "I meant the swing trail." Do not bring it back.
    g.globalCompositeOperation='source-over';g.globalAlpha=alpha;
  }
  // over a fighter's medallion: shells, stacks and marks
  function front(g,f,m,alpha){
    if(!m||f.gone||!(f.hp>0))return;
    const e=m.f[1-f.i],p=f.p||{},u=f.u||{},ep=e.p||{},eu=e.u||{},r=f.r,x=f.x,y=f.y,t=m.t;
    g.setLineDash([]);
    if(p.thorns){                                           // thorns bristle from the rim
      g.fillStyle='#b9d77a';g.strokeStyle=EDGEC;g.lineWidth=.35;g.lineJoin='round';
      const N=6+3*p.thorns;g.beginPath();
      for(let k=0;k<N;k++){const a=k/N*TAU+.2,c=Math.cos(a),s=Math.sin(a),l=2.2+.7*p.thorns,w=1.1;g.moveTo(x+c*(r-.4)-s*w,y+s*(r-.4)+c*w);g.lineTo(x+c*(r+l),y+s*(r+l));g.lineTo(x+c*(r-.4)+s*w,y+s*(r-.4)-c*w);g.closePath()}
      g.fill();g.stroke();
    }
    if(p.armor){                                            // rivets on the ring
      g.fillStyle=STEEL;g.strokeStyle=EDGEC;g.lineWidth=.3;
      const N=4+2*p.armor;
      for(let k=0;k<N;k++){const a=k/N*TAU+.6;g.beginPath();g.arc(x+Math.cos(a)*r*.955,y+Math.sin(a)*r*.955,Math.max(.8,r*.05),0,TAU);g.fill();g.stroke()}
    }
    if(u.bar>0){                                            // the barrier: a gold dome that thins as it is spent
      const k=Math.min(1,u.bar/40);
      g.globalAlpha=alpha*(.1+.1*k);g.fillStyle=GOLDC;g.beginPath();g.arc(x,y,r+7,0,TAU);g.fill();
      g.globalAlpha=alpha*(.5+.4*k);g.strokeStyle=GOLDC;g.lineWidth=1.1+.9*k;g.stroke();
      g.globalAlpha=alpha*.8;g.strokeStyle='#fff6d8';g.lineWidth=.5;g.beginPath();g.arc(x,y,r+7,-2.3+Math.sin(clock*2)*.3,-1.2+Math.sin(clock*2)*.3);g.stroke();
      g.globalAlpha=alpha;
    }
    const shell=(col,rr,dash,off)=>{g.strokeStyle=col;g.lineWidth=1.3;g.setLineDash(dash);g.lineDashOffset=off;g.beginPath();g.arc(x,y,rr,0,TAU);g.stroke();g.setLineDash([]);g.lineDashOffset=0};
    if(p.clutch&&f.hp<f.max*.3)shell('rgba(207,216,230,.9)',r+3.6,[5,3],-clock*14);
    if(p.keepaway&&t<(u.kaG||0))shell('rgba(207,225,255,.9)',r+5.4,[2,3],clock*20);
    if(p.rebound&&t<(u.rbT||0)){g.globalAlpha=alpha*Math.min(1,((u.rbT||0)-t)*4);shell('rgba(159,198,255,.95)',r+2.4,[],0);g.globalAlpha=alpha}
    if(p.combo&&u.cb>0&&t-(u.cbT||0)<2){                    // one pip per stacked hit
      g.fillStyle=GOLDC;g.strokeStyle=EDGEC;g.lineWidth=.35;
      for(let k=0;k<u.cb;k++){const a=clock*3+k/u.cb*TAU;g.beginPath();g.arc(x+Math.cos(a)*(r+4.5),y+Math.sin(a)*(r+4.5),1.5,0,TAU);g.fill();g.stroke()}
    }
    if(ep.sunder&&eu.su>0){                                 // cracks the rival has sundered into this fighter
      g.strokeStyle='#ffb36b';g.lineWidth=.9;g.lineCap='round';g.beginPath();
      for(let k=0;k<eu.su;k++){const a=1+k*1.05,c=Math.cos(a),s=Math.sin(a);g.moveTo(x+c*r,y+s*r);g.lineTo(x+c*r*.72-s*r*.1,y+s*r*.72+c*r*.1);g.lineTo(x+c*r*.5+s*r*.08,y+s*r*.5-c*r*.08)}
      g.stroke();
    }
    if(ep.decay&&t>6){g.globalAlpha=alpha*(.5+.2*Math.sin(clock*4));shell('rgba(180,140,255,.9)',r*.9,[1.5,4],clock*6);g.globalAlpha=alpha}
    if(ep.siphon&&!e.gone&&Math.hypot(e.x-x,e.y-y)<r+e.r+40){   // the drain: a thin thread to the rival
      g.globalCompositeOperation='lighter';g.strokeStyle='#ff6f91';g.globalAlpha=alpha*.55;g.lineWidth=1;g.setLineDash([3,4]);g.lineDashOffset=clock*30;
      g.beginPath();g.moveTo(x,y);g.lineTo(e.x,e.y);g.stroke();g.setLineDash([]);g.lineDashOffset=0;g.globalCompositeOperation='source-over';g.globalAlpha=alpha;
    }
    if(f.revives>0){                                        // a second life waits: a small halo
      g.strokeStyle=GOLDC;g.lineWidth=1;g.globalAlpha=alpha*.95;g.beginPath();g.ellipse(x,y-r-2.2,r*.42,r*.13,0,0,TAU);g.stroke();
      g.strokeStyle='#fff6d8';g.lineWidth=.4;g.stroke();g.globalAlpha=alpha;
    }
  }

  // ----- effects a class or an upgrade can ask for by name: {k:'fx',n:<name>,x,y,...} -----
  // common fields: num (how many), col, dir and spread (radians), r (size or radius), life, x2,y2 (far end), to (fighter 0/1)
  const O=e=>({dir:e.dir,spread:e.spread,lo:e.lo,hi:e.hi,life:e.life,size:e.size,jit:e.jit,grav:e.grav,drag:e.drag});
  const RECIPES={
    sparks:(e,f,c)=>sparks(e.x,e.y,e.num||8,e.col||c,O(e)),
    embers:(e,f,c)=>embers(e.x,e.y,e.num||8,e.col||c,O(e)),
    stars:(e,f,c)=>stars(e.x,e.y,e.num||6,e.col||c,O(e)),
    flakes:(e,f,c)=>flakes(e.x,e.y,e.num||8,e.col,O(e)),
    wisps:(e,f,c)=>wisps(e.x,e.y,e.num||6,e.col||c,O(e)),
    dust:(e,f,c)=>dust(e.x,e.y,e.num||5,e.col,O(e)),
    smoke:(e,f,c)=>smoke(e.x,e.y,e.num||4,e.col,O(e)),
    shards:(e,f,c)=>shards(e.x,e.y,e.num||8,e.col||c,O(e)),
    bubbles:(e,f,c)=>bubbles(e.x,e.y,e.num||6,e.col||c,O(e)),
    plus:(e,f,c)=>plus(e.x,e.y,e.num||3,e.col,O(e)),
    drops:(e,f,c)=>drops(e.x,e.y,e.num||6,e.col||c,O(e)),
    leaves:(e,f,c)=>leaves(e.x,e.y,e.num||6,e.col,O(e)),
    confetti:(e,f,c)=>confetti(e.x,e.y,e.num||10,e.col,O(e)),
    flash:(e,f,c)=>flash(e.x,e.y,e.r||16,e.col||c,e.life),
    wave:(e,f,c)=>wave(e.x,e.y,e.r0||4,e.r||40,e.life||.32,e.col||c,e.w||2.6,e.fill||0),
    slash:(e,f,c)=>slash(e.x,e.y,e.dir||0,e.r||24,e.col||'#ffffff',e.life),
    line:(e,f,c)=>line(e.x,e.y,e.x2,e.y2,e.col||c,e.w||1.6,e.life||.2),
    beam:(e,f,c)=>{line(e.x,e.y,e.x2,e.y2,e.col||c,e.w||4,e.life||.24);line(e.x,e.y,e.x2,e.y2,'#ffffff',(e.w||4)*.35,e.life||.24);flash(e.x2,e.y2,(e.w||4)*3,e.col||c,.16)},
    seek:(e,f,c)=>seek(e.x,e.y,e.to===undefined?-2:e.to,e.num||5,e.col||c,e.x2,e.y2),
    scorch:(e)=>scorch(e.x,e.y,e.r||20,e.col,e.life),
    squash:(e)=>squash(e.i,e.dir||0,e.r||.1),
    shake:(e)=>kick(e.r||3),
    explode:(e,f,c)=>{explode(e.x,e.y,e.r||34,e.col||'#ffb347');kick(Math.min(5,(e.r||34)*.1))},
    frost:(e)=>frost(e.x,e.y,e.r||24,e.num||10),
    fire:(e,f,c)=>fire(e.x,e.y,e.num||8,e.col),
    splash:(e,f,c)=>splash(e.x,e.y,e.num||8,e.col||c),
    poof:(e,f,c)=>poof(e.x,e.y,e.r||16,e.col),
    shatter:(e,f,c)=>shatter(e.x,e.y,e.num||10,e.col||c,e.r),
    holy:(e,f,c)=>holy(e.x,e.y,e.r||30,e.col),
    dark:(e,f,c)=>dark(e.x,e.y,e.r||26,e.col),
    zap:(e,f,c)=>zapEnd(e.x,e.y,e.col),
    tele:(e,f,c)=>{const cc=e.col||c,r=e.r||22;flash(e.x,e.y,r*2,cc,.2);wave(e.x,e.y,r*1.4,r*.3,.26,cc,2.4);wave(e.x,e.y,4,r*1.6,.34,'#ffffff',1.2);stars(e.x,e.y,5,cc,{jit:r,grav:-50})},
  };

  Object.assign(api,{on,update,ambient,reset,floor,top,back,front,sq,screenFlash,glow,due,
    sparks,embers,stars,flakes,wisps,dust,smoke,shards,bubbles,plus,drops,leaves,confetti,flash,slash,line,seek,wave,scorch,squash,
    explode,frost,fire,splash,poof,shatter,holy,dark,zapEnd,RECIPES});
  // EFFECTS ARE OFF (Build 84). The user, shown a sample of toned-down effects while the fighters and weapons were being
  // remade: "just pause that for now and remove all effects from the live site". Until they are redesigned to suit the
  // stone look, nothing in this file is drawn except the pieces a fallen fighter breaks into (which the user asked for
  // in Build 82): no sparks, rings, flashes, glows, auras, shells, confetti, scorch marks, squash or screen flash.
  // Everything above is kept as it was; set EFFECTS_OFF to false to bring it all back as it looked in Build 83.
  // Since then the user has asked for effects one at a time, and each is switched on here by name: the knockout
  // (Build 85: "I want it more like that", the Crypt sample's burst of chunks, with the arena's shake) and the wall
  // lighting up white where a fighter bounces off it (Builds 85 and 86). Add the next one the same way; do not turn the rest back on.
  const EFFECTS_OFF=true;
  if(EFFECTS_OFF){
    const none=()=>{};
    for(const k of Object.keys(api))if(typeof api[k]==="function")api[k]=none;
    api.due=()=>0;api.sq=()=>null;                       // (RECIPES stays: the tests check every effect a class names still exists)
    api.on=(e,m)=>{
      if(!m)return;if(m!==lastM){lastM=m;reset(false)}
      const own=e.i>=0?m.f[e.i]:null;if(!own)return;
      if(e.k==="ko")breakApart(own,own.col,m.f[1-own.i],e.x,e.y,m);
      else if(e.k==="wall")wallHit(e,own);
    };
    api.reset=reset;
    api.update=dt=>{clock+=dt;moveRubble(dt);moveWall(dt);P.length=0;W.length=0;DEC.length=0;screen=0};
    api.floor=(g,m)=>{if((RUB.length||SOOT.length)&&m!==rubOf){RUB.length=0;SOOT.length=0}drawRubble(g)};
    api.top=g=>drawFlying(g);
  }
  api.off=EFFECTS_OFF;api.wallHits=WH;                 // the page asks .off before shaking the arena; brawl-looks.js draws .wallHits
  Object.defineProperties(api,{count:{get:()=>P.length},quality:{get:()=>q},clock:{get:()=>clock},rate:{get:()=>rate,set:v=>{rate=v}}});
  return api;
})();
if(typeof module!=='undefined')module.exports=FX;

// ----- the first twenty classes: what their own tricks look like while they last -----
// (classes in the packs keep theirs beside their art; these live here so brawl-looks.js stays pure drawing)
if(typeof LOOKS!=='undefined'){
  const R=Math.random,TAU=6.2832,ring=(f,k)=>{const a=R()*TAU;return [f.x+Math.cos(a)*f.r*(k||1),f.y+Math.sin(a)*f.r*(k||1)]};
  const amb=(key,fn)=>{if(LOOKS[key]&&!LOOKS[key].amb)LOOKS[key].amb=fn};
  // Berserker: the closer to death, the more it burns
  amb('fury',(f,e,m,dt)=>{const k=1-Math.max(0,f.hp)/f.max;if(k<.15||f.gone)return;for(let n=FX.due(f.i,'fury',16*k,dt);n>0;n--){const c=ring(f,.9);FX.embers(c[0],c[1],1,k>.6?'#ff5a3a':'#ff9a4a')}});
  // Comet: embers shed along its burning trail
  amb('comet',(f,e,m,dt)=>{
    const T=f.s&&f.s.trail;if(f.gone)return;
    for(let n=FX.due(f.i,'comet',14,dt);n>0;n--)FX.embers(f.x+(R()-.5)*f.r,f.y+(R()-.5)*f.r,1,R()<.4?'#ffe27a':f.col,{life:.5});
    if(T&&T.length)for(let n=FX.due(f.i,'comet2',9,dt);n>0;n--){const p=T[(R()*T.length)|0];FX.embers(p.x+(R()-.5)*6,p.y+(R()-.5)*6,1,'#ff8a3a',{life:.6,lo:2,hi:14})}
  });
  // Ghost: mist while it is away, streaks as it strikes
  amb('ghost',(f,e,m,dt)=>{
    if(f.gone)for(let n=FX.due(f.i,'ghost',9,dt);n>0;n--){const c=ring(f,R()*1.1);FX.wisps(c[0],c[1],1,f.col,{life:.7})}
    else if(f.s&&f.s.dash>0)for(let n=FX.due(f.i,'ghost2',26,dt);n>0;n--){const c=ring(f,R());FX.sparks(c[0],c[1],1,f.col,{lo:4,hi:30,life:.3})}
  });
  // Snowball: sheds snow as it rolls, more the bigger it has grown
  amb('snow',(f,e,m,dt)=>{if(f.gone)return;for(let n=FX.due(f.i,'snow',2+(f.s&&f.s.grow||0)*.6,dt);n>0;n--){const c=ring(f,.9);FX.flakes(c[0],c[1],1)}});
  // Tesla: the coil crackles
  amb('tesla',(f,e,m,dt)=>{if(f.gone)return;for(let n=FX.due(f.i,'tesla',7,dt);n>0;n--){const c=ring(f,1.05),a=R()*TAU,l=3+R()*7;FX.line(c[0],c[1],c[0]+Math.cos(a)*l,c[1]+Math.sin(a)*l,'#bff4ff',1,.12)}});
  // Magnet: while it pulls, filings stream in from the rival
  amb('magnet',(f,e,m,dt)=>{if(f.gone||!(f.s&&f.s.pull>0)||e.gone)return;for(let n=FX.due(f.i,'magnet',22,dt);n>0;n--)FX.seek(e.x,e.y,f.i,1,R()<.5?f.col:'#dfe6f2',0,0,{jit:e.r*1.6,size:1.3,life:.7})});
  // Mirror: glints
  amb('mirror',(f,e,m,dt)=>{if(f.gone)return;for(let n=FX.due(f.i,'mirror',2.2,dt);n>0;n--){const c=ring(f,.2+R()*.75);FX.stars(c[0],c[1],1,'#ffffff',{lo:0,hi:5,size:3.6,life:.35})}});
  // Necromancer: grave-mist
  amb('necro',(f,e,m,dt)=>{if(f.gone)return;for(let n=FX.due(f.i,'necro',4,dt);n>0;n--){const c=ring(f,1);FX.wisps(c[0],c[1],1,f.col,{life:.6})}});
  // Painter: drips
  amb('painter',(f,e,m,dt)=>{if(f.gone)return;for(let n=FX.due(f.i,'paint',6,dt);n>0;n--)FX.drops(f.x+(R()-.5)*f.r*1.4,f.y+f.r*.5,1,f.col,{dir:1.57,spread:.9,lo:10,hi:50})});
  // Clockmaker: in the last half-second before a freeze, time visibly gathers on the rival
  amb('clock',(f,e,m,dt)=>{if(f.gone||e.gone||!(f.s&&f.s.t<.55))return;for(let n=FX.due(f.i,'clock',24,dt);n>0;n--)FX.seek(f.x,f.y,e.i,1,'#ffe9b0',0,0,{jit:f.r,size:1.2,life:.6})});
  // Urchin, Beekeeper, Sapper, Spider: small signs of life
  amb('spider',(f,e,m,dt)=>{if(f.gone||!(e.slowT>0))return;for(let n=FX.due(f.i,'spider',6,dt);n>0;n--){const c=ring(e,1);FX.wisps(c[0],c[1],1,'#ffffff',{life:.45,size:2.6})}});
  amb('leech',(f,e,m,dt)=>{if(f.gone||f.hp>f.max*.5)return;for(let n=FX.due(f.i,'leech',5,dt);n>0;n--){const c=ring(f,.9);FX.drops(c[0],c[1],1,'#d8324a',{dir:1.57,spread:.8,lo:8,hi:30})}});
}
