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
  const workbook = XLSX.read(fs.readFileSync(path.join(__dirname, '../template/TLTN-BGD-2025-YoungMix.xlsx')), { type: 'buffer' });
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
  assert.throws(() => Inputs.parseQrPayload('{"101":"AX#ĐSĐS#1"}'));
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
