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

function lowResolution(source,width){
 const scale=source.width/width,height=Math.round(source.height/scale),data=new Uint8ClampedArray(width*height*4).fill(255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.round((x+.5)*scale-.5),sy=Math.round((y+.5)*scale-.5),k=(y*width+x)*4;
  for(let c=0;c<3;c++){let sum=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=Math.max(0,Math.min(source.width-1,sx+dx)),yy=Math.max(0,Math.min(source.height-1,sy+dy));sum+=source.data[(yy*source.width+xx)*4+c];n++;}data[k+c]=sum/n;}
 }
 return {width,height,data};
}
test('multiple pale corner squares still align and read at 480/640px with blur',()=>{
 for(const file of ['PHIEU_CHAM_TN.png','PHIEU_TLTN_CHUAN.png']){
  const original=read(path.join(__dirname,'../template',file)),baseline=O.autoAlign(original),map=O.project(baseline.points);
  const position=O.choicePosition('p1',0,0,'B',baseline.profile),mark=map(position.x,position.y);
  for(let y=Math.round(mark.y-7);y<=mark.y+7;y++)for(let x=Math.round(mark.x-7);x<=mark.x+7;x++)if((x-mark.x)**2+(y-mark.y)**2<=49){const k=(y*original.width+x)*4;original.data[k]=original.data[k+1]=original.data[k+2]=35;}
  for(const marker of baseline.markers.slice(0,3))for(let y=Math.max(0,Math.floor(marker.y-18));y<Math.min(original.height,marker.y+18);y++)for(let x=Math.max(0,Math.floor(marker.x-18));x<Math.min(original.width,marker.x+18);x++){
   const k=(y*original.width+x)*4;if(original.data[k]<190)original.data[k]=original.data[k+1]=original.data[k+2]=215;
  }
  for(const width of [640,480]){
   const image=lowResolution(original,width),result=O.autoAlign(image);assert.ok(result,`${file} ${width}`);assert.equal(result.profile,baseline.profile);assert.ok(result.support>=.8);
   const expected=baseline.points.map(p=>({x:p.x*width/original.width,y:p.y*image.height/original.height}));
   result.points.forEach((p,i)=>assert.ok(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<7,`${file} ${width} corner ${i}`));
   const answer=O.recognize(image,result.points,result.profile);assert.equal(answer.answers.p1[0],'B',`${file} ${width}`);assert.ok(answer.answers.p1.slice(1).every(v=>!v));
   assert.ok(answer.answers.p2.flat().every(v=>!v));assert.ok(answer.answers.p3.every(v=>!v));
  }
 }
});
