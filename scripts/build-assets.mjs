import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..');
const names=['minimal','low','medium','high','xhigh','max','auto','off'];
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const oldManifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
const art={},manifest={};
fs.mkdirSync(path.join(root,'assets/png-672'),{recursive:true});
for(const name of names){
 const source=fs.readFileSync(path.join(root,'assets/master-1024',name+'.png'));
 const metadata=await sharp(source).metadata();
 if(metadata.width!==1024||metadata.height!==1024||!metadata.hasAlpha)throw Error('Expected 1024 square RGBA master: '+name);
 const png=await sharp(source).resize(672,672,{kernel:'lanczos3'}).ensureAlpha().png({palette:false}).toBuffer();
 fs.writeFileSync(path.join(root,'assets/png-672',name+'.png'),png);
 art[name]='data:image/png;base64,'+png.toString('base64');
 manifest[name]={width:672,height:672,displayHeight:224,format:'RGBA PNG',sha256:hash(png),sourceWidth:1024,sourceHeight:1024,sourceSha256:hash(source)};
 if(oldManifest[name]?.sourceOrigin)manifest[name].sourceOrigin=oldManifest[name].sourceOrigin;
}
const file=path.join(root,'lib/client.js'),source=fs.readFileSync(file,'utf8');
const marker=/^    var WHALE_ART = .*; \/\/ WHALE_ART_EMBEDDED$/m;
if(!marker.test(source))throw Error('Missing art embedding marker');
fs.writeFileSync(file,source.replace(marker,'    var WHALE_ART = '+JSON.stringify(art)+'; // WHALE_ART_EMBEDDED'));
fs.writeFileSync(path.join(root,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built eight 672px RGBA exports and embedded their data URLs.');
