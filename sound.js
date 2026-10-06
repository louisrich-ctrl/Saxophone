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
 function play(f,dur){
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  if(!ctx)ctx=new AC();
  if(ctx.state==='suspended')ctx.resume();
  var now=ctx.currentTime;
  if(cur){try{cur.out.gain.cancelScheduledValues(now);cur.out.gain.setTargetAtTime(0.0001,now,0.03);cur.oscs.forEach(function(o){try{o.stop(now+0.2)}catch(e){}})}catch(e){}}
  cur=build(ctx,ctx.destination,f,now+0.01,dur||1.3);
  return true;
 }
 window.SaxSound={play:play,build:build};
})();
