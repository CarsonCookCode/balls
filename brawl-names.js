// Names typed by players are shown to everyone: on the ladder, in a rival's banner, and in the daily video. This is the
// filter they pass through, both when typed and, because anyone can write to the ladder directly, again whenever a name
// is read back. A name that fails is replaced (by the fighter's class name), never shown.
// The word lists are stored in ROT13 so this file does not print them in the clear; tools/names-test.js checks the filter.
// A list like this catches the obvious; it cannot catch everything a determined person can spell.
const Names=(()=>{
  const rot=s=>s.replace(/[a-z]/g,c=>String.fromCharCode((c.charCodeAt(0)-97+13)%26+97));
  const ANY="shpx shx spx cuhpx fuvg fug ovgpu ovngpu phag xhag avttre avtre avttn avtn snttbg sntbg sntvg ergneq juber fyhg chffl chfl pbpx qvpx cravf intvan cbea encr encvfg anmv uvgyre xvxr puvax fcvp jrgonpx genaal qlxr cnxv tbbx pbba ornare wvmm jnax onfgneq nffubyr nfubyr nefrubyr qvyqb oybjwbo unaqwbo nany nahf obbo gvgf gvggvrf avccyr ubeal frkl zbyrfg crqb cnrqb vaprfg xxx wvunq vfvf fhvpvqr xvyylbhefrys xlf phzfubg frzra fcrez betnfz zvys uragnv gjng cevpx obyybpx ohttre jnaxre gbffre fxnax gubg urvy ubybpnhfg ylapu greebevfg cvzc ubbxre qbhpur zbgures abapr tbqqnza arteb penpxre ubaxl tlcfl furznyr ubzb dhrre yrfob znfgheong sryyng pyvg grfgvpyr fpebghz".split(' ').map(rot);
  const WORD=new Set("nff nefr gvg phz frk snt ubr ub uryy qnza penc cvff cbb cbbc ohgg avt wrj tnl qvr xvyy tbq wrfhf nyynu fngna kkk ow fgsh jgs ns".split(' ').map(rot));
  const ROLE="nqzva bssvpvny zbqrengbe fgnss fhccbeg qrirybcre lbhghor qhryxvat".split(' ').map(rot);
  const FINE="pbpxngbb pbpxrery crnpbpx unapbpx qvpxraf nanylfg nanybt pnany onany enppbba glpbba pbpbba tencr qencr fpencr gurencvfg cnxvfgna avtre avtrevn fuvgnxr fuvvgnxr pbpxgnvy pbpxcvg ubzre ubzvr puebzr cvzcyr fxhax cevpxyl wncna nanylfvf znahfpevcg ohggrephc ohggba ohggre fphagubecr qvpxfba qvpxvafba".split(' ').map(rot);
  const LEET={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','9':'g'};
  const one=s=>s.replace(/(.)\1+/g,'$1'),two=s=>s.replace(/(.)\1{2,}/g,'$1$1');   // fuuuck -> fuck; booob -> boob
  const dbl=w=>one(w)!==w;                                           // a listed word with a doubled letter is only matched with the double kept
  const letters=s=>s.toLowerCase().replace(/[013457 89]/g,c=>c===' '?' ':LEET[c]);
  // letters, digits and single spaces only, at most 12 characters
  const tidy=s=>String(s==null?'':s).replace(/[^A-Za-z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,12).trim();
  function bad(name){
    const low=letters(tidy(name));
    if(!low.replace(/ /g,''))return false;
    // whole words, read both as typed and with look-alike digits turned into letters
    const toks=low.split(' ').concat(tidy(name).toLowerCase().split(' '));
    if(low.split(' ').every(t=>t.length===1))toks.push(low.replace(/ /g,''));          // a word spelled out with spaces
    for(const w of toks)if(WORD.has(w)||WORD.has(two(w))||WORD.has(w.replace(/(.)\1{2,}/g,'$1')))return true;
    // anywhere: with the spaces out, and with repeated letters squeezed
    let run=low.replace(/ /g,'');
    for(const f of FINE)run=run.split(f).join('.');
    const s1=one(run),s2=two(run);
    for(const w of ANY.concat(ROLE))if(run.includes(w)||(dbl(w)?s2:s1).includes(w))return true;
    return false;
  }
  // the name to show: the tidied name, or the fallback when it is empty or fails the filter
  const safe=(name,fallback)=>{const t=tidy(name);return t&&!bad(t)?t:(fallback||'')};
  return {tidy,bad,safe};
})();
