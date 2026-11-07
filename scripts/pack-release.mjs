import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {audit} from './check-public.mjs';
import {verifyPackage} from './verify-package.mjs';
const root=path.resolve(import.meta.dirname,'..');
audit();
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run this script with npm run pack:release');
const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
const result=spawnSync(process.execPath,[npm,'pack','--pack-destination',dist,'--ignore-scripts','--offline','--json'],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
if(result.status!==0){process.stderr.write(result.stderr||result.stdout);process.exit(result.status||1);}
const files=JSON.parse(result.stdout);if(files.length!==1)throw Error('Expected one package');
const report=verifyPackage(path.join(dist,files[0].filename));
fs.writeFileSync(path.join(dist,'SHA256SUMS'),report.sha256+'  '+files[0].filename+'\n');
console.log('Local package ready in dist/. Nothing was uploaded.');
