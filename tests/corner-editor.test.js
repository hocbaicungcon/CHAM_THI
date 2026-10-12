const test=require('node:test'),assert=require('node:assert/strict'),{History}=require('../js/corner-editor');
function paper(){const points=[{x:1,y:2},{x:3,y:4},{x:5,y:6},{x:7,y:8}];points.adjustments=[{x:0,y:0,dx:1,dy:2}];return {id:'1',source:{image:true},points,answers:{p1:['B']},flags:{p1:['']},autoAligned:true,keyCode:'0101',studentId:'00123456'};}
test('undo restores the previous click and cancel restores corners, answers and projection offsets',()=>{
 const h=new History(),r=paper(),source=r.source;h.push(r,true);r.points=[];r.answers=null;r.autoAligned=false;
 h.push(r,false);r.points.push({x:10,y:20});h.push(r,false);r.points.push({x:30,y:40});
 assert.equal(h.undo(r),false);assert.deepEqual(r.points,[{x:10,y:20}]);assert.ok(h.active(r));
 assert.equal(h.cancel(r),true);assert.equal(r.source,source);assert.equal(r.autoAligned,true);assert.deepEqual(r.answers,{p1:['B']});assert.deepEqual(r.points.adjustments,[{x:0,y:0,dx:1,dy:2}]);assert.equal(h.active(r),false);
});
test('edit history survives JSON session restoration and commits after successful reading',()=>{
 const h=new History(),r=paper();h.push(r,false);r.points=[];r.answers=null;
 const restored=JSON.parse(JSON.stringify(r)),fresh=new History();assert.equal(fresh.canUndo(restored),true);assert.equal(fresh.cancel(restored),false);assert.deepEqual(restored.answers,{p1:['B']});
 fresh.push(restored,false);fresh.commit(restored);assert.equal(fresh.active(restored),false);assert.equal(fresh.cancel(restored),null);assert.equal(fresh.undo(restored),null);
});
