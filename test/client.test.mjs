import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
function load(){
  let entry, api;
  const window={__ModuleLoader__:{load(v){entry=v;api=v.factory(()=>({createElement(){}}));}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'lib/client.js'),'utf8'),{window,console,setTimeout,clearTimeout});
  return {entry,api,t:api.__testing};
}
test('package, factory and exports identifiers agree',()=>{
  const {entry,api}=load();
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
  assert.equal(entry.id,pkg.name);assert.equal(api.name,pkg.name);
});
test('advertised strings/objects normalize, dedupe and sort without invented levels',()=>{
  const {t}=load();
  const model={reasoning:{efforts:['max',{id:'low',name:'低'},'high','low',{id:'future-tier',name:'未来档'},'off','auto']}};
  const levels=t.effortsOf(model);
  assert.deepEqual(Array.from(levels,x=>x.id),['off','low','high','max','future-tier','auto']);
  assert.equal(levels[1].name,'低');
  assert.deepEqual(Array.from(t.effortsOf({reasoning:{efforts:['low','high','max']}}),x=>x.id),['low','high','max']);
});
test('bad and missing capabilities do not enable guessed levels',()=>{
  const {t}=load();assert.equal(t.effortsOf({}).length,0);
  assert.deepEqual(Array.from(t.effortsOf({reasoning:{efforts:[null,{},'',7,{id:' '} ]}}),x=>x.id),[]);
});
test('every approved HD 672px RGBA asset is embedded; unknown artwork is display-only fallback',()=>{
  const {t}=load();
  for(const name of ['minimal','low','medium','high','xhigh','max','auto','off']){
    assert.equal(t.artKeyFor(name),name);
    const data=Buffer.from(t.art[name].split(',')[1],'base64');
    assert.equal(data.readUInt32BE(16),672);assert.equal(data.readUInt32BE(20),672);assert.equal(data[25],6);
  }
  assert.equal(t.artKeyFor('future-tier'),'medium');
});
test('all embedded artwork matches the shipped manifest and xhigh names the approved correction',()=>{
  const {t}=load();const manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json')));
  for(const [name,entry] of Object.entries(manifest)){
    const data=Buffer.from(t.art[name].split(',')[1],'base64');
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256);
    const master=fs.readFileSync(path.join(root,'assets/master-1024',name+'.png'));
    assert.equal(crypto.createHash('sha256').update(master).digest('hex'),entry.sourceSha256);
  }
  assert.match(manifest.xhigh.sourceOrigin,/short-arm correction/);
});
test('portrait is independent of thumb with real layered opacity transitions',()=>{
  const {t}=load();assert.match(t.css,/dwr-portrait/);assert.match(t.css,/opacity 180ms/);
  assert.match(t.css,/prefers-reduced-motion/);assert.doesNotMatch(t.css,/steps\(8\)/);
  assert.equal(typeof t.WhalePortrait,'function');assert.equal(typeof t.Dial,'function');
});
test('compact control exposes a top-layer popover with 224px portrait styling',()=>{
  const {t}=load();assert.equal(typeof t.WhaleEffortControl,'function');
  assert.match(t.css,/dwr-popover/);assert.match(t.css,/224px/);assert.match(t.css,/dwr-trigger/);
});
test('provider/model choices stay opaque and model switches use the target default',()=>{
  const {t}=load();
  const choices=t.modelChoicesOf([{id:'provider/one',name:'One',models:[{id:'model/two',name:'Second',reasoning:{defaultEffort:'low',efforts:['low','high']}}]}]);
  assert.equal(choices.length,1);assert.equal(choices[0].key,JSON.stringify(['provider/one','model/two']));
  const selection=t.modelSelectionFor(choices[0],{provider:'old',model:'old',reasoningEffort:'max'});
  assert.equal(selection.provider,'provider/one');assert.equal(selection.model,'model/two');assert.equal(selection.reasoningEffort,'low');
});
test('plugin replaces only the official single model seat, not the old right slot',()=>{
  const {api}=load();const registered=[];
  api.apply({slots:{inject(_name,fn){return fn();},register(spec,Component){registered.push({...spec,Component});}},inject(_names,fn){fn({modelDirectories:{},sessions:{}});}});
  const modelSeat=registered.find(x=>x.name==='conversation.input.model');
  assert.ok(modelSeat);assert.equal(modelSeat.priority,-100);assert.equal(registered.some(x=>x.name==='conversation.input.right'),false);
});
