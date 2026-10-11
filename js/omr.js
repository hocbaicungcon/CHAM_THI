(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChamTNOMR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const template = { width: 1229, height: 1754, limits: [40, 8, 6] };
  function solve(matrix, vector) {
    for (let i = 0; i < 8; i++) {
      let pivot = i;
      for (let j = i + 1; j < 8; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
      [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
      [vector[i], vector[pivot]] = [vector[pivot], vector[i]];
      let value = matrix[i][i];
      if (Math.abs(value) < 1e-9) throw new Error('Bốn góc không hợp lệ. Hãy chọn lại các góc tờ giấy.');
      for (let k = i; k < 8; k++) matrix[i][k] /= value;
      vector[i] /= value;
      for (let j = 0; j < 8; j++) if (j !== i) {
        value = matrix[j][i];
        for (let k = i; k < 8; k++) matrix[j][k] -= value * matrix[i][k];
        vector[j] -= value * vector[i];
      }
    }
    return vector;
  }
  function project(points, anchors = [[0, 0], [template.width, 0], [template.width, template.height], [0, template.height]]) {
    if (points.length !== 4) throw new Error('Cần chọn đủ bốn góc tờ giấy.');
    for (let i = 0; i < 4; i++) {
      const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4];
      if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 0) throw new Error('Chọn các góc theo thứ tự trên trái, trên phải, dưới phải, dưới trái.');
    }
    const matrix = [], vector = [];
    anchors.forEach(([x, y], i) => {
      const p = points[i];
      matrix.push([x, y, 1, 0, 0, 0, -x * p.x, -y * p.x]); vector.push(p.x);
      matrix.push([0, 0, 0, x, y, 1, -x * p.y, -y * p.y]); vector.push(p.y);
    });
    const h = solve(matrix, vector);
    return (x, y) => {
      const d = h[6] * x + h[7] * y + 1;
      return { x: (h[0] * x + h[1] * y + h[2]) / d, y: (h[3] * x + h[4] * y + h[5]) / d };
    };
  }
  function detector(imageData, points) {
    const { data, width, height } = imageData, map = project(points);
    const sample = (x, y) => {
      const point = map(x, y), ix = Math.floor(point.x), iy = Math.floor(point.y);
      if (ix < 0 || iy < 0 || ix >= width-1 || iy >= height-1) return null;
      const fx = point.x-ix, fy = point.y-iy, k = (iy * width + ix) * 4;
      const channel = c => (data[k+c]*(1-fx)+data[k+4+c]*fx)*(1-fy) +
        (data[k+width*4+c]*(1-fx)+data[k+width*4+4+c]*fx)*fy;
      const r = channel(0), g = channel(1), b = channel(2);
      return { luminance: .2126 * r + .7152 * g + .0722 * b, pink: r > g * 1.5 && r > b * 1.3 };
    };
    return (x, y) => {
      // Estimate paper brightness around each bubble, outside its printed rim.
      // A local threshold follows shadows without counting the shadow as ink.
      const background = [];
      for (let i = 0; i < 24; i++) {
        const angle = i * Math.PI / 12;
        const pixel = sample(x + 16 * Math.cos(angle), y + 16 * Math.sin(angle));
        if (pixel && !pixel.pink) background.push(pixel.luminance);
      }
      if (background.length < 12) return 0;
      background.sort((a, b) => a - b);
      const paper = background[Math.floor(background.length * .75)];
      // Soft local contrast retains faint graphite and defocused strokes.
      // A dead band suppresses paper texture, sensor noise and light shadows.
      const noise = Math.max(8, paper * .035);
      const fullContrast = Math.max(24, paper * .18);
      let dark = 0, samples = 0;
      for (let dy = -5; dy <= 5; dy += 1.5) for (let dx = -5; dx <= 5; dx += 1.5) {
        if (dx * dx + dy * dy > 25) continue;
        const pixel = sample(x + dx, y + dy);
        if (!pixel) continue;
        dark += pixel.pink ? 0 : Math.max(0, Math.min(1, (paper - pixel.luminance - noise) / (fullContrast - noise)));
        samples++;
      }
      return samples >= 24 ? dark / samples : 0;
    };
  }

  function choose(values, labels) {
    const ranked = values.map((value, i) => ({ value, i })).sort((a, b) => b.value - a.value), top = ranked[0], next = ranked[1];
    const marked = top.value > .32 && next.value <= .32 && top.value - next.value > .13;
    return { value: marked ? labels[top.i] : '', flag: marked ? '' : top.value > .24 ? 'Không rõ hoặc tô nhiều' : 'Bỏ trống' };
  }
  function read(dot, profile = 'youngmix') {
    const standard = profile === 'standard';
    if (standard) { const original = dot; dot = (x,y) => original(x * 1229 / 1241,y); }
    const answers = { p1: [], p2: [], p3: [] }, flags = { p1: [], p2: [], p3: [] }, bases = standard ? [173,428.5,684,939.5] : [133,411,689,967];
    for (let q = 0; q < template.limits[0]; q++) {
      const x = bases[Math.floor(q / 10)], y = standard ? 670 + 26.4 * (q % 10) : 644 + 29.5 * (q % 10);
      const result = choose([0, 1, 2, 3].map(j => dot(x + (standard ? 51.1 : 49) * j, y)), ['A', 'B', 'C', 'D']);
      answers.p1.push(result.value); flags.p1.push(result.flag);
    }
    for (let q = 0; q < template.limits[1]; q++) {
      const x = bases[Math.floor(q / 2)] + (q % 2) * (standard ? 102.2 : 98), row = [], rowFlags = [];
      for (let j = 0; j < 4; j++) {
        const y = standard ? 1051 + 26.4 * j : 1060 + 30 * j, result = choose([dot(x, y), dot(x + (standard ? 51.1 : 49), y)], ['Đ', 'S']);
        row.push(result.value); rowFlags.push(result.flag);
      }
      answers.p2.push(row); flags.p2.push(rowFlags);
    }
    for (let q = 0; q < template.limits[2]; q++) {
      const x = standard ? 165 + q * 163.8 : 126 + q * 177.5, digits = [], columnFlags = [];
      const spacing = standard ? 34.4 : 30;
      for (let col = 0; col < 4; col++) {
        const result = choose(Array.from({ length: 10 }, (_, d) => dot(x + spacing * col, standard ? 1340 + 27.15 * d : 1348 + 33 * d)), '0123456789'.split(''));
        digits.push(result.value); columnFlags.push(result.flag);
      }
      const negative = dot(x, standard ? 1286 : 1283) > .32;
      const commaResult = choose([dot(x + spacing, standard ? 1313 : 1317), dot(x + spacing * 2, standard ? 1313 : 1317)], ['1', '2']);
      const comma = commaResult.value ? Number(commaResult.value) : null;
      // Insert the separator before trimming unused physical digit columns.
      let raw = digits.map(value => value || ' ').join('');
      if (comma !== null) raw = raw.slice(0, comma) + ',' + raw.slice(comma);
      const trimmed = raw.trim(), gap = /\s/.test(trimmed);
      let value = trimmed.replace(/\s/g, '');
      if (negative && value) value = '-' + value;
      const validNumber = /^-?(?:\d+(?:,\d+)?|,\d+)$/.test(value);
      const uncertain = columnFlags.some(flag => flag === 'Không rõ hoặc tô nhiều') || gap || !validNumber || commaResult.flag === 'Không rõ hoặc tô nhiều';
      answers.p3.push(value); flags.p3.push(uncertain ? 'Kiểm tra số: có ô không rõ, khoảng trống hoặc dấu phẩy không rõ' : '');
    }
    const digits = (x, columns) => Array.from({ length: columns }, (_, col) => choose(Array.from({ length: 10 }, (_, d) => dot(x + 24 * col, standard ? 195 + 33.9 * d : 200 + 34.5 * d)), '0123456789'.split('')));
    const student = digits(standard ? 835 : 861, 8), exam = digits(standard ? 1062 : 1075, 4);
    const metadata = {
      studentId: student.map(v => v.value).join(''),
      examCode: exam.map(v => v.value).join(''),
      studentUncertain: student.some(v => !v.value),
      examUncertain: exam.some(v => v.flag === 'Không rõ hoặc tô nhiều') || !exam.some(v => v.value) || /\s/.test(exam.map(v => v.value || ' ').join('').trim())
    };
    return { answers, flags, metadata };
  }
  function recognize(imageData, points, profile) { return read(detector(imageData, points), profile); }

  // Find the four square registration marks. Timing marks resolve page rotation.
  function autoAlign(imageData) {
    const { width, height, data } = imageData, step = Math.max(1, Math.ceil(Math.max(width, height) / 1000));
    const w = Math.ceil(width / step), h = Math.ceil(height / step), mask = new Uint8Array(w * h);
    const radius = Math.max(12, Math.min(width, height) * 20 / 1229);
    const light = (x, y) => {
      x = Math.max(0, Math.min(width - 1, Math.round(x)));
      y = Math.max(0, Math.min(height - 1, Math.round(y)));
      const k = (y * width + x) * 4;
      return .2126 * data[k] + .7152 * data[k + 1] + .0722 * data[k + 2];
    };
    const dark = (x, y) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      const k = (y * width + x) * 4, r = data[k], g = data[k + 1], b = data[k + 2];
      const paper = Math.max(light(x - radius, y), light(x + radius, y), light(x, y - radius), light(x, y + radius));
      return .2126 * r + .7152 * g + .0722 * b < Math.min(195, paper - Math.max(30, paper * .2)) && (Math.max(r, g, b) - Math.min(r, g, b) < 90 || Math.max(r, g, b) < 90);
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = dark(x * step, y * step) ? 1 : 0;
    const queue = new Int32Array(w * h), candidates = [];
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start]) continue;
      let head = 0, tail = 1, minX = w, maxX = 0, minY = h, maxY = 0, sumX = 0, sumY = 0;
      queue[0] = start; mask[start] = 0;
      while (head < tail) {
        const index = queue[head++], x = index % w, y = Math.floor(index / w);
        sumX += x; sumY += y;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (const next of [x > 0 ? index - 1 : -1, x < w - 1 ? index + 1 : -1, y > 0 ? index - w : -1, y < h - 1 ? index + w : -1]) {
          if (next >= 0 && mask[next]) { mask[next] = 0; queue[tail++] = next; }
        }
      }
      const cw = maxX - minX + 1, ch = maxY - minY + 1, ratio = cw / ch;
      if (tail >= 9 && ratio > .55 && ratio < 1.8 && tail / (cw * ch) > .42 && cw < w * .08 && ch < h * .08) {
        // Refine each coarse component on the original pixels. Downsampling
        // can shift a small marker by several pixels in a phone preview.
        let sx = 0, sy = 0, pixels = 0;
        for (let yy = Math.max(0,(minY-1)*step); yy <= Math.min(height-1,(maxY+1)*step); yy++)
          for (let xx = Math.max(0,(minX-1)*step); xx <= Math.min(width-1,(maxX+1)*step); xx++)
            if (dark(xx,yy)) { sx += xx; sy += yy; pixels++; }
        candidates.push({ x: pixels ? sx/pixels : sumX*step/tail, y: pixels ? sy/pixels : sumY*step/tail, size: pixels ? Math.sqrt(pixels) : Math.sqrt(tail)*step });
      }
    }
    const groups = [[], [], [], []];
    for (const p of candidates) {
      const left = p.x < width * .45, right = p.x > width * .55, top = p.y < height * .43, bottom = p.y > height * .57;
      const group = top && left ? 0 : top && right ? 1 : bottom && right ? 2 : bottom && left ? 3 : -1;
      if (group >= 0) groups[group].push(p);
    }
    const targets = [[0, 0], [width, 0], [width, height], [0, height]];
    groups.forEach((group, i) => group.sort((a, b) => Math.hypot((a.x - targets[i][0]) / width, (a.y - targets[i][1]) / height) - Math.hypot((b.x - targets[i][0]) / width, (b.y - targets[i][1]) / height)));
    if (groups.some(group => !group.length)) return null;
    const anchors = [[39, 31], [1196, 31], [1196, 1701], [39, 1701]];
    const timing = [[39, 569], [39, 952], [39, 1198], [1196, 131], [1196, 187], [1196, 222], [1196, 256], [1196, 291], [1196, 325], [1196, 359], [1196, 394], [1196, 428], [1196, 463], [1196, 497]];
    const standardAnchors = [[76,76],[1162,76],[1162,1678],[76,1678]].map(([x,y])=>[x*1229/1241,y]);
    const standardTiming = [[811,76],[76,550],[806,550],[1162,550],[1032,348],[1032,519],[364,628],[620,628],[875,628],[364,932],[620,932],[875,932],[364,975],[620,975],[875,975],[364,1155],[620,1155],[875,1155],[292,1178],[455,1178],[783,1178],[947,1178],[292,1638],[455,1638],[620,1638],[783,1638],[947,1638]].map(([x,y])=>[x*1229/1241,y]);
    const layouts = [{profile:'youngmix',anchors,timing},{profile:'standard',anchors:standardAnchors,timing:standardTiming}];
    let best = null;
    for (const a of groups[0].slice(0, 6)) for (const b of groups[1].slice(0, 6)) for (const c of groups[2].slice(0, 6)) for (const d of groups[3].slice(0, 6)) {
      const quad = [a, b, c, d], sizes = quad.map(p => p.size);
      if (Math.max(...sizes) / Math.min(...sizes) > 2.8) continue;
      const area = Math.abs(quad.reduce((sum, p, i) => { const next = quad[(i + 1) % 4]; return sum + p.x * next.y - next.x * p.y; }, 0)) / 2;
      if (area < width * height * .12) continue;
      for (let rotation = 0; rotation < 4; rotation++) {
        const rotated = quad.map((_, i) => quad[(i + rotation) % 4]);
        try {
          for (const layout of layouts) {
          const map = project(rotated, layout.anchors);
          // Phone frames have blurred timing marks and subpixel projection errors.
          // Search only within the inner quarter of a registration square.
          const tolerance = Math.max(1, Math.min(...sizes) * .22);
          const hits = layout.timing.reduce((sum, [x, y]) => {
            const p = map(x, y);
            const hit = [-1,0,1].some(dx => [-1,0,1].some(dy => dark(p.x + dx*tolerance, p.y + dy*tolerance)));
            return sum + Number(hit);
          }, 0);
          const score = hits / layout.timing.length + area / (width * height) * .02;
          if (hits >= 8 && hits / layout.timing.length >= .6 && (!best || score > best.score)) best = { score, profile:layout.profile, markers:rotated.map(p=>({x:p.x,y:p.y,size:p.size})), points: [[0, 0], [1229, 0], [1229, 1754], [0, 1754]].map(([x, y]) => map(x, y)), rotation };
          }
        } catch (_) { /* Try another quadrilateral. */ }
      }
    }
    return best;
  }
  function rectify(imageData, points, outputWidth = 1229) {
    const width = outputWidth, height = Math.round(outputWidth * template.height / template.width), output = new Uint8ClampedArray(width * height * 4), map = project(points);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const point = map(x * template.width / width, y * template.height / height), sx = Math.round(point.x), sy = Math.round(point.y), k = (y * width + x) * 4;
      if (sx < 0 || sy < 0 || sx >= imageData.width || sy >= imageData.height) output[k] = output[k + 1] = output[k + 2] = 255;
      else { const source = (sy * imageData.width + sx) * 4; output[k] = imageData.data[source]; output[k + 1] = imageData.data[source + 1]; output[k + 2] = imageData.data[source + 2]; }
      output[k + 3] = 255;
    }
    return { data: output, width, height };
  }
  function choicePosition(part, index, sub, value, profile) {
    if (profile === 'standard') {
      let x,y;
      const bases = [173,428.5,684,939.5];
      if (part === 'p1') { x=bases[Math.floor(index/10)]+51.1*'ABCD'.indexOf(value); y=670+26.4*(index%10); }
      else if (part === 'p2') { x=bases[Math.floor(index/2)]+(index%2)*102.2+(value==='S'?51.1:0); y=1051+26.4*sub; }
      else { x=165+index*163.8; y=1235; }
      return {x:x*1229/1241,y};
    }
    const bases = [133, 411, 689, 967];
    if (part === 'p1') return { x: bases[Math.floor(index / 10)] + 49 * 'ABCD'.indexOf(value), y: 644 + 29.5 * (index % 10) };
    if (part === 'p2') return { x: bases[Math.floor(index / 2)] + (index % 2) * 98 + (value === 'S' ? 49 : 0), y: 1060 + 30 * sub };
    return { x: 126 + index * 177.5, y: 1252 };
  }
  return { template, project, detector, choose, read, recognize, autoAlign, rectify, choicePosition };
});
