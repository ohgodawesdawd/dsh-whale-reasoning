import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
export function verifyPackage(archive){
 const packed=fs.readFileSync(archive),tar=zlib.gunzipSync(packed),members=new Map();
 const text=(b,a,z)=>b.toString('utf8',a,z).replace(/\0.*$/s,'');
 for(let offset=0;offset+512<=tar.length;){
  const header=tar.subarray(offset,offset+512),name=text(header,0,100);if(!name)break;
  const size=parseInt(text(header,124,136).trim(),8)||0,type=text(header,156,157);
  assert.ok(name.startsWith('package/')&&!name.includes('..'),'Unsafe archive entry');
  if(type==='0'||type==='')members.set(name,tar.subarray(offset+512,offset+512+size));
  offset+=512+Math.ceil(size/512)*512;
 }
 const expected=['LICENSE','lib/client.js','lib/index.js','lib/policy.js','asset-manifest.json','package.json','NOTICE.md','README.md','cordis.patch.yml','docs/INSTALL.md','docs/ARTWORK.md','docs/images/preview-max.png','docs/images/preview-xhigh.png'];
 assert.deepEqual([...members.keys()].sort(),expected.map(x=>'package/'+x).sort());
 for(const file of expected)assert.equal(hash(members.get('package/'+file)),hash(fs.readFileSync(path.join(root,file))),file+' differs from source');
 const sourcePackage=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(JSON.parse(members.get('package/package.json')).version,sourcePackage.version);
 let api;const window={__ModuleLoader__:{load(entry){api=entry.factory(()=>({createElement(){}}));}}};
 vm.runInNewContext(members.get('package/lib/client.js').toString('utf8'),{window,console,setTimeout,clearTimeout});
 const manifest=JSON.parse(members.get('package/asset-manifest.json'));
 for(const [name,entry]of Object.entries(manifest))assert.equal(hash(Buffer.from(api.__testing.art[name].split(',')[1],'base64')),entry.sha256);
 const report={pass:true,archive:path.basename(archive),version:sourcePackage.version,bytes:packed.length,sha256:hash(packed),files:members.size,embeddedArtMatchesManifest:true};
 console.log(JSON.stringify(report));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 verifyPackage(process.argv[2]||path.join(root,'dist',pkg.name+'-'+pkg.version+'.tgz'));
}
