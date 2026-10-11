// Small PNG reader for the checked-in, 8-bit RGB/RGBA reference sheets.
const fs = require('node:fs'), zlib = require('node:zlib');
module.exports = function readPng(path) {
  const bytes=fs.readFileSync(path), chunks=[];let width,height,channels;
  for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8),body=bytes.subarray(p+8,p+8+n);if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);if(body[8]!==8||![2,6].includes(body[9])||body[12]!==0)throw Error('Unsupported PNG fixture');channels=body[9]===6?4:3;}if(type==='IDAT')chunks.push(body);p+=n+12;}
  const packed=zlib.inflateSync(Buffer.concat(chunks)), stride=width*channels, decoded=new Uint8Array(stride*height);let at=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=packed[at++];for(let x=0;x<stride;x++){const k=y*stride+x,a=x>=channels?decoded[k-channels]:0,b=y?decoded[k-stride]:0,c=y&&x>=channels?decoded[k-stride-channels]:0;const correction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];if(correction===undefined)throw Error('Unknown PNG filter');decoded[k]=(packed[at++]+correction)&255;}}
  const data=new Uint8ClampedArray(width*height*4);for(let p=0,k=0;p<decoded.length;p+=channels,k+=4){data[k]=decoded[p];data[k+1]=decoded[p+1];data[k+2]=decoded[p+2];data[k+3]=255;}
  return {width,height,data};
};
