// Shared ladder for Duel King, stored in a Firebase Realtime Database through its plain web address (no library).
// With NET.url empty the game is offline: the ladder holds house fighters and your own climb only.
//   ladder/<UTC day>/<player id> = {n:name, k:class, s:strength, z:size, c:colour, u:[upgrade ids], r:rungs cleared, t:server time}
//   fighters/<UTC day>/<player id>/<class> = the same shape: that player's best climb today with each class they tried.
// The ladder ranks players by their one best climb; the fighters list is who you can meet as a rival.
// The database's rules open only ladder/<day>/<16-character id> and log/<day>/<id>/<entry>, check each entry's shape
// and refuse deletes; log entries can be added but never changed.
// Everything read back is still checked before use, because anyone may write an entry.
const NET={url:'https://ball-brawl-9b1bb-default-rtdb.firebaseio.com'};   // no trailing slash; '' turns the shared ladder off
const Net={
  rows:[],        // today's entries from everyone, oldest first
  roster:[],      // every fighter anyone has climbed with today (several per player)
  id:'',          // this browser's player id
  ok:false,       // the last pull worked
  busy:false,
  on(){return !!NET.url&&typeof fetch==='function'},
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
  // one stored entry -> a row the game can trust, or null
  clean(id,x){
    if(!/^[a-z0-9]{16}$/.test(id)||!x||typeof x!=='object')return null;
    if(!FIGHTERS[x.k]||![0,1,2].includes(x.s)||![0,1,2].includes(x.z))return null;
    if(!Number.isInteger(x.r)||x.r<1||x.r>200)return null;
    const ups=Array.isArray(x.u)?x.u.filter(u=>typeof u==='string'&&UPGRADES[u]).slice(0,80):[];
    const name=String(x.n||'').replace(/[^A-Za-z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,12)||FIGHTERS[x.k].name;
    const color=/^#[0-9a-fA-F]{6}$/.test(x.c||'')?x.c:FIGHTERS[x.k].color;
    return {id,name,key:x.k,str:x.s,size:x.z,color,ups,cleared:x.r,t:Number.isFinite(x.t)?x.t:0};
  },
  // resolves true when the rows changed
  async pull(day){
    if(!Net.on()||Net.busy)return false;
    Net.busy=true;
    try{
      const r=await fetch(NET.url+'/ladder/'+day+'.json',{cache:'no-store'});
      if(!r.ok)throw new Error('ladder '+r.status);
      const j=await r.json(),rows=[];
      if(j&&typeof j==='object')for(const id of Object.keys(j).slice(0,500)){const e=Net.clean(id,j[id]);if(e)rows.push(e)}
      rows.sort((a,b)=>a.t-b.t||(a.id<b.id?-1:1));
      const sig=rows.map(e=>e.id+e.cleared+e.name+e.key).join('|'),was=Net.rows.map(e=>e.id+e.cleared+e.name+e.key).join('|');
      Net.rows=rows;
      Net.pullRoster(day);
      const first=!Net.ok;Net.ok=true;
      return first||sig!==was;
    }catch(e){Net.ok=false;return false}
    finally{Net.busy=false}
  },
  // everyone's fighters, for the rival pool; the ladder works without it, so a failure here is silent
  async pullRoster(day){
    try{
      const r=await fetch(NET.url+'/fighters/'+day+'.json',{cache:'no-store'});
      if(!r.ok)return;
      const j=await r.json(),out=[];
      if(j&&typeof j==='object')for(const id of Object.keys(j).slice(0,500)){
        const mine=j[id];
        if(mine&&typeof mine==='object')for(const k of Object.keys(mine).slice(0,60)){const e=Net.clean(id,mine[k]);if(e&&e.key===k)out.push(e)}
      }
      Net.roster=out;
    }catch(e){}
  },
  // this player's best climb today with one class
  async pushFighter(day,e){
    if(!Net.on()||!Net.id||!(e.cleared>0))return false;
    try{
      const r=await fetch(NET.url+'/fighters/'+day+'/'+Net.id+'/'+e.key+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({n:e.name,k:e.key,s:e.str,z:e.size,c:e.color,u:e.ups,r:e.cleared,t:{'.sv':'timestamp'}})});
      return r.ok;
    }catch(err){return false}
  },
  // everyone else's fighters: the full list, plus ladder entries from players whose list has not arrived
  rivals(){
    const by=new Map();                                  // one entry per player and class: whichever source has the higher climb
    for(const p of Net.roster.concat(Net.rows)){
      if(p.id===Net.id)continue;
      const k=p.id+':'+p.key,was=by.get(k);
      if(!was||p.cleared>was.cleared)by.set(k,p);
    }
    return [...by.values()];
  },
  // today's best climb for this player; a later, higher climb simply replaces it
  async push(day,e){
    if(!Net.on()||!Net.id||!(e.cleared>0))return false;
    try{
      const r=await fetch(NET.url+'/ladder/'+day+'/'+Net.id+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({n:e.name,k:e.key,s:e.str,z:e.size,c:e.color,u:e.ups,r:e.cleared,t:{'.sv':'timestamp'}})});
      return r.ok;
    }catch(err){return false}
  },
  // Play log, so play can be reviewed later: log/<UTC day>/<player id>/<auto id> = {t:server time, e:event, d:details as JSON text}.
  // It holds this browser's random id, the fighter's name and what happened in the game; nothing else about the person.
  sid:'',seq:0,
  log(day,ev,data){
    if(!Net.on()||!Net.id)return;
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
  others(){return Net.rows.filter(p=>p.id!==Net.id)},
};
