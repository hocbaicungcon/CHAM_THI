// Usage: node scripts/benchmark-omr.cjs /path/to/rendered-page.png [...]
// PNG decoding and PDF rendering are excluded; timings include full alignment
// and recognition, not camera confirmation, preview, persistence or UI drawing.
const OMR = require('../js/omr'), readPng = require('../tests/png-fixture');
const files = process.argv.slice(2);
if (!files.length) throw Error('Provide RGB/RGBA PNG sheet paths');
const rows = files.map(file => {
  const image = readPng(file), start = performance.now(), aligned = OMR.autoAlign(image);
  const found = performance.now();
  if (!aligned) throw Error(`No sheet found: ${file}`);
  OMR.recognize(image, aligned.points, aligned.profile);
  return { file, alignmentMs: +(found-start).toFixed(1), recognitionMs: +(performance.now()-found).toFixed(1) };
});
const times=rows.map(r=>r.alignmentMs+r.recognitionMs).sort((a,b)=>a-b);
console.log(JSON.stringify({rows,medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1],maxMs:times.at(-1)},null,2));
