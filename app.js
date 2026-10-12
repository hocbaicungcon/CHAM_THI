'use strict';
const $ = id => document.getElementById(id);
const G = window.ChamTNGrading, OMR = window.ChamTNOMR, Inputs = window.ChamTNInputs, Reports = window.ChamTNReports;
const canvas = $('photo'), ctx = canvas.getContext('2d');
const names = ['I', 'II', 'III'];
const storedIds = ['key1', 'key2', 'key3', 'n1', 'n2', 'n3', 'w1', 'w2', 'w3', 'mode1', 'mode2', 'mode3', 'rule2', 'level1', 'level2', 'level3', 'level4', 'cameraPreviewSeconds'];
let records = [], activeId = '', exams = [], preferredCode = '', nextId = 0, loadVersion = 0, importingVersion = 0;
const cameraGate = new window.ChamTNScanner.ScanGate();
let cameraPreviewRecord = null, cameraAlignment = null;
let cameraTimer = null, cameraPaused = false, cameraBusy = false, cameraCount = 0;
let loading = false, exporting = false, annotatedView = false, cameraStream = null, cameraVersion = 0;
let restoringSession = true, localSave = Promise.resolve(), saveRevision = 0, clearFailed = false;
function saveSession() {
  if (restoringSession) return localSave;
  const revision = ++saveRevision;
  $('sessionStatus').textContent = 'Đang lưu trên thiết bị…';
  localSave = window.ChamTNSession.save(records, { activeId, nextId, cameraCount, annotatedView });
  localSave.then(() => {
    if (revision === saveRevision) $('sessionStatus').textContent = records.length ? `Đã lưu cục bộ ${records.length} bài · Tự khôi phục khi mở lại` : 'Lưu tự động trên thiết bị';
  }, () => {
    if (revision === saveRevision) $('sessionStatus').textContent = 'Không lưu được trên thiết bị. Hãy xuất kết quả trước khi đóng trang.';
  });
  return localSave;
}
function stored(key) { try { return localStorage.getItem('chamtn:' + key); } catch (_) { return null; } }
function persist(key, value) { try { localStorage.setItem('chamtn:' + key, value); } catch (_) {} }
function save(id) { persist(id, $(id).value); }
for (const id of storedIds) { let value = stored(id); if (id === 'key1' && value !== null) { value = value.replace(/\bE\b/g,'X'); persist(id,value); } if (value !== null) $(id).value = value; }
try {
  const bank = JSON.parse(stored('exams') || '[]');
  if (Array.isArray(bank) && bank.every(exam => /^\d{1,4}$/.test(exam.code) && ['p1', 'p2', 'p3'].every(p => Array.isArray(exam.keys[p])))) exams = bank; for (const exam of exams) exam.keys.p1 = exam.keys.p1.map(v => v === 'E' ? 'X' : v); persist('exams',JSON.stringify(exams));
} catch (_) {}
preferredCode = Inputs.matchingCode(exams, stored('preferredCode') || '') || (exams.find(e => e.code === '000') || exams[0])?.code || '';
const previousModes = [1, 2, 3].map(i => $('mode' + i).value);
const format = (value, digits = 2) => value.toLocaleString('vi-VN', { maximumFractionDigits: digits });
const emptyKeys = () => ({ p1: [], p2: [], p3: [] });
const current = () => records.find(record => record.id === activeId);
const paperViewer = window.ChamTNPaperViewer.create({
  dialog: $('paperViewer'),
  getIds: () => records.filter(record => record.answers).map(record => record.id),
  render: id => {
    selectRecord(id); annotatedView = true; draw(); saveSession();
    const item = assess(current());
    return { image: canvas, label: current().label, score: item.result?.scores ? `${format(item.result.total)} điểm` : 'Chưa tính điểm' };
  }
});
function number(id) { return $(id).value.trim() === '' ? NaN : Number($(id).value); }
function config() {
  return { parts: [1, 2, 3].map(i => ({ count: number('n' + i), points: number('w' + i), mode: $('mode' + i).value })), rule2: $('rule2').value, levels2: [1, 2, 3, 4].map(i => number('level' + i)) };
}
function keys() { return G.parseKeys([$('key1').value, $('key2').value, $('key3').value]); }
function keysFor(record) { return exams.length ? exams.find(exam => exam.code === record.keyCode)?.keys || emptyKeys() : keys(); }
function count(i) { const value = number('n' + (i + 1)); return Number.isInteger(value) && value >= 0 && value <= G.limits[i] ? value : 0; }
function checkCount(record) {
  if (!record.answers) return 0;
  return record.flags.p1.slice(0, count(0)).filter((flag,i) => flag && !G.ignored('p1',keysFor(record).p1[i])).length + record.flags.p2.slice(0, count(1)).reduce((sum,row,i) => sum + row.filter((flag,j) => flag && !G.ignored('p2',keysFor(record).p2[i]?.[j])).length, 0) + record.flags.p3.slice(0, count(2)).filter((flag,i) => flag && !G.ignored('p3',keysFor(record).p3[i])).length;
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
  $('resetCorners').disabled = !r || loading; $('clearBatch').disabled = !records.length && !clearFailed || exporting;
  $('newBatch').disabled = !records.length && !clearFailed || exporting;
  $('export').disabled = !r?.answers || errors.length > 0;
  for (const id of ['exportExcel', 'exportSummaryPdf', 'exportAnnotatedPdf']) $(id).disabled = !records.length || !!errors.length || loading || exporting;
}
function updateConfiguration() {
  const cfg = config(), errors = G.validateConfig(cfg);
  $('configError').textContent = errors.join(' '); $('levels2').classList.toggle('hidden', cfg.rule2 !== 'levels');
  cfg.parts.forEach((part, i) => {
    const n = count(i); $('keyWrap' + (i + 1)).classList.toggle('hidden', n === 0);
    $('keyLabel' + (i + 1)).textContent = `Phần ${names[i]} · ${n} ${i === 2 ? 'đáp án số' : 'câu'}` + (i === 0 ? ' A–D / AB / ABC / O / X' : i === 1 ? ', mỗi câu 4 ý Đ/S/O/X' : '');
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
    const code = $('examSelect').value || preferredCode, draftCode = Inputs.matchingCode(exams,$('manualCode').value.trim()) || $('manualCode').value.trim().padStart(3,'0'), exam = exams.find(e => e.code === code);
    if (exam && (! $('manualCode').value.trim() || draftCode === code)) { exam.keys = keys(); persist('exams', JSON.stringify(exams)); }
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
  const exam = exams.find(e => e.code === code); $('examSelect').value = exam?.code || ''; $('manualCode').value = exam?.code || '';
  $('manualKeyStatus').textContent='Sửa đáp án mã đề đang chọn sẽ tự cập nhật toàn bộ bài cùng mã đề. Đổi mã rồi bấm lưu để thêm mã đề mới.';
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
$('saveManualKey').onclick = () => {
  const raw = $('manualCode').value.trim();
  if(!/^\d{1,4}$/.test(raw)){ $('manualKeyStatus').textContent='Mã đề cần từ 1 đến 4 chữ số.'; return; }
  const code=Inputs.matchingCode(exams,raw) || raw.padStart(3,'0'), bankKeys=keys();
  try { Inputs.validateExam({code,keys:bankKeys}); }
  catch(error){$('manualKeyStatus').textContent=error.message;return;}
  const existing=exams.find(e=>e.code===code), firstBank=!exams.length;
  if(existing)existing.keys=bankKeys;else exams.push({code,keys:bankKeys});
  preferredCode=code;persist('exams',JSON.stringify(exams));persist('preferredCode',code);
  renderExamPicker();
  records.forEach(record=>{ if(firstBank || !record.manualKey)chooseKey(record); });
  for(let i=0;i<3;i++){ $('n'+(i+1)).value=bankKeys['p'+(i+1)].length;save('n'+(i+1)); }
  showKeys(code);updateConfiguration();
  $('manualKeyStatus').textContent=`Đã lưu mã đề ${code}. Đã cập nhật điểm các bài dùng mã đề này.`;
};
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
  window.ChamTNIcons.label($('viewAnnotated'), annotatedView ? 'Xem ảnh gốc' : 'Xem bài đã chấm', 'eye');
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
  $('alignmentStatus').textContent = r.autoAligned ? 'Đã tự căn bằng mốc đen · ' + (r.profile === 'standard' ? 'Phiếu chuẩn PDF' : 'Phiếu YoungMix') : r.points.length === 4 ? 'Căn chỉnh thủ công' : 'Thiếu mốc: chọn bốn góc để chấm';
  updateButtons();
}
let scanAudio = null;
$('scanSound').checked = stored('scanSound') !== 'off';
$('scanSound').onchange = () => persist('scanSound', $('scanSound').checked ? 'on' : 'off');
function unlockScanAudio() {
  if (!$('scanSound').checked) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    scanAudio ||= new Audio();
    if (scanAudio.state === 'suspended') scanAudio.resume().catch(() => {});
  } catch (_) { /* Camera and grading remain available without audio. */ }
}
document.addEventListener('pointerdown', unlockScanAudio, {passive:true});
document.addEventListener('keydown', unlockScanAudio);
function soundGraded() {
  if (!$('scanSound').checked || scanAudio?.state !== 'running') return;
  try {
    const start = scanAudio.currentTime;
    for (const [offset, frequency] of [[0,880],[.13,1174.66]]) {
      const tone = scanAudio.createOscillator(), gain = scanAudio.createGain();
      tone.type = 'sine'; tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0,start+offset);
      gain.gain.linearRampToValueAtTime(.12,start+offset+.012);
      gain.gain.exponentialRampToValueAtTime(.001,start+offset+.12);
      tone.connect(gain); gain.connect(scanAudio.destination);
      tone.start(start+offset); tone.stop(start+offset+.14);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    }
  } catch (_) {}
}
function recognizeRecord(record) {
  const sourceCtx = record.source.getContext('2d', { willReadFrequently: true });
  const result = OMR.recognize(sourceCtx.getImageData(0, 0, record.source.width, record.source.height), record.points, record.profile);
  record.answers = result.answers; record.flags = result.flags; Object.assign(record, result.metadata); record.error = '';
  if (!record.manualKey) chooseKey(record);
}
async function addSource(source, label, activate = true, alignment = null) {
  const record = { id: String(++nextId), source, label, points: [], answers: null, flags: null, studentId: '', examCode: '', keyCode: preferredCode, autoAligned: false, error: '' };
  const aligned = alignment || OMR.autoAlign(source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height));
  if (aligned) {
    record.points = aligned.points; record.profile = aligned.profile; record.autoAligned = true;
    try {
      if (aligned.result) {
        record.answers = aligned.result.answers; record.flags = aligned.result.flags;
        Object.assign(record, aligned.result.metadata); chooseKey(record);
      } else recognizeRecord(record);
    } catch (error) { record.error = error.message; }
  }
  records.push(record); if (assess(record).result?.scores && !record.error && !G.validateConfig(config()).length) soundGraded();
  if (activate || !activeId) selectRecord(record.id); else { renderPicker(); refresh(); }
  // Camera preview can appear while the serialized local save finishes.
  if (!alignment) await localSave.catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 0));
  return record;
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
async function clearGradedData() {
  clearFailed = false;
  paperViewer.close();
  stopCamera(); loadVersion++; loading = false;
  records = []; activeId = ''; nextId = 0; annotatedView = false;
  cameraCount = 0; cameraPreviewRecord = null;
  $('cameraCount').textContent = '0 bài đã lưu'; $('cameraLast').textContent = '';
  $('cameraPreview').classList.add('hidden');
  $('studentId').value = ''; $('detectedCode').textContent = 'Chưa đọc được';
  $('cancelLoad').classList.add('hidden'); $('uploadStatus').textContent = '';
  $('scanError').textContent = ''; $('exportStatus').textContent = '';
  renderPicker(); refresh(); draw();
  try {
    await localSave;
    if (!records.length) $('sessionStatus').textContent = 'Đã xóa bài chấm và bản lưu tạm · Sẵn sàng chấm đợt mới';
  } catch (_) { clearFailed = true; updateButtons(); $('sessionStatus').textContent = 'Chưa xóa được bản lưu tạm trên thiết bị. Hãy thử lại trước khi tải lại trang.'; }
}
$('clearBatch').onclick = clearGradedData;
$('newBatch').onclick = clearGradedData;
canvas.onclick = event => {
  const r = current(); if (!r) return;
  if (annotatedView && r.answers) { paperViewer.open(r.id); return; }
  if (r.points.length === 4) r.points = [];
  const bounds = canvas.getBoundingClientRect(); r.points.push({ x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height });
  r.autoAligned = false; r.answers = null; r.flags = null; r.error = ''; $('scanError').textContent = ''; refresh(); draw();
};
$('resetCorners').onclick = () => { const r = current(); if (!r) return; r.points = []; r.answers = null; r.flags = null; r.autoAligned = false; annotatedView = false; refresh(); draw(); };
$('analyze').onclick = () => {
  const r = current(); if (!r) return;
  try { recognizeRecord(r); selectRecord(r.id); if (assess(r).result?.scores) soundGraded(); }
  catch (error) { r.error = error.message; $('scanError').textContent = 'Không thể đọc phiếu: ' + error.message; }
};
$('viewAnnotated').onclick = () => { annotatedView = !annotatedView; draw(); saveSession(); };
function stopCamera() {
  const wasOpen = !$('cameraPanel').classList.contains('hidden');
  cameraVersion++; clearTimeout(cameraTimer); cameraTimer = null;
  cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null;
  $('cameraVideo').srcObject = null; $('cameraPanel').classList.add('hidden'); $('captureCamera').disabled = true;
  $('cameraPanel').classList.remove('showing-preview'); document.body.classList.remove('camera-open'); drawCameraOverlay(null); cameraGate.reset(); cameraBusy = false; cameraAlignment = null;
  if (document.activeElement && $('cameraPanel').contains(document.activeElement)) $('openCamera').focus();
  if (wasOpen && current()?.answers) { annotatedView = true; draw(); saveSession(); }
}
function cameraSource() {
  const video = $('cameraVideo'), stage = $('cameraOverlay').parentElement;
  const ratio = stage.clientWidth / stage.clientHeight;
  const width = Math.min(video.videoWidth, video.videoHeight * ratio);
  const height = width / ratio, scale = Math.min(1, 2560 / Math.max(width, height));
  const source = document.createElement('canvas'); source.width = Math.round(width * scale); source.height = Math.round(height * scale);
  source.getContext('2d').drawImage(video, (video.videoWidth-width)/2, (video.videoHeight-height)/2, width, height, 0, 0, source.width, source.height);
  return source;
}
function cameraFrame(source) {
  const pixels = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const aligned = OMR.autoAlign(pixels, cameraAlignment?.width===source.width && cameraAlignment?.height===source.height ? cameraAlignment : null); if (!aligned) return null;
  cameraAlignment = {...aligned,width:source.width,height:source.height};
  const result = OMR.recognize(pixels, aligned.points, aligned.profile), cfg = config();
  const answers = [result.answers.p1.slice(0, count(0)), result.answers.p2.slice(0, count(1)), result.answers.p3.slice(0, count(2))];
  const cameraKeys = exams.length ? (exams.find(exam => exam.code === (Inputs.matchingCode(exams, result.metadata.examCode) || preferredCode))?.keys || emptyKeys()) : keys();
  const flags = [result.flags.p1.slice(0, count(0)).filter((_,i) => !G.ignored('p1',cameraKeys.p1[i])), result.flags.p2.slice(0, count(1)).flatMap((row,i) => row.filter((_,j) => !G.ignored('p2',cameraKeys.p2[i]?.[j]))), result.flags.p3.slice(0, count(2)).filter((_,i) => !G.ignored('p3',cameraKeys.p3[i]))].flat();
  const filled = answers.flat(2).filter(Boolean).length;
  const ambiguous = flags.filter(flag => /không rõ|Không rõ|Dấu tô mờ/.test(flag)).length;
  const nearEnough = Math.min(...aligned.markers.map((m,i) => Math.hypot(m.x-aligned.markers[(i+1)%4].x,m.y-aligned.markers[(i+1)%4].y))) >= 420;
  const usable = nearEnough && !G.validateConfig(cfg).length && cfg.parts.some(p => p.count > 0) &&
    (filled > 0 || !result.metadata.studentUncertain) && ambiguous <= Math.max(2, flags.length * .15);
  const identity = !result.metadata.studentUncertain && !result.metadata.examUncertain ? result.metadata.studentId + ':' + result.metadata.examCode : '';
  return { points: aligned.points, markers: aligned.markers, auxMarkers: aligned.auxMarkers, nearEnough, profile: aligned.profile, width: source.width, height: source.height, identity, result,
    signature: JSON.stringify([identity, answers]), usable };
}
async function saveCameraSource(source, frame, version) {
  cameraBusy = true; $('captureCamera').disabled = true;
  try {
    const record = await addSource(source, `Camera · ${new Date().toLocaleTimeString('vi-VN')} · ${++cameraCount}`, true, frame);
    if (version !== cameraVersion) return;
    if (frame) cameraGate.accept(frame, performance.now());
    const item = assess(record);
    $('cameraCount').textContent = `${cameraCount} bài đã lưu`;
    $('cameraLast').textContent = `${record.studentId ? 'SBD ' + record.studentId : 'Bài ' + cameraCount} · ${item.result?.scores ? format(item.result.total) + ' điểm' : 'Chưa tính điểm'} · ${item.status}`;
    cameraPreviewRecord = record;
    const preview = Reports.annotatedCanvas(item, config()), target = $('cameraPreviewCanvas');
    target.width = preview.width; target.height = preview.height; target.getContext('2d').drawImage(preview, 0, 0);
    $('cameraPreview').classList.remove('hidden'); $('cameraPreview').classList.add('expanded');
    $('cameraPreviewToggle').setAttribute('aria-expanded', 'true'); $('cameraPanel').classList.add('showing-preview');
    $('cameraStatus').textContent = 'Đã lưu bài. Thay phiếu tiếp theo.';
    $('cameraProgress').style.width = '0%';
    $('cameraFlash').classList.remove('flash'); void $('cameraFlash').offsetWidth; $('cameraFlash').classList.add('flash');
    navigator.vibrate?.(70);
    $('uploadStatus').textContent = `Đã thêm ${cameraCount} bài từ camera.`;
    const seconds = Math.min(5, Math.max(.1, number('cameraPreviewSeconds') || 1.5));
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    if (version === cameraVersion) {
      $('cameraPreview').classList.remove('expanded'); $('cameraPanel').classList.remove('showing-preview');
      $('cameraPreviewToggle').setAttribute('aria-expanded', 'false');
    }
  } catch (error) { if (version === cameraVersion) $('cameraStatus').textContent = 'Không lưu được ảnh: ' + error.message; }
  finally { if (version === cameraVersion) { cameraBusy = false; $('captureCamera').disabled = false; } }
}
function drawCameraOverlay(frame) {
  const overlay = $('cameraOverlay'), stage = overlay.parentElement;
  overlay.width = Math.round(stage.clientWidth * Math.min(2, devicePixelRatio || 1));
  overlay.height = Math.round(stage.clientHeight * Math.min(2, devicePixelRatio || 1));
  const context = overlay.getContext('2d');
  $('cameraPanel').classList.toggle('has-sheet', !!frame);
  if (!frame) return;
  const scale = Math.max(overlay.width / frame.width, overlay.height / frame.height);
  const left = (overlay.width - frame.width * scale) / 2, top = (overlay.height - frame.height * scale) / 2;
  const point = p => ({x:left+p.x*scale,y:top+p.y*scale});
  context.strokeStyle = frame.usable ? '#83f5a5' : '#ffcd6e'; context.fillStyle = '#83f5a533'; context.lineWidth = Math.max(2, overlay.width / 180);
  context.beginPath(); frame.points.forEach((p,i) => { const q = point(p); if (!i) context.moveTo(q.x,q.y); else context.lineTo(q.x,q.y); }); context.closePath(); context.stroke();
  for (const [i, marker] of [...frame.markers,...(frame.auxMarkers || [])].entries()) {
    const primary = i<4, p = point(marker), size = Math.max(primary?16:8, marker.size * scale * (primary?1.6:1.1));
    context.save();
    if (marker.inferred) { context.strokeStyle='#ffcd6e'; context.setLineDash([6,4]); }
    if(primary && !marker.inferred) context.fillRect(p.x-size/2,p.y-size/2,size,size); context.strokeRect(p.x-size/2,p.y-size/2,size,size);
    context.fillStyle = '#fff'; context.beginPath(); context.arc(p.x,p.y,Math.max(2,overlay.width/200),0,Math.PI*2); context.fill();
    context.font = `bold ${Math.max(12,overlay.width/35)}px system-ui`; if(primary) context.fillText(String(i+1),p.x+size/2+3,p.y);
    context.restore(); context.fillStyle = '#83f5a533';
  }
}
async function scanCamera(version) {
  if (version !== cameraVersion || !cameraStream) return;
  try {
    if (!cameraPaused && !cameraBusy && $('cameraVideo').readyState >= 2) {
      const source = cameraSource(), frame = cameraFrame(source);
      drawCameraOverlay(frame);
      // A detected but unreadable sheet must not release the duplicate lock.
      const state = frame && !frame.usable ? cameraGate.hold(performance.now()) : cameraGate.observe(frame, performance.now());
      $('cameraProgress').style.width = `${Math.round((state.progress || 0) * 100)}%`;
      if (state.ready) await saveCameraSource(source, frame, version);
      else $('cameraStatus').textContent = state.reason === 'missing' ? 'Đưa đủ bốn mốc đen vào khung.' : state.reason === 'duplicate' ? 'Bài này đã lưu. Thay phiếu tiếp theo.' : state.reason === 'quality' ? !frame?.nearEnough ? 'Đưa máy gần phiếu hơn để đọc rõ các ô.' : 'Làm rõ nét tô và kiểm tra cấu hình, hoặc chụp thủ công.' : 'Giữ phiếu trong khung, rung nhẹ vẫn quét được…';
    }
  } catch (error) { if (version === cameraVersion) $('cameraStatus').textContent = 'Không đọc được khung hình. Giữ máy ổn định hoặc chụp thủ công.'; }
  finally { if (version === cameraVersion && cameraStream) cameraTimer = setTimeout(() => scanCamera(version), 30); }
}
$('openCamera').onclick = async () => {
  stopCamera(); const version = cameraVersion;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { $('scanError').textContent = 'Camera trực tiếp cần HTTPS hoặc localhost. Trên điện thoại, bạn vẫn có thể chọn “Chụp bằng điện thoại”.'; $('scanError').scrollIntoView({ behavior: 'smooth' }); return; }
  cameraPaused = false; cameraCount = 0; window.ChamTNIcons.label($('pauseCamera'), 'Tạm dừng', 'pause');
  $('cameraCount').textContent = '0 bài đã lưu'; $('cameraStatus').textContent = 'Đang mở camera…';
  $('cameraPreview').classList.add('hidden'); $('cameraPreview').classList.remove('expanded');
  $('cameraLast').textContent = 'Lấy đủ bốn mốc đen và giữ phiếu ổn định.';
  $('cameraProgress').style.width = '0%'; $('cameraPanel').classList.remove('hidden'); document.body.classList.add('camera-open'); $('closeCamera').focus();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } } });
    if (version !== cameraVersion) { stream.getTracks().forEach(track => track.stop()); return; }
    const track = stream.getVideoTracks()[0], capabilities = track.getCapabilities?.() || {};
    if (capabilities.focusMode?.includes('continuous')) { try { await track.applyConstraints({advanced:[{focusMode:'continuous'}]}); } catch (_) {} }
    cameraStream = stream; $('cameraVideo').srcObject = stream; await $('cameraVideo').play();
    if (version !== cameraVersion) return;
    $('captureCamera').disabled = !$('cameraVideo').videoWidth; $('scanError').textContent = '';
    scanCamera(version);
  } catch (error) { if (version !== cameraVersion) return; stopCamera(); $('scanError').textContent = error.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera. Cho phép camera trong trình duyệt hoặc dùng “Chụp bằng điện thoại”.' : 'Không mở được camera. Hãy dùng nút “Chụp bằng điện thoại” hoặc tải ảnh có sẵn.'; $('scanError').scrollIntoView({ behavior: 'smooth' }); }
};
$('cameraPreviewSeconds').onchange = () => { $('cameraPreviewSeconds').value = Math.min(5, Math.max(.1, number('cameraPreviewSeconds') || 1.5)); save('cameraPreviewSeconds'); };
$('scanCameraButton').onclick = () => $('openCamera').click();
$('cameraVideo').onloadedmetadata = () => { $('captureCamera').disabled = !$('cameraVideo').videoWidth || cameraBusy; };
$('closeCamera').onclick = stopCamera;
$('cameraPreviewToggle').onclick = () => {
  const expanded = $('cameraPreview').classList.toggle('expanded');
  $('cameraPanel').classList.toggle('showing-preview', expanded);
  if (expanded && !cameraPaused) $('pauseCamera').click();
  $('cameraPreviewToggle').setAttribute('aria-expanded', String(expanded));
};
$('pauseCamera').onclick = () => {
  cameraPaused = !cameraPaused; cameraGate.forgetCandidate();
  window.ChamTNIcons.label($('pauseCamera'), cameraPaused ? 'Tiếp tục' : 'Tạm dừng', cameraPaused ? 'play' : 'pause');
  $('cameraStatus').textContent = cameraPaused ? 'Đã tạm dừng tự quét. Có thể chụp thủ công.' : 'Đưa phiếu vào khung để tiếp tục.';
  $('cameraProgress').style.width = '0%';
};
$('captureCamera').onclick = async () => {
  if (!cameraStream || cameraBusy || !$('cameraVideo').videoWidth) return;
  const version = cameraVersion;
  try { const source = cameraSource(); await saveCameraSource(source, cameraFrame(source), version); }
  catch (error) { if (version === cameraVersion) $('cameraStatus').textContent = error.message; }
};
document.addEventListener('keydown', event => {
  if (!$('cameraPanel').classList.contains('hidden')) {
    if (event.key === 'Escape') { event.preventDefault(); stopCamera(); }
    if (event.key === 'Tab') {
      const controls = [$('closeCamera'), $('pauseCamera'), $('captureCamera'), ...(!$('cameraPreview').classList.contains('hidden') ? [$('cameraPreviewToggle')] : [])].filter(el => !el.disabled);
      const index = controls.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && index === controls.length - 1) { event.preventDefault(); controls[0].focus(); }
    }
  }
});
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
  saveSession();
  const r = current(); $('results').classList.toggle('hidden', !r?.answers); $('batchPanel').classList.toggle('hidden', !records.length);
  const items = records.map(assess), ready = items.filter(item => item.result?.scores).length;
  $('batchSummary').textContent = `${records.length} bài / trang · ${ready} bài đã tính điểm · ${records.length - ready} bài chưa tính được điểm.`;
  $('batchRows').replaceChildren();
  $('batchThumbnails').replaceChildren();
  for (const item of items) {
    if (item.record.answers) {
      const thumb = document.createElement('button'); thumb.type = 'button'; thumb.className = 'paper-thumb';
      thumb.setAttribute('aria-label', `Xem toàn màn hình ${item.record.label}`);
      const picture = document.createElement('canvas'); picture.width = 70; picture.height = 99;
      picture.getContext('2d').drawImage(item.record.source,0,0,70,99);
      const caption = document.createElement('span'); caption.textContent = `Bài ${records.indexOf(item.record)+1}${item.result?.scores ? ' · '+format(item.result.total)+' điểm' : ''}`;
      thumb.append(picture,caption); thumb.onclick = () => paperViewer.open(item.record.id); $('batchThumbnails').appendChild(thumb);
    }
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
      element.classList.remove('correct', 'wrong', 'ignored', 'review');
      const skipped = G.ignored(p,key), flag = p === 'p2' ? r.flags[p][i]?.[j] : r.flags[p][i];
      if (skipped) { element.classList.add('ignored'); element.title='X: bỏ qua, không tính điểm'; }
      else {
        if (flag) { element.classList.add('review'); element.title=flag; } else element.removeAttribute('title');
        if (G.validKey(p,key)) element.classList.add(G.isCorrect(p,value,key)?'correct':'wrong');
      }
    });
  }
  updateButtons(); if (annotatedView) draw();
  if (cameraPreviewRecord && records.includes(cameraPreviewRecord) && !$('cameraPreview').classList.contains('hidden')) {
    const preview = Reports.annotatedCanvas(assess(cameraPreviewRecord), config()), target = $('cameraPreviewCanvas');
    target.width=preview.width; target.height=preview.height; target.getContext('2d').drawImage(preview,0,0);
  }
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
async function restoreSession() {
  const surfaces = [document.querySelector('main'), document.querySelector('.mobile-nav')];
  surfaces.forEach(element => { element.inert = true; });
  try {
    const saved = await window.ChamTNSession.load();
    if (saved) {
      records = saved.records; nextId = Math.max(saved.nextId || 0, ...records.map(r => Number(r.id) || 0)); cameraCount = saved.cameraCount || 0;
      activeId = records.some(r => r.id === saved.activeId) ? saved.activeId : records[0]?.id || '';
      if (activeId) selectRecord(activeId);
      annotatedView = !!current()?.answers; draw();
    }
    $('sessionStatus').textContent = records.length ? `Đã khôi phục ${records.length} bài trên thiết bị` : 'Lưu tự động trên thiết bị';
  } catch (_) { $('sessionStatus').textContent = 'Không mở được bộ nhớ cục bộ. Hãy xuất kết quả trước khi đóng trang.'; }
  finally { restoringSession = false; surfaces.forEach(element => { element.inert = false; }); }
}
restoreSession();
if ('serviceWorker' in navigator) {
  $('offlineStatus').textContent = 'Đang chuẩn bị sử dụng ngoại tuyến…';
  navigator.serviceWorker.register('./sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    $('sessionStatus').dataset.offlineReady = 'true';
    $('offlineStatus').textContent = 'Sẵn sàng dùng khi mất mạng';
  }).catch(() => { $('offlineStatus').textContent = 'Chưa tải được bộ nhớ ngoại tuyến. Dữ liệu bài vẫn được lưu trên thiết bị.'; });
}
