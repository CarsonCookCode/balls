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
// real. Nor can it tell which of the other players' fighters you "happened" to meet, or whether the house stood in
// because nobody had reached that rung yet. What it does check is that a rival taken from another player is a real one:
// the checker is handed `known`, which looks the rival up on the day's ladder (Net.knows in brawl-net.js).
//
// RULES names the exact rules a climb was played under: it is a fingerprint of every simulation file, written by
// `node tools/stamp.js` (and `node tools/stamp.js --check` fails when it is stale). Climbs made under other rules cannot be
// replayed here, so the ladder shows only climbs made under these rules: a change to the fights starts a fresh ladder.
const RULES='efca31d7d5';
// A climb starts with LIVES lives (the page shows them as hearts): a lost fight costs one, and the climb ends with the
// last. One more is earned after clearing rung LIFE_RUNG. A shield is earned on reaching rung SHIELD_RUNG, which the
// player may raise before one fight of their choosing: lose that fight and no life is lost. A loss that does not end
// the climb brings a new rival on the same rung, and no upgrade. A draw (both fall in the same instant) does the same
// and costs nothing. st.life counts the lives to spare, so the climb has st.life+1 hearts.
// A class met in the last CLASS_GAP fights is not picked again for a house rival.
// One fighter of another player's (that player's fighter of that class) is met at most once in a climb, on whatever
// rung: st.seen lists the ones met. When none is left that reached the rung, the house sends a fighter.
const LIVES=2,SHIELD_RUNG=5,LIFE_RUNG=10,CLASS_GAP=5,PROOF_FIGHTS=400,PROOF_CHARS=24000;
function mix32(a,b,c){
  let h=(a>>>0)^0x9e3779b9;
  h=Math.imul(h^(b>>>0),0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;
  h=Math.imul(h^(c>>>0),0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;
  return h>>>0;
}
const Climb={
  start(seed,key,str,size,name,color){
    return {seed:seed>>>0,key,str,size,build:makeBuild(key,str,size,name,color),rung:1,n:0,shield:0,gotShield:false,life:LIVES-1,gotLife:false,
      met:[],seen:[],log:[],rival:null,friend:null,fseed:0,choice:null,last:'',earned:'',over:false,cleared:0};
  },
  // Another player's fighter as the rival on this rung: exactly as its owner had it there, which is its class, strength
  // and size with the first rung-1 upgrades it took, in the order it took them. Only the first rungs' easing is applied.
  // p = {i,k,s,z,u[,n,c]}: i is its owner's id on the ladder; u may be the fighter's whole list. Null when it never stood
  // on this rung, or is not a legal fighter. strict (checking a proof): u must be exactly the upgrades it had on this rung.
  unit:p=>p.i+':'+p.k,
  friend(p,rung,strict){
    if(!p||typeof p!=='object'||typeof p.i!=='string'||!/^[a-z0-9]{16}$/.test(p.i)||!FIGHTERS[p.k]||![0,1,2].includes(p.s)||![0,1,2].includes(p.z))return null;
    const list=Array.isArray(p.u)?p.u:[],n=rung-1,b=makeBuild(p.k,p.s,p.z,p.n,p.c);
    if(list.length<n||(strict&&list.length!==n))return null;
    for(let k=0;k<n;k++){
      const id=list[k];
      if(typeof id!=='string'||!UPGRADES[id]||!canTake(b,id))return null;
      addUpgrade(b,id);
    }
    const sc=easeScale(rung);b.hp*=sc;b.dmg*=sc;
    return {b,spec:{i:p.i,k:p.k,s:p.s,z:p.z,u:b.ups.slice()}};
  },
  // Step 1 of a fight: who stands on this rung. `friend` is another player's fighter that reached this rung and has not
  // been met in this climb, or null when there is none: then the house sends one. Sets st.rival and st.fseed (the seed
  // of the fight itself).
  next(st,friend,strict){
    st.earned='';
    if(st.rung>=SHIELD_RUNG&&!st.gotShield){st.gotShield=true;st.shield=1;st.earned='shield'}
    if(st.rung>LIFE_RUNG&&!st.gotLife){st.gotLife=true;st.life++;st.earned=st.earned?'both':'life'}
    const R=mulberry32(mix32(st.seed,st.n,1));
    let b=null;st.friend=null;
    if(friend&&!st.seen.includes(Climb.unit(friend))){const x=Climb.friend(friend,st.rung,strict);if(x){b=x.b;st.friend=x.spec;st.seen.push(Climb.unit(x.spec))}}
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
    if(st.life>0){st.life--;st.last='life';return 'next'}
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
  // known(spec,rung), when given, says whether another player's fighter {i,k,s,z,u} really reached that rung on the ladder.
  checker(e,known){
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
        if(fr&&!st.friend)return end(false,typeof fr.i==='string'&&st.seen.includes(Climb.unit(fr))?'a rival met twice in one climb':'a rival the rules do not allow');
        if(fr&&known&&!known(st.friend,st.rung))return end(false,'a rival who is not on the ladder');
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
  check(e,known){const C=Climb.checker(e,known);while(!C.done)C.step();return C},
};
