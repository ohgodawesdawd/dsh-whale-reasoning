import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const reactRoot=path.dirname(require.resolve('react/package.json'));
const reactDomRoot=path.dirname(require.resolve('react-dom/package.json'));
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
const files={
 '/':path.join(root,'test/fixture.html'),
 '/react.js':path.join(reactRoot,'umd/react.development.js'),
 '/react-dom.js':path.join(reactDomRoot,'umd/react-dom.development.js'),
 '/plugin.js':path.join(root,'lib/client.js')
};
let band={enabled:false,min:'high',max:'max'};
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/whale-reasoning/state') {res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,global:band,band,last:null,routes:{routine:null,deep:null}}));return;}
 if(route==='/whale-reasoning/band') {let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{band={...band,...JSON.parse(data||'{}')};res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,global:band,band}));});return;}
 if(!files[route]){res.writeHead(404).end();return;}
 res.setHeader('content-type',route==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(fs.readFileSync(files[route]));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),headless:true,args:['--no-first-run','--disable-background-networking','--disable-extensions']});
const page=await browser.newPage({viewport:{width:900,height:640},deviceScaleFactor:2});
const errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
const waitArt=key=>page.waitForFunction(key=>document.querySelector('.dwr-portrait')?.dataset.state===key,key);
const waitSelected=key=>page.waitForFunction(key=>window.fixture.snapshot().current.reasoningEffort===key,key);
const waitFx=tier=>page.waitForFunction(tier=>{
 const root=document.querySelector('.dwr'),canvas=document.querySelector('.dwr-fx');
 if(root?.dataset.fx!==tier || !canvas) return false;
 if(!canvas.width || !canvas.height) return tier==='off';
 const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let painted=false;for(let i=3;i<data.length;i+=4){if(data[i]){painted=true;break;}}
 return tier==='off'?!painted:painted;
},tier,{timeout:2000});
async function ensureOpen(){if(!(await page.locator('.dwr-popover').isVisible()))await page.locator('.dwr-trigger').click();await page.waitForFunction(()=>document.querySelector('.dwr-trigger')?.getAttribute('aria-expanded')==='true');await page.waitForTimeout(60);}
async function model(ids,selected='high',name='fixture-model'){await page.evaluate(({ids,selected,name})=>{fixture.setMode('ok');fixture.setModel(ids,selected,name);},{ids,selected,name});await page.waitForTimeout(70);await ensureOpen();}
async function check(name,run){await run();results.push({name,pass:true});console.log('PASS '+name);}
try {
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
 await check('closed state shows only effort and chevron, no visible portrait or rail',async()=>{
  await page.waitForFunction(()=>document.querySelector('.dwr-trigger')?.disabled===false);
  assert.match(await page.locator('.dwr-trigger').textContent(),/high/);
  assert.equal(await page.locator('.dwr-popover').isVisible(),false);
  assert.equal(await page.locator('.dwr-portrait').isVisible(),false);
  await page.screenshot({path:path.join(root,'test-results/ui-collapsed.png')});
 });
 await check('three declared ticks and fixed left 224px HD portrait',async()=>{
  await ensureOpen();
  await waitArt('high');assert.equal(await page.locator('.dwr-tick').count(),3);
  assert.equal(await page.locator('.dwr-portrait-layer').count(),2);
  const portrait=await page.locator('.dwr-portrait').boundingBox(),track=await page.locator('[role=slider]').boundingBox();
  assert.ok(Math.abs(portrait.height-224)<0.01,'Portrait must be 224 CSS px');assert.ok(portrait.x+portrait.width<track.x);
  assert.equal(await page.locator('.dwr-portrait-layer').first().evaluate(x=>x.naturalHeight),672);
  assert.equal(Math.round((await page.locator('.dwr-popover').boundingBox()).width),500);
 });
 await check('native top layer escapes ancestor overflow and contain',async()=>{
  await page.evaluate(()=>{const element=document.querySelector('.composer');element.style.overflow='hidden';element.style.contain='paint';});
  assert.ok(await page.locator('.dwr-popover').evaluate(x=>x.matches(':popover-open')));
  assert.ok(await page.locator('.dwr-popover').evaluate(x=>{const r=x.getBoundingClientRect();return x.contains(document.elementFromPoint(r.left+25,r.top+90));}));
 });
 await check('outside click and Escape close, keyboard reopens',async()=>{
  await page.mouse.click(15,15);await page.waitForFunction(()=>document.querySelector('.dwr-trigger').getAttribute('aria-expanded')==='false');
  assert.equal(await page.locator('[role=slider]').isVisible(),false);
  await page.locator('.dwr-trigger').focus();await page.keyboard.press('Enter');await ensureOpen();
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.dwr-trigger').getAttribute('aria-expanded')==='false');
  assert.equal(await page.locator('.dwr-popover').isVisible(),false);await ensureOpen();
 });
 await check('keyboard commit swaps exact artwork without moving portrait',async()=>{
  const before=await page.locator('.dwr-portrait').boundingBox();
  await page.locator('[role=slider]').focus();await page.keyboard.press('Home');await waitSelected('low');await waitArt('low');await page.waitForTimeout(260);
  assert.equal((await page.locator('.dwr-portrait').boundingBox()).x,before.x);
  const visible=await page.locator('.dwr-portrait-layer').evaluateAll(images=>images.filter(x=>getComputedStyle(x).opacity==='1').map(x=>x.dataset.art));
  assert.deepEqual(visible,['low']);
 });
 await check('six-tier model is adaptive',async()=>{
  await model(['max','medium','low','minimal','xhigh','high'],'high','six');assert.equal(await page.locator('.dwr-tick').count(),6);
  await page.locator('[role=slider]').focus();await page.keyboard.press('Home');await waitSelected('minimal');await waitArt('minimal');
 });
 await check('future advertised level remains selectable with medium picture fallback',async()=>{
  await model(['max','future-tier','high'],'high','future');await page.locator('[role=slider]').focus();await page.keyboard.press('End');
  await waitSelected('future-tier');await waitArt('medium');assert.match(await page.locator('.dwr-label').textContent(),/future-tier/);
 });
 await check('off and native auto only appear when advertised',async()=>{
  await model(['off','high','auto'],'high','native-auto');assert.equal(await page.locator('.dwr-tick').count(),3);
  await page.locator('[role=slider]').dblclick();await waitSelected('auto');await waitArt('auto');
  await page.locator('[role=slider]').focus();await page.keyboard.press('Home');await waitSelected('off');await waitArt('off');
 });
 await check('single and absent efforts show disabled state rather than guessed slider',async()=>{
  await model(['high'],'high','single');assert.equal(await page.locator('[role=slider]').count(),0);assert.equal(await page.locator('.dwr-portrait').count(),1);
  await model([],undefined,'none');assert.equal(await page.locator('[role=slider]').count(),0);
 });
 await check('drag previews picture before release and commits once',async()=>{
  await model(['low','high','max'],'low','drag');
  const slot=await page.locator('.dwr-slot').boundingBox();const y=slot.y+slot.height/2;
  const before=await page.evaluate(()=>fixture.calls.length);
  await page.mouse.move(slot.x+1,y);await page.mouse.down();await page.mouse.move(slot.x+slot.width/2,y,{steps:4});await waitArt('high');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.mouse.up();await waitSelected('high');assert.equal(await page.evaluate(()=>fixture.calls.length),before+1);
 });
 await check('pointer cancellation does not submit',async()=>{
  const slot=await page.locator('.dwr-slot').boundingBox();const before=await page.evaluate(()=>fixture.calls.length);
  await page.locator('[role=slider]').dispatchEvent('pointerdown',{pointerId:99,isPrimary:true,button:0,clientX:slot.x+slot.width,clientY:slot.y+10});
  await page.locator('[role=slider]').dispatchEvent('pointercancel',{pointerId:99,isPrimary:true});
  await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>fixture.calls.length),before);await waitArt('high');
 });
 await check('held drag enters and leaves Max FX immediately without committing',async()=>{
  await model(['low','high','max'],'low','live-fx-low');
  const slot=await page.locator('.dwr-slot').boundingBox(),y=slot.y+slot.height/2;
  const before=await page.evaluate(()=>fixture.calls.length);
  await page.mouse.move(slot.x+1,y);await page.mouse.down();
  await page.mouse.move(slot.x+slot.width-1,y,{steps:3});await waitArt('max');await waitFx('max');
  assert.equal(await page.locator('.dwr').getAttribute('data-top'),'true');
  assert.equal(await page.evaluate(()=>fixture.snapshot().current.reasoningEffort),'low');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.mouse.move(slot.x+slot.width/2,y,{steps:3});await waitArt('high');await waitFx('off');
  assert.equal(await page.locator('.dwr').getAttribute('data-top'),'false');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.mouse.move(slot.x+slot.width-1,y,{steps:3});await waitFx('max');
  await page.mouse.up();await waitSelected('max');assert.equal(await page.evaluate(()=>fixture.calls.length),before+1);
 });
 await check('held drag from committed Max clears FX and returns through xhigh before release',async()=>{
  await model(['low','high','xhigh','max'],'max','live-fx-max');await waitFx('max');
  const slot=await page.locator('.dwr-slot').boundingBox(),y=slot.y+slot.height/2;
  const before=await page.evaluate(()=>fixture.calls.length);
  await page.mouse.move(slot.x+slot.width-1,y);await page.mouse.down();
  await page.mouse.move(slot.x+slot.width/3,y,{steps:3});await waitArt('high');await waitFx('off');
  assert.equal(await page.locator('.dwr').getAttribute('data-top'),'false');
  await page.mouse.move(slot.x+slot.width*2/3,y,{steps:3});await waitArt('xhigh');await waitFx('xhigh');
  await page.mouse.move(slot.x+slot.width-1,y,{steps:3});await waitArt('max');await waitFx('max');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  assert.equal(await page.evaluate(()=>fixture.snapshot().current.reasoningEffort),'max');
  await page.mouse.move(slot.x+slot.width/3,y,{steps:3});await waitFx('off');
  await page.mouse.up();await waitSelected('high');assert.equal(await page.evaluate(()=>fixture.calls.length),before+1);
 });
 await check('canceling drag restores committed Max FX without submitting',async()=>{
  await model(['low','high','max'],'max','cancel-fx');await waitFx('max');
  const slider=page.locator('[role=slider]'),slot=await page.locator('.dwr-slot').boundingBox();
  const before=await page.evaluate(()=>fixture.calls.length);
  await slider.dispatchEvent('pointerdown',{pointerId:199,isPrimary:true,button:0,clientX:slot.x+1,clientY:slot.y+10});
  await waitArt('low');await waitFx('off');
  await slider.dispatchEvent('pointercancel',{pointerId:199,isPrimary:true});
  await waitArt('max');await waitFx('max');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  assert.equal(await page.evaluate(()=>fixture.snapshot().current.reasoningEffort),'max');
 });
 await check('native Auto styling does not conceal held Max preview FX',async()=>{
  await model(['high','max','auto'],'auto','native-auto-fx');await waitFx('off');
  const slot=await page.locator('.dwr-slot').boundingBox(),y=slot.y+slot.height/2;
  const before=await page.evaluate(()=>fixture.calls.length);
  await page.mouse.move(slot.x+slot.width-1,y);await page.mouse.down();
  await page.mouse.move(slot.x+slot.width/2,y,{steps:3});await waitArt('max');await waitFx('max');
  assert.equal(await page.locator('.dwr').getAttribute('data-auto'),'false');
  assert.equal(await page.locator('.dwr-fx').evaluate(x=>getComputedStyle(x).opacity),'1');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.mouse.up();await waitSelected('max');assert.equal(await page.evaluate(()=>fixture.calls.length),before+1);
 });
 await check('reduced-motion drag updates static FX and clears canvas before release',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await model(['low','high','max'],'high','reduced-fx');
  const slot=await page.locator('.dwr-slot').boundingBox(),y=slot.y+slot.height/2;
  const before=await page.evaluate(()=>fixture.calls.length);
  await page.mouse.move(slot.x+slot.width/2,y);await page.mouse.down();
  await page.mouse.move(slot.x+slot.width-1,y,{steps:3});await waitFx('max');
  await page.mouse.move(slot.x+1,y,{steps:3});await waitFx('off');
  assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.mouse.up();await waitSelected('low');assert.equal(await page.evaluate(()=>fixture.calls.length),before+1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await model(['low','high','max'],'high','after-live-fx');
 });
 await check('synchronous rejection is visible and rolls back',async()=>{
  await page.evaluate(()=>fixture.setMode('sync-reject'));await page.locator('[role=slider]').focus();await page.keyboard.press('End');
  await page.waitForFunction(()=>document.querySelector('.dwr')?.dataset.error==='true');
  await waitSelected('high');await waitArt('high');assert.match(await page.locator('.dwr-error').textContent(),/测试拒绝/);
 });
 await check('obsolete response after model change is ignored',async()=>{
  await model(['low','high','max'],'high','old-request');await page.evaluate(()=>fixture.setMode('slow-reject'));
  await page.locator('[role=slider]').focus();await page.keyboard.press('End');await model(['low','high','max'],'low','new-context');
  await page.waitForTimeout(450);await waitArt('low');assert.equal(await page.locator('.dwr').getAttribute('data-error'),'false');
 });
 await check('rapid external changes settle on the latest frame',async()=>{
  await model(['minimal','low','medium','high','xhigh','max'],'high','rapid');
  for(const id of ['low','high','minimal','medium','max'])await page.evaluate(id=>fixture.setEffort(id),id);
  await waitArt('max');await page.waitForTimeout(280);
  const visible=await page.locator('.dwr-portrait-layer').evaluateAll(images=>images.filter(x=>getComputedStyle(x).opacity==='1').map(x=>x.dataset.art));assert.deepEqual(visible,['max']);
 });
 await check('reduced motion uses immediate opacity change',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>fixture.setEffort('minimal'));await waitArt('minimal');
  assert.equal(await page.locator('.dwr-portrait-layer').first().evaluate(x=>getComputedStyle(x).transitionDuration),'0s');
 });
 await check('closed max state stops canvas rAF while retaining current label',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>fixture.setEffort('max'));await waitArt('max');await page.waitForTimeout(280);
  await page.locator('.dwr-close').click();await page.waitForTimeout(100);
  const before=await page.evaluate(()=>window.__rafScheduled);await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>window.__rafScheduled),before);
  assert.match(await page.locator('.dwr-trigger').textContent(),/max/);await ensureOpen();
 });
 await check('small viewport keeps popup fully inside screen',async()=>{
  await page.setViewportSize({width:340,height:460});await page.waitForTimeout(100);
  const panel=await page.locator('.dwr-popover').boundingBox();assert.ok(panel.x>=11);assert.ok(panel.y>=11);assert.ok(panel.x+panel.width<=329);assert.ok(panel.y+panel.height<=449);
  await page.setViewportSize({width:900,height:640});await page.waitForTimeout(100);
 });
 await check('model seat suppresses stock picker and sits within 8-16px of Send',async()=>{
  assert.equal(await page.locator('.native-model-picker').count(),0);
  const control=await page.locator('.dwr-control').boundingBox(),send=await page.locator('.fixture-send').boundingBox();
  const gap=send.x-(control.x+control.width);assert.ok(gap>=8&&gap<=16,'gap='+gap);
 });
 const catalog=[
  {id:'fixture',name:'DeepSeek',models:[{id:'model-a',name:'DeepSeek Flash',reasoning:{defaultEffort:'high',efforts:[{id:'low'},{id:'high'},{id:'max'}]}},{id:'model-b',name:'DeepSeek Lite',reasoning:{defaultEffort:'low',efforts:[{id:'low'},{id:'high'}]}}]},
  {id:'other/provider',name:'Other Provider',models:[{id:'model/c',name:'Future Reasoner',reasoning:{defaultEffort:'medium',efforts:[{id:'minimal'},{id:'low'},{id:'medium'},{id:'high'},{id:'xhigh'},{id:'max'}]}}]}
 ];
 await check('header model picker uses provider groups and target model default',async()=>{
  await page.evaluate(groups=>{fixture.setMode('ok');fixture.setCatalog(groups,{provider:'fixture',model:'model-a',reasoningEffort:'max'});},catalog);
  await page.waitForTimeout(100);await ensureOpen();assert.equal(await page.locator('.dwr-model-select optgroup').count(),2);
  await page.locator('.dwr-model-select').selectOption(JSON.stringify(['fixture','model-b']));
  await page.waitForFunction(()=>fixture.snapshot().current.model==='model-b');await waitArt('low');assert.equal(await page.locator('.dwr-tick').count(),2);
  assert.equal(await page.evaluate(()=>fixture.calls.at(-1).reasoningEffort),'low');
 });
 await check('cross-provider model id containing slashes stays intact',async()=>{
  await page.locator('.dwr-model-select').selectOption(JSON.stringify(['other/provider','model/c']));
  await page.waitForFunction(()=>fixture.snapshot().current.provider==='other/provider');await waitArt('medium');
  assert.equal(await page.locator('.dwr-tick').count(),6);assert.equal(await page.evaluate(()=>fixture.snapshot().current.model),'model/c');
 });
 await check('rejected model switch keeps previous selection and shows error',async()=>{
  await page.evaluate(()=>fixture.setMode('sync-reject'));
  await page.locator('.dwr-model-select').selectOption(JSON.stringify(['fixture','model-a']));
  await page.waitForFunction(()=>document.querySelector('.dwr-model-error'));
  assert.equal(await page.evaluate(()=>fixture.snapshot().current.model),'model/c');assert.match(await page.locator('.dwr-model-error').textContent(),/测试拒绝/);
  await page.evaluate(()=>fixture.setMode('ok'));
 });
 await check('locked seat disables both effort writes and model selection',async()=>{
  const before=await page.evaluate(()=>fixture.calls.length);await page.evaluate(()=>fixture.setLocked(true));await page.waitForTimeout(80);
  assert.equal(await page.locator('.dwr-model-select').isDisabled(),true);assert.equal(await page.locator('.dwr-trigger').isDisabled(),true);
  await page.locator('[role=slider]').dispatchEvent('keydown',{key:'End'});assert.equal(await page.evaluate(()=>fixture.calls.length),before);
  await page.evaluate(()=>fixture.setLocked(false));
 });
 await check('all submitted ids were advertised by the selected model',async()=>{
  assert.ok(await page.evaluate(()=>fixture.calls.every(call=>call.reasoningEffort===undefined||call.advertised.includes(call.reasoningEffort))));
  assert.deepEqual(errors,[]);
 });
 await page.emulateMedia({reducedMotion:'no-preference'});
 await model(['low','high','max'],'high','DeepSeek');await waitArt('high');await page.waitForTimeout(300);
 assert.equal(await page.locator('.dwr-model-error').count(),0,'Old model errors must clear after an external model change');
 await page.screenshot({path:path.join(root,'test-results/ui-light.png')});
 await page.evaluate(()=>document.documentElement.setAttribute('data-ds-dark-theme',''));
 await model(['minimal','low','medium','high','xhigh','max'],'xhigh','DeepSeek');await waitArt('xhigh');await waitFx('xhigh');await page.waitForTimeout(300);
 await page.locator('.dwr-popover').screenshot({path:path.join(root,'test-results/popup-xhigh-v1.2.1.png')});
 await model(['low','high','max'],'max','DeepSeek');await waitArt('max');await page.waitForTimeout(300);
 await page.screenshot({path:path.join(root,'test-results/ui-dark.png')});
 await page.locator('.dwr-popover').screenshot({path:path.join(root,'test-results/popup-dark-preview.png')});
 await check('addressed subagent has no independent model seat',async()=>{
  await page.evaluate(()=>fixture.setAddressed(true));await page.waitForTimeout(80);assert.equal(await page.locator('.dwr-control').count(),0);
  await page.evaluate(()=>fixture.setAddressed(false));await page.waitForTimeout(80);assert.equal(await page.locator('.dwr-control').count(),1);
 });
 await check('removing the override restores the default model seat',async()=>{
  await page.evaluate(()=>fixture.restoreNative());await page.waitForTimeout(80);assert.equal(await page.locator('.dwr-control').count(),0);assert.equal(await page.locator('.native-model-picker').count(),1);
 });
 fs.writeFileSync(path.join(root,'test-results/browser.json'),JSON.stringify({pass:true,tests:results,errors},null,2)+'\n');
 console.log('Browser checks passed: '+results.length);
} catch(error){
 await page.screenshot({path:path.join(root,'test-results/failure.png')});
 fs.writeFileSync(path.join(root,'test-results/browser.json'),JSON.stringify({pass:false,tests:results,errors,error:error.stack},null,2)+'\n');
 console.error(error);process.exitCode=1;
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
