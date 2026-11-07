import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
const names=['minimal','low','medium','high','xhigh','max','auto','off'];
const fixed=[
 '.gitignore','.gitattributes','.github/workflows/ci.yml','package.json','package-lock.json',
 'README.md','LICENSE','NOTICE.md','CHANGELOG.md','CONTRIBUTING.md','SECURITY.md','asset-manifest.json',
 'lib/client.js','lib/index.js','lib/policy.js','cordis.patch.yml',
 'scripts/build-assets.mjs','scripts/check-public.mjs','scripts/pack-release.mjs','scripts/verify-package.mjs',
 'test/client.test.mjs','test/host.test.mjs','test/browser.mjs','test/fixture.html',
 'docs/INSTALL.md','docs/DEVELOPMENT.md','docs/ARTWORK.md','docs/PUBLISHING.md',
 'docs/images/preview-max.png','docs/images/preview-xhigh.png'
];
const allowed=new Set([...fixed,...names.flatMap(name=>['assets/master-1024/'+name+'.png','assets/png-672/'+name+'.png'])]);
const excluded=new Set(['.git','node_modules','.npm-cache','dist','test-results','playwright-report','coverage']);
export function publicFiles(){
 const files=[];
 function walk(relative=''){
  for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
   const file=(relative?relative+'/':'')+entry.name;
   if(!relative&&excluded.has(entry.name))continue;
   assert.ok(!entry.isSymbolicLink(),'Symlink must not enter the public bundle: '+file);
   if(entry.isDirectory())walk(file);else if(entry.isFile())files.push(file);
  }
 }
 walk();
 for(const file of files)assert.ok(allowed.has(file)||/^releases\/(?:dsh-whale-reasoning-\d+\.\d+\.\d+\.tgz|SHA256SUMS)$/.test(file),'Unexpected public file: '+file);
 for(const file of allowed)assert.ok(files.includes(file),'Missing public file: '+file);
 return files.sort();
}
export function audit(){
 const files=publicFiles();
 const forbidden=[/\b[a-z]:[\\/](?:Users|Program Files|node\.js|dsh)[\\/]/i,/\/Users\/[^/\s]+\//,/\/home\/[^/\s]+\//,/(?:ghp|github_pat)_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/];
 for(const file of files){
  if(/\.(png|tgz)$/.test(file))continue;
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for(const pattern of forbidden)assert.ok(!pattern.test(text),'Private path or secret-shaped content in '+file);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
 let api;const window={__ModuleLoader__:{load(entry){api=entry.factory(()=>({createElement(){}}));}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'lib/client.js'),'utf8'),{window,console,setTimeout,clearTimeout});
 const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
 assert.equal(Object.keys(manifest).length,8);
 for(const name of names){
  const entry=manifest[name],master=fs.readFileSync(path.join(root,'assets/master-1024',name+'.png')),png=fs.readFileSync(path.join(root,'assets/png-672',name+'.png'));
  assert.equal(hash(master),entry.sourceSha256);assert.equal(hash(png),entry.sha256);
  assert.equal(master.readUInt32BE(16),1024);assert.equal(master.readUInt32BE(20),1024);assert.equal(master[25],6);
  assert.equal(png.readUInt32BE(16),672);assert.equal(png.readUInt32BE(20),672);assert.equal(png[25],6);
  assert.equal(hash(Buffer.from(api.__testing.art[name].split(',')[1],'base64')),entry.sha256);
 }
 const report={pass:true,files:files.length,artworkStates:names.length,embeddedArtVerified:true};
 console.log(JSON.stringify(report));return {files,report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))audit();
