(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChamTNInputs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const base = typeof document !== 'undefined' ? new URL('.', document.currentScript.src) : null;
  let pdfPromise;
  let fallbackWorkerPromise;
  function trimTail(values, empty = value => !String(value ?? '').trim()) {
    const result = values.slice(); while (result.length && empty(result[result.length - 1])) result.pop(); return result;
  }
  function validateExam(exam) {
    const { p1, p2, p3 } = exam.keys;
    if (p1.length > 40 || p2.length > 8 || p3.length > 6 || !p1.length && !p2.length && !p3.length) throw new Error(`Mã đề ${exam.code}: số câu không phù hợp với mẫu phiếu.`);
    if (p1.some(v => typeof v !== 'string' || !(/^[OX]$/.test(v) || /^[ABCD]{1,4}$/.test(v) && new Set(v).size === v.length))) throw new Error(`Mã đề ${exam.code}: phần I có đáp án trống hoặc không hợp lệ.`);
    if (p2.some(row => row.length !== 4 || row.some(v => !['Đ', 'S', 'O', 'X'].includes(v)))) throw new Error(`Mã đề ${exam.code}: mỗi câu phần II cần đủ 4 ý Đ/S/O/X.`);
    if (p3.some(v => !['O','X'].includes(v) && !/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(String(v)))) throw new Error(`Mã đề ${exam.code}: phần III cần đáp án số, O hoặc X.`);
    return exam;
  }
  function parseQrPayload(payload) {
    let parsed; try { parsed = JSON.parse(payload.trim()); } catch (_) { throw new Error('Nội dung QR không phải bộ đáp án JSON theo mẫu.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('QR không chứa bảng đáp án theo mã đề.');
    const exams = [];
    for (const [code, content] of Object.entries(parsed)) {
      if (!/^\d{1,4}$/.test(code)) continue;
      if (typeof content !== 'string') throw new Error(`Đáp án mã đề ${code} không hợp lệ.`);
      const parts = content.split('#'); if (parts.length !== 3) throw new Error(`Mã đề ${code}: cần đủ ba phần, ngăn cách bằng #.`);
      exams.push(validateExam({ code, keys: {
        p1: (/[\s_,;]/.test(parts[0].trim()) ? parts[0].toUpperCase().trim().split(/[\s_,;]+/).filter(Boolean) : parts[0].toUpperCase().split('')),
        p2: parts[1] ? parts[1].split('_').map(row => row.toUpperCase().replace(/D/g, 'Đ').split('')) : [],
        p3: parts[2] ? parts[2].split('_').map(v => v.trim()) : []
      } }));
    }
    if (!exams.length) throw new Error('QR không có mã đề và đáp án hợp lệ.');
    return exams;
  }
  function parseRows(rows) {
    const smartHeader = rows.findIndex(row => /^câu\s*[\\/]\s*mã\s*đề$/i.test(String(row[0] ?? '').trim()));
    if (smartHeader >= 0) return parseSmartRows(rows, smartHeader);
    const headerIndex = rows.findIndex(row => row.some(v => /^1a$/i.test(String(v).trim())) && row.some(v => String(v).trim() === '1'));
    if (headerIndex < 0) return [];
    const headers = rows[headerIndex].map(v => String(v).trim());
    const firstII = headers.findIndex(v => /^1a$/i.test(v));
    let lastII = firstII; headers.forEach((v, i) => { if (/^\d+[abcd]$/i.test(v)) lastII = i; });
    const firstIII = lastII + 1;
    const exams = [];
    for (const row of rows.slice(headerIndex + 1)) {
      let code = String(row[0] ?? '').trim(); if (!code) continue;
      if (!/^\d{1,4}$/.test(code)) continue;
      if (code.length < 3) code = code.padStart(3, '0');
      const values = Array.from({ length: headers.length }, (_, i) => String(row[i] ?? '').trim());
      const p1 = trimTail(values.slice(1, firstII)).map(v => v.toUpperCase());
      const flat = values.slice(firstII, firstIII).map(v => v.toUpperCase().replace(/^D$/, 'Đ'));
      const groups = []; for (let i = 0; i < flat.length; i += 4) groups.push(flat.slice(i, i + 4));
      const p2 = trimTail(groups, group => group.every(v => !v));
      const p3 = trimTail(values.slice(firstIII));
      exams.push(validateExam({ code, keys: { p1, p2, p3 } }));
    }
    return exams;
  }
  function parseSmartRows(rows, headerIndex) {
    const codes = trimTail(rows[headerIndex].slice(1)).map(value => String(value ?? '').trim());
    if (!codes.length || codes.some(code => !/^\d{1,4}$/.test(code))) throw new Error('SmartTest: hàng đầu cần mã đề hợp lệ ở từng cột.');
    const exams = codes.map(code => ({ code: code.padStart(3, '0'), keys: { p1: [], p2: [], p3: [] } }));
    let section = 1, previous = 0;
    for (const row of rows.slice(headerIndex + 1)) {
      if (row.every(value => !String(value ?? '').trim())) continue;
      const question = Number(row[0]);
      if (!Number.isInteger(question) || question !== previous + 1) throw new Error('SmartTest: số câu cần liên tiếp, bắt đầu từ 1.');
      previous = question;
      const values = codes.map((_, i) => String(row[i + 1] ?? '').trim().toUpperCase());
      const kinds = values.filter(value => !['O', 'X'].includes(value)).map(value => {
        if (/^[ĐDSOX]{4}$/.test(value)) return 2;
        if (/^[ABCD]{1,4}$/.test(value)) return 1;
        if (/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value)) return 3;
        return 0;
      });
      const kind = kinds[0] || section;
      if (!kind || kinds.some(value => value !== kind) || kind < section) throw new Error(`SmartTest: câu ${question} có đáp án không hợp lệ hoặc không cùng phần.`);
      section = kind;
      if (row.slice(codes.length + 1).some(value => String(value ?? '').trim())) throw new Error(`SmartTest: câu ${question} có cột đáp án không có mã đề.`);
      values.forEach((value, i) => exams[i].keys['p' + section].push(section === 2 ? (['O', 'X'].includes(value) ? value.repeat(4) : value.replace(/D/g, 'Đ')).split('') : value));
    }
    return exams.map(validateExam);
  }
  function workbookExams(workbook, xlsx) {
    const exams = [];
    for (const sheet of workbook.SheetNames) exams.push(...parseRows(xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, raw: false, defval: '' })));
    if (!exams.length) throw new Error('Không tìm thấy bảng đáp án theo mẫu Excel YoungMix hoặc SmartTest.');
    const codes = new Set(); for (const exam of exams) { if (codes.has(exam.code)) throw new Error(`Mã đề ${exam.code} bị trùng trong file Excel.`); codes.add(exam.code); }
    return exams;
  }
  function matchingCode(exams, code) {
    const normalized = value => String(value).replace(/^0+(?=\d)/, '');
    return exams.find(exam => normalized(exam.code) === normalized(code))?.code || '';
  }
  function makeCanvas(image, maxWidth = 1200, maxHeight = 1800) {
    const width = image.videoWidth || image.naturalWidth || image.width, height = image.videoHeight || image.naturalHeight || image.height;
    if (!width || !height) throw new Error('Ảnh hoặc camera chưa có dữ liệu.');
    const scale = Math.min(1, maxWidth / width, maxHeight / height), canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  async function imageFromFile(file) {
    const url = URL.createObjectURL(file);
    try { const image = new Image(); image.src = url; await image.decode(); return image; }
    catch (_) { throw new Error('Không đọc được ảnh. Hãy dùng ảnh PNG, JPEG hoặc WebP.'); }
    finally { URL.revokeObjectURL(url); }
  }
  async function qrFromFile(file) {
    const image = await imageFromFile(file);
    for (const scale of [1, 1.5, .75]) {
      const factor = Math.min(1, 1800 / Math.max(image.width, image.height)) * scale;
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * factor) + 80; canvas.height = Math.round(image.height * factor) + 80;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 40, 40, canvas.width - 80, canvas.height - 80);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), result = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
      if (result) return parseQrPayload(result.data);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    throw new Error('Không đọc được QR trong ảnh. Hãy chọn ảnh QR rõ nét và đủ cả mã.');
  }
  async function excelFromFile(file) { return workbookExams(window.XLSX.read(await file.arrayBuffer(), { type: 'array' }), window.XLSX); }
  async function pdfLibrary() {
    if (!pdfPromise) pdfPromise = Promise.resolve().then(() => {
      const lib = window.pdfjsLib;
      if (!lib) throw new Error('Chưa tải được bộ đọc PDF cục bộ. Tải lại trang khi có mạng một lần rồi thử lại.');
      lib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', base).href; return lib;
    }).catch(error => { pdfPromise = null; throw error; });
    return pdfPromise;
  }
  function fallbackWorker() {
    if (!fallbackWorkerPromise) fallbackWorkerPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = new URL('../vendor/pdfjs/pdf.worker.min.js', base).href;
      script.onload = resolve;
      script.onerror = () => { script.remove(); fallbackWorkerPromise = null; reject(new Error('Không tải được bộ xử lý PDF cục bộ.')); };
      document.head.appendChild(script);
    });
    return fallbackWorkerPromise;
  }
  async function* pdfPages(file) {
    const lib = await pdfLibrary();
    const bytes = await file.arrayBuffer();
    const options = { cMapUrl: new URL('../vendor/pdfjs/cmaps/', base).href, cMapPacked: true, standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', base).href, wasmUrl: new URL('../vendor/pdfjs/wasm/', base).href, isEvalSupported: false, useWorkerFetch: false };
    let pdf, task, worker, port;
    try {
      try {
        // A same-origin classic worker avoids module imports and blob wrappers.
        port = new Worker(new URL('../vendor/pdfjs/pdf.worker.min.js', base).href);
        const failed = new Promise((_,reject) => { port.onerror = event => { event.preventDefault(); reject(new Error('Không mở được worker PDF')); }; });
        worker = new lib.PDFWorker({port});
        task = lib.getDocument({...options, data: new Uint8Array(bytes.slice(0)), worker});
        pdf = await Promise.race([task.promise,failed]);
      } catch (_) {
        await task?.destroy().catch(() => {}); worker?.destroy(); port?.terminate(); worker = port = null;
        // Browsers that block workers can still read PDFs on the main thread.
        await fallbackWorker();
        task = lib.getDocument({...options, data: new Uint8Array(bytes.slice(0))});
        pdf = await task.promise;
      }
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i), natural = page.getViewport({ scale: 1 });
        const scale = Math.min(1600 / natural.width, 2200 / natural.height), viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: 'rgb(255,255,255)' }).promise;
        yield { source: makeCanvas(canvas), page: i, total: pdf.numPages };
        page.cleanup();
      }
    } catch (error) {
      if (error.name === 'PasswordException') throw new Error('PDF có mật khẩu. Hãy dùng bản PDF đã mở khóa.');
      throw error;
    } finally { await task?.destroy(); worker?.destroy(); port?.terminate(); }
  }
  return { validateExam, parseQrPayload, parseRows, workbookExams, matchingCode, makeCanvas, imageFromFile, qrFromFile, excelFromFile, pdfPages };
});
