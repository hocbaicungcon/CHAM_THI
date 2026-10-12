const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=path.resolve(__dirname,'../data/bai-lam-da-cham 6.pdf');
test('vendored PDF runtime is classic JavaScript and preserves library/worker versions',()=>{
 for(const name of ['pdf.min.js','pdf.worker.min.js'])new vm.Script(fs.readFileSync(path.resolve(__dirname,'../vendor/pdfjs/'+name),'utf8'));
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 assert.ok(html.includes('vendor/pdfjs/pdf.min.js?v='));
 const inputs=fs.readFileSync(path.resolve(__dirname,'../js/inputs.js'),'utf8');
 assert.ok(!inputs.includes('import('));assert.ok(!inputs.includes('pdf.worker.min.mjs'));
});
test('classic PDF runtime parses all 25 real pages and their drawing operations',{skip:!fs.existsSync(source)},async()=>{
 const previous={DOMMatrix:global.DOMMatrix,Path2D:global.Path2D,ImageData:global.ImageData};
 global.DOMMatrix=class {};global.Path2D=class {};global.ImageData=class {};
 try{
  require('../vendor/pdfjs/pdf.min.js');require('../vendor/pdfjs/pdf.worker.min.js');
  const task=global.pdfjsLib.getDocument({data:new Uint8Array(fs.readFileSync(source)),verbosity:0});
  try{
   const pdf=await task.promise;assert.equal(pdf.numPages,25);
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),ops=await page.getOperatorList();assert.ok(ops.fnArray.length>0,'Page '+i);page.cleanup();
   }
  }finally{await task.destroy();}
 }finally{Object.assign(global,previous);}
});
