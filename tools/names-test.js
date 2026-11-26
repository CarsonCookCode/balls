// Checks the name filter (brawl-names.js): ordinary names pass, the listed words do not, however they are dressed up.
// The test names are stored in ROT13 like the filter's own lists.  Usage: node tools/names-test.js
const fs=require('fs'),path=require('path');
const Names=new Function(fs.readFileSync(path.join(__dirname,'..','brawl-names.js'),'utf8')+';return Names')();
const rot=s=>s.replace(/[a-zA-Z]/g,c=>{const b=c<'a'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b)});
const OK=["Goose","Jared","Sir Bounce","Assassin","Titan","Cucumber","Hello","Peacock","Dickens","Raccoon","Master 9000","Scunthorpe X","Bass Drop","Grape","Essex","Button","Classy","Shitake","Night Owl","Analyst","Pass","Glass","Hoot","Shell","Hellion","Buttercup","Skunk","Homer"];
const BAD=["shpx","SHPX lbh","s h p x","shhhhpx","fu1g","5uvg","o1gpu","n f f","nff","Nff Zna","a1tt3e","avttn","u1gy3e","Anmv Ybeq","xlf","x l f","c0ea","phag","Nqzva","0ssvpvny","Qhry Xvat","snttbg","erg4eq","ju0er","c3a1f","frk","F3K","encvfg","phz","gvgf","XXX","q1px","p0px","ch55l"].map(rot);
let fails=0;
for(const n of OK)if(Names.safe(n,'X')!==Names.tidy(n)){fails++;console.log('wrongly refused: '+n)}
for(const n of BAD)if(Names.safe(n,'X')!=='X'){fails++;console.log('wrongly allowed: '+rot(n)+' (shown here in ROT13)')}
if(Names.safe('  <b>Bob</b>  ','X')!=='bBobb')fails++,console.log('tidy: '+Names.safe('  <b>Bob</b>  ','X'));
if(Names.safe('','Knight')!=='Knight'||Names.safe('abcdefghijklmnopq','X').length>12)fails++,console.log('empty or long name');
console.log(fails?fails+' name checks FAILED':'name filter ok: '+OK.length+' ordinary names pass, '+BAD.length+' listed ones are refused');
process.exit(fails?1:0);
