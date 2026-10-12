const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(startupError){
 const calls=[],scripts=[],stats={destroy:0,terminate:0,cleanup:0};
 const page={getViewport:({scale})=>({width:100*scale,height:200*scale}),render:()=>({promise:Promise.resolve()}),cleanup(){stats.cleanup++}};
 const pdf={numPages:2,getPage:async()=>page};
 const lib={GlobalWorkerOptions:{},PDFWorker:class{constructor({port}){this.port=port}destroy(){stats.destroy++}},getDocument(options){calls.push(options);return {promise:startupError&&options.worker?new Promise(()=>{}):Promise.resolve(pdf),destroy:async()=>{stats.destroy++}}}};
 const document={currentScript:{src:'https://hocbaicungcon.github.io/CHAM_THI/js/inputs.js?v=18'},createElement(tag){if(tag==='script')return {remove(){}};return {width:0,height:0,getContext(){return {fillRect(){},drawImage(){}}}}},head:{appendChild(script){scripts.push(script.src);queueMicrotask(()=>script.onload());}}};
 const Worker=class{constructor(url){calls.push({workerUrl:url});if(!startupError)throw new Error('Worker blocked');queueMicrotask(()=>this.onerror({preventDefault(){}}));}terminate(){stats.terminate++}};
 const context={module:{exports:{}},URL,document,window:{pdfjsLib:lib},Worker,console,Uint8Array,Promise,setTimeout};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/inputs'),'utf8'),context);
 return {api:context.module.exports,calls,scripts,stats};
}
for(const startupError of [false,true])test('PDF import falls back locally when '+(startupError?'worker startup fails':'worker creation is blocked'),async()=>{
 const {api,calls,scripts,stats}=setup(startupError),pages=[];
 for await(const page of api.pdfPages({arrayBuffer:async()=>new ArrayBuffer(8)}))pages.push(page);
 assert.equal(pages.length,2);assert.equal(pages[1].total,2);
 assert.deepEqual(scripts,['https://hocbaicungcon.github.io/CHAM_THI/vendor/pdfjs/pdf.worker.min.js']);
 const native=calls.find(c=>c.workerUrl);assert.equal(new URL(native.workerUrl).origin,'https://hocbaicungcon.github.io');
 assert.equal(stats.cleanup,2);assert.ok(stats.destroy>=1);
 if(startupError)assert.equal(stats.terminate,1);
 for(const options of calls.filter(c=>c.data)){assert.equal(options.useWorkerFetch,false);assert.ok(options.cMapUrl.startsWith('https://hocbaicungcon.github.io/CHAM_THI/'));}
});
