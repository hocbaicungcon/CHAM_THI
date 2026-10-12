(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNScanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  class ScanGate {
    constructor(){this.reset();}
    reset(){this.previous=null;this.anchor=null;this.pending='';this.lastGood=0;this.stable=0;this.since=0;this.missing=0;this.lastSignature='';this.identities=new Set();this.cooldown=0;}
    forgetCandidate(){this.previous=null;this.anchor=null;this.pending='';this.lastGood=0;this.stable=0;this.since=0;}
    hold(now){
      if(this.previous&&now-this.lastGood>1200)this.forgetCandidate();
      return {ready:false,reason:'quality',progress:0};
    }
    observe(frame,now){
      if(!frame){if(++this.missing>=2){this.lastSignature='';this.forgetCandidate();}return {ready:false,reason:'missing'};}
      this.missing=0;
      if((frame.identity&&this.identities.has(frame.identity))||frame.signature===this.lastSignature){this.forgetCandidate();return {ready:false,reason:'duplicate'};}
      const old=this.previous;
      const diagonal=Math.hypot(frame.width,frame.height);
      // Compare with the start of the stable interval: small jitter is allowed,
      // but a slowly sliding sheet must not drift into an automatic capture.
      const moved=!old||now-this.lastGood>1200||this.anchor.some((p,i)=>Math.hypot(p.x-frame.points[i].x,p.y-frame.points[i].y)>diagonal*.025);
      const newIdentity=old&&old.identity&&frame.identity&&old.identity!==frame.identity;
      if(!moved&&!newIdentity&&old.signature!==frame.signature&&this.pending!==frame.signature){
        this.pending=frame.signature;
        return {ready:false,reason:'stabilizing',progress:Math.min(.85,(now-this.since)/160)};
      }
      if(moved||newIdentity||old.signature!==frame.signature){this.stable=1;this.since=now;this.anchor=frame.points.map(p=>({...p}));}else this.stable++;
      this.pending=''; this.previous=frame; this.lastGood=now;
      return {ready:this.stable>=3&&now-this.since>=160&&now>=this.cooldown,reason:'stabilizing',progress:Math.min(1,(now-this.since)/160)};
    }
    accept(frame,now){this.lastSignature=frame.signature;if(frame.identity)this.identities.add(frame.identity);this.cooldown=now+160;this.forgetCandidate();}
  }
  return {ScanGate};
});
