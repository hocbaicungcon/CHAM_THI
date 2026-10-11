(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChamTNReports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const G = root.ChamTNGrading || (typeof require === 'function' ? require('./grading.js') : null);
  const fmt = number => Number(number).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  function summaryRows(items) {
    return [['STT', 'Bài làm / Trang', 'Số báo danh', 'Mã đề đáp án', 'Phần I', 'Phần II', 'Phần III', 'Tổng điểm', 'Trạng thái'], ...items.map((item, i) => [
      i + 1, item.record.label, item.record.studentId || '', item.record.keyCode || item.record.examCode || '',
      ...(item.result?.scores || ['', '', '']), item.result?.scores ? item.result.total : '', item.status
    ])];
  }
  function detailRows(items, config) {
    const rows = [['Bài làm', 'Số báo danh', 'Mã đề', 'Phần', 'Câu', 'Bài làm', 'Đáp án', 'Kết quả', 'Cần kiểm tra']];
    for (const item of items) {
      const r = item.record; if (!r.answers) continue;
      for (let part = 0; part < 3; part++) {
        const p = 'p' + (part + 1);
        for (let i = 0; i < config.parts[part].count; i++) for (let j = 0; j < (part === 1 ? 4 : 1); j++) {
          const value = part === 1 ? r.answers[p][i][j] : r.answers[p][i];
          const key = part === 1 ? item.keys[p][i]?.[j] : item.keys[p][i];
          const flag = part === 1 ? r.flags[p][i][j] : r.flags[p][i];
          const valid = G.validKey(p, key), correct = G.isCorrect(p, value, key);
          rows.push([r.label, r.studentId || '', r.keyCode || '', ['I', 'II', 'III'][part], `${i + 1}${part === 1 ? 'abcd'[j] : ''}`, value, key ?? '', valid ? (correct ? 'Đúng' : 'Sai') : 'Thiếu đáp án', flag]);
        }
      }
    }
    return rows;
  }
  function excel(items, config) {
    const X = root.XLSX, book = X.utils.book_new();
    const summary = X.utils.aoa_to_sheet(summaryRows(items));
    summary['!cols'] = [{ wch: 6 }, { wch: 38 }, { wch: 16 }, { wch: 16 }, ...Array.from({ length: 4 }, () => ({ wch: 12 })), { wch: 45 }];
    summary['!autofilter'] = { ref: summary['!ref'] };
    for (let row = 2; row <= items.length + 1; row++) for (const col of ['E', 'F', 'G', 'H']) if (summary[col + row]?.t === 'n') summary[col + row].z = '0.00';
    X.utils.book_append_sheet(book, summary, 'Điểm thi');
    const details = X.utils.aoa_to_sheet(detailRows(items, config));
    details['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 48 }];
    details['!autofilter'] = { ref: details['!ref'] };
    X.utils.book_append_sheet(book, details, 'Chi tiết câu');
    const settings = [['Phần', 'Số câu', 'Giá trị điểm', 'Cách nhập', 'Điểm tối đa'], ...config.parts.map((part, i) => [['I', 'II', 'III'][i], part.count, part.points, part.mode === 'total' ? 'Tổng điểm phần' : 'Điểm mỗi câu', G.maximum(part)]), [], ['Chấm phần II', { linear: 'Chia đều từng ý', all: 'Đúng đủ 4 ý', levels: 'Theo mức ý đúng' }[config.rule2]], ['Tỷ lệ 1–4 ý (%)', ...config.levels2]];
    const settingsSheet = X.utils.aoa_to_sheet(settings); settingsSheet['!cols'] = Array.from({ length: 5 }, () => ({ wch: 24 }));
    X.utils.book_append_sheet(book, settingsSheet, 'Cấu hình chấm');
    return X.write(book, { bookType: 'xlsx', type: 'array' });
  }
  function text(ctx, content, x, y, size = 22, color = '#20372d', bold = false) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`; ctx.fillStyle = color; ctx.fillText(String(content), x, y);
  }
  function fitted(ctx, content, x, y, width, size = 22, color = '#20372d') {
    let value = String(content); ctx.font = `${size}px Arial, sans-serif`;
    while (ctx.measureText(value).width > width && value.length) value = value.slice(0, -1);
    if (value !== String(content)) value = value.slice(0, -1) + '…';
    text(ctx, value, x, y, size, color);
  }
  async function pdfFromCanvases(canvases, title) {
    const pdf = await root.PDFLib.PDFDocument.create(); pdf.setTitle(title); pdf.setCreator('CHẤM TN');
    for await (const canvas of canvases) {
      const image = await pdf.embedJpg(canvas.toDataURL('image/jpeg', .94));
      const page = pdf.addPage([595.28, 841.89]), factor = Math.min((page.getWidth() - 20) / canvas.width, (page.getHeight() - 20) / canvas.height);
      const width = canvas.width * factor, height = canvas.height * factor;
      page.drawImage(image, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
    }
    return pdf.save();
  }
  function summaryCanvases(items, config) {
    const pages = [], perPage = 17, totalPages = Math.max(1, Math.ceil(items.length / perPage));
    for (let n = 0; n < totalPages; n++) {
      const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1240, 1754);
      ctx.fillStyle = '#123d35'; ctx.fillRect(40, 40, 1160, 125);
      text(ctx, 'KẾT QUẢ CHẤM TRẮC NGHIỆM', 65, 91, 36, 'white', true);
      text(ctx, `Phần I: ${config.parts[0].count} câu · Phần II: ${config.parts[1].count} câu · Phần III: ${config.parts[2].count} câu`, 65, 132, 24, '#cbe5d7');
      text(ctx, `Thang điểm: ${fmt(config.parts.reduce((sum, part) => sum + G.maximum(part), 0))} · ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`, 50, 207, 22);
      const xs = [50, 105, 510, 665, 785, 900, 1015, 1125];
      ['STT', 'Bài làm / Trạng thái', 'SBD', 'Mã đề', 'Phần I', 'Phần II', 'Phần III', 'Tổng'].forEach((label, i) => text(ctx, label, xs[i], 266, 21, '#147d64', true));
      const pageItems = items.slice(n * perPage, (n + 1) * perPage);
      pageItems.forEach((item, i) => {
        const y = 294 + i * 76;
        ctx.fillStyle = i % 2 ? '#fff' : '#f1f6f1'; ctx.fillRect(45, y - 15, 1150, 76);
        text(ctx, n * perPage + i + 1, xs[0], y + 15, 22);
        fitted(ctx, item.record.label, xs[1], y + 12, 390, 22);
        fitted(ctx, item.status, xs[1], y + 40, 390, 17, '#7a6843');
        fitted(ctx, item.record.studentId || '—', xs[2], y + 15, 145, 21);
        fitted(ctx, item.record.keyCode || item.record.examCode || '—', xs[3], y + 15, 100, 21);
        for (let part = 0; part < 3; part++) text(ctx, item.result?.scores ? fmt(item.result.scores[part]) : '—', xs[part + 4], y + 15, 22);
        text(ctx, item.result?.scores ? fmt(item.result.total) : '—', xs[7], y + 15, 23, '#147d64', true);
      });
      text(ctx, `Trang ${n + 1}/${totalPages} · CHẤM TN`, 50, 1705, 20, '#758479'); pages.push(canvas);
    }
    return pages;
  }
  function mark(ctx, position, correct, dashed = false) {
    ctx.save(); ctx.strokeStyle = dashed ? '#d99a00' : correct ? '#078735' : '#df202b'; ctx.lineWidth = 5;
    if (dashed) ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(position.x, position.y, 12, 0, Math.PI * 2); ctx.stroke();
    if (!dashed) {
      ctx.setLineDash([]);
      root.ChamTNIcons.draw(ctx, correct ? 'check' : 'close', position.x - 12, position.y - 12, 24, correct ? '#078735' : '#df202b');
    }
    ctx.restore();
  }
  function annotatedCanvas(item, config) {
    const O = root.ChamTNOMR, r = item.record, sheet = document.createElement('canvas'); sheet.width = 1229; sheet.height = 1754;
    const sheetCtx = sheet.getContext('2d'); sheetCtx.fillStyle = 'white'; sheetCtx.fillRect(0, 0, sheet.width, sheet.height);
    if (r.points?.length === 4) {
      const rectified = O.rectify(r.source.getContext('2d').getImageData(0, 0, r.source.width, r.source.height), r.points);
      sheetCtx.putImageData(new ImageData(rectified.data, rectified.width, rectified.height), 0, 0);
    } else {
      const factor = Math.min(sheet.width / r.source.width, sheet.height / r.source.height);
      sheetCtx.drawImage(r.source, (sheet.width - r.source.width * factor) / 2, (sheet.height - r.source.height * factor) / 2, r.source.width * factor, r.source.height * factor);
    }
    const numericDot = r.answers && r.points?.length === 4 ? O.detector(r.source.getContext('2d').getImageData(0, 0, r.source.width, r.source.height), r.points) : null;
    if (r.answers && item.result?.scores) for (let part = 0; part < 3; part++) {
      const p = 'p' + (part + 1);
      for (let i = 0; i < config.parts[part].count; i++) for (let j = 0; j < (part === 1 ? 4 : 1); j++) {
        const key = part === 1 ? item.keys[p][i]?.[j] : item.keys[p][i], value = part === 1 ? r.answers[p][i][j] : r.answers[p][i];
        if (!G.validKey(p, key)) continue;
        const correct = G.isCorrect(p, value, key);
        if (part < 2) {
          if ((p === 'p1' ? ['A','B','C','D'].includes(value) : G.validKey(p, value))) mark(sheetCtx, O.choicePosition(p, i, j, value, r.profile), correct);
          if (!correct) {
            for (const accepted of p === 'p1' ? G.acceptedChoices(key) : [key]) {
              const pos = O.choicePosition(p, i, j, accepted, r.profile); mark(sheetCtx, pos, true, true);
            }
          }
        } else {
          const standard = r.profile === 'standard';
          const x = standard ? (128 + i * 163.8) * 1229 / 1241 : 74 + i * 177.5;
          const top = standard ? 1218 : 1228, bottom = standard ? 1615 : 1669;
          // Mark the physical digit columns, including leading empty columns.
          // The parsed number cannot recover their positions on the paper.
          if (numericDot) {
            const base = standard ? 165 + i * 163.8 : 126 + i * 177.5;
            const sx = v => standard ? v * 1229 / 1241 : v;
            const spacing = standard ? 34.4 : 30;
            for (let col = 0; col < 4; col++) {
              const px = sx(base + spacing * col);
              const ys = Array.from({length:10}, (_,d) => standard ? 1340 + 27.15*d : 1348 + 33*d);
              const selected = O.choose(ys.map(y => numericDot(px,y)), '0123456789'.split(''));
              if (selected.value) mark(sheetCtx, {x:px,y:ys[Number(selected.value)]}, correct);
            }
            const negativeY = standard ? 1286 : 1283, commaY = standard ? 1313 : 1317;
            if (numericDot(sx(base), negativeY) > .32) mark(sheetCtx, {x:sx(base),y:negativeY},correct);
            const comma = O.choose([1,2].map(col => numericDot(sx(base + spacing*col),commaY)), ['1','2']);
            if (comma.value) mark(sheetCtx, {x:sx(base+spacing*Number(comma.value)),y:commaY},correct);
          }
          sheetCtx.fillStyle = correct ? '#e5f7ea' : '#fff0f0'; sheetCtx.fillRect(x + 5, top, standard ? 148 : 158, 31);
          root.ChamTNIcons.draw(sheetCtx, correct ? 'check' : 'close', x + 10, top + 3, 25, correct ? '#078735' : '#df202b');
          text(sheetCtx, `Câu ${i + 1}`, x + 40, top + 23, 22, correct ? '#078735' : '#df202b', true);
          if (!correct) { sheetCtx.fillStyle = '#fff0f0'; sheetCtx.fillRect(x + 5, bottom, standard ? 148 : 158, 26); fitted(sheetCtx, `ĐA: ${key}`, x + 12, bottom + 20, 145, 18, '#df202b'); }
        }
      }
    }
    const canvas = document.createElement('canvas'); canvas.width = 1229; canvas.height = 1934;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4faf5'; ctx.fillRect(0, 0, 1229, 180); ctx.drawImage(sheet, 0, 180);
    text(ctx, 'PHIẾU ĐÃ CHẤM · CHẤM TN', 28, 36, 30, '#123d35', true);
    fitted(ctx, `${r.label} · SBD: ${r.studentId || '—'} · Mã đề: ${r.keyCode || r.examCode || '—'}`, 28, 67, 1170, 22);
    if (item.result?.scores) {
      text(ctx, `${item.result.warnings.length ? 'Điểm tạm tính' : 'Tổng điểm'}: ${fmt(item.result.total)}/${fmt(item.result.maxima.reduce((sum, v) => sum + v, 0))}`, 28, 112, 31, '#147d64', true);
      text(ctx, `Phần I: ${fmt(item.result.scores[0])}/${fmt(item.result.maxima[0])}    Phần II: ${fmt(item.result.scores[1])}/${fmt(item.result.maxima[1])}    Phần III: ${fmt(item.result.scores[2])}/${fmt(item.result.maxima[2])}`, 465, 109, 23);
    } else fitted(ctx, item.status, 28, 111, 1170, 28, '#bb3434');
    text(ctx, 'Vòng xanh: đúng · Vòng đỏ: sai · Vòng vàng: đáp án đúng', 28, 148, 21);
    fitted(ctx, item.status, 28, 174, 1170, 17, '#7a6843');
    return canvas;
  }
  async function summaryPdf(items, config) { return pdfFromCanvases(summaryCanvases(items, config), 'Kết quả điểm thi'); }
  async function annotatedPdf(items, config) {
    async function* pages() { for (const item of items) { yield annotatedCanvas(item, config); await new Promise(resolve => setTimeout(resolve, 0)); } }
    return pdfFromCanvases(pages(), 'Phiếu trắc nghiệm đã chấm');
  }
  return { summaryRows, detailRows, excel, summaryCanvases, annotatedCanvas, summaryPdf, annotatedPdf };
});
