const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../js/answer-documents'),X=require('../vendor/xlsx/xlsx.full.min');
const samples=[
 ['Đáp án.pdf','0101',12,'DBBBBDBDBCAD',['SSSĐ','SĐSĐ','ĐSĐS','SĐĐĐ'],['0,88','5,8','18,5','5','-2,1','1145']],
 ['Dap an HHKS12-L4.pdf','0301',18,'BBCACAABBBAABBBCAD',['SĐĐĐ','ĐSSS','ĐSĐĐ','ĐSSĐ'],['5','5','2','44,6','10','36,9']],
 ['HD CHẤM.pdf','0401',18,'DCAACCDCACBDCAACBA',['SĐĐĐ','SĐSĐ','ĐĐSĐ','ĐĐSS'],['4875','0,07','2605','2026','1423','4321']],
 ['HDC MON LICH SU L4.pdf','0801',24,'DCAAADCCDBDCCADDCDCDBADB',['ĐSĐS','ĐĐSĐ','ĐĐĐS','SĐSS'],[]],
 ['ĐỊA LÍ 12_HƯỚNG DẪN CHẤM.pdf','0901',18,'CADDCBDDDBCBADABAC',['ĐSĐS','SĐSĐ','SSĐS','ĐSSS'],['8,2','1,9','3,86','5,1','12,8','398']]
];
test('all five actual PDF answer templates parse codes, merged tables and continuation pages',{skip:samples.some(([file])=>!fs.existsSync(path.join(__dirname,'../template/Dap an',file)))},async()=>{
 const previous={DOMMatrix:global.DOMMatrix,Path2D:global.Path2D,ImageData:global.ImageData};
 global.DOMMatrix=class{};global.Path2D=class{};global.ImageData=class{};
 try{
  require('../vendor/pdfjs/pdf.min.js');require('../vendor/pdfjs/pdf.worker.min.js');
  for(const [file,code,count,p1,p2,p3] of samples){
   const task=global.pdfjsLib.getDocument({data:new Uint8Array(fs.readFileSync(path.join(__dirname,'../template/Dap an',file))),verbosity:0});
   try{
    const pdf=await task.promise,lines=[];for(let p=1;p<=pdf.numPages;p++)lines.push(...D.pdfLines((await(await pdf.getPage(p)).getTextContent()).items));
    const bank=D.parseLines(lines);assert.equal(bank.length,file.startsWith('Dap')?5:4,file);
    const exam=bank.find(e=>e.code===code);assert.ok(exam,file);assert.equal(exam.keys.p1.join(''),p1,file);
    assert.deepEqual(exam.keys.p2.map(row=>row.join('')),p2,file);assert.deepEqual(exam.keys.p3,p3,file);
    for(const e of bank)assert.deepEqual(Object.values(e.keys).map(v=>v.length),[count,4,p3.length]);
   }finally{await task.destroy();}
  }
 }finally{Object.assign(global,previous);}
});
function wordBytes(){
 const p=text=>'<w:p><w:r><w:t>'+text+'</w:t></w:r></w:p>';
 const table=rows=>'<w:tbl>'+rows.map(row=>'<w:tr>'+row.map(cell=>'<w:tc>'+p(cell)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';
 const xml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+p('PHẦN I. gồm 2 câu')+table([['Câu','Mã đề 0101','Mã đề 0103'],['1','AB','X'],['2','O','C']])+p('PHẦN II. gồm 1 câu')+table([['Câu','Mã đề 0101','Mã đề 0103'],['1','ĐSOX','XXXX']])+p('PHẦN III. gồm 2 câu')+table([['Câu','Mã đề 0101','Mã đề 0103'],['1','-1,25','O'],['2','X','0,5']])+'</w:body></w:document>';
 const zip=X.CFB.utils.cfb_new();X.CFB.utils.cfb_add(zip,'word/document.xml',Buffer.from(xml));
 X.CFB.utils.cfb_add(zip,'[Content_Types].xml',Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
 return X.CFB.write(zip,{type:'buffer',fileType:'zip',compression:true});
}
test('Word ZIP and XML import preserves extended keys and decimal commas',()=>{
 const bank=D.docxExams(wordBytes(),X);assert.deepEqual(bank[0],{code:'0101',keys:{p1:['AB','O'],p2:[['Đ','S','O','X']],p3:['-1,25','X']}});
 assert.deepEqual(bank[1].keys,{p1:['X','C'],p2:[['X','X','X','X']],p3:['O','0,5']});
 assert.throws(()=>D.docxExams(Buffer.from('invalid'),X));
});
test('documents reject empty, conflicting and incomplete answer tables',()=>{
 assert.throws(()=>D.parseLines(['HƯỚNG DẪN CHẤM']));
 assert.throws(()=>D.parseLines(['PHẦN I. gồm 2 câu','0101 0103','1 A B']));
 assert.throws(()=>D.parseLines(['PHẦN I.','0101 0103','1 A B','1 C B']));
 assert.throws(()=>D.parseLines(['PHẦN I.','0101 0103','1 A B','PHẦN II.','0101 0103','a Đ S','b S Đ','c Đ S']));
 assert.throws(()=>D.parseLines(['PHẦN I.','0101 0103','1 A B','PHẦN III.','0101 0103']));
});
if(process.env.CHAMTN_DOCX_QA)fs.writeFileSync(process.env.CHAMTN_DOCX_QA,wordBytes());
