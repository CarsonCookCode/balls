// Ball Brawl drawing. Everything here draws in arena units (0..AW on both axes); the caller sets the transform.
// One entry point: drawArena(ctx, match, you, fx). It is used by the page canvas and by the video recorder alike.
// Per-class art lives in LOOKS[key] = { under(f, m), body(f) }: `under` is what the class leaves on the floor,
// `body` is drawn on top of the fighter's disc. Both draw with `g`, the context set by drawArena.
const TAU=6.2832;
let g=null;
const disc=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,TAU)};
Object.assign(LOOKS,{
  miner:{under(f){
    for(const q of f.s.mines){g.fillStyle=q.age>.5?f.col:'#5a5f8a';disc(q.x,q.y,7);g.fill();g.fillStyle='#10122a';disc(q.x,q.y,3);g.fill()}
  }},
  comet:{
    under(f,m){
      const T=f.s.trail,life=f.s.life||2.2;
      for(let k=0;k<T.length;k++){
        const p=T[k],age=(m.t-p.t)/life;
        g.globalAlpha=(1-age)*.75;g.fillStyle=age<.35?'#ffe08a':age<.7?f.col:'#d8452c';
        disc(p.x,p.y,3+7*(1-age));g.fill();
      }
      g.globalAlpha=1;
    },
    body(f){g.fillStyle='#fff3c4';disc(f.x,f.y,f.r*.45);g.fill()}},
  bramble:{under(f,m){
    for(const t of f.s.thorns){
      const grow=Math.min(1,(m.t-t.born)/.25),tx=t.x+(t.tx-t.x)*grow,ty=t.y+(t.ty-t.y)*grow,px=(t.ty-t.y),py=-(t.tx-t.x),pl=Math.hypot(px,py)||1,w=8;
      g.fillStyle=t.cd>0?'#a8e6ad':f.col;g.beginPath();
      g.moveTo(t.x+px/pl*w,t.y+py/pl*w);g.lineTo(tx,ty);g.lineTo(t.x-px/pl*w,t.y-py/pl*w);g.fill();
    }
  }},
  bees:{body(f){
    g.strokeStyle='#3a2c00';g.lineWidth=f.r*.22;g.beginPath();
    g.moveTo(f.x-f.r*.5,f.y-f.r*.82);g.lineTo(f.x-f.r*.5,f.y+f.r*.82);g.moveTo(f.x+f.r*.5,f.y-f.r*.82);g.lineTo(f.x+f.r*.5,f.y+f.r*.82);g.stroke();
  }},
  ghost:{body(f){
    g.fillStyle='#10122a';disc(f.x-f.r*.35,f.y-f.r*.45,f.r*.14);g.fill();disc(f.x+f.r*.35,f.y-f.r*.45,f.r*.14);g.fill();
    if(f.s.dash>0){g.strokeStyle=f.col;g.globalAlpha=.5;g.lineWidth=f.r*1.2;g.lineCap='round';g.beginPath();g.moveTo(f.x,f.y);g.lineTo(f.x-f.vx*.09,f.y-f.vy*.09);g.stroke();g.globalAlpha=1}
  }},
  snow:{body(f){
    g.fillStyle='#ffffff';disc(f.x-f.r*.3,f.y-f.r*.35,f.r*.3);g.fill();
    g.strokeStyle='#9cc9e6';g.lineWidth=2;disc(f.x,f.y,f.r-1);g.stroke();
  }},
  tesla:{
    under(f){if(f.s.range){g.strokeStyle=f.col;g.globalAlpha=.22;g.lineWidth=1.5;g.setLineDash([3,6]);disc(f.x,f.y,f.s.range);g.stroke();g.setLineDash([]);g.globalAlpha=1}},
    body(f){g.strokeStyle='#ffffff';g.lineWidth=2;disc(f.x,f.y,f.r*.6);g.stroke()}},
  magnet:{
    under(f){
      if(f.s.pull>0){
        const q=f.s.pull/1.1;
        g.strokeStyle=f.col;g.lineWidth=2;
        for(let k=0;k<3;k++){const rr=20+((q+k/3)%1)*80;g.globalAlpha=.5*(1-(rr-20)/80);disc(f.x,f.y,rr);g.stroke()}
        g.globalAlpha=1;
      }
    },
    body(f){
      g.fillStyle='#f4f6ff';g.beginPath();g.arc(f.x,f.y,f.r,-.9,.9);g.lineTo(f.x,f.y);g.fill();
      g.beginPath();g.arc(f.x,f.y,f.r,Math.PI-.9,Math.PI+.9);g.lineTo(f.x,f.y);g.fill();
    }},
  mirror:{body(f){
    g.strokeStyle='#ffffff';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(f.x-f.r*.5,f.y+f.r*.1);g.lineTo(f.x+f.r*.1,f.y-f.r*.5);g.stroke();
  }},
  spider:{
    under(f){
      g.strokeStyle='#e9e4ff';g.lineWidth=1.5;g.globalAlpha=.75;g.beginPath();
      for(const w of f.s.webs){g.moveTo(w.x1,w.y1);g.lineTo(w.x2,w.y2)}
      g.stroke();g.globalAlpha=1;
      g.fillStyle='#e9e4ff';for(const w of f.s.webs){disc(w.x1,w.y1,3);g.fill();disc(w.x2,w.y2,3);g.fill()}
    },
    body(f){
      g.strokeStyle=f.col;g.lineWidth=2.5;g.lineCap='round';g.beginPath();
      for(let k=0;k<8;k++){const a=k/8*TAU+.4;g.moveTo(f.x+Math.cos(a)*f.r,f.y+Math.sin(a)*f.r);g.lineTo(f.x+Math.cos(a)*(f.r+7),f.y+Math.sin(a)*(f.r+7))}
      g.stroke();
    }},
  painter:{body(f){g.fillStyle='#ffffff';disc(f.x,f.y,f.r*.38);g.fill();g.fillStyle=f.col;disc(f.x,f.y,f.r*.2);g.fill()}},
  clock:{body(f){
    g.strokeStyle='#10122a';g.lineWidth=1.5;g.beginPath();
    for(let k=0;k<12;k++){const a=k/12*TAU;g.moveTo(f.x+Math.cos(a)*f.r*.82,f.y+Math.sin(a)*f.r*.82);g.lineTo(f.x+Math.cos(a)*f.r*.96,f.y+Math.sin(a)*f.r*.96)}
    g.stroke();
  }},
});
function drawMinion(q,t){
  if(q.kind==='bee'){
    g.fillStyle='#ffffff';g.globalAlpha=.7;const fl=Math.sin(t*40+q.x)>0?5:3;disc(q.x-3,q.y-4,fl*.6);g.fill();disc(q.x+3,q.y-4,fl*.6);g.fill();g.globalAlpha=1;
    g.fillStyle=q.col;disc(q.x,q.y,q.r);g.fill();
    g.fillStyle='#3a2c00';g.fillRect(q.x-1,q.y-q.r,2,q.r*2);
  }else if(q.kind==='copy'){
    g.globalAlpha=.65;g.fillStyle=q.col;disc(q.x,q.y,q.r);g.fill();g.globalAlpha=1;
    g.strokeStyle='#ffffff';g.lineWidth=1.5;disc(q.x,q.y,q.r);g.stroke();
  }else{
    g.fillStyle='#eef0e4';disc(q.x,q.y,q.r);g.fill();
    g.fillStyle='#10122a';disc(q.x-3.5,q.y-2,2.2);g.fill();disc(q.x+3.5,q.y-2,2.2);g.fill();
    g.strokeStyle=q.col;g.lineWidth=1.5;disc(q.x,q.y,q.r);g.stroke();
  }
}
function drawFighter(f,isYou){
  const D=FIGHTERS[f.key],L=LOOKS[f.key],body=f.col||D.color;
  if(f.hp<=0)return;
  if(f.gone)g.globalAlpha=.16;
  g.lineCap='round';
  for(const A of f.arms){
    const an=f.ang*A.rate+A.a,c=Math.cos(an),s=Math.sin(an),x1=f.x+c*(f.r-2),y1=f.y+s*(f.r-2),x2=f.x+c*(f.r+A.l),y2=f.y+s*(f.r+A.l);
    if(A.head){
      g.strokeStyle='#8b90b5';g.lineWidth=3;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      g.fillStyle='#c9cfe6';disc(x2,y2,A.head);g.fill();
      g.strokeStyle='#6d7299';g.lineWidth=2;g.stroke();
    }else{
      let col=A.extra?'#b9c2ee':'#e4e9ff',w=A.extra?4:5;
      if(f.key==='leech'&&!A.extra)col='#e7c4ff';
      if(f.key==='clock'&&!A.extra){col='#2a2412';w=A.rate<1?6:4}
      if(f.key==='necro'&&!A.extra){col='#3d5a4c';w=4}
      if(D.rage&&!A.extra){const q=1-Math.max(0,f.hp)/f.max;col=`rgb(${228+27*q|0},${233-150*q|0},${255-175*q|0})`}
      if(f.poison)col='#b6f08a';
      g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      if(f.key==='necro'&&!A.extra){g.fillStyle=body;disc(x2,y2,5);g.fill()}
    }
  }
  if(f.key==='spikes'){
    g.fillStyle=body;g.beginPath();
    for(let i=0;i<12;i++){const a=i/12*TAU+f.ang,w=.2;
      g.moveTo(f.x+Math.cos(a-w)*f.r,f.y+Math.sin(a-w)*f.r);g.lineTo(f.x+Math.cos(a)*(f.r+8),f.y+Math.sin(a)*(f.r+8));g.lineTo(f.x+Math.cos(a+w)*f.r,f.y+Math.sin(a+w)*f.r)}
    g.fill();
  }
  if(f.key==='blaster'||f.side){
    g.strokeStyle='#cfe9ff';g.lineWidth=f.key==='blaster'?8:5;g.lineCap='butt';g.beginPath();
    g.moveTo(f.x+Math.cos(f.aim)*(f.r-4),f.y+Math.sin(f.aim)*(f.r-4));g.lineTo(f.x+Math.cos(f.aim)*(f.r+9),f.y+Math.sin(f.aim)*(f.r+9));g.stroke();
  }
  g.fillStyle=f.flash>0?'#ffffff':body;disc(f.x,f.y,f.r);g.fill();
  if(L&&L.body&&f.flash<=0)L.body(f);
  // status: poisoned, slowed, frozen, shield ready, and which one is you
  if(f.poisonT>0){g.strokeStyle='#8be05a';g.lineWidth=3;disc(f.x,f.y,f.r-1.5);g.stroke()}
  if(f.slowT>0){g.strokeStyle='#9fe0ff';g.lineWidth=3;g.setLineDash([4,4]);disc(f.x,f.y,f.r+2);g.stroke();g.setLineDash([])}
  if(f.stunT>0){g.fillStyle='#bfeaff';g.globalAlpha=.55;disc(f.x,f.y,f.r+3);g.fill();g.globalAlpha=1;g.strokeStyle='#ffffff';g.lineWidth=2;disc(f.x,f.y,f.r+3);g.stroke()}
  if(f.shield&&f.shieldT<=0){g.strokeStyle='#bcd4ff';g.lineWidth=2;g.globalAlpha=.8;disc(f.x,f.y,f.r+6);g.stroke();g.globalAlpha=f.gone?.16:1}
  if(isYou){g.strokeStyle='#ffd447';g.lineWidth=2.5;disc(f.x,f.y,f.r+3.5);g.stroke()}
  if(!f.gone){
    g.fillStyle='#10122a';g.font='700 '+Math.max(11,Math.min(17,f.r*.72|0))+'px Fredoka, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText(String(Math.max(0,Math.ceil(f.hp))),f.x,f.y+1);
    if(f.label){g.fillStyle='#efedff';g.globalAlpha=.85;g.font='600 11px Fredoka, system-ui, sans-serif';g.fillText(f.label,Math.min(AW-30,Math.max(30,f.x)),Math.max(8,f.y-f.r-11))}
  }
  g.globalAlpha=1;
}
// fx = {floats, sparks, rings, bolts}: the short-lived effects the page keeps (damage numbers, sparks, rings, lightning).
function drawArena(c,match,you,fx){
  g=c;
  g.fillStyle='#141736';g.beginPath();if(g.roundRect)g.roundRect(-4,-4,AW+8,AW+8,10);else g.rect(-4,-4,AW+8,AW+8);g.fill();
  g.strokeStyle=match&&match.t>SUDDEN&&!match.over?'#ff5a4f':'#2c3068';g.lineWidth=2;g.stroke();
  if(!match)return;
  const P=match.paint;
  for(let c2=0;c2<P.length;c2++){
    if(P[c2]<0)continue;
    g.fillStyle=match.f[P[c2]].col;g.globalAlpha=.4;g.fillRect((c2%GP)*PC+1,((c2/GP)|0)*PC+1,PC-2,PC-2);
  }
  g.globalAlpha=1;
  for(const f of match.f){const L=LOOKS[f.key];if(L&&L.under&&f.hp>0)L.under(f,match)}
  for(const q of match.minions)drawMinion(q,match.t);
  drawFighter(match.f[0],you===0);drawFighter(match.f[1],you===1);
  g.fillStyle='#e9f6ff';g.beginPath();
  for(const q of match.bullets){g.moveTo(q.x+4,q.y);g.arc(q.x,q.y,4,0,TAU)}
  g.fill();
  for(const r of fx.rings){
    const q=1-r.life/r.max;g.globalAlpha=(1-q)*.85;g.strokeStyle=r.col;g.lineWidth=r.w;disc(r.x,r.y,Math.max(1,r.r0+(r.r1-r.r0)*q));g.stroke();
  }
  g.globalAlpha=1;
  if(fx.bolts.length){
    g.strokeStyle='#eafcff';g.lineWidth=2.5;g.lineJoin='round';g.beginPath();
    for(const b of fx.bolts){g.moveTo(b.pts[0][0],b.pts[0][1]);for(let k=1;k<b.pts.length;k++)g.lineTo(b.pts[k][0],b.pts[k][1])}
    g.stroke();
  }
  for(const p of fx.sparks){g.fillStyle=p.col||'#fff4c2';g.globalAlpha=Math.min(1,p.life/.15);disc(p.x,p.y,2);g.fill()}
  g.globalAlpha=1;
  g.textAlign='center';g.textBaseline='middle';
  for(const fl of fx.floats){g.font='700 '+(fl.big?22:17)+'px Fredoka, system-ui, sans-serif';g.globalAlpha=Math.min(1,fl.life/.3);g.fillStyle=fl.col;g.fillText(fl.txt,Math.min(AW-24,Math.max(24,fl.x)),Math.max(10,fl.y))}
  g.globalAlpha=1;
}
