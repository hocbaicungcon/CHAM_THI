(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNAnswerDocuments=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const Inputs=root.ChamTNInputs||(typeof require==='function'?require('./inputs.js'):null);
  const normalize=value=>String(value??'').normalize('NFC').replace(/\u00a0/g,' ').trim();
  function pdfLines(items){
    const lines=[];
    for(const item of items.filter(item=>normalize(item.str)).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
      const y=item.transform[5],line=lines.find(line=>Math.abs(line.y-y)<=4);
      if(line)line.items.push(item);else lines.push({y,items:[item]});
    }
    return lines.sort((a,b)=>b.y-a.y).map(line=>line.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(item=>normalize(item.str)).join(' '));
  }
  function parseLines(lines){
    const bank=new Map();let codes=[],section=0,tfQuestion=0,tfLetter=-1,tfColumns=0;
    const expected={}, required=new Set();
    function exam(code){if(!bank.has(code))bank.set(code,{code,keys:{p1:[],p2:[],p3:[]}});return bank.get(code);}
    function put(code,part,q,value,letter){
      if(!Number.isInteger(q)||q<1||q>(part==='p1'?40:part==='p2'?8:6))throw new Error('Bảng đáp án có số câu vượt mẫu phiếu.');
      const values=exam(code).keys[part];
      if(part==='p2'){
        if(!values[q-1])values[q-1]=Array(4).fill('');
        if(letter===undefined){value.forEach((v,i)=>put(code,part,q,v,i));return;}
        if(values[q-1][letter]&&values[q-1][letter]!==value)throw new Error(`Mã đề ${code}: đáp án phần II câu ${q} bị trùng và khác nhau.`);
        values[q-1][letter]=value;
      }else{
        if(values[q-1]&&values[q-1]!==value)throw new Error(`Mã đề ${code}: đáp án câu ${q} bị trùng và khác nhau.`);
        values[q-1]=value;
      }
    }
    for(const source of lines){
      const line=normalize(source),upper=line.toUpperCase();if(!line)continue;
      const heading=upper.match(/PHẦN\s+(III|II|I)(?=[\s.:]|$)/);
      if(heading){section=heading[1].length;required.add('p'+section);tfQuestion=0;tfLetter=-1;tfColumns=0;const count=line.match(/(?:gồm|đến câu)\s+(\d+)\s*(?:câu)?/i);if(count)expected['p'+section]=Number(count[1]);continue;}
      const tokens=line.split(/\s+/).filter(Boolean);
      // Codes are accepted only on a header without answer cells or numbered questions.
      const headerCodes=tokens.filter(value=>/^\d{3,4}$/.test(value));
      const headerRest=tokens.filter(value=>!/^\d{3,4}$/.test(value));
      if(headerCodes.length&&headerRest.every(value=>/^(?:MÃĐỀ|MÃ|ĐỀ|GỐC|CÂU|LỆNH|HỎI|[|/])$/i.test(value))){
        codes=(/\bGỐC\b/u.test(upper)?['000']:[]).concat(headerCodes);tfQuestion=0;tfLetter=-1;tfColumns=0;codes.forEach(exam);continue;
      }
      if(!codes.length)continue;
      const clean=tokens.filter(value=>!/^I{1,3}$/.test(value));
      const tf=value=>/^(?:Đ|D|ĐÚNG|S|SAI|O|X)$/i.test(value);
      const toTF=value=>/^(?:Đ|D|ĐÚNG)$/i.test(value)?'Đ':/^SAI$/i.test(value)?'S':value.toUpperCase();
      const letterIndex = /^[abcd][).:]?$/i.test(clean[0]) ? 0 : /^\d+$/.test(clean[0]) && /^[abcd][).:]?$/i.test(clean[1] || '') ? 1 : -1;
      const letterToken = letterIndex >= 0 ? clean[letterIndex] : null;
      const tfValues=clean.filter((value,i)=>i!==letterIndex && tf(value)).map(toTF);
      if(section===2&&letterToken&&tfValues.length){
        const letter='abcd'.indexOf(letterToken[0].toLowerCase());
        if(tfValues.length%codes.length||tfValues.length/codes.length>8)throw new Error('Bảng đúng/sai thiếu hoặc thừa ô đáp án.');
        const columns=tfValues.length/codes.length;
        if(letter===0){tfQuestion++;tfColumns=columns;tfLetter=-1;}
        if(letter!==tfLetter+1||columns!==tfColumns)throw new Error('Bảng đúng/sai cần đủ các ý a, b, c, d theo thứ tự.');
        tfLetter=letter;
        codes.forEach((code,c)=>{for(let q=0;q<columns;q++)put(code,'p2',columns===1?tfQuestion:q+1,tfValues[c*columns+q],letter);});
        continue;
      }
      const q=Number(clean[0]);if(!Number.isInteger(q)||q<1||q>40)continue;
      const values=clean.slice(1);if(!values.length)continue;
      // Ignore table question-number headers; they do not contain answer cells.
      if(section===2&&tfValues.length===codes.length*4){codes.forEach((code,c)=>put(code,'p2',q,tfValues.slice(c*4,c*4+4)));continue;}
      if(values.length!==codes.length){
        if(values.some(value=>/^[ABCDOX]$|^[ĐDSOX]{4}$/.test(value)))throw new Error(`Câu ${q}: số ô đáp án không khớp số mã đề.`);
        continue;
      }
      let part=section;
      if(values.every(value=>/^[ĐDSOX]{4}$/.test(value)))part=2;
      else if(values.every(value=>/^[OX]$/.test(value)))part=section||1;
      else if(values.every(value=>/^[ABCD]{1,4}$|^[OX]$/.test(value))&&section!==3)part=1;
      else if(values.every(value=>/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$|^[OX]$/.test(value)))part=3;
      else continue;
      section=part;
      values.forEach((value,c)=>put(codes[c],'p'+part,q,part===2?(/^[OX]$/.test(value)?value.repeat(4):value.replace(/D/g,'Đ')).split(''):value));
    }
    if(!bank.size)throw new Error('Không tìm thấy bảng đáp án và mã đề. Hãy dùng PDF có văn bản hoặc Word .docx với bảng theo mẫu.');
    const exams=[...bank.values()];
    for(const e of exams){
      for(const part of ['p1','p2','p3']){
        e.keys[part]=Array.from(e.keys[part],value=>value??(part==='p2'?Array(4).fill(''):''));
        if(required.has(part)&&!e.keys[part].length || expected[part]&&e.keys[part].length!==expected[part])throw new Error(`Mã đề ${e.code}: chưa đọc đủ số câu ${part.replace('p','phần ')}. Kiểm tra bảng đáp án.`);
      }
      Inputs.validateExam(e);
    }
    // A repeated header may not silently introduce a code with fewer sections.
    const lengths=exams.map(e=>Object.values(e.keys).map(values=>values.length).join(','));
    if(new Set(lengths).size!==1)throw new Error('Các mã đề chưa đọc đủ cùng số câu từng phần.');
    return exams;
  }
  function docxLines(xml){
    const decode=text=>text.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
    const text=chunk=>[...chunk.replace(/<w:del\b[\s\S]*?<\/w:del>/g,'').matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match=>decode(match[1])).join('');
    const lines=[];
    for(const block of xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g)){
      if(block[0].startsWith('<w:tbl'))for(const row of block[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g))lines.push([...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map(cell=>text(cell[0])).join(' '));
      else lines.push(text(block[0]));
    }
    return lines;
  }
  function docxExams(bytes,xlsx){
    const archive=xlsx.CFB.read(bytes,{type:'array'}),entry=xlsx.CFB.find(archive,'/word/document.xml');
    if(!entry?.content)throw new Error('File không phải tài liệu Word .docx hợp lệ.');
    return parseLines(docxLines(new TextDecoder('utf-8').decode(entry.content)));
  }
  async function fromFile(file){
    if(/\.pdf$/i.test(file.name)){
      const lines=[];for await(const page of Inputs.pdfTextPages(file))lines.push(...pdfLines(page.items));
      return parseLines(lines);
    }
    if(/\.docx$/i.test(file.name))return docxExams(new Uint8Array(await file.arrayBuffer()),root.XLSX);
    throw new Error('Hỗ trợ PDF có văn bản và Word .docx. Với Word .doc, hãy lưu lại thành .docx.');
  }
  return {pdfLines,parseLines,docxLines,docxExams,fromFile};
});
