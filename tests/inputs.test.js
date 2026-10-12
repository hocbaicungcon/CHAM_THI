const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Inputs = require('../js/inputs.js');
const OMR = require('../js/omr.js');
const Reports = require('../js/reports.js');
const XLSX = require('../vendor/xlsx/xlsx.full.min.js');

function markedSheet() {
  const width = 1229, height = 1754, data = new Uint8ClampedArray(width * height * 4).fill(255);
  function box(x, y, halfWidth, halfHeight = halfWidth, color = [0, 0, 0]) {
    for (let iy = Math.floor(y - halfHeight); iy <= y + halfHeight; iy++) for (let ix = Math.floor(x - halfWidth); ix <= x + halfWidth; ix++) {
      const k = (iy * width + ix) * 4; data[k] = color[0]; data[k + 1] = color[1]; data[k + 2] = color[2];
    }
  }
  [[39, 31], [1196, 31], [1196, 1701], [39, 1701], [39, 569], [39, 952], [39, 1198]].forEach(([x, y]) => box(x, y, 11));
  [131, 187, 222, 256, 291, 325, 359, 394, 428, 463, 497].forEach(y => box(1196, y, 11, 4));
  box(182, 644, 6); box(133, 1060, 6); box(156, 1414, 6);
  '00123456'.split('').forEach((d, i) => box(861 + 24 * i, 200 + 34.5 * Number(d), 6));
  '0101'.split('').forEach((d, i) => box(1075 + 24 * i, 200 + 34.5 * Number(d), 6));
  return { width, height, data };
}
function rotate90(source) {
  const width = source.height, height = source.width, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const a = (y * source.width + x) * 4, b = (x * width + (source.height - 1 - y)) * 4;
    data.set(source.data.subarray(a, a + 4), b);
  }
  return { width, height, data };
}
test('actual YoungMix workbook imports 25 codes and trims only trailing unused questions', () => {
  const workbook = XLSX.read(fs.readFileSync(path.join(__dirname, '../template/BGD-2025-YoungMix.xlsx')), { type: 'buffer' });
  const exams = Inputs.workbookExams(workbook, XLSX);
  assert.equal(exams.length, 25); assert.equal(exams[0].code, '000');
  assert.deepEqual(exams[0].keys.p1.slice(0, 4), ['B', 'C', 'A', 'D']);
  for (const exam of exams) assert.deepEqual([exam.keys.p1.length, exam.keys.p2.length, exam.keys.p3.length], [18, 4, 6]);
  assert.equal(Inputs.matchingCode(exams, '0101'), '101');
  assert.equal(Inputs.matchingCode(exams, '0000'), '000');
  assert.equal(Inputs.matchingCode(exams, '9999'), '');
});
test('QR answer schema handles metadata, true/false and numeric values', () => {
  const data = JSON.stringify({ '101': 'AB#ĐSĐS#-1.25_0', success: true, type: 6 });
  const exams = Inputs.parseQrPayload(data);
  assert.equal(exams.length, 1); assert.deepEqual(exams[0].keys.p2, [['Đ', 'S', 'Đ', 'S']]);
  assert.deepEqual(exams[0].keys.p3, ['-1.25', '0']);
  assert.throws(() => Inputs.parseQrPayload('https://example.com'));
  assert.throws(() => Inputs.parseQrPayload('{"101":"AQ#ĐSĐS#1"}'));
  assert.throws(() => Inputs.parseQrPayload('{"success":true}'));
});
test('automatic alignment reads rotated sheets and preserves leading zeros in IDs', () => {
  let image = markedSheet();
  for (let rotation = 0; rotation < 4; rotation++) {
    const align = OMR.autoAlign(image); assert.ok(align, 'Rotation ' + rotation);
    const result = OMR.recognize(image, align.points);
    assert.equal(result.answers.p1[0], 'B'); assert.equal(result.metadata.studentId, '00123456');
    assert.equal(result.metadata.examCode, '0101'); assert.equal(result.metadata.examUncertain, false);
    image = rotate90(image);
  }
});
test('an image without registration marks is not automatically graded', () => {
  const image = { width: 300, height: 450, data: new Uint8ClampedArray(300 * 450 * 4).fill(255) };
  assert.equal(OMR.autoAlign(image), null);
});
test('printed pink digit glyphs are ignored by the bubble reader', () => {
  const width = 1229, height = 1754, data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 639; y <= 649; y++) for (let x = 128; x <= 138; x++) { const k = (y * width + x) * 4; data[k] = 240; data[k + 1] = 10; data[k + 2] = 65; }
  const dot = OMR.detector({ width, height, data }, [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]);
  assert.equal(dot(133, 644), 0);
});
test('report rows preserve numeric scores, leading zero IDs and unresolved pages', () => {
  const rows = Reports.summaryRows([
    { record: { label: 'Bài 1', studentId: '00123456', keyCode: '000' }, result: { scores: [3, 4, 2], total: 9 }, status: 'Đã chấm' },
    { record: { label: 'Bài 2', studentId: '', keyCode: '' }, result: null, status: 'Cần chọn bốn góc' }
  ]);
  assert.equal(rows[1][2], '00123456'); assert.equal(rows[1][3], '000'); assert.equal(rows[1][7], 9);
  assert.equal(rows[2][7], ''); assert.equal(rows.length, 3);
});

test('local bubble thresholds read faint pencil and reject unmarked paper in shadows', () => {
  const points = [{x:0,y:0},{x:1229,y:0},{x:1229,y:1754},{x:0,y:1754}];
  for (const [paper, ink] of [[255,175],[160,95],[100,55]]) {
    const image = markedSheet();
    for (let k = 0; k < image.data.length; k += 4) {
      const shade = image.data[k] === 255 ? paper : ink;
      image.data[k] = image.data[k+1] = image.data[k+2] = shade;
    }
    const result = OMR.recognize(image, points);
    assert.equal(result.answers.p1[0], 'B', `Paper ${paper}, ink ${ink}`);
    assert.equal(result.answers.p1[1], '');
    assert.equal(result.flags.p1[1], 'Bỏ trống');
    assert.equal(result.metadata.studentId, '00123456');
  }
});

test('adaptive recognition still flags two filled choices rather than guessing', () => {
  const image = markedSheet();
  for (let y = 638; y <= 650; y++) for (let x = 127; x <= 139; x++) {
    const k = (y * image.width + x) * 4;
    image.data[k] = image.data[k+1] = image.data[k+2] = 175;
  }
  const result = OMR.recognize(image, [{x:0,y:0},{x:1229,y:0},{x:1229,y:1754},{x:0,y:1754}]);
  assert.equal(result.answers.p1[0], '');
  assert.equal(result.flags.p1[0], 'Không rõ hoặc tô nhiều');
});

test('registration detection tolerates low contrast scans and shadowed paper', () => {
  for (const [paper, ink] of [[255,170],[130,65]]) {
    const image = markedSheet();
    for (let k=0; k<image.data.length; k+=4) {
      const value = image.data[k] === 255 ? paper : ink;
      image.data[k]=image.data[k+1]=image.data[k+2]=value;
    }
    const alignment = OMR.autoAlign(image);
    assert.ok(alignment, `Contrast ${paper}/${ink}`);
    assert.equal(OMR.recognize(image, alignment.points).answers.p1[0], 'B');
  }
});

test('uneven lighting across the sheet does not turn blank bubbles into answers', () => {
  const image = markedSheet();
  for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) {
    const k=(y*image.width+x)*4, paper=105+145*x/image.width;
    const shade=image.data[k]===255 ? paper : paper*.45;
    image.data[k]=image.data[k+1]=image.data[k+2]=shade;
  }
  const alignment=OMR.autoAlign(image);assert.ok(alignment);
  const result=OMR.recognize(image,alignment.points);
  assert.equal(result.answers.p1[0],'B');
  assert.ok(result.answers.p1.slice(1).every(value=>value===''));
  assert.equal(result.metadata.studentId,'00123456');
});

test('incomplete fills and a small spill outside the rim are accepted without marking adjacent blanks',()=>{
 const png=require('./png-fixture'), image=png(path.join(__dirname,'../template/PHIEU_CHAM_TN.png'));
 const aligned=OMR.autoAlign(image);assert.ok(aligned);
 const map=OMR.project(aligned.points);
 const fill=(x,y)=>{for(let dy=-7;dy<=7;dy++)for(let dx=-9;dx<=2;dx++){
  if(dx*dx+dy*dy>81)continue;
  const p=map(x+dx,y+dy),k=(Math.round(p.y)*image.width+Math.round(p.x))*4;
  image.data[k]=image.data[k+1]=image.data[k+2]=45;
 }};
 fill(231,703);
 let result=OMR.recognize(image,aligned.points,aligned.profile);
 assert.equal(result.answers.p1[2],'C');assert.equal(result.flags.p1[2],'');
 assert.ok(result.answers.p1.every((v,i)=>i===2||!v));
 fill(182,703);
 result=OMR.recognize(image,aligned.points,aligned.profile);
 assert.equal(result.answers.p1[2],'');assert.equal(result.flags.p1[2],'Không rõ hoặc tô nhiều');
});
test('both actual blank sheet layouts align without reading printed outlines as answers',()=>{
 const png=require('./png-fixture');
 for(const [file,profile] of [['PHIEU_CHAM_TN.png','youngmix'],['PHIEU_TLTN_CHUAN.png','standard']]){
  const image=png(path.join(__dirname,'../template',file));const aligned=OMR.autoAlign(image);assert.ok(aligned,file);assert.equal(aligned.profile,profile);
  const result=OMR.recognize(image,aligned.points,profile);assert.ok(result.answers.p1.every(v=>!v));assert.ok(result.answers.p2.flat().every(v=>!v));assert.ok(result.answers.p3.every(v=>!v));
 }
});
test('pencil surrounding a white central gap is accepted while another marked choice is still rejected',()=>{
 const image=require('./png-fixture')(path.join(__dirname,'../template/PHIEU_CHAM_TN.png'));
 const aligned=OMR.autoAlign(image),map=OMR.project(aligned.points);
 const fill=x=>{for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){
  const radius=dx*dx+dy*dy;if(radius>49||radius<10)continue;
  const p=map(x+dx,703+dy),k=(Math.round(p.y)*image.width+Math.round(p.x))*4;
  image.data[k]=image.data[k+1]=image.data[k+2]=40;
 }};
 fill(231);
 assert.equal(OMR.recognize(image,aligned.points,aligned.profile).answers.p1[2],'C');
 fill(182);
 assert.equal(OMR.recognize(image,aligned.points,aligned.profile).answers.p1[2],'');
});
test('standard PDF layout reads every answer column and metadata after rotation',()=>{
 const png=require('./png-fixture'),image=png(path.join(__dirname,'../template/PHIEU_TLTN_CHUAN.png'));
 const box=(x,y)=>{for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const k=(Math.round(y+dy)*image.width+Math.round(x+dx))*4;image.data[k]=image.data[k+1]=image.data[k+2]=25;}};
 for(let q=0;q<40;q++)box([173,428.5,684,939.5][Math.floor(q/10)]+51.1*(q%4),670+26.4*(q%10));
 for(let q=0;q<8;q++)for(let j=0;j<4;j++)box([173,428.5,684,939.5][Math.floor(q/2)]+(q%2)*102.2+(j%2)*51.1,1051+26.4*j);
 for(let q=0;q<6;q++){const x=165+q*163.8;box(x,1340+27.15*q);box(x+34.4,1340+27.15*(q+1));box(x+34.4,1313);}
 '00123457'.split('').forEach((v,i)=>box(835+24*i,195+33.9*Number(v)));
 '0101'.split('').forEach((v,i)=>box(1062+24*i,195+33.9*Number(v)));
 let rotated=image;
 for(let rotation=0;rotation<4;rotation++){
  const aligned=OMR.autoAlign(rotated);assert.ok(aligned);assert.equal(aligned.profile,'standard');const result=OMR.recognize(rotated,aligned.points,aligned.profile);
  assert.deepEqual(result.answers.p1,Array.from({length:40},(_,q)=>'ABCD'[q%4]));assert.deepEqual(result.answers.p2,Array.from({length:8},()=>['Đ','S','Đ','S']));assert.deepEqual(result.answers.p3,['0,1','1,2','2,3','3,4','4,5','5,6']);assert.equal(result.metadata.studentId,'00123457');assert.equal(result.metadata.examCode,'0101');
  rotated=rotate90(rotated);
 }
});

test('camera alignment reads a tilted sheet on a cluttered desk at smaller scale',()=>{
 const sources=[markedSheet(),require('./png-fixture')(path.join(__dirname,'../template/PHIEU_TLTN_CHUAN.png'))];
 const standard=sources[1];
 for(const [x,y] of [[224,670],...'00123457'.split('').map((v,i)=>[835+24*i,195+33.9*Number(v)]),...'0101'.split('').map((v,i)=>[1062+24*i,195+33.9*Number(v)])])
  for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const k=(Math.round(y+dy)*standard.width+Math.round(x+dx))*4;standard.data[k]=standard.data[k+1]=standard.data[k+2]=25;}
 for(const [index,source]of sources.entries()){
  const width=1600,height=2300,data=new Uint8ClampedArray(width*height*4),angle=Math.PI/10,c=Math.cos(angle),s=Math.sin(angle),scale=.7;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const dx=x-width/2,dy=y-height/2,sx=Math.round((c*dx+s*dy)/scale+source.width/2),sy=Math.round((-s*dx+c*dy)/scale+source.height/2),k=(y*width+x)*4;
   if(sx>=0&&sy>=0&&sx<source.width&&sy<source.height){const from=(sy*source.width+sx)*4;data[k]=source.data[from];data[k+1]=source.data[from+1];data[k+2]=source.data[from+2];}
   else {data[k]=130;data[k+1]=115;data[k+2]=95;}
   if((x>35&&x<90&&y>35&&y<90)||(x>1490&&x<1560&&y>2150&&y<2220))data[k]=data[k+1]=data[k+2]=0;
   data[k+3]=255;
  }
  const image={width,height,data},aligned=OMR.autoAlign(image);assert.ok(aligned);assert.equal(aligned.profile,index?'standard':'youngmix');
  const result=OMR.recognize(image,aligned.points,aligned.profile);assert.equal(result.answers.p1[0],'B');assert.equal(result.metadata.studentId,index?'00123457':'00123456');assert.equal(result.metadata.examCode,'0101');
 }
});


test('soft contrast reads very faint broad pencil strokes while ignoring sensor noise', () => {
  const points = [{x:0,y:0},{x:1229,y:0},{x:1229,y:1754},{x:0,y:1754}];
  for (const ink of [220, 230]) {
    const image = markedSheet();
    for (let k=0;k<image.data.length;k+=4) {
      const v = image.data[k]===255 ? 250+(k%3) : ink;
      image.data[k]=image.data[k+1]=image.data[k+2]=v;
    }
    const result=OMR.recognize(image,points);
    assert.equal(result.answers.p1[0],'B', `Faint shade ${ink}`);
    assert.equal(result.answers.p1[1],''); assert.equal(result.flags.p1[1],'Bỏ trống');
    assert.equal(result.answers.p2[0][0],'Đ'); assert.equal(result.answers.p3[0],'2');
  }
});
test('blurred low-contrast strokes remain readable with a subpixel alignment shift', () => {
  const image=markedSheet(), x=182, y=644;
  // Defocus spreads graphite smoothly over neighbouring pixels.
  for(let dy=-12;dy<=12;dy++) for(let dx=-12;dx<=12;dx++) {
    const v=Math.round(255-42*Math.exp(-(dx*dx+dy*dy)/55));
    const k=((y+dy)*image.width+x+dx)*4;
    image.data[k]=image.data[k+1]=image.data[k+2]=v;
  }
  const dot=OMR.detector(image,[{x:.65,y:.4},{x:1229.65,y:.4},{x:1229.65,y:1754.4},{x:.65,y:1754.4}]);
  assert.equal(OMR.choose([133,182,231,280].map(px=>dot(px,644)),['A','B','C','D']).value,'B');
});
test('two very faint choices are flagged for review rather than accepted', () => {
  const image=markedSheet();
  for(const center of [133,182]) for(let y=638;y<=650;y++) for(let x=center-6;x<=center+6;x++) {
    const k=(y*image.width+x)*4; image.data[k]=image.data[k+1]=image.data[k+2]=230;
  }
  const result=OMR.recognize(image,[{x:0,y:0},{x:1229,y:0},{x:1229,y:1754},{x:0,y:1754}]);
  assert.equal(result.answers.p1[0],''); assert.equal(result.flags.p1[0],'Không rõ hoặc tô nhiều');
});


test('Excel cells and delimited QR keys accept alternative choices and O/X',()=>{
  assert.doesNotThrow(()=>Inputs.validateExam({code:'101',keys:{p1:['AB','ABC','O','X'],p2:[],p3:[]}}));
  const bank=Inputs.parseQrPayload(JSON.stringify({'101':'AB_ABC_O_X##'}));
  assert.deepEqual(bank[0].keys.p1,['AB','ABC','O','X']);
  assert.deepEqual(Inputs.parseQrPayload(JSON.stringify({'101':'ABCD##'}))[0].keys.p1,['A','B','C','D']);
  assert.throws(()=>Inputs.validateExam({code:'101',keys:{p1:['AA'],p2:[],p3:[]}}));
});

test('manual, Excel validation and QR all preserve O/X in true/false and numeric answer keys',()=>{
 const expected={p1:['AB','X'],p2:[['Đ','S','O','X']],p3:['O','X']};
 assert.deepEqual(require('../js/grading').parseKeys(['AB X','Đ S O X','O\nX']),expected);
 assert.doesNotThrow(()=>Inputs.validateExam({code:'101',keys:expected}));
 assert.deepEqual(Inputs.parseQrPayload(JSON.stringify({'101':'AB_X#ĐSOX#O_X'}))[0].keys,expected);
});


test('camera tracking validates current registration and auxiliary marks after small movement',()=>{
 const source=markedSheet(), previous=OMR.autoAlign(source);assert.ok(previous);
 const shifted={width:source.width,height:source.height,data:new Uint8ClampedArray(source.data.length).fill(255)};
 const dx=5,dy=7;
 for(let y=0;y<source.height-dy;y++){
  const start=y*source.width*4,end=start+(source.width-dx)*4;
  shifted.data.set(source.data.subarray(start,end),((y+dy)*source.width+dx)*4);
 }
 const current=OMR.autoAlign(shifted,previous);assert.ok(current?.tracked);
 assert.ok(current.auxMarkers.length>=8);
 assert.equal(OMR.recognize(shifted,current.points,current.profile).answers.p1[0],'B');
 const blank={...shifted,data:new Uint8ClampedArray(source.data.length).fill(255)};
 assert.equal(OMR.autoAlign(blank,current),null,'A previous alignment must not create markers on an empty frame');
});

test('actual SmartTest workbook imports column codes and all three sections', () => {
  const workbook = XLSX.read(fs.readFileSync(path.join(__dirname, '../template/BGD-2025-SmartTest.xlsx')), { type: 'buffer' });
  const exams = Inputs.workbookExams(workbook, XLSX);
  assert.deepEqual(exams.map(exam => exam.code), ['192', '296', '387', '497']);
  for (const exam of exams) assert.deepEqual(Object.values(exam.keys).map(values => values.length), [12, 5, 4]);
  assert.equal(exams[0].keys.p1.join(''), 'CDDBAADBAACD');
  assert.deepEqual(exams[0].keys.p2.map(row => row.join('')), ['ĐĐĐĐ', 'ĐĐSĐ', 'ĐSSĐ', 'SĐĐĐ', 'SĐSĐ']);
  assert.deepEqual(exams[0].keys.p3, ['54,6', '0,73', '0,6', '-1']);
  assert.deepEqual(exams[3].keys.p3, ['-1', '0,6', '54,6', '0,73']);
  assert.equal(Inputs.matchingCode(exams, '0192'), '192');
});
test('SmartTest rejects missing values, mixed sections and interrupted numbering', () => {
  const header = ['Câu\\Mã đề', '001', '002'];
  for (const rows of [ [[1, 'A', '']], [[1, 'A', '2']], [[2, 'A', 'B']], [[1, 'ĐĐSS', 'SĐĐS'], [2, 'A', 'B']] ]) {
    assert.throws(() => Inputs.parseRows([header, ...rows]));
  }
  const exams = Inputs.parseRows([header, [1, 'AB', 'O'], [2, 'ĐSOX', 'XXXX'], [3, 'O', 'X'], [4, '-1,5', 'X']]);
  assert.deepEqual(exams[0].keys, {p1:['AB'], p2:[['Đ','S','O','X'], ['O','O','O','O']], p3:['-1,5']});
});
