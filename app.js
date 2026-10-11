'use strict';
const $ = id => document.getElementById(id);
const G = window.ChamTNGrading, OMR = window.ChamTNOMR, Inputs = window.ChamTNInputs, Reports = window.ChamTNReports;
const canvas = $('photo'), ctx = canvas.getContext('2d');
const names = ['I', 'II', 'III'];
const storedIds = ['key1', 'key2', 'key3', 'n1', 'n2', 'n3', 'w1', 'w2', 'w3', 'mode1', 'mode2', 'mode3', 'rule2', 'level1', 'level2', 'level3', 'level4'];
let records = [], activeId = '', exams = [], preferredCode = '', nextId = 0, loadVersion = 0, importingVersion = 0;
let loading = false, exporting = false, annotatedView = false, cameraStream = null, cameraVersion = 0;
function stored(key) { try { return localStorage.getItem('chamtn:' + key); } catch (_) { return null; } }
function persist(key, value) { try { localStorage.setItem('chamtn:' + key, value); } catch (_) {} }
function save(id) { persist(id, $(id).value); }
for (const id of storedIds) { const value = stored(id); if (value !== null) $(id).value = value; }
try {
  const bank = JSON.parse(stored('exams') || '[]');
  if (Array.isArray(bank) && bank.every(exam => /^\d{1,4}$/.test(exam.code) && ['p1', 'p2', 'p3'].every(p => Array.isArray(exam.keys[p])))) exams = bank;
} catch (_) {}
preferredCode = Inputs.matchingCode(exams, stored('preferredCode') || '') || (exams.find(e => e.code === '000') || exams[0])?.code || '';
const previousModes = [1, 2, 3].map(i => $('mode' + i).value);
const format = (value, digits = 2) => value.toLocaleString('vi-VN', { maximumFractionDigits: digits });
const emptyKeys = () => ({ p1: [], p2: [], p3: [] });
const current = () => records.find(record => record.id === activeId);
function number(id) { return $(id).value.trim() === '' ? NaN : Number($(id).value); }
function config() {
  return { parts: [1, 2, 3].map(i => ({ count: number('n' + i), points: number('w' + i), mode: $('mode' + i).value })), rule2: $('rule2').value, levels2: [1, 2, 3, 4].map(i => number('level' + i)) };
}
function keys() { return G.parseKeys([$('key1').value, $('key2').value, $('key3').value]); }
function keysFor(record) { return exams.length ? exams.find(exam => exam.code === record.keyCode)?.keys || emptyKeys() : keys(); }
function count(i) { const value = number('n' + (i + 1)); return Number.isInteger(value) && value >= 0 && value <= G.limits[i] ? value : 0; }
function checkCount(record) {
  if (!record.answers) return 0;
  return record.flags.p1.slice(0, count(0)).filter(Boolean).length + record.flags.p2.slice(0, count(1)).flat().filter(Boolean).length + record.flags.p3.slice(0, count(2)).filter(Boolean).length;
}
function assess(record) {
  const recordKeys = keysFor(record);
  if (!record.answers) return { record, keys: recordKeys, result: null, status: 'Chưa chấm · cần chọn bốn góc phiếu' };
  if (exams.length && !record.keyCode) return { record, keys: recordKeys, result: null, status: record.codeIssue || 'Chọn mã đề đáp án để chấm' };
  const result = G.grade(record.answers, recordKeys, config());
  let status = result.configErrors.length ? 'Cấu hình chưa hợp lệ' : result.warnings.length ? `Điểm tạm tính · ${result.warnings.length} câu thiếu đáp án` : 'Đã chấm';
  const review = checkCount(record); if (review) status += ` · ${review} ô cần kiểm tra`;
  if (record.studentUncertain && !record.studentEdited) status += ' · kiểm tra SBD';
  return { record, keys: recordKeys, result, status };
}
function updateButtons() {
  const r = current(), errors = G.validateConfig(config());
  $('analyze').disabled = !r || r.points.length !== 4 || errors.length > 0 || !config().parts.some(p => p.count > 0) || loading;
  $('viewAnnotated').disabled = !r?.answers;
  $('export').disabled = !r?.answers || errors.length > 0;
  for (const id of ['exportExcel', 'exportSummaryPdf', 'exportAnnotatedPdf']) $(id).disabled = !records.length || !!errors.length || loading || exporting;
}
function updateConfiguration() {
  const cfg = config(), errors = G.validateConfig(cfg);
  $('configError').textContent = errors.join(' '); $('levels2').classList.toggle('hidden', cfg.rule2 !== 'levels');
  cfg.parts.forEach((part, i) => {
    const n = count(i); $('keyWrap' + (i + 1)).classList.toggle('hidden', n === 0);
    $('keyLabel' + (i + 1)).textContent = `Phần ${names[i]} · ${n} ${i === 2 ? 'đáp án số' : 'câu'}` + (i === 0 ? ' A/B/C/D' : i === 1 ? ', mỗi câu 4 ý Đ/S' : '');
    let hint = errors.length ? 'Kiểm tra cấu hình đã nhập.' : !n ? 'Phần này không tính điểm.' : `${format(G.questionPoints(part), 5)} điểm ${i === 1 ? 'tối đa ' : ''}/ câu · Tổng ${format(G.maximum(part), 5)} điểm.`;
    if (!errors.length && n && i === 1 && cfg.rule2 === 'linear') hint += ` Mỗi ý đúng: ${format(G.questionPoints(part) / 4, 5)} điểm.`;
    $('hint' + (i + 1)).textContent = hint;
  });
  $('examSummary').textContent = errors.length ? 'Cấu hình chưa hợp lệ' : `${cfg.parts.reduce((sum, p) => sum + p.count, 0)} câu · ${format(cfg.parts.reduce((sum, p) => sum + G.maximum(p), 0), 5)} điểm`;
  if (current()?.answers) renderAnswers(); refresh();
}
for (const id of storedIds) $(id).addEventListener('input', () => {
  if (id.startsWith('mode')) {
    const i = Number(id.slice(-1)) - 1, n = count(i), value = number('w' + (i + 1));
    if (n && Number.isFinite(value) && previousModes[i] !== $(id).value) { $('w' + (i + 1)).value = String(Number(($(id).value === 'question' ? value / n : value * n).toPrecision(12))); save('w' + (i + 1)); }
    previousModes[i] = $(id).value;
  }
  save(id);
  if (id.startsWith('key')) {
    const code = current()?.keyCode || preferredCode, exam = exams.find(e => e.code === code);
    if (exam) { exam.keys = keys(); persist('exams', JSON.stringify(exams)); }
    refresh();
  } else updateConfiguration();
});
function renderExamPicker() {
  $('examPicker').classList.toggle('hidden', !exams.length); $('examSelect').replaceChildren();
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Chọn mã đề'; $('examSelect').appendChild(placeholder);
  for (const exam of exams.slice().sort((a, b) => Number(a.code) - Number(b.code))) { const option = document.createElement('option'); option.value = exam.code; option.textContent = `Mã đề ${exam.code}`; $('examSelect').appendChild(option); }
}
function showKeys(code) {
  if (!exams.length) { $('examInfo').textContent = ''; return; }
  const exam = exams.find(e => e.code === code); $('examSelect').value = exam?.code || '';
  for (let i = 0; i < 3; i++) {
    const p = 'p' + (i + 1), values = exam?.keys[p] || [];
    $('key' + (i + 1)).value = i === 0 ? values.join(' ') : i === 1 ? values.map(row => row.join(' ')).join('\n') : values.join('\n');
    save('key' + (i + 1));
  }
  $('examInfo').textContent = exam ? `Mã đề ${exam.code}: ${exam.keys.p1.length} câu I · ${exam.keys.p2.length} câu II · ${exam.keys.p3.length} câu III. Có thể sửa đáp án bên dưới.` : 'Mã đề nhận dạng chưa có trong bộ đáp án. Chọn mã đề để chấm bài đang xem.';
}
function chooseKey(record) {
  if (!exams.length) { record.keyCode = ''; return; }
  if (record.examCode && !record.examUncertain) {
    record.keyCode = Inputs.matchingCode(exams, record.examCode);
    record.codeIssue = record.keyCode ? '' : `Mã đề ${record.examCode} chưa có trong bộ đáp án`;
  } else { record.keyCode = preferredCode; record.codeIssue = ''; }
}
$('examSelect').addEventListener('change', () => {
  const code = $('examSelect').value; if (!code) return;
  preferredCode = code; persist('preferredCode', code);
  const r = current(); if (r) { r.keyCode = code; r.codeIssue = ''; r.manualKey = true; }
  showKeys(code); refresh();
});
async function importKeys(file, type) {
  if (!file) return; const version = ++importingVersion;
  $('importStatus').classList.remove('error'); $('importStatus').textContent = `Đang đọc ${file.name}…`;
  try {
    const bank = type === 'excel' ? await Inputs.excelFromFile(file) : await Inputs.qrFromFile(file);
    if (version !== importingVersion) return;
    exams = bank; preferredCode = (bank.find(exam => exam.code === '000') || bank[0]).code;
    persist('exams', JSON.stringify(exams)); persist('preferredCode', preferredCode); renderExamPicker();
    records.forEach(record => { record.manualKey = false; chooseKey(record); });
    const active = current(), selected = bank.find(exam => exam.code === (active?.keyCode || preferredCode));
    if (selected) for (let i = 0; i < 3; i++) { $('n' + (i + 1)).value = selected.keys['p' + (i + 1)].length; save('n' + (i + 1)); }
    showKeys(active?.keyCode || preferredCode); updateConfiguration();
    $('importStatus').textContent = `Đã nhập ${bank.length} mã đề từ ${file.name}. Số câu đã cập nhật theo đáp án mẫu; thang điểm giữ theo cấu hình của bạn.`;
  } catch (error) { if (version === importingVersion) { $('importStatus').classList.add('error'); $('importStatus').textContent = error.message; } }
}
$('excelKey').onchange = event => { importKeys(event.target.files[0], 'excel'); event.target.value = ''; };
$('qrKey').onchange = event => { importKeys(event.target.files[0], 'qr'); event.target.value = ''; };
function renderPicker() {
  $('recordPicker').classList.toggle('hidden', !records.length); $('recordSelect').replaceChildren();
  for (const record of records) { const option = document.createElement('option'); option.value = record.id; option.textContent = record.label; $('recordSelect').appendChild(option); }
  $('recordSelect').value = activeId;
}
function selectRecord(id) {
  activeId = id; annotatedView = false; renderPicker();
  const r = current(); showKeys(r?.keyCode || (r?.codeIssue ? '' : preferredCode));
  $('studentId').value = r?.studentId || ''; $('detectedCode').textContent = r?.examCode || 'Chưa đọc được';
  $('scanError').textContent = r?.error || '';
  renderAnswers(); refresh(); draw();
}
$('recordSelect').onchange = () => selectRecord($('recordSelect').value);
function draw() {
  const r = current(); canvas.classList.toggle('annotated', annotatedView);
  $('viewAnnotated').textContent = annotatedView ? 'Xem ảnh gốc' : 'Xem bài đã đánh dấu';
  if (!r) { canvas.style.display = 'none'; $('empty').style.display = 'block'; $('alignmentStatus').textContent = ''; $('cornerStatus').textContent = '0/4 góc đã chọn'; updateButtons(); return; }
  const image = annotatedView && r.answers ? Reports.annotatedCanvas(assess(r), config()) : r.source;
  canvas.width = image.width; canvas.height = image.height; ctx.drawImage(image, 0, 0);
  canvas.style.display = 'block'; $('empty').style.display = 'none';
  if (!annotatedView) {
    ctx.lineWidth = Math.max(2, canvas.width / 350); ctx.strokeStyle = '#62e4a0';
    if (r.points.length > 1) { ctx.beginPath(); r.points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); if (r.points.length === 4) ctx.closePath(); ctx.stroke(); }
    r.points.forEach((point, i) => { ctx.fillStyle = '#147d64'; ctx.beginPath(); ctx.arc(point.x, point.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i + 1, point.x, point.y + 4); }); ctx.textAlign = 'left';
  }
  $('cornerStatus').textContent = `${r.points.length}/4 góc · ${r.answers ? 'đã đọc ô tô' : 'chưa đọc'}`;
  $('alignmentStatus').textContent = r.autoAligned ? 'Đã tự căn bằng mốc đen' : r.points.length === 4 ? 'Căn chỉnh thủ công' : 'Thiếu mốc: chọn bốn góc để chấm';
  updateButtons();
}
function recognizeRecord(record) {
  const sourceCtx = record.source.getContext('2d', { willReadFrequently: true });
  const result = OMR.recognize(sourceCtx.getImageData(0, 0, record.source.width, record.source.height), record.points);
  record.answers = result.answers; record.flags = result.flags; Object.assign(record, result.metadata); record.error = '';
  if (!record.manualKey) chooseKey(record);
}
async function addSource(source, label, activate = true) {
  const record = { id: String(++nextId), source, label, points: [], answers: null, flags: null, studentId: '', examCode: '', keyCode: preferredCode, autoAligned: false, error: '' };
  const pixels = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const aligned = OMR.autoAlign(pixels);
  if (aligned) {
    record.points = aligned.points; record.autoAligned = true;
    try { recognizeRecord(record); } catch (error) { record.error = error.message; }
  }
  records.push(record); if (activate || !activeId) selectRecord(record.id); else { renderPicker(); refresh(); }
  await new Promise(resolve => setTimeout(resolve, 0));
}
async function loadFiles(files) {
  if (!files.length) return; stopCamera();
  const version = ++loadVersion; loading = true; $('cancelLoad').classList.remove('hidden'); $('scanError').textContent = ''; updateButtons();
  const errors = []; let added = 0;
  for (const file of files) {
    if (version !== loadVersion) break;
    try {
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        for await (const page of Inputs.pdfPages(file)) {
          if (version !== loadVersion) break;
          $('uploadStatus').textContent = `Đang căn & chấm ${file.name} · trang ${page.page}/${page.total}`;
          await addSource(page.source, `${file.name} · trang ${page.page}`, added === 0); added++;
        }
      } else {
        $('uploadStatus').textContent = `Đang căn & chấm ${file.name}…`;
        const image = await Inputs.imageFromFile(file); if (version !== loadVersion) break;
        await addSource(Inputs.makeCanvas(image), file.name, added === 0); added++;
      }
    } catch (error) { errors.push(`${file.name}: ${error.message}`); }
  }
  if (version === loadVersion) {
    loading = false; $('cancelLoad').classList.add('hidden'); $('uploadStatus').textContent = `Đã thêm ${added} bài / trang${errors.length ? ` · ${errors.length} file lỗi` : ''}.`;
    $('scanError').textContent = errors.join(' '); refresh();
  }
}
$('file').onchange = event => { loadFiles([...event.target.files]); event.target.value = ''; };
$('cameraFile').onchange = event => { loadFiles([...event.target.files]); event.target.value = ''; };
$('cancelLoad').onclick = () => { loadVersion++; loading = false; $('cancelLoad').classList.add('hidden'); $('uploadStatus').textContent = 'Đã dừng tải. Các trang đã xử lý được giữ lại.'; refresh(); };
$('clearBatch').onclick = () => { loadVersion++; loading = false; records = []; activeId = ''; annotatedView = false; $('cancelLoad').classList.add('hidden'); $('uploadStatus').textContent = ''; $('results').classList.add('hidden'); renderPicker(); refresh(); draw(); };
canvas.onclick = event => {
  const r = current(); if (!r || annotatedView) return;
  if (r.points.length === 4) r.points = [];
  const bounds = canvas.getBoundingClientRect(); r.points.push({ x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height });
  r.autoAligned = false; r.answers = null; r.flags = null; r.error = ''; $('scanError').textContent = ''; refresh(); draw();
};
$('resetCorners').onclick = () => { const r = current(); if (!r) return; r.points = []; r.answers = null; r.flags = null; r.autoAligned = false; annotatedView = false; refresh(); draw(); };
$('analyze').onclick = () => {
  const r = current(); if (!r) return;
  try { recognizeRecord(r); selectRecord(r.id); }
  catch (error) { r.error = error.message; $('scanError').textContent = 'Không thể đọc phiếu: ' + error.message; }
};
$('viewAnnotated').onclick = () => { annotatedView = !annotatedView; draw(); };
function stopCamera() {
  cameraVersion++; cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null;
  $('cameraVideo').srcObject = null; $('cameraPanel').classList.add('hidden'); $('captureCamera').disabled = true;
}
$('openCamera').onclick = async () => {
  stopCamera(); const version = cameraVersion;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { $('scanError').textContent = 'Camera trực tiếp cần HTTPS hoặc localhost. Trên điện thoại, bạn vẫn có thể chọn “Chụp bằng điện thoại”.'; $('scanError').scrollIntoView({ behavior: 'smooth' }); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 2560 } } });
    if (version !== cameraVersion) { stream.getTracks().forEach(track => track.stop()); return; }
    cameraStream = stream; $('cameraPanel').classList.remove('hidden'); $('cameraVideo').srcObject = stream; await $('cameraVideo').play();
    $('captureCamera').disabled = !$('cameraVideo').videoWidth; $('scanError').textContent = ''; $('cameraPanel').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { if (version !== cameraVersion) return; $('scanError').textContent = error.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera. Cho phép camera trong trình duyệt hoặc dùng “Chụp bằng điện thoại”.' : 'Không mở được camera. Hãy dùng nút “Chụp bằng điện thoại” hoặc tải ảnh có sẵn.'; stopCamera(); }
};
$('cameraVideo').onloadedmetadata = () => { $('captureCamera').disabled = !$('cameraVideo').videoWidth; };
$('closeCamera').onclick = stopCamera;
$('captureCamera').onclick = async () => {
  try { const source = Inputs.makeCanvas($('cameraVideo')); stopCamera(); await addSource(source, `Camera · ${new Date().toLocaleTimeString('vi-VN')}`, true); $('uploadStatus').textContent = 'Đã chụp và xử lý ảnh camera.'; }
  catch (error) { $('scanError').textContent = error.message; }
};
window.addEventListener('pagehide', stopCamera); document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
function renderAnswers() {
  $('answers').replaceChildren(); const r = current(); if (!r?.answers) return;
  const titles = ['Chọn đáp án', 'Đúng / Sai', 'Trả lời số'];
  for (let part = 0; part < 3; part++) {
    const n = count(part), p = 'p' + (part + 1); if (!n) continue;
    const box = document.createElement('div'); box.className = 'answer-section';
    const heading = document.createElement('h3'); heading.textContent = `Phần ${names[part]} · ${titles[part]} (${n} câu)`; box.appendChild(heading);
    const grid = document.createElement('div'); grid.className = 'grid-answers ' + (part === 1 ? 'part2grid' : part === 2 ? 'part3grid' : '');
    for (let i = 0; i < n; i++) { if (part === 1) for (let j = 0; j < 4; j++) grid.appendChild(answerItem(r, p, i, r.answers[p][i][j], j)); else grid.appendChild(answerItem(r, p, i, r.answers[p][i])); }
    box.appendChild(grid); $('answers').appendChild(box);
  }
}
function answerItem(record, part, index, value, sub) {
  const item = document.createElement('label'); item.className = 'answer-item'; item.dataset.part = part; item.dataset.index = index; if (sub !== undefined) item.dataset.sub = sub;
  const flag = part === 'p2' ? record.flags[part][index][sub] : record.flags[part][index]; if (flag) { item.classList.add('review'); item.title = flag; }
  const label = document.createElement('span'); label.textContent = `${index + 1}${sub === undefined ? '' : '.' + 'abcd'[sub]}`; item.appendChild(label);
  const control = document.createElement(part === 'p3' ? 'input' : 'select'); control.setAttribute('aria-label', `Bài làm phần ${part.slice(1)}, câu ${label.textContent}`);
  if (part === 'p3') { control.placeholder = '—'; control.type = 'text'; }
  else for (const option of part === 'p1' ? ['', 'A', 'B', 'C', 'D'] : ['', 'Đ', 'S']) { const node = document.createElement('option'); node.value = option; node.textContent = option || '—'; control.appendChild(node); }
  control.value = value;
  control.addEventListener('input', () => { if (part === 'p2') { record.answers[part][index][sub] = control.value; record.flags[part][index][sub] = ''; } else { record.answers[part][index] = control.value; record.flags[part][index] = ''; } item.classList.remove('review'); item.removeAttribute('title'); refresh(); });
  item.appendChild(control); return item;
}
$('studentId').oninput = () => { const r = current(); if (r) { r.studentId = $('studentId').value; r.studentEdited = true; refresh(); } };
function refresh() {
  const r = current(); $('results').classList.toggle('hidden', !r?.answers); $('batchPanel').classList.toggle('hidden', !records.length);
  const items = records.map(assess), ready = items.filter(item => item.result?.scores).length;
  $('batchSummary').textContent = `${records.length} bài / trang · ${ready} bài đã tính điểm · ${records.length - ready} bài chưa tính được điểm.`;
  $('batchRows').replaceChildren();
  for (const item of items) {
    const row = document.createElement('tr'); if (item.record.id === activeId) row.className = 'selected';
    const cell = document.createElement('td'), button = document.createElement('button'); button.textContent = item.record.label; button.onclick = () => selectRecord(item.record.id); cell.appendChild(button); row.appendChild(cell);
    for (const value of [item.record.studentId || '—', item.record.keyCode || item.record.examCode || '—', ...(item.result?.scores?.map(v => format(v)) || ['—', '—', '—']), item.result?.scores ? format(item.result.total) : '—', item.status]) { const td = document.createElement('td'); td.textContent = value; row.appendChild(td); }
    row.lastChild.className = 'status-cell'; $('batchRows').appendChild(row);
  }
  if (r?.answers) {
    const item = items.find(item => item.record.id === r.id), result = item.result;
    $('resultTitle').textContent = `Kiểm tra · ${r.label}`; $('studentId').value = r.studentId || ''; $('detectedCode').textContent = r.examCode || 'Chưa đọc được';
    if (!result?.scores) { for (const id of ['total', 'score1', 'score2', 'score3']) $(id).textContent = '—'; $('warnings').textContent = result?.configErrors.join(' ') || item.status; }
    else {
      $('totalLabel').textContent = result.warnings.length ? 'ĐIỂM TẠM TÍNH' : 'TỔNG ĐIỂM'; $('total').textContent = format(result.total);
      result.scores.forEach((value, i) => { $('score' + (i + 1)).textContent = `${format(value)} / ${format(result.maxima[i])}`; });
      const messages = result.warnings.slice(0, 3); if (result.warnings.length > 3) messages.push(`Còn ${result.warnings.length - 3} câu thiếu đáp án hợp lệ.`);
      if (checkCount(r)) messages.push(`${checkCount(r)} ô cần kiểm tra kết quả nhận dạng.`);
      if (r.studentUncertain && !r.studentEdited) messages.push('SBD chưa đọc đủ 8 chữ số; có thể nhập lại ở trên.');
      if (r.examUncertain && exams.length) messages.push(`Đang dùng mã đề ${r.keyCode || 'chưa chọn'}; kiểm tra mã đề trên phiếu.`);
      $('warnings').textContent = messages.join(' ');
    }
    document.querySelectorAll('.answer-item').forEach(element => {
      const p = element.dataset.part, i = Number(element.dataset.index), j = Number(element.dataset.sub), key = p === 'p2' ? item.keys[p][i]?.[j] : item.keys[p][i], value = p === 'p2' ? r.answers[p][i][j] : r.answers[p][i];
      element.classList.remove('correct', 'wrong'); if (G.validKey(p, key)) element.classList.add(p === 'p3' ? (G.sameNumber(value, key) ? 'correct' : 'wrong') : value === key ? 'correct' : 'wrong');
    });
  }
  updateButtons(); if (annotatedView) draw();
}
function download(data, filename, type) {
  const url = URL.createObjectURL(new Blob([data], { type })), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportReport(type) {
  if (!records.length || G.validateConfig(config()).length) return;
  const cfg = config(), items = records.map(assess); exporting = true; updateButtons(); $('exportStatus').textContent = 'Đang tạo file…';
  try {
    if (type === 'excel') download(Reports.excel(items, cfg), 'ket-qua-diem-thi.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else if (type === 'summary') download(await Reports.summaryPdf(items, cfg), 'bang-diem-thi.pdf', 'application/pdf');
    else download(await Reports.annotatedPdf(items, cfg), 'bai-lam-da-cham.pdf', 'application/pdf');
    const unfinished = items.filter(item => !item.result?.scores).length;
    $('exportStatus').textContent = `Đã xuất ${items.length} bài / trang${unfinished ? `; ${unfinished} bài chưa chấm được ghi rõ trạng thái trong file` : ''}.`;
  } catch (error) { $('exportStatus').textContent = 'Không xuất được file: ' + error.message; }
  finally { exporting = false; updateButtons(); }
}
$('exportExcel').onclick = () => exportReport('excel'); $('exportSummaryPdf').onclick = () => exportReport('summary'); $('exportAnnotatedPdf').onclick = () => exportReport('annotated');
$('export').onclick = () => {
  const r = current(); if (!r?.answers) return;
  const rows = Reports.detailRows([assess(r)], config()), csv = '\ufeff' + rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
  download(csv, 'chi-tiet-bai-cham.csv', 'text/csv;charset=utf-8');
};
renderExamPicker(); if (exams.length) showKeys(preferredCode); updateConfiguration(); draw();
