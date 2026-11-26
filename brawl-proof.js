//<sim>
// The rules of a climb, and the proof that a climb was really played. Pure simulation, no DOM: loads after brawl-sim.js,
// the class packs and brawl-boons.js, in the page and in Node alike.
//
// Why: the shared ladder has no accounts, so anyone can send it an entry. A number on its own ("I cleared 60 rungs")
// proves nothing. So every climb draws all of its luck from one seed, and its entry carries that seed plus the few
// things the player chose: which boon after each win, when the shield was raised, and which other players' fighters
// stood in the way. Anyone can then play the whole climb again (Climb.checker) and see that it ends where it claims.
// The page plays a climb through this same code (Climb.start / next / settle / pick), so the two cannot drift apart.
//
// What this does not stop: a program that really plays the game, many times, and keeps its best climb. That climb is
// real. It also cannot tell which of another player's fighters you "happened" to meet, so a rival taken from another
// player is only checked to be a legal fighter of the right weight, on a fight where the dice allowed one.
//
// RULES names the exact rules a climb was played under: it is a fingerprint of every simulation file, written by
// `node tools/stamp.js` (and `node tools/stamp.js --check` fails when it is stale). Climbs made under other rules cannot be
// replayed here, so the ladder shows only climbs made under these rules: a change to the fights starts a fresh ladder.
const RULES='3e4a546933';
// A climb earns two second chances: a shield on reaching rung SHIELD_RUNG, which the player may raise before one fight
// of their choosing (lose that fight and the climb goes on), and an extra life after clearing rung LIFE_RUNG, which is
// spent by itself on the next loss. Either way a saved loss brings a new rival on the same rung, and no boon.
// A draw (both fall in the same instant) does the same and spends nothing.
// FRIEND_CHANCE of fights may be against another player's fighter; a class met in the last CLASS_GAP fights is not
// picked again for a house rival.
const SHIELD_RUNG=5,LIFE_RUNG=10,FRIEND_CHANCE=.3,CLASS_GAP=5,PROOF_FIGHTS=400,PROOF_CHARS=24000;
function mix32(a,b,c){
  let h=(a>>>0)^0x9e3779b9;
  h=Math.imul(h^(b>>>0),0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;
  h=Math.imul(h^(c>>>0),0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;
  return h>>>0;
}
const Climb={
  start(seed,key,str,size,name,color){
    return {seed:seed>>>0,key,str,size,build:makeBuild(key,str,size,name,color),rung:1,n:0,shield:0,gotShield:false,life:0,gotLife:false,
      met:[],log:[],rival:null,friend:null,fseed:0,choice:null,last:'',earned:'',over:false,cleared:0};
  },
  // Another player's fighter as a rival on this rung: cut back to the boons a house rival would have at this height,
  // topped up with random ones if it has fewer, and scaled like any rival. p = {k,s,z,u[,n,c]}.
  // strict (checking a proof): every boon listed must be one that was really applied.
  friend(p,rung,R,strict){
    if(!p||typeof p!=='object'||!FIGHTERS[p.k]||![0,1,2].includes(p.s)||![0,1,2].includes(p.z))return null;
    const list=Array.isArray(p.u)?p.u:[],b=makeBuild(p.k,rung>1?p.s:-1,p.z,p.n,p.c),n=Math.floor((rung-1)*RIVAL_UPS),used=[];
    for(let k=0;k<list.length&&k<200&&used.length<n;k++){
      const id=list[k];
      if(typeof id!=='string'||!UPGRADES[id])return null;
      if(canTake(b,id)){addUpgrade(b,id);used.push(id)}else if(strict)return null;
    }
    if(strict&&used.length!==list.length)return null;
    for(let k=0;k<n*2&&b.ups.length<n;k++){const o=offers(b,R,1);if(!o.length)break;addUpgrade(b,o[0])}
    const sc=rivalScale(rung);b.hp*=sc;b.dmg*=sc;
    return {b,spec:{k:p.k,s:p.s,z:p.z,u:used}};
  },
  // Step 1 of a fight: who stands on this rung. `friend` is another player's fighter the caller would like to meet, or
  // null; it is used only when this fight's roll allows one. Sets st.rival and st.fseed (the seed of the fight itself).
  next(st,friend,strict){
    st.earned='';
    if(st.rung>=SHIELD_RUNG&&!st.gotShield){st.gotShield=true;st.shield=1;st.earned='shield'}
    if(st.rung>LIFE_RUNG&&!st.gotLife){st.gotLife=true;st.life=1;st.earned=st.earned?'both':'life'}
    const R=mulberry32(mix32(st.seed,st.n,1)),roll=R();
    let b=null;st.friend=null;
    if(friend&&roll<FRIEND_CHANCE){const x=Climb.friend(friend,st.rung,R,strict);if(x){b=x.b;st.friend=x.spec}}
    if(!b){b=rival(st.rung,R);for(let k=0;k<12&&st.met.includes(b.key);k++)b=rival(st.rung,R)}
    st.met.push(b.key);if(st.met.length>CLASS_GAP)st.met.shift();
    st.rival=b;st.fseed=mix32(st.seed,st.n,2)&0x7fffffff;
    return b;
  },
  // Step 2: the fight m is over. armed = the shield was raised for it. Returns 'pick' (a boon is owed: st.choice),
  // 'next' (another fight on st.rung) or 'over'. st.last says what happened: won, draw, shield, life or lost.
  settle(st,m,armed){
    armed=!!armed&&st.shield>0;
    st.log.push([st.friend||0,armed?1:0,-1]);
    if(armed)st.shield=0;                                  // raised for this fight, win or lose
    const n=st.n;st.n++;st.choice=null;
    if(m.draw){if(armed)st.shield=1;st.last='draw';return 'next'}
    if(m.winner===0){
      st.last='won';
      st.choice=offers(st.build,mulberry32(mix32(st.seed,n,3)),3);
      if(!st.choice.length){st.choice=null;st.rung++;return 'next'}     // nothing left to take: just keep climbing
      return 'pick';
    }
    if(armed){st.last='shield';return 'next'}
    if(st.life>0){st.life=0;st.last='life';return 'next'}
    st.last='lost';st.over=true;st.cleared=st.rung-1;
    return 'over';
  },
  pick(st,i){
    if(!st.choice||!Number.isInteger(i)||i<0||i>=st.choice.length)return false;
    addUpgrade(st.build,st.choice[i]);st.log[st.log.length-1][2]=i;st.choice=null;st.rung++;
    return true;
  },
  // what an entry carries: small text, so it travels and stores as one value
  proof(st){return JSON.stringify({s:st.seed,f:st.log})},
  parse(text){
    try{
      if(typeof text!=='string'||text.length>PROOF_CHARS)return null;
      const P=JSON.parse(text);
      if(!P||!Number.isInteger(P.s)||P.s<0||P.s>4294967295||!Array.isArray(P.f)||!P.f.length||P.f.length>PROOF_FIGHTS)return null;
      return P;
    }catch(e){return null}
  },
  play(a,b,seed){const m=createMatch(a,b,seed);let k=0;while(!m.over&&k++<9000){m.step();m.events.length=0}return m},
  // Plays a claimed climb again, one fight per step() so a page can spread the work over many frames.
  // e = {key,str,size,ups,cleared,proof} with proof as parsed by Climb.parse. Ends with done, ok and (when not ok) why.
  checker(e){
    const P=e&&e.proof,C={done:false,ok:false,why:'',fights:0,step:null};
    const end=(ok,why)=>{C.done=true;C.ok=ok;C.why=why||'';return C};
    if(!P||!FIGHTERS[e.key]||![0,1,2].includes(e.str)||![0,1,2].includes(e.size)){C.step=()=>end(false,'no proof');return C}
    const st=Climb.start(P.s,e.key,e.str,e.size);
    let i=0;
    C.step=()=>{
      if(C.done)return C;
      try{
        const x=P.f[i++];
        if(!Array.isArray(x)||x.length!==3)return end(false,'a fight that cannot be read');
        const fr=x[0]&&typeof x[0]==='object'?x[0]:null;
        if(x[0]&&!fr)return end(false,'a fight that cannot be read');
        Climb.next(st,fr,true);
        if(fr&&!st.friend)return end(false,'a rival the rules do not allow');
        if(x[1]&&!(st.shield>0))return end(false,'a shield that was not held');
        const m=Climb.play(st.build,st.rival,st.fseed);
        if(!m.over)return end(false,'a fight that does not end');
        C.fights++;
        const r=Climb.settle(st,m,!!x[1]);
        if(r==='pick'){if(!Climb.pick(st,x[2]))return end(false,'a boon that was not offered')}
        else if(x[2]!==-1)return end(false,'a boon that was not earned');
        if(r==='over'){
          if(i!==P.f.length)return end(false,'fights after the last one');
          if(st.cleared!==e.cleared)return end(false,'it ends on rung '+st.cleared+', not '+e.cleared);
          if(st.build.ups.join(',')!==(e.ups||[]).join(','))return end(false,'the boons do not match');
          return end(true);
        }
        if(i>=P.f.length)return end(false,'the climb has no end');
      }catch(err){return end(false,'error: '+(err&&err.message||err))}
      return C;
    };
    return C;
  },
  check(e){const C=Climb.checker(e);while(!C.done)C.step();return C},
};
