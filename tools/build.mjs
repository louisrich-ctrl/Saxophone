// Builds SEO pages from the fingering data in index.html.
// Usage: node tools/build.mjs [BASE_URL]
//   BASE_URL defaults to https://louisrich-ctrl.github.io/Saxophone
//   After you buy the domain run: node tools/build.mjs https://saxophonefingeringchart.com
import fs from 'node:fs';
import path from 'node:path';
const BASE=(process.argv[2]||'https://louisrich-ctrl.github.io/Saxophone').replace(/\/$/,'');
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const idxPath=path.join(ROOT,'index.html');
let html=fs.readFileSync(idxPath,'utf8');

// ---- load the single source of truth (data + diagram code) from index.html ----
const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
const a=js.indexOf('const L='),b=js.indexOf('let cur=null');
const lib=new Function(js.slice(a,b)+';function setI(k){inst=k}return {L,N,info,dia,CHIP,Y,fOf,INSTR,setI,SONGS,songRun};')();
const {L,N,info,dia,CHIP,Y,fOf,INSTR,setI,SONGS,songRun}=lib;
const IK=Object.keys(INSTR);
// concert pitch and frequency for every instrument
const conc=n=>IK.map(k=>{setI(k);const r={k,I:INSTR[k],concert:info(n).concert,hz:fOf(n)};setI('alto');return r});

// ---- helpers ----
const FING={1:'index finger',2:'middle finger',3:'ring finger'};
const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a.slice(-1);
const hand=(d,name)=>{const p=[...d].map(k=>FING[k]);return p.length?`${name} hand: ${list(p)} down.`:`${name} hand: all fingers up.`};
function nameOf(n){
 const [l,o,acc]=n,i=L.indexOf(l);
 if(acc==='')return{short:l,full:l,slug:l.toLowerCase()+'-'+o,both:l,oct:o,acc};
 if(acc==='#')return{short:l+'♯',full:l+'♯ / '+L[(i+1)%7]+'♭',slug:l.toLowerCase()+'-sharp-'+o,both:`${l} sharp / ${L[(i+1)%7]} flat`,oct:o,acc};
 return{short:l+'♭',full:l+'♭ / '+L[(i+6)%7]+'♯',slug:l.toLowerCase()+'-flat-'+o,both:`${l} flat / ${L[(i+6)%7]} sharp`,oct:o,acc};
}
const hasPalm=f=>/palm/.test(f[3]||'');
function register(f){return f[0]===0?'low register (no octave key)':hasPalm(f)?'high register (palm keys)':'middle register (octave key)'}
function describe(f){
 const parts=[];
 if(f[0])parts.push('Press the octave key with your left thumb.');
 parts.push(hand(f[1],'Left'),hand(f[2],'Right'));
 const ex=(f[3]||'').split(',').filter(Boolean).map(k=>CHIP[k]);
 if(ex.length)parts.push('Also press: '+list(ex)+'.');
 return parts.join(' ');
}
function brief(f){
 const bits=[];
 if(f[0])bits.push('octave key');
 if(f[1])bits.push('left hand '+[...f[1]].join('-'));
 if(f[2])bits.push('right hand '+[...f[2]].join('-'));
 const ex=(f[3]||'').split(',').filter(Boolean).map(k=>CHIP[k].replace(/ \(.*\)/,''));
 return list(bits.concat(ex))||'no keys pressed';
}
function staff(n){
 const d=info(n),y=Y(d.s),x=120,acc=n[2]==='#'?'♯':n[2]==='b'?'♭':'';
 let s='<svg viewBox="0 0 200 140" role="img" aria-label="Written note on the treble staff">';
 [60,70,80,90,100].forEach(v=>s+=`<line x1="4" x2="196" y1="${v}" y2="${v}" stroke="#3a4650"/>`);
 s+=`<text x="8" y="106" font-size="66" fill="#1d2a33" font-family="'Noto Music','Apple Symbols','Segoe UI Symbol',serif">𝄞</text>`;
 for(let q=40;q<=d.s;q+=2)s+=`<line x1="${x-11}" x2="${x+11}" y1="${Y(q)}" y2="${Y(q)}" stroke="#3a4650"/>`;
 for(let q=28;q>=d.s;q-=2)s+=`<line x1="${x-11}" x2="${x+11}" y1="${Y(q)}" y2="${Y(q)}" stroke="#3a4650"/>`;
 s+=`<ellipse cx="${x}" cy="${y}" rx="7" ry="5" transform="rotate(-18 ${x} ${y})" fill="${acc==='♯'?'#d0202f':acc==='♭'?'#1f5fd0':'#1d2a33'}"/>`;
 if(acc)s+=`<text x="${x-14}" y="${y+5}" font-size="17" text-anchor="middle" fill="${acc==='♯'?'#d0202f':'#1f5fd0'}">${acc}</text>`;
 return s+'</svg>';
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const HEADX=`<meta property="og:image" content="${BASE}/assets/og-image.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#10243a"><link rel="manifest" href="${BASE}/manifest.webmanifest"><link rel="apple-touch-icon" href="${BASE}/assets/icon-192.png">`;
const GC='<script data-goatcounter="https://louisdatoy.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';
const FOOT=(p)=>`<p class="small foot"><a href="${p}">Saxophone fingering chart</a> &middot; <a href="${p}beginners/">Beginners: first notes</a> &middot; <a href="${p}songs/">Simple songs</a> &middot; <a href="${p}scales/">Scales</a> &middot; <a href="${p}guides/">Guides</a> &middot; <a href="${p}tuner/">Tuner</a> &middot; <a href="${p}metronome/">Metronome</a> &middot; <a href="${p}print/">Printable chart</a> &middot; <a href="${p}privacy/">Privacy and contact</a></p>`;
const today=new Date().toISOString().slice(0,10);
const notes=N.map((n,i)=>({n,i,nm:nameOf(n),f:n[3],d:info(n)}));

const CSS=`:root{--bg:#fff;--ink:#1d2a33;--mute:#5d6a74;--line:#3a4650;--card:#fff;--bd:#d8dce0;--red:#d0202f;--blue:#1f5fd0}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:17px/1.55 Georgia,"Times New Roman",serif}
header.bar{background:#10243a;border-bottom:4px solid #d9a441}header.bar a{display:block;max-width:760px;margin:0 auto;padding:14px 16px;color:#fff;text-decoration:none;font-weight:700;font-size:19px}
main{max-width:760px;margin:0 auto;padding:18px 16px 40px}h1{font-size:28px;line-height:1.2;margin:0 0 6px}h2{font-size:21px;margin:26px 0 8px}
p{margin:8px 0}.sub{color:var(--mute);font:15px/1.4 system-ui,sans-serif}
.row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin:14px 0}.dia{flex:0 0 150px}.dia svg{width:150px;height:auto;display:block}.stf{flex:0 0 200px}.stf svg{width:200px;height:auto;display:block}
.fing{flex:1;min-width:230px}.fing h3{margin:0 0 4px;font:600 16px system-ui,sans-serif}
.card{border:1px solid var(--bd);border-radius:8px;padding:12px 14px;margin:10px 0}
.btn{display:inline-block;background:#10243a;color:#fff;text-decoration:none;font:600 15px system-ui,sans-serif;padding:10px 16px;border-radius:20px;margin:6px 0}
.nav{display:flex;justify-content:space-between;gap:10px;margin:20px 0;font:15px system-ui,sans-serif}a{color:#1a4f9c}
.play{font:600 15px system-ui,sans-serif;border:1px solid #10243a;background:#10243a;color:#fff;border-radius:20px;padding:9px 16px;cursor:pointer;margin:6px 0}.play:focus-visible{outline:3px solid #d9a441;outline-offset:2px}
.small{font:14px/1.5 system-ui,sans-serif;color:var(--mute)}`;

// ---- note pages ----
const outDir=path.join(ROOT,'notes');
fs.rmSync(outDir,{recursive:true,force:true});
notes.forEach((o,k)=>{
 const {nm,f,d,n}=o,prev=notes[k-1],next=notes[k+1];
 const cc=conc(n);
 const title=`Sax ${nm.full} Fingering (Written ${d.written}): Alto, Soprano, Tenor | Saxophone Fingering Chart`;
 const main=f[0];
 const desc=`How to play ${nm.both} (written ${d.written}) on alto, soprano and tenor sax: ${brief(main)}. Diagram, alternate fingerings and the pitch each saxophone sounds.`;
 const url=`${BASE}/notes/${nm.slug}/`;
 const fingBlocks=f.map((x,j)=>`<div class="row"><div class="dia">${dia(x)}</div><div class="fing"><h3>${j?'Alternate fingering '+j:(f.length>1?'Main fingering':'Fingering')}</h3><p>${describe(x)}</p></div></div>`).join('\n');
 const page=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${url}">${HEADX}
<style>${CSS}</style><script data-goatcounter="https://louisdatoy.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script></head><body>
<header class="bar"><a href="../../">Saxophone Fingering Chart</a></header>
<main>
<h1>Sax ${nm.full} fingering</h1>
<p class="sub">Written ${d.written}, the same fingering on alto, soprano and tenor saxophone. ${register(main)[0].toUpperCase()+register(main).slice(1)}.</p>
<div class="row"><div class="stf">${staff(n)}</div><div class="fing"><p>${cc.map(c=>`<button class="play" data-hz="${c.hz.toFixed(3)}" type="button">&#9654; ${c.I.name}</button>`).join(' ')}</p><p class="small">${cc.map(c=>`${c.I.name} sounds ${c.concert}`).join('. ')}.</p><p>${nm.acc?`${nm.both} is the same fingering whichever way it is spelled. `:''}${describe(main)}</p></div></div>
${fingBlocks}
<p><a class="btn" href="../../">Open the interactive fingering chart</a></p>
<h2>About this fingering</h2>
<p>This is the standard fingering for written ${d.written} on alto, soprano and tenor saxophone. All three use the same keys, but they sound at different pitches: ${cc.map(c=>`${c.I.name.toLowerCase()} (${c.I.pitch} instrument) sounds ${c.concert}`).join(', ')}. In the diagram a filled circle is a key you press and an open circle is one you leave up. The small shapes around the main holes are the octave, palm, pinky, side and bis keys.</p>
<p class="small">Fingerings can differ slightly between saxophone models, and altissimo notes vary most. If something looks wrong, <a href="mailto:hello@saxophonefingeringchart.com?subject=${encodeURIComponent('Sax fingering correction: '+nm.full+' ('+d.written+')')}">tell us</a> and we will check it.</p>
${FOOT("../../")}
<div class="nav"><span>${prev?`<a href="../${prev.nm.slug}/">&larr; ${prev.nm.full} (${prev.d.written})</a>`:''}</span><span>${next?`<a href="../${next.nm.slug}/">${next.nm.full} (${next.d.written}) &rarr;</a>`:''}</span></div>
</main>
<script src="../../sound.js"></script>
<script>var hz=[${cc.map(c=>c.hz.toFixed(3)).join(',')}];document.querySelectorAll('.play').forEach(function(b){b.addEventListener('click',function(){if(window.SaxSound)SaxSound.play(parseFloat(b.dataset.hz))})});if(window.SaxSound)SaxSound.prepare(hz);</script>
</body></html>`;
 fs.mkdirSync(path.join(outDir,nm.slug),{recursive:true});
 fs.writeFileSync(path.join(outDir,nm.slug,'index.html'),page);
});

// ---- homepage: SEO head + visible text + links to every note ----
const hTitle='Saxophone Fingering Chart: Alto, Soprano and Tenor | Tap any note';
const hDesc='Free interactive saxophone fingering chart for alto, soprano and tenor sax. Tap any note on the staff to see its name and fingering, with sharps and flats colour-coded on the same chart. Low B♭ to high F.';
html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(hTitle)}</title>`);
const head=`<!--SEO-HEAD-START-->
<meta name="description" content="${esc(hDesc)}">
<link rel="canonical" href="${BASE}/">
<meta property="og:title" content="${esc(hTitle)}"><meta property="og:description" content="${esc(hDesc)}"><meta property="og:type" content="website"><meta property="og:url" content="${BASE}/">${HEADX}
<script data-goatcounter="https://louisdatoy.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<!--SEO-HEAD-END-->`;
if(html.includes('<!--SEO-HEAD-START-->'))html=html.replace(/<!--SEO-HEAD-START-->[\s\S]*?<!--SEO-HEAD-END-->/,head);
else html=html.replace('</head>',head+'\n</head>');
const groups=[['Low register (no octave key)',o=>o.f[0][0]===0],['Middle register (octave key)',o=>o.f[0][0]===1&&!hasPalm(o.f[0])],['High register (palm keys)',o=>hasPalm(o.f[0])]];
const links=groups.map(([t,fn])=>`<h3>${t}</h3><p class="notelinks">`+notes.filter(fn).map(o=>`<a href="notes/${o.nm.slug}/">${o.nm.short}${o.nm.acc?'':''}<small>${o.d.written.replace(/^[A-G][♯♭]?/,'')}</small></a>`).join(' ')+'</p>').join('\n');

// ---- extra guide sections ----
const nmByW=w=>notes.find(o=>o.d.written===w);
const alts=notes.filter(o=>o.f.length>1).map(o=>`<li><strong>${o.nm.short} (written ${o.d.written}):</strong> ${o.f.slice(1).map(x=>brief(x)).join('; or ')}.</li>`).join('');
const rangeRows=IK.map(k=>{setI(k);const lo=info(notes[0].n),hi=info(notes[notes.length-1].n);const r=`<tr><th>${INSTR[k].name}</th><td>${lo.written} to ${hi.written}</td><td>${lo.concert} to ${hi.concert}</td></tr>`;setI('alto');return r}).join('');
const guideExtra=`<h2>Scales and chords on the saxophone</h2>
<p>Use the Scales and chords tool above the guide to see any major, minor, pentatonic, blues or chromatic scale, and common chord arpeggios, written out for alto, soprano or tenor. Tap a note to see its fingering, or press play to hear the scale or arpeggio. Key names can be shown as written pitch (your sheet music) or concert pitch.</p>
<h2>Practice quiz</h2>
<p>Test yourself with the quiz: it shows a fingering and you pick the note. It is a quick way to learn the notes by sight.</p>
<h2>Alternate fingerings and trills</h2>
<p>Some notes have more than one fingering. The alternates below are common for trills and fast passages, where a different key makes the move easier. Fingerings can vary between saxophone models, so check with your teacher.</p>
<ul>${alts}</ul>
<h2>Range of each saxophone</h2>
<p>This chart covers low B♭ to high F. Higher notes (altissimo) are possible but their fingerings vary a lot between players and instruments.</p>
<table class="rng"><thead><tr><th></th><th>Written range on this chart</th><th>Sounding (concert) range</th></tr></thead><tbody>${rangeRows}</tbody></table>
<h2>New to saxophone?</h2>
<p>Start with <a href="beginners/">your first six notes</a> (B, A, G, F, E and D), or print the <a href="print/">one-page fingering chart</a>.</p>`;
const text=`<!--NOTES-START-->
<section class="about">
<details class="more"><summary>How to use this chart, alternate fingerings and range</summary>
<h2>Saxophone fingering chart: alto, soprano and tenor</h2>
<p>Tap any note to see its fingering and hear it. Choose alto, soprano or tenor. Natural notes are black, sharps are gold and flats are blue. The notes are written pitch, and the fingering is the same on all three saxophones.</p>
<h2>Reading the diagram</h2>
<p>A filled circle is a key you press and an open circle is one you leave up. The diagram uses the same colour as the note you tapped: black for natural, gold for sharps and blue for flats. A sharp and its matching flat use the same fingering.</p>
<h2>Written and concert pitch</h2>
<p>Alto (E♭) sounds a major sixth lower than written. Soprano and tenor (B♭) sound a major second and a major ninth lower.</p>
${guideExtra}
</details>
<h2>Fingerings by note</h2>
${links}
</section>
<!--NOTES-END-->`;
if(html.includes('<!--NOTES-START-->'))html=html.replace(/<!--NOTES-START-->[\s\S]*?<!--NOTES-END-->/,text);
else html=html.replace('<p id="privacy-note"',text+'\n<p id="privacy-note"');
if(!html.includes('.about{')){
 html=html.replace('.empty{color:var(--mute);font-size:16px}','.empty{color:var(--mute);font-size:16px}\n.about{margin-top:28px;font:16px/1.55 Georgia,serif;color:var(--ink)}.about h2{font-size:20px;margin:22px 0 6px}.about details.more{margin:6px 0 4px}.about summary{cursor:pointer;font:600 15px system-ui,sans-serif;color:#1a4f9c;padding:6px 0}.about h3{font:600 15px system-ui,sans-serif;margin:14px 0 4px;color:var(--mute)}.about p{margin:6px 0}\n.notelinks{display:flex;flex-wrap:wrap;gap:6px}.notelinks a{border:1px solid var(--bd);border-radius:14px;padding:4px 10px;color:var(--ink);text-decoration:none;font:15px system-ui,sans-serif}.notelinks a:hover{background:#f1f4f7}.notelinks small{color:var(--mute);margin-left:1px}');
}
fs.writeFileSync(idxPath,html);


// ---- standalone pages: beginners, privacy and contact, printable chart ----
const PCSS=CSS+`.rng{border-collapse:collapse;font:15px system-ui,sans-serif;margin:8px 0}.rng th,.rng td{border:1px solid var(--bd);padding:6px 10px;text-align:left}.foot{margin-top:28px;border-top:1px solid var(--bd);padding-top:12px}
.six{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:12px 0}.six .card{text-align:center}.six svg{width:100px;height:auto}.six h3{margin:4px 0;font-size:20px}`;
function shell(title,desc,rel,body,extra){
 const url=`${BASE}/${rel}`,p='../'.repeat(rel.split('/').filter(Boolean).length);
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${url}">${HEADX}
<style>${PCSS}${extra||''}</style>${GC}</head><body>
<header class="bar"><a href="${p||'./'}">Saxophone Fingering Chart</a></header>
<main>${body}${FOOT(p||'./')}</main></body></html>`;
}
const wr=(d,k)=>{fs.mkdirSync(path.join(ROOT,d),{recursive:true});fs.writeFileSync(path.join(ROOT,d,'index.html'),k)};
// beginners
const six=['B4','A4','G4','F4','E4','D4'].map(w=>nmByW(w)).filter(Boolean);
wr('beginners',shell('Your First Six Notes on Alto Saxophone: B A G F E D | Saxophone Fingering Chart','Learn your first six notes on alto, tenor or soprano sax: B, A, G, F, E and D. Simple fingering diagrams and tips for getting a clear sound.','beginners/',
`<h1>Your first six notes on saxophone</h1>
<p class="sub">B, A, G, F, E and D, played in order. The same fingerings work on alto, soprano and tenor.</p>
<h2>Before you play</h2>
<p>Hold the saxophone with the neck strap taking the weight, so your hands can stay relaxed. Rest your fingers lightly on the pearl keys and keep your thumbs on the thumb rests. Take a slow, deep breath and blow warm air, as if fogging a mirror, rather than blowing hard.</p>
<p class="small">A teacher can help most with the mouthpiece and reed. If your sound is squeaky or airy, ask a teacher to check your set-up.</p>
<h2>The six notes</h2>
<p>Start with B, using one finger, and add one finger at a time. Press each key fully and keep the other fingers close to the keys.</p>
<div class="six">${six.map(o=>`<div class="card"><h3>${o.nm.short}</h3><a href="../notes/${o.nm.slug}/">${dia(o.f[0])}</a><div class="small">${brief(o.f[0])}</div></div>`).join('')}</div>
<h2>Practice ideas</h2>
<p>Play each note for four slow counts, then play down from B to D and back up. Aim for a steady, clear sound before you go faster. A few minutes a day works better than one long session.</p>
<p><a class="btn" href="../">Open the interactive fingering chart</a> <a class="btn" href="../print/">Printable chart</a></p>`));
// privacy and contact
wr('privacy',shell('Privacy and Contact | Saxophone Fingering Chart','How Saxophone Fingering Chart handles visitor data and sponsorship, and how to contact us.','privacy/',
`<h1>Privacy and contact</h1>
<h2>Visitor data</h2>
<p>This site counts visits with GoatCounter, a privacy-friendly counter. It uses no cookies and does not collect your name, email or other personal information. The chart works in your browser and nothing you tap is sent to us.</p>
<h2>Advertising and links</h2>
<p>This site does not currently show advertising or sponsored placements. Companies are welcome to ask about sponsoring the site. Any paid or sponsored content will be clearly labelled as such.</p>
<h2>Sponsorship</h2>
<p>To ask about sponsoring the site, email the address below. The site does not collect donations or payments.</p>
<h2>Accuracy</h2>
<p>Fingerings can differ between saxophone models, and altissimo fingerings vary most. This site is a general guide and is not a substitute for a teacher.</p>
<h2>Contact</h2>
<p>Corrections and feedback: <a href="mailto:hello@saxophonefingeringchart.com">hello@saxophonefingeringchart.com</a></p>`));
// printable chart
const pcards=notes.map(o=>`<div class="pc"><b>${o.nm.short}<small>${o.d.written.replace(/^[A-G][♯♭]?/,'')}</small></b>${dia(o.f[0])}</div>`).join('');
wr('print',shell('Printable Saxophone Fingering Chart: Alto, Soprano, Tenor','Print a one-page saxophone fingering chart for alto, soprano and tenor sax, low B♭ to high F. Free to print.','print/',
`<h1>Printable saxophone fingering chart</h1>
<p class="sub">Written pitch, low B♭ to high F. The fingerings are the same on alto, soprano and tenor. Filled circles are keys to press.</p>
<p class="np"><button class="play" onclick="window.print()">Print this page</button> <a class="btn" href="../assets/saxophone-fingering-chart.pdf">Download the PDF</a></p>
<div class="pgrid">${pcards}</div>
<p class="small">Free to print for your own practice or teaching. From saxophonefingeringchart.com.</p>`,
`:root{--pink:#1d2a33;--bg:#fff}.pgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px 6px;margin:14px 0}.pc{text-align:center;break-inside:avoid}.pc b{display:block;font:700 15px Georgia,serif}.pc small{font-size:10px;font-weight:400}.pc svg{width:100%;max-width:86px;height:auto}
@media (max-width:600px){.pgrid{grid-template-columns:repeat(3,1fr)}}
@media print{header.bar,.np,.foot{display:none}main{max-width:none;padding:0}.pgrid{grid-template-columns:repeat(6,1fr)}body{font-size:12px}h1{font-size:20px}}`));


// ---- songs: index and one page per song ----
const songNotesFor=s=>songRun(s);
const uniq=run=>[...new Set(run.map(x=>x.i))].sort((a,b)=>a-b);
function songStaffSvg(run){
 const per=10;let out='';
 for(let st=0;st<run.length;st+=per){
  const part=run.slice(st,st+per),W=60+part.length*30;let g='';
  [60,70,80,90,100].forEach(y=>g+=`<line x1="4" x2="${W-4}" y1="${y}" y2="${y}" stroke="#3a4650"/>`);
  g+=`<text x="8" y="106" font-size="66" fill="#1d2a33" font-family="'Noto Music','Apple Symbols','Segoe UI Symbol',serif">𝄞</text>`;
  part.forEach((x,j)=>{const sp=x.o*7+L.indexOf(x.name[0]),y=Y(sp),cx=64+j*30,acc=x.name.slice(1);
   for(let q=40;q<=sp;q+=2)g+=`<line x1="${cx-11}" x2="${cx+11}" y1="${Y(q)}" y2="${Y(q)}" stroke="#3a4650"/>`;
   for(let q=28;q>=sp;q-=2)g+=`<line x1="${cx-11}" x2="${cx+11}" y1="${Y(q)}" y2="${Y(q)}" stroke="#3a4650"/>`;
   g+=`<ellipse cx="${cx}" cy="${y}" rx="7" ry="5" transform="rotate(-18 ${cx} ${y})" fill="#1d2a33"/>${acc?`<text x="${cx-15}" y="${y+5}" font-size="16" text-anchor="middle" fill="#1d2a33">${acc}</text>`:''}`});
  const ys=part.map(x=>Y(x.o*7+L.indexOf(x.name[0]))),y0=Math.min(45,Math.min(...ys)-18),y1=Math.max(112,Math.max(...ys)+18);
  out+=`<svg viewBox="0 ${y0} ${W} ${y1-y0}" style="display:block;width:${W/360*100}%;max-width:${W/360*520}px;height:auto" role="img" aria-label="Notes ${st+1} to ${st+part.length}">${g}</svg>`;
 }
 return out;
}
const SCSS=`:root{--pink:#1d2a33;--bg:#fff}.sgl{list-style:none;padding:0;margin:12px 0}.sgl li{margin:8px 0}.sgl a{font:600 18px Georgia,serif}.lvl{color:var(--mute);font:14px system-ui,sans-serif}
.seq{font:600 17px/1.9 system-ui,sans-serif;letter-spacing:.02em}.six{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}.six svg{width:80px}`;
wr('songs',shell('Simple Saxophone Songs: Happy Birthday, Twinkle Twinkle and More | Saxophone Fingering Chart','Easy songs to play on alto, soprano or tenor saxophone, with the notes, fingerings and a play-along. Happy Birthday, Twinkle Twinkle Little Star, Ode to Joy and more.','songs/',
`<h1>Simple saxophone songs</h1>
<p class="sub">Traditional tunes with the notes and fingering for each one. The notes are written pitch, so they work on alto, soprano and tenor.</p>
<ul class="sgl">${SONGS.map(s=>`<li><a href="${s.slug}/">${s.title}</a><br><span class="lvl">${s.level}</span></li>`).join('')}</ul>
<p><a class="btn" href="../">Open the interactive fingering chart</a></p>`,SCSS));
SONGS.forEach(s=>{
 const run=songRun(s),us=uniq(run),total=run.length;
 const seq=run.map(x=>x.name).join(' ');
 const hz=IK.map(k=>{setI(k);const r={k,I:INSTR[k],f:run.map(x=>fOf(N[x.i]).toFixed(2))};setI('alto');return r});
 const bs=run.map(x=>x.b);
 const title=`${s.title} on Saxophone: Notes and Fingering (Alto, Tenor, Soprano)`;
 const desc=`How to play ${s.title} on alto, tenor or soprano saxophone. The notes, a fingering diagram for each one and a play-along. ${s.level}.`;
 const body=`<h1>${s.title} on saxophone</h1>
<p class="sub">${s.level}. Written pitch, so the same notes work on alto, soprano and tenor saxophone.</p>
<p>${hz.map(h=>`<button class="play" data-i="${h.k}" type="button">&#9654; Play on ${h.I.name.toLowerCase()}</button>`).join(' ')}</p>
<h2>The notes</h2>
${songStaffSvg(run)}
<p class="seq">${seq}</p>
<p class="small">Notes in order, ${total} in all. The rhythm is simplified: hold the notes marked with longer beats in the chart.</p>
<h2>Fingerings for the notes in this song</h2>
<div class="six">${us.map(i=>{const o=notes[i];return `<div class="card"><h3>${o.nm.short}<small>${o.d.written.replace(/^[A-G][♯♭]?/,'')}</small></h3><a href="../../notes/${o.nm.slug}/">${dia(o.f[0])}</a><div class="small">${brief(o.f[0])}</div></div>`}).join('')}</div>
<p><a class="btn" href="../../">Open the interactive fingering chart</a> <a class="btn" href="../">More songs</a></p>
<p class="small">This is a traditional tune in the public domain. Check the notes with your teacher, and listen to a recording to hear the rhythm.</p>
<script src="../../sound.js"></script>
<script>var D=${JSON.stringify(Object.fromEntries(hz.map(h=>[h.k,h.f.map(Number)])))},B=${JSON.stringify(bs)},T=0;document.querySelectorAll('.play').forEach(function(b){b.addEventListener('click',function(){var f=D[b.dataset.i],t=0;T++;var my=T;f.forEach(function(h,k){var at=t;t+=B[k]*470;setTimeout(function(){if(my===T&&window.SaxSound)SaxSound.play(h)},at)})})});</script>`;
 wr('songs/'+s.slug,shell(title,desc,`songs/${s.slug}/`,body,SCSS).replace(/href="\.\.\/"/g,'href="../"'));
});

// ---- scales: one page per key and scale type, plus an index ----
const EXTRA_URLS=[];
const {SCALES,KEYPC,ACC}=new Function(html.match(/^const SCALES=.*;$/m)[0]+html.match(/^const KEYPC=.*;$/m)[0]+html.match(/^const ACC=.*;$/m)[0]+';return {SCALES,KEYPC,ACC}')();
const MM=[0,2,4,5,7,9,11];
const nMidi=n=>12*(n[1]+1)+MM[L.indexOf(n[0])]+(n[2]==='#'?1:n[2]==='b'?-1:0);
const nName=n=>n[0]+(n[2]==='#'?'♯':n[2]==='b'?'♭':'');
const CHS=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],CHF=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const KNAMES=KEYPC.map(([l,a])=>l+(a<0?'♭':a>0?'♯':''));
const ksl=n=>n.toLowerCase().replace('♭','-flat').replace('♯','-sharp');
const lo=Math.min(...N.map(nMidi)),hi=Math.max(...N.map(nMidi));
function scaleRun(wpc,[nm,iv,steps]){
 let base=lo;while(((base-wpc)%12+12)%12!==0)base++;
 const [rl]=KEYPC[wpc],out=[];
 iv.forEach((d,k)=>{const i=N.findIndex(n=>nMidi(n)===base+d);if(i<0)return;
  let name=nName(N[i]);
  if(nm.startsWith('Chromatic')){const pc=((wpc+d)%12+12)%12;name=(k<=(iv.length-1)/2?CHS:CHF)[pc]}
  else if(steps){const let_=L[(L.indexOf(rl)+steps[k])%7],pc=((wpc+d)%12+12)%12,nat=MM[L.indexOf(let_)];let df=((pc-nat)%12+12)%12;if(df>6)df-=12;name=let_+(ACC[df]??name.slice(1))}
  out.push({i,name,o:N[i][1],b:1})});
 return {run:out,missing:iv.length-out.length};
}
const STYPES=[
 ['Major','major','Major scale','The major scale is the bright, happy-sounding scale that most beginner tunes use. It is the first scale most teachers set, and the best place to start.'],
 ['Natural minor','natural-minor','Natural minor scale','The natural minor scale has a darker, more serious sound. Every major key has a matching minor key that shares the same notes.'],
 ['Minor pentatonic','minor-pentatonic','Minor pentatonic scale','The minor pentatonic scale has only five notes, which makes it easy to play. It is the sound of blues, rock and a lot of improvised solos.'],
 ['Blues','blues','Blues scale','The blues scale is the minor pentatonic scale with one extra note, the flat fifth, which gives it the classic bluesy bend.'],
 ['Chromatic','chromatic','Chromatic scale','The chromatic scale uses every note, one semitone at a time, so it is great for finger practice. This one goes up one octave with sharps and comes back down with flats.'],
 ['Chromatic (2 octaves)','chromatic-2-octaves','Chromatic scale, 2 octaves','The two octave chromatic scale uses every note for two octaves. It goes up with sharps and comes back down with flats, and it is a good workout for your fingers and your breath.']
];
const sbtn=(D,B,SP)=>`<script src="../../sound.js"></script><script>var D=${JSON.stringify(D)},B=${JSON.stringify(B)},T=0;document.querySelectorAll('.play').forEach(function(b){b.addEventListener('click',function(){var f=D[b.dataset.i],t=0;T++;var my=T;f.forEach(function(h,k){var at=t;t+=B[k]*${SP};setTimeout(function(){if(my===T&&window.SaxSound)SaxSound.play(h)},at)})})});</script>`;
const ECSS=`:root{--pink:#1d2a33;--bg:#fff;--mute:#6b7780;--ink:#1d2a33;--card:#fff}.six{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.six svg{width:76px}.seq{font:600 17px/1.9 system-ui,sans-serif;letter-spacing:.02em}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;margin:8px 0}.grid a{display:block;text-align:center;border:1px solid var(--bd);border-radius:8px;padding:6px 4px;text-decoration:none;font:600 15px system-ui,sans-serif}.guides{list-style:none;padding:0}.guides li{margin:14px 0}.guides a{font:600 18px Georgia,serif}.guides span{display:block;color:var(--mute);font:14px/1.4 system-ui,sans-serif}`;
const wideSvg=run=>songStaffSvg(run).replace(/style="display:block;width:[^"]*"/g,'style="display:block;width:100%;max-width:520px;height:auto"');
// the staff helper above scales width by 360; make rows equal width instead
STYPES.forEach(([tn,tslug,tlabel,intro])=>{
 const sc=SCALES.find(s=>s[0]===tn);
 KNAMES.forEach((kn,wpc)=>{
  const {run,missing}=scaleRun(wpc,sc);if(!run.length)return;
  const slug=`${ksl(kn)}-${tslug}`,us=uniq(run);
  const names=tn.startsWith('Chromatic')?`${run.slice(0,(run.length+1)/2|0).map(x=>x.name).join(' ')} and back down`:run.map(x=>x.name).join(' ');
  const title=`${kn} ${tlabel} on Saxophone: Notes and Fingering (Alto, Tenor, Soprano)`;
  const desc=`${kn} ${tlabel.toLowerCase()} for alto, tenor and soprano saxophone. The notes, the staff and a fingering diagram for every note.`;
  const conc=IK.map(k=>`<tr><th>${INSTR[k].name} sax</th><td>${CHF[((wpc+INSTR[k].shift)%12+12)%12]}</td></tr>`).join('');
  const hz=IK.map(k=>{setI(k);const r={k,I:INSTR[k],f:run.map(x=>+fOf(N[x.i]).toFixed(2))};setI('alto');return r});
  const sp=tn.startsWith('Chromatic')?300:450;
  const others=STYPES.filter(s=>s[1]!==tslug).map(s=>`<a href="../${ksl(kn)}-${s[1]}/">${kn} ${s[2].toLowerCase()}</a>`).join(' &middot; ');
  const keys=KNAMES.map(k2=>`<a href="../${ksl(k2)}-${tslug}/">${k2}</a>`).join('');
  const body=`<h1>${kn} ${tlabel.toLowerCase()} on saxophone</h1>
<p class="sub">Written pitch, so these notes and fingerings are the same on alto, soprano and tenor sax.</p>
<p>${intro}</p>
<p>${hz.map(h=>`<button class="play" data-i="${h.k}" type="button">&#9654; Play on ${h.I.name.toLowerCase()}</button>`).join(' ')}</p>
<h2>The notes</h2>
${wideSvg(run)}
<p class="seq">${names}</p>
${missing?`<p class="small">The top of this scale is above the highest note on the chart, so ${missing} note${missing>1?'s are':' is'} left out.</p>`:''}
<h2>What your saxophone sounds</h2>
<p>When you read ${kn} ${tn.toLowerCase()} on your music, the pitch you hear is different on each saxophone:</p>
<table class="rng"><tr><th>Instrument</th><th>Sounds as (concert key)</th></tr>${conc}</table>
<h2>Fingerings for the notes in this scale</h2>
<div class="six">${us.map(i=>{const o=notes[i];return `<div class="card"><h3>${o.nm.short}<small>${o.d.written.replace(/^[A-G][♯♭]?/,'')}</small></h3><a href="../../notes/${o.nm.slug}/">${dia(o.f[0])}</a><div class="small">${brief(o.f[0])}</div></div>`}).join('')}</div>
<h2>Same scale in other keys</h2>
<div class="grid">${keys}</div>
<p class="small">Other ${kn} scales: ${others}</p>
<p><a class="btn" href="../../">Open the interactive fingering chart</a> <a class="btn" href="../">All scales</a></p>
<p class="small">Practise slowly with a metronome, and check fingerings with your teacher.</p>
${sbtn(Object.fromEntries(hz.map(h=>[h.k,h.f])),run.map(x=>x.b),sp)}`;
  wr('scales/'+slug,shell(title,desc,`scales/${slug}/`,body,ECSS));EXTRA_URLS.push(`scales/${slug}/`);
 });
});
wr('scales',shell('Saxophone Scales: Major, Minor, Pentatonic, Blues and Chromatic | Saxophone Fingering Chart','Saxophone scales in every key for alto, tenor and soprano sax: major, natural minor, minor pentatonic, blues and chromatic, with notes and fingerings.','scales/',
`<h1>Saxophone scales in every key</h1>
<p class="sub">Notes and fingerings for the main scales in all 12 keys. The keys are written pitch, so the fingerings are the same on alto, soprano and tenor.</p>
${STYPES.map(([tn,tslug,tlabel,intro])=>`<h2>${tlabel}s</h2><p>${intro}</p><div class="grid">${KNAMES.map(k=>`<a href="${ksl(k)}-${tslug}/">${k}</a>`).join('')}</div>`).join('')}
<p><a class="btn" href="../">Open the interactive fingering chart</a></p>`,ECSS));EXTRA_URLS.push('scales/');

// ---- guides ----
const G=[];
const guide=(slug,title,desc,h1,sub,inner)=>{G.push([slug,h1,sub]);wr('guides/'+slug,shell(title,desc,`guides/${slug}/`,`<h1>${h1}</h1><p class="sub">${sub}</p>${inner}<p><a class="btn" href="../../">Open the interactive fingering chart</a> <a class="btn" href="../">More guides</a></p>`,ECSS));EXTRA_URLS.push(`guides/${slug}/`)};
guide('breathing-and-long-tones','Saxophone Breathing and Long Tones: A Simple Guide | Saxophone Fingering Chart','How to breathe and support your sound on saxophone, and how to practise long tones for a steady, full tone on low and high notes.','Breathing and long tones on saxophone','How to breathe, how to support the sound, and the simplest exercise for a better tone.',
`<h2>Breathe low and wide</h2>
<p>Stand or sit tall with your shoulders relaxed. Breathe in through the corners of your mouth, and let your belly and lower ribs move outwards as the air comes in. Avoid lifting your shoulders. A big, relaxed breath gives you plenty of air without any tension.</p>
<h2>Blow warm, steady air</h2>
<p>Think of the air you would use to fog a mirror, not a puff to blow out a candle. The air should be warm, fast and steady. Your belly and lower ribs gently push the air out. You do not need to blow hard, because a good sound comes from steady air more than from strong air.</p>
<h2>Low notes and high notes</h2>
<p>For low notes, keep your throat and mouth open and relaxed, and use slower, wider air. Cover the keys fully, because a small leak makes low notes crack or go airy. For high notes, use faster air with a slightly firmer embouchure, but do not bite down on the mouthpiece. Biting makes the sound thin and sharp.</p>
<h2>The long tone exercise</h2>
<ol><li>Pick an easy note, like written B, A or G.</li><li>Breathe in for four slow counts.</li><li>Play the note at a medium volume for eight slow counts, keeping the sound and the pitch as steady as you can.</li><li>Rest for a few breaths, then repeat. Next time try ten counts, then twelve.</li><li>Move down or up one note at a time as the first notes get easier.</li></ol>
<p>Try it with the <a href="../../tuner/">tuner</a>. The needle should stay still. If it wobbles, your air or your jaw is moving.</p>
<h2>Good habits</h2>
<ul><li>Rest between exercises. If you feel dizzy, stop and breathe normally.</li><li>Practise a few minutes every day rather than one long session.</li><li>If anything hurts, stop and ask your teacher.</li></ul>
<p class="small">A teacher can hear and see what you are doing, so use this page alongside lessons.</p>`);
const withAlts=notes.filter(o=>o.f.length>1);
guide('alternate-fingerings','Saxophone Alternate Fingerings and Trills | Saxophone Fingering Chart','Alternate saxophone fingerings for the notes that have more than one, with diagrams. Useful for trills, fast passages and tuning.','Alternate fingerings and trills','Some notes can be played more than one way. Here are the alternates in the chart.',
`<p>An alternate fingering is a different way to play the same note. Players use them to make fast passages and trills easier, to change between two notes more smoothly, and sometimes to improve the tuning of a note. The main fingering is a good default, and your teacher can tell you which alternate to use and when.</p>
<p>A trill is a quick back and forth between two notes. On some notes a trill is awkward with the main fingering, so players switch to an alternate that changes only one finger or key.</p>
<h2>Notes with alternate fingerings</h2>
${withAlts.map(o=>`<div class="card"><h3><a href="../../notes/${o.nm.slug}/">${o.nm.short}${o.d.written.replace(/^[A-G][♯♭]?/,'')}</a> <small>written ${o.d.written}</small></h3><div class="row">${o.f.map((x,j)=>`<div class="dia"><div class="small">${j?'Alternate '+j:'Main'}</div>${dia(x)}<div class="small">${brief(x)}</div></div>`).join('')}</div></div>`).join('')}
<h2>Which B♭ fingering to use</h2>
<p>B♭ is the note with the most choices. The chart shows two: the main side B♭ fingering and the bis key. Two more are used by experienced players in particular passages.</p>
<p><b>Side B♭ (main):</b> play A with the left hand and add the lowest of the right-hand side keys. It is the best all-round choice, especially in chromatic lines, so learn it first.</p>
<p><b>Bis B♭ (alternate):</b> press the left index finger on both the B key and the small bis key. It works well in flat keys and scale runs where that finger stays down, but moving between B and B♭ is awkward, so avoid it in chromatic passages.</p>
<p><b>1 and 1 and 1 and 2 (not shown):</b> these are used for specific moves. The 1 and 1 fingering helps in quick jumps between F and B♭, and the 1 and 2 fingering is mainly for moving between F♯ and A♯. They are left off the chart so beginners are not given too many choices. Ask your teacher when to use them.</p>
<p class="small">Fingerings can change the tuning and tone a little, so check with a tuner.</p>
<p class="small">Altissimo (very high) notes vary a lot between players and instruments. Check these with your teacher.</p>`);
guide('common-problems','Common Saxophone Problems and Fixes: Squeaks, Weak Low Notes and More | Saxophone Fingering Chart','Fixes for common beginner saxophone problems: squeaks, weak low notes, a sharp or flat pitch, notes that crack and reeds that feel too hard or soft.','Common saxophone problems and fixes','Simple things to try first when something does not sound right.',
`<h2>Squeaks</h2>
<p>Squeaks usually come from the reed or the embouchure. Check that the reed is centred and level with the tip of the mouthpiece, and that the ligature is tight enough to hold it. Take in about a centimetre or two of the mouthpiece, keep your bottom lip soft, and do not bite. A chipped or worn reed squeaks too, so try a fresh one.</p>
<h2>Low notes are weak or crack</h2>
<p>Low notes need every key covered fully. Check that your fingers are flat on the keys and not on the edges. Use slower, wider air and a relaxed mouth. If the low notes still will not speak, a pad may be leaking and a repairer can check it.</p>
<h2>Notes crack between registers</h2>
<p>Press the octave key just as you change notes, and keep your fingers close to the keys so they move together. Practise slowly, and use the <a href="../../">chart</a> to check the fingering for each note.</p>
<h2>Too sharp or too flat</h2>
<p>Biting the mouthpiece makes the pitch sharp, and a loose mouth makes it flat. If the whole instrument is out of tune, move the mouthpiece a little along the cork, in to go lower or out to go higher. The <a href="../../tuner/">tuner</a> shows you where you are.</p>
<h2>The reed feels too hard or too soft</h2>
<p>A reed that is too hard makes the sound stuffy and tiring to blow. One that is too soft sounds buzzy and thin. Beginners usually do best on a softer strength, often around 2 or 2.5, and a teacher can suggest the right one for you.</p>
<h2>Looking after your reeds</h2>
<ul><li>Wet the reed before you play.</li><li>Wipe the reed and store it flat in a reed case.</li><li>Rotate between two or three reeds so none wears out too fast.</li><li>Replace any reed that is chipped, warped or dull.</li></ul>
<p class="small">If your instrument leaks or keys are bent, take it to a repairer. A teacher can also check your mouthpiece, reed and posture in person.</p>`);
const rt=(m,items)=>`<h2>${m} minutes</h2><ol>${items.map(i=>`<li>${i}</li>`).join('')}</ol>`;
guide('practice-routine','Saxophone Practice Routine: 10, 20 and 30 Minute Plans | Saxophone Fingering Chart','Simple saxophone practice routines for 10, 20 and 30 minutes a day using long tones, scales, arpeggios and songs.','A simple saxophone practice routine','Short daily practice beats one long session. Pick the length that fits your day.',
`${rt(10,['<b>Long tones (2 min):</b> hold a few easy notes, steady and full. See the <a href="../breathing-and-long-tones/">long tone exercise</a>.','<b>One scale (3 min):</b> play it slowly with the <a href="../../metronome/">metronome</a>, up and down.','<b>One song (5 min):</b> pick a tune from <a href="../../songs/">Simple songs</a> and play along with the microphone.'])}
${rt(20,['<b>Long tones (3 min):</b> low, middle and high notes.','<b>Scales (6 min):</b> two scales, slowly and evenly. Try <a href="../../scales/">any key</a>.','<b>Arpeggios (4 min):</b> the Major or Minor chord in the same key as your scale.','<b>Songs (7 min):</b> one tune you know and one you are learning.'])}
${rt(30,['<b>Long tones and tuning (5 min):</b> check your pitch with the <a href="../../tuner/">tuner</a>.','<b>Scales (8 min):</b> two or three scales, then the chromatic scale for finger practice.','<b>Arpeggios (5 min):</b> maj7, m7 and 7 chords if you are working on jazz.','<b>Songs (10 min):</b> new tune first, then an old favourite.','<b>Finish (2 min):</b> something fun, then wipe out your sax.'])}
<h2>Tips</h2>
<ul><li>Start slowly. Speed comes from accuracy, not the other way around.</li><li>Practise the hard part, not just the parts you like.</li><li>Play every day, even for ten minutes.</li><li>Record yourself now and then and listen back.</li></ul>
<p class="small">Your teacher can change this plan to suit what you are working on.</p>`);
// transposition
const cKeys=KNAMES.map((k,pc)=>`<tr><th>${k}</th>${IK.map(kk=>`<td>${CHF[((pc-INSTR[kk].shift)%12+12)%12]}</td>`).join('')}</tr>`).join('');
const wKeys=KNAMES.map((k,pc)=>`<tr><th>${k}</th>${IK.map(kk=>`<td>${CHF[((pc+INSTR[kk].shift)%12+12)%12]}</td>`).join('')}</tr>`).join('');
guide('concert-pitch','Saxophone Concert Pitch Converter: Alto, Tenor and Soprano Transposition | Saxophone Fingering Chart','A simple chart to convert between concert pitch and the written pitch for alto, tenor and soprano saxophone, so you can play along with a band or backing track.','Concert pitch and saxophone transposition','What key to play on your sax when the band or backing track is in a different key.',
`<p>Saxophones are transposing instruments. When you play a written C on alto sax, the note you hear is an E♭. Other instruments such as piano and guitar usually play in concert pitch, which is the pitch you actually hear. So if a backing track is in the key of C, your sax has to play in a different key to match it.</p>
<ul><li><b>Alto sax</b> sounds a major sixth lower than written.</li><li><b>Soprano sax</b> sounds a major second lower than written.</li><li><b>Tenor sax</b> sounds a major ninth lower than written, which is an octave plus a major second.</li></ul>
<h2>The band is in this key. What do I play?</h2>
<table class="rng"><tr><th>Concert key</th>${IK.map(k=>`<th>${INSTR[k].name} sax plays</th>`).join('')}</tr>${cKeys}</table>
<h2>I am playing this key. What does it sound as?</h2>
<table class="rng"><tr><th>Written key</th>${IK.map(k=>`<th>${INSTR[k].name} sax sounds</th>`).join('')}</tr>${wKeys}</table>
<p class="small">Example: the band plays in G. Alto sax reads and plays in E. Tenor and soprano sax play in A. Some keys can also be written with sharps, for example G♭ is the same as F♯.</p>
<p>The <a href="../../">fingering chart</a> and <a href="../../scales/">scale pages</a> use written pitch, so fingerings stay the same whichever sax you play. In the chart you can also switch between written and concert pitch in Scales and chords.</p>`);
wr('guides',shell('Saxophone Guides: Practice, Breathing, Alternate Fingerings and More | Saxophone Fingering Chart','Simple saxophone guides: breathing and long tones, alternate fingerings, common problems, a daily practice routine and a concert pitch converter.','guides/',
`<h1>Saxophone guides</h1><p class="sub">Short, practical guides to go with the fingering chart.</p>
<ul class="guides">${G.map(([s,h,sub])=>`<li><a href="${s}/">${h}</a><span>${sub}</span></li>`).join('')}<li><a href="../tuner/">Saxophone tuner</a><span>Check whether the note you play is sharp or flat.</span></li><li><a href="../metronome/">Metronome</a><span>A steady beat for scales and songs.</span></li><li><a href="../scales/">Saxophone scales in every key</a><span>Notes and fingerings for 60 scales.</span></li></ul>`,ECSS));EXTRA_URLS.push('guides/');
// tuner and metronome pages
const TCSS=fs.readFileSync(path.join(ROOT,'tools.css'),'utf8');
wr('tuner',shell('Online Saxophone Tuner: Free, Works for Alto, Tenor and Soprano | Saxophone Fingering Chart','A free online tuner for saxophone. Play a note and see the written note for alto, tenor or soprano sax, and whether you are sharp or flat.','tuner/',
`<h1>Saxophone tuner</h1><p class="sub">Play a long note and see the note and how sharp or flat it is. It shows the written note for your sax.</p><div id="tunerMount"></div>
<h2>How to use it</h2><ol><li>Choose alto, soprano or tenor.</li><li>Press Start tuner and allow the microphone.</li><li>Play a long, steady note. The needle shows if you are flat (left) or sharp (right). It turns green when you are in tune.</li></ol>
<p class="small">Your sound is analysed on your device only and never recorded or sent anywhere. See the <a href="../guides/common-problems/">common problems guide</a> if you are always sharp or flat.</p>
<script src="../tools.js"></script><script>mountTuner(document.getElementById('tunerMount'))</script>`,ECSS+TCSS));EXTRA_URLS.push('tuner/');
wr('metronome',shell('Free Online Metronome for Saxophone Practice | Saxophone Fingering Chart','A simple free metronome for practising saxophone scales and songs. Adjustable tempo, beats per bar and tap tempo.','metronome/',
`<h1>Metronome</h1><p class="sub">A steady beat for practising scales and songs.</p><div id="metroMount"></div>
<h2>How to use it</h2><p>Set a slow speed, such as 60 to 80 beats per minute, and play one note on each beat. When it feels easy, raise the tempo a little. Use Tap tempo to match a song you know.</p>
<p><a href="../scales/">Choose a scale to practise</a> or follow the <a href="../guides/practice-routine/">practice routine</a>.</p>
<script src="../tools.js"></script><script>mountMetronome(document.getElementById('metroMount'))</script>`,ECSS+TCSS));EXTRA_URLS.push('metronome/');

// ---- sitemap + robots ----
const urls=[`${BASE}/`,`${BASE}/beginners/`,`${BASE}/songs/`,...SONGS.map(s=>`${BASE}/songs/${s.slug}/`),`${BASE}/print/`,`${BASE}/privacy/`,...EXTRA_URLS.map(u=>`${BASE}/${u}`),...notes.map(o=>`${BASE}/notes/${o.nm.slug}/`)];
fs.writeFileSync(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+urls.map(u=>`<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')+`\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
console.log('built',notes.length,'note pages; base',BASE);
