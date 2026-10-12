// The vendored standalone bundles already expose pdfjsLib/pdfjsWorker globally.
// Remove only module syntax; keep the same PDF.js version, implementation and license.
const fs=require('node:fs');
for(const stem of ['pdf.min','pdf.worker.min']){
 const input='vendor/pdfjs/'+stem+'.mjs',output='vendor/pdfjs/'+stem+'.js';
 let source=fs.readFileSync(input,'utf8');
 if(!/export\{[^}]+\};\s*$/.test(source))throw new Error('Unexpected PDF.js export format: '+input);
 source=source.replace(/export\{[^}]+\};\s*$/,'').replaceAll('import.meta.url','pdfModuleUrl');
 fs.writeFileSync(output,'(function(){\nconst pdfModuleUrl=typeof document!=="undefined"?document.currentScript.src:globalThis.location?.href;\n'+source+'\n})();\n');
}
