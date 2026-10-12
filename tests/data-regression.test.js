const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const O=require('../js/omr'),readPng=require('./png-fixture');
const source=path.resolve(__dirname,'../data/bai-lam-da-cham.pdf');
const thirdSource=path.resolve(__dirname,'../data/bai-lam-da-cham 3.pdf');
const fourthSource=path.resolve(__dirname,'../data/bai-lam-da-cham 4.pdf');
const fifthSource=path.resolve(__dirname,'../data/bai-lam-da-cham 5.pdf');
const sixthSource=path.resolve(__dirname,'../data/bai-lam-da-cham 6.pdf');
test('local sixth PDF aligns all 25 sheets, reads strong fills beside faded traces, and retains real blanks',{skip:!fs.existsSync(sixthSource)},t=>{
 if(spawnSync('pdftoppm',['-v']).error)return t.skip('Poppler unavailable');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chamtn-sixth-'));
 try{
  const prefix=path.join(folder,'sheet');
  const render=spawnSync('pdftoppm',['-scale-to','1697','-png',sixthSource,prefix]);assert.equal(render.status,0,render.stderr?.toString());
  for(let page=1;page<=25;page++){
   const image=readPng(prefix+'-'+String(page).padStart(2,'0')+'.png'),aligned=O.autoAlign(image);
   assert.ok(aligned,'Page '+page);assert.equal(aligned.profile,page===2?'youngmix':'standard');assert.ok(aligned.support>=.8);
   const result=O.recognize(image,aligned.points,aligned.profile);
   if(page===1){assert.equal(result.answers.p1[2],'C');assert.equal(result.metadata.studentId,'02133668');}
   if(page===2)assert.deepEqual(result.answers.p2[1],['Đ','S','S','S']);
   for(const [p,q,answer]of [[9,5,'B'],[9,14,'A'],[19,5,'D'],[19,10,'B'],[20,20,'A']])if(page===p){
    assert.equal(result.answers.p1[q],answer);assert.match(result.flags.p1[q],/Dấu tô mờ/);
   }
   if(page===15){assert.equal(result.answers.p1[3],'');assert.equal(result.answers.p1[14],'');assert.equal(result.answers.p2[0][1],'');}
   if(page>=3)assert.ok(result.answers.p1.slice(22).every(v=>!v),'Unmarked later rows on page '+page);
  }
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('local fifth PDF accepts question three with a white gap in its fill at import sizes',{skip:!fs.existsSync(fifthSource)},t=>{
 if(spawnSync('pdftoppm',['-v']).error)return t.skip('Poppler unavailable');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chamtn-fifth-'));
 try{
  for(const size of [1754,1697]){
   const prefix=path.join(folder,'sheet'+size);
   const render=spawnSync('pdftoppm',['-f','1','-l','1','-scale-to',String(size),'-png',fifthSource,prefix]);
   assert.equal(render.status,0,render.stderr?.toString());
   const image=readPng(prefix+'-1.png'),aligned=O.autoAlign(image);assert.ok(aligned);
   const result=O.recognize(image,aligned.points,aligned.profile);
   assert.equal(result.answers.p1[2],'C');assert.equal(result.flags.p1[2],'');
   assert.ok(result.answers.p1.slice(12).every(v=>!v));
  }
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('local fourth PDF aligns despite its header and accepts the incomplete C fill',{skip:!fs.existsSync(fourthSource)},t=>{
 if(spawnSync('pdftoppm',['-v']).error)return t.skip('Poppler unavailable');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chamtn-fourth-'));
 try{
  const prefix=path.join(folder,'sheet');
  const render=spawnSync('pdftoppm',['-f','1','-l','1','-scale-to','1754','-png',fourthSource,prefix]);
  assert.equal(render.status,0,render.stderr?.toString());
  const image=readPng(prefix+'-1.png'),aligned=O.autoAlign(image);
  assert.ok(aligned);assert.equal(aligned.profile,'standard');assert.ok(aligned.auxMarkers.length>=20);
  const result=O.recognize(image,aligned.points,aligned.profile);
  assert.equal(result.answers.p1[2],'C');assert.equal(result.flags.p1[2],'');
  assert.ok(result.answers.p1.slice(12).every(v=>!v));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('local third PDF first paper reads question three and its separator column',{skip:!fs.existsSync(thirdSource)},t=>{
 if(spawnSync('pdftoppm',['-v']).error)return t.skip('Poppler unavailable');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chamtn-third-'));
 try{
  const prefix=path.join(folder,'sheet');
  const render=spawnSync('pdftoppm',['-f','1','-l','1','-scale-to','1754','-png',thirdSource,prefix]);
  assert.equal(render.status,0,render.stderr?.toString());
  const image=readPng(prefix+'-1.png'),aligned=O.autoAlign(image);
  assert.ok(aligned);
  const result=O.recognize(image,aligned.points,aligned.profile);
  assert.equal(result.answers.p1[2],'C');
  assert.equal(result.answers.p3[2],'1,2');
  assert.equal(result.flags.p3[2],'');
  assert.ok(result.flags.p3[4]);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('local PDF page two reads the seven clearly filled true/false statements and uses extra marks',{skip:!fs.existsSync(source)},t=>{
 if(spawnSync('pdftoppm',['-v']).error)return t.skip('Poppler unavailable');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chamtn-data-'));
 try{
  const prefix=path.join(folder,'sheet');
  const render=spawnSync('pdftoppm',['-f','2','-l','2','-scale-to','1754','-png',source,prefix]);
  assert.equal(render.status,0,render.stderr?.toString());
  const image=readPng(prefix+'-2.png'),aligned=O.autoAlign(image);
  assert.ok(aligned);assert.equal(aligned.profile,'youngmix');assert.ok(aligned.auxMarkers.length>=12);
  const result=O.recognize(image,aligned.points,aligned.profile);
  assert.deepEqual(result.answers.p1.slice(0,4),['A','B','C','C']);
  assert.deepEqual(result.answers.p2[0],['Đ','S','','Đ']);
  assert.deepEqual(result.answers.p2[1],['Đ','S','S','S']);
  assert.deepEqual(result.flags.p2[1],['','','','']);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
