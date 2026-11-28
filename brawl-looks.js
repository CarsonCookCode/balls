// Duel King drawing, "gilded": a dungeon floor in a gold frame, and every fighter a medallion (worked gold ring, enamel
// in the fighter's colour, an ivory crest) with its own weapon. The frame and materials are fantasy; the crest and the
// weapon say what the fighter is, so a fighter can be anything.
//
// One entry point for the arena: drawArena(ctx, match, you, fx), in arena units (0..AW on both axes); the caller sets the
// transform and leaves about 10 units of margin for the frame. The page canvas and the video recorder both use it.
// Per-class art lives in LOOKS[key], all optional, called in this order:
//   under(f,m)                  floor-level things the class leaves in the arena (arena units)
//   arm(f,A,x1,y1,x2,y2,an)     one of the class's own weapon arms, from the ring edge (x1,y1) to the tip (x2,y2)
//   back(f)                     behind the medallion (spines, legs, flames), arena units
//   crest(fg,bg)                the mark on the enamel; `g` is already moved to the medallion centre and scaled so the
//                               enamel field has radius 1 (keep within about 0.75); fg is ivory, bg the enamel colour
//   over(f,m)                   after everything else for this fighter
// Minions are drawn by MINION_LOOKS[kind](q,t). Orn holds ornaments (frame, ribbon, scroll...) for other canvases.
const TAU=6.2832;
let g=null;        // the context being drawn to; set at the start of drawArena
let PX=2;          // device pixels per arena unit (shadows ignore the transform, so they need it)
let NOW=0;         // match time, for small idle motions
let MATCH=null;
let PORTRAIT=false; // true while drawing a fighter's picture: its circle and nothing else (no weapons, name or health)
const RING=false;   // the gold ring round every fighter. Off since Build 45 (the user: "let's try getting rid of the gold border"); true brings it back
let LIVE=false;     // true while drawing the arena on screen (not a portrait): the effects engine joins in
const GOLD='#c9a45c',GOLD_HI='#f0dca4',GOLD_LO='#7a5d2b',IVORY='#f3ead6',INK='#231a12',EDGE='#090b0d',CRIMSON='#8f2732',CRIMSON_LO='#5e1820',
  PARCH='#e6d6b0',PARCH_LO='#c9b487',STEEL='#d7dde2',STEEL_LO='#8b959d',WOOD='#6f4d30',LEATHER='#3a2a1e';
const FONT="Cinzel, 'Times New Roman', serif";
const NODASH=[],DASH_FINE=[1.5,3],DASH_SLOW=[3,3],DASH_RANGE=[2,5];
const disc=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,TAU)};

// lighten a #hex colour for k>0, darken for k<0; anything that is not #hex comes back unchanged
let SHADE={},shadeN=0;
function shade(hex,k){
  const key=hex+'|'+k,hit=SHADE[key];
  if(hit)return hit;
  let h=String(hex);
  if(h[0]!=='#')return hex;
  h=h.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n=parseInt(h,16);
  if(h.length!==6||n!==n)return hex;
  const f=v=>Math.round(k>=0?v+(255-v)*k:v*(1+k));
  if(++shadeN>600){SHADE={};shadeN=0}
  return SHADE[key]=`rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;
}
// gradients, with a flat colour to fall back on where a context cannot make one; s = [stop,colour, stop,colour, ...]
function lin(c,x0,y0,x1,y1,s){
  const q=c.createLinearGradient(x0,y0,x1,y1);
  if(!q||!q.addColorStop)return s[s.length>2?3:1];
  for(let i=0;i<s.length;i+=2)q.addColorStop(s[i],s[i+1]);
  return q;
}
function rad(c,x0,y0,r0,x1,y1,r1,s){
  const q=c.createRadialGradient(x0,y0,r0,x1,y1,r1);
  if(!q||!q.addColorStop)return s[s.length>2?3:1];
  for(let i=0;i<s.length;i+=2)q.addColorStop(s[i],s[i+1]);
  return q;
}
const rng=a=>()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296};
function rrect(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function lozenge(c,x,y,s,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s,y);c.lineTo(x,y+s);c.lineTo(x-s,y);c.closePath();c.fill()}
// a spare canvas for things that never change (the floor, a backdrop); null where there is no page to make one
function offscreen(w,h){
  try{
    if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
    const cv=document.createElement('canvas');
    if(!cv||typeof cv.getContext!=='function')return null;
    cv.width=w;cv.height=h;
    const c=cv.getContext('2d');
    return c?{cv,c}:null;
  }catch(e){return null}
}

// ---------- ornaments: each takes the context to draw on and leaves its state as it found it ----------
function backdropRaw(c,x,y,w,h){
  c.fillStyle=rad(c,x+w/2,y+h*.42,Math.min(w,h)*.08,x+w/2,y+h/2,Math.max(w,h)*.75,[0,'#1b2329',1,'#0a0e11']);
  c.fillRect(x,y,w,h);
  const r=rng(7),n=Math.min(9000,w*h/260);
  for(let i=0;i<n;i++){c.fillStyle=r()<.5?'rgba(255,255,255,.022)':'rgba(0,0,0,.09)';c.fillRect(x+r()*w,y+r()*h,1+r()*2,1+r()*2)}
}
let BACKDROP=null;
const Orn={
  // dark aged leather; drawn once per size and kept
  backdrop(c,x,y,w,h){
    c.save();
    const key=Math.ceil(w)+'x'+Math.ceil(h);
    if(!BACKDROP||BACKDROP.key!==key){
      const o=offscreen(Math.ceil(w),Math.ceil(h));
      BACKDROP={key,cv:o?o.cv:null};
      if(o)backdropRaw(o.c,0,0,w,h);
    }
    if(BACKDROP.cv)c.drawImage(BACKDROP.cv,x,y,w,h);else backdropRaw(c,x,y,w,h);
    c.restore();
  },
  // bevelled gold frame around the rectangle x,y,w,h (drawn outside it, t thick), with gems at the corners; hot = sudden death
  frame(c,x,y,w,h,t,hot){
    c.save();
    c.fillStyle=GOLD;c.fillRect(x-t,y-t,w+2*t,t);c.fillRect(x-t,y+h,w+2*t,t);c.fillRect(x-t,y,t,h);c.fillRect(x+w,y,t,h);
    c.lineWidth=t*.13;c.lineJoin='miter';c.lineCap='butt';
    c.strokeStyle=GOLD_HI;c.beginPath();c.moveTo(x-t+t*.07,y+h+t-t*.1);c.lineTo(x-t+t*.07,y-t+t*.07);c.lineTo(x+w+t-t*.1,y-t+t*.07);c.stroke();
    c.strokeStyle=GOLD_LO;c.beginPath();c.moveTo(x+w+t-t*.07,y-t+t*.1);c.lineTo(x+w+t-t*.07,y+h+t-t*.07);c.lineTo(x-t+t*.1,y+h+t-t*.07);c.stroke();
    c.strokeStyle=hot?'#ff5a3c':GOLD_LO;c.lineWidth=t*(hot?.2:.11);c.strokeRect(x-t*.055,y-t*.055,w+t*.11,h+t*.11);
    c.strokeStyle=EDGE;c.lineWidth=t*.17;c.strokeRect(x-t-t*.1,y-t-t*.1,w+2*t+t*.2,h+2*t+t*.2);
    const b=t*.88;
    for(let i=0;i<4;i++){
      const px=i%2?x+w+t/2:x-t/2,py=i<2?y-t/2:y+h+t/2;
      lozenge(c,px,py,b,EDGE);lozenge(c,px,py,b*.84,GOLD);lozenge(c,px,py,b*.46,hot?'#ff4a3a':CRIMSON);
      c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(px-b*.14,py-b*.16,b*.1,0,TAU);c.fill();
    }
    lozenge(c,x+w/2,y-t/2,t*.4,GOLD_LO);lozenge(c,x+w/2,y+h+t/2,t*.4,GOLD_LO);lozenge(c,x-t/2,y+h/2,t*.4,GOLD_LO);lozenge(c,x+w+t/2,y+h/2,t*.4,GOLD_LO);
    c.restore();
  },
  // dungeon flagstones, n across a square of side s, with a warm glow in the middle and dark corners
  floor(c,x,y,s,n){
    c.save();
    const t=s/n,k=t/62;
    c.fillStyle='#101417';c.fillRect(x,y,s,s);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const v=28+((i*7+j*13+i*j*5)%9)*2.2,px=x+i*t+1.5*k,py=y+j*t+1.5*k,w=t-3*k,e=1.2*k;
      c.fillStyle=`rgb(${v+4|0},${v+9|0},${v+13|0})`;c.fillRect(px,py,w,w);
      c.fillStyle='rgba(255,255,255,.055)';c.fillRect(px,py,w,e);c.fillRect(px,py,e,w);
      c.fillStyle='rgba(0,0,0,.22)';c.fillRect(px,py+w-e,w,e);c.fillRect(px+w-e,py,e,w);
      if((i*3+j*5)%7===0){c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=k;c.beginPath();c.moveTo(px+w*.2,py+w*.3);c.lineTo(px+w*.45,py+w*.5);c.lineTo(px+w*.4,py+w*.8);c.stroke()}
    }
    c.fillStyle=rad(c,x+s/2,y+s/2,s*.25,x+s/2,y+s/2,s*.75,[0,'rgba(255,214,150,.07)',1,'rgba(0,0,0,.5)']);c.fillRect(x,y,s,s);
    c.restore();
  },
  // a crimson heraldic ribbon with forked tails; the text shrinks until it fits
  ribbon(c,cx,cy,w,h,txt,size){
    c.save();
    const x=cx-w/2,y=cy-h/2,tail=h*.62,d=h*.185,lw=Math.max(1,h*.022);
    c.lineJoin='miter';
    for(let i=0;i<2;i++){
      const s=i?1:-1,ex=i?x+w:x;
      c.fillStyle=CRIMSON_LO;c.strokeStyle=EDGE;c.lineWidth=lw;c.beginPath();
      c.moveTo(ex-s*d,y+h*.28);c.lineTo(ex+s*tail,y+h*.28);c.lineTo(ex+s*(tail-h*.3),y+h*.78);c.lineTo(ex+s*tail,y+h*1.28);c.lineTo(ex-s*d,y+h*1.28);c.closePath();c.fill();c.stroke();
      c.fillStyle='#3c0f15';c.beginPath();c.moveTo(ex,y+h);c.lineTo(ex-s*d,y+h*1.28);c.lineTo(ex-s*d,y+h);c.closePath();c.fill();
    }
    c.fillStyle=lin(c,0,y,0,y+h,[0,'#a53340',1,'#7b1e29']);c.strokeStyle=EDGE;c.lineWidth=lw;c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);
    c.fillStyle=GOLD;c.fillRect(x+lw,y+h*.055,w-2*lw,h*.037);c.fillRect(x+lw,y+h*.908,w-2*lw,h*.037);
    txt=String(txt);
    let fs=size||h*.56;
    c.textAlign='center';c.textBaseline='middle';
    for(let i=0;i<14;i++){
      c.font='700 '+fs.toFixed(1)+'px '+FONT;c.letterSpacing=(fs*.09).toFixed(2)+'px';
      const m=c.measureText(txt),tw=m&&m.width?m.width:txt.length*fs*.75;
      if(tw<=w-h*.5)break;
      fs*=.92;
    }
    c.shadowColor='rgba(0,0,0,.55)';c.shadowOffsetX=0;c.shadowOffsetY=Math.max(1,h*.037);c.shadowBlur=0;
    c.fillStyle=IVORY;c.fillText(txt,cx+fs*.04,cy+h*.02);
    c.restore();
  },
  // a parchment scroll with rolled ends and gold knobs; the writing area is the rectangle given
  scroll(c,x,y,w,h){
    c.save();
    const k=Math.max(1,w/370),r=rng(11);
    c.fillStyle='rgba(0,0,0,.45)';c.fillRect(x+4*k,y+8*k,w,h);
    c.fillStyle=lin(c,x,0,x+w,0,[0,PARCH_LO,.08,PARCH,.92,PARCH,1,PARCH_LO]);c.fillRect(x,y,w,h);
    c.fillStyle='rgba(90,60,20,.05)';
    for(let i=0,n=Math.min(700,w*h/420/k/k);i<n;i++)c.fillRect(x+r()*w,y+r()*h,(2+r()*5)*k,k);
    c.strokeStyle='rgba(60,40,15,.55)';c.lineWidth=k;c.strokeRect(x+k/2,y+k/2,w-k,h-k);
    for(let i=0;i<2;i++){
      const ry=i?y+h-5*k:y-9*k;
      c.fillStyle=lin(c,0,ry,0,ry+14*k,[0,'#f1e3c0',.5,PARCH,1,'#a08a5c']);c.strokeStyle='rgba(60,40,15,.7)';c.lineWidth=k;
      rrect(c,x-10*k,ry,w+20*k,14*k,7*k);c.fill();c.stroke();
      for(let j=0;j<2;j++){
        const kx=j?x+w+12*k:x-12*k;
        c.fillStyle=GOLD;c.strokeStyle=EDGE;c.lineWidth=1.2*k;c.beginPath();c.arc(kx,ry+7*k,6*k,0,TAU);c.fill();c.stroke();
        c.fillStyle=GOLD_HI;c.beginPath();c.arc(kx-1.5*k,ry+5.5*k,1.8*k,0,TAU);c.fill();
      }
    }
    c.restore();
  },
  // a carved plate: crimson enamel for the main action, dark iron otherwise
  plate(c,x,y,w,h,txt,main){
    c.save();
    const k=h/36;
    c.fillStyle='rgba(0,0,0,.45)';rrect(c,x+2*k,y+4*k,w,h,4*k);c.fill();
    c.fillStyle=main?lin(c,0,y,0,y+h,[0,'#a93543',1,'#77202a']):lin(c,0,y,0,y+h,[0,'#3a444c',1,'#232a30']);rrect(c,x,y,w,h,4*k);c.fill();
    c.strokeStyle=GOLD;c.lineWidth=2*k;rrect(c,x+k,y+k,w-2*k,h-2*k,3.5*k);c.stroke();
    c.strokeStyle=GOLD_LO;c.lineWidth=k;rrect(c,x+5*k,y+5*k,w-10*k,h-10*k,2*k);c.stroke();
    lozenge(c,x+9*k,y+h/2,3.4*k,GOLD);lozenge(c,x+w-9*k,y+h/2,3.4*k,GOLD);
    txt=String(txt);
    let fs=h*.36;
    c.textAlign='center';c.textBaseline='middle';
    for(let i=0;i<14;i++){
      c.font='700 '+fs.toFixed(1)+'px '+FONT;c.letterSpacing=(fs*.19).toFixed(2)+'px';
      const m=c.measureText(txt),tw=m&&m.width?m.width:txt.length*fs*.85;
      if(tw<=w-30*k)break;
      fs*=.92;
    }
    c.shadowColor='rgba(0,0,0,.6)';c.shadowOffsetX=0;c.shadowOffsetY=1.5*k;c.shadowBlur=0;
    c.fillStyle=IVORY;c.fillText(txt,x+w/2+k,y+h/2+k);
    c.restore();
  },
  // a health bar in a gold rim with a gem at its outer end; right = it empties toward the right-hand end
  bar(c,x,y,w,frac,col,right,h){
    c.save();
    h=h||12;
    const k=h/12,fw=(w-4*k)*Math.max(0,Math.min(1,frac)),fx=right?x+w-2*k-fw:x+2*k,ex=right?x+w:x;
    c.fillStyle=EDGE;rrect(c,x,y,w,h,3*k);c.fill();
    c.fillStyle=col;c.fillRect(fx,y+2*k,fw,h-4*k);
    c.fillStyle='rgba(255,255,255,.22)';c.fillRect(fx,y+2*k,fw,3*k);
    c.strokeStyle=GOLD;c.lineWidth=1.5*k;rrect(c,x,y,w,h,3*k);c.stroke();
    lozenge(c,ex,y+h/2,7*k,GOLD);lozenge(c,ex,y+h/2,3.4*k,col);
    c.restore();
  },
  // the small gold shield that sits between two names; s is its half-width
  shield(c,cx,cy,s,txt){
    c.save();
    const k=s/24;
    c.fillStyle=GOLD;c.strokeStyle=EDGE;c.lineWidth=1.5*k;c.lineJoin='round';
    c.beginPath();c.moveTo(cx-24*k,cy-22*k);c.lineTo(cx+24*k,cy-22*k);c.lineTo(cx+24*k,cy+4*k);c.quadraticCurveTo(cx+22*k,cy+22*k,cx,cy+30*k);c.quadraticCurveTo(cx-22*k,cy+22*k,cx-24*k,cy+4*k);c.closePath();c.fill();c.stroke();
    c.fillStyle='#161d22';
    c.beginPath();c.moveTo(cx-19*k,cy-17*k);c.lineTo(cx+19*k,cy-17*k);c.lineTo(cx+19*k,cy+3*k);c.quadraticCurveTo(cx+17*k,cy+18*k,cx,cy+24*k);c.quadraticCurveTo(cx-17*k,cy+18*k,cx-19*k,cy+3*k);c.closePath();c.fill();
    c.fillStyle=GOLD_HI;c.font='900 '+(17*k).toFixed(1)+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.fillText(String(txt),cx,cy+k);
    c.restore();
  },
};

// ---------- weapons ----------
// A straight blade drawn along +x: call it with the origin at the fighter's centre and the axis turned to the arm's angle.
// r = where the ring ends, L = how far past the ring the tip is, w = half the blade's width.
function bladeCore(r,L,w,grip,guard,gh){
  const gl=Math.min(5.5,L*.2),bx=r+gl+1,tip=r+L,tp=Math.min(6,L*.24);
  g.lineJoin='round';
  g.fillStyle=lin(g,0,-w,0,w,[0,'#f2f5f7',.5,STEEL,1,STEEL_LO]);g.strokeStyle=EDGE;g.lineWidth=.65;
  g.beginPath();g.moveTo(bx,-w);g.lineTo(tip-tp,-w*.72);g.lineTo(tip,0);g.lineTo(tip-tp,w*.72);g.lineTo(bx,w);g.closePath();g.fill();g.stroke();
  g.strokeStyle=STEEL_LO;g.lineWidth=.4;g.beginPath();g.moveTo(bx+1.5,0);g.lineTo(tip-tp-1,0);g.stroke();
  g.fillStyle=grip;g.strokeStyle=EDGE;g.lineWidth=.55;g.fillRect(r-2,-w*.56,gl+2,w*1.12);g.strokeRect(r-2,-w*.56,gl+2,w*1.12);
  g.fillStyle=guard;rrect(g,r+gl-.7,-w*gh,2.4,w*gh*2,.9);g.fill();g.stroke();
}
function steelBlade(r,L,w){bladeCore(r,L,w,LEATHER,GOLD,2.4)}
function turned(f,an){g.save();g.translate(f.x,f.y);g.rotate(an)}
function barrel(f,an,hw,len,brass){
  turned(f,an);
  const r=f.r,x0=r-4,x1=r+len;
  g.lineJoin='round';
  g.fillStyle=brass?lin(g,0,-hw,0,hw,[0,GOLD_HI,.5,GOLD,1,GOLD_LO]):lin(g,0,-hw,0,hw,[0,'#727b83',.5,'#3d444a',1,'#22272b']);
  g.strokeStyle=EDGE;g.lineWidth=.6;
  g.beginPath();g.moveTo(x0,-hw);g.lineTo(x1,-hw*.8);g.lineTo(x1,hw*.8);g.lineTo(x0,hw);g.closePath();g.fill();g.stroke();
  g.fillStyle=brass?'#4a3a1c':lin(g,0,-hw,0,hw,[0,GOLD_HI,.5,GOLD,1,GOLD_LO]);
  g.fillRect(r+1,-hw*.98,1.6,hw*1.96);g.strokeRect(r+1,-hw*.98,1.6,hw*1.96);
  rrect(g,x1-1.6,-hw*.95,2.4,hw*1.9,.8);g.fill();g.stroke();
  g.fillStyle=EDGE;g.beginPath();g.ellipse(x1+.7,0,.5,hw*.5,0,0,TAU);g.fill();
  g.restore();
}

// ---------- the twenty: crest, weapon and whatever each leaves in the arena ----------
Object.assign(LOOKS,{
  // Knight: great helm with a plume; longsword
  blade:{
    crest(fg,bg){
      g.scale(.875,.875);
      g.beginPath();g.moveTo(.02,-.64);g.quadraticCurveTo(.34,-.98,.62,-.56);g.quadraticCurveTo(.34,-.72,.14,-.56);g.fill();
      g.beginPath();g.moveTo(-.4,.52);g.lineTo(-.4,-.12);g.bezierCurveTo(-.4,-.52,-.2,-.66,0,-.66);g.bezierCurveTo(.2,-.66,.4,-.52,.4,-.12);g.lineTo(.4,.52);g.lineTo(.2,.62);g.lineTo(0,.5);g.lineTo(-.2,.62);g.closePath();g.fill();
      g.fillStyle=bg;g.fillRect(-.3,-.15,.6,.1);g.fillRect(-.045,-.15,.09,.5);
      for(let s=-1;s<2;s+=2)for(let k=0;k<3;k++){disc(s*.2,.16+k*.14,.035);g.fill()}
    },
    arm(f,A,x1,y1,x2,y2,an){turned(f,an);steelBlade(f.r,A.l,2.7);g.restore()}},
  // Ogre: tusked face; spiked mace on a chain
  mace:{
    crest(fg,bg){
      g.scale(.875,.875);
      for(let s=-1;s<2;s+=2){g.beginPath();g.moveTo(s*.44,-.12);g.lineTo(s*.8,-.34);g.lineTo(s*.5,.14);g.closePath();g.fill()}
      g.beginPath();g.ellipse(0,.04,.5,.47,0,0,TAU);g.fill();
      g.fillStyle=bg;g.beginPath();g.ellipse(-.2,-.1,.11,.06,.35,0,TAU);g.fill();g.beginPath();g.ellipse(.2,-.1,.11,.06,-.35,0,TAU);g.fill();
      g.strokeStyle=bg;g.lineWidth=.06;g.beginPath();g.moveTo(-.3,.24);g.quadraticCurveTo(0,.36,.3,.24);g.stroke();
      g.fillStyle=fg;g.lineWidth=.04;
      for(let s=-1;s<2;s+=2){g.beginPath();g.moveTo(s*.13,.33);g.lineTo(s*.2,.04);g.lineTo(s*.28,.3);g.closePath();g.fill();g.stroke()}
    },
    arm(f,A,x1,y1,x2,y2,an){
      turned(f,an);
      const r=f.r,hd=A.head||8,end=r+A.l-hd*.7;
      for(let p=0;p<2;p++){
        g.strokeStyle=p?'#9aa3aa':EDGE;g.lineWidth=p?.8:1.7;
        for(let d=r+1.2,i=0;d<end;d+=3,i++){g.beginPath();g.ellipse(d,0,i%2?1.9:1.2,i%2?1.1:1.8,0,0,TAU);g.stroke()}
      }
      g.translate(r+A.l,0);g.rotate(f.ang*.6);
      g.fillStyle='#8a9299';g.strokeStyle=EDGE;g.lineWidth=.55;g.lineJoin='round';
      g.beginPath();
      for(let k=0;k<8;k++){const a=k/8*TAU;g.moveTo(Math.cos(a-.24)*hd*.72,Math.sin(a-.24)*hd*.72);g.lineTo(Math.cos(a)*hd*1.08,Math.sin(a)*hd*1.08);g.lineTo(Math.cos(a+.24)*hd*.72,Math.sin(a+.24)*hd*.72)}
      g.fill();g.stroke();
      g.fillStyle=rad(g,-hd*.25,-hd*.3,hd*.1,0,0,hd*.82,[0,'#dfe5ea',.6,'#8d969e',1,'#4f575e']);
      g.beginPath();g.arc(0,0,hd*.8,0,TAU);g.fill();g.stroke();
      g.restore();
    }},
  // Urchin: a burst of spines; real spines ring the medallion
  spikes:{
    crest(fg,bg){
      g.beginPath();
      for(let k=0;k<24;k++){const a=k/24*TAU,q=k%2?.24:(k%4?.56:.74);g.lineTo(Math.cos(a)*q,Math.sin(a)*q)}
      g.closePath();g.fill();
      g.fillStyle=bg;disc(0,0,.09);g.fill();
    },
    back(f){
      const r=f.r,n=14,len=4.6+(f.sig||0)*1.2,sp=NOW*.5;
      g.fillStyle=lin(g,f.x,f.y-r-len,f.x,f.y+r+len,[0,'#efe6d0',1,'#a39880']);g.strokeStyle=EDGE;g.lineWidth=.55;g.lineJoin='round';
      g.beginPath();
      for(let k=0;k<n;k++){
        const a=k/n*TAU+sp,l=r+len*(k%2?1:.72);
        g.moveTo(f.x+Math.cos(a-.11)*(r-1),f.y+Math.sin(a-.11)*(r-1));g.lineTo(f.x+Math.cos(a)*l,f.y+Math.sin(a)*l);g.lineTo(f.x+Math.cos(a+.11)*(r-1),f.y+Math.sin(a+.11)*(r-1));
      }
      g.fill();g.stroke();
    }},
  // Gunner: a crossbow on the crest; the iron-and-brass barrel is drawn by drawFighter because it aims, not spins
  blaster:{
    crest(fg,bg){
      g.fillRect(-.06,-.48,.12,1.14);g.fillRect(-.15,.5,.3,.1);
      g.lineWidth=.11;g.beginPath();g.moveTo(-.66,0);g.quadraticCurveTo(0,-.66,.66,0);g.stroke();
      g.lineWidth=.04;g.beginPath();g.moveTo(-.66,0);g.lineTo(0,.14);g.lineTo(.66,0);g.stroke();
      g.beginPath();g.moveTo(0,-.78);g.lineTo(.13,-.5);g.lineTo(-.13,-.5);g.closePath();g.fill();
    }},
  // Vampire: a bat; a curved fang of a dagger with a red tip
  leech:{
    crest(fg,bg){
      for(let s=-1;s<2;s+=2){
        g.beginPath();g.moveTo(0,-.14);g.lineTo(s*.08,-.42);g.lineTo(s*.15,-.17);g.quadraticCurveTo(s*.42,-.5,s*.76,-.3);
        g.quadraticCurveTo(s*.62,-.1,s*.52,.12);g.quadraticCurveTo(s*.42,-.04,s*.3,.2);g.quadraticCurveTo(s*.2,.06,s*.11,.3);g.lineTo(0,.46);g.closePath();g.fill();
      }
    },
    arm(f,A,x1,y1,x2,y2,an){
      turned(f,an);
      const r=f.r,L=A.l,tx=r+L;
      g.lineJoin='round';g.strokeStyle=EDGE;g.lineWidth=.55;
      g.fillStyle=lin(g,0,-3,0,3,[0,'#fbf6e8',.6,'#e2d8c0',1,'#b3a78c']);
      g.beginPath();g.moveTo(r+3,-2.5);g.quadraticCurveTo(r+L*.62,-3.8,tx,2.2);g.quadraticCurveTo(r+L*.56,.9,r+3,2.5);g.closePath();g.fill();g.stroke();
      g.fillStyle='#b3313f';g.beginPath();g.moveTo(tx,2.2);g.quadraticCurveTo(r+L*.86,-.4,r+L*.74,-2.6);g.quadraticCurveTo(r+L*.8,.6,r+L*.72,1.6);g.closePath();g.fill();
      g.fillStyle='#2a1416';g.fillRect(r-2,-1.5,4.4,3);g.strokeRect(r-2,-1.5,4.4,3);
      g.fillStyle=GOLD;rrect(g,r+2,-3.6,2,7.2,.8);g.fill();g.stroke();
      g.restore();
    }},
  // Sapper: a lit bomb; iron bombs with a fuse lie where it has been
  miner:{
    crest(fg,bg){
      disc(-.04,.14,.46);g.fill();g.fillRect(-.16,-.46,.24,.2);
      g.lineWidth=.07;g.beginPath();g.moveTo(-.04,-.46);g.quadraticCurveTo(.08,-.72,.34,-.62);g.stroke();
      g.strokeStyle=bg;g.beginPath();g.arc(-.04,.14,.3,Math.PI*1.08,Math.PI*1.5);g.stroke();
      g.fillStyle='#ffb347';g.beginPath();
      for(let k=0;k<8;k++){const a=k/8*TAU,q=k%2?.06:.17;g.lineTo(.44+Math.cos(a)*q,-.6+Math.sin(a)*q)}
      g.closePath();g.fill();
    },
    under(f,m){
      for(const q of f.s.mines){
        const armed=q.age>.5;
        g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(q.x+.6,q.y+1.6,5.6,5.2,0,0,TAU);g.fill();
        g.fillStyle=rad(g,q.x-1.7,q.y-1.9,.5,q.x,q.y,5.6,[0,'#69727a',.5,'#33393e',1,'#131619']);g.strokeStyle=EDGE;g.lineWidth=.6;disc(q.x,q.y,5.3);g.fill();g.stroke();
        g.strokeStyle=f.col;g.lineWidth=.8;g.globalAlpha=.85;disc(q.x,q.y,3.2);g.stroke();g.globalAlpha=1;
        g.fillStyle=GOLD_LO;g.fillRect(q.x-1.3,q.y-6.7,2.6,1.9);
        if(armed){
          const p=.6+.4*Math.sin(m.t*16+q.x);
          g.fillStyle='rgba(255,138,42,.45)';disc(q.x+.4,q.y-8,2.4+p);g.fill();
          g.fillStyle='#ffb347';disc(q.x+.4,q.y-8,1.3+p*.5);g.fill();g.fillStyle='#fff3c4';disc(q.x+.4,q.y-8,.6);g.fill();
        }else{g.fillStyle='#74777b';disc(q.x+.4,q.y-7.6,.8);g.fill()}
      }
    }},
  // Ninja: crossed daggers; slim dark-hilted blades
  twin:{
    crest(fg,bg){
      g.strokeStyle=bg;g.lineWidth=.06;
      for(let s=-1;s<2;s+=2){
        g.save();g.rotate(s*.66);
        g.beginPath();g.moveTo(0,-.74);g.lineTo(.1,-.02);g.lineTo(-.1,-.02);g.closePath();g.stroke();g.fill();
        g.fillRect(-.22,-.02,.44,.08);g.fillRect(-.055,.06,.11,.34);disc(0,.46,.08);g.fill();
        g.restore();
      }
    },
    arm(f,A,x1,y1,x2,y2,an){turned(f,an);bladeCore(f.r,A.l,1.7,'#1f2327','#3b4249',1.9);g.fillStyle='#b3313f';g.fillRect(f.r+.4,-1,.9,2);g.fillRect(f.r+2.4,-1,.9,2);g.restore()}},
  // Berserker: horned helm; a bearded axe whose steel reddens as its health drops
  fury:{
    crest(fg,bg){
      for(let s=-1;s<2;s+=2){g.beginPath();g.moveTo(s*.3,-.24);g.quadraticCurveTo(s*.76,-.2,s*.62,-.64);g.quadraticCurveTo(s*.52,-.36,s*.32,-.04);g.closePath();g.fill()}
      g.beginPath();g.moveTo(-.38,.34);g.lineTo(-.38,-.02);g.bezierCurveTo(-.38,-.54,.38,-.54,.38,-.02);g.lineTo(.38,.34);g.lineTo(.15,.34);g.lineTo(.15,.1);g.lineTo(.07,.1);g.lineTo(.07,.6);g.lineTo(-.07,.6);g.lineTo(-.07,.1);g.lineTo(-.15,.1);g.lineTo(-.15,.34);g.closePath();g.fill();
      g.fillStyle=bg;g.fillRect(-.38,-.07,.76,.05);
    },
    arm(f,A,x1,y1,x2,y2,an){
      turned(f,an);
      const r=f.r,L=A.l,tx=r+L,q=1-Math.max(0,Math.min(1,f.hp/f.max));
      g.lineJoin='round';g.strokeStyle=EDGE;g.lineWidth=.55;
      g.fillStyle=lin(g,0,-1.3,0,1.3,[0,'#8a6240',1,'#4f3520']);g.fillRect(r-2,-1.3,L+1,2.6);g.strokeRect(r-2,-1.3,L+1,2.6);
      const steel=`rgb(${215+30*q|0},${221-150*q|0},${226-170*q|0})`,lo=`rgb(${139+50*q|0},${149-110*q|0},${157-120*q|0})`;
      g.fillStyle=lin(g,tx-12,-10,tx,-1,[0,steel,1,lo]);
      g.beginPath();g.moveTo(tx-9,-1.3);g.quadraticCurveTo(tx-10,-6,tx-13.5,-10.2);g.quadraticCurveTo(tx-5,-12.6,tx+1.5,-8.6);g.quadraticCurveTo(tx-2,-5,tx-2,-1.3);g.closePath();g.fill();g.stroke();
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=.4;g.beginPath();g.moveTo(tx-12.6,-9.8);g.quadraticCurveTo(tx-5,-11.8,tx+.8,-8.4);g.stroke();
      g.strokeStyle=EDGE;g.lineWidth=.55;g.fillStyle=lo;g.beginPath();g.moveTo(tx-8,1.3);g.lineTo(tx-5.5,5.2);g.lineTo(tx-3,1.3);g.closePath();g.fill();g.stroke();
      g.fillStyle=GOLD;g.fillRect(tx-1.2,-1.7,2.2,3.4);g.strokeRect(tx-1.2,-1.7,2.2,3.4);
      g.restore();
    }},
  // Comet: a comet; a flame streams behind it and embers mark where it has been
  comet:{
    crest(fg,bg){
      g.beginPath();g.moveTo(.5,.16);g.quadraticCurveTo(.12,-.5,-.7,-.66);g.quadraticCurveTo(-.12,-.18,.16,.5);g.closePath();g.fill();
      disc(.3,.3,.24);g.fill();
      g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();g.moveTo(.06,.02);g.lineTo(-.4,-.46);g.stroke();
    },
    under(f,m){
      const T=f.s.trail,life=f.s.life||2.2;
      for(let k=0;k<T.length;k++){
        const p=T[k],age=(m.t-p.t)/life,a=Math.max(0,1-age);
        g.globalAlpha=a*.3;g.fillStyle='#ff6a2a';disc(p.x,p.y,3.5+6*a);g.fill();
        g.globalAlpha=a*.9;g.fillStyle=age<.3?'#ffe9a8':age<.65?'#ffb347':'#e0522c';disc(p.x,p.y,1.4+3.2*a);g.fill();
      }
      g.globalAlpha=1;
    },
    back(f){
      const sp=Math.hypot(f.vx,f.vy)||1,ux=-f.vx/sp,uy=-f.vy/sp,r=f.r,fl=1+.1*Math.sin(NOW*31);
      for(let k=0;k<3;k++){
        const w=r*(1.02-k*.24),l=r*(2-k*.38)*fl;
        g.fillStyle=k===0?'#d8452c':k===1?'#ffa13a':'#ffe9a8';g.globalAlpha=k===0?.6:.8;
        g.beginPath();g.moveTo(f.x-uy*w,f.y+ux*w);g.quadraticCurveTo(f.x+ux*l*.55-uy*w*.75,f.y+uy*l*.55+ux*w*.75,f.x+ux*l,f.y+uy*l);
        g.quadraticCurveTo(f.x+ux*l*.55+uy*w*.75,f.y+uy*l*.55-ux*w*.75,f.x+uy*w,f.y-ux*w);g.closePath();g.fill();
      }
    }},
  // Bramble: a thorned rose; thorns of dark wood and green grow from the walls it has touched
  bramble:{
    crest(fg,bg){
      g.lineWidth=.08;g.beginPath();g.moveTo(0,.12);g.quadraticCurveTo(.08,.46,-.02,.74);g.stroke();
      g.beginPath();g.moveTo(.03,.32);g.lineTo(.22,.26);g.lineTo(.05,.42);g.fill();
      g.beginPath();g.moveTo(.01,.5);g.lineTo(-.2,.46);g.lineTo(0,.6);g.fill();
      g.beginPath();g.moveTo(.05,.6);g.quadraticCurveTo(.38,.4,.52,.62);g.quadraticCurveTo(.26,.76,.05,.6);g.fill();
      for(let k=0;k<5;k++){const a=k/5*TAU-Math.PI/2;disc(Math.cos(a)*.24,-.2+Math.sin(a)*.24,.2);g.fill()}
      g.strokeStyle=bg;g.lineWidth=.035;
      for(let k=0;k<5;k++){const a=k/5*TAU-Math.PI/2+TAU/10;g.beginPath();g.moveTo(Math.cos(a)*.13,-.2+Math.sin(a)*.13);g.lineTo(Math.cos(a)*.42,-.2+Math.sin(a)*.42);g.stroke()}
      g.fillStyle=bg;disc(0,-.2,.09);g.fill();
    },
    under(f,m){
      g.lineJoin='round';g.lineWidth=.55;
      for(const t of f.s.thorns){
        const grow=Math.min(1,(m.t-t.born)/.25),tx=t.x+(t.tx-t.x)*grow,ty=t.y+(t.ty-t.y)*grow,dx=t.tx-t.x,dy=t.ty-t.y,l=Math.hypot(dx,dy)||1,px=-dy/l,py=dx/l,w=6.4;
        g.fillStyle=t.cd>0?'#5a5646':lin(g,t.x,t.y,t.tx,t.ty,[0,'#5a3f27',.4,'#5f8a36',1,'#c2e88a']);g.strokeStyle=EDGE;
        g.beginPath();g.moveTo(t.x+px*w,t.y+py*w);g.quadraticCurveTo(t.x+dx*.35+px*w*.45,t.y+dy*.35+py*w*.45,tx,ty);g.quadraticCurveTo(t.x+dx*.35-px*w*.45,t.y+dy*.35-py*w*.45,t.x-px*w,t.y-py*w);g.closePath();g.fill();g.stroke();
        if(grow>=1){g.beginPath();g.moveTo(t.x+dx*.3+px*1.6,t.y+dy*.3+py*1.6);g.lineTo(t.x+dx*.42+px*5,t.y+dy*.42+py*5);g.lineTo(t.x+dx*.5+px*1.2,t.y+dy*.5+py*1.2);g.closePath();g.fill();g.stroke()}
      }
    },
    back(f){
      const r=f.r,n=8;
      g.fillStyle='#4f6f33';g.strokeStyle=EDGE;g.lineWidth=.5;g.lineJoin='round';g.beginPath();
      for(let k=0;k<n;k++){const a=k/n*TAU+.39;g.moveTo(f.x+Math.cos(a-.13)*(r-1),f.y+Math.sin(a-.13)*(r-1));g.lineTo(f.x+Math.cos(a+.1)*(r+3.6),f.y+Math.sin(a+.1)*(r+3.6));g.lineTo(f.x+Math.cos(a+.13)*(r-1),f.y+Math.sin(a+.13)*(r-1))}
      g.fill();g.stroke();
    }},
  // Beekeeper: a bee
  bees:{crest(fg,bg){
    for(let s=-1;s<2;s+=2){g.beginPath();g.ellipse(s*.36,-.14,.3,.16,-s*.5,0,TAU);g.fill()}
    g.beginPath();g.ellipse(0,.14,.24,.4,0,0,TAU);g.fill();disc(0,-.36,.15);g.fill();
    g.beginPath();g.moveTo(-.06,.5);g.lineTo(0,.72);g.lineTo(.06,.5);g.fill();
    g.lineWidth=.04;g.beginPath();g.moveTo(-.06,-.46);g.lineTo(-.18,-.66);g.moveTo(.06,-.46);g.lineTo(.18,-.66);g.stroke();
    g.fillStyle=bg;g.fillRect(-.22,.02,.44,.09);g.fillRect(-.21,.23,.42,.09);
  }},
  // Ghost: a ghost; pale wisps trail it when it lunges back into the world
  ghost:{
    crest(fg,bg){
      g.beginPath();g.moveTo(-.44,.56);g.lineTo(-.44,-.14);g.bezierCurveTo(-.44,-.84,.44,-.84,.44,-.14);g.lineTo(.44,.56);
      g.quadraticCurveTo(.33,.36,.22,.56);g.quadraticCurveTo(.11,.36,0,.56);g.quadraticCurveTo(-.11,.36,-.22,.56);g.quadraticCurveTo(-.33,.36,-.44,.56);g.fill();
      g.fillStyle=bg;g.beginPath();g.ellipse(-.17,-.16,.08,.13,0,0,TAU);g.fill();g.beginPath();g.ellipse(.17,-.16,.08,.13,0,0,TAU);g.fill();
    },
    back(f){
      const r=f.r;
      g.fillStyle='rgba(215,224,255,.1)';disc(f.x,f.y,r*1.22);g.fill();
      if(f.s.dash>0){
        const sp=Math.hypot(f.vx,f.vy)||1,ux=-f.vx/sp,uy=-f.vy/sp;
        g.strokeStyle='rgba(225,232,255,.5)';g.lineCap='round';
        for(let k=-1;k<2;k++){
          g.lineWidth=r*(k?.3:.5);
          g.beginPath();g.moveTo(f.x-uy*k*r*.6,f.y+ux*k*r*.6);g.lineTo(f.x-uy*k*r*.6+ux*r*(k?2.1:2.8),f.y+ux*k*r*.6+uy*r*(k?2.1:2.8));g.stroke();
        }
      }
    }},
  // Snowball: a snowflake; frost spikes at the rim grow as it does
  snow:{
    crest(fg,bg){
      g.lineWidth=.085;
      for(let k=0;k<6;k++){
        g.save();g.rotate(k/6*TAU);
        g.beginPath();g.moveTo(0,0);g.lineTo(0,-.72);g.moveTo(0,-.42);g.lineTo(.18,-.6);g.moveTo(0,-.42);g.lineTo(-.18,-.6);g.moveTo(0,-.2);g.lineTo(.1,-.3);g.moveTo(0,-.2);g.lineTo(-.1,-.3);g.stroke();
        g.restore();
      }
      disc(0,0,.1);g.fill();
    },
    back(f){
      const r=f.r,n=18,len=1.4+(f.s.grow||0)*.24;
      g.fillStyle='#e8f6ff';g.strokeStyle='#7fb1cf';g.lineWidth=.4;g.lineJoin='round';g.beginPath();
      for(let k=0;k<n;k++){const a=k/n*TAU+.17,l=r+len*(k%2?1:.55);g.moveTo(f.x+Math.cos(a-.1)*(r-1),f.y+Math.sin(a-.1)*(r-1));g.lineTo(f.x+Math.cos(a)*l,f.y+Math.sin(a)*l);g.lineTo(f.x+Math.cos(a+.1)*(r-1),f.y+Math.sin(a+.1)*(r-1))}
      g.fill();g.stroke();
    },
    over(f){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=Math.max(.5,f.r*.05);g.beginPath();g.arc(f.x,f.y,f.r*.93,Math.PI*1.1,Math.PI*1.55);g.stroke()}},
  // Tesla: a lightning bolt; a faint ring shows its reach and sparks crawl on its rim
  tesla:{
    crest(fg,bg){g.beginPath();g.moveTo(.16,-.74);g.lineTo(-.34,.08);g.lineTo(-.04,.08);g.lineTo(-.2,.74);g.lineTo(.36,-.14);g.lineTo(.06,-.14);g.closePath();g.fill()},
    under(f,m){
      if(!f.s.range)return;
      g.strokeStyle='rgba(127,231,255,.32)';g.lineWidth=.8;g.setLineDash(DASH_RANGE);g.lineDashOffset=-m.t*9;disc(f.x,f.y,f.s.range);g.stroke();g.setLineDash(NODASH);g.lineDashOffset=0;
    },
    over(f){
      g.strokeStyle='#c9f7ff';g.lineWidth=.6;g.lineJoin='round';g.beginPath();
      for(let k=0;k<2;k++){
        const a=NOW*5.3+k*2.7+Math.sin(NOW*13+k)*.4,r=f.r,c=Math.cos(a),s=Math.sin(a),j=Math.sin(NOW*37+k*5)*1.6;
        g.moveTo(f.x+c*(r+.5),f.y+s*(r+.5));g.lineTo(f.x+c*(r+2.6)-s*j,f.y+s*(r+2.6)+c*j);g.lineTo(f.x+c*(r+4.6)+s*j*.6,f.y+s*(r+4.6)-c*j*.6);
      }
      g.stroke();
    }},
  // Magnet: a horseshoe magnet with red poles; rings close in on it while it pulls
  magnet:{
    crest(fg,bg){
      g.lineCap='butt';g.lineWidth=.26;g.beginPath();g.moveTo(-.36,.52);g.lineTo(-.36,-.08);g.arc(0,-.08,.36,Math.PI,0);g.lineTo(.36,.52);g.stroke();
      g.fillStyle='#d9525e';g.fillRect(-.49,.33,.26,.19);g.fillRect(.23,.33,.26,.19);
      g.strokeStyle=bg;g.lineWidth=.05;g.beginPath();g.moveTo(-.5,.3);g.lineTo(-.22,.3);g.moveTo(.22,.3);g.lineTo(.5,.3);g.stroke();
      g.strokeStyle=fg;g.lineWidth=.04;g.lineCap='round';g.beginPath();g.moveTo(-.1,.52);g.lineTo(-.1,.66);g.moveTo(0,.46);g.lineTo(0,.72);g.moveTo(.1,.52);g.lineTo(.1,.66);g.stroke();
    },
    under(f){
      if(!(f.s.pull>0))return;
      const q=f.s.pull/1.1;
      g.strokeStyle=shade(f.col,.45);g.lineWidth=1.2;
      for(let k=0;k<3;k++){const rr=18+((q+k/3)%1)*84;g.globalAlpha=.6*(1-(rr-18)/84);disc(f.x,f.y,rr);g.stroke()}
      g.globalAlpha=1;
    }},
  // Mirror: a hand mirror; glints wink at its rim
  mirror:{
    crest(fg,bg){                                           // the Duplicator: one disc pulling apart into two
      g.fillStyle=fg;
      disc(-.3,0,.36);g.fill();disc(.3,0,.36);g.fill();
      g.fillRect(-.3,-.2,.6,.4);                            // the waist still joining them
      g.fillStyle=bg;
      g.beginPath();g.ellipse(0,-.37,.17,.19,0,0,TAU);g.fill();g.beginPath();g.ellipse(0,.37,.17,.19,0,0,TAU);g.fill();   // pinched in, top and bottom
      disc(-.34,0,.13);g.fill();disc(.34,0,.13);g.fill();   // a core in each half
      g.strokeStyle=fg;g.lineWidth=.05;g.lineCap='round';   // and the two pulling away
      g.beginPath();g.moveTo(-.74,-.14);g.lineTo(-.86,0);g.lineTo(-.74,.14);g.moveTo(.74,-.14);g.lineTo(.86,0);g.lineTo(.74,.14);g.stroke();
    },
    over(f){
      g.fillStyle='#ffffff';
      for(let k=0;k<2;k++){
        const tw=Math.max(0,Math.sin(NOW*3.1+k*2.2)),a=-.9+k*2.5,x=f.x+Math.cos(a)*f.r*.96,y=f.y+Math.sin(a)*f.r*.96,s=f.r*.16*tw;
        if(s<.3)continue;
        g.globalAlpha=.9*tw;g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s*.22,y-s*.22);g.lineTo(x+s,y);g.lineTo(x+s*.22,y+s*.22);g.lineTo(x,y+s);g.lineTo(x-s*.22,y+s*.22);g.lineTo(x-s,y);g.lineTo(x-s*.22,y-s*.22);g.closePath();g.fill();
      }
    }},
  // Spider: a spider; jointed legs scuttle behind the medallion and silver threads hang between the walls
  spider:{
    crest(fg,bg){
      g.lineWidth=.065;
      for(let s=-1;s<2;s+=2){
        g.beginPath();
        g.moveTo(s*.12,-.16);g.lineTo(s*.4,-.46);g.lineTo(s*.52,-.64);
        g.moveTo(s*.14,-.06);g.lineTo(s*.54,-.2);g.lineTo(s*.74,-.3);
        g.moveTo(s*.14,.04);g.lineTo(s*.54,.14);g.lineTo(s*.74,.3);
        g.moveTo(s*.12,.14);g.lineTo(s*.4,.42);g.lineTo(s*.52,.68);
        g.stroke();
      }
      disc(0,-.08,.17);g.fill();g.beginPath();g.ellipse(0,.26,.25,.3,0,0,TAU);g.fill();
      g.fillStyle='#c0424f';disc(0,.28,.075);g.fill();
    },
    under(f){
      const W=f.s.webs;
      g.lineCap='round';g.strokeStyle='rgba(222,230,238,.75)';g.lineWidth=.7;g.beginPath();
      for(const w of W){g.moveTo(w.x1,w.y1);g.lineTo(w.x2,w.y2)}
      g.stroke();
      g.fillStyle='rgba(236,242,248,.85)';
      for(const w of W){
        const l=Math.hypot(w.x2-w.x1,w.y2-w.y1)||1,n=Math.max(1,(l/22)|0);
        for(let k=1;k<n;k++){disc(w.x1+(w.x2-w.x1)*k/n,w.y1+(w.y2-w.y1)*k/n,.9);g.fill()}
        disc(w.x1,w.y1,1.8);g.fill();disc(w.x2,w.y2,1.8);g.fill();
      }
    },
    back(f){
      const r=f.r,ph=(f.x+f.y)*.33;
      g.lineCap='round';g.lineJoin='round';
      for(let p=0;p<2;p++){
        g.strokeStyle=p?'#79828b':EDGE;g.lineWidth=p?1.15:2.3;g.beginPath();
        for(let s=-1;s<2;s+=2)for(let k=0;k<4;k++){
          const a=(s>0?0:Math.PI)+s*(-.95+k*.63)+Math.sin(ph+k*1.7+(s>0?0:1.6))*.13,up=s*(k<2?-.3:.3);
          g.moveTo(f.x+Math.cos(a)*r*.9,f.y+Math.sin(a)*r*.9);g.lineTo(f.x+Math.cos(a+up*.5)*(r+4.6),f.y+Math.sin(a+up*.5)*(r+4.6));g.lineTo(f.x+Math.cos(a+up)*(r+9),f.y+Math.sin(a+up)*(r+9));
        }
        g.stroke();
      }
    }},
  // Necromancer: a skull; a dark staff with a green soul-gem
  necro:{
    crest(fg,bg){
      disc(0,-.14,.46);g.fill();rrect(g,-.27,.14,.54,.42,.1);g.fill();
      g.fillStyle=bg;g.beginPath();g.ellipse(-.19,-.1,.12,.14,0,0,TAU);g.fill();g.beginPath();g.ellipse(.19,-.1,.12,.14,0,0,TAU);g.fill();
      g.beginPath();g.moveTo(0,.08);g.lineTo(-.07,.24);g.lineTo(.07,.24);g.closePath();g.fill();
      g.fillRect(-.14,.38,.04,.18);g.fillRect(-.02,.38,.04,.18);g.fillRect(.1,.38,.04,.18);
    },
    arm(f,A,x1,y1,x2,y2,an){
      turned(f,an);
      const r=f.r,L=A.l,tx=r+L-1;
      g.strokeStyle=EDGE;g.lineWidth=.55;g.lineJoin='round';
      g.fillStyle=lin(g,0,-1.2,0,1.2,[0,'#6a5038',1,'#2e2116']);g.fillRect(r-2,-1.2,L-4,2.4);g.strokeRect(r-2,-1.2,L-4,2.4);
      g.fillStyle=GOLD;g.beginPath();g.moveTo(tx-6.4,-1.6);g.lineTo(tx-3,-3.4);g.lineTo(tx-3,3.4);g.lineTo(tx-6.4,1.6);g.closePath();g.fill();g.stroke();
      g.fillStyle='rgba(95,235,150,.3)';g.beginPath();g.arc(tx,0,5.6,0,TAU);g.fill();
      g.fillStyle=rad(g,tx-1,-1.2,.4,tx,0,3.6,[0,'#eafff1',.5,'#6fe39f',1,'#1f8f55']);g.beginPath();g.arc(tx,0,3.4,0,TAU);g.fill();g.stroke();
      g.restore();
    }},
  // Painter: a palette with dabs of colour (its paint is the stain it leaves on the flagstones)
  painter:{crest(fg,bg){
    g.beginPath();g.moveTo(-.66,.06);g.bezierCurveTo(-.7,-.5,.1,-.72,.56,-.4);g.bezierCurveTo(.86,-.18,.6,.1,.4,.08);g.bezierCurveTo(.2,.06,.14,.24,.26,.4);g.bezierCurveTo(.36,.6,-.6,.72,-.66,.06);g.fill();
    g.fillStyle=bg;disc(.36,-.14,.1);g.fill();
    g.fillStyle='#c0424f';disc(-.4,-.14,.1);g.fill();g.fillStyle='#e0a83a';disc(-.14,-.38,.1);g.fill();
    g.fillStyle='#4f8fd0';disc(-.38,.22,.1);g.fill();g.fillStyle='#5fae5a';disc(-.08,.4,.1);g.fill();
  }},
  // Clockmaker: a clock face; its weapons are ornate gold clock hands, a long minute hand and a short hour hand
  clock:{
    crest(fg,bg){
      g.lineWidth=.09;disc(0,0,.62);g.stroke();
      for(let k=0;k<12;k++){const a=k/12*TAU,i=k%3?.5:.42;g.lineWidth=k%3?.04:.07;g.beginPath();g.moveTo(Math.cos(a)*i,Math.sin(a)*i);g.lineTo(Math.cos(a)*.56,Math.sin(a)*.56);g.stroke()}
      g.lineWidth=.085;g.beginPath();g.moveTo(0,0);g.lineTo(0,-.4);g.moveTo(0,0);g.lineTo(.24,.14);g.stroke();
      disc(0,0,.075);g.fill();
    },
    arm(f,A,x1,y1,x2,y2,an){
      turned(f,an);
      const r=f.r,L=A.l,tx=r+L,hour=A.rate<1,w=hour?1.5:.95,sp=hour?3.6:2.6,sl=hour?7:8.5;
      g.strokeStyle=EDGE;g.lineWidth=.5;g.lineJoin='round';
      g.fillStyle=lin(g,0,-sp,0,sp,[0,GOLD_HI,.5,GOLD,1,GOLD_LO]);
      g.beginPath();g.moveTo(r-2,-w);g.lineTo(tx-sl,-w);g.quadraticCurveTo(tx-sl*.75,-sp*1.25,tx-sl*.42,-sp*.7);g.lineTo(tx,0);g.lineTo(tx-sl*.42,sp*.7);g.quadraticCurveTo(tx-sl*.75,sp*1.25,tx-sl,w);g.lineTo(r-2,w);g.closePath();g.fill();g.stroke();
      const cx=r+L*.36;
      g.beginPath();g.arc(cx,0,hour?2.6:2.1,0,TAU);g.fill();g.stroke();
      g.fillStyle=EDGE;g.beginPath();g.arc(cx,0,hour?1.2:.9,0,TAU);g.fill();
      g.restore();
    }},
});

// ---------- minions ----------
function smallMedal(x,y,r,col,ring,ringLo){
  g.fillStyle=ring;g.strokeStyle=EDGE;g.lineWidth=Math.max(.4,r*.05);disc(x,y,r);g.fill();g.stroke();
  g.strokeStyle=ringLo;g.lineWidth=Math.max(.3,r*.05);disc(x,y,r*.9);g.stroke();
  g.fillStyle=EDGE;disc(x,y,r*.82);g.fill();
  g.fillStyle=rad(g,x-r*.25,y-r*.3,r*.1,x,y,r*.8,[0,shade(col,.3),.6,col,1,shade(col,-.35)]);disc(x,y,r*.74);g.fill();
}
const MINION_LOOKS={
  // an amber bee flying nose-first
  bee(q,t){
    const a=Math.atan2(q.vy,q.vx),r=q.r,fl=Math.sin(t*46+q.x)>0?1:.55;
    g.save();g.translate(q.x,q.y);g.rotate(a);
    g.fillStyle='rgba(255,196,64,.18)';g.beginPath();g.arc(0,0,r*1.9,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.62)';g.beginPath();g.ellipse(-r*.1,-r*.95,r*.75,r*.42*fl,-.5,0,TAU);g.fill();g.beginPath();g.ellipse(-r*.1,r*.95,r*.75,r*.42*fl,.5,0,TAU);g.fill();
    g.fillStyle='#f2b632';g.strokeStyle=EDGE;g.lineWidth=.45;g.beginPath();g.ellipse(0,0,r*1.15,r*.78,0,0,TAU);g.fill();g.stroke();
    g.fillStyle='#2a1c06';g.fillRect(-r*.5,-r*.72,r*.3,r*1.44);g.fillRect(r*.1,-r*.74,r*.3,r*1.48);
    g.beginPath();g.arc(r*1.05,0,r*.42,0,TAU);g.fill();
    g.restore();
  },
  // a double of the Duplicator: the fighter again, a little paler, wearing the same crest
  copy(q,t){
    const r=q.r,col=shade(q.col,.18);
    g.globalAlpha=.9;
    smallMedal(q.x,q.y,r,col,GOLD,GOLD_LO);
    g.save();g.translate(q.x,q.y);g.scale(r*.66,r*.66);
    g.fillStyle='#fbf3df';g.strokeStyle='#fbf3df';
    try{LOOKS.mirror.crest('#fbf3df',col)}catch(e){}
    g.restore();
    g.globalAlpha=1;
  },
  // a raised skull with green light in its sockets
  bone(q,t){
    const r=q.r,x=q.x,y=q.y;
    g.fillStyle=rad(g,x-r*.25,y-r*.4,r*.1,x,y,r,[0,'#fbf6e8',.7,'#ddd3bb',1,'#a89d84']);g.strokeStyle=EDGE;g.lineWidth=.5;g.lineJoin='round';
    rrect(g,x-r*.5,y+r*.2,r,r*.72,r*.16);g.fill();g.stroke();
    disc(x,y-r*.12,r*.84);g.fill();g.stroke();
    g.fillStyle=EDGE;g.beginPath();g.ellipse(x-r*.33,y-r*.08,r*.22,r*.26,0,0,TAU);g.fill();g.beginPath();g.ellipse(x+r*.33,y-r*.08,r*.22,r*.26,0,0,TAU);g.fill();
    g.beginPath();g.moveTo(x,y+r*.22);g.lineTo(x-r*.12,y+r*.46);g.lineTo(x+r*.12,y+r*.46);g.closePath();g.fill();
    g.fillRect(x-r*.22,y+r*.62,r*.07,r*.28);g.fillRect(x+r*.15,y+r*.62,r*.07,r*.28);
    g.fillStyle='#7dffb0';disc(x-r*.33,y-r*.06,r*.1);g.fill();disc(x+r*.33,y-r*.06,r*.1);g.fill();
    g.strokeStyle=q.col;g.lineWidth=.6;g.globalAlpha=.8;disc(x,y,r*1.18);g.stroke();g.globalAlpha=1;
  },
};
function drawMinion(q,t){
  const fn=MINION_LOOKS[q.kind];
  if(q.lead&&LIVE)FX.glow(g,q.x,q.y,q.r*2.4,GOLD_HI,.45);
  if(fn)fn(q,t);else smallMedal(q.x,q.y,q.r,q.col||GOLD,GOLD,GOLD_LO);
  g.globalAlpha=1;g.shadowBlur=0;g.shadowColor='transparent';
}

// ---------- a fighter ----------
function plainCrest(fg,bg){g.beginPath();g.moveTo(0,-.56);g.lineTo(.4,0);g.lineTo(0,.56);g.lineTo(-.4,0);g.closePath();g.fill();g.fillStyle=bg;g.beginPath();g.moveTo(0,-.22);g.lineTo(.16,0);g.lineTo(0,.22);g.lineTo(-.16,0);g.closePath();g.fill()}
function resetInk(alpha){g.globalAlpha=alpha;g.shadowBlur=0;g.shadowColor='transparent';g.shadowOffsetY=0;g.setLineDash(NODASH);g.lineDashOffset=0;g.lineCap='round';g.lineJoin='round'}
function drawFighter(f,isYou){
  if(f.hp<=0)return;
  const D=FIGHTERS[f.key],L=LOOKS[f.key]||{},r=f.r,x=f.x,y=f.y,base=f.col||D.color,alpha=f.gone?.2:1;
  g.save();
  resetInk(alpha);
  // a knock squashes the medallion and its weapons for a moment; the name and the health banner stay steady
  const SQ=LIVE?FX.sq(f.i):null;
  g.save();
  if(SQ){g.translate(x,y);g.rotate(SQ.th);g.scale(1-SQ.k,1+SQ.k*.7);g.rotate(-SQ.th);g.translate(-x,-y)}
  if(LIVE){FX.back(g,f,MATCH,alpha);resetInk(alpha)}
  // Since Build 69 the fighter is a ball of painted stone with a real-looking weapon set into its side, both made by
  // brawl-art.js (the notes there say why, in the user's words). STONE is false where there is no real canvas (the
  // tests), and everything below then draws the old medallion and the weapons drawn in code. An arm whose picture is
  // ready is kept in "held" and drawn AFTER the ball, cut off where it enters it; any other arm is drawn here, under it.
  const STONE=!!(typeof ART!=='undefined'&&ART&&ART.ok),held=[];
  if(!PORTRAIT)for(const A of f.arms){
    const an=f.ang*A.rate+A.a,c=Math.cos(an),s=Math.sin(an),x2=x+c*(r+A.l),y2=y+s*(r+A.l);
    const pic=STONE?ART.strip(A.extra?ART.EXTRA:ART.HELD[f.key]):null;
    if(pic){held.push([pic,an,A.l,x2,y2]);continue}
    if(A.extra||!L.arm){turned(f,an);steelBlade(r,A.l,A.extra?1.9:2.3);g.restore()}
    else L.arm(f,A,x+c*r,y+s*r,x2,y2,an);
    resetInk(alpha);
    if(f.poison){g.fillStyle='#8be05a';g.strokeStyle=EDGE;g.lineWidth=.45;disc(x2,y2,1.5);g.fill();g.stroke()}
  }
  const gunPic=STONE&&!PORTRAIT&&f.key==='blaster'?ART.strip(ART.GUN):null;
  if(gunPic)held.push([gunPic,f.aim,15,0,0]);
  else if(!PORTRAIT&&f.key==='blaster')barrel(f,f.aim,4,10.5,false);
  if(!PORTRAIT&&f.side)barrel(f,f.key==='blaster'?f.aim+.5:f.aim,2.3,8,true);
  if(L.back&&!PORTRAIT){L.back(f);resetInk(alpha)}

  // the medallion: gold ring, dark seat, enamel, crest
  const hit=f.flash>0,col=hit?shade(base,.4):base;      // a hit flashes the enamel pale; the crest must still read
  const ballPic=STONE?(PORTRAIT?ART.ball(f.key,base,ART.size(r*2*PX)):ART.rolling(f,base,ART.size(r*2*PX),x,y,r)):null;   // in the arena it rolls; a portrait stands still
  if(ballPic)ART.drawBall(g,ballPic,x,y,r,alpha,hit,!PORTRAIT);
  else{
  if(RING){g.fillStyle=lin(g,x-r,y-r,x+r,y+r,[0,GOLD_HI,.45,GOLD,1,GOLD_LO]);g.strokeStyle=EDGE;g.lineWidth=Math.max(.45,r*.035);disc(x,y,r);g.fill();g.stroke();}
  else{g.fillStyle=EDGE;disc(x,y,r);g.fill()}                 // no ring: a thin dark rim and the enamel right to the edge
  if(RING&&r>=11){
    g.strokeStyle='rgba(60,42,12,.75)';g.lineWidth=Math.max(.3,r*.03);g.beginPath();
    for(let k=0;k<28;k++){const a=k/28*TAU;g.moveTo(x+Math.cos(a)*(r*.975),y+Math.sin(a)*(r*.975));g.lineTo(x+Math.cos(a+.05)*(r*.945),y+Math.sin(a+.05)*(r*.945))}
    g.stroke();
  }
  if(RING){g.fillStyle=EDGE;disc(x,y,r*.925);g.fill()}
  g.fillStyle=rad(g,x-r*.25,y-r*.3,r*.1,x,y,r*.92,[0,shade(col,.28),.55,col,1,shade(col,-.35)]);disc(x,y,RING?r*.885:r*.95);g.fill();
  g.save();
  g.translate(x,y-r*.06);g.scale(r*.84,r*.84);
  g.fillStyle=IVORY;g.strokeStyle=IVORY;g.lineCap='round';g.lineJoin='round';g.lineWidth=.06;
  g.shadowColor='rgba(0,0,0,.45)';g.shadowOffsetX=0;g.shadowOffsetY=Math.max(.6,r*.05*PX);g.shadowBlur=0;
  (L.crest||plainCrest)(IVORY,col);
  g.restore();
  }
  resetInk(alpha);
  for(const H of held){
    ART.drawHeld(g,x,y,r,H[0],H[1],H[2],alpha);resetInk(alpha);
    if(f.poison&&H[3]){g.fillStyle='#8be05a';g.strokeStyle=EDGE;g.lineWidth=.45;disc(H[3],H[4],1.5);g.fill();g.stroke()}
  }
  if(hit){g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=Math.max(.8,r*.06);disc(x,y,r+.8);g.stroke();if(LIVE){FX.glow(g,x,y,r*1.6,'#fff2c4',Math.min(.42,f.flash*3.5));resetInk(alpha)}}

  // conditions
  if(f.poisonT>0){
    g.strokeStyle='rgba(139,224,90,.95)';g.lineWidth=Math.max(.7,r*.06);disc(x,y,r*.83);g.stroke();
    g.fillStyle='#9be86a';g.strokeStyle=EDGE;g.lineWidth=.35;
    for(let k=0;k<3;k++){const u=(NOW*.9+k*.37)%1,a=-1.1+k*.8;g.globalAlpha=alpha*(1-u);disc(x+Math.cos(a)*r*.9+Math.sin(NOW*4+k)*1.2,y+Math.sin(a)*r*.9-u*r*.7,1.1+k*.35);g.fill();g.stroke()}
    g.globalAlpha=alpha;
  }
  if(f.slowT>0){g.strokeStyle='rgba(160,215,255,.9)';g.lineWidth=1.1;g.setLineDash(DASH_SLOW);g.lineDashOffset=NOW*7;disc(x,y,r+2.4);g.stroke();g.setLineDash(NODASH);g.lineDashOffset=0}
  if(f.stunT>0){
    if(LIVE){FX.glow(g,x,y,r*1.9,'#9fe0ff',.4);resetInk(alpha)}
    g.fillStyle='rgba(205,238,255,.5)';disc(x,y,r*.88);g.fill();
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.8;disc(x,y,r+.6);g.stroke();
    g.fillStyle='#e3f7ff';g.strokeStyle='#6fa9cb';g.lineWidth=.4;g.lineJoin='round';g.beginPath();
    for(let k=0;k<6;k++){
      const a=k/6*TAU+.5,c=Math.cos(a),s=Math.sin(a),l=r*.34+2,w=r*.1+.9,bx=x+c*(r*.98),by=y+s*(r*.98);
      g.moveTo(bx-s*w,by+c*w);g.lineTo(bx+c*l,by+s*l);g.lineTo(bx+s*w,by-c*w);g.lineTo(bx-c*l*.3,by-s*l*.3);g.closePath();
    }
    g.fill();g.stroke();
  }
  if(f.shield&&f.shieldT<=0&&!PORTRAIT){
    g.strokeStyle='rgba(176,208,255,.8)';g.lineWidth=.8;disc(x,y,r+5);g.stroke();
    g.strokeStyle='rgba(240,220,164,.75)';g.lineWidth=.6;g.setLineDash(DASH_FINE);g.lineDashOffset=NOW*5;disc(x,y,r+3.3);g.stroke();g.setLineDash(NODASH);g.lineDashOffset=0;
    for(let k=0;k<4;k++){const a=k/4*TAU+NOW*.9;lozenge(g,x+Math.cos(a)*(r+5),y+Math.sin(a)*(r+5),1.5,'#cfe1ff')}
  }
  if(L.over&&!PORTRAIT){L.over(f,MATCH);resetInk(alpha)}
  if(LIVE){FX.front(g,f,MATCH,alpha);resetInk(alpha)}
  g.restore();resetInk(alpha);

  if(!f.gone&&!PORTRAIT){
    // health on a small crimson banner at the foot
    const pw=Math.max(r*1.02,15),ph=Math.max(r*.42,6.4),py=y+r*.78,lw=Math.max(.35,r*.028),hp=String(Math.max(0,Math.ceil(f.hp)));
    if(!(STONE&&ART.plaque(g,x,py,pw*.96,ph))){
    g.fillStyle=CRIMSON_LO;g.strokeStyle=EDGE;g.lineWidth=lw;g.lineJoin='miter';
    for(let s=-1;s<2;s+=2){g.beginPath();g.moveTo(x+s*pw*.42,py-ph*.3);g.lineTo(x+s*pw*.74,py-ph*.3);g.lineTo(x+s*pw*.62,py+ph*.1);g.lineTo(x+s*pw*.74,py+ph*.5);g.lineTo(x+s*pw*.42,py+ph*.5);g.closePath();g.fill();g.stroke()}
    g.fillStyle=CRIMSON;rrect(g,x-pw/2,py-ph/2,pw,ph,ph*.14);g.fill();g.stroke();
    }
    g.fillStyle=IVORY;g.textAlign='center';g.textBaseline='middle';
    g.font='700 '+(Math.max(5.4,r*.34)*(hp.length>3?.8:1)).toFixed(1)+'px '+FONT;g.fillText(hp,x,py+ph*.07);
    // name above (below when there is no room), with a small gold crown for you
    let top=y-r-1.5,crownY=0;
    if(f.label){
      const fs=Math.max(6.2,Math.min(8.6,r*.3)),txt=String(f.label).toUpperCase(),hw=txt.length*fs*.37+2;
      const nx=Math.min(AW-hw,Math.max(hw,x)),above=y-r-fs*.95>fs*.7+(isYou?6:0),ny=above?y-r-fs*.95:py+ph/2+fs*.95;
      g.font='700 '+fs.toFixed(1)+'px '+FONT;g.letterSpacing=(fs*.07).toFixed(2)+'px';
      g.lineJoin='round';g.lineWidth=fs*.34;g.strokeStyle='rgba(0,0,0,.78)';g.strokeText(txt,nx,ny);g.fillStyle=IVORY;g.fillText(txt,nx,ny);
      g.letterSpacing='0px';
      if(above)top=ny-fs*.62;else crownY=ny+fs*.62+3.6;
    }
    if(isYou){
      const cy=crownY||top-3.2,w=4.6;
      g.fillStyle=lin(g,x,cy-3,x,cy+2.4,[0,GOLD_HI,1,GOLD]);g.strokeStyle=EDGE;g.lineWidth=.5;g.lineJoin='round';
      g.beginPath();g.moveTo(x-w,cy+2.2);g.lineTo(x-w,cy-1.8);g.lineTo(x-w*.46,cy+.2);g.lineTo(x,cy-3);g.lineTo(x+w*.46,cy+.2);g.lineTo(x+w,cy-1.8);g.lineTo(x+w,cy+2.2);g.closePath();g.fill();g.stroke();
      g.fillStyle='#b3313f';disc(x,cy+.7,.75);g.fill();
    }
  }
  g.restore();
  g.globalAlpha=1;
}

// ---------- a fighter's picture ----------
// One fighter's picture: its circle and crest only. No weapons, nothing behind it, no name, no health banner. Used on
// the cards, the matchup and the sheet.
// The caller sets the transform (in arena units); the fighter is drawn where it stands in its match.
function drawPortrait(c,match,i){
  g=c;MATCH=match;NOW=match?match.t:0;PX=deviceScale(c);LIVE=false;PORTRAIT=true;
  g.save();resetInk(1);
  try{drawFighter(match.f[i],false)}finally{PORTRAIT=false;g.restore();g.globalAlpha=1}
}
// ---------- the arena ----------
let FLOOR=null,floorTried=false;
// The arena's border since Build 64: a low wall of chiselled stone blocks, WALL_T arena units thick, in place of the
// gold frame with gems. The user, once the scroll and buttons were parchment and stone: "Let's change the border of the
// battlefield to something more matching now". Each block has its own tone, a bevelled edge lit from the top left (the
// same light as the stone buttons), a grained and pitted face, and here and there a chip; dark joints run between them
// and a square block caps each corner. It is made once, as four strips (top, bottom, left, right), dot by dot.
// stoneWall() returns null where there is no canvas to make it on; the old gold frame is drawn there (the tests).
const WALL_T=6;
let WALL=null,wallTried=false;
function stoneWall(t){
  const probe=offscreen(1,1);if(!probe||typeof probe.c.createImageData!=='function')return null;
  const K=5,S=AW+2*t;                                   // K picture pixels to an arena unit; S = the wall's outer size
  const cl=(v,lo,hi)=>v<lo?lo:v>hi?hi:v,ss=(a,b,x)=>{const q=cl((x-a)/(b-a),0,1);return q*q*(3-2*q)};
  const hash=(x,y,s)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
  const noise=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (hash(xi,yi,s)*(1-sx)+hash(xi+1,yi,s)*sx)*(1-sy)+(hash(xi,yi+1,s)*(1-sx)+hash(xi+1,yi+1,s)*sx)*sy};
  const fbm=(x,y,s)=>(noise(x/40,y/40,s)*8+noise(x/20,y/20,s+1)*4+noise(x/10,y/10,s+2)*2+noise(x/5,y/5,s+3))/15;
  // where one block ends and the next begins along each side (arena units from the corner block), unevenly
  const N=9,CUTS=[0,1,2,3].map(side=>{const a=[0];for(let i=1;i<N;i++)a.push((i+(hash(i,side,301)-.5)*.5)*AW/N);a.push(AW);return a});
  // the block a point (arena units) belongs to: [x0,y0,x1,y1,id]
  const blockAt=(x,y)=>{
    const L=x<t,Rt=x>=S-t,T=y<t,B=y>=S-t;
    if((L||Rt)&&(T||B)){const x0=L?0:S-t,y0=T?0:S-t;return[x0,y0,x0+t,y0+t,900+(Rt?1:0)+(B?2:0)]}
    if(T||B){const side=T?0:1,c=CUTS[side];let i=1;while(i<N&&c[i]<x-t)i++;const y0=T?0:S-t;return[t+c[i-1],y0,t+c[i],y0+t,side*100+i]}
    const side=L?2:3,c=CUTS[side];let i=1;while(i<N&&c[i]<y-t)i++;const x0=L?0:S-t;return[x0,t+c[i-1],x0+t,t+c[i],side*100+i];
  };
  // how far inside its block's worn outline a point is (picture pixels; below zero = in the joint)
  const depth=(b,x,y)=>{
    const id=b[4],gap=.14,r=.85,px=Math.min(x-b[0],b[2]-x)-gap,py=Math.min(y-b[1],b[3]-y)-gap;
    let e=px<r&&py<r?r-Math.hypot(r-px,r-py):Math.min(px,py);
    e-=.2*noise(x*.9,y*.9,id);                                                                    // an edge that is not ruler-straight
    if(hash(id,1,310)>.55){                                                                         // a chip out of one edge
      const along=.15+.7*hash(id,2,311),onX=b[2]-b[0]>b[3]-b[1],far=hash(id,3,312)>.5;
      const cx=onX?b[0]+(b[2]-b[0])*along:(far?b[2]:b[0]),cy=onX?(far?b[3]:b[1]):b[1]+(b[3]-b[1])*along,rc=.7+.8*hash(id,4,313);
      e=Math.min(e,Math.hypot(x-cx,y-cy)-rc+.25*noise(x*2,y*2,id+7));
    }
    return e*K;
  };
  const BASE=[96,99,98],JOINT=[12,13,16];
  const strip=(ux,uy,uw,uh)=>{
    const w=Math.round(uw*K),h=Math.round(uh*K),o=offscreen(w,h);if(!o)return null;
    const im=o.c.createImageData(w,h),d=im.data;
    for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){
      const x=ux+(X+.5)/K,y=uy+(Y+.5)/K,b=blockAt(x,y),e=depth(b,x,y),i=(Y*w+X)*4,GX=X+ux*K,GY=Y+uy*K;
      let q=JOINT;
      if(e>0){
        const gx=depth(b,x+1/K,y)-depth(b,x-1/K,y),gy=depth(b,x,y+1/K)-depth(b,x,y-1/K),gl=Math.hypot(gx,gy)||1,lit=(gx*.45+gy*.89)/gl;
        const id=b[4],wide=7.5+2.5*noise(GX/26,GY/26,id+40);
        let k=(.82+.26*hash(id,5,320)+(id>=900?.06:0))*(.76+.48*fbm(GX,GY,id));                  // the block's tone, then its grain
        k+=.08*(noise(GX/1.6,GY/1.6,id+50)-.5);
        const sp=noise(GX/2.2,GY/2.2,id+60);if(sp>.9)k*=1-3*(sp-.9);else if(sp<.07)k*=1.13;         // pits and pale flecks
        k*=1+(1-ss(wide-1.8,wide,e))*.62*lit;                                                      // the chiselled edge
        k*=1-.13*Math.exp(-(((e-wide)/1.7)**2));
        k*=.5+.5*ss(0,2,e);
        q=[BASE[0]*k,BASE[1]*k,BASE[2]*k];
        if(e<1.3){const m=e/1.3;q=[JOINT[0]+(q[0]-JOINT[0])*m,JOINT[1]+(q[1]-JOINT[1])*m,JOINT[2]+(q[2]-JOINT[2])*m]}
      }
      d[i]=q[0];d[i+1]=q[1];d[i+2]=q[2];d[i+3]=255;
    }
    o.c.putImageData(im,0,0);
    return {cv:o.cv,x:ux-t,y:uy-t,w:uw,h:uh};
  };
  const parts=[strip(0,0,S,t),strip(0,S-t,S,t),strip(0,t,t,AW),strip(S-t,t,t,AW)];
  return parts.every(Boolean)?parts:null;
}
// draws the wall around the arena's 0..AW square; hot = sudden death, when its inner edge glows
function drawWall(c,hot){
  const t=WALL_T;
  if(!wallTried){wallTried=true;try{WALL=stoneWall(t)}catch(e){WALL=null}}
  if(!WALL){Orn.frame(c,0,0,AW,AW,t,hot);return}
  c.save();
  for(const p of WALL)c.drawImage(p.cv,p.x,p.y,p.w,p.h);
  c.strokeStyle=EDGE;c.lineWidth=.9;c.strokeRect(-t-.3,-t-.3,AW+2*t+.6,AW+2*t+.6);
  // the wall stands a little above the floor: a thin shadow at its foot (red-hot in sudden death)
  c.strokeStyle=hot?'#ff5a3c':'rgba(0,0,0,.6)';c.lineWidth=hot?1.4:1;c.strokeRect(.5,.5,AW-1,AW-1);
  if(hot){c.strokeStyle='rgba(255,90,60,.28)';c.lineWidth=4;c.strokeRect(2,2,AW-4,AW-4)}
  c.restore();
}
// The arena floor since Build 62: small stone bricks, ten across and twenty down, every other course shifted half a
// brick. Each brick has its own shade of grey (a few are warm, a few blue), a lit edge and a shaded edge, and moss grows
// in the joints where the floor is damp. It is a small picture made dot by dot from a few colours and a noise, then
// enlarged five times with hard edges: the recipe of the "Crypt" look the user liked, laid flat.
// The user's words: the first try (big mossy slabs) "isn't quite what I want. Try something a bit more appealing and
// have it have more bricks like they're smaller so more on screen"; then, of this one, "Do floor A but no diagonal
// crack in them" (so no brick is cracked). Returns null where there is no canvas to make it on, and the plain
// flagstones (Orn.floor) are drawn instead; the tests run that way.
function brickFloor(){
  const N=AW,K=5,a=offscreen(N,N),b=offscreen(N*K,N*K);
  if(!a||!b||typeof a.c.createImageData!=='function')return null;
  const cl=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
  const hash=(x,y,s)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
  const noise=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (hash(xi,yi,s)*(1-sx)+hash(xi+1,yi,s)*sx)*(1-sy)+(hash(xi,yi+1,s)*(1-sx)+hash(xi+1,yi+1,s)*sx)*sy};
  const GREY=[[46,49,52],[58,62,64],[71,75,76],[85,89,88],[101,104,100]],WARM=[[52,47,44],[66,60,55],[80,73,66],[95,87,78],[111,102,90]],COOL=[[40,46,56],[51,58,69],[63,71,83],[76,85,97],[91,100,111]];
  const MOSS=[[38,62,38],[52,84,46],[74,108,56]],JOINT=[19,19,23],PIT=[27,27,31],BW=26,BH=13;
  const im=a.c.createImageData(N,N),d=im.data;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const row=Math.floor(y/BH),ox=row%2?BW/2:0,lx=(x+ox)%BW,ly=y%BH,id=Math.floor((x+ox)/BW)+row*31;
    const tint=hash(id,3,71),pal=tint>.86?WARM:tint<.12?COOL:GREY;
    let k=1+Math.floor(hash(id,5,72)*2.4)+Math.floor((noise(x/6,y/6,3)-.5)*1.8+hash(x,y,5)*.9-.35);     // the brick's own tone, then its grain
    if(lx===1||ly===1)k++;if(lx===BW-1||ly===BH-1)k--;                                                 // lit on two edges, shaded on the other two
    const joint=lx===0||ly===0,near=lx<=1||ly<=1||lx>=BW-1||ly>=BH-1;
    const damp=noise(x/34,y/34,21)*.75+noise(x/7,y/7,22)*.25;
    let q;
    if(damp>.6&&(joint||(near&&hash(x,y,9)>.35)||(damp>.7&&hash(x,y,8)>.62)))q=MOSS[damp>.72?(hash(x,y,3)>.5?2:1):hash(x,y,4)>.5?1:0];
    else if(joint)q=JOINT;
    else if(hash(x,y,31)>.99)q=PIT;
    else q=pal[cl(k,0,4)];
    const i=(y*N+x)*4;d[i]=q[0];d[i+1]=q[1];d[i+2]=q[2];d[i+3]=255;
  }
  a.c.putImageData(im,0,0);
  const c=b.c,S=N*K;c.imageSmoothingEnabled=false;c.drawImage(a.cv,0,0,S,S);
  // a little warm light in the middle, dark towards the walls
  const gr=c.createRadialGradient(S/2,S/2,S*.2,S/2,S/2,S*.74);gr.addColorStop(0,'rgba(255,236,190,.07)');gr.addColorStop(.5,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');
  c.fillStyle=gr;c.fillRect(0,0,S,S);
  return b.cv;
}
function deviceScale(c){
  try{const t=c.getTransform&&c.getTransform();if(t&&t.a)return Math.max(.5,Math.min(8,Math.hypot(t.a,t.b)))}catch(e){}
  return 2;
}
// fx = {floats, sparks, rings, bolts}: the short-lived effects the page keeps (damage numbers, sparks, rings, lightning).
// When fx.live is set this is the arena on screen, and the effects engine (brawl-fx.js) draws its layers too; portraits leave it out.
function drawArena(c,match,you,fx){
  g=c;MATCH=match;NOW=match?match.t:0;PX=deviceScale(c);LIVE=!!(fx&&fx.live&&typeof FX!=='undefined');
  const hot=!!(match&&match.t>SUDDEN&&!match.over);
  g.save();
  resetInk(1);
  if(!floorTried){
    floorTried=true;
    try{FLOOR=brickFloor()}catch(e){FLOOR=null}
    if(!FLOOR){const o=offscreen(AW*5,AW*5);if(o){Orn.floor(o.c,0,0,AW*5,6);FLOOR=o.cv}}
  }
  if(FLOOR)g.drawImage(FLOOR,0,0,AW,AW);else Orn.floor(g,0,0,AW,6);
  if(match){
    // the Painter's stain soaks into the flagstones
    const P=match.paint;
    // (two soft-cornered washes, so it reads as a spreading stain with the stones showing through, not as tiles)
    for(let o=0;o<2;o++){
      let any=false;
      g.beginPath();
      for(let i=0;i<P.length;i++)if(P[i]===o){any=true;const x=(i%GP)*PC,y=((i/GP)|0)*PC;if(g.roundRect)g.roundRect(x-4,y-4,PC+8,PC+8,8);else g.rect(x-4,y-4,PC+8,PC+8)}
      if(!any)continue;
      g.fillStyle=match.f[o].col;g.globalAlpha=.12;g.fill();
      g.beginPath();
      for(let i=0;i<P.length;i++)if(P[i]===o){const x=(i%GP)*PC,y=((i/GP)|0)*PC;if(g.roundRect)g.roundRect(x-1,y-1,PC+2,PC+2,5);else g.rect(x-1,y-1,PC+2,PC+2)}
      g.fillStyle=shade(match.f[o].col,-.12);g.globalAlpha=.3;g.fill();
    }
    g.globalAlpha=1;
  }
  if(hot){
    const p=.75+.25*Math.sin(NOW*5);
    g.fillStyle=rad(g,AW/2,AW/2,AW*.3,AW/2,AW/2,AW*.75,[0,'rgba(170,20,20,0)',1,'rgba(190,24,24,'+(.3*p).toFixed(3)+')']);g.fillRect(0,0,AW,AW);
  }
  if(match){
    // everything in play is cut off at the walls, as if it passed behind the frame
    g.save();g.beginPath();g.rect(0,0,AW,AW);g.clip();
    if(LIVE){FX.floor(g,match);resetInk(1)}
    for(const f of match.f){const L=LOOKS[f.key];if(L&&L.under&&f.hp>0){L.under(f,match);resetInk(1)}}
    for(const q of match.minions)drawMinion(q,match.t);
    drawFighter(match.f[0],you===0);drawFighter(match.f[1],you===1);
    resetInk(1);
    // shots: a hot ball with a short streak
    for(const q of match.bullets){
      const col=match.f[q.own]?match.f[q.own].col:'#ffcf7a',big=q.heavy?1.35:1;
      g.strokeStyle=col;g.globalAlpha=.6;g.lineWidth=2.2*big;g.beginPath();g.moveTo(q.x-q.vx*.04,q.y-q.vy*.04);g.lineTo(q.x,q.y);g.stroke();
      g.strokeStyle='#fff1c9';g.globalAlpha=.7;g.lineWidth=.9*big;g.beginPath();g.moveTo(q.x-q.vx*.026,q.y-q.vy*.026);g.lineTo(q.x,q.y);g.stroke();
      if(LIVE)FX.glow(g,q.x,q.y,10*big,col,.85);else{g.globalAlpha=.35;g.fillStyle='#ffb347';disc(q.x,q.y,5.2);g.fill()}
      g.globalAlpha=1;g.fillStyle='#fff1c9';g.strokeStyle=EDGE;g.lineWidth=.45;disc(q.x,q.y,2.8*big);g.fill();g.stroke();
    }
    for(const r of fx.rings){
      const q=1-r.life/r.max,rr=Math.max(1,r.r0+(r.r1-r.r0)*q);
      g.globalAlpha=(1-q)*.9;g.strokeStyle=r.col;g.lineWidth=r.w*.8;disc(r.x,r.y,rr);g.stroke();
      g.globalAlpha=(1-q)*.4;g.strokeStyle='#ffffff';g.lineWidth=Math.max(.4,r.w*.25);disc(r.x,r.y,rr);g.stroke();
    }
    g.globalAlpha=1;
    if(fx.bolts.length){
      g.lineJoin='round';g.lineCap='round';
      g.shadowColor='#55d8ff';g.shadowBlur=6*PX;g.strokeStyle='rgba(120,225,255,.75)';g.lineWidth=2.6;g.beginPath();
      for(const b of fx.bolts){g.moveTo(b.pts[0][0],b.pts[0][1]);for(let k=1;k<b.pts.length;k++)g.lineTo(b.pts[k][0],b.pts[k][1])}
      g.stroke();
      g.shadowBlur=0;g.shadowColor='transparent';g.strokeStyle='#f4feff';g.lineWidth=1;g.stroke();
    }
    // sparks fly as embers
    for(const p of fx.sparks){
      const a=Math.min(1,p.life/.15);
      g.globalAlpha=a*.4;g.fillStyle=p.col||'#ff9a3a';disc(p.x,p.y,2.6);g.fill();
      g.globalAlpha=a;g.fillStyle=p.col?shade(p.col,.45):'#ffe2a0';disc(p.x,p.y,1.2);g.fill();
    }
    g.globalAlpha=1;
    // a class can draw over both fighters (a mark it leaves on its rival, say) with a top(f,match) in its LOOKS entry
    for(const f of match.f){const L=LOOKS[f.key];if(L&&L.top&&f.hp>0){L.top(f,match);resetInk(1)}}
    if(LIVE){FX.top(g,match);resetInk(1);FX.screenFlash(g,AW);resetInk(1)}
    g.restore();
  }
  drawWall(g,hot);
  if(match){
    // numbers and shouts float above everything: pale gold for a hit, hotter and larger for a critical one
    g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    for(const fl of fx.floats){
      const t=String(fl.txt),c0=t.charCodeAt(0),hit=c0===45||c0===8722,heal=c0===43;
      const age=(fl.max||.8)-fl.life,pop=1+.75*Math.max(0,1-age/.13);       // they land big and settle
      const size=(hit?(fl.big?19:14):heal?12:fl.big?13:11)*pop;
      g.font=(hit?'900 ':'700 ')+size+'px '+FONT;
      g.globalAlpha=Math.min(1,fl.life/.3);
      const hw=Math.max(size*1.2,t.length*size*.36+2),fx0=Math.min(AW-hw,Math.max(hw,fl.x)),fy=Math.max(size*.7,Math.min(AW-size*.6,fl.y));
      g.lineWidth=size*.24;g.strokeStyle=hit&&fl.big?'rgba(60,8,0,.88)':'rgba(0,0,0,.82)';g.strokeText(t,fx0,fy);
      g.fillStyle=hit?(fl.big?'#ffb04a':'#ffe2a0'):heal?'#b5ecae':fl.col||IVORY;g.fillText(t,fx0,fy);
    }
    g.globalAlpha=1;
  }
  g.restore();
  g.globalAlpha=1;
}
