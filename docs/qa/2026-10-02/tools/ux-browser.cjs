/* Local-only connected browser audit. No browser launch, credentials, or product changes. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.join(process.env.QA_BROWSER_TOOLS || '/private/tmp/obsong-qa-tools', 'package.json'));
const { chromium, firefox, webkit } = req('playwright');
const axePath = req.resolve('axe-core/axe.min.js');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('QA requires a loopback base URL.');
const out = path.resolve('docs/qa/2026-10-02/artifacts');
const report = {started: new Date().toISOString(), base, steps: [], axe: {}, console: [], pageErrors: [], failedRequests: [], blockedExternal: [], metrics: {}, browsers: []};
const safe = s => String(s).replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [REDACTED]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[REDACTED]');
let browser;
async function step(name, run) {
  const started = new Date().toISOString();
  try { const detail = await run(); report.steps.push({name, started, outcome:'pass', detail}); }
  catch (err) { report.steps.push({name, started, outcome:'fail', error:safe(err.message).slice(0,1500)}); }
  fs.writeFileSync(path.join(out, 'ux-browser-report.json'), JSON.stringify(report, null, 2));
}
async function screenshot(page,name) { await page.screenshot({path:path.join(out, 'ux-'+name+'.png'),fullPage:true}); return 'ux-'+name+'.png'; }
async function screenshotEngine(page,name) {return screenshot(page,'studio-'+name);}
async function scan(page,name) {
 await page.evaluate(fs.readFileSync(axePath, 'utf8'));
 report.axe[name]=await page.evaluate(async()=> {
   const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
   return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))})),passes:result.passes.length,incomplete:result.incomplete.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))};
 });
 return report.axe[name].violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));
}
(async()=>{
 try {
  browser=await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT);
  report.browsers.push({requested:'chromium',actual:browser.browserType().name(),version:browser.version()});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.route('**/*', async route=>{
   const url=new URL(route.request().url());
   if(url.origin===new URL(base).origin) return route.continue();
   if(['data:','blob:'].includes(url.protocol))return route.continue();
   report.blockedExternal.push({origin:url.origin,path:url.pathname});
   return route.abort('blockedbyclient');
  });
  const page=await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(30000);
  page.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push({type:m.type(),text:safe(m.text()).slice(0,1000)});});
  page.on('pageerror',e=>report.pageErrors.push(safe(e.message).slice(0,1000)));
  page.on('requestfailed',r=>report.failedRequests.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  page.on('dialog',async d=>{report.steps.push({name:'Native dialog',started:new Date().toISOString(),outcome:'observed',detail:d.message()});await d.dismiss();});
  await step('Home route, desktop screenshot, axe',async()=>{
   await page.goto(base,{waitUntil:'networkidle',timeout:90000});
   await page.getByRole('heading',{name:'Turn Images into Musical Landscapes'}).waitFor();
   report.metrics.home=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(n=>({duration:n.duration,domContentLoaded:n.domContentLoadedEventEnd,transferSize:n.transferSize})),paint:performance.getEntriesByType('paint').map(p=>({name:p.name,startTime:p.startTime})),resources:performance.getEntriesByType('resource').reduce((a,r)=>({count:a.count+1,transferBytes:a.transferBytes+r.transferSize,encodedBytes:a.encodedBytes+r.encodedBodySize}),{count:0,transferBytes:0,encodedBytes:0})}));
   return {screenshot:await screenshot(page,'home-desktop'),axe:await scan(page,'home')};
  });
  await step('Home mobile 375 and 320 layout',async()=>{
   const sizes=[];
   for(const width of [375,320]){await page.setViewportSize({width,height:812});sizes.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('header a')].map(e=>({text:e.textContent,rect:{x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}}))})));await screenshot(page,'home-mobile-'+width);}
   await page.setViewportSize({width:1440,height:1000});return sizes;
  });
  await step('Landing demo keyboard semantics',async()=>{
   await page.getByRole('button',{name:'▶ Try Demo'}).first().click();
   await page.getByRole('dialog').waitFor();
   const initial=await page.evaluate(()=>({active:document.activeElement?.textContent?.trim().slice(0,80),insideDialog:!!document.activeElement?.closest('[role=dialog]')}));
   await screenshot(page,'landing-demo');
   const axe=await scan(page,'landing-demo');
   await page.keyboard.press('Escape');return {initial,axe,closed:await page.getByRole('dialog').count()===0};
  });
  await step('Studio empty state and axe',async()=>{
   await page.goto(base+'/studio',{waitUntil:'networkidle',timeout:90000});
   await page.getByRole('heading',{name:'Studio',exact:true}).waitFor();
   return {generateDisabled:await page.getByRole('button',{name:'Generate Composition'}).isDisabled(),screenshot:await screenshot(page,'studio-empty'),axe:await scan(page,'studio-empty')};
  });
  await step('Selection states are exposed semantically (UX-002 candidate)',async()=>{
   await page.getByRole('button',{name:'D',exact:true}).click();
   const key=await page.getByRole('button',{name:'D',exact:true}).evaluate(el=>({role:el.getAttribute('role'),pressed:el.getAttribute('aria-pressed'),checked:el.getAttribute('aria-checked'),class:el.className}));
   const mode=await page.getByRole('button',{name:/Linear Landscape Maps/}).evaluate(el=>({role:el.getAttribute('role'),pressed:el.getAttribute('aria-pressed'),checked:el.getAttribute('aria-checked')}));
   return {key,mode,ariaSnapshot:await page.getByRole('group',{name:'Key',exact:true}).ariaSnapshot()};
  });
  await step('Synthetic portrait upload, generate, playback and MIDI',async()=>{
   const dataUrl=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1301;c.height=2000;const g=c.getContext('2d');const grad=g.createLinearGradient(0,0,1301,2000);grad.addColorStop(0,'#ffffff');grad.addColorStop(1,'#111111');g.fillStyle=grad;g.fillRect(0,0,1301,2000);return c.toDataURL('image/png');});
   await page.locator('input[type=file]').setInputFiles({name:'qa-portrait-1301x2000.png',mimeType:'image/png',buffer:Buffer.from(dataUrl.split(',')[1],'base64')});
   await page.getByRole('button',{name:'Generate Composition'}).waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Generate Composition'&&!b.disabled),{timeout:30000});
   await page.getByRole('button',{name:'Generate Composition'}).click();
   await page.getByRole('button',{name:'Save to Library'}).waitFor();
   await screenshot(page,'studio-generated');
   const downloadPromise=page.waitForEvent('download',{timeout:20000});
   await page.getByRole('button',{name:'Export as MIDI'}).click();
   const download=await downloadPromise; await download.saveAs(path.join(out,'ux-generated.mid'));
   const buffer=fs.readFileSync(path.join(out,'ux-generated.mid'));
   await page.getByRole('button',{name:'▶ Play',exact:true}).click();
   await page.getByRole('button',{name:'⏹ Stop',exact:true}).waitFor();
   await page.getByRole('button',{name:'⏹ Stop',exact:true}).click();
   return {midiHeader:buffer.subarray(0,4).toString(),midiBytes:buffer.length,axe:await scan(page,'studio-generated')};
  });
  await step('Valid 640x480 image recovery, generation, playback, MIDI and axe',async()=>{
   await screenshot(page,'portrait-analysis-failure');
   const dataUrl=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');const grad=g.createLinearGradient(0,0,640,480);grad.addColorStop(0,'white');grad.addColorStop(1,'black');g.fillStyle=grad;g.fillRect(0,0,640,480);return c.toDataURL('image/png');});
   await page.locator('input[type=file]').setInputFiles({name:'qa-landscape-640x480.png',mimeType:'image/png',buffer:Buffer.from(dataUrl.split(',')[1],'base64')});
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Generate Composition'&&!b.disabled));
   await page.getByRole('button',{name:'Generate Composition'}).click();
   await page.getByRole('button',{name:'Save to Library'}).waitFor();
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'Export as MIDI'}).click();
   const download=await downloadPromise;await download.saveAs(path.join(out,'ux-generated.mid'));
   const midi=fs.readFileSync(path.join(out,'ux-generated.mid'));
   await page.getByRole('button',{name:'▶ Play',exact:true}).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Stop')&&!b.disabled));
   const playing=await page.getByRole('button',{name:'▶ Playing...',exact:true}).count();
   await page.getByRole('button',{name:'⏹ Stop',exact:true}).click();
   return {playing,midiHeader:midi.subarray(0,4).toString(),midiBytes:midi.length,screenshot:await screenshot(page,'studio-generated'),axe:await scan(page,'studio-generated')};
  });
  await step('Studio mobile screenshot and reflow',async()=>{
   await page.setViewportSize({width:375,height:812});
   const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   await screenshot(page,'studio-mobile-375');await page.setViewportSize({width:1440,height:1000});return result;
  });
  await step('Library anonymous state, modal focus trap/restore and axe',async()=>{
   await page.goto(base+'/compositions',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Sign In',exact:true}).click();
   await page.getByRole('dialog').waitFor();
   const initial=await page.evaluate(()=>({active:document.activeElement?.getAttribute('type'),inDialog:!!document.activeElement?.closest('[role=dialog]')}));
   const tabs=[];
   for(let i=0;i<6;i++){await page.keyboard.press('Tab');tabs.push(await page.evaluate(()=>({active:document.activeElement?.textContent?.trim().slice(0,60)||document.activeElement?.getAttribute('type'),inDialog:!!document.activeElement?.closest('[role=dialog]')})));}
   const axe=await scan(page,'login-modal');await screenshot(page,'login-modal');
   await page.keyboard.press('Escape');
   const restored=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.slice(0,70)}));
   return {initial,tabs,restored,axe};
  });
  await step('Corrupt image error and retry recovery',async()=>{
   await page.goto(base+'/studio',{waitUntil:'networkidle'});
   await page.locator('input[type=file]').setInputFiles({name:'qa-corrupt.png',mimeType:'image/png',buffer:Buffer.from('not-an-image')});
   await page.waitForTimeout(750);
   const disabled=await page.getByRole('button',{name:'Generate Composition'}).isDisabled();
   return {disabled,screenshot:await screenshot(page,'corrupt-image')};
  });
  await step('Local route missing page state',async()=>{const r=await page.goto(base+'/does-not-exist',{waitUntil:'networkidle'});return {status:r.status(),screenshot:await screenshot(page,'not-found'),axe:await scan(page,'not-found')};});
  await context.close();await browser.close();browser=null;
  for(const [name,type] of [['firefox',firefox],['webkit',webkit]]) {
   await step(name+' connected smoke availability',async()=>{
    const b=await type.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT,{timeout:10000});
    const actual=b.browserType().name();report.browsers.push({requested:name,actual,version:b.version()});
    const c=await b.newContext({viewport:{width:1280,height:900}});
    await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort('blockedbyclient'));
    const p=await c.newPage();p.setDefaultTimeout(12000);
    await p.goto(base+'/studio',{waitUntil:'networkidle',timeout:30000});
    await p.getByRole('heading',{name:'Studio',exact:true}).waitFor();
    await p.getByRole('button',{name:/Ocean Horizon/}).click();
    await p.getByRole('button',{name:'Play Demo',exact:true}).click();
    await p.getByRole('button',{name:'Save to Library'}).waitFor();
    const screenshot=await screenshotEngine(p,name);
    await c.close();await b.close();
    return {requested:name,actual,note:'Studio scene selection and demo note loading passed',screenshot};
   });
  }
 } catch(err){report.fatal=safe(err.stack).slice(0,2000);process.exitCode=1;}
 finally{if(browser)await browser.close();report.ended=new Date().toISOString();fs.writeFileSync(path.join(out,'ux-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({steps:report.steps,axe:Object.fromEntries(Object.entries(report.axe).map(([k,v])=>[k,v.violations.map(a=>({id:a.id,nodes:a.nodes.length}))])),fatal:report.fatal},null,2));}
})();
