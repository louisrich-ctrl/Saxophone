// Synthesised alto-sax-style tone (Web Audio). Not a recording: the pitch is exact, the timbre is an approximation.
(function(){
 var ctx=null,cur=null;
 function build(ac,dest,f,t0,dur){
  var out=ac.createGain();
  out.gain.setValueAtTime(0.0001,t0);
  out.gain.exponentialRampToValueAtTime(0.55,t0+0.05);
  out.gain.setTargetAtTime(0.4,t0+0.07,0.12);
  out.gain.setValueAtTime(0.4,t0+dur);
  out.gain.exponentialRampToValueAtTime(0.0001,t0+dur+0.2);
  var lp=ac.createBiquadFilter();lp.type='lowpass';lp.Q.value=1.6;
  var c0=Math.min(Math.max(f*3,500),4500),c1=Math.min(Math.max(f*5.5,900),5500);
  lp.frequency.setValueAtTime(c0,t0);
  lp.frequency.linearRampToValueAtTime(c1,t0+0.1);
  lp.frequency.setTargetAtTime(Math.min(Math.max(f*4,700),4500),t0+0.12,0.25);
  var vib=ac.createOscillator();vib.frequency.value=5.3;
  var vg=ac.createGain();vg.gain.setValueAtTime(0,t0);vg.gain.linearRampToValueAtTime(0,t0+0.3);vg.gain.linearRampToValueAtTime(9,t0+0.8);
  vib.connect(vg);
  var oscs=[vib],specs=[['sawtooth',-5,0.5],['sawtooth',5,0.5],['square',0,0.22]];
  specs.forEach(function(s){
   var o=ac.createOscillator();o.type=s[0];o.frequency.value=f;o.detune.value=s[1];
   var g=ac.createGain();g.gain.value=s[2];
   vg.connect(o.detune);o.connect(g);g.connect(lp);oscs.push(o);
  });
  lp.connect(out);out.connect(dest);
  // short breath noise at the start
  var n=ac.createBuffer(1,Math.floor(ac.sampleRate*0.2),ac.sampleRate),d=n.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  var ns=ac.createBufferSource();ns.buffer=n;
  var bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200;bp.Q.value=0.8;
  var ng=ac.createGain();ng.gain.value=0.07;
  ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t0);
  oscs.forEach(function(o){o.start(t0);o.stop(t0+dur+0.3)});
  return{out:out,oscs:oscs};
 }
 function webPlay(f,dur){
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  if(!ctx)ctx=new AC();
  if(ctx.state==='suspended')ctx.resume();
  var now=ctx.currentTime;
  stopWeb(now);
  cur=build(ctx,ctx.destination,f,now+0.01,dur||1.3);
  return true;
 }
 function stopWeb(now){
  if(cur){try{cur.out.gain.cancelScheduledValues(now);cur.out.gain.setTargetAtTime(0.0001,now,0.03);cur.oscs.forEach(function(o){try{o.stop(now+0.2)}catch(e){}})}catch(e){}cur=null}
 }
 // Pre-rendered WAV played through an <audio> element: unlike raw Web Audio, iPhones do not mute it with the silent switch.
 var cache={},queued={},queue=[],busy=false,el=null,SR=44100;
 function key(f){return f.toFixed(2)}
 function wav(buf){
  var d=buf.getChannelData(0),n=d.length,out=new DataView(new ArrayBuffer(44+n*2));
  function w(o,t){for(var i=0;i<t.length;i++)out.setUint8(o+i,t.charCodeAt(i))}
  w(0,'RIFF');out.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,1,true);
  out.setUint32(24,buf.sampleRate,true);out.setUint32(28,buf.sampleRate*2,true);out.setUint16(32,2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*2,true);
  for(var i=0;i<n;i++){var v=Math.max(-1,Math.min(1,d[i]));out.setInt16(44+i*2,v<0?v*32768:v*32767,true)}
  return URL.createObjectURL(new Blob([out],{type:'audio/wav'}));
 }
 function renderOne(f,done){
  var OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OAC||!window.URL||!window.Blob){done();return}
  var finished=false;function fin(buf){if(finished)return;finished=true;try{cache[key(f)]=wav(buf)}catch(e){}done()}
  try{
   var ac=new OAC(1,Math.ceil(SR*1.6),SR);build(ac,ac.destination,f,0,1.3);
   ac.oncomplete=function(e){fin(e.renderedBuffer)};
   var r=ac.startRendering();if(r&&r.then)r.then(fin,function(){finished=true;done()});
  }catch(e){done()}
 }
 function pump(){
  if(busy||!queue.length)return;busy=true;
  var f=queue.shift();
  setTimeout(function(){renderOne(f,function(){busy=false;pump()})},0);
 }
 function prepare(freqs){freqs.forEach(function(f){var k=key(f);if(!cache[k]&&!queued[k]){queued[k]=1;queue.push(f)}});pump()}
 function session(){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}}
 function play(f,dur){
  session();
  var url=cache[key(f)];
  if(url&&window.Audio){
   try{
    if(!el){el=new Audio();el.preload='auto'}
    stopWeb(ctx?ctx.currentTime:0);
    el.pause();el.src=url;el.currentTime=0;
    var p=el.play();
    if(p&&p.catch)p.catch(function(){webPlay(f,dur)});
    return true;
   }catch(e){}
  }
  prepare([f]);
  return webPlay(f,dur);
 }
 window.SaxSound={play:play,prepare:prepare,build:build};
})();
