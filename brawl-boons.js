// Forty more upgrades for Duel King. Pure simulation: loads in Node with only brawl-sim.js before it.
// Every upgrade here works through the hooks described above UPGRADES in brawl-sim.js; none of them is read by createMatch itself.
// The rule they are built to: nothing is better than something else in every situation. Each one is strong for some
// fighters, sizes, speeds or moments of a fight and weak for others, and anything that multiplies is capped.
// Every top-level name here starts with bn/BN so it cannot clash with the other files.

// Which classes make minions or fire shots is found by playing a few seconds of a fight once, so classes from any pack are covered.
const BN_SEEN={};
function bnSeen(key){
  if(BN_SEEN[key])return BN_SEEN[key];
  const out=BN_SEEN[key]={minions:false,shots:false};        // set first: the trial fight below must not ask again
  try{
    const m=createMatch(makeBuild(key,-1,1),makeBuild('blade',-1,1),4242);
    for(let k=0;k<900&&!m.over&&!(out.minions&&out.shots);k++){
      m.step();m.events.length=0;
      if(!out.minions)for(const q of m.minions)if(q.own===0){out.minions=true;break}
      if(!out.shots)for(const q of m.bullets)if(q.own===0){out.shots=true;break}
    }
  }catch(e){}
  return out;
}
const bnAim=(f,e,away)=>{                                   // point a fighter straight at (or away from) the other, keeping its pace
  const d=Math.hypot(e.x-f.x,e.y-f.y)||1,sp=Math.hypot(f.vx,f.vy)||f.speed,k=away?-1:1;
  f.vx=(e.x-f.x)/d*sp*k;f.vy=(e.y-f.y)/d*sp*k;
};
const bnHeal=(f,h,m)=>{h=Math.min(h,f.max-f.hp);if(h>.05){f.hp+=h;if(h>=1)m.events.push({k:'heal',x:f.x,y:f.y,dmg:h,i:f.i})}};

Object.assign(UPGRADES,{
  // ----- damage with a price or a condition
  glass:    {name:'Glass cannon', text:'+60% damage, -15% health',max:2,apply:b=>{b.ad+=.6;b.ah-=.15}},
  heavyhit: {name:'Heavy hands',  text:'+30% damage, -15% speed at everything',max:2,apply:b=>{b.ad+=.3;b.as-=.15}},
  bloodpact:{name:'Blood pact',   text:'+50% damage; every hit you land costs you 2% of your health',max:2,apply:b=>{b.ad+=.5},
    hooks:{hit(f,v,dmg,m,n){f.hp=Math.max(1,f.hp-f.max*.02*n);m.events.push({k:'proc',id:'bloodpact',i:f.i})}}},
  wild:     {name:'Wild swings',  text:'Every hit deals anywhere from 40% to 200% of its damage',max:1,
    hooks:{deal(f,v,dmg,m){const k=.4+1.6*m.rnd();m.events.push({k:'proc',id:'wild',i:f.i,n:k});return dmg*k}}},
  execute:  {name:'Executioner',  text:'+70% damage to a rival below 40% health',max:2,
    hooks:{deal(f,v,dmg,m,n){if(!(v.hp<v.max*.4))return dmg;m.events.push({k:'proc',id:'execute',i:f.i});return dmg*(1+.7*n)}}},
  blitz:    {name:'Blitz',        text:'+50% damage for the first 6 seconds of a fight',max:2,
    hooks:{deal(f,v,dmg,m,n){if(!(m.t<6))return dmg;m.events.push({k:'proc',id:'blitz',i:f.i});return dmg*(1+.5*n)}}},
  slowburn: {name:'Slow burn',    text:'6% more damage for every 2 seconds the fight lasts, up to 60%',max:2,
    hooks:{deal:(f,v,dmg,m,n)=>dmg*(1+Math.min(.6,.06*Math.floor(m.t/2))*n)}},
  combo:    {name:'Combo',        text:'Each hit within 2 seconds of your last deals 9% more, up to 45%',max:2,
    hooks:{deal(f,v,dmg,m,n){const u=f.u;u.cb=m.t-(u.cbT===undefined?-9:u.cbT)<2?Math.min(5,(u.cb||0)+1):0;u.cbT=m.t;if(u.cb>0)m.events.push({k:'proc',id:'combo',i:f.i,n:u.cb});return dmg*(1+.09*u.cb*n)}}},
  patient:  {name:'Patience',     text:'A hit after 2.5 seconds without landing one deals 60% more',max:2,
    hooks:{deal(f,v,dmg,m,n){const u=f.u,ok=m.t-(u.ptT===undefined?-9:u.ptT)>=2.5;u.ptT=m.t;if(ok)m.events.push({k:'proc',id:'patient',i:f.i});return ok?dmg*(1+.6*n):dmg}}},
  riposte:  {name:'Riposte',      text:'After you are hit, your next hit within 2 seconds deals 50% more',max:2,
    hooks:{hurt(f,s,dmg,m){f.u.rpT=m.t+2},deal(f,v,dmg,m,n){if(m.t<(f.u.rpT||0)){f.u.rpT=0;m.events.push({k:'proc',id:'riposte',i:f.i});return dmg*(1+.5*n)}return dmg}}},
  momentum: {name:'Momentum',     text:'Fast fighters hit up to 50% harder; slow ones gain nothing',max:2,
    hooks:{deal(f,v,dmg,m,n){const k=Math.min(.5,Math.max(0,1.1*(f.speed/170-1)));if(k>.05)m.events.push({k:'proc',id:'momentum',i:f.i});return dmg*(1+k*n)}}},
  bully:    {name:'Bully',        text:'50% more damage to a rival smaller than you',max:2,
    hooks:{deal(f,v,dmg,m,n){if(!(v.r<f.r-.5))return dmg;m.events.push({k:'proc',id:'bully',i:f.i});return dmg*(1+.5*n)}}},
  underdog: {name:'Underdog',     text:'+60% damage to a rival bigger than you',max:2,
    hooks:{deal(f,v,dmg,m,n){if(!(v.r>f.r+.5))return dmg;m.events.push({k:'proc',id:'underdog',i:f.i});return dmg*(1+.6*n)}}},
  ricochet: {name:'Ricochet',     text:'Your next hit within 0.6 seconds of a wall bounce deals 45% more',max:2,
    hooks:{bounce(f,m){f.u.rcT=m.t+.6},deal(f,v,dmg,m,n){if(m.t<(f.u.rcT||0)){f.u.rcT=0;m.events.push({k:'proc',id:'ricochet',i:f.i});return dmg*(1+.45*n)}return dmg}}},
  // ----- answers to a rival that stacked one thing
  giantkill:{name:'Giant slayer', text:'Twice a second, a hit also takes 4% of the rival\'s remaining health',max:2,
    hooks:{deal(f,v,dmg,m,n){if(m.t-(f.u.gkT===undefined?-9:f.u.gkT)<.5)return dmg;f.u.gkT=m.t;m.events.push({k:'proc',id:'giantkill',i:f.i});return dmg+Math.max(0,v.hp)*.04*n}}},
  sunder:   {name:'Sunder',       text:'Hits make the rival take 6% more, up to 36%. Its shield blocks only once',max:2,
    hooks:{
      tick(f,e){if(e.shield&&e.shieldT>0)e.shield=0},
      hit(f,v,dmg,m,n){const u=f.u;if(m.t-(u.suT===undefined?-9:u.suT)>=.3){u.suT=m.t;if((u.su||0)<6)m.events.push({k:'proc',id:'sunder',i:f.i});u.su=Math.min(6,(u.su||0)+1)}},
      deal:(f,v,dmg,m,n)=>dmg*(1+.06*(f.u.su||0)*n)}},
  decay:    {name:'Decay',        text:'After 6 seconds the rival loses 1.8% health a second and heals half as much',max:2,
    hooks:{tick(f,e,m,n){
      const u=f.u;
      if(u.dcH>0&&e.hp>u.dcH&&e.hp-u.dcH<e.max*.2)e.hp-=(e.hp-u.dcH)*.5;      // whatever it healed since last step, half is undone
      if(m.t>6&&e.hp>0){e.hp-=e.max*.018*n*DT;if(!u.dcOn){u.dcOn=1;m.events.push({k:'text',x:e.x,y:e.y-e.r,txt:'Withering'});m.events.push({k:'proc',id:'decay',i:f.i})}}
      u.dcH=e.hp;
    }}},
  // ----- taking less
  dodge:    {name:'Nimble',       text:'12% chance to avoid a hit entirely; 22% if you are small',max:2,
    hooks:{guard(f,s,dmg,m,n){if(m.rnd()>=(f.r<=20?.22:.12)*n)return 1;m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Dodged'});m.events.push({k:'proc',id:'dodge',i:f.i});return 0}}},
  plating:  {name:'Thick hide',   text:'Every hit loses 3 damage (never more than half of it)',max:2,
    hooks:{take(f,s,dmg,m,n){m.events.push({k:'proc',id:'plating',i:f.i});return Math.max(dmg*.5,dmg-3*n)}}},
  brace:    {name:'Brace',        text:'Take 30% less from any hit worth over 15% of your health',max:2,
    hooks:{take(f,s,dmg,m,n){if(!(dmg*f.armor>f.max*.15))return dmg;m.events.push({k:'proc',id:'brace',i:f.i});return dmg*(n>1?.5:.7)}}},
  rebound:  {name:'Rebound',      text:'For half a second after a wall bounce, take 35% less damage',max:2,
    hooks:{bounce(f,m){f.u.rbT=m.t+.5},take(f,s,dmg,m,n){if(!(m.t<(f.u.rbT||0)))return dmg;m.events.push({k:'proc',id:'rebound',i:f.i});return dmg*(1-.35*n*(n>1?.85:1))}}},
  clutch:   {name:'Clutch',       text:'Below 30% health, take 50% less damage',max:2,
    hooks:{take(f,s,dmg,m,n){if(!(f.hp<f.max*.3))return dmg;m.events.push({k:'proc',id:'clutch',i:f.i});return dmg*(n>1?.35:.5)}}},
  barrier:  {name:'Barrier',      text:'Start every fight behind a barrier that soaks up 40 damage',max:2,
    hooks:{init(f,n){f.u.bar=40*n},take(f,s,dmg,m){const u=f.u;if(!(u.bar>0))return dmg;const a=Math.min(u.bar,dmg);u.bar-=a;m.events.push({k:'proc',id:'barrier',i:f.i,n:u.bar>0?u.bar:0});if(!(u.bar>0))m.events.push({k:'text',x:f.x,y:f.y-f.r,txt:'Barrier down'});return dmg-a}}},
  // ----- hitting back, healing, last gasps
  static:   {name:'Static',       text:'When you are hit, zap the attacker for 4.5 (once a second)',max:3,
    hooks:{hurt(f,s,dmg,m,n){if(m.t<(f.u.stT||0)||s.hp<=0)return;f.u.stT=m.t+1;m.events.push({k:'zap',x:f.x,y:f.y,x2:s.x,y2:s.y,i:f.i});m.events.push({k:'proc',id:'static',i:f.i});m.hurt(s,4.5*n*f.dmgMul,f,true)}}},
  icyskin:  {name:'Icy skin',     text:'Whoever hits you is slowed for 2 seconds. Deal 20% more to slowed rivals',max:1,
    hooks:{hurt(f,s,dmg,m){s.slowT=Math.max(s.slowT,2);m.events.push({k:'proc',id:'icyskin',i:f.i})},deal:(f,v,dmg)=>v.slowT>0||v.stunT>0?dmg*1.2:dmg}},
  mending:  {name:'Mending',      text:'Each wall bounce heals 4% of the health you are missing',max:2,
    hooks:{bounce(f,m,n,x,y){if(m.t<(f.u.mdT||0)||f.hp<=0)return;f.u.mdT=m.t+.6;if(f.hp<f.max-1)m.events.push({k:'proc',id:'mending',i:f.i,x,y});bnHeal(f,(f.max-f.hp)*.04*n,m)}}},
  siphon:   {name:'Siphon',       text:'Drain 2 health a second from a rival within arm\'s reach',max:3,
    hooks:{tick(f,e,m,n){
      if(e.gone||m.t<(f.u.spT||0)||Math.hypot(e.x-f.x,e.y-f.y)>f.r+e.r+40)return;
      f.u.spT=m.t+1;const d=2*n*f.dmgMul;m.events.push({k:'proc',id:'siphon',i:f.i});m.hurt(e,d,f,true);bnHeal(f,d,m);
    }}},
  adrenaline:{name:'Adrenaline',  text:'Below half health, spin and strike 70% faster',max:2,
    hooks:{tick(f,e,m,n){const on=f.hp<f.max*.5,k=1+.7*n;if(on&&!f.u.adr){f.u.adr=1;f.spdMul*=k;m.events.push({k:'proc',id:'adrenaline',i:f.i})}else if(!on&&f.u.adr){f.u.adr=0;f.spdMul/=k}}}},
  partingshot:{name:'Parting shot',text:'The first time you would fall, blast the rival for 22% of its health',max:1,
    hooks:{lethal(f,e,m){if(f.u.ps||e.hp<=0)return;f.u.ps=1;m.events.push({k:'blast',x:f.x,y:f.y,r:90,i:f.i});m.events.push({k:'proc',id:'partingshot',i:f.i});m.hurt(e,e.max*.22/(e.armor||1),f,true)}}},
  // ----- where you go and what you bump into
  lunge:    {name:'Lunge',        text:'Every 3.5 seconds, charge the rival. The first hit after deals 75% more',max:2,
    hooks:{init(f,n){f.u.lgT=2},
      tick(f,e,m,n){f.u.lgT-=DT;if(f.u.lgT>0||e.gone)return;f.u.lgT=n>1?2.2:3.5;f.u.lgH=m.t+1.5;bnAim(f,e,false);m.events.push({k:'proc',id:'lunge',i:f.i})},
      deal(f,v,dmg,m){if(m.t<(f.u.lgH||0)){f.u.lgH=0;return dmg*1.75}return dmg}}},
  keepaway: {name:'Keep away',    text:'Veer away from a close rival every 2.5 seconds, taking 35% less for a second',max:1,
    hooks:{init(f){f.u.kaT=1},
      tick(f,e,m){f.u.kaT-=DT;if(f.u.kaT>0||e.gone||Math.hypot(e.x-f.x,e.y-f.y)>f.r+e.r+70)return;f.u.kaT=2.5;f.u.kaG=m.t+1;bnAim(f,e,true);m.events.push({k:'proc',id:'keepaway',i:f.i})},
      take:(f,s,dmg,m)=>m.t<(f.u.kaG||0)?dmg*.65:dmg}},
  shoulder: {name:'Shoulder charge',text:'Bumping bodies hurts the rival for 6 and shoves it (once a second)',max:3,
    hooks:{bump(f,e,m,n){if(m.t<(f.u.shT||0)||e.gone||f.stunT>0)return;f.u.shT=m.t+1;m.events.push({k:'proc',id:'shoulder',i:f.i});m.hurt(e,6*n*f.dmgMul,f);m.knock(e,f)}}},
  nova:     {name:'Nova',         text:'Every 7 seconds, blast a rival within reach for 12 and throw it back',max:2,
    hooks:{init(f){f.u.nvT=4},tick(f,e,m,n,rage){
      f.u.nvT-=DT;
      if(f.u.nvT>0||e.gone||Math.hypot(e.x-f.x,e.y-f.y)>70+e.r)return;
      f.u.nvT=n>1?4:7;m.events.push({k:'blast',x:f.x,y:f.y,r:70,i:f.i});m.events.push({k:'proc',id:'nova',i:f.i});m.hurt(e,12*f.dmgMul*rage,f);m.knock(e,f);
    }}},
  concuss:  {name:'Concussion',   text:'Every 5 seconds, your next hit dazes the rival for 0.6 seconds',max:1,
    hooks:{hit(f,v,dmg,m){if(m.t<(f.u.ccT===undefined?2:f.u.ccT)||v.hp<=0)return;f.u.ccT=m.t+5;v.stunT=Math.max(v.stunT,.6);m.events.push({k:'text',x:v.x,y:v.y-v.r,txt:'Dazed'});m.events.push({k:'proc',id:'concuss',i:f.i})}}},
  // ----- size
  pocket:   {name:'Pocket-sized', text:'Much smaller, +20% speed, -15% health',max:1,apply:b=>{b.r=Math.max(13,b.r*.74);b.ah-=.15;b.as+=.2}},
  colossus: {name:'Colossus',     text:'Much bigger, +50% health, -15% speed',max:1,apply:b=>{b.r=Math.min(40,b.r*1.3);b.ah+=.5;b.as-=.15}},
  // ----- weapons, minions and shots
  whirlwind:{name:'Whirlwind',    text:'Your blades spin 40% faster and hit 12% harder',max:2,needsArm:true,
    hooks:{init(f,n){f.spin*=1+.4*n;for(const a of f.arms)a.dmg*=1+.12*n}}},
  hornet:   {name:'Hornet',       text:'Every 4 seconds, release a hornet that chases the rival and stings for 6',max:3,
    hooks:{init(f){f.u.hnT=1.5},tick(f,e,m,n){
      f.u.hnT-=DT;if(f.u.hnT>0)return;
      f.u.hnT=4/n;let c=0;for(const q of m.minions)if(q.own===f.i&&q.kind==='hornet')c++;
      if(c<1+n)m.spawn(f,f.x,f.y,{kind:'hornet',r:5,hp:1,dmg:6,sp:200,home:700,life:7,wear:1});
    }}},
  packlead: {name:'Pack leader',  text:'Your minions hit 35% harder and survive one more blow',max:2,only:b=>!!b.p.hornet||bnSeen(b.key).minions,
    hooks:{minion(f,q,m,n){q.dmg*=1+.35*n;q.hp+=q.wear*n;q.life*=1.2;q.lead=1}}},
  rounds:   {name:'Heavy rounds', text:'Your shots hit 40% harder and fly 20% faster',max:2,only:b=>!!b.p.sidearm||bnSeen(b.key).shots,
    hooks:{shot(f,q,m,n){q.d*=1+.4*n;q.vx*=1.2;q.vy*=1.2;q.heavy=1}}},
});
Object.assign(PREFIX,{glass:'Glass',heavyhit:'Heavy',bloodpact:'Bloodbound',wild:'Reckless',execute:'Grim',blitz:'Blitzing',
  slowburn:'Smouldering',combo:'Relentless',patient:'Patient',riposte:'Vengeful',momentum:'Rushing',bully:'Bullying',underdog:'Scrappy',
  ricochet:'Bouncing',giantkill:'Slayer',sunder:'Sundering',decay:'Withering',dodge:'Nimble',plating:'Thick-skinned',
  brace:'Braced',rebound:'Springy',clutch:'Stubborn',barrier:'Warded',static:'Static',icyskin:'Icy',mending:'Mending',siphon:'Draining',
  adrenaline:'Frantic',partingshot:'Spiteful',lunge:'Lunging',keepaway:'Wary',shoulder:'Barging',nova:'Blasting',concuss:'Stunning',pocket:'Pocket',
  colossus:'Colossal',whirlwind:'Spinning',hornet:'Buzzing',packlead:'Swarming',rounds:'Loaded'});
UP_IDS.push('glass','heavyhit','bloodpact','wild','execute','blitz','slowburn','combo','patient','riposte','momentum','bully','underdog',
  
  'ricochet','giantkill','sunder','decay','dodge','plating','brace','rebound','clutch','barrier','static','icyskin','mending','siphon',
  'adrenaline','partingshot','lunge','keepaway','shoulder','nova','concuss','pocket','colossus','whirlwind','hornet','packlead','rounds');
if(typeof MINION_LOOKS!=='undefined'&&MINION_LOOKS.bee&&!MINION_LOOKS.hornet)MINION_LOOKS.hornet=MINION_LOOKS.bee;   // a hornet looks like a bee
