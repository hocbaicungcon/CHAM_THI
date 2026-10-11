const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const O=require('../js/omr'),readPng=require('./png-fixture');
const source=path.resolve(__dirname,'../data/bai-lam-da-cham.pdf');
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
