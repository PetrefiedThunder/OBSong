const fs=require('node:fs'),{chromium}=require('/private/tmp/obsong-qa-tools/node_modules/playwright');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3138';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('QA requires a loopback base URL.');
(async()=>{const b=await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT);const reports=[];try{for(const route of ['/','/studio']){
 const c=await b.newContext();
 await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await c.addInitScript(()=>{
  window.__qaPerf={lcp:null,cls:0,longTasks:[]};
  for(const type of ['largest-contentful-paint','layout-shift','longtask']){
   try{new PerformanceObserver(list=>{for(const e of list.getEntries()){
    if(type==='largest-contentful-paint')window.__qaPerf.lcp=e.startTime;
    if(type==='layout-shift'&&!e.hadRecentInput)window.__qaPerf.cls+=e.value;
    if(type==='longtask')window.__qaPerf.longTasks.push(e.duration);
   }}).observe({type,buffered:true});}catch{}
  }
 });
 const p=await c.newPage();await p.goto(base+route,{waitUntil:'networkidle',timeout:30000});await p.waitForTimeout(1000);
 reports.push({route,utc:new Date().toISOString(),...await p.evaluate(()=>({observer:window.__qaPerf,navigation:performance.getEntriesByType('navigation').map(n=>({ttfb:n.responseStart-n.requestStart,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd})),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize}))}))});
 await c.close();
}}finally{await b.close();}fs.writeFileSync('docs/qa/2026-10-02/artifacts/ux-performance.json',JSON.stringify({scope:'Warm local dev server, mock font, no CPU/network throttling, no Lighthouse score or INP',reports},null,2));console.log(JSON.stringify(reports.map(({resources,...r})=>({...r,resourceCount:resources.length,totalTransfer:resources.reduce((a,r)=>a+r.transferSize,0)})),null,2));})();
