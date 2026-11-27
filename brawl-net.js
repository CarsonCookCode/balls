// Shared ladder for Duel King, stored in a Firebase Realtime Database through its plain web address (no library).
// With NET.url empty the game is offline: the ladder holds house fighters and your own climb only.
//
//   climbs/<UTC day>/<player id>/<climb id> = {n:name, k:class, s:strength, z:size, c:colour, u:[boon ids], r:rungs cleared,
//                                              t:server time, v:rules fingerprint, p:proof}
// A player adds one entry for each climb that beats their best with that class today. Entries can be added but never
// changed or deleted (the database's rules allow creating only), so nobody can overwrite someone else's climb.
// The ladder ranks players by their one best climb; every player's best with each class is who you can meet as a rival.
//
// Anyone may write an entry, so nothing read back is trusted:
//   - its shape is checked and its name goes through the name filter (brawl-names.js);
//   - only climbs made under the rules this page runs (RULES, brawl-proof.js) are read at all;
//   - its proof is played again (Climb.checker), a fight at a time between frames. NET.proof says what a failed check
//     means: 'enforce' shows only climbs that pass; 'check' keeps showing the entry and only records the verdict in the
//     play log. It ran on 'check' until Build 52: 1,209 honest climbs from iPhones, Android, Chrome and Firefox all passed.
//   - a copy of someone else's climb (the same proof under another id) loses to the earlier one;
//   - every rival it says it met from another player must be on the day's ladder, as that fighter was on that rung.
// The older ladder/ and fighters/ lists (entries with no proof) are no longer read.
const NET={url:'https://ball-brawl-9b1bb-default-rtdb.firebaseio.com',proof:'enforce'};   // url: no trailing slash; '' turns the shared ladder off
const Net={
  rows:[],        // each other player's best climb today (as far as it is believed), oldest first
  roster:[],      // every fighter anyone has climbed with today: each player's best with each class
  id:'',          // this browser's player id
  ok:false,       // the last pull worked
  busy:false,
  strict:false,   // the automatic video sets this: only proven climbs, whatever NET.proof says, and nothing is written
  all:[],         // every readable entry of the day
  verdict:new Map(),queue:[],now:null,told:new Set(),
  on(){return !!NET.url&&typeof fetch==='function'},
  enforce(){return Net.strict||NET.proof==='enforce'},
  init(){
    try{
      let id=localStorage.getItem('brawl.pid');
      if(!/^[a-z0-9]{16}$/.test(id||'')){
        id='';for(let i=0;i<16;i++)id+='abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random()*36)|0];
        localStorage.setItem('brawl.pid',id);
      }
      Net.id=id;
    }catch(e){Net.id='';for(let i=0;i<16;i++)Net.id+='abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random()*36)|0]}
  },
  dayStart(day){const t=Date.parse(day+'T00:00:00Z');return Number.isFinite(t)?t:0},
  // one stored entry -> a row the game can use, or null
  clean(id,cid,x,day){
    if(!/^[a-z0-9]{16}$/.test(id)||!/^[a-z0-9]{1,8}$/.test(cid)||!x||typeof x!=='object')return null;
    if(x.v!==RULES)return null;                                        // played under other rules: cannot be compared or replayed
    if(!FIGHTERS[x.k]||![0,1,2].includes(x.s)||![0,1,2].includes(x.z))return null;
    if(!Number.isInteger(x.r)||x.r<1||x.r>200)return null;
    const t=Number.isFinite(x.t)?x.t:0,d0=Net.dayStart(day);
    if(d0&&(t<d0-60000||t>d0+86400000+600000))return null;            // written outside its day (the time is the server's)
    const ups=Array.isArray(x.u)?x.u.filter(u=>typeof u==='string'&&UPGRADES[u]).slice(0,220):[];
    const name=Names.safe(x.n,FIGHTERS[x.k].name);
    const color=/^#[0-9a-fA-F]{6}$/.test(x.c||'')?x.c:FIGHTERS[x.k].color;
    const text=typeof x.p==='string'?x.p:'';
    return {id,cid,name,key:x.k,str:x.s,size:x.z,color,ups,cleared:x.r,t,text,proof:Climb.parse(text)};
  },
  vkey:e=>e.id+'/'+e.cid,
  // resolves true when what the ladder shows has changed
  async pull(day){
    if(!Net.on()||Net.busy)return false;
    Net.busy=true;
    try{
      const r=await fetch(NET.url+'/climbs/'+day+'.json',{cache:'no-store'});
      if(!r.ok)throw new Error('ladder '+r.status);
      const j=await r.json(),all=[];
      if(j&&typeof j==='object')for(const id of Object.keys(j).slice(0,600)){
        const mine=j[id];
        if(mine&&typeof mine==='object')for(const cid of Object.keys(mine).slice(0,120)){const e=Net.clean(id,cid,mine[cid],day);if(e)all.push(e)}
      }
      all.sort((a,b)=>a.t-b.t||(Net.vkey(a)<Net.vkey(b)?-1:1));
      // a climb copied under another id: the earliest keeps it
      const seen=new Map();
      for(const e of all){if(!e.text)continue;const was=seen.get(e.text);if(was&&was.id!==e.id)e.copy=true;else if(!was)seen.set(e.text,e)}
      Net.all=all;
      for(const e of all){
        const k=Net.vkey(e);
        if(e.id===Net.id||e.copy||Net.verdict.has(k)||Net.queue.some(q=>Net.vkey(q)===k))continue;
        Net.queue.push(e);
      }
      const first=!Net.ok;Net.ok=true;
      return Net.settle()||first;
    }catch(e){Net.ok=false;return false}
    finally{Net.busy=false}
  },
  believed(e){
    if(e.copy)return false;
    if(!Net.enforce())return true;
    const v=Net.verdict.get(Net.vkey(e));
    return !!(v&&v.ok);
  },
  // rebuilds rows and roster from the entries that are believed; true when they changed
  settle(){
    const best=new Map(),top=new Map();
    for(const e of Net.all){
      if(e.id===Net.id||!Net.believed(e))continue;
      const k=e.id+':'+e.key,was=best.get(k);
      if(!was||e.cleared>was.cleared)best.set(k,e);
      const w2=top.get(e.id);
      if(!w2||e.cleared>w2.cleared)top.set(e.id,e);
    }
    const roster=[...best.values()],rows=[...top.values()];
    const sig=a=>a.map(e=>Net.vkey(e)+e.name).join('|'),changed=sig(roster)!==sig(Net.roster);
    Net.roster=roster;Net.rows=rows;
    return changed;
  },
  pending(){return Net.queue.length+(Net.now?1:0)},
  // Plays waiting climbs again for up to `ms` milliseconds. True when the ladder changed because of it.
  // onVerdict(entry, verdict) is told about each finished check.
  verifyStep(ms,onVerdict){
    const t0=Date.now();let changed=false;
    while(Net.pending()&&Date.now()-t0<ms){
      if(!Net.now){const e=Net.queue.shift();Net.now={e,c:Climb.checker(e,(spec,rung)=>Net.knows(e,spec,rung))}}
      const N=Net.now;
      N.c.step();
      if(N.c.done){
        Net.now=null;
        Net.verdict.set(Net.vkey(N.e),{ok:N.c.ok,why:N.c.why,fights:N.c.fights});
        if(onVerdict)try{onVerdict(N.e,N.c)}catch(err){}
        if(Net.enforce())changed=true;
      }
    }
    return changed&&Net.settle();
  },
  // A rival named in climb e's proof must be a fighter that is really on the day's ladder: another player's, written
  // before e was, that reached that rung with exactly those upgrades, and that has not failed its own check.
  knows(e,spec,rung){
    const u=spec.u.join(',');
    return Net.all.some(x=>x.id!==e.id&&!x.copy&&x.key===spec.k&&x.str===spec.s&&x.size===spec.z&&x.cleared>=rung-1&&x.t<=e.t&&
      x.ups.slice(0,rung-1).join(',')===u&&!(Net.verdict.has(Net.vkey(x))&&!Net.verdict.get(Net.vkey(x)).ok));
  },
  rejected(){return Net.all.filter(e=>e.copy||(Net.verdict.has(Net.vkey(e))&&!Net.verdict.get(Net.vkey(e)).ok)).map(e=>({id:e.id.slice(0,6),key:e.key,cleared:e.cleared,why:e.copy?'a copy of another climb':Net.verdict.get(Net.vkey(e)).why}))},
  // everyone else's fighters: each player's best with each class
  rivals(){return Net.roster.slice()},
  // one finished climb of this player's. e = {name,key,str,size,color,ups,cleared,seed,proof}
  async pushClimb(day,e){
    if(!Net.on()||Net.strict||!Net.id||!(e.cleared>0)||typeof e.proof!=='string')return false;
    try{
      const r=await fetch(NET.url+'/climbs/'+day+'/'+Net.id+'/'+(e.seed>>>0).toString(36)+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({n:e.name,k:e.key,s:e.str,z:e.size,c:e.color,u:e.ups,r:e.cleared,t:{'.sv':'timestamp'},v:RULES,p:e.proof})});
      return r.ok;
    }catch(err){return false}
  },
  // Play log, so play can be reviewed later: log/<UTC day>/<player id>/<auto id> = {t:server time, e:event, d:details as JSON text}.
  // It holds this browser's random id, the fighter's name and what happened in the game; nothing else about the person.
  sid:'',seq:0,
  log(day,ev,data){
    if(!Net.on()||Net.strict||!Net.id)return;
    try{
      if(!Net.sid)for(let i=0;i<6;i++)Net.sid+='abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random()*36)|0];
      const i=Net.seq++;
      let d=JSON.stringify(Object.assign({s:Net.sid,i},data||{}));
      if(d.length>1500)d=JSON.stringify({s:Net.sid,i,cut:d.length});
      const p=fetch(NET.url+'/log/'+day+'/'+Net.id+'.json',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({t:{'.sv':'timestamp'},e:String(ev).slice(0,16),d})});
      if(p&&p.catch)p.catch(()=>{});
    }catch(e){}
  },
  others(){return Net.rows.slice()},
};
