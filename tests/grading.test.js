const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/grading.js');
const OMR = require('../js/omr.js');

function config(counts = [2, 1, 1]) {
  return { parts: counts.map((count, i) => ({ count, points: [4, 4, 2][i], mode: 'total' })), rule2: 'linear', levels2: [10, 25, 50, 100] };
}
const answers = { p1: ['A', 'B', 'C'], p2: [['Đ', 'S', 'Đ', 'S']], p3: ['-1,20'] };
const keys = G.parseKeys(['A B C', 'Đ S Đ S', '-1.2']);

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
  const result = G.grade(answers, G.parseKeys(['A X', 'ĐSĐ', 'abc']), config());
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
