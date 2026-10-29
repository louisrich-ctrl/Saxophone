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
const lib=new Function(js.slice(a,b)+';function setI(k){inst=k}return {L,N,info,dia,CHIP,Y,fOf,INSTR,setI};')();
const {L,N,info,dia,CHIP,Y,fOf,INSTR,setI}=lib;
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
const FOOT=(p)=>`<p class="small foot"><a href="${p}">Saxophone fingering chart</a> &middot; <a href="${p}beginners/">Beginners: first notes</a> &middot; <a href="${p}print/">Printable chart</a> &middot; <a href="${p}privacy/">Privacy and contact</a></p>`;
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
const hDesc='Free interactive saxophone fingering chart for alto, soprano and tenor sax. Tap any note on the staff to see its name and fingering, with sharps and flats shown separately. Low B♭ to high F.';
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
<p>Tap any note to see its fingering and hear it. Choose alto, soprano or tenor, then normal notes, sharps or flats. The notes are written pitch, and the fingering is the same on all three saxophones.</p>
<h2>Reading the diagram</h2>
<p>A filled circle is a key you press and an open circle is one you leave up. Sharps are red and flats are blue. A sharp and its matching flat use the same fingering.</p>
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
 const url=`${BASE}/${rel}`,p=rel?'../':'';
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
wr('privacy',shell('Privacy and Contact | Saxophone Fingering Chart','How Saxophone Fingering Chart handles visitor data, advertising and links, and how to contact us.','privacy/',
`<h1>Privacy and contact</h1>
<h2>Visitor data</h2>
<p>This site counts visits with GoatCounter, a privacy-friendly counter. It uses no cookies and does not collect your name, email or other personal information. The chart works in your browser and nothing you tap is sent to us.</p>
<h2>Advertising and links</h2>
<p>Some banners on this site are paid or sponsored placements, and some links may be affiliate or referral links. If you sign up with a sponsor through one of these links, the site may earn a commission at no extra cost to you. Sponsors are shown for information only, and we do not control their sites or their privacy practices.</p>
<h2>Accuracy</h2>
<p>Fingerings can differ between saxophone models, and altissimo fingerings vary most. This site is a general guide and is not a substitute for a teacher.</p>
<h2>Contact</h2>
<p>Corrections and feedback: <a href="mailto:hello@saxophonefingeringchart.com">hello@saxophonefingeringchart.com</a><br>Advertising: <a href="mailto:ads@saxophonefingeringchart.com">ads@saxophonefingeringchart.com</a></p>`));
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

// ---- sitemap + robots ----
const urls=[`${BASE}/`,`${BASE}/beginners/`,`${BASE}/print/`,`${BASE}/privacy/`,...notes.map(o=>`${BASE}/notes/${o.nm.slug}/`)];
fs.writeFileSync(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+urls.map(u=>`<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')+`\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
console.log('built',notes.length,'note pages; base',BASE);
