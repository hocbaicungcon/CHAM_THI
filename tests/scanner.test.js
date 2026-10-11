const test=require('node:test');const assert=require('node:assert/strict');const {ScanGate}=require('../js/scanner');
const frame=(signature='A',identity='001:101',offset=0)=>({signature,identity,width:1000,height:1500,points:[{x:offset,y:0},{x:1000+offset,y:0},{x:1000+offset,y:1500},{x:offset,y:1500}]});
test('auto capture requires matching answers and stationary corners for a full second',()=>{
 const g=new ScanGate();assert.equal(g.observe(frame(),0).ready,false);assert.equal(g.observe(frame(),450).ready,false);assert.equal(g.observe(frame(),900).ready,false);assert.equal(g.observe(frame(),1350).ready,true);
 g.forgetCandidate();assert.equal(g.observe(frame(),2000).ready,false);assert.equal(g.observe(frame('B'),2450).ready,false);assert.equal(g.observe(frame('B','001:101',50),2900).ready,false);
});
test('saved student and exam are not captured again, even after leaving the camera',()=>{
 const g=new ScanGate();g.accept(frame(),1000);assert.equal(g.observe(frame(),4000).reason,'duplicate');g.observe(null,4500);g.observe(null,5000);assert.equal(g.observe(frame('changed'),6000).reason,'duplicate');
 assert.equal(g.observe(frame('next','002:101'),6500).ready,false);g.observe(frame('next','002:101'),7000);assert.equal(g.observe(frame('next','002:101'),7500).ready,true);
});
test('anonymous sheet needs to leave before another sheet with identical answers can be saved',()=>{
 const g=new ScanGate(), f=frame('same','');g.accept(f,1000);assert.equal(g.observe(f,3000).reason,'duplicate');g.observe(null,3500);assert.equal(g.observe(f,4000).reason,'duplicate');g.observe(null,4500);g.observe(null,5000);g.observe(f,5500);g.observe(f,6000);assert.equal(g.observe(f,6500).ready,true);
});
test('cooldown and reset isolate camera sessions',()=>{
 const g=new ScanGate();g.accept(frame(),1000);const next=frame('B','002:101');g.observe(next,1100);g.observe(next,1700);assert.equal(g.observe(next,2200).ready,false);assert.equal(g.observe(next,2900).ready,true);g.reset();assert.equal(g.observe(frame(),0).reason,'stabilizing');
});


test('small hand tremor and one transient read do not restart the stable interval',()=>{
 const g=new ScanGate(); g.observe(frame('A','001:101',0),0);
 assert.equal(g.observe(frame('A','001:101',28),450).ready,false);
 assert.equal(g.observe(frame('blurred','001:101',-20),900).ready,false);
 assert.equal(g.observe(frame('A','001:101',12),1350).ready,true);
});
test('brief blurred frame never captures and a long blur resets stability',()=>{
 const g=new ScanGate();g.observe(frame(),0);g.observe(frame(),450);
 assert.equal(g.hold(900).ready,false);assert.equal(g.observe(frame(),1350).ready,true);
 g.hold(3000);assert.equal(g.observe(frame(),3100).ready,false);
});
test('slow camera drift outside the starting position requires a new stable interval',()=>{
 const g=new ScanGate();g.observe(frame('A','001:101',0),0);g.observe(frame('A','001:101',20),450);
 g.observe(frame('A','001:101',40),900);
 assert.equal(g.observe(frame('A','001:101',60),1350).ready,false);
});
test('repeated changes in answers cannot trigger a capture on the old stable interval',()=>{
 const g=new ScanGate();g.observe(frame(),0);g.observe(frame(),450);
 assert.equal(g.observe(frame('B'),900).ready,false);assert.equal(g.observe(frame('B'),1350).ready,false);
 assert.equal(g.observe(frame('B'),1800).ready,false);assert.equal(g.observe(frame('B'),2400).ready,true);
});
