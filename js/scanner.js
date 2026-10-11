(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNScanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  class ScanGate {
    constructor(){this.reset();}
    reset(){this.previous=null;this.stable=0;this.since=0;this.missing=0;this.lastSignature='';this.identities=new Set();this.cooldown=0;}
    forgetCandidate(){this.previous=null;this.stable=0;this.since=0;}
    observe(frame,now){
      if(!frame){if(++this.missing>=2){this.lastSignature='';this.forgetCandidate();}return {ready:false,reason:'missing'};}
      this.missing=0;
      if((frame.identity&&this.identities.has(frame.identity))||frame.signature===this.lastSignature){this.forgetCandidate();return {ready:false,reason:'duplicate'};}
      const old=this.previous;
      const diagonal=Math.hypot(frame.width,frame.height);
      const moved=!old||old.points.some((p,i)=>Math.hypot(p.x-frame.points[i].x,p.y-frame.points[i].y)>diagonal*.012);
      if(moved||old.signature!==frame.signature){this.stable=1;this.since=now;}else this.stable++;
      this.previous=frame;
      return {ready:this.stable>=3&&now-this.since>=1000&&now>=this.cooldown,reason:'stabilizing',progress:Math.min(1,(now-this.since)/1000)};
    }
    accept(frame,now){this.lastSignature=frame.signature;if(frame.identity)this.identities.add(frame.identity);this.cooldown=now+1800;this.forgetCandidate();}
  }
  return {ScanGate};
});
