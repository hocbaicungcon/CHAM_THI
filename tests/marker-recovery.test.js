const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const O=require('../js/omr'),read=require('./png-fixture');
function hide(image,marker){const radius=Math.ceil(marker.size*.8+4);for(let y=Math.max(0,Math.floor(marker.y-radius));y<Math.min(image.height,marker.y+radius);y++)for(let x=Math.max(0,Math.floor(marker.x-radius));x<Math.min(image.width,marker.x+radius);x++){const k=(y*image.width+x)*4;image.data[k]=image.data[k+1]=image.data[k+2]=250;}}
function rotate(image){const out={width:image.height,height:image.width,data:new Uint8ClampedArray(image.data.length)};for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const a=(y*image.width+x)*4,b=(x*out.width+image.height-1-y)*4;out.data.set(image.data.subarray(a,a+4),b);}return out;}
for(const file of ['PHIEU_CHAM_TN.png','PHIEU_TLTN_CHUAN.png'])test(`one glared corner is reconstructed from current auxiliary marks: ${file}`,()=>{
 const original=read(path.join(__dirname,'../template',file)),baseline=O.autoAlign(original);assert.ok(baseline);
 for(let corner=0;corner<4;corner++){
  let image={...original,data:new Uint8ClampedArray(original.data)};hide(image,baseline.markers[corner]);
  for(let rotation=0;rotation<4;rotation++){
   const result=O.autoAlign(image);assert.ok(result,`corner ${corner}, rotation ${rotation}`);
   assert.equal(result.profile,baseline.profile);assert.ok(result.markers.some(m=>m.inferred),`inference corner ${corner}, rotation ${rotation}, support ${result.support}`);assert.ok(result.support>=.8);
   const answers=O.recognize(image,result.points,result.profile).answers;
   assert.ok(answers.p1.every(v=>!v));assert.ok(answers.p2.flat().every(v=>!v));assert.ok(answers.p3.every(v=>!v));
   image=rotate(image);
  }
 }
});
test('recovery rejects two missing corners and never reuses markers from a blank frame',()=>{
 const original=read(path.join(__dirname,'../template/PHIEU_TLTN_CHUAN.png')),previous=O.autoAlign(original);
 for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
  const image={...original,data:new Uint8ClampedArray(original.data)};hide(image,previous.markers[a]);hide(image,previous.markers[b]);
  assert.equal(O.autoAlign(image,previous),null,`${a},${b}`);
 }
 const blank={...original,data:new Uint8ClampedArray(original.data.length).fill(255)};assert.equal(O.autoAlign(blank,previous),null);
});
test('strong graphite beside an erased trace is returned with review; two strong fills remain unresolved',()=>{
 assert.deepEqual(O.choose([1,.7],['Đ','S'],true,[.5,.1]),{value:'Đ',flag:'Dấu tô mờ ở ô khác · cần kiểm tra'});
 assert.equal(O.choose([1,1],['Đ','S'],true,[.48,.42]).value,'');
 assert.equal(O.choose([.4,.38],['Đ','S'],true,[.06,.055]).value,'');
});
test('tracking recovers a newly obscured corner but still needs three current corner components',()=>{
 const image=read(path.join(__dirname,'../template/PHIEU_TLTN_CHUAN.png')),previous=O.autoAlign(image);
 hide(image,previous.markers[3]);const recovered=O.autoAlign(image,previous);
 assert.ok(recovered?.tracked);assert.equal(recovered.recoveredCorner,3);assert.ok(recovered.support>=.8);
 hide(image,previous.markers[2]);assert.equal(O.autoAlign(image,recovered),null);
});
test('colored grading crosses do not create fills and do not erase underlying graphite',()=>{
 const width=1229,height=1754,points=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
 for(const graphite of [false,true]){
  const data=new Uint8ClampedArray(width*height*4).fill(255);
  for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){
   const k=((644+dy)*width+182+dx)*4;
   if(graphite&&dx*dx+dy*dy<=49)data[k]=data[k+1]=data[k+2]=65;
   if(Math.abs(dx-dy)<=1||Math.abs(dx+dy)<=1){data[k]=223;data[k+1]=32;data[k+2]=43;}
  }
  const dot=O.detector({width,height,data},points);
  assert.equal(O.choose([133,182,231,280].map(x=>dot(x,644)),['A','B','C','D']).value,graphite?'B':'');
 }
});
