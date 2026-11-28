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

  // ---- the stone itself: everything about a ball that does not depend on its colour or emblem, worked out once for
  //      each picture size and shared by every fighter (the costly part: grain, pits, chips, and the light on them) ----
  const stones={};
  function stone(F){
    if(stones[F])return stones[F];
    const S=F*SS,n=S*S,R=S/2/(1+PAD),cx=S/2,cy=S/2,gu=R/100,seed=7,lift=R*.045;
    const T={S,R,A:new Float32Array(n),EX:new Float32Array(n),EY:new Float32Array(n),LIT:new Float32Array(n),M:new Float32Array(n),CHIP:new Float32Array(n),CEDGE:new Float32Array(n),
      LR:new Float32Array(n),LG:new Float32Array(n),LB:new Float32Array(n),SP:new Float32Array(n),W:new Float32Array(n),GR:new Float32Array(n),CM:new Float32Array(n)};
    const bump=(u,v)=>.55*vn(u/1.7,v/1.7,seed)+.9*vn(u/5,v/5,seed+1)+1.2*vn(u/14,v/14,seed+2);
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const dx=x+.5-cx,dy=y+.5-cy,rho=Math.hypot(dx,dy),e=R-rho;if(e<=-1)continue;
      const i=y*S+x,q=Math.min(1,rho/R),nz=Math.sqrt(Math.max(0,1-q*q)),nx=dx/R*(q<1?1:R/rho),ny=dy/R*(q<1?1:R/rho);
      const th=Math.asin(q),sc=q>1e-4?th/q*.9:.9;                           // the emblem follows the curve of the ball
      T.A[i]=ss(-.6,.6,e);T.EX[i]=cx+dx*sc-.5;T.EY[i]=cy+(dy+lift)*sc-.5;
      const u=dx/gu,v=dy/gu,b0=bump(u,v),bx=bump(u+.8,v)-b0,by=bump(u,v+.8)-b0;
      const pitN=vn(u/2.1,v/2.1,seed+3),pit=ss(.9,.95,pitN),chipN=vn(u/8,v/8,seed+4)*.75+vn(u/3,v/3,seed+5)*.25;
      T.CHIP[i]=ss(.86,.885,chipN);T.CEDGE[i]=ss(.83,.86,chipN)*(1-T.CHIP[i]);
      const ax=nx-bx*.85-(pit>0?(vn(u/2.1+.6,v/2.1,seed+3)-pitN)*3:0),ay=ny-by*.85-(pit>0?(vn(u/2.1,v/2.1+.6,seed+3)-pitN)*3:0);
      const al=Math.hypot(ax,ay,nz),px=ax/al,py=ay/al,pz=nz/al,nl=Math.max(0,px*K[0]+py*K[1]+pz*K[2]);
      T.LIT[i]=ss(0,.5,nl);
      T.M[i]=(1+.2*(vn(u/9,v/9,seed+6)-.5)+.13*(vn(u/2.4,v/2.4,seed+7)-.5))*(hash(x/SS|0,y/SS|0,seed+8)>.988?1.3:1)*(1-.5*pit);
      // one hard lamp, a dim cool room, the floor's own light on the edge nearest it; darker towards the edge
      const dif=nl*1.12,ao=mix(.42,1,ss(0,.4,nz)),up=.5+.5*pz,fl=Math.pow(1-nz,2)*.1;
      T.LR[i]=(.2*up+.05+dif*1.06)*ao+fl*.9;T.LG[i]=(.22*up+.055+dif)*ao+fl;T.LB[i]=(.27*up+.05+dif*.9)*ao+fl*.85;
      T.SP[i]=Math.pow(Math.max(0,px*HV[0]+py*HV[1]+pz*HV[2]),22)*.05*ao;
      T.W[i]=ss(.62,.85,vn(u/3.2,v/3.2,seed+9))*.45;T.GR[i]=.9+.2*(vn(u/2.6,v/2.6,seed+10)-.5);T.CM[i]=1-pit*.35;
    }
    return stones[F]=T;
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
  // a fighter's ball: its colour of paint on the shared stone, and its emblem. F = the picture's size in pixels.
  const balls=new Map();
  function ball(key,col,F){
    const id=key+'|'+col+'|'+F;let cv=balls.get(id);if(cv)return cv;
    try{
      const T=stone(F),S=T.S,R=T.R,sd=emblem(key,S,R),base=hex(col),H=hsv(base),grey=H[1]<.1;
      // the pigment, and how it looks in shade (a touch cooler)
      const P=L3(rgb(H[0],H[1]*.9,H[2]*.96)),PS=L3(rgb(grey?H[0]:toward(H[0],265,14),Math.min(1,H[1]*1.05),H[2]*.96));
      // The emblem is white on every fighter, and solid. Build 69 had it in grainy, worn ivory that took the ball's
      // shading, and in dark ink on pale fighters; the user: "Make the icons less washed out and all should be white
      // not black". So: near-white paint, hardly any grain or wear, kept bright on the ball's shaded side too. On a
      // pale ball (the Snowball, the Ghost) a white emblem is told apart by its dark line and a soft dark surround.
      const lumB=.3*lin(base[0])+.59*lin(base[1])+.11*lin(base[2]),pale=lumB>.5,IV=L3([.985,.975,.94]);
      const ST=.17,ow=R*(pale?.03:.022),wr=R*.03,c0=-R*.06,c1=-R*.01,hw=R*.09;
      const tone=v=>v<=.75?v:.75+.25*(1-Math.exp(-(v-.75)/.25)),bil=(x,y)=>{x=cl(x,0,S-1.001);y=cl(y,0,S-1.001);const xi=x|0,yi=y|0,fx=x-xi,fy=y-yi,o=yi*S+xi;return (sd[o]*(1-fx)+sd[o+1]*fx)*(1-fy)+(sd[o+S]*(1-fx)+sd[o+S+1]*fx)*fy};
      const im=(cv=mk(F,F)).getContext('2d').createImageData(F,F),dd=im.data;
      for(let y=0;y<F;y++)for(let x=0;x<F;x++){
        let r=0,g=0,b=0,a=0;
        for(let k=0;k<SS*SS;k++){
          const i=(y*SS+(k/SS|0))*S+x*SS+(k%SS),al=T.A[i];if(al<=0)continue;
          const d=bil(T.EX[i],T.EY[i]),m=ss(-.6,.6,d),clear=1-ss(c0,c1,d),chip=T.CHIP[i]*clear,lit=T.LIT[i];
          let M=T.M[i]*(1-.3*T.CEDGE[i]*clear);
          let pr=mix(mix(PS[0],P[0],lit),ST,chip),pg=mix(mix(PS[1],P[1],lit),ST,chip),pb=mix(mix(PS[2],P[2],lit),ST*.97,chip);
          // painted on: a dark line round the emblem (and on a pale ball a soft dark surround), then the white paint,
          // which keeps half its brightness where the ball is in shade
          const line=(1-(ss(-ow-.6,-ow+.6,d)-m)*(pale?.92:.85))*(pale?1-.34*ss(-hw,0,d)*(1-m):1);
          const cov=m*(1-ss(wr,0,d)*T.W[i]*.2)*(1-(1-T.CM[i])*.35),gr=1+(T.GR[i]-1)*.3;
          const er=IV[0]*gr*mix(T.LR[i],1.02,.5),eg=IV[1]*gr*mix(T.LG[i],1.02,.5),eb=IV[2]*gr*mix(T.LB[i],1.02,.5);
          r+=tone(mix(pr*line*M*T.LR[i]+T.SP[i],er,cov))*al;g+=tone(mix(pg*line*M*T.LG[i]+T.SP[i],eg,cov))*al;b+=tone(mix(pb*line*M*T.LB[i]+T.SP[i]*.9,eb,cov))*al;a+=al;
        }
        if(a<=0)continue;const j=(y*F+x)*4;
        dd[j]=255*cl(Math.pow(r/a,1/2.2),0,1);dd[j+1]=255*cl(Math.pow(g/a,1/2.2),0,1);dd[j+2]=255*cl(Math.pow(b/a,1/2.2),0,1);dd[j+3]=a/(SS*SS)*255;
      }
      cv.getContext('2d').putImageData(im,0,0);
    }catch(e){return null}
    if(balls.size>220)balls.delete(balls.keys().next().value);
    balls.set(id,cv);return cv;
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
    setTimeout(()=>{try{stone(128)}catch(e){}},500);
    setTimeout(()=>{try{stone(224)}catch(e){}},1400);
    setTimeout(()=>{plaque({save(){},restore(){},fillRect(){},drawImage(){}},0,0,1,1);for(const k of Object.keys(STRIPS))strip(k)},2200);
  }catch(e){}
  return {ok:true,ball,size,drawBall,strip,drawHeld,plaque,HELD,EXTRA:'sword1',GUN:'rifle'};
})();
