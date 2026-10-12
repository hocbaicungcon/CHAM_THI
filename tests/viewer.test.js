const test=require('node:test'),assert=require('node:assert/strict');
const V=require('../js/viewer');
test('fullscreen paper swipes map up/right to next and down/left to previous',()=>{
 assert.equal(V.swipeDirection(110,5),1);
 assert.equal(V.swipeDirection(5,-110),1);
 assert.equal(V.swipeDirection(-110,5),-1);
 assert.equal(V.swipeDirection(5,110),-1);
 assert.equal(V.swipeDirection(20,-15),0);
 assert.equal(V.swipeDirection(100,0,1800),0);
});
test('viewer stops at first/last paper and presents the selected paper',()=>{
 const elements={},events={};let ids=['one','two','three'],seen=[],isOpen=false;
 for(const selector of ['.paper-viewer-stage','canvas','[data-paper-prev]','[data-paper-next]','[data-paper-close]','[data-paper-title]','[data-paper-counter]'])elements[selector]={addEventListener(){},getContext(){return {drawImage(){}};}};
 const dialog={querySelector(s){return elements[s]},addEventListener(name,fn){events[name]=fn},get open(){return isOpen},showModal(){isOpen=true},close(){isOpen=false;events.close()}};
 const oldDocument=global.document;global.document={body:{classList:{add(){},remove(){}}},activeElement:{focus(){}}};
 try{
  const viewer=V.create({dialog,getIds:()=>ids,render:id=>{seen.push(id);return {image:{width:10,height:20},label:id,score:'2 điểm'}}});
  viewer.open('one');viewer.move(-1);assert.deepEqual(seen,['one']);
  viewer.move(1);assert.equal(seen.at(-1),'two');assert.equal(elements['[data-paper-counter]'].textContent,'2 / 3 · 2 điểm');
  viewer.move(1);viewer.move(1);assert.deepEqual(seen,['one','two','three']);assert.equal(elements['[data-paper-next]'].disabled,true);
  viewer.close();assert.equal(isOpen,false);
 }finally{global.document=oldDocument;}
});
