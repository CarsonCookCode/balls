// Video recorder for Duel King. Defines window.Broadcast; the game works without it.
// It records a day's duel as a 1080x1920 video with everything a Short needs drawn into the frame: the two units' names
// either side of VS (the player's name small beneath), health bars, the arena; each round is called before it starts;
// the deciding blow lands in slow motion; and it ends on one screen, the winner crowned, with the invitation to play.
// With Broadcast.clap set (the automatic video does this) the recording starts and ends with a white square and a beep
// in the same instant, so tools/duel-video.js can measure how far sound and picture are apart, correct it, and cut the
// marks off.
// The page calls start() before the duel, onFrame(dt) after each of its own frames, and finish() when the duel is decided.
(function(){
  'use strict';
  // the gilded palette; names kept from the first version of this file (PAPER is ivory, SUN is bright gold)
  const W=1080,H=1920,INK='#231a12',PAPER='#f3ead6',SUN='#f0dca4',GOLD_C='#c9a45c',GOLD_LO_C='#7a5d2b',EDGE_C='#090b0d';
  const DISPLAY="Cinzel, 'Times New Roman', serif",TEXT="'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  // WebM first: Chrome's MP4 recording kept only a fraction of a second once an audio track was attached (seen in a real
  // recording, 2026-11-25). Safari cannot record WebM, so it falls through to MP4, which is its native format.
  const MIMES=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1,mp4a.40.2','video/mp4'];
  // timeline, in seconds: OPEN holds the first round under its call and STING each later one; the deciding blow and
  // KO_LINGER after it run at KO_SLOW of normal speed; CROWN is the closing screen. CLAP_LEAD is the extra hold at the
  // very start, and CLAP_TAIL the one at the very end, that carry the sync marks and are cut off afterwards.
  const OPEN=.9,STING=.8,KO_SLOW=.22,KO_LINGER=.5,CROWN=2.3,CLAP_LEAD=2.6,CLAP_AT=2.1,CLAP_LEN=.07,CLAP_TAIL=.5,TAIL_AT=.2;
  // layout
  const AX=60,AY=484,AS=960;                        // where the arena's 0..AW square sits in the frame

  let state='idle';     // idle | armed (start() called, recorder not yet made) | rec | ending | saving
  let cv=null,c=null,rec=null,stream=null,audioDest=null,chunks=[],mime='',cutShort=false,failNote='';
  let secs=0,frames=0,sting=0,stingLen=1,stingText='',lastRound=1,endT=0,armedFrames=0,armTimer=0,audioWait=0;
  let titles=['',''],overlay=null,fileUrl='',lead=0,clapped=false,clapped2=false;

  const MR=()=>typeof MediaRecorder!=='undefined'?MediaRecorder:null;
  function supported(){
    try{
      if(!MR()||typeof document==='undefined')return false;
      const proto=typeof HTMLCanvasElement!=='undefined'?HTMLCanvasElement.prototype:null;
      return proto?typeof proto.captureStream==='function':true;
    }catch(e){return false}
  }

  // ----- drawing helpers (frame pixels, identity transform) -----
  // The ornaments (leather backdrop, ribbons, scroll, plate, health bars, shield) come from brawl-looks.js as `Orn`,
  // so the video and the game share one look.
  function box(x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r||0);else c.rect(x,y,w,h)}
  // Sets the font so `str` fits in maxW: shrinks first, then drops the tail. Returns what will be drawn and how wide it is.
  function fit(str,size,maxW,o){
    o=o||{};
    str=String(str);
    const fam=o.text?TEXT:DISPLAY,wt=(o.italic?'italic ':'')+(o.weight||(o.text?500:700)),min=o.min||Math.max(14,size*.4);
    let s=size;
    c.font=wt+' '+s+'px '+fam;
    while(s>min&&c.measureText(str).width>maxW){s-=2;c.font=wt+' '+s+'px '+fam}
    if(c.measureText(str).width>maxW){
      while(str.length>2&&c.measureText(str+'…').width>maxW)str=str.slice(0,-1).trimEnd();
      str+='…';
    }
    return {str,size:s,width:c.measureText(str).width};
  }
  // Text that can never leave its box. Returns the size used.
  function text(str,x,y,size,maxW,o){
    o=o||{};
    const f=fit(str,size,maxW,o),s=f.size;
    str=f.str;
    c.textAlign=o.align||'center';c.textBaseline='middle';c.lineJoin='round';
    if(o.shadow){c.fillStyle='rgba(0,0,0,.6)';c.fillText(str,x,y+o.shadow)}
    if(o.stroke){c.lineWidth=o.lw||8;c.strokeStyle=o.stroke;c.strokeText(str,x,y)}
    c.fillStyle=o.fill||PAPER;c.fillText(str,x,y);
    return s;
  }
  const clamp01=v=>v<0?0:v>1?1:v;
  const pop=p=>{p=clamp01(p);return 1+(1-p)*(1-p)*.1};           // the title settles in from slightly oversized
  function fighter(i){return typeof match!=='undefined'&&match&&match.f?match.f[i]:null}
  function gem(x,y,r,col,lit){
    c.fillStyle=EDGE_C;c.beginPath();c.arc(x,y+3,r+2,0,6.2832);c.fill();
    c.fillStyle=GOLD_C;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill();
    c.fillStyle=EDGE_C;c.beginPath();c.arc(x,y,r*.74,0,6.2832);c.fill();
    c.fillStyle=lit?col:'#1c242a';c.beginPath();c.arc(x,y,r*.62,0,6.2832);c.fill();
    if(lit){c.fillStyle='rgba(255,255,255,.4)';c.beginPath();c.arc(x-r*.2,y-r*.22,r*.18,0,6.2832);c.fill()}
  }

  function drawBackground(){
    c.setTransform(1,0,0,1,0,0);
    c.globalAlpha=1;c.setLineDash([]);
    Orn.backdrop(c,0,0,W,H);
    // a hairline of gold tooling round the edge, like a book cover
    c.strokeStyle=GOLD_LO_C;c.lineWidth=3;c.strokeRect(30,30,W-60,H-60);
    c.lineWidth=1.5;c.strokeRect(42,42,W-84,H-84);
  }
  // ----- the frame -----
  // Laid out for a Short. YouTube draws its own caption and channel over the bottom quarter and its buttons down the
  // lower right edge, so everything that matters sits above y=1460: who is fighting and how healthy they are at the
  // top (the players' names lead, the fighter's type is the small print), then the arena, as large as it will go.
  const side=i=>i?duel.b:duel.a;
  // the unit's plain name (Tide, Railgun), and the player who made it ('' for a house fighter)
  function unit(i){try{return FIGHTERS[side(i).key].name.toUpperCase()}catch(e){return 'FIGHTER'}}
  function maker(i){let n='';try{n=String(duel.who[i]||'')}catch(e){}return n==='House'?'':n}
  function spaced(str,x,y,size,ls,o){c.letterSpacing=ls+'px';try{text(str,x,y,size,o.maxW||900,o)}finally{c.letterSpacing='0px'}}
  // Symmetrical about the VS shield: each unit's name is centred over its own health bar, the player's name small under it.
  function drawHud(){
    for(let i=0;i<2;i++){
      const b=side(i),f=fighter(i),left=!i,x0=left?60:590,w=430,mid=x0+w/2,part=f&&f.max>0?clamp01(f.hp/f.max):1,by=maker(i);
      text(unit(i),mid,236,78,w-70,{fill:PAPER,stroke:EDGE_C,lw:12,weight:900,min:34});
      if(by)text(by,mid,302,38,w-40,{text:true,italic:true,fill:'#c9d0d4',min:22});
      Orn.bar(c,x0,344,w,part,b.color,!left,46);
      if(f)text(String(Math.max(0,Math.ceil(f.hp))),left?x0+w-18:x0+18,368,34,110,{align:left?'right':'left',fill:'#ffffff',stroke:'rgba(0,0,0,.7)',lw:6,weight:900});
      for(let k=0;k<2;k++)gem(left?x0+24+k*50:x0+w-24-k*50,424,16,b.color,duel.score[i]>k);
    }
    Orn.shield(c,540,244,44,'VS');
    const label=duel.done?'FINAL':duel.round>=3?'DECIDER':'ROUND '+duel.round;
    spaced(label,540,424,34,3,{fill:SUN,stroke:EDGE_C,lw:8,maxW:330});
  }
  function drawArenaBox(){
    const s=AS/AW,k=(typeof calm!=='undefined'&&calm)?0:(typeof shake==='number'?shake:0);
    const ox=(Math.random()-.5)*k*s*.6,oy=(Math.random()-.5)*k*s*.6;
    c.setTransform(s,0,0,s,AX+ox,AY+oy);
    try{(typeof drawSmooth==='function'?drawSmooth:drawArena)(c,typeof match!=='undefined'?match:null,-1,fx)}catch(e){failNote=failNote||String(e&&e.message||e)}
    c.setTransform(1,0,0,1,0,0);
    c.globalAlpha=1;c.setLineDash([]);c.lineCap='butt';
  }
  // a crimson band across the arena, for the call before each round. `open` 0..1 is how far it has opened.
  function drawBand(main,sub,open,y){
    const h=250*clamp01(open);
    if(h<4)return;
    c.fillStyle='rgba(0,0,0,.5)';c.fillRect(0,y-h/2+12,W,h);
    const gr=c.createLinearGradient(0,y-h/2,0,y+h/2);gr.addColorStop(0,'#a53340');gr.addColorStop(1,'#7b1e29');
    c.fillStyle=gr;c.fillRect(0,y-h/2,W,h);
    c.fillStyle=GOLD_C;c.fillRect(0,y-h/2+9,W,5);c.fillRect(0,y+h/2-14,W,5);
    if(open<.92)return;
    text(main,540,sub?y-26:y+4,104,980,{fill:PAPER,shadow:5,weight:900,min:44});
    if(sub)text(sub,540,y+66,50,900,{text:true,italic:true,fill:SUN});
  }
  function siteLine(){
    // the automatic video is recorded from a copy of the game served on this computer: it still names the real site
    try{return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(location.host)?'playduelking.com':(location.host+location.pathname).replace(/(index|duel)\.html$/,'').replace(/\/+$/,'')||'our site'}catch(e){return 'our site'}
  }
  function crownPath(){c.beginPath();c.moveTo(-1,.6);c.lineTo(-1,-.42);c.lineTo(-.5,.06);c.lineTo(0,-.8);c.lineTo(.5,.06);c.lineTo(1,-.42);c.lineTo(1,.6);c.closePath()}
  function drawCrownShape(x,y,s){
    c.save();c.translate(x,y);c.scale(s,s);c.lineJoin='round';
    const gr=c.createLinearGradient(0,-.8,0,.6);gr.addColorStop(0,SUN);gr.addColorStop(.55,GOLD_C);gr.addColorStop(1,GOLD_LO_C);
    c.fillStyle=gr;c.strokeStyle=EDGE_C;c.lineWidth=.07;crownPath();c.fill();c.stroke();
    c.fillStyle=GOLD_LO_C;c.fillRect(-.93,.28,1.86,.09);
    for(const p of [[-1,-.42],[0,-.8],[1,-.42]]){c.fillStyle=SUN;c.strokeStyle=EDGE_C;c.lineWidth=.05;c.beginPath();c.arc(p[0],p[1],.13,0,6.2832);c.fill();c.stroke()}
    for(const p of [[-.55,'#3f6fd8'],[0,'#b3313f'],[.55,'#3f6fd8']]){c.fillStyle=EDGE_C;c.beginPath();c.arc(p[0],.44,.115,0,6.2832);c.fill();c.fillStyle=p[1];c.beginPath();c.arc(p[0],.44,.085,0,6.2832);c.fill()}
    c.restore();
  }
  // The ending: the arena dims, the winner is shown large in a burst of light, the crown drops onto it, and the
  // invitation sits underneath. One screen, about two seconds, so the video loops cleanly. t = seconds since it began.
  function drawCrowned(t){
    const w=duel.winner===1?1:0,f=fighter(w),p=clamp01(t/.3),e=1-(1-p)*(1-p),cx=540,cy=AY+AS*.34;
    c.fillStyle='rgba(6,9,11,'+(.55*e).toFixed(3)+')';c.fillRect(AX,AY,AS,AS);
    c.save();c.globalCompositeOperation='lighter';
    let gr=c.createRadialGradient(cx,cy,0,cx,cy,430);gr.addColorStop(0,'rgba(255,214,140,'+(.45*e).toFixed(3)+')');gr.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=gr;c.fillRect(cx-430,cy-430,860,860);
    c.translate(cx,cy);c.rotate(t*.25);
    for(let k=0;k<14;k++){
      c.rotate(6.2832/14);
      gr=c.createLinearGradient(0,0,0,-440);gr.addColorStop(0,'rgba(255,220,150,'+(.2*e).toFixed(3)+')');gr.addColorStop(1,'rgba(255,220,150,0)');
      c.fillStyle=gr;c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.lineTo(66,-440);c.lineTo(-66,-440);c.closePath();c.fill();
    }
    c.restore();
    let R=150;
    if(f&&f.hp>0){
      // the winner itself, drawn by the game's own art, about three times arena size
      const k=(150/Math.max(12,f.r))*(.6+.4*e),lab=f.label,gone=f.gone;R=f.r*k;
      try{
        f.label='';f.gone=false;
        c.save();c.setTransform(k,0,0,k,cx-f.x*k,cy-f.y*k);
        g=c;MATCH=match;NOW=match.t;PX=k;LIVE=false;
        drawFighter(f,false);
      }catch(err){failNote=failNote||String(err&&err.message||err)}
      finally{f.label=lab;f.gone=gone;c.restore();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.setLineDash([])}
    }
    drawCrownShape(cx,cy-R-52-(1-e)*220,78);
    if(p<1)return;
    text(unit(w),540,AY+AS*.7,150,AS-80,{fill:PAPER,stroke:EDGE_C,lw:18,weight:900,min:56});
    text((maker(w)?maker(w)+' is':'is')+' today’s Duel King',540,AY+AS*.7+104,60,AS-80,{text:true,italic:true,fill:SUN,stroke:'rgba(0,0,0,.8)',lw:8});
    Orn.plate(c,170,AY+AS-150,740,118,'',true);
    spaced('MAKE YOURS AT',540,AY+AS-116,24,4,{fill:SUN,maxW:660});
    text(siteLine(),540,AY+AS-72,46,660,{fill:PAPER,min:22,shadow:3});
  }
  function drawFrame(){
    drawBackground();
    drawHud();
    drawArenaBox();
    if(state==='rec'&&lead<=0&&sting>0)drawBand(stingText,'',Math.min((stingLen-sting)/.14,sting/.12),AY+AS/2);
    // the sync mark: a white square in the corner for the same few moments the beep sounds (cut off afterwards)
    const tail=state==='ending'&&api.clap?endT-(KO_LINGER+CROWN+TAIL_AT):-1;
    if((lead>0&&secs>=CLAP_AT&&secs<CLAP_AT+CLAP_LEN)||(tail>=0&&tail<CLAP_LEN)){c.fillStyle='#ffffff';c.fillRect(0,0,64,64)}
    if(state==='ending'&&endT>KO_LINGER)drawCrowned(endT-KO_LINGER);
    frames++;
  }

  // ----- recording -----
  function setSpeed(v){
    try{
      if(speed!==v)speed=v;
      const b=document.getElementById('btnSpeed');if(b&&b.textContent!=='Speed 1×')b.textContent='Speed 1×';
    }catch(e){}
  }
  function makeCanvas(){
    cv=document.createElement('canvas');cv.width=W;cv.height=H;
    cv.setAttribute('aria-hidden','true');
    // kept in the page but out of sight: some browsers only capture frames from a canvas that is attached
    cv.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:.01;pointer-events:none;z-index:-1';
    document.body.appendChild(cv);
    c=cv.getContext('2d');
    if(!c)throw new Error('no 2d canvas');
  }
  function makeRecorder(){
    try{stream=cv.captureStream(60)}catch(e){stream=cv.captureStream(30)}
    audioDest=null;
    try{
      const A=window.BrawlAudio,ac=A&&A.ctx(),out=A&&A.out();
      // Only attach sound when the audio engine is actually running. A suspended one delivers no samples, and the
      // recorder then waits for audio forever and writes an almost empty file (seen in a real recording, 2026-11-25).
      if(ac&&out&&ac.state==='running'&&ac.createMediaStreamDestination){
        audioDest=ac.createMediaStreamDestination();out.connect(audioDest);
        const tr=audioDest.stream.getAudioTracks()[0];if(tr)stream.addTrack(tr);
      }
    }catch(e){audioDest=null}
    const M=MR();mime='';
    for(const t of MIMES){try{if(M.isTypeSupported&&M.isTypeSupported(t)){mime=t;break}}catch(e){}}
    const opts={videoBitsPerSecond:8000000};if(mime)opts.mimeType=mime;
    try{rec=new M(stream,opts)}catch(e){rec=new M(stream)}
    chunks=[];
    rec.ondataavailable=e=>{if(e&&e.data&&e.data.size)chunks.push(e.data)};
    rec.onstop=present;
    rec.onerror=()=>{failNote=failNote||'the recorder reported an error'};
    rec.start();
  }
  function cleanup(){
    try{if(audioDest&&window.BrawlAudio&&BrawlAudio.out())BrawlAudio.out().disconnect(audioDest)}catch(e){}
    try{if(stream)for(const t of stream.getTracks())if(!audioDest||t.kind!=='audio')t.stop()}catch(e){}
    try{if(cv&&cv.remove)cv.remove()}catch(e){}
    audioDest=null;stream=null;cv=null;c=null;
    clearTimeout(armTimer);
  }
  // give up quietly: the duel carries on as if nobody had asked for a video
  function cancel(){
    const r=rec;rec=null;state='idle';
    try{if(r){r.onstop=null;if(r.state!=='inactive')r.stop()}}catch(e){}
    cleanup();setSpeed(1);
  }
  function stop(){
    if(state!=='rec'&&state!=='ending')return;
    state='saving';setSpeed(1);
    try{if(rec&&rec.state!=='inactive')rec.stop();else present()}catch(e){present()}
  }
  function start(){
    try{
      if(!supported()||state==='saving')return;
      if(state==='rec'||state==='ending'||state==='armed')cancel();
      closeOverlay();
      state='armed';secs=0;frames=0;endT=0;sting=0;lead=0;clapped=false;clapped2=false;armedFrames=0;audioWait=0;cutShort=false;failNote='';lastRound=1;
      makeCanvas();
      try{if(document.fonts&&document.fonts.load){document.fonts.load('700 96px Cinzel');document.fonts.load('900 96px Cinzel');document.fonts.load('italic 500 32px "Cormorant Garamond"')}}catch(e){}
      setSpeed(0);                                   // hold the first bell until the recorder is running
      clearTimeout(armTimer);
      armTimer=setTimeout(()=>{if(state==='armed')cancel()},2500);   // never leave the duel frozen if no frame arrives
    }catch(e){cancel()}
  }
  function onFrame(dt){
    if(state==='idle'||state==='saving')return;
    try{
      const inDuel=typeof mode!=='undefined'&&mode==='duel'&&typeof duel!=='undefined'&&duel;
      if(state==='armed'){
        if(!inDuel){if(++armedFrames>20)cancel();return}     // the duel never started (ladder not ready)
        // The audio engine wakes up a moment after the tap. Wait for it (up to about a second, the round is held
        // meanwhile) so the sound can be recorded; if it never wakes, record without sound.
        try{
          const ac=window.BrawlAudio&&BrawlAudio.ctx();
          if(ac&&ac.state==='suspended'&&++audioWait<60){if(ac.resume)ac.resume();return}
        }catch(e){}
        titles=[typeOf(duel.a),typeOf(duel.b)];
        lastRound=duel.round;
        makeRecorder();
        state='rec';
        lead=api.clap?CLAP_LEAD:0;sting=stingLen=OPEN;stingText='ROUND 1';
      }
      if(!inDuel){if(state==='ending')stop();else cancel();return}
      dt=dt>0&&dt<.25?dt:1/60;
      if(state==='rec'){
        if(duel.round!==lastRound){lastRound=duel.round;sting=stingLen=STING;stingText=duel.round>=3?'DECIDER':'ROUND '+duel.round}
        if(lead>0){lead-=dt;setSpeed(0);if(!clapped&&secs>=CLAP_AT){clapped=true;beep()}}
        else if(sting>0){sting-=dt;setSpeed(0)}
        else setSpeed(deciding()?KO_SLOW:1);
      }else{
        endT+=dt;setSpeed(endT<KO_LINGER?KO_SLOW:1);
        if(api.clap&&!clapped2&&endT>=KO_LINGER+CROWN+TAIL_AT){clapped2=true;beep()}
        if(endT>=KO_LINGER+CROWN+(api.clap?CLAP_TAIL:0)){drawFrame();secs+=dt;stop();return}
      }
      drawFrame();
      secs+=dt;
    }catch(e){
      failNote=String(e&&e.message||e);
      cancel();
    }
  }
  // (The opening mark comes two seconds in: Chrome's recorder was seen to drop every frame between about 0.2 s and
  // 1.4 s of a recording while its encoder starts up, and the first sound it records is not yet steady.)
  // the sound half of the sync mark: a short high beep straight into the recording (not through the game's own mix)
  function beep(){
    try{
      const ac=window.BrawlAudio&&BrawlAudio.ctx();
      if(!ac||!audioDest)return;
      const o=ac.createOscillator(),gn=ac.createGain();
      o.type='square';o.frequency.value=2000;gn.gain.value=.5;o.connect(gn);gn.connect(audioDest);
      o.start();o.stop(ac.currentTime+CLAP_LEN);
    }catch(e){}
  }
  // the blow that has just ended this round also ends the duel
  function deciding(){try{return !!(match&&match.over&&!match.draw&&!duel.done&&duel.score[match.winner]===1)}catch(e){return false}}
  function finish(){
    if(state==='armed'){cancel();return}
    if(state!=='rec')return;
    state='ending';endT=0;sting=0;setSpeed(KO_SLOW);
  }

  // ----- handing over the file -----
  function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'fighter'}
  function fileName(ext){
    let day='';try{day=dayKey()}catch(e){const d=new Date();day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
    return 'duel-king-'+day+'-'+slug(titles[0])+'-vs-'+slug(titles[1])+'.'+ext;
  }
  function el(tag,id,css,txt){const e=document.createElement(tag);if(id)e.id=id;if(css)e.style.cssText=css;if(txt!==undefined)e.textContent=txt;return e}
  function closeOverlay(){
    try{if(overlay&&overlay.remove)overlay.remove()}catch(e){}
    overlay=null;
    try{if(fileUrl)URL.revokeObjectURL(fileUrl)}catch(e){}
    fileUrl='';
  }
  function present(){
    if(state!=='saving')return;
    state='idle';
    const type=(rec&&rec.mimeType)||mime||(chunks[0]&&chunks[0].type)||'video/webm';
    rec=null;
    cleanup();
    let blob=null;
    try{blob=new Blob(chunks,{type})}catch(e){}
    chunks=[];
    const ext=/mp4/i.test(type)?'mp4':'webm',name=fileName(ext),ok=blob&&blob.size>0;
    try{window.__duelFile={ok:!!ok,blob,name,type,secs:Math.round(secs),cut:cutShort,note:failNote}}catch(e){}       // for the automatic video (see brawl-app.js)
    closeOverlay();
    const BTN='font:700 13px '+DISPLAY+';letter-spacing:.1em;text-transform:uppercase;color:'+PAPER+';text-shadow:0 1.5px 0 rgba(0,0,0,.6);background:linear-gradient(#a93543,#77202a);border:2px solid '+GOLD_C+';border-radius:4px;box-shadow:inset 0 0 0 3px #6b1a24,inset 0 0 0 4px '+GOLD_LO_C+',0 4px 0 rgba(0,0,0,.45);min-height:46px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;cursor:pointer;flex:1 1 0';
    const BTN2=BTN+';background:linear-gradient(#3a444c,#232a30);box-shadow:inset 0 0 0 3px #1d2328,inset 0 0 0 4px '+GOLD_LO_C+',0 4px 0 rgba(0,0,0,.45)';
    overlay=el('div','bcOverlay','position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,7,9,.82)');
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Your recorded duel');
    const card=el('div','bcCard','background:linear-gradient(90deg,#c9b487,#e6d6b0 7%,#e6d6b0 93%,#c9b487);color:'+INK+';border:1px solid rgba(60,40,15,.6);border-top:9px solid #efe0bb;border-bottom:9px solid #a08a5c;box-shadow:0 8px 0 rgba(0,0,0,.45);padding:16px;display:flex;flex-direction:column;gap:11px;width:100%;max-width:420px;max-height:100%;overflow:auto;font:500 17px/1.25 '+TEXT);
    card.appendChild(el('h2','bcTitle','margin:0;text-align:center;font:700 20px/1.15 '+DISPLAY+';text-transform:uppercase;letter-spacing:.09em',ok?'Your video is ready':'The recording came out empty'));
    const row=el('div','bcRow','display:flex;gap:10px;flex-wrap:wrap');
    if(ok){
      fileUrl=URL.createObjectURL(blob);
      const v=el('video','bcVideo','width:100%;max-height:52vh;background:#090b0d;border:2px solid '+GOLD_C+';border-radius:3px');
      v.controls=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='metadata';v.src=fileUrl;
      card.appendChild(v);
      const mb=blob.size/1048576;
      card.appendChild(el('p','bcMeta','margin:0;text-align:center;font-style:italic;color:#5a4630',Math.round(secs)+' seconds · '+(mb>=10?Math.round(mb):mb.toFixed(1))+' MB · '+ext.toUpperCase()+' · 1080 × 1920'));
      if(cutShort)card.appendChild(el('p','bcNote','margin:0;text-align:center;font-weight:700','The recording was cut short because the page went out of view. The video ends there.'));
      const save=el('a','bcSave',BTN,'Save video');save.href=fileUrl;save.download=name;save.setAttribute('download',name);
      row.appendChild(save);
      let file=null;
      try{file=new File([blob],name,{type})}catch(e){}
      let canShare=false;
      try{canShare=!!(file&&navigator.canShare&&navigator.canShare({files:[file]}))}catch(e){}
      if(canShare){
        const sh=el('button','bcShare',BTN2,'Share');sh.type='button';
        sh.addEventListener('click',()=>{try{const p=navigator.share({files:[file],title:titles[0]+' vs '+titles[1]});if(p&&p.catch)p.catch(()=>{})}catch(e){}});
        row.appendChild(sh);
      }
    }else{
      card.appendChild(el('p','bcNote','margin:0','This browser did not hand back any video. Try again in Chrome on a computer.'+(failNote?' ('+failNote+')':'')));
    }
    const close=el('button','bcClose',BTN2,'Close');close.type='button';
    close.addEventListener('click',closeOverlay);
    row.appendChild(close);
    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  try{
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&(state==='rec'||state==='ending')){cutShort=true;stop()}
      else if(document.hidden&&state==='armed')cancel();
    });
  }catch(e){}

  const api={
    supported,start,onFrame,finish,
    get recording(){return state==='armed'||state==='rec'||state==='ending'},
    // for tests and for diagnosing a failed recording from the console
    stats:()=>({state,frames,seconds:secs,mime,note:failNote,cutShort}),
    clap:false,                                        // set by the automatic video: begin with the sync mark
    CLAP:{lead:CLAP_LEAD,at:CLAP_AT,len:CLAP_LEN,tail:CLAP_TAIL,tailAt:TAIL_AT},
  };
  window.Broadcast=api;
  try{globalThis.Broadcast=api}catch(e){}            // the same object in a browser; keeps the bare name valid elsewhere
})();
