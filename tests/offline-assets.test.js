const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('offline cache includes the viewer/PDF runtime and excludes hidden desktop files',()=>{
 const assets=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../offline-assets.json'),'utf8'));
 assert.ok(assets.some(a=>a.startsWith('js/viewer.js?')));
 assert.ok(assets.some(a=>a.startsWith('vendor/pdfjs/pdf.min.js?')));
 assert.ok(assets.includes('vendor/pdfjs/pdf.worker.min.js'));
 for(const asset of assets){
  const local=asset.split('?')[0];
  assert.ok(!local.split('/').some(part=>part.startsWith('.')&&part!=='.'),'Hidden asset '+local);
  assert.ok(fs.existsSync(path.resolve(__dirname,'..',local)),asset);
 }
});
