'use strict';
const $ = id => document.getElementById(id);
const G = window.ChamTNGrading, OMR = window.ChamTNOMR, Inputs = window.ChamTNInputs, Reports = window.ChamTNReports;
const canvas = $('photo'), ctx = canvas.getContext('2d');
const names = ['I', 'II', 'III'];
const storedIds = ['key1', 'key2', 'key3', 'n1', 'n2', 'n3', 'w1', 'w2', 'w3', 'mode1', 'mode2', 'mode3', 'rule2', 'level1', 'level2', 'level3', 'level4'];
let records = [], activeId = '', exams = [], preferredCode = '', nextId = 0, loadVersion = 0, importingVersion = 0;
const cameraGate = new window.ChamTNScanner.ScanGate();
let cameraTimer = null, cameraPaused = false, cameraBusy = false, cameraCount = 0;
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
  $('alignmentStatus').textContent = r.autoAligned ? 'Đã tự căn bằng mốc đen · ' + (r.profile === 'standard' ? 'Phiếu chuẩn PDF' : 'Phiếu YoungMix') : r.points.length === 4 ? 'Căn chỉnh thủ công' : 'Thiếu mốc: chọn bốn góc để chấm';
  updateButtons();
}
function recognizeRecord(record) {
  const sourceCtx = record.source.getContext('2d', { willReadFrequently: true });
  const result = OMR.recognize(sourceCtx.getImageData(0, 0, record.source.width, record.source.height), record.points, record.profile);
  record.answers = result.answers; record.flags = result.flags; Object.assign(record, result.metadata); record.error = '';
  if (!record.manualKey) chooseKey(record);
}
async function addSource(source, label, activate = true) {
  const record = { id: String(++nextId), source, label, points: [], answers: null, flags: null, studentId: '', examCode: '', keyCode: preferredCode, autoAligned: false, error: '' };
  const pixels = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const aligned = OMR.autoAlign(pixels);
  if (aligned) {
    record.points = aligned.points; record.profile = aligned.profile; record.autoAligned = true;
    try { recognizeRecord(record); } catch (error) { record.error = error.message; }
  }
  records.push(record); if (activate || !activeId) selectRecord(record.id); else { renderPicker(); refresh(); }
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
  cameraVersion++; clearTimeout(cameraTimer); cameraTimer = null;
  cameraStream?.getTracks().forEach(track => track.stop()); cameraStream = null;
  $('cameraVideo').srcObject = null; $('cameraPanel').classList.add('hidden'); $('captureCamera').disabled = true;
  document.body.classList.remove('camera-open'); drawCameraOverlay(null); cameraGate.reset(); cameraBusy = false;
  if (document.activeElement && $('cameraPanel').contains(document.activeElement)) $('openCamera').focus();
}
function cameraFrame(source) {
  const pixels = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const aligned = OMR.autoAlign(pixels); if (!aligned) return null;
  const result = OMR.recognize(pixels, aligned.points, aligned.profile), cfg = config();
  const answers = [result.answers.p1.slice(0, count(0)), result.answers.p2.slice(0, count(1)), result.answers.p3.slice(0, count(2))];
  const flags = [result.flags.p1.slice(0, count(0)), result.flags.p2.slice(0, count(1)).flat(), result.flags.p3.slice(0, count(2))].flat();
  const filled = answers.flat(2).filter(Boolean).length;
  const ambiguous = flags.filter(flag => /không rõ|Không rõ/.test(flag)).length;
  const nearEnough = Math.min(...aligned.markers.map((m,i) => Math.hypot(m.x-aligned.markers[(i+1)%4].x,m.y-aligned.markers[(i+1)%4].y))) >= 420;
  const usable = nearEnough && !G.validateConfig(cfg).length && cfg.parts.some(p => p.count > 0) &&
    (filled > 0 || !result.metadata.studentUncertain) && ambiguous <= Math.max(2, flags.length * .15);
  const identity = !result.metadata.studentUncertain && !result.metadata.examUncertain ? result.metadata.studentId + ':' + result.metadata.examCode : '';
  return { points: aligned.points, markers: aligned.markers, nearEnough, profile: aligned.profile, width: source.width, height: source.height, identity,
    signature: JSON.stringify([result.metadata.studentId, result.metadata.examCode, answers]), usable };
}
async function saveCameraSource(source, frame, version) {
  cameraBusy = true; $('captureCamera').disabled = true;
  try {
    const record = await addSource(source, `Camera · ${new Date().toLocaleTimeString('vi-VN')} · ${++cameraCount}`, true);
    if (version !== cameraVersion) return;
    if (frame) cameraGate.accept(frame, performance.now());
    const item = assess(record);
    $('cameraCount').textContent = `${cameraCount} bài đã lưu`;
    $('cameraLast').textContent = `${record.studentId ? 'SBD ' + record.studentId : 'Bài ' + cameraCount} · ${item.result?.scores ? format(item.result.total) + ' điểm' : 'Chưa tính điểm'} · ${item.status}`;
    $('cameraStatus').textContent = 'Đã lưu bài. Thay phiếu tiếp theo.';
    $('cameraProgress').style.width = '0%';
    $('cameraFlash').classList.remove('flash'); void $('cameraFlash').offsetWidth; $('cameraFlash').classList.add('flash');
    navigator.vibrate?.(70);
    $('uploadStatus').textContent = `Đã thêm ${cameraCount} bài từ camera.`;
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
  const scale = Math.min(overlay.width / frame.width, overlay.height / frame.height);
  const left = (overlay.width - frame.width * scale) / 2, top = (overlay.height - frame.height * scale) / 2;
  const point = p => ({x:left+p.x*scale,y:top+p.y*scale});
  context.strokeStyle = frame.usable ? '#83f5a5' : '#ffcd6e'; context.fillStyle = '#83f5a533'; context.lineWidth = Math.max(2, overlay.width / 180);
  context.beginPath(); frame.points.forEach((p,i) => { const q = point(p); if (!i) context.moveTo(q.x,q.y); else context.lineTo(q.x,q.y); }); context.closePath(); context.stroke();
  for (const [i, marker] of frame.markers.entries()) {
    const p = point(marker), size = Math.max(16, marker.size * scale * 1.6);
    context.fillRect(p.x-size/2,p.y-size/2,size,size); context.strokeRect(p.x-size/2,p.y-size/2,size,size);
    context.fillStyle = '#fff'; context.beginPath(); context.arc(p.x,p.y,Math.max(2,overlay.width/200),0,Math.PI*2); context.fill();
    context.font = `bold ${Math.max(12,overlay.width/35)}px system-ui`; context.fillText(String(i+1),p.x+size/2+3,p.y);
    context.fillStyle = '#83f5a533';
  }
}
async function scanCamera(version) {
  if (version !== cameraVersion || !cameraStream) return;
  try {
    if (!cameraPaused && !cameraBusy && $('cameraVideo').readyState >= 2) {
      const source = Inputs.makeCanvas($('cameraVideo'), 1600, 2300), frame = cameraFrame(source);
      drawCameraOverlay(frame);
      // A detected but unreadable sheet must not release the duplicate lock.
      const state = frame && !frame.usable ? (cameraGate.forgetCandidate(), {ready:false,reason:'quality'}) : cameraGate.observe(frame, performance.now());
      $('cameraProgress').style.width = `${Math.round((state.progress || 0) * 100)}%`;
      if (state.ready) await saveCameraSource(source, frame, version);
      else $('cameraStatus').textContent = state.reason === 'missing' ? 'Đưa đủ bốn mốc đen vào khung.' : state.reason === 'duplicate' ? 'Bài này đã lưu. Thay phiếu tiếp theo.' : state.reason === 'quality' ? !frame?.nearEnough ? 'Đưa máy gần phiếu hơn để đọc rõ các ô.' : 'Làm rõ nét tô và kiểm tra cấu hình, hoặc chụp thủ công.' : 'Giữ phiếu ổn định…';
    }
  } catch (error) { if (version === cameraVersion) $('cameraStatus').textContent = 'Không đọc được khung hình. Giữ máy ổn định hoặc chụp thủ công.'; }
  finally { if (version === cameraVersion && cameraStream) cameraTimer = setTimeout(() => scanCamera(version), 450); }
}
$('openCamera').onclick = async () => {
  stopCamera(); const version = cameraVersion;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { $('scanError').textContent = 'Camera trực tiếp cần HTTPS hoặc localhost. Trên điện thoại, bạn vẫn có thể chọn “Chụp bằng điện thoại”.'; $('scanError').scrollIntoView({ behavior: 'smooth' }); return; }
  cameraPaused = false; cameraCount = 0; $('pauseCamera').textContent = 'Tạm dừng quét';
  $('cameraCount').textContent = '0 bài đã lưu'; $('cameraStatus').textContent = 'Đang mở camera…';
  $('cameraLast').textContent = 'Lấy đủ bốn mốc đen và giữ phiếu ổn định.';
  $('cameraProgress').style.width = '0%'; $('cameraPanel').classList.remove('hidden'); document.body.classList.add('camera-open'); $('closeCamera').focus();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 2560 } } });
    if (version !== cameraVersion) { stream.getTracks().forEach(track => track.stop()); return; }
    cameraStream = stream; $('cameraVideo').srcObject = stream; await $('cameraVideo').play();
    if (version !== cameraVersion) return;
    $('captureCamera').disabled = !$('cameraVideo').videoWidth; $('scanError').textContent = '';
    scanCamera(version);
  } catch (error) { if (version !== cameraVersion) return; stopCamera(); $('scanError').textContent = error.name === 'NotAllowedError' ? 'Chưa được cấp quyền camera. Cho phép camera trong trình duyệt hoặc dùng “Chụp bằng điện thoại”.' : 'Không mở được camera. Hãy dùng nút “Chụp bằng điện thoại” hoặc tải ảnh có sẵn.'; $('scanError').scrollIntoView({ behavior: 'smooth' }); }
};
$('cameraVideo').onloadedmetadata = () => { $('captureCamera').disabled = !$('cameraVideo').videoWidth || cameraBusy; };
$('closeCamera').onclick = stopCamera;
$('pauseCamera').onclick = () => {
  cameraPaused = !cameraPaused; cameraGate.forgetCandidate();
  $('pauseCamera').textContent = cameraPaused ? 'Tiếp tục quét' : 'Tạm dừng quét';
  $('cameraStatus').textContent = cameraPaused ? 'Đã tạm dừng tự quét. Có thể chụp thủ công.' : 'Đưa phiếu vào khung để tiếp tục.';
  $('cameraProgress').style.width = '0%';
};
$('captureCamera').onclick = async () => {
  if (!cameraStream || cameraBusy || !$('cameraVideo').videoWidth) return;
  const version = cameraVersion;
  try { const source = Inputs.makeCanvas($('cameraVideo'), 1600, 2300); await saveCameraSource(source, cameraFrame(source), version); }
  catch (error) { if (version === cameraVersion) $('cameraStatus').textContent = error.message; }
};
document.addEventListener('keydown', event => {
  if (!$('cameraPanel').classList.contains('hidden')) {
    if (event.key === 'Escape') { event.preventDefault(); stopCamera(); }
    if (event.key === 'Tab') {
      const controls = [$('closeCamera'), $('pauseCamera'), $('captureCamera')].filter(el => !el.disabled);
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
