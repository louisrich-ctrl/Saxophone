/* Tuner and metronome. Shared by the home page and the /tuner/ and /metronome/ pages. */
(function(){
var SH={alto:-9,soprano:-2,tenor:-14},NM={alto:'Alto',soprano:'Soprano',tenor:'Tenor'};
var NAMES=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];
function yin(b,sr){
 var n=b.length,half=n>>1,tmin=Math.floor(sr/1400),tmax=Math.min(half-1,Math.floor(sr/85)),i,t;
 var d=new Float32Array(tmax+2),sum,x;
 for(t=1;t<=tmax;t++){sum=0;for(i=0;i<half;i++){x=b[i]-b[i+t];sum+=x*x}d[t]=sum}
 var run=0,c=new Float32Array(tmax+2);c[0]=1;
 for(t=1;t<=tmax;t++){run+=d[t];c[t]=d[t]*t/run}
 var t0=-1;
 for(t=tmin;t<=tmax;t++){if(c[t]<0.15){while(t+1<=tmax&&c[t+1]<c[t])t++;t0=t;break}}
 if(t0<0)return null;
 var a=c[t0-1]||c[t0],bb=c[t0],cc=c[t0+1]||c[t0],den=a+cc-2*bb,sh=den?(a-cc)/(2*den):0;
 return sr/(t0+sh);
}
function $(root,s){return root.querySelector(s)}

/* ---------- Tuner ---------- */
window.mountTuner=function(root){
 var inst='alto',ref=440,on=false,ctx,stream,an,buf,raf,smooth=[],lastT=0;
 root.innerHTML='<div class="tn-tabs"></div>'+
 '<div class="tn-box"><div class="tn-note" aria-live="polite">&ndash;</div><div class="tn-sub">Play a long note on your sax</div>'+
 '<div class="tn-meter" role="img" aria-label="Tuning meter"><div class="tn-zone"></div><div class="tn-needle"></div></div>'+
 '<div class="tn-scale"><span>&#9837; flat</span><span>in tune</span><span>sharp &#9839;</span></div><div class="tn-cents"></div></div>'+
 '<p><button type="button" class="tn-btn">Start tuner</button> <label class="tn-ref">Reference A = <select><option>438</option><option>440</option><option>442</option></select> Hz</label></p>'+
 '<p class="tn-msg" aria-live="polite"></p>';
 var tabs=$(root,'.tn-tabs');
 ['alto','soprano','tenor'].forEach(function(k){var b=document.createElement('button');b.type='button';b.textContent=NM[k]+' sax';b.dataset.k=k;if(k===inst)b.className='on';b.onclick=function(){inst=k;[].forEach.call(tabs.children,function(x){x.className=x.dataset.k===k?'on':''})};tabs.appendChild(b)});
 $(root,'.tn-ref select').value='440';
 $(root,'.tn-ref select').onchange=function(){ref=+this.value};
 var note=$(root,'.tn-note'),sub=$(root,'.tn-sub'),needle=$(root,'.tn-needle'),cents=$(root,'.tn-cents'),msg=$(root,'.tn-msg'),btn=$(root,'.tn-btn'),box=$(root,'.tn-box');
 function idle(){note.textContent='–';needle.style.left='50%';cents.textContent='';box.className='tn-box';}
 function loop(){
  if(!on)return;
  an.getFloatTimeDomainData(buf);
  var rms=0,i;for(i=0;i<buf.length;i++)rms+=buf[i]*buf[i];rms=Math.sqrt(rms/buf.length);
  var f=rms>0.012?yin(buf,ctx.sampleRate):null;
  if(f&&f>60&&f<1500){
   smooth.push(f);if(smooth.length>5)smooth.shift();lastT=Date.now();
   var s=smooth.slice().sort(function(a,b){return a-b})[smooth.length>>1];
   var m=69+12*Math.log(s/ref)/Math.LN2,r=Math.round(m),c=(m-r)*100;
   var w=r-SH[inst],oct=Math.floor(w/12)-1;
   note.textContent=NAMES[((w%12)+12)%12]+oct;
   sub.textContent='Written note on '+NM[inst].toLowerCase()+' sax. Sounds as '+NAMES[((r%12)+12)%12]+(Math.floor(r/12)-1)+'.';
   needle.style.left=(50+Math.max(-50,Math.min(50,c)))+'%';
   var ab=Math.abs(c);cents.textContent=(ab<5?'In tune':(c>0?'+':'')+Math.round(c)+' cents '+(c>0?'sharp':'flat'));
   box.className='tn-box '+(ab<5?'ok':ab<15?'near':'off');
  }else if(Date.now()-lastT>700){smooth=[];idle();sub.textContent='Play a long note on your sax'}
  raf=requestAnimationFrame(loop);
 }
 async function start(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){msg.textContent='This browser cannot use the microphone here.';return}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}catch(e){msg.textContent='Microphone blocked. Allow it in your browser, then try again.';return}
  var AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();if(ctx.state==='suspended')await ctx.resume();
  var src=ctx.createMediaStreamSource(stream);an=ctx.createAnalyser();an.fftSize=4096;buf=new Float32Array(4096);src.connect(an);
  on=true;btn.textContent='Stop tuner';msg.textContent='Listening. Your sound is analysed on your device only and never recorded or sent anywhere.';loop();
 }
 function stop(){on=false;cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(function(t){t.stop()});if(ctx)ctx.close();btn.textContent='Start tuner';msg.textContent='';idle();sub.textContent='Play a long note on your sax'}
 btn.onclick=function(){on?stop():start()};
 root.stopTuner=stop;
 document.addEventListener('visibilitychange',function(){if(document.hidden&&on)stop()});
};

/* ---------- Metronome ---------- */
window.mountMetronome=function(root){
 var bpm=80,beats=4,run=false,ctx,next=0,cur=0,timer,taps=[];
 root.innerHTML='<div class="mt-box"><div class="mt-bpm"><span class="mt-n">80</span><small>beats per minute</small></div>'+
 '<div class="mt-dots" aria-hidden="true"></div>'+
 '<p class="mt-row"><button type="button" class="mt-m" aria-label="Slower">&minus;</button><input class="mt-r" type="range" min="30" max="240" value="80" aria-label="Tempo"><button type="button" class="mt-p" aria-label="Faster">+</button></p>'+
 '<p class="mt-row"><label>Beats per bar <select class="mt-b"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label> <button type="button" class="mt-tap">Tap tempo</button></p>'+
 '<p><button type="button" class="mt-go">Start</button></p></div>';
 var nEl=$(root,'.mt-n'),rng=$(root,'.mt-r'),dots=$(root,'.mt-dots'),go=$(root,'.mt-go');
 function drawDots(){dots.innerHTML='';for(var i=0;i<beats;i++){var d=document.createElement('i');if(i===0)d.className='first';dots.appendChild(d)}}
 function setB(v){bpm=Math.max(30,Math.min(240,Math.round(v)));nEl.textContent=bpm;rng.value=bpm}
 rng.oninput=function(){setB(+rng.value)};
 $(root,'.mt-m').onclick=function(){setB(bpm-1)};$(root,'.mt-p').onclick=function(){setB(bpm+1)};
 $(root,'.mt-b').onchange=function(){beats=+this.value;cur=0;drawDots()};
 $(root,'.mt-tap').onclick=function(){var t=Date.now();if(taps.length&&t-taps[taps.length-1]>2000)taps=[];taps.push(t);if(taps.length>6)taps.shift();
  if(taps.length>1){var s=0;for(var i=1;i<taps.length;i++)s+=taps[i]-taps[i-1];setB(60000/(s/(taps.length-1)))}};
 function click(t,first){var o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=first?1500:1000;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(first?0.6:0.4,t+0.002);g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.06)}
 function flash(i,t){setTimeout(function(){if(!run)return;[].forEach.call(dots.children,function(d,j){d.classList.toggle('on',j===i)})},Math.max(0,(t-ctx.currentTime)*1000))}
 function sched(){while(next<ctx.currentTime+0.15){click(next,cur===0);flash(cur,next);next+=60/bpm;cur=(cur+1)%beats}}
 function start(){var AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();if(ctx.state==='suspended')ctx.resume();run=true;cur=0;next=ctx.currentTime+0.06;sched();timer=setInterval(sched,25);go.textContent='Stop'}
 function stop(){run=false;clearInterval(timer);if(ctx)ctx.close();go.textContent='Start';[].forEach.call(dots.children,function(d){d.classList.remove('on')})}
 go.onclick=function(){run?stop():start()};
 root.stopMetronome=stop;
 drawDots();
};
})();
