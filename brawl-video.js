// Video recorder for Duel King. Defines window.Broadcast; the game works without it.
// It records today's duel as a 1080x1920 video with everything a Short needs drawn into the frame:
// title, score, the arena, health bars, round stings and an end card with the day's ladder.
// The page calls start() before the duel, onFrame(dt) after each of its own frames, and finish() when the duel is decided.
(function(){
  'use strict';
  // the gilded palette; names kept from the first version of this file (PAPER is ivory, SUN is bright gold)
  const W=1080,H=1920,INK='#231a12',PAPER='#f3ead6',SUN='#f0dca4',GOLD_C='#c9a45c',GOLD_LO_C='#7a5d2b',EDGE_C='#090b0d';
  const DISPLAY="Cinzel, 'Times New Roman', serif",TEXT="'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  // WebM first: Chrome's MP4 recording kept only a fraction of a second once an audio track was attached (seen in a real
  // recording, 2026-11-25). Safari cannot record WebM, so it falls through to MP4, which is its native format.
  const MIMES=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1,mp4a.40.2','video/mp4'];
  // timeline, in seconds
  const INTRO=1.2,STING=.9,KO_LINGER=.7,END_CARD=3.1;
  // layout
  const AX=90,AY=580,AS=900;                        // where the arena's 0..AW square sits in the frame
  const TITLE_A=262,TITLE_B=408,VS_Y=335,SCORE_Y=536,NAME_Y=1544,BAR_Y=1570,BAR_H=34,TAG_Y=1640;

  let state='idle';     // idle | armed (start() called, recorder not yet made) | rec | ending | saving
  let cv=null,c=null,rec=null,stream=null,audioDest=null,chunks=[],mime='',cutShort=false,failNote='';
  let secs=0,frames=0,intro=0,sting=0,stingText='',lastRound=1,endT=0,armedFrames=0,armTimer=0,audioWait=0;
  let titles=['',''],overlay=null,fileUrl='';

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
  function drawTitle(scale){
    const A=titles[0].toUpperCase(),B=titles[1].toUpperCase();
    if(scale>1)c.setTransform(scale,0,0,scale,540*(1-scale),VS_Y*(1-scale));
    Orn.ribbon(c,540,TITLE_A,800,104,A,56);
    Orn.ribbon(c,540,TITLE_B,800,104,B,56);
    Orn.shield(c,540,VS_Y-6,40,'VS');
    c.setTransform(1,0,0,1,0,0);
  }
  function drawScore(){
    const label=duel.done?'FINAL':duel.round>=3?'DECIDER':'ROUND '+duel.round;
    text(label,540,SCORE_Y,40,360,{fill:SUN,stroke:EDGE_C,lw:8});
    for(let i=0;i<2;i++)for(let k=0;k<2;k++)gem(i?930-k*58:150+k*58,SCORE_Y,20,i?duel.b.color:duel.a.color,duel.score[i]>k);
  }
  function drawArenaBox(){
    const s=AS/AW,k=(typeof calm!=='undefined'&&calm)?0:(typeof shake==='number'?shake:0);
    const ox=(Math.random()-.5)*k*s*.6,oy=(Math.random()-.5)*k*s*.6;
    c.setTransform(s,0,0,s,AX+ox,AY+oy);
    try{(typeof drawSmooth==='function'?drawSmooth:drawArena)(c,typeof match!=='undefined'?match:null,-1,fx)}catch(e){failNote=failNote||String(e&&e.message||e)}
    c.setTransform(1,0,0,1,0,0);
    c.globalAlpha=1;c.setLineDash([]);c.lineCap='butt';
  }
  function drawBars(){
    for(let i=0;i<2;i++){
      const b=i?duel.b:duel.a,f=fighter(i),x=i?570:90,w=420;
      const part=f&&f.max>0?clamp01(f.hp/f.max):1;
      // name on the outer side, health number on the inner side, both above the bar
      text(String(b.name||'').toUpperCase(),i?x+w:x,NAME_Y,34,w-110,{fill:PAPER,stroke:EDGE_C,lw:7,align:i?'right':'left'});
      if(f)text(String(Math.max(0,Math.ceil(f.hp))),i?x:x+w,NAME_Y,34,90,{fill:SUN,stroke:EDGE_C,lw:7,align:i?'left':'right'});
      Orn.bar(c,x,BAR_Y,w,part,b.color,!!i,BAR_H);
      // their boons, as a quiet line of script
      let ups='';try{ups=summary(b)}catch(e){}
      if(ups&&ups!=='no upgrades yet')text(ups,x+w/2,TAG_Y,30,w,{text:true,italic:true,fill:'#b9c1c4',min:22});
    }
  }
  // a crimson band across the arena, used for the intro and between rounds. `open` 0..1 is how far it has opened.
  function drawBand(main,sub,open){
    const h=230*clamp01(open),y=AY+AS/2;
    if(h<4)return;
    c.fillStyle='rgba(0,0,0,.5)';c.fillRect(0,y-h/2+12,W,h);
    const gr=c.createLinearGradient(0,y-h/2,0,y+h/2);gr.addColorStop(0,'#a53340');gr.addColorStop(1,'#7b1e29');
    c.fillStyle=gr;c.fillRect(0,y-h/2,W,h);
    c.fillStyle=GOLD_C;c.fillRect(0,y-h/2+9,W,5);c.fillRect(0,y+h/2-14,W,5);
    if(open<.92)return;
    text(main,540,sub?y-22:y+4,100,900,{fill:PAPER,shadow:5});
    if(sub)text(sub,540,y+62,44,900,{text:true,italic:true,fill:SUN});
  }
  function ladderRows(){
    const out=[];
    try{
      for(const r of standings().slice(0,5)){
        const b=rebuild(r.e);
        out.push({type:typeOf(b),col:b.color,cleared:r.cleared,who:r.house?'house fighter':String(b.name||'player')});
      }
    }catch(e){}
    return out;
  }
  function siteLine(){
    try{return (location.host+location.pathname).replace(/\/+$/,'/')||'our site'}catch(e){return 'our site'}
  }
  // the end card is a parchment scroll unrolled over the arena
  function drawEndCard(open){
    const x=AX+24,y=AY+40,w=AS-48,h=AS-80,k=clamp01(open);
    if(k<1){const cw=w*k,ch=h*k;if(cw>40&&ch>40)Orn.scroll(c,x+(w-cw)/2,y+(h-ch)/2,cw,ch);return}
    Orn.scroll(c,x,y,w,h);
    const wt=titles[duel.winner===1?1:0];
    text(wt.toUpperCase(),540,y+98,90,w-130,{fill:'#8f2732',weight:900});
    text('IS TODAY’S DUEL KING',540,y+182,42,w-130,{fill:INK});
    c.fillStyle='rgba(60,40,15,.6)';c.fillRect(x+150,y+230,w-300,3);
    c.save();c.translate(540,y+231);c.rotate(Math.PI/4);c.fillStyle=INK;c.fillRect(-8,-8,16,16);c.restore();
    text('TODAY’S LADDER',x+60,y+282,24,400,{fill:'#5a4630',align:'left'});
    text('RUNGS',x+w-60,y+282,24,200,{fill:'#5a4630',align:'right'});
    const rows=ladderRows();
    for(let i=0;i<rows.length;i++){
      const r=rows[i],ry=y+344+i*72;
      text(String(i+1),x+78,ry+4,38,50,{fill:'#5a4630'});
      gem(x+136,ry+4,19,r.col,true);
      text(r.type,x+176,ry-9,32,w-176-170,{fill:INK,align:'left',min:20});
      text(r.who,x+176,ry+24,26,w-176-170,{text:true,italic:true,fill:'#5a4630',align:'left',min:18});
      text(String(r.cleared),x+w-64,ry+4,48,110,{fill:INK,weight:900,align:'right'});
      if(i<rows.length-1){c.fillStyle='rgba(60,40,15,.25)';c.fillRect(x+50,ry+44,w-100,2)}
    }
    // the invitation, on a crimson plate
    Orn.plate(c,x+44,y+h-162,w-88,124,'',true);
    text('MAKE YOURS AT',540,y+h-124,24,w-180,{fill:SUN});
    text(siteLine(),540,y+h-78,46,w-180,{fill:PAPER,min:22,shadow:3});
  }
  function drawFrame(){
    drawBackground();
    drawTitle(intro>0?pop((INTRO-intro)/.32):1);
    drawScore();
    drawArenaBox();
    drawBars();
    if(intro>0)drawBand('TODAY’S DUEL','best of three',Math.min((INTRO-intro)/.16,intro/.14));
    else if(sting>0)drawBand(stingText,'',Math.min((STING-sting)/.14,sting/.12));
    if(state==='ending'&&endT>KO_LINGER)drawEndCard((endT-KO_LINGER)/.22);
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
      state='armed';secs=0;frames=0;endT=0;sting=0;intro=INTRO;armedFrames=0;audioWait=0;cutShort=false;failNote='';lastRound=1;
      makeCanvas();
      try{if(document.fonts&&document.fonts.load){document.fonts.load('700 96px Cinzel');document.fonts.load('900 96px Cinzel');document.fonts.load('italic 500 32px "Cormorant Garamond"')}}catch(e){}
      setSpeed(0);                                   // hold the first bell until the title card has played
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
      }
      if(!inDuel){if(state==='ending')stop();else cancel();return}
      dt=dt>0&&dt<.25?dt:1/60;
      if(state==='rec'){
        if(duel.round!==lastRound){lastRound=duel.round;sting=STING;stingText=duel.round>=3?'DECIDER':'ROUND '+duel.round}
        if(intro>0){intro-=dt;setSpeed(0)}
        else if(sting>0){sting-=dt;setSpeed(0)}
        else setSpeed(1);
      }else{
        endT+=dt;setSpeed(1);
        if(endT>=KO_LINGER+END_CARD){drawFrame();secs+=dt;stop();return}
      }
      drawFrame();
      secs+=dt;
    }catch(e){
      failNote=String(e&&e.message||e);
      cancel();
    }
  }
  function finish(){
    if(state==='armed'){cancel();return}
    if(state!=='rec')return;
    state='ending';endT=0;intro=0;sting=0;setSpeed(1);
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
  };
  window.Broadcast=api;
  try{globalThis.Broadcast=api}catch(e){}            // the same object in a browser; keeps the bare name valid elsewhere
})();
