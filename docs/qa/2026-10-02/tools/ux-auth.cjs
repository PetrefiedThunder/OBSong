/* Auth/API are entirely synthetic and intercepted; no backend service receives requests. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const req=createRequire(path.join(process.env.QA_BROWSER_TOOLS||'/private/tmp/obsong-qa-tools','package.json'));
const {chromium}=req('playwright'),axeSource=fs.readFileSync(req.resolve('axe-core/axe.min.js'),'utf8');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3000',out=path.resolve('docs/qa/2026-10-02/artifacts');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('QA requires a loopback base URL.');
const report={started:new Date().toISOString(),steps:[],requests:[],console:[],blockedExternal:[],axe:{}};
const user={id:'00000000-0000-4000-8000-000000000001',email:'qa@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-10-02T00:00:00Z',user_metadata:{}};
let composition={id:'00000000-0000-4000-8000-000000000002',userId:user.id,title:'QA synthetic composition',description:'Local browser fixture',key:'C',scale:'C_MAJOR',mappingMode:'LINEAR_LANDSCAPE',presetId:'sine-soft',tempo:90,createdAt:'2026-10-02T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z',noteEvents:[{note:'C4',start:0,duration:1,velocity:0.7}],metadata:{duration:2},noteCount:1};
let listState='empty',saveFails=false,authFails=true,releaseLoading,dialogMessages=[];
const save=()=>fs.writeFileSync(path.join(out,'ux-auth-report.json'),JSON.stringify(report,null,2));
async function step(name,fn){try{report.steps.push({name,utc:new Date().toISOString(),outcome:'pass',detail:await fn()});}catch(e){report.steps.push({name,utc:new Date().toISOString(),outcome:'fail',error:e.message.slice(0,1300)});}save();}
async function shot(page,name){await page.screenshot({path:path.join(out,'ux-'+name+'.png'),fullPage:true});return 'ux-'+name+'.png';}
async function scan(page,name){await page.evaluate(axeSource);const r=await page.evaluate(async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}));});report.axe[name]=r;return r;}
(async()=>{let browser;try{
 browser=await chromium.connect(process.env.PW_TEST_CONNECT_WS_ENDPOINT);
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin===new URL(base).origin)return route.continue();
  const method=route.request().method();
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(data)});
  if(u.origin==='http://127.0.0.1:3999'){
   report.requests.push({service:'auth-stub',method,path:u.pathname});
   if(method==='OPTIONS')return json({});
   if(u.pathname==='/auth/v1/token'){
    if(authFails)return json({error:'invalid_grant',error_description:'Invalid login credentials'},400);
    const payload={sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'};
    const accessToken=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url'),'local-fixture'].join('.');
    return json({access_token:accessToken,token_type:'bearer',expires_in:3600,refresh_token:'local-fixture',user});
   } return json(user);
  }
  if(u.origin==='http://127.0.0.1:3998'){
   report.requests.push({service:'api-stub',method,path:u.pathname,state:listState});
   if(method==='OPTIONS')return json({});
   if(method==='POST'){
    if(saveFails)return json({success:false,error:{message:'Synthetic save unavailable'}},503);
    composition={...composition,...JSON.parse(route.request().postData()||'{}')};listState='items';return json({success:true,data:composition},201);
   }
   if(method==='PUT'){composition={...composition,...JSON.parse(route.request().postData()||'{}')};return json({success:true,data:composition});}
   if(method==='DELETE'){listState='empty';return route.fulfill({status:204,headers:{'access-control-allow-origin':base},body:''});}
   if(u.pathname==='/compositions'){
    if(listState==='loading')await new Promise(r=>releaseLoading=r);
    if(listState==='error')return json({success:false,error:{message:'Synthetic library unavailable'}},503);
    return json({success:true,data:listState==='items'?[composition]:[]});
   }
   return json({success:true,data:composition});
  }
  report.blockedExternal.push({origin:u.origin,path:u.pathname});return route.abort('blockedbyclient');
 });
 const page=await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(30000);
 page.on('dialog',async d=>{dialogMessages.push(d.message());await d.dismiss();});
 page.on('console',m=>{if(m.type()==='error')report.console.push(m.text().replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[REDACTED]').slice(0,800));});
 await step('Invalid sign-in preserves input and displays error',async()=>{
  await page.goto(base+'/compositions',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('qa@example.test');
  await page.getByLabel('Password',{exact:true}).fill('local-fixture');
  await page.getByRole('dialog').getByRole('button',{name:'Sign In',exact:true}).click();
  await page.waitForTimeout(500);
  return {dialogs:[...dialogMessages],modalRemains:await page.getByRole('dialog').count()===1};
 });
 await step('Successful stub sign-in and private empty library',async()=>{
  authFails=false;
  await page.getByRole('dialog').getByRole('button',{name:'Sign In',exact:true}).click();
  await page.getByRole('heading',{name:'No compositions yet'}).waitFor();
  return {screenshot:await shot(page,'library-empty'),axe:await scan(page,'library-empty'),signOutControls:await page.getByRole('button',{name:/sign out|log out/i}).count()+await page.getByRole('link',{name:/sign out|log out/i}).count()};
 });
 await step('Library loading, failure and retry states',async()=>{
  listState='loading';await page.reload({waitUntil:'domcontentloaded'});
  await page.getByText('Loading compositions...', {exact:true}).waitFor();
  const loading=await shot(page,'library-loading');
  const status=await page.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map(x=>({role:x.getAttribute('role'),live:x.getAttribute('aria-live'),text:x.textContent})));
  listState='error';releaseLoading?.();
  await page.getByText('Failed to load compositions',{exact:true}).waitFor();
  const error=await shot(page,'library-error');
  listState='empty';await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByRole('heading',{name:'No compositions yet'}).waitFor();
  return {loading,error,liveRegions:status,retryRecovered:true};
 });
 await step('Studio demo loads notes and save failure can retry',async()=>{
  await page.goto(base+'/studio',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Ocean Horizon/}).click();
  await page.getByRole('button',{name:'Play Demo',exact:true}).click();
  await page.getByRole('button',{name:'Save to Library'}).waitFor();
  const playDemoStartsPlayback=await page.getByRole('button',{name:'⏹ Stop',exact:true}).isEnabled();
  await page.getByLabel('Title',{exact:true}).fill('QA synthetic composition');
  saveFails=true;await page.getByRole('button',{name:'Save to Library'}).click();await page.waitForTimeout(500);
  saveFails=false;await page.getByRole('button',{name:'Save to Library'}).click();await page.waitForTimeout(500);
  return {playDemoStartsPlayback,dialogs:[...dialogMessages],screenshot:await shot(page,'studio-saved')};
 });
 await step('Saved library, detail, edit and mobile reflow',async()=>{
  await page.goto(base+'/compositions',{waitUntil:'networkidle'});
  await page.getByRole('link',{name:/QA synthetic composition/}).click();
  await page.getByRole('heading',{name:'QA synthetic composition',exact:true}).waitFor();
  const detailAxe=await scan(page,'detail');
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('QA renamed composition');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('heading',{name:'QA renamed composition',exact:true}).waitFor();
  await page.setViewportSize({width:375,height:812});
  const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  return {detailAxe,mobile,screenshot:await shot(page,'detail-mobile-375')};
 });
 await context.close();
 }catch(e){report.fatal=e.message;process.exitCode=1;}finally{if(browser)await browser.close();report.ended=new Date().toISOString();save();console.log(JSON.stringify(report.steps,null,2));}})();
