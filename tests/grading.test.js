const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/grading.js');
const OMR = require('../js/omr.js');

function config(counts = [2, 1, 1]) {
  return { parts: counts.map((count, i) => ({ count, points: [4, 4, 2][i], mode: 'total' })), rule2: 'linear', levels2: [10, 25, 50, 100] };
}
const answers = { p1: ['A', 'B', 'C'], p2: [['Đ', 'S', 'Đ', 'S']], p3: ['-1,20'] };
const keys = G.parseKeys(['A B C', 'Đ S Đ S', '-1.2']);

test('numeric separator can occupy an empty column but unrelated gaps require review', () => {
  const marked = new Set(['126,1381', '186,1414', '156,1317']);
  const dot = (x,y) => marked.has(`${x},${y}`) ? 1 : 0;
  let result = OMR.read(dot);
  assert.equal(result.answers.p3[0], '1,2');
  assert.equal(result.flags.p3[0], '');
  marked.delete('156,1317');
  result = OMR.read(dot);
  assert.ok(result.flags.p3[0]);
});

test('selected counts define denominators and ignore later answers', () => {
  const result = G.grade(answers, keys, config());
  assert.deepEqual(result.scores, [4, 4, 2]);
  assert.equal(result.total, 10);
  const fewer = config([1, 0, 0]);
  assert.deepEqual(G.grade(answers, keys, fewer).scores, [4, 0, 0]);
  assert.deepEqual(G.grade(answers, keys, fewer).maxima, [4, 0, 0]);
});
test('per-question points scale with the selected count', () => {
  const cfg = config([3, 0, 0]); cfg.parts[0].mode = 'question'; cfg.parts[0].points = .25;
  const result = G.grade(answers, keys, cfg);
  assert.equal(result.total, .75); assert.equal(result.maxima[0], .75);
});
test('each true/false scoring rule handles 0–4 correct statements', () => {
  const cfg = config([0, 1, 0]); cfg.parts[1].mode = 'question'; cfg.parts[1].points = 1;
  const trueKey = { p1: [], p2: [['Đ', 'Đ', 'Đ', 'Đ']], p3: [] };
  for (const rule of ['linear', 'all', 'levels']) {
    cfg.rule2 = rule;
    for (let correct = 0; correct <= 4; correct++) {
      const a = { p1: [], p2: [Array.from({ length: 4 }, (_, i) => i < correct ? 'Đ' : 'S')], p3: [] };
      const expected = rule === 'linear' ? correct / 4 : rule === 'all' ? (correct === 4 ? 1 : 0) : [0, .1, .25, .5, 1][correct];
      assert.equal(G.grade(a, trueKey, cfg).scores[1], expected);
    }
  }
  cfg.rule2 = 'levels'; cfg.levels2 = [20, 40, 70, 100];
  assert.equal(G.grade({ p1: [], p2: [['Đ', 'Đ', 'S', 'S']], p3: [] }, trueKey, cfg).total, .4);
});
test('invalid counts, points and scoring levels cannot produce a score', () => {
  for (const bad of [41, -1, 1.5, NaN]) {
    const cfg = config(); cfg.parts[0].count = bad;
    assert.equal(G.grade(answers, keys, cfg).scores, null);
  }
  for (const bad of [-1, NaN, Infinity]) {
    const cfg = config(); cfg.parts[0].points = bad;
    assert.equal(G.grade(answers, keys, cfg).scores, null);
  }
  const cfg = config(); cfg.rule2 = 'levels'; cfg.levels2 = [50, 25, 70, 90];
  assert.equal(G.grade(answers, keys, cfg).scores, null);
});
test('disabled sections need no keys and zero questions do not divide by zero', () => {
  const empty = { p1: [], p2: [], p3: [] }, cfg = config([0, 0, 0]);
  const result = G.grade(empty, empty, cfg);
  assert.equal(result.total, 0); assert.deepEqual(result.warnings, []);
});
test('missing and invalid keys are reported only in active questions', () => {
  const result = G.grade(answers, G.parseKeys(['A Q', 'ĐSĐ', 'abc']), config());
  assert.equal(result.warnings.length, 3);
  assert.deepEqual(result.scores, [2, 0, 0]);
  assert.deepEqual(G.parseKeys(['A,B', 'D S D S', '1,25']).p2[0], ['Đ', 'S', 'Đ', 'S']);
  assert.equal(G.sameNumber('', '0'), false);
  assert.equal(G.sameNumber('1,20', '1.2'), true);
});
test('local OMR maps a perspective quadrilateral to all four corners', () => {
  const points = [{ x: 10, y: 20 }, { x: 700, y: 45 }, { x: 740, y: 960 }, { x: 5, y: 1000 }];
  const map = OMR.project(points);
  [[0, 0], [1229, 0], [1229, 1754], [0, 1754]].forEach(([x, y], i) => {
    const actual = map(x, y);
    assert.ok(Math.abs(actual.x - points[i].x) < 1e-6);
    assert.ok(Math.abs(actual.y - points[i].y) < 1e-6);
  });
  assert.throws(() => OMR.project([points[0], points[3], points[2], points[1]]));
});
test('local OMR reads synthetic marks in all three sections', () => {
  const marked = new Set(['182,644', '133,1060', '182,1090', '133,1120', '182,1150', '126,1283', '156,1317', '126,1381', '156,1414', '186,1447']);
  const result = OMR.read((x, y) => marked.has(`${x},${y}`) ? 1 : 0);
  assert.equal(result.answers.p1[0], 'B');
  assert.deepEqual(result.answers.p2[0], ['Đ', 'S', 'Đ', 'S']);
  assert.equal(result.answers.p3[0], '-1,23');
  assert.equal(result.flags.p3[0], '');
  assert.equal(result.flags.p1[1], 'Bỏ trống');
  assert.equal(OMR.choose([1, 1, 0, 0], ['A', 'B', 'C', 'D']).value, '');
  assert.equal(OMR.choose([1, .6, 0, 0], ['A', 'B', 'C', 'D']).value, '');
});
test('local OMR measures marks from pixel data without a network dependency', () => {
  const width = 1229, height = 1754, data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 639; y <= 649; y++) for (let x = 177; x <= 187; x++) {
    const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0;
  }
  const result = OMR.recognize({ data, width, height }, [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]);
  assert.equal(result.answers.p1[0], 'B');
  assert.equal(result.answers.p1[1], '');
});


test('multiple accepted choices, O and X use the same rule for every single selection', () => {
  for (const key of ['AB','ABC','O','X']) for(const choice of ['A','B','C','D','', 'AB']) {
    const expected=['A','B','C','D'].includes(choice) && (key==='O' || key!=='X' && key.includes(choice));
    assert.equal(G.isCorrect('p1',choice,key),expected,`${key} / ${choice}`);
    const result=G.grade({p1:[choice],p2:[],p3:[]},{p1:[key],p2:[],p3:[]},config([1,0,0]));
    assert.equal(result.total, expected?4:0); assert.deepEqual(result.warnings,[]);
  }
  for(const key of ['AA','AO','A B','AX','',null]) assert.equal(G.validKey('p1',key),false);
  assert.deepEqual(G.parseKeys(['AB ABC O X','','']).p1,['AB','ABC','O','X']);
});
test('editing a shared key recalculates all papers and detailed report correctness', () => {
  const Reports=require('../js/reports.js'), cfg=config([1,0,0]);
  const shared={p1:['A'],p2:[],p3:[]};
  const papers=['B','D'].map(value=>({label:'Test',answers:{p1:[value],p2:[],p3:[]},flags:{p1:[''],p2:[],p3:[]}}));
  assert.deepEqual(papers.map(r=>G.grade(r.answers,shared,cfg).total),[0,0]);
  shared.p1[0]='BD';
  const items=papers.map(record=>({record,keys:shared,result:G.grade(record.answers,shared,cfg)}));
  assert.deepEqual(items.map(item=>item.result.total),[4,4]);
  assert.deepEqual(Reports.detailRows(items,cfg).slice(1).map(row=>row[7]),['Đúng','Đúng']);
});

test('true/false O accepts a single Đ or S and X redistributes points among active statements',()=>{
 const cfg=config([0,1,0]), key={p1:[],p2:[['Đ','S','O','X']],p3:[]};
 for(const rule of ['linear','all','levels']) for(const any of ['Đ','S']) {
  cfg.rule2=rule;
  const result=G.grade({p1:[],p2:[['Đ','S',any,'']],p3:[]},key,cfg);
  assert.equal(result.total,4); assert.equal(result.maxima[1],4);assert.deepEqual(result.warnings,[]);
 }
 for(const any of ['','O','ĐS']) assert.equal(G.isCorrect('p2',any,'O'),false);
 cfg.rule2='linear';assert.equal(G.grade({p1:[],p2:[['Đ','Đ','S','Đ']],p3:[]},key,cfg).total,8/3);
 cfg.rule2='all';assert.equal(G.grade({p1:[],p2:[['Đ','Đ','S','Đ']],p3:[]},key,cfg).total,0);
 cfg.rule2='levels';assert.ok(Math.abs(G.grade({p1:[],p2:[['Đ','Đ','S','Đ']],p3:[]},key,cfg).total-5/3)<1e-10);
});
test('XXXX removes a whole true/false question from the maximum without awarding points',()=>{
 const cfg=config([0,2,0]);
 for(const rule of ['linear','all','levels']) {
  cfg.rule2=rule;
  const result=G.grade({p1:[],p2:[['Đ','S','Đ','S'],['Đ','S','Đ','S']],p3:[]},{p1:[],p2:[['X','X','X','X'],['Đ','S','Đ','S']],p3:[]},cfg);
  assert.equal(result.total,2);assert.equal(result.maxima[1],2);
 }
});
test('X skips whole multiple-choice and numeric questions, while numeric O accepts valid numbers only',()=>{
 const cfg=config([2,0,2]);
 const result=G.grade({p1:['A','B'],p2:[],p3:['-1,25','']},{p1:['X','AB'],p2:[],p3:['O','X']},cfg);
 assert.deepEqual(result.scores,[2,0,1]);assert.deepEqual(result.maxima,[2,0,1]);assert.deepEqual(result.warnings,[]);
 for(const value of ['0','-1.25',',5']) assert.equal(G.isCorrect('p3',value,'O'),true);
 for(const value of ['','abc','O','1,2,3']) assert.equal(G.isCorrect('p3',value,'O'),false);
 assert.equal(G.validKey('p1','E'),false);
 const Reports=require('../js/reports.js');
 const record={label:'Test',answers:{p1:[''],p2:[['','S','Đ','']],p3:['']},flags:{p1:['Bỏ trống'],p2:[['Bỏ trống','','','Bỏ trống']],p3:['Kiểm tra số']}};
 const rows=Reports.detailRows([{record,keys:{p1:['X'],p2:[['X','O','O','X']],p3:['X']}}],config([1,1,1]));
 assert.deepEqual(rows.slice(1).map(r=>r[7]),['Bỏ qua (X)','Bỏ qua (X)','Đúng','Đúng','Bỏ qua (X)','Bỏ qua (X)']);
 assert.ok(rows.slice(1).filter(r=>r[7]==='Bỏ qua (X)').every(r=>r[8]===''));
});
