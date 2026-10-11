(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChamTNGrading = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const limits = [40, 8, 6];
  const names = ['I', 'II', 'III'];

  function validateConfig(config) {
    const errors = [];
    config.parts.forEach((part, i) => {
      if (!Number.isInteger(part.count) || part.count < 0 || part.count > limits[i]) errors.push(`Số câu phần ${names[i]} phải là số nguyên từ 0 đến ${limits[i]}.`);
      if (!Number.isFinite(part.points) || part.points < 0) errors.push(`Điểm phần ${names[i]} phải là số không âm.`);
      if (!['total', 'question'].includes(part.mode)) errors.push(`Cách nhập điểm phần ${names[i]} không hợp lệ.`);
    });
    if (!['linear', 'all', 'levels'].includes(config.rule2)) errors.push('Cách chấm phần II không hợp lệ.');
    if (config.rule2 === 'levels' && config.parts[1].count > 0) {
      const levels = config.levels2;
      if (levels.length !== 4 || levels.some((v, i) => !Number.isFinite(v) || v < 0 || v > 100 || (i > 0 && v < levels[i - 1]))) errors.push('Tỷ lệ điểm phần II phải từ 0 đến 100% và tăng dần hoặc bằng nhau.');
      if (levels[3] !== 100) errors.push('Đúng đủ 4 ý phải đạt 100% điểm tối đa của câu.');
    }
    return errors;
  }
  function maximum(part) {
    if (!part.count) return 0;
    return part.mode === 'question' ? part.count * part.points : part.points;
  }
  function questionPoints(part) { return part.count ? maximum(part) / part.count : 0; }
  function tokens(text) { return text.toUpperCase().trim().split(/[\s,;]+/).filter(Boolean); }
  function parseKeys(texts) {
    const lines = text => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return {
      p1: tokens(texts[0]),
      p2: lines(texts[1]).map(line => line.toUpperCase().replace(/[\s,;]+/g, '').split('').map(v => v === 'D' ? 'Đ' : v)),
      p3: lines(texts[2])
    };
  }
  function numeric(value) {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }
  function sameNumber(a, b) {
    const left = numeric(a), right = numeric(b);
    return left !== null && right !== null && left === right;
  }
  function validKey(part, value) {
    if (part === 'p1') return typeof value === 'string' && (/^[OX]$/.test(value) || /^[ABCD]{1,4}$/.test(value) && new Set(value).size === value.length);
    if (part === 'p2') return ['Đ', 'S', 'O', 'X'].includes(value);
    return ['O','X'].includes(value) || numeric(value) !== null;
  }
  function acceptedChoices(key) {
    if (!validKey('p1', key) || key === 'X') return [];
    return key === 'O' ? ['A','B','C','D'] : key.split('');
  }
  function isCorrect(part, value, key) {
    if (!validKey(part,key)) return false;
    if (part === 'p1') return ['A','B','C','D'].includes(value) && acceptedChoices(key).includes(value);
    if (part === 'p2') return ['Đ','S'].includes(value) && (key === 'O' || key === value);
    return key === 'O' ? numeric(value) !== null : sameNumber(value,key);
  }
  function ignored(part, key) { return key === 'X'; }
  function trueFalseFraction(correct, active, config) {
    if (!active) return 0;
    if (config.rule2 === 'linear') return correct / active;
    if (config.rule2 === 'all') return correct === active ? 1 : 0;
    // Normalize the remaining statements to four, then interpolate levels.
    const level = 4 * correct / active, lower = Math.floor(level);
    const values = [0, ...config.levels2];
    return (values[lower] + (values[Math.min(4,lower+1)]-values[lower])*(level-lower)) / 100;
  }
  function grade(answers, keys, config) {
    const configErrors = validateConfig(config);
    if (configErrors.length) return { configErrors, warnings: [], scores: null };
    const scores = [0, 0, 0], warnings = [];
    const excluded = [0,0,0];
    const [first, second, third] = config.parts;
    for (let i = 0; i < first.count; i++) {
      if (!validKey('p1', keys.p1[i])) warnings.push(`Phần I câu ${i + 1}: cần đáp án A–D, tổ hợp như AB/ABC, O hoặc X hợp lệ.`);
      else if (ignored('p1', keys.p1[i])) excluded[0]++;
      else if (isCorrect('p1', answers.p1[i], keys.p1[i])) scores[0] += questionPoints(first);
    }
    for (let i = 0; i < second.count; i++) {
      const key = keys.p2[i];
      if (!key || key.length !== 4 || key.some(v => !validKey('p2', v))) {
        warnings.push(`Phần II câu ${i + 1}: cần đủ 4 đáp án Đ/S/O/X hợp lệ.`);
        continue;
      }
      const active = key.filter(v => v !== 'X').length;
      if (!active) excluded[1]++;
      const correct = key.reduce((sum, v, j) => sum + (isCorrect('p2',answers.p2[i]?.[j],v) ? 1 : 0), 0);
      const fraction = trueFalseFraction(correct, active, config);
      scores[1] += questionPoints(second) * fraction;
    }
    for (let i = 0; i < third.count; i++) {
      if (!validKey('p3', keys.p3[i])) warnings.push(`Phần III câu ${i + 1}: cần đáp án số, O hoặc X hợp lệ.`);
      else if (ignored('p3',keys.p3[i])) excluded[2]++;
      else if (isCorrect('p3',answers.p3[i], keys.p3[i])) scores[2] += questionPoints(third);
    }
    const maxima = config.parts.map((part,i) => Math.max(0, maximum(part) - excluded[i]*questionPoints(part)));
    return { configErrors, warnings, scores, maxima, total: scores.reduce((sum, v) => sum + v, 0) };
  }
  return { limits, validateConfig, maximum, questionPoints, parseKeys, numeric, sameNumber, validKey, acceptedChoices, isCorrect, ignored, trueFalseFraction, grade };
});
