(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamTNAnswerQR=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const Inputs=root.ChamTNInputs||(typeof require==='function'?require('./inputs.js'):null);
  const generator=root.qrcode||(typeof require==='function'?require('../vendor/qrcode-generator/qrcode.js'):null);
  function payload(exams){
    const data=Object.create(null);
    for(const exam of exams){Inputs.validateExam(exam);if(!/^\d{1,4}$/.test(exam.code))throw new Error('Nhập mã đề từ 1 đến 4 chữ số trước khi tạo QR.');if(data[exam.code])throw new Error('Bộ đáp án có mã đề trùng.');
      data[exam.code]=[exam.keys.p1.join('_'),exam.keys.p2.map(row=>row.join('').replace(/Đ/g,'D')).join('_'),exam.keys.p3.join('_')].join('#');
    }
    return JSON.stringify(data);
  }
  function groups(exams,maxBytes=700){
    if(!exams.length)throw new Error('Nhập mã đề và đáp án trước khi tạo QR.');
    const result=[];let group=[];
    for(const exam of exams){const next=[...group,exam];if(group.length&&payload(next).length>maxBytes){result.push({exams:group,payload:payload(group)});group=[exam];}else group=next;}
    if(group.length)result.push({exams:group,payload:payload(group)});
    return result;
  }
  function matrix(value){const qr=generator(0,'H');qr.addData(value,'Byte');try{qr.make();}catch(_){throw new Error('Đáp án quá dài cho một QR. Hãy chia nhỏ bộ mã đề.');}return qr;}
  let logoPromise;
  async function logo(){if(!logoPromise)logoPromise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{logoPromise=null;reject(new Error('Không tải được logo.svg để tạo QR.'));};image.src='logo.svg';});return logoPromise;}
  async function render(value){
    const qr=matrix(value),count=qr.getModuleCount(),cell=Math.max(6,Math.floor(1024/(count+8))),margin=4*cell;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=(count+8)*cell;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
    for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))ctx.fillRect(margin+x*cell,margin+y*cell,cell,cell);
    const original=ctx.getImageData(0,0,canvas.width,canvas.height),image=await logo();
    for(const fraction of [.15,.12,.09]){
      ctx.putImageData(original,0,0);
      const modules=Math.max(3,Math.floor(count*fraction)|1),side=modules*cell,offset=(canvas.width-side)/2,pad=cell;
      ctx.fillStyle='white';ctx.fillRect(offset-pad,offset-pad,side+2*pad,side+2*pad);ctx.drawImage(image,offset,offset,side,side);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),decoded=root.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'});
      if(decoded?.data===value)return canvas;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    throw new Error('QR có logo chưa đọc lại chính xác. Hãy chọn ít mã đề hơn để tạo QR.');
  }
  return {payload,groups,matrix,render};
});
