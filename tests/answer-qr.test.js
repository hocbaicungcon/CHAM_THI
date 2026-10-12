const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Q=require('../js/answer-qr'),I=require('../js/inputs'),X=require('../vendor/xlsx/xlsx.full.min'),decode=require('../vendor/jsqr/jsQR');
function pixels(qr){const n=qr.getModuleCount(),cell=6,width=(n+8)*cell,data=new Uint8ClampedArray(width*width*4).fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))for(let dy=0;dy<cell;dy++)for(let dx=0;dx<cell;dx++){const k=(((y+4)*cell+dy)*width+(x+4)*cell+dx)*4;data[k]=data[k+1]=data[k+2]=0;}return {data,width,height:width};}
test('QR generation and decoding preserve all YoungMix codes and split a large bank',()=>{
 const bank=I.workbookExams(X.read(fs.readFileSync(require('node:path').join(__dirname,'../template/BGD-2025-YoungMix.xlsx')),{type:'buffer'}),X),groups=Q.groups(bank),restored=[];
 assert.ok(groups.length>1);
 for(const group of groups){const image=pixels(Q.matrix(group.payload)),result=decode(image.data,image.width,image.height,{inversionAttempts:'dontInvert'});assert.equal(result?.data,group.payload);restored.push(...I.parseQrPayload(result.data));}
 assert.deepEqual(restored.sort((a,b)=>a.code.localeCompare(b.code)),bank.slice().sort((a,b)=>a.code.localeCompare(b.code)));
});
test('QR payload preserves multiple accepted choices, ignored keys and decimal commas',()=>{
 const bank=[{code:'0101',keys:{p1:['AB','ABC','O','X'],p2:[['Đ','S','O','X']],p3:['-1,25','O','X']}}];
 assert.deepEqual(I.parseQrPayload(Q.payload(bank)),bank);assert.match(Q.payload(bank),/AB_ABC_O_X/);
 assert.throws(()=>Q.groups([]));assert.throws(()=>Q.payload([{code:'invalid',keys:bank[0].keys}]));assert.throws(()=>Q.payload([...bank,...bank]));
});
