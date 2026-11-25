// Shared ladder for Ball Brawl, stored in a Firebase Realtime Database through its plain web address (no library).
// With NET.url empty the game is offline: the ladder holds house fighters and your own climb only.
//   ladder/<UTC day>/<player id> = {n:name, k:class, s:strength, z:size, c:colour, u:[upgrade ids], r:rungs cleared, t:server time}
// The database's rules open only ladder/<day>/<16-character id>, check each entry's shape, and refuse deletes.
// Everything read back is still checked before use, because anyone may write an entry.
const NET={url:'https://ball-brawl-9b1bb-default-rtdb.firebaseio.com'};   // no trailing slash; '' turns the shared ladder off
const Net={
  rows:[],        // today's entries from everyone, oldest first
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
      const first=!Net.ok;Net.ok=true;
      return first||sig!==was;
    }catch(e){Net.ok=false;return false}
    finally{Net.busy=false}
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
  others(){return Net.rows.filter(p=>p.id!==Net.id)},
};
