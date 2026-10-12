const fs=require('node:fs'),path=require('node:path');
const assets=['./','index.html'];
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)\?v=\d+)"/g))assets.push(match[1]);
function walk(directory){
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const name=path.posix.join(directory,entry.name);
  if(entry.isDirectory())walk(name);
  else if(/\.(?:js|mjs|bcmap|pfb|ttf|wasm)$/.test(name))assets.push(name);
 }
}
walk('vendor');assets.push('template/PHIEU_CHAM_TN.png','template/PHIEU_TLTN_CHUAN.png','logo.svg');
fs.writeFileSync('offline-assets.json',JSON.stringify([...new Set(assets)].sort()));
