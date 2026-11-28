// The fighter as an object in the arena (Build 69): a ball of painted stone, and a real-looking weapon set into its side.
// This file only changes what is drawn. It is not one of the rule files, so changing it never resets the ladder.
//
// Why it looks like this. The user asked for fighters "like spheres", "primarily their unique color", "very clearly
// presented", that "look really good on our background". Smooth, glossy and glowing balls were rejected: "they look
// like blurry and unrealistic when placed on our battlefield", and tacky. What was chosen ("Painted stone is the best
// for now") is a ball made of the arena's own stuff: one hard lamp from the top left (the same lamp as the wall and the
// buttons), a surface with grain, pits and a few chips, the emblem painted on in ivory, NO outline ("Remove the border
// on them they should look actually there"), tied to the floor by the shadow it throws and the dark where it meets the
// bricks. Do not add gloss, glow, rim light, soft gradients or an outline to a fighter.
// Since Build 73 the ball rolls: its stone surface slides by as the fighter moves while the emblem and the light stay
// where they are ("Make the balls roll in the direction and at the speed which they are moving, with the icon staying
// fixed in place"). See "the ball, in layers" below.
//
// Weapons. Treated icon shapes were rejected ("I want them to look like actual weapons"), photo-scanned models lost to
// chunky game models ("Game ready models are better"), and the user set how they are carried: no hand ("they shouldn't
// be in a fist"); the weapon "should like come out from the side being connected at like the midpoint from the bottom of
// the ball (like the part that would be on the floor) to the top". Seen from above, the ball's middle is its rim: so the
// weapon is drawn after the ball, cut off where it enters it, shaded where it joins, with its own shadow thrown on the
// floor (never on the ball) because it is carried at mid-height, not lying on the bricks.
//
// The weapon pictures are in art/weapons/. Each is ONE picture: the weapon lying along x with the grip at the left, lit
// from almost straight above, and the game turns it. (Build 69 had 8 frames a weapon, each lit for one held direction,
// so the lamp stayed top left as it spun; in motion that made the weapon change at certain angles, and the user asked:
// "Remove the effect that happens on weapons when it's moving in a certain direction". Do not bring per-direction
// lighting back.) They were rendered from free 3D models, all CC0 (no credit required; credited anyway in
// credits.html): KayKit Adventurers by Kay Lousberg (sword2, sword1, axe2), and from poly.pizza: Quaternius (bat, dagger,
// knife, scythe, cutlass, tentacle, spear, crystal, hammer, rifle) and CreativeTrio (wrench). The game does not run 3D.
// A weapon is drawn at the rules' true reach (the arm's length): the pictures were made for that, not for a longer look.
// If a picture changes, raise WV: it is part of the file name, so no phone goes on showing the old one.
// Fighters whose arm has no picture here (the Clockmaker's hands, the Crab's pincers, the Yo-yo, the Jester's juggled
// balls) keep their arm as drawn in code, until they get art of their own.
//
// Where there is no real canvas (the tests), ART.ok is false and brawl-looks.js draws the fighter the old way.
const ART=(function(){
  const off={ok:false};
  if(typeof document==='undefined')return off;
  const mk=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv};
  try{
    const c=mk(2,2).getContext('2d'),im=c.createImageData(2,2);im.data[3]=255;c.putImageData(im,0,0);
    if(c.getImageData(0,0,1,1).data[3]!==255||typeof Path2D==='undefined'||typeof Image==='undefined')return off;
  }catch(e){return off}
  const TAU=6.2832,SS=2,PAD=.03,WV='v2';
  const cl=(v,a,b)=>v<a?a:v>b?b:v,ss=(a,b,x)=>{const q=cl((x-a)/(b-a),0,1);return q*q*(3-2*q)},mix=(a,b,t)=>a+(b-a)*t;
  const hash=(x,y,s)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,982451653))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
  const vn=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (hash(xi,yi,s)*(1-sx)+hash(xi+1,yi,s)*sx)*(1-sy)+(hash(xi,yi+1,s)*(1-sx)+hash(xi+1,yi+1,s)*sx)*sy};
  const lin=v=>Math.pow(v,2.2),L3=c=>[lin(c[0]),lin(c[1]),lin(c[2])];
  const hex=h=>{const n=parseInt(String(h).slice(1),16)||0;return[(n>>16)/255,((n>>8)&255)/255,(n&255)/255]};
  function hsv(c){const mx=Math.max(c[0],c[1],c[2]),mn=Math.min(c[0],c[1],c[2]),d=mx-mn;let h=0;
    if(d>1e-5){if(mx===c[0])h=((c[1]-c[2])/d+6)%6;else if(mx===c[1])h=(c[2]-c[0])/d+2;else h=(c[0]-c[1])/d+4}
    return[h*60,mx?d/mx:0,mx]}
  function rgb(h,s,v){h=((h%360)+360)%360/60;const i=Math.floor(h),f=h-i,p=v*(1-s),q=v*(1-s*f),t=v*(1-s*(1-f));
    return[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6]}
  const toward=(h,to,deg)=>{const d=((to-h+540)%360)-180;return h+cl(d,-deg,deg)};
  // exact distance transform (Felzenszwalb and Huttenlocher), squared distances
  function edt(f,S){
    const INF=1e20,d=new Float64Array(S*S),v=new Int32Array(S),z=new Float64Array(S+1),a=new Float64Array(S),o=new Float64Array(S);
    const one=()=>{let k=0;v[0]=0;z[0]=-INF;z[1]=INF;
      for(let q=1;q<S;q++){let s=((a[q]+q*q)-(a[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);while(s<=z[k]){k--;s=((a[q]+q*q)-(a[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}k++;v[k]=q;z[k]=s;z[k+1]=INF}
      k=0;for(let q=0;q<S;q++){while(z[k+1]<q)k++;const p=v[k];o[q]=(q-p)*(q-p)+a[p]}};
    for(let x=0;x<S;x++){for(let y=0;y<S;y++)a[y]=f[y*S+x];one();for(let y=0;y<S;y++)d[y*S+x]=o[y]}
    for(let y=0;y<S;y++){for(let x=0;x<S;x++)a[x]=d[y*S+x];one();for(let x=0;x<S;x++)d[y*S+x]=o[x]}
    return d;
  }
  // the lamp: top left, as for the wall, the buttons and the weapon pictures
  const KL=Math.hypot(.5,.6,.62),K=[-.5/KL,-.6/KL,.62/KL],KH=Math.hypot(K[0],K[1]),KDX=K[0]/KH,KDY=K[1]/KH;
  const HL=Math.hypot(K[0],K[1],K[2]+1),HV=[K[0]/HL,K[1]/HL,(K[2]+1)/HL];

  // ---- the ball, in layers, so that it can roll (Build 73). The user: "Make the balls roll in the direction and at the
  //      speed which they are moving, with the icon staying fixed in place." A ball is put together from:
  //        the skin   a square of painted stone that repeats: its colour, grain, pits and chips. It slides under the
  //                   ball by exactly the distance the ball travels, which is what the top of a rolling ball does.
  //        the light  the lamp's light and shade on a sphere, and the darkening towards its edge. It never moves.
  //        the mark   the emblem, white, with its dark line. It never moves either.
  //      The grain's own light and shade are part of the skin; sliding (not turning) the skin keeps them facing the
  //      lamp. The relief is worked out once and shared; a colour only tints it, so a new colour costs almost nothing. ----
  const T=256,RB=224/2/(1+PAD);                       // the skin's size, and a ball's radius in a 224-pixel picture
  const pn=(x,y,n,s)=>{                                // noise that repeats across the skin: n cells from edge to edge
    const u=x/T*n,v=y/T*n,xi=Math.floor(u),yi=Math.floor(v),fx=u-xi,fy=v-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),w=i=>((i%n)+n)%n;
    return (hash(w(xi),w(yi),s)*(1-sx)+hash(w(xi+1),w(yi),s)*sx)*(1-sy)+(hash(w(xi),w(yi+1),s)*(1-sx)+hash(w(xi+1),w(yi+1),s)*sx)*sy};
  let relief=null;
  function reliefMap(){
    if(relief)return relief;
    const G=new Float32Array(T*T),C=new Float32Array(T*T),hgt=(x,y)=>.55*pn(x,y,138,1)+.9*pn(x,y,47,2)+1.2*pn(x,y,17,3);
    for(let y=0;y<T;y++)for(let x=0;x<T;x++){
      const i=y*T+x,pit=ss(.9,.95,pn(x,y,112,4)),chipN=pn(x,y,30,5)*.75+pn(x,y,78,6)*.25,chip=ss(.86,.885,chipN),edge=ss(.83,.86,chipN)*(1-chip);
      const emb=1+1.05*(hgt(x+1,y+1)-hgt(x-1,y-1));       // a slope that faces the lamp (top left) is lighter
      G[i]=(1+.2*(pn(x,y,26,7)-.5)+.13*(pn(x,y,98,8)-.5))*(hash(x,y,9)>.988?1.3:1)*(1-.5*pit)*(1-.3*edge)*emb;C[i]=chip;
    }
    return relief={G,C};
  }
  const skins=new Map();
  function skin(col){
    let cv=skins.get(col);if(cv)return cv;
    const M=reliefMap(),base=hex(col),H=hsv(base),P=L3(rgb(H[0],H[1]*.9,H[2]*.96)),ST=.17;
    const im=(cv=mk(T,T)).getContext('2d').createImageData(T,T),d=im.data;
    for(let i=0;i<T*T;i++){
      const g=M.G[i],c=M.C[i],j=i*4;
      d[j]=255*Math.pow(cl(mix(P[0],ST,c)*g,0,1),1/2.2);d[j+1]=255*Math.pow(cl(mix(P[1],ST,c)*g,0,1),1/2.2);d[j+2]=255*Math.pow(cl(mix(P[2],ST*.97,c)*g,0,1),1/2.2);d[j+3]=255;
    }
    cv.getContext('2d').putImageData(im,0,0);
    if(skins.size>60)skins.delete(skins.keys().next().value);
    skins.set(col,cv);return cv;
  }
  // the light on a ball of a given picture size: where it is (mask), how dark each part is (shade, laid on by
  // multiplying), where it is lighter than its paint (high), and the numbers the emblem needs
  const lights={};
  function light(F){
    if(lights[F])return lights[F];
    const S=F*SS,n=S*S,R=S/2/(1+PAD),cx=S/2,cy=S/2,lift=R*.045,N=SS*SS;
    const L={S,R,A:new Float32Array(n),EX:new Float32Array(n),EY:new Float32Array(n),LR:new Float32Array(n),LG:new Float32Array(n),LB:new Float32Array(n)};
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const dx=x+.5-cx,dy=y+.5-cy,rho=Math.hypot(dx,dy),e=R-rho;if(e<=-1)continue;
      const i=y*S+x,q=Math.min(1,rho/R),nz=Math.sqrt(Math.max(0,1-q*q)),nx=dx/R*(q<1?1:R/rho),ny=dy/R*(q<1?1:R/rho);
      const th=Math.asin(q),sc=q>1e-4?th/q*.9:.9;                           // the emblem follows the curve of the ball
      L.A[i]=ss(-.6,.6,e);L.EX[i]=cx+dx*sc-.5;L.EY[i]=cy+(dy+lift)*sc-.5;
      // one hard lamp, a dim cool room, the floor's own light on the edge nearest it; darker towards the edge
      const nl=Math.max(0,nx*K[0]+ny*K[1]+nz*K[2]),dif=nl*1.12,ao=mix(.42,1,ss(0,.4,nz)),up=.5+.5*nz,fl=Math.pow(1-nz,2)*.1;
      const sp=Math.pow(Math.max(0,nx*HV[0]+ny*HV[1]+nz*HV[2]),22)*.05*ao;
      L.LR[i]=(.2*up+.05+dif*1.06)*ao+fl*.9+sp;L.LG[i]=(.22*up+.055+dif)*ao+fl+sp;L.LB[i]=(.27*up+.05+dif*.9)*ao+fl*.85+sp;
    }
    const mask=mk(F,F),shade=mk(F,F),high=mk(F,F),mc=mask.getContext('2d'),sc2=shade.getContext('2d'),hc=high.getContext('2d');
    const mi=mc.createImageData(F,F),si=sc2.createImageData(F,F),hi=hc.createImageData(F,F),g=v=>Math.pow(v,1/2.2);
    for(let y=0;y<F;y++)for(let x=0;x<F;x++){
      let a=0,r=0,gg=0,b=0,h=0;
      for(let k=0;k<N;k++){const i=(y*SS+(k/SS|0))*S+x*SS+(k%SS),al=L.A[i];if(al<=0)continue;const fr=g(L.LR[i]),fg=g(L.LG[i]),fb=g(L.LB[i]);
        a+=al;r+=Math.min(1,fr)*al;gg+=Math.min(1,fg)*al;b+=Math.min(1,fb)*al;h+=Math.max(0,fg-1)*al}
      if(a<=0)continue;const j=(y*F+x)*4;
      mi.data[j]=mi.data[j+1]=mi.data[j+2]=255;mi.data[j+3]=a/N*255;
      si.data[j]=255*r/a;si.data[j+1]=255*gg/a;si.data[j+2]=255*b/a;si.data[j+3]=255;
      hi.data[j]=255;hi.data[j+1]=250;hi.data[j+2]=236;hi.data[j+3]=255*cl(h/a*1.25,0,.4);
    }
    mc.putImageData(mi,0,0);sc2.putImageData(si,0,0);hc.putImageData(hi,0,0);
    L.mask=mask;L.shade=shade;L.high=high;
    return lights[F]=L;
  }
  // the emblem, flat, as a distance field: + inside its ink, - outside, in pixels
  const paths={};
  function emblem(key,S,R){
    const E=typeof EMBLEMS!=='undefined'?EMBLEMS[key]:null,n=S*S,sd=new Float32Array(n);
    if(!E){sd.fill(-1e3);return sd}
    const cv=mk(S,S),c=cv.getContext('2d'),p=paths[key]||(paths[key]=new Path2D(E.d)),k=(E.k||1)*1.5/512;
    c.translate(S/2,S/2);c.scale(R*.8,R*.8);c.translate(E.x||0,E.y||0);c.scale(k,k);c.translate(-256,-256);c.fillStyle='#fff';c.fill(p);
    const d=c.getImageData(0,0,S,S).data,fi=new Float64Array(n),fo=new Float64Array(n);
    for(let i=0;i<n;i++){const a=d[i*4+3]>127;fi[i]=a?1e20:0;fo[i]=a?0:1e20}
    const di=edt(fi,S),dq=edt(fo,S);
    for(let i=0;i<n;i++)sd[i]=di[i]>0?Math.sqrt(di[i])-.5:-(Math.sqrt(dq[i])-.5);
    return sd;
  }
  // The emblem as a picture to lay over the ball. It is white on every fighter, and solid: the user, of an earlier
  // grainy ivory that took the ball's shading and was dark on pale fighters: "Make the icons less washed out and all
  // should be white not black". Near-white paint that keeps half its brightness where the ball is in shade, with a dark
  // line round it; on a pale ball (the Snowball, the Ghost) the line is heavier and there is a soft dark surround.
  const marks=new Map();
  function mark(key,F,pale){
    const id=key+'|'+F+'|'+(pale?1:0);let cv=marks.get(id);if(cv)return cv;
    const L=light(F),S=L.S,R=L.R,sd=emblem(key,S,R),IV=L3([.985,.975,.94]),ow=R*(pale?.03:.022),hw=R*.09,N=SS*SS;
    const bil=(x,y)=>{x=cl(x,0,S-1.001);y=cl(y,0,S-1.001);const xi=x|0,yi=y|0,fx=x-xi,fy=y-yi,o=yi*S+xi;return (sd[o]*(1-fx)+sd[o+1]*fx)*(1-fy)+(sd[o+S]*(1-fx)+sd[o+S+1]*fx)*fy};
    const im=(cv=mk(F,F)).getContext('2d').createImageData(F,F),dd=im.data;
    for(let y=0;y<F;y++)for(let x=0;x<F;x++){
      let r=0,g=0,b=0,a=0;
      for(let k=0;k<N;k++){
        const i=(y*SS+(k/SS|0))*S+x*SS+(k%SS);if(L.A[i]<=0)continue;
        const d=bil(L.EX[i],L.EY[i]),m=ss(-.6,.6,d);
        const dark=1-(1-(ss(-ow-.6,-ow+.6,d)-m)*(pale?.92:.85))*(pale?1-.34*ss(-hw,0,d)*(1-m):1);     // how much the line and surround darken the ball
        const al=m+(1-m)*dark;if(al<=0)continue;
        r+=IV[0]*mix(L.LR[i],1.02,.5)*m;g+=IV[1]*mix(L.LG[i],1.02,.5)*m;b+=IV[2]*mix(L.LB[i],1.02,.5)*m;a+=al;
      }
      if(a<=0)continue;const j=(y*F+x)*4;
      dd[j]=255*cl(Math.pow(r/a,1/2.2),0,1);dd[j+1]=255*cl(Math.pow(g/a,1/2.2),0,1);dd[j+2]=255*cl(Math.pow(b/a,1/2.2),0,1);dd[j+3]=a/N*255;
    }
    cv.getContext('2d').putImageData(im,0,0);
    if(marks.size>260)marks.delete(marks.keys().next().value);
    marks.set(id,cv);return cv;
  }
  // puts a ball together on a canvas of F pixels: tx, ty = how far its skin has slid, in skin pixels
  function paint(cv,key,col,F,tx,ty){
    const c=cv.getContext('2d'),L=light(F),k=F/224,b=hex(col),pale=.3*lin(b[0])+.59*lin(b[1])+.11*lin(b[2])>.5;
    tx=((tx%T)+T)%T;ty=((ty%T)+T)%T;
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,F,F);
    c.save();c.scale(k,k);c.translate(tx,ty);c.fillStyle=c.createPattern(skin(col),'repeat');c.fillRect(-tx,-ty,224,224);c.restore();
    c.globalCompositeOperation='multiply';c.drawImage(L.shade,0,0);
    c.globalCompositeOperation='source-over';c.drawImage(L.high,0,0);c.drawImage(mark(key,F,pale),0,0);
    c.globalCompositeOperation='destination-in';c.drawImage(L.mask,0,0);
    c.globalCompositeOperation='source-over';
  }
  // a fighter's ball standing still: for the cards and the matchup. F = the picture's size in pixels.
  const balls=new Map();
  function ball(key,col,F){
    const id=key+'|'+col+'|'+F;let cv=balls.get(id);if(cv)return cv;
    try{cv=mk(F,F);const s=key.charCodeAt(0)*31+key.length*57+key.charCodeAt(key.length-1)*7;paint(cv,key,col,F,s%T,(s*3)%T)}catch(e){return null}
    if(balls.size>220)balls.delete(balls.keys().next().value);
    balls.set(id,cv);return cv;
  }
  // a fighter's ball in the arena, rolling: its skin slides by as far as the fighter has moved since it was last drawn
  // (x, y and r in arena units). A jump of more than a ball's width is a teleport, not a roll, and slides nothing.
  const rolls=new WeakMap();
  function rolling(f,col,F,x,y,r){
    try{
      let S=rolls.get(f);
      if(!S){const s=f.key.charCodeAt(0)*31+f.key.length*57;S={x,y,u:(s%97)/9,v:(s%61)/7,cv:mk(F,F),F};rolls.set(f,S)}
      if(S.F!==F){S.cv=mk(F,F);S.F=F}
      const dx=x-S.x,dy=y-S.y;S.x=x;S.y=y;
      if(dx*dx+dy*dy<r*r*4){S.u+=dx/r;S.v+=dy/r}
      paint(S.cv,f.key,col,F,S.u*RB,S.v*RB);
      return S.cv;
    }catch(e){return null}
  }
  // two picture sizes: small for the cards, large for the arena and the matchup
  const size=px=>px<=140?128:224;
  // draws the ball; floor = it stands in the arena, so it throws a shadow (away from the lamp, longer than wide, firm
  // by the ball) and darkens the bricks where it meets them. hit = it has just been struck, so it flashes pale.
  function drawBall(g,pic,x,y,r,alpha,hit,floor){
    if(floor){
      g.save();g.globalAlpha=alpha;
      g.translate(x-KDX*r*.42,y-KDY*r*.42);g.rotate(Math.atan2(-KDY,-KDX));g.scale(1.18,1);
      let gr=g.createRadialGradient(-r*.12,0,r*.45,0,0,r*1.02);
      gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(.7,'rgba(0,0,0,.64)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.beginPath();g.arc(0,0,r*1.02,0,TAU);g.fill();
      g.restore();g.save();g.globalAlpha=alpha;
      gr=g.createRadialGradient(x,y,r*.94,x,y,r*1.1);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r*1.1,0,TAU);g.fill();
      g.restore();
    }
    const w=r*(1+PAD);
    g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=true;try{g.imageSmoothingQuality='high'}catch(e){}
    g.drawImage(pic,x-w,y-w,2*w,2*w);
    if(hit){g.globalAlpha=alpha*.38;g.fillStyle='#fff';g.beginPath();g.arc(x,y,r*.985,0,TAU);g.fill()}
    g.restore();
  }

  // ---- weapons ----
  // name -> [width, height] of its picture. Every picture was made at 170 pixels of reach, with a tenth of that
  // behind the grip.
  const STRIPS={sword2:[194,102],sword1:[194,84],axe2:[194,176],bat:[194,52],dagger:[194,74],knife:[194,68],scythe:[194,254],cutlass:[194,92],tentacle:[194,124],spear:[194,32],wrench:[194,74],crystal:[194,186],hammer:[194,156],rifle:[194,226]};
  const RP=170,BACK=.1;
  // which picture each fighter's arm is; EXTRA is the blade an upgrade adds; GUN is the Gunner's barrel
  const HELD={blade:'sword2',mace:'bat',leech:'dagger',twin:'knife',fury:'axe2',necro:'scythe',pirate:'cutlass',octopus:'tentacle',spartan:'spear',engineer:'wrench',crystal:'crystal',smith:'hammer'};
  const strips={};
  // the picture strip for a weapon, once it has arrived; until then (and for a name with no picture) null, and the
  // arm is drawn in code as before
  function strip(name){
    if(!name||!STRIPS[name])return null;
    let T=strips[name];if(T)return T.ready?T:null;
    T=strips[name]={ready:false,fw:STRIPS[name][0],fh:STRIPS[name][1]};
    try{
      const im=new Image();
      im.onload=()=>{try{
        const sh=mk(im.width,im.height),c=sh.getContext('2d');c.drawImage(im,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#000';c.fillRect(0,0,sh.width,sh.height);
        T.img=im;T.sh=sh;T.ready=true}catch(e){}};
      im.src='art/weapons/'+name+'-'+WV+'.png';
    }catch(e){}
    return null;
  }
  // a weapon set into the side of the ball at (x,y): an = the way it points, len = the arm's reach beyond the ball
  function drawHeld(g,x,y,r,T,an,len,alpha){
    const c=Math.cos(an),s=Math.sin(an),k=(len+r*.1)/RP,fw=T.fw*k,fh=T.fh*k,gx=BACK*RP*k,hx=x+c*r*.9,hy=y+s*r*.9,lift=r*.5;
    const row=0;                                                          // one picture, whichever way it points
    g.save();g.imageSmoothingEnabled=true;try{g.imageSmoothingQuality='high'}catch(e){}
    // its shadow, on the floor and never on the ball
    g.save();g.beginPath();g.rect(x-400,y-400,800,800);g.arc(x,y,r*1.01,0,TAU,true);g.clip('evenodd');
    g.globalAlpha=alpha*.4;g.translate(hx-KDX*lift,hy-KDY*lift);g.rotate(an);g.drawImage(T.sh,0,row*T.fh,T.fw,T.fh,-gx,-fh/2,fw,fh);g.restore();
    // the weapon, cut off where it enters the ball
    g.beginPath();g.rect(x-400,y-400,800,800);g.arc(x,y,r*.955,0,TAU,true);g.clip('evenodd');
    g.globalAlpha=alpha;g.translate(hx,hy);g.rotate(an);g.drawImage(T.img,0,row*T.fh,T.fw,T.fh,-gx,-fh/2,fw,fh);
    g.restore();
  }
  // the health plaque: a small slab of the same stone as the buttons. Returns false until its picture has arrived.
  let slab=null,slabReady=false;
  function plaque(g,x,y,w,h){
    if(!slab){slab=new Image();slab.onload=()=>{slabReady=true};try{slab.src='art/ui/block-v4.png'}catch(e){}}
    if(!slabReady)return false;
    const sl=30,c=h*.3,iw=slab.width,ih=slab.height,xs=[0,sl,iw-sl,iw],ys=[0,sl,ih-sl,ih],x0=x-w/2,y0=y-h/2,xd=[x0,x0+c,x0+w-c,x0+w],yd=[y0,y0+c,y0+h-c,y0+h];
    g.save();g.fillStyle='rgba(0,0,0,.5)';g.fillRect(x0+.5,y0+1.1,w,h);
    for(let j=0;j<3;j++)for(let i=0;i<3;i++)g.drawImage(slab,xs[i],ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],xd[i],yd[j],xd[i+1]-xd[i],yd[j+1]-yd[j]);
    g.restore();return true;
  }
  // get the costly things ready while the player is still on the first screen: the stone at both sizes, then the pictures
  try{
    setTimeout(()=>{try{reliefMap();light(128)}catch(e){}},500);
    setTimeout(()=>{try{light(224)}catch(e){}},1400);
    setTimeout(()=>{plaque({save(){},restore(){},fillRect(){},drawImage(){}},0,0,1,1);for(const k of Object.keys(STRIPS))strip(k)},2200);
  }catch(e){}
  return {ok:true,ball,rolling,size,drawBall,strip,drawHeld,plaque,HELD,EXTRA:'sword1',GUN:'rifle'};
})();
