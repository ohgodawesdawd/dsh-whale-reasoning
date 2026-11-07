import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {apply} from '../lib/index.js';

function host(t, {enabled=false, efforts=['low','high','max'], events=[], llm=true}={}){
  const tempRoot=fs.realpathSync(os.tmpdir());
  const dir=fs.mkdtempSync(path.join(tempRoot,'dsh-whale-test-'));
  fs.mkdirSync(path.join(dir,'.whale-reasoning'));
  fs.writeFileSync(path.join(dir,'.whale-reasoning/state.json'),JSON.stringify({version:1,global:{enabled,min:'high',max:'max'},routes:{routine:null,deep:null},sessions:{}}));
  let hook;
  const services={profileContext:{dir},llm:llm?{async listModels(){return [{id:'fixture-model',reasoning:{efforts:efforts.map(id=>({id}))}}];}}:undefined};
  apply({get:n=>services[n],logger:()=>({info(){},warn(){}}),on(_name,fn){hook=fn;},inject(){}});
  t.after(async()=>{
    await new Promise(resolve=>setTimeout(resolve,450));
    const resolved=fs.realpathSync(dir);
    assert.equal(path.dirname(resolved),tempRoot,'Cleanup must stay inside the test temp root');
    assert.ok(path.basename(resolved).startsWith('dsh-whale-test-'),'Cleanup target must be test-owned');
    fs.rmSync(resolved,{recursive:true,force:true});
  });
  return {dir,hook,agent:{sessionId:'fixture-session',session:{id:'fixture-session',eventsSnapshot:events}}};
}
test('disabled Auto is exact pass-through and never reads user event snapshots',async t=>{
  const {hook,agent}=host(t);
  let reads=0;
  Object.defineProperty(agent.session,'eventsSnapshot',{get(){reads++;throw new Error('Message content must not be inspected while disabled');}});
  const seed={provider:'fixture',model:'fixture-model',reasoningEffort:'low'};
  assert.equal(await hook({agent},async()=>seed),seed);
  assert.equal(reads,0);
});
test('one tool error cannot inject undeclared xhigh into a low/high/max model',async t=>{
  const {hook,agent}=host(t,{enabled:true,events:[{kind:'tool',data:{ok:false}}]});
  const result=await hook({agent},async()=>({provider:'fixture',model:'fixture-model',reasoningEffort:'high'}));
  assert.ok(['low','high','max'].includes(result.reasoningEffort),result.reasoningEffort);
});
test('unknown current-model capability leaves request untouched',async t=>{
  const {hook,agent}=host(t,{enabled:true,llm:false,events:[{kind:'tool',data:{ok:false}}]});
  const seed={provider:'fixture',model:'fixture-model',reasoningEffort:'low'};
  assert.equal(await hook({agent},async()=>seed),seed);
});
test('six-tier model still permits xhigh escalation within advertised band',async t=>{
  const {hook,agent}=host(t,{enabled:true,efforts:['minimal','low','medium','high','xhigh','max'],events:[{kind:'tool',data:{ok:false}}]});
  const result=await hook({agent},async()=>({provider:'fixture',model:'fixture-model',reasoningEffort:'high'}));
  assert.equal(result.reasoningEffort,'xhigh');
});
