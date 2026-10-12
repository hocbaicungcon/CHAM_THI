(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNPaperViewer=api;})(globalThis,function(){
'use strict';
function swipeDirection(dx,dy,duration=0){
 if(duration>1600||Math.max(Math.abs(dx),Math.abs(dy))<45)return 0;
 return Math.abs(dx)>Math.abs(dy)?(dx>0?1:-1):(dy<0?1:-1);
}
function create({dialog,getIds,render}){
 const stage=dialog.querySelector('.paper-viewer-stage'),canvas=dialog.querySelector('canvas');
 const previous=dialog.querySelector('[data-paper-prev]'),next=dialog.querySelector('[data-paper-next]');
 let currentId='',start=null,returnFocus=null;
 function show(id){
  const ids=getIds(),index=ids.indexOf(id);if(index<0)return;
  currentId=id;const item=render(id);canvas.width=item.image.width;canvas.height=item.image.height;
  canvas.getContext('2d').drawImage(item.image,0,0);
  dialog.querySelector('[data-paper-title]').textContent=item.label;
  dialog.querySelector('[data-paper-counter]').textContent=`${index+1} / ${ids.length}${item.score?' · '+item.score:''}`;
  previous.disabled=index===0;next.disabled=index===ids.length-1;
 }
 function move(direction){const ids=getIds(),index=ids.indexOf(currentId),target=index+direction;if(target>=0&&target<ids.length)show(ids[target]);}
 previous.onclick=()=>move(-1);next.onclick=()=>move(1);
 dialog.querySelector('[data-paper-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{start=null;document.body.classList.remove('paper-viewer-open');returnFocus?.focus();});
 stage.addEventListener('pointerdown',event=>{
  if(!event.isPrimary){start=null;return;}
  start={x:event.clientX,y:event.clientY,time:performance.now(),id:event.pointerId};stage.setPointerCapture(event.pointerId);
 });
 stage.addEventListener('pointercancel',()=>{start=null;});
 stage.addEventListener('pointerup',event=>{
  if(!start||event.pointerId!==start.id)return;
  const direction=swipeDirection(event.clientX-start.x,event.clientY-start.y,performance.now()-start.time);start=null;
  if(direction)move(direction);
 });
 dialog.addEventListener('keydown',event=>{
  const direction=['ArrowRight','ArrowUp'].includes(event.key)?1:['ArrowLeft','ArrowDown'].includes(event.key)?-1:0;
  if(direction){event.preventDefault();move(direction);}
 });
 return {open(id){if(!getIds().includes(id))return;returnFocus=document.activeElement;show(id);document.body.classList.add('paper-viewer-open');if(!dialog.open)dialog.showModal();},close(){if(dialog.open)dialog.close();},move};
}
return {create,swipeDirection};
});
