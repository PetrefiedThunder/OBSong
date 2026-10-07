const path=require('node:path');
const {createRequire}=require('node:module');
const req=createRequire(path.join(process.env.QA_BROWSER_TOOLS||'/private/tmp/obsong-qa-tools','package.json'));
const {defineConfig}=req('@playwright/test');
if(!process.env.PW_TEST_CONNECT_WS_ENDPOINT)throw new Error('Connect to the orchestrator browser server; direct browser launch is forbidden.');
const baseURL=process.env.QA_BASE_URL||'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('QA requires a loopback base URL.');
module.exports=defineConfig({
 testDir:__dirname,testMatch:'ux-regression.spec.cjs',timeout:30000,workers:1,
 reporter:[['list'],['json',{outputFile:path.resolve(__dirname,'../artifacts/ux-regression-results.json')}]],
 outputDir:'/private/tmp/obsong-qa-browser-results',
 use:{baseURL,
 connectOptions:{wsEndpoint:process.env.PW_TEST_CONNECT_WS_ENDPOINT},serviceWorkers:'block'},
 projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
