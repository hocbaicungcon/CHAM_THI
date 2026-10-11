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
